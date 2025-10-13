/**
 * Worker Spawner
 * Phase 2: Ephemeral Agent Worker Management
 * TDD London School Implementation
 *
 * Manages lifecycle of ephemeral agent workers with:
 * - Concurrency limiting (max 5 concurrent by default)
 * - Context loading from database
 * - Task execution with metrics
 * - Automatic cleanup
 * - Worker kill functionality
 * - Statistics collection
 */

import { randomUUID } from 'crypto';
import { AgentWorker } from './agent-worker';
import type { WorkerConfig, WorkerResult, WorkerMetrics, WorkerSpawnerConfig, WorkerSpawnerStats } from '../types/worker';
import { WorkTicket } from '../types/work-ticket';
import { DatabaseManager } from '../types/database-manager';
import { composeAgentContext } from '../database/context-composer';

// Task executor type for dependency injection (legacy support)
type TaskExecutor = (config: WorkerConfig, context: any) => Promise<any>;

export class WorkerSpawner {
  private activeWorkers: Map<string, AgentWorker> = new Map();
  private maxWorkers: number = 5;
  private database?: DatabaseManager;
  private config: WorkerSpawnerConfig;

  // Metrics tracking
  private totalSpawned: number = 0;
  private completedWorkers: number = 0;
  private failedWorkers: number = 0;
  private executionTimes: number[] = [];
  private tokenUsages: number[] = [];

  // Legacy support
  private workerQueue: Array<{
    config: WorkerConfig;
    resolve: (result: WorkerResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private taskExecutor?: TaskExecutor;

  constructor(database?: DatabaseManager | TaskExecutor, configOrUndefined?: Partial<WorkerSpawnerConfig>) {
    // Support both old and new constructor signatures
    if (typeof database === 'function') {
      // Legacy: constructor(taskExecutor)
      this.taskExecutor = database;
      this.config = {
        maxWorkers: 10,
        workerTimeout: 60000,
        collectMetrics: true,
        autoRetry: false,
        maxRetries: 3
      };
    } else {
      // New: constructor(database, config)
      this.database = database;
      this.config = {
        maxWorkers: 5,
        workerTimeout: 60000,
        collectMetrics: true,
        autoRetry: false,
        maxRetries: 3,
        ...configOrUndefined
      };
      this.maxWorkers = this.config.maxWorkers;
    }
  }

  /**
   * Spawn a new worker to execute a task
   * Queues the worker if at capacity
   */
  async spawn(config: WorkerConfig): Promise<WorkerResult> {
    // If at capacity, queue the worker
    if (this.activeWorkers.size >= this.maxWorkers) {
      return new Promise((resolve, reject) => {
        this.workerQueue.push({ config, resolve, reject });
      });
    }

    return this.executeWorker(config);
  }

  /**
   * Execute a worker task with full lifecycle management
   */
  private async executeWorker(config: WorkerConfig): Promise<WorkerResult> {
    const workerId = randomUUID();
    const startTime = Date.now();

    // Track worker as active
    this.activeWorkers.set(workerId, {
      workerId,
      startTime,
      status: 'running',
      taskType: config.taskType,
    });

    try {
      // Load agent context from database
      if (!this.database) {
        throw new Error('Database manager not available for context loading');
      }
      const context = await composeAgentContext(config.userId, config.agentName, this.database);

      // Execute the task using injected executor
      const output = this.taskExecutor
        ? await this.taskExecutor(config, context)
        : await this.defaultTaskExecutor(config, context);

      // Calculate metrics
      const duration = Date.now() - startTime;
      const tokensUsed = this.extractTokenUsage(output);

      // Update worker status
      this.activeWorkers.set(workerId, {
        ...this.activeWorkers.get(workerId)!,
        status: 'completed',
        endTime: Date.now(),
      });

      // Cleanup and process queue
      await this.cleanup(workerId);

      return {
        success: true,
        output,
        tokensUsed,
        duration,
      };
    } catch (error) {
      // Calculate duration even on failure
      const duration = Date.now() - startTime;

      // Update worker status
      this.activeWorkers.set(workerId, {
        ...this.activeWorkers.get(workerId)!,
        status: 'failed',
        endTime: Date.now(),
      });

      // Cleanup and process queue
      await this.cleanup(workerId);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        tokensUsed: 0,
        duration,
      };
    }
  }

  /**
   * Default task executor - will be replaced in Phase 3 with Claude API
   * Currently just returns mock data
   */
  private async defaultTaskExecutor(config: WorkerConfig, context: any): Promise<any> {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 5));

    // Mock response structure similar to Claude API
    return {
      content: [{ type: 'text', text: 'Agent response' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    };
  }

  /**
   * Extract token usage from task output
   */
  private extractTokenUsage(output: any): number {
    if (output?.usage) {
      const { input_tokens = 0, output_tokens = 0 } = output.usage;
      return input_tokens + output_tokens;
    }
    return 0;
  }

  /**
   * Cleanup worker and process next queued worker if any
   */
  async cleanup(workerId: string): Promise<void> {
    this.activeWorkers.delete(workerId);

    // Process next queued worker if any
    if (this.workerQueue.length > 0 && this.canSpawn()) {
      const queued = this.workerQueue.shift()!;

      try {
        const result = await this.executeWorker(queued.config);
        queued.resolve(result);
      } catch (error) {
        queued.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Get count of currently active workers
   */
  getActiveCount(): number {
    return this.activeWorkers.size;
  }

  /**
   * Check if spawner can accept new workers
   */
  canSpawn(): boolean {
    return this.activeWorkers.size < this.maxWorkers;
  }

  /**
   * Get metrics for all active workers
   */
  getActiveWorkers(): WorkerMetrics[] {
    return Array.from(this.activeWorkers.values());
  }

  /**
   * Get queued worker count
   */
  getQueuedCount(): number {
    return this.workerQueue.length;
  }
}
