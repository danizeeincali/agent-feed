/**
 * HealthMonitorAdapter - Implements IHealthMonitor interface
 * Monitors system health and triggers callbacks on issues
 *
 * Phase 2: AVI Orchestrator Integration
 */

import * as os from 'os';
import type { IHealthMonitor, IWorkQueue, HealthStatus } from '../types/avi';
import { logger } from '../utils/logger';

/**
 * HealthMonitorAdapter implementation
 * Monitors system health (CPU, memory, queue depth) and provides callbacks
 */
export class HealthMonitorAdapter implements IHealthMonitor {
  private workQueue: IWorkQueue;
  private checkInterval: number;
  private intervalHandle?: NodeJS.Timeout;
  private callback?: (status: HealthStatus) => void;
  private running: boolean = false;

  constructor(workQueue: IWorkQueue, checkInterval: number = 30000) {
    this.workQueue = workQueue;
    this.checkInterval = checkInterval;
  }

  /**
   * Start health monitoring
   * Begins periodic health checks at configured interval
   */
  async start(): Promise<void> {
    if (this.running) {
      return; // Already running
    }

    this.running = true;

    // Start periodic health checks
    this.intervalHandle = setInterval(async () => {
      try {
        const health = await this.checkHealth();

        if (this.callback) {
          this.callback(health);
        }
      } catch (error) {
        logger.error('Health check failed', { error, context: 'HealthMonitorAdapter' });
      }
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   * Clears the health check interval
   */
  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
    this.running = false;
  }

  /**
   * Check current health status
   * @returns Promise resolving to current health status
   */
  async checkHealth(): Promise<HealthStatus> {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const stats = await this.workQueue.getQueueStats();
    const activeWorkers = stats.processing || 0;
    const queueDepth = stats.pending || 0;

    const issues: string[] = [];
    let healthy = true;

    // Check CPU usage
    if (cpuUsage > 90) {
      issues.push('CPU usage above 90%');
      healthy = false;
    }

    // Check memory usage
    if (memoryUsage > 85) {
      issues.push('Memory usage above 85%');
      healthy = false;
    }

    // Check queue depth
    if (queueDepth > 1000) {
      issues.push('Queue depth exceeds 1000 tickets');
      healthy = false;
    }

    return {
      healthy,
      timestamp: new Date(),
      metrics: {
        cpuUsage,
        memoryUsage,
        activeWorkers,
        queueDepth,
      },
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Register callback for health changes
   * @param callback - Function called with HealthStatus on each check
   */
  onHealthChange(callback: (status: HealthStatus) => void): void {
    this.callback = callback;
  }

  /**
   * Get CPU usage percentage
   * @returns CPU usage 0-100
   */
  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor((100 * idle) / total);

    return usage;
  }

  /**
   * Get memory usage percentage
   * @returns Memory usage 0-100
   */
  private getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;

    return Math.round(usage);
  }
}
