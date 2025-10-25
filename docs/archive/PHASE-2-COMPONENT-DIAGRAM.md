# Phase 2 Component Diagram
## Visual Architecture Reference

---

## System Component Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ src/index.ts (Main Entry Point)                                   │ │
│  │ ├─> Initialize Database Connection (Phase 1)                      │ │
│  │ ├─> Create AviOrchestrator                                        │ │
│  │ ├─> Start HealthMonitor                                           │ │
│  │ └─> Handle Graceful Shutdown                                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/avi/orchestrator.ts                                        │   │
│  │                                                                 │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ Main Loop (runs continuously)                            │  │   │
│  │  │ while (isRunning):                                       │  │   │
│  │  │   1. checkFeed() → Get new posts                         │  │   │
│  │  │   2. createWorkTicket() → Package task                   │  │   │
│  │  │   3. processWorkQueue() → Spawn workers                  │  │   │
│  │  │   4. updateContextSize() → Track bloat                   │  │   │
│  │  │   5. sleep(5000) → Brief pause                           │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  Properties:                                                    │   │
│  │  ├─ workQueue: PriorityQueue<WorkTicket>                       │   │
│  │  ├─ workerPool: WorkerPool                                     │   │
│  │  ├─ stateManager: StateManager                                 │   │
│  │  ├─ contextSize: number (tracks bloat)                         │   │
│  │  └─ isRunning: boolean                                         │   │
│  │                                                                 │   │
│  │  Key Methods:                                                   │   │
│  │  ├─ start() → Begin main loop                                  │   │
│  │  ├─ createWorkTicket(post) → Build ticket                      │   │
│  │  ├─ spawnWorker(ticket) → Delegate to spawner                  │   │
│  │  ├─ gracefulRestart() → Save state & reset                     │   │
│  │  └─ checkHealth() → Return status                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/avi/health-monitor.ts                                      │   │
│  │                                                                 │   │
│  │  Every 30 seconds:                                              │   │
│  │  ├─ checkAviHealth() → Is context < 50K?                       │   │
│  │  ├─ checkDatabaseHealth() → Can query DB?                      │   │
│  │  └─ triggerGracefulRestart() → If needed                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/avi/state-manager.ts                                       │   │
│  │                                                                 │   │
│  │  ├─ save(state) → UPDATE avi_state                             │   │
│  │  │   - last_feed_position                                      │   │
│  │  │   - pending_tickets (JSONB)                                 │   │
│  │  │   - context_size                                            │   │
│  │  │   - uptime_seconds                                          │   │
│  │  │                                                              │   │
│  │  └─ load() → SELECT FROM avi_state                             │   │
│  │      - Restore on startup                                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          QUEUE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/queue/work-ticket.ts                                       │   │
│  │                                                                 │   │
│  │  WorkTicket Interface:                                          │   │
│  │  {                                                               │   │
│  │    id: string                    "ticket_123456"                │   │
│  │    postId: string                Original post ID              │   │
│  │    postContent: string           Post text                     │   │
│  │    userId: string                User who posted               │   │
│  │    assignedAgent: string         "tech-guru"                   │   │
│  │    relevantMemories: Memory[]    Recent context (max 5)        │   │
│  │    priority: number              1-10 (higher = urgent)        │   │
│  │    createdAt: number             Timestamp                     │   │
│  │    status: enum                  pending/processing/completed  │   │
│  │    retryCount?: number           Failed attempts               │   │
│  │  }                                                               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/queue/priority-queue.ts                                    │   │
│  │                                                                 │   │
│  │  PriorityQueue<T> Class:                                        │   │
│  │  ├─ enqueue(item, priority) → Add to queue                     │   │
│  │  ├─ dequeue() → Remove highest priority                        │   │
│  │  ├─ isEmpty() → Check if empty                                 │   │
│  │  ├─ size() → Get count                                         │   │
│  │  └─ toArray() → Serialize for persistence                      │   │
│  │                                                                 │   │
│  │  Internal: Binary heap for O(log n) operations                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          WORKER LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/workers/worker-spawner.ts                                  │   │
│  │                                                                 │   │
│  │  WorkerSpawner Class:                                           │   │
│  │  └─ spawn(ticket) → Returns workerId immediately               │   │
│  │      ├─ Create AgentWorker instance                            │   │
│  │      ├─ Start async execution (don't await)                    │   │
│  │      └─ Track in pool                                          │   │
│  │                                                                 │   │
│  │  Async execution (runs in background):                         │   │
│  │  └─ executeWorker(worker, ticket)                              │   │
│  │      ├─ await worker.execute()                                 │   │
│  │      ├─ Log result                                             │   │
│  │      └─ Handle errors                                          │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/workers/agent-worker.ts                                    │   │
│  │                                                                 │   │
│  │  AgentWorker Class (Ephemeral):                                 │   │
│  │  Properties:                                                    │   │
│  │  ├─ workerId: string                                           │   │
│  │  ├─ ticket: WorkTicket                                         │   │
│  │  ├─ db: DatabaseManager                                        │   │
│  │  ├─ agentContext: AgentContext | null                          │   │
│  │  ├─ startTime: number                                          │   │
│  │  └─ isDestroyed: boolean                                       │   │
│  │                                                                 │   │
│  │  execute() Method (Full Lifecycle):                            │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ try {                                                   │   │   │
│  │  │   1. loadContext()                                      │   │   │
│  │  │      → Call composeAgentContext (Phase 1)               │   │   │
│  │  │      → Load system template + user customizations       │   │   │
│  │  │      → Validate protected fields                        │   │   │
│  │  │                                                          │   │   │
│  │  │   2. generateResponse()                                 │   │   │
│  │  │      → Build system prompt from context                 │   │   │
│  │  │      → Build user message (post + memories)             │   │   │
│  │  │      → Call Claude API                                  │   │   │
│  │  │      → Parse response                                   │   │   │
│  │  │                                                          │   │   │
│  │  │   3. saveMemory(response)                               │   │   │
│  │  │      → INSERT INTO agent_memories                       │   │   │
│  │  │      → Extract metadata (topic, sentiment)              │   │   │
│  │  │                                                          │   │   │
│  │  │   return { success: true, ... }                         │   │   │
│  │  │                                                          │   │   │
│  │  │ } catch (error) {                                       │   │   │
│  │  │   return { success: false, error }                      │   │   │
│  │  │                                                          │   │   │
│  │  │ } finally {                                             │   │   │
│  │  │   await this.destroy()  // ALWAYS cleanup              │   │   │
│  │  │ }                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  Lifecycle: 30-60 seconds total                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/workers/worker-pool.ts                                     │   │
│  │                                                                 │   │
│  │  WorkerPool Class:                                              │   │
│  │  ├─ activeWorkers: Map<workerId, ticketId>                     │   │
│  │  ├─ maxWorkers: number                                         │   │
│  │  │                                                              │   │
│  │  ├─ add(workerId, ticketId) → Track worker                     │   │
│  │  ├─ remove(workerId) → Cleanup                                 │   │
│  │  ├─ hasCapacity() → activeCount < maxWorkers                   │   │
│  │  ├─ getActiveCount() → Current count                           │   │
│  │  └─ waitForCompletion(timeout) → For graceful restart          │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/integration/context-loader.ts                              │   │
│  │                                                                 │   │
│  │  Wrapper around Phase 1 functions:                              │   │
│  │                                                                 │   │
│  │  loadWorkerContext(userId, agentType, db):                     │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ try {                                                   │   │   │
│  │  │   // Use Phase 1's composition                          │   │   │
│  │  │   const context = await composeAgentContext(           │   │   │
│  │  │     userId, agentType, db                              │   │   │
│  │  │   );                                                    │   │   │
│  │  │                                                         │   │   │
│  │  │   console.log(`Context loaded: ${context.agentName}`); │   │   │
│  │  │   return context;                                      │   │   │
│  │  │                                                         │   │   │
│  │  │ } catch (error) {                                      │   │   │
│  │  │   // Log to error_log table                           │   │   │
│  │  │   // Re-throw                                          │   │   │
│  │  │ }                                                       │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  Re-exports from Phase 1:                                      │   │
│  │  ├─ getModelForAgent(context)                                  │   │
│  │  └─ validateCustomizations(custom, template)                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/database/queries/memories.ts                               │   │
│  │                                                                 │   │
│  │  getRecentMemories(db, userId, agentName, limit):              │   │
│  │  ├─> SELECT FROM agent_memories                                │   │
│  │  ├─> WHERE user_id AND agent_name                              │   │
│  │  ├─> ORDER BY created_at DESC                                  │   │
│  │  └─> LIMIT 5 (prevent context bloat)                           │   │
│  │                                                                 │   │
│  │  saveMemory(db, userId, agentName, postId, content, metadata): │   │
│  │  └─> INSERT INTO agent_memories                                │   │
│  │                                                                 │   │
│  │  getMemoriesByTopic(db, userId, agentName, topic, limit):      │   │
│  │  └─> SELECT WHERE metadata @> '{"topic": "..."}'               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER (Phase 1)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ src/database/context-composer.ts (✅ Phase 1)                   │   │
│  │                                                                 │   │
│  │  composeAgentContext(userId, agentType, db):                   │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ 1. Load system template (TIER 1 - Immutable)           │   │   │
│  │  │    SELECT FROM system_agent_templates                  │   │   │
│  │  │    WHERE name = agentType                              │   │   │
│  │  │                                                         │   │   │
│  │  │ 2. Load user customization (TIER 2 - Optional)         │   │   │
│  │  │    SELECT FROM user_agent_customizations               │   │   │
│  │  │    WHERE user_id AND agent_template AND enabled        │   │   │
│  │  │                                                         │   │   │
│  │  │ 3. Validate (Security check)                           │   │   │
│  │  │    validateCustomizations(custom, template)            │   │   │
│  │  │    ├─ Check for protected field overrides              │   │   │
│  │  │    └─ Throw SecurityError if violation                 │   │   │
│  │  │                                                         │   │   │
│  │  │ 4. Compose final context (System rules win)            │   │   │
│  │  │    return {                                             │   │   │
│  │  │      // PROTECTED (from template)                      │   │   │
│  │  │      model: template.model,                            │   │   │
│  │  │      posting_rules: template.posting_rules,            │   │   │
│  │  │      api_schema: template.api_schema,                  │   │   │
│  │  │      safety_constraints: template.safety_constraints,  │   │   │
│  │  │                                                         │   │   │
│  │  │      // CUSTOMIZABLE (user override or template)       │   │   │
│  │  │      personality: custom?.personality || default,      │   │   │
│  │  │      interests: custom?.interests || [],               │   │   │
│  │  │      response_style: custom?.response_style || default │   │   │
│  │  │    }                                                    │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  getModelForAgent(context):                                    │   │
│  │  └─> context.model || process.env.AGENT_MODEL ||               │   │
│  │      "claude-sonnet-4-5-20250929"                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL Database                                            │   │
│  │                                                                 │   │
│  │  Tables Used by Phase 2:                                        │   │
│  │  ├─ system_agent_templates     (READ - TIER 1)                 │   │
│  │  ├─ user_agent_customizations  (READ - TIER 2)                 │   │
│  │  ├─ agent_memories              (READ/WRITE - TIER 3)          │   │
│  │  ├─ avi_state                   (READ/WRITE)                   │   │
│  │  └─ error_log                   (WRITE)                        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Flow Sequence

```
┌─────────┐
│ START   │
└────┬────┘
     │
     ▼
┌─────────────────────────┐
│ index.ts                │
│ - Connect to DB         │
│ - Create Avi            │
│ - Start Health Monitor  │
│ - Start Avi Loop        │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐     Every 30s     ┌──────────────────┐
│ AviOrchestrator        │◄─────────────────────│ HealthMonitor    │
│ Main Loop (infinite)    │                     │ - Check context  │
│                         │                     │ - Trigger restart│
│ while (isRunning):      │                     └──────────────────┘
│   1. Check feed ───────┼──────┐
│   2. Create tickets ───┼──┐   │
│   3. Process queue ────┼┐ │   │
│   4. Update context    ││ │   │
│   5. Sleep 5s          ││ │   │
└───────────┬─────────────┘│ │   │
            │              │ │   │
            │              │ │   │ (Feed would be external API)
            │              │ │   └─→ Feed API (Phase 3)
            │              │ │
            │              │ └─→ createWorkTicket()
            │              │       ├─ selectAgent()
            │              │       ├─ getRecentMemories()
            │              │       └─ enqueue(ticket)
            │              │
            │              └─→ processWorkQueue()
            │                     │
            │                     ▼
            │              ┌──────────────────┐
            │              │ WorkerSpawner    │
            │              │ spawn(ticket)    │
            │              └────┬─────────────┘
            │                   │
            │                   ▼
            │              ┌──────────────────────────────┐
            │              │ AgentWorker (Async)          │
            │              │                              │
            │              │ execute():                   │
            │              │   1. loadContext() ────────┐ │
            │              │   2. generateResponse()    │ │
            │              │   3. saveMemory()          │ │
            │              │   4. destroy()             │ │
            │              └────┬───────────────────────┼─┘
            │                   │                       │
            │                   │                       │
            │                   │                       └──→ Phase 1:
            │                   │                            composeAgentContext()
            │                   │
            │                   ▼
            │              ┌──────────────────┐
            │              │ Claude API       │
            │              │ Generate response│
            │              └────┬─────────────┘
            │                   │
            │                   ▼
            │              ┌──────────────────┐
            │              │ Database         │
            │              │ INSERT memory    │
            │              └────┬─────────────┘
            │                   │
            │                   ▼
            │              Worker destroys
            │              (30-60s total)
            │
            └─→ Continue loop...
```

---

## Dependency Graph

```
index.ts
  │
  ├─→ DatabaseManager (Phase 1)
  │     └─→ PostgreSQL connection
  │
  ├─→ AviOrchestrator
  │     ├─→ PriorityQueue
  │     │     └─→ WorkTicket
  │     ├─→ WorkerPool
  │     ├─→ StateManager
  │     │     └─→ avi_state table
  │     └─→ WorkerSpawner
  │           └─→ AgentWorker
  │                 ├─→ context-loader (integration)
  │                 │     └─→ composeAgentContext (Phase 1)
  │                 ├─→ memories queries
  │                 │     └─→ agent_memories table
  │                 └─→ Claude API
  │
  └─→ HealthMonitor
        └─→ AviOrchestrator.gracefulRestart()
```

---

## Data Flow Summary

### Startup
```
DB Connection → Avi Creation → State Restore → Main Loop Start
```

### Work Creation
```
Feed Post → Select Agent → Query Memories → Create Ticket → Enqueue
```

### Worker Execution
```
Dequeue Ticket → Spawn Worker → Load Context → Generate → Save Memory → Destroy
```

### Graceful Restart
```
Context Bloat Detected → Save State → Wait Workers → Reset Context → Resume
```

---

## Token Budget Breakdown

| Component | Tokens | Frequency | Daily Total |
|-----------|--------|-----------|-------------|
| Avi baseline context | 1,500 | Constant | 1,500 |
| Feed check iteration | 300 | 288/day (5min) | 86,400 |
| Work ticket creation | 200 | 100/day | 20,000 |
| Worker context load | 2,700 | 20/day | 54,000 |
| Worker generation | 5,000 | 20/day | 100,000 |
| Graceful restart | 1,500 | 1/day | 1,500 |
| **TOTAL** | | | **263,400/day** |

For 3 active agents: ~530,000 tokens/day
(vs. 1.1M tokens/day without optimization)

---

This diagram shows all Phase 2 components and their relationships!
