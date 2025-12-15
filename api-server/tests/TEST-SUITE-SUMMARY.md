# AVI Phase 2 Orchestrator - Test Suite Summary

**Created:** 2025-10-10
**Approach:** TDD London School (mockist with real database integration)
**Framework:** Vitest
**Total Tests:** 101 comprehensive test cases

---

## Test Files Created

### 1. Unit Tests
**File:** `/workspaces/agent-feed/api-server/tests/unit/avi/orchestrator.test.js`
**Test Count:** 57 tests
**Lines of Code:** ~1,000

**Coverage:**
- `startOrchestrator()` - Initialize and start feed monitoring (4 tests)
- `stopOrchestrator()` - Graceful shutdown (4 tests)
- `monitorFeed()` - Poll for new posts (6 tests)
- `processPost(post)` - Create work tickets (6 tests)
- `spawnWorker(ticket)` - Create ephemeral agent worker (6 tests)
- `updateContext(tokens)` - Track context size (5 tests)
- `checkHealth()` - Monitor orchestrator health (6 tests)
- `gracefulRestart()` - Restart at 50K tokens (7 tests)
- `handleError(error)` - Error recovery (6 tests)
- **Interaction Testing** - London School collaboration verification (2 tests)
- **Edge Cases** - Error scenarios and concurrency (5 tests)

**Test Strategy:**
- Mock external collaborators (Claude API, feed service, worker spawner)
- Real PostgreSQL database integration
- Focus on behavior verification and object interactions
- Isolated unit testing with dependency injection

---

### 2. Integration Tests
**File:** `/workspaces/agent-feed/api-server/tests/integration/avi/orchestrator-integration.test.js`
**Test Count:** 22 tests
**Lines of Code:** ~850

**Coverage:**
- Complete Feed-to-Completion Workflow (3 tests)
  - Full post processing pipeline
  - Multiple concurrent posts
  - Max worker concurrency limits
- Context Size Monitoring and Auto-Restart (4 tests)
  - Context growth tracking
  - Automatic restart at 50K tokens
  - Pending ticket preservation
  - State restoration
- Multiple Concurrent Workers (3 tests)
  - Parallel worker processing
  - Worker lifecycle tracking
  - Failure isolation
- Error Handling and Retry Logic (3 tests)
  - Automatic retries
  - Database error recovery
  - Partial failure handling
- State Persistence Across Restarts (4 tests)
  - Feed position persistence
  - Ticket history preservation
  - Memory retention
  - Resume from correct position
- Complex Scenarios (3 tests)
  - Multi-batch processing with restarts
  - Mixed success/failure patterns
  - Stop during active processing
- Performance and Scalability (2 tests)
  - Large batch handling
  - Performance consistency

**Test Strategy:**
- Real PostgreSQL for all data operations
- Mock only Claude API and feed service
- Test complete workflows end-to-end
- Verify state persistence and recovery

---

### 3. E2E Tests
**File:** `/workspaces/agent-feed/api-server/tests/e2e/avi/orchestrator-e2e.test.js`
**Test Count:** 22 tests
**Lines of Code:** ~950

**Coverage:**
- Full Orchestrator Lifecycle (2 tests)
  - Complete start/process/stop cycle
  - State consistency verification
- Feed Monitoring with Real Posts (4 tests)
  - Tech post processing
  - Code help processing
  - Mixed post types
  - Priority ordering
- Worker Spawning and Completion (4 tests)
  - Worker creation per ticket
  - Concurrent worker limits
  - Worker cleanup
  - Memory persistence
- Health Monitoring Dashboard (4 tests)
  - Comprehensive dashboard data
  - Health check tracking
  - Unhealthy status detection
  - External service statistics
- Multi-User Scenarios (2 tests)
  - Cross-user post handling
  - Memory isolation per user
- Real-World Scenarios (4 tests)
  - Continuous feed monitoring
  - Context growth and restart
  - API error recovery
  - Rapid start/stop cycles
- Performance and Reliability (2 tests)
  - Load testing (30+ posts)
  - Memory leak verification

**Test Strategy:**
- Real PostgreSQL database
- Realistic mock services with fixtures
- Full orchestrator implementation
- Test realistic usage patterns

---

## Test Architecture

### London School TDD Principles Applied

1. **Outside-In Development**
   - Start with high-level orchestrator behavior
   - Drive down to implementation details
   - Define collaborator contracts through mocks

2. **Mock-Driven Design**
   - Mock external services (Claude API, feed service)
   - Use real database (no mocks for PostgreSQL)
   - Verify interactions between objects

3. **Behavior Verification**
   - Test how objects collaborate
   - Verify method call sequences
   - Check state transitions

4. **Contract Definition**
   - Clear interfaces through mock expectations
   - Repository contracts tested separately
   - Service boundaries well-defined

### Database Integration Strategy

**Real PostgreSQL Used For:**
- `avi_state` table operations
- `work_queue` table operations
- `agent_memories` table operations
- State persistence verification
- Transaction consistency

**Mocked Services:**
- Claude API calls (with realistic fixtures)
- External feed service
- Worker spawning (simulated)

---

## Running the Tests

### Run All Orchestrator Tests
```bash
npm test -- orchestrator
```

### Run Unit Tests Only
```bash
npm test -- tests/unit/avi/orchestrator.test.js
```

### Run Integration Tests Only
```bash
npm test -- tests/integration/avi/orchestrator-integration.test.js
```

### Run E2E Tests Only
```bash
npm test -- tests/e2e/avi/orchestrator-e2e.test.js
```

### Run with Coverage
```bash
npm run test:coverage -- orchestrator
```

### Watch Mode (TDD)
```bash
npm run test:watch -- orchestrator
```

---

## Test Verification Commands

### Verify Test Count
```bash
# Unit tests
grep -c "^\s*it(" tests/unit/avi/orchestrator.test.js

# Integration tests
grep -c "^\s*it(" tests/integration/avi/orchestrator-integration.test.js

# E2E tests
grep -c "^\s*it(" tests/e2e/avi/orchestrator-e2e.test.js
```

### Verify Test Structure
```bash
# Check describe blocks
grep -E "describe\(" tests/unit/avi/orchestrator.test.js

# Check mocks setup
grep -E "vi\.(fn|mock)" tests/unit/avi/orchestrator.test.js

# Check database integration
grep -E "postgresManager|aviStateRepo|workQueueRepo" tests/integration/avi/orchestrator-integration.test.js
```

---

## Dependencies Required

### Already Installed
- `vitest` - Test framework
- `@vitest/ui` - Test UI
- `pg` - PostgreSQL client

### Test Configuration
Tests use existing configuration from:
- `/workspaces/agent-feed/api-server/config/postgres.js`
- Existing repository implementations
- Environment variables for database connection

---

## Test Data Management

### Before Each Test
```javascript
beforeEach(async () => {
  // Reset avi_state
  await aviStateRepo.initialize();

  // Clean work_queue
  await postgresManager.query('DELETE FROM work_queue');

  // Clean memories
  await postgresManager.query('DELETE FROM agent_memories');

  // Reset mocks
  vi.clearAllMocks();
});
```

### Database State
- Tests use real PostgreSQL in test mode
- Each test starts with clean slate
- State is persisted between operations within a test
- No cross-test contamination

---

## Mock Fixtures (E2E Tests)

### Test Posts
```javascript
TEST_FIXTURES.posts = {
  techQuestion: {
    id: 'post-tech-1',
    content: 'What are your thoughts on AI? @tech',
    metadata: { platform: 'twitter', mentions: ['@tech'] }
  },
  codeHelp: {
    id: 'post-code-1',
    content: 'Debug help needed #code #typescript',
    metadata: { hashtags: ['#code', '#typescript'] }
  },
  conversation: {
    id: 'post-conv-1',
    content: 'Thanks for the explanation!',
    metadata: { isReply: true }
  }
}
```

### Mock Responses
```javascript
TEST_FIXTURES.responses = {
  techResponse: { content: '...', tokens: 4200 },
  codeResponse: { content: '...', tokens: 3800 },
  conversationResponse: { content: '...', tokens: 2500 }
}
```

---

## Test Coverage Goals

### Functionality Coverage
- ✅ All orchestrator methods tested
- ✅ Error handling and recovery
- ✅ State persistence
- ✅ Graceful restart logic
- ✅ Context size monitoring
- ✅ Worker lifecycle management
- ✅ Health monitoring
- ✅ Multi-user isolation

### Scenario Coverage
- ✅ Happy path workflows
- ✅ Error scenarios
- ✅ Edge cases
- ✅ Concurrent operations
- ✅ Performance under load
- ✅ State transitions
- ✅ Database failures
- ✅ API failures

### Code Coverage Targets
- **Statements:** >90%
- **Branches:** >85%
- **Functions:** >95%
- **Lines:** >90%

---

## Implementation Checklist

### Before Implementation
- ✅ Unit tests created (57 tests)
- ✅ Integration tests created (22 tests)
- ✅ E2E tests created (22 tests)
- ⏳ Tests passing (will fail until implementation)

### During Implementation
1. Run tests in watch mode
2. Implement one method at a time
3. Make tests pass incrementally
4. Refactor with confidence

### After Implementation
1. Verify all 101 tests pass
2. Check code coverage
3. Review test output
4. Document any deviations

---

## Key Test Patterns

### 1. Orchestrator Setup
```javascript
orchestrator = new AviOrchestrator({
  claudeAPI: mockClaudeAPI,
  feedService: mockFeedService,
  workerSpawner: mockWorkerSpawner,
  aviStateRepo: aviStateRepo,      // Real
  workQueueRepo: workQueueRepo      // Real
});
```

### 2. Mock Verification
```javascript
expect(mockWorkerSpawner.spawn).toHaveBeenCalledWith(
  expect.objectContaining({
    ticketId: expect.any(Number),
    agentType: expect.any(String)
  })
);
```

### 3. Database Verification
```javascript
const state = await aviStateRepo.getState();
expect(state.status).toBe('running');
expect(state.context_size).toBe(1500);
```

### 4. Integration Workflow
```javascript
// Feed → Ticket → Worker → Completion
await orchestrator.start();
feedService.addPosts([post]);
await waitForProcessing();
const ticket = await workQueueRepo.getTicketById(...);
expect(ticket.status).toBe('completed');
```

---

## Success Criteria

### All Tests Pass
- Unit tests: 57/57 passing
- Integration tests: 22/22 passing
- E2E tests: 22/22 passing
- **Total: 101/101 passing**

### Code Quality
- No test pollution
- Fast test execution (<30s total)
- Clear test descriptions
- Comprehensive error messages

### Coverage
- All orchestrator methods tested
- All error paths covered
- All state transitions verified
- Real-world scenarios included

---

## Notes for Implementation

1. **Start with Unit Tests:** Implement orchestrator methods to pass unit tests first
2. **Database First:** Ensure repositories work before orchestrator
3. **Mock Setup:** Use provided mock patterns for external services
4. **Incremental:** Make one test pass at a time
5. **Refactor:** Keep tests passing while refactoring
6. **Integration Last:** Run integration and E2E tests when units pass

---

## References

- **Architecture:** `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- **Repository Tests:** `/workspaces/agent-feed/api-server/tests/unit/repositories/`
- **Existing Patterns:** `avi-state.repository.test.js`, `work-queue.repository.test.js`
- **Vitest Docs:** https://vitest.dev/

---

## Test Execution Results (Post-Implementation)

_To be filled in after orchestrator implementation:_

```
✓ Unit Tests (57)
✓ Integration Tests (22)
✓ E2E Tests (22)

Total: 101 passing
Duration: [TBD]
Coverage: [TBD]
```

---

**Ready for Implementation!** 🚀

All test files are created and comprehensive. Follow TDD principles:
1. Read the failing test
2. Write minimal code to pass
3. Refactor while keeping tests green
4. Repeat

The orchestrator implementation can now be built with confidence, guided by these 101 comprehensive tests.
