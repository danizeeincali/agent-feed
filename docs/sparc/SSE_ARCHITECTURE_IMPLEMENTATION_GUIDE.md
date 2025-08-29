# SSE Architecture Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the comprehensive SSE streaming architecture that prevents message accumulation storms while maintaining optimal performance for Claude instance streaming.

## 📋 Implementation Checklist

### Phase 1: Backend Implementation (Week 1)

#### 1.1 Output Buffer Manager Integration

```javascript
// In your existing simple-backend.js, add:
const OutputBufferManager = require('./src/services/OutputBufferManager');
const SSEEventStreamer = require('./src/services/SSEEventStreamer');

// Initialize services
const bufferManager = OutputBufferManager.getInstance();
const eventStreamer = SSEEventStreamer.getInstance();

// Replace existing output handling
function setupProcessHandlers(instanceId, processInfo) {
  const { process: claudeProcess } = processInfo;
  
  claudeProcess.stdout.on('data', (data) => {
    const rawOutput = data.toString('utf8');
    
    // Process through buffer manager
    const outputChunks = bufferManager.processOutput(instanceId, rawOutput);
    
    // Create SSE events for each chunk
    outputChunks.forEach(chunk => {
      const sseEvent = eventStreamer.createOutputEvent(instanceId, chunk.content, 'stdout');
      broadcastSSEEvent(instanceId, sseEvent);
    });
  });
}
```

#### 1.2 Enhanced SSE Broadcasting

```javascript
// Replace existing broadcast function
function broadcastSSEEvent(instanceId, sseEvent) {
  const connections = getActiveConnections(instanceId);
  const result = eventStreamer.broadcast(connections, sseEvent);
  
  console.log(`📊 Broadcast result for ${instanceId}:`, {
    attempted: result.attempted,
    successful: result.successful,
    failed: result.failed,
    bytesTransferred: result.bytesTransferred
  });
  
  // Handle failed connections
  if (result.failed > 0) {
    console.warn(`${result.failed} connections failed for ${instanceId}`);
    cleanupFailedConnections(instanceId, result.errors);
  }
}

// Add connection health monitoring
function getActiveConnections(instanceId) {
  const rawConnections = activeSSEConnections.get(instanceId) || [];
  
  return rawConnections
    .filter(conn => conn.response && !conn.response.writableEnded)
    .map(conn => ({
      id: conn.id || `${instanceId}-${Date.now()}`,
      response: conn.response,
      instanceId
    }));
}
```

#### 1.3 Connection Manager Updates

```javascript
// Enhanced SSE endpoint with proper connection tracking
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  const connectionId = eventStreamer.trackConnection(`${instanceId}-${Date.now()}`);
  
  // Set SSE headers with better caching control
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
    'X-Connection-ID': connectionId
  });
  
  // Add connection to manager
  if (!activeSSEConnections.has(instanceId)) {
    activeSSEConnections.set(instanceId, []);
  }
  
  const connectionInfo = {
    id: connectionId,
    response: res,
    instanceId,
    startTime: Date.now()
  };
  
  activeSSEConnections.get(instanceId).push(connectionInfo);
  
  // Send initial connection event
  const connectEvent = eventStreamer.createConnectionEvent(instanceId, connectionId, {
    bufferStatus: bufferManager.getBufferStatus(instanceId)
  });
  res.write(eventStreamer.formatSSEMessage(connectEvent));
  
  // Send any buffered output
  const bufferedChunks = bufferManager.getIncrementalChunks(instanceId, 0);
  bufferedChunks.forEach(chunk => {
    const outputEvent = eventStreamer.createOutputEvent(instanceId, chunk.content, 'buffered');
    res.write(eventStreamer.formatSSEMessage(outputEvent));
  });
  
  // Handle disconnection
  req.on('close', () => {
    eventStreamer.removeConnection(connectionId);
    const connections = activeSSEConnections.get(instanceId) || [];
    const index = connections.findIndex(conn => conn.id === connectionId);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(`🔌 SSE connection ${connectionId} closed for ${instanceId}`);
  });
});
```

### Phase 2: Frontend Implementation (Week 2)

#### 2.1 Replace Existing SSE Hook

```typescript
// In your component files, replace useSSEConnectionSingleton with:
import useAdvancedSSEConnection from '../hooks/useAdvancedSSEConnection';

// In your component
const {
  connectionState,
  connectToInstance,
  disconnectFromInstance,
  addMessageHandler,
  getUIState
} = useAdvancedSSEConnection(apiUrl, {
  autoReconnect: true,
  maxRetries: 5,
  enableBackfill: true,
  batchSize: 10,
  maxMemoryMB: 10
});
```

#### 2.2 Update ClaudeInstanceManagerModern

```typescript
// Replace existing message handling in ClaudeInstanceManagerModern.tsx
useEffect(() => {
  const removeHandler = addMessageHandler((instanceId, messages) => {
    if (messages.length === 0) return;
    
    // Batch process messages to prevent UI blocking
    const content = messages
      .filter(msg => msg.type === 'output')
      .map(msg => msg.content)
      .join('');
    
    if (content) {
      setOutput(prev => ({
        ...prev,
        [instanceId]: (prev[instanceId] || '') + content
      }));
    }
    
    // Handle status messages separately
    const statusMessages = messages.filter(msg => msg.type === 'status');
    statusMessages.forEach(msg => {
      console.log(`📲 Status update for ${instanceId}:`, msg.content);
    });
  });
  
  return removeHandler;
}, [addMessageHandler]);
```

#### 2.3 Add Advanced Terminal Component

```typescript
// Add to your App.tsx routing
<Route path="/advanced-terminal/:instanceId" element={
  <RouteErrorBoundary routeName="AdvancedTerminal">
    <Suspense fallback={<LoadingFallback message="Loading Advanced Terminal..." />}>
      <AdvancedSSETerminal instanceId={useParams().instanceId} />
    </Suspense>
  </RouteErrorBoundary>
} />
```

### Phase 3: Performance Optimization (Week 3)

#### 3.1 Add Monitoring Dashboard

```typescript
// Create PerformanceMonitoringDashboard.tsx
import React, { useState, useEffect } from 'react';
import useAdvancedSSEConnection from '../hooks/useAdvancedSSEConnection';

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [instances, setInstances] = useState<string[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  
  const { connectionState, metrics, getMetrics } = useAdvancedSSEConnection('http://localhost:3000');
  
  useEffect(() => {
    // Fetch active instances
    fetch('/api/claude/instances')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInstances(data.instances.map(i => i.id));
        }
      });
  }, []);
  
  const currentMetrics = getMetrics();
  
  return (
    <div className="p-6 bg-gray-100">
      <h2 className="text-2xl font-bold mb-6">SSE Performance Monitoring</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Connection Health</h3>
          <div className={`text-2xl font-bold ${
            connectionState.connectionHealth === 'healthy' ? 'text-green-600' :
            connectionState.connectionHealth === 'degraded' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {connectionState.connectionHealth.toUpperCase()}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Messages/Second</h3>
          <div className="text-2xl font-bold text-blue-600">
            {connectionState.messagesPerSecond}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
          <div className="text-2xl font-bold text-purple-600">
            {connectionState.memoryUsage} MB
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Total Messages:</strong> {currentMetrics.totalMessages}
          </div>
          <div>
            <strong>Average Latency:</strong> {currentMetrics.averageLatency}ms
          </div>
          <div>
            <strong>Connection Uptime:</strong> {Math.round(currentMetrics.connectionUptime)}s
          </div>
          <div>
            <strong>Recovery Count:</strong> {currentMetrics.recoveryCount}
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### 3.2 Backend Performance Endpoints

```javascript
// Add monitoring endpoints to simple-backend.js
app.get('/api/performance/sse', (req, res) => {
  const stats = {
    bufferManager: {
      totalMemoryUsage: bufferManager.getTotalMemoryUsage(),
      activeBuffers: bufferManager.getActiveBufferCount(),
      ...bufferManager.getGlobalStats()
    },
    eventStreamer: {
      ...eventStreamer.getStatistics()
    },
    connections: {
      total: Array.from(activeSSEConnections.values()).reduce((sum, conns) => sum + conns.length, 0),
      byInstance: Object.fromEntries(
        Array.from(activeSSEConnections.entries()).map(([id, conns]) => [id, conns.length])
      )
    }
  };
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    stats
  });
});

app.get('/api/performance/sse/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  const bufferStatus = bufferManager.getBufferStatus(instanceId);
  const connectionHealth = eventStreamer.getAllConnectionHealth();
  
  res.json({
    success: true,
    instanceId,
    bufferStatus,
    connectionHealth: Array.from(connectionHealth.entries())
      .filter(([id]) => id.startsWith(instanceId))
      .map(([id, health]) => ({ id, ...health }))
  });
});
```

### Phase 4: Testing and Validation (Week 4)

#### 4.1 Load Testing Script

```javascript
// Create load-test-sse.js
const EventSource = require('eventsource');

class SSELoadTester {
  constructor(baseUrl, instanceId) {
    this.baseUrl = baseUrl;
    this.instanceId = instanceId;
    this.connections = [];
    this.messageCount = 0;
    this.startTime = Date.now();
  }
  
  async runTest(concurrentConnections = 10, durationMs = 60000) {
    console.log(`🧪 Starting SSE load test:`);
    console.log(`   Concurrent connections: ${concurrentConnections}`);
    console.log(`   Duration: ${durationMs}ms`);
    console.log(`   Target: ${this.baseUrl}/api/claude/instances/${this.instanceId}/terminal/stream`);
    
    // Create connections
    for (let i = 0; i < concurrentConnections; i++) {
      const connection = this.createConnection(i);
      this.connections.push(connection);
    }
    
    // Run for specified duration
    setTimeout(() => {
      this.stopTest();
    }, durationMs);
  }
  
  createConnection(id) {
    const url = `${this.baseUrl}/api/claude/instances/${this.instanceId}/terminal/stream`;
    const eventSource = new EventSource(url);
    
    eventSource.onopen = () => {
      console.log(`✅ Connection ${id} opened`);
    };
    
    eventSource.onmessage = (event) => {
      this.messageCount++;
      
      if (this.messageCount % 100 === 0) {
        const elapsed = Date.now() - this.startTime;
        const rate = this.messageCount / (elapsed / 1000);
        console.log(`📊 Messages received: ${this.messageCount}, Rate: ${rate.toFixed(2)}/s`);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error(`❌ Connection ${id} error:`, error);
    };
    
    return eventSource;
  }
  
  stopTest() {
    console.log(`🛑 Stopping load test...`);
    
    this.connections.forEach((connection, i) => {
      connection.close();
    });
    
    const elapsed = Date.now() - this.startTime;
    const averageRate = this.messageCount / (elapsed / 1000);
    
    console.log(`📈 Load test results:`);
    console.log(`   Total messages: ${this.messageCount}`);
    console.log(`   Duration: ${elapsed}ms`);
    console.log(`   Average rate: ${averageRate.toFixed(2)} messages/second`);
    console.log(`   Messages per connection: ${(this.messageCount / this.connections.length).toFixed(2)}`);
  }
}

// Run load test
const tester = new SSELoadTester('http://localhost:3000', 'claude-2426');
tester.runTest(20, 120000); // 20 connections for 2 minutes
```

#### 4.2 Memory Leak Detection

```javascript
// Create memory-test.js
const { performance } = require('perf_hooks');

class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.interval = null;
  }
  
  start(intervalMs = 5000) {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      const sample = {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      };
      
      this.samples.push(sample);
      
      // Keep only recent samples
      if (this.samples.length > 100) {
        this.samples = this.samples.slice(-50);
      }
      
      this.logMemoryUsage(sample);
    }, intervalMs);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  
  logMemoryUsage(sample) {
    const heapMB = Math.round(sample.heapUsed / 1024 / 1024);
    const rssMB = Math.round(sample.rss / 1024 / 1024);
    
    console.log(`💾 Memory Usage: Heap ${heapMB}MB, RSS ${rssMB}MB`);
    
    // Detect potential memory leaks
    if (this.samples.length > 10) {
      const recent = this.samples.slice(-10);
      const trend = this.calculateTrend(recent.map(s => s.heapUsed));
      
      if (trend > 1024 * 1024) { // 1MB increase trend
        console.warn(`⚠️ Potential memory leak detected: ${Math.round(trend / 1024 / 1024)}MB trend`);
      }
    }
  }
  
  calculateTrend(values) {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }
}

// Start memory monitoring
const monitor = new MemoryMonitor();
monitor.start(10000); // Every 10 seconds

// Stop after 10 minutes
setTimeout(() => {
  monitor.stop();
  console.log('Memory monitoring complete');
  process.exit(0);
}, 600000);
```

## 🔧 Configuration Options

### Backend Configuration

```javascript
// In simple-backend.js, configure buffer manager
bufferManager.updateSettings('default', {
  bufferSize: 2 * 1024 * 1024,    // 2MB default buffer
  chunkSize: 8192,                // 8KB chunks
  compressionEnabled: false,       // Disable compression for development
  maxRetentionTime: 300000        // 5 minutes retention
});
```

### Frontend Configuration

```typescript
// Configure advanced SSE connection
const sseOptions = {
  autoReconnect: true,
  maxRetries: 3,
  enableBackfill: true,
  batchSize: 15,
  maxMemoryMB: 20
};
```

## 📊 Monitoring and Alerting

### Key Metrics to Monitor

1. **Memory Usage**: Track total memory usage across all instances
2. **Message Rate**: Monitor messages per second per instance
3. **Connection Health**: Track healthy vs failed connections
4. **Recovery Frequency**: Monitor how often recovery is triggered
5. **Latency**: Track average message processing latency

### Alert Thresholds

```javascript
const alertThresholds = {
  memoryUsage: 80, // MB
  messageRate: 50, // messages/second
  recoveryCount: 5, // per hour
  averageLatency: 500, // milliseconds
  failedConnections: 10 // percentage
};
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check buffer sizes: `bufferManager.getBufferStatus(instanceId)`
   - Reduce retention time or buffer size
   - Enable compression if needed

2. **Connection Failures**
   - Check network connectivity
   - Review error recovery logs
   - Verify SSE endpoint responses

3. **Message Loss**
   - Enable backfill
   - Check sequence number gaps
   - Review buffer overflow logs

4. **UI Performance Issues**
   - Reduce batch size
   - Enable instance visibility optimization
   - Check UI update frequency

### Debug Commands

```bash
# Check SSE performance
curl http://localhost:3000/api/performance/sse

# Check specific instance
curl http://localhost:3000/api/performance/sse/claude-2426

# Monitor real-time connections
curl http://localhost:3000/api/status/stream
```

## ✅ Success Criteria

Implementation is successful when:

1. **No Message Accumulation**: Memory usage stays stable under load
2. **Reliable Connections**: Auto-recovery works correctly
3. **Good Performance**: UI remains responsive with high message rates
4. **Scalable**: Supports multiple concurrent instances
5. **Maintainable**: Clear monitoring and debugging capabilities

This architecture eliminates the message accumulation storm while providing robust, scalable Claude instance streaming with intelligent buffering, error recovery, and performance optimization.