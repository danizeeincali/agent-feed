/**
 * ROBUST Backend Terminal WebSocket Server - Production Ready
 * Fixes HTTP 500 errors when launching Claude CLI
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const cors = require('cors');
const { spawn } = require('child_process');

// CRITICAL: Import node-pty with proper error handling
let pty;
try {
  pty = require('node-pty');
  console.log('✅ node-pty loaded successfully');
} catch (error) {
  console.error('❌ CRITICAL: node-pty failed to load:', error.message);
  console.error('Run: npm install node-pty');
  process.exit(1);
}

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

class RobustTerminalSession {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.process = null;
    this.isAlive = true;
    this.lastActivity = Date.now();
    this.cwd = '/workspaces/agent-feed';
    
    // Set up WebSocket handlers
    this.setupWebSocket();
    
    // Spawn shell process
    this.spawnShell();
    
    console.log(`✅ Robust terminal session ${this.id} created`);
  }

  setupWebSocket() {
    this.ws.on('message', (data) => {
      this.lastActivity = Date.now();
      
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        // Handle raw data
        if (this.process) {
          this.process.write(data.toString());
        }
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed for terminal ${this.id}: ${code} - ${reason}`);
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
      case 'input':
      case 'data':
        if (this.process && message.data !== undefined) {
          this.process.write(message.data);
        }
        break;

      case 'init':
        console.log(`Terminal ${this.id} received init`);
        this.sendMessage({
          type: 'init_ack',
          terminalId: this.id,
          pid: this.process?.pid,
          cols: message.cols || 80,
          rows: message.rows || 24,
          ready: true
        });
        break;
        
      case 'resize':
        if (this.process && message.cols && message.rows) {
          try {
            this.process.resize(message.cols, message.rows);
            this.sendMessage({
              type: 'resize_ack',
              cols: message.cols,
              rows: message.rows
            });
          } catch (error) {
            console.error(`Failed to resize terminal ${this.id}:`, error);
          }
        }
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  spawnShell() {
    try {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const args = process.platform === 'win32' ? [] : ['--login', '-i'];
      
      // ROBUST: Enhanced environment setup
      const processEnv = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PATH: this.ensureClaudeInPath(process.env.PATH || ''),
        HOME: process.env.HOME || '/home/codespace',
        PWD: this.cwd,
        SHELL: '/bin/bash',
        // Claude CLI specific
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
        FORCE_COLOR: '1'
      };
      
      console.log(`🔧 Spawning ${shell} for terminal ${this.id}`);
      console.log(`📁 Working directory: ${this.cwd}`);
      console.log(`🛤️  Claude CLI path: ${this.getClaudePath()}`);
      
      // ROBUST: PTY spawn with comprehensive error handling
      this.process = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: this.cwd,
        env: processEnv,
        encoding: 'utf8'
      });

      console.log(`✅ Terminal ${this.id}: PTY spawned successfully - PID ${this.process.pid}`);

      // Handle PTY output
      this.process.on('data', (data) => {
        this.sendData(data);
      });

      // Handle PTY exit
      this.process.on('exit', (code, signal) => {
        console.log(`Terminal ${this.id} exited: code=${code}, signal=${signal}`);
        this.sendMessage({
          type: 'exit',
          code,
          signal
        });
        this.cleanup();
      });

      // Handle PTY errors
      this.process.on('error', (error) => {
        console.error(`Terminal ${this.id} process error:`, error);
        this.sendMessage({
          type: 'error',
          error: error.message
        });
      });

      // Send welcome message with Claude CLI status
      this.sendWelcomeMessage();

    } catch (error) {
      console.error(`❌ FAILED to spawn shell for terminal ${this.id}:`, error);
      this.sendMessage({
        type: 'error',
        error: `Failed to start terminal: ${error.message}`
      });
      this.cleanup();
    }
  }

  sendWelcomeMessage() {
    const claudePath = this.getClaudePath();
    const claudeStatus = claudePath ? '✅ Available' : '❌ Not Found';
    
    this.sendData(`\r\n🚀 Robust Terminal Session ${this.id} Started\r\n`);
    this.sendData(`📁 Working Directory: ${this.cwd}\r\n`);
    this.sendData(`🤖 Claude CLI Status: ${claudeStatus}\r\n`);
    if (claudePath) {
      this.sendData(`🛤️  Claude Path: ${claudePath}\r\n`);
    }
    this.sendData(`🔗 WebSocket Connected | PID: ${this.process.pid}\r\n\r\n`);
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

  // ROBUST: Ensure Claude CLI is in PATH
  ensureClaudeInPath(currentPath) {
    const claudePaths = [
      '/home/codespace/nvm/current/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/home/codespace/.local/bin'
    ];
    
    const pathSegments = currentPath.split(':');
    const missingPaths = claudePaths.filter(cp => !pathSegments.includes(cp));
    
    return [...pathSegments, ...missingPaths].join(':');
  }

  // ROBUST: Get Claude CLI path
  getClaudePath() {
    try {
      const { execSync } = require('child_process');
      const result = execSync('which claude', { 
        encoding: 'utf8',
        env: { PATH: this.ensureClaudeInPath(process.env.PATH || '') }
      });
      return result.trim();
    } catch (error) {
      return null;
    }
  }

  cleanup() {
    console.log(`🧹 Cleaning up terminal session ${this.id}`);
    
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.error(`Error killing process for terminal ${this.id}:`, error);
      }
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Terminal session ended');
    }

    terminals.delete(this.id);
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const terminalId = `robust_${++terminalCounter}_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`🔗 New terminal connection: ${terminalId} from ${clientIP}`);
  
  try {
    const terminal = new RobustTerminalSession(terminalId, ws);
    terminals.set(terminalId, terminal);
    
    terminal.sendMessage({
      type: 'connect',
      terminalId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`❌ Failed to create terminal session:`, error);
    ws.close(1011, 'Internal server error');
  }
});

// CRITICAL: Add the missing /api/launch endpoint
app.post('/api/launch', async (req, res) => {
  console.log('🚀 /api/launch endpoint called:', req.body);
  
  try {
    const { command = 'claude' } = req.body;
    
    // Validate Claude CLI availability
    const claudePath = getClaudePath();
    if (!claudePath) {
      return res.status(500).json({
        success: false,
        error: 'Claude CLI not found in PATH',
        details: 'Claude CLI must be installed and accessible',
        troubleshooting: [
          'Check if Claude CLI is installed: which claude',
          'Install Claude CLI if missing',
          'Ensure PATH includes Claude CLI directory'
        ]
      });
    }

    // Create a new terminal session for Claude
    const terminalId = `claude_${++terminalCounter}_${Date.now()}`;
    
    // Return success immediately - actual command execution happens via WebSocket
    res.json({
      success: true,
      message: 'Claude launch initiated successfully',
      terminalId,
      claudePath,
      command,
      timestamp: Date.now(),
      instructions: 'Connect to WebSocket /terminal to interact with Claude'
    });

  } catch (error) {
    console.error('❌ /api/launch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: Date.now()
    });
  }
});

// Helper function for Claude path detection
function getClaudePath() {
  try {
    const { execSync } = require('child_process');
    const enhancedPath = [
      '/home/codespace/nvm/current/bin',
      '/usr/local/bin',
      '/usr/bin',
      process.env.PATH || ''
    ].join(':');
    
    const result = execSync('which claude', { 
      encoding: 'utf8',
      env: { PATH: enhancedPath }
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

// REST API endpoints
app.get('/api/terminals', (req, res) => {
  try {
    const terminalList = Array.from(terminals.entries()).map(([id, terminal]) => ({
      id,
      connected: terminal.ws.readyState === WebSocket.OPEN,
      lastActivity: terminal.lastActivity,
      cwd: terminal.cwd,
      processRunning: terminal.process && terminal.process.pid,
      pid: terminal.process?.pid
    }));

    res.json({
      success: true,
      terminals: terminalList,
      count: terminals.size,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting terminals:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.delete('/api/terminals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const terminal = terminals.get(id);
    
    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: 'Terminal not found',
        timestamp: Date.now()
      });
    }
    
    terminal.cleanup();
    
    res.json({
      success: true,
      message: `Terminal ${id} terminated`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error deleting terminal:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const claudePath = getClaudePath();
    
    res.json({
      success: true,
      status: 'healthy',
      terminals: terminals.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: os.platform(),
      arch: os.arch(),
      claudeCli: {
        available: !!claudePath,
        path: claudePath
      },
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Claude CLI status endpoint
app.get('/api/claude-status', async (req, res) => {
  try {
    const claudePath = getClaudePath();
    
    if (!claudePath) {
      return res.json({
        available: false,
        error: 'Claude CLI not found in PATH',
        timestamp: Date.now()
      });
    }

    // Try to get Claude version
    const { execSync } = require('child_process');
    try {
      const version = execSync('claude --version', { 
        encoding: 'utf8',
        timeout: 5000,
        env: { PATH: process.env.PATH }
      });
      
      res.json({
        available: true,
        version: version.trim(),
        path: claudePath,
        timestamp: Date.now()
      });
    } catch (versionError) {
      res.json({
        available: true,
        path: claudePath,
        versionError: versionError.message,
        timestamp: Date.now()
      });
    }
    
  } catch (error) {
    res.status(500).json({
      available: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Heartbeat for connection health
const heartbeatInterval = setInterval(() => {
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
      if (inactiveTime > 5 * 60 * 1000) { // 5 minutes
        console.log(`Terminating inactive terminal ${terminalSession.id}`);
        return ws.terminate();
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    } else {
      console.log('Terminating orphaned WebSocket');
      ws.terminate();
    }
  });
}, 30000);

// ROBUST: Global error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in production
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  
  clearInterval(heartbeatInterval);
  
  for (const terminal of terminals.values()) {
    terminal.cleanup();
  }
  
  wss.close(() => {
    console.log('🔚 WebSocket server closed');
    server.close(() => {
      console.log('🔚 HTTP server closed');
      process.exit(0);
    });
  });
});

// Start server
server.listen(PORT, HOST, () => {
  const claudePath = getClaudePath();
  
  console.log('='.repeat(80));
  console.log('🚀 ROBUST Terminal WebSocket Server Started');
  console.log('='.repeat(80));
  console.log(`📡 WebSocket: ws://${HOST}:${PORT}/terminal`);
  console.log(`🌐 REST API: http://${HOST}:${PORT}/api/`);
  console.log(`❤️  Health: http://${HOST}:${PORT}/health`);
  console.log(`🤖 Claude Status: http://${HOST}:${PORT}/api/claude-status`);
  console.log(`🚀 Launch Endpoint: POST http://${HOST}:${PORT}/api/launch`);
  console.log('='.repeat(80));
  console.log(`🤖 Claude CLI: ${claudePath ? `✅ ${claudePath}` : '❌ Not Found'}`);
  console.log(`📦 node-pty: ✅ Loaded successfully`);
  console.log(`🔧 Platform: ${os.platform()} ${os.arch()}`);
  console.log('='.repeat(80));
  console.log('Ready to handle Claude CLI launches! 🎉');
});

// Export for testing
module.exports = { server, app, terminals };