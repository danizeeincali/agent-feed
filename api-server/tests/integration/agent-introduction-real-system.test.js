/**
 * Integration Tests for Agent Introduction System
 * Tests agent introduction post creation against REAL database
 * NO MOCKS - Full end-to-end validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { AgentIntroductionService } from '../../services/agents/agent-introduction-service.js';
import DatabaseSelector from '../../config/database-selector.js';
import path from 'path';

describe('Agent Introduction System - Real Database Integration', () => {
  let db;
  let dbSelector;
  let introService;
  const testUserId = 'integration-test-user-' + Date.now();

  beforeAll(async () => {
    // Use real SQLite database
    const dbPath = path.join(process.cwd(), 'database.db');
    db = new Database(dbPath);

    // Initialize database selector
    dbSelector = DatabaseSelector;
    await dbSelector.initialize();

    // Create introduction service
    introService = new AgentIntroductionService(db);

    console.log('✅ Integration test setup complete');
  });

  afterAll(() => {
    // Cleanup test data
    try {
      db.prepare(`DELETE FROM agent_posts WHERE authorAgent LIKE '%test%' OR id LIKE '%${testUserId}%'`).run();
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(testUserId);
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }

    if (db) db.close();
  });

  describe('Real Post Creation', () => {
    it('should create agent introduction post in real database', async () => {
      const result = await introService.introduceAgent(
        testUserId,
        'link-logger-agent',
        dbSelector
      );

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(result.agentId).toBe('link-logger-agent');

      // Verify post exists in database
      const post = await dbSelector.getPostById(result.postId, testUserId);
      expect(post).toBeDefined();
      expect(post.authorAgent).toBe('link-logger-agent');
    });

    it('should create post with correct metadata', async () => {
      const result = await introService.introduceAgent(
        testUserId,
        'meeting-prep-agent',
        dbSelector
      );

      const post = await dbSelector.getPostById(result.postId, testUserId);
      const metadata = typeof post.metadata === 'string'
        ? JSON.parse(post.metadata)
        : post.metadata;

      expect(metadata.isAgentIntroduction).toBe(true);
      expect(metadata.agentId).toBe('meeting-prep-agent');
      expect(metadata.isAgentResponse).toBe(true);
      expect(metadata.introducedAt).toBeGreaterThan(0);
    });

    it('should mark agent as introduced in agent_introductions table', async () => {
      const result = await introService.introduceAgent(
        testUserId,
        'personal-todos-agent',
        dbSelector
      );

      const isIntroduced = introService.isAgentIntroduced(testUserId, 'personal-todos-agent');
      expect(isIntroduced).toBe(true);

      // Query database directly
      const record = db.prepare(`
        SELECT * FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `).get(testUserId, 'personal-todos-agent');

      expect(record).toBeDefined();
      expect(record.post_id).toBe(result.postId);
      expect(record.interaction_count).toBe(0);
    });

    it('should not create duplicate introduction posts', async () => {
      // First introduction
      const result1 = await introService.introduceAgent(
        testUserId,
        'learning-optimizer-agent',
        dbSelector
      );
      expect(result1.success).toBe(true);

      // Get initial post count
      const posts1 = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE authorAgent = 'learning-optimizer-agent'
      `).get();

      // Second introduction attempt
      const result2 = await introService.introduceAgent(
        testUserId,
        'learning-optimizer-agent',
        dbSelector
      );
      expect(result2.alreadyIntroduced).toBe(true);

      // Verify no new post was created
      const posts2 = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE authorAgent = 'learning-optimizer-agent'
      `).get();

      expect(posts2.count).toBe(posts1.count);
    });
  });

  describe('Context-Based Introduction', () => {
    it('should introduce link-logger when URL is detected', async () => {
      const newUserId = 'test-url-trigger-' + Date.now();
      const context = { containsURL: true };

      const results = await introService.checkAndIntroduceAgents(
        newUserId,
        context,
        dbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('link-logger-agent');
      expect(results[0].success).toBe(true);

      // Verify post in database
      const post = await dbSelector.getPostById(results[0].postId, newUserId);
      expect(post).toBeDefined();
      expect(post.authorAgent).toBe('link-logger-agent');

      // Cleanup
      db.prepare(`DELETE FROM agent_posts WHERE id = ?`).run(results[0].postId);
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });

    it('should introduce meeting-prep when meeting is detected', async () => {
      const newUserId = 'test-meeting-trigger-' + Date.now();
      const context = { mentionsMeeting: true };

      const results = await introService.checkAndIntroduceAgents(
        newUserId,
        context,
        dbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('meeting-prep-agent');
      expect(results[0].success).toBe(true);

      // Verify post has correct content
      const post = await dbSelector.getPostById(results[0].postId, newUserId);
      expect(post.content).toContain('Meeting Prep');
      expect(post.content).toContain('I can help you with:');

      // Cleanup
      db.prepare(`DELETE FROM agent_posts WHERE id = ?`).run(results[0].postId);
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });

    it('should introduce multiple agents for multiple triggers', async () => {
      const newUserId = 'test-multi-trigger-' + Date.now();
      const context = {
        containsURL: true,
        mentionsMeeting: true,
        mentionsTodos: true
      };

      const results = await introService.checkAndIntroduceAgents(
        newUserId,
        context,
        dbSelector
      );

      expect(results.length).toBeGreaterThanOrEqual(3);

      // Verify all posts exist
      for (const result of results) {
        if (result.success) {
          const post = await dbSelector.getPostById(result.postId, newUserId);
          expect(post).toBeDefined();
          expect(post.authorAgent).toBe(result.agentId);
        }
      }

      // Cleanup
      db.prepare(`DELETE FROM agent_posts WHERE id IN (SELECT id FROM agent_posts WHERE authorAgent LIKE '%agent')`).run();
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });
  });

  describe('Post Content Validation', () => {
    it('should generate introduction content with capabilities', async () => {
      const newUserId = 'test-content-' + Date.now();

      const result = await introService.introduceAgent(
        newUserId,
        'follow-ups-agent',
        dbSelector
      );

      const post = await dbSelector.getPostById(result.postId, newUserId);

      expect(post.content).toContain('Follow-Up');
      expect(post.content).toContain('I can help you with:');
      expect(post.content).toContain('Examples:');
      expect(post.title).toContain('Follow-Up');

      // Cleanup
      db.prepare(`DELETE FROM agent_posts WHERE id = ?`).run(result.postId);
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });

    it('should include tags in post', async () => {
      const newUserId = 'test-tags-' + Date.now();

      const result = await introService.introduceAgent(
        newUserId,
        'link-logger-agent',
        dbSelector
      );

      const post = await dbSelector.getPostById(result.postId, newUserId);
      const metadata = typeof post.metadata === 'string'
        ? JSON.parse(post.metadata)
        : post.metadata;

      expect(metadata.tags).toBeDefined();
      expect(metadata.tags).toContain('AgentIntroduction');

      // Cleanup
      db.prepare(`DELETE FROM agent_posts WHERE id = ?`).run(result.postId);
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });
  });

  describe('Database Query Validation', () => {
    it('should find agent introduction posts with metadata query', async () => {
      const newUserId = 'test-query-' + Date.now();

      // Create an introduction post
      await introService.introduceAgent(
        newUserId,
        'learning-optimizer-agent',
        dbSelector
      );

      // Query for agent introduction posts
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%isAgentIntroduction%'
      `).all();

      expect(posts.length).toBeGreaterThan(0);

      const testPost = posts.find(p => {
        const metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
        return metadata.agentId === 'learning-optimizer-agent';
      });

      expect(testPost).toBeDefined();

      // Cleanup
      db.prepare(`DELETE FROM agent_introductions WHERE user_id = ?`).run(newUserId);
    });
  });
});
