# SSE Fix Quick Reference

**Status:** ✅ SPECIFICATION COMPLETE | Implementation changes already applied

---

## Problem Summary

**What:** "Connection lost. Reconnecting..." messages every ~10 seconds in LiveActivityFeed

**Why:** Vite dev proxy cannot handle Socket.IO WebSocket upgrade requests, causing:
- WebSocket errors every 6 seconds
- Browser connection throttling
- SSE connection drops as collateral damage

**Root Cause:** Vite's `http-proxy-middleware` cannot maintain stateful WebSocket upgrade context

---

## Solution Summary

**Remove Socket.IO from Vite proxy** → Configure Socket.IO client to connect directly to backend

### Changes Already Applied ✅

1. **frontend/src/services/socket.js**
   - Direct connection to `http://localhost:3001`
   - Bypasses Vite proxy entirely

2. **frontend/vite.config.ts**
   - Socket.IO proxy section removed
   - Comment added explaining why

---

## Validation Checklist

Run these tests to verify the fix:

### 1. Zero WebSocket Errors (CRITICAL)
```bash
# Open browser console
# Navigate to http://localhost:5173
# Wait 5 minutes
# Expected: ZERO errors containing "socket hang up" or "ws proxy error"
```

### 2. SSE Stability (CRITICAL)
```bash
# Open LiveActivityFeed component
# Verify status shows "Connected" (green dot)
# Wait 5 minutes
# Expected: No "Connection lost. Reconnecting..." messages
```

### 3. Connection Health
```bash
# Browser DevTools → Network tab
# Filter: WS (WebSocket)
# Expected: Single stable WebSocket connection to localhost:3001
# Expected: No failed connection attempts
```

### 4. Heartbeat Monitoring
```bash
# Browser console → filter for "heartbeat"
# Expected: SSE heartbeat every 15 seconds
# Expected: Consistent uptime counter incrementing
```

---

## Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| WebSocket errors | 0/hour | Browser console count |
| SSE drops | <1/hour | Connection health logs |
| Initial connection | <1 second | Network tab timing |
| "Connection lost" messages | 0 | Visual inspection of UI |

---

## Architecture

**BEFORE (Broken):**
```
Frontend :5173 → Vite Proxy /socket.io → ❌ Upgrade fails → Backend :3001
```

**AFTER (Fixed):**
```
Frontend :5173 → Direct WebSocket → ✅ Connects → Backend :3001
```

**SSE (Unchanged):**
```
Frontend :5173 → Vite Proxy /api/streaming-ticker → ✅ Works → Backend :3001
```

---

## What Changed

### socket.js (Line 23-25)
```javascript
// BEFORE: return 'http://localhost:3001'; // Would route through proxy

// AFTER:
// DIRECT CONNECTION: Socket.IO connects directly to backend, bypassing Vite proxy
// This prevents connection instability and ensures WebSocket upgrade works correctly
return 'http://localhost:3001';
```

### vite.config.ts (Lines 85-87)
```typescript
// REMOVED:
// '/socket.io': { target: 'http://127.0.0.1:3001', ws: true, ... }

// ADDED COMMENT:
// SOCKET.IO PROXY REMOVED: Socket.IO client connects DIRECTLY to localhost:3001
// Direct connection prevents Vite proxy issues with WebSocket upgrade
// See frontend/src/services/socket.js for direct connection configuration
```

---

## What Didn't Change (All Working)

- ✅ Backend Socket.IO setup (api-server/server.js)
- ✅ SSE endpoint implementation
- ✅ SSE proxy configuration (HTTP-only, works fine)
- ✅ LiveActivityFeed UI component
- ✅ useSSE() hook logic
- ✅ CORS configuration

---

## Testing Commands

```bash
# 1. Start backend
npm run api

# 2. Start frontend (separate terminal)
npm run dev

# 3. Open browser
# Navigate to http://localhost:5173

# 4. Monitor for 5 minutes
# Check: Browser console (zero errors)
# Check: LiveActivityFeed status (Connected)
# Check: Network tab (stable WebSocket)

# 5. Test reconnection
# Kill backend server (Ctrl+C)
# Restart backend (npm run api)
# Expected: Automatic reconnection within 5 seconds
```

---

## Rollback (If Needed)

**Step 1:** Restore Socket.IO proxy in `vite.config.ts`:
```typescript
'/socket.io': {
  target: 'http://127.0.0.1:3001',
  ws: true,
  changeOrigin: true,
  secure: false,
}
```

**Step 2:** Comment in `socket.js` (no code change needed):
```javascript
// Connection will now route through proxy (original behavior with issues)
```

**Step 3:** Restart services:
```bash
npm run dev  # Frontend
npm run api  # Backend
```

---

## Expected Behavior

### Development Mode ✅
- Socket.IO: Direct connection to `http://localhost:3001`
- SSE: Proxied through Vite to `/api/streaming-ticker/stream`
- Zero WebSocket errors
- Stable connections for hours

### Production Mode ✅
- Socket.IO: Same-origin connection
- SSE: Same-origin connection
- No proxy involved
- HTTPS/WSS automatic upgrade

---

## Next Steps

1. ✅ **Specification Phase** - Complete (this document)
2. ⏭️ **Pseudocode Phase** - Algorithm design (if needed)
3. ⏭️ **Architecture Phase** - System design review
4. ⏭️ **Refinement Phase** - TDD implementation
5. ⏭️ **Completion Phase** - Integration testing

**Note:** Implementation changes already applied during investigation.
Focus on validation testing and documentation updates.

---

## Key Insights

1. **Vite Proxy Limitation:** Cannot handle Socket.IO's polling → WebSocket upgrade
2. **Direct Connection Works:** Socket.IO client can connect directly (CORS configured)
3. **SSE Unaffected:** SSE proxy works fine (HTTP-only, no upgrade needed)
4. **Zero Code Changes:** Only configuration updates required
5. **Simple Rollback:** Restore 3 lines in vite.config.ts if issues arise

---

## Full Specification

See: `/workspaces/agent-feed/docs/SPARC-SSE-FIX-SPEC.md`

**Sections:**
- Root cause analysis (Section 2)
- Functional requirements (Section 3)
- Acceptance criteria (Section 7)
- Edge cases (Section 10)
- Testing strategy (Section 15)
- Complete validation checklist (Section 12)

---

**Document Status:** ✅ READY FOR VALIDATION

**Risk Level:** 🟢 LOW (Configuration only, simple rollback)

**Estimated Validation Time:** 15 minutes
