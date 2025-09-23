// SPARC + NLD SOLUTION: WebSocket Singleton with React.StrictMode protection
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  output?: string;
  terminalId?: string;
  timestamp?: number;
  error?: string;
}

interface WebSocketSingleton {
  isConnected: boolean;
  connect: (terminalId: string) => void;
  disconnect: () => void;
  send: (message: object) => void;
  addHandler: (event: string, handler: (data: any) => void) => void;
  removeHandler: (event: string, handler?: (data: any) => void) => void;
  currentTerminalId: string | null;
}

// Global WebSocket instance to prevent StrictMode duplicates
let globalWebSocket: WebSocket | null = null;
let globalHandlers = new Map<string, Set<(data: any) => void>>();
let globalConnectionPromise: Promise<WebSocket> | null = null;
let globalCurrentTerminal: string | null = null;

// Debounced message processing to prevent StrictMode duplicates
const processedMessages = new Set<string>();
const debounceMessage = (message: WebSocketMessage): boolean => {
  const messageId = `${message.type}-${message.terminalId}-${message.timestamp}-${(message.output || message.data || '').slice(0, 20)}`;
  
  if (processedMessages.has(messageId)) {
    console.log('🔄 SPARC: Duplicate message blocked by singleton:', messageId);
    return false;
  }
  
  processedMessages.add(messageId);
  
  // Cleanup old messages to prevent memory leak
  if (processedMessages.size > 1000) {
    const messages = Array.from(processedMessages);
    processedMessages.clear();
    messages.slice(-500).forEach(msg => processedMessages.add(msg));
  }
  
  return true;
};

export const useWebSocketSingleton = (apiUrl: string = 'http://localhost:3000'): WebSocketSingleton => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTerminalId, setCurrentTerminalId] = useState<string | null>(globalCurrentTerminal);
  const mountedRef = useRef(true);
  const strictModeDelayRef = useRef<NodeJS.Timeout>();

  // Stable handler management
  const addHandler = useCallback((event: string, handler: (data: any) => void) => {
    if (!globalHandlers.has(event)) {
      globalHandlers.set(event, new Set());
    }
    globalHandlers.get(event)!.add(handler);
    console.log(`✅ SPARC Singleton: Added handler for ${event}`);
  }, []);

  const removeHandler = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      globalHandlers.get(event)?.delete(handler);
    } else {
      globalHandlers.delete(event);
    }
    console.log(`🗑️ SPARC Singleton: Removed handler for ${event}`);
  }, []);

  const triggerHandlers = useCallback((event: string, data: any) => {
    if (!mountedRef.current) return;
    
    const handlers = globalHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ SPARC Singleton: Handler error for ${event}:`, error);
        }
      });
    }
  }, []);

  // WebSocket connection management
  const createConnection = useCallback(async (terminalId: string): Promise<WebSocket> => {
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      console.log('🔄 SPARC Singleton: Reusing existing connection for terminal:', terminalId);
      
      // Send connect message for new terminal on existing connection
      globalWebSocket.send(JSON.stringify({
        type: 'connect',
        terminalId,
        timestamp: Date.now()
      }));
      
      return globalWebSocket;
    }

    console.log('🚀 SPARC Singleton: Creating new WebSocket connection for terminal:', terminalId);
    
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/terminal`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.onopen = () => {
        console.log('✅ SPARC Singleton: WebSocket connected');
        clearTimeout(timeout);
        globalWebSocket = ws;
        setIsConnected(true);
        
        // Send connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId,
          timestamp: Date.now()
        }));
        
        resolve(ws);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Apply singleton deduplication
          if (!debounceMessage(message)) return;
          
          console.log('📨 SPARC Singleton: Message received:', message.type, message.terminalId?.slice(0, 8));
          
          // Route to appropriate handlers
          if (message.type === 'output' || message.type === 'terminal_output') {
            triggerHandlers('terminal:output', {
              output: message.data || message.output,
              terminalId: message.terminalId || globalCurrentTerminal,
              timestamp: message.timestamp
            });
          } else if (message.type === 'status') {
            triggerHandlers('terminal:status', message);
          } else if (message.type === 'error') {
            triggerHandlers('error', message);
          } else if (message.type === 'connect') {
            triggerHandlers('connect', { terminalId: message.terminalId });
          }
        } catch (parseError) {
          console.error('❌ SPARC Singleton: Message parsing error:', parseError);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ SPARC Singleton: WebSocket error:', error);
        clearTimeout(timeout);
        triggerHandlers('error', error);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log('🔌 SPARC Singleton: WebSocket closed:', event.code);
        globalWebSocket = null;
        globalConnectionPromise = null;
        setIsConnected(false);
        triggerHandlers('disconnect', { code: event.code, reason: event.reason });
      };
    });
  }, [apiUrl, triggerHandlers]);

  // Connect function with StrictMode protection
  const connect = useCallback((terminalId: string) => {
    if (!terminalId) {
      console.error('❌ SPARC Singleton: Invalid terminal ID');
      return;
    }

    // Extract base instance ID if formatted (e.g., "claude-6038 (Claude AI)" -> "claude-6038")
    const baseTerminalId = terminalId.includes('(') ? terminalId.split(' (')[0].trim() : terminalId;
    console.log('🎯 SPARC Singleton: Connecting to base terminal ID:', baseTerminalId, 'from:', terminalId);

    // StrictMode protection: delay connection if development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ SPARC Singleton: Dev mode detected, delaying connection');
      clearTimeout(strictModeDelayRef.current);
      strictModeDelayRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connectImmediate(baseTerminalId);
        }
      }, 100);
    } else {
      connectImmediate(baseTerminalId);
    }

    function connectImmediate(terminalId: string) {
      globalCurrentTerminal = terminalId;
      setCurrentTerminalId(terminalId);

      if (!globalConnectionPromise) {
        console.log('🚀 SPARC Singleton: Initiating new connection for:', terminalId);
        globalConnectionPromise = createConnection(terminalId);
      } else {
        console.log('🔄 SPARC Singleton: Reusing connection, sending connect message for:', terminalId);
        // If connection already exists, just send connect message
        createConnection(terminalId);
      }

      globalConnectionPromise.catch(error => {
        console.error('❌ SPARC Singleton: Connection failed:', error);
        globalConnectionPromise = null;
      });
    }
  }, [createConnection]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 SPARC Singleton: Disconnecting');
    
    clearTimeout(strictModeDelayRef.current);
    
    if (globalWebSocket) {
      globalWebSocket.close(1000, 'Manual disconnect');
      globalWebSocket = null;
    }
    
    globalConnectionPromise = null;
    globalCurrentTerminal = null;
    setCurrentTerminalId(null);
    setIsConnected(false);
    
    // Clear processed messages for clean reconnect
    processedMessages.clear();
  }, []);

  // Send function
  const send = useCallback((message: object) => {
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      // Extract base terminal ID for consistent routing
      const msg = message as any;
      if (msg.terminalId && msg.terminalId.includes('(')) {
        msg.terminalId = msg.terminalId.split(' (')[0].trim();
      }
      
      const messageStr = JSON.stringify(msg);
      console.log('📤 SPARC Singleton: Sending message with base terminal ID:', messageStr.slice(0, 200));
      globalWebSocket.send(messageStr);
    } else {
      console.warn('⚠️ SPARC Singleton: Cannot send, WebSocket not connected');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      clearTimeout(strictModeDelayRef.current);
    };
  }, []);

  // Stable return object
  const singleton = useMemo(() => ({
    isConnected,
    connect,
    disconnect,
    send,
    addHandler,
    removeHandler,
    currentTerminalId
  }), [isConnected, connect, disconnect, send, addHandler, removeHandler, currentTerminalId]);

  return singleton;
};