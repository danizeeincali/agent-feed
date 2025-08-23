import { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalWebSocketService } from '../services/terminal-websocket';

export interface UseTerminalOptions {
  wsUrl?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: string) => void;
  onData?: (data: string) => void;
}

export interface UseTerminalReturn {
  // Connection state
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
  lastError?: string;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Data methods
  send: (data: string) => boolean;
  resize: (cols: number, rows: number) => boolean;
  
  // Terminal service reference
  terminalService: TerminalWebSocketService | null;
}

/**
 * Custom hook for managing terminal WebSocket connections
 */
export const useTerminal = (options: UseTerminalOptions = {}): UseTerminalReturn => {
  const {
    wsUrl = 'ws://localhost:3001/terminal',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onConnect,
    onDisconnect,
    onError,
    onData
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | undefined>();
  
  const terminalServiceRef = useRef<TerminalWebSocketService | null>(null);

  // Initialize terminal service
  const initializeService = useCallback(() => {
    if (terminalServiceRef.current) {
      terminalServiceRef.current.destroy();
    }

    const service = new TerminalWebSocketService({
      url: wsUrl,
      reconnectAttempts,
      reconnectDelay
    });

    // Set up event handlers
    service.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status !== 'error') {
        setLastError(undefined);
      }
    });

    service.onConnect(() => {
      setLastError(undefined);
      onConnect?.();
    });

    service.onDisconnect((reason) => {
      onDisconnect?.(reason);
    });

    service.onError((error) => {
      setLastError(error);
      onError?.(error);
    });

    service.onData((data) => {
      onData?.(data);
    });

    terminalServiceRef.current = service;
  }, [wsUrl, reconnectAttempts, reconnectDelay, onConnect, onDisconnect, onError, onData]);

  // Connect to terminal
  const connect = useCallback(async () => {
    if (!terminalServiceRef.current) {
      initializeService();
    }
    
    try {
      await terminalServiceRef.current!.connect();
    } catch (error) {
      console.error('Failed to connect to terminal:', error);
      throw error;
    }
  }, [initializeService]);

  // Disconnect from terminal
  const disconnect = useCallback(() => {
    if (terminalServiceRef.current) {
      terminalServiceRef.current.disconnect();
    }
  }, []);

  // Reconnect to terminal
  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await connect();
  }, [connect, disconnect]);

  // Send data to terminal
  const send = useCallback((data: string): boolean => {
    if (!terminalServiceRef.current) {
      console.warn('Terminal service not initialized');
      return false;
    }
    return terminalServiceRef.current.send(data);
  }, []);

  // Send resize event to terminal
  const resize = useCallback((cols: number, rows: number): boolean => {
    if (!terminalServiceRef.current) {
      console.warn('Terminal service not initialized');
      return false;
    }
    return terminalServiceRef.current.resize(cols, rows);
  }, []);

  // Initialize service on mount
  useEffect(() => {
    initializeService();

    // Auto-connect if enabled
    if (autoConnect) {
      connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      if (terminalServiceRef.current) {
        terminalServiceRef.current.destroy();
        terminalServiceRef.current = null;
      }
    };
  }, [initializeService, autoConnect, connect]);

  // Derived state
  const isConnected = connectionStatus === 'connected';

  return {
    connectionStatus,
    isConnected,
    lastError,
    connect,
    disconnect,
    reconnect,
    send,
    resize,
    terminalService: terminalServiceRef.current
  };
};

/**
 * Hook for terminal keyboard shortcuts and input handling
 */
export const useTerminalKeyboard = (
  terminalService: TerminalWebSocketService | null,
  options: {
    enableShortcuts?: boolean;
    shortcuts?: Record<string, () => void>;
  } = {}
) => {
  const { enableShortcuts = true, shortcuts = {} } = options;

  // Default shortcuts
  const defaultShortcuts = {
    'ctrl+c': () => terminalService?.send('\x03'), // SIGINT
    'ctrl+d': () => terminalService?.send('\x04'), // EOF
    'ctrl+z': () => terminalService?.send('\x1a'), // SIGTSTP
    'ctrl+l': () => terminalService?.send('\x0c'), // Clear screen
  };

  const allShortcuts = { ...defaultShortcuts, ...shortcuts };

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableShortcuts || !terminalService) return;

    const key = event.key.toLowerCase();
    const shortcutKey = [
      event.ctrlKey && 'ctrl',
      event.altKey && 'alt',
      event.shiftKey && 'shift',
      event.metaKey && 'meta',
      key
    ].filter(Boolean).join('+');

    const handler = allShortcuts[shortcutKey];
    if (handler) {
      event.preventDefault();
      handler();
    }
  }, [enableShortcuts, terminalService, allShortcuts]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (enableShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enableShortcuts, handleKeyDown]);

  return {
    handleKeyDown
  };
};