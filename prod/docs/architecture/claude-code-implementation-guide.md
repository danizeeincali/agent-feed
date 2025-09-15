# Claude Code Implementation Guide

## Overview

This document provides detailed technical implementation guidance for integrating Claude Code instances into the Avi Direct Message system. It focuses on the specific components that need to be built or modified.

## 1. Backend Components to Implement

### 1.1 ClaudeProcessManager Service

**File**: `/workspaces/agent-feed/prod/src/services/ClaudeProcessManager.js`

```javascript
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class ClaudeProcessManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.instances = new Map();
    this.config = {
      maxInstances: config.maxInstances || 50,
      instanceTimeout: config.instanceTimeout || 300000, // 5 minutes
      claudeBinaryPath: config.claudeBinaryPath || 'claude',
      workspaceRoot: config.workspaceRoot || '/workspaces/agent-feed/prod',
      ...config
    };
    this.setupCleanup();
  }

  async createInstance(options = {}) {
    const instanceId = uuidv4();

    try {
      const claudeProcess = spawn(this.config.claudeBinaryPath, [
        '--dangerously-skip-permissions'
      ], {
        cwd: options.workingDirectory || this.config.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDE_WORKING_DIR: options.workingDirectory }
      });

      const instance = {
        id: instanceId,
        process: claudeProcess,
        status: 'starting',
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: options.metadata || {},
        messageQueue: [],
        isProcessing: false
      };

      this.instances.set(instanceId, instance);
      this.setupProcessHandlers(instance);

      // Wait for process to be ready
      await this.waitForReady(instance);

      instance.status = 'ready';
      this.emit('instanceCreated', instanceId);

      return {
        id: instanceId,
        status: 'ready',
        createdAt: instance.createdAt
      };
    } catch (error) {
      this.emit('instanceError', instanceId, error);
      throw new Error(`Failed to create Claude instance: ${error.message}`);
    }
  }

  async sendMessage(instanceId, message) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status !== 'ready' && instance.status !== 'active') {
      throw new Error(`Instance ${instanceId} is not ready (status: ${instance.status})`);
    }

    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 30000);

      let response = '';
      let isStreaming = false;

      const cleanup = () => {
        clearTimeout(timeout);
        instance.process.stdout.removeListener('data', handleData);
        instance.process.stdout.removeListener('end', handleEnd);
      };

      const handleData = (data) => {
        const chunk = data.toString();
        response += chunk;

        if (!isStreaming) {
          isStreaming = true;
          this.emit('messageStreaming', instanceId, messageId, chunk);
        } else {
          this.emit('messageStreaming', instanceId, messageId, chunk);
        }
      };

      const handleEnd = () => {
        cleanup();
        this.emit('messageComplete', instanceId, messageId, response);
        resolve({
          content: response,
          messageId,
          timestamp: new Date()
        });
      };

      instance.process.stdout.on('data', handleData);
      instance.process.stdout.on('end', handleEnd);
      instance.process.stderr.on('data', (data) => {
        console.error(`Claude stderr [${instanceId}]:`, data.toString());
      });

      // Send message to Claude
      instance.process.stdin.write(JSON.stringify({
        type: 'message',
        content: message,
        messageId
      }) + '\n');

      instance.lastActivity = new Date();
      instance.status = 'active';
    });
  }

  setupProcessHandlers(instance) {
    const { process: claudeProcess, id } = instance;

    claudeProcess.on('error', (error) => {
      console.error(`Claude process error [${id}]:`, error);
      instance.status = 'error';
      this.emit('instanceError', id, error);
    });

    claudeProcess.on('exit', (code, signal) => {
      console.log(`Claude process exited [${id}]: code=${code}, signal=${signal}`);
      instance.status = 'stopped';
      this.emit('instanceStopped', id, { code, signal });

      // Auto-restart if unexpected exit
      if (code !== 0 && instance.status !== 'stopping') {
        this.restartInstance(id);
      }
    });

    // Heartbeat mechanism
    instance.heartbeatInterval = setInterval(() => {
      if (Date.now() - instance.lastActivity.getTime() > this.config.instanceTimeout) {
        this.stopInstance(id, 'timeout');
      }
    }, 60000); // Check every minute
  }

  async waitForReady(instance, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Instance startup timeout'));
      }, timeoutMs);

      const checkReady = () => {
        // Send a simple ping to test if Claude is responsive
        instance.process.stdin.write(JSON.stringify({
          type: 'ping'
        }) + '\n');
      };

      const handleData = (data) => {
        const response = data.toString();
        if (response.includes('pong') || response.includes('ready')) {
          clearTimeout(timeout);
          instance.process.stdout.removeListener('data', handleData);
          resolve();
        }
      };

      instance.process.stdout.on('data', handleData);
      setTimeout(checkReady, 1000); // Wait 1 second before pinging
    });
  }

  async stopInstance(instanceId, reason = 'manual') {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    instance.status = 'stopping';

    // Clear heartbeat
    if (instance.heartbeatInterval) {
      clearInterval(instance.heartbeatInterval);
    }

    // Graceful shutdown
    try {
      instance.process.stdin.write(JSON.stringify({
        type: 'shutdown'
      }) + '\n');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          instance.process.kill('SIGKILL');
          resolve();
        }, 5000);

        instance.process.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error(`Error stopping instance ${instanceId}:`, error);
      instance.process.kill('SIGKILL');
    }

    this.instances.delete(instanceId);
    this.emit('instanceStopped', instanceId, { reason });
  }

  async restartInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const options = {
      workingDirectory: instance.workingDirectory,
      metadata: instance.metadata
    };

    try {
      await this.stopInstance(instanceId, 'restart');
      const newInstance = await this.createInstance(options);
      this.emit('instanceRestarted', instanceId, newInstance.id);
      return newInstance;
    } catch (error) {
      this.emit('instanceError', instanceId, error);
      throw error;
    }
  }

  getInstanceStatus(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }

    return {
      id: instanceId,
      status: instance.status,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
      metadata: instance.metadata,
      uptime: Date.now() - instance.createdAt.getTime()
    };
  }

  listInstances() {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      status: instance.status,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
      metadata: instance.metadata
    }));
  }

  setupCleanup() {
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  async cleanup() {
    console.log('Cleaning up Claude instances...');
    const promises = Array.from(this.instances.keys()).map(id =>
      this.stopInstance(id, 'shutdown')
    );
    await Promise.all(promises);
  }
}

module.exports = ClaudeProcessManager;
```

### 1.2 WebSocket Manager Service

**File**: `/workspaces/agent-feed/prod/src/services/WebSocketManager.js`

```javascript
const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor(server, claudeProcessManager) {
    super();
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/claude'
    });
    this.claudeProcessManager = claudeProcessManager;
    this.connections = new Map(); // instanceId -> Set<WebSocket>
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, 'http://localhost');
      const instanceId = url.searchParams.get('instanceId');

      if (!instanceId) {
        ws.close(1008, 'Instance ID required');
        return;
      }

      this.handleConnection(ws, instanceId);
    });

    // Listen to Claude process events
    this.claudeProcessManager.on('messageStreaming', (instanceId, messageId, chunk) => {
      this.broadcastToInstance(instanceId, {
        type: 'streaming',
        messageId,
        content: chunk,
        timestamp: new Date().toISOString()
      });
    });

    this.claudeProcessManager.on('messageComplete', (instanceId, messageId, content) => {
      this.broadcastToInstance(instanceId, {
        type: 'message',
        messageId,
        content,
        timestamp: new Date().toISOString()
      });
    });

    this.claudeProcessManager.on('instanceError', (instanceId, error) => {
      this.broadcastToInstance(instanceId, {
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    this.claudeProcessManager.on('instanceStopped', (instanceId, info) => {
      this.broadcastToInstance(instanceId, {
        type: 'instance_stopped',
        reason: info.reason,
        timestamp: new Date().toISOString()
      });
    });

    this.claudeProcessManager.on('instanceRestarted', (oldInstanceId, newInstanceId) => {
      this.broadcastToInstance(oldInstanceId, {
        type: 'instance_restarted',
        newInstanceId,
        timestamp: new Date().toISOString()
      });
    });
  }

  handleConnection(ws, instanceId) {
    // Add connection to instance group
    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, new Set());
    }
    this.connections.get(instanceId).add(ws);

    console.log(`WebSocket connected to instance ${instanceId}`);

    // Send connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connected',
      instanceId,
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(ws, instanceId, data);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws, instanceId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for instance ${instanceId}:`, error);
      this.handleDisconnection(ws, instanceId);
    });

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    ws.on('close', () => clearInterval(heartbeat));
  }

  handleMessage(ws, instanceId, data) {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'subscribe_status':
        // Client wants to receive status updates
        ws.isSubscribedToStatus = true;
        break;

      case 'unsubscribe_status':
        ws.isSubscribedToStatus = false;
        break;

      default:
        console.log(`Unknown WebSocket message type: ${data.type}`);
    }
  }

  handleDisconnection(ws, instanceId) {
    const connections = this.connections.get(instanceId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.connections.delete(instanceId);
      }
    }
    console.log(`WebSocket disconnected from instance ${instanceId}`);
  }

  broadcastToInstance(instanceId, message) {
    const connections = this.connections.get(instanceId);
    if (!connections) return;

    const messageString = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  }

  broadcastStatus(instanceId, status) {
    const connections = this.connections.get(instanceId);
    if (!connections) return;

    const message = JSON.stringify({
      type: 'status_update',
      instanceId,
      status,
      timestamp: new Date().toISOString()
    });

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.isSubscribedToStatus) {
        ws.send(message);
      }
    });
  }

  getConnectionStats() {
    const stats = {
      totalConnections: 0,
      instanceConnections: {}
    };

    this.connections.forEach((connections, instanceId) => {
      stats.instanceConnections[instanceId] = connections.size;
      stats.totalConnections += connections.size;
    });

    return stats;
  }
}

module.exports = WebSocketManager;
```

### 1.3 API Routes Implementation

**File**: `/workspaces/agent-feed/prod/src/api/claude-instances.js`

```javascript
const express = require('express');
const router = express.Router();

// This will be injected by the main server
let claudeProcessManager = null;
let webSocketManager = null;

function initializeRoutes(cpm, wsm) {
  claudeProcessManager = cpm;
  webSocketManager = wsm;
}

// Create new Claude instance
router.post('/', async (req, res) => {
  try {
    const {
      name,
      workingDirectory,
      skipPermissions,
      resumeSession,
      metadata
    } = req.body;

    if (!claudeProcessManager) {
      return res.status(500).json({
        error: 'Claude Process Manager not initialized'
      });
    }

    const instance = await claudeProcessManager.createInstance({
      name,
      workingDirectory,
      skipPermissions,
      resumeSession,
      metadata
    });

    res.status(201).json({
      data: instance
    });
  } catch (error) {
    console.error('Error creating Claude instance:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Send message to Claude instance
router.post('/:instanceId/message', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { content, metadata } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    if (!claudeProcessManager) {
      return res.status(500).json({
        error: 'Claude Process Manager not initialized'
      });
    }

    const response = await claudeProcessManager.sendMessage(instanceId, content);

    res.json({
      data: {
        response,
        metadata
      }
    });
  } catch (error) {
    console.error(`Error sending message to instance ${req.params.instanceId}:`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Get instance status
router.get('/:instanceId/status', (req, res) => {
  try {
    const { instanceId } = req.params;

    if (!claudeProcessManager) {
      return res.status(500).json({
        error: 'Claude Process Manager not initialized'
      });
    }

    const status = claudeProcessManager.getInstanceStatus(instanceId);

    if (!status) {
      return res.status(404).json({
        error: 'Instance not found'
      });
    }

    res.json({
      data: status
    });
  } catch (error) {
    console.error(`Error getting instance status ${req.params.instanceId}:`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// List all instances
router.get('/', (req, res) => {
  try {
    if (!claudeProcessManager) {
      return res.status(500).json({
        error: 'Claude Process Manager not initialized'
      });
    }

    const instances = claudeProcessManager.listInstances();
    res.json({
      data: instances
    });
  } catch (error) {
    console.error('Error listing instances:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Stop instance
router.delete('/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;

    if (!claudeProcessManager) {
      return res.status(500).json({
        error: 'Claude Process Manager not initialized'
      });
    }

    await claudeProcessManager.stopInstance(instanceId, 'manual');
    res.status(204).end();
  } catch (error) {
    console.error(`Error stopping instance ${req.params.instanceId}:`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const stats = {
      processManager: !!claudeProcessManager,
      webSocketManager: !!webSocketManager,
      instances: claudeProcessManager ? claudeProcessManager.listInstances().length : 0,
      connections: webSocketManager ? webSocketManager.getConnectionStats() : { totalConnections: 0 }
    };

    res.json({
      status: 'healthy',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = { router, initializeRoutes };
```

## 2. Frontend Modifications Required

### 2.1 WebSocket Integration in AviDirectChatReal

**File**: `/workspaces/agent-feed/frontend/src/components/posting-interface/AviDirectChatReal.tsx`

The existing component needs WebSocket integration. Here are the key modifications:

```typescript
// Add WebSocket connection setup
useEffect(() => {
  if (instanceId && isConnected) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/claude?instanceId=${instanceId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to instance:', instanceId);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      if (event.code !== 1000) { // Not a normal closure
        setError('Connection lost. Attempting to reconnect...');
        // Implement reconnection logic
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }
}, [instanceId, isConnected]);
```

### 2.2 Enhanced Message Handling

```typescript
// Update handleWebSocketMessage to support new message types
const handleWebSocketMessage = useCallback((data: any) => {
  switch (data.type) {
    case 'streaming':
      // Handle streaming responses
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
          return prev.map((msg, index) =>
            index === prev.length - 1
              ? { ...msg, content: msg.content + data.content }
              : msg
          );
        } else {
          return [...prev, {
            id: `claude-streaming-${Date.now()}`,
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
            status: 'sent',
            isStreaming: true
          }];
        }
      });
      break;

    case 'message':
      // Complete message received
      setMessages(prev => prev.map(msg =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      ));
      setIsTyping(false);
      break;

    case 'error':
      setError(data.message || 'Claude Code error');
      setIsTyping(false);
      break;

    case 'instance_stopped':
      setError('Claude instance stopped unexpectedly');
      setIsConnected(false);
      break;

    case 'instance_restarted':
      setInstanceId(data.newInstanceId);
      setError('Instance restarted. Reconnecting...');
      break;

    default:
      console.log('Unknown WebSocket message type:', data.type);
  }
}, []);
```

## 3. Server Integration

### 3.1 Main Server Setup

**File**: `/workspaces/agent-feed/prod/src/server/main.js`

```javascript
const express = require('express');
const http = require('http');
const ClaudeProcessManager = require('../services/ClaudeProcessManager');
const WebSocketManager = require('../services/WebSocketManager');
const { router: claudeInstancesRouter, initializeRoutes } = require('../api/claude-instances');

const app = express();
const server = http.createServer(app);

// Initialize services
const claudeProcessManager = new ClaudeProcessManager({
  maxInstances: 50,
  claudeBinaryPath: 'claude',
  workspaceRoot: '/workspaces/agent-feed/prod'
});

const webSocketManager = new WebSocketManager(server, claudeProcessManager);

// Initialize API routes
initializeRoutes(claudeProcessManager, webSocketManager);

// Middleware
app.use(express.json());

// API Routes
app.use('/api/claude-instances', claudeInstancesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      claudeProcessManager: true,
      webSocketManager: true
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws/claude`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await claudeProcessManager.cleanup();
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});
```

## 4. Configuration Updates

### 4.1 Package.json Dependencies

Add required dependencies:

```json
{
  "dependencies": {
    "ws": "^8.14.0",
    "uuid": "^9.0.0"
  }
}
```

### 4.2 Environment Configuration

**File**: `/workspaces/agent-feed/prod/.env`

```env
# Claude Configuration
CLAUDE_BINARY_PATH=claude
CLAUDE_MAX_INSTANCES=50
CLAUDE_INSTANCE_TIMEOUT=300000
CLAUDE_WORKSPACE_ROOT=/workspaces/agent-feed/prod

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000

# Security
CLAUDE_DANGEROUS_PERMISSIONS=true
CLAUDE_SANDBOX_ENABLED=false
```

## 5. Error Handling Implementation

### 5.1 Circuit Breaker Pattern

**File**: `/workspaces/agent-feed/prod/src/utils/CircuitBreaker.js`

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

module.exports = CircuitBreaker;
```

## 6. Testing Strategy

### 6.1 Unit Tests

**File**: `/workspaces/agent-feed/prod/src/tests/services/ClaudeProcessManager.test.js`

```javascript
const ClaudeProcessManager = require('../../services/ClaudeProcessManager');

describe('ClaudeProcessManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ClaudeProcessManager({
      claudeBinaryPath: 'echo', // Use echo for testing
      maxInstances: 5
    });
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  test('should create instance successfully', async () => {
    const instance = await manager.createInstance({
      workingDirectory: '/tmp'
    });

    expect(instance).toHaveProperty('id');
    expect(instance.status).toBe('ready');
  });

  test('should handle instance creation failure', async () => {
    manager.config.claudeBinaryPath = 'non-existent-command';

    await expect(
      manager.createInstance()
    ).rejects.toThrow('Failed to create Claude instance');
  });

  // Add more tests...
});
```

### 6.2 Integration Tests

**File**: `/workspaces/agent-feed/prod/src/tests/integration/claude-api.test.js`

```javascript
const request = require('supertest');
const app = require('../../server/main');

describe('Claude API Integration', () => {
  test('POST /api/claude-instances', async () => {
    const response = await request(app)
      .post('/api/claude-instances')
      .send({
        name: 'Test Instance',
        workingDirectory: '/tmp',
        skipPermissions: true
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
  });

  // Add more integration tests...
});
```

## 7. Monitoring and Observability

### 7.1 Metrics Collection

**File**: `/workspaces/agent-feed/prod/src/monitoring/metrics.js`

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      instancesCreated: 0,
      instancesFailed: 0,
      messagesProcessed: 0,
      averageResponseTime: 0,
      activeConnections: 0
    };
  }

  incrementInstancesCreated() {
    this.metrics.instancesCreated++;
  }

  incrementInstancesFailed() {
    this.metrics.instancesFailed++;
  }

  recordMessageProcessed(responseTime) {
    this.metrics.messagesProcessed++;
    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  updateActiveConnections(count) {
    this.metrics.activeConnections = count;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = new MetricsCollector();
```

## 8. Deployment Checklist

### Pre-deployment
- [ ] Install Claude Code binary
- [ ] Configure environment variables
- [ ] Set up process monitoring (PM2/systemd)
- [ ] Configure logging rotation
- [ ] Set up resource limits

### Post-deployment
- [ ] Verify API endpoints respond correctly
- [ ] Test WebSocket connections
- [ ] Monitor instance creation/destruction
- [ ] Check error handling and recovery
- [ ] Validate performance metrics

## 9. Security Considerations

### 9.1 Input Validation
- Sanitize all user inputs before sending to Claude
- Validate file paths and working directories
- Implement rate limiting per user/IP
- Log all commands and responses for audit

### 9.2 Process Sandboxing
```javascript
// Example sandboxing configuration
const sandboxConfig = {
  allowedPaths: ['/workspaces/agent-feed/prod'],
  blockedCommands: ['rm', 'sudo', 'chmod'],
  resourceLimits: {
    memory: '512MB',
    cpu: '50%',
    processes: 10
  }
};
```

## 10. Performance Optimization

### 10.1 Connection Pooling
- Reuse WebSocket connections when possible
- Implement connection pooling for multiple instances
- Monitor connection health and cleanup stale connections

### 10.2 Message Queuing
- Implement message queuing for high-load scenarios
- Use Redis for distributed message queuing
- Implement backpressure handling

## Conclusion

This implementation guide provides the foundation for integrating Claude Code instances into the Avi Direct Message system. Follow the phased approach, starting with basic HTTP functionality and gradually adding WebSocket streaming capabilities.

Key success factors:
1. Robust error handling and recovery
2. Proper resource management and cleanup
3. Comprehensive testing at all levels
4. Security-first approach to process management
5. Performance monitoring and optimization

Monitor the system closely during initial deployment and be prepared to adjust resource limits and error handling based on actual usage patterns.