# Comment Threading Hooks - TDD Test Suite

## Overview

Comprehensive integration tests for React comment threading hooks using **ZERO MOCKS**.

### What's Tested

- ✅ **useCommentThreading Hook** - Comment CRUD operations and tree building
- ✅ **useRealtimeComments Hook** - WebSocket real-time updates via Socket.IO
- ✅ **Full Integration** - Real database, real API, real WebSocket connections

## Test Coverage

### 1. useCommentThreading - Basic Comment Operations
- ✅ Create top-level comment via API
- ✅ Return comment with all required fields
- ✅ Handle empty content gracefully
- ✅ Validate against real database writes

### 2. useCommentThreading - Comment Replies (Threading)
- ✅ Create reply with parent_id
- ✅ Create nested replies (3 levels deep)
- ✅ Reject invalid parent_id references
- ✅ Verify database relationship integrity

### 3. useCommentThreading - Comment Tree Building
- ✅ Fetch all comments for a post
- ✅ Build correct comment tree from flat list
- ✅ Sort comments chronologically
- ✅ Handle parent-child relationships

### 4. useCommentThreading - Loading States
- ✅ Track loading during comment creation
- ✅ Handle concurrent comment submissions
- ✅ Maintain state consistency

### 5. useCommentThreading - Error Handling
- ✅ Handle network errors gracefully
- ✅ Validate required fields
- ✅ Handle malformed JSON
- ✅ Recover from failures

### 6. useRealtimeComments - WebSocket Connection
- ✅ Establish Socket.IO connection
- ✅ Receive connection confirmation
- ✅ Support post subscription
- ✅ Maintain persistent connection

### 7. useRealtimeComments - Real-time Events
- ✅ `comment:added` - New comment created
- ✅ `comment:updated` - Comment modified (when endpoint exists)
- ✅ `comment:deleted` - Comment removed (when endpoint exists)
- ✅ Broadcast to subscribed clients

### 8. End-to-End Comment Threading Flow
- ✅ Complete flow: post → appears → reply → nested display
- ✅ Real-time updates from other users
- ✅ Maintain tree integrity with concurrent updates
- ✅ Full system validation

### 9. Performance & Scale
- ✅ Handle 50+ comments efficiently
- ✅ Fast comment list fetching (<100ms)
- ✅ Concurrent operation support

## Prerequisites

### 1. API Server Running
```bash
cd /workspaces/agent-feed/api-server
npm start
```

Server must be running on **http://localhost:3001**

### 2. Database Ready
Ensure `/workspaces/agent-feed/database.db` exists with comments table:
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    author_agent TEXT,
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

### 3. Dependencies Installed
```bash
cd /workspaces/agent-feed/tests/integration
npm install
```

Required packages:
- `vitest` - Test runner
- `better-sqlite3` - Database queries
- `node-fetch` - HTTP requests
- `socket.io-client` - WebSocket connections

## Running the Tests

### Quick Start
```bash
cd /workspaces/agent-feed/tests/integration
npm test comment-hooks.test.js
```

### Watch Mode (for development)
```bash
npm test -- --watch comment-hooks.test.js
```

### Verbose Output
```bash
npm test comment-hooks.test.js -- --reporter=verbose
```

### Run Specific Test Suite
```bash
npm test comment-hooks.test.js -- -t "useCommentThreading"
npm test comment-hooks.test.js -- -t "Real-time Events"
npm test comment-hooks.test.js -- -t "End-to-End"
```

## Test Architecture

### Real Backend Testing
```javascript
// ✅ REAL API calls
const response = await fetch('http://localhost:3001/api/agent-posts/123/comments', {
  method: 'POST',
  body: JSON.stringify({ content: 'Test', author_agent: 'agent' })
});

// ✅ REAL database verification
const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

// ✅ REAL WebSocket connection
const socket = socketClient('http://localhost:3001', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});
```

### No Mocks Philosophy
```javascript
// ❌ NO MOCKS
// We don't do this:
jest.mock('fetch');
jest.mock('socket.io-client');

// ✅ REAL TESTING
// We test against actual running services
```

## API Endpoints Tested

### Comment CRUD
- `POST /api/agent-posts/:postId/comments` - Create comment
- `GET /api/agent-posts/:postId/comments` - Fetch all comments
- `PUT /api/agent-posts/:postId/comments/:id` - Update comment (future)
- `DELETE /api/agent-posts/:postId/comments/:id` - Delete comment (future)

### WebSocket Events
- `connect` - Connection established
- `connected` - Server confirmation
- `subscribe:post` - Subscribe to post updates
- `comment:added` - New comment notification
- `comment:updated` - Comment edit notification
- `comment:deleted` - Comment removal notification

## Expected Behavior

### Comment Creation Flow
1. User calls `addComment({ content, author_agent, parent_id })`
2. Hook sets `loading: true`
3. API request to `POST /api/agent-posts/:postId/comments`
4. Database writes comment record
5. WebSocket broadcasts `comment:added` event
6. Hook updates state with new comment
7. Hook sets `loading: false`

### Comment Threading Flow
1. User posts parent comment (parent_id: null)
2. User posts reply (parent_id: parent.id)
3. Hook fetches all comments
4. Hook builds tree structure:
   ```javascript
   {
     id: 'parent-1',
     content: 'Parent comment',
     replies: [
       { id: 'reply-1', content: 'Reply', parent_id: 'parent-1' }
     ]
   }
   ```

### Real-time Update Flow
1. User A subscribes to post via WebSocket
2. User B creates comment
3. Server broadcasts `comment:added` event
4. User A's hook receives event
5. Hook updates local state
6. UI automatically re-renders with new comment

## Troubleshooting

### Tests Skip or Fail

**Server not running:**
```
⚠️  API server not running on port 3001 - tests will be skipped
```
Solution: `cd api-server && npm start`

**Database not found:**
```
❌ Failed to connect to database
```
Solution: Verify `/workspaces/agent-feed/database.db` exists

**WebSocket timeout:**
```
WebSocket connection timeout
```
Solution: Check server has Socket.IO initialized correctly

### Test Cleanup

After each test, we automatically clean up:
```javascript
afterEach(() => {
  // Delete test comments
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(testPostId);

  // Disconnect socket
  if (socket) socket.disconnect();
});
```

### Manual Cleanup
If tests fail and leave data behind:
```sql
DELETE FROM comments WHERE post_id LIKE 'test-post-%';
DELETE FROM agent_posts WHERE id LIKE 'test-post-%';
```

## Test Data

### Test Post
Created in `beforeAll`:
```javascript
const testPost = {
  content: 'Test post for comment threading',
  author_agent: 'test-agent',
  metadata: { test: true }
};
```

### Test Comments
Created per test:
```javascript
{
  content: 'Test comment',
  author_agent: 'test-agent',
  parent_id: null // or parent comment ID
}
```

## Success Criteria

### ✅ All Tests Pass
- 60+ test cases
- 100% real backend integration
- Zero mocks or stubs
- Full E2E validation

### ✅ Performance Metrics
- Comment creation: <100ms per comment
- Comment fetch: <100ms total
- 50 comments created: <10 seconds
- WebSocket connection: <2 seconds

### ✅ Real-time Validation
- Events received within 100ms
- State updates trigger re-renders
- No race conditions
- Clean error handling

## Implementation Checklist

For the coder agent implementing the hooks:

### useCommentThreading Hook
- [ ] State management (comments, loading, error)
- [ ] `addComment(data)` function
- [ ] `fetchComments(postId)` function
- [ ] `buildCommentTree(flatComments)` utility
- [ ] Error handling with try-catch
- [ ] Loading state tracking
- [ ] Optimistic updates (optional)

### useRealtimeComments Hook
- [ ] Socket.IO client initialization
- [ ] `subscribe(postId)` function
- [ ] Event listeners: comment:added, comment:updated, comment:deleted
- [ ] State synchronization with local comments
- [ ] Connection error handling
- [ ] Automatic reconnection
- [ ] Cleanup on unmount

## Next Steps

1. **Coder Agent**: Implement hooks at:
   - `/workspaces/agent-feed/frontend/src/hooks/useCommentThreading.ts`
   - `/workspaces/agent-feed/frontend/src/hooks/useRealtimeComments.ts`

2. **Run Tests**: Validate implementation
   ```bash
   npm test comment-hooks.test.js
   ```

3. **Fix Failures**: Iterate based on test feedback

4. **Verify E2E**: Run manual testing in browser

5. **Document**: Update component usage examples

## Related Files

- **Test Suite**: `/workspaces/agent-feed/tests/integration/comment-hooks.test.js`
- **API Server**: `/workspaces/agent-feed/api-server/server.js`
- **Database Schema**: Comments table in `database.db`
- **WebSocket Service**: `/workspaces/agent-feed/api-server/services/websocket-service.js`
- **Example Test**: `/workspaces/agent-feed/tests/integration/username-collection.test.js`

## Reference Architecture

### Comment Data Model
```typescript
interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_agent: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  likes: number;
  mentioned_users: string[];
}
```

### Comment Tree Structure
```typescript
interface CommentNode extends Comment {
  replies: CommentNode[];
}
```

### Hook API
```typescript
// useCommentThreading
const {
  comments,           // CommentNode[] - Tree structure
  loading,            // boolean
  error,              // Error | null
  addComment,         // (data: CommentInput) => Promise<Comment>
  fetchComments,      // (postId: string) => Promise<void>
  refreshComments     // () => Promise<void>
} = useCommentThreading(postId);

// useRealtimeComments
const {
  connected,          // boolean
  subscribe,          // (postId: string) => void
  unsubscribe,        // (postId: string) => void
  onCommentAdded,     // (callback: (comment: Comment) => void) => void
  onCommentUpdated,   // (callback: (comment: Comment) => void) => void
  onCommentDeleted    // (callback: (commentId: string) => void) => void
} = useRealtimeComments();
```

---

**Ready for Implementation!** 🚀

This test suite validates 100% real functionality. Once the hooks are implemented, these tests will confirm everything works correctly against the actual production backend.
