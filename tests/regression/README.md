# Agent Feed Regression Test Suite

Comprehensive regression tests for the agent-feed application, covering all critical functionality including API endpoints, UI components, authentication, data validation, cost tracking, and end-to-end workflows.

## Overview

This test suite validates that the agent-feed application maintains its functionality and performance characteristics across code changes. It includes:

- **API Regression Tests**: Validates all agent-related API endpoints
- **UI Component Tests**: Tests React components and user interface functionality
- **Security & Authentication Tests**: Validates security measures and access controls
- **Data Validation Tests**: Ensures data integrity and validation rules
- **Cost Tracking Tests**: Tests token analytics and cost tracking functionality
- **End-to-End Workflow Tests**: Validates complete user workflows using Playwright
- **Performance & Reliability Tests**: Tests system performance under various conditions

## Test Categories

### 1. API Endpoints (`api/agent-endpoints.test.js`)
- Tests `/api/agents` endpoint functionality
- Validates response structure and data integrity
- Tests error handling and edge cases
- Validates performance and concurrency handling
- **Priority**: High | **Category**: Integration

### 2. UI Components (`ui/component-validation.test.jsx`)
- Tests Agents page React component
- Validates loading states and error handling
- Tests responsive design and accessibility
- Validates component props and state management
- **Priority**: High | **Category**: Unit

### 3. Security & Authentication (`security/auth-validation.test.js`)
- Tests security headers and CORS configuration
- Validates input sanitization and XSS prevention
- Tests rate limiting and DOS protection
- Validates data privacy and information disclosure prevention
- **Priority**: Critical | **Category**: Security

### 4. Data Validation (`data/validation-integrity.test.js`)
- Tests data structure consistency
- Validates field requirements and data types
- Tests data uniqueness and referential integrity
- Validates input sanitization and boundary conditions
- **Priority**: High | **Category**: Integration

### 5. Cost Tracking (`analytics/cost-tracking.test.js`)
- Tests CostTracker service functionality
- Validates token usage calculation and deduplication
- Tests session management and analytics
- Validates database operations and error handling
- **Priority**: Medium | **Category**: Unit

### 6. E2E Workflows (`e2e/workflow-integration.test.js`)
- Tests complete user workflows in browser
- Validates navigation and routing
- Tests performance and loading behavior
- Validates error handling and recovery
- **Priority**: High | **Category**: E2E

### 7. Performance & Reliability (`performance/reliability-tests.test.js`)
- Tests API response times and throughput
- Validates system behavior under load
- Tests memory usage and resource efficiency
- Validates network performance and reliability
- **Priority**: Medium | **Category**: Performance

## Test Infrastructure

### Configuration Files
- `jest.config.js`: Jest configuration for regression tests
- `jest.setup.js`: Global test setup and custom matchers
- `global-setup.js`: Environment setup before all tests
- `global-teardown.js`: Cleanup after all tests
- `test-sequencer.js`: Controls test execution order

### Custom Matchers
The test suite includes custom Jest matchers:
- `toBeValidAgent()`: Validates agent object structure
- `toBeValidApiResponse()`: Validates API response format
- `toHaveValidTokenUsage()`: Validates token usage data

### Test Utilities
Global utilities available in all tests:
- `testUtils.delay()`: Promise-based delay function
- `testUtils.retryAsync()`: Retry failed operations
- `testUtils.generateMockAgent()`: Create mock agent data
- `testUtils.generateMockTokenUsage()`: Create mock token usage data

## Running Tests

### Prerequisites
- Node.js 18+
- Jest testing framework
- Playwright for E2E tests (optional)
- Agent-feed application running on localhost:3000

### Quick Start
```bash
# Run all regression tests
npm run test:regression

# Or use the test runner directly
node tests/regression/run-regression-tests.js

# Run specific test category
npx jest --config tests/regression/jest.config.js --testPathPattern=api
npx jest --config tests/regression/jest.config.js --testPathPattern=ui
npx jest --config tests/regression/jest.config.js --testPathPattern=security
```

### Test Runner Options
```bash
# Run tests sequentially (default: parallel)
node tests/regression/run-regression-tests.js --no-parallel

# Disable coverage collection
node tests/regression/run-regression-tests.js --no-coverage

# Bail on first failure
node tests/regression/run-regression-tests.js --bail

# Quiet mode (less verbose output)
node tests/regression/run-regression-tests.js --quiet

# Custom timeout (in milliseconds)
node tests/regression/run-regression-tests.js --timeout=180000
```

### Environment Variables
```bash
# Test configuration
export TEST_BASE_URL=http://localhost:3000
export TEST_API_URL=http://localhost:3000/api
export TEST_DB_PATH=:memory:

# Enable real API testing (default: mock)
export ENABLE_REAL_API=true

# Enable browser-based E2E tests
export ENABLE_BROWSER_TESTS=true
```

## Test Results and Reporting

### Generated Artifacts
All test results and artifacts are saved to `tests/regression/artifacts/`:

- `regression-results-{timestamp}.json`: Detailed test results
- `regression-summary-{timestamp}.txt`: Human-readable summary
- `latest-results.json`: Symlink to most recent detailed results
- `latest-summary.txt`: Symlink to most recent summary
- Individual test suite results: `{suite-name}-results.json`

### Coverage Reports
Test coverage reports are generated in `coverage/regression/`:
- `lcov-report/index.html`: Interactive HTML coverage report
- `coverage-final.json`: Machine-readable coverage data

### Sample Output
```
🎯 Agent Feed Regression Test Suite
=====================================

🔍 Checking prerequisites...
  ✅ Node.js version: v18.17.0
  ✅ Jest installation: 29.7.0
  ✅ Project package.json: true
  ✅ Test directory: true

🛠️ Setting up test environment...
  📁 Created directory: tests/regression/artifacts
  ✅ Test environment ready

🚀 Starting comprehensive regression test suite...
📊 Total test suites: 7
⚡ Running tests in parallel...

🧪 Running API Endpoints tests...
  ✅ API Endpoints completed in 2847ms

🧪 Running UI Components tests...
  ✅ UI Components completed in 1532ms

...

╔════════════════════════════════════════════════════════════════╗
║                    REGRESSION TEST SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║ Total Test Suites:   7 │ Pass Rate: 100.00% │ Duration: 12s   ║
║ Passed:          7 │ Failed:       0 │ Errors:       0        ║
╠════════════════════════════════════════════════════════════════╣
║ CATEGORY BREAKDOWN:                                            ║
║ integration    : 3/3 (100%)                                   ║
║ unit          : 2/2 (100%)                                    ║
║ security      : 1/1 (100%)                                    ║
║ e2e           : 1/1 (100%)                                    ║
║ performance   : 1/1 (100%)                                    ║
╚════════════════════════════════════════════════════════════════╝

🏁 Test run completed with exit code: 0
🎉 All regression tests passed!
```

## Continuous Integration

### GitHub Actions
Add to `.github/workflows/regression-tests.yml`:

```yaml
name: Regression Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:regression
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: regression-test-results
          path: tests/regression/artifacts/
```

### Local Pre-commit Hook
Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "Running regression tests..."
npm run test:regression:quick || {
  echo "❌ Regression tests failed. Commit aborted."
  exit 1
}
```

## Maintenance and Updates

### Adding New Tests
1. Create test files in appropriate subdirectory (`api/`, `ui/`, etc.)
2. Follow existing naming convention: `*.test.js` or `*.test.jsx`
3. Update `run-regression-tests.js` to include new test suites
4. Add appropriate test data and mocks

### Updating Existing Tests
1. Modify test files directly
2. Update test expectations as application evolves
3. Maintain backward compatibility where possible
4. Update documentation for any breaking changes

### Performance Baselines
Performance tests include baseline expectations:
- API response time: < 2 seconds
- Concurrent request handling: 20 requests successfully
- Memory usage: < 100MB increase during stress testing
- E2E page load: < 5 seconds

Update these baselines as the application scales or requirements change.

## Troubleshooting

### Common Issues

**Jest out of memory errors**:
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run test:regression
```

**Playwright browser launch failures**:
```bash
npx playwright install
export ENABLE_BROWSER_TESTS=false  # Skip E2E tests
```

**API connection timeouts**:
```bash
# Ensure application is running
npm run dev &
sleep 10  # Wait for startup
npm run test:regression
```

**File permission errors**:
```bash
chmod +x tests/regression/run-regression-tests.js
```

### Debug Mode
Run tests with additional debugging:

```bash
DEBUG=* node tests/regression/run-regression-tests.js --verbose
```

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on state from other tests
2. **Mock External Dependencies**: Use mocks for external services and APIs
3. **Clear Test Names**: Use descriptive test names that explain what is being tested
4. **Regular Updates**: Keep tests updated as the application evolves
5. **Performance Monitoring**: Monitor test execution time and optimize slow tests
6. **Documentation**: Document any special test requirements or setup procedures

## Contributing

When adding new regression tests:

1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add appropriate error handling and edge case testing
4. Update this README with any new test categories or requirements
5. Ensure tests are deterministic and not flaky
6. Include performance expectations where appropriate

For questions or issues with the regression test suite, please check the troubleshooting section or contact the development team.