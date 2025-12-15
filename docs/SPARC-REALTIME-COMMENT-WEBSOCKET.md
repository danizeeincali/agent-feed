# SPARC Specification: Real-Time Comment WebSocket Broadcasts

**Version**: 1.0.0
**Date**: 2025-10-28
**Status**: Specification Complete
**Priority**: High

---

## Executive Summary

This SPARC document specifies the implementation of real-time comment updates via WebSocket broadcasts. Currently, when comments are created, the backend successfully persists them to the database and creates work queue tickets, but fails to broadcast WebSocket events. This causes the frontend `useRealtimeComments` hook to never receive `comment:added` events, requiring manual page refreshes to see new comments.

**Problem**: Comments are created but WebSocket `comment:added` events are never emitted.
**Solution**: Integrate `websocketService.broadcastCommentAdded()` calls after successful comment creation in two endpoints.
**Impact**: Users will see new comments appear instantly without page refreshes.

---

## Phase 1: SPECIFICATION

### 1.1 Requirements

#### Functional Requirements

**FR-1: WebSocket Broadcast on Comment Creation**
- **Description**: After successfully creating a comment in the database, the system MUST broadcast a `comment:added` WebSocket event to all clients subscribed to the parent post.
- **Acceptance Criteria**:
  - Event emitted only after `dbSelector.createComment()` succeeds
  - Event contains all required payload fields (see FR-2)
  - Event broadcast occurs before work queue ticket creation
  - Broadcast failure does not cause HTTP request failure

**FR-2: Event Payload Structure**
- **Description**: The `comment:added` event MUST contain standardized payload data.
- **Required Fields**:
  ```javascript
  {
    postId: string,           // Parent post ID
    commentId: string,        // Newly created comment ID
    parentCommentId: string|null, // Parent comment ID (null for top-level)
    author: string,           // Comment author (agent or user identifier)
    content: string,          // Comment text content
    timestamp: string         // ISO 8601 timestamp (handled by service)
  }
  ```
- **Acceptance Criteria**:
  - All required fields present in payload
  - `parentCommentId` correctly set to `null` for top-level comments
  - `author` field uses `createdComment.author_agent` or equivalent
  - Payload matches frontend `useRealtimeComments` expectations

**FR-3: Dual Endpoint Integration**
- **Description**: WebSocket broadcasts MUST be integrated into both comment creation endpoints.
- **Endpoints**:
  1. `/api/posts/:postId/comments` (primary endpoint, ~line 1626)
  2. `/api/v1/posts/:postId/comments` (legacy V1 endpoint, ~line 1764)
- **Acceptance Criteria**:
  - Both endpoints emit identical `comment:added` events
  - Implementation consistent across endpoints
  - No code duplication (helper function recommended)

**FR-4: Error Handling**
- **Description**: WebSocket broadcast failures MUST NOT cause HTTP request failures.
- **Acceptance Criteria**:
  - Broadcast wrapped in try-catch block
  - Errors logged but not propagated
  - HTTP 201 response returned even if broadcast fails
  - User experience unaffected by WebSocket issues

#### Non-Functional Requirements

**NFR-1: Performance**
- WebSocket broadcast adds <10ms latency to comment creation
- No blocking operations on main request thread
- Broadcast is fire-and-forget (async)

**NFR-2: Reliability**
- Comment persisted to database before broadcast attempt
- Broadcast failure does not rollback database transaction
- System remains functional if WebSocket service unavailable

**NFR-3: Observability**
- Log successful broadcasts with post and comment IDs
- Log broadcast failures with error details
- Distinguish between service unavailable vs. broadcast errors

**NFR-4: Backward Compatibility**
- Existing API contract unchanged
- HTTP response format identical
- System works with or without WebSocket connections

### 1.2 Constraints

**C-1: Existing Infrastructure**
- `websocketService` already initialized in server.js
- `broadcastCommentAdded()` method already implemented
- Cannot modify `websocketService` interface

**C-2: Code Location**
- Modifications limited to server.js lines ~1626 and ~1764
- No changes to database layer or WebSocket service
- Maintain existing error handling patterns

**C-3: Testing Requirements**
- Must not break existing comment creation tests
- WebSocket tests should mock `websocketService`
- Integration tests verify end-to-end flow

### 1.3 Edge Cases

**EC-1: WebSocket Service Not Initialized**
- **Scenario**: Server started without WebSocket initialization
- **Handling**: `broadcastCommentAdded()` returns early with warning log
- **Impact**: Comment creation succeeds, no real-time update

**EC-2: No Active Subscribers**
- **Scenario**: No clients subscribed to `post:{postId}` room
- **Handling**: Event emitted to empty room (no-op)
- **Impact**: No errors, system continues normally

**EC-3: Malformed Comment Data**
- **Scenario**: `createdComment` missing required fields
- **Handling**: Extract available fields, log warning if incomplete
- **Impact**: Partial payload broadcasted, client handles gracefully

**EC-4: Concurrent Comment Creation**
- **Scenario**: Multiple comments created simultaneously for same post
- **Handling**: Each broadcast is independent, order preserved by Socket.IO
- **Impact**: Multiple `comment:added` events received by clients

**EC-5: Database Success, Broadcast Failure**
- **Scenario**: Comment persisted but WebSocket broadcast throws error
- **Handling**: Error caught, logged, HTTP 201 still returned
- **Impact**: Comment visible on refresh, no real-time update

### 1.4 Success Metrics

**SM-1: Functional Correctness**
- 100% of comments trigger `comment:added` events (when WebSocket active)
- 0% of HTTP requests fail due to broadcast errors
- 100% of events contain valid payload structure

**SM-2: Performance**
- WebSocket broadcast latency <10ms (p95)
- Total comment creation latency increase <5%
- No increase in request failure rate

**SM-3: User Experience**
- Comments appear in UI within 100ms of creation
- No manual refresh required for new comments
- Real-time updates work across browser tabs

### 1.5 Dependencies

**D-1: Existing Services**
- `websocketService` (initialized in server.js)
- `dbSelector` (database abstraction layer)
- `workQueueSelector` (ticket creation)

**D-2: Frontend Integration**
- `useRealtimeComments` hook (already listening for `comment:added`)
- Socket.IO client connection
- Post-specific room subscription

**D-3: Data Flow**
```
HTTP Request → Route Handler → dbSelector.createComment()
                                      ↓
                               [SUCCESS: createdComment]
                                      ↓
                          websocketService.broadcastCommentAdded()
                                      ↓
                               Socket.IO Emit
                                      ↓
                          All clients in post:{postId} room
                                      ↓
                     Frontend useRealtimeComments handler
                                      ↓
                          UI updates with new comment
```

---

## Phase 2: PSEUDOCODE

### 2.1 Core Algorithm

#### High-Level Flow
```
FUNCTION handleCommentCreation(requestData):
  // Existing flow
  1. Validate request data
  2. Extract user ID and comment data
  3. CREATE comment in database → createdComment
  4. LOG success message

  // NEW: WebSocket broadcast
  5. TRY:
       IF websocketService is initialized:
         EXTRACT payload from createdComment:
           - postId from request params
           - commentId from createdComment.id
           - parentCommentId from createdComment.parent_id
           - author from createdComment.author_agent
           - content from createdComment.content

         CALL websocketService.broadcastCommentAdded(payload)
         LOG broadcast success
       ELSE:
         LOG warning: WebSocket not initialized
     CATCH error:
       LOG error: Broadcast failed but continue
       DO NOT throw or propagate error

  // Existing flow continues
  6. CREATE work queue ticket (if not skipped)
  7. RETURN HTTP 201 with comment data
END FUNCTION
```

#### Detailed Pseudocode

```javascript
// After line 1625 and 1763 in server.js

FUNCTION broadcastCommentAddedEvent(createdComment, postId):
  /**
   * Broadcast comment:added event via WebSocket
   * @param {Object} createdComment - Database comment object
   * @param {String} postId - Parent post identifier
   * @returns {void}
   */

  // Step 1: Check service availability
  IF websocketService is null OR websocketService is undefined:
    LOG warning: "WebSocket service not available for broadcast"
    RETURN early  // Silent failure
  END IF

  // Step 2: Wrap in try-catch for safety
  TRY:
    // Step 3: Extract payload data
    SET payload = {
      postId: postId,                                    // From route param
      commentId: createdComment.id,                      // From DB result
      parentCommentId: createdComment.parent_id OR null, // Null for top-level
      author: createdComment.author_agent,               // Agent identifier
      content: createdComment.content                    // Comment text
    }

    // Step 4: Validate required fields (defensive)
    IF payload.commentId is missing:
      LOG error: "Missing commentId in broadcast payload"
      RETURN early
    END IF

    IF payload.author is missing:
      LOG warning: "Missing author in broadcast payload, using 'unknown'"
      SET payload.author = 'unknown'
    END IF

    // Step 5: Invoke broadcast method
    CALL websocketService.broadcastCommentAdded(payload)

    // Step 6: Log success for observability
    LOG info: `📡 Broadcasted comment:added for post ${postId}, comment ${payload.commentId}`

  CATCH broadcastError:
    // Step 7: Handle errors gracefully
    LOG error: `❌ Failed to broadcast comment:added for post ${postId}: ${broadcastError.message}`
    LOG error stack: broadcastError.stack

    // DO NOT rethrow - let comment creation succeed

  END TRY
END FUNCTION

// Integration point in main route handler
FUNCTION POST_/api/posts/:postId/comments:
  // ... existing validation and comment creation ...

  const createdComment = await dbSelector.createComment(userId, commentData)
  console.log(`✅ Created comment ${createdComment.id} for post ${postId}`)

  // NEW: Broadcast WebSocket event
  broadcastCommentAddedEvent(createdComment, postId)

  // ... existing ticket creation and response ...
END FUNCTION
```

### 2.2 Data Transformation

#### Input Data Structure
```javascript
// createdComment object from dbSelector.createComment()
{
  id: "550e8400-e29b-41d4-a716-446655440000",      // UUID
  post_id: "123e4567-e89b-12d3-a456-426614174000", // Parent post
  parent_id: null,                                  // Parent comment (null=top-level)
  content: "This is a new comment",
  author_agent: "test-agent-1",
  created_at: "2025-10-28T10:30:00.000Z",
  updated_at: "2025-10-28T10:30:00.000Z",
  depth: 0,
  reactions: []
}
```

#### Output Payload Structure
```javascript
// Payload passed to websocketService.broadcastCommentAdded()
{
  postId: "123e4567-e89b-12d3-a456-426614174000",  // From route param
  commentId: "550e8400-e29b-41d4-a716-446655440000", // From createdComment.id
  parentCommentId: null,                            // From createdComment.parent_id
  author: "test-agent-1",                           // From createdComment.author_agent
  content: "This is a new comment"                  // From createdComment.content
}
```

#### Emitted WebSocket Event
```javascript
// Event emitted by websocketService to Socket.IO
{
  postId: "123e4567-e89b-12d3-a456-426614174000",
  commentId: "550e8400-e29b-41d4-a716-446655440000",
  parentCommentId: null,
  author: "test-agent-1",
  content: "This is a new comment",
  timestamp: "2025-10-28T10:30:15.234Z"  // Added by websocketService
}
```

### 2.3 Error Handling Strategy

```
ERROR HANDLING DECISION TREE:

websocketService exists?
├─ NO  → Log warning, continue (silent failure)
└─ YES → Proceed to broadcast
         ├─ Broadcast throws error?
         │  ├─ YES → Catch, log error, continue
         │  └─ NO  → Log success, continue
         └─ Always return HTTP 201 to client

NEVER propagate errors up to route handler
NEVER fail HTTP request due to broadcast issues
ALWAYS log for debugging and monitoring
```

---

## Phase 3: ARCHITECTURE

### 3.1 System Context

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Client                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useRealtimeComments Hook                            │   │
│  │  - Subscribes to post:{postId}                       │   │
│  │  - Listens for 'comment:added' events               │   │
│  │  - Updates UI state on event receipt                │   │
│  └────────────────────────┬─────────────────────────────┘   │
└────────────────────────────┼──────────────────────────────────┘
                             │ Socket.IO Connection
                             │ (WebSocket / Long-polling)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API Server                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express Route Handlers                              │   │
│  │  - POST /api/posts/:postId/comments                  │   │
│  │  - POST /api/v1/posts/:postId/comments               │   │
│  └────────┬───────────────────────────────────┬─────────┘   │
│           │                                    │              │
│           ▼                                    ▼              │
│  ┌────────────────────┐            ┌────────────────────┐   │
│  │  Database Selector │            │  WebSocket Service │   │
│  │  - createComment() │            │  - broadcastCommentAdded() │
│  └────────┬───────────┘            └──────────┬─────────┘   │
│           │                                    │              │
│           ▼                                    ▼              │
│  ┌────────────────────┐            ┌────────────────────┐   │
│  │  PostgreSQL/SQLite │            │  Socket.IO Server  │   │
│  │  - comments table  │            │  - Room: post:{id} │   │
│  └────────────────────┘            └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Integration

#### Modified Component: Route Handler
```javascript
// File: /workspaces/agent-feed/api-server/server.js
// Lines: ~1626 and ~1764

// BEFORE (existing code)
const createdComment = await dbSelector.createComment(userId, commentData);
console.log(`✅ Created comment ${createdComment.id} for post ${postId}`);

// Create work queue ticket...

// AFTER (with WebSocket broadcast)
const createdComment = await dbSelector.createComment(userId, commentData);
console.log(`✅ Created comment ${createdComment.id} for post ${postId}`);

// NEW: Broadcast WebSocket event
try {
  if (websocketService && websocketService.initialized) {
    websocketService.broadcastCommentAdded({
      postId,
      commentId: createdComment.id,
      parentCommentId: createdComment.parent_id || null,
      author: createdComment.author_agent,
      content: createdComment.content
    });
    console.log(`📡 Broadcasted comment:added for post ${postId}`);
  }
} catch (broadcastError) {
  console.error(`❌ WebSocket broadcast failed:`, broadcastError);
  // Continue - don't fail request
}

// Create work queue ticket...
```

#### Unchanged Component: WebSocket Service
```javascript
// File: /workspaces/agent-feed/api-server/services/websocket-service.js
// Lines: 200-218

// This method already exists and handles the broadcast
broadcastCommentAdded(payload) {
  if (!this.io || !this.initialized) {
    console.warn('WebSocket not initialized');
    return;
  }

  const { postId, commentId, parentCommentId, author, content } = payload;

  // Broadcast to all clients subscribed to this post
  this.io.to(`post:${postId}`).emit('comment:added', {
    postId,
    commentId,
    parentCommentId,
    author,
    content,
    timestamp: new Date().toISOString()
  });

  console.log(`📡 Broadcasted comment:added for post ${postId}`);
}
```

#### Unchanged Component: Frontend Hook
```javascript
// File: /workspaces/agent-feed/frontend/src/hooks/useRealtimeComments.ts
// Line: 251

// Already listening for the event
socket.on('comment:added', handleCommentAdded);

// handleCommentAdded will process the event and update UI state
```

### 3.3 Sequence Diagram

```
Client          Route Handler    DatabaseSelector  WebSocketService  Socket.IO    Frontend
  │                   │                  │                 │              │           │
  │ POST /api/posts/  │                  │                 │              │           │
  │ :postId/comments  │                  │                 │              │           │
  ├──────────────────>│                  │                 │              │           │
  │                   │                  │                 │              │           │
  │                   │ createComment()  │                 │              │           │
  │                   ├─────────────────>│                 │              │           │
  │                   │                  │                 │              │           │
  │                   │   [DB Write]     │                 │              │           │
  │                   │                  │                 │              │           │
  │                   │ createdComment   │                 │              │           │
  │                   │<─────────────────┤                 │              │           │
  │                   │                  │                 │              │           │
  │                   │ broadcastCommentAdded(payload)     │              │           │
  │                   ├──────────────────┼────────────────>│              │           │
  │                   │                  │                 │              │           │
  │                   │                  │                 │ emit('comment:added')    │
  │                   │                  │                 ├─────────────>│           │
  │                   │                  │                 │              │           │
  │                   │                  │                 │              │ event     │
  │                   │                  │                 │              ├──────────>│
  │                   │                  │                 │              │           │
  │                   │                  │                 │              │ [UI Update]
  │                   │                  │                 │              │           │
  │                   │ [Create Ticket]  │                 │              │           │
  │                   │                  │                 │              │           │
  │  HTTP 201         │                  │                 │              │           │
  │<──────────────────┤                  │                 │              │           │
  │                   │                  │                 │              │           │
```

### 3.4 Data Flow

```
┌───────────────────────────────────────────────────────────────┐
│ Step 1: HTTP Request                                          │
│  POST /api/posts/abc123/comments                              │
│  Body: { content: "Hello", author_agent: "test-agent" }       │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 2: Database Persistence                                  │
│  dbSelector.createComment(userId, commentData)                │
│  Returns: { id: "xyz789", post_id: "abc123", ... }            │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 3: Payload Construction (NEW)                            │
│  Extract: postId, commentId, parentCommentId, author, content │
│  Validate: Required fields present                            │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 4: WebSocket Broadcast (NEW)                             │
│  websocketService.broadcastCommentAdded(payload)              │
│  Emit to room: post:abc123                                    │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 5: Ticket Creation (Existing)                            │
│  workQueueSelector.createTicket(...)                          │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 6: HTTP Response                                         │
│  201 Created                                                  │
│  { success: true, data: createdComment, ticket: {...} }       │
└───────────────────────────────────────────────────────────────┘
```

### 3.5 Error Propagation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Handling Layers                     │
└─────────────────────────────────────────────────────────────┘

Layer 1: Database Errors (Existing Behavior)
┌───────────────────────────────────────────────────────────┐
│  dbSelector.createComment() throws                         │
│  → Propagates to route handler                             │
│  → Returns HTTP 500 to client                              │
│  → Comment NOT created                                     │
│  → WebSocket broadcast NEVER attempted                     │
└───────────────────────────────────────────────────────────┘

Layer 2: WebSocket Broadcast Errors (NEW Behavior)
┌───────────────────────────────────────────────────────────┐
│  websocketService.broadcastCommentAdded() throws           │
│  → Caught by try-catch in route handler                    │
│  → Error logged for monitoring                             │
│  → HTTP 201 STILL returned to client                       │
│  → Comment persisted successfully                          │
│  → Ticket creation continues normally                      │
└───────────────────────────────────────────────────────────┘

Layer 3: Ticket Creation Errors (Existing Behavior)
┌───────────────────────────────────────────────────────────┐
│  workQueueSelector.createTicket() throws                   │
│  → Caught by existing try-catch                            │
│  → Error logged but not propagated                         │
│  → HTTP 201 returned with ticket: null                     │
│  → Comment and WebSocket broadcast succeeded               │
└───────────────────────────────────────────────────────────┘

Key Principle: WebSocket failures are non-critical
- Comment persistence is the critical path
- WebSocket is best-effort enhancement
- User can always refresh to see comment
```

### 3.6 Integration Points

#### Point A: Endpoint 1 (Primary API)
```
File: /workspaces/agent-feed/api-server/server.js
Line: 1626 (after comment creation, before ticket creation)
Context: POST /api/posts/:postId/comments
```

#### Point B: Endpoint 2 (Legacy V1 API)
```
File: /workspaces/agent-feed/api-server/server.js
Line: 1764 (after comment creation, before ticket creation)
Context: POST /api/v1/posts/:postId/comments
```

#### Point C: WebSocket Service (Unchanged)
```
File: /workspaces/agent-feed/api-server/services/websocket-service.js
Line: 200-218
Method: broadcastCommentAdded(payload)
```

#### Point D: Frontend Hook (Unchanged)
```
File: /workspaces/agent-feed/frontend/src/hooks/useRealtimeComments.ts
Line: 251
Listener: socket.on('comment:added', handleCommentAdded)
```

### 3.7 Configuration and Dependencies

#### Environment Variables
```bash
# No new environment variables required
# Existing WebSocket configuration applies

# Relevant existing variables:
CORS_ORIGIN=*                    # For Socket.IO CORS
WEBSOCKET_PING_TIMEOUT=60000     # Socket.IO ping timeout
WEBSOCKET_PING_INTERVAL=25000    # Socket.IO ping interval
```

#### Service Initialization
```javascript
// server.js (existing initialization)

// WebSocket service must be initialized before route handlers
const websocketService = new WebSocketService();
websocketService.initialize(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

// Route handlers can now safely reference websocketService
```

#### Dependency Injection
```javascript
// No dependency injection changes required
// websocketService is module-scoped in server.js
// Available to all route handlers in same file
```

---

## Phase 4: REFINEMENT

### 4.1 Test-Driven Development Plan

#### Unit Tests

**Test Suite 1: Broadcast Function (server.test.js)**
```javascript
describe('WebSocket Comment Broadcasts', () => {
  let mockWebSocketService;
  let mockDbSelector;

  beforeEach(() => {
    mockWebSocketService = {
      initialized: true,
      broadcastCommentAdded: jest.fn()
    };
    mockDbSelector = {
      createComment: jest.fn()
    };
  });

  test('should broadcast comment:added after successful creation', async () => {
    // Arrange
    const createdComment = {
      id: 'comment-123',
      post_id: 'post-456',
      parent_id: null,
      content: 'Test comment',
      author_agent: 'test-agent'
    };
    mockDbSelector.createComment.mockResolvedValue(createdComment);

    // Act
    const response = await request(app)
      .post('/api/posts/post-456/comments')
      .send({ content: 'Test comment', author_agent: 'test-agent' });

    // Assert
    expect(response.status).toBe(201);
    expect(mockWebSocketService.broadcastCommentAdded).toHaveBeenCalledWith({
      postId: 'post-456',
      commentId: 'comment-123',
      parentCommentId: null,
      author: 'test-agent',
      content: 'Test comment'
    });
  });

  test('should not fail request if broadcast throws error', async () => {
    // Arrange
    mockWebSocketService.broadcastCommentAdded.mockImplementation(() => {
      throw new Error('WebSocket error');
    });
    mockDbSelector.createComment.mockResolvedValue({
      id: 'comment-123',
      post_id: 'post-456',
      content: 'Test'
    });

    // Act
    const response = await request(app)
      .post('/api/posts/post-456/comments')
      .send({ content: 'Test' });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('should handle missing websocketService gracefully', async () => {
    // Arrange
    mockWebSocketService = null; // Service not initialized

    // Act
    const response = await request(app)
      .post('/api/posts/post-456/comments')
      .send({ content: 'Test' });

    // Assert
    expect(response.status).toBe(201);
    // No error thrown
  });

  test('should broadcast for both primary and V1 endpoints', async () => {
    // Test endpoint 1
    await request(app).post('/api/posts/post-456/comments')
      .send({ content: 'Test 1' });
    expect(mockWebSocketService.broadcastCommentAdded).toHaveBeenCalledTimes(1);

    // Test endpoint 2
    await request(app).post('/api/v1/posts/post-456/comments')
      .send({ content: 'Test 2' });
    expect(mockWebSocketService.broadcastCommentAdded).toHaveBeenCalledTimes(2);
  });

  test('should correctly map parentCommentId for nested comments', async () => {
    // Arrange
    const nestedComment = {
      id: 'comment-child',
      parent_id: 'comment-parent',
      content: 'Reply'
    };
    mockDbSelector.createComment.mockResolvedValue(nestedComment);

    // Act
    await request(app).post('/api/posts/post-456/comments')
      .send({ content: 'Reply', parent_id: 'comment-parent' });

    // Assert
    expect(mockWebSocketService.broadcastCommentAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        parentCommentId: 'comment-parent'
      })
    );
  });
});
```

**Test Suite 2: Integration Tests (integration.test.js)**
```javascript
describe('End-to-End Comment Creation with WebSocket', () => {
  let socketClient;
  let httpServer;

  beforeAll(() => {
    // Start server with WebSocket
    httpServer = startTestServer();
    socketClient = io(`http://localhost:${TEST_PORT}`);
  });

  afterAll(() => {
    socketClient.disconnect();
    httpServer.close();
  });

  test('should receive comment:added event after POST request', (done) => {
    const postId = 'test-post-123';

    // Subscribe to post room
    socketClient.emit('subscribe:post', { postId });

    // Listen for comment:added event
    socketClient.on('comment:added', (event) => {
      expect(event.postId).toBe(postId);
      expect(event.commentId).toBeDefined();
      expect(event.content).toBe('Integration test comment');
      expect(event.timestamp).toBeDefined();
      done();
    });

    // Create comment via HTTP
    request(app)
      .post(`/api/posts/${postId}/comments`)
      .send({ content: 'Integration test comment' })
      .expect(201)
      .end((err) => {
        if (err) done(err);
      });
  });

  test('should broadcast to multiple connected clients', (done) => {
    const client1 = io(`http://localhost:${TEST_PORT}`);
    const client2 = io(`http://localhost:${TEST_PORT}`);
    let receivedCount = 0;

    const checkDone = () => {
      receivedCount++;
      if (receivedCount === 2) {
        client1.disconnect();
        client2.disconnect();
        done();
      }
    };

    client1.emit('subscribe:post', { postId: 'post-123' });
    client2.emit('subscribe:post', { postId: 'post-123' });

    client1.on('comment:added', checkDone);
    client2.on('comment:added', checkDone);

    request(app)
      .post('/api/posts/post-123/comments')
      .send({ content: 'Broadcast test' })
      .expect(201)
      .end();
  });
});
```

#### Test Coverage Goals
- **Unit Tests**: 100% coverage of broadcast logic
- **Integration Tests**: End-to-end flow verification
- **Error Cases**: All error paths tested
- **Edge Cases**: Service unavailable, malformed data, concurrent requests

### 4.2 Code Quality Improvements

#### Refactoring Opportunity: Extract Helper Function
```javascript
// Before: Duplicated code in two endpoints
// After: Shared helper function

/**
 * Broadcast comment:added event via WebSocket
 * @param {Object} createdComment - Comment from database
 * @param {string} postId - Parent post ID
 * @returns {void}
 */
function broadcastCommentCreated(createdComment, postId) {
  try {
    if (!websocketService || !websocketService.initialized) {
      console.warn('⚠️  WebSocket service not available for broadcast');
      return;
    }

    const payload = {
      postId,
      commentId: createdComment.id,
      parentCommentId: createdComment.parent_id || null,
      author: createdComment.author_agent || 'anonymous',
      content: createdComment.content
    };

    // Validate critical fields
    if (!payload.commentId) {
      console.error('❌ Cannot broadcast comment without ID');
      return;
    }

    websocketService.broadcastCommentAdded(payload);
    console.log(`📡 Broadcasted comment:added for post ${postId}, comment ${payload.commentId}`);

  } catch (error) {
    console.error(`❌ WebSocket broadcast failed for post ${postId}:`, error.message);
    // Error logged but not propagated
  }
}

// Usage in both endpoints:
const createdComment = await dbSelector.createComment(userId, commentData);
broadcastCommentCreated(createdComment, postId);
```

#### Logging Standards
```javascript
// Success logs
console.log(`📡 Broadcasted comment:added for post ${postId}, comment ${commentId}`);

// Warning logs
console.warn('⚠️  WebSocket service not available for broadcast');

// Error logs
console.error(`❌ WebSocket broadcast failed for post ${postId}:`, error.message);
console.error('Stack trace:', error.stack); // Include in non-production
```

#### Performance Optimization
```javascript
// Check service availability once at startup
let websocketAvailable = false;
if (websocketService && websocketService.initialized) {
  websocketAvailable = true;
  console.log('✅ WebSocket service ready for broadcasts');
}

// Skip checks in hot path if service never initialized
function broadcastCommentCreated(createdComment, postId) {
  if (!websocketAvailable) return; // Fast exit

  try {
    // Broadcast logic...
  } catch (error) {
    // Error handling...
  }
}
```

### 4.3 Iteration Plan

**Iteration 1: Basic Implementation**
- Implement broadcast in endpoint 1 (line 1626)
- Write unit tests for basic success case
- Manual testing with frontend
- **Goal**: Verify end-to-end flow works

**Iteration 2: Error Handling**
- Add try-catch blocks
- Test error scenarios
- Verify request never fails
- **Goal**: Robust error handling

**Iteration 3: Dual Endpoint**
- Implement broadcast in endpoint 2 (line 1764)
- Verify both endpoints behave identically
- Cross-endpoint testing
- **Goal**: Feature parity

**Iteration 4: Refactoring**
- Extract helper function
- Remove code duplication
- Improve logging
- **Goal**: Clean, maintainable code

**Iteration 5: Integration Testing**
- End-to-end tests with Socket.IO client
- Multi-client broadcast tests
- Performance benchmarks
- **Goal**: Production readiness

### 4.4 Performance Considerations

**Latency Analysis**
```
Before (no WebSocket broadcast):
  HTTP Request → DB Write → Ticket Creation → HTTP Response
  Total: ~50ms (p95)

After (with WebSocket broadcast):
  HTTP Request → DB Write → WebSocket Broadcast → Ticket Creation → HTTP Response
  Total: ~52ms (p95)

  WebSocket Broadcast breakdown:
  - Payload construction: <1ms
  - Socket.IO emit: 1-3ms
  - Network transmission: 0ms (async, fire-and-forget)

  Added latency: ~2ms (4% increase)
```

**Throughput Impact**
```
Concurrent comment creation load:
  - WebSocket broadcast is non-blocking
  - Socket.IO handles concurrent emits efficiently
  - No database contention added
  - Expected throughput: Unchanged
```

**Memory Impact**
```
Per-request memory:
  - Payload object: ~200 bytes
  - Socket.IO emit buffer: ~500 bytes
  - Total added memory: <1KB per request
  - Negligible impact on server
```

---

## Phase 5: COMPLETION

### 5.1 Implementation Checklist

#### Code Changes
- [ ] Implement broadcast in `/api/posts/:postId/comments` (line 1626)
- [ ] Implement broadcast in `/api/v1/posts/:postId/comments` (line 1764)
- [ ] Extract shared `broadcastCommentCreated()` helper function
- [ ] Add comprehensive error handling with try-catch
- [ ] Add logging for success, warnings, and errors
- [ ] Validate payload fields before broadcast

#### Testing
- [ ] Write unit tests for broadcast function
- [ ] Write unit tests for error scenarios
- [ ] Write integration tests for end-to-end flow
- [ ] Write tests for multi-client broadcasts
- [ ] Test both endpoints for identical behavior
- [ ] Test edge cases (service unavailable, malformed data)
- [ ] Verify 100% test coverage of new code

#### Validation
- [ ] Manual testing with frontend UI
- [ ] Verify events received by `useRealtimeComments` hook
- [ ] Test with multiple browser tabs (concurrent clients)
- [ ] Test with WebSocket service disabled
- [ ] Test with network failures
- [ ] Performance benchmarks (latency, throughput)

#### Documentation
- [ ] Update API documentation with WebSocket events
- [ ] Document payload structure for `comment:added` event
- [ ] Add troubleshooting guide for WebSocket issues
- [ ] Update CHANGELOG.md with feature addition
- [ ] Add inline code comments for broadcast logic

### 5.2 Integration Testing Scenarios

#### Scenario 1: Happy Path
```
1. User submits comment via frontend
2. Backend creates comment in database
3. Backend broadcasts WebSocket event
4. Frontend receives event via useRealtimeComments
5. UI updates with new comment instantly
6. No page refresh required

Expected: Comment visible immediately in all tabs
```

#### Scenario 2: WebSocket Service Down
```
1. Stop WebSocket service
2. User submits comment via frontend
3. Backend creates comment in database
4. Broadcast attempt fails gracefully
5. HTTP 201 returned successfully
6. User refreshes page to see comment

Expected: Comment persisted, no error to user
```

#### Scenario 3: Concurrent Comments
```
1. Three users submit comments simultaneously
2. All comments persisted to database
3. All broadcasts emitted to Socket.IO
4. All clients receive all three events
5. UI updates with all comments

Expected: No race conditions, all events delivered
```

#### Scenario 4: Nested Comment Thread
```
1. User A posts top-level comment (parent_id: null)
2. User B replies to User A (parent_id: A's comment ID)
3. Both broadcasts include correct parentCommentId
4. Frontend renders threaded view correctly

Expected: Comment hierarchy preserved
```

### 5.3 Deployment Plan

#### Pre-Deployment
1. **Code Review**: Peer review of all changes
2. **Test Suite**: All tests passing (unit + integration)
3. **Performance**: Benchmark results within acceptable range
4. **Documentation**: All docs updated

#### Deployment Steps
1. **Backup**: Snapshot current production state
2. **Deploy Backend**: Deploy server.js changes
3. **Verify WebSocket**: Confirm WebSocket service running
4. **Smoke Test**: Create test comment, verify broadcast
5. **Monitor**: Watch logs for broadcast success/failures
6. **Rollback Plan**: Revert commit if critical issues

#### Post-Deployment Monitoring
```
Metrics to watch (first 24 hours):
- WebSocket broadcast success rate (target: >99.9%)
- HTTP 500 error rate (target: no increase)
- Comment creation latency (target: <5% increase)
- Frontend error rate (target: no increase)
- User-reported issues (target: zero)
```

#### Rollback Criteria
```
Immediate rollback if:
- HTTP 500 rate increases >10%
- Comment creation fails due to broadcast errors
- WebSocket service causes server crashes
- User experience significantly degraded

Delayed rollback if:
- Broadcast success rate <95%
- Latency increase >10%
- Multiple user-reported issues
```

### 5.4 Documentation Deliverables

#### API Documentation Update
```markdown
## WebSocket Events

### `comment:added`
Emitted when a new comment is created on a post.

**Event Name**: `comment:added`

**Payload**:
| Field | Type | Description |
|-------|------|-------------|
| postId | string | Parent post ID |
| commentId | string | Newly created comment ID |
| parentCommentId | string\|null | Parent comment ID (null for top-level) |
| author | string | Comment author identifier |
| content | string | Comment text content |
| timestamp | string | ISO 8601 timestamp |

**Example**:
```json
{
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "commentId": "550e8400-e29b-41d4-a716-446655440000",
  "parentCommentId": null,
  "author": "test-agent-1",
  "content": "This is a new comment",
  "timestamp": "2025-10-28T10:30:15.234Z"
}
```

**Frontend Usage**:
```javascript
import { useRealtimeComments } from '@/hooks/useRealtimeComments';

function PostView({ postId }) {
  const { comments, isConnected } = useRealtimeComments(postId);

  // comments array automatically updated when comment:added received
}
```
```

#### Troubleshooting Guide
```markdown
## WebSocket Broadcast Troubleshooting

### Problem: Comments not appearing in real-time

**Symptom**: New comments only visible after page refresh

**Diagnosis**:
1. Check browser console for WebSocket connection errors
2. Verify backend logs show "Broadcasted comment:added" messages
3. Confirm frontend subscribed to correct post room

**Solutions**:
- Ensure WebSocket service initialized in server.js
- Check CORS_ORIGIN environment variable allows frontend origin
- Verify firewall allows WebSocket connections (port 3001)

### Problem: HTTP requests failing after deployment

**Symptom**: POST /api/posts/:postId/comments returns 500

**Diagnosis**:
1. Check error logs for uncaught exceptions in broadcast code
2. Verify try-catch blocks present around broadcast calls
3. Confirm errors not propagated to route handler

**Solutions**:
- Ensure broadcast wrapped in try-catch
- Verify error handling doesn't rethrow exceptions
- Check websocketService exists before calling methods
```

### 5.5 Success Criteria

#### Functional Success
- ✅ Comment creation triggers `comment:added` WebSocket event
- ✅ Events delivered to all subscribed clients
- ✅ Frontend UI updates without manual refresh
- ✅ Both endpoints emit identical events
- ✅ Nested comments include correct `parentCommentId`

#### Non-Functional Success
- ✅ HTTP requests never fail due to broadcast errors
- ✅ Latency increase <5% compared to baseline
- ✅ WebSocket broadcast success rate >99%
- ✅ Test coverage >95% for new code
- ✅ Zero production incidents in first week

#### User Experience Success
- ✅ Users see comments instantly (no refresh)
- ✅ Multi-tab updates work correctly
- ✅ No visible errors or degraded performance
- ✅ Feature works on all supported browsers

### 5.6 Handoff Documentation

#### For Frontend Team
```
What changed:
- Backend now emits comment:added events after comment creation
- No changes required to useRealtimeComments hook (already compatible)
- Event payload matches existing hook expectations

Testing:
- Verify real-time updates work in development
- Test multi-tab scenarios
- Confirm nested comments render correctly

Known limitations:
- Events only delivered to currently connected clients
- Page refresh required if disconnected during creation
```

#### For DevOps Team
```
Deployment notes:
- No database migrations required
- No new environment variables
- No configuration changes needed
- WebSocket service already running

Monitoring:
- Watch for "Broadcasted comment:added" in logs
- Monitor HTTP 500 rate (should not increase)
- Track WebSocket connection count

Rollback procedure:
- Revert server.js to previous commit
- No data cleanup required
- Feature degrades gracefully (comments still work, just no real-time)
```

#### For QA Team
```
Test scenarios:
1. Create comment, verify appears without refresh
2. Open two tabs, create comment in one, see in both
3. Disconnect WebSocket, create comment, verify still works
4. Create nested comment, verify parent_id correct
5. Load test: 100 concurrent comments

Acceptance criteria:
- All scenarios pass
- No console errors
- Performance acceptable
- Feature works in Chrome, Firefox, Safari
```

---

## Appendix

### A. Code Snippets

#### Endpoint 1 Implementation (Line 1626)
```javascript
// After line 1625 in server.js
const createdComment = await dbSelector.createComment(userId, commentData);
console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}`);

// NEW: Broadcast WebSocket event
try {
  if (websocketService && websocketService.initialized) {
    websocketService.broadcastCommentAdded({
      postId,
      commentId: createdComment.id,
      parentCommentId: createdComment.parent_id || null,
      author: createdComment.author_agent || 'anonymous',
      content: createdComment.content
    });
    console.log(`📡 Broadcasted comment:added for post ${postId}, comment ${createdComment.id}`);
  } else {
    console.warn('⚠️  WebSocket service not available for broadcast');
  }
} catch (broadcastError) {
  console.error(`❌ WebSocket broadcast failed for post ${postId}:`, broadcastError.message);
  // Continue - don't fail the request
}

// Create work queue ticket...
```

#### Endpoint 2 Implementation (Line 1764)
```javascript
// After line 1763 in server.js
const createdComment = await dbSelector.createComment(userId, commentData);
console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'} (V1 endpoint)`);

// NEW: Broadcast WebSocket event
try {
  if (websocketService && websocketService.initialized) {
    websocketService.broadcastCommentAdded({
      postId,
      commentId: createdComment.id,
      parentCommentId: createdComment.parent_id || null,
      author: createdComment.author_agent || 'anonymous',
      content: createdComment.content
    });
    console.log(`📡 Broadcasted comment:added for post ${postId}, comment ${createdComment.id} (V1)`);
  } else {
    console.warn('⚠️  WebSocket service not available for broadcast (V1)');
  }
} catch (broadcastError) {
  console.error(`❌ WebSocket broadcast failed for post ${postId} (V1):`, broadcastError.message);
  // Continue - don't fail the request
}

// Create work queue ticket...
```

### B. Payload Reference

#### Database Comment Object
```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  post_id: "123e4567-e89b-12d3-a456-426614174000",
  parent_id: null, // or "parent-comment-id"
  content: "Comment text",
  author_agent: "test-agent-1",
  created_at: "2025-10-28T10:30:00.000Z",
  updated_at: "2025-10-28T10:30:00.000Z",
  depth: 0,
  reactions: []
}
```

#### WebSocket Broadcast Payload
```javascript
{
  postId: "123e4567-e89b-12d3-a456-426614174000",
  commentId: "550e8400-e29b-41d4-a716-446655440000",
  parentCommentId: null, // or "parent-comment-id"
  author: "test-agent-1",
  content: "Comment text"
}
```

#### Emitted Socket.IO Event
```javascript
{
  postId: "123e4567-e89b-12d3-a456-426614174000",
  commentId: "550e8400-e29b-41d4-a716-446655440000",
  parentCommentId: null,
  author: "test-agent-1",
  content: "Comment text",
  timestamp: "2025-10-28T10:30:15.234Z" // Added by service
}
```

### C. Testing Commands

```bash
# Run unit tests
cd api-server
npm test -- --testPathPattern=server.test.js

# Run integration tests
npm test -- --testPathPattern=integration.test.js

# Run with coverage
npm test -- --coverage --testPathPattern=websocket

# Manual testing with curl
curl -X POST http://localhost:3001/api/posts/test-post-123/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment", "author_agent": "test-agent"}'

# Monitor WebSocket events (requires wscat)
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

### D. Monitoring Queries

```javascript
// Log analysis for broadcast success rate
// Filter logs for last 24 hours
grep "Broadcasted comment:added" server.log | wc -l  // Success count
grep "WebSocket broadcast failed" server.log | wc -l  // Failure count

// Calculate success rate
const successRate = (successCount / (successCount + failureCount)) * 100;

// Performance metrics
// Average comment creation time
grep "Created comment" server.log | awk '{print $NF}' | calculate_average
```

---

## Document Control

**Version History**:
- v1.0.0 (2025-10-28): Initial SPARC specification

**Reviewers**:
- [ ] Backend Lead
- [ ] Frontend Lead
- [ ] QA Lead
- [ ] DevOps Lead

**Approval**:
- [ ] Technical Architecture Board
- [ ] Product Owner

**Next Steps**:
1. Review and approval of specification
2. Implementation by Coder Agent
3. Test development by TDD Agent
4. Integration testing by QA
5. Deployment to staging
6. Production rollout

---

**End of SPARC Specification Document**
