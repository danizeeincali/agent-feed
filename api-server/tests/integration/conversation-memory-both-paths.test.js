/**
 * COMPREHENSIVE TEST: Conversation Memory - Both Execution Paths
 *
 * This test suite verifies that conversation memory works correctly for BOTH
 * execution paths in the agent-worker system:
 *
 * PATH 1: Post Path (processURL) - For direct post questions and replies
 * PATH 2: Comment Path (processComment) - For threaded comment replies
 *
 * The bug was that PATH 1 had conversation chain retrieval, but PATH 2 didn't.
 * This caused threaded replies to lose conversation context.
 *
 * These tests verify:
 * - Both paths retrieve conversation chain when appropriate
 * - Both paths include conversation history in prompts
 * - Deep threading (3+ levels) maintains context
 * - Top-level comments work without conversation chain
 *
 * TEST METHODOLOGY:
 * - Uses REAL SQLite database (no mocks)
 * - Tests actual getConversationChain() implementation
 * - Verifies prompt formatting includes conversation history
 * - Validates database parent_id chains are correct
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dbSelector from '../../config/database-selector.js';
import AgentWorker from '../../worker/agent-worker.js';
import { v4 as uuidv4 } from 'uuid';

describe('Conversation Memory - Both Execution Paths', () => {
  let testPostId;
  let cleanupIds = [];

  beforeAll(async () => {
    // Initialize database
    await dbSelector.initialize();
  });

  beforeEach(async () => {
    // Create a fresh test post for each test
    testPostId = `post-test-${Date.now()}-${uuidv4().slice(0, 8)}`;
    cleanupIds = [testPostId];

    if (dbSelector.usePostgres) {
      // PostgreSQL setup
      await dbSelector.postgresDb.query(`
        INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [testPostId, testPostId, 'Test post content', 'testuser', null, null, new Date(), JSON.stringify({})]);
    } else {
      // SQLite setup
      const insertPost = dbSelector.sqliteDb.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertPost.run(
        testPostId,
        'Test Post',
        'Test post content',
        'testuser',
        new Date().toISOString(),
        JSON.stringify({}),
        JSON.stringify({ comments: 0, likes: 0 })
      );
    }
  });

  afterEach(async () => {
    // Clean up all test data
    if (dbSelector.usePostgres) {
      for (const id of cleanupIds) {
        await dbSelector.postgresDb.query('DELETE FROM agent_memories WHERE id = $1', [id]);
        await dbSelector.postgresDb.query('DELETE FROM agent_memories WHERE post_id = $1', [id]);
      }
    } else {
      // Delete comments first (due to foreign key)
      for (const id of cleanupIds) {
        const deleteComments = dbSelector.sqliteDb.prepare('DELETE FROM comments WHERE post_id = ?');
        deleteComments.run(id);

        const deleteCommentsById = dbSelector.sqliteDb.prepare('DELETE FROM comments WHERE id = ?');
        deleteCommentsById.run(id);
      }

      // Then delete posts
      for (const id of cleanupIds) {
        const deletePost = dbSelector.sqliteDb.prepare('DELETE FROM agent_posts WHERE id = ?');
        deletePost.run(id);
      }
    }
  });

  afterAll(async () => {
    if (dbSelector.usePostgres) {
      await dbSelector.postgresClose();
    } else {
      dbSelector.close();
    }
  });

  describe('Path 1: Post Path (processURL) - Existing Fix', () => {
    it('should maintain context for direct post reply', async () => {
      // Scenario: User posts "what is 4949+98?" → Avi responds
      // This tests the processURL path which already has the fix

      // Create first comment (Avi's response to post)
      const commentId1 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date().toISOString());
      }

      // Verify comment was created
      const comment = await dbSelector.getCommentById(commentId1);
      expect(comment).toBeTruthy();
      expect(comment.content).toBe('5047');
      expect(comment.parent_id).toBeNull(); // Top-level comment
    });

    it('should retrieve conversation chain in processURL for comment replies', async () => {
      // Create a comment chain:
      // Post → Comment1 (Avi: "5047") → Comment2 (User: "divide by 2")

      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId2, testPostId, 'divide by 2', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, '5047', 'Avi', 'avi', null, new Date().toISOString());
        insertComment.run(commentId2, testPostId, 'divide by 2', 'testuser', null, commentId1, new Date().toISOString());
      }

      // Create worker instance (simulating processURL path)
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      // Test: Get conversation chain for commentId2
      const chain = await worker.getConversationChain(commentId2);

      // Verify: Chain should have 2 messages in chronological order
      expect(chain).toHaveLength(2);
      expect(chain[0].content).toBe('5047'); // Oldest first
      expect(chain[0].author).toBe('avi');
      expect(chain[1].content).toBe('divide by 2'); // Most recent last
      expect(chain[1].author).toBe('testuser');
    });
  });

  describe('Path 2: Comment Path (processComment) - NEW FIX', () => {
    it('should maintain context for threaded comment reply', async () => {
      // Scenario: User posts "what is 5949+98?" → Avi: "6047" → User: "divide by 2"
      // This tests the processComment path which NOW has the fix

      // Create comment chain
      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, '6047', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId2, testPostId, 'divide by 2', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, '6047', 'Avi', 'avi', null, new Date().toISOString());
        insertComment.run(commentId2, testPostId, 'divide by 2', 'testuser', null, commentId1, new Date().toISOString());
      }

      // Verify parent_id chain is correct
      const comment2 = await dbSelector.getCommentById(commentId2);
      expect(comment2).toBeTruthy();
      expect(comment2.parent_id).toBe(commentId1);

      // Create worker and test conversation chain retrieval
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId2);

      // Verify conversation chain includes both messages
      expect(chain).toHaveLength(2);
      expect(chain[0].content).toBe('6047');
      expect(chain[1].content).toBe('divide by 2');
    });

    it('should include conversation history in buildCommentPrompt', async () => {
      // Create comment chain
      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, 'Answer is 100', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId2, testPostId, 'multiply it by 3', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, 'Answer is 100', 'Avi', 'avi', null, new Date().toISOString());
        insertComment.run(commentId2, testPostId, 'multiply it by 3', 'testuser', null, commentId1, new Date().toISOString());
      }

      // Get conversation chain
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const conversationChain = await worker.getConversationChain(commentId2);

      // Build prompt with conversation chain
      const comment = await dbSelector.getCommentById(commentId2);
      const parentPost = await dbSelector.getPostById(testPostId);

      const prompt = worker.buildCommentPrompt(comment, parentPost, conversationChain);

      // Verify prompt includes conversation history
      expect(prompt).toContain('CONVERSATION THREAD');
      expect(prompt).toContain('2 messages'); // Chain length
      expect(prompt).toContain('Answer is 100'); // First message
      expect(prompt).toContain('multiply it by 3'); // Second message
      expect(prompt).toContain('avi:'); // Author of first message
      expect(prompt).toContain('testuser:'); // Author of second message
      expect(prompt).toContain('FULL conversation history'); // Context awareness instruction
    });

    it('should handle deep threading (3+ levels)', async () => {
      // Create a 4-level conversation chain
      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      const commentId3 = `comment-${uuidv4()}`;
      const commentId4 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2, commentId3, commentId4);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, '300', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId2, testPostId, 'multiply by 2', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId3, testPostId, '600', 'Avi', 'avi', commentId2, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId4, testPostId, 'divide by 3', 'testuser', null, commentId3, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, '300', 'Avi', 'avi', null, new Date().toISOString());
        insertComment.run(commentId2, testPostId, 'multiply by 2', 'testuser', null, commentId1, new Date().toISOString());
        insertComment.run(commentId3, testPostId, '600', 'Avi', 'avi', commentId2, new Date().toISOString());
        insertComment.run(commentId4, testPostId, 'divide by 3', 'testuser', null, commentId3, new Date().toISOString());
      }

      // Get conversation chain for deepest comment
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId4);

      // Verify full chain is retrieved (4 messages)
      expect(chain).toHaveLength(4);
      expect(chain[0].content).toBe('300');
      expect(chain[1].content).toBe('multiply by 2');
      expect(chain[2].content).toBe('600');
      expect(chain[3].content).toBe('divide by 3');

      // Verify chronological order
      expect(chain[0].author).toBe('avi');
      expect(chain[1].author).toBe('testuser');
      expect(chain[2].author).toBe('avi');
      expect(chain[3].author).toBe('testuser');
    });

    it('should work for top-level comment (no parent)', async () => {
      // Create a top-level comment (no parent_id)
      const commentId = `comment-${uuidv4()}`;
      cleanupIds.push(commentId);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId, testPostId, 'Top-level comment', 'testuser', null, null, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId, testPostId, 'Top-level comment', 'testuser', null, null, new Date().toISOString());
      }

      // Verify comment has no parent
      const comment = await dbSelector.getCommentById(commentId);
      expect(comment).toBeTruthy();
      expect(comment.parent_id).toBeNull();

      // Get conversation chain - should be empty
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId);

      // Should have 1 message (just the comment itself)
      expect(chain).toHaveLength(1);
      expect(chain[0].content).toBe('Top-level comment');
    });

    it('should not break when no parent exists (deleted parent)', async () => {
      // Create a comment with a parent_id that doesn't exist
      const commentId = `comment-${uuidv4()}`;
      const fakeParentId = `comment-${uuidv4()}`;
      cleanupIds.push(commentId);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId, testPostId, 'Orphaned comment', 'testuser', null, fakeParentId, new Date(), JSON.stringify({})]);
      } else {
        // Temporarily disable foreign key constraints
        dbSelector.sqliteDb.prepare('PRAGMA foreign_keys = OFF').run();

        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId, testPostId, 'Orphaned comment', 'testuser', null, fakeParentId, new Date().toISOString());

        // Re-enable foreign key constraints
        dbSelector.sqliteDb.prepare('PRAGMA foreign_keys = ON').run();
      }

      // Get conversation chain - should handle missing parent gracefully
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId);

      // Should stop at orphaned comment (chain walk stops when parent not found)
      expect(chain).toHaveLength(1);
      expect(chain[0].content).toBe('Orphaned comment');
    });
  });

  describe('Multi-turn Conversation Context', () => {
    it('should maintain context across multiple turns', async () => {
      // Create a realistic multi-turn conversation
      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      const commentId3 = `comment-${uuidv4()}`;
      const commentId4 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2, commentId3, commentId4);

      const messages = [
        { id: commentId1, content: 'The result is 42', author: 'avi', parent: null },
        { id: commentId2, content: 'add 8 to it', author: 'testuser', parent: commentId1 },
        { id: commentId3, content: 'That gives us 50', author: 'avi', parent: commentId2 },
        { id: commentId4, content: 'now multiply that by 2', author: 'testuser', parent: commentId3 }
      ];

      if (dbSelector.usePostgres) {
        for (const msg of messages) {
          await dbSelector.postgresDb.query(`
            INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [msg.id, testPostId, msg.content, msg.author === 'avi' ? 'Avi' : msg.author,
              msg.author === 'avi' ? 'avi' : null, msg.parent, new Date(), JSON.stringify({})]);
        }
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const msg of messages) {
          insertComment.run(
            msg.id,
            testPostId,
            msg.content,
            msg.author === 'avi' ? 'Avi' : msg.author,
            msg.author === 'avi' ? 'avi' : null,
            msg.parent,
            new Date().toISOString()
          );
        }
      }

      // Get conversation chain for last message
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId4);

      // Verify full conversation is retrieved
      expect(chain).toHaveLength(4);
      expect(chain[0].content).toBe('The result is 42');
      expect(chain[1].content).toBe('add 8 to it');
      expect(chain[2].content).toBe('That gives us 50');
      expect(chain[3].content).toBe('now multiply that by 2');

      // Build prompt and verify it includes all context
      const comment = await dbSelector.getCommentById(commentId4);
      const parentPost = await dbSelector.getPostById(testPostId);
      const prompt = worker.buildCommentPrompt(comment, parentPost, chain);

      // Verify prompt includes all messages in conversation
      expect(prompt).toContain('CONVERSATION THREAD');
      expect(prompt).toContain('4 messages');
      expect(prompt).toContain('The result is 42');
      expect(prompt).toContain('add 8 to it');
      expect(prompt).toContain('That gives us 50');
      expect(prompt).toContain('now multiply that by 2');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle max depth limit (prevent infinite loops)', async () => {
      // This test verifies the maxDepth parameter works
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      // Create a long chain (5 messages)
      const commentIds = Array.from({ length: 5 }, () => `comment-${uuidv4()}`);
      cleanupIds.push(...commentIds);

      if (dbSelector.usePostgres) {
        for (let i = 0; i < commentIds.length; i++) {
          const parentId = i === 0 ? null : commentIds[i - 1];
          await dbSelector.postgresDb.query(`
            INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [commentIds[i], testPostId, `Message ${i + 1}`, 'testuser', null, parentId, new Date(), JSON.stringify({})]);
        }
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (let i = 0; i < commentIds.length; i++) {
          const parentId = i === 0 ? null : commentIds[i - 1];
          insertComment.run(commentIds[i], testPostId, `Message ${i + 1}`, 'testuser', null, parentId, new Date().toISOString());
        }
      }

      // Get chain with limited depth
      const chain = await worker.getConversationChain(commentIds[4], 3);

      // Should stop at maxDepth (3)
      expect(chain.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty comment ID gracefully', async () => {
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(null);
      expect(chain).toEqual([]);
    });

    it('should handle non-existent comment ID', async () => {
      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const fakeCommentId = `comment-${uuidv4()}`;
      const chain = await worker.getConversationChain(fakeCommentId);

      // Should return empty array when comment not found
      expect(chain).toEqual([]);
    });
  });

  describe('Prompt Format Validation', () => {
    it('should format prompt with separators and sections', async () => {
      // Create a simple 2-message conversation
      const commentId1 = `comment-${uuidv4()}`;
      const commentId2 = `comment-${uuidv4()}`;
      cleanupIds.push(commentId1, commentId2);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId1, testPostId, 'First message', 'Avi', 'avi', null, new Date(), JSON.stringify({})]);

        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId2, testPostId, 'Second message', 'testuser', null, commentId1, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId1, testPostId, 'First message', 'Avi', 'avi', null, new Date().toISOString());
        insertComment.run(commentId2, testPostId, 'Second message', 'testuser', null, commentId1, new Date().toISOString());
      }

      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await worker.getConversationChain(commentId2);
      const comment = await dbSelector.getCommentById(commentId2);
      const parentPost = await dbSelector.getPostById(testPostId);
      const prompt = worker.buildCommentPrompt(comment, parentPost, chain);

      // Verify prompt structure
      expect(prompt).toContain('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'); // Separators
      expect(prompt).toContain('ORIGINAL POST');
      expect(prompt).toContain('CONVERSATION THREAD');
      expect(prompt).toContain('CURRENT MESSAGE');
      expect(prompt).toContain('IMPORTANT: You have the FULL conversation history');
    });

    it('should not include conversation section when chain is empty', async () => {
      // Create a top-level comment
      const commentId = `comment-${uuidv4()}`;
      cleanupIds.push(commentId);

      if (dbSelector.usePostgres) {
        await dbSelector.postgresDb.query(`
          INSERT INTO agent_memories (id, post_id, content, author, author_agent, parent_id, created_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [commentId, testPostId, 'Solo comment', 'testuser', null, null, new Date(), JSON.stringify({})]);
      } else {
        const insertComment = dbSelector.sqliteDb.prepare(`
          INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertComment.run(commentId, testPostId, 'Solo comment', 'testuser', null, null, new Date().toISOString());
      }

      const worker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const comment = await dbSelector.getCommentById(commentId);
      const parentPost = await dbSelector.getPostById(testPostId);
      const prompt = worker.buildCommentPrompt(comment, parentPost, []);

      // Should not include conversation thread section
      expect(prompt).not.toContain('CONVERSATION THREAD');
      expect(prompt).not.toContain('FULL conversation history');
    });
  });
});
