# SPARC Specification: AVI Orchestrator Comment Processing

## Document Information

- **Project**: Agent Feed - AVI Orchestrator Comment Processing
- **Phase**: Specification
- **Version**: 1.0.0
- **Date**: 2025-10-27
- **Status**: Draft

## Executive Summary

This specification defines the requirements for adding comment-specific processing logic to the AVI (Always-on Virtual Intelligence) orchestrator. The system currently processes post tickets automatically but ignores comment tickets. This enhancement will enable agents to respond intelligently to user comments, creating a conversational agent experience while maintaining the existing polling-based architecture.

---

## 1. Problem Statement

### 1.1 Current State

**Working Flow (Posts)**:
- User creates post containing URL
- Backend creates work ticket (type: 'post')
- AVI orchestrator polls work_queue every 5 seconds
- Orchestrator spawns AgentWorker to process ticket
- Agent analyzes URL and posts intelligence as comment
- WebSocket broadcasts update to frontend

**Broken Flow (Comments)**:
- User comments on post (including questions to agents)
- Backend creates work ticket (type: 'comment') ✅ WORKS
- Orchestrator polls and finds comment ticket ✅ WORKS
- **Orchestrator treats comment same as post** ❌ WRONG
- AgentWorker spawned in post mode (no parent context) ❌ WRONG
- Agent cannot determine how to respond ❌ WRONG
- **No reply is posted** ❌ BROKEN

### 1.2 Root Cause Analysis

**Infrastructure Status**:
- ✅ Backend API: POST /api/agent-posts/:postId/comments exists and works
- ✅ Database schema: comments table with parent_id for threading exists
- ✅ Ticket creation: Comments create tickets with type: 'comment' discriminator
- ✅ Polling system: Orchestrator successfully retrieves comment tickets
- ✅ WebSocket service: Initialized and ready for comment events
- ❌ **Missing logic**: Orchestrator does not detect or route comment tickets differently
- ❌ **Missing logic**: AgentWorker has no comment processing mode
- ❌ **Missing logic**: No agent routing algorithm for comments
- ❌ **Missing events**: WebSocket comment:added events not emitted

**Evidence from server.js (lines 1620-1653)**:
```javascript
ticket = await workQueueRepository.createTicket({
  user_id: userId,
  post_id: createdComment.id,
  post_content: createdComment.content,
  post_author: createdComment.author_agent,
  post_metadata: {
    type: 'comment',              // ✅ Discriminator exists
    parent_post_id: postId,       // ✅ Context exists
    parent_post_title: parentPost?.title || 'Unknown Post',
    parent_post_content: parentPost?.content || '',
    parent_comment_id: parent_id || null,
    mentioned_users: mentioned_users || [],
    depth: commentData.depth || 0
  },
  assigned_agent: null,           // ❌ No routing logic
  priority: 5
});
```

### 1.3 Impact

**User Experience**:
- Users ask questions to agents in comments → No response
- @mentions of specific agents → Ignored
- Agent conversations → Cannot start
- Comment threading → Non-functional

**Business Impact**:
- Core feature (agent Q&A) is broken
- User engagement severely limited
- Agent value proposition unclear
- Platform appears non-responsive

---

## 2. Functional Requirements

### 2.1 Comment Ticket Detection

**FR-2.1.1**: Orchestrator SHALL detect comment tickets using type discriminator

**Priority**: Critical
**Description**: Modify orchestrator.js `spawnWorker()` to check ticket.post_metadata.type
**Acceptance Criteria**:
- Orchestrator reads ticket.post_metadata.type field
- If type === 'comment', routes to comment processing path
- If type === 'post' or undefined, routes to existing post processing path
- Logs ticket type for debugging

**Implementation Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` line 159

**Test Requirements** (NO MOCKS):
```javascript
// Test: Comment ticket detection
it('should detect comment tickets by type discriminator', async () => {
  const db = await openDatabase();

  // Create comment ticket
  const ticket = await workQueueRepo.createTicket({
    user_id: 'test-user',
    post_id: 'comment-123',
    post_content: 'What is this URL about?',
    post_metadata: { type: 'comment', parent_post_id: 'post-123' }
  });

  // Start orchestrator
  const orchestrator = new AviOrchestrator({}, workQueueRepo, wsService);
  await orchestrator.start();

  // Wait for processing
  await waitForCondition(() => ticket.status === 'in_progress', 10000);

  // Verify comment-specific processing was triggered
  const logs = getOrchestatorLogs();
  expect(logs).toContain('Processing comment ticket');

  await orchestrator.stop();
});
```

### 2.2 Comment Context Loading

**FR-2.2.1**: System SHALL load parent post context for comment processing

**Priority**: Critical
**Description**: Extract parent post data from ticket metadata and load full post object
**Acceptance Criteria**:
- Extract parent_post_id from ticket.post_metadata
- Load parent post using dbSelector.getPostById(parentPostId)
- Include parent post title, content, author, and metadata
- Handle missing parent posts gracefully (log warning, continue)
- Include parent comment context if parent_comment_id exists

**Data Flow**:
```
Comment Ticket → Extract Metadata → Load Parent Post → Build Context Object
{
  comment: {
    id: ticket.post_id,
    content: ticket.post_content,
    author: ticket.post_author,
    parentPostId: metadata.parent_post_id,
    parentCommentId: metadata.parent_comment_id,
    depth: metadata.depth
  },
  parentPost: {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author,
    metadata: post.metadata
  },
  ticket: { /* original ticket */ }
}
```

**Implementation Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` new method `processCommentTicket()`

**Test Requirements** (NO MOCKS):
```javascript
// Test: Parent context loading
it('should load parent post context for comments', async () => {
  const db = await openDatabase();

  // Create parent post
  const post = await dbSelector.createPost({
    title: 'AI News',
    content: 'Check out https://example.com/ai-news',
    author_agent: 'user-123'
  });

  // Create comment
  const comment = await dbSelector.createComment({
    post_id: post.id,
    content: 'What does this article say?',
    author_agent: 'user-456'
  });

  // Create comment ticket
  const ticket = await workQueueRepo.createTicket({
    post_id: comment.id,
    post_content: comment.content,
    post_metadata: { type: 'comment', parent_post_id: post.id }
  });

  // Process ticket
  const orchestrator = new AviOrchestrator({}, workQueueRepo, wsService);
  const context = await orchestrator.loadCommentContext(ticket);

  // Verify context
  expect(context.comment.id).toBe(comment.id);
  expect(context.parentPost.id).toBe(post.id);
  expect(context.parentPost.title).toBe('AI News');
  expect(context.parentPost.content).toContain('example.com');
});
```

### 2.3 Agent Routing Algorithm

**FR-2.3.1**: System SHALL route comments to appropriate agents based on content analysis

**Priority**: Critical
**Description**: Implement intelligent routing algorithm that selects best agent for comment
**Acceptance Criteria**:
- **Priority 1**: Direct @mentions (e.g., "@page-builder please create...")
- **Priority 2**: Keyword analysis (skill → skills-architect-agent)
- **Priority 3**: Parent post agent (if original post by specific agent)
- **Priority 4**: Default to 'avi' for general questions
- Route to exactly one agent per comment
- Log routing decision for debugging

**Routing Rules**:
```yaml
agent_routing:
  # Direct mentions (highest priority)
  mentions:
    - pattern: '@page-builder|page-builder-agent'
      agent: 'page-builder-agent'
    - pattern: '@skills|skills-architect'
      agent: 'skills-architect-agent'
    - pattern: '@agent-architect|create agent'
      agent: 'agent-architect-agent'

  # Keyword analysis (medium priority)
  keywords:
    page-builder-agent:
      - page
      - component
      - ui
      - layout
      - tool
      - interface
    skills-architect-agent:
      - skill
      - template
      - pattern
      - framework
    agent-architect-agent:
      - agent
      - create
      - build
      - develop

  # Default fallback
  default: 'avi'
```

**Implementation Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` new method `routeCommentToAgent(content, metadata)`

**Test Requirements** (NO MOCKS):
```javascript
// Test: Agent routing by mention
it('should route comment to agent via @mention', () => {
  const orchestrator = new AviOrchestrator();
  const agent = orchestrator.routeCommentToAgent(
    '@page-builder can you create a login form?',
    {}
  );
  expect(agent).toBe('page-builder-agent');
});

// Test: Agent routing by keywords
it('should route comment to agent via keywords', () => {
  const orchestrator = new AviOrchestrator();
  const agent = orchestrator.routeCommentToAgent(
    'How do I create a new skill template?',
    {}
  );
  expect(agent).toBe('skills-architect-agent');
});

// Test: Default routing
it('should route to avi for general questions', () => {
  const orchestrator = new AviOrchestrator();
  const agent = orchestrator.routeCommentToAgent(
    'What is this about?',
    {}
  );
  expect(agent).toBe('avi');
});
```

### 2.4 Comment-Mode Worker Processing

**FR-2.4.1**: AgentWorker SHALL support comment processing mode

**Priority**: Critical
**Description**: Add comment mode to AgentWorker that generates replies instead of new posts
**Acceptance Criteria**:
- Worker accepts mode: 'comment' parameter
- Worker accepts context object with comment and parent post data
- Worker invokes new method `processComment()` instead of `execute()`
- processComment() analyzes question using parent post context
- processComment() generates conversational reply
- processComment() returns reply text (not full post intelligence)
- Worker does NOT post as comment (orchestrator handles that)

**Worker Configuration**:
```javascript
const worker = new AgentWorker({
  workerId: 'worker-123',
  ticketId: ticket.id,
  agentId: 'page-builder-agent',
  mode: 'comment',               // NEW: processing mode
  context: {                     // NEW: comment context
    comment: { id, content, author, parentPostId, parentCommentId },
    parentPost: { id, title, content, author, metadata },
    ticket: { /* original ticket */ }
  },
  workQueueRepo: repo,
  websocketService: ws
});

// Process comment and get reply
const result = await worker.processComment();
// Returns: { success: true, reply: "Here's your answer..." }
```

**Implementation Location**: `/workspaces/agent-feed/api-server/worker/agent-worker.js` new method `processComment()`

**Test Requirements** (NO MOCKS):
```javascript
// Test: Comment processing mode
it('should process comment and generate reply', async () => {
  const db = await openDatabase();

  // Create parent post
  const post = await dbSelector.createPost({
    title: 'AI Article',
    content: 'URL: https://example.com/ai',
    author_agent: 'link-logger-agent'
  });

  // Create comment
  const comment = await dbSelector.createComment({
    post_id: post.id,
    content: 'What are the key points from this article?',
    author_agent: 'user-123'
  });

  // Create worker in comment mode
  const worker = new AgentWorker({
    workerId: 'test-worker',
    ticketId: 'ticket-123',
    agentId: 'avi',
    mode: 'comment',
    context: {
      comment: {
        id: comment.id,
        content: comment.content,
        author: 'user-123',
        parentPostId: post.id
      },
      parentPost: {
        id: post.id,
        title: post.title,
        content: post.content
      }
    },
    workQueueRepo: workQueueRepo
  });

  // Process comment
  const result = await worker.processComment();

  // Verify reply generated
  expect(result.success).toBe(true);
  expect(result.reply).toBeTruthy();
  expect(typeof result.reply).toBe('string');
  expect(result.reply.length).toBeGreaterThan(10);
});
```

### 2.5 Comment Reply Posting

**FR-2.5.1**: Orchestrator SHALL post agent reply as threaded comment

**Priority**: Critical
**Description**: Post worker's reply as comment with correct parent_id to create thread
**Acceptance Criteria**:
- POST to /api/agent-posts/:postId/comments
- Include parent_id: commentId (original user comment)
- Include author_agent: agentId (selected agent)
- Include skipTicket: true (prevent infinite loop)
- Handle API errors gracefully
- Log successful reply posting

**API Call**:
```javascript
POST /api/agent-posts/{parentPostId}/comments
Headers: { 'Content-Type': 'application/json' }
Body: {
  content: workerResult.reply,
  author_agent: agentId,
  parent_id: commentId,         // Original comment being replied to
  skipTicket: true              // CRITICAL: Prevent infinite loop
}
```

**Implementation Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` new method `postCommentReply()`

**Test Requirements** (NO MOCKS):
```javascript
// Test: Comment reply posting
it('should post agent reply as threaded comment', async () => {
  const db = await openDatabase();

  // Create parent post
  const post = await dbSelector.createPost({
    title: 'Test Post',
    content: 'Test content',
    author_agent: 'user-123'
  });

  // Create user comment
  const userComment = await dbSelector.createComment({
    post_id: post.id,
    content: 'What is this?',
    author_agent: 'user-456',
    parent_id: null
  });

  // Post reply via orchestrator
  const orchestrator = new AviOrchestrator({}, workQueueRepo, wsService);
  const reply = await orchestrator.postCommentReply(
    post.id,
    userComment.id,
    'avi',
    'This is a test post demonstrating comment threading.'
  );

  // Verify reply created
  expect(reply).toBeTruthy();
  expect(reply.id).toBeTruthy();

  // Verify threading
  const comments = await dbSelector.getComments(post.id);
  const agentReply = comments.find(c => c.author_agent === 'avi');
  expect(agentReply).toBeTruthy();
  expect(agentReply.parent_id).toBe(userComment.id);
  expect(agentReply.content).toContain('test post');

  // Verify no ticket created
  const tickets = await workQueueRepo.getPendingTickets({ limit: 10 });
  const replyTicket = tickets.find(t => t.post_id === agentReply.id);
  expect(replyTicket).toBeUndefined();
});
```

### 2.6 WebSocket Event Broadcasting

**FR-2.6.1**: System SHALL broadcast comment:added events via WebSocket

**Priority**: High
**Description**: Extend WebSocket service to emit comment:added events for real-time UI updates
**Acceptance Criteria**:
- Add broadcastCommentAdded(data) method to websocket-service.js
- Emit to post-specific channel: `post:{postId}`
- Emit to global channel for all connected clients
- Include full comment data in event
- Include threading metadata (parent_id, depth)
- Event emitted immediately after comment creation

**Event Schema**:
```typescript
interface CommentAddedEvent {
  type: 'comment:added';
  postId: string;
  commentId: string;
  parentCommentId: string | null;
  author: string;
  authorType: 'user' | 'agent';
  content: string;
  depth: number;
  timestamp: string;
}
```

**Implementation Location**: `/workspaces/agent-feed/api-server/services/websocket-service.js` new method `broadcastCommentAdded()`

**Test Requirements** (NO MOCKS):
```javascript
// Test: WebSocket comment broadcast
it('should broadcast comment:added event via WebSocket', async (done) => {
  const db = await openDatabase();

  // Create post
  const post = await dbSelector.createPost({
    title: 'Test',
    content: 'Test',
    author_agent: 'user-123'
  });

  // Connect WebSocket client
  const client = io('http://localhost:3001');
  client.emit('subscribe:post', post.id);

  // Listen for comment event
  client.on('comment:added', (event) => {
    expect(event.type).toBe('comment:added');
    expect(event.postId).toBe(post.id);
    expect(event.commentId).toBeTruthy();
    expect(event.author).toBe('avi');
    expect(event.content).toBeTruthy();
    client.disconnect();
    done();
  });

  // Create comment (triggers broadcast)
  await dbSelector.createComment({
    post_id: post.id,
    content: 'Test comment',
    author_agent: 'avi'
  });
});
```

---

## 3. Non-Functional Requirements

### 3.1 Performance

**NFR-3.1.1**: Comment processing SHALL complete within acceptable timeframes

**Measurement**:
- Comment ticket detection: <10ms (in-memory check)
- Parent context loading: <100ms (single DB query)
- Agent routing decision: <50ms (string analysis)
- Worker processing: <30s (Claude API call)
- Reply posting: <200ms (single API call)
- WebSocket broadcast: <10ms (in-memory operation)
- **Total end-to-end**: <35s (p95)

**Validation**:
```javascript
it('should process comment ticket end-to-end within 35 seconds', async () => {
  const start = Date.now();

  // Create comment ticket
  const ticket = await createCommentTicket();

  // Start orchestrator
  const orchestrator = new AviOrchestrator({}, repo, ws);
  await orchestrator.start();

  // Wait for reply
  await waitForCondition(() => replyExists(ticket.post_id), 35000);

  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(35000);
});
```

**NFR-3.1.2**: System SHALL handle concurrent comment processing

**Requirements**:
- Support up to 5 concurrent comment workers (same as posts)
- No resource contention between post and comment workers
- Worker pool shared between post and comment tickets
- Graceful degradation under load (queue tickets)

**NFR-3.1.3**: Memory efficiency SHALL be maintained

**Requirements**:
- No memory leaks during comment processing
- Context objects cleaned up after worker completion
- WebSocket connections properly closed
- Database connections returned to pool

### 3.2 Reliability

**NFR-3.2.1**: Error handling SHALL be comprehensive

**Requirements**:
- Missing parent posts: Log warning, continue with partial context
- Agent routing failures: Fall back to 'avi'
- Worker processing errors: Mark ticket failed, log error
- Reply posting failures: Retry once, then fail ticket
- WebSocket broadcast failures: Log error, do not fail processing

**Error Recovery**:
```javascript
// Example: Parent post loading with fallback
try {
  parentPost = await dbSelector.getPostById(parentPostId);
} catch (error) {
  console.warn('Failed to load parent post:', error);
  parentPost = {
    id: parentPostId,
    title: 'Unknown Post',
    content: '',
    author: 'unknown'
  };
}
```

**NFR-3.2.2**: Infinite loop prevention SHALL be enforced

**Critical Requirement**:
- Agent replies MUST include skipTicket: true
- Backend MUST respect skipTicket flag
- Test MUST verify no tickets created for agent replies
- Orchestrator MUST never process its own replies

**Validation**:
```javascript
it('should prevent infinite loop with skipTicket flag', async () => {
  // Create user comment (creates ticket)
  const userComment = await createComment({ skipTicket: false });
  const userTicket = await getTicketForComment(userComment.id);
  expect(userTicket).toBeTruthy();

  // Agent replies (no ticket)
  const agentReply = await createComment({
    skipTicket: true,
    author_agent: 'avi'
  });
  const agentTicket = await getTicketForComment(agentReply.id);
  expect(agentTicket).toBeUndefined();
});
```

**NFR-3.2.3**: Data consistency SHALL be maintained

**Requirements**:
- Comment threading: parent_id always valid or null
- Ticket status: Atomic transitions (pending→in_progress→completed)
- Worker cleanup: Workers always removed from active map
- Database integrity: Foreign key constraints enforced

### 3.3 Backward Compatibility

**NFR-3.3.1**: Existing post processing SHALL remain unchanged

**Requirements**:
- Post tickets continue to work exactly as before
- No performance regression for posts
- Same worker pool, same logic for posts
- Post-related tests continue to pass

**Validation**:
```javascript
it('should not affect existing post processing', async () => {
  // Create post ticket (existing flow)
  const postTicket = await createPostTicket({
    content: 'Check out https://example.com'
  });

  // Process ticket
  const orchestrator = new AviOrchestrator({}, repo, ws);
  await orchestrator.start();

  // Wait for comment (existing behavior)
  await waitForCondition(() => commentExists(postTicket.post_id), 35000);

  // Verify post processing still works
  const comments = await getComments(postTicket.post_id);
  const agentComment = comments.find(c => c.author_agent === 'link-logger-agent');
  expect(agentComment).toBeTruthy();
  expect(agentComment.content).toContain('intelligence');
});
```

**NFR-3.3.2**: API endpoints SHALL remain backward compatible

**Requirements**:
- No breaking changes to POST /api/agent-posts/:postId/comments
- skipTicket field is optional (defaults to false)
- All existing fields continue to work
- New fields (if any) are optional

### 3.4 Observability

**NFR-3.4.1**: Logging SHALL provide debugging visibility

**Required Logs**:
```javascript
console.log('💬 Processing comment ticket: ${ticketId}');
console.log('📋 Loaded parent post: ${parentPost.title}');
console.log('🎯 Routing comment to agent: ${agentId}');
console.log('🤖 Spawning comment worker: ${workerId}');
console.log('✅ Posted reply as ${agentId}: ${replyId}');
console.log('📡 Broadcast comment:added event');
console.warn('⚠️ Failed to load parent post: ${error}');
console.error('❌ Comment processing failed: ${error}');
```

**NFR-3.4.2**: Metrics SHALL track comment processing

**Metrics to Capture**:
- commentsProcessed: Counter (total comments)
- commentProcessingDuration: Histogram (latency)
- commentRoutingDecisions: Counter per agent
- commentProcessingErrors: Counter by error type
- commentRepliesPosted: Counter

---

## 4. Current vs Target Architecture

### 4.1 Current Architecture (Posts Only)

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/agent-posts { content: "URL here" }              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Create Ticket: { type: 'post', url: extracted }            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  AVI Orchestrator (polls every 5s)                          │
│  - getPendingTickets()                                      │
│  - spawnWorker(ticket)                                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  AgentWorker (post mode)                                    │
│  - processURL(ticket.url)                                   │
│  - Extract intelligence from URL                            │
│  - Post intelligence as comment                             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  WebSocket: ticket:status:update                            │
│  Frontend updates status: pending → processing → completed  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Target Architecture (Posts + Comments)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                              │
│  Option 1: Create Post (existing)                                    │
│  Option 2: Create Comment (NEW)                                      │
└──────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼ (existing)                   ▼ (NEW)
     ┌──────────────────────────┐    ┌─────────────────────────────┐
     │  POST /api/agent-posts   │    │ POST /api/agent-posts/      │
     │  { content: "URL" }      │    │   :postId/comments          │
     │                          │    │ { content: "Question?" }    │
     └──────────────────────────┘    └─────────────────────────────┘
                    │                              │
                    ▼                              ▼
     ┌──────────────────────────┐    ┌─────────────────────────────┐
     │ Ticket: { type: 'post' } │    │ Ticket: {                   │
     │                          │    │   type: 'comment',          │
     │                          │    │   parent_post_id: X,        │
     │                          │    │   parent_comment_id: Y      │
     │                          │    │ }                           │
     └──────────────────────────┘    └─────────────────────────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AVI Orchestrator (polls every 5s)                                   │
│  - getPendingTickets()                                               │
│  - spawnWorker(ticket)                                               │
│    ├─ if (ticket.type === 'post') → POST MODE (existing)            │
│    └─ if (ticket.type === 'comment') → COMMENT MODE (NEW)           │
└──────────────────────────────────────────────────────────────────────┘
         │                                          │
         ▼ POST MODE                                ▼ COMMENT MODE (NEW)
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│ AgentWorker              │    │ processCommentTicket()               │
│  - processURL()          │    │  1. Load parent post context         │
│  - Extract intelligence  │    │  2. Route to agent                   │
│  - Post as comment       │    │     - @mentions → specific agent     │
│                          │    │     - keywords → domain agent        │
│                          │    │     - default → 'avi'                │
│                          │    │  3. Spawn AgentWorker (comment mode) │
│                          │    │  4. Worker.processComment()          │
│                          │    │     - Analyze question               │
│                          │    │     - Use parent context             │
│                          │    │     - Generate conversational reply  │
│                          │    │  5. Post reply with parent_id        │
│                          │    │  6. skipTicket: true (critical!)     │
└──────────────────────────┘    └──────────────────────────────────────┘
         │                                          │
         └──────────────┬───────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│  WebSocket Broadcasts (both modes)                                   │
│  - ticket:status:update (existing)                                   │
│  - comment:added (NEW)                                               │
│    { postId, commentId, parentCommentId, author, content }           │
└──────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend Updates (real-time)                                        │
│  - Status indicators                                                 │
│  - New comments appear instantly                                     │
│  - Threading UI updates                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Architectural Changes

**1. Ticket Type Discrimination**
- **Before**: All tickets processed identically
- **After**: Orchestrator checks ticket.post_metadata.type and routes accordingly

**2. Context Loading**
- **Before**: Tickets self-contained (just URL)
- **After**: Comment tickets require parent post context for intelligent responses

**3. Agent Routing**
- **Before**: Agent determined by post creation (link-logger-agent)
- **After**: Agent selected dynamically based on comment content and mentions

**4. Worker Modes**
- **Before**: Single mode (URL processing)
- **After**: Two modes (post mode + comment mode)

**5. Output Format**
- **Before**: Full intelligence report as comment
- **After**: Conversational reply text

**6. WebSocket Events**
- **Before**: Only ticket status updates
- **After**: Also comment:added events for real-time threading

---

## 5. Comment Routing Logic

### 5.1 Routing Decision Tree

```
Comment Content Analysis
│
├─ Check for @mentions
│  ├─ @page-builder|page-builder-agent → page-builder-agent
│  ├─ @skills|skills-architect → skills-architect-agent
│  ├─ @agent-architect → agent-architect-agent
│  └─ No mentions → Continue to keyword analysis
│
├─ Extract keywords (words >3 chars, not stopwords)
│  ├─ Match "page", "component", "ui", "layout", "tool" → page-builder-agent
│  ├─ Match "skill", "template", "pattern" → skills-architect-agent
│  ├─ Match "agent", "create", "build" → agent-architect-agent
│  └─ No keyword matches → Continue to default
│
└─ Default fallback → avi (general Q&A agent)
```

### 5.2 Routing Implementation

```javascript
/**
 * Route comment to appropriate agent based on content analysis
 * @param {string} content - Comment text
 * @param {Object} metadata - Comment metadata
 * @returns {string} Agent ID
 */
routeCommentToAgent(content, metadata) {
  const lowerContent = content.toLowerCase();

  // Priority 1: Direct @mentions
  if (lowerContent.includes('@page-builder') || lowerContent.includes('page-builder-agent')) {
    return 'page-builder-agent';
  }
  if (lowerContent.includes('@skills') || lowerContent.includes('skills-architect')) {
    return 'skills-architect-agent';
  }
  if (lowerContent.includes('@agent-architect') || lowerContent.includes('create agent')) {
    return 'agent-architect-agent';
  }

  // Priority 2: Keyword analysis
  const keywords = this.extractKeywords(lowerContent);

  if (keywords.some(k => ['page', 'component', 'ui', 'layout', 'tool'].includes(k))) {
    return 'page-builder-agent';
  }
  if (keywords.some(k => ['skill', 'template', 'pattern'].includes(k))) {
    return 'skills-architect-agent';
  }
  if (keywords.some(k => ['agent', 'create', 'build'].includes(k))) {
    return 'agent-architect-agent';
  }

  // Priority 3: Default fallback
  return 'avi';
}

/**
 * Extract keywords from text for routing
 * @param {string} text - Input text
 * @returns {string[]} Keywords
 */
extractKeywords(text) {
  const words = text.split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'what', 'how', 'does', 'is', 'are', 'have', 'has'];
  return words.filter(w => w.length > 3 && !stopWords.includes(w));
}
```

### 5.3 Routing Examples

| Comment Content | Detected Pattern | Routed Agent |
|----------------|------------------|--------------|
| "@page-builder create a login form" | @mention | page-builder-agent |
| "How do I create a new skill?" | keyword: skill, create | skills-architect-agent |
| "Can you build me an agent for X?" | keyword: build, agent | agent-architect-agent |
| "What is this article about?" | no pattern | avi |
| "I need a page with a dashboard layout" | keyword: page, layout | page-builder-agent |
| "@skills please help with templates" | @mention | skills-architect-agent |

---

## 6. Agent Selection Algorithm

### 6.1 Algorithm Pseudocode

```
FUNCTION selectAgent(comment, metadata):
  content = comment.content.toLowerCase()

  // Phase 1: Direct mention detection
  FOR EACH agentPattern IN mentionPatterns:
    IF content CONTAINS agentPattern.pattern:
      RETURN agentPattern.agent

  // Phase 2: Keyword extraction
  words = extractWords(content)
  keywords = filterStopWords(words)

  // Phase 3: Keyword matching
  FOR EACH agent IN agentKeywordMap:
    FOR EACH keyword IN keywords:
      IF agent.keywords CONTAINS keyword:
        RETURN agent.id

  // Phase 4: Default fallback
  RETURN 'avi'
```

### 6.2 Configuration-Driven Routing

```javascript
// Agent routing configuration
const AGENT_ROUTING_CONFIG = {
  mentions: [
    { pattern: /@page-builder|page-builder-agent/i, agent: 'page-builder-agent' },
    { pattern: /@skills|skills-architect/i, agent: 'skills-architect-agent' },
    { pattern: /@agent-architect|create agent/i, agent: 'agent-architect-agent' }
  ],

  keywords: {
    'page-builder-agent': ['page', 'component', 'ui', 'layout', 'tool', 'interface'],
    'skills-architect-agent': ['skill', 'template', 'pattern', 'framework'],
    'agent-architect-agent': ['agent', 'create', 'build', 'develop']
  },

  stopWords: ['the', 'a', 'an', 'what', 'how', 'does', 'is', 'are', 'have', 'has', 'can', 'could', 'would'],

  default: 'avi'
};
```

### 6.3 Future Enhancements

**Phase 2 Routing Features**:
- Machine learning-based intent classification
- User preference learning (user X always wants agent Y)
- Multi-agent responses for complex questions
- Agent capability matching (route based on agent skills)

---

## 7. WebSocket Event Schema

### 7.1 New Event: comment:added

```typescript
interface CommentAddedEvent {
  type: 'comment:added';
  postId: string;
  commentId: string;
  parentCommentId: string | null;
  author: string;
  authorType: 'user' | 'agent';
  content: string;
  depth: number;
  timestamp: string;
}
```

**Example**:
```json
{
  "type": "comment:added",
  "postId": "post-uuid-123",
  "commentId": "comment-uuid-456",
  "parentCommentId": "comment-uuid-789",
  "author": "avi",
  "authorType": "agent",
  "content": "This article discusses AI advancements...",
  "depth": 1,
  "timestamp": "2025-10-27T10:30:00Z"
}
```

### 7.2 Broadcasting Implementation

```javascript
/**
 * Broadcast comment:added event via WebSocket
 * @param {Object} data - Comment data
 */
broadcastCommentAdded(data) {
  if (!this.io || !this.initialized) {
    console.warn('Cannot broadcast: WebSocket service not initialized');
    return;
  }

  const event = {
    type: 'comment:added',
    postId: data.postId,
    commentId: data.commentId,
    parentCommentId: data.parentCommentId || null,
    author: data.author,
    authorType: data.author.includes('agent') ? 'agent' : 'user',
    content: data.content,
    depth: data.depth || 0,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all connected clients
  this.io.emit('comment:added', event);

  // Broadcast to post-specific subscribers
  this.io.to(`post:${event.postId}`).emit('comment:added', event);

  console.log(`📡 Broadcast comment:added - Comment: ${event.commentId}, Post: ${event.postId}`);
}
```

### 7.3 Client Subscription Pattern

```typescript
// Frontend: Subscribe to post-specific comments
socket.on('connect', () => {
  socket.emit('subscribe:post', postId);
});

// Listen for comment events
socket.on('comment:added', (event: CommentAddedEvent) => {
  if (event.postId === currentPostId) {
    addCommentToUI(event);
  }
});

// Cleanup on unmount
socket.emit('unsubscribe:post', postId);
socket.disconnect();
```

---

## 8. Success Criteria

### 8.1 Functional Validation

**F-1**: Comment ticket detection
- [ ] Orchestrator detects comment tickets by type: 'comment'
- [ ] Comment tickets routed to comment processing path
- [ ] Post tickets continue to use existing path

**F-2**: Context loading
- [ ] Parent post loaded for comment processing
- [ ] Parent post title, content, author available to worker
- [ ] Missing parent posts handled gracefully

**F-3**: Agent routing
- [ ] @mentions route to correct agent (100% accuracy)
- [ ] Keywords route to relevant agent (>80% accuracy)
- [ ] Default routing works for general questions

**F-4**: Comment processing
- [ ] Worker processes comment in comment mode
- [ ] Worker uses parent post context
- [ ] Worker generates conversational reply
- [ ] Reply is contextually relevant

**F-5**: Reply posting
- [ ] Reply posted as threaded comment
- [ ] parent_id correctly set
- [ ] skipTicket flag prevents infinite loop
- [ ] Reply appears in comment thread

**F-6**: WebSocket broadcasting
- [ ] comment:added event emitted on reply
- [ ] Event includes all required fields
- [ ] Event received by subscribed clients
- [ ] Frontend UI updates in real-time

### 8.2 Performance Validation

**P-1**: Latency targets
- [ ] Comment detection: <10ms
- [ ] Context loading: <100ms
- [ ] Agent routing: <50ms
- [ ] Worker processing: <30s
- [ ] Reply posting: <200ms
- [ ] Total end-to-end: <35s (p95)

**P-2**: Concurrency
- [ ] 5 concurrent comment workers supported
- [ ] Mixed post/comment processing works
- [ ] No deadlocks or race conditions
- [ ] Graceful degradation under load

**P-3**: Resource usage
- [ ] No memory leaks during 1-hour test
- [ ] Database connections properly pooled
- [ ] WebSocket connections cleaned up
- [ ] Context objects garbage collected

### 8.3 Reliability Validation

**R-1**: Error handling
- [ ] Missing parent posts logged, processing continues
- [ ] Worker errors mark ticket as failed
- [ ] Reply posting errors retry once
- [ ] WebSocket errors do not fail processing

**R-2**: Infinite loop prevention
- [ ] Agent replies do NOT create tickets
- [ ] skipTicket flag always included
- [ ] Backend respects skipTicket
- [ ] No agent-to-agent reply loops

**R-3**: Data consistency
- [ ] Comment threading always valid
- [ ] Ticket status transitions atomic
- [ ] Workers cleaned up on completion
- [ ] Database constraints enforced

### 8.4 Integration Validation

**I-1**: Backward compatibility
- [ ] Post processing unchanged
- [ ] Post tests continue to pass
- [ ] No performance regression for posts
- [ ] API endpoints backward compatible

**I-2**: End-to-end workflows
- [ ] User posts → agent comments (existing flow works)
- [ ] User comments → agent replies (new flow works)
- [ ] Multiple reply threads work
- [ ] Real-time updates across clients

---

## 9. Test Requirements (NO MOCKS)

### 9.1 Integration Test Suite

**Test File**: `/workspaces/agent-feed/tests/integration/comment-processing.test.js`

**Required Tests**:

```javascript
describe('AVI Orchestrator - Comment Processing', () => {
  let db, orchestrator, workQueueRepo, wsService;

  beforeEach(async () => {
    db = await openDatabase();
    workQueueRepo = new WorkQueueRepository(db);
    wsService = new WebSocketService();
    orchestrator = new AviOrchestrator({}, workQueueRepo, wsService);
  });

  afterEach(async () => {
    await orchestrator.stop();
    await db.close();
  });

  describe('Comment Ticket Detection', () => {
    it('should detect comment tickets by type discriminator', async () => {
      // Create comment ticket
      const ticket = await workQueueRepo.createTicket({
        post_metadata: { type: 'comment', parent_post_id: 'post-123' }
      });

      // Start orchestrator
      await orchestrator.start();

      // Wait for processing
      await waitForCondition(() => ticket.status === 'in_progress', 10000);

      // Verify comment path taken
      const logs = getOrchestatorLogs();
      expect(logs).toContain('Processing comment ticket');
    });

    it('should continue processing post tickets normally', async () => {
      // Create post ticket
      const ticket = await workQueueRepo.createTicket({
        post_metadata: { type: 'post' }
      });

      await orchestrator.start();
      await waitForCondition(() => ticket.status === 'in_progress', 10000);

      const logs = getOrchestatorLogs();
      expect(logs).not.toContain('Processing comment ticket');
    });
  });

  describe('Parent Context Loading', () => {
    it('should load parent post context for comments', async () => {
      // Create parent post
      const post = await dbSelector.createPost({
        title: 'AI News',
        content: 'https://example.com/ai',
        author_agent: 'user-123'
      });

      // Create comment
      const comment = await dbSelector.createComment({
        post_id: post.id,
        content: 'What is this about?',
        author_agent: 'user-456'
      });

      // Create ticket
      const ticket = await workQueueRepo.createTicket({
        post_id: comment.id,
        post_metadata: { type: 'comment', parent_post_id: post.id }
      });

      // Load context
      const context = await orchestrator.loadCommentContext(ticket);

      expect(context.comment.id).toBe(comment.id);
      expect(context.parentPost.id).toBe(post.id);
      expect(context.parentPost.title).toBe('AI News');
    });

    it('should handle missing parent posts gracefully', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_metadata: { type: 'comment', parent_post_id: 'nonexistent' }
      });

      const context = await orchestrator.loadCommentContext(ticket);

      expect(context.parentPost.id).toBe('nonexistent');
      expect(context.parentPost.title).toBe('Unknown Post');
    });
  });

  describe('Agent Routing', () => {
    it('should route to agent via @mention', () => {
      const agent = orchestrator.routeCommentToAgent(
        '@page-builder create a form',
        {}
      );
      expect(agent).toBe('page-builder-agent');
    });

    it('should route to agent via keywords', () => {
      const agent = orchestrator.routeCommentToAgent(
        'How do I create a skill template?',
        {}
      );
      expect(agent).toBe('skills-architect-agent');
    });

    it('should default to avi for general questions', () => {
      const agent = orchestrator.routeCommentToAgent(
        'What is this?',
        {}
      );
      expect(agent).toBe('avi');
    });
  });

  describe('Comment Processing', () => {
    it('should process comment and generate reply', async () => {
      const post = await dbSelector.createPost({
        title: 'AI Article',
        content: 'https://example.com/ai',
        author_agent: 'user-123'
      });

      const comment = await dbSelector.createComment({
        post_id: post.id,
        content: 'What are the key points?',
        author_agent: 'user-456'
      });

      const worker = new AgentWorker({
        mode: 'comment',
        context: {
          comment: { id: comment.id, content: comment.content },
          parentPost: { id: post.id, title: post.title, content: post.content }
        }
      });

      const result = await worker.processComment();

      expect(result.success).toBe(true);
      expect(result.reply).toBeTruthy();
      expect(typeof result.reply).toBe('string');
    });
  });

  describe('Reply Posting', () => {
    it('should post agent reply as threaded comment', async () => {
      const post = await dbSelector.createPost({
        title: 'Test',
        content: 'Test',
        author_agent: 'user-123'
      });

      const userComment = await dbSelector.createComment({
        post_id: post.id,
        content: 'Question?',
        author_agent: 'user-456'
      });

      const reply = await orchestrator.postCommentReply(
        post.id,
        userComment.id,
        'avi',
        'Here is the answer.'
      );

      expect(reply.id).toBeTruthy();

      const comments = await dbSelector.getComments(post.id);
      const agentReply = comments.find(c => c.author_agent === 'avi');
      expect(agentReply.parent_id).toBe(userComment.id);
    });

    it('should prevent infinite loop with skipTicket', async () => {
      const post = await dbSelector.createPost({ /*...*/ });
      const userComment = await dbSelector.createComment({ skipTicket: false });

      const userTicket = await getTicketForComment(userComment.id);
      expect(userTicket).toBeTruthy();

      const agentReply = await orchestrator.postCommentReply(
        post.id, userComment.id, 'avi', 'Reply'
      );

      const agentTicket = await getTicketForComment(agentReply.id);
      expect(agentTicket).toBeUndefined();
    });
  });

  describe('WebSocket Broadcasting', () => {
    it('should broadcast comment:added event', async (done) => {
      const post = await dbSelector.createPost({ /*...*/ });

      const client = io('http://localhost:3001');
      client.emit('subscribe:post', post.id);

      client.on('comment:added', (event) => {
        expect(event.type).toBe('comment:added');
        expect(event.postId).toBe(post.id);
        client.disconnect();
        done();
      });

      await dbSelector.createComment({
        post_id: post.id,
        content: 'Test',
        author_agent: 'avi'
      });
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full comment processing flow', async () => {
      // 1. Create parent post
      const post = await dbSelector.createPost({
        title: 'AI News',
        content: 'https://example.com/ai-news',
        author_agent: 'user-123'
      });

      // 2. Create user comment (creates ticket)
      const comment = await dbSelector.createComment({
        post_id: post.id,
        content: '@page-builder can you help?',
        author_agent: 'user-456'
      });

      // 3. Start orchestrator
      await orchestrator.start();

      // 4. Wait for agent reply
      await waitForCondition(async () => {
        const comments = await dbSelector.getComments(post.id);
        return comments.some(c => c.author_agent === 'page-builder-agent');
      }, 35000);

      // 5. Verify reply
      const comments = await dbSelector.getComments(post.id);
      const agentReply = comments.find(c => c.author_agent === 'page-builder-agent');
      expect(agentReply).toBeTruthy();
      expect(agentReply.parent_id).toBe(comment.id);
      expect(agentReply.content).toBeTruthy();

      // 6. Verify no ticket for agent reply
      const agentTicket = await getTicketForComment(agentReply.id);
      expect(agentTicket).toBeUndefined();
    });
  });
});
```

### 9.2 Test Utilities

**Required Helper Functions**:

```javascript
// Wait for condition with timeout
async function waitForCondition(condition, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Condition not met within timeout');
}

// Get ticket for comment
async function getTicketForComment(commentId) {
  const tickets = await workQueueRepo.getPendingTickets({ limit: 100 });
  return tickets.find(t => t.post_id === commentId);
}

// Get orchestrator logs (mock console.log)
function getOrchestatorLogs() {
  // Implementation depends on logging setup
}
```

### 9.3 Test Coverage Requirements

**Minimum Coverage**:
- Unit tests: >80% coverage
- Integration tests: All critical paths
- Edge cases: All identified scenarios

**Critical Paths**:
- Comment detection → routing → processing → reply posting
- Error handling at each step
- Infinite loop prevention
- WebSocket broadcasting

---

## 10. Implementation Plan

### 10.1 Files to Modify

**Primary Changes**:
1. `/workspaces/agent-feed/api-server/avi/orchestrator.js`
   - Add comment ticket detection logic (line 159)
   - Add `processCommentTicket()` method
   - Add `routeCommentToAgent()` method
   - Add `extractKeywords()` method
   - Add `postCommentReply()` method

2. `/workspaces/agent-feed/api-server/worker/agent-worker.js`
   - Add comment mode support to constructor
   - Add `processComment()` method
   - Modify execute() to check mode

3. `/workspaces/agent-feed/api-server/services/websocket-service.js`
   - Add `broadcastCommentAdded()` method
   - Add comment:added event emission

**Test Files**:
4. `/workspaces/agent-feed/tests/integration/comment-processing.test.js` (NEW)
   - All integration tests for comment processing

### 10.2 Implementation Sequence

**Phase 1: Detection & Routing** (30 mins)
- [ ] Add comment ticket detection to orchestrator
- [ ] Implement routeCommentToAgent() method
- [ ] Implement extractKeywords() helper
- [ ] Add logging for debugging
- [ ] Write routing tests

**Phase 2: Context Loading** (20 mins)
- [ ] Implement processCommentTicket() method
- [ ] Add parent post loading logic
- [ ] Add error handling for missing parents
- [ ] Write context loading tests

**Phase 3: Worker Comment Mode** (45 mins)
- [ ] Add mode parameter to AgentWorker
- [ ] Add context parameter to AgentWorker
- [ ] Implement processComment() method
- [ ] Update Claude prompt for conversational replies
- [ ] Write worker tests

**Phase 4: Reply Posting** (20 mins)
- [ ] Implement postCommentReply() method
- [ ] Ensure skipTicket flag included
- [ ] Add error handling for API failures
- [ ] Write reply posting tests

**Phase 5: WebSocket Events** (15 mins)
- [ ] Add broadcastCommentAdded() to websocket service
- [ ] Call from postCommentReply()
- [ ] Write WebSocket tests

**Phase 6: Integration Testing** (30 mins)
- [ ] Write end-to-end test
- [ ] Test infinite loop prevention
- [ ] Test concurrent processing
- [ ] Test error scenarios

**Total Estimated Time**: 2.5 hours

### 10.3 Rollout Strategy

**Development**:
1. Implement changes on feature branch
2. Run full test suite (NO MOCKS)
3. Manual testing with real agents
4. Code review

**Staging**:
1. Deploy to staging environment
2. Test with production-like data
3. Verify WebSocket events
4. Performance testing

**Production**:
1. Deploy during low-traffic window
2. Monitor orchestrator logs
3. Monitor error rates
4. Monitor response times
5. Gradual rollout (can disable via feature flag if needed)

---

## 11. Constraints and Assumptions

### 11.1 Technical Constraints

**Must Use**:
- Existing polling system (5-second interval)
- Existing work_queue table schema
- Existing WebSocket infrastructure
- Existing AgentWorker class

**Cannot Change**:
- Database schema (comments table already exists)
- API endpoint signatures (backward compatibility)
- Post processing logic (must remain untouched)

### 11.2 Assumptions

**Infrastructure**:
- Database supports transactions
- WebSocket service is always initialized
- Claude Code SDK is available
- Agent markdown files exist

**Data**:
- Comment tickets always have post_metadata field
- parent_post_id is always valid or null
- Agent IDs match markdown file names

**Performance**:
- Claude API responds within 30 seconds
- Database queries complete within 100ms
- Network latency <50ms

### 11.3 Dependencies

**External**:
- Claude Code SDK (for agent responses)
- Socket.IO (for WebSocket events)
- SQLite/PostgreSQL (for data persistence)

**Internal**:
- dbSelector (database abstraction)
- workQueueRepository (ticket management)
- websocketService (real-time events)

---

## 12. Risk Analysis

### 12.1 Technical Risks

**Risk 1: Infinite Loop**
- **Probability**: Medium
- **Impact**: Critical
- **Mitigation**: skipTicket flag, comprehensive tests, monitoring
- **Detection**: Ticket count explosion, database growth

**Risk 2: Worker Pool Starvation**
- **Probability**: Low
- **Impact**: High
- **Mitigation**: Shared pool, priority queuing, max workers limit
- **Detection**: Increasing ticket queue size

**Risk 3: Claude API Rate Limiting**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Rate limiting, retry logic, error handling
- **Detection**: 429 errors, increased latency

**Risk 4: WebSocket Disconnections**
- **Probability**: High
- **Impact**: Low
- **Mitigation**: Non-critical feature, graceful degradation
- **Detection**: Connection error logs

### 12.2 Operational Risks

**Risk 5: Agent Routing Errors**
- **Probability**: Medium
- **Impact**: Low
- **Mitigation**: Default to 'avi', log routing decisions
- **Detection**: User complaints, incorrect agent responses

**Risk 6: Missing Parent Posts**
- **Probability**: Low
- **Impact**: Low
- **Mitigation**: Graceful fallback, log warnings
- **Detection**: Warning logs, generic responses

**Risk 7: Database Performance**
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**: Indexed queries, connection pooling
- **Detection**: Slow query logs, high latency

### 12.3 Business Risks

**Risk 8: Poor Agent Responses**
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Agent prompt tuning, context quality, user feedback
- **Detection**: User complaints, low engagement

---

## 13. Monitoring and Observability

### 13.1 Logs to Add

**Orchestrator Logs**:
```
💬 Processing comment ticket: ${ticketId} (type: comment)
📋 Loaded parent post: ${parentPost.title} (${parentPost.id})
🎯 Routing comment to agent: ${agentId} (reason: ${reason})
🤖 Spawning comment worker: ${workerId} for agent ${agentId}
✅ Posted reply as ${agentId}: ${replyId}
📡 Broadcast comment:added event for ${commentId}
⚠️  Failed to load parent post ${parentPostId}: ${error}
❌ Comment processing failed for ticket ${ticketId}: ${error}
```

**Worker Logs**:
```
💬 Worker ${workerId} processing comment ${commentId}
📝 Generated reply (${replyLength} chars)
✅ Comment processing completed: ${commentId}
❌ Comment processing error: ${error}
```

### 13.2 Metrics to Track

**Counters**:
- `comment_tickets_processed`: Total comment tickets
- `comment_routing_decisions`: Per agent
- `comment_replies_posted`: Successful replies
- `comment_processing_errors`: By error type

**Histograms**:
- `comment_processing_duration_ms`: Total latency
- `comment_context_load_duration_ms`: Context loading time
- `comment_worker_duration_ms`: Worker processing time
- `comment_reply_post_duration_ms`: Reply posting time

**Gauges**:
- `active_comment_workers`: Current count
- `pending_comment_tickets`: Queue size

### 13.3 Alerts to Configure

**Critical**:
- Infinite loop detected (ticket count >100 in 1 minute)
- Worker pool exhausted (>50% for >5 minutes)
- High error rate (>10% for >5 minutes)

**Warning**:
- High latency (>45s p95 for >10 minutes)
- WebSocket disconnections (>10/minute)
- Missing parent posts (>5% of tickets)

---

## 14. Future Enhancements

### 14.1 Phase 2 Features

**Multi-Agent Collaboration**:
- Route complex questions to multiple agents
- Aggregate responses from multiple agents
- Agent-to-agent consultation

**Advanced Routing**:
- Machine learning-based intent classification
- User preference learning
- Context-aware routing (thread history)

**Performance Optimizations**:
- Parent post caching
- Agent response caching
- Parallel worker processing

### 14.2 Phase 3 Features

**Rich Interactions**:
- Code snippet formatting
- Image attachments in replies
- Interactive elements (buttons, forms)

**Analytics**:
- Agent response quality scoring
- User satisfaction tracking
- Popular question patterns

**Scalability**:
- Distributed orchestrator
- Redis-based work queue
- Load balancing across workers

---

## 15. Acceptance Checklist

### 15.1 Functional Acceptance

- [ ] Comment tickets detected by orchestrator
- [ ] Parent post context loaded correctly
- [ ] Agent routing works (mentions, keywords, default)
- [ ] Comment mode worker generates replies
- [ ] Replies posted with correct threading
- [ ] skipTicket prevents infinite loops
- [ ] WebSocket events broadcast correctly
- [ ] Post processing still works

### 15.2 Non-Functional Acceptance

- [ ] End-to-end latency <35s (p95)
- [ ] No memory leaks in 1-hour test
- [ ] All errors handled gracefully
- [ ] Logs provide debugging visibility
- [ ] Metrics tracked correctly

### 15.3 Testing Acceptance

- [ ] All unit tests pass (NO MOCKS)
- [ ] All integration tests pass
- [ ] Edge cases tested
- [ ] End-to-end flow tested
- [ ] Infinite loop prevention verified

### 15.4 Documentation Acceptance

- [ ] Code comments added
- [ ] README updated
- [ ] API documentation updated
- [ ] Deployment guide updated

---

## 16. Appendices

### Appendix A: Related Specifications

- [SPARC Comment Hooks Specification](/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-SPEC.md) - Frontend React hooks
- [Comment Reply Final Validation](/workspaces/agent-feed/docs/COMMENT-REPLY-FINAL-VALIDATION.md) - Previous work
- [Username Collection Specification](/workspaces/agent-feed/docs/SPARC-USERNAME-SPEC.md) - User identification

### Appendix B: Database Schema

```sql
-- Comments table (existing)
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_agent TEXT,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Work queue table (existing)
CREATE TABLE work_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    post_id TEXT,
    post_content TEXT,
    post_author TEXT,
    post_metadata TEXT,  -- JSON: { type: 'comment', parent_post_id, ... }
    assigned_agent TEXT,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Appendix C: Example Ticket Payloads

**Post Ticket** (existing):
```json
{
  "id": 123,
  "user_id": "user-123",
  "post_id": "post-uuid",
  "post_content": "Check out https://example.com",
  "post_author": "user-123",
  "post_metadata": {
    "type": "post"
  },
  "assigned_agent": null,
  "priority": 5,
  "status": "pending"
}
```

**Comment Ticket** (new):
```json
{
  "id": 456,
  "user_id": "user-456",
  "post_id": "comment-uuid",
  "post_content": "@page-builder can you help?",
  "post_author": "user-456",
  "post_metadata": {
    "type": "comment",
    "parent_post_id": "post-uuid",
    "parent_post_title": "AI News",
    "parent_post_content": "https://example.com/ai-news",
    "parent_comment_id": null,
    "mentioned_users": ["@page-builder"],
    "depth": 0
  },
  "assigned_agent": null,
  "priority": 5,
  "status": "pending"
}
```

---

## Document Approval

**Prepared By**: Claude Code SPARC Specification Agent
**Date**: 2025-10-27
**Version**: 1.0.0

**Review Status**: Ready for Technical Review

**Next Steps**:
1. Technical review by development team
2. Stakeholder approval
3. Proceed to Pseudocode phase (SPARC step 2)
4. Architecture design (SPARC step 3)
5. Implementation with TDD (SPARC step 4)
6. Completion and integration (SPARC step 5)

**Estimated Implementation Time**: 2.5 hours
**Complexity**: Medium
**Risk Level**: Medium (infinite loop risk mitigated by skipTicket)
