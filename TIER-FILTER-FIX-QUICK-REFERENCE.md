# Tier Filter Fix - Quick Reference

## The Bug in One Diagram

```
User clicks "Tier 2" button
    ↓
currentTier changes: '1' → '2'
    ↓
loadAgents recreated (has currentTier in deps)
    ↓
useEffect sees loadAgents changed
    ↓
Cleanup runs → apiService.destroy()
    ↓
isDestroyed = true (PERMANENT)
    ↓
💥 "Route Disconnected" error shown
```

## The Fix in One Diagram

```
User clicks "Tier 2" button
    ↓
currentTier changes: '1' → '2'
    ↓
Tier effect triggered (separate from lifecycle)
    ↓
Check: apiService.isDestroyed? NO ✅
    ↓
Call loadAgents(tier='2')
    ↓
API request → Backend filters → Return 10 agents
    ↓
✅ Success - Show Tier 2 agents
```

---

## Code Changes Needed

### 1. Add useRef for tier (Line 39)
```typescript
const { currentTier, setCurrentTier, showTier1, showTier2 } = useAgentTierFilter();
const currentTierRef = useRef<TierFilter>(currentTier); // ADD THIS
```

### 2. Refactor loadAgents (Lines 42-64)
```typescript
// BEFORE: Depends on currentTier
const loadAgents = useCallback(async () => {
  const response = await apiService.getAgents({ tier: currentTier });
  // ...
}, [apiService, currentTier]); // ❌ BAD

// AFTER: Accepts tier parameter
const loadAgents = useCallback(async (tier?: TierFilter) => {
  const tierToUse = tier ?? currentTierRef.current;
  const response = await apiService.getAgents({ tier: tierToUse });
  // ...
}, [apiService]); // ✅ GOOD - only apiService
```

### 3. Sync ref with state (After Line 64)
```typescript
useEffect(() => {
  currentTierRef.current = currentTier;
}, [currentTier]);
```

### 4. Update main useEffect (Lines 83-118)
```typescript
// BEFORE
}, [routeKey, loadAgents, apiService, registerCleanup]); // ❌ loadAgents in deps

// AFTER
}, [routeKey, apiService, registerCleanup]); // ✅ Removed loadAgents
```

### 5. Add tier change effect (After Line 118)
```typescript
// Reload agents when tier changes
useEffect(() => {
  if (loading) return; // Skip initial mount
  if (apiService.getStatus().isDestroyed) return; // Safety check
  
  setLoading(true);
  loadAgents(currentTier);
}, [currentTier]); // ✅ Only tier changes trigger this
```

---

## Testing Checklist

- [ ] Click T1 button → No error
- [ ] Click T2 button → No error
- [ ] Click All button → No error
- [ ] Rapid clicking → No crashes
- [ ] Navigate away → Tier persists
- [ ] Refresh page → Tier loads from localStorage
- [ ] Console → No "Route Disconnected" errors
- [ ] Network tab → API returns agents array with data

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| IsolatedRealAgentManager.tsx | ~45 | Fix useEffect dependencies |

## Files NOT Modified (Backend working)

- server.js ✅
- agent.repository.js ✅
- database-selector.js ✅
- apiServiceIsolated.ts ✅

---

## What NOT to Do

❌ Don't remove route isolation
❌ Don't recreate apiService on tier change
❌ Don't add tier to main useEffect deps
❌ Don't modify backend (it's working)
❌ Don't remove cleanup from main useEffect

---

## Emergency Rollback

```bash
# If fix breaks something
git checkout HEAD~1 -- frontend/src/components/IsolatedRealAgentManager.tsx
localStorage.removeItem('agentTierFilter')
npm run dev
```

---

## Success Criteria

Before Fix:
- ❌ Tier filtering broken
- ❌ "Route Disconnected" error on tier change
- ❌ Component destroyed on tier clicks

After Fix:
- ✅ Tier filtering works
- ✅ No error messages
- ✅ Component stable across tier changes
- ✅ apiService remains active

---

**Full Documentation**: `/workspaces/agent-feed/docs/ARCHITECTURE-TIER-FILTER-FIX.md`
**Summary**: `/workspaces/agent-feed/TIER-FILTER-FIX-SUMMARY.md`
