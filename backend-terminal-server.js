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
        if (this.process && !this.process.killed) {
          this.process.stdin.write(data.toString());
        }
      }
    });

    this.ws.on('close', () => {
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      console.error(`WebSocket error for terminal ${this.id}:`, error);
      this.cleanup();
    });

    // Heartbeat
    this.ws.on('pong', () => {
      this.isAlive = true;
      this.lastActivity = Date.now();
    });
  }

  handleMessage(message) {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'data':
        if (this.process && !this.process.killed && message.data) {
          this.process.stdin.write(message.data);
        }
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
      const args = process.platform === 'win32' ? [] : ['-i'];
      
      this.process = spawn(shell, args, {
        cwd: this.cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle process output
      this.process.stdout.on('data', (data) => {
        this.sendData(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        this.sendData(data.toString());
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

    // Kill process
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 5000);
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

// Heartbeat to detect broken connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Terminating dead WebSocket connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

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