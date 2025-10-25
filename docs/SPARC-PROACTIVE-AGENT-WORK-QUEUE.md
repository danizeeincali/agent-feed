# SPARC: Proactive Agent Work Queue System

**Version**: 1.0
**Date**: 2025-10-23
**Methodology**: SPARC + NLD + TDD + Claude-Flow Swarm + Playwright E2E
**Validation**: 100% Real (No Mocks)

---

## S - SPECIFICATION

### Problem Statement

Link-logger-agent and other proactive agents are configured but never triggered because:
1. No work queue database table exists
2. No post creation hooks to detect URLs
3. Stub repositories return empty arrays
4. No ticket creation logic

### Requirements

#### Functional Requirements

**FR-1: Work Queue Database**
- Table: `work_queue_tickets`
- Fields: id, user_id, agent_id, content, url, priority, status, created_at, assigned_at, completed_at
- Indexes: status, agent_id, created_at
- Constraints: Valid status values, non-null required fields

**FR-2: URL Detection in Posts**
- Detect URLs in post content when created
- Extract URL, title, context
- Determine which proactive agent should handle

**FR-3: Ticket Creation**
- Create work queue ticket for proactive agents
- Priority based on agent configuration
- Include post context and URL

**FR-4: Orchestrator Integration**
- Poll work queue every 5 seconds
- Fetch pending tickets
- Spawn agent workers for tickets
- Update ticket status (in_progress, completed, failed)

**FR-5: Agent Worker Execution**
- Receive ticket with full context
- Process URL using agent's tools
- Post results to agent feed
- Mark ticket as completed

#### Non-Functional Requirements

**NFR-1: Performance**
- Ticket creation: <100ms
- URL detection: <50ms
- Orchestrator poll: <200ms
- Agent spawn: <2 seconds

**NFR-2: Reliability**
- Zero ticket loss
- Retry failed tickets (max 3 attempts)
- Graceful error handling
- Database transaction safety

**NFR-3: Scalability**
- Handle 100+ tickets/hour
- Support 10 proactive agents
- Concurrent agent execution (max 5 workers)

### Success Criteria

✅ User posts link → Ticket created within 100ms
✅ Orchestrator detects ticket within 5 seconds
✅ Link-logger-agent spawned and processes URL
✅ Intelligence summary posted to agent feed
✅ Ticket marked completed
✅ All existing features continue working
✅ Zero errors in production logs

---

## P - PSEUDOCODE

### Algorithm: Post Creation Hook

```
FUNCTION onPostCreate(post):
  # 1. Extract URLs from content
  urls = extractURLs(post.content)

  IF urls.length == 0:
    RETURN  # No URLs, no action needed

  # 2. Determine which agents should handle
  FOR EACH url IN urls:
    # Check proactive agents
    proactiveAgents = getProactiveAgents()

    FOR EACH agent IN proactiveAgents:
      IF agent.shouldHandle(url, post.content):
        # 3. Create work queue ticket
        ticket = {
          id: generateUUID(),
          user_id: post.author_id,
          agent_id: agent.id,
          content: post.content,
          url: url,
          priority: agent.priority,  # P0, P1, P2
          status: 'pending',
          metadata: {
            post_id: post.id,
            detected_at: NOW(),
            context: extractContext(post.content, url)
          },
          created_at: NOW()
        }

        # 4. Insert into database
        DB.insert('work_queue_tickets', ticket)

        LOG("✅ Ticket created for ${agent.id}: ${url}")
```

### Algorithm: Orchestrator Poll Loop

```
FUNCTION pollWorkQueue():
  WHILE orchestrator.running:
    # 1. Check active worker capacity
    IF activeWorkers.size >= maxWorkers:
      SLEEP(pollInterval)
      CONTINUE

    # 2. Fetch pending tickets
    tickets = DB.query("""
      SELECT * FROM work_queue_tickets
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT ${maxWorkers - activeWorkers.size}
    """)

    # 3. Spawn workers for tickets
    FOR EACH ticket IN tickets:
      # Mark as in_progress
      DB.update('work_queue_tickets', ticket.id, {
        status: 'in_progress',
        assigned_at: NOW()
      })

      # Spawn agent worker
      worker = spawnAgentWorker({
        agentId: ticket.agent_id,
        ticketId: ticket.id,
        context: {
          url: ticket.url,
          postContent: ticket.content,
          userId: ticket.user_id
        }
      })

      activeWorkers.set(ticket.id, worker)

      LOG("🚀 Spawned ${ticket.agent_id} for ticket ${ticket.id}")

    # 4. Wait before next poll
    SLEEP(pollInterval)
```

### Algorithm: Agent Worker Execution

```
FUNCTION executeAgentWorker(ticket):
  TRY:
    # 1. Load agent configuration
    agent = loadAgent(ticket.agent_id)

    # 2. Prepare context with URL
    context = {
      url: ticket.url,
      postContent: ticket.content,
      instruction: `Process this URL: ${ticket.url}\n\nContext: ${ticket.metadata.context}`
    }

    # 3. Execute agent with tools
    result = await agent.execute(context)

    # 4. Post result to agent feed
    IF result.shouldPost:
      await postToAgentFeed({
        agent: ticket.agent_id,
        content: result.summary,
        metadata: result.metadata
      })

    # 5. Mark ticket completed
    DB.update('work_queue_tickets', ticket.id, {
      status: 'completed',
      completed_at: NOW(),
      result: result
    })

    LOG("✅ Ticket ${ticket.id} completed by ${ticket.agent_id}")

  CATCH error:
    # Increment retry count
    retryCount = ticket.retry_count || 0

    IF retryCount < 3:
      # Retry
      DB.update('work_queue_tickets', ticket.id, {
        status: 'pending',
        retry_count: retryCount + 1,
        last_error: error.message
      })
    ELSE:
      # Max retries exceeded
      DB.update('work_queue_tickets', ticket.id, {
        status: 'failed',
        completed_at: NOW(),
        error: error.message
      })

    LOG("❌ Ticket ${ticket.id} error: ${error.message}")

  FINALLY:
    # Remove from active workers
    activeWorkers.delete(ticket.id)
```

---

## A - ARCHITECTURE

### Database Schema

```sql
-- Work Queue Tickets Table
CREATE TABLE IF NOT EXISTS work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON
  result TEXT,    -- JSON
  last_error TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
) STRICT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_agent ON work_queue_tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue_tickets(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_work_queue_user ON work_queue_tickets(user_id);
```

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Proactive Agent Flow                          │
└─────────────────────────────────────────────────────────────────┘

1. USER CREATES POST
   ┌──────────────┐
   │ POST /posts  │
   │ content:     │
   │ "Save this:  │
   │  https://... │
   └──────┬───────┘
          │
          ▼
2. POST CREATION HOOK
   ┌────────────────────────────────────┐
   │ URL Detection Service              │
   │  • extractURLs(content)            │
   │  • detectContext(url, content)     │
   │  • matchProactiveAgents()          │
   └────────────┬───────────────────────┘
                │
                ▼
3. TICKET CREATION
   ┌────────────────────────────────────┐
   │ Work Queue Repository              │
   │  • createTicket({                  │
   │      agent_id: "link-logger",      │
   │      url: "https://...",           │
   │      priority: "P2"                │
   │    })                              │
   │  • INSERT INTO work_queue_tickets  │
   └────────────┬───────────────────────┘
                │
                ▼
4. ORCHESTRATOR POLL (Every 5s)
   ┌────────────────────────────────────┐
   │ AVI Orchestrator                   │
   │  • SELECT * FROM work_queue_tickets│
   │    WHERE status = 'pending'        │
   │  • LIMIT by available workers      │
   └────────────┬───────────────────────┘
                │
                ▼
5. WORKER SPAWN
   ┌────────────────────────────────────┐
   │ Agent Worker                       │
   │  • Load link-logger-agent config   │
   │  • Prepare context with URL        │
   │  • UPDATE status = 'in_progress'   │
   └────────────┬───────────────────────┘
                │
                ▼
6. AGENT EXECUTION
   ┌────────────────────────────────────┐
   │ Link Logger Agent                  │
   │  • Fetch URL content (Firecrawl)   │
   │  • Progressive summarization       │
   │  • Extract intelligence            │
   │  • Generate strategic brief        │
   └────────────┬───────────────────────┘
                │
                ▼
7. POST TO FEED
   ┌────────────────────────────────────┐
   │ Agent Feed API                     │
   │  • POST /api/posts                 │
   │  • title: "🔗 Strategic Intel..."  │
   │  • agent: "link-logger-agent"      │
   └────────────┬───────────────────────┘
                │
                ▼
8. TICKET COMPLETION
   ┌────────────────────────────────────┐
   │ Work Queue Repository              │
   │  • UPDATE status = 'completed'     │
   │  • completed_at = NOW()            │
   │  • result = summary                │
   └────────────────────────────────────┘
```

### Component Interactions

```
┌──────────────────────────────────────────────────────────────┐
│                      Component Diagram                        │
└──────────────────────────────────────────────────────────────┘

Frontend (React)
┌────────────────────┐
│ Create Post Form   │
│  - Enter content   │
│  - Submit          │
└─────────┬──────────┘
          │ HTTP POST
          ▼
Backend (Express)
┌─────────────────────────────────────────────────────────────┐
│ POST /api/posts                                             │
│  ├─ Create post in database                                │
│  ├─ ✨ NEW: Post Creation Hook                             │
│  │    └─ URL Detection Service                             │
│  │         ├─ Extract URLs                                 │
│  │         ├─ Match proactive agents                       │
│  │         └─ Create work queue tickets                    │
│  └─ Return post to client                                  │
└────┬──────────────────────────────────────────────────────┬─┘
     │                                                       │
     ▼                                                       ▼
┌──────────────────┐                              ┌──────────────────┐
│ SQLite Main DB   │                              │ Work Queue DB    │
│  • posts         │                              │  • tickets       │
│  • users         │                              │  • status        │
│  • agents        │                              │  • priority      │
└──────────────────┘                              └─────────┬────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │ AVI Orchestrator │
                                                  │  • Poll queue    │
                                                  │  • Spawn workers │
                                                  │  • Monitor       │
                                                  └─────────┬────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │ Agent Workers    │
                                                  │  • link-logger   │
                                                  │  • follow-ups    │
                                                  │  • todos         │
                                                  └─────────┬────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │ Agent Feed API   │
                                                  │  • Post results  │
                                                  │  • User visible  │
                                                  └──────────────────┘
```

---

## R - REFINEMENT

### TDD Test Plan

#### Unit Tests: Work Queue Repository

**File**: `tests/unit/work-queue-repository.test.js`

```javascript
describe('Work Queue Repository', () => {

  test('UT-001: Create ticket with all required fields', async () => {
    const ticket = await workQueue.createTicket({
      user_id: 'user-123',
      agent_id: 'link-logger-agent',
      content: 'Check this: https://example.com',
      url: 'https://example.com',
      priority: 'P2'
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe('pending');
    expect(ticket.retry_count).toBe(0);
  });

  test('UT-002: Get pending tickets ordered by priority', async () => {
    // Create tickets with different priorities
    await workQueue.createTicket({ priority: 'P2', agent_id: 'agent-1' });
    await workQueue.createTicket({ priority: 'P0', agent_id: 'agent-2' });
    await workQueue.createTicket({ priority: 'P1', agent_id: 'agent-3' });

    const pending = await workQueue.getPendingTickets({ limit: 5 });

    expect(pending[0].priority).toBe('P0');  // Highest priority first
    expect(pending[1].priority).toBe('P1');
    expect(pending[2].priority).toBe('P2');
  });

  test('UT-003: Update ticket status to in_progress', async () => {
    const ticket = await workQueue.createTicket({ /* ... */ });

    await workQueue.updateTicketStatus(ticket.id, 'in_progress');

    const updated = await workQueue.getTicket(ticket.id);
    expect(updated.status).toBe('in_progress');
    expect(updated.assigned_at).toBeDefined();
  });

  test('UT-004: Complete ticket with result', async () => {
    const ticket = await workQueue.createTicket({ /* ... */ });

    await workQueue.completeTicket(ticket.id, {
      summary: 'Intelligence captured',
      posted: true
    });

    const completed = await workQueue.getTicket(ticket.id);
    expect(completed.status).toBe('completed');
    expect(completed.completed_at).toBeDefined();
    expect(JSON.parse(completed.result).summary).toBe('Intelligence captured');
  });

  test('UT-005: Fail ticket with error and retry', async () => {
    const ticket = await workQueue.createTicket({ /* ... */ });

    await workQueue.failTicket(ticket.id, 'Network error');

    const failed = await workQueue.getTicket(ticket.id);
    expect(failed.status).toBe('pending');  // Retry
    expect(failed.retry_count).toBe(1);
    expect(failed.last_error).toBe('Network error');
  });

  test('UT-006: Max retries exceeded marks as failed', async () => {
    const ticket = await workQueue.createTicket({ /* ... */ });

    // Fail 3 times
    await workQueue.failTicket(ticket.id, 'Error 1');
    await workQueue.failTicket(ticket.id, 'Error 2');
    await workQueue.failTicket(ticket.id, 'Error 3');

    const failed = await workQueue.getTicket(ticket.id);
    expect(failed.status).toBe('failed');
    expect(failed.retry_count).toBe(3);
  });
});
```

#### Unit Tests: URL Detection Service

**File**: `tests/unit/url-detection-service.test.js`

```javascript
describe('URL Detection Service', () => {

  test('UT-URL-001: Extract single URL from content', () => {
    const content = 'Check this: https://example.com for info';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com');
  });

  test('UT-URL-002: Extract multiple URLs from content', () => {
    const content = 'See https://a.com and https://b.com also http://c.com';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(3);
    expect(urls).toContain('https://a.com');
    expect(urls).toContain('https://b.com');
    expect(urls).toContain('http://c.com');
  });

  test('UT-URL-003: Match link-logger-agent for any URL', () => {
    const url = 'https://linkedin.com/article';
    const content = 'Save this link for me';

    const matches = matchProactiveAgents(url, content);

    expect(matches).toContain('link-logger-agent');
  });

  test('UT-URL-004: Extract context around URL', () => {
    const content = 'Can you save this link for me? https://example.com I think it will be useful';
    const url = 'https://example.com';

    const context = extractContext(content, url);

    expect(context).toContain('save this link');
    expect(context).toContain('useful');
  });
});
```

#### Integration Tests: Post → Ticket → Agent Flow

**File**: `tests/integration/proactive-agent-flow.test.js`

```javascript
describe('Proactive Agent Flow Integration', () => {

  test('INT-001: Post with URL creates work queue ticket', async () => {
    // Create post with URL
    const response = await request(app)
      .post('/api/posts')
      .send({
        content: 'Can you save this: https://example.com/article',
        author_id: 'user-123'
      });

    expect(response.status).toBe(201);

    // Verify ticket created
    const tickets = await workQueue.getTicketsByAgent('link-logger-agent');
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].url).toBe('https://example.com/article');
    expect(tickets[0].status).toBe('pending');
  });

  test('INT-002: Orchestrator picks up pending ticket', async () => {
    // Create ticket
    await workQueue.createTicket({
      agent_id: 'link-logger-agent',
      url: 'https://example.com',
      content: 'Test',
      priority: 'P2'
    });

    // Wait for orchestrator poll (max 6 seconds)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Verify ticket status changed
    const tickets = await workQueue.getTicketsByAgent('link-logger-agent');
    const ticket = tickets[0];

    expect(['in_progress', 'completed']).toContain(ticket.status);
  });

  test('INT-003: Agent worker completes ticket and posts', async () => {
    // This test requires real agent execution
    // Use mock Firecrawl for deterministic test

    const ticket = await workQueue.createTicket({
      agent_id: 'link-logger-agent',
      url: 'https://example.com/test-article',
      content: 'Process this link',
      priority: 'P2'
    });

    // Wait for processing (max 30 seconds)
    await waitForTicketCompletion(ticket.id, 30000);

    // Verify completed
    const completed = await workQueue.getTicket(ticket.id);
    expect(completed.status).toBe('completed');

    // Verify post created
    const posts = await getPosts({ agent: 'link-logger-agent' });
    expect(posts.length).toBeGreaterThan(0);
  });
});
```

#### E2E Tests: Link Logger with Playwright

**File**: `tests/e2e/link-logger-proactive.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Link Logger Proactive Agent E2E', () => {

  test('E2E-LINK-001: User posts link, agent processes automatically', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Create post with LinkedIn URL
    await page.click('button:has-text("Post")');
    await page.fill('textarea', 'Can you save this link for me? https://www.linkedin.com/pulse/introducing-agentdb-ultra-fast-vector-memory-agents-reuven-cohen-t8vpc/');
    await page.click('button:has-text("Submit")');

    // Wait for post to appear
    await page.waitForSelector('text=/agentdb/i', { timeout: 5000 });

    // Screenshot: Post created
    await page.screenshot({ path: 'tests/screenshots/link-post-created.png' });

    // Wait for link-logger-agent to process (max 30 seconds)
    await page.waitForSelector('text=/link.*logger/i', { timeout: 30000 });

    // Verify agent post appears
    const agentPost = await page.locator('text=/Strategic Intel|Intelligence Captured/i');
    await expect(agentPost).toBeVisible();

    // Screenshot: Agent response
    await page.screenshot({ path: 'tests/screenshots/link-logger-response.png' });

    // Verify intelligence summary content
    const summary = await page.textContent('article:has-text("link-logger")');
    expect(summary).toContain('AgentDB');
    expect(summary).toContain('vector memory');
  });

  test('E2E-LINK-002: Multiple URLs trigger multiple tickets', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Post with 2 URLs
    await page.click('button:has-text("Post")');
    await page.fill('textarea', 'Check these: https://example.com/one and https://example.com/two');
    await page.click('button:has-text("Submit")');

    // Wait for both to process
    await page.waitForTimeout(10000);

    // Check work queue has 2 tickets
    const response = await page.goto('http://localhost:3001/api/work-queue/tickets?agent=link-logger-agent');
    const tickets = await response.json();

    expect(tickets.length).toBeGreaterThanOrEqual(2);
  });
});
```

---

## C - COMPLETION

### Implementation Checklist

#### Database Setup
- [ ] Create `work_queue_tickets` table with schema
- [ ] Create indexes for performance
- [ ] Add foreign key constraints
- [ ] Test database operations

#### URL Detection Service
- [ ] Implement `extractURLs(content)` function
- [ ] Implement `matchProactiveAgents(url, content)` function
- [ ] Implement `extractContext(content, url)` function
- [ ] Unit tests for URL detection

#### Work Queue Repository
- [ ] `createTicket(data)` method
- [ ] `getPendingTickets({ limit, agent_id })` method
- [ ] `updateTicketStatus(id, status)` method
- [ ] `completeTicket(id, result)` method
- [ ] `failTicket(id, error)` method
- [ ] `getTicket(id)` method
- [ ] `getTicketsByAgent(agent_id)` method
- [ ] Unit tests for all methods

#### Post Creation Hook
- [ ] Add hook to POST /api/posts endpoint
- [ ] Call URL detection service
- [ ] Create tickets for matched agents
- [ ] Integration test for hook

#### Orchestrator Integration
- [ ] Replace stub `workQueueRepo` with real repository
- [ ] Update `getPendingTickets()` to query database
- [ ] Update ticket status on spawn
- [ ] Handle worker completion
- [ ] Handle worker failure
- [ ] Integration tests for orchestrator

#### Agent Worker Updates
- [ ] Pass ticket context to agent
- [ ] Post result to agent feed
- [ ] Update ticket on completion
- [ ] Handle errors with retry logic

#### Testing & Validation
- [ ] Run all unit tests (23 tests)
- [ ] Run integration tests (3 tests)
- [ ] Run E2E tests with Playwright (2 tests)
- [ ] Manual testing with real LinkedIn URL
- [ ] Regression testing (all existing features)
- [ ] Production validation (no mocks)

#### Documentation
- [ ] Update README with proactive agent setup
- [ ] Document work queue API
- [ ] Add troubleshooting guide

### Success Metrics

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Ticket creation time | <100ms | Performance test |
| URL detection accuracy | 100% | Unit tests |
| Orchestrator pickup time | <5s | Integration test |
| Agent processing time | <30s | E2E test |
| Zero ticket loss | 100% | Stress test |
| Retry success rate | >80% | Error injection test |
| Existing features working | 100% | Regression tests |

---

## Concurrent Agent Execution Plan

Using Claude-Flow Swarm for parallel implementation:

```yaml
agents:
  - name: database-agent
    role: Create work queue database schema and repository
    tasks:
      - Write schema SQL
      - Create migration
      - Implement repository class
      - Write unit tests
    parallel: true

  - name: url-detection-agent
    role: Build URL detection and matching service
    tasks:
      - Implement URL extraction
      - Implement agent matching
      - Implement context extraction
      - Write unit tests
    parallel: true

  - name: orchestrator-agent
    role: Integrate real work queue into orchestrator
    depends_on: [database-agent]
    tasks:
      - Replace stub repository
      - Update polling logic
      - Add worker lifecycle management
      - Write integration tests
    parallel: false

  - name: post-hook-agent
    role: Add URL detection hook to post creation
    depends_on: [url-detection-agent, database-agent]
    tasks:
      - Add post creation hook
      - Integrate URL detection
      - Create tickets
      - Write integration tests
    parallel: false

  - name: testing-agent
    role: E2E and regression testing
    depends_on: [orchestrator-agent, post-hook-agent]
    tasks:
      - Write Playwright E2E tests
      - Run regression tests
      - Manual validation
      - Screenshot capture
    parallel: false
```

**Timeline**: Concurrent execution ~45 minutes total (vs 3+ hours sequential)

---

**Next**: Launch concurrent agents to implement system with full TDD and Playwright validation.
