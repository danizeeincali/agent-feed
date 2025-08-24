/**
 * Enhanced WebSocket Singleton Hook
 * Updated to use the new connection management system while maintaining backward compatibility
 */

import React, { useCallback, useEffect } from 'react';
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
    // CRITICAL FIX: Use relative URL for Vite proxy compatibility
    url = import.meta.env.VITE_WEBSOCKET_URL || '/',
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

  // REFINEMENT: Enhanced state synchronization logging
  useEffect(() => {
    console.log('🔧 useWebSocketSingleton: Connection manager state synchronized', {
      url,
      isConnected,
      state,
      socketId: socket?.id,
      socketConnected: socket?.connected,
      socketReadyState: socket?.readyState,
      managerState: manager?.getState(),
      managerIsConnected: manager?.isConnected(),
      stateAlignment: isConnected === manager?.isConnected() ? 'ALIGNED' : 'MISALIGNED'
    });
  }, [url, isConnected, state, socket?.id, socket?.connected, socket?.readyState, manager]);

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