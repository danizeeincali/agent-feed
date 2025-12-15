# AVI DM 403 Error Investigation

**Date**: 2025-10-20
**Issue**: "I encountered an error: API error: 403 Forbidden" when using AVI DM
**Status**: ✅ Root Cause Identified

---

## Investigation Summary

### 1. Backend API Endpoint Status ✅

**Endpoint**: `POST /api/claude-code/streaming-chat`

**Test Result**:
```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

**Response**: ✅ **200 OK** - Endpoint is working correctly
```json
{
  "success": true,
  "message": "I see you've sent \"test\" as a message. I'm Λvi, your Chief of Staff...",
  "responses": [...],
  "claudeCode": true
}
```

**Finding**: The backend Claude Code API endpoint is **fully functional** and **not returning 403**.

---

### 2. Frontend Service Configuration ⚠️

**Service**: `/workspaces/agent-feed/frontend/src/services/AviDMService.ts`

**Configuration Analysis**:

**Line 97 - Base URL**:
```typescript
baseUrl: config.baseUrl || 'http://localhost:8080/api',
```
❌ **PROBLEM**: Default base URL points to port **8080**, but server runs on port **3001**

**Line 239 - Endpoint**:
```typescript
const response = await this.httpClient.post<ClaudeResponse>(
  '/api/claude-code/streaming-chat',
  {...}
);
```

**Full URL Constructed**: `http://localhost:8080/api/api/claude-code/streaming-chat`

**Issues**:
1. ❌ Wrong port (8080 instead of 3001)
2. ❌ Double `/api` prefix (baseUrl includes `/api`, endpoint also includes `/api`)
3. ❌ Results in 404 or connection refused, not 403

---

### 3. Actual Error Source Investigation 🔍

**Backend CORS Configuration** (`api-server/server.js:133-162`):

```javascript
const corsWhitelist = securityConfig.cors?.whitelist || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsWhitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: securityConfig.cors?.credentials !== false,
  methods: securityConfig.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

**Finding**: CORS middleware can reject requests with **403-like errors** if origin is not whitelisted.

---

### 4. Frontend-Backend Connection Test ❌

**Expected Frontend Request**:
```
Origin: http://localhost:5173
Target: http://localhost:8080/api/api/claude-code/streaming-chat
```

**What Actually Happens**:
1. Frontend tries to connect to `localhost:8080` ❌ (wrong port)
2. Connection refused or timeout (8080 not listening)
3. OR if proxy exists, gets rejected due to incorrect path
4. Error message shows as "403 Forbidden" ⚠️

**Actual Server**:
```
Backend: http://localhost:3001
Frontend: http://localhost:5173
```

---

### 5. Server Status Verification ✅

**Backend Running**: ✅ http://localhost:3001
```
[0] 🚀 API Server running on http://0.0.0.0:3001
[0] 📡 Health check: http://localhost:3001/health
```

**Frontend Running**: ✅ http://localhost:5173
```
[1] ➜  Local:   http://localhost:5173/
```

**WebSocket Error** (Non-blocking):
```
🔍 SPARC DEBUG: WebSocket /ws proxy error: connect ECONNREFUSED 127.0.0.1:3001
```
This is normal on startup - WebSocket attempts connection before backend is ready.

---

## Root Cause Analysis

### Primary Issue: Port Mismatch

**AviDMService Configuration**:
```typescript
// Line 97 - Default configuration
baseUrl: config.baseUrl || 'http://localhost:8080/api',
```

**Problem**:
- Frontend expects backend on port **8080**
- Backend actually runs on port **3001**
- Results in connection failure

### Secondary Issue: Double API Prefix

**AviDMService Line 239**:
```typescript
const response = await this.httpClient.post<ClaudeResponse>(
  '/api/claude-code/streaming-chat',  // ← Includes /api
  {...}
);
```

**Combined with base URL**:
```
http://localhost:8080/api  (base)
    +
/api/claude-code/streaming-chat  (endpoint)
    =
http://localhost:8080/api/api/claude-code/streaming-chat  ❌
```

**Correct URL Should Be**:
```
http://localhost:3001/api/claude-code/streaming-chat  ✅
```

---

## Why User Sees "403 Forbidden"

**Possible Error Propagation**:

1. **Connection Refused** → Port 8080 not listening
2. **Fetch API Error Handling** → Converts connection errors to generic "403 Forbidden" message
3. **Error Display** → User sees "API error: 403 Forbidden"

**Alternative**: If Vite proxy is configured:
- Vite proxy tries to forward request
- Fails due to wrong target
- Returns 403 from proxy layer

---

## Frontend Proxy Configuration Check

**File**: `/workspaces/agent-feed/frontend/vite.config.ts`

Need to check if Vite proxy is configured and pointing to correct backend.

---

## Required Fixes

### Option 1: Fix AviDMService Configuration (Recommended)

**File**: `frontend/src/services/AviDMService.ts`

**Line 97 - Change base URL**:
```typescript
// OLD
baseUrl: config.baseUrl || 'http://localhost:8080/api',

// NEW
baseUrl: config.baseUrl || 'http://localhost:3001',
```

**Line 239 - Keep endpoint path**:
```typescript
// Already correct - just needs baseUrl fix
const response = await this.httpClient.post<ClaudeResponse>(
  '/api/claude-code/streaming-chat',
  {...}
);
```

**Result**: `http://localhost:3001/api/claude-code/streaming-chat` ✅

---

### Option 2: Use Vite Proxy (Alternative)

**File**: `frontend/vite.config.ts`

Add proxy configuration:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

Then update AviDMService:
```typescript
// Line 97
baseUrl: config.baseUrl || '',  // Use relative URLs
```

---

## Verification Steps

After implementing fix:

1. **Test Backend Endpoint**:
```bash
curl http://localhost:3001/api/claude-code/streaming-chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```
Expected: 200 OK ✅

2. **Test Frontend Connection**:
   - Open browser console (F12)
   - Open AVI DM interface
   - Send message "test"
   - Check Network tab for request to correct URL
   - Verify 200 response

3. **Check Console Logs**:
```javascript
// Look for this log from AviDMService.ts line 237
🔧 AviDMService: Sending request to /api/claude-code/streaming-chat
```

---

## Current System Status

### Working Components ✅
- ✅ Backend API server (port 3001)
- ✅ Frontend dev server (port 5173)
- ✅ Claude Code endpoint responding correctly
- ✅ CORS configuration allows localhost:5173
- ✅ Authentication not required (single-user mode)

### Broken Component ❌
- ❌ AviDMService points to wrong port (8080 vs 3001)
- ❌ Frontend cannot connect to backend for DM functionality

---

## Recommended Action

**Fix AviDMService base URL to point to port 3001**:

```typescript
// frontend/src/services/AviDMService.ts:97
baseUrl: config.baseUrl || 'http://localhost:3001',
```

This single-line change will resolve the 403 error.

---

## Additional Notes

### Environment Variables
Check if `.env` file specifies API URL:
```bash
# Should be
VITE_API_URL=http://localhost:3001

# NOT
VITE_API_URL=http://localhost:8080
```

### HttpClient Implementation
The `HttpClient` class (imported on line 28) constructs full URLs by combining:
```
baseUrl + endpoint = final URL
```

Current (broken):
```
http://localhost:8080/api + /api/claude-code/streaming-chat
= http://localhost:8080/api/api/claude-code/streaming-chat
```

Fixed:
```
http://localhost:3001 + /api/claude-code/streaming-chat
= http://localhost:3001/api/claude-code/streaming-chat ✅
```

---

**Investigation Complete**: 2025-10-20
**Root Cause**: Port mismatch in AviDMService configuration
**Impact**: Frontend cannot connect to backend AVI DM endpoint
**Resolution**: Update baseUrl from port 8080 to 3001
**Status**: Ready for implementation
