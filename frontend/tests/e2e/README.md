# E2E Tests for Single-Connection Architecture

This directory contains comprehensive end-to-end tests that verify the single-connection architecture without mocks, testing the actual application with real Claude AI responses.

## Test Structure

### Test Files

1. **`single-connection.spec.ts`** - Main E2E tests covering all single-connection scenarios
2. **`performance.spec.ts`** - Performance and load testing
3. **`test-helpers.ts`** - Shared utility functions and helpers
4. **`setup.ts`** - Global test setup and environment verification
5. **`run-tests.js`** - Test runner with service verification

### Test Scenarios

#### Core Single-Connection Tests

1. **Launch & Connect** - Creates instance and connects safely
2. **Multiple Instances** - Only one connection active at a time
3. **Connection Switching** - Switch connection between instances
4. **Clean Disconnection** - Disconnect button works properly
5. **Loop Prevention** - Prevents connection loops
6. **Command Execution** - Typing commands works after connection
7. **Real AI Responses** - Receives and displays real Claude responses

#### Performance Tests

1. **Connection Performance** - Measures connection establishment time
2. **UI Responsiveness** - Ensures UI remains responsive during operations
3. **Memory Stability** - Monitors memory usage during operations
4. **Concurrent Connections** - Tests handling of multiple simultaneous users
5. **WebSocket Throughput** - Measures message handling performance

## Running Tests

### Prerequisites

Before running E2E tests, ensure:

1. **Frontend server** is running on `localhost:3000`:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Backend server** is running on `localhost:3001`:
   ```bash
   node simple-backend.js
   ```

3. **Claude CLI** is available (optional but recommended for full tests)

### Test Commands

```bash
# Run all E2E tests with automatic service verification
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npm run test:e2e:specific single-connection.spec.ts

# Run with custom Playwright options
npx playwright test --config=playwright.config.js
```

### Test Configuration

The tests are configured via `playwright.config.js`:

- **Base URL**: `http://localhost:3000`
- **Parallel**: Disabled (required for single-connection testing)
- **Timeout**: 60 seconds (accommodates AI response times)
- **Retry**: 2 attempts on CI
- **Screenshots**: On failure
- **Videos**: On failure

## Key Features

### No Mocks Policy

These tests use **NO MOCKS**. They test:
- Real browser interactions
- Actual WebSocket connections
- Live Claude AI responses
- Real backend API calls
- Genuine connection state management

### Realistic Timeouts

The tests include realistic timeouts for AI interactions:
- **Claude Response**: 30 seconds (AI can take time to respond)
- **WebSocket Connection**: 10 seconds
- **Command Processing**: 5 seconds

### Test Data Selection

Tests use data-testid attributes for reliable element selection:
- `data-testid="launch-claude-button"`
- `data-testid="web-view-toggle"`
- `data-testid="terminal-view-toggle"`
- `data-testid="instance-card"`
- `data-testid="connect-button-{instanceId}"`
- `data-testid="disconnect-button-{instanceId}"`
- `data-testid="status-{instanceId}"`
- `data-testid="command-input"`
- `data-testid="send-command-button"`
- `data-testid="terminal-output"`

### Error Handling

Tests include comprehensive error handling:
- Service availability verification
- Connection failure scenarios
- UI error state validation
- Timeout handling
- Network error recovery

## Test Helpers

### Connection Management
- `waitForWebSocketConnection()` - Waits for connection establishment
- `waitForClaudeResponse()` - Waits for real AI responses
- `verifySingleConnection()` - Validates single connection enforcement

### Instance Management
- `createClaudeInstance()` - Creates new instances via UI
- `sendCommandSafely()` - Sends commands with validation
- `cleanupInstances()` - Cleans up test instances

### Monitoring
- `setupWebSocketMonitoring()` - Monitors WebSocket traffic
- `setupConsoleMonitoring()` - Monitors browser console

## Environment Setup

### Automatic Service Verification

The test runner automatically verifies:
1. Frontend service accessibility
2. Backend API availability
3. WebSocket endpoint functionality
4. Claude CLI availability (optional)

### CI/CD Integration

Tests are configured for CI environments:
- Service startup handling
- Retry logic for flaky connections
- Artifact collection (videos, screenshots)
- Detailed logging

## Debugging

### Debug Mode

Run tests in debug mode to:
```bash
npm run test:e2e:debug
```

This allows:
- Step-through debugging
- Browser DevTools access
- Real-time test execution
- Network traffic inspection

### Console Monitoring

Tests automatically monitor:
- Browser console errors
- WebSocket connection events
- Claude response patterns
- API call failures

### Artifacts

On test failures, artifacts are saved:
- Screenshots of failure states
- Video recordings of test execution
- Network traffic logs (HAR files)
- Browser console logs

## Best Practices

### Test Isolation

Each test:
- Starts with clean state
- Creates own instances
- Cleans up after execution
- Doesn't depend on other tests

### Real Data Usage

Tests use real:
- Claude AI responses
- WebSocket connections
- Backend API calls
- Browser interactions

### Performance Considerations

Tests monitor:
- Connection establishment time
- UI response times
- Memory usage patterns
- WebSocket message throughput

### Error Scenarios

Tests cover:
- Network failures
- Service unavailability
- Invalid responses
- Timeout conditions
- UI error states

## Troubleshooting

### Common Issues

1. **Services Not Running**
   - Ensure frontend and backend are started
   - Check port availability (3000, 3001)

2. **Claude CLI Unavailable**
   - Tests can run without Claude CLI
   - Some tests will be limited in functionality

3. **Connection Timeouts**
   - Increase timeout values for slow networks
   - Check WebSocket connectivity

4. **Flaky Tests**
   - Tests include retry logic
   - Check for race conditions
   - Verify test isolation

### Debug Information

Tests provide detailed logging:
- WebSocket connection events
- Claude response characteristics
- Performance metrics
- Error conditions

## Future Enhancements

Potential improvements:
1. Load testing with multiple concurrent users
2. Extended AI conversation scenarios
3. Cross-browser compatibility testing
4. Mobile device testing
5. Accessibility testing integration