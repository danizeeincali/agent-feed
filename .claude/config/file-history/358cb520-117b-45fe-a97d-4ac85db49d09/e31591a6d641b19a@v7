# Plan: Fix Pills Not Showing & Comments Require Refresh

## USER REPORT (UPDATED)
- Pills STILL don't appear when posting comments
- Previous fixes applied but not working

## NEW ROOT CAUSES IDENTIFIED (Deep Investigation)

### Issue 1: V1 API Endpoint Missing emitCommentState Call (CRITICAL)
**File:** `api-server/server.js` - V1 endpoint (lines 1843-1902)

The V1 endpoint `/api/v1/agent-posts/:postId/comments` does NOT emit `comment:state:waiting`:
- Original endpoint (lines 1731-1740): HAS `websocketService.emitCommentState()` ✅
- V1 endpoint (lines 1843-1902): MISSING `emitCommentState()` ❌

If frontend uses V1 endpoint, pills will NEVER appear.

### Issue 2: Comment Must Exist in Array Before Pill Can Render
**File:** `CommentThread.tsx` - lines 242-274

The pill rendering happens INSIDE the comment loop:
```typescript
// Line 245-248
const currentState = commentStates.get(comment.id);
const isProcessing = processingComments.has(comment.id);
if (currentState || isProcessing) { /* render pill */ }
```

**Problem:** If comment is not in the `comments` array yet, the pill JSX never runs.
The comment MUST exist in `postComments[postId]` BEFORE pill can render.

### Issue 3: Race Condition - loadComments Replaces Optimistic Comment
**File:** `RealSocialMediaFeed.tsx` - lines 827-830

After optimistic update, `loadComments()` runs and may:
1. Replace `postComments[postId]` with server response
2. Server response might not include the new comment yet
3. Comment disappears from DOM → pill disappears

### Issue 4: State Not Propagating Before Render
The state updates (`setCommentStates`, `setProcessingComments`) happen but:
- React batches updates
- Comment might render before state update completes
- Pill condition fails on first render

---

## FIX STRATEGY (UPDATED)

### Fix 1: Add emitCommentState to V1 Endpoint
**File:** `api-server/server.js` - V1 endpoint (~line 1890)

Add the same pill state emission that exists in original endpoint:
```javascript
// After comment creation in V1 endpoint
if (websocketService && websocketService.emitCommentState) {
  websocketService.emitCommentState({
    commentId: createdComment.id,
    postId: postId,
    state: 'waiting'
  });
  console.log(`📢 [V1] Emitted comment:state:waiting for comment ${createdComment.id}`);
}
```

### Fix 2: Use Local State for Immediate Pill Display (Frontend Only)
**File:** `CommentThread.tsx` & `RealSocialMediaFeed.tsx`

Instead of relying on WebSocket, set state IMMEDIATELY in frontend:
```typescript
// In handleNewComment after API returns
const actualCommentId = result?.data?.id;
if (actualCommentId) {
  // Set BOTH state sources immediately
  setProcessingComments(prev => new Set(prev).add(actualCommentId));
  setCommentStates(prev => new Map(prev).set(actualCommentId, 'waiting'));
  // Add comment to array BEFORE state check
  setPostComments(prev => ({
    ...prev,
    [postId]: [...(prev[postId] || []), result.data]
  }));
}
```

### Fix 3: Don't Call loadComments on New Comment
**File:** `RealSocialMediaFeed.tsx` - handleNewComment

REMOVE the loadComments call. Let WebSocket `comment:created` event handle refresh:
```typescript
// REMOVE: await loadComments(postId, true);
// Let the optimistic update + WebSocket event handle it
```

### Fix 4: Ensure Comment Renders Before Checking Pill State
Force React to render comment first, then check pill state:
```typescript
// Use useEffect to trigger pill after comment mounts
useEffect(() => {
  if (newCommentId && processingComments.has(newCommentId)) {
    // Force re-render to show pill
  }
}, [newCommentId, processingComments]);
```

---

## IMPLEMENTATION ORDER (UPDATED)

| Priority | File | Change | Purpose |
|----------|------|--------|---------|
| 1 | `server.js:~1890` | Add `emitCommentState` to V1 endpoint | Backend sends pill trigger from V1 |
| 2 | `RealSocialMediaFeed.tsx` | Remove loadComments call in handleNewComment | Stop race condition |
| 3 | `RealSocialMediaFeed.tsx` | Ensure state set BEFORE optimistic comment add | Correct order |
| 4 | `CommentThread.tsx` | handleReply: set state immediately, don't wait for response | Instant pill |

---

## CRITICAL FILES TO MODIFY

1. `/workspaces/agent-feed/api-server/server.js` - V1 endpoint needs emitCommentState
2. `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` - remove loadComments race
3. `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx` - immediate state in handleReply

---

## TESTING CHECKLIST

- [ ] Reply to comment → pill appears immediately
- [ ] Pill shows "Waiting for agents..." (yellow)
- [ ] Comment appears without page refresh
- [ ] Pill stays visible until agent responds
- [ ] No console errors
- [ ] Both API endpoints emit waiting state
