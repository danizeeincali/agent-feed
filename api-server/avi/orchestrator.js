/**
 * AVI Orchestrator - Always-On Main Loop
 * Phase 2: Persistent orchestrator that monitors and spawns workers
 *
 * Responsibilities:
 * - Monitor work queue for new tickets
 * - Spawn ephemeral agent workers
 * - Track context size and health
 * - Auto-restart when context bloats
 * - Graceful shutdown handling
 */

import AgentWorker from '../worker/agent-worker.js';

// Stub repositories for Phase 2
const aviStateRepo = {
  markRunning: async () => { console.log('✅ AVI marked as running'); },
  markStopped: async () => { console.log('🛑 AVI marked as stopped'); }
};

const workQueueRepo = {
  getNextPendingTicket: async () => null,
  markTicketInProgress: async () => {},
  markTicketCompleted: async () => {}
};

class AviOrchestrator {
  constructor(config = {}) {
    this.maxWorkers = config.maxWorkers || 5;
    this.maxContextSize = config.maxContextSize || 50000;
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.healthCheckInterval = config.healthCheckInterval || 30000; // 30 seconds

    this.running = false;
    this.activeWorkers = new Map(); // workerId -> worker instance
    this.contextSize = 0;
    this.ticketsProcessed = 0;
    this.workersSpawned = 0;

    this.mainLoopTimer = null;
    this.healthCheckTimer = null;
  }

  /**
   * Start the orchestrator main loop
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Orchestrator already running');
      return;
    }

    console.log('🚀 Starting AVI Orchestrator...');
    this.running = true;

    try {
      // Mark as running in database
      await aviStateRepo.markRunning();

      // Start main monitoring loop
      this.startMainLoop();

      // Start health monitoring
      this.startHealthMonitoring();

      console.log('✅ AVI Orchestrator started successfully');
      console.log(`   Max Workers: ${this.maxWorkers}`);
      console.log(`   Poll Interval: ${this.pollInterval}ms`);
      console.log(`   Max Context: ${this.maxContextSize} tokens`);
    } catch (error) {
      console.error('❌ Failed to start orchestrator:', error);
      this.running = false;
      throw error;
    }
  }

  /**
   * Main monitoring loop - checks for work and spawns workers
   */
  startMainLoop() {
    const loop = async () => {
      if (!this.running) return;

      try {
        await this.processWorkQueue();
      } catch (error) {
        console.error('❌ Error in main loop:', error);
        await aviStateRepo.updateState({ last_error: error.message });
      }

      // Schedule next iteration
      this.mainLoopTimer = setTimeout(loop, this.pollInterval);
    };

    // Start the loop
    loop();
  }

  /**
   * Process work queue - spawn workers for pending tickets
   */
  async processWorkQueue() {
    // Check if we have capacity for more workers
    const activeCount = this.activeWorkers.size;
    if (activeCount >= this.maxWorkers) {
      return; // At capacity
    }

    // Get pending tickets
    const availableSlots = this.maxWorkers - activeCount;
    const tickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: availableSlots
    });

    if (tickets.length === 0) {
      return; // No work to do
    }

    console.log(`📋 Found ${tickets.length} pending tickets, spawning workers...`);

    // Spawn workers for each ticket
    for (const ticket of tickets) {
      await this.spawnWorker(ticket);
    }
  }

  /**
   * Spawn an ephemeral worker to process a ticket
   */
  async spawnWorker(ticket) {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🤖 Spawning worker ${workerId} for ticket ${ticket.id}`);

      // Mark ticket as assigned
      await workQueueRepo.assignTicket(ticket.id.toString(), workerId);

      // Create worker instance
      const worker = new AgentWorker({
        workerId,
        ticketId: ticket.id.toString(),
        agentId: ticket.agent_id
      });

      // Track worker
      this.activeWorkers.set(workerId, worker);
      this.workersSpawned++;

      // Execute ticket (async)
      worker.execute()
        .then(async (result) => {
          console.log(`✅ Worker ${workerId} completed successfully`);
          this.ticketsProcessed++;

          // Mark ticket as completed
          await workQueueRepo.completeTicket(ticket.id.toString(), {
            result: result.response,
            tokens_used: result.tokensUsed || 0
          });
        })
        .catch(async (error) => {
          console.error(`❌ Worker ${workerId} failed:`, error);

          // Mark ticket as failed
          await workQueueRepo.failTicket(ticket.id.toString(), error.message);
        })
        .finally(() => {
          // Clean up worker
          this.activeWorkers.delete(workerId);
          console.log(`🗑️ Worker ${workerId} destroyed (${this.activeWorkers.size} active)`);
        });

      // Update context size estimate
      this.contextSize += 2000; // Rough estimate per ticket

    } catch (error) {
      console.error(`❌ Failed to spawn worker ${workerId}:`, error);
      await workQueueRepo.failTicket(ticket.id.toString(), error.message);
    }
  }

  /**
   * Health monitoring loop - check context size and restart if needed
   */
  startHealthMonitoring() {
    const healthCheck = async () => {
      if (!this.running) return;

      try {
        // Update state in database
        await aviStateRepo.updateState({
          context_size: this.contextSize,
          active_workers: this.activeWorkers.size,
          workers_spawned: this.workersSpawned,
          tickets_processed: this.ticketsProcessed,
          last_health_check: new Date()
        });

        // Check if context is too large
        if (this.contextSize > this.maxContextSize) {
          console.log('⚠️ Context size exceeds limit, triggering restart...');
          await this.restart();
        }

        // Log health
        console.log(`💚 Health Check: ${this.activeWorkers.size} workers, ${this.contextSize} tokens, ${this.ticketsProcessed} processed`);

      } catch (error) {
        console.error('❌ Health check error:', error);
      }

      // Schedule next check
      this.healthCheckTimer = setTimeout(healthCheck, this.healthCheckInterval);
    };

    // Start health checks
    healthCheck();
  }

  /**
   * Graceful restart - preserve pending tickets
   */
  async restart() {
    console.log('🔄 Restarting orchestrator...');

    // Get pending tickets to preserve
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });
    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Record restart
    await aviStateRepo.recordRestart(ticketIds);

    // Stop current instance
    await this.stop();

    // Reset context
    this.contextSize = 0;
    this.ticketsProcessed = 0;

    // Start fresh
    await this.start();
  }

  /**
   * Stop the orchestrator gracefully
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Orchestrator not running');
      return;
    }

    console.log('🛑 Stopping AVI Orchestrator...');
    this.running = false;

    // Stop timers
    if (this.mainLoopTimer) {
      clearTimeout(this.mainLoopTimer);
      this.mainLoopTimer = null;
    }
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Wait for active workers to finish (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    while (this.activeWorkers.size > 0 && (Date.now() - start) < timeout) {
      console.log(`⏳ Waiting for ${this.activeWorkers.size} workers to finish...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Force kill remaining workers
    if (this.activeWorkers.size > 0) {
      console.log(`⚠️ Force stopping ${this.activeWorkers.size} workers`);
      this.activeWorkers.clear();
    }

    // Get pending tickets to preserve
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });
    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Update database
    await aviStateRepo.updateState({
      status: 'stopped',
      pending_tickets: ticketIds
    });

    console.log('✅ AVI Orchestrator stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.running,
      contextSize: this.contextSize,
      activeWorkers: this.activeWorkers.size,
      workersSpawned: this.workersSpawned,
      ticketsProcessed: this.ticketsProcessed,
      maxWorkers: this.maxWorkers,
      maxContextSize: this.maxContextSize
    };
  }
}

// Singleton instance
let orchestratorInstance = null;

/**
 * Get or create orchestrator instance
 */
export function getOrchestrator(config = {}) {
  if (!orchestratorInstance) {
    orchestratorInstance = new AviOrchestrator(config);
  }
  return orchestratorInstance;
}

/**
 * Start the orchestrator
 */
export async function startOrchestrator(config = {}) {
  const orchestrator = getOrchestrator(config);
  await orchestrator.start();
  return orchestrator;
}

/**
 * Stop the orchestrator
 */
export async function stopOrchestrator() {
  if (orchestratorInstance) {
    await orchestratorInstance.stop();
  }
}

export default AviOrchestrator;
