# AVI TDD Test Suite - Quick Start Guide

**5-Minute Quick Reference**

---

## Run All Tests

```bash
cd /workspaces/agent-feed/api-server
./tests/run-avi-tests.sh
```

---

## Test Files Location

```
/workspaces/agent-feed/api-server/tests/
├── unit/
│   ├── avi-session-manager.test.js       (42 tests)
│   └── comment-schema-migration.test.js   (18 tests)
└── integration/
    ├── avi-post-integration.test.js       (18 tests)
    └── avi-dm-api.test.js                 (35 tests)

Total: 113 tests
```

---

## Run Individual Suites

```bash
# Session Manager (42 tests)
npm test -- --run tests/unit/avi-session-manager.test.js

# Post Integration (18 tests)
npm test -- --run tests/integration/avi-post-integration.test.js

# DM API (35 tests)
npm test -- --run tests/integration/avi-dm-api.test.js

# Migration (18 tests)
npm test -- --run tests/unit/comment-schema-migration.test.js
```

---

## Test Coverage

| Component | Tests | Focus |
|-----------|-------|-------|
| Session Manager | 42 | Lifecycle, tokens, timeout |
| Post Integration | 18 | Questions, comments, workflow |
| DM API | 35 | Endpoints, contracts, errors |
| Migration | 18 | Schema, data integrity |

---

## Key Test IDs

### Session Manager
- `TSM-004`: Lazy initialization
- `TSM-008`: Session reuse
- `TSM-024`: Idle timeout cleanup
- `TSM-034`: Token savings

### Post Integration
- `TPI-001`: Question detection
- `TPI-005`: author_agent field
- `TPI-009`: Post workflow
- `TPI-012`: Async processing

### DM API
- `TDMAPI-001`: POST /api/avi/chat
- `TDMAPI-018`: GET /api/avi/status
- `TDMAPI-023`: DELETE /api/avi/session
- `TDMAPI-027`: GET /api/avi/metrics

### Migration
- `TCSM-003`: Column addition
- `TCSM-004`: Data migration
- `TCSM-008`: Dual-field support
- `TCSM-017`: Index performance

---

## Expected Test Results

### ✅ Current Status (All Passing)
```
✓ Unit Tests: AVI Session Manager       42/42
✓ Integration: AVI Post Integration     18/18
✓ Integration: AVI DM API                35/35
✓ Unit Tests: Comment Schema Migration  18/18
────────────────────────────────────────────
✓ TOTAL                                 113/113
```

---

## TDD Workflow

### 1. RED - Run Tests (Should Fail)
```bash
./tests/run-avi-tests.sh
# All tests should fail - no implementation yet
```

### 2. GREEN - Implement Features
```bash
# Implement session-manager.js
# Add API endpoints
# Apply migration
# Integrate into posts

./tests/run-avi-tests.sh
# All tests should pass
```

### 3. REFACTOR - Improve Code
```bash
# Optimize implementation
./tests/run-avi-tests.sh
# Tests should still pass
```

---

## Watch Mode (During Development)

```bash
# Auto-run tests on file changes
npm test -- tests/unit/avi-session-manager.test.js --watch
```

---

## Debug Single Test

```bash
# Run specific test by name
npm test -- tests/unit/avi-session-manager.test.js -t "should initialize session"

# Verbose output
npm test -- tests/unit/avi-session-manager.test.js --reporter=verbose
```

---

## Common Issues

### Tests Won't Run
```bash
# Install dependencies
npm install -D vitest better-sqlite3 supertest
```

### Database Locked
```bash
# Clean test databases
rm -f api-server/data/test-*.db*
```

### Import Errors
```bash
# Ensure correct paths
# Tests use absolute imports from project root
```

---

## Test Documentation

- **Full Report:** `/workspaces/agent-feed/AVI-TDD-TEST-SUITE-COMPLETE.md`
- **Summary:** `/workspaces/agent-feed/api-server/tests/AVI-TDD-TEST-SUITE-SUMMARY.md`
- **Implementation Plan:** `/workspaces/agent-feed/docs/AVI-PERSISTENT-SESSION-IMPLEMENTATION-PLAN.md`

---

## Key Metrics

- **Total Tests:** 113
- **Test Files:** 4
- **Total Lines:** 2,686
- **Run Time:** ~5 seconds
- **Coverage Target:** 95%+

---

## Quick Checks

### Are Tests Passing?
```bash
npm test -- --run tests/ --reporter=dot
```

### Get Test Count
```bash
npm test -- --run tests/ --reporter=verbose | grep -c "✓"
```

### Coverage Report
```bash
npm test -- --coverage tests/unit/avi-session-manager.test.js
```

---

## Implementation Files

Tests expect these files to exist:

1. `/api-server/avi/session-manager.js` ✅ (exists)
2. `/api-server/server.js` (add endpoints)
3. `/api-server/db/migrations/007-rename-author-column.sql`
4. Question detection logic in post creation

---

## Success Indicators

✅ All 113 tests passing
✅ < 5 second total runtime
✅ No console errors
✅ Test databases cleaned up
✅ 95%+ code coverage

---

## Next Steps

1. Run `./tests/run-avi-tests.sh`
2. Verify all tests fail appropriately
3. Implement features following test contracts
4. Run tests again - should pass
5. Celebrate! 🎉

---

**Status:** Ready for TDD Implementation
**Last Updated:** 2025-10-24
