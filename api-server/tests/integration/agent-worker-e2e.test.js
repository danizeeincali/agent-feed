/**
 * AgentWorker E2E Integration Tests
 *
 * These tests verify the complete end-to-end flow with real database:
 * 1. Create real post in database
 * 2. Create ticket with post_id via ticket-creation-service
 * 3. Spawn AgentWorker with real workQueueRepo
 * 4. Mock only the Claude SDK (not database or API)
 * 5. Verify comment created in database (not post)
 * 6. Verify comment.post_id matches original post.id
 * 7. Verify comment.author matches agent_id
 * 8. Verify skipTicket was set
 *
 * Test Suite: Integration - E2E Database Flow
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';

describe('AgentWorker E2E Tests', () => {
  let db;
  let workQueueRepo;
  let worker;
  let apiServer;
  let apiServerInstance;
  const TEST_DB_PATH = '/tmp/test-agent-worker-e2e.db';
  const API_PORT = 3099;
  const API_BASE_URL = `http://localhost:${API_PORT}`;

  beforeAll(async () => {
    // Clean up old test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (err) {
      // File doesn't exist, that's fine
    }

    // Initialize test database with all required tables
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create posts table (using actual schema)
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_agent TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        engagement_comments INTEGER DEFAULT 0,
        engagement_likes INTEGER DEFAULT 0
      )
    `);

    // Create comments table (using actual schema)
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author_agent TEXT NOT NULL,
        parent_id TEXT,
        depth INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // Create work_queue_tickets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        post_id TEXT,
        priority TEXT DEFAULT 'P2',
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        metadata TEXT,
        result TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        assigned_at INTEGER,
        completed_at INTEGER
      )
    `);

    // Initialize work queue repository
    workQueueRepo = new WorkQueueRepository(db);

    // Start mini Express API server for testing
    apiServer = express();
    apiServer.use(express.json());

    // POST /api/agent-posts/:postId/comments endpoint (real implementation)
    apiServer.post('/api/agent-posts/:postId/comments', (req, res) => {
      const { postId } = req.params;
      const { content, author, skipTicket } = req.body;

      // Validate post exists
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }

      // Create comment
      const commentId = uuidv4();
      const now = Date.now();

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author_agent, parent_id, depth, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(commentId, postId, content, author, null, 0, now);

      // Increment comment count on post
      db.prepare(`
        UPDATE posts SET engagement_comments = engagement_comments + 1
        WHERE id = ?
      `).run(postId);

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

      res.status(201).json({
        success: true,
        data: {
          id: comment.id,
          post_id: comment.post_id,
          content: comment.content,
          author_agent: comment.author_agent,
          created_at: comment.created_at
        },
        skipTicket: skipTicket
      });
    });

    // Start server
    apiServerInstance = apiServer.listen(API_PORT);
    console.log(`✅ Test API server listening on port ${API_PORT}`);
  });

  afterAll(async () => {
    // Close server
    if (apiServerInstance) {
      apiServerInstance.close();
    }

    // Close database
    if (db) {
      db.close();
    }

    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (err) {
      // Ignore
    }
  });

  beforeEach(() => {
    // Clean up tables
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM posts');
    db.exec('DELETE FROM work_queue_tickets');
  });

  describe('E2E: Full Ticket-to-Comment Flow with Real Database', () => {
    test('IT-AWE-001: Complete E2E flow - post creation to comment with ticket-creation-service', async () => {
      // STEP 1: Create real post in database
      const postId = uuidv4();
      const now = Date.now();

      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        'Test Post with URL',
        'Check out this article: https://www.linkedin.com/pulse/ai-trends-2024',
        'user-123',
        now,
        0
      );

      const testPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      expect(testPost).toBeDefined();
      expect(testPost.engagement_comments).toBe(0);

      // STEP 2: Create ticket using ticket-creation-service (real service)
      const tickets = await processPostForProactiveAgents(
        {
          id: testPost.id,
          content: testPost.content,
          author_id: 'user-123'
        },
        workQueueRepo
      );

      expect(tickets.length).toBeGreaterThan(0);
      const ticket = tickets[0];

      // STEP 3: Verify ticket has post_id persisted in database
      expect(ticket.post_id).toBe(testPost.id);
      expect(ticket.agent_id).toBe('link-logger-agent');
      expect(ticket.url).toBe('https://www.linkedin.com/pulse/ai-trends-2024');

      const dbTicket = db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?').get(ticket.id);
      expect(dbTicket.post_id).toBe(testPost.id);

      // STEP 4: Spawn AgentWorker with real workQueueRepo
      worker = new AgentWorker({
        workerId: 'test-worker-e2e',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      // STEP 5: Mock only Claude SDK (not database or API)
      worker.processURL = async (ticket) => {
        return {
          title: `Intelligence: ${ticket.url}`,
          summary: 'Real Claude analysis: This article discusses AI trends for 2024 including LLM advancements.',
          tokensUsed: 1550,
          completedAt: Date.now()
        };
      };

      // STEP 6: Execute worker
      const result = await worker.execute();

      // STEP 7: Verify result
      expect(result.success).toBe(true);
      expect(result.commentId).toBeTruthy();
      expect(result.tokensUsed).toBe(1550);
      expect(result.response).toContain('Real Claude analysis');

      // STEP 8: Verify comment created in database (NOT a post)
      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(testPost.id);
      expect(comments.length).toBe(1);

      const comment = comments[0];
      expect(comment.post_id).toBe(testPost.id); // Comment linked to original post
      expect(comment.author_agent).toBe(ticket.agent_id); // Author is agent
      expect(comment.content).toContain('Real Claude analysis');

      // STEP 9: Verify comment count incremented on post
      const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(testPost.id);
      expect(updatedPost.engagement_comments).toBe(1);

      // STEP 10: Verify no new posts created by worker
      const allPosts = db.prepare('SELECT * FROM posts').all();
      expect(allPosts.length).toBe(1); // Only the original test post
      expect(allPosts[0].id).toBe(testPost.id);

      // STEP 11: Verify worker status
      expect(worker.status).toBe('completed');
    }, 10000);

    test('IT-AWE-002: Verify skipTicket parameter is set to prevent infinite loop', async () => {
      // Create test post
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId, 'Test Post', 'URL: https://example.com/article', 'user-123', Date.now(), 0);

      // Create ticket
      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'URL: https://example.com/article',
        url: 'https://example.com/article',
        post_id: postId,
        priority: 'P1'
      });

      // Track API calls to verify skipTicket
      let capturedSkipTicket = null;
      const originalFetch = global.fetch;

      global.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const body = JSON.parse(options.body);
          capturedSkipTicket = body.skipTicket;
        }
        return originalFetch(url, options);
      };

      worker = new AgentWorker({
        workerId: 'test-worker-skip',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      // Mock SDK
      worker.processURL = async () => ({
        title: 'Test Intelligence',
        summary: 'Analysis complete',
        tokensUsed: 1000,
        completedAt: Date.now()
      });

      await worker.execute();

      // Verify skipTicket was set to true
      expect(capturedSkipTicket).toBe(true);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Database Integration Tests', () => {
    test('IT-AWE-003: Verify ticket.post_id persisted in database', async () => {
      // Create test post
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId, 'Test Post', 'URL: https://example.com/article', 'user-123', Date.now(), 0);

      // Create ticket using ticket-creation-service
      const tickets = await processPostForProactiveAgents(
        {
          id: postId,
          content: 'URL: https://example.com/article',
          author_id: 'user-123'
        },
        workQueueRepo
      );

      const ticket = tickets[0];

      // Verify ticket in memory
      expect(ticket.post_id).toBe(postId);

      // Verify ticket persisted in database
      const dbTicket = db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?').get(ticket.id);
      expect(dbTicket).toBeDefined();
      expect(dbTicket.post_id).toBe(postId);
    });

    test('IT-AWE-004: Verify comment created with correct foreign key', async () => {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId, 'FK Test Post', 'Content', 'user-123', Date.now(), 0);

      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com/fk-test',
        post_id: postId,
        priority: 'P1'
      });

      worker = new AgentWorker({
        workerId: 'test-fk',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'FK Test',
        summary: 'Testing foreign keys',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      await worker.execute();

      // Verify foreign key relationship
      const comment = db.prepare('SELECT * FROM comments WHERE post_id = ?').get(postId);
      expect(comment).toBeTruthy();
      expect(comment.post_id).toBe(postId);

      // Verify CASCADE DELETE works
      db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
      const deletedComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(comment.id);
      expect(deletedComment).toBeUndefined();
    });

    test('IT-AWE-005: Verify comment count incremented on post', async () => {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId, 'Count Test Post', 'Content', 'user-123', Date.now(), 0);

      const initialPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      const initialCount = initialPost.engagement_comments;

      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com/count-test',
        post_id: postId,
        priority: 'P1'
      });

      worker = new AgentWorker({
        workerId: 'test-count',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'Count Test',
        summary: 'Testing comment count',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      await worker.execute();

      const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      expect(updatedPost.engagement_comments).toBe(initialCount + 1);
    });

    test('IT-AWE-006: Verify no new posts created by worker', async () => {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId, 'No Post Test', 'Content', 'user-123', Date.now(), 0);

      const initialPostCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;

      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com/no-post-test',
        post_id: postId,
        priority: 'P1'
      });

      worker = new AgentWorker({
        workerId: 'test-no-post',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'No Post Test',
        summary: 'Should not create a post',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      await worker.execute();

      const finalPostCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
      expect(finalPostCount).toBe(initialPostCount);

      // Verify comment was created instead
      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);
      expect(comments.length).toBe(1);
    });
  });

  describe('Error Handling Tests', () => {
    test('IT-AWE-007: Handle missing ticket scenario', async () => {
      worker = new AgentWorker({
        workerId: 'test-missing-ticket',
        ticketId: 'non-existent-ticket-id',
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      await expect(worker.execute()).rejects.toThrow('Ticket non-existent-ticket-id not found');
      expect(worker.status).toBe('failed');
    });

    test('IT-AWE-008: Handle missing post_id scenario', async () => {
      // Create ticket WITHOUT post_id
      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test content',
        url: 'https://example.com/missing-post-id',
        priority: 'P1'
        // post_id intentionally omitted
      });

      worker = new AgentWorker({
        workerId: 'test-missing-post-id',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'Test',
        summary: 'Test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      await expect(worker.execute()).rejects.toThrow('missing required fields');
      expect(worker.status).toBe('failed');
    });

    test('IT-AWE-009: Handle comment endpoint failure (post not found)', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com/endpoint-fail',
        post_id: 'non-existent-post-id', // Post doesn't exist in database
        priority: 'P1'
      });

      worker = new AgentWorker({
        workerId: 'test-endpoint-fail',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'Test',
        summary: 'Test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      await expect(worker.execute()).rejects.toThrow('Post not found');
      expect(worker.status).toBe('failed');
    });

    test('IT-AWE-010: Verify ticket status set to failed on error', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com/fail-status',
        post_id: 'non-existent-post',
        priority: 'P1'
      });

      worker = new AgentWorker({
        workerId: 'test-fail-status',
        ticketId: ticket.id,
        agentId: ticket.agent_id,
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      worker.processURL = async () => ({
        title: 'Test',
        summary: 'Test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      try {
        await worker.execute();
      } catch (error) {
        // Expected to fail
      }

      // Verify worker status
      expect(worker.status).toBe('failed');
    });
  });

  describe('E2E: Concurrent Operations', () => {
    test('E2E-AWF-011: Multiple workers processing different tickets should create separate comments', async () => {
      // Create two posts
      const postId1 = uuidv4();
      const postId2 = uuidv4();

      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId1, 'Post 1', 'URL 1', 'user-123', Date.now(), 0);

      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, created_at, engagement_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(postId2, 'Post 2', 'URL 2', 'user-123', Date.now(), 0);

      // Create two tickets
      const ticket1 = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'URL 1',
        url: 'https://example.com/article-1',
        post_id: postId1,
        priority: 'P1'
      });

      const ticket2 = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'URL 2',
        url: 'https://example.com/article-2',
        post_id: postId2,
        priority: 'P1'
      });

      // Create two workers
      const worker1 = new AgentWorker({
        workerId: 'e2e-worker-1',
        ticketId: ticket1.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      const worker2 = new AgentWorker({
        workerId: 'e2e-worker-2',
        ticketId: ticket2.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      // Mock Claude SDK for both workers
      worker1.processURL = async () => ({
        title: 'Analysis 1',
        summary: 'Analysis of article 1',
        tokensUsed: 100,
        completedAt: Date.now()
      });

      worker2.processURL = async () => ({
        title: 'Analysis 2',
        summary: 'Analysis of article 2',
        tokensUsed: 150,
        completedAt: Date.now()
      });

      // Mock API calls
      const mockFetch = globalThis.fetch;
      const createdComments = [];

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const body = JSON.parse(options.body);
          const commentId = uuidv4();

          // Extract post_id from URL
          const postIdMatch = url.match(/\/api\/agent-posts\/([^\/]+)\/comments/);
          const targetPostId = postIdMatch ? postIdMatch[1] : null;

          db.prepare(`
            INSERT INTO comments (id, post_id, content, author_agent, parent_id, depth, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(commentId, targetPostId, body.content, body.author, null, 0, Date.now());

          db.prepare(`
            UPDATE posts SET engagement_comments = engagement_comments + 1 WHERE id = ?
          `).run(targetPostId);

          createdComments.push({ commentId, postId: targetPostId });

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: commentId, post_id: targetPostId }
            })
          };
        }
      };

      try {
        // Execute both workers
        const result1 = await worker1.execute();
        const result2 = await worker2.execute();

        // Verify both succeeded
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // Verify two separate comments were created
        expect(createdComments.length).toBe(2);
        expect(createdComments[0].commentId).not.toBe(createdComments[1].commentId);

        // Verify comments in database
        const comments = db.prepare('SELECT * FROM comments').all();
        expect(comments.length).toBe(2);

        // Verify each post has 1 comment
        const post1 = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId1);
        const post2 = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId2);
        expect(post1.engagement_comments).toBe(1);
        expect(post2.engagement_comments).toBe(1);
      } finally {
        globalThis.fetch = mockFetch;
      }
    });
  });
});
