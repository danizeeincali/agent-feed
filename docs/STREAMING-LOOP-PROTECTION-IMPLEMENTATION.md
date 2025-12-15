# Streaming Loop Protection - Implementation Guide

## Technical Architecture

This document provides detailed implementation information for developers working with the Streaming Loop Protection System.

## System Components

### 1. Request Timeout Manager

**Location**: `/api-server/middleware/timeout-protection.js`

**Responsibilities**:
- Monitor request duration
- Terminate long-running processes
- Send timeout notifications
- Clean up resources

**Implementation**:

```javascript
class TimeoutProtection {
  constructor(config = {}) {
    this.timeout = config.timeout || 30000; // 30 seconds
    this.cleanup = config.cleanup || (() => {});
    this.activeRequests = new Map();
  }

  async wrapRequest(requestId, handler) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.handleTimeout(requestId);
    }, this.timeout);

    this.activeRequests.set(requestId, {
      controller,
      timeoutId,
      startTime: Date.now()
    });

    try {
      const result = await handler(controller.signal);
      this.clearRequest(requestId);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError('Request exceeded timeout limit');
      }
      throw error;
    } finally {
      this.clearRequest(requestId);
    }
  }

  handleTimeout(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    // Emit timeout event
    this.emit('timeout', {
      requestId,
      elapsedTime: Date.now() - request.startTime
    });

    // Clean up resources
    this.cleanup(requestId);
  }

  clearRequest(requestId) {
    const request = this.activeRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      this.activeRequests.delete(requestId);
    }
  }
}
```

### 2. Worker Monitoring System

**Location**: `/api-server/services/worker-monitor.js`

**Responsibilities**:
- Track active workers
- Collect performance metrics
- Provide kill functionality
- Emit real-time updates

**Implementation**:

```javascript
class WorkerMonitor {
  constructor(config = {}) {
    this.workers = new Map();
    this.metrics = new MetricsCollector();
    this.websocket = config.websocket;
  }

  registerWorker(workerId, workerData) {
    this.workers.set(workerId, {
      ...workerData,
      status: 'active',
      startTime: Date.now(),
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        tokensProcessed: 0
      }
    });

    this.emitUpdate('worker:created', { workerId });
    this.startMonitoring(workerId);
  }

  async killWorker(workerId, options = {}) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // Send termination signal
    if (worker.process) {
      worker.process.kill(options.force ? 'SIGKILL' : 'SIGTERM');
    }

    // Update status
    worker.status = 'terminated';
    worker.endTime = Date.now();

    this.emitUpdate('worker:terminated', {
      workerId,
      elapsedTime: worker.endTime - worker.startTime,
      reason: options.reason
    });

    // Clean up after short delay
    setTimeout(() => {
      this.workers.delete(workerId);
    }, 5000);
  }

  startMonitoring(workerId) {
    const interval = setInterval(() => {
      const worker = this.workers.get(workerId);
      if (!worker || worker.status !== 'active') {
        clearInterval(interval);
        return;
      }

      // Collect metrics
      const metrics = this.collectWorkerMetrics(workerId);
      worker.metrics = metrics;

      // Emit update
      this.emitUpdate('worker:status', {
        workerId,
        metrics,
        elapsedTime: Date.now() - worker.startTime
      });
    }, 5000);
  }

  collectWorkerMetrics(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker || !worker.process) {
      return null;
    }

    // Collect process metrics
    return {
      cpuUsage: worker.process.cpuUsage(),
      memoryUsage: worker.process.memoryUsage().heapUsed / 1024 / 1024,
      tokensProcessed: worker.tokensProcessed || 0
    };
  }

  emitUpdate(event, data) {
    if (this.websocket) {
      this.websocket.emit(event, data);
    }
  }

  getStatus() {
    const workers = Array.from(this.workers.values());
    return {
      activeWorkers: workers.filter(w => w.status === 'active').length,
      totalWorkers: workers.length,
      workers: workers.map(w => ({
        workerId: w.workerId,
        status: w.status,
        elapsedTime: Date.now() - w.startTime,
        metrics: w.metrics
      }))
    };
  }
}
```

### 3. Circuit Breaker

**Location**: `/api-server/services/circuit-breaker.js`

**Responsibilities**:
- Track failure rates
- Trip on threshold
- Manage recovery
- Block requests when open

**Implementation**:

```javascript
class CircuitBreaker {
  constructor(config = {}) {
    this.threshold = config.threshold || 3;
    this.window = config.window || 300000; // 5 minutes
    this.recovery = config.recovery || 60000; // 1 minute

    this.state = 'closed'; // closed, open, half-open
    this.failures = [];
    this.lastTrip = null;
    this.nextRetry = null;
  }

  async execute(operation) {
    // Check if circuit breaker is open
    if (this.state === 'open') {
      if (Date.now() < this.nextRetry) {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
      // Move to half-open state
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'half-open') {
      // Recovery successful
      this.reset();
    }
  }

  onFailure(error) {
    // Record failure
    this.failures.push({
      timestamp: Date.now(),
      error: error.message
    });

    // Clean up old failures outside window
    this.failures = this.failures.filter(
      f => Date.now() - f.timestamp < this.window
    );

    // Check if threshold exceeded
    if (this.failures.length >= this.threshold) {
      this.trip();
    }
  }

  trip() {
    this.state = 'open';
    this.lastTrip = Date.now();
    this.nextRetry = Date.now() + this.recovery;

    // Emit event
    this.emit('circuit-breaker:tripped', {
      failureCount: this.failures.length,
      nextRetry: this.nextRetry
    });
  }

  reset() {
    this.state = 'closed';
    this.failures = [];
    this.lastTrip = null;
    this.nextRetry = null;

    this.emit('circuit-breaker:reset');
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failures.length,
      lastTrip: this.lastTrip,
      nextRetry: this.nextRetry
    };
  }
}
```

## Component Interactions

### Request Flow with Protection

```
┌─────────────┐
│ Client      │
│ Submits     │
│ Query       │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ API Server                          │
│                                     │
│  1. Check Circuit Breaker           │
│     ├─ Open? → Reject               │
│     └─ Closed? → Continue           │
│                                     │
│  2. Wrap with Timeout Protection    │
│     ├─ Start timer (30s)            │
│     └─ Register request             │
│                                     │
│  3. Spawn Worker                    │
│     ├─ Register with monitor        │
│     ├─ Start metrics collection     │
│     └─ Execute operation            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Worker Process                      │
│                                     │
│  - Process query                    │
│  - Check abort signal               │
│  - Report progress                  │
│  - Complete or timeout              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Response Handler                    │
│                                     │
│  - If completed: Return result      │
│  - If timeout: Clean up & notify    │
│  - If error: Update circuit breaker │
│  - Update metrics                   │
└─────────────────────────────────────┘
```

### Worker Lifecycle

```
┌────────────┐
│  Created   │
└─────┬──────┘
      │
      ▼
┌────────────┐     Timeout
│Processing  ├────────────┐
└─────┬──────┘            │
      │                   │
      │ Complete          │ Manual Kill
      │                   │
      ▼                   ▼
┌────────────┐       ┌────────────┐
│ Completed  │       │ Terminated │
└────────────┘       └────────────┘
```

## Database Schema

### Worker Status Table

```sql
CREATE TABLE worker_status (
  worker_id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  ticket_id VARCHAR(255),
  post_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  elapsed_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_status (status),
  INDEX idx_agent_id (agent_id),
  INDEX idx_created_at (created_at)
);
```

### Timeout Events Table

```sql
CREATE TABLE timeout_events (
  event_id VARCHAR(255) PRIMARY KEY,
  worker_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255),
  query_text TEXT,
  elapsed_time INTEGER NOT NULL,
  auto_stopped BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_worker_id (worker_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (worker_id) REFERENCES worker_status(worker_id)
);
```

### Circuit Breaker State Table

```sql
CREATE TABLE circuit_breaker_state (
  id INTEGER PRIMARY KEY,
  state VARCHAR(20) NOT NULL,
  failure_count INTEGER DEFAULT 0,
  last_trip TIMESTAMP,
  next_retry TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables

```bash
# Timeout Protection
TIMEOUT_REQUEST_MS=30000
TIMEOUT_WORKER_MS=35000
TIMEOUT_CLEANUP_MS=5000

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=3
CIRCUIT_BREAKER_WINDOW_MS=300000
CIRCUIT_BREAKER_RECOVERY_MS=60000

# Worker Monitoring
WORKER_MONITOR_INTERVAL_MS=5000
WORKER_MONITOR_ENABLED=true

# Logging
PROTECTION_LOG_LEVEL=info
PROTECTION_LOG_FILE=./logs/protection.log
```

### Runtime Configuration

```javascript
// config/protection.js
module.exports = {
  timeout: {
    request: process.env.TIMEOUT_REQUEST_MS || 30000,
    worker: process.env.TIMEOUT_WORKER_MS || 35000,
    cleanup: process.env.TIMEOUT_CLEANUP_MS || 5000
  },

  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 3,
    window: parseInt(process.env.CIRCUIT_BREAKER_WINDOW_MS) || 300000,
    recovery: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_MS) || 60000
  },

  monitoring: {
    enabled: process.env.WORKER_MONITOR_ENABLED === 'true',
    interval: parseInt(process.env.WORKER_MONITOR_INTERVAL_MS) || 5000
  }
};
```

## Integration Points

### 1. Agent Worker Integration

```javascript
// api-server/worker/agent-worker.js
class AgentWorker {
  async execute() {
    const requestId = `worker-${this.workerId}`;

    // Wrap with timeout protection
    return await timeoutProtection.wrapRequest(requestId, async (signal) => {
      // Register with monitor
      workerMonitor.registerWorker(this.workerId, {
        agentId: this.agentId,
        ticketId: this.ticketId,
        process: process
      });

      // Wrap with circuit breaker
      return await circuitBreaker.execute(async () => {
        // Execute actual work with abort signal support
        return await this.processWithSignal(signal);
      });
    });
  }

  async processWithSignal(signal) {
    // Check signal periodically
    const checkAbort = () => {
      if (signal.aborted) {
        throw new AbortError('Operation aborted');
      }
    };

    // Your processing logic with periodic abort checks
    for (const step of this.steps) {
      checkAbort();
      await step.execute();
    }
  }
}
```

### 2. WebSocket Integration

```javascript
// api-server/services/websocket-service.js
class WebSocketService {
  setupProtectionListeners() {
    // Timeout events
    timeoutProtection.on('timeout', (data) => {
      this.io.to(`post:${data.postId}`).emit('timeout:triggered', data);
    });

    // Worker events
    workerMonitor.on('worker:status', (data) => {
      this.io.emit('worker:status', data);
    });

    // Circuit breaker events
    circuitBreaker.on('circuit-breaker:tripped', (data) => {
      this.io.emit('circuit-breaker:state-change', {
        state: 'open',
        ...data
      });
    });
  }
}
```

### 3. Frontend Integration

```typescript
// frontend/src/services/protection-monitor.ts
class ProtectionMonitor {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3001');
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('timeout:triggered', (data) => {
      this.handleTimeout(data);
    });

    this.socket.on('worker:status', (data) => {
      this.updateWorkerStatus(data);
    });

    this.socket.on('circuit-breaker:state-change', (data) => {
      this.updateCircuitBreakerState(data);
    });
  }

  handleTimeout(data: TimeoutEvent) {
    // Show user notification
    toast.warning(
      `Your request took longer than expected and was automatically stopped.`,
      { duration: 5000 }
    );

    // Update UI
    this.updateRequestStatus(data.requestId, 'timeout');
  }
}
```

## Performance Considerations

### Memory Management

```javascript
// Limit stored events
const MAX_TIMEOUT_EVENTS = 1000;
const MAX_WORKER_HISTORY = 500;

// Periodic cleanup
setInterval(() => {
  // Clean up old timeout events
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
  timeoutEvents = timeoutEvents.filter(e => e.timestamp > cutoff);

  // Clean up completed workers
  workerMonitor.cleanup({ olderThan: cutoff });
}, 60 * 60 * 1000); // Every hour
```

### Database Optimization

```sql
-- Archive old events
CREATE TABLE timeout_events_archive AS
SELECT * FROM timeout_events
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

DELETE FROM timeout_events
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Testing

See [STREAMING-LOOP-PROTECTION-TESTING.md](./STREAMING-LOOP-PROTECTION-TESTING.md) for comprehensive testing guide.

## Deployment

### Production Checklist

- [ ] Set appropriate timeout values for production load
- [ ] Configure circuit breaker thresholds
- [ ] Enable monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure database archival
- [ ] Test failover scenarios
- [ ] Document runbook procedures

### Monitoring Setup

```javascript
// Setup monitoring alerts
const alerts = {
  highTimeoutRate: {
    condition: 'timeout_rate > 5%',
    action: 'notify_team'
  },
  circuitBreakerTripped: {
    condition: 'circuit_breaker_state = open',
    action: 'page_oncall'
  },
  workerQueueBacklog: {
    condition: 'active_workers > 80% capacity',
    action: 'scale_workers'
  }
};
```

## Troubleshooting

Common issues and solutions are documented in the main [STREAMING-LOOP-PROTECTION.md](./STREAMING-LOOP-PROTECTION.md) guide.

## Contributing

When contributing to the protection system:

1. Add tests for new features
2. Update documentation
3. Consider backward compatibility
4. Test under load
5. Update metrics and monitoring

## References

- [Main Documentation](./STREAMING-LOOP-PROTECTION.md)
- [API Documentation](./STREAMING-LOOP-PROTECTION-API.md)
- [Testing Guide](./STREAMING-LOOP-PROTECTION-TESTING.md)
