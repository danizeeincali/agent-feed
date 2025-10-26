# WebSocket Endpoint Fix Tests - Quick Start

## TL;DR

```bash
# Quick validation (25 seconds)
node tests/integration/websocket-endpoint-fix-quick.js

# Full test suite (5-6 minutes)
node tests/integration/websocket-endpoint-fix-node-test.js
```

## What This Tests

✅ WebSocket endpoint changed from `/ws` → `/socket.io`
✅ Connections stay alive 30-60+ seconds (no socket hang up)
✅ SSE still works with heartbeats
✅ LiveActivityFeed functional
✅ Telemetry events captured
✅ Zero console errors
✅ Zero regressions

## Prerequisites

**Backend must be running:**
```bash
cd api-server
npm start
```

**Verify backend:**
```bash
curl http://127.0.0.1:3001/api/health
# Expected: {"status":"ok"}
```

## Test Files

| File | Duration | Tests | Purpose |
|------|----------|-------|---------|
| `websocket-endpoint-fix-quick.js` | ~25s | 10 | Daily validation |
| `websocket-endpoint-fix-node-test.js` | ~5-6min | 12 | Pre-deployment |
| `websocket-endpoint-fix.test.js` | Variable | 16 | Jest (if configured) |

## Expected Output

```
🚀 WebSocket Endpoint Fix - Quick Validation

✅ WebSocket /socket.io connection PASSED
✅ Connection stability PASSED
✅ Server event PASSED
✅ SSE connection PASSED
✅ SSE stability PASSED
✅ /socket.io proxy PASSED
✅ /streaming-ticker proxy PASSED
✅ LiveActivityFeed PASSED
✅ Database PASSED

======================================================================
✅ WEBSOCKET ENDPOINT FIX - QUICK VALIDATION COMPLETE
======================================================================

🎯 Fix Validated:
   • Old endpoint /ws: REMOVED ❌
   • New endpoint /socket.io: ACTIVE ✅
   • Zero regressions: CONFIRMED ✅
======================================================================
```

## Troubleshooting

### ❌ Connection Error
```
❌ Connection error: ECONNREFUSED
```
**Fix**: Start backend with `cd api-server && npm start`

### ❌ Timeout
```
Command timed out after 45s
```
**Fix**: Check backend is running on port 3001

### ❌ Wrong Path
```
Expected path: /socket.io/
Actual path: /ws
```
**Fix**: Verify `frontend/vite.config.ts` proxy configuration

## Full Documentation

See: `docs/WEBSOCKET-ENDPOINT-FIX-TESTS.md`

## Test Coverage

- **WebSocket /socket.io**: 3 tests
- **SSE Stability**: 2-3 tests
- **Proxy Config**: 2 tests
- **Zero Regression**: 2-3 tests
- **Total**: 10-12 tests

## Validation Checklist

- [ ] Quick test passes
- [ ] Browser console: zero WebSocket errors
- [ ] LiveActivityFeed shows real-time events
- [ ] SSE stays connected 5+ minutes
- [ ] Database captures telemetry

## Support

For issues, see troubleshooting in `docs/WEBSOCKET-ENDPOINT-FIX-TESTS.md`
