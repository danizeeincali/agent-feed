# Claude Code SDK Integration - Executive Summary

**Document:** SPARC Specification for Claude Code Integration
**Version:** 1.0.0
**Date:** 2025-10-14
**Status:** Ready for Implementation

---

## Problem Statement

The current TaskTypeDetector/FileOperationExecutor system is fundamentally broken:

**Current Broken Behavior:**
```
User: "Create a file called test.txt with the text: Hello World"
System: Creates folder named "you", file named "with"
Result: BROKEN - wrong interpretation
```

**Root Cause:** Regex-based natural language parsing cannot handle language variations.

---

## Proposed Solution

Replace regex parsing with Claude Code SDK integration:

**New Behavior:**
```
User: "Create a file called test.txt with the text: Hello World"
Claude: Interprets request naturally
Claude: Uses Write tool
System: Creates test.txt with "Hello World"
Result: WORKS - correct interpretation
```

**Key Insight:** Let Claude interpret the request, not regex.

---

## Architecture Change

### Before (Broken)
```
User Post → TaskTypeDetector (regex) → FileOperationExecutor → Broken Results
```

### After (Fixed)
```
User Post → ClaudeCodeWorker → Claude SDK → Claude Tools → Real Results
```

**Change Required:** 1 line in WorkerSpawner
```typescript
// Change this:
const worker = new UnifiedAgentWorker(this.db);

// To this:
const worker = new ClaudeCodeWorker(this.db);
```

---

## Implementation Summary

### New Component: ClaudeCodeWorker

**Location:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

**Responsibilities:**
1. Accept WorkTicket from work_queue
2. Extract user post content
3. Pass to Claude Code SDK
4. Return WorkerResult

**Code Structure:**
```typescript
class ClaudeCodeWorker {
  constructor(db: DatabaseManager) { }

  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    // Extract content
    const content = ticket.payload.content;

    // Call Claude SDK
    const response = await claudeCodeSDKManager.queryClaudeCode(content, {
      cwd: '/workspaces/agent-feed/prod/agent_workspace/',
      model: 'claude-sonnet-4',
      permissionMode: 'bypassPermissions',
      allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob']
    });

    // Return result
    return {
      success: response.success,
      output: extractClaudeResponse(response),
      tokensUsed: calculateTokens(response),
      duration: calculateDuration(response)
    };
  }
}
```

---

## Key Benefits

### 1. No Regex Required
- Claude interprets natural language directly
- Handles variations automatically
- No pattern maintenance

### 2. Multi-Step Operations
```
User: "List all files, then create summary.txt with the list"
Claude: Executes ls command → Reads output → Creates summary.txt
Result: Works automatically (regex cannot do this)
```

### 3. Real File Operations
- Claude uses Read tool (read files)
- Claude uses Write tool (create files)
- Claude uses Bash tool (commands)
- Claude uses Edit tool (modify files)
- All operations in workspace: `/workspaces/agent-feed/prod/agent_workspace/`

### 4. Security Built-in
- Claude SDK enforces workspace boundaries
- No path traversal possible
- No sensitive file access
- No manual validation needed

---

## Testing Strategy

### Test Categories

1. **Regression Tests** (vs broken system)
   - "Create file called test.txt" → Should NOT create "you" folder
   - "Make notes.md with content" → Should create notes.md correctly

2. **Multi-Step Tests**
   - "List files then create summary" → Should execute both operations

3. **Security Tests**
   - "../../../etc/passwd" → Should reject
   - ".env file" → Should reject
   - Operations outside workspace → Should reject

4. **Performance Tests**
   - Simple operations: < 5 seconds
   - Complex operations: < 15 seconds
   - Timeout enforcement: 60 seconds

---

## Integration Points

### 1. WorkerSpawner (1 line change)
```typescript
// File: /workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts
// Line 157

// OLD:
const worker = new UnifiedAgentWorker(this.db);

// NEW:
const worker = new ClaudeCodeWorker(this.db);
```

### 2. ClaudeCodeSDKManager (no changes)
- Already exists
- Already configured
- Already has tool access
- Just needs `cwd` override to agent_workspace

### 3. WorkTicket (no changes)
- Same interface
- Same payload structure
- Same result format

### 4. SSE Broadcasting (no changes)
- Already integrated
- Tool activity automatically broadcast
- Ticker displays Claude operations

---

## Security Model

### Workspace Isolation
```yaml
workspace: /workspaces/agent-feed/prod/agent_workspace/

enforcement:
  - Claude SDK enforces boundaries
  - SDK rejects operations outside workspace
  - No manual validation needed

blocked_operations:
  - Access parent directories
  - Access system directories (/etc, /var)
  - Access sensitive files (.env, .git)
  - Access other user workspaces
```

### Permission Mode
```typescript
permissionMode: "bypassPermissions"
```

**Safe because:**
- Automated worker (no human approval needed)
- SDK still enforces workspace boundaries
- All operations logged
- No network access

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Core Worker | 1-2 days | Create ClaudeCodeWorker, implement executeTicket |
| Phase 2: Integration | 0.5 days | Update WorkerSpawner, wire up components |
| Phase 3: Configuration | 0.5 days | Set workspace directory, verify boundaries |
| Phase 4: Error Handling | 1 day | Implement timeout, error categorization |
| Phase 5: Testing | 2 days | Unit tests, integration tests, security tests |
| Phase 6: Migration | 1 day | Deploy, monitor, cleanup old code |

**Total:** 5-6 days

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)
```typescript
// In worker-spawner.adapter.ts
// Change back to:
const worker = new UnifiedAgentWorker(this.db);
```

### Gradual Rollout
1. **10% of tickets** → Monitor 24 hours
2. **50% of tickets** → Monitor 48 hours
3. **100% of tickets** → Full deployment

### Monitoring Metrics
- Success rate > 90%
- Average duration < 10 seconds
- Timeout rate < 2%
- Workspace violations = 0

---

## Risk Assessment

### Risk Level: LOW

**Reasons:**
1. Single integration point (ClaudeCodeSDKManager exists)
2. One line change in WorkerSpawner
3. Fast rollback capability (1 line revert)
4. Comprehensive testing strategy
5. SDK handles security automatically

**Mitigation:**
- Gradual rollout (10% → 50% → 100%)
- Real-time monitoring
- Instant rollback capability
- Comprehensive test coverage

---

## Success Criteria

### Functional
- [ ] Zero regex-based parsing
- [ ] Zero "you" folders or "with" files created
- [ ] Simple requests work 100%
- [ ] Complex multi-step requests work 100%
- [ ] All operations confined to workspace

### Performance
- [ ] Simple operations < 5 seconds
- [ ] Complex operations < 15 seconds
- [ ] Timeout rate < 2%
- [ ] Success rate > 90%

### Security
- [ ] Zero workspace boundary violations
- [ ] Zero path traversal successes
- [ ] Zero sensitive file operations
- [ ] All operations logged

---

## Dependencies

### Ready ✓
- ClaudeCodeSDKManager (existing)
- Claude Code SDK (@anthropic-ai/claude-code) (installed)
- work_queue database table (ready)
- WorkTicket type definitions (ready)
- SSE broadcast system (ready)

### No Blockers
All dependencies are ready. Implementation can begin immediately.

---

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `/workspaces/agent-feed/src/worker/claude-code-worker.ts` | New worker implementation | To be created |
| `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts` | Integration point | 1 line change |
| `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js` | Claude SDK manager | Existing, ready |
| `/workspaces/agent-feed/src/types/work-ticket.ts` | Type definitions | Existing, ready |

---

## Recommendation

**PROCEED WITH IMPLEMENTATION**

**Rationale:**
1. Clear problem (broken regex parsing)
2. Clear solution (Claude SDK integration)
3. Low risk (single integration point, fast rollback)
4. High benefit (fixes broken functionality, enables complex operations)
5. All dependencies ready
6. Comprehensive testing strategy
7. Clear implementation plan

**Next Steps:**
1. Get approval from Technical Lead
2. Get security approval for permissionMode
3. Begin Phase 1: Core Worker Implementation
4. Follow 6-phase implementation plan

---

## Questions & Answers

### Q: Why not improve the regex patterns?
**A:** Regex cannot handle natural language variations. "Create file test.txt" vs "Make a file called test.txt" vs "Hey can you create test.txt" all require different patterns. Claude handles all variations naturally.

### Q: Is Claude Code SDK secure?
**A:** Yes. The SDK enforces workspace boundaries, blocks sensitive files, and rejects path traversal. No manual validation needed.

### Q: What if Claude makes a mistake?
**A:** Claude's file operations are much more reliable than regex parsing. If Claude fails, it returns an error message explaining why. The system handles this gracefully and marks the ticket as failed.

### Q: Will this be slower than the old system?
**A:** Potentially slightly slower (API call vs local regex), but much more reliable. Target: < 5 seconds for simple operations, < 15 seconds for complex operations. Old system was fast but produced wrong results.

### Q: Can we rollback quickly?
**A:** Yes. Single line change to revert. Rollback time: < 5 minutes.

---

## Approval Required

- [ ] Technical Lead approval
- [ ] Security Team approval (permissionMode: bypassPermissions)
- [ ] Product Team review (feature changes)

---

**Status:** Ready for Approval and Implementation
**Full Specification:** `/workspaces/agent-feed/api-server/docs/SPARC-ClaudeCode-Integration-Spec.md`

