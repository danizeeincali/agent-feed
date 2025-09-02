import { useState, useEffect, useCallback, useRef } from 'react';
import { SingleConnectionManager, ConnectionState } from '../services/SingleConnectionManager';

export interface UseSingleConnectionManagerReturn {
  connectionState: ConnectionState;
  currentInstanceId: string | null;
  isConnected: boolean;
  connectToInstance: (instanceId: string, url?: string) => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  sendMessage: (data: any) => boolean;
  connectionStatistics: ReturnType<SingleConnectionManager['getConnectionStats']>;
  error: Error | null;
  addMessageHandler: (type: string, handler: (data: any) => void) => void;
  removeMessageHandler: (type: string, handler: (data: any) => void) => void;
}

/**
 * React hook for managing the overall single connection state
 */
export function useSingleConnectionManager(): UseSingleConnectionManagerReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const managerRef = useRef<SingleConnectionManager>();
  const messageHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Initialize manager
  useEffect(() => {
    managerRef.current = SingleConnectionManager.getInstance();
    
    // Set initial state
    const stats = managerRef.current.getConnectionStats();
    setConnectionState(stats.state);
    setCurrentInstanceId(stats.instanceId);

    // Listen for global state changes
    const handleStateChange = (state: ConnectionState, instanceId: string) => {
      setConnectionState(state);
      
      if (state === ConnectionState.DISCONNECTED) {
        setCurrentInstanceId(null);
        setError(null);
      } else {
        setCurrentInstanceId(instanceId);
      }
      
      // Clear error when connecting
      if (state === ConnectionState.CONNECTING) {
        setError(null);
      }
    };

    managerRef.current.addStateChangeListener(handleStateChange);

    return () => {
      if (managerRef.current) {
        managerRef.current.removeStateChangeListener(handleStateChange);
      }
    };
  }, []);

  const connectToInstance = useCallback(async (instanceId: string, url?: string): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) {
      throw new Error('Connection manager not initialized');
    }

    const wsUrl = url || `ws://localhost:3000/terminal/${instanceId}`;
    
    try {
      await manager.connect({
        instanceId,
        url: wsUrl,
        onMessage: (data: any) => {
          // Dispatch to message handlers
          const handlers = messageHandlersRef.current.get('terminal:output');
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler({ ...data, terminalId: instanceId });
              } catch (error) {
                console.error('Message handler error:', error);
              }
            });
          }
        },
        onError: (error: Error) => {
          setError(error);
        }
      });
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  const disconnectFromInstance = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager || !currentInstanceId) {
      return;
    }

    try {
      await manager.disconnect(currentInstanceId);
      setError(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [currentInstanceId]);

  const sendMessage = useCallback((data: any): boolean => {
    const manager = managerRef.current;
    if (!manager || !currentInstanceId) {
      return false;
    }

    return manager.sendData(data, currentInstanceId);
  }, [currentInstanceId]);

  const addMessageHandler = useCallback((type: string, handler: (data: any) => void): void => {
    const handlers = messageHandlersRef.current;
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);
  }, []);

  const removeMessageHandler = useCallback((type: string, handler: (data: any) => void): void => {
    const handlers = messageHandlersRef.current;
    if (handlers.has(type)) {
      handlers.get(type)!.delete(handler);
    }
  }, []);

  // Get current connection stats
  const connectionStatistics = managerRef.current?.getConnectionStats() || {
    isConnected: false,
    instanceId: null,
    connectionTime: null,
    lastActivity: null,
    state: ConnectionState.DISCONNECTED
  };

  return {
    connectionState,
    currentInstanceId,
    isConnected: connectionState === ConnectionState.CONNECTED,
    connectToInstance,
    disconnectFromInstance,
    sendMessage,
    connectionStatistics,
    error,
    addMessageHandler,
    removeMessageHandler
  };
}