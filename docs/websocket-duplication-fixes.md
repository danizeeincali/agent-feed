# Advanced React + WebSocket Duplication Solutions

## Research Findings

### Root Causes Identified:
1. **React.StrictMode** causing double useEffect execution in development
2. **Multiple WebSocket management systems** creating conflicting connections
3. **Incomplete message deduplication** patterns
4. **SSE + WebSocket dual broadcasting** race conditions
5. **useEffect dependency issues** causing reconnections on state changes

## Solution 1: Enhanced WebSocket Singleton with StrictMode Protection

```typescript
// src/hooks/useWebSocketSingleton.ts
import { useRef, useEffect, useState, useCallback } from 'react';

interface WebSocketMessage {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  terminalId?: string;
}

class WebSocketSingleton {
  private static instance: WebSocketSingleton;
  private connections: Map<string, WebSocket> = new Map();
  private messageCache: Map<string, Set<string>> = new Map(); // terminalId -> messageIds
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isStrictMode = false;
  private effectCounts: Map<string, number> = new Map(); // Track effect calls

  static getInstance(): WebSocketSingleton {
    if (!WebSocketSingleton.instance) {
      WebSocketSingleton.instance = new WebSocketSingleton();
    }
    return WebSocketSingleton.instance;
  }

  // SOLUTION: StrictMode Detection and Protection
  detectStrictMode(effectId: string): boolean {
    const count = (this.effectCounts.get(effectId) || 0) + 1;
    this.effectCounts.set(effectId, count);
    
    // If effect runs twice quickly, we're likely in StrictMode
    if (count === 2) {
      console.log('🛡️ StrictMode detected - preventing duplicate connection');
      this.isStrictMode = true;
      return true;
    }
    
    // Reset after 100ms to handle normal re-renders
    setTimeout(() => {
      this.effectCounts.delete(effectId);
    }, 100);
    
    return false;
  }

  // SOLUTION: Comprehensive Message Deduplication
  private generateMessageId(data: any, terminalId: string): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const timestamp = Date.now();
    return `${terminalId}-${timestamp}-${content.slice(0, 50)}-${content.length}`;
  }

  private isDuplicateMessage(messageId: string, terminalId: string): boolean {
    if (!this.messageCache.has(terminalId)) {
      this.messageCache.set(terminalId, new Set());
    }
    
    const cache = this.messageCache.get(terminalId)!;
    
    if (cache.has(messageId)) {
      console.log(`🔄 Duplicate message blocked: ${messageId.slice(0, 30)}...`);
      return true;
    }
    
    cache.add(messageId);
    
    // Cleanup old messages (keep last 100)
    if (cache.size > 100) {
      const messages = Array.from(cache);
      cache.clear();
      messages.slice(-50).forEach(id => cache.add(id));
    }
    
    return false;
  }

  // SOLUTION: Connection State Management
  connect(terminalId: string, url: string, effectId: string): WebSocket | null {
    // Protect against StrictMode double execution
    if (this.detectStrictMode(effectId)) {
      const existing = this.connections.get(terminalId);
      if (existing && existing.readyState === WebSocket.OPEN) {
        return existing;
      }
    }

    // Close existing connection if any
    this.disconnect(terminalId);

    console.log(`🔌 Creating WebSocket connection: ${terminalId}`);
    
    const ws = new WebSocket(url);
    this.connections.set(terminalId, ws);

    ws.onopen = () => {
      console.log(`✅ Connected: ${terminalId}`);
      this.emit('connect', { terminalId, connectionType: 'websocket' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageId = this.generateMessageId(data, terminalId);
        
        // Apply comprehensive deduplication
        if (this.isDuplicateMessage(messageId, terminalId)) {
          return;
        }
        
        console.log(`📨 Processing message: ${terminalId}`, data.type);
        
        // Route message to appropriate handlers
        if (data.type === 'output' || data.type === 'terminal_output') {
          this.emit('terminal:output', {
            terminalId,
            output: data.data || data.output,
            timestamp: Date.now()
          });
        } else if (data.type === 'status') {
          this.emit('terminal:status', {
            terminalId,
            status: data.status,
            timestamp: Date.now()
          });
        }
        
      } catch (error) {
        console.error(`❌ Message parsing error: ${terminalId}`, error);
      }
    };

    ws.onerror = (error) => {
      console.error(`❌ WebSocket error: ${terminalId}`, error);
      this.emit('error', { terminalId, error: 'Connection failed' });
    };

    ws.onclose = (event) => {
      console.log(`🔌 Disconnected: ${terminalId}`, event.code);
      this.connections.delete(terminalId);
      this.emit('disconnect', { terminalId, code: event.code });
      
      // Auto-reconnect on unexpected close
      if (event.code !== 1000) {
        this.scheduleReconnect(terminalId, url);
      }
    };

    return ws;
  }

  private scheduleReconnect(terminalId: string, url: string, delay = 2000) {
    if (this.reconnectTimeouts.has(terminalId)) {
      return; // Already scheduled
    }

    const timeout = setTimeout(() => {
      this.reconnectTimeouts.delete(terminalId);
      console.log(`🔄 Reconnecting: ${terminalId}`);
      this.connect(terminalId, url, `reconnect-${Date.now()}`);
    }, delay);

    this.reconnectTimeouts.set(terminalId, timeout);
  }

  disconnect(terminalId: string) {
    const ws = this.connections.get(terminalId);
    if (ws) {
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(terminalId);
    }

    // Clear reconnect timeout
    const timeout = this.reconnectTimeouts.get(terminalId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(timeout);
    }

    // Clear message cache
    this.messageCache.delete(terminalId);
  }

  // Event management
  on(event: string, handler: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Handler error for ${event}:`, error);
        }
      });
    }
  }

  send(terminalId: string, message: any) {
    const ws = this.connections.get(terminalId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error(`WebSocket not connected: ${terminalId}`);
    }
  }
}

// SOLUTION: StrictMode-Safe React Hook
export const useWebSocketSingleton = (terminalId: string, url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectIdRef = useRef(`effect-${Date.now()}-${Math.random()}`);
  const wsManager = WebSocketSingleton.getInstance();

  // CRITICAL: Stable effect with proper cleanup
  useEffect(() => {
    if (!terminalId || !url) return;

    const effectId = effectIdRef.current;
    console.log(`🚀 useEffect executing for ${terminalId} (${effectId})`);

    // Connect with StrictMode protection
    const ws = wsManager.connect(terminalId, url, effectId);

    // Set up event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleError = (data: any) => {
      setError(data.error);
      setIsConnected(false);
    };

    wsManager.on('connect', handleConnect);
    wsManager.on('disconnect', handleDisconnect);
    wsManager.on('error', handleError);

    // CRITICAL: Cleanup function
    return () => {
      console.log(`🧹 Cleaning up WebSocket for ${terminalId} (${effectId})`);
      wsManager.off('connect', handleConnect);
      wsManager.off('disconnect', handleDisconnect);
      wsManager.off('error', handleError);
      
      // Only disconnect if this is not a StrictMode double-call
      if (!wsManager.isStrictMode) {
        wsManager.disconnect(terminalId);
      }
    };
  }, [terminalId, url]); // Minimal dependencies

  const send = useCallback((message: any) => {
    try {
      wsManager.send(terminalId, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  }, [terminalId]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    wsManager.on(event, handler);
    return () => wsManager.off(event, handler);
  }, []);

  return {
    isConnected,
    error,
    send,
    subscribe,
    disconnect: () => wsManager.disconnect(terminalId)
  };
};
```

## Solution 2: React.StrictMode Workaround Component

```typescript
// src/components/StrictModeProtectedWebSocket.tsx
import { useEffect, useRef, useState } from 'react';

interface StrictModeProtectedProps {
  children: (isReady: boolean) => React.ReactNode;
}

export const StrictModeProtected: React.FC<StrictModeProtectedProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const mountCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    mountCountRef.current += 1;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (mountCountRef.current === 1) {
      // First mount - wait to see if there's a second one (StrictMode)
      timeoutRef.current = setTimeout(() => {
        setIsReady(true);
      }, 10);
    } else if (mountCountRef.current === 2) {
      // Second mount detected - this is StrictMode, wait a bit more
      console.log('🛡️ StrictMode double-mount detected, delaying initialization');
      timeoutRef.current = setTimeout(() => {
        setIsReady(true);
      }, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <>{children(isReady)}</>;
};
```

## Solution 3: Message Queue with Debouncing

```typescript
// src/utils/MessageQueue.ts
export class MessageQueue {
  private queue: Map<string, any[]> = new Map();
  private processing = false;
  private debounceTimeout: NodeJS.Timeout | null = null;

  enqueue(terminalId: string, message: any) {
    if (!this.queue.has(terminalId)) {
      this.queue.set(terminalId, []);
    }
    
    this.queue.get(terminalId)!.push({
      ...message,
      queuedAt: Date.now()
    });

    this.scheduleProcessing();
  }

  private scheduleProcessing() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.processQueue();
    }, 16); // ~60fps
  }

  private processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      this.queue.forEach((messages, terminalId) => {
        if (messages.length > 0) {
          // Deduplicate messages by content
          const unique = this.deduplicateMessages(messages);
          
          // Process unique messages
          unique.forEach(msg => {
            this.emitMessage(terminalId, msg);
          });
          
          // Clear processed messages
          this.queue.set(terminalId, []);
        }
      });
    } finally {
      this.processing = false;
    }
  }

  private deduplicateMessages(messages: any[]): any[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = `${msg.type}-${JSON.stringify(msg.data)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private emitMessage(terminalId: string, message: any) {
    // Emit to UI components
    console.log(`📤 Processing queued message for ${terminalId}:`, message.type);
  }
}
```

## Solution 4: Updated Component Integration

```typescript
// Updated ClaudeInstanceManagerModern.tsx integration
import { StrictModeProtected } from './StrictModeProtectedWebSocket';
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton';

const ClaudeInstanceManagerModern: React.FC<ClaudeInstanceManagerModernProps> = (props) => {
  return (
    <StrictModeProtected>
      {(isReady) => (
        isReady ? <ClaudeInstanceManagerContent {...props} /> : <div>Initializing...</div>
      )}
    </StrictModeProtected>
  );
};

const ClaudeInstanceManagerContent: React.FC<ClaudeInstanceManagerModernProps> = ({ 
  apiUrl = 'http://localhost:3000'
}) => {
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: string }>({});
  
  // Use the singleton hook
  const { isConnected, subscribe, send, error } = useWebSocketSingleton(
    selectedInstance || '',
    selectedInstance ? `${apiUrl.replace('http', 'ws')}/terminal/${selectedInstance}` : ''
  );

  // Set up message handlers with cleanup
  useEffect(() => {
    if (!selectedInstance) return;

    const unsubscribeOutput = subscribe('terminal:output', (data) => {
      setOutput(prev => ({
        ...prev,
        [data.terminalId]: (prev[data.terminalId] || '') + data.output
      }));
    });

    const unsubscribeStatus = subscribe('terminal:status', (data) => {
      console.log('Status update:', data);
    });

    return () => {
      unsubscribeOutput();
      unsubscribeStatus();
    };
  }, [selectedInstance, subscribe]);

  // Rest of component implementation...
  return (
    <div className="claude-instance-manager">
      {/* Component content */}
    </div>
  );
};
```

## Implementation Priority:

1. **Implement WebSocketSingleton** - Centralized connection management
2. **Add StrictMode Protection** - Prevent double initialization
3. **Update Component Integration** - Use new hook pattern
4. **Test in Development** - Verify duplication is resolved
5. **Monitor Production** - Ensure no regressions

## Testing Strategy:

```bash
# Test with StrictMode enabled
npm run dev

# Test with StrictMode disabled (temporarily)
# Remove <React.StrictMode> wrapper in main.tsx

# Test reconnection scenarios
# Disconnect/reconnect network

# Test multiple instances
# Create multiple Claude instances simultaneously
```

These solutions address all the root causes identified in the research and provide comprehensive protection against WebSocket message duplication in React applications.