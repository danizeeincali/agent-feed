/**
 * Avi DM Orchestrator Type Definitions
 * Phase 2: Core orchestration types
 */

/**
 * Avi orchestrator status enum
 */
export enum AviStatus {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  RESTARTING = 'restarting',
  STOPPED = 'stopped'
}

/**
 * Configuration for Avi orchestrator
 */
export interface OrchestratorConfig {
  /** Maximum concurrent workers */
  maxWorkers: number;
  /** Context bloat threshold in tokens */
  contextBloatThreshold: number;
  /** Worker completion timeout in milliseconds */
  workerTimeout: number;
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeout: number;
}

/**
 * AviConfig - Configuration for AviOrchestrator
 */
export interface AviConfig {
  /** Maximum concurrent workers */
  maxConcurrentWorkers?: number;
  /** Check interval for pending tickets (ms) */
  checkInterval: number;
  /** Enable health monitoring */
  enableHealthMonitor?: boolean;
  /** Health check interval (ms) */
  healthCheckInterval?: number;
  /** Graceful shutdown timeout (ms) */
  shutdownTimeout?: number;
  /** Context bloat threshold (tokens) */
  contextBloatThreshold?: number;
  /** Worker timeout (ms) */
  workerTimeout?: number;
}

/**
 * Runtime state of Avi orchestrator
 */
export interface AviState {
  /** Current operational status */
  status: 'initializing' | 'running' | 'restarting' | 'stopped';
  /** When the orchestrator started */
  startTime: Date;
  /** Total tickets processed since start */
  ticketsProcessed: number;
  /** Total workers spawned since start */
  workersSpawned: number;
  /** Currently active workers */
  activeWorkers: number;
  /** Last health check timestamp */
  lastHealthCheck?: Date;
  /** Last error encountered */
  lastError?: string;
}

/**
 * Avi metrics for monitoring
 */
export interface AviMetrics {
  /** Uptime in milliseconds */
  uptime: number;
  /** Context token count */
  contextTokens: number;
  /** Active worker count */
  activeWorkers: number;
  /** Queued ticket count */
  queuedTickets: number;
  /** Total processed tickets */
  totalProcessed: number;
  /** Context utilization percentage */
  contextUtilization: number;
  /** Worker pool utilization percentage */
  workerUtilization: number;
}

/**
 * Work queue interface (to be implemented by work-queue agent)
 */
export interface IWorkQueue {
  /** Check for pending tickets */
  getPendingTickets(): Promise<PendingTicket[]>;
  /** Mark ticket as assigned to worker */
  assignTicket(ticketId: string, workerId: string): Promise<void>;
  /** Get queue statistics */
  getQueueStats(): Promise<QueueStats>;
}

/**
 * Pending ticket from work queue
 */
export interface PendingTicket {
  id: string;
  userId: string;
  feedId: string;
  priority: number;
  createdAt: Date;
  retryCount: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Health monitor interface (to be implemented by health-monitor agent)
 */
export interface IHealthMonitor {
  /** Start health monitoring */
  start(): Promise<void>;
  /** Stop health monitoring */
  stop(): Promise<void>;
  /** Check current health status */
  checkHealth(): Promise<HealthStatus>;
  /** Register health check callback */
  onHealthChange(callback: (status: HealthStatus) => void): void;
}

/**
 * Health status
 */
export interface HealthStatus {
  healthy: boolean;
  timestamp: Date;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    activeWorkers: number;
    queueDepth: number;
  };
  issues?: string[];
}

/**
 * Worker spawner interface (to be implemented by worker-spawner agent)
 */
export interface IWorkerSpawner {
  /** Spawn a new worker for a ticket */
  spawnWorker(ticket: PendingTicket): Promise<WorkerInfo>;
  /** Get active workers */
  getActiveWorkers(): Promise<WorkerInfo[]>;
  /** Terminate a specific worker */
  terminateWorker(workerId: string): Promise<void>;
  /** Wait for all workers to complete */
  waitForAllWorkers(timeout: number): Promise<void>;
}

/**
 * Worker information
 */
export interface WorkerInfo {
  id: string;
  ticketId: string;
  status: 'spawning' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

/**
 * Database manager interface for state persistence
 */
export interface IAviDatabase {
  /** Save orchestrator state */
  saveState(state: AviState): Promise<void>;
  /** Load orchestrator state */
  loadState(): Promise<AviState | null>;
  /** Update ticket processing metrics */
  updateMetrics(metrics: {
    ticketsProcessed?: number;
    workersSpawned?: number;
  }): Promise<void>;
}
