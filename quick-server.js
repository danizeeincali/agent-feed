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
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Quick server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO enabled`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
});