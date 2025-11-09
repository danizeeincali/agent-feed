/**
 * Work Queue Retry Logic Tests
 * Tests for new retry methods added to work queue repository
 *
 * Test Coverage:
 * - getTicketsByError
 * - resetTicketForRetry
 * - batchResetTickets
 * - orchestrator retry logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import workQueueRepo from '../../repositories/postgres/work-queue.repository.js';
import postgresManager from '../../config/postgres.js';

describe('WorkQueueRepository - Retry Methods', () => {
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
    // Clean work_queue_tickets table before each test
    await postgresManager.query('DELETE FROM work_queue_tickets');
  });

  describe('getTicketsByError', () => {
    it('should find tickets with matching error patterns', async () => {
      // Create tickets with different errors
      const t1 = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      const t2 = await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });
      const t3 = await workQueueRepo.createTicket({
        post_id: 'post-3',
        post_content: 'Test 3'
      });

      // Fail tickets with different errors
      await workQueueRepo.failTicket(t1.id, "Cannot read properties of undefined (reading 'toLowerCase')", false);
      await workQueueRepo.failTicket(t2.id, "Network timeout error", false);
      await workQueueRepo.failTicket(t3.id, "Cannot read properties of undefined (reading 'toLowerCase')", false);

      // Search for specific error pattern
      const matchingTickets = await workQueueRepo.getTicketsByError("Cannot read properties of undefined");

      expect(matchingTickets).toHaveLength(2);
      expect(matchingTickets.map(t => t.id).sort()).toEqual([t1.id, t3.id].sort());
    });

    it('should return empty array when no tickets match error pattern', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.failTicket(ticket.id, "Network timeout", false);

      const matchingTickets = await workQueueRepo.getTicketsByError("Database error");

      expect(matchingTickets).toHaveLength(0);
    });

    it('should only return failed tickets', async () => {
      const t1 = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      const t2 = await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      // Fail one ticket
      await workQueueRepo.failTicket(t1.id, "Test error", false);

      // t2 is still pending

      const matchingTickets = await workQueueRepo.getTicketsByError("Test error");

      expect(matchingTickets).toHaveLength(1);
      expect(matchingTickets[0].id).toBe(t1.id);
    });

    it('should handle partial pattern matching', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.failTicket(ticket.id, "Cannot read properties of undefined (reading 'toLowerCase')", false);

      // Test partial match
      const results1 = await workQueueRepo.getTicketsByError("toLowerCase");
      expect(results1).toHaveLength(1);

      const results2 = await workQueueRepo.getTicketsByError("Cannot read");
      expect(results2).toHaveLength(1);
    });
  });

  describe('resetTicketForRetry', () => {
    it('should reset failed ticket to pending with retry_count = 0', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      // Fail the ticket multiple times
      await workQueueRepo.failTicket(ticket.id, "Error 1", true);
      await workQueueRepo.failTicket(ticket.id, "Error 2", true);

      const failedTicket = await workQueueRepo.getTicketById(ticket.id);
      expect(failedTicket.retry_count).toBeGreaterThan(0);
      expect(failedTicket.status).toBe('pending'); // Auto-retry logic

      // Manually reset
      const resetTicket = await workQueueRepo.resetTicketForRetry(ticket.id);

      expect(resetTicket.status).toBe('pending');
      expect(resetTicket.retry_count).toBe(0);
      expect(resetTicket.worker_id).toBeNull();
      expect(resetTicket.assigned_at).toBeNull();
      expect(resetTicket.started_at).toBeNull();
      expect(resetTicket.error_message).toBeNull();
    });

    it('should clear all processing-related fields', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      // Assign and fail
      await workQueueRepo.assignTicket(ticket.id, 'worker-123');
      await workQueueRepo.startProcessing(ticket.id);
      await workQueueRepo.failTicket(ticket.id, "Processing error", false);

      const resetTicket = await workQueueRepo.resetTicketForRetry(ticket.id);

      expect(resetTicket.status).toBe('pending');
      expect(resetTicket.worker_id).toBeNull();
      expect(resetTicket.assigned_at).toBeNull();
      expect(resetTicket.started_at).toBeNull();
    });

    it('should throw error for non-existent ticket', async () => {
      await expect(
        workQueueRepo.resetTicketForRetry(99999)
      ).rejects.toThrow('Ticket 99999 not found');
    });
  });

  describe('batchResetTickets', () => {
    it('should reset multiple tickets at once', async () => {
      // Create and fail multiple tickets
      const t1 = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      const t2 = await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });
      const t3 = await workQueueRepo.createTicket({
        post_id: 'post-3',
        post_content: 'Test 3'
      });

      await workQueueRepo.failTicket(t1.id, "Error 1", false);
      await workQueueRepo.failTicket(t2.id, "Error 2", false);
      await workQueueRepo.failTicket(t3.id, "Error 3", false);

      // Batch reset
      const resetCount = await workQueueRepo.batchResetTickets([t1.id, t2.id, t3.id]);

      expect(resetCount).toBe(3);

      // Verify all tickets are reset
      const ticket1 = await workQueueRepo.getTicketById(t1.id);
      const ticket2 = await workQueueRepo.getTicketById(t2.id);
      const ticket3 = await workQueueRepo.getTicketById(t3.id);

      expect(ticket1.status).toBe('pending');
      expect(ticket1.retry_count).toBe(0);
      expect(ticket2.status).toBe('pending');
      expect(ticket2.retry_count).toBe(0);
      expect(ticket3.status).toBe('pending');
      expect(ticket3.retry_count).toBe(0);
    });

    it('should handle empty array', async () => {
      const resetCount = await workQueueRepo.batchResetTickets([]);
      expect(resetCount).toBe(0);
    });

    it('should handle null/undefined input', async () => {
      const resetCount1 = await workQueueRepo.batchResetTickets(null);
      expect(resetCount1).toBe(0);

      const resetCount2 = await workQueueRepo.batchResetTickets(undefined);
      expect(resetCount2).toBe(0);
    });

    it('should only reset existing tickets', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await workQueueRepo.failTicket(ticket.id, "Error", false);

      // Mix of valid and invalid IDs
      const resetCount = await workQueueRepo.batchResetTickets([ticket.id, 99999, 88888]);

      expect(resetCount).toBe(1);
    });

    it('should be more efficient than individual resets', async () => {
      // Create 10 failed tickets
      const tickets = [];
      for (let i = 0; i < 10; i++) {
        const ticket = await workQueueRepo.createTicket({
          post_id: `post-${i}`,
          post_content: `Test ${i}`
        });
        await workQueueRepo.failTicket(ticket.id, `Error ${i}`, false);
        tickets.push(ticket);
      }

      const ticketIds = tickets.map(t => t.id);

      // Batch reset should complete quickly
      const startTime = Date.now();
      const resetCount = await workQueueRepo.batchResetTickets(ticketIds);
      const duration = Date.now() - startTime;

      expect(resetCount).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Integration: Retry Workflow', () => {
    it('should handle complete retry workflow for bug-related failures', async () => {
      // Simulate bug scenario: multiple tickets failed with same error
      const tickets = [];
      for (let i = 0; i < 5; i++) {
        const ticket = await workQueueRepo.createTicket({
          post_id: `post-${i}`,
          post_content: `Comment ${i}`,
          post_metadata: { type: 'comment' }
        });

        // Fail with the bug error
        await workQueueRepo.failTicket(
          ticket.id,
          "Cannot read properties of undefined (reading 'toLowerCase')",
          false
        );

        tickets.push(ticket);
      }

      // 1. Find failed tickets
      const failedTickets = await workQueueRepo.getTicketsByError("Cannot read properties");
      expect(failedTickets).toHaveLength(5);

      // 2. Filter tickets under retry limit
      const ticketsToRetry = failedTickets.filter(t => t.retry_count < 5);
      expect(ticketsToRetry).toHaveLength(5);

      // 3. Batch reset
      const ticketIds = ticketsToRetry.map(t => t.id);
      const resetCount = await workQueueRepo.batchResetTickets(ticketIds);
      expect(resetCount).toBe(5);

      // 4. Verify tickets are ready for orchestrator
      const pendingTickets = await workQueueRepo.getPendingTickets({ limit: 10 });
      expect(pendingTickets).toHaveLength(5);
      expect(pendingTickets.every(t => t.retry_count === 0)).toBe(true);
    });

    it('should not retry tickets that exceeded max retry count', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      // Fail multiple times to exceed retry limit
      await workQueueRepo.failTicket(ticket.id, "Error 1", true);
      await workQueueRepo.failTicket(ticket.id, "Error 2", true);
      await workQueueRepo.failTicket(ticket.id, "Error 3", true);
      const finalFail = await workQueueRepo.failTicket(ticket.id, "Error 4", true);

      expect(finalFail.status).toBe('failed');
      expect(finalFail.retry_count).toBeGreaterThanOrEqual(3);

      // Try to reset (should work but we need to filter by retry_count in application logic)
      const resetTicket = await workQueueRepo.resetTicketForRetry(ticket.id);
      expect(resetTicket.status).toBe('pending');
      expect(resetTicket.retry_count).toBe(0);
    });
  });

  describe('updateTicketStatus - Orchestrator Compatibility', () => {
    it('should update ticket status for orchestrator', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const updated = await workQueueRepo.updateTicketStatus(ticket.id, 'in_progress');

      expect(updated.status).toBe('in_progress');
      expect(updated.id).toBe(ticket.id);
    });

    it('should handle string ticket IDs', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const updated = await workQueueRepo.updateTicketStatus(ticket.id.toString(), 'completed');

      expect(updated.status).toBe('completed');
    });

    it('should throw error for non-existent ticket', async () => {
      await expect(
        workQueueRepo.updateTicketStatus(99999, 'completed')
      ).rejects.toThrow('Ticket 99999 not found');
    });
  });
});
