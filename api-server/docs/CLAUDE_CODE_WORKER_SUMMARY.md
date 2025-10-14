# Claude Code Worker Integration - Executive Summary

**Date**: 2025-10-14
**Status**: Design Complete - Ready for Implementation
**Estimated Effort**: 3-5 days implementation + 2 weeks gradual rollout

---

## What Is This?

A new worker implementation (`ClaudeCodeWorker`) that replaces the current regex-based `UnifiedAgentWorker` with direct Claude Code SDK integration. Instead of parsing natural language with brittle regex patterns, we delegate everything to Claude's native intelligence and tool-use capabilities.

---

## Why Do We Need This?

### Current Problems
1. **Brittle regex parsing** - Pattern matching breaks on slight variations
2. **Limited intelligence** - Can't understand complex requests
3. **Manual tool routing** - We have to code every operation type
4. **Hard to extend** - Adding new capabilities requires new regex patterns

### Solution Benefits
1. **No regex** - Claude interprets natural language natively
2. **Native tool access** - Claude can Read, Write, Edit, Bash, Grep, Glob
3. **Better reasoning** - Claude figures out what tools to use
4. **Easy to extend** - Just add new tools to allowedTools list

---

## How It Works

```
User: "create file test.txt with content 'Hello World'"
  ↓
Work Queue → Orchestrator → WorkerSpawner → ClaudeCodeWorker
  ↓
ClaudeCodeWorker prepares prompt:
  "User wants to: create file test.txt
   Workspace: /workspaces/agent-feed/prod/agent_workspace/
   Use Write tool to create the file"
  ↓
HTTP POST to /api/claude-code/streaming-chat
  ↓
ClaudeCodeSDKManager → @anthropic-ai/claude-code SDK
  ↓
Claude interprets request → Uses Write tool → Creates file
  ↓
Response: "Created file test.txt successfully"
  ↓
WorkerResult: { success: true, output: "Created file...", tokensUsed: 150, duration: 2500 }
```

---

## Architecture at a Glance

### Components Modified
- **WorkerSpawnerAdapter** - Line 157: Change `new UnifiedAgentWorker(db)` → `new ClaudeCodeWorker(db)`

### Components Added
- **ClaudeCodeWorker** - New worker class at `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

### Components Unchanged
- AVI Orchestrator
- Claude Code API Route
- ClaudeCodeSDKManager
- TokenAnalyticsWriter
- Work Queue Repository
- Database schema

---

## Key Interfaces

### WorkTicket (unchanged)
```typescript
{
  id: string;
  type: WorkTicketType;
  priority: number;
  agentName: string;
  userId: string;
  payload: { content: string, metadata: {} };
  createdAt: Date;
  status: WorkTicketStatus;
}
```

### WorkerResult (unchanged)
```typescript
{
  success: boolean;
  output?: any;
  error?: Error;
  tokensUsed: number;
  duration: number;
}
```

### ClaudeCodeWorker (new)
```typescript
class ClaudeCodeWorker {
  constructor(db: DatabaseManager, options?: ClaudeCodeWorkerOptions);
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult>;
}
```

---

## Security Model

```
ALLOWED:
  ✓ /workspaces/agent-feed/prod/agent_workspace/*
  ✓ Read, Write, Edit, Bash (within workspace)
  ✓ Grep, Glob, WebFetch, WebSearch

BLOCKED:
  ✗ /etc/, /home/, /root/, parent directories (..)
  ✗ System commands (sudo, rm -rf /, etc.)
  ✗ Operations outside workspace
```

Workspace boundaries enforced by:
1. Claude Code SDK's `cwd` configuration
2. `permissionMode: "bypassPermissions"` (automation-safe)
3. Tool restrictions via `allowedTools` whitelist
4. Security violation logging

---

## Performance Expectations

| Metric | Target | Expected (ClaudeCodeWorker) |
|--------|--------|----------------------------|
| Avg latency | < 3s | 2.5-3.5s |
| P95 latency | < 5s | 5-7s |
| Success rate | > 95% | > 90% |
| Token usage | 500-2000 | 1500-2500 |
| Throughput | > 100 req/min | 80-100 req/min |

Tradeoffs:
- **Slower**: +1-2s latency vs UnifiedAgentWorker
- **More tokens**: ~3x token usage (smarter but more expensive)
- **Better results**: Higher quality task interpretation

---

## Implementation Plan

### Phase 1: Development (Week 1-2)
- Create `ClaudeCodeWorker` class
- Add comprehensive tests
- Integration testing with API
- Documentation

### Phase 2: Staging (Week 3)
- Deploy to staging
- Feature flag: `USE_CLAUDE_CODE_WORKER=false` (start disabled)
- Parallel testing
- Performance benchmarking

### Phase 3: Canary (Week 4)
- Deploy to production with 5% traffic
- Monitor for 48 hours
- Rollback plan ready

### Phase 4: Rollout (Week 5-6)
- 25% traffic (monitor 48h)
- 50% traffic (monitor 48h)
- 75% traffic (monitor 48h)
- 100% traffic

### Phase 5: Cleanup (Week 7)
- Remove feature flag
- Remove `UnifiedAgentWorker` (deprecated)
- Update docs
- Post-mortem

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Increased latency | High | Medium | Set 120s timeout, monitor P95 |
| Higher token costs | High | Medium | Track costs, set budgets |
| API downtime | Low | High | Retry logic, circuit breaker |
| Workspace violations | Low | Critical | Security monitoring, alerts |
| Regression bugs | Medium | High | Feature flag, gradual rollout |

**Overall Risk**: Medium - Controlled rollout with feature flag reduces risk

---

## Configuration

### Required Environment Variables
```bash
API_BASE_URL=http://localhost:3000
```

### Optional (has defaults)
```bash
USE_CLAUDE_CODE_WORKER=true        # Feature flag
WORKER_TIMEOUT=120000              # 2 minutes
WORKSPACE_ROOT=/workspaces/agent-feed/prod/agent_workspace
CLAUDE_MODEL=claude-sonnet-4-20250514
MAX_CONCURRENT_WORKERS=10
```

---

## Monitoring

### Key Metrics to Track
- `worker.latency.avg` - Average execution time
- `worker.success_rate` - Percentage successful
- `worker.tokens.avg` - Average tokens per execution
- `worker.cost.total` - Total cost
- `worker.errors.api` - API-related errors
- `worker.security.violations` - Security violations

### Alerts
- Latency > 10s
- Success rate < 90%
- Error rate > 10%
- Security violation detected

---

## Testing Strategy

### Unit Tests
- Prompt preparation
- Response parsing
- Token extraction
- Error handling
- Timeout handling

### Integration Tests
- File creation via SDK
- File reading via SDK
- File editing via SDK
- Bash execution via SDK
- Workspace violations

### Performance Tests
- 10 concurrent workers
- Latency under load
- Token usage patterns

### Security Tests
- Path traversal attempts
- Workspace boundary violations
- Tool restriction enforcement

---

## Migration Path

### Drop-in Replacement
```typescript
// OLD
const worker = new UnifiedAgentWorker(db);
const result = await worker.executeTicket(ticket);

// NEW
const worker = new ClaudeCodeWorker(db);
const result = await worker.executeTicket(ticket);

// Result format is identical - no changes needed downstream
```

### With Feature Flag
```typescript
function createWorker(db: DatabaseManager): IWorker {
  if (process.env.USE_CLAUDE_CODE_WORKER === 'true') {
    return new ClaudeCodeWorker(db);
  } else {
    return new UnifiedAgentWorker(db);  // fallback
  }
}
```

### Gradual Rollout
```typescript
// Control percentage of traffic
const percentage = parseInt(process.env.ROLLOUT_PERCENTAGE || '0');
const useNew = (parseInt(ticket.id) % 100) < percentage;

const worker = useNew
  ? new ClaudeCodeWorker(db)
  : new UnifiedAgentWorker(db);
```

---

## Files Changed

### New Files
```
src/worker/claude-code-worker.ts                    [NEW]
tests/worker/claude-code-worker.test.ts             [NEW]
tests/worker/claude-code-worker.integration.test.ts [NEW]
```

### Modified Files
```
src/adapters/worker-spawner.adapter.ts              [MODIFIED - 2 lines]
  - Line 12: Import ClaudeCodeWorker
  - Line 157: Instantiate ClaudeCodeWorker
```

### Deprecated Files
```
src/worker/unified-agent-worker.ts                  [DEPRECATED]
src/worker/task-type-detector.ts                   [DEPRECATED]
src/worker/file-operation-executor.ts              [DEPRECATED]
```

---

## Documentation Created

1. **ARCHITECTURE_CLAUDE_CODE_WORKER.md** (60KB)
   - Full system architecture
   - Component diagrams
   - API integration patterns
   - Error handling flows
   - Security model
   - Performance analysis

2. **CLAUDE_CODE_WORKER_QUICK_REFERENCE.md** (18KB)
   - Quick reference diagrams
   - Data flow charts
   - Configuration reference
   - Common patterns

3. **CLAUDE_CODE_WORKER_IMPLEMENTATION_GUIDE.md** (24KB)
   - Step-by-step implementation
   - Complete code examples
   - Testing strategy
   - Deployment guide

4. **CLAUDE_CODE_WORKER_SUMMARY.md** (this file)
   - Executive summary
   - High-level overview
   - Quick decision reference

---

## Decision Points

### Should we proceed with this implementation?

**Pros:**
- Eliminates brittle regex parsing
- Leverages Claude's native intelligence
- Easier to extend with new capabilities
- Better task interpretation quality
- Clean architecture with feature flag safety

**Cons:**
- Increased latency (+1-2s average)
- Higher token costs (~3x)
- External API dependency
- Requires gradual rollout

**Recommendation**: ✅ **YES - Proceed with implementation**

Rationale:
- Quality improvement outweighs latency cost
- Feature flag enables safe rollback
- Gradual rollout minimizes risk
- Long-term maintainability gains

---

## Next Steps

1. **Approve Architecture** - Review this document with team
2. **Create Implementation Ticket** - Assign to developer
3. **Set Up Environment** - Configure staging environment
4. **Implement ClaudeCodeWorker** - Follow implementation guide
5. **Write Tests** - Unit + integration tests
6. **Deploy to Staging** - Test with real workloads
7. **Canary Deployment** - Start with 5% production traffic
8. **Gradual Rollout** - Increase to 100% over 2 weeks
9. **Monitor & Optimize** - Track metrics, adjust as needed
10. **Cleanup** - Remove deprecated code

---

## Questions & Answers

**Q: What happens if the Claude API is down?**
A: Tickets fail with API error, marked as retryable, can be reprocessed when API is back up. Consider implementing circuit breaker for automatic fallback.

**Q: How do we control costs?**
A: Monitor token usage via TokenAnalyticsWriter, set budget alerts, optimize prompts, consider caching for similar requests.

**Q: Can we rollback if something goes wrong?**
A: Yes, set `USE_CLAUDE_CODE_WORKER=false` or reduce `ROLLOUT_PERCENTAGE` to 0. Feature flag enables instant rollback.

**Q: How do we test this before production?**
A: Unit tests, integration tests, staging environment testing, canary deployment with 5% traffic before full rollout.

**Q: What if timeout threshold isn't enough?**
A: Increase `WORKER_TIMEOUT` environment variable. Default is 120s (2 minutes), can be increased to 180s or more.

**Q: How do we prevent workspace violations?**
A: Claude Code SDK enforces `cwd` restrictions, we log all violations, security monitoring alerts on violations.

---

## Success Criteria

This implementation will be considered successful if:

1. **Functional**: Successfully processes all ticket types that UnifiedAgentWorker handled
2. **Quality**: > 90% success rate on task interpretation
3. **Performance**: P95 latency < 10s, no timeouts on normal workloads
4. **Stability**: < 5% error rate, no critical production incidents
5. **Security**: Zero workspace violations, all security tests pass
6. **Cost**: Token costs within projected 3x range, ROI positive
7. **Adoption**: 100% rollout achieved within 2 weeks of canary start

---

## Contacts & Resources

**Documentation:**
- Architecture: `ARCHITECTURE_CLAUDE_CODE_WORKER.md`
- Implementation: `CLAUDE_CODE_WORKER_IMPLEMENTATION_GUIDE.md`
- Quick Reference: `CLAUDE_CODE_WORKER_QUICK_REFERENCE.md`

**Code Locations:**
- Worker: `/workspaces/agent-feed/src/worker/claude-code-worker.ts`
- Spawner: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`
- API: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
- SDK Manager: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`

**Related Systems:**
- Claude Code SDK: `@anthropic-ai/claude-code` package
- Work Queue: PostgreSQL `work_queue` table
- Token Analytics: `TokenAnalyticsWriter` service
- SSE Broadcasting: `broadcastToolActivity()` function

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
**Status**: Ready for Team Review and Implementation
