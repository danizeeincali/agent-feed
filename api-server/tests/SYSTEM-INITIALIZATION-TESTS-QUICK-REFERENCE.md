# System Initialization Tests - Quick Reference

## Test Files Location
```
/workspaces/agent-feed/api-server/tests/
├── integration/
│   └── system-initialization.test.js (41 tests)
├── e2e/
│   └── system-initialization-e2e.test.js (21+ tests)
├── helpers/
│   └── system-initialization-helpers.js (13 utilities)
└── fixtures/
    └── welcome-posts-fixtures.js (7 fixture sets)
```

## Quick Run Commands

### Run All System Init Tests
```bash
npm test -- system-initialization
```

### Run Integration Tests Only
```bash
npm test -- tests/integration/system-initialization.test.js
```

### Run E2E Tests Only (server must be running)
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm test -- tests/e2e/system-initialization-e2e.test.js
```

### Run Specific Test Group
```bash
# Database Reset tests only
npm test -- system-initialization -t "Database Reset"

# Welcome Content tests only
npm test -- system-initialization -t "Welcome Content"

# State Management tests only
npm test -- system-initialization -t "System State"
```

### Watch Mode (auto-rerun on changes)
```bash
npm test -- system-initialization --watch
```

## Test Coverage Summary

### Integration Tests (41 tests)
1. **Database Reset** - 8 tests
2. **Welcome Content** - 9 tests
3. **System State** - 7 tests
4. **Idempotency** - 4 tests
5. **Error Handling** - 5 tests
6. **Engagement Scores** - 2 tests
7. **Introduction Queue** - 2 tests
8. **State Verification** - 4 tests

### E2E Tests (21+ tests)
1. **POST /api/system/initialize** - 7 tests
2. **GET /api/system/state** - 5 tests
3. **GET /api/system/welcome-posts/preview** - 4 tests
4. **POST /api/system/validate-content** - 3 tests
5. **Complete User Journey** - 2 tests
6. **Multi-User Scenarios** - 2 tests
7. **Performance** - 3 tests

## Key Test Helpers

```javascript
import {
  createTestDatabase,      // Create test DB
  cleanupTestUser,         // Clean test data
  countWelcomePosts,       // Count posts
  getWelcomePosts,         // Get all posts
  verifyPostOrder,         // Check post order
  getUserSettings,         // Get user data
  verifyDatabaseEmpty,     // Check empty state
  createMockWelcomePosts   // Create mocks
} from './helpers/system-initialization-helpers.js';
```

## Key Fixtures

```javascript
import {
  VALID_WELCOME_POSTS,     // Valid post templates
  INVALID_WELCOME_POSTS,   // Invalid posts
  TEST_USERS,              // Sample users
  EXPECTED_POST_ORDER,     // Expected order
  DATABASE_STATES,         // DB states
  API_RESPONSES,           // Expected responses
  VALIDATION_TESTS         // Validation cases
} from './fixtures/welcome-posts-fixtures.js';
```

## Common Test Patterns

### Setup Test Database
```javascript
beforeAll(() => {
  db = createTestDatabase(DB_PATH);
  resetService = new ResetDatabaseService(db);
});

afterAll(() => {
  cleanupTestUser(db, testUserId);
  db.close();
});
```

### Test Welcome Post Creation
```javascript
it('should create 3 welcome posts', async () => {
  const result = await setupService.initializeSystemWithPosts(testUserId);

  expect(result.postsCreated).toBe(3);
  expect(result.postIds).toHaveLength(3);

  const posts = getWelcomePosts(db, testUserId);
  expect(posts.length).toBe(3);
});
```

### Test Database Reset
```javascript
it('should reset database', () => {
  const result = resetService.resetDatabase({ confirmReset: true });

  expect(result.success).toBe(true);

  const verification = verifyDatabaseEmpty(db);
  expect(verification.isEmpty).toBe(true);
});
```

### Test API Endpoint
```javascript
it('should initialize via API', async () => {
  const response = await request(BASE_URL)
    .post('/api/system/initialize')
    .send({ userId: testUserId })
    .expect(200);

  expect(response.body.success).toBe(true);
  expect(response.body.postsCreated).toBe(3);
});
```

## Expected Test Status (TDD Red Phase)

### Current Status
- ❌ Integration Tests: 41 SKIPPED (awaiting implementation)
- ⚠️ E2E Tests: 12 PASSING, 9 FAILING (partial implementation)

### After Implementation (Green Phase)
- ✅ Integration Tests: 41 PASSING
- ✅ E2E Tests: 21+ PASSING

## Debugging Failed Tests

### Check Database Tables
```bash
sqlite3 /workspaces/agent-feed/database.db ".tables"
```

### Check Database Schema
```bash
sqlite3 /workspaces/agent-feed/database.db ".schema user_settings"
```

### Check Test Data
```bash
sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM agent_posts WHERE json_extract(metadata, '$.userId') = 'test-user-init-001';"
```

### Enable Verbose Output
```bash
npm test -- system-initialization --reporter=verbose
```

## Common Issues & Solutions

### Issue: "no such table: user_settings"
**Solution**: Run database migrations to create tables
```bash
# Check for migration files in db/migrations/
ls -la db/migrations/
```

### Issue: "no such table: agent_posts"
**Solution**: Database schema not initialized
```bash
# Initialize database schema
npm run db:migrate  # or equivalent command
```

### Issue: Tests timeout
**Solution**: Increase test timeout
```javascript
it('should complete operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 second timeout
```

### Issue: E2E tests skipped
**Solution**: Ensure server is running
```bash
# Check server status
curl http://localhost:3001/health
```

## Test Data Cleanup

### Manual Cleanup
```javascript
// Clean specific test user
cleanupTestUser(db, 'test-user-001');

// Verify cleanup
const count = countWelcomePosts(db, 'test-user-001');
console.log('Remaining posts:', count); // Should be 0
```

### Reset Test Database
```bash
# Backup current database
cp database.db database.db.backup

# Reset to empty state
sqlite3 database.db "DELETE FROM agent_posts; DELETE FROM user_settings;"
```

## Performance Benchmarks

### Expected Performance
- Integration test suite: < 2 seconds
- E2E test suite: < 10 seconds
- Single test: < 100ms
- Database reset: < 500ms
- API initialization: < 2 seconds

### Monitor Performance
```bash
npm test -- system-initialization --reporter=verbose 2>&1 | grep "Duration"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run System Initialization Tests
  run: |
    npm test -- tests/integration/system-initialization.test.js
    npm run dev &
    sleep 3
    npm test -- tests/e2e/system-initialization-e2e.test.js
```

## Related Documentation

- Full Test Summary: `TDD-SYSTEM-INITIALIZATION-TEST-SUMMARY.md`
- SPARC Specification: `docs/SYSTEM_INITIALIZATION_SPEC.md` (to be created)
- API Documentation: `docs/API_DOCUMENTATION.md`

## Support

For test issues or questions:
1. Check test output for specific error messages
2. Review test summary documentation
3. Check database schema matches test expectations
4. Verify all services are properly initialized

---

**Last Updated**: 2025-11-07
**Test Framework**: Vitest
**Test Status**: 🔴 RED PHASE (TDD - Awaiting Implementation)
