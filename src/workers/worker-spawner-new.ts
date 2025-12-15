/**
 * Worker Spawner
 * Phase 2: Ephemeral Agent Worker Management
 * TDD London School Implementation
 *
 * Manages lifecycle of ephemeral agent workers with:
 * - Concurrency limiting (configurable, default 5)
 * - Worker spawning and coordination
 * - Kill worker functionality
 * - Statistics collection
 */

import { randomUUID } from 'crypto';
import { AgentWorker } from './agent-worker';
import {
  WorkerSpawnerConfig,
  WorkerSpawnerStats,
  WorkerMetrics,
  WorkerStatus
} from '../types/worker';
import { WorkTicket } from '../types/work-ticket';
import { DatabaseManager } from '../types/database-manager';

export class WorkerSpawner {
  private activeWorkers: Map<string, AgentWorker> = new Map();
  private database: DatabaseManager;
  private config: WorkerSpawnerConfig;

  // Metrics tracking
  private totalSpawned: number = 0;
  private completedWorkers: number = 0;
  private failedWorkers: number = 0;
  private executionTimes: number[] = [];
  private tokenUsages: number[] = [];

  constructor(
    database: DatabaseManager,
    config?: Partial<WorkerSpawnerConfig>
  ) {
    this.database = database;
    this.config = {
      maxWorkers: 5,
      workerTimeout: 60000,
      collectMetrics: true,
      autoRetry: false,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Spawn a new worker for work ticket
   * Returns worker ID
   */
  async spawn(workTicket: WorkTicket): Promise<string> {
    if (!this.database) {
      throw new Error('Database not configured');
    }

    // Generate unique worker ID
    const workerId = randomUUID();

    try {
      // Create worker instance
      const worker = new AgentWorker(
        workerId,
        workTicket.agentName,
        workTicket.userId,
        this.database,
        {
          timeout: this.config.workerTimeout,
          saveMemories: true,
          workTicket
        }
      );

      // Track as active
      this.activeWorkers.set(workerId, worker);
      this.totalSpawned++;

      // Setup event listeners
      if (this.config.collectMetrics) {
        worker.on('metrics', (metrics: WorkerMetrics) => {
          this.trackMetrics(metrics);
        });
      }

      // Load context
      await worker.loadContext();

      // Execute task
      await worker.executeTask(workTicket);

      return workerId;

    } catch (error) {
      // Clean up on error
      this.activeWorkers.delete(workerId);
      this.failedWorkers++;
      throw error;
    }
  }

  /**
   * Get list of active workers
   */
  getActiveWorkers(): AgentWorker[] {
    return Array.from(this.activeWorkers.values());
  }

  /**
   * Kill worker by ID
   */
  async killWorker(workerId: string): Promise<void> {
    const worker = this.activeWorkers.get(workerId);

    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }

    // Destroy worker
    await worker.destroy();

    // Remove from active workers
    this.activeWorkers.delete(workerId);
  }

  /**
   * Get maximum concurrent workers
   */
  getMaxWorkers(): number {
    return this.config.maxWorkers;
  }

  /**
   * Set maximum concurrent workers
   */
  setMaxWorkers(max: number): void {
    if (max <= 0) {
      throw new Error('Max workers must be greater than 0');
    }

    this.config.maxWorkers = max;
  }

  /**
   * Get spawner statistics
   */
  getStats(): WorkerSpawnerStats {
    const avgExecutionTime = this.executionTimes.length > 0
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      : 0;

    const avgTokensUsed = this.tokenUsages.length > 0
      ? this.tokenUsages.reduce((a, b) => a + b, 0) / this.tokenUsages.length
      : 0;

    return {
      totalSpawned: this.totalSpawned,
      activeWorkers: this.activeWorkers.size,
      completedWorkers: this.completedWorkers,
      failedWorkers: this.failedWorkers,
      avgExecutionTime,
      avgTokensUsed
    };
  }

  /**
   * Track metrics from worker
   */
  private trackMetrics(metrics: WorkerMetrics): void {
    if (metrics.status === WorkerStatus.COMPLETED) {
      this.completedWorkers++;
    } else if (metrics.status === WorkerStatus.FAILED) {
      this.failedWorkers++;
    }

    if (metrics.executionTimeMs > 0) {
      this.executionTimes.push(metrics.executionTimeMs);
    }

    if (metrics.tokensUsed > 0) {
      this.tokenUsages.push(metrics.tokensUsed);
    }
  }
}
