/**
 * HTTP/SSE-only WebSocket Singleton Hook (WebSocket Removed)
 * Mock implementation for backward compatibility
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

export interface UseWebSocketSingletonOptions {
  url?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketSingletonReturn {
  socket: any; // Mock socket for compatibility
  isConnected: boolean;
  connectionState: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
}

/**
 * HTTP/SSE-only WebSocket singleton hook (Socket.IO completely removed)
 * Provides mock interface for backward compatibility
 */
export function useWebSocketSingleton(
  options: UseWebSocketSingletonOptions = {}
): UseWebSocketSingletonReturn {
  const { url = '/', autoConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  // Mock socket object for compatibility
  const socket = useMemo(() => ({
    id: 'http-sse-singleton-' + Date.now(),
    connected: isConnected,
    emit: (event: string, data?: any) => {
      console.log('📡 [HTTP/SSE Singleton] Mock emit:', event, data);
    },
    on: (event: string, handler: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Singleton] Mock event handler registered:', event);
    },
    off: (event: string, handler?: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Singleton] Mock event handler removed:', event);
    }
  }), [isConnected]);

  const connect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Singleton] Mock connect - no WebSocket needed');
    setIsConnected(true);
    setConnectionState('connected');
  }, []);

  const disconnect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Singleton] Mock disconnect');
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const emit = useCallback((event: string, data: any) => {
    console.log('📡 [HTTP/SSE Singleton] Mock emit:', event, data);
  }, []);

  const on = useCallback((event: string, handler: Function) => {
    console.log('📡 [HTTP/SSE Singleton] Mock event handler registered:', event);
  }, []);

  const off = useCallback((event: string, handler: Function) => {
    console.log('📡 [HTTP/SSE Singleton] Mock event handler removed:', event);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
  }, [autoConnect, connect]);

  return {
    socket,
    isConnected,
    connectionState,
    connect,
    disconnect,
    emit,
    on,
    off
  };
}