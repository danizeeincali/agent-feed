/**
 * SPARC IMPLEMENTATION: Robust WebSocket Hook
 * ARCHITECTURE: React hook for the robust connection manager
 * REFINEMENT: Enhanced debugging and monitoring capabilities
 * COMPLETION: Production-ready WebSocket integration
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  RobustWebSocketConnectionManager, 
  getGlobalRobustConnectionManager 
} from '../services/connection/robust-connection-manager';
import { ConnectionState } from '../services/connection/types';

interface UseRobustWebSocketOptions {
  url?: string;
  fallbackUrls?: string[];
  autoConnect?: boolean;
  debugMode?: boolean;
  useGlobalInstance?: boolean;
  onConnect?: () => void;
  onDisconnect?: (data: { reason: string; manual: boolean }) => void;
  onError?: (error: any) => void;
  onStateChange?: (data: { from: ConnectionState; to: ConnectionState }) => void;
}

interface UseRobustWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionQuality: string;
  currentUrl: string | null;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Socket operations
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
  
  // Testing and diagnostics
  testConnection: () => Promise<{ success: boolean; latency: number; error?: string }>;
  getDetailedStatus: () => any;
  getMetrics: () => any;
  getHealth: () => any;
  
  // Socket instance
  socket: any;
  
  // Manager instance
  manager: RobustWebSocketConnectionManager;
}

export function useRobustWebSocket(
  options: UseRobustWebSocketOptions = {}
): UseRobustWebSocketReturn {
  const {
    url = import.meta.env.VITE_WEBSOCKET_HUB_URL || 'http://localhost:3001',
    fallbackUrls = [
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005'
    ],
    autoConnect = true,
    debugMode = import.meta.env.VITE_DEBUG_WEBSOCKET === 'true',
    useGlobalInstance = true,
    onConnect,
    onDisconnect,
    onError,
    onStateChange
  } = options;

  // Create or get manager instance
  const managerRef = useRef<RobustWebSocketConnectionManager | null>(null);
  if (!managerRef.current) {
    const managerOptions = {
      url,
      fallbackUrls,
      autoConnect,
      debugMode,
      reconnection: true,
      maxConnectionAttempts: 20,
      healthCheckInterval: 15000,
      qualityThreshold: 500
    };

    managerRef.current = useGlobalInstance 
      ? getGlobalRobustConnectionManager(managerOptions)
      : new RobustWebSocketConnectionManager(managerOptions);
  }
  const manager = managerRef.current;

  // State management
  const [isConnected, setIsConnected] = useState(manager.isConnected());
  const [connectionState, setConnectionState] = useState(manager.getState());
  const [connectionQuality, setConnectionQuality] = useState(manager.getConnectionQuality());
  const [currentUrl, setCurrentUrl] = useState(manager.getCurrentUrl());

  // Connection control methods
  const connect = useCallback(async () => {
    try {
      await manager.connect();
    } catch (error) {
      console.error('useRobustWebSocket: Connect failed', error);
      throw error;
    }
  }, [manager]);

  const disconnect = useCallback(async () => {
    try {
      await manager.disconnect(true);
    } catch (error) {
      console.error('useRobustWebSocket: Disconnect failed', error);
      throw error;
    }
  }, [manager]);

  const reconnect = useCallback(async () => {
    try {
      await manager.reconnect();
    } catch (error) {
      console.error('useRobustWebSocket: Reconnect failed', error);
      throw error;
    }
  }, [manager]);

  // Socket operations
  const emit = useCallback((event: string, data: any) => {
    const socket = manager.getSocket();
    if (socket) {
      socket.emit(event, data);
    } else {
      console.warn('useRobustWebSocket: Cannot emit, no socket connection');
    }
  }, [manager]);

  const on = useCallback((event: string, handler: Function) => {
    const socket = manager.getSocket();
    if (socket) {
      socket.on(event, handler);
    }
  }, [manager]);

  const off = useCallback((event: string, handler: Function) => {
    const socket = manager.getSocket();
    if (socket) {
      socket.off(event, handler);
    }
  }, [manager]);

  // Testing and diagnostics
  const testConnection = useCallback(async () => {
    try {
      return await manager.testConnection();
    } catch (error) {
      return { 
        success: false, 
        latency: -1, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [manager]);

  const getDetailedStatus = useCallback(() => {
    return manager.getDetailedStatus();
  }, [manager]);

  const getMetrics = useCallback(() => {
    return manager.getMetrics();
  }, [manager]);

  const getHealth = useCallback(() => {
    return manager.getHealth();
  }, [manager]);

  // Set up event listeners
  useEffect(() => {
    const handleStateChange = (data: { from: ConnectionState; to: ConnectionState }) => {
      setConnectionState(data.to);
      setIsConnected(manager.isConnected());
      setCurrentUrl(manager.getCurrentUrl());
      onStateChange?.(data);
    };

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionQuality(manager.getConnectionQuality());
      setCurrentUrl(manager.getCurrentUrl());
      onConnect?.();
    };

    const handleDisconnect = (data: { reason: string; manual: boolean }) => {
      setIsConnected(false);
      setConnectionQuality(manager.getConnectionQuality());
      onDisconnect?.(data);
    };

    const handleError = (data: any) => {
      onError?.(data);
    };

    const handleHubRegistered = (data: any) => {
      if (debugMode) {
        console.log('<� useRobustWebSocket: Hub registration confirmed', data);
      }
    };

    const handleHubHealth = (data: any) => {
      if (debugMode) {
        console.log('=� useRobustWebSocket: Hub health update', data);
      }
    };

    // Register event listeners
    manager.on('state_change', handleStateChange);
    manager.on('connected', handleConnect);
    manager.on('disconnected', handleDisconnect);
    manager.on('error', handleError);
    manager.on('hub_registered', handleHubRegistered);
    manager.on('hub_health', handleHubHealth);

    // Update initial state
    setIsConnected(manager.isConnected());
    setConnectionState(manager.getState());
    setConnectionQuality(manager.getConnectionQuality());
    setCurrentUrl(manager.getCurrentUrl());

    return () => {
      // Clean up event listeners
      manager.off('state_change', handleStateChange);
      manager.off('connected', handleConnect);
      manager.off('disconnected', handleDisconnect);
      manager.off('error', handleError);
      manager.off('hub_registered', handleHubRegistered);
      manager.off('hub_health', handleHubHealth);
      
      // Destroy manager if not using global instance
      if (!useGlobalInstance && managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [manager, useGlobalInstance, debugMode, onConnect, onDisconnect, onError, onStateChange]);

  // Periodic updates for connection quality
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionQuality(manager.getConnectionQuality());
    }, 2000);

    return () => clearInterval(interval);
  }, [manager]);

  return {
    // Connection state
    isConnected,
    connectionState,
    connectionQuality,
    currentUrl,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    
    // Socket operations
    emit,
    on,
    off,
    
    // Testing and diagnostics
    testConnection,
    getDetailedStatus,
    getMetrics,
    getHealth,
    
    // Socket instance
    socket: manager.getSocket(),
    
    // Manager instance
    manager
  };
}

// Legacy compatibility export
export default useRobustWebSocket;