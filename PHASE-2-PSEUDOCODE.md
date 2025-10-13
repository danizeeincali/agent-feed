# Phase 2: AVI Orchestrator Integration - Detailed Pseudocode

**Document Version:** 1.0
**Date:** 2025-10-12
**Status:** Pseudocode Design Phase
**Methodology:** SPARC Pseudocode Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Loading](#configuration-loading)
3. [Adapter Implementations](#adapter-implementations)
4. [Server Integration](#server-integration)
5. [Error Handling](#error-handling)
6. [Test Pseudocode](#test-pseudocode)

---

## Overview

This document provides line-by-line pseudocode for all Phase 2 components. Each section includes:
- Input parameters
- Return values
- Error conditions
- Side effects
- Database queries
- Async operations

---

## 1. Configuration Loading

### 1.1 avi.config.js

**Purpose:** Load orchestrator configuration from environment variables with validation

**File:** `/api-server/avi/avi.config.js`

```
ALGORITHM: LoadOrchestratorConfiguration
INPUT: process.env (environment variables object)
OUTPUT: configuration object with validated values

BEGIN
    // Initialize configuration object
    config ← EMPTY_OBJECT

    // Load max workers (1-100 range)
    rawMaxWorkers ← process.env.AVI_MAX_WORKERS
    IF rawMaxWorkers IS NOT NULL THEN
        parsedMaxWorkers ← PARSE_INTEGER(rawMaxWorkers)
        IF parsedMaxWorkers >= 1 AND parsedMaxWorkers <= 100 THEN
            config.maxConcurrentWorkers ← parsedMaxWorkers
        ELSE
            THROW ERROR("AVI_MAX_WORKERS must be between 1 and 100")
        END IF
    ELSE
        config.maxConcurrentWorkers ← 10  // Default
    END IF

    // Load check interval (1000-60000ms range)
    rawCheckInterval ← process.env.AVI_CHECK_INTERVAL
    IF rawCheckInterval IS NOT NULL THEN
        parsedInterval ← PARSE_INTEGER(rawCheckInterval)
        IF parsedInterval >= 1000 AND parsedInterval <= 60000 THEN
            config.checkInterval ← parsedInterval
        ELSE
            THROW ERROR("AVI_CHECK_INTERVAL must be between 1000ms and 60000ms")
        END IF
    ELSE
        config.checkInterval ← 5000  // Default 5 seconds
    END IF

    // Load health monitoring flag
    rawHealthMonitor ← process.env.AVI_HEALTH_MONITOR
    IF rawHealthMonitor === 'false' THEN
        config.enableHealthMonitor ← FALSE
    ELSE
        config.enableHealthMonitor ← TRUE  // Default enabled
    END IF

    // Load health check interval (10000-300000ms range)
    rawHealthInterval ← process.env.AVI_HEALTH_INTERVAL
    IF rawHealthInterval IS NOT NULL THEN
        parsedHealthInterval ← PARSE_INTEGER(rawHealthInterval)
        IF parsedHealthInterval >= 10000 AND parsedHealthInterval <= 300000 THEN
            config.healthCheckInterval ← parsedHealthInterval
        ELSE
            THROW ERROR("AVI_HEALTH_INTERVAL must be between 10000ms and 300000ms")
        END IF
    ELSE
        config.healthCheckInterval ← 30000  // Default 30 seconds
    END IF

    // Load shutdown timeout (5000-120000ms range)
    rawShutdownTimeout ← process.env.AVI_SHUTDOWN_TIMEOUT
    IF rawShutdownTimeout IS NOT NULL THEN
        parsedTimeout ← PARSE_INTEGER(rawShutdownTimeout)
        IF parsedTimeout >= 5000 AND parsedTimeout <= 120000 THEN
            config.shutdownTimeout ← parsedTimeout
        ELSE
            THROW ERROR("AVI_SHUTDOWN_TIMEOUT must be between 5000ms and 120000ms")
        END IF
    ELSE
        config.shutdownTimeout ← 30000  // Default 30 seconds
    END IF

    // Load context bloat threshold (10000-100000 tokens)
    rawContextLimit ← process.env.AVI_CONTEXT_LIMIT
    IF rawContextLimit IS NOT NULL THEN
        parsedLimit ← PARSE_INTEGER(rawContextLimit)
        IF parsedLimit >= 10000 AND parsedLimit <= 100000 THEN
            config.contextBloatThreshold ← parsedLimit
        ELSE
            THROW ERROR("AVI_CONTEXT_LIMIT must be between 10000 and 100000 tokens")
        END IF
    ELSE
        config.contextBloatThreshold ← 50000  // Default 50K tokens
    END IF

    // Load worker timeout (30000-600000ms range)
    rawWorkerTimeout ← process.env.AVI_WORKER_TIMEOUT
    IF rawWorkerTimeout IS NOT NULL THEN
        parsedWorkerTimeout ← PARSE_INTEGER(rawWorkerTimeout)
        IF parsedWorkerTimeout >= 30000 AND parsedWorkerTimeout <= 600000 THEN
            config.workerTimeout ← parsedWorkerTimeout
        ELSE
            THROW ERROR("AVI_WORKER_TIMEOUT must be between 30000ms and 600000ms")
        END IF
    ELSE
        config.workerTimeout ← 120000  // Default 2 minutes
    END IF

    // Log configuration
    LOG("🔧 Orchestrator Configuration Loaded:")
    LOG("   Max Workers: " + config.maxConcurrentWorkers)
    LOG("   Check Interval: " + config.checkInterval + "ms")
    LOG("   Health Monitor: " + (config.enableHealthMonitor ? "enabled" : "disabled"))
    LOG("   Shutdown Timeout: " + config.shutdownTimeout + "ms")

    RETURN config

EXCEPTION HANDLING:
    CATCH ConfigurationError:
        LOG_ERROR("Configuration validation failed: " + error.message)
        THROW error  // Re-throw to prevent server start

    CATCH ParseError:
        LOG_ERROR("Failed to parse environment variable: " + error.message)
        THROW ERROR("Invalid configuration value")
END
```

---

## 2. Adapter Implementations

### 2.1 WorkQueueAdapter

**Purpose:** Translate PostgreSQL work queue repository to IWorkQueue interface

**File:** `/api-server/avi/adapters/work-queue.adapter.js`

```
CLASS: WorkQueueAdapter IMPLEMENTS IWorkQueue

CONSTRUCTOR(repository)
INPUT: repository (WorkQueueRepository instance, optional)
SIDE EFFECTS: Store repository reference

BEGIN
    IF repository IS NULL THEN
        this.repository ← IMPORT('../../repositories/postgres/work-queue.repository.js')
    ELSE
        this.repository ← repository  // For testing with mocks
    END IF
END


METHOD: getPendingTickets
INPUT: none
OUTPUT: Promise<Array<PendingTicket>>
DATABASE: SELECT from work_queue WHERE status='pending'

BEGIN
    TRY
        // Query database for pending tickets
        dbTickets ← AWAIT this.repository.getTicketsByUser(NULL, {
            status: 'pending',
            limit: 100,
            orderBy: 'priority DESC, created_at ASC'
        })

        // Map database rows to interface format
        pendingTickets ← EMPTY_ARRAY

        FOR EACH ticket IN dbTickets DO
            mappedTicket ← {
                id: CONVERT_TO_STRING(ticket.id),
                userId: ticket.user_id,
                feedId: ticket.post_id,
                priority: ticket.priority OR 0,
                createdAt: NEW_DATE(ticket.created_at),
                retryCount: ticket.retry_count OR 0,
                metadata: ticket.post_metadata OR {}
            }

            APPEND mappedTicket TO pendingTickets
        END FOR

        // Log result
        LOG_DEBUG("📋 Retrieved " + pendingTickets.length + " pending tickets")

        RETURN pendingTickets

    CATCH DatabaseError AS error:
        LOG_ERROR("❌ Failed to get pending tickets: " + error.message)
        THROW ERROR("Database query failed: " + error.message)

    CATCH MappingError AS error:
        LOG_ERROR("❌ Failed to map ticket data: " + error.message)
        THROW ERROR("Data mapping failed: " + error.message)
    END TRY
END


METHOD: assignTicket
INPUT: ticketId (string), workerId (string)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='assigned', worker_id=?, assigned_at=NOW()

BEGIN
    TRY
        // Validate inputs
        IF ticketId IS EMPTY THEN
            THROW ERROR("Ticket ID is required")
        END IF

        IF workerId IS EMPTY THEN
            THROW ERROR("Worker ID is required")
        END IF

        // Convert ticketId to integer
        numericTicketId ← PARSE_INTEGER(ticketId)

        IF numericTicketId IS NaN THEN
            THROW ERROR("Invalid ticket ID format: " + ticketId)
        END IF

        // Assign ticket in database
        AWAIT this.repository.assignTicket(numericTicketId, workerId)

        // Log assignment
        LOG_INFO("✅ Assigned ticket " + ticketId + " to worker " + workerId)

    CATCH ValidationError AS error:
        LOG_ERROR("❌ Validation failed: " + error.message)
        THROW error

    CATCH DatabaseError AS error:
        LOG_ERROR("❌ Failed to assign ticket: " + error.message)
        THROW ERROR("Database update failed: " + error.message)
    END TRY
END


METHOD: getQueueStats
INPUT: none
OUTPUT: Promise<QueueStats>
DATABASE: SELECT COUNT(*) GROUP BY status FROM work_queue

BEGIN
    TRY
        // Query aggregated stats
        dbStats ← AWAIT this.repository.getQueueStats()

        // Map to interface format
        stats ← {
            pending: PARSE_INTEGER(dbStats.pending_count) OR 0,
            processing: PARSE_INTEGER(dbStats.processing_count) OR 0,
            completed: PARSE_INTEGER(dbStats.completed_count) OR 0,
            failed: PARSE_INTEGER(dbStats.failed_count) OR 0
        }

        // Calculate total
        stats.total ← stats.pending + stats.processing + stats.completed + stats.failed

        // Log stats
        LOG_DEBUG("📊 Queue Stats: " +
                 "Pending=" + stats.pending + ", " +
                 "Processing=" + stats.processing + ", " +
                 "Completed=" + stats.completed + ", " +
                 "Failed=" + stats.failed)

        RETURN stats

    CATCH DatabaseError AS error:
        LOG_ERROR("❌ Failed to get queue stats: " + error.message)

        // Return zeros on error
        RETURN {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total: 0
        }
    END TRY
END


METHOD: completeTicket (HELPER METHOD)
INPUT: ticketId (string), result (object)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='completed', completed_at=NOW(), result=?

BEGIN
    TRY
        numericTicketId ← PARSE_INTEGER(ticketId)

        AWAIT this.repository.completeTicket(numericTicketId, {
            result: result,
            tokens_used: result.tokensUsed OR 0
        })

        LOG_INFO("✅ Completed ticket " + ticketId)

    CATCH error:
        LOG_ERROR("❌ Failed to complete ticket: " + error.message)
        THROW error
    END TRY
END


METHOD: failTicket (HELPER METHOD)
INPUT: ticketId (string), errorMessage (string)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='failed', error_message=?

BEGIN
    TRY
        numericTicketId ← PARSE_INTEGER(ticketId)

        AWAIT this.repository.failTicket(numericTicketId, errorMessage)

        LOG_WARN("⚠️ Failed ticket " + ticketId + ": " + errorMessage)

    CATCH error:
        LOG_ERROR("❌ Failed to mark ticket as failed: " + error.message)
        THROW error
    END TRY
END
```

---

### 2.2 HealthMonitorAdapter

**Purpose:** Monitor system health (CPU, memory, queue depth)

**File:** `/api-server/avi/adapters/health-monitor.adapter.js`

```
CLASS: HealthMonitorAdapter IMPLEMENTS IHealthMonitor

CONSTRUCTOR(workQueue, checkInterval)
INPUT: workQueue (IWorkQueue instance), checkInterval (number, optional)
SIDE EFFECTS: Initialize state variables

BEGIN
    this.workQueue ← workQueue
    this.checkInterval ← checkInterval OR 30000  // Default 30 seconds
    this.intervalHandle ← NULL
    this.callbacks ← EMPTY_ARRAY
    this.running ← FALSE
    this.lastHealth ← NULL
END


METHOD: start
INPUT: none
OUTPUT: Promise<void>
SIDE EFFECTS: Start interval timer, begin health checks

BEGIN
    TRY
        // Check if already running
        IF this.running IS TRUE THEN
            LOG_WARN("⚠️ Health monitor already running")
            RETURN
        END IF

        LOG_INFO("🏥 Starting health monitor...")
        this.running ← TRUE

        // Perform initial health check
        initialHealth ← AWAIT this.checkHealth()
        this.lastHealth ← initialHealth

        // Notify callbacks
        this.notifyCallbacks(initialHealth)

        // Start interval
        this.intervalHandle ← SET_INTERVAL(ASYNC () => {
            TRY
                health ← AWAIT this.checkHealth()
                this.lastHealth ← health

                // Notify all registered callbacks
                this.notifyCallbacks(health)

            CATCH error:
                LOG_ERROR("❌ Health check error: " + error.message)
            END TRY
        }, this.checkInterval)

        LOG_INFO("✅ Health monitor started (interval: " + this.checkInterval + "ms)")

    CATCH error:
        LOG_ERROR("❌ Failed to start health monitor: " + error.message)
        this.running ← FALSE
        THROW error
    END TRY
END


METHOD: stop
INPUT: none
OUTPUT: Promise<void>
SIDE EFFECTS: Clear interval timer, stop health checks

BEGIN
    IF this.running IS FALSE THEN
        LOG_WARN("⚠️ Health monitor not running")
        RETURN
    END IF

    LOG_INFO("🛑 Stopping health monitor...")

    // Clear interval
    IF this.intervalHandle IS NOT NULL THEN
        CLEAR_INTERVAL(this.intervalHandle)
        this.intervalHandle ← NULL
    END IF

    this.running ← FALSE

    LOG_INFO("✅ Health monitor stopped")
END


METHOD: checkHealth
INPUT: none
OUTPUT: Promise<HealthStatus>
SIDE EFFECTS: Query system metrics

BEGIN
    TRY
        // Get CPU usage
        cpuUsage ← this.getCPUUsage()

        // Get memory usage
        memoryUsage ← this.getMemoryUsage()

        // Get queue stats
        queueStats ← AWAIT this.workQueue.getQueueStats()
        activeWorkers ← queueStats.processing OR 0
        queueDepth ← queueStats.pending OR 0

        // Initialize health status
        issues ← EMPTY_ARRAY
        healthy ← TRUE

        // Check CPU threshold
        IF cpuUsage > 90 THEN
            APPEND "CPU usage above 90% (" + cpuUsage + "%)" TO issues
            healthy ← FALSE
        ELSE IF cpuUsage > 70 THEN
            APPEND "CPU usage above 70% (" + cpuUsage + "%)" TO issues
        END IF

        // Check memory threshold
        IF memoryUsage > 85 THEN
            APPEND "Memory usage above 85% (" + memoryUsage + "%)" TO issues
            healthy ← FALSE
        ELSE IF memoryUsage > 70 THEN
            APPEND "Memory usage above 70% (" + memoryUsage + "%)" TO issues
        END IF

        // Check queue depth
        IF queueDepth > 1000 THEN
            APPEND "Queue depth exceeds 1000 tickets (" + queueDepth + ")" TO issues
            healthy ← FALSE
        ELSE IF queueDepth > 500 THEN
            APPEND "Queue depth exceeds 500 tickets (" + queueDepth + ")" TO issues
        END IF

        // Check for stalled workers (future enhancement)
        IF activeWorkers > 0 THEN
            // Could add time-based checks here
        END IF

        // Build health status object
        healthStatus ← {
            healthy: healthy,
            timestamp: NEW_DATE(),
            metrics: {
                cpuUsage: cpuUsage,
                memoryUsage: memoryUsage,
                activeWorkers: activeWorkers,
                queueDepth: queueDepth
            },
            issues: issues.length > 0 ? issues : UNDEFINED
        }

        // Log if unhealthy
        IF NOT healthy THEN
            LOG_WARN("⚠️ Health check FAILED: " + JSON.stringify(issues))
        ELSE
            LOG_DEBUG("✅ Health check passed")
        END IF

        RETURN healthStatus

    CATCH error:
        LOG_ERROR("❌ Health check failed: " + error.message)

        // Return unhealthy status on error
        RETURN {
            healthy: FALSE,
            timestamp: NEW_DATE(),
            metrics: {
                cpuUsage: 0,
                memoryUsage: 0,
                activeWorkers: 0,
                queueDepth: 0
            },
            issues: ["Health check system error: " + error.message]
        }
    END TRY
END


METHOD: onHealthChange
INPUT: callback (function)
OUTPUT: void
SIDE EFFECTS: Register callback in callbacks array

BEGIN
    // Validate callback
    IF callback IS NOT FUNCTION THEN
        THROW ERROR("Callback must be a function")
    END IF

    // Add to callbacks array
    APPEND callback TO this.callbacks

    // If already running, send current health
    IF this.running AND this.lastHealth IS NOT NULL THEN
        TRY
            callback(this.lastHealth)
        CATCH error:
            LOG_ERROR("❌ Error in health callback: " + error.message)
        END TRY
    END IF

    LOG_DEBUG("📝 Registered health change callback")
END


METHOD: notifyCallbacks (PRIVATE)
INPUT: healthStatus (HealthStatus)
OUTPUT: void
SIDE EFFECTS: Execute all registered callbacks

BEGIN
    IF this.callbacks.length === 0 THEN
        RETURN  // No callbacks registered
    END IF

    FOR EACH callback IN this.callbacks DO
        TRY
            callback(healthStatus)
        CATCH error:
            LOG_ERROR("❌ Error executing health callback: " + error.message)
            // Continue with other callbacks
        END TRY
    END FOR
END


METHOD: getCPUUsage (PRIVATE)
INPUT: none
OUTPUT: number (percentage 0-100)

BEGIN
    // Import OS module
    os ← REQUIRE('os')

    // Get CPU information
    cpus ← os.cpus()
    totalIdle ← 0
    totalTick ← 0

    // Calculate average CPU usage
    FOR EACH cpu IN cpus DO
        FOR EACH type IN cpu.times DO
            totalTick ← totalTick + cpu.times[type]
        END FOR
        totalIdle ← totalIdle + cpu.times.idle
    END FOR

    // Calculate averages
    avgIdle ← totalIdle / cpus.length
    avgTotal ← totalTick / cpus.length

    // Calculate usage percentage
    usage ← 100 - FLOOR(100 * avgIdle / avgTotal)

    RETURN usage
END


METHOD: getMemoryUsage (PRIVATE)
INPUT: none
OUTPUT: number (percentage 0-100)

BEGIN
    // Import OS module
    os ← REQUIRE('os')

    // Get system memory
    totalMem ← os.totalmem()
    freeMem ← os.freemem()
    usedMem ← totalMem - freeMem

    // Calculate percentage
    usage ← (usedMem / totalMem) * 100

    RETURN ROUND(usage)
END
```

---

### 2.3 WorkerSpawnerAdapter

**Purpose:** Spawn and manage AgentWorker instances

**File:** `/api-server/avi/adapters/worker-spawner.adapter.js`

```
CLASS: WorkerSpawnerAdapter IMPLEMENTS IWorkerSpawner

CONSTRUCTOR(db)
INPUT: db (DatabaseManager instance)
SIDE EFFECTS: Initialize worker tracking structures

BEGIN
    this.db ← db
    this.activeWorkers ← NEW_MAP()  // workerId → WorkerInfo
    this.workerPromises ← NEW_MAP()  // workerId → Promise
    this.workerCounter ← 0

    LOG_DEBUG("🏭 Worker spawner initialized")
END


METHOD: spawnWorker
INPUT: ticket (PendingTicket)
OUTPUT: Promise<WorkerInfo>
SIDE EFFECTS: Create worker, start async execution, update tracking maps
DATABASE: UPDATE work_queue SET status='processing', started_at=NOW()

BEGIN
    TRY
        // Generate unique worker ID
        workerId ← this.generateWorkerId()

        // Create worker info object
        workerInfo ← {
            id: workerId,
            ticketId: ticket.id,
            status: 'spawning',
            startTime: NEW_DATE(),
            endTime: UNDEFINED,
            error: UNDEFINED
        }

        // Add to active workers map
        this.activeWorkers.SET(workerId, workerInfo)

        LOG_INFO("🚀 Spawning worker " + workerId + " for ticket " + ticket.id)

        // Create worker promise (async execution)
        workerPromise ← this.executeWorker(ticket, workerInfo)

        // Store promise for shutdown coordination
        this.workerPromises.SET(workerId, workerPromise)

        // Update status to running
        workerInfo.status ← 'running'

        // Log spawn
        LOG_INFO("✅ Worker " + workerId + " spawned successfully")

        RETURN workerInfo

    CATCH error:
        LOG_ERROR("❌ Failed to spawn worker: " + error.message)

        // Clean up if spawn failed
        IF workerInfo IS NOT NULL THEN
            workerInfo.status ← 'failed'
            workerInfo.error ← error.message
            workerInfo.endTime ← NEW_DATE()
        END IF

        THROW error
    END TRY
END


METHOD: executeWorker (PRIVATE)
INPUT: ticket (PendingTicket), workerInfo (WorkerInfo)
OUTPUT: Promise<void>
SIDE EFFECTS: Execute worker, update database, cleanup tracking
DATABASE: Multiple queries (load ticket, update status, store results)

BEGIN
    TRY
        // Mark ticket as processing in database
        AWAIT this.markTicketProcessing(ticket.id)

        // Load full work ticket from database
        workTicket ← AWAIT this.loadWorkTicket(ticket.id)

        // Import AgentWorker class
        AgentWorker ← IMPORT('../../../src/worker/agent-worker.js').AgentWorker

        // Create worker instance
        worker ← NEW AgentWorker(this.db)

        LOG_DEBUG("⚙️ Worker " + workerInfo.id + " executing ticket " + ticket.id)

        // Execute ticket (main work)
        result ← AWAIT worker.executeTicket(workTicket)

        // Update worker info based on result
        IF result.success IS TRUE THEN
            workerInfo.status ← 'completed'
            workerInfo.endTime ← NEW_DATE()

            // Calculate execution time
            executionTime ← workerInfo.endTime - workerInfo.startTime

            // Mark ticket as completed
            AWAIT this.completeTicket(ticket.id, result)

            LOG_INFO("✅ Worker " + workerInfo.id + " completed in " + executionTime + "ms")

        ELSE
            workerInfo.status ← 'failed'
            workerInfo.endTime ← NEW_DATE()
            workerInfo.error ← result.error

            // Mark ticket as failed
            AWAIT this.failTicket(ticket.id, result.error)

            LOG_ERROR("❌ Worker " + workerInfo.id + " failed: " + result.error)
        END IF

    CATCH error:
        LOG_ERROR("❌ Worker " + workerInfo.id + " exception: " + error.message)

        // Update worker info
        workerInfo.status ← 'failed'
        workerInfo.endTime ← NEW_DATE()
        workerInfo.error ← error.message

        // Mark ticket as failed
        TRY
            AWAIT this.failTicket(ticket.id, error.message)
        CATCH dbError:
            LOG_ERROR("❌ Failed to mark ticket as failed: " + dbError.message)
        END TRY

    FINALLY
        // Always clean up worker tracking
        WAIT 1000  // Wait 1 second for status queries

        this.activeWorkers.DELETE(workerInfo.id)
        this.workerPromises.DELETE(workerInfo.id)

        LOG_DEBUG("🧹 Cleaned up worker " + workerInfo.id)
    END TRY
END


METHOD: getActiveWorkers
INPUT: none
OUTPUT: Promise<Array<WorkerInfo>>

BEGIN
    // Convert map values to array
    workers ← ARRAY_FROM(this.activeWorkers.values())

    LOG_DEBUG("📊 Active workers: " + workers.length)

    RETURN workers
END


METHOD: terminateWorker
INPUT: workerId (string)
OUTPUT: Promise<void>
SIDE EFFECTS: Mark worker as terminated, remove from tracking

BEGIN
    // Find worker
    worker ← this.activeWorkers.GET(workerId)

    IF worker IS NULL THEN
        LOG_WARN("⚠️ Worker " + workerId + " not found")
        RETURN
    END IF

    LOG_WARN("⚠️ Terminating worker " + workerId)

    // Mark as failed
    worker.status ← 'failed'
    worker.endTime ← NEW_DATE()
    worker.error ← 'Terminated by orchestrator'

    // Remove from tracking
    this.activeWorkers.DELETE(workerId)
    this.workerPromises.DELETE(workerId)

    LOG_INFO("✅ Worker " + workerId + " terminated")
END


METHOD: waitForAllWorkers
INPUT: timeout (number in milliseconds)
OUTPUT: Promise<void>
SIDE EFFECTS: Wait for all worker promises to settle

BEGIN
    // Get all active promises
    promises ← ARRAY_FROM(this.workerPromises.values())

    IF promises.length === 0 THEN
        LOG_DEBUG("✅ No active workers to wait for")
        RETURN
    END IF

    LOG_INFO("⏳ Waiting for " + promises.length + " workers to complete...")

    // Create timeout promise
    timeoutPromise ← NEW_PROMISE((resolve) => {
        WAIT timeout
        resolve('timeout')
    })

    // Create all settled promise
    allSettledPromise ← PROMISE.ALL_SETTLED(promises)

    // Race between completion and timeout
    result ← AWAIT PROMISE.RACE([allSettledPromise, timeoutPromise])

    IF result === 'timeout' THEN
        remainingWorkers ← this.activeWorkers.size
        LOG_WARN("⚠️ Timeout reached with " + remainingWorkers + " workers still active")
    ELSE
        LOG_INFO("✅ All workers completed")
    END IF
END


METHOD: loadWorkTicket (PRIVATE)
INPUT: ticketId (string)
OUTPUT: Promise<WorkTicket>
DATABASE: SELECT * FROM work_queue WHERE id=?

BEGIN
    TRY
        // Import repository
        workQueueRepo ← IMPORT('../../repositories/postgres/work-queue.repository.js')

        // Query database
        ticket ← AWAIT workQueueRepo.getTicketById(PARSE_INTEGER(ticketId))

        IF ticket IS NULL THEN
            THROW ERROR("Work ticket not found: " + ticketId)
        END IF

        // Map to WorkTicket format
        workTicket ← {
            id: CONVERT_TO_STRING(ticket.id),
            type: 'post_response',
            priority: ticket.priority OR 0,
            agentName: ticket.assigned_agent,
            userId: ticket.user_id,
            payload: {
                feedItemId: ticket.post_id,
                content: ticket.post_content,
                metadata: ticket.post_metadata OR {}
            },
            createdAt: NEW_DATE(ticket.created_at),
            status: ticket.status
        }

        RETURN workTicket

    CATCH error:
        LOG_ERROR("❌ Failed to load work ticket: " + error.message)
        THROW error
    END TRY
END


METHOD: markTicketProcessing (PRIVATE)
INPUT: ticketId (string)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='processing', started_at=NOW()

BEGIN
    workQueueRepo ← IMPORT('../../repositories/postgres/work-queue.repository.js')

    AWAIT workQueueRepo.startProcessing(PARSE_INTEGER(ticketId))
END


METHOD: completeTicket (PRIVATE)
INPUT: ticketId (string), result (WorkerResult)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='completed', completed_at=NOW(), result=?

BEGIN
    workQueueRepo ← IMPORT('../../repositories/postgres/work-queue.repository.js')

    AWAIT workQueueRepo.completeTicket(PARSE_INTEGER(ticketId), {
        result: result.response,
        tokens_used: result.tokensUsed OR 0
    })
END


METHOD: failTicket (PRIVATE)
INPUT: ticketId (string), errorMessage (string)
OUTPUT: Promise<void>
DATABASE: UPDATE work_queue SET status='failed', error_message=?

BEGIN
    workQueueRepo ← IMPORT('../../repositories/postgres/work-queue.repository.js')

    AWAIT workQueueRepo.failTicket(PARSE_INTEGER(ticketId), errorMessage)
END


METHOD: generateWorkerId (PRIVATE)
INPUT: none
OUTPUT: string

BEGIN
    // Increment counter
    this.workerCounter ← this.workerCounter + 1

    // Generate ID with timestamp and counter
    workerId ← "worker-" + DATE.NOW() + "-" + this.workerCounter

    RETURN workerId
END
```

---

### 2.4 AviDatabaseAdapter

**Purpose:** Persist orchestrator state via avi-state.repository.js

**File:** `/api-server/avi/adapters/avi-database.adapter.js`

```
CLASS: AviDatabaseAdapter IMPLEMENTS IAviDatabase

CONSTRUCTOR(repository)
INPUT: repository (AviStateRepository instance, optional)
SIDE EFFECTS: Store repository reference

BEGIN
    IF repository IS NULL THEN
        this.repository ← IMPORT('../../repositories/postgres/avi-state.repository.js')
    ELSE
        this.repository ← repository  // For testing with mocks
    END IF

    LOG_DEBUG("💾 Database adapter initialized")
END


METHOD: saveState
INPUT: state (AviState)
OUTPUT: Promise<void>
DATABASE: UPDATE avi_state SET ... WHERE id=1

BEGIN
    TRY
        // Validate state object
        IF state IS NULL THEN
            THROW ERROR("State object is required")
        END IF

        // Map TypeScript types to database schema
        updates ← {
            status: state.status,
            start_time: state.startTime,
            tickets_processed: state.ticketsProcessed,
            workers_spawned: state.workersSpawned,
            active_workers: state.activeWorkers,
            last_health_check: state.lastHealthCheck OR NULL,
            last_error: state.lastError OR NULL
        }

        // Update database
        AWAIT this.repository.updateState(updates)

        LOG_DEBUG("💾 State saved: " + state.status +
                 " (tickets=" + state.ticketsProcessed +
                 ", workers=" + state.workersSpawned + ")")

    CATCH error:
        LOG_ERROR("❌ Failed to save state: " + error.message)

        // Don't throw - state persistence failure shouldn't crash orchestrator
        // Just log the error
    END TRY
END


METHOD: loadState
INPUT: none
OUTPUT: Promise<AviState | null>
DATABASE: SELECT * FROM avi_state WHERE id=1

BEGIN
    TRY
        // Query database
        dbState ← AWAIT this.repository.getState()

        // Return null if no state found
        IF dbState IS NULL THEN
            LOG_INFO("ℹ️ No previous state found (first run)")
            RETURN NULL
        END IF

        // Map database schema to TypeScript types
        state ← {
            status: dbState.status OR 'initializing',
            startTime: dbState.start_time ? NEW_DATE(dbState.start_time) : NEW_DATE(),
            ticketsProcessed: dbState.tickets_processed OR 0,
            workersSpawned: dbState.workers_spawned OR 0,
            activeWorkers: dbState.active_workers OR 0,
            lastHealthCheck: dbState.last_health_check ?
                           NEW_DATE(dbState.last_health_check) : UNDEFINED,
            lastError: dbState.last_error OR UNDEFINED
        }

        LOG_INFO("💾 Loaded state: " + state.status +
                " (tickets=" + state.ticketsProcessed +
                ", workers=" + state.workersSpawned + ")")

        RETURN state

    CATCH error:
        LOG_ERROR("❌ Failed to load state: " + error.message)

        // Return null on error (fresh start)
        RETURN NULL
    END TRY
END


METHOD: updateMetrics
INPUT: metrics (object with optional ticketsProcessed, workersSpawned)
OUTPUT: Promise<void>
DATABASE: UPDATE avi_state SET ... WHERE id=1

BEGIN
    TRY
        // Validate at least one metric provided
        IF metrics.ticketsProcessed IS UNDEFINED AND
           metrics.workersSpawned IS UNDEFINED THEN
            LOG_WARN("⚠️ No metrics provided to update")
            RETURN
        END IF

        // Build update object with only provided metrics
        updates ← {}

        IF metrics.ticketsProcessed IS NOT UNDEFINED THEN
            updates.tickets_processed ← metrics.ticketsProcessed
        END IF

        IF metrics.workersSpawned IS NOT UNDEFINED THEN
            updates.workers_spawned ← metrics.workersSpawned
        END IF

        // Update database
        AWAIT this.repository.updateState(updates)

        LOG_DEBUG("📊 Metrics updated: " + JSON.stringify(updates))

    CATCH error:
        LOG_ERROR("❌ Failed to update metrics: " + error.message)

        // Don't throw - metric updates are non-critical
    END TRY
END


METHOD: incrementTicketsProcessed (HELPER METHOD)
INPUT: none
OUTPUT: Promise<void>
DATABASE: UPDATE avi_state SET tickets_processed = tickets_processed + 1

BEGIN
    TRY
        // Get current state
        currentState ← AWAIT this.loadState()

        IF currentState IS NULL THEN
            // Initialize if needed
            AWAIT this.updateMetrics({ ticketsProcessed: 1 })
        ELSE
            // Increment
            newCount ← currentState.ticketsProcessed + 1
            AWAIT this.updateMetrics({ ticketsProcessed: newCount })
        END IF

    CATCH error:
        LOG_ERROR("❌ Failed to increment tickets: " + error.message)
    END TRY
END


METHOD: incrementWorkersSpawned (HELPER METHOD)
INPUT: none
OUTPUT: Promise<void>
DATABASE: UPDATE avi_state SET workers_spawned = workers_spawned + 1

BEGIN
    TRY
        // Get current state
        currentState ← AWAIT this.loadState()

        IF currentState IS NULL THEN
            // Initialize if needed
            AWAIT this.updateMetrics({ workersSpawned: 1 })
        ELSE
            // Increment
            newCount ← currentState.workersSpawned + 1
            AWAIT this.updateMetrics({ workersSpawned: newCount })
        END IF

    CATCH error:
        LOG_ERROR("❌ Failed to increment workers: " + error.message)
    END TRY
END
```

---

## 3. Server Integration

### 3.1 Server Startup Integration

**Purpose:** Initialize and start orchestrator with Express server

**File:** `/api-server/server.js` (modifications)

```
ALGORITHM: InitializeOrchestratorOnServerStart
INPUT: process.env (environment variables)
OUTPUT: Running orchestrator instance
SIDE EFFECTS: Start orchestrator main loop

BEGIN
    // ========================================
    // SECTION 1: IMPORTS (add to top of file)
    // ========================================

    IMPORT { AviOrchestrator } FROM '../src/avi/orchestrator.js'
    IMPORT { WorkQueueAdapter } FROM './avi/adapters/work-queue.adapter.js'
    IMPORT { HealthMonitorAdapter } FROM './avi/adapters/health-monitor.adapter.js'
    IMPORT { WorkerSpawnerAdapter } FROM './avi/adapters/worker-spawner.adapter.js'
    IMPORT { AviDatabaseAdapter } FROM './avi/adapters/avi-database.adapter.js'
    IMPORT aviConfig FROM './avi/avi.config.js'
    IMPORT postgresManager FROM './config/postgres.js'

    // Global orchestrator instance (for shutdown handler)
    LET orchestrator ← NULL


    // ========================================
    // SECTION 2: ORCHESTRATOR INITIALIZATION
    // (add after database initialization, before route mounting)
    // ========================================

    ASYNC FUNCTION initializeOrchestrator():
    BEGIN
        TRY
            LOG("🚀 Initializing AVI Orchestrator...")

            // Load and validate configuration
            config ← aviConfig

            LOG("📋 Configuration loaded:")
            LOG("   Max Workers: " + config.maxConcurrentWorkers)
            LOG("   Check Interval: " + config.checkInterval + "ms")
            LOG("   Health Monitor: " + (config.enableHealthMonitor ? "enabled" : "disabled"))
            LOG("   Shutdown Timeout: " + config.shutdownTimeout + "ms")

            // Create adapter instances
            LOG("🔌 Creating adapters...")

            workQueue ← NEW WorkQueueAdapter()
            LOG("   ✅ WorkQueue adapter ready")

            healthMonitor ← NEW HealthMonitorAdapter(workQueue, config.healthCheckInterval)
            LOG("   ✅ HealthMonitor adapter ready")

            workerSpawner ← NEW WorkerSpawnerAdapter(postgresManager)
            LOG("   ✅ WorkerSpawner adapter ready")

            database ← NEW AviDatabaseAdapter()
            LOG("   ✅ Database adapter ready")

            // Create orchestrator instance
            LOG("🤖 Creating orchestrator instance...")
            orchestrator ← NEW AviOrchestrator(
                config,
                workQueue,
                healthMonitor,
                workerSpawner,
                database
            )

            // Start orchestrator
            LOG("▶️ Starting orchestrator...")
            AWAIT orchestrator.start()

            LOG("✅ AVI Orchestrator started successfully")
            LOG("   Status: running")
            LOG("   Workers: 0/" + config.maxConcurrentWorkers)
            LOG("   Queue check interval: " + config.checkInterval + "ms")

            RETURN orchestrator

        CATCH ConfigurationError AS error:
            LOG_ERROR("❌ Configuration error: " + error.message)
            LOG_ERROR("   Fix .env file and restart server")
            THROW error

        CATCH DatabaseError AS error:
            LOG_ERROR("❌ Database connection failed: " + error.message)
            LOG_ERROR("   Check DATABASE_URL and database status")
            THROW error

        CATCH error:
            LOG_ERROR("❌ Failed to initialize orchestrator: " + error.message)
            LOG_ERROR("   Server will start but orchestrator is offline")
            LOG_ERROR("   Use POST /api/avi/start to retry manually")

            // Return null - server continues without orchestrator
            RETURN NULL
        END TRY
    END


    // ========================================
    // SECTION 3: GRACEFUL SHUTDOWN HANDLER
    // (replace existing shutdown handler)
    // ========================================

    ASYNC FUNCTION gracefulShutdown(signal):
    INPUT: signal (string like 'SIGTERM' or 'SIGINT')
    OUTPUT: none
    SIDE EFFECTS: Stop all services, close connections, exit process

    BEGIN
        LOG("\n" + signal + " received. Starting graceful shutdown...")

        startTime ← DATE.NOW()
        shutdownTimeout ← 30000  // 30 seconds total

        // ---- STEP 1: Stop HTTP Server ----
        LOG("🛑 Stopping HTTP server...")
        TRY
            httpServer.close(() => {
                LOG("✅ HTTP server closed")
            })
        CATCH error:
            LOG_ERROR("❌ Error closing HTTP server: " + error.message)
        END TRY

        // ---- STEP 2: Stop Orchestrator ----
        IF orchestrator IS NOT NULL THEN
            TRY
                LOG("🤖 Stopping AVI Orchestrator...")

                // Calculate remaining time for orchestrator shutdown
                elapsed ← DATE.NOW() - startTime
                remainingTime ← shutdownTimeout - elapsed

                IF remainingTime <= 0 THEN
                    LOG_WARN("⚠️ Shutdown timeout exceeded, forcing stop")
                    AWAIT orchestrator.forceStop()
                ELSE
                    AWAIT orchestrator.stop()
                END IF

                LOG("✅ AVI Orchestrator stopped gracefully")

            CATCH error:
                LOG_ERROR("❌ Error stopping orchestrator: " + error.message)
                LOG_WARN("⚠️ Forcing orchestrator shutdown...")

                TRY
                    AWAIT orchestrator.forceStop()
                CATCH forceError:
                    LOG_ERROR("❌ Force stop failed: " + forceError.message)
                END TRY
            END TRY
        ELSE
            LOG("ℹ️ No orchestrator to stop")
        END IF

        // ---- STEP 3: Close Database Connections ----
        LOG("💾 Closing database connections...")

        TRY
            // Close SQLite databases
            IF db THEN
                db.close()
                LOG("✅ SQLite database closed")
            END IF

            IF agentPagesDb THEN
                agentPagesDb.close()
                LOG("✅ Agent pages database closed")
            END IF

        CATCH error:
            LOG_ERROR("❌ Error closing SQLite: " + error.message)
        END TRY

        TRY
            // Close PostgreSQL pool
            AWAIT postgresManager.end()
            LOG("✅ PostgreSQL pool closed")

        CATCH error:
            LOG_ERROR("❌ Error closing PostgreSQL: " + error.message)
        END TRY

        // ---- STEP 4: Stop File Watcher ----
        IF fileWatcher THEN
            TRY
                fileWatcher.close()
                LOG("✅ File watcher closed")
            CATCH error:
                LOG_ERROR("❌ Error closing file watcher: " + error.message)
            END TRY
        END IF

        // ---- STEP 5: Final Logging ----
        totalTime ← DATE.NOW() - startTime
        LOG("✅ Graceful shutdown complete in " + totalTime + "ms")

        // Exit process
        PROCESS.EXIT(0)
    END


    // ========================================
    // SECTION 4: SIGNAL HANDLERS
    // (add after route mounting)
    // ========================================

    // Register shutdown handlers
    PROCESS.ON('SIGTERM', () => {
        gracefulShutdown('SIGTERM')
    })

    PROCESS.ON('SIGINT', () => {
        gracefulShutdown('SIGINT')
    })

    // Handle uncaught errors
    PROCESS.ON('uncaughtException', (error) => {
        LOG_ERROR("❌ Uncaught exception: " + error.message)
        LOG_ERROR(error.stack)
        gracefulShutdown('UNCAUGHT_EXCEPTION')
    })

    PROCESS.ON('unhandledRejection', (reason, promise) => {
        LOG_ERROR("❌ Unhandled rejection at: " + promise)
        LOG_ERROR("   Reason: " + reason)
        // Don't shutdown on unhandled rejection, just log
    })


    // ========================================
    // SECTION 5: SERVER START
    // (modify existing server.listen)
    // ========================================

    httpServer ← app.listen(PORT, ASYNC () => {
        LOG("🚀 Server running on http://localhost:" + PORT)

        // Initialize orchestrator if PostgreSQL is enabled
        IF process.env.USE_POSTGRES === 'true' THEN

            // Check if auto-start is enabled
            autoStart ← process.env.AUTO_START_ORCHESTRATOR !== 'false'

            IF autoStart THEN
                TRY
                    AWAIT initializeOrchestrator()
                    LOG("🤖 AVI Orchestrator is active and monitoring work queue")
                CATCH error:
                    LOG_ERROR("❌ Orchestrator initialization failed")
                    LOG_ERROR("   Server is running but orchestrator is offline")
                    LOG_ERROR("   Use POST /api/avi/start to retry manually")
                END TRY
            ELSE
                LOG("ℹ️ Orchestrator auto-start disabled")
                LOG("   Use POST /api/avi/start to start manually")
            END IF

        ELSE
            LOG("ℹ️ PostgreSQL disabled - orchestrator not available")
        END IF

        LOG("✅ Server initialization complete")
    })


    // ========================================
    // SECTION 6: EXPORT ORCHESTRATOR
    // (add at end of file)
    // ========================================

    EXPORT { orchestrator }

END
```

---

## 4. Error Handling

### 4.1 Startup Errors

```
ALGORITHM: HandleOrchestratorStartupErrors
INPUT: error (Error object)
OUTPUT: error handling decision (exit/continue/retry)

BEGIN
    // Categorize error
    errorType ← DETERMINE_ERROR_TYPE(error)

    SWITCH errorType:

        CASE 'DATABASE_CONNECTION_FAILED':
            LOG_ERROR("❌ FATAL: Database connection failed")
            LOG_ERROR("   Check DATABASE_URL environment variable")
            LOG_ERROR("   Ensure PostgreSQL is running")
            LOG_ERROR("   Connection string: " + REDACT(process.env.DATABASE_URL))

            IF process.env.REQUIRE_DATABASE === 'true' THEN
                // Fatal error - cannot continue without database
                LOG_ERROR("   Exiting because REQUIRE_DATABASE=true")
                PROCESS.EXIT(1)
            ELSE
                // Non-fatal - continue in degraded mode
                LOG_WARN("   Server will start without orchestrator (degraded mode)")
                RETURN 'CONTINUE_WITHOUT_ORCHESTRATOR'
            END IF

        CASE 'CONFIGURATION_INVALID':
            LOG_ERROR("❌ FATAL: Configuration validation failed")
            LOG_ERROR("   Error: " + error.message)
            LOG_ERROR("   Fix .env file and restart server")

            // Configuration errors are always fatal
            PROCESS.EXIT(1)

        CASE 'ADAPTER_INITIALIZATION_FAILED':
            LOG_ERROR("❌ Adapter initialization failed: " + error.message)

            // Determine which adapter failed
            failedAdapter ← PARSE_ADAPTER_FROM_ERROR(error)
            LOG_ERROR("   Failed adapter: " + failedAdapter)

            // Retry once after 5 seconds
            IF error.retryCount < 1 THEN
                LOG_WARN("   Retrying in 5 seconds...")
                WAIT 5000
                RETURN 'RETRY'
            ELSE
                LOG_ERROR("   Max retries exceeded")
                RETURN 'CONTINUE_WITHOUT_ORCHESTRATOR'
            END IF

        CASE 'STATE_LOAD_FAILED':
            LOG_WARN("⚠️ Failed to load previous state: " + error.message)
            LOG_WARN("   Starting with fresh state")

            // Non-fatal - just start fresh
            RETURN 'CONTINUE_WITH_FRESH_STATE'

        CASE 'UNKNOWN_ERROR':
            LOG_ERROR("❌ Unknown error during startup: " + error.message)
            LOG_ERROR(error.stack)

            // Log for debugging but don't crash server
            LOG_WARN("   Server will start without orchestrator")
            RETURN 'CONTINUE_WITHOUT_ORCHESTRATOR'

    END SWITCH
END


FUNCTION DETERMINE_ERROR_TYPE(error):
INPUT: error (Error object)
OUTPUT: error type string

BEGIN
    message ← error.message.toLowerCase()

    IF message.includes('connection') OR message.includes('econnrefused') THEN
        RETURN 'DATABASE_CONNECTION_FAILED'
    END IF

    IF message.includes('configuration') OR message.includes('validation') THEN
        RETURN 'CONFIGURATION_INVALID'
    END IF

    IF message.includes('adapter') THEN
        RETURN 'ADAPTER_INITIALIZATION_FAILED'
    END IF

    IF message.includes('state') OR message.includes('load') THEN
        RETURN 'STATE_LOAD_FAILED'
    END IF

    RETURN 'UNKNOWN_ERROR'
END
```

### 4.2 Runtime Errors

```
ALGORITHM: HandleOrchestratorRuntimeErrors
INPUT: error (Error object), context (string describing operation)
OUTPUT: recovery action

BEGIN
    LOG_ERROR("❌ Runtime error in " + context + ": " + error.message)

    // Categorize error
    errorCategory ← CATEGORIZE_RUNTIME_ERROR(error)

    SWITCH errorCategory:

        CASE 'WORKER_SPAWN_FAILED':
            // Don't crash orchestrator
            LOG_ERROR("   Worker spawn failed, continuing with other tickets")

            // Mark ticket for retry
            ticketId ← EXTRACT_TICKET_ID_FROM_CONTEXT(context)
            IF ticketId IS NOT NULL THEN
                TRY
                    AWAIT this.workQueue.failTicket(ticketId, error.message)
                    LOG_INFO("   Ticket " + ticketId + " marked for retry")
                CATCH dbError:
                    LOG_ERROR("   Failed to mark ticket: " + dbError.message)
                END TRY
            END IF

            RETURN 'CONTINUE'

        CASE 'WORKER_EXECUTION_FAILED':
            // Worker failed during execution
            LOG_ERROR("   Worker execution failed")

            // Already handled by worker-spawner adapter
            // Just log and continue

            RETURN 'CONTINUE'

        CASE 'QUEUE_QUERY_FAILED':
            // Database query failed
            LOG_ERROR("   Queue query failed, retrying next cycle")

            // Update state with error
            TRY
                AWAIT this.database.saveState({
                    ...this.state,
                    lastError: error.message
                })
            CATCH saveError:
                LOG_ERROR("   Failed to save error state: " + saveError.message)
            END TRY

            RETURN 'RETRY_NEXT_CYCLE'

        CASE 'HEALTH_CHECK_FAILED':
            // Health check encountered error
            LOG_WARN("   Health check failed, continuing")

            // Non-critical - health checks can fail temporarily

            RETURN 'CONTINUE'

        CASE 'STATE_SAVE_FAILED':
            // State persistence failed
            LOG_WARN("   State save failed: " + error.message)
            LOG_WARN("   Orchestrator continues but state may be lost on restart")

            // Non-critical - keep running

            RETURN 'CONTINUE'

        CASE 'CONTEXT_OVERFLOW':
            // Context size exceeded threshold
            LOG_WARN("   Context size exceeded threshold")
            LOG_INFO("   Initiating graceful restart...")

            // Trigger graceful restart
            RETURN 'GRACEFUL_RESTART'

        CASE 'MEMORY_PRESSURE':
            // Memory usage too high
            LOG_WARN("   Memory pressure detected")
            LOG_INFO("   Forcing garbage collection...")

            // Force GC if available
            IF global.gc IS DEFINED THEN
                global.gc()
                LOG_INFO("   Garbage collection complete")
            END IF

            // Reduce worker count temporarily
            this.temporaryMaxWorkers ← FLOOR(this.config.maxConcurrentWorkers / 2)
            LOG_INFO("   Reduced max workers to " + this.temporaryMaxWorkers)

            RETURN 'CONTINUE_REDUCED_CAPACITY'

        CASE 'CRITICAL_ERROR':
            // Critical error - must stop
            LOG_ERROR("   CRITICAL ERROR - stopping orchestrator")

            // Initiate emergency shutdown
            RETURN 'EMERGENCY_SHUTDOWN'

    END SWITCH
END


FUNCTION CATEGORIZE_RUNTIME_ERROR(error):
INPUT: error (Error object)
OUTPUT: error category string

BEGIN
    message ← error.message.toLowerCase()
    code ← error.code

    IF message.includes('spawn') OR message.includes('worker creation') THEN
        RETURN 'WORKER_SPAWN_FAILED'
    END IF

    IF message.includes('execution') OR message.includes('worker failed') THEN
        RETURN 'WORKER_EXECUTION_FAILED'
    END IF

    IF message.includes('queue') OR message.includes('pending tickets') THEN
        RETURN 'QUEUE_QUERY_FAILED'
    END IF

    IF message.includes('health') THEN
        RETURN 'HEALTH_CHECK_FAILED'
    END IF

    IF message.includes('state') OR message.includes('save') THEN
        RETURN 'STATE_SAVE_FAILED'
    END IF

    IF message.includes('context') OR message.includes('overflow') THEN
        RETURN 'CONTEXT_OVERFLOW'
    END IF

    IF message.includes('memory') OR code === 'ERR_OUT_OF_MEMORY' THEN
        RETURN 'MEMORY_PRESSURE'
    END IF

    IF message.includes('fatal') OR message.includes('critical') THEN
        RETURN 'CRITICAL_ERROR'
    END IF

    RETURN 'UNKNOWN_ERROR'
END
```

### 4.3 Shutdown Errors

```
ALGORITHM: HandleGracefulShutdownErrors
INPUT: error (Error object), shutdownPhase (string)
OUTPUT: recovery action

BEGIN
    LOG_ERROR("❌ Error during shutdown phase '" + shutdownPhase + "': " + error.message)

    SWITCH shutdownPhase:

        CASE 'STOP_MAIN_LOOP':
            // Main loop stop failed
            LOG_WARN("   Main loop stop failed, clearing timers manually")

            TRY
                // Force clear all timers
                IF this.mainLoopTimer THEN
                    CLEAR_TIMEOUT(this.mainLoopTimer)
                END IF

                IF this.healthCheckTimer THEN
                    CLEAR_TIMEOUT(this.healthCheckTimer)
                END IF

                IF this.stateUpdateTimer THEN
                    CLEAR_TIMEOUT(this.stateUpdateTimer)
                END IF

                LOG_INFO("   Timers cleared manually")

            CATCH clearError:
                LOG_ERROR("   Failed to clear timers: " + clearError.message)
            END TRY

            RETURN 'CONTINUE_SHUTDOWN'

        CASE 'WAIT_FOR_WORKERS':
            // Workers didn't complete in time
            LOG_WARN("   Workers didn't complete within timeout")

            activeWorkers ← AWAIT this.workerSpawner.getActiveWorkers()
            LOG_WARN("   " + activeWorkers.length + " workers still active")

            // Force terminate remaining workers
            FOR EACH worker IN activeWorkers DO
                TRY
                    LOG_WARN("   Force terminating worker " + worker.id)
                    AWAIT this.workerSpawner.terminateWorker(worker.id)
                CATCH terminateError:
                    LOG_ERROR("   Failed to terminate worker " + worker.id +
                             ": " + terminateError.message)
                END TRY
            END FOR

            RETURN 'CONTINUE_SHUTDOWN'

        CASE 'SAVE_STATE':
            // State save failed during shutdown
            LOG_ERROR("   Failed to save final state: " + error.message)
            LOG_WARN("   State may be lost, but continuing shutdown")

            // Try one more time with minimal state
            TRY
                AWAIT this.database.saveState({
                    status: 'stopped',
                    startTime: this.state.startTime,
                    ticketsProcessed: this.state.ticketsProcessed,
                    workersSpawned: this.state.workersSpawned,
                    activeWorkers: 0,
                    lastError: 'Shutdown error: ' + error.message
                })
                LOG_INFO("   Minimal state saved")
            CATCH retryError:
                LOG_ERROR("   Retry failed: " + retryError.message)
            END TRY

            RETURN 'CONTINUE_SHUTDOWN'

        CASE 'STOP_HEALTH_MONITOR':
            // Health monitor stop failed
            LOG_WARN("   Health monitor stop failed: " + error.message)

            // Force clear health check interval
            TRY
                IF this.healthMonitor.intervalHandle THEN
                    CLEAR_INTERVAL(this.healthMonitor.intervalHandle)
                    this.healthMonitor.running ← FALSE
                END IF
            CATCH clearError:
                LOG_ERROR("   Failed to clear health interval: " + clearError.message)
            END TRY

            RETURN 'CONTINUE_SHUTDOWN'

        CASE 'CLOSE_DATABASE':
            // Database close failed
            LOG_ERROR("   Database close failed: " + error.message)
            LOG_WARN("   Connections may be left open")

            // Log warning but continue - OS will clean up eventually

            RETURN 'CONTINUE_SHUTDOWN'

        CASE 'UNKNOWN_PHASE':
            LOG_ERROR("   Unknown shutdown phase, continuing anyway")
            RETURN 'CONTINUE_SHUTDOWN'

    END SWITCH

    // Default: continue shutdown no matter what
    RETURN 'CONTINUE_SHUTDOWN'
END
```

---

## 5. Test Pseudocode

### 5.1 Unit Test Structure (TDD)

**File:** `/api-server/tests/unit/avi/adapters.test.js`

```
TEST SUITE: "Adapter Unit Tests"

// ========================================
// SETUP AND TEARDOWN
// ========================================

BEFORE_ALL:
BEGIN
    // Create mock repositories
    mockWorkQueueRepo ← CREATE_MOCK({
        getTicketsByUser: JEST_FN(),
        assignTicket: JEST_FN(),
        getQueueStats: JEST_FN(),
        completeTicket: JEST_FN(),
        failTicket: JEST_FN()
    })

    mockAviStateRepo ← CREATE_MOCK({
        getState: JEST_FN(),
        updateState: JEST_FN()
    })
END

AFTER_EACH:
BEGIN
    // Clear all mocks
    JEST.CLEAR_ALL_MOCKS()
END


// ========================================
// WORKQUEUE ADAPTER TESTS
// ========================================

DESCRIBE: "WorkQueueAdapter"

    TEST: "should retrieve pending tickets with correct mapping"
    BEGIN
        // Arrange
        mockDbTickets ← [
            {
                id: 1,
                user_id: 'user-123',
                post_id: 'post-456',
                priority: 10,
                created_at: '2025-10-12T10:00:00Z',
                retry_count: 0,
                post_metadata: { source: 'twitter' }
            },
            {
                id: 2,
                user_id: 'user-123',
                post_id: 'post-789',
                priority: 5,
                created_at: '2025-10-12T10:05:00Z',
                retry_count: 1,
                post_metadata: { source: 'reddit' }
            }
        ]

        mockWorkQueueRepo.getTicketsByUser.mockResolvedValue(mockDbTickets)

        adapter ← NEW WorkQueueAdapter(mockWorkQueueRepo)

        // Act
        result ← AWAIT adapter.getPendingTickets()

        // Assert
        EXPECT(mockWorkQueueRepo.getTicketsByUser).toHaveBeenCalledWith(NULL, {
            status: 'pending',
            limit: 100,
            orderBy: 'priority DESC, created_at ASC'
        })

        EXPECT(result).toHaveLength(2)

        EXPECT(result[0]).toEqual({
            id: '1',
            userId: 'user-123',
            feedId: 'post-456',
            priority: 10,
            createdAt: NEW_DATE('2025-10-12T10:00:00Z'),
            retryCount: 0,
            metadata: { source: 'twitter' }
        })

        EXPECT(result[1].retryCount).toBe(1)
    END


    TEST: "should assign ticket to worker"
    BEGIN
        // Arrange
        mockWorkQueueRepo.assignTicket.mockResolvedValue(undefined)
        adapter ← NEW WorkQueueAdapter(mockWorkQueueRepo)

        // Act
        AWAIT adapter.assignTicket('42', 'worker-123')

        // Assert
        EXPECT(mockWorkQueueRepo.assignTicket).toHaveBeenCalledWith(42, 'worker-123')
    END


    TEST: "should throw error on invalid ticket ID"
    BEGIN
        // Arrange
        adapter ← NEW WorkQueueAdapter(mockWorkQueueRepo)

        // Act & Assert
        AWAIT EXPECT(
            adapter.assignTicket('invalid', 'worker-123')
        ).rejects.toThrow('Invalid ticket ID format')
    END


    TEST: "should return queue stats with correct mapping"
    BEGIN
        // Arrange
        mockStats ← {
            pending_count: '15',
            processing_count: '3',
            completed_count: '142',
            failed_count: '2'
        }

        mockWorkQueueRepo.getQueueStats.mockResolvedValue(mockStats)
        adapter ← NEW WorkQueueAdapter(mockWorkQueueRepo)

        // Act
        result ← AWAIT adapter.getQueueStats()

        // Assert
        EXPECT(result).toEqual({
            pending: 15,
            processing: 3,
            completed: 142,
            failed: 2,
            total: 162
        })
    END


// ========================================
// HEALTH MONITOR ADAPTER TESTS
// ========================================

DESCRIBE: "HealthMonitorAdapter"

    TEST: "should start monitoring and perform initial check"
    BEGIN
        // Arrange
        mockWorkQueue ← {
            getQueueStats: JEST_FN().mockResolvedValue({
                pending: 10,
                processing: 2,
                completed: 50,
                failed: 1
            })
        }

        adapter ← NEW HealthMonitorAdapter(mockWorkQueue, 1000)

        // Act
        AWAIT adapter.start()

        // Assert
        EXPECT(adapter.running).toBe(TRUE)
        EXPECT(adapter.intervalHandle).not.toBeNull()
        EXPECT(mockWorkQueue.getQueueStats).toHaveBeenCalled()

        // Cleanup
        AWAIT adapter.stop()
    END


    TEST: "should detect high CPU usage"
    BEGIN
        // Arrange
        mockWorkQueue ← {
            getQueueStats: JEST_FN().mockResolvedValue({
                pending: 0, processing: 0, completed: 0, failed: 0
            })
        }

        adapter ← NEW HealthMonitorAdapter(mockWorkQueue)

        // Mock getCPUUsage to return high value
        JEST.SPY_ON(adapter, 'getCPUUsage').mockReturnValue(95)

        // Act
        health ← AWAIT adapter.checkHealth()

        // Assert
        EXPECT(health.healthy).toBe(FALSE)
        EXPECT(health.issues).toContain('CPU usage above 90%')
    END


    TEST: "should notify callbacks on health change"
    BEGIN
        // Arrange
        mockWorkQueue ← {
            getQueueStats: JEST_FN().mockResolvedValue({
                pending: 0, processing: 0, completed: 0, failed: 0
            })
        }

        adapter ← NEW HealthMonitorAdapter(mockWorkQueue)
        callbackSpy ← JEST_FN()

        // Act
        adapter.onHealthChange(callbackSpy)
        AWAIT adapter.start()

        // Wait for callback
        AWAIT WAIT(100)

        // Assert
        EXPECT(callbackSpy).toHaveBeenCalled()
        EXPECT(callbackSpy.mock.calls[0][0]).toHaveProperty('healthy')

        // Cleanup
        AWAIT adapter.stop()
    END


// ========================================
// WORKER SPAWNER ADAPTER TESTS
// ========================================

DESCRIBE: "WorkerSpawnerAdapter"

    TEST: "should spawn worker and track it"
    BEGIN
        // Arrange
        mockDb ← CREATE_MOCK_DATABASE()
        adapter ← NEW WorkerSpawnerAdapter(mockDb)

        ticket ← {
            id: '123',
            userId: 'user-456',
            feedId: 'post-789',
            priority: 5,
            createdAt: NEW_DATE(),
            retryCount: 0
        }

        // Act
        workerInfo ← AWAIT adapter.spawnWorker(ticket)

        // Assert
        EXPECT(workerInfo.id).toMatch(/^worker-/)
        EXPECT(workerInfo.ticketId).toBe('123')
        EXPECT(workerInfo.status).toBe('running')
        EXPECT(workerInfo.startTime).toBeInstanceOf(Date)

        // Check tracking
        activeWorkers ← AWAIT adapter.getActiveWorkers()
        EXPECT(activeWorkers).toHaveLength(1)
        EXPECT(activeWorkers[0].id).toBe(workerInfo.id)
    END


    TEST: "should terminate worker"
    BEGIN
        // Arrange
        mockDb ← CREATE_MOCK_DATABASE()
        adapter ← NEW WorkerSpawnerAdapter(mockDb)

        ticket ← { id: '123', userId: 'user-456', feedId: 'post-789',
                  priority: 5, createdAt: NEW_DATE(), retryCount: 0 }

        workerInfo ← AWAIT adapter.spawnWorker(ticket)
        workerId ← workerInfo.id

        // Act
        AWAIT adapter.terminateWorker(workerId)

        // Assert
        activeWorkers ← AWAIT adapter.getActiveWorkers()
        EXPECT(activeWorkers).toHaveLength(0)
    END


    TEST: "should wait for all workers with timeout"
    BEGIN
        // Arrange
        mockDb ← CREATE_MOCK_DATABASE()
        adapter ← NEW WorkerSpawnerAdapter(mockDb)

        // Spawn multiple workers
        ticket1 ← { id: '1', userId: 'user', feedId: 'post1',
                   priority: 5, createdAt: NEW_DATE(), retryCount: 0 }
        ticket2 ← { id: '2', userId: 'user', feedId: 'post2',
                   priority: 5, createdAt: NEW_DATE(), retryCount: 0 }

        AWAIT adapter.spawnWorker(ticket1)
        AWAIT adapter.spawnWorker(ticket2)

        // Act
        startTime ← DATE.NOW()
        AWAIT adapter.waitForAllWorkers(5000)
        elapsed ← DATE.NOW() - startTime

        // Assert
        EXPECT(elapsed).toBeLessThan(5100)  // Within timeout
    END


// ========================================
// AVI DATABASE ADAPTER TESTS
// ========================================

DESCRIBE: "AviDatabaseAdapter"

    TEST: "should save state with correct mapping"
    BEGIN
        // Arrange
        mockAviStateRepo.updateState.mockResolvedValue(undefined)
        adapter ← NEW AviDatabaseAdapter(mockAviStateRepo)

        state ← {
            status: 'running',
            startTime: NEW_DATE('2025-10-12T10:00:00Z'),
            ticketsProcessed: 42,
            workersSpawned: 38,
            activeWorkers: 3,
            lastHealthCheck: NEW_DATE('2025-10-12T10:30:00Z'),
            lastError: NULL
        }

        // Act
        AWAIT adapter.saveState(state)

        // Assert
        EXPECT(mockAviStateRepo.updateState).toHaveBeenCalledWith({
            status: 'running',
            start_time: state.startTime,
            tickets_processed: 42,
            workers_spawned: 38,
            active_workers: 3,
            last_health_check: state.lastHealthCheck,
            last_error: NULL
        })
    END


    TEST: "should load state with correct mapping"
    BEGIN
        // Arrange
        mockDbState ← {
            status: 'running',
            start_time: '2025-10-12T10:00:00Z',
            tickets_processed: 42,
            workers_spawned: 38,
            active_workers: 3,
            last_health_check: '2025-10-12T10:30:00Z',
            last_error: NULL
        }

        mockAviStateRepo.getState.mockResolvedValue(mockDbState)
        adapter ← NEW AviDatabaseAdapter(mockAviStateRepo)

        // Act
        state ← AWAIT adapter.loadState()

        // Assert
        EXPECT(state).toEqual({
            status: 'running',
            startTime: NEW_DATE('2025-10-12T10:00:00Z'),
            ticketsProcessed: 42,
            workersSpawned: 38,
            activeWorkers: 3,
            lastHealthCheck: NEW_DATE('2025-10-12T10:30:00Z'),
            lastError: UNDEFINED
        })
    END


    TEST: "should return null when no state exists"
    BEGIN
        // Arrange
        mockAviStateRepo.getState.mockResolvedValue(NULL)
        adapter ← NEW AviDatabaseAdapter(mockAviStateRepo)

        // Act
        state ← AWAIT adapter.loadState()

        // Assert
        EXPECT(state).toBeNull()
    END


    TEST: "should update metrics"
    BEGIN
        // Arrange
        mockAviStateRepo.updateState.mockResolvedValue(undefined)
        adapter ← NEW AviDatabaseAdapter(mockAviStateRepo)

        // Act
        AWAIT adapter.updateMetrics({
            ticketsProcessed: 50,
            workersSpawned: 45
        })

        // Assert
        EXPECT(mockAviStateRepo.updateState).toHaveBeenCalledWith({
            tickets_processed: 50,
            workers_spawned: 45
        })
    END
```

### 5.2 Integration Test Structure

**File:** `/api-server/tests/integration/avi/orchestrator-integration.test.js`

```
TEST SUITE: "Orchestrator Integration Tests"

// ========================================
// SETUP AND TEARDOWN
// ========================================

BEFORE_ALL:
BEGIN
    // Initialize real PostgreSQL connection
    AWAIT postgresManager.connect()

    // Run migrations
    AWAIT runMigrations()

    // Clear test data
    AWAIT clearTestData()
END

AFTER_ALL:
BEGIN
    // Clean up database
    AWAIT clearTestData()

    // Close connections
    AWAIT postgresManager.end()
END

BEFORE_EACH:
BEGIN
    // Reset database state
    AWAIT EXECUTE_SQL("TRUNCATE work_queue, avi_state CASCADE")
    AWAIT EXECUTE_SQL("INSERT INTO avi_state (id) VALUES (1)")
END


// ========================================
// INTEGRATION TESTS
// ========================================

TEST: "should initialize orchestrator with real database"
BEGIN
    // Arrange
    config ← {
        maxConcurrentWorkers: 5,
        checkInterval: 1000,
        enableHealthMonitor: TRUE,
        healthCheckInterval: 5000,
        shutdownTimeout: 10000
    }

    workQueue ← NEW WorkQueueAdapter()
    healthMonitor ← NEW HealthMonitorAdapter(workQueue)
    workerSpawner ← NEW WorkerSpawnerAdapter(postgresManager)
    database ← NEW AviDatabaseAdapter()

    // Act
    orchestrator ← NEW AviOrchestrator(
        config,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
    )

    AWAIT orchestrator.start()

    // Assert
    EXPECT(orchestrator.isRunning()).toBe(TRUE)

    // Verify state in database
    dbState ← AWAIT EXECUTE_SQL("SELECT * FROM avi_state WHERE id = 1")
    EXPECT(dbState.rows[0].status).toBe('running')

    // Cleanup
    AWAIT orchestrator.stop()
END


TEST: "should process ticket from queue to completion"
BEGIN
    // Arrange
    config ← { maxConcurrentWorkers: 5, checkInterval: 500 }

    // Create adapters
    workQueue ← NEW WorkQueueAdapter()
    healthMonitor ← NEW HealthMonitorAdapter(workQueue)
    workerSpawner ← NEW WorkerSpawnerAdapter(postgresManager)
    database ← NEW AviDatabaseAdapter()

    orchestrator ← NEW AviOrchestrator(config, workQueue, healthMonitor,
                                      workerSpawner, database)

    // Insert test ticket
    AWAIT EXECUTE_SQL(`
        INSERT INTO work_queue (user_id, post_id, post_content, priority, status)
        VALUES ('test-user', 'test-post', 'Test content', 5, 'pending')
    `)

    // Act
    AWAIT orchestrator.start()

    // Wait for processing (max 10 seconds)
    maxWait ← 10000
    startTime ← DATE.NOW()
    completed ← FALSE

    WHILE NOT completed AND (DATE.NOW() - startTime) < maxWait DO
        result ← AWAIT EXECUTE_SQL(`
            SELECT status FROM work_queue WHERE post_id = 'test-post'
        `)

        IF result.rows[0].status === 'completed' THEN
            completed ← TRUE
        ELSE
            AWAIT WAIT(500)
        END IF
    END WHILE

    // Assert
    EXPECT(completed).toBe(TRUE)

    // Verify final state
    ticket ← AWAIT EXECUTE_SQL(`
        SELECT * FROM work_queue WHERE post_id = 'test-post'
    `)

    EXPECT(ticket.rows[0].status).toBe('completed')
    EXPECT(ticket.rows[0].completed_at).not.toBeNull()

    // Cleanup
    AWAIT orchestrator.stop()
END


TEST: "should handle graceful shutdown with active workers"
BEGIN
    // Arrange
    config ← { maxConcurrentWorkers: 5, checkInterval: 1000, shutdownTimeout: 5000 }

    workQueue ← NEW WorkQueueAdapter()
    healthMonitor ← NEW HealthMonitorAdapter(workQueue)
    workerSpawner ← NEW WorkerSpawnerAdapter(postgresManager)
    database ← NEW AviDatabaseAdapter()

    orchestrator ← NEW AviOrchestrator(config, workQueue, healthMonitor,
                                      workerSpawner, database)

    // Insert multiple tickets
    FOR i FROM 1 TO 5 DO
        AWAIT EXECUTE_SQL(`
            INSERT INTO work_queue (user_id, post_id, post_content, priority, status)
            VALUES ('user', 'post-${i}', 'Content ${i}', 5, 'pending')
        `)
    END FOR

    // Start orchestrator
    AWAIT orchestrator.start()

    // Wait for workers to spawn
    AWAIT WAIT(2000)

    // Act - shutdown while workers active
    shutdownStart ← DATE.NOW()
    AWAIT orchestrator.stop()
    shutdownTime ← DATE.NOW() - shutdownStart

    // Assert
    EXPECT(shutdownTime).toBeLessThan(config.shutdownTimeout + 1000)
    EXPECT(orchestrator.isRunning()).toBe(FALSE)

    // Verify state saved
    dbState ← AWAIT EXECUTE_SQL("SELECT * FROM avi_state WHERE id = 1")
    EXPECT(dbState.rows[0].status).toBe('stopped')
END


TEST: "should persist and restore state across restarts"
BEGIN
    // Arrange - First run
    config ← { maxConcurrentWorkers: 5, checkInterval: 1000 }

    workQueue ← NEW WorkQueueAdapter()
    healthMonitor ← NEW HealthMonitorAdapter(workQueue)
    workerSpawner ← NEW WorkerSpawnerAdapter(postgresManager)
    database ← NEW AviDatabaseAdapter()

    orchestrator1 ← NEW AviOrchestrator(config, workQueue, healthMonitor,
                                       workerSpawner, database)

    AWAIT orchestrator1.start()

    // Process some tickets
    AWAIT EXECUTE_SQL(`
        INSERT INTO work_queue (user_id, post_id, post_content, priority, status)
        VALUES ('user', 'post-1', 'Content 1', 5, 'pending')
    `)

    AWAIT WAIT(2000)  // Let it process

    // Get state
    state1 ← AWAIT orchestrator1.getState()

    // Stop orchestrator
    AWAIT orchestrator1.stop()

    // Act - Second run (restart)
    orchestrator2 ← NEW AviOrchestrator(config, workQueue, healthMonitor,
                                       workerSpawner, database)
    AWAIT orchestrator2.start()

    state2 ← AWAIT orchestrator2.getState()

    // Assert
    EXPECT(state2.ticketsProcessed).toBeGreaterThanOrEqual(state1.ticketsProcessed)
    EXPECT(state2.workersSpawned).toBeGreaterThanOrEqual(state1.workersSpawned)

    // Cleanup
    AWAIT orchestrator2.stop()
END
```

---

## 6. Summary

### 6.1 Complexity Analysis

**WorkQueueAdapter:**
- Time: O(n) where n = number of pending tickets (limited to 100)
- Space: O(n) for ticket array
- Database queries: 1-3 per operation

**HealthMonitorAdapter:**
- Time: O(1) for health checks (constant system metrics)
- Space: O(k) where k = number of registered callbacks
- Interval: 30 seconds (configurable)

**WorkerSpawnerAdapter:**
- Time: O(1) per worker spawn (async execution)
- Space: O(w) where w = number of active workers
- Database queries: 3 per worker (load, update, complete/fail)

**AviDatabaseAdapter:**
- Time: O(1) per operation (single row updates)
- Space: O(1) (single state object)
- Database queries: 1 per operation

### 6.2 Implementation Checklist

- [ ] Create `/api-server/avi/avi.config.js`
- [ ] Create `/api-server/avi/adapters/` directory
- [ ] Implement `work-queue.adapter.js`
- [ ] Implement `health-monitor.adapter.js`
- [ ] Implement `worker-spawner.adapter.js`
- [ ] Implement `avi-database.adapter.js`
- [ ] Modify `/api-server/server.js` with integration code
- [ ] Add environment variables to `.env`
- [ ] Write unit tests for all adapters
- [ ] Write integration tests for orchestrator
- [ ] Test graceful shutdown
- [ ] Test error handling
- [ ] Document API endpoints
- [ ] Update README

---

**End of Pseudocode Document**
