# SPARC: System Initialization Hook Fix

**Date**: 2025-11-03
**Status**: SPECIFICATION PHASE
**Implementation Method**: Claude-Flow Swarm (3 concurrent agents)

---

## S - Specification

### Problem Statement

The `useSystemInitialization` hook incorrectly checks for ANY posts instead of systemInitialization posts specifically. This prevents initialization from running when old posts exist.

**Current Behavior** ❌:
```typescript
// Line 30 in useSystemInitialization.ts
const postsResponse = await fetch(`/api/agent-posts?userId=${userId}&limit=1`);
const hasPosts = posts.length > 0; // ❌ Checks for ANY posts

if (!hasPosts) {  // Never triggers when old posts exist
  // Initialize...
}
```

**Issue**: User has 29 old posts → Hook thinks user is initialized → Skips welcome posts

**Expected Behavior** ✅:
```typescript
// Use /api/system/state endpoint
const stateResponse = await fetch(`/api/system/state?userId=${userId}`);
const state = await stateResponse.json();
const hasWelcomePosts = state.state?.hasWelcomePosts || false;

if (!hasWelcomePosts) {  // ✅ Checks for systemInitialization posts
  // Initialize...
}
```

### Requirements

**FR-1: Correct Initialization Detection**
- Hook MUST check for systemInitialization posts, not any posts
- Use existing `/api/system/state` endpoint (already implemented correctly)
- Preserve old posts (don't delete them)

**FR-2: Backward Compatibility**
- Hook must work with users who have existing posts
- Hook must work with new users (no posts)
- Idempotency preserved (can call multiple times safely)

**FR-3: Testing**
- Update unit tests to match new implementation
- Integration test: 29 old posts + initialization → 32 total posts
- E2E test: Verify welcome posts appear with old posts present

### Acceptance Criteria

**AC-1: Hook Uses Correct Endpoint**
- ✅ Hook calls `GET /api/system/state` instead of `GET /api/agent-posts`
- ✅ Hook checks `state.hasWelcomePosts` flag
- ✅ Old code checking for any posts removed

**AC-2: Initialization Works With Old Posts**
- ✅ User with 29 old posts → Hook detects no welcome posts
- ✅ Hook triggers initialization
- ✅ 3 welcome posts created
- ✅ Old posts preserved (32 total)

**AC-3: Tests Pass**
- ✅ Unit tests: 15/15 passing
- ✅ Integration tests: Verify 32 total posts after init
- ✅ E2E tests: Screenshots show old + new posts

---

## P - Pseudocode

### Frontend Hook Fix

```typescript
// FILE: /workspaces/agent-feed/frontend/src/hooks/useSystemInitialization.ts

export function useSystemInitialization(userId: string = 'demo-user-123') {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAndInitialize() {
      try {
        // OLD: Check for any posts (WRONG)
        // const postsResponse = await fetch(`/api/agent-posts?userId=${userId}&limit=1`);
        // const hasPosts = posts.length > 0;

        // NEW: Check system state (CORRECT)
        const stateResponse = await fetch(`/api/system/state?userId=${userId}`);

        if (!stateResponse.ok) {
          throw new Error(`Failed to check system state: ${stateResponse.statusText}`);
        }

        const stateData = await stateResponse.json();

        // Check if welcome posts exist
        const hasWelcomePosts = stateData.state?.hasWelcomePosts || false;

        if (!hasWelcomePosts) {
          // User needs initialization
          setIsInitializing(true);

          const initResponse = await fetch('/api/system/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });

          if (!initResponse.ok) {
            throw new Error(`Failed to initialize: ${initResponse.statusText}`);
          }

          const initData = await initResponse.json();

          if (initData.success) {
            setIsInitialized(true);
            console.log('✅ System initialized:', initData.postsCreated || 0, 'posts created');
          } else {
            setError(initData.error || 'Failed to initialize');
          }
        } else {
          // User already has welcome posts
          setIsInitialized(true);
          console.log('✅ System already initialized');
        }
      } catch (err) {
        console.error('❌ Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsInitialized(true); // Don't block app
      } finally {
        setIsInitializing(false);
      }
    }

    checkAndInitialize();
  }, [userId]);

  return { isInitializing, isInitialized, error };
}
```

### Backend Endpoint (Already Correct)

```javascript
// FILE: /workspaces/agent-feed/api-server/routes/system-initialization.js
// Line 105-164 (ALREADY IMPLEMENTED CORRECTLY)

router.get('/state', async (req, res) => {
  const { userId = 'demo-user-123' } = req.query;

  // Check if welcome posts exist
  const welcomePostsCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM agent_posts
    WHERE metadata LIKE '%systemInitialization%'
      AND metadata LIKE ?
  `).get(`%"userId":"${userId}"%`)?.count || 0;

  res.json({
    success: true,
    state: {
      hasWelcomePosts: welcomePostsCount >= 3,
      welcomePostsCount,
      // ... other state
    }
  });
});
```

---

## A - Architecture

### Data Flow (Fixed)

```
User loads app (has 29 old posts)
         │
         ▼
useSystemInitialization hook runs
         │
         ▼
GET /api/system/state?userId=demo-user-123
         │
         ▼
Backend checks:
  SELECT COUNT(*) FROM agent_posts
  WHERE metadata LIKE '%systemInitialization%'
         │
         ▼
Returns: { hasWelcomePosts: false, welcomePostsCount: 0 }
         │
         ▼
Hook detects: No welcome posts! (even though 29 old posts exist)
         │
         ▼
POST /api/system/initialize
         │
         ▼
Backend creates 3 welcome posts
         │
         ▼
Feed displays: 32 total posts (3 new welcome + 29 old)
         │
         ▼
User sees: Λvi, Onboarding, Reference at TOP
```

### Comparison: Before vs After

**BEFORE (Broken)** ❌:
```
Hook checks: "Does user have ANY posts?"
→ User has 29 posts
→ Hook thinks: "Already initialized"
→ Skips initialization
→ No welcome posts created
```

**AFTER (Fixed)** ✅:
```
Hook checks: "Does user have systemInitialization posts?"
→ Backend queries metadata for flag
→ Returns: hasWelcomePosts = false
→ Hook triggers initialization
→ 3 welcome posts created
→ Total: 32 posts (29 old + 3 new)
```

---

## R - Refinement

### Agent Task Breakdown

**Agent 1: Hook Fix + Unit Tests** (Priority: P0)
- **Deliverable**: Modified useSystemInitialization.ts + passing tests
- **Tasks**:
  1. Replace `/api/agent-posts` call with `/api/system/state`
  2. Change `hasPosts` check to `hasWelcomePosts` check
  3. Update error messages for clarity
  4. Update unit tests to mock `/api/system/state` endpoint
  5. Verify 15/15 tests passing
  6. Add test: "Works with old posts present"
- **Validation**: Run `npm test` in frontend, verify all pass

**Agent 2: Integration Testing** (Priority: P1)
- **Deliverable**: Integration test suite validating fix
- **Tasks**:
  1. Create test: User with 29 old posts + no welcome posts
  2. Call initialization
  3. Verify 3 welcome posts created
  4. Verify 32 total posts
  5. Verify old posts preserved
  6. Test idempotency: Call twice, still 32 posts
  7. Real database validation (NO MOCKS)
- **Validation**: Query database, count posts

**Agent 3: Playwright E2E + Screenshots** (Priority: P1)
- **Deliverable**: E2E test with screenshots
- **Tasks**:
  1. Ensure 29 old posts + 0 welcome posts in database
  2. Load app in browser
  3. Verify loading screen appears
  4. Verify 3 welcome posts appear at TOP
  5. Verify old posts still visible (scroll down)
  6. Capture screenshots (before, during, after)
  7. Verify no console errors
- **Validation**: Screenshots show correct behavior

### Test Plan

**Unit Tests** (Agent 1):
```typescript
// Test: Hook uses /api/system/state
it('should check system state instead of posts', async () => {
  // Mock /api/system/state to return hasWelcomePosts: false
  // Verify hook calls /api/system/initialize
  // Verify hook does NOT call /api/agent-posts
});

// Test: Works with old posts present
it('should initialize even when old posts exist', async () => {
  // Mock /api/system/state: hasWelcomePosts: false
  // Verify initialization triggers
});
```

**Integration Tests** (Agent 2):
```javascript
// Test: Full flow with old posts
it('should create welcome posts when old posts exist', async () => {
  // Setup: 29 old posts, 0 welcome posts
  const initialCount = await db.prepare(`
    SELECT COUNT(*) FROM agent_posts
  `).get().count;

  expect(initialCount).toBe(29);

  // Trigger initialization
  const response = await fetch('/api/system/initialize', {
    method: 'POST',
    body: JSON.stringify({ userId: 'demo-user-123' })
  });

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.postsCreated).toBe(3);

  // Verify total posts
  const finalCount = await db.prepare(`
    SELECT COUNT(*) FROM agent_posts
  `).get().count;

  expect(finalCount).toBe(32); // 29 old + 3 new
});
```

**E2E Tests** (Agent 3):
```typescript
test('AC-2: Welcome posts appear with old posts', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173');

  // Wait for loading screen
  await page.waitForSelector('text=Setting up your workspace');

  // Screenshot: Loading screen
  await page.screenshot({ path: 'screenshots/01-loading.png' });

  // Wait for feed
  await page.waitForTimeout(3000);

  // Verify welcome posts at top
  const firstPost = page.locator('article').first();
  await expect(firstPost).toContainText('Λvi');

  // Screenshot: Feed with welcome posts
  await page.screenshot({ path: 'screenshots/02-welcome-posts.png', fullPage: true });

  // Scroll down, verify old posts still there
  await page.evaluate(() => window.scrollTo(0, 1000));

  // Screenshot: Old posts visible
  await page.screenshot({ path: 'screenshots/03-old-posts-preserved.png' });
});
```

---

## C - Completion Checklist

### Pre-Implementation
- [ ] SPARC specification approved
- [ ] Agent task breakdown reviewed
- [ ] Test plan documented

### Implementation (Agent 1)
- [ ] Modified useSystemInitialization.ts to use /api/system/state
- [ ] Removed old /api/agent-posts check
- [ ] Updated unit tests
- [ ] All unit tests passing (15/15)

### Integration Testing (Agent 2)
- [ ] Integration test created
- [ ] Test with 29 old posts verified
- [ ] 32 total posts confirmed (29 + 3)
- [ ] Old posts preserved
- [ ] Idempotency verified

### E2E Testing (Agent 3)
- [ ] Playwright test created
- [ ] Loading screen screenshot captured
- [ ] Welcome posts screenshot captured
- [ ] Old posts preserved screenshot captured
- [ ] No console errors verified

### Final Validation
- [ ] Hook uses correct endpoint
- [ ] Initialization works with old posts
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Production readiness plan updated

---

## Files to Modify

1. **Frontend Hook** (MODIFY):
   - `/workspaces/agent-feed/frontend/src/hooks/useSystemInitialization.ts`
   - Change: Line 30-40 (replace posts check with state check)

2. **Unit Tests** (MODIFY):
   - `/workspaces/agent-feed/frontend/src/tests/hooks/useSystemInitialization.test.ts`
   - Update: Mock endpoints to match new implementation

3. **Integration Tests** (CREATE):
   - `/workspaces/agent-feed/api-server/tests/integration/hook-fix-validation.test.js`
   - New: Test with old posts present

4. **E2E Tests** (CREATE):
   - `/workspaces/agent-feed/frontend/src/tests/e2e/system-initialization/hook-fix.spec.ts`
   - New: Test loading screen with old posts

5. **Documentation** (UPDATE):
   - This file: `/workspaces/agent-feed/docs/SPARC-HOOK-FIX-SYSTEM-INITIALIZATION.md`
   - Final report after completion

---

## Success Metrics

**Code Changes**: ~20 lines modified (hook only)
**Test Changes**: ~50 lines (update existing tests)
**New Tests**: ~100 lines (integration + E2E)

**Test Results**:
- Unit tests: 15/15 passing (100%)
- Integration tests: 3/3 passing (100%)
- E2E tests: 2/2 passing (100%)

**Timeline**:
- Phase 1 (SPARC): 15 min ✅
- Phase 2 (Agents): 1 hour
- Phase 3 (Validation): 30 min
- **Total**: 1.5 hours

---

**Status**: READY FOR IMPLEMENTATION
**Next Step**: Spawn 3 concurrent agents
