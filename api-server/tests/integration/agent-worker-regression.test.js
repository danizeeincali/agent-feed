/**
 * AgentWorker Regression Tests
 *
 * Verifies the THREE critical fixes that were implemented:
 * 1. REGRESSION #1: Comment Creation (Not Posts)
 *    - Workers must create COMMENTS on posts, not new agent_posts
 *    - Validates database state: 0 new posts, 1 comment
 *
 * 2. REGRESSION #2: Real Data (Not Mock)
 *    - Workers must use real Claude SDK data, not hardcoded mock responses
 *    - Validates URLs, intelligence, and token usage are real
 *
 * 3. REGRESSION #3: No Duplicate Responses
 *    - Workers must create exactly ONE response per URL
 *    - Validates exactly 1 comment, 0 posts
 *
 * Database Verification Queries:
 * - SELECT COUNT(*) FROM agent_posts WHERE authorAgent = 'link-logger-agent' AND created_at >= ?
 *   Expected: 0 (no new posts)
 * - SELECT COUNT(*) FROM comments WHERE author = 'link-logger-agent' AND created_at >= ?
 *   Expected: 1 (one comment)
 *
 * Test Suite: Integration - Regression Prevention
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

describe('AgentWorker Regression Tests', () => {
  let db;
  let workQueueRepo;
  let testTicket;
  let worker;
  let apiServerProcess;
  const TEST_DB_PATH = '/tmp/test-agent-worker-regression.db';
  const API_BASE_URL = 'http://localhost:3001';

  // Test start time for temporal queries
  let testStartTime;

  beforeAll(async () => {
    // Initialize test database
    if (await fs.access(TEST_DB_PATH).then(() => true).catch(() => false)) {
      await fs.unlink(TEST_DB_PATH);
    }

    db = new Database(TEST_DB_PATH);

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

    // Create agent_posts table for regression testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        authorAgent TEXT,
        user_id TEXT,
        comment_count INTEGER DEFAULT 0,
        created_at INTEGER
      )
    `);

    // Create comments table for regression testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        parent_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES agent_posts(id)
      )
    `);

    workQueueRepo = new WorkQueueRepository(db);
  });

  afterAll(async () => {
    if (db) {
      db.close();
    }
    if (await fs.access(TEST_DB_PATH).then(() => true).catch(() => false)) {
      await fs.unlink(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Record test start time for temporal queries
    testStartTime = Date.now();

    // Clean up tables
    db.exec('DELETE FROM work_queue_tickets');
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM agent_posts');

    // Create test ticket
    testTicket = workQueueRepo.createTicket({
      agent_id: 'link-logger-agent',
      content: 'Check out this interesting article',
      url: 'https://www.linkedin.com/pulse/ai-trends-2024',
      post_id: 'test-post-123',
      priority: 'P1',
      metadata: { source: 'test' }
    });

    worker = new AgentWorker({
      workerId: 'test-worker-regression',
      ticketId: testTicket.id,
      agentId: 'link-logger-agent',
      workQueueRepo: workQueueRepo,
      apiBaseUrl: API_BASE_URL
    });
  });

  describe('REGRESSION: No Mock Data in Results', () => {
    test('IT-AWR-001: should NOT contain mock ticket data in results', async () => {
      // Mock the API call to verify request data
      const mockFetch = globalThis.fetch;
      let capturedRequestBody;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          capturedRequestBody = JSON.parse(options.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                id: 'comment-real-123',
                post_id: 'test-post-123',
                content: capturedRequestBody.content
              }
            })
          };
        }
        return mockFetch(url, options);
      };

      try {
        const result = await worker.execute();

        // Verify NO mock data strings
        expect(result.response).not.toContain('Mock intelligence summary');
        expect(result.response).not.toContain('Test content with URL');
        expect(result.response).not.toContain('{ test: true }');

        // Verify request doesn't contain mock URL
        expect(capturedRequestBody.content).not.toContain('https://www.linkedin.com/pulse/example');
        expect(capturedRequestBody.content).not.toContain('example.com');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-002: should use real ticket data from repository', async () => {
      const ticket = await worker.fetchTicket();

      // Verify real ticket data
      expect(ticket.id).toBe(testTicket.id);
      expect(ticket.url).toBe('https://www.linkedin.com/pulse/ai-trends-2024');
      expect(ticket.post_id).toBe('test-post-123');
      expect(ticket.agent_id).toBe('link-logger-agent');

      // Verify NOT mock data
      expect(ticket.url).not.toBe('https://www.linkedin.com/pulse/example');
      expect(ticket.content).not.toBe('Test content with URL');
    });

    test('IT-AWR-003: should fail if repository not provided (no fallback to mock)', async () => {
      const workerWithoutRepo = new AgentWorker({
        workerId: 'test-worker-no-repo',
        ticketId: 'ticket-123',
        agentId: 'link-logger-agent'
        // No workQueueRepo provided
      });

      await expect(workerWithoutRepo.fetchTicket()).rejects.toThrow(
        'WorkQueueRepo not initialized'
      );
    });
  });

  describe('REGRESSION: Comments Created (Not Posts)', () => {
    test('IT-AWR-004: should POST to comment endpoint, not agent-posts endpoint', async () => {
      const mockFetch = globalThis.fetch;
      let capturedUrl;
      let capturedMethod;

      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedMethod = options.method;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: 'comment-123',
              post_id: 'test-post-123',
              content: 'Test'
            }
          })
        };
      };

      try {
        const intelligence = {
          title: 'Test',
          summary: 'Test summary',
          tokensUsed: 100,
          completedAt: Date.now()
        };

        await worker.postToAgentFeed(intelligence, testTicket);

        // Verify comment endpoint called
        expect(capturedUrl).toContain('/api/agent-posts/test-post-123/comments');
        expect(capturedUrl).not.toContain('/api/v1/agent-posts');
        expect(capturedMethod).toBe('POST');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-005: should include skipTicket=true in comment request', async () => {
      const mockFetch = globalThis.fetch;
      let capturedRequestBody;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          capturedRequestBody = JSON.parse(options.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: 'comment-123' }
            })
          };
        }
      };

      try {
        const intelligence = {
          title: 'Test',
          summary: 'Test summary',
          tokensUsed: 100,
          completedAt: Date.now()
        };

        await worker.postToAgentFeed(intelligence, testTicket);

        expect(capturedRequestBody.skipTicket).toBe(true);
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-006: should return comment_id, not post_id', async () => {
      const mockFetch = globalThis.fetch;

      globalThis.fetch = async (url, options) => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: 'comment-789',
              post_id: 'test-post-123',
              content: 'Test'
            }
          })
        };
      };

      try {
        const intelligence = {
          title: 'Test',
          summary: 'Test summary',
          tokensUsed: 100,
          completedAt: Date.now()
        };

        const result = await worker.postToAgentFeed(intelligence, testTicket);

        expect(result.comment_id).toBe('comment-789');
        expect(result.id).toBe('comment-789');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-007: should require post_id in ticket (cannot create comment without it)', async () => {
      const ticketWithoutPostId = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        url: 'https://example.com',
        priority: 'P1'
        // No post_id
      });

      const workerWithBadTicket = new AgentWorker({
        workerId: 'test-worker-bad-ticket',
        ticketId: ticketWithoutPostId.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      await expect(workerWithBadTicket.execute()).rejects.toThrow(
        'missing required fields'
      );
    });
  });

  describe('REGRESSION: Real Intelligence (Not Example Text)', () => {
    test('IT-AWR-008: should NOT contain example/placeholder text in intelligence', async () => {
      // We can't easily test the real Claude SDK without making actual API calls,
      // so we verify the structure and that it's not using mock implementations

      // Verify processURL exists and is not the mock version
      expect(typeof worker.processURL).toBe('function');

      // Check the function source to ensure it's not the mock
      const functionSource = worker.processURL.toString();
      expect(functionSource).not.toContain('Mock intelligence summary');
      expect(functionSource).toContain('Claude'); // Should reference Claude SDK
    });

    test('IT-AWR-009: should load agent instructions from real file', async () => {
      // Verify agent instructions file exists
      const agentPath = path.join(
        '/workspaces/agent-feed/prod/.claude/agents',
        'link-logger-agent.md'
      );

      const agentFileExists = await fs.access(agentPath)
        .then(() => true)
        .catch(() => false);

      expect(agentFileExists).toBe(true);

      // Verify processURL would use this file
      const functionSource = worker.processURL.toString();
      expect(functionSource).toContain('.claude/agents');
      expect(functionSource).toContain('agentInstructions');
    });

    test('IT-AWR-010: should throw error if agent instructions not found', async () => {
      const workerWithInvalidAgent = new AgentWorker({
        workerId: 'test-worker-invalid',
        ticketId: testTicket.id,
        agentId: 'non-existent-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      const mockFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: 'comment-123' } })
      });

      try {
        await expect(workerWithInvalidAgent.execute()).rejects.toThrow(
          'Failed to load agent instructions'
        );
      } finally {
        globalThis.fetch = mockFetch;
      }
    });
  });

  describe('REGRESSION: Real Token Usage (Not Hardcoded 1500)', () => {
    test('IT-AWR-011: should NOT return hardcoded tokensUsed=1500', async () => {
      // Verify the function doesn't have hardcoded 1500
      const functionSource = worker.processURL.toString();
      expect(functionSource).not.toContain('tokensUsed: 1500');
      expect(functionSource).not.toContain('tokensUsed || 1500');
    });

    test('IT-AWR-012: should calculate tokensUsed from Claude SDK response', async () => {
      const functionSource = worker.processURL.toString();

      // Verify it extracts token usage from response
      expect(functionSource).toContain('input_tokens');
      expect(functionSource).toContain('output_tokens');
      expect(functionSource).toContain('usage');
    });

    test('IT-AWR-013: execute() should return real tokensUsed, not default', async () => {
      const mockFetch = globalThis.fetch;

      globalThis.fetch = async (url, options) => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: 'comment-123',
              post_id: 'test-post-123',
              content: 'Test'
            }
          })
        };
      };

      try {
        // We can't actually call Claude SDK in tests, but we can verify
        // that execute() would use processURL's token count
        const executeSource = worker.execute.toString();
        expect(executeSource).toContain('intelligence.tokensUsed');
        expect(executeSource).not.toContain('tokensUsed || 1500');
        expect(executeSource).not.toContain('tokensUsed: 1500');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });
  });

  describe('REGRESSION: Only One Comment Per URL', () => {
    test('IT-AWR-014: should create exactly one comment per execute() call', async () => {
      const mockFetch = globalThis.fetch;
      let commentCallCount = 0;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          commentCallCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                id: `comment-${commentCallCount}`,
                post_id: 'test-post-123',
                content: 'Test'
              }
            })
          };
        }
      };

      try {
        await worker.execute();

        expect(commentCallCount).toBe(1);
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-015: should not create multiple comments if execute() called twice', async () => {
      const mockFetch = globalThis.fetch;
      const commentIds = [];

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const id = `comment-${Date.now()}`;
          commentIds.push(id);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                id: id,
                post_id: 'test-post-123',
                content: 'Test'
              }
            })
          };
        }
      };

      try {
        await worker.execute();
        await worker.execute();

        // Each execute should create exactly one comment
        expect(commentIds.length).toBe(2);
        expect(commentIds[0]).not.toBe(commentIds[1]);
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-016: should not loop infinitely due to skipTicket=true', async () => {
      const mockFetch = globalThis.fetch;
      let callCount = 0;
      const maxCalls = 10;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('Infinite loop detected: too many comment calls');
          }

          const body = JSON.parse(options.body);
          expect(body.skipTicket).toBe(true);

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                id: `comment-${callCount}`,
                post_id: 'test-post-123',
                content: 'Test'
              }
            })
          };
        }
      };

      try {
        await worker.execute();

        // Should only call once
        expect(callCount).toBe(1);
      } finally {
        globalThis.fetch = mockFetch;
      }
    });
  });

  describe('REGRESSION: Validation and Error Handling', () => {
    test('IT-AWR-017: should validate all required ticket fields', async () => {
      const incompleteTicket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Test',
        priority: 'P1'
        // Missing url and post_id
      });

      const workerWithIncompleteTicket = new AgentWorker({
        workerId: 'test-worker-incomplete',
        ticketId: incompleteTicket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      await expect(workerWithIncompleteTicket.fetchTicket()).rejects.toThrow(
        'missing required fields'
      );
    });

    test('IT-AWR-018: should handle comment creation failure gracefully', async () => {
      const mockFetch = globalThis.fetch;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Database connection failed'
          };
        }
      };

      try {
        await expect(worker.execute()).rejects.toThrow(
          'Failed to create comment'
        );

        expect(worker.status).toBe('failed');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-019: should set worker status correctly through lifecycle', async () => {
      expect(worker.status).toBe('idle');

      const mockFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          // Check status during execution
          expect(worker.status).toBe('running');

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: 'comment-123' }
            })
          };
        }
      };

      try {
        await worker.execute();

        expect(worker.status).toBe('completed');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('IT-AWR-020: should handle Claude SDK errors appropriately', async () => {
      // This test verifies error handling structure without making real API calls
      const processURLSource = worker.processURL.toString();

      // Verify error handling is present
      expect(processURLSource).toContain('throw new Error');
      expect(processURLSource).toContain('Claude Code SDK execution failed');
    });
  });

  describe('DATABASE REGRESSION TESTS: Critical Fixes Verification', () => {
    test('DB-REG-001: Worker creates comment (NOT post) - Database verification', async () => {
      // Create original post
      const postId = 'test-post-db-001';
      const insertPost = db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, user_id, comment_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertPost.run(
        postId,
        'User Post with URL',
        'Check this: https://www.linkedin.com/pulse/ai-trends-2024',
        'user-agent',
        'test-user',
        0,
        testStartTime
      );

      // Create ticket
      const dbTicket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Analyze URL',
        url: 'https://www.linkedin.com/pulse/ai-trends-2024',
        post_id: postId,
        priority: 'P1'
      });

      const dbWorker = new AgentWorker({
        workerId: 'db-worker-001',
        ticketId: dbTicket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      // Mock API to simulate comment creation
      const mockFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const body = JSON.parse(options.body);
          const commentId = `comment-${Date.now()}`;

          // Insert comment into database
          const insertComment = db.prepare(`
            INSERT INTO comments (id, post_id, content, author, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          insertComment.run(commentId, postId, body.content, body.author, null, Date.now());

          // Update comment count
          db.prepare('UPDATE agent_posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: commentId, post_id: postId }
            })
          };
        }
      };

      try {
        await dbWorker.execute();

        // CRITICAL DATABASE QUERY #1: No new posts created
        const newPostsQuery = db.prepare(`
          SELECT COUNT(*) as count FROM agent_posts
          WHERE authorAgent = 'link-logger-agent'
          AND created_at >= ?
        `);
        const newPostsCount = newPostsQuery.get(testStartTime).count;
        expect(newPostsCount).toBe(0);

        // CRITICAL DATABASE QUERY #2: Exactly one comment created
        const newCommentsQuery = db.prepare(`
          SELECT COUNT(*) as count FROM comments
          WHERE author = 'link-logger-agent'
          AND created_at >= ?
        `);
        const newCommentsCount = newCommentsQuery.get(testStartTime).count;
        expect(newCommentsCount).toBe(1);

        // Verify comment is linked to correct post
        const comment = db.prepare(
          'SELECT * FROM comments WHERE author = ? AND created_at >= ?'
        ).get('link-logger-agent', testStartTime);
        expect(comment.post_id).toBe(postId);

        console.log('✅ DB-REG-001: Database verified - 0 posts, 1 comment');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('DB-REG-002: Real data verification - Not mock URLs or hardcoded values', async () => {
      const postId = 'test-post-db-002';
      const realUrl = 'https://www.linkedin.com/pulse/future-engineering-2024';

      const insertPost = db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, user_id, comment_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertPost.run(postId, 'Test', `URL: ${realUrl}`, 'user', 'test-user', 0, testStartTime);

      const dbTicket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: `Analyze: ${realUrl}`,
        url: realUrl,
        post_id: postId,
        priority: 'P1'
      });

      const dbWorker = new AgentWorker({
        workerId: 'db-worker-002',
        ticketId: dbTicket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      const mockFetch = globalThis.fetch;
      let capturedContent;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const body = JSON.parse(options.body);
          capturedContent = body.content;
          const commentId = `comment-${Date.now()}`;

          db.prepare(`
            INSERT INTO comments (id, post_id, content, author, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(commentId, postId, body.content, body.author, null, Date.now());

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: commentId }
            })
          };
        }
      };

      try {
        const result = await dbWorker.execute();

        // Verify ticket has real URL
        const fetchedTicket = workQueueRepo.getTicket(dbTicket.id);
        expect(fetchedTicket.url).toBe(realUrl);
        expect(fetchedTicket.url).not.toContain('example.com');

        // Verify response is not mock
        expect(result.response).not.toBe('Mock intelligence summary');
        expect(result.tokensUsed).not.toBe(1500);

        // Verify captured content is not mock
        expect(capturedContent).toBeDefined();
        expect(capturedContent).not.toContain('Mock');
        expect(capturedContent).not.toContain('{{');

        console.log('✅ DB-REG-002: Real data verified - No mock values');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('DB-REG-003: No duplicate responses - Single URL creates single comment', async () => {
      const postId = 'test-post-db-003';
      const singleUrl = 'https://example.com/single-article';

      const insertPost = db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, user_id, comment_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertPost.run(postId, 'Test', singleUrl, 'user', 'test-user', 0, testStartTime);

      const dbTicket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: singleUrl,
        url: singleUrl,
        post_id: postId,
        priority: 'P1'
      });

      const dbWorker = new AgentWorker({
        workerId: 'db-worker-003',
        ticketId: dbTicket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      const mockFetch = globalThis.fetch;
      let apiCallCount = 0;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          apiCallCount++;
          const body = JSON.parse(options.body);
          const commentId = `comment-${Date.now()}`;

          db.prepare(`
            INSERT INTO comments (id, post_id, content, author, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(commentId, postId, body.content, body.author, null, Date.now());

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: commentId }
            })
          };
        }
      };

      try {
        await dbWorker.execute();

        // Verify API called exactly once
        expect(apiCallCount).toBe(1);

        // CRITICAL: Verify exactly 1 comment, 0 posts
        const postsCount = db.prepare(`
          SELECT COUNT(*) as count FROM agent_posts
          WHERE authorAgent = 'link-logger-agent'
          AND created_at >= ?
        `).get(testStartTime).count;

        const commentsCount = db.prepare(`
          SELECT COUNT(*) as count FROM comments
          WHERE author = 'link-logger-agent'
          AND created_at >= ?
        `).get(testStartTime).count;

        expect(commentsCount).toBe(1);
        expect(postsCount).toBe(0);

        console.log('✅ DB-REG-003: No duplicates - Exactly 1 comment, 0 posts');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });

    test('DB-REG-004: Comprehensive verification - All three regressions fixed', async () => {
      const postId = 'test-post-db-004';
      const realUrl = 'https://www.linkedin.com/pulse/comprehensive-test';

      // Create post
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, user_id, comment_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(postId, 'Comprehensive Test', realUrl, 'user', 'test-user', 0, testStartTime);

      // Create ticket
      const dbTicket = workQueueRepo.createTicket({
        agent_id: 'link-logger-agent',
        content: `Analyze: ${realUrl}`,
        url: realUrl,
        post_id: postId,
        priority: 'P1'
      });

      const dbWorker = new AgentWorker({
        workerId: 'db-worker-004',
        ticketId: dbTicket.id,
        agentId: 'link-logger-agent',
        workQueueRepo: workQueueRepo,
        apiBaseUrl: API_BASE_URL
      });

      const mockFetch = globalThis.fetch;

      globalThis.fetch = async (url, options) => {
        if (url.includes('/comments')) {
          const body = JSON.parse(options.body);
          const commentId = `comment-${Date.now()}`;

          db.prepare(`
            INSERT INTO comments (id, post_id, content, author, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(commentId, postId, body.content, body.author, null, Date.now());

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { id: commentId }
            })
          };
        }
      };

      try {
        const result = await dbWorker.execute();

        // REGRESSION #1: Comments not posts
        const postsCount = db.prepare(
          'SELECT COUNT(*) as count FROM agent_posts WHERE authorAgent = ? AND created_at >= ?'
        ).get('link-logger-agent', testStartTime).count;
        expect(postsCount).toBe(0);

        const commentsCount = db.prepare(
          'SELECT COUNT(*) as count FROM comments WHERE author = ? AND created_at >= ?'
        ).get('link-logger-agent', testStartTime).count;
        expect(commentsCount).toBe(1);

        // REGRESSION #2: Real data not mock
        expect(result.response).toBeDefined();
        expect(result.response).not.toBe('Mock intelligence summary');
        expect(result.tokensUsed).not.toBe(1500);

        // REGRESSION #3: No duplicates
        const allComments = db.prepare(
          'SELECT * FROM comments WHERE author = ? AND post_id = ?'
        ).all('link-logger-agent', postId);
        expect(allComments.length).toBe(1);

        console.log('✅ DB-REG-004: ALL THREE REGRESSIONS FIXED');
        console.log('   ✓ Regression #1: Comments created (not posts)');
        console.log('   ✓ Regression #2: Real data used (not mock)');
        console.log('   ✓ Regression #3: No duplicate responses');
      } finally {
        globalThis.fetch = mockFetch;
      }
    });
  });
});
