# SPARC Phase 2: Architecture Design
## AVI Orchestrator Core Implementation

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Architecture Phase Complete
**Phase:** 3 of 5 (Architecture)

---

## Executive Summary

This document defines the complete system architecture for AVI Phase 2: Orchestrator Core. It includes class structures, component interactions, integration patterns, API designs, and deployment architecture. The design builds on Phase 1's data foundation and implements the pseudocode algorithms from Phase 2.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Class Design](#3-class-design)
4. [Integration Patterns](#4-integration-patterns)
5. [API Design](#5-api-design)
6. [Event System](#6-event-system)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Testing Architecture](#9-testing-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Express Server (server.js)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   API Routes Layer                        │  │
│  │  /api/avi/*  /api/tickets/*  /api/agents/*              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │              AVI Orchestrator Core                        │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Main Loop  │  │ Context      │  │ Worker Spawner  │  │  │
│  │  │ (Polling)  │  │ Manager      │  │                 │  │  │
│  │  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘  │  │
│  │        │                │                    │            │  │
│  │  ┌─────▼────────────────▼────────────────────▼─────────┐  │  │
│  │  │           State Manager (avi_state)                 │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │              Health Monitor                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │  │
│  │  │ Context  │  │ Database │  │ Worker Health          │  │  │
│  │  │ Checker  │  │ Checker  │  │ Checker                │  │  │
│  │  └──────────┘  └──────────┘  └────────────────────────┘  │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
           ┌─────────────▼────────────────┐
           │  Repository Layer (Phase 1)  │
           │  ┌─────────┐  ┌────────────┐ │
           │  │ Avi     │  │ Work Queue │ │
           │  │ State   │  │            │ │
           │  └────┬────┘  └─────┬──────┘ │
           │  ┌────▼─────────────▼──────┐ │
           │  │ Agent  │  Memory  │ Wksp│ │
           │  └────────┴──────────┴─────┘ │
           └──────────────┬────────────────┘
                          │
                ┌─────────▼──────────┐
                │  PostgreSQL DB     │
                │  (7 Tables)        │
                └────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Layer |
|-----------|---------------|-------|
| **AviOrchestrator** | Main coordination and lifecycle | Core |
| **TicketProcessor** | Ticket polling and processing | Core |
| **ContextManager** | Token tracking and restart triggers | Core |
| **WorkerSpawner** | Worker creation and management | Core |
| **HealthMonitor** | Health checks and auto-recovery | Monitoring |
| **AviStateRepository** | Orchestrator state persistence | Data |
| **WorkQueueRepository** | Ticket management | Data |
| **AgentRepository** | Agent template and customization | Data |
| **EventEmitter** | Internal event system | Infrastructure |

---

## 2. Component Architecture

### 2.1 Core Components

#### 2.1.1 AviOrchestrator (Main Coordinator)

**File:** `/workspaces/agent-feed/src/avi/orchestrator.ts`

**Purpose:** Central orchestration engine, lifecycle management

**Responsibilities:**
- Start/stop orchestrator
- Coordinate all subsystems
- Manage graceful restarts
- Expose status and metrics

**Dependencies:**
- TicketProcessor
- ContextManager
- WorkerSpawner
- HealthMonitor
- AviStateRepository

**Public Interface:**
```typescript
class AviOrchestrator {
  // Lifecycle
  async start(): Promise<void>
  async stop(): Promise<void>
  async restart(): Promise<void>

  // State
  getState(): AviState
  getMetrics(): AviMetrics

  // Control
  pause(): void
  resume(): void

  // Events
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
}
```

---

#### 2.1.2 TicketProcessor

**File:** `/workspaces/agent-feed/src/avi/ticket-processor.ts`

**Purpose:** Continuous ticket polling and processing

**Responsibilities:**
- Poll work queue for pending tickets
- Retrieve tickets by priority
- Coordinate worker spawning
- Track processing metrics

**Dependencies:**
- WorkQueueRepository
- WorkerSpawner
- ContextManager

**Public Interface:**
```typescript
class TicketProcessor {
  constructor(
    workQueue: WorkQueueRepository,
    workerSpawner: WorkerSpawner,
    contextManager: ContextManager,
    config: TicketProcessorConfig
  )

  async start(): Promise<void>
  async stop(): Promise<void>
  async processTickets(): Promise<void>
  getStats(): TicketStats
}
```

**Configuration:**
```typescript
interface TicketProcessorConfig {
  pollInterval: number           // Polling frequency (ms)
  maxConcurrentWorkers: number   // Worker limit
  batchSize: number              // Tickets per batch
}
```

---

#### 2.1.3 ContextManager

**File:** `/workspaces/agent-feed/src/avi/context-manager.ts`

**Purpose:** Track token usage and trigger restarts

**Responsibilities:**
- Track cumulative token usage
- Update context size in database
- Trigger restart at limit
- Estimate token costs

**Dependencies:**
- AviStateRepository
- EventEmitter

**Public Interface:**
```typescript
class ContextManager {
  constructor(
    stateRepo: AviStateRepository,
    config: ContextConfig
  )

  async addTokens(count: number): Promise<void>
  async getContextSize(): Promise<number>
  async isOverLimit(): Promise<boolean>
  estimateTokens(operation: Operation): number
  reset(): void

  // Events
  on(event: 'limit-reached', handler: () => void): void
}
```

**Configuration:**
```typescript
interface ContextConfig {
  baseContext: number      // Starting tokens (1500)
  limit: number           // Restart threshold (50000)
  safetyBuffer: number    // Buffer before limit (5000)
}
```

---

#### 2.1.4 WorkerSpawner

**File:** `/workspaces/agent-feed/src/avi/worker-spawner.ts`

**Purpose:** Create and manage ephemeral workers

**Responsibilities:**
- Spawn workers with composed context
- Track active workers
- Handle worker completion/failure
- Enforce worker limits

**Dependencies:**
- AgentRepository
- MemoryRepository
- WorkQueueRepository
- Anthropic SDK

**Public Interface:**
```typescript
class WorkerSpawner {
  constructor(
    agentRepo: AgentRepository,
    memoryRepo: MemoryRepository,
    workQueue: WorkQueueRepository,
    config: WorkerSpawnerConfig
  )

  async spawnWorker(ticket: WorkTicket): Promise<Worker>
  async getActiveWorkers(): Promise<Worker[]>
  async waitForWorker(workerId: string, timeout: number): Promise<void>
  async waitForAllWorkers(timeout: number): Promise<void>
  async terminateWorker(workerId: string): Promise<void>
}
```

**Configuration:**
```typescript
interface WorkerSpawnerConfig {
  maxConcurrentWorkers: number
  workerTimeout: number
  anthropicApiKey: string
  modelName: string
}
```

---

#### 2.1.5 Worker (Ephemeral Agent)

**File:** `/workspaces/agent-feed/src/avi/worker.ts`

**Purpose:** Process single ticket with full agent context

**Responsibilities:**
- Execute agent logic for ticket
- Generate response/post
- Save memory after completion
- Report status to spawner

**Lifecycle:**
```
Created → Running → (Success/Failure) → Destroyed
```

**Public Interface:**
```typescript
class Worker {
  readonly id: string
  readonly ticketId: number
  readonly agentName: string
  readonly startTime: Date

  async execute(): Promise<WorkerResult>
  async terminate(): Promise<void>
  getStatus(): WorkerStatus
}

interface WorkerResult {
  success: boolean
  output?: any
  error?: Error
  tokensUsed: number
  duration: number
}
```

---

### 2.2 Monitoring Components

#### 2.2.1 HealthMonitor

**File:** `/workspaces/agent-feed/src/avi/health-monitor.ts`

**Purpose:** Continuous health monitoring and auto-recovery

**Responsibilities:**
- Periodic health checks
- Detect unhealthy conditions
- Trigger recovery actions
- Emit health events

**Dependencies:**
- AviStateRepository
- WorkQueueRepository
- WorkerSpawner
- PostgresManager

**Public Interface:**
```typescript
class HealthMonitor {
  constructor(
    stateRepo: AviStateRepository,
    workQueue: WorkQueueRepository,
    workerSpawner: WorkerSpawner,
    database: PostgresManager,
    config: HealthConfig
  )

  async start(): Promise<void>
  async stop(): Promise<void>
  async checkHealth(): Promise<HealthStatus>
  getCurrentStatus(): HealthStatus
  on(event: 'health-change', handler: (status: HealthStatus) => void): void
}
```

**Health Checks:**
```typescript
interface HealthStatus {
  healthy: boolean
  timestamp: Date
  checks: {
    context: CheckResult      // Context size check
    database: CheckResult     // DB connectivity
    workers: CheckResult      // Worker health
    queue: CheckResult        // Queue depth
  }
  issues: HealthIssue[]
}

interface CheckResult {
  passed: boolean
  message?: string
  severity?: 'info' | 'warning' | 'critical'
}

interface HealthIssue {
  type: string
  severity: 'warning' | 'critical'
  message: string
  timestamp: Date
}
```

---

## 3. Class Design

### 3.1 AviOrchestrator Class Structure

```typescript
// src/avi/orchestrator.ts

export class AviOrchestrator extends EventEmitter {
  // Configuration
  private readonly config: AviConfig

  // Components
  private readonly ticketProcessor: TicketProcessor
  private readonly contextManager: ContextManager
  private readonly workerSpawner: WorkerSpawner
  private readonly healthMonitor: HealthMonitor

  // Repositories
  private readonly stateRepo: AviStateRepository
  private readonly workQueue: WorkQueueRepository

  // State
  private state: AviState
  private running: boolean = false
  private shuttingDown: boolean = false

  // Timers
  private mainLoopTimer?: NodeJS.Timeout
  private stateUpdateTimer?: NodeJS.Timeout

  constructor(config: AviConfig, dependencies: AviDependencies) {
    super()

    this.config = this.validateConfig(config)
    this.stateRepo = dependencies.stateRepo
    this.workQueue = dependencies.workQueue

    // Initialize components
    this.contextManager = new ContextManager(
      this.stateRepo,
      config.contextConfig
    )

    this.workerSpawner = new WorkerSpawner(
      dependencies.agentRepo,
      dependencies.memoryRepo,
      this.workQueue,
      config.workerConfig
    )

    this.ticketProcessor = new TicketProcessor(
      this.workQueue,
      this.workerSpawner,
      this.contextManager,
      config.ticketConfig
    )

    this.healthMonitor = new HealthMonitor(
      this.stateRepo,
      this.workQueue,
      this.workerSpawner,
      dependencies.database,
      config.healthConfig
    )

    // Wire up events
    this.setupEventHandlers()
  }

  // Lifecycle methods
  public async start(): Promise<void>
  public async stop(): Promise<void>
  public async restart(): Promise<void>

  // State methods
  public getState(): AviState
  public getMetrics(): AviMetrics

  // Control methods
  public pause(): void
  public resume(): void

  // Private methods
  private async loadState(): Promise<void>
  private async saveState(): Promise<void>
  private setupEventHandlers(): void
  private async triggerGracefulRestart(): Promise<void>
  private validateConfig(config: AviConfig): AviConfig
}
```

### 3.2 Configuration Interfaces

```typescript
// src/avi/types/config.ts

export interface AviConfig {
  // Orchestrator
  checkInterval: number                // Poll interval (5000ms)
  shutdownTimeout: number              // Worker shutdown timeout (30000ms)

  // Context
  contextConfig: ContextConfig

  // Tickets
  ticketConfig: TicketProcessorConfig

  // Workers
  workerConfig: WorkerSpawnerConfig

  // Health
  healthConfig: HealthConfig

  // Features
  enableHealthMonitor: boolean
  enableMetrics: boolean
}

export interface ContextConfig {
  baseContext: number        // 1500 tokens
  limit: number             // 50000 tokens
  safetyBuffer: number      // 5000 tokens
}

export interface TicketProcessorConfig {
  pollInterval: number           // 5000ms
  maxConcurrentWorkers: number   // 10
  batchSize: number             // 10
}

export interface WorkerSpawnerConfig {
  maxConcurrentWorkers: number   // 10
  workerTimeout: number         // 300000ms (5 min)
  anthropicApiKey: string
  modelName: string             // claude-sonnet-4-5
  maxTokens: number            // 4096
}

export interface HealthConfig {
  checkInterval: number         // 30000ms
  contextLimitPercent: number   // 0.95 (95%)
  stuckWorkerTimeout: number    // 1800000ms (30 min)
  maxQueueDepth: number         // 100
}
```

### 3.3 State Interfaces

```typescript
// src/avi/types/state.ts

export interface AviState {
  // Status
  status: OrchestratorStatus
  startTime: Date
  lastRestart?: Date

  // Metrics
  contextSize: number
  activeWorkers: number
  workersSpawned: number
  ticketsProcessed: number

  // Positions
  lastFeedPosition?: string
  pendingTickets?: string[]

  // Health
  lastHealthCheck?: Date
  lastError?: string
}

export type OrchestratorStatus =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'restarting'
  | 'stopped'

export interface AviMetrics {
  orchestrator: {
    status: OrchestratorStatus
    uptime: number              // seconds
    contextSize: number
    contextUtilization: number  // percentage
  }
  workers: {
    active: number
    spawned: number
    averageDuration: number     // milliseconds
  }
  tickets: {
    pending: number
    processing: number
    completed: number
    failed: number
    successRate: number         // percentage
  }
  health: {
    healthy: boolean
    lastCheck: Date
    issues: HealthIssue[]
  }
}
```

---

## 4. Integration Patterns

### 4.1 Repository Integration

```typescript
// src/avi/integration/repository-adapter.ts

export class RepositoryAdapter {
  constructor(
    private stateRepo: AviStateRepository,
    private workQueue: WorkQueueRepository,
    private agentRepo: AgentRepository,
    private memoryRepo: MemoryRepository,
    private workspaceRepo: WorkspaceRepository
  ) {}

  // State operations
  async loadOrchestratorState(): Promise<AviState | null>
  async saveOrchestratorState(state: AviState): Promise<void>
  async updateContextSize(size: number): Promise<void>
  async incrementMetric(metric: string): Promise<void>

  // Ticket operations
  async getNextTickets(limit: number): Promise<WorkTicket[]>
  async assignTicket(ticketId: number, workerId: string): Promise<void>
  async completeTicket(ticketId: number, result: any): Promise<void>
  async failTicket(ticketId: number, error: string): Promise<void>

  // Agent operations
  async getAgentTemplate(name: string): Promise<AgentTemplate>
  async getUserCustomization(userId: string, agentName: string): Promise<UserCustomization | null>
  async composeAgentContext(ticket: WorkTicket): Promise<AgentContext>

  // Memory operations
  async getRelevantMemories(userId: string, agentName: string, limit: number): Promise<Memory[]>
  async saveMemory(memory: MemoryCreate): Promise<void>
}
```

### 4.2 Server Startup Integration

```typescript
// api-server/server.js (integration point)

import { AviOrchestrator } from './src/avi/orchestrator.js'
import { createAviDependencies } from './src/avi/setup.js'

class Server {
  private app: Express
  private orchestrator?: AviOrchestrator

  async start() {
    // ... existing server setup ...

    // Initialize AVI orchestrator
    if (process.env.ENABLE_AVI === 'true') {
      await this.startAviOrchestrator()
    }

    // ... start express server ...
  }

  private async startAviOrchestrator() {
    try {
      console.log('Initializing AVI Orchestrator...')

      // Create dependencies
      const dependencies = createAviDependencies()

      // Load configuration
      const config = this.loadAviConfig()

      // Create orchestrator
      this.orchestrator = new AviOrchestrator(config, dependencies)

      // Setup event handlers
      this.orchestrator.on('started', () => {
        console.log('AVI Orchestrator started successfully')
      })

      this.orchestrator.on('error', (error) => {
        console.error('AVI Orchestrator error:', error)
      })

      this.orchestrator.on('restart', () => {
        console.log('AVI Orchestrator restarting...')
      })

      // Start orchestrator
      await this.orchestrator.start()

    } catch (error) {
      console.error('Failed to start AVI Orchestrator:', error)
      // Server continues without orchestrator
    }
  }

  private loadAviConfig(): AviConfig {
    return {
      checkInterval: parseInt(process.env.AVI_CHECK_INTERVAL || '5000'),
      shutdownTimeout: parseInt(process.env.AVI_SHUTDOWN_TIMEOUT || '30000'),
      contextConfig: {
        baseContext: 1500,
        limit: parseInt(process.env.AVI_CONTEXT_LIMIT || '50000'),
        safetyBuffer: 5000
      },
      ticketConfig: {
        pollInterval: 5000,
        maxConcurrentWorkers: parseInt(process.env.AVI_MAX_WORKERS || '10'),
        batchSize: 10
      },
      workerConfig: {
        maxConcurrentWorkers: parseInt(process.env.AVI_MAX_WORKERS || '10'),
        workerTimeout: 300000,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
        modelName: process.env.AVI_MODEL || 'claude-sonnet-4-5-20250929',
        maxTokens: 4096
      },
      healthConfig: {
        checkInterval: 30000,
        contextLimitPercent: 0.95,
        stuckWorkerTimeout: 1800000,
        maxQueueDepth: 100
      },
      enableHealthMonitor: process.env.AVI_ENABLE_HEALTH_MONITOR !== 'false',
      enableMetrics: true
    }
  }

  async stop() {
    // Stop AVI orchestrator gracefully
    if (this.orchestrator) {
      console.log('Stopping AVI Orchestrator...')
      await this.orchestrator.stop()
    }

    // ... stop express server ...
  }
}
```

### 4.3 Dependency Injection

```typescript
// src/avi/setup.ts

import aviStateRepo from '../api-server/repositories/postgres/avi-state.repository.js'
import workQueueRepo from '../api-server/repositories/postgres/work-queue.repository.js'
import agentRepo from '../api-server/repositories/postgres/agent.repository.js'
import memoryRepo from '../api-server/repositories/postgres/memory.repository.js'
import workspaceRepo from '../api-server/repositories/postgres/workspace.repository.js'
import postgresManager from '../api-server/config/postgres.js'

export interface AviDependencies {
  stateRepo: AviStateRepository
  workQueue: WorkQueueRepository
  agentRepo: AgentRepository
  memoryRepo: MemoryRepository
  workspaceRepo: WorkspaceRepository
  database: PostgresManager
}

export function createAviDependencies(): AviDependencies {
  return {
    stateRepo: aviStateRepo,
    workQueue: workQueueRepo,
    agentRepo: agentRepo,
    memoryRepo: memoryRepo,
    workspaceRepo: workspaceRepo,
    database: postgresManager
  }
}
```

---

## 5. API Design

### 5.1 REST API Endpoints

```typescript
// api-server/routes/avi.routes.ts

import { Router } from 'express'
import { AviController } from '../controllers/avi.controller.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
const controller = new AviController()

// Public endpoints (authenticated)
router.get('/status', requireAuth, controller.getStatus)
router.get('/metrics', requireAuth, controller.getMetrics)

// Admin endpoints
router.post('/restart', requireAdmin, controller.restart)
router.post('/pause', requireAdmin, controller.pause)
router.post('/resume', requireAdmin, controller.resume)
router.post('/tickets', requireAdmin, controller.createTicket)

// Health endpoint (internal)
router.get('/health', controller.health)

export default router
```

### 5.2 Controller Implementation

```typescript
// api-server/controllers/avi.controller.ts

export class AviController {
  private orchestrator: AviOrchestrator

  constructor(orchestrator: AviOrchestrator) {
    this.orchestrator = orchestrator
  }

  // GET /api/avi/status
  async getStatus(req: Request, res: Response) {
    try {
      const state = this.orchestrator.getState()

      res.json({
        success: true,
        data: {
          status: state.status,
          uptime: Math.floor((Date.now() - state.startTime.getTime()) / 1000),
          contextSize: state.contextSize,
          activeWorkers: state.activeWorkers,
          ticketsProcessed: state.ticketsProcessed,
          workersSpawned: state.workersSpawned,
          lastHealthCheck: state.lastHealthCheck,
          lastError: state.lastError
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // GET /api/avi/metrics
  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.orchestrator.getMetrics()

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // POST /api/avi/restart
  async restart(req: Request, res: Response) {
    try {
      await this.orchestrator.restart()

      res.json({
        success: true,
        message: 'Orchestrator restart initiated'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // POST /api/avi/pause
  async pause(req: Request, res: Response) {
    try {
      this.orchestrator.pause()

      res.json({
        success: true,
        message: 'Orchestrator paused'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // POST /api/avi/resume
  async resume(req: Request, res: Response) {
    try {
      this.orchestrator.resume()

      res.json({
        success: true,
        message: 'Orchestrator resumed'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // POST /api/avi/tickets
  async createTicket(req: Request, res: Response) {
    try {
      const ticket = await workQueueRepo.createTicket(req.body)

      res.json({
        success: true,
        data: ticket
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  // GET /api/avi/health
  async health(req: Request, res: Response) {
    try {
      const state = this.orchestrator.getState()

      if (state.status === 'running' || state.status === 'paused') {
        res.json({ healthy: true })
      } else {
        res.status(503).json({ healthy: false })
      }
    } catch (error) {
      res.status(503).json({ healthy: false })
    }
  }
}
```

---

## 6. Event System

### 6.1 Event Architecture

```typescript
// src/avi/events.ts

export enum AviEvent {
  // Lifecycle events
  STARTED = 'started',
  STOPPED = 'stopped',
  RESTARTING = 'restarting',
  PAUSED = 'paused',
  RESUMED = 'resumed',

  // Ticket events
  TICKET_RECEIVED = 'ticket:received',
  TICKET_ASSIGNED = 'ticket:assigned',
  TICKET_COMPLETED = 'ticket:completed',
  TICKET_FAILED = 'ticket:failed',

  // Worker events
  WORKER_SPAWNED = 'worker:spawned',
  WORKER_STARTED = 'worker:started',
  WORKER_COMPLETED = 'worker:completed',
  WORKER_FAILED = 'worker:failed',
  WORKER_TERMINATED = 'worker:terminated',

  // Context events
  CONTEXT_UPDATED = 'context:updated',
  CONTEXT_LIMIT_WARNING = 'context:limit-warning',
  CONTEXT_LIMIT_REACHED = 'context:limit-reached',

  // Health events
  HEALTH_CHECK = 'health:check',
  HEALTH_WARNING = 'health:warning',
  HEALTH_CRITICAL = 'health:critical',
  HEALTH_RECOVERED = 'health:recovered',

  // Error events
  ERROR = 'error',
  FATAL_ERROR = 'fatal-error'
}

export interface AviEventPayload {
  [AviEvent.STARTED]: { timestamp: Date }
  [AviEvent.STOPPED]: { timestamp: Date, graceful: boolean }
  [AviEvent.TICKET_RECEIVED]: { ticket: WorkTicket }
  [AviEvent.WORKER_SPAWNED]: { workerId: string, ticketId: number }
  [AviEvent.CONTEXT_UPDATED]: { oldSize: number, newSize: number, delta: number }
  [AviEvent.HEALTH_WARNING]: { issues: HealthIssue[] }
  [AviEvent.ERROR]: { error: Error, context: any }
  // ... more event payloads
}
```

### 6.2 Event Emitter Integration

```typescript
// src/avi/orchestrator.ts (event methods)

export class AviOrchestrator extends EventEmitter {
  // Emit typed events
  private emitTyped<E extends AviEvent>(
    event: E,
    payload: AviEventPayload[E]
  ): void {
    this.emit(event, payload)
  }

  // Example usage
  async start(): Promise<void> {
    // ... start logic ...

    this.emitTyped(AviEvent.STARTED, {
      timestamp: new Date()
    })
  }

  private async handleTicketReceived(ticket: WorkTicket): Promise<void> {
    this.emitTyped(AviEvent.TICKET_RECEIVED, { ticket })

    // ... process ticket ...
  }

  private async handleContextUpdate(oldSize: number, newSize: number): Promise<void> {
    this.emitTyped(AviEvent.CONTEXT_UPDATED, {
      oldSize,
      newSize,
      delta: newSize - oldSize
    })

    if (newSize >= this.config.contextConfig.limit * 0.9) {
      this.emitTyped(AviEvent.CONTEXT_LIMIT_WARNING, {
        currentSize: newSize,
        limit: this.config.contextConfig.limit
      })
    }
  }
}
```

### 6.3 Event Handlers

```typescript
// Example: Logging event handler
orchestrator.on(AviEvent.WORKER_SPAWNED, ({ workerId, ticketId }) => {
  console.log(`Worker ${workerId} spawned for ticket ${ticketId}`)
})

// Example: Metrics event handler
orchestrator.on(AviEvent.TICKET_COMPLETED, async ({ ticket, result }) => {
  await metricsService.recordTicketCompletion({
    ticketId: ticket.id,
    duration: Date.now() - ticket.createdAt.getTime(),
    success: true
  })
})

// Example: Alert event handler
orchestrator.on(AviEvent.HEALTH_CRITICAL, ({ issues }) => {
  alertService.sendAlert({
    severity: 'critical',
    message: 'AVI Orchestrator health critical',
    issues: issues
  })
})
```

---

## 7. Deployment Architecture

### 7.1 Docker Integration

```yaml
# docker-compose.yml (updated)

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      # Database
      - DATABASE_URL=postgresql://postgres:password@db:5432/avidm

      # Anthropic
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

      # AVI Configuration
      - ENABLE_AVI=true
      - AVI_CHECK_INTERVAL=5000
      - AVI_CONTEXT_LIMIT=50000
      - AVI_MAX_WORKERS=10
      - AVI_SHUTDOWN_TIMEOUT=30000
      - AVI_ENABLE_HEALTH_MONITOR=true
      - AVI_HEALTH_CHECK_INTERVAL=30000
      - AVI_MODEL=claude-sonnet-4-5-20250929

      # Logging
      - LOG_LEVEL=info

    depends_on:
      db:
        condition: service_healthy

    restart: unless-stopped

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/avi/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=avidm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### 7.2 Process Management

```typescript
// api-server/server.js (process signals)

class Server {
  async start() {
    // ... start server and orchestrator ...

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      this.stop().then(() => process.exit(1))
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
      this.stop().then(() => process.exit(1))
    })
  }

  async stop() {
    try {
      // Stop orchestrator first (waits for workers)
      if (this.orchestrator) {
        await this.orchestrator.stop()
      }

      // Then stop HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve)
        })
      }

      console.log('Server stopped successfully')
    } catch (error) {
      console.error('Error during shutdown:', error)
      throw error
    }
  }
}
```

---

## 8. Security Architecture

### 8.1 3-Tier Data Protection Enforcement

```typescript
// src/avi/security/context-validator.ts

export class ContextValidator {
  /**
   * Validate user customization doesn't override protected fields
   */
  validateCustomization(
    customization: UserCustomization,
    template: AgentTemplate
  ): ValidationResult {
    const protectedFields = [
      'model',
      'posting_rules',
      'api_schema',
      'safety_constraints'
    ]

    const violations: string[] = []

    for (const field of protectedFields) {
      if (customization.hasOwnProperty(field)) {
        violations.push(field)
      }
    }

    if (violations.length > 0) {
      return {
        valid: false,
        error: `Cannot override protected fields: ${violations.join(', ')}`
      }
    }

    // Additional validation
    if (customization.personality && customization.personality.length > 5000) {
      return {
        valid: false,
        error: 'Personality text exceeds maximum length (5000 characters)'
      }
    }

    if (customization.interests && customization.interests.length > 50) {
      return {
        valid: false,
        error: 'Too many interests (maximum 50)'
      }
    }

    return { valid: true }
  }

  /**
   * Compose agent context with protection enforcement
   */
  async composeProtectedContext(
    ticket: WorkTicket,
    template: AgentTemplate,
    customization: UserCustomization | null,
    memories: Memory[]
  ): Promise<AgentContext> {
    // Validate customization first
    if (customization) {
      const validation = this.validateCustomization(customization, template)
      if (!validation.valid) {
        throw new SecurityError(validation.error)
      }
    }

    // Compose context with TIER 1 protection
    return {
      // TIER 1: Protected (immutable)
      model: template.model,
      postingRules: template.posting_rules,
      apiSchema: template.api_schema,
      safetyConstraints: template.safety_constraints,

      // TIER 2: Customizable
      personality: customization?.personality || template.default_personality,
      interests: customization?.interests || [],
      responseStyle: customization?.response_style || template.default_response_style,

      // TIER 3: Context
      agentName: customization?.custom_name || template.name,
      memories: memories,
      ticket: ticket,

      // Metadata
      templateVersion: template.version,
      composedAt: new Date()
    }
  }
}
```

### 8.2 API Security

```typescript
// api-server/middleware/auth.ts

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Implement authentication check
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const user = verifyToken(token)
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

// Rate limiting for orchestrator control
export const aviControlRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many orchestrator control requests'
})
```

---

## 9. Testing Architecture

### 9.1 Test Structure

```
/workspaces/agent-feed/
├── src/
│   └── avi/
│       ├── __tests__/
│       │   ├── unit/
│       │   │   ├── orchestrator.test.ts
│       │   │   ├── ticket-processor.test.ts
│       │   │   ├── context-manager.test.ts
│       │   │   ├── worker-spawner.test.ts
│       │   │   └── health-monitor.test.ts
│       │   ├── integration/
│       │   │   ├── full-workflow.test.ts
│       │   │   ├── graceful-restart.test.ts
│       │   │   ├── worker-lifecycle.test.ts
│       │   │   └── error-recovery.test.ts
│       │   └── e2e/
│       │       ├── stress-test.test.ts
│       │       └── 24hour-run.test.ts
│       └── __mocks__/
│           ├── mock-repositories.ts
│           └── mock-workers.ts
└── api-server/
    └── tests/
        └── integration/
            └── avi-api.test.ts
```

### 9.2 Test Configuration

```typescript
// vitest.config.ts (for avi tests)

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'avi-orchestrator',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/avi/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks', // Isolate tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/avi/**/*.ts'],
      exclude: ['**/__tests__/**', '**/__mocks__/**'],
      all: true,
      lines: 100,
      functions: 100,
      branches: 95,
      statements: 100
    }
  }
})
```

### 9.3 Test Helpers

```typescript
// src/avi/__tests__/helpers/test-orchestrator.ts

export class TestOrchestrator {
  /**
   * Create orchestrator with test dependencies
   */
  static async create(config?: Partial<AviConfig>): Promise<AviOrchestrator> {
    const testDb = await createTestDatabase()
    await seedTestData(testDb)

    const dependencies = createTestDependencies(testDb)

    const defaultConfig: AviConfig = {
      checkInterval: 1000, // Faster for tests
      shutdownTimeout: 5000,
      contextConfig: {
        baseContext: 1500,
        limit: 10000, // Lower limit for tests
        safetyBuffer: 1000
      },
      ticketConfig: {
        pollInterval: 1000,
        maxConcurrentWorkers: 3,
        batchSize: 5
      },
      workerConfig: {
        maxConcurrentWorkers: 3,
        workerTimeout: 10000,
        anthropicApiKey: 'test-key',
        modelName: 'claude-sonnet-4-5',
        maxTokens: 4096
      },
      healthConfig: {
        checkInterval: 5000,
        contextLimitPercent: 0.95,
        stuckWorkerTimeout: 60000,
        maxQueueDepth: 50
      },
      enableHealthMonitor: true,
      enableMetrics: true,
      ...config
    }

    return new AviOrchestrator(defaultConfig, dependencies)
  }

  /**
   * Wait for orchestrator to reach specific state
   */
  static async waitForState(
    orchestrator: AviOrchestrator,
    targetState: OrchestratorStatus,
    timeout: number = 10000
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const state = orchestrator.getState()
      if (state.status === targetState) {
        return
      }
      await sleep(100)
    }

    throw new Error(`Timeout waiting for state: ${targetState}`)
  }

  /**
   * Clean up test orchestrator
   */
  static async cleanup(orchestrator: AviOrchestrator): Promise<void> {
    await orchestrator.stop()
    await cleanupTestDatabase()
  }
}
```

---

## 10. File Structure

```
/workspaces/agent-feed/
├── src/
│   └── avi/
│       ├── orchestrator.ts                 # Main orchestrator
│       ├── ticket-processor.ts             # Ticket polling
│       ├── context-manager.ts              # Context tracking
│       ├── worker-spawner.ts               # Worker creation
│       ├── worker.ts                       # Worker implementation
│       ├── health-monitor.ts               # Health monitoring
│       │
│       ├── types/
│       │   ├── config.ts                   # Configuration interfaces
│       │   ├── state.ts                    # State interfaces
│       │   ├── events.ts                   # Event types
│       │   └── index.ts                    # Exports
│       │
│       ├── integration/
│       │   ├── repository-adapter.ts       # Repository integration
│       │   └── server-integration.ts       # Server integration
│       │
│       ├── security/
│       │   ├── context-validator.ts        # 3-tier validation
│       │   └── rate-limiter.ts             # Rate limiting
│       │
│       ├── setup.ts                        # Dependency injection
│       │
│       └── __tests__/
│           ├── unit/
│           ├── integration/
│           ├── e2e/
│           └── helpers/
│
└── api-server/
    ├── routes/
    │   └── avi.routes.ts                   # AVI API routes
    ├── controllers/
    │   └── avi.controller.ts               # AVI controllers
    └── middleware/
        └── avi-auth.ts                     # AVI authentication
```

---

## 11. Summary

### Architectural Highlights

1. **Modular Design:** Clear separation of concerns with dedicated components
2. **Event-Driven:** Internal communication via typed event system
3. **Dependency Injection:** Loose coupling for testability
4. **Repository Pattern:** Abstracted data access
5. **3-Tier Protection:** Security enforced at architecture level
6. **Health Monitoring:** Built-in self-healing capabilities
7. **Graceful Degradation:** Continue operation despite partial failures

### Integration Points

- Express server integration
- Repository layer (Phase 1)
- PostgreSQL database
- Anthropic Claude API
- Health monitoring dashboard (future)
- Metrics collection (future)

### Next Phase

**Document:** SPARC-PHASE2-REFINEMENT.md
**Focus:** TDD implementation, test-first development, code quality

---

*End of Architecture Document*
