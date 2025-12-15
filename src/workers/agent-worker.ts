/**
 * Agent Worker Implementation
 * TDD London School - Ephemeral worker for agent task execution
 *
 * Lifecycle: constructor → loadContext → executeTask → saveMemory → destroy
 * Total expected lifetime: 30-60 seconds
 */

import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import {
  WorkerStatus,
  AgentWorkerConfig,
  WorkerMetrics,
  WorkerEventEmitter
} from '../types/worker';
import { WorkTicket } from '../types/work-ticket';
import { AgentContext } from '../types/agent-context';
import { DatabaseManager } from '../types/database-manager';
import { composeAgentContext, getModelForAgent } from '../database/context-composer';

/**
 * Agent Worker - Ephemeral worker for executing agent tasks
 */
export class AgentWorker extends EventEmitter implements WorkerEventEmitter {
  private workerId: string;
  private agentType: string;
  private userId: string;
  private database: DatabaseManager;
  private config: Partial<AgentWorkerConfig>;

  private status: WorkerStatus = WorkerStatus.IDLE;
  private context?: AgentContext;
  private claudeClient?: Anthropic;

  // Metrics tracking
  private startTime: number = Date.now();
  private contextLoadStartTime: number = 0;
  private contextLoadEndTime: number = 0;
  private executionStartTime: number = 0;
  private executionEndTime: number = 0;
  private memorySaveStartTime: number = 0;
  private memorySaveEndTime: number = 0;
  private tokensUsed: number = 0;
  private lastError?: string;

  // Timeout handling
  private timeoutHandle?: NodeJS.Timeout;

  constructor(
    workerId: string,
    agentType: string,
    userId: string,
    database: DatabaseManager,
    config?: Partial<AgentWorkerConfig>
  ) {
    super();

    this.workerId = workerId;
    this.agentType = agentType;
    this.userId = userId;
    this.database = database;
    this.config = {
      timeout: 60000, // 60 seconds default
      saveMemories: true,
      ...config
    };
  }

  /**
   * Get worker ID
   */
  getId(): string {
    return this.workerId;
  }

  /**
   * Get current worker status
   */
  getStatus(): WorkerStatus {
    return this.status;
  }

  /**
   * Load agent context from database
   */
  async loadContext(): Promise<void> {
    this.setStatus(WorkerStatus.LOADING_CONTEXT);
    this.contextLoadStartTime = Date.now();

    try {
      // Load context from database using Phase 1 context composer
      this.context = await composeAgentContext(this.userId, this.agentType, this.database);

      // Initialize Claude API client
      const model = getModelForAgent(this.context);
      this.claudeClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Track end time
      this.contextLoadEndTime = Date.now();

      // Emit context-loaded event with approximate context size
      const contextSize = JSON.stringify(this.context).length;
      this.emit('context-loaded', contextSize);

    } catch (error) {
      // Track end time even on error
      this.contextLoadEndTime = Date.now();
      this.setStatus(WorkerStatus.FAILED);
      this.lastError = error instanceof Error ? error.message : String(error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute task with work ticket
   */
  async executeTask(workTicket: WorkTicket): Promise<{ success: boolean; output?: any; error?: string }> {
    if (!this.context || !this.claudeClient) {
      throw new Error('Context not loaded. Call loadContext() first.');
    }

    this.setStatus(WorkerStatus.EXECUTING);
    this.executionStartTime = Date.now();

    // Setup timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      this.timeoutHandle = setTimeout(() => {
        reject(new Error('Worker timeout exceeded'));
      }, this.config.timeout);
    });

    try {
      // Execute task with timeout race
      const result = await Promise.race([
        this.executeTaskInternal(workTicket),
        timeoutPromise
      ]);

      // Track end time
      this.executionEndTime = Date.now();
      this.emit('execution-complete', result);

      return result;

    } catch (error) {
      // Track end time even on error
      this.executionEndTime = Date.now();
      this.setStatus(WorkerStatus.FAILED);
      this.lastError = error instanceof Error ? error.message : String(error);

      // Emit error event (don't rethrow to allow graceful handling)
      this.emit('error', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: this.lastError
      };

    } finally {
      // Clear timeout
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
      }
    }
  }

  /**
   * Internal task execution logic
   */
  private async executeTaskInternal(workTicket: WorkTicket): Promise<{ success: boolean; output: any }> {
    if (!this.claudeClient || !this.context) {
      throw new Error('Claude client or context not initialized');
    }

    // Build prompt from work ticket
    const userPrompt = this.buildPromptFromTicket(workTicket);

    // Call Claude API
    const response = await this.claudeClient.messages.create({
      model: this.context.model || 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Track token usage
    if (response.usage) {
      this.tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    }

    // Extract response text
    const output = response.content
      .filter(block => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      success: true,
      output
    };
  }

  /**
   * Build prompt from work ticket
   */
  private buildPromptFromTicket(workTicket: WorkTicket): string {
    const payload = workTicket.payload;

    if (workTicket.type === 'post_response') {
      return `Post from ${payload.postAuthor}: "${payload.postContent}"\n\nProvide a response as the ${this.agentType} agent.`;
    } else if (workTicket.type === 'memory_update') {
      return `Update memory with: ${JSON.stringify(payload)}`;
    }

    return JSON.stringify(payload);
  }

  /**
   * Save memory to agent_memories table
   */
  async saveMemory(content: string, metadata?: any): Promise<void> {
    if (!this.config.saveMemories) {
      return; // Skip if saveMemories is false
    }

    this.memorySaveStartTime = Date.now();

    try {
      const result = await this.database.query(
        `INSERT INTO agent_memories (user_id, agent_name, content, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [
          this.userId,
          this.agentType,
          content,
          metadata || {}
        ]
      );

      // Track end time
      this.memorySaveEndTime = Date.now();

      if (result.rows && result.rows[0]) {
        this.emit('memory-saved', result.rows[0].id);
      }

    } catch (error) {
      // Track end time even on error
      this.memorySaveEndTime = Date.now();
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Destroy worker and clean up resources
   */
  async destroy(): Promise<void> {
    // Clear timeout if still active
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    // Update status
    if (this.status !== WorkerStatus.FAILED) {
      this.setStatus(WorkerStatus.COMPLETED);
    }

    // Emit final metrics
    this.emit('metrics', this.getMetrics());

    // Emit destroyed event
    this.emit('destroyed');

    // Clean up Claude client
    this.claudeClient = undefined;
    this.context = undefined;

    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Get worker metrics
   */
  getMetrics(): WorkerMetrics {
    const now = Date.now();

    return {
      workerId: this.workerId,
      tokensUsed: this.tokensUsed,
      executionTimeMs: this.executionEndTime > 0
        ? this.executionEndTime - this.executionStartTime
        : 0,
      contextLoadTimeMs: this.contextLoadEndTime > 0
        ? this.contextLoadEndTime - this.contextLoadStartTime
        : 0,
      memorySaveTimeMs: this.memorySaveEndTime > 0
        ? this.memorySaveEndTime - this.memorySaveStartTime
        : 0,
      totalLifetimeMs: now - this.startTime,
      status: this.status,
      error: this.lastError
    };
  }

  /**
   * Set worker status and emit event
   */
  private setStatus(status: WorkerStatus): void {
    this.status = status;
    this.emit('status-change', status);
  }
}
