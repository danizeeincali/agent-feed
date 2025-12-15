# Phase 2: Avi DM Orchestrator & Agent Workers Architecture

**Version:** 2.0
**Date:** 2025-10-10
**Phase:** Phase 2 - Orchestrator & Worker Implementation
**Dependencies:** Phase 1 Complete (Database & Core Infrastructure)

---

## Executive Summary

Phase 2 implements the **Avi DM orchestrator** and **ephemeral agent workers** on top of the Phase 1 database foundation. This phase brings the system to life with:

- **Persistent Avi DM** - Always-on orchestrator that monitors feeds and manages work
- **Ephemeral Agent Workers** - Short-lived Claude instances that execute specific tasks
- **Context Composition** - Smart loading of agent context from Phase 1 database
- **Health Monitoring** - Automatic detection and recovery from context bloat
- **Work Ticket System** - Queue-based task distribution

**Key Principles:**
- ✅ **Token Efficiency** - Minimal context reloading, ephemeral workers
- ✅ **Zero Downtime** - Graceful restarts preserve state
- ✅ **Data Protection** - 3-tier security model from Phase 1
- ✅ **Fault Tolerance** - Isolation between Avi and workers

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [File Structure](#file-structure)
3. [Component Design](#component-design)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Integration Points](#integration-points)
7. [Implementation Sequence](#implementation-sequence)
8. [Testing Strategy](#testing-strategy)

---

## System Architecture Overview

### High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Docker Container (always running)                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Health Monitor (30s interval)                         │ │
│  │  ├─> Monitor Avi context size                          │ │
│  │  ├─> Trigger graceful restart on bloat (>50K tokens)   │ │
│  │  └─> Database health checks                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐ │
│  │  Avi DM Orchestrator (persistent, lightweight)        │ │
│  │  Context: ~1-2K tokens baseline                       │ │
│  │  ├─> Main Loop: Feed monitoring                       │ │
│  │  ├─> Work Ticket Creation                             │ │
│  │  ├─> Worker Spawning                                  │ │
│  │  └─> State Management (avi_state table)               │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                                                  │
│           ├─── spawns ────┐                                 │
│           │                │                                 │
│  ┌────────▼──────┐  ┌─────▼──────────┐                     │
│  │ Agent Worker  │  │ Agent Worker   │  (ephemeral)        │
│  │ Lifespan: 30s │  │ Lifespan: 45s  │                     │
│  │ ├─ Load ctx   │  │ ├─ Load ctx    │                     │
│  │ ├─ Execute    │  │ ├─ Execute     │                     │
│  │ ├─ Save memory│  │ ├─ Save memory │                     │
│  │ └─ Destroy    │  │ └─ Destroy     │                     │
│  └───────────────┘  └────────────────┘                     │
│           │                │                                 │
│           └────────────────┴─── posts/saves ────────────┐   │
└───────────────────────────────────────────────────────┼───┘
                                                        │
                            ┌───────────────────────────▼─────┐
                            │  PostgreSQL Database            │
                            │  ├─> system_agent_templates     │
                            │  ├─> user_agent_customizations  │
                            │  ├─> agent_memories             │
                            │  ├─> agent_workspaces           │
                            │  ├─> avi_state                  │
                            │  └─> error_log                  │
                            └─────────────────────────────────┘
```

### Execution Flow

```
User Post → Feed → Avi DM detects → Creates Work Ticket → Spawns Worker
                                                              │
                          ┌───────────────────────────────────┘
                          │
                          ▼
              Worker loads context (DB)
                          │
                          ▼
              Worker generates response
                          │
                          ▼
              Worker saves memory (DB)
                          │
                          ▼
              Worker posts response
                          │
                          ▼
              Worker destroys (cleanup)
```

---

## File Structure

### Complete Phase 2 Directory Layout

```
/workspaces/agent-feed/
├── src/
│   ├── avi/                              # NEW: Avi DM orchestrator
│   │   ├── orchestrator.ts               # Main orchestrator class
│   │   ├── health-monitor.ts             # Context bloat detection
│   │   ├── state-manager.ts              # Avi state persistence
│   │   └── types.ts                      # Avi-specific types
│   │
│   ├── workers/                          # NEW: Ephemeral agent workers
│   │   ├── agent-worker.ts               # Worker class (ephemeral)
│   │   ├── worker-spawner.ts             # Spawn management
│   │   ├── worker-pool.ts                # Worker lifecycle tracking
│   │   └── types.ts                      # Worker-specific types
│   │
│   ├── queue/                            # NEW: Work ticket system
│   │   ├── work-ticket.ts                # Ticket creation & management
│   │   ├── priority-queue.ts             # Priority-based queue
│   │   └── types.ts                      # Queue-specific types
│   │
│   ├── integration/                      # NEW: Phase 1 integration layer
│   │   ├── orchestrator-db.ts            # Avi ↔ Database integration
│   │   ├── worker-db.ts                  # Worker ↔ Database integration
│   │   └── context-loader.ts             # Context composition wrapper
│   │
│   ├── database/                         # FROM PHASE 1
│   │   ├── context-composer.ts           # ✅ Implemented in Phase 1
│   │   ├── queries/
│   │   │   ├── templates.ts              # ✅ System template queries
│   │   │   ├── customizations.ts         # ✅ User customization queries
│   │   │   └── memories.ts               # NEW: Memory queries for workers
│   │   └── schema/
│   │       └── 001_initial_schema.sql    # ✅ Phase 1 schema
│   │
│   ├── types/                            # FROM PHASE 1 + NEW
│   │   ├── agent-context.ts              # ✅ Phase 1
│   │   ├── database.ts                   # ✅ Phase 1
│   │   ├── database-manager.ts           # ✅ Phase 1
│   │   ├── orchestrator.ts               # NEW: Orchestrator types
│   │   ├── worker.ts                     # NEW: Worker types
│   │   └── work-ticket.ts                # NEW: Work ticket types
│   │
│   ├── utils/                            # FROM PHASE 1
│   │   ├── validation.ts                 # ✅ Phase 1
│   │   └── logger.ts                     # NEW: Logging utilities
│   │
│   └── index.ts                          # NEW: Main application entry
│
├── config/                               # FROM PHASE 1
│   └── system/
│       └── agent-templates/              # ✅ System templates
│
├── tests/                                # NEW: Phase 2 tests
│   └── phase2/
│       ├── unit/
│       │   ├── orchestrator.test.ts
│       │   ├── worker.test.ts
│       │   └── work-ticket.test.ts
│       └── integration/
│           ├── spawning.test.ts
│           ├── context-loading.test.ts
│           └── health-monitor.test.ts
│
├── docker-compose.phase2.yml             # NEW: Phase 2 Docker config
└── PHASE-2-ARCHITECTURE.md               # THIS DOCUMENT
```

---

## Component Design

### 1. Avi DM Orchestrator (`src/avi/orchestrator.ts`)

#### Responsibilities

1. **Feed Monitoring** - Continuously check for new posts/events
2. **Work Distribution** - Create and queue work tickets
3. **Worker Management** - Spawn and track ephemeral workers
4. **State Persistence** - Save state to database for restarts
5. **Health Self-Monitoring** - Track context size

#### Class Structure

```typescript
/**
 * Avi DM Orchestrator
 * Persistent, lightweight coordinator for ephemeral agent workers
 */
export class AviOrchestrator {
  private db: DatabaseManager;
  private workQueue: PriorityQueue<WorkTicket>;
  private workerPool: WorkerPool;
  private stateManager: StateManager;
  private contextSize: number;
  private startTime: number;
  private isRunning: boolean;

  constructor(config: AviConfig) {
    this.db = config.db;
    this.workQueue = new PriorityQueue<WorkTicket>();
    this.workerPool = new WorkerPool(config.maxWorkers);
    this.stateManager = new StateManager(this.db);
    this.contextSize = 1500; // Base context
    this.startTime = Date.now();
    this.isRunning = false;
  }

  /**
   * Start the orchestrator main loop
   */
  async start(): Promise<void> {
    // Load previous state from database
    await this.restoreState();

    this.isRunning = true;
    console.log('Avi DM orchestrator started');

    // Start main loop
    await this.mainLoop();
  }

  /**
   * Main orchestration loop
   * Runs continuously, monitoring feed and spawning workers
   */
  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 1. Check for new posts (would integrate with feed API)
        const newPosts = await this.checkFeed();

        // 2. Create work tickets for new posts
        for (const post of newPosts) {
          const ticket = await this.createWorkTicket(post);
          this.workQueue.enqueue(ticket);
        }

        // 3. Process queued work tickets
        await this.processWorkQueue();

        // 4. Update context size estimate
        this.updateContextSize();

        // 5. Brief pause before next iteration
        await this.sleep(5000); // 5 seconds

      } catch (error) {
        console.error('Error in main loop:', error);
        await this.handleError(error);
        await this.sleep(30000); // Back off on error
      }
    }
  }

  /**
   * Create work ticket from incoming post
   */
  private async createWorkTicket(post: FeedPost): Promise<WorkTicket> {
    // Determine which agent should handle this post
    const agentType = this.selectAgent(post);

    // Retrieve relevant memories (limited to avoid context bloat)
    const memories = await this.getRelevantMemories(
      post.userId,
      agentType,
      5 // Limit to 5 most relevant
    );

    const ticket: WorkTicket = {
      id: this.generateTicketId(),
      postId: post.id,
      postContent: post.content,
      postAuthor: post.author,
      userId: post.userId,
      assignedAgent: agentType,
      relevantMemories: memories,
      priority: this.calculatePriority(post),
      createdAt: Date.now(),
      status: 'pending'
    };

    return ticket;
  }

  /**
   * Process work queue - spawn workers for pending tickets
   */
  private async processWorkQueue(): Promise<void> {
    while (!this.workQueue.isEmpty() && this.workerPool.hasCapacity()) {
      const ticket = this.workQueue.dequeue();

      if (ticket) {
        await this.spawnWorker(ticket);
      }
    }
  }

  /**
   * Spawn ephemeral agent worker for a ticket
   */
  private async spawnWorker(ticket: WorkTicket): Promise<void> {
    try {
      const spawner = new WorkerSpawner(this.db);

      // Spawn worker (runs async, manages own lifecycle)
      const workerId = await spawner.spawn(ticket);

      // Track in pool
      this.workerPool.add(workerId, ticket.id);

      console.log(`Spawned worker ${workerId} for ticket ${ticket.id}`);

    } catch (error) {
      console.error(`Failed to spawn worker for ticket ${ticket.id}:`, error);

      // Re-queue ticket with lower priority
      ticket.priority = Math.max(0, ticket.priority - 1);
      ticket.retryCount = (ticket.retryCount || 0) + 1;

      if (ticket.retryCount < 3) {
        this.workQueue.enqueue(ticket);
      } else {
        await this.escalateFailure(ticket, error);
      }
    }
  }

  /**
   * Graceful restart - preserve state, reset context
   */
  async gracefulRestart(): Promise<void> {
    console.log('Initiating graceful restart...');

    // Save current state
    await this.saveState();

    // Wait for active workers to complete (with timeout)
    await this.workerPool.waitForCompletion(30000);

    // Reset context
    this.contextSize = 1500;
    this.startTime = Date.now();

    // Log restart in database
    await this.db.query(
      `UPDATE avi_state
       SET last_restart = NOW(),
           context_size = $1
       WHERE id = 1`,
      [this.contextSize]
    );

    console.log('Graceful restart complete');
  }

  /**
   * Save state to database
   */
  private async saveState(): Promise<void> {
    await this.stateManager.save({
      lastFeedPosition: this.lastFeedPosition,
      pendingTickets: this.workQueue.toArray(),
      contextSize: this.contextSize,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
    });
  }

  /**
   * Restore state from database
   */
  private async restoreState(): Promise<void> {
    const state = await this.stateManager.load();

    if (state) {
      this.lastFeedPosition = state.lastFeedPosition;
      this.contextSize = state.contextSize || 1500;

      // Re-queue pending tickets
      if (state.pendingTickets) {
        for (const ticket of state.pendingTickets) {
          this.workQueue.enqueue(ticket);
        }
      }

      console.log(`Restored state: ${this.workQueue.size()} pending tickets`);
    }
  }

  /**
   * Check health status
   */
  async checkHealth(): Promise<HealthStatus> {
    return {
      isHealthy: this.isRunning && this.contextSize < 50000,
      contextSize: this.contextSize,
      activeWorkers: this.workerPool.getActiveCount(),
      queuedTickets: this.workQueue.size(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Update context size estimate
   * Based on number of iterations and tokens per iteration
   */
  private updateContextSize(): void {
    // Rough estimate: ~300 tokens per feed check + ticket creation
    this.contextSize += 300;
  }

  /**
   * Get relevant memories for agent context
   */
  private async getRelevantMemories(
    userId: string,
    agentName: string,
    limit: number
  ): Promise<AgentMemory[]> {
    const result = await this.db.query<AgentMemory>(
      `SELECT content, metadata, created_at
       FROM agent_memories
       WHERE user_id = $1 AND agent_name = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, agentName, limit]
    );

    return result.rows;
  }

  /**
   * Select appropriate agent for post
   */
  private selectAgent(post: FeedPost): string {
    // Simple selection logic (can be enhanced with AI)
    // For MVP: based on keywords or topics

    const content = post.content.toLowerCase();

    if (content.includes('tech') || content.includes('ai')) {
      return 'tech-guru';
    } else if (content.includes('creative') || content.includes('art')) {
      return 'creative-writer';
    } else {
      return 'tech-guru'; // Default
    }
  }

  /**
   * Calculate priority for ticket
   */
  private calculatePriority(post: FeedPost): number {
    // Higher priority for:
    // - Direct mentions
    // - Recent posts
    // - High engagement

    let priority = 5; // Base priority

    if (post.isDirect) priority += 3;
    if (post.engagement > 100) priority += 2;
    if (Date.now() - post.timestamp < 3600000) priority += 1; // Within 1 hour

    return priority;
  }

  private generateTicketId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleError(error: Error): Promise<void> {
    await this.db.query(
      `INSERT INTO error_log (agent_name, error_type, error_message, context)
       VALUES ($1, $2, $3, $4)`,
      ['avi_orchestrator', error.name, error.message, JSON.stringify({ stack: error.stack })]
    );
  }

  private async escalateFailure(ticket: WorkTicket, error: Error): Promise<void> {
    console.error(`Ticket ${ticket.id} failed after ${ticket.retryCount} retries`);

    await this.db.query(
      `INSERT INTO error_log (agent_name, error_type, error_message, context, retry_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        ticket.assignedAgent,
        'ticket_failure',
        error.message,
        JSON.stringify(ticket),
        ticket.retryCount
      ]
    );
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    console.log('Stopping Avi DM orchestrator...');
    this.isRunning = false;

    await this.saveState();
    await this.workerPool.terminateAll();

    console.log('Avi DM orchestrator stopped');
  }
}
```

---

### 2. Agent Worker (`src/workers/agent-worker.ts`)

#### Responsibilities

1. **Context Loading** - Compose agent context from database
2. **Task Execution** - Generate response using Claude API
3. **Memory Saving** - Store interaction in database
4. **Self-Destruction** - Clean up after task completion

#### Class Structure

```typescript
/**
 * Ephemeral Agent Worker
 * Short-lived worker that executes a single task then destroys itself
 */
export class AgentWorker {
  private workerId: string;
  private ticket: WorkTicket;
  private db: DatabaseManager;
  private agentContext: AgentContext | null = null;
  private startTime: number;
  private isDestroyed: boolean = false;

  constructor(workerId: string, ticket: WorkTicket, db: DatabaseManager) {
    this.workerId = workerId;
    this.ticket = ticket;
    this.db = db;
    this.startTime = Date.now();
  }

  /**
   * Execute the work ticket
   * Full lifecycle: load → execute → save → destroy
   */
  async execute(): Promise<WorkerResult> {
    try {
      // 1. Load agent context from database
      await this.loadContext();

      // 2. Generate response
      const response = await this.generateResponse();

      // 3. Save memory to database
      await this.saveMemory(response);

      // 4. Return success result
      return {
        success: true,
        workerId: this.workerId,
        ticketId: this.ticket.id,
        response: response,
        executionTime: Date.now() - this.startTime
      };

    } catch (error) {
      console.error(`Worker ${this.workerId} failed:`, error);

      return {
        success: false,
        workerId: this.workerId,
        ticketId: this.ticket.id,
        error: error as Error,
        executionTime: Date.now() - this.startTime
      };

    } finally {
      // Always destroy worker
      await this.destroy();
    }
  }

  /**
   * Load agent context from database
   * Uses Phase 1's composeAgentContext function
   */
  private async loadContext(): Promise<void> {
    // Use Phase 1's context composition
    this.agentContext = await composeAgentContext(
      this.ticket.userId,
      this.ticket.assignedAgent,
      this.db
    );

    console.log(`Worker ${this.workerId}: Context loaded for ${this.agentContext.agentName}`);
  }

  /**
   * Generate response using Claude API
   */
  private async generateResponse(): Promise<AgentResponse> {
    if (!this.agentContext) {
      throw new Error('Context not loaded');
    }

    // Build system prompt from context
    const systemPrompt = this.buildSystemPrompt(this.agentContext);

    // Build user message with post content and memories
    const userMessage = this.buildUserMessage();

    // Get model from context (uses Phase 1's getModelForAgent)
    const model = getModelForAgent(this.agentContext);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: model,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 1024
    });

    const content = response.content[0].text;

    return {
      content: content,
      agentName: this.agentContext.agentName,
      inReplyTo: this.ticket.postId,
      metadata: {
        model: model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }

  /**
   * Build system prompt from agent context
   */
  private buildSystemPrompt(context: AgentContext): string {
    return `You are ${context.agentName}.

Personality: ${context.personality}

Interests: ${context.interests.join(', ')}

Response Style:
- Tone: ${context.response_style.tone}
- Length: ${context.response_style.length}
- Use emojis: ${context.response_style.use_emojis}

PROTECTED POSTING RULES (you must follow these):
- Maximum length: ${context.posting_rules.max_length} characters
- Required hashtags: ${context.posting_rules.required_hashtags?.join(', ') || 'none'}
- Prohibited words: NEVER use these words

SAFETY CONSTRAINTS:
- Content filters: ${context.safety_constraints.content_filters.join(', ')}
- Maximum mentions: ${context.safety_constraints.max_mentions_per_post}

Generate a response that fits your personality and follows all rules.`;
  }

  /**
   * Build user message with post and memories
   */
  private buildUserMessage(): string {
    let message = `Post to respond to:\n"${this.ticket.postContent}"\n\n`;

    if (this.ticket.relevantMemories && this.ticket.relevantMemories.length > 0) {
      message += `Relevant context from your previous interactions:\n`;

      for (const memory of this.ticket.relevantMemories) {
        message += `- ${memory.content}\n`;
      }

      message += '\n';
    }

    message += `Generate an appropriate response.`;

    return message;
  }

  /**
   * Save interaction memory to database
   */
  private async saveMemory(response: AgentResponse): Promise<void> {
    await this.db.query(
      `INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        this.ticket.userId,
        this.ticket.assignedAgent,
        this.ticket.postId,
        response.content,
        JSON.stringify({
          topic: this.extractTopic(response.content),
          sentiment: 'neutral', // Could enhance with sentiment analysis
          inReplyTo: this.ticket.postId
        })
      ]
    );

    console.log(`Worker ${this.workerId}: Memory saved`);
  }

  /**
   * Destroy worker - cleanup resources
   */
  private async destroy(): Promise<void> {
    if (this.isDestroyed) return;

    console.log(`Worker ${this.workerId}: Destroying (lifespan: ${Date.now() - this.startTime}ms)`);

    this.agentContext = null;
    this.isDestroyed = true;
  }

  /**
   * Extract topic from content (simple keyword extraction)
   */
  private extractTopic(content: string): string {
    // Simple topic extraction - could enhance with NLP
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('ai') || lowerContent.includes('technology')) {
      return 'technology';
    } else if (lowerContent.includes('art') || lowerContent.includes('creative')) {
      return 'creative';
    } else {
      return 'general';
    }
  }
}
```

---

### 3. Worker Spawner (`src/workers/worker-spawner.ts`)

```typescript
/**
 * Worker Spawner
 * Manages the spawning of ephemeral agent workers
 */
export class WorkerSpawner {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Spawn a new worker for the given ticket
   * Worker runs asynchronously and manages its own lifecycle
   */
  async spawn(ticket: WorkTicket): Promise<string> {
    const workerId = this.generateWorkerId();

    console.log(`Spawning worker ${workerId} for ticket ${ticket.id}`);

    // Create worker instance
    const worker = new AgentWorker(workerId, ticket, this.db);

    // Execute asynchronously (don't await - let worker manage itself)
    this.executeWorker(worker, ticket);

    return workerId;
  }

  /**
   * Execute worker asynchronously
   */
  private async executeWorker(
    worker: AgentWorker,
    ticket: WorkTicket
  ): Promise<void> {
    try {
      const result = await worker.execute();

      if (result.success) {
        console.log(
          `Worker ${result.workerId} completed successfully ` +
          `(${result.executionTime}ms)`
        );
      } else {
        console.error(
          `Worker ${result.workerId} failed: ${result.error?.message}`
        );

        await this.logError(result);
      }

    } catch (error) {
      console.error(`Worker execution error:`, error);

      await this.db.query(
        `INSERT INTO error_log (agent_name, error_type, error_message, context)
         VALUES ($1, $2, $3, $4)`,
        [
          ticket.assignedAgent,
          'worker_execution_error',
          (error as Error).message,
          JSON.stringify({ ticketId: ticket.id, workerId: worker.workerId })
        ]
      );
    }
  }

  /**
   * Log worker error to database
   */
  private async logError(result: WorkerResult): Promise<void> {
    if (!result.error) return;

    await this.db.query(
      `INSERT INTO error_log (agent_name, error_type, error_message, context)
       VALUES ($1, $2, $3, $4)`,
      [
        'worker',
        result.error.name,
        result.error.message,
        JSON.stringify({
          workerId: result.workerId,
          ticketId: result.ticketId,
          executionTime: result.executionTime
        })
      ]
    );
  }

  private generateWorkerId(): string {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

### 4. Health Monitor (`src/avi/health-monitor.ts`)

```typescript
/**
 * Health Monitor
 * Monitors Avi DM health and triggers graceful restarts
 */
export class HealthMonitor {
  private orchestrator: AviOrchestrator;
  private db: DatabaseManager;
  private checkInterval: number = 30000; // 30 seconds
  private intervalId: NodeJS.Timeout | null = null;

  constructor(orchestrator: AviOrchestrator, db: DatabaseManager) {
    this.orchestrator = orchestrator;
    this.db = db;
  }

  /**
   * Start health monitoring
   */
  start(): void {
    console.log('Health monitor started (30s interval)');

    this.intervalId = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // 1. Check Avi health
      const aviHealth = await this.checkAviHealth();

      // 2. Check database health
      const dbHealth = await this.checkDatabaseHealth();

      // 3. Update metrics
      await this.updateMetrics(aviHealth, dbHealth);

      // 4. Trigger restart if needed
      if (!aviHealth.isHealthy) {
        await this.triggerGracefulRestart(aviHealth);
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Check Avi orchestrator health
   */
  private async checkAviHealth(): Promise<HealthStatus> {
    const health = await this.orchestrator.checkHealth();

    // Context bloat detection
    if (health.contextSize > 50000) {
      console.warn(`⚠️  Context bloat detected: ${health.contextSize} tokens`);
      health.isHealthy = false;
      health.reason = 'context_bloat';
    }

    return health;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Update metrics in database
   */
  private async updateMetrics(
    aviHealth: HealthStatus,
    dbHealthy: boolean
  ): Promise<void> {
    await this.db.query(
      `UPDATE avi_state
       SET context_size = $1,
           uptime_seconds = uptime_seconds + 30
       WHERE id = 1`,
      [aviHealth.contextSize]
    );
  }

  /**
   * Trigger graceful restart
   */
  private async triggerGracefulRestart(health: HealthStatus): Promise<void> {
    console.log(`🔄 Triggering graceful restart: ${health.reason}`);

    await this.orchestrator.gracefulRestart();

    console.log('✅ Graceful restart complete');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Health monitor stopped');
    }
  }
}
```

---

## Data Flow Diagrams

### 1. Startup Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Application Startup                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Connect to PostgreSQL                                    │
│    - Initialize connection pool                             │
│    - Run health check                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Initialize Avi DM Orchestrator                           │
│    - Create work queue                                      │
│    - Create worker pool                                     │
│    - Restore state from avi_state table                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Start Health Monitor                                     │
│    - Begin 30s interval checks                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Start Avi Main Loop                                      │
│    - Begin feed monitoring                                  │
│    - Process pending tickets from restore                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                     System Running
```

### 2. Work Ticket Flow

```
┌─────────────────────────────────────────────────────────────┐
│ New Post Detected in Feed                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Avi: Analyze Post                                           │
│ ├─> Select appropriate agent (tech-guru, etc.)              │
│ ├─> Calculate priority                                      │
│ └─> Query relevant memories (LIMIT 5)                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Avi: Create Work Ticket                                     │
│ {                                                            │
│   id, postId, userId, assignedAgent,                        │
│   relevantMemories, priority, createdAt                     │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Avi: Enqueue Ticket                                         │
│ - Add to priority queue                                     │
│ - Save to avi_state.pending_tickets (for restart safety)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Avi: Check Worker Pool Capacity                             │
│ - Has capacity? → Spawn worker                              │
│ - No capacity? → Stay in queue                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ WorkerSpawner: Spawn Worker                                 │
│ ├─> Create AgentWorker instance                             │
│ ├─> Generate workerId                                       │
│ └─> Start async execution                                   │
└─────────────────────────────────────────────────────────────┘
```

### 3. Worker Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Worker Spawned                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Load Context from Database                               │
│    ├─> Query system_agent_templates (TIER 1)                │
│    ├─> Query user_agent_customizations (TIER 2)             │
│    └─> Compose using composeAgentContext()                  │
│        - Validate protected fields                          │
│        - Merge system + user settings                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Build Prompt                                             │
│    ├─> System prompt from AgentContext                      │
│    │   - Personality, interests, response_style             │
│    │   - Protected posting_rules, safety_constraints        │
│    └─> User message                                         │
│        - Post content                                       │
│        - Relevant memories from ticket                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Call Claude API                                          │
│    ├─> Model: from context (or default Sonnet 4.5)          │
│    ├─> System: agent personality + rules                    │
│    └─> Messages: post + memories                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Save Memory to Database                                  │
│    INSERT INTO agent_memories                               │
│    (user_id, agent_name, post_id, content, metadata)        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Return Response                                          │
│    {success, content, executionTime}                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Self-Destruct                                            │
│    - Clean up resources                                     │
│    - Remove from worker pool                                │
│    - Worker lifetime: ~30-60 seconds                        │
└─────────────────────────────────────────────────────────────┘
```

### 4. Graceful Restart Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Health Monitor Detects Context Bloat                        │
│ (context_size > 50,000 tokens)                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Save Current State                                       │
│    UPDATE avi_state SET                                     │
│    - last_feed_position                                     │
│    - pending_tickets (JSONB)                                │
│    - uptime_seconds                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Wait for Active Workers                                  │
│    - Wait up to 30 seconds for workers to complete          │
│    - Workers continue executing during restart              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Reset Avi Context                                        │
│    - contextSize = 1500 (baseline)                          │
│    - startTime = now                                        │
│    - Keep database connection alive                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Update Database                                          │
│    UPDATE avi_state SET                                     │
│    - last_restart = NOW()                                   │
│    - context_size = 1500                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Resume Operations                                        │
│    - Continue main loop                                     │
│    - Process saved pending tickets                          │
│    - Zero perceived downtime                                │
└─────────────────────────────────────────────────────────────┘
```

---

## TypeScript Interfaces

### Core Type Definitions

```typescript
/**
 * src/types/orchestrator.ts
 * Type definitions for Avi DM orchestrator
 */

export interface AviConfig {
  db: DatabaseManager;
  maxWorkers: number;
  healthCheckInterval?: number;
  contextLimit?: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  contextSize: number;
  activeWorkers: number;
  queuedTickets: number;
  uptime: number;
  reason?: string;
}

export interface AviState {
  lastFeedPosition: string | null;
  pendingTickets: WorkTicket[];
  contextSize: number;
  uptimeSeconds: number;
}

export interface FeedPost {
  id: string;
  content: string;
  author: string;
  userId: string;
  timestamp: number;
  isDirect: boolean;
  engagement: number;
}
```

```typescript
/**
 * src/types/worker.ts
 * Type definitions for ephemeral agent workers
 */

export interface WorkerResult {
  success: boolean;
  workerId: string;
  ticketId: string;
  response?: AgentResponse;
  error?: Error;
  executionTime: number;
}

export interface AgentResponse {
  content: string;
  agentName: string;
  inReplyTo: string;
  metadata: {
    model: string;
    tokensUsed: number;
  };
}

export interface WorkerPoolStatus {
  activeWorkers: number;
  maxWorkers: number;
  capacity: number;
}
```

```typescript
/**
 * src/types/work-ticket.ts
 * Type definitions for work ticket system
 */

export interface WorkTicket {
  id: string;
  postId: string;
  postContent: string;
  postAuthor: string;
  userId: string;
  assignedAgent: string;
  relevantMemories: AgentMemory[];
  priority: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount?: number;
}

export interface AgentMemory {
  id?: number;
  content: string;
  metadata: {
    topic?: string;
    sentiment?: string;
    inReplyTo?: string;
  };
  created_at?: Date;
}
```

---

## Integration Points

### Phase 1 → Phase 2 Integration

#### 1. Context Composition Integration

**Location:** `src/integration/context-loader.ts`

```typescript
/**
 * Context Loader
 * Wrapper around Phase 1's composeAgentContext function
 * for use by workers
 */

import { composeAgentContext, getModelForAgent } from '../database/context-composer';
import { DatabaseManager } from '../types/database-manager';
import { AgentContext } from '../types/agent-context';

/**
 * Load agent context for worker
 * Wrapper around Phase 1 function with error handling
 */
export async function loadWorkerContext(
  userId: string,
  agentType: string,
  db: DatabaseManager
): Promise<AgentContext> {
  try {
    // Use Phase 1's composition function
    const context = await composeAgentContext(userId, agentType, db);

    console.log(`Context loaded: ${context.agentName} (v${context.version})`);

    return context;

  } catch (error) {
    console.error(`Failed to load context for ${agentType}:`, error);

    // Log error to database
    await db.query(
      `INSERT INTO error_log (agent_name, error_type, error_message)
       VALUES ($1, $2, $3)`,
      [agentType, 'context_load_error', (error as Error).message]
    );

    throw error;
  }
}

/**
 * Get Claude model for agent
 * Re-export Phase 1 function for convenience
 */
export { getModelForAgent } from '../database/context-composer';
```

#### 2. Memory Queries

**Location:** `src/database/queries/memories.ts`

```typescript
/**
 * Memory Queries (TIER 3)
 * Database queries for agent memories
 */

import { DatabaseManager } from '../../types/database-manager';
import { AgentMemory } from '../../types/work-ticket';

/**
 * Get recent memories for agent
 * Used by orchestrator to build work tickets
 */
export async function getRecentMemories(
  db: DatabaseManager,
  userId: string,
  agentName: string,
  limit: number = 5
): Promise<AgentMemory[]> {
  const result = await db.query<AgentMemory>(
    `SELECT id, content, metadata, created_at
     FROM agent_memories
     WHERE user_id = $1 AND agent_name = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, agentName, limit]
  );

  return result.rows;
}

/**
 * Save agent memory
 * Used by workers after generating response
 */
export async function saveMemory(
  db: DatabaseManager,
  userId: string,
  agentName: string,
  postId: string,
  content: string,
  metadata: object
): Promise<void> {
  await db.query(
    `INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, agentName, postId, content, JSON.stringify(metadata)]
  );
}

/**
 * Get memories by topic
 * Used for more sophisticated memory retrieval
 */
export async function getMemoriesByTopic(
  db: DatabaseManager,
  userId: string,
  agentName: string,
  topic: string,
  limit: number = 5
): Promise<AgentMemory[]> {
  const result = await db.query<AgentMemory>(
    `SELECT id, content, metadata, created_at
     FROM agent_memories
     WHERE user_id = $1
       AND agent_name = $2
       AND metadata @> $3
     ORDER BY created_at DESC
     LIMIT $4`,
    [userId, agentName, JSON.stringify({ topic }), limit]
  );

  return result.rows;
}
```

#### 3. Avi State Management

**Location:** `src/avi/state-manager.ts`

```typescript
/**
 * Avi State Manager
 * Handles persistence of orchestrator state
 */

import { DatabaseManager } from '../types/database-manager';
import { AviState } from '../types/orchestrator';

export class StateManager {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Save orchestrator state to database
   */
  async save(state: AviState): Promise<void> {
    await this.db.query(
      `INSERT INTO avi_state (id, last_feed_position, pending_tickets, context_size, uptime_seconds)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         last_feed_position = EXCLUDED.last_feed_position,
         pending_tickets = EXCLUDED.pending_tickets,
         context_size = EXCLUDED.context_size,
         uptime_seconds = EXCLUDED.uptime_seconds`,
      [
        state.lastFeedPosition,
        JSON.stringify(state.pendingTickets),
        state.contextSize,
        state.uptimeSeconds
      ]
    );
  }

  /**
   * Load orchestrator state from database
   */
  async load(): Promise<AviState | null> {
    const result = await this.db.query<{
      last_feed_position: string | null;
      pending_tickets: string | null;
      context_size: number;
      uptime_seconds: number;
    }>(
      `SELECT last_feed_position, pending_tickets, context_size, uptime_seconds
       FROM avi_state
       WHERE id = 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      lastFeedPosition: row.last_feed_position,
      pendingTickets: row.pending_tickets
        ? JSON.parse(row.pending_tickets)
        : [],
      contextSize: row.context_size,
      uptimeSeconds: row.uptime_seconds
    };
  }
}
```

---

## Implementation Sequence

### Week 1: Core Infrastructure

**Day 1-2: Queue System**
- [ ] Implement `src/queue/work-ticket.ts`
  - WorkTicket creation
  - Ticket validation
- [ ] Implement `src/queue/priority-queue.ts`
  - Priority-based dequeue
  - Queue persistence

**Day 3-4: Worker Foundation**
- [ ] Implement `src/workers/agent-worker.ts`
  - Context loading wrapper
  - Execute method skeleton
  - Destroy logic
- [ ] Implement `src/workers/worker-spawner.ts`
  - Async worker execution
  - Error handling

**Day 5: Integration Layer**
- [ ] Implement `src/integration/context-loader.ts`
  - Wrap Phase 1 functions
  - Add error handling
- [ ] Implement `src/database/queries/memories.ts`
  - Memory retrieval queries
  - Memory saving

### Week 2: Orchestrator Core

**Day 1-2: Avi State Management**
- [ ] Implement `src/avi/state-manager.ts`
  - State save/load
  - Pending ticket persistence
- [ ] Implement `src/avi/orchestrator.ts` (basic)
  - Constructor
  - State restoration
  - Main loop skeleton

**Day 3-4: Avi Main Loop**
- [ ] Complete main loop implementation
  - Feed checking (stubbed initially)
  - Work ticket creation
  - Worker spawning
- [ ] Implement worker pool
  - Capacity tracking
  - Worker lifecycle

**Day 5: Testing**
- [ ] Unit tests for orchestrator
- [ ] Integration tests with database
- [ ] Mock worker execution

### Week 3: Worker Execution

**Day 1-2: Context Loading**
- [ ] Complete worker context loading
  - Integration with Phase 1
  - Error handling
  - Logging
- [ ] Test context composition

**Day 3-4: Response Generation**
- [ ] Implement Claude API integration
  - Prompt building
  - API calls
  - Response parsing
- [ ] Add memory saving

**Day 5: Testing**
- [ ] Unit tests for workers
- [ ] Integration tests
- [ ] End-to-end worker lifecycle

### Week 4: Health & Monitoring

**Day 1-2: Health Monitor**
- [ ] Implement `src/avi/health-monitor.ts`
  - Health checks
  - Context bloat detection
  - Graceful restart trigger

**Day 3-4: Graceful Restart**
- [ ] Implement restart logic
  - State persistence
  - Worker completion wait
  - Context reset
- [ ] Test restart scenarios

**Day 5: Integration Testing**
- [ ] Full system integration tests
- [ ] Stress testing
- [ ] Performance tuning

---

## Testing Strategy

### Unit Tests

**Location:** `tests/phase2/unit/`

```typescript
// tests/phase2/unit/orchestrator.test.ts
describe('AviOrchestrator', () => {
  let orchestrator: AviOrchestrator;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDb = createMockDb();
    orchestrator = new AviOrchestrator({
      db: mockDb,
      maxWorkers: 5
    });
  });

  describe('createWorkTicket', () => {
    it('should create ticket with correct fields', async () => {
      const post = createMockPost();

      const ticket = await orchestrator.createWorkTicket(post);

      expect(ticket.postId).toBe(post.id);
      expect(ticket.assignedAgent).toBeDefined();
      expect(ticket.priority).toBeGreaterThan(0);
    });

    it('should fetch relevant memories', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ content: 'test memory' }]
      });

      const post = createMockPost();
      const ticket = await orchestrator.createWorkTicket(post);

      expect(ticket.relevantMemories.length).toBeGreaterThan(0);
    });
  });

  describe('gracefulRestart', () => {
    it('should save state before restart', async () => {
      await orchestrator.gracefulRestart();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE avi_state'),
        expect.any(Array)
      );
    });

    it('should reset context size', async () => {
      orchestrator['contextSize'] = 60000;

      await orchestrator.gracefulRestart();

      expect(orchestrator['contextSize']).toBe(1500);
    });
  });
});
```

```typescript
// tests/phase2/unit/worker.test.ts
describe('AgentWorker', () => {
  let worker: AgentWorker;
  let mockDb: jest.Mocked<DatabaseManager>;
  let mockTicket: WorkTicket;

  beforeEach(() => {
    mockDb = createMockDb();
    mockTicket = createMockTicket();
    worker = new AgentWorker('worker-1', mockTicket, mockDb);
  });

  describe('execute', () => {
    it('should load context from database', async () => {
      mockDb.query.mockResolvedValue({
        rows: [createMockTemplate()]
      });

      await worker.execute();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('system_agent_templates'),
        expect.any(Array)
      );
    });

    it('should save memory after execution', async () => {
      mockDb.query.mockResolvedValue({ rows: [createMockTemplate()] });

      await worker.execute();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_memories'),
        expect.any(Array)
      );
    });

    it('should destroy itself after execution', async () => {
      mockDb.query.mockResolvedValue({ rows: [createMockTemplate()] });

      await worker.execute();

      expect(worker['isDestroyed']).toBe(true);
    });
  });
});
```

### Integration Tests

**Location:** `tests/phase2/integration/`

```typescript
// tests/phase2/integration/spawning.test.ts
describe('Worker Spawning Integration', () => {
  let db: DatabaseManager;
  let orchestrator: AviOrchestrator;

  beforeAll(async () => {
    db = await createTestDatabase();
    await seedSystemTemplates(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  it('should spawn worker with database context', async () => {
    // Create orchestrator
    orchestrator = new AviOrchestrator({ db, maxWorkers: 5 });

    // Create mock post
    const post = {
      id: 'post-1',
      content: 'test post about AI',
      userId: 'user-1',
      author: 'test-user',
      timestamp: Date.now(),
      isDirect: false,
      engagement: 10
    };

    // Create ticket
    const ticket = await orchestrator.createWorkTicket(post);

    // Spawn worker
    const spawner = new WorkerSpawner(db);
    const workerId = await spawner.spawn(ticket);

    expect(workerId).toBeDefined();

    // Wait for execution
    await sleep(5000);

    // Verify memory was saved
    const memories = await db.query(
      `SELECT * FROM agent_memories WHERE user_id = $1`,
      ['user-1']
    );

    expect(memories.rows.length).toBeGreaterThan(0);
  });
});
```

---

## Summary

Phase 2 builds the **intelligent orchestration layer** on top of Phase 1's solid database foundation:

**Key Components:**
1. ✅ **Avi DM Orchestrator** - Persistent, lightweight coordinator
2. ✅ **Ephemeral Workers** - Short-lived task executors
3. ✅ **Work Ticket System** - Queue-based distribution
4. ✅ **Health Monitoring** - Automatic context bloat detection
5. ✅ **Graceful Restarts** - Zero-downtime recovery

**Integration with Phase 1:**
- Uses `composeAgentContext()` for protected context loading
- Queries `agent_memories` for relevant context
- Persists state in `avi_state` table
- Respects 3-tier data protection model

**Token Efficiency:**
- Avi baseline: ~1,500 tokens
- Worker spawn: ~2,700 tokens (context only)
- Memory retrieval: Limited to 5 most relevant
- Graceful restart: Resets to baseline

**Next Phase (Phase 3):** Platform integration, post validation, retry logic, and production deployment.

---

**Document Version:** 2.0
**Last Updated:** 2025-10-10
**Status:** Ready for Implementation
**Dependencies:** Phase 1 Complete ✅
