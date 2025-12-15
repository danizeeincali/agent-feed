# Analytics TDD Test Suite - Quick Start Guide

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure you have dependencies installed
cd /workspaces/agent-feed
npm install
```

### Run All Tests (One Command)
```bash
./scripts/run-analytics-tests.sh
```

---

## 📋 Test Categories

### 1. Unit Tests (14 tests) - 2 minutes
```bash
npx vitest run src/services/__tests__/TokenAnalyticsWriter.test.js
```

**What it tests**: TokenAnalyticsWriter class in isolation
- Cost calculations
- Database interactions (mocked)
- Error handling
- Logging behavior

### 2. Integration Tests (10 tests) - 3 minutes
```bash
npx vitest run src/api/__tests__/analytics-tracking-integration.test.js
```

**What it tests**: API endpoint → Analytics writer flow
- /streaming-chat endpoint
- Async write operations
- Non-blocking behavior
- Concurrent requests

### 3. Database Tests (7 tests) - 2 minutes
```bash
npx vitest run tests/integration/database-write.test.js
```

**What it tests**: Real database operations
- Schema validation
- Index verification
- Concurrent writes
- Error handling

### 4. Response Structure Tests (6 tests) - 1 minute
```bash
npx vitest run src/api/__tests__/response-structure-validation.test.js
```

**What it tests**: SDK response format validation
- Valid formats
- Missing fields detection
- Empty arrays
- Malformed structures

### 5. Error Handling Tests (6 tests) - 2 minutes
```bash
npx vitest run src/api/__tests__/analytics-error-handling.test.js
```

**What it tests**: Comprehensive error scenarios
- Database errors
- Constraint violations
- Async errors
- Stack trace logging

### 6. E2E Tests (9 tests) - 5 minutes
```bash
# Requires running API server
npm run dev & # Start API server
npx playwright test tests/e2e/analytics-writing.spec.ts
```

**What it tests**: Complete real-world flow
- Real API calls
- Real database writes
- Analytics dashboard
- Health endpoints

---

## 🎯 Expected Results

| Test Suite | Tests | Time | Status |
|------------|-------|------|--------|
| Unit | 14 | ~2min | ✅ Pass |
| Integration | 10 | ~3min | ✅ Pass |
| Database | 7 | ~2min | ✅ Pass |
| Response Structure | 6 | ~1min | ✅ Pass |
| Error Handling | 6 | ~2min | ✅ Pass |
| E2E | 9 | ~5min | ✅ Pass |
| **TOTAL** | **52** | **~15min** | **✅ 100%** |

---

## 🔍 Troubleshooting

### Tests Fail with "Cannot find module"
```bash
# Install missing dependencies
npm install --save-dev vitest @playwright/test supertest better-sqlite3
```

### E2E Tests Skip
```bash
# Start API server first
cd /workspaces/agent-feed/api-server
node server.js &

# Then run E2E tests
npx playwright test tests/e2e/analytics-writing.spec.ts
```

### Database Permission Errors
```bash
# Ensure database file is writable
chmod 666 database.db
```

### Tests Pass Locally But Fail in CI
```bash
# Check environment variables
echo $DB_PATH
echo $API_BASE_URL

# Ensure test database is created
npm run setup-test-db
```

---

## 📊 Verify Production Analytics

### 1. Check Analytics Health
```bash
curl http://localhost:3001/api/claude-code/analytics/health | jq
```

Expected response:
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "writerInitialized": true,
    "lastWrite": "2025-10-25T...",
    "totalRecords": 42
  }
}
```

### 2. Query Recent Analytics
```bash
curl http://localhost:3001/api/claude-code/analytics?timeRange=24h | jq
```

### 3. Check Database Directly
```sql
sqlite3 database.db <<EOF
SELECT
  COUNT(*) as total_records,
  SUM(totalTokens) as total_tokens,
  SUM(estimatedCost) as total_cost,
  MAX(timestamp) as last_write
FROM token_analytics
WHERE DATE(timestamp) = DATE('now');
EOF
```

### 4. Monitor Logs
```bash
tail -f logs/combined.log | grep "TokenAnalyticsWriter"
```

Look for:
- ✅ "writeTokenMetrics completed successfully"
- ✅ "Token analytics record written successfully"
- ❌ "Failed to write token analytics" (indicates problem)

---

## 🐛 Debug Mode

### Enable Verbose Logging
```bash
# Run tests with full console output
npx vitest run --reporter=verbose src/services/__tests__/TokenAnalyticsWriter.test.js
```

### Watch Mode (Development)
```bash
# Auto-rerun tests on file changes
npx vitest watch src/services/__tests__/TokenAnalyticsWriter.test.js
```

### Run Single Test
```bash
# Use --grep to run specific test
npx vitest run --grep "calculates correct cost" src/services/__tests__/TokenAnalyticsWriter.test.js
```

---

## 📝 Test Coverage Report

```bash
# Generate coverage report
npx vitest run --coverage

# View HTML report
open coverage/index.html
```

---

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: ./scripts/run-analytics-tests.sh
```

---

## 📚 Test File Locations

```
/workspaces/agent-feed/
├── src/
│   ├── services/__tests__/TokenAnalyticsWriter.test.js
│   └── api/__tests__/
│       ├── analytics-tracking-integration.test.js
│       ├── response-structure-validation.test.js
│       └── analytics-error-handling.test.js
├── tests/
│   ├── integration/database-write.test.js
│   └── e2e/analytics-writing.spec.ts
└── scripts/run-analytics-tests.sh
```

---

## 🎓 Understanding Test Output

### ✅ Passing Test
```
✓ Test 1: writeTokenMetrics with valid message writes to database (34ms)
```

### ❌ Failing Test
```
✗ Test 1: writeTokenMetrics with valid message writes to database (34ms)
  → expected "log" to be called with arguments: [ StringContaining{…} ]
```

### ⏭️ Skipped Test
```
⊘ Test 9: E2E Tests (requires API server)
```

---

## 🚨 Common Errors

### Error: Database locked
```
Solution: Close all database connections before running tests
```

### Error: Port already in use
```
Solution: Stop existing API server or change port
lsof -ti:3001 | xargs kill -9
```

### Error: Module not found
```
Solution: Install dependencies
npm install
```

---

## 📖 Further Reading

- [Full Test Summary](./CLAUDE-CODE-SDK-ANALYTICS-TDD-SUMMARY.md)
- [London School TDD Principles](./docs/london-school-tdd.md)
- [TokenAnalyticsWriter Source](./src/services/TokenAnalyticsWriter.js)
- [API Routes](./src/api/routes/claude-code-sdk.js)

---

## ✨ Quick Commands Summary

```bash
# Run all tests
./scripts/run-analytics-tests.sh

# Run specific category
npx vitest run src/services/__tests__/TokenAnalyticsWriter.test.js

# Watch mode
npx vitest watch

# Coverage report
npx vitest run --coverage

# E2E tests
npx playwright test tests/e2e/analytics-writing.spec.ts

# Check production health
curl http://localhost:3001/api/claude-code/analytics/health
```

---

**Created**: 2025-10-25
**Status**: ✅ Ready to use
**Total Tests**: 52
**Total Time**: ~15 minutes
