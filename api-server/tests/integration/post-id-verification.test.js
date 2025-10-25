/**
 * Integration Test: Post ID Verification
 *
 * Verifies the complete post -> ticket flow with post_id tracking
 * Tests against the actual database to ensure persistence
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import path from 'path';

describe('Post ID Verification - Production Database', () => {
  let db;
  let workQueueRepo;
  const createdTicketIds = [];

  beforeAll(() => {
    // Use the actual production database
    const dbPath = path.join(process.cwd(), 'database.db');
    db = new Database(dbPath);
    workQueueRepo = new WorkQueueRepository(db);

    console.log('\n📊 Testing against production database:', dbPath);
  });

  afterEach(() => {
    // Clean up created tickets
    for (const id of createdTicketIds) {
      try {
        db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(id);
      } catch (err) {
        console.warn('Failed to clean up ticket:', id, err.message);
      }
    }
    createdTicketIds.length = 0;
  });

  describe('Schema Verification', () => {
    it('should have post_id column in work_queue_tickets', () => {
      const schema = db.prepare("PRAGMA table_info(work_queue_tickets)").all();
      const postIdColumn = schema.find(col => col.name === 'post_id');

      expect(postIdColumn).toBeDefined();
      expect(postIdColumn.type).toBe('TEXT');
      console.log('✅ post_id column exists in database');
    });

    it('should have index on post_id for performance', () => {
      const indexes = db.prepare("PRAGMA index_list(work_queue_tickets)").all();
      const postIdIndex = indexes.find(idx => idx.name === 'idx_work_queue_post_id');

      expect(postIdIndex).toBeDefined();
      console.log('✅ post_id index exists for fast queries');
    });
  });

  describe('Repository Integration', () => {
    it('should create and retrieve ticket with post_id', () => {
      const testPostId = `post-integration-${Date.now()}`;

      const ticket = workQueueRepo.createTicket({
        agent_id: 'test-agent',
        content: 'Integration test content',
        url: 'https://github.com/test/repo',
        priority: 'P2',
        post_id: testPostId,
        user_id: 'test-user'
      });

      createdTicketIds.push(ticket.id);

      expect(ticket.post_id).toBe(testPostId);

      // Verify it's actually in the database
      const fromDb = db.prepare('SELECT post_id FROM work_queue_tickets WHERE id = ?').get(ticket.id);
      expect(fromDb.post_id).toBe(testPostId);

      console.log('✅ Ticket created with post_id:', testPostId);
    });

    it('should query tickets by post_id', () => {
      const testPostId = `post-query-${Date.now()}`;

      // Create 2 tickets from the same post
      const ticket1 = workQueueRepo.createTicket({
        agent_id: 'agent-1',
        content: 'Test 1',
        priority: 'P1',
        post_id: testPostId
      });

      const ticket2 = workQueueRepo.createTicket({
        agent_id: 'agent-2',
        content: 'Test 2',
        priority: 'P2',
        post_id: testPostId
      });

      createdTicketIds.push(ticket1.id, ticket2.id);

      // Query by post_id
      const tickets = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?').all(testPostId);

      expect(tickets.length).toBe(2);
      expect(tickets.every(t => t.post_id === testPostId)).toBe(true);

      console.log(`✅ Found ${tickets.length} tickets for post_id: ${testPostId}`);
    });
  });

  describe('Service Integration', () => {
    it('should create tickets with post_id from processPostForProactiveAgents', async () => {
      const testPost = {
        id: `post-service-${Date.now()}`,
        author_id: 'test-author',
        content: 'Check out this cool GitHub repo: https://github.com/example/awesome-project'
      };

      const tickets = await processPostForProactiveAgents(testPost, workQueueRepo);

      expect(tickets.length).toBeGreaterThan(0);

      for (const ticket of tickets) {
        createdTicketIds.push(ticket.id);

        // Verify post_id is set as a direct field
        expect(ticket.post_id).toBe(testPost.id);

        // Verify post_id is also in metadata
        expect(ticket.metadata.post_id).toBe(testPost.id);

        // Verify it's in the database
        const fromDb = db.prepare('SELECT post_id FROM work_queue_tickets WHERE id = ?').get(ticket.id);
        expect(fromDb.post_id).toBe(testPost.id);
      }

      console.log(`✅ Created ${tickets.length} tickets with post_id: ${testPost.id}`);
    });

    it('should maintain post_id through ticket lifecycle', async () => {
      const testPost = {
        id: `post-lifecycle-${Date.now()}`,
        author_id: 'lifecycle-user',
        content: 'Testing lifecycle: https://github.com/test/lifecycle'
      };

      // 1. Create ticket from post
      const tickets = await processPostForProactiveAgents(testPost, workQueueRepo);
      expect(tickets.length).toBeGreaterThan(0);

      const ticket = tickets[0];
      createdTicketIds.push(ticket.id);

      // 2. Update ticket status
      workQueueRepo.updateTicketStatus(ticket.id, 'in_progress');

      // 3. Verify post_id persists
      const afterUpdate = workQueueRepo.getTicket(ticket.id);
      expect(afterUpdate.post_id).toBe(testPost.id);
      expect(afterUpdate.status).toBe('in_progress');

      // 4. Complete ticket
      workQueueRepo.completeTicket(ticket.id, { success: true });

      // 5. Verify post_id still persists
      const afterComplete = workQueueRepo.getTicket(ticket.id);
      expect(afterComplete.post_id).toBe(testPost.id);
      expect(afterComplete.status).toBe('completed');

      console.log(`✅ post_id preserved through lifecycle: ${testPost.id}`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tickets without post_id gracefully', () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'test-agent',
        content: 'No post_id',
        priority: 'P3'
        // No post_id provided
      });

      createdTicketIds.push(ticket.id);

      expect(ticket.post_id).toBeNull();
      console.log('✅ Handled missing post_id gracefully');
    });

    it('should handle duplicate post_id (multiple tickets from same post)', async () => {
      const testPost = {
        id: `post-duplicate-${Date.now()}`,
        author_id: 'dup-user',
        content: 'Multiple URLs: https://github.com/one https://github.com/two'
      };

      const tickets = await processPostForProactiveAgents(testPost, workQueueRepo);

      // All tickets should have the same post_id
      for (const ticket of tickets) {
        createdTicketIds.push(ticket.id);
        expect(ticket.post_id).toBe(testPost.id);
      }

      // Verify all are in database with same post_id
      const fromDb = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets WHERE post_id = ?').get(testPost.id);
      expect(fromDb.count).toBe(tickets.length);

      console.log(`✅ Handled ${tickets.length} tickets with duplicate post_id`);
    });
  });

  describe('Performance', () => {
    it('should efficiently query tickets by post_id', () => {
      const testPostId = `post-perf-${Date.now()}`;

      // Create 10 tickets
      for (let i = 0; i < 10; i++) {
        const ticket = workQueueRepo.createTicket({
          agent_id: `agent-${i}`,
          content: `Content ${i}`,
          priority: 'P1',
          post_id: testPostId
        });
        createdTicketIds.push(ticket.id);
      }

      // Query with timing
      const start = Date.now();
      const tickets = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?').all(testPostId);
      const duration = Date.now() - start;

      expect(tickets.length).toBe(10);
      expect(duration).toBeLessThan(10); // Should be very fast with index

      console.log(`✅ Queried 10 tickets in ${duration}ms`);
    });
  });
});
