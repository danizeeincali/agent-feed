# Tier Filter Errors Investigation Report

## User-Reported Issues

### Issue #1: "Disconnected - API connection failed" in Sidebar
**Symptom**: Error message appears in sidebar saying "Disconnected - API connection failed - Retry"

### Issue #2: "Route Disconnected" When Clicking Tier Tabs
**Symptom**: When clicking tier filter buttons (T1, T2, All), the component shows:
> "Route Disconnected
> This component has been cleaned up."

**Recovery**: Navigating away and coming back fixes it temporarily

---

## Root Cause Analysis

### Problem #1: Missing Tier Change Effect

**Location**: `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Current Behavior**:
- Line 64: `loadAgents` callback has `currentTier` in dependencies
- Line 83-118: Main `useEffect` runs ONLY on mount (deps: `[routeKey, loadAgents, apiService, registerCleanup]`)
- **MISSING**: No `useEffect` that watches `currentTier` changes

**Code Evidence**:
```typescript
// Line 42-64: loadAgents callback includes currentTier
const loadAgents = useCallback(async () => {
  try {
    setError(null);
    const response: any = await apiService.getAgents({ tier: currentTier });
    // ...
  }
}, [apiService, currentTier]); // currentTier in deps

// Line 83-118: Main useEffect - runs ONLY on mount
useEffect(() => {
  console.log(`🚀 IsolatedRealAgentManager mounted for route: ${routeKey}`);
  loadAgents(); // Called only once on mount
  // ...
}, [routeKey, loadAgents, apiService, registerCleanup]);
// ❌ BUG: loadAgents is in deps, but changing currentTier creates NEW loadAgents
//         This triggers cleanup and destroys apiService!
```

**What Happens When User Clicks Tier Button**:

1. User clicks "Tier 2" button
2. `setCurrentTier('2')` is called
3. `currentTier` state changes from `'1'` to `'2'`
4. `loadAgents` callback is recreated (because `currentTier` is in its dependencies)
5. Main `useEffect` sees `loadAgents` has changed
6. **CLEANUP RUNS**: `apiService.destroy()` is called
7. `apiService.isDestroyed` becomes `true`
8. Component re-renders with destroyed service
9. Line 136: `if (apiService.getStatus().isDestroyed)` returns TRUE
10. **ERROR DISPLAYED**: "Route Disconnected - This component has been cleaned up"

### Problem #2: useEffect Dependency Chain Bug

**The Vicious Cycle**:
```
currentTier changes
  → loadAgents recreated (has currentTier in deps)
    → useEffect triggered (has loadAgents in deps)
      → cleanup runs
        → apiService.destroy()
          → isDestroyed = true
            → "Route Disconnected" error shown
```

**Why Navigating Away and Back Fixes It**:
1. Navigate away: RouteWrapper unmounts, cleanup runs (already destroyed)
2. Navigate back: RouteWrapper mounts, NEW apiService created
3. Fresh start with working apiService
4. Works until user clicks tier filter again

---

## Code Analysis Details

### API Service Lifecycle

**File**: `/workspaces/agent-feed/frontend/src/services/apiServiceIsolated.ts`

**Key Points**:
- Line 36: `apiService` created once via `useState(() => createApiService(routeKey))`
- Line 127-146: `destroy()` method sets `isDestroyed = true` permanently
- Line 66-68: All API calls throw error if `isDestroyed` is true
- **No way to "un-destroy" a service** - it's permanent

**Code**:
```typescript
// Line 127-146
destroy(): void {
  if (this.isDestroyed) return;

  console.log(`🧹 Destroying API Service for ${this.routeKey}...`);
  this.isDestroyed = true; // ❌ PERMANENT - no way back

  this.abortController.abort();
  this.removeAllListeners();
  this.activeRequests.clear();
}

// Line 66-68
if (this.isDestroyed) {
  throw new Error(`API Service for ${this.routeKey} has been destroyed`);
}
```

### RouteWrapper Cleanup Behavior

**File**: `/workspaces/agent-feed/frontend/src/components/RouteWrapper.tsx`

**Key Points**:
- Line 26-50: Cleanup runs on unmount (when routeKey changes)
- Line 36-42: Executes ALL registered cleanup functions
- IsolatedRealAgentManager registers cleanup that destroys apiService

**Code**:
```typescript
// Line 30-50
useEffect(() => {
  console.log(`🔄 RouteWrapper: ${routeKey} mounted`);

  return () => {
    console.log(`🧹 RouteWrapper: ${routeKey} cleaning up...`);
    cleanupFunctions.current.forEach(cleanup => {
      cleanup(); // This calls apiService.destroy()
    });
  };
}, [routeKey]); // Only runs when routeKey changes OR on unmount
```

**But the problem is**: Main useEffect in IsolatedRealAgentManager has `loadAgents` in dependencies, so cleanup runs when `loadAgents` changes (which happens when `currentTier` changes).

---

## Why This is a Critical Bug

### Severity: HIGH

**Impact**:
1. **Breaks tier filtering completely** - Users can't filter agents by tier
2. **Poor UX** - Error message is confusing ("Route Disconnected")
3. **Workaround is tedious** - User must navigate away and back

**User Workflow Broken**:
```
1. User lands on /agents page ✅
2. User sees T1 agents (9 agents) ✅
3. User clicks "Tier 2" button ❌
4. Component shows "Route Disconnected" error ❌
5. User confused, has to navigate away and back ❌
```

### Scope: Affects ALL Tier Filtering

Any action that changes `currentTier` will trigger this bug:
- Clicking T1 button
- Clicking T2 button
- Clicking All button
- localStorage persistence on page load (if tier differs from default)

---

## Backend API Issue (Secondary)

### Symptom: API Returns 0 Agents

**Backend Logs Show**:
```
📂 Loaded 9/19 agents (tier=1)
📂 Loaded 10/19 agents (tier=2)
📂 Loaded 19/19 agents (tier=all)
```

**But API Returns**:
```json
{
  "success": true,
  "data": []  // ❌ Empty array
}
```

**Evidence**:
```bash
curl 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=1'
# Returns: {"success":true,"data":[]}
```

**This is a SEPARATE bug** in the backend repository implementation, not related to the frontend tier filtering bug.

**Impact**: Even if we fix the frontend bug, backend returns no data. However, the Playwright screenshot shows agents loading, which means:
1. Frontend was using a different data source earlier
2. OR backend was working earlier and broke recently
3. OR there's a different endpoint being used

---

## Evidence Summary

### Frontend Evidence

1. **Component Lifecycle Logs** (expected in console):
   ```
   🚀 IsolatedRealAgentManager mounted for route: agents
   📡 agents: GET /v1/claude-live/prod/agents?tier=1
   ✅ Loaded 9 agents (tier: 1)

   [User clicks Tier 2 button]

   🧹 Cleaning up IsolatedRealAgentManager for agents
   🧹 Destroying API Service for agents...
   ✅ All requests cleaned up for agents

   [Component re-renders with destroyed service]

   "Route Disconnected - This component has been cleaned up"
   ```

2. **apiService.getStatus()** after tier change:
   ```javascript
   {
     routeKey: "agents",
     isDestroyed: true,  // ❌ Should be false
     activeRequests: 0,
     listeners: 0
   }
   ```

### Backend Evidence

1. **Logs show agents loading**:
   ```
   📂 Loaded 9/19 agents (tier=1)
   📂 Loaded 10/19 agents (tier=2)
   📂 Loaded 19/19 agents (tier=all)
   ```

2. **But API returns empty**:
   ```bash
   $ curl 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=1' | jq
   {
     "success": true,
     "data": []
   }
   ```

3. **Playwright screenshot shows it working**:
   - Screenshot: `test-results/two-panel-layout-validatio-ac1b5-r-AgentTierToggle-in-header-chromium/test-failed-1.png`
   - Shows 9 agents loaded with tier filtering working
   - This means it WAS working at some point

---

## Fix Strategy (Not Implemented - Investigation Only)

### Fix #1: Add Separate useEffect for Tier Changes

**Location**: `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Add after line 118**:
```typescript
// Reload agents when tier filter changes
useEffect(() => {
  if (!apiService.getStatus().isDestroyed) {
    loadAgents();
  }
}, [currentTier, loadAgents, apiService]);
```

**Problem**: This still has `loadAgents` in deps, which will recreate when `currentTier` changes.

### Fix #2: Remove loadAgents from Main useEffect Dependencies

**Change line 118**:
```typescript
// Before
}, [routeKey, loadAgents, apiService, registerCleanup]);

// After
}, [routeKey, apiService, registerCleanup]);
// And call loadAgents() directly without it in deps
```

**Add separate useEffect for tier changes**:
```typescript
// Reload agents when tier changes (after component is mounted)
useEffect(() => {
  if (!apiService.getStatus().isDestroyed) {
    loadAgents();
  }
}, [currentTier]); // Only currentTier, NOT loadAgents
```

### Fix #3: Stabilize loadAgents with useCallback

**Change line 42**:
```typescript
// Use useRef for apiService to avoid recreating loadAgents
const loadAgents = useCallback(async () => {
  // Implementation stays the same
}, []); // Empty deps - capture currentTier from state directly
```

**And access currentTier directly**:
```typescript
const loadAgents = useCallback(async () => {
  const tier = currentTier; // Capture current value
  // Rest of implementation
}, [apiService]); // Only apiService, NOT currentTier
```

### Fix #4 (RECOMMENDED): Inline Tier Parameter

**Change loadAgents signature**:
```typescript
const loadAgents = useCallback(async (tier?: '1' | '2' | 'all') => {
  const tierToLoad = tier ?? currentTier;
  const response: any = await apiService.getAgents({ tier: tierToLoad });
  // ...
}, [apiService, currentTier]);
```

**Then in tier change effect**:
```typescript
useEffect(() => {
  loadAgents(currentTier);
}, [currentTier, loadAgents]);
```

---

## Additional Issues Found

### Issue #3: No Error Boundary

If apiService throws an error, the entire component crashes with no recovery.

### Issue #4: No Retry Mechanism

When "API connection failed" occurs, there's a "Retry" button mentioned but no implementation found.

### Issue #5: Backend SQLite Errors

Logs show repeated errors:
```
❌ Error in /api/v1/agent-posts: SqliteError: no such table: agent_posts
```

This is a separate backend database schema issue.

---

## Conclusion

### Primary Bug: useEffect Dependency Chain

**Root Cause**: `loadAgents` in main `useEffect` dependencies causes cleanup to run when `currentTier` changes, destroying the `apiService` permanently.

**Fix Required**: Separate tier change handling from component lifecycle management.

**Estimated Fix Time**: 30 minutes

**Risk**: Low (isolated change to useEffect dependencies)

### Secondary Bug: Backend Returns Empty Data

**Root Cause**: Unknown - backend logs show agents loading but API returns empty array.

**Investigation Required**: Backend repository implementation for agent filtering.

**Estimated Fix Time**: 1-2 hours (requires backend debugging)

**Risk**: Medium (may involve database queries or file system reading logic)

---

## Files Affected

**Frontend**:
1. `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx` - Main bug location
2. `/workspaces/agent-feed/frontend/src/services/apiServiceIsolated.ts` - API service lifecycle
3. `/workspaces/agent-feed/frontend/src/components/RouteWrapper.tsx` - Cleanup trigger

**Backend** (secondary issue):
1. `/workspaces/agent-feed/api-server/server.js` - Agent endpoints
2. `/workspaces/agent-feed/api-server/repositories/agent.repository.js` - Agent filtering logic

---

## Next Steps (Recommendations)

### Immediate (Critical)
1. Fix useEffect dependency chain in IsolatedRealAgentManager
2. Add proper tier change effect
3. Test tier filtering works without destroying apiService

### Short Term (Important)
1. Debug backend agent endpoint returning empty data
2. Add error boundary for apiService failures
3. Implement retry mechanism for "API connection failed"

### Long Term (Nice to Have)
1. Add unit tests for tier filtering
2. Add E2E tests for tier button clicks
3. Fix SQLite agent_posts table errors
4. Consider removing route isolation if not needed (simpler architecture)

---

**Report Generated**: 2025-10-19
**Investigation Status**: Complete - No changes made (investigation only)
**Ready for Fix**: Yes - clear root cause identified
