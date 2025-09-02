import { useState, useEffect, useCallback, useRef } from 'react';
import { SingleConnectionManager, ConnectionState, ConnectionConfig } from '../services/SingleConnectionManager';

export interface UseSingleConnectionOptions {
  instanceId: string;
  url?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface UseSingleConnectionReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  hasError: boolean;
  error: Error | null;
  isCurrentConnection: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendData: (data: any) => boolean;
  lastActivity: number | null;
  connectionTime: number | null;
  connectionStats: ReturnType<SingleConnectionManager['getConnectionStats']>;
}

/**
 * React hook for managing single WebSocket connections with safety-first architecture
 */
export function useSingleConnection({
  instanceId,
  url,
  autoConnect = false,
  onMessage,
  onError
}: UseSingleConnectionOptions): UseSingleConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [connectionTime, setConnectionTime] = useState<number | null>(null);
  
  const managerRef = useRef<SingleConnectionManager>();
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize manager and set up state listener
  useEffect(() => {
    managerRef.current = SingleConnectionManager.getInstance();
    
    // Set initial state
    const initialState = managerRef.current.getConnectionState(instanceId);
    setConnectionState(initialState);

    // Listen for global state changes
    const handleStateChange = (state: ConnectionState, changedInstanceId: string) => {
      if (changedInstanceId === instanceId) {
        setConnectionState(state);
        
        // Clear error when connecting
        if (state === ConnectionState.CONNECTING) {
          setError(null);
        }
        
        // Update activity times
        const stats = managerRef.current!.getConnectionStats();
        if (stats.instanceId === instanceId) {
          setConnectionTime(stats.connectionTime);
          setLastActivity(stats.lastActivity);
        } else {
          setConnectionTime(null);
          setLastActivity(null);
        }
      } else if (state === ConnectionState.CONNECTING || state === ConnectionState.CONNECTED) {
        // Another instance is connecting/connected, so this instance should be disconnected
        if (connectionState !== ConnectionState.DISCONNECTED) {
          setConnectionState(ConnectionState.DISCONNECTED);
          setError(null);
          setConnectionTime(null);
          setLastActivity(null);
        }
      }
    };

    managerRef.current.addStateChangeListener(handleStateChange);

    return () => {
      if (managerRef.current) {
        managerRef.current.removeStateChangeListener(handleStateChange);
      }
    };
  }, [instanceId, connectionState]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && url && connectionState === ConnectionState.DISCONNECTED) {
      connect(url).catch(console.error);
    }
  }, [autoConnect, url, connectionState]);

  const connect = useCallback(async (connectUrl?: string): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) {
      throw new Error('Connection manager not initialized');
    }

    const targetUrl = connectUrl || url;
    if (!targetUrl) {
      throw new Error('No URL provided for connection');
    }

    const config: ConnectionConfig = {
      url: targetUrl,
      instanceId,
      onMessage: (data: any) => {
        onMessageRef.current?.(data);
      },
      onError: (error: Error, errorInstanceId: string) => {
        if (errorInstanceId === instanceId) {
          setError(error);
          onErrorRef.current?.(error);
        }
      }
    };

    try {
      await manager.connect(config);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [instanceId, url]);

  const disconnect = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    try {
      await manager.disconnect(instanceId);
      setError(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [instanceId]);

  const sendData = useCallback((data: any): boolean => {
    const manager = managerRef.current;
    if (!manager) {
      return false;
    }

    const success = manager.sendData(data, instanceId);
    if (success) {
      const stats = manager.getConnectionStats();
      if (stats.instanceId === instanceId) {
        setLastActivity(stats.lastActivity);
      }
    }
    
    return success;
  }, [instanceId]);

  // Get current connection stats
  const connectionStats = managerRef.current?.getConnectionStats() || {
    isConnected: false,
    instanceId: null,
    connectionTime: null,
    lastActivity: null,
    state: ConnectionState.DISCONNECTED
  };

  const isCurrentConnection = connectionStats.instanceId === instanceId;
  
  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED && isCurrentConnection,
    isConnecting: connectionState === ConnectionState.CONNECTING && isCurrentConnection,
    isDisconnecting: connectionState === ConnectionState.DISCONNECTING && isCurrentConnection,
    hasError: connectionState === ConnectionState.ERROR && isCurrentConnection,
    error: isCurrentConnection ? error : null,
    isCurrentConnection,
    connect,
    disconnect,
    sendData,
    lastActivity: isCurrentConnection ? lastActivity : null,
    connectionTime: isCurrentConnection ? connectionTime : null,
    connectionStats
  };
}