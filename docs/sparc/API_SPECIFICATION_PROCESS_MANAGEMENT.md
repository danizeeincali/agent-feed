# API Specification for Real Claude Process Management

## 1. API OVERVIEW

### 1.1 Base Configuration
```yaml
Base URL: http://localhost:3000/api
API Version: v2 (Real Process Management)
Content-Type: application/json
Authentication: None (Local Development)
Rate Limiting: 100 requests/minute per IP
```

### 1.2 Response Standards
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}

interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

## 2. PROCESS MANAGEMENT ENDPOINTS

### 2.1 Create Claude Instance
```yaml
POST /api/v2/claude/instances

Description: Spawn a new Claude process with specified configuration

Request Body:
{
  "command": ["claude", "--dangerously-skip-permissions"],
  "workingDirectory": "/workspaces/agent-feed/prod",
  "environment": {
    "CLAUDE_API_KEY": "optional-key",
    "CLAUDE_WORKSPACE": "/workspaces/agent-feed"
  },
  "resourceLimits": {
    "memory": 1073741824,        // 1GB in bytes
    "cpu": 80,                   // 80% CPU limit
    "fileDescriptors": 1000,     // Max open files
    "timeout": 300000            // 5 minutes startup timeout
  },
  "metadata": {
    "type": "skip-permissions",
    "label": "Claude Skip Permissions",
    "tags": ["user-created", "development"],
    "description": "Claude instance with permissions bypassed"
  }
}

Response (201 Created):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "pid": 12345,
    "status": "spawning",
    "command": ["claude", "--dangerously-skip-permissions"],
    "workingDirectory": "/workspaces/agent-feed/prod",
    "startTime": "2024-08-27T10:30:00.000Z",
    "resourceAllocation": {
      "memory": 1073741824,
      "cpu": 80,
      "fileDescriptors": 1000
    },
    "metadata": {
      "type": "skip-permissions",
      "label": "Claude Skip Permissions",
      "tags": ["user-created", "development"]
    }
  },
  "metadata": {
    "timestamp": "2024-08-27T10:30:00.000Z",
    "requestId": "req_abc123",
    "processingTime": 1250
  }
}

Error Responses:
400 Bad Request - Invalid command or configuration
409 Conflict - Resource limits exceeded
500 Internal Server Error - Process spawn failed
```

### 2.2 List Claude Instances
```yaml
GET /api/v2/claude/instances

Query Parameters:
- status: filter by status (spawning|running|terminated|error)
- type: filter by instance type
- limit: number of results (default: 50, max: 200)
- offset: pagination offset (default: 0)
- sortBy: sort field (startTime|pid|status)
- sortOrder: asc|desc (default: desc)

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "instanceId": "claude-real-abc123",
      "pid": 12345,
      "status": "running",
      "command": ["claude", "--dangerously-skip-permissions"],
      "workingDirectory": "/workspaces/agent-feed/prod",
      "startTime": "2024-08-27T10:30:00.000Z",
      "lastActivity": "2024-08-27T10:35:00.000Z",
      "uptime": 300000,
      "resourceUsage": {
        "memory": 524288000,     // Current memory usage
        "cpu": 15.5,             // Current CPU percentage
        "fileDescriptors": 12    // Currently open files
      },
      "metadata": {
        "type": "skip-permissions",
        "label": "Claude Skip Permissions",
        "tags": ["user-created", "development"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "hasNext": false,
    "hasPrevious": false
  },
  "metadata": {
    "timestamp": "2024-08-27T10:35:00.000Z",
    "requestId": "req_def456",
    "processingTime": 45
  }
}
```

### 2.3 Get Claude Instance Details
```yaml
GET /api/v2/claude/instances/{instanceId}

Path Parameters:
- instanceId: Unique instance identifier

Response (200 OK):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "pid": 12345,
    "status": "running",
    "command": ["claude", "--dangerously-skip-permissions"],
    "workingDirectory": "/workspaces/agent-feed/prod",
    "environment": {
      "CLAUDE_WORKSPACE": "/workspaces/agent-feed"
    },
    "startTime": "2024-08-27T10:30:00.000Z",
    "lastActivity": "2024-08-27T10:35:00.000Z",
    "uptime": 300000,
    "resourceUsage": {
      "memory": {
        "rss": 524288000,
        "heapTotal": 123456789,
        "heapUsed": 98765432,
        "external": 12345678
      },
      "cpu": {
        "user": 1500,
        "system": 200,
        "percentage": 15.5
      },
      "io": {
        "readBytes": 1048576,
        "writeBytes": 2097152,
        "readOps": 150,
        "writeOps": 75
      },
      "fileDescriptors": {
        "open": 12,
        "limit": 1000
      }
    },
    "healthStatus": {
      "healthy": true,
      "lastCheck": "2024-08-27T10:34:30.000Z",
      "issues": []
    },
    "metadata": {
      "type": "skip-permissions",
      "label": "Claude Skip Permissions", 
      "tags": ["user-created", "development"],
      "creator": "web-ui"
    }
  },
  "metadata": {
    "timestamp": "2024-08-27T10:35:00.000Z",
    "requestId": "req_ghi789",
    "processingTime": 25
  }
}

Error Responses:
404 Not Found - Instance does not exist
```

### 2.4 Terminate Claude Instance
```yaml
DELETE /api/v2/claude/instances/{instanceId}

Path Parameters:
- instanceId: Unique instance identifier

Query Parameters:
- force: boolean (default: false) - Force kill if graceful fails
- timeout: number (default: 5000) - Graceful shutdown timeout in ms

Request Body (Optional):
{
  "reason": "user_requested",
  "graceful": true,
  "cleanupResources": true
}

Response (200 OK):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "terminatedAt": "2024-08-27T10:40:00.000Z",
    "exitCode": 0,
    "signal": null,
    "reason": "user_requested",
    "uptime": 600000,
    "finalResourceUsage": {
      "peakMemory": 600000000,
      "totalCPUTime": 5500,
      "totalIOBytes": 5242880
    },
    "cleanupResult": {
      "processKilled": true,
      "streamsClosd": true,
      "sseDisconnected": true,
      "memoryReleased": true,
      "registryRemoved": true
    }
  },
  "metadata": {
    "timestamp": "2024-08-27T10:40:00.000Z",
    "requestId": "req_jkl012",
    "processingTime": 2150
  }
}

Error Responses:
404 Not Found - Instance does not exist
409 Conflict - Instance already terminated
500 Internal Server Error - Termination failed
```

## 3. TERMINAL I/O ENDPOINTS

### 3.1 Send Terminal Input
```yaml
POST /api/v2/claude/instances/{instanceId}/terminal/input

Path Parameters:
- instanceId: Target instance identifier

Request Body:
{
  "input": "help\n",
  "encoding": "utf8",         // Optional, default: utf8
  "echo": true,               // Optional, default: true
  "metadata": {
    "source": "web-ui",
    "sessionId": "session_123"
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "input": "help\n",
    "bytesWritten": 5,
    "sequence": 1,
    "timestamp": "2024-08-27T10:35:15.000Z"
  },
  "metadata": {
    "timestamp": "2024-08-27T10:35:15.000Z", 
    "requestId": "req_mno345",
    "processingTime": 15
  }
}

Error Responses:
400 Bad Request - Invalid input or encoding
404 Not Found - Instance not found
409 Conflict - Instance not in running state
422 Unprocessable Entity - Input validation failed
```

### 3.2 Terminal Output Stream (SSE)
```yaml
GET /api/v2/claude/instances/{instanceId}/terminal/stream

Path Parameters:
- instanceId: Target instance identifier

Query Parameters:
- bufferSize: Output buffer size in bytes (default: 8192)
- includeMetadata: boolean (default: false)

Headers:
Accept: text/event-stream
Cache-Control: no-cache

Response (200 OK - Server-Sent Events):
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

Event Types:
- terminal:connected
- terminal:output  
- terminal:input_echo
- terminal:error
- terminal:disconnected
- process:status_change

Example Events:
data: {"type":"terminal:connected","instanceId":"claude-real-abc123","data":"Connected to Claude instance","timestamp":"2024-08-27T10:35:00.000Z","metadata":{"sequence":0}}

data: {"type":"terminal:output","instanceId":"claude-real-abc123","data":"Claude Code session started\n$ ","stream":"stdout","timestamp":"2024-08-27T10:35:01.000Z","metadata":{"bytes":32,"sequence":1}}

data: {"type":"terminal:input_echo","instanceId":"claude-real-abc123","data":"help","timestamp":"2024-08-27T10:35:15.000Z","metadata":{"sequence":2}}

data: {"type":"terminal:output","instanceId":"claude-real-abc123","data":"Available commands:\n  help - Show this help\n  exit - Exit Claude\n$ ","stream":"stdout","timestamp":"2024-08-27T10:35:15.250Z","metadata":{"bytes":67,"sequence":3}}

Error Events:
data: {"type":"terminal:error","instanceId":"claude-real-abc123","error":"Process stdin closed","timestamp":"2024-08-27T10:40:00.000Z","metadata":{"sequence":10}}

data: {"type":"terminal:disconnected","instanceId":"claude-real-abc123","data":"Process terminated","timestamp":"2024-08-27T10:40:00.000Z","metadata":{"sequence":11}}
```

### 3.3 Terminal Output History
```yaml
GET /api/v2/claude/instances/{instanceId}/terminal/history

Path Parameters:
- instanceId: Target instance identifier

Query Parameters:
- since: ISO timestamp - Get output since this time
- limit: number (default: 1000, max: 10000)
- offset: pagination offset
- format: text|json (default: json)

Response (200 OK):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "entries": [
      {
        "timestamp": "2024-08-27T10:35:00.000Z",
        "type": "output",
        "stream": "stdout", 
        "data": "Claude Code session started\n$ ",
        "bytes": 32,
        "sequence": 1
      },
      {
        "timestamp": "2024-08-27T10:35:15.000Z",
        "type": "input_echo",
        "data": "help",
        "bytes": 4,
        "sequence": 2
      },
      {
        "timestamp": "2024-08-27T10:35:15.250Z",
        "type": "output",
        "stream": "stdout",
        "data": "Available commands:\n  help - Show this help\n  exit - Exit Claude\n$ ",
        "bytes": 67,
        "sequence": 3
      }
    ],
    "totalBytes": 103,
    "totalEntries": 3
  },
  "pagination": {
    "limit": 1000,
    "offset": 0,
    "hasMore": false
  },
  "metadata": {
    "timestamp": "2024-08-27T10:36:00.000Z",
    "requestId": "req_pqr678",
    "processingTime": 35
  }
}
```

## 4. PROCESS MONITORING ENDPOINTS

### 4.1 System Resource Status
```yaml
GET /api/v2/system/resources

Response (200 OK):
{
  "success": true,
  "data": {
    "memory": {
      "total": 8589934592,       // 8GB
      "used": 5368709120,        // 5GB  
      "free": 3221225472,        // 3GB
      "utilization": 0.625       // 62.5%
    },
    "cpu": {
      "cores": 8,
      "usage": 45.2,             // 45.2% average
      "loadAverage": [1.5, 1.3, 1.1]
    },
    "processes": {
      "total": 3,
      "running": 2,
      "spawning": 0,
      "terminated": 0,
      "error": 1
    },
    "limits": {
      "maxProcesses": 10,
      "maxMemoryPerProcess": 1073741824,
      "maxTotalMemory": 4294967296
    }
  },
  "metadata": {
    "timestamp": "2024-08-27T10:36:00.000Z",
    "requestId": "req_stu901", 
    "processingTime": 20
  }
}
```

### 4.2 Instance Health Check
```yaml
GET /api/v2/claude/instances/{instanceId}/health

Path Parameters:
- instanceId: Target instance identifier

Response (200 OK):
{
  "success": true,
  "data": {
    "instanceId": "claude-real-abc123",
    "healthy": true,
    "status": "running",
    "checks": {
      "processExists": {
        "status": "pass",
        "message": "Process found with PID 12345"
      },
      "memoryUsage": {
        "status": "pass", 
        "current": 524288000,
        "threshold": 1073741824,
        "message": "Memory usage within limits"
      },
      "cpuUsage": {
        "status": "warn",
        "current": 75.2,
        "threshold": 80.0,
        "message": "High CPU usage detected"
      },
      "streamConnectivity": {
        "status": "pass",
        "message": "All I/O streams operational"
      },
      "lastActivity": {
        "status": "pass",
        "lastActivity": "2024-08-27T10:35:45.000Z",
        "threshold": 300000,
        "message": "Recent activity detected"
      }
    },
    "metrics": {
      "uptime": 360000,
      "totalInputs": 15,
      "totalOutputBytes": 15728,
      "responseTime": 125
    },
    "recommendations": [
      "Monitor CPU usage - approaching threshold"
    ]
  },
  "metadata": {
    "timestamp": "2024-08-27T10:36:00.000Z",
    "requestId": "req_vwx234",
    "processingTime": 180
  }
}

Error Responses:
404 Not Found - Instance not found
503 Service Unavailable - Health check failed
```

## 5. ERROR HANDLING & STATUS CODES

### 5.1 HTTP Status Codes
```yaml
Success Codes:
200 OK - Request successful
201 Created - Resource created successfully
202 Accepted - Request accepted, processing async
204 No Content - Request successful, no response body

Client Error Codes:
400 Bad Request - Invalid request format/data
401 Unauthorized - Authentication required
403 Forbidden - Access denied
404 Not Found - Resource not found
409 Conflict - Resource state conflict
422 Unprocessable Entity - Validation failed
429 Too Many Requests - Rate limit exceeded

Server Error Codes:
500 Internal Server Error - Unexpected server error
502 Bad Gateway - Upstream service error
503 Service Unavailable - Service temporarily down
504 Gateway Timeout - Request timeout
```

### 5.2 Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: any;          // Additional error context
    field?: string;         // Field causing validation error
    documentation?: string; // Link to relevant docs
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}

// Example error responses
{
  "success": false,
  "error": {
    "code": "PROCESS_SPAWN_FAILED",
    "message": "Failed to spawn Claude process",
    "details": {
      "command": ["claude", "--invalid-flag"],
      "exitCode": 127,
      "stderr": "claude: unrecognized option '--invalid-flag'"
    },
    "documentation": "https://docs.example.com/errors/spawn-failed"
  },
  "metadata": {
    "timestamp": "2024-08-27T10:30:00.000Z",
    "requestId": "req_error123",
    "processingTime": 500
  }
}
```

## 6. RATE LIMITING & QUOTAS

### 6.1 Rate Limits
```yaml
Endpoints Rate Limits (per IP per minute):
- GET /api/v2/claude/instances: 60 requests
- POST /api/v2/claude/instances: 5 requests  
- DELETE /api/v2/claude/instances/*: 10 requests
- POST /api/v2/claude/instances/*/terminal/input: 300 requests
- GET /api/v2/claude/instances/*/terminal/stream: 10 connections

Resource Quotas (per system):
- Max concurrent processes: 10
- Max memory per process: 1GB
- Max total system memory: 4GB
- Max file descriptors per process: 1000
```

### 6.2 Rate Limit Headers
```yaml
Response Headers:
X-RateLimit-Limit: 60          // Requests per window
X-RateLimit-Remaining: 45       // Remaining requests
X-RateLimit-Reset: 1693132200   // Reset timestamp
X-RateLimit-Window: 60          // Window size in seconds

Rate Limit Exceeded Response (429):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 15 seconds.",
    "details": {
      "limit": 60,
      "window": 60,
      "retryAfter": 15
    }
  }
}
```

This comprehensive API specification provides a complete interface for real Claude process management with proper error handling, monitoring, and resource management capabilities.