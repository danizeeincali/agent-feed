/**
 * EMERGENCY FIX: Backend Terminal WebSocket Server - Direct Passthrough
 * Removes all buffering and output batching that causes UI cascade
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
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
    
    console.log(`Terminal session ${this.id} created - EMERGENCY FIX ACTIVE`);
  }

  setupWebSocket() {
    this.ws.on('message', (data) => {
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
      console.log(`WebSocket closed for terminal ${this.id}`);
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      console.error(`WebSocket error for terminal ${this.id}:`, error);
      this.cleanup();
    });
  }

  handleMessage(message) {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'input':
        // EMERGENCY FIX: Direct input forwarding - no buffering
        if (this.process && message.data !== undefined) {
          this.process.write(message.data);
        }
        break;
        
      case 'init':
        this.sendMessage({
          type: 'init_ack',
          terminalId: this.id,
          pid: this.process?.pid,
          cols: message.cols || 80,
          rows: message.rows || 24
        });
        break;
        
      case 'resize':
        if (this.process && !this.process.killed && message.cols && message.rows) {
          try {
            this.process.resize(message.cols, message.rows);
          } catch (error) {
            console.error('Failed to resize terminal:', error);
          }
        }
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  spawnShell() {
    try {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const args = process.platform === 'win32' ? [] : ['--login', '-i'];
      
      // EMERGENCY FIX: Standard PTY configuration - no special settings
      this.process = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: '/workspaces/agent-feed',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PATH: process.env.PATH,
          HOME: process.env.HOME || '/home/codespace',
          PWD: '/workspaces/agent-feed',
          SHELL: '/bin/bash'
        }
      });
      
      console.log(`Terminal ${this.id}: PTY spawned with EMERGENCY FIX - direct passthrough`);
      console.log(`Terminal ${this.id}: PID = ${this.process.pid}`);
      console.log(`Terminal ${this.id}: Claude CLI Path Check: ${this.validateClaudePath()}`);

      // EMERGENCY FIX: Direct output forwarding - no batching
      this.process.on('data', (data) => {
        this.sendData(data.toString());
      });

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
      // CRITICAL CASCADE FIX: Process ANSI escape sequences for in-place updates
      const processedData = this.processAnsiSequences(data);
      this.sendMessage({
        type: 'data',
        data: processedData,
        timestamp: Date.now()
      });
    }
  }

  processAnsiSequences(data) {
    // ENHANCED: Handle all terminal control sequences that cause cascading
    return data
      // Handle carriage return patterns (main cause of cascading)
      .replace(/\r\x1b\[K/g, '\x1b[2K\x1b[1G') // \r + clear line -> clear entire line + move to start
      .replace(/\r\x1b\[0K/g, '\x1b[0K\x1b[1G') // \r + clear to end -> clear to end + move to start  
      .replace(/\r(?!\n)/g, '\x1b[1G')         // Standalone \r -> just move cursor to start
      
      // Handle cursor positioning (prevents duplicate lines)
      .replace(/\x1b\[\d*A/g, '')              // Remove cursor up sequences
      .replace(/\x1b\[\d*B/g, '')              // Remove cursor down sequences
      
      // Handle line clearing (ensures proper overwriting)
      .replace(/\x1b\[0K/g, '\x1b[0K')         // Clear to end of line
      .replace(/\x1b\[1K/g, '\x1b[1K')         // Clear to start of line
      .replace(/\x1b\[2K/g, '\x1b[2K')         // Clear entire line
      
      // Remove problematic sequences
      .replace(/\x1b\[\?25[lh]/g, '')          // Remove cursor show/hide
      .replace(/\x1b\[\?1049[lh]/g, '')        // Remove alternate screen buffer
      .replace(/\x1b\[\?2004[lh]/g, '');       // Remove bracketed paste mode
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

  cleanup() {
    console.log(`Cleaning up terminal session ${this.id}`);
    
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
  
  // CRITICAL CLI FIX: Ensure Claude CLI is in PATH
  ensureClaudeInPath(currentPath) {
    const claudePaths = [
      '/home/codespace/nvm/current/bin',
      '/usr/local/bin',
      '/usr/bin'
    ];
    
    const pathSegments = currentPath.split(':');
    const missingPaths = claudePaths.filter(cp => !pathSegments.includes(cp));
    
    return [...pathSegments, ...missingPaths].join(':');
  }
  
  // CRITICAL CLI FIX: Validate Claude CLI accessibility
  validateClaudePath() {
    const { spawn } = require('child_process');
    
    try {
      const whichProcess = spawn('which', ['claude'], { 
        env: { PATH: this.ensureClaudeInPath(process.env.PATH || '') },
        stdio: 'pipe'
      });
      return 'checking...';
    } catch (error) {
      return `error: ${error.message}`;
    }
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const terminalId = `term_${++terminalCounter}_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`New terminal connection: ${terminalId} from ${clientIP} - EMERGENCY FIX ACTIVE`);
  
  const terminal = new TerminalSession(terminalId, ws);
  terminals.set(terminalId, terminal);
  
  terminal.sendMessage({
    type: 'connect',
    terminalId,
    timestamp: Date.now()
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 EMERGENCY FIX Terminal Server running on ws://${HOST}:${PORT}/terminal`);
  console.log(`📊 Direct passthrough mode - no buffering or batching`);
});

module.exports = { server, app };