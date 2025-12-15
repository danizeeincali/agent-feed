# SPARC Phase 2: Pseudocode - Instance ID Tracking Algorithm

## Root Cause Identified

**THE CRITICAL BUG**: Backend returns `{ success: true, instance: { id: instanceId, ... } }` but frontend expects `{ success: true, instanceId: instanceId, ... }`

**Evidence from Code Analysis**:
- Backend (line 265): `res.status(201).json({ success: true, instance: instanceRecord });`
- Frontend expects (line 246, 250): `data.instanceId`
- **Actual response structure**: `data.instance.id` contains the instance ID

## Pseudocode for Fixed ID Flow Algorithm

### Algorithm 1: Instance Creation Response Parsing

```pseudocode
FUNCTION handleInstanceCreationResponse(response):
    IF response.success is TRUE:
        // BUG FIX: Extract instanceId from nested instance object
        LET instanceId = response.instanceId OR response.instance?.id OR null
        
        IF instanceId is NULL OR instanceId is UNDEFINED:
            LOG_ERROR("Instance creation succeeded but no instance ID found in response")
            SET error = "Invalid response: missing instance ID"
            RETURN
        
        // Validate instanceId format
        IF NOT instanceId.matches(/^claude-\d+$/):
            LOG_ERROR("Invalid instance ID format:", instanceId)
            SET error = "Invalid instance ID format"
            RETURN
            
        // Update state with valid ID
        CALL refreshInstancesList()
        SET selectedInstance = instanceId
        SET outputBuffer[instanceId] = ""
        
        // Start terminal connection with validated ID
        CALL scheduleTerminalConnection(instanceId, 500)
    ELSE:
        LOG_ERROR("Instance creation failed:", response.error)
        SET error = response.error
```

### Algorithm 2: Terminal Connection Initialization

```pseudocode
FUNCTION scheduleTerminalConnection(instanceId, delay):
    VALIDATE instanceId is NOT NULL AND NOT UNDEFINED
    
    IF instanceId is INVALID:
        LOG_ERROR("Cannot start terminal connection: invalid instance ID")
        RETURN
        
    SCHEDULE_ASYNC_AFTER(delay):
        TRY:
            LOG_INFO("Starting terminal connection for validated instance:", instanceId)
            CALL connectSSE(instanceId)
            LOG_SUCCESS("SSE connection initiated for:", instanceId)
        CATCH sseError:
            LOG_WARNING("SSE failed, falling back to polling:", sseError)
            CALL startPolling(instanceId)
```

### Algorithm 3: Instance Selection Flow

```pseudocode
FUNCTION handleInstanceSelection(selectedInstance):
    VALIDATE selectedInstance.id is NOT NULL
    
    IF currentSelectedInstance != NULL AND currentSelectedInstance != selectedInstance.id:
        LOG_INFO("Disconnecting from previous instance:", currentSelectedInstance)
        CALL disconnectFromInstance()
    
    // Update state with validated instance ID
    SET selectedInstanceId = selectedInstance.id
    
    // Initialize output buffer if not exists
    IF outputBuffer[selectedInstance.id] is UNDEFINED:
        SET outputBuffer[selectedInstance.id] = ""
    
    // Start connection for running instances only
    IF selectedInstance.status == "running":
        CALL scheduleTerminalConnection(selectedInstance.id, 100)
```

### Algorithm 4: SSE Connection with ID Validation

```pseudocode
FUNCTION connectSSE(instanceId):
    LOG_INFO("🔄 Attempting SSE connection for instance:", instanceId)
    
    // CRITICAL: Validate instance ID before proceeding
    IF instanceId is NULL OR instanceId is UNDEFINED:
        LOG_ERROR("❌ Cannot connect SSE: instanceId is", instanceId)
        THROW Error("Invalid instance ID for SSE connection")
    
    // Clean up existing connections
    IF sseConnection.current is NOT NULL:
        LOG_INFO("🔌 Closing existing SSE connection")
        CALL sseConnection.current.close()
        SET sseConnection.current = NULL
    
    // Stop existing polling
    CALL stopPolling()
    
    TRY:
        // Create SSE connection with validated instance ID
        LET eventSource = NEW EventSource(`${url}/api/claude/instances/${instanceId}/terminal/stream`)
        
        SET eventSource.onopen = FUNCTION():
            LOG_SUCCESS("✅ SSE connection established for:", instanceId)
            SET isConnected = TRUE
            SET connectionError = NULL
            SET connectionState.current = {
                isSSE: TRUE,
                isPolling: FALSE,
                instanceId: instanceId,  // Store validated ID
                connectionType: "sse"
            }
            TRIGGER connectHandlers({ transport: "sse", instanceId: instanceId })
            
        SET eventSource.onmessage = FUNCTION(event):
            CALL processSSEMessage(event, instanceId)
            
        SET eventSource.onerror = FUNCTION(error):
            LOG_WARNING("❌ SSE connection error, falling back to polling")
            CALL eventSource.close()
            CALL startPolling(instanceId)  // Pass validated ID to polling
            
        SET sseConnection.current = eventSource
        
    CATCH connectionError:
        LOG_ERROR("Failed to create SSE connection:", connectionError)
        CALL startPolling(instanceId)  // Fallback with validated ID
```

### Algorithm 5: Terminal Input Emission with ID Validation

```pseudocode
FUNCTION emitTerminalInput(event, data):
    CASE event:
        WHEN "terminal:input":
            LET instanceId = connectionState.current.instanceId
            
            // CRITICAL: Validate instanceId before creating endpoint
            IF instanceId is NULL OR instanceId is UNDEFINED:
                LOG_ERROR("❌ Cannot send terminal input: instanceId is", instanceId)
                THROW Error("Invalid instance ID for terminal input")
            
            LET endpoint = `/api/claude/instances/${instanceId}/terminal/input`
            LET payload = { input: data.input }
            
            // Proceed with HTTP request
            CALL sendHTTPRequest("POST", endpoint, payload)
```

### Algorithm 6: Connection State Management

```pseudocode
FUNCTION updateConnectionState(instanceId, connectionType):
    // Always validate instanceId before storing
    IF instanceId is NULL OR instanceId is UNDEFINED:
        LOG_WARNING("Updating connection state with invalid instanceId:", instanceId)
        SET instanceId = NULL  // Explicit null for invalid IDs
    
    SET connectionState.current = {
        isSSE: (connectionType == "sse"),
        isPolling: (connectionType == "polling"),
        instanceId: instanceId,
        connectionType: connectionType
    }
    
    LOG_INFO("Connection state updated:", connectionState.current)
```

### Algorithm 7: Error Recovery for ID Loss

```pseudocode
FUNCTION recoverFromIDLoss():
    LOG_WARNING("🔄 Instance ID lost, attempting recovery...")
    
    // Try to recover from selected instance
    IF selectedInstance is NOT NULL:
        LOG_INFO("Recovering instance ID from selected instance:", selectedInstance)
        CALL connectSSE(selectedInstance)
        RETURN
    
    // Try to recover from instances list
    LET runningInstances = instances.filter(i => i.status == "running")
    IF runningInstances.length > 0:
        LET firstRunning = runningInstances[0]
        LOG_INFO("Recovering instance ID from first running instance:", firstRunning.id)
        SET selectedInstance = firstRunning.id
        CALL connectSSE(firstRunning.id)
        RETURN
    
    // No recovery possible
    LOG_ERROR("❌ Cannot recover instance ID - no running instances available")
    SET error = "Connection lost - please select an instance"
```

### Algorithm 8: Enhanced Debugging and Logging

```pseudocode
FUNCTION logInstanceIDFlow(operation, instanceId, context):
    LET timestamp = getCurrentTimestamp()
    LET logLevel = (instanceId is NULL OR instanceId is UNDEFINED) ? "ERROR" : "INFO"
    
    CONSOLE_LOG(`[${timestamp}] ${logLevel} - ${operation}:`)
    CONSOLE_LOG(`  Instance ID: ${instanceId} (type: ${typeof instanceId})`)
    CONSOLE_LOG(`  Context: ${JSON.stringify(context)}`)
    
    IF instanceId is NULL OR instanceId is UNDEFINED:
        CONSOLE_LOG(`  ❌ CRITICAL: Invalid instance ID detected`)
        CONSOLE_LOG(`  Stack trace:`, getCurrentStackTrace())
```

## Data Flow Validation Points

### Validation Point 1: Instance Creation Response
- **Input**: Backend response object
- **Validate**: `response.instance?.id` exists and matches format
- **Action**: Extract correct instanceId from nested structure

### Validation Point 2: State Update
- **Input**: Extracted instanceId
- **Validate**: Non-null, non-undefined, correct format
- **Action**: Update selectedInstance state

### Validation Point 3: Connection Initiation
- **Input**: instanceId from state
- **Validate**: Still valid before SSE/polling connection
- **Action**: Proceed with connection or show error

### Validation Point 4: Terminal Input
- **Input**: connectionState.current.instanceId
- **Validate**: Valid before constructing API endpoint
- **Action**: Send input or reject with error

## Error Handling Patterns

### Pattern 1: Graceful Degradation
```pseudocode
IF instanceId is INVALID:
    SHOW user-friendly error message
    DISABLE terminal input
    SUGGEST re-selecting instance
    LOG detailed error for debugging
```

### Pattern 2: Automatic Recovery
```pseudocode
IF connection loses instanceId:
    ATTEMPT recovery from selectedInstance state
    ATTEMPT recovery from instances list
    IF recovery fails: SHOW manual selection prompt
```

### Pattern 3: Validation Gates
```pseudocode
BEFORE every critical operation:
    VALIDATE instanceId
    IF invalid: LOG error AND return early
    ELSE: proceed with operation
```

---

*This pseudocode defines the exact algorithms needed to fix the instance ID propagation bug, with emphasis on validation, error recovery, and proper response parsing.*