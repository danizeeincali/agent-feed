# SPARC Phase 2: SSE Connection Pseudocode Algorithms

## Core Algorithm Design

### 1. Connection State Management Algorithm

```pseudocode
ALGORITHM: SSEConnectionManager
INPUT: instanceId, apiUrl, options
OUTPUT: stableConnection

STATE VARIABLES:
  connectionState = { status: 'disconnected', retryCount: 0, lastError: null }
  eventSource = null
  reconnectTimer = null
  healthCheckInterval = null
  messageBuffer = []

FUNCTION initializeConnection(instanceId):
  // Reset connection state
  connectionState.status = 'connecting'
  connectionState.retryCount = 0
  connectionState.lastError = null
  
  // Cleanup existing connections
  IF eventSource != null THEN
    eventSource.close()
    eventSource = null
  END IF
  
  // Create new EventSource with proper error handling
  TRY
    eventSource = new EventSource(apiUrl + '/api/claude/instances/' + instanceId + '/terminal/stream')
    
    // Setup event handlers
    setupEventHandlers(eventSource, instanceId)
    
    // Start health monitoring
    startHealthMonitoring(instanceId)
    
    RETURN true
  CATCH error
    handleConnectionError(error, instanceId)
    RETURN false
  END TRY
END FUNCTION
```

### 2. Error Recovery Algorithm

```pseudocode
ALGORITHM: ErrorRecoveryManager
INPUT: error, instanceId, currentRetryCount
OUTPUT: recoveryAction

FUNCTION handleConnectionError(error, instanceId):
  connectionState.lastError = error
  connectionState.status = 'error'
  
  // Log error details
  logError("SSE Connection Error", error, instanceId)
  
  // Determine recovery strategy based on error type
  SWITCH error.type:
    CASE 'ECONNRESET':
      RETURN attemptReconnection(instanceId, 'immediate')
    
    CASE 'NetworkError':
      RETURN attemptReconnection(instanceId, 'exponential_backoff')
    
    CASE 'SecurityError':
      RETURN fallbackToPolling(instanceId)
    
    DEFAULT:
      RETURN attemptReconnection(instanceId, 'exponential_backoff')
  END SWITCH
END FUNCTION

FUNCTION attemptReconnection(instanceId, strategy):
  IF connectionState.retryCount >= MAX_RETRY_ATTEMPTS THEN
    RETURN fallbackToPolling(instanceId)
  END IF
  
  connectionState.retryCount++
  
  delay = calculateBackoffDelay(connectionState.retryCount, strategy)
  
  // Schedule reconnection attempt
  reconnectTimer = setTimeout(() => {
    initializeConnection(instanceId)
  }, delay)
  
  // Notify user of reconnection attempt
  notifyUser("Reconnecting to instance " + instanceId + " (attempt " + connectionState.retryCount + ")")
END FUNCTION

FUNCTION calculateBackoffDelay(retryCount, strategy):
  SWITCH strategy:
    CASE 'immediate':
      RETURN 100  // 100ms
    
    CASE 'exponential_backoff':
      baseDelay = 1000  // 1 second
      jitter = random(0, 1000)  // Add randomization
      RETURN min(baseDelay * pow(2, retryCount - 1) + jitter, MAX_BACKOFF_DELAY)
    
    DEFAULT:
      RETURN 1000
  END SWITCH
END FUNCTION
```

### 3. Session State Preservation Algorithm

```pseudocode
ALGORITHM: SessionStateManager
INPUT: instanceId, sessionData
OUTPUT: persistedState

STATE VARIABLES:
  sessionStore = Map<instanceId, SessionState>
  
STRUCT SessionState:
  outputBuffer: string
  inputHistory: string[]
  connectionMetadata: Object
  lastActiveTimestamp: timestamp

FUNCTION preserveSessionState(instanceId, data):
  IF NOT sessionStore.has(instanceId) THEN
    sessionStore.set(instanceId, createNewSession())
  END IF
  
  session = sessionStore.get(instanceId)
  
  // Update session with new data
  SWITCH data.type:
    CASE 'terminal_output':
      session.outputBuffer += data.content
      
    CASE 'user_input':
      session.inputHistory.push(data.content)
      
    CASE 'connection_metadata':
      session.connectionMetadata = merge(session.connectionMetadata, data)
  END SWITCH
  
  session.lastActiveTimestamp = getCurrentTimestamp()
  sessionStore.set(instanceId, session)
END FUNCTION

FUNCTION restoreSessionState(instanceId):
  IF sessionStore.has(instanceId) THEN
    session = sessionStore.get(instanceId)
    
    // Restore UI state
    displayOutputBuffer(session.outputBuffer)
    populateInputHistory(session.inputHistory)
    
    // Validate session freshness
    IF getCurrentTimestamp() - session.lastActiveTimestamp > SESSION_TIMEOUT THEN
      // Session expired, start fresh
      clearSessionState(instanceId)
      RETURN false
    END IF
    
    RETURN true
  ELSE
    RETURN false
  END IF
END FUNCTION
```

### 4. Connection Health Monitoring Algorithm

```pseudocode
ALGORITHM: ConnectionHealthMonitor
INPUT: instanceId, connection
OUTPUT: healthStatus

FUNCTION startHealthMonitoring(instanceId):
  healthCheckInterval = setInterval(() => {
    performHealthCheck(instanceId)
  }, HEALTH_CHECK_INTERVAL)
END FUNCTION

FUNCTION performHealthCheck(instanceId):
  currentTime = getCurrentTimestamp()
  
  // Check connection readiness
  IF eventSource.readyState == EventSource.CLOSED THEN
    handleConnectionError(new Error("Connection closed"), instanceId)
    RETURN
  END IF
  
  // Check for message timeout
  IF currentTime - lastMessageTimestamp > MESSAGE_TIMEOUT THEN
    // Send heartbeat to test connection
    sendHeartbeat(instanceId)
  END IF
  
  // Update connection metrics
  updateConnectionMetrics(instanceId, {
    status: connectionState.status,
    uptime: currentTime - connectionStartTime,
    messageCount: totalMessageCount,
    errorCount: totalErrorCount
  })
END FUNCTION

FUNCTION sendHeartbeat(instanceId):
  TRY
    // Send heartbeat via HTTP to test backend connectivity
    response = httpRequest('GET', apiUrl + '/api/claude/instances/' + instanceId + '/health')
    
    IF response.status != 200 THEN
      THROW new Error("Health check failed: " + response.status)
    END IF
    
    // Reset timeout counters
    lastMessageTimestamp = getCurrentTimestamp()
    
  CATCH error
    handleConnectionError(error, instanceId)
  END TRY
END FUNCTION
```

### 5. Fallback Polling Algorithm

```pseudocode
ALGORITHM: FallbackPollingManager
INPUT: instanceId, pollingInterval
OUTPUT: pollingConnection

FUNCTION fallbackToPolling(instanceId):
  connectionState.status = 'polling'
  
  // Stop SSE monitoring
  IF healthCheckInterval != null THEN
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  END IF
  
  // Start HTTP polling
  pollingTimer = setInterval(() => {
    pollForUpdates(instanceId)
  }, POLLING_INTERVAL)
  
  // Notify user of fallback
  notifyUser("Connection switched to HTTP polling for instance " + instanceId)
END FUNCTION

FUNCTION pollForUpdates(instanceId):
  TRY
    response = httpRequest('GET', apiUrl + '/api/claude/instances/' + instanceId + '/terminal/poll')
    
    IF response.success AND response.hasNewData THEN
      // Process new terminal output
      processTerminalOutput(response.data)
      
      // Update UI
      updateTerminalDisplay(instanceId, response.data)
    END IF
    
    // Update connection status
    connectionState.status = 'connected_polling'
    
  CATCH error
    // Polling failed, increment error count
    connectionState.errorCount++
    
    IF connectionState.errorCount > MAX_POLLING_ERRORS THEN
      // Give up and mark as disconnected
      connectionState.status = 'disconnected'
      notifyUser("Lost connection to instance " + instanceId)
    END IF
  END TRY
END FUNCTION
```

### 6. Message Processing Algorithm

```pseudocode
ALGORITHM: MessageProcessor
INPUT: rawMessage, instanceId
OUTPUT: processedMessage

FUNCTION processIncomingMessage(event, instanceId):
  TRY
    messageData = JSON.parse(event.data)
    
    // Update last message timestamp
    lastMessageTimestamp = getCurrentTimestamp()
    
    // Process by message type
    SWITCH messageData.type:
      CASE 'terminal_output':
        handleTerminalOutput(messageData, instanceId)
        
      CASE 'connection_status':
        handleStatusUpdate(messageData, instanceId)
        
      CASE 'error':
        handleServerError(messageData, instanceId)
        
      CASE 'heartbeat':
        handleHeartbeat(messageData, instanceId)
        
      DEFAULT:
        logWarning("Unknown message type: " + messageData.type)
    END SWITCH
    
    // Preserve message in session state
    preserveSessionState(instanceId, messageData)
    
  CATCH error
    logError("Message processing error", error, instanceId)
  END TRY
END FUNCTION

FUNCTION handleTerminalOutput(data, instanceId):
  // Format output with timestamp
  formattedOutput = formatTerminalOutput(data)
  
  // Update UI
  appendToTerminalDisplay(instanceId, formattedOutput)
  
  // Trigger auto-scroll
  scrollTerminalToBottom(instanceId)
END FUNCTION
```

## Algorithm Complexity Analysis

### Time Complexity
- **Connection Initialization**: O(1)
- **Error Recovery**: O(1) with exponential backoff
- **Health Monitoring**: O(1) per check
- **Message Processing**: O(1) per message
- **Session State Operations**: O(1) for get/set operations

### Space Complexity
- **Session Storage**: O(n) where n = number of active instances
- **Message Buffering**: O(m) where m = messages per session
- **Connection Metadata**: O(1) per connection

### Optimization Strategies

1. **Memory Management**
   - Periodic cleanup of expired sessions
   - Message buffer size limits
   - Efficient data structures for fast lookup

2. **Performance Optimization**
   - Message batching for high-frequency updates  
   - Debounced UI updates
   - Lazy loading of historical data

3. **Network Efficiency**
   - Intelligent polling intervals
   - Request coalescing
   - Compression for large payloads

---

*These algorithms form the foundation for SPARC Phase 3: Architecture Design*