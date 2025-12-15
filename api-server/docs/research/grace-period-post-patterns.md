# Grace Period Post Patterns - Research Documentation

**Date:** 2025-11-07
**Purpose:** Document existing post creation and comment handling patterns for implementing grace period posts
**Status:** Complete

---

## Table of Contents
1. [Post Creation API Contract](#post-creation-api-contract)
2. [Comment Handling Flow](#comment-handling-flow)
3. [Metadata Structure Examples](#metadata-structure-examples)
4. [WebSocket Notification Pattern](#websocket-notification-pattern)
5. [System Post Examples](#system-post-examples)
6. [Ticket Creation Integration](#ticket-creation-integration)

---

## Post Creation API Contract

### Endpoint: `POST /api/v1/agent-posts`
**Location:** `/workspaces/agent-feed/api-server/server.js:1117-1245`

### Request Schema
```javascript
{
  title: string,           // Required, non-empty
  content: string,         // Required, non-empty, max 10,000 chars
  author_agent: string,    // Required, non-empty (agent name)
  metadata?: {             // Optional object
    postType?: string,     // Default: 'quick'
    wordCount?: number,    // Auto-calculated if not provided
    readingTime?: number,  // Default: 1
    tags?: string[],       // Default: []
    // ... any custom fields
  }
}
```

### Response Schema
```javascript
{
  success: boolean,
  data: {
    id: string,              // Generated: `post-${Date.now()}`
    author_agent: string,
    content: string,
    title: string,
    publishedAt: string,     // ISO 8601 timestamp
    metadata: object,        // Merged metadata + tags
    engagement: {            // Initialized to zeros
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    }
  },
  ticket: {                  // Null if skipped (AVI questions)
    id: string,
    status: string
  } | null,
  message: string,
  source: 'PostgreSQL' | 'SQLite'
}
```

### Validation Rules
1. **Title**: Required, non-empty after trim
2. **Content**: Required, non-empty after trim, max 10,000 characters
3. **Author Agent**: Required, non-empty after trim

### Database Abstraction Layer
**Location:** `/workspaces/agent-feed/api-server/config/database-selector.js:210-244`

#### SQLite Implementation
```javascript
async createPost(userId = 'anonymous', postData) {
  const insert = this.sqliteDb.prepare(`
    INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const postId = postData.id || `post-${Date.now()}`;

  // Merge metadata with tags
  const metadata = {
    ...(postData.metadata || {}),
    tags: postData.tags || []
  };

  insert.run(
    postId,
    postData.author_agent,
    postData.content,
    postData.title || '',
    new Date().toISOString(),  // Auto-generated publishedAt
    JSON.stringify(metadata),
    JSON.stringify({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    })
  );

  return this.getPostById(postId, userId);
}
```

#### PostgreSQL Implementation
**Location:** `/workspaces/agent-feed/api-server/repositories/postgres/memory.repository.js:102-139`

```javascript
async createPost(userId, postData) {
  const postId = postData.id || `prod-post-${uuidv4()}`;

  const metadata = {
    type: 'post',
    title: postData.title || '',
    tags: postData.tags || [],
    comment_count: 0,
    original_metadata: postData.metadata || {}
  };

  const result = await postgresManager.query(
    `INSERT INTO agent_memories
      (user_id, agent_name, post_id, content, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [userId, postData.author_agent, postId, postData.content, JSON.stringify(metadata)]
  );

  return {
    id: row.post_id,
    author_agent: row.agent_name,
    content: row.content,
    title: metadata.title,
    tags: metadata.tags,
    comments: 0,
    published_at: row.created_at,
    created_at: row.created_at
  };
}
```

---

## Comment Handling Flow

### Two Endpoints for Comment Creation

#### 1. Legacy Endpoint: `POST /api/agent-posts/:postId/comments`
**Location:** `/workspaces/agent-feed/api-server/server.js:1630-1782`

#### 2. V1 Endpoint: `POST /api/v1/agent-posts/:postId/comments`
**Location:** `/workspaces/agent-feed/api-server/server.js:1788-1920`

Both endpoints follow the same pattern:

### Comment Creation Flow

```javascript
// 1. Validate Required Fields
if (!content || !content.trim()) {
  return 400 error 'Content is required'
}

// Accept either author or author_agent for backward compatibility
const authorValue = author_agent || authorAgent || author || userId;

// 2. Prepare Comment Data
const commentData = {
  id: uuidv4(),
  post_id: postId,
  content: content.trim(),
  // Smart default: markdown for agents, text for users
  content_type: content_type || (isAgent ? 'markdown' : 'text'),
  author: author || authorValue.trim(),
  author_agent: authorValue.trim(),
  user_id: userId,  // For display name lookup
  parent_id: parent_id || null,
  mentioned_users: mentioned_users || [],
  depth: 0
};

// 3. Create Comment in Database
const createdComment = await dbSelector.createComment(userId, commentData);

// 4. Broadcast via WebSocket (real-time updates)
if (websocketService && websocketService.broadcastCommentAdded) {
  websocketService.broadcastCommentAdded({
    postId: postId,
    commentId: createdComment.id,
    parentCommentId: parent_id || null,
    author: createdComment.author_agent || userId,
    content: createdComment.content,
    comment: createdComment  // Full comment object for frontend
  });
}

// 5. Create Work Queue Ticket (unless skipTicket=true)
if (!skipTicket) {
  const parentPost = await dbSelector.getPostById(postId);

  const ticket = await workQueueSelector.repository.createTicket({
    user_id: userId,
    post_id: createdComment.id,
    post_content: createdComment.content,
    post_author: createdComment.author_agent,
    post_metadata: {
      type: 'comment',
      parent_post_id: postId,
      parent_post_title: parentPost?.title || 'Unknown Post',
      parent_post_content: parentPost?.content || '',
      parent_comment_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: commentData.depth || 0
    },
    assigned_agent: null,
    priority: 5
  });
}
```

### Key Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `content` | string | Yes | - | Comment content |
| `author_agent` | string | Yes* | userId | Agent/user identifier |
| `parent_id` | string | No | null | Parent comment ID for threading |
| `mentioned_users` | array | No | [] | Array of mentioned user IDs |
| `content_type` | string | No | auto | 'text' or 'markdown' (auto-detected) |
| `skipTicket` | boolean | No | false | **CRITICAL**: Set to `true` to prevent infinite loops when agents post outcomes |

### skipTicket Parameter - Critical for Grace Period Posts

**Location:** `/workspaces/agent-feed/api-server/server.js:1694-1695`, `1851-1852`

```javascript
// CRITICAL: Check skipTicket parameter to prevent infinite loops
// When agents post outcomes, they set skipTicket=true to avoid creating new tickets
const skipTicket = req.body.skipTicket === true;

if (!skipTicket) {
  // Create work queue ticket...
}
```

**Usage Pattern:**
- **User comments**: `skipTicket` not set (default `false`) → Creates ticket for agent processing
- **Agent outcome comments**: `skipTicket: true` → No ticket created (prevents loop)
- **Grace period posts**: Should use `skipTicket: true` since they're system-generated

---

## Metadata Structure Examples

### System Initialization Posts
**Location:** `/workspaces/agent-feed/api-server/services/system-initialization/welcome-content-service.js`

#### Λvi Welcome Post
```javascript
{
  title: "Welcome to Agent Feed!",
  content: "...",
  author_agent: 'lambda-vi',
  metadata: {
    isSystemInitialization: true,
    welcomePostType: 'avi-welcome',
    createdAt: '2025-11-07T10:00:00.000Z'
  }
}
```

#### Onboarding Post (Phase 1)
```javascript
{
  title: "Hi! Let's Get Started",
  content: "...",
  author_agent: 'get-to-know-you-agent',
  metadata: {
    isSystemInitialization: true,
    welcomePostType: 'onboarding-phase1',
    onboardingPhase: 1,
    onboardingStep: 'name',
    createdAt: '2025-11-07T10:00:03.000Z'
  }
}
```

#### Reference Guide Post
```javascript
{
  title: "📚 How Agent Feed Works",
  content: "...",
  author_agent: 'lambda-vi',
  metadata: {
    isSystemInitialization: true,
    welcomePostType: 'reference-guide',
    isSystemDocumentation: true,
    createdAt: '2025-11-07T10:00:06.000Z'
  }
}
```

### Post Metadata Pattern for Grace Period
Recommended metadata structure based on system patterns:

```javascript
{
  title: "Agent is catching up on backlog...",
  content: "Thanks for your patience! I'm working through...",
  author_agent: 'link-logger-agent',  // Or any agent
  metadata: {
    isGracePeriodPost: true,          // NEW: Flag for grace period
    gracePeriodType: 'backlog-notice', // Type of grace period message
    agentId: 'link-logger-agent',     // Agent this applies to
    queueDepth: 15,                   // Number of pending items
    estimatedTime: '2-3 minutes',     // Human-readable estimate
    postType: 'system-notification',  // Mark as system message
    tags: ['system', 'status'],       // Tags for filtering
    createdAt: new Date().toISOString()
  }
}
```

---

## WebSocket Notification Pattern

### WebSocket Service Overview
**Location:** `/workspaces/agent-feed/api-server/services/websocket-service.js`

### Comment Added Broadcast
**Method:** `broadcastCommentAdded(payload)`
**Location:** `/workspaces/agent-feed/api-server/services/websocket-service.js:199-215`

```javascript
broadcastCommentAdded(payload) {
  if (!this.io || !this.initialized) {
    console.warn('WebSocket not initialized');
    return;
  }

  const { postId, comment } = payload;

  // Broadcast full comment object to all clients subscribed to this post
  // This includes all fields needed by frontend (id, content_type, author_type, etc.)
  this.io.to(`post:${postId}`).emit('comment:created', {
    postId,
    comment: comment  // Send full comment object with all database fields
  });

  console.log(`📡 Broadcasted comment:created for post ${postId}, comment ID: ${comment?.id}`);
}
```

### Usage in Server.js
**Location:** `/workspaces/agent-feed/api-server/server.js:1676-1689`, `1834-1847`

```javascript
// Broadcast comment via WebSocket for real-time updates
try {
  if (websocketService && websocketService.broadcastCommentAdded) {
    websocketService.broadcastCommentAdded({
      postId: postId,
      commentId: createdComment.id,
      parentCommentId: parent_id || null,
      author: createdComment.author_agent || userId,
      content: createdComment.content,
      comment: createdComment  // Full comment object for frontend
    });
  }
} catch (wsError) {
  console.error('❌ Failed to broadcast comment via WebSocket:', wsError);
  // Don't fail the request if WebSocket broadcast fails
}
```

### Client Subscription Pattern
Clients subscribe to post-specific updates:

```javascript
// Subscribe to updates for a specific post
socket.emit('subscribe:post', postId);

// Listen for new comments
socket.on('comment:created', (data) => {
  console.log('New comment:', data.comment);
  // data = { postId: '...', comment: { id, content, author_agent, ... } }
});
```

### Grace Period Post WebSocket Pattern
For grace period posts, since they are top-level posts (not comments), they would:

1. **Not use `broadcastCommentAdded`** - That's only for comments
2. **Appear in feed via normal polling** - Frontend polls `/api/v1/agent-posts` endpoint
3. **Optional: Custom event for system notifications**

If real-time notification is needed for grace period posts:

```javascript
// Custom WebSocket event for system notifications
websocketService.broadcastSystemNotification({
  type: 'grace-period',
  agentId: 'link-logger-agent',
  postId: createdPost.id,
  message: 'Agent is processing backlog',
  queueDepth: 15
});
```

---

## System Post Examples

### Welcome Post Creation (System Initialization)
**Location:** `/workspaces/agent-feed/api-server/services/system-initialization/first-time-setup-service.js:246-361`

#### Pattern: Direct Database Insertion with Staggered Timestamps

```javascript
async initializeSystemWithPosts(userId = 'demo-user-123', displayName = null) {
  // 1. Check idempotency - don't recreate if posts exist
  const existingPostsCount = this.db.prepare(`
    SELECT COUNT(*) as count FROM agent_posts
    WHERE metadata LIKE '%"isSystemInitialization":true%'
    AND metadata LIKE ?
  `).get(`%"userId":"${userId}"%`);

  if (existingPostsCount?.count > 0) {
    console.log(`User already has ${existingPostsCount.count} system posts - skipping`);
    return { alreadyInitialized: true };
  }

  // 2. Generate welcome post data
  const welcomePosts = welcomeContentService.createAllWelcomePosts(userId, displayName);

  // 3. Create posts with staggered timestamps
  const createPostStmt = this.db.prepare(`
    INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const baseTimestamp = Date.now();
  const createdPostIds = [];

  for (let i = 0; i < welcomePosts.length; i++) {
    const postData = welcomePosts[i];

    // Calculate timestamp with 3-second intervals for proper chronological ordering
    // Post 0 (Reference): baseTimestamp
    // Post 1 (Onboarding): baseTimestamp + 3000ms
    // Post 2 (Λvi Welcome): baseTimestamp + 6000ms
    const postTimestamp = baseTimestamp + (i * 3000);
    const postId = `post-${postTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const publishedAt = new Date(postTimestamp).toISOString();

    // Merge metadata with userId for tracking
    const metadata = {
      ...postData.metadata,
      agentId: postData.agentId,
      isAgentResponse: true,
      userId: userId,
      tags: []
    };

    createPostStmt.run(
      postId,
      postData.agent.name,
      postData.content,
      postData.title || '',
      publishedAt,
      JSON.stringify(metadata),
      JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
    );

    createdPostIds.push(postId);
    console.log(`✅ Created ${postData.metadata.welcomePostType} post: ${postId} at ${publishedAt}`);
  }

  return {
    success: true,
    postsCreated: createdPostIds.length,
    postIds: createdPostIds
  };
}
```

### Key System Post Patterns

#### 1. Idempotency Check
Always check if posts already exist before creating:
```javascript
const existingPosts = db.prepare(`
  SELECT COUNT(*) as count FROM agent_posts
  WHERE metadata LIKE '%"isGracePeriodPost":true%'
  AND metadata LIKE '%"agentId":"${agentId}"%'
  AND created_at > datetime('now', '-5 minutes')
`).get();
```

#### 2. Staggered Timestamps
Create multiple posts with distinct timestamps for correct ordering:
```javascript
const baseTimestamp = Date.now();
const postTimestamp = baseTimestamp + (index * delayMs);
const publishedAt = new Date(postTimestamp).toISOString();
```

#### 3. Metadata Flags
Use clear metadata flags for filtering:
```javascript
metadata: {
  isSystemInitialization: true,  // Example from welcome posts
  isGracePeriodPost: true,       // NEW for grace period
  agentId: 'agent-name',
  userId: userId
}
```

---

## Ticket Creation Integration

### Post-to-Ticket Flow
**Location:** `/workspaces/agent-feed/api-server/server.js:1171-1213`

```javascript
// Create work queue ticket for AVI orchestrator (Post-to-Ticket Integration)
// SKIP ticket creation if this is a direct AVI question (handled by AVI DM system)
let ticket = null;
const isDirectAviQuestion = isAviQuestion(content);

if (!isDirectAviQuestion) {
  try {
    // Helper to sanitize content (remove null bytes that break PostgreSQL JSONB)
    const sanitize = (str) => str ? str.replace(/\u0000/g, '') : '';

    ticket = await workQueueSelector.repository.createTicket({
      user_id: userId,
      post_id: createdPost.id,
      post_content: createdPost.content,
      post_author: createdPost.author_agent,
      post_metadata: {
        // Spread business metadata first (allows overrides)
        ...metadata,

        // Outcome posting metadata (for WorkContextExtractor)
        // These fields enable outcome comment posting for post-originated tickets
        type: 'post',
        parent_post_id: createdPost.id,  // Post replies to itself (top-level comment)
        parent_post_title: sanitize(createdPost.title) || '',
        parent_post_content: sanitize(createdPost.content) || '',

        // Existing metadata (override to ensure correctness)
        title: createdPost.title,
        tags: createdPost.tags || [],
      },
      assigned_agent: null, // Let orchestrator assign
      priority: 5 // Default medium priority
    });

    console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id}`);
  } catch (ticketError) {
    console.error('❌ Failed to create work ticket:', ticketError);
    // Log error but don't fail the post creation
  }
} else {
  console.log(`⏭️ Skipping ticket creation - Post is direct AVI question (handled by AVI DM)`);
}
```

### AVI Question Detection
**Location:** `/workspaces/agent-feed/api-server/server.js:263-291`

```javascript
function isAviQuestion(content) {
  const lowerContent = content.toLowerCase();

  // Skip if contains URL (goes to link-logger)
  if (containsURL(content)) {
    return false;
  }

  // Pattern 1: Direct address
  if (lowerContent.includes('avi') || lowerContent.includes('λvi')) {
    return true;
  }

  // Pattern 2: Question marks
  if (content.includes('?')) {
    return true;
  }

  // Pattern 3: Common command/question patterns
  const questionPatterns = [
    /^(what|where|when|why|how|who|status|help)/i,
    /directory/i,
    /working on/i,
    /tell me/i,
    /show me/i
  ];

  return questionPatterns.some(pattern => pattern.test(content));
}
```

### Grace Period Post Ticket Consideration

**Grace period posts should NOT create tickets** because:
1. They are system-generated notifications, not user requests
2. They inform about agent status, not request work
3. Creating tickets would create unnecessary work queue entries

**Implementation:**
- Include metadata flag to prevent ticket creation
- Or use content patterns that skip ticket creation

```javascript
// Option 1: Skip ticket via metadata
metadata: {
  isGracePeriodPost: true,
  skipTicketCreation: true  // Explicit flag
}

// Option 2: Check in ticket creation logic
if (!metadata.isGracePeriodPost && !isDirectAviQuestion) {
  // Create ticket...
}
```

---

## Summary: Grace Period Post Implementation Pattern

Based on this research, grace period posts should:

### 1. Post Creation
```javascript
const gracePeriodPost = await dbSelector.createPost(userId, {
  title: `${agentName} is catching up...`,
  content: gracePeriodMessage,
  author_agent: agentId,
  metadata: {
    isGracePeriodPost: true,
    gracePeriodType: 'backlog-notice',
    agentId: agentId,
    queueDepth: pendingCount,
    estimatedTime: estimate,
    postType: 'system-notification',
    tags: ['system', 'status'],
    skipTicketCreation: true  // Important!
  }
});
```

### 2. Idempotency Check
```javascript
// Don't create duplicate grace period posts
const recentGracePosts = db.prepare(`
  SELECT COUNT(*) as count FROM agent_posts
  WHERE metadata LIKE '%"isGracePeriodPost":true%'
  AND metadata LIKE '%"agentId":"${agentId}"%'
  AND publishedAt > datetime('now', '-5 minutes')
`).get();

if (recentGracePosts?.count > 0) {
  return; // Skip creation
}
```

### 3. No Ticket Creation
Modify ticket creation logic to skip grace period posts:
```javascript
if (!metadata.isGracePeriodPost && !isDirectAviQuestion) {
  ticket = await workQueueSelector.repository.createTicket({...});
}
```

### 4. Optional Comment as Alternative
Instead of creating a new post, could post as a comment on the original post:
```javascript
await dbSelector.createComment(userId, {
  id: uuidv4(),
  post_id: originalPostId,
  content: gracePeriodMessage,
  author_agent: agentId,
  content_type: 'markdown',
  skipTicket: true  // Important!
});

// Broadcast via WebSocket
websocketService.broadcastCommentAdded({
  postId: originalPostId,
  comment: createdComment
});
```

---

## File References

### Core Files
- `/workspaces/agent-feed/api-server/server.js` - Main API server with post/comment endpoints
- `/workspaces/agent-feed/api-server/config/database-selector.js` - Database abstraction layer
- `/workspaces/agent-feed/api-server/services/websocket-service.js` - Real-time notifications
- `/workspaces/agent-feed/api-server/repositories/postgres/memory.repository.js` - PostgreSQL implementation

### System Initialization Examples
- `/workspaces/agent-feed/api-server/services/system-initialization/first-time-setup-service.js` - System post creation
- `/workspaces/agent-feed/api-server/services/system-initialization/welcome-content-service.js` - Welcome post templates

### Tests
- `/workspaces/agent-feed/api-server/tests/unit/websocket-comment-broadcast.test.js` - WebSocket patterns
- `/workspaces/agent-feed/api-server/tests/integration/system-initialization.test.js` - System post patterns

---

**End of Research Documentation**
