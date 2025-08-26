/**
 * Claude Instance Management Server
 * Provides comprehensive API and WebSocket support for Claude instance lifecycle management
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const os = require('os');

// Server configuration
const PORT = process.env.CLAUDE_INSTANCE_PORT || 3003;
const HOST = process.env.CLAUDE_INSTANCE_HOST || 'localhost';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Enable CORS for REST API
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

// Claude instance storage and management
const claudeInstances = new Map();
let instanceCounter = 0;

class ClaudeInstanceManager {
  constructor(config) {
    this.id = config.id || `claude-instance-${++instanceCounter}-${Date.now()}`;
    this.name = config.name || 'New Claude Instance';
    this.description = config.description;
    this.workingDirectory = config.workingDirectory || '/workspaces/agent-feed';
    this.autoRestart = config.autoRestart || false;
    this.autoRestartHours = config.autoRestartHours || 6;
    this.skipPermissions = config.skipPermissions || false;
    this.resumeSession = config.resumeSession || false;
    this.useProductionMode = config.useProductionMode || false;
    
    // Runtime properties
    this.status = 'stopped';
    this.process = null;
    this.pid = null;
    this.startTime = null;
    this.lastActivity = new Date();
    this.isConnected = false;
    this.hasOutput = false;
    this.outputBuffer = [];
    this.inputHistory = [];
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    this.uptime = 0;
    this.connectionCount = 0;
    this.lastError = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    
    // Auto-restart timer
    this.autoRestartTimer = null;
    
    console.log(`Claude instance ${this.id} initialized`);
  }

  async start() {
    if (this.status === 'running' || this.status === 'starting') {
      throw new Error(`Instance ${this.id} is already running or starting`);
    }

    try {
      this.status = 'starting';
      this.lastError = null;
      this.updatedAt = new Date();
      
      // Emit status update
      io.emit('instance:status', this.getStatus());
      
      // Build Claude command
      const claudeArgs = this.buildClaudeCommand();
      
      console.log(`Starting Claude instance ${this.id} with command: claude ${claudeArgs.join(' ')}`);
      console.log(`Working directory: ${this.workingDirectory}`);
      
      // Spawn Claude process
      this.process = spawn('claude', claudeArgs, {
        cwd: this.workingDirectory,
        env: {
          ...process.env,
          NODE_ENV: this.useProductionMode ? 'production' : 'development',
          CLAUDE_INSTANCE_ID: this.id
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.pid = this.process.pid;
      this.startTime = new Date();
      this.status = 'running';
      this.isConnected = true;
      this.updatedAt = new Date();

      console.log(`Claude instance ${this.id} started with PID ${this.pid}`);

      // Handle process output
      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        this.handleOutput('output', output);
        this.hasOutput = true;
        this.lastActivity = new Date();
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        this.handleOutput('error', output);
        this.lastActivity = new Date();
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Claude instance ${this.id} exited with code ${code}, signal ${signal}`);
        this.handleExit(code, signal);
      });

      this.process.on('error', (error) => {
        console.error(`Claude instance ${this.id} error:`, error);
        this.handleError(error.message);
      });

      // Set up auto-restart if enabled
      if (this.autoRestart) {
        this.setupAutoRestart();
      }

      // Emit started event
      io.emit('instance:started', this.getStatus());
      
      return this.getStatus();
    } catch (error) {
      this.status = 'error';
      this.lastError = error.message;
      this.updatedAt = new Date();
      
      console.error(`Failed to start Claude instance ${this.id}:`, error);
      io.emit('instance:error', { instanceId: this.id, error: error.message });
      
      throw error;
    }
  }

  async stop() {
    if (this.status === 'stopped' || this.status === 'stopping') {
      throw new Error(`Instance ${this.id} is already stopped or stopping`);
    }

    try {
      this.status = 'stopping';
      this.updatedAt = new Date();
      
      io.emit('instance:status', this.getStatus());

      if (this.autoRestartTimer) {
        clearTimeout(this.autoRestartTimer);
        this.autoRestartTimer = null;
      }

      if (this.process) {
        // Graceful shutdown
        this.process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 10000);

          this.process.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      this.process = null;
      this.pid = null;
      this.status = 'stopped';
      this.isConnected = false;
      this.startTime = null;
      this.updatedAt = new Date();

      console.log(`Claude instance ${this.id} stopped`);
      io.emit('instance:stopped', this.getStatus());
      
      return this.getStatus();
    } catch (error) {
      this.lastError = error.message;
      this.updatedAt = new Date();
      
      console.error(`Failed to stop Claude instance ${this.id}:`, error);
      io.emit('instance:error', { instanceId: this.id, error: error.message });
      
      throw error;
    }
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    return await this.start();
  }

  sendInput(input) {
    if (this.process && this.status === 'running') {
      this.process.stdin.write(input + '\n');
      this.inputHistory.push(input);
      this.lastActivity = new Date();
      
      // Emit input message
      const message = {
        id: `msg-${Date.now()}`,
        instanceId: this.id,
        type: 'input',
        content: input,
        timestamp: new Date()
      };
      
      io.emit('instance:input', message);
      return true;
    }
    return false;
  }

  buildClaudeCommand() {
    const args = [];
    
    // Add configuration flags based on instance settings
    if (this.useProductionMode) {
      args.push('cd', 'prod');
    }
    
    if (this.resumeSession) {
      args.push('--resume');
    }
    
    if (this.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }
    
    // Add configuration if provided
    args.push('-c', JSON.stringify({
      workingDirectory: this.workingDirectory,
      instanceId: this.id,
      autoRestart: this.autoRestart
    }));
    
    return args;
  }

  handleOutput(type, output) {
    this.outputBuffer.push({
      type,
      content: output,
      timestamp: new Date()
    });

    // Limit buffer size
    if (this.outputBuffer.length > 1000) {
      this.outputBuffer = this.outputBuffer.slice(-800);
    }

    // Emit output message
    const message = {
      id: `msg-${Date.now()}`,
      instanceId: this.id,
      type: type === 'error' ? 'error' : 'output',
      content: output,
      timestamp: new Date()
    };

    io.emit('instance:output', message);
  }

  handleExit(code, signal) {
    this.status = 'stopped';
    this.isConnected = false;
    this.process = null;
    this.pid = null;
    this.updatedAt = new Date();

    if (code !== 0) {
      this.lastError = `Process exited with code ${code}${signal ? `, signal ${signal}` : ''}`;
    }

    io.emit('instance:stopped', this.getStatus());

    // Auto-restart if enabled and exit was unexpected
    if (this.autoRestart && code !== 0) {
      console.log(`Auto-restarting Claude instance ${this.id} in 5 seconds...`);
      setTimeout(() => {
        if (this.status === 'stopped') {
          this.start().catch(error => {
            console.error(`Auto-restart failed for instance ${this.id}:`, error);
          });
        }
      }, 5000);
    }
  }

  handleError(error) {
    this.status = 'error';
    this.lastError = error;
    this.isConnected = false;
    this.updatedAt = new Date();

    io.emit('instance:error', { instanceId: this.id, error });
  }

  setupAutoRestart() {
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }

    const restartInterval = this.autoRestartHours * 60 * 60 * 1000;
    this.autoRestartTimer = setTimeout(async () => {
      if (this.status === 'running') {
        console.log(`Auto-restarting Claude instance ${this.id} after ${this.autoRestartHours} hours`);
        try {
          await this.restart();
        } catch (error) {
          console.error(`Auto-restart failed for instance ${this.id}:`, error);
        }
      }
    }, restartInterval);
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      pid: this.pid,
      startTime: this.startTime,
      lastActivity: this.lastActivity,
      cpuUsage: this.cpuUsage,
      memoryUsage: this.memoryUsage,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      connectionCount: this.connectionCount,
      lastError: this.lastError,
      isConnected: this.isConnected,
      hasOutput: this.hasOutput,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      workingDirectory: this.workingDirectory,
      autoRestart: this.autoRestart,
      useProductionMode: this.useProductionMode
    };
  }

  getFullState() {
    return {
      ...this.getStatus(),
      outputBuffer: this.outputBuffer.slice(-50), // Last 50 entries
      inputHistory: this.inputHistory.slice(-20)   // Last 20 entries
    };
  }

  cleanup() {
    console.log(`Cleaning up Claude instance ${this.id}`);
    
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }

    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (error) {
        console.error(`Error killing process for instance ${this.id}:`, error);
      }
    }

    claudeInstances.delete(this.id);
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Instance lifecycle events
  socket.on('instance:create', async (config) => {
    try {
      const instance = new ClaudeInstanceManager(config);
      claudeInstances.set(instance.id, instance);
      
      console.log(`Created Claude instance: ${instance.id}`);
      socket.emit('instance:created', instance.getFullState());
      
      // Broadcast to all clients
      io.emit('instances:list', Array.from(claudeInstances.values()).map(i => i.getStatus()));
    } catch (error) {
      console.error('Failed to create instance:', error);
      socket.emit('instance:error', { error: error.message });
    }
  });

  socket.on('instance:start', async ({ instanceId }) => {
    try {
      const instance = claudeInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      await instance.start();
    } catch (error) {
      console.error(`Failed to start instance ${instanceId}:`, error);
      socket.emit('instance:error', { instanceId, error: error.message });
    }
  });

  socket.on('instance:stop', async ({ instanceId }) => {
    try {
      const instance = claudeInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      await instance.stop();
    } catch (error) {
      console.error(`Failed to stop instance ${instanceId}:`, error);
      socket.emit('instance:error', { instanceId, error: error.message });
    }
  });

  socket.on('instance:restart', async ({ instanceId }) => {
    try {
      const instance = claudeInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      await instance.restart();
    } catch (error) {
      console.error(`Failed to restart instance ${instanceId}:`, error);
      socket.emit('instance:error', { instanceId, error: error.message });
    }
  });

  socket.on('instance:delete', ({ instanceId }) => {
    try {
      const instance = claudeInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      instance.cleanup();
      socket.emit('instance:deleted', { instanceId });
      
      // Broadcast updated list
      io.emit('instances:list', Array.from(claudeInstances.values()).map(i => i.getStatus()));
    } catch (error) {
      console.error(`Failed to delete instance ${instanceId}:`, error);
      socket.emit('instance:error', { instanceId, error: error.message });
    }
  });

  socket.on('instance:command', ({ instanceId, command }) => {
    try {
      const instance = claudeInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      const success = instance.sendInput(command.command);
      if (!success) {
        throw new Error(`Instance ${instanceId} is not running or ready`);
      }
    } catch (error) {
      console.error(`Failed to send command to instance ${instanceId}:`, error);
      socket.emit('instance:error', { instanceId, error: error.message });
    }
  });

  socket.on('instances:list', () => {
    socket.emit('instances:list', Array.from(claudeInstances.values()).map(i => i.getStatus()));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// REST API endpoints

// Get all instances
app.get('/api/claude/instances', (req, res) => {
  try {
    const instanceList = Array.from(claudeInstances.values()).map(instance => instance.getStatus());
    res.json({
      success: true,
      instances: instanceList,
      count: instanceList.length
    });
  } catch (error) {
    console.error('Failed to get instances list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new instance
app.post('/api/claude/instances', async (req, res) => {
  try {
    const config = req.body;
    const instance = new ClaudeInstanceManager(config);
    claudeInstances.set(instance.id, instance);
    
    console.log(`Created Claude instance via API: ${instance.id}`);
    
    // Broadcast to WebSocket clients
    io.emit('instance:created', instance.getFullState());
    io.emit('instances:list', Array.from(claudeInstances.values()).map(i => i.getStatus()));
    
    res.json({
      success: true,
      instance: instance.getFullState()
    });
  } catch (error) {
    console.error('Failed to create instance via API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific instance
app.get('/api/claude/instances/:id', (req, res) => {
  try {
    const { id } = req.params;
    const instance = claudeInstances.get(id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    res.json({
      success: true,
      instance: instance.getFullState()
    });
  } catch (error) {
    console.error('Failed to get instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start instance
app.post('/api/claude/instances/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const instance = claudeInstances.get(id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    await instance.start();
    
    res.json({
      success: true,
      instance: instance.getStatus()
    });
  } catch (error) {
    console.error('Failed to start instance via API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop instance
app.post('/api/claude/instances/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const instance = claudeInstances.get(id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    await instance.stop();
    
    res.json({
      success: true,
      instance: instance.getStatus()
    });
  } catch (error) {
    console.error('Failed to stop instance via API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete instance
app.delete('/api/claude/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const instance = claudeInstances.get(id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    instance.cleanup();
    
    // Broadcast updated list
    io.emit('instances:list', Array.from(claudeInstances.values()).map(i => i.getStatus()));
    
    res.json({
      success: true,
      message: `Instance ${id} deleted`
    });
  } catch (error) {
    console.error('Failed to delete instance via API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send command to instance
app.post('/api/claude/instances/:id/command', (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    const instance = claudeInstances.get(id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    const success = instance.sendInput(command);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Instance is not running or ready'
      });
    }
    
    res.json({
      success: true,
      message: 'Command sent successfully'
    });
  } catch (error) {
    console.error('Failed to send command via API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    instances: claudeInstances.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: os.platform(),
    arch: os.arch(),
    timestamp: new Date().toISOString(),
    features: ['claude-instances', 'websocket', 'real-time-updates']
  });
});

// System status endpoint
app.get('/api/status', (req, res) => {
  const instances = Array.from(claudeInstances.values());
  const runningInstances = instances.filter(i => i.status === 'running');
  const errorInstances = instances.filter(i => i.status === 'error');
  
  res.json({
    success: true,
    system: {
      healthy: true,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: os.platform()
    },
    instances: {
      total: instances.length,
      running: runningInstances.length,
      error: errorInstances.length,
      details: instances.map(i => ({
        id: i.id,
        name: i.name,
        status: i.status,
        uptime: i.uptime
      }))
    },
    websocket: {
      connected: io.engine.clientsCount,
      transport: 'socket.io'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down Claude Instance Management Server gracefully');
  
  // Stop all instances
  for (const instance of claudeInstances.values()) {
    instance.cleanup();
  }
  
  // Close Socket.IO
  io.close(() => {
    console.log('Socket.IO server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.emit('SIGTERM');
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Claude Instance Management Server running on http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
  console.log(`📊 REST API endpoints:`);
  console.log(`   GET    /api/claude/instances           - List all instances`);
  console.log(`   POST   /api/claude/instances           - Create new instance`);
  console.log(`   GET    /api/claude/instances/:id       - Get instance details`);
  console.log(`   POST   /api/claude/instances/:id/start - Start instance`);
  console.log(`   POST   /api/claude/instances/:id/stop  - Stop instance`);
  console.log(`   DELETE /api/claude/instances/:id       - Delete instance`);
  console.log(`   POST   /api/claude/instances/:id/command - Send command`);
  console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📈 System status: http://${HOST}:${PORT}/api/status`);
  console.log(`✨ Features: Real-time updates, Instance lifecycle, Command execution`);
});

module.exports = { server, app, io };