/**
 * WorkQueueAdapter Unit Tests (London School TDD)
 * Tests the adapter that wraps work-queue.repository.js for orchestrator
 *
 * Focus: Mock-driven development, behavior verification, contract testing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { PendingTicket, QueueStats } from '../../../src/types/avi';

describe('WorkQueueAdapter - Unit Tests (London School TDD)', () => {
  let mockRepository: any;
  let adapter: any;

  beforeEach(() => {
    // Create mock repository with jest.fn() equivalents
    mockRepository = {
      getTicketsByUser: jest.fn(),
      assignTicket: jest.fn(),
      getQueueStats: jest.fn(),
      getTicketsByStatus: jest.fn(),
    };

    // Import and instantiate adapter with mock (will fail until implementation exists)
    // This is the RED phase - tests written first
  });

  describe('Contract: getPendingTickets()', () => {
    it('should retrieve pending tickets from repository', async () => {
      // ARRANGE - Mock the repository collaboration
      const mockDbTickets = [
        {
          id: 1,
          user_id: 'user123',
          post_id: 'post456',
          priority: 10,
          created_at: '2025-10-12T10:00:00Z',
          retry_count: 0,
        },
        {
          id: 2,
          user_id: 'user123',
          post_id: 'post789',
          priority: 5,
          created_at: '2025-10-12T10:01:00Z',
          retry_count: 1,
        },
      ];

      mockRepository.getTicketsByUser.mockResolvedValue(mockDbTickets);

      // Create adapter instance (RED - will fail)
      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          // Expected to fail in RED phase
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      // ACT - Call the method under test
      const tickets = await adapter.getPendingTickets();

      // ASSERT - Verify behavior (London School focuses on interactions)
      // 1. Verify collaboration with repository
      expect(mockRepository.getTicketsByUser).toHaveBeenCalledWith(null, {
        status: 'pending',
        limit: 100,
      });
      expect(mockRepository.getTicketsByUser).toHaveBeenCalledTimes(1);

      // 2. Verify contract transformation
      expect(tickets).toHaveLength(2);
      expect(tickets[0]).toMatchObject({
        id: '1',
        userId: 'user123',
        feedId: 'post456',
        priority: 10,
        retryCount: 0,
      });
      expect(tickets[0].createdAt).toBeInstanceOf(Date);

      // 3. Verify priority ordering preserved
      expect(tickets[1].priority).toBe(5);
    });

    it('should handle empty queue gracefully', async () => {
      mockRepository.getTicketsByUser.mockResolvedValue([]);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      const tickets = await adapter.getPendingTickets();

      expect(tickets).toEqual([]);
      expect(mockRepository.getTicketsByUser).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockRepository.getTicketsByUser.mockRejectedValue(dbError);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      await expect(adapter.getPendingTickets()).rejects.toThrow('Database connection failed');
      expect(mockRepository.getTicketsByUser).toHaveBeenCalledTimes(1);
    });

    it('should map database schema correctly to interface', async () => {
      const mockTicket = {
        id: 42,
        user_id: 'testuser',
        post_id: 'feed-item-123',
        priority: 7,
        created_at: '2025-10-12T15:30:00Z',
        retry_count: 2,
        assigned_agent: 'agent_1',
        status: 'pending',
      };

      mockRepository.getTicketsByUser.mockResolvedValue([mockTicket]);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);
      const tickets = await adapter.getPendingTickets();

      const mapped = tickets[0];
      expect(mapped.id).toBe('42'); // Converted to string
      expect(mapped.userId).toBe('testuser');
      expect(mapped.feedId).toBe('feed-item-123');
      expect(mapped.priority).toBe(7);
      expect(mapped.retryCount).toBe(2);
      expect(mapped.createdAt).toEqual(new Date('2025-10-12T15:30:00Z'));
    });
  });

  describe('Contract: assignTicket()', () => {
    it('should assign ticket to worker via repository', async () => {
      mockRepository.assignTicket.mockResolvedValue(undefined);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      // ACT
      await adapter.assignTicket('123', 'worker-abc-456');

      // ASSERT - Verify interaction
      expect(mockRepository.assignTicket).toHaveBeenCalledWith(123, 'worker-abc-456');
      expect(mockRepository.assignTicket).toHaveBeenCalledTimes(1);
    });

    it('should convert string ticket ID to integer', async () => {
      mockRepository.assignTicket.mockResolvedValue(undefined);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      await adapter.assignTicket('999', 'worker-xyz');

      // Verify integer conversion
      expect(mockRepository.assignTicket).toHaveBeenCalledWith(999, 'worker-xyz');
    });

    it('should propagate assignment errors', async () => {
      const assignError = new Error('Ticket already assigned');
      mockRepository.assignTicket.mockRejectedValue(assignError);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      await expect(adapter.assignTicket('1', 'worker-1')).rejects.toThrow('Ticket already assigned');
    });
  });

  describe('Contract: getQueueStats()', () => {
    it('should retrieve and transform queue statistics', async () => {
      const mockStats = {
        pending_count: '15',
        processing_count: '3',
        completed_count: '142',
        failed_count: '2',
      };

      mockRepository.getQueueStats.mockResolvedValue(mockStats);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      // ACT
      const stats = await adapter.getQueueStats();

      // ASSERT
      expect(mockRepository.getQueueStats).toHaveBeenCalledTimes(1);
      expect(stats).toEqual({
        pending: 15,
        processing: 3,
        completed: 142,
        failed: 2,
      });
    });

    it('should handle null counts gracefully', async () => {
      const mockStats = {
        pending_count: null,
        processing_count: null,
        completed_count: '0',
        failed_count: null,
      };

      mockRepository.getQueueStats.mockResolvedValue(mockStats);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      const stats = await adapter.getQueueStats();

      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should verify QueueStats contract shape', async () => {
      mockRepository.getQueueStats.mockResolvedValue({
        pending_count: '5',
        processing_count: '2',
        completed_count: '10',
        failed_count: '1',
      });

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      const stats: QueueStats = await adapter.getQueueStats();

      // Contract verification
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.processing).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });
  });

  describe('Collaboration Patterns', () => {
    it('should use repository consistently across methods', async () => {
      mockRepository.getTicketsByUser.mockResolvedValue([]);
      mockRepository.assignTicket.mockResolvedValue(undefined);
      mockRepository.getQueueStats.mockResolvedValue({
        pending_count: '0',
        processing_count: '0',
        completed_count: '0',
        failed_count: '0',
      });

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      // Execute multiple operations
      await adapter.getPendingTickets();
      await adapter.assignTicket('1', 'worker-1');
      await adapter.getQueueStats();

      // Verify all collaborations used same repository instance
      expect(mockRepository.getTicketsByUser).toHaveBeenCalledTimes(1);
      expect(mockRepository.assignTicket).toHaveBeenCalledTimes(1);
      expect(mockRepository.getQueueStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tickets with missing optional fields', async () => {
      const minimalTicket = {
        id: 1,
        user_id: 'user',
        post_id: 'post',
        priority: null,
        created_at: '2025-10-12T10:00:00Z',
        retry_count: null,
      };

      mockRepository.getTicketsByUser.mockResolvedValue([minimalTicket]);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      const tickets = await adapter.getPendingTickets();

      expect(tickets[0].priority).toBe(0); // Default value
      expect(tickets[0].retryCount).toBe(0); // Default value
    });

    it('should handle large result sets efficiently', async () => {
      const largeTicketSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        user_id: `user${i}`,
        post_id: `post${i}`,
        priority: i % 3,
        created_at: '2025-10-12T10:00:00Z',
        retry_count: 0,
      }));

      mockRepository.getTicketsByUser.mockResolvedValue(largeTicketSet);

      const WorkQueueAdapter = await import('../../../api-server/avi/adapters/work-queue.adapter.js')
        .then(m => m.WorkQueueAdapter)
        .catch(() => {
          throw new Error('WorkQueueAdapter not implemented yet');
        });

      adapter = new WorkQueueAdapter(mockRepository);

      const tickets = await adapter.getPendingTickets();

      expect(tickets).toHaveLength(100);
      // Verify each ticket was mapped correctly
      tickets.forEach((ticket, idx) => {
        expect(ticket.id).toBe(String(idx + 1));
      });
    });
  });
});
