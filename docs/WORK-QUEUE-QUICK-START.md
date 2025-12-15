# Work Queue Repository Quick Start Guide

## Installation

The work queue system is already installed and ready to use. The migration has been applied to the production database.

## Import

```javascript
import { WorkQueueRepository } from './api-server/repositories/work-queue-repository.js';
import Database from 'better-sqlite3';

const db = new Database('./database.db');
const workQueue = new WorkQueueRepository(db);
```

## Usage Examples

### 1. Create a Ticket

```javascript
const ticket = workQueue.createTicket({
  user_id: 'user-123',              // Optional: User who created the request
  agent_id: 'link-logger-agent',    // Required: Which agent should process this
  content: 'Process this URL',      // Required: Task description
  url: 'https://example.com',       // Optional: URL to process
  priority: 'P2',                   // Required: P0 (highest) to P3 (lowest)
  metadata: {                       // Optional: Any JSON data
    post_id: 'post-456',
    context: 'User saved link',
    tags: ['important']
  }
});

console.log(ticket.id);           // Generated UUID
console.log(ticket.status);       // 'pending'
console.log(ticket.retry_count);  // 0
```

### 2. Get Pending Tickets (Orchestrator)

```javascript
// Get next 5 pending tickets ordered by priority
const pending = workQueue.getPendingTickets({ limit: 5 });

// Get pending tickets for specific agent
const agentPending = workQueue.getPendingTickets({
  limit: 5,
  agent_id: 'link-logger-agent'
});

console.log(pending[0].priority); // 'P0' (highest priority first)
```

### 3. Update Ticket Status

```javascript
// Mark as in progress (automatically sets assigned_at)
const inProgress = workQueue.updateTicketStatus(ticketId, 'in_progress');

console.log(inProgress.status);      // 'in_progress'
console.log(inProgress.assigned_at); // Timestamp
```

### 4. Complete Ticket

```javascript
const completed = workQueue.completeTicket(ticketId, {
  summary: 'Intelligence captured from LinkedIn article',
  posted: true,
  post_id: 'new-post-789',
  url_processed: 'https://example.com'
});

console.log(completed.status);        // 'completed'
console.log(completed.completed_at);  // Timestamp
console.log(completed.result);        // { summary: '...', posted: true, ... }
```

### 5. Fail Ticket with Retry

```javascript
// First 3 failures will retry (status = 'pending', retry_count++)
const retry1 = workQueue.failTicket(ticketId, 'Network timeout');
console.log(retry1.status);       // 'pending'
console.log(retry1.retry_count);  // 1

const retry2 = workQueue.failTicket(ticketId, 'API rate limit');
console.log(retry2.status);       // 'pending'
console.log(retry2.retry_count);  // 2

const retry3 = workQueue.failTicket(ticketId, 'Connection refused');
console.log(retry3.status);       // 'pending'
console.log(retry3.retry_count);  // 3

// 4th failure marks as permanently failed
const failed = workQueue.failTicket(ticketId, 'Max retries exceeded');
console.log(failed.status);        // 'failed'
console.log(failed.retry_count);   // 3
console.log(failed.completed_at);  // Timestamp
console.log(failed.last_error);    // 'Max retries exceeded'
```

### 6. Query Tickets by Agent

```javascript
const allTickets = workQueue.getTicketsByAgent('link-logger-agent');

console.log(allTickets.length);         // Total tickets
console.log(allTickets[0].status);      // 'completed', 'failed', 'pending', etc.
console.log(allTickets[0].created_at);  // Newest first
```

### 7. Get Single Ticket

```javascript
const ticket = workQueue.getTicket(ticketId);

if (ticket) {
  console.log(ticket.status);
  console.log(ticket.metadata);  // Automatically parsed from JSON
  console.log(ticket.result);    // Automatically parsed from JSON
}
```

## Priority Levels

| Priority | Use Case | Processing Order |
|----------|----------|------------------|
| P0 | Critical, immediate processing | First |
| P1 | High priority, process ASAP | Second |
| P2 | Normal priority (default) | Third |
| P3 | Low priority, background tasks | Last |

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be processed |
| `in_progress` | Currently being processed by a worker |
| `completed` | Successfully completed |
| `failed` | Failed after max retries (3) |

## Ticket Lifecycle

```
1. CREATE
   ↓
   status: 'pending'
   retry_count: 0
   created_at: [timestamp]

2. ASSIGN (Orchestrator picks up ticket)
   ↓
   status: 'in_progress'
   assigned_at: [timestamp]

3A. SUCCESS
    ↓
    status: 'completed'
    completed_at: [timestamp]
    result: { ... }

3B. FAILURE (Retry 1-3)
    ↓
    status: 'pending'
    retry_count: 1, 2, or 3
    last_error: "..."

3C. FAILURE (Max retries)
    ↓
    status: 'failed'
    retry_count: 3
    completed_at: [timestamp]
    last_error: "..."
```

## Integration with Orchestrator

```javascript
// In orchestrator poll loop
async function pollWorkQueue() {
  // Get pending tickets
  const tickets = workQueue.getPendingTickets({
    limit: maxWorkers - activeWorkers.size
  });

  for (const ticket of tickets) {
    // Mark as in progress
    workQueue.updateTicketStatus(ticket.id, 'in_progress');

    // Spawn worker
    const worker = spawnAgentWorker({
      agentId: ticket.agent_id,
      ticketId: ticket.id,
      context: {
        url: ticket.url,
        content: ticket.content,
        metadata: ticket.metadata
      }
    });

    // When worker completes
    worker.on('complete', (result) => {
      workQueue.completeTicket(ticket.id, result);
    });

    // When worker fails
    worker.on('error', (error) => {
      workQueue.failTicket(ticket.id, error.message);
    });
  }
}

setInterval(pollWorkQueue, 5000); // Poll every 5 seconds
```

## Integration with Post Creation

```javascript
// In POST /api/posts endpoint
app.post('/api/posts', async (req, res) => {
  // Create post
  const post = createPost(req.body);

  // Extract URLs
  const urls = extractURLs(post.content);

  // Create tickets for proactive agents
  for (const url of urls) {
    workQueue.createTicket({
      user_id: post.author_id,
      agent_id: 'link-logger-agent',
      content: post.content,
      url: url,
      priority: 'P2',
      metadata: {
        post_id: post.id,
        context: extractContext(post.content, url)
      }
    });
  }

  res.json(post);
});
```

## Database Schema

```sql
work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL,     -- P0, P1, P2, P3
  status TEXT NOT NULL,        -- pending, in_progress, completed, failed
  retry_count INTEGER,
  metadata TEXT,               -- JSON
  result TEXT,                 -- JSON
  last_error TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER
)
```

## Indexes

- `idx_work_queue_status` - Fast queries for pending tickets
- `idx_work_queue_agent` - Fast queries by agent
- `idx_work_queue_priority` - Priority + time ordering
- `idx_work_queue_user` - Fast queries by user

## Testing

Run unit tests:

```bash
npm test tests/unit/work-queue-repository.test.js
```

Verify production database:

```bash
node api-server/scripts/verify-work-queue.js
```

## Performance

- Ticket creation: <100ms
- Get pending tickets: <200ms
- Update status: <50ms
- Query by agent: <50ms

## Error Handling

```javascript
try {
  const ticket = workQueue.createTicket({ ... });
} catch (error) {
  console.error('Failed to create ticket:', error.message);
  // Handle constraint violations, database errors, etc.
}
```

## Common Patterns

### Pattern 1: Batch Processing

```javascript
const batchSize = 10;
const tickets = workQueue.getPendingTickets({ limit: batchSize });

await Promise.all(
  tickets.map(ticket => processTicket(ticket))
);
```

### Pattern 2: Agent-Specific Queue

```javascript
const linkLoggerQueue = workQueue.getPendingTickets({
  limit: 5,
  agent_id: 'link-logger-agent'
});
```

### Pattern 3: Retry with Backoff

```javascript
worker.on('error', async (error) => {
  const ticket = workQueue.getTicket(ticketId);

  if (ticket.retry_count < 3) {
    // Exponential backoff: 5s, 10s, 20s
    const delay = Math.pow(2, ticket.retry_count) * 5000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  workQueue.failTicket(ticketId, error.message);
});
```

## Troubleshooting

### No tickets appearing?

```javascript
// Check if tickets exist
const allTickets = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets').get();
console.log('Total tickets:', allTickets.count);

// Check pending tickets
const pending = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets WHERE status = "pending"').get();
console.log('Pending tickets:', pending.count);
```

### Tickets stuck in 'in_progress'?

```javascript
// Find stale tickets (in progress for >5 minutes)
const staleTime = Date.now() - (5 * 60 * 1000);
const staleTickets = db.prepare(`
  SELECT * FROM work_queue_tickets
  WHERE status = 'in_progress'
  AND assigned_at < ?
`).all(staleTime);

// Reset to pending
for (const ticket of staleTickets) {
  workQueue.updateTicketStatus(ticket.id, 'pending');
}
```

## Files

- **Migration**: `/workspaces/agent-feed/api-server/db/migrations/005-work-queue.sql`
- **Repository**: `/workspaces/agent-feed/api-server/repositories/work-queue-repository.js`
- **Tests**: `/workspaces/agent-feed/tests/unit/work-queue-repository.test.js`
- **Verification**: `/workspaces/agent-feed/api-server/scripts/verify-work-queue.js`

---

**Ready to Use**: The work queue system is production-ready and tested with 8/8 tests passing.
