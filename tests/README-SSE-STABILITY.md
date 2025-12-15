# SSE Stability Test Suite

Comprehensive test suite for validating Server-Sent Events (SSE) and WebSocket connection stability.

## Test Files

### 1. Quick Validation Test (30 seconds)
**File:** `/tests/integration/sse-stability-quick.js`

**Purpose:** Fast validation of SSE and Socket.IO connection stability

**Tests:**
- ✅ Socket.IO direct connection (no proxy)
- ✅ Connection stays open 30 seconds
- ✅ Zero "socket hang up" errors
- ✅ SSE connection stays open 30 seconds
- ✅ EventSource readyState = 1 (OPEN)
- ✅ Concurrent Socket.IO and SSE stability

**Run:**
```bash
# Direct execution
node tests/integration/sse-stability-quick.js

# With custom server URL
SERVER_URL=http://localhost:3001 node tests/integration/sse-stability-quick.js

# Via npm script
cd tests/integration && npm run test:quick
```

### 2. Full Stability Test (5 minutes)
**File:** `/tests/integration/sse-stability-full.js`

**Purpose:** Extended validation of connection stability and performance

**Tests:**
- ✅ Socket.IO connection stable 5 minutes
- ✅ SSE connection stable 5 minutes
- ✅ Receive SSE events (heartbeat, telemetry)
- ✅ Zero reconnection attempts
- ✅ Memory leak detection
- ✅ Performance degradation check
- ✅ Concurrent connection stability

**Run:**
```bash
# Direct execution
node tests/integration/sse-stability-full.js

# With custom server URL
SERVER_URL=http://localhost:3001 node tests/integration/sse-stability-full.js

# Via npm script
cd tests/integration && npm run test:full
```

### 3. Playwright E2E Test
**File:** `/tests/e2e/sse-stability-validation.spec.ts`

**Purpose:** Browser-based end-to-end validation

**Tests:**
- ✅ Browser console: zero WebSocket errors
- ✅ LiveActivityFeed shows "Connected" status
- ✅ SSE connection stable 2 minutes
- ✅ Screenshot proof of working UI
- ✅ Network tab: no failed requests
- ✅ Page refresh reconnection
- ✅ Multiple tabs stability
- ✅ Event latency under 500ms
- ✅ Memory stability check

**Run:**
```bash
# All E2E tests
cd tests/e2e && npx playwright test sse-stability-validation.spec.ts

# With UI mode
cd tests/e2e && npx playwright test --ui

# Headed mode (see browser)
cd tests/e2e && npx playwright test --headed

# Debug mode
cd tests/e2e && npx playwright test --debug

# Specific test
cd tests/e2e && npx playwright test -g "should show Connected status"
```

## Test Runner Script

**File:** `/scripts/run-sse-stability-tests.sh`

**Usage:**
```bash
# Run all tests (quick → full → e2e)
./scripts/run-sse-stability-tests.sh all

# Run only quick test
./scripts/run-sse-stability-tests.sh quick

# Run only full test
./scripts/run-sse-stability-tests.sh full

# Run only E2E tests
./scripts/run-sse-stability-tests.sh e2e

# With custom URLs
SERVER_URL=http://localhost:3001 \
FRONTEND_URL=http://localhost:5173 \
./scripts/run-sse-stability-tests.sh all
```

## Environment Variables

```bash
# Backend server URL
SERVER_URL=http://localhost:3001

# Frontend URL (for E2E tests)
FRONTEND_URL=http://localhost:5173
```

## Test Results

### Output Locations
- **Logs:** `/tests/results/sse-stability/*.log`
- **Screenshots:** `/tests/screenshots/sse-stability/*.png`
- **Reports:** `/tests/results/sse-stability/report-*.txt`

### Success Criteria

#### Quick Test (30s)
- ✅ Zero connection errors
- ✅ Zero "socket hang up" errors
- ✅ Socket.IO connected throughout
- ✅ SSE readyState = OPEN (1)
- ✅ Both connections concurrent

#### Full Test (5m)
- ✅ Zero reconnection attempts
- ✅ 28+ heartbeats sent
- ✅ SSE events received
- ✅ Memory growth < 50MB
- ✅ Zero state changes from OPEN

#### E2E Test
- ✅ Zero console errors
- ✅ "Connected" status visible
- ✅ Connection stable 2+ minutes
- ✅ Zero failed network requests
- ✅ Page refresh successful
- ✅ Multi-tab stability
- ✅ Event latency < 500ms

## Installation

### Prerequisites
```bash
# Node.js 18+
node --version

# Server running
npm run server

# Frontend running (for E2E tests)
npm run dev
```

### Install Dependencies
```bash
# Integration tests
cd tests/integration
npm install

# E2E tests
cd tests/e2e
npm install
npx playwright install chromium
```

## Debugging

### Enable Verbose Logging
```bash
# Socket.IO debug
DEBUG=socket.io-client:* node tests/integration/sse-stability-quick.js

# Node.js test runner verbose
NODE_OPTIONS='--trace-warnings' node tests/integration/sse-stability-quick.js
```

### Playwright Debugging
```bash
cd tests/e2e

# Open Playwright Inspector
npx playwright test --debug

# Show browser
npx playwright test --headed

# Slow down execution
npx playwright test --headed --slowMo=1000

# Trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Check Server Health
```bash
# Server health endpoint
curl http://localhost:3001/health

# SSE endpoint
curl -N http://localhost:3001/api/sse/claude-code-sdk/stream

# Socket.IO endpoint
curl http://localhost:3001/socket.io/
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: SSE Stability Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start server
        run: npm run server &

      - name: Wait for server
        run: npx wait-on http://localhost:3001/health

      - name: Run stability tests
        run: ./scripts/run-sse-stability-tests.sh all

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/screenshots/

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: tests/results/
```

## Troubleshooting

### "Server is not running"
```bash
# Start the server
npm run server

# Check if running
curl http://localhost:3001/health
```

### "Socket hang up" errors
- Check if Nginx/proxy is interfering
- Verify WebSocket upgrade headers
- Check connection timeout settings

### SSE readyState = 0 (CONNECTING)
- Server may not be sending SSE headers
- Check Content-Type: text/event-stream
- Verify Connection: keep-alive

### Tests timing out
- Increase test timeout in test files
- Check server logs for errors
- Verify network connectivity

### Memory growth > 50MB
- Check for event listener leaks
- Verify proper cleanup in afterEach
- Monitor server memory usage

## Performance Benchmarks

### Expected Results
- **Connection time:** < 1s
- **Heartbeat latency:** < 100ms
- **Event latency:** < 500ms
- **Memory growth:** < 50MB over 5 minutes
- **Reconnection time:** < 2s
- **Uptime:** > 99.5%

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use descriptive test names
3. Add proper error handling
4. Include cleanup in afterEach
5. Update this README
6. Add test to runner script

## License

MIT
