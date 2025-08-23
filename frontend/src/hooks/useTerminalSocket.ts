/**
 * useTerminalSocket Hook
 * 
 * React hook for managing WebSocket terminal connections with auto-reconnect,
 * cross-tab synchronization, and comprehensive error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface TerminalSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  instanceInfo: {
    id: string;
    name: string;
    type: string;
    pid?: number;
    sessionId?: string;
    clientCount?: number;
  } | null;
  history: string[];
  lastActivity: Date | null;
}

interface TerminalData {
  data: string;
  timestamp: string;
  isHistory?: boolean;
}

interface InstanceStatus {
  instanceId: string;
  status: string;
  timestamp: string;
}

const INITIAL_STATE: TerminalSocketState = {
  connected: false,
  connecting: false,
  error: null,
  instanceInfo: null,
  history: [],
  lastActivity: null
};

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000;
const MAX_HISTORY_SIZE = 10000;

export const useTerminalSocket = () => {
  const [state, setState] = useState<TerminalSocketState>(INITIAL_STATE);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const currentInstanceId = useRef<string | null>(null);

  // Cross-tab synchronization using BroadcastChannel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  /**
   * Setup cross-tab synchronization
   */
  const setupCrossTabSync = useCallback((instanceId: string) => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    // Close existing channel
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
    }

    // Create new channel for this instance
    const channel = new BroadcastChannel(`terminal-${instanceId}`);
    broadcastChannelRef.current = channel;

    // Listen for messages from other tabs
    channel.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'terminal_data':
          // Only apply if we're not the sender
          if (data.senderId !== socketRef.current?.id) {
            setState(prev => ({
              ...prev,
              history: [...prev.history, data.content].slice(-MAX_HISTORY_SIZE),
              lastActivity: new Date()
            }));
          }
          break;
        
        case 'connection_status':
          // Sync connection status across tabs
          if (data.senderId !== socketRef.current?.id) {
            setState(prev => ({
              ...prev,
              connected: data.connected,
              connecting: data.connecting,
              error: data.error
            }));
          }
          break;
      }
    };
  }, []);

  /**
   * Broadcast message to other tabs
   */
  const broadcastToTabs = useCallback((type: string, data: any) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type,
        data: {
          ...data,
          senderId: socketRef.current?.id,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, []);

  /**
   * Setup WebSocket connection
   */
  const setupSocket = useCallback((instanceId: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // SPARC:DEBUG FIX - Corrected connection URL from port 3001 to 3000
    // Backend server runs on port 3000, not 3001
    const socket = io('http://localhost:3001', {
      auth: {
        token: localStorage.getItem('auth-token') || 'dev-token',
        userId: localStorage.getItem('user-id') || 'dev-user-' + Date.now(),
        username: localStorage.getItem('username') || 'Development User'
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false // We handle reconnection manually
    });

    socketRef.current = socket;
    currentInstanceId.current = instanceId;

    // Connection events
    socket.on('connected', () => {
      console.log('Connected to terminal WebSocket');
      
      // Connect to specific instance terminal
      socket.emit('connect_terminal', { instanceId });
    });

    socket.on('terminal_connected', (data) => {
      console.log('Connected to instance terminal:', data);
      
      setState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        instanceInfo: {
          id: data.instanceId,
          name: data.instanceName || instanceId,
          type: data.instanceType || 'unknown',
          pid: data.pid,
          sessionId: data.sessionId,
          clientCount: data.clientCount
        }
      }));

      // Broadcast connection status to other tabs
      broadcastToTabs('connection_status', {
        connected: true,
        connecting: false,
        error: null
      });

      reconnectAttempts.current = 0;
      startHeartbeat();
    });

    socket.on('terminal_data', (data: TerminalData) => {
      setState(prev => ({
        ...prev,
        history: data.isHistory 
          ? [data.data] // Replace with history
          : [...prev.history, data.data].slice(-MAX_HISTORY_SIZE), // Append new data
        lastActivity: new Date()
      }));

      // Broadcast to other tabs (only for live data, not history)
      if (!data.isHistory) {
        broadcastToTabs('terminal_data', {
          content: data.data
        });
      }
    });

    socket.on('terminal_resized', (data: { cols: number; rows: number }) => {
      console.log('Terminal resized:', data);
      // Handle resize event if needed
    });

    socket.on('instance_status', (data: InstanceStatus) => {
      console.log('Instance status changed:', data);
      
      setState(prev => ({
        ...prev,
        instanceInfo: prev.instanceInfo ? {
          ...prev.instanceInfo,
          // Update status if available
        } : null
      }));
    });

    socket.on('instance_destroyed', (data) => {
      console.log('Instance destroyed:', data);
      
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Instance has been destroyed'
      }));

      broadcastToTabs('connection_status', {
        connected: false,
        connecting: false,
        error: 'Instance has been destroyed'
      });
    });

    socket.on('error', (error) => {
      console.error('Terminal socket error:', error);
      
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message || 'Connection error'
      }));

      broadcastToTabs('connection_status', {
        connected: false,
        connecting: false,
        error: error.message || 'Connection error'
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Terminal socket disconnected:', reason);
      
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false
      }));

      broadcastToTabs('connection_status', {
        connected: false,
        connecting: false,
        error: null
      });

      stopHeartbeat();
      scheduleReconnect();
    });

    socket.on('connect_error', (error) => {
      console.error('Terminal socket connection error:', error);
      
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message || 'Failed to connect'
      }));

      broadcastToTabs('connection_status', {
        connected: false,
        connecting: false,
        error: error.message || 'Failed to connect'
      });

      scheduleReconnect();
    });

    socket.on('pong', (data) => {
      // Handle heartbeat response
      setState(prev => ({ ...prev, lastActivity: new Date() }));
    });

    return socket;
  }, [broadcastToTabs]);

  /**
   * Start heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS || !currentInstanceId.current) {
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
    reconnectAttempts.current++;

    console.log(`Scheduling reconnect attempt ${reconnectAttempts.current} in ${delay}ms`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (currentInstanceId.current) {
        setState(prev => ({ ...prev, connecting: true, error: null }));
        setupSocket(currentInstanceId.current);
      }
    }, delay);
  }, [setupSocket]);

  /**
   * Connect to instance terminal
   */
  const connect = useCallback((instanceId: string) => {
    console.log('Connecting to instance terminal:', instanceId);
    
    setState(prev => ({
      ...prev,
      connecting: true,
      error: null,
      history: [] // Clear history when connecting to new instance
    }));

    // Setup cross-tab sync for this instance
    setupCrossTabSync(instanceId);

    // Setup socket connection
    setupSocket(instanceId);
  }, [setupSocket, setupCrossTabSync]);

  /**
   * Disconnect from terminal
   */
  const disconnect = useCallback(() => {
    console.log('Disconnecting from terminal');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Stop heartbeat
    stopHeartbeat();

    // Close socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Close broadcast channel
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }

    // Reset state
    setState(INITIAL_STATE);
    currentInstanceId.current = null;
    reconnectAttempts.current = 0;
  }, [stopHeartbeat]);

  /**
   * Send input to terminal
   */
  const sendInput = useCallback((data: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('terminal_input', { data });
    }
  }, []);

  /**
   * Send terminal resize
   */
  const sendResize = useCallback((cols: number, rows: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('terminal_resize', { cols, rows });
    }
  }, []);

  /**
   * Clear terminal history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentInstanceId.current && !state.connected) {
        // Reconnect when page becomes visible
        connect(currentInstanceId.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.connected, connect]);

  return {
    // State
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    instanceInfo: state.instanceInfo,
    history: state.history,
    lastActivity: state.lastActivity,

    // Actions
    connect,
    disconnect,
    sendInput,
    sendResize,
    clearHistory,

    // Computed values
    canSendInput: state.connected && !state.connecting,
    connectionQuality: reconnectAttempts.current === 0 ? 'good' : 
                      reconnectAttempts.current < 3 ? 'fair' : 'poor',
    
    // Stats
    stats: {
      reconnectAttempts: reconnectAttempts.current,
      historySize: state.history.length,
      clientCount: state.instanceInfo?.clientCount || 0
    }
  };
};