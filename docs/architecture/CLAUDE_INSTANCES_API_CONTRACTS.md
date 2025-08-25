# Claude Instances API Contracts & Technical Specifications

## API Contracts

### 1. Instance Management API

#### POST /api/claude/instances
**Create New Claude Instance**

```typescript
// Request
interface CreateInstanceRequest {
  configuration: {
    command: string[];           // e.g., ["claude", "--chat"]
    workingDirectory: string;    // e.g., "/workspaces/project"
    environment?: Record<string, string>;
    resourceLimits?: {
      maxMemoryMB: number;
      maxCpuPercent: number;
      timeoutSeconds: number;
    };
  };
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

// Response
interface CreateInstanceResponse {
  success: boolean;
  instance: {
    id: string;
    pid: number;
    status: 'starting' | 'running';
    configuration: InstanceConfiguration;
    createdAt: string; // ISO 8601
    communicationEndpoints: {
      websocket: string; // ws://localhost:3002/claude/{instanceId}
      http: string;      // http://localhost:3002/api/claude/instances/{instanceId}
    };
  };
  error?: string;
}

// Example Request
POST /api/claude/instances
{
  "configuration": {
    "command": ["claude", "--chat"],
    "workingDirectory": "/workspaces/agent-feed/prod",
    "environment": {
      "CLAUDE_MODE": "interactive"
    },
    "resourceLimits": {
      "maxMemoryMB": 512,
      "maxCpuPercent": 50,
      "timeoutSeconds": 3600
    }
  },
  "metadata": {
    "name": "Main Chat Instance",
    "description": "Primary Claude instance for user interaction"
  }
}

// Example Response
{
  "success": true,
  "instance": {
    "id": "claude_inst_1634567890123",
    "pid": 12345,
    "status": "running",
    "configuration": { ... },
    "createdAt": "2023-10-18T10:30:00Z",
    "communicationEndpoints": {
      "websocket": "ws://localhost:3002/claude/claude_inst_1634567890123",
      "http": "http://localhost:3002/api/claude/instances/claude_inst_1634567890123"
    }
  }
}
```

#### GET /api/claude/instances
**List All Instances**

```typescript
// Query Parameters
interface ListInstancesQuery {
  status?: 'running' | 'stopped' | 'error' | 'starting';
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastActivity' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface ListInstancesResponse {
  success: boolean;
  instances: InstanceSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

interface InstanceSummary {
  id: string;
  pid?: number;
  status: InstanceStatus;
  name?: string;
  createdAt: string;
  lastActivity: string;
  statistics: {
    messagesExchanged: number;
    uptime: number; // seconds
    memoryUsageMB: number;
    cpuUsagePercent: number;
  };
}

// Example Response
{
  "success": true,
  "instances": [
    {
      "id": "claude_inst_1634567890123",
      "pid": 12345,
      "status": "running",
      "name": "Main Chat Instance",
      "createdAt": "2023-10-18T10:30:00Z",
      "lastActivity": "2023-10-18T11:15:30Z",
      "statistics": {
        "messagesExchanged": 47,
        "uptime": 2730,
        "memoryUsageMB": 156,
        "cpuUsagePercent": 12
      }
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

#### GET /api/claude/instances/:id
**Get Instance Details**

```typescript
// Response
interface GetInstanceResponse {
  success: boolean;
  instance: {
    id: string;
    pid?: number;
    status: InstanceStatus;
    configuration: InstanceConfiguration;
    metadata: InstanceMetadata;
    statistics: DetailedStatistics;
    healthStatus: HealthStatus;
    conversation?: {
      messageCount: number;
      lastMessage: string; // ISO 8601
      conversationId?: string;
    };
  };
  error?: string;
}

interface DetailedStatistics {
  messagesExchanged: number;
  averageResponseTime: number; // milliseconds
  uptime: number; // seconds
  resourceUsage: {
    memoryUsageMB: number;
    memoryLimitMB: number;
    cpuUsagePercent: number;
    cpuLimitPercent: number;
  };
  errorCount: number;
  lastError?: {
    message: string;
    timestamp: string;
    type: string;
  };
}

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    lastChecked: string;
  }>;
}
```

#### DELETE /api/claude/instances/:id
**Terminate Instance**

```typescript
// Query Parameters
interface TerminateQuery {
  force?: boolean;        // Force kill if graceful shutdown fails
  saveState?: boolean;    // Save conversation state before terminating
  timeout?: number;       // Graceful shutdown timeout (seconds)
}

// Response
interface TerminateInstanceResponse {
  success: boolean;
  terminatedAt: string; // ISO 8601
  gracefulShutdown: boolean;
  savedState?: {
    conversationId: string;
    messageCount: number;
    savedAt: string;
  };
  error?: string;
}

// Example
DELETE /api/claude/instances/claude_inst_1634567890123?saveState=true&timeout=30

{
  "success": true,
  "terminatedAt": "2023-10-18T12:00:00Z",
  "gracefulShutdown": true,
  "savedState": {
    "conversationId": "conv_1634567890123",
    "messageCount": 47,
    "savedAt": "2023-10-18T12:00:00Z"
  }
}
```

### 2. Communication API

#### POST /api/claude/instances/:id/messages
**Send Message to Instance**

```typescript
// Request
interface SendMessageRequest {
  message: {
    content: string;
    type?: 'user-input' | 'system-command';
    metadata?: Record<string, any>;
  };
  options?: {
    timeout?: number;           // Response timeout in milliseconds
    expectResponse?: boolean;   // Whether to wait for response
    priority?: 'low' | 'normal' | 'high';
  };
}

// Response
interface SendMessageResponse {
  success: boolean;
  messageId: string;
  sentAt: string; // ISO 8601
  response?: {
    content: string;
    responseTime: number; // milliseconds
    tokens?: {
      input: number;
      output: number;
    };
  };
  error?: string;
}

// Example Request
POST /api/claude/instances/claude_inst_1634567890123/messages
{
  "message": {
    "content": "Hello Claude, how are you today?",
    "type": "user-input",
    "metadata": {
      "clientId": "web-ui",
      "sessionId": "session_123"
    }
  },
  "options": {
    "timeout": 30000,
    "expectResponse": true,
    "priority": "normal"
  }
}

// Example Response
{
  "success": true,
  "messageId": "msg_1634567890456",
  "sentAt": "2023-10-18T12:15:30Z",
  "response": {
    "content": "Hello! I'm doing well, thank you for asking. How can I assist you today?",
    "responseTime": 1250,
    "tokens": {
      "input": 12,
      "output": 18
    }
  }
}
```

#### GET /api/claude/instances/:id/messages
**Get Conversation History**

```typescript
// Query Parameters
interface GetMessagesQuery {
  limit?: number;        // Default: 50, Max: 1000
  offset?: number;       // For pagination
  since?: string;        // ISO 8601 timestamp
  messageType?: 'user-input' | 'assistant-response' | 'system-info' | 'error';
  conversationId?: string;
}

// Response
interface GetMessagesResponse {
  success: boolean;
  messages: ConversationMessage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  conversationMetadata: {
    id: string;
    instanceId: string;
    startedAt: string;
    lastActivity: string;
    messageCount: number;
    totalTokens: number;
  };
  error?: string;
}

interface ConversationMessage {
  id: string;
  type: 'user-input' | 'assistant-response' | 'system-info' | 'error';
  content: string;
  timestamp: string;
  metadata: {
    responseTime?: number;
    tokens?: { input: number; output: number; };
    clientId?: string;
    error?: string;
  };
}
```

### 3. WebSocket Real-time API

#### Connection URL Pattern
```
ws://localhost:3002/claude/{instanceId}?clientId={clientId}&auth={token}
```

#### WebSocket Message Protocol

```typescript
// Base message interface
interface WebSocketMessage {
  id: string;
  type: string;
  timestamp: string; // ISO 8601
  instanceId: string;
  data: any;
}

// Client to Server Messages
interface ClientMessages {
  // Send message to Claude instance
  'message:send': {
    content: string;
    type?: 'user-input' | 'system-command';
    expectResponse?: boolean;
    timeout?: number;
    metadata?: Record<string, any>;
  };
  
  // Subscribe to instance events
  'instance:subscribe': {
    events: Array<'messages' | 'status' | 'errors' | 'metrics'>;
  };
  
  // Unsubscribe from events
  'instance:unsubscribe': {
    events: Array<'messages' | 'status' | 'errors' | 'metrics'>;
  };
  
  // Request instance status
  'instance:status': {};
  
  // Heartbeat/keepalive
  'ping': { clientTime: string; };
}

// Server to Client Messages
interface ServerMessages {
  // New message from Claude
  'message:received': {
    messageId: string;
    content: string;
    type: 'assistant-response' | 'system-info' | 'error';
    responseTime?: number;
    tokens?: { input: number; output: number; };
    conversationId: string;
  };
  
  // Message send acknowledgment
  'message:ack': {
    messageId: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    error?: string;
  };
  
  // Instance status updates
  'instance:status': {
    status: InstanceStatus;
    pid?: number;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    lastActivity: string;
  };
  
  // Instance errors
  'instance:error': {
    errorType: 'process-crash' | 'communication-failure' | 'resource-limit' | 'timeout';
    message: string;
    timestamp: string;
    recoverable: boolean;
  };
  
  // Connection events
  'connection:established': {
    instanceId: string;
    capabilities: string[];
    serverTime: string;
  };
  
  // Heartbeat response
  'pong': { 
    clientTime: string; 
    serverTime: string; 
    latency: number; 
  };
  
  // Generic error
  'error': {
    code: string;
    message: string;
    details?: any;
  };
}

// Example WebSocket Communication Flow
// Client -> Server
{
  "id": "msg_1634567890789",
  "type": "message:send",
  "timestamp": "2023-10-18T12:20:00Z",
  "instanceId": "claude_inst_1634567890123",
  "data": {
    "content": "What's the weather like?",
    "type": "user-input",
    "expectResponse": true,
    "timeout": 30000
  }
}

// Server -> Client (Acknowledgment)
{
  "id": "ack_1634567890790",
  "type": "message:ack",
  "timestamp": "2023-10-18T12:20:00.100Z",
  "instanceId": "claude_inst_1634567890123",
  "data": {
    "messageId": "msg_1634567890789",
    "status": "sent"
  }
}

// Server -> Client (Claude Response)
{
  "id": "resp_1634567890791",
  "type": "message:received",
  "timestamp": "2023-10-18T12:20:02.350Z",
  "instanceId": "claude_inst_1634567890123",
  "data": {
    "messageId": "msg_claude_response_1634567890791",
    "content": "I don't have access to real-time weather data. You might want to check a weather service or app for current conditions in your area.",
    "type": "assistant-response",
    "responseTime": 2250,
    "tokens": {
      "input": 6,
      "output": 28
    },
    "conversationId": "conv_1634567890123"
  }
}
```

### 4. System Status & Health API

#### GET /api/claude/status
**Overall System Status**

```typescript
interface SystemStatusResponse {
  success: boolean;
  system: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number; // seconds
    version: string;
    buildInfo: {
      version: string;
      commit: string;
      buildDate: string;
    };
  };
  instances: {
    total: number;
    running: number;
    stopped: number;
    error: number;
  };
  resources: {
    totalMemoryMB: number;
    availableMemoryMB: number;
    totalCpuCores: number;
    averageCpuUsage: number;
    diskUsageGB: number;
    availableDiskGB: number;
  };
  performance: {
    averageResponseTime: number;
    messagesPerSecond: number;
    errorRate: number; // percentage
    activeConnections: number;
  };
  lastUpdated: string; // ISO 8601
  error?: string;
}

// Example Response
{
  "success": true,
  "system": {
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0",
    "buildInfo": {
      "version": "1.0.0",
      "commit": "abc123def456",
      "buildDate": "2023-10-18T08:00:00Z"
    }
  },
  "instances": {
    "total": 5,
    "running": 4,
    "stopped": 1,
    "error": 0
  },
  "resources": {
    "totalMemoryMB": 8192,
    "availableMemoryMB": 4096,
    "totalCpuCores": 4,
    "averageCpuUsage": 25.5,
    "diskUsageGB": 120,
    "availableDiskGB": 380
  },
  "performance": {
    "averageResponseTime": 1850,
    "messagesPerSecond": 2.3,
    "errorRate": 0.5,
    "activeConnections": 8
  },
  "lastUpdated": "2023-10-18T12:25:00Z"
}
```

#### GET /api/claude/health
**Detailed Health Check**

```typescript
interface HealthCheckResponse {
  success: boolean;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  lastChecked: string;
  error?: string;
}

interface HealthCheck {
  name: string;
  category: 'system' | 'instance' | 'resource' | 'performance';
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime: number; // milliseconds
  metadata?: Record<string, any>;
  lastChecked: string;
}

// Example Response
{
  "success": true,
  "overall": "healthy",
  "checks": [
    {
      "name": "System Memory",
      "category": "resource",
      "status": "pass",
      "message": "Memory usage within normal limits",
      "responseTime": 5,
      "metadata": {
        "usage": 50.2,
        "limit": 80.0
      },
      "lastChecked": "2023-10-18T12:25:00Z"
    },
    {
      "name": "Active Instances",
      "category": "instance",
      "status": "pass", 
      "message": "All instances responding normally",
      "responseTime": 15,
      "metadata": {
        "total": 4,
        "healthy": 4,
        "unhealthy": 0
      },
      "lastChecked": "2023-10-18T12:25:00Z"
    },
    {
      "name": "Average Response Time",
      "category": "performance",
      "status": "warn",
      "message": "Response time above optimal threshold",
      "responseTime": 8,
      "metadata": {
        "current": 2850,
        "threshold": 2000
      },
      "lastChecked": "2023-10-18T12:25:00Z"
    }
  ],
  "lastChecked": "2023-10-18T12:25:00Z"
}
```

### 5. Error Response Standards

All API endpoints follow consistent error response format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    type: string;          // Error category
    timestamp: string;      // ISO 8601
    requestId: string;      // For tracking/debugging
    details?: any;         // Additional error context
    suggestedAction?: string; // What user should do
  };
}

// Example Error Responses

// Instance Not Found (404)
{
  "success": false,
  "error": {
    "code": "INSTANCE_NOT_FOUND",
    "message": "Claude instance with ID 'claude_inst_invalid' not found",
    "type": "NOT_FOUND",
    "timestamp": "2023-10-18T12:30:00Z",
    "requestId": "req_1634567890999",
    "suggestedAction": "Verify the instance ID is correct or create a new instance"
  }
}

// Resource Limit Exceeded (429)
{
  "success": false,
  "error": {
    "code": "RESOURCE_LIMIT_EXCEEDED", 
    "message": "Maximum number of concurrent instances reached",
    "type": "RATE_LIMIT",
    "timestamp": "2023-10-18T12:30:00Z",
    "requestId": "req_1634567891000",
    "details": {
      "current": 10,
      "maximum": 10
    },
    "suggestedAction": "Wait for existing instances to terminate or increase system limits"
  }
}

// Process Communication Failure (500)
{
  "success": false,
  "error": {
    "code": "COMMUNICATION_FAILURE",
    "message": "Failed to communicate with Claude instance process",
    "type": "INTERNAL_ERROR",
    "timestamp": "2023-10-18T12:30:00Z", 
    "requestId": "req_1634567891001",
    "details": {
      "instanceId": "claude_inst_1634567890123",
      "pid": 12345,
      "lastResponse": "2023-10-18T12:25:00Z"
    },
    "suggestedAction": "Try restarting the instance or contact system administrator"
  }
}

// Validation Error (400)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid configuration provided",
    "type": "BAD_REQUEST",
    "timestamp": "2023-10-18T12:30:00Z",
    "requestId": "req_1634567891002",
    "details": {
      "validationErrors": [
        {
          "field": "configuration.resourceLimits.maxMemoryMB",
          "message": "Must be between 128 and 2048",
          "value": 4096
        },
        {
          "field": "configuration.command",
          "message": "Command array cannot be empty",
          "value": []
        }
      ]
    },
    "suggestedAction": "Correct the validation errors and resubmit the request"
  }
}
```

### 6. Rate Limiting & Throttling

API endpoints implement rate limiting with informative headers:

```http
# Rate Limit Headers (included in all responses)
X-RateLimit-Limit: 100          # Requests per minute
X-RateLimit-Remaining: 87       # Remaining requests in window  
X-RateLimit-Reset: 1634567950   # Unix timestamp when limit resets
X-RateLimit-Policy: fixed-window # Rate limiting algorithm

# When rate limit exceeded (429 response)
Retry-After: 30                 # Seconds to wait before retrying
```

Different endpoints have different rate limits:
- `GET /api/claude/status`: 60 req/min
- `GET /api/claude/instances`: 120 req/min  
- `POST /api/claude/instances`: 10 req/min
- `POST /api/claude/instances/:id/messages`: 300 req/min
- `DELETE /api/claude/instances/:id`: 20 req/min

### 7. Authentication & Authorization

API supports multiple authentication methods:

```typescript
// API Key Authentication (Header)
Authorization: Bearer api_key_1234567890abcdef

// Session Authentication (Cookie)
Cookie: sessionId=sess_1234567890; Path=/; HttpOnly; Secure

// JWT Authentication (Header) 
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Authentication Response Headers
X-Auth-User-Id: user_123
X-Auth-Permissions: instance:create,instance:read,instance:delete
X-Auth-Expires: 2023-10-18T18:30:00Z
```

Protected endpoints require appropriate permissions:

```typescript
interface Permission {
  resource: 'instance' | 'system' | 'conversation' | 'admin';
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  scope?: 'own' | 'shared' | 'all';
}

// Required permissions by endpoint:
// POST /api/claude/instances -> instance:create
// GET /api/claude/instances -> instance:read:own or instance:read:all  
// DELETE /api/claude/instances/:id -> instance:delete (only if owner or admin)
// GET /api/claude/status -> system:read
// All WebSocket connections -> instance:read for target instance
```

This comprehensive API specification provides the foundation for a robust, scalable Claude instance management system with clear contracts, proper error handling, and production-ready features.