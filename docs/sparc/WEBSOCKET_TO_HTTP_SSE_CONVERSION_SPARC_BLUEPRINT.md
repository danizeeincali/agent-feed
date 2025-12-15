# SPARC Architecture Blueprint: WebSocket to HTTP/SSE Conversion

## Executive Summary

This document outlines a comprehensive SPARC methodology plan to convert the entire agent-feed system from WebSocket-based real-time communication to HTTP/SSE (Server-Sent Events) for VPS deployment. The current system suffers from WebSocket connection storms and instability, while HTTP/SSE implementations are working reliably.

**Target Outcome**: A stable, production-ready single-user VPS deployment using HTTP endpoints and Server-Sent Events for all real-time features, with complete removal of Socket.IO dependencies.

---

## SPARC Phase 1: SPECIFICATION

### 1.1 Requirements Analysis

#### Current System Analysis
- **WebSocket Dependencies**: 20+ files using Socket.IO, native WebSocket
- **Connection Storm Issue**: Multiple connection attempts causing server overload
- **Stability Problems**: RSV1 frame errors, compression conflicts, transport upgrade failures
- **Working Components**: HTTP endpoints and SSE streams are functioning correctly

#### Functional Requirements
1. **Real-time Features to Preserve**:
   - Terminal output streaming for Claude instances
   - Process status updates (start/stop/restart)
   - Live notifications and alerts
   - Token usage analytics
   - Agent status monitoring
   - Feed updates and comments

2. **Performance Requirements**:
   - Single-user VPS deployment (no multi-user scaling needed)
   - Terminal output latency < 100ms
   - Process status updates in real-time
   - Polling fallback for compatibility

3. **Reliability Requirements**:
   - No connection storms
   - Graceful degradation when SSE unavailable
   - Automatic reconnection for SSE streams
   - Error recovery mechanisms

#### Non-Functional Requirements
1. **Deployment**: Single VPS, internal use only
2. **Security**: Basic authentication, no public access
3. **Maintenance**: Simplified architecture, fewer moving parts
4. **Monitoring**: Built-in health checks and diagnostics

### 1.2 Migration Scope

#### Files Requiring Modification
```
Frontend (React/TypeScript):
├── src/hooks/useWebSocket.ts                    [CRITICAL - Core hook]
├── src/components/ClaudeInstanceManager.tsx     [HIGH - Main UI]
├── src/components/RobustWebSocketProvider.tsx   [CRITICAL - Context]
├── src/App.tsx                                  [MEDIUM - Navigation]
├── src/context/WebSocketSingletonContext.tsx   [HIGH - Global state]
└── 15+ other components using WebSocket

Backend (Node.js/Express):
├── src/api/server.ts                           [CRITICAL - Main server]
├── src/services/claude-instance-terminal-websocket.ts [HIGH - Terminal]
├── src/services/terminal-streaming-service.ts  [HIGH - Streaming]
├── src/api/routes/claude-instances.js          [MEDIUM - Routes]
└── 10+ WebSocket handlers and services
```

#### Dependencies to Remove
- `socket.io` and `socket.io-client`
- Custom WebSocket implementations
- Connection pooling utilities
- Transport upgrade logic

#### New Components to Implement
- HTTP polling services
- SSE connection managers
- Fallback mechanisms
- Health monitoring for HTTP/SSE

---

## SPARC Phase 2: PSEUDOCODE

### 2.1 Conversion Strategy Algorithm

```pseudocode
MAIN_CONVERSION_ALGORITHM:
  PHASE_1: Backend HTTP/SSE Infrastructure
    CREATE HTTP endpoints for all WebSocket events
    IMPLEMENT SSE streams for real-time data
    ADD polling fallbacks for compatibility
    SET UP health monitoring

  PHASE_2: Frontend HTTP Client
    REPLACE WebSocket hook with HTTP/SSE hook
    UPDATE all components to use new hook
    IMPLEMENT automatic fallback logic
    ADD reconnection mechanisms

  PHASE_3: Data Flow Conversion
    MAP WebSocket events to HTTP endpoints
    CONVERT real-time streams to SSE
    IMPLEMENT request/response patterns
    ADD caching for performance

  PHASE_4: Testing & Validation
    TEST each converted component
    VALIDATE real-time functionality
    PERFORMANCE test under load
    REGRESSION test existing features

  PHASE_5: Cleanup & Optimization
    REMOVE all WebSocket dependencies
    OPTIMIZE HTTP/SSE performance
    ADD comprehensive monitoring
    DOCUMENT new architecture
```

### 2.2 Core Conversion Algorithms

#### HTTP/SSE Hook Algorithm
```pseudocode
HTTP_SSE_HOOK_ALGORITHM:
  INITIALIZE:
    httpClient = new HTTPClient(baseURL)
    sseConnection = null
    reconnectAttempts = 0
    eventHandlers = new Map()

  CONNECT(instanceId):
    // Establish SSE connection for real-time updates
    sseConnection = new EventSource(`/api/v1/claude/instances/${instanceId}/stream`)
    
    sseConnection.onopen = () => {
      setConnectionStatus('connected')
      reconnectAttempts = 0
    }
    
    sseConnection.onmessage = (event) => {
      data = JSON.parse(event.data)
      TRIGGER_EVENT_HANDLERS(data.type, data)
    }
    
    sseConnection.onerror = () => {
      HANDLE_CONNECTION_ERROR()
      ATTEMPT_RECONNECTION()
    }

  EMIT(event, data):
    // Convert WebSocket emit to HTTP POST
    endpoint = MAP_EVENT_TO_ENDPOINT(event)
    httpClient.post(endpoint, data)

  SUBSCRIBE(event, handler):
    // Store handler for SSE events
    eventHandlers.set(event, handler)

  FALLBACK_POLLING():
    // Implement polling as fallback
    setInterval(() => {
      httpClient.get('/api/v1/status/poll')
        .then(data => PROCESS_POLLING_DATA(data))
    }, 2000)
```

#### Terminal Streaming Algorithm
```pseudocode
TERMINAL_STREAMING_ALGORITHM:
  // Backend SSE endpoint
  ENDPOINT /api/v1/claude/instances/:id/terminal/stream:
    response.headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
    
    // Connect to terminal process
    terminalProcess = getTerminalProcess(instanceId)
    
    terminalProcess.on('data', (output) => {
      sseData = {
        type: 'terminal_output',
        output: output,
        timestamp: Date.now()
      }
      response.write(`data: ${JSON.stringify(sseData)}\n\n`)
    })
    
    // Keep-alive mechanism
    keepAliveInterval = setInterval(() => {
      response.write(`data: ${JSON.stringify({type: 'ping'})}\n\n`)
    }, 30000)
    
    // Cleanup on disconnect
    request.on('close', () => {
      clearInterval(keepAliveInterval)
      terminalProcess.removeListeners()
    })

  // Frontend consumption
  FRONTEND_TERMINAL_CONSUMER:
    eventSource = new EventSource('/api/v1/claude/instances/123/terminal/stream')
    
    eventSource.onmessage = (event) => {
      data = JSON.parse(event.data)
      if (data.type === 'terminal_output') {
        updateTerminalDisplay(data.output)
      }
    }
```

---

## SPARC Phase 3: ARCHITECTURE

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS Deployment Architecture              │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)                                           │
│  ├── HTTP Client Service                                    │
│  ├── SSE Connection Manager                                 │
│  ├── Polling Fallback Service                              │
│  └── Connection Health Monitor                             │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express)                                          │
│  ├── HTTP API Endpoints                                     │
│  │   ├── /api/v1/claude/instances                          │
│  │   ├── /api/v1/terminal/input                            │
│  │   └── /api/v1/status/poll                               │
│  ├── SSE Streaming Endpoints                               │
│  │   ├── /api/v1/claude/instances/:id/stream               │
│  │   └── /api/v1/claude/terminal/:pid/stream               │
│  ├── Process Management                                     │
│  └── Health Monitoring                                     │
├─────────────────────────────────────────────────────────────┤
│  Claude Instances                                           │
│  └── Terminal Processes (PTY)                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

#### Frontend Architecture
```typescript
// New HTTP/SSE Hook Interface
interface HTTPSSEHook {
  // Connection management
  connect(instanceId: string): Promise<void>
  disconnect(): void
  isConnected: boolean
  connectionHealth: 'excellent' | 'good' | 'poor' | 'disconnected'
  
  // Communication methods
  sendCommand(command: string, data?: any): Promise<any>
  subscribe(event: string, handler: EventHandler): void
  unsubscribe(event: string, handler?: EventHandler): void
  
  // Fallback mechanisms
  enablePolling(): void
  disablePolling(): void
  getLastData(): any
}

// Connection Management Service
class HTTPSSEConnectionManager {
  private sseConnection: EventSource | null = null
  private httpClient: HTTPClient
  private pollingInterval: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private eventHandlers = new Map<string, Set<EventHandler>>()
  
  async connect(instanceId: string): Promise<void>
  disconnect(): void
  private handleSSEReconnect(): void
  private startPollingFallback(): void
  private stopPollingFallback(): void
}
```

#### Backend Architecture
```typescript
// SSE Stream Manager
class SSEStreamManager {
  private connections = new Map<string, Response>()
  private processStreams = new Map<string, NodeJS.ReadableStream>()
  
  createStream(instanceId: string, res: Response): void
  broadcastToStream(instanceId: string, data: any): void
  closeStream(instanceId: string): void
  getActiveStreams(): string[]
}

// HTTP Endpoint Controller
class HTTPEndpointController {
  // Instance management
  async createInstance(req: Request, res: Response): Promise<void>
  async terminateInstance(req: Request, res: Response): Promise<void>
  async getInstanceStatus(req: Request, res: Response): Promise<void>
  
  // Terminal interaction
  async sendTerminalInput(req: Request, res: Response): Promise<void>
  async getTerminalOutput(req: Request, res: Response): Promise<void>
  
  // Health and polling
  async healthCheck(req: Request, res: Response): Promise<void>
  async pollStatus(req: Request, res: Response): Promise<void>
}
```

### 3.3 Data Flow Architecture

#### Real-time Communication Patterns

1. **Terminal Output Streaming**
   ```
   Terminal Process → SSE Stream → Frontend Display
   ├── Primary: SSE connection for real-time output
   └── Fallback: HTTP polling every 2 seconds
   ```

2. **Command Input Flow**
   ```
   Frontend Input → HTTP POST → Terminal Process
   └── Immediate HTTP response with confirmation
   ```

3. **Process Status Updates**
   ```
   Process Events → SSE Broadcast → All Connected Clients
   ├── Process start/stop events
   ├── Health status changes
   └── Error notifications
   ```

#### Event Mapping Strategy

| WebSocket Event | HTTP Endpoint | SSE Event |
|----------------|---------------|-----------|
| `terminal:input` | `POST /api/v1/terminal/input` | - |
| `terminal:output` | - | `terminal_output` |
| `process:launch` | `POST /api/v1/claude/instances` | `process_started` |
| `process:kill` | `DELETE /api/v1/claude/instances/:id` | `process_stopped` |
| `process:status` | `GET /api/v1/claude/instances/:id` | `status_update` |
| `notification` | - | `notification` |

---

## SPARC Phase 4: REFINEMENT (TDD Implementation)

### 4.1 Test-Driven Development Strategy

#### Test Categories
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: HTTP/SSE communication flows
3. **E2E Tests**: Full user workflow validation
4. **Performance Tests**: Load and latency validation
5. **Regression Tests**: Existing feature preservation

#### TDD Implementation Phases

##### Phase 4.1: Backend HTTP/SSE Services
```typescript
// Test Suite: HTTP Endpoint Tests
describe('HTTPEndpointController', () => {
  test('should create Claude instance via HTTP POST', async () => {
    const response = await request(app)
      .post('/api/v1/claude/instances')
      .send({ command: 'claude --prod' })
      .expect(201)
    
    expect(response.body).toMatchObject({
      success: true,
      instanceId: expect.stringMatching(/^claude-\d+$/),
      pid: expect.any(Number)
    })
  })
  
  test('should stream terminal output via SSE', async () => {
    const instanceId = 'test-instance-123'
    const sseClient = new EventSource(`/api/v1/claude/instances/${instanceId}/stream`)
    
    const messagePromise = new Promise((resolve) => {
      sseClient.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'terminal_output') {
          resolve(data.output)
        }
      }
    })
    
    // Trigger terminal output
    await request(app)
      .post('/api/v1/terminal/input')
      .send({ input: 'echo test', instanceId })
    
    const output = await messagePromise
    expect(output).toContain('test')
  })
})
```

##### Phase 4.2: Frontend HTTP/SSE Hook Tests
```typescript
// Test Suite: useHTTPSSE Hook
describe('useHTTPSSE', () => {
  test('should establish SSE connection and receive events', async () => {
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: true
    }))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
    
    // Test event subscription
    const eventHandler = jest.fn()
    result.current.subscribe('terminal:output', eventHandler)
    
    // Simulate SSE event
    mockSSEServer.emit('terminal:output', { output: 'test output' })
    
    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalledWith({
        output: 'test output'
      })
    })
  })
  
  test('should fallback to polling when SSE fails', async () => {
    mockSSEServer.simulateConnectionError()
    
    const { result } = renderHook(() => useHTTPSSE({
      instanceId: 'test-123',
      autoConnect: true,
      enablePollingFallback: true
    }))
    
    await waitFor(() => {
      expect(result.current.connectionHealth).toBe('poor')
      expect(result.current.isPolling).toBe(true)
    })
  })
})
```

##### Phase 4.3: Integration Tests
```typescript
// Test Suite: End-to-End Terminal Workflow
describe('Terminal Integration', () => {
  test('should handle complete terminal workflow via HTTP/SSE', async () => {
    // 1. Create instance
    const createResponse = await apiClient.post('/api/v1/claude/instances', {
      command: 'claude --test'
    })
    const instanceId = createResponse.data.instanceId
    
    // 2. Connect to SSE stream
    const sseStream = new EventSource(`/api/v1/claude/instances/${instanceId}/stream`)
    const outputPromise = collectSSEOutput(sseStream, 5000)
    
    // 3. Send terminal command
    await apiClient.post('/api/v1/terminal/input', {
      input: 'echo "Hello HTTP/SSE"\n',
      instanceId
    })
    
    // 4. Verify output received
    const output = await outputPromise
    expect(output).toContain('Hello HTTP/SSE')
    
    // 5. Cleanup
    sseStream.close()
    await apiClient.delete(`/api/v1/claude/instances/${instanceId}`)
  })
})
```

### 4.2 Performance Testing Strategy

```typescript
// Load Testing for HTTP/SSE
describe('Performance Tests', () => {
  test('should handle concurrent SSE connections', async () => {
    const connections = Array.from({ length: 10 }, (_, i) => 
      new EventSource(`/api/v1/claude/instances/test-${i}/stream`)
    )
    
    const startTime = Date.now()
    
    // Wait for all connections to establish
    await Promise.all(connections.map(conn => 
      waitForSSEConnection(conn)
    ))
    
    const connectionTime = Date.now() - startTime
    expect(connectionTime).toBeLessThan(1000) // < 1 second for 10 connections
    
    // Cleanup
    connections.forEach(conn => conn.close())
  })
  
  test('should maintain low latency for terminal output', async () => {
    const sseStream = new EventSource('/api/v1/claude/instances/test/stream')
    
    const timestamps = []
    sseStream.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'terminal_output') {
        timestamps.push({
          sent: data.timestamp,
          received: Date.now()
        })
      }
    }
    
    // Send multiple commands
    for (let i = 0; i < 5; i++) {
      await apiClient.post('/api/v1/terminal/input', {
        input: `echo "Command ${i}"\n`,
        instanceId: 'test'
      })
      await sleep(100)
    }
    
    await sleep(1000) // Wait for all output
    
    const latencies = timestamps.map(t => t.received - t.sent)
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    
    expect(avgLatency).toBeLessThan(100) // < 100ms average latency
  })
})
```

---

## SPARC Phase 5: COMPLETION

### 5.1 Migration Execution Plan

#### Week 1: Backend Infrastructure
```bash
# Day 1-2: HTTP Endpoints Implementation
- Implement all HTTP endpoints for Claude instance management
- Create SSE streaming endpoints for real-time data
- Add polling fallback endpoints
- Write comprehensive tests for HTTP layer

# Day 3-4: Process Integration
- Connect HTTP endpoints to existing process management
- Implement SSE broadcasting for process events
- Add health monitoring for HTTP/SSE services
- Test integration with actual Claude processes

# Day 5-7: Testing & Optimization
- Performance testing of HTTP/SSE implementation
- Load testing with multiple concurrent connections
- Optimization based on test results
- Documentation of backend changes
```

#### Week 2: Frontend Conversion
```bash
# Day 1-3: Core Hook Implementation
- Replace useWebSocket with useHTTPSSE hook
- Implement connection management and fallbacks
- Add automatic reconnection logic
- Create comprehensive test suite

# Day 4-5: Component Updates
- Update ClaudeInstanceManager to use HTTP/SSE
- Convert all WebSocket-dependent components
- Update context providers and global state
- Test individual component functionality

# Day 6-7: Integration & Polish
- End-to-end testing of complete workflow
- Performance optimization
- UI/UX improvements for connection status
- Error handling and user feedback
```

#### Week 3: Validation & Deployment
```bash
# Day 1-3: Comprehensive Testing
- Full regression testing suite
- Performance validation under load
- User acceptance testing
- Security audit of new endpoints

# Day 4-5: Cleanup & Documentation
- Remove all WebSocket dependencies
- Clean up unused code and configurations
- Update deployment scripts
- Create migration documentation

# Day 6-7: Production Deployment
- Deploy to VPS environment
- Monitor system performance
- Validate all functionality in production
- Create rollback plan if needed
```

### 5.2 Risk Mitigation Strategies

#### High-Risk Areas
1. **Data Loss During Streaming**: Implement buffer management and reconnection
2. **Performance Degradation**: Extensive load testing and optimization
3. **Connection Reliability**: Multiple fallback mechanisms
4. **State Synchronization**: Careful event ordering and deduplication

#### Rollback Strategy
```bash
# Emergency Rollback Process
1. Revert to previous Git commit with WebSocket implementation
2. Restart services with original configuration
3. Validate system functionality
4. Investigate and document issues for retry

# Partial Rollback Options
- Disable HTTP/SSE for specific components while keeping others
- Use feature flags to toggle between WebSocket and HTTP/SSE
- Gradual migration with both systems running in parallel
```

### 5.3 Success Metrics

#### Technical Metrics
- **Connection Reliability**: > 99.5% uptime
- **Terminal Latency**: < 100ms average
- **Memory Usage**: < 512MB total (reduction from WebSocket overhead)
- **CPU Usage**: < 25% under normal load
- **Error Rate**: < 0.1% of requests

#### User Experience Metrics
- **Terminal Responsiveness**: No noticeable delays
- **Connection Recovery**: Automatic within 5 seconds
- **Data Consistency**: 100% command/output matching
- **System Stability**: No crashes or freezes

---

## Implementation Timeline

### Phase Schedule
```
Phase 1 (Specification): Week 1, Days 1-2
Phase 2 (Pseudocode): Week 1, Days 2-3
Phase 3 (Architecture): Week 1, Days 3-5
Phase 4 (Refinement): Week 1-2, Ongoing TDD
Phase 5 (Completion): Week 2-3, Full implementation
```

### Dependencies and Prerequisites
- Node.js environment with Express.js
- React frontend with TypeScript
- Existing Claude process management
- Test infrastructure (Jest, Playwright)
- VPS deployment environment

### Resource Requirements
- 1 Senior Full-Stack Developer
- 1 DevOps Engineer (for deployment)
- Testing environment matching production
- Monitoring and logging infrastructure

---

## Conclusion

This SPARC blueprint provides a comprehensive roadmap for converting the agent-feed system from WebSocket to HTTP/SSE architecture. The approach ensures:

1. **Systematic Conversion**: Each phase builds upon the previous
2. **Risk Mitigation**: Comprehensive testing and fallback mechanisms
3. **Performance Optimization**: Focused on single-user VPS deployment
4. **Maintainability**: Simplified architecture with fewer dependencies

The result will be a stable, reliable system optimized for VPS deployment with HTTP/SSE providing all necessary real-time functionality without the complexity and instability of WebSocket connections.