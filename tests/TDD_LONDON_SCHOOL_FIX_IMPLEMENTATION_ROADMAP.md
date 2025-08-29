# TDD LONDON SCHOOL: Fix Implementation Roadmap

## 🎯 SYSTEMATIC FIX IMPLEMENTATION STRATEGY

Based on the comprehensive error analysis from our failing tests, this roadmap provides a step-by-step approach to fix all identified issues while maintaining TDD London School principles.

---

## 📋 PHASE 1: CRITICAL INFRASTRUCTURE FIXES

### 1.1 Fix Component Import and Module Resolution

#### Issue: Component Import Failures
```typescript
// FAILING: Missing UI component imports
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'; // ❌ Not found
import { Badge } from './ui/badge'; // ❌ Not found
import { Button } from './ui/button'; // ❌ Not found
```

#### Fix Implementation:
```typescript
// 1. Create missing UI components in frontend/src/components/ui/
// 2. Implement proper component exports
// 3. Add TypeScript definitions

// frontend/src/components/ui/card.tsx
export const Card = ({ children, className, ...props }) => (
  <div className={`card ${className || ''}`} {...props}>{children}</div>
);

export const CardHeader = ({ children, ...props }) => (
  <div className="card-header" {...props}>{children}</div>
);

export const CardTitle = ({ children, ...props }) => (
  <h2 className="card-title" {...props}>{children}</h2>
);

export const CardContent = ({ children, ...props }) => (
  <div className="card-content" {...props}>{children}</div>
);
```

#### Success Criteria:
- ✅ `import { Card, Badge, Button }` resolves without errors
- ✅ Components render in test environment
- ✅ TypeScript types are properly exported

### 1.2 Fix NLD UI Capture Window Access

#### Issue: Window Access in Test Environment
```typescript
// FAILING: window is not defined in test environment
initializeCapture() {
  viewport: {
    width: window.innerWidth, // ❌ ReferenceError: window is not defined
    height: window.innerHeight
  }
}
```

#### Fix Implementation:
```typescript
// frontend/src/utils/nld-ui-capture.ts
initializeCapture() {
  this.currentContext = {
    viewport: {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080
    },
    // Add proper window existence checks
  };
}
```

#### Success Criteria:
- ✅ NLD capture works in both browser and test environments
- ✅ No window access errors in tests
- ✅ Graceful fallback values for SSR/test scenarios

### 1.3 Implement WebSocket Terminal Hook

#### Issue: Missing useWebSocketTerminal Implementation
```typescript
// FAILING: Hook not properly implemented
const { socket, isConnected, send } = useWebSocketTerminal({ url });
// ❌ Cannot destructure properties from undefined
```

#### Fix Implementation:
```typescript
// frontend/src/hooks/useWebSocketTerminal.ts
export const useWebSocketTerminal = ({ url }: { url: string }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectToTerminal = useCallback((terminalId: string) => {
    try {
      const ws = new WebSocket(`${url}/terminals/${terminalId}`);
      
      ws.onopen = () => {
        setSocket(ws);
        setIsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        setLastMessage(event.data);
        // Trigger subscribers
      };

      ws.onerror = (error) => {
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSocket(null);
      };

    } catch (error) {
      setConnectionError(error.message);
    }
  }, [url]);

  const send = useCallback((data: string) => {
    if (socket && isConnected) {
      socket.send(data);
    }
  }, [socket, isConnected]);

  const subscribe = useCallback((event: string, callback: Function) => {
    // Implement event subscription system
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    connectionError,
    connectToTerminal,
    disconnectFromTerminal: () => socket?.close(),
    send,
    subscribe,
    unsubscribe: () => {},
  };
};
```

#### Success Criteria:
- ✅ Hook initializes without errors
- ✅ WebSocket connections can be established
- ✅ Message sending/receiving works
- ✅ Proper cleanup on unmount

---

## 📋 PHASE 2: SSE CONNECTION MANAGEMENT

### 2.1 Implement SSE Connection Singleton

#### Issue: SSE Singleton Pattern Not Enforced
```typescript
// FAILING: Multiple SSE connections created
const sse1 = useSSEConnectionSingleton('http://localhost:3002');
const sse2 = useSSEConnectionSingleton('http://localhost:3002');
// Should share connection but creates duplicates
```

#### Fix Implementation:
```typescript
// frontend/src/hooks/useSSEConnectionSingleton.ts
class SSEConnectionManager {
  private static instance: SSEConnectionManager;
  private connections: Map<string, EventSource> = new Map();
  
  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager();
    }
    return SSEConnectionManager.instance;
  }

  getConnection(instanceId: string, url: string): EventSource {
    const key = `${url}:${instanceId}`;
    
    if (this.connections.has(key)) {
      const existing = this.connections.get(key);
      if (existing.readyState !== EventSource.CLOSED) {
        return existing;
      }
    }

    const eventSource = new EventSource(`${url}/api/v1/claude/instances/${instanceId}/terminal/stream`);
    this.connections.set(key, eventSource);
    return eventSource;
  }
}

export const useSSEConnectionSingleton = (baseUrl: string) => {
  const manager = SSEConnectionManager.getInstance();
  
  const connectToInstance = useCallback(async (instanceId: string) => {
    const eventSource = manager.getConnection(instanceId, baseUrl);
    // Setup event handlers
  }, [baseUrl]);

  return {
    connectToInstance,
    disconnectFromInstance: () => {},
    sendCommand: () => {},
    addHandler: () => {},
    removeHandler: () => {},
    isConnected: false,
  };
};
```

#### Success Criteria:
- ✅ Only one SSE connection per instance
- ✅ Connections are properly shared
- ✅ Memory leaks prevented
- ✅ Connection recovery works

### 2.2 Implement Advanced SSE Connection Features

#### Issue: Advanced SSE Features Missing
```typescript
// FAILING: Advanced features not implemented
const { 
  connectToInstance,
  getMessages,
  getUIState,
  forceRecovery 
} = useAdvancedSSEConnection(url, options);
```

#### Fix Implementation:
```typescript
// frontend/src/hooks/useAdvancedSSEConnection.ts
export function useAdvancedSSEConnection(
  baseUrl: string,
  options: SSEConnectionOptions = {}
) {
  // Service initialization
  const messageProcessor = useRef<IncrementalMessageProcessor>();
  const uiStateManager = useRef<UIStateManager>();
  const errorRecoveryManager = useRef<ErrorRecoveryManager>();

  useEffect(() => {
    messageProcessor.current = new IncrementalMessageProcessor();
    uiStateManager.current = new UIStateManager();
    errorRecoveryManager.current = new ErrorRecoveryManager(options);
  }, []);

  const connectToInstance = useCallback(async (instanceId: string) => {
    // Implementation with proper error handling
  }, []);

  return {
    connectToInstance,
    disconnectFromInstance: () => {},
    getMessages: () => [],
    getUIState: () => null,
    forceRecovery: async () => {},
    connectionState: {
      isConnected: false,
      isConnecting: false,
      instanceId: null,
    },
    metrics: {
      totalMessages: 0,
      messagesPerSecond: 0,
    },
  };
}
```

#### Success Criteria:
- ✅ Advanced SSE features work correctly
- ✅ Message processing is incremental
- ✅ UI state management works
- ✅ Error recovery is automatic

---

## 📋 PHASE 3: REACT COMPONENT INTEGRATION

### 3.1 Fix Component Rendering Issues

#### Issue: Component Crashes on Render
```typescript
// FAILING: Component fails to render
export default ClaudeInstanceManagerModern;
// ❌ Cannot read properties of undefined (reading 'useState')
```

#### Fix Implementation:
```typescript
// frontend/src/components/ClaudeInstanceManagerModern.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';
import { ClaudeInstanceButtons, ChatInterface } from './claude-manager';

const ClaudeInstanceManagerModern: React.FC<ClaudeInstanceManagerModernProps> = ({ 
  apiUrl = 'http://localhost:3002' 
}) => {
  // Proper state initialization with error boundaries
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proper hook usage with error handling
  const { 
    isConnected,
    connectToTerminal, 
    send,
    subscribe,
  } = useWebSocketTerminal({ url: apiUrl.replace('http://', 'ws://') });

  // Component implementation with proper error handling
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Proper component structure */}
    </div>
  );
};

export default ClaudeInstanceManagerModern;
```

#### Success Criteria:
- ✅ Component renders without crashes
- ✅ All hooks are properly called
- ✅ State is properly initialized
- ✅ Error boundaries catch issues

### 3.2 Implement Claude Manager Subcomponents

#### Issue: Missing ClaudeInstanceButtons and ChatInterface
```typescript
// FAILING: Subcomponents not found
import { ClaudeInstanceButtons, ChatInterface } from './claude-manager';
// ❌ Module not found
```

#### Fix Implementation:
```typescript
// frontend/src/components/claude-manager/index.ts
export { ClaudeInstanceButtons } from './ClaudeInstanceButtons';
export { ChatInterface } from './ChatInterface';

// frontend/src/components/claude-manager/ClaudeInstanceButtons.tsx
export const ClaudeInstanceButtons: React.FC<{
  onCreateInstance: (command: string) => void;
  loading: boolean;
  connectionStatuses: Record<string, any>;
}> = ({ onCreateInstance, loading, connectionStatuses }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={() => onCreateInstance('claude')}
        disabled={loading}
        className="btn btn-primary"
      >
        prod/claude
      </button>
      {/* More buttons */}
    </div>
  );
};

// frontend/src/components/claude-manager/ChatInterface.tsx
export const ChatInterface: React.FC<{
  selectedInstance: ClaudeInstance | null;
  output: Record<string, string>;
  onSendInput: (input: string) => void;
  // ... other props
}> = ({ selectedInstance, output, onSendInput, ...props }) => {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages display */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedInstance && output[selectedInstance.id] && (
          <pre className="whitespace-pre-wrap">{output[selectedInstance.id]}</pre>
        )}
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={() => {
              onSendInput(input);
              setInput('');
            }}
            disabled={!input.trim()}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### Success Criteria:
- ✅ Subcomponents render correctly
- ✅ Button interactions work
- ✅ Chat interface is functional
- ✅ Input/output flows properly

---

## 📋 PHASE 4: API INTEGRATION AND BACKEND COMMUNICATION

### 4.1 Fix API Endpoint Communication

#### Issue: API Fetch Calls Failing
```typescript
// FAILING: API calls not working
const response = await fetch(`${apiUrl}/api/terminals`);
// ❌ Network error, improper error handling
```

#### Fix Implementation:
```typescript
// frontend/src/services/ApiClient.ts
export class ApiClient {
  constructor(private baseUrl: string) {}

  async fetchTerminals(): Promise<Terminal[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/terminals`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.terminals || [];
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network connection failed - please check your connection');
      }
      throw error;
    }
  }

  async launchTerminal(command: string): Promise<{ terminalId: string; pid: number }> {
    const response = await fetch(`${this.baseUrl}/api/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cwd: '/workspaces/agent-feed',
        command
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Launch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async terminateTerminal(terminalId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/terminals/${terminalId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Termination failed: ${response.statusText}`);
    }
  }
}

// Usage in components
const apiClient = new ApiClient(apiUrl);

const fetchInstances = async () => {
  try {
    setLoading(true);
    const terminals = await apiClient.fetchTerminals();
    setInstances(terminals.map(terminal => ({
      id: terminal.id,
      name: `Terminal ${terminal.id}`,
      status: terminal.isAlive ? 'running' : 'stopped',
      pid: terminal.pid,
      startTime: new Date(terminal.lastActivity)
    })));
    setError(null);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

#### Success Criteria:
- ✅ API calls work with proper error handling
- ✅ Network errors are gracefully handled
- ✅ Loading states are properly managed
- ✅ Error messages are user-friendly

### 4.2 Implement Terminal I/O Pipeline

#### Issue: Terminal Input/Output Not Working
```typescript
// FAILING: I/O pipeline broken
const sendInput = (input: string) => {
  // ❌ No validation, no WebSocket connection
  ws.send(input);
};
```

#### Fix Implementation:
```typescript
// Terminal I/O with proper validation and error handling
const sendInput = useCallback((input: string) => {
  // Input validation
  if (!selectedInstance || selectedInstance === 'undefined' || !selectedInstance.trim()) {
    console.warn('Cannot send input: no valid instance selected');
    setError('No valid instance selected');
    return;
  }
  
  if (!input.trim()) {
    console.warn('Cannot send empty input');
    return;
  }
  
  if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
    console.error('Invalid instance ID format:', selectedInstance);
    setError(`Invalid instance ID format: ${selectedInstance}`);
    return;
  }
  
  // Send via WebSocket with error handling
  if (isConnected && send) {
    try {
      send(input);
      setError(null);
    } catch (err) {
      console.error('Failed to send command:', err);
      setError(`Failed to send command: ${err.message}`);
    }
  } else {
    console.warn('Not connected, cannot send input');
    setError('Not connected to terminal');
  }
}, [selectedInstance, isConnected, send]);

// Output handling with proper parsing
useEffect(() => {
  if (!subscribe) return;

  const handleOutput = (data: any) => {
    if (data.output && data.terminalId) {
      setOutput(prev => ({
        ...prev,
        [data.terminalId]: (prev[data.terminalId] || '') + data.output
      }));
    }
  };

  subscribe('terminal:output', handleOutput);
  subscribe('message', handleOutput);

  return () => {
    unsubscribe('terminal:output');
    unsubscribe('message');
  };
}, [subscribe, unsubscribe]);
```

#### Success Criteria:
- ✅ Input validation prevents invalid commands
- ✅ Output is properly displayed in UI
- ✅ Error handling provides feedback
- ✅ Real-time communication works

---

## 📋 PHASE 5: MEMORY MANAGEMENT AND PERFORMANCE

### 5.1 Implement Proper Resource Cleanup

#### Issue: Memory Leaks from Uncleaned Resources
```typescript
// FAILING: Resources not cleaned up
useEffect(() => {
  // Setup connections
  // ❌ No cleanup on unmount
}, []);
```

#### Fix Implementation:
```typescript
// Proper resource cleanup
useEffect(() => {
  const connections: EventSource[] = [];
  const handlers: (() => void)[] = [];

  // Setup with cleanup tracking
  const setupConnection = () => {
    const eventSource = new EventSource(url);
    connections.push(eventSource);

    const handler = () => { /* handler logic */ };
    handlers.push(handler);
    
    eventSource.addEventListener('message', handler);
  };

  setupConnection();

  // Cleanup function
  return () => {
    connections.forEach(connection => {
      if (connection.readyState !== EventSource.CLOSED) {
        connection.close();
      }
    });
    
    handlers.forEach(cleanup => cleanup?.());
    
    // Clear arrays
    connections.length = 0;
    handlers.length = 0;
  };
}, [url]);

// Output buffer management
const [output, setOutput] = useState<Record<string, string>>({});
const maxOutputLength = 50000; // 50KB limit per instance

const addOutput = useCallback((instanceId: string, newOutput: string) => {
  setOutput(prev => {
    const currentOutput = prev[instanceId] || '';
    const combinedOutput = currentOutput + newOutput;
    
    // Trim if too long (keep last 75% when limit exceeded)
    if (combinedOutput.length > maxOutputLength) {
      const keepFromIndex = Math.floor(maxOutputLength * 0.25);
      const trimmedOutput = combinedOutput.slice(keepFromIndex);
      return { ...prev, [instanceId]: trimmedOutput };
    }
    
    return { ...prev, [instanceId]: combinedOutput };
  });
}, []);
```

#### Success Criteria:
- ✅ All resources properly cleaned up
- ✅ Memory usage remains stable
- ✅ No memory leaks after extended use
- ✅ Output buffers have size limits

### 5.2 Performance Optimization

#### Issue: UI Becomes Unresponsive Under Load
```typescript
// FAILING: Blocking UI updates
setOutput(prev => ({
  ...prev,
  [instanceId]: prev[instanceId] + newOutput // ❌ Blocks UI
}));
```

#### Fix Implementation:
```typescript
// Debounced updates for performance
import { useMemo, useCallback, useState } from 'react';
import { debounce } from 'lodash';

const useOptimizedOutput = () => {
  const [output, setOutput] = useState<Record<string, string>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, string[]>>({});

  const flushUpdates = useCallback(() => {
    setPendingUpdates(pending => {
      const updates: Record<string, string> = {};
      
      Object.entries(pending).forEach(([instanceId, chunks]) => {
        if (chunks.length > 0) {
          updates[instanceId] = chunks.join('');
        }
      });

      if (Object.keys(updates).length > 0) {
        setOutput(prev => {
          const newOutput = { ...prev };
          Object.entries(updates).forEach(([instanceId, chunk]) => {
            newOutput[instanceId] = (prev[instanceId] || '') + chunk;
          });
          return newOutput;
        });
      }

      return {}; // Clear pending updates
    });
  }, []);

  const debouncedFlush = useMemo(() => debounce(flushUpdates, 100), [flushUpdates]);

  const addOutput = useCallback((instanceId: string, newOutput: string) => {
    setPendingUpdates(prev => ({
      ...prev,
      [instanceId]: [...(prev[instanceId] || []), newOutput]
    }));
    
    debouncedFlush();
  }, [debouncedFlush]);

  return { output, addOutput };
};
```

#### Success Criteria:
- ✅ UI remains responsive under high load
- ✅ Updates are batched efficiently
- ✅ Memory usage is optimized
- ✅ No blocking operations in render

---

## 🧪 TESTING STRATEGY FOR FIXES

### Test-Driven Fix Implementation

1. **Start with Failing Test**
   ```bash
   # Run specific failing test
   npx vitest run tests/tdd-london-school/claude-instance-manager-modern.failing.test.tsx
   ```

2. **Implement Minimal Fix**
   ```typescript
   // Implement just enough to make the test pass
   ```

3. **Verify Fix**
   ```bash
   # Test should now pass
   npx vitest run tests/tdd-london-school/claude-instance-manager-modern.failing.test.tsx
   ```

4. **Refactor and Optimize**
   ```typescript
   // Improve implementation while keeping tests green
   ```

5. **Integration Test**
   ```bash
   # Run all related tests
   npx vitest run tests/tdd-london-school/
   ```

### Success Metrics

- **Phase 1 Complete:** 25+ critical tests passing
- **Phase 2 Complete:** 40+ integration tests passing  
- **Phase 3 Complete:** 55+ component tests passing
- **Phase 4 Complete:** 70+ API integration tests passing
- **Phase 5 Complete:** All 98 tests passing

---

## 🎯 IMPLEMENTATION TIMELINE

### Week 1: Critical Infrastructure (Phase 1)
- Day 1-2: Fix component imports and UI components
- Day 3-4: Implement WebSocket terminal hook
- Day 5-7: Fix SSE connection management

### Week 2: Component Integration (Phase 2-3)
- Day 1-3: Implement SSE singleton and advanced features
- Day 4-5: Fix React component rendering
- Day 6-7: Implement subcomponents

### Week 3: Backend Integration (Phase 4)
- Day 1-3: Fix API communication
- Day 4-5: Implement terminal I/O pipeline
- Day 6-7: Add proper error handling

### Week 4: Performance & Polish (Phase 5)
- Day 1-3: Memory management and cleanup
- Day 4-5: Performance optimization
- Day 6-7: Final testing and verification

**Outcome:** Fully functional frontend with all 98 tests passing and robust Claude instance management capabilities.