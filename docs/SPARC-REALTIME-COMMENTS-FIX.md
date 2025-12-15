# SPARC Specification: Real-Time Comments Fix

**Date:** 2025-11-01
**Methodology:** SPARC + TDD + Claude-Flow Swarm + Playwright Validation
**Status:** 🚀 IMPLEMENTATION READY

---

## S - Specification

### Problem Statement

Real-time comment updates are completely broken due to WebSocket protocol mismatch and stale closure bugs.

**User Impact:**
- Comments don't appear after posting (requires page refresh)
- Comment counter shows 0 instead of actual count
- Replies not visible until refresh
- Poor user experience - appears non-functional

**Technical Root Causes:**
1. PostCard uses plain WebSocket instead of Socket.IO client
2. Stale closure in `handleCommentsUpdate` callback
3. No optimistic UI updates
4. Comment counter not updated in real-time

### Functional Requirements

**FR-1: Real-time Comment Display**
- GIVEN user posts a comment
- WHEN backend creates comment and broadcasts event
- THEN comment appears immediately in UI (< 500ms)
- AND counter updates to reflect new count
- AND no page refresh required

**FR-2: Real-time Reply Display**
- GIVEN user posts a reply to comment
- WHEN backend creates reply and broadcasts event
- THEN reply appears immediately under parent comment
- AND counter updates to include reply
- AND no page refresh required

**FR-3: Socket.IO Connection**
- GIVEN PostCard component mounts
- WHEN component connects to backend
- THEN Socket.IO client connects (not plain WebSocket)
- AND subscribes to `post:{postId}` room
- AND receives `comment:created` events

**FR-4: Comment Counter Accuracy**
- GIVEN comments are added or removed
- WHEN counter is displayed
- THEN counter shows accurate count
- AND updates in real-time without refresh

**FR-5: Optimistic UI Updates**
- GIVEN user submits comment
- WHEN API request is in-flight
- THEN comment appears immediately (optimistic)
- AND shows loading state
- AND confirmed or rolled back on API response

### Non-Functional Requirements

**NFR-1: Performance**
- Comment appears within 500ms of submission
- WebSocket events processed within 100ms
- No UI blocking or freezing

**NFR-2: Reliability**
- 100% test coverage for real-time features
- No mocks in validation tests (real Socket.IO connection)
- Playwright screenshots verify visual state
- All tests must pass before completion

**NFR-3: Maintainability**
- Clear separation between Socket.IO and plain WebSocket
- No stale closure bugs
- Documented patterns for real-time features

---

## P - Pseudocode

### Fix 1: Replace Plain WebSocket with Socket.IO

```typescript
// PostCard.tsx - BEFORE (broken)
import { useWebSocket } from '../hooks/useWebSocket';

const { socket, isConnected, subscribe, unsubscribe } = useWebSocket();

useEffect(() => {
  if (!socket || !isConnected) return;

  // This doesn't work - plain WebSocket has no .emit()
  socket.emit('subscribe:post', post.id);
  subscribe('comment:created', handleCommentUpdate);
}, [socket, isConnected]);

// PostCard.tsx - AFTER (fixed)
import { socket } from '../services/socket';

const [isConnected, setIsConnected] = useState(socket.connected);

useEffect(() => {
  // Connect Socket.IO client
  if (!socket.connected) {
    socket.connect();
  }

  // Track connection state
  const handleConnect = () => setIsConnected(true);
  const handleDisconnect = () => setIsConnected(false);

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);

  // Subscribe to post room
  socket.emit('subscribe:post', post.id);

  // Listen for comment events
  const handleCommentCreated = (data) => {
    if (data.postId === post.id) {
      handleCommentsUpdate();
    }
  };

  socket.on('comment:created', handleCommentCreated);

  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('comment:created', handleCommentCreated);
    socket.emit('unsubscribe:post', post.id);
  };
}, [post.id]);
```

### Fix 2: Eliminate Stale Closure

```typescript
// BEFORE (stale closure bug)
const loadComments = useCallback(async () => {
  if (commentsLoaded) return;  // Captures old value!
  // ... fetch and update
}, [post.id, commentsLoaded]);

const handleCommentsUpdate = useCallback(() => {
  setCommentsLoaded(false);  // Sets new value
  loadComments();            // Calls with old closure!
}, [loadComments]);

// AFTER (no stale closure)
const handleCommentsUpdate = useCallback(async () => {
  // Inline implementation - no closure dependencies
  setCommentsLoaded(false);
  setIsLoading(true);

  try {
    const response = await fetch(`/api/agent-posts/${post.id}/comments`);
    if (response.ok) {
      const data = await response.json();
      setComments(data.data || []);
      setCommentsLoaded(true);
      setEngagementState(prev => ({
        ...prev,
        comments: data.data?.length || prev.comments
      }));
    }
  } catch (error) {
    console.error('Failed to load comments:', error);
  } finally {
    setIsLoading(false);
  }
}, [post.id]);
```

### Fix 3: Optimistic UI Updates

```typescript
// Add optimistic comment state
const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

// Handler for optimistic add
const handleOptimisticAdd = useCallback((tempComment: Comment) => {
  setOptimisticComments(prev => [...prev, tempComment]);
  setEngagementState(prev => ({
    ...prev,
    comments: prev.comments + 1
  }));
}, []);

// Handler for comment confirmation
const handleCommentConfirmed = useCallback((realComment: Comment, tempId: string) => {
  // Remove optimistic, add real
  setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
  setComments(prev => [...prev, realComment]);
}, []);

// Handler for comment error
const handleOptimisticRemove = useCallback((tempId: string) => {
  setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
  setEngagementState(prev => ({
    ...prev,
    comments: Math.max(0, prev.comments - 1)
  }));
}, []);

// Combined comment list
const allComments = useMemo(() =>
  [...comments, ...optimisticComments],
  [comments, optimisticComments]
);
```

### Fix 4: Real-time Counter Update

```typescript
// When Socket.IO event received
const handleCommentCreated = useCallback((data: any) => {
  if (data.postId === post.id) {
    console.log('[PostCard] Received comment:created event', data);

    // Update counter immediately
    setEngagementState(prev => ({
      ...prev,
      comments: prev.comments + 1
    }));

    // If comments are showing, reload to display new comment
    if (showComments) {
      handleCommentsUpdate();
    }
  }
}, [post.id, showComments, handleCommentsUpdate]);
```

---

## A - Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PostCard.tsx                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Socket.IO Client (services/socket.js)                  │ │
│  │ - Connect to backend                                   │ │
│  │ - Subscribe to post:{postId} room                      │ │
│  │ - Listen for comment:created events                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ State Management                                       │ │
│  │ - comments: Comment[] (real comments from API)         │ │
│  │ - optimisticComments: Comment[] (pending)              │ │
│  │ - engagementState: { comments: number }                │ │
│  │ - isConnected: boolean                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Event Handlers                                         │ │
│  │ - handleCommentCreated(data) → Update state           │ │
│  │ - handleCommentsUpdate() → Reload from API            │ │
│  │ - handleOptimisticAdd(comment) → Add temp             │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Render                                                 │ │
│  │ - Comment counter: {engagementState.comments}          │ │
│  │ - CommentThread: [...comments, ...optimistic]          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Socket.IO)                       │
│                                                              │
│  POST /api/agent-posts/:postId/comments                     │
│    → Create comment in database                             │
│    → Broadcast to post:{postId} room                        │
│    → Emit comment:created event                             │
│                                                              │
│  websocketService.broadcastCommentAdded({                   │
│    postId,                                                   │
│    comment: { id, content, author, ... }                    │
│  })                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. User Posts Comment:**
```
User → CommentForm.onSubmit()
  → Create optimistic comment with temp ID
  → PostCard.handleOptimisticAdd(tempComment)
    → Add to optimisticComments state
    → Increment counter
  → API.createComment(content)
  → Backend saves + broadcasts
  → Socket.IO emits comment:created
  → PostCard receives event
  → PostCard.handleCommentsUpdate()
    → Fetch real comments from API
    → Replace optimistic with real
```

**2. Other User Posts Comment:**
```
Other User → API.createComment()
  → Backend saves + broadcasts
  → Socket.IO emits to post:{postId} room
  → PostCard receives comment:created event
  → PostCard.handleCommentCreated()
    → Increment counter
    → If showing comments, reload list
```

### File Structure

```
/workspaces/agent-feed/
├── frontend/src/
│   ├── components/
│   │   ├── PostCard.tsx                    ← FIX: Replace WebSocket with Socket.IO
│   │   ├── CommentForm.tsx                 ← FIX: Add optimistic update support
│   │   └── CommentThread.tsx               ← Already correct
│   ├── services/
│   │   └── socket.js                       ← Already correct (Socket.IO client)
│   ├── hooks/
│   │   ├── useWebSocket.ts                 ← DEPRECATE: Plain WebSocket (wrong)
│   │   └── useRealtimeComments.ts          ← Already correct (uses Socket.IO)
│   └── tests/
│       ├── unit/
│       │   └── PostCard.realtime.test.tsx  ← NEW: TDD tests
│       └── e2e/
│           └── comments-realtime.spec.ts   ← NEW: Playwright tests
└── api-server/
    ├── services/
    │   └── websocket-service.js            ← Already correct (Socket.IO server)
    └── server.js                            ← Already correct (broadcasts events)
```

---

## R - Refinement (TDD Plan)

### Test Suite Structure

**Unit Tests (Jest + React Testing Library)**
```typescript
// frontend/src/tests/unit/PostCard.realtime.test.tsx

describe('PostCard Real-time Comments', () => {
  describe('Socket.IO Connection', () => {
    it('should connect to Socket.IO on mount');
    it('should subscribe to post room');
    it('should disconnect and unsubscribe on unmount');
  });

  describe('Comment Events', () => {
    it('should update counter when comment:created received');
    it('should reload comments if showing when event received');
    it('should ignore events for other posts');
  });

  describe('Optimistic Updates', () => {
    it('should add optimistic comment immediately');
    it('should increment counter optimistically');
    it('should replace optimistic with real on confirmation');
    it('should remove optimistic on error');
  });

  describe('Stale Closure Fix', () => {
    it('should reload comments even when commentsLoaded is true');
    it('should not have circular dependencies in callbacks');
  });
});
```

**Integration Tests (Playwright)**
```typescript
// frontend/src/tests/e2e/comments-realtime.spec.ts

test.describe('Real-time Comments E2E', () => {
  test('should show comment immediately without refresh', async ({ page }) => {
    // Navigate to post
    await page.goto('/');

    // Verify initial counter
    await expect(page.locator('text=Comment')).toBeVisible();

    // Add comment
    await page.click('button:has-text("Comment")');
    await page.fill('textarea', 'Test comment');
    await page.click('button:has-text("Post")');

    // Verify comment appears immediately
    await expect(page.locator('text=Test comment')).toBeVisible({ timeout: 1000 });

    // Verify counter updated
    await expect(page.locator('text=1 Comments')).toBeVisible();

    // Screenshot for validation
    await page.screenshot({ path: 'test-results/comment-added.png' });
  });

  test('should receive comment from other user via Socket.IO', async ({ browser }) => {
    // Open two tabs
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Navigate both to same post
    await page1.goto('/');
    await page2.goto('/');

    // Post comment from page1
    await page1.click('button:has-text("Comment")');
    await page1.fill('textarea', 'Comment from user 1');
    await page1.click('button:has-text("Post")');

    // Verify page2 receives update via Socket.IO
    await expect(page2.locator('text=1 Comments')).toBeVisible({ timeout: 2000 });

    // Click to expand and verify comment visible
    await page2.click('button:has-text("1 Comments")');
    await expect(page2.locator('text=Comment from user 1')).toBeVisible();

    await page2.screenshot({ path: 'test-results/realtime-update.png' });
  });
});
```

### Test-Driven Development Flow

**Red → Green → Refactor**

**Phase 1: Write Failing Tests**
1. Write unit tests for Socket.IO connection
2. Write unit tests for event handlers
3. Write unit tests for optimistic updates
4. Run tests → All FAIL (expected)

**Phase 2: Implement Fixes**
1. Replace useWebSocket with Socket.IO client
2. Fix stale closure in handleCommentsUpdate
3. Add optimistic update handlers
4. Run tests → All PASS

**Phase 3: Integration Tests**
1. Write Playwright tests for real browser behavior
2. Run against real backend (no mocks)
3. Take screenshots for visual validation
4. Verify 100% functionality

**Phase 4: Regression Testing**
1. Run full test suite
2. Verify no existing tests broken
3. Check for console errors
4. Validate performance (< 500ms updates)

---

## C - Completion Criteria

### Acceptance Criteria

**✅ AC-1: Socket.IO Connection**
- [ ] PostCard imports Socket.IO client from `services/socket`
- [ ] Component connects on mount
- [ ] Subscribes to `post:{postId}` room
- [ ] Disconnects and unsubscribes on unmount
- [ ] Unit tests pass (5/5)

**✅ AC-2: Real-time Comment Display**
- [ ] Comment appears within 500ms of posting
- [ ] Counter updates immediately
- [ ] No page refresh required
- [ ] Works for current user and other users
- [ ] Playwright tests pass (2/2)

**✅ AC-3: No Stale Closures**
- [ ] `handleCommentsUpdate` has no circular dependencies
- [ ] Comments reload even when `commentsLoaded` is true
- [ ] Tests verify closure behavior
- [ ] Unit tests pass (2/2)

**✅ AC-4: Optimistic Updates**
- [ ] Comment appears immediately on submit
- [ ] Counter increments optimistically
- [ ] Replaced with real comment on API response
- [ ] Rolled back on error
- [ ] Unit tests pass (4/4)

**✅ AC-5: Zero Defects**
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All existing tests still pass
- [ ] No performance regressions
- [ ] Screenshots show correct UI state

### Definition of Done

**Code Quality:**
- ✅ TypeScript compiles with no errors
- ✅ ESLint passes with no warnings
- ✅ All imports correctly typed

**Testing:**
- ✅ 13 new unit tests (all passing)
- ✅ 2 Playwright E2E tests (all passing)
- ✅ All existing tests still pass
- ✅ No mocks in validation tests (real Socket.IO)

**Documentation:**
- ✅ Code comments explain Socket.IO usage
- ✅ SPARC doc updated with implementation
- ✅ README shows real-time features

**Validation:**
- ✅ Manual testing in browser confirms functionality
- ✅ Playwright screenshots show correct behavior
- ✅ WebSocket frame inspection shows Socket.IO packets
- ✅ Multiple users can see real-time updates

---

## Implementation Plan (Concurrent Agents)

### Agent Team Structure

**Agent 1: PostCard Socket.IO Migration**
- Task: Replace useWebSocket with Socket.IO client
- File: `frontend/src/components/PostCard.tsx`
- Tests: Write unit tests for Socket.IO connection
- Output: PostCard uses Socket.IO, tests passing

**Agent 2: Stale Closure Fix**
- Task: Refactor handleCommentsUpdate to eliminate closure bug
- File: `frontend/src/components/PostCard.tsx`
- Tests: Write tests for reload behavior
- Output: No circular dependencies, tests passing

**Agent 3: Optimistic Updates**
- Task: Add optimistic comment state and handlers
- File: `frontend/src/components/PostCard.tsx`
- File: `frontend/src/components/CommentForm.tsx`
- Tests: Write tests for optimistic behavior
- Output: Optimistic updates working, tests passing

**Agent 4: Counter Fix**
- Task: Update counter in real-time on events
- File: `frontend/src/components/PostCard.tsx`
- Tests: Write tests for counter accuracy
- Output: Counter updates immediately, tests passing

**Agent 5: Playwright E2E Tests**
- Task: Write comprehensive browser tests
- File: `frontend/src/tests/e2e/comments-realtime.spec.ts`
- Tests: Real browser, real backend, screenshots
- Output: E2E tests passing with screenshots

**Agent 6: Integration Validator**
- Task: Run all tests, verify no regressions
- Tests: Full test suite + manual browser testing
- Output: 100% pass rate, screenshots, final report

### Execution Order

**Phase 1: Parallel Implementation (Agents 1-4)**
```
Agent 1: Socket.IO Migration    ┐
Agent 2: Stale Closure Fix      ├─ Run concurrently
Agent 3: Optimistic Updates     │  (independent tasks)
Agent 4: Counter Fix            ┘
```

**Phase 2: Validation (Agents 5-6)**
```
Agent 5: Playwright E2E Tests   ┐
Agent 6: Integration Validation ┘─ Run after Phase 1
```

### Success Metrics

**Performance:**
- Comment appears < 500ms after submit
- Socket.IO event processed < 100ms
- Counter updates < 100ms

**Reliability:**
- 100% test pass rate
- Zero console errors
- Zero TypeScript errors

**Quality:**
- Code coverage > 90%
- All Playwright tests with screenshots
- Manual browser validation confirms

---

## Appendix: Technical References

### Socket.IO Client API

```typescript
import { socket } from '../services/socket';

// Connection
socket.connect();
socket.disconnect();

// Event listeners
socket.on('event-name', handler);
socket.off('event-name', handler);

// Event emission
socket.emit('event-name', data);

// Room subscription
socket.emit('subscribe:post', postId);
socket.emit('unsubscribe:post', postId);

// Connection state
socket.connected  // boolean
socket.id         // string
```

### WebSocket Service Events

**Backend emits:**
- `comment:created` - New comment added
- `comment:updated` - Comment edited
- `comment:deleted` - Comment removed

**Event payload:**
```typescript
{
  postId: string;
  comment: {
    id: string;
    content: string;
    content_type: 'text' | 'markdown';
    author: string;
    author_agent: string;
    created_at: string;
    parent_id: string | null;
  }
}
```

### Testing Resources

**Playwright Docs:**
- https://playwright.dev/docs/test-assertions
- https://playwright.dev/docs/screenshots
- https://playwright.dev/docs/test-fixtures

**Socket.IO Testing:**
- Use real Socket.IO server (no mocks)
- Wait for `connect` event before testing
- Clean up connections in `afterEach`

**TDD Best Practices:**
- Write test first (Red)
- Implement minimal fix (Green)
- Refactor for quality (Refactor)
- Repeat for each feature

---

**Status:** Ready for concurrent agent execution ✅
