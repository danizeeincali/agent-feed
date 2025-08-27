/**
 * Real Claude Process Backend Server
 * Implements actual child_process.spawn() for Claude instances
 * Working Directory: /workspaces/agent-feed/prod
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Real Claude Process Management
const activeProcesses = new Map(); // instanceId -> process info
const sseConnections = new Map(); // instanceId -> SSE connections
const processLogs = new Map(); // instanceId -> log buffer

// Claude command variants configuration
const CLAUDE_COMMANDS = {
  basic: ['claude'],
  skipPermissions: ['claude', '--dangerously-skip-permissions'],
  chat: ['claude', '--dangerously-skip-permissions', '-c'],
  resume: ['claude', '--dangerously-skip-permissions', '--resume']
};

// Working directory for all Claude processes
const CLAUDE_WORKING_DIR = '/workspaces/agent-feed/prod';
const CLAUDE_CLI_PATH = '/home/codespace/nvm/current/bin/claude';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeProcesses: activeProcesses.size,
    claudeCLI: fs.existsSync(CLAUDE_CLI_PATH) ? 'available' : 'missing',
    workingDir: CLAUDE_WORKING_DIR,
    timestamp: new Date().toISOString()
  });
});

// Utility Functions
function generateInstanceId() {
  return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function logProcessEvent(instanceId, level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  
  if (!processLogs.has(instanceId)) {
    processLogs.set(instanceId, []);
  }
  processLogs.get(instanceId).push(logEntry);
  
  // Keep only last 1000 log entries
  const logs = processLogs.get(instanceId);
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }
  
  console.log(`[${instanceId}] ${logEntry}`);
}

function broadcastToSSE(instanceId, data) {
  const connections = sseConnections.get(instanceId) || [];
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach((connection, index) => {
    try {
      connection.write(message);
    } catch (error) {
      console.error(`Failed to broadcast to connection ${index} for ${instanceId}:`, error);
      connections.splice(index, 1); // Remove dead connection
    }
  });
}

function cleanupProcess(instanceId) {
  const processInfo = activeProcesses.get(instanceId);
  if (processInfo && processInfo.process) {
    try {
      // Attempt graceful termination first
      processInfo.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!processInfo.process.killed) {
          logProcessEvent(instanceId, 'WARN', 'Force killing unresponsive process');
          processInfo.process.kill('SIGKILL');
        }
      }, 5000);
      
    } catch (error) {
      logProcessEvent(instanceId, 'ERROR', `Failed to kill process: ${error.message}`);
    }
  }
  
  // Clean up tracking
  activeProcesses.delete(instanceId);
  sseConnections.delete(instanceId);
  processLogs.delete(instanceId);
}

// Real Claude Process Spawning
function spawnClaudeProcess(instanceId, commandType, additionalArgs = []) {
  return new Promise((resolve, reject) => {
    // Verify Claude CLI exists
    if (!fs.existsSync(CLAUDE_CLI_PATH)) {
      return reject(new Error(`Claude CLI not found at ${CLAUDE_CLI_PATH}`));
    }
    
    // Verify working directory exists
    if (!fs.existsSync(CLAUDE_WORKING_DIR)) {
      return reject(new Error(`Working directory not found: ${CLAUDE_WORKING_DIR}`));
    }
    
    // Get command configuration
    const baseCommand = CLAUDE_COMMANDS[commandType];
    if (!baseCommand) {
      return reject(new Error(`Unknown command type: ${commandType}`));
    }
    
    // Build final command arguments
    const args = [...baseCommand.slice(1), ...additionalArgs];
    
    logProcessEvent(instanceId, 'INFO', `Spawning Claude process: ${CLAUDE_CLI_PATH} ${args.join(' ')}`);
    
    try {
      // Spawn the Claude process
      const claudeProcess = spawn(CLAUDE_CLI_PATH, args, {
        cwd: CLAUDE_WORKING_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_WORKSPACE: CLAUDE_WORKING_DIR
        }
      });
      
      const processInfo = {
        instanceId,
        process: claudeProcess,
        pid: claudeProcess.pid,
        commandType,
        args,
        startTime: new Date(),
        status: 'starting'
      };
      
      activeProcesses.set(instanceId, processInfo);
      
      // Handle process stdout
      claudeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        logProcessEvent(instanceId, 'STDOUT', output);
        
        broadcastToSSE(instanceId, {
          type: 'output',
          instanceId,
          data: output,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle process stderr
      claudeProcess.stderr.on('data', (data) => {
        const error = data.toString();
        logProcessEvent(instanceId, 'STDERR', error);
        
        broadcastToSSE(instanceId, {
          type: 'error',
          instanceId,
          data: error,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle process completion
      claudeProcess.on('close', (code) => {
        logProcessEvent(instanceId, 'INFO', `Process exited with code: ${code}`);
        
        if (activeProcesses.has(instanceId)) {
          const info = activeProcesses.get(instanceId);
          info.status = code === 0 ? 'completed' : 'failed';
          info.exitCode = code;
          info.endTime = new Date();
          
          broadcastToSSE(instanceId, {
            type: 'process_exit',
            instanceId,
            exitCode: code,
            status: info.status,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Handle process errors
      claudeProcess.on('error', (error) => {
        logProcessEvent(instanceId, 'ERROR', `Process error: ${error.message}`);
        
        broadcastToSSE(instanceId, {
          type: 'process_error',
          instanceId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        reject(error);
      });
      
      // Handle successful spawn
      claudeProcess.on('spawn', () => {
        logProcessEvent(instanceId, 'INFO', `Process spawned successfully with PID: ${claudeProcess.pid}`);
        processInfo.status = 'running';
        
        broadcastToSSE(instanceId, {
          type: 'process_started',
          instanceId,
          pid: claudeProcess.pid,
          command: `${CLAUDE_CLI_PATH} ${args.join(' ')}`,
          timestamp: new Date().toISOString()
        });
        
        resolve(processInfo);
      });
      
    } catch (error) {
      logProcessEvent(instanceId, 'ERROR', `Failed to spawn process: ${error.message}`);
      reject(error);
    }
  });
}

// API Endpoints

// Get all active Claude instances
app.get('/api/claude/instances', (req, res) => {
  console.log('📋 Fetching active Claude instances');
  
  const instances = Array.from(activeProcesses.values()).map(info => ({
    id: info.instanceId,
    name: `${info.commandType} (PID: ${info.pid})`,
    status: info.status,
    pid: info.pid,
    startTime: info.startTime,
    command: `${CLAUDE_CLI_PATH} ${info.args.join(' ')}`,
    uptime: info.status === 'running' ? Date.now() - info.startTime.getTime() : null
  }));
  
  res.json({
    success: true,
    instances,
    count: instances.length,
    timestamp: new Date().toISOString()
  });
});

// Create new Claude instance with real process spawning
app.post('/api/claude/instances', async (req, res) => {
  const { command, workingDirectory, prompt } = req.body;
  
  console.log(`🚀 Creating new Claude instance:`, { command, workingDirectory, prompt });
  
  const instanceId = generateInstanceId();
  
  try {
    // Determine command type based on frontend button
    let commandType = 'basic';
    let additionalArgs = [];
    
    if (Array.isArray(command)) {
      if (command.includes('--dangerously-skip-permissions')) {
        if (command.includes('--resume')) {
          commandType = 'resume';
        } else if (command.includes('-c')) {
          commandType = 'chat';
          // Extract prompt from command or use provided prompt
          const promptIndex = command.indexOf('-c');
          if (promptIndex !== -1 && command[promptIndex + 1]) {
            additionalArgs = ['-c', command[promptIndex + 1]];
          } else if (prompt) {
            additionalArgs = ['-c', prompt];
          }
        } else {
          commandType = 'skipPermissions';
        }
      }
    }
    
    // Spawn the real Claude process
    const processInfo = await spawnClaudeProcess(instanceId, commandType, additionalArgs);
    
    res.status(201).json({
      success: true,
      instanceId,
      instance: {
        id: instanceId,
        name: `${commandType} (PID: ${processInfo.pid})`,
        status: processInfo.status,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        command: `${CLAUDE_CLI_PATH} ${processInfo.args.join(' ')}`,
        commandType
      },
      message: 'Real Claude process created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Failed to create Claude instance:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});

// Terminate Claude instance
app.delete('/api/claude/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🗑️ Terminating Claude instance: ${instanceId}`);
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({
      success: false,
      error: 'Instance not found',
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Broadcast termination notice
  broadcastToSSE(instanceId, {
    type: 'process_terminating',
    instanceId,
    timestamp: new Date().toISOString()
  });
  
  // Clean up the process
  cleanupProcess(instanceId);
  
  res.json({
    success: true,
    message: `Claude instance ${instanceId} terminated successfully`,
    instanceId,
    pid: processInfo.pid,
    timestamp: new Date().toISOString()
  });
});

// SSE Terminal Stream endpoint
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`📡 SSE terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Initialize SSE connections for this instance
  if (!sseConnections.has(instanceId)) {
    sseConnections.set(instanceId, []);
  }
  sseConnections.get(instanceId).push(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ Connected to real Claude process ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\n\n`);
  
  // Send existing process info if available
  const processInfo = activeProcesses.get(instanceId);
  if (processInfo) {
    res.write(`data: ${JSON.stringify({
      type: 'process_info',
      instanceId,
      pid: processInfo.pid,
      status: processInfo.status,
      command: `${CLAUDE_CLI_PATH} ${processInfo.args.join(' ')}`,
      uptime: Date.now() - processInfo.startTime.getTime(),
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Send recent logs
    const logs = processLogs.get(instanceId) || [];
    logs.slice(-10).forEach(log => {
      res.write(`data: ${JSON.stringify({
        type: 'log',
        instanceId,
        data: log,
        timestamp: new Date().toISOString()
      })}\n\n`);
    });
  }
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for instance: ${instanceId}`);
    
    const connections = sseConnections.get(instanceId) || [];
    const index = connections.indexOf(res);
    if (index !== -1) {
      connections.splice(index, 1);
    }
  });
  
  req.on('error', (error) => {
    console.error(`❌ SSE connection error for instance ${instanceId}:`, error);
    
    const connections = sseConnections.get(instanceId) || [];
    const index = connections.indexOf(res);
    if (index !== -1) {
      connections.splice(index, 1);
    }
  });
});

// Terminal input forwarding to real Claude process
app.post('/api/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  console.log(`⌨️ Terminal input for Claude instance ${instanceId}: ${input}`);
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo || processInfo.status !== 'running') {
    return res.status(404).json({
      success: false,
      error: 'Process not found or not running',
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Send input to real Claude process stdin
    processInfo.process.stdin.write(input + '\n');
    
    logProcessEvent(instanceId, 'INPUT', input);
    
    // Broadcast input echo
    broadcastToSSE(instanceId, {
      type: 'input_echo',
      instanceId,
      data: input,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      instanceId,
      input,
      message: 'Input sent to real Claude process',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Failed to send input to Claude process:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Real Claude Process Backend running on http://localhost:${PORT}`);
  console.log(`🎯 Claude CLI: ${CLAUDE_CLI_PATH}`);
  console.log(`📁 Working Directory: ${CLAUDE_WORKING_DIR}`);
  console.log(`⚡ Real process spawning enabled for all 4 Claude command variants`);
  console.log(`📡 SSE streaming connected to real Claude process I/O`);
});

// Graceful shutdown with process cleanup
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server and cleaning up processes...');
  
  // Clean up all active processes
  for (const [instanceId, processInfo] of activeProcesses.entries()) {
    console.log(`🧹 Cleaning up process ${instanceId} (PID: ${processInfo.pid})`);
    cleanupProcess(instanceId);
  }
  
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.emit('SIGTERM');
});