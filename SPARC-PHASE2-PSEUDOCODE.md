# SPARC Phase 2: Pseudocode Design
## AVI Orchestrator Core Implementation

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Pseudocode Phase Complete
**Phase:** 2 of 5 (Pseudocode)

---

## Executive Summary

This document provides algorithmic designs and logical flows for the AVI Phase 2 Orchestrator Core. Each component is broken down into detailed pseudocode with data structures, algorithm complexity analysis, and control flow diagrams.

---

## Table of Contents

1. [Main Orchestrator Algorithm](#1-main-orchestrator-algorithm)
2. [Feed Monitoring Loop](#2-feed-monitoring-loop)
3. [Context Management](#3-context-management)
4. [Worker Spawning](#4-worker-spawning)
5. [Graceful Restart Sequence](#5-graceful-restart-sequence)
6. [Health Monitoring](#6-health-monitoring)
7. [Error Recovery](#7-error-recovery)
8. [Data Structures](#8-data-structures)
9. [Complexity Analysis](#9-complexity-analysis)

---

## 1. Main Orchestrator Algorithm

### 1.1 Orchestrator Lifecycle

```pseudocode
CLASS AviOrchestrator:
    PROPERTIES:
        config: AviConfig
        state: AviState
        running: Boolean = false
        shuttingDown: Boolean = false
        intervalHandle: Timer
        stateUpdateInterval: Timer

        workQueue: IWorkQueue
        healthMonitor: IHealthMonitor
        workerSpawner: IWorkerSpawner
        database: IAviDatabase

    CONSTRUCTOR(config, workQueue, healthMonitor, workerSpawner, database):
        this.config = mergeWithDefaults(config)
        this.workQueue = workQueue
        this.healthMonitor = healthMonitor
        this.workerSpawner = workerSpawner
        this.database = database

        this.state = {
            status: 'initializing',
            startTime: NOW(),
            ticketsProcessed: 0,
            workersSpawned: 0,
            activeWorkers: 0,
            contextSize: 1500  // Base context
        }

    METHOD start():
        IF running THEN:
            RETURN  // Already running

        TRY:
            // Load previous state if exists
            previousState = AWAIT database.loadState()
            IF previousState EXISTS:
                state.ticketsProcessed = previousState.ticketsProcessed
                state.workersSpawned = previousState.workersSpawned
                state.contextSize = previousState.contextSize

            // Update status
            state.status = 'running'
            running = true
            shuttingDown = false

            // Persist initial state
            AWAIT saveState()

            // Start health monitor
            IF config.enableHealthMonitor THEN:
                AWAIT healthMonitor.start()
                healthMonitor.onHealthChange(handleHealthChange)

            // Start main processing loop
            startMainLoop()

            // Start state persistence loop
            startStateUpdates()

            LOG("Orchestrator started successfully")

        CATCH error:
            LOG_ERROR("Failed to start orchestrator", error)
            state.status = 'stopped'
            running = false
            THROW error

    METHOD stop():
        IF NOT running AND state.status == 'stopped' THEN:
            RETURN  // Already stopped

        LOG("Initiating graceful shutdown...")

        shuttingDown = true
        running = false

        // Clear polling intervals
        IF intervalHandle THEN:
            clearInterval(intervalHandle)
            intervalHandle = null

        IF stateUpdateInterval THEN:
            clearInterval(stateUpdateInterval)
            stateUpdateInterval = null

        // Stop health monitor
        IF config.enableHealthMonitor THEN:
            TRY:
                AWAIT healthMonitor.stop()
            CATCH error:
                LOG_ERROR("Failed to stop health monitor", error)

        // Wait for active workers with timeout
        TRY:
            activeWorkers = AWAIT workerSpawner.getActiveWorkers()
            IF activeWorkers.length > 0 THEN:
                LOG("Waiting for {activeWorkers.length} workers to complete...")
                AWAIT workerSpawner.waitForAllWorkers(config.shutdownTimeout)
        CATCH error:
            LOG_ERROR("Worker shutdown timeout exceeded", error)
            // Continue with shutdown anyway

        // Save final state
        state.status = 'stopped'
        AWAIT saveState()

        shuttingDown = false
        LOG("Orchestrator stopped successfully")
```

**Algorithm Complexity:**
- Start: O(1) - Constant time initialization
- Stop: O(n) - Linear with number of active workers (bounded by timeout)

---

## 2. Feed Monitoring Loop

### 2.1 Polling Algorithm

```pseudocode
METHOD processTickets():
    IF NOT running OR shuttingDown THEN:
        RETURN  // Don't process during shutdown

    TRY:
        // Update health check timestamp
        state.lastHealthCheck = NOW()

        // Get current worker count
        activeWorkers = AWAIT workerSpawner.getActiveWorkers()
        state.activeWorkers = activeWorkers.length

        // Check capacity
        availableSlots = config.maxConcurrentWorkers - activeWorkers.length
        IF availableSlots <= 0 THEN:
            RETURN  // At maximum capacity

        // Retrieve pending tickets from queue
        pendingTickets = AWAIT workQueue.getPendingTickets(availableSlots)

        IF pendingTickets.isEmpty() THEN:
            RETURN  // No work to do

        // Process tickets up to available slots
        FOR EACH ticket IN pendingTickets:
            TRY:
                AWAIT spawnWorkerForTicket(ticket)
            CATCH error:
                LOG_ERROR("Failed to spawn worker for ticket {ticket.id}", error)
                state.lastError = error.message
                // Continue processing other tickets

    CATCH error:
        LOG_ERROR("Error in ticket processing loop", error)
        state.lastError = error.message
        // Don't crash - continue on next iteration

METHOD startMainLoop():
    intervalHandle = setInterval(LAMBDA:
        IF running AND NOT shuttingDown THEN:
            AWAIT processTickets()
    , config.checkInterval)
```

**Algorithm Properties:**
- **Time Complexity:** O(n) where n = min(availableSlots, pendingTickets)
- **Space Complexity:** O(n) for ticket array
- **Polling Interval:** Configurable (default 5000ms)
- **Failure Mode:** Log and continue (non-blocking)

### 2.2 Priority-Based Ticket Retrieval

```pseudocode
METHOD getPendingTickets(limit):
    QUERY = "
        SELECT * FROM work_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT {limit}
    "

    tickets = AWAIT database.query(QUERY)
    RETURN tickets

// Called by processTickets
METHOD getNextHighPriorityTicket():
    ticket = AWAIT workQueue.getNextTicket()

    IF ticket THEN:
        RETURN ticket
    ELSE:
        RETURN null  // Queue empty
```

**Algorithm Complexity:**
- Query: O(log n) with B-tree index on (status, priority, created_at)
- Retrieval: O(1) amortized

---

## 3. Context Management

### 3.1 Context Tracking Algorithm

```pseudocode
METHOD updateContextSize(additionalTokens):
    TRY:
        // Add tokens from current operation
        state.contextSize += additionalTokens

        // Persist to database
        AWAIT database.updateMetrics({
            contextSize: state.contextSize
        })

        // Check if restart needed
        IF state.contextSize >= config.contextLimit THEN:
            LOG_WARN("Context limit reached: {state.contextSize} tokens")
            AWAIT triggerGracefulRestart()

    CATCH error:
        LOG_ERROR("Failed to update context size", error)
        // Don't throw - context tracking shouldn't crash orchestrator

METHOD estimateTokens(operation):
    // Estimate tokens for different operations
    SWITCH operation.type:
        CASE 'ticket_poll':
            RETURN 50  // Small overhead per poll
        CASE 'worker_spawn':
            RETURN 100  // Overhead for spawn coordination
        CASE 'health_check':
            RETURN 20   // Minimal overhead
        CASE 'state_update':
            RETURN 10   // Minimal overhead
        DEFAULT:
            RETURN 50   // Conservative estimate

METHOD checkContextLimit():
    isOverLimit = AWAIT database.isContextOverLimit(config.contextLimit)
    RETURN isOverLimit
```

**Algorithm Complexity:**
- Update: O(1) - Single database update
- Check: O(1) - Single database query

### 3.2 Context Composition for Workers

```pseudocode
METHOD composeWorkerContext(ticket):
    // Retrieve agent template (TIER 1)
    agentTemplate = AWAIT database.getSystemTemplate(ticket.assignedAgent)
    IF NOT agentTemplate THEN:
        THROW Error("Agent template not found: {ticket.assignedAgent}")

    // Retrieve user customization (TIER 2)
    userCustomization = AWAIT database.getUserCustomization(
        ticket.userId,
        ticket.assignedAgent
    )

    // Validate user didn't override protected fields
    IF userCustomization THEN:
        validateCustomization(userCustomization, agentTemplate)

    // Retrieve relevant memories (TIER 3)
    memories = AWAIT database.getRelevantMemories(
        ticket.userId,
        ticket.assignedAgent,
        limit: 5
    )

    // Compose final context
    workerContext = {
        // TIER 1: Protected fields (immutable)
        model: agentTemplate.model,
        postingRules: agentTemplate.posting_rules,
        apiSchema: agentTemplate.api_schema,
        safetyConstraints: agentTemplate.safety_constraints,

        // TIER 2: Customizable fields
        personality: userCustomization?.personality || agentTemplate.default_personality,
        interests: userCustomization?.interests || [],
        responseStyle: userCustomization?.response_style || agentTemplate.default_response_style,

        // TIER 3: Context data
        agentName: userCustomization?.custom_name || ticket.assignedAgent,
        memories: memories,

        // Ticket context
        ticket: ticket,

        // Metadata
        templateVersion: agentTemplate.version,
        contextComposedAt: NOW()
    }

    RETURN workerContext

METHOD validateCustomization(custom, template):
    protectedFields = ['model', 'posting_rules', 'api_schema', 'safety_constraints']

    FOR EACH field IN protectedFields:
        IF custom.hasOwnProperty(field) THEN:
            THROW SecurityError("Cannot override protected field: {field}")

    // Additional validation
    IF custom.personality AND LENGTH(custom.personality) > 5000 THEN:
        THROW ValidationError("Personality text too long")

    IF custom.interests AND LENGTH(custom.interests) > 50 THEN:
        THROW ValidationError("Too many interests")
```

**Algorithm Complexity:**
- Compose: O(1) - Fixed number of database queries (3-4 queries)
- Validate: O(n) - Linear with number of customization fields
- Memory Retrieval: O(log m) - Index scan with LIMIT

---

## 4. Worker Spawning

### 4.1 Worker Spawning Algorithm

```pseudocode
METHOD spawnWorkerForTicket(ticket):
    TRY:
        // Compose worker context with 3-tier protection
        workerContext = AWAIT composeWorkerContext(ticket)

        // Estimate context size
        contextTokens = estimateContextTokens(workerContext)

        // Spawn the worker
        worker = AWAIT workerSpawner.spawn({
            ticket: ticket,
            context: workerContext,
            onComplete: LAMBDA(result):
                AWAIT handleWorkerComplete(ticket, worker, result),
            onError: LAMBDA(error):
                AWAIT handleWorkerError(ticket, worker, error)
        })

        // Assign ticket to worker in queue
        AWAIT workQueue.assignTicket(ticket.id, worker.id)

        // Update metrics
        state.workersSpawned += 1
        state.activeWorkers += 1

        AWAIT database.updateMetrics({
            workersSpawned: state.workersSpawned,
            activeWorkers: state.activeWorkers
        })

        // Update context size
        AWAIT updateContextSize(contextTokens)

        LOG("Worker spawned for ticket {ticket.id}, agent: {ticket.assignedAgent}")

    CATCH error:
        state.lastError = error.message
        LOG_ERROR("Failed to spawn worker for ticket {ticket.id}", error)

        // Mark ticket as failed
        AWAIT workQueue.failTicket(ticket.id, error.message, shouldRetry: true)

        THROW error

METHOD handleWorkerComplete(ticket, worker, result):
    TRY:
        // Mark ticket as completed
        AWAIT workQueue.completeTicket(ticket.id, result)

        // Update metrics
        state.ticketsProcessed += 1
        state.activeWorkers -= 1

        AWAIT database.updateMetrics({
            ticketsProcessed: state.ticketsProcessed,
            activeWorkers: state.activeWorkers
        })

        LOG("Worker completed ticket {ticket.id} successfully")

    CATCH error:
        LOG_ERROR("Error handling worker completion", error)

METHOD handleWorkerError(ticket, worker, error):
    TRY:
        // Update metrics
        state.activeWorkers -= 1

        AWAIT database.updateMetrics({
            activeWorkers: state.activeWorkers
        })

        // Fail ticket with retry
        AWAIT workQueue.failTicket(ticket.id, error.message, shouldRetry: true)

        LOG_ERROR("Worker failed for ticket {ticket.id}", error)

    CATCH error:
        LOG_ERROR("Error handling worker failure", error)

METHOD estimateContextTokens(workerContext):
    // Rough estimation based on content length
    tokens = 0

    tokens += LENGTH(workerContext.personality) / 4  // ~4 chars per token
    tokens += LENGTH(JSON.stringify(workerContext.postingRules)) / 4
    tokens += LENGTH(JSON.stringify(workerContext.apiSchema)) / 4
    tokens += LENGTH(workerContext.ticket.post_content) / 4

    FOR EACH memory IN workerContext.memories:
        tokens += LENGTH(memory.content) / 4

    tokens += 500  // Base overhead

    RETURN tokens
```

**Algorithm Complexity:**
- Spawn: O(1) - Fixed operations
- Context Composition: O(1) - Fixed queries
- Token Estimation: O(m) - Linear with memory count (typically m=5)

---

## 5. Graceful Restart Sequence

### 5.1 Restart Algorithm

```pseudocode
METHOD triggerGracefulRestart():
    IF shuttingDown THEN:
        LOG_WARN("Restart already in progress")
        RETURN

    LOG("Initiating graceful restart due to context limit")

    TRY:
        // Get pending ticket IDs to preserve
        pendingTickets = AWAIT workQueue.getPendingTickets(limit: 1000)
        pendingTicketIds = MAP(pendingTickets, LAMBDA(t): t.id)

        // Get stuck tickets and reset them
        stuckTickets = AWAIT workQueue.getStuckTickets(timeoutMinutes: 30)
        IF stuckTickets.length > 0 THEN:
            AWAIT workQueue.resetStuckTickets(timeoutMinutes: 30)
            LOG("Reset {stuckTickets.length} stuck tickets")

        // Record restart in database
        AWAIT database.recordRestart(pendingTicketIds)

        // Stop orchestrator
        AWAIT stop()

        // Small delay to ensure cleanup
        AWAIT sleep(1000)

        // Restart orchestrator
        AWAIT start()

        LOG("Graceful restart completed")

    CATCH error:
        LOG_ERROR("Error during graceful restart", error)

        // Attempt to continue running if restart fails
        state.status = 'running'
        running = true

        THROW error

METHOD saveState():
    TRY:
        stateSnapshot = {
            status: state.status,
            context_size: state.contextSize,
            last_feed_position: state.lastFeedPosition,
            active_workers: state.activeWorkers,
            workers_spawned: state.workersSpawned,
            tickets_processed: state.ticketsProcessed,
            last_health_check: state.lastHealthCheck,
            last_error: state.lastError,
            start_time: state.startTime
        }

        AWAIT database.saveState(stateSnapshot)

    CATCH error:
        LOG_ERROR("Failed to save state", error)
        // Don't throw - state save failures shouldn't crash orchestrator

METHOD loadState():
    TRY:
        savedState = AWAIT database.loadState()

        IF savedState THEN:
            // Restore relevant fields
            state.ticketsProcessed = savedState.tickets_processed
            state.workersSpawned = savedState.workers_spawned
            state.contextSize = savedState.context_size || 1500
            state.lastFeedPosition = savedState.last_feed_position

            LOG("State loaded from previous session")
        ELSE:
            LOG("No previous state found, starting fresh")

    CATCH error:
        LOG_ERROR("Failed to load state", error)
        // Continue with fresh state
```

**Algorithm Complexity:**
- Restart Trigger: O(n) - Linear with pending tickets (query only)
- Save State: O(1) - Single database update
- Load State: O(1) - Single database query

### 5.2 State Snapshot Structure

```pseudocode
STRUCTURE StateSnapshot:
    status: String              // 'running', 'restarting', 'stopped'
    contextSize: Integer        // Current token count
    lastFeedPosition: String    // Last processed post/ticket ID
    pendingTickets: Array<String>  // Ticket IDs to preserve
    activeWorkers: Integer      // Current worker count
    workersSpawned: Integer     // Lifetime counter
    ticketsProcessed: Integer   // Lifetime counter
    lastHealthCheck: Timestamp
    lastRestart: Timestamp
    lastError: String
    startTime: Timestamp
```

---

## 6. Health Monitoring

### 6.1 Health Check Algorithm

```pseudocode
METHOD performHealthCheck():
    healthStatus = {
        healthy: true,
        issues: []
    }

    TRY:
        // Check context size
        IF state.contextSize >= config.contextLimit THEN:
            healthStatus.healthy = false
            healthStatus.issues.push({
                type: 'context_limit',
                severity: 'critical',
                message: "Context size {state.contextSize} exceeds limit {config.contextLimit}"
            })

        // Check database connectivity
        TRY:
            AWAIT database.ping()
        CATCH error:
            healthStatus.healthy = false
            healthStatus.issues.push({
                type: 'database_connection',
                severity: 'critical',
                message: "Database connection failed: {error.message}"
            })

        // Check worker health
        activeWorkers = AWAIT workerSpawner.getActiveWorkers()
        stuckWorkers = FILTER(activeWorkers, LAMBDA(w):
            NOW() - w.startTime > 30 * 60 * 1000  // 30 minutes
        )

        IF stuckWorkers.length > 0 THEN:
            healthStatus.healthy = false
            healthStatus.issues.push({
                type: 'stuck_workers',
                severity: 'warning',
                message: "{stuckWorkers.length} workers stuck for >30 minutes"
            })

        // Check queue health
        queueStats = AWAIT workQueue.getQueueStats()
        IF queueStats.pending_count > 100 THEN:
            healthStatus.issues.push({
                type: 'queue_backlog',
                severity: 'warning',
                message: "Large queue backlog: {queueStats.pending_count} pending tickets"
            })

        // Record health check
        AWAIT database.recordHealthCheck(
            error: healthStatus.healthy ? null : JSON.stringify(healthStatus.issues)
        )

        RETURN healthStatus

    CATCH error:
        LOG_ERROR("Health check failed", error)
        RETURN {
            healthy: false,
            issues: [{
                type: 'health_check_failure',
                severity: 'critical',
                message: error.message
            }]
        }

METHOD handleHealthChange(healthStatus):
    IF NOT healthStatus.healthy AND running THEN:
        LOG_WARN("Health issues detected", healthStatus.issues)

        // Check for critical issues
        criticalIssues = FILTER(healthStatus.issues, LAMBDA(i):
            i.severity == 'critical'
        )

        IF criticalIssues.length > 0 THEN:
            LOG_ERROR("Critical health issues detected, triggering restart")

            // Update state
            state.status = 'restarting'
            AWAIT saveState()

            // Trigger restart for critical issues
            FOR EACH issue IN criticalIssues:
                IF issue.type == 'context_limit' THEN:
                    AWAIT triggerGracefulRestart()
                ELSE IF issue.type == 'database_connection' THEN:
                    // Attempt database reconnection
                    AWAIT attemptDatabaseReconnect()
```

**Algorithm Complexity:**
- Health Check: O(n) - Linear with number of active workers
- Issue Detection: O(m) - Linear with number of check types
- Total: O(n + m) typically O(n) where n < 10

---

## 7. Error Recovery

### 7.1 Retry Logic with Exponential Backoff

```pseudocode
METHOD retryWithBackoff(operation, maxAttempts, backoffIntervals):
    attempt = 1

    WHILE attempt <= maxAttempts:
        TRY:
            result = AWAIT operation()
            RETURN result  // Success

        CATCH error:
            LOG_WARN("Attempt {attempt} failed: {error.message}")

            // Log to error_log table
            AWAIT database.logError({
                operation: operation.name,
                error_type: error.type,
                error_message: error.message,
                retry_count: attempt,
                timestamp: NOW()
            })

            IF attempt >= maxAttempts THEN:
                LOG_ERROR("All retry attempts exhausted")
                THROW error  // Final failure

            // Exponential backoff
            delay = backoffIntervals[attempt - 1]
            LOG("Retrying in {delay}ms...")
            AWAIT sleep(delay)

            attempt += 1

    // Should never reach here
    THROW Error("Retry logic error")

// Usage example
CONST RETRY_CONFIG = {
    maxAttempts: 3,
    backoffIntervals: [5000, 30000, 120000]  // 5s, 30s, 2min
}

METHOD executeWithRetry(operation):
    RETURN AWAIT retryWithBackoff(
        operation,
        RETRY_CONFIG.maxAttempts,
        RETRY_CONFIG.backoffIntervals
    )
```

**Algorithm Complexity:**
- Best Case: O(1) - Success on first attempt
- Worst Case: O(n) - All retries fail (n = maxAttempts)
- Time Complexity: O(1) per attempt, total bounded by backoff intervals

### 7.2 Stuck Ticket Recovery

```pseudocode
METHOD recoverStuckTickets():
    TRY:
        // Get tickets stuck in assigned/processing state
        stuckTickets = AWAIT workQueue.getStuckTickets(timeoutMinutes: 30)

        IF stuckTickets.isEmpty() THEN:
            RETURN  // No stuck tickets

        LOG_WARN("Found {stuckTickets.length} stuck tickets")

        // Reset stuck tickets to pending
        resetCount = AWAIT workQueue.resetStuckTickets(timeoutMinutes: 30)

        LOG("Reset {resetCount} stuck tickets to pending state")

        // Update metrics
        AWAIT database.logEvent({
            type: 'stuck_ticket_recovery',
            count: resetCount,
            timestamp: NOW()
        })

    CATCH error:
        LOG_ERROR("Failed to recover stuck tickets", error)
        // Don't throw - recovery failures shouldn't crash orchestrator

METHOD attemptDatabaseReconnect():
    maxAttempts = 5
    backoffIntervals = [1000, 5000, 10000, 30000, 60000]

    FOR attempt FROM 1 TO maxAttempts:
        TRY:
            LOG("Attempting database reconnection (attempt {attempt})...")

            AWAIT database.reconnect()
            AWAIT database.ping()

            LOG("Database reconnection successful")
            RETURN true

        CATCH error:
            LOG_ERROR("Reconnection attempt {attempt} failed", error)

            IF attempt < maxAttempts THEN:
                delay = backoffIntervals[attempt - 1]
                AWAIT sleep(delay)

    // All attempts failed
    LOG_ERROR("Database reconnection failed after {maxAttempts} attempts")
    RETURN false
```

**Algorithm Complexity:**
- Stuck Ticket Recovery: O(n) - Linear with stuck ticket count
- Database Reconnect: O(m) - Linear with retry attempts (m = 5)

---

## 8. Data Structures

### 8.1 Core Data Structures

```pseudocode
STRUCTURE AviConfig:
    checkInterval: Integer          // Polling interval (ms)
    contextLimit: Integer           // Token limit for restart
    maxConcurrentWorkers: Integer   // Max worker limit
    shutdownTimeout: Integer        // Worker shutdown timeout (ms)
    enableHealthMonitor: Boolean    // Enable health checks
    healthCheckInterval: Integer    // Health check frequency (ms)

STRUCTURE AviState:
    status: String                  // 'initializing', 'running', 'restarting', 'stopped'
    startTime: Timestamp            // Current session start
    contextSize: Integer            // Current token count
    lastFeedPosition: String        // Last processed position
    activeWorkers: Integer          // Current worker count
    workersSpawned: Integer         // Lifetime counter
    ticketsProcessed: Integer       // Lifetime counter
    lastHealthCheck: Timestamp
    lastRestart: Timestamp
    lastError: String

STRUCTURE WorkTicket:
    id: Integer                     // Primary key
    userId: String                  // User identifier
    postId: String                  // Social media post ID
    postContent: String             // Post text
    postAuthor: String              // Post author
    postMetadata: Object            // Additional context
    assignedAgent: String           // Agent template name
    priority: Integer               // Priority (higher = more urgent)
    status: String                  // 'pending', 'assigned', 'processing', 'completed', 'failed'
    workerId: String                // Assigned worker ID
    createdAt: Timestamp
    assignedAt: Timestamp
    startedAt: Timestamp
    completedAt: Timestamp
    result: Object                  // Processing result
    errorMessage: String
    retryCount: Integer

STRUCTURE WorkerContext:
    // TIER 1: Protected
    model: String
    postingRules: Object
    apiSchema: Object
    safetyConstraints: Object

    // TIER 2: Customizable
    personality: String
    interests: Array<String>
    responseStyle: Object
    agentName: String

    // TIER 3: Context
    memories: Array<Memory>
    ticket: WorkTicket

    // Metadata
    templateVersion: Integer
    contextComposedAt: Timestamp

STRUCTURE HealthStatus:
    healthy: Boolean
    issues: Array<HealthIssue>
    timestamp: Timestamp

STRUCTURE HealthIssue:
    type: String                    // 'context_limit', 'database_connection', etc.
    severity: String                // 'warning', 'critical'
    message: String
    timestamp: Timestamp
```

### 8.2 Interface Definitions

```pseudocode
INTERFACE IWorkQueue:
    METHOD getNextTicket(userId?: String) -> WorkTicket?
    METHOD getPendingTickets(limit: Integer) -> Array<WorkTicket>
    METHOD assignTicket(ticketId: Integer, workerId: String) -> WorkTicket
    METHOD startProcessing(ticketId: Integer) -> WorkTicket
    METHOD completeTicket(ticketId: Integer, result: Object) -> WorkTicket
    METHOD failTicket(ticketId: Integer, error: String, retry: Boolean) -> WorkTicket
    METHOD getStuckTickets(timeoutMinutes: Integer) -> Array<WorkTicket>
    METHOD resetStuckTickets(timeoutMinutes: Integer) -> Integer

INTERFACE IWorkerSpawner:
    METHOD spawn(config: WorkerConfig) -> Worker
    METHOD getActiveWorkers() -> Array<Worker>
    METHOD waitForAllWorkers(timeout: Integer) -> Void
    METHOD terminateWorker(workerId: String) -> Void

INTERFACE IHealthMonitor:
    METHOD start() -> Void
    METHOD stop() -> Void
    METHOD onHealthChange(callback: Function) -> Void
    METHOD getCurrentStatus() -> HealthStatus

INTERFACE IAviDatabase:
    METHOD loadState() -> AviState?
    METHOD saveState(state: AviState) -> Void
    METHOD updateMetrics(updates: Object) -> Void
    METHOD recordRestart(pendingTickets: Array<String>) -> Void
    METHOD recordHealthCheck(error: String?) -> Void
    METHOD logError(error: ErrorLog) -> Void
    METHOD ping() -> Void
    METHOD reconnect() -> Void
```

---

## 9. Complexity Analysis

### 9.1 Time Complexity Summary

| Operation | Best Case | Average Case | Worst Case | Notes |
|-----------|-----------|--------------|------------|-------|
| Start Orchestrator | O(1) | O(1) | O(1) | Constant time |
| Stop Orchestrator | O(1) | O(n) | O(n) | Linear with workers |
| Process Tickets | O(1) | O(k) | O(k) | k = available slots |
| Spawn Worker | O(1) | O(1) | O(1) | Fixed operations |
| Context Composition | O(1) | O(1) | O(1) | Fixed queries |
| Graceful Restart | O(n) | O(n) | O(n) | Linear with pending tickets |
| Health Check | O(n) | O(n) | O(n) | Linear with workers |
| Retry Logic | O(1) | O(m) | O(m) | m = max attempts |

### 9.2 Space Complexity Summary

| Data Structure | Space | Notes |
|----------------|-------|-------|
| AviState | O(1) | Fixed size |
| Ticket Array | O(n) | n = pending tickets |
| Worker Array | O(w) | w = active workers (max 10) |
| Context Composition | O(m) | m = memory count (typically 5) |
| Health Issues | O(i) | i = issue count (typically <5) |

### 9.3 Database Query Complexity

| Query | Index | Complexity | Notes |
|-------|-------|------------|-------|
| Get next ticket | (status, priority, created_at) | O(log n) | B-tree index scan |
| Assign ticket | Primary key | O(1) | Direct lookup |
| Get stuck tickets | (status, updated_at) | O(log n) | Index range scan |
| Update state | Primary key (id=1) | O(1) | Single row update |
| Get pending count | (status) | O(log n) | Index count |

---

## 10. Control Flow Diagrams

### 10.1 Main Orchestrator Flow

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Load Previous   │
│ State (if any)  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Initialize      │
│ Components      │
└──────┬──────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Start Health │   │ Start Polling│
│ Monitor      │   │ Loop         │
└──────┬───────┘   └──────┬───────┘
       │                  │
       │                  ▼
       │           ┌──────────────┐
       │           │ Process      │
       │           │ Tickets      │◄────┐
       │           └──────┬───────┘     │
       │                  │             │
       │                  ├─────────────┘
       │                  │ (Every 5s)
       │                  │
       ▼                  ▼
┌─────────────────────────────┐
│   RUNNING STATE             │
└─────────────────────────────┘
       │
       │ (Context limit OR health issue)
       ▼
┌─────────────────┐
│ Graceful        │
│ Restart         │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Back to RUNNING │
└─────────────────┘
```

### 10.2 Ticket Processing Flow

```
┌──────────────┐
│ Poll Queue   │
└──────┬───────┘
       │
       ▼
  ┌─────────┐
  │ Tickets │   YES    ┌──────────────┐
  │ Pending?├─────────►│ Get Next     │
  └────┬────┘          │ Ticket       │
       │ NO            └──────┬───────┘
       │                      │
       ▼                      ▼
  ┌─────────┐          ┌──────────────┐
  │ Sleep 5s│          │ Check Worker │
  └─────────┘          │ Capacity     │
                       └──────┬───────┘
                              │
                         ┌────┴────┐
                         │ Slots   │
                    NO   │Available│  YES
                    ┌────┤   ?     ├────┐
                    │    └─────────┘    │
                    ▼                   ▼
               ┌─────────┐      ┌──────────────┐
               │ Skip    │      │ Compose      │
               │ Ticket  │      │ Context      │
               └─────────┘      └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ Spawn Worker │
                                └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ Assign       │
                                │ Ticket       │
                                └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ Update       │
                                │ Metrics      │
                                └──────────────┘
```

### 10.3 Graceful Restart Flow

```
┌──────────────────┐
│ Context Limit    │
│ Reached (50K)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Get Pending      │
│ Ticket IDs       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Save State to DB │
│ (with tickets)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Stop Health      │
│ Monitor          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Stop Polling     │
│ Loop             │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Wait for Active  │
│ Workers (30s)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Destroy Old      │
│ Instance         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Create Fresh     │
│ Instance         │
│ (1.5K tokens)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Load Saved State │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Resume Polling   │
└──────────────────┘
```

---

## 11. Algorithm Optimizations

### 11.1 Batch Operations

```pseudocode
// Optimize: Batch multiple state updates
METHOD batchStateUpdates(updates):
    // Accumulate updates over short window (e.g., 1 second)
    // Then apply all at once

    accumulatedUpdates = {}

    FOR EACH update IN updates:
        MERGE(accumulatedUpdates, update)

    AWAIT database.updateState(accumulatedUpdates)

// Optimize: Bulk ticket assignment
METHOD assignTicketsBulk(tickets, workers):
    assignments = []

    FOR i FROM 0 TO MIN(tickets.length, workers.length):
        assignments.push({
            ticketId: tickets[i].id,
            workerId: workers[i].id
        })

    AWAIT database.bulkAssignTickets(assignments)
```

### 11.2 Caching Strategy

```pseudocode
// Cache agent templates in memory (they rarely change)
CLASS AgentTemplateCache:
    cache: Map<String, AgentTemplate>
    ttl: Integer = 3600000  // 1 hour

    METHOD get(templateName):
        IF cache.has(templateName) AND NOT expired(templateName) THEN:
            RETURN cache.get(templateName)

        template = AWAIT database.getSystemTemplate(templateName)
        cache.set(templateName, template)

        RETURN template

    METHOD invalidate(templateName):
        cache.delete(templateName)
```

---

## 12. Pseudocode Summary

### Key Algorithms Designed:
1. **Main Orchestrator Lifecycle** - Start, stop, state management
2. **Feed Monitoring Loop** - Continuous ticket polling with capacity checks
3. **Context Management** - Token tracking and restart triggers
4. **Worker Spawning** - Context composition with 3-tier protection
5. **Graceful Restart** - State preservation and seamless transition
6. **Health Monitoring** - Automated health checks and recovery
7. **Error Recovery** - Retry logic with exponential backoff

### Algorithm Properties:
- **Time Efficiency:** Most operations O(1) or O(log n)
- **Space Efficiency:** Bounded by configuration limits
- **Fault Tolerance:** Retry logic and graceful degradation
- **Scalability:** Supports up to 10 concurrent workers

---

## Next Phase

**Document:** SPARC-PHASE2-ARCHITECTURE.md
**Focus:** System design, component structure, integration patterns

---

*End of Pseudocode Document*
