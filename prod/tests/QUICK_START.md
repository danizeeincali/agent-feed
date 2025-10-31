# Quick Start - Test Execution Guide

## Immediate Test Execution Commands

### Run All Tests (Recommended First Step)

```bash
cd /workspaces/agent-feed/prod

# Run unit + integration tests
npm test

# Run E2E tests
npx playwright test tests/e2e/skill-detection-ui.spec.js
```

## Individual Test Suites

### 1. Unit Tests (Fast - ~5 seconds)

```bash
# Run all unit tests for skill detection fix
npm test tests/unit/skill-detection-fix.test.js

# With verbose output
npm test tests/unit/skill-detection-fix.test.js -- --reporter=verbose
```

**What it tests:**
- ✅ extractUserQuery() with all 4 extraction methods
- ✅ Simple query skill detection (≤2 skills)
- ✅ Complex query skill detection (3-4 skills)
- ✅ Prompt size validation (>200KB rejection)
- ✅ Edge cases and performance

### 2. Integration Tests (Medium - ~10 seconds)

```bash
# Run integration tests with real SkillLoader
npm test tests/integration/simple-query-fix.test.js

# With coverage
npm test tests/integration/simple-query-fix.test.js -- --coverage
```

**What it tests:**
- ✅ End-to-end query processing
- ✅ Token count optimization (<10,000)
- ✅ Real-world query variations
- ✅ Concurrent request handling
- ✅ Error handling

### 3. E2E Tests (Slow - ~30-60 seconds)

```bash
# Run E2E tests with browser automation
npx playwright test tests/e2e/skill-detection-ui.spec.js

# With visible browser (debug mode)
npx playwright test tests/e2e/skill-detection-ui.spec.js --headed

# With interactive UI
npx playwright test tests/e2e/skill-detection-ui.spec.js --ui

# View test report after
npx playwright show-report tests/screenshots/html-report
```

**What it tests:**
- ✅ Simple math query through UI ("what is 500+343?")
- ✅ Complex multi-domain queries
- ✅ Loading states
- ✅ Response verification (contains "843")
- ✅ Visual screenshots

## Installation (If Not Already Installed)

```bash
cd /workspaces/agent-feed/prod

# Install test dependencies
npm install -D vitest @vitest/ui @playwright/test

# Install Playwright browsers
npx playwright install chromium
```

## Expected Output

### Unit Tests Success
```
✓ tests/unit/skill-detection-fix.test.js (40 tests)
  Skill Detection Fix - Unit Tests
    ✓ extractUserQuery() - Conversation History Parsing (7 tests)
    ✓ Skill Detection for Simple Math Queries (2 tests)
    ✓ Skill Detection for Complex Queries (2 tests)
    ✓ Prompt Size Validation (3 tests)
    ✓ Edge Cases (4 tests)
    ✓ Performance Metrics (2 tests)

Test Files  1 passed (1)
Tests       40 passed (40)
Duration    2.5s
```

### Integration Tests Success
```
✓ tests/integration/simple-query-fix.test.js (20 tests)
  Simple Query Fix - Integration Tests
    ✓ End-to-End Simple Math Query (4 tests)
    ✓ Real-World Query Scenarios (2 tests)
    ✓ Performance Validation (2 tests)
    ✓ Error Handling (3 tests)

Test Files  1 passed (1)
Tests       20 passed (20)
Duration    8.3s
```

### E2E Tests Success
```
Running 7 tests using 1 worker

✓ tests/e2e/skill-detection-ui.spec.js (7 tests)
  Skill Detection UI - E2E Tests
    ✓ Simple math query through UI - "what is 500+343?" (15s)
    ✓ Complex query through UI - multi-domain request (18s)
    ✓ Loading states and UI feedback (8s)
    ✓ Multiple queries in sequence (25s)
    ✓ Error handling - invalid input (5s)
  Performance Metrics
    ✓ Measure response time for simple query (12s)

7 passed (1m 23s)
```

## Screenshots Location

After E2E tests run, check:
```bash
ls -la /workspaces/agent-feed/prod/tests/screenshots/

# You should see:
# - initial-state.png
# - before-send.png
# - simple-query-success.png
# - complex-query-success.png
# - loading-state.png
# - sequence-1.png, sequence-2.png, etc.
```

## Troubleshooting

### "Cannot find module" Error
```bash
cd /workspaces/agent-feed/prod
npm install
```

### Playwright Browser Not Found
```bash
npx playwright install chromium
```

### Tests Timeout (E2E)
```bash
# Make sure dev server is running
npm run dev

# In another terminal, run tests
npx playwright test
```

### All Tests Fail Immediately
```bash
# Check you're in the right directory
pwd  # Should show: /workspaces/agent-feed/prod

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps After Tests Pass

1. ✅ Review test coverage report
2. ✅ Check screenshots for visual verification
3. ✅ Run tests in CI/CD pipeline
4. ✅ Monitor production metrics after deployment

## Test Verification Checklist

- [ ] Unit tests pass (all 40+ tests)
- [ ] Integration tests pass (all 20+ tests)
- [ ] E2E tests pass (all 7 scenarios)
- [ ] Screenshots captured successfully
- [ ] Token count <10,000 for simple queries
- [ ] Response contains correct answer (843)
- [ ] No error messages in UI
- [ ] Performance meets targets (<30s response)

## Support

For detailed documentation, see:
- `/workspaces/agent-feed/prod/tests/TEST_SUITE_README.md` - Full test suite documentation
- `/workspaces/agent-feed/prod/tests/unit/skill-detection-fix.test.js` - Unit test source
- `/workspaces/agent-feed/prod/tests/integration/simple-query-fix.test.js` - Integration test source
- `/workspaces/agent-feed/prod/tests/e2e/skill-detection-ui.spec.js` - E2E test source

---

**Ready to Run**: ✅ All test files created and ready for execution
**Total Test Cases**: 67+ comprehensive test scenarios
**Estimated Total Runtime**: 2-5 minutes for full suite
