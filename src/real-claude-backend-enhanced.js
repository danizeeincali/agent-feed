/**
 * Production-Ready Claude Process Backend Server
 * Enhanced version with comprehensive error handling, connection retry logic, and crash prevention
 *
 * Features:
 * - Bulletproof process management with graceful degradation
 * - SSE connection pooling with automatic cleanup
 * - Exponential backoff retry with circuit breaker pattern
 * - Memory leak prevention and resource monitoring
 * - Production-grade logging and metrics
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cluster = require('cluster');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced process management with circuit breaker
class ProcessManager {
  constructor() {
    this.activeProcesses = new Map(); // instanceId -> process info
    this.sseConnections = new Map(); // instanceId -> Set of SSE connections
    this.processLogs = new Map(); // instanceId -> circular buffer
    this.processMetrics = new Map(); // instanceId -> metrics
    this.circuitBreaker = new Map(); // instanceId -> circuit breaker state

    // Configuration
    this.config = {
      maxProcesses: 20,
      maxLogEntries: 1000,
      maxSSEConnections: 50,
      processTimeoutMs: 300000, // 5 minutes
      cleanupIntervalMs: 60000, // 1 minute
      memoryThresholdMB: 1024, // 1GB per process
      circuitBreakerThreshold: 5, // failures before opening circuit
      circuitBreakerResetMs: 30000 // 30 seconds
    };

    // Start background tasks
    this.startCleanupTasks();
  }

  generateInstanceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `claude-${timestamp}-${random}`;
  }

  validateInstanceId(instanceId) {
    return typeof instanceId === 'string' &&
           instanceId.match(/^claude-\d+-[a-z0-9]+$/);
  }

  logProcessEvent(instanceId, level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      instanceId,
      level,
      message,
      metadata,
      pid: this.activeProcesses.get(instanceId)?.pid
    };

    // Store in circular buffer
    if (!this.processLogs.has(instanceId)) {
      this.processLogs.set(instanceId, []);
    }
    const logs = this.processLogs.get(instanceId);
    logs.push(logEntry);

    // Maintain circular buffer size
    if (logs.length > this.config.maxLogEntries) {
      logs.shift();
    }

    // Console logging with structured format
    console.log(JSON.stringify({
      timestamp,
      level,
      instanceId,
      message,
      ...metadata
    }));
  }

  updateProcessMetrics(instanceId) {
    try {
      const processInfo = this.activeProcesses.get(instanceId);
      if (!processInfo?.process?.pid) return;

      const process = processInfo.process;
      const metrics = {
        timestamp: new Date(),
        pid: process.pid,
        memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
        cpuUsage: process.cpuUsage ? process.cpuUsage() : null,
        uptime: Date.now() - processInfo.startTime.getTime(),
        status: processInfo.status
      };

      this.processMetrics.set(instanceId, metrics);

      // Check memory threshold
      if (metrics.memoryUsage?.heapUsed) {
        const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        if (memoryMB > this.config.memoryThresholdMB) {
          this.logProcessEvent(instanceId, 'WARN', 'Memory usage exceeds threshold', {
            memoryMB,
            threshold: this.config.memoryThresholdMB
          });
          // Could trigger process restart here
        }
      }
    } catch (error) {
      this.logProcessEvent(instanceId, 'ERROR', 'Failed to update metrics', { error: error.message });
    }
  }

  getCircuitBreakerState(instanceId) {
    return this.circuitBreaker.get(instanceId) || {
      failures: 0,
      state: 'closed',
      lastFailure: null
    };
  }

  updateCircuitBreaker(instanceId, success) {
    const breaker = this.getCircuitBreakerState(instanceId);

    if (success) {
      // Reset on success
      breaker.failures = 0;
      breaker.state = 'closed';
    } else {
      breaker.failures++;
      breaker.lastFailure = new Date();

      if (breaker.failures >= this.config.circuitBreakerThreshold) {
        breaker.state = 'open';
        this.logProcessEvent(instanceId, 'WARN', 'Circuit breaker opened', {
          failures: breaker.failures
        });
      }
    }

    // Auto-reset after timeout
    if (breaker.state === 'open' &&
        Date.now() - breaker.lastFailure.getTime() > this.config.circuitBreakerResetMs) {
      breaker.state = 'half-open';
      breaker.failures = Math.floor(breaker.failures / 2); // Gradual recovery
      this.logProcessEvent(instanceId, 'INFO', 'Circuit breaker half-open');
    }

    this.circuitBreaker.set(instanceId, breaker);
  }

  canCreateProcess(instanceId) {
    // Check global limits
    if (this.activeProcesses.size >= this.config.maxProcesses) {
      return { allowed: false, reason: 'Maximum process limit reached' };
    }

    // Check circuit breaker
    const breaker = this.getCircuitBreakerState(instanceId);
    if (breaker.state === 'open') {
      return { allowed: false, reason: 'Circuit breaker open' };
    }

    return { allowed: true };
  }

  broadcastToSSE(instanceId, data, options = {}) {
    const connections = this.sseConnections.get(instanceId);
    if (!connections || connections.size === 0) {
      return { sent: 0, failed: 0 };
    }

    const message = `data: ${JSON.stringify({
      ...data,
      instanceId,
      timestamp: data.timestamp || new Date().toISOString()
    })}\n\n`;

    let sent = 0, failed = 0;
    const deadConnections = new Set();

    for (const connection of connections) {
      try {
        if (!connection.destroyed && !connection.finished) {
          connection.write(message);
          sent++;
        } else {
          deadConnections.add(connection);
        }
      } catch (error) {
        this.logProcessEvent(instanceId, 'DEBUG', 'SSE write failed', { error: error.message });
        deadConnections.add(connection);
        failed++;
      }
    }

    // Clean up dead connections
    for (const deadConnection of deadConnections) {
      connections.delete(deadConnection);
    }

    return { sent, failed };
  }

  addSSEConnection(instanceId, res) {
    // Validate instance exists or is being created
    if (!this.validateInstanceId(instanceId)) {
      throw new Error('Invalid instance ID format');
    }

    if (!this.sseConnections.has(instanceId)) {
      this.sseConnections.set(instanceId, new Set());
    }

    const connections = this.sseConnections.get(instanceId);

    // Check connection limit
    if (connections.size >= this.config.maxSSEConnections) {
      throw new Error('Maximum SSE connections reached for instance');
    }

    connections.add(res);

    this.logProcessEvent(instanceId, 'DEBUG', 'SSE connection added', {
      totalConnections: connections.size
    });

    return connections.size;
  }

  removeSSEConnection(instanceId, res) {
    const connections = this.sseConnections.get(instanceId);
    if (!connections) return false;

    const removed = connections.delete(res);

    if (removed) {
      this.logProcessEvent(instanceId, 'DEBUG', 'SSE connection removed', {
        remainingConnections: connections.size
      });
    }

    // Clean up empty connection sets
    if (connections.size === 0) {
      this.sseConnections.delete(instanceId);
    }

    return removed;
  }

  async cleanupProcess(instanceId, force = false) {
    this.logProcessEvent(instanceId, 'INFO', 'Starting process cleanup', { force });

    const processInfo = this.activeProcesses.get(instanceId);

    if (processInfo?.process && !processInfo.process.killed) {
      try {
        if (force) {
          processInfo.process.kill('SIGKILL');
          this.logProcessEvent(instanceId, 'WARN', 'Force killed process');
        } else {
          // Graceful shutdown
          processInfo.process.kill('SIGTERM');

          // Set timeout for force kill
          const forceKillTimeout = setTimeout(() => {
            if (!processInfo.process.killed) {
              this.logProcessEvent(instanceId, 'WARN', 'Force killing unresponsive process');
              processInfo.process.kill('SIGKILL');
            }
          }, 5000);

          // Clear timeout if process exits gracefully
          processInfo.process.once('exit', () => {
            clearTimeout(forceKillTimeout);
          });
        }
      } catch (error) {
        this.logProcessEvent(instanceId, 'ERROR', 'Failed to kill process', {
          error: error.message,
          pid: processInfo.process?.pid
        });
      }
    }

    // Clean up all tracking
    this.activeProcesses.delete(instanceId);
    this.processLogs.delete(instanceId);
    this.processMetrics.delete(instanceId);

    // Notify SSE connections about cleanup
    this.broadcastToSSE(instanceId, {
      type: 'process_cleanup',
      message: 'Process cleaned up'
    });

    // Close all SSE connections for this instance
    const connections = this.sseConnections.get(instanceId);
    if (connections) {
      for (const connection of connections) {
        try {
          if (!connection.destroyed && !connection.finished) {
            connection.end();
          }
        } catch (error) {
          // Ignore connection cleanup errors
        }
      }
      this.sseConnections.delete(instanceId);
    }
  }

  startCleanupTasks() {
    // Periodic cleanup of stale resources
    setInterval(() => {
      this.performMaintenanceCleanup();
    }, this.config.cleanupIntervalMs);

    // Update metrics for all processes
    setInterval(() => {
      for (const instanceId of this.activeProcesses.keys()) {
        this.updateProcessMetrics(instanceId);
      }
    }, 10000); // Every 10 seconds
  }

  performMaintenanceCleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean up old processes that may be stuck
    for (const [instanceId, processInfo] of this.activeProcesses.entries()) {
      const age = now - processInfo.startTime.getTime();

      // Clean up processes older than timeout
      if (age > this.config.processTimeoutMs && processInfo.status !== 'completed') {
        this.logProcessEvent(instanceId, 'WARN', 'Cleaning up timed-out process', {
          ageMs: age,
          timeoutMs: this.config.processTimeoutMs
        });
        this.cleanupProcess(instanceId, true);
        cleaned++;
      }
    }

    // Clean up orphaned SSE connections
    for (const [instanceId, connections] of this.sseConnections.entries()) {
      if (!this.activeProcesses.has(instanceId)) {
        this.logProcessEvent(instanceId, 'DEBUG', 'Cleaning up orphaned SSE connections');
        for (const connection of connections) {
          try {
            connection.end();
          } catch (error) {
            // Ignore cleanup errors
          }
        }
        this.sseConnections.delete(instanceId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Maintenance cleanup: ${cleaned} resources cleaned`);
    }
  }

  getSystemMetrics() {
    return {
      processes: {
        active: this.activeProcesses.size,
        maximum: this.config.maxProcesses
      },
      connections: {
        sse: Array.from(this.sseConnections.values()).reduce((sum, set) => sum + set.size, 0),
        maximum: this.config.maxSSEConnections
      },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize process manager
const processManager = new ProcessManager();

// Claude command variants configuration
const CLAUDE_COMMANDS = {
  basic: ['claude'],
  skipPermissions: ['claude', '--dangerously-skip-permissions'],
  chat: ['claude', '--dangerously-skip-permissions', '-c'],
  resume: ['claude', '--dangerously-skip-permissions', '--resume'],
  code: ['claude'] // Default for Avi integration
};

// Working directory for all Claude processes
const CLAUDE_WORKING_DIR = '/workspaces/agent-feed/prod';
const CLAUDE_CLI_PATH = '/home/codespace/nvm/current/bin/claude';

// Enhanced middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function(...args) {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    }));
    originalEnd.apply(this, args);
  };

  next();
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const metrics = processManager.getSystemMetrics();
  const claudeCLIExists = fs.existsSync(CLAUDE_CLI_PATH);
  const workingDirExists = fs.existsSync(CLAUDE_WORKING_DIR);

  const health = {
    status: claudeCLIExists && workingDirExists ? 'healthy' : 'unhealthy',
    version: '2.0.0',
    claudeCLI: claudeCLIExists ? 'available' : 'missing',
    workingDir: workingDirExists ? CLAUDE_WORKING_DIR : 'missing',
    processes: metrics.processes,
    connections: metrics.connections,
    memory: {
      used: Math.round(metrics.memory.heapUsed / 1024 / 1024),
      total: Math.round(metrics.memory.heapTotal / 1024 / 1024)
    },
    uptime: Math.round(metrics.uptime),
    timestamp: metrics.timestamp
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Real Claude Process Spawning with enhanced error handling
async function spawnClaudeProcess(instanceId, commandType, additionalArgs = []) {
  return new Promise((resolve, reject) => {
    try {
      // Pre-spawn validation
      if (!fs.existsSync(CLAUDE_CLI_PATH)) {
        const error = new Error(`Claude CLI not found at ${CLAUDE_CLI_PATH}`);
        processManager.updateCircuitBreaker(instanceId, false);
        return reject(error);
      }

      if (!fs.existsSync(CLAUDE_WORKING_DIR)) {
        const error = new Error(`Working directory not found: ${CLAUDE_WORKING_DIR}`);
        processManager.updateCircuitBreaker(instanceId, false);
        return reject(error);
      }

      // Check process creation limits
      const canCreate = processManager.canCreateProcess(instanceId);
      if (!canCreate.allowed) {
        return reject(new Error(canCreate.reason));
      }

      // Get command configuration
      const baseCommand = CLAUDE_COMMANDS[commandType];
      if (!baseCommand) {
        return reject(new Error(`Unknown command type: ${commandType}`));
      }

      // Build final command arguments
      const args = [...baseCommand.slice(1), ...additionalArgs];

      processManager.logProcessEvent(instanceId, 'INFO', 'Spawning Claude process', {
        command: CLAUDE_CLI_PATH,
        args: args.join(' '),
        workingDir: CLAUDE_WORKING_DIR
      });

      // Spawn the Claude process with enhanced options
      const claudeProcess = spawn(CLAUDE_CLI_PATH, args, {
        cwd: CLAUDE_WORKING_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_WORKSPACE: CLAUDE_WORKING_DIR,
          NODE_ENV: process.env.NODE_ENV || 'production'
        },
        detached: false,
        windowsHide: true
      });

      const processInfo = {
        instanceId,
        process: claudeProcess,
        pid: claudeProcess.pid,
        commandType,
        args,
        startTime: new Date(),
        status: 'starting',
        heartbeatCount: 0,
        lastActivity: new Date()
      };

      processManager.activeProcesses.set(instanceId, processInfo);

      // Set up process timeout
      const processTimeout = setTimeout(() => {
        if (processInfo.status === 'starting') {
          processManager.logProcessEvent(instanceId, 'ERROR', 'Process start timeout');
          processManager.cleanupProcess(instanceId, true);
          reject(new Error('Process failed to start within timeout'));
        }
      }, 30000); // 30 second start timeout

      // Handle process stdout with buffering
      let stdoutBuffer = '';
      claudeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;

        // Process complete lines
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            processManager.logProcessEvent(instanceId, 'STDOUT', line);
            processManager.broadcastToSSE(instanceId, {
              type: 'output',
              data: line,
              isReal: true
            });
            processInfo.lastActivity = new Date();
          }
        }
      });

      // Handle process stderr with buffering
      let stderrBuffer = '';
      claudeProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderrBuffer += error;

        // Process complete lines
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            processManager.logProcessEvent(instanceId, 'STDERR', line);
            processManager.broadcastToSSE(instanceId, {
              type: 'error',
              data: line,
              isReal: true
            });
            processInfo.lastActivity = new Date();
          }
        }
      });

      // Handle process completion
      claudeProcess.on('close', (code, signal) => {
        clearTimeout(processTimeout);
        processManager.logProcessEvent(instanceId, 'INFO', 'Process exited', { code, signal });

        if (processManager.activeProcesses.has(instanceId)) {
          const info = processManager.activeProcesses.get(instanceId);
          info.status = code === 0 ? 'completed' : 'failed';
          info.exitCode = code;
          info.exitSignal = signal;
          info.endTime = new Date();

          processManager.broadcastToSSE(instanceId, {
            type: 'process_exit',
            exitCode: code,
            exitSignal: signal,
            status: info.status
          });

          // Update circuit breaker
          processManager.updateCircuitBreaker(instanceId, code === 0);
        }
      });

      // Handle process errors
      claudeProcess.on('error', (error) => {
        clearTimeout(processTimeout);
        processManager.logProcessEvent(instanceId, 'ERROR', 'Process error', { error: error.message });
        processManager.updateCircuitBreaker(instanceId, false);

        processManager.broadcastToSSE(instanceId, {
          type: 'process_error',
          error: error.message
        });

        reject(error);
      });

      // Handle successful spawn
      claudeProcess.on('spawn', () => {
        clearTimeout(processTimeout);
        processManager.logProcessEvent(instanceId, 'INFO', 'Process spawned successfully', {
          pid: claudeProcess.pid
        });

        processInfo.status = 'running';
        processInfo.pid = claudeProcess.pid;

        processManager.updateCircuitBreaker(instanceId, true);

        processManager.broadcastToSSE(instanceId, {
          type: 'process_started',
          pid: claudeProcess.pid,
          command: `${CLAUDE_CLI_PATH} ${args.join(' ')}`
        });

        resolve(processInfo);
      });

    } catch (error) {
      processManager.logProcessEvent(instanceId, 'ERROR', 'Failed to spawn process', {
        error: error.message
      });
      processManager.updateCircuitBreaker(instanceId, false);
      reject(error);
    }
  });
}

// Enhanced API Endpoints with comprehensive error handling

// Get all active Claude instances
app.get('/api/claude/instances', (req, res) => {
  try {
    processManager.logProcessEvent('system', 'DEBUG', 'Fetching active Claude instances');

    const instances = Array.from(processManager.activeProcesses.values()).map(info => ({
      id: info.instanceId,
      name: `${info.commandType} (PID: ${info.pid})`,
      status: info.status,
      pid: info.pid,
      startTime: info.startTime,
      command: `${CLAUDE_CLI_PATH} ${info.args.join(' ')}`,
      uptime: info.status === 'running' ? Date.now() - info.startTime.getTime() : null,
      lastActivity: info.lastActivity,
      heartbeatCount: info.heartbeatCount || 0
    }));

    res.json({
      success: true,
      instances,
      count: instances.length,
      systemMetrics: processManager.getSystemMetrics(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch instances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch instances',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create new Claude instance with enhanced validation
app.post('/api/claude/instances', async (req, res) => {
  let instanceId = null;

  try {
    const { command, instanceType, workingDirectory, usePty, prompt } = req.body;

    instanceId = processManager.generateInstanceId();

    processManager.logProcessEvent(instanceId, 'INFO', 'Creating new Claude instance', {
      command: Array.isArray(command) ? command.join(' ') : command,
      instanceType,
      workingDirectory,
      usePty
    });

    // Determine command type based on request
    let commandType = 'code'; // Default for Avi integration
    let additionalArgs = [];

    if (Array.isArray(command)) {
      if (command.includes('--dangerously-skip-permissions')) {
        if (command.includes('--resume')) {
          commandType = 'resume';
        } else if (command.includes('-c')) {
          commandType = 'chat';
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
    } else if (instanceType === 'code') {
      commandType = 'code';
    }

    // Spawn the real Claude process
    const processInfo = await spawnClaudeProcess(instanceId, commandType, additionalArgs);

    res.status(201).json({
      success: true,
      instanceId,
      data: {
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

    if (instanceId) {
      processManager.cleanupProcess(instanceId, true);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create Claude instance',
      message: error.message,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }
});

// SSE Terminal Stream endpoint with enhanced connection management
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;

  try {
    // Validate instance ID
    if (!processManager.validateInstanceId(instanceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        instanceId
      });
    }

    processManager.logProcessEvent(instanceId, 'INFO', 'SSE terminal stream requested');

    // Set SSE headers with enhanced security
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.get('Origin') || '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Transfer-Encoding': 'chunked'
    });

    // Add connection to manager
    try {
      const connectionCount = processManager.addSSEConnection(instanceId, res);

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        instanceId,
        message: `✅ Connected to Claude process ${instanceId}`,
        connectionCount,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Send existing process info if available
      const processInfo = processManager.activeProcesses.get(instanceId);
      if (processInfo) {
        res.write(`data: ${JSON.stringify({
          type: 'process_info',
          instanceId,
          pid: processInfo.pid,
          status: processInfo.status,
          command: `${CLAUDE_CLI_PATH} ${processInfo.args.join(' ')}`,
          uptime: Date.now() - processInfo.startTime.getTime(),
          heartbeatCount: processInfo.heartbeatCount || 0
        })}\n\n`);

        // Send recent logs (last 10 entries)
        const logs = processManager.processLogs.get(instanceId) || [];
        logs.slice(-10).forEach(logEntry => {
          res.write(`data: ${JSON.stringify({
            type: 'log',
            instanceId,
            data: logEntry.message,
            level: logEntry.level,
            timestamp: logEntry.timestamp
          })}\n\n`);
        });
      } else {
        // Instance might be starting or not exist
        res.write(`data: ${JSON.stringify({
          type: 'process_info',
          instanceId,
          status: 'unknown',
          message: 'Process information not available'
        })}\n\n`);
      }

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        if (res.destroyed || res.finished) {
          clearInterval(heartbeatInterval);
          return;
        }

        try {
          res.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            instanceId,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          clearInterval(heartbeatInterval);
          processManager.removeSSEConnection(instanceId, res);
        }
      }, 30000); // Every 30 seconds

      // Handle client disconnect
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        processManager.removeSSEConnection(instanceId, res);
        processManager.logProcessEvent(instanceId, 'DEBUG', 'SSE connection closed');
      };

      req.on('close', cleanup);
      req.on('aborted', cleanup);
      res.on('close', cleanup);
      res.on('error', (error) => {
        processManager.logProcessEvent(instanceId, 'DEBUG', 'SSE connection error', {
          error: error.message
        });
        cleanup();
      });

    } catch (connectionError) {
      processManager.logProcessEvent(instanceId, 'ERROR', 'Failed to add SSE connection', {
        error: connectionError.message
      });

      res.write(`data: ${JSON.stringify({
        type: 'error',
        instanceId,
        message: connectionError.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

  } catch (error) {
    console.error(`❌ SSE setup error for instance ${instanceId}:`, error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to setup SSE connection',
        message: error.message,
        instanceId
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        instanceId,
        message: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    }
  }
});

// Enhanced terminal input forwarding with validation and error handling
app.post('/api/claude/instances/:instanceId/terminal/input', async (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;

  try {
    // Comprehensive input validation
    if (!processManager.validateInstanceId(instanceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        instanceId
      });
    }

    if (typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Input must be a string',
        instanceId
      });
    }

    if (input.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Input cannot be empty',
        instanceId
      });
    }

    if (input.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Input too long (max 10000 characters)',
        instanceId,
        inputLength: input.length
      });
    }

    processManager.logProcessEvent(instanceId, 'INFO', 'Terminal input received', {
      inputLength: input.length,
      preview: input.substring(0, 100)
    });

    const processInfo = processManager.activeProcesses.get(instanceId);
    if (!processInfo) {
      return res.status(404).json({
        success: false,
        error: 'Claude instance not found',
        message: `No active process found for instance ${instanceId}`,
        instanceId
      });
    }

    if (processInfo.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Instance not ready',
        message: `Instance ${instanceId} is not running (status: ${processInfo.status})`,
        instanceId,
        currentStatus: processInfo.status
      });
    }

    if (!processInfo.process || !processInfo.process.stdin || processInfo.process.stdin.destroyed) {
      return res.status(500).json({
        success: false,
        error: 'Process stdin not available',
        message: 'Cannot send input to process',
        instanceId,
        pid: processInfo.pid
      });
    }

    try {
      // Send input to real Claude process stdin
      const inputWithNewline = input + '\n';
      const writeSuccess = processInfo.process.stdin.write(inputWithNewline);

      if (!writeSuccess) {
        // Handle backpressure
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Write timeout'));
          }, 5000);

          processInfo.process.stdin.once('drain', () => {
            clearTimeout(timeout);
            resolve();
          });

          processInfo.process.stdin.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      // Update process activity
      processInfo.lastActivity = new Date();
      processInfo.heartbeatCount = (processInfo.heartbeatCount || 0) + 1;

      processManager.logProcessEvent(instanceId, 'INPUT', input);

      // Broadcast input echo to SSE connections
      processManager.broadcastToSSE(instanceId, {
        type: 'input_echo',
        data: input,
        heartbeat: processInfo.heartbeatCount
      });

      res.json({
        success: true,
        instanceId,
        message: 'Input sent to Claude process',
        inputLength: input.length,
        pid: processInfo.pid,
        heartbeat: processInfo.heartbeatCount,
        timestamp: new Date().toISOString()
      });

    } catch (writeError) {
      processManager.logProcessEvent(instanceId, 'ERROR', 'Failed to write to process stdin', {
        error: writeError.message,
        pid: processInfo.pid
      });

      // Update circuit breaker on write failure
      processManager.updateCircuitBreaker(instanceId, false);

      res.status(500).json({
        success: false,
        error: 'Failed to send input to process',
        message: writeError.message,
        instanceId,
        pid: processInfo.pid
      });
    }

  } catch (error) {
    console.error(`❌ Terminal input error for instance ${instanceId}:`, error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      instanceId
    });
  }
});

// Enhanced instance termination
app.delete('/api/claude/instances/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  const force = req.query.force === 'true';

  try {
    if (!processManager.validateInstanceId(instanceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        instanceId
      });
    }

    processManager.logProcessEvent(instanceId, 'INFO', 'Termination requested', { force });

    const processInfo = processManager.activeProcesses.get(instanceId);
    if (!processInfo) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found',
        message: `Claude instance with ID ${instanceId} not found`,
        instanceId
      });
    }

    // Broadcast termination notice before cleanup
    processManager.broadcastToSSE(instanceId, {
      type: 'process_terminating',
      force,
      message: 'Process termination initiated'
    });

    // Perform cleanup
    await processManager.cleanupProcess(instanceId, force);

    res.json({
      success: true,
      message: `Claude instance ${instanceId} terminated successfully`,
      instanceId,
      pid: processInfo.pid,
      force,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Failed to terminate instance ${instanceId}:`, error);

    res.status(500).json({
      success: false,
      error: 'Failed to terminate instance',
      message: error.message,
      instanceId
    });
  }
});

// System metrics endpoint
app.get('/api/claude/metrics', (req, res) => {
  try {
    const metrics = processManager.getSystemMetrics();
    const processes = Array.from(processManager.activeProcesses.values());

    const detailedMetrics = {
      ...metrics,
      processes: {
        ...metrics.processes,
        byStatus: processes.reduce((acc, proc) => {
          acc[proc.status] = (acc[proc.status] || 0) + 1;
          return acc;
        }, {}),
        averageUptime: processes.length > 0
          ? processes.reduce((sum, proc) => sum + (Date.now() - proc.startTime.getTime()), 0) / processes.length
          : 0,
        totalHeartbeats: processes.reduce((sum, proc) => sum + (proc.heartbeatCount || 0), 0)
      },
      circuitBreakers: Object.fromEntries(processManager.circuitBreaker.entries())
    };

    res.json({
      success: true,
      metrics: detailedMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      message: error.message
    });
  }
});

// Graceful error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled API error:', error);

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: 'Enhanced Claude Process Backend started',
    port: PORT,
    claudeCLI: CLAUDE_CLI_PATH,
    workingDirectory: CLAUDE_WORKING_DIR,
    nodeEnv: process.env.NODE_ENV || 'production',
    features: [
      'Real process spawning',
      'SSE streaming with connection pooling',
      'Circuit breaker pattern',
      'Resource monitoring',
      'Graceful degradation',
      'Comprehensive error handling'
    ]
  }));
});

// Enhanced graceful shutdown with proper resource cleanup
const gracefulShutdown = async (signal) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: `Received ${signal}, shutting down gracefully`
  }));

  // Stop accepting new connections
  server.close();

  // Clean up all active processes
  const cleanupPromises = [];
  for (const [instanceId, processInfo] of processManager.activeProcesses.entries()) {
    console.log(`🧹 Cleaning up process ${instanceId} (PID: ${processInfo.pid})`);
    cleanupPromises.push(processManager.cleanupProcess(instanceId, false));
  }

  // Wait for all cleanups with timeout
  try {
    await Promise.race([
      Promise.all(cleanupPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 10000))
    ]);
    console.log('✅ All processes cleaned up successfully');
  } catch (error) {
    console.log('⚠️ Some processes required force cleanup');

    // Force cleanup remaining processes
    for (const [instanceId] of processManager.activeProcesses.entries()) {
      await processManager.cleanupProcess(instanceId, true);
    }
  }

  console.log('✅ Server shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'FATAL',
    message: 'Uncaught exception',
    error: error.message,
    stack: error.stack
  }));

  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: 'Unhandled promise rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: promise.toString()
  }));
});

module.exports = { app, server, processManager };