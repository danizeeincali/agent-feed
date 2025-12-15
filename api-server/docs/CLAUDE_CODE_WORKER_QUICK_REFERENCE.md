# Claude Code Worker - Quick Reference Guide

**Quick Reference**: Key architecture diagrams and implementation patterns

---

## Architecture at a Glance

```
User Request → Work Queue → Orchestrator → WorkerSpawner → ClaudeCodeWorker
                                                                    ↓
                                                           HTTP POST to API
                                                                    ↓
                                                          ClaudeCodeSDKManager
                                                                    ↓
                                                      @anthropic-ai/claude-code
                                                                    ↓
                                                            File System Tools
```

---

## Component Responsibility Matrix

| Component | Responsibility | Unchanged/Modified/New |
|-----------|---------------|----------------------|
| AVI Orchestrator | Poll queue, spawn workers | Unchanged |
| WorkerSpawnerAdapter | Manage worker lifecycle | Modified (swap worker class) |
| ClaudeCodeWorker | Execute tickets via Claude SDK | **NEW** |
| UnifiedAgentWorker | Legacy regex-based worker | Deprecated |
| Claude Code API Route | HTTP endpoint for SDK | Unchanged |
| ClaudeCodeSDKManager | SDK wrapper singleton | Unchanged |
| TokenAnalyticsWriter | Track token usage | Unchanged |

---

## Data Flow: Ticket to Completion

```
┌────────────────────────────────────────────────────────────────┐
│ 1. TICKET CREATION                                             │
│    Work Queue: INSERT ticket (status=pending)                  │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 2. ORCHESTRATOR POLL                                           │
│    SELECT * FROM work_queue WHERE status='pending'             │
│    LIMIT 10                                                    │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 3. WORKER SPAWN                                                │
│    workerSpawner.spawnWorker(ticket)                           │
│    UPDATE work_queue SET status='processing'                   │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 4. WORKER EXECUTION                                            │
│    worker = new ClaudeCodeWorker(db)                           │
│    result = await worker.executeTicket(ticket)                 │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 5. PROMPT PREPARATION                                          │
│    prompt = prepareClaudePrompt(ticket)                        │
│    "User wants to: create file test.txt"                       │
│    "Workspace: /workspaces/agent-feed/prod/agent_workspace"    │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 6. API CALL                                                    │
│    POST /api/claude-code/streaming-chat                        │
│    { message: prompt, options: { cwd, tools, ... } }           │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 7. SDK EXECUTION                                               │
│    ClaudeCodeSDKManager.createStreamingChat(message)           │
│    → query({ prompt, options })                                │
│    → Claude interprets request                                 │
│    → Claude uses Write tool                                    │
│    → File created in workspace                                 │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 8. RESPONSE EXTRACTION                                         │
│    response = { success: true, message: "Created file" }       │
│    tokensUsed = extractTokenUsage(response)                    │
│    result = { success, output, tokensUsed, duration }          │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ 9. STATUS UPDATE                                               │
│    UPDATE work_queue SET status='completed', result=...        │
│    WHERE id = ticket.id                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Decision Tree

```
executeTicket() throws error
       │
       ├─── Is timeout?
       │         │
       │         └─ YES → Return { success: false, error: "Timeout" }
       │                  Mark ticket as failed
       │                  retryable = false
       │
       ├─── Is API error (HTTP 5xx)?
       │         │
       │         └─ YES → Return { success: false, error: "API error" }
       │                  Mark ticket as failed
       │                  retryable = true (can retry)
       │
       ├─── Is API error (HTTP 4xx)?
       │         │
       │         └─ YES → Return { success: false, error: "Bad request" }
       │                  Mark ticket as failed
       │                  retryable = false
       │
       ├─── Is workspace violation?
       │         │
       │         └─ YES → Log security alert
       │                  Return { success: false, error: "Workspace violation" }
       │                  Mark ticket as failed
       │                  retryable = false
       │
       └─── Unknown error
                 │
                 └─ Log full stack trace
                    Return { success: false, error }
                    Mark ticket as failed
                    retryable = false
```

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY PERIMETER                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Allowed Workspace                                    │     │
│  │  /workspaces/agent-feed/prod/agent_workspace/         │     │
│  │                                                        │     │
│  │  ┌──────────────────────────────────────────┐         │     │
│  │  │  Claude Code SDK Operations              │         │     │
│  │  │                                           │         │     │
│  │  │  ✓ Read files within workspace           │         │     │
│  │  │  ✓ Write files within workspace          │         │     │
│  │  │  ✓ Edit files within workspace           │         │     │
│  │  │  ✓ Execute bash in workspace             │         │     │
│  │  │  ✓ Search files (Grep/Glob)              │         │     │
│  │  │                                           │         │     │
│  │  └──────────────────────────────────────────┘         │     │
│  │                                                        │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ❌ BLOCKED OPERATIONS:                                         │
│     - Access to /etc/, /home/, /root/                          │
│     - Access to parent directories (../)                       │
│     - System-level commands (sudo, rm -rf /, etc.)             │
│     - Network operations outside allowed APIs                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Contract

### Request Format

```json
{
  "message": "User wants to: create file test.txt with content 'Hello World'\nWorkspace: /workspaces/agent-feed/prod/agent_workspace/",
  "options": {
    "sessionId": "ticket_123_1728932045123",
    "cwd": "/workspaces/agent-feed/prod/agent_workspace",
    "model": "claude-sonnet-4-20250514",
    "allowedTools": ["Bash", "Read", "Write", "Edit", "Grep", "Glob"],
    "maxTurns": 10
  }
}
```

### Response Format

```json
{
  "success": true,
  "message": "Created file test.txt successfully with content 'Hello World'",
  "responses": [
    {
      "type": "assistant",
      "content": "Created file test.txt successfully",
      "messages": [
        { "type": "system", "cwd": "...", "model": "..." },
        { "type": "assistant", "message": { "content": [...] } },
        { "type": "result", "result": "...", "usage": { "input_tokens": 100, "output_tokens": 50 } }
      ]
    }
  ],
  "timestamp": "2025-10-14T12:34:56.789Z",
  "claudeCode": true,
  "toolsEnabled": true
}
```

### WorkerResult Format

```typescript
{
  success: true,
  output: "Created file test.txt successfully",
  tokensUsed: 150,
  duration: 2500 // milliseconds
}
```

---

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Create `src/worker/claude-code-worker.ts`
- [ ] Implement `executeTicket()` method
- [ ] Implement `prepareClaudePrompt()` method
- [ ] Implement `executeClaudeCode()` HTTP client
- [ ] Implement `extractResult()` response parser
- [ ] Implement timeout handling
- [ ] Implement error categorization

### Phase 2: Integration
- [ ] Update `WorkerSpawnerAdapter` to use `ClaudeCodeWorker`
- [ ] Add feature flag `USE_CLAUDE_CODE_WORKER`
- [ ] Test with existing work queue
- [ ] Verify token analytics integration
- [ ] Verify SSE broadcast integration

### Phase 3: Testing
- [ ] Unit tests for `ClaudeCodeWorker`
- [ ] Integration tests with real API
- [ ] Performance benchmarks
- [ ] Security tests (workspace violations)
- [ ] Error handling tests

### Phase 4: Deployment
- [ ] Deploy to staging
- [ ] Canary deployment (5% traffic)
- [ ] Gradual rollout (25% → 50% → 100%)
- [ ] Monitor metrics
- [ ] Remove deprecated `UnifiedAgentWorker`

---

## Key Configuration

```bash
# Feature flag
USE_CLAUDE_CODE_WORKER=true

# API configuration
API_BASE_URL=http://localhost:3000

# Worker configuration
WORKER_TIMEOUT=120000                    # 2 minutes
MAX_CONCURRENT_WORKERS=10

# Workspace
WORKSPACE_ROOT=/workspaces/agent-feed/prod/agent_workspace

# Claude settings
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TURNS=10

# Performance
ENABLE_RESPONSE_STREAMING=true
ENABLE_TOKEN_ANALYTICS=true

# Retry
MAX_RETRIES=3
RETRY_DELAY_MS=1000
```

---

## Monitoring Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Average latency | < 3s | > 5s |
| P95 latency | < 5s | > 10s |
| Success rate | > 95% | < 90% |
| Timeout rate | < 2% | > 5% |
| Token usage (avg) | 1500-2500 | > 4000 |
| Active workers | 5-10 | > 15 |
| Queue depth | < 50 | > 100 |
| Error rate | < 5% | > 10% |

---

## Common Patterns

### Pattern 1: Basic Worker Execution

```typescript
const worker = new ClaudeCodeWorker(db);
const result = await worker.executeTicket(ticket);

if (result.success) {
  console.log('Success:', result.output);
} else {
  console.error('Failed:', result.error);
}
```

### Pattern 2: With Timeout

```typescript
const worker = new ClaudeCodeWorker(db, { timeout: 60000 });
try {
  const result = await worker.executeTicket(ticket);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  }
}
```

### Pattern 3: With Custom Workspace

```typescript
const worker = new ClaudeCodeWorker(db, {
  workspaceRoot: '/custom/workspace/path'
});
```

### Pattern 4: Feature Flag Check

```typescript
function createWorker(db: DatabaseManager): IWorker {
  if (process.env.USE_CLAUDE_CODE_WORKER === 'true') {
    return new ClaudeCodeWorker(db);
  } else {
    return new UnifiedAgentWorker(db);
  }
}
```

---

## Troubleshooting Guide

### Issue: Worker timeouts frequently

**Solution**:
1. Increase `WORKER_TIMEOUT` setting
2. Check Claude API latency
3. Optimize prompt size
4. Review tool usage patterns

### Issue: High token usage

**Solution**:
1. Reduce prompt verbosity
2. Limit context in prompts
3. Use more specific instructions
4. Review Claude's tool usage patterns

### Issue: Workspace violations

**Solution**:
1. Check workspace path configuration
2. Review user request content
3. Ensure proper path sanitization
4. Check Claude's file path resolution

### Issue: API errors (5xx)

**Solution**:
1. Check API server health
2. Review API logs
3. Verify Claude SDK status
4. Enable retry logic

---

## File Locations

```
/workspaces/agent-feed/
├── src/worker/
│   └── claude-code-worker.ts              [NEW - Main implementation]
│
├── src/adapters/
│   └── worker-spawner.adapter.ts          [MODIFY - Line 157: swap worker class]
│
├── src/services/
│   ├── ClaudeCodeSDKManager.js            [EXISTING - No changes needed]
│   └── TokenAnalyticsWriter.js            [EXISTING - No changes needed]
│
├── src/api/routes/
│   └── claude-code-sdk.js                 [EXISTING - No changes needed]
│
└── api-server/docs/
    ├── ARCHITECTURE_CLAUDE_CODE_WORKER.md [THIS DOCUMENT]
    └── CLAUDE_CODE_WORKER_QUICK_REFERENCE.md [REFERENCE]
```

---

## Next Steps

1. **Review this architecture** with the team
2. **Create implementation ticket** for `ClaudeCodeWorker` class
3. **Set up feature flag** environment variable
4. **Write unit tests** as you implement
5. **Test in staging** before production deployment
6. **Monitor metrics** during gradual rollout
7. **Document lessons learned** for future reference

---

**Last Updated**: 2025-10-14
**Status**: Design Phase - Ready for Implementation
