# HTTP 500 Error Testing Suite

Comprehensive test suite for HTTP 500 errors on button clicks and API endpoint failures.

## Overview

This test suite validates error handling across all layers of the application:

- **Backend API Tests**: Unit tests for server endpoint error scenarios
- **PTY Integration Tests**: Terminal process spawning and management failures  
- **E2E Button Click Tests**: Playwright tests for UI button interactions with server errors
- **React Error Boundary Tests**: Component error handling and user feedback
- **Mock Server Tests**: Simulated server failure scenarios
- **Network Timeout Tests**: Connection failures and timeout handling

## Test Structure

```
tests/http-500-error/
├── backend-api.test.js           # Backend API endpoint tests
├── pty-integration.test.js       # PTY terminal spawning tests
├── e2e-button-clicks.spec.ts     # Playwright E2E button tests
├── react-error-boundary.test.tsx # React component error tests
├── mock-server.test.js           # Mock server failure tests
├── network-timeout.test.js       # Network failure tests  
├── terminal-spawn-validation.test.js # Process validation tests
├── jest.config.js                # Jest configuration
├── playwright.config.ts          # Playwright configuration
├── setup.js                      # Global test setup
└── README.md                     # This file
```

## Test Coverage

### API Endpoints Tested
- `GET /api/claude/check` - Claude CLI availability
- `POST /api/claude/launch` - Process launch
- `POST /api/claude/stop` - Process termination  
- `GET /api/claude/status` - Process status

### Error Scenarios Covered

#### Backend Failures
- Process spawn failures (ENOENT, EACCES, ENOMEM)
- File system errors (ENOSPC, EMFILE)
- Permission denied errors
- Resource exhaustion
- PTY allocation failures

#### Network Issues
- Connection timeouts (ECONNABORTED)
- DNS resolution failures (ENOTFOUND)
- Connection refused (ECONNREFUSED)
- Network unreachable (ENETUNREACH)
- Socket hang up (ECONNRESET)

#### UI Error Handling
- Button click error responses
- Loading state management
- Error message display
- Recovery mechanisms
- Error boundary catching

#### Process Management
- Terminal spawn validation
- Process lifecycle errors
- WebSocket connection failures
- Concurrent operation handling

## Running the Tests

### Prerequisites

```bash
npm install
```

### Run All HTTP 500 Error Tests

```bash
# Jest tests
npm test -- --config tests/http-500-error/jest.config.js

# Playwright E2E tests  
npx playwright test --config tests/http-500-error/playwright.config.ts

# Run all tests with coverage
npm run test:http-500-errors
```

### Run Specific Test Categories

```bash
# Backend API tests only
npm test -- tests/http-500-error/backend-api.test.js

# PTY integration tests
npm test -- tests/http-500-error/pty-integration.test.js

# React component tests
npm test -- tests/http-500-error/react-error-boundary.test.tsx

# E2E button click tests
npx playwright test tests/http-500-error/e2e-button-clicks.spec.ts

# Network timeout tests
npm test -- tests/http-500-error/network-timeout.test.js

# Terminal spawn validation
npm test -- tests/http-500-error/terminal-spawn-validation.test.js

# Mock server tests
npm test -- tests/http-500-error/mock-server.test.js
```

### Debug Mode

```bash
# Run with debug output
DEBUG=1 npm test -- tests/http-500-error/

# Run Playwright in headed mode
npx playwright test --headed --config tests/http-500-error/playwright.config.ts

# Run with Playwright debug mode
npx playwright test --debug tests/http-500-error/e2e-button-clicks.spec.ts
```

## Test Configuration

### Jest Configuration
- **Environment**: Node.js for backend tests, jsdom for React tests
- **Coverage**: 80% threshold across branches, functions, lines, statements
- **Timeout**: 30 seconds per test
- **Projects**: Separate configurations for different test types

### Playwright Configuration  
- **Browsers**: Chrome, Firefox, Safari (desktop and mobile)
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries in CI, 1 locally
- **Screenshots**: On failure only
- **Video**: Retain on failure

## Error Validation

### HTTP Status Codes Tested
- `500 Internal Server Error`
- `502 Bad Gateway` 
- `503 Service Unavailable`
- `504 Gateway Timeout`

### System Error Codes Tested
- **ENOENT**: No such file or directory
- **EACCES**: Permission denied
- **ENOMEM**: Out of memory
- **ENOSPC**: No space left on device
- **EMFILE**: Too many open files
- **EAGAIN**: Resource temporarily unavailable
- **ECONNABORTED**: Request timeout
- **ECONNREFUSED**: Connection refused
- **ENOTFOUND**: DNS lookup failed
- **ENETUNREACH**: Network unreachable

## Test Data

### Mock Response Patterns
```javascript
// 500 Error Response
{
  success: false,
  error: "Process spawn failed",
  message: "Failed to launch Claude",
  code: "ENOENT"
}

// Timeout Response
{
  success: false, 
  error: "Request timeout",
  message: "Claude service did not respond in time"
}
```

### Process Mock Data
```javascript
{
  pid: 12345,
  killed: false,
  status: 'error',
  error: 'Process execution failed',
  startedAt: '2025-01-XX',
  workingDirectory: '/prod'
}
```

## Validation Criteria

### Backend Tests
- ✅ All API endpoints return appropriate 500 errors
- ✅ Error messages are descriptive and actionable
- ✅ Process cleanup occurs on failures
- ✅ Resource limits are respected

### Frontend Tests  
- ✅ Button clicks handle 500 responses gracefully
- ✅ Loading states are managed correctly
- ✅ Error messages are displayed to users
- ✅ UI remains responsive after errors
- ✅ Recovery mechanisms work properly

### Integration Tests
- ✅ PTY allocation failures are handled
- ✅ Terminal sessions clean up properly
- ✅ WebSocket errors don't crash the application
- ✅ Concurrent operations are managed safely

### Network Tests
- ✅ Timeout scenarios are handled gracefully
- ✅ Connection failures trigger appropriate fallbacks
- ✅ Retry logic works with exponential backoff
- ✅ Circuit breaker patterns prevent cascading failures

## Continuous Integration

### Test Execution
```yaml
# Example CI configuration
test-http-500-errors:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run HTTP 500 error tests
      run: |
        npm test -- --config tests/http-500-error/jest.config.js --coverage
        npx playwright test --config tests/http-500-error/playwright.config.ts
    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: http-500-test-results
        path: |
          coverage/
          test-results/
          playwright-report/
```

### Coverage Reports
- **HTML Report**: `coverage/http-500-errors/index.html`
- **LCOV Report**: `coverage/http-500-errors/lcov.info`
- **JUnit XML**: `test-results/http-500-error-junit.xml`

## Debugging Failed Tests

### Common Issues
1. **Server not running**: Ensure backend servers are started
2. **Port conflicts**: Check if ports 3000, 3001, 3002 are available
3. **Timeout failures**: Increase timeout values for slow systems
4. **Mock failures**: Verify mock implementations match actual API

### Debug Commands
```bash
# Check server status
curl http://localhost:3001/api/simple-claude/health

# Run single test with verbose output
npm test -- tests/http-500-error/backend-api.test.js --verbose

# Run Playwright test with trace
npx playwright test --trace on tests/http-500-error/e2e-button-clicks.spec.ts
```

## Contributing

When adding new HTTP 500 error tests:

1. **Follow naming conventions**: `*-http-500*.test.{js,ts}`
2. **Add appropriate mocks**: Use global test utilities
3. **Include error validation**: Verify error messages and codes
4. **Test cleanup**: Ensure resources are cleaned up
5. **Update documentation**: Add new scenarios to this README

## Maintenance

### Regular Updates
- Review error scenarios quarterly
- Update mock data to match API changes  
- Validate timeout values against production
- Check coverage thresholds remain appropriate

### Performance Monitoring
- Monitor test execution times
- Optimize slow tests
- Review flaky test patterns
- Update retry strategies as needed