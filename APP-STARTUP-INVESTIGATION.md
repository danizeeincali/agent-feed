# App Startup Investigation - WebSocket Connection Issues

**Date**: 2025-10-21
**Issue**: User sees "Disconnected API connection failed" and WebSocket errors when starting the app

---

## Current Situation

### Services Status
✅ **Backend (port 3001)**: RUNNING - HTTP API responding correctly
- Process: `node 7798` (tsx server.js)
- Health check: `http://localhost:3001/api/health` returns 200 OK
- Claude Code endpoint: Working (tested with curl, returns 200 OK)

✅ **Frontend (port 5173)**: RUNNING - Vite dev server active
- Process: `node 7787` (vite)
- Serving on: `http://localhost:5173`
- HMR active

### What's NOT Working
❌ **WebSocket Connection**: Frontend trying to connect to WebSocket, failing
- User sees: "Disconnected API connection failed"
- User reports: "bunch of websocket errors"

---

## Investigation Findings

### 1. Backend WebSocket Server - NOT RUNNING

**Test Result**:
```bash
curl -v http://localhost:3001/ws
# Returns: 404 Not Found
```

**Finding**: The backend does NOT have a WebSocket server endpoint at `/ws`.

**Evidence from server.js**:
- No WebSocket server initialization found
- No `ws` package imports
- No `WebSocketServer` or `Server` creation
- Only HTTP server with Express routes

### 2. Frontend WebSocket Expectations

**Files trying to use WebSocket**:
- Found 113 files with WebSocket references
- Key files:
  - `WebSocketContext.tsx` (main context)
  - `WebSocketSingletonContext.tsx`
  - `RealSocialMediaFeed.tsx`
  - `ActivityPanel.tsx`
  - `BulletproofActivityPanel.tsx`
  - Many more components

**Expected WebSocket URL**: (Need to check actual URL being used)

### 3. Backend Logs Analysis

From BashOutput of backend startup:
```
[0] 🚀 API Server running on http://0.0.0.0:3001
[0] 📡 Health check: http://localhost:3001/health
[0] 🤖 Agents API: http://localhost:3001/api/agents
[0] 📝 Templates API: http://localhost:3001/api/templates
[0] 📊 Streaming Ticker SSE: http://localhost:3001/api/streaming-ticker/stream
```

**NO WebSocket endpoint listed!**

### 4. Database Error Found

Backend logs show:
```
[0] ❌ Error in /api/v1/agent-posts: SqliteError: no such table: agent_posts
```

This suggests the database schema is incomplete, but this is separate from the WebSocket issue.

---

## Root Cause Analysis

### PRIMARY ISSUE: WebSocket Server Not Started

The backend **does not have a WebSocket server running**. The frontend is trying to connect to a WebSocket endpoint that doesn't exist.

**Why this happens**:
1. Backend is only running HTTP/Express server
2. No WebSocket server is initialized in `server.js`
3. Frontend components expect WebSocket for real-time updates
4. When WebSocket connection fails, UI shows "Disconnected" status

### SECONDARY ISSUE: Missing Database Table

The `agent_posts` table doesn't exist in the database, causing 500 errors when frontend tries to load posts.

---

## Expected vs Actual

### Expected Startup Sequence
1. Start backend with both HTTP and WebSocket servers
2. Start frontend
3. Frontend connects to:
   - HTTP API at `http://localhost:3001/api/*`
   - WebSocket at `ws://localhost:3001/ws` (or similar)
4. UI shows "Connected" status

### Actual Startup Sequence
1. Start backend with HTTP server only ❌
2. Start frontend ✅
3. Frontend tries to connect to:
   - HTTP API ✅ (works)
   - WebSocket ❌ (404 Not Found)
4. UI shows "Disconnected" ❌

---

## Missing Components

### 1. WebSocket Server Code
The backend needs:
```javascript
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Create HTTP server from Express
const httpServer = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws'
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    // Handle incoming messages
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
httpServer.listen(3001);
```

**Status**: This code is MISSING from `server.js`

### 2. Database Schema
The `agent_posts` table is missing. Need to check if there's a migration script or schema file that wasn't run.

---

## The Pattern User Mentioned

User said: "This happens a lot when I ask you to run the app are you forgetting something"

**Analysis**: Yes, there IS a missing step. The `npm run dev` command:
- ✅ Starts backend HTTP server
- ✅ Starts frontend dev server
- ❌ Does NOT ensure WebSocket server is initialized
- ❌ Does NOT ensure database is properly set up

**Likely causes**:
1. WebSocket server initialization code was removed or never added
2. Database migrations not run
3. Missing startup dependency (package not installed?)

---

## Investigation Questions

1. **Where is the WebSocket server code?**
   - Check if it exists in a separate file
   - Check if there's a feature flag disabling it
   - Check if it was removed in a previous change

2. **What WebSocket URL does frontend expect?**
   - Need to read `WebSocketContext.tsx` to see the URL
   - Check environment variables for WS_URL

3. **Is there a database migration script?**
   - Check for migration files
   - Check if there's a setup script that needs to run

4. **Is WebSocket server optional?**
   - Can the app work without WebSocket?
   - Is there a fallback to HTTP polling?

---

## Next Steps (Investigation Only - No Action)

1. ✅ Read `WebSocketContext.tsx` to find the WebSocket URL frontend expects
2. ✅ Search for WebSocket server code in the codebase
3. ✅ Check package.json for `ws` package
4. ✅ Look for startup scripts that might initialize WebSocket
5. ✅ Check for database migration scripts
6. ✅ Review git history to see if WebSocket code was removed

---

## Recommendations (For Later)

### Option A: Add WebSocket Server
If WebSocket is required:
1. Add WebSocket server initialization to `server.js`
2. Create WebSocket handler routes
3. Ensure it starts when backend starts
4. Update startup docs/runbook

### Option B: Disable WebSocket in Frontend
If WebSocket is optional:
1. Add feature flag to disable WebSocket
2. Update frontend to gracefully handle missing WebSocket
3. Use HTTP polling fallback
4. Update UI to not show "Disconnected" status

### Option C: Fix Database
Regardless of WebSocket:
1. Find and run database migrations
2. Create `agent_posts` table
3. Update schema initialization

---

## Status

**Investigation**: IN PROGRESS
**Action**: NONE (per user request - "investigate dont do anything")

The issue is clear: **WebSocket server is not running, but frontend expects it**.

Need to determine:
- Is WebSocket server code missing or disabled?
- What's the correct way to start it?
- Should this be documented in a runbook?
