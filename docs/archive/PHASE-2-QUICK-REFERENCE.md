# Phase 2 Quick Reference
## Avi DM Orchestrator & Agent Workers

**For:** Developers implementing Phase 2
**Version:** 2.0
**Date:** 2025-10-10

---

## 🎯 Phase 2 Goals

Build the orchestration layer that brings agent workers to life:
- ✅ Persistent Avi DM coordinator
- ✅ Ephemeral agent workers
- ✅ Context-aware task execution
- ✅ Automatic health monitoring

---

## 📁 New Files to Create

```
src/avi/
├── orchestrator.ts        # Main Avi DM class (~400 lines)
├── health-monitor.ts      # Health checks (~150 lines)
├── state-manager.ts       # State persistence (~100 lines)
└── types.ts              # Avi types (~50 lines)

src/workers/
├── agent-worker.ts        # Worker class (~300 lines)
├── worker-spawner.ts      # Spawn logic (~100 lines)
├── worker-pool.ts         # Pool management (~150 lines)
└── types.ts              # Worker types (~50 lines)

src/queue/
├── work-ticket.ts         # Ticket system (~150 lines)
├── priority-queue.ts      # Queue impl (~100 lines)
└── types.ts              # Queue types (~30 lines)

src/integration/
├── context-loader.ts      # Phase 1 wrapper (~80 lines)
├── orchestrator-db.ts     # Avi DB ops (~100 lines)
└── worker-db.ts          # Worker DB ops (~100 lines)

src/database/queries/
└── memories.ts           # Memory queries (~120 lines)

src/types/
├── orchestrator.ts        # Orchestrator types (~80 lines)
├── worker.ts             # Worker types (~60 lines)
└── work-ticket.ts        # Ticket types (~50 lines)

src/index.ts              # Main app entry (~100 lines)
```

**Total:** ~2,200 lines of TypeScript

---

## 🔄 Data Flow Cheat Sheet

### 1. Startup
```
index.ts
  → Connect to PostgreSQL (Phase 1 connection)
  → Create AviOrchestrator
  → Restore state from avi_state table
  → Start HealthMonitor
  → Start main loop
```

### 2. Work Ticket Creation
```
Feed Post
  → Avi.createWorkTicket()
  → Query agent_memories (getRecentMemories)
  → Select agent (selectAgent)
  → Enqueue ticket
  → Save to avi_state.pending_tickets
```

### 3. Worker Execution
```
WorkerSpawner.spawn(ticket)
  → Create AgentWorker instance
  → worker.execute()
    ├─> loadContext() [uses Phase 1's composeAgentContext]
    ├─> generateResponse() [Claude API]
    ├─> saveMemory() [INSERT agent_memories]
    └─> destroy()
```

### 4. Graceful Restart
```
HealthMonitor detects bloat
  → orchestrator.gracefulRestart()
    ├─> saveState() [UPDATE avi_state]
    ├─> Wait for workers (30s timeout)
    ├─> Reset contextSize to 1500
    └─> Resume main loop
```

---

## 🔌 Phase 1 Integration Points

### Functions You'll Call from Phase 1

```typescript
// 1. Context Composition (✅ Implemented in Phase 1)
import { composeAgentContext } from '../database/context-composer';

const context = await composeAgentContext(userId, agentType, db);
// Returns: AgentContext with protected fields enforced

// 2. Model Selection (✅ Implemented in Phase 1)
import { getModelForAgent } from '../database/context-composer';

const model = getModelForAgent(context);
// Returns: "claude-sonnet-4-5-20250929" or template override

// 3. System Template Queries (✅ Implemented in Phase 1)
import { getSystemTemplate } from '../database/queries/templates';

const template = await getSystemTemplate(db, 'tech-guru');

// 4. User Customization Queries (✅ Implemented in Phase 1)
import { getUserCustomization } from '../database/queries/customizations';

const custom = await getUserCustomization(db, userId, 'tech-guru');
```

### Database Tables You'll Use

```sql
-- READ: System templates (TIER 1)
SELECT * FROM system_agent_templates WHERE name = $1;

-- READ: User customizations (TIER 2)
SELECT * FROM user_agent_customizations
WHERE user_id = $1 AND agent_template = $2 AND enabled = true;

-- READ/WRITE: Agent memories (TIER 3)
SELECT content, metadata FROM agent_memories
WHERE user_id = $1 AND agent_name = $2
ORDER BY created_at DESC LIMIT 5;

INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
VALUES ($1, $2, $3, $4, $5);

-- READ/WRITE: Avi state
SELECT * FROM avi_state WHERE id = 1;

UPDATE avi_state SET
  last_feed_position = $1,
  pending_tickets = $2,
  context_size = $3,
  uptime_seconds = uptime_seconds + 30
WHERE id = 1;

-- WRITE: Error log
INSERT INTO error_log (agent_name, error_type, error_message, context)
VALUES ($1, $2, $3, $4);
```

---

## 📝 Implementation Checklist

### Week 1: Queue & Workers
- [ ] Create `src/queue/work-ticket.ts`
  - WorkTicket interface
  - createWorkTicket function
  - validateTicket function
- [ ] Create `src/queue/priority-queue.ts`
  - PriorityQueue class
  - enqueue/dequeue methods
  - toArray for persistence
- [ ] Create `src/workers/agent-worker.ts`
  - AgentWorker class
  - execute method (with try-finally for destroy)
  - loadContext wrapper
  - saveMemory wrapper
- [ ] Create `src/workers/worker-spawner.ts`
  - WorkerSpawner class
  - spawn method (async execution)
  - error handling
- [ ] Create `src/workers/worker-pool.ts`
  - WorkerPool class
  - Track active workers
  - hasCapacity method

### Week 2: Orchestrator
- [ ] Create `src/avi/state-manager.ts`
  - StateManager class
  - save/load methods
  - JSONB handling for pending_tickets
- [ ] Create `src/avi/orchestrator.ts`
  - AviOrchestrator class
  - Constructor with state restoration
  - mainLoop method
  - createWorkTicket method
  - spawnWorker method
  - gracefulRestart method
- [ ] Create `src/integration/context-loader.ts`
  - Wrapper around Phase 1 functions
  - Error handling
  - Logging
- [ ] Create `src/database/queries/memories.ts`
  - getRecentMemories
  - saveMemory
  - getMemoriesByTopic

### Week 3: Health & Monitoring
- [ ] Create `src/avi/health-monitor.ts`
  - HealthMonitor class
  - checkAviHealth method
  - checkDatabaseHealth method
  - triggerGracefulRestart method
- [ ] Create `src/index.ts`
  - Application entry point
  - Database connection
  - Orchestrator initialization
  - Health monitor start
  - Graceful shutdown handler

### Week 4: Testing & Integration
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] End-to-end test with real database
- [ ] Performance testing
- [ ] Documentation updates

---

## 🧪 Testing Examples

### Test Worker Execution
```typescript
// tests/phase2/integration/worker.test.ts
it('should execute worker with database context', async () => {
  const db = await createTestDatabase();
  await seedSystemTemplates(db);

  const ticket: WorkTicket = {
    id: 'test-ticket-1',
    postId: 'post-1',
    postContent: 'Test post about AI',
    userId: 'test-user',
    assignedAgent: 'tech-guru',
    relevantMemories: [],
    priority: 5,
    createdAt: Date.now(),
    status: 'pending'
  };

  const worker = new AgentWorker('worker-1', ticket, db);
  const result = await worker.execute();

  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();

  // Verify memory was saved
  const memories = await db.query(
    'SELECT * FROM agent_memories WHERE user_id = $1',
    ['test-user']
  );

  expect(memories.rows.length).toBeGreaterThan(0);
});
```

### Test Graceful Restart
```typescript
// tests/phase2/integration/orchestrator.test.ts
it('should restore state after restart', async () => {
  const db = await createTestDatabase();
  const orchestrator = new AviOrchestrator({ db, maxWorkers: 5 });

  // Add some tickets
  orchestrator['workQueue'].enqueue(createMockTicket());
  orchestrator['contextSize'] = 60000;

  // Trigger restart
  await orchestrator.gracefulRestart();

  // Verify state was saved
  const state = await db.query('SELECT * FROM avi_state WHERE id = 1');
  expect(state.rows[0].last_restart).toBeDefined();
  expect(state.rows[0].context_size).toBe(1500);

  // Verify tickets were persisted
  const pendingTickets = JSON.parse(state.rows[0].pending_tickets || '[]');
  expect(pendingTickets.length).toBeGreaterThan(0);
});
```

---

## ⚡ Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Worker spawn time | < 2s | Time from spawn() to context loaded |
| Worker execution | < 30s | Full lifecycle (load → execute → save → destroy) |
| Context load time | < 500ms | composeAgentContext() call |
| Memory query time | < 100ms | getRecentMemories() call |
| Avi restart time | < 5s | gracefulRestart() completion |
| Avi context growth | ~300 tokens/iteration | Main loop overhead |

---

## 🐛 Common Gotchas

### 1. Context Bloat
**Problem:** Avi context grows unbounded
**Solution:** Health monitor checks every 30s, triggers restart at 50K tokens

### 2. Worker Lifecycle
**Problem:** Workers not cleaning up
**Solution:** Always use try-finally, call destroy() in finally block

### 3. State Persistence
**Problem:** Pending tickets lost on restart
**Solution:** Save to avi_state.pending_tickets (JSONB) before restart

### 4. Database Connections
**Problem:** Connection pool exhaustion
**Solution:** Reuse single DatabaseManager, don't create per-worker

### 5. Memory Limits
**Problem:** Loading too many memories
**Solution:** Hard limit to 5 memories per ticket

---

## 🔍 Debugging Tips

### Check Avi State
```sql
SELECT
  id,
  last_feed_position,
  context_size,
  uptime_seconds,
  last_restart,
  jsonb_array_length(pending_tickets) as pending_count
FROM avi_state
WHERE id = 1;
```

### Check Recent Errors
```sql
SELECT
  agent_name,
  error_type,
  error_message,
  created_at
FROM error_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Worker Activity
```sql
SELECT
  agent_name,
  COUNT(*) as memory_count,
  MAX(created_at) as last_activity
FROM agent_memories
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY agent_name
ORDER BY memory_count DESC;
```

---

## 📚 Key Functions Reference

### Orchestrator
```typescript
// Create and start
const avi = new AviOrchestrator({ db, maxWorkers: 10 });
await avi.start();

// Check health
const health = await avi.checkHealth();
console.log(`Context: ${health.contextSize} tokens`);

// Graceful restart
await avi.gracefulRestart();

// Stop
await avi.stop();
```

### Worker
```typescript
// Spawn worker
const spawner = new WorkerSpawner(db);
const workerId = await spawner.spawn(ticket);

// Worker executes async, manages own lifecycle
// No need to track - fires and forgets
```

### Health Monitor
```typescript
// Start monitoring
const monitor = new HealthMonitor(avi, db);
monitor.start();

// Runs every 30s, triggers restart if needed
// No manual intervention required
```

---

## 🎓 Learning Path

1. **Start with WorkTicket** - Understand the data structure
2. **Build AgentWorker** - Core execution logic
3. **Add WorkerSpawner** - Async execution wrapper
4. **Create Orchestrator** - Tie it all together
5. **Add HealthMonitor** - Automatic maintenance
6. **Test Integration** - Full system validation

---

## ✅ Success Criteria

Phase 2 is complete when:
- [ ] Avi orchestrator starts and runs main loop
- [ ] Workers spawn with database context
- [ ] Workers execute and save memories
- [ ] Health monitor detects context bloat
- [ ] Graceful restart preserves state
- [ ] All integration tests pass
- [ ] System runs for 1 hour without errors

---

**Next:** Phase 3 - Platform integration, validation, retry logic
