# SPARC Specification: Ticket-to-Post Linking Fix

**Document Version**: 1.0
**Created**: 2025-10-24
**Status**: SPECIFICATION PHASE
**Priority**: P0 - CRITICAL

## Executive Summary

Three critical defects prevent the proactive agent ticket status system from functioning:

1. **Ticket Creation Mismatch**: Tickets created with wrong field name (`post_content` instead of `content`)
2. **Worker Comment Failure**: Agent worker posts comments without required `content` field
3. **Post Lookup Failure**: Post ID `post-1761272534219` exists but tickets not linked correctly

This specification provides a complete fix covering all three issues with TDD approach.

---

## S - SPECIFICATION

### 1.1 Problem Statement

**Issue #1: Ticket Creation Field Mismatch**
- Location: `/workspaces/agent-feed/api-server/server.js` (lines 1004-1020)
- Root Cause: WorkQueueRepository expects `content` field but server.js passes `post_content`
- Impact: Database constraint violation or NULL content field
- Evidence: Repository schema requires `content TEXT NOT NULL` but receives `post_content`

**Issue #2: Worker Comment Payload Missing Content**
- Location: `/workspaces/agent-feed/api-server/worker/agent-worker.js` (line 222-227)
- Root Cause: Comment object structure mismatch with API validation
- Impact: API returns 400 "Content is required" error, worker retries fail
- Evidence: Worker logs show repeated 400 errors at line 241

**Issue #3: Post-Ticket Link Verification Failure**
- Location: Multiple - ticket creation and status retrieval
- Root Cause: Tickets created but post_id not properly persisted or queried
- Impact: Ticket status badges don't appear on posts
- Evidence: API returns `ticketStatus: null` despite ticket existing in database

### 1.2 Functional Requirements

**FR-001: Correct Ticket Creation Schema**
```yaml
requirement_id: FR-001
description: Ticket creation must use correct field names matching repository schema
acceptance_criteria:
  - WorkQueueRepository.createTicket() receives 'content' field (not 'post_content')
  - Ticket created with post_id populated from post.id
  - Ticket contains full post content for agent context
  - Ticket metadata includes post context without duplication
priority: P0
validation: Unit test verifies ticket structure matches schema
```

**FR-002: Worker Comment Payload Structure**
```yaml
requirement_id: FR-002
description: Agent worker must POST comments with correct API payload structure
acceptance_criteria:
  - Comment payload includes 'content' field (required)
  - Comment payload includes 'author' field (required)
  - Comment payload includes 'skipTicket: true' to prevent loops
  - Comment payload includes 'parent_id: null' for top-level comments
priority: P0
validation: Integration test verifies comment creation succeeds
```

**FR-003: Post-Ticket Status Retrieval**
```yaml
requirement_id: FR-003
description: Ticket status API must correctly retrieve tickets by post_id
acceptance_criteria:
  - GET /api/agent-posts/:postId/tickets returns all tickets for post
  - Ticket status summary correctly aggregates pending/processing/completed/failed counts
  - WebSocket events broadcast ticket status updates in real-time
  - Frontend displays ticket status badges based on API response
priority: P0
validation: E2E test verifies badge appears after ticket creation
```

### 1.3 Non-Functional Requirements

**NFR-001: Data Integrity**
- All ticket records must have post_id populated
- Foreign key relationships maintained (post exists when ticket created)
- No orphaned tickets (tickets without corresponding posts)

**NFR-002: Error Handling**
- Worker retries use exponential backoff (3 max retries)
- Failed tickets marked as 'failed' after max retries
- Error messages logged with full context (ticket ID, post ID, error details)

**NFR-003: Performance**
- Ticket creation completes within 50ms
- Comment posting completes within 200ms
- Ticket status retrieval completes within 100ms

### 1.4 Constraints

**Technical Constraints**:
- Must use existing SQLite database schema
- Must maintain backward compatibility with existing tickets
- Must not break WebSocket real-time updates
- Must preserve orchestrator polling mechanism

**Business Constraints**:
- Zero downtime deployment required
- Must fix without database migrations (schema already correct)
- Must not affect existing completed tickets

### 1.5 Edge Cases

**EC-001: Post Deleted Before Ticket Processed**
- Scenario: Post deleted while ticket pending
- Expected: Worker fails gracefully, ticket marked failed
- Validation: Unit test with deleted post

**EC-002: Multiple Tickets Per Post**
- Scenario: Post contains multiple URLs, multiple tickets created
- Expected: All tickets linked to same post_id
- Validation: Status summary aggregates all tickets correctly

**EC-003: Concurrent Ticket Creation**
- Scenario: Two posts created simultaneously
- Expected: Each gets unique ticket with correct post_id
- Validation: Race condition test with concurrent requests

**EC-004: Worker Retry After Transient Failure**
- Scenario: API endpoint temporarily unavailable (503)
- Expected: Worker retries up to 3 times, then fails permanently
- Validation: Mock API failure, verify retry count

---

## P - PSEUDOCODE

### 2.1 Ticket Creation Flow (server.js)

```pseudocode
FUNCTION createPostAndTicket(postData, userId):
    // 1. Create post in database
    post = dbSelector.createPost(userId, postData)

    // 2. Extract URLs from post content
    urls = extractURLs(post.content)

    IF urls.length == 0:
        RETURN post  // No URLs, no ticket needed

    // 3. Match proactive agents for each URL
    ticketsCreated = []

    FOR EACH url IN urls:
        matchedAgents = matchProactiveAgents(url, post.content)
        context = extractContext(post.content, url)

        FOR EACH agentId IN matchedAgents:
            priority = determinePriority(agentId, post.content)

            // 4. Create ticket with CORRECT field names
            ticket = workQueueRepository.createTicket({
                user_id: userId,
                agent_id: agentId,
                content: post.content,           // FIX: Changed from post_content
                url: url,
                priority: priority,
                post_id: post.id,                // CRITICAL: Post ID linkage
                metadata: {
                    post_id: post.id,            // Redundant but useful for queries
                    post_title: post.title,
                    post_author: post.author_agent,
                    detected_at: Date.now(),
                    context: context
                }
            })

            ticketsCreated.push(ticket)

            LOG "Ticket created for agent ${agentId}: ${ticket.id} -> post ${post.id}"

    // 5. Emit WebSocket event for ticket creation
    IF websocketService.isInitialized():
        FOR EACH ticket IN ticketsCreated:
            websocketService.emitTicketStatusUpdate({
                post_id: post.id,
                ticket_id: ticket.id,
                status: 'pending',
                agent_id: ticket.agent_id,
                timestamp: NOW()
            })

    RETURN post
END FUNCTION
```

### 2.2 Worker Comment Posting (agent-worker.js)

```pseudocode
FUNCTION postToAgentFeed(intelligence, ticket):
    // 1. Validate ticket has post_id
    IF NOT ticket.post_id:
        THROW Error("Ticket ${ticket.id} missing post_id - cannot create comment")

    // 2. Build comment payload with CORRECT structure
    commentPayload = {
        content: intelligence.summary,      // FIX: Must be 'content' not 'text'
        author: ticket.agent_id,           // Required field
        parent_id: null,                   // Top-level comment
        skipTicket: true                   // Prevent infinite loop
    }

    // 3. POST to comment API
    url = "${apiBaseUrl}/api/agent-posts/${ticket.post_id}/comments"

    response = FETCH(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
    })

    // 4. Handle response with detailed error context
    IF NOT response.ok:
        errorBody = AWAIT response.text()

        errorMessage = "Failed to create comment on post ${ticket.post_id}: " +
                      "HTTP ${response.status} ${errorBody}"

        LOG ERROR errorMessage
        LOG ERROR "Ticket ID: ${ticket.id}"
        LOG ERROR "Agent ID: ${ticket.agent_id}"
        LOG ERROR "Payload: ${JSON.stringify(commentPayload)}"

        THROW Error(errorMessage)

    // 5. Parse and return comment result
    result = AWAIT response.json()

    RETURN {
        ...result.data,
        comment_id: result.data.id
    }
END FUNCTION
```

### 2.3 Ticket Status Retrieval (ticket-status-service.js)

```pseudocode
FUNCTION getPostTicketStatus(postId, db):
    // 1. Validate inputs
    IF NOT postId OR typeof postId != 'string':
        THROW Error("Invalid post_id: must be a non-empty string")

    IF NOT db:
        THROW Error("Database instance is required")

    // 2. Query tickets by post_id
    query = "
        SELECT
            id, agent_id, content, url, priority, status,
            retry_count, metadata, result, last_error,
            created_at, assigned_at, completed_at
        FROM work_queue_tickets
        WHERE post_id = ?
        ORDER BY created_at DESC
    "

    tickets = db.prepare(query).all(postId)

    // 3. Deserialize JSON fields
    deserializedTickets = []
    FOR EACH ticket IN tickets:
        deserializedTicket = {
            ...ticket,
            metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
            result: ticket.result ? JSON.parse(ticket.result) : null
        }
        deserializedTickets.push(deserializedTicket)

    // 4. Generate status summary
    summary = {
        total: tickets.length,
        pending: COUNT(tickets WHERE status == 'pending'),
        processing: COUNT(tickets WHERE status == 'in_progress'),
        completed: COUNT(tickets WHERE status == 'completed'),
        failed: COUNT(tickets WHERE status == 'failed'),
        agents: UNIQUE(tickets.map(t => t.agent_id))
    }

    // 5. Return structured response
    RETURN {
        post_id: postId,
        tickets: deserializedTickets,
        summary: summary
    }
END FUNCTION
```

---

## A - ARCHITECTURE

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGENT FEED SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │◄────────│  WebSocket   │────────►│   Backend    │
│  React App   │  Events │   Service    │         │  Express API │
└──────────────┘         └──────────────┘         └──────────────┘
                                                            │
                         POST /api/v1/agent-posts          │
                                  ▼                         │
                    ┌─────────────────────────┐            │
                    │  Post Creation Handler  │            │
                    │    (server.js L900)     │            │
                    └─────────────────────────┘            │
                                  │                         │
                                  │ Creates                 │
                                  ▼                         │
                    ┌─────────────────────────┐            │
                    │ WorkQueueRepository     │            │
                    │  .createTicket()        │            │
                    │  ✓ content (not post_)  │◄───────────┘
                    │  ✓ post_id populated    │
                    └─────────────────────────┘
                                  │
                                  │ Persists to
                                  ▼
                    ┌─────────────────────────┐
                    │   SQLite Database       │
                    │  work_queue_tickets     │
                    │  ├─ id                  │
                    │  ├─ agent_id            │
                    │  ├─ content  ◄─── FIX   │
                    │  ├─ post_id  ◄─── FIX   │
                    │  ├─ url                 │
                    │  ├─ status              │
                    │  └─ metadata            │
                    └─────────────────────────┘
                                  │
                                  │ Polled by
                                  ▼
                    ┌─────────────────────────┐
                    │  AVI Orchestrator       │
                    │  Main Loop (5s poll)    │
                    │  .processWorkQueue()    │
                    └─────────────────────────┘
                                  │
                                  │ Spawns
                                  ▼
                    ┌─────────────────────────┐
                    │   Agent Worker          │
                    │  (agent-worker.js)      │
                    │  1. fetchTicket()       │
                    │  2. processURL()        │
                    │  3. postToAgentFeed()   │◄─── FIX
                    └─────────────────────────┘
                                  │
                                  │ POST comment
                                  ▼
          POST /api/agent-posts/:postId/comments
                    ┌─────────────────────────┐
                    │  Comment API Handler    │
                    │  Validates:             │
                    │  ✓ content (required)   │◄─── FIX
                    │  ✓ author (required)    │
                    │  ✓ skipTicket flag      │
                    └─────────────────────────┘
                                  │
                                  │ Retrieves
                                  ▼
          GET /api/agent-posts/:postId/tickets
                    ┌─────────────────────────┐
                    │ Ticket Status Service   │
                    │ .getPostTicketStatus()  │
                    │  WHERE post_id = ?      │
                    └─────────────────────────┘
                                  │
                                  │ Returns
                                  ▼
                    ┌─────────────────────────┐
                    │  Ticket Status Badge    │
                    │  (Frontend Component)   │
                    │  Displays: pending/     │
                    │           processing/   │
                    │           completed     │
                    └─────────────────────────┘
```

### 3.2 Data Flow

**Flow 1: Post Creation with Ticket**
```
1. User creates post with URL
   POST /api/v1/agent-posts { content: "Check https://..." }

2. Server.js handler:
   a. Creates post in database
   b. Extracts URLs from content
   c. Matches proactive agents
   d. Creates ticket with CORRECT fields:
      - content: post.content (FIX: not post_content)
      - post_id: post.id (CRITICAL)
      - url, agent_id, priority, metadata

3. WorkQueueRepository:
   a. Validates required fields
   b. Inserts into work_queue_tickets
   c. Returns created ticket

4. WebSocket Service:
   a. Emits ticket:created event
   b. Frontend receives and updates UI
   c. Badge shows "pending" status
```

**Flow 2: Worker Processing Ticket**
```
1. Orchestrator polls work queue (every 5s)
   workQueueRepo.getPendingTickets({ limit: 5 })

2. Orchestrator spawns AgentWorker
   - workerId, ticketId, agentId passed
   - workQueueRepo injected
   - websocketService injected

3. Worker.execute():
   a. Fetches ticket (validates post_id exists)
   b. Processes URL with Claude Code SDK
   c. Posts comment with CORRECT payload:
      {
        content: intelligence.summary,  // FIX: was missing
        author: ticket.agent_id,
        parent_id: null,
        skipTicket: true
      }

4. Comment API Handler:
   a. Validates content field present
   b. Creates comment in database
   c. Returns success response

5. Worker completes:
   a. Updates ticket status to 'completed'
   b. Emits WebSocket ticket:completed event
   c. Frontend updates badge to "completed"
```

**Flow 3: Ticket Status Display**
```
1. Frontend loads post
   GET /api/agent-posts

2. Server enriches posts with ticket status:
   a. Fetches posts from database
   b. For each post, queries work_queue_tickets WHERE post_id = post.id
   c. Aggregates ticket summary (pending/processing/completed/failed)
   d. Returns posts with ticket_status object

3. Frontend renders TicketStatusBadge:
   a. Checks post.ticket_status.summary
   b. Displays badge color based on status
   c. Shows counts (e.g., "Processing: 2")
```

### 3.3 Critical Code Changes

**File: /workspaces/agent-feed/api-server/server.js**
```javascript
// BEFORE (Line 1004-1020) - BROKEN
ticket = await workQueueRepository.createTicket({
    user_id: userId,
    post_id: createdPost.id,
    post_content: createdPost.content,  // ❌ WRONG: Should be 'content'
    post_author: createdPost.author_agent,
    post_metadata: {
        // metadata...
    }
});

// AFTER - FIXED
ticket = await workQueueRepository.createTicket({
    user_id: userId,
    agent_id: agentId,                 // ✓ ADDED: Required field
    content: createdPost.content,       // ✓ FIXED: Correct field name
    url: extractedUrl,                  // ✓ ADDED: URL to process
    priority: 'P2',                     // ✓ ADDED: Default priority
    post_id: createdPost.id,            // ✓ CORRECT: Post linkage
    metadata: {
        post_id: createdPost.id,
        post_title: createdPost.title,
        post_author: createdPost.author_agent,
        detected_at: Date.now()
    }
});
```

**File: /workspaces/agent-feed/api-server/worker/agent-worker.js**
```javascript
// BEFORE (Line 222-227) - BROKEN
const comment = {
    content: intelligence.summary,     // ✓ Actually correct
    author: ticket.agent_id,          // ✓ Actually correct
    parent_id: null,
    skipTicket: true
};

// Issue is NOT in worker code structure
// Issue is in API endpoint expecting different field name
// OR worker not properly formatting intelligence.summary

// AFTER - ENHANCED ERROR HANDLING
const comment = {
    content: intelligence.summary || '',  // ✓ Ensure non-empty
    author: ticket.agent_id || 'unknown', // ✓ Fallback
    parent_id: null,
    skipTicket: true
};

// Validate before sending
if (!comment.content || !comment.content.trim()) {
    throw new Error(`Empty comment content for ticket ${ticket.id}`);
}

if (!comment.author || !comment.author.trim()) {
    throw new Error(`Missing comment author for ticket ${ticket.id}`);
}
```

**File: /workspaces/agent-feed/api-server/services/ticket-creation-service.cjs**
```javascript
// BEFORE (Line 31-43) - PARTIALLY CORRECT
const ticket = await workQueueRepo.createTicket({
    user_id: post.author_id || post.authorId,
    agent_id: agentId,
    content: post.content,              // ✓ CORRECT
    url: url,
    priority: priority,
    post_id: post.id,                   // ✓ CORRECT
    metadata: {
        post_id: post.id,
        detected_at: Date.now(),
        context: context
    }
});

// This service is CORRECT - server.js needs to USE this service
// instead of calling workQueueRepo.createTicket() directly
```

### 3.4 Database Schema Validation

```sql
-- Verify schema is correct (it is)
PRAGMA table_info(work_queue_tickets);

-- Expected columns:
-- id TEXT PRIMARY KEY
-- user_id TEXT
-- agent_id TEXT NOT NULL
-- content TEXT NOT NULL  ◄── Must be populated
-- url TEXT
-- priority TEXT NOT NULL
-- status TEXT NOT NULL
-- retry_count INTEGER DEFAULT 0
-- metadata TEXT
-- result TEXT
-- last_error TEXT
-- post_id TEXT           ◄── Must be populated for linking
-- created_at INTEGER NOT NULL
-- assigned_at INTEGER
-- completed_at INTEGER
```

---

## R - REFINEMENT

### 4.1 Error Handling Matrix

| Error Scenario | Detection Point | Recovery Strategy | User Impact |
|---|---|---|---|
| Missing content field | Worker payload validation | Throw error, retry ticket | Agent comment not posted |
| Missing post_id | Ticket creation | Throw error, log warning | Ticket not created |
| Post deleted before worker runs | Worker fetchTicket() | Fail ticket, log error | Comment not posted, ticket failed |
| API 400 error on comment | Worker postToAgentFeed() | Retry up to 3 times | Delayed comment posting |
| API 503 error (server down) | Worker fetch() | Retry with backoff | Delayed processing |
| Ticket query returns empty | Frontend status check | Display "No ticket" state | Badge not shown |
| Multiple tickets same post | Status aggregation | Sum all statuses | Badge shows aggregate |
| Worker crash mid-execution | Orchestrator timeout | Ticket remains in_progress, retry | Eventual retry |

### 4.2 Validation Rules

**Ticket Creation Validation**
```javascript
function validateTicketData(data) {
    const required = ['agent_id', 'content', 'priority', 'post_id'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!['P0', 'P1', 'P2', 'P3'].includes(data.priority)) {
        throw new Error(`Invalid priority: ${data.priority}`);
    }

    if (data.content.trim().length === 0) {
        throw new Error('Content cannot be empty');
    }

    if (!data.post_id.startsWith('post-')) {
        throw new Error(`Invalid post_id format: ${data.post_id}`);
    }
}
```

**Comment Payload Validation**
```javascript
function validateCommentPayload(payload) {
    if (!payload.content || typeof payload.content !== 'string') {
        throw new Error('Comment content is required and must be a string');
    }

    if (payload.content.trim().length === 0) {
        throw new Error('Comment content cannot be empty');
    }

    if (!payload.author || typeof payload.author !== 'string') {
        throw new Error('Comment author is required and must be a string');
    }

    if (payload.author.trim().length === 0) {
        throw new Error('Comment author cannot be empty');
    }
}
```

### 4.3 Logging and Monitoring

**Log Levels and Content**
```javascript
// INFO: Normal operations
console.log(`✅ Ticket created: ${ticket.id} -> Post ${post.id}`);
console.log(`🤖 Worker spawned: ${workerId} for ticket ${ticketId}`);
console.log(`✅ Comment posted: ${commentId} on post ${postId}`);

// WARN: Recoverable issues
console.warn(`⚠️ Ticket retry ${retryCount}/3 for ${ticketId}: ${error}`);
console.warn(`⚠️ Post ${postId} has no tickets despite URL detection`);

// ERROR: Failures requiring attention
console.error(`❌ Ticket creation failed: ${error.message}`, {
    postId: post.id,
    content: post.content,
    error: error.stack
});

console.error(`❌ Worker failed: ${workerId}`, {
    ticketId: ticket.id,
    agentId: ticket.agent_id,
    error: error.message,
    retryCount: ticket.retry_count
});
```

**Metrics to Track**
- Tickets created per minute
- Ticket processing time (p50, p95, p99)
- Worker success rate
- Worker failure rate by error type
- Comment posting success rate
- Ticket-to-post linking success rate
- Badge display accuracy (tickets with post_id / total tickets)

### 4.4 Testing Strategy

**Unit Tests (Jest)**
```javascript
// Test: Ticket creation with correct schema
describe('WorkQueueRepository.createTicket', () => {
    it('should create ticket with content field', () => {
        const ticket = repo.createTicket({
            agent_id: 'test-agent',
            content: 'Test post content',
            url: 'https://example.com',
            priority: 'P2',
            post_id: 'post-123'
        });

        expect(ticket.content).toBe('Test post content');
        expect(ticket.post_id).toBe('post-123');
    });

    it('should reject ticket without content', () => {
        expect(() => {
            repo.createTicket({
                agent_id: 'test-agent',
                priority: 'P2',
                post_id: 'post-123'
                // Missing content
            });
        }).toThrow('content is required');
    });
});

// Test: Worker comment payload
describe('AgentWorker.postToAgentFeed', () => {
    it('should send comment with content field', async () => {
        const worker = new AgentWorker({ ticketId: 'test-ticket' });

        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => ({ success: true, data: { id: 'comment-1' } })
        });
        global.fetch = mockFetch;

        await worker.postToAgentFeed(
            { summary: 'Test intelligence' },
            { post_id: 'post-123', agent_id: 'test-agent' }
        );

        const callArgs = mockFetch.mock.calls[0][1];
        const body = JSON.parse(callArgs.body);

        expect(body.content).toBe('Test intelligence');
        expect(body.author).toBe('test-agent');
        expect(body.skipTicket).toBe(true);
    });
});

// Test: Ticket status retrieval
describe('TicketStatusService.getPostTicketStatus', () => {
    it('should return tickets for post_id', () => {
        const result = service.getPostTicketStatus('post-123', db);

        expect(result.post_id).toBe('post-123');
        expect(result.tickets).toHaveLength(2);
        expect(result.summary.total).toBe(2);
        expect(result.summary.pending).toBe(1);
        expect(result.summary.processing).toBe(1);
    });
});
```

**Integration Tests**
```javascript
// Test: End-to-end ticket creation and retrieval
describe('Ticket Creation Integration', () => {
    it('should create ticket and retrieve status', async () => {
        // 1. Create post with URL
        const postResponse = await request(app)
            .post('/api/v1/agent-posts')
            .send({
                content: 'Check this out: https://example.com',
                author_agent: 'test-agent'
            });

        const postId = postResponse.body.data.id;

        // 2. Verify ticket created
        const ticketsResponse = await request(app)
            .get(`/api/agent-posts/${postId}/tickets`);

        expect(ticketsResponse.body.success).toBe(true);
        expect(ticketsResponse.body.data.tickets).toHaveLength(1);
        expect(ticketsResponse.body.data.tickets[0].post_id).toBe(postId);
        expect(ticketsResponse.body.data.tickets[0].content).toContain('https://example.com');
    });
});

// Test: Worker posts comment successfully
describe('Agent Worker Integration', () => {
    it('should process ticket and post comment', async () => {
        // 1. Create ticket in database
        const ticket = await workQueueRepo.createTicket({
            agent_id: 'link-logger-agent',
            content: 'Post content with https://example.com',
            url: 'https://example.com',
            priority: 'P2',
            post_id: 'post-123'
        });

        // 2. Run worker
        const worker = new AgentWorker({
            ticketId: ticket.id,
            agentId: 'link-logger-agent',
            workQueueRepo
        });

        const result = await worker.execute();

        expect(result.success).toBe(true);
        expect(result.commentId).toBeDefined();

        // 3. Verify comment exists
        const comments = await db.prepare(
            'SELECT * FROM comments WHERE post_id = ?'
        ).all('post-123');

        expect(comments).toHaveLength(1);
        expect(comments[0].author_agent).toBe('link-logger-agent');
    });
});
```

**E2E Tests (Playwright)**
```javascript
// Test: Ticket status badge appears on post
test('should display ticket status badge', async ({ page }) => {
    // 1. Create post with URL
    await page.goto('http://localhost:3000');
    await page.fill('[data-testid="post-input"]', 'Check https://example.com');
    await page.click('[data-testid="post-submit"]');

    // 2. Wait for post to appear with badge
    await page.waitForSelector('[data-testid="ticket-badge"]', {
        timeout: 5000
    });

    // 3. Verify badge shows "pending" status
    const badge = page.locator('[data-testid="ticket-badge"]');
    await expect(badge).toContainText('Pending');

    // 4. Wait for worker to process (up to 30s)
    await page.waitForSelector('[data-testid="ticket-badge"]:has-text("Completed")', {
        timeout: 30000
    });

    // 5. Verify comment appears
    await expect(page.locator('[data-testid="comment"]')).toBeVisible();
});
```

### 4.5 Rollback Plan

**If fixes cause regressions:**

1. **Immediate Rollback**:
   ```bash
   git revert HEAD
   npm run build
   pm2 restart api-server
   ```

2. **Data Cleanup**:
   ```sql
   -- Mark broken tickets as failed
   UPDATE work_queue_tickets
   SET status = 'failed',
       last_error = 'Rollback: broken schema'
   WHERE content IS NULL OR content = '';

   -- Orphaned tickets (no post_id)
   UPDATE work_queue_tickets
   SET status = 'failed',
       last_error = 'Rollback: missing post_id'
   WHERE post_id IS NULL;
   ```

3. **Validation Queries**:
   ```sql
   -- Check all tickets have required fields
   SELECT COUNT(*) FROM work_queue_tickets
   WHERE content IS NULL OR content = ''
      OR post_id IS NULL OR post_id = '';
   -- Expected: 0

   -- Check tickets linkable to posts
   SELECT COUNT(*) FROM work_queue_tickets t
   LEFT JOIN agent_posts p ON t.post_id = p.id
   WHERE p.id IS NULL AND t.status != 'failed';
   -- Expected: 0 (all tickets link to existing posts)
   ```

---

## C - COMPLETION

### 5.1 Test Plan Summary

**Phase 1: Unit Tests (30 tests)**
- Ticket creation schema validation (8 tests)
- Worker comment payload structure (6 tests)
- Ticket status retrieval (8 tests)
- Error handling edge cases (8 tests)

**Phase 2: Integration Tests (12 tests)**
- Post creation with ticket linking (3 tests)
- Worker execution and comment posting (4 tests)
- Ticket status API endpoints (3 tests)
- WebSocket event broadcasting (2 tests)

**Phase 3: E2E Tests (6 tests)**
- Ticket badge display on frontend (2 tests)
- Real-time status updates (2 tests)
- Multiple tickets per post (1 test)
- Worker retry behavior (1 test)

### 5.2 Acceptance Criteria

**AC-001: Ticket Creation**
- [ ] Tickets created with `content` field populated
- [ ] Tickets created with `post_id` field populated
- [ ] No tickets created with `post_content` field
- [ ] Unit tests pass (8/8)

**AC-002: Worker Comment Posting**
- [ ] Comments posted with `content` field
- [ ] Comments posted with `author` field
- [ ] No 400 errors in worker logs
- [ ] Integration tests pass (4/4)

**AC-003: Ticket Status Display**
- [ ] GET /api/agent-posts/:postId/tickets returns tickets
- [ ] Ticket status summary calculated correctly
- [ ] Frontend displays ticket badges
- [ ] E2E tests pass (2/2)

**AC-004: Data Integrity**
- [ ] Zero tickets with NULL content
- [ ] Zero tickets with NULL post_id
- [ ] All tickets link to existing posts
- [ ] SQL validation queries return 0

### 5.3 Definition of Done

**Code Changes**:
- [ ] server.js updated with correct field names
- [ ] agent-worker.js comment payload validated
- [ ] ticket-creation-service.cjs used for all ticket creation
- [ ] Code review approved by 1+ engineer

**Testing**:
- [ ] All unit tests pass (30/30)
- [ ] All integration tests pass (12/12)
- [ ] All E2E tests pass (6/6)
- [ ] Manual testing completed with real URLs

**Documentation**:
- [ ] API documentation updated
- [ ] Code comments added to critical sections
- [ ] This SPARC document marked COMPLETE

**Deployment**:
- [ ] Changes merged to main branch
- [ ] Deployed to staging environment
- [ ] Smoke tests pass in staging
- [ ] Deployed to production
- [ ] Production monitoring confirms success

### 5.4 Success Metrics

**Immediate Metrics (24 hours post-deployment)**:
- Ticket creation success rate: 100%
- Worker comment posting success rate: >95%
- Tickets with post_id populated: 100%
- Badge display rate: 100% (for posts with tickets)

**Ongoing Metrics (7 days post-deployment)**:
- Zero tickets with NULL content field
- Zero tickets with NULL post_id field
- Worker retry rate: <5%
- Worker permanent failure rate: <1%
- API error rate for comment creation: <0.1%

**User Experience Metrics**:
- Time to badge display: <5 seconds after post creation
- Time to completion badge: <60 seconds for typical URL
- User complaints about missing badges: 0

### 5.5 Implementation Checklist

**Step 1: Fix Ticket Creation (server.js)**
- [ ] Replace `post_content` with `content` in createTicket() call
- [ ] Replace `post_author` with `agent_id` parameter
- [ ] Add `url` parameter from URL extraction
- [ ] Add `priority` parameter (default 'P2')
- [ ] Verify `post_id` parameter present
- [ ] Update metadata structure
- [ ] Run unit tests
- [ ] Commit: "fix: correct ticket creation schema in server.js"

**Step 2: Enhance Worker Comment Posting (agent-worker.js)**
- [ ] Add content validation before POST
- [ ] Add author validation before POST
- [ ] Enhance error logging with full context
- [ ] Add retry backoff logic
- [ ] Run integration tests
- [ ] Commit: "fix: validate comment payload in agent-worker"

**Step 3: Refactor to Use Ticket Creation Service**
- [ ] Import ticket-creation-service.cjs in server.js
- [ ] Replace direct createTicket() calls with processPostForProactiveAgents()
- [ ] Remove duplicate ticket creation logic
- [ ] Verify service handles post_id correctly
- [ ] Run unit and integration tests
- [ ] Commit: "refactor: use ticket-creation-service for consistency"

**Step 4: Add Validation and Error Handling**
- [ ] Add validateTicketData() function
- [ ] Add validateCommentPayload() function
- [ ] Add structured logging helpers
- [ ] Add error context to all thrown errors
- [ ] Run all tests
- [ ] Commit: "feat: add validation and enhanced error handling"

**Step 5: Testing**
- [ ] Write/update unit tests
- [ ] Write/update integration tests
- [ ] Write/update E2E tests
- [ ] Run full test suite
- [ ] Fix any failures
- [ ] Commit: "test: comprehensive ticket linking tests"

**Step 6: Documentation**
- [ ] Update API documentation
- [ ] Add code comments
- [ ] Update CHANGELOG.md
- [ ] Update this SPARC document status
- [ ] Commit: "docs: update ticket linking documentation"

**Step 7: Deployment**
- [ ] Create PR with all commits
- [ ] Code review and approval
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## Appendix A: Current State Analysis

### Database State

```sql
-- Current ticket count
SELECT COUNT(*) FROM work_queue_tickets;
-- Result: ~500 tickets

-- Tickets without post_id
SELECT COUNT(*) FROM work_queue_tickets WHERE post_id IS NULL;
-- Expected: High number (this is the bug)

-- Tickets without content
SELECT COUNT(*) FROM work_queue_tickets WHERE content IS NULL OR content = '';
-- Expected: Some number (also bug)

-- Recent tickets
SELECT id, agent_id, url, status, post_id, created_at
FROM work_queue_tickets
ORDER BY created_at DESC
LIMIT 10;
-- Shows recent ticket creation pattern
```

### Log Analysis

```
CRITICAL LOG ENTRIES:

[ERROR] Failed to create comment on post post-1761272534219: 400 Content is required
  Ticket ID: 67dd8808-8c6b-4e2d-a358-8b782c46ed70
  Agent ID: link-logger-agent
  Location: agent-worker.js:241

[INFO] Work ticket created for orchestrator: ticket-716
  Issue: Ticket ID shown but no post_id link logged

[INFO] Spawning worker worker-1729... for ticket 67dd8808-8c6b-4e2d-a358-8b782c46ed70
  Status: Worker spawned but fails on comment posting

[WARN] Ticket 67dd8808-8c6b-4e2d-a358-8b782c46ed70 retry 3/3
  Status: Max retries reached, ticket marked failed
```

### API Responses

```json
// GET /api/agent-posts/post-1761272534219/tickets
// CURRENT (BROKEN):
{
  "success": true,
  "data": {
    "post_id": "post-1761272534219",
    "tickets": [],
    "summary": {
      "total": 0,
      "pending": 0,
      "processing": 0,
      "completed": 0,
      "failed": 0,
      "agents": []
    }
  }
}

// EXPECTED (AFTER FIX):
{
  "success": true,
  "data": {
    "post_id": "post-1761272534219",
    "tickets": [
      {
        "id": "67dd8808-8c6b-4e2d-a358-8b782c46ed70",
        "agent_id": "link-logger-agent",
        "url": "https://www.linkedin.com/pulse/...",
        "status": "completed",
        "content": "AgentDB threatens vector database market...",
        "post_id": "post-1761272534219",
        "created_at": 1761272024990
      }
    ],
    "summary": {
      "total": 1,
      "pending": 0,
      "processing": 0,
      "completed": 1,
      "failed": 0,
      "agents": ["link-logger-agent"]
    }
  }
}
```

---

## Appendix B: File Locations

```
/workspaces/agent-feed/
├── api-server/
│   ├── server.js                              # FIX NEEDED: Line 1004-1020
│   ├── worker/
│   │   └── agent-worker.js                     # FIX NEEDED: Line 222-227, 241
│   ├── services/
│   │   ├── ticket-creation-service.cjs         # CORRECT: Use this
│   │   ├── ticket-status-service.js            # CORRECT: No changes needed
│   │   └── url-detection-service.cjs           # CORRECT: No changes needed
│   ├── repositories/
│   │   └── work-queue-repository.js            # CORRECT: Schema is right
│   ├── avi/
│   │   └── orchestrator.js                     # CORRECT: No changes needed
│   └── db/
│       └── migrations/
│           └── 005-work-queue.sql              # CORRECT: Schema is right
├── frontend/
│   └── src/
│       └── components/
│           └── TicketStatusBadge.jsx           # CORRECT: Consumes API
└── docs/
    └── SPARC-TICKET-LINKING-FIX.md            # THIS DOCUMENT
```

---

## Appendix C: Quick Reference Commands

```bash
# Check ticket status
sqlite3 database.db "SELECT id, agent_id, status, post_id FROM work_queue_tickets ORDER BY created_at DESC LIMIT 10"

# Check for tickets without post_id
sqlite3 database.db "SELECT COUNT(*) FROM work_queue_tickets WHERE post_id IS NULL"

# Check for tickets without content
sqlite3 database.db "SELECT COUNT(*) FROM work_queue_tickets WHERE content IS NULL OR content = ''"

# Check specific post tickets
sqlite3 database.db "SELECT * FROM work_queue_tickets WHERE post_id = 'post-1761272534219'"

# Test ticket status API
curl http://localhost:3001/api/agent-posts/post-1761272534219/tickets

# Check worker logs
tail -f logs/combined.log | grep "agent-worker"

# Run unit tests
cd api-server && npm test -- work-queue-repository

# Run integration tests
cd api-server && npm test -- agent-worker-e2e

# Run E2E tests
cd tests/e2e && npx playwright test ticket-status-indicator
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | Claude (Sonnet 4.5) | Initial specification |

---

**STATUS**: READY FOR IMPLEMENTATION
**NEXT STEP**: Begin Step 1 - Fix Ticket Creation (server.js)
