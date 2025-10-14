# Dual-Mode Worker - Quick Start Guide

## For Developers

This guide helps you quickly understand and start using the dual-mode worker system.

---

## Overview

The dual-mode worker system extends AVI to support:
1. **RSS Feed Processing** (existing functionality)
2. **File Operations** (create, read, write, delete)
3. **Command Execution** (shell commands)
4. **API Calls** (HTTP requests)

---

## Usage Examples

### 1. File Operations

#### Create a File
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
      "content": "{\"database\": \"postgres\", \"port\": 5432}",
      "options": {
        "encoding": "utf8",
        "mode": 0o644
      }
    }
  }
}
```

#### Read a File
```javascript
POST /api/v1/agent-posts
{
  "title": "Read Log File",
  "content": "file://read /tmp/app.log",
  "userId": "user123",
  "metadata": {
    "task_type": "file_operation",
    "params": {
      "operation": "read",
      "path": "/tmp/app.log",
      "options": {
        "encoding": "utf8"
      }
    }
  }
}
```

#### Write to a File
```javascript
POST /api/v1/agent-posts
{
  "title": "Append to Log",
  "content": "file://write /tmp/app.log",
  "userId": "user123",
  "metadata": {
    "task_type": "file_operation",
    "params": {
      "operation": "write",
      "path": "/tmp/app.log",
      "content": "2025-10-13 12:00:00 - Application started\n",
      "options": {
        "encoding": "utf8",
        "flag": "a"  // append mode
      }
    }
  }
}
```

#### Delete a File
```javascript
POST /api/v1/agent-posts
{
  "title": "Clean Temp File",
  "content": "file://delete /tmp/temp.txt",
  "userId": "user123",
  "metadata": {
    "task_type": "file_operation",
    "params": {
      "operation": "delete",
      "path": "/tmp/temp.txt"
    }
  }
}
```

---

### 2. Command Execution

#### Run Tests
```javascript
POST /api/v1/agent-posts
{
  "title": "Run Unit Tests",
  "content": "cmd://npm test",
  "userId": "user123",
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "npm",
      "args": ["test"],
      "cwd": "/workspaces/agent-feed/api-server",
      "timeout": 60000
    }
  }
}
```

#### List Files
```javascript
POST /api/v1/agent-posts
{
  "title": "List Directory",
  "content": "cmd://ls -la /tmp",
  "userId": "user123",
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "ls",
      "args": ["-la", "/tmp"]
    }
  }
}
```

#### Git Status
```javascript
POST /api/v1/agent-posts
{
  "title": "Check Git Status",
  "content": "cmd://git status",
  "userId": "user123",
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "git",
      "args": ["status"],
      "cwd": "/workspaces/agent-feed"
    }
  }
}
```

---

### 3. API Calls

#### GET Request
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
        "Authorization": "Bearer your-token-here",
        "Accept": "application/json"
      }
    }
  }
}
```

#### POST Request
```javascript
POST /api/v1/agent-posts
{
  "title": "Create User",
  "content": "api://POST https://api.example.com/users",
  "userId": "user123",
  "metadata": {
    "task_type": "api_call",
    "params": {
      "method": "POST",
      "url": "https://api.example.com/users",
      "headers": {
        "Authorization": "Bearer your-token-here",
        "Content-Type": "application/json"
      },
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

---

### 4. RSS Feed (Existing Functionality)

```javascript
POST /api/v1/agent-posts
{
  "title": "Process RSS Feed",
  "content": "https://example.com/feed.xml",
  "userId": "user123",
  "metadata": {
    "task_type": "rss_feed"
  }
}
```

**Note:** RSS feed processing is the default behavior. If no task_type is specified and the content starts with `http://` or `https://`, it will be treated as an RSS feed.

---

## Checking Task Results

After submitting a task, you can check its status via the work queue:

```javascript
GET /api/v1/work-queue/tickets?userId=user123

Response:
{
  "success": true,
  "data": [
    {
      "id": 42,
      "user_id": "user123",
      "post_id": 123,
      "post_content": "file://create /tmp/config.json",
      "status": "completed",
      "result": {
        "task_type": "file_operation",
        "success": true,
        "operation": "create",
        "path": "/tmp/config.json",
        "bytes_written": 45,
        "execution_time_ms": 23
      },
      "created_at": "2025-10-13T12:00:00Z",
      "completed_at": "2025-10-13T12:00:01Z"
    }
  ]
}
```

---

## Error Handling

### Failed Tasks

When a task fails, the result includes error information:

```json
{
  "id": 43,
  "status": "failed",
  "error_message": "Path not allowed: /etc/passwd",
  "result": {
    "task_type": "file_operation",
    "success": false,
    "error": "SecurityError: Path not in whitelist"
  },
  "retry_count": 1
}
```

### Retryable Errors

Some errors are automatically retried up to 3 times:
- Network timeouts
- Temporary file system errors
- API rate limiting (5xx errors)

Non-retryable errors (permanent failure):
- Security violations
- Invalid parameters
- Permission denied

---

## Security Constraints

### File Operations
- **Allowed paths:** `/tmp`, `/workspaces/agent-feed/api-server/data`
- **Max file size:** 10MB
- **Blocked:** Directory traversal (`../`), absolute paths outside whitelist

### Command Execution
- **Allowed commands:** `ls`, `cat`, `npm`, `node`, `git`, `echo`
- **Blocked patterns:** `rm -rf`, `dd`, `mkfs`, `shutdown`, `reboot`
- **Timeout:** 30 seconds (configurable)

### API Calls
- **Blocked IPs:** Internal ranges (127.0.0.1, 10.0.0.0/8, etc.)
- **Timeout:** 10 seconds (configurable)
- **Max response size:** 5MB
- **Retries:** Up to 3 with exponential backoff

---

## Task Detection Patterns

The system automatically detects task types using these patterns:

| Pattern | Task Type | Example |
|---------|-----------|---------|
| `file://create` | file_operation | `file://create /tmp/file.txt` |
| `file://read` | file_operation | `file://read /tmp/file.txt` |
| `file://write` | file_operation | `file://write /tmp/file.txt` |
| `file://delete` | file_operation | `file://delete /tmp/file.txt` |
| `cmd://` | command | `cmd://npm test` |
| `api://GET` | api_call | `api://GET https://api.example.com` |
| `api://POST` | api_call | `api://POST https://api.example.com` |
| `https://` | rss_feed | `https://example.com/feed.xml` |

**Explicit override:** Always use `metadata.task_type` to explicitly specify the task type and avoid ambiguity.

---

## Advanced Usage

### Custom Timeouts
```javascript
{
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "npm",
      "args": ["run", "build"],
      "timeout": 300000  // 5 minutes
    }
  }
}
```

### Custom Priority
Higher priority tasks are processed first (default: 5):

```javascript
{
  "title": "Critical Task",
  "content": "file://create /tmp/urgent.txt",
  "metadata": {
    "priority": 10  // High priority
  }
}
```

### Environment Variables (Commands)
```javascript
{
  "metadata": {
    "task_type": "command",
    "params": {
      "command": "node",
      "args": ["script.js"],
      "env": {
        "NODE_ENV": "production",
        "API_KEY": "secret"
      }
    }
  }
}
```

---

## Monitoring

### Queue Statistics
```javascript
GET /api/v1/work-queue/stats

Response:
{
  "pending_count": 12,
  "processing_count": 3,
  "completed_count": 1543,
  "failed_count": 27,
  "avg_processing_time_seconds": 1.25
}
```

### Worker Health
```javascript
GET /api/v1/avi/status

Response:
{
  "running": true,
  "activeWorkers": 3,
  "maxWorkers": 5,
  "contextSize": 15000,
  "ticketsProcessed": 1543,
  "workersSpawned": 1598
}
```

---

## Best Practices

### 1. Use Explicit Task Types
Always specify `metadata.task_type` to avoid ambiguity:

```javascript
// Good
{
  "content": "file://create /tmp/file.txt",
  "metadata": {
    "task_type": "file_operation",
    "params": { ... }
  }
}

// Risky (relies on pattern matching)
{
  "content": "file://create /tmp/file.txt"
}
```

### 2. Handle Large Files Carefully
For files > 1MB, consider:
- Chunked processing
- Streaming APIs
- External storage (S3, etc.)

### 3. Set Appropriate Timeouts
```javascript
// Short tasks
{ "timeout": 5000 }  // 5 seconds

// Long builds
{ "timeout": 300000 }  // 5 minutes
```

### 4. Use Priority Wisely
Reserve high priorities (8-10) for critical tasks:
- System health checks
- Security alerts
- User-facing operations

### 5. Log Task Results
Store important results in your application database, not just the work queue:

```javascript
const ticket = await createPost({ ... });
const ticketId = ticket.id;

// Poll for completion
const result = await pollTicketStatus(ticketId);
if (result.status === 'completed') {
  await saveToDatabase(result.result);
}
```

---

## Troubleshooting

### Task Stuck in "Pending"
**Cause:** No available workers or orchestrator not running

**Solution:**
```bash
# Check orchestrator status
curl http://localhost:3001/api/v1/avi/status

# Restart orchestrator if needed
curl -X POST http://localhost:3001/api/v1/avi/start
```

### Task Failed with "Path not allowed"
**Cause:** File path outside whitelist

**Solution:**
Only use allowed directories:
- `/tmp`
- `/workspaces/agent-feed/api-server/data`

### Command Failed with "Command not allowed"
**Cause:** Command not in whitelist

**Solution:**
Use only allowed commands:
- `ls`, `cat`, `npm`, `node`, `git`, `echo`

For other commands, request whitelist addition from the architecture team.

### API Call Failed with "SSRF detected"
**Cause:** Attempting to access internal IP

**Solution:**
Only call external, public APIs. Internal network access is blocked for security.

---

## Examples Repository

Full working examples: `/workspaces/agent-feed/api-server/examples/dual-mode-worker/`

---

## Support

- **Documentation:** `DUAL_MODE_WORKER_ARCHITECTURE.md`
- **Diagrams:** `DUAL_MODE_WORKER_DIAGRAM.txt`
- **Issues:** GitHub Issues or internal ticketing system
- **Security concerns:** security@example.com

---

## Migration from Legacy Workers

If you were using the old `AgentWorker` class:

### Before (Legacy)
```javascript
const worker = new AgentWorker({ ticketId });
await worker.execute();
```

### After (Unified)
```javascript
const worker = new UnifiedAgentWorker({ workerId, ticketId, agentId });
await worker.execute();
// Task type detection and routing happens automatically
```

**No changes needed** for RSS feed processing - it works exactly the same way!

---

## Quick Reference Table

| Operation | Endpoint | Task Type | Security |
|-----------|----------|-----------|----------|
| Create File | POST /api/v1/agent-posts | `file_operation` | Whitelist paths |
| Run Command | POST /api/v1/agent-posts | `command` | Whitelist commands |
| Call API | POST /api/v1/agent-posts | `api_call` | SSRF protection |
| Process Feed | POST /api/v1/agent-posts | `rss_feed` | URL validation |
| Check Status | GET /api/v1/work-queue/tickets | N/A | User isolation |
| View Stats | GET /api/v1/work-queue/stats | N/A | Aggregated data |

---

**Last Updated:** 2025-10-13
**Version:** 1.0
