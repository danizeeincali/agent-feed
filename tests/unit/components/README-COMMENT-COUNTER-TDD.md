# Comment Counter Fix - TDD Test Suite

## Overview

Comprehensive Test-Driven Development (TDD) test suite for the comment counter display fix in RealSocialMediaFeed component.

## Problem Statement

**Issue**: Comment counters show `0` even when posts have comments, due to incorrect data priority in `getCommentCount()` function.

**Current Logic** (INCORRECT):
```typescript
// Priority: engagement.comments > root comments > 0
if (engagement && typeof engagement.comments === 'number') {
  return engagement.comments;  // ❌ Checked FIRST
}
if (typeof post.comments === 'number') {
  return post.comments;  // ✅ Should be checked FIRST
}
return 0;
```

**Expected Logic** (CORRECT):
```typescript
// Priority: root post.comments > engagement.comments > 0
if (typeof post.comments === 'number') {
  return post.comments;  // ✅ Check FIRST
}
if (engagement && typeof engagement.comments === 'number') {
  return engagement.comments;  // ❌ Check SECOND
}
return 0;
```

## Test Files

### 1. Unit Tests
**File**: `/workspaces/agent-feed/tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx`

**Coverage**:
- Priority testing: root `post.comments` > `engagement.comments` > default 0
- String engagement parsing (`parseEngagement`)
- Edge cases: null, undefined, NaN, negative numbers, string numbers
- Real-world API response structures
- Type safety validation

**Key Tests**:
```typescript
✅ should prioritize root post.comments over engagement.comments
✅ should use engagement.comments when root is missing
✅ should return 0 when both are missing
✅ should parse JSON string engagement correctly
✅ should handle zero comments at root level
✅ should handle real-world API responses
```

### 2. E2E Tests (Playwright)
**File**: `/workspaces/agent-feed/tests/playwright/comment-counter-display.spec.ts`

**Coverage**:
- Visual verification of comment counters in feed
- Click-to-open comment threads
- Post new comment and verify counter update
- Multiple comments display accuracy
- Real-time WebSocket updates
- Visual regression testing

**Key Tests**:
```typescript
✅ should display non-zero comment counts on posts with comments
✅ should show comment count on each post card
✅ should open comment thread when clicking comment button
✅ should update comment count after posting new comment
✅ should display correct count for posts with multiple comments
✅ should show 0 for posts with no comments
✅ should handle real-time comment updates from other users
```

## Running Tests

### Unit Tests
```bash
# Run unit tests
npm run test:unit -- tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# With coverage
npm run test:unit -- --coverage tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# Watch mode
npm run test:unit -- --watch tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx
```

### E2E Tests (Playwright)
```bash
# Start frontend first
npm run dev

# In another terminal, run Playwright tests
npx playwright test tests/playwright/comment-counter-display.spec.ts

# With UI
npx playwright test tests/playwright/comment-counter-display.spec.ts --ui

# Debug mode
npx playwright test tests/playwright/comment-counter-display.spec.ts --debug

# Generate report
npx playwright show-report
```

## Expected Results

### Before Fix (Tests Should FAIL)
```
❌ should prioritize root post.comments over engagement.comments
   Expected: 5, Received: 3

❌ should display non-zero comment counts on posts with comments
   Expected: > 0, Received: 0

❌ should update comment count after posting new comment
   Expected: 6, Received: 5
```

### After Fix (Tests Should PASS)
```
✅ should prioritize root post.comments over engagement.comments
   Expected: 5, Received: 5

✅ should display non-zero comment counts on posts with comments
   Expected: > 0, Received: 3

✅ should update comment count after posting new comment
   Expected: 6, Received: 6
```

## Implementation Steps

1. **Run tests** to verify they FAIL (TDD Red phase)
   ```bash
   npm run test:unit -- tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx
   ```

2. **Implement fix** in `RealSocialMediaFeed.tsx` (TDD Green phase)
   - Swap priority: check `post.comments` BEFORE `engagement.comments`
   - Handle edge cases: 0, NaN, string values

3. **Run tests again** to verify they PASS
   ```bash
   npm run test:unit -- tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx
   ```

4. **Run E2E tests** for full validation
   ```bash
   npx playwright test tests/playwright/comment-counter-display.spec.ts
   ```

5. **Refactor** if needed (TDD Refactor phase)

## Test Data Examples

### Priority Test Data
```typescript
// Root post.comments should WIN
{
  comments: 5,  // ✅ Should return this
  engagement: {
    comments: 3  // ❌ Not this
  }
}

// Engagement fallback when root missing
{
  // comments: undefined
  engagement: {
    comments: 7  // ✅ Should return this
  }
}

// Default to 0
{
  // comments: undefined
  engagement: {
    // comments: undefined
  }
}
// ✅ Should return 0
```

### Edge Case Data
```typescript
// Zero is valid
{ comments: 0 }  // ✅ Should return 0, not fall through

// Negative (invalid but should handle)
{ comments: -5 }  // ✅ Should return -5 (root priority)

// NaN (typeof 'number' but invalid)
{ comments: NaN }  // ✅ Should fall through to engagement

// String number (not typeof 'number')
{ comments: '10' }  // ✅ Should fall through to engagement
```

## Screenshots

Playwright tests automatically generate screenshots:
- `comment-counter-feed-view.png` - Feed with visible comment counts
- `comment-thread-opened.png` - Comment thread expanded
- `comment-counter-after-post.png` - Counter after posting comment
- `comment-counter-visual-baseline.png` - Visual regression baseline

## Success Criteria

- ✅ All 30+ unit tests pass
- ✅ All 7+ E2E tests pass
- ✅ Comment counters show non-zero values for posts with comments
- ✅ Counter updates in real-time after posting comment
- ✅ Visual regression: counters display correctly across all states

## Next Steps

1. Run tests to confirm they FAIL (current state)
2. Implement fix in `RealSocialMediaFeed.tsx`
3. Verify all tests PASS
4. Review screenshots for visual validation
5. Deploy fix to production
