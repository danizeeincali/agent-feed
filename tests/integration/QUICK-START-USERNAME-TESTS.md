# Quick Start - Username Collection Tests

## TL;DR - Run Tests Now

```bash
# 1. Start API server (in separate terminal)
cd /workspaces/agent-feed/api-server
npm run dev

# 2. Run migration (first time only)
cd /workspaces/agent-feed
./tests/integration/RUN-USERNAME-TESTS.sh --setup

# 3. Run all tests
./tests/integration/RUN-USERNAME-TESTS.sh

# 4. Run with coverage
./tests/integration/RUN-USERNAME-TESTS.sh --coverage
```

## What Gets Tested

### ✅ 40 Integration Tests Covering:

1. **Database Migration** (6 tests)
   - Table creation
   - Schema validation
   - Constraints
   - Default records

2. **API Endpoints** (12 tests)
   - GET /api/user-settings
   - PUT /api/user-settings
   - GET/PUT /api/user-settings/display-name
   - PUT /api/user-settings/profile

3. **Security** (3 tests)
   - SQL injection prevention
   - XSS protection
   - Input sanitization

4. **Validation** (3 tests)
   - Length constraints (1-100 chars)
   - Required fields
   - Data types

5. **Edge Cases** (8 tests)
   - Unicode (Chinese, Russian, Japanese)
   - Emojis (🚀 👨‍💻)
   - Special characters (O'Brien, Jean-Paul)
   - Whitespace handling

6. **Persistence** (3 tests)
   - Multiple reads
   - Cross-operation persistence
   - Update isolation

7. **Agent Integration** (3 tests)
   - Profile extraction
   - Display name variations
   - Agent markdown validation

8. **Performance** (3 tests)
   - Concurrent access (10 requests)
   - Response time (<100ms)
   - Rapid updates

## Prerequisites Checklist

- [ ] Database exists at `/workspaces/agent-feed/database.db`
- [ ] API server installed (`cd api-server && npm install`)
- [ ] Test dependencies installed (`npm install`)
- [ ] Migration applied (run with `--setup` flag)
- [ ] API server running on port 3001

## Test Commands Reference

### Basic Usage
```bash
# Run all tests
./tests/integration/RUN-USERNAME-TESTS.sh

# Run tests with npm
npx vitest run tests/integration/username-collection.test.js
```

### With Options
```bash
# First time: setup + tests
./tests/integration/RUN-USERNAME-TESTS.sh --setup

# Watch mode (auto-rerun on changes)
./tests/integration/RUN-USERNAME-TESTS.sh --watch

# Coverage report
./tests/integration/RUN-USERNAME-TESTS.sh --coverage

# Verbose output
./tests/integration/RUN-USERNAME-TESTS.sh --verbose

# Skip server check (database tests only)
./tests/integration/RUN-USERNAME-TESTS.sh --skip-server-check
```

### Run Specific Test Suites
```bash
# Database tests only
npx vitest run tests/integration/username-collection.test.js -t "Database Migration"

# API tests only
npx vitest run tests/integration/username-collection.test.js -t "API Endpoints"

# Security tests only
npx vitest run tests/integration/username-collection.test.js -t "SQL Injection"

# Performance tests only
npx vitest run tests/integration/username-collection.test.js -t "Performance"
```

## Expected Output

### ✅ Success
```
╔════════════════════════════════════════════════════════════╗
║  USERNAME COLLECTION SYSTEM - INTEGRATION TESTS           ║
╚════════════════════════════════════════════════════════════╝

📋 Pre-flight checks...
✅ Database found: ./database.db
   Size: 12M
✅ Test file found: tests/integration/username-collection.test.js
   Tests: 40
✅ API server running: http://localhost:3001

🔍 Verifying database schema...
✅ user_settings table exists
   Columns: 8
   Records: 1

╔════════════════════════════════════════════════════════════╗
║  RUNNING TESTS                                            ║
╚════════════════════════════════════════════════════════════╝

✓ tests/integration/username-collection.test.js (40 tests) 2.3s

╔════════════════════════════════════════════════════════════╗
║  ✅ ALL TESTS PASSED                                      ║
╚════════════════════════════════════════════════════════════╝

Test Summary:
  • Database Migration: ✅ Passed
  • API Endpoints: ✅ Passed
  • Validation & Security: ✅ Passed
  • Edge Cases: ✅ Passed
  • Performance: ✅ Passed
```

### ⚠️ Server Not Running
```
⚠️  API server not running on port 3001

Start the server with:
  cd api-server && npm run dev

Continue anyway? (y/n)
```

### ❌ Migration Not Applied
```
❌ user_settings table not found

Run migration first:
  ./tests/integration/RUN-USERNAME-TESTS.sh --setup
```

## Troubleshooting

### Problem: "API server not running"
**Solution:**
```bash
cd api-server
npm run dev
# Wait for "Server running on port 3001"
```

### Problem: "user_settings table not found"
**Solution:**
```bash
./tests/integration/RUN-USERNAME-TESTS.sh --setup
```

### Problem: "Database locked"
**Solution:**
```bash
# Stop API server
# Wait 5 seconds
# Restart and try again
```

### Problem: Tests timing out
**Solution:**
```bash
# Check server logs
cd api-server
npm run dev

# In separate terminal, test health endpoint
curl http://localhost:3001/health
```

## Manual Test Verification

### Check Database
```bash
# View table schema
sqlite3 database.db ".schema user_settings"

# View all records
sqlite3 database.db "SELECT * FROM user_settings;"

# Check test data
sqlite3 database.db "SELECT * FROM user_settings WHERE user_id LIKE 'test-user-%';"
```

### Test API Manually
```bash
# Health check
curl http://localhost:3001/health

# Get user settings
curl http://localhost:3001/api/user-settings

# Get display name
curl http://localhost:3001/api/user-settings/display-name

# Update display name
curl -X PUT http://localhost:3001/api/user-settings/display-name \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Test User"}'
```

## Next Steps After Tests Pass

1. ✅ **Verify Migration Applied**
   ```bash
   sqlite3 database.db "SELECT name FROM sqlite_master WHERE name='user_settings';"
   ```

2. ✅ **Test Real Username Collection**
   ```bash
   # Create test user
   curl -X PUT http://localhost:3001/api/user-settings \
     -H "Content-Type: application/json" \
     -d '{"userId": "real-test", "display_name": "John Doe"}'

   # Verify stored
   curl http://localhost:3001/api/user-settings?userId=real-test
   ```

3. ✅ **Test Get-to-Know-You Agent**
   - Verify agent can read from /api/user-settings
   - Verify agent can write to /api/user-settings/profile
   - Verify display_name extracted correctly

4. ✅ **Update Frontend**
   - Replace "User Agent" with `userSettings.display_name`
   - Show username in posts/comments
   - Add settings page for username updates

5. ✅ **Deploy to Production**
   - Run tests in staging environment
   - Apply migration to production database
   - Monitor error rates and performance

## Files Created

- `/workspaces/agent-feed/tests/integration/username-collection.test.js` - 40 integration tests
- `/workspaces/agent-feed/tests/integration/README-USERNAME-TESTS.md` - Comprehensive documentation
- `/workspaces/agent-feed/tests/integration/RUN-USERNAME-TESTS.sh` - Test runner script
- `/workspaces/agent-feed/tests/integration/QUICK-START-USERNAME-TESTS.md` - This file

## Test Metrics

- **Total Tests**: 40
- **Test Suites**: 10
- **Coverage Goal**: >90%
- **Performance Target**: <100ms per request
- **Security**: SQL injection + XSS protection validated
- **Internationalization**: Unicode + emoji support verified

## Support

If tests fail:
1. Check the detailed error message
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Run with `--verbose` flag for detailed output
5. Check database and API server logs
