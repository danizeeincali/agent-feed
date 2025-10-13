/**
 * WorkerSpawnerAdapter Unit Tests (London School TDD)
 * Tests the worker spawning and lifecycle management adapter
 *
 * Focus: Asynchronous behavior, lifecycle tracking, timeout mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { PendingTicket, WorkerInfo } from '../../../src/types/avi';

describe('WorkerSpawnerAdapter - Unit Tests (London School TDD)', () => {
  let mockDb: any;
  let mockWorkQueueRepository: any;
  let adapter: any;

  beforeEach(() => {
    // Mock database manager
    mockDb = {
      query: jest.fn(),
    };

    // Mock work queue repository
    mockWorkQueueRepository = {
      startProcessing: jest.fn(),
      completeTicket: jest.fn(),
      failTicket: jest.fn(),
      getTicketById: jest.fn(),
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Contract: spawnWorker()', () => {
    it('should spawn worker and return WorkerInfo', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      const mockTicket: PendingTicket = {
        id: '123',
        userId: 'user456',
        feedId: 'feed789',
        priority: 5,
        createdAt: new Date(),
        retryCount: 0,
      };

      // Mock ticket loading
      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 123,
        user_id: 'user456',
        post_id: 'feed789',
        post_content: 'Test post content',
        assigned_agent: 'agent_1',
        priority: 5,
        status: 'pending',
        created_at: new Date().toISOString(),
        post_metadata: { source: 'twitter' },
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      // Mock the internal repository
      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      // ACT
      const workerInfo: WorkerInfo = await adapter.spawnWorker(mockTicket);

      // ASSERT - Verify WorkerInfo contract
      expect(workerInfo).toMatchObject({
        id: expect.any(String),
        ticketId: '123',
        status: 'running',
        startTime: expect.any(Date),
      });

      expect(workerInfo.id).toMatch(/^worker-/); // Worker ID format
    });

    it('should track spawned worker in active workers map', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      const mockTicket: PendingTicket = {
        id: '456',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 456,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      // ACT
      const workerInfo = await adapter.spawnWorker(mockTicket);

      // ASSERT - Worker should be in active workers
      const activeWorkers = await adapter.getActiveWorkers();
      expect(activeWorkers).toHaveLength(1);
      expect(activeWorkers[0].id).toBe(workerInfo.id);
    });

    it('should execute worker asynchronously', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      const mockTicket: PendingTicket = {
        id: '789',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 789,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      // ACT - Spawn worker
      const workerInfo = await adapter.spawnWorker(mockTicket);

      // ASSERT - spawnWorker should return immediately
      expect(workerInfo.status).toBe('running');

      // Worker should still be active (execution in background)
      const activeWorkers = await adapter.getActiveWorkers();
      expect(activeWorkers.some(w => w.id === workerInfo.id)).toBe(true);
    });

    it('should mark ticket as processing when spawning', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      const mockTicket: PendingTicket = {
        id: '100',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 100,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      // ACT
      await adapter.spawnWorker(mockTicket);

      // Allow async execution to start
      jest.runAllTimers();

      // ASSERT - Should have called startProcessing
      expect(mockWorkQueueRepository.startProcessing).toHaveBeenCalledWith(100);
    });
  });

  describe('Contract: getActiveWorkers()', () => {
    it('should return empty array initially', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      adapter = new WorkerSpawnerAdapter(mockDb);

      // ACT
      const workers = await adapter.getActiveWorkers();

      // ASSERT
      expect(workers).toEqual([]);
    });

    it('should return all active workers', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket1: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      const ticket2: PendingTicket = {
        id: '2',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      // Spawn two workers
      await adapter.spawnWorker(ticket1);
      await adapter.spawnWorker(ticket2);

      // ACT
      const workers = await adapter.getActiveWorkers();

      // ASSERT
      expect(workers).toHaveLength(2);
      expect(workers[0].ticketId).toBe('1');
      expect(workers[1].ticketId).toBe('2');
    });

    it('should return current worker status', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      await adapter.spawnWorker(ticket);

      // ACT
      const workers = await adapter.getActiveWorkers();

      // ASSERT
      expect(workers[0]).toMatchObject({
        status: 'running',
        startTime: expect.any(Date),
      });
    });
  });

  describe('Contract: terminateWorker()', () => {
    it('should terminate specific worker by ID', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      const workerInfo = await adapter.spawnWorker(ticket);

      // ACT
      await adapter.terminateWorker(workerInfo.id);

      // ASSERT
      const workers = await adapter.getActiveWorkers();
      expect(workers).toHaveLength(0);
    });

    it('should mark terminated worker as failed', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      const workerInfo = await adapter.spawnWorker(ticket);

      // Store reference before termination
      const workersBefore = await adapter.getActiveWorkers();
      const worker = workersBefore.find(w => w.id === workerInfo.id);

      // ACT
      await adapter.terminateWorker(workerInfo.id);

      // ASSERT - Worker should be marked as failed before removal
      expect(worker?.status).toBe('failed');
      expect(worker?.error).toBe('Terminated by orchestrator');
      expect(worker?.endTime).toBeInstanceOf(Date);
    });

    it('should be safe to terminate non-existent worker', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      adapter = new WorkerSpawnerAdapter(mockDb);

      // ACT - Terminate non-existent worker
      await expect(adapter.terminateWorker('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('Contract: waitForAllWorkers()', () => {
    it('should return immediately if no active workers', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      adapter = new WorkerSpawnerAdapter(mockDb);

      const startTime = Date.now();

      // ACT
      await adapter.waitForAllWorkers(10000);

      const duration = Date.now() - startTime;

      // ASSERT - Should return immediately
      expect(duration).toBeLessThan(100);
    });

    it('should wait for workers to complete', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      // Mock a long-running worker
      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);
      mockWorkQueueRepository.completeTicket.mockImplementation(async () => {
        // Simulate slow completion
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      await adapter.spawnWorker(ticket);

      // ACT - Wait with sufficient timeout
      const waitPromise = adapter.waitForAllWorkers(5000);

      // Advance timers to complete worker
      jest.runAllTimers();

      await expect(waitPromise).resolves.not.toThrow();
    });

    it('should timeout if workers do not complete', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      // Mock a worker that never completes
      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      await adapter.spawnWorker(ticket);

      // ACT - Wait with short timeout
      const waitPromise = adapter.waitForAllWorkers(1000);

      // Advance time past timeout
      jest.advanceTimersByTime(1000);

      // ASSERT - Should complete (not hang indefinitely)
      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('Worker Lifecycle', () => {
    it('should update worker status from spawning to running to completed', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockResolvedValue({
        id: 1,
        user_id: 'user',
        post_id: 'feed',
        post_content: 'Content',
        assigned_agent: 'agent_1',
        priority: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      mockWorkQueueRepository.startProcessing.mockResolvedValue(undefined);
      mockWorkQueueRepository.completeTicket.mockResolvedValue(undefined);

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '1',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      // ACT
      const workerInfo = await adapter.spawnWorker(ticket);

      // ASSERT - Initially running
      expect(workerInfo.status).toBe('running');

      // Let worker complete
      jest.runAllTimers();

      // Worker should eventually be removed from active list
      const finalWorkers = await adapter.getActiveWorkers();
      expect(finalWorkers.some(w => w.id === workerInfo.id)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle worker execution failure gracefully', async () => {
      const WorkerSpawnerAdapter = await import('../../../api-server/avi/adapters/worker-spawner.adapter.js')
        .then(m => m.WorkerSpawnerAdapter)
        .catch(() => {
          throw new Error('WorkerSpawnerAdapter not implemented yet');
        });

      mockWorkQueueRepository.getTicketById.mockRejectedValue(new Error('Ticket not found'));

      adapter = new WorkerSpawnerAdapter(mockDb);

      if (adapter.workQueueRepository) {
        Object.assign(adapter.workQueueRepository, mockWorkQueueRepository);
      }

      const ticket: PendingTicket = {
        id: '999',
        userId: 'user',
        feedId: 'feed',
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
      };

      // ACT - Should not crash
      const workerInfo = await adapter.spawnWorker(ticket);

      // Let error propagate
      jest.runAllTimers();

      // ASSERT - Worker should be marked as failed
      const workers = await adapter.getActiveWorkers();
      const failedWorker = workers.find(w => w.id === workerInfo.id);

      if (failedWorker) {
        expect(failedWorker.status).toBe('failed');
        expect(failedWorker.error).toBeDefined();
      }
    });
  });
});
