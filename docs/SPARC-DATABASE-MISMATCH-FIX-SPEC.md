# SPARC Specification: Database Mismatch Fix for Comment Ticket Creation

**Version:** 1.0.0
**Date:** 2025-10-27
**Status:** Specification Phase
**Priority:** P0 - Critical Bug

---

## Executive Summary

The agent-feed application has a critical database mismatch bug that prevents comments from creating work queue tickets, breaking the entire comment-to-agent-reply workflow. The server runs in SQLite mode but imports a PostgreSQL-specific repository that attempts to INSERT into a non-existent table, causing silent failures.

**Impact:**
- Users add comments expecting agent replies
- No work tickets are created in the database
- AVI orchestrator polls every 5 seconds but finds 0 tickets
- Agents never respond to user comments
- System appears functional but is completely non-operational for comment processing

---

## 1. Root Cause Analysis

### 1.1 Database Mode vs Repository Mismatch

**Current System State:**
```yaml
Database Mode: SQLite
  - Detected via: USE_POSTGRES environment variable (not set)
  - Server log: "📊 Database Mode: SQLite"
  - Database file: /workspaces/agent-feed/database.db
  - Active tables: work_queue_tickets (SQLite table)

Repository Import:
  - Location: api-server/server.js:26
  - Imported: repositories/postgres/work-queue.repository.js
  - Target table: work_queue (PostgreSQL table)
  - Result: Table does not exist in SQLite database
```

### 1.2 Code Flow Analysis

**Comment Creation Endpoint:**
```javascript
// File: api-server/server.js:1575-1671
POST /api/agent-posts/:postId/comments

Flow:
1. User posts comment via frontend
2. Server validates and creates comment in database ✅
3. Server attempts to create work ticket:
   - Line 1627: await workQueueRepository.createTicket({...})
   - workQueueRepository = PostgreSQL repository
   - Repository executes: INSERT INTO work_queue (...)
   - ERROR: table work_queue does not exist in SQLite
4. Error caught and logged but not propagated ✅
5. Comment created successfully, ticket creation fails silently ❌
6. Server responds: { success: true, ticket: null }
```

**Orchestrator Polling Loop:**
```javascript
// File: api-server/avi/orchestrator.js:131-146
Poll Interval: 5 seconds

Flow:
1. Orchestrator checks: this.workQueueRepo.getPendingTickets({limit: N})
2. PostgreSQL repository queries: SELECT * FROM work_queue WHERE status='pending'
3. ERROR: table work_queue does not exist
4. Returns empty array: []
5. Orchestrator logs: "No work to do"
6. Loop continues indefinitely with 0 tickets found
```

### 1.3 Schema Comparison

**PostgreSQL Schema (`work_queue` table - Does NOT exist):**
```sql
-- Expected by repositories/postgres/work-queue.repository.js
CREATE TABLE work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT 'anonymous',
  post_id TEXT,
  post_content TEXT,
  post_author VARCHAR(255),
  post_metadata JSONB,
  assigned_agent VARCHAR(255),
  priority INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  worker_id VARCHAR(255),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);
```

**SQLite Schema (`work_queue_tickets` table - EXISTS in database):**
```sql
-- Actual table in /workspaces/agent-feed/database.db
-- Migration: api-server/db/migrations/005-work-queue.sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON string
  result TEXT,    -- JSON string
  last_error TEXT,
  created_at INTEGER NOT NULL,  -- Unix timestamp
  assigned_at INTEGER,
  completed_at INTEGER,
  post_id TEXT
) STRICT;
```

**Key Differences:**
| Field | PostgreSQL (`work_queue`) | SQLite (`work_queue_tickets`) | Impact |
|-------|--------------------------|------------------------------|---------|
| Table Name | `work_queue` | `work_queue_tickets` | ❌ Query fails |
| Primary Key | `id SERIAL` | `id TEXT` | ⚠️ Type mismatch |
| Content Field | `post_content TEXT` | `content TEXT` | ❌ Field mismatch |
| Agent Field | `assigned_agent VARCHAR(255)` | `agent_id TEXT` | ❌ Field mismatch |
| Priority Type | `priority INTEGER` | `priority TEXT ('P0','P1','P2','P3')` | ⚠️ Type mismatch |
| Metadata Type | `post_metadata JSONB` | `metadata TEXT` | ⚠️ Serialization |
| Timestamp Type | `created_at TIMESTAMP` | `created_at INTEGER` | ⚠️ Format mismatch |
| Worker Field | `worker_id VARCHAR(255)` | ❌ Not present | ⚠️ Missing field |

---

## 2. Functional Requirements

### FR-001: Dynamic Repository Selection
**Priority:** P0 - Critical
**Description:** Server must dynamically select the correct work queue repository based on database mode.

**Acceptance Criteria:**
- AC-001.1: When USE_POSTGRES=true, use `repositories/postgres/work-queue.repository.js`
- AC-001.2: When USE_POSTGRES=false or unset, use `repositories/work-queue-repository.js`
- AC-001.3: Repository selection happens at server initialization
- AC-001.4: All endpoints use the selected repository consistently
- AC-001.5: No hardcoded imports of PostgreSQL-specific repositories

**Test Cases:**
```javascript
describe('FR-001: Dynamic Repository Selection', () => {
  it('should use SQLite repository when USE_POSTGRES is unset', async () => {
    delete process.env.USE_POSTGRES;
    const server = await initializeServer();
    expect(server.workQueueRepo.constructor.name).toBe('WorkQueueRepository');
  });

  it('should use PostgreSQL repository when USE_POSTGRES=true', async () => {
    process.env.USE_POSTGRES = 'true';
    const server = await initializeServer();
    expect(server.workQueueRepo).toBe(postgresWorkQueueRepository);
  });
});
```

### FR-002: Comment-to-Ticket Creation
**Priority:** P0 - Critical
**Description:** When a user creates a comment, the system must create a corresponding work queue ticket in the correct database table.

**Acceptance Criteria:**
- AC-002.1: POST /api/agent-posts/:postId/comments creates comment in database
- AC-002.2: If skipTicket is false, create work queue ticket
- AC-002.3: Ticket contains comment metadata (parent_post_id, content, author)
- AC-002.4: Ticket priority defaults to 5 (medium)
- AC-002.5: Ticket status is 'pending'
- AC-002.6: Ticket creation failure does not prevent comment creation
- AC-002.7: Response includes ticket ID and status
- AC-002.8: Backend logs ticket creation success/failure

**Test Cases:**
```javascript
describe('FR-002: Comment-to-Ticket Creation', () => {
  it('should create ticket when comment is posted', async () => {
    const response = await request(app)
      .post('/api/agent-posts/post-123/comments')
      .send({ content: 'Test comment', author_agent: 'user123' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.ticket).toBeDefined();
    expect(response.body.ticket.status).toBe('pending');

    // Verify ticket in database
    const tickets = await workQueueRepo.getPendingTickets({ limit: 10 });
    const createdTicket = tickets.find(t => t.post_id === response.body.data.id);
    expect(createdTicket).toBeDefined();
    expect(createdTicket.content).toBe('Test comment');
  });

  it('should skip ticket when skipTicket=true', async () => {
    const response = await request(app)
      .post('/api/agent-posts/post-123/comments')
      .send({ content: 'Agent reply', author_agent: 'agent', skipTicket: true });

    expect(response.body.ticket).toBeNull();
  });
});
```

### FR-003: Orchestrator Ticket Retrieval
**Priority:** P0 - Critical
**Description:** AVI orchestrator must successfully retrieve pending tickets from the correct database table.

**Acceptance Criteria:**
- AC-003.1: Orchestrator polls every 5 seconds for pending tickets
- AC-003.2: Query uses correct table name (work_queue_tickets for SQLite)
- AC-003.3: Query filters by status='pending'
- AC-003.4: Results ordered by priority (ASC) and created_at (ASC)
- AC-003.5: Limit parameter controls max tickets returned
- AC-003.6: Empty array returned when no tickets exist (not error)
- AC-003.7: Tickets deserialized correctly (JSON metadata)

**Test Cases:**
```javascript
describe('FR-003: Orchestrator Ticket Retrieval', () => {
  it('should retrieve pending tickets from SQLite', async () => {
    // Create test ticket
    await workQueueRepo.createTicket({
      user_id: 'user123',
      agent_id: 'test-agent',
      content: 'Test task',
      priority: 'P1',
      post_id: 'comment-456'
    });

    // Orchestrator polls
    const tickets = await orchestrator.workQueueRepo.getPendingTickets({ limit: 5 });

    expect(tickets.length).toBe(1);
    expect(tickets[0].status).toBe('pending');
    expect(tickets[0].content).toBe('Test task');
  });
});
```

### FR-004: Schema Field Mapping
**Priority:** P0 - Critical
**Description:** System must correctly map fields between comment data and work queue ticket schema.

**Acceptance Criteria:**
- AC-004.1: comment.content → ticket.content (SQLite) or ticket.post_content (PostgreSQL)
- AC-004.2: comment.author_agent → ticket.agent_id (SQLite) or ticket.assigned_agent (PostgreSQL)
- AC-004.3: comment.metadata → JSON.stringify(metadata) for SQLite
- AC-004.4: priority defaults to 'P2' (SQLite) or 5 (PostgreSQL)
- AC-004.5: created_at uses Date.now() (SQLite) or NOW() (PostgreSQL)
- AC-004.6: post_id correctly references comment ID (not parent post)

**Mapping Table:**
```yaml
Comment Field → SQLite Field → PostgreSQL Field:
  content       → content       → post_content
  author_agent  → agent_id      → assigned_agent
  id            → post_id       → post_id
  parent_post   → metadata.parent_post_id → post_metadata.parent_post_id
  priority      → 'P2'          → 5
  status        → 'pending'     → 'pending'
```

### FR-005: Error Handling and Logging
**Priority:** P1 - High
**Description:** System must gracefully handle database errors and provide diagnostic logging.

**Acceptance Criteria:**
- AC-005.1: Ticket creation errors caught and logged (not propagated)
- AC-005.2: Comment creation succeeds even if ticket fails
- AC-005.3: Error logs include context (comment ID, error message)
- AC-005.4: Success logs include ticket ID
- AC-005.5: Orchestrator logs polling results (ticket count)

---

## 3. Non-Functional Requirements

### NFR-001: Performance
**Priority:** P1 - High
**Description:** Ticket creation and retrieval must not significantly impact API response times.

**Metrics:**
- Comment creation endpoint: <500ms p95 latency
- Orchestrator polling: <100ms per query
- Ticket retrieval: <50ms for 10 tickets
- Database queries: Use indexes for status, priority, created_at

**Measurement:**
```javascript
console.time('ticket-creation');
await workQueueRepository.createTicket(data);
console.timeEnd('ticket-creation'); // Expected: <50ms
```

### NFR-002: Reliability
**Priority:** P0 - Critical
**Description:** No silent failures - all errors must be logged and observable.

**Requirements:**
- REL-002.1: Database connection errors logged with stack traces
- REL-002.2: Ticket creation failures logged with comment context
- REL-002.3: Orchestrator polling failures logged with retry info
- REL-002.4: WebSocket service notified of ticket creation events

### NFR-003: Backward Compatibility
**Priority:** P0 - Critical
**Description:** Fix must work with both PostgreSQL and SQLite databases without breaking existing functionality.

**Requirements:**
- BC-003.1: PostgreSQL deployments continue to work
- BC-003.2: Existing SQLite databases migrate seamlessly
- BC-003.3: No breaking changes to API contracts
- BC-003.4: database-selector.js continues to control mode selection

### NFR-004: Maintainability
**Priority:** P1 - High
**Description:** Code must be clear, documented, and avoid future repository mismatches.

**Requirements:**
- MAINT-004.1: Repository selection logic centralized
- MAINT-004.2: Clear comments explaining table name differences
- MAINT-004.3: Type definitions for ticket data structures
- MAINT-004.4: Migration path documented for future schema changes

---

## 4. Integration Points

### INT-001: Server.js Repository Import
**Location:** `/workspaces/agent-feed/api-server/server.js:26`
**Current Code:**
```javascript
import workQueueRepository from './repositories/postgres/work-queue.repository.js';
```

**Required Change:**
```javascript
// Conditional import based on database mode
import dbSelector from './config/database-selector.js';
import postgresWorkQueueRepository from './repositories/postgres/work-queue.repository.js';
import { WorkQueueRepository } from './repositories/work-queue-repository.js';

// Select repository after database initialization
let workQueueRepository;
if (dbSelector.usePostgres) {
  workQueueRepository = postgresWorkQueueRepository;
} else {
  const db = dbSelector.getRawConnections().db;
  workQueueRepository = new WorkQueueRepository(db);
}
```

### INT-002: Comment Creation Endpoint
**Location:** `/workspaces/agent-feed/api-server/server.js:1575-1671`
**Lines Using Repository:** 1627

**Current Usage:**
```javascript
ticket = await workQueueRepository.createTicket({
  user_id: userId,
  post_id: createdComment.id,
  post_content: createdComment.content,
  post_author: createdComment.author_agent,
  post_metadata: { /* ... */ },
  assigned_agent: null,
  priority: 5
});
```

**Required Change (Schema-Aware):**
```javascript
// Adapt ticket data for SQLite schema
const ticketData = dbSelector.usePostgres ? {
  user_id: userId,
  post_id: createdComment.id,
  post_content: createdComment.content,
  post_author: createdComment.author_agent,
  post_metadata: { type: 'comment', parent_post_id: postId, /* ... */ },
  assigned_agent: null,
  priority: 5
} : {
  user_id: userId,
  agent_id: null, // Let orchestrator assign
  content: createdComment.content,
  priority: 'P2',
  post_id: createdComment.id,
  metadata: { type: 'comment', parent_post_id: postId, /* ... */ }
};

ticket = await workQueueRepository.createTicket(ticketData);
```

### INT-003: Post Creation Endpoint
**Location:** `/workspaces/agent-feed/api-server/server.js:1129`
**Lines Using Repository:** 1129

**Similar Changes Required:** Yes - same schema adaptation as INT-002

### INT-004: Direct Message Endpoint
**Location:** `/workspaces/agent-feed/api-server/server.js:1764`
**Lines Using Repository:** 1764

**Similar Changes Required:** Yes - same schema adaptation as INT-002

### INT-005: AVI Orchestrator Initialization
**Location:** `/workspaces/agent-feed/api-server/avi/orchestrator.js:30, 46`

**Current Code:**
```javascript
constructor(config = {}, workQueueRepository = null, websocketService = null) {
  this.workQueueRepo = workQueueRepository || this._createStubRepository();
}
```

**Required Change:**
```javascript
// In server.js orchestrator initialization:
const orchestrator = new AviOrchestrator(
  { maxWorkers: 5, pollInterval: 5000 },
  workQueueRepository, // Pass selected repository
  websocketService
);
```

### INT-006: Orchestrator Polling Method
**Location:** `/workspaces/agent-feed/api-server/avi/orchestrator.js:140`

**Current Code:**
```javascript
const tickets = await this.workQueueRepo.getPendingTickets({ limit: availableSlots });
```

**Required Compatibility:**
```javascript
// PostgreSQL repository: getPendingTickets() - MISSING METHOD
// SQLite repository: getPendingTickets() - EXISTS (line 80)
// Solution: Add getPendingTickets() to PostgreSQL repository
//           OR ensure getAllPendingTickets() is called uniformly
```

**Issue:** PostgreSQL repository does NOT have `getPendingTickets()` method!
- PostgreSQL repo has: `getAllPendingTickets(options)` (line 258)
- SQLite repo has: `getPendingTickets(options)` (line 80)
- Orchestrator calls: `getPendingTickets(options)` (line 140)

**Required Fix:** Standardize method name across both repositories.

---

## 5. Database Schema Requirements

### SQLite Schema (`work_queue_tickets`)

**Current Schema:**
```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,
  result TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER,
  post_id TEXT
) STRICT;
```

**Required Changes:** NONE - schema is correct

**Indexes:**
```sql
CREATE INDEX idx_work_queue_status ON work_queue_tickets(status);
CREATE INDEX idx_work_queue_agent ON work_queue_tickets(agent_id);
CREATE INDEX idx_work_queue_priority ON work_queue_tickets(priority, created_at);
CREATE INDEX idx_work_queue_user ON work_queue_tickets(user_id);
CREATE INDEX idx_work_queue_post_id ON work_queue_tickets(post_id);
```

### PostgreSQL Schema (`work_queue`)

**Expected Schema (DOES NOT EXIST - Need to create):**
```sql
CREATE TABLE IF NOT EXISTS work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT 'anonymous',
  post_id TEXT,
  post_content TEXT NOT NULL,
  post_author VARCHAR(255),
  post_metadata JSONB DEFAULT '{}',
  assigned_agent VARCHAR(255),
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'processing', 'completed', 'failed')),
  worker_id VARCHAR(255),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_work_queue_status ON work_queue(status);
CREATE INDEX idx_work_queue_priority ON work_queue(priority DESC, created_at ASC);
CREATE INDEX idx_work_queue_user ON work_queue(user_id);
CREATE INDEX idx_work_queue_post_id ON work_queue(post_id);
CREATE INDEX idx_work_queue_agent ON work_queue(assigned_agent);
```

**Migration File Required:**
```bash
api-server/db/migrations/011-create-work-queue.sql
```

---

## 6. Success Criteria

### Verification Checklist

#### ✅ SC-001: Comment Creates Ticket
```bash
# Test Steps:
1. Start server in SQLite mode (USE_POSTGRES unset)
2. POST comment to /api/agent-posts/:postId/comments
3. Check response: ticket object is not null
4. Query database: SELECT * FROM work_queue_tickets WHERE status='pending'
5. Verify: 1 row returned with correct comment content

# Expected Result:
- HTTP 201 response
- Response includes: { success: true, ticket: { id: "...", status: "pending" } }
- Database query returns 1 ticket
- Ticket.content matches comment content
- Ticket.post_id matches comment ID
```

#### ✅ SC-002: Orchestrator Picks Up Ticket
```bash
# Test Steps:
1. Create comment ticket (as above)
2. Wait 5 seconds for orchestrator poll
3. Check orchestrator logs for: "📋 Found 1 pending tickets"
4. Wait 10 seconds for worker spawn
5. Check logs for: "🚀 Worker spawned for ticket"

# Expected Result:
- Orchestrator log shows 1 ticket found
- Worker spawned with correct agent assignment
- Ticket status changes from 'pending' to 'in_progress'
```

#### ✅ SC-003: Agent Processes Comment
```bash
# Test Steps:
1. Create comment: "Can you list the files in 'agent_workspace/'?"
2. Wait 30 seconds for agent processing
3. Check for agent reply comment in database
4. Verify reply content is relevant to the question

# Expected Result:
- Agent creates reply comment
- Reply is posted as child of original comment
- Reply contains file list or error message
- Ticket status changes to 'completed'
```

#### ✅ SC-004: PostgreSQL Mode Still Works
```bash
# Test Steps:
1. Set USE_POSTGRES=true
2. Start server with PostgreSQL database
3. POST comment to /api/agent-posts/:postId/comments
4. Query PostgreSQL: SELECT * FROM work_queue WHERE status='pending'
5. Verify: 1 row returned

# Expected Result:
- Server log: "📊 Database Mode: PostgreSQL"
- Comment created successfully
- Ticket created in work_queue table (not work_queue_tickets)
- Orchestrator retrieves ticket from PostgreSQL
```

#### ✅ SC-005: Error Handling Works
```bash
# Test Steps:
1. Inject database error (simulate table lock)
2. POST comment
3. Check response and logs

# Expected Result:
- Comment creation succeeds (HTTP 201)
- Response: { success: true, ticket: null }
- Backend log: "❌ Failed to create work ticket for comment: [error]"
- User can still create comments despite ticket failure
```

### Performance Benchmarks

```yaml
Metrics:
  comment_creation_p95: <500ms
  ticket_creation_p95: <50ms
  orchestrator_poll_time: <100ms
  ticket_retrieval_p95: <50ms (10 tickets)
  end_to_end_comment_to_reply: <30s (excluding agent processing time)

Load Test:
  scenario: 100 concurrent comments
  expected_success_rate: >99%
  expected_ticket_creation_rate: >95%
  max_database_connections: 10
```

---

## 7. Test Requirements

### 7.1 NO MOCKS - Real Database Testing

**CRITICAL:** All tests MUST use the actual SQLite database file, not mocks or stubs.

**Rationale:**
- This bug exists because of a real database schema mismatch
- Mocked tests would hide the exact problem we're fixing
- Tests must verify that INSERT statements work against the actual schema
- Tests must verify that query results match real database types

**Test Setup:**
```javascript
// ✅ CORRECT: Real database
const Database = require('better-sqlite3');
const db = new Database('/workspaces/agent-feed/database.db');
const workQueueRepo = new WorkQueueRepository(db);

// ❌ WRONG: Mocked database
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn()
  })
};
```

### 7.2 Integration Test Suite

**Test File:** `/workspaces/agent-feed/tests/integration/database-mismatch-fix.test.js`

**Test Cases:**
```javascript
describe('Database Mismatch Fix - SQLite Mode', () => {
  let db, workQueueRepo, server;

  beforeAll(async () => {
    // Use real database
    db = new Database('/workspaces/agent-feed/database.db');
    workQueueRepo = new WorkQueueRepository(db);
    server = await initializeServer();
  });

  beforeEach(() => {
    // Clean up test tickets
    db.prepare('DELETE FROM work_queue_tickets WHERE user_id LIKE ?').run('test-%');
  });

  test('TC-001: Comment creates ticket in work_queue_tickets table', async () => {
    const comment = {
      content: 'Test comment',
      author_agent: 'test-user',
      skipTicket: false
    };

    const response = await request(server)
      .post('/api/agent-posts/test-post-123/comments')
      .send(comment);

    expect(response.status).toBe(201);
    expect(response.body.ticket).toBeDefined();
    expect(response.body.ticket.status).toBe('pending');

    // Verify in real database
    const tickets = db.prepare('SELECT * FROM work_queue_tickets WHERE status = ?').all('pending');
    expect(tickets.length).toBeGreaterThan(0);

    const createdTicket = tickets.find(t => t.post_id === response.body.data.id);
    expect(createdTicket).toBeDefined();
    expect(createdTicket.content).toBe('Test comment');
  });

  test('TC-002: Orchestrator retrieves pending tickets', async () => {
    // Create test ticket directly in database
    const ticketId = uuidv4();
    db.prepare(`
      INSERT INTO work_queue_tickets (id, user_id, agent_id, content, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ticketId, 'test-user', 'test-agent', 'Test content', 'P1', 'pending', Date.now());

    // Orchestrator polls
    const tickets = await workQueueRepo.getPendingTickets({ limit: 10 });

    expect(tickets.length).toBeGreaterThan(0);
    const foundTicket = tickets.find(t => t.id === ticketId);
    expect(foundTicket).toBeDefined();
    expect(foundTicket.status).toBe('pending');
  });

  test('TC-003: Field mapping is correct', async () => {
    const commentData = {
      content: 'Field mapping test',
      author_agent: 'mapper-user'
    };

    const response = await request(server)
      .post('/api/agent-posts/test-post-123/comments')
      .send(commentData);

    const ticket = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?')
      .get(response.body.data.id);

    expect(ticket.content).toBe(commentData.content); // Not post_content
    expect(ticket.agent_id).toBeNull(); // Not assigned_agent yet
    expect(ticket.priority).toMatch(/^P[0-3]$/); // Not integer
    expect(typeof ticket.created_at).toBe('number'); // Unix timestamp, not ISO
  });

  test('TC-004: Metadata serialization works', async () => {
    const response = await request(server)
      .post('/api/agent-posts/parent-post-789/comments')
      .send({ content: 'Metadata test', author_agent: 'test-user' });

    const ticket = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?')
      .get(response.body.data.id);

    expect(ticket.metadata).toBeDefined();
    const metadata = JSON.parse(ticket.metadata);
    expect(metadata.type).toBe('comment');
    expect(metadata.parent_post_id).toBe('parent-post-789');
  });

  test('TC-005: Error handling prevents comment failure', async () => {
    // Simulate database error by using invalid table
    const originalPrepare = db.prepare;
    db.prepare = (sql) => {
      if (sql.includes('work_queue_tickets')) {
        throw new Error('Simulated database error');
      }
      return originalPrepare.call(db, sql);
    };

    const response = await request(server)
      .post('/api/agent-posts/test-post-123/comments')
      .send({ content: 'Error test', author_agent: 'test-user' });

    expect(response.status).toBe(201); // Comment still succeeds
    expect(response.body.success).toBe(true);
    expect(response.body.ticket).toBeNull(); // Ticket creation failed

    db.prepare = originalPrepare; // Restore
  });
});
```

### 7.3 PostgreSQL Compatibility Tests

**Test File:** `/workspaces/agent-feed/tests/integration/database-mismatch-fix-postgres.test.js`

**Test Cases:**
```javascript
describe('Database Mismatch Fix - PostgreSQL Mode', () => {
  beforeAll(async () => {
    process.env.USE_POSTGRES = 'true';
    // Assumes PostgreSQL is running and configured
  });

  test('TC-006: PostgreSQL repository is selected', async () => {
    const server = await initializeServer();
    expect(server.workQueueRepo.constructor.name).not.toBe('WorkQueueRepository');
  });

  test('TC-007: Comment creates ticket in work_queue table', async () => {
    // Similar to TC-001 but queries PostgreSQL work_queue table
  });
});
```

---

## 8. Edge Cases and Scenarios

### EC-001: Rapid Comment Creation
**Scenario:** User posts 10 comments in 10 seconds
**Expected Behavior:**
- All 10 comments created successfully
- All 10 tickets created in database
- Orchestrator retrieves tickets in priority order
- No race conditions or duplicate tickets

### EC-002: Database Mode Switch
**Scenario:** Server switches from SQLite to PostgreSQL during runtime (config reload)
**Expected Behavior:**
- **NOT SUPPORTED** - requires server restart
- Document: "Database mode changes require server restart"
- Fail gracefully: Log warning if mode switch detected

### EC-003: Missing parent_post
**Scenario:** Comment references non-existent post_id
**Expected Behavior:**
- Comment creation fails with 400 Bad Request
- No ticket created
- Error message: "Parent post not found"

### EC-004: Agent Assignment Conflict
**Scenario:** Multiple orchestrators try to assign same ticket
**Expected Behavior:**
- SQLite: Use transaction and WHERE status='pending' check
- PostgreSQL: Use RETURNING clause to verify assignment
- Only one orchestrator succeeds
- Other orchestrators skip ticket

### EC-005: Orchestrator Restart
**Scenario:** Orchestrator crashes and restarts
**Expected Behavior:**
- In-progress tickets reset to pending after timeout (30 min)
- Completed tickets remain completed
- No duplicate processing

### EC-006: Invalid Priority Value
**Scenario:** Code passes priority=10 (invalid for SQLite CHECK constraint)
**Expected Behavior:**
- SQLite: INSERT fails with CHECK constraint error
- Catch error and retry with default priority='P2'
- Log warning: "Invalid priority, using default"

### EC-007: Large Metadata Object
**Scenario:** Comment metadata exceeds reasonable size (>10KB)
**Expected Behavior:**
- SQLite: TEXT column accepts large strings
- PostgreSQL: JSONB handles large objects
- Log warning if metadata >10KB
- Consider truncating or storing reference

---

## 9. Implementation Strategy

### Phase 1: Repository Selection (P0)
**Estimated Effort:** 2 hours
**Tasks:**
1. Refactor server.js to conditionally import repositories
2. Pass database instance to SQLite repository constructor
3. Update orchestrator initialization with correct repository
4. Add repository selection unit tests

**Definition of Done:**
- Server.js no longer hardcodes PostgreSQL repository import
- Both SQLite and PostgreSQL modes compile and initialize
- Repository selection logged during server startup

### Phase 2: Schema Field Mapping (P0)
**Estimated Effort:** 3 hours
**Tasks:**
1. Create field mapping utility function
2. Update comment creation endpoint (3 locations)
3. Update post creation endpoint
4. Update DM endpoint
5. Add mapping tests

**Definition of Done:**
- All endpoints use correct field names for each database mode
- No hardcoded PostgreSQL field names in SQLite mode
- Metadata correctly serialized as JSON strings for SQLite

### Phase 3: Method Standardization (P0)
**Estimated Effort:** 2 hours
**Tasks:**
1. Add getPendingTickets() to PostgreSQL repository
2. OR: Rename SQLite method to getAllPendingTickets()
3. Update orchestrator to use standardized method name
4. Add method compatibility tests

**Definition of Done:**
- Both repositories expose identical method interface
- Orchestrator works with both SQLite and PostgreSQL
- No method-not-found errors in logs

### Phase 4: PostgreSQL Schema Creation (P1)
**Estimated Effort:** 1 hour
**Tasks:**
1. Create migration 011-create-work-queue.sql
2. Add rollback migration
3. Update PostgreSQL initialization script
4. Test migration on clean database

**Definition of Done:**
- PostgreSQL database has work_queue table
- Migration idempotent (can run multiple times)
- Rollback tested and documented

### Phase 5: Integration Testing (P0)
**Estimated Effort:** 4 hours
**Tasks:**
1. Create integration test suite (NO MOCKS)
2. Test all 7 test cases (TC-001 to TC-007)
3. Test all 7 edge cases (EC-001 to EC-007)
4. Document test setup and execution

**Definition of Done:**
- All tests pass against real SQLite database
- Test coverage >80% for modified code
- Tests run in CI/CD pipeline

### Phase 6: End-to-End Validation (P0)
**Estimated Effort:** 2 hours
**Tasks:**
1. Manual testing: Post comment, wait for agent reply
2. Verify orchestrator logs show ticket processing
3. Verify agent reply appears in frontend
4. Document complete workflow

**Definition of Done:**
- User posts comment "Can you list files in 'agent_workspace/'?"
- Agent replies within 30 seconds with file list
- No errors in server logs
- All 5 success criteria met

---

## 10. Rollback Plan

### Rollback Triggers
- More than 5% of comments fail to create tickets
- Orchestrator fails to retrieve tickets in both modes
- PostgreSQL mode breaks existing deployments
- Test coverage drops below 80%

### Rollback Steps
1. Revert server.js to commit SHA before changes
2. Restore hardcoded PostgreSQL import (with feature flag)
3. Document known issue: "Comment tickets disabled in SQLite mode"
4. Plan alternative fix approach

### Rollback Validation
- Server starts successfully
- Comments can be created (without tickets)
- PostgreSQL mode works as before
- No new errors introduced

---

## 11. Monitoring and Observability

### Key Metrics to Track
```yaml
Metrics:
  ticket_creation_success_rate:
    description: "% of comments that successfully create tickets"
    target: ">95%"
    alert: "<90%"

  orchestrator_poll_success_rate:
    description: "% of orchestrator polls that return results without error"
    target: "100%"
    alert: "<99%"

  ticket_processing_time:
    description: "Time from ticket creation to completion"
    target: "<30s p95"
    alert: ">60s p95"

  database_query_errors:
    description: "Count of SQL errors related to work_queue tables"
    target: "0"
    alert: ">5 in 5 minutes"
```

### Logging Requirements
```javascript
// Ticket Creation
console.log(`✅ Work ticket created: ticket-${ticket.id} for comment-${comment.id}`);
console.error(`❌ Ticket creation failed for comment-${comment.id}:`, error.message);

// Orchestrator Polling
console.log(`📋 Orchestrator poll: ${tickets.length} pending tickets found`);
console.error(`❌ Orchestrator poll failed:`, error.message);

// Repository Selection
console.log(`🔧 Work queue repository: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
```

---

## 12. Documentation Updates

### Files to Update
1. `/workspaces/agent-feed/README.md` - Add section on work queue architecture
2. `/workspaces/agent-feed/api-server/repositories/README.md` - Document repository selection
3. `/workspaces/agent-feed/docs/DATABASE-ARCHITECTURE.md` - Schema comparison table
4. `/workspaces/agent-feed/docs/TROUBLESHOOTING.md` - Add "Comment tickets not processing" section

### Architecture Diagram Required
```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │ POST /api/agent-posts/:id/comments
       ▼
┌─────────────────────────────────────────┐
│          Server.js                      │
│  ┌────────────────────────────────┐    │
│  │  Database Selector             │    │
│  │  USE_POSTGRES=false            │    │
│  └────────────┬───────────────────┘    │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  Work Queue Repository         │    │
│  │  (SQLite or PostgreSQL)        │    │
│  └────────────┬───────────────────┘    │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  INSERT INTO work_queue_tickets│    │
│  │  (SQLite: work_queue_tickets)  │    │
│  │  (PostgreSQL: work_queue)      │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│     AVI Orchestrator                    │
│  (Polls every 5 seconds)                │
│  ┌────────────────────────────────┐    │
│  │  getPendingTickets()           │    │
│  └────────────┬───────────────────┘    │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  SELECT * FROM work_queue_     │    │
│  │  tickets WHERE status='pending'│    │
│  └────────────┬───────────────────┘    │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  Spawn Agent Worker            │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 13. Security Considerations

### SEC-001: SQL Injection Prevention
**Risk:** User-provided content inserted into database
**Mitigation:**
- Use parameterized queries (prepared statements)
- Never concatenate user input into SQL strings
- SQLite: db.prepare().run(values)
- PostgreSQL: query(sql, values)

### SEC-002: Metadata Sanitization
**Risk:** Malicious JSON in metadata field
**Mitigation:**
- Validate metadata structure before JSON.stringify()
- Limit metadata size to 10KB
- Strip potentially dangerous fields (e.g., __proto__)

### SEC-003: Agent Assignment Validation
**Risk:** User specifies assigned_agent to bypass orchestrator
**Mitigation:**
- Always set assigned_agent=null on creation
- Only orchestrator can assign agents
- Validate agent names against allowed list

---

## 14. Future Considerations

### Potential Enhancements
1. **Unified Schema**: Migrate SQLite to match PostgreSQL schema (breaking change)
2. **Repository Abstraction Layer**: Create interface that both repos implement
3. **Schema Validation**: Add runtime checks to detect mismatches early
4. **Migration Tool**: Automatically migrate SQLite → PostgreSQL for production

### Technical Debt
1. Two different table names (`work_queue` vs `work_queue_tickets`) increases complexity
2. Different field names require mapping logic scattered across codebase
3. Type mismatches (priority as integer vs string) require conversion

### Recommended Next Steps (Post-Fix)
1. Standardize on single schema design (PostgreSQL-style)
2. Create migration to rename work_queue_tickets → work_queue in SQLite
3. Unify field names (agent_id vs assigned_agent)
4. Add TypeScript interfaces for ticket data structures

---

## Appendix A: Reference Files

```yaml
Key Files:
  Server:
    - api-server/server.js (lines 26, 1575-1671, 1129, 1764)
    - api-server/config/database-selector.js

  Repositories:
    - api-server/repositories/postgres/work-queue.repository.js
    - api-server/repositories/work-queue-repository.js

  Orchestrator:
    - api-server/avi/orchestrator.js (lines 30-150)

  Database:
    - /workspaces/agent-feed/database.db (SQLite)
    - api-server/db/migrations/005-work-queue.sql
    - api-server/db/migrations/006-add-post-id-to-tickets.sql

  Tests (To Be Created):
    - tests/integration/database-mismatch-fix.test.js
    - tests/integration/database-mismatch-fix-postgres.test.js
```

## Appendix B: Error Messages

```yaml
Current Error (Silent Failure):
  - PostgreSQL repository attempts: INSERT INTO work_queue
  - SQLite database responds: Error: no such table: work_queue
  - Server catches error and logs: "❌ Failed to create work ticket for comment"
  - User receives: { success: true, ticket: null }
  - Impact: Comment created but no agent will reply

Expected Behavior After Fix:
  - SQLite repository attempts: INSERT INTO work_queue_tickets
  - SQLite database responds: Success
  - Server logs: "✅ Work ticket created for comment: ticket-abc123"
  - User receives: { success: true, ticket: { id: "abc123", status: "pending" } }
  - Orchestrator polls and finds ticket
  - Agent processes ticket and replies to comment
```

---

**Document Status:** Ready for Review
**Next Phase:** Architecture Design (SPARC Phase 3)
**Approval Required:** Technical Lead, Database Administrator
**Estimated Implementation Time:** 14 hours (2 days)
