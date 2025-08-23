/**
 * Simplified Server for Testing Simple Claude Launcher
 * No complex features - just process management
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Simple process state
let currentProcess = null;
let processStatus = {
  isRunning: false,
  status: 'stopped',
  pid: null,
  error: null,
  startedAt: null,
  workingDirectory: path.resolve(process.cwd(), 'prod')
};

// Ensure /prod directory exists
const prodPath = path.resolve(process.cwd(), 'prod');
if (!fs.existsSync(prodPath)) {
  fs.mkdirSync(prodPath, { recursive: true });
  console.log(`✅ Created /prod directory: ${prodPath}`);
}

// Health check
app.get('/api/simple-claude/health', (req, res) => {
  res.json({
    success: true,
    message: 'Simple Claude Launcher API is healthy',
    timestamp: new Date().toISOString(),
    workingDirectory: prodPath
  });
});

// Check Claude availability
app.get('/api/simple-claude/check', (req, res) => {
  // For testing, simulate Claude availability check
  const testProcess = spawn('node', ['--version'], { shell: true });
  
  testProcess.on('error', () => {
    res.json({
      success: true,
      claudeAvailable: false,
      message: 'Claude Code not found'
    });
  });
  
  testProcess.on('exit', (code) => {
    res.json({
      success: true,
      claudeAvailable: code === 0,
      message: code === 0 ? 'Claude Code is available' : 'Claude Code not found'
    });
  });
  
  setTimeout(() => {
    if (!res.headersSent) {
      testProcess.kill();
      res.json({
        success: true,
        claudeAvailable: false,
        message: 'Claude Code check timeout'
      });
    }
  }, 3000);
});

// Get status
app.get('/api/simple-claude/status', (req, res) => {
  res.json({
    success: true,
    status: processStatus,
    workingDirectory: prodPath
  });
});

// Launch Claude (simulate with a long-running Node.js process)
app.post('/api/simple-claude/launch', (req, res) => {
  try {
    console.log('🚀 Launch request received');
    
    if (currentProcess && !currentProcess.killed) {
      return res.status(400).json({
        success: false,
        message: 'Process already running',
        status: processStatus
      });
    }

    // For testing, spawn a simple Node.js process that stays alive
    currentProcess = spawn('node', ['-e', 'console.log("Claude Code started"); setInterval(() => process.stdout.write("."), 5000);'], {
      cwd: prodPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (!currentProcess.pid) {
      throw new Error('Failed to spawn process');
    }

    processStatus = {
      isRunning: true,
      status: 'running',
      pid: currentProcess.pid,
      error: null,
      startedAt: new Date().toISOString(),
      workingDirectory: prodPath
    };

    // Handle process events
    currentProcess.on('error', (error) => {
      console.error('Process error:', error);
      processStatus = {
        isRunning: false,
        status: 'error',
        pid: null,
        error: error.message,
        startedAt: null,
        workingDirectory: prodPath
      };
    });

    currentProcess.on('exit', (code) => {
      console.log(`Process exited with code ${code}`);
      processStatus = {
        isRunning: false,
        status: code === 0 ? 'stopped' : 'error',
        pid: null,
        error: code !== 0 ? `Process exited with code ${code}` : null,
        startedAt: null,
        workingDirectory: prodPath
      };
      currentProcess = null;
    });

    console.log(`✅ Process started with PID: ${currentProcess.pid}`);
    
    res.json({
      success: true,
      message: 'Claude launched successfully',
      status: processStatus,
      workingDirectory: prodPath
    });

  } catch (error) {
    console.error('Launch error:', error);
    processStatus = {
      isRunning: false,
      status: 'error',
      pid: null,
      error: error.message,
      startedAt: null,
      workingDirectory: prodPath
    };
    
    res.status(500).json({
      success: false,
      message: 'Failed to launch Claude',
      error: error.message,
      status: processStatus
    });
  }
});

// Stop Claude
app.post('/api/simple-claude/stop', (req, res) => {
  try {
    console.log('🛑 Stop request received');
    
    if (!currentProcess || currentProcess.killed) {
      processStatus = {
        isRunning: false,
        status: 'stopped',
        pid: null,
        error: null,
        startedAt: null,
        workingDirectory: prodPath
      };
      
      return res.json({
        success: true,
        message: 'Process was not running',
        status: processStatus
      });
    }

    // Kill the process
    currentProcess.kill('SIGTERM');
    
    // Force kill after 2 seconds
    setTimeout(() => {
      if (currentProcess && !currentProcess.killed) {
        currentProcess.kill('SIGKILL');
      }
    }, 2000);

    processStatus = {
      isRunning: false,
      status: 'stopped',
      pid: null,
      error: null,
      startedAt: null,
      workingDirectory: prodPath
    };
    currentProcess = null;

    console.log('✅ Process stopped');
    
    res.json({
      success: true,
      message: 'Claude stopped successfully',
      status: processStatus
    });

  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Error stopping Claude',
      error: error.message
    });
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  if (currentProcess && !currentProcess.killed) {
    currentProcess.kill('SIGKILL');
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, () => {
  console.log(`🚀 Simple Claude Launcher Server running on port ${PORT}`);
  console.log(`📁 Working directory: ${prodPath}`);
  console.log(`🌐 API available at: http://localhost:${PORT}/api/simple-claude/health`);
});