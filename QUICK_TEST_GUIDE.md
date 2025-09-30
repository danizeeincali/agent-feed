# Quick Test Guide - Claude SDK Analytics

## TL;DR - Run All Tests

```bash
# 1. Install dependencies
cd /workspaces/agent-feed/api-server && npm install

# 2. Run backend tests (84 tests)
npm test

# 3. For E2E tests, start servers first:
# Terminal 1: Backend
cd /workspaces/agent-feed/api-server && npm start

# Terminal 2: Frontend
cd /workspaces/agent-feed/frontend && npm run dev

# Terminal 3: Run E2E tests
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/claude-sdk-analytics-real-data.spec.ts
```

---

## Test Files Overview

| File | Tests | What It Tests |
|------|-------|---------------|
| `token-analytics-real-data.test.js` | 22 | API endpoints return real DB data |
| `token-analytics-queries.test.js` | 28 | Database queries, schema, security |
| `token-analytics-validation.test.js` | 16 | Data accuracy DB→API |
| `claude-sdk-analytics-real-data.spec.ts` | 18 | E2E browser validation |

**Total**: 84 tests

---

## Quick Commands

### Run Specific Test File
```bash
cd /workspaces/agent-feed/api-server

# Unit tests
npx vitest run tests/token-analytics-real-data.test.js

# Integration tests
npx vitest run tests/token-analytics-queries.test.js

# Validation tests
npx vitest run tests/token-analytics-validation.test.js
```

### Run with Coverage
```bash
npx vitest run --coverage
```

### Run in Watch Mode
```bash
npx vitest
```

### Run E2E with UI
```bash
cd /workspaces/agent-feed/frontend
npx playwright test --ui
```

---

## Expected Results

### ✅ Success Indicators
- All 84 tests passing
- Summary returns **20 requests** (real data)
- Summary does NOT return 50 requests (mock data)
- Database queries execute successfully
- Cost conversion correct (dollars → cents)
- No SQL injection vulnerabilities
- E2E screenshots generated

### ❌ Failure Indicators
- Summary returns 50 requests = still using mock data
- Database connection errors
- Test count ≠ 84
- SQL injection tests fail
- Cost calculations incorrect

---

## Test Output Example

```
✓ tests/token-analytics-real-data.test.js (22 tests)
  ✓ Token Analytics Real Data - Summary Endpoint (8)
  ✓ Token Analytics Real Data - Hourly Endpoint (5)
  ✓ Token Analytics Real Data - Daily Endpoint (5)
  ✓ Token Analytics Real Data - Messages Endpoint (9)

✓ tests/token-analytics-queries.test.js (28 tests)
  ✓ Token Analytics Database - Connection & Schema (7)
  ✓ Token Analytics Database - Basic Queries (8)
  ✓ Token Analytics Database - Aggregation Queries (4)
  ✓ Token Analytics Database - SQL Injection Protection (4)
  ✓ Token Analytics Database - Data Integrity (6)

✓ tests/token-analytics-validation.test.js (16 tests)
  ✓ Token Analytics - Database to API Validation (5)
  ✓ Token Analytics - Provider Inference (3)
  ✓ Token Analytics - Model Aggregation (2)
  ✓ Token Analytics - No Data Loss (3)

Test Files  3 passed (3)
     Tests  66 passed (66)
  Start at  10:00:00
  Duration  2.34s
```

---

## Troubleshooting

### Tests Fail with "Database not found"
```bash
# Check database exists
ls -lh /workspaces/agent-feed/database.db

# Verify database has data
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) FROM token_analytics"
# Should return: 20
```

### Tests Fail with "Module not found"
```bash
cd /workspaces/agent-feed/api-server
npm install supertest vitest @vitest/ui better-sqlite3
```

### E2E Tests Fail with "Connection refused"
```bash
# Make sure servers are running:
# Terminal 1:
cd /workspaces/agent-feed/api-server && npm start

# Terminal 2:
cd /workspaces/agent-feed/frontend && npm run dev

# Then run E2E tests in Terminal 3
```

### Still Shows 50 Requests (Mock Data)
Check if server.js is using database:
```bash
grep -n "generateTokenAnalyticsData\|mockTokenAnalytics\|50" /workspaces/agent-feed/api-server/server.js
```

If mock code exists, real data implementation is incomplete.

---

## Quick Validation

### 1. Check Database
```bash
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) as count FROM token_analytics"
# Expected: 20
```

### 2. Check API Response
```bash
curl http://localhost:3001/api/token-analytics/summary | jq '.data.summary.total_requests'
# Expected: 20 (not 50)
```

### 3. Run Tests
```bash
cd /workspaces/agent-feed/api-server && npm test
# Expected: All 66 backend tests pass
```

---

## Files Created

```
/workspaces/agent-feed/
├── CLAUDE_SDK_ANALYTICS_TEST_PLAN.md        (Full test plan)
├── TEST_SUITE_SUMMARY.md                     (Implementation summary)
├── QUICK_TEST_GUIDE.md                       (This file)
├── api-server/
│   └── tests/
│       ├── token-analytics-real-data.test.js      (22 tests)
│       ├── token-analytics-queries.test.js        (28 tests)
│       └── token-analytics-validation.test.js     (16 tests)
└── frontend/
    └── tests/
        └── e2e/
            └── claude-sdk-analytics-real-data.spec.ts  (18 tests)
```

---

## Key Tests to Watch

### 1. Real Data Test
```javascript
it('should return real database data (not mock 50 requests)', async () => {
  const response = await request(testApp).get('/api/token-analytics/summary');
  expect(response.body.data.summary.total_requests).toBe(20); // Real data
  expect(response.body.data.summary.total_requests).not.toBe(50); // NOT mock
});
```

**If this fails**: Mock data still in use.

### 2. SQL Injection Test
```javascript
it('should safely handle malicious sessionId input', () => {
  const maliciousInput = "'; DROP TABLE token_analytics; --";
  const results = db.prepare(`SELECT * FROM token_analytics WHERE sessionId = ?`).all(maliciousInput);
  // Table should still exist
});
```

**If this fails**: SQL injection vulnerability exists.

### 3. Cost Conversion Test
```javascript
it('should calculate cost correctly (DB dollars to API cents)', async () => {
  const dbCost = db.prepare('SELECT SUM(estimatedCost) as total FROM token_analytics').get();
  const expectedCostCents = Math.floor(dbCost.total * 100);
  const response = await request(testApp).get('/api/token-analytics/summary');
  expect(response.body.data.summary.total_cost).toBe(expectedCostCents);
});
```

**If this fails**: Cost conversion logic incorrect.

---

## Success Checklist

- [ ] All 84 tests passing
- [ ] Summary shows 20 requests (real data)
- [ ] Database queries successful
- [ ] Cost in cents (not dollars)
- [ ] Provider inference working
- [ ] SQL injection protected
- [ ] E2E tests pass with screenshots
- [ ] No console errors in browser

---

## Support

For detailed information, see:
- **Full Test Plan**: `/workspaces/agent-feed/CLAUDE_SDK_ANALYTICS_TEST_PLAN.md`
- **Implementation Summary**: `/workspaces/agent-feed/TEST_SUITE_SUMMARY.md`

---

**Last Updated**: 2025-09-30
**Status**: Ready for Testing ✅
