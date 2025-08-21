/**
 * React Hook for Connection Management
 * Provides React integration for the WebSocket connection manager
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ConnectionState, 
  ConnectionOptions, 
  ConnectionMetrics, 
  HealthStatus,
  StateChangeEvent,
  ErrorEvent,
  MetricsUpdateEvent,
  HealthUpdateEvent,
  ReconnectionAttemptEvent
} from '../services/connection/types';
import { WebSocketConnectionManager, getGlobalConnectionManager } from '../services/connection/connection-manager';

export interface UseConnectionManagerOptions extends ConnectionOptions {
  useGlobalInstance?: boolean;
  onStateChange?: (event: StateChangeEvent['data']) => void;
  onError?: (event: ErrorEvent['data']) => void;
  onConnect?: () => void;
  onDisconnect?: (data: { reason: string; manual: boolean }) => void;
  onReconnectionAttempt?: (event: ReconnectionAttemptEvent['data']) => void;
}

export interface UseConnectionManagerReturn {
  // Connection state
  state: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  
  // Connection control
  connect: (options?: Partial<ConnectionOptions>) => Promise<void>;
  disconnect: (manual?: boolean) => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Status information
  metrics: ConnectionMetrics;
  health: HealthStatus;
  lastError: Error | null;
  currentAttempt: number;
  maxAttempts: number;
  
  // Socket access
  socket: any;
  
  // Connection manager instance
  manager: WebSocketConnectionManager;
}

export function useConnectionManager(
  options: UseConnectionManagerOptions = {}
): UseConnectionManagerReturn {
  const { 
    useGlobalInstance = true,
    onStateChange,
    onError,
    onConnect,
    onDisconnect,
    onReconnectionAttempt,
    ...connectionOptions
  } = options;

  // Create or get connection manager instance
  const managerRef = useRef<WebSocketConnectionManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = useGlobalInstance 
      ? getGlobalConnectionManager(connectionOptions)
      : new WebSocketConnectionManager(connectionOptions);
  }
  const manager = managerRef.current;

  // State management
  const [state, setState] = useState<ConnectionState>(manager.getState());
  const [metrics, setMetrics] = useState<ConnectionMetrics>(manager.getMetrics());
  const [health, setHealth] = useState<HealthStatus>(manager.getHealth());
  const [lastError, setLastError] = useState<Error | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(10);

  // Connection control methods
  const connect = useCallback(async (connectOptions?: Partial<ConnectionOptions>) => {
    try {
      await manager.connect(connectOptions);
    } catch (error) {
      // Error is handled by the error event listener
      throw error;
    }
  }, [manager]);

  const disconnect = useCallback(async (manual = false) => {
    try {
      await manager.disconnect(manual);
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  }, [manager]);

  const reconnect = useCallback(async () => {
    try {
      await manager.reconnect();
    } catch (error) {
      // Error is handled by the error event listener
      throw error;
    }
  }, [manager]);

  // Set up event listeners
  useEffect(() => {
    const handleStateChange = (data: StateChangeEvent['data']) => {
      setState(data.to);
      onStateChange?.(data);
    };

    const handleError = (data: ErrorEvent['data']) => {
      setLastError(data.error);
      onError?.(data);
    };

    const handleMetricsUpdate = (newMetrics: ConnectionMetrics) => {
      setMetrics(newMetrics);
    };

    const handleHealthUpdate = (newHealth: HealthStatus) => {
      setHealth(newHealth);
    };

    const handleConnected = () => {
      setLastError(null);
      setCurrentAttempt(0);
      onConnect?.();
    };

    const handleDisconnected = (data: { reason: string; manual: boolean }) => {
      onDisconnect?.(data);
    };

    const handleReconnectionAttempt = (data: ReconnectionAttemptEvent['data']) => {
      setCurrentAttempt(data.attempt);
      setMaxAttempts(data.maxAttempts);
      onReconnectionAttempt?.(data);
    };

    // Register event listeners
    manager.on('state_change', handleStateChange);
    manager.on('error', handleError);
    manager.on('metrics_update', handleMetricsUpdate);
    manager.on('health_update', handleHealthUpdate);
    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('reconnection_attempt', handleReconnectionAttempt);

    // Update initial state
    setState(manager.getState());
    setMetrics(manager.getMetrics());
    setHealth(manager.getHealth());

    return () => {
      // Clean up event listeners
      manager.off('state_change', handleStateChange);
      manager.off('error', handleError);
      manager.off('metrics_update', handleMetricsUpdate);
      manager.off('health_update', handleHealthUpdate);
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('reconnection_attempt', handleReconnectionAttempt);
      
      // Destroy manager if not using global instance
      if (!useGlobalInstance && managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [manager, useGlobalInstance, onStateChange, onError, onConnect, onDisconnect, onReconnectionAttempt]);

  // Periodic metrics update
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(manager.getMetrics());
      setHealth(manager.getHealth());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [manager]);

  // Derived state
  const isConnected = state === ConnectionState.CONNECTED;
  const isConnecting = state === ConnectionState.CONNECTING;
  const isReconnecting = state === ConnectionState.RECONNECTING;
  const hasError = state === ConnectionState.ERROR;

  return {
    // Connection state
    state,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    
    // Status information
    metrics,
    health,
    lastError,
    currentAttempt,
    maxAttempts,
    
    // Socket access
    socket: manager.getSocket(),
    
    // Connection manager instance
    manager
  };
}

// Enhanced hook that integrates with existing WebSocket patterns
export function useWebSocketConnection(options: UseConnectionManagerOptions = {}) {
  const connectionManager = useConnectionManager(options);
  
  // Legacy compatibility - provide the same interface as existing hooks
  return {
    ...connectionManager,
    // Legacy properties for backward compatibility
    isConnected: connectionManager.isConnected,
    socket: connectionManager.socket
  };
}

// Hook specifically for dual instance monitoring integration
export function useEnhancedDualInstanceConnection() {
  const connection = useConnectionManager({
    url: '/ws',
    namespace: '/',
    autoConnect: true,
    useGlobalInstance: true
  });

  return {
    ...connection,
    // Additional methods specific to dual instance monitoring
    getConnectionQuality: () => {
      const { health, metrics } = connection;
      
      if (!connection.isConnected) return 'disconnected';
      if (health.latency === null) return 'unknown';
      if (health.latency < 100) return 'excellent';
      if (health.latency < 300) return 'good';
      if (health.latency < 1000) return 'fair';
      return 'poor';
    },
    
    getConnectionStability: () => {
      const { metrics } = connection;
      if (metrics.connectionAttempts === 0) return 1;
      return metrics.successfulConnections / metrics.connectionAttempts;
    }
  };
}