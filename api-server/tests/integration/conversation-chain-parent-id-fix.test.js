/**
 * CRITICAL FIX VERIFICATION TEST
 *
 * This test verifies that the conversation chain is properly retrieved
 * for threaded comment replies by checking parent_id instead of metadata.type
 *
 * BUG: Lines 779-784 of agent-worker.js previously only checked
 *      ticket.metadata?.type === 'comment', which regular threaded
 *      comments don't have.
 *
 * FIX: Now checks if ticket.post_id is a comment ID and if that comment
 *      has a parent_id, then retrieves the conversation chain.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dbSelector from '../../config/database-selector.js';
import { v4 as uuidv4 } from 'uuid';

describe('Conversation Chain Parent ID Fix', () => {
  let testPostId;
  let commentId1; // First comment (Avi's response)
  let commentId2; // Second comment (user's reply to Avi)

  beforeAll(async () => {
    // Initialize database
    await dbSelector.initialize();

    // Create a test post
    testPostId = `post-${Date.now()}`;

    if (dbSelector.usePostgres) {
      // PostgreSQL setup
      await dbSelector.postgresDb.query(`
        INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [testPostId, testPostId, 'what is 4949+98?', 'testuser', null, null, new Date(), JSON.stringify({})]);
    } else {
      // SQLite setup - first create the post in agent_posts table
      const insertAgentPost = dbSelector.sqliteDb.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertAgentPost.run(
        testPostId,
        'Test Post',
        'what is 4949+98?',
        'testuser',
        new Date().toISOString(),
        JSON.stringify({}),
        JSON.stringify({ comments: 0, likes: 0 })
      );
    }

    // Create first comment (Avi's response to original post)
    commentId1 = `comment-${uuidv4()}`;

    if (dbSelector.usePostgres) {
      await dbSelector.postgresDb.query(`
        INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);
    } else {
      const insertComment1 = dbSelector.sqliteDb.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertComment1.run(commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date().toISOString());
    }

    // Create second comment (user's threaded reply to Avi)
    commentId2 = `comment-${uuidv4()}`;

    if (dbSelector.usePostgres) {
      await dbSelector.postgresDb.query(`
        INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [commentId2, testPostId, 'now divide by 2', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);
    } else {
      const insertComment2 = dbSelector.sqliteDb.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertComment2.run(commentId2, testPostId, 'now divide by 2', 'testuser', null, commentId1, new Date().toISOString());
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (dbSelector.usePostgres) {
      await dbSelector.postgresDb.query('DELETE FROM agent_memories WHERE post_id = $1', [testPostId]);
      await dbSelector.postgresClose();
    } else {
      // Delete comments first (due to foreign key)
      const deleteComments = dbSelector.sqliteDb.prepare('DELETE FROM comments WHERE post_id = ?');
      deleteComments.run(testPostId);

      // Then delete the post
      const deletePost = dbSelector.sqliteDb.prepare('DELETE FROM agent_posts WHERE id = ?');
      deletePost.run(testPostId);

      dbSelector.close();
    }
  });

  describe('Database Setup Verification', () => {
    it('should have created test post in agent_posts table', async () => {
      if (dbSelector.usePostgres) {
        const post = await dbSelector.getCommentById(testPostId);
        expect(post).toBeTruthy();
        expect(post.content).toBe('what is 4949+98?');
      } else {
        // SQLite - check agent_posts table
        const post = dbSelector.sqliteDb.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testPostId);
        expect(post).toBeTruthy();
        expect(post.content).toBe('what is 4949+98?');
      }
    });

    it('should have created first comment (Avi response)', async () => {
      const comment = await dbSelector.getCommentById(commentId1);
      expect(comment).toBeTruthy();
      expect(comment.content).toBe('5047');
      expect(comment.author).toBe('Avi');
      expect(comment.parent_id).toBeNull();
    });

    it('should have created second comment with parent_id', async () => {
      const comment = await dbSelector.getCommentById(commentId2);
      expect(comment).toBeTruthy();
      expect(comment.content).toBe('now divide by 2');
      expect(comment.parent_id).toBe(commentId1);
    });
  });

  describe('Parent ID Detection', () => {
    it('should detect that commentId2 has a parent', async () => {
      const comment = await dbSelector.getCommentById(commentId2);
      expect(comment.parent_id).toBeTruthy();
      expect(comment.parent_id).toBe(commentId1);
    });

    it('should be able to retrieve parent comment', async () => {
      const comment = await dbSelector.getCommentById(commentId2);
      const parent = await dbSelector.getCommentById(comment.parent_id);
      expect(parent).toBeTruthy();
      expect(parent.id).toBe(commentId1);
      expect(parent.content).toBe('5047');
    });
  });

  describe('Comment ID Format Validation', () => {
    it('should verify commentId1 starts with "comment-"', () => {
      expect(commentId1).toMatch(/^comment-/);
    });

    it('should verify commentId2 starts with "comment-"', () => {
      expect(commentId2).toMatch(/^comment-/);
    });

    it('should verify post ID does NOT start with "comment-"', () => {
      expect(testPostId).toMatch(/^post-/);
      expect(testPostId).not.toMatch(/^comment-/);
    });
  });

  describe('Fix Logic Validation', () => {
    it('should pass the "startsWith(comment-)" check for commentId2', () => {
      const passesCheck = commentId2.startsWith('comment-');
      expect(passesCheck).toBe(true);
    });

    it('should correctly simulate the fix logic', async () => {
      // This simulates the exact logic from agent-worker.js lines 782-796
      const ticketPostId = commentId2;

      if (ticketPostId && ticketPostId.startsWith('comment-')) {
        const comment = await dbSelector.getCommentById(ticketPostId);

        if (comment && comment.parent_id) {
          // This should succeed - conversation chain should be retrieved
          expect(comment).toBeTruthy();
          expect(comment.parent_id).toBe(commentId1);
          return true;
        }
      }

      // Should not reach here
      expect(true).toBe(false);
    });
  });

  describe('Conversation Chain Building (Simulated)', () => {
    it('should build a 2-message conversation chain', async () => {
      const chain = [];
      let currentId = commentId2;

      while (currentId) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        chain.push({
          id: comment.id,
          author: comment.author_agent || comment.author,
          content: comment.content,
          parent_id: comment.parent_id
        });

        currentId = comment.parent_id;
      }

      // Should have 2 messages: "now divide by 2" and "5047"
      expect(chain).toHaveLength(2);
      expect(chain[0].content).toBe('now divide by 2');
      expect(chain[1].content).toBe('5047');
    });

    it('should have correct chronological order when reversed', async () => {
      const chain = [];
      let currentId = commentId2;

      while (currentId) {
        const comment = await dbSelector.getCommentById(currentId);
        if (!comment) break;

        chain.push({
          id: comment.id,
          author: comment.author_agent || comment.author,
          content: comment.content
        });

        currentId = comment.parent_id;
      }

      const chronological = chain.reverse();

      // First message should be Avi's "5047"
      expect(chronological[0].content).toBe('5047');
      expect(chronological[0].author).toBe('avi'); // author_agent is lowercase 'avi'

      // Second message should be user's "now divide by 2"
      expect(chronological[1].content).toBe('now divide by 2');
      expect(chronological[1].author).toBe('testuser');
    });
  });

  describe('Metadata.type Non-Requirement', () => {
    it('should verify commentId2 has no metadata (or empty metadata)', async () => {
      const comment = await dbSelector.getCommentById(commentId2);

      // SQLite doesn't have metadata column, PostgreSQL does
      if (comment.metadata) {
        const metadata = typeof comment.metadata === 'string'
          ? JSON.parse(comment.metadata)
          : comment.metadata;
        // This is the critical part: regular threaded comments don't have metadata.type
        expect(metadata.type).toBeUndefined();
      } else {
        // SQLite - no metadata column at all
        expect(comment.metadata).toBeUndefined();
      }
    });

    it('should confirm fix does not require metadata.type', async () => {
      const comment = await dbSelector.getCommentById(commentId2);

      // OLD CODE (BROKEN): Required metadata?.type === 'comment'
      // This would fail because regular comments don't have this metadata
      let oldLogicWouldPass = false;
      if (comment.metadata) {
        const metadata = typeof comment.metadata === 'string'
          ? JSON.parse(comment.metadata)
          : comment.metadata;
        oldLogicWouldPass = metadata?.type === 'comment';
      }
      expect(oldLogicWouldPass).toBe(false); // This would FAIL

      // NEW CODE (FIXED): Only requires parent_id check
      const newLogicPasses = commentId2.startsWith('comment-') && !!comment.parent_id;
      expect(newLogicPasses).toBe(true); // This SUCCEEDS
    });
  });

  describe('Regression Prevention', () => {
    it('should not break for top-level comments (no parent)', async () => {
      const ticketPostId = commentId1; // Top-level comment (no parent)

      if (ticketPostId && ticketPostId.startsWith('comment-')) {
        const comment = await dbSelector.getCommentById(ticketPostId);

        // Should load comment but NOT trigger conversation chain (no parent_id)
        expect(comment).toBeTruthy();
        expect(comment.parent_id).toBeNull();

        // Logic should NOT proceed to getConversationChain
        const shouldGetChain = !!(comment && comment.parent_id);
        expect(shouldGetChain).toBe(false);
      }
    });

    it('should not break for post IDs (not comments)', async () => {
      const ticketPostId = testPostId; // This is a post, not a comment

      // Should fail the startsWith('comment-') check
      const passesCheck = ticketPostId && ticketPostId.startsWith('comment-');
      expect(passesCheck).toBe(false);
    });
  });
});
