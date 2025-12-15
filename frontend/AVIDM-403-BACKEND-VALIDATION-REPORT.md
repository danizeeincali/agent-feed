# AVI DM 403 Error - Backend Validation Report

**Date**: 2025-10-20
**Investigator**: Backend API Developer Agent
**Status**: ROOT CAUSE IDENTIFIED ✅

---

## Executive Summary

The 403 Forbidden error from `/api/claude-code/streaming-chat` is caused by the **Path Protection Middleware** blocking requests that reference the `/workspaces/agent-feed/prod/` directory path in the request body.

**Root Cause**: The `protectCriticalPaths` middleware intercepts POST requests and scans the body for filesystem paths, then blocks access to `/prod/` (except for the safe zone at `/prod/agent_workspace/`).

---

## Investigation Findings

### 1. Endpoint Configuration ✅

**File**: `/workspaces/agent-feed/api-server/server.js`

```javascript
// Line 46: Middleware import
import { protectCriticalPaths } from './middleware/protectCriticalPaths.js';

// Line 181: Middleware applied BEFORE routes
app.use(protectCriticalPaths);

// Line 209: Claude Code routes mounted
app.use('/api/claude-code', claudeCodeRoutes);
```

**CORS Configuration**: ✅ Properly configured
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

**Authentication**: ❌ No authentication middleware on this endpoint
**Authorization**: ❌ No authorization checks

---

### 2. Path Protection Middleware Analysis

**File**: `/workspaces/agent-feed/api-server/middleware/protectCriticalPaths.js`

#### Security Model (Inverted Allow-List)

```javascript
const ALLOWED_BASE_PATH = '/workspaces/agent-feed/prod/';
const UNRESTRICTED_SUBPATH = '/workspaces/agent-feed/prod/agent_workspace/';
const BLOCKED_SIBLING_DIRECTORIES = [
  '/workspaces/agent-feed/frontend/',
  '/workspaces/agent-feed/api-server/',
  // ... other directories
];
```

#### Middleware Logic Flow

1. **Skip non-mutating requests**: GET, HEAD, OPTIONS ✅
2. **Extract filesystem paths** from request body using regex pattern:
   ```javascript
   const pathPattern = /\/workspaces\/agent-feed\/[^\s"'`,\]})]+/gi;
   ```
3. **Check each detected path**:
   - ✅ **ALLOW**: Paths in `/prod/agent_workspace/` (unrestricted zone)
   - ❌ **BLOCK**: Paths in blocked sibling directories
   - ⚠️ **CONDITIONAL**: Paths in `/prod/` but not in `agent_workspace/`
   - ✅ **ALLOW**: Paths outside `/workspaces/agent-feed/`

4. **Return 403** if any path is blocked

---

### 3. Direct API Testing Results

#### Test 1: Request with `/prod/` path ❌

```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"message":"test","options":{"cwd":"/workspaces/agent-feed/prod"}}'
```

**Response**: `HTTP/1.1 403 Forbidden`

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied: /prod/ is read-only",
  "blockedPath": "/workspaces/agent-feed/prod/",
  "reason": "directory_protected",
  "blockedDirectory": "prod",
  "allowedPaths": ["/workspaces/agent-feed/prod/ (except protected files)"],
  "safeZone": "/workspaces/agent-feed/prod/agent_workspace/",
  "hint": "Only the /prod/ directory is writable. All other directories are read-only to protect application code.",
  "tip": "To work freely, use paths like: /workspaces/agent-feed/prod/agent_workspace/your-file.txt"
}
```

#### Test 2: Request with safe zone path ✅

```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"message":"test","options":{"cwd":"/workspaces/agent-feed/prod/agent_workspace"}}'
```

**Response**: `HTTP/1.1 200 OK` ✅

The request was successful when using the unrestricted safe zone path.

---

## Why This Is Happening

### Request Body Path Extraction

The middleware extracts ALL filesystem paths from the JSON body:

```javascript
// From request: {"message":"test","options":{"cwd":"/workspaces/agent-feed/prod"}}
const bodyString = JSON.stringify(req.body);
const detectedPaths = extractFilesystemPaths(bodyString);
// Result: ["/workspaces/agent-feed/prod"]
```

### Path Validation

The detected path `/workspaces/agent-feed/prod` triggers:

```javascript
// Check if in unrestricted zone
if (normalizedPath.startsWith('/workspaces/agent-feed/prod/agent_workspace/')) {
  continue; // PASS
}

// Check if blocked sibling directory
const siblingCheck = checkBlockedSiblingDirectory(normalizedPath);
// Result: BLOCKED because it's under /prod/ but not in agent_workspace/
```

---

## Impact Assessment

### Current Behavior

| Request Type | Path Used | Result |
|-------------|-----------|--------|
| AVI DM Chat | `/workspaces/agent-feed/prod/` | ❌ 403 Forbidden |
| Frontend Vite Proxy | `/workspaces/agent-feed/prod/` | ❌ 403 Forbidden |
| Direct API Call | `/workspaces/agent-feed/prod/agent_workspace/` | ✅ 200 OK |

### Security Intent

The middleware is **working as designed** to protect:
- Application source code in `/frontend/`, `/api-server/`
- Configuration files in `/prod/` root
- Critical system files

The safe zone `/prod/agent_workspace/` is provided for unrestricted agent operations.

---

## Solution Options

### Option 1: Use Safe Zone Path (Recommended) ✅

**Change the `cwd` in frontend requests to use the safe zone:**

```typescript
// In AviDMService.ts
const response = await fetch(`${this.apiBaseUrl}/api/claude-code/streaming-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: userMessage,
    options: {
      cwd: '/workspaces/agent-feed/prod/agent_workspace', // Safe zone
      // or use: process.env.VITE_AGENT_WORKSPACE_PATH
    },
  }),
});
```

**Pros**:
- No backend changes required
- Maintains security boundaries
- Follows intended architecture

**Cons**:
- Agents can only work in `agent_workspace/` directory

---

### Option 2: Add Exemption for AVI DM Requests

**Modify middleware to allow read-only operations in `/prod/`:**

```javascript
// In protectCriticalPaths.js
export const protectCriticalPaths = (req, res, next) => {
  // Add exemption for Claude Code streaming chat (read-only operations)
  if (req.path === '/api/claude-code/streaming-chat' && req.method === 'POST') {
    // Allow but log the operation
    console.log('⚠️  AVI DM request to /prod/ - allowing read-only operation');
    return next();
  }

  // ... rest of middleware logic
};
```

**Pros**:
- Allows agents to read from entire `/prod/` directory
- Frontend code doesn't need changes

**Cons**:
- Weakens security boundaries
- Agents could potentially read sensitive config files
- Requires backend modification

---

### Option 3: Path Rewriting in Proxy

**Add path rewriting in Vite proxy config:**

```typescript
// In vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/claude-code/streaming-chat': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Rewrite cwd path to safe zone
            if (req.body && req.body.options && req.body.options.cwd) {
              req.body.options.cwd = req.body.options.cwd.replace(
                '/workspaces/agent-feed/prod',
                '/workspaces/agent-feed/prod/agent_workspace'
              );
            }
          });
        },
      },
    },
  },
});
```

**Pros**:
- Transparent to frontend code
- Maintains backend security

**Cons**:
- Complex proxy manipulation
- May break other use cases

---

## Recommended Solution

**Use Option 1: Update Frontend to Use Safe Zone Path**

### Implementation Steps

1. **Add environment variable** to `/workspaces/agent-feed/frontend/.env`:
   ```bash
   VITE_AGENT_WORKSPACE_PATH=/workspaces/agent-feed/prod/agent_workspace
   ```

2. **Update AviDMService.ts**:
   ```typescript
   const workspacePath = import.meta.env.VITE_AGENT_WORKSPACE_PATH ||
                         '/workspaces/agent-feed/prod/agent_workspace';

   options: {
     cwd: workspacePath,
   }
   ```

3. **Create agent_workspace directory** if it doesn't exist:
   ```bash
   mkdir -p /workspaces/agent-feed/prod/agent_workspace
   ```

4. **Test the fix**:
   ```bash
   curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test","options":{"cwd":"/workspaces/agent-feed/prod/agent_workspace"}}'
   ```

---

## Validation Checklist

- [x] Backend endpoint exists and is mounted
- [x] CORS is configured correctly
- [x] Path protection middleware is the blocker
- [x] Safe zone path works (200 OK)
- [x] Direct API call confirmed root cause
- [ ] Frontend updated to use safe zone
- [ ] End-to-end test with AVI DM
- [ ] Documentation updated

---

## Additional Findings

### Security Headers Present ✅

The backend returns comprehensive security headers:
```
Content-Security-Policy: default-src 'self';...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### Rate Limiting Active ✅

```
RateLimit-Policy: 1000;w=900
RateLimit-Limit: 1000
RateLimit-Remaining: 953
```

1000 requests per 15 minutes (900 seconds) per IP.

### No Authentication Required ⚠️

The endpoint does not require authentication or authorization. This is a security consideration but not the cause of the 403 error.

---

## Conclusion

**The backend is configured correctly** but is intentionally blocking requests that reference `/prod/` directory to protect application code.

**The 403 error is a feature, not a bug** - it's the path protection middleware doing its job.

**The fix is on the frontend**: Change the `cwd` parameter to use the safe zone at `/workspaces/agent-feed/prod/agent_workspace/`.

---

## Next Steps

1. ✅ **Validation Complete** - Root cause identified
2. ⏭️ **Frontend Fix Required** - Update AviDMService.ts
3. ⏭️ **Testing** - Verify end-to-end functionality
4. ⏭️ **Documentation** - Update API docs with safe zone requirements

---

**Report Generated**: 2025-10-20 21:35 UTC
**Agent**: Backend API Developer
**Files Analyzed**:
- `/workspaces/agent-feed/api-server/server.js`
- `/workspaces/agent-feed/api-server/middleware/protectCriticalPaths.js`
- `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
