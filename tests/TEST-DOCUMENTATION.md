# Comment Counter Refetch - TDD Test Documentation

**Project**: Agent Feed - Comment Counter Real-time Update Fix
**Methodology**: Test-Driven Development (TDD) - Red Phase
**Date**: 2025-10-16
**Status**: 🔴 RED - Tests written, implementation pending

---

## Overview

This document provides comprehensive documentation for all TDD tests created for the comment counter refetch functionality. These tests are in the **RED phase** - they are designed to **FAIL** until the implementation is complete.

---

## Test Philosophy

### TDD Red-Green-Refactor Cycle

```
🔴 RED    → Write failing tests (CURRENT PHASE)
           All tests document expected behavior
           Tests fail because implementation doesn't exist yet

🟢 GREEN  → Implement minimum code to pass tests
           Focus on making tests pass, not perfection

🔵 REFACTOR → Improve code quality
           Tests remain green during refactoring
```

### No Mocks Policy

**Important**: All tests use **REAL API calls** and **REAL database operations**.

**Why?**
- Mocks can hide integration issues
- Real operations validate the complete flow
- Database consistency can be verified
- Performance can be accurately measured
- Edge cases are discovered early

**How we handle this:**
- Test database or isolated test environment
- Proper setup/teardown to avoid pollution
- Clear test data with unique identifiers
- Cleanup after each test suite

---

## Test Structure

### 1. API Unit Tests

**File**: `/workspaces/agent-feed/frontend/src/api/__tests__/agentFeed.refetch.test.ts`

**Purpose**: Test the `refetchPost()` API function that fetches updated post data.

#### Test Coverage

##### Happy Path (8 tests)
- ✅ `should refetch post and return updated data`
- ✅ `should return fresh data, not cached data`
- ✅ `should return updated comment count after backend increment`
- ✅ `should complete refetch within 500ms (performance requirement)`

##### Error Path (5 tests)
- ✅ `should throw error for invalid post ID`
- ✅ `should throw error for malformed post ID`
- ✅ `should handle network timeout gracefully`
- ✅ `should provide meaningful error message on failure`

##### Edge Cases (4 tests)
- ✅ `should handle rapid sequential refetches without race conditions`
- ✅ `should handle concurrent comment creation and refetch`
- ✅ `should not interfere with other posts when refetching`

##### Data Consistency (3 tests)
- ✅ `should return consistent data structure matching Post type`
- ✅ `should match data from getAgentPost endpoint`
- ✅ `should reflect database state accurately`

##### Cache Behavior (2 tests)
- ✅ `should bypass cache when refetching`
- ✅ `should clear relevant cache entries after refetch`

**Total: 22 tests**

#### Key Test Examples

```typescript
// Example: Performance requirement
it('should complete refetch within 500ms', async () => {
  const startTime = Date.now();
  await apiService.refetchPost(testPostId);
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(500);
});

// Example: Data consistency
it('should reflect database state accurately', async () => {
  const commentsResponse = await apiService.getPostComments(testPostId);
  const postResult = await apiService.refetchPost(testPostId);

  expect(postResult.data.comments).toBe(commentsResponse.length);
});
```

---

### 2. Hook Unit Tests

**File**: `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.tsx`

**Purpose**: Test the `usePosts` hook's `updatePostInList()` function for state management.

#### Test Coverage

##### Hook Initialization (3 tests)
- ✅ `should be defined and exportable`
- ✅ `should return required properties`
- ✅ `should initialize with empty posts array`

##### Happy Path (4 tests)
- ✅ `should update specific post in the list`
- ✅ `should preserve other post properties when updating`
- ✅ `should handle multiple property updates simultaneously`
- ✅ `should maintain post order in the list`

##### Optimistic Updates (3 tests)
- ✅ `should increment comment counter optimistically`
- ✅ `should support rollback by setting to original value`
- ✅ `should complete update within 50ms for responsive UI`

##### Edge Cases (6 tests)
- ✅ `should handle non-existent post ID gracefully`
- ✅ `should handle empty posts array`
- ✅ `should handle rapid sequential updates to same post`
- ✅ `should handle updates to multiple different posts`
- ✅ `should handle undefined or null values in updates`
- ✅ `should handle very large post lists efficiently`

##### Immutability (2 tests)
- ✅ `should not mutate original posts array`
- ✅ `should create new post object, not modify existing`

##### React Integration (2 tests)
- ✅ `should trigger re-render when post is updated`
- ✅ `should maintain referential equality for unchanged posts`

**Total: 20 tests**

#### Key Test Examples

```typescript
// Example: Optimistic update performance
it('should complete update within 50ms', async () => {
  const startTime = performance.now();

  act(() => {
    result.current.updatePostInList('post-1', { comments: 5 });
  });

  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(50);
});

// Example: Immutability
it('should not mutate original posts array', () => {
  const originalReference = result.current.posts;

  act(() => {
    result.current.updatePostInList('post-1', { comments: 999 });
  });

  expect(result.current.posts).not.toBe(originalReference);
});
```

---

### 3. Integration Tests

**File**: `/workspaces/agent-feed/tests/integration/comment-counter-flow.test.ts`

**Purpose**: Test complete end-to-end flow from comment creation to counter update.

#### Test Coverage

##### Complete Flow (4 tests)
- ✅ `should complete full flow: create comment → increment counter → refetch → update UI`
- ✅ `should maintain counter accuracy across multiple comments`
- ✅ `should update counter within 500ms (performance requirement)`
- ✅ `should reflect accurate count even with rapid submissions`

##### Optimistic Updates (3 tests)
- ✅ `should support optimistic counter increment before API confirmation`
- ✅ `should allow rollback if comment creation fails`
- ✅ `should handle optimistic update → network failure → eventual consistency`

##### Error Handling (4 tests)
- ✅ `should maintain counter accuracy when comment fails`
- ✅ `should handle concurrent comment creation gracefully`
- ✅ `should recover from partial failures in comment flow`

##### Worker Comments (2 tests)
- ✅ `should increment counter for worker outcome comments`
- ✅ `should handle mixed user and worker comments`

##### Data Consistency (3 tests)
- ✅ `should maintain consistency between counter and actual comments`
- ✅ `should verify database state matches UI state`
- ✅ `should handle race condition between refetch and new comment`

##### Performance (2 tests)
- ✅ `should handle high-frequency comment submissions`
- ✅ `should refetch efficiently without overwhelming the API`

**Total: 18 tests**

#### Key Test Examples

```typescript
// Example: Full flow verification
it('should complete full flow', async () => {
  // 1. Create comment
  const comment = await apiService.createComment(testPostId, 'Test');
  expect(comment.success).toBe(true);

  // 2. Refetch post
  const refetched = await apiService.refetchPost(testPostId);

  // 3. Verify counter
  expect(refetched.data.comments).toBe(startCount + 1);

  // 4. Verify actual comments
  const comments = await apiService.getPostComments(testPostId);
  expect(comments.length).toBe(refetched.data.comments);
});

// Example: Concurrent operations
it('should handle concurrent comments', async () => {
  const users = ['user-a', 'user-b', 'user-c'];
  await Promise.all(
    users.map(user =>
      apiService.createComment(testPostId, `From ${user}`, { author: user })
    )
  );

  const final = await apiService.refetchPost(testPostId);
  expect(final.data.comments).toBe(startCount + users.length);
});
```

---

## Test Execution

### Prerequisites

```bash
# Install dependencies
cd /workspaces/agent-feed/frontend
npm install

# Ensure test database is available
# Backend API server should be running on http://localhost:3001
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- agentFeed.refetch.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run integration tests only
npm test -- tests/integration/
```

### Expected Results (RED Phase)

**All tests should FAIL** with clear error messages indicating missing implementation:

```
❌ FAIL  src/api/__tests__/agentFeed.refetch.test.ts
  ● API: refetchPost › Happy Path
    ✕ should refetch post and return updated data
      TypeError: apiService.refetchPost is not a function

❌ FAIL  src/hooks/__tests__/usePosts.test.tsx
  ● Hook: usePosts › Hook Initialization
    ✕ should be defined and exportable
      Error: usePosts hook not implemented yet - TDD Red Phase

❌ FAIL  tests/integration/comment-counter-flow.test.ts
  ● Integration: Complete Flow
    ✕ should complete full flow
      TypeError: apiService.refetchPost is not a function
```

This is **EXPECTED and CORRECT** for the RED phase!

---

## Implementation Requirements

Based on the tests, the following implementations are required:

### 1. API Client Implementation

**File**: `/workspaces/agent-feed/frontend/src/services/api.ts`

**Required Function**:
```typescript
async refetchPost(postId: string): Promise<ApiResponse<Post>> {
  // Implementation needed:
  // 1. Make GET request to /api/v1/agent-posts/:postId
  // 2. Bypass cache (useCache: false)
  // 3. Return fresh post data with updated comment count
  // 4. Handle errors gracefully
  // 5. Complete within 500ms
}
```

**Requirements**:
- ✅ No caching - always fetch fresh data
- ✅ Timeout: 10 seconds max
- ✅ Error handling with meaningful messages
- ✅ Return consistent Post data structure
- ✅ Clear relevant cache after refetch

### 2. Hook Implementation

**File**: `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts` (create if missing)

**Required Hook**:
```typescript
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);

  const updatePostInList = useCallback((postId: string, updates: Partial<Post>) => {
    // Implementation needed:
    // 1. Find post by ID in posts array
    // 2. Create new post object with updates
    // 3. Create new posts array with updated post
    // 4. Maintain immutability (no mutations)
    // 5. Preserve other posts' references (optimization)
    // 6. Handle non-existent post IDs gracefully
  }, []);

  return { posts, setPosts, updatePostInList };
}
```

**Requirements**:
- ✅ Immutable updates (no array/object mutations)
- ✅ O(n) time complexity acceptable
- ✅ Update within 50ms
- ✅ Maintain post order
- ✅ Optimize unchanged posts (referential equality)

### 3. Component Integration

**File**: `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`

**Required Changes**:
```typescript
async function handleCommentSubmit() {
  const currentPost = posts.find(p => p.id === postId);
  const originalCount = currentPost?.comments || 0;

  try {
    // 1. Optimistic update
    updatePostInList(postId, { comments: originalCount + 1 });

    // 2. Create comment
    await apiService.createComment(postId, content, { author });

    // 3. Refetch to confirm
    const updated = await apiService.refetchPost(postId);

    // 4. Update with confirmed value
    updatePostInList(postId, { comments: updated.data.comments });

    // 5. Refresh comments list
    await refetchComments(postId);

  } catch (error) {
    // Rollback on error
    updatePostInList(postId, { comments: originalCount });
    throw error;
  }
}
```

---

## Test Coverage Goals

### Current Coverage (After Implementation)

**Target**: 100% coverage for new code

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| api.refetchPost | 0% → 100% | 0% → 100% | 0% → 100% | 0% → 100% |
| usePosts.updatePostInList | 0% → 100% | 0% → 100% | 0% → 100% | 0% → 100% |
| CommentForm (changes) | TBD | TBD | TBD | TBD |

### Coverage Report Commands

```bash
# Generate coverage report
npm test -- --coverage

# Generate HTML report
npm test -- --coverage --reporter=html

# View coverage in browser
open coverage/index.html
```

---

## Performance Benchmarks

Based on test requirements, the implementation must meet these benchmarks:

| Operation | Max Time | Test Verification |
|-----------|----------|-------------------|
| refetchPost() | 500ms | Performance test |
| updatePostInList() | 50ms | Hook performance test |
| Complete flow | 500ms | Integration test |
| 10 rapid comments | <2000ms | High-frequency test |
| 20 concurrent refetches | <5000ms | Scalability test |

---

## Edge Cases Covered

### 1. Concurrent Operations
- ✅ Multiple rapid refetches
- ✅ Concurrent comment creation and refetch
- ✅ Multiple users commenting simultaneously
- ✅ Race conditions between operations

### 2. Error Scenarios
- ✅ Invalid post IDs
- ✅ Malformed input
- ✅ Network timeouts
- ✅ API failures
- ✅ Partial failures in flow

### 3. Data Consistency
- ✅ Counter matches actual comment count
- ✅ Database state matches UI state
- ✅ Multiple data sources agree
- ✅ Cache invalidation works correctly

### 4. Performance
- ✅ Large post lists (1000+ items)
- ✅ High-frequency submissions
- ✅ Concurrent operations
- ✅ Response time requirements

---

## Integration with Existing System

### Files to Modify

1. **API Client**: `/workspaces/agent-feed/frontend/src/services/api.ts`
   - Add `refetchPost()` method
   - Ensure proper error handling
   - Configure timeout appropriately

2. **Create Hook**: `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts`
   - Export `usePosts()` hook
   - Implement `updatePostInList()` function
   - Ensure immutability

3. **Update Component**: `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`
   - Import and use `usePosts()` hook
   - Add optimistic update logic
   - Add refetch after comment creation
   - Add rollback on error

4. **Update PostCard**: `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`
   - Ensure counter reads from state
   - May not need changes if already reactive

### Backward Compatibility

All changes should be **backward compatible**:
- ✅ No breaking changes to existing API
- ✅ No changes to component props
- ✅ Existing functionality unchanged
- ✅ Drop-in replacement for current behavior

---

## Test Maintenance

### When to Update Tests

1. **API Contract Changes**
   - Update test expectations if Post type changes
   - Modify assertions if response structure changes

2. **Performance Requirements**
   - Adjust timeout thresholds if system capacity changes
   - Update benchmarks based on production metrics

3. **New Features**
   - Add new test cases for additional functionality
   - Expand edge case coverage

### Test Stability

**These tests are stable because:**
- Use real database (not mocks that drift)
- Test actual behavior (not implementation details)
- Verify business requirements (not code structure)
- Measure real performance (not simulated)

---

## Debugging Failed Tests

### Common Issues

#### 1. "refetchPost is not a function"
**Cause**: Function not implemented yet (expected in RED phase)
**Solution**: Implement the function in api.ts

#### 2. "Hook not implemented"
**Cause**: Hook not created yet (expected in RED phase)
**Solution**: Create usePosts.ts hook file

#### 3. Tests timeout
**Cause**: Backend not running or wrong URL
**Solution**:
```bash
# Start backend
cd /workspaces/agent-feed/api-server
npm start

# Verify API accessible
curl http://localhost:3001/api/health
```

#### 4. Database errors
**Cause**: Test data conflicts or missing tables
**Solution**: Clear test database and run migrations

### Debugging Commands

```bash
# Run single test with verbose output
npm test -- agentFeed.refetch.test.ts --verbose

# Run with debugging
npm test -- --inspect-brk agentFeed.refetch.test.ts

# Check API connectivity
curl http://localhost:3001/api/v1/agent-posts

# View test coverage gaps
npm test -- --coverage --coverageReporters=text
```

---

## Success Criteria

### Phase 1: RED ✅ (Current)
- [x] All tests written
- [x] Tests fail with clear messages
- [x] Test coverage plan documented
- [x] Edge cases identified

### Phase 2: GREEN (Next)
- [ ] Implement refetchPost() function
- [ ] Implement usePosts hook
- [ ] Update CommentForm component
- [ ] All tests pass
- [ ] No TypeScript errors

### Phase 3: REFACTOR (Final)
- [ ] Code quality improvements
- [ ] Performance optimizations
- [ ] Documentation updated
- [ ] Tests still green
- [ ] Code review approved

---

## References

- **Specification**: `/workspaces/agent-feed/SPARC-COMMENT-COUNTER-FIX-SPEC.md`
- **Test Files**:
  - API Tests: `/workspaces/agent-feed/frontend/src/api/__tests__/agentFeed.refetch.test.ts`
  - Hook Tests: `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.tsx`
  - Integration: `/workspaces/agent-feed/tests/integration/comment-counter-flow.test.ts`

---

## Questions or Issues?

If tests are unclear or requirements need clarification:
1. Review the specification document
2. Check test assertions for expected behavior
3. Run tests to see actual vs expected output
4. Refer to this documentation for implementation guidance

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-10-16
**Next Step**: Implement functionality to make tests pass (GREEN phase)
