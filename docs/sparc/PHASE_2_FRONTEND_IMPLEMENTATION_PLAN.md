# Phase 2: Frontend HTTP/SSE Implementation Plan

## Overview
This document details the frontend implementation to replace WebSocket with HTTP/SSE communication, building upon the backend services implemented in Phase 1.

## Current Frontend WebSocket Dependencies

### Critical Components to Convert
```
src/hooks/useWebSocket.ts - Core WebSocket hook (360 lines)
src/components/ClaudeInstanceManager.tsx - Main Claude UI (368 lines)
src/components/RobustWebSocketProvider.tsx - Context provider (394 lines)
src/App.tsx - Navigation and routing (407 lines)
src/context/WebSocketSingletonContext.tsx - Global state
```

### Existing HTTP/SSE Implementation
The system already has partial HTTP/SSE support:
- Lines 32-35 in useWebSocket.ts: HTTP polling methods
- Lines 164-259 in useWebSocket.ts: SSE connection handling
- Working HTTP polling terminal at /http-terminal route

## Implementation Strategy

### Step 1: New HTTP/SSE Hook

```typescript
// src/hooks/useHTTPSSE.ts
import { useEffect, useState, useCallback, useRef } from 'react';

interface HTTPSSEMessage {
  type: string;
  data: any;
  timestamp: string;
  instanceId?: string;
}

interface HTTPSSEOptions {
  instanceId?: string;
  apiUrl?: string;
  autoConnect?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface HTTPSSEReturn {
  // Connection state
  isConnected: boolean;
  connectionHealth: 'excellent' | 'good' | 'poor' | 'disconnected';
  isPolling: boolean;
  lastMessage: HTTPSSEMessage | null;
  connectionError: string | null;
  
  // Connection management
  connect: (instanceId: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Communication methods
  sendCommand: (command: string, data?: any) => Promise<any>;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  
  // Utility methods
  getConnectionStats: () => any;
  testConnection: () => Promise<{ success: boolean; latency: number }>;
}

export const useHTTPSSE = (options: HTTPSSEOptions = {}): HTTPSSEReturn => {
  const {
    instanceId,
    apiUrl = 'http://localhost:3000',
    autoConnect = true,
    enablePolling = true,
    pollingInterval = 2000,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [isPolling, setIsPolling] = useState(false);
  const [lastMessage, setLastMessage] = useState<HTTPSSEMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Refs for connection management
  const sseConnectionRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const httpClientRef = useRef<typeof fetch>(fetch);

  // HTTP client with error handling
  const makeHTTPRequest = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('HTTP request failed:', endpoint, error);
      throw error;
    }
  }, [apiUrl]);

  // SSE connection management
  const connectSSE = useCallback(async (targetInstanceId: string): Promise<void> => {
    if (sseConnectionRef.current) {
      sseConnectionRef.current.close();
    }
    
    try {
      console.log(`📡 Connecting SSE for instance: ${targetInstanceId}`);
      
      const eventSource = new EventSource(`${apiUrl}/api/v1/claude/instances/${targetInstanceId}/stream`);
      sseConnectionRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setConnectionHealth('excellent');
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Stop polling if SSE is working
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setIsPolling(false);
        }
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          const message: HTTPSSEMessage = {
            type: data.type,
            data: data,
            timestamp: data.timestamp || new Date().toISOString(),
            instanceId: data.instanceId
          };
          
          setLastMessage(message);
          
          // Trigger event handlers
          const handlers = eventHandlersRef.current.get(data.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error('Event handler error:', error);
              }
            });
          }
          
          // Update connection health based on message frequency
          setConnectionHealth('excellent');
        } catch (error) {
          console.error('SSE message parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionHealth('poor');
        setConnectionError('SSE connection failed');
        
        // Start polling as fallback
        if (enablePolling && !pollingIntervalRef.current) {
          startPolling(targetInstanceId);
        }
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < reconnectAttempts) {
          setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectSSE(targetInstanceId);
          }, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current));
        } else {
          setIsConnected(false);
          setConnectionHealth('disconnected');
        }
      };
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnectionError('Failed to create SSE connection');
      
      // Fallback to polling
      if (enablePolling) {
        startPolling(targetInstanceId);
      }
    }
  }, [apiUrl, enablePolling, reconnectAttempts, reconnectDelay]);

  // HTTP polling fallback
  const startPolling = useCallback((targetInstanceId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log(`🔄 Starting HTTP polling for instance: ${targetInstanceId}`);
    setIsPolling(true);
    setConnectionHealth('good');
    
    let lastPolledTimestamp: string | null = null;
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const endpoint = `/api/v1/claude/instances/${targetInstanceId}/poll${lastPolledTimestamp ? `?since=${lastPolledTimestamp}` : ''}`;
        const response = await makeHTTPRequest(endpoint);
        
        if (response.success && response.hasNewData && response.data) {
          // Process polling data events
          if (response.data.events && Array.isArray(response.data.events)) {
            response.data.events.forEach((event: any) => {
              const message: HTTPSSEMessage = {
                type: event.type,
                data: event.data,
                timestamp: event.timestamp,
                instanceId: targetInstanceId
              };
              
              setLastMessage(message);
              
              // Trigger event handlers
              const handlers = eventHandlersRef.current.get(event.type);
              if (handlers) {
                handlers.forEach(handler => {
                  try {
                    handler(event.data);
                  } catch (error) {
                    console.error('Polling event handler error:', error);
                  }
                });
              }
            });
          }
          
          lastPolledTimestamp = response.lastUpdate;
        }
        
        setIsConnected(true);
        setConnectionError(null);
      } catch (error) {
        console.error('Polling error:', error);
        setConnectionError('Polling failed');
        setConnectionHealth('poor');
      }
    }, pollingInterval);
  }, [makeHTTPRequest, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  // Main connect method
  const connect = useCallback(async (targetInstanceId: string): Promise<void> => {
    console.log(`🚀 Connecting to instance: ${targetInstanceId}`);
    
    // First try SSE
    await connectSSE(targetInstanceId);
    
    // If SSE fails and polling is enabled, polling will start automatically in error handler
  }, [connectSSE]);

  // Disconnect method
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting HTTP/SSE');
    
    if (sseConnectionRef.current) {
      sseConnectionRef.current.close();
      sseConnectionRef.current = null;
    }
    
    stopPolling();
    
    setIsConnected(false);
    setConnectionHealth('disconnected');
    setConnectionError(null);
  }, [stopPolling]);

  // Reconnect method
  const reconnect = useCallback(async (): Promise<void> => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
    
    if (instanceId) {
      await connect(instanceId);
    }
  }, [disconnect, connect, instanceId]);

  // Send command via HTTP
  const sendCommand = useCallback(async (command: string, data: any = {}): Promise<any> => {
    if (!instanceId) {
      throw new Error('No instance ID set');
    }
    
    const endpoint = `/api/v1/claude/instances/${instanceId}/terminal/input`;
    
    try {
      const response = await makeHTTPRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ input: command, ...data })
      });
      
      return response;
    } catch (error) {
      console.error('Command send failed:', error);
      throw error;
    }
  }, [instanceId, makeHTTPRequest]);

  // Event subscription
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    const handlers = eventHandlersRef.current.get(event) || new Set();
    handlers.add(handler);
    eventHandlersRef.current.set(event, handlers);
  }, []);

  // Event unsubscription
  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(event);
        }
      }
    } else {
      eventHandlersRef.current.delete(event);
    }
  }, []);

  // Connection testing
  const testConnection = useCallback(async (): Promise<{ success: boolean; latency: number }> => {
    const startTime = Date.now();
    
    try {
      await makeHTTPRequest('/api/v1/claude/instances/system/stats');
      const latency = Date.now() - startTime;
      
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { success: false, latency };
    }
  }, [makeHTTPRequest]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      isConnected,
      connectionHealth,
      isPolling,
      hasSSE: !!sseConnectionRef.current && sseConnectionRef.current.readyState === EventSource.OPEN,
      reconnectAttempts: reconnectAttemptsRef.current,
      lastMessage: lastMessage ? lastMessage.timestamp : null,
      eventHandlerCount: Array.from(eventHandlersRef.current.values()).reduce((total, set) => total + set.size, 0)
    };
  }, [isConnected, connectionHealth, isPolling, lastMessage]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && instanceId && !isConnected) {
      connect(instanceId).catch(error => {
        console.error('Auto-connect failed:', error);
        setConnectionError(error.message);
      });
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, instanceId]); // Limited deps to prevent loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      eventHandlersRef.current.clear();
    };
  }, []);

  return {
    isConnected,
    connectionHealth,
    isPolling,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    reconnect,
    sendCommand,
    subscribe,
    unsubscribe,
    getConnectionStats,
    testConnection
  };
};
```

### Step 2: Updated Claude Instance Manager

```typescript
// src/components/ClaudeInstanceManagerHTTP.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useHTTPSSE } from '../hooks/useHTTPSSE';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
  uptime?: number;
}

interface ClaudeInstanceManagerProps {
  apiUrl?: string;
}

const ClaudeInstanceManagerHTTP: React.FC<ClaudeInstanceManagerProps> = ({ 
  apiUrl = 'http://localhost:3000' 
}) => {
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const outputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // HTTP/SSE connection for selected instance
  const {
    isConnected,
    connectionHealth,
    isPolling,
    connectionError,
    connect: connectHTTPSSE,
    disconnect: disconnectHTTPSSE,
    sendCommand,
    subscribe,
    unsubscribe,
    getConnectionStats
  } = useHTTPSSE({
    instanceId: selectedInstance || undefined,
    apiUrl,
    autoConnect: false, // Manual connection control
    enablePolling: true
  });

  // HTTP client for API calls
  const makeAPICall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', endpoint, error);
      throw error;
    }
  };

  // Fetch instances list
  const fetchInstances = async () => {
    try {
      const response = await makeAPICall('/api/v1/claude/instances');
      
      if (response.success) {
        const instanceList = response.instances.map((inst: any) => ({
          id: inst.id,
          name: inst.id.slice(0, 8),
          status: inst.status,
          pid: inst.pid,
          startTime: new Date(inst.startTime),
          uptime: inst.uptime
        }));
        
        setInstances(instanceList);
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    }
  };

  // Create new instance
  const createInstance = async (command: string) => {
    setLoading(true);
    
    try {
      const instanceConfig = getInstanceConfig(command);
      
      const response = await makeAPICall('/api/v1/claude/instances', {
        method: 'POST',
        body: JSON.stringify(instanceConfig)
      });
      
      if (response.success) {
        await fetchInstances();
        setSelectedInstance(response.instanceId);
        setOutput(prev => ({ ...prev, [response.instanceId]: '' }));
      }
    } catch (error) {
      console.error('Failed to create instance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Terminate instance
  const terminateInstance = async (instanceId: string) => {
    try {
      const response = await makeAPICall(`/api/v1/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        await fetchInstances();
        
        if (selectedInstance === instanceId) {
          setSelectedInstance(null);
          disconnectHTTPSSE();
        }
        
        // Clear output
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[instanceId];
          return newOutput;
        });
      }
    } catch (error) {
      console.error('Failed to terminate instance:', error);
    }
  };

  // Send terminal input
  const sendInput = async () => {
    if (!selectedInstance || !input.trim()) return;
    
    try {
      await sendCommand(input + '\n');
      setInput('');
    } catch (error) {
      console.error('Failed to send input:', error);
    }
  };

  // Handle instance selection
  const handleInstanceSelection = async (instanceId: string) => {
    // Disconnect from previous instance
    if (selectedInstance && selectedInstance !== instanceId) {
      disconnectHTTPSSE();
    }
    
    setSelectedInstance(instanceId);
    
    // Connect to new instance
    try {
      await connectHTTPSSE(instanceId);
    } catch (error) {
      console.error('Failed to connect to instance:', error);
    }
  };

  // Set up event handlers
  useEffect(() => {
    if (!selectedInstance) return;
    
    const handleTerminalOutput = (data: any) => {
      if (data.output) {
        setOutput(prev => ({
          ...prev,
          [selectedInstance]: (prev[selectedInstance] || '') + data.output
        }));
        
        // Auto-scroll
        if (outputRefs.current[selectedInstance]) {
          const ref = outputRefs.current[selectedInstance]!;
          ref.scrollTop = ref.scrollHeight;
        }
      }
    };
    
    const handleStatusUpdate = (data: any) => {
      setInstances(prev => prev.map(inst => 
        inst.id === selectedInstance 
          ? { ...inst, status: data.status }
          : inst
      ));
    };
    
    subscribe('terminal_output', handleTerminalOutput);
    subscribe('status_update', handleStatusUpdate);
    
    return () => {
      unsubscribe('terminal_output', handleTerminalOutput);
      unsubscribe('status_update', handleStatusUpdate);
    };
  }, [selectedInstance, subscribe, unsubscribe]);

  // Initial data fetch
  useEffect(() => {
    fetchInstances();
    
    // Set up periodic refresh
    const interval = setInterval(fetchInstances, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to parse instance config
  const getInstanceConfig = (command: string) => {
    if (command.includes('prod')) {
      return { 
        command: 'claude',
        workingDirectory: '/workspaces/agent-feed/prod',
        arguments: command.includes('skip-permissions') ? ['--dangerously-skip-permissions'] : []
      };
    }
    return { 
      command: 'claude',
      workingDirectory: '/workspaces/agent-feed'
    };
  };

  return (
    <div className="claude-instance-manager">
      <div className="header">
        <h2>Claude Instance Manager (HTTP/SSE)</h2>
        <div className="status">
          <div className="connection-status">
            <span className={`status-indicator ${connectionHealth}`}>
              {connectionHealth}
            </span>
            {isPolling && <span className="polling-indicator">📊 Polling</span>}
            {connectionError && <span className="error">{connectionError}</span>}
          </div>
          {instances.length > 0 && (
            <span className="count">
              Active: {instances.filter(i => i.status === 'running').length}/{instances.length}
            </span>
          )}
        </div>
      </div>

      <div className="controls">
        <div className="launch-buttons">
          <button 
            onClick={() => createInstance('claude --prod')} 
            disabled={loading}
            className="btn btn-prod"
          >
            🚀 prod/claude
          </button>
          <button 
            onClick={() => createInstance('claude --prod --dangerously-skip-permissions')} 
            disabled={loading}
            className="btn btn-skip-perms"
          >
            ⚡ skip-permissions
          </button>
        </div>
      </div>

      <div className="instances-grid">
        <div className="instances-list">
          <h3>Instances</h3>
          {instances.length === 0 ? (
            <p className="no-instances">No active instances. Launch one to get started!</p>
          ) : (
            <ul>
              {instances.map(instance => (
                <li 
                  key={instance.id}
                  className={`instance-item ${selectedInstance === instance.id ? 'selected' : ''} status-${instance.status}`}
                  onClick={() => handleInstanceSelection(instance.id)}
                >
                  <div className="instance-header">
                    <span className="instance-name">{instance.name}</span>
                    <span className={`instance-status ${instance.status}`}>
                      {instance.status}
                    </span>
                  </div>
                  <div className="instance-info">
                    <span className="instance-id">ID: {instance.id.slice(0, 8)}</span>
                    {instance.pid && <span className="instance-pid">PID: {instance.pid}</span>}
                    {instance.uptime && (
                      <span className="instance-uptime">
                        Up: {Math.floor(instance.uptime / 1000)}s
                      </span>
                    )}
                  </div>
                  <button 
                    className="btn-terminate"
                    onClick={(e) => {
                      e.stopPropagation();
                      terminateInstance(instance.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="instance-interaction">
          {selectedInstance ? (
            <>
              <div className="instance-header">
                <h3>Instance: {selectedInstance.slice(0, 8)}</h3>
                <div className="connection-details">
                  <span className={`connection-health ${connectionHealth}`}>
                    {connectionHealth.toUpperCase()}
                  </span>
                  {isConnected && (
                    <span className="connected-indicator">
                      {isPolling ? '📊 HTTP Polling' : '📡 SSE Connected'}
                    </span>
                  )}
                </div>
              </div>
              
              <div 
                className="output-area"
                ref={el => outputRefs.current[selectedInstance] = el}
              >
                <pre>{output[selectedInstance] || 'Waiting for output...'}</pre>
              </div>
              
              <div className="input-area">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendInput()}
                  placeholder="Type command and press Enter..."
                  className="input-field"
                />
                <button onClick={sendInput} className="btn-send">
                  Send
                </button>
              </div>
              
              <div className="debug-info">
                <details>
                  <summary>Connection Debug Info</summary>
                  <pre>{JSON.stringify(getConnectionStats(), null, 2)}</pre>
                </details>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an instance or launch a new one to interact with Claude</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaudeInstanceManagerHTTP;
```

### Step 3: Updated App.tsx Navigation

```typescript
// src/App.tsx - Modified sections
import ClaudeInstanceManagerHTTP from '@/components/ClaudeInstanceManagerHTTP';

// Update the route configuration
<Route path="/claude-instances" element={
  <RouteErrorBoundary routeName="ClaudeInstances">
    <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading Claude Instances..." />}>
      <ClaudeInstanceManagerHTTP />
    </Suspense>
  </RouteErrorBoundary>
} />

// Update navigation to highlight HTTP/SSE implementation
const navigation = React.useMemo(() => [
  { name: '🚀 Claude Instances (HTTP/SSE)', href: '/claude-instances', icon: Bot },
  { name: 'Claude Manager', href: '/dual-instance', icon: LayoutDashboard },
  // ... rest of navigation
], []);
```

## Testing Strategy

### Unit Tests for useHTTPSSE Hook

```typescript
// tests/hooks/useHTTPSSE.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHTTPSSE } from '../../src/hooks/useHTTPSSE';

// Mock EventSource
class MockEventSource {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = EventSource.CONNECTING;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 100);
  }
  
  close() {
    this.readyState = EventSource.CLOSED;
  }
  
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data)
      }));
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock fetch
const mockFetch = jest.fn();

beforeEach(() => {
  global.EventSource = MockEventSource as any;
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true })
  });
});

describe('useHTTPSSE', () => {
  test('should establish SSE connection automatically', async () => {
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: true
    }));
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionHealth).toBe('disconnected');
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionHealth).toBe('excellent');
    });
  });
  
  test('should handle SSE messages correctly', async () => {
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: true
    }));
    
    const messageHandler = jest.fn();
    
    act(() => {
      result.current.subscribe('terminal_output', messageHandler);
    });
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Simulate SSE message
    const mockEventSource = global.EventSource as any;
    const eventSourceInstance = new mockEventSource('');
    
    act(() => {
      eventSourceInstance.simulateMessage({
        type: 'terminal_output',
        output: 'test output',
        timestamp: new Date().toISOString()
      });
    });
    
    await waitFor(() => {
      expect(messageHandler).toHaveBeenCalledWith({
        type: 'terminal_output',
        output: 'test output',
        timestamp: expect.any(String)
      });
    });
  });
  
  test('should fallback to polling when SSE fails', async () => {
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: true,
      enablePolling: true,
      pollingInterval: 1000
    }));
    
    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Simulate SSE error
    const mockEventSource = global.EventSource as any;
    const eventSourceInstance = new mockEventSource('');
    
    act(() => {
      eventSourceInstance.simulateError();
    });
    
    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
      expect(result.current.connectionHealth).toBe('good');
    });
  });
  
  test('should send commands via HTTP POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, timestamp: new Date().toISOString() })
    });
    
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: false
    }));
    
    await act(async () => {
      await result.current.sendCommand('test command');
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/claude/instances/test-123/terminal/input',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ input: 'test command' })
      })
    );
  });
  
  test('should test connection latency', async () => {
    const startTime = Date.now();
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 50)
      )
    );
    
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123'
    }));
    
    const connectionTest = await act(async () => {
      return await result.current.testConnection();
    });
    
    expect(connectionTest.success).toBe(true);
    expect(connectionTest.latency).toBeGreaterThan(40);
    expect(connectionTest.latency).toBeLessThan(100);
  });
});
```

### Integration Tests

```typescript
// tests/integration/http-sse-integration.test.tsx
describe('HTTP/SSE Integration Tests', () => {
  test('should handle complete Claude instance workflow', async () => {
    render(<ClaudeInstanceManagerHTTP />);
    
    // Test instance creation
    const createButton = screen.getByText('🚀 prod/claude');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Instance:/)).toBeInTheDocument();
    });
    
    // Test terminal input
    const inputField = screen.getByPlaceholderText('Type command and press Enter...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(inputField, { target: { value: 'echo test' } });
    fireEvent.click(sendButton);
    
    // Verify command was sent
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/terminal/input'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
```

## Implementation Timeline

### Week 1: Core Hook Development
- Days 1-2: Implement useHTTPSSE hook with full SSE and polling support
- Days 3-4: Create comprehensive test suite for the hook
- Days 5-7: Integration testing and performance optimization

### Week 2: Component Updates
- Days 1-3: Convert ClaudeInstanceManager to use HTTP/SSE
- Days 4-5: Update remaining components and context providers
- Days 6-7: End-to-end testing and bug fixes

### Success Criteria
- ✅ SSE connections establish reliably
- ✅ Automatic fallback to polling when SSE fails  
- ✅ Real-time terminal output with < 100ms latency
- ✅ Robust error handling and reconnection
- ✅ All existing functionality preserved
- ✅ Improved connection stability vs WebSocket
- ✅ 95%+ test coverage for new components

This completes the frontend implementation plan for the WebSocket to HTTP/SSE conversion.