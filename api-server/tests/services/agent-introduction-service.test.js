/**
 * Unit Tests for Agent Introduction Service
 * Tests agent introduction post creation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { AgentIntroductionService } from '../../services/agents/agent-introduction-service.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('AgentIntroductionService - Post Creation', () => {
  let db;
  let service;
  let mockDbSelector;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Create in-memory test database
    db = new Database(':memory:');

    // Create agent_introductions table
    db.exec(`
      CREATE TABLE agent_introductions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        introduced_at INTEGER NOT NULL,
        post_id TEXT,
        interaction_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, agent_id)
      );
    `);

    // Initialize service
    service = new AgentIntroductionService(db);

    // Mock dbSelector.createPost
    mockDbSelector = {
      createPost: vi.fn(async (userId, postData) => {
        return {
          id: `post-${Date.now()}-${Math.random()}`,
          authorAgent: postData.author_agent,
          content: postData.content,
          title: postData.title,
          metadata: JSON.stringify(postData.metadata),
          tags: postData.tags,
          publishedAt: new Date().toISOString()
        };
      })
    };
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('introduceAgent()', () => {
    it('should create agent introduction post in database', async () => {
      const result = await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(result.agentId).toBe('link-logger-agent');
      expect(mockDbSelector.createPost).toHaveBeenCalledTimes(1);
    });

    it('should include correct metadata in post', async () => {
      await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      expect(postData.metadata.isAgentIntroduction).toBe(true);
      expect(postData.metadata.agentId).toBe('link-logger-agent');
      expect(postData.metadata.isAgentResponse).toBe(true);
      expect(postData.metadata.introducedAt).toBeGreaterThan(0);
    });

    it('should mark agent as introduced in database', async () => {
      const result = await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      const isIntroduced = service.isAgentIntroduced(testUserId, 'link-logger-agent');
      expect(isIntroduced).toBe(true);

      // Verify database record
      const record = db.prepare(`
        SELECT * FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `).get(testUserId, 'link-logger-agent');

      expect(record).toBeDefined();
      expect(record.post_id).toBe(result.postId);
    });

    it('should not create duplicate introduction posts', async () => {
      // First introduction
      const result1 = await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );
      expect(result1.success).toBe(true);

      // Second introduction attempt
      const result2 = await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      expect(result2.alreadyIntroduced).toBe(true);
      expect(mockDbSelector.createPost).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should generate correct introduction content', async () => {
      await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      expect(postData.title).toContain('Link Logger');
      expect(postData.content).toContain('Link Logger');
      expect(postData.content).toContain('I can help you with:');
      expect(postData.content).toContain('Examples:');
    });

    it('should include agent capabilities in post content', async () => {
      await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      // Verify capabilities are included
      expect(postData.content).toContain('Save links');
      expect(postData.content).toContain('Categorize URLs');
    });

    it('should handle non-existent agent gracefully', async () => {
      await expect(
        service.introduceAgent(testUserId, 'non-existent-agent', mockDbSelector)
      ).rejects.toThrow('Agent configuration not found');

      expect(mockDbSelector.createPost).not.toHaveBeenCalled();
    });

    it('should set correct author_agent field', async () => {
      await service.introduceAgent(
        testUserId,
        'meeting-prep-agent',
        mockDbSelector
      );

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      expect(postData.author_agent).toBe('meeting-prep-agent');
    });

    it('should include tags in post data', async () => {
      await service.introduceAgent(
        testUserId,
        'link-logger-agent',
        mockDbSelector
      );

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      expect(postData.tags).toContain('AgentIntroduction');
      expect(postData.tags).toContain('Link Logger');
    });
  });

  describe('checkAndIntroduceAgents()', () => {
    it('should introduce link-logger when URL detected', async () => {
      const context = { containsURL: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('link-logger-agent');
      expect(results[0].success).toBe(true);
    });

    it('should introduce meeting-prep when meeting detected', async () => {
      const context = { mentionsMeeting: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('meeting-prep-agent');
      expect(results[0].success).toBe(true);
    });

    it('should introduce multiple agents for multiple triggers', async () => {
      const context = {
        containsURL: true,
        mentionsMeeting: true,
        mentionsTodos: true
      };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(mockDbSelector.createPost).toHaveBeenCalledTimes(3);
    });

    it('should not introduce already introduced agents', async () => {
      // First introduction
      const context1 = { containsURL: true };
      await service.checkAndIntroduceAgents(testUserId, context1, mockDbSelector);

      // Reset mock
      mockDbSelector.createPost.mockClear();

      // Second introduction attempt
      const context2 = { containsURL: true };
      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context2,
        mockDbSelector
      );

      expect(results[0].alreadyIntroduced).toBe(true);
      expect(mockDbSelector.createPost).not.toHaveBeenCalled();
    });

    it('should return empty array when no triggers match', async () => {
      const context = {};

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(0);
      expect(mockDbSelector.createPost).not.toHaveBeenCalled();
    });

    it('should handle hasLink alternative trigger', async () => {
      const context = { hasLink: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('link-logger-agent');
    });

    it('should introduce todos agent when todos detected', async () => {
      const context = { mentionsTodos: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('personal-todos-agent');
    });

    it('should introduce learning-optimizer when learning detected', async () => {
      const context = { mentionsLearning: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('learning-optimizer-agent');
    });

    it('should introduce follow-ups agent when follow-up detected', async () => {
      const context = { mentionsFollowUp: true };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('follow-ups-agent');
    });
  });

  describe('_generateIntroContent()', () => {
    it('should generate well-formatted content', () => {
      const config = {
        displayName: 'Test Agent',
        description: 'A test agent for testing',
        capabilities: ['Test capability 1', 'Test capability 2'],
        examples: ['Example 1', 'Example 2'],
        cta: 'Try me out!'
      };

      const content = service._generateIntroContent(config);

      expect(content).toContain('Test Agent');
      expect(content).toContain('I can help you with:');
      expect(content).toContain('Examples:');
      expect(content).toContain('Try me out!');
    });

    it('should handle config with no capabilities', () => {
      const config = {
        displayName: 'Test Agent',
        description: 'A test agent',
        capabilities: [],
        examples: [],
        cta: ''
      };

      const content = service._generateIntroContent(config);

      expect(content).toContain('Test Agent');
      expect(content).not.toContain('I can help you with:');
    });
  });

  describe('Integration: Post Creation Validation', () => {
    it('should create posts that appear in feed', async () => {
      const createdPosts = [];
      mockDbSelector.createPost = vi.fn(async (userId, postData) => {
        const post = {
          id: `post-${createdPosts.length}`,
          authorAgent: postData.author_agent,
          content: postData.content,
          title: postData.title,
          metadata: JSON.stringify(postData.metadata),
          publishedAt: new Date().toISOString()
        };
        createdPosts.push(post);
        return post;
      });

      await service.introduceAgent(testUserId, 'link-logger-agent', mockDbSelector);

      expect(createdPosts).toHaveLength(1);
      expect(createdPosts[0].authorAgent).toBe('link-logger-agent');
      expect(createdPosts[0].title).toContain('Link Logger');
    });

    it('should preserve post order for multiple introductions', async () => {
      const context = {
        containsURL: true,
        mentionsMeeting: true
      };

      const results = await service.checkAndIntroduceAgents(
        testUserId,
        context,
        mockDbSelector
      );

      expect(results[0].agentId).toBe('link-logger-agent');
      expect(results[1].agentId).toBe('meeting-prep-agent');
    });
  });
});
