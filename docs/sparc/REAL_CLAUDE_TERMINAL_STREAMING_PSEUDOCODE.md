# SPARC Phase 2: Real Claude Terminal Streaming - Pseudocode Algorithms

## Critical Algorithm: Mock Response Elimination & Real Output Streaming

### Backend Process Output Stream Handler (simple-backend.js)

```pseudocode
ALGORITHM: ConnectRealProcessToSSE
INPUT: claudeProcess, instanceId, sseConnections
OUTPUT: Real-time Claude output streamed to frontend

BEGIN
  // CRITICAL FIX: Remove all mock terminal response functions
  REMOVE processTerminalCommand()  
  REMOVE processTerminalInput()
  REMOVE hardcoded response mappings
  
  // Connect REAL Claude process stdout to SSE streaming
  claudeProcess.stdout.on('data', (rawData) => {
    realOutput = rawData.toString('utf8')
    
    // Log real output for debugging
    console.log(`📤 REAL Claude ${instanceId} stdout:`, realOutput)
    
    // Broadcast REAL output via SSE (not mock responses)
    sseMessage = {
      type: 'output',
      data: realOutput,              // REAL Claude stdout data
      instanceId: instanceId,
      timestamp: new Date().toISOString(),
      source: 'stdout',
      isReal: true                   // Flag to indicate authentic output
    }
    
    // Send to ALL connected SSE clients for this instance
    broadcastToAllConnections(instanceId, sseMessage)
  })
  
  // Connect REAL Claude process stderr to SSE streaming  
  claudeProcess.stderr.on('data', (rawErrorData) => {
    realError = rawErrorData.toString('utf8')
    
    console.log(`📤 REAL Claude ${instanceId} stderr:`, realError)
    
    sseMessage = {
      type: 'output',
      data: realError,
      instanceId: instanceId,
      isError: true,                 // Mark as error output
      timestamp: new Date().toISOString(),
      source: 'stderr',
      isReal: true
    }
    
    broadcastToAllConnections(instanceId, sseMessage)
  })
  
  // CRITICAL FIX: Send real working directory immediately after spawn
  IF processInfo.workingDirectory:
    initialMessage = {
      type: 'output', 
      data: `Claude Code session started for instance ${instanceId}\r\nWorking directory: ${processInfo.workingDirectory}\r\n$ `,
      instanceId: instanceId,
      timestamp: new Date().toISOString(),
      source: 'initial',
      isReal: true
    }
    
    // Delay slightly to ensure SSE connections are established
    setTimeout(() => {
      broadcastToAllConnections(instanceId, initialMessage)
    }, 200)
  END IF
END

ALGORITHM: RemoveAllMockTerminalResponses
INPUT: backendCode
OUTPUT: Clean backend with only real process streaming

BEGIN
  // Remove mock terminal processing functions
  DELETE FUNCTION processTerminalInput(instanceId, input)
  DELETE FUNCTION processTerminalCommand(instanceId, input)
  DELETE static responses object
  DELETE hardcoded terminal responses
  
  // Remove mock responses from input endpoints
  IN ENDPOINT /api/claude/instances/:instanceId/terminal/input:
    REMOVE mock response generation
    REMOVE hardcoded echo responses
    ONLY KEEP real process stdin forwarding:
      processInfo.process.stdin.write(input)
  
  // Ensure SSE stream endpoints only send real process data
  IN SSE ENDPOINTS:
    REMOVE mock terminal messages
    REMOVE fake session startup messages
    ONLY BROADCAST real process stdout/stderr
END
```

### Frontend Real Output Processing (ClaudeInstanceManager.tsx)

```pseudocode
ALGORITHM: ProcessRealClaudeOutput
INPUT: sseMessage from backend
OUTPUT: Display authentic Claude output in terminal

BEGIN
  // Enhanced real output handler
  on('output', (data) => {
    IF data.data AND data.instanceId AND data.isReal:
      realOutput = data.data
      
      // Log real Claude output for debugging
      console.log(`📺 REAL Claude output for ${data.instanceId}:`, realOutput)
      
      // Display ONLY real Claude output (no mock prefixes)
      setOutput(prev => ({
        ...prev,
        [data.instanceId]: (prev[data.instanceId] || '') + realOutput
      }))
      
      // Auto-scroll terminal to show latest output
      IF outputRefs.current[data.instanceId]:
        element = outputRefs.current[data.instanceId]
        element.scrollTop = element.scrollHeight
      END IF
    END IF
  })
  
  // Remove mock response handlers
  REMOVE handlers for hardcoded responses
  REMOVE "[RESPONSE]" prefix processing
  REMOVE fake session startup message handling
END

ALGORITHM: WaitForRealClaudeOutput
INPUT: instanceId, connectionState
OUTPUT: Proper terminal initialization

BEGIN
  // Show connecting message until REAL Claude output received
  initialDisplay = "Connecting to Claude process..."
  
  // Wait for actual Claude startup output
  WHILE NOT receivedRealOutput:
    displayMessage = `Connecting to instance ${instanceId}...\n${connectionType}\n`
    
    // Once real Claude output arrives, display it instead
    IF firstRealOutput:
      displayMessage = realClaudeOutput
      receivedRealOutput = true
    END IF
  END WHILE
END
```

### SSE Hook Real Output Routing (useHTTPSSE.ts)

```pseudocode
ALGORITHM: RouteRealClaudeOutput
INPUT: SSE event data
OUTPUT: Properly routed real terminal output

BEGIN
  eventSource.onmessage = (event) => {
    data = JSON.parse(event.data)
    
    // CRITICAL FIX: Route REAL Claude output properly
    IF data.type === 'output' AND data.data AND data.isReal:
      // Route real Claude process output to handlers
      triggerHandlers('terminal:output', {
        output: data.data,           // REAL Claude stdout/stderr
        instanceId: data.instanceId,
        timestamp: data.timestamp,
        isReal: data.isReal,
        source: data.source
      })
      
      // Also trigger generic 'output' handler
      triggerHandlers('output', {
        data: data.data,             // REAL output data
        instanceId: data.instanceId,
        timestamp: data.timestamp,
        isReal: true
      })
      
    ELSE IF data.type === 'heartbeat':
      // Handle keep-alive (don't display)
      console.debug('💓 Heartbeat from backend')
      
    ELSE IF data.type === 'connected':
      // Handle connection confirmation (don't display as terminal output)
      console.log('🔗 SSE connection confirmed')
    END IF
  }
END
```

## Input Processing Algorithm (Fixed)

```pseudocode
ALGORITHM: ForwardInputToRealProcess
INPUT: userInput, instanceId, processMap
OUTPUT: Command sent to real Claude stdin

BEGIN
  processInfo = processMap.get(instanceId)
  
  // Validate process exists and is running
  IF NOT processInfo OR processInfo.status !== 'running':
    error = `Instance ${instanceId} not running`
    sendErrorToFrontend(instanceId, error)
    RETURN
  END IF
  
  // Forward input DIRECTLY to real Claude process stdin
  TRY:
    processInfo.process.stdin.write(userInput)
    
    // Echo input to terminal (standard terminal behavior)
    echoMessage = {
      type: 'terminal:echo',
      data: `$ ${userInput.replace('\n', '')}`,
      timestamp: new Date().toISOString()
    }
    broadcastToAllConnections(instanceId, echoMessage)
    
  CATCH error:
    errorMessage = `Failed to send input: ${error.message}`
    sendErrorToFrontend(instanceId, errorMessage)
  END TRY
END
```

## Working Directory Fix Algorithm

```pseudocode
ALGORITHM: DisplayRealWorkingDirectory
INPUT: processInfo from backend
OUTPUT: Correct working directory shown in frontend

BEGIN
  // Backend: Send real working directory during process creation
  processInfo = {
    process: claudeProcess,
    pid: claudeProcess.pid,
    workingDirectory: realWorkingDir,  // FROM directoryResolver.resolveWorkingDirectory()
    command: processInfo.command,
    instanceType: instanceType
  }
  
  // Send real working directory via SSE immediately
  directoryMessage = {
    type: 'output',
    data: `Working directory: ${processInfo.workingDirectory}\r\n`,
    instanceId: instanceId,
    timestamp: new Date().toISOString(),
    source: 'working_directory',
    isReal: true
  }
  
  broadcastToAllConnections(instanceId, directoryMessage)
  
  // Frontend: Display real working directory
  IF data.source === 'working_directory':
    displayMessage = data.data  // Show real directory, not hardcoded
  END IF
END
```

## Process Health Monitoring Algorithm

```pseudocode
ALGORITHM: MonitorRealProcessHealth
INPUT: claudeProcess, instanceId
OUTPUT: Accurate process status updates

BEGIN
  // Monitor process spawn
  claudeProcess.on('spawn', () => {
    processStatus = 'running'
    statusMessage = {
      type: 'instance:status',
      instanceId: instanceId,
      status: 'running',
      pid: claudeProcess.pid,
      timestamp: new Date().toISOString()
    }
    broadcastInstanceStatus(instanceId, 'running', statusMessage)
  })
  
  // Monitor process exit
  claudeProcess.on('exit', (code, signal) => {
    processStatus = 'stopped'
    statusMessage = {
      type: 'instance:status',
      instanceId: instanceId, 
      status: 'stopped',
      exitCode: code,
      signal: signal,
      timestamp: new Date().toISOString()
    }
    broadcastInstanceStatus(instanceId, 'stopped', statusMessage)
  })
  
  // Monitor process errors
  claudeProcess.on('error', (error) => {
    processStatus = 'error'
    errorMessage = {
      type: 'instance:status',
      instanceId: instanceId,
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    }
    broadcastInstanceStatus(instanceId, 'error', errorMessage)
  })
END
```

## Implementation Priority Order

### Priority 1: Remove Mock Responses (Backend)
1. Delete `processTerminalCommand()` function
2. Delete `processTerminalInput()` function  
3. Remove hardcoded response mappings
4. Connect real stdout/stderr to SSE broadcasting

### Priority 2: Fix Frontend Display (Frontend)
1. Update output handlers to only display real Claude output
2. Remove "[RESPONSE]" message processing
3. Show real working directory from backend
4. Wait for authentic output before displaying

### Priority 3: Enhance SSE Routing (SSE Hook)
1. Route real Claude output properly in message handlers
2. Filter out non-terminal messages from display
3. Ensure proper event triggering for real output

### Priority 4: Validate End-to-End (Testing)
1. Test real command execution (ls, pwd, cd)
2. Verify working directory accuracy
3. Confirm bidirectional communication works
4. Validate no mock responses appear

## Success Validation Checklist

- [ ] No mock responses visible in terminal
- [ ] Real Claude startup messages appear
- [ ] Commands produce authentic Claude responses  
- [ ] Working directory shows correct path
- [ ] Error messages from Claude display properly
- [ ] SSE connection streams real process output
- [ ] Input forwarding works with real responses

---

**Next Phase**: Architecture Design - Design enhanced message routing and process integration architecture