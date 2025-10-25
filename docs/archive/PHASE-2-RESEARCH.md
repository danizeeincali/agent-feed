# Phase 2: Avi DM Orchestrator - Research & Best Practices
## Ephemeral AI Worker Patterns & Implementation Guide

**Version:** 1.0
**Date:** 2025-10-10
**Phase:** Phase 2 Research
**Status:** Complete

---

## Executive Summary

This document compiles research findings and best practices for implementing **Phase 2: Avi DM Orchestrator** - a lightweight, persistent orchestrator that spawns ephemeral AI agent workers. The research covers:

- **Orchestrator design patterns** for AI systems
- **Worker spawning strategies** with efficient context passing
- **Health monitoring** and auto-restart mechanisms
- **Node.js process management** for AI agents
- **Token optimization** and context management
- **Anthropic Claude API** best practices

**Key Finding:** The Orchestrator-Worker pattern with ephemeral agents can achieve **52% token reduction** compared to full context reloading, while maintaining system reliability through proper health monitoring and graceful shutdown procedures.

---

## Table of Contents

1. [Orchestrator Design Patterns](#1-orchestrator-design-patterns)
2. [Worker Spawning Strategies](#2-worker-spawning-strategies)
3. [Context Management & Token Optimization](#3-context-management--token-optimization)
4. [Health Monitoring & Auto-Restart](#4-health-monitoring--auto-restart)
5. [Node.js Process Management](#5-nodejs-process-management)
6. [Graceful Shutdown Patterns](#6-graceful-shutdown-patterns)
7. [Claude API Best Practices](#7-claude-api-best-practices)
8. [Implementation Recommendations](#8-implementation-recommendations)
9. [Code Examples & Patterns](#9-code-examples--patterns)
10. [References](#10-references)

---

## 1. Orchestrator Design Patterns

### 1.1 Primary Patterns for AI Orchestration

Based on research from Microsoft Azure, AWS, and LangGraph, five primary orchestration patterns emerged:

#### **Orchestrator-Workers Pattern** ⭐ (Recommended for Avi DM)

**Description:**
- Central LLM dynamically breaks down tasks, delegates to worker LLMs, and synthesizes results
- Orchestrator maintains lightweight state, workers are stateless and ephemeral
- Suitable for workflows where problem structure emerges at runtime

**Benefits:**
- Clear separation of concerns (routing vs. execution)
- Scalable worker pool management
- Predictable resource usage
- Easy to monitor and debug

**Characteristics:**
- **Orchestrator:** Persistent, lightweight (~1-2K tokens), manages workflow only
- **Workers:** Ephemeral, stateless, task-focused (30-60 second lifespan)
- **Communication:** Message-passing via IPC or queues

**When to Use:**
- Complex tasks where subtasks are not predictable upfront
- Need for parallel execution across specialized agents
- Dynamic task decomposition required

**Implementation for Avi DM:**
```typescript
// Avi DM: Lightweight orchestrator
class AviOrchestrator {
  contextSize: number; // Target: 1-2K tokens

  async processPost(post: Post): Promise<WorkTicket> {
    // Minimal decision logic
    const agentType = this.selectAgent(post);
    const ticket = this.createWorkTicket(post, agentType);

    // Spawn ephemeral worker
    await this.spawnWorker(ticket);

    return ticket;
  }
}

// Worker: Full context, ephemeral
class AgentWorker {
  contextSize: number; // Full context: 8-12K tokens
  lifespan: number; // 30-60 seconds

  async execute(ticket: WorkTicket): Promise<Post> {
    // Load full context from database
    const context = await this.loadContext(ticket);

    // Execute with Claude
    const response = await claude.messages.create({
      model: context.model,
      messages: [{ role: 'user', content: ticket.content }],
      system: context.systemPrompt
    });

    // Save memory and exit
    await this.saveMemory(response);
    process.exit(0); // Ephemeral - clean exit
  }
}
```

---

#### **Other Patterns (For Comparison)**

**Sequential Orchestration:**
- Chains agents in predefined linear order
- Not suitable for Avi DM (need dynamic routing)

**Parallel/Concurrent Orchestration:**
- All agents work in parallel on same problem
- Not suitable for Avi DM (one agent per post)

**ReAct (Reasoning and Acting):**
- Agents alternate between reasoning and action
- Could be useful within individual workers

**Hierarchical Teams:**
- Supervisor orchestrates multiple teams of agents
- Overkill for Avi DM's scale

---

### 1.2 Lightweight vs. Heavyweight Orchestration

**Research Finding:** External orchestration is heavyweight, complicating development, deployment, and maintenance.

#### **Heavyweight Approach (Avoid)**
- Separate orchestrator server + worker servers
- Distributed microservices architecture
- Message queues, service discovery, load balancers
- Complex deployment and monitoring

**Problems:**
- Operational complexity
- Higher infrastructure costs
- Difficult local development
- Network latency overhead

#### **Lightweight Approach** ⭐ (Recommended)

**Key Principle:** Implement orchestration in a library/module within your program

**Benefits:**
- Orchestrator and workers run in same process space
- Library handles execution state persistence
- Can resume after interruptions
- Simpler deployment model

**For Avi DM:**
```typescript
// Lightweight orchestration: Single Node.js process
class AviDM {
  private workerPool: Map<string, ChildProcess>;

  constructor() {
    this.workerPool = new Map();
  }

  // Spawn worker as child process (still in same deployment)
  async spawnWorker(ticket: WorkTicket): Promise<ChildProcess> {
    const worker = fork('./workers/agent-worker.js', {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        TICKET_ID: ticket.id,
        AGENT_TYPE: ticket.agentType
      }
    });

    this.workerPool.set(ticket.id, worker);

    // Monitor worker lifecycle
    worker.on('exit', (code) => {
      this.workerPool.delete(ticket.id);
      this.logWorkerExit(ticket.id, code);
    });

    return worker;
  }
}
```

---

### 1.3 State Management in Orchestrators

**Research Finding:** Orchestrators should manage workflow state, not business logic.

#### **Minimal Orchestrator State**

**What to Store:**
- Last feed position (cursor/offset)
- Pending work tickets (metadata only)
- Context size counter
- Last restart timestamp
- Active worker registry

**What NOT to Store:**
- Agent personalities (load from DB)
- Full conversation history (workers load this)
- Post content (pass in work ticket)
- Business logic

**Queryable State:**
Having an orchestrator makes the state of the workflow queryable, providing a place for monitoring and debugging.

#### **Implementation Pattern**

```typescript
interface AviState {
  id: 1; // Single row
  last_feed_position: string;
  pending_tickets: WorkTicket[]; // Metadata only
  context_size: number; // Track token usage
  last_restart: Date;
  uptime_seconds: number;
  active_workers: number;
}

class AviOrchestrator {
  private state: AviState;

  async updateState(updates: Partial<AviState>): Promise<void> {
    this.state = { ...this.state, ...updates };

    // Persist to database
    await db.query(
      'UPDATE avi_state SET last_feed_position = $1, context_size = $2 WHERE id = 1',
      [this.state.last_feed_position, this.state.context_size]
    );
  }

  // Health check: Monitor context bloat
  async checkHealth(): Promise<boolean> {
    if (this.state.context_size > CONTEXT_LIMIT) {
      await this.restart();
      return false;
    }
    return true;
  }
}
```

---

### 1.4 Resilience Mechanisms

**Research Finding:** Distributed systems require proper error handling and recovery.

#### **Key Resilience Patterns**

**1. Timeout Handling:**
```typescript
class AviOrchestrator {
  private readonly WORKER_TIMEOUT = 60000; // 60 seconds

  async spawnWorkerWithTimeout(ticket: WorkTicket): Promise<void> {
    const worker = await this.spawnWorker(ticket);

    const timeout = setTimeout(() => {
      worker.kill('SIGTERM');
      this.handleWorkerTimeout(ticket);
    }, this.WORKER_TIMEOUT);

    worker.on('exit', () => clearTimeout(timeout));
  }
}
```

**2. Retry Logic:**
```typescript
interface RetryConfig {
  maxAttempts: 3;
  backoffMs: [5000, 30000, 120000]; // Exponential backoff
}

async function retryWorkerTask(
  ticket: WorkTicket,
  config: RetryConfig
): Promise<void> {
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      await executeWorker(ticket);
      return; // Success
    } catch (error) {
      if (attempt < config.maxAttempts - 1) {
        await sleep(config.backoffMs[attempt]);
        continue;
      }
      // Log permanent failure
      await logError(ticket, error, attempt + 1);
      throw error;
    }
  }
}
```

**3. Circuit Breaker:**
```typescript
class CircuitBreaker {
  private failures: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= 5) {
      this.state = 'open';
      setTimeout(() => this.state = 'half-open', 30000);
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}
```

**4. Graceful Degradation:**
Surface errors instead of hiding them, so downstream agents and orchestrator logic can respond appropriately.

---

## 2. Worker Spawning Strategies

### 2.1 Ephemeral Agents Overview

**Research Finding:** Ephemeral agents are created on-demand, used for specific tasks, then discarded.

#### **Characteristics**

**Lifecycle:**
1. **Spawn:** Agent created by orchestrator for specific task
2. **Execute:** Agent loads context, performs task
3. **Persist:** Agent saves results/memories
4. **Destroy:** Agent exits, resources freed

**Benefits:**
- No context bloat (fresh start each time)
- Resource efficiency (only exist when needed)
- Failure isolation (crashed worker doesn't affect others)
- Predictable token usage

**Challenges:**
- Need efficient context loading
- Require proper cleanup mechanisms
- Must handle mid-execution failures
- Coordination overhead

#### **Resource Consumption**

**Research Finding:** Agents consume 4x more tokens than simple chat interactions, while multi-agent systems can consume 15x more tokens.

**Token Comparison:**
- Simple chat: 1,000 tokens
- Single agent: 4,000 tokens (4x)
- Multi-agent system: 15,000 tokens (15x)

**For Avi DM:**
- Orchestrator: ~1,500 tokens per feed check
- Agent worker: ~8,000-12,000 tokens per post
- **Total savings:** 52% vs. keeping all agents in memory

---

### 2.2 Spawning Mechanisms

#### **Node.js Child Process Pattern** ⭐ (Recommended)

**Use `child_process.fork()` for Node.js agents:**

```typescript
import { fork, ChildProcess } from 'child_process';

interface WorkerSpawnConfig {
  workerPath: string;
  env: Record<string, string>;
  timeout: number;
}

class WorkerManager {
  async spawn(config: WorkerSpawnConfig): Promise<ChildProcess> {
    const worker = fork(config.workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'], // Enable IPC
      env: {
        ...process.env,
        ...config.env
      },
      cwd: process.cwd()
    });

    // Setup communication
    worker.on('message', this.handleMessage.bind(this));
    worker.on('error', this.handleError.bind(this));
    worker.on('exit', this.handleExit.bind(this));

    return worker;
  }

  private handleMessage(message: any): void {
    if (message.type === 'progress') {
      this.updateProgress(message.data);
    } else if (message.type === 'complete') {
      this.handleCompletion(message.data);
    }
  }
}
```

---

### 2.3 Context Passing Strategies

**Research Finding:** Efficient context passing is critical for ephemeral worker performance.

#### **Context Serialization Best Practices**

**1. Deterministic Serialization:**
```typescript
// Ensure deterministic JSON serialization
function serializeContext(context: AgentContext): string {
  // Sort keys for cache consistency
  const sortedContext = sortKeys(context);
  return JSON.stringify(sortedContext);
}

function sortKeys<T extends object>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sorted = {} as T;
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortKeys(obj[key]);
    });

  return sorted;
}
```

**2. Structured Context Format:**
```typescript
interface AgentContext {
  // TIER 1: System template (immutable)
  template: {
    model: string;
    posting_rules: PostingRules;
    api_schema: ApiSchema;
    safety_constraints: SafetyConstraints;
  };

  // TIER 2: User customizations
  customization: {
    personality: string;
    interests: string[];
    response_style: ResponseStyle;
  };

  // TIER 3: Recent memories (summarized)
  memories: {
    recent: AgentMemory[]; // Last 5-10
    summary: string; // Summarized older memories
  };

  // Work ticket context
  task: {
    post_id: string;
    content: string;
    author: string;
    metadata: Record<string, any>;
  };
}
```

**3. Context Compression:**
```typescript
class ContextComposer {
  async composeMinimalContext(
    userId: string,
    agentType: string,
    ticket: WorkTicket
  ): Promise<AgentContext> {
    // Load TIER 1 (cached in memory)
    const template = await this.getSystemTemplate(agentType);

    // Load TIER 2 (cached per user)
    const custom = await this.getUserCustomization(userId, agentType);

    // Load TIER 3 (selective)
    const memories = await this.getRelevantMemories(
      userId,
      agentType,
      ticket,
      { limit: 10, recency: '7d' }
    );

    return {
      template,
      customization: custom,
      memories: {
        recent: memories.slice(0, 5),
        summary: this.summarizeMemories(memories.slice(5))
      },
      task: ticket
    };
  }
}
```

**4. IPC Message Passing:**
```typescript
// Parent (orchestrator)
const worker = fork('./worker.js');

worker.send({
  type: 'execute',
  context: serializeContext(context)
});

worker.on('message', (message) => {
  if (message.type === 'complete') {
    console.log('Worker completed:', message.result);
  }
});

// Child (worker)
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const context = JSON.parse(message.context);
    const result = await executeTask(context);

    process.send({
      type: 'complete',
      result: result
    });

    process.exit(0); // Ephemeral - exit after completion
  }
});
```

---

### 2.4 Worker Lifecycle Management

**Research Finding:** Proper lifecycle management is essential for stability.

#### **Complete Lifecycle Pattern**

```typescript
class WorkerLifecycleManager {
  private workers: Map<string, WorkerInstance> = new Map();

  async spawnWorker(ticket: WorkTicket): Promise<string> {
    const workerId = generateWorkerId();

    // 1. Create worker process
    const worker = fork('./workers/agent-worker.js', {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { WORKER_ID: workerId, TICKET_ID: ticket.id }
    });

    // 2. Track worker instance
    const instance: WorkerInstance = {
      id: workerId,
      process: worker,
      ticket: ticket,
      startTime: Date.now(),
      status: 'running'
    };

    this.workers.set(workerId, instance);

    // 3. Setup lifecycle handlers
    this.setupLifecycleHandlers(instance);

    // 4. Send work ticket
    worker.send({
      type: 'execute',
      ticket: ticket,
      context: await this.loadContext(ticket)
    });

    return workerId;
  }

  private setupLifecycleHandlers(instance: WorkerInstance): void {
    const { process, id } = instance;

    // Handle completion
    process.on('message', (msg) => {
      if (msg.type === 'complete') {
        instance.status = 'completed';
        this.handleCompletion(id, msg.result);
      }
    });

    // Handle exit
    process.on('exit', (code, signal) => {
      const duration = Date.now() - instance.startTime;

      logger.info('Worker exited', {
        workerId: id,
        exitCode: code,
        signal: signal,
        duration: duration,
        status: instance.status
      });

      this.workers.delete(id);

      // Handle abnormal exit
      if (code !== 0 && instance.status !== 'completed') {
        this.handleWorkerFailure(instance);
      }
    });

    // Handle errors
    process.on('error', (error) => {
      logger.error('Worker error', { workerId: id, error });
      instance.status = 'failed';
    });

    // Setup timeout
    setTimeout(() => {
      if (instance.status === 'running') {
        logger.warn('Worker timeout', { workerId: id });
        process.kill('SIGTERM');
      }
    }, 60000); // 60 second timeout
  }

  private async handleCompletion(
    workerId: string,
    result: any
  ): Promise<void> {
    // Save results to database
    await this.saveWorkerResult(workerId, result);

    // Update metrics
    this.updateMetrics(workerId, 'success');
  }

  private async handleWorkerFailure(
    instance: WorkerInstance
  ): Promise<void> {
    // Log error
    await db.query(
      `INSERT INTO error_log (agent_name, error_type, context, retry_count)
       VALUES ($1, $2, $3, $4)`,
      [
        instance.ticket.agentType,
        'worker_crash',
        JSON.stringify(instance.ticket),
        0
      ]
    );

    // Retry if not at limit
    if (instance.ticket.retryCount < 3) {
      instance.ticket.retryCount++;
      await this.spawnWorker(instance.ticket);
    }
  }
}

interface WorkerInstance {
  id: string;
  process: ChildProcess;
  ticket: WorkTicket;
  startTime: number;
  status: 'running' | 'completed' | 'failed';
}
```

---

## 3. Context Management & Token Optimization

### 3.1 Context Bloat Detection

**Research Finding:** LLM performance degrades significantly as context length increases.

#### **Key Issues with Context Bloat**

**Performance Degradation:**
- "Lost in the middle" effect: LLMs give less weight to information in the middle
- Easily distracted by irrelevant context
- Inconsistent predictions with small amounts of irrelevant information

**Token Costs:**
- Input tokens are expensive (especially with long context)
- Output tokens cost ~4x more than input tokens
- Wasted tokens on irrelevant information

#### **Detection Strategies**

```typescript
class ContextMonitor {
  private readonly CONTEXT_WARNING_THRESHOLD = 40000; // tokens
  private readonly CONTEXT_CRITICAL_THRESHOLD = 50000; // tokens

  async checkContextHealth(
    orchestratorContext: OrchestratorContext
  ): Promise<ContextHealthStatus> {
    // Count tokens (use Anthropic SDK)
    const tokenCount = await this.countTokens(orchestratorContext);

    if (tokenCount > this.CONTEXT_CRITICAL_THRESHOLD) {
      return {
        status: 'critical',
        tokens: tokenCount,
        action: 'restart_required'
      };
    } else if (tokenCount > this.CONTEXT_WARNING_THRESHOLD) {
      return {
        status: 'warning',
        tokens: tokenCount,
        action: 'consider_compaction'
      };
    }

    return {
      status: 'healthy',
      tokens: tokenCount,
      action: 'none'
    };
  }

  async countTokens(context: any): Promise<number> {
    // Use official Anthropic token counter
    const client = new Anthropic();

    const count = await client.messages.countTokens({
      model: 'claude-3-5-sonnet-20240620',
      messages: [{ role: 'user', content: JSON.stringify(context) }]
    });

    return count.input_tokens;
  }
}
```

---

### 3.2 Token Optimization Strategies

**Research Finding:** Practical strategies can cut token usage by 40-50%.

#### **1. Prompt Engineering**

**Concise Prompting:**
```typescript
// ❌ Bad: Verbose prompt (150 tokens)
const verbosePrompt = `
I would like you to please analyze the following social media post
and then provide a thoughtful and engaging response that takes into
account the user's personality preferences and interests while also
making sure to follow all of the posting rules and guidelines that
have been established for this particular agent type...
`;

// ✅ Good: Concise prompt (30 tokens)
const concisePrompt = `
Analyze this post and reply according to agent personality and rules.
`;

// 80% token reduction
```

**Structured Instructions:**
```typescript
interface AgentPrompt {
  task: string; // Single sentence
  context: string; // Minimal required context
  constraints: string[]; // Bullet points only
}

function buildPrompt(prompt: AgentPrompt): string {
  return `
Task: ${prompt.task}

Context: ${prompt.context}

Rules:
${prompt.constraints.map(c => `- ${c}`).join('\n')}
`.trim();
}
```

#### **2. Caching Strategy**

**Research Finding:** Cached tokens are 75% cheaper to process.

```typescript
class PromptCacheManager {
  // Place unchanging parts at top for efficient caching
  buildCachedPrompt(
    template: SystemTemplate, // Cached
    customization: UserCustomization, // Cached
    memories: AgentMemory[], // Dynamic
    task: WorkTicket // Dynamic
  ): string {
    return [
      // CACHED: System template (rarely changes)
      this.buildSystemSection(template),

      // CACHED: User customization (changes infrequently)
      this.buildCustomizationSection(customization),

      // DYNAMIC: Recent memories (changes frequently)
      this.buildMemoriesSection(memories),

      // DYNAMIC: Current task (unique per request)
      this.buildTaskSection(task)
    ].join('\n\n');
  }

  private buildSystemSection(template: SystemTemplate): string {
    // This section will be cached by Claude
    return `
System Agent: ${template.name}
Model: ${template.model}

Posting Rules:
${JSON.stringify(template.posting_rules, null, 2)}

Safety Constraints:
${JSON.stringify(template.safety_constraints, null, 2)}
    `.trim();
  }
}
```

#### **3. Context Compaction**

**Research Finding:** Compaction summarizes context, enabling continuation with minimal performance degradation.

```typescript
class ContextCompactor {
  async compactOrchestrator Context(
    currentContext: OrchestratorContext
  ): Promise<OrchestratorContext> {
    // Summarize old work tickets
    const recentTickets = currentContext.tickets.slice(-10);
    const oldTickets = currentContext.tickets.slice(0, -10);

    const ticketSummary = await this.summarizeTickets(oldTickets);

    return {
      ...currentContext,
      tickets: recentTickets,
      ticketHistory: ticketSummary, // Compressed summary
      lastCompaction: new Date()
    };
  }

  private async summarizeTickets(
    tickets: WorkTicket[]
  ): Promise<string> {
    // Use Claude to generate summary
    const ticketList = tickets.map(t =>
      `- ${t.agentType}: ${t.action} (${t.status})`
    ).join('\n');

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Summarize these work tickets in 2-3 sentences:\n${ticketList}`
      }]
    });

    return response.content[0].text;
  }
}
```

#### **4. Memory Selection**

**Research Finding:** Only load relevant memories, not entire history.

```typescript
class MemorySelector {
  async getRelevantMemories(
    userId: string,
    agentType: string,
    currentPost: Post,
    options: MemoryQueryOptions
  ): Promise<AgentMemory[]> {
    // Strategy 1: Recency (last N days)
    const recent = await db.query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
         AND agent_name = $2
         AND created_at > NOW() - INTERVAL '${options.recency}'
       ORDER BY created_at DESC
       LIMIT ${options.limit}`,
      [userId, agentType]
    );

    // Strategy 2: Tag-based (JSONB query)
    const tagged = await db.query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
         AND agent_name = $2
         AND metadata @> $3
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId, agentType, JSON.stringify({ tags: currentPost.tags })]
    );

    // Combine and deduplicate
    const combined = [...recent.rows, ...tagged.rows];
    return this.deduplicateMemories(combined).slice(0, options.limit);
  }
}

interface MemoryQueryOptions {
  limit: number; // Max memories to load
  recency: string; // e.g., '7d', '30d'
  tags?: string[]; // Optional tag filtering
}
```

#### **5. Tool Management**

**Research Finding:** Too many tools can consume 11.7K+ tokens.

```typescript
class ToolSelector {
  // Only pass relevant tools to worker
  selectToolsForAgent(
    agentType: string,
    task: WorkTicket
  ): ToolDefinition[] {
    const allTools = this.getAllTools();

    // Filter by agent capabilities
    const agentTools = allTools.filter(tool =>
      tool.supportedAgents.includes(agentType)
    );

    // Further filter by task type
    const relevantTools = agentTools.filter(tool =>
      tool.relevantFor.includes(task.action)
    );

    return relevantTools;
  }
}

// Example: Instead of 20 tools (11.7K tokens)
// Send only 3 relevant tools (~1.8K tokens)
// Token savings: 85%
```

---

### 3.3 Session Management

**Research Finding:** Start a new session for each new task to clear irrelevant context.

```typescript
class SessionManager {
  // Each worker gets fresh session
  async createWorkerSession(
    ticket: WorkTicket
  ): Promise<WorkerSession> {
    return {
      id: generateSessionId(),
      startTime: Date.now(),
      context: await this.loadMinimalContext(ticket),
      conversationHistory: [], // Empty for new worker
      tokenCount: 0
    };
  }

  // Orchestrator maintains persistent session
  // But compacts regularly
  async maintainOrchestratorSession(): Promise<void> {
    const currentTokens = await this.countSessionTokens();

    if (currentTokens > COMPACTION_THRESHOLD) {
      await this.compactSession();
    }
  }
}
```

---

## 4. Health Monitoring & Auto-Restart

### 4.1 Health Check Patterns

**Research Finding:** Continuous monitoring is essential for AI agent systems.

#### **Database Health Checks**

```typescript
class HealthMonitor {
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      // Simple connectivity check
      const result = await pool.query('SELECT 1 as health');

      // Check connection pool
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };

      return {
        status: 'healthy',
        database: 'connected',
        pool: poolStats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

#### **Orchestrator Health Checks**

```typescript
class AviHealthMonitor {
  private readonly checks: HealthCheck[] = [
    this.checkContextSize.bind(this),
    this.checkDatabaseConnection.bind(this),
    this.checkWorkerPool.bind(this),
    this.checkMemoryUsage.bind(this)
  ];

  async runHealthChecks(): Promise<OverallHealth> {
    const results = await Promise.all(
      this.checks.map(check => check())
    );

    const allHealthy = results.every(r => r.status === 'healthy');

    if (!allHealthy) {
      await this.handleUnhealthyState(results);
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks: results,
      timestamp: new Date()
    };
  }

  private async checkContextSize(): Promise<HealthCheckResult> {
    const contextSize = await this.getContextSize();

    if (contextSize > CRITICAL_THRESHOLD) {
      return {
        name: 'context_size',
        status: 'critical',
        value: contextSize,
        threshold: CRITICAL_THRESHOLD,
        action: 'restart_required'
      };
    } else if (contextSize > WARNING_THRESHOLD) {
      return {
        name: 'context_size',
        status: 'warning',
        value: contextSize,
        threshold: WARNING_THRESHOLD,
        action: 'compaction_recommended'
      };
    }

    return {
      name: 'context_size',
      status: 'healthy',
      value: contextSize
    };
  }

  private async checkWorkerPool(): Promise<HealthCheckResult> {
    const activeWorkers = this.workerPool.size;
    const maxWorkers = config.MAX_AGENT_WORKERS;

    if (activeWorkers >= maxWorkers) {
      return {
        name: 'worker_pool',
        status: 'warning',
        value: activeWorkers,
        threshold: maxWorkers,
        action: 'queue_new_tasks'
      };
    }

    return {
      name: 'worker_pool',
      status: 'healthy',
      value: activeWorkers,
      capacity: maxWorkers - activeWorkers
    };
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;

    const percentUsed = (heapUsedMB / heapTotalMB) * 100;

    if (percentUsed > 90) {
      return {
        name: 'memory_usage',
        status: 'critical',
        value: percentUsed,
        action: 'restart_required'
      };
    }

    return {
      name: 'memory_usage',
      status: 'healthy',
      value: percentUsed,
      heapUsedMB,
      heapTotalMB
    };
  }
}
```

---

### 4.2 Auto-Restart Mechanisms

**Research Finding:** Kubernetes-style health checks with automatic restart are standard practice.

#### **Health Endpoint Pattern**

```typescript
// Express health endpoint
app.get('/health', async (req, res) => {
  const health = await healthMonitor.runHealthChecks();

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
});

// Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

// If 3 consecutive failures, Kubernetes restarts pod
```

#### **Self-Restart Pattern**

```typescript
class AviOrchestrator {
  private healthCheckInterval: NodeJS.Timeout;

  async start(): Promise<void> {
    // Start health monitoring
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      config.HEALTH_CHECK_INTERVAL
    );

    // Start main loop
    await this.mainLoop();
  }

  private async performHealthCheck(): Promise<void> {
    const health = await healthMonitor.runHealthChecks();

    const critical = health.checks.find(c => c.status === 'critical');

    if (critical) {
      logger.warn('Critical health issue detected, initiating restart', {
        check: critical.name,
        value: critical.value,
        threshold: critical.threshold
      });

      await this.gracefulRestart();
    }
  }

  private async gracefulRestart(): Promise<void> {
    logger.info('Starting graceful restart');

    // 1. Stop accepting new work
    this.acceptingWork = false;

    // 2. Wait for active workers to complete
    await this.waitForWorkersToComplete(30000); // 30s timeout

    // 3. Save current state
    await this.saveState();

    // 4. Compact context if needed
    await this.compactContext();

    // 5. Restart process
    process.exit(0); // PM2/Docker will restart
  }

  private async waitForWorkersToComplete(
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();

    while (this.workerPool.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        logger.warn('Worker completion timeout, forcing shutdown');
        this.workerPool.forEach(w => w.kill('SIGTERM'));
        break;
      }

      await sleep(1000);
    }
  }
}
```

#### **PM2 Process Manager**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'avi-dm',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G', // Auto-restart on memory limit
    env: {
      NODE_ENV: 'production',
      HEALTH_CHECK_INTERVAL: 30000,
      AVI_CONTEXT_LIMIT: 50000
    },
    // Graceful shutdown
    kill_timeout: 30000, // Wait 30s for graceful shutdown
    wait_ready: true,
    listen_timeout: 10000
  }]
};

// In your app
process.send('ready'); // Signal to PM2 that app is ready
```

---

### 4.3 Inactivity Monitoring

**Research Finding:** Automatically dispose inactive agents to free resources.

```typescript
class InactivityMonitor {
  private lastActivity: Map<string, number> = new Map();
  private readonly INACTIVITY_THRESHOLD = 300000; // 5 minutes

  trackActivity(workerId: string): void {
    this.lastActivity.set(workerId, Date.now());
  }

  async checkInactivity(): Promise<void> {
    const now = Date.now();

    for (const [workerId, lastActive] of this.lastActivity) {
      const inactive = now - lastActive;

      if (inactive > this.INACTIVITY_THRESHOLD) {
        logger.info('Worker inactive, disposing', {
          workerId,
          inactiveMs: inactive
        });

        await this.disposeWorker(workerId);
        this.lastActivity.delete(workerId);
      }
    }
  }

  private async disposeWorker(workerId: string): Promise<void> {
    const worker = this.workerPool.get(workerId);
    if (worker) {
      worker.kill('SIGTERM');
      this.workerPool.delete(workerId);
    }
  }
}
```

---

## 5. Node.js Process Management

### 5.1 Child Process API

**Research Finding:** `child_process.fork()` is optimal for Node.js-to-Node.js communication.

#### **Fork vs Spawn**

**`fork()` - Recommended for AI Agents:**
- Spawns new Node.js processes
- Built-in IPC channel
- Can send messages bidirectionally
- Shares same V8 engine type

**`spawn()` - For non-Node processes:**
- General purpose process spawning
- IPC requires manual setup
- Can run any executable

#### **Complete Fork Example**

```typescript
// orchestrator.ts
import { fork, ChildProcess } from 'child_process';

class AgentOrchestrator {
  async spawnAgent(ticket: WorkTicket): Promise<ChildProcess> {
    const worker = fork('./workers/agent-worker.js', {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        WORKER_ID: generateId(),
        TICKET_ID: ticket.id,
        AGENT_TYPE: ticket.agentType,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    });

    // Send work ticket
    worker.send({
      type: 'execute',
      ticket: ticket,
      context: await this.composeContext(ticket)
    });

    // Handle responses
    worker.on('message', (message) => {
      switch (message.type) {
        case 'progress':
          this.handleProgress(message.data);
          break;
        case 'complete':
          this.handleCompletion(message.data);
          break;
        case 'error':
          this.handleError(message.error);
          break;
      }
    });

    // Handle exit
    worker.on('exit', (code, signal) => {
      if (code !== 0) {
        logger.error('Worker crashed', { code, signal, ticket });
      }
    });

    return worker;
  }
}

// worker.ts
import Anthropic from '@anthropic-ai/sdk';

// Receive message from parent
process.on('message', async (message) => {
  if (message.type === 'execute') {
    try {
      // Execute agent task
      const result = await executeAgentTask(
        message.ticket,
        message.context
      );

      // Send completion
      process.send({
        type: 'complete',
        data: result
      });

      // Exit cleanly
      process.exit(0);

    } catch (error) {
      // Send error
      process.send({
        type: 'error',
        error: {
          message: error.message,
          stack: error.stack
        }
      });

      process.exit(1);
    }
  }
});

async function executeAgentTask(
  ticket: WorkTicket,
  context: AgentContext
): Promise<AgentResult> {
  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Send progress updates
  process.send({ type: 'progress', data: { stage: 'analyzing' } });

  const response = await claude.messages.create({
    model: context.template.model,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${context.customization.personality}\n\nRespond to: ${ticket.content}`
    }]
  });

  process.send({ type: 'progress', data: { stage: 'saving' } });

  // Save memory
  await saveMemory({
    user_id: ticket.userId,
    agent_name: context.template.name,
    content: response.content[0].text,
    metadata: { post_id: ticket.post_id }
  });

  return {
    response: response.content[0].text,
    tokens: response.usage.input_tokens + response.usage.output_tokens
  };
}
```

---

### 5.2 IPC Message Patterns

**Research Finding:** JSON is standard for IPC, but consider message size.

#### **Message Format**

```typescript
// Type-safe message protocol
interface WorkerMessage {
  type: 'execute' | 'progress' | 'complete' | 'error' | 'shutdown';
  data?: any;
  error?: ErrorInfo;
  timestamp?: number;
}

// Parent → Child
worker.send({
  type: 'execute',
  data: {
    ticket: workTicket,
    context: agentContext
  },
  timestamp: Date.now()
} as WorkerMessage);

// Child → Parent
process.send({
  type: 'complete',
  data: {
    result: executionResult,
    metrics: {
      duration: 15000,
      tokens: 8500
    }
  },
  timestamp: Date.now()
} as WorkerMessage);
```

#### **Large Context Handling**

```typescript
// For contexts > 100KB, use shared memory or temp files
class LargeContextHandler {
  async sendLargeContext(
    worker: ChildProcess,
    context: AgentContext
  ): Promise<void> {
    const contextSize = JSON.stringify(context).length;

    if (contextSize > 100_000) {
      // Write to temp file
      const tempFile = `/tmp/context-${generateId()}.json`;
      await fs.writeFile(tempFile, JSON.stringify(context));

      // Send file path
      worker.send({
        type: 'execute',
        data: {
          contextFile: tempFile, // Worker reads from file
          ticket: workTicket
        }
      });
    } else {
      // Send inline
      worker.send({
        type: 'execute',
        data: {
          context: context, // Direct JSON
          ticket: workTicket
        }
      });
    }
  }
}
```

---

### 5.3 Process Isolation

**Research Finding:** Spawned Node.js child processes are independent, with own memory and V8 instances.

#### **Benefits of Process Isolation**

1. **Memory Isolation:** Worker crash doesn't affect orchestrator
2. **CPU Isolation:** Worker CPU spike doesn't block orchestrator
3. **Error Isolation:** Unhandled exceptions contained to worker
4. **Clean State:** Each worker starts fresh

#### **Resource Limits**

```typescript
// Set resource limits for workers
function spawnWorkerWithLimits(ticket: WorkTicket): ChildProcess {
  return fork('./workers/agent-worker.js', {
    execArgv: [
      '--max-old-space-size=512', // 512MB heap limit
      '--max-semi-space-size=16'  // Young generation limit
    ],
    env: {
      ...process.env,
      WORKER_ID: generateId(),
      TICKET_ID: ticket.id
    }
  });
}
```

---

## 6. Graceful Shutdown Patterns

### 6.1 Signal Handling

**Research Finding:** Node.js processes should listen for `SIGTERM` (system) and `SIGINT` (Ctrl+C).

#### **Orchestrator Shutdown**

```typescript
class AviOrchestrator {
  private shutdownInProgress = false;

  setupSignalHandlers(): void {
    // SIGTERM: System shutdown (Docker, Kubernetes)
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, starting graceful shutdown');
      await this.gracefulShutdown();
    });

    // SIGINT: User interrupt (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, starting graceful shutdown');
      await this.gracefulShutdown();
    });

    // Uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', { error });
      await this.emergencyShutdown();
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled rejection', { reason });
      await this.emergencyShutdown();
    });
  }

  async gracefulShutdown(): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    try {
      // 1. Stop accepting new work
      this.stopAcceptingWork();

      // 2. Wait for active workers to complete
      await this.waitForWorkersToComplete(30000);

      // 3. Save orchestrator state
      await this.saveState();

      // 4. Close database connections
      await this.closeDatabase();

      // 5. Exit cleanly
      logger.info('Graceful shutdown complete');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  }

  private async waitForWorkersToComplete(
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();

    logger.info('Waiting for workers to complete', {
      activeWorkers: this.workerPool.size
    });

    while (this.workerPool.size > 0) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        logger.warn('Worker completion timeout, forcing shutdown');

        // Force terminate remaining workers
        this.workerPool.forEach((worker, id) => {
          logger.warn('Forcefully terminating worker', { id });
          worker.kill('SIGKILL');
        });

        break;
      }

      // Wait 1 second before checking again
      await sleep(1000);
    }

    logger.info('All workers completed or terminated');
  }

  private async saveState(): Promise<void> {
    logger.info('Saving orchestrator state');

    await db.query(
      `UPDATE avi_state SET
        last_feed_position = $1,
        context_size = $2,
        uptime_seconds = $3,
        last_restart = NOW()
       WHERE id = 1`,
      [
        this.state.last_feed_position,
        this.state.context_size,
        Math.floor(process.uptime())
      ]
    );
  }

  private async closeDatabase(): Promise<void> {
    logger.info('Closing database connections');
    await pool.end();
  }
}
```

---

### 6.2 Worker Shutdown

```typescript
// worker.ts
class AgentWorker {
  private shutdownInProgress = false;

  setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      logger.info('Worker received SIGTERM');
      await this.gracefulShutdown();
    });
  }

  async gracefulShutdown(): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    try {
      // 1. Finish current task if nearly complete
      if (this.currentTask && this.currentTask.progress > 0.8) {
        logger.info('Finishing current task before shutdown');
        await this.finishCurrentTask(5000); // 5s timeout
      }

      // 2. Save partial progress
      if (this.currentTask) {
        await this.savePartialProgress();
      }

      // 3. Close resources
      await this.cleanup();

      // 4. Notify parent
      if (process.send) {
        process.send({ type: 'shutdown_complete' });
      }

      // 5. Exit
      process.exit(0);

    } catch (error) {
      logger.error('Error during worker shutdown', { error });
      process.exit(1);
    }
  }

  private async savePartialProgress(): Promise<void> {
    // Mark ticket as incomplete for retry
    await db.query(
      `UPDATE work_tickets
       SET status = 'incomplete', retry_count = retry_count + 1
       WHERE id = $1`,
      [this.currentTask.ticketId]
    );
  }
}
```

---

### 6.3 Cluster Mode Shutdown

**Research Finding:** In cluster mode, master must gracefully terminate all workers.

```typescript
// For future Phase 3+ scaling
import cluster from 'cluster';

if (cluster.isMaster) {
  // Master process
  const workers: Worker[] = [];

  // Spawn workers
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork());
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Master received SIGTERM, shutting down workers');

    // Signal all workers to shut down
    workers.forEach(worker => {
      worker.send({ type: 'shutdown' });
    });

    // Wait for workers to exit
    await Promise.all(
      workers.map(worker => new Promise(resolve => {
        worker.on('exit', resolve);

        // Force kill after timeout
        setTimeout(() => {
          worker.kill('SIGKILL');
          resolve();
        }, 30000);
      }))
    );

    logger.info('All workers shut down');
    process.exit(0);
  });
} else {
  // Worker process
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      gracefulShutdown();
    }
  });
}
```

---

## 7. Claude API Best Practices

### 7.1 Token Counting

**Research Finding:** Use Anthropic's official SDK for accurate token counting.

#### **Official Token Counter**

```typescript
import Anthropic from '@anthropic-ai/sdk';

class TokenCounter {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async countMessageTokens(
    messages: Array<{ role: string; content: string }>,
    model: string = 'claude-3-5-sonnet-20240620'
  ): Promise<number> {
    const count = await this.client.messages.countTokens({
      model: model,
      messages: messages
    });

    return count.input_tokens;
  }

  async countSystemPromptTokens(
    systemPrompt: string,
    model: string = 'claude-3-5-sonnet-20240620'
  ): Promise<number> {
    const count = await this.client.messages.countTokens({
      model: model,
      messages: [{ role: 'user', content: 'test' }],
      system: systemPrompt
    });

    return count.input_tokens;
  }

  // Get exact token counts from response
  getResponseTokens(response: Anthropic.Message): TokenUsage {
    return {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}
```

---

### 7.2 Streaming vs Non-Streaming

#### **When to Use Streaming**

**Non-Streaming (Recommended for Avi DM):**
```typescript
// Simpler, wait for complete response
const response = await claude.messages.create({
  model: 'claude-3-5-sonnet-20240620',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
});

const text = response.content[0].text;
```

**Streaming (For Future UI):**
```typescript
// Real-time response streaming
const stream = await claude.messages.stream({
  model: 'claude-3-5-sonnet-20240620',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
});

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

---

### 7.3 Error Handling & Retries

```typescript
class ClaudeAPIWrapper {
  private client: Anthropic;
  private retryConfig = {
    maxAttempts: 3,
    backoffMs: [1000, 5000, 15000]
  };

  async createMessage(
    params: Anthropic.MessageCreateParams
  ): Promise<Anthropic.Message> {
    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await this.client.messages.create(params);

      } catch (error) {
        // Don't retry on client errors
        if (error.status && error.status < 500) {
          throw error;
        }

        // Retry on server errors
        if (attempt < this.retryConfig.maxAttempts - 1) {
          const backoff = this.retryConfig.backoffMs[attempt];
          logger.warn('Claude API error, retrying', {
            attempt: attempt + 1,
            backoffMs: backoff,
            error: error.message
          });

          await sleep(backoff);
          continue;
        }

        // Final attempt failed
        throw error;
      }
    }
  }
}
```

---

### 7.4 Rate Limiting

```typescript
class RateLimiter {
  private requestTimes: number[] = [];
  private readonly MAX_RPM = 50; // requests per minute

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requestTimes = this.requestTimes.filter(t => t > oneMinuteAgo);

    // Check if at limit
    if (this.requestTimes.length >= this.MAX_RPM) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest);

      logger.info('Rate limit reached, waiting', { waitMs: waitTime });
      await sleep(waitTime);
    }

    // Add current request
    this.requestTimes.push(now);
  }
}

// Usage
const rateLimiter = new RateLimiter();

async function callClaude(prompt: string): Promise<string> {
  await rateLimiter.waitForSlot();

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}
```

---

## 8. Implementation Recommendations

### 8.1 Architecture Summary for Avi DM

Based on all research findings, here's the recommended architecture:

#### **Orchestrator (Avi DM)**

**Characteristics:**
- **Persistent:** Always running, monitors feed
- **Lightweight:** 1,500-2,000 tokens context
- **Stateless logic:** Minimal decision-making
- **Database-backed:** State persisted to PostgreSQL

**Responsibilities:**
1. Monitor social media feed
2. Create work tickets for interesting posts
3. Select appropriate agent type
4. Spawn ephemeral workers
5. Quick validation of responses
6. Health monitoring and auto-restart

**Token Budget:**
- System prompt: ~500 tokens
- Recent tickets: ~800 tokens (10 tickets @ 80 tokens each)
- Current state: ~200 tokens
- **Total: ~1,500 tokens**

#### **Workers (Ephemeral Agents)**

**Characteristics:**
- **Ephemeral:** 30-60 second lifespan
- **Stateful:** Full context loaded from database
- **Specialized:** One agent type per worker
- **Isolated:** Child process with own memory

**Responsibilities:**
1. Load full agent identity from database
2. Retrieve relevant memories
3. Generate response using Claude API
4. Validate response against rules
5. Save memory to database
6. Exit cleanly

**Token Budget:**
- System template: ~2,000 tokens
- User customization: ~500 tokens
- Recent memories: ~4,000 tokens (10 memories @ 400 tokens each)
- Current post: ~1,500 tokens
- **Total: ~8,000 tokens**

---

### 8.2 File Structure Recommendations

```typescript
// src/avi/orchestrator.ts
export class AviOrchestrator {
  private state: AviState;
  private workerPool: Map<string, ChildProcess>;
  private healthMonitor: HealthMonitor;

  async start(): Promise<void>;
  async processPost(post: Post): Promise<void>;
  async spawnWorker(ticket: WorkTicket): Promise<ChildProcess>;
  async checkHealth(): Promise<void>;
  async gracefulShutdown(): Promise<void>;
}

// src/workers/agent-worker.ts
export class AgentWorker {
  private context: AgentContext;
  private claude: Anthropic;

  async execute(ticket: WorkTicket): Promise<void>;
  async loadContext(ticket: WorkTicket): Promise<AgentContext>;
  async generateResponse(ticket: WorkTicket): Promise<string>;
  async saveMemory(response: string): Promise<void>;
}

// src/database/context-composer.ts
export class ContextComposer {
  async composeMinimalContext(ticket: WorkTicket): Promise<AgentContext>;
  async getSystemTemplate(agentType: string): Promise<SystemTemplate>;
  async getUserCustomization(userId: string, agentType: string): Promise<UserCustomization>;
  async getRelevantMemories(userId: string, agentType: string, limit: number): Promise<AgentMemory[]>;
}

// src/monitoring/health-monitor.ts
export class HealthMonitor {
  async runHealthChecks(): Promise<OverallHealth>;
  async checkContextSize(): Promise<HealthCheckResult>;
  async checkDatabaseHealth(): Promise<HealthCheckResult>;
  async checkWorkerPool(): Promise<HealthCheckResult>;
}

// src/utils/token-counter.ts
export class TokenCounter {
  async countTokens(content: any): Promise<number>;
  async trackTokenUsage(operation: string, tokens: number): Promise<void>;
}
```

---

### 8.3 Configuration Recommendations

```typescript
// .env (add to existing)
# Orchestrator Configuration
AVI_CONTEXT_LIMIT=50000
AVI_COMPACTION_THRESHOLD=40000
AVI_RESTART_THRESHOLD=50000

# Worker Configuration
MAX_AGENT_WORKERS=10
WORKER_TIMEOUT_MS=60000
WORKER_MEMORY_LIMIT_MB=512

# Health Monitoring
HEALTH_CHECK_INTERVAL=30000
ENABLE_AUTO_RESTART=true

# Retry Configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=5000,30000,120000

# Token Limits
MAX_CONTEXT_TOKENS=8000
MAX_RESPONSE_TOKENS=1024
```

---

### 8.4 Testing Recommendations

```typescript
// tests/unit/avi/orchestrator.test.ts
describe('AviOrchestrator', () => {
  it('should maintain context under limit', async () => {
    const orchestrator = new AviOrchestrator();
    await orchestrator.start();

    // Simulate processing 100 posts
    for (let i = 0; i < 100; i++) {
      await orchestrator.processPost(mockPost());
    }

    const contextSize = await orchestrator.getContextSize();
    expect(contextSize).toBeLessThan(CONTEXT_LIMIT);
  });

  it('should restart on context bloat', async () => {
    const orchestrator = new AviOrchestrator();
    const restartSpy = jest.spyOn(orchestrator, 'gracefulRestart');

    // Force context bloat
    orchestrator.state.context_size = 60000;

    await orchestrator.checkHealth();

    expect(restartSpy).toHaveBeenCalled();
  });
});

// tests/integration/workers/agent-worker.test.ts
describe('AgentWorker', () => {
  it('should spawn, execute, and exit cleanly', async () => {
    const ticket = createMockTicket();
    const workerId = await orchestrator.spawnWorker(ticket);

    // Wait for completion
    const result = await waitForWorkerCompletion(workerId, 30000);

    expect(result.status).toBe('completed');
    expect(result.exitCode).toBe(0);
  });

  it('should handle timeout gracefully', async () => {
    const ticket = createSlowMockTicket(); // Simulates slow worker
    const workerId = await orchestrator.spawnWorker(ticket);

    const result = await waitForWorkerCompletion(workerId, 5000);

    expect(result.status).toBe('timeout');
    expect(result.exitCode).toBe(null); // Killed by timeout
  });
});
```

---

### 8.5 Monitoring & Observability

```typescript
// src/monitoring/metrics-collector.ts
export class MetricsCollector {
  private metrics: Metrics = {
    orchestrator: {
      uptime: 0,
      context_size: 0,
      restarts: 0,
      posts_processed: 0
    },
    workers: {
      spawned: 0,
      completed: 0,
      failed: 0,
      avg_duration_ms: 0,
      avg_tokens: 0
    },
    database: {
      query_count: 0,
      avg_query_time_ms: 0,
      connection_pool_size: 0
    }
  };

  async collectMetrics(): Promise<Metrics> {
    return this.metrics;
  }

  async exportPrometheus(): Promise<string> {
    // Export in Prometheus format for monitoring
    return `
# HELP avi_orchestrator_context_size Current context size in tokens
# TYPE avi_orchestrator_context_size gauge
avi_orchestrator_context_size ${this.metrics.orchestrator.context_size}

# HELP avi_workers_spawned_total Total workers spawned
# TYPE avi_workers_spawned_total counter
avi_workers_spawned_total ${this.metrics.workers.spawned}

# HELP avi_workers_avg_duration_ms Average worker duration
# TYPE avi_workers_avg_duration_ms gauge
avi_workers_avg_duration_ms ${this.metrics.workers.avg_duration_ms}
    `.trim();
  }
}
```

---

## 9. Code Examples & Patterns

### 9.1 Complete Orchestrator Example

```typescript
// src/avi/orchestrator.ts
import { fork, ChildProcess } from 'child_process';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

export class AviOrchestrator {
  private state: AviState;
  private workerPool: Map<string, WorkerInstance>;
  private healthMonitor: HealthMonitor;
  private pool: Pool;
  private claude: Anthropic;
  private shutdownInProgress: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
    this.workerPool = new Map();
    this.healthMonitor = new HealthMonitor(pool);
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.setupSignalHandlers();
  }

  async start(): Promise<void> {
    logger.info('Starting Avi DM Orchestrator');

    // Load persisted state
    this.state = await this.loadState();

    // Start health monitoring
    this.startHealthMonitoring();

    // Start main loop
    await this.mainLoop();
  }

  private async loadState(): Promise<AviState> {
    const result = await this.pool.query(
      'SELECT * FROM avi_state WHERE id = 1'
    );

    if (result.rows.length === 0) {
      // Initialize state
      return {
        id: 1,
        last_feed_position: '0',
        pending_tickets: [],
        context_size: 0,
        last_restart: new Date(),
        uptime_seconds: 0
      };
    }

    return result.rows[0];
  }

  private async mainLoop(): Promise<void> {
    while (!this.shutdownInProgress) {
      try {
        // 1. Fetch new posts from feed
        const posts = await this.fetchFeed(this.state.last_feed_position);

        // 2. Process each post
        for (const post of posts) {
          await this.processPost(post);
        }

        // 3. Update state
        if (posts.length > 0) {
          this.state.last_feed_position = posts[posts.length - 1].id;
          await this.saveState();
        }

        // 4. Wait before next iteration
        await sleep(5000); // 5 seconds

      } catch (error) {
        logger.error('Error in main loop', { error });
        await sleep(10000); // Back off on error
      }
    }
  }

  private async processPost(post: Post): Promise<void> {
    logger.info('Processing post', { post_id: post.id });

    // 1. Decide if we should respond
    const shouldRespond = await this.decideResponse(post);

    if (!shouldRespond) {
      logger.debug('Skipping post', { post_id: post.id });
      return;
    }

    // 2. Select agent type
    const agentType = this.selectAgentType(post);

    // 3. Create work ticket
    const ticket = await this.createWorkTicket(post, agentType);

    // 4. Check worker pool capacity
    if (this.workerPool.size >= config.MAX_AGENT_WORKERS) {
      logger.warn('Worker pool at capacity, queueing ticket');
      this.state.pending_tickets.push(ticket);
      return;
    }

    // 5. Spawn worker
    await this.spawnWorker(ticket);
  }

  private async decideResponse(post: Post): Promise<boolean> {
    // Minimal decision logic (low token usage)
    const prompt = `Should we respond to this post? Reply YES or NO.

Post: ${post.content.slice(0, 200)}`;

    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    });

    const decision = response.content[0].text.trim().toUpperCase();
    return decision === 'YES';
  }

  private selectAgentType(post: Post): string {
    // Simple rule-based selection
    if (post.tags.includes('tech')) return 'tech-guru';
    if (post.tags.includes('creative')) return 'creative-writer';
    return 'data-analyst'; // Default
  }

  private async createWorkTicket(
    post: Post,
    agentType: string
  ): Promise<WorkTicket> {
    const ticket: WorkTicket = {
      id: generateTicketId(),
      post_id: post.id,
      user_id: 'system', // TODO: Get from config
      agent_type: agentType,
      content: post.content,
      author: post.author,
      action: 'reply',
      status: 'pending',
      retry_count: 0,
      created_at: new Date()
    };

    // Persist ticket
    await this.pool.query(
      `INSERT INTO work_tickets (id, post_id, user_id, agent_type, content, action, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ticket.id, ticket.post_id, ticket.user_id, ticket.agent_type,
       ticket.content, ticket.action, ticket.status]
    );

    return ticket;
  }

  async spawnWorker(ticket: WorkTicket): Promise<void> {
    logger.info('Spawning worker', {
      ticket_id: ticket.id,
      agent_type: ticket.agent_type
    });

    const worker = fork('./dist/workers/agent-worker.js', {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        WORKER_ID: generateWorkerId(),
        TICKET_ID: ticket.id,
        AGENT_TYPE: ticket.agent_type
      }
    });

    const instance: WorkerInstance = {
      id: generateWorkerId(),
      process: worker,
      ticket: ticket,
      startTime: Date.now(),
      status: 'running'
    };

    this.workerPool.set(instance.id, instance);

    // Setup handlers
    this.setupWorkerHandlers(instance);

    // Send work ticket
    worker.send({
      type: 'execute',
      ticket: ticket
    });
  }

  private setupWorkerHandlers(instance: WorkerInstance): void {
    const { process: worker, id } = instance;

    worker.on('message', (message) => {
      switch (message.type) {
        case 'complete':
          this.handleWorkerCompletion(id, message.data);
          break;
        case 'error':
          this.handleWorkerError(id, message.error);
          break;
        case 'progress':
          this.handleWorkerProgress(id, message.data);
          break;
      }
    });

    worker.on('exit', (code, signal) => {
      const duration = Date.now() - instance.startTime;

      logger.info('Worker exited', {
        worker_id: id,
        exit_code: code,
        signal: signal,
        duration_ms: duration,
        status: instance.status
      });

      this.workerPool.delete(id);

      if (code !== 0 && instance.status !== 'completed') {
        this.handleWorkerCrash(instance);
      }
    });

    worker.on('error', (error) => {
      logger.error('Worker error', { worker_id: id, error });
    });

    // Setup timeout
    setTimeout(() => {
      if (instance.status === 'running') {
        logger.warn('Worker timeout', { worker_id: id });
        worker.kill('SIGTERM');
      }
    }, config.WORKER_TIMEOUT_MS);
  }

  private async handleWorkerCompletion(
    workerId: string,
    result: any
  ): Promise<void> {
    const instance = this.workerPool.get(workerId);
    if (!instance) return;

    instance.status = 'completed';

    logger.info('Worker completed', {
      worker_id: workerId,
      ticket_id: instance.ticket.id,
      duration_ms: Date.now() - instance.startTime
    });

    // Update ticket status
    await this.pool.query(
      'UPDATE work_tickets SET status = $1 WHERE id = $2',
      ['completed', instance.ticket.id]
    );
  }

  private async handleWorkerCrash(instance: WorkerInstance): Promise<void> {
    logger.error('Worker crashed', {
      worker_id: instance.id,
      ticket_id: instance.ticket.id,
      retry_count: instance.ticket.retry_count
    });

    // Log error
    await this.pool.query(
      `INSERT INTO error_log (agent_name, error_type, context, retry_count)
       VALUES ($1, $2, $3, $4)`,
      [
        instance.ticket.agent_type,
        'worker_crash',
        JSON.stringify(instance.ticket),
        instance.ticket.retry_count
      ]
    );

    // Retry if under limit
    if (instance.ticket.retry_count < 3) {
      instance.ticket.retry_count++;
      await this.spawnWorker(instance.ticket);
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      const health = await this.healthMonitor.runHealthChecks();

      const critical = health.checks.find(c => c.status === 'critical');
      if (critical) {
        logger.warn('Critical health issue, restarting', {
          check: critical.name,
          value: critical.value
        });

        await this.gracefulRestart();
      }
    }, config.HEALTH_CHECK_INTERVAL);
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      await this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    logger.info('Starting graceful shutdown');

    // Wait for workers
    await this.waitForWorkersToComplete(30000);

    // Save state
    await this.saveState();

    // Close database
    await this.pool.end();

    logger.info('Shutdown complete');
    process.exit(0);
  }

  private async gracefulRestart(): Promise<void> {
    await this.gracefulShutdown();
    // PM2/Docker will restart the process
  }

  private async saveState(): Promise<void> {
    await this.pool.query(
      `UPDATE avi_state SET
        last_feed_position = $1,
        context_size = $2,
        uptime_seconds = $3
       WHERE id = 1`,
      [
        this.state.last_feed_position,
        this.state.context_size,
        Math.floor(process.uptime())
      ]
    );
  }

  private async waitForWorkersToComplete(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (this.workerPool.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        this.workerPool.forEach(w => w.process.kill('SIGKILL'));
        break;
      }
      await sleep(1000);
    }
  }
}
```

---

### 9.2 Complete Worker Example

```typescript
// src/workers/agent-worker.ts
import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

class AgentWorker {
  private pool: Pool;
  private claude: Anthropic;
  private ticket: WorkTicket;
  private context: AgentContext;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.setupSignalHandlers();
  }

  async start(): Promise<void> {
    // Receive work ticket from parent
    process.on('message', async (message) => {
      if (message.type === 'execute') {
        this.ticket = message.ticket;
        await this.execute();
      }
    });
  }

  private async execute(): Promise<void> {
    try {
      logger.info('Worker executing', {
        ticket_id: this.ticket.id,
        agent_type: this.ticket.agent_type
      });

      // 1. Load context from database
      this.context = await this.loadContext();

      // 2. Generate response
      const response = await this.generateResponse();

      // 3. Validate response
      const valid = await this.validateResponse(response);

      if (!valid) {
        throw new Error('Response validation failed');
      }

      // 4. Save memory
      await this.saveMemory(response);

      // 5. Notify parent of completion
      if (process.send) {
        process.send({
          type: 'complete',
          data: {
            ticket_id: this.ticket.id,
            response: response.content,
            tokens: response.tokens
          }
        });
      }

      // 6. Exit cleanly
      await this.cleanup();
      process.exit(0);

    } catch (error) {
      logger.error('Worker execution failed', {
        ticket_id: this.ticket?.id,
        error: error
      });

      // Notify parent of error
      if (process.send) {
        process.send({
          type: 'error',
          error: {
            message: error.message,
            stack: error.stack
          }
        });
      }

      await this.cleanup();
      process.exit(1);
    }
  }

  private async loadContext(): Promise<AgentContext> {
    const composer = new ContextComposer(this.pool);

    return await composer.composeMinimalContext(
      this.ticket.user_id,
      this.ticket.agent_type,
      this.ticket
    );
  }

  private async generateResponse(): Promise<AgentResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt();

    const response = await this.claude.messages.create({
      model: this.context.template.model,
      max_tokens: config.MAX_RESPONSE_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    return {
      content: response.content[0].text,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  private buildSystemPrompt(): string {
    return `
${this.context.customization.personality}

You are ${this.context.template.name}, responding to social media posts.

Posting Rules:
${JSON.stringify(this.context.template.posting_rules, null, 2)}

Safety Constraints:
${JSON.stringify(this.context.template.safety_constraints, null, 2)}

Response Style:
${JSON.stringify(this.context.customization.response_style, null, 2)}
    `.trim();
  }

  private buildUserPrompt(): string {
    const recentMemories = this.context.memories.recent
      .map(m => `- ${m.content}`)
      .join('\n');

    return `
Recent interactions:
${recentMemories}

New post to respond to:
Author: ${this.ticket.author}
Content: ${this.ticket.content}

Generate an engaging response following the rules and style above.
    `.trim();
  }

  private async validateResponse(response: AgentResponse): Promise<boolean> {
    // Check length
    if (response.content.length > this.context.template.posting_rules.max_length) {
      logger.warn('Response too long', {
        length: response.content.length,
        max: this.context.template.posting_rules.max_length
      });
      return false;
    }

    // Check prohibited words
    const prohibited = this.context.template.posting_rules.prohibited_words;
    const hasProhibited = prohibited.some(word =>
      response.content.toLowerCase().includes(word.toLowerCase())
    );

    if (hasProhibited) {
      logger.warn('Response contains prohibited words');
      return false;
    }

    return true;
  }

  private async saveMemory(response: AgentResponse): Promise<void> {
    await this.pool.query(
      `INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        this.ticket.user_id,
        this.context.template.name,
        this.ticket.post_id,
        response.content,
        JSON.stringify({
          tokens: response.tokens,
          in_response_to: this.ticket.content
        })
      ]
    );
  }

  private async cleanup(): Promise<void> {
    await this.pool.end();
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      logger.info('Worker received SIGTERM');
      await this.cleanup();
      process.exit(0);
    });
  }
}

// Start worker
const worker = new AgentWorker();
worker.start();
```

---

## 10. References

### Research Sources

**AI Orchestration Patterns:**
- Microsoft Azure: AI Agent Orchestration Patterns (https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- AWS: Design multi-agent orchestration with Amazon Bedrock
- LangGraph: Orchestrator-Worker Model
- Anthropic: Building Effective AI Agents

**Ephemeral Workers:**
- Cloud Native Now: Ephemeral Workloads
- DBOS: What is Lightweight Durable Execution
- Arize AI: Orchestrator-Worker Agents

**Context Management:**
- Anthropic: Effective Context Engineering for AI Agents
- MLOps Community: Impact of Prompt Bloat on LLM Output Quality
- RAG-MCP: Mitigating Prompt Bloat (arXiv:2505.03275)

**Node.js Process Management:**
- Node.js Official Documentation: Child Process Module
- RisingStack: Graceful Shutdown with Node.js and Kubernetes

**Token Optimization:**
- Anthropic: Token Counting Documentation
- 10clouds: Mastering AI Token Cost Optimization
- Medium: Token Optimization Strategies for AI Agents

**Health Monitoring:**
- AWS: Node Health Monitoring and Auto-Repair for Amazon EKS
- Microsoft: Scheduler Agent Supervisor Pattern

**Best Practices:**
- AWS: Best Practices for Building Robust Generative AI Applications
- Microsoft: Agent Observability Best Practices
- Anthropic: Claude API Development Guide

---

## Summary

### Key Takeaways for Phase 2

**1. Orchestrator Design:**
- Use Orchestrator-Workers pattern
- Keep orchestrator lightweight (1.5-2K tokens)
- Persistent state in PostgreSQL
- Regular health checks and auto-restart

**2. Worker Management:**
- Spawn using `child_process.fork()`
- 30-60 second lifespan
- Full context from database
- Clean exit after completion

**3. Context Optimization:**
- 52% token reduction vs. full context
- Selective memory loading
- Deterministic serialization
- Prompt caching

**4. Health & Reliability:**
- Continuous health monitoring
- Auto-restart on context bloat
- Graceful shutdown with 30s timeout
- Retry logic with exponential backoff

**5. Token Management:**
- Use Anthropic SDK for counting
- Track per-operation usage
- Compaction when nearing limits
- Tool filtering by relevance

### Next Steps

**Phase 2 Implementation:**
1. Implement `AviOrchestrator` class
2. Implement `AgentWorker` class
3. Implement `ContextComposer` class
4. Implement `HealthMonitor` class
5. Add worker lifecycle management
6. Add graceful shutdown handlers
7. Comprehensive testing

**Success Criteria:**
- ✅ Orchestrator maintains <2K token context
- ✅ Workers complete in <60 seconds
- ✅ Auto-restart on context bloat
- ✅ Zero data loss on shutdown
- ✅ 80%+ test coverage

---

**Document Status:** ✅ Research Complete - Ready for Phase 2 Implementation
**Last Updated:** 2025-10-10
**Version:** 1.0

---

**Related Documents:**
- Phase 1 Architecture: `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
- Phase 1 ADRs: `/workspaces/agent-feed/PHASE-1-ARCHITECTURE-DECISIONS.md`
- Main Architecture: `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
