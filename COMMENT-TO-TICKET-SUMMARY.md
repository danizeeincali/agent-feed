# Comment-to-Ticket Integration - Executive Summary

**Specification Document:** [SPARC-COMMENT-TO-TICKET-SPEC.md](/workspaces/agent-feed/SPARC-COMMENT-TO-TICKET-SPEC.md)

---

## Problem

User comments like "can you add 'Dani' to workspace_content.md?" are saved to the database but never processed because they don't create work queue tickets.

**Current Flow:**
```
Comment → Database ✅ → Ticket ❌ → Orchestrator ❌ → Worker ❌
```

**Desired Flow:**
```
Comment → Database ✅ → Ticket ✅ → Orchestrator ✅ → Worker ✅
```

---

## Solution Overview

Enhance the comment creation endpoint (`POST /api/agent-posts/:postId/comments`) to automatically create work queue tickets, mirroring the existing post-to-ticket integration pattern.

### Key Changes

**Single File Modification:**
- `/workspaces/agent-feed/api-server/server.js` (lines 967-1019)
- Add ~30 lines of code after comment creation
- Pattern: Copy from post creation endpoint (lines 845-867)

**No Changes Required:**
- Work Queue Repository ✅ (already supports comments)
- AVI Orchestrator ✅ (content-agnostic)
- Claude Code SDK Worker ✅ (processes any task)

---

## Implementation Approach

### Code Addition (After Line 1002)

```javascript
// Create work queue ticket for AVI orchestrator
let ticket = null;
try {
  ticket = await workQueueRepository.createTicket({
    user_id: userId,
    post_id: createdComment.id,      // Comment ID
    post_content: createdComment.content,
    post_author: createdComment.author_agent,
    post_metadata: {
      parent_post_id: postId,        // Original post
      comment_id: createdComment.id,
      context_type: 'comment',       // Distinguishes from posts
      created_at: createdComment.created_at
    },
    assigned_agent: null,
    priority: 5
  });

  console.log(`✅ Work ticket created: ticket-${ticket.id}`);
} catch (ticketError) {
  console.error('❌ Ticket creation failed:', ticketError);
  // Don't fail comment creation (backward compatibility)
}
```

### Response Enhancement

```javascript
res.status(201).json({
  success: true,
  data: createdComment,
  ticket: ticket ? { id: ticket.id, status: ticket.status } : null,  // NEW
  message: 'Comment created successfully',
  source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
});
```

---

## Requirements Summary

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Automatic ticket creation when comment created | HIGH |
| FR-2 | Correct data mapping (comment → ticket) | HIGH |
| FR-3 | Preserve parent post context in metadata | MEDIUM |
| FR-4 | Graceful degradation (comment succeeds if ticket fails) | HIGH |
| FR-5 | Enhanced API response with ticket info | LOW |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Performance: P95 latency | <150ms |
| NFR-2 | Reliability: Ticket success rate | 99%+ |
| NFR-3 | Data integrity: No orphaned records | 100% |
| NFR-4 | Scalability: Throughput | 100 comments/min |

---

## Architecture Changes

### Data Flow (New)

```
User Comment
    ↓
POST /api/agent-posts/:postId/comments
    ↓
┌─────────────────────────────┐
│ 1. Create Comment (DB)      │ ✅ Existing
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 2. Create Ticket (DB)       │ ⭐ NEW
│    - post_id: comment.id    │
│    - post_content: comment  │
│    - metadata: context      │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 3. Return Response          │ ✅ Enhanced
│    + ticket: { id, status } │
└─────────────────────────────┘
    ↓
AVI Orchestrator (polls work_queue)
    ↓
Assigns Worker
    ↓
Worker Executes Task
    ↓
Result Posted
```

### Database Schema

**Comments Table:** No changes
**Work Queue Table:** No changes

**Ticket Structure for Comments:**

```javascript
{
  user_id: "user-123",
  post_id: "comment-uuid",           // Comment ID (not post ID!)
  post_content: "can you add Dani...",
  post_author: "user-123",
  post_metadata: {
    parent_post_id: "post-uuid",     // Original post ID
    comment_id: "comment-uuid",
    context_type: "comment",         // NEW: Distinguishes from posts
    created_at: "2025-10-14T12:00:00Z"
  },
  priority: 5,
  status: "pending"
}
```

---

## Testing Strategy

### Test Pyramid

| Layer | Coverage | Tests | Effort |
|-------|----------|-------|--------|
| E2E | Full workflow | 5 tests | 6 hours |
| Integration | API + DB | 20 tests | 6 hours |
| Unit | Mapping/validation | 25 tests | 4 hours |

### Key Test Scenarios

1. **Happy Path:** Comment → Ticket → Orchestrator → Worker → Complete
2. **Error Handling:** Comment succeeds, ticket fails → Comment still created
3. **Data Integrity:** No duplicate tickets, correct metadata
4. **Performance:** Response time <150ms (P95)
5. **Backward Compatibility:** Existing API contract maintained

---

## Implementation Timeline

### 2-Week Plan

**Week 1:**
- Days 1-3: Implementation + Unit Tests (8 hours)
- Days 4-5: Integration Tests + Performance (15 hours)

**Week 2:**
- Days 1-3: E2E Tests + Bug Fixes (18 hours)
- Days 4-5: Production Deployment + Monitoring (16 hours)

**Total Effort:** ~57 hours (25-30 hours/week)

---

## Success Metrics

### Technical Metrics

- **Test Coverage:** 90%+ (unit + integration)
- **Performance:** P95 < 150ms
- **Reliability:** 99% ticket creation success rate
- **Zero:** Breaking changes to existing API

### Business Metrics

- **Adoption:** 80% of comments create tickets (Week 4)
- **Completion:** 90% of comment tickets complete successfully
- **Throughput:** 500 comment tasks/week
- **Time to Execution:** Average 10 seconds (comment → task start)

---

## Risk Mitigation

### Top Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Database transaction issues | MEDIUM | HIGH | Graceful degradation + orphan cleanup |
| Performance degradation | LOW | MEDIUM | Benchmarking + optimization |
| Work queue overload | LOW | MEDIUM | Rate limiting + monitoring |
| Backward compatibility | LOW | HIGH | Additive changes only |

### Rollback Plan

1. Disable feature flag: `COMMENT_TICKET_ENABLED=false`
2. Deploy previous version if needed
3. Monitor for orphaned comments
4. Investigate root cause
5. Fix and re-deploy

---

## Backward Compatibility

### API Contract

**Before:**
```json
{
  "success": true,
  "data": { "id": "...", "content": "..." },
  "message": "Comment created successfully"
}
```

**After:**
```json
{
  "success": true,
  "data": { "id": "...", "content": "..." },
  "ticket": { "id": 42, "status": "pending" },  // NEW (optional)
  "message": "Comment created successfully"
}
```

✅ **Fully Backward Compatible:** New field is optional and ignorable by existing clients.

---

## Files Changed

### Modified Files (1)

| File | Lines | Change Type |
|------|-------|-------------|
| `/workspaces/agent-feed/api-server/server.js` | 967-1019 | Enhancement (~30 lines added) |

### New Files (3)

| File | Purpose |
|------|---------|
| `/workspaces/agent-feed/api-server/tests/integration/comment-to-ticket-integration.test.js` | Integration tests (20 tests) |
| `/workspaces/agent-feed/api-server/tests/e2e/comment-to-ticket-e2e.test.js` | E2E tests (5 tests) |
| `/workspaces/agent-feed/docs/COMMENT-TO-TICKET-GUIDE.md` | User documentation |

### Unchanged Files (3)

| File | Reason |
|------|--------|
| `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js` | Already supports comments |
| `/workspaces/agent-feed/src/avi/orchestrator.ts` | Content-agnostic |
| `/workspaces/agent-feed/src/worker/unified-agent-worker.ts` | Processes any task |

---

## Monitoring Dashboard

```
Comment-to-Ticket Metrics (24h)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Comments Created:     347
Tickets Created:      345  (99.4% ✅)
Tickets Completed:    312  (90.4% ✅)
Tickets Failed:       11   (3.2% ✅)

Performance:
  Avg Response:       87ms  ✅
  P95 Response:       142ms ✅
  P99 Response:       198ms ⚠️

Time to Execution:
  Comment → Ticket:   0.4s  ✅
  Ticket → Assign:    4.2s  ✅
  Assign → Execute:   5.1s  ✅
  Total:              9.7s  ✅
```

---

## Next Steps

1. **Review Specification:** Read full spec in `SPARC-COMMENT-TO-TICKET-SPEC.md`
2. **Stakeholder Approval:** Get sign-off on approach
3. **Begin Implementation:** Start with Phase 1 (Foundation)
4. **Track Progress:** Monitor against success metrics

---

## Questions or Concerns?

This specification follows the existing post-to-ticket pattern and maintains backward compatibility. The implementation is low-risk and provides immediate value to users.

**Contact:** See full specification for detailed architecture, test plans, and implementation guidance.
