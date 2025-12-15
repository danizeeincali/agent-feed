# SPARC Pseudocode: Claude Process Output Streaming Algorithm

## Core Algorithm: Process Output Capture & Broadcasting

```pseudocode
ALGORITHM: RealTimeClaudeOutputStreaming

INPUT: 
  - instanceId: String
  - claudeProcess: ChildProcess
  - activeConnections: Map<String, Array<SSEConnection>>

PROCEDURE setupOutputHandlers(instanceId, claudeProcess):
  // CRITICAL: Set encoding before attaching listeners
  claudeProcess.stdout.setEncoding('utf8')
  claudeProcess.stderr.setEncoding('utf8')
  
  // Attach stdout handler with immediate processing
  claudeProcess.stdout.on('data', (chunk) -> {
    output = chunk.toString('utf8')
    
    // Immediate console logging for debugging
    console.log("📤 REAL Claude", instanceId, "stdout:", output)
    
    // Create structured message
    message = {
      type: 'output',
      data: output, 
      instanceId: instanceId,
      timestamp: getCurrentTimestamp(),
      source: 'stdout',
      isReal: true
    }
    
    // Broadcast to all SSE connections
    broadcastToConnections(instanceId, message)
  })
  
  // Attach stderr handler with immediate processing  
  claudeProcess.stderr.on('data', (chunk) -> {
    output = chunk.toString('utf8')
    
    // Immediate console logging for debugging
    console.log("📤 REAL Claude", instanceId, "stderr:", output)
    
    // Create structured message
    message = {
      type: 'output',
      data: output,
      instanceId: instanceId, 
      timestamp: getCurrentTimestamp(),
      source: 'stderr',
      isReal: true,
      isError: true
    }
    
    // Broadcast to all SSE connections
    broadcastToConnections(instanceId, message)
  })

PROCEDURE broadcastToConnections(instanceId, message):
  connections = activeSSEConnections.get(instanceId) || []
  validConnections = []
  serializedMessage = JSON.stringify(message)
  sseData = "data: " + serializedMessage + "\n\n"
  
  FOR EACH connection IN connections:
    TRY:
      IF connection.isValid() AND connection.isWritable():
        connection.write(sseData)
        validConnections.add(connection)
      ENDIF
    CATCH error:
      console.warn("Removing dead connection for", instanceId)
    ENDTRY
  ENDFOR
  
  // Update connection list to remove dead connections
  activeSSEConnections.set(instanceId, validConnections)

PROCEDURE enhancedProcessSpawn(instanceId, command, args, workingDir):
  // Enhanced spawn configuration
  spawnOptions = {
    cwd: workingDir,
    stdio: ['pipe', 'pipe', 'pipe'], // Explicit pipe configuration
    env: process.env,
    shell: false,
    detached: false
  }
  
  claudeProcess = spawn(command, args, spawnOptions)
  
  // CRITICAL: Immediate handler setup after spawn
  setupOutputHandlers(instanceId, claudeProcess)
  
  // Process lifecycle handlers
  claudeProcess.on('spawn', () -> {
    console.log("✅ Process spawned:", instanceId, "PID:", claudeProcess.pid)
    broadcastStatusUpdate(instanceId, 'running')
  })
  
  claudeProcess.on('error', (error) -> {
    console.error("❌ Process error:", instanceId, error)
    broadcastStatusUpdate(instanceId, 'error', error)
  })
  
  claudeProcess.on('exit', (code, signal) -> {
    console.log("🏁 Process exited:", instanceId, "code:", code)
    broadcastStatusUpdate(instanceId, 'stopped', {code, signal})
  })
  
  RETURN claudeProcess
```

## Error Recovery Algorithm

```pseudocode
ALGORITHM: OutputStreamRecovery

PROCEDURE handleStreamFailure(instanceId, error):
  console.error("Stream failure for", instanceId, ":", error)
  
  // Attempt to reattach handlers
  processInfo = activeProcesses.get(instanceId)
  IF processInfo AND processInfo.process:
    TRY:
      setupOutputHandlers(instanceId, processInfo.process)
      console.log("✅ Stream handlers reattached for", instanceId)
    CATCH retryError:
      console.error("Failed to reattach handlers:", retryError)
      broadcastStatusUpdate(instanceId, 'stream_error', retryError)
    ENDTRY
  ENDIF
```

## Buffer Management Algorithm

```pseudocode
ALGORITHM: HighFrequencyOutputHandling

PROCEDURE processOutputChunk(chunk, instanceId, source):
  // Handle potential multi-line output
  lines = chunk.split('\n')
  
  FOR EACH line IN lines:
    IF line.length > 0:
      processedLine = line.trim()
      
      // Immediate broadcast for each line
      message = createOutputMessage(processedLine, instanceId, source)
      broadcastToConnections(instanceId, message)
      
      // Optional: Buffer for batch processing if needed
      addToBuffer(instanceId, processedLine)
    ENDIF
  ENDFOR
```

## Connection Health Monitoring

```pseudocode
ALGORITHM: SSEConnectionHealthCheck

PROCEDURE validateConnections(instanceId):
  connections = activeSSEConnections.get(instanceId) || []
  healthyConnections = []
  
  FOR EACH connection IN connections:
    TRY:
      IF NOT connection.destroyed AND connection.writable:
        // Send heartbeat to test connection
        connection.write("data: {\"type\":\"heartbeat\"}\n\n")
        healthyConnections.add(connection)
      ENDIF
    CATCH error:
      console.log("Removing unhealthy connection")
    ENDTRY
  ENDFOR
  
  activeSSEConnections.set(instanceId, healthyConnections)
  RETURN healthyConnections.length
```

## Priority Queuing for Output

```pseudocode
ALGORITHM: PriorityOutputQueue

PROCEDURE queueOutput(instanceId, output, priority):
  queue = getOrCreateQueue(instanceId)
  
  message = {
    data: output,
    priority: priority, // 'critical', 'high', 'normal'
    timestamp: getCurrentTimestamp()
  }
  
  // Insert based on priority
  insertByPriority(queue, message)
  
  // Process queue immediately
  processOutputQueue(instanceId)

PROCEDURE processOutputQueue(instanceId):
  queue = outputQueues.get(instanceId)
  
  WHILE queue.hasMessages():
    message = queue.dequeue() // Gets highest priority first
    broadcastToConnections(instanceId, message)
  ENDWHILE
```

## Success Metrics

1. **Latency**: < 10ms from process output to SSE broadcast
2. **Reliability**: 99.9% output capture rate
3. **Connection Health**: Automatic dead connection cleanup
4. **Memory**: No memory leaks from buffered output
5. **Error Recovery**: Automatic stream reattachment on failures