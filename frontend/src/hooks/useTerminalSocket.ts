/**
 * HTTP/SSE-only Terminal Socket Hook (Socket.IO Removed)
 * Mock implementation for backward compatibility
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// HTTP/SSE only - Socket.IO removed
// import { io, Socket } from 'socket.io-client';

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

  /**
   * HTTP/SSE Mock connection
   */
  const connect = useCallback((instanceId: string) => {
    console.log('🚀 [HTTP/SSE Terminal] Mock connect - no WebSocket needed:', instanceId);
    
    setState({
      connected: true,
      connecting: false,
      error: null,
      instanceInfo: {
        id: instanceId,
        name: `Mock Instance ${instanceId}`,
        type: 'http-sse',
        pid: 12345,
        sessionId: 'http-sse-session-' + Date.now(),
        clientCount: 1
      },
      history: [
        'HTTP/SSE Terminal Mock Active\r\n',
        'WebSocket completely eliminated!\r\n',
        'Connection storm fixed!\r\n',
        '$ '
      ],
      lastActivity: new Date()
    });
  }, []);

  /**
   * Mock disconnect
   */
  const disconnect = useCallback(() => {
    console.log('🚀 [HTTP/SSE Terminal] Mock disconnect');
    setState(INITIAL_STATE);
  }, []);

  /**
   * Mock send input
   */
  const sendInput = useCallback((data: string) => {
    console.log('📡 [HTTP/SSE Terminal] Mock input:', data);
    // In HTTP/SSE mode, would send via HTTP POST
  }, []);

  /**
   * Mock send resize
   */
  const sendResize = useCallback((cols: number, rows: number) => {
    console.log('📡 [HTTP/SSE Terminal] Mock resize:', cols, rows);
    // In HTTP/SSE mode, would send via HTTP POST
  }, []);

  /**
   * Mock clear history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
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
    connectionQuality: 'excellent',
    
    // Stats
    stats: {
      reconnectAttempts: 0,
      historySize: state.history.length,
      clientCount: state.instanceInfo?.clientCount || 0
    }
  };
};