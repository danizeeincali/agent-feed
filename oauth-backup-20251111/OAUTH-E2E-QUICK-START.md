# OAuth E2E Integration Tests - Quick Start Guide

**Quick Reference** for running and understanding OAuth end-to-end integration tests.

---

## 🚀 Quick Start (30 seconds)

```bash
# Run all OAuth E2E tests
npm test -- tests/integration/oauth-e2e-standalone.test.js

# Expected result: 17 tests passing in ~2.5 seconds
# Test Suites: 1 passed
# Tests:       17 passed
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `tests/integration/oauth-e2e-standalone.test.js` | Main test suite (756 lines, 17 tests) |
| `docs/INTEGRATION-OAUTH-E2E-REPORT.md` | Detailed documentation with flow diagrams |
| `docs/INTEGRATION-OAUTH-E2E-TEST-RESULTS.md` | Test execution results and metrics |
| `docs/OAUTH-E2E-QUICK-START.md` | This quick reference guide |

---

## 🧪 What Gets Tested

### 1. Database Schema (4 tests)
- ✅ `user_claude_auth` table structure
- ✅ `usage_billing` table structure
- ✅ Database indexes
- ✅ OAuth token format

### 2. OAuth User Flow (2 tests)
- ✅ Complete flow: DB → Auth → SDK → API → Billing
- ✅ OAuth fallback to platform API key
- ✅ Usage tracking enabled
- ✅ Environment cleanup

### 3. API Key User Flow (2 tests)
- ✅ User's own API key used
- ✅ No billing tracking
- ✅ Key format validation
- ✅ Environment isolation

### 4. Platform PAYG Flow (2 tests)
- ✅ Platform API key used
- ✅ Billing tracking enabled
- ✅ Multiple requests tracked
- ✅ Cumulative usage

### 5. Error Handling (3 tests)
- ✅ SDK error recovery
- ✅ Database error handling
- ✅ Missing user defaults

### 6. Concurrent Sessions (1 test)
- ✅ Multiple users simultaneously
- ✅ Independent auth configs

### 7. Performance (2 tests)
- ✅ Auth queries: < 2ms average
- ✅ Billing inserts: < 4ms average

### 8. Data Flow (1 test)
- ✅ End-to-end verification

---

## 📊 Expected Test Output

```
OAuth E2E Integration - Complete Stack
  1. Database Schema Validation
    ✓ should verify user_claude_auth table structure (41 ms)
    ✓ should verify usage_billing table structure (16 ms)
    ✓ should verify database indexes exist (5 ms)
    ✓ should verify OAuth token format in database (2 ms)
  2. OAuth User Complete Flow
    ✓ should execute complete OAuth DM flow: Database → Auth → SDK → Response (15 ms)
    ✓ should verify OAuth fallback mechanism (4 ms)
  3. API Key User Complete Flow
    ✓ should execute complete API Key flow: Database → Auth → SDK → Response (22 ms)
    ✓ should validate API key format (12 ms)
  4. Platform PAYG User Complete Flow
    ✓ should execute complete PAYG flow with billing tracking (59 ms)
    ✓ should track cumulative usage across sessions (25 ms)
  5. Error Handling and Recovery
    ✓ should handle SDK error with proper environment cleanup (15 ms)
    ✓ should handle database connection error gracefully (15 ms)
    ✓ should handle missing user with default PAYG (8 ms)
  6. Concurrent User Sessions
    ✓ should handle multiple concurrent auth configurations (14 ms)
  7. Performance Metrics
    ✓ should measure auth config retrieval performance (189 ms)
    ✓ should measure billing tracking performance (370 ms)
  8. Data Flow Verification
    ✓ should verify complete data flow: DB → Auth → SDK → API → Billing (12 ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        2.415 s
```

---

## 🔑 Authentication Methods Tested

### OAuth (with Fallback)
```javascript
// User: demo-user-123
// Auth: oauth
// API Key: Platform key (fallback)
// Tracking: YES (platform pays)
```

### User API Key
```javascript
// User: test-user-*
// Auth: user_api_key
// API Key: User's own key
// Tracking: NO (user pays Anthropic directly)
```

### Platform PAYG
```javascript
// User: new users
// Auth: platform_payg
// API Key: Platform key
// Tracking: YES (platform pays, bills user)
```

---

## 🏃 Running Specific Tests

### Run All Tests
```bash
npm test -- tests/integration/oauth-e2e-standalone.test.js
```

### Run OAuth Flow Only
```bash
npm test -- tests/integration/oauth-e2e-standalone.test.js -t "OAuth User Complete Flow"
```

### Run Performance Tests Only
```bash
npm test -- tests/integration/oauth-e2e-standalone.test.js -t "Performance Metrics"
```

### Run Database Schema Tests Only
```bash
npm test -- tests/integration/oauth-e2e-standalone.test.js -t "Database Schema Validation"
```

### Run with Verbose Output
```bash
npm test -- tests/integration/oauth-e2e-standalone.test.js --verbose
```

---

## 🔍 Understanding Test Flow

### OAuth User Example Flow

```
1. Database Query
   └─> SELECT auth_method, oauth_token FROM user_claude_auth WHERE user_id = 'demo-user-123'
   └─> Result: auth_method='oauth', oauth_token='sk-ant-oat01-...'

2. ClaudeAuthManager.getAuthConfig()
   └─> Detects OAuth token
   └─> Falls back to platform API key
   └─> Returns: { method: 'oauth', apiKey: PLATFORM_KEY, trackUsage: true, oauthFallback: true }

3. Prepare SDK Environment
   └─> Save original: process.env.ANTHROPIC_API_KEY
   └─> Set platform key: process.env.ANTHROPIC_API_KEY = PLATFORM_KEY

4. SDK Call (simulated)
   └─> Usage: { input: 1200, output: 650 }
   └─> Cost: $0.0134

5. Track Usage
   └─> INSERT INTO usage_billing (user_id, input_tokens, output_tokens, cost_usd, ...)

6. Restore Environment
   └─> process.env.ANTHROPIC_API_KEY = originalKey

7. Verify Billing
   └─> SELECT * FROM usage_billing WHERE user_id = 'demo-user-123'
   └─> Confirms: tokens=1850, cost=$0.0134
```

---

## 🛠️ Troubleshooting

### Issue: Tests Fail with "Database Not Found"

**Solution:**
```bash
# Check database exists
ls -la /workspaces/agent-feed/database.db

# If missing, check alternative locations
find /workspaces/agent-feed -name "*.db" -type f
```

### Issue: "ANTHROPIC_API_KEY not set"

**Solution:**
```bash
# Check .env file
cat .env | grep ANTHROPIC_API_KEY

# Set manually if needed
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### Issue: "Foreign Key Constraint Failed"

**This is fixed in the test suite.** Tests now create users in the `users` table before creating auth records.

### Issue: Tests Pass Locally, Fail in CI

**Check:**
1. Database path in CI environment
2. Environment variables loaded
3. Foreign key constraints enabled in CI database

---

## 📈 Performance Benchmarks

### Auth Config Retrieval
- **Average**: 1.89ms per query
- **100 queries**: 189ms total
- **Performance**: ✅ Excellent

### Billing Tracking
- **Average**: 3.70ms per insert
- **100 inserts**: 370ms total
- **Performance**: ✅ Good

### Total Test Suite
- **Tests**: 17
- **Time**: ~2.4 seconds
- **Performance**: ✅ Excellent

---

## 🔒 Security Verification

### Environment Variable Safety
```javascript
✅ Original API key saved
✅ User API key set
✅ SDK call executed
✅ Original API key restored (even on error)
✅ No API key leaks between requests
```

### API Key Isolation
```javascript
✅ OAuth users: Platform key (fallback)
✅ API key users: User's own key
✅ PAYG users: Platform key
✅ No cross-contamination
```

---

## 📊 Test Data Cleanup

Tests automatically clean up all test data:
```javascript
✅ user_claude_auth records deleted
✅ usage_billing records deleted
✅ users records deleted
✅ Database connection closed
```

**Test Users Created:**
- `e2e-apikey-*` (API key users)
- `e2e-payg-*` (PAYG users)
- `concurrent-*` (Concurrent test users)
- `perf-test-*` (Performance test users)
- `flow-test-*` (Data flow test users)

All cleaned up automatically after tests complete.

---

## 🎯 Success Criteria

### All Tests Must:
- ✅ Complete in < 5 seconds
- ✅ Clean up all test data
- ✅ Not leak environment variables
- ✅ Verify database integrity
- ✅ Test all auth methods
- ✅ Handle errors gracefully

### Performance Requirements:
- ✅ Auth queries: < 10ms average
- ✅ Billing inserts: < 20ms average
- ✅ Total suite: < 10 seconds

---

## 📚 Additional Resources

### Documentation
- **Full Report**: `docs/INTEGRATION-OAUTH-E2E-REPORT.md`
  - Complete flow diagrams
  - API request samples
  - Troubleshooting guide

- **Test Results**: `docs/INTEGRATION-OAUTH-E2E-TEST-RESULTS.md`
  - Execution details
  - Performance metrics
  - Sample outputs

### Database Schema
- **Migration**: `api-server/db/migrations/018-claude-auth-billing.sql`
- **Tables**: `user_claude_auth`, `usage_billing`

### Source Code
- **Auth Manager**: `src/services/ClaudeAuthManager.cjs` (CommonJS for tests)
- **Auth Manager**: `src/services/ClaudeAuthManager.js` (ES module for app)
- **SDK Manager**: `src/services/ClaudeCodeSDKManager.js`

---

## ✅ Production Checklist

Before deploying:
- ✅ All 17 tests passing
- ✅ Performance within limits (< 10ms auth, < 20ms billing)
- ✅ Database schema verified
- ✅ OAuth fallback tested
- ✅ Error handling validated
- ✅ Security measures confirmed
- ✅ Test data cleanup verified
- ✅ Documentation complete

---

## 🎉 Quick Win Commands

```bash
# Run tests and show summary
npm test -- tests/integration/oauth-e2e-standalone.test.js 2>&1 | grep -A 30 "Test Suites:"

# Run tests with timestamps
npm test -- tests/integration/oauth-e2e-standalone.test.js --verbose 2>&1 | ts

# Run tests and save output
npm test -- tests/integration/oauth-e2e-standalone.test.js > test-results.log 2>&1

# Check for specific test failure
npm test -- tests/integration/oauth-e2e-standalone.test.js 2>&1 | grep -i "fail\|error"
```

---

**Status**: ✅ All tests passing
**Maintainer**: Integration Test Engineer
**Last Updated**: November 11, 2025
