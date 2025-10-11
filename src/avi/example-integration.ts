/**
 * Example Integration for Avi DM Orchestrator
 *
 * This file demonstrates how the Avi orchestrator integrates with:
 * - Work Queue (to be implemented)
 * - Health Monitor (to be implemented)
 * - Worker Spawner (to be implemented)
 * - Database Manager (Phase 1 complete)
 */

import { AviOrchestrator } from './orchestrator';
import type {
  AviConfig,
  IWorkQueue,
  IHealthMonitor,
  IWorkerSpawner,
  IAviDatabase,
  PendingTicket,
  HealthStatus,
  WorkerInfo,
  QueueStats,
} from '../types/avi';

/**
 * Example Work Queue Implementation
 * (Placeholder - to be implemented by work-queue agent)
 */
class ExampleWorkQueue implements IWorkQueue {
  async getPendingTickets(): Promise<PendingTicket[]> {
    // TODO: Implement actual queue polling
    return [];
  }

  async assignTicket(ticketId: string, workerId: string): Promise<void> {
    // TODO: Implement ticket assignment
    console.log(`Assigned ticket ${ticketId} to worker ${workerId}`);
  }

  async getQueueStats(): Promise<QueueStats> {
    // TODO: Implement queue statistics
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }
}

/**
 * Example Health Monitor Implementation
 * (Placeholder - to be implemented by health-monitor agent)
 */
class ExampleHealthMonitor implements IHealthMonitor {
  private callback?: (status: HealthStatus) => void;
  private intervalHandle?: NodeJS.Timeout;

  async start(): Promise<void> {
    // TODO: Implement health monitoring
    this.intervalHandle = setInterval(() => {
      if (this.callback) {
        this.callback({
          healthy: true,
          timestamp: new Date(),
          metrics: {
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
            activeWorkers: 0,
            queueDepth: 0,
          },
        });
      }
    }, 10000);
  }

  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    // TODO: Implement health check logic
    return {
      healthy: true,
      timestamp: new Date(),
      metrics: {
        cpuUsage: 0.3,
        memoryUsage: 0.5,
        activeWorkers: 0,
        queueDepth: 0,
      },
    };
  }

  onHealthChange(callback: (status: HealthStatus) => void): void {
    this.callback = callback;
  }
}

/**
 * Example Worker Spawner Implementation
 * (Placeholder - to be implemented by worker-spawner agent)
 */
class ExampleWorkerSpawner implements IWorkerSpawner {
  private workers: Map<string, WorkerInfo> = new Map();

  async spawnWorker(ticket: PendingTicket): Promise<WorkerInfo> {
    // TODO: Implement actual worker spawning
    const worker: WorkerInfo = {
      id: `worker-${Date.now()}`,
      ticketId: ticket.id,
      status: 'spawning',
      startTime: new Date(),
    };

    this.workers.set(worker.id, worker);

    // Simulate worker startup
    setTimeout(() => {
      worker.status = 'running';
      this.workers.set(worker.id, worker);
    }, 100);

    return worker;
  }

  async getActiveWorkers(): Promise<WorkerInfo[]> {
    return Array.from(this.workers.values()).filter(
      w => w.status === 'running' || w.status === 'spawning'
    );
  }

  async terminateWorker(workerId: string): Promise<void> {
    // TODO: Implement worker termination
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'completed';
      worker.endTime = new Date();
      this.workers.set(workerId, worker);
    }
  }

  async waitForAllWorkers(timeout: number): Promise<void> {
    // TODO: Implement waiting for workers
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const active = await this.getActiveWorkers();
      if (active.length === 0) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for workers');
  }
}

/**
 * Example Database Implementation
 * (Placeholder - should use Phase 1 database manager)
 */
class ExampleDatabase implements IAviDatabase {
  private savedState?: any;

  async saveState(state: any): Promise<void> {
    // TODO: Use actual Phase 1 database manager
    this.savedState = { ...state };
    console.log('State saved:', state.status);
  }

  async loadState(): Promise<any> {
    // TODO: Use actual Phase 1 database manager
    return this.savedState;
  }

  async updateMetrics(metrics: any): Promise<void> {
    // TODO: Use actual Phase 1 database manager
    console.log('Metrics updated:', metrics);
  }
}

/**
 * Example: Complete Integration
 */
async function exampleIntegration() {
  console.log('=== Avi Orchestrator Integration Example ===\n');

  // Create configuration
  const config: AviConfig = {
    checkInterval: 5000,        // Check queue every 5 seconds
    maxContextTokens: 2000,
    enableHealthMonitor: true,
    maxConcurrentWorkers: 10,
    shutdownTimeout: 30000,
  };

  // Initialize dependencies
  const workQueue = new ExampleWorkQueue();
  const healthMonitor = new ExampleHealthMonitor();
  const workerSpawner = new ExampleWorkerSpawner();
  const database = new ExampleDatabase();

  // Create orchestrator
  const orchestrator = new AviOrchestrator(
    config,
    workQueue,
    healthMonitor,
    workerSpawner,
    database
  );

  console.log('1. Starting orchestrator...');
  await orchestrator.start();

  let state = orchestrator.getState();
  console.log(`   Status: ${state.status}`);
  console.log(`   Start time: ${state.startTime.toISOString()}`);
  console.log();

  console.log('2. Processing tickets...');
  await orchestrator.processTickets();

  state = orchestrator.getState();
  console.log(`   Workers spawned: ${state.workersSpawned}`);
  console.log(`   Active workers: ${state.activeWorkers}`);
  console.log();

  console.log('3. Checking state...');
  state = orchestrator.getState();
  console.log(`   Status: ${state.status}`);
  console.log(`   Tickets processed: ${state.ticketsProcessed}`);
  console.log(`   Last health check: ${state.lastHealthCheck?.toISOString() || 'N/A'}`);
  console.log();

  // Let it run for a bit
  console.log('4. Running for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('5. Stopping orchestrator...');
  await orchestrator.stop();

  state = orchestrator.getState();
  console.log(`   Final status: ${state.status}`);
  console.log();

  console.log('=== Integration Complete ===');
}

/**
 * Example: Error Handling
 */
async function exampleErrorHandling() {
  console.log('=== Error Handling Example ===\n');

  // Create failing work queue
  class FailingWorkQueue extends ExampleWorkQueue {
    async getPendingTickets(): Promise<PendingTicket[]> {
      throw new Error('Queue temporarily unavailable');
    }
  }

  const config: AviConfig = {
    checkInterval: 1000,
    maxContextTokens: 2000,
    enableHealthMonitor: false,
  };

  const orchestrator = new AviOrchestrator(
    config,
    new FailingWorkQueue(),
    new ExampleHealthMonitor(),
    new ExampleWorkerSpawner(),
    new ExampleDatabase()
  );

  await orchestrator.start();

  console.log('Processing tickets (will fail)...');
  await orchestrator.processTickets();

  const state = orchestrator.getState();
  console.log(`Status: ${state.status}`);
  console.log(`Last error: ${state.lastError}`);
  console.log('Orchestrator continues running despite error\n');

  await orchestrator.stop();
  console.log('=== Error Handling Complete ===');
}

/**
 * Example: Graceful Shutdown
 */
async function exampleGracefulShutdown() {
  console.log('=== Graceful Shutdown Example ===\n');

  const config: AviConfig = {
    checkInterval: 5000,
    maxContextTokens: 2000,
    enableHealthMonitor: false,
    shutdownTimeout: 5000,
  };

  const orchestrator = new AviOrchestrator(
    config,
    new ExampleWorkQueue(),
    new ExampleHealthMonitor(),
    new ExampleWorkerSpawner(),
    new ExampleDatabase()
  );

  console.log('Starting orchestrator...');
  await orchestrator.start();

  console.log('Spawning some workers...');
  await orchestrator.processTickets();

  console.log('Initiating graceful shutdown...');
  const startShutdown = Date.now();
  await orchestrator.stop();
  const shutdownTime = Date.now() - startShutdown;

  console.log(`Shutdown completed in ${shutdownTime}ms`);
  console.log('All workers completed\n');

  console.log('=== Graceful Shutdown Complete ===');
}

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    try {
      await exampleIntegration();
      console.log('\n---\n');
      await exampleErrorHandling();
      console.log('\n---\n');
      await exampleGracefulShutdown();
    } catch (error) {
      console.error('Example failed:', error);
      process.exit(1);
    }
  })();
}

export {
  ExampleWorkQueue,
  ExampleHealthMonitor,
  ExampleWorkerSpawner,
  ExampleDatabase,
  exampleIntegration,
  exampleErrorHandling,
  exampleGracefulShutdown,
};
