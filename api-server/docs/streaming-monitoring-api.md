# Streaming Loop Protection Monitoring API

## Overview

This document describes the monitoring API endpoints for the Streaming Loop Protection System, which prevents infinite streaming loops in worker queries.

## Base URL

```
/api/streaming-monitoring
```

## Endpoints

### 1. GET /workers

Returns active workers and their health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeWorkers": [
      {
        "workerId": "worker-123",
        "ticketId": "ticket-456",
        "status": "active",
        "runtime": 5000,
        "chunkCount": 10,
        "responseSize": 1024
      }
    ],
    "totalActive": 1,
    "unhealthy": 0,
    "avgRuntime": 5000,
    "unhealthyDetails": []
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### 2. GET /circuit-breaker

Returns circuit breaker state and failure history.

**Response:**
```json
{
  "success": true,
  "data": {
    "state": "CLOSED",
    "failures": [],
    "recentFailures": 0,
    "threshold": 3,
    "nextResetTime": null,
    "isHealthy": true
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

**States:**
- `CLOSED`: Normal operation, requests allowed
- `OPEN`: Circuit breaker triggered, blocking requests
- `HALF_OPEN`: Testing recovery, limited requests allowed

### 3. GET /streaming-stats

Returns real-time streaming statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQueries": 100,
    "activeStreams": 2,
    "autoKills": 1,
    "avgChunksPerQuery": 15.5,
    "avgResponseTime": 3000,
    "loopDetections": 1,
    "lastCheck": 1698710400000
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### 4. GET /cost-estimate

Returns current cost tracking and estimates.

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedCost": 0.50,
    "tokensUsed": 100000,
    "inputTokens": 50000,
    "outputTokens": 50000,
    "queriesProcessed": 100,
    "costPerQuery": 0.005
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### 5. POST /kill-worker/:workerId

Manual kill switch for a specific worker.

**Parameters:**
- `workerId` (path) - Worker ID to kill

**Request Body:**
```json
{
  "reason": "Manual intervention required"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "workerId": "worker-123",
    "killed": true,
    "reason": "Manual intervention required"
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Worker worker-123 not found",
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### 6. GET /health

Overall system health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "components": {
      "emergencyMonitor": {
        "running": true,
        "interval": 15000,
        "checksPerformed": 100,
        "workersKilled": 1,
        "lastCheck": 1698710400000
      },
      "circuitBreaker": {
        "state": "CLOSED",
        "recentFailures": 0,
        "threshold": 3,
        "isHealthy": true
      },
      "healthMonitor": {
        "totalActive": 2,
        "unhealthy": 0,
        "avgRuntime": 3000
      }
    },
    "uptime": 86400,
    "timestamp": "2025-10-31T00:00:00.000Z"
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

**Status Values:**
- `healthy`: All systems operational
- `degraded`: Some workers unhealthy but system functional
- `critical`: Circuit breaker open or major issues

### 7. POST /circuit-breaker/reset

Manually reset the circuit breaker.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Circuit breaker reset successfully",
    "state": {
      "state": "CLOSED",
      "failureCount": 0,
      "recentFailures": 0,
      "isHealthy": true
    }
  },
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200`: Success
- `404`: Resource not found
- `500`: Internal server error

## Integration

### Server Integration

The routes are mounted in `/api-server/server.js`:

```javascript
import streamingMonitoringRouter from './routes/streaming-monitoring.js';

app.use('/api/streaming-monitoring', streamingMonitoringRouter);
```

### Orchestrator Integration

The Emergency Monitor is integrated into the AVI Orchestrator in `/api-server/avi/orchestrator.js`:

```javascript
import { getEmergencyMonitor } from '../services/emergency-monitor.js';

// In constructor
this.emergencyMonitor = getEmergencyMonitor();

// In start method
this.emergencyMonitor.start(async (worker) => {
  await this.handleWorkerKill(worker);
});

// In stop method
this.emergencyMonitor.stop();
```

## Service Components

### EmergencyMonitor
- **Location**: `/api-server/services/emergency-monitor.js`
- **Purpose**: Background monitor that checks for unhealthy workers every 15 seconds
- **Features**: Auto-kill, statistics tracking, cost estimation

### WorkerHealthMonitor
- **Location**: `/api-server/services/worker-health-monitor.js`
- **Purpose**: Tracks worker runtime, heartbeats, and health metrics
- **Features**: Singleton pattern, configurable thresholds

### CircuitBreaker
- **Location**: `/api-server/services/circuit-breaker.js`
- **Purpose**: Prevents cascading failures by blocking requests after threshold
- **Features**: Three states (CLOSED/OPEN/HALF_OPEN), auto-reset

## Testing

Integration tests are located at:
```
/api-server/tests/integration/streaming-monitoring-api.test.js
```

Run tests:
```bash
cd /workspaces/agent-feed/api-server
npm test -- tests/integration/streaming-monitoring-api.test.js
```

All 16 tests passing:
- Worker health status endpoints
- Circuit breaker state endpoints
- Streaming statistics endpoints
- Cost estimation endpoints
- Worker kill switch functionality
- Health check endpoints
- Error handling

## Configuration

Configuration is loaded from `/api-server/config/safety-limits.json`:

```json
{
  "workerHealth": {
    "maxRuntime": 600000,
    "heartbeatTimeout": 30000,
    "maxChunks": 200
  },
  "recovery": {
    "circuitBreakerThreshold": 3,
    "circuitBreakerWindow": 60000,
    "circuitBreakerResetTimeout": 300000
  }
}
```

## Usage Examples

### Monitor Active Workers

```bash
curl http://localhost:3001/api/streaming-monitoring/workers
```

### Check System Health

```bash
curl http://localhost:3001/api/streaming-monitoring/health
```

### Kill a Worker

```bash
curl -X POST http://localhost:3001/api/streaming-monitoring/kill-worker/worker-123 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Manual intervention"}'
```

### Reset Circuit Breaker

```bash
curl -X POST http://localhost:3001/api/streaming-monitoring/circuit-breaker/reset
```

## Monitoring Dashboard Integration

These endpoints can be integrated into a monitoring dashboard to:
- Display real-time worker status
- Show circuit breaker state
- Track streaming statistics
- Monitor costs
- Provide manual intervention tools

## Next Steps

1. Add authentication/authorization to sensitive endpoints (kill-worker, circuit-breaker reset)
2. Implement rate limiting on monitoring endpoints
3. Add WebSocket support for real-time updates
4. Create a web-based monitoring dashboard
5. Add alerting integration (email, Slack, PagerDuty)
6. Implement historical data storage and trending
7. Add more detailed cost breakdown by worker/ticket
