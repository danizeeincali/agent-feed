# TDD Test Suite - Comment Counter Fix

## Test Execution Summary

**Status**: ✅ TDD RED PHASE COMPLETE - Tests Written and FAILING (as expected)

### Test Results (Before Fix)

```
Test Suites: 1 failed, 1 total
Tests:       5 failed, 17 passed, 22 total
Time:        6.904 s
```

### Failed Tests (Expected Failures - TDD Red Phase)

These tests SHOULD fail before the fix is applied:

1. ❌ **should prioritize root post.comments over engagement.comments**
   - Expected: `5` (root level)
   - Received: `3` (engagement level)
   - **Issue**: Current logic checks `engagement.comments` FIRST instead of `post.comments`

2. ❌ **should prioritize root comments even with string engagement**
   - Expected: `15` (root level)
   - Received: `10` (parsed engagement)
   - **Issue**: Same priority problem with JSON string engagement

3. ❌ **should handle zero comments at root level**
   - Expected: `0` (root level)
   - Received: `5` (engagement level)
   - **Issue**: Zero is falsy, code falls through to engagement check

4. ❌ **should handle negative comment counts (invalid data)**
   - Expected: `-5` (root level)
   - Received: `3` (engagement level)
   - **Issue**: Even invalid root values should take priority

5. ❌ **should handle backend API response with root comments**
   - Expected: `25` (root level from API)
   - Received: `0` (stale engagement)
   - **Issue**: Real-world API responses have root-level comments

### Passed Tests (Correct Behavior)

17 tests passed, covering:
- ✅ Fallback to engagement when root is missing
- ✅ Default to 0 when both are missing
- ✅ JSON string parsing
- ✅ Invalid JSON handling
- ✅ Null/undefined handling
- ✅ NaN and string number handling
- ✅ Legacy posts with only engagement
- ✅ Type safety checks

## Test Files Created

### 1. Unit Tests
**Location**: `/workspaces/agent-feed/tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx`

**Coverage**: 22 test cases
- Priority testing (5 tests)
- String engagement parsing (3 tests)
- Edge cases (5 tests)
- Real-world API structures (3 tests)
- Type safety (2 tests)
- parseEngagement utility (5 tests)

### 2. E2E Tests (Playwright)
**Location**: `/workspaces/agent-feed/tests/playwright/comment-counter-display.spec.ts`

**Coverage**: 8 test scenarios
- Visual verification of comment counters
- Click-to-open comment threads
- Post new comment and verify update
- Multiple comments display accuracy
- Zero count for new posts
- Real-time WebSocket updates
- Visual regression testing

### 3. Documentation
**Location**: `/workspaces/agent-feed/tests/unit/components/README-COMMENT-COUNTER-TDD.md`

Comprehensive guide covering:
- Problem statement with code examples
- Test file overview
- Running instructions
- Expected results (before/after fix)
- Implementation steps
- Test data examples
- Success criteria

## Running the Tests

### Unit Tests (Already Run)
```bash
# Run unit tests
npx jest --config jest.frontend.config.cjs tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# Current Results: 5 failed, 17 passed ✅ (Expected failures)
```

### E2E Tests (Playwright)
```bash
# Start frontend server
npm run dev

# In another terminal, run E2E tests
npx playwright test tests/playwright/comment-counter-display.spec.ts

# Or use the test runner script
./tests/playwright/run-comment-counter-tests.sh

# With UI (recommended for debugging)
npx playwright test tests/playwright/comment-counter-display.spec.ts --ui

# Generate HTML report
npx playwright show-report
```

## The Fix (Next Step)

**File to modify**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**Current Code** (lines 165-177):
```typescript
const getCommentCount = (post: AgentPost): number => {
  // Parse engagement if it's a string
  const engagement = parseEngagement(post.engagement);

  // Priority: engagement.comments > root comments > 0  ❌ WRONG ORDER
  if (engagement && typeof engagement.comments === 'number') {
    return engagement.comments;  // Checked FIRST
  }
  if (typeof post.comments === 'number') {
    return post.comments;  // Checked SECOND
  }
  return 0;
};
```

**Fixed Code** (swap priority):
```typescript
const getCommentCount = (post: AgentPost): number => {
  // Parse engagement if it's a string
  const engagement = parseEngagement(post.engagement);

  // Priority: root comments > engagement.comments > 0  ✅ CORRECT ORDER
  if (typeof post.comments === 'number' && !isNaN(post.comments)) {
    return post.comments;  // Check FIRST (root level from API)
  }
  if (engagement && typeof engagement.comments === 'number') {
    return engagement.comments;  // Check SECOND (fallback)
  }
  return 0;
};
```

**Key Changes**:
1. Check `post.comments` BEFORE `engagement.comments`
2. Add `!isNaN()` check to handle NaN edge case
3. Update comment to reflect correct priority

## Verification Steps

### 1. Apply Fix
Edit `RealSocialMediaFeed.tsx` with the corrected logic above.

### 2. Re-run Unit Tests
```bash
npx jest --config jest.frontend.config.cjs tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx
```

**Expected**: All 22 tests should PASS ✅

### 3. Run E2E Tests
```bash
# Start frontend
npm run dev

# Run Playwright tests
npx playwright test tests/playwright/comment-counter-display.spec.ts
```

**Expected**: All visual and interaction tests should PASS ✅

### 4. Visual Verification
Check generated screenshots in `/workspaces/agent-feed/tests/playwright/screenshots/`:
- `comment-counter-feed-view.png` - Feed with non-zero counts
- `comment-thread-opened.png` - Expanded comment section
- `comment-counter-after-post.png` - Updated counter after posting

## Success Criteria

- ✅ All 22 unit tests pass
- ✅ All 8 E2E tests pass
- ✅ Comment counters show non-zero values in UI
- ✅ Counters update in real-time after posting
- ✅ Screenshots show correct visual state

## Current Status

**TDD Phase**: 🔴 RED (Tests Written and Failing)

**Next Phase**: 🟢 GREEN (Apply Fix and Make Tests Pass)

**Final Phase**: 🔵 REFACTOR (Optimize and Clean Up)

---

## Test Output Details

### Failure #1: Priority Issue
```
Expected: 5
Received: 3
```
Root `post.comments` (5) should take priority over `engagement.comments` (3).

### Failure #2: String Engagement
```
Expected: 15
Received: 10
```
Even with parsed JSON string engagement, root comments should win.

### Failure #3: Zero Handling
```
Expected: 0
Received: 5
```
Zero at root level is valid and should be returned (not fall through).

### Failure #4: Negative Values
```
Expected: -5
Received: 3
```
Even invalid negative values at root should take priority (data integrity).

### Failure #5: API Response
```
Expected: 25
Received: 0
```
Real backend API returns `comments: 25` at root level, should be used.

---

**Ready for implementation!** Apply the fix and watch the tests turn green. 🟢
