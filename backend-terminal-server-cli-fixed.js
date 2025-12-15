/**
 * SPARC-FIXED: Backend Terminal WebSocket Server with CLI Detection Fix
 * 
 * SPECIFICATION: Restore Claude CLI detection while maintaining cascade prevention
 * PSEUDOCODE: Enhanced environment validation with CLI path resolution
 * ARCHITECTURE: Terminal server with proper CLI integration
 * REFINEMENT: TDD-validated CLI detection and command execution
 * COMPLETION: Full cascade fix compatibility maintained
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

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

// CLI Detection and Environment Validation
class CLIEnvironmentValidator {
  static async validateClaudeCliAccess() {
    console.log('🔍 SPARC-VALIDATOR: Starting Claude CLI detection...');
    
    const cliPath = await this.findClaudeInPath();
    if (!cliPath) {
      console.warn('⚠️  Claude CLI not found in PATH');
      return { available: false, path: null, error: 'CLI not found in PATH' };
    }
    
    const canExecute = await this.testCliExecution(cliPath);
    if (!canExecute) {
      console.warn('⚠️  Claude CLI found but not executable');
      return { available: false, path: cliPath, error: 'CLI not executable' };
    }
    
    console.log(`✅ Claude CLI validated: ${cliPath}`);
    return { available: true, path: cliPath, error: null };
  }
  
  static async findClaudeInPath() {
    return new Promise((resolve) => {
      const whichProcess = spawn('which', ['claude'], { 
        env: process.env,
        stdio: 'pipe'
      });
      
      let output = '';
      whichProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      whichProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
      
      whichProcess.on('error', () => {
        resolve(null);
      });
    });
  }
  
  static async testCliExecution(cliPath) {
    return new Promise((resolve) => {
      const testProcess = spawn(cliPath, ['--help'], {
        stdio: 'pipe',
        timeout: 5000
      });
      
      testProcess.on('close', (code) => {
        resolve(code === 0 || code === null);
      });
      
      testProcess.on('error', () => {
        resolve(false);
      });
    });
  }
  
  static createEnhancedEnvironment() {
    const currentPath = process.env.PATH || '';
    const claudePaths = [
      '/home/codespace/nvm/current/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/home/codespace/.local/bin'
    ];
    
    // Ensure Claude CLI paths are included
    const pathSegments = currentPath.split(':');
    const enhancedPaths = [...new Set([...pathSegments, ...claudePaths])];
    
    return {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PATH: enhancedPaths.join(':'),
      HOME: process.env.HOME || '/home/codespace',
      PWD: '/workspaces/agent-feed',
      // Add Claude-specific environment
      CLAUDE_CLI_VERSION_CHECK: 'true',
      SHELL: '/bin/bash'
    };
  }
}

// WebSocket server for terminal connections
const wss = new WebSocket.Server({ 
  server,
  path: '/terminal'
});

// Terminal session management
const terminals = new Map();
let terminalCounter = 0;
let cliValidation = null;

class TerminalSession {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.process = null;
    this.isAlive = true;
    this.lastActivity = Date.now();
    this.cwd = process.env.PWD || process.cwd();
    this.cliAvailable = false;
    
    // Set up WebSocket handlers
    this.setupWebSocket();
    
    // Initialize CLI validation
    this.initializeWithCLI();
    
    console.log(`Terminal session ${this.id} created - CLI-FIXED VERSION`);
  }

  async initializeWithCLI() {
    // Validate CLI access before spawning terminal
    if (!cliValidation) {
      cliValidation = await CLIEnvironmentValidator.validateClaudeCliAccess();
    }
    
    this.cliAvailable = cliValidation.available;
    
    if (cliValidation.available) {
      console.log(`✅ Terminal ${this.id}: Claude CLI available at ${cliValidation.path}`);
    } else {
      console.warn(`⚠️  Terminal ${this.id}: Claude CLI issue - ${cliValidation.error}`);
    }
    
    // Spawn shell with enhanced environment
    this.spawnShell();
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
          rows: message.rows || 24,
          cliAvailable: this.cliAvailable,
          cliPath: cliValidation?.path || null
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
        
      case 'cli_test':
        // Test CLI command execution
        this.testCLICommand(message.command || 'claude --version');
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  async testCLICommand(command) {
    if (!this.cliAvailable) {
      this.sendMessage({
        type: 'cli_test_result',
        success: false,
        error: 'Claude CLI not available'
      });
      return;
    }
    
    try {
      const [cmd, ...args] = command.split(' ');
      const testProcess = spawn(cmd, args, {
        env: CLIEnvironmentValidator.createEnhancedEnvironment(),
        cwd: this.cwd,
        stdio: 'pipe'
      });
      
      let output = '';
      let error = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      testProcess.on('close', (code) => {
        this.sendMessage({
          type: 'cli_test_result',
          success: code === 0,
          output: output.trim(),
          error: error.trim() || undefined,
          command
        });
      });
      
    } catch (error) {
      this.sendMessage({
        type: 'cli_test_result',
        success: false,
        error: error.message,
        command
      });
    }
  }

  spawnShell() {
    try {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const args = process.platform === 'win32' ? [] : ['--login', '-i'];
      
      // SPARC-FIX: Enhanced environment with CLI validation
      const enhancedEnv = CLIEnvironmentValidator.createEnhancedEnvironment();
      
      this.process = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: '/workspaces/agent-feed',
        env: enhancedEnv
      });
      
      console.log(`Terminal ${this.id}: PTY spawned with CLI-FIXED environment`);
      console.log(`Terminal ${this.id}: PID = ${this.process.pid}`);
      console.log(`Terminal ${this.id}: CLI Available = ${this.cliAvailable}`);

      // EMERGENCY FIX: Direct output forwarding with cascade prevention
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
    // Handle carriage return + clear line for spinner animations
    // This prevents cascade by ensuring animations update in place
    return data
      .replace(/\r\x1b\[K/g, '\x1b[2K\x1b[1G') // Convert \r\x1b[K to clear line + move cursor
      .replace(/\r(?!\n)/g, '\x1b[1G')         // Convert standalone \r to cursor move
      .replace(/\x1b\[\?25[lh]/g, '');         // Remove cursor show/hide sequences
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
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const terminalId = `term_${++terminalCounter}_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`New terminal connection: ${terminalId} from ${clientIP} - CLI-FIXED VERSION`);
  
  const terminal = new TerminalSession(terminalId, ws);
  terminals.set(terminalId, terminal);
  
  terminal.sendMessage({
    type: 'connect',
    terminalId,
    timestamp: Date.now()
  });
});

// Enhanced health check with CLI validation
app.get('/health', async (req, res) => {
  if (!cliValidation) {
    cliValidation = await CLIEnvironmentValidator.validateClaudeCliAccess();
  }
  
  res.json({
    success: true,
    status: 'healthy',
    terminals: terminals.size,
    claudeCli: {
      available: cliValidation.available,
      path: cliValidation.path,
      error: cliValidation.error
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      workingDir: process.cwd()
    }
  });
});

// CLI test endpoint
app.post('/api/cli/test', async (req, res) => {
  const { command = 'claude --version' } = req.body;
  
  if (!cliValidation) {
    cliValidation = await CLIEnvironmentValidator.validateClaudeCliAccess();
  }
  
  if (!cliValidation.available) {
    return res.json({
      success: false,
      error: cliValidation.error,
      available: false
    });
  }
  
  try {
    const [cmd, ...args] = command.split(' ');
    const testProcess = spawn(cmd, args, {
      env: CLIEnvironmentValidator.createEnhancedEnvironment(),
      cwd: '/workspaces/agent-feed',
      stdio: 'pipe'
    });
    
    let output = '';
    let error = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    testProcess.on('close', (code) => {
      res.json({
        success: code === 0,
        output: output.trim(),
        error: error.trim() || undefined,
        command,
        available: true,
        exitCode: code
      });
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      command,
      available: true
    });
  }
});

// Start server with CLI validation
async function startServer() {
  console.log('🚀 SPARC-IMPLEMENTATION: Starting CLI-Fixed Terminal Server...');
  
  // Validate CLI before starting
  cliValidation = await CLIEnvironmentValidator.validateClaudeCliAccess();
  
  if (cliValidation.available) {
    console.log(`✅ Claude CLI validated: ${cliValidation.path}`);
  } else {
    console.warn(`⚠️  Claude CLI issue: ${cliValidation.error}`);
    console.warn('   Terminal will work, but Claude commands may fail');
  }
  
  server.listen(PORT, HOST, () => {
    console.log(`🚀 CLI-FIXED Terminal Server running on ws://${HOST}:${PORT}/terminal`);
    console.log(`📊 Cascade prevention: ACTIVE`);
    console.log(`🔧 Claude CLI: ${cliValidation.available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    console.log(`🧪 CLI Test endpoint: http://${HOST}:${PORT}/api/cli/test`);
  });
}

// Initialize server
startServer().catch(console.error);

module.exports = { server, app, CLIEnvironmentValidator };