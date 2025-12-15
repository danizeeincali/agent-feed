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

// Check Claude availability - ROBUST CLI DETECTION
app.get('/api/simple-claude/check', async (req, res) => {
  console.log('🔍 Robust Claude CLI detection check');
  
  try {
    const claudeDetector = require('./src/utils/claude-cli-detector');
    const testResult = await claudeDetector.testCLI();
    
    res.json({
      success: testResult.success,
      available: testResult.detection.available,
      path: testResult.detection.path,
      version: testResult.detection.version,
      source: testResult.detection.source,
      message: testResult.success ? 'Claude CLI is available and functional' : testResult.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
  
  console.log('🔍 SPARC DEBUG: Testing direct path:', claudePath);
  
  // Check if Claude CLI exists at the known path
  if (fs.existsSync(claudePath)) {
    console.log('✅ SPARC DEBUG: Claude CLI found at known path');
    
    // Test execution
    const testProcess = spawn(claudePath, ['--version'], {
      stdio: 'pipe',
      timeout: 5000,
      env: {
        ...process.env,
        PATH: process.env.PATH + ':/home/codespace/nvm/current/bin'
      }
    });
    
    let testOutput = '';
    let testError = '';
    
    testProcess.stdout.on('data', (data) => {
      testOutput += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      testError += data.toString();
    });
    
    testProcess.on('close', (testCode) => {
      console.log('🔍 SPARC DEBUG: claude --version exit code:', testCode);
      console.log('🔍 SPARC DEBUG: claude --version output:', testOutput);
      
      res.json({
        success: true,
        claudeAvailable: testCode === 0,
        message: testCode === 0 ? 'Claude Code is available (PATH FIXED)' : 'Claude Code found but not executable',
        version: testOutput.trim(),
        path: claudePath,
        pathFixed: true
      });
    });
    
    testProcess.on('error', (error) => {
      console.error('🔍 SPARC DEBUG: claude --version error:', error);
      res.json({
        success: true,
        claudeAvailable: false,
        message: 'Claude Code found but execution failed',
        error: error.message,
        path: claudePath,
        pathFixed: false
      });
    });
    
    setTimeout(() => {
      if (!res.headersSent) {
        testProcess.kill();
        res.json({
          success: true,
          claudeAvailable: false,
          message: 'Claude Code check timeout',
          path: claudePath,
          pathFixed: false
        });
      }
    }, 3000);
    
  } else {
    console.log('❌ SPARC DEBUG: Claude CLI not found at expected path');
    
    res.json({
      success: true,
      claudeAvailable: false,
      message: '⚠️ Claude Code not found. Please install Claude Code CLI first.',
      path: claudePath + ' (not found)',
      pathFixed: false
    });
  }
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

    // CRITICAL FIX: Use full path to Claude CLI for actual launch
    const claudePath = '/home/codespace/nvm/current/bin/claude';
    
    if (!fs.existsSync(claudePath)) {
      throw new Error(`Claude CLI not found at ${claudePath}`);
    }
    
    console.log('🚀 SPARC DEBUG: Using FIXED Claude CLI path:', claudePath);
    
    // Launch actual Claude CLI process with FIXED PATH
    const claudeDetector = require('./src/utils/claude-cli-detector');
    currentProcess = await claudeDetector.spawnClaude([], {
      cwd: prodPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: process.env.PATH + ':/home/codespace/nvm/current/bin',  // CRITICAL: Add Claude CLI to PATH
        HOME: process.env.HOME || '/home/codespace',
        TERM: 'xterm-256color'
      }
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
      message: 'Claude launched successfully with FIXED path',
      status: processStatus,
      workingDirectory: prodPath,
      claudePath: claudePath,
      pathFixed: true
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
      status: processStatus,
      pathFixed: false
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