/**
 * Avi DM Orchestrator Core
 * Phase 2: Main orchestration engine
 *
 * Responsibilities:
 * - Monitor work queue for pending tickets
 * - Spawn workers for ticket processing
 * - Coordinate with health monitor
 * - Manage graceful shutdown
 * - Persist state to database
 */

import type {
  AviConfig,
  AviState,
  IWorkQueue,
  IHealthMonitor,
  IWorkerSpawner,
  IAviDatabase,
  PendingTicket,
  HealthStatus,
} from '../types/avi';

/**
 * Main Avi orchestrator class
 */
export class AviOrchestrator {
  private config: AviConfig;
  private state: AviState;
  private running: boolean = false;
  private shuttingDown: boolean = false;
  private intervalHandle?: NodeJS.Timeout;
  private stateUpdateInterval?: NodeJS.Timeout;

  constructor(
    config: AviConfig,
    private workQueue: IWorkQueue,
    private healthMonitor: IHealthMonitor,
    private workerSpawner: IWorkerSpawner,
    private database: IAviDatabase
  ) {
    this.config = {
      ...config,
      maxConcurrentWorkers: config.maxConcurrentWorkers ?? 10,
      shutdownTimeout: config.shutdownTimeout ?? 30000,
    };

    // Initialize state
    this.state = {
      status: 'initializing',
      startTime: new Date(),
      ticketsProcessed: 0,
      workersSpawned: 0,
      activeWorkers: 0,
    };
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.running) {
      return; // Already running
    }

    try {
      // Load previous state if available
      const previousState = await this.database.loadState();
      if (previousState) {
        this.state.ticketsProcessed = previousState.ticketsProcessed;
        this.state.workersSpawned = previousState.workersSpawned;
      }

      // Update status
      this.state.status = 'running';
      this.running = true;
      this.shuttingDown = false;

      // Save initial state
      await this.saveState();

      // Start health monitor if enabled
      if (this.config.enableHealthMonitor) {
        try {
          await this.healthMonitor.start();
          this.healthMonitor.onHealthChange(this.handleHealthChange.bind(this));
        } catch (error) {
          console.error('Failed to start health monitor:', error);
          // Continue running even if health monitor fails
        }
      }

      // Start main loop
      this.startMainLoop();

      // Start periodic state updates
      this.startStateUpdates();

    } catch (error) {
      console.error('Failed to start orchestrator:', error);
      this.state.status = 'stopped';
      this.running = false;
      throw error;
    }
  }

  /**
   * Stop the orchestrator gracefully
   */
  async stop(): Promise<void> {
    if (!this.running && this.state.status === 'stopped') {
      return; // Already stopped
    }

    this.shuttingDown = true;
    this.running = false;

    // Clear intervals
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
      this.stateUpdateInterval = undefined;
    }

    // Stop health monitor
    if (this.config.enableHealthMonitor) {
      try {
        await this.healthMonitor.stop();
      } catch (error) {
        console.error('Failed to stop health monitor:', error);
      }
    }

    // Wait for active workers to complete
    try {
      const activeWorkers = await this.workerSpawner.getActiveWorkers();
      if (activeWorkers.length > 0) {
        console.log(`Waiting for ${activeWorkers.length} active workers to complete...`);
        await this.workerSpawner.waitForAllWorkers(this.config.shutdownTimeout!);
      }
    } catch (error) {
      console.error('Error waiting for workers during shutdown:', error);
      // Continue with shutdown even if timeout occurs
    }

    // Update final state
    this.state.status = 'stopped';
    await this.saveState();

    this.shuttingDown = false;
  }

  /**
   * Process pending tickets from the work queue
   */
  async processTickets(): Promise<void> {
    if (!this.running || this.shuttingDown) {
      return; // Don't process during shutdown
    }

    try {
      // Update health check timestamp
      this.state.lastHealthCheck = new Date();

      // Get current active workers count
      const activeWorkers = await this.workerSpawner.getActiveWorkers();
      this.state.activeWorkers = activeWorkers.length;

      // Check if we can spawn more workers
      const availableSlots = (this.config.maxConcurrentWorkers ?? 10) - activeWorkers.length;
      if (availableSlots <= 0) {
        return; // At maximum capacity
      }

      // Get pending tickets
      const pendingTickets = await this.workQueue.getPendingTickets();
      if (pendingTickets.length === 0) {
        return; // No work to do
      }

      // Process tickets up to available slots
      const ticketsToProcess = pendingTickets.slice(0, availableSlots);

      for (const ticket of ticketsToProcess) {
        try {
          await this.spawnWorkerForTicket(ticket);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Failed to spawn worker for ticket ${ticket.id}:`, errorMessage);
          this.state.lastError = errorMessage;
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error processing tickets:', errorMessage);
      this.state.lastError = errorMessage;
    }
  }

  /**
   * Get current orchestrator state
   */
  getState(): AviState {
    return { ...this.state };
  }

  /**
   * Spawn a worker for a specific ticket
   */
  private async spawnWorkerForTicket(ticket: PendingTicket): Promise<void> {
    try {
      // Spawn the worker
      const worker = await this.workerSpawner.spawnWorker(ticket);

      // Assign ticket to worker in queue
      await this.workQueue.assignTicket(ticket.id, worker.id);

      // Update metrics
      this.state.workersSpawned += 1;
      await this.database.updateMetrics({
        workersSpawned: this.state.workersSpawned,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state.lastError = errorMessage;
      throw error;
    }
  }

  /**
   * Start the main processing loop
   */
  private startMainLoop(): void {
    this.intervalHandle = setInterval(async () => {
      if (this.running && !this.shuttingDown) {
        await this.processTickets();
      }
    }, this.config.checkInterval);
  }

  /**
   * Start periodic state updates to database
   */
  private startStateUpdates(): void {
    this.stateUpdateInterval = setInterval(async () => {
      if (this.running && !this.shuttingDown) {
        await this.saveState();
      }
    }, 5000); // Save state every 5 seconds
  }

  /**
   * Handle health status changes
   */
  private handleHealthChange(status: HealthStatus): void {
    if (!status.healthy && this.running) {
      console.warn('Health monitor detected issues:', status.issues);

      // Update state to restarting
      this.state.status = 'restarting';

      // In a real implementation, this would trigger a restart sequence
      // For now, we just update the state
      this.saveState().catch(error => {
        console.error('Failed to save state after health change:', error);
      });
    }
  }

  /**
   * Save current state to database
   */
  private async saveState(): Promise<void> {
    try {
      await this.database.saveState(this.state);
    } catch (error) {
      console.error('Failed to save state:', error);
      // Don't throw - state save failures shouldn't crash the orchestrator
    }
  }
}
