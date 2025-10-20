# AVI DM 403 Error - Quick Fix Guide

**Problem**: `/api/claude-code/streaming-chat` returns 403 Forbidden

**Root Cause**: Path protection middleware blocks requests referencing `/prod/` directory

**Solution**: Use the safe zone path instead

---

## Quick Fix (2 minutes)

### Step 1: Find AviDMService.ts

```bash
code /workspaces/agent-feed/frontend/src/services/AviDMService.ts
```

### Step 2: Locate the cwd parameter

Search for:
```typescript
options: {
  cwd: '/workspaces/agent-feed/prod'
```

### Step 3: Change to safe zone path

Replace with:
```typescript
options: {
  cwd: '/workspaces/agent-feed/prod/agent_workspace'
```

### Step 4: Create the directory

```bash
mkdir -p /workspaces/agent-feed/prod/agent_workspace
```

### Step 5: Test it

```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"message":"test","options":{"cwd":"/workspaces/agent-feed/prod/agent_workspace"}}'
```

Expected: `HTTP/1.1 200 OK` ✅

---

## Why This Works

The backend has a **safe zone** for agent operations:

```
✅ ALLOWED:  /workspaces/agent-feed/prod/agent_workspace/
❌ BLOCKED:  /workspaces/agent-feed/prod/
❌ BLOCKED:  /workspaces/agent-feed/frontend/
❌ BLOCKED:  /workspaces/agent-feed/api-server/
```

The middleware scans request bodies for filesystem paths and blocks access to protected directories.

---

## Testing Checklist

- [ ] Changed `cwd` to agent_workspace path
- [ ] Created agent_workspace directory
- [ ] Restarted frontend dev server
- [ ] Tested direct API call (curl)
- [ ] Tested AVI DM chat in browser
- [ ] Verified no 403 errors in console

---

## Environment Variable (Optional)

Add to `.env`:
```bash
VITE_AGENT_WORKSPACE_PATH=/workspaces/agent-feed/prod/agent_workspace
```

Then use in code:
```typescript
const workspacePath = import.meta.env.VITE_AGENT_WORKSPACE_PATH ||
                      '/workspaces/agent-feed/prod/agent_workspace';

options: {
  cwd: workspacePath
}
```

---

## Verification

### Before Fix ❌
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied: /prod/ is read-only"
}
```

### After Fix ✅
```json
{
  "success": true,
  "sessionId": "...",
  "message": "Chat session created"
}
```

---

## Need More Details?

See: `AVIDM-403-BACKEND-VALIDATION-REPORT.md` for full analysis.

---

**Last Updated**: 2025-10-20
