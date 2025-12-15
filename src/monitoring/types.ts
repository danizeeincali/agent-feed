/**
 * Phase 5: Health & Monitoring - Type Definitions
 */

/**
 * Metrics snapshot at a point in time
 */
export interface MetricsSnapshot {
  timestamp: Date;
  system: SystemMetrics;
  orchestrator: OrchestratorMetrics;
  workers: WorkerMetrics;
  queue: QueueMetrics;
  validation: ValidationMetrics;
}

/**
 * System-level metrics
 */
export interface SystemMetrics {
  cpuPercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  diskUsedGB: number;
  diskTotalGB: number;
  diskPercent: number;
  uptime: number;
}

/**
 * Orchestrator metrics
 */
export interface OrchestratorMetrics {
  status: 'running' | 'stopped' | 'degraded';
  uptime: number;
  restartCount: number;
  contextSize: number;
  maxContextSize: number;
  lastRestart?: Date;
}

/**
 * Worker metrics
 */
export interface WorkerMetrics {
  activeWorkers: number;
  totalSpawned: number;
  totalCompleted: number;
  totalFailed: number;
  avgExecutionTimeMs: number;
  successRate: number;
}

/**
 * Queue metrics
 */
export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  depth: number;
  avgProcessingTimeMs: number;
  throughput: number;
}

/**
 * Validation metrics (Phase 4)
 */
export interface ValidationMetrics {
  totalValidations: number;
  validationsPassed: number;
  validationsFailed: number;
  totalRetries: number;
  totalEscalations: number;
  successRate: number;
  avgValidationTimeMs: number;
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  severity: AlertSeverity;
  duration: number; // Duration in seconds metric must exceed threshold
  message: string;
  enabled: boolean;
}

/**
 * Dashboard data structure
 */
export interface DashboardData {
  timestamp: Date;
  systemStatus: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  healthScore: number; // 0-100
  currentMetrics: MetricsSnapshot;
  activeAlerts: Alert[];
  recentEvents: SystemEvent[];
  charts: {
    cpuHistory: TimeSeriesData;
    memoryHistory: TimeSeriesData;
    queueDepthHistory: TimeSeriesData;
    workerActivityHistory: TimeSeriesData;
  };
}

/**
 * Time series data for charts
 */
export interface TimeSeriesData {
  labels: string[]; // Timestamps
  values: number[];
  unit?: string;
}

/**
 * System event
 */
export interface SystemEvent {
  timestamp: Date;
  type: 'orchestrator_start' | 'orchestrator_stop' | 'worker_spawn' | 'worker_complete' | 'worker_fail' | 'alert_trigger' | 'alert_resolve';
  message: string;
  severity: 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

/**
 * Time range for queries
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Metrics collection configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number; // milliseconds
  retentionDays: number;
  aggregationWindows: number[]; // [1m, 5m, 1h, 24h] in seconds
}

/**
 * IMetricsCollector interface
 */
export interface IMetricsCollector {
  collectMetrics(): Promise<MetricsSnapshot>;
  getMetrics(category: string, timeRange: TimeRange): Promise<MetricsSnapshot[]>;
  storeMetrics(metrics: MetricsSnapshot): Promise<void>;
  cleanupOldMetrics(retentionDays: number): Promise<void>;
}

/**
 * IAlertingService interface
 */
export interface IAlertingService {
  evaluateAlerts(metrics: MetricsSnapshot): Promise<Alert[]>;
  sendAlert(alert: Alert): Promise<void>;
  acknowledgeAlert(alertId: string, userId: string): Promise<void>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlertHistory(timeRange: TimeRange): Promise<Alert[]>;
}

/**
 * IDashboardService interface
 */
export interface IDashboardService {
  getDashboardData(): Promise<DashboardData>;
  subscribeToUpdates(callback: (data: DashboardData) => void): () => void;
  getHistoricalData(metric: string, timeRange: TimeRange): Promise<TimeSeriesData>;
}
