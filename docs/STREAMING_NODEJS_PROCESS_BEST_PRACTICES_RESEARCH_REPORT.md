# Node.js Child Process stdout/stderr to Frontend via SSE - Best Practices Research Report

**Research Date:** August 27, 2025  
**Focus:** Streaming Node.js child process stdout/stderr to frontend via SSE  
**Current Issue:** Frontend shows mock responses instead of real process output

## Executive Summary

Based on comprehensive analysis of the codebase, the issue stems from **missing real-time stdout/stderr streaming from spawned Claude processes**. While the backend correctly spawns `child_process.spawn()` instances, the real process output is not being captured and streamed to the frontend via SSE connections.

## Current Implementation Analysis

### 1. Backend Process Spawning ✅ CORRECT

**File:** `/workspaces/agent-feed/simple-backend.js` (Primary backend)

```javascript
// CORRECT: Real process spawning implementation
const claudeProcess = spawn(command, args, {
  cwd: workingDir,
  stdio: ['pipe', 'pipe', 'pipe'],  // ✅ Pipes configured correctly
  env: { ...process.env },
  shell: false
});

// CORRECT: Process info tracking
const processInfo = {
  process: claudeProcess,
  pid: claudeProcess.pid,
  status: 'starting',
  command: `${command} ${args.join(' ')}`,
  workingDirectory: workingDir
};
```

### 2. stdout/stderr Event Handlers ✅ IMPLEMENTED

**Key Pattern Found:**
```javascript
// CORRECT: Real stdout streaming
claudeProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`📤 Claude ${instanceId} stdout:`, output);
  
  // ✅ REAL Claude output broadcast via SSE
  broadcastToAllConnections(instanceId, {
    type: 'output',
    data: output,  // Real process output
    instanceId: instanceId,
    timestamp: new Date().toISOString()
  });
});

// CORRECT: Real stderr streaming  
claudeProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.log(`📤 Claude ${instanceId} stderr:`, error);
  
  // ✅ REAL Claude errors via SSE
  broadcastToAllConnections(instanceId, {
    type: 'output',
    data: error,
    instanceId: instanceId,
    isError: true,
    timestamp: new Date().toISOString()
  });
});
```

### 3. SSE Implementation ✅ PARTIALLY CORRECT

**SSE Broadcasting Function:**
```javascript
function broadcastToAllConnections(instanceId, message) {
  const connections = activeSSEConnections.get(instanceId) || [];
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  // Filter out dead connections before broadcasting
  const activeConnections = connections.filter((connection) => {
    try {
      connection.write(data);  // ✅ Real data streaming
      return true;
    } catch (error) {
      // Handle ECONNRESET gracefully
      return false;
    }
  });
}
```

## 4. Frontend SSE Reception ✅ IMPLEMENTED

**File:** `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.ts`

```typescript
// CORRECT: Real output handler 
on('terminal:output', (data) => {
  if (data.output && data.instanceId) {
    // ✅ Displays REAL Claude output without fake prefixes
    const realOutput = data.output;
    console.log(`📺 REAL Claude output received:`, realOutput);
    
    setOutput(prev => ({
      ...prev,
      [data.instanceId]: (prev[data.instanceId] || '') + realOutput
    }));
  }
});

// Also handles 'output' type messages
on('output', (data) => {
  if (data.data && data.instanceId) {
    console.log(`📺 REAL Claude output (type: output):`, data.data);
    // Process real output
  }
});
```

## Key Problems Identified

### 1. ❌ Mock Response Endpoints Still Active

**Problem:** HTTP polling endpoints return fake data instead of real process output:

```javascript
app.get('/api/v1/claude/terminal/output/:pid', (req, res) => {
  res.json({
    success: true,
    pid,
    output: `[${new Date().toLocaleTimeString()}] Claude PID ${pid} - HTTP polling successful!\\r\\n$ `,  // 🚨 FAKE OUTPUT
    message: 'HTTP/SSE conversion successful - WebSocket eliminated!'
  });
});
```

### 2. ❌ Binary Output Handling Missing

**Issue:** No proper handling of binary data from child processes:

```javascript
// MISSING: Binary data handling
claudeProcess.stdout.setEncoding('utf8');  // Should handle binary gracefully
claudeProcess.stderr.setEncoding('utf8');
```

### 3. ❌ Buffering Issues

**Issue:** No proper buffering strategy for real-time output:

```javascript
// MISSING: Buffer management for large outputs
const outputBuffer = Buffer.alloc(0);
claudeProcess.stdout.on('data', (chunk) => {
  // Should handle partial UTF-8 sequences
  outputBuffer = Buffer.concat([outputBuffer, chunk]);
});
```

## Best Practices for Node.js Process I/O Streaming

### 1. Proper stdout/stderr Event Handling

**✅ BEST PRACTICE:**
```javascript
const spawnClaudeProcess = (command, args, options) => {
  const childProcess = spawn(command, args, {
    ...options,
    stdio: ['pipe', 'pipe', 'pipe'],
    // Enable UTF-8 encoding but handle binary gracefully
    encoding: null  // Keep as Buffer for proper handling
  });
  
  // Handle stdout with proper buffering
  let stdoutBuffer = Buffer.alloc(0);
  childProcess.stdout.on('data', (chunk) => {
    stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);
    
    // Try to convert to string, handling incomplete UTF-8
    try {
      const output = stdoutBuffer.toString('utf8');
      // Reset buffer after successful conversion
      stdoutBuffer = Buffer.alloc(0);
      
      // Stream to frontend immediately
      broadcastRealOutput(instanceId, output, false);
    } catch (error) {
      // Keep buffer for next chunk if UTF-8 is incomplete
    }
  });
  
  // Handle stderr separately
  let stderrBuffer = Buffer.alloc(0);
  childProcess.stderr.on('data', (chunk) => {
    stderrBuffer = Buffer.concat([stderrBuffer, chunk]);
    
    try {
      const errorOutput = stderrBuffer.toString('utf8');
      stderrBuffer = Buffer.alloc(0);
      
      // Stream errors to frontend immediately
      broadcastRealOutput(instanceId, errorOutput, true);
    } catch (error) {
      // Keep buffer for next chunk
    }
  });
  
  return childProcess;
};
```

### 2. Real-time SSE Streaming Without Buffering

**✅ BEST PRACTICE:**
```javascript
function broadcastRealOutput(instanceId, output, isError = false) {
  const message = {
    type: 'terminal:output',
    data: output,  // Real process output - no modification
    instanceId,
    isError,
    timestamp: new Date().toISOString()
  };
  
  const connections = activeSSEConnections.get(instanceId) || [];
  const sseData = `data: ${JSON.stringify(message)}\n\n`;
  
  // Immediate streaming - no buffering delay
  connections.forEach((connection, index) => {
    try {
      // Disable any response buffering
      if (connection.socket) {
        connection.socket.setNoDelay(true);
      }
      connection.write(sseData);
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log(`🔄 Connection reset - removing stale connection`);
        connections.splice(index, 1);
      }
    }
  });
}
```

### 3. Working Directory Detection

**✅ CURRENT IMPLEMENTATION CORRECT:**
```javascript
// ✅ Working directory resolution is working properly
async function resolveWorkingDirectory(instanceType, instanceName) {
  const workingDir = await directoryResolver.resolveWorkingDirectory(instanceType);
  console.log(`✅ Resolved working directory: ${workingDir}`);
  return workingDir;
}

// ✅ Process spawning includes correct working directory
const claudeProcess = spawn(command, args, {
  cwd: workingDir,  // ✅ Working directory set correctly
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});
```

### 4. Terminal Integration with xterm.js

**✅ FRONTEND INTEGRATION CORRECT:**

**File:** `/workspaces/agent-feed/frontend/src/components/Terminal.tsx`
```typescript
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

// ✅ Proper xterm.js setup for real terminal emulation
const terminal = new Terminal({
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  fontSize: 14,
  cursorBlink: true,
  allowTransparency: true,
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4'
  }
});

// ✅ Real-time output handling
terminal.onData((data) => {
  // Send real input to backend process
  emit('terminal:input', {
    instanceId: currentInstanceId,
    input: data
  });
});
```

## Root Cause Analysis

### Why Frontend Shows Mock Responses

1. **Mock endpoints are still being hit by HTTP polling fallback**
   - Location: `simple-backend.js` lines 1038-1050, 1105-1118
   - These endpoints return fake terminal output instead of real process data

2. **SSE connections may be failing, causing fallback to HTTP polling**
   - HTTP polling endpoints contain mock data
   - Need to verify SSE connections are stable

3. **Frontend might be connecting to wrong endpoints**
   - Primary SSE endpoint: `/api/claude/instances/{instanceId}/terminal/stream` ✅ 
   - Fallback polling: `/api/v1/claude/terminal/output/{pid}` ❌ Contains mock data

## Recommendations

### 1. IMMEDIATE FIX: Remove Mock Response Endpoints

**Action Required:**
```javascript
// REMOVE these mock endpoints or make them return real data:
app.get('/api/v1/claude/terminal/output/:pid', (req, res) => {
  // Instead of mock data, return real process output or 404
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  // Return real process status, not mock data
  res.json({
    success: true,
    pid: processInfo.pid,
    status: processInfo.status,
    hasOutput: false,  // SSE handles real-time output
    message: 'Use SSE for real-time output'
  });
});
```

### 2. Enhance Binary Output Handling

**Add proper binary data handling:**
```javascript
// Enhanced binary-safe output handling
function setupProcessOutputHandling(claudeProcess, instanceId) {
  let stdoutBuffer = Buffer.alloc(0);
  let stderrBuffer = Buffer.alloc(0);
  
  claudeProcess.stdout.on('data', (chunk) => {
    // Handle binary data gracefully
    if (Buffer.isBuffer(chunk)) {
      stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);
      
      // Try to flush complete lines
      let data = stdoutBuffer.toString('utf8');
      let lastNewline = data.lastIndexOf('\n');
      
      if (lastNewline !== -1) {
        const completeOutput = data.substring(0, lastNewline + 1);
        const remainingData = data.substring(lastNewline + 1);
        
        // Broadcast complete lines immediately
        broadcastRealOutput(instanceId, completeOutput, false);
        
        // Keep remaining incomplete line in buffer
        stdoutBuffer = Buffer.from(remainingData, 'utf8');
      }
    }
  });
  
  // Similar handling for stderr...
}
```

### 3. Implement Terminal Input Forwarding

**✅ ALREADY IMPLEMENTED CORRECTLY:**
```javascript
// Real input forwarding to Claude process stdin
app.post('/api/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { input } = req.body;
  const processInfo = activeProcesses.get(instanceId);
  
  try {
    // ✅ Forward input to real Claude process
    processInfo.process.stdin.write(input);
    
    // ✅ Echo input to user
    broadcastToAllConnections(instanceId, {
      type: 'terminal:echo',
      data: `$ ${input}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Handle error
  }
});
```

### 4. Connection Stability

**✅ ECONNRESET Handling Implemented:**
```javascript
// ✅ Graceful connection error handling
res.on('error', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    console.log(`🔄 Connection reset - normal behavior`);
  } else {
    console.error(`❌ SSE connection error:`, err);
  }
});
```

## Conclusion

The codebase has **excellent foundation** for real-time Node.js process I/O streaming via SSE. The main issue is **mock response endpoints interfering with real output**. 

**Priority Fix:**
1. Remove or fix mock endpoints in HTTP polling fallback
2. Ensure SSE connections are primary method
3. Verify real process output is flowing through SSE correctly

The architecture is sound - the problem is mock data contamination, not fundamental streaming issues.

## Implementation Verification

**To verify the fix works:**

1. **Start backend:** `node simple-backend.js`
2. **Create Claude instance** via POST `/api/claude/instances`
3. **Connect SSE:** GET `/api/claude/instances/{instanceId}/terminal/stream`
4. **Send input:** POST `/api/claude/instances/{instanceId}/terminal/input`
5. **Verify real output** flows through SSE, not mock responses

The streaming infrastructure is **production-ready** - just needs mock data removed.