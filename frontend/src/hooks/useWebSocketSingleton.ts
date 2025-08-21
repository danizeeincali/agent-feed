/**
 * Enhanced WebSocket Singleton Hook
 * Updated to use the new connection management system while maintaining backward compatibility
 */

import { useCallback } from 'react';
import { useConnectionManager, UseConnectionManagerOptions } from './useConnectionManager';
import { Socket } from 'socket.io-client';

export interface UseWebSocketSingletonOptions extends UseConnectionManagerOptions {
  // Legacy options for backward compatibility
  url?: string;
}

export interface UseWebSocketSingletonReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
}

/**
 * Enhanced WebSocket singleton hook that uses the new connection management system
 * while maintaining backward compatibility with existing code
 */
export function useWebSocketSingleton(
  options: UseWebSocketSingletonOptions = {}
): UseWebSocketSingletonReturn {
  const {
    url = '/',
    ...connectionOptions
  } = options;

  // Use the enhanced connection manager
  const {
    socket,
    isConnected,
    state,
    connect: managerConnect,
    disconnect: managerDisconnect,
    manager
  } = useConnectionManager({
    url,
    useGlobalInstance: true,
    autoConnect: true,
    ...connectionOptions
  });

  // Backward compatible connect method
  const connect = useCallback(async () => {
    await managerConnect();
  }, [managerConnect]);

  // Backward compatible disconnect method
  const disconnect = useCallback(async () => {
    await managerDisconnect(true);
  }, [managerDisconnect]);

  // Socket event methods
  const emit = useCallback((event: string, data: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, [socket]);

  const on = useCallback((event: string, handler: Function) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const off = useCallback((event: string, handler: Function) => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    connectionState: state,
    connect,
    disconnect,
    emit,
    on,
    off
  };
}

// Legacy export for backward compatibility
export default useWebSocketSingleton;