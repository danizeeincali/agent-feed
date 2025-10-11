/**
 * Health Monitoring Types
 * Phase 2: Context bloat detection and restart signaling
 */

export interface HealthStatus {
  healthy: boolean;
  contextTokens: number;
  uptime: number;
  lastCheck: Date;
  warnings: string[];
}

export interface HealthConfig {
  maxContextTokens: number;  // Default: 50000
  checkInterval: number;     // Default: 30000 (30s)
  restartThreshold: number;  // Default: 0.9 (90% of max)
}

export interface HealthMetrics extends HealthStatus {
  thresholdPercentage: number;
  isNearThreshold: boolean;
}

/**
 * Database health check result
 */
export interface DatabaseHealth {
  connected: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Worker health check result
 */
export interface WorkerHealth {
  healthy: boolean;
  activeWorkers: number;
  maxWorkers: number;
  utilization?: number;
}

/**
 * Comprehensive system health
 */
export interface SystemHealth extends HealthMetrics {
  database: DatabaseHealth;
  workers: WorkerHealth;
}

/**
 * Restart reason details
 */
export interface RestartReason {
  shouldRestart: boolean;
  reason: 'context_bloat' | 'database_failure' | 'worker_overload' | 'none';
  details: string;
}
