# Username Collection System - Integration Tests

## Overview

Comprehensive TDD test suite for the username collection system, validating the complete flow from database migration through API endpoints to agent integration.

## Test Philosophy

**NO MOCKS - 100% Real Integration Testing**

- Uses real `database.db` file (better-sqlite3)
- Tests against running API server on `localhost:3001`
- Validates actual database schema and data persistence
- Tests real get-to-know-you-agent integration

## Test Coverage

### 1. Database Migration (6 tests)
- ✅ `user_settings` table creation
- ✅ Correct schema with all required columns
- ✅ Unique constraint on `user_id`
- ✅ Default demo-user-123 record
- ✅ NULL value handling
- ✅ Timestamp fields (created_at, updated_at)

### 2. GET API Endpoints (4 tests)
- ✅ Return 200 and user settings for existing user
- ✅ Parse JSON fields (profile_data, preferences)
- ✅ Return 404 for non-existent user
- ✅ Default to demo-user-123 when no userId

### 3. PUT API Endpoints (4 tests)
- ✅ Update display_name for existing user
- ✅ Create new user if not exists (upsert)
- ✅ Update profile_data JSON field
- ✅ Database persistence verification

### 4. Display Name Endpoints (3 tests)
- ✅ GET /api/user-settings/display-name
- ✅ PUT /api/user-settings/display-name (isolated update)
- ✅ Reject empty/missing display_name

### 5. Validation - Length Constraints (3 tests)
- ✅ Accept 1 character minimum
- ✅ Accept 100 characters maximum
- ✅ Handle >100 character names

### 6. Security - SQL Injection (3 tests)
- ✅ Prevent SQL injection in display_name
- ✅ Prevent SQL injection in user_id parameter
- ✅ Handle multiple injection attempts
- ✅ Table integrity verification

### 7. Edge Cases - Special Characters (4 tests)
- ✅ Unicode characters (Chinese, Russian, Japanese, Korean)
- ✅ Emojis in display name (🚀 👨‍💻)
- ✅ Special characters (apostrophes, hyphens, punctuation)
- ✅ Whitespace handling (leading, trailing, tabs)
- ✅ null vs undefined vs empty string

### 8. Username Persistence (3 tests)
- ✅ Persist across multiple reads
- ✅ Maintain after profile updates
- ✅ Allow updates without affecting other fields

### 9. Get-to-Know-You Agent Integration (3 tests)
- ✅ Verify agent markdown file exists
- ✅ Accept profile with display_name from agent
- ✅ Extract display_name from profile variations

### 10. Performance & Concurrent Access (3 tests)
- ✅ Handle 10 concurrent reads
- ✅ Rapid sequential updates without data loss
- ✅ GET request completes within 100ms

## Prerequisites

### 1. Database Setup
```bash
# Ensure database.db exists
ls -la /workspaces/agent-feed/database.db

# Run migration to create user_settings table
cd /workspaces/agent-feed/api-server
npm run migrate
```

### 2. API Server Running
```bash
# Start API server on port 3001
cd /workspaces/agent-feed/api-server
npm run dev

# Verify server is running
curl http://localhost:3001/health
```

### 3. Install Test Dependencies
```bash
# Root directory
npm install --save-dev vitest better-sqlite3 node-fetch

# Or use existing packages
cd /workspaces/agent-feed
npm install
```

## Running the Tests

### Run All Tests
```bash
# From root directory
npx vitest run tests/integration/username-collection.test.js

# With verbose output
npx vitest run tests/integration/username-collection.test.js --reporter=verbose

# Watch mode (re-run on changes)
npx vitest tests/integration/username-collection.test.js
```

### Run Specific Test Suites
```bash
# Database migration tests only
npx vitest run tests/integration/username-collection.test.js -t "Database Migration"

# API endpoint tests only
npx vitest run tests/integration/username-collection.test.js -t "API Endpoints"

# Security tests only
npx vitest run tests/integration/username-collection.test.js -t "SQL Injection"

# Edge cases only
npx vitest run tests/integration/username-collection.test.js -t "Edge Cases"
```

### Run with Coverage
```bash
npx vitest run tests/integration/username-collection.test.js --coverage
```

## Test Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. beforeAll: Check server availability & DB connection    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Run Test Suites (1-10)                                  │
│    - Database tests: Direct SQL queries                    │
│    - API tests: HTTP requests to localhost:3001            │
│    - Integration tests: Combined DB + API validation       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. afterEach: Clean up test data (DELETE test-user-*)      │
└─────────────────────────────────────────────────────────────┘
```

## Expected Output

### Successful Run
```
✓ tests/integration/username-collection.test.js (40 tests) 2.1s
  ✓ Username Collection System - Integration Tests
    ✓ 1. Database Migration - user_settings Table (6)
      ✓ should have user_settings table in database 12ms
      ✓ should have correct schema 8ms
      ✓ should have unique constraint 5ms
      ✓ should have default demo-user-123 record 4ms
      ✓ should allow NULL values 6ms
      ✓ should have timestamps 7ms
    ✓ 2. API Endpoints - GET (4)
      ✓ should return 200 and user settings 45ms
      ✓ should parse JSON fields 38ms
      ✓ should return 404 for non-existent user 22ms
      ✓ should default to demo-user-123 18ms
    ...

Test Files  1 passed (1)
     Tests  40 passed (40)
   Duration  2.1s
```

### If Server Not Running
```
⚠️  API server not running on port 3001 - some tests will be skipped
✓ tests/integration/username-collection.test.js (10 tests | 30 skipped)
  ✓ Username Collection System - Integration Tests
    ✓ 1. Database Migration - user_settings Table (6)
      ✓ All database tests passed
    ⏭️  2-10. API tests skipped (server not available)
```

## Debugging Failed Tests

### Check Database State
```bash
# View user_settings table
sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM user_settings LIMIT 10;"

# Check table schema
sqlite3 /workspaces/agent-feed/database.db "PRAGMA table_info(user_settings);"

# Check test data
sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM user_settings WHERE user_id LIKE 'test-user-%';"
```

### Check API Server
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test user-settings endpoint
curl http://localhost:3001/api/user-settings

# Test display-name endpoint
curl http://localhost:3001/api/user-settings/display-name
```

### Verbose Test Output
```bash
# Run with debug logging
DEBUG=* npx vitest run tests/integration/username-collection.test.js

# Or with Node.js debugging
node --inspect-brk node_modules/.bin/vitest run tests/integration/username-collection.test.js
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Username Collection Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: |
          cd api-server
          npm run migrate

      - name: Start API server
        run: |
          cd api-server
          npm run dev &
          sleep 5

      - name: Run integration tests
        run: npx vitest run tests/integration/username-collection.test.js

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Data Cleanup

Tests use the prefix `test-user-*` for all test users to enable easy cleanup:

```bash
# Manual cleanup if needed
sqlite3 /workspaces/agent-feed/database.db "DELETE FROM user_settings WHERE user_id LIKE 'test-user-%';"

# Or run cleanup script
npm run test:cleanup
```

## Known Issues & Workarounds

### Issue 1: Server Port Conflict
**Problem**: API server already running on 3001
**Solution**: Stop existing server or change port in test config

### Issue 2: Database Lock
**Problem**: Database locked during concurrent tests
**Solution**: Tests already use WAL mode; ensure no other processes accessing DB

### Issue 3: Migration Not Applied
**Problem**: `user_settings` table doesn't exist
**Solution**: Run `npm run migrate` in api-server directory

## Next Steps

After tests pass:

1. **Deploy Migration**: Apply to production database
2. **Update Frontend**: Use display_name from user_settings
3. **Update Agent**: Configure get-to-know-you-agent to collect username
4. **Monitor Metrics**: Track username collection rate
5. **User Testing**: Validate onboarding flow with real users

## Metrics & Success Criteria

- ✅ All 40 tests passing
- ✅ 100% of API endpoints tested
- ✅ SQL injection prevention verified
- ✅ Unicode/emoji support confirmed
- ✅ Performance targets met (<100ms)
- ✅ Concurrent access handled correctly

## Contact & Support

For issues or questions:
- Review test output for specific failure details
- Check database schema matches migration file
- Verify API server routes are correctly mounted
- Ensure all dependencies installed correctly
