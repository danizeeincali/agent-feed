# Dual-Mode Worker Architecture

## Executive Summary

This document defines the architecture for extending the AVI (Always-Vigilant Intelligence) system to support both RSS feed processing and user-requested task execution within a unified worker framework.

**Architecture Version:** 1.0
**Date:** 2025-10-13
**Status:** Design Phase
**Owner:** System Architecture Team

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AVI ORCHESTRATOR                             │
│  (avi/orchestrator.js)                                          │
│  - Monitors work queue                                          │
│  - Spawns workers based on capacity                             │
│  - Manages worker lifecycle                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ spawns
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UNIFIED WORKER POOL                           │
│  (worker/unified-agent-worker.js)                               │
│                                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │   Task Type Detector                │                        │
│  │   - Analyzes post_content           │                        │
│  │   - Routes to correct executor      │                        │
│  └──────────┬──────────────────────────┘                        │
│             │                                                    │
│             ├──► RSS Feed Executor (existing logic)             │
│             │                                                    │
│             ├──► File Operation Executor                        │
│             │     - create, read, write, delete files           │
│             │                                                    │
│             ├──► Command Executor                               │
│             │     - shell command execution                     │
│             │     - output capture                              │
│             │                                                    │
│             └──► API Executor                                   │
│                   - HTTP requests (GET, POST, etc.)             │
│                   - response handling                           │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ updates
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WORK QUEUE                                    │
│  (repositories/postgres/work-queue.repository.js)               │
│                                                                  │
│  Ticket Schema:                                                 │
│  - id, user_id, post_id                                         │
│  - post_content (task specification)                            │
│  - post_metadata (task type, parameters)                        │
│  - status (pending, processing, completed, failed)              │
│  - result (execution output)                                    │
│  - error_message                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Unified Agent Worker

**Location:** `/workspaces/agent-feed/api-server/worker/unified-agent-worker.js`

**Responsibilities:**
- Accept work tickets from orchestrator
- Detect task type from post_content
- Route to appropriate executor
- Capture execution results
- Update work queue with outcomes
- Handle errors gracefully

**Class Structure:**

```javascript
class UnifiedAgentWorker {
  constructor(config) {
    this.workerId = config.workerId;
    this.ticketId = config.ticketId;
    this.agentId = config.agentId;

    // Initialize executors
    this.taskDetector = new TaskTypeDetector();
    this.executors = {
      rss_feed: new RssFeedExecutor(),
      file_operation: new FileOperationExecutor(),
      command: new CommandExecutor(),
      api_call: new APIExecutor()
    };
  }

  async execute() {
    // 1. Fetch ticket details
    // 2. Detect task type
    // 3. Route to executor
    // 4. Capture result
    // 5. Update ticket status
  }

  async detectTaskType(postContent, metadata) {
    // Pattern matching logic
  }

  async executeTask(taskType, postContent, metadata) {
    // Delegate to appropriate executor
  }
}
```

---

### 2.2 Task Type Detector

**Location:** `/workspaces/agent-feed/api-server/worker/task-detector.js`

**Purpose:** Parse post_content to determine task type and extract parameters

**Detection Strategy:**

```javascript
class TaskTypeDetector {
  detect(postContent, metadata) {
    // Priority 1: Check metadata.task_type (explicit)
    if (metadata?.task_type) {
      return {
        type: metadata.task_type,
        params: metadata.params || {}
      };
    }

    // Priority 2: Pattern matching on content
    const patterns = [
      {
        pattern: /^file:\/\/(create|read|write|delete)/i,
        type: 'file_operation',
        extractor: this.extractFileOperation
      },
      {
        pattern: /^cmd:\/\//i,
        type: 'command',
        extractor: this.extractCommand
      },
      {
        pattern: /^api:\/\/(GET|POST|PUT|DELETE)/i,
        type: 'api_call',
        extractor: this.extractApiCall
      },
      {
        pattern: /^https?:\/\//i,
        type: 'rss_feed',
        extractor: this.extractRssFeed
      }
    ];

    for (const { pattern, type, extractor } of patterns) {
      if (pattern.test(postContent)) {
        return {
          type,
          params: extractor(postContent, metadata)
        };
      }
    }

    // Default: RSS feed processing
    return { type: 'rss_feed', params: {} };
  }
}
```

**Task Content Examples:**

```
RSS Feed:
  "https://example.com/feed.xml"

File Operation:
  "file://create /tmp/output.txt"
  "file://read /etc/config.json"
  "file://write /tmp/log.txt content=Hello World"
  "file://delete /tmp/temp.txt"

Command Execution:
  "cmd://ls -la /var/log"
  "cmd://npm test"

API Call:
  "api://GET https://api.example.com/users"
  "api://POST https://api.example.com/data body={\"key\":\"value\"}"
```

---

### 2.3 File Operation Executor

**Location:** `/workspaces/agent-feed/api-server/worker/executors/file-operation-executor.js`

**Responsibilities:**
- Create, read, write, delete files
- Path validation and security checks
- Permission handling
- Error reporting

**Security Constraints:**
- Whitelist allowed directories: `/tmp`, `/workspaces/agent-feed/api-server/data`
- Block directory traversal (../, absolute paths outside whitelist)
- Validate file extensions (block .exe, .sh unless explicitly allowed)
- Size limits (max 10MB per file)

**Implementation:**

```javascript
class FileOperationExecutor {
  constructor() {
    this.allowedDirs = [
      '/tmp',
      '/workspaces/agent-feed/api-server/data',
      '/workspaces/agent-feed/api-server/worker/output'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async execute(params) {
    const { operation, path, content, options } = params;

    // Security validation
    this.validatePath(path);

    switch (operation) {
      case 'create':
        return await this.createFile(path, content, options);
      case 'read':
        return await this.readFile(path, options);
      case 'write':
        return await this.writeFile(path, content, options);
      case 'delete':
        return await this.deleteFile(path);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  validatePath(filePath) {
    const normalized = path.normalize(filePath);

    // Check for directory traversal
    if (normalized.includes('..')) {
      throw new SecurityError('Directory traversal detected');
    }

    // Check against whitelist
    const isAllowed = this.allowedDirs.some(dir =>
      normalized.startsWith(dir)
    );

    if (!isAllowed) {
      throw new SecurityError(`Path not allowed: ${filePath}`);
    }

    return normalized;
  }

  async createFile(filePath, content, options = {}) {
    // Implementation with error handling
  }

  async readFile(filePath, options = {}) {
    // Implementation with size checks
  }

  async writeFile(filePath, content, options = {}) {
    // Implementation with atomic writes
  }

  async deleteFile(filePath) {
    // Implementation with confirmation
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

---

### 2.4 Command Executor

**Location:** `/workspaces/agent-feed/api-server/worker/executors/command-executor.js`

**Responsibilities:**
- Execute shell commands safely
- Capture stdout/stderr
- Handle timeouts
- Enforce command whitelist

**Security Constraints:**
- Whitelist allowed commands: `ls`, `cat`, `npm`, `node`, `git`
- Block dangerous commands: `rm -rf`, `dd`, `mkfs`, `shutdown`
- Timeout: 30 seconds default
- Working directory restrictions

**Implementation:**

```javascript
import { spawn } from 'child_process';

class CommandExecutor {
  constructor() {
    this.allowedCommands = ['ls', 'cat', 'npm', 'node', 'git', 'echo'];
    this.blockedPatterns = [
      /rm\s+-rf/i,
      /dd\s+if=/i,
      /mkfs/i,
      /shutdown/i,
      /reboot/i
    ];
    this.timeout = 30000; // 30 seconds
  }

  async execute(params) {
    const { command, args = [], cwd, timeout } = params;

    // Security validation
    this.validateCommand(command);

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: cwd || '/tmp',
        timeout: timeout || this.timeout,
        shell: false
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      proc.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Timeout handler
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  validateCommand(command) {
    // Check if command is in whitelist
    const baseCommand = command.split(' ')[0];
    if (!this.allowedCommands.includes(baseCommand)) {
      throw new SecurityError(`Command not allowed: ${baseCommand}`);
    }

    // Check for blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(command)) {
        throw new SecurityError(`Dangerous command pattern detected`);
      }
    }
  }
}
```

---

### 2.5 API Executor

**Location:** `/workspaces/agent-feed/api-server/worker/executors/api-executor.js`

**Responsibilities:**
- Make HTTP requests (GET, POST, PUT, DELETE)
- Handle authentication headers
- Parse responses
- Retry logic

**Implementation:**

```javascript
import axios from 'axios';

class APIExecutor {
  constructor() {
    this.timeout = 10000; // 10 seconds
    this.maxRetries = 3;
  }

  async execute(params) {
    const { method, url, body, headers, options = {} } = params;

    const config = {
      method: method.toUpperCase(),
      url,
      timeout: options.timeout || this.timeout,
      headers: {
        'User-Agent': 'AVI-Worker/1.0',
        ...headers
      }
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      config.data = body;
    }

    try {
      const response = await this.executeWithRetry(config);
      return {
        success: true,
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  async executeWithRetry(config, retries = 0) {
    try {
      return await axios(config);
    } catch (error) {
      if (retries < this.maxRetries && this.isRetryable(error)) {
        await this.delay(1000 * Math.pow(2, retries)); // Exponential backoff
        return await this.executeWithRetry(config, retries + 1);
      }
      throw error;
    }
  }

  isRetryable(error) {
    return error.code === 'ETIMEDOUT' ||
           error.code === 'ECONNRESET' ||
           (error.response?.status >= 500);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### 2.6 RSS Feed Executor

**Location:** `/workspaces/agent-feed/api-server/worker/executors/rss-feed-executor.js`

**Purpose:** Encapsulate existing RSS feed processing logic

This executor wraps the existing feed processing functionality into the new unified framework.

---

## 3. Execution Flow

### 3.1 Ticket Creation Flow

```
User/System creates post
        │
        ▼
POST /api/v1/agent-posts
        │
        ▼
Post stored in DB
        │
        ▼
Trigger: Create work_queue ticket
        │
        ▼
Ticket fields populated:
  - user_id: post author
  - post_id: reference to post
  - post_content: task specification
  - post_metadata: { task_type, params }
  - status: 'pending'
  - priority: 5 (default)
        │
        ▼
Orchestrator detects new ticket
```

### 3.2 Worker Execution Flow

```
Orchestrator spawns worker
        │
        ▼
UnifiedAgentWorker.execute()
        │
        ├─► Fetch ticket from DB
        │
        ├─► Mark ticket as 'processing'
        │
        ├─► TaskTypeDetector.detect()
        │   │
        │   ├─► Check metadata.task_type
        │   ├─► Pattern match post_content
        │   └─► Return { type, params }
        │
        ├─► Route to executor
        │   │
        │   ├─► file_operation → FileOperationExecutor
        │   ├─► command → CommandExecutor
        │   ├─► api_call → APIExecutor
        │   └─► rss_feed → RssFeedExecutor
        │
        ├─► Execute task
        │   │
        │   ├─► Validate inputs
        │   ├─► Perform operation
        │   └─► Capture result/error
        │
        ├─► Update ticket
        │   │
        │   ├─► status: 'completed' or 'failed'
        │   ├─► result: execution output
        │   ├─► error_message: if failed
        │   └─► completed_at: timestamp
        │
        └─► Worker terminates
```

---

## 4. Data Models

### 4.1 Work Queue Ticket Schema

```sql
CREATE TABLE work_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  post_id BIGINT,
  post_content TEXT NOT NULL,
  post_author VARCHAR(255),
  post_metadata JSONB,

  assigned_agent VARCHAR(255),
  worker_id VARCHAR(255),

  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,

  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  INDEX idx_status (status),
  INDEX idx_priority (priority DESC),
  INDEX idx_user_id (user_id)
);
```

### 4.2 Post Metadata Structure

```json
{
  "task_type": "file_operation",
  "params": {
    "operation": "create",
    "path": "/tmp/output.txt",
    "content": "Hello World",
    "options": {
      "encoding": "utf8",
      "mode": 0o644
    }
  },
  "security": {
    "allowed_paths": ["/tmp"],
    "max_size": 1048576
  },
  "execution": {
    "timeout": 30000,
    "retries": 3
  }
}
```

### 4.3 Ticket Result Structure

```json
{
  "task_type": "file_operation",
  "success": true,
  "operation": "create",
  "path": "/tmp/output.txt",
  "bytes_written": 11,
  "execution_time_ms": 45,
  "worker_id": "worker-1234567890-abc123",
  "timestamp": "2025-10-13T12:34:56.789Z"
}
```

---

## 5. Integration Points

### 5.1 Orchestrator Integration

**File:** `/workspaces/agent-feed/api-server/avi/orchestrator.js`

**Changes Required:**
1. Replace `AgentWorker` with `UnifiedAgentWorker`
2. No other changes needed - orchestrator logic remains the same

```javascript
// Before:
const worker = new AgentWorker({ workerId, ticketId, agentId });

// After:
const worker = new UnifiedAgentWorker({ workerId, ticketId, agentId });
```

### 5.2 Work Queue Integration

**File:** `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`

**No changes required** - existing methods support new task types:
- `createTicket()` - accepts post_metadata
- `assignTicket()` - works with any task type
- `completeTicket()` - stores result JSONB
- `failTicket()` - handles errors

### 5.3 Post Creation Integration

**File:** `/workspaces/agent-feed/api-server/server.js` (or relevant route)

**Enhancement:**
Add task type detection when creating tickets:

```javascript
// POST /api/v1/agent-posts endpoint
app.post('/api/v1/agent-posts', async (req, res) => {
  const { title, content, author_agent, userId, metadata } = req.body;

  // Create post
  const post = await createPost({ title, content, author_agent });

  // Create work ticket with task metadata
  const ticket = await workQueueRepository.createTicket({
    user_id: userId || 'anonymous',
    post_id: post.id,
    post_content: content,
    post_author: author_agent,
    post_metadata: metadata || {}, // Contains task_type, params
    priority: metadata?.priority || 5
  });

  res.status(201).json({ success: true, data: post, ticket_id: ticket.id });
});
```

---

## 6. Security Considerations

### 6.1 File System Security

**Threats:**
- Directory traversal attacks
- Unauthorized file access
- Large file DoS attacks

**Mitigations:**
1. Path validation with whitelist
2. Normalized path checking
3. File size limits (10MB default)
4. Read-only access outside `/tmp` and `/data`

**Implementation:**
```javascript
validatePath(filePath) {
  const normalized = path.normalize(filePath);

  // Block directory traversal
  if (normalized.includes('..')) {
    throw new SecurityError('Directory traversal detected');
  }

  // Whitelist check
  const allowed = ['/tmp', '/workspaces/agent-feed/api-server/data'];
  if (!allowed.some(dir => normalized.startsWith(dir))) {
    throw new SecurityError('Path not in whitelist');
  }

  return normalized;
}
```

### 6.2 Command Execution Security

**Threats:**
- Shell injection
- Dangerous system commands
- Resource exhaustion

**Mitigations:**
1. Command whitelist
2. Pattern blocking (rm -rf, etc.)
3. Timeout enforcement (30s)
4. No shell interpretation (spawn with shell: false)

### 6.3 API Request Security

**Threats:**
- SSRF (Server-Side Request Forgery)
- Information disclosure
- External service abuse

**Mitigations:**
1. Block internal IP ranges (127.0.0.1, 10.0.0.0/8, etc.)
2. Timeout enforcement (10s)
3. Rate limiting per user
4. Response size limits

### 6.4 Input Validation

**All executors must:**
1. Validate all input parameters
2. Sanitize user-provided content
3. Enforce type constraints
4. Return structured error messages

---

## 7. Error Handling

### 7.1 Error Types

```javascript
class WorkerError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.type = type; // 'validation', 'security', 'execution', 'timeout'
    this.details = details;
    this.retryable = this.isRetryable(type);
  }

  isRetryable(type) {
    return ['timeout', 'network'].includes(type);
  }
}
```

### 7.2 Error Handling Strategy

```javascript
async execute() {
  try {
    // Task detection
    const taskInfo = await this.detectTaskType();

    // Execution
    const result = await this.executeTask(taskInfo);

    // Update ticket - success
    await workQueueRepository.completeTicket(this.ticketId, {
      result,
      tokens_used: 0
    });

  } catch (error) {
    // Classify error
    const errorType = this.classifyError(error);

    // Log error
    console.error(`Worker ${this.workerId} failed:`, error);

    // Update ticket - failure
    await workQueueRepository.failTicket(
      this.ticketId,
      error.message,
      error.retryable // Should retry?
    );

    throw error;
  }
}
```

### 7.3 Retry Logic

```javascript
failTicket(ticketId, errorMessage, shouldRetry = true) {
  // Update status to 'failed'
  // Increment retry_count

  if (shouldRetry && ticket.retry_count < 3) {
    // Reset to 'pending' for retry
    return this.retryTicket(ticketId);
  }

  // Max retries reached - permanent failure
  return ticket;
}
```

---

## 8. Performance Considerations

### 8.1 Worker Pool Sizing

**Current Configuration:**
- Max workers: 5 (configurable)
- Poll interval: 5 seconds
- Health check interval: 30 seconds

**Recommendations:**
- Scale max workers based on system resources
- Monitor CPU/memory usage
- Adjust poll interval based on queue depth

### 8.2 Task Prioritization

**Priority Levels:**
- 10: Critical (system tasks)
- 5: Normal (default for user tasks)
- 1: Low (background jobs)

Tickets processed by: `ORDER BY priority DESC, created_at ASC`

### 8.3 Resource Limits

**Per-Worker Limits:**
- File operations: 10MB max file size
- Command execution: 30s timeout
- API calls: 10s timeout, 5MB response limit
- Memory: 512MB per worker (future: cgroup limits)

---

## 9. Monitoring and Observability

### 9.1 Metrics to Collect

```javascript
{
  "worker_metrics": {
    "total_tasks_executed": 1543,
    "tasks_by_type": {
      "rss_feed": 1200,
      "file_operation": 245,
      "command": 78,
      "api_call": 20
    },
    "success_rate": 0.982,
    "avg_execution_time_ms": 1250,
    "active_workers": 3
  },
  "queue_metrics": {
    "pending_count": 12,
    "processing_count": 3,
    "completed_today": 458,
    "failed_today": 9
  }
}
```

### 9.2 Logging Strategy

```javascript
// Worker lifecycle
console.log(`[WORKER] ${workerId} spawned for ticket ${ticketId}`);
console.log(`[WORKER] ${workerId} detected task type: ${taskType}`);
console.log(`[WORKER] ${workerId} executing ${taskType}`);
console.log(`[WORKER] ${workerId} completed in ${executionTime}ms`);
console.error(`[WORKER] ${workerId} failed: ${error.message}`);

// Task execution
console.log(`[FILE] Creating file: ${filePath}`);
console.log(`[CMD] Executing: ${command} ${args.join(' ')}`);
console.log(`[API] ${method} ${url} - ${status}`);
```

### 9.3 Health Checks

**Orchestrator monitors:**
- Active worker count
- Context size (token usage)
- Stuck ticket detection (30min timeout)
- Error rate (> 10% triggers alert)

---

## 10. Migration Strategy

### Phase 1: Implementation (Week 1-2)
1. Create `UnifiedAgentWorker` class
2. Implement `TaskTypeDetector`
3. Build executor classes:
   - `FileOperationExecutor`
   - `CommandExecutor`
   - `APIExecutor`
   - `RssFeedExecutor` (wrap existing logic)
4. Add security validation
5. Write unit tests (TDD)

### Phase 2: Integration (Week 3)
1. Update orchestrator to use `UnifiedAgentWorker`
2. Enhance post creation endpoint
3. Add task metadata support
4. Integration testing
5. Security testing

### Phase 3: Deployment (Week 4)
1. Deploy to staging environment
2. Run parallel processing (old + new workers)
3. Monitor metrics and errors
4. Gradual rollout to production
5. Deprecate old `AgentWorker`

### Phase 4: Optimization (Week 5+)
1. Performance tuning
2. Add advanced features (batching, parallel execution)
3. Enhanced monitoring dashboards
4. Documentation updates

---

## 11. Architecture Decision Records (ADRs)

### ADR-001: Unified Worker vs. Separate Worker Types

**Status:** Accepted

**Context:**
Should we create separate worker classes for each task type or a unified worker that routes to executors?

**Decision:**
Unified worker with pluggable executors.

**Rationale:**
- Single point of orchestration
- Easier to add new task types
- Consistent error handling and logging
- Simpler worker lifecycle management
- Reduced code duplication

**Consequences:**
- Worker code is more complex
- Task detection logic is centralized
- Easier to maintain long-term

---

### ADR-002: Task Type Detection Strategy

**Status:** Accepted

**Context:**
How should workers determine the task type from post_content?

**Decision:**
Two-tier detection:
1. Explicit metadata (`post_metadata.task_type`)
2. Pattern matching on content (`file://`, `cmd://`, `api://`)

**Rationale:**
- Explicit metadata gives clients full control
- Pattern matching provides user-friendly syntax
- Fallback to RSS feed for backward compatibility

**Consequences:**
- Clear migration path for existing functionality
- Easy to extend with new patterns
- Possible ambiguity if patterns overlap (mitigated by priority order)

---

### ADR-003: Security Model - Whitelist vs. Blacklist

**Status:** Accepted

**Context:**
Should file/command security use whitelist or blacklist approach?

**Decision:**
Whitelist approach for both file paths and commands.

**Rationale:**
- More secure by default
- Prevents unknown attack vectors
- Easier to audit and verify
- Industry best practice

**Consequences:**
- More restrictive (may block legitimate use cases)
- Requires explicit additions to whitelist
- Better security posture

---

### ADR-004: Result Storage Format

**Status:** Accepted

**Context:**
How should task execution results be stored?

**Decision:**
Store results as JSONB in `work_queue.result` column with standardized structure.

**Rationale:**
- PostgreSQL JSONB provides efficient storage and querying
- Flexible schema accommodates different result types
- Standardized structure aids monitoring and debugging

**Consequences:**
- Results are queryable with JSON operators
- Size limits apply (avoid storing large files inline)
- Easy to extend result schema

---

## 12. Future Enhancements

### 12.1 Batch Processing
Support multiple operations in a single ticket:

```json
{
  "task_type": "batch",
  "operations": [
    { "type": "file_operation", "operation": "create", ... },
    { "type": "command", "command": "npm test" },
    { "type": "api_call", "method": "POST", ... }
  ]
}
```

### 12.2 Workflow Engine
Chain tasks with dependencies:

```json
{
  "task_type": "workflow",
  "steps": [
    { "id": "fetch", "type": "api_call", ... },
    { "id": "process", "type": "command", "depends_on": ["fetch"] },
    { "id": "store", "type": "file_operation", "depends_on": ["process"] }
  ]
}
```

### 12.3 Scheduled Tasks
Support cron-like scheduling:

```json
{
  "task_type": "scheduled",
  "schedule": "0 */6 * * *",
  "task": { "type": "rss_feed", ... }
}
```

### 12.4 Parallel Execution
Execute file operations in parallel when safe:

```javascript
{
  "task_type": "parallel",
  "concurrency": 3,
  "tasks": [ ... ]
}
```

---

## 13. Testing Strategy

### 13.1 Unit Tests

**Coverage:**
- Task type detector (all patterns)
- Each executor (success/failure cases)
- Security validators (valid/invalid inputs)
- Error classification logic

### 13.2 Integration Tests

**Scenarios:**
- End-to-end ticket creation → execution → completion
- Task routing to correct executor
- Error handling and retry logic
- Concurrent worker execution

### 13.3 Security Tests

**Attack Scenarios:**
- Directory traversal attempts
- Command injection attempts
- SSRF attempts
- Path validation bypass attempts

### 13.4 Performance Tests

**Metrics:**
- Task execution time by type
- Worker spawn/cleanup overhead
- Queue processing throughput
- Memory usage per worker

---

## 14. Deployment Architecture

```
Production Environment:

┌─────────────────────────────────────────┐
│         Load Balancer                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       API Server (Node.js)              │
│  - Express routes                       │
│  - Post creation endpoints              │
│  - Work queue management                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    AVI Orchestrator (Always-On)         │
│  - Monitors work queue                  │
│  - Spawns workers (max 5)               │
│  - Health monitoring                    │
└──────────────┬──────────────────────────┘
               │
               ├──► Worker 1 (RSS Feed)
               ├──► Worker 2 (File Ops)
               ├──► Worker 3 (Command)
               └──► Worker 4 (API Call)

┌─────────────────────────────────────────┐
│      PostgreSQL Database                │
│  - work_queue table                     │
│  - agent_memories table                 │
│  - system_agent_templates               │
└─────────────────────────────────────────┘
```

---

## 15. Documentation Checklist

- [x] High-level architecture diagram
- [x] Component design and class structure
- [x] Execution flow diagrams
- [x] Data models and schemas
- [x] Integration points
- [x] Security considerations
- [x] Error handling strategy
- [x] Performance considerations
- [x] Monitoring and observability
- [x] Migration strategy
- [x] Architecture Decision Records
- [x] Testing strategy
- [x] Deployment architecture

---

## 16. File Structure

```
/workspaces/agent-feed/api-server/
│
├── worker/
│   ├── unified-agent-worker.js          (Main worker class)
│   ├── task-detector.js                 (Task type detection)
│   ├── agent-worker.js                  (Legacy - to be deprecated)
│   │
│   └── executors/
│       ├── base-executor.js             (Abstract base class)
│       ├── rss-feed-executor.js         (RSS feed processing)
│       ├── file-operation-executor.js   (File operations)
│       ├── command-executor.js          (Shell commands)
│       └── api-executor.js              (HTTP requests)
│
├── avi/
│   ├── orchestrator.js                  (Main orchestrator - updated)
│   └── orchestrator-factory.ts          (Factory pattern)
│
├── repositories/postgres/
│   └── work-queue.repository.js         (No changes needed)
│
├── routes/
│   └── agent-posts.js                   (Enhanced with task metadata)
│
└── tests/
    ├── unit/
    │   ├── task-detector.test.js
    │   └── executors/
    │       ├── file-operation-executor.test.js
    │       ├── command-executor.test.js
    │       └── api-executor.test.js
    │
    └── integration/
        └── dual-mode-worker-integration.test.js
```

---

## 17. Quick Reference

### Creating a File Operation Task

```javascript
POST /api/v1/agent-posts
{
  "title": "Create Config File",
  "content": "file://create /tmp/config.json",
  "userId": "user123",
  "metadata": {
    "task_type": "file_operation",
    "params": {
      "operation": "create",
      "path": "/tmp/config.json",
      "content": "{\"env\": \"production\"}",
      "options": { "encoding": "utf8" }
    }
  }
}
```

### Creating a Command Task

```javascript
POST /api/v1/agent-posts
{
  "title": "Run Tests",
  "content": "cmd://npm test",
  "userId": "user123",
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "npm",
      "args": ["test"],
      "cwd": "/workspaces/agent-feed/api-server"
    }
  }
}
```

### Creating an API Call Task

```javascript
POST /api/v1/agent-posts
{
  "title": "Fetch User Data",
  "content": "api://GET https://api.example.com/users/123",
  "userId": "user123",
  "metadata": {
    "task_type": "api_call",
    "params": {
      "method": "GET",
      "url": "https://api.example.com/users/123",
      "headers": {
        "Authorization": "Bearer token123"
      }
    }
  }
}
```

---

## Contact and Ownership

**Document Owner:** System Architecture Team
**Last Updated:** 2025-10-13
**Version:** 1.0
**Status:** Design Phase - Approved for Implementation

For questions or clarifications, contact the architecture review board.

---

## Appendix A: Code Examples

See implementation files:
- `/workspaces/agent-feed/api-server/worker/unified-agent-worker.js`
- `/workspaces/agent-feed/api-server/worker/executors/*.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/*.test.js`

## Appendix B: Security Audit Report

(To be completed during implementation phase)

## Appendix C: Performance Benchmarks

(To be completed during testing phase)

---

**END OF DOCUMENT**
