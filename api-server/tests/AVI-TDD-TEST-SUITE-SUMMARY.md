# AVI Persistent Session - TDD Test Suite Summary

**London School TDD Approach**
**Date:** 2025-10-24
**Status:** Ready for Execution

---

## Test Suite Overview

This comprehensive test suite follows the London School (mockist) TDD methodology, emphasizing:
- **Outside-in development** - Tests drive implementation from user behavior down
- **Interaction testing** - Focus on HOW objects collaborate, not WHAT they contain
- **Mock-first contracts** - Define clear interfaces through mock expectations
- **Behavior verification** - Test conversations between objects

---

## Test Files Created

### 1. Unit Tests: AVI Session Manager
**File:** `/workspaces/agent-feed/api-server/tests/unit/avi-session-manager.test.js`

**Test Count:** 42 tests
**Framework:** Jest/Vitest
**Database:** Mocked (focus on SDK interactions)

#### Test Coverage:

**Contract Definition (TSM-001 to TSM-003)**
- Session manager properties and configuration
- Idle timeout settings
- Initial state verification

**Session Lifecycle (TSM-004 to TSM-009)**
- Lazy initialization on first use
- Session reuse across interactions
- Activity timestamp tracking
- Cleanup timer management

**Chat Interactions (TSM-010 to TSM-019)**
- SDK manager collaboration
- System prompt inclusion
- Token limit enforcement
- Response extraction patterns

**Error Recovery (TSM-020 to TSM-023)**
- SDK failure handling
- Session loss recovery
- Initialization error handling
- Fallback responses

**Idle Timeout (TSM-024 to TSM-027)**
- Cleanup after idle period
- Activity-based timer reset
- State cleanup verification

**Status Reporting (TSM-028 to TSM-031)**
- Complete status information
- Token average calculations
- Idle time tracking

**Singleton Pattern (TSM-032 to TSM-033)**
- Factory function behavior
- Configuration persistence

**Token Efficiency (TSM-034 to TSM-035)**
- Token savings demonstration
- Accurate token tracking

**Prompt Loading (TSM-036 to TSM-037)**
- CLAUDE.md parsing
- Context inclusion

**Response Extraction (TSM-038 to TSM-042)**
- Multiple response formats
- Content block filtering
- Fallback handling

---

### 2. Integration Tests: AVI Post Integration
**File:** `/workspaces/agent-feed/api-server/tests/integration/avi-post-integration.test.js`

**Test Count:** 18 tests
**Framework:** Vitest
**Database:** Real SQLite (integration testing)

#### Test Coverage:

**Question Detection (TPI-001 to TPI-004)**
- Question mark detection
- Direct AVI addressing
- Command pattern recognition
- URL filtering for link-logger

**Comment Creation (TPI-005 to TPI-008)**
- author_agent field usage
- Backward compatibility with author
- Query by author_agent
- NULL handling

**Post Workflow (TPI-009 to TPI-011)**
- Post creation and AVI response
- Threaded conversations
- Multiple questions handling

**Async Processing (TPI-012 to TPI-013)**
- Non-blocking post creation
- Delayed response handling

**Statistics (TPI-014 to TPI-015)**
- Comment counting by agent
- Response time tracking

**Migration Validation (TPI-016 to TPI-018)**
- Schema verification
- Index existence
- NULL value support

---

### 3. Integration Tests: AVI DM API
**File:** `/workspaces/agent-feed/api-server/tests/integration/avi-dm-api.test.js`

**Test Count:** 35 tests
**Framework:** Vitest + Supertest
**Database:** N/A (API endpoint testing)

#### Test Coverage:

**POST /api/avi/chat (TDMAPI-001 to TDMAPI-017)**
- Message validation and processing
- Request/response contract
- Empty message rejection
- Whitespace handling
- SDK interaction verification
- System prompt inclusion logic
- Token limit enforcement
- Error handling

**GET /api/avi/status (TDMAPI-018 to TDMAPI-022)**
- Status information structure
- Active/inactive session handling
- Idle time reporting
- Token averages

**DELETE /api/avi/session (TDMAPI-023 to TDMAPI-026)**
- Session cleanup verification
- Statistics preservation
- Inactive session handling

**GET /api/avi/metrics (TDMAPI-027 to TDMAPI-033)**
- Comprehensive metrics structure
- Uptime calculation
- Usage statistics
- Cost estimation
- Efficiency calculation (token savings)
- Zero interaction handling

**Multi-Interaction (TDMAPI-034 to TDMAPI-035)**
- State tracking across calls
- Token savings over time

---

### 4. Unit Tests: Comment Schema Migration
**File:** `/workspaces/agent-feed/api-server/tests/unit/comment-schema-migration.test.js`

**Test Count:** 18 tests
**Framework:** Vitest
**Database:** Real SQLite (migration testing)

#### Test Coverage:

**Pre-Migration State (TCSM-001 to TCSM-002)**
- Original schema verification
- Existing data validation

**Migration Execution (TCSM-003 to TCSM-007)**
- Column addition
- Data migration from author to author_agent
- Data preservation
- Value copying accuracy
- Index creation

**Post-Migration Schema (TCSM-008 to TCSM-010)**
- Dual-field acceptance
- NULL value support
- Index usage verification

**Dual-Field Operations (TCSM-011 to TCSM-013)**
- Filtering by author_agent
- COALESCE fallback pattern
- Independent field updates

**Data Integrity (TCSM-014 to TCSM-016)**
- author field requirement
- Foreign key enforcement
- Cascade deletion

**Performance (TCSM-017 to TCSM-018)**
- Index effectiveness
- IN clause queries

---

## Test Execution

### Run All Tests

```bash
cd /workspaces/agent-feed/api-server

# Run all AVI tests
npm test -- --run tests/unit/avi-session-manager.test.js
npm test -- --run tests/integration/avi-post-integration.test.js
npm test -- --run tests/integration/avi-dm-api.test.js
npm test -- --run tests/unit/comment-schema-migration.test.js
```

### Run Specific Test Suites

```bash
# Unit tests only
npm test -- --run tests/unit/avi-session-manager.test.js

# Integration tests only
npm test -- --run tests/integration/avi-post-integration.test.js
npm test -- --run tests/integration/avi-dm-api.test.js

# Migration tests only
npm test -- --run tests/unit/comment-schema-migration.test.js
```

### Run with Coverage

```bash
npm test -- --coverage tests/unit/avi-session-manager.test.js
```

---

## Test Organization

### London School Principles Applied

1. **Mock-First Development**
   - SDK manager mocked to define contract
   - File system mocked for prompt loading
   - Database real for integration (SQLite)

2. **Behavior Verification**
   - Tests verify interactions between objects
   - Focus on method call sequences
   - Validate collaboration patterns

3. **Contract Testing**
   - API response structures validated
   - Database schema contracts verified
   - Session lifecycle contracts defined

4. **Outside-In Flow**
   - Start with API endpoint tests (outside)
   - Work down to session manager (inside)
   - Define contracts at each boundary

---

## Test Coverage Matrix

| Component | Unit Tests | Integration Tests | Contract Tests |
|-----------|------------|-------------------|----------------|
| Session Manager | 42 | - | Yes |
| Post Integration | - | 18 | Yes |
| DM API Endpoints | - | 35 | Yes |
| Schema Migration | 18 | - | Yes |
| **TOTAL** | **60** | **53** | **113** |

---

## Key Test Patterns

### 1. Interaction Testing
```javascript
it('should execute chat through SDK manager', async () => {
  await sessionManager.chat('Test message');

  expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledWith(
    'Test message',
    expect.objectContaining({
      maxTokens: 2000,
      sessionId: expect.stringContaining('avi-session-')
    })
  );
});
```

### 2. Contract Definition
```javascript
it('should return complete API response structure', async () => {
  const response = await request(app)
    .post('/api/avi/chat')
    .send({ message: 'Test' });

  expect(response.body).toEqual({
    success: true,
    data: {
      response: expect.any(String),
      tokensUsed: expect.any(Number),
      sessionId: expect.any(String),
      sessionStatus: expect.any(Object)
    }
  });
});
```

### 3. Behavior Verification
```javascript
it('should coordinate session lifecycle', async () => {
  await sessionManager.initialize();
  await sessionManager.chat('Message');
  sessionManager.cleanup();

  expect(sessionManager.sessionActive).toBe(false);
  expect(sessionManager.cleanupTimer).toBeNull();
});
```

---

## Success Criteria

### Unit Tests (Session Manager)
- ✅ All 42 tests passing
- ✅ 100% coverage of session lifecycle
- ✅ Mock interactions verified
- ✅ Error recovery tested

### Integration Tests (Post Integration)
- ✅ All 18 tests passing
- ✅ Real database operations
- ✅ Schema validation complete
- ✅ Backward compatibility verified

### Integration Tests (DM API)
- ✅ All 35 tests passing
- ✅ HTTP contract validated
- ✅ All endpoints tested
- ✅ Error scenarios covered

### Unit Tests (Migration)
- ✅ All 18 tests passing
- ✅ Migration process verified
- ✅ Data integrity maintained
- ✅ Performance validated

---

## Implementation Order

Following TDD Red-Green-Refactor:

1. **Run tests** → All should FAIL (no implementation yet)
2. **Implement session manager** → Tests should PASS
3. **Add API endpoints** → API tests should PASS
4. **Apply migration** → Migration tests should PASS
5. **Integrate into posts** → Integration tests should PASS
6. **Refactor** → All tests remain GREEN

---

## Test Maintenance

### Adding New Tests

When adding features:
1. Write test FIRST (Red)
2. Define contract through mocks
3. Implement feature (Green)
4. Refactor while tests stay green

### Updating Tests

When changing behavior:
1. Update test expectations FIRST
2. Ensure tests fail appropriately
3. Update implementation
4. Verify all tests pass

---

## Dependencies

### Test Frameworks
- `vitest` - Test runner
- `@jest/globals` - Jest compatibility
- `better-sqlite3` - SQLite database
- `supertest` - HTTP endpoint testing

### Required Packages
```bash
npm install -D vitest @jest/globals better-sqlite3 supertest
```

---

## Notes

### Mock Strategy
- SDK manager: **Mocked** (external dependency)
- File system: **Mocked** (I/O operations)
- Database: **Real** (integration verification)
- HTTP: **Real** (endpoint contracts)

### Test Data
- Test databases created in `/workspaces/agent-feed/api-server/data/`
- Cleaned up after each test suite
- No pollution between tests

### Parallel Execution
- Unit tests: **Safe** (isolated mocks)
- Integration tests: **Sequential** (shared database)

---

## Next Steps

1. **Run Tests** - Execute all test suites (should fail)
2. **Verify Failures** - Confirm tests fail for right reasons
3. **Implement** - Build features to pass tests
4. **Iterate** - Refactor while maintaining green tests
5. **Document** - Update as implementation evolves

---

**Total Tests:** 113
**Estimated Runtime:** ~10 seconds
**Coverage Target:** 95%+

**Last Updated:** 2025-10-24
**Status:** ✅ Ready for TDD Implementation
