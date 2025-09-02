# SPARC: WebSocket to SSE Migration - Interactive Control Tab Fix

## SPARC Phase 1: Specification ✅ COMPLETED

### Problem Statement
The Interactive Control tab (`ClaudeInstanceManagerComponent`) expects WebSocket connections but the backend only provides Server-Sent Events (SSE). This creates a connection mismatch preventing real-time terminal interaction.

### Current State Analysis
- **Backend**: Provides SSE endpoints at `/api/v1/claude/instances/{instanceId}/terminal/stream`
- **Frontend**: ClaudeInstanceManagerComponent uses ClaudeInstanceManager expecting WebSocket at `/ws/claude/{instanceId}`
- **Working Implementation**: ClaudeInstanceManager.tsx already uses useHTTPSSE hook successfully
- **Gap**: Interactive Control tab hasn't been migrated to SSE pattern

### Success Criteria
1. ✅ Convert ClaudeInstanceManagerComponent from WebSocket to EventSource (SSE)
2. ✅ Maintain real-time terminal interaction functionality
3. ✅ Implement proper error handling and reconnection logic
4. ✅ Ensure compatibility with existing backend SSE endpoints
5. ✅ Comprehensive test coverage with TDD approach
6. ✅ NLD pattern integration for failure prevention

## SPARC Phase 2: Pseudocode Design 🔄 IN PROGRESS

### Core Architecture Transformation

```pseudocode
// OLD PATTERN (WebSocket-based)
CLASS ClaudeInstanceManager {
  FIELD connectionManager: SingleConnectionManager  // WebSocket-based
  
  METHOD connectToInstance(instanceId) {
    websocketUrl = "/ws/claude/" + instanceId
    connectionManager.connect(websocketUrl)
  }
  
  METHOD sendCommand(command) {
    connectionManager.sendData("terminal:input", command)
  }
}

// NEW PATTERN (EventSource/SSE-based)  
CLASS ClaudeInstanceManager {
  FIELD sseManager: SSEConnectionManager  // EventSource-based
  
  METHOD connectToInstance(instanceId) {
    sseUrl = "/api/v1/claude/instances/" + instanceId + "/terminal/stream"
    sseManager.connectEventSource(sseUrl)
  }
  
  METHOD sendCommand(command) {
    httpEndpoint = "/api/v1/claude/instances/" + instanceId + "/terminal/input"
    sseManager.sendHTTPRequest(httpEndpoint, command)
  }
}
```

### Event Flow Architecture

```pseudocode
// SSE Connection Pattern
CLASS SSEConnectionManager {
  FIELD eventSource: EventSource | null
  FIELD instanceId: string | null
  FIELD reconnectAttempts: number
  FIELD eventListeners: Map<string, Function[]>
  
  METHOD connectEventSource(sseUrl, instanceId) {
    // Validate instance ID format
    IF NOT instanceId.matches(/^claude-[a-zA-Z0-9]+$/) THEN
      THROW "Invalid instance ID format"
    
    // Clean up existing connection
    IF eventSource != null THEN
      eventSource.close()
    
    // Create new EventSource connection
    eventSource = NEW EventSource(sseUrl)
    this.instanceId = instanceId
    
    // Setup event handlers
    eventSource.onopen = LAMBDA {
      reconnectAttempts = 0
      EMIT("connect", {instanceId, connectionType: "sse"})
    }
    
    eventSource.onmessage = LAMBDA (event) {
      data = JSON.parse(event.data)
      
      // Route messages based on type
      SWITCH data.type {
        CASE "output":
          IF data.isReal THEN
            EMIT("terminal:output", {
              output: data.data,
              instanceId: data.instanceId || instanceId,
              isReal: true
            })
          
        CASE "instance:status":
          EMIT("instance:status", {
            instanceId: data.instanceId,
            status: data.status
          })
          
        CASE "heartbeat":
          // Update last activity timestamp
          
        DEFAULT:
          EMIT("message", data)
      }
    }
    
    eventSource.onerror = LAMBDA (error) {
      IF reconnectAttempts < MAX_RECONNECT_ATTEMPTS THEN
        reconnectAttempts++
        DELAY(calculateBackoffDelay(reconnectAttempts))
        connectEventSource(sseUrl, instanceId)  // Recursive reconnect
      ELSE
        EMIT("error", "Max reconnection attempts reached")
      }
    }
  }
  
  METHOD sendHTTPRequest(endpoint, command) {
    // Send command via HTTP POST (not SSE)
    response = FETCH(endpoint, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({input: command + "\n"})
    })
    
    IF NOT response.ok THEN
      THROW "Failed to send command: " + response.statusText
  }
  
  METHOD disconnect() {
    IF eventSource != null THEN
      eventSource.close()
      eventSource = null
      instanceId = null
      EMIT("disconnect")
  }
}
```

### Component Integration Pattern

```pseudocode
// Updated ClaudeInstanceManagerComponent
COMPONENT ClaudeInstanceManagerComponent {
  STATE selectedInstanceId: string | null
  STATE connectionStatus: ConnectionStatus
  STATE output: InstanceOutputMessage[]
  STATE sseManager: SSEConnectionManager
  
  EFFECT onMount() {
    sseManager = NEW SSEConnectionManager()
    
    // Setup event handlers
    sseManager.on("connect", LAMBDA (data) {
      setConnectionStatus({
        isConnected: true,
        instanceId: data.instanceId,
        connectionType: data.connectionType
      })
    })
    
    sseManager.on("terminal:output", LAMBDA (data) {
      IF data.instanceId == selectedInstanceId THEN
        addOutputMessage({
          id: generateId(),
          instanceId: data.instanceId,
          type: "output",
          content: data.output,
          timestamp: NEW Date(),
          isReal: data.isReal
        })
    })
    
    sseManager.on("instance:status", LAMBDA (data) {
      updateInstanceStatus(data.instanceId, data.status)
    })
    
    sseManager.on("error", LAMBDA (error) {
      setConnectionStatus({isConnected: false, error: error.message})
    })
    
    CLEANUP: sseManager.disconnect()
  }
  
  METHOD connectToInstance(instanceId) {
    // Validate instance first
    instanceData = AWAIT validateInstance(instanceId)
    IF NOT instanceData OR instanceData.status != "running" THEN
      THROW "Instance not running or doesn't exist"
    
    // Connect via SSE
    sseUrl = "/api/v1/claude/instances/" + instanceId + "/terminal/stream"
    sseManager.connectEventSource(sseUrl, instanceId)
    setSelectedInstanceId(instanceId)
  }
  
  METHOD sendCommand(command) {
    IF NOT selectedInstanceId THEN
      THROW "No instance selected"
    
    inputEndpoint = "/api/v1/claude/instances/" + selectedInstanceId + "/terminal/input"
    AWAIT sseManager.sendHTTPRequest(inputEndpoint, command)
    
    // Add input to output display immediately
    addOutputMessage({
      id: generateId(),
      instanceId: selectedInstanceId,
      type: "input",
      content: "> " + command + "\n",
      timestamp: NEW Date(),
      isReal: true
    })
  }
}
```

## SPARC Phase 3: Architecture Design (PENDING)

### Component Architecture
- **SSEConnectionManager**: Replace SingleConnectionManager with EventSource-based implementation
- **Event Pattern Mapping**: Map WebSocket events to SSE message types
- **Reconnection Logic**: Exponential backoff with intelligent retry
- **Error Recovery**: Graceful fallback and user feedback

### Integration Points
- Backend SSE endpoints (already implemented)
- Frontend component event system
- Error handling and monitoring
- Performance optimization

## SPARC Phase 4: TDD Refinement (PENDING)

### Test Strategy
1. Unit tests for SSEConnectionManager
2. Integration tests for component communication
3. Playwright E2E tests for terminal interaction
4. NLD pattern validation tests
5. Performance and reliability tests

## SPARC Phase 5: Integration & Completion (PENDING)

### Deployment Checklist
- [ ] SSE connection stability validation
- [ ] Real-time performance testing
- [ ] Error scenario coverage
- [ ] User experience validation
- [ ] Production deployment verification

## Next Steps
1. Complete SSEConnectionManager implementation
2. Update ClaudeInstanceManagerComponent to use SSE
3. Implement comprehensive test suite
4. Integrate NLD patterns
5. Performance validation and optimization