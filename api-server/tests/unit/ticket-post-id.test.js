/**
 * Test: Ticket Creation Service - post_id Integration
 *
 * Verifies that:
 * 1. Tickets are created with post_id field
 * 2. post_id is stored in database
 * 3. post_id is retrievable
 * 4. Full end-to-end flow works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import path from 'path';
import fs from 'fs';

describe('Ticket Creation - post_id Integration', () => {
  let db;
  let workQueueRepo;
  const testDbPath = path.join(process.cwd(), 'test-ticket-postid.db');

  beforeEach(() => {
    // Clean up test DB if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = new Database(testDbPath);

    // Create work_queue_tickets table with post_id
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

      CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue_tickets(post_id);
    `);

    workQueueRepo = new WorkQueueRepository(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('1. Direct Ticket Creation with post_id', () => {
    it('should create ticket with post_id field', () => {
      const ticket = workQueueRepo.createTicket({
        user_id: 'user-123',
        agent_id: 'tech-agent',
        content: 'Test post content',
        url: 'https://github.com/example/repo',
        priority: 'P1',
        post_id: 'post-abc-123',
        metadata: {
          detected_at: Date.now(),
          context: 'GitHub repository mention'
        }
      });

      expect(ticket).toBeDefined();
      expect(ticket.post_id).toBe('post-abc-123');
      expect(ticket.agent_id).toBe('tech-agent');
    });

    it('should store post_id in database', () => {
      const testPostId = 'post-xyz-789';

      workQueueRepo.createTicket({
        agent_id: 'agent-1',
        content: 'Content',
        url: 'https://example.com',
        priority: 'P2',
        post_id: testPostId
      });

      // Query database directly
      const stmt = db.prepare('SELECT post_id FROM work_queue_tickets WHERE post_id = ?');
      const row = stmt.get(testPostId);

      expect(row).toBeDefined();
      expect(row.post_id).toBe(testPostId);
    });

    it('should retrieve post_id from database', () => {
      const testPostId = 'post-retrieve-test';

      const created = workQueueRepo.createTicket({
        agent_id: 'agent-2',
        content: 'Test',
        priority: 'P1',
        post_id: testPostId
      });

      const retrieved = workQueueRepo.getTicket(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.post_id).toBe(testPostId);
    });
  });

  describe('2. Post-to-Ticket Service Integration', () => {
    it('should include post_id in metadata when creating tickets', async () => {
      const post = {
        id: 'post-service-test-123',
        author_id: 'user-456',
        content: 'Check out this GitHub repo: https://github.com/example/cool-project'
      };

      const tickets = await processPostForProactiveAgents(post, workQueueRepo);

      expect(tickets.length).toBeGreaterThan(0);

      const ticket = tickets[0];
      expect(ticket.metadata).toBeDefined();
      expect(ticket.metadata.post_id).toBe('post-service-test-123');
    });

    it('should create ticket with both post_id field AND metadata', async () => {
      const post = {
        id: 'post-dual-test-456',
        author_id: 'user-789',
        content: 'Great article: https://example.com/article'
      };

      const tickets = await processPostForProactiveAgents(post, workQueueRepo);

      expect(tickets.length).toBeGreaterThan(0);

      const ticket = tickets[0];

      // Check metadata has post_id
      expect(ticket.metadata.post_id).toBe('post-dual-test-456');

      // Retrieve from DB and verify post_id field
      const retrieved = workQueueRepo.getTicket(ticket.id);
      expect(retrieved.post_id).toBe('post-dual-test-456');
    });
  });

  describe('3. End-to-End Post-to-Ticket Flow', () => {
    it('should complete full lifecycle: post -> ticket -> persist -> retrieve', async () => {
      // Step 1: Create post
      const post = {
        id: 'post-e2e-test',
        author_id: 'user-e2e',
        authorId: 'user-e2e',
        content: 'Interesting GitHub repo: https://github.com/user/project'
      };

      // Step 2: Create ticket from post
      const tickets = await processPostForProactiveAgents(post, workQueueRepo);
      expect(tickets.length).toBeGreaterThan(0);

      const ticketId = tickets[0].id;

      // Step 3: Verify ticket.post_id === post.id
      const ticket = tickets[0];
      expect(ticket.metadata.post_id).toBe(post.id);

      // Step 4: Fetch ticket from DB and verify post_id persisted
      const fetched = workQueueRepo.getTicket(ticketId);
      expect(fetched).toBeDefined();
      expect(fetched.post_id).toBe(post.id);
      expect(fetched.metadata.post_id).toBe(post.id);

      console.log('✅ E2E Test Passed: post.id -> ticket.post_id -> DB -> retrieval');
    });

    it('should allow querying tickets by post_id', async () => {
      const post1 = {
        id: 'post-query-1',
        author_id: 'user-1',
        content: 'URL: https://github.com/example/one'
      };

      const post2 = {
        id: 'post-query-2',
        author_id: 'user-2',
        content: 'URL: https://github.com/example/two'
      };

      await processPostForProactiveAgents(post1, workQueueRepo);
      await processPostForProactiveAgents(post2, workQueueRepo);

      // Query by post_id
      const stmt = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?');
      const tickets = stmt.all('post-query-1');

      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets[0].post_id).toBe('post-query-1');
    });
  });

  describe('4. Repository Methods with post_id', () => {
    it('should accept post_id in createTicket', () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'agent-test',
        content: 'Test content',
        priority: 'P2',
        post_id: 'post-repo-test',
        user_id: 'user-test'
      });

      expect(ticket.post_id).toBe('post-repo-test');
    });

    it('should return post_id in getTicket', () => {
      const created = workQueueRepo.createTicket({
        agent_id: 'agent-get',
        content: 'Content',
        priority: 'P1',
        post_id: 'post-get-test'
      });

      const retrieved = workQueueRepo.getTicket(created.id);

      expect(retrieved.post_id).toBe('post-get-test');
    });

    it('should handle null post_id gracefully', () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'agent-null',
        content: 'No post_id',
        priority: 'P3'
        // No post_id provided
      });

      expect(ticket.post_id).toBeNull();
    });
  });
});
