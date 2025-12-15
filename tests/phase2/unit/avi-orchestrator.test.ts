/**
 * Avi DM Orchestrator Unit Tests
 * London School TDD: Tests with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AviOrchestrator } from '../../../src/avi/orchestrator';
import type {
  AviConfig,
  AviState,
  IWorkQueue,
  IHealthMonitor,
  IWorkerSpawner,
  IAviDatabase,
  PendingTicket,
  HealthStatus,
  WorkerInfo,
  QueueStats,
} from '../../../src/types/avi';

describe('AviOrchestrator', () => {
  let orchestrator: AviOrchestrator;
  let mockWorkQueue: jest.Mocked<IWorkQueue>;
  let mockHealthMonitor: jest.Mocked<IHealthMonitor>;
  let mockWorkerSpawner: jest.Mocked<IWorkerSpawner>;
  let mockDatabase: jest.Mocked<IAviDatabase>;
  let defaultConfig: AviConfig;

  beforeEach(() => {
    // Setup default configuration
    defaultConfig = {
      checkInterval: 1000, // 1s for tests
      maxContextTokens: 2000,
      enableHealthMonitor: true,
      maxConcurrentWorkers: 5,
      shutdownTimeout: 5000,
    };

    // Create mocks
    mockWorkQueue = {
      getPendingTickets: jest.fn(),
      assignTicket: jest.fn(),
      getQueueStats: jest.fn(),
    } as jest.Mocked<IWorkQueue>;

    mockHealthMonitor = {
      start: jest.fn(),
      stop: jest.fn(),
      checkHealth: jest.fn(),
      onHealthChange: jest.fn(),
    } as jest.Mocked<IHealthMonitor>;

    mockWorkerSpawner = {
      spawnWorker: jest.fn(),
      getActiveWorkers: jest.fn(),
      terminateWorker: jest.fn(),
      waitForAllWorkers: jest.fn(),
    } as jest.Mocked<IWorkerSpawner>;

    mockDatabase = {
      saveState: jest.fn(),
      loadState: jest.fn(),
      updateMetrics: jest.fn(),
    } as jest.Mocked<IAviDatabase>;

    // Default mock implementations
    mockWorkQueue.getPendingTickets.mockResolvedValue([]);
    mockWorkQueue.getQueueStats.mockResolvedValue({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    });
    mockHealthMonitor.checkHealth.mockResolvedValue({
      healthy: true,
      timestamp: new Date(),
      metrics: {
        cpuUsage: 0.3,
        memoryUsage: 0.5,
        activeWorkers: 0,
        queueDepth: 0,
      },
    });
    mockWorkerSpawner.getActiveWorkers.mockResolvedValue([]);
    mockDatabase.loadState.mockResolvedValue(null);
    mockDatabase.saveState.mockResolvedValue(undefined);
    mockDatabase.updateMetrics.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with provided config', () => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );

      const state = orchestrator.getState();
      expect(state.status).toBe('initializing');
      expect(state.ticketsProcessed).toBe(0);
      expect(state.workersSpawned).toBe(0);
      expect(state.startTime).toBeInstanceOf(Date);
    });

    it('should use default config values when not provided', () => {
      const minimalConfig: AviConfig = {
        checkInterval: 5000,
        maxContextTokens: 2000,
        enableHealthMonitor: true,
      };

      orchestrator = new AviOrchestrator(
        minimalConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );

      expect(orchestrator).toBeDefined();
    });

    it('should load previous state from database if available', async () => {
      const previousState: AviState = {
        status: 'stopped',
        startTime: new Date(Date.now() - 10000),
        ticketsProcessed: 42,
        workersSpawned: 15,
      };

      mockDatabase.loadState.mockResolvedValue(previousState);

      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );

      await orchestrator.start();

      const state = orchestrator.getState();
      expect(state.ticketsProcessed).toBe(42);
      expect(state.workersSpawned).toBe(15);
    });
  });

  describe('Starting and Main Loop', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should start the orchestrator and update status', async () => {
      await orchestrator.start();

      const state = orchestrator.getState();
      expect(state.status).toBe('running');
      expect(mockDatabase.saveState).toHaveBeenCalled();
    });

    it('should start health monitor when enabled', async () => {
      await orchestrator.start();

      expect(mockHealthMonitor.start).toHaveBeenCalled();
      expect(mockHealthMonitor.onHealthChange).toHaveBeenCalled();
    });

    it('should not start health monitor when disabled', async () => {
      const configWithoutHealth = { ...defaultConfig, enableHealthMonitor: false };
      orchestrator = new AviOrchestrator(
        configWithoutHealth,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );

      await orchestrator.start();

      expect(mockHealthMonitor.start).not.toHaveBeenCalled();
    });

    it('should check work queue at configured intervals', async () => {
      jest.useFakeTimers();

      await orchestrator.start();

      // Fast-forward through multiple intervals
      jest.advanceTimersByTime(3000); // 3 intervals of 1s

      // Should have checked queue multiple times
      await Promise.resolve(); // Flush promises
      expect(mockWorkQueue.getPendingTickets).toHaveBeenCalled();

      await orchestrator.stop();
      jest.useRealTimers();
    });

    it('should not start if already running', async () => {
      await orchestrator.start();
      const state1 = orchestrator.getState();

      await orchestrator.start(); // Try to start again
      const state2 = orchestrator.getState();

      expect(state1.startTime).toEqual(state2.startTime);
    });
  });

  describe('Ticket Processing', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should spawn worker for pending tickets', async () => {
      const pendingTicket: PendingTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        feedId: 'feed-1',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueue.getPendingTickets.mockResolvedValue([pendingTicket]);
      mockWorkerSpawner.spawnWorker.mockResolvedValue({
        id: 'worker-1',
        ticketId: 'ticket-1',
        status: 'running',
        startTime: new Date(),
      });

      await orchestrator.start();
      await orchestrator.processTickets();

      expect(mockWorkerSpawner.spawnWorker).toHaveBeenCalledWith(pendingTicket);
      expect(mockWorkQueue.assignTicket).toHaveBeenCalledWith('ticket-1', 'worker-1');
    });

    it('should update metrics after spawning worker', async () => {
      const pendingTicket: PendingTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        feedId: 'feed-1',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueue.getPendingTickets.mockResolvedValue([pendingTicket]);
      mockWorkerSpawner.spawnWorker.mockResolvedValue({
        id: 'worker-1',
        ticketId: 'ticket-1',
        status: 'running',
        startTime: new Date(),
      });

      await orchestrator.start();
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.workersSpawned).toBe(1);
      expect(mockDatabase.updateMetrics).toHaveBeenCalledWith({
        workersSpawned: 1,
      });
    });

    it('should respect max concurrent workers limit', async () => {
      const tickets: PendingTicket[] = Array.from({ length: 10 }, (_, i) => ({
        id: `ticket-${i}`,
        userId: `user-${i}`,
        feedId: `feed-${i}`,
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      }));

      mockWorkQueue.getPendingTickets.mockResolvedValue(tickets);
      mockWorkerSpawner.getActiveWorkers.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `worker-${i}`,
          ticketId: `ticket-${i}`,
          status: 'running',
          startTime: new Date(),
        }))
      );
      mockWorkerSpawner.spawnWorker.mockResolvedValue({
        id: 'worker-new',
        ticketId: 'ticket-new',
        status: 'running',
        startTime: new Date(),
      });

      await orchestrator.start();
      await orchestrator.processTickets();

      // Should not spawn more workers when at max
      expect(mockWorkerSpawner.spawnWorker).not.toHaveBeenCalled();
    });

    it('should process multiple tickets when workers available', async () => {
      const tickets: PendingTicket[] = [
        {
          id: 'ticket-1',
          userId: 'user-1',
          feedId: 'feed-1',
          priority: 1,
          createdAt: new Date(),
          retryCount: 0,
        },
        {
          id: 'ticket-2',
          userId: 'user-2',
          feedId: 'feed-2',
          priority: 2,
          createdAt: new Date(),
          retryCount: 0,
        },
      ];

      mockWorkQueue.getPendingTickets.mockResolvedValue(tickets);
      mockWorkerSpawner.getActiveWorkers.mockResolvedValue([]);
      mockWorkerSpawner.spawnWorker.mockImplementation(async (ticket) => ({
        id: `worker-${ticket.id}`,
        ticketId: ticket.id,
        status: 'running',
        startTime: new Date(),
      }));

      await orchestrator.start();
      await orchestrator.processTickets();

      expect(mockWorkerSpawner.spawnWorker).toHaveBeenCalledTimes(2);
      expect(mockWorkQueue.assignTicket).toHaveBeenCalledTimes(2);
    });

    it('should handle worker spawn failures gracefully', async () => {
      const pendingTicket: PendingTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        feedId: 'feed-1',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueue.getPendingTickets.mockResolvedValue([pendingTicket]);
      mockWorkerSpawner.spawnWorker.mockRejectedValue(new Error('Worker spawn failed'));

      await orchestrator.start();
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.lastError).toBe('Worker spawn failed');
      // Should not crash
      expect(state.status).toBe('running');
    });

    it('should skip tickets if queue assignment fails', async () => {
      const pendingTicket: PendingTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        feedId: 'feed-1',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueue.getPendingTickets.mockResolvedValue([pendingTicket]);
      mockWorkerSpawner.spawnWorker.mockResolvedValue({
        id: 'worker-1',
        ticketId: 'ticket-1',
        status: 'running',
        startTime: new Date(),
      });
      mockWorkQueue.assignTicket.mockRejectedValue(new Error('Assignment failed'));

      await orchestrator.start();
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.lastError).toContain('Assignment failed');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should register health change callback', async () => {
      await orchestrator.start();

      expect(mockHealthMonitor.onHealthChange).toHaveBeenCalled();
    });

    it('should restart when health monitor signals unhealthy', async () => {
      let healthCallback: ((status: HealthStatus) => void) | undefined;

      mockHealthMonitor.onHealthChange.mockImplementation((callback) => {
        healthCallback = callback;
      });

      await orchestrator.start();
      expect(healthCallback).toBeDefined();

      const state1 = orchestrator.getState();
      expect(state1.status).toBe('running');

      // Simulate health issue
      const unhealthyStatus: HealthStatus = {
        healthy: false,
        timestamp: new Date(),
        metrics: {
          cpuUsage: 0.95,
          memoryUsage: 0.98,
          activeWorkers: 10,
          queueDepth: 100,
        },
        issues: ['High CPU usage', 'High memory usage'],
      };

      healthCallback!(unhealthyStatus);

      // Give time for restart
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state2 = orchestrator.getState();
      expect(state2.status).toBe('restarting');
    });

    it('should update state after health check', async () => {
      await orchestrator.start();

      // Process tickets to trigger health check update
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.lastHealthCheck).toBeInstanceOf(Date);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should stop gracefully and update status', async () => {
      await orchestrator.start();
      await orchestrator.stop();

      const state = orchestrator.getState();
      expect(state.status).toBe('stopped');
      expect(mockDatabase.saveState).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'stopped' })
      );
    });

    it('should stop health monitor on shutdown', async () => {
      await orchestrator.start();
      await orchestrator.stop();

      expect(mockHealthMonitor.stop).toHaveBeenCalled();
    });

    it('should wait for active workers to complete', async () => {
      const activeWorkers: WorkerInfo[] = [
        {
          id: 'worker-1',
          ticketId: 'ticket-1',
          status: 'running',
          startTime: new Date(),
        },
      ];

      mockWorkerSpawner.getActiveWorkers.mockResolvedValue(activeWorkers);
      mockWorkerSpawner.waitForAllWorkers.mockResolvedValue(undefined);

      await orchestrator.start();
      await orchestrator.stop();

      expect(mockWorkerSpawner.waitForAllWorkers).toHaveBeenCalledWith(
        defaultConfig.shutdownTimeout
      );
    });

    it('should handle shutdown timeout gracefully', async () => {
      const activeWorkers: WorkerInfo[] = [
        {
          id: 'worker-1',
          ticketId: 'ticket-1',
          status: 'running',
          startTime: new Date(),
        },
      ];

      mockWorkerSpawner.getActiveWorkers.mockResolvedValue(activeWorkers);
      mockWorkerSpawner.waitForAllWorkers.mockRejectedValue(new Error('Timeout'));

      await orchestrator.start();
      await orchestrator.stop();

      const state = orchestrator.getState();
      expect(state.status).toBe('stopped');
      // Should still stop despite timeout
    });

    it('should not process new tickets during shutdown', async () => {
      const pendingTicket: PendingTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        feedId: 'feed-1',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueue.getPendingTickets.mockResolvedValue([pendingTicket]);

      await orchestrator.start();
      const stopPromise = orchestrator.stop();

      // Try to process tickets during shutdown
      await orchestrator.processTickets();

      await stopPromise;

      // Should not spawn workers during shutdown
      expect(mockWorkerSpawner.spawnWorker).not.toHaveBeenCalled();
    });

    it('should handle stop when not running', async () => {
      await orchestrator.stop();

      const state = orchestrator.getState();
      expect(state.status).toBe('stopped');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should persist state to database periodically', async () => {
      jest.useFakeTimers();

      await orchestrator.start();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(mockDatabase.saveState).toHaveBeenCalled();

      await orchestrator.stop();
      jest.useRealTimers();
    });

    it('should return current state via getState', () => {
      const state = orchestrator.getState();

      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('ticketsProcessed');
      expect(state).toHaveProperty('workersSpawned');
    });

    it('should update active workers count', async () => {
      const workers: WorkerInfo[] = [
        {
          id: 'worker-1',
          ticketId: 'ticket-1',
          status: 'running',
          startTime: new Date(),
        },
        {
          id: 'worker-2',
          ticketId: 'ticket-2',
          status: 'running',
          startTime: new Date(),
        },
      ];

      mockWorkerSpawner.getActiveWorkers.mockResolvedValue(workers);

      await orchestrator.start();
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.activeWorkers).toBe(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      orchestrator = new AviOrchestrator(
        defaultConfig,
        mockWorkQueue,
        mockHealthMonitor,
        mockWorkerSpawner,
        mockDatabase
      );
    });

    it('should handle work queue errors gracefully', async () => {
      mockWorkQueue.getPendingTickets.mockRejectedValue(new Error('Queue error'));

      await orchestrator.start();
      await orchestrator.processTickets();

      const state = orchestrator.getState();
      expect(state.lastError).toBe('Queue error');
      expect(state.status).toBe('running'); // Should still be running
    });

    it('should handle database save errors', async () => {
      mockDatabase.saveState.mockRejectedValue(new Error('DB error'));

      await orchestrator.start();

      // Should not crash
      const state = orchestrator.getState();
      expect(state.status).toBe('running');
    });

    it('should handle health monitor start failures', async () => {
      mockHealthMonitor.start.mockRejectedValue(new Error('Health monitor error'));

      await orchestrator.start();

      const state = orchestrator.getState();
      expect(state.status).toBe('running'); // Should still start
    });

    it('should recover from transient errors', async () => {
      // First call fails, second succeeds
      mockWorkQueue.getPendingTickets
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce([]);

      await orchestrator.start();

      await orchestrator.processTickets();
      const state1 = orchestrator.getState();
      expect(state1.lastError).toBe('Transient error');

      await orchestrator.processTickets();
      const state2 = orchestrator.getState();
      expect(state2.lastError).toBe('Transient error'); // Error remains until cleared
    });
  });
});
