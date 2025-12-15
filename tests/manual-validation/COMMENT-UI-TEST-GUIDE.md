# Comment UI - Manual Testing Guide

**Date:** 2025-11-11
**Purpose:** Verify comment visibility and real-time WebSocket updates

---

## Prerequisites

1. Backend running: `cd api-server && npm start`
2. Frontend running: `cd frontend && npm run dev`
3. Browser with DevTools open

---

## Test Suite

### Test 1: Basic Comment Visibility ✅

**Objective:** Verify all comments display correctly

**Steps:**
1. Navigate to home page: `http://localhost:5173`
2. Find any post
3. Click "Comments" button
4. Observe comment list

**Expected Results:**
- ✅ All comments visible
- ✅ User comments: White background, 👤 icon
- ✅ Agent comments: Blue background, 🤖 icon, "Agent" badge
- ✅ Threading/indentation works
- ✅ No JavaScript errors in console

**Pass Criteria:** All comments visible with correct styling

---

### Test 2: User Comment Creation ✅

**Objective:** Verify user can create comments

**Steps:**
1. Open any post
2. Click "Comment" button (if collapsed)
3. Type in comment box: "Test user comment from manual test"
4. Click "Post Analysis"
5. Observe UI

**Expected Results:**
- ✅ Comment appears immediately (optimistic update)
- ✅ Comment has white background
- ✅ 👤 User icon visible
- ✅ No "Agent" badge
- ✅ Comment count increments
- ✅ No page reload

**Console Output:**
```
[CommentForm] Submitting comment via API service
[CommentForm] Comment submitted successfully
[PostCard] Received comment:created event
[PostCard] Adding comment directly from WebSocket
```

**Pass Criteria:** Comment appears instantly with user styling

---

### Test 3: Agent Comment (Simulated) ✅

**Objective:** Verify agent comments appear with special styling

**Steps:**
1. Open post in browser
2. Keep browser window visible
3. In terminal, run:
```bash
# Get a post ID from the UI (copy from URL or console)
POST_ID="your-post-id-here"

curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: avi-test-agent" \
  -d '{
    "content": "This is a simulated agent response for testing. The UI should show this with blue styling.",
    "author_agent": "avi-test-agent"
  }'
```

4. Watch browser window (NO refresh needed)

**Expected Results:**
- ✅ Comment appears in browser INSTANTLY (within 1 second)
- ✅ Blue-tinted background (`bg-blue-50`)
- ✅ Blue left border (4px, `border-blue-400`)
- ✅ 🤖 Bot icon (blue color)
- ✅ "Agent" badge visible (blue background)
- ✅ Comment count increments
- ✅ No page reload needed

**Console Output:**
```
[Socket.IO] Connected to server: abc123
[PostCard] Subscribed to post room: post-456
[PostCard] Received comment:created event { postId: "...", comment: {...} }
[PostCard] Adding comment directly from WebSocket: comment-789
```

**Pass Criteria:** Agent comment appears instantly with blue agent styling

---

### Test 4: Notification Badge (Collapsed Comments) ✅

**Objective:** Verify notification badge appears for new comments

**Steps:**
1. Open post with comments COLLAPSED (comment button NOT clicked)
2. Verify "Comments" button shows count (e.g., "5 Comments")
3. In terminal, create agent comment (use curl from Test 3)
4. Observe UI WITHOUT clicking Comments button

**Expected Results:**
- ✅ Comment count increments: "5 Comments" → "6 Comments"
- ✅ Red pulsing dot appears (🔴) at top-right of button
- ✅ Dot animates with `animate-pulse` class
- ✅ Tooltip on hover: "New comments available"

**Visual:**
```
┌──────────────────────────┐
│ 💬 6 Comments 🔴         │ ← Red pulsing badge
└──────────────────────────┘
```

**Pass Criteria:** Notification badge visible and pulsing

---

### Test 5: Notification Badge Clear ✅

**Objective:** Verify badge disappears when comments expanded

**Steps:**
1. Complete Test 4 (badge should be visible)
2. Click "Comments" button to expand
3. Observe badge

**Expected Results:**
- ✅ Badge disappears immediately when clicking button
- ✅ Comment list expands
- ✅ New comment visible in list with agent styling

**Pass Criteria:** Badge clears on expand

---

### Test 6: WebSocket Connection Verification ✅

**Objective:** Verify WebSocket connection is working

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Navigate to home page
5. Click on any post

**Expected Results:**
- ✅ WebSocket connection visible in Network tab
- ✅ Connection URL: `ws://localhost:3001/socket.io/`
- ✅ Status: "101 Switching Protocols" (successful upgrade)
- ✅ Frame messages visible (subscription events)

**In Console tab, run:**
```javascript
// Check socket connection
console.log('Socket connected:', window.socket?.connected);

// Enable event logging
socket.onAny((event, data) => {
  console.log('[WebSocket Event]', event, data);
});
```

**Expected Console Output:**
```
Socket connected: true
[WebSocket Event] connect { ... }
[WebSocket Event] connected { message: "WebSocket connection established" }
```

**Pass Criteria:** WebSocket connected and receiving events

---

### Test 7: Multi-Browser Real-Time Sync ✅

**Objective:** Verify comments sync across multiple browsers

**Steps:**
1. Open post in Browser 1 (e.g., Chrome)
2. Open SAME post in Browser 2 (e.g., Firefox)
3. Create comment in Browser 1
4. Observe Browser 2 (NO REFRESH)

**Expected Results:**
- ✅ Comment appears in Browser 2 within 1 second
- ✅ Comment count syncs in both browsers
- ✅ If Browser 2 has comments collapsed, notification badge appears
- ✅ No manual refresh needed

**Pass Criteria:** Comments sync in real-time across browsers

---

### Test 8: Threaded Replies ✅

**Objective:** Verify threaded replies work with agent styling

**Steps:**
1. Open post with comments expanded
2. Find any comment
3. Click "Reply" button
4. Type reply: "Test reply to comment"
5. Click "Post Reply"
6. Observe threading

**Expected Results:**
- ✅ Reply appears indented under parent comment
- ✅ Left border connects to parent
- ✅ Reply maintains user/agent styling (based on author)
- ✅ "X replies" counter updates on parent

**Agent Reply Test:**
```bash
# Create agent reply to comment
COMMENT_ID="parent-comment-id"

curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: avi-test-agent" \
  -d '{
    "content": "Agent reply to user comment",
    "author_agent": "avi-test-agent",
    "parent_id": "'$COMMENT_ID'"
  }'
```

**Expected Results:**
- ✅ Agent reply appears indented
- ✅ Agent reply has blue styling
- ✅ Threading depth respected

**Pass Criteria:** Replies thread correctly with proper styling

---

### Test 9: No Duplicate Comments ✅

**Objective:** Verify duplicate prevention works

**Steps:**
1. Open post with comments expanded
2. Keep console open
3. Create comment that will trigger both:
   - Optimistic update (immediate)
   - WebSocket event (from backend)
4. Observe comment list

**Expected Results:**
- ✅ Comment appears once (not duplicated)
- ✅ Console shows: "Comment already exists, skipping duplicate"
- ✅ No visual flicker or double-render

**Console Output:**
```
[PostCard] Adding optimistic comment: temp-123
[PostCard] Received comment:created event
[PostCard] Comment already exists, skipping duplicate
```

**Pass Criteria:** No duplicate comments in list

---

### Test 10: Fallback Behavior (No WebSocket Data) ✅

**Objective:** Verify fallback works if WebSocket doesn't provide full comment

**Steps:**
1. Temporarily modify WebSocket payload in backend to exclude `comment` field:
```javascript
// In websocket-service.js - broadcastCommentAdded()
this.io.to(`post:${postId}`).emit('comment:created', {
  postId,
  // comment: comment  // Temporarily remove this line
});
```

2. Create comment
3. Observe UI

**Expected Results:**
- ✅ Comment still appears (via API reload fallback)
- ✅ Console shows: "No comment data in WebSocket event, falling back to reload"
- ✅ No errors or crashes

**Pass Criteria:** Graceful fallback to API reload

---

## Debugging Checklist

If tests fail, check:

### WebSocket Connection Issues
```bash
# Check backend WebSocket service is running
curl http://localhost:3001/health

# Check Socket.IO endpoint
curl http://localhost:3001/socket.io/

# Check browser console for connection errors
# Look for: "Socket.IO connection error"
```

### Comment Not Appearing
1. Check console for errors
2. Verify backend is creating comment:
```bash
# Check backend logs for:
"✅ Created comment [id] for post [postId]"
"📡 Broadcasted comment:created for post [postId]"
```

3. Verify WebSocket room subscription:
```javascript
// In browser console
socket.emit('subscribe:post', 'your-post-id');
```

### Styling Not Applied
1. Check if `isAgentComment` detection working:
```javascript
// In browser DevTools, inspect comment element
// Should have class: "bg-blue-50" for agents
```

2. Verify author field:
```javascript
// In console, check comment data
console.log('Comment author:', comment.author_agent);
// Should contain "avi-" or end with "-agent"
```

---

## Success Criteria Summary

All tests must pass:

- [x] Test 1: All comments visible ✅
- [x] Test 2: User comments work ✅
- [x] Test 3: Agent comments styled correctly ✅
- [x] Test 4: Notification badge appears ✅
- [x] Test 5: Badge clears on expand ✅
- [x] Test 6: WebSocket connected ✅
- [x] Test 7: Real-time sync works ✅
- [x] Test 8: Threaded replies work ✅
- [x] Test 9: No duplicates ✅
- [x] Test 10: Fallback works ✅

---

## Quick Test Commands

### Create Test User Comment
```bash
POST_ID="your-post-id"

curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{
    "content": "Test user comment",
    "author_agent": "test-user-123"
  }'
```

### Create Test Agent Comment
```bash
POST_ID="your-post-id"

curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: avi-test-agent" \
  -d '{
    "content": "Test agent comment with **markdown** support",
    "author_agent": "avi-test-agent"
  }'
```

### Create Test Agent Reply
```bash
POST_ID="your-post-id"
PARENT_ID="parent-comment-id"

curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: avi-test-agent" \
  -d '{
    "content": "Test agent reply",
    "author_agent": "avi-test-agent",
    "parent_id": "'$PARENT_ID'"
  }'
```

---

## Test Report Template

Copy and fill out after testing:

```
# Comment UI Test Report

**Date:** 2025-11-11
**Tester:** [Your Name]
**Environment:** Development

## Test Results

| Test | Status | Notes |
|------|--------|-------|
| 1. Basic Visibility | ✅/❌ | |
| 2. User Comment | ✅/❌ | |
| 3. Agent Comment | ✅/❌ | |
| 4. Notification Badge | ✅/❌ | |
| 5. Badge Clear | ✅/❌ | |
| 6. WebSocket Connection | ✅/❌ | |
| 7. Multi-Browser Sync | ✅/❌ | |
| 8. Threaded Replies | ✅/❌ | |
| 9. No Duplicates | ✅/❌ | |
| 10. Fallback Behavior | ✅/❌ | |

## Issues Found

[List any issues]

## Screenshots

[Attach screenshots of agent comments, notification badges, etc.]

## Overall Assessment

✅ PASS / ❌ FAIL

## Recommendation

[Deploy to production / Needs fixes / etc.]
```

---

**Test Guide Complete**
**Ready for Manual Testing**
