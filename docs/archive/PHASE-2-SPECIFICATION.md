# Phase 2 Specification: Avi DM Orchestrator & Agent Workers
## SPARC Specification Document

**Version:** 1.0
**Date:** 2025-10-10
**Phase:** Phase 2 - Orchestrator & Workers
**Status:** Specification Complete - Ready for Implementation
**Depends On:** Phase 1 (PostgreSQL Database) - **COMPLETE**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Requirements Analysis](#requirements-analysis)
3. [Functional Requirements](#functional-requirements)
4. [Component Specifications](#component-specifications)
5. [User Stories & Scenarios](#user-stories--scenarios)
6. [Acceptance Criteria](#acceptance-criteria)
7. [Edge Cases & Constraints](#edge-cases--constraints)
8. [Data Flow Specifications](#data-flow-specifications)
9. [API Specifications](#api-specifications)
10. [Performance Requirements](#performance-requirements)
11. [Testing Strategy](#testing-strategy)
12. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### Purpose

Phase 2 implements the core orchestration layer of Avi DM - a persistent AI orchestrator that manages ephemeral agent workers for social media interaction. This phase builds directly on Phase 1's database infrastructure to create a zero-downtime, token-efficient system.

### Scope

**In Scope:**
- Avi DM persistent orchestrator (~1-2K tokens context)
- Agent worker spawning system (ephemeral, context-loaded)
- Health monitoring with auto-restart on context bloat
- Work ticket queue system
- Context composition integration with Phase 1 database
- Graceful restart mechanism

**Out of Scope (Future Phases):**
- Feed monitoring integration (Phase 2.5)
- Post validation system (Phase 3)
- Platform API integration (Phase 4)
- Metrics dashboard (Phase 5)

### Success Metrics

- ✅ Avi DM stays under 2K tokens context (measured via Claude API)
- ✅ Agent workers load context from PostgreSQL (REAL DB, no mocks)
- ✅ Health monitoring detects context bloat and auto-restarts within 30s
- ✅ Zero downtime during Avi restarts (< 100ms gap)
- ✅ All components integrate with Phase 1 database schemas

---

## Requirements Analysis

### Extracted from Architecture Plan

Based on `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`, Phase 2 requires:

#### 1. Avi DM Orchestrator Requirements

**R-AVI-001:** Persistent orchestrator instance running 24/7
**R-AVI-002:** Minimal context size (~1,500 tokens base)
**R-AVI-003:** Work ticket creation and queueing
**R-AVI-004:** Agent worker spawning capability
**R-AVI-005:** Graceful restart on context bloat (>50K tokens)
**R-AVI-006:** State persistence to database (`avi_state` table)
**R-AVI-007:** Error escalation to users

#### 2. Agent Worker Requirements

**R-WORKER-001:** Ephemeral lifecycle (spawn → execute → destroy)
**R-WORKER-002:** Context loaded from Phase 1 database
**R-WORKER-003:** 3-tier context composition (System + User + Runtime)
**R-WORKER-004:** Memory retrieval from `agent_memories` table
**R-WORKER-005:** Memory saving after execution
**R-WORKER-006:** Total lifespan 30-60 seconds per worker
**R-WORKER-007:** Maximum 10 concurrent workers

#### 3. Health Monitoring Requirements

**R-HEALTH-001:** Check Avi DM health every 30 seconds
**R-HEALTH-002:** Monitor context size via Claude API
**R-HEALTH-003:** Auto-restart on context > 50K tokens
**R-HEALTH-004:** Database health checks
**R-HEALTH-005:** Uptime tracking in `avi_state` table

#### 4. Context Composition Requirements

**R-CONTEXT-001:** Load system template from `system_agent_templates`
**R-CONTEXT-002:** Load user customization from `user_agent_customizations`
**R-CONTEXT-003:** Validate no protected field overrides
**R-CONTEXT-004:** Merge context with system rules priority
**R-CONTEXT-005:** Return typed `AgentContext` object

#### 5. Work Ticket Queue Requirements

**R-QUEUE-001:** In-memory queue with database persistence
**R-QUEUE-002:** Ticket structure matches `WorkTicket` type
**R-QUEUE-003:** FIFO processing order
**R-QUEUE-004:** Persist pending tickets to `avi_state.pending_tickets`
**R-QUEUE-005:** Restore queue on Avi restart

---

## Functional Requirements

### FR-1: Avi DM Orchestrator

#### FR-1.1: Initialization
- **MUST** initialize with minimal system prompt (~1,500 tokens)
- **MUST** load state from `avi_state` table on startup
- **MUST** restore pending tickets from database
- **MUST** connect to PostgreSQL using Phase 1 connection pool
- **MUST** verify database schema exists before starting

#### FR-1.2: Work Ticket Management
- **MUST** create work tickets with structure: `{id, postId, postContent, postAuthor, assignedAgent, relevantMemories, createdAt}`
- **MUST** queue tickets in memory for fast access
- **MUST** persist pending tickets to `avi_state.pending_tickets` every 10 seconds
- **MUST** determine which agent should handle each ticket
- **MUST** include relevant memories in ticket (max 5 recent)

#### FR-1.3: Agent Spawning
- **MUST** spawn agent workers on-demand for work tickets
- **MUST** limit concurrent workers to 10 (configurable via `MAX_AGENT_WORKERS`)
- **MUST** pass work ticket to agent worker
- **MUST** track active workers in memory
- **MUST** clean up worker references after completion

#### FR-1.4: Graceful Restart
- **MUST** monitor own context size via Claude API
- **MUST** initiate graceful restart when context > 50K tokens
- **MUST** save current state to `avi_state` table before restart
- **MUST** preserve pending tickets across restart
- **MUST** destroy old Claude instance
- **MUST** create new Claude instance with fresh context
- **MUST** restore state from database
- **MUST** complete restart in < 5 seconds

#### FR-1.5: Error Handling
- **MUST** log errors to `error_log` table
- **MUST** implement exponential backoff on failures
- **MUST** escalate to user after 3 failed attempts
- **MUST** continue operation despite individual ticket failures

---

### FR-2: Agent Workers

#### FR-2.1: Lifecycle Management
- **MUST** spawn worker via `spawnAgentWorker(ticket)` function
- **MUST** load context via `composeAgentContext(userId, agentType, db)`
- **MUST** execute work ticket (mock in Phase 2, real in Phase 3)
- **MUST** save memory to `agent_memories` table
- **MUST** destroy Claude instance after completion
- **MUST** complete lifecycle in 30-60 seconds

#### FR-2.2: Context Composition
- **MUST** use Phase 1 `composeAgentContext()` function
- **MUST** load system template from `system_agent_templates` table
- **MUST** load user customization from `user_agent_customizations` table
- **MUST** validate no protected field overrides using `validateCustomizations()`
- **MUST** return `AgentContext` object with merged configuration
- **MUST** throw `SecurityError` if user overrides protected fields
- **MUST** throw `Error` if system template not found

#### FR-2.3: Memory Management
- **MUST** retrieve relevant memories via `getUserMemories(db, userId, agentName, limit=5)`
- **MUST** include memories in agent context
- **MUST** save new memory after execution: `{user_id, agent_name, post_id, content, metadata, created_at}`
- **MUST** use JSONB metadata for topic, sentiment, mentioned_users
- **MUST** query memories by recency + topic matching (PostgreSQL GIN index)

#### FR-2.4: Model Selection
- **MUST** use `getModelForAgent(agentContext)` to determine Claude model
- **MUST** follow priority: `template.model → env.AGENT_MODEL → 'claude-sonnet-4-5-20250929'`
- **MUST** support different models per agent template

---

### FR-3: Health Monitor

#### FR-3.1: Monitoring Loop
- **MUST** run health checks every 30 seconds (configurable via `HEALTH_CHECK_INTERVAL`)
- **MUST** check Avi DM health
- **MUST** check database health
- **MUST** update metrics in `avi_state` table
- **MUST** continue monitoring despite individual check failures

#### FR-3.2: Avi Health Check
- **MUST** query current context size from Avi instance
- **MUST** trigger graceful restart if context > 50K tokens (configurable via `AVI_CONTEXT_LIMIT`)
- **MUST** update `avi_state.uptime_seconds` before restart
- **MUST** record restart timestamp in `avi_state.last_restart`
- **MUST** reset `avi_state.context_size` to 1500 after restart

#### FR-3.3: Database Health Check
- **MUST** execute simple query: `SELECT 1`
- **MUST** attempt reconnection on failure
- **MUST** implement exponential backoff (5s, 30s, 120s)
- **MUST** log database errors to console and `error_log`
- **MUST** enter degraded mode if database unavailable for > 5 minutes

#### FR-3.4: Metrics Collection
- **MUST** track: `aviContextSize`, `activeAgents`, `queuedTickets`, `errorRate`, `uptime`
- **MUST** calculate error rate from `error_log` table (last 1 hour)
- **MUST** log metrics to console (Phase 2), dashboard (Phase 5)

---

## Component Specifications

### Component 1: Avi DM Orchestrator

**File:** `src/avi/orchestrator.ts`

**Class:** `AviDM`

**Properties:**
```typescript
class AviDM {
  private instance: ClaudeInstance;          // Anthropic SDK instance
  private contextSize: number = 1500;        // Current context size
  private workQueue: WorkTicket[] = [];      // In-memory queue
  private activeWorkers: Map<string, AgentWorkerHandle> = new Map();
  private startTime: number = Date.now();
  private db: DatabaseManager;
  private healthMonitor: HealthMonitor;
  private isRestarting: boolean = false;
}
```

**Methods:**

```typescript
// Initialize Avi DM
async initialize(): Promise<void>
  - Load state from avi_state table
  - Restore pending tickets
  - Create Claude instance with minimal prompt
  - Start health monitor
  - Begin main loop

// Main orchestration loop (stub in Phase 2)
async mainLoop(): Promise<void>
  - Process work queue
  - Spawn agent workers
  - Update state periodically
  - Handle errors

// Create work ticket (stub returns mock ticket)
async createWorkTicket(post: MockPost): Promise<WorkTicket>
  - Determine agent type (mock logic)
  - Retrieve relevant memories
  - Create ticket object
  - Add to queue
  - Persist to database

// Spawn agent worker
async spawnWorker(ticket: WorkTicket): Promise<void>
  - Check concurrent worker limit
  - Create AgentWorker instance
  - Track in activeWorkers map
  - Execute worker
  - Clean up on completion

// Graceful restart
async gracefulRestart(): Promise<void>
  - Set isRestarting flag
  - Save state snapshot to database
  - Update uptime
  - Destroy old Claude instance
  - Create new instance with minimal context
  - Restore state
  - Clear isRestarting flag

// Check health
async checkHealth(): Promise<boolean>
  - Query instance.isAlive()
  - Check contextSize < limit
  - Return health status

// Update state in database
async updateState(): Promise<void>
  - Update avi_state.last_feed_position
  - Update avi_state.pending_tickets
  - Update avi_state.context_size
```

**Configuration:**
```typescript
interface AviConfig {
  model: string;                    // From env.AVI_MODEL or default
  contextLimit: number;             // From env.AVI_CONTEXT_LIMIT or 50000
  maxWorkers: number;               // From env.MAX_AGENT_WORKERS or 10
  stateUpdateInterval: number;      // Default 10000ms (10s)
}
```

---

### Component 2: Agent Worker

**File:** `src/agents/worker.ts`

**Class:** `AgentWorker`

**Properties:**
```typescript
class AgentWorker {
  private id: string;                        // Unique worker ID
  private ticket: WorkTicket;                // Work ticket
  private context: AgentContext;             // Composed context
  private instance: ClaudeInstance;          // Claude instance
  private db: DatabaseManager;
  private startTime: number = Date.now();
}
```

**Methods:**

```typescript
// Spawn and execute worker
static async spawn(ticket: WorkTicket, db: DatabaseManager): Promise<void>
  - Create worker instance
  - Load context
  - Execute work
  - Save memory
  - Destroy instance

// Load agent context
async loadContext(): Promise<void>
  - Call composeAgentContext(userId, agentType, db)
  - Get model via getModelForAgent(context)
  - Create Claude instance with context

// Execute work (stub in Phase 2)
async execute(): Promise<void>
  - Mock response generation
  - Return mock output
  - Phase 3 will implement real execution

// Save memory to database
async saveMemory(content: string, metadata: MemoryMetadata): Promise<void>
  - Insert into agent_memories table
  - Include user_id, agent_name, post_id, content, metadata

// Destroy worker
async destroy(): Promise<void>
  - Destroy Claude instance
  - Clear references
  - Log completion
```

**Lifecycle:**
```
spawn() → loadContext() → execute() → saveMemory() → destroy()
Total: 30-60 seconds
```

---

### Component 3: Health Monitor

**File:** `src/monitoring/health.ts`

**Class:** `HealthMonitor`

**Properties:**
```typescript
class HealthMonitor {
  private checkInterval: number = 30000;     // 30 seconds
  private db: DatabaseManager;
  private aviInstance: AviDM;
  private isRunning: boolean = false;
  private intervalHandle: NodeJS.Timeout | null = null;
}
```

**Methods:**

```typescript
// Start monitoring
async start(): Promise<void>
  - Set isRunning = true
  - Start interval timer
  - Run health checks on interval

// Stop monitoring
async stop(): Promise<void>
  - Clear interval timer
  - Set isRunning = false

// Run all health checks
async runChecks(): Promise<void>
  - checkAviHealth()
  - checkDatabaseHealth()
  - updateMetrics()
  - Log results

// Check Avi DM health
async checkAviHealth(): Promise<void>
  - Query aviInstance.checkHealth()
  - Check aviInstance.contextSize
  - Trigger graceful restart if needed
  - Update avi_state.last_restart
  - Update avi_state.context_size

// Check database health
async checkDatabaseHealth(): Promise<void>
  - Execute SELECT 1 query
  - Log success/failure
  - Attempt reconnection on failure

// Update metrics
async updateMetrics(): Promise<void>
  - Collect: aviContextSize, activeAgents, queuedTickets, errorRate, uptime
  - Calculate error rate from error_log table
  - Log metrics to console
  - (Phase 5: Send to dashboard)

// Calculate error rate
async calculateErrorRate(): Promise<number>
  - Query error_log for last hour
  - Count unresolved errors
  - Return rate (0-1)
```

---

### Component 4: Work Ticket Queue

**File:** `src/avi/work-queue.ts`

**Class:** `WorkTicketQueue`

**Properties:**
```typescript
class WorkTicketQueue {
  private queue: WorkTicket[] = [];          // In-memory queue
  private db: DatabaseManager;
  private persistInterval: number = 10000;   // 10 seconds
  private intervalHandle: NodeJS.Timeout | null = null;
}
```

**Methods:**

```typescript
// Add ticket to queue
async enqueue(ticket: WorkTicket): Promise<void>
  - Add to queue array
  - Trigger immediate persist if critical priority

// Get next ticket
async dequeue(): Promise<WorkTicket | null>
  - Remove and return first ticket (FIFO)
  - Return null if empty

// Peek at next ticket
async peek(): Promise<WorkTicket | null>
  - Return first ticket without removing
  - Return null if empty

// Get queue size
size(): number
  - Return queue.length

// Persist queue to database
async persist(): Promise<void>
  - Serialize queue to JSON
  - Update avi_state.pending_tickets
  - Log success/failure

// Restore queue from database
async restore(): Promise<void>
  - Query avi_state.pending_tickets
  - Deserialize JSON to WorkTicket[]
  - Set queue array

// Start auto-persist
async startAutoPersist(): Promise<void>
  - Start interval timer (10s)
  - Call persist() on interval

// Stop auto-persist
async stopAutoPersist(): Promise<void>
  - Clear interval timer
```

---

## User Stories & Scenarios

### User Story 1: Zero-Downtime Operation

**As** a user of Avi DM
**I want** the system to always be available
**So that** I never miss important social media interactions

**Scenario 1.1: Normal Operation**

```gherkin
Given Avi DM is running with context size at 30K tokens
When a new post arrives requiring agent response
Then Avi creates a work ticket
And spawns an agent worker
And the worker responds within 60 seconds
And the system remains available throughout
```

**Scenario 1.2: Context Bloat Auto-Restart**

```gherkin
Given Avi DM is running with context size at 51K tokens
When the health monitor checks Avi health
Then the monitor detects context > 50K tokens
And initiates graceful restart
And saves pending tickets to database
And creates new Avi instance with 1.5K token context
And restores pending tickets
And resumes operation
And the restart completes in < 5 seconds
And no work tickets are lost
```

**Scenario 1.3: Database Connection Lost**

```gherkin
Given Avi DM is running normally
When the PostgreSQL database becomes unavailable
Then the health monitor detects database failure
And Avi enters degraded mode (continues with in-memory queue)
And attempts reconnection every 30 seconds
When the database becomes available again
Then Avi reconnects automatically
And persists pending tickets
And exits degraded mode
And resumes normal operation
```

---

### User Story 2: Agent Worker Execution

**As** an agent worker
**I want** to load my identity and memories from the database
**So that** I can respond appropriately to posts

**Scenario 2.1: Successful Worker Lifecycle**

```gherkin
Given a work ticket exists for agent "tech-guru" and user "user123"
When Avi spawns the agent worker
Then the worker calls composeAgentContext("user123", "tech-guru", db)
And loads system template from system_agent_templates table
And loads user customization from user_agent_customizations table (if exists)
And validates no protected fields are overridden
And retrieves 5 most recent memories from agent_memories table
And creates Claude instance with composed context
And executes work ticket (mock response in Phase 2)
And saves new memory to agent_memories table
And destroys Claude instance
And completes lifecycle in < 60 seconds
```

**Scenario 2.2: User Attempts Protected Field Override**

```gherkin
Given a user customization exists with posting_rules override attempt
When the worker calls composeAgentContext()
And validateCustomizations() is executed
Then a SecurityError is thrown
And the error is logged to error_log table
And the work ticket is escalated to user
And no post is made
```

**Scenario 2.3: System Template Not Found**

```gherkin
Given a work ticket specifies agent "nonexistent-agent"
When the worker calls composeAgentContext()
And system template lookup fails
Then an Error is thrown: "System template not found: nonexistent-agent"
And the error is logged to error_log table
And the work ticket is marked as failed
And retried with alternate agent
```

---

### User Story 3: Health Monitoring

**As** Avi DM
**I want** continuous health monitoring
**So that** I can auto-recover from failures and prevent context bloat

**Scenario 3.1: Health Check Success**

```gherkin
Given the health monitor is running
When 30 seconds elapse
Then the monitor checks Avi health (isAlive = true, contextSize = 35K)
And checks database health (SELECT 1 succeeds)
And calculates error rate (2% from error_log)
And updates metrics in avi_state table
And logs metrics to console
And all checks pass
```

**Scenario 3.2: Context Limit Exceeded**

```gherkin
Given Avi context size is 52K tokens
When the health monitor checks Avi health
Then contextSize > 50K is detected
And graceful restart is triggered
And avi_state.uptime_seconds is updated (current uptime added)
And avi_state.last_restart is set to NOW()
And Avi restarts with fresh 1.5K token context
And avi_state.context_size is reset to 1500
```

**Scenario 3.3: Database Reconnection**

```gherkin
Given the database health check fails
When the monitor attempts reconnection
Then exponential backoff is applied (5s, 30s, 120s)
And reconnection is retried up to 3 times
When reconnection succeeds
Then health checks resume normally
And database operations resume
```

---

## Acceptance Criteria

### AC-1: Avi DM Orchestrator

#### AC-1.1: Initialization
- [ ] Avi initializes with < 2K token context (measured via Claude API)
- [ ] State is loaded from `avi_state` table on startup
- [ ] Pending tickets are restored from database
- [ ] PostgreSQL connection is established before starting
- [ ] Error is thrown if database schema missing

#### AC-1.2: Work Ticket Management
- [ ] Work tickets are created with all required fields
- [ ] Tickets are queued in memory for fast access
- [ ] Tickets persist to database every 10 seconds
- [ ] Relevant memories are retrieved (max 5) and included
- [ ] Ticket creation completes in < 500ms

#### AC-1.3: Agent Spawning
- [ ] Workers spawn on-demand for queued tickets
- [ ] Maximum 10 concurrent workers enforced
- [ ] Work ticket is passed to worker
- [ ] Active workers are tracked in memory
- [ ] Worker references cleaned up after completion

#### AC-1.4: Graceful Restart
- [ ] Restart triggered when context > 50K tokens
- [ ] Pending tickets saved to database before restart
- [ ] Old Claude instance destroyed cleanly
- [ ] New instance created with < 2K token context
- [ ] Pending tickets restored after restart
- [ ] Restart completes in < 5 seconds
- [ ] No work tickets lost during restart

#### AC-1.5: Error Handling
- [ ] Errors logged to `error_log` table with context
- [ ] Exponential backoff implemented (5s, 30s, 120s)
- [ ] User escalation after 3 failed attempts
- [ ] Avi continues operation despite ticket failures

---

### AC-2: Agent Workers

#### AC-2.1: Lifecycle
- [ ] Worker spawns via `spawnAgentWorker(ticket)` function
- [ ] Context loaded via `composeAgentContext()` from Phase 1
- [ ] Work ticket executed (mock in Phase 2)
- [ ] Memory saved to `agent_memories` table
- [ ] Claude instance destroyed after completion
- [ ] Total lifecycle completes in 30-60 seconds

#### AC-2.2: Context Composition
- [ ] System template loaded from `system_agent_templates`
- [ ] User customization loaded from `user_agent_customizations`
- [ ] Protected fields validated via `validateCustomizations()`
- [ ] `SecurityError` thrown if user overrides protected fields
- [ ] `Error` thrown if system template not found
- [ ] Composed `AgentContext` returned with all fields

#### AC-2.3: Memory Management
- [ ] Memories retrieved via SQL query (max 5 recent)
- [ ] Memories filtered by `user_id`, `agent_name`
- [ ] GIN index used for metadata topic matching
- [ ] New memory inserted after execution
- [ ] Memory includes: `user_id`, `agent_name`, `post_id`, `content`, `metadata`

#### AC-2.4: Model Selection
- [ ] Model selected via `getModelForAgent(agentContext)`
- [ ] Priority respected: `template.model → env.AGENT_MODEL → default`
- [ ] Different agents can use different models
- [ ] Default model is `claude-sonnet-4-5-20250929`

---

### AC-3: Health Monitor

#### AC-3.1: Monitoring Loop
- [ ] Health checks run every 30 seconds
- [ ] Avi health checked
- [ ] Database health checked
- [ ] Metrics updated in `avi_state` table
- [ ] Monitoring continues despite individual check failures

#### AC-3.2: Avi Health Check
- [ ] Context size queried from Avi instance
- [ ] Graceful restart triggered at > 50K tokens
- [ ] `avi_state.uptime_seconds` updated before restart
- [ ] `avi_state.last_restart` recorded
- [ ] `avi_state.context_size` reset to 1500 after restart

#### AC-3.3: Database Health Check
- [ ] `SELECT 1` query executed
- [ ] Reconnection attempted on failure
- [ ] Exponential backoff applied (5s, 30s, 120s)
- [ ] Errors logged to `error_log` table
- [ ] Degraded mode entered after 5 minutes downtime

#### AC-3.4: Metrics Collection
- [ ] Metrics tracked: `aviContextSize`, `activeAgents`, `queuedTickets`, `errorRate`, `uptime`
- [ ] Error rate calculated from last hour of `error_log`
- [ ] Metrics logged to console
- [ ] Metrics collection completes in < 100ms

---

### AC-4: Integration with Phase 1 Database

#### AC-4.1: Database Connectivity
- [ ] Connection pool from Phase 1 used (`src/database/connection.ts`)
- [ ] All queries use existing query modules (`src/database/queries/`)
- [ ] Transactions use Phase 1 helpers
- [ ] No new database code written (reuse Phase 1)

#### AC-4.2: Data Tier Compliance
- [ ] TIER 1 data (system templates) never modified at runtime
- [ ] TIER 2 data (user customizations) validated before use
- [ ] TIER 3 data (memories, workspaces) created/read only
- [ ] No data deleted during Phase 2 operations

#### AC-4.3: Type Safety
- [ ] All database operations use Phase 1 types
- [ ] `WorkTicket` type from Phase 1 used
- [ ] `AgentContext` type from Phase 1 used
- [ ] `AviState` type from Phase 1 used

---

## Edge Cases & Constraints

### Edge Case 1: Concurrent Worker Limit Reached

**Scenario:**
```
Given 10 workers are currently active
When Avi tries to spawn an 11th worker
Then the new work ticket is queued
And Avi waits for a worker to complete
And spawns the queued worker when capacity is available
```

**Handling:**
```typescript
async spawnWorker(ticket: WorkTicket): Promise<void> {
  // Wait if at capacity
  while (this.activeWorkers.size >= this.config.maxWorkers) {
    await sleep(1000); // Check every second
  }

  // Spawn worker
  const worker = await AgentWorker.spawn(ticket, this.db);
  this.activeWorkers.set(ticket.id, worker);
}
```

---

### Edge Case 2: Graceful Restart During Active Workers

**Scenario:**
```
Given Avi has 5 active workers executing
When context limit is exceeded and restart is triggered
Then Avi waits for active workers to complete
And saves state only after all workers finish
And then destroys old instance and creates new one
```

**Handling:**
```typescript
async gracefulRestart(): Promise<void> {
  this.isRestarting = true;

  // Wait for active workers to complete (max 60s)
  const timeout = Date.now() + 60000;
  while (this.activeWorkers.size > 0 && Date.now() < timeout) {
    await sleep(1000);
  }

  // Force kill remaining workers if timeout
  if (this.activeWorkers.size > 0) {
    await this.forceKillWorkers();
  }

  // Continue restart...
}
```

---

### Edge Case 3: Database Unavailable During Startup

**Scenario:**
```
Given PostgreSQL is down
When Avi DM tries to initialize
Then initialization fails with clear error message
And Avi retries connection every 30 seconds
And logs connection attempts to console
When database becomes available
Then Avi initializes successfully
```

**Handling:**
```typescript
async initialize(): Promise<void> {
  let connected = false;
  let attempts = 0;

  while (!connected && attempts < 10) {
    try {
      await this.db.healthCheck();
      connected = true;
    } catch (error) {
      attempts++;
      console.error(`Database connection failed (attempt ${attempts}/10):`, error);
      await sleep(30000); // Wait 30s
    }
  }

  if (!connected) {
    throw new Error('Failed to connect to database after 10 attempts');
  }

  // Continue initialization...
}
```

---

### Edge Case 4: Memory Retrieval Returns No Results

**Scenario:**
```
Given a new user has no memories in agent_memories table
When an agent worker retrieves memories
Then an empty array is returned
And the worker executes with no memory context
And creates the first memory after execution
```

**Handling:**
```typescript
async retrieveMemories(userId: string, agentName: string): Promise<AgentMemory[]> {
  const memories = await db.query(
    `SELECT * FROM agent_memories
     WHERE user_id = $1 AND agent_name = $2
     ORDER BY created_at DESC LIMIT 5`,
    [userId, agentName]
  );

  // Return empty array if no results (not an error)
  return memories.rows || [];
}
```

---

### Edge Case 5: Context Composition Fails Mid-Worker

**Scenario:**
```
Given a worker is spawning
When composeAgentContext() throws SecurityError
Then the worker catches the error
And logs to error_log table
And marks ticket as failed
And notifies Avi for escalation
And destroys worker cleanly
```

**Handling:**
```typescript
static async spawn(ticket: WorkTicket, db: DatabaseManager): Promise<void> {
  try {
    const context = await composeAgentContext(ticket.userId, ticket.assignedAgent, db);
    // Continue execution...
  } catch (error) {
    if (error instanceof SecurityError) {
      await logError(db, {
        agent_name: ticket.assignedAgent,
        error_type: 'security_error',
        error_message: error.message,
        context: { ticket_id: ticket.id }
      });

      await escalateToUser(ticket, error.message);
      return; // Exit cleanly
    }
    throw error; // Re-throw unexpected errors
  }
}
```

---

### Constraints

#### Technical Constraints

**CONSTRAINT-1:** Must use Phase 1 database schemas (no modifications)
**CONSTRAINT-2:** Must use Phase 1 query modules (no new database code)
**CONSTRAINT-3:** Must use Phase 1 type definitions
**CONSTRAINT-4:** Avi DM context must stay under 50K tokens (hard limit)
**CONSTRAINT-5:** Maximum 10 concurrent workers (configurable)
**CONSTRAINT-6:** Worker lifecycle must complete in < 60 seconds
**CONSTRAINT-7:** Database queries must use connection pool (no raw connections)

#### Business Constraints

**CONSTRAINT-8:** Zero data loss during Avi restarts
**CONSTRAINT-9:** No downtime > 100ms during restarts
**CONSTRAINT-10:** All user data protected (TIER 3 immutable)
**CONSTRAINT-11:** System templates immutable at runtime (TIER 1)

#### Environmental Constraints

**CONSTRAINT-12:** PostgreSQL 16+ required
**CONSTRAINT-13:** Node.js 20+ required
**CONSTRAINT-14:** TypeScript 5.3+ required
**CONSTRAINT-15:** Anthropic API key required
**CONSTRAINT-16:** Minimum 2GB RAM for Docker container

---

## Data Flow Specifications

### Flow 1: Avi DM Initialization

```mermaid
sequenceDiagram
    participant Main as Main Process
    participant Avi as Avi DM
    participant DB as PostgreSQL
    participant Health as Health Monitor

    Main->>Avi: initialize()
    Avi->>DB: healthCheck()
    DB-->>Avi: OK
    Avi->>DB: SELECT * FROM avi_state WHERE id=1
    DB-->>Avi: {last_feed_position, pending_tickets, ...}
    Avi->>Avi: Restore state
    Avi->>Avi: Create Claude instance (1.5K tokens)
    Avi->>Health: start()
    Health-->>Avi: Monitoring started
    Avi-->>Main: Initialized
    Avi->>Avi: Start main loop
```

---

### Flow 2: Agent Worker Lifecycle

```mermaid
sequenceDiagram
    participant Avi as Avi DM
    participant Worker as Agent Worker
    participant Composer as Context Composer
    participant DB as PostgreSQL
    participant Claude as Claude API

    Avi->>Worker: spawn(ticket)
    Worker->>Composer: composeAgentContext(userId, agentType, db)
    Composer->>DB: SELECT * FROM system_agent_templates WHERE name=?
    DB-->>Composer: SystemTemplate
    Composer->>DB: SELECT * FROM user_agent_customizations WHERE user_id=? AND agent_template=?
    DB-->>Composer: UserCustomization (or null)
    Composer->>Composer: validateCustomizations()
    Composer-->>Worker: AgentContext
    Worker->>DB: SELECT * FROM agent_memories WHERE user_id=? AND agent_name=? LIMIT 5
    DB-->>Worker: [Memory, Memory, ...]
    Worker->>Claude: Create instance with context
    Claude-->>Worker: Instance created
    Worker->>Worker: execute() [mock in Phase 2]
    Worker->>DB: INSERT INTO agent_memories (...)
    DB-->>Worker: Memory saved
    Worker->>Claude: Destroy instance
    Worker-->>Avi: Completed
    Avi->>Avi: Remove from activeWorkers
```

---

### Flow 3: Graceful Restart

```mermaid
sequenceDiagram
    participant Health as Health Monitor
    participant Avi as Avi DM
    participant DB as PostgreSQL
    participant Claude as Claude API

    Health->>Avi: checkHealth()
    Avi-->>Health: contextSize = 51K
    Health->>Health: contextSize > 50K detected
    Health->>Avi: gracefulRestart()
    Avi->>Avi: Set isRestarting = true
    Avi->>Avi: Wait for active workers to complete
    Avi->>DB: UPDATE avi_state SET uptime_seconds = uptime_seconds + ?
    DB-->>Avi: Updated
    Avi->>DB: UPDATE avi_state SET pending_tickets = ?
    DB-->>Avi: Saved
    Avi->>Claude: Destroy old instance
    Claude-->>Avi: Destroyed
    Avi->>Claude: Create new instance (1.5K tokens)
    Claude-->>Avi: Created
    Avi->>DB: SELECT * FROM avi_state WHERE id=1
    DB-->>Avi: {pending_tickets, ...}
    Avi->>Avi: Restore pending tickets
    Avi->>DB: UPDATE avi_state SET last_restart = NOW(), context_size = 1500
    DB-->>Avi: Updated
    Avi->>Avi: Set isRestarting = false
    Avi-->>Health: Restarted
```

---

### Flow 4: Work Ticket Processing

```mermaid
sequenceDiagram
    participant Avi as Avi DM
    participant Queue as Work Queue
    participant DB as PostgreSQL
    participant Worker as Agent Worker

    Avi->>Avi: createWorkTicket(mockPost)
    Avi->>DB: SELECT * FROM agent_memories WHERE ... LIMIT 5
    DB-->>Avi: [Memory, Memory, ...]
    Avi->>Avi: Create WorkTicket object
    Avi->>Queue: enqueue(ticket)
    Queue-->>Avi: Queued
    Queue->>DB: UPDATE avi_state SET pending_tickets = ? (async)
    Avi->>Avi: Check concurrent worker limit
    Avi->>Worker: spawn(ticket)
    Worker->>Worker: Execute lifecycle
    Worker-->>Avi: Completed
    Avi->>Queue: dequeue()
    Queue-->>Avi: Next ticket (or null)
```

---

## API Specifications

### Internal API: Avi DM

#### `AviDM.initialize(): Promise<void>`

**Description:** Initialize Avi DM orchestrator

**Preconditions:**
- PostgreSQL database running
- `avi_state` table exists
- Environment variables configured

**Postconditions:**
- Avi instance created with < 2K token context
- State loaded from database
- Health monitor started
- Main loop running

**Errors:**
- `Error`: Database connection failed
- `Error`: Schema validation failed

---

#### `AviDM.createWorkTicket(post: MockPost): Promise<WorkTicket>`

**Description:** Create work ticket for agent worker

**Parameters:**
- `post`: Mock post object (Phase 2 stub)

**Returns:** `WorkTicket` object

**Implementation (Phase 2):**
```typescript
async createWorkTicket(post: MockPost): Promise<WorkTicket> {
  // Mock: Determine agent type (random selection in Phase 2)
  const agentType = ['tech-guru', 'creative-writer', 'data-analyst'][Math.floor(Math.random() * 3)];

  // Retrieve relevant memories (real database query)
  const memories = await this.db.query(
    `SELECT content, metadata FROM agent_memories
     WHERE user_id = $1 AND agent_name = $2
     ORDER BY created_at DESC LIMIT 5`,
    [post.userId, agentType]
  );

  // Create ticket
  const ticket: WorkTicket = {
    id: generateId(),
    postId: post.id,
    postContent: post.text,
    postAuthor: post.author,
    assignedAgent: agentType,
    relevantMemories: memories.rows,
    createdAt: Date.now()
  };

  // Queue ticket
  await this.workQueue.enqueue(ticket);

  return ticket;
}
```

---

#### `AviDM.spawnWorker(ticket: WorkTicket): Promise<void>`

**Description:** Spawn agent worker to process work ticket

**Parameters:**
- `ticket`: Work ticket to process

**Preconditions:**
- `activeWorkers.size < maxWorkers`
- Database connection available

**Postconditions:**
- Worker spawned and tracked
- Worker executing in background
- Worker reference added to `activeWorkers` map

**Errors:**
- `Error`: Worker spawn failed
- `Error`: Database unavailable

---

#### `AviDM.gracefulRestart(): Promise<void>`

**Description:** Perform graceful restart with state preservation

**Preconditions:**
- Avi instance exists
- Database connection available

**Postconditions:**
- Old instance destroyed
- New instance created with fresh context
- Pending tickets restored
- State saved to database

**Duration:** < 5 seconds

**Errors:**
- `Error`: State save failed
- `Error`: Instance creation failed

---

### Internal API: Agent Worker

#### `AgentWorker.spawn(ticket: WorkTicket, db: DatabaseManager): Promise<void>`

**Description:** Spawn ephemeral agent worker

**Parameters:**
- `ticket`: Work ticket to process
- `db`: Database manager instance

**Lifecycle:**
1. Load context via `composeAgentContext()`
2. Retrieve memories from database
3. Create Claude instance
4. Execute work (mock in Phase 2)
5. Save memory to database
6. Destroy instance

**Duration:** 30-60 seconds

**Errors:**
- `SecurityError`: User override detected
- `Error`: System template not found
- `Error`: Database query failed

---

### Internal API: Context Composer

#### `composeAgentContext(userId: string, agentType: string, db: DatabaseManager): Promise<AgentContext>`

**Description:** Compose agent context from system template + user customizations (Phase 1 function)

**Parameters:**
- `userId`: User ID
- `agentType`: Agent template name
- `db`: Database manager instance

**Returns:** `AgentContext` object with merged configuration

**Errors:**
- `Error`: System template not found
- `SecurityError`: User override detected
- `ValidationError`: Invalid customization

---

### Internal API: Health Monitor

#### `HealthMonitor.start(): Promise<void>`

**Description:** Start health monitoring loop

**Postconditions:**
- Health checks running every 30 seconds
- Metrics updated in `avi_state` table

---

#### `HealthMonitor.checkAviHealth(): Promise<void>`

**Description:** Check Avi DM health and trigger restart if needed

**Checks:**
- `instance.isAlive()`
- `contextSize < limit`

**Actions:**
- Trigger graceful restart if context > 50K
- Update `avi_state.last_restart`
- Update `avi_state.context_size`

---

## Performance Requirements

### PR-1: Response Time

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Work ticket creation | < 500ms | 95th percentile |
| Agent worker spawn | < 2s | 95th percentile |
| Context composition | < 200ms | 95th percentile |
| Memory retrieval | < 100ms | 95th percentile |
| Graceful restart | < 5s | Maximum |
| Health check | < 100ms | 95th percentile |

---

### PR-2: Token Usage

| Component | Target | Measurement |
|-----------|--------|-------------|
| Avi DM base context | 1,500 tokens | Initial |
| Avi DM max context | 50,000 tokens | Hard limit |
| Agent worker context | ~2,700 tokens | Per spawn |
| Daily Avi usage | ~53,000 tokens | 24 hours |
| Daily agent usage (3 agents) | ~480,000 tokens | 24 hours |

---

### PR-3: Concurrency

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Max concurrent workers | 10 | Enforced in code |
| Max queued tickets | 100 | Warning threshold |
| Database connection pool | 20 connections | Phase 1 config |

---

### PR-4: Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avi uptime | 99.9% | Per month |
| Restart success rate | 100% | No data loss |
| Worker success rate | > 95% | First attempt |
| Database query success | > 99% | Excluding downtime |

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/avi/orchestrator.test.ts`

**Coverage:**
- [ ] `AviDM.initialize()` loads state from database
- [ ] `AviDM.createWorkTicket()` creates valid ticket
- [ ] `AviDM.spawnWorker()` enforces concurrent limit
- [ ] `AviDM.gracefulRestart()` saves/restores state
- [ ] `AviDM.checkHealth()` returns correct status

**Mocking:**
- Mock PostgreSQL connection (return fake data)
- Mock Claude API (return fake instance)
- Mock work queue persistence

---

**File:** `tests/unit/agents/worker.test.ts`

**Coverage:**
- [ ] `AgentWorker.spawn()` loads context correctly
- [ ] `AgentWorker.loadContext()` uses `composeAgentContext()`
- [ ] `AgentWorker.execute()` returns mock output
- [ ] `AgentWorker.saveMemory()` inserts to database
- [ ] `AgentWorker.destroy()` cleans up instance

**Mocking:**
- Mock database queries (return fake context)
- Mock Claude API (return fake instance)

---

**File:** `tests/unit/monitoring/health.test.ts`

**Coverage:**
- [ ] `HealthMonitor.start()` starts interval timer
- [ ] `HealthMonitor.checkAviHealth()` detects context bloat
- [ ] `HealthMonitor.checkDatabaseHealth()` detects failures
- [ ] `HealthMonitor.calculateErrorRate()` queries error_log
- [ ] `HealthMonitor.updateMetrics()` logs metrics

**Mocking:**
- Mock Avi instance (return fake context size)
- Mock database queries (return fake metrics)

---

### Integration Tests

**File:** `tests/integration/phase2/orchestrator-workflow.test.ts`

**Coverage:**
- [ ] Full Avi DM initialization with real database
- [ ] Work ticket creation → agent spawn → memory save
- [ ] Graceful restart preserves pending tickets
- [ ] Health monitor triggers restart at context limit
- [ ] Multiple workers process tickets concurrently

**Database:**
- Use real PostgreSQL test database
- Seed with Phase 1 schema and data
- Clean up after each test

---

**File:** `tests/integration/phase2/context-composition.test.ts`

**Coverage:**
- [ ] Context composition with real database
- [ ] System template + user customization merge
- [ ] Protected field validation enforcement
- [ ] Memory retrieval with GIN index
- [ ] Model selection priority

**Database:**
- Real PostgreSQL with Phase 1 tables
- Seed system templates
- Create user customizations
- Verify no data corruption

---

### End-to-End Tests

**File:** `tests/e2e/phase2/full-lifecycle.test.ts`

**Scenario:**
```
1. Start Avi DM
2. Create 5 work tickets
3. Spawn workers for each
4. Verify memories saved
5. Trigger graceful restart
6. Verify tickets restored
7. Continue processing
8. Verify zero data loss
```

**Duration:** ~2 minutes

**Success Criteria:**
- All tickets processed
- All memories saved to database
- Restart completes in < 5 seconds
- No errors logged

---

### Performance Tests

**File:** `tests/performance/phase2/load-test.ts`

**Scenario:**
```
1. Create 100 work tickets
2. Process with 10 concurrent workers
3. Measure throughput (tickets/minute)
4. Measure average latency
5. Measure database query times
6. Verify no memory leaks
```

**Targets:**
- Throughput: > 60 tickets/minute
- Latency: < 60s per ticket (95th percentile)
- Database queries: < 100ms (95th percentile)
- Memory usage: Stable (no leaks)

---

## Implementation Checklist

### Week 1: Core Orchestrator

**Day 1-2: Project Setup**
- [ ] Create `src/avi/` directory
- [ ] Create `src/agents/` directory
- [ ] Create `src/monitoring/` directory
- [ ] Install Anthropic SDK: `npm install @anthropic-ai/sdk`
- [ ] Create environment variables: `AVI_MODEL`, `AGENT_MODEL`, `AVI_CONTEXT_LIMIT`, `MAX_AGENT_WORKERS`
- [ ] Create TypeScript types for Avi components

**Day 2-3: Avi DM Orchestrator**
- [ ] Implement `AviDM` class (`src/avi/orchestrator.ts`)
- [ ] Implement `initialize()` method
- [ ] Implement `createWorkTicket()` stub
- [ ] Implement `spawnWorker()` method
- [ ] Implement `gracefulRestart()` method
- [ ] Implement `checkHealth()` method
- [ ] Write unit tests for `AviDM`

**Day 3-4: Work Queue**
- [ ] Implement `WorkTicketQueue` class (`src/avi/work-queue.ts`)
- [ ] Implement `enqueue()` / `dequeue()` methods
- [ ] Implement `persist()` / `restore()` methods
- [ ] Implement auto-persist interval
- [ ] Write unit tests for `WorkTicketQueue`

**Day 4-5: Agent Worker**
- [ ] Implement `AgentWorker` class (`src/agents/worker.ts`)
- [ ] Implement `spawn()` static method
- [ ] Implement `loadContext()` method (uses Phase 1 `composeAgentContext()`)
- [ ] Implement `execute()` stub (mock response)
- [ ] Implement `saveMemory()` method
- [ ] Implement `destroy()` method
- [ ] Write unit tests for `AgentWorker`

**Day 5-6: Health Monitor**
- [ ] Implement `HealthMonitor` class (`src/monitoring/health.ts`)
- [ ] Implement `start()` / `stop()` methods
- [ ] Implement `checkAviHealth()` method
- [ ] Implement `checkDatabaseHealth()` method
- [ ] Implement `updateMetrics()` method
- [ ] Implement `calculateErrorRate()` method
- [ ] Write unit tests for `HealthMonitor`

**Day 6-7: Integration & Testing**
- [ ] Write integration test: Avi initialization
- [ ] Write integration test: Worker lifecycle
- [ ] Write integration test: Graceful restart
- [ ] Write integration test: Health monitoring
- [ ] Write E2E test: Full system workflow
- [ ] Run all tests with real database
- [ ] Verify 80%+ code coverage

---

### Week 2: Refinement & Documentation

**Day 1-2: Error Handling**
- [ ] Implement retry logic with exponential backoff
- [ ] Implement error logging to `error_log` table
- [ ] Implement user escalation mechanism (stub)
- [ ] Add error handling tests

**Day 2-3: Performance Optimization**
- [ ] Optimize context composition queries
- [ ] Add query result caching (in-memory)
- [ ] Optimize memory retrieval queries
- [ ] Run performance tests
- [ ] Verify performance targets met

**Day 3-4: Documentation**
- [ ] Write API documentation for Avi DM
- [ ] Write API documentation for Agent Worker
- [ ] Write usage examples
- [ ] Update architecture diagrams
- [ ] Create Phase 2 developer guide

**Day 4-5: Docker & Deployment**
- [ ] Update `docker-compose.yml` for Phase 2
- [ ] Add health check endpoint
- [ ] Test in Docker environment
- [ ] Verify volume persistence
- [ ] Test graceful restart in Docker

**Day 5: Code Review & Cleanup**
- [ ] Code review for all Phase 2 components
- [ ] Refactor based on feedback
- [ ] Add inline documentation
- [ ] Verify no linting errors
- [ ] Final test run

---

## Validation Checklist

Before marking Phase 2 complete, verify:

### Functional Validation
- [ ] Avi DM initializes with < 2K token context
- [ ] Work tickets created and queued correctly
- [ ] Agent workers spawn and execute lifecycle
- [ ] Context composition uses Phase 1 database
- [ ] Memories saved to `agent_memories` table
- [ ] Graceful restart preserves pending tickets
- [ ] Health monitoring triggers auto-restart
- [ ] All errors logged to `error_log` table

### Performance Validation
- [ ] Work ticket creation < 500ms
- [ ] Agent spawn < 2s
- [ ] Context composition < 200ms
- [ ] Memory retrieval < 100ms
- [ ] Graceful restart < 5s
- [ ] Health check < 100ms

### Integration Validation
- [ ] Phase 1 database schemas used (no modifications)
- [ ] Phase 1 query modules used (no new database code)
- [ ] Phase 1 types used throughout
- [ ] No circular dependencies
- [ ] All imports correct

### Testing Validation
- [ ] All unit tests passing (80%+ coverage)
- [ ] All integration tests passing
- [ ] E2E test passing
- [ ] Performance tests passing
- [ ] No test failures in CI/CD

### Documentation Validation
- [ ] API documentation complete
- [ ] Architecture diagrams updated
- [ ] Developer guide written
- [ ] Code comments adequate
- [ ] README updated

---

## Dependencies

### Phase 1 (Required - COMPLETE)
- ✅ PostgreSQL database with 6 tables
- ✅ Database connection pool
- ✅ Query modules (system templates, user customizations, memories)
- ✅ Context composer (`composeAgentContext()`)
- ✅ Validation utilities (`validateCustomizations()`)
- ✅ Type definitions (all 6 tables + domain types)

### External Dependencies
- `@anthropic-ai/sdk`: Claude API SDK
- `dotenv`: Environment variable management
- `winston`: Structured logging (Phase 1)
- `pg`: PostgreSQL client (Phase 1)

---

## Risk Analysis

### Risk 1: Context Size Measurement
**Risk:** Unable to accurately measure Claude instance context size
**Likelihood:** Medium
**Impact:** High (cannot trigger graceful restart correctly)
**Mitigation:**
- Use Anthropic API's token counting endpoint
- Track message history length as proxy
- Test with real API calls
- Add manual override for testing

### Risk 2: Database Connection Pool Exhaustion
**Risk:** 10 concurrent workers exhaust connection pool
**Likelihood:** Low
**Impact:** Medium (workers fail to spawn)
**Mitigation:**
- Phase 1 pool configured for 20 connections
- Workers share connections (not dedicated)
- Connection released after query
- Monitor pool usage in metrics

### Risk 3: Graceful Restart Timeout
**Risk:** Active workers don't complete within timeout
**Likelihood:** Low
**Impact:** Medium (data loss if workers killed)
**Mitigation:**
- 60-second timeout for worker completion
- Force kill remaining workers after timeout
- Log incomplete workers to `error_log`
- Mark tickets for retry

### Risk 4: Phase 1 Integration Issues
**Risk:** Phase 1 database code has bugs
**Likelihood:** Low
**Impact:** High (blocks Phase 2 development)
**Mitigation:**
- Verify Phase 1 tests passing before starting
- Create Phase 1 integration tests
- Fix Phase 1 issues immediately
- Maintain Phase 1 test suite

---

## Success Criteria Summary

Phase 2 is considered **COMPLETE** when:

1. ✅ **All functional requirements implemented** (FR-1 through FR-3)
2. ✅ **All acceptance criteria met** (AC-1 through AC-4)
3. ✅ **All tests passing** (unit, integration, E2E, performance)
4. ✅ **Performance targets achieved** (response times, token usage)
5. ✅ **Integration with Phase 1 verified** (real database, no mocks)
6. ✅ **Documentation complete** (API docs, developer guide)
7. ✅ **Docker deployment working** (health checks, volume persistence)
8. ✅ **Code reviewed and approved** (no critical issues)

---

## Next Steps

### After Phase 2 Completion

**Phase 3: Validation & Error Handling**
- Implement lightweight post validation
- Build retry logic with exponential backoff
- Create error escalation system
- Add user notification mechanism

**Phase 4: Feed Monitoring Integration**
- Implement feed API integration (platform-specific)
- Build feed polling loop
- Add post filtering logic
- Integrate with work ticket creation

**Phase 5: Production Deployment**
- Production Docker setup
- Automated backups
- Monitoring integration (Prometheus, Grafana)
- Load testing at scale

---

## Appendix

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Claude Models
AGENT_MODEL=claude-sonnet-4-5-20250929  # Default for agents
AVI_MODEL=claude-sonnet-4-5-20250929    # Default for Avi

# Configuration
AVI_CONTEXT_LIMIT=50000                 # Trigger restart at 50K tokens
MAX_AGENT_WORKERS=10                    # Max concurrent workers
HEALTH_CHECK_INTERVAL=30000             # 30 seconds
QUEUE_PERSIST_INTERVAL=10000            # 10 seconds

# Optional
NODE_ENV=production
LOG_LEVEL=info
```

---

### File Structure (Phase 2)

```
/workspaces/agent-feed/
├── src/
│   ├── avi/
│   │   ├── orchestrator.ts        # AviDM class
│   │   └── work-queue.ts          # WorkTicketQueue class
│   ├── agents/
│   │   └── worker.ts              # AgentWorker class
│   ├── monitoring/
│   │   └── health.ts              # HealthMonitor class
│   ├── database/                  # Phase 1 (reuse)
│   │   ├── connection.ts
│   │   ├── queries/
│   │   └── context-composer.ts
│   └── types/                     # Phase 1 (reuse)
│       ├── database.ts
│       └── agent-context.ts
├── tests/
│   ├── unit/
│   │   ├── avi/
│   │   ├── agents/
│   │   └── monitoring/
│   ├── integration/
│   │   └── phase2/
│   ├── e2e/
│   │   └── phase2/
│   └── performance/
│       └── phase2/
└── PHASE-2-SPECIFICATION.md       # This document
```

---

## Document Changelog

### v1.0 (2025-10-10)
- Initial specification created
- All requirements extracted from architecture plan
- Functional requirements defined
- Component specifications detailed
- User stories and scenarios written
- Acceptance criteria established
- Edge cases and constraints documented
- Data flows specified
- Testing strategy created
- Implementation checklist created

---

## Related Documents

- **Architecture Plan:** `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- **Phase 1 Summary:** `/workspaces/agent-feed/PHASE-1-IMPLEMENTATION-SUMMARY.md`
- **Phase 1 File Structure:** `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
- **Database Schema:** `/workspaces/agent-feed/src/database/schema/001_initial_schema.sql`
- **Context Composer:** `/workspaces/agent-feed/src/database/context-composer.ts`

---

**Status:** ✅ Specification Complete - Ready for Implementation
**Last Updated:** 2025-10-10
**Version:** 1.0
**Phase:** Phase 2 - Orchestrator & Workers
