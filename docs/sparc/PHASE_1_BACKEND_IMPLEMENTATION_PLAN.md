# Phase 1: Backend HTTP/SSE Implementation Plan

## Overview
This document details the implementation of HTTP endpoints and Server-Sent Events (SSE) to replace WebSocket functionality in the agent-feed backend system.

## Current State Analysis

### Existing WebSocket Dependencies (Backend)
```
src/api/server.ts - Lines 138-196: Socket.IO server configuration
src/api/server.ts - Lines 591-1432: Complete WebSocket event handling
src/services/claude-instance-terminal-websocket.ts - Terminal WebSocket service
src/services/terminal-streaming-service.ts - Terminal streaming via WebSocket
src/api/routes/claude-instances.js - WebSocket setup functions
```

### Working HTTP/SSE Components
```
src/api/server.ts - Lines 405-502: SSE endpoints already implemented
- GET /api/v1/claude/instances/:instanceId/terminal/stream (SSE)
- GET /api/v1/claude/instances/:instanceId/terminal/poll (HTTP polling)
- GET /api/v1/claude/terminal/output/:pid (Direct output)
```

## Implementation Strategy

### Step 1: Enhanced HTTP API Endpoints

#### 1.1 Claude Instance Management API
```typescript
// src/api/controllers/HttpClaudeInstanceController.ts
export class HttpClaudeInstanceController {
  // Create new Claude instance
  async createInstance(req: Request, res: Response): Promise<void> {
    try {
      const { command, workingDirectory, environment } = req.body;
      
      const instanceConfig = this.parseInstanceConfig(command);
      const processInfo = await claudeProcessManager.createInstance({
        ...instanceConfig,
        workingDirectory: workingDirectory || '/workspaces/agent-feed/prod',
        environment: environment || {}
      });
      
      res.status(201).json({
        success: true,
        instanceId: processInfo.id,
        pid: processInfo.pid,
        status: 'starting',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get instance status
  async getInstanceStatus(req: Request, res: Response): Promise<void> {
    const { instanceId } = req.params;
    
    try {
      const instance = await claudeProcessManager.getInstance(instanceId);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found',
          instanceId
        });
      }
      
      res.json({
        success: true,
        instance: {
          id: instance.id,
          pid: instance.pid,
          status: instance.status,
          startTime: instance.startTime,
          uptime: Date.now() - instance.startTime,
          memory: instance.memoryUsage,
          cpu: instance.cpuUsage
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        instanceId
      });
    }
  }

  // List all instances
  async listInstances(req: Request, res: Response): Promise<void> {
    try {
      const instances = await claudeProcessManager.getAllInstances();
      
      res.json({
        success: true,
        instances: instances.map(instance => ({
          id: instance.id,
          pid: instance.pid,
          status: instance.status,
          startTime: instance.startTime,
          command: instance.command,
          uptime: Date.now() - instance.startTime
        })),
        count: instances.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Terminate instance
  async terminateInstance(req: Request, res: Response): Promise<void> {
    const { instanceId } = req.params;
    
    try {
      const result = await claudeProcessManager.terminateInstance(instanceId);
      
      res.json({
        success: true,
        instanceId,
        previousStatus: result.previousStatus,
        terminatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        instanceId
      });
    }
  }

  // Send terminal input
  async sendTerminalInput(req: Request, res: Response): Promise<void> {
    const { instanceId } = req.params;
    const { input } = req.body;
    
    try {
      if (!input || typeof input !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Input must be a non-empty string'
        });
      }
      
      const result = await claudeProcessManager.sendInput(instanceId, input);
      
      res.json({
        success: true,
        instanceId,
        inputLength: input.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        instanceId
      });
    }
  }
}
```

#### 1.2 Enhanced SSE Streaming Service
```typescript
// src/services/HttpSSEStreamingService.ts
export class HttpSSEStreamingService {
  private connections = new Map<string, Response>();
  private instanceStreams = new Map<string, NodeJS.ReadableStream>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  
  // Create SSE connection for instance
  createInstanceStream(instanceId: string, req: Request, res: Response): void {
    console.log(`📡 Creating SSE stream for instance: ${instanceId}`);
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET'
    });
    
    // Send initial connection event
    this.sendSSEEvent(res, 'connected', {
      instanceId,
      timestamp: new Date().toISOString(),
      streamId: `sse-${Date.now()}`
    });
    
    // Store connection
    const connectionKey = `${instanceId}-${Date.now()}`;
    this.connections.set(connectionKey, res);
    
    // Set up terminal output streaming
    this.attachTerminalStream(instanceId, connectionKey);
    
    // Set up heartbeat
    this.startHeartbeat(connectionKey, res);
    
    // Handle client disconnect
    req.on('close', () => {
      this.cleanupConnection(connectionKey, instanceId);
    });
    
    req.on('error', (error) => {
      console.error(`SSE connection error for ${instanceId}:`, error);
      this.cleanupConnection(connectionKey, instanceId);
    });
  }
  
  private attachTerminalStream(instanceId: string, connectionKey: string): void {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;
    
    // Listen to Claude process terminal output
    const outputHandler = (data: any) => {
      if (data.instanceId === instanceId && data.output) {
        this.sendSSEEvent(connection, 'terminal_output', {
          instanceId,
          output: data.output,
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Listen to process status changes
    const statusHandler = (data: any) => {
      if (data.instanceId === instanceId) {
        this.sendSSEEvent(connection, 'status_update', {
          instanceId,
          status: data.status,
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Register handlers with process manager
    claudeProcessManager.on('terminal:output', outputHandler);
    claudeProcessManager.on('status:change', statusHandler);
    
    // Store handlers for cleanup
    (connection as any)._outputHandler = outputHandler;
    (connection as any)._statusHandler = statusHandler;
  }
  
  private sendSSEEvent(res: Response, type: string, data: any): void {
    const sseData = JSON.stringify({ type, ...data });
    res.write(`data: ${sseData}\n\n`);
  }
  
  private startHeartbeat(connectionKey: string, res: Response): void {
    const interval = setInterval(() => {
      if (this.connections.has(connectionKey)) {
        this.sendSSEEvent(res, 'heartbeat', {
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(interval);
      }
    }, 30000); // Every 30 seconds
    
    this.heartbeatIntervals.set(connectionKey, interval);
  }
  
  private cleanupConnection(connectionKey: string, instanceId: string): void {
    console.log(`🧹 Cleaning up SSE connection: ${connectionKey}`);
    
    const connection = this.connections.get(connectionKey);
    if (connection) {
      // Remove event handlers
      if ((connection as any)._outputHandler) {
        claudeProcessManager.removeListener('terminal:output', (connection as any)._outputHandler);
      }
      if ((connection as any)._statusHandler) {
        claudeProcessManager.removeListener('status:change', (connection as any)._statusHandler);
      }
    }
    
    // Clear heartbeat
    const interval = this.heartbeatIntervals.get(connectionKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionKey);
    }
    
    // Remove connection
    this.connections.delete(connectionKey);
  }
  
  // Broadcast to all connections for an instance
  broadcastToInstance(instanceId: string, eventType: string, data: any): void {
    for (const [connectionKey, connection] of this.connections.entries()) {
      if (connectionKey.startsWith(instanceId)) {
        this.sendSSEEvent(connection, eventType, {
          instanceId,
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // Get connection statistics
  getStats(): { totalConnections: number; instanceConnections: Map<string, number> } {
    const instanceConnections = new Map<string, number>();
    
    for (const connectionKey of this.connections.keys()) {
      const instanceId = connectionKey.split('-')[0];
      instanceConnections.set(instanceId, (instanceConnections.get(instanceId) || 0) + 1);
    }
    
    return {
      totalConnections: this.connections.size,
      instanceConnections
    };
  }
}
```

### Step 2: HTTP Polling Fallback Service

```typescript
// src/services/HttpPollingService.ts
export class HttpPollingService {
  private pollData = new Map<string, any>();
  private lastUpdate = new Map<string, number>();
  
  // Get polling data for instance
  async getPollData(instanceId: string, since?: string): Promise<any> {
    try {
      const instance = await claudeProcessManager.getInstance(instanceId);
      if (!instance) {
        return {
          success: false,
          error: 'Instance not found',
          instanceId
        };
      }
      
      const sinceTimestamp = since ? new Date(since).getTime() : 0;
      const lastUpdateTime = this.lastUpdate.get(instanceId) || 0;
      
      // Check if there's new data since last poll
      const hasNewData = lastUpdateTime > sinceTimestamp;
      
      return {
        success: true,
        instanceId,
        hasNewData,
        data: hasNewData ? this.pollData.get(instanceId) : null,
        lastUpdate: new Date(lastUpdateTime).toISOString(),
        instance: {
          id: instance.id,
          status: instance.status,
          pid: instance.pid,
          uptime: Date.now() - instance.startTime
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        instanceId
      };
    }
  }
  
  // Update poll data (called by process events)
  updatePollData(instanceId: string, type: string, data: any): void {
    const currentData = this.pollData.get(instanceId) || { events: [] };
    
    currentData.events.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 events
    if (currentData.events.length > 50) {
      currentData.events = currentData.events.slice(-50);
    }
    
    this.pollData.set(instanceId, currentData);
    this.lastUpdate.set(instanceId, Date.now());
  }
  
  // Clean up data for terminated instances
  cleanup(instanceId: string): void {
    this.pollData.delete(instanceId);
    this.lastUpdate.delete(instanceId);
  }
}
```

### Step 3: Enhanced Route Configuration

```typescript
// src/api/routes/http-claude-instances.ts
import { Router } from 'express';
import { HttpClaudeInstanceController } from '../controllers/HttpClaudeInstanceController';
import { HttpSSEStreamingService } from '../services/HttpSSEStreamingService';
import { HttpPollingService } from '../services/HttpPollingService';

const router = Router();
const controller = new HttpClaudeInstanceController();
const sseService = new HttpSSEStreamingService();
const pollingService = new HttpPollingService();

// Instance management endpoints
router.post('/', controller.createInstance.bind(controller));
router.get('/', controller.listInstances.bind(controller));
router.get('/:instanceId', controller.getInstanceStatus.bind(controller));
router.delete('/:instanceId', controller.terminateInstance.bind(controller));

// Terminal interaction endpoints
router.post('/:instanceId/terminal/input', controller.sendTerminalInput.bind(controller));

// Real-time streaming endpoints
router.get('/:instanceId/stream', (req, res) => {
  const instanceId = req.params.instanceId;
  sseService.createInstanceStream(instanceId, req, res);
});

// Polling fallback endpoints
router.get('/:instanceId/poll', async (req, res) => {
  const instanceId = req.params.instanceId;
  const since = req.query.since as string;
  
  const result = await pollingService.getPollData(instanceId, since);
  res.json(result);
});

// Health and diagnostics endpoints
router.get('/:instanceId/health', async (req, res) => {
  const instanceId = req.params.instanceId;
  
  try {
    const instance = await claudeProcessManager.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    const health = await claudeProcessManager.checkHealth(instanceId);
    
    res.json({
      success: true,
      instanceId,
      health,
      sseConnections: sseService.getStats().instanceConnections.get(instanceId) || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      instanceId
    });
  }
});

// System-wide statistics
router.get('/system/stats', (req, res) => {
  const sseStats = sseService.getStats();
  
  res.json({
    success: true,
    stats: {
      totalSSEConnections: sseStats.totalConnections,
      instanceConnections: Object.fromEntries(sseStats.instanceConnections),
      totalInstances: claudeProcessManager.getInstanceCount(),
      systemUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
```

### Step 4: Integration with Existing Server

```typescript
// src/api/server.ts - Modifications needed

// Import new HTTP services
import httpClaudeInstancesRouter from './routes/http-claude-instances';
import { HttpSSEStreamingService } from './services/HttpSSEStreamingService';
import { HttpPollingService } from './services/HttpPollingService';

// Initialize services
const httpSSEService = new HttpSSEStreamingService();
const httpPollingService = new HttpPollingService();

// Mount new HTTP routes (replace WebSocket routes)
app.use('/api/v1/claude/instances', httpClaudeInstancesRouter);

// Connect services to process manager events
processManager.on('terminal:output', (data) => {
  // Broadcast via SSE
  httpSSEService.broadcastToInstance(data.instanceId, 'terminal_output', {
    output: data.output
  });
  
  // Update polling data
  httpPollingService.updatePollData(data.instanceId, 'terminal_output', {
    output: data.output
  });
});

processManager.on('status:change', (data) => {
  // Broadcast via SSE
  httpSSEService.broadcastToInstance(data.instanceId, 'status_update', {
    status: data.status
  });
  
  // Update polling data
  httpPollingService.updatePollData(data.instanceId, 'status_update', {
    status: data.status
  });
});

processManager.on('instance:terminated', (data) => {
  // Cleanup polling data
  httpPollingService.cleanup(data.instanceId);
});

// Disable WebSocket server (set flag to false)
const WEBSOCKET_ENABLED = false; // Force disable to prevent conflicts
```

## Testing Strategy

### Unit Tests
```typescript
// tests/http-sse-backend.test.ts
describe('HTTP/SSE Backend Services', () => {
  describe('HttpClaudeInstanceController', () => {
    test('should create instance via HTTP POST', async () => {
      const response = await request(app)
        .post('/api/v1/claude/instances')
        .send({ command: 'claude --test' })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.instanceId).toMatch(/^claude-\d+$/);
    });
  });
  
  describe('HttpSSEStreamingService', () => {
    test('should establish SSE connection', async () => {
      const instanceId = 'test-123';
      const sseClient = new EventSource(`/api/v1/claude/instances/${instanceId}/stream`);
      
      await new Promise((resolve) => {
        sseClient.onopen = resolve;
      });
      
      expect(sseClient.readyState).toBe(EventSource.OPEN);
      sseClient.close();
    });
  });
});
```

### Integration Tests
```typescript
describe('HTTP/SSE Integration', () => {
  test('should handle complete terminal workflow', async () => {
    // Create instance
    const createRes = await request(app)
      .post('/api/v1/claude/instances')
      .send({ command: 'echo test' });
    
    const instanceId = createRes.body.instanceId;
    
    // Connect to SSE
    const sseClient = new EventSource(`/api/v1/claude/instances/${instanceId}/stream`);
    
    // Send input
    await request(app)
      .post(`/api/v1/claude/instances/${instanceId}/terminal/input`)
      .send({ input: 'test command\n' });
    
    // Wait for output via SSE
    const output = await new Promise((resolve) => {
      sseClient.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'terminal_output') {
          resolve(data.output);
        }
      };
    });
    
    expect(output).toContain('test');
    
    // Cleanup
    sseClient.close();
    await request(app).delete(`/api/v1/claude/instances/${instanceId}`);
  });
});
```

## Implementation Checklist

### Week 1 Tasks
- [ ] Implement HttpClaudeInstanceController
- [ ] Create HttpSSEStreamingService  
- [ ] Build HttpPollingService
- [ ] Set up new route handlers
- [ ] Write comprehensive test suite
- [ ] Integration testing with existing process manager
- [ ] Performance testing for concurrent connections

### Success Criteria
- All HTTP endpoints respond correctly
- SSE streams deliver real-time terminal output
- Polling fallback works when SSE unavailable
- No memory leaks in long-running connections
- Performance matches or exceeds WebSocket implementation
- 100% test coverage for new components

This completes the backend implementation plan for Phase 1 of the WebSocket to HTTP/SSE conversion.