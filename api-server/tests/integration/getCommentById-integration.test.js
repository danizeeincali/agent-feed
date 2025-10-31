/**
 * Integration Test for getCommentById()
 * Tests with real database and conversation chain functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import dbSelector from '../../config/database-selector.js';

describe('getCommentById() Integration Tests', () => {
  let testDb;
  const testPostId = 'test-post-integration-123';
  const testCommentIds = [];

  beforeAll(async () => {
    // Use the actual database
    await dbSelector.initialize();

    // Get reference to SQLite database
    const connections = dbSelector.getRawConnections();
    testDb = connections.db;

    // Clean up any existing test data
    testDb.prepare('DELETE FROM comments WHERE post_id = ?').run(testPostId);
    testDb.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);

    // Create test post
    testDb.prepare(`
      INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      testPostId,
      'test-agent',
      'Test post for integration',
      'Integration Test Post',
      new Date().toISOString(),
      JSON.stringify({ tags: [] }),
      JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
    );

    // Create threaded comments for testing
    const comments = [
      { id: 'integration-comment-1', parent_id: null, content: 'Root comment', created_at: '2025-01-01T10:00:00Z' },
      { id: 'integration-comment-2', parent_id: 'integration-comment-1', content: 'Reply to root', created_at: '2025-01-01T11:00:00Z' },
      { id: 'integration-comment-3', parent_id: 'integration-comment-2', content: 'Reply to reply', created_at: '2025-01-01T12:00:00Z' },
    ];

    const insertComment = testDb.prepare(`
      INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    comments.forEach(comment => {
      insertComment.run(
        comment.id,
        testPostId,
        comment.content,
        'test-user',
        'test-agent',
        comment.parent_id,
        comment.created_at
      );
      testCommentIds.push(comment.id);
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testDb) {
      testDb.prepare('DELETE FROM comments WHERE post_id = ?').run(testPostId);
      testDb.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
    }
    await dbSelector.close();
  });

  describe('Basic Retrieval', () => {
    it('should retrieve root comment', async () => {
      const comment = await dbSelector.getCommentById('integration-comment-1');

      expect(comment).not.toBeNull();
      expect(comment.id).toBe('integration-comment-1');
      expect(comment.content).toBe('Root comment');
      expect(comment.parent_id).toBeNull();
      expect(comment.post_id).toBe(testPostId);
    });

    it('should retrieve nested comment with parent', async () => {
      const comment = await dbSelector.getCommentById('integration-comment-2');

      expect(comment).not.toBeNull();
      expect(comment.id).toBe('integration-comment-2');
      expect(comment.content).toBe('Reply to root');
      expect(comment.parent_id).toBe('integration-comment-1');
    });

    it('should retrieve deeply nested comment', async () => {
      const comment = await dbSelector.getCommentById('integration-comment-3');

      expect(comment).not.toBeNull();
      expect(comment.id).toBe('integration-comment-3');
      expect(comment.content).toBe('Reply to reply');
      expect(comment.parent_id).toBe('integration-comment-2');
    });
  });

  describe('Conversation Chain Walking', () => {
    it('should walk up parent chain from leaf to root', async () => {
      const chain = [];
      let currentId = 'integration-comment-3';

      while (currentId) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        chain.unshift(comment); // Add to front for chronological order
        currentId = comment.parent_id;
      }

      expect(chain).toHaveLength(3);
      expect(chain[0].id).toBe('integration-comment-1'); // Root
      expect(chain[1].id).toBe('integration-comment-2'); // Middle
      expect(chain[2].id).toBe('integration-comment-3'); // Leaf
    });

    it('should build conversation context correctly', async () => {
      const comment3 = await dbSelector.getCommentById('integration-comment-3');
      expect(comment3).not.toBeNull();

      const comment2 = await dbSelector.getCommentById(comment3.parent_id);
      expect(comment2).not.toBeNull();
      expect(comment2.id).toBe('integration-comment-2');

      const comment1 = await dbSelector.getCommentById(comment2.parent_id);
      expect(comment1).not.toBeNull();
      expect(comment1.id).toBe('integration-comment-1');
      expect(comment1.parent_id).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return null for non-existent comment', async () => {
      const comment = await dbSelector.getCommentById('nonexistent-comment-id');
      expect(comment).toBeNull();
    });

    it('should handle empty string gracefully', async () => {
      const comment = await dbSelector.getCommentById('');
      expect(comment).toBeNull();
    });

    it('should handle null gracefully', async () => {
      const comment = await dbSelector.getCommentById(null);
      expect(comment).toBeNull();
    });
  });

  describe('Data Completeness', () => {
    it('should return all required fields', async () => {
      const comment = await dbSelector.getCommentById('integration-comment-1');

      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('post_id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('author_agent');
      expect(comment).toHaveProperty('parent_id');
      expect(comment).toHaveProperty('created_at');
    });

    it('should preserve timestamps', async () => {
      const comment1 = await dbSelector.getCommentById('integration-comment-1');
      const comment2 = await dbSelector.getCommentById('integration-comment-2');

      expect(comment1.created_at).toBe('2025-01-01T10:00:00Z');
      expect(comment2.created_at).toBe('2025-01-01T11:00:00Z');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should support Avi conversation memory use case', async () => {
      // Simulate Avi receiving a ticket for a comment
      const ticketCommentId = 'integration-comment-3';

      // Avi needs to fetch the comment
      const comment = await dbSelector.getCommentById(ticketCommentId);
      expect(comment).not.toBeNull();

      // Avi needs to walk up the parent chain
      const conversationChain = [];
      let currentId = ticketCommentId;
      const maxDepth = 10;
      let depth = 0;

      while (currentId && depth < maxDepth) {
        const c = await dbSelector.getCommentById(currentId);
        if (!c) break;

        conversationChain.unshift(c); // Oldest first
        currentId = c.parent_id;
        depth++;
      }

      // Verify Avi has full context
      expect(conversationChain.length).toBeGreaterThan(0);
      expect(conversationChain[0].content).toBe('Root comment');
      expect(conversationChain[conversationChain.length - 1].id).toBe(ticketCommentId);
    });
  });
});
