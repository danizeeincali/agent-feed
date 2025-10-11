# Work Queue System - Quick Start Guide

Quick reference for using the Phase 2 Work Queue System.

---

## Installation

The Work Queue System is already included in the project:

```typescript
import { PriorityQueue, WorkTicketQueue } from './src/queue';
import { Priority, Status } from './src/types/work-ticket';
```

---

## Basic Usage

### 1. Create a Work Ticket Queue

```typescript
import { WorkTicketQueue } from './src/queue';

const queue = new WorkTicketQueue();
```

### 2. Create Work Tickets

```typescript
import { Priority } from './src/types/work-ticket';

// Create a high-priority ticket
const ticket = await queue.createTicket({
  type: 'post_response',
  priority: Priority.HIGH,  // or use number: 8
  agentName: 'tech-guru',
  userId: 'user-123',
  payload: {
    postId: 'post-456',
    content: 'What do you think about AI?'
  }
});

console.log(ticket.id); // "ticket-1728564321000-0"
console.log(ticket.status); // "pending"
```

### 3. Assign to Worker

```typescript
// When a worker is ready to process
await queue.assignToWorker(ticket.id, 'worker-abc123');

// Ticket status is now "processing"
```

### 4. Complete or Fail Ticket

```typescript
// On success
await queue.completeTicket(ticket.id, {
  response: 'AI is transforming technology!',
  tokensUsed: 450
});

// On failure
try {
  // ... worker execution
} catch (error) {
  await queue.failTicket(ticket.id, error);
}
```

### 5. Get Queue Metrics

```typescript
const metrics = await queue.getMetrics();

console.log(metrics);
// {
//   total: 10,
//   pending: 3,
//   processing: 2,
//   completed: 4,
//   failed: 1
// }
```

---

## Priority Queue

Use PriorityQueue directly for custom priority-based queuing:

```typescript
import { PriorityQueue } from './src/queue';

interface Task {
  name: string;
  priority: number;
}

const taskQueue = new PriorityQueue<Task>();

// Add tasks
taskQueue.enqueue({ name: 'Low priority task', priority: 1 });
taskQueue.enqueue({ name: 'High priority task', priority: 10 });
taskQueue.enqueue({ name: 'Medium priority task', priority: 5 });

// Process in priority order
while (!taskQueue.isEmpty()) {
  const task = taskQueue.dequeue();
  console.log(task?.name);
}
// Output:
// "High priority task"
// "Medium priority task"
// "Low priority task"
```

---

## Priority Levels

Use predefined priority constants:

```typescript
import { Priority } from './src/types/work-ticket';

Priority.LOW       // 1
Priority.MEDIUM    // 5
Priority.HIGH      // 8
Priority.CRITICAL  // 10
```

Or use custom numbers:

```typescript
const ticket = await queue.createTicket({
  priority: 7,  // Custom priority between HIGH and MEDIUM
  // ...
});
```

---

## Status Checks

```typescript
import { Status } from './src/types/work-ticket';

const ticket = await queue.getTicket(ticketId);

if (ticket?.status === Status.PENDING) {
  console.log('Ticket is waiting to be processed');
}

if (ticket?.status === Status.IN_PROGRESS) {
  console.log('Ticket is currently being processed');
}

if (ticket?.status === Status.COMPLETED) {
  console.log('Ticket completed successfully');
  console.log('Result:', ticket.payload.result);
}

if (ticket?.status === Status.FAILED) {
  console.log('Ticket failed:', ticket.error);
}
```

---

## Complete Workflow Example

```typescript
import { WorkTicketQueue } from './src/queue';
import { Priority, Status } from './src/types/work-ticket';

// Initialize queue
const queue = new WorkTicketQueue();

// 1. Create tickets for incoming posts
const posts = [
  { id: 'post-1', content: 'AI question', urgent: true },
  { id: 'post-2', content: 'Normal question', urgent: false }
];

for (const post of posts) {
  await queue.createTicket({
    type: 'post_response',
    priority: post.urgent ? Priority.HIGH : Priority.MEDIUM,
    agentName: 'tech-guru',
    userId: 'user-123',
    payload: { postId: post.id, content: post.content }
  });
}

// 2. Check queue status
const metrics = await queue.getMetrics();
console.log(`${metrics.pending} tickets waiting`);

// 3. Process tickets (in Avi Orchestrator)
async function processNextTicket() {
  // Get active workers
  const activeWorkers = await queue.getActiveWorkers();

  // Check if we have capacity (max 10 workers)
  if (activeWorkers.length >= 10) {
    console.log('At max capacity');
    return;
  }

  // Get next ticket from queue
  // (In real implementation, dequeue from PriorityQueue)
  const tickets = []; // Get pending tickets
  if (tickets.length === 0) return;

  const ticket = tickets[0];

  // Spawn worker
  const workerId = `worker-${Date.now()}`;
  await queue.assignToWorker(ticket.id, workerId);

  // Worker executes (async)
  executeWorker(workerId, ticket).catch(async (error) => {
    await queue.failTicket(ticket.id, error);
  });
}

// 4. Worker execution
async function executeWorker(workerId: string, ticket: any) {
  try {
    // Load context from database
    // Generate response with Claude
    const response = { text: 'Response here', tokensUsed: 500 };

    // Complete ticket
    await queue.completeTicket(ticket.id, response);

    console.log(`Worker ${workerId} completed ticket ${ticket.id}`);
  } catch (error) {
    console.error(`Worker ${workerId} failed:`, error);
    throw error; // Caught by processNextTicket
  }
}

// 5. Monitor queue
setInterval(async () => {
  const metrics = await queue.getMetrics();
  console.log('Queue Status:', metrics);
}, 10000); // Every 10 seconds
```

---

## Error Handling

### Common Errors

```typescript
// 1. Ticket not found
try {
  await queue.assignToWorker('invalid-ticket-id', 'worker-1');
} catch (error) {
  // Error: "Ticket not found: invalid-ticket-id"
}

// 2. Ticket already processing
try {
  await queue.assignToWorker(ticket.id, 'worker-1');
  await queue.assignToWorker(ticket.id, 'worker-2'); // Error!
} catch (error) {
  // Error: "Ticket already being processed"
}

// 3. Ticket already completed
try {
  await queue.assignToWorker(ticket.id, 'worker-1');
  await queue.completeTicket(ticket.id, {});
  await queue.assignToWorker(ticket.id, 'worker-2'); // Error!
} catch (error) {
  // Error: "Ticket already completed or failed"
}

// 4. Ticket not processing
try {
  await queue.completeTicket(ticket.id, {}); // Without assigning first
} catch (error) {
  // Error: "Ticket is not being processed"
}
```

---

## Testing

### Unit Tests

```typescript
import { WorkTicketQueue } from './src/queue';

describe('My Feature', () => {
  let queue: WorkTicketQueue;

  beforeEach(() => {
    queue = new WorkTicketQueue();
  });

  it('should process ticket successfully', async () => {
    // Create ticket
    const ticket = await queue.createTicket({
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: {}
    });

    // Assign to worker
    await queue.assignToWorker(ticket.id, 'worker-1');

    // Verify status
    const updated = await queue.getTicket(ticket.id);
    expect(updated?.status).toBe('processing');

    // Complete
    await queue.completeTicket(ticket.id, { success: true });

    // Verify completion
    const completed = await queue.getTicket(ticket.id);
    expect(completed?.status).toBe('completed');
  });
});
```

---

## Performance Tips

### 1. Batch Operations

```typescript
// Create multiple tickets efficiently
const tickets = await Promise.all(
  posts.map(post => queue.createTicket({
    type: 'post_response',
    priority: getPriority(post),
    agentName: getAgent(post),
    userId: post.userId,
    payload: post
  }))
);
```

### 2. Monitor Queue Size

```typescript
const queueSize = queue.getQueueSize();

if (queueSize > 100) {
  console.warn('Queue backlog detected');
  // Scale up workers or throttle incoming requests
}
```

### 3. Clean Up Completed Tickets

```typescript
// Periodically clean up old completed tickets
async function cleanupOldTickets() {
  const metrics = await queue.getMetrics();

  if (metrics.completed > 1000) {
    // Archive or remove old completed tickets
    // (Implementation depends on requirements)
  }
}
```

---

## Integration with Phase 1 Database

Future integration (not yet implemented):

```typescript
import { composeAgentContext } from './src/database/context-composer';
import { getRecentMemories } from './src/database/queries/memories';

async function createTicketWithContext(post: Post, db: DatabaseManager) {
  // Get relevant memories
  const memories = await getRecentMemories(
    db,
    post.userId,
    'tech-guru',
    5
  );

  // Create ticket with memories
  const ticket = await queue.createTicket({
    type: 'post_response',
    priority: Priority.HIGH,
    agentName: 'tech-guru',
    userId: post.userId,
    payload: {
      postId: post.id,
      content: post.content,
      memories: memories  // Include relevant context
    }
  });

  return ticket;
}
```

---

## API Reference

### WorkTicketQueue Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createTicket()` | `WorkTicketInput` | `Promise<WorkTicket>` | Create and enqueue new ticket |
| `assignToWorker()` | `ticketId`, `workerId` | `Promise<void>` | Assign ticket to worker |
| `completeTicket()` | `ticketId`, `result` | `Promise<void>` | Mark ticket as completed |
| `failTicket()` | `ticketId`, `error` | `Promise<void>` | Mark ticket as failed |
| `getTicket()` | `ticketId` | `Promise<WorkTicket \| null>` | Get ticket by ID |
| `getMetrics()` | - | `Promise<QueueStats>` | Get queue statistics |
| `getActiveWorkers()` | - | `Promise<string[]>` | Get active worker IDs |
| `getQueueSize()` | - | `number` | Get queue size |

### PriorityQueue Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `enqueue()` | `item` | `void` | Add item to queue |
| `dequeue()` | - | `T \| null` | Remove and return highest priority item |
| `peek()` | - | `T \| null` | View highest priority item |
| `size()` | - | `number` | Get queue size |
| `isEmpty()` | - | `boolean` | Check if queue is empty |
| `clear()` | - | `void` | Remove all items |

---

## Support

For issues or questions:
- See full documentation: `/workspaces/agent-feed/PHASE-2-WORK-QUEUE-TDD-SUMMARY.md`
- Run tests: `npm test -- tests/phase2/unit/work-ticket.test.ts`
- Check Phase 2 spec: `/workspaces/agent-feed/PHASE-2-SPECIFICATION.md`

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Status:** Ready for use
