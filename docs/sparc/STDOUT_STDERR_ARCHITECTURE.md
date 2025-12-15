# SPARC Architecture: Enhanced Claude Process Output Streaming System

## System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄───┤  SSE Connection  │◄───┤  Backend        │
│   Terminal      │    │   Management     │    │  Output Handler │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         ▲
                                                         │
                                               ┌─────────▼────────┐
                                               │ Claude Process   │
                                               │ stdout/stderr    │
                                               └──────────────────┘
```

## Component Design

### 1. Enhanced Process Spawning Layer
```javascript
class EnhancedClaudeSpawner {
  constructor() {
    this.processes = new Map();
    this.outputBuffers = new Map();
    this.connectionPools = new Map();
  }
  
  async spawnWithOutputCapture(instanceId, command, args, options) {
    // Enhanced spawn configuration for reliable I/O
    const spawnOptions = {
      ...options,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8'
    };
    
    const process = spawn(command, args, spawnOptions);
    
    // Immediate handler attachment
    this.attachOutputHandlers(instanceId, process);
    
    return process;
  }
}
```

### 2. Output Stream Processing Layer
```javascript
class OutputStreamProcessor {
  constructor(instanceId, sseManager) {
    this.instanceId = instanceId;
    this.sseManager = sseManager;
    this.outputBuffer = new CircularBuffer(1024);
  }
  
  processStdout(data) {
    const output = data.toString('utf8');
    
    // Immediate logging for debugging
    console.log(`📤 REAL Claude ${this.instanceId} stdout:`, output);
    
    // Buffer management
    this.outputBuffer.write(output);
    
    // Real-time broadcasting
    this.sseManager.broadcast(this.instanceId, {
      type: 'output',
      data: output,
      source: 'stdout',
      timestamp: new Date().toISOString(),
      isReal: true
    });
  }
  
  processStderr(data) {
    const output = data.toString('utf8');
    
    // Immediate logging for debugging
    console.log(`📤 REAL Claude ${this.instanceId} stderr:`, output);
    
    // Buffer management
    this.outputBuffer.write(output);
    
    // Real-time broadcasting with error flag
    this.sseManager.broadcast(this.instanceId, {
      type: 'output',
      data: output,
      source: 'stderr',
      timestamp: new Date().toISOString(),
      isReal: true,
      isError: true
    });
  }
}
```

### 3. SSE Connection Management Layer
```javascript
class RobustSSEManager {
  constructor() {
    this.connections = new Map(); // instanceId -> Connection[]
    this.healthMonitor = new ConnectionHealthMonitor();
  }
  
  broadcast(instanceId, message) {
    const connections = this.connections.get(instanceId) || [];
    const validConnections = [];
    
    const serializedData = `data: ${JSON.stringify(message)}\n\n`;
    
    connections.forEach(connection => {
      try {
        if (this.isConnectionHealthy(connection)) {
          connection.write(serializedData);
          validConnections.push(connection);
        }
      } catch (error) {
        console.warn(`Removing dead connection for ${instanceId}`);
      }
    });
    
    // Update connection pool
    this.connections.set(instanceId, validConnections);
  }
  
  isConnectionHealthy(connection) {
    return connection && 
           !connection.destroyed && 
           connection.writable && 
           !connection.writableEnded;
  }
}
```

## Critical Fix Implementation

### Problem Identification
The issue is in the `setupProcessHandlers` function in `simple-backend.js`. The current implementation has:

1. **Incorrect Handler Attachment**: Handlers may not be properly attached
2. **Missing Encoding Setup**: No explicit encoding configuration
3. **Timing Issues**: Handlers attached after process may have already output data
4. **Broadcasting Failures**: `broadcastToAllConnections` function may have bugs

### Enhanced Implementation

```javascript
function setupProcessHandlers(instanceId, processInfo) {
  const { process: claudeProcess } = processInfo;
  
  // CRITICAL FIX 1: Set encoding immediately after spawn
  claudeProcess.stdout.setEncoding('utf8');
  claudeProcess.stderr.setEncoding('utf8');
  
  // CRITICAL FIX 2: Enhanced stdout handler with immediate processing
  claudeProcess.stdout.on('data', (chunk) => {
    const realOutput = chunk.toString('utf8');
    
    // MANDATORY: Console logging for debugging
    console.log(`📤 REAL Claude ${instanceId} stdout:`, realOutput);
    
    // Enhanced broadcast with validation
    safelyBroadcastOutput(instanceId, {
      type: 'output',
      data: realOutput,
      instanceId: instanceId,
      timestamp: new Date().toISOString(),
      source: 'stdout',
      isReal: true
    });
  });
  
  // CRITICAL FIX 3: Enhanced stderr handler with immediate processing  
  claudeProcess.stderr.on('data', (chunk) => {
    const realError = chunk.toString('utf8');
    
    // MANDATORY: Console logging for debugging
    console.log(`📤 REAL Claude ${instanceId} stderr:`, realError);
    
    // Enhanced broadcast with validation
    safelyBroadcastOutput(instanceId, {
      type: 'output',
      data: realError,
      instanceId: instanceId,
      isError: true,
      timestamp: new Date().toISOString(),
      source: 'stderr',
      isReal: true
    });
  });
  
  // Additional event handlers remain the same...
}

// CRITICAL FIX 4: Enhanced broadcast function with robust error handling
function safelyBroadcastOutput(instanceId, message) {
  const connections = activeSSEConnections.get(instanceId) || [];
  
  if (connections.length === 0) {
    console.warn(`⚠️ No SSE connections for ${instanceId} - output lost:`, message.data);
    return;
  }
  
  const serializedData = `data: ${JSON.stringify(message)}\n\n`;
  const validConnections = [];
  
  connections.forEach((connection, index) => {
    try {
      // Enhanced connection validation
      if (connection && 
          !connection.destroyed && 
          connection.writable && 
          !connection.writableEnded) {
        connection.write(serializedData);
        validConnections.push(connection);
      } else {
        console.warn(`Removing invalid connection ${index} for ${instanceId}`);
      }
    } catch (error) {
      console.error(`❌ Broadcast error for connection ${index}:`, error.message);
    }
  });
  
  // Update connection list
  activeSSEConnections.set(instanceId, validConnections);
  
  console.log(`📊 Broadcast sent to ${validConnections.length}/${connections.length} connections`);
}
```

## Performance Optimizations

### 1. Connection Pooling
```javascript
class ConnectionPool {
  constructor(maxSize = 100) {
    this.pool = [];
    this.maxSize = maxSize;
  }
  
  acquire() {
    return this.pool.pop() || this.createConnection();
  }
  
  release(connection) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(connection);
    }
  }
}
```

### 2. Output Buffering
```javascript
class CircularBuffer {
  constructor(size) {
    this.buffer = new Array(size);
    this.writeIndex = 0;
    this.size = size;
  }
  
  write(data) {
    this.buffer[this.writeIndex] = {
      data,
      timestamp: Date.now()
    };
    this.writeIndex = (this.writeIndex + 1) % this.size;
  }
}
```

## Monitoring and Debugging

### 1. Output Flow Metrics
```javascript
class OutputMetrics {
  constructor() {
    this.bytesProcessed = 0;
    this.messagesProcessed = 0;
    this.broadcastFailures = 0;
  }
  
  trackOutput(data) {
    this.bytesProcessed += Buffer.byteLength(data, 'utf8');
    this.messagesProcessed++;
  }
  
  getStats() {
    return {
      bytesProcessed: this.bytesProcessed,
      messagesProcessed: this.messagesProcessed,
      broadcastFailures: this.broadcastFailures
    };
  }
}
```

### 2. Debug Logging
```javascript
function createDebugLogger(instanceId) {
  return {
    stdout: (data) => console.log(`📤 [${instanceId}] STDOUT:`, data),
    stderr: (data) => console.log(`📤 [${instanceId}] STDERR:`, data),
    broadcast: (count) => console.log(`📡 [${instanceId}] Broadcast to ${count} connections`),
    error: (error) => console.error(`❌ [${instanceId}] Error:`, error)
  };
}
```

## Success Validation

### Immediate Verification Steps
1. **Backend Console**: Must show `📤 REAL Claude {instanceId} stdout:` messages
2. **Frontend SSE**: Must receive real-time output events
3. **Network Tab**: SSE connection shows data flowing
4. **Process Validation**: `ps aux | grep claude` shows running process
5. **Output Timing**: < 100ms delay from process to frontend

## Recovery Mechanisms

### 1. Handler Reattachment
```javascript
function reattachHandlers(instanceId) {
  const processInfo = activeProcesses.get(instanceId);
  if (processInfo && processInfo.process) {
    setupProcessHandlers(instanceId, processInfo);
    console.log(`✅ Handlers reattached for ${instanceId}`);
  }
}
```

### 2. Connection Recovery
```javascript
function recoverConnections(instanceId) {
  const deadConnections = activeSSEConnections.get(instanceId) || [];
  const aliveConnections = deadConnections.filter(conn => 
    conn && !conn.destroyed && conn.writable
  );
  activeSSEConnections.set(instanceId, aliveConnections);
}
```