/**
 * Terminal Integration for Real Claude Processes
 * Handles bidirectional I/O streaming via SSE for real Claude process interaction
 */

const EventEmitter = require('events');
const stripAnsi = require('strip-ansi');

class TerminalIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      bufferSize: options.bufferSize || 8192,
      maxHistoryLines: options.maxHistoryLines || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      inputTimeout: options.inputTimeout || 10000,
      ansiEnabled: options.ansiEnabled !== false, // Default to true
      echoInput: options.echoInput !== false, // Default to true
      ...options
    };
    
    // Terminal state management
    this.terminals = new Map(); // instanceId -> TerminalState
    this.sseConnections = new Map(); // instanceId -> Set of SSE connections
    
    // I/O buffers and history
    this.outputBuffers = new Map(); // instanceId -> circular buffer
    this.inputHistory = new Map(); // instanceId -> command history
    this.terminalHistory = new Map(); // instanceId -> full terminal history
    
    // Stream processing
    this.streamProcessors = new Map(); // instanceId -> stream processor
    
    console.log('🖥️ Terminal Integration initialized');
  }
  
  // Initialize terminal for a Claude process
  initializeTerminal(instanceId, processInfo) {
    console.log(`🖥️ Initializing terminal for instance: ${instanceId}`);
    
    const terminalState = {
      instanceId,
      processInfo,
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date(),
      cursor: { row: 0, col: 0 },
      dimensions: { rows: 24, cols: 80 }, // Default terminal size
      prompt: '$ ',
      currentInput: '',
      inputMode: 'command', // 'command', 'interactive', 'password'
      status: 'initialized'
    };
    
    this.terminals.set(instanceId, terminalState);
    this.outputBuffers.set(instanceId, []);
    this.inputHistory.set(instanceId, []);
    this.terminalHistory.set(instanceId, []);
    this.sseConnections.set(instanceId, new Set());
    
    // Set up process I/O handlers
    if (processInfo.process) {
      this.attachIOHandlers(instanceId, processInfo.process);
    }
    
    this.emit('terminalInitialized', { instanceId, terminalState });
    return terminalState;
  }
  
  // Attach I/O handlers to Claude process
  attachIOHandlers(instanceId, process) {
    console.log(`🔗 Attaching I/O handlers for instance: ${instanceId}`);
    
    const terminalState = this.terminals.get(instanceId);
    if (!terminalState) return;
    
    // Handle stdout from Claude process
    process.stdout.on('data', (data) => {
      this.handleProcessOutput(instanceId, 'stdout', data);
    });
    
    // Handle stderr from Claude process
    process.stderr.on('data', (data) => {
      this.handleProcessOutput(instanceId, 'stderr', data);
    });
    
    // Handle process close
    process.on('close', (code, signal) => {
      this.handleProcessClose(instanceId, code, signal);
    });
    
    // Handle process error
    process.on('error', (error) => {
      this.handleProcessError(instanceId, error);
    });
    
    terminalState.status = 'connected';
    console.log(`✅ I/O handlers attached for instance: ${instanceId}`);
  }
  
  // Process output from Claude and forward to terminals
  handleProcessOutput(instanceId, stream, data) {
    const terminalState = this.terminals.get(instanceId);
    if (!terminalState || !terminalState.isActive) return;
    
    const rawData = data.toString();
    const cleanData = this.options.ansiEnabled ? rawData : stripAnsi(rawData);
    
    // Update terminal state
    terminalState.lastActivity = new Date();
    
    // Add to output buffer
    this.addToBuffer(instanceId, {
      type: 'output',
      stream,
      data: rawData,
      cleanData,
      timestamp: new Date()
    });
    
    // Add to terminal history
    this.addToHistory(instanceId, {
      type: 'output',
      stream,
      data: cleanData,
      timestamp: new Date()
    });
    
    // Process special control sequences and prompts
    const processedData = this.processControlSequences(instanceId, cleanData);
    
    // Broadcast to all SSE connections
    this.broadcastToTerminals(instanceId, {
      type: 'terminal_output',
      stream,
      data: processedData,
      rawData: this.options.ansiEnabled ? rawData : cleanData,
      instanceId,
      timestamp: new Date().toISOString()
    });
    
    // Detect prompts and update input mode
    this.detectPromptState(instanceId, cleanData);
    
    this.emit('processOutput', { instanceId, stream, data: cleanData });
  }
  
  // Process control sequences and terminal formatting
  processControlSequences(instanceId, data) {
    const terminalState = this.terminals.get(instanceId);
    if (!terminalState) return data;
    
    let processedData = data;
    
    // Handle common ANSI sequences even when ANSI is disabled for SSE
    if (!this.options.ansiEnabled) {
      // Remove cursor movement sequences
      processedData = processedData.replace(/\x1b\[[0-9;]*[HfABCD]/g, '');
      // Remove color sequences
      processedData = processedData.replace(/\x1b\[[0-9;]*m/g, '');
      // Remove clear screen sequences
      processedData = processedData.replace(/\x1b\[2J/g, '');
    }
    
    // Handle carriage return and line feed properly
    processedData = processedData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return processedData;
  }
  
  // Detect prompt state changes
  detectPromptState(instanceId, data) {
    const terminalState = this.terminals.get(instanceId);
    if (!terminalState) return;
    
    // Common Claude prompts
    const promptPatterns = [
      /\$\s*$/, // Shell prompt
      />\s*$/, // Command continuation
      /\?\s*$/, // Question prompt
      /Enter.*:\s*$/, // Input request
      /Password.*:\s*$/, // Password prompt
      /\[Y\/n\]\s*$/, // Yes/No confirmation
    ];
    
    const lastLine = data.split('\n').pop() || '';
    
    for (const pattern of promptPatterns) {
      if (pattern.test(lastLine.trim())) {
        if (lastLine.includes('Password') || lastLine.includes('password')) {
          terminalState.inputMode = 'password';
        } else if (lastLine.includes('[Y/n]') || lastLine.includes('?')) {
          terminalState.inputMode = 'interactive';
        } else {
          terminalState.inputMode = 'command';
        }
        
        terminalState.prompt = lastLine.trim();
        this.broadcastPromptUpdate(instanceId, terminalState);
        break;
      }
    }
  }
  
  // Handle process close
  handleProcessClose(instanceId, code, signal) {
    console.log(`🔌 Process closed for instance ${instanceId}: code=${code}, signal=${signal}`);
    
    const terminalState = this.terminals.get(instanceId);
    if (terminalState) {
      terminalState.status = 'closed';
      terminalState.exitCode = code;
      terminalState.exitSignal = signal;
      terminalState.isActive = false;
    }
    
    this.broadcastToTerminals(instanceId, {
      type: 'process_closed',
      instanceId,
      code,
      signal,
      message: `Process exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
      timestamp: new Date().toISOString()
    });
    
    this.emit('processClose', { instanceId, code, signal });
  }
  
  // Handle process error
  handleProcessError(instanceId, error) {
    console.error(`❌ Process error for instance ${instanceId}:`, error);
    
    const terminalState = this.terminals.get(instanceId);
    if (terminalState) {
      terminalState.status = 'error';
      terminalState.lastError = error;
    }
    
    this.broadcastToTerminals(instanceId, {
      type: 'process_error',
      instanceId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    this.emit('processError', { instanceId, error });
  }
  
  // Add SSE connection for terminal
  addSSEConnection(instanceId, response) {
    console.log(`📡 Adding SSE connection for instance: ${instanceId}`);
    
    if (!this.sseConnections.has(instanceId)) {
      this.sseConnections.set(instanceId, new Set());
    }
    
    const connections = this.sseConnections.get(instanceId);
    connections.add(response);
    
    // Send initial terminal state
    this.sendInitialState(instanceId, response);
    
    // Handle connection close
    response.on('close', () => {
      console.log(`🔌 SSE connection closed for instance: ${instanceId}`);
      connections.delete(response);
    });
    
    response.on('error', (error) => {
      console.error(`❌ SSE connection error for instance ${instanceId}:`, error);
      connections.delete(response);
    });
    
    this.emit('sseConnected', { instanceId, connectionCount: connections.size });
  }
  
  // Send initial terminal state to new SSE connection
  sendInitialState(instanceId, response) {
    const terminalState = this.terminals.get(instanceId);
    const history = this.terminalHistory.get(instanceId) || [];
    
    try {
      // Send connection confirmation
      response.write(`data: ${JSON.stringify({
        type: 'terminal_connected',
        instanceId,
        message: `✅ Terminal connected to Claude instance ${instanceId}`,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      // Send terminal state
      if (terminalState) {
        response.write(`data: ${JSON.stringify({
          type: 'terminal_state',
          instanceId,
          state: {
            status: terminalState.status,
            inputMode: terminalState.inputMode,
            prompt: terminalState.prompt,
            dimensions: terminalState.dimensions,
            uptime: Date.now() - terminalState.startTime.getTime()
          },
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
      
      // Send recent history (last 50 lines)
      const recentHistory = history.slice(-50);
      for (const entry of recentHistory) {
        response.write(`data: ${JSON.stringify({
          type: 'terminal_history',
          instanceId,
          ...entry
        })}\n\n`);
      }
      
      // Send ready signal
      response.write(`data: ${JSON.stringify({
        type: 'terminal_ready',
        instanceId,
        message: 'Terminal ready for input',
        timestamp: new Date().toISOString()
      })}\n\n`);
      
    } catch (error) {
      console.error(`❌ Failed to send initial state for ${instanceId}:`, error);
    }
  }
  
  // Send input to Claude process
  sendInput(instanceId, input) {
    const terminalState = this.terminals.get(instanceId);
    if (!terminalState || !terminalState.isActive) {
      throw new Error(`Terminal not active for instance: ${instanceId}`);
    }
    
    const processInfo = terminalState.processInfo;
    if (!processInfo.process || processInfo.process.killed) {
      throw new Error(`Process not available for instance: ${instanceId}`);
    }
    
    console.log(`⌨️ Sending input to instance ${instanceId}: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`);
    
    // Add to input history
    this.addToInputHistory(instanceId, input);
    
    // Add to terminal history
    this.addToHistory(instanceId, {
      type: 'input',
      data: input,
      timestamp: new Date()
    });
    
    // Echo input to terminals if enabled
    if (this.options.echoInput && terminalState.inputMode !== 'password') {
      this.broadcastToTerminals(instanceId, {
        type: 'terminal_input_echo',
        instanceId,
        data: input,
        timestamp: new Date().toISOString()
      });
    }
    
    // Send to process
    try {
      processInfo.process.stdin.write(input + '\n');
      terminalState.lastActivity = new Date();
      
      this.emit('inputSent', { instanceId, input });
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to send input to process ${instanceId}:`, error);
      this.emit('inputError', { instanceId, error });
      throw error;
    }
  }
  
  // Broadcast message to all terminal connections
  broadcastToTerminals(instanceId, data) {
    const connections = this.sseConnections.get(instanceId);
    if (!connections || connections.size === 0) return;
    
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const deadConnections = [];
    
    for (const connection of connections) {
      try {
        connection.write(message);
      } catch (error) {
        console.error(`❌ Failed to broadcast to connection for ${instanceId}:`, error);
        deadConnections.push(connection);
      }
    }
    
    // Clean up dead connections
    for (const connection of deadConnections) {
      connections.delete(connection);
    }
  }
  
  // Broadcast prompt update
  broadcastPromptUpdate(instanceId, terminalState) {
    this.broadcastToTerminals(instanceId, {
      type: 'prompt_update',
      instanceId,
      prompt: terminalState.prompt,
      inputMode: terminalState.inputMode,
      timestamp: new Date().toISOString()
    });
  }
  
  // Buffer management
  addToBuffer(instanceId, entry) {
    if (!this.outputBuffers.has(instanceId)) {
      this.outputBuffers.set(instanceId, []);
    }
    
    const buffer = this.outputBuffers.get(instanceId);
    buffer.push(entry);
    
    // Keep buffer size manageable
    if (buffer.length > this.options.bufferSize) {
      buffer.splice(0, buffer.length - this.options.bufferSize);
    }
  }
  
  // History management
  addToHistory(instanceId, entry) {
    if (!this.terminalHistory.has(instanceId)) {
      this.terminalHistory.set(instanceId, []);
    }
    
    const history = this.terminalHistory.get(instanceId);
    history.push(entry);
    
    // Keep history size manageable
    if (history.length > this.options.maxHistoryLines) {
      history.splice(0, history.length - this.options.maxHistoryLines);
    }
  }
  
  // Input history management
  addToInputHistory(instanceId, input) {
    if (!this.inputHistory.has(instanceId)) {
      this.inputHistory.set(instanceId, []);
    }
    
    const history = this.inputHistory.get(instanceId);
    
    // Don't add empty inputs or duplicates
    if (input.trim() && history[history.length - 1] !== input) {
      history.push(input);
      
      // Keep input history size manageable
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
    }
  }
  
  // Get terminal state
  getTerminalState(instanceId) {
    return this.terminals.get(instanceId);
  }
  
  // Get terminal history
  getTerminalHistory(instanceId, limit = 100) {
    const history = this.terminalHistory.get(instanceId) || [];
    return limit ? history.slice(-limit) : history;
  }
  
  // Get input history
  getInputHistory(instanceId) {
    return this.inputHistory.get(instanceId) || [];
  }
  
  // Resize terminal
  resizeTerminal(instanceId, rows, cols) {
    const terminalState = this.terminals.get(instanceId);
    if (terminalState) {
      terminalState.dimensions = { rows, cols };
      
      // Send resize to process if it supports it
      if (terminalState.processInfo.process && terminalState.processInfo.process.stdout.resize) {
        try {
          terminalState.processInfo.process.stdout.resize(cols, rows);
        } catch (error) {
          console.warn(`⚠️ Failed to resize terminal ${instanceId}:`, error);
        }
      }
      
      this.broadcastToTerminals(instanceId, {
        type: 'terminal_resize',
        instanceId,
        dimensions: { rows, cols },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Clean up terminal
  cleanupTerminal(instanceId) {
    console.log(`🧹 Cleaning up terminal for instance: ${instanceId}`);
    
    const terminalState = this.terminals.get(instanceId);
    if (terminalState) {
      terminalState.isActive = false;
    }
    
    // Close all SSE connections
    const connections = this.sseConnections.get(instanceId);
    if (connections) {
      for (const connection of connections) {
        try {
          connection.end();
        } catch (error) {
          // Connection might already be closed
        }
      }
    }
    
    // Clean up data structures
    this.terminals.delete(instanceId);
    this.sseConnections.delete(instanceId);
    this.outputBuffers.delete(instanceId);
    this.inputHistory.delete(instanceId);
    this.terminalHistory.delete(instanceId);
    
    this.emit('terminalCleaned', { instanceId });
  }
  
  // Get statistics
  getStats() {
    return {
      activeTerminals: this.terminals.size,
      totalConnections: Array.from(this.sseConnections.values()).reduce((sum, conns) => sum + conns.size, 0),
      terminalStates: Array.from(this.terminals.entries()).map(([id, state]) => ({
        instanceId: id,
        status: state.status,
        uptime: Date.now() - state.startTime.getTime(),
        connectionCount: this.sseConnections.get(id)?.size || 0,
        lastActivity: state.lastActivity
      }))
    };
  }
  
  // Shutdown all terminals
  shutdown() {
    console.log('🛑 Shutting down terminal integration');
    
    for (const instanceId of this.terminals.keys()) {
      this.cleanupTerminal(instanceId);
    }
    
    this.emit('shutdown');
  }
}

module.exports = TerminalIntegration;