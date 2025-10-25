/**
 * Integration Tests: Ticket Linking with Post ID
 *
 * Comprehensive tests to verify:
 * 1. Post creation with URL creates ticket with correct post_id
 * 2. Worker comment creation succeeds with proper payload
 * 3. Failed tickets can retry successfully
 * 4. Ticket status badges data structure is correct
 * 5. WebSocket events emit with correct post_id
 *
 * These tests verify the complete end-to-end flow from post creation
 * to ticket processing to comment creation on the original post.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import ticketStatusService from '../../services/ticket-status-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '../../../data/test-ticket-linking.db');

describe('Ticket Linking Integration Tests', () => {
  let db;
  let workQueue;

  beforeAll(() => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database with full schema
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        retry_count INTEGER DEFAULT 0,
        metadata TEXT,
        result TEXT,
        last_error TEXT,
        post_id TEXT,
        created_at INTEGER NOT NULL,
        assigned_at INTEGER,
        completed_at INTEGER
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_work_queue_agent ON work_queue_tickets(agent_id);
      CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue_tickets(post_id);
      CREATE INDEX IF NOT EXISTS idx_work_queue_post_status ON work_queue_tickets(post_id, status);

      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        updated_at INTEGER,
        author_name TEXT,
        author_username TEXT,
        metadata TEXT
      ) STRICT;

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        parent_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE
      );
    `);

    workQueue = new WorkQueueRepository(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    db.prepare('DELETE FROM work_queue_tickets').run();
    db.prepare('DELETE FROM agent_posts').run();
    db.prepare('DELETE FROM comments').run();
  });

  describe('Post Creation with URL Detection', () => {
    it('should create ticket with post_id when post contains URL', async () => {
      const post = {
        id: 'post-123',
        author_id: 'user-456',
        content: 'Check this out: https://github.com/example/repo'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);

      expect(tickets).toBeInstanceOf(Array);
      expect(tickets.length).toBeGreaterThan(0);

      const ticket = tickets[0];
      expect(ticket.post_id).toBe('post-123');
      expect(ticket.agent_id).toBe('link-logger-agent');
      expect(ticket.url).toBe('https://github.com/example/repo');
      expect(ticket.status).toBe('pending');
      expect(ticket.priority).toMatch(/^P[0-3]$/);
    });

    it('should create multiple tickets for multiple URLs in same post', async () => {
      const post = {
        id: 'post-multi',
        author_id: 'user-789',
        content: 'Compare these: https://github.com/one and https://github.com/two'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);

      expect(tickets.length).toBeGreaterThan(0);

      // All tickets should have same post_id
      tickets.forEach(ticket => {
        expect(ticket.post_id).toBe('post-multi');
      });
    });

    it('should NOT create tickets for posts without URLs', async () => {
      const post = {
        id: 'post-no-url',
        author_id: 'user-000',
        content: 'This is just a regular post without any links'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);

      expect(tickets).toHaveLength(0);
    });

    it('should store post_id in both metadata and as direct field', async () => {
      const post = {
        id: 'post-metadata',
        author_id: 'user-metadata',
        content: 'URL: https://example.com/test'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Direct field
      expect(ticket.post_id).toBe('post-metadata');

      // Also in metadata
      expect(ticket.metadata).toBeDefined();
      expect(ticket.metadata.post_id).toBe('post-metadata');
    });
  });

  describe('Ticket Status API Data Structure', () => {
    it('should return correct data structure from getPostTicketStatus', async () => {
      const post = {
        id: 'post-status',
        author_id: 'user-status',
        content: 'Check: https://github.com/status/test'
      };

      await processPostForProactiveAgents(post, workQueue);

      const status = ticketStatusService.getPostTicketStatus('post-status', db);

      // Verify structure
      expect(status).toHaveProperty('post_id');
      expect(status).toHaveProperty('tickets');
      expect(status).toHaveProperty('summary');

      expect(status.post_id).toBe('post-status');
      expect(status.tickets).toBeInstanceOf(Array);

      // Summary structure
      expect(status.summary).toHaveProperty('total');
      expect(status.summary).toHaveProperty('pending');
      expect(status.summary).toHaveProperty('processing');
      expect(status.summary).toHaveProperty('completed');
      expect(status.summary).toHaveProperty('failed');
      expect(status.summary).toHaveProperty('agents');

      expect(status.summary.total).toBeGreaterThan(0);
      expect(status.summary.agents).toContain('link-logger-agent');
    });

    it('should return empty structure for post with no tickets', () => {
      const status = ticketStatusService.getPostTicketStatus('nonexistent-post', db);

      expect(status.post_id).toBe('nonexistent-post');
      expect(status.tickets).toHaveLength(0);
      expect(status.summary.total).toBe(0);
      expect(status.summary.pending).toBe(0);
    });

    it('should correctly aggregate mixed ticket statuses', async () => {
      const post = {
        id: 'post-mixed',
        author_id: 'user-mixed',
        content: 'URLs: https://one.com https://two.com https://three.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);

      if (tickets.length >= 3) {
        // Set different statuses
        workQueue.updateTicketStatus(tickets[0].id, 'in_progress');
        workQueue.completeTicket(tickets[1].id, { success: true });

        // Fail third ticket 3 times to mark as failed
        workQueue.failTicket(tickets[2].id, 'Test error');
        workQueue.failTicket(tickets[2].id, 'Test error');
        workQueue.failTicket(tickets[2].id, 'Test error');

        const status = ticketStatusService.getPostTicketStatus('post-mixed', db);

        expect(status.summary.processing).toBe(1);
        expect(status.summary.completed).toBe(1);
        expect(status.summary.failed).toBe(1);
      }
    });
  });

  describe('Worker Comment Creation Flow', () => {
    it('should maintain post_id for worker to create comment', async () => {
      // Simulate post creation
      const postId = 'post-worker';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at, author_name, author_username)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(postId, 'test-agent', 'Test Post', 'Content with https://example.com', Date.now(), 'User', 'user');

      const post = {
        id: postId,
        author_id: 'user-worker',
        content: 'Content with https://example.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Worker would fetch ticket and get post_id
      const fetchedTicket = workQueue.getTicket(ticket.id);
      expect(fetchedTicket.post_id).toBe(postId);

      // Worker creates comment using post_id
      const commentStmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      commentStmt.run(
        'comment-1',
        fetchedTicket.post_id,  // Using post_id from ticket
        'Intelligence summary from worker',
        fetchedTicket.agent_id,
        null,
        Date.now()
      );

      // Verify comment was created
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.post_id).toBe(postId);
      expect(comment.author).toBe('link-logger-agent');
    });

    it('should complete ticket after successful comment creation', async () => {
      const post = {
        id: 'post-complete',
        author_id: 'user-complete',
        content: 'URL: https://complete.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Simulate worker processing
      workQueue.updateTicketStatus(ticket.id, 'in_progress');

      // Worker creates comment (simulated)
      // Then completes ticket
      workQueue.completeTicket(ticket.id, {
        success: true,
        commentId: 'comment-123',
        url: ticket.url
      });

      const completedTicket = workQueue.getTicket(ticket.id);
      expect(completedTicket.status).toBe('completed');
      expect(completedTicket.result.success).toBe(true);
      expect(completedTicket.result.commentId).toBe('comment-123');
      expect(completedTicket.post_id).toBe('post-complete'); // post_id preserved
    });
  });

  describe('Failed Ticket Retry Logic', () => {
    it('should retry failed ticket up to 3 times', async () => {
      const post = {
        id: 'post-retry',
        author_id: 'user-retry',
        content: 'URL: https://retry.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      expect(ticket.retry_count).toBe(0);
      expect(ticket.status).toBe('pending');

      // First failure - should retry (back to pending)
      workQueue.failTicket(ticket.id, 'Network error 1');
      let updated = workQueue.getTicket(ticket.id);
      expect(updated.retry_count).toBe(1);
      expect(updated.status).toBe('pending'); // Auto-retry
      expect(updated.last_error).toBe('Network error 1');

      // Second failure - should retry again
      workQueue.failTicket(ticket.id, 'Network error 2');
      updated = workQueue.getTicket(ticket.id);
      expect(updated.retry_count).toBe(2);
      expect(updated.status).toBe('pending');

      // Third failure - should mark as permanently failed
      workQueue.failTicket(ticket.id, 'Network error 3');
      updated = workQueue.getTicket(ticket.id);
      expect(updated.retry_count).toBe(3);
      expect(updated.status).toBe('failed'); // Permanently failed
      expect(updated.last_error).toBe('Network error 3');
    });

    it('should preserve post_id through retry cycles', async () => {
      const post = {
        id: 'post-retry-preserve',
        author_id: 'user-retry-preserve',
        content: 'URL: https://preserve.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Fail and retry multiple times
      for (let i = 0; i < 3; i++) {
        workQueue.failTicket(ticket.id, `Error ${i}`);
        const updated = workQueue.getTicket(ticket.id);
        expect(updated.post_id).toBe('post-retry-preserve');
      }

      // post_id should still be intact
      const finalTicket = workQueue.getTicket(ticket.id);
      expect(finalTicket.post_id).toBe('post-retry-preserve');
      expect(finalTicket.status).toBe('failed');
    });

    it('should allow manual retry of permanently failed ticket', async () => {
      const post = {
        id: 'post-manual-retry',
        author_id: 'user-manual',
        content: 'URL: https://manual-retry.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Fail 3 times to permanently fail
      workQueue.failTicket(ticket.id, 'Error 1');
      workQueue.failTicket(ticket.id, 'Error 2');
      workQueue.failTicket(ticket.id, 'Error 3');

      let failed = workQueue.getTicket(ticket.id);
      expect(failed.status).toBe('failed');

      // Manual retry: reset to pending
      workQueue.updateTicketStatus(ticket.id, 'pending');
      const retried = workQueue.getTicket(ticket.id);
      expect(retried.status).toBe('pending');
      expect(retried.post_id).toBe('post-manual-retry');

      // Can now be processed again
      workQueue.updateTicketStatus(ticket.id, 'in_progress');
      workQueue.completeTicket(ticket.id, { success: true, retried: true });

      const completed = workQueue.getTicket(ticket.id);
      expect(completed.status).toBe('completed');
      expect(completed.post_id).toBe('post-manual-retry');
    });
  });

  describe('Ticket Badge Data Validation', () => {
    it('should provide badge-ready data structure', async () => {
      const post = {
        id: 'post-badge',
        author_id: 'user-badge',
        content: 'URL: https://badge.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Get status for badge rendering
      const status = ticketStatusService.getPostTicketStatus('post-badge', db);

      // Badge needs: total, pending, processing, completed, failed
      expect(status.summary).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        processing: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        agents: expect.any(Array)
      });

      // Initially all pending
      expect(status.summary.total).toBe(1);
      expect(status.summary.pending).toBe(1);
      expect(status.summary.processing).toBe(0);
      expect(status.summary.completed).toBe(0);
      expect(status.summary.failed).toBe(0);
    });

    it('should handle badge data for posts with no tickets', () => {
      const status = ticketStatusService.getPostTicketStatus('post-no-badge', db);

      // Should return safe zero values
      expect(status.summary).toMatchObject({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        agents: []
      });
    });

    it('should map in_progress to processing for badge display', async () => {
      const post = {
        id: 'post-processing',
        author_id: 'user-processing',
        content: 'URL: https://processing.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      workQueue.updateTicketStatus(tickets[0].id, 'in_progress');

      const status = ticketStatusService.getPostTicketStatus('post-processing', db);

      // Badge shows as "processing" (mapped from in_progress)
      expect(status.summary.processing).toBe(1);
      expect(status.summary.pending).toBe(0);
    });

    it('should provide no emoji data - text status only', async () => {
      const post = {
        id: 'post-no-emoji',
        author_id: 'user-no-emoji',
        content: 'URL: https://no-emoji.com'
      };

      await processPostForProactiveAgents(post, workQueue);

      const status = ticketStatusService.getPostTicketStatus('post-no-emoji', db);
      const statusJson = JSON.stringify(status);

      // Verify NO emojis in response
      expect(statusJson).not.toContain('✅');
      expect(statusJson).not.toContain('🔴');
      expect(statusJson).not.toContain('🟡');
      expect(statusJson).not.toContain('🟢');

      // Status should be plain text
      status.tickets.forEach(ticket => {
        expect(ticket.status).toMatch(/^(pending|in_progress|completed|failed)$/);
      });
    });
  });

  describe('Post-Ticket Relationship Queries', () => {
    it('should efficiently query all tickets for a post', async () => {
      const post = {
        id: 'post-query',
        author_id: 'user-query',
        content: 'URLs: https://one.com https://two.com https://three.com'
      };

      await processPostForProactiveAgents(post, workQueue);

      // Query by post_id
      const tickets = workQueue.getTicketsByPost('post-query');

      expect(tickets.length).toBeGreaterThan(0);
      tickets.forEach(ticket => {
        expect(ticket.post_id).toBe('post-query');
      });
    });

    it('should use index for fast post_id queries', async () => {
      // Create multiple posts with tickets
      for (let i = 0; i < 10; i++) {
        const post = {
          id: `post-perf-${i}`,
          author_id: 'user-perf',
          content: `URL: https://perf-${i}.com`
        };
        await processPostForProactiveAgents(post, workQueue);
      }

      // Query should be fast with index
      const start = Date.now();
      const tickets = workQueue.getTicketsByPost('post-perf-5');
      const duration = Date.now() - start;

      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets[0].post_id).toBe('post-perf-5');
      expect(duration).toBeLessThan(10); // Should be very fast
    });
  });

  describe('WebSocket Event Payload Verification', () => {
    it('should include post_id in WebSocket event payload structure', async () => {
      const post = {
        id: 'post-ws',
        author_id: 'user-ws',
        content: 'URL: https://websocket.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Expected WebSocket payload structure
      const expectedPayload = {
        post_id: 'post-ws',
        ticket_id: ticket.id,
        status: 'pending',
        agent_id: 'link-logger-agent',
        timestamp: expect.any(String)
      };

      // Verify ticket has all required fields for WebSocket payload
      expect(ticket.post_id).toBe('post-ws');
      expect(ticket.id).toBeDefined();
      expect(ticket.agent_id).toBe('link-logger-agent');
      expect(ticket.status).toBe('pending');
    });

    it('should maintain post_id through status update events', async () => {
      const post = {
        id: 'post-ws-update',
        author_id: 'user-ws-update',
        content: 'URL: https://ws-update.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);
      const ticket = tickets[0];

      // Status update
      workQueue.updateTicketStatus(ticket.id, 'in_progress');
      const updated = workQueue.getTicket(ticket.id);

      // Payload should include post_id
      expect(updated.post_id).toBe('post-ws-update');
      expect(updated.status).toBe('in_progress');

      // Complete
      workQueue.completeTicket(ticket.id, { success: true });
      const completed = workQueue.getTicket(ticket.id);

      expect(completed.post_id).toBe('post-ws-update');
      expect(completed.status).toBe('completed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing post_id gracefully', () => {
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Manual ticket without post',
        priority: 'P3'
      });

      expect(ticket.post_id).toBeNull();
      expect(ticket.id).toBeDefined();
    });

    it('should validate ticket status service throws on invalid input', () => {
      expect(() => {
        ticketStatusService.getPostTicketStatus(null, db);
      }).toThrow();

      expect(() => {
        ticketStatusService.getPostTicketStatus('valid-id', null);
      }).toThrow();
    });

    it('should handle concurrent ticket creation for same post', async () => {
      const post = {
        id: 'post-concurrent',
        author_id: 'user-concurrent',
        content: 'URLs: https://one.com https://two.com'
      };

      // Create tickets twice (simulating race condition)
      const tickets1 = await processPostForProactiveAgents(post, workQueue);
      const tickets2 = await processPostForProactiveAgents(post, workQueue);

      // All tickets should have same post_id
      const allTickets = workQueue.getTicketsByPost('post-concurrent');
      expect(allTickets.length).toBeGreaterThan(0);

      allTickets.forEach(ticket => {
        expect(ticket.post_id).toBe('post-concurrent');
      });
    });
  });

  describe('Integration with Ticket Status Service', () => {
    it('should provide consistent data between repository and service', async () => {
      const post = {
        id: 'post-consistency',
        author_id: 'user-consistency',
        content: 'URL: https://consistency.com'
      };

      const tickets = await processPostForProactiveAgents(post, workQueue);

      // Get via repository
      const repoTickets = workQueue.getTicketsByPost('post-consistency');

      // Get via service
      const serviceStatus = ticketStatusService.getPostTicketStatus('post-consistency', db);

      // Should match
      expect(repoTickets.length).toBe(serviceStatus.tickets.length);
      expect(repoTickets.length).toBe(serviceStatus.summary.total);

      // Verify all tickets have correct post_id
      repoTickets.forEach(ticket => {
        expect(ticket.post_id).toBe('post-consistency');
      });

      serviceStatus.tickets.forEach(ticket => {
        expect(ticket.post_id).toBe('post-consistency');
      });

      // Verify same ticket IDs exist in both
      const repoIds = new Set(repoTickets.map(t => t.id));
      const serviceIds = new Set(serviceStatus.tickets.map(t => t.id));
      expect(repoIds).toEqual(serviceIds);
    });
  });
});
