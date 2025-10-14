# SPARC Specification: Comment-to-Ticket Integration

**Version:** 1.0
**Date:** 2025-10-14
**Status:** Specification Phase
**Author:** Claude (SPARC Specification Agent)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Requirements Specification](#3-requirements-specification)
4. [System Architecture](#4-system-architecture)
5. [Data Model Specification](#5-data-model-specification)
6. [API Specification](#6-api-specification)
7. [Integration Points](#7-integration-points)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Phases](#10-implementation-phases)
11. [Risk Analysis](#11-risk-analysis)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

### 1.1 Purpose

This specification defines the implementation of comment-to-ticket integration, enabling user comments on posts to automatically create work queue tickets that are processed by the AVI orchestrator and Claude Code SDK worker, mirroring the existing post-to-ticket integration.

### 1.2 Current State

- **Posts**: Create tickets automatically via `POST /api/v1/agent-posts` endpoint
- **Comments**: Successfully stored in PostgreSQL but DO NOT create tickets
- **Gap**: Comments like "can you add 'Dani' to the end of the 'workspace_content.md' you created?" are saved but never processed

### 1.3 Desired State

- **Comments**: Automatically create work queue tickets when posted
- **Processing**: AVI orchestrator assigns tickets to appropriate workers
- **Execution**: Claude Code SDK worker processes comment-based tasks
- **Consistency**: Same reliable pattern as post-to-ticket integration

### 1.4 Business Value

- **User Experience**: Enable conversational task creation via comments
- **Productivity**: Reduce friction for follow-up tasks and refinements
- **Consistency**: Unified workflow for both posts and comments
- **Automation**: Eliminate manual ticket creation for comment-based requests

---

## 2. Problem Statement

### 2.1 Current Behavior

```
User creates comment: "can you add 'Dani' to the end of the 'workspace_content.md' you created?"
↓
POST /api/agent-posts/:postId/comments
↓
Comment saved to PostgreSQL ✅
↓
Work queue ticket created? ❌ (MISSING)
↓
AVI orchestrator processes ticket? ❌ (NEVER HAPPENS)
↓
Worker executes task? ❌ (NEVER HAPPENS)
```

### 2.2 Expected Behavior

```
User creates comment: "can you add 'Dani' to the end of the 'workspace_content.md' you created?"
↓
POST /api/agent-posts/:postId/comments
↓
Comment saved to PostgreSQL ✅
↓
Work queue ticket created ✅ (NEW)
↓
AVI orchestrator detects ticket ✅
↓
Worker executes task ✅
↓
Result posted back to feed ✅
```

### 2.3 Root Cause

The `POST /api/agent-posts/:postId/comments` endpoint (server.js lines 967-1019) creates comments in the database but does NOT call `workQueueRepository.createTicket()`, unlike the `POST /api/v1/agent-posts` endpoint (server.js lines 790-886) which does.

---

## 3. Requirements Specification

### 3.1 Functional Requirements

#### FR-1: Automatic Ticket Creation

**ID:** FR-COMMENT-001
**Priority:** HIGH
**Description:** When a comment is created via `POST /api/agent-posts/:postId/comments`, the system shall automatically create a work queue ticket.

**Acceptance Criteria:**
- Ticket is created in `work_queue` table with status='pending'
- Ticket creation occurs in same database transaction as comment creation
- Ticket includes comment content, author, and post context
- Ticket creation failure does not prevent comment creation (backward compatibility)

**Edge Cases:**
- Database connection failure during ticket creation
- PostgreSQL transaction rollback scenarios
- Duplicate comment submissions (idempotency)

---

#### FR-2: Data Mapping

**ID:** FR-COMMENT-002
**Priority:** HIGH
**Description:** The system shall correctly map comment data to work queue ticket fields.

**Acceptance Criteria:**

| Comment Field | Ticket Field | Mapping Rule |
|--------------|-------------|--------------|
| `id` | `post_id` | Direct mapping (comment ID stored as post_id for tracking) |
| `content` | `post_content` | Direct mapping (comment content is the task) |
| `author_agent` | `post_author` | Direct mapping |
| `post_id` | `post_metadata.parent_post_id` | Parent post ID for context |
| N/A | `user_id` | From request headers (`x-user-id`) or 'anonymous' |
| N/A | `priority` | Default: 5 (medium priority) |
| N/A | `status` | Default: 'pending' |
| N/A | `assigned_agent` | Default: NULL (orchestrator assigns) |

**Metadata Structure:**
```json
{
  "parent_post_id": "uuid-of-parent-post",
  "comment_id": "uuid-of-comment",
  "parent_id": "uuid-of-parent-comment-if-reply",
  "mentioned_users": ["user1", "user2"],
  "context_type": "comment",
  "created_at": "2025-10-14T12:00:00Z"
}
```

---

#### FR-3: Context Preservation

**ID:** FR-COMMENT-003
**Priority:** MEDIUM
**Description:** The system shall preserve parent post context in ticket metadata to enable informed task execution.

**Acceptance Criteria:**
- Ticket metadata includes `parent_post_id` to link comment to original post
- Ticket metadata includes `comment_id` for traceability
- Worker can query parent post content for context (separate query, not inline)
- Comment replies include `parent_id` to maintain thread context

**Context Query Pattern:**
```javascript
// Worker can query parent post if needed
const parentPost = await dbSelector.getPostById(ticket.post_metadata.parent_post_id);
```

---

#### FR-4: Error Handling

**ID:** FR-COMMENT-004
**Priority:** HIGH
**Description:** The system shall handle ticket creation failures gracefully without disrupting comment creation.

**Acceptance Criteria:**
- Comment creation succeeds even if ticket creation fails
- Ticket creation errors are logged but not returned to client
- HTTP 201 response returned when comment is successfully created
- Error response includes `ticket: null` field when ticket creation fails

**Error Scenarios:**
| Scenario | Comment Creation | Ticket Creation | HTTP Response |
|----------|-----------------|-----------------|---------------|
| Success | ✅ | ✅ | 201 + ticket info |
| Ticket fails | ✅ | ❌ | 201 + ticket: null |
| Comment fails | ❌ | N/A | 500 + error |

---

#### FR-5: API Response Enhancement

**ID:** FR-COMMENT-005
**Priority:** LOW
**Description:** The system shall include ticket information in comment creation response.

**Acceptance Criteria:**
- Response includes `ticket` field with ticket ID and status when created
- Response includes `ticket: null` when ticket creation fails
- Response maintains backward compatibility (existing fields unchanged)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "content": "can you add 'Dani' to the file?",
    "author_agent": "user-123",
    "created_at": "2025-10-14T12:00:00Z"
  },
  "ticket": {
    "id": 42,
    "status": "pending"
  },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

---

### 3.2 Non-Functional Requirements

#### NFR-1: Performance

**ID:** NFR-COMMENT-001
**Priority:** HIGH
**Description:** Comment creation with ticket generation shall complete within acceptable time limits.

**Requirements:**
- **Latency**: 95th percentile response time < 150ms (including ticket creation)
- **Baseline**: Current comment creation: ~50ms (from benchmarks)
- **Budget**: Ticket creation adds ~50ms (based on post-to-ticket benchmarks)
- **Target**: Total < 150ms for 95% of requests

**Measurement:**
```javascript
// Test implementation
const startTime = Date.now();
await request(API_URL)
  .post('/api/agent-posts/:postId/comments')
  .send(commentData);
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(150);
```

---

#### NFR-2: Reliability

**ID:** NFR-COMMENT-002
**Priority:** HIGH
**Description:** The system shall maintain high reliability for comment and ticket creation.

**Requirements:**
- **Availability**: 99.9% uptime for comment creation endpoint
- **Ticket Success Rate**: 99% of comments successfully create tickets
- **Error Recovery**: Failed tickets logged for manual review/retry
- **Backward Compatibility**: No breaking changes to existing comment API

---

#### NFR-3: Data Integrity

**ID:** NFR-COMMENT-003
**Priority:** HIGH
**Description:** The system shall maintain data consistency between comments and tickets.

**Requirements:**
- **Atomicity**: Comment creation and ticket creation in single transaction when possible
- **Idempotency**: Duplicate comment submissions do not create duplicate tickets
- **Referential Integrity**: Ticket `post_metadata` always includes valid `parent_post_id`
- **Audit Trail**: All ticket creation attempts logged (success or failure)

---

#### NFR-4: Scalability

**ID:** NFR-COMMENT-004
**Priority:** MEDIUM
**Description:** The system shall handle increased comment volume without degradation.

**Requirements:**
- **Throughput**: Support 100 comments/minute without performance degradation
- **Queue Growth**: Work queue can handle 1000+ pending tickets
- **Database Load**: Ticket creation does not exceed 50ms even under load
- **Resource Limits**: No memory leaks or connection pool exhaustion

---

### 3.3 Constraints

#### Technical Constraints

- **Database**: PostgreSQL only (no SQLite support required for Phase 1)
- **Existing Schema**: Work queue table schema cannot change (backward compatibility)
- **API Contract**: Cannot break existing comment creation API
- **Transaction Handling**: Must use existing `dbSelector` transaction patterns

#### Business Constraints

- **Timeline**: Implementation target: 2 weeks (specification + implementation + testing)
- **Resources**: Single developer, part-time (20-25 hours/week)
- **Risk Tolerance**: Low - cannot disrupt existing post-to-ticket integration
- **Maintenance**: Solution must be maintainable by single developer

#### Regulatory Constraints

- **Data Privacy**: Comment content may contain sensitive information (proper logging practices)
- **Audit Compliance**: All ticket creation must be auditable (timestamp + user tracking)

---

## 4. System Architecture

### 4.1 Current Architecture (Before)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                                │
└───────────┬──────────────────────────────────────┬───────────────────┘
            │                                      │
            │ POST /api/v1/agent-posts             │ POST /api/agent-posts/:postId/comments
            │ (creates post + ticket)              │ (creates comment ONLY)
            ↓                                      ↓
┌───────────────────────────────┐    ┌───────────────────────────────┐
│   POST CREATION ENDPOINT      │    │  COMMENT CREATION ENDPOINT    │
│   (server.js:790-886)         │    │  (server.js:967-1019)         │
│                               │    │                               │
│  1. Validate post data        │    │  1. Validate comment data     │
│  2. Create post in DB         │    │  2. Create comment in DB      │
│  3. Create ticket ✅          │    │  3. Create ticket ❌ MISSING │
│  4. Return response           │    │  4. Return response           │
└───────────┬───────────────────┘    └───────────────────────────────┘
            │
            │
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                         WORK QUEUE TABLE                              │
│  (PostgreSQL: work_queue)                                             │
│                                                                       │
│  ✅ Tickets from posts                                                │
│  ❌ No tickets from comments                                          │
└───────────┬───────────────────────────────────────────────────────────┘
            │
            │ Polls every 5 seconds
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                      AVI ORCHESTRATOR                                 │
│  (src/avi/orchestrator.ts)                                            │
│                                                                       │
│  Detects: Posts only                                                  │
│  Missing: Comments                                                    │
└───────────┬───────────────────────────────────────────────────────────┘
            │
            │ Spawns worker
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                   CLAUDE CODE SDK WORKER                              │
│  (src/worker/unified-agent-worker.ts)                                 │
│                                                                       │
│  Processes: Post-based tasks only                                     │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 Proposed Architecture (After)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                                │
└───────────┬──────────────────────────────────────┬───────────────────┘
            │                                      │
            │ POST /api/v1/agent-posts             │ POST /api/agent-posts/:postId/comments
            │ (creates post + ticket)              │ (creates comment + ticket) ⭐ NEW
            ↓                                      ↓
┌───────────────────────────────┐    ┌───────────────────────────────┐
│   POST CREATION ENDPOINT      │    │  COMMENT CREATION ENDPOINT    │
│   (server.js:790-886)         │    │  (server.js:967-1019)         │
│                               │    │                               │
│  1. Validate post data        │    │  1. Validate comment data     │
│  2. Create post in DB         │    │  2. Create comment in DB      │
│  3. Create ticket ✅          │    │  3. Create ticket ✅ NEW     │
│  4. Return response           │    │  4. Return response (enhanced)│
└───────────┬───────────────────┘    └───────────┬───────────────────┘
            │                                    │
            │                                    │
            ↓                                    ↓
┌───────────────────────────────────────────────────────────────────────┐
│                    WORK QUEUE REPOSITORY                              │
│  (api-server/repositories/postgres/work-queue.repository.js)          │
│                                                                       │
│  createTicket(ticketData) ← Shared by both posts and comments        │
└───────────┬───────────────────────────────────────────────────────────┘
            │
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                         WORK QUEUE TABLE                              │
│  (PostgreSQL: work_queue)                                             │
│                                                                       │
│  ✅ Tickets from posts                                                │
│  ✅ Tickets from comments ⭐ NEW                                      │
│                                                                       │
│  Ticket metadata distinguishes source:                                │
│  - context_type: "post" or "comment"                                  │
│  - parent_post_id: For comments                                       │
│  - comment_id: For traceability                                       │
└───────────┬───────────────────────────────────────────────────────────┘
            │
            │ Polls every 5 seconds
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                      AVI ORCHESTRATOR                                 │
│  (src/avi/orchestrator.ts)                                            │
│                                                                       │
│  Detects: Posts AND Comments ⭐ NEW                                   │
│  Routes: Based on context_type in metadata                            │
└───────────┬───────────────────────────────────────────────────────────┘
            │
            │ Spawns worker
            ↓
┌───────────────────────────────────────────────────────────────────────┐
│                   CLAUDE CODE SDK WORKER                              │
│  (src/worker/unified-agent-worker.ts)                                 │
│                                                                       │
│  Processes: Posts AND Comments ⭐ NEW                                 │
│  Context: Can query parent post for context if needed                │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.3 Component Responsibilities

#### Component: Comment Creation Endpoint

**File:** `/workspaces/agent-feed/api-server/server.js` (lines 967-1019)

**Current Responsibilities:**
1. Validate comment request data
2. Create comment in database via `dbSelector.createComment()`
3. Return HTTP 201 response

**New Responsibilities:**
4. Create work queue ticket via `workQueueRepository.createTicket()`
5. Include ticket info in response
6. Log ticket creation errors (but don't fail comment creation)

**Implementation Changes:**
- Add ticket creation logic after successful comment creation
- Mirror pattern from `POST /api/v1/agent-posts` (lines 845-867)
- Add try-catch around ticket creation for graceful degradation

---

#### Component: Work Queue Repository

**File:** `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`

**Responsibilities:** (NO CHANGES REQUIRED)
1. Create tickets in PostgreSQL `work_queue` table
2. Validate ticket data structure
3. Handle database errors
4. Return created ticket with ID

**Why No Changes:**
- Existing `createTicket()` method already supports arbitrary `post_content`
- Metadata field is JSONB, supports any structure
- Comment tickets use same schema as post tickets

---

#### Component: AVI Orchestrator

**File:** `/workspaces/agent-feed/src/avi/orchestrator.ts`

**Responsibilities:** (NO CHANGES REQUIRED)
1. Poll `work_queue` table for pending tickets
2. Assign tickets to workers
3. Monitor worker execution

**Why No Changes:**
- Orchestrator is content-agnostic (processes all pending tickets)
- Ticket routing based on `assigned_agent` field (already supported)
- Comment vs post distinction happens in metadata (transparent to orchestrator)

---

#### Component: Claude Code SDK Worker

**File:** `/workspaces/agent-feed/src/worker/unified-agent-worker.ts`

**Responsibilities:** (MINIMAL CHANGES - Optional Enhancement)
1. Execute tasks from ticket content
2. Parse natural language requests
3. Execute file operations, code generation, etc.

**Optional Enhancement:**
- Check `post_metadata.context_type` field
- If `context_type === "comment"`, optionally query parent post for context
- Current implementation: Works without changes (treats comment content as task)

---

### 4.4 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER ACTION                                 │
│  "can you add 'Dani' to the end of workspace_content.md?"           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Comment Creation Request                                    │
│  POST /api/agent-posts/550e8400/comments                             │
│  Headers: { x-user-id: "user-123" }                                  │
│  Body: {                                                             │
│    content: "can you add 'Dani' to workspace_content.md?",          │
│    author: "user-123"                                                │
│  }                                                                   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Comment Endpoint Processing                                 │
│  server.js: app.post('/api/agent-posts/:postId/comments')           │
│                                                                      │
│  1. Extract postId from params                                       │
│  2. Validate content and author                                      │
│  3. Prepare comment data                                             │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Database Comment Creation                                   │
│  await dbSelector.createComment(userId, commentData)                 │
│                                                                      │
│  INSERT INTO comments (id, post_id, content, author, ...)           │
│  VALUES ('abc-123', '550e8400', 'can you add...', 'user-123', ...)  │
│                                                                      │
│  Result: Comment object with ID                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Work Queue Ticket Creation ⭐ NEW                           │
│  await workQueueRepository.createTicket({                            │
│    user_id: "user-123",                                              │
│    post_id: "abc-123",              // Comment ID                    │
│    post_content: "can you add...",  // Comment content               │
│    post_author: "user-123",                                          │
│    post_metadata: {                                                  │
│      parent_post_id: "550e8400",   // Original post                 │
│      comment_id: "abc-123",                                          │
│      context_type: "comment"                                         │
│    },                                                                │
│    priority: 5                                                       │
│  })                                                                  │
│                                                                      │
│  INSERT INTO work_queue (...)                                        │
│  VALUES (...)                                                        │
│                                                                      │
│  Result: Ticket object with ID = 42                                  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: HTTP Response                                               │
│  res.status(201).json({                                              │
│    success: true,                                                    │
│    data: { ...comment },                                             │
│    ticket: { id: 42, status: "pending" },                           │
│    message: "Comment created successfully"                           │
│  })                                                                  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: AVI Orchestrator Detection (Next Poll Cycle)               │
│  orchestrator.ts: pollForTickets()                                   │
│                                                                      │
│  SELECT * FROM work_queue WHERE status='pending'                     │
│  ORDER BY priority DESC, created_at ASC                              │
│  LIMIT 1                                                             │
│                                                                      │
│  Result: Ticket ID 42 detected                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: Worker Assignment                                           │
│  orchestrator.ts: assignWorker(ticket)                               │
│                                                                      │
│  1. Mark ticket as 'assigned'                                        │
│  2. Spawn UnifiedAgentWorker                                         │
│  3. Pass ticket data to worker                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: Worker Execution                                            │
│  unified-agent-worker.ts: execute()                                  │
│                                                                      │
│  1. Parse task: "add 'Dani' to workspace_content.md"                │
│  2. Locate file: workspace_content.md                                │
│  3. Read file content                                                │
│  4. Append 'Dani' to end                                             │
│  5. Write file                                                       │
│  6. Return result                                                    │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 9: Ticket Completion                                           │
│  workQueueRepository.completeTicket(ticketId, result)                │
│                                                                      │
│  UPDATE work_queue                                                   │
│  SET status='completed',                                             │
│      result='{"success": true, "file_modified": true}',              │
│      completed_at=NOW()                                              │
│  WHERE id=42                                                         │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 10: User Notification (Optional)                               │
│  - WebSocket notification                                            │
│  - Agent feed post with result                                       │
│  - Comment reply with confirmation                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model Specification

### 5.1 Comments Table Schema (Existing - No Changes)

**Table:** `comments`
**Database:** PostgreSQL or SQLite (dual support via `dbSelector`)

```sql
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
```

---

### 5.2 Work Queue Table Schema (Existing - No Changes)

**Table:** `work_queue`
**Database:** PostgreSQL only

```sql
CREATE TABLE IF NOT EXISTS work_queue (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User identification
  user_id VARCHAR(100) NOT NULL,

  -- Post/ticket information
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT NOT NULL,
  post_author VARCHAR(100),
  post_metadata JSONB,

  -- Agent assignment
  assigned_agent VARCHAR(50),
  worker_id VARCHAR(100),

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: pending, assigned, in_progress, completed, failed

  -- Priority (higher = more important)
  priority INTEGER DEFAULT 0 NOT NULL,

  -- Result data
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_user_status ON work_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_work_queue_assigned_agent ON work_queue(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue(priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_work_queue_created ON work_queue(created_at DESC);
```

---

### 5.3 Ticket Data Structure for Comments

#### Input Data (Comment)

```javascript
{
  id: "abc-123-def-456",
  post_id: "550e8400-e29b-41d4-a716-446655440000",
  content: "can you add 'Dani' to the end of workspace_content.md?",
  author_agent: "user-123",
  parent_id: null,  // or parent comment UUID if reply
  mentioned_users: [],
  created_at: "2025-10-14T12:00:00Z"
}
```

#### Ticket Mapping (Output)

```javascript
{
  user_id: "user-123",
  post_id: "abc-123-def-456",  // Comment ID (for traceability)
  post_content: "can you add 'Dani' to the end of workspace_content.md?",
  post_author: "user-123",
  post_metadata: {
    parent_post_id: "550e8400-e29b-41d4-a716-446655440000",  // Original post
    comment_id: "abc-123-def-456",
    parent_id: null,  // Parent comment if reply
    mentioned_users: [],
    context_type: "comment",  // Distinguishes from posts
    created_at: "2025-10-14T12:00:00Z"
  },
  assigned_agent: null,  // Orchestrator assigns
  priority: 5  // Medium priority (configurable)
}
```

#### Comparison: Post vs Comment Tickets

| Field | Post Ticket | Comment Ticket |
|-------|------------|----------------|
| `post_id` | Post UUID | Comment UUID |
| `post_content` | Post content | Comment content |
| `post_author` | Post author | Comment author |
| `post_metadata.context_type` | "post" (optional) | "comment" (required) |
| `post_metadata.parent_post_id` | N/A | Parent post UUID |
| `post_metadata.comment_id` | N/A | Comment UUID (duplicate for clarity) |
| `priority` | 5 (default) | 5 (default) |

---

## 6. API Specification

### 6.1 Enhanced Comment Creation Endpoint

#### Endpoint Details

**Method:** `POST`
**Path:** `/api/agent-posts/:postId/comments`
**Description:** Create a comment on a post and automatically create a work queue ticket

**Authentication:** None (optional `x-user-id` header)

#### Request Specification

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | string (UUID) | Yes | ID of the post to comment on |

**Headers:**

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-user-id` | string | No | User identifier (defaults to 'anonymous') |

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Comment text content (max 10,000 chars) |
| `author` | string | Yes | Author identifier |
| `parent_id` | string (UUID) | No | Parent comment ID (for threaded replies) |
| `mentioned_users` | array[string] | No | List of mentioned user IDs |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/agent-posts/550e8400/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "content": "can you add 'Dani' to the end of workspace_content.md?",
    "author": "user-123",
    "parent_id": null,
    "mentioned_users": []
  }'
```

#### Response Specification

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "abc-123-def-456",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "can you add 'Dani' to the end of workspace_content.md?",
    "author_agent": "user-123",
    "parent_id": null,
    "mentioned_users": [],
    "depth": 0,
    "created_at": "2025-10-14T12:00:00Z",
    "updated_at": "2025-10-14T12:00:00Z"
  },
  "ticket": {
    "id": 42,
    "status": "pending"
  },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

**Success Response (Ticket Creation Failed - Still 201):**

```json
{
  "success": true,
  "data": {
    "id": "abc-123-def-456",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "can you add 'Dani' to the end of workspace_content.md?",
    "author_agent": "user-123",
    "created_at": "2025-10-14T12:00:00Z"
  },
  "ticket": null,
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Content is required"
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Failed to create comment",
  "details": "Database connection error"
}
```

---

### 6.2 Backward Compatibility Analysis

#### Existing API Contract

**Current Response (Before Enhancement):**

```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "post_id": "550e8400",
    "content": "comment text",
    "author_agent": "user-123",
    "created_at": "2025-10-14T12:00:00Z"
  },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

#### Changes

**Added Fields (Non-Breaking):**

- `ticket` (object or null) - New optional field
- `ticket.id` (number) - Ticket ID if created
- `ticket.status` (string) - Ticket status

**Unchanged Fields:**

- `success` (boolean)
- `data` (object) - Comment data
- `message` (string)
- `source` (string)

**Compatibility Assessment:**

✅ **Backward Compatible** - Existing clients ignore new `ticket` field
✅ **No Breaking Changes** - All existing fields maintained
✅ **Graceful Degradation** - `ticket: null` when creation fails
✅ **HTTP Status Unchanged** - Still 201 for successful comment creation

---

## 7. Integration Points

### 7.1 Comment Creation Endpoint Integration

**File:** `/workspaces/agent-feed/api-server/server.js`
**Function:** `app.post('/api/agent-posts/:postId/comments')`
**Lines:** 967-1019

#### Implementation Changes

**Current Implementation (Simplified):**

```javascript
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, parent_id, mentioned_users } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Create comment
    const commentData = {
      id: uuidv4(),
      post_id: postId,
      content: content.trim(),
      author_agent: author.trim(),
      parent_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: 0
    };

    const createdComment = await dbSelector.createComment(userId, commentData);

    // Return response
    res.status(201).json({
      success: true,
      data: createdComment,
      message: 'Comment created successfully',
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});
```

#### Enhanced Implementation (New)

```javascript
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, parent_id, mentioned_users } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({ success: false, error: 'Author is required' });
    }

    // Create comment
    const commentData = {
      id: uuidv4(),
      post_id: postId,
      content: content.trim(),
      author_agent: author.trim(),
      parent_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: 0
    };

    const createdComment = await dbSelector.createComment(userId, commentData);

    console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}`);

    // ⭐ NEW: Create work queue ticket for AVI orchestrator
    let ticket = null;
    try {
      ticket = await workQueueRepository.createTicket({
        user_id: userId,
        post_id: createdComment.id,  // Comment ID (for traceability)
        post_content: createdComment.content,
        post_author: createdComment.author_agent,
        post_metadata: {
          parent_post_id: postId,  // Original post ID
          comment_id: createdComment.id,
          parent_id: parent_id || null,
          mentioned_users: mentioned_users || [],
          context_type: 'comment',  // Distinguishes from posts
          created_at: createdComment.created_at
        },
        assigned_agent: null,  // Let orchestrator assign
        priority: 5  // Default medium priority
      });

      console.log(`✅ Work ticket created for comment: ticket-${ticket.id}`);
    } catch (ticketError) {
      console.error('❌ Failed to create work ticket for comment:', ticketError);
      // Log error but don't fail the comment creation
      // This maintains backward compatibility
    }

    // Return response with ticket info
    res.status(201).json({
      success: true,
      data: createdComment,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,  // ⭐ NEW
      message: 'Comment created successfully',
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});
```

#### Changes Summary

**Lines to Add:** ~30 lines
**Lines to Remove:** 0 lines
**Risk Level:** LOW (additive changes only)

**Key Changes:**

1. **Import Statement** (top of file):
   ```javascript
   import workQueueRepository from './repositories/postgres/work-queue.repository.js';
   ```

2. **Ticket Creation Block** (after comment creation):
   - Try-catch wrapper for graceful failure
   - Call `workQueueRepository.createTicket()`
   - Log success or error
   - Store ticket object for response

3. **Response Enhancement** (return statement):
   - Add `ticket` field to response
   - Include `{ id, status }` if ticket created
   - Include `null` if ticket creation failed

---

### 7.2 Work Queue Repository Integration

**File:** `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`
**Method:** `createTicket(ticket)`
**Lines:** 17-47

#### Integration Points

**NO CHANGES REQUIRED** ✅

The existing `createTicket()` method already supports comment tickets:

```javascript
async createTicket(ticket) {
  const query = `
    INSERT INTO work_queue (
      user_id,
      post_id,
      post_content,
      post_author,
      post_metadata,
      assigned_agent,
      priority,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'pending', NOW(), NOW())
    RETURNING *
  `;

  const values = [
    ticket.user_id || 'anonymous',
    ticket.post_id,  // Can be post ID OR comment ID
    ticket.post_content,  // Can be post content OR comment content
    ticket.post_author || null,
    JSON.stringify(ticket.post_metadata || {}),  // Supports any metadata structure
    ticket.assigned_agent || null,
    ticket.priority || 0
  ];

  const result = await postgresManager.query(query, values);
  return result.rows[0];
}
```

**Why No Changes:**

- `post_id` field accepts any string (post UUID or comment UUID)
- `post_content` field accepts any text (post or comment content)
- `post_metadata` is JSONB (supports arbitrary structures)
- Method is data-agnostic (doesn't care about source)

---

### 7.3 AVI Orchestrator Integration

**File:** `/workspaces/agent-feed/src/avi/orchestrator.ts`
**Method:** `pollForTickets()`

#### Integration Points

**NO CHANGES REQUIRED** ✅

The orchestrator already:

1. Polls `work_queue` table for `status='pending'`
2. Assigns tickets to workers regardless of source
3. Monitors worker execution
4. Updates ticket status

**Query Pattern (Existing):**

```typescript
async pollForTickets() {
  const tickets = await workQueueRepository.getAllPendingTickets({
    status: 'pending',
    limit: 100
  });

  for (const ticket of tickets) {
    await this.assignWorker(ticket);
  }
}
```

**Why No Changes:**

- Orchestrator is content-agnostic
- Processes all pending tickets equally
- Ticket source (post vs comment) is metadata only
- Worker assignment logic unchanged

---

### 7.4 Worker Integration

**File:** `/workspaces/agent-feed/src/worker/unified-agent-worker.ts`
**Method:** `execute()`

#### Integration Points

**OPTIONAL ENHANCEMENT** (Not Required for MVP)

Current implementation treats `post_content` as task instructions, regardless of source.

**Optional Enhancement: Context Awareness**

```typescript
async execute() {
  const { post_content, post_metadata } = this.ticket;

  // Optional: Check if ticket is from comment
  if (post_metadata?.context_type === 'comment') {
    // Optional: Query parent post for additional context
    const parentPostId = post_metadata.parent_post_id;
    const parentPost = await dbSelector.getPostById(parentPostId);

    console.log(`Processing comment on post: ${parentPost.title}`);
    // Parent post context available but not required for execution
  }

  // Execute task from post_content (works for both posts and comments)
  const result = await this.processNaturalLanguageTask(post_content);

  return result;
}
```

**Why Optional:**

- Worker already processes natural language tasks
- Comment content is self-contained task instruction
- Parent post context rarely needed for execution
- Can be added later if use cases require it

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance Criteria

#### AC-1: Ticket Creation Success

**Given:** A valid comment is submitted via `POST /api/agent-posts/:postId/comments`
**When:** The comment is successfully created in the database
**Then:**
- A work queue ticket is automatically created
- Ticket status is 'pending'
- Ticket `post_id` matches comment ID
- Ticket `post_content` matches comment content
- Ticket `post_metadata.context_type` is 'comment'
- Ticket `post_metadata.parent_post_id` matches post ID

**Test Method:** Integration test with real database

```javascript
// Test implementation
it('should create work queue ticket when comment is created', async () => {
  const commentData = {
    content: 'can you add "Dani" to workspace_content.md?',
    author: 'user-123'
  };

  const response = await request(API_URL)
    .post('/api/agent-posts/550e8400/comments')
    .send(commentData)
    .expect(201);

  expect(response.body.success).toBe(true);
  expect(response.body.ticket).toBeDefined();
  expect(response.body.ticket.id).toBeDefined();
  expect(response.body.ticket.status).toBe('pending');

  // Verify ticket in database
  const ticket = await workQueueRepository.getTicketById(response.body.ticket.id);
  expect(ticket.post_id).toBe(response.body.data.id);
  expect(ticket.post_content).toBe(commentData.content);
  expect(ticket.post_metadata.context_type).toBe('comment');
  expect(ticket.post_metadata.parent_post_id).toBe('550e8400');
});
```

---

#### AC-2: Graceful Degradation

**Given:** Comment creation succeeds but ticket creation fails
**When:** Ticket repository throws an error
**Then:**
- Comment is still created successfully
- HTTP 201 response returned
- Response includes `ticket: null`
- Error is logged (not returned to client)

**Test Method:** Integration test with database error simulation

```javascript
it('should succeed comment creation even if ticket fails', async () => {
  // Simulate ticket creation failure (disconnect PostgreSQL temporarily)

  const commentData = {
    content: 'test comment',
    author: 'user-123'
  };

  const response = await request(API_URL)
    .post('/api/agent-posts/550e8400/comments')
    .send(commentData)
    .expect(201);

  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
  expect(response.body.ticket).toBeNull();

  // Verify comment still created
  const comment = await dbSelector.getCommentById(response.body.data.id);
  expect(comment).toBeDefined();
});
```

---

#### AC-3: Data Integrity

**Given:** Multiple comments are created rapidly
**When:** Ticket creation is triggered for each comment
**Then:**
- Each comment creates exactly ONE ticket
- No duplicate tickets
- All tickets have correct metadata
- No data loss or corruption

**Test Method:** Concurrent request test

```javascript
it('should create one ticket per comment (no duplicates)', async () => {
  const comments = [
    { content: 'comment 1', author: 'user-1' },
    { content: 'comment 2', author: 'user-2' },
    { content: 'comment 3', author: 'user-3' }
  ];

  // Create comments concurrently
  const promises = comments.map(comment =>
    request(API_URL)
      .post('/api/agent-posts/550e8400/comments')
      .send(comment)
  );

  const responses = await Promise.all(promises);

  // Verify each comment created one ticket
  for (const response of responses) {
    expect(response.body.ticket).toBeDefined();
    expect(response.body.ticket.id).toBeDefined();
  }

  // Verify no duplicate tickets
  const ticketIds = responses.map(r => r.body.ticket.id);
  const uniqueIds = new Set(ticketIds);
  expect(uniqueIds.size).toBe(ticketIds.length);
});
```

---

#### AC-4: Orchestrator Detection

**Given:** A comment creates a work queue ticket
**When:** AVI orchestrator polls for pending tickets
**Then:**
- Orchestrator detects the ticket
- Ticket is assigned to a worker
- Worker processes the task
- Ticket status updates to 'completed'

**Test Method:** End-to-end integration test

```javascript
it('should process comment ticket through full workflow', async () => {
  // Create comment
  const response = await request(API_URL)
    .post('/api/agent-posts/550e8400/comments')
    .send({
      content: 'create a test file at /tmp/test.txt with content "Hello"',
      author: 'user-123'
    })
    .expect(201);

  const ticketId = response.body.ticket.id;

  // Wait for orchestrator to process (poll every 1s, timeout 30s)
  let ticket;
  for (let i = 0; i < 30; i++) {
    ticket = await workQueueRepository.getTicketById(ticketId);
    if (ticket.status === 'completed') break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Verify completion
  expect(ticket.status).toBe('completed');
  expect(ticket.result).toBeDefined();
  expect(ticket.result.success).toBe(true);
}, 35000);  // 35s timeout
```

---

### 8.2 Non-Functional Acceptance Criteria

#### AC-5: Performance

**Given:** Comment creation endpoint is under normal load
**When:** 100 comments are created
**Then:**
- 95th percentile response time < 150ms
- Average response time < 100ms
- No timeout errors

**Test Method:** Load test with Apache Bench or Artillery

```bash
# Load test
ab -n 100 -c 10 -p comment.json -T application/json \
  http://localhost:3001/api/agent-posts/550e8400/comments

# Verify results
# Requests per second > 50
# 95th percentile < 150ms
```

---

#### AC-6: Backward Compatibility

**Given:** Existing frontend clients using comment API
**When:** Comment-to-ticket integration is deployed
**Then:**
- All existing API responses still valid
- No breaking changes to response structure
- Clients can ignore new `ticket` field
- HTTP status codes unchanged

**Test Method:** Contract testing with existing client code

```javascript
it('should maintain backward compatible response structure', async () => {
  const response = await request(API_URL)
    .post('/api/agent-posts/550e8400/comments')
    .send({ content: 'test', author: 'user-123' })
    .expect(201);

  // Verify existing fields still present
  expect(response.body).toHaveProperty('success');
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('source');

  // Verify data structure
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data).toHaveProperty('post_id');
  expect(response.body.data).toHaveProperty('content');
  expect(response.body.data).toHaveProperty('author_agent');
});
```

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
        ┌────────────────┐
        │  E2E Tests     │  10% - Full workflow (orchestrator → worker → completion)
        │  (5 tests)     │
        └────────────────┘
              ▲
              │
        ┌────────────────┐
        │ Integration    │  40% - API + Database (real PostgreSQL)
        │ Tests          │
        │ (20 tests)     │
        └────────────────┘
              ▲
              │
        ┌────────────────┐
        │ Unit Tests     │  50% - Repository, utility functions
        │ (25 tests)     │
        └────────────────┘
```

### 9.2 Unit Tests

**Target:** Work queue repository, utility functions
**Framework:** Vitest
**Coverage:** 90%+

#### Test Cases

1. **Ticket Data Mapping**
   - Maps comment to ticket correctly
   - Handles missing optional fields
   - Validates required fields
   - Handles malformed data

2. **Metadata Generation**
   - Creates correct metadata structure
   - Includes parent_post_id
   - Includes comment_id
   - Sets context_type to 'comment'

3. **Error Handling**
   - Validates input data
   - Handles database errors
   - Returns appropriate error messages

**Example Test:**

```javascript
describe('Comment-to-Ticket Mapping', () => {
  it('should map comment data to ticket structure', () => {
    const comment = {
      id: 'abc-123',
      post_id: '550e8400',
      content: 'test comment',
      author_agent: 'user-123'
    };

    const ticket = mapCommentToTicket(comment, 'user-123');

    expect(ticket.user_id).toBe('user-123');
    expect(ticket.post_id).toBe('abc-123');
    expect(ticket.post_content).toBe('test comment');
    expect(ticket.post_author).toBe('user-123');
    expect(ticket.post_metadata.parent_post_id).toBe('550e8400');
    expect(ticket.post_metadata.context_type).toBe('comment');
    expect(ticket.priority).toBe(5);
  });
});
```

---

### 9.3 Integration Tests

**Target:** Comment API + Database + Work Queue
**Framework:** Vitest + Supertest
**Database:** Real PostgreSQL (no mocks)

#### Test Suites

1. **Comment Creation Flow** (10 tests)
   - Successful comment + ticket creation
   - Ticket creation failure (graceful degradation)
   - Invalid input validation
   - Database error handling
   - Response structure validation

2. **Data Integrity** (5 tests)
   - One ticket per comment
   - Correct data mapping
   - Metadata structure
   - Referential integrity
   - Concurrent creation

3. **Performance** (3 tests)
   - Response time < 150ms
   - Throughput > 50 req/s
   - No memory leaks

4. **Backward Compatibility** (2 tests)
   - Response structure unchanged
   - Existing fields present

**Example Test:**

```javascript
describe('Comment-to-Ticket Integration (NO MOCKS)', () => {
  let testPostId = null;
  let testCommentId = null;
  let testTicketId = null;

  beforeEach(async () => {
    // Clean up test data
    if (testCommentId) {
      await postgresManager.query('DELETE FROM work_queue WHERE post_id = $1', [testCommentId]);
      await postgresManager.query('DELETE FROM comments WHERE id = $1', [testCommentId]);
    }
  });

  it('should create work queue ticket when comment is created', async () => {
    const commentData = {
      content: 'Integration test comment',
      author: 'integration-test-user'
    };

    // Create comment via API
    const response = await request(API_URL)
      .post(`/api/agent-posts/${testPostId}/comments`)
      .send(commentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.ticket).toBeDefined();

    testCommentId = response.body.data.id;
    testTicketId = response.body.ticket.id;

    // Verify ticket in database
    const ticketQuery = await postgresManager.query(
      'SELECT * FROM work_queue WHERE id = $1',
      [testTicketId]
    );

    expect(ticketQuery.rows.length).toBe(1);
    const ticket = ticketQuery.rows[0];

    expect(ticket.status).toBe('pending');
    expect(ticket.post_id).toBe(testCommentId);
    expect(ticket.post_content).toBe('Integration test comment');
    expect(ticket.post_metadata.context_type).toBe('comment');
    expect(ticket.post_metadata.parent_post_id).toBe(testPostId);
  });
});
```

---

### 9.4 End-to-End Tests

**Target:** Full workflow (comment → ticket → orchestrator → worker → completion)
**Framework:** Vitest + Real AVI orchestrator
**Duration:** 30-60 seconds per test

#### Test Cases

1. **Full Workflow Test**
   - Create comment with file operation task
   - Verify ticket created
   - Wait for orchestrator to detect
   - Wait for worker to process
   - Verify ticket completed
   - Verify result correct

2. **Error Recovery Test**
   - Create comment with invalid task
   - Verify ticket created
   - Wait for worker to fail
   - Verify ticket marked as failed
   - Verify error message logged

3. **Priority Test**
   - Create multiple comments with different priorities
   - Verify higher priority processed first

**Example Test:**

```javascript
describe('Comment-to-Ticket E2E Workflow', () => {
  it('should process comment through full workflow', async () => {
    // Step 1: Create comment
    const response = await request(API_URL)
      .post(`/api/agent-posts/${testPostId}/comments`)
      .send({
        content: 'create a file at /tmp/test-e2e.txt with content "E2E Test"',
        author: 'e2e-test-user'
      })
      .expect(201);

    const ticketId = response.body.ticket.id;
    console.log(`✅ Comment created, ticket ID: ${ticketId}`);

    // Step 2: Wait for orchestrator to detect and process
    let ticket;
    let attempts = 0;
    const maxAttempts = 30;  // 30 seconds max

    while (attempts < maxAttempts) {
      ticket = await workQueueRepository.getTicketById(ticketId);
      console.log(`   Ticket status: ${ticket.status} (attempt ${attempts + 1}/${maxAttempts})`);

      if (ticket.status === 'completed' || ticket.status === 'failed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Step 3: Verify completion
    expect(ticket.status).toBe('completed');
    expect(ticket.result).toBeDefined();
    expect(ticket.result.success).toBe(true);

    // Step 4: Verify file was created (if worker supports it)
    // const fileExists = fs.existsSync('/tmp/test-e2e.txt');
    // expect(fileExists).toBe(true);

    console.log(`✅ E2E test completed in ${attempts} seconds`);
  }, 35000);  // 35s timeout
});
```

---

### 9.5 Test Execution Plan

#### Phase 1: Unit Tests (Week 1)

```bash
# Run unit tests
npm test -- comment-to-ticket.unit.test.js

# Run with coverage
npm test -- --coverage comment-to-ticket.unit.test.js

# Target: 90%+ coverage
```

#### Phase 2: Integration Tests (Week 1-2)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run integration tests
npm test -- comment-to-ticket.integration.test.js

# Target: All tests pass
```

#### Phase 3: E2E Tests (Week 2)

```bash
# Start full stack (PostgreSQL + API + Orchestrator)
docker-compose up -d

# Run E2E tests
npm test -- comment-to-ticket.e2e.test.js

# Target: Full workflow completes successfully
```

---

### 9.6 Test Data Management

#### Test Database Setup

```sql
-- Create test post
INSERT INTO agent_posts (id, title, content, author_agent, created_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Post', 'Test content', 'test-agent', NOW());

-- Clean up test data (before each test)
DELETE FROM work_queue WHERE post_id LIKE '%test%';
DELETE FROM comments WHERE post_id = '550e8400-e29b-41d4-a716-446655440000';
```

#### Test Data Fixtures

```javascript
// fixtures/comments.js
export const testComments = [
  {
    content: 'Test comment 1',
    author: 'test-user-1',
    parent_id: null
  },
  {
    content: 'Test comment 2',
    author: 'test-user-2',
    parent_id: null
  },
  {
    content: 'Reply to comment 1',
    author: 'test-user-3',
    parent_id: 'comment-1-id'
  }
];
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1, Days 1-3)

#### Objectives

- Implement comment-to-ticket creation
- Add ticket response to API
- Unit tests (mapping, validation)

#### Tasks

| Task | Effort | Dependencies | Deliverable |
|------|--------|-------------|-------------|
| Add workQueueRepository import | 15 min | None | Import statement |
| Implement ticket creation logic | 2 hours | Repository | Ticket creation code |
| Add try-catch error handling | 30 min | Ticket logic | Graceful degradation |
| Enhance API response | 30 min | Ticket logic | Response with ticket field |
| Write unit tests | 4 hours | Implementation | 25 unit tests |
| Code review | 1 hour | Tests pass | Approved PR |

**Total Effort:** ~8 hours

**Success Criteria:**
- Comment creation creates ticket
- Tests pass (unit)
- Code reviewed

---

### Phase 2: Integration Testing (Week 1, Days 4-5)

#### Objectives

- Integration tests with real database
- Verify data integrity
- Performance testing

#### Tasks

| Task | Effort | Dependencies | Deliverable |
|------|--------|-------------|-------------|
| Setup PostgreSQL test environment | 1 hour | None | Test database |
| Write integration tests | 6 hours | Phase 1 | 20 integration tests |
| Performance benchmarking | 2 hours | Integration tests | Benchmark report |
| Load testing | 2 hours | Benchmarks | Load test results |
| Bug fixes | 4 hours | Test failures | Fixes committed |

**Total Effort:** ~15 hours

**Success Criteria:**
- All integration tests pass
- Performance < 150ms (95th percentile)
- No data integrity issues

---

### Phase 3: End-to-End Validation (Week 2, Days 1-3)

#### Objectives

- E2E tests with orchestrator
- Worker integration
- Full workflow validation

#### Tasks

| Task | Effort | Dependencies | Deliverable |
|------|--------|-------------|-------------|
| Setup orchestrator test environment | 2 hours | None | Test orchestrator |
| Write E2E tests | 6 hours | Phase 2 | 5 E2E tests |
| Manual testing scenarios | 4 hours | E2E tests | Test report |
| Bug fixes (orchestrator/worker) | 4 hours | Test failures | Fixes committed |
| Documentation updates | 2 hours | Implementation | Updated docs |

**Total Effort:** ~18 hours

**Success Criteria:**
- Full workflow completes successfully
- Orchestrator detects comment tickets
- Worker processes comment tasks
- Results posted correctly

---

### Phase 4: Production Readiness (Week 2, Days 4-5)

#### Objectives

- Production deployment
- Monitoring setup
- Rollback plan

#### Tasks

| Task | Effort | Dependencies | Deliverable |
|------|--------|-------------|-------------|
| Code review (final) | 2 hours | Phase 3 | Approved PR |
| Monitoring alerts setup | 2 hours | None | Alert rules |
| Deployment runbook | 2 hours | None | Runbook document |
| Staging deployment | 2 hours | Approval | Deployed to staging |
| Staging validation | 2 hours | Staging deploy | Validation report |
| Production deployment | 2 hours | Staging pass | Production deploy |
| Post-deploy monitoring | 4 hours | Production | Monitoring report |

**Total Effort:** ~16 hours

**Success Criteria:**
- Deployed to production
- No errors in logs
- Monitoring alerts configured
- Rollback plan tested

---

### Implementation Timeline

```
Week 1:
  Day 1-3: Phase 1 (Foundation)        [8 hours]
  Day 4-5: Phase 2 (Integration)       [15 hours]

Week 2:
  Day 1-3: Phase 3 (E2E Validation)    [18 hours]
  Day 4-5: Phase 4 (Production)        [16 hours]

Total Effort: ~57 hours (2 weeks @ 25-30 hours/week)
```

---

## 11. Risk Analysis

### 11.1 Technical Risks

#### Risk 1: Database Transaction Handling

**Probability:** MEDIUM
**Impact:** HIGH
**Description:** Comment creation and ticket creation may not be in same transaction, leading to orphaned comments or tickets.

**Mitigation:**
- Use database transactions where possible
- Implement graceful degradation (comment succeeds even if ticket fails)
- Add cleanup job to create tickets for orphaned comments
- Monitor for orphaned records

**Contingency:**
- Implement background job to scan for comments without tickets
- Manually create tickets for orphaned comments
- Alert on high orphan rate

---

#### Risk 2: Performance Degradation

**Probability:** LOW
**Impact:** MEDIUM
**Description:** Adding ticket creation may slow down comment API response times.

**Mitigation:**
- Benchmark current performance (baseline)
- Optimize ticket creation query
- Use database connection pooling
- Monitor P95 latency

**Contingency:**
- Move ticket creation to async queue (Bull/Redis)
- Implement background job for ticket creation
- Scale database if needed

---

#### Risk 3: Work Queue Overload

**Probability:** LOW
**Impact:** MEDIUM
**Description:** High comment volume may overwhelm work queue and orchestrator.

**Mitigation:**
- Implement rate limiting on comment creation
- Monitor queue depth
- Scale orchestrator workers if needed
- Implement priority system (posts > comments)

**Contingency:**
- Pause comment-to-ticket creation temporarily
- Increase worker pool size
- Implement queue backpressure

---

### 11.2 Operational Risks

#### Risk 4: Backward Compatibility Break

**Probability:** LOW
**Impact:** HIGH
**Description:** API changes break existing frontend clients.

**Mitigation:**
- Add new fields, don't remove existing ones
- Maintain HTTP status codes
- Test with existing frontend
- Use API versioning if needed

**Contingency:**
- Rollback deployment immediately
- Fix in hotfix branch
- Deploy fix within 1 hour

---

#### Risk 5: Monitoring Blind Spots

**Probability:** MEDIUM
**Impact:** MEDIUM
**Description:** Insufficient monitoring leads to undetected failures.

**Mitigation:**
- Add metrics for ticket creation success rate
- Alert on high failure rate (>5%)
- Dashboard for comment-to-ticket flow
- Log all ticket creation attempts

**Contingency:**
- Enable debug logging
- Manual database queries to assess impact
- Implement emergency monitoring

---

### 11.3 Risk Matrix

```
                     IMPACT
                LOW    MEDIUM    HIGH
              ┌──────┬────────┬────────┐
PROBABILITY   │      │        │        │
              │      │        │        │
    HIGH      │      │  R3    │  R1    │
              │      │        │        │
              ├──────┼────────┼────────┤
              │      │        │        │
    MEDIUM    │      │  R5    │        │
              │      │        │        │
              ├──────┼────────┼────────┤
              │      │        │        │
    LOW       │      │  R2    │  R4    │
              │      │        │        │
              └──────┴────────┴────────┘

R1: Database Transaction Handling  → MITIGATED (Graceful degradation)
R2: Performance Degradation        → LOW RISK (Benchmarked)
R3: Work Queue Overload           → MITIGATED (Rate limiting)
R4: Backward Compatibility Break  → LOW RISK (Additive changes)
R5: Monitoring Blind Spots        → MITIGATED (Metrics added)
```

---

## 12. Success Metrics

### 12.1 Implementation Success Metrics

#### Metric 1: Test Coverage

**Target:** ≥90% code coverage
**Measurement:** Vitest coverage report
**Success Criteria:**
- Unit tests: 95%+ coverage
- Integration tests: 85%+ coverage
- E2E tests: 100% critical path coverage

**Tracking:**
```bash
npm test -- --coverage
```

---

#### Metric 2: Performance

**Target:** P95 latency < 150ms
**Measurement:** Integration test benchmarks
**Success Criteria:**
- Average response time: <100ms
- P95 response time: <150ms
- P99 response time: <200ms

**Tracking:**
```javascript
// Benchmark test
const startTime = Date.now();
await createComment(data);
const duration = Date.now() - startTime;
metrics.recordLatency(duration);
```

---

#### Metric 3: Reliability

**Target:** 99% ticket creation success rate
**Measurement:** Database queries + logs
**Success Criteria:**
- Ticket creation success rate: ≥99%
- Comment creation success rate: ≥99.9%
- Zero data integrity issues

**Tracking:**
```sql
-- Success rate query
SELECT
  COUNT(*) FILTER (WHERE ticket_created = true) * 100.0 / COUNT(*) as success_rate
FROM comment_creation_logs;
```

---

### 12.2 Production Success Metrics

#### Metric 4: Adoption Rate

**Target:** 80% of comments create tickets
**Measurement:** Database analytics
**Success Criteria:**
- Week 1: 50% of comments create tickets
- Week 2: 70% of comments create tickets
- Week 4: 80%+ of comments create tickets

**Tracking:**
```sql
SELECT
  COUNT(DISTINCT c.id) as total_comments,
  COUNT(DISTINCT w.post_id) as comments_with_tickets,
  COUNT(DISTINCT w.post_id) * 100.0 / COUNT(DISTINCT c.id) as adoption_rate
FROM comments c
LEFT JOIN work_queue w ON c.id = w.post_id
WHERE c.created_at > NOW() - INTERVAL '7 days';
```

---

#### Metric 5: Task Completion Rate

**Target:** 90% of comment tickets completed successfully
**Measurement:** Work queue analytics
**Success Criteria:**
- Tickets completed: ≥90%
- Tickets failed: ≤5%
- Tickets stuck: ≤5%

**Tracking:**
```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM work_queue
WHERE post_metadata->>'context_type' = 'comment'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

#### Metric 6: User Satisfaction

**Target:** Zero complaints about missing task execution
**Measurement:** User feedback, support tickets
**Success Criteria:**
- Zero "comment didn't work" reports
- Positive feedback from users
- No rollback requests

**Tracking:**
- Monitor support channels
- Track user feedback
- Review session recordings

---

### 12.3 Business Success Metrics

#### Metric 7: Task Throughput

**Target:** 500 comment-based tasks per week
**Measurement:** Work queue analytics
**Success Criteria:**
- Week 1: 100 tasks
- Week 2: 250 tasks
- Week 4: 500+ tasks

**Tracking:**
```sql
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as comment_tasks
FROM work_queue
WHERE post_metadata->>'context_type' = 'comment'
GROUP BY week
ORDER BY week DESC;
```

---

#### Metric 8: Time to Task Execution

**Target:** Average 10 seconds from comment to task start
**Measurement:** Timestamp analysis
**Success Criteria:**
- Comment → Ticket: <1 second
- Ticket → Assignment: <5 seconds
- Assignment → Execution: <5 seconds

**Tracking:**
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))) as avg_time_to_assignment,
  AVG(EXTRACT(EPOCH FROM (started_at - assigned_at))) as avg_time_to_execution,
  AVG(EXTRACT(EPOCH FROM (started_at - created_at))) as avg_total_time
FROM work_queue
WHERE post_metadata->>'context_type' = 'comment'
  AND status IN ('assigned', 'processing', 'completed');
```

---

### 12.4 Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│              Comment-to-Ticket Integration Dashboard             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Key Metrics (Last 24 Hours)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Comments Created:          347                                  │
│  Tickets Created:           345  (99.4% success rate) ✅         │
│  Tickets Completed:         312  (90.4% completion rate) ✅       │
│  Tickets Failed:            11   (3.2% failure rate) ✅          │
│  Tickets Pending:           22   (6.4% pending)                  │
│                                                                  │
│  📈 Performance                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Avg Response Time:         87ms   ✅                            │
│  P95 Response Time:         142ms  ✅                            │
│  P99 Response Time:         198ms  ⚠️                            │
│                                                                  │
│  ⏱️ Time to Execution                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Comment → Ticket:          0.4s   ✅                            │
│  Ticket → Assignment:       4.2s   ✅                            │
│  Assignment → Execution:    5.1s   ✅                            │
│  Total:                     9.7s   ✅                            │
│                                                                  │
│  🚨 Alerts                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  No active alerts                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: File Locations

### Files to Modify

| File | Lines | Purpose |
|------|-------|---------|
| `/workspaces/agent-feed/api-server/server.js` | 967-1019 | Add ticket creation to comment endpoint |

### Files to Create

| File | Purpose |
|------|---------|
| `/workspaces/agent-feed/api-server/tests/integration/comment-to-ticket-integration.test.js` | Integration tests |
| `/workspaces/agent-feed/api-server/tests/e2e/comment-to-ticket-e2e.test.js` | E2E tests |
| `/workspaces/agent-feed/docs/COMMENT-TO-TICKET-GUIDE.md` | User guide |

### Files Reference Only (No Changes)

| File | Purpose |
|------|---------|
| `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js` | Ticket creation (existing) |
| `/workspaces/agent-feed/src/avi/orchestrator.ts` | Orchestrator (no changes) |
| `/workspaces/agent-feed/src/worker/unified-agent-worker.ts` | Worker (optional enhancement) |

---

## Appendix B: Example Implementation

### Complete Implementation Code

```javascript
// File: /workspaces/agent-feed/api-server/server.js
// Lines: 967-1019 (enhanced)

import workQueueRepository from './repositories/postgres/work-queue.repository.js';

/**
 * POST /api/agent-posts/:postId/comments
 * Create a comment on a post and automatically create work queue ticket
 */
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, parent_id, mentioned_users } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Author is required'
      });
    }

    // Prepare comment data
    const commentData = {
      id: uuidv4(),
      post_id: postId,
      content: content.trim(),
      author_agent: author.trim(),
      parent_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: 0
    };

    // Create comment using database selector
    const createdComment = await dbSelector.createComment(userId, commentData);

    console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}`);

    // Create work queue ticket for AVI orchestrator (Comment-to-Ticket Integration)
    let ticket = null;
    try {
      ticket = await workQueueRepository.createTicket({
        user_id: userId,
        post_id: createdComment.id,  // Comment ID for traceability
        post_content: createdComment.content,
        post_author: createdComment.author_agent,
        post_metadata: {
          parent_post_id: postId,  // Original post ID
          comment_id: createdComment.id,
          parent_id: parent_id || null,
          mentioned_users: mentioned_users || [],
          context_type: 'comment',  // Distinguishes from posts
          created_at: createdComment.created_at
        },
        assigned_agent: null,  // Let orchestrator assign
        priority: 5  // Default medium priority
      });

      console.log(`✅ Work ticket created for comment: ticket-${ticket.id}`);
    } catch (ticketError) {
      console.error('❌ Failed to create work ticket for comment:', ticketError);
      // Log error but don't fail the comment creation
      // This maintains backward compatibility and graceful degradation
    }

    // Return response with ticket info
    res.status(201).json({
      success: true,
      data: createdComment,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
      message: 'Comment created successfully',
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});
```

---

## Appendix C: SQL Queries

### Query 1: Find Comments Without Tickets (Orphan Detection)

```sql
SELECT
  c.id as comment_id,
  c.post_id,
  c.content,
  c.author,
  c.created_at,
  w.id as ticket_id
FROM comments c
LEFT JOIN work_queue w ON c.id = w.post_id
WHERE w.id IS NULL
  AND c.created_at > NOW() - INTERVAL '1 day'
ORDER BY c.created_at DESC;
```

### Query 2: Comment-to-Ticket Success Rate

```sql
SELECT
  DATE(c.created_at) as date,
  COUNT(c.id) as total_comments,
  COUNT(w.id) as comments_with_tickets,
  COUNT(w.id) * 100.0 / COUNT(c.id) as success_rate
FROM comments c
LEFT JOIN work_queue w ON c.id = w.post_id
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(c.created_at)
ORDER BY date DESC;
```

### Query 3: Comment Ticket Performance

```sql
SELECT
  w.id,
  w.status,
  w.created_at,
  w.assigned_at,
  w.started_at,
  w.completed_at,
  EXTRACT(EPOCH FROM (assigned_at - created_at)) as time_to_assignment_sec,
  EXTRACT(EPOCH FROM (started_at - assigned_at)) as time_to_execution_sec,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as total_time_sec
FROM work_queue w
WHERE w.post_metadata->>'context_type' = 'comment'
  AND w.created_at > NOW() - INTERVAL '1 day'
ORDER BY w.created_at DESC;
```

---

## Appendix D: Configuration

### Environment Variables

```bash
# Database configuration
USE_POSTGRES=true
DATABASE_URL=postgresql://user:pass@localhost:5432/agent_feed

# Work queue configuration
WORK_QUEUE_POLL_INTERVAL=5000  # 5 seconds
WORK_QUEUE_MAX_TICKETS=100

# Comment-to-ticket configuration
COMMENT_TICKET_PRIORITY=5      # Default priority for comment tickets
COMMENT_TICKET_ENABLED=true    # Feature flag (for gradual rollout)
```

### Feature Flag

```javascript
// Feature flag for gradual rollout
const COMMENT_TO_TICKET_ENABLED = process.env.COMMENT_TICKET_ENABLED !== 'false';

// In comment creation endpoint
if (COMMENT_TO_TICKET_ENABLED) {
  try {
    ticket = await workQueueRepository.createTicket({...});
  } catch (error) {
    console.error('Ticket creation failed:', error);
  }
}
```

---

## Validation Checklist

Use this checklist to validate specification completeness before implementation:

- [ ] All functional requirements have acceptance criteria
- [ ] All non-functional requirements have measurable targets
- [ ] Data model changes documented (or "no changes")
- [ ] API contracts defined with examples
- [ ] Integration points identified and assessed
- [ ] Test strategy covers unit, integration, and E2E
- [ ] Implementation phases defined with effort estimates
- [ ] Risks identified with mitigation strategies
- [ ] Success metrics defined and measurable
- [ ] Backward compatibility verified
- [ ] Performance targets established
- [ ] Monitoring and alerting plan defined
- [ ] Rollback plan documented
- [ ] Documentation updates planned

---

**End of Specification Document**

**Next Steps:**

1. Review specification with stakeholders
2. Get approval for implementation approach
3. Begin Phase 1 implementation
4. Track progress against success metrics

**Questions or Clarifications:**

Please provide feedback on this specification before implementation begins.
