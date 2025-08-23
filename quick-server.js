/**
 * Quick Working Server with Socket.IO Support
 * Fixes the white screen issue by providing proper WebSocket endpoints
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'quick-server'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    api: 'working',
    websocket: 'available',
    timestamp: new Date().toISOString()
  });
});

// Mock API endpoints for the frontend
app.get('/api/agents', (req, res) => {
  res.json([
    { id: 1, name: 'Agent 1', status: 'active', type: 'research' },
    { id: 2, name: 'Agent 2', status: 'inactive', type: 'analysis' }
  ]);
});

app.get('/api/posts', (req, res) => {
  res.json([
    { id: 1, title: 'Sample Post', content: 'This is working!', timestamp: new Date() }
  ]);
});

// Claude Launcher API endpoints
const { spawn } = require('child_process');
const fs = require('fs');

let claudeProcess = null;
let processStatus = {
  isRunning: false,
  status: 'stopped',
  pid: null,
  error: null,
  startedAt: null,
  workingDirectory: '/workspaces/agent-feed/prod'
};

// Ensure prod directory exists
const prodPath = '/workspaces/agent-feed/prod';
if (!fs.existsSync(prodPath)) {
  fs.mkdirSync(prodPath, { recursive: true });
}

// Check Claude availability
app.get('/api/claude/check', (req, res) => {
  const { spawn } = require('child_process');
  const checkProcess = spawn('which', ['claude']);
  
  checkProcess.on('close', (code) => {
    res.json({
      success: true,
      claudeAvailable: code === 0,
      message: code === 0 ? 'Claude Code CLI is available' : 'Claude Code CLI not found',
      workingDirectory: prodPath
    });
  });
});

// Get process status
app.get('/api/claude/status', (req, res) => {
  // Check if process is actually still running
  if (claudeProcess && claudeProcess.killed) {
    processStatus = { ...processStatus, isRunning: false, status: 'stopped' };
    claudeProcess = null;
  }
  
  res.json({
    success: true,
    status: processStatus,
    workingDirectory: prodPath
  });
});

// Launch Claude Code
app.post('/api/claude/launch', (req, res) => {
  console.log('🚀 Launch Claude Code request received');
  
  if (claudeProcess && !claudeProcess.killed) {
    return res.status(400).json({
      success: false,
      message: 'Claude Code is already running',
      status: processStatus
    });
  }

  try {
    // Launch Claude Code in prod directory
    claudeProcess = spawn('claude', [], {
      cwd: prodPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      shell: true
    });

    if (!claudeProcess.pid) {
      throw new Error('Failed to spawn Claude process');
    }

    processStatus = {
      isRunning: true,
      status: 'running',
      pid: claudeProcess.pid,
      error: null,
      startedAt: new Date().toISOString(),
      workingDirectory: prodPath
    };

    // Handle process events
    claudeProcess.on('error', (error) => {
      console.error('Claude process error:', error);
      processStatus = {
        ...processStatus,
        isRunning: false,
        status: 'error',
        error: error.message
      };
    });

    claudeProcess.on('exit', (code, signal) => {
      console.log(`Claude process exited with code ${code}, signal: ${signal}`);
      processStatus = {
        ...processStatus,
        isRunning: false,
        status: code === 0 ? 'stopped' : 'error',
        error: code !== 0 ? `Process exited with code ${code}` : null
      };
      claudeProcess = null;
    });

    // Send initial output to confirm it's working
    claudeProcess.stdout.on('data', (data) => {
      console.log(`Claude stdout: ${data}`);
    });

    claudeProcess.stderr.on('data', (data) => {
      console.error(`Claude stderr: ${data}`);
    });

    res.json({
      success: true,
      message: 'Claude Code launched successfully in /prod directory',
      status: processStatus,
      workingDirectory: prodPath
    });

  } catch (error) {
    console.error('Launch error:', error);
    processStatus = {
      ...processStatus,
      isRunning: false,
      status: 'error',
      error: error.message
    };
    
    res.status(500).json({
      success: false,
      message: 'Failed to launch Claude Code',
      error: error.message,
      status: processStatus
    });
  }
});

// Stop Claude Code
app.post('/api/claude/stop', (req, res) => {
  console.log('🛑 Stop Claude Code request received');
  
  if (!claudeProcess || claudeProcess.killed) {
    processStatus = { ...processStatus, isRunning: false, status: 'stopped' };
    return res.json({
      success: true,
      message: 'Claude Code was not running',
      status: processStatus
    });
  }

  try {
    // Graceful shutdown
    claudeProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (claudeProcess && !claudeProcess.killed) {
        claudeProcess.kill('SIGKILL');
        console.log('Claude process force killed');
      }
    }, 5000);

    processStatus = {
      ...processStatus,
      isRunning: false,
      status: 'stopped',
      error: null
    };
    
    claudeProcess = null;
    
    res.json({
      success: true,
      message: 'Claude Code stopped successfully',
      status: processStatus
    });

  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop Claude Code',
      error: error.message
    });
  }
});

// Terminal session management
const terminalSessions = new Map();
const pty = require('node-pty');
const os = require('os');

// WebSocket terminal streaming class
class TerminalStreaming {
  constructor(io) {
    this.io = io;
    this.sessions = new Map();
    this.setupTerminalNamespace();
  }

  setupTerminalNamespace() {
    const terminalNamespace = this.io.of('/terminal');
    
    terminalNamespace.on('connection', (socket) => {
      console.log(`🖥️  Terminal client connected: ${socket.id}`);
      
      // Create new terminal session
      socket.on('terminal:create', (data) => {
        this.createTerminalSession(socket, data);
      });
      
      // Handle terminal input
      socket.on('terminal:input', (data) => {
        this.handleTerminalInput(socket, data);
      });
      
      // Handle terminal resize
      socket.on('terminal:resize', (data) => {
        this.handleTerminalResize(socket, data);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.cleanupTerminalSession(socket.id);
      });
    });
  }
  
  createTerminalSession(socket, data = {}) {
    try {
      const sessionId = socket.id;
      const { cols = 80, rows = 24, cwd = process.cwd() } = data;
      
      // Determine shell based on OS
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      
      // Create new terminal process
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: parseInt(cols),
        rows: parseInt(rows),
        cwd: cwd,
        env: process.env
      });
      
      // Store session
      this.sessions.set(sessionId, {
        ptyProcess,
        socket,
        sessionId,
        startTime: new Date(),
        lastActivity: new Date()
      });
      
      // Handle terminal output
      ptyProcess.on('data', (data) => {
        socket.emit('terminal:output', {
          sessionId,
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
        
        // Update last activity
        const session = this.sessions.get(sessionId);
        if (session) {
          session.lastActivity = new Date();
        }
      });
      
      // Handle process exit
      ptyProcess.on('exit', (exitCode) => {
        console.log(`Terminal session ${sessionId} exited with code: ${exitCode}`);
        socket.emit('terminal:exit', {
          sessionId,
          exitCode,
          timestamp: new Date().toISOString()
        });
        this.sessions.delete(sessionId);
      });
      
      // Send session created confirmation
      socket.emit('terminal:created', {
        sessionId,
        shell,
        cols,
        rows,
        cwd,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🖥️  Terminal session created: ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      socket.emit('terminal:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  handleTerminalInput(socket, data) {
    const { sessionId, input } = data;
    const session = this.sessions.get(sessionId || socket.id);
    
    if (!session) {
      socket.emit('terminal:error', {
        error: 'Terminal session not found',
        sessionId: sessionId || socket.id,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      session.ptyProcess.write(input);
      session.lastActivity = new Date();
    } catch (error) {
      console.error('Failed to write to terminal:', error);
      socket.emit('terminal:error', {
        error: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  handleTerminalResize(socket, data) {
    const { sessionId, cols, rows } = data;
    const session = this.sessions.get(sessionId || socket.id);
    
    if (!session) {
      socket.emit('terminal:error', {
        error: 'Terminal session not found',
        sessionId: sessionId || socket.id,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      session.ptyProcess.resize(parseInt(cols), parseInt(rows));
      console.log(`Terminal ${sessionId} resized to ${cols}x${rows}`);
    } catch (error) {
      console.error('Failed to resize terminal:', error);
      socket.emit('terminal:error', {
        error: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  cleanupTerminalSession(socketId) {
    const session = this.sessions.get(socketId);
    if (session) {
      try {
        session.ptyProcess.kill();
        console.log(`🖥️  Terminal session cleaned up: ${socketId}`);
      } catch (error) {
        console.error('Error cleaning up terminal session:', error);
      }
      this.sessions.delete(socketId);
    }
  }
  
  // Get session statistics
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(session => ({
        sessionId: session.sessionId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        isAlive: !session.ptyProcess.killed
      }))
    };
  }
}

// Initialize terminal streaming
const terminalStreaming = new TerminalStreaming(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('connected', { 
    message: 'WebSocket connection established', 
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Echo messages for testing
  socket.on('message', (data) => {
    console.log('Message received:', data);
    socket.emit('response', { echo: data, timestamp: new Date() });
  });
  
  // Claude process terminal integration - FIXED PROTOCOL
  socket.on('init', (data) => {
    console.log('🔧 Terminal init received:', data);
    if (!claudeProcess) {
      socket.emit('error', {
        message: 'Claude process not running',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Send connected confirmation with correct event name
    socket.emit('connected', {
      pid: claudeProcess.pid,
      sessionId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Set up Claude process I/O streaming
    if (claudeProcess.stdout) {
      claudeProcess.stdout.on('data', (data) => {
        socket.emit('output', {
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });
    }
    
    if (claudeProcess.stderr) {
      claudeProcess.stderr.on('data', (data) => {
        socket.emit('output', {
          data: `\x1b[31m${data.toString()}\x1b[0m`,
          timestamp: new Date().toISOString()
        });
      });
    }
  });
  
  // Handle terminal input - FIXED MESSAGE FORMAT
  socket.on('message', (message) => {
    console.log('🖥️ Terminal message received:', message);
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      if (data.type === 'input') {
        if (!claudeProcess || claudeProcess.killed) {
          socket.emit('error', {
            message: 'Claude process not available',
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        console.log('📝 Sending to Claude stdin:', data.data);
        claudeProcess.stdin.write(data.data);
      }
    } catch (error) {
      console.error('Terminal message error:', error);
      socket.emit('error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Terminal session statistics endpoint
app.get('/api/terminal/stats', (req, res) => {
  const stats = terminalStreaming.getSessionStats();
  res.json({
    success: true,
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// Terminal session management endpoints
app.post('/api/terminal/kill-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = terminalStreaming.sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
      sessionId
    });
  }
  
  try {
    session.ptyProcess.kill();
    terminalStreaming.sessions.delete(sessionId);
    res.json({
      success: true,
      message: 'Terminal session killed',
      sessionId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      sessionId
    });
  }
});

// Cleanup stale terminal sessions periodically
setInterval(() => {
  const now = new Date();
  const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of terminalStreaming.sessions.entries()) {
    const lastActivity = session.lastActivity.getTime();
    if (now.getTime() - lastActivity > STALE_THRESHOLD) {
      console.log(`🧹 Cleaning up stale terminal session: ${sessionId}`);
      try {
        session.ptyProcess.kill();
        terminalStreaming.sessions.delete(sessionId);
      } catch (error) {
        console.error('Error cleaning up stale session:', error);
      }
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Enhanced Claude process stdout/stderr handling
if (claudeProcess) {
  claudeProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`Claude stdout: ${output}`);
    
    // Broadcast to all connected terminal clients
    io.of('/terminal').emit('claude:output', {
      type: 'stdout',
      data: output,
      timestamp: new Date().toISOString()
    });
    
    // Also broadcast to main namespace for backward compatibility
    io.emit('claude:terminal:output', {
      type: 'stdout',
      data: output,
      timestamp: new Date().toISOString()
    });
  });
  
  claudeProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`Claude stderr: ${output}`);
    
    // Broadcast to all connected terminal clients
    io.of('/terminal').emit('claude:output', {
      type: 'stderr',
      data: output,
      timestamp: new Date().toISOString()
    });
    
    // Also broadcast to main namespace for backward compatibility
    io.emit('claude:terminal:output', {
      type: 'stderr',
      data: output,
      timestamp: new Date().toISOString()
    });
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Quick server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO enabled`);
  console.log(`🖥️  Terminal WebSocket namespace: /terminal`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`📊 Terminal Stats: http://localhost:${PORT}/api/terminal/stats`);
});