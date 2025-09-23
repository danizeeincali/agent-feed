/**
 * Production Terminal Socket Hook - Real WebSocket Implementation
 * Direct WebSocket connection for terminal interaction
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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

const INITIAL_STATE: TerminalSocketState = {
  connected: false,
  connecting: false,
  error: null,
  instanceInfo: null,
  history: [],
  lastActivity: null
};

export const useTerminalSocket = () => {
  const [state, setState] = useState<TerminalSocketState>(INITIAL_STATE);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  /**
   * Real WebSocket connection for terminal
   */
  const connect = useCallback((instanceId: string) => {
    console.log('🚀 [Terminal WebSocket] Connecting to instance:', instanceId);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🚀 [Terminal WebSocket] Already connected');
      return;
    }
    
    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      const wsUrl = `ws://localhost:3000/terminal/${instanceId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ [Terminal WebSocket] Connected');
        reconnectAttempts.current = 0;
        setState({
          connected: true,
          connecting: false,
          error: null,
          instanceInfo: {
            id: instanceId,
            name: `Terminal Instance ${instanceId}`,
            type: 'websocket',
            sessionId: 'ws-session-' + Date.now(),
            clientCount: 1
          },
          history: [],
          lastActivity: new Date()
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'terminal_output') {
            setState(prev => ({
              ...prev,
              history: [...prev.history, data.output],
              lastActivity: new Date()
            }));
          } else if (data.type === 'instance_info') {
            setState(prev => ({
              ...prev,
              instanceInfo: { ...prev.instanceInfo, ...data.info }
            }));
          }
        } catch (error) {
          console.error('Terminal WebSocket message parsing error:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 [Terminal WebSocket] Connection closed:', event.code);
        setState(prev => ({ ...prev, connected: false, connecting: false }));
        
        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting terminal in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect(instanceId);
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ [Terminal WebSocket] Connection error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'WebSocket connection failed'
        }));
      };
      
    } catch (error) {
      console.error('Failed to create terminal WebSocket:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, []);

  /**
   * Real disconnect
   */
  const disconnect = useCallback(() => {
    console.log('🚀 [Terminal WebSocket] Disconnecting');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    setState(INITIAL_STATE);
  }, []);

  /**
   * Real send input
   */
  const sendInput = useCallback((data: string) => {
    console.log('📡 [Terminal WebSocket] Sending input:', data.length, 'chars');
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'terminal_input',
        data: data
      }));
    } else {
      console.warn('Terminal WebSocket not connected');
    }
  }, []);

  /**
   * Real send resize
   */
  const sendResize = useCallback((cols: number, rows: number) => {
    console.log('📡 [Terminal WebSocket] Resize:', cols, 'x', rows);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'terminal_resize',
        cols,
        rows
      }));
    }
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
    connectionQuality: state.connected ? 'excellent' : 'poor',
    
    // Stats
    stats: {
      reconnectAttempts: reconnectAttempts.current,
      historySize: state.history.length,
      clientCount: state.instanceInfo?.clientCount || 0,
      readyState: wsRef.current?.readyState ?? WebSocket.CLOSED
    }
  };
};