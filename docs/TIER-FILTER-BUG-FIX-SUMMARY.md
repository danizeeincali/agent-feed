# Tier Filter Bug Fix - Quick Summary

**Document**: SPARC-TIER-FILTER-BUG-FIX-SPEC.md
**Status**: Ready for Implementation
**Priority**: P0 (Critical)
**Estimated Time**: 2-4 hours

---

## The Problem

Clicking tier filter buttons (T1, T2, All) destroys `apiService` and shows "Route Disconnected" error.

**Root Cause**:
```
User clicks tier button
  → currentTier changes
    → loadAgents recreated (has currentTier in deps)
      → useEffect sees loadAgents changed
        → cleanup runs
          → apiService.destroy() called
            → Component shows "Route Disconnected"
```

---

## The Solution

**3 Simple Changes** to `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`:

### Change 1: Remove `currentTier` from `loadAgents` dependencies

```typescript
// BEFORE:
const loadAgents = useCallback(async () => {
  // ...
}, [apiService, currentTier]); // ❌

// AFTER:
const loadAgents = useCallback(async () => {
  // ...
}, [apiService]); // ✅
```

### Change 2: Remove `loadAgents` from main useEffect dependencies

```typescript
// BEFORE:
}, [routeKey, loadAgents, apiService, registerCleanup]); // ❌

// AFTER:
}, [routeKey, apiService, registerCleanup]); // ✅
```

### Change 3: Add separate useEffect for tier changes

```typescript
// Add AFTER main useEffect (after line 118):
useEffect(() => {
  console.log(`🔄 Tier filter changed: ${currentTier}`);

  if (!apiService.getStatus().isDestroyed) {
    loadAgents();
  }
}, [currentTier]); // Only currentTier
```

---

## Expected Results

After fix:
- ✅ Click T1 → Shows 9 agents (no errors)
- ✅ Click T2 → Shows 10 agents (no errors)
- ✅ Click All → Shows 19 agents (no errors)
- ✅ apiService stays alive during tier changes
- ✅ NO "Route Disconnected" errors

---

## Testing Checklist

**Manual Testing**:
- [ ] Click T1 button → 9 agents, no errors
- [ ] Click T2 button → 10 agents, no errors
- [ ] Click All button → 19 agents, no errors
- [ ] Rapid clicking → still works, no errors
- [ ] Console shows "🔄 Tier filter changed" (not "🧹 Destroying")

**Automated Testing**:
- [ ] Run unit tests: `npm test tier-filtering-bug-fix.test.tsx`
- [ ] Run E2E tests: `npx playwright test tier-filtering-bug-fix.spec.ts`
- [ ] Run API validation: `./tests/e2e/tier-filtering-api-validation.sh`

**Console Validation**:
```
✅ GOOD: "🔄 Tier filter changed: 1"
✅ GOOD: "📡 Loading agents for tier: 1"
✅ GOOD: "✅ Loaded 9 agents (tier: 1)"

❌ BAD: "🧹 Destroying API Service" (should NOT appear during tier change)
```

---

## Files to Change

1. `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`
   - Line 64: Update `loadAgents` dependencies
   - Line 118: Update main useEffect dependencies
   - Line 119: Add tier change useEffect

---

## Implementation Steps

1. **Fix useEffect (30 min)**:
   - Update dependencies as shown above
   - Add tier change effect

2. **Add logging (15 min)**:
   - Add console logs for debugging
   - Track tier changes and API status

3. **Test (60 min)**:
   - Manual testing: click all tier buttons
   - Unit tests: verify useEffect behavior
   - E2E tests: full user workflow

4. **Document (30 min)**:
   - Create implementation summary
   - Capture screenshots
   - Update CHANGELOG

---

## Success Metrics

- **Zero "Route Disconnected" errors** during tier filtering
- **100% tier button success rate** (all work correctly)
- **Correct agent counts**: 9 T1, 10 T2, 19 All
- **100% test pass rate**

---

## Quick Reference: Full Spec

For complete specification with all acceptance criteria, test cases, and implementation details:

**Read**: `/workspaces/agent-feed/docs/SPARC-TIER-FILTER-BUG-FIX-SPEC.md`

---

**Ready to implement!**
