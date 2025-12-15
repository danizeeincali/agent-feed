# 🧪 Regression Test Suite

Comprehensive regression testing for agent-feed API to ensure no features break during development.

---

## Quick Start

```bash
# Run regression tests
npm test -- tests/regression/full-regression-suite.test.js

# Run with verbose output
npm test -- tests/regression/full-regression-suite.test.js --reporter=verbose
```

---

## Test Suite Overview

### 📁 Files
- `full-regression-suite.test.js` - Main regression test suite (597 lines, 19 tests)
- `REGRESSION-TEST-REPORT.md` - Latest test execution report

### 🎯 Coverage
- **Total Tests**: 19
- **Categories**: 8
- **Duration**: ~1.6s

---

## Test Categories

### 1. 🔍 Nested Message Extraction (3 tests)
Verifies agent responses extract content from complex SDK structures.

**Critical for**:
- Preventing "No summary available" errors
- Handling nested `message.content` arrays
- Multi-block content extraction

### 2. 🚫 Duplicate Prevention (2 tests)
Ensures only one ticket per agent per post.

**Critical for**:
- Preventing duplicate AVI responses
- Avoiding redundant agent work
- Service-layer deduplication

### 3. 💬 Comment Creation (2 tests)
Verifies core comment functionality.

**Critical for**:
- User interactions
- Agent responses
- Comment threading

### 4. 🔗 URL Processing (2 tests)
Tests link-logger agent ticket creation.

**Critical for**:
- URL detection
- Ticket routing
- Agent assignments

### 5. 📡 WebSocket Broadcasts (2 tests)
Verifies real-time event emission.

**Critical for**:
- Live updates
- Event payloads
- Client synchronization

### 6. 🎯 Context Enhancement (2 tests)
Tests new context-aware prompts.

**Critical for**:
- Conversational responses
- Thread awareness
- Improved UX

### 7. 🔧 System Integrity (3 tests)
Database constraints and validation.

**Critical for**:
- Data integrity
- Foreign keys
- Status transitions

### 8. 📊 Performance & Edge Cases (3 tests)
Stress tests and edge case handling.

**Critical for**:
- Large content
- Special characters
- Concurrent operations

---

## When to Run

### ✅ Always Run Before:
1. Merging PRs
2. Production deployments
3. Major refactoring
4. Database schema changes

### ✅ Run After:
1. Fixing critical bugs
2. Adding new features
3. Updating dependencies
4. Changing core logic

---

## Test Execution Results

**Latest Run**: 2025-10-28 22:05:19 UTC

```
✅ All 19 tests passing
⏱️  Duration: 1.63s
📊 Coverage: 8 categories
🎯 Status: READY FOR PRODUCTION
```

---

## Adding New Regression Tests

### Template

```javascript
describe('🆕 New Feature Name', () => {
  it('should verify critical behavior', async () => {
    // Arrange
    const testData = setupTestData();

    // Act
    const result = await executeFeature(testData);

    // Assert
    expect(result).toBeTruthy();
    expect(result.status).toBe('success');

    console.log('✅ New feature verified');
  });
});
```

### Best Practices
1. Use descriptive test names
2. Test both success and failure cases
3. Include edge cases
4. Verify data integrity
5. Check performance implications

---

## Test Data Management

### Database
- Tests use isolated SQLite database: `data/test-regression.db`
- Cleaned before each run
- Full schema created in `beforeAll()`
- Deleted in `afterAll()`

### Test Isolation
- Each test category is independent
- No shared state between tests
- Unique IDs prevent conflicts
- Proper cleanup after failures

---

## Debugging Failed Tests

### Step 1: Identify the Failure
```bash
npm test -- tests/regression/full-regression-suite.test.js
```

### Step 2: Run Specific Test
```bash
npm test -- tests/regression/full-regression-suite.test.js -t "test name"
```

### Step 3: Check Logs
- Console output shows detailed errors
- Database state logged
- Stack traces included

### Step 4: Verify Fix
```bash
npm test -- tests/regression/full-regression-suite.test.js
```

---

## Common Issues

### Issue: Database locked
**Solution**: Delete `data/test-regression.db` and retry

### Issue: Timeout errors
**Solution**: Increase timeout in vitest.config.js

### Issue: Foreign key constraint failed
**Solution**: Check test data setup order

### Issue: Method not found
**Solution**: Verify repository API hasn't changed

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- tests/regression/full-regression-suite.test.js
```

---

## Maintenance

### Weekly
- ✅ Review test coverage
- ✅ Update test data
- ✅ Check for flaky tests

### Monthly
- ✅ Review and update documentation
- ✅ Add new test cases for new features
- ✅ Remove obsolete tests

### Quarterly
- ✅ Performance baseline review
- ✅ Test suite optimization
- ✅ Coverage gap analysis

---

## Metrics & Monitoring

### Current Metrics
- **Pass Rate**: 100%
- **Execution Time**: 1.63s
- **Code Coverage**: Core features
- **Reliability**: Stable

### Target Metrics
- Pass Rate: ≥ 99%
- Execution Time: < 5s
- Code Coverage: ≥ 80%
- Flake Rate: < 1%

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Better-SQLite3 API](https://github.com/WiseLibs/better-sqlite3)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Related Files
- `/workspaces/agent-feed/api-server/vitest.config.js`
- `/workspaces/agent-feed/api-server/repositories/work-queue-repository.js`
- `/workspaces/agent-feed/api-server/worker/agent-worker.js`

---

## Contact & Support

**Maintained by**: Development Team
**Last Updated**: 2025-10-28
**Version**: 1.0.0

For issues or questions:
1. Check this README
2. Review test report
3. Check Git history
4. Contact team lead

---

**Remember**: Regression tests are your safety net. Keep them green! 🟢
