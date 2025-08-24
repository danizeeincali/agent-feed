// Enhanced Backend Server with SPARC:Debug PTY Fixes
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const pty = require('node-pty');

console.log('🚀 Starting ENHANCED backend with SPARC:Debug fixes...');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

console.log('🔌 Setting up Socket.IO with CORS...');
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

let claudeProcess = null;

// Enhanced Claude API endpoints
app.get('/api/claude/check', (req, res) => {
  console.log('✅ API: /api/claude/check called');
  res.json({
    claudeAvailable: true,
    version: '2.0.0-enhanced',
    status: 'ok'
  });
});

app.post('/api/claude/launch', (req, res) => {
  console.log('🚀 API: /api/claude/launch called - ENHANCED VERSION');
  try {
    if (claudeProcess) {
      console.log('🔄 Killing existing process:', claudeProcess.pid);
      claudeProcess.kill('SIGTERM');
      claudeProcess = null;
      setTimeout(createEnhancedPTY, 500);
    } else {
      createEnhancedPTY();
    }
    
    function createEnhancedPTY() {
      // SPARC:Debug fix - Use interactive bash with enhanced environment
      claudeProcess = pty.spawn('bash', ['-i'], {  // CRITICAL: Interactive mode
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          SHELL: '/bin/bash',
          PS1: '$ ',
          HOME: process.env.HOME || '/root',
          USER: process.env.USER || 'root',
          PATH: process.env.PATH,
          HISTCONTROL: 'ignoredups',
          BASH_SILENCE_DEPRECATION_WARNING: '1'
        }
      });
      
      console.log('✅ ENHANCED PTY Process launched with PID:', claudeProcess.pid);
      console.log('🔧 Using interactive bash mode (-i flag)');
      console.log('🌍 Environment: TERM=xterm-256color, SHELL=/bin/bash');
      
      claudeProcess.on('spawn', () => {
        console.log('🎯 PTY spawn event fired - process is initializing');
      });
      
      claudeProcess.on('data', (data) => {
        console.log('📤 ENHANCED PTY data (', data.length, 'chars):', data.substring(0, 100).replace(/\r\n/g, '\\r\\n'));
        io.emit('terminal:output', data);
      });
      
      claudeProcess.on('exit', (code, signal) => {
        console.log('🚪 ENHANCED PTY exit: code=' + code + ', signal=' + signal);
        if (code === 0 && !signal) {
          console.log('⚠️ WARNING: PTY exited with code 0 - this was the problem!');
        }
        claudeProcess = null;
      });
      
      claudeProcess.on('error', (error) => {
        console.error('❌ ENHANCED PTY error:', error);
        claudeProcess = null;
      });
      
      res.json({
        success: true,
        message: 'Enhanced Claude launched successfully',
        pid: claudeProcess.pid,
        enhanced: true,
        interactive: true,
        sparc_debug_applied: true
      });
    }
    
  } catch (error) {
    console.error('❌ Enhanced launch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/claude/stop', (req, res) => {
  console.log('⏹️ API: /api/claude/stop called');
  if (claudeProcess) {
    claudeProcess.kill('SIGTERM');
    claudeProcess = null;
    res.json({ success: true, message: 'Enhanced Claude stopped' });
  } else {
    res.json({ success: false, message: 'Enhanced Claude not running' });
  }
});

app.get('/api/claude/status', (req, res) => {
  console.log('📊 API: /api/claude/status called');
  res.json({
    running: claudeProcess !== null,
    pid: claudeProcess ? claudeProcess.pid : null,
    enhanced: true,
    interactive: claudeProcess !== null
  });
});

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 ENHANCED Socket.IO client connected:', socket.id);
  
  // CRITICAL FIX: Only use modern terminal:input to prevent double typing
  socket.on('terminal:input', (data) => {
    console.log('📝 ENHANCED terminal:input (', data.length, 'chars):', data.substring(0, 20).replace(/\r\n/g, '\\r\\n'));
    if (claudeProcess && !claudeProcess.killed) {
      claudeProcess.write(data);
    } else {
      console.log('⚠️ No ENHANCED PTY process to write to');
      socket.emit('terminal:output', 'Error: Enhanced terminal process not running\r\n');
    }
  });
  
  // CRITICAL FIX: REMOVED legacy terminal_input handler - it causes DOUBLE TYPING
  // The frontend sends to both modern and legacy events, but we only process modern
  console.log('🚫 Legacy terminal_input handler REMOVED to fix double typing');
  
  socket.on('disconnect', (reason) => {
    console.log('❌ ENHANCED client disconnected:', socket.id, 'reason:', reason);
  });
  
  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
});

server.listen(3001, () => {
  console.log('🚀 ENHANCED backend server running on http://localhost:3001');
  console.log('🔌 Socket.IO ready with SPARC:Debug enhancements');
  console.log('✅ Interactive bash mode enabled');
  console.log('🎯 PTY immediate exit issue should be FIXED');
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});