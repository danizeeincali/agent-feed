/**
 * Verification Test: Conversation Chain Fix
 * Ensures getCommentById() fixes the "TypeError: dbSelector.getCommentById is not a function" error
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import dbSelector from '../../config/database-selector.js';

describe('Conversation Chain Fix Verification', () => {
  let testDb;
  const testPostId = 'test-conversation-fix';

  beforeAll(async () => {
    await dbSelector.initialize();
    const connections = dbSelector.getRawConnections();
    testDb = connections.db;

    // Clean up
    testDb.prepare('DELETE FROM comments WHERE post_id = ?').run(testPostId);
    testDb.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);

    // Create test post
    testDb.prepare(`
      INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      testPostId,
      'avi',
      'Test post',
      'Test',
      new Date().toISOString(),
      JSON.stringify({ tags: [] }),
      JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
    );

    // Create conversation thread (like the real scenario)
    const comments = [
      { id: 'comment-root', parent_id: null, content: 'Calculate 4949 + 98', author: 'user1', created_at: '2025-01-01T10:00:00Z' },
      { id: 'comment-reply-1', parent_id: 'comment-root', content: '5047', author: 'avi', created_at: '2025-01-01T11:00:00Z' },
      { id: 'comment-reply-2', parent_id: 'comment-reply-1', content: 'Now divide by 2', author: 'user1', created_at: '2025-01-01T12:00:00Z' },
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
        comment.author,
        comment.author,
        comment.parent_id,
        comment.created_at
      );
    });
  });

  afterAll(async () => {
    if (testDb) {
      testDb.prepare('DELETE FROM comments WHERE post_id = ?').run(testPostId);
      testDb.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
    }
    await dbSelector.close();
  });

  describe('Critical Bug Fix Verification', () => {
    it('should NOT throw "TypeError: dbSelector.getCommentById is not a function"', async () => {
      // This was the original error
      expect(dbSelector.getCommentById).toBeDefined();
      expect(typeof dbSelector.getCommentById).toBe('function');
    });

    it('should successfully call getCommentById without errors', async () => {
      let error = null;

      try {
        const comment = await dbSelector.getCommentById('comment-root');
        expect(comment).not.toBeNull();
      } catch (e) {
        error = e;
      }

      expect(error).toBeNull();
    });

    it('should walk conversation chain exactly like agent-worker does', async () => {
      // Simulate the exact code from agent-worker.js line 697-720
      const commentId = 'comment-reply-2'; // User asks Avi to divide
      const conversationChain = [];
      const maxDepth = 10;
      let currentId = commentId;
      let depth = 0;

      // This is the exact loop that was failing
      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);

        if (!comment) {
          console.warn(`⚠️ Comment ${currentId} not found, stopping chain walk`);
          break;
        }

        conversationChain.unshift(comment);
        currentId = comment.parent_id;
        depth++;
      }

      // Verify the chain was built correctly
      expect(conversationChain.length).toBe(3);
      expect(conversationChain[0].content).toBe('Calculate 4949 + 98');
      expect(conversationChain[1].content).toBe('5047');
      expect(conversationChain[2].content).toBe('Now divide by 2');
    });

    it('should provide full conversation context for Avi', async () => {
      // This simulates what Avi needs for memory
      const ticket = {
        id: 'ticket-test',
        post_id: 'comment-reply-2',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      const conversationChain = [];
      let currentId = ticket.post_id;
      const maxDepth = 10;
      let depth = 0;

      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        conversationChain.unshift(comment);
        currentId = comment.parent_id;
        depth++;
      }

      // Verify Avi has the context to understand "divide by 2" refers to "5047"
      expect(conversationChain.length).toBeGreaterThan(1);

      // Build context string like agent-worker would
      const contextString = conversationChain
        .map(c => `${c.author}: ${c.content}`)
        .join('\n');

      expect(contextString).toContain('Calculate 4949 + 98');
      expect(contextString).toContain('5047');
      expect(contextString).toContain('Now divide by 2');
    });
  });

  describe('Regression Prevention', () => {
    it('should handle empty chain (no parents)', async () => {
      const conversationChain = [];
      let currentId = 'comment-root'; // Root has no parent
      const maxDepth = 10;
      let depth = 0;

      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        conversationChain.unshift(comment);
        currentId = comment.parent_id;
        depth++;
      }

      expect(conversationChain.length).toBe(1);
      expect(conversationChain[0].id).toBe('comment-root');
    });

    it('should handle missing comment gracefully', async () => {
      const conversationChain = [];
      let currentId = 'nonexistent-comment';
      const maxDepth = 10;
      let depth = 0;

      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) {
          console.warn(`⚠️ Comment ${currentId} not found`);
          break;
        }

        conversationChain.unshift(comment);
        currentId = comment.parent_id;
        depth++;
      }

      expect(conversationChain.length).toBe(0);
    });

    it('should not infinite loop on circular references', async () => {
      // Insert a circular reference
      testDb.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, parent_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('comment-circular', testPostId, 'Circular', 'user', 'user', 'comment-circular');

      const conversationChain = [];
      let currentId = 'comment-circular';
      const maxDepth = 10;
      let depth = 0;

      while (currentId && depth < maxDepth) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        conversationChain.unshift(comment);
        currentId = comment.parent_id;
        depth++;
      }

      // Should stop at maxDepth
      expect(conversationChain.length).toBeLessThanOrEqual(maxDepth);

      // Clean up
      testDb.prepare('DELETE FROM comments WHERE id = ?').run('comment-circular');
    });
  });

  describe('Error Log Reproduction', () => {
    it('should NOT reproduce the error from logs: "Failed to get conversation chain: TypeError"', async () => {
      // This is what was happening before the fix
      let errorOccurred = false;
      let errorMessage = '';

      try {
        const commentId = 'comment-reply-2';
        const conversationChain = [];
        let currentId = commentId;
        let depth = 0;
        const maxDepth = 10;

        while (currentId && depth < maxDepth) {
          // This line was throwing: TypeError: dbSelector.getCommentById is not a function
          const comment = await dbSelector.getCommentById(currentId);

          if (!comment) break;

          conversationChain.unshift(comment);
          currentId = comment.parent_id;
          depth++;
        }

        console.log(`💬 Conversation chain for comment ${commentId}: ${conversationChain.length} messages`);
        expect(conversationChain.length).toBeGreaterThan(0);
      } catch (error) {
        errorOccurred = true;
        errorMessage = error.message;
        console.error('❌ Failed to get conversation chain:', error.message);
      }

      // The fix is successful if no error occurred
      expect(errorOccurred).toBe(false);
      expect(errorMessage).toBe('');
    });
  });
});
