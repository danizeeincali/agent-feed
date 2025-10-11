/**
 * Health Monitor
 * Phase 2: Context bloat detection and restart signaling
 *
 * Monitors conversation context size and emits restart signals
 * when approaching token limits to prevent degraded performance.
 *
 * TDD London School Implementation:
 * - Mocks all external dependencies (Database, Anthropic SDK)
 * - Focuses on behavior verification through events
 * - Outside-in development with clear contracts
 */

import { EventEmitter } from 'events';
import type { DatabaseManager } from '../types/database-manager';
import type {
  HealthConfig,
  HealthStatus,
  HealthMetrics,
  DatabaseHealth,
  WorkerHealth,
  SystemHealth,
  RestartReason,
} from '../types/health';

type TokenCounter = () => number;

const DEFAULT_CONFIG: HealthConfig = {
  maxContextTokens: 50000,
  checkInterval: 30000,    // 30 seconds
  restartThreshold: 0.9,   // 90%
};

const DEFAULT_MAX_WORKERS = 10;

export class HealthMonitor extends EventEmitter {
  private config: HealthConfig;
  private tokenCounter: TokenCounter;
  private database?: DatabaseManager;
  private intervalId?: NodeJS.Timeout;
  private startTime: number;
  private lastCheckTime: Date;
  private currentStatus: HealthStatus;
  private restartSignalEmitted: boolean;
  private maxWorkers: number;

  constructor(
    configOrParams: Partial<HealthConfig> | {
      avidm?: any;
      database?: DatabaseManager;
      workerPool?: any;
      checkIntervalMs?: number;
      tokenCounter?: TokenCounter;
      maxWorkers?: number;
    } = {},
    tokenCounter?: TokenCounter,
    database?: DatabaseManager,
    maxWorkers: number = DEFAULT_MAX_WORKERS
  ) {
    super();

    // Support both old and new constructor signatures
    if ('database' in configOrParams && typeof configOrParams.database !== 'undefined') {
      // New signature: object with database property
      this.config = {
        ...DEFAULT_CONFIG,
        checkInterval: configOrParams.checkIntervalMs || DEFAULT_CONFIG.checkInterval
      };
      this.tokenCounter = configOrParams.tokenCounter || this.defaultTokenCounter;
      this.database = configOrParams.database;
      this.maxWorkers = configOrParams.maxWorkers || DEFAULT_MAX_WORKERS;
    } else {
      // Old signature: positional parameters
      this.config = { ...DEFAULT_CONFIG, ...configOrParams as Partial<HealthConfig> };
      this.tokenCounter = tokenCounter || this.defaultTokenCounter;
      this.database = database;
      this.maxWorkers = maxWorkers;
    }

    this.startTime = 0;
    this.lastCheckTime = new Date();
    this.restartSignalEmitted = false;

    // Initialize current status
    this.currentStatus = {
      healthy: true,
      contextTokens: 0,
      uptime: 0,
      lastCheck: new Date(),
      warnings: [],
    };
  }

  /**
   * Default token counter (placeholder for real implementation)
   * In production, this will use @anthropic-ai/sdk token counting
   */
  private defaultTokenCounter(): number {
    return 0;
  }

  /**
   * Start periodic health monitoring
   */
  public start(): void {
    // Prevent multiple intervals
    if (this.intervalId) {
      return;
    }

    this.startTime = Date.now();
    this.restartSignalEmitted = false;

    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.startTime = 0;
    this.restartSignalEmitted = false;
  }

  /**
   * Perform a health check
   */
  public checkHealth(): HealthStatus {
    try {
      const contextTokens = this.tokenCounter();

      // Validate token count
      if (contextTokens < 0) {
        throw new Error(`Invalid token count: ${contextTokens}`);
      }

      const now = new Date();
      const uptime = this.calculateUptime();
      const warnings: string[] = [];

      // Calculate threshold percentage
      const thresholdTokens = this.config.maxContextTokens * this.config.restartThreshold;
      const isNearThreshold = contextTokens >= thresholdTokens;

      // Determine health status
      const healthy = !isNearThreshold;

      // Add warnings if needed
      if (isNearThreshold) {
        const percentage = ((contextTokens / this.config.maxContextTokens) * 100).toFixed(1);
        warnings.push(
          `Context approaching limit: ${contextTokens}/${this.config.maxContextTokens} tokens (${percentage}%)`
        );
      }

      // Track previous health state for change detection
      const previousHealthy = this.currentStatus.healthy;

      // Update current status
      this.currentStatus = {
        healthy,
        contextTokens,
        uptime,
        lastCheck: now,
        warnings,
      };

      this.lastCheckTime = now;

      // Emit health status changed event if state changed
      if (previousHealthy !== healthy) {
        this.emit('healthStatusChanged', this.currentStatus);
      }

      // Emit restart signal if threshold exceeded
      if (isNearThreshold && !this.restartSignalEmitted) {
        this.restartSignalEmitted = true;
        this.emit('restart-needed', this.currentStatus);
        this.emit('restartRequired', {
          reason: 'context_bloat',
          contextTokens,
          threshold: this.config.maxContextTokens,
        });
      } else if (!isNearThreshold && this.restartSignalEmitted) {
        // Reset flag if we're back below threshold
        this.restartSignalEmitted = false;
      }

      return this.currentStatus;
    } catch (error) {
      // Handle token counter errors gracefully
      const errorStatus: HealthStatus = {
        healthy: true,
        contextTokens: 0,
        uptime: this.calculateUptime(),
        lastCheck: new Date(),
        warnings: [`Error checking health: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      this.currentStatus = errorStatus;
      return errorStatus;
    }
  }

  /**
   * Check if system should restart based on current health
   */
  public shouldRestart(): boolean {
    return !this.currentStatus.healthy;
  }

  /**
   * Get current health metrics
   */
  public getMetrics(): HealthStatus {
    // Return a copy to prevent external mutation
    return {
      ...this.currentStatus,
      uptime: this.calculateUptime(),
      warnings: [...this.currentStatus.warnings],
    };
  }

  /**
   * Calculate current uptime in milliseconds
   */
  private calculateUptime(): number {
    if (this.startTime === 0) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Check database health
   * Verifies PostgreSQL connection with simple query
   */
  public async checkDatabaseHealth(): Promise<DatabaseHealth> {
    if (!this.database) {
      return {
        connected: false,
        error: 'No database connection configured',
      };
    }

    const startTime = Date.now();

    try {
      await this.database.query('SELECT 1 as result');
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Emit event for database connection loss
      this.emit('databaseConnectionLost', {
        error: errorMessage,
        timestamp: new Date(),
      });

      return {
        connected: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check worker health
   * Monitors active worker count and pool utilization
   */
  public async checkWorkerHealth(maxWorkers: number = this.maxWorkers): Promise<WorkerHealth> {
    if (!this.database) {
      return {
        healthy: true,
        activeWorkers: 0,
        maxWorkers,
        utilization: 0,
      };
    }

    try {
      const result = await this.database.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM active_workers WHERE status = 'running'`
      );

      const activeWorkers = result.rows.length > 0
        ? parseInt(result.rows[0].count, 10) || 0
        : 0;

      const utilization = maxWorkers > 0
        ? Math.round((activeWorkers / maxWorkers) * 100)
        : 0;

      const healthy = activeWorkers <= maxWorkers;

      // Emit event if workers are overloaded
      if (!healthy) {
        this.emit('workerOverload', {
          activeWorkers,
          maxWorkers,
          utilization,
        });
      }

      return {
        healthy,
        activeWorkers,
        maxWorkers,
        utilization,
      };
    } catch (error) {
      // On database error, return safe defaults
      return {
        healthy: true,
        activeWorkers: 0,
        maxWorkers,
        utilization: 0,
      };
    }
  }

  /**
   * Get comprehensive system health
   * Combines Avi health, database health, and worker health
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    // Get current Avi health
    const aviHealth = this.checkHealth();

    // Get database and worker health
    const [databaseHealth, workerHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkWorkerHealth(),
    ]);

    // Calculate threshold metrics
    const thresholdPercentage = Math.round(
      (aviHealth.contextTokens / this.config.maxContextTokens) * 100
    );
    const isNearThreshold = thresholdPercentage >= (this.config.restartThreshold * 100);

    // System is healthy only if all components are healthy
    const systemHealthy = aviHealth.healthy &&
                          databaseHealth.connected &&
                          workerHealth.healthy;

    return {
      ...aviHealth,
      healthy: systemHealthy,
      thresholdPercentage,
      isNearThreshold,
      database: databaseHealth,
      workers: workerHealth,
    };
  }

  /**
   * Get restart reason based on current system health
   * TDD London School: Define clear contract for restart decision
   */
  public getRestartReason(status: HealthMetrics): RestartReason {
    // Check for context bloat
    if (status.contextTokens > this.config.maxContextTokens) {
      return {
        shouldRestart: true,
        reason: 'context_bloat',
        details: `Context size ${status.contextTokens} tokens exceeds maximum ${this.config.maxContextTokens}`,
      };
    }

    // Check for near threshold
    if (status.isNearThreshold) {
      return {
        shouldRestart: true,
        reason: 'context_bloat',
        details: `Context approaching limit: ${status.thresholdPercentage}% of maximum`,
      };
    }

    // System is healthy
    return {
      shouldRestart: false,
      reason: 'none',
      details: 'System is healthy',
    };
  }
}
