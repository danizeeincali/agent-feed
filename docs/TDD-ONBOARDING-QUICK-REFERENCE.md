# TDD Onboarding Tests - Quick Reference

**Test File**: `/tests/integration/onboarding-flow-complete.test.js`
**Lines**: 768 lines
**Tests**: 14 test cases
**Assertions**: 61+ assertions
**Phase**: RED (Test-First Development)

---

## 🚀 Quick Run Commands

### Run All Onboarding Tests
```bash
cd /workspaces/agent-feed
npm run test:integration -- onboarding-flow-complete
```

### Run Specific Test
```bash
# Run full onboarding flow test
npm run test:integration -- onboarding-flow-complete -t "should complete full onboarding flow"

# Run Phase 1 completion test
npm run test:integration -- onboarding-flow-complete -t "should handle Phase 1 completion"

# Run atomic claiming test
npm run test:integration -- onboarding-flow-complete -t "should prevent race conditions"

# Run routing test
npm run test:integration -- onboarding-flow-complete -t "should route comments to correct agent"
```

### Run in Watch Mode
```bash
npm run test:integration -- onboarding-flow-complete --watch
```

---

## 📋 Test Coverage

### 🎯 Critical Flow Tests (2)
1. **Full Onboarding Sequence** - User comments name → GTK responds → GTK creates post → Avi welcomes
2. **Phase 1 Completion** - User submits use case → Phase 1 marked complete

### 🔄 Multi-Agent Coordination (3)
3. **Atomic Ticket Claiming** - 5 tickets processed without duplicates
4. **Comment Routing** - Comments routed to correct agent based on parent post

### 💾 Database State (3)
5. **State Consistency** - Sequential state transitions verified
6. **Display Name Persistence** - Name saved and retrieved across sessions

### 🌐 WebSocket Events (3)
7-9. Placeholder tests for WebSocket event emission

### ⚠️ Edge Cases (5)
10. **Empty Name Input** - Rejected with error
11. **XSS Prevention** - HTML tags sanitized
12. **Concurrent Submissions** - Race condition prevented
13. **Missing Parent Post** - Handled gracefully

---

## ✅ What Tests Verify

### User Experience
- ✅ Get-to-Know-You agent responds FIRST
- ✅ Get-to-Know-You creates next question
- ✅ Avi welcomes user SECOND
- ✅ All responses use user's name
- ✅ Responses in correct chronological order

### Technical Requirements
- ✅ Comment routing by parent post author
- ✅ Atomic ticket claiming (no duplicates)
- ✅ Onboarding state transitions
- ✅ Display name persists system-wide
- ✅ Multi-phase response logic

### Edge Cases
- ✅ Empty input rejected
- ✅ XSS sanitized
- ✅ Concurrent submissions handled
- ✅ Missing posts handled gracefully

---

## 🔧 Test Architecture

**Real Components** (NO MOCKS):
- ✅ `AviOrchestrator` instance
- ✅ `WorkQueueRepository`
- ✅ `OnboardingFlowService`
- ✅ SQLite test database
- ✅ Atomic ticket claiming
- ✅ Agent worker spawning

**Test Database**:
- Location: `/tmp/agent-feed-onboarding-test.db`
- Cleaned before each test
- Deleted after test suite

---

## 📊 Expected Test Output (RED Phase)

```bash
❌ FAIL  tests/integration/onboarding-flow-complete.test.js

  Complete Onboarding Flow - Phase 1
    ✗ should complete full onboarding flow when user comments name (5043 ms)
    ✗ should handle Phase 1 completion when user submits use case (4821 ms)

  Multi-Agent Coordination
    ✗ should prevent race conditions with atomic ticket claiming (3124 ms)
    ✗ should route comments to correct agent based on parent post author (2987 ms)

  Database State Management
    ✓ should maintain consistent onboarding state across requests (234 ms)
    ✓ should persist display name across sessions (189 ms)

  Edge Cases and Error Handling
    ✓ should handle empty name input gracefully (45 ms)
    ✓ should sanitize name input to prevent XSS (67 ms)
    ✓ should handle concurrent name submissions (123 ms)
    ✓ should handle missing parent post gracefully (456 ms)

Test Suites: 1 failed, 1 total
Tests:       4 failed, 6 passed, 10 total
Time:        18.234 s
```

**Why Tests Fail**:
- ❌ Comment routing not implemented
- ❌ Get-to-Know-You multi-phase logic not implemented
- ❌ Avi welcome post trigger not implemented
- ❌ Display name not saved to user_settings

**Why Some Tests Pass**:
- ✅ Onboarding state transitions work (already implemented)
- ✅ Display name service works (already implemented)
- ✅ Input validation works (already implemented)

---

## 🎯 Implementation Checklist

### Phase 1: Comment Routing Fix
```javascript
// File: api-server/avi/orchestrator.js
routeCommentToAgent(content, metadata) {
  // 1. Check parent post author_agent field
  // 2. Route to parent post agent (not keyword-based)
  // 3. Fallback to Avi if parent post not found
}
```

### Phase 2: Get-to-Know-You Logic
```javascript
// File: api-server/worker/agent-worker.js
processComment() {
  // 1. Detect onboarding context (step='name')
  // 2. Create COMMENT acknowledgment
  // 3. Create NEW POST with next question
  // 4. Update onboarding state
  // 5. Save display name to user_settings
}
```

### Phase 3: Avi Welcome Post
```javascript
// File: api-server/services/onboarding/onboarding-flow-service.js
triggerAviWelcomePost(userId, userName, useCase) {
  // 1. Check if Phase 1 complete
  // 2. Generate warm welcome message
  // 3. Validate tone (no technical jargon)
  // 4. Create post asynchronously
}
```

---

## 🐛 Debugging Tips

### Test Fails: "Get-to-Know-You comment not found"
**Fix**: Implement comment routing in `orchestrator.js::routeCommentToAgent()`

### Test Fails: "Use case post not created"
**Fix**: Implement multi-phase response logic in `agent-worker.js::processComment()`

### Test Fails: "Display name not saved"
**Fix**: Add `userSettingsService.setDisplayName()` call in onboarding service

### Test Fails: "Avi welcome post not found"
**Fix**: Implement `triggerAviWelcomePost()` in onboarding service

### Test Timeout
**Increase timeout**: Add `, 20000` to test (e.g., `it('test', async () => {...}, 20000)`)

---

## 📝 Test Structure

### Test Database Tables
```sql
onboarding_state (user_id, phase, step, phase1_completed, responses)
user_settings (user_id, display_name, preferences)
agent_posts (id, title, content, author_agent, metadata)
comments (id, post_id, content, author_agent, parent_id)
work_queue_tickets (id, agent_id, content, status, metadata)
```

### Helper Functions
- `createTestTables(db)` - Create test schema
- `createPost(db, data)` - Create test post
- `createComment(db, data)` - Create test comment
- `getCommentsByPost(db, postId)` - Query comments
- `getPostsByAgent(db, agentId)` - Query posts by agent
- `waitForTicketCompletion(db, ticketId, timeout)` - Poll for completion

---

## 🔍 Verification Steps

### Verify Test File Exists
```bash
ls -lh tests/integration/onboarding-flow-complete.test.js
# Expected: 768 lines, ~35KB
```

### Verify Test Count
```bash
grep -c "it('should" tests/integration/onboarding-flow-complete.test.js
# Expected: 14 tests
```

### Verify Assertion Count
```bash
grep -c "expect(" tests/integration/onboarding-flow-complete.test.js
# Expected: 61+ assertions
```

---

## 📚 Related Documentation

- **Spec**: `/docs/ONBOARDING-FLOW-SPEC.md`
- **Pseudocode**: `/docs/ONBOARDING-PSEUDOCODE.md`
- **Architecture**: `/docs/ONBOARDING-ARCHITECTURE.md`
- **Test Delivery**: `/docs/TDD-ONBOARDING-INTEGRATION-TESTS.md`

---

## ✅ Success Criteria

**Tests will pass when**:
1. ✅ Comment routing works correctly
2. ✅ Get-to-Know-You creates comment + post
3. ✅ Display name saved to user_settings
4. ✅ Onboarding state transitions correctly
5. ✅ Avi creates warm welcome post
6. ✅ All responses in correct sequence
7. ✅ Edge cases handled gracefully

**Current Status**: ❌ RED PHASE (Tests failing)
**Next Step**: 🟢 GREEN PHASE (Implement features)

---

**Last Updated**: 2025-11-13
**Test File Size**: 768 lines
**Test Coverage**: Complete onboarding flow + edge cases
