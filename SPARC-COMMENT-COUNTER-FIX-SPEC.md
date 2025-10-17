# SPARC Specification: Comment Counter Real-time Update Fix

**Date**: 2025-10-16
**Issue**: Comment counter displays 0 when actual comments exist
**Solution**: Option B - Refetch on Comment Create with Optimistic Updates
**Methodology**: SPARC + NLD + TDD + Claude-Flow Swarm + Playwright

---

## S - Specification

### Problem Statement

**Current State**:
- User creates post → counter shows 0 ✅
- Worker posts outcome comment → counter still shows 0 ❌
- User refreshes page → counter shows 1 ✅

**Root Cause**:
- Backend correctly increments counter in database
- Frontend caches post list with stale counter
- No real-time update mechanism
- Frontend doesn't refetch after comment creation

**Desired State**:
- User creates post → counter shows 0 ✅
- Worker posts outcome comment → counter updates to 1 instantly ✅
- User doesn't need to refresh → counter always accurate ✅

### Functional Requirements

**FR1: Refetch After Comment Creation**
- When comment is posted, refetch parent post data
- Update post list with new comment count
- Display updated count immediately

**FR2: Optimistic UI Updates**
- Increment counter immediately on comment submit (optimistic)
- Confirm with server response
- Rollback on error

**FR3: Error Handling**
- If comment creation fails, rollback optimistic update
- Display error message to user
- Maintain data consistency

**FR4: Performance**
- Refetch only the affected post (not entire list)
- Debounce rapid comment submissions
- Minimize API calls

**FR5: Real Operations Validation**
- Test with actual API calls (no mocks)
- Verify database updates
- Confirm UI reflects database state

**FR6: Regression Prevention**
- Ensure existing functionality unchanged
- Verify counter works for manual comments
- Verify counter works for outcome comments (skipTicket)

### Non-Functional Requirements

**NFR1: User Experience**
- Counter updates within 500ms of comment submission
- No visible flicker or counter jumping
- Smooth optimistic update → confirmation flow

**NFR2: Data Consistency**
- Counter always matches database state after confirmation
- No race conditions between refetch and cache
- Atomic updates to post list state

**NFR3: Backward Compatibility**
- Existing API contracts unchanged
- No breaking changes to components
- Drop-in replacement for current behavior

**NFR4: Testability**
- Unit tests for refetch logic
- Integration tests for comment flow
- Playwright E2E tests for UI validation
- 100% test coverage for new code

---

## P - Pseudocode

### High-Level Workflow

```
WHEN user posts comment:
  1. Optimistically increment counter in UI
  2. POST /api/agent-posts/:postId/comments
  3. IF success:
     a. GET /api/agent-posts/:postId (refetch post)
     b. Update counter with confirmed value
     c. Refresh comment list
  4. ELSE error:
     a. Rollback optimistic update
     b. Display error message
     c. Log error for debugging
```

### Detailed Pseudocode

```typescript
// API Client Layer
async function refetchPost(postId: string): Promise<Post> {
  const response = await fetch(`/api/agent-posts/${postId}`);
  if (!response.ok) throw new Error('Failed to refetch post');
  return response.json();
}

// State Management Layer
function usePostUpdates() {
  const [posts, setPosts] = useState<Post[]>([]);

  const updatePostInList = (postId: string, updates: Partial<Post>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  return { posts, updatePostInList };
}

// Comment Submission Layer
async function handleCommentSubmit(postId: string, content: string) {
  const currentPost = posts.find(p => p.id === postId);
  const currentCount = currentPost?.comments || 0;

  try {
    // Step 1: Optimistic update
    updatePostInList(postId, {
      comments: currentCount + 1
    });

    // Step 2: Create comment via API
    await createComment({
      post_id: postId,
      content,
      author_agent: currentUser
    });

    // Step 3: Refetch to confirm
    const updatedPost = await refetchPost(postId);

    // Step 4: Update with confirmed value
    updatePostInList(postId, {
      comments: updatedPost.comments
    });

    // Step 5: Refresh comment list
    await refetchComments(postId);

  } catch (error) {
    // Rollback optimistic update
    updatePostInList(postId, {
      comments: currentCount
    });

    throw error;
  }
}
```

### Edge Cases

**EC1: Rapid Comment Submission**
```
IF user posts multiple comments quickly:
  - Queue submissions
  - Process sequentially
  - Prevent counter race conditions
```

**EC2: Network Failure**
```
IF refetch fails but comment succeeded:
  - Keep optimistic update (safer than rollback)
  - Retry refetch with exponential backoff
  - Eventually consistent on next page load
```

**EC3: Concurrent Users**
```
IF multiple users comment simultaneously:
  - Each user sees their own optimistic update
  - Refetch resolves to correct total count
  - No conflict - database is source of truth
```

---

## A - Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  PostCard    │         │ CommentForm  │                  │
│  │              │         │              │                  │
│  │ - Display    │         │ - Submit     │                  │
│  │   counter    │         │   comment    │                  │
│  │ - Read from  │◄────────┤ - Trigger    │                  │
│  │   state      │         │   refetch    │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                        │                           │
│         │                        │                           │
│         ▼                        ▼                           │
│  ┌─────────────────────────────────────┐                    │
│  │      usePosts Hook (State)          │                    │
│  │                                     │                    │
│  │  - posts: Post[]                    │                    │
│  │  - updatePostInList()               │                    │
│  │  - refetchPost()                    │                    │
│  └─────────────────────────────────────┘                    │
│         │                        │                           │
│         │                        │                           │
│         ▼                        ▼                           │
│  ┌─────────────────────────────────────┐                    │
│  │      API Client Layer                │                    │
│  │                                     │                    │
│  │  - createComment()                  │                    │
│  │  - refetchPost()                    │                    │
│  │  - getComments()                    │                    │
│  └─────────────────────────────────────┘                    │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      │ HTTP API Calls
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API Server                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POST /api/agent-posts/:postId/comments                      │
│  ├─ Create comment                                           │
│  ├─ Increment counter (incrementPostCommentCount)            │
│  └─ Return created comment                                   │
│                                                               │
│  GET /api/agent-posts/:postId                                │
│  ├─ Fetch post with current counter                          │
│  └─ Return post data                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                            │
│                                                               │
│  agent_memories table                                         │
│  └─ metadata.comment_count (incremented atomically)          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User Posts Comment
      │
      ▼
┌─────────────────────────────────────┐
│ 1. Optimistic Update                │
│    counter: 0 → 1 (instant UI)      │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 2. API Call                         │
│    POST /api/.../comments           │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 3. Backend Processing               │
│    - Create comment                 │
│    - Increment counter in DB        │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 4. Refetch Post                     │
│    GET /api/.../posts/:id           │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 5. Confirm Update                   │
│    counter: 1 (confirmed from DB)   │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 6. Refresh Comments                 │
│    Show new comment in list         │
└─────────────────────────────────────┘
```

### State Management Flow

```typescript
// State transitions during comment submission

Initial State:
{
  posts: [
    { id: "post-123", comments: 0, ... }
  ]
}

After Optimistic Update:
{
  posts: [
    { id: "post-123", comments: 1, ... }  // Optimistic
  ]
}

After API Confirmation:
{
  posts: [
    { id: "post-123", comments: 1, ... }  // Confirmed
  ]
}

On Error (Rollback):
{
  posts: [
    { id: "post-123", comments: 0, ... }  // Rolled back
  ]
}
```

---

## R - Refinement

### Implementation Files

**Frontend Files to Modify**:

1. **`/workspaces/agent-feed/frontend/src/api/agentFeed.ts`**
   - Add `refetchPost(postId)` function
   - Add error handling and retry logic

2. **`/workspaces/agent-feed/frontend/src/hooks/usePosts.ts`** (or create if missing)
   - Add `updatePostInList(postId, updates)` function
   - Manage post list state
   - Handle optimistic updates

3. **`/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`** (or equivalent)
   - Update submit handler
   - Add optimistic update logic
   - Add refetch after success
   - Add error rollback

4. **`/workspaces/agent-feed/frontend/src/components/PostCard.tsx`** (or equivalent)
   - Verify counter display uses state
   - No changes needed if already reading from state

**Test Files to Create**:

1. **`/workspaces/agent-feed/frontend/src/api/__tests__/agentFeed.test.ts`**
   - Test refetchPost function
   - Test error handling

2. **`/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.ts`**
   - Test updatePostInList
   - Test optimistic updates
   - Test rollback logic

3. **`/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts`**
   - Playwright E2E tests
   - Test full user flow
   - Test counter updates in UI

### Error Handling Strategy

**Error Types and Responses**:

```typescript
// Network Error (fetch failed)
catch (error) {
  if (error instanceof NetworkError) {
    // Keep optimistic update, retry refetch
    retryRefetch(postId, { maxRetries: 3, backoff: 'exponential' });
  }
}

// API Error (400/500)
catch (error) {
  if (error instanceof APIError) {
    // Rollback optimistic update
    updatePostInList(postId, { comments: originalCount });
    showErrorToast('Failed to post comment. Please try again.');
  }
}

// Validation Error (missing data)
catch (error) {
  if (error instanceof ValidationError) {
    // Don't attempt optimistic update
    showErrorToast(error.message);
  }
}
```

### Performance Optimizations

**PO1: Debounce Rapid Submissions**
```typescript
const debouncedSubmit = useMemo(
  () => debounce(handleCommentSubmit, 300),
  []
);
```

**PO2: Cache Refetch Results**
```typescript
const postCache = new Map<string, { data: Post, timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

async function refetchPost(postId: string) {
  const cached = postCache.get(postId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const post = await fetchPostFromAPI(postId);
  postCache.set(postId, { data: post, timestamp: Date.now() });
  return post;
}
```

**PO3: Batch Multiple Refetches**
```typescript
const refetchQueue = new Set<string>();

function queueRefetch(postId: string) {
  refetchQueue.add(postId);
  scheduleRefetchBatch();
}

const scheduleRefetchBatch = debounce(() => {
  const postIds = Array.from(refetchQueue);
  refetchQueue.clear();
  batchFetchPosts(postIds);
}, 100);
```

---

## C - Completion Criteria

### Test Coverage Requirements

**Unit Tests**: 100% coverage for new code
- `refetchPost()` function
- `updatePostInList()` function
- Comment submission handler
- Error handling logic
- Optimistic update/rollback

**Integration Tests**: Full comment flow
- Create comment → refetch → update counter
- Error scenarios → rollback
- Multiple comments → correct count

**E2E Tests (Playwright)**: Real UI validation
- User posts comment → counter updates
- Worker posts outcome → counter updates
- Error handling → counter rolls back
- Page refresh → counter persists

### Acceptance Criteria

**AC1: Instant Counter Update** ✅
- Counter increments within 500ms of comment submit
- Visible to user who posted comment

**AC2: Accurate Counter** ✅
- Counter matches database value after confirmation
- No race conditions or stale data

**AC3: Error Resilience** ✅
- Failed comments rollback counter
- Network errors retry gracefully
- User sees error message

**AC4: Backward Compatible** ✅
- Existing functionality unchanged
- No breaking API changes
- Drop-in replacement

**AC5: Real Operations** ✅
- All tests use real API calls
- No mocks or simulations
- Database verified for each test

### Validation Checklist

- [ ] All unit tests passing (100% coverage)
- [ ] All integration tests passing
- [ ] All Playwright E2E tests passing
- [ ] Manual testing with real comments
- [ ] Manual testing with outcome comments (worker)
- [ ] Error scenarios tested
- [ ] Performance benchmarks met (<500ms update)
- [ ] Database state verified
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Code review completed
- [ ] Documentation updated

---

## Natural Language Design (NLD)

### User Stories

**US1: User Posts Comment**
```
AS a user
WHEN I post a comment on a post
THEN I see the comment counter increment immediately
AND the counter is confirmed with the server
AND my comment appears in the comment list
```

**US2: Worker Posts Outcome Comment**
```
AS a system
WHEN a worker posts an outcome comment (skipTicket=true)
THEN the counter increments in the database
AND any user viewing the post sees the updated counter
AND the outcome comment appears in the list
```

**US3: Error Handling**
```
AS a user
WHEN my comment submission fails
THEN the counter rolls back to the original value
AND I see an error message
AND I can retry posting the comment
```

### Technical Narrative

**How It Works**:

1. **User initiates comment**: User types comment and clicks submit

2. **Optimistic update**: UI immediately increments counter (0→1) for instant feedback

3. **API call**: POST request creates comment, backend increments counter in database

4. **Confirmation**: GET request refetches post with updated counter from database

5. **State update**: Frontend updates state with confirmed value from server

6. **Comment refresh**: Comment list refetches to show new comment

**Error Recovery**:

If step 3 fails → rollback step 2 (counter back to 0)
If step 4 fails → keep optimistic update, retry with backoff
If step 6 fails → counter still updated, comments refresh on next interaction

**Why This Works**:

- Database is source of truth (always correct)
- Optimistic updates provide instant UX
- Refetch confirms and syncs frontend with backend
- Error handling prevents inconsistent state
- No new backend changes needed

---

## TDD Test Plan

### Test Phases

**Phase 1: Unit Tests** (Red → Green → Refactor)
- Write failing tests first
- Implement minimum code to pass
- Refactor for quality

**Phase 2: Integration Tests**
- Test full comment submission flow
- Verify database updates
- Confirm state synchronization

**Phase 3: E2E Tests (Playwright)**
- Test UI interactions
- Verify visual updates
- Screenshot validation

**Phase 4: Regression Tests**
- Verify existing tests still pass
- No breaking changes introduced
- Full test suite green

### Test Specifications

See `tests/frontend/comment-counter.test.ts` (to be created)
See `tests/e2e/comment-counter.spec.ts` (to be created)

---

**SPARC Specification Complete**
**Status**: ✅ Ready for concurrent agent implementation
**Next**: Launch tester, reviewer, researcher agents
