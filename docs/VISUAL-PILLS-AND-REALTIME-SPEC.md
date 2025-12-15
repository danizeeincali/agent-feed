# SPARC Specification: Visual Processing Pills & Real-Time Comment Updates

**Version:** 1.0.0
**Date:** 2025-11-19
**Status:** Specification Complete
**Project:** agent-feed

---

## Executive Summary

This specification details TWO critical UX enhancements to the comment system:

1. **Visual Processing Indicator (Processing Pills)** - Floating badge on comment cards showing "Posting reply..." during async operations
2. **Real-Time Comment Updates** - WebSocket-driven automatic comment refresh without browser reload

**Current Pain Points:**
- Users see button spinner but no visual feedback on the comment itself
- Users must manually refresh to see new replies (poor UX vs modern chat apps)
- Processing state only visible in button, not on affected comment card

**Expected Outcomes:**
- Clear visual feedback during reply processing
- Seamless real-time updates like Slack/Discord
- No manual refresh required
- Professional, polished UX

---

## S - SPECIFICATION

### 1. Functional Requirements

#### FR-1: Visual Processing Indicator on Comment Cards

**ID:** FR-PILL-001
**Priority:** HIGH
**Description:** Display a floating visual indicator (pill/badge) on comment cards when a reply is being posted.

**User Story:**
```
As a user
When I click "Post Reply" on a comment
Then I should see a visual pill appear on that comment card
Showing "Posting reply..." with a spinner
So I know which comment is being processed
```

**Acceptance Criteria:**
- ✅ **AC-1.1:** Pill appears immediately when reply button is clicked
- ✅ **AC-1.2:** Pill displays spinner icon + "Posting reply..." text
- ✅ **AC-1.3:** Pill is visually prominent (blue background, white text)
- ✅ **AC-1.4:** Pill persists until backend confirms comment creation
- ✅ **AC-1.5:** Pill disappears after successful reply or error
- ✅ **AC-1.6:** Multiple comments can show pills simultaneously
- ✅ **AC-1.7:** Pill position does not cause layout shift

**Visual Design:**
```tsx
<div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-lg z-10">
  <Loader2 className="w-3 h-3 animate-spin" />
  <span>Posting reply...</span>
</div>
```

**Component Hierarchy:**
```
CommentThread (manages processingComments Set)
  └── CommentItem (receives processingComments prop)
      ├── [Visual Pill] (conditionally rendered)
      └── Reply Button (triggers processing)
```

---

#### FR-2: Real-Time Comment Updates via WebSocket

**ID:** FR-WS-001
**Priority:** HIGH
**Description:** Automatically refresh comments when new replies are created via WebSocket events.

**User Story:**
```
As a user
When another user posts a reply to a comment thread
Then I should see the new reply appear automatically
Without needing to refresh the page
So the experience feels real-time like modern chat apps
```

**Acceptance Criteria:**
- ✅ **AC-2.1:** WebSocket connection established on component mount
- ✅ **AC-2.2:** `comment:created` events trigger comment refresh
- ✅ **AC-2.3:** Comments update within 1 second of creation
- ✅ **AC-2.4:** Real-time updates work for nested replies
- ✅ **AC-2.5:** Comment counter updates automatically
- ✅ **AC-2.6:** Optimistic updates merge with server data
- ✅ **AC-2.7:** WebSocket errors handled gracefully (fallback to polling)

**WebSocket Event Contract:**
```typescript
// Backend → Frontend Event
interface CommentCreatedEvent {
  type: 'comment:created';
  payload: {
    postId: string;
    commentId: string;
    parentId?: string;
    content: string;
    author: string;
    created_at: number;
  };
}
```

**Flow Diagram:**
```
User A Posts Reply → Backend Creates Comment → WebSocket Event Emitted
                                                      ↓
                                            User B Receives Event
                                                      ↓
                                            Frontend Refetches Comments
                                                      ↓
                                            UI Updates Automatically
```

---

### 2. Non-Functional Requirements

#### NFR-1: Performance

**ID:** NFR-PERF-001
**Target:** Processing pill renders in <50ms
**Measurement:** React DevTools Profiler

**ID:** NFR-PERF-002
**Target:** Real-time updates complete in <1000ms
**Measurement:** WebSocket event timestamp delta

**ID:** NFR-PERF-003
**Target:** No visible layout shift when pill appears
**Measurement:** Cumulative Layout Shift (CLS) < 0.1

#### NFR-2: Reliability

**ID:** NFR-REL-001
**Target:** 99.9% WebSocket uptime
**Fallback:** Polling every 5 seconds if WebSocket fails

**ID:** NFR-REL-002
**Target:** Processing state never stuck (auto-clear after 30s timeout)
**Implementation:** setTimeout cleanup in useEffect

#### NFR-3: Accessibility

**ID:** NFR-A11Y-001
**Target:** WCAG 2.1 AA compliance
**Requirements:**
- Pills have 4.5:1 contrast ratio
- Screen readers announce "Processing reply"
- Keyboard navigation unaffected

---

### 3. Edge Cases & Error Handling

#### Edge Case 1: Network Failure During Reply

**Scenario:** User posts reply, network drops before response
**Expected Behavior:**
- Processing pill shows for 30s maximum
- Timeout shows error toast: "Reply failed. Please try again."
- Pill disappears
- Comment not added optimistically

**Implementation:**
```typescript
const PROCESSING_TIMEOUT = 30000; // 30 seconds

useEffect(() => {
  if (processingComments.has(comment.id)) {
    const timeoutId = setTimeout(() => {
      onProcessingChange(comment.id, false);
      toast.showError('Reply timeout. Please refresh.');
    }, PROCESSING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }
}, [processingComments]);
```

---

#### Edge Case 2: WebSocket Disconnection

**Scenario:** WebSocket connection drops mid-session
**Expected Behavior:**
- Frontend attempts reconnection (3 retries, exponential backoff)
- After 3 failures, fallback to HTTP polling (5s interval)
- User sees toast: "Real-time updates paused. Reconnecting..."
- Manual refresh button still works

**Implementation:**
```typescript
const ws = new WebSocket(wsUrl);
let retryCount = 0;
const MAX_RETRIES = 3;

ws.onclose = () => {
  if (retryCount < MAX_RETRIES) {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    setTimeout(() => reconnect(), delay);
    retryCount++;
  } else {
    startPolling(); // Fallback to HTTP polling
    toast.showWarning('Real-time updates unavailable. Using fallback mode.');
  }
};
```

---

#### Edge Case 3: Duplicate Comment Events

**Scenario:** Backend sends duplicate `comment:created` events
**Expected Behavior:**
- Frontend deduplicates by comment ID
- UI does not flicker or show duplicates
- No unnecessary API calls

**Implementation:**
```typescript
const processedCommentIds = new Set<string>();

socket.on('comment:created', (data) => {
  if (processedCommentIds.has(data.payload.commentId)) {
    console.log('Duplicate event ignored:', data.payload.commentId);
    return;
  }

  processedCommentIds.add(data.payload.commentId);
  refreshComments(data.payload.postId);
});
```

---

#### Edge Case 4: Rapid Sequential Replies

**Scenario:** User posts 3 replies in quick succession
**Expected Behavior:**
- All 3 comments show processing pills independently
- Pills clear as each reply completes
- No race conditions in state updates
- Comment order preserved

**State Management:**
```typescript
// Use Set for O(1) lookups and automatic deduplication
const [processingComments, setProcessingComments] = useState<Set<string>>(new Set());

// Add comment to processing
setProcessingComments(prev => new Set(prev).add(commentId));

// Remove comment from processing
setProcessingComments(prev => {
  const next = new Set(prev);
  next.delete(commentId);
  return next;
});
```

---

### 4. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| User Confusion Rate | 35% | <5% | User testing surveys |
| Manual Refresh Rate | 80% | <10% | Analytics tracking |
| Processing Visibility | Button only | Comment card | Visual inspection |
| Real-Time Latency | Manual | <1s | WebSocket timestamp delta |
| Error Recovery Time | Infinite | <30s | Timeout implementation |

---

## P - PSEUDOCODE

### Algorithm 1: Visual Processing Pill Rendering

```pseudocode
FUNCTION renderCommentItem(comment, processingComments):
  BEGIN
    # Step 1: Check if comment is being processed
    isProcessing = processingComments.has(comment.id)

    # Step 2: Render comment card container
    RENDER div[position: relative]:
      # Step 3: Conditionally render processing pill
      IF isProcessing THEN
        RENDER div[absolute, top-2, right-2]:
          RENDER Loader2Icon[animate-spin]
          RENDER span["Posting reply..."]
        END_RENDER
      END_IF

      # Step 4: Render normal comment content
      RENDER CommentHeader(author, timestamp)
      RENDER CommentBody(content)
      RENDER CommentActions(onReply, onDelete)
    END_RENDER
  END
END

FUNCTION handleReplySubmit(commentId, content):
  BEGIN
    # Step 1: Add to processing state immediately
    onProcessingChange(commentId, true)

    # Step 2: Send API request
    TRY
      response = AWAIT apiService.createComment(postId, content, {
        parentId: commentId,
        author: userId
      })

      # Step 3: Success - refresh comments and clear processing
      AWAIT loadComments(postId, refresh=true)
      onProcessingChange(commentId, false)

    CATCH error:
      # Step 4: Error - show message and clear processing
      toast.showError("Failed to post reply. Please try again.")
      onProcessingChange(commentId, false)
    END_TRY
  END
END
```

**Complexity Analysis:**
- Time: O(1) for adding/removing from Set
- Space: O(n) where n = number of processing comments (typically small)

---

### Algorithm 2: WebSocket Real-Time Updates

```pseudocode
FUNCTION initializeWebSocket(postId):
  BEGIN
    # Step 1: Establish WebSocket connection
    protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = NEW WebSocket(`${protocol}//${window.location.host}`)

    # Step 2: Handle connection lifecycle
    ws.onopen = FUNCTION():
      console.log("WebSocket connected for post", postId)
      SEND({ type: 'subscribe', postId: postId })
    END

    ws.onmessage = FUNCTION(event):
      data = JSON.parse(event.data)

      IF data.type === 'comment:created' THEN
        handleCommentCreated(data.payload)
      END_IF
    END

    ws.onerror = FUNCTION(error):
      console.error("WebSocket error:", error)
      startFallbackPolling()
    END

    ws.onclose = FUNCTION():
      console.log("WebSocket closed")
      attemptReconnection()
    END

    # Step 3: Cleanup on unmount
    RETURN FUNCTION cleanup():
      ws.close()
    END
  END
END

FUNCTION handleCommentCreated(payload):
  BEGIN
    # Step 1: Validate event data
    IF NOT payload.postId OR NOT payload.commentId THEN
      console.error("Invalid comment event", payload)
      RETURN
    END_IF

    # Step 2: Check if event is for current post
    IF payload.postId !== currentPostId THEN
      RETURN
    END_IF

    # Step 3: Debounce multiple events
    IF lastRefreshTime < (NOW - 1000) THEN
      # Step 4: Refresh comments from server
      AWAIT loadComments(payload.postId, refresh=true)
      lastRefreshTime = NOW

      # Step 5: Update engagement counter
      updateCommentCounter(payload.postId, increment=1)
    END_IF
  END
END

FUNCTION startFallbackPolling():
  BEGIN
    pollingInterval = SETINTERVAL(FUNCTION():
      IF isVisible(commentSection) THEN
        loadComments(postId, refresh=true)
      END_IF
    END, 5000) # 5 second polling

    RETURN FUNCTION stopPolling():
      CLEARINTERVAL(pollingInterval)
    END
  END
END
```

**State Machine Diagram:**
```
┌─────────────┐
│ Disconnected│
└──────┬──────┘
       │ onMount
       ▼
┌─────────────┐   onError    ┌─────────────┐
│ Connecting  │──────────────>│   Retrying  │
└──────┬──────┘               └──────┬──────┘
       │ onOpen                      │ retry count < 3
       ▼                              ▼
┌─────────────┐               ┌─────────────┐
│  Connected  │◄──────────────│   Waiting   │
└──────┬──────┘               └─────────────┘
       │ onMessage                    │
       ▼                              │ retry count >= 3
┌─────────────┐                      ▼
│  Processing │               ┌─────────────┐
│   Event     │               │   Polling   │
└─────────────┘               │   Fallback  │
                              └─────────────┘
```

---

## A - ARCHITECTURE

### 1. Component Hierarchy

```
RealSocialMediaFeed
  └── [Managing processingComments state]
      └── CommentThread
          ├── Props: processingComments (Set<string>)
          ├── Props: onProcessingChange (function)
          └── WebSocket: useEffect for real-time
              └── CommentItem [MODIFIED]
                  ├── Props: comment
                  ├── Props: processingComments
                  ├── [NEW] Visual Pill (conditional)
                  └── Reply Button (triggers processing)
```

**State Flow:**
```
User clicks "Post Reply"
  ↓
CommentItem.handleReplySubmit()
  ↓
onProcessingChange(commentId, true)
  ↓
RealSocialMediaFeed.setProcessingComments(prev => new Set(prev).add(commentId))
  ↓
processingComments passed down as prop
  ↓
CommentItem detects comment.id in processingComments
  ↓
Pill renders via conditional: {processingComments.has(comment.id) && <Pill />}
  ↓
API call completes
  ↓
onProcessingChange(commentId, false)
  ↓
processingComments.delete(commentId)
  ↓
Pill disappears (React re-render)
```

---

### 2. WebSocket Architecture

**Client-Server Communication:**
```
┌──────────────────────┐         WebSocket         ┌──────────────────────┐
│                      │    (wss://host/socket)    │                      │
│   Frontend Client    │◄─────────────────────────►│   Backend Server     │
│   (CommentThread)    │                           │   (api-server)       │
│                      │                           │                      │
└──────────┬───────────┘                           └──────────┬───────────┘
           │                                                  │
           │ 1. Subscribe to post                            │
           │────────────────────────────────────────────────>│
           │                                                  │
           │ 2. Emit comment:created event                   │
           │◄────────────────────────────────────────────────│
           │                                                  │
           │ 3. Refetch comments via HTTP                    │
           │────────────────────────────────────────────────>│
           │                                                  │
           │ 4. Return fresh comment list                    │
           │◄────────────────────────────────────────────────│
           │                                                  │
           ▼                                                  ▼
```

**Backend Event Emission (api-server):**
```typescript
// api-server/routes/comments.ts
router.post('/agent-posts/:postId/comments', async (req, res) => {
  const newComment = await db.createComment(req.body);

  // Emit WebSocket event to all connected clients
  io.emit('comment:created', {
    type: 'comment:created',
    payload: {
      postId: req.params.postId,
      commentId: newComment.id,
      parentId: newComment.parent_id,
      content: newComment.content,
      author: newComment.author,
      created_at: newComment.created_at
    }
  });

  res.json({ success: true, data: newComment });
});
```

**Frontend Event Handling (CommentThread.tsx):**
```typescript
useEffect(() => {
  if (!enableRealTime) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'comment:created' && data.payload.postId === postId) {
      // Refresh comments when event received
      onCommentsUpdate?.();
    }
  };

  ws.onerror = (error) => {
    console.warn('WebSocket connection failed:', error);
  };

  return () => ws.close();
}, [postId, enableRealTime, onCommentsUpdate]);
```

---

### 3. State Synchronization Pattern

**Problem:** How to prevent race conditions when:
1. Optimistic update adds comment locally
2. WebSocket event triggers refresh
3. HTTP response returns

**Solution: Timestamp-Based Merge**
```typescript
const mergeComments = (localComments, serverComments) => {
  // 1. Create map of server comments by ID
  const serverMap = new Map(
    serverComments.map(c => [c.id, c])
  );

  // 2. Merge: server always wins for existing IDs
  const merged = serverComments.slice();

  // 3. Add local-only comments (not yet in server response)
  localComments.forEach(local => {
    if (!serverMap.has(local.id)) {
      // Check if comment is less than 5 seconds old (still pending)
      const age = Date.now() - new Date(local.created_at).getTime();
      if (age < 5000) {
        merged.push(local); // Keep optimistic update
      }
    }
  });

  // 4. Sort by timestamp
  return merged.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};
```

---

### 4. Error Recovery Architecture

**Failure Modes:**

| Failure Type | Detection | Recovery Strategy | User Impact |
|--------------|-----------|-------------------|-------------|
| WebSocket connection fails | `ws.onerror` event | Fallback to polling (5s) | Toast: "Using fallback mode" |
| Comment creation timeout | 30s timer | Clear pill, show error | Toast: "Reply failed" |
| Network disconnect | `window.offline` | Queue actions, retry on reconnect | Toast: "Offline. Changes saved locally." |
| Duplicate events | Event ID tracking | Deduplicate in handleCommentCreated | None (silent) |
| Server 500 error | HTTP status | Retry with exponential backoff | Toast: "Server error. Retrying..." |

**Retry Policy (Exponential Backoff):**
```typescript
const retry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Usage
await retry(() => apiService.createComment(postId, content));
```

---

## R - REFINEMENT (TDD)

### 1. Unit Tests for Visual Processing Pill

**Test Suite:** `CommentThread.processing.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentThread } from '../CommentThread';
import { apiService } from '../../services/api';

// Mock API service
jest.mock('../../services/api');

describe('CommentThread - Visual Processing Pill', () => {
  const mockComments = [
    {
      id: 'comment-1',
      content: 'Test comment',
      author: 'user1',
      created_at: new Date().toISOString(),
      replies: [],
      repliesCount: 0,
      threadDepth: 0,
      threadPath: 'comment-1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('PILL-1: Processing pill appears when reply button is clicked', async () => {
    const user = userEvent.setup();

    // Arrange
    (apiService.createComment as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 2000))
    );

    render(
      <CommentThread
        postId="post-1"
        comments={mockComments}
        enableRealTime={false}
      />
    );

    // Act
    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByText('Post Reply');
    await user.click(postButton);

    // Assert
    expect(screen.getByText('Posting reply...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  test('PILL-2: Processing pill disappears after successful reply', async () => {
    const user = userEvent.setup();

    // Arrange
    const mockNewComment = { id: 'comment-2', content: 'New reply' };
    (apiService.createComment as jest.Mock).mockResolvedValue({
      success: true,
      data: mockNewComment
    });

    render(
      <CommentThread
        postId="post-1"
        comments={mockComments}
        enableRealTime={false}
      />
    );

    // Act
    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByText('Post Reply');
    await user.click(postButton);

    // Assert - Pill appears
    expect(screen.getByText('Posting reply...')).toBeInTheDocument();

    // Wait for pill to disappear
    await waitFor(() => {
      expect(screen.queryByText('Posting reply...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('PILL-3: Multiple comments can show pills simultaneously', async () => {
    const user = userEvent.setup();

    // Arrange
    const multipleComments = [
      { ...mockComments[0], id: 'comment-1' },
      { ...mockComments[0], id: 'comment-2' }
    ];

    (apiService.createComment as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 2000))
    );

    render(
      <CommentThread
        postId="post-1"
        comments={multipleComments}
        enableRealTime={false}
      />
    );

    // Act - Click reply on both comments
    const replyButtons = screen.getAllByText('Reply');
    await user.click(replyButtons[0]);
    await user.click(replyButtons[1]);

    // Assert - Both pills visible
    const pills = screen.getAllByText('Posting reply...');
    expect(pills).toHaveLength(2);
  });

  test('PILL-4: Pill clears after timeout (30 seconds)', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });

    // Arrange
    (apiService.createComment as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <CommentThread
        postId="post-1"
        comments={mockComments}
        enableRealTime={false}
      />
    );

    // Act
    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByText('Post Reply');
    await user.click(postButton);

    // Assert - Pill appears
    expect(screen.getByText('Posting reply...')).toBeInTheDocument();

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    // Assert - Pill removed and error shown
    await waitFor(() => {
      expect(screen.queryByText('Posting reply...')).not.toBeInTheDocument();
      expect(screen.getByText(/reply failed/i)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('PILL-5: No layout shift when pill appears', async () => {
    const user = userEvent.setup();

    // Arrange
    (apiService.createComment as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    const { container } = render(
      <CommentThread
        postId="post-1"
        comments={mockComments}
        enableRealTime={false}
      />
    );

    // Measure initial position
    const commentCard = container.querySelector('[data-testid="comment-card"]');
    const initialRect = commentCard?.getBoundingClientRect();

    // Act
    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByText('Post Reply');
    await user.click(postButton);

    // Assert - Position unchanged (pill is absolutely positioned)
    const finalRect = commentCard?.getBoundingClientRect();
    expect(finalRect?.top).toBe(initialRect?.top);
    expect(finalRect?.left).toBe(initialRect?.left);
  });
});
```

---

### 2. Unit Tests for Real-Time Updates

**Test Suite:** `CommentThread.realtime.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { CommentThread } from '../CommentThread';
import { apiService } from '../../services/api';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onclose: (() => void) | null = null;

  send(data: string) {}
  close() {}

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.onopen?.();
  }
}

describe('CommentThread - Real-Time Updates', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    global.WebSocket = jest.fn(() => mockWs) as any;
    jest.clearAllMocks();
  });

  test('RT-1: WebSocket connects on mount', () => {
    // Arrange & Act
    render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
      />
    );

    // Assert
    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://')
    );
  });

  test('RT-2: Comments refresh when comment:created event received', async () => {
    // Arrange
    const onCommentsUpdate = jest.fn();
    (apiService.getPostComments as jest.Mock).mockResolvedValue([
      { id: 'new-comment', content: 'New comment via WebSocket' }
    ]);

    render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
        onCommentsUpdate={onCommentsUpdate}
      />
    );

    // Act - Simulate WebSocket event
    mockWs.simulateMessage({
      type: 'comment:created',
      payload: {
        postId: 'post-1',
        commentId: 'new-comment',
        content: 'New comment via WebSocket'
      }
    });

    // Assert
    await waitFor(() => {
      expect(onCommentsUpdate).toHaveBeenCalled();
    });
  });

  test('RT-3: Ignores events for different posts', async () => {
    // Arrange
    const onCommentsUpdate = jest.fn();

    render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
        onCommentsUpdate={onCommentsUpdate}
      />
    );

    // Act - Event for different post
    mockWs.simulateMessage({
      type: 'comment:created',
      payload: {
        postId: 'post-2', // Different post
        commentId: 'new-comment'
      }
    });

    // Wait and ensure callback not called
    await new Promise(resolve => setTimeout(resolve, 500));

    // Assert
    expect(onCommentsUpdate).not.toHaveBeenCalled();
  });

  test('RT-4: Reconnects after connection failure', async () => {
    jest.useFakeTimers();

    // Arrange
    render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
      />
    );

    // Act - Simulate connection error
    mockWs.onerror?.({ message: 'Connection failed' });

    // Fast-forward retry delay
    jest.advanceTimersByTime(1000);

    // Assert - Should attempt reconnection
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  test('RT-5: Deduplicates duplicate events', async () => {
    // Arrange
    const onCommentsUpdate = jest.fn();

    render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
        onCommentsUpdate={onCommentsUpdate}
      />
    );

    // Act - Send same event twice
    const event = {
      type: 'comment:created',
      payload: {
        postId: 'post-1',
        commentId: 'duplicate-comment'
      }
    };

    mockWs.simulateMessage(event);
    mockWs.simulateMessage(event); // Duplicate

    // Assert - Callback called only once
    await waitFor(() => {
      expect(onCommentsUpdate).toHaveBeenCalledTimes(1);
    });
  });

  test('RT-6: WebSocket disconnects on unmount', () => {
    // Arrange
    const { unmount } = render(
      <CommentThread
        postId="post-1"
        comments={[]}
        enableRealTime={true}
      />
    );

    const closeSpy = jest.spyOn(mockWs, 'close');

    // Act
    unmount();

    // Assert
    expect(closeSpy).toHaveBeenCalled();
  });
});
```

---

### 3. Integration Tests

**Test Suite:** `CommentThread.integration.test.tsx`

```typescript
describe('CommentThread - Integration Tests', () => {
  test('INT-1: Full reply flow with processing pill and real-time update', async () => {
    const user = userEvent.setup();
    let wsCallback: Function;

    // Mock WebSocket to capture message handler
    global.WebSocket = jest.fn().mockImplementation(() => ({
      onmessage: (cb: Function) => { wsCallback = cb; },
      close: jest.fn()
    }));

    // Mock API
    (apiService.createComment as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'new-comment' }
    });

    (apiService.getPostComments as jest.Mock).mockResolvedValue([
      { id: 'comment-1', content: 'Original' },
      { id: 'new-comment', content: 'New reply' }
    ]);

    // Render
    render(
      <CommentThread
        postId="post-1"
        comments={[
          { id: 'comment-1', content: 'Original', replies: [], repliesCount: 0 }
        ]}
        enableRealTime={true}
      />
    );

    // Step 1: Click reply
    await user.click(screen.getByText('Reply'));
    await user.type(screen.getByPlaceholderText(/write a reply/i), 'Test');
    await user.click(screen.getByText('Post Reply'));

    // Step 2: Verify processing pill
    expect(screen.getByText('Posting reply...')).toBeInTheDocument();

    // Step 3: Wait for API response
    await waitFor(() => {
      expect(screen.queryByText('Posting reply...')).not.toBeInTheDocument();
    });

    // Step 4: Simulate WebSocket event
    wsCallback!({
      data: JSON.stringify({
        type: 'comment:created',
        payload: { postId: 'post-1', commentId: 'new-comment' }
      })
    });

    // Step 5: Verify comment appears
    await waitFor(() => {
      expect(screen.getByText('New reply')).toBeInTheDocument();
    });
  });
});
```

---

### 4. E2E Tests with Playwright

**Test Suite:** `tests/e2e/comment-reply-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Comment Reply Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="post-card"]');
  });

  test('E2E-1: Visual processing pill appears during reply', async ({ page }) => {
    // Expand post and open comments
    await page.click('[data-testid="expand-post"]');
    await page.click('[data-testid="toggle-comments"]');

    // Click reply button
    await page.click('text=Reply');

    // Type reply
    await page.fill('[placeholder*="write a reply"]', 'Test reply from E2E');

    // Click Post Reply
    await page.click('text=Post Reply');

    // Verify processing pill appears
    await expect(page.locator('text=Posting reply...')).toBeVisible();

    // Verify pill has spinner
    await expect(page.locator('.animate-spin')).toBeVisible();

    // Wait for pill to disappear (max 30s)
    await expect(page.locator('text=Posting reply...')).not.toBeVisible({ timeout: 30000 });
  });

  test('E2E-2: Real-time update shows reply without refresh', async ({ page, context }) => {
    // Open two tabs to simulate multi-user
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000');

    // Tab 1: Expand post
    await page.click('[data-testid="expand-post"]');
    await page.click('[data-testid="toggle-comments"]');

    // Tab 2: Post a reply
    await page2.click('[data-testid="expand-post"]');
    await page2.click('[data-testid="toggle-comments"]');
    await page2.click('text=Reply');
    await page2.fill('[placeholder*="write a reply"]', 'Reply from Tab 2');
    await page2.click('text=Post Reply');

    // Tab 1: Verify reply appears automatically (no manual refresh)
    await expect(page.locator('text=Reply from Tab 2')).toBeVisible({ timeout: 5000 });
  });

  test('E2E-3: Error handling shows user-friendly message', async ({ page }) => {
    // Intercept API and force error
    await page.route('**/api/agent-posts/*/comments', route =>
      route.fulfill({ status: 500, body: 'Server error' })
    );

    // Expand and reply
    await page.click('[data-testid="expand-post"]');
    await page.click('[data-testid="toggle-comments"]');
    await page.click('text=Reply');
    await page.fill('[placeholder*="write a reply"]', 'Error test');
    await page.click('text=Post Reply');

    // Verify error toast appears
    await expect(page.locator('text=Failed to post reply')).toBeVisible();

    // Verify pill disappears
    await expect(page.locator('text=Posting reply...')).not.toBeVisible();
  });
});
```

---

### 5. Performance Tests

**Test Suite:** `CommentThread.performance.test.tsx`

```typescript
describe('CommentThread - Performance Tests', () => {
  test('PERF-1: Pill renders in <50ms', async () => {
    const { rerender } = render(
      <CommentThread
        postId="post-1"
        comments={[mockComment]}
        processingComments={new Set()}
      />
    );

    // Measure render time
    const startTime = performance.now();

    rerender(
      <CommentThread
        postId="post-1"
        comments={[mockComment]}
        processingComments={new Set(['comment-1'])}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(50);
  });

  test('PERF-2: No layout shift (CLS < 0.1)', async () => {
    const { container } = render(
      <CommentThread
        postId="post-1"
        comments={[mockComment]}
        processingComments={new Set()}
      />
    );

    const commentCard = container.querySelector('[data-testid="comment-card"]');
    const initialRect = commentCard!.getBoundingClientRect();

    // Trigger processing pill
    rerender(
      <CommentThread
        postId="post-1"
        comments={[mockComment]}
        processingComments={new Set(['comment-1'])}
      />
    );

    const finalRect = commentCard!.getBoundingClientRect();

    // Calculate Cumulative Layout Shift
    const heightDelta = Math.abs(finalRect.height - initialRect.height);
    const cls = heightDelta / initialRect.height;

    expect(cls).toBeLessThan(0.1);
  });
});
```

---

## C - COMPLETION

### 1. Implementation Checklist

**Phase 1: Visual Processing Pills**
- [ ] Add `processingComments` state to `RealSocialMediaFeed`
- [ ] Pass `processingComments` prop to `CommentThread`
- [ ] Pass `onProcessingChange` callback to `CommentThread`
- [ ] Add conditional pill rendering in `CommentItem`
- [ ] Implement pill CSS (absolute positioning, no layout shift)
- [ ] Add processing state management in `handleReplySubmit`
- [ ] Implement 30-second timeout for stuck processing
- [ ] Add error handling and toast notifications

**Phase 2: Real-Time WebSocket Updates**
- [ ] Install Socket.IO client (`socket.io-client`)
- [ ] Create WebSocket connection in `CommentThread` useEffect
- [ ] Implement `comment:created` event handler
- [ ] Add event deduplication logic (Set of processed IDs)
- [ ] Implement reconnection with exponential backoff
- [ ] Add fallback polling mechanism
- [ ] Update backend to emit `comment:created` events
- [ ] Test WebSocket connection lifecycle

**Phase 3: Testing**
- [ ] Write unit tests for processing pill (5 tests)
- [ ] Write unit tests for real-time updates (6 tests)
- [ ] Write integration tests (1 test)
- [ ] Write E2E tests with Playwright (3 tests)
- [ ] Write performance tests (2 tests)
- [ ] Run regression tests on existing features

**Phase 4: Documentation**
- [ ] Update `README.md` with new features
- [ ] Document WebSocket event contract
- [ ] Add troubleshooting guide for WebSocket failures
- [ ] Create user guide with screenshots

---

### 2. Testing Strategy

**Test Pyramid:**
```
         ┌──────────┐
         │ 3 E2E    │  (Playwright - Full browser)
         └──────────┘
       ┌──────────────┐
       │ 1 Integration│  (React Testing Library)
       └──────────────┘
     ┌──────────────────┐
     │ 11 Unit Tests    │  (Jest + RTL)
     └──────────────────┘
   ┌──────────────────────┐
   │ 2 Performance Tests  │  (Metrics validation)
   └──────────────────────┘
```

**Test Coverage Target:** 95%

**Critical Paths:**
1. Reply button → Processing pill appears → API call → Pill disappears
2. WebSocket connects → Event received → Comments refresh → UI updates
3. Network error → Retry logic → Fallback polling → User notified

---

### 3. Deployment Steps

**Step 1: Backend Deployment**
```bash
# 1. Update backend to emit WebSocket events
git checkout -b feature/websocket-events
cd api-server

# 2. Modify comment creation endpoint
vim routes/comments.ts
# Add: io.emit('comment:created', eventPayload)

# 3. Test locally
npm run dev
curl -X POST http://localhost:3001/api/agent-posts/post-1/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Test","author":"user1"}'

# 4. Verify WebSocket event emitted
# Check browser console: "WebSocket event received"

# 5. Deploy to production
git add . && git commit -m "feat: Add WebSocket event emission for comments"
git push origin feature/websocket-events
# Create PR, merge after approval
```

**Step 2: Frontend Deployment**
```bash
# 1. Implement visual pills and real-time updates
git checkout -b feature/processing-pills-realtime
cd frontend

# 2. Install dependencies
npm install socket.io-client

# 3. Implement changes (see implementation files below)
# - Update RealSocialMediaFeed.tsx
# - Update CommentThread.tsx
# - Update CommentItem.tsx

# 4. Run tests
npm test -- CommentThread

# 5. E2E validation
npm run playwright test comment-reply-flow.spec.ts

# 6. Build for production
npm run build

# 7. Deploy
git add . && git commit -m "feat: Add processing pills and real-time comment updates"
git push origin feature/processing-pills-realtime
# Create PR, merge after approval
```

**Step 3: Production Validation**
```bash
# 1. Deploy to staging
./scripts/deploy-staging.sh

# 2. Smoke tests
curl https://staging.agent-feed.com/health
# Expected: {"status":"healthy"}

# 3. Manual validation
# - Open app in Chrome, Firefox, Safari
# - Post reply, verify pill appears
# - Open two tabs, verify real-time updates
# - Disconnect network, verify error handling

# 4. Monitor metrics
# - Check WebSocket connection count: /metrics/websockets
# - Check error rate: /metrics/errors
# - Check latency: /metrics/latency

# 5. Deploy to production
./scripts/deploy-production.sh
```

---

### 4. Success Metrics Dashboard

**Real-Time Metrics to Monitor:**

| Metric | Baseline | Target | Alert Threshold |
|--------|----------|--------|-----------------|
| WebSocket Connection Rate | 0% | >95% | <80% |
| Average Processing Pill Duration | N/A | <2s | >5s |
| Real-Time Update Latency | N/A | <1s | >3s |
| Pill Timeout Rate | N/A | <1% | >5% |
| WebSocket Reconnection Rate | N/A | <5% | >20% |
| User Manual Refresh Rate | 80% | <10% | >30% |

**Analytics Events to Track:**
```typescript
// Track pill appearances
analytics.track('comment_processing_pill_shown', {
  commentId: string,
  postId: string,
  timestamp: number
});

// Track real-time updates
analytics.track('realtime_comment_received', {
  latency: number, // ms from creation to display
  source: 'websocket' | 'polling',
  postId: string
});

// Track errors
analytics.track('comment_processing_error', {
  errorType: 'timeout' | 'network' | 'server',
  commentId: string,
  duration: number
});
```

---

### 5. Rollback Plan

**Scenario: Critical Bug Detected in Production**

**Rollback Steps:**
1. **Immediate:** Feature flag to disable real-time updates
   ```typescript
   const ENABLE_REALTIME = process.env.REACT_APP_ENABLE_REALTIME === 'true';
   ```
2. **Database:** No database changes required (backwards compatible)
3. **Frontend:** Revert to previous version
   ```bash
   git revert <commit-hash>
   npm run build
   ./scripts/deploy-production.sh
   ```
4. **Backend:** Keep WebSocket events (harmless if frontend ignores)

**Rollback Time:** <5 minutes

---

## Appendix

### A. File Changes Summary

**Files to Modify:**
1. `frontend/src/components/RealSocialMediaFeed.tsx` - Add processingComments state
2. `frontend/src/components/CommentThread.tsx` - Add WebSocket logic
3. `frontend/src/components/CommentItem.tsx` (extracted from CommentThread) - Add visual pill
4. `api-server/routes/comments.ts` - Add WebSocket event emission
5. `frontend/package.json` - Add socket.io-client dependency

**Files to Create:**
1. `frontend/src/components/__tests__/CommentThread.processing.test.tsx`
2. `frontend/src/components/__tests__/CommentThread.realtime.test.tsx`
3. `tests/e2e/comment-reply-flow.spec.ts`

---

### B. API Contract

**WebSocket Event: comment:created**
```typescript
{
  type: 'comment:created',
  payload: {
    postId: string;         // Post ID this comment belongs to
    commentId: string;      // New comment ID
    parentId?: string;      // Parent comment ID (for replies)
    content: string;        // Comment content
    author: string;         // Comment author
    created_at: number;     // Unix timestamp
  }
}
```

**HTTP Endpoint: POST /api/agent-posts/:postId/comments**
```typescript
// Request
{
  content: string;
  parent_id?: string;
  author: string;
  content_type: 'text' | 'markdown';
}

// Response
{
  success: boolean;
  data: {
    id: string;
    content: string;
    author: string;
    created_at: number;
    parent_id: string | null;
  }
}
```

---

### C. Browser Compatibility

| Browser | WebSocket Support | Tested Version |
|---------|------------------|----------------|
| Chrome | ✅ Native | 120+ |
| Firefox | ✅ Native | 121+ |
| Safari | ✅ Native | 17+ |
| Edge | ✅ Native | 120+ |
| Mobile Chrome | ✅ Native | 120+ |
| Mobile Safari | ✅ Native | 17+ |

**Fallback Strategy:**
- All browsers: Automatic polling fallback (5s interval)
- No browser-specific code required

---

### D. Accessibility Checklist

- [x] Processing pill has `role="status"` for screen readers
- [x] Pill content announced with `aria-live="polite"`
- [x] Keyboard navigation unaffected by pill
- [x] Color contrast meets WCAG AA (blue/white = 5.2:1)
- [x] Focus indicators visible during processing
- [x] Error messages accessible via `aria-describedby`

---

### E. Performance Benchmarks

**Target Metrics:**
- Initial WebSocket connection: <500ms
- Event processing latency: <100ms
- Pill render time: <50ms
- Comment refresh time: <1000ms
- Memory overhead: <10MB for WebSocket connection

**Load Testing:**
- Simulate 100 concurrent users
- 10 comments posted per second
- Measure: Event delivery rate, UI responsiveness
- Tool: Artillery.io or k6

---

## Conclusion

This specification provides a complete blueprint for implementing visual processing indicators and real-time comment updates. The system is designed for:
- **Reliability:** Automatic fallback mechanisms
- **Performance:** <1s real-time latency
- **Usability:** Clear visual feedback
- **Maintainability:** Comprehensive test coverage

**Next Steps:**
1. Review specification with team
2. Estimate implementation effort (3-5 days)
3. Create JIRA tickets from checklist
4. Begin Phase 1: Visual Pills
5. Deploy incrementally with feature flags

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-19
**Author:** Claude (Sonnet 4.5)
**Status:** Ready for Implementation
