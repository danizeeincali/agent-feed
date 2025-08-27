/**
 * Integrated Real Claude Process Backend Server
 * Complete implementation replacing mock system with actual Claude process spawning
 * 
 * Features:
 * - Real child_process.spawn() for all 4 Claude command variants
 * - Process lifecycle management with health monitoring
 * - Bidirectional terminal integration via SSE
 * - Automatic process recovery and cleanup
 * - Complete conversation functionality
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import our integrated components
const ProcessLifecycleManager = require('./src/process-lifecycle-manager');
const TerminalIntegration = require('./src/terminal-integration');

const app = express();
const PORT = 3000;

// Initialize integrated managers
const lifecycleManager = new ProcessLifecycleManager({
  healthCheckInterval: 3000, // 3 seconds
  processTimeout: 300000,    // 5 minutes
  maxRestarts: 2,
  restartDelay: 3000,
  zombieCheckInterval: 20000 // 20 seconds
});

const terminalIntegration = new TerminalIntegration({
  bufferSize: 4096,
  maxHistoryLines: 500,
  heartbeatInterval: 25000,
  ansiEnabled: true,
  echoInput: true
});

// Configuration
const CLAUDE_CLI_PATH = '/home/codespace/nvm/current/bin/claude';
const CLAUDE_WORKING_DIR = '/workspaces/agent-feed/prod';

// Claude command variants for all 4 buttons
const CLAUDE_COMMANDS = {
  basic: {
    name: 'prod/claude',
    args: ['claude'],
    description: 'Basic Claude execution'
  },
  skipPermissions: {
    name: 'skip-permissions',
    args: ['claude', '--dangerously-skip-permissions'],
    description: 'Claude with permissions bypass'
  },
  chat: {
    name: 'skip-permissions -c',
    args: ['claude', '--dangerously-skip-permissions', '-c'],
    description: 'Claude chat mode with prompt',
    requiresPrompt: true
  },
  resume: {
    name: 'skip-permissions --resume',
    args: ['claude', '--dangerously-skip-permissions', '--resume'],
    description: 'Claude resume previous conversation'
  }
};

// Active processes and state management
const activeProcesses = new Map(); // instanceId -> ProcessInfo
const processMetrics = new Map(); // instanceId -> metrics

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Utility Functions
function generateInstanceId() {
  return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function logEvent(level, instanceId, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${instanceId || 'SYSTEM'}] ${message}`, data);
}

function determineCommandType(command, prompt) {
  if (!command || !Array.isArray(command)) {
    return { type: 'basic', additionalArgs: [] };
  }
  
  if (command.includes('--dangerously-skip-permissions')) {
    if (command.includes('--resume')) {
      return { type: 'resume', additionalArgs: [] };
    } else if (command.includes('-c')) {
      const promptIndex = command.indexOf('-c');
      const commandPrompt = promptIndex !== -1 && command[promptIndex + 1] ? 
                           command[promptIndex + 1] : prompt;
      return { 
        type: 'chat', 
        additionalArgs: commandPrompt ? [commandPrompt] : []
      };
    } else {
      return { type: 'skipPermissions', additionalArgs: [] };
    }
  }
  
  return { type: 'basic', additionalArgs: [] };
}

async function spawnRealClaudeProcess(instanceId, commandType, additionalArgs = []) {
  return new Promise((resolve, reject) => {
    logEvent('INFO', instanceId, `Spawning real Claude process: ${commandType}`, { additionalArgs });
    
    // Verify prerequisites
    if (!fs.existsSync(CLAUDE_CLI_PATH)) {
      return reject(new Error(`Claude CLI not found: ${CLAUDE_CLI_PATH}`));
    }
    
    if (!fs.existsSync(CLAUDE_WORKING_DIR)) {
      return reject(new Error(`Working directory not found: ${CLAUDE_WORKING_DIR}`));
    }
    
    const commandConfig = CLAUDE_COMMANDS[commandType];
    if (!commandConfig) {
      return reject(new Error(`Unknown command type: ${commandType}`));
    }
    
    // Build command arguments
    const baseArgs = commandConfig.args.slice(1); // Remove 'claude' from args
    const finalArgs = [...baseArgs, ...additionalArgs];
    
    logEvent('INFO', instanceId, `Executing: ${CLAUDE_CLI_PATH} ${finalArgs.join(' ')}`, {
      workingDir: CLAUDE_WORKING_DIR
    });
    
    try {
      // Spawn the real Claude process
      const claudeProcess = spawn(CLAUDE_CLI_PATH, finalArgs, {
        cwd: CLAUDE_WORKING_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_WORKSPACE: CLAUDE_WORKING_DIR,
          CLAUDE_SESSION_ID: instanceId
        }
      });
      
      // Create process info object
      const processInfo = {
        instanceId,
        process: claudeProcess,
        pid: claudeProcess.pid,
        commandType,
        commandName: commandConfig.name,
        args: finalArgs,
        fullCommand: `${CLAUDE_CLI_PATH} ${finalArgs.join(' ')}`,
        startTime: new Date(),
        status: 'starting',
        workingDirectory: CLAUDE_WORKING_DIR
      };
      
      // Store in active processes
      activeProcesses.set(instanceId, processInfo);
      
      // Register with lifecycle manager
      lifecycleManager.registerProcess(instanceId, processInfo);
      
      // Initialize terminal integration
      terminalIntegration.initializeTerminal(instanceId, processInfo);
      
      // Handle successful spawn
      claudeProcess.on('spawn', () => {
        logEvent('INFO', instanceId, `Real Claude process spawned successfully`, {
          pid: claudeProcess.pid,
          command: processInfo.fullCommand
        });
        
        processInfo.status = 'running';
        resolve(processInfo);
      });
      
      // Handle spawn errors
      claudeProcess.on('error', (error) => {
        logEvent('ERROR', instanceId, `Process spawn error: ${error.message}`, { error: error.stack });
        activeProcesses.delete(instanceId);
        reject(error);
      });
      
      // Handle process exit
      claudeProcess.on('exit', (code, signal) => {
        logEvent('WARN', instanceId, `Process exited`, { code, signal });
        
        if (activeProcesses.has(instanceId)) {
          const info = activeProcesses.get(instanceId);
          info.status = code === 0 ? 'completed' : 'failed';
          info.exitCode = code;
          info.exitSignal = signal;
          info.endTime = new Date();
        }
      });
      
    } catch (error) {
      logEvent('ERROR', instanceId, `Failed to spawn process: ${error.message}`);
      reject(error);
    }
  });
}

// API Endpoints

// Health check with real process information
app.get('/health', (req, res) => {
  const stats = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'Real Claude Process Backend',
    activeProcesses: activeProcesses.size,
    claudeCLI: fs.existsSync(CLAUDE_CLI_PATH) ? 'available' : 'missing',
    workingDir: fs.existsSync(CLAUDE_WORKING_DIR) ? 'available' : 'missing',
    lifecycleManager: {
      totalProcesses: lifecycleManager.getProcessCount(),
      healthyProcesses: lifecycleManager.getHealthyProcessCount()
    },
    terminalIntegration: terminalIntegration.getStats()
  };
  
  res.json(stats);
});

// Get all real Claude instances
app.get('/api/claude/instances', (req, res) => {
  logEvent('INFO', null, 'Fetching all real Claude instances');
  
  const instances = Array.from(activeProcesses.values()).map(info => {
    const lifecycleStatus = lifecycleManager.getProcessStatus(info.instanceId);
    
    return {
      id: info.instanceId,
      name: `${info.commandName} (PID: ${info.pid})`,
      status: info.status,
      pid: info.pid,
      startTime: info.startTime,
      command: info.fullCommand,
      commandType: info.commandType,
      workingDirectory: info.workingDirectory,
      uptime: Date.now() - info.startTime.getTime(),
      health: lifecycleStatus ? {
        healthStatus: lifecycleStatus.healthStatus,
        memoryUsage: lifecycleStatus.memoryUsage,
        restartCount: lifecycleStatus.restartCount,
        isResponding: lifecycleStatus.isResponding
      } : null
    };
  });
  
  res.json({
    success: true,
    instances,
    count: instances.length,
    systemStatus: {
      claudeCLI: fs.existsSync(CLAUDE_CLI_PATH),
      workingDir: fs.existsSync(CLAUDE_WORKING_DIR)
    },
    timestamp: new Date().toISOString()
  });
});

// Create new real Claude instance 
app.post('/api/claude/instances', async (req, res) => {
  const { command, workingDirectory, prompt } = req.body;
  
  logEvent('INFO', null, 'Creating new real Claude instance', { command, prompt: prompt ? '[provided]' : null });
  
  const instanceId = generateInstanceId();
  
  try {
    // Determine command type from frontend request
    const { type: commandType, additionalArgs } = determineCommandType(command, prompt);
    
    // Spawn the real Claude process
    const processInfo = await spawnRealClaudeProcess(instanceId, commandType, additionalArgs);
    
    // Initialize metrics tracking
    processMetrics.set(instanceId, {
      createdAt: new Date(),
      totalInputs: 0,
      totalOutputs: 0,
      lastActivity: new Date()
    });
    
    logEvent('INFO', instanceId, 'Real Claude instance created successfully', {
      pid: processInfo.pid,
      commandType,
      command: processInfo.fullCommand
    });
    
    res.status(201).json({
      success: true,
      instanceId,
      instance: {
        id: instanceId,
        name: processInfo.commandName,
        status: processInfo.status,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        command: processInfo.fullCommand,
        commandType: processInfo.commandType,
        workingDirectory: processInfo.workingDirectory
      },
      message: 'Real Claude process created and running',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logEvent('ERROR', instanceId, `Failed to create real Claude instance: ${error.message}`, {
      error: error.stack
    });
    
    // Clean up on failure
    if (activeProcesses.has(instanceId)) {
      activeProcesses.delete(instanceId);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      message: 'Failed to create real Claude process',
      timestamp: new Date().toISOString()
    });
  }
});

// Terminate real Claude instance with proper cleanup
app.delete('/api/claude/instances/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  
  logEvent('INFO', instanceId, 'Terminating real Claude instance');
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({
      success: false,
      error: 'Real Claude instance not found',
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Clean up terminal integration
    terminalIntegration.cleanupTerminal(instanceId);
    
    // Unregister from lifecycle manager
    lifecycleManager.unregisterProcess(instanceId);
    
    // Terminate the actual process
    if (processInfo.process && !processInfo.process.killed) {
      // Try graceful termination first
      processInfo.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!processInfo.process.killed) {
          logEvent('WARN', instanceId, 'Force killing unresponsive process');
          processInfo.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Clean up tracking
    activeProcesses.delete(instanceId);
    processMetrics.delete(instanceId);
    
    logEvent('INFO', instanceId, 'Real Claude instance terminated successfully', {
      pid: processInfo.pid
    });
    
    res.json({
      success: true,
      message: `Real Claude instance ${instanceId} terminated`,
      instanceId,
      pid: processInfo.pid,
      uptime: Date.now() - processInfo.startTime.getTime(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logEvent('ERROR', instanceId, `Failed to terminate instance: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});

// Real terminal SSE stream endpoint
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  
  logEvent('INFO', instanceId, 'SSE terminal stream requested');
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({
      success: false,
      error: 'Real Claude instance not found'
    });
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Add connection to terminal integration
  terminalIntegration.addSSEConnection(instanceId, res);
  
  logEvent('INFO', instanceId, 'SSE terminal stream connected');
});

// Real terminal input forwarding
app.post('/api/claude/instances/:instanceId/terminal/input', async (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  logEvent('INFO', instanceId, `Forwarding input to real Claude process`, { 
    inputLength: input ? input.length : 0 
  });
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({
      success: false,
      error: 'Real Claude instance not found',
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Send input through terminal integration (handles real process stdin)
    await terminalIntegration.sendInput(instanceId, input);
    
    // Update metrics
    const metrics = processMetrics.get(instanceId);
    if (metrics) {
      metrics.totalInputs++;
      metrics.lastActivity = new Date();
    }
    
    res.json({
      success: true,
      instanceId,
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      message: 'Input forwarded to real Claude process',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logEvent('ERROR', instanceId, `Failed to forward input: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});

// Process status endpoint
app.get('/api/claude/instances/:instanceId/status', (req, res) => {
  const { instanceId } = req.params;
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({
      success: false,
      error: 'Real Claude instance not found'
    });
  }
  
  const lifecycleStatus = lifecycleManager.getProcessStatus(instanceId);
  const terminalState = terminalIntegration.getTerminalState(instanceId);
  const metrics = processMetrics.get(instanceId);
  
  res.json({
    success: true,
    instanceId,
    process: {
      pid: processInfo.pid,
      status: processInfo.status,
      command: processInfo.fullCommand,
      uptime: Date.now() - processInfo.startTime.getTime(),
      workingDirectory: processInfo.workingDirectory
    },
    health: lifecycleStatus,
    terminal: terminalState ? {
      status: terminalState.status,
      inputMode: terminalState.inputMode,
      lastActivity: terminalState.lastActivity
    } : null,
    metrics,
    timestamp: new Date().toISOString()
  });
});

// Legacy endpoints for compatibility
app.get('/api/v1/claude/instances', (req, res) => {
  // Redirect to new endpoint
  res.redirect('/api/claude/instances');
});

app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  // Redirect to new endpoint
  res.redirect(`/api/claude/instances/${req.params.instanceId}/terminal/stream`);
});

app.post('/api/v1/claude/instances/:instanceId/terminal/input', (req, res) => {
  // Redirect to new endpoint  
  res.redirect(307, `/api/claude/instances/${req.params.instanceId}/terminal/input`);
});

// Event handlers for integrated components
lifecycleManager.on('processFailure', ({ instanceId, failure }) => {
  logEvent('ERROR', instanceId, `Process failure detected: ${failure.type}`, failure.details);
});

lifecycleManager.on('processRestart', ({ instanceId }) => {
  logEvent('INFO', instanceId, 'Process restart initiated by lifecycle manager');
});

terminalIntegration.on('inputSent', ({ instanceId }) => {
  const metrics = processMetrics.get(instanceId);
  if (metrics) {
    metrics.lastActivity = new Date();
  }
});

terminalIntegration.on('processOutput', ({ instanceId }) => {
  const metrics = processMetrics.get(instanceId);
  if (metrics) {
    metrics.totalOutputs++;
    metrics.lastActivity = new Date();
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Real Claude Process Backend Server running on http://localhost:${PORT}`);
  console.log(`✅ Claude CLI: ${fs.existsSync(CLAUDE_CLI_PATH) ? 'Available' : 'MISSING'}`);
  console.log(`📁 Working Directory: ${fs.existsSync(CLAUDE_WORKING_DIR) ? 'Available' : 'MISSING'}`);
  console.log(`⚡ Process Lifecycle Manager: Active`);
  console.log(`🖥️ Terminal Integration: Active`);
  console.log(`🎯 Real Claude Process Spawning: ENABLED`);
  console.log(`📡 SSE Terminal Streaming: ENABLED`);
  console.log(`🔄 Process Health Monitoring: ENABLED`);
  console.log(`🛡️ Automatic Recovery: ENABLED`);
  console.log(`\n🎉 All 4 Claude command variants ready for real process execution!`);
  console.log(`   - Basic: claude`);
  console.log(`   - Skip Permissions: claude --dangerously-skip-permissions`);
  console.log(`   - Chat Mode: claude --dangerously-skip-permissions -c "prompt"`);
  console.log(`   - Resume: claude --dangerously-skip-permissions --resume`);
});

// Graceful shutdown with complete cleanup
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Real Claude Process Backend...');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Clean up all active processes
  const shutdownPromises = [];
  for (const [instanceId, processInfo] of activeProcesses.entries()) {
    console.log(`🧹 Cleaning up process ${instanceId} (PID: ${processInfo.pid})`);
    
    const cleanup = new Promise((resolve) => {
      if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill('SIGTERM');
        setTimeout(() => {
          if (!processInfo.process.killed) {
            processInfo.process.kill('SIGKILL');
          }
          resolve();
        }, 3000);
      } else {
        resolve();
      }
    });
    
    shutdownPromises.push(cleanup);
  }
  
  // Wait for all cleanup to complete
  await Promise.all(shutdownPromises);
  
  // Shutdown integrated components
  lifecycleManager.shutdown();
  terminalIntegration.shutdown();
  
  console.log('✅ Real Claude Process Backend shutdown complete');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.emit('SIGTERM');
});