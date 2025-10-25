# Phase 2 Orchestrator Integration Specification

**Version:** 1.0
**Date:** 2025-10-12
**Status:** Phase 2 Implementation (60% → 100%)
**Methodology:** SPARC Specification Phase

---

## Executive Summary

This specification defines the complete integration requirements for Phase 2 of the AVI Architecture: the Orchestrator Core. Phase 1 (Database) and Phase 3 (Agent Workers) are 100% complete and tested. Phase 2 components exist but are not integrated into the server runtime.

**Current Status:**
- ✅ Phase 1: 100% Complete (37+ tests, all databases, repositories functional)
- ⚠️ Phase 2: 60% Complete (components exist, not integrated with server)
- ✅ Phase 3: 100% Complete (79 tests, all worker components functional)

**Critical Gap:** The orchestrator main loop (`/src/avi/orchestrator.ts`) exists but is not started with the Express server. All components work independently but need the orchestrator to connect them for autonomous operation.

---

## 1. System Requirements

### 1.1 Functional Requirements

**FR-2.1: Orchestrator Startup**
- **ID:** FR-2.1
- **Priority:** Critical
- **Description:** Orchestrator shall start automatically with Express server
- **Acceptance Criteria:**
  - Orchestrator initializes before server listens on port
  - Loads previous state from database on startup
  - Recovers pending tickets from graceful shutdown
  - Logs successful initialization
  - Fails gracefully with clear error messages

**FR-2.2: Work Queue Integration**
- **ID:** FR-2.2
- **Priority:** High
- **Description:** Orchestrator shall integrate with PostgreSQL work queue
- **Acceptance Criteria:**
  - Uses `work-queue.repository.js` for database operations
  - Polls for pending tickets every 5 seconds (configurable)
  - Respects priority ordering (high → medium → low)
  - Handles queue empty state gracefully
  - Supports concurrent worker limits

**FR-2.3: Worker Spawning**
- **ID:** FR-2.3
- **Priority:** High
- **Description:** Orchestrator shall spawn agent workers on demand
- **Acceptance Criteria:**
  - Creates worker for each pending ticket
  - Respects `maxConcurrentWorkers` configuration
  - Tracks active worker count
  - Assigns tickets to workers atomically
  - Handles worker completion callbacks

**FR-2.4: Health Monitoring**
- **ID:** FR-2.4
- **Priority:** Medium
- **Description:** Orchestrator shall monitor system health
- **Acceptance Criteria:**
  - Checks orchestrator health every 30 seconds
  - Monitors context size (trigger restart at 50K tokens)
  - Tracks worker pool utilization
  - Logs health metrics to database
  - Triggers graceful restart when needed

**FR-2.5: Graceful Shutdown**
- **ID:** FR-2.5
- **Priority:** High
- **Description:** Orchestrator shall shut down gracefully
- **Acceptance Criteria:**
  - Receives SIGTERM/SIGINT signals
  - Stops accepting new tickets
  - Waits for active workers to complete (30s timeout)
  - Saves state to database
  - Terminates cleanly without data loss

### 1.2 Non-Functional Requirements

**NFR-2.1: Performance**
- **ID:** NFR-2.1
- **Category:** Performance
- **Description:** Orchestrator startup time < 3 seconds
- **Measurement:** Time from initialization to first ticket poll

**NFR-2.2: Reliability**
- **ID:** NFR-2.2
- **Category:** Reliability
- **Description:** 99.9% uptime for orchestrator process
- **Measurement:** (total_time - downtime) / total_time

**NFR-2.3: Resource Usage**
- **ID:** NFR-2.3
- **Category:** Resource
- **Description:** Orchestrator memory usage < 200MB
- **Measurement:** Node.js process.memoryUsage().heapUsed

**NFR-2.4: Scalability**
- **ID:** NFR-2.4
- **Category:** Scalability
- **Description:** Support up to 50 concurrent workers
- **Measurement:** Worker pool size without performance degradation

---

## 2. Component Integration Map

### 2.1 Existing Components

```
Phase 1 (Database Layer) - ✅ COMPLETE
├── /api-server/repositories/postgres/
│   ├── avi-state.repository.js (320 lines, fully functional)
│   ├── work-queue.repository.js (436 lines, fully functional)
│   └── feed.repository.js (multiple repositories working)
├── /api-server/config/postgres.js (connection pooling)
└── Database tables (all migrations complete)

Phase 2 (Orchestrator) - ⚠️ 60% COMPLETE
├── /src/avi/orchestrator.ts (287 lines, TypeScript class exists)
├── /src/types/avi.ts (175 lines, interface definitions)
├── /src/feed/feed-monitor.ts (305 lines, working)
└── /src/monitoring/ (health monitoring files exist)

Phase 3 (Workers) - ✅ COMPLETE
├── /src/worker/agent-worker.ts (242 lines, fully functional)
├── /src/worker/response-generator.ts (190 lines, 11 tests)
├── /src/worker/memory-updater.ts (230 lines, 15 tests)
└── /src/queue/work-ticket.ts (255 lines, queue implementation)

Express Server - ⚠️ NEEDS INTEGRATION
└── /api-server/server.js (1000+ lines, orchestrator not started)
```

### 2.2 Integration Points

```typescript
// Required integration flow
[Express Server Startup]
    ↓
[Initialize Database Connection] ← Already working
    ↓
[Seed System Templates] ← Already working
    ↓
[Create Orchestrator Instance] ← MISSING
    ↓
[Start Orchestrator Main Loop] ← MISSING
    ↓
[Mount API Routes]
    ↓
[Listen on Port]
```

---

## 3. Data Flow Architecture

### 3.1 Post Detection → Ticket Creation Flow

```mermaid
graph TD
    A[Feed Monitor] -->|Polls RSS Feeds| B{New Posts?}
    B -->|Yes| C[Parse Feed Items]
    B -->|No| A
    C --> D[Store in feed_items Table]
    D --> E[Create Work Ticket]
    E --> F[Insert into work_queue Table]
    F --> G[Set status = 'pending']
    G --> H[Orchestrator Polls Queue]
```

**Implementation:**
- Feed Monitor: `/src/feed/feed-monitor.ts` (already working)
- Work Queue: `/api-server/repositories/postgres/work-queue.repository.js`
- Orchestrator polling: Needs integration in main loop

### 3.2 Ticket → Worker → Response Flow

```mermaid
graph TD
    A[Orchestrator Main Loop] -->|Every 5s| B[Query Pending Tickets]
    B --> C{Tickets Available?}
    C -->|No| A
    C -->|Yes| D{Workers Available?}
    D -->|No| A
    D -->|Yes| E[Get Next Ticket by Priority]
    E --> F[Spawn Agent Worker]
    F --> G[Assign Ticket to Worker]
    G --> H[Worker Executes]
    H --> I[Generate Response]
    I --> J[Store in agent_responses]
    J --> K[Update ticket status = 'completed']
    K --> L[Update agent_memories]
    L --> M[Worker Terminates]
    M --> A
```

**Implementation:**
- Orchestrator loop: `/src/avi/orchestrator.ts:239-245` (startMainLoop method)
- Worker spawning: `/src/avi/orchestrator.ts:215-234` (spawnWorkerForTicket method)
- Worker execution: `/src/worker/agent-worker.ts:30-115` (executeTicket method)

### 3.3 Error Handling Flow

```mermaid
graph TD
    A[Worker Fails] --> B[Store Error in agent_responses]
    B --> C{Retry Count < 3?}
    C -->|Yes| D[Increment retry_count]
    D --> E[Reset ticket to 'pending']
    E --> F[Orchestrator Picks Up Again]
    C -->|No| G[Mark ticket as 'failed']
    G --> H[Log to error_log Table]
    H --> I[Notify User via API]
```

---

## 4. Interface Contracts

### 4.1 Adapter Implementations Required

#### 4.1.1 IWorkQueue Adapter

**Interface:** `/src/types/avi.ts:74-82`

**Implementation Required:** `/src/adapters/postgres-work-queue.adapter.ts`

```typescript
/**
 * PostgreSQL Work Queue Adapter
 * Wraps work-queue.repository.js for TypeScript orchestrator
 */
import type { IWorkQueue, PendingTicket, QueueStats } from '../types/avi';
import workQueueRepo from '../../api-server/repositories/postgres/work-queue.repository.js';

export class PostgresWorkQueueAdapter implements IWorkQueue {
  /**
   * Get pending tickets from work_queue table
   * Maps database schema to orchestrator interface
   */
  async getPendingTickets(): Promise<PendingTicket[]> {
    const dbTickets = await workQueueRepo.getTicketsByStatus('pending', {
      limit: 100,
      orderBy: 'priority DESC, created_at ASC'
    });

    return dbTickets.map(ticket => ({
      id: ticket.id.toString(),
      userId: ticket.user_id,
      feedId: ticket.post_id, // Maps to post_id in work_queue
      priority: ticket.priority,
      createdAt: new Date(ticket.created_at),
      retryCount: ticket.retry_count || 0
    }));
  }

  /**
   * Assign ticket to worker
   * Updates work_queue status to 'assigned'
   */
  async assignTicket(ticketId: string, workerId: string): Promise<void> {
    await workQueueRepo.assignTicket(parseInt(ticketId), workerId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const stats = await workQueueRepo.getQueueStats();

    return {
      pending: parseInt(stats.pending_count),
      processing: parseInt(stats.processing_count),
      completed: parseInt(stats.completed_count),
      failed: parseInt(stats.failed_count)
    };
  }
}
```

**Acceptance Criteria:**
- ✅ Implements all IWorkQueue interface methods
- ✅ Uses existing work-queue.repository.js
- ✅ Maps database schema to TypeScript types
- ✅ Handles errors gracefully
- ✅ No duplicate ticket assignments

#### 4.1.2 IHealthMonitor Adapter

**Interface:** `/src/types/avi.ts:109-118`

**Implementation Required:** `/src/adapters/health-monitor.adapter.ts`

```typescript
/**
 * Health Monitor Adapter
 * Monitors orchestrator and system health
 */
import type { IHealthMonitor, HealthStatus } from '../types/avi';
import os from 'os';

export class HealthMonitorAdapter implements IHealthMonitor {
  private intervalHandle?: NodeJS.Timeout;
  private healthCallbacks: Array<(status: HealthStatus) => void> = [];
  private checkInterval: number = 30000; // 30 seconds

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    this.intervalHandle = setInterval(async () => {
      const status = await this.checkHealth();
      this.notifyCallbacks(status);
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  /**
   * Check current health status
   */
  async checkHealth(): Promise<HealthStatus> {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    const memUsage = process.memoryUsage();
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const issues: string[] = [];

    if (cpuUsage > 0.8) {
      issues.push('High CPU usage');
    }

    if (memoryUsage > 80) {
      issues.push('High memory usage');
    }

    return {
      healthy: issues.length === 0,
      timestamp: new Date(),
      metrics: {
        cpuUsage,
        memoryUsage,
        activeWorkers: 0, // Will be set by orchestrator
        queueDepth: 0     // Will be set by orchestrator
      },
      issues: issues.length > 0 ? issues : undefined
    };
  }

  /**
   * Register health check callback
   */
  onHealthChange(callback: (status: HealthStatus) => void): void {
    this.healthCallbacks.push(callback);
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(status: HealthStatus): void {
    for (const callback of this.healthCallbacks) {
      try {
        callback(status);
      } catch (error) {
        console.error('Health callback error:', error);
      }
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Monitors CPU and memory usage
- ✅ Configurable check interval
- ✅ Callback mechanism for health changes
- ✅ Graceful start/stop
- ✅ No crashes on callback errors

#### 4.1.3 IWorkerSpawner Adapter

**Interface:** `/src/types/avi.ts:137-147`

**Implementation Required:** `/src/adapters/worker-spawner.adapter.ts`

```typescript
/**
 * Worker Spawner Adapter
 * Spawns and manages ephemeral agent workers
 */
import type { IWorkerSpawner, PendingTicket, WorkerInfo } from '../types/avi';
import { AgentWorker } from '../worker/agent-worker';
import type { DatabaseManager } from '../types/database-manager';
import { v4 as uuidv4 } from 'uuid';

export class WorkerSpawnerAdapter implements IWorkerSpawner {
  private activeWorkers: Map<string, WorkerInfo> = new Map();
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Spawn a new worker for a ticket
   */
  async spawnWorker(ticket: PendingTicket): Promise<WorkerInfo> {
    const workerId = uuidv4();
    const workerInfo: WorkerInfo = {
      id: workerId,
      ticketId: ticket.id,
      status: 'spawning',
      startTime: new Date()
    };

    this.activeWorkers.set(workerId, workerInfo);

    // Spawn worker in background (don't await)
    this.executeWorker(workerId, ticket).catch(error => {
      console.error(`Worker ${workerId} failed:`, error);
      workerInfo.status = 'failed';
      workerInfo.error = error.message;
      workerInfo.endTime = new Date();
    });

    workerInfo.status = 'running';
    return workerInfo;
  }

  /**
   * Execute worker (background task)
   */
  private async executeWorker(workerId: string, ticket: PendingTicket): Promise<void> {
    const workerInfo = this.activeWorkers.get(workerId);
    if (!workerInfo) return;

    try {
      // Load ticket details from work_queue
      const dbTicket = await this.db.query(`
        SELECT * FROM work_queue WHERE id = $1
      `, [parseInt(ticket.id)]);

      if (dbTicket.rows.length === 0) {
        throw new Error('Ticket not found in database');
      }

      const row = dbTicket.rows[0];
      const workTicket = {
        id: row.id.toString(),
        type: 'post_response',
        priority: row.priority,
        agentName: row.assigned_agent,
        userId: row.user_id,
        payload: row.post_metadata || { feedItemId: row.post_id },
        createdAt: new Date(row.created_at),
        status: row.status
      };

      // Create and execute agent worker
      const worker = new AgentWorker(this.db);
      const result = await worker.executeTicket(workTicket);

      // Update worker status
      workerInfo.status = result.success ? 'completed' : 'failed';
      workerInfo.endTime = new Date();

      if (!result.success) {
        workerInfo.error = result.error;
      }

      // Remove from active workers after 1 second (allow status query)
      setTimeout(() => {
        this.activeWorkers.delete(workerId);
      }, 1000);

    } catch (error) {
      workerInfo.status = 'failed';
      workerInfo.error = error instanceof Error ? error.message : 'Unknown error';
      workerInfo.endTime = new Date();

      setTimeout(() => {
        this.activeWorkers.delete(workerId);
      }, 1000);
    }
  }

  /**
   * Get active workers
   */
  async getActiveWorkers(): Promise<WorkerInfo[]> {
    return Array.from(this.activeWorkers.values());
  }

  /**
   * Terminate a specific worker
   */
  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.activeWorkers.get(workerId);
    if (worker) {
      worker.status = 'failed';
      worker.error = 'Terminated by orchestrator';
      worker.endTime = new Date();
      this.activeWorkers.delete(workerId);
    }
  }

  /**
   * Wait for all workers to complete
   */
  async waitForAllWorkers(timeout: number): Promise<void> {
    const startTime = Date.now();

    while (this.activeWorkers.size > 0) {
      if (Date.now() - startTime > timeout) {
        console.warn(`Timeout waiting for ${this.activeWorkers.size} workers`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Spawns workers in background
- ✅ Tracks worker lifecycle
- ✅ Handles worker failures
- ✅ Supports graceful termination
- ✅ Timeout mechanism for shutdown

#### 4.1.4 IAviDatabase Adapter

**Interface:** `/src/types/avi.ts:164-174`

**Implementation Required:** `/src/adapters/avi-database.adapter.ts`

```typescript
/**
 * Avi Database Adapter
 * Wraps avi-state.repository.js for TypeScript orchestrator
 */
import type { IAviDatabase, AviState } from '../types/avi';
import aviStateRepo from '../../api-server/repositories/postgres/avi-state.repository.js';

export class AviDatabaseAdapter implements IAviDatabase {
  /**
   * Save orchestrator state
   */
  async saveState(state: AviState): Promise<void> {
    await aviStateRepo.updateState({
      status: state.status,
      start_time: state.startTime,
      tickets_processed: state.ticketsProcessed,
      workers_spawned: state.workersSpawned,
      active_workers: state.activeWorkers,
      last_health_check: state.lastHealthCheck || null,
      last_error: state.lastError || null
    });
  }

  /**
   * Load orchestrator state
   */
  async loadState(): Promise<AviState | null> {
    const dbState = await aviStateRepo.getState();

    if (!dbState) {
      return null;
    }

    return {
      status: dbState.status as any,
      startTime: new Date(dbState.start_time),
      ticketsProcessed: dbState.tickets_processed || 0,
      workersSpawned: dbState.workers_spawned || 0,
      activeWorkers: dbState.active_workers || 0,
      lastHealthCheck: dbState.last_health_check ? new Date(dbState.last_health_check) : undefined,
      lastError: dbState.last_error || undefined
    };
  }

  /**
   * Update metrics
   */
  async updateMetrics(metrics: {
    ticketsProcessed?: number;
    workersSpawned?: number;
  }): Promise<void> {
    const updates: any = {};

    if (metrics.ticketsProcessed !== undefined) {
      updates.tickets_processed = metrics.ticketsProcessed;
    }

    if (metrics.workersSpawned !== undefined) {
      updates.workers_spawned = metrics.workersSpawned;
    }

    await aviStateRepo.updateState(updates);
  }
}
```

**Acceptance Criteria:**
- ✅ Uses existing avi-state.repository.js
- ✅ Maps TypeScript types to database schema
- ✅ Handles null state gracefully
- ✅ Supports partial metric updates
- ✅ No data loss on save/load cycle

---

## 5. Server Startup Integration

### 5.1 Integration Code

**File:** `/api-server/server.js`

**Location:** After database initialization, before route mounting

**Implementation:**

```javascript
// Import orchestrator components
import { AviOrchestrator } from '../src/avi/orchestrator.js';
import { PostgresWorkQueueAdapter } from '../src/adapters/postgres-work-queue.adapter.js';
import { HealthMonitorAdapter } from '../src/adapters/health-monitor.adapter.js';
import { WorkerSpawnerAdapter } from '../src/adapters/worker-spawner.adapter.js';
import { AviDatabaseAdapter } from '../src/adapters/avi-database.adapter.js';

// Global orchestrator instance (for graceful shutdown)
let orchestrator = null;

// Initialize orchestrator after database connection
if (process.env.USE_POSTGRES === 'true') {
  try {
    console.log('🚀 Initializing AVI Orchestrator...');

    // Create adapters
    const workQueue = new PostgresWorkQueueAdapter();
    const healthMonitor = new HealthMonitorAdapter();
    const workerSpawner = new WorkerSpawnerAdapter(dbSelector.getDatabase());
    const database = new AviDatabaseAdapter();

    // Configure orchestrator
    const config = {
      maxConcurrentWorkers: parseInt(process.env.MAX_CONCURRENT_WORKERS || '10'),
      checkInterval: parseInt(process.env.ORCHESTRATOR_CHECK_INTERVAL || '5000'),
      shutdownTimeout: parseInt(process.env.ORCHESTRATOR_SHUTDOWN_TIMEOUT || '30000'),
      enableHealthMonitor: process.env.ENABLE_HEALTH_MONITOR !== 'false'
    };

    // Create orchestrator instance
    orchestrator = new AviOrchestrator(
      config,
      workQueue,
      healthMonitor,
      workerSpawner,
      database
    );

    // Start orchestrator
    await orchestrator.start();
    console.log('✅ AVI Orchestrator started successfully');
    console.log(`   - Max workers: ${config.maxConcurrentWorkers}`);
    console.log(`   - Check interval: ${config.checkInterval}ms`);
    console.log(`   - Health monitoring: ${config.enableHealthMonitor ? 'enabled' : 'disabled'}`);

  } catch (error) {
    console.error('❌ Failed to start AVI Orchestrator:', error);
    console.error('   Server will start but orchestrator is offline');
  }
}

// ... existing route mounting code ...

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new requests
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Stop orchestrator
  if (orchestrator) {
    try {
      console.log('⏳ Stopping orchestrator...');
      await orchestrator.stop();
      console.log('✅ Orchestrator stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping orchestrator:', error);
    }
  }

  // Close database connections
  if (db) {
    try {
      db.close();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (orchestrator) {
    console.log('🤖 AVI Orchestrator is active and monitoring work queue');
  }
});
```

### 5.2 Environment Variables

**File:** `.env`

**Required Variables:**

```bash
# Orchestrator Configuration
MAX_CONCURRENT_WORKERS=10              # Maximum concurrent agent workers
ORCHESTRATOR_CHECK_INTERVAL=5000       # Queue polling interval (ms)
ORCHESTRATOR_SHUTDOWN_TIMEOUT=30000    # Graceful shutdown timeout (ms)
ENABLE_HEALTH_MONITOR=true             # Enable health monitoring

# Database Configuration (already exists)
USE_POSTGRES=true
DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_feed

# Claude API (already exists)
ANTHROPIC_API_KEY=sk-ant-...
```

**Optional Variables:**

```bash
# Advanced Orchestrator Configuration
CONTEXT_BLOAT_THRESHOLD=50000          # Context size restart trigger (tokens)
WORKER_TIMEOUT=300000                  # Worker execution timeout (ms)
HEALTH_CHECK_INTERVAL=30000            # Health check frequency (ms)
```

---

## 6. Configuration Management

### 6.1 Configuration Schema

**File:** `/src/types/avi.ts` (add AviConfig interface)

```typescript
/**
 * Avi Orchestrator Configuration
 */
export interface AviConfig {
  /** Maximum concurrent workers */
  maxConcurrentWorkers?: number;
  /** Queue check interval in milliseconds */
  checkInterval: number;
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeout?: number;
  /** Enable health monitoring */
  enableHealthMonitor?: boolean;
  /** Context size threshold for restart (tokens) */
  contextBloatThreshold?: number;
  /** Worker execution timeout (milliseconds) */
  workerTimeout?: number;
}
```

### 6.2 Configuration Validation

**File:** `/src/utils/config-validator.ts`

```typescript
/**
 * Validate orchestrator configuration
 * Throws error if configuration is invalid
 */
export function validateOrchestratorConfig(config: AviConfig): void {
  if (config.maxConcurrentWorkers !== undefined) {
    if (config.maxConcurrentWorkers < 1 || config.maxConcurrentWorkers > 100) {
      throw new Error('maxConcurrentWorkers must be between 1 and 100');
    }
  }

  if (config.checkInterval < 1000 || config.checkInterval > 60000) {
    throw new Error('checkInterval must be between 1000ms and 60000ms');
  }

  if (config.shutdownTimeout !== undefined) {
    if (config.shutdownTimeout < 5000 || config.shutdownTimeout > 120000) {
      throw new Error('shutdownTimeout must be between 5000ms and 120000ms');
    }
  }
}
```

---

## 7. Error Handling Requirements

### 7.1 Startup Errors

**Scenario:** Database connection failure

**Handling:**
```typescript
try {
  await orchestrator.start();
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Database connection failed. Check DATABASE_URL');
    process.exit(1); // Fatal error
  } else {
    console.error('Orchestrator failed to start:', error);
    // Continue without orchestrator (degraded mode)
  }
}
```

**Acceptance Criteria:**
- ✅ Fatal errors exit process
- ✅ Non-fatal errors log warning
- ✅ Server continues in degraded mode if possible

### 7.2 Runtime Errors

**Scenario:** Worker spawning fails

**Handling:**
```typescript
// In orchestrator.ts:215-234
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Failed to spawn worker for ticket ${ticket.id}:`, errorMessage);
  this.state.lastError = errorMessage;

  // Mark ticket as failed with retry logic
  await this.workQueue.failTicket(ticket.id, error);
}
```

**Acceptance Criteria:**
- ✅ Worker failures don't crash orchestrator
- ✅ Failed tickets marked for retry
- ✅ Errors logged to database
- ✅ User notified after max retries

### 7.3 Shutdown Errors

**Scenario:** Workers don't complete within timeout

**Handling:**
```typescript
// In orchestrator.ts:139-148
try {
  await this.workerSpawner.waitForAllWorkers(this.config.shutdownTimeout!);
} catch (error) {
  console.error('Error waiting for workers during shutdown:', error);
  // Force terminate remaining workers
  const activeWorkers = await this.workerSpawner.getActiveWorkers();
  for (const worker of activeWorkers) {
    await this.workerSpawner.terminateWorker(worker.id);
  }
}
```

**Acceptance Criteria:**
- ✅ Timeout mechanism enforced
- ✅ Remaining workers force-terminated
- ✅ State saved before exit
- ✅ No data loss on shutdown

---

## 8. Test Requirements

### 8.1 Unit Tests

**Test File:** `/tests/phase2/unit/orchestrator-integration.test.ts`

**Test Cases:**

```typescript
describe('Orchestrator Integration - Unit Tests', () => {
  describe('Adapter Implementations', () => {
    test('PostgresWorkQueueAdapter.getPendingTickets', async () => {
      // Test ticket retrieval
      // Verify mapping from database schema
      // Check priority ordering
    });

    test('HealthMonitorAdapter.checkHealth', async () => {
      // Test health metrics collection
      // Verify callback mechanism
      // Check threshold detection
    });

    test('WorkerSpawnerAdapter.spawnWorker', async () => {
      // Test worker creation
      // Verify background execution
      // Check status tracking
    });

    test('AviDatabaseAdapter.saveState/loadState', async () => {
      // Test state persistence
      // Verify data integrity
      // Check null handling
    });
  });

  describe('Configuration Validation', () => {
    test('Valid configuration accepted', () => {
      // Test valid config passes
    });

    test('Invalid maxConcurrentWorkers rejected', () => {
      // Test bounds checking
    });

    test('Missing required fields rejected', () => {
      // Test required field validation
    });
  });
});
```

### 8.2 Integration Tests

**Test File:** `/tests/phase2/integration/orchestrator-e2e.test.ts`

**Test Cases:**

```typescript
describe('Orchestrator End-to-End Integration', () => {
  beforeAll(async () => {
    // Start real PostgreSQL database
    // Seed test data
    // Initialize orchestrator
  });

  afterAll(async () => {
    // Stop orchestrator gracefully
    // Clean up database
  });

  test('E2E: Post detection → ticket → worker → response', async () => {
    // 1. Insert feed item
    // 2. Wait for orchestrator to create ticket
    // 3. Verify worker spawned
    // 4. Check response generated
    // 5. Validate memory updated
    // Real database, real HTTP, no mocks
  });

  test('Graceful shutdown with active workers', async () => {
    // 1. Create pending tickets
    // 2. Spawn workers
    // 3. Initiate shutdown
    // 4. Verify workers complete
    // 5. Check state saved
  });

  test('Health monitoring triggers restart', async () => {
    // 1. Simulate high memory usage
    // 2. Wait for health check
    // 3. Verify graceful restart
    // 4. Check state restored
  });

  test('Worker failure and retry', async () => {
    // 1. Create ticket with bad feed item
    // 2. Worker fails
    // 3. Verify retry logic
    // 4. Check error logging
  });
});
```

### 8.3 Acceptance Tests

**Test File:** `/tests/phase2/acceptance/orchestrator-acceptance.test.ts`

**Test Scenarios:**

```typescript
describe('Orchestrator Acceptance Tests', () => {
  test('FR-2.1: Orchestrator starts with server', async () => {
    // Start server
    // Verify orchestrator initialized
    // Check logs for success message
    // Confirm state loaded from database
  });

  test('FR-2.2: Work queue integration', async () => {
    // Create 10 pending tickets
    // Wait for orchestrator to process
    // Verify all tickets assigned
    // Check priority ordering respected
  });

  test('FR-2.3: Worker spawning', async () => {
    // Create tickets
    // Monitor worker count
    // Verify maxConcurrentWorkers limit
    // Check worker completion callbacks
  });

  test('FR-2.4: Health monitoring', async () => {
    // Start orchestrator
    // Wait 60 seconds
    // Check health metrics logged
    // Verify no false alarms
  });

  test('FR-2.5: Graceful shutdown', async () => {
    // Start orchestrator with active workers
    // Send SIGTERM
    // Wait for shutdown
    // Verify clean termination
    // Check state saved to database
  });

  test('NFR-2.1: Performance - Startup time', async () => {
    const start = Date.now();
    await orchestrator.start();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000); // < 3 seconds
  });

  test('NFR-2.2: Reliability - 24 hour uptime', async () => {
    // Run orchestrator for 24 hours
    // Monitor crashes/restarts
    // Calculate uptime percentage
    // Expect >= 99.9%
  });
});
```

---

## 9. Acceptance Criteria

### 9.1 Phase 2 Completion Checklist

**Code Implementation:**
- [ ] All 4 adapters implemented (IWorkQueue, IHealthMonitor, IWorkerSpawner, IAviDatabase)
- [ ] Server.js integration code added
- [ ] Environment variables documented
- [ ] Configuration validation added
- [ ] Error handling implemented
- [ ] Graceful shutdown handlers registered

**Testing:**
- [ ] 20+ unit tests passing (adapters, config)
- [ ] 10+ integration tests passing (E2E flows)
- [ ] 8+ acceptance tests passing (requirements)
- [ ] No mocks used (real database, real HTTP)
- [ ] Test coverage > 80% for orchestrator code

**Documentation:**
- [ ] This specification document complete
- [ ] README updated with orchestrator startup
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide created

**Validation:**
- [ ] Orchestrator starts automatically with server
- [ ] Feed items create tickets automatically
- [ ] Workers spawn and execute successfully
- [ ] Responses stored in database
- [ ] Health monitoring active
- [ ] Graceful shutdown works correctly
- [ ] No memory leaks after 24 hours
- [ ] No database connection leaks

### 9.2 Success Criteria

**System is considered complete when:**

1. **Autonomous Operation:** Orchestrator runs continuously without manual intervention
2. **End-to-End Flow:** Posts → Tickets → Workers → Responses (fully automated)
3. **Reliability:** 99.9% uptime over 7 days
4. **Performance:** < 30 seconds from post detection to response generation
5. **Resource Usage:** < 200MB memory, < 5% CPU (idle)
6. **Error Recovery:** Automatic retry on failures, graceful degradation
7. **Data Integrity:** No lost tickets, no duplicate responses
8. **Observability:** Metrics logged, health status visible

---

## 10. Migration Path

### 10.1 Current State Assessment

```
Phase 1: ✅ Complete (Database layer working)
Phase 2: ⚠️ 60% Complete
  ✅ TypeScript orchestrator class exists
  ✅ Interface definitions complete
  ✅ Feed monitor working
  ❌ Adapters not implemented
  ❌ Server integration missing
  ❌ No startup code
Phase 3: ✅ Complete (Worker execution working)
```

### 10.2 Implementation Order

**Step 1: Create Adapters (2-3 hours)**
- Implement PostgresWorkQueueAdapter
- Implement HealthMonitorAdapter
- Implement WorkerSpawnerAdapter
- Implement AviDatabaseAdapter
- Write unit tests for each adapter

**Step 2: Server Integration (1-2 hours)**
- Add import statements to server.js
- Add orchestrator initialization code
- Add environment variable loading
- Add graceful shutdown handlers
- Test server startup/shutdown

**Step 3: Configuration (30 minutes)**
- Update .env file
- Add configuration validation
- Document all variables
- Test with various configs

**Step 4: Testing (4-6 hours)**
- Write integration tests
- Write acceptance tests
- Run full test suite
- Fix any failures
- Verify no regressions

**Step 5: Documentation (1 hour)**
- Update README
- Create troubleshooting guide
- Document API endpoints
- Add deployment notes

**Total Estimated Time:** 8-12 hours

### 10.3 Rollback Plan

**If integration fails:**

1. Comment out orchestrator startup code in server.js
2. Server continues running without orchestrator (degraded mode)
3. Manual ticket processing still possible via API
4. No data loss (database unchanged)
5. Fix issues and re-enable

---

## 11. Monitoring & Observability

### 11.1 Metrics to Track

**Orchestrator Metrics:**
- Uptime (seconds)
- Context size (tokens)
- Active workers (count)
- Queued tickets (count)
- Processed tickets (total)
- Worker utilization (percentage)
- Error rate (errors/hour)

**Performance Metrics:**
- Startup time (ms)
- Ticket processing time (ms)
- Worker spawn time (ms)
- Database query time (ms)
- Memory usage (MB)
- CPU usage (percentage)

### 11.2 Logging Strategy

**Log Levels:**
- `INFO`: Normal operations (startup, shutdown, ticket processing)
- `WARN`: Non-fatal errors (ticket retry, health issues)
- `ERROR`: Fatal errors (database failure, startup failure)
- `DEBUG`: Detailed flow (ticket assignment, worker spawning)

**Log Format:**
```
[timestamp] [level] [component] message
[2025-10-12T10:30:00Z] [INFO] [Orchestrator] Started successfully
[2025-10-12T10:30:05Z] [DEBUG] [WorkQueue] Found 3 pending tickets
[2025-10-12T10:30:06Z] [INFO] [WorkerSpawner] Spawned worker abc-123 for ticket 456
```

### 11.3 Health Check API

**Endpoint:** `GET /api/avi/health`

**Response:**
```json
{
  "status": "healthy",
  "orchestrator": {
    "running": true,
    "uptime": 3600,
    "contextSize": 1500,
    "activeWorkers": 3,
    "queuedTickets": 5
  },
  "database": {
    "connected": true,
    "responseTime": 15
  },
  "health": {
    "cpuUsage": 0.15,
    "memoryUsage": 45.2,
    "issues": []
  }
}
```

---

## 12. Security Considerations

### 12.1 Environment Variables

**Sensitive Data:**
- `ANTHROPIC_API_KEY` - Never log or expose
- `DATABASE_URL` - Contains database credentials
- Store in `.env` file (gitignored)
- Use secrets manager in production

### 12.2 Database Access

**Protection:**
- Use connection pooling (already implemented)
- Parameterized queries only (prevent SQL injection)
- Row-level security for multi-user data
- Regular backups (automated)

### 12.3 Worker Isolation

**Sandboxing:**
- Workers run in separate execution context
- No file system access outside workspace
- API rate limiting enforced
- Timeout mechanisms prevent runaway workers

---

## 13. Future Enhancements

**Phase 2+:**
- [ ] Multi-node orchestrator (horizontal scaling)
- [ ] Redis-backed work queue (faster than PostgreSQL)
- [ ] WebSocket API for real-time status
- [ ] Prometheus metrics export
- [ ] Grafana dashboard templates
- [ ] Auto-scaling based on queue depth
- [ ] Circuit breaker pattern for external APIs
- [ ] Dead letter queue for failed tickets

---

## Appendix A: File Structure

```
/workspaces/agent-feed/
├── src/
│   ├── adapters/                      # NEW - Phase 2 adapters
│   │   ├── postgres-work-queue.adapter.ts
│   │   ├── health-monitor.adapter.ts
│   │   ├── worker-spawner.adapter.ts
│   │   └── avi-database.adapter.ts
│   ├── avi/
│   │   └── orchestrator.ts            # EXISTS - Main orchestrator class
│   ├── types/
│   │   └── avi.ts                     # EXISTS - Interface definitions
│   ├── worker/
│   │   └── agent-worker.ts            # EXISTS - Worker execution
│   ├── feed/
│   │   └── feed-monitor.ts            # EXISTS - Feed polling
│   └── utils/
│       └── config-validator.ts        # NEW - Config validation
├── api-server/
│   ├── server.js                      # MODIFY - Add orchestrator startup
│   └── repositories/postgres/
│       ├── avi-state.repository.js    # EXISTS - State persistence
│       └── work-queue.repository.js   # EXISTS - Queue operations
├── tests/
│   └── phase2/
│       ├── unit/
│       │   └── orchestrator-integration.test.ts  # NEW
│       ├── integration/
│       │   └── orchestrator-e2e.test.ts          # NEW
│       └── acceptance/
│           └── orchestrator-acceptance.test.ts   # NEW
├── .env                               # MODIFY - Add orchestrator config
└── PHASE-2-ORCHESTRATOR-SPECIFICATION.md  # THIS FILE
```

---

## Appendix B: Dependencies

**Required NPM Packages:**

```json
{
  "dependencies": {
    "uuid": "^9.0.0",          // For worker IDs
    "express": "^4.18.0",      // Already installed
    "pg": "^8.11.0"            // Already installed
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0",   // TypeScript types
    "vitest": "^1.0.0",        // Already installed
    "@types/node": "^20.0.0"   // Already installed
  }
}
```

---

## Appendix C: Database Schema Reference

**Relevant Tables:**

```sql
-- Orchestrator state (single row, id=1)
CREATE TABLE avi_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  status VARCHAR(20) DEFAULT 'stopped',
  start_time TIMESTAMP,
  tickets_processed INTEGER DEFAULT 0,
  workers_spawned INTEGER DEFAULT 0,
  active_workers INTEGER DEFAULT 0,
  last_health_check TIMESTAMP,
  last_error TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Work queue (tickets for agent workers)
CREATE TABLE work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT,
  assigned_agent VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  worker_id VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  post_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent responses (worker output)
CREATE TABLE agent_responses (
  id SERIAL PRIMARY KEY,
  work_ticket_id INTEGER REFERENCES work_queue(id),
  feed_item_id VARCHAR(100),
  agent_name VARCHAR(100),
  user_id VARCHAR(100),
  response_content TEXT,
  response_metadata JSONB,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  validation_results JSONB,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Document Control

**Version History:**
- v1.0 (2025-10-12): Initial specification document

**Approvals:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] QA Lead

**Change Log:**
- 2025-10-12: Document created from architecture plan and code analysis

**Related Documents:**
- AVI-ARCHITECTURE-PLAN.md (overall architecture)
- PHASE-1-COMPLETION-REPORT.md (database completion)
- PHASE-3-FINAL-REPORT.md (worker completion)

---

**End of Specification**
