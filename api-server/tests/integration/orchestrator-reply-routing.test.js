/**
 * TDD Integration Tests for Agent Reply Routing (RED PHASE)
 *
 * Tests orchestrator's routing logic for comment replies based on parent comment's author_agent.
 * All tests should FAIL initially until implementation is complete.
 *
 * Routing Priority:
 * 1. Parent comment exists + has author_agent -> route to that agent
 * 2. Parent comment exists + author_agent='avi' -> route to avi
 * 3. Parent comment exists + no author_agent -> fallback to parent post routing
 * 4. Parent comment not found -> fallback to parent post routing
 * 5. Deep threading -> follow chain to find appropriate agent
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const orchestrator = require('../../avi/orchestrator');

describe('Orchestrator Reply Routing - Integration Tests (RED PHASE)', () => {
  let db;
  let testDbPath;

  beforeEach(() => {
    // Create in-memory test database
    testDbPath = ':memory:';
    db = new Database(testDbPath);

    // Create minimal schema for testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        content TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        parent_comment_id TEXT,
        content TEXT,
        user_id TEXT,
        author_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
      );

      CREATE TABLE IF NOT EXISTS work_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_type TEXT,
        ticket_metadata TEXT,
        status TEXT DEFAULT 'pending',
        assigned_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert test post
    db.prepare(`
      INSERT INTO posts (id, content, user_id)
      VALUES ('post-1', 'Test post content', 'user-1')
    `).run();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Parent Comment with author_agent', () => {
    it('should route reply to agent from parent comment author_agent field', async () => {
      // Arrange: Create parent comment with author_agent
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Parent comment', 'user-1', 'get-to-know-you-agent')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply to parent comment'
      };

      // Act: Route the reply comment
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert: Should route to parent comment's agent
      assert.strictEqual(result.agent, 'get-to-know-you-agent',
        'Should route to parent comment author_agent');
      assert.strictEqual(result.reason, 'parent_comment_agent',
        'Should indicate routing reason');
    });

    it('should route reply to avi when parent comment author_agent is "avi"', async () => {
      // Arrange: Create parent comment authored by avi
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Avi comment', 'user-1', 'avi')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply to Avi'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.strictEqual(result.agent, 'avi',
        'Should route to avi when parent is avi');
      assert.strictEqual(result.reason, 'parent_comment_agent');
    });

    it('should route reply to different agent types correctly', async () => {
      const agentTypes = ['agent-1', 'agent-2', 'agent-3', 'sports-agent', 'tech-agent'];

      for (const agentType of agentTypes) {
        // Arrange: Create parent comment with specific agent
        const commentId = `comment-${agentType}`;
        db.prepare(`
          INSERT INTO comments (id, post_id, content, user_id, author_agent)
          VALUES (?, 'post-1', 'Test comment', 'user-1', ?)
        `).run(commentId, agentType);

        const ticketMetadata = {
          post_id: 'post-1',
          comment_id: `reply-${agentType}`,
          parent_comment_id: commentId,
          content: 'Reply to agent'
        };

        // Act
        const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

        // Assert
        assert.strictEqual(result.agent, agentType,
          `Should route to ${agentType}`);
      }
    });
  });

  describe('Parent Comment without author_agent', () => {
    it('should fallback to parent post routing when parent comment has no author_agent', async () => {
      // Arrange: Create parent comment WITHOUT author_agent
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Comment without agent', 'user-1', NULL)
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply to comment'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert: Should fallback to parent post routing
      assert.ok(result.agent, 'Should have an agent assigned');
      assert.strictEqual(result.reason, 'parent_post_fallback',
        'Should indicate fallback to parent post routing');
    });

    it('should fallback when parent comment author_agent is empty string', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Comment', 'user-1', '')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.strictEqual(result.reason, 'parent_post_fallback');
    });
  });

  describe('Parent Comment Not Found', () => {
    it('should fallback to parent post routing when parent comment does not exist', async () => {
      // Arrange: Reference non-existent parent comment
      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'non-existent-comment',
        content: 'Reply to ghost'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.ok(result.agent, 'Should still assign an agent');
      assert.strictEqual(result.reason, 'parent_comment_not_found',
        'Should indicate parent comment was not found');
    });

    it('should fallback when parent_comment_id is null', async () => {
      // Arrange
      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-1',
        parent_comment_id: null,
        content: 'Top-level comment'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.strictEqual(result.reason, 'top_level_comment');
    });

    it('should fallback when parent_comment_id is undefined', async () => {
      // Arrange
      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-1',
        content: 'Comment'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.strictEqual(result.reason, 'top_level_comment');
    });
  });

  describe('Deep Threading', () => {
    it('should route reply-to-reply to original parent comment agent', async () => {
      // Arrange: Create comment chain
      // comment-1 (get-to-know-you-agent) -> comment-2 (avi) -> comment-3 (should go to comment-2's agent)
      db.prepare(`
        INSERT INTO comments (id, post_id, parent_comment_id, content, user_id, author_agent)
        VALUES
          ('comment-1', 'post-1', NULL, 'First comment', 'user-1', 'get-to-know-you-agent'),
          ('comment-2', 'post-1', 'comment-1', 'Reply to first', 'user-2', 'avi')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-3',
        parent_comment_id: 'comment-2',
        content: 'Reply to reply'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert: Should route to immediate parent (comment-2's agent = avi)
      assert.strictEqual(result.agent, 'avi',
        'Should route to immediate parent comment agent');
    });

    it('should handle 3-level deep threading', async () => {
      // Arrange: Create deep chain
      db.prepare(`
        INSERT INTO comments (id, post_id, parent_comment_id, content, user_id, author_agent)
        VALUES
          ('comment-1', 'post-1', NULL, 'Level 1', 'user-1', 'agent-1'),
          ('comment-2', 'post-1', 'comment-1', 'Level 2', 'user-2', 'agent-2'),
          ('comment-3', 'post-1', 'comment-2', 'Level 3', 'user-3', 'agent-3')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-4',
        parent_comment_id: 'comment-3',
        content: 'Level 4 reply'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert: Should route to immediate parent (agent-3)
      assert.strictEqual(result.agent, 'agent-3',
        'Should route to immediate parent in deep thread');
    });

    it('should handle deep threading with missing intermediate agents', async () => {
      // Arrange: Chain where middle comment has no agent
      db.prepare(`
        INSERT INTO comments (id, post_id, parent_comment_id, content, user_id, author_agent)
        VALUES
          ('comment-1', 'post-1', NULL, 'Level 1', 'user-1', 'agent-1'),
          ('comment-2', 'post-1', 'comment-1', 'Level 2', 'user-2', NULL)
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-3',
        parent_comment_id: 'comment-2',
        content: 'Reply to no-agent comment'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert: Should fallback
      assert.strictEqual(result.reason, 'parent_post_fallback',
        'Should fallback when immediate parent has no agent');
    });
  });

  describe('Async Behavior', () => {
    it('should return a Promise from routeCommentToAgent', () => {
      // Arrange
      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-1',
        content: 'Test'
      };

      // Act
      const result = orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.ok(result instanceof Promise, 'Should return a Promise');
    });

    it('should handle async database operations correctly', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Comment', 'user-1', 'test-agent')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply'
      };

      // Act
      const result = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Assert
      assert.ok(result, 'Should successfully complete async operation');
      assert.strictEqual(result.agent, 'test-agent');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully when getCommentById fails', async () => {
      // Arrange: Create corrupted database state
      db.exec('DROP TABLE comments');

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply'
      };

      // Act & Assert
      try {
        await orchestrator.routeCommentToAgent(ticketMetadata, db);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error, 'Should throw error when database fails');
        assert.ok(error.message.includes('no such table') ||
                  error.message.includes('database'),
          'Error should indicate database issue');
      }
    });

    it('should handle null database parameter', async () => {
      // Arrange
      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-1',
        content: 'Test'
      };

      // Act & Assert
      try {
        await orchestrator.routeCommentToAgent(ticketMetadata, null);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error, 'Should throw error with null database');
      }
    });

    it('should handle malformed ticketMetadata gracefully', async () => {
      // Arrange: Missing required fields
      const ticketMetadata = {
        comment_id: 'comment-1'
        // Missing post_id
      };

      // Act & Assert
      try {
        await orchestrator.routeCommentToAgent(ticketMetadata, db);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error, 'Should throw error with malformed metadata');
      }
    });

    it('should handle database connection errors', async () => {
      // Arrange: Close database
      db.close();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply'
      };

      // Act & Assert
      try {
        await orchestrator.routeCommentToAgent(ticketMetadata, db);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error, 'Should throw error with closed database');
        assert.ok(error.message.includes('closed') ||
                  error.message.includes('database'),
          'Error should indicate database is closed');
      }
    });
  });

  describe('Integration with Work Queue', () => {
    it('should integrate routing result with work queue assignment', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO comments (id, post_id, content, user_id, author_agent)
        VALUES ('comment-1', 'post-1', 'Comment', 'user-1', 'assigned-agent')
      `).run();

      const ticketMetadata = {
        post_id: 'post-1',
        comment_id: 'comment-2',
        parent_comment_id: 'comment-1',
        content: 'Reply'
      };

      // Act
      const routingResult = await orchestrator.routeCommentToAgent(ticketMetadata, db);

      // Insert into work queue with routed agent
      const insertStmt = db.prepare(`
        INSERT INTO work_queue (ticket_type, ticket_metadata, assigned_agent, status)
        VALUES (?, ?, ?, ?)
      `);

      insertStmt.run(
        'comment',
        JSON.stringify(ticketMetadata),
        routingResult.agent,
        'pending'
      );

      // Assert: Verify work queue entry
      const workItem = db.prepare(`
        SELECT * FROM work_queue WHERE assigned_agent = ?
      `).get(routingResult.agent);

      assert.ok(workItem, 'Should create work queue entry');
      assert.strictEqual(workItem.assigned_agent, 'assigned-agent');
      assert.strictEqual(workItem.ticket_type, 'comment');
    });
  });
});
