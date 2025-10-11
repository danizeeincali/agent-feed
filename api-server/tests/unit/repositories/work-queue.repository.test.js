/**
 * Work Queue Repository Tests
 * Tests for work ticket management (TIER 1: AVI Architecture)
 *
 * Test Strategy: Real PostgreSQL integration (no mocks)
 * Database: Uses PostgreSQL in test mode
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import workQueueRepo from '../../../repositories/postgres/work-queue.repository.js';
import postgresManager from '../../../config/postgres.js';

describe('WorkQueueRepository', () => {
  beforeAll(async () => {
    // Ensure PostgreSQL connection
    await postgresManager.connect();
    const healthy = await postgresManager.healthCheck();
    if (!healthy) {
      throw new Error('PostgreSQL not healthy');
    }
  });

  afterAll(async () => {
    await postgresManager.close();
  });

  beforeEach(async () => {
    // Clean work_queue table before each test
    await postgresManager.query('DELETE FROM work_queue');
  });

  describe('createTicket', () => {
    it('should create a new work ticket', async () => {
      const ticketData = {
        user_id: 'user-123',
        post_id: 'post-456',
        post_content: 'Test post content',
        post_author: 'author-789',
        post_metadata: { platform: 'twitter', mentions: ['@user1'] },
        assigned_agent: 'tech-guru',
        priority: 10
      };

      const ticket = await workQueueRepo.createTicket(ticketData);

      expect(ticket.id).toBeDefined();
      expect(ticket.user_id).toBe('user-123');
      expect(ticket.post_id).toBe('post-456');
      expect(ticket.post_content).toBe('Test post content');
      expect(ticket.assigned_agent).toBe('tech-guru');
      expect(ticket.priority).toBe(10);
      expect(ticket.status).toBe('pending');
      expect(ticket.post_metadata).toEqual({ platform: 'twitter', mentions: ['@user1'] });
    });

    it('should use default values for optional fields', async () => {
      const ticketData = {
        post_id: 'post-999',
        post_content: 'Simple post'
      };

      const ticket = await workQueueRepo.createTicket(ticketData);

      expect(ticket.user_id).toBe('anonymous');
      expect(ticket.priority).toBe(0);
      expect(ticket.post_author).toBeNull();
      expect(ticket.assigned_agent).toBeNull();
    });
  });

  describe('getNextTicket', () => {
    it('should get next ticket by priority (highest first)', async () => {
      // Create multiple tickets with different priorities
      await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Low priority',
        priority: 1
      });
      await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'High priority',
        priority: 10
      });
      await workQueueRepo.createTicket({
        post_id: 'post-3',
        post_content: 'Medium priority',
        priority: 5
      });

      const next = await workQueueRepo.getNextTicket();

      expect(next.post_id).toBe('post-2');
      expect(next.priority).toBe(10);
    });

    it('should get oldest ticket when priorities are equal', async () => {
      await workQueueRepo.createTicket({
        post_id: 'post-old',
        post_content: 'Old post',
        priority: 5
      });

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      await workQueueRepo.createTicket({
        post_id: 'post-new',
        post_content: 'New post',
        priority: 5
      });

      const next = await workQueueRepo.getNextTicket();

      expect(next.post_id).toBe('post-old');
    });

    it('should filter by user_id when provided', async () => {
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-1',
        post_content: 'User 1 post',
        priority: 10
      });
      await workQueueRepo.createTicket({
        user_id: 'user-2',
        post_id: 'post-2',
        post_content: 'User 2 post',
        priority: 20
      });

      const next = await workQueueRepo.getNextTicket('user-1');

      expect(next.post_id).toBe('post-1');
      expect(next.user_id).toBe('user-1');
    });

    it('should return null when no tickets available', async () => {
      const next = await workQueueRepo.getNextTicket();

      expect(next).toBeNull();
    });

    it('should only return pending tickets', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      // Mark as assigned
      await workQueueRepo.assignTicket(ticket.id, 'worker-1');

      const next = await workQueueRepo.getNextTicket();

      expect(next).toBeNull();
    });
  });

  describe('getTicketById', () => {
    it('should retrieve ticket by ID', async () => {
      const created = await workQueueRepo.createTicket({
        post_id: 'post-123',
        post_content: 'Test content'
      });

      const ticket = await workQueueRepo.getTicketById(created.id);

      expect(ticket).toBeDefined();
      expect(ticket.id).toBe(created.id);
      expect(ticket.post_id).toBe('post-123');
    });

    it('should return null for non-existent ID', async () => {
      const ticket = await workQueueRepo.getTicketById(99999);

      expect(ticket).toBeNull();
    });
  });

  describe('assignTicket', () => {
    it('should assign pending ticket to worker', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const assigned = await workQueueRepo.assignTicket(ticket.id, 'worker-abc');

      expect(assigned.status).toBe('assigned');
      expect(assigned.worker_id).toBe('worker-abc');
      expect(assigned.assigned_at).toBeDefined();
    });

    it('should reject assigning non-pending ticket', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.assignTicket(ticket.id, 'worker-1');

      // Try to assign again
      await expect(
        workQueueRepo.assignTicket(ticket.id, 'worker-2')
      ).rejects.toThrow();
    });
  });

  describe('startProcessing', () => {
    it('should mark assigned ticket as processing', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.assignTicket(ticket.id, 'worker-1');
      const processing = await workQueueRepo.startProcessing(ticket.id);

      expect(processing.status).toBe('processing');
      expect(processing.started_at).toBeDefined();
    });

    it('should reject starting non-assigned ticket', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await expect(
        workQueueRepo.startProcessing(ticket.id)
      ).rejects.toThrow();
    });
  });

  describe('completeTicket', () => {
    it('should mark processing ticket as completed with result', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.assignTicket(ticket.id, 'worker-1');
      await workQueueRepo.startProcessing(ticket.id);

      const result = { response: 'Great post!', posted: true };
      const completed = await workQueueRepo.completeTicket(ticket.id, result);

      expect(completed.status).toBe('completed');
      expect(completed.result).toEqual(result);
      expect(completed.completed_at).toBeDefined();
    });

    it('should reject completing non-processing ticket', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await expect(
        workQueueRepo.completeTicket(ticket.id, {})
      ).rejects.toThrow();
    });
  });

  describe('failTicket', () => {
    it('should mark ticket as failed with error message', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const failed = await workQueueRepo.failTicket(
        ticket.id,
        'API rate limit exceeded',
        false
      );

      expect(failed.status).toBe('failed');
      expect(failed.error_message).toBe('API rate limit exceeded');
      expect(failed.retry_count).toBe(1);
    });

    it('should auto-retry failed ticket under max retries', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const retried = await workQueueRepo.failTicket(
        ticket.id,
        'Temporary error',
        true
      );

      expect(retried.status).toBe('pending');
      expect(retried.retry_count).toBe(1);
    });

    it('should not retry after max retries reached', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      // Fail 3 times
      await workQueueRepo.failTicket(ticket.id, 'Error 1', true);
      await workQueueRepo.failTicket(ticket.id, 'Error 2', true);
      const final = await workQueueRepo.failTicket(ticket.id, 'Error 3', true);

      expect(final.status).toBe('failed');
      expect(final.retry_count).toBe(3);
    });
  });

  describe('retryTicket', () => {
    it('should reset failed ticket to pending', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.failTicket(ticket.id, 'Error', false);
      const retried = await workQueueRepo.retryTicket(ticket.id);

      expect(retried.status).toBe('pending');
      expect(retried.worker_id).toBeNull();
      expect(retried.error_message).toBeNull();
    });
  });

  describe('getTicketsByUser', () => {
    it('should get all tickets for a user', async () => {
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-2',
        post_content: 'Test 2'
      });
      await workQueueRepo.createTicket({
        user_id: 'user-2',
        post_id: 'post-3',
        post_content: 'Test 3'
      });

      const tickets = await workQueueRepo.getTicketsByUser('user-1');

      expect(tickets).toHaveLength(2);
      expect(tickets.every(t => t.user_id === 'user-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const t1 = await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      await workQueueRepo.assignTicket(t1.id, 'worker-1');

      const pending = await workQueueRepo.getTicketsByUser('user-1', {
        status: 'pending'
      });

      expect(pending).toHaveLength(1);
      expect(pending[0].post_id).toBe('post-2');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Pending 1'
      });
      await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Pending 2'
      });

      const t3 = await workQueueRepo.createTicket({
        post_id: 'post-3',
        post_content: 'Completed'
      });
      await workQueueRepo.assignTicket(t3.id, 'worker-1');
      await workQueueRepo.startProcessing(t3.id);
      await workQueueRepo.completeTicket(t3.id, {});

      const stats = await workQueueRepo.getQueueStats();

      expect(stats.pending_count).toBe('2');
      expect(stats.completed_count).toBe('1');
      expect(stats.total_count).toBe('3');
    });
  });

  describe('getPendingCount', () => {
    it('should count pending tickets globally', async () => {
      await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      const count = await workQueueRepo.getPendingCount();

      expect(count).toBe(2);
    });

    it('should count pending tickets for specific user', async () => {
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      await workQueueRepo.createTicket({
        user_id: 'user-2',
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      const count = await workQueueRepo.getPendingCount('user-1');

      expect(count).toBe(1);
    });
  });

  describe('getStuckTickets', () => {
    it('should identify tickets stuck in processing', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.assignTicket(ticket.id, 'worker-1');
      await workQueueRepo.startProcessing(ticket.id);

      // Manually set updated_at to 2 hours ago
      await postgresManager.query(
        `UPDATE work_queue SET updated_at = NOW() - INTERVAL '2 hours' WHERE id = $1`,
        [ticket.id]
      );

      const stuck = await workQueueRepo.getStuckTickets(30);

      expect(stuck).toHaveLength(1);
      expect(stuck[0].id).toBe(ticket.id);
    });
  });

  describe('resetStuckTickets', () => {
    it('should reset stuck tickets to pending', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.assignTicket(ticket.id, 'worker-1');

      // Make it stuck
      await postgresManager.query(
        `UPDATE work_queue SET updated_at = NOW() - INTERVAL '2 hours' WHERE id = $1`,
        [ticket.id]
      );

      const resetCount = await workQueueRepo.resetStuckTickets(30);

      expect(resetCount).toBe(1);

      const resetTicket = await workQueueRepo.getTicketById(ticket.id);
      expect(resetTicket.status).toBe('pending');
      expect(resetTicket.worker_id).toBeNull();
    });
  });

  describe('createTicketsBulk', () => {
    it('should create multiple tickets in one operation', async () => {
      const tickets = [
        { post_id: 'post-1', post_content: 'Test 1', priority: 1 },
        { post_id: 'post-2', post_content: 'Test 2', priority: 2 },
        { post_id: 'post-3', post_content: 'Test 3', priority: 3 }
      ];

      const created = await workQueueRepo.createTicketsBulk(tickets);

      expect(created).toHaveLength(3);
      expect(created[0].post_id).toBe('post-1');
      expect(created[1].post_id).toBe('post-2');
      expect(created[2].post_id).toBe('post-3');
    });

    it('should handle empty array', async () => {
      const created = await workQueueRepo.createTicketsBulk([]);

      expect(created).toHaveLength(0);
    });
  });

  describe('Integration: Ticket Lifecycle', () => {
    it('should handle complete ticket lifecycle', async () => {
      // 1. Create ticket
      const ticket = await workQueueRepo.createTicket({
        user_id: 'user-123',
        post_id: 'post-456',
        post_content: 'Interesting post about AI',
        post_author: 'author-789',
        assigned_agent: 'tech-guru',
        priority: 10
      });

      expect(ticket.status).toBe('pending');

      // 2. Get next ticket (should be ours)
      const next = await workQueueRepo.getNextTicket();
      expect(next.id).toBe(ticket.id);

      // 3. Assign to worker
      const assigned = await workQueueRepo.assignTicket(ticket.id, 'worker-xyz');
      expect(assigned.status).toBe('assigned');

      // 4. Start processing
      const processing = await workQueueRepo.startProcessing(ticket.id);
      expect(processing.status).toBe('processing');

      // 5. Complete with result
      const result = {
        response: 'Great insights on AI!',
        posted: true,
        post_url: 'https://twitter.com/tech-guru/status/123'
      };
      const completed = await workQueueRepo.completeTicket(ticket.id, result);

      expect(completed.status).toBe('completed');
      expect(completed.result).toEqual(result);
      expect(completed.completed_at).toBeDefined();

      // 6. Verify final state
      const final = await workQueueRepo.getTicketById(ticket.id);
      expect(final.status).toBe('completed');
      expect(final.worker_id).toBe('worker-xyz');
    });
  });
});
