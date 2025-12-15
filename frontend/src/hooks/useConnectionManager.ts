/**
 * HTTP/SSE-only Connection Manager Hook (WebSocket Removed)
 * Mock implementation for backward compatibility
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Mock types for compatibility
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  error?: string;
  lastConnectedAt?: Date;
  reconnectAttempts?: number;
}

export interface ConnectionOptions {
  url?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  totalDisconnections: number;
  totalReconnectionAttempts: number;
  averageConnectionDuration: number;
  connectionUptime: number;
}

export interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  latency?: number;
}

export interface UseConnectionManagerOptions extends ConnectionOptions {
  useGlobalInstance?: boolean;
  onStateChange?: (data: any) => void;
  onError?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (data: { reason: string; manual: boolean }) => void;
  onReconnectionAttempt?: (data: any) => void;
}

export interface UseConnectionManagerReturn {
  socket: any; // Mock socket
  isConnected: boolean;
  state: ConnectionState;
  metrics: ConnectionMetrics;
  health: HealthStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  manager: any; // Mock manager
}

/**
 * HTTP/SSE-only Connection Manager Hook (Socket.IO completely removed)
 */
export function useConnectionManager(
  options: UseConnectionManagerOptions = {}
): UseConnectionManagerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });

  // Mock socket object
  const socket = useRef({
    id: 'http-sse-connection-' + Date.now(),
    connected: false,
    emit: (event: string, data?: any) => {
      console.log('📡 [HTTP/SSE Connection Manager] Mock emit:', event, data);
    },
    on: (event: string, handler: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Connection Manager] Mock event handler registered:', event);
    },
    off: (event: string, handler?: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Connection Manager] Mock event handler removed:', event);
    }
  });

  // Mock metrics
  const metrics: ConnectionMetrics = {
    totalConnections: isConnected ? 1 : 0,
    totalDisconnections: 0,
    totalReconnectionAttempts: 0,
    averageConnectionDuration: 0,
    connectionUptime: isConnected ? Date.now() : 0
  };

  // Mock health status
  const health: HealthStatus = {
    healthy: isConnected,
    lastCheck: new Date(),
    latency: 0
  };

  const connect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Connection Manager] Mock connect - no WebSocket needed');
    setIsConnected(true);
    socket.current.connected = true;
    setState({
      status: 'connected',
      lastConnectedAt: new Date(),
      reconnectAttempts: 0
    });
    
    // Call connect callback
    options.onConnect?.();
  }, [options.onConnect]);

  const disconnect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Connection Manager] Mock disconnect');
    setIsConnected(false);
    socket.current.connected = false;
    setState({
      status: 'disconnected',
      reconnectAttempts: 0
    });
    
    // Call disconnect callback
    options.onDisconnect?.({ reason: 'manual', manual: true });
  }, [options.onDisconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }
  }, [options.autoConnect, connect]);

  // Mock manager object
  const manager = {
    connect,
    disconnect,
    getState: () => state,
    getMetrics: () => metrics,
    getHealth: () => health
  };

  return {
    socket: socket.current,
    isConnected,
    state,
    metrics,
    health,
    connect,
    disconnect,
    manager
  };
}

// Mock global connection manager
export function getGlobalConnectionManager() {
  console.log('📡 [HTTP/SSE] Mock global connection manager - no WebSocket needed');
  return {
    connect: async () => console.log('📡 [HTTP/SSE] Mock global connect'),
    disconnect: async () => console.log('📡 [HTTP/SSE] Mock global disconnect'),
    getState: () => ({ status: 'disconnected' }),
    getMetrics: () => ({ totalConnections: 0 }),
    getHealth: () => ({ healthy: false, lastCheck: new Date() })
  };
}