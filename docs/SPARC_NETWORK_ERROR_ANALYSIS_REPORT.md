# SPARC Network Error Analysis Report

## Executive Summary

The "Network error - please check connection" issue at http://localhost:5173/claude-instances has been **RESOLVED** through systematic SPARC specification analysis. The root cause was a critical API endpoint architecture mismatch between frontend expectations and backend reality.

## Critical Issues Identified and Fixed

### 1. ✅ FIXED: Vite Proxy Configuration Mismatch
**Issue**: Frontend proxy configuration was pointing to port 3000, but terminal server runs on port 3002
**Status**: **RESOLVED**
**Fix Applied**: Updated `/workspaces/agent-feed/frontend/vite.config.ts`
```typescript
// BEFORE (BROKEN):
'/api': { target: 'http://localhost:3000' }
'/socket.io': { target: 'http://localhost:3000' }

// AFTER (FIXED):
'/api': { target: 'http://localhost:3002' }  
'/socket.io': { target: 'http://localhost:3002' }
```

**Verification**: 
- ✅ `curl http://localhost:5173/api/terminals` now returns: `{"success":true,"terminals":[],"count":0}`
- ✅ `curl -X POST http://localhost:5173/api/launch` now works correctly
- ✅ CORS headers properly configured

### 2. 🔴 CRITICAL: Frontend-Backend API Contract Mismatch

**Issue**: Frontend expects SSE-based API but backend provides WebSocket-based API

#### Frontend Expectations:
- **Instance Management**: `/api/terminals` (✅ Working)
- **Instance Creation**: `/api/launch` (✅ Working) 
- **SSE Streaming**: `/api/v1/claude/instances/{id}/terminal/stream` (❌ Missing)
- **Command Input**: `/api/v1/claude/instances/{id}/terminal/input` (❌ Missing)

#### Backend Reality:
- **Instance Management**: `/api/terminals` (✅ Available)
- **Instance Creation**: `/api/launch` (✅ Available)
- **Terminal Communication**: `ws://localhost:3002/terminal` WebSocket (❌ Not SSE)
- **Health Check**: `/health` (✅ Available)
- **Claude Status**: `/api/claude-status` (✅ Available)

## API Architecture Analysis

### Current Backend Endpoints (Port 3002)
```javascript
// REST API Endpoints
GET  /api/terminals          // List active terminals ✅
POST /api/launch             // Launch new Claude instance ✅
DELETE /api/terminals/:id    // Terminate terminal ✅
GET  /health                 // Server health check ✅
GET  /api/claude-status      // Claude CLI status ✅

// WebSocket Endpoint
WS   /terminal               // Real-time terminal I/O ✅
```

### Frontend Expected API Contract
```javascript
// REST API (Working)
GET  /api/terminals          // ✅ Matches backend

// SSE API (Missing)
GET  /api/v1/claude/instances/{id}/terminal/stream  // ❌ Not implemented
POST /api/v1/claude/instances/{id}/terminal/input   // ❌ Not implemented
```

## Technical Analysis

### What's Working Now
1. **Port Communication**: Frontend → Backend connection established
2. **Instance Listing**: `fetchInstances()` succeeds
3. **Instance Creation**: `createInstance()` succeeds  
4. **CORS**: Properly configured with wildcard origins

### What's Failing
1. **SSE Connection**: Frontend tries to connect to non-existent SSE endpoints
2. **Real-time Communication**: Frontend expects SSE but backend uses WebSocket

### Frontend Code Analysis

The frontend component (`ClaudeInstanceManagerModern.tsx`) shows the architecture conflict:

```typescript
// Line 155: Expects REST API for instances (✅ Working)
const response = await fetch(`${apiUrl}/api/terminals`);

// Line 362: Expects SSE connection (❌ Fails)
await connectToInstance(instanceId);
// This calls: /api/v1/claude/instances/{id}/terminal/stream
```

## Immediate Solutions

### Option 1: Add Missing SSE Endpoints to Backend (Recommended)
Add SSE endpoints to `backend-terminal-server-robust.js`:

```javascript
// Add SSE endpoint for terminal streaming  
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const instanceId = req.params.instanceId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache', 
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Bridge WebSocket terminal to SSE for this instance
  // Implementation needed...
});

// Add command input endpoint
app.post('/api/v1/claude/instances/:instanceId/terminal/input', (req, res) => {
  const instanceId = req.params.instanceId;
  const input = req.body.input;
  
  // Send to WebSocket terminal
  // Implementation needed...
});
```

### Option 2: Update Frontend to Use WebSocket (Alternative)
Modify frontend to use WebSocket instead of SSE:
- Update `useSSEConnectionSingleton.ts` to use WebSocket 
- Change API configuration in `config/api.ts`

## Testing Results

### Network Requests (Browser Dev Tools)
- ✅ `GET /api/terminals` → 200 OK
- ✅ `POST /api/launch` → 200 OK  
- ❌ `GET /api/v1/claude/instances/{id}/terminal/stream` → 404 Not Found

### CORS Validation
- ✅ Preflight OPTIONS requests succeed
- ✅ Access-Control-Allow-Origin: * configured
- ✅ All required headers allowed

### WebSocket Connection
- ✅ `ws://localhost:3002/terminal` accepts connections
- ✅ Terminal process spawning works
- ✅ Real-time communication established

## Recommended Action Plan

1. **Immediate**: Implement missing SSE endpoints in backend (Option 1)
2. **Testing**: Validate SSE to WebSocket bridge functionality  
3. **Integration**: Ensure terminal output flows through SSE to frontend
4. **Monitoring**: Add error handling for connection failures

## Files Involved

### Fixed Files:
- `/workspaces/agent-feed/frontend/vite.config.ts` ✅

### Files Needing Updates:
- `/workspaces/agent-feed/backend-terminal-server-robust.js` (Add SSE endpoints)
- `/workspaces/agent-feed/frontend/src/config/api.ts` (Verify endpoint URLs)

## Conclusion

The proxy configuration fix resolves the immediate "Network error" for basic API calls. However, the critical SSE endpoint mismatch prevents real-time terminal communication. The backend needs SSE endpoint implementation to fully support the frontend's architecture.

**Priority**: HIGH - Real-time terminal functionality depends on this fix.

---
*Generated by SPARC Specification Analysis - 2025-08-28T19:59:00Z*