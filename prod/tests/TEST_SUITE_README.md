# Skill Detection Bug Fix - Comprehensive Test Suite

## Overview

This test suite validates the skill detection optimization that fixes the token budget issue when processing simple queries like "what is 500+343?". The fix ensures Avi loads only relevant skills instead of all available skills.

## Test Files Created

### 1. Unit Tests
**File**: `/workspaces/agent-feed/prod/tests/unit/skill-detection-fix.test.js`

**Coverage**: 40+ test cases across 7 test suites
- extractUserQuery() with 4 extraction strategies
- Skill detection for simple queries (≤2 skills)  
- Skill detection for complex queries (3-4 skills)
- Prompt size validation (>200KB rejection)
- Edge cases (special chars, emojis, multilingual, code blocks)
- Performance metrics (<1s execution)

**Run Command**:
```bash
cd /workspaces/agent-feed/prod
npm test tests/unit/skill-detection-fix.test.js
```

### 2. Integration Tests
**File**: `/workspaces/agent-feed/prod/tests/integration/simple-query-fix.test.js`

**Coverage**: 20+ test cases across 5 test suites
- End-to-end query processing
- Token count verification (<10,000 tokens)
- Skill count optimization (≤2 for simple, 3-4 for complex)
- Real-world query variations
- Performance consistency (5 iterations)
- Concurrent request handling (5 parallel)
- Error handling for malformed inputs

**Run Command**:
```bash
cd /workspaces/agent-feed/prod
npm test tests/integration/simple-query-fix.test.js
```

### 3. E2E Tests
**File**: `/workspaces/agent-feed/prod/tests/e2e/skill-detection-ui.spec.js`

**Coverage**: 7 test scenarios with UI automation
- Simple math query through UI
- Complex multi-domain queries
- Loading states and UI feedback
- Multiple sequential queries
- Error handling for invalid inputs
- Response time measurement
- Visual verification via screenshots

**Run Command**:
```bash
cd /workspaces/agent-feed/prod
npx playwright test tests/e2e/skill-detection-ui.spec.js

# With UI mode
npx playwright test tests/e2e/skill-detection-ui.spec.js --ui

# With headed browser
npx playwright test tests/e2e/skill-detection-ui.spec.js --headed
```

## Quick Start Guide

### 1. Install Dependencies

```bash
cd /workspaces/agent-feed/prod

# Install Jest and Vitest (if not already installed)
npm install -D vitest @vitest/ui

# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Run All Tests

```bash
# Unit + Integration tests
npm test

# E2E tests only
npx playwright test

# All tests with coverage
npm test -- --coverage
```

### 3. Run Specific Test Suites

```bash
# Unit tests only
npm test tests/unit/skill-detection-fix.test.js

# Integration tests only
npm test tests/integration/simple-query-fix.test.js

# E2E tests only
npx playwright test tests/e2e/skill-detection-ui.spec.js
```

## Test Execution Patterns

### Development Workflow

1. **Red Phase** - Run tests (should fail initially):
```bash
npm test skill-detection-fix.test.js
```

2. **Green Phase** - Implement fix in skill-loader.js

3. **Refactor Phase** - Run all tests:
```bash
npm test
npx playwright test
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Unit & Integration Tests
  run: npm test -- --coverage

- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npx playwright test

- name: Upload Screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: test-screenshots
    path: tests/screenshots/
```

## Expected Test Results

### Unit Tests (40+ cases)
✅ All query extraction methods work correctly
✅ Simple queries load ≤2 skills  
✅ Complex queries load 3-4 skills
✅ Large prompts (>200KB) rejected
✅ Edge cases handled gracefully
✅ Performance <1s per test

### Integration Tests (20+ cases)
✅ Token count <10,000 for simple queries
✅ Correct skills loaded for each query type
✅ No race conditions with concurrent requests
✅ Graceful error handling for malformed inputs
✅ Performance consistency across iterations

### E2E Tests (7 scenarios)
✅ Simple query returns correct answer (843)
✅ Response appears within 30 seconds
✅ No error messages displayed
✅ Complex queries produce detailed responses
✅ Loading states work correctly
✅ Screenshots captured successfully

## Success Metrics

**Before Fix (Baseline)**:
- All skills loaded for "what is 500+343?" (~50+ skills)
- Token count: ~150,000+ tokens
- Context window exceeded error

**After Fix (Target)**:
- Only 2 skills loaded for simple math
- Token count: <10,000 tokens
- Successful response with answer "843"

**Performance Targets**:
- Unit test execution: <1s per test
- Integration test execution: <2s per test  
- E2E test execution: <30s response time
- Total test suite: <5 minutes

## Test Outputs

### Screenshots (E2E)
Location: `/workspaces/agent-feed/prod/tests/screenshots/`

Generated files:
- `initial-state.png` - Application initial state
- `before-send.png` - Before sending query
- `simple-query-success.png` - Simple query result
- `complex-query-success.png` - Complex query result
- `loading-state.png` - Loading indicator
- `sequence-1.png`, `sequence-2.png`, etc.
- `error-handling.png` - Error states
- `timeout-debug.png` - If timeout occurs

### Test Reports
- **HTML Report**: `/tests/screenshots/html-report/index.html`
- **JSON Report**: `/tests/screenshots/results.json`
- **Console**: Detailed logs with metrics

### Coverage Reports
```bash
npm test -- --coverage

# Coverage thresholds:
# - Statements: 80%+
# - Branches: 75%+
# - Functions: 80%+
# - Lines: 80%+
```

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
```bash
cd /workspaces/agent-feed/prod
npm install
```

**2. Playwright browser not found**
```bash
npx playwright install chromium
```

**3. E2E tests timeout**
- Ensure dev server is running: `npm run dev`
- Check BASE_URL: `http://localhost:3000`
- Increase timeout in `playwright.config.js`

**4. Integration tests fail with SkillLoader error**
- Verify `/api-server/worker/skill-loader.js` exists
- Check skill definitions in `/api-server/skills/`
- Validate file paths are correct

**5. Tests pass locally but fail in CI**
- Check Node.js version compatibility
- Verify all dependencies installed
- Review CI environment variables
- Check file path differences (Windows vs Linux)

## Advanced Usage

### Debug Mode

```bash
# Unit/Integration with verbose output
npm test -- --reporter=verbose

# E2E with browser visible
npx playwright test --headed

# E2E with step-by-step debugging
npx playwright test --debug

# E2E with interactive UI
npx playwright test --ui
```

### Watch Mode

```bash
# Auto-run tests on file changes
npm test -- --watch

# Watch specific file
npm test skill-detection-fix.test.js -- --watch
```

### Test Filtering

```bash
# Run tests matching pattern
npm test -- --grep "simple math"

# Run only E2E tests for simple queries
npx playwright test -g "simple math"

# Run tests in specific file
npm test -- skill-detection-fix
```

## Test Coverage Map

| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| extractUserQuery() | ✅ | ✅ | ✅ |
| loadSkillsForRequest() | ✅ | ✅ | ✅ |
| Simple query handling | ✅ | ✅ | ✅ |
| Complex query handling | ✅ | ✅ | ✅ |
| Prompt size validation | ✅ | ✅ | ❌ |
| Token count optimization | ❌ | ✅ | ✅ |
| UI interaction | ❌ | ❌ | ✅ |
| Loading states | ❌ | ❌ | ✅ |
| Error messages | ✅ | ✅ | ✅ |
| Performance metrics | ✅ | ✅ | ✅ |

## Related Files

**Implementation**:
- `/api-server/worker/skill-loader.js` - Main fix implementation
- `/api-server/worker/agent-worker.js` - Worker integration
- `/api-server/worker/token-estimator.js` - Token counting

**Frontend**:
- `/frontend/src/components/Chat.jsx` - Chat UI
- `/frontend/src/services/socket.js` - WebSocket connection

**Configuration**:
- `/prod/package.json` - Test scripts
- `/tests/e2e/playwright.config.js` - Playwright config
- `/tests/jest.config.js` - Jest config

## Maintenance

### Adding New Tests

1. Choose appropriate test type (unit/integration/E2E)
2. Follow existing test structure and naming
3. Add descriptive test names and console logs
4. Include assertions for all success criteria
5. Capture screenshots for visual tests
6. Update this README with new coverage

### Updating Test Thresholds

If requirements change:
1. Update success criteria in test files
2. Update expected metrics in this README
3. Document reason for changes
4. Run full test suite to validate

### Test Data Management

- **Fixtures**: `/tests/fixtures/` - Test data files
- **Mocks**: `/tests/mocks/` - Mock implementations
- **Screenshots**: Auto-generated, can be deleted

## Contributing

When modifying tests:
1. Ensure all tests still pass
2. Maintain test coverage levels
3. Update documentation
4. Add new test cases for new features
5. Follow existing patterns and conventions

## Support

- **Bug Reports**: Include test failure logs and screenshots
- **Feature Requests**: Provide test scenarios
- **Questions**: Reference specific test file and line number

---

**Test Suite Status**: ✅ Ready to Execute
**Last Updated**: 2025-10-30
**Total Test Cases**: 67+ (40 unit + 20 integration + 7 E2E)
