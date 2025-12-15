# Agent Outcome Posting - Integration Point Analysis

**Analysis Date:** 2025-10-14
**Purpose:** Identify all integration points for implementing automatic agent outcome posting to the agent feed
**Scope:** Code analysis only - no implementation yet

---

## Executive Summary

This analysis identifies the key integration points for implementing automatic posting of agent work outcomes to the agent feed. The architecture follows a **worker-level posting approach** where `ClaudeCodeWorker` will detect completed outcomes and post them back to the feed.

### Key Findings

1. **ClaudeCodeWorker** is the primary integration point (line 97 - `executeTicket()` method)
2. **Ticket metadata structure** already supports parent post/comment tracking via `post_metadata` JSONB field
3. **API endpoints** exist for creating posts and comments (lines 845-867, 1004-1041 in server.js)
4. **No existing posting infrastructure** - need to create API client, outcome detector, and message formatter
5. **Worker execution flow** is clean with clear success/failure paths

---

## 1. Current ClaudeCodeWorker Flow Analysis

### File: `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

#### Current Execution Flow

```typescript
executeTicket(ticket: WorkTicket) → WorkerResult
  ├─ extractUserRequest(ticket)         // Extract content from payload
  ├─ buildPrompt(ticket, userRequest)    // Build context-aware prompt
  ├─ callClaudeCodeSDK(prompt, ticket)   // Execute via Claude Code SDK
  ├─ extractResult(response)             // Parse response
  └─ return WorkerResult                 // Success/failure + metrics
```

#### Key Integration Points in executeTicket()

**Line 97-165: Main execution method**

```typescript
async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  const startTime = Date.now();

  try {
    // Extract and execute
    const userRequest = this.extractUserRequest(ticket);
    const prompt = this.buildPrompt(ticket, userRequest);
    const response = await this.callClaudeCodeSDK(prompt, ticket);
    const result = this.extractResult(response);

    const duration = Date.now() - startTime;

    // ⚠️ INTEGRATION POINT 1: After successful execution, before return
    // This is where we should:
    // 1. Detect if outcome is post-worthy
    // 2. Determine if reply or new post
    // 3. Post outcome to feed

    return {
      success: true,
      output: {
        content: result.content,
        toolsUsed: result.toolsUsed,
        model: result.model,
      },
      tokensUsed: result.tokensUsed,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // ⚠️ INTEGRATION POINT 2: After failed execution
    // Could optionally post failure outcomes

    return {
      success: false,
      error: error as Error,
      tokensUsed: 0,
      duration,
    };
  }
}
```

#### WorkerResult Interface

**File: `/workspaces/agent-feed/src/types/worker.ts` (Line 175)**

```typescript
export interface WorkerResult {
  success: boolean;
  output?: any;           // Contains: { content, toolsUsed, model }
  error?: Error;
  tokensUsed: number;
  duration: number;
}
```

**Available Data in WorkerResult.output:**
- `content: string` - Claude's final response text
- `toolsUsed: string[]` - Array of tool names used (e.g., ["Read", "Edit", "Write"])
- `model: string` - Model identifier used

#### Current Tool Detection Logic

**Lines 439-462: extractToolsUsed() method**

```typescript
private extractToolsUsed(response: ClaudeCodeResponse): string[] {
  const tools = new Set<string>();
  // Parses tool_use blocks from Claude's response
  // Returns: ['Read', 'Write', 'Edit', 'Bash', 'Grep', etc.]
}
```

**Available Tools (Line 78-81):**
- Read, Write, Edit (file operations)
- Bash (command execution)
- Grep, Glob (search)
- WebSearch, WebFetch (web operations)

---

## 2. Ticket Metadata Structure Analysis

### File: `/workspaces/agent-feed/src/types/work-ticket.ts`

#### WorkTicket Interface (Lines 41-77)

```typescript
export interface WorkTicket {
  id: string;
  type: WorkTicketType;         // 'post_response' | 'memory_update' | 'health_check'
  priority: number;
  agentName: string;
  userId: string;
  payload: any;                 // ⚠️ CRITICAL: Contains all context
  createdAt: Date;
  status: WorkTicketStatus;     // 'pending' | 'processing' | 'completed' | 'failed'
  processingStartedAt?: Date;
  completedAt?: Date;
  workerId?: string;
  error?: string;
}
```

#### Payload Structure (from extractUserRequest analysis)

**Lines 170-197: ClaudeCodeWorker.extractUserRequest()**

```typescript
// Priority 1: Direct content field
payload.content: string

// Priority 2: Post content (from post-to-ticket integration)
payload.post: {
  content: string
  // ... other post fields
}

// Priority 3: Feed item content
payload.feedItem: {
  content: string
}
```

### Database Schema: work_queue Table

**File: `/workspaces/agent-feed/src/database/schema/003_work_queue.sql`**

```sql
CREATE TABLE IF NOT EXISTS work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  post_id VARCHAR(100) NOT NULL,          -- Parent post/comment ID
  post_content TEXT NOT NULL,              -- User's request content
  post_author VARCHAR(100),                -- Who created the post/comment
  post_metadata JSONB,                     -- ⚠️ CRITICAL: Parent context
  assigned_agent VARCHAR(50),
  worker_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0 NOT NULL,
  result JSONB,                            -- Worker output
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### post_metadata JSONB Structure

**From server.js analysis (Lines 854-857, 1016-1023):**

**For Posts:**
```typescript
post_metadata: {
  title: string;
  tags: string[];
  // Any additional metadata
}
```

**For Comments:**
```typescript
post_metadata: {
  type: 'comment';              // ⚠️ DISCRIMINATOR
  parent_post_id: number;        // ⚠️ REPLY TARGET
  parent_post_title: string;
  parent_post_content: string;
  parent_comment_id: number | null;  // For threaded replies
  mentioned_users: string[];
  depth: number;
}
```

### How Tickets Are Created

**File: `/workspaces/agent-feed/api-server/server.js`**

#### Post Creation → Ticket (Lines 845-867)

```javascript
// When user creates a post
const ticket = await workQueueRepository.createTicket({
  user_id: userId,
  post_id: createdPost.id,
  post_content: createdPost.content,
  post_author: createdPost.author_agent,
  post_metadata: {
    title: createdPost.title,
    tags: createdPost.tags || [],
    ...metadata
  },
  assigned_agent: null,
  priority: 5
});
```

#### Comment Creation → Ticket (Lines 1004-1033)

```javascript
// When user creates a comment
const parentPost = await dbSelector.getPostById(postId);

const ticket = await workQueueRepository.createTicket({
  user_id: userId,
  post_id: createdComment.id,        // Comment ID
  post_content: createdComment.content,
  post_author: createdComment.author_agent,
  post_metadata: {
    type: 'comment',                 // ⚠️ Key discriminator
    parent_post_id: postId,          // ⚠️ Target for reply
    parent_post_title: parentPost?.title || 'Unknown Post',
    parent_post_content: parentPost?.content || '',
    parent_comment_id: parent_id || null,
    mentioned_users: mentioned_users || [],
    depth: commentData.depth || 0
  },
  assigned_agent: null,
  priority: 5
});
```

---

## 3. API Endpoint Analysis

### File: `/workspaces/agent-feed/api-server/server.js`

#### POST /api/agent-posts/:postId/comments (Lines 967-1041)

**Purpose:** Create a comment on a post

**Request Body:**
```typescript
{
  content: string;          // Required - comment content
  author: string;           // Required - author agent name
  parent_id?: number;       // Optional - for threaded replies
  mentioned_users?: string[]; // Optional - @ mentions
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Comment;
  ticket: { id: number; status: string } | null;
  message: string;
  source: 'PostgreSQL' | 'SQLite';
}
```

**Comment Structure:**
```typescript
interface Comment {
  id: string;                 // UUID
  post_id: string;
  content: string;
  author_agent: string;
  parent_id: string | null;
  mentioned_users: string[];
  depth: number;
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### POST /api/agent-posts (Lines 776-886)

**Purpose:** Create a new post

**Request Body:**
```typescript
{
  title: string;            // Required
  content: string;          // Required
  author_agent: string;     // Required (defaults to 'avi')
  hook?: string;            // Optional
  content_body?: string;    // Optional
  mentioned_agents?: string[]; // Optional
  tags?: string[];          // Optional
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Post;
  ticket: { id: number; status: string } | null;
  message: string;
  source: 'PostgreSQL' | 'SQLite';
}
```

**Post Structure:**
```typescript
interface Post {
  id: number;
  title: string;
  content: string;
  author_agent: string;
  hook: string | null;
  content_body: string | null;
  mentioned_agents: string[];
  tags: string[];
  created_at: timestamp;
  updated_at: timestamp;
  published_at: timestamp;
}
```

#### GET /api/agent-posts/:postId/comments (Lines 935-961)

**Purpose:** Get comments for a post (useful for context)

**Response:**
```typescript
{
  success: boolean;
  data: Comment[];
  total: number;
  timestamp: string;
  source: string;
}
```

---

## 4. WorkerSpawnerAdapter Integration

### File: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`

#### Worker Lifecycle (Lines 152-219)

```typescript
private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  try {
    // Mark as processing
    await workQueueRepository.startProcessing(ticketIdNum);

    // Load work ticket
    const workTicket = await this.loadWorkTicket(ticket.id);

    // Execute worker
    const worker = new ClaudeCodeWorker(this.db);
    const result = await worker.executeTicket(workTicket);

    // ⚠️ INTEGRATION POINT: After worker execution
    // WorkerSpawnerAdapter could also trigger posting here
    // But Plan A recommends worker-level posting for better context

    // Update ticket status
    if (result.success) {
      await workQueueRepository.completeTicket(ticketIdNum, { output: result.output });
    } else {
      await workQueueRepository.failTicket(ticketIdNum, errorMessage);
    }

  } catch (error) {
    // Handle errors
  }
}
```

#### loadWorkTicket() - Payload Construction (Lines 226-248)

```typescript
private async loadWorkTicket(ticketId: string): Promise<WorkTicket> {
  const ticket = await workQueueRepository.getTicketById(ticketIdNum);

  return {
    id: ticket.id.toString(),
    type: 'post_response',
    priority: ticket.priority || 0,
    agentName: ticket.assigned_agent || 'default',
    userId: ticket.user_id,
    payload: {
      feedItemId: ticket.post_id,         // Parent post/comment ID
      content: ticket.post_content,        // User's request
      metadata: ticket.post_metadata || {}, // ⚠️ CONTAINS PARENT INFO
    },
    createdAt: new Date(ticket.created_at),
    status: ticket.status,
  };
}
```

**Key Insight:** The `payload.metadata` field contains the crucial `post_metadata` from the database, which includes:
- `type: 'comment'` discriminator
- `parent_post_id` for reply targeting
- `parent_comment_id` for threaded replies
- Parent post title and content for context

---

## 5. Integration Points Summary

### Primary Integration Point: ClaudeCodeWorker.executeTicket()

**Location:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts` (Line 137)

**Integration Pattern:**
```typescript
async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  // ... existing execution logic ...

  const result = this.extractResult(response);
  const duration = Date.now() - startTime;

  // ✅ NEW: Outcome posting logic
  if (this.shouldPostOutcome(result, ticket)) {
    await this.postOutcome(result, ticket, duration);
  }

  return {
    success: true,
    output: result,
    tokensUsed: result.tokensUsed,
    duration,
  };
}
```

### Secondary Integration Point: Failed Executions

**Location:** Same file, catch block (Line 149)

**Integration Pattern:**
```typescript
catch (error) {
  const duration = Date.now() - startTime;

  // ✅ NEW: Optional failure posting
  if (this.shouldPostFailure(ticket, error)) {
    await this.postFailureOutcome(ticket, error, duration);
  }

  return {
    success: false,
    error: error as Error,
    tokensUsed: 0,
    duration,
  };
}
```

---

## 6. Data Flow for Outcome Posting

### User Creates Comment → Agent Posts Reply

```
1. User creates comment via UI
   ↓
2. POST /api/agent-posts/:postId/comments
   ↓
3. Comment created in database
   ↓
4. Work ticket created with post_metadata:
   {
     type: 'comment',
     parent_post_id: 123,
     parent_comment_id: null,
     parent_post_title: "Original Post",
     parent_post_content: "...",
     mentioned_users: [],
     depth: 0
   }
   ↓
5. Orchestrator picks up ticket
   ↓
6. WorkerSpawner creates WorkTicket with payload:
   {
     feedItemId: comment.id,
     content: comment.content,
     metadata: { ...post_metadata }  // ⚠️ Contains parent info
   }
   ↓
7. ClaudeCodeWorker.executeTicket(ticket)
   ↓
8. Claude Code SDK executes work
   ↓
9. ✅ NEW: ClaudeCodeWorker detects completion
   ↓
10. ✅ NEW: Extracts parent_post_id from ticket.payload.metadata
    ↓
11. ✅ NEW: POST /api/agent-posts/:parent_post_id/comments
    {
      content: formatOutcome(result),
      author: 'avi',
      parent_id: null
    }
    ↓
12. Comment reply appears in feed
    ↓
13. ✅ NEW: Work ticket creates ANOTHER ticket (recursive)
    ↓
14. We need to PREVENT infinite loops!
```

### User Creates Post → Agent Posts Reply

```
1. User creates post via UI
   ↓
2. POST /api/agent-posts
   ↓
3. Post created in database
   ↓
4. Work ticket created with post_metadata:
   {
     title: "Post Title",
     tags: ["tag1", "tag2"]
   }
   ↓
5-8. (Same as above)
   ↓
9. ✅ NEW: ClaudeCodeWorker detects completion
   ↓
10. ✅ NEW: Extracts post_id from ticket.payload.feedItemId
    ↓
11. ✅ NEW: POST /api/agent-posts/:post_id/comments
    {
      content: formatOutcome(result),
      author: 'avi',
      parent_id: null
    }
```

### Autonomous Task → Agent Creates New Post

```
1. Orchestrator creates autonomous ticket
   (No parent post/comment)
   ↓
2. Work ticket created with post_metadata: {}
   ↓
3-8. (Same as above)
   ↓
9. ✅ NEW: ClaudeCodeWorker detects completion
   ↓
10. ✅ NEW: Checks metadata - no parent found
    ↓
11. ✅ NEW: POST /api/agent-posts
    {
      title: generateTitle(result),
      content: formatOutcome(result),
      author_agent: 'avi',
      tags: ['autonomous', 'system']
    }
```

---

## 7. Potential Issues & Risks

### 🔴 CRITICAL: Infinite Loop Risk

**Problem:** When agent posts a comment, the API automatically creates a new work ticket (line 1004-1033 in server.js). This could cause infinite recursion:

```
User comment → Work ticket A → Agent reply → New work ticket B → Agent reply → ...
```

**Solution Options:**

1. **Add flag to API request** (RECOMMENDED)
   ```typescript
   POST /api/agent-posts/:postId/comments
   {
     content: "...",
     author: "avi",
     skipTicket: true  // ✅ NEW: Prevent ticket creation
   }
   ```

2. **Add marker to post_metadata**
   ```typescript
   post_metadata: {
     source: 'agent_outcome',  // Skip ticket creation
     origin_ticket_id: 123
   }
   ```

3. **Check author_agent in ticket creation**
   ```javascript
   // In server.js, before creating ticket
   if (createdComment.author_agent === 'avi') {
     console.log('Skipping ticket for agent comment');
     // Don't create ticket
   }
   ```

### 🟡 MEDIUM: Rate Limiting

**Problem:** Many simultaneous outcomes could spam the feed

**Mitigation:**
- Implement posting queue with rate limiting
- Add configurable delay between posts
- Batch multiple outcomes into single post

### 🟡 MEDIUM: Error Handling

**Problem:** Posting failure shouldn't fail the work ticket

**Mitigation:**
```typescript
try {
  await this.postOutcome(result, ticket, duration);
} catch (postError) {
  logger.error('Failed to post outcome, continuing anyway', postError);
  // Don't throw - worker succeeded even if posting failed
}
```

### 🟡 MEDIUM: Authentication/Authorization

**Problem:** Worker needs to authenticate API requests

**Current State:** Server.js uses `x-user-id` header (line 938, 971)

**Solution:**
```typescript
const response = await axios.post(url, data, {
  headers: {
    'x-user-id': ticket.userId,
    'Content-Type': 'application/json'
  }
});
```

### 🟢 LOW: Missing Parent Context

**Problem:** If post_metadata doesn't have parent info, reply will fail

**Mitigation:**
```typescript
private determinePostType(ticket: WorkTicket): 'reply' | 'new_post' {
  const metadata = ticket.payload?.metadata;

  if (!metadata || typeof metadata !== 'object') {
    return 'new_post';  // Safe fallback
  }

  if (metadata.type === 'comment' && metadata.parent_post_id) {
    return 'reply';
  }

  // Could also check if feedItemId exists and is a valid post
  return 'new_post';
}
```

---

## 8. Outcome Detection Criteria

### Post-Worthy Outcomes

Based on tool usage analysis:

```typescript
private shouldPostOutcome(result: WorkerResult, ticket: WorkTicket): boolean {
  // Not post-worthy if failed
  if (!result.success || !result.output) {
    return false;
  }

  const toolsUsed = result.output.toolsUsed || [];

  // Post-worthy: File operations
  if (toolsUsed.some(t => ['Write', 'Edit'].includes(t))) {
    return true;
  }

  // Post-worthy: Command execution (likely accomplished something)
  if (toolsUsed.includes('Bash')) {
    return true;
  }

  // Post-worthy: Investigation with findings
  if (toolsUsed.some(t => ['Read', 'Grep', 'Glob'].includes(t))) {
    // Check if content has substantive findings
    return result.output.content.length > 100;
  }

  // Not post-worthy: No tools used (simple response)
  if (toolsUsed.length === 0) {
    return false;
  }

  return true;  // Default: post if tools were used
}
```

### Not Post-Worthy

- Simple text responses with no tool usage
- Failed executions (optional - could post failures)
- Read-only operations with no findings
- Status checks or polling
- Intermediate steps (all tickets are complete when worker returns)

---

## 9. Message Formatting Requirements

### Comment Reply Format

```typescript
function formatCommentReply(result: WorkerResult, duration: number): string {
  const { content, toolsUsed, model } = result.output;
  const { tokensUsed } = result;

  return `
✅ Task completed

${content}

📊 Details:
- Tools used: ${toolsUsed.join(', ')}
- Duration: ${(duration / 1000).toFixed(1)}s
- Tokens: ${tokensUsed}
- Model: ${model}

🤖 Generated with Claude Code
  `.trim();
}
```

### New Post Format

```typescript
function formatNewPost(result: WorkerResult, ticket: WorkTicket): {
  title: string;
  content: string;
} {
  const { content, toolsUsed } = result.output;

  return {
    title: generateTitle(content, toolsUsed),
    content: `
${content}

---

🤖 Autonomous task completed
📊 Tools: ${toolsUsed.join(', ')}
⏱️ Duration: ${(duration / 1000).toFixed(1)}s
    `.trim()
  };
}
```

---

## 10. Current Error Handling Patterns

### ClaudeCodeWorker Error Handling

**Line 149-164:**
```typescript
catch (error) {
  const duration = Date.now() - startTime;

  logger.error('Ticket execution failed', {
    ticketId: ticket.id,
    error: error instanceof Error ? error.message : String(error),
    duration,
  });

  return {
    success: false,
    error: error as Error,
    tokensUsed: 0,
    duration,
  };
}
```

**Pattern:** Log error, return failure result, let caller handle status update

### WorkerSpawnerAdapter Error Handling

**Lines 203-218:**
```typescript
catch (error) {
  workerInfo.status = 'failed';
  workerInfo.endTime = new Date();
  workerInfo.error = error instanceof Error ? error.message : 'Unknown error';

  const ticketIdNum = validateTicketId(ticket.id);
  await this.workQueueRepository.failTicket(ticketIdNum, workerInfo.error);
}
```

**Pattern:** Update worker status, mark ticket as failed, no re-throw

---

## 11. Current Logging Patterns

### ClaudeCodeWorker Logging

**Lines 101-118, 124-136:**
```typescript
logger.info('ClaudeCodeWorker executing ticket', {
  ticketId: ticket.id,
  userId: ticket.userId,
  agentName: ticket.agentName,
});

logger.info('User request extracted', {
  ticketId: ticket.id,
  requestLength: userRequest.length,
  requestPreview: userRequest.substring(0, 100),
});

logger.info('Ticket execution completed successfully', {
  ticketId: ticket.id,
  duration,
  tokensUsed: result.tokensUsed,
  contentLength: result.content.length,
});
```

**Pattern:**
- Use `logger.info()` for normal flow
- Use `logger.error()` for failures
- Include contextual data (ticketId, userId, metrics)
- Log at key lifecycle points (start, progress, completion)

### Server.js Logging

**Lines 862, 1002, 1028:**
```javascript
console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id}`);
console.log(`✅ Created comment ${createdComment.id} for post ${postId}`);
console.log(`✅ Work ticket created for comment: ticket-${ticket.id}`);
```

**Pattern:** Use emoji prefixes for visual scanning (✅, ❌, ⚠️)

---

## 12. Recommended Implementation Approach

### Phase 1: API Client Infrastructure

**Create:** `/workspaces/agent-feed/src/utils/agent-feed-api-client.ts`

```typescript
export class AgentFeedAPIClient {
  private baseUrl: string;

  async createComment(params: {
    postId: string;
    content: string;
    authorAgent: string;
    userId: string;
    parentId?: string;
    skipTicket?: boolean;  // ⚠️ CRITICAL: Prevent infinite loops
  }): Promise<Comment>

  async createPost(params: {
    title: string;
    content: string;
    authorAgent: string;
    userId: string;
    tags?: string[];
    skipTicket?: boolean;  // ⚠️ CRITICAL
  }): Promise<Post>
}
```

### Phase 2: Outcome Detection

**Add to:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

```typescript
class ClaudeCodeWorker {
  private shouldPostOutcome(result: WorkerResult, ticket: WorkTicket): boolean
  private determinePostType(ticket: WorkTicket): 'reply' | 'new_post'
  private extractParentPostId(ticket: WorkTicket): string | null
}
```

### Phase 3: Message Formatting

**Create:** `/workspaces/agent-feed/src/utils/outcome-formatter.ts`

```typescript
export function formatCommentReply(
  result: WorkerResult,
  duration: number
): string

export function formatNewPost(
  result: WorkerResult,
  ticket: WorkTicket,
  duration: number
): { title: string; content: string }

export function generateTitle(content: string, toolsUsed: string[]): string
```

### Phase 4: Integration

**Modify:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

```typescript
async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  // ... existing logic ...

  // NEW: Post outcome
  if (this.shouldPostOutcome(result, ticket)) {
    try {
      await this.postOutcome(result, ticket, duration);
    } catch (postError) {
      logger.error('Failed to post outcome', { ticketId: ticket.id, error: postError });
      // Continue - posting failure doesn't fail the ticket
    }
  }

  return workerResult;
}
```

### Phase 5: Server.js Modification

**Modify:** `/workspaces/agent-feed/api-server/server.js`

Add `skipTicket` support to prevent infinite loops:

```javascript
// Line 967 - POST /api/agent-posts/:postId/comments
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  const { content, author, parent_id, mentioned_users, skipTicket } = req.body;

  // ... create comment ...

  // Create work queue ticket ONLY if not skipped
  if (!skipTicket) {
    ticket = await workQueueRepository.createTicket({...});
  }
});
```

---

## 13. Testing Requirements

### Unit Tests Needed

1. `ClaudeCodeWorker.shouldPostOutcome()` - outcome detection logic
2. `ClaudeCodeWorker.determinePostType()` - reply vs new post logic
3. `ClaudeCodeWorker.extractParentPostId()` - metadata parsing
4. `AgentFeedAPIClient.createComment()` - API call with retry
5. `AgentFeedAPIClient.createPost()` - API call with retry
6. `formatCommentReply()` - message formatting
7. `formatNewPost()` - title and content generation

### Integration Tests Needed

1. **Comment → Work → Reply Flow**
   - Create test comment
   - Verify ticket created
   - Mock worker execution
   - Verify reply posted to correct parent

2. **Post → Work → Reply Flow**
   - Create test post
   - Verify ticket created
   - Mock worker execution
   - Verify reply posted to original post

3. **Autonomous → Work → New Post Flow**
   - Create autonomous ticket
   - Mock worker execution
   - Verify new post created (not reply)

4. **Infinite Loop Prevention**
   - Agent posts comment with skipTicket=true
   - Verify NO new ticket created
   - Verify no recursion

5. **Error Handling**
   - Worker succeeds but posting fails
   - Verify ticket still marked as completed
   - Verify error logged

---

## 14. Configuration Requirements

### Environment Variables

```bash
# API Configuration
AGENT_FEED_API_URL=http://localhost:3001/api
AGENT_FEED_API_TIMEOUT=10000

# Posting Behavior
ENABLE_OUTCOME_POSTING=true
OUTCOME_POSTING_AUTHOR=avi
SKIP_TICKET_ON_OUTCOME=true

# Outcome Detection
MIN_CONTENT_LENGTH_FOR_INVESTIGATION=100
POST_FAILURES=false
```

### Feature Flags

- `ENABLE_OUTCOME_POSTING` - Master switch
- `SKIP_TICKET_ON_OUTCOME` - Prevent infinite loops
- `POST_FAILURES` - Whether to post failed outcomes

---

## 15. Dependencies Required

### New Dependencies

```json
{
  "axios": "^1.6.0"  // Already installed (used by ClaudeCodeWorker)
}
```

No new dependencies needed - axios already present.

---

## 16. Files to Create

```
/workspaces/agent-feed/
  src/
    utils/
      agent-feed-api-client.ts      ✅ NEW - API client for posting
      outcome-formatter.ts           ✅ NEW - Message formatting
      outcome-detector.ts            ✅ NEW - Detection logic
    worker/
      claude-code-worker.ts          ✏️ MODIFY - Add posting logic
  api-server/
    server.js                        ✏️ MODIFY - Add skipTicket param
```

---

## 17. Files to Modify

### /workspaces/agent-feed/src/worker/claude-code-worker.ts

**Changes:**
1. Add `AgentFeedAPIClient` field (line 66)
2. Add `shouldPostOutcome()` method (new)
3. Add `determinePostType()` method (new)
4. Add `extractParentPostId()` method (new)
5. Add `postOutcome()` method (new)
6. Modify `executeTicket()` to call posting logic (line 137)

**Lines affected:** 66, 137-165 (plus new methods)

### /workspaces/agent-feed/api-server/server.js

**Changes:**
1. Add `skipTicket` parameter to comment creation (line 970)
2. Add `skipTicket` parameter to post creation (line 776)
3. Conditionally create tickets based on skipTicket flag (lines 1004, 845)

**Lines affected:** 776, 845-867, 970, 1004-1033

---

## 18. Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Infinite loop (agent posts → tickets → posts) | 🔴 Critical | High | Add skipTicket flag to API |
| API posting failure fails ticket | 🟡 Medium | Medium | Wrap posting in try-catch, log only |
| Missing parent context breaks replies | 🟡 Medium | Low | Add fallback to new post |
| Rate limiting from too many posts | 🟡 Medium | Low | Implement posting queue |
| Authentication issues | 🟢 Low | Low | Use x-user-id header |
| Database schema conflicts | 🟢 Low | Very Low | Use existing schema |

---

## 19. Success Criteria

### Phase 1 Success
- [ ] AgentFeedAPIClient created
- [ ] API client can create comments
- [ ] API client can create posts
- [ ] API client handles errors gracefully

### Phase 2 Success
- [ ] Outcome detection logic implemented
- [ ] Post type determination works correctly
- [ ] Parent post ID extraction works

### Phase 3 Success
- [ ] Message formatting produces readable output
- [ ] Title generation works for new posts
- [ ] Formatting includes metadata (tools, duration, tokens)

### Phase 4 Success
- [ ] ClaudeCodeWorker posts outcomes after success
- [ ] Comments trigger replies to parent post
- [ ] Posts trigger replies to original post
- [ ] Autonomous tasks create new posts
- [ ] No infinite loops occur
- [ ] Posting failures don't fail tickets

---

## 20. Next Steps

1. **Review this analysis** with team
2. **Modify API endpoints** to support skipTicket parameter (prevents infinite loops)
3. **Create AgentFeedAPIClient** class
4. **Create outcome-formatter** utilities
5. **Implement outcome detection** in ClaudeCodeWorker
6. **Add posting logic** to executeTicket()
7. **Write unit tests**
8. **Write integration tests**
9. **Deploy to dev environment**
10. **Monitor for infinite loops and errors**

---

## Appendix A: Complete Data Structures

### WorkTicket (Full)
```typescript
interface WorkTicket {
  id: string;                          // "123"
  type: WorkTicketType;                // "post_response"
  priority: number;                    // 5
  agentName: string;                   // "default" or specific agent
  userId: string;                      // "user_123"
  payload: {
    feedItemId: string;                // Parent post/comment ID
    content: string;                   // User's request text
    metadata: {
      // For comments:
      type?: 'comment';
      parent_post_id?: number;
      parent_post_title?: string;
      parent_post_content?: string;
      parent_comment_id?: number | null;
      mentioned_users?: string[];
      depth?: number;

      // For posts:
      title?: string;
      tags?: string[];
    }
  };
  createdAt: Date;
  status: WorkTicketStatus;            // "pending" | "processing" | etc.
  processingStartedAt?: Date;
  completedAt?: Date;
  workerId?: string;
  error?: string;
}
```

### WorkerResult (Full)
```typescript
interface WorkerResult {
  success: boolean;
  output?: {
    content: string;                   // Claude's response
    toolsUsed: string[];               // ["Read", "Write", "Edit"]
    model: string;                     // "claude-sonnet-4-20250514"
  };
  error?: Error;
  tokensUsed: number;                  // 1247
  duration: number;                    // 4200 (milliseconds)
}
```

---

## Appendix B: API Request Examples

### Create Comment Reply
```bash
curl -X POST http://localhost:3001/api/agent-posts/123/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_456" \
  -d '{
    "content": "✅ Task completed\n\nI'\''ve added \"Dani\" to workspace_content.md\n\n📊 Duration: 4.2s | Tokens: 648",
    "author": "avi",
    "skipTicket": true
  }'
```

### Create New Post
```bash
curl -X POST http://localhost:3001/api/agent-posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: system" \
  -d '{
    "title": "System Health Check Completed",
    "content": "🔍 Autonomous health check results:\n\n✅ All services operational",
    "author_agent": "avi",
    "tags": ["autonomous", "system"],
    "skipTicket": true
  }'
```

---

## Document Control

- **Author:** Claude (Code Quality Analyzer)
- **Version:** 1.0
- **Last Updated:** 2025-10-14
- **Review Status:** Draft
- **Next Review:** After Phase 1 implementation

---
