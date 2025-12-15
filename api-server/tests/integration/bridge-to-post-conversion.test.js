/**
 * Integration Tests: Hemingway Bridge to Post Conversion
 * Tests that bridges create agent posts when activated
 *
 * NO MOCKS - Uses real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../services/engagement/hemingway-bridge-service.js';

const TEST_DB = '/workspaces/agent-feed/database.db';

describe('Bridge to Post Conversion Integration Tests', () => {
  let db;
  let bridgeService;
  const TEST_USER_ID = 'test-user-bridge-conversion';

  beforeAll(() => {
    db = new Database(TEST_DB);
    bridgeService = createHemingwayBridgeService(db);

    // Create test user to satisfy foreign key constraint
    try {
      db.prepare(`
        INSERT OR IGNORE INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `).run(TEST_USER_ID, 'Test Bridge User');
    } catch (error) {
      console.log('Test user setup:', error.message);
    }
  });

  afterAll(() => {
    // Cleanup test data
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM agent_posts WHERE id LIKE ?').run('test-post-%');
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(TEST_USER_ID);
    db.close();
  });

  beforeEach(() => {
    // Clean before each test
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM agent_posts WHERE id LIKE ?').run('test-post-%');
  });

  describe('createBridgePost() - Basic Functionality', () => {
    it('should create agent post from bridge data', async () => {
      // Create test bridge
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Test Bridge Content - New Feature Announcement',
        priority: 3,
        agentId: 'test-agent',
        action: 'introduce_agent'
      });

      // Create post from bridge
      const post = await bridgeService.createBridgePost(bridge);

      // Verify post created
      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.content).toBe('Test Bridge Content - New Feature Announcement');
      expect(post.authorAgent).toBe('test-agent');

      // Verify metadata
      const metadata = JSON.parse(post.metadata);
      expect(metadata.isBridge).toBe(true);
      expect(metadata.bridgeId).toBe(bridge.id);
      expect(metadata.bridgeType).toBe('new_feature');
      expect(metadata.bridgePriority).toBe(3);
      expect(metadata.bridgeAction).toBe('introduce_agent');

      // Verify bridge updated with post_id
      const updatedBridge = db.prepare('SELECT post_id FROM hemingway_bridges WHERE id = ?').get(bridge.id);
      expect(updatedBridge.post_id).toBe(post.id);
    });

    it('should create post in agent_posts table', async () => {
      // Create bridge
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'What would you like to do today?',
        priority: 4,
        agentId: 'system'
      });

      const post = await bridgeService.createBridgePost(bridge);

      // Query database directly
      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(post.id);

      expect(dbPost).toBeDefined();
      expect(dbPost.content).toBe('What would you like to do today?');
      expect(dbPost.authorAgent).toBe('system');
      expect(dbPost.title).toBeDefined();
      expect(dbPost.publishedAt).toBeDefined();
      expect(dbPost.engagement).toBeDefined();
    });

    it('should use system agent when no agentId provided', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Did you know that...?',
        priority: 5
        // No agentId provided
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.authorAgent).toBe('system');
    });

    it('should extract title from content first line', async () => {
      const multiLineContent = `First Line Title\nSecond line of content\nThird line`;

      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: multiLineContent,
        priority: 3,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title).toBe('First Line Title');
    });

    it('should truncate long titles to 100 characters', async () => {
      const longContent = 'A'.repeat(150) + '\nRest of content';

      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: longContent,
        priority: 4,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.title.length).toBeLessThanOrEqual(100);
    });
  });

  describe('createBridgePost() - Multiple Bridge Types', () => {
    const bridgeTypes = [
      { type: 'continue_thread', priority: 1, content: 'Continue thread bridge content' },
      { type: 'next_step', priority: 2, content: 'Next step bridge content' },
      { type: 'new_feature', priority: 3, content: 'New feature bridge content' },
      { type: 'question', priority: 4, content: 'Question bridge content' },
      { type: 'insight', priority: 5, content: 'Insight bridge content' }
    ];

    it('should handle all bridge types correctly', async () => {
      for (const bridgeData of bridgeTypes) {
        const bridge = await bridgeService.createBridge({
          userId: TEST_USER_ID,
          type: bridgeData.type,
          content: bridgeData.content,
          priority: bridgeData.priority,
          agentId: 'test-agent'
        });

        const post = await bridgeService.createBridgePost(bridge);
        const metadata = JSON.parse(post.metadata);

        expect(metadata.bridgeType).toBe(bridgeData.type);
        expect(metadata.bridgePriority).toBe(bridgeData.priority);
        expect(post.content).toBe(bridgeData.content);
      }
    });
  });

  describe('Bridge Post Metadata', () => {
    it('should include all required bridge metadata in post', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Metadata test content',
        priority: 2,
        agentId: 'feature-agent',
        action: 'trigger_feature'
      });

      const post = await bridgeService.createBridgePost(bridge);
      const metadata = JSON.parse(post.metadata);

      // Verify all metadata fields
      expect(metadata.isBridge).toBe(true);
      expect(metadata.bridgeId).toBe(bridge.id);
      expect(metadata.bridgeType).toBe('new_feature');
      expect(metadata.bridgePriority).toBe(2);
      expect(metadata.bridgeAction).toBe('trigger_feature');
    });

    it('should handle null action in metadata', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Question without action',
        priority: 4,
        agentId: 'test-agent'
        // No action provided
      });

      const post = await bridgeService.createBridgePost(bridge);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.bridgeAction).toBeNull();
    });

    it('should create valid engagement JSON', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Engagement test',
        priority: 5,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);
      const engagement = JSON.parse(post.engagement);

      expect(engagement).toBeDefined();
      expect(engagement.comments).toBe(0);
      expect(engagement.likes).toBe(0);
      expect(engagement.shares).toBe(0);
    });
  });

  describe('Database Relationships', () => {
    it('should correctly link bridge.post_id to agent_posts.id', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Relationship test content',
        priority: 4,
        agentId: 'system'
      });

      const post = await bridgeService.createBridgePost(bridge);

      // Verify foreign key relationship
      const result = db.prepare(`
        SELECT b.id as bridge_id, b.post_id, p.id as post_id_check
        FROM hemingway_bridges b
        JOIN agent_posts p ON b.post_id = p.id
        WHERE b.id = ?
      `).get(bridge.id);

      expect(result).toBeDefined();
      expect(result.post_id).toBe(result.post_id_check);
      expect(result.post_id).toBe(post.id);
    });

    it('should update bridge with post_id after creation', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: 'Post ID update test',
        priority: 3,
        agentId: 'test-agent'
      });

      // Before creating post
      expect(bridge.post_id).toBeNull();

      const post = await bridgeService.createBridgePost(bridge);

      // After creating post - fetch updated bridge
      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      expect(updatedBridge.post_id).toBe(post.id);
    });

    it('should query posts by bridge metadata', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Query test content',
        priority: 4,
        agentId: 'test-agent'
      });

      await bridgeService.createBridgePost(bridge);

      // Query posts that are bridges
      const bridgePosts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE json_extract(metadata, '$.isBridge') = 1
        AND json_extract(metadata, '$.bridgeId') = ?
      `).all(bridge.id);

      expect(bridgePosts.length).toBe(1);
      expect(bridgePosts[0].content).toBe('Query test content');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when bridge is null', async () => {
      await expect(
        bridgeService.createBridgePost(null)
      ).rejects.toThrow('Bridge object is required');
    });

    it('should throw error when bridge is undefined', async () => {
      await expect(
        bridgeService.createBridgePost(undefined)
      ).rejects.toThrow('Bridge object is required');
    });

    it('should skip post creation if bridge already has post_id', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Duplicate test',
        priority: 4,
        agentId: 'test-agent'
      });

      // Create post first time
      const firstPost = await bridgeService.createBridgePost(bridge);
      expect(firstPost.id).toBeDefined();

      // Attempt to create again
      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      const secondAttempt = await bridgeService.createBridgePost(updatedBridge);

      expect(secondAttempt.alreadyExists).toBe(true);
      expect(secondAttempt.id).toBe(firstPost.id);
    });
  });

  describe('Post Content Validation', () => {
    it('should preserve multiline content', async () => {
      const multilineContent = `Line 1
Line 2
Line 3

Line 5 after blank line`;

      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: multilineContent,
        priority: 5,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(multilineContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = `Special chars: @#$%^&*()
Emojis: 🚀 ✅ 🔥
Quotes: "test" and 'test'`;

      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: specialContent,
        priority: 4,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(specialContent);
    });

    it('should handle empty lines in content', async () => {
      const contentWithBlanks = `First line

Third line (after blank)`;

      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'new_feature',
        content: contentWithBlanks,
        priority: 3,
        agentId: 'test-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post.content).toBe(contentWithBlanks);
    });
  });

  describe('Timestamp Validation', () => {
    it('should set publishedAt timestamp', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'question',
        content: 'Timestamp test',
        priority: 4,
        agentId: 'test-agent'
      });

      const beforeTime = new Date();
      const post = await bridgeService.createBridgePost(bridge);
      const afterTime = new Date();

      const dbPost = db.prepare('SELECT publishedAt FROM agent_posts WHERE id = ?').get(post.id);
      const publishedAt = new Date(dbPost.publishedAt);

      expect(publishedAt).toBeInstanceOf(Date);
      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(publishedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });

    it('should set created_at timestamp in database', async () => {
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'insight',
        content: 'Created at test',
        priority: 5,
        agentId: 'test-agent'
      });

      await bridgeService.createBridgePost(bridge);

      const dbPost = db.prepare('SELECT created_at FROM agent_posts WHERE id = (SELECT post_id FROM hemingway_bridges WHERE id = ?)').get(bridge.id);

      expect(dbPost.created_at).toBeDefined();
      expect(dbPost.created_at).not.toBeNull();
    });
  });

  describe('Integration with Bridge Workflow', () => {
    it('should create post for newly created bridge', async () => {
      // Simulate full workflow: create bridge -> create post
      const bridge = await bridgeService.createBridge({
        userId: TEST_USER_ID,
        type: 'continue_thread',
        content: 'Workflow test - continue your conversation',
        priority: 1,
        agentId: 'workflow-agent'
      });

      const post = await bridgeService.createBridgePost(bridge);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();

      // Verify the connection
      const updatedBridge = bridgeService.getBridgeById(bridge.id);
      expect(updatedBridge.post_id).toBe(post.id);

      // Verify post exists
      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(post.id);
      expect(dbPost).toBeDefined();
      expect(dbPost.content).toBe('Workflow test - continue your conversation');
    });

    it('should support multiple bridges creating multiple posts', async () => {
      const bridges = [];
      const posts = [];

      // Create 3 different bridges
      for (let i = 1; i <= 3; i++) {
        const bridge = await bridgeService.createBridge({
          userId: TEST_USER_ID,
          type: 'question',
          content: `Question ${i} for user`,
          priority: 4,
          agentId: `agent-${i}`
        });
        bridges.push(bridge);

        const post = await bridgeService.createBridgePost(bridge);
        posts.push(post);
      }

      // Verify all posts created
      expect(posts.length).toBe(3);

      // Verify each bridge links to correct post
      for (let i = 0; i < 3; i++) {
        const updatedBridge = bridgeService.getBridgeById(bridges[i].id);
        expect(updatedBridge.post_id).toBe(posts[i].id);
      }
    });

    it('should maintain bridge priority in post metadata', async () => {
      const priorityLevels = [1, 2, 3, 4, 5];

      for (const priority of priorityLevels) {
        const bridge = await bridgeService.createBridge({
          userId: TEST_USER_ID,
          type: 'question',
          content: `Priority ${priority} bridge`,
          priority,
          agentId: 'test-agent'
        });

        const post = await bridgeService.createBridgePost(bridge);
        const metadata = JSON.parse(post.metadata);

        expect(metadata.bridgePriority).toBe(priority);
      }
    });
  });

  describe('Agent Assignment', () => {
    it('should assign correct agent to post from bridge', async () => {
      const testAgents = ['agent-1', 'agent-2', 'system', 'avi', 'feature-bot'];

      for (const agentId of testAgents) {
        const bridge = await bridgeService.createBridge({
          userId: TEST_USER_ID,
          type: 'new_feature',
          content: `Post from ${agentId}`,
          priority: 3,
          agentId
        });

        const post = await bridgeService.createBridgePost(bridge);

        expect(post.authorAgent).toBe(agentId);
      }
    });
  });
});
