# SSE Stability Test Suite - Execution Guide

## Quick Start

```bash
# 1. Install dependencies
cd /workspaces/agent-feed/tests/integration
npm install

cd /workspaces/agent-feed/tests/e2e
npm install
npx playwright install chromium

# 2. Start server
cd /workspaces/agent-feed
npm run server

# 3. Run tests
./scripts/run-sse-stability-tests.sh all
```

## Test Suite Overview

### 1️⃣ Quick Validation Test (30 seconds)
**File:** `/workspaces/agent-feed/tests/integration/sse-stability-quick.js`

**Purpose:** Fast smoke test to validate basic SSE and Socket.IO functionality

**What it tests:**
- Socket.IO connects directly (no proxy interference)
- Connection remains stable for 30 seconds
- Zero "socket hang up" errors
- SSE EventSource readyState = 1 (OPEN)
- Both connections can run concurrently

**Run:**
```bash
# Direct execution
cd /workspaces/agent-feed
node tests/integration/sse-stability-quick.js

# With custom server
SERVER_URL=http://localhost:3001 node tests/integration/sse-stability-quick.js

# Via script
./scripts/run-sse-stability-tests.sh quick
```

**Expected output:**
```
🚀 Starting SSE Stability Quick Validation Test
📊 Target server: http://localhost:3001
⏱️  Test duration: 30 seconds

✓ Socket.IO connected
  Heartbeat 1 sent (5.0s)
  Heartbeat 2 sent (10.0s)
...

--- Socket.IO Test Results ---
Duration: 30000ms
Connected: true
Heartbeats sent: 6
Errors: 0

✓ Socket.IO direct connection should stay open for 30 seconds with zero errors
✓ SSE connection should stay open for 30 seconds with readyState = OPEN
✓ Both Socket.IO and SSE should run concurrently without interference

All tests passed! ✅
```

### 2️⃣ Full Stability Test (5 minutes)
**File:** `/workspaces/agent-feed/tests/integration/sse-stability-full.js`

**Purpose:** Extended test to validate long-term stability and performance

**What it tests:**
- Socket.IO stability over 5 minutes
- SSE stability over 5 minutes
- Event reception (heartbeat, telemetry)
- Zero reconnection attempts
- Memory leak detection (< 50MB growth)
- Performance degradation detection

**Run:**
```bash
# Direct execution
cd /workspaces/agent-feed
node tests/integration/sse-stability-full.js

# With custom server
SERVER_URL=http://localhost:3001 node tests/integration/sse-stability-full.js

# Via script
./scripts/run-sse-stability-tests.sh full
```

**Expected output:**
```
🚀 Starting SSE Stability Full Test (5 minutes)
📊 Target server: http://localhost:3001
⏱️  Test duration: 300 seconds
💓 Heartbeat interval: 10 seconds
📊 Memory check interval: 30 seconds

✓ Socket.IO connected (attempt 1) at 0.1s
💓 Socket.IO heartbeat 1 at 10.0s
📊 Memory: 45.23 MB at 30.0s
...

--- Socket.IO Stability Test Results ---
Duration: 300.0s
Final state: Connected
Connects: 1
Disconnects: 0
Reconnects: 0
Heartbeats sent: 30
Errors: 0
Memory growth: 8.45 MB

✓ Socket.IO should maintain stable connection for 5 minutes
✓ SSE should maintain stable connection and receive events for 5 minutes
✓ Concurrent Socket.IO and SSE should both remain stable for 5 minutes

All tests passed! ✅
```

### 3️⃣ E2E Browser Tests (Playwright)
**File:** `/workspaces/agent-feed/tests/e2e/sse-stability-validation.spec.ts`

**Purpose:** Browser-based validation with real UI interaction

**What it tests:**
- Browser console has zero WebSocket errors
- LiveActivityFeed shows "Connected" status
- SSE connection stable for 2 minutes
- Screenshot proof of working UI
- Network tab shows no failed requests
- Page refresh reconnection works
- Multiple tabs maintain separate connections
- Event latency < 500ms
- Memory stability in browser

**Run:**
```bash
# All E2E tests
cd /workspaces/agent-feed/tests/e2e
npm run test:sse-stability

# Headed mode (watch in browser)
npm run test:sse-stability:headed

# Debug mode (step through)
npm run test:sse-stability:debug

# UI mode (interactive)
npx playwright test sse-stability-validation.spec.ts --ui

# Via main script
cd /workspaces/agent-feed
./scripts/run-sse-stability-tests.sh e2e
```

**Expected output:**
```
Running 8 tests using 1 worker

  ✓ Browser console should have zero WebSocket errors (5.2s)
  ✓ LiveActivityFeed should show "Connected" status (8.1s)
  ✓ SSE connection should remain stable for 2 minutes (120.5s)
  ✓ Network tab should show no failed SSE requests (15.3s)
  ✓ UI should receive and display SSE events (30.2s)
  ✓ Page refresh should reconnect SSE without errors (12.8s)
  ✓ Multiple tabs should each maintain stable SSE connections (35.6s)
  ✓ SSE event latency should be under 500ms (30.1s)

8 passed (257.8s)

Screenshots saved to: /workspaces/agent-feed/tests/screenshots/sse-stability/
```

## Test Runner Script

**File:** `/workspaces/agent-feed/scripts/run-sse-stability-tests.sh`

**Purpose:** Automated execution of all tests with health checks and reporting

### Usage

```bash
# Run all tests in sequence
./scripts/run-sse-stability-tests.sh all

# Run only quick test (30s)
./scripts/run-sse-stability-tests.sh quick

# Run only full test (5m)
./scripts/run-sse-stability-tests.sh full

# Run only E2E tests
./scripts/run-sse-stability-tests.sh e2e

# With custom URLs
SERVER_URL=http://localhost:3001 \
FRONTEND_URL=http://localhost:5173 \
./scripts/run-sse-stability-tests.sh all
```

### What the runner does

1. **Health Check:** Verifies server is running
2. **Dependency Installation:** Installs test dependencies
3. **Quick Test:** Runs 30-second validation
4. **Full Test:** Runs 5-minute stability test (if quick passes)
5. **E2E Test:** Runs Playwright browser tests (if quick passes)
6. **Report Generation:** Creates comprehensive report

### Output Files

```
/workspaces/agent-feed/
├── tests/
│   ├── results/
│   │   └── sse-stability/
│   │       ├── quick-test-20251026-143022.log
│   │       ├── full-test-20251026-143122.log
│   │       ├── e2e-test-20251026-144522.log
│   │       └── report-20251026-144822.txt
│   └── screenshots/
│       └── sse-stability/
│           ├── console-check.png
│           ├── connected-status.png
│           ├── stability-test-complete.png
│           ├── network-check.png
│           ├── before-refresh.png
│           ├── after-refresh.png
│           ├── multi-tab-1.png
│           └── multi-tab-2.png
```

## Success Criteria

### ✅ Quick Test Passing
- Zero connection errors
- Zero "socket hang up" errors
- Socket.IO connected = true
- SSE readyState = 1 (OPEN)
- Concurrent connections stable

### ✅ Full Test Passing
- Exactly 1 connection (no reconnects)
- Zero reconnection attempts
- 28+ heartbeats sent
- SSE events received
- Memory growth < 50MB
- Zero unexpected state changes

### ✅ E2E Test Passing
- Zero console WebSocket errors
- "Connected" status visible in UI
- Connection stable 2+ minutes
- Zero failed network requests
- 95%+ connection uptime
- Page refresh successful
- Multi-tab stability confirmed
- Event latency < 500ms

## Debugging Failed Tests

### "Server is not running"
```bash
# Check server status
curl http://localhost:3001/health

# Start server if needed
npm run server

# Check server logs
tail -f server.log
```

### "Socket hang up" errors
```bash
# Check for proxy interference
curl -i http://localhost:3001/socket.io/

# Verify WebSocket upgrade headers
curl -i -N -H "Connection: Upgrade" \
         -H "Upgrade: websocket" \
         http://localhost:3001/socket.io/

# Check Nginx config (if using proxy)
cat /etc/nginx/sites-available/default
```

### SSE readyState not OPEN
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
     http://localhost:3001/api/sse/claude-code-sdk/stream

# Should see:
# HTTP/1.1 200 OK
# Content-Type: text/event-stream
# Connection: keep-alive
# ...
# data: {"type":"heartbeat"}
```

### Memory growth > 50MB
```bash
# Enable Node.js memory profiling
NODE_OPTIONS='--expose-gc --max-old-space-size=4096' \
node tests/integration/sse-stability-full.js

# Check for event listener leaks
node --trace-warnings tests/integration/sse-stability-full.js
```

### E2E tests failing
```bash
# Run with browser visible
cd tests/e2e
npx playwright test sse-stability-validation.spec.ts --headed

# Debug mode (step through)
npx playwright test sse-stability-validation.spec.ts --debug

# Check browser console in screenshots
ls -lh tests/screenshots/sse-stability/
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: SSE Stability Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  sse-stability:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start server
        run: |
          npm run server &
          echo $! > server.pid

      - name: Wait for server
        run: npx wait-on http://localhost:3001/health --timeout 30000

      - name: Install test dependencies
        run: |
          cd tests/integration && npm install
          cd ../e2e && npm install
          npx playwright install chromium

      - name: Run SSE stability tests
        run: ./scripts/run-sse-stability-tests.sh all

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/results/

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/screenshots/

      - name: Stop server
        if: always()
        run: |
          if [ -f server.pid ]; then
            kill $(cat server.pid) || true
          fi
```

## Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Connection Time | < 1s | 0.1s - 2s |
| Heartbeat Latency | < 100ms | 50ms - 200ms |
| Event Latency | < 500ms | 100ms - 1000ms |
| Memory Growth (5m) | < 50MB | 0MB - 75MB |
| Reconnection Time | < 2s | 0.5s - 5s |
| Uptime | > 99.5% | 95% - 100% |
| CPU Usage | < 10% | 5% - 20% |

### Benchmarking

```bash
# Run with performance metrics
NODE_ENV=production \
  node --trace-warnings \
  --prof \
  tests/integration/sse-stability-full.js

# Analyze CPU profile
node --prof-process isolate-*.log > cpu-profile.txt

# Memory profiling
node --expose-gc \
  --max-old-space-size=512 \
  tests/integration/sse-stability-full.js
```

## Troubleshooting Common Issues

### Issue: Tests timeout
**Solution:**
```bash
# Increase timeout in test file
const TEST_DURATION = 10 * 60 * 1000; // 10 minutes

# Or set environment variable
TIMEOUT=600000 node tests/integration/sse-stability-full.js
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use different port
SERVER_URL=http://localhost:3002 ./scripts/run-sse-stability-tests.sh quick
```

### Issue: Playwright browser not found
**Solution:**
```bash
# Install Playwright browsers
cd tests/e2e
npx playwright install chromium

# Or install all browsers
npx playwright install
```

### Issue: CORS errors in E2E tests
**Solution:**
```bash
# Check server CORS configuration
# api-server/server.js should have:
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

## Next Steps

1. **Run Quick Test:** Validate basic functionality (30s)
2. **Analyze Results:** Check logs and screenshots
3. **Run Full Test:** Validate long-term stability (5m)
4. **Run E2E Tests:** Validate browser integration
5. **Review Report:** Check comprehensive test report

## Support

- **Documentation:** `/workspaces/agent-feed/tests/README-SSE-STABILITY.md`
- **Issues:** Check server logs and test output
- **Screenshots:** `/workspaces/agent-feed/tests/screenshots/sse-stability/`
- **Logs:** `/workspaces/agent-feed/tests/results/sse-stability/`
