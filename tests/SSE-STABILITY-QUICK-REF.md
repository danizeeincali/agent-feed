# SSE Stability Tests - Quick Reference Card

## 🚀 Quick Start (Copy & Paste)

```bash
# 1. Install dependencies (one-time setup)
cd /workspaces/agent-feed/tests/integration && npm install && cd ../..
cd /workspaces/agent-feed/tests/e2e && npm install && npx playwright install chromium && cd ../..

# 2. Start server (in separate terminal)
npm run server

# 3. Run all tests
./scripts/run-sse-stability-tests.sh all
```

## 📋 Test Files

| File | Duration | Purpose |
|------|----------|---------|
| `tests/integration/sse-stability-quick.js` | 30s | Fast validation |
| `tests/integration/sse-stability-full.js` | 5m | Extended stability |
| `tests/e2e/sse-stability-validation.spec.ts` | 2-3m | Browser E2E |

## ⚡ Quick Commands

```bash
# Quick test (30 seconds)
node tests/integration/sse-stability-quick.js

# Full test (5 minutes)
node tests/integration/sse-stability-full.js

# E2E test
cd tests/e2e && npm run test:sse-stability

# Run all tests
./scripts/run-sse-stability-tests.sh all

# Test with custom server
SERVER_URL=http://localhost:3001 node tests/integration/sse-stability-quick.js
```

## ✅ Success Criteria

### Quick Test (30s)
- ✅ Socket.IO connected = true
- ✅ SSE readyState = 1 (OPEN)
- ✅ Zero "socket hang up" errors
- ✅ Zero connection errors

### Full Test (5m)
- ✅ Zero reconnection attempts
- ✅ 28+ heartbeats sent
- ✅ Memory growth < 50MB
- ✅ SSE events received

### E2E Test
- ✅ Zero console errors
- ✅ "Connected" status visible
- ✅ Connection stable 2+ minutes
- ✅ Zero failed requests

## 🐛 Quick Debug

```bash
# Check server is running
curl http://localhost:3001/health

# Test SSE endpoint
curl -N http://localhost:3001/api/sse/claude-code-sdk/stream

# Run E2E with visible browser
cd tests/e2e && npx playwright test sse-stability-validation.spec.ts --headed

# Enable Socket.IO debug
DEBUG=socket.io-client:* node tests/integration/sse-stability-quick.js
```

## 📊 Results Location

```bash
# Logs
tests/results/sse-stability/*.log

# Screenshots
tests/screenshots/sse-stability/*.png

# Reports
tests/results/sse-stability/report-*.txt
```

## 🔧 Common Issues

| Issue | Fix |
|-------|-----|
| Server not running | `npm run server` |
| Port in use | `lsof -i :3001` → `kill -9 <PID>` |
| Playwright missing | `cd tests/e2e && npx playwright install chromium` |
| Dependencies missing | `cd tests/integration && npm install` |

## 📈 Expected Output

### ✅ Passing Test
```
✓ Socket.IO connected
✓ SSE connection opened
✓ All tests passed!
```

### ❌ Failing Test
```
❌ Socket.IO connect error: socket hang up
✗ Test failed
```

## 🎯 Test Modes

```bash
# Quick only (30s)
./scripts/run-sse-stability-tests.sh quick

# Full only (5m)
./scripts/run-sse-stability-tests.sh full

# E2E only
./scripts/run-sse-stability-tests.sh e2e

# All tests
./scripts/run-sse-stability-tests.sh all
```

## 📸 Screenshot Locations

- `console-check.png` - Browser console validation
- `connected-status.png` - Connected UI status
- `stability-test-complete.png` - 2-minute stability proof
- `network-check.png` - Network tab validation
- `before-refresh.png` / `after-refresh.png` - Reconnection test
- `multi-tab-1.png` / `multi-tab-2.png` - Multi-tab test

## 🔍 Viewing Results

```bash
# View latest log
cat tests/results/sse-stability/$(ls -t tests/results/sse-stability/*.log | head -1)

# View latest report
cat tests/results/sse-stability/$(ls -t tests/results/sse-stability/report-*.txt | head -1)

# Open screenshots
open tests/screenshots/sse-stability/
```

## 💡 Tips

1. **Run quick test first** - If it fails, fix before running full tests
2. **Check server logs** - Often reveals root cause of failures
3. **Use headed mode** - See what's happening in browser: `--headed`
4. **Debug mode** - Step through tests: `--debug`
5. **Screenshot proof** - Screenshots show exact UI state at test time

## 🎓 Test Understanding

### What Each Test Does

**Quick Test (30s):**
- Opens Socket.IO connection
- Opens SSE connection
- Waits 30 seconds
- Verifies both still connected
- Zero errors

**Full Test (5m):**
- Opens connections
- Sends heartbeats every 10s
- Tracks memory every 30s
- Runs for 5 minutes
- Verifies stability + performance

**E2E Test:**
- Opens browser
- Loads app
- Checks console for errors
- Verifies "Connected" status
- Waits 2 minutes
- Takes screenshots as proof
- Tests refresh and multi-tab

## 📞 Getting Help

1. Check test logs in `tests/results/sse-stability/`
2. Review screenshots in `tests/screenshots/sse-stability/`
3. Read full guide: `docs/SSE-STABILITY-TEST-GUIDE.md`
4. Check README: `tests/README-SSE-STABILITY.md`
