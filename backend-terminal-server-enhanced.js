/**
 * Enhanced Backend Terminal WebSocket Server with PTY Support
 * Provides proper terminal emulation for Claude CLI and other interactive tools
 */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
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

class EnhancedTerminalSession {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.ptyProcess = null;
    this.isAlive = true;
    this.lastActivity = Date.now();
    this.cwd = process.env.PWD || process.cwd();
    this.cols = 80;
    this.rows = 24;
    
    // Set up WebSocket handlers
    this.setupWebSocket();
    
    // Spawn PTY process
    this.spawnPtyShell();
    
    // Set up cleanup
    this.setupCleanup();
    
    console.log(`Enhanced terminal session ${this.id} created with PTY`);
  }

  setupWebSocket() {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        // Handle raw data (common for terminal input)
        if (this.ptyProcess && message.data) {
          this.ptyProcess.write(data.toString());
          this.lastActivity = Date.now();
        }
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed for terminal ${this.id} with code ${code}, reason: ${reason}`);
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
    
    this.ws.on('ping', () => {
      this.isAlive = true;
      this.lastActivity = Date.now();
      this.ws.pong();
    });
  }

  handleMessage(message) {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'data':
      case 'input':
        if (this.ptyProcess && message.data) {
          console.log(`Terminal ${this.id} received input:`, JSON.stringify(message.data));
          this.ptyProcess.write(message.data);
        }
        break;

      case 'init':
        console.log(`Terminal ${this.id} received init message:`, message);
        this.cols = message.cols || 80;
        this.rows = message.rows || 24;
        
        if (this.ptyProcess) {
          this.ptyProcess.resize(this.cols, this.rows);
        }
        
        this.sendMessage({
          type: 'init_ack',
          terminalId: this.id,
          pid: this.ptyProcess?.pid,
          cols: this.cols,
          rows: this.rows,
          ready: true,
          timestamp: Date.now()
        });
        break;
        
      case 'resize':
        if (this.ptyProcess && message.cols && message.rows) {
          try {
            this.cols = message.cols;
            this.rows = message.rows;
            this.ptyProcess.resize(this.cols, this.rows);
            this.sendMessage({
              type: 'resize_ack',
              cols: this.cols,
              rows: this.rows
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

  spawnPtyShell() {
    try {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      
      this.ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: this.cols,
        rows: this.rows,
        cwd: this.cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          // Ensure Claude CLI has proper environment
          FORCE_COLOR: '1',
          NO_COLOR: undefined
        }
      });

      // Handle PTY output
      this.ptyProcess.onData((data) => {
        this.sendData(data);
      });

      // Handle PTY exit
      this.ptyProcess.onExit((exitCode) => {
        console.log(`Terminal ${this.id} PTY process exited with code ${exitCode.exitCode}, signal ${exitCode.signal}`);
        this.sendMessage({
          type: 'exit',
          code: exitCode.exitCode,
          signal: exitCode.signal
        });
        this.cleanup();
      });

      // Send enhanced welcome message
      this.sendData(`\r\n🚀 Enhanced Terminal Session ${this.id} Started (PTY Mode)\r\n`);
      this.sendData(`📁 Working Directory: ${this.cwd}\r\n`);
      this.sendData(`🔗 WebSocket Connected | PTY Process ID: ${this.ptyProcess.pid}\r\n`);
      this.sendData(`🤖 Claude CLI Ready (Interactive Mode Supported)\r\n\r\n`);

    } catch (error) {
      console.error(`Failed to spawn PTY shell for terminal ${this.id}:`, error);
      this.sendMessage({
        type: 'error',
        error: `Failed to start enhanced terminal: ${error.message}`
      });
      this.cleanup();
    }
  }

  sendData(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.sendMessage({
          type: 'data',
          data,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Failed to send data to terminal ${this.id}:`, error);
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
    }, 60000);
  }

  cleanup() {
    console.log(`Cleaning up enhanced terminal session ${this.id}`);
    
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Kill PTY process
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (error) {
        console.error(`Error killing PTY process for terminal ${this.id}:`, error);
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
  const terminalId = `pty_term_${++terminalCounter}_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`New enhanced terminal connection: ${terminalId} from ${clientIP}`);
  
  // Create enhanced terminal session
  const terminal = new EnhancedTerminalSession(terminalId, ws);
  terminals.set(terminalId, terminal);
  
  // Send connection confirmation
  terminal.sendMessage({
    type: 'connect',
    terminalId,
    enhanced: true,
    features: ['pty', 'resize', 'claude-cli-ready'],
    timestamp: Date.now()
  });
});

// Heartbeat for connection health
setInterval(() => {
  wss.clients.forEach((ws) => {
    let terminalSession = null;
    for (const terminal of terminals.values()) {
      if (terminal.ws === ws) {
        terminalSession = terminal;
        break;
      }
    }
    
    if (terminalSession) {
      const inactiveTime = Date.now() - terminalSession.lastActivity;
      if (inactiveTime > 5 * 60 * 1000) {
        console.log(`Terminating inactive enhanced WebSocket for terminal ${terminalSession.id}`);
        return ws.terminate();
      }
      ws.ping();
    } else {
      console.log('Terminating orphaned WebSocket connection');
      ws.terminate();
    }
  });
}, 60000);

// REST API endpoints
app.get('/api/terminals', (req, res) => {
  const terminalList = Array.from(terminals.entries()).map(([id, terminal]) => ({
    id,
    connected: terminal.ws.readyState === WebSocket.OPEN,
    lastActivity: terminal.lastActivity,
    cwd: terminal.cwd,
    processRunning: terminal.ptyProcess && terminal.ptyProcess.pid,
    enhanced: true,
    ptyPid: terminal.ptyProcess?.pid
  }));

  res.json({
    success: true,
    terminals: terminalList,
    count: terminals.size,
    enhanced: true
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
    message: `Enhanced terminal ${id} terminated`
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
    arch: os.arch(),
    enhanced: true,
    features: ['pty', 'claude-cli-ready']
  });
});

// Claude CLI specific endpoint
app.get('/api/claude-cli-status', (req, res) => {
  const { spawn } = require('child_process');
  
  try {
    const claudeCheck = spawn('claude', ['--version'], { 
      timeout: 5000,
      stdio: 'pipe' 
    });
    
    let version = '';
    claudeCheck.stdout.on('data', (data) => {
      version += data.toString();
    });
    
    claudeCheck.on('close', (code) => {
      res.json({
        available: code === 0,
        version: version.trim(),
        path: process.env.PATH.split(':').find(p => p.includes('claude')),
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    res.json({
      available: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down enhanced terminal server gracefully');
  
  for (const terminal of terminals.values()) {
    terminal.cleanup();
  }
  
  wss.close(() => {
    console.log('Enhanced WebSocket server closed');
    server.close(() => {
      console.log('Enhanced HTTP server closed');
      process.exit(0);
    });
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Enhanced Terminal WebSocket Server (PTY) running on ws://${HOST}:${PORT}/terminal`);
  console.log(`📊 REST API available on http://${HOST}:${PORT}/api/`);
  console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🤖 Claude CLI status: http://${HOST}:${PORT}/api/claude-cli-status`);
  console.log(`✨ Features: PTY support, Interactive Claude CLI, Terminal resize`);
});

module.exports = { server, app };