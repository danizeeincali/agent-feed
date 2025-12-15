/**
 * Unit Tests: Bridge to Post Conversion Logic
 * Tests the createBridgePost function in isolation
 *
 * NO MOCKS - Uses real database with isolated test data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../services/engagement/hemingway-bridge-service.js';

const TEST_DB = '/workspaces/agent-feed/database.db';

describe('createBridgePost() Unit Tests', () => {
  let db;
  let bridgeService;
  const TEST_USER_ID = 'test-user-unit-bridge-post';

  beforeAll(() => {
    db = new Database(TEST_DB);
    bridgeService = createHemingwayBridgeService(db);

    // Create test user to satisfy foreign key constraint
    try {
      db.prepare(`
        INSERT OR IGNORE INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run(TEST_USER_ID, 'Test Unit Bridge User');
    } catch (error) {
      console.log('Test user setup:', error.message);
    }
  });

  afterAll(() => {
    // Cleanup test data
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM agent_posts WHERE authorAgent LIKE ?').run('test-unit-%');
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(TEST_USER_ID);
    db.close();
  });

  beforeEach(() => {
    // Clean before each test
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM agent_posts WHERE authorAgent LIKE ?').run('test-unit-%');
  });

  describe('Input Validation', () => {
    it('should require bridge parameter', async () => {
      await expect(
        bridgeService.createBridgePost()
      ).rejects.toThrow('Bridge object is required');
    });

    it('should reject null bridge', async () => {
      await expect(
        bridgeService.createBridgePost(null)
      ).rejects.toThrow('Bridge object is required');
    });

    it('should reject undefined bridge', async () => {
      await expect(
        bridgeService.createBridgePost(undefined)
      ).rejects.toThrow('Bridge object is required');
    });

    it('should accept valid bridge object', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Valid bridge test',
        priority: 4,
        agentId: 'test-unit-valid',
        createPost: false // Don't auto-create
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should skip post creation if post_id already exists', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Duplicate test',
        priority: 4,
        agentId: 'test-unit-duplicate',
        createPost: false
      });

      // Create post first time
      const firstPost = await bridgeService.createBridgePost(bridge);

      // Get updated bridge
      const updatedBridge = bridgeService.getBridgeById(bridge.id);

      // Try to create again
      const result = await bridgeService.createBridgePost(updatedBridge);

      expect(result.alreadyExists).toBe(true);
      expect(result.id).toBe(firstPost.id);
    });

    it('should not create duplicate posts in database', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'No duplicates test',
        priority: 5,
        agentId: 'test-unit-no-dup',
        createPost: false
      });

      await bridgeService.createBridgePost(bridge);

      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      await bridgeService.createBridgePost(updatedBridge);

      // Count posts created by this agent
      const count = db.prepare(
        'SELECT COUNT(*) as count FROM agent_posts WHERE authorAgent = ?'
      ).get('test-unit-no-dup');

      expect(count.count).toBe(1);
    });
  });

  describe('Post ID Generation', () => {
    it('should generate unique UUID for post ID', async () => {
      const postIds = new Set();

      for (let i = 0; i < 5; i++) {
        const bridge = await bridgeService.createBridge({
          userId: TEST_USER_ID,
          type: 'question',
          content: `Unique ID test ${i}`,
          priority: 4,
          agentId: `test-unit-uuid-${i}`,
          createPost: false
        });

        const post = await bridgeService.createBridgePost(bridge);
        postIds.add(post.id);
      }

      expect(postIds.size).toBe(5); // All IDs should be unique
    });

    it('should use UUID format for post ID', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'UUID format test',
        priority: 4,
        agentId: 'test-unit-uuid-format',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(post.id).toMatch(uuidRegex);
    });
  });

  describe('Title Extraction', () => {
    it('should extract first line as title', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'This is the title\nThis is the body',
        priority: 3,
        agentId: 'test-unit-title-extract',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title).toBe('This is the title');
    });

    it('should use full content if no newline', async () => {
      const singleLine = 'Single line content without newlines';
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: singleLine,
        priority: 4,
        agentId: 'test-unit-single-line',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title).toBe(singleLine);
    });

    it('should truncate title at 100 characters', async () => {
      const longTitle = 'A'.repeat(150);
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: longTitle,
        priority: 5,
        agentId: 'test-unit-long-title',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title.length).toBe(100);
      expect(post.title).toBe('A'.repeat(100));
    });

    it('should handle empty first line', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: '\nActual content on line 2',
        priority: 4,
        agentId: 'test-unit-empty-first',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title).toBe(''); // Empty first line
    });

    it('should handle content with only newlines', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: '\n\n\n',
        priority: 5,
        agentId: 'test-unit-only-newlines',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title).toBe('');
    });
  });

  describe('Agent Assignment', () => {
    it('should use bridge.agent_id as post author', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Agent assignment test',
        priority: 3,
        agentId: 'test-unit-custom-agent',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.authorAgent).toBe('test-unit-custom-agent');
    });

    it('should default to system agent when no agent_id', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Default agent test',
        priority: 4,
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.authorAgent).toBe('system');
    });

    it('should handle null agent_id', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Null agent test',
        priority: 5,
        agentId: null,
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.authorAgent).toBe('system');
    });
  });

  describe('Metadata Construction', () => {
    it('should create metadata with all bridge fields', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Metadata test',
        priority: 3,
        agentId: 'test-unit-metadata',
        action: 'trigger_onboarding',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);
      const metadata = JSON.parse(post.metadata);

      expect(metadata).toMatchObject({
        isBridge: true,
        bridgeId: bridge.id,
        bridgeType: 'new_feature',
        bridgePriority: 3,
        bridgeAction: 'trigger_onboarding'
      });
    });

    it('should handle null action in metadata', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Null action test',
        priority: 4,
        agentId: 'test-unit-null-action',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.bridgeAction).toBeNull();
    });

    it('should produce valid JSON metadata', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'JSON validation test',
        priority: 5,
        agentId: 'test-unit-json',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(() => {
        JSON.parse(post.metadata);
      }).not.toThrow();
    });

    it('should always set isBridge to true', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'continue_thread',
        content: 'isBridge flag test',
        priority: 1,
        agentId: 'test-unit-flag',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.isBridge).toBe(true);
    });
  });

  describe('Engagement Initialization', () => {
    it('should initialize engagement with zeros', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Engagement init test',
        priority: 4,
        agentId: 'test-unit-engagement',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);
      const engagement = JSON.parse(post.engagement);

      expect(engagement).toEqual({
        comments: 0,
        likes: 0,
        shares: 0
      });
    });

    it('should produce valid JSON engagement', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Engagement JSON test',
        priority: 3,
        agentId: 'test-unit-engage-json',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(() => {
        JSON.parse(post.engagement);
      }).not.toThrow();
    });
  });

  describe('Bridge Update', () => {
    it('should update bridge.post_id after post creation', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Bridge update test',
        priority: 4,
        agentId: 'test-unit-update',
        createPost: false
      });

      expect(bridge.post_id).toBeNull();

      const post = await bridgeService.createBridgePost(bridge);

      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      expect(updatedBridge.post_id).toBe(post.id);
    });

    it('should persist post_id in database', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Persist post_id test',
        priority: 5,
        agentId: 'test-unit-persist',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      const dbBridge = db.prepare('SELECT post_id FROM hemingway_bridges WHERE id = ?').get(bridge.id);
      expect(dbBridge.post_id).toBe(post.id);
    });
  });

  describe('Content Preservation', () => {
    it('should preserve exact content from bridge', async () => {
      const content = 'This is the exact content\nWith multiple lines\nAnd special chars: @#$%';
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content,
        priority: 3,
        agentId: 'test-unit-preserve',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(content);
    });

    it('should handle unicode characters', async () => {
      const unicodeContent = 'Unicode test: 你好世界 🚀 🔥 ✅';
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: unicodeContent,
        priority: 4,
        agentId: 'test-unit-unicode',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(unicodeContent);
    });

    it('should handle markdown formatting', async () => {
      const markdown = '# Heading\n\n**Bold** and *italic*\n\n- List item\n- Another item';
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: markdown,
        priority: 5,
        agentId: 'test-unit-markdown',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(markdown);
    });
  });

  describe('Return Value Validation', () => {
    it('should return object with required fields', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Return value test',
        priority: 4,
        agentId: 'test-unit-return',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('authorAgent');
      expect(post).toHaveProperty('metadata');
      expect(post).toHaveProperty('engagement');
      expect(post).toHaveProperty('bridgeId');
    });

    it('should return bridgeId matching input bridge', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Bridge ID return test',
        priority: 3,
        agentId: 'test-unit-bridge-id',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.bridgeId).toBe(bridge.id);
    });
  });

  describe('Database Persistence', () => {
    it('should save post to agent_posts table', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Persistence test',
        priority: 4,
        agentId: 'test-unit-persist-db',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(post.id);

      expect(dbPost).toBeDefined();
      expect(dbPost.content).toBe('Persistence test');
      expect(dbPost.authorAgent).toBe('test-unit-persist-db');
    });

    it('should set created_at timestamp', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Timestamp test',
        priority: 5,
        agentId: 'test-unit-timestamp',
        createPost: false
      });

      await bridgeService.createBridgePost(bridge);

      const dbPost = db.prepare('SELECT created_at FROM agent_posts WHERE authorAgent = ?').get('test-unit-timestamp');

      expect(dbPost.created_at).toBeDefined();
      expect(dbPost.created_at).not.toBeNull();
    });

    it('should set publishedAt as ISO string', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'PublishedAt test',
        priority: 3,
        agentId: 'test-unit-published',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      // Should be valid ISO date string
      const date = new Date(post.publishedAt);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(post.publishedAt);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: longContent,
        priority: 5,
        agentId: 'test-unit-long',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content.length).toBe(10000);
    });

    it('should handle content with only whitespace', async () => {
      const whitespace = '   \n\t\n   ';
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: whitespace,
        priority: 4,
        agentId: 'test-unit-whitespace',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(whitespace);
    });

    it('should handle special SQL characters', async () => {
      const sqlChars = "O'Reilly's book with \"quotes\" and 'apostrophes'";
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: sqlChars,
        priority: 3,
        agentId: 'test-unit-sql',
        createPost: false
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(sqlChars);
    });
  });
});
