# WebSocket Comment Counter Flow Diagram

**Visual representation of the complete WebSocket comment flow**

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    React Component Tree                       │   │
│  │                                                                │   │
│  │  RealSocialMediaFeed.tsx                                      │   │
│  │         │                                                      │   │
│  │         ├──> PostCard.tsx (Post 1)                            │   │
│  │         │        │                                             │   │
│  │         │        ├──> Socket.IO Client                        │   │
│  │         │        │    - Subscribes: 'post:1'                  │   │
│  │         │        │    - Listens: 'comment:created' ✅         │   │
│  │         │        │                                             │   │
│  │         │        └──> CommentForm.tsx                         │   │
│  │         │                 │                                    │   │
│  │         │                 └──> POST /api/.../comments         │   │
│  │         │                                                      │   │
│  │         ├──> PostCard.tsx (Post 2)                            │   │
│  │         │        │                                             │   │
│  │         │        └──> Socket.IO Client                        │   │
│  │         │             - Subscribes: 'post:2'                  │   │
│  │         │             - Listens: 'comment:created' ✅         │   │
│  │         │                                                      │   │
│  │         └──> PostCard.tsx (Post 3)                            │   │
│  │                  │                                             │   │
│  │                  └──> Socket.IO Client                        │   │
│  │                       - Subscribes: 'post:3'                  │   │
│  │                       - Listens: 'comment:created' ✅         │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Socket.IO Client Connection                      │   │
│  │              ws://localhost:3001/socket.io/                   │   │
│  │                                                                │   │
│  │  State: Connected ✅                                          │   │
│  │  Rooms: ['post:1', 'post:2', 'post:3']                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ WebSocket Connection
                                 │ (bidirectional)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API SERVER                                   │
│                       (Node.js + Express)                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Socket.IO Server                             │   │
│  │                  (websocket-service.js)                       │   │
│  │                                                                │   │
│  │  Rooms:                                                        │   │
│  │    - post:1 → [client-abc123]                                │   │
│  │    - post:2 → [client-abc123]                                │   │
│  │    - post:3 → [client-abc123]                                │   │
│  │                                                                │   │
│  │  Event Handlers:                                               │   │
│  │    - 'subscribe:post' → socket.join(`post:${postId}`)        │   │
│  │    - 'unsubscribe:post' → socket.leave(`post:${postId}`)     │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                REST API Endpoints                             │   │
│  │                  (server.js)                                  │   │
│  │                                                                │   │
│  │  POST /api/agent-posts/:postId/comments                       │   │
│  │       │                                                        │   │
│  │       ├──> 1. Save comment to database                        │   │
│  │       │                                                        │   │
│  │       └──> 2. websocketService.broadcastCommentAdded({        │   │
│  │                 postId: "post-123",                           │   │
│  │                 comment: {...}                                │   │
│  │              })                                                │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │   Database   │
                          │   (SQLite)   │
                          └──────────────┘
```

---

## 2. Comment Creation Flow (Step-by-Step)

```
USER ACTION: Clicks "Post Comment" button
═══════════════════════════════════════════════════════════════════════

FRONTEND (PostCard.tsx → CommentForm.tsx)
─────────────────────────────────────────
Step 1: User types comment and clicks submit
Step 2: CommentForm.tsx calls:

        fetch('/api/agent-posts/post-123/comments', {
          method: 'POST',
          body: JSON.stringify({
            content: "Great post!",
            userId: "user-456"
          })
        })

Step 3: OPTIMISTIC UPDATE (immediate UI feedback)

        setEngagementState(prev => ({
          ...prev,
          comments: prev.comments + 1
        }))

        Shows comment count: 5 → 6 (before server responds)

═══════════════════════════════════════════════════════════════════════

BACKEND (server.js)
───────────────────
Step 4: Express route handler receives POST request
        Line: server.js:1650-1681

Step 5: Validate request data
        - Check postId exists
        - Check userId valid
        - Sanitize content

Step 6: Insert comment into database

        const createdComment = await db.run(`
          INSERT INTO comments (id, post_id, user_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [commentId, postId, userId, content, timestamp]);

Step 7: Call WebSocket broadcast

        try {
          if (websocketService && websocketService.broadcastCommentAdded) {
            websocketService.broadcastCommentAdded({
              postId: postId,
              commentId: createdComment.id,
              author: userId,
              content: createdComment.content,
              comment: createdComment  // Full object
            });
          }
        } catch (wsError) {
          console.error('❌ Failed to broadcast:', wsError);
        }

Step 8: Return success response to client

        res.status(201).json({
          success: true,
          data: createdComment
        });

═══════════════════════════════════════════════════════════════════════

BACKEND (websocket-service.js)
───────────────────────────────
Step 9: broadcastCommentAdded() called
        Line: websocket-service.js:199-215

Step 10: Check WebSocket initialized

        if (!this.io || !this.initialized) {
          console.warn('WebSocket not initialized');
          return;
        }

Step 11: Emit to Socket.IO room

        this.io.to(`post:${postId}`).emit('comment:created', {
          postId,
          comment: comment
        });

Step 12: Log broadcast

        console.log(`📡 Broadcasted comment:created for post ${postId}`);

        OUTPUT: "📡 Broadcasted comment:created for post post-123, comment ID: cmt-789"

═══════════════════════════════════════════════════════════════════════

SOCKET.IO TRANSPORT LAYER
──────────────────────────
Step 13: Socket.IO server sends event to room subscribers

         Room: 'post:post-123'
         Subscribers: [client-abc123, client-def456, client-ghi789]

Step 14: Event transmitted over WebSocket connection

         Event: 'comment:created'
         Data: {
           postId: "post-123",
           comment: {
             id: "cmt-789",
             content: "Great post!",
             author: "user-456",
             created_at: "2025-11-06T10:30:00Z"
           }
         }

═══════════════════════════════════════════════════════════════════════

FRONTEND (PostCard.tsx - Event Handler)
────────────────────────────────────────
Step 15: Socket.IO client receives event
         Line: PostCard.tsx:226-240

Step 16: handleCommentCreated() triggered

         const handleCommentCreated = (data: any) => {
           console.log('[PostCard] Received comment:created event', data);

           if (data.postId === post.id) {
             // Update counter immediately
             setEngagementState(prev => ({
               ...prev,
               comments: prev.comments + 1
             }));

             // If comments are showing, reload
             if (showComments) {
               handleCommentsUpdate();
             }
           }
         };

Step 17: UI updates

         Comment count updates: Shows new count (confirmed from server)
         If comment section open: Fetches and displays new comment

Step 18: User sees update

         Browser displays: "7 Comments" (updated from 6)
         New comment appears in thread (if section expanded)

═══════════════════════════════════════════════════════════════════════

TOTAL TIME: ~200-500ms from button click to UI update
```

---

## 3. Room Subscription Flow

```
INITIAL PAGE LOAD
═════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Component Mount (PostCard.tsx)                          │
└─────────────────────────────────────────────────────────────────┘
         │
         │ useEffect(() => { ... }, [post.id])
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Check Socket Connection                                 │
│                                                                  │
│   if (!socket.connected) {                                      │
│     socket.connect();  // Establish WebSocket                   │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Wait for Connection                                     │
│                                                                  │
│   socket.on('connect', handleConnect)                           │
│                                                                  │
│   [Socket.IO] Connection established                            │
│   [Socket.IO] Connected to server: abc123def456                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Subscribe to Post Room                                  │
│                                                                  │
│   const handleConnect = () => {                                 │
│     socket.emit('subscribe:post', post.id);                     │
│     console.log('[PostCard] Subscribed to:', post.id);          │
│   };                                                             │
│                                                                  │
│   OUTPUT: "[PostCard] Subscribed to post room: post-123"        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Event: 'subscribe:post' → 'post-123'
         │ Transport: WebSocket
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: websocket-service.js                                   │
│                                                                  │
│ Step 5: Handle Subscription Request                             │
│                                                                  │
│   socket.on('subscribe:post', (postId) => {                     │
│     socket.join(`post:${postId}`);                              │
│     console.log(`Client ${socket.id} subscribed to ${postId}`); │
│   });                                                            │
│                                                                  │
│   OUTPUT: "Client abc123def456 subscribed to post:post-123"     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Room State Updated                                      │
│                                                                  │
│   Socket.IO Rooms:                                              │
│   {                                                              │
│     'post:post-123': ['abc123def456'],                          │
│     'post:post-456': [],                                        │
│     'post:post-789': ['ghi789jkl012']                           │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Register Event Listeners (Frontend)                     │
│                                                                  │
│   socket.on('comment:created', handleCommentCreated);           │
│   socket.on('comment:updated', handleCommentUpdated);           │
│   socket.on('comment:deleted', handleCommentDeleted);           │
│                                                                  │
│   STATUS: ✅ Ready to receive events                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
     [WAITING FOR EVENTS]
     Component is now subscribed and listening


COMPONENT UNMOUNT
═════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Cleanup (useEffect return)                              │
│                                                                  │
│   return () => {                                                 │
│     socket.off('comment:created', handleCommentCreated);        │
│     socket.off('comment:updated', handleCommentUpdated);        │
│     socket.off('comment:deleted', handleCommentDeleted);        │
│     socket.emit('unsubscribe:post', post.id);                   │
│   };                                                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: Handle Unsubscription                                  │
│                                                                  │
│   socket.on('unsubscribe:post', (postId) => {                   │
│     socket.leave(`post:${postId}`);                             │
│   });                                                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
     [COMPONENT UNMOUNTED - CLEANUP COMPLETE]
```

---

## 4. Event Name Comparison Matrix

| Source | Event Name | Status | Notes |
|--------|-----------|--------|-------|
| **Backend** | | | |
| websocket-service.js:209 | `comment:created` | ✅ Emits | Primary event |
| websocket-service.js:229 | `comment:updated` | ✅ Emits | Update event |
| | | | |
| **Frontend - PostCard** | | | |
| PostCard.tsx:258 | `comment:created` | ✅ Listens | **MATCHES BACKEND** ✅ |
| PostCard.tsx:259 | `comment:updated` | ✅ Listens | Matches backend |
| PostCard.tsx:260 | `comment:deleted` | ✅ Listens | Matches backend |
| | | | |
| **Frontend - useRealtimeComments** | | | |
| useRealtimeComments.ts:276 | `comment:added` | ❌ Listens | **NO BACKEND EMIT** ❌ |
| useRealtimeComments.ts:277 | `comment:updated` | ✅ Listens | Matches backend |
| useRealtimeComments.ts:278 | `comment:deleted` | ✅ Listens | Matches backend |
| useRealtimeComments.ts:279 | `comment:reaction` | ⚠️ Listens | Backend doesn't emit |
| useRealtimeComments.ts:280 | `agent:response` | ⚠️ Listens | Backend doesn't emit |

**Legend:**
- ✅ Working correctly (event names match)
- ❌ Critical mismatch (event names don't match)
- ⚠️ Unused (no backend implementation)

---

## 5. Race Condition Scenario

```
PROBLEM: Multiple PostCards for Same Post
═════════════════════════════════════════════════════════════════════

Scenario: Bug causes feed to render duplicate post

┌─────────────────────────────────────────────────────────────────┐
│ Feed Renders:                                                    │
│   - PostCard (id: post-123) [Instance A]                        │
│   - PostCard (id: post-123) [Instance B]  ← DUPLICATE           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Both Components Subscribe:                                       │
│                                                                  │
│   Instance A: socket.emit('subscribe:post', 'post-123')         │
│   Instance B: socket.emit('subscribe:post', 'post-123')         │
│                                                                  │
│   Backend Room State:                                            │
│   'post:post-123' → [socket-abc123]  (same socket, joined twice)│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Comment Created → Backend Emits Event                            │
│                                                                  │
│   io.to('post:post-123').emit('comment:created', {...})         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Both Instances Receive Event:                                   │
│                                                                  │
│   Instance A: handleCommentCreated() fires                      │
│   Instance B: handleCommentCreated() fires                      │
│                                                                  │
│   BOTH update engagement state:                                 │
│   Instance A: comments: 5 → 6                                   │
│   Instance B: comments: 5 → 6                                   │
│                                                                  │
│   RESULT: Both show "6 Comments" ✅ (correct)                   │
└─────────────────────────────────────────────────────────────────┘

VERDICT: Room isolation works correctly even with duplicates
         Each component updates its own state independently
```

---

## 6. Network Timeline (DevTools View)

```
Browser DevTools → Network → WS → socket.io/
═════════════════════════════════════════════════════════════════════

Frame #  | Direction | Type        | Payload
─────────┼───────────┼─────────────┼────────────────────────────────
1        | SEND      | Connect     | {"transport":"websocket"}
2        | RECEIVE   | Connected   | {"sid":"abc123def456"}
3        | SEND      | Event       | ["subscribe:post","post-123"]
4        | RECEIVE   | Event       | ["connected",{"message":"..."}]
─────────┼───────────┼─────────────┼────────────────────────────────
         |           |             | [USER POSTS COMMENT]
─────────┼───────────┼─────────────┼────────────────────────────────
5        | RECEIVE   | Event       | ["comment:created",{
         |           |             |   "postId":"post-123",
         |           |             |   "comment":{
         |           |             |     "id":"cmt-789",
         |           |             |     "content":"Great post!",
         |           |             |     "author":"user-456"
         |           |             |   }
         |           |             | }]
─────────┼───────────┼─────────────┼────────────────────────────────

Console Output:
───────────────
[Socket.IO] Connected to server: abc123def456
[PostCard] Socket.IO connected
[PostCard] Subscribed to post room: post-123
[PostCard] Received comment:created event { postId: "post-123", ... }
[PostCard] Updated engagement state: { comments: 6 }
```

---

## 7. Error Scenarios

### Scenario A: WebSocket Not Initialized

```
USER → Comments on Post
  │
  ▼
BACKEND: broadcastCommentAdded() called
  │
  ├──> Check: if (!this.io || !this.initialized)
  │
  ├──> TRUE (not initialized)
  │
  ├──> Log: "⚠️ WebSocket not initialized"
  │
  └──> RETURN (no broadcast)

RESULT: Comment saved to DB ✅
        WebSocket event NOT sent ❌
        Frontend doesn't receive update
        User must refresh to see count update
```

### Scenario B: Client Not Subscribed

```
USER → Views Post (but subscription failed)
  │
  ▼
FRONTEND: PostCard renders
  │
  ├──> socket.emit('subscribe:post', 'post-123')
  │
  └──> Network error / timeout
       Subscription never reaches backend

ANOTHER USER → Comments on same post
  │
  ▼
BACKEND: Emits to room 'post:post-123'
  │
  └──> Client NOT in room
       Event not delivered to this client

RESULT: Other clients see update ✅
        This client doesn't see update ❌
        Refresh required
```

### Scenario C: Event Name Mismatch

```
BACKEND → Emits: 'comment:created'
  │
  ▼
TRANSPORT → Event sent over WebSocket
  │
  ▼
FRONTEND → Listens for: 'comment:added'
  │
  └──> Event names don't match
       Handler never fires

RESULT: Event delivered but ignored ❌
        Console shows no errors (silent failure)
        Counter doesn't update
```

---

## 8. Debugging Checklist

```
✅ Backend Checklist
─────────────────────
□ WebSocket service initialized?
  → Check: "WebSocket service initialized" in logs

□ Comment broadcast called?
  → Check: "📡 Broadcasted comment:created" in logs

□ Client subscribed to room?
  → Check: "Client [id] subscribed to post:[postId]" in logs

□ Emit successful?
  → Check: No errors after broadcast log

✅ Frontend Checklist
──────────────────────
□ Socket connected?
  → Check: "[Socket.IO] Connected to server: [id]"

□ Subscription sent?
  → Check: "[PostCard] Subscribed to post room: [id]"

□ Event listener registered?
  → Check: socket.on('comment:created', ...) called

□ Event received?
  → Check: "[PostCard] Received comment:created event"

□ State updated?
  → Check: Comment count increments in UI

✅ Network Checklist
────────────────────
□ WebSocket connection open?
  → DevTools → Network → WS → Status: 101 Switching Protocols

□ Events flowing?
  → DevTools → WS → Messages → See events

□ Room subscription confirmed?
  → Check backend logs for subscription confirmation
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Related Files:**
- `/workspaces/agent-feed/docs/WEBSOCKET-COMMENT-COUNTER-FLOW-ANALYSIS.md`
- `/workspaces/agent-feed/api-server/services/websocket-service.js`
- `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`
- `/workspaces/agent-feed/frontend/src/hooks/useRealtimeComments.ts`
