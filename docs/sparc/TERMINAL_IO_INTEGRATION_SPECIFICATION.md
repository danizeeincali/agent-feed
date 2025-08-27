# Terminal I/O Integration Specification

## 1. OVERVIEW

### 1.1 Purpose
Design real-time bidirectional communication between frontend terminal interface and backend Claude processes, replacing mock terminal responses with actual process I/O streams.

### 1.2 Current Mock Implementation Issues
- Hardcoded terminal responses from `processTerminalCommand()`
- Fake command processing with simulated output
- No actual stdin forwarding to processes
- SSE events contain mock data instead of real process output
- Terminal echo is simulated rather than process-driven

### 1.3 Target Architecture
```
User Input → Frontend → HTTP POST → Backend → Process.stdin
Process.stdout/stderr → Backend SSE → Frontend → Terminal Display
```

## 2. I/O STREAM ARCHITECTURE

### 2.1 Process I/O Handler
```typescript
class ProcessIOHandler {
  private instance: ProcessInstance;
  private inputBuffer: string;
  private outputBuffer: Buffer;
  private broadcaster: SSEBroadcaster;
  
  constructor(instance: ProcessInstance, broadcaster: SSEBroadcaster) {
    this.instance = instance;
    this.broadcaster = broadcaster;
    this.setupStreams();
  }
  
  private setupStreams(): void {
    // Setup stdout handling
    this.instance.process.stdout?.on('data', (data: Buffer) => {
      this.handleStdout(data);
    });
    
    // Setup stderr handling  
    this.instance.process.stderr?.on('data', (data: Buffer) => {
      this.handleStderr(data);
    });
    
    // Setup stdin error handling
    this.instance.process.stdin?.on('error', (error: Error) => {
      this.handleStdinError(error);
    });
  }
  
  sendInput(input: string): boolean {
    try {
      if (!this.instance.process.stdin?.writable) {
        throw new Error('Process stdin is not writable');
      }
      
      // Send input to process
      const success = this.instance.process.stdin.write(input);
      
      if (success) {
        this.instance.inputCount++;
        this.instance.lastActivity = new Date();
        
        // Broadcast input echo to frontend
        this.broadcaster.broadcast(this.instance.instanceId, {
          type: 'terminal:input_echo',
          instanceId: this.instance.instanceId,
          data: input.trimEnd(), // Remove trailing newline for display
          timestamp: new Date().toISOString()
        });
      }
      
      return success;
    } catch (error) {
      this.broadcaster.broadcast(this.instance.instanceId, {
        type: 'terminal:error',
        instanceId: this.instance.instanceId,
        error: `Failed to send input: ${error}`,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
  
  private handleStdout(data: Buffer): void {
    const output = data.toString('utf8');
    this.instance.outputBytes += data.length;
    this.instance.lastActivity = new Date();
    
    // Broadcast output to frontend
    this.broadcaster.broadcast(this.instance.instanceId, {
      type: 'terminal:output',
      instanceId: this.instance.instanceId,
      data: output,
      stream: 'stdout',
      timestamp: new Date().toISOString()
    });
  }
  
  private handleStderr(data: Buffer): void {
    const output = data.toString('utf8');
    this.instance.outputBytes += data.length;
    this.instance.lastActivity = new Date();
    
    // Broadcast error output to frontend
    this.broadcaster.broadcast(this.instance.instanceId, {
      type: 'terminal:output', 
      instanceId: this.instance.instanceId,
      data: output,
      stream: 'stderr',
      timestamp: new Date().toISOString()
    });
  }
  
  private handleStdinError(error: Error): void {
    console.error(`Stdin error for ${this.instance.instanceId}:`, error);
    
    this.broadcaster.broadcast(this.instance.instanceId, {
      type: 'terminal:error',
      instanceId: this.instance.instanceId,
      error: `Input stream error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2.2 SSE Broadcasting System
```typescript
interface SSEEvent {
  type: string;
  instanceId: string;
  data?: string;
  stream?: 'stdout' | 'stderr';
  error?: string;
  timestamp: string;
  metadata?: {
    bytes: number;
    encoding: string;
    sequence: number;
  };
}

class ProcessSSEBroadcaster {
  private connections = new Map<string, Set<Response>>();
  private eventSequence = new Map<string, number>();
  
  addConnection(instanceId: string, response: Response): void {
    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, new Set());
      this.eventSequence.set(instanceId, 0);
    }
    
    this.connections.get(instanceId)!.add(response);
    
    // Send initial connection event
    this.sendToConnection(response, {
      type: 'terminal:connected',
      instanceId,
      data: `Connected to Claude instance ${instanceId}`,
      timestamp: new Date().toISOString(),
      metadata: {
        bytes: 0,
        encoding: 'utf8',
        sequence: 0
      }
    });
  }
  
  broadcast(instanceId: string, event: SSEEvent): void {
    const connections = this.connections.get(instanceId);
    if (!connections || connections.size === 0) {
      return;
    }
    
    // Add sequence number
    const sequence = (this.eventSequence.get(instanceId) || 0) + 1;
    this.eventSequence.set(instanceId, sequence);
    
    const enhancedEvent: SSEEvent = {
      ...event,
      metadata: {
        bytes: Buffer.byteLength(event.data || '', 'utf8'),
        encoding: 'utf8',
        sequence,
        ...event.metadata
      }
    };
    
    // Send to all connections for this instance
    const deadConnections = new Set<Response>();
    
    connections.forEach(connection => {
      try {
        this.sendToConnection(connection, enhancedEvent);
      } catch (error) {
        console.error(`Failed to broadcast to connection:`, error);
        deadConnections.add(connection);
      }
    });
    
    // Clean up dead connections
    deadConnections.forEach(connection => {
      connections.delete(connection);
    });
  }
  
  private sendToConnection(response: Response, event: SSEEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    response.write(data);
  }
  
  removeConnection(instanceId: string, response: Response): void {
    const connections = this.connections.get(instanceId);
    if (connections) {
      connections.delete(response);
      
      // Clean up empty instance entries
      if (connections.size === 0) {
        this.connections.delete(instanceId);
        this.eventSequence.delete(instanceId);
      }
    }
  }
  
  disconnectAllConnections(instanceId: string): void {
    const connections = this.connections.get(instanceId);
    if (!connections) return;
    
    // Send disconnect event to all connections
    const disconnectEvent: SSEEvent = {
      type: 'terminal:disconnected',
      instanceId,
      data: 'Process terminated',
      timestamp: new Date().toISOString()
    };
    
    connections.forEach(connection => {
      try {
        this.sendToConnection(connection, disconnectEvent);
        connection.end();
      } catch (error) {
        console.error('Error during connection cleanup:', error);
      }
    });
    
    // Clear all connections
    this.connections.delete(instanceId);
    this.eventSequence.delete(instanceId);
  }
}
```

## 3. BACKEND API INTEGRATION

### 3.1 Enhanced Instance Creation
```typescript
// Replace current mock implementation in simple-backend.js
app.post('/api/claude/instances', async (req, res) => {
  const { command, workingDirectory } = req.body;
  
  try {
    console.log(`🆕 Creating real Claude process: ${JSON.stringify({ command, workingDirectory })}`);
    
    // Spawn real process instead of mock
    const spawnConfig: SpawnConfig = {
      command: command || ['claude'],
      workingDirectory: workingDirectory || '/workspaces/agent-feed/prod',
      environment: {
        ...process.env,
        // Add Claude-specific environment variables
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
        CLAUDE_WORKSPACE: workingDirectory
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      metadata: {
        type: determineInstanceType(command),
        label: generateInstanceLabel(command),
        tags: ['user-created'],
        creator: 'web-ui'
      }
    };
    
    const instance = await processSpawner.spawn(spawnConfig);
    
    // Setup I/O handler for real process
    const ioHandler = new ProcessIOHandler(instance, sseBroadcaster);
    ioHandlers.set(instance.instanceId, ioHandler);
    
    res.status(201).json({
      success: true,
      instanceId: instance.instanceId,
      instance: {
        id: instance.instanceId,
        name: instance.metadata.label,
        status: instance.status,
        pid: instance.pid, // Real PID from system
        startTime: instance.startTime,
        command: instance.command,
        workingDirectory: instance.workingDirectory
      },
      message: 'Real Claude process created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Real process creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 3.2 Real Terminal Input Processing
```typescript
// Replace mock processTerminalCommand with real I/O
app.post('/api/claude/instances/:instanceId/terminal/input', async (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Real terminal input for ${instanceId}: ${input}`);
  
  try {
    const ioHandler = ioHandlers.get(instanceId);
    if (!ioHandler) {
      throw new Error(`No I/O handler found for instance ${instanceId}`);
    }
    
    // Send input to real process stdin
    const success = ioHandler.sendInput(input + '\n');
    
    if (!success) {
      throw new Error('Failed to send input to process');
    }
    
    res.json({
      success: true,
      instanceId,
      input,
      processed: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Failed to send input to ${instanceId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 3.3 Real SSE Stream Endpoint  
```typescript
// Enhanced SSE endpoint with real process output
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`📡 Real SSE stream requested for: ${instanceId}`);
  
  // Verify instance exists
  const instance = processRegistry.get(instanceId);
  if (!instance) {
    res.status(404).json({ error: 'Instance not found' });
    return;
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Add connection to broadcaster
  sseBroadcaster.addConnection(instanceId, res);
  
  // Send initial prompt from real process if available
  if (instance.status === 'running') {
    sseBroadcaster.broadcast(instanceId, {
      type: 'terminal:ready',
      instanceId,
      data: `Claude Code session ready - PID: ${instance.pid}\n`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 Real SSE connection closed for: ${instanceId}`);
    sseBroadcaster.removeConnection(instanceId, res);
  });
  
  req.on('error', (error) => {
    console.error(`❌ Real SSE error for ${instanceId}:`, error);
    sseBroadcaster.removeConnection(instanceId, res);
  });
});
```

## 4. FRONTEND INTEGRATION

### 4.1 Enhanced Event Handling
```typescript
// Update ClaudeInstanceManager.tsx event handlers
const setupEventHandlers = () => {
  if (!socket) return;
  
  // Handle real terminal output (replaces mock handling)
  on('terminal:output', (data) => {
    if (data.instanceId && data.data) {
      console.log(`📺 Real process output for ${data.instanceId.slice(0,8)}: ${data.stream || 'stdout'}`);
      
      // Format output with stream indicator
      const streamPrefix = data.stream === 'stderr' ? '[ERR] ' : '';
      const formattedOutput = streamPrefix + data.data;
      
      setOutput(prev => ({
        ...prev,
        [data.instanceId]: (prev[data.instanceId] || '') + formattedOutput
      }));
      
      // Auto-scroll terminal
      scrollTerminalToBottom(data.instanceId);
    }
  });
  
  // Handle input echo from real process
  on('terminal:input_echo', (data) => {
    if (data.instanceId && data.data) {
      console.log(`📤 Real input echo for ${data.instanceId.slice(0,8)}`);
      
      setOutput(prev => ({
        ...prev,
        [data.instanceId]: (prev[data.instanceId] || '') + `$ ${data.data}\n`
      }));
    }
  });
  
  // Handle real process connection status
  on('terminal:connected', (data) => {
    console.log(`🔌 Real process connected: ${data.instanceId}`);
    setConnectionType(`Connected to PID ${data.instanceId.split('-').pop()}`);
  });
  
  on('terminal:disconnected', (data) => {
    console.log(`🔌 Real process disconnected: ${data.instanceId}`);
    setConnectionType('Process Terminated');
  });
  
  // Handle real process errors
  on('terminal:error', (data) => {
    console.error(`❌ Real process error: ${data.instanceId}`, data.error);
    setError(data.error || 'Process communication error');
  });
};
```

### 4.2 Input Handling Enhancement
```typescript
const sendInput = async () => {
  if (!selectedInstance || !input.trim()) return;
  
  try {
    // Send input to real process via HTTP
    const response = await fetch(`${apiUrl}/api/claude/instances/${selectedInstance}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input.trim() })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to send input');
    }
    
    setInput(''); // Clear input on successful send
    
  } catch (error) {
    console.error('Failed to send input to real process:', error);
    setError('Failed to send input to process');
    
    // Show error in terminal
    setOutput(prev => ({
      ...prev,
      [selectedInstance]: (prev[selectedInstance] || '') + 
        `\n[ERROR] Failed to send input: ${error}\n`
    }));
  }
};
```

## 5. ANSI ESCAPE SEQUENCE HANDLING

### 5.1 ANSI Processing
```typescript
interface ANSIProcessor {
  processOutput(data: string): {
    cleanText: string;
    ansiCodes: string[];
    formatting: {
      color?: string;
      backgroundColor?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
  };
}

class TerminalANSIProcessor implements ANSIProcessor {
  private ansiRegex = /\x1b\[[0-9;]*m/g;
  
  processOutput(data: string): any {
    const ansiCodes: string[] = [];
    const matches = data.match(this.ansiRegex);
    
    if (matches) {
      ansiCodes.push(...matches);
    }
    
    const cleanText = data.replace(this.ansiRegex, '');
    const formatting = this.parseANSIFormatting(ansiCodes);
    
    return {
      cleanText,
      ansiCodes,
      formatting
    };
  }
  
  private parseANSIFormatting(codes: string[]): any {
    // Parse ANSI codes for color, style, etc.
    const formatting: any = {};
    
    codes.forEach(code => {
      const numericCode = code.match(/\x1b\[([0-9;]*)m/);
      if (numericCode) {
        const codeValue = parseInt(numericCode[1]);
        
        switch (codeValue) {
          case 1: formatting.bold = true; break;
          case 3: formatting.italic = true; break;
          case 4: formatting.underline = true; break;
          case 31: formatting.color = 'red'; break;
          case 32: formatting.color = 'green'; break;
          case 33: formatting.color = 'yellow'; break;
          // Add more ANSI code mappings
        }
      }
    });
    
    return formatting;
  }
}
```

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Output Buffering
```typescript
class OutputBuffer {
  private buffer: string = '';
  private bufferSize: number = 0;
  private maxBufferSize: number = 8192; // 8KB
  private flushTimeout: NodeJS.Timeout | null = null;
  private broadcaster: ProcessSSEBroadcaster;
  private instanceId: string;
  
  constructor(instanceId: string, broadcaster: ProcessSSEBroadcaster) {
    this.instanceId = instanceId;
    this.broadcaster = broadcaster;
  }
  
  addOutput(data: string): void {
    this.buffer += data;
    this.bufferSize += Buffer.byteLength(data, 'utf8');
    
    // Flush if buffer is full
    if (this.bufferSize >= this.maxBufferSize) {
      this.flush();
      return;
    }
    
    // Schedule flush after short delay
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    this.flushTimeout = setTimeout(() => this.flush(), 50);
  }
  
  private flush(): void {
    if (this.buffer.length === 0) return;
    
    this.broadcaster.broadcast(this.instanceId, {
      type: 'terminal:output',
      instanceId: this.instanceId,
      data: this.buffer,
      timestamp: new Date().toISOString(),
      metadata: {
        bytes: this.bufferSize,
        encoding: 'utf8',
        sequence: 0 // Will be set by broadcaster
      }
    });
    
    this.buffer = '';
    this.bufferSize = 0;
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}
```

## 7. ERROR HANDLING & RECOVERY

### 7.1 Stream Error Recovery
```typescript
class StreamErrorRecovery {
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 3;
  
  handleStreamError(instanceId: string, error: Error): void {
    const attempts = this.reconnectAttempts.get(instanceId) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      console.warn(`Stream error for ${instanceId}, attempting recovery (${attempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.attemptStreamRecovery(instanceId);
      }, 1000 * Math.pow(2, attempts)); // Exponential backoff
      
      this.reconnectAttempts.set(instanceId, attempts + 1);
    } else {
      console.error(`Stream recovery failed for ${instanceId} after ${attempts} attempts`);
      this.broadcastFatalError(instanceId, error);
    }
  }
  
  private async attemptStreamRecovery(instanceId: string): Promise<void> {
    try {
      const instance = processRegistry.get(instanceId);
      if (!instance || instance.status !== 'running') {
        throw new Error('Process is no longer running');
      }
      
      // Recreate I/O handler
      const newIOHandler = new ProcessIOHandler(instance, sseBroadcaster);
      ioHandlers.set(instanceId, newIOHandler);
      
      console.log(`✅ Stream recovery successful for ${instanceId}`);
      this.reconnectAttempts.delete(instanceId);
      
    } catch (error) {
      console.error(`Stream recovery attempt failed for ${instanceId}:`, error);
      this.handleStreamError(instanceId, error as Error);
    }
  }
  
  private broadcastFatalError(instanceId: string, error: Error): void {
    sseBroadcaster.broadcast(instanceId, {
      type: 'terminal:fatal_error',
      instanceId,
      error: `Stream communication failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
```

This specification transforms the mock terminal system into a real process I/O integration with proper stream handling, error recovery, and performance optimization.