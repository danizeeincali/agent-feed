# SPARC Specification: Post-to-Ticket Integration
**Phase:** AVI Orchestrator Activation
**Date:** 2025-10-13
**Status:** Implementation Ready

---

## 1. Problem Statement

**Current State:**
- Posts are created successfully in `agent_memories` table (504 posts)
- AVI Orchestrator is running and polling every 5 seconds
- Work queue table exists with only 1 old test ticket
- **Gap:** No integration layer converts posts to work queue tickets

**Impact:**
- AVI orchestrator never detects new posts
- Users create posts but AVI never responds
- 503 posts have been orphaned (no tickets created)

**Root Cause:**
The `POST /api/v1/agent-posts` endpoint creates posts via `dbSelector.createPost()` but never calls `workQueueRepository.createTicket()`.

---

## 2. Functional Requirements

### FR1: Automatic Ticket Creation
**Requirement:** When a post is created, a corresponding work queue ticket MUST be created automatically.

**Acceptance Criteria:**
- ✅ Every post creation results in exactly 1 ticket
- ✅ Ticket contains all necessary post metadata
- ✅ Ticket status is set to 'pending'
- ✅ Ticket priority defaults to 5 (medium)
- ✅ Transaction safety: both succeed or both fail

### FR2: Data Mapping
**Requirement:** Post data MUST be correctly mapped to ticket fields.

**Mapping Specification:**
```
Post Field          → Ticket Field
-----------------------------------------
userId              → user_id
post.id             → post_id
post.content        → post_content
post.author_agent   → post_author
post.title          → post_metadata.title
post.tags           → post_metadata.tags
null                → assigned_agent (orchestrator assigns)
5                   → priority (default medium)
'pending'           → status (initial state)
```

**Acceptance Criteria:**
- ✅ All required fields populated
- ✅ Metadata is valid JSON
- ✅ No data truncation or loss

### FR3: Error Handling
**Requirement:** Failures MUST be handled gracefully with proper rollback.

**Acceptance Criteria:**
- ✅ If post creation fails, no ticket is created
- ✅ If ticket creation fails, post creation is rolled back (future: transaction)
- ✅ Error messages are descriptive
- ✅ HTTP 500 returned on failure with details
- ✅ Errors logged to console

### FR4: Orchestrator Detection
**Requirement:** Orchestrator MUST detect new tickets within 5 seconds.

**Acceptance Criteria:**
- ✅ Ticket appears in work_queue table
- ✅ Orchestrator polling finds ticket on next cycle
- ✅ Worker is spawned for ticket processing
- ✅ Ticket status transitions: pending → assigned → processing

### FR5: Backward Compatibility
**Requirement:** Existing API contracts MUST remain unchanged.

**Acceptance Criteria:**
- ✅ POST endpoint signature unchanged
- ✅ Response format unchanged (may add ticket info)
- ✅ Existing tests continue to pass
- ✅ No breaking changes to frontend

---

## 3. Non-Functional Requirements

### NFR1: Performance
- Post creation + ticket creation: < 100ms (p99)
- No noticeable latency increase for users
- Database operations optimized

### NFR2: Reliability
- 100% ticket creation rate (no silent failures)
- Idempotency: duplicate requests handled safely
- Transaction safety for future enhancements

### NFR3: Maintainability
- Code is simple and explicit (single-user VPS pattern)
- Easy to debug (direct function calls)
- Clear logging at each step

### NFR4: Testing
- 100% real functionality (ZERO mocks)
- Integration tests for full flow
- E2E tests with Playwright (screenshots)
- All tests must pass before deployment

---

## 4. Implementation Scope

### In Scope
✅ Direct integration in POST endpoint
✅ Ticket creation via workQueueRepository
✅ Error handling and logging
✅ Integration tests (TDD)
✅ E2E tests with Playwright
✅ Concurrent agent validation
✅ Documentation updates

### Out of Scope
❌ Event-driven architecture (unnecessary for single user)
❌ Database triggers (adds complexity)
❌ Transaction wrapper (can add later if needed)
❌ Webhook integrations
❌ Multi-user features

---

## 5. Success Criteria

### Must Have (Blocking)
1. ✅ Every post creates exactly 1 ticket
2. ✅ Orchestrator detects and processes tickets
3. ✅ All integration tests pass (ZERO mocks)
4. ✅ E2E test demonstrates full workflow with screenshot
5. ✅ No errors in production logs

### Should Have (Important)
1. ✅ Response includes ticket information
2. ✅ Ticket creation logged for debugging
3. ✅ Performance within 100ms
4. ✅ Backward compatible

### Nice to Have (Optional)
1. Transaction safety (future enhancement)
2. Retry logic (future enhancement)
3. Dead letter queue (future enhancement)

---

## 6. Test Strategy

### Unit Tests
- `workQueueRepository.createTicket()` validation
- Field mapping correctness
- Error handling branches

### Integration Tests (TDD - Write First)
**Test 1:** Post creation creates ticket
```javascript
it('should create work queue ticket when post is created', async () => {
  const postData = {
    title: 'Test Post',
    content: 'Test content',
    author_agent: 'test-agent'
  };

  const response = await request(app)
    .post('/api/v1/agent-posts')
    .send(postData);

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);

  // Verify ticket was created in database
  const ticket = await workQueueRepository.getTicketByPostId(response.body.data.id);
  expect(ticket).toBeTruthy();
  expect(ticket.status).toBe('pending');
  expect(ticket.post_content).toBe('Test content');
});
```

**Test 2:** Ticket contains correct metadata
**Test 3:** Failed ticket creation returns error
**Test 4:** Orchestrator detects new ticket

### E2E Tests (Playwright)
**Scenario:** Full user workflow
1. User creates post in UI
2. Post appears in feed
3. Orchestrator detects ticket (verify via API)
4. Worker processes ticket (verify status change)
5. AVI responds with result post
6. Screenshot each step

### Validation Agents (Concurrent)
1. **Code Analyzer:** Review implementation for bugs
2. **Test Specialist:** Verify test coverage and quality
3. **Production Validator:** Check deployment readiness
4. **Performance Analyzer:** Verify latency requirements

---

## 7. Rollback Plan

**If Implementation Fails:**
1. Revert server.js changes
2. Restart backend (no ticket creation)
3. Posts continue to work (degraded: no AVI responses)
4. Fix and redeploy

**Database State:**
- No schema changes (table already exists)
- Existing tickets unaffected
- Can manually create tickets if needed

---

## 8. Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (unit + integration + E2E)
- [ ] Concurrent agents approve
- [ ] Performance verified (<100ms)
- [ ] Error handling tested
- [ ] Logs reviewed

**Deployment:**
- [ ] Backend restart (hot reload)
- [ ] Verify orchestrator still running
- [ ] Test post creation
- [ ] Verify ticket in database
- [ ] Confirm orchestrator processes ticket

**Post-Deployment:**
- [ ] Monitor logs for errors
- [ ] Check ticket processing rate
- [ ] Verify no performance regression
- [ ] User acceptance test

---

## 9. Dependencies

**Code Dependencies:**
- `/workspaces/agent-feed/api-server/server.js` (modify)
- `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js` (import)
- `/workspaces/agent-feed/api-server/config/database-selector.js` (existing)

**Runtime Dependencies:**
- PostgreSQL database (running)
- AVI Orchestrator (running)
- Work queue table (exists)

**No New Dependencies Required** ✅

---

## 10. Acceptance Test Script

**Manual Test (After Deployment):**

```bash
# 1. Create a test post
curl -X POST http://localhost:3001/api/v1/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test AVI Detection",
    "content": "Hello AVI, can you create a file test.txt in agent_workspace?",
    "author_agent": "human-user"
  }'

# Expected: 201 response with post + ticket data

# 2. Verify ticket in database
psql -U postgres -d avidm_dev -c "SELECT * FROM work_queue ORDER BY created_at DESC LIMIT 1;"

# Expected: New ticket with status='pending'

# 3. Wait 5-10 seconds, check ticket status
psql -U postgres -d avidm_dev -c "SELECT status, assigned_at FROM work_queue ORDER BY created_at DESC LIMIT 1;"

# Expected: status='assigned' or 'processing'

# 4. Check backend logs
# Expected: "✅ Worker spawned for ticket..."

# 5. Verify in UI
# Expected: Post appears in feed
```

---

## Specification Approval

**Status:** ✅ Ready for Implementation

**Next Steps:**
1. Write integration tests (TDD)
2. Implement code
3. Run tests until passing
4. Launch validation agents
5. Deploy

---

**Estimated Timeline:**
- Specification: ✅ Complete
- Test Writing: 15 minutes
- Implementation: 10 minutes
- Testing: 20 minutes
- Validation: 15 minutes
- **Total: ~60 minutes to production**
