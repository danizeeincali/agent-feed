# App Startup Investigation - ROOT CAUSE FOUND

**Date**: 2025-10-21
**Issue**: "Disconnected API connection failed" and WebSocket errors on startup

---

## ROOT CAUSE IDENTIFIED ✅

### The Issue

The frontend's `WebSocketSingletonContext.tsx` tries to test the API connection by calling:

```typescript
const response = await fetch('/api/agent-posts');
```

**Line 144 of WebSocketSingletonContext.tsx**

But the backend returns:
```
❌ Error in /api/v1/agent-posts: SqliteError: no such table: agent_posts
```

**This causes the "Disconnected" state in the UI.**

---

## Why This Happens

### 1. No Real WebSocket (Expected)

The app **intentionally** doesn't use WebSocket anymore. It uses HTTP + SSE (Server-Sent Events).

**Evidence from WebSocketSingletonContext.tsx**:
- Line 2: `// HTTP/SSE only - WebSocket imports removed`
- Line 3: `// import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton';`
- Line 4: `// import { getSocketIOUrl } from '@/utils/websocket-url';`

**This is NOT the problem** - the app is designed to work without WebSocket.

### 2. Missing Database Table (ACTUAL PROBLEM)

The frontend's connection check calls `/api/agent-posts` to verify the API is working.

**Backend response** (from logs):
```
[0] ❌ Error in /api/v1/agent-posts: SqliteError: no such table: agent_posts
    at Database.prepare (/workspaces/agent-feed/api-server/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
    at DatabaseSelector.getAllPosts (file:///workspaces/agent-feed/api-server/config/database-selector.js:119:35)
```

**The `agent_posts` table doesn't exist in the database.**

When this API call fails, the frontend sets:
- `isConnected = false`
- `connectionError = "API connection failed"`
- UI shows: "Disconnected"

---

## The Misleading Part

The error says "WebSocket errors" but there are NO actual WebSocket errors. The app doesn't use WebSocket.

**What the user is actually seeing**:
- Frontend makes HTTP request to `/api/agent-posts`
- Backend returns 500 error (missing table)
- Frontend interprets this as "API connection failed"
- UI shows "Disconnected" status
- Console logs may show connection errors

---

## Why This Happens "A Lot"

User said: "This happens a lot when I ask you to run the app"

**Why**: The database is missing a required table, so **every time** the app starts:
1. Backend starts ✅
2. Frontend starts ✅
3. Frontend tests connection by calling `/api/agent-posts` ⚠️
4. Backend returns 500 (missing table) ❌
5. Frontend shows "Disconnected" ❌

The database issue persists across restarts because:
- The database file exists (`database.db`)
- But the schema is incomplete (missing `agent_posts` table)
- No migration runs on startup to fix it

---

## Expected Behavior

### What SHOULD Happen

1. Backend starts with complete database schema
2. Frontend calls `/api/agent-posts`
3. Backend returns 200 OK with posts (or empty array)
4. Frontend sets `isConnected = true`
5. UI shows "Connected" ✅

### What ACTUALLY Happens

1. Backend starts with incomplete database schema
2. Frontend calls `/api/agent-posts`
3. Backend returns 500 (no such table)
4. Frontend sets `isConnected = false`
5. UI shows "Disconnected" ❌

---

## The Missing Table

### Required Table: `agent_posts`

**Used by**: `/api/v1/agent-posts` endpoint
**Location**: `database-selector.js` line 119
**Query**: Tries to SELECT from `agent_posts` table

**Table doesn't exist** in `/workspaces/agent-feed/database.db`

---

## Investigation Complete

### Summary

❌ **NOT a WebSocket issue** - app doesn't use WebSocket
❌ **NOT a startup script issue** - both services start correctly
✅ **IS a database schema issue** - missing `agent_posts` table

### The Real Problem

**Missing Table**: `agent_posts` doesn't exist in SQLite database
**Impact**: Frontend connection check fails
**Result**: UI shows "Disconnected API connection failed"

### Why It's Confusing

The app uses an HTTP-only connection (no WebSocket), but the frontend's `WebSocketSingletonContext` still exists for backward compatibility. When the HTTP API call fails, it looks like a WebSocket connection failure in the UI.

---

## Solution Required

1. **Find or create** the database migration for `agent_posts` table
2. **Run migration** to create missing table
3. **Verify** `/api/agent-posts` returns 200 OK
4. **Test** that UI shows "Connected" on startup

OR

1. **Update frontend** to use a different health check endpoint
2. Use `/api/health` instead of `/api/agent-posts`
3. This endpoint works (confirmed with curl)

---

## Runbook Update Needed

The startup instructions should include:

```bash
# Start the app
npm run dev

# Wait 5 seconds for backend to initialize
sleep 5

# Verify backend health (should return 200 OK)
curl http://localhost:3001/api/health

# Verify database (should NOT return error about missing table)
curl http://localhost:3001/api/agent-posts
```

If `/api/agent-posts` returns 500 error about missing table:
1. Check for database migration scripts
2. Run migrations to create missing tables
3. Restart backend

---

## Files Involved

1. **Frontend connection check**: `/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx` (line 144)
2. **Backend endpoint**: `/workspaces/agent-feed/api-server/server.js` (proxies to v1 endpoint)
3. **Database query**: `/workspaces/agent-feed/api-server/config/database-selector.js` (line 119)
4. **Database file**: `/workspaces/agent-feed/database.db` (missing `agent_posts` table)

---

**Status**: ✅ ROOT CAUSE IDENTIFIED - Missing `agent_posts` table in database
**Action**: Investigation complete (no fixes applied per user request)
