# Agent Filtering Implementation Guide

**Quick Reference for Implementing File-Based Agent Discovery**

---

## TL;DR - The Fix

```javascript
// /workspaces/agent-feed/api-server/server.js

// 1. REMOVE database handler at line ~688
// 2. ADD file-based router import
// 3. MOUNT router at /api
// 4. RESTART server
```

**Result**: API returns 13 production agents instead of 22.

---

## Implementation Steps

### Step 1: Remove Database Handler (Line ~688)
Delete the inline `/api/agents` handler

### Step 2: Import File-Based Router
Add: `import agentsRouter from '../src/api/routes/agents.js';`

### Step 3: Mount Router
Add: `app.use('/api', agentsRouter);`

### Step 4: Restart Server
Run: `npm run dev`

### Step 5: Verify
Test: `curl http://localhost:3001/api/agents | jq '.agents | length'`
Expected: `13`

---

## Validation Commands

```bash
# Count agents (should be 13)
curl http://localhost:3001/api/agents | jq '.agents | length'

# Check data source (should be file-based-discovery)
curl http://localhost:3001/api/agents | jq '.metadata.data_source'

# Run full test suite
npx playwright test tests/e2e/agent-filtering-validation.spec.ts
```

---

**Estimated Time**: 15 minutes
**Risk Level**: Low
**Reversible**: Yes (via git)
