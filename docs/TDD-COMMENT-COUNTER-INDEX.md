# 📋 TDD Comment Counter Test Suite - Index

## 📦 Delivery Summary

**Test-Driven Development (TDD) test suite for comment counter bug fix**

**Status**: 🔴 RED Phase Complete - Tests Written and Failing (Expected)

**Date**: 2025-11-12

---

## 📁 Deliverable Files

### 1. Test Files

#### Unit Tests (Jest)
**Location**: `/workspaces/agent-feed/tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx`

**Stats**:
- 22 test cases
- 5 failing (expected)
- 17 passing
- ~400 lines of code

**Coverage**:
- Priority testing: `post.comments` > `engagement.comments` > 0
- String engagement parsing
- Edge cases: zero, NaN, negative, null, undefined
- Real-world API response structures
- Type safety validation

#### E2E Tests (Playwright)
**Location**: `/workspaces/agent-feed/tests/playwright/comment-counter-display.spec.ts`

**Stats**:
- 8 test scenarios
- ~250 lines of code
- Visual validation with screenshots

**Coverage**:
- Comment counter display in feed
- Click-to-open comment threads
- Post new comment and verify counter update
- Multiple comments accuracy
- Zero count for new posts
- Real-time WebSocket updates
- Visual regression testing

### 2. Documentation Files

#### Main README
**Location**: `/workspaces/agent-feed/TDD-TEST-SUITE-README.md`

**Contents**:
- Test execution summary
- Failed tests analysis
- Running instructions
- The fix (code examples)
- Verification steps
- Success criteria

#### Detailed Guide
**Location**: `/workspaces/agent-feed/tests/unit/components/README-COMMENT-COUNTER-TDD.md`

**Contents**:
- Problem statement with code
- Test file overview
- Test data examples
- Implementation steps
- Expected results (before/after)

#### Delivery Summary
**Location**: `/workspaces/agent-feed/docs/TDD-COMMENT-COUNTER-DELIVERY.md`

**Contents**:
- Deliverables checklist
- Bug explanation
- Test coverage breakdown
- Quick start guide
- TDD philosophy (Red-Green-Refactor)

#### This File
**Location**: `/workspaces/agent-feed/docs/TDD-COMMENT-COUNTER-INDEX.md`

**Contents**:
- File index
- Quick reference
- Command cheatsheet

### 3. Helper Scripts

#### E2E Test Runner
**Location**: `/workspaces/agent-feed/tests/playwright/run-comment-counter-tests.sh`

**Purpose**: Run Playwright E2E tests with proper setup checks

**Usage**:
```bash
./tests/playwright/run-comment-counter-tests.sh
```

---

## 🚀 Quick Start

### Run Unit Tests

```bash
# Run all unit tests
npx jest --config jest.frontend.config.cjs \
  tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# Expected: 5 failed, 17 passed (before fix)
```

### Run E2E Tests

```bash
# 1. Start frontend
npm run dev

# 2. Run Playwright tests (in another terminal)
npx playwright test tests/playwright/comment-counter-display.spec.ts
```

### Apply the Fix

**File**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**Lines**: 165-177 (getCommentCount function)

**Change**:
```typescript
// OLD: engagement.comments checked FIRST
if (engagement && typeof engagement.comments === 'number') {
  return engagement.comments;
}
if (typeof post.comments === 'number') {
  return post.comments;
}

// NEW: post.comments checked FIRST
if (typeof post.comments === 'number' && !isNaN(post.comments)) {
  return post.comments;
}
if (engagement && typeof engagement.comments === 'number') {
  return engagement.comments;
}
```

---

## 📊 Test Results

### Current State (Before Fix)

```
Test Suites: 1 failed, 1 total
Tests:       5 failed, 17 passed, 22 total
Snapshots:   0 total
Time:        6.904 s
```

### Failed Tests (Expected)

1. ❌ `should prioritize root post.comments over engagement.comments`
2. ❌ `should prioritize root comments even with string engagement`
3. ❌ `should handle zero comments at root level`
4. ❌ `should handle negative comment counts (invalid data)`
5. ❌ `should handle backend API response with root comments`

### After Fix (Expected)

```
Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        ~7 s
```

---

## 🎯 The Bug

### Problem
Comment counters show `0` even when posts have comments.

### Root Cause
`getCommentCount()` function checks `engagement.comments` BEFORE `post.comments`, but backend API returns the count at `post.comments` (root level).

### Solution
Swap the priority order:
1. Check `post.comments` FIRST (fresh from API)
2. Check `engagement.comments` SECOND (fallback)
3. Default to `0` if both missing

---

## 📚 Additional Resources

### Test Output Files
- `/workspaces/agent-feed/tests/playwright/screenshots/` - Visual proof (after E2E runs)
- Jest output in terminal (shown above)

### Related Components
- `RealSocialMediaFeed.tsx` - Component being tested
- `api.ts` - Type definitions for `AgentPost` and `PostEngagement`

### Testing Tools
- **Jest**: Unit testing framework
- **@testing-library/react**: React component testing
- **Playwright**: E2E browser testing
- **TypeScript**: Type safety and IntelliSense

---

## 📝 Command Cheatsheet

```bash
# Unit Tests
npx jest --config jest.frontend.config.cjs tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# Unit Tests (watch mode)
npx jest --config jest.frontend.config.cjs --watch tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# Unit Tests (coverage)
npx jest --config jest.frontend.config.cjs --coverage tests/unit/components/RealSocialMediaFeed.commentCounter.test.tsx

# E2E Tests
npm run dev  # Terminal 1
npx playwright test tests/playwright/comment-counter-display.spec.ts  # Terminal 2

# E2E Tests (UI mode)
npx playwright test tests/playwright/comment-counter-display.spec.ts --ui

# E2E Tests (debug)
npx playwright test tests/playwright/comment-counter-display.spec.ts --debug

# View Playwright report
npx playwright show-report

# Use test runner script
./tests/playwright/run-comment-counter-tests.sh
```

---

## ✅ Delivery Checklist

- [x] Unit tests written (22 test cases)
- [x] E2E tests written (8 scenarios)
- [x] Tests confirmed failing (TDD Red phase)
- [x] Documentation created (4 files)
- [x] Test runner script created
- [x] Bug documented with code examples
- [x] Fix documented with code examples
- [x] Success criteria defined
- [x] Command cheatsheet created
- [x] Deliverables indexed (this file)
- [ ] Fix applied (next step)
- [ ] Tests passing (after fix)
- [ ] Visual verification (after fix)
- [ ] Production deployment

---

## 🎓 TDD Phases

### 🔴 RED (Current)
**"Write tests that fail"**
- ✅ Tests document expected behavior
- ✅ Tests prove bug exists
- ✅ 5 tests failing as expected

### 🟢 GREEN (Next)
**"Make tests pass"**
- Apply minimal fix (swap priority)
- Re-run tests
- All 22 tests should pass

### 🔵 REFACTOR (Optional)
**"Improve without breaking"**
- Optimize logic
- Improve readability
- Add comments
- Tests remain green

---

## 🚦 Status

**Current Phase**: 🔴 RED

**Next Action**: Apply fix in `RealSocialMediaFeed.tsx` lines 165-177

**Expected Outcome**: All tests green 🟢

---

**Created**: 2025-11-12  
**Author**: QA Agent (TDD Specialist)  
**Review**: Ready for implementation
