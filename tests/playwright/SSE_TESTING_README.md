# SSE Streaming Validation Tests

## Overview

This directory contains comprehensive Playwright tests for validating Server-Sent Events (SSE) streaming functionality in the Claude instance management system. These tests specifically validate the SSE incremental output fix and ensure no message duplication occurs.

## Test Files

### 1. `sse-streaming-validation.spec.js`
Comprehensive SSE streaming validation tests covering:
- **Incremental Output Testing**: Validates that SSE messages are sent incrementally without duplication
- **High-Volume Output Handling**: Tests system behavior under high-volume command output
- **Buffer Management**: Ensures proper message chunking and buffer management
- **Connection Recovery**: Tests SSE connection recovery after interruption
- **Position Tracking**: Validates output position tracking for incremental sending
- **Buffer Accumulation Storm Prevention**: Specifically tests the fix for the original issue where output would accumulate and duplicate

### 2. `claude-instance-sse.spec.js`
Claude instance and frontend integration tests covering:
- **Instance Creation**: Tests Claude instance creation via frontend UI
- **SSE Connection Establishment**: Validates SSE connection setup and status
- **Terminal I/O Integration**: Tests terminal input/output via SSE
- **UI Rendering**: Validates terminal UI rendering with SSE data
- **Multiple Instance Types**: Tests different Claude instance configurations
- **Error Handling**: Tests error scenarios and recovery
- **Real-time Status Updates**: Validates instance status updates in UI

### 3. `run-sse-tests.js`
Test runner utility that:
- Checks backend and frontend service health
- Runs Playwright tests with proper configuration
- Generates test reports
- Provides colored console output for better readability

## Prerequisites

1. **Backend Service**: Must be running on `http://localhost:3000`
   ```bash
   cd /workspaces/agent-feed
   node simple-backend.js
   ```

2. **Frontend Service**: Must be running on `http://localhost:3001`
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   ```

3. **Dependencies**: Playwright and eventsource package
   ```bash
   npm install eventsource
   npx playwright install
   ```

## Running the Tests

### Quick Start
```bash
cd /workspaces/agent-feed/tests/playwright
./run-sse-tests.js
```

### Individual Test Files
```bash
# Run SSE streaming validation tests only
npx playwright test sse-streaming-validation.spec.js

# Run Claude instance SSE tests only
npx playwright test claude-instance-sse.spec.js

# Run specific test by name
npx playwright test --grep "should establish SSE connection"
```

### Advanced Options
```bash
# Run in headed mode (visible browser)
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Generate HTML report
npx playwright test --reporter=html

# Run specific browser
npx playwright test --project=chromium
```

## Test Scenarios Covered

### SSE Incremental Output Validation

1. **No Duplication Test**
   - Creates Claude instance
   - Sends multiple incremental commands
   - Validates each SSE message contains only new content
   - Ensures no repetition of previous output

2. **Buffer Accumulation Storm Prevention**
   - Tests the specific issue where output buffer would accumulate
   - Validates position-based incremental sending
   - Ensures output is sent only once per position

3. **High-Volume Output Handling**
   - Tests system with commands generating large output
   - Validates performance under load
   - Checks for proper message timing distribution

4. **Connection Recovery**
   - Tests SSE connection interruption and recovery
   - Validates data integrity after reconnection
   - Ensures no message loss during recovery

### Claude Instance Integration

1. **Instance Creation Flow**
   - Tests different Claude instance types
   - Validates UI button interactions
   - Ensures proper instance ID generation

2. **Real-time Communication**
   - Tests terminal input via UI
   - Validates output rendering in browser
   - Ensures bi-directional communication works

3. **Status Updates**
   - Tests instance status changes (starting → running → stopped)
   - Validates status display in UI
   - Ensures real-time status propagation

## Key Technical Validations

### Buffer Management
- **Position Tracking**: Each SSE message includes output position metadata
- **Incremental Sending**: Only new content since last position is sent
- **No Accumulation**: Output buffer doesn't accumulate and resend previous content

### Message Integrity
- **Ordering**: Messages arrive in correct chronological order
- **Structure**: Each SSE message has required fields (type, instanceId, timestamp, data)
- **Chunking**: Large output is properly chunked without corruption

### Connection Reliability
- **Auto-Recovery**: SSE connections recover gracefully from interruption
- **Multiple Connections**: Multiple SSE streams to same instance work correctly
- **Error Handling**: Network errors and timeouts are handled properly

## Test Configuration

### Timeouts
- **SSE Operations**: 30 seconds
- **Output Collection**: 5 seconds per test
- **Overall Test**: 2 minutes per test case

### Port Configuration
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001

### Browser Support
- Chromium (primary)
- Firefox
- WebKit/Safari
- Mobile Chrome (responsive testing)

## Expected Test Results

### Successful Test Run Should Show:
- ✅ All SSE connections establish successfully
- ✅ No duplicate messages detected
- ✅ Incremental output position tracking works
- ✅ High-volume output handled without performance issues
- ✅ Connection recovery works correctly
- ✅ UI integration renders terminal output properly
- ✅ Multiple instance types supported

### Common Issues and Solutions:

1. **Backend Not Running**
   ```
   Error: Backend not accessible
   Solution: Start backend with 'node simple-backend.js'
   ```

2. **Frontend Not Running**
   ```
   Error: Frontend not accessible
   Solution: Start frontend with 'cd frontend && npm run dev'
   ```

3. **SSE Connection Timeout**
   ```
   Error: SSE connection failed to establish
   Solution: Check backend SSE endpoints and CORS settings
   ```

4. **Test Failures Due to Timing**
   ```
   Solution: Increase timeout values in playwright.config.ts
   ```

## Debugging SSE Issues

### Enable Debug Logging
```bash
DEBUG=* npx playwright test sse-streaming-validation.spec.js
```

### Check SSE Messages Manually
```bash
# Test SSE endpoint directly
curl -N http://localhost:3000/api/v1/claude/test-instance/stream
```

### Browser Developer Tools
1. Open Network tab
2. Look for EventSource connections
3. Monitor SSE message flow
4. Check for duplicate or missing messages

## Performance Benchmarks

### Expected Performance Metrics:
- **Connection Establishment**: < 2 seconds
- **Message Delivery**: < 100ms per message
- **High-Volume Output**: Handle 100+ messages without degradation
- **Memory Usage**: No significant memory leaks during long runs

## Test Reports

After running tests, reports are available at:
- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results/results.json`
- **Console Output**: Real-time colored output during test execution

## Continuous Integration

For CI environments, use:
```bash
npx playwright test --reporter=junit:test-results/junit.xml
```

This ensures proper test result reporting in CI systems like GitHub Actions, Jenkins, etc.

## Troubleshooting

### Common Error Patterns:

1. **"SSE connection not established"**
   - Backend SSE endpoint not responding
   - Check if backend is running and endpoints are accessible

2. **"Message duplication detected"**
   - Indicates SSE incremental output fix is not working
   - Check backend `broadcastIncrementalOutput` function

3. **"Frontend UI not found"**
   - Frontend not running or UI elements missing
   - Verify frontend is built and running correctly

4. **"Instance creation timeout"**
   - Backend process creation taking too long
   - Check system resources and Claude installation

### Debug Commands:

```bash
# Check backend endpoints
curl http://localhost:3000/health

# List active Claude instances
curl http://localhost:3000/api/claude/instances

# Check SSE stream manually
curl -N http://localhost:3000/api/v1/claude/{instanceId}/stream
```

## Contributing

When adding new SSE tests:
1. Follow existing test structure and naming
2. Include proper cleanup in `finally` blocks
3. Add descriptive console logging for debugging
4. Test with different Claude instance types
5. Validate both success and error scenarios
6. Update this README with new test descriptions

## References

- [Playwright Testing Documentation](https://playwright.dev/docs/intro)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)