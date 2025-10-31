# Real-time Comment Updates - E2E Test Suite

## Overview

This test suite validates the real-time comment functionality using WebSocket (Socket.IO) connections. It ensures that comments appear immediately without page refresh and that multiple clients stay synchronized.

## Test File

**Location**: `/workspaces/agent-feed/frontend/tests/e2e/realtime-comments.spec.ts`

## Prerequisites

### 1. Backend Server Running
The backend server must be running on port 3001:

```bash
cd /workspaces/agent-feed/api-server
npm run dev
```

Verify backend is running:
- Backend API: http://localhost:3001
- Socket.IO endpoint: http://localhost:3001/socket.io/

### 2. Frontend Server Running
The frontend dev server must be running on port 5173:

```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

Verify frontend is running:
- Frontend: http://localhost:5173

### 3. Database Setup
Ensure the SQLite database has some posts with comments:

```bash
cd /workspaces/agent-feed/api-server
# Database should be at ./database.db
```

## Running Tests

### Run All Tests

```bash
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/realtime-comments.spec.ts
```

### Run Specific Test

```bash
# Test 1: Comment appears immediately
npx playwright test tests/e2e/realtime-comments.spec.ts -g "comment appears immediately"

# Test 2: Multi-client sync
npx playwright test tests/e2e/realtime-comments.spec.ts -g "multi-client sync"

# Test 3: AVI reply
npx playwright test tests/e2e/realtime-comments.spec.ts -g "AVI reply"

# Test 4: WebSocket status
npx playwright test tests/e2e/realtime-comments.spec.ts -g "WebSocket connection status"

# Test 5: Comment counter
npx playwright test tests/e2e/realtime-comments.spec.ts -g "comment counter"
```

### Run with UI Mode (Recommended)

```bash
npx playwright test tests/e2e/realtime-comments.spec.ts --ui
```

This opens Playwright's interactive UI where you can:
- Watch tests run in real-time
- Inspect each step
- View screenshots
- Debug failures

### Run in Debug Mode

```bash
npx playwright test tests/e2e/realtime-comments.spec.ts --debug
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test tests/e2e/realtime-comments.spec.ts --headed
```

## Test Coverage

### Test 1: Comment Appears Immediately Without Refresh

**Purpose**: Validates that new comments appear in the DOM within 2 seconds without requiring a page refresh.

**Steps**:
1. Navigate to http://localhost:5173
2. Wait for WebSocket connection
3. Find a post with comment form
4. Post a new comment with unique timestamp
5. Verify comment appears in DOM within 2 seconds
6. Verify URL hasn't changed (no refresh)
7. Take screenshot: `comment-immediate-appearance.png`

**Expected Result**:
- Comment visible in DOM within 2 seconds
- No page navigation/refresh occurred
- WebSocket connection active

**Screenshot Location**: `/workspaces/agent-feed/frontend/tests/screenshots/comment-immediate-appearance.png`

---

### Test 2: Multi-Client Real-time Sync

**Purpose**: Validates that comments posted in one browser context appear automatically in another context.

**Steps**:
1. Open TWO browser contexts (simulates two users)
2. Navigate both contexts to the same post
3. Wait for WebSocket connections in both contexts
4. Post comment in Context 1
5. Verify comment appears in Context 1 within 2 seconds
6. Verify comment appears in Context 2 within 10 seconds
7. Take screenshots from both contexts

**Expected Result**:
- Comment appears in both contexts
- No manual refresh required in Context 2
- WebSocket broadcast working correctly

**Screenshot Locations**:
- `/workspaces/agent-feed/frontend/tests/screenshots/multi-client-context1.png`
- `/workspaces/agent-feed/frontend/tests/screenshots/multi-client-context2.png`

---

### Test 3: AVI Reply Real-time Update

**Purpose**: Validates that replies to AVI's comments appear immediately and maintain proper threading.

**Steps**:
1. Navigate to post with AVI comments
2. Find a comment from AVI agent
3. Click "Reply" button
4. Post reply with unique timestamp
5. Verify reply appears immediately
6. Verify reply is nested under correct parent
7. Take screenshot: `avi-reply-realtime.png`

**Expected Result**:
- Reply appears within 2 seconds
- Reply is visually nested/indented under parent
- Threading structure maintained

**Screenshot Location**: `/workspaces/agent-feed/frontend/tests/screenshots/avi-reply-realtime.png`

---

### Test 4: WebSocket Connection Status

**Purpose**: Validates that console logs show proper WebSocket connection and event logging.

**Steps**:
1. Navigate to page with console logging enabled
2. Capture all console messages
3. Wait for WebSocket connection
4. Post a comment to trigger events
5. Verify console logs contain:
   - `[Socket.IO] Connected to server`
   - `[Realtime] Socket connection status: Connected`
   - `[Realtime] Comment added`
6. Check for connection errors

**Expected Result**:
- Socket connection logs present
- Comment added events logged
- No connection errors

**Console Output Example**:
```
[Socket.IO] Connected to server: abc123
[Realtime] Socket connection status: Connected
[Realtime] Setting up real-time comments for post: post-123
[Realtime] Comment added: { id: "comment-456", content: "...", ... }
```

---

### Test 5: Comment Counter Updates in Real-time

**Purpose**: Validates that the comment counter on a post increments when a new comment is added.

**Steps**:
1. Navigate to post with comment counter
2. Record initial comment count (e.g., "5 comments")
3. Post a new comment
4. Verify comment appears in DOM
5. Verify counter incremented (e.g., "6 comments")

**Expected Result**:
- Counter increments without page refresh
- Counter value matches actual number of visible comments

---

## Technical Implementation

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (React)                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  useRealtimeComments Hook                                 │ │
│  │  - Subscribes to 'comment:added' event                    │ │
│  │  - Handles real-time comment updates                      │ │
│  │  - Updates React state automatically                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           ↕                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Socket.IO Client Service                                 │ │
│  │  - Manages WebSocket connection                           │ │
│  │  - Auto-reconnect on disconnect                           │ │
│  │  - Room subscription (subscribe:post)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             ↕ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Express + Socket.IO)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Socket.IO Server                                         │ │
│  │  - Listens on http://localhost:3001/socket.io/           │ │
│  │  - Broadcasts 'comment:added' to subscribed clients      │ │
│  │  - Room-based broadcasting (post-specific)               │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Event Flow

1. **User posts comment**:
   ```typescript
   POST /api/agent-posts/:postId/comments
   { content: "Hello!", author: "user-123" }
   ```

2. **Backend creates comment and broadcasts**:
   ```typescript
   io.to(`post-${postId}`).emit('comment:added', {
     postId,
     comment: { id, content, author, ... }
   });
   ```

3. **Frontend receives event**:
   ```typescript
   socket.on('comment:added', (data) => {
     console.log('[Realtime] Comment added:', data);
     // Update React state → triggers re-render
     onCommentAdded(transformComment(data.comment));
   });
   ```

4. **Comment appears in DOM**:
   - No page refresh
   - No manual refetch
   - Instant update (< 2 seconds)

### Key Files

**Frontend**:
- `/workspaces/agent-feed/frontend/src/hooks/useRealtimeComments.ts` - React hook for real-time updates
- `/workspaces/agent-feed/frontend/src/services/socket.js` - Socket.IO client service
- `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx` - Comment UI component

**Backend**:
- `/workspaces/agent-feed/api-server/src/socket/comments.js` - Socket.IO comment events
- `/workspaces/agent-feed/api-server/src/routes/agent-posts.js` - Comment POST endpoint

## Debugging

### Check Backend Socket.IO Connection

```bash
# In backend terminal, look for:
[Socket.IO] Client connected: abc123
[Socket.IO] Client subscribed to post: post-456
```

### Check Frontend Console Logs

Open browser DevTools (F12) and look for:
```
[Socket.IO] Connected to server: abc123
[Realtime] Setting up real-time comments for post: post-456
[Realtime] Socket connection status: Connected
[Realtime] Comment added: { ... }
```

### Common Issues

#### 1. WebSocket Connection Failed

**Symptoms**:
- Console errors: `[Socket.IO] Connection error`
- Tests timeout waiting for connection

**Solutions**:
- Ensure backend is running on port 3001
- Check firewall/proxy settings
- Verify `socket.js` uses correct backend URL

#### 2. Comment Not Appearing

**Symptoms**:
- Comment posted successfully (200 OK)
- No real-time update in DOM
- Test fails with "Comment not found"

**Solutions**:
- Check console for `[Realtime] Comment added` log
- Verify WebSocket is connected: `socket.connected === true`
- Ensure `useRealtimeComments` hook is enabled
- Check post ID matches in both contexts

#### 3. Multi-Client Sync Fails

**Symptoms**:
- Comment appears in Context 1
- Comment NOT appearing in Context 2

**Solutions**:
- Verify both contexts subscribed to same post room
- Check backend broadcasts to room: `io.to('post-123').emit(...)`
- Increase timeout (network latency)

## Screenshots

All screenshots are saved to: `/workspaces/agent-feed/frontend/tests/screenshots/`

**Generated Screenshots**:
1. `comment-immediate-appearance.png` - Single-client comment appearance
2. `multi-client-context1.png` - Multi-client sync (Context 1)
3. `multi-client-context2.png` - Multi-client sync (Context 2)
4. `avi-reply-realtime.png` - AVI reply threading

## Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Or view JSON results:

```bash
cat /workspaces/agent-feed/frontend/tests/test-results/e2e-results.json
```

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Real-time Comment Tests
  run: |
    cd frontend
    npx playwright test tests/e2e/realtime-comments.spec.ts
```

## Success Criteria

All tests should pass with:
- ✓ Comment appears within 2 seconds
- ✓ No page refresh occurs
- ✓ Multi-client sync works within 10 seconds
- ✓ AVI replies maintain threading
- ✓ WebSocket connection logs present
- ✓ No connection errors

## Notes

- Tests use unique timestamps to avoid conflicts
- Tests are designed to be idempotent (can run multiple times)
- Multi-client test uses separate browser contexts (clean state)
- Screenshots help with visual debugging
- Console logging captures all relevant WebSocket events

## Support

For issues or questions:
1. Check console logs for WebSocket errors
2. Verify backend/frontend are running
3. Review screenshots in `/tests/screenshots/`
4. Run tests in `--debug` or `--headed` mode
