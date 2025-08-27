# SSE Connection Stability Research Report

## Executive Summary

This comprehensive research report analyzes Server-Sent Events (SSE) connection stability patterns, ECONNRESET prevention techniques, and identifies root causes for immediate connection drops after data transmission in Node.js backends with React frontends.

## Current Problem Pattern Analysis

### Observed Issue
- SSE connection established successfully 
- Data sent/received successfully
- Connection immediately drops with ECONNRESET
- Client must reconnect for next interaction

### Root Cause Analysis

Based on codebase examination and research, the primary issues are:

1. **Improper Response Lifecycle Management**: Missing proper cleanup of event listeners and response handling
2. **Lack of Keep-Alive Mechanisms**: No heartbeat/comment-based keep-alive implementation
3. **Connection Pool Issues**: ECONNRESET occurs when connections are forcibly closed without proper teardown
4. **Missing Error Recovery**: No exponential backoff or robust reconnection strategies

## ECONNRESET Root Causes in SSE Connections

### 1. Connection Pool Management Issues
- **Primary Cause**: When there's a "lull" and insufficient requests over the connection pool, servers send [FIN,ACK] for unused connections
- **Impact**: Next request on that socket triggers server RESET response
- **Solution**: Implement proper keep-alive mechanisms with regular heartbeats

### 2. Response Lifecycle Problems
- **Memory Leaks**: Event listeners not properly removed when connections close
- **Resource Cleanup**: Missing `req.on('close')` cleanup handlers
- **Premature res.end()**: Calling `res.end()` triggers client reconnection attempts

### 3. Message Format Issues
- **Missing Format Requirements**: Messages must use `data:` prefix and double newlines
- **Wrong Implementation**: `res.write(JSON.stringify(data))` vs correct `res.write(\`data: ${JSON.stringify(data)}\\n\\n\`)`

## EventSource Connection Persistence Patterns

### Best Practices Identified

1. **Keep-Alive Messages (Critical)**
   ```javascript
   // Send comment-based heartbeats every 30-60 seconds
   const keepAlive = () => {
     res.write(': heartbeat\\n\\n');
     setTimeout(keepAlive, 30000);
   };
   ```

2. **Proper SSE Headers**
   ```javascript
   res.writeHead(200, {
     'Content-Type': 'text/event-stream',
     'Cache-Control': 'no-cache',
     'Connection': 'keep-alive',
     'Access-Control-Allow-Origin': 'http://localhost:5173', // Specific origin for credentials
     'Access-Control-Allow-Credentials': 'true'
   });
   ```

3. **Connection Cleanup**
   ```javascript
   req.on('close', () => {
     console.log('Client disconnected');
     clearInterval(heartbeatInterval);
     // Remove from connection tracking
   });
   
   req.on('error', (err) => {
     console.error('SSE connection error:', err);
     clearInterval(heartbeatInterval);
   });
   ```

## Server-Side SSE Lifecycle Management

### Recommended Implementation Pattern

```javascript
function createSSEEndpoint(req, res, instanceId) {
  // 1. Set proper headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache', 
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': req.headers.origin,
    'Access-Control-Allow-Credentials': 'true'
  });

  // 2. Track connection
  if (!connections.has(instanceId)) {
    connections.set(instanceId, new Set());
  }
  connections.get(instanceId).add(res);

  // 3. Send initial connection message
  res.write(\`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    timestamp: new Date().toISOString()
  })}\\n\\n\`);

  // 4. Setup heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\\n\\n');
    } catch (error) {
      clearInterval(heartbeat);
      connections.get(instanceId)?.delete(res);
    }
  }, 30000);

  // 5. Handle disconnection
  req.on('close', () => {
    console.log(\`Client disconnected: ${instanceId}\`);
    clearInterval(heartbeat);
    connections.get(instanceId)?.delete(res);
  });

  req.on('error', (error) => {
    console.error('SSE error:', error);
    clearInterval(heartbeat);
    connections.get(instanceId)?.delete(res);
  });
}
```

## Connection Keepalive and Heartbeat Techniques

### Optimal Heartbeat Strategy

1. **Frequency**: 30-60 seconds (not 15 seconds - too frequent)
2. **Format**: Comment lines starting with `:` 
3. **Activity-Based**: Reset timer on each real message
4. **Timeout Detection**: Chrome times out after 2 minutes, Firefox varies

### Implementation Pattern
```javascript
let heartbeatTimer = null;

function resetHeartbeat() {
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(() => {
    res.write(': keepalive\\n\\n');
    resetHeartbeat(); // Schedule next heartbeat
  }, 30000);
}

function sendMessage(data) {
  res.write(\`data: ${JSON.stringify(data)}\\n\\n\`);
  resetHeartbeat(); // Reset timer after real message
}
```

## Client-Side Connection State Management

### React Hook Pattern with Exponential Backoff

```typescript
interface SSEConfig {
  url: string;
  maxReconnectAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export const useRobustSSE = (config: SSEConfig) => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateBackoffDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      config.baseDelay! * Math.pow(2, attempt),
      config.maxDelay!
    );
    return delay + Math.random() * 1000; // Add jitter
  }, [config]);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      const eventSource = new EventSource(config.url, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        console.log('SSE connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setConnectionState('error');
        eventSource.close();
        
        // Schedule reconnection with exponential backoff
        if (reconnectAttemptsRef.current < config.maxReconnectAttempts!) {
          const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      setConnectionState('error');
      console.error('Failed to create SSE connection:', error);
    }
  }, [config, calculateBackoffDelay]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    connectionState,
    lastMessage,
    reconnect: connect
  };
};
```

## CORS and SSE Connection Stability

### Critical CORS Configuration

1. **Wildcard Limitation**: Cannot use `Access-Control-Allow-Origin: *` with `withCredentials: true`
2. **Specific Origins Required**: Must specify exact origin for credential support
3. **Proper Headers**: Include `Access-Control-Allow-Credentials: true`

### Recommended CORS Setup
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Last-Event-ID']
}));
```

## Recommendations for Current Implementation

### Immediate Fixes for `/workspaces/agent-feed/simple-backend.js`

1. **Add Heartbeat Mechanism**
```javascript
// In createTerminalSSEStream function, add:
const heartbeatInterval = setInterval(() => {
  try {
    res.write(': heartbeat\\n\\n');
  } catch (error) {
    clearInterval(heartbeatInterval);
  }
}, 30000);

// Update cleanup:
req.on('close', () => {
  clearInterval(heartbeatInterval);
  // ... existing cleanup
});
```

2. **Fix Response Lifecycle**
```javascript
// Replace periodic updates with activity-based heartbeat
let lastActivityTime = Date.now();
const checkActivity = setInterval(() => {
  if (Date.now() - lastActivityTime > 25000) { // 25 seconds silence
    try {
      res.write(': keepalive\\n\\n');
    } catch (error) {
      clearInterval(checkActivity);
    }
  }
}, 30000);

// Update activity time on real messages
function sendMessage(data) {
  lastActivityTime = Date.now();
  res.write(\`data: ${JSON.stringify(data)}\\n\\n\`);
}
```

3. **Enhanced Error Handling**
```javascript
// Add error handler
req.on('error', (error) => {
  console.error(\`❌ SSE request error for \${instanceId}:\`, error);
  clearInterval(heartbeatInterval);
  
  // Clean up connections
  const connections = sseConnections.get(instanceId) || [];
  const index = connections.indexOf(res);
  if (index !== -1) {
    connections.splice(index, 1);
  }
});
```

### Frontend Improvements for `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.ts`

1. **Add Exponential Backoff**
```typescript
const reconnectWithBackoff = useCallback((instanceId: string) => {
  if (reconnectCount.current >= reconnectAttempts) return;
  
  const delay = calculateBackoffDelay(reconnectCount.current);
  reconnectTimeoutRef.current = setTimeout(() => {
    connectSSE(instanceId);
  }, delay);
}, [reconnectAttempts, calculateBackoffDelay, connectSSE]);
```

2. **Connection State Monitoring**
```typescript
// Add connection health monitoring
const [connectionHealth, setConnectionHealth] = useState<'healthy' | 'unstable' | 'failed'>('healthy');

// In EventSource onerror handler
eventSource.onerror = (error) => {
  console.warn('❌ SSE connection error, implementing backoff strategy');
  setConnectionHealth('unstable');
  
  // Close and cleanup
  eventSource.close();
  sseConnection.current = null;
  
  // Schedule reconnection with backoff
  reconnectWithBackoff(instanceId);
};
```

## Performance and Scalability Considerations

### Connection Limits
- **HTTP/1.1**: 6 connections per domain per browser
- **HTTP/2**: 100 connections per domain
- **Recommendation**: Use HTTP/2 for production deployments

### Memory Management
- Track active connections in Map/Set structures
- Clean up on disconnect to prevent memory leaks
- Implement connection pooling for high-scale scenarios

### Network Resilience
- Implement exponential backoff (1s, 2s, 4s, 8s, up to 64s max)
- Add jitter to prevent thundering herd
- Monitor connection health metrics

## Conclusion

The ECONNRESET issue stems from improper SSE lifecycle management and lack of keep-alive mechanisms. Implementation of heartbeat comments, proper error handling, exponential backoff reconnection, and correct CORS configuration will resolve the immediate connection drop problem and create persistent, stable SSE connections.

### Priority Implementation Order
1. **Server-side heartbeat mechanism** (highest priority)
2. **Proper connection cleanup handlers**
3. **Client-side exponential backoff**
4. **CORS configuration fixes**
5. **Connection health monitoring**

This research provides a comprehensive foundation for implementing robust SSE connections that maintain persistence across multiple interactions without drops.