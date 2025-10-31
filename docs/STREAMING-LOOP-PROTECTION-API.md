# Streaming Loop Protection API Documentation

## Overview

This document describes the API endpoints for the Streaming Loop Protection System, including monitoring, worker management, and circuit breaker controls.

## Base URL

```
Production: https://api.agent-feed.com
Development: http://localhost:3001
```

## Authentication

All monitoring and control endpoints require authentication:

```http
Authorization: Bearer {token}
```

Admin endpoints require `admin` role.

## Endpoints

### 1. Worker Monitoring

#### GET /api/workers/status

Get current status of all workers.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "activeWorkers": 5,
    "totalWorkers": 10,
    "workers": [
      {
        "workerId": "worker-123",
        "status": "processing",
        "startTime": "2025-10-31T10:30:00Z",
        "elapsedTime": 15000,
        "agentId": "avi",
        "ticketId": "ticket-456",
        "postId": "post-789"
      }
    ]
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/workers/status
```

---

#### GET /api/workers/:workerId

Get detailed information about a specific worker.

**Authentication**: Required

**Parameters**:
- `workerId` (string, required): Worker identifier

**Response**:
```json
{
  "success": true,
  "data": {
    "workerId": "worker-123",
    "status": "processing",
    "startTime": "2025-10-31T10:30:00Z",
    "elapsedTime": 15000,
    "agentId": "avi",
    "ticketId": "ticket-456",
    "postId": "post-789",
    "metrics": {
      "cpuUsage": 45.2,
      "memoryUsage": 256,
      "tokensProcessed": 1500
    }
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/workers/worker-123
```

---

#### POST /api/workers/:workerId/kill

Manually terminate a worker process.

**Authentication**: Required (Admin)

**Parameters**:
- `workerId` (string, required): Worker identifier

**Request Body**:
```json
{
  "reason": "User requested termination",
  "force": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Worker worker-123 terminated successfully",
  "data": {
    "workerId": "worker-123",
    "terminatedAt": "2025-10-31T10:35:00Z",
    "elapsedTime": 15000
  }
}
```

**Error Response** (Worker not found):
```json
{
  "success": false,
  "error": "Worker not found",
  "code": "WORKER_NOT_FOUND"
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Taking too long","force":false}' \
  http://localhost:3001/api/workers/worker-123/kill
```

---

### 2. Timeout Protection

#### GET /api/protection/timeouts

Get timeout statistics and recent timeout events.

**Authentication**: Required

**Query Parameters**:
- `limit` (number, optional): Number of events to return (default: 50)
- `since` (ISO 8601, optional): Return events since this timestamp

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTimeouts": 142,
      "last24Hours": 12,
      "averageTimeoutTime": 30500
    },
    "recentEvents": [
      {
        "eventId": "timeout-001",
        "workerId": "worker-123",
        "agentId": "avi",
        "timestamp": "2025-10-31T10:30:00Z",
        "elapsedTime": 30000,
        "query": "Complex analysis query...",
        "autoStopped": true
      }
    ]
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/protection/timeouts?limit=10"
```

---

#### GET /api/protection/config

Get current protection configuration.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "data": {
    "requestTimeout": 30000,
    "workerTimeout": 35000,
    "circuitBreaker": {
      "threshold": 3,
      "window": 300000,
      "recovery": 60000
    },
    "monitoring": {
      "enabled": true,
      "interval": 5000
    }
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/protection/config
```

---

#### PUT /api/protection/config

Update protection configuration.

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "requestTimeout": 45000,
  "circuitBreaker": {
    "threshold": 5
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "requestTimeout": 45000,
    "circuitBreaker": {
      "threshold": 5,
      "window": 300000,
      "recovery": 60000
    }
  }
}
```

**Example**:
```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requestTimeout":45000}' \
  http://localhost:3001/api/protection/config
```

---

### 3. Circuit Breaker

#### GET /api/protection/circuit-breaker

Get current circuit breaker state.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "state": "closed",
    "failureCount": 0,
    "lastFailure": null,
    "nextRetry": null,
    "statistics": {
      "totalTrips": 5,
      "lastTrip": "2025-10-31T09:00:00Z",
      "averageRecoveryTime": 75000
    }
  }
}
```

**States**:
- `closed`: Normal operation
- `open`: Circuit breaker tripped, requests blocked
- `half-open`: Testing recovery

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/protection/circuit-breaker
```

---

#### POST /api/protection/circuit-breaker/reset

Manually reset the circuit breaker (admin only).

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "reason": "Manual reset after investigating root cause"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Circuit breaker reset successfully",
  "data": {
    "state": "closed",
    "resetAt": "2025-10-31T10:40:00Z"
  }
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Manual reset"}' \
  http://localhost:3001/api/protection/circuit-breaker/reset
```

---

### 4. Metrics & Statistics

#### GET /api/protection/metrics

Get comprehensive protection system metrics.

**Authentication**: Required

**Query Parameters**:
- `period` (string, optional): Time period - `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `granularity` (string, optional): Data granularity - `minute`, `hour`, `day` (default: `hour`)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "summary": {
      "totalRequests": 1543,
      "timeouts": 12,
      "manualKills": 3,
      "circuitBreakerTrips": 1,
      "averageProcessingTime": 8500,
      "successRate": 99.2
    },
    "timeseries": [
      {
        "timestamp": "2025-10-31T10:00:00Z",
        "requests": 65,
        "timeouts": 1,
        "averageTime": 8200
      }
    ],
    "topTimeoutQueries": [
      {
        "query": "Analyze complex dataset...",
        "count": 5,
        "averageTime": 30100
      }
    ]
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/protection/metrics?period=7d&granularity=day"
```

---

#### GET /api/protection/health

Get system health status.

**Authentication**: Not required (public endpoint)

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-31T10:45:00Z",
    "components": {
      "workers": {
        "status": "healthy",
        "active": 5,
        "capacity": 10
      },
      "circuitBreaker": {
        "status": "healthy",
        "state": "closed"
      },
      "monitoring": {
        "status": "healthy",
        "lastUpdate": "2025-10-31T10:45:00Z"
      }
    }
  }
}
```

**Statuses**:
- `healthy`: All systems operational
- `degraded`: Some issues, but functioning
- `unhealthy`: Critical issues, service impacted

**Example**:
```bash
curl http://localhost:3001/api/protection/health
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `WORKER_NOT_FOUND` | Specified worker does not exist |
| `WORKER_ALREADY_TERMINATED` | Worker has already been terminated |
| `UNAUTHORIZED` | Missing or invalid authentication token |
| `FORBIDDEN` | Insufficient permissions |
| `CIRCUIT_BREAKER_OPEN` | Circuit breaker is open, requests blocked |
| `INVALID_CONFIG` | Invalid configuration parameters |
| `TIMEOUT` | Request exceeded timeout limit |
| `SYSTEM_ERROR` | Internal system error |

## Rate Limiting

API endpoints are rate limited:
- Monitoring endpoints: 60 requests/minute
- Control endpoints: 30 requests/minute
- Metrics endpoints: 20 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1698753600
```

## WebSocket API

For real-time updates, connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/protection');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'worker:status':
      // Worker status update
      break;
    case 'timeout:triggered':
      // Timeout event
      break;
    case 'circuit-breaker:state-change':
      // Circuit breaker state changed
      break;
  }
};
```

**Event Types**:
- `worker:status`: Worker status changed
- `worker:created`: New worker spawned
- `worker:terminated`: Worker terminated
- `timeout:triggered`: Timeout protection activated
- `circuit-breaker:state-change`: Circuit breaker state changed
- `metrics:update`: Real-time metrics update

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ProtectionClient } from '@agent-feed/protection-client';

const client = new ProtectionClient({
  baseURL: 'http://localhost:3001',
  token: process.env.API_TOKEN
});

// Get worker status
const status = await client.workers.getStatus();

// Kill a worker
await client.workers.kill('worker-123', {
  reason: 'Taking too long'
});

// Get metrics
const metrics = await client.metrics.get({
  period: '24h',
  granularity: 'hour'
});

// Subscribe to real-time updates
client.on('timeout:triggered', (event) => {
  console.log('Timeout:', event);
});
```

### Python

```python
from agent_feed import ProtectionClient

client = ProtectionClient(
    base_url='http://localhost:3001',
    token=os.getenv('API_TOKEN')
)

# Get worker status
status = client.workers.get_status()

# Kill a worker
client.workers.kill('worker-123', reason='Taking too long')

# Get metrics
metrics = client.metrics.get(period='24h', granularity='hour')
```

## Testing

Use the provided test utilities:

```bash
# Test timeout protection
curl http://localhost:3001/api/test/trigger-timeout

# Test circuit breaker
curl http://localhost:3001/api/test/trigger-circuit-breaker

# Simulate worker load
curl -X POST http://localhost:3001/api/test/simulate-load \
  -d '{"workers":10,"duration":60000}'
```

## Support

For API issues or questions:
- API Documentation: https://docs.agent-feed.com/api
- Support: api-support@agent-feed.com
- GitHub: https://github.com/your-org/agent-feed/issues
