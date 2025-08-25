/**
 * Backend Terminal WebSocket Server
 * Provides WebSocket terminal access with process spawning and management
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const cors = require('cors');
const pty = require('node-pty');

// Server configuration
const PORT = process.env.TERMINAL_PORT || 3002;
const HOST = process.env.TERMINAL_HOST || 'localhost';

// Create Express app
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// WebSocket server for terminal connections
const wss = new WebSocket.Server({ 
  server,
  path: '/terminal'
});

// Terminal session management
const terminals = new Map();
let terminalCounter = 0;

class TerminalSession {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.process = null;
    this.isAlive = true;
    this.lastActivity = Date.now();
    this.cwd = process.env.PWD || process.cwd();
    
    // CRITICAL FIX: Add input buffering for line-based processing
    this.inputBuffer = '';
    this.isBuffering = false;
    this.pendingCommand = null;
    
    // CRITICAL FIX: Add output buffering to reduce UI redraws
    this.outputBuffer = '';
    this.outputTimer = null;
    
    // Set up WebSocket handlers
    this.setupWebSocket();
    
    // Spawn shell process
    this.spawnShell();
    
    // Set up cleanup
    this.setupCleanup();
    
    console.log(`Terminal session ${this.id} created`);
  }

  setupWebSocket() {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        // Handle raw data (common for terminal input)
        if (this.process) {
          // CRITICAL FIX: Normalize line endings for Unix terminals
          const rawData = data.toString();
          const normalizedData = rawData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          console.log(`Terminal ${this.id} normalized raw data:`, JSON.stringify(normalizedData));
          this.process.write(normalizedData); // node-pty uses write() instead of stdin.write()
        }
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed for terminal ${this.id} with code ${code}, reason: ${reason}`);
      // CRITICAL FIX: Don't cleanup immediately - allow process to continue
      setTimeout(() => {
        console.log(`Delayed cleanup for terminal ${this.id}`);
        this.cleanup();
      }, 10000); // 10 second delay to allow command completion
    });

    this.ws.on('error', (error) => {
      console.error(`WebSocket error for terminal ${this.id}:`, error);
      this.cleanup();
    });

    // Heartbeat - handle both pong and ping
    this.ws.on('pong', () => {
      this.isAlive = true;
      this.lastActivity = Date.now();
    });
    
    this.ws.on('ping', () => {
      this.isAlive = true;
      this.lastActivity = Date.now();
      this.ws.pong(); // Respond to ping with pong
    });
  }

  handleMessage(message) {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'data':
        if (this.process && message.data) {
          // CRITICAL FIX: Normalize line endings for Unix terminals
          // Replace \r\n with \n and standalone \r with \n to prevent command corruption
          const normalizedData = message.data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          console.log(`Terminal ${this.id} normalized data:`, JSON.stringify(normalizedData));
          this.process.write(normalizedData); // node-pty uses write() instead of stdin.write()
        }
        break;

      case 'input':
        // CRITICAL FIX: Force line-based input - reject character-by-character to prevent UI redraws
        if (this.process && message.data !== undefined) {
          const inputLength = message.data.length;
          
          console.log(`Terminal ${this.id} INPUT VALIDATION:`, {
            length: inputLength,
            isCharByChar: inputLength === 1 && message.data.charCodeAt(0) >= 32 && message.data.charCodeAt(0) < 127,
            chars: Array.from(message.data).map(c => `'${c}'(${c.charCodeAt(0)})`).join(' '),
            currentBuffer: JSON.stringify(this.inputBuffer)
          });
          
          // CRITICAL: Check if this is problematic character-by-character input
          if (inputLength === 1 && message.data.charCodeAt(0) >= 32 && message.data.charCodeAt(0) < 127) {
            console.log(`Terminal ${this.id} CHARACTER-BY-CHARACTER DETECTED - Buffering to prevent UI redraws`);
          }
          
          this.handleBufferedInput(message.data);
        } else {
          console.warn(`Terminal ${this.id} INPUT BUFFER - Invalid input:`, {
            hasProcess: !!this.process,
            dataType: typeof message.data,
            dataValue: message.data
          });
        }
        break;

      case 'init':
        // Handle frontend initialization message
        console.log(`Terminal ${this.id} received init message:`, message);
        this.sendMessage({
          type: 'init_ack',
          terminalId: this.id,
          pid: this.process?.pid,
          cols: message.cols || 80,
          rows: message.rows || 24,
          ready: true,
          timestamp: Date.now()
        });
        break;
        
      case 'resize':
        if (this.process && !this.process.killed && message.cols && message.rows) {
          try {
            this.process.kill('SIGWINCH');
            // Note: Actual terminal resizing would require pty module
            this.sendMessage({
              type: 'resize_ack',
              cols: message.cols,
              rows: message.rows
            });
          } catch (error) {
            console.error('Failed to resize terminal:', error);
          }
        }
        break;
        
      case 'ping':
        this.sendMessage({ type: 'pong', timestamp: Date.now() });
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  spawnShell() {
    try {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const args = process.platform === 'win32' ? [] : ['--login', '-i'];
      
      // CRITICAL FIX: Configure node-pty with proper echo control for line-based input
      this.process = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: '/workspaces/agent-feed',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PATH: process.env.PATH,  // Keep full PATH with Claude CLI
          HOME: process.env.HOME || '/home/codespace',
          PWD: '/workspaces/agent-feed'  // Set working directory
        },
        // CRITICAL FIX: PTY settings for line-based input buffering
        experimentalUseConpty: false,  // Disable Windows experimental features
        useConpty: false,              // Use traditional PTY
        handleFlowControl: true,       // Enable proper flow control
        encoding: 'utf8',              // Use UTF-8 encoding for proper character handling
        windowsVerbatimArguments: false,
        windowsHide: false
      });
      
      console.log(`Terminal ${this.id}: PTY spawned with line-based input buffering`);
      console.log(`Terminal ${this.id}: PID = ${this.process.pid}`);
      console.log(`Terminal ${this.id}: Shell = ${shell}, Args = ${JSON.stringify(args)}`);

      // CRITICAL FIX: Configure terminal attributes for line-based processing
      this.configureTerminalAttributes();

      // CRITICAL FIX: Clean terminal initialization without command pollution
      // Do NOT send commands after process starts - they interfere with interactive applications
      console.log(`Terminal ${this.id}: Terminal initialized for line-based interactive applications`);

      // CRITICAL ECHO DEBUG: Handle process output with UI redraw prevention
      this.process.on('data', (data) => {
        const dataStr = data.toString();
        console.log(`Terminal ${this.id} PTY OUTPUT:`, {
          length: dataStr.length,
          preview: JSON.stringify(dataStr.substring(0, 50)),
          charCodes: Array.from(dataStr.substring(0, 10)).map(c => `'${c}'(${c.charCodeAt(0)})`).join(' ')
        });
        
        // CRITICAL: Buffer output to reduce UI redraws
        this.bufferOutput(dataStr);
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Terminal ${this.id} process exited with code ${code}, signal ${signal}`);
        this.sendMessage({
          type: 'exit',
          code,
          signal
        });
        this.cleanup();
      });

      this.process.on('error', (error) => {
        console.error(`Terminal ${this.id} process error:`, error);
        this.sendMessage({
          type: 'error',
          error: error.message
        });
      });

      // Send welcome message
      this.sendData(`\r\n🖥️  Terminal Session ${this.id} Started\r\n`);
      this.sendData(`📁  Working Directory: ${this.cwd}\r\n`);
      this.sendData(`🔗  Connected via WebSocket\r\n\r\n`);

    } catch (error) {
      console.error(`Failed to spawn shell for terminal ${this.id}:`, error);
      this.sendMessage({
        type: 'error',
        error: `Failed to start terminal: ${error.message}`
      });
      this.cleanup();
    }
  }

  sendData(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      // Send as both structured message and raw data for compatibility
      try {
        this.sendMessage({
          type: 'data',
          data,
          timestamp: Date.now()
        });
      } catch (error) {
        // Fallback to raw data
        this.ws.send(data);
      }
    }
  }

  sendMessage(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to terminal ${this.id}:`, error);
      }
    }
  }

  // CRITICAL CASCADE FIX: Advanced output buffering to eliminate UI redraws
  bufferOutput(data) {
    this.outputBuffer += data;
    
    // Clear existing timer to reset batching window
    if (this.outputTimer) {
      clearTimeout(this.outputTimer);
    }
    
    // CRITICAL: Clean character encoding artifacts that cause "[O[I" corruption
    const cleanedOutput = this.cleanOutputArtifacts(this.outputBuffer);
    
    // Enhanced batching with cascade prevention
    this.outputTimer = setTimeout(() => {
      if (cleanedOutput.length > 0) {
        console.log(`Terminal ${this.id} CASCADE_ELIMINATION - Sending clean batched output:`, {
          originalLength: this.outputBuffer.length,
          cleanedLength: cleanedOutput.length,
          artifactsRemoved: this.outputBuffer.length - cleanedOutput.length,
          batchDelay: '100ms'
        });
        
        this.sendData(cleanedOutput);
        this.outputBuffer = '';
      }
    }, 100); // Increased to 100ms for better batching and cascade elimination
  }
  
  // CRITICAL: Clean character encoding artifacts and escape sequences
  cleanOutputArtifacts(data) {
    let cleaned = data;
    
    // Remove problematic character sequences that cause UI corruption
    cleaned = cleaned.replace(/\[O\[I/g, ''); // Remove "[O[I" artifacts
    cleaned = cleaned.replace(/\x1b\[\?2004[hl]/g, ''); // Remove bracketed paste mode sequences
    cleaned = cleaned.replace(/\x1b\[>4;1m/g, ''); // Remove problematic escape sequences
    cleaned = cleaned.replace(/\x1b\[\?1049[hl]/g, ''); // Remove alternate screen sequences
    
    // Fix carriage return issues that cause redraw cascade
    cleaned = cleaned.replace(/\r\n/g, '\n'); // Normalize line endings
    cleaned = cleaned.replace(/\r/g, '\n'); // Convert remaining \r to \n
    return cleaned;
  }

  // CRITICAL FIX: Configure terminal for line-based processing to prevent UI redraws
  configureTerminalAttributes() {
    if (this.process && !this.process.killed) {
      try {
        // Configure terminal for line-based input processing
        // This prevents character-by-character echo that causes UI redraws
        const sttyCommand = 'stty icanon echo\n'; // Enable canonical mode for line-based input
        console.log(`Terminal ${this.id}: Configuring for line-based input to prevent UI redraws`);
        
        // Wait a moment for shell to be ready, then configure
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.write(sttyCommand);
            console.log(`Terminal ${this.id}: Terminal configured for line-based processing`);
          }
        }, 100);
      } catch (error) {
        console.error(`Terminal ${this.id}: Failed to configure terminal attributes:`, error);
      }
    }
  }

  // CRITICAL FIX: ABSOLUTE line-based input - ELIMINATE UI cascade completely
  handleBufferedInput(data) {
    console.log(`Terminal ${this.id} UI_CASCADE_FIX - INPUT:`, {
      length: data.length,
      data: JSON.stringify(data),
      preventCascade: true
    });
    
    // CRITICAL CASCADE PREVENTION: Process input to completely prevent UI redraws
    for (const char of data) {
      const charCode = char.charCodeAt(0);
      
      if (charCode === 13 || charCode === 10) { // Enter key (\r or \n)
        // CRITICAL: Send COMPLETE buffered line to eliminate cascade
        if (this.inputBuffer.length > 0) {
          const completeLine = this.inputBuffer + '\n';
          console.log(`Terminal ${this.id} CASCADE_PREVENTION - Sending complete line:`, JSON.stringify(completeLine));
          
          try {
            // Disable local echo completely - backend provides all output
            this.process.write(completeLine);
            this.inputBuffer = '';
            console.log(`Terminal ${this.id} CASCADE_ELIMINATED - Single line operation completed`);
          } catch (error) {
            console.error(`Terminal ${this.id} CASCADE_FIX_ERROR:`, error);
          }
        } else {
          // Empty line - immediate send
          this.process.write('\n');
        }
      } else if (charCode === 127 || charCode === 8) { // Backspace
        // CRITICAL: Handle backspace in buffer to prevent UI redraw
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          console.log(`Terminal ${this.id} CASCADE_FIX - Backspace buffered`);
        }
      } else if (charCode === 3) { // Ctrl+C
        console.log(`Terminal ${this.id} CASCADE_FIX - Interrupt signal`);
        this.process.write(char);
        this.inputBuffer = '';
      } else if (charCode === 4) { // Ctrl+D
        console.log(`Terminal ${this.id} CASCADE_FIX - EOF signal`);
        this.process.write(char);
      } else if (charCode >= 32 && charCode < 127) { // Printable ASCII
        // CRITICAL CASCADE FIX: Buffer ALL printable chars, send NOTHING until newline
        this.inputBuffer += char;
        console.log(`Terminal ${this.id} CASCADE_PREVENTION - Char buffered, no echo sent`);
        
        // ABSOLUTELY NO CHARACTER ECHO - this eliminates the UI cascade completely
        // Frontend handles local display, backend sends complete processed output
      } else {
        // Control characters - send immediately but don't buffer
        console.log(`Terminal ${this.id} CASCADE_FIX - Control char:`, charCode);
        this.process.write(char);
      }
    }
  }

  setupCleanup() {
    // Auto-cleanup inactive terminals
    this.cleanupTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
        console.log(`Terminal ${this.id} inactive for ${inactiveTime}ms, cleaning up`);
        this.cleanup();
      }
    }, 60000); // Check every minute
  }

  cleanup() {
    console.log(`Cleaning up terminal session ${this.id}`);
    
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // CRITICAL FIX: Don't kill process immediately, let commands complete
    if (this.process) {
      try {
        console.log(`Allowing terminal ${this.id} process to complete naturally`);
        // Don't send SIGTERM immediately - let process finish
        setTimeout(() => {
          if (this.process) {
            console.log(`Force killing process for terminal ${this.id}`);
            this.process.kill('SIGTERM'); // node-pty kill method
            setTimeout(() => {
              if (this.process) {
                this.process.kill('SIGKILL');
              }
            }, 5000);
          }
        }, 30000); // 30 second delay for command completion
      } catch (error) {
        console.error(`Error killing process for terminal ${this.id}:`, error);
      }
    }

    // Close WebSocket
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Terminal session ended');
    }

    // Remove from terminals map
    terminals.delete(this.id);
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const terminalId = `term_${++terminalCounter}_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`New terminal connection: ${terminalId} from ${clientIP}`);
  
  // Create terminal session
  const terminal = new TerminalSession(terminalId, ws);
  terminals.set(terminalId, terminal);
  
  // Send connection confirmation
  terminal.sendMessage({
    type: 'connect',
    terminalId,
    timestamp: Date.now()
  });
});

// Heartbeat to detect broken connections (less aggressive)
setInterval(() => {
  wss.clients.forEach((ws) => {
    // Find the terminal session for this WebSocket
    let terminalSession = null;
    for (const terminal of terminals.values()) {
      if (terminal.ws === ws) {
        terminalSession = terminal;
        break;
      }
    }
    
    if (terminalSession) {
      // Check activity within last 5 minutes, not just ping/pong
      const inactiveTime = Date.now() - terminalSession.lastActivity;
      if (inactiveTime > 5 * 60 * 1000) { // 5 minutes of inactivity
        console.log(`Terminating inactive WebSocket connection for terminal ${terminalSession.id} (inactive for ${inactiveTime}ms)`);
        return ws.terminate();
      }
      
      // Send ping but don't immediately mark as dead
      ws.ping();
    } else {
      // Orphaned WebSocket without terminal session
      console.log('Terminating orphaned WebSocket connection');
      ws.terminate();
    }
  });
}, 60000); // Check every minute instead of 30 seconds

// REST API endpoints
app.get('/api/terminals', (req, res) => {
  const terminalList = Array.from(terminals.entries()).map(([id, terminal]) => ({
    id,
    connected: terminal.ws.readyState === WebSocket.OPEN,
    lastActivity: terminal.lastActivity,
    cwd: terminal.cwd,
    processRunning: terminal.process && !terminal.process.killed
  }));

  res.json({
    success: true,
    terminals: terminalList,
    count: terminals.size
  });
});

app.delete('/api/terminals/:id', (req, res) => {
  const { id } = req.params;
  const terminal = terminals.get(id);
  
  if (!terminal) {
    return res.status(404).json({
      success: false,
      message: 'Terminal not found'
    });
  }
  
  terminal.cleanup();
  
  res.json({
    success: true,
    message: `Terminal ${id} terminated`
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    terminals: terminals.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: os.platform(),
    arch: os.arch()
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit on uncaught exceptions in production
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close all terminal sessions
  for (const terminal of terminals.values()) {
    terminal.cleanup();
  }
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Terminal WebSocket Server running on ws://${HOST}:${PORT}/terminal`);
  console.log(`📊 REST API available on http://${HOST}:${PORT}/api/`);
  console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
});

// Export for testing
module.exports = { server, app };