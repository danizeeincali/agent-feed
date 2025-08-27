# SPARC Specification: Claude Process stdout/stderr Capture & SSE Broadcasting Fix

## Problem Analysis
- Claude process spawns correctly with real PID (6691) ✅
- Input reaches Claude process successfully ✅ 
- **CRITICAL ISSUE**: No stdout/stderr output is being captured or streamed ❌
- Backend logs show no "📤 Claude stdout:" messages ❌
- Frontend shows "Waiting for real output" indefinitely ❌

## Root Cause Analysis

### Current Implementation Issue
In `simple-backend.js` lines 231-260:
```javascript
claudeProcess.stdout.on('data', (data) => {
  const realOutput = data.toString('utf8');
  console.log(`📤 REAL Claude ${instanceId} stdout:`, realOutput);
  
  broadcastToAllConnections(instanceId, {
    type: 'output',
    data: realOutput,
    instanceId: instanceId,
    timestamp: new Date().toISOString(),
    source: 'stdout',
    isReal: true
  });
});
```

### Potential Issues
1. **Stdio Configuration**: `stdio: ['pipe', 'pipe', 'pipe']` may not be working
2. **Event Handler Setup**: Handlers may not be properly attached before process is ready
3. **Buffer Encoding**: Data encoding issues preventing proper capture
4. **Timing Issues**: Process may output before handlers are attached
5. **SSE Broadcasting**: `broadcastToAllConnections` function may have bugs

## SPARC Specification

### Requirements
1. **Real-time stdout/stderr capture** from spawned Claude processes
2. **Immediate SSE broadcasting** of all process output to frontend
3. **Robust error handling** for process communication failures
4. **Buffer management** to prevent data loss during high-frequency output
5. **Connection resilience** to handle SSE client reconnections

### Technical Specifications

#### Process Spawning Configuration
```javascript
const claudeProcess = spawn(command, args, {
  cwd: workingDir,
  stdio: ['pipe', 'pipe', 'pipe'], // Ensure pipes are created
  env: { ...process.env },
  shell: false,
  detached: false // Keep attached for proper cleanup
});
```

#### Output Handler Implementation
```javascript
// Immediate handler attachment after spawn
claudeProcess.stdout.setEncoding('utf8');
claudeProcess.stderr.setEncoding('utf8');

claudeProcess.stdout.on('data', (chunk) => {
  // Process each chunk immediately
  const output = chunk.toString('utf8');
  logOutput(instanceId, 'stdout', output);
  broadcastOutput(instanceId, output, 'stdout');
});

claudeProcess.stderr.on('data', (chunk) => {
  // Process each chunk immediately  
  const output = chunk.toString('utf8');
  logOutput(instanceId, 'stderr', output);
  broadcastOutput(instanceId, output, 'stderr');
});
```

#### SSE Broadcasting Enhancement
```javascript
function broadcastOutput(instanceId, data, source) {
  const message = {
    type: 'output',
    data: data,
    instanceId: instanceId,
    timestamp: new Date().toISOString(),
    source: source,
    isReal: true
  };
  
  // Enhanced connection validation and broadcasting
  const connections = activeSSEConnections.get(instanceId) || [];
  const validConnections = [];
  
  connections.forEach(connection => {
    try {
      if (!connection.destroyed && connection.writable) {
        connection.write(`data: ${JSON.stringify(message)}\n\n`);
        validConnections.push(connection);
      }
    } catch (error) {
      console.warn(`Removing dead connection for ${instanceId}`);
    }
  });
  
  // Update connection list
  activeSSEConnections.set(instanceId, validConnections);
}
```

### Success Criteria
1. Backend logs show `📤 Claude stdout:` messages immediately upon Claude output
2. Frontend receives real-time output via SSE stream
3. No delays or buffering of process output
4. Robust handling of connection failures
5. Complete elimination of "Waiting for real output" messages

## Implementation Priority
**CRITICAL**: This is a production-blocking issue requiring immediate resolution.

## Testing Strategy
1. **Unit Tests**: Verify stdout/stderr handlers attach correctly
2. **Integration Tests**: End-to-end output flow from process to frontend
3. **Performance Tests**: High-frequency output handling
4. **Connection Tests**: SSE resilience under network failures