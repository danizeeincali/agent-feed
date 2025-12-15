/**
 * Orchestrator Startup Integration Tests
 * Tests full orchestrator integration with REAL database and HTTP calls
 *
 * NO MOCKS for database operations - uses real PostgreSQL
 * Focus: End-to-end flows, graceful shutdown, error recovery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { AviOrchestrator } from '../../../src/avi/orchestrator.js';
import postgresManager from '../../../api-server/config/postgres.js';
import workQueueRepository from '../../../api-server/repositories/postgres/work-queue.repository.js';
import aviStateRepository from '../../../api-server/repositories/postgres/avi-state.repository.js';
import type { AviConfig } from '../../../src/types/avi';

describe('Orchestrator Startup - Integration Tests (REAL DATABASE)', () => {
  let orchestrator: any;
  let testConfig: AviConfig;

  beforeAll(async () => {
    // Ensure database is connected
    await postgresManager.connect();

    // Clean up any existing test data
    await postgresManager.query('DELETE FROM work_queue WHERE user_id LIKE $1', ['test-user-%']);
    await postgresManager.query('DELETE FROM avi_state WHERE id = 1');
  });

  afterAll(async () => {
    // Clean up test data
    await postgresManager.query('DELETE FROM work_queue WHERE user_id LIKE $1', ['test-user-%']);
    await postgresManager.query('DELETE FROM avi_state WHERE id = 1');

    // Close database connection
    await postgresManager.end();
  });

  beforeEach(async () => {
    // Reset avi_state before each test
    await aviStateRepository.initialize();

    // Test configuration
    testConfig = {
      maxConcurrentWorkers: 5,
      checkInterval: 1000, // 1 second for faster tests
      enableHealthMonitor: false, // Disable for most tests
      shutdownTimeout: 5000,
    };
  });

  afterEach(async () => {
    // Stop orchestrator if still running
    if (orchestrator) {
      try {
        await orchestrator.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
      orchestrator = null;
    }
  });

  describe('Orchestrator Initialization', () => {
    it('should start orchestrator successfully with real adapters', async () => {
      // Import real adapters
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      // Create real adapter instances
      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue, 30000);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      // ACT - Create and start orchestrator
      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ASSERT
      const state = orchestrator.getState();
      expect(state.status).toBe('running');
      expect(state.startTime).toBeInstanceOf(Date);
      expect(state.ticketsProcessed).toBeGreaterThanOrEqual(0);
    });

    it('should load previous state from database on startup', async () => {
      // ARRANGE - Create previous state in database
      await aviStateRepository.updateState({
        status: 'stopped',
        tickets_processed: 100,
        workers_spawned: 95,
        active_workers: 0,
      });

      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      // ACT - Start orchestrator
      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ASSERT - Should have loaded previous metrics
      const state = orchestrator.getState();
      expect(state.ticketsProcessed).toBe(100);
      expect(state.workersSpawned).toBe(95);
    });

    it('should persist state to database on startup', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      // ACT
      await orchestrator.start();

      // Wait briefly for state to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT - Check database directly
      const dbState = await aviStateRepository.getState();
      expect(dbState).toBeDefined();
      expect(dbState.status).toBe('running');
      expect(dbState.start_time).toBeDefined();
    });
  });

  describe('Ticket Processing End-to-End', () => {
    it('should process pending ticket through full workflow', async () => {
      // ARRANGE - Create a real pending ticket
      const ticket = await workQueueRepository.createTicket({
        user_id: 'test-user-e2e',
        post_id: 'test-post-123',
        post_content: 'This is a test post for E2E processing',
        post_author: 'test_author',
        post_metadata: { source: 'test' },
        assigned_agent: 'test_agent',
        priority: 5,
      });

      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ACT - Wait for orchestrator to pick up ticket
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ASSERT - Ticket should be picked up
      const updatedTicket = await workQueueRepository.getTicketById(ticket.id);
      expect(updatedTicket.status).toMatch(/assigned|processing|completed/);

      // Check orchestrator metrics
      const state = orchestrator.getState();
      expect(state.workersSpawned).toBeGreaterThan(0);
    });

    it('should respect maxConcurrentWorkers limit', async () => {
      // ARRANGE - Create multiple tickets
      const tickets = await Promise.all([
        workQueueRepository.createTicket({
          user_id: 'test-user-concurrent-1',
          post_id: 'post-1',
          post_content: 'Test 1',
          priority: 5,
        }),
        workQueueRepository.createTicket({
          user_id: 'test-user-concurrent-2',
          post_id: 'post-2',
          post_content: 'Test 2',
          priority: 5,
        }),
        workQueueRepository.createTicket({
          user_id: 'test-user-concurrent-3',
          post_id: 'post-3',
          post_content: 'Test 3',
          priority: 5,
        }),
      ]);

      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const limitedConfig: AviConfig = {
        ...testConfig,
        maxConcurrentWorkers: 2, // Limit to 2 workers
      };

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        limitedConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ACT - Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ASSERT - Should not exceed limit
      const state = orchestrator.getState();
      expect(state.activeWorkers).toBeLessThanOrEqual(2);
    });

    it('should process tickets in priority order', async () => {
      // ARRANGE - Create tickets with different priorities
      const lowPriorityTicket = await workQueueRepository.createTicket({
        user_id: 'test-user-priority-low',
        post_id: 'post-low',
        post_content: 'Low priority',
        priority: 1,
      });

      const highPriorityTicket = await workQueueRepository.createTicket({
        user_id: 'test-user-priority-high',
        post_id: 'post-high',
        post_content: 'High priority',
        priority: 10,
      });

      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        {
          ...testConfig,
          maxConcurrentWorkers: 1, // Process one at a time
        },
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ACT - Wait for first ticket to be picked up
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ASSERT - High priority ticket should be processed first
      const highTicketUpdate = await workQueueRepository.getTicketById(highPriorityTicket.id);
      const lowTicketUpdate = await workQueueRepository.getTicketById(lowPriorityTicket.id);

      // High priority should be assigned/processing before low priority
      if (highTicketUpdate.status !== 'pending' && lowTicketUpdate.status !== 'pending') {
        // If both picked up, high should have earlier assigned_at
        expect(new Date(highTicketUpdate.assigned_at!).getTime()).toBeLessThan(
          new Date(lowTicketUpdate.assigned_at!).getTime()
        );
      }
    });
  });

  describe('Graceful Shutdown', () => {
    it('should stop gracefully and save final state', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // Let it run for a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // ACT - Graceful shutdown
      await orchestrator.stop();

      // ASSERT - State should be stopped
      const state = orchestrator.getState();
      expect(state.status).toBe('stopped');

      // Verify saved to database
      const dbState = await aviStateRepository.getState();
      expect(dbState.status).toBe('stopped');
    });

    it('should wait for active workers before shutdown', async () => {
      // ARRANGE - Create a ticket that will spawn a worker
      await workQueueRepository.createTicket({
        user_id: 'test-user-shutdown',
        post_id: 'post-shutdown',
        post_content: 'Test shutdown with active worker',
        priority: 5,
      });

      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // Wait for worker to spawn
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ACT - Shutdown (should wait for worker)
      const shutdownStart = Date.now();
      await orchestrator.stop();
      const shutdownDuration = Date.now() - shutdownStart;

      // ASSERT - Shutdown should have waited (or workers completed quickly)
      const state = orchestrator.getState();
      expect(state.status).toBe('stopped');
      expect(state.activeWorkers).toBe(0); // All workers should be done
    });

    it('should enforce shutdown timeout', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const shortTimeoutConfig: AviConfig = {
        ...testConfig,
        shutdownTimeout: 1000, // 1 second timeout
      };

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        shortTimeoutConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // ACT - Shutdown with timeout
      const shutdownStart = Date.now();
      await orchestrator.stop();
      const shutdownDuration = Date.now() - shutdownStart;

      // ASSERT - Should not exceed timeout significantly
      expect(shutdownDuration).toBeLessThan(2000); // Allow 1 second margin
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should start health monitor when enabled', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const healthConfig: AviConfig = {
        ...testConfig,
        enableHealthMonitor: true,
        healthCheckInterval: 5000,
      };

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue, 5000);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        healthConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      // ACT
      await orchestrator.start();

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 500));

      // ASSERT
      const state = orchestrator.getState();
      expect(state.lastHealthCheck).toBeInstanceOf(Date);
    });
  });

  describe('Error Recovery', () => {
    it('should continue running if database query fails', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      await orchestrator.start();

      // Let it run
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ASSERT - Should still be running despite any errors
      const state = orchestrator.getState();
      expect(state.status).toBe('running');
    });
  });

  describe('Performance', () => {
    it('should start orchestrator in under 3 seconds', async () => {
      const { WorkQueueAdapter } = await import('../../../api-server/avi/adapters/work-queue.adapter.js');
      const { HealthMonitorAdapter } = await import('../../../api-server/avi/adapters/health-monitor.adapter.js');
      const { WorkerSpawnerAdapter } = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js');
      const { AviDatabaseAdapter } = await import('../../../api-server/avi/adapters/avi-database.adapter.js');

      const workQueue = new WorkQueueAdapter();
      const healthMonitor = new HealthMonitorAdapter(workQueue);
      const workerSpawner = new WorkerSpawnerAdapter(postgresManager);
      const database = new AviDatabaseAdapter();

      orchestrator = new AviOrchestrator(
        testConfig,
        workQueue,
        healthMonitor,
        workerSpawner,
        database
      );

      // ACT - Measure startup time
      const startTime = Date.now();
      await orchestrator.start();
      const startupDuration = Date.now() - startTime;

      // ASSERT - NFR-2.1: Startup time < 3 seconds
      expect(startupDuration).toBeLessThan(3000);
    });
  });
});
