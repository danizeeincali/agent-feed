# Dual-Mode Worker Architecture - Key Decisions

## Executive Summary

This document answers the key design questions for the dual-mode worker architecture and provides justification for each decision.

---

## Decision 1: TaskExecutor Class vs. Modified AgentWorker

**Question:** Should we create a new TaskExecutor class or modify the existing AgentWorker?

**Decision:** Create a new `UnifiedAgentWorker` class that replaces `AgentWorker`.

**Rationale:**
1. **Clean separation:** New class keeps legacy code untouched during transition
2. **Parallel deployment:** Can run both old and new workers during migration
3. **Better architecture:** Unified worker with pluggable executors is more maintainable
4. **Backward compatibility:** Old AgentWorker remains as fallback during testing
5. **Clear migration path:** Orchestrator only needs to swap class instantiation

**Trade-offs:**
- **Pro:** Safer migration, easier rollback
- **Con:** Temporary code duplication
- **Con:** Both classes need maintenance during transition period

**Implementation:**
```javascript
// Orchestrator change (single line)
// Before: const worker = new AgentWorker({ ... });
// After:  const worker = new UnifiedAgentWorker({ ... });
```

**Deprecation Plan:**
- Week 1-2: Implement UnifiedAgentWorker
- Week 3: Deploy alongside AgentWorker
- Week 4: Monitor and validate
- Week 5+: Remove AgentWorker

---

## Decision 2: Task Type Detection Strategy

**Question:** How should we determine task type from post_content?

**Decision:** Two-tier detection system:
1. **Explicit metadata** (priority 1): `metadata.task_type`
2. **Pattern matching** (priority 2): URI-style prefixes in content

**Rationale:**
1. **Flexibility:** Supports both structured (API) and human-friendly (CLI) input
2. **Clarity:** Explicit metadata removes ambiguity
3. **User-friendly:** Pattern matching provides intuitive syntax
4. **Backward compatible:** RSS feeds work without changes (default behavior)
5. **Extensible:** New patterns can be added without breaking existing code

**Pattern Design:**
```
file://operation path      → file_operation
cmd://command args         → command
api://METHOD url           → api_call
https://feed.xml           → rss_feed (default)
```

**Detection Order:**
1. Check `metadata.task_type` (explicit)
2. Match against patterns (implicit)
3. Default to `rss_feed` (legacy)

**Example:**
```javascript
// Explicit (preferred)
{
  "content": "Create configuration file",
  "metadata": {
    "task_type": "file_operation",
    "params": { "operation": "create", "path": "/tmp/config.json" }
  }
}

// Pattern matching (user-friendly)
{
  "content": "file://create /tmp/config.json"
}
```

**Trade-offs:**
- **Pro:** Intuitive for both developers and users
- **Pro:** Easy to extend with new task types
- **Con:** Pattern matching adds complexity
- **Con:** Possible ambiguity if patterns overlap (mitigated by priority order)

---

## Decision 3: Task Result Storage

**Question:** Where should we store task execution results?

**Decision:** Store results in `work_queue.result` column (JSONB type) with standardized structure.

**Rationale:**
1. **Centralized:** Single source of truth for task outcomes
2. **Queryable:** PostgreSQL JSONB supports efficient querying
3. **Flexible:** Accommodates different result types without schema changes
4. **Existing infrastructure:** Leverages current work_queue table
5. **Audit trail:** Maintains complete history of task execution

**Result Schema:**
```json
{
  "task_type": "file_operation",
  "success": true,
  "operation": "create",
  "path": "/tmp/output.txt",
  "bytes_written": 45,
  "execution_time_ms": 23,
  "worker_id": "worker-123",
  "timestamp": "2025-10-13T12:34:56Z"
}
```

**Size Considerations:**
- **Max size:** 10MB per result (JSONB limit)
- **Large outputs:** Store reference/summary in result, full data in external storage
- **File contents:** Store metadata only, not file contents

**Alternative Considered:** Separate `task_results` table
- **Rejected:** Adds complexity without significant benefit
- **When to reconsider:** If results exceed 10MB regularly

**Trade-offs:**
- **Pro:** Simple, leverages existing infrastructure
- **Pro:** JSONB indexing for fast queries
- **Con:** Size limits (10MB) - acceptable for most use cases
- **Con:** Denormalized (but intentional for performance)

---

## Decision 4: File System Permissions

**Question:** How should we handle file system permissions and access control?

**Decision:** Whitelist-based path validation with strict directory restrictions.

**Security Model:**

```javascript
// Allowed directories
const ALLOWED_DIRS = [
  '/tmp',
  '/workspaces/agent-feed/api-server/data',
  '/workspaces/agent-feed/api-server/worker/output'
];

// Validation logic
function validatePath(filePath) {
  const normalized = path.normalize(filePath);

  // Block directory traversal
  if (normalized.includes('..')) {
    throw new SecurityError('Directory traversal detected');
  }

  // Whitelist check
  const isAllowed = ALLOWED_DIRS.some(dir =>
    normalized.startsWith(dir)
  );

  if (!isAllowed) {
    throw new SecurityError('Path not in whitelist');
  }

  return normalized;
}
```

**Rationale:**
1. **Security first:** Whitelist prevents unauthorized access
2. **Principle of least privilege:** Only necessary directories are accessible
3. **Defense in depth:** Multiple validation layers
4. **Audit-friendly:** Clear rules for security review
5. **Industry standard:** Common practice in sandboxed environments

**Access Modes:**
- `/tmp`: Read/Write (ephemeral storage)
- `/data`: Read/Write (persistent storage)
- `/worker/output`: Write-only (task outputs)
- All other paths: Denied

**Trade-offs:**
- **Pro:** Strong security posture
- **Pro:** Easy to audit and maintain
- **Con:** Restrictive (may block legitimate use cases)
- **Mitigation:** Provide process for requesting whitelist additions

**Future Enhancement:**
- Per-user directory isolation: `/data/user_{userId}`
- Quota enforcement: Limit storage per user
- Temporary credentials: Time-limited access tokens

---

## Decision 5: Security - Prevent Directory Traversal

**Question:** How do we validate file paths and prevent directory traversal attacks?

**Decision:** Multi-layer validation approach:
1. Path normalization
2. Directory traversal pattern detection
3. Whitelist verification
4. Symlink resolution blocking

**Implementation:**

```javascript
class FileOperationExecutor {
  validatePath(filePath) {
    // Layer 1: Normalize path
    const normalized = path.normalize(filePath);

    // Layer 2: Block traversal patterns
    if (normalized.includes('..')) {
      throw new SecurityError('Directory traversal detected');
    }

    if (normalized.includes('/../')) {
      throw new SecurityError('Directory traversal detected');
    }

    // Layer 3: Resolve absolute path
    const absolute = path.resolve(normalized);

    // Layer 4: Whitelist check
    const isAllowed = this.allowedDirs.some(dir =>
      absolute.startsWith(path.resolve(dir))
    );

    if (!isAllowed) {
      throw new SecurityError(`Path not allowed: ${filePath}`);
    }

    // Layer 5: Block symlinks (optional)
    if (options.followSymlinks === false) {
      const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
      if (stats?.isSymbolicLink()) {
        throw new SecurityError('Symlinks not allowed');
      }
    }

    return absolute;
  }
}
```

**Attack Scenarios Blocked:**
```
../../../etc/passwd          → Blocked (traversal pattern)
/tmp/../etc/passwd           → Blocked (traversal pattern)
/tmp/../../etc/passwd        → Blocked (traversal pattern)
/etc/passwd                  → Blocked (not in whitelist)
/tmp/link-to-etc             → Blocked (symlink detection)
/tmp/file.txt                → Allowed ✓
```

**Rationale:**
1. **Defense in depth:** Multiple validation layers
2. **Zero trust:** Validate everything, trust nothing
3. **Fail secure:** Default to deny
4. **Clear error messages:** Help developers debug without exposing internals

**Testing Requirements:**
- Unit tests for all traversal patterns
- Penetration testing with OWASP guidelines
- Fuzzing with malformed paths
- Security audit before production

**Trade-offs:**
- **Pro:** Comprehensive protection
- **Pro:** Industry best practices
- **Con:** Performance overhead (minimal - ~1ms per validation)
- **Con:** Complexity (mitigated by centralized validation)

---

## Decision 6: Command Execution Security

**Decision:** Whitelist-based command validation with pattern blocking.

**Allowed Commands:**
```javascript
const ALLOWED_COMMANDS = [
  'ls', 'cat', 'npm', 'node', 'git', 'echo'
];
```

**Blocked Patterns:**
```javascript
const BLOCKED_PATTERNS = [
  /rm\s+-rf/i,
  /dd\s+if=/i,
  /mkfs/i,
  /shutdown/i,
  /reboot/i,
  />\s*\/dev\//i
];
```

**Execution Security:**
```javascript
spawn(command, args, {
  shell: false,          // CRITICAL: No shell interpretation
  timeout: 30000,        // 30 second timeout
  cwd: safeCwd,          // Restricted working directory
  env: cleanEnv          // Sanitized environment
});
```

**Rationale:**
1. **Whitelist > Blacklist:** Only known-safe commands allowed
2. **No shell:** Prevents injection attacks (`cmd; rm -rf /`)
3. **Timeout:** Prevents resource exhaustion
4. **Pattern blocking:** Defense in depth against dangerous operations

**Why no shell?**
```bash
# WITH shell=true (DANGEROUS)
spawn('ls; rm -rf /', { shell: true })  // Executes both!

# WITH shell=false (SAFE)
spawn('ls', ['; rm -rf /'], { shell: false })  // Treats as argument, not command
```

---

## Decision 7: API Request Security (SSRF Prevention)

**Decision:** Block internal IP ranges and enforce strict URL validation.

**Implementation:**
```javascript
class APIExecutor {
  validateUrl(url) {
    const parsed = new URL(url);

    // Block internal IPs
    const blockedRanges = [
      /^127\./,                 // localhost
      /^10\./,                  // Private class A
      /^172\.(1[6-9]|2\d|3[01])\./, // Private class B
      /^192\.168\./,            // Private class C
      /^169\.254\./,            // Link-local
      /^::1$/,                  // IPv6 localhost
      /^fe80:/,                 // IPv6 link-local
    ];

    // Resolve hostname to IP
    const ip = await dns.resolve(parsed.hostname);

    // Check against blocked ranges
    for (const range of blockedRanges) {
      if (range.test(ip)) {
        throw new SecurityError('SSRF detected: Internal IP blocked');
      }
    }

    return url;
  }
}
```

**What is SSRF?**
Server-Side Request Forgery: Attacker tricks server into making requests to internal resources.

**Attack Example:**
```javascript
// Attacker tries to access internal service
api://GET http://localhost:6379/  // Redis (blocked!)
api://GET http://169.254.169.254/latest/meta-data  // AWS metadata (blocked!)
```

**Additional Protections:**
- Response size limit: 5MB
- Timeout: 10 seconds
- Redirect following: Limited to 3 hops
- User-Agent: Clearly identifies bot traffic

**Rationale:**
1. **OWASP Top 10:** SSRF is a critical vulnerability
2. **Cloud metadata:** Protects AWS/GCP/Azure metadata endpoints
3. **Internal services:** Prevents access to databases, caches, etc.
4. **Defense in depth:** Multiple validation layers

---

## Decision 8: Error Handling and Retry Strategy

**Decision:** Classify errors and retry only transient failures.

**Error Classification:**

| Error Type | Retryable | Max Retries | Example |
|------------|-----------|-------------|---------|
| Validation | No | 0 | Invalid parameters |
| Security | No | 0 | Path not allowed |
| Permission | No | 0 | Access denied |
| Network | Yes | 3 | Connection timeout |
| Temporary | Yes | 3 | File locked |
| Rate Limit | Yes | 3 | API rate limit |

**Retry Logic:**
```javascript
async failTicket(ticketId, error, shouldRetry) {
  // Increment retry count
  const ticket = await this.incrementRetryCount(ticketId);

  // Check if retryable
  if (shouldRetry && ticket.retry_count < 3) {
    // Exponential backoff
    const delay = Math.pow(2, ticket.retry_count) * 1000;
    await this.scheduleRetry(ticketId, delay);
  } else {
    // Permanent failure
    await this.markFailed(ticketId, error);
  }
}
```

**Rationale:**
1. **Transient failures:** Network issues often resolve automatically
2. **Exponential backoff:** Prevents thundering herd
3. **Limit retries:** Prevents infinite loops
4. **Clear classification:** Developers know what to expect

**Trade-offs:**
- **Pro:** Improves reliability for transient failures
- **Pro:** Reduces manual intervention
- **Con:** Delayed failure notification (up to 3 retries)
- **Mitigation:** Provide retry status in ticket metadata

---

## Decision 9: Resource Limits

**Decision:** Enforce per-task resource limits to prevent abuse.

**Limits:**

| Resource | Limit | Rationale |
|----------|-------|-----------|
| File size | 10MB | Reasonable for configs, logs |
| Command timeout | 30s | Prevents hung processes |
| API timeout | 10s | Prevents slow APIs blocking workers |
| API response | 5MB | Prevents memory exhaustion |
| Memory per worker | 512MB | Future: cgroup limits |

**Implementation:**
```javascript
// File size check
if (stats.size > this.maxFileSize) {
  throw new Error(`File too large: ${stats.size} > ${this.maxFileSize}`);
}

// Command timeout
const proc = spawn(command, args, { timeout: 30000 });

// API response size
const response = await axios(url, {
  maxContentLength: 5 * 1024 * 1024  // 5MB
});
```

**Rationale:**
1. **DoS prevention:** Prevents resource exhaustion attacks
2. **Fair sharing:** Ensures all users get service
3. **System stability:** Prevents OOM kills
4. **Cost control:** Limits compute costs

**Future Enhancements:**
- Per-user quotas
- Burst allowance
- Priority-based resource allocation

---

## Decision 10: Monitoring and Observability

**Decision:** Comprehensive metrics collection at all layers.

**Metrics to Collect:**

1. **Queue Metrics:**
   - Pending count
   - Processing count
   - Completed today
   - Failed today
   - Average processing time

2. **Worker Metrics:**
   - Active workers
   - Tasks executed (by type)
   - Success rate
   - Average execution time

3. **Task Type Metrics:**
   - Distribution (pie chart)
   - Success rate per type
   - Average time per type

4. **Error Metrics:**
   - Error rate
   - Errors by type
   - Top error messages

**Implementation:**
```javascript
// Prometheus-style metrics
const metrics = {
  tasks_total: new Counter('tasks_total', ['task_type', 'status']),
  task_duration: new Histogram('task_duration_seconds', ['task_type']),
  active_workers: new Gauge('active_workers'),
  queue_depth: new Gauge('queue_depth', ['status'])
};

// Record metrics
metrics.tasks_total.inc({ task_type: 'file_operation', status: 'completed' });
metrics.task_duration.observe({ task_type: 'file_operation' }, 0.023);
```

**Alerting Rules:**
- Error rate > 10%: Warning
- Error rate > 25%: Critical
- Queue depth > 100: Warning
- No completed tasks in 5 min: Critical
- Worker crash: Critical

**Rationale:**
1. **Visibility:** Know what's happening in production
2. **Debugging:** Trace issues to root cause
3. **Capacity planning:** Understand usage patterns
4. **SLA compliance:** Measure service quality

---

## Summary Table

| Decision | Choice | Key Reason |
|----------|--------|------------|
| Worker Architecture | Unified worker + executors | Maintainability, extensibility |
| Task Detection | Metadata + patterns | Flexibility, backward compatible |
| Result Storage | JSONB in work_queue | Queryable, flexible, centralized |
| File Permissions | Whitelist directories | Security, principle of least privilege |
| Path Validation | Multi-layer validation | Defense in depth |
| Command Security | Whitelist + no shell | Prevent injection attacks |
| API Security | SSRF prevention | Protect internal services |
| Error Handling | Classify and retry | Improve reliability |
| Resource Limits | Per-task limits | Prevent abuse, ensure fairness |
| Monitoring | Multi-layer metrics | Visibility, debugging |

---

## Implementation Priority

### Phase 1: Core Security (Week 1)
1. Path validation
2. Command whitelisting
3. SSRF prevention
4. Error classification

### Phase 2: Executors (Week 2)
1. FileOperationExecutor
2. CommandExecutor
3. APIExecutor
4. RssFeedExecutor (wrapper)

### Phase 3: Integration (Week 3)
1. UnifiedAgentWorker
2. TaskTypeDetector
3. Orchestrator integration
4. Testing

### Phase 4: Monitoring (Week 4)
1. Metrics collection
2. Alerting rules
3. Dashboard
4. Documentation

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Security bypass | Critical | Low | Multi-layer validation, security audit |
| Performance degradation | High | Medium | Resource limits, monitoring |
| Data loss | High | Low | Transaction safety, backups |
| Migration issues | Medium | Medium | Parallel deployment, rollback plan |

---

## Conclusion

These decisions prioritize:
1. **Security:** Multi-layer validation, whitelist approach
2. **Maintainability:** Clean architecture, pluggable executors
3. **Reliability:** Error handling, retries, resource limits
4. **Observability:** Comprehensive metrics, alerting

The architecture is designed to be:
- **Secure by default**
- **Easy to extend**
- **Production-ready**
- **Well-monitored**

---

**Document Owner:** System Architecture Team
**Last Updated:** 2025-10-13
**Version:** 1.0
**Status:** Approved for Implementation
