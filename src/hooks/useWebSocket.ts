/**
 * useWebSocket Hook - Real WebSocket Implementation
 * Production-ready hook for real-time WebSocket communication
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string[];
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface WebSocketState {
  socket: WebSocket | null;
  lastMessage: WebSocketMessage | null;
  readyState: number;
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
}

export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
) => {
  const {
    autoConnect = true,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
    protocols,
    onOpen,
    onMessage,
    onError,
    onClose,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    lastMessage: null,
    readyState: WebSocket.CLOSED,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const reconnectCount = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    if (!url || state.isConnecting || state.isConnected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(url, protocols);

      ws.onopen = (event) => {
        setState(prev => ({
          ...prev,
          socket: ws,
          readyState: ws.readyState,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectCount.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            lastMessage: { ...message, timestamp: Date.now() },
          }));
          onMessage?.(message);
        } catch (error) {
          // Handle non-JSON messages
          const message: WebSocketMessage = {
            type: 'raw',
            data: event.data,
            timestamp: Date.now(),
          };
          setState(prev => ({ ...prev, lastMessage: message }));
          onMessage?.(message);
        }
      };

      ws.onerror = (error) => {
        setState(prev => ({
          ...prev,
          error,
          isConnecting: false,
        }));
        onError?.(error);
      };

      ws.onclose = (event) => {
        setState(prev => ({
          ...prev,
          socket: null,
          readyState: WebSocket.CLOSED,
          isConnected: false,
          isConnecting: false,
        }));

        onClose?.(event);

        // Attempt reconnection if enabled and within limits
        if (
          shouldReconnect.current &&
          reconnectCount.current < reconnectAttempts &&
          !event.wasClean
        ) {
          reconnectCount.current++;
          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      setState(prev => ({ ...prev, socket: ws, readyState: ws.readyState }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Event,
        isConnecting: false,
      }));
    }
  }, [url, protocols, onOpen, onMessage, onError, onClose, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }
    if (state.socket) {
      state.socket.close();
    }
  }, [state.socket]);

  const sendMessage = useCallback((message: WebSocketMessage | string) => {
    if (state.socket && state.isConnected) {
      const messageToSend = typeof message === 'string'
        ? message
        : JSON.stringify(message);
      state.socket.send(messageToSend);
      return true;
    }
    return false;
  }, [state.socket, state.isConnected]);

  const sendJsonMessage = useCallback((data: any) => {
    return sendMessage({ type: 'message', data, timestamp: Date.now() });
  }, [sendMessage]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
    };
  }, [autoConnect, url, connect]);

  // Update ready state when socket changes
  useEffect(() => {
    if (state.socket) {
      const updateReadyState = () => {
        setState(prev => ({
          ...prev,
          readyState: state.socket!.readyState,
          isConnected: state.socket!.readyState === WebSocket.OPEN,
        }));
      };

      updateReadyState();
    }
  }, [state.socket]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendJsonMessage,
    reconnectCount: reconnectCount.current,
  };
};

export default useWebSocket;