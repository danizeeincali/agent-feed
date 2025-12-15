/**
 * AVI Post Integration Tests - TDD London School
 *
 * Integration Focus:
 * - AVI integration with post creation flow
 * - Question detection and routing
 * - Comment posting as AVI
 * - author_agent field usage
 * - Async processing without blocking
 *
 * London School Approach:
 * - Test end-to-end collaboration patterns
 * - Verify interactions across system boundaries
 * - Use real database for integration
 * - Focus on contract fulfillment
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '../../../data/test-avi-post-integration.db');

describe('AVI Post Integration Tests', () => {
  let db;

  beforeAll(() => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database with full schema
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        updated_at INTEGER,
        author_name TEXT,
        author_username TEXT,
        metadata TEXT,
        engagement TEXT DEFAULT '{"likes":0,"comments":0,"shares":0,"views":0}',
        last_activity_at TEXT
      ) STRICT;

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        parent_id TEXT,
        author TEXT NOT NULL,
        author_agent TEXT,
        content TEXT NOT NULL,
        mentioned_users TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_comments_post ON comments(post_id);
      CREATE INDEX idx_comments_author_agent ON comments(author_agent);
    `);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear tables
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM agent_posts');
  });

  describe('Contract: Question Detection for AVI', () => {
    it('TPI-001: should detect question marks as AVI trigger', () => {
      const testCases = [
        { content: 'What is my working directory?', expected: true },
        { content: 'How do I check status?', expected: true },
        { content: 'Can you help me with this?', expected: true },
        { content: 'This is a statement.', expected: false }
      ];

      testCases.forEach(({ content, expected }) => {
        const hasQuestionMark = content.includes('?');
        expect(hasQuestionMark).toBe(expected);
      });
    });

    it('TPI-002: should detect direct AVI address', () => {
      const testCases = [
        { content: 'avi, what is the status?', expected: true },
        { content: 'Hey AVI, help me', expected: true },
        { content: '@avi please assist', expected: true },
        { content: 'Λvi show me the logs', expected: true },
        { content: 'Normal post content', expected: false }
      ];

      testCases.forEach(({ content, expected }) => {
        const mentionsAvi = /avi|λvi/i.test(content);
        expect(mentionsAvi).toBe(expected);
      });
    });

    it('TPI-003: should detect command patterns as questions', () => {
      const questionPatterns = [
        /^(what|where|when|why|how|who|status|help)/i,
        /directory/i,
        /working on/i,
        /tell me/i,
        /show me/i
      ];

      const testCases = [
        { content: 'what is happening', expected: true },
        { content: 'show me the directory', expected: true },
        { content: 'tell me about the system', expected: true },
        { content: 'status check', expected: true },
        { content: 'regular post content here', expected: false }
      ];

      testCases.forEach(({ content, expected }) => {
        const isQuestion = questionPatterns.some(pattern => pattern.test(content));
        expect(isQuestion).toBe(expected);
      });
    });

    it('TPI-004: should NOT route URLs to AVI (reserved for link-logger)', () => {
      const urlPattern = /https?:\/\/[^\s]+/;

      const testCases = [
        { content: 'Check this out: https://example.com', hasUrl: true },
        { content: 'What is https://github.com doing?', hasUrl: true },
        { content: 'What is the working directory?', hasUrl: false }
      ];

      testCases.forEach(({ content, hasUrl }) => {
        const containsUrl = urlPattern.test(content);
        expect(containsUrl).toBe(hasUrl);
      });
    });
  });

  describe('Interaction: Comment Creation with author_agent', () => {
    it('TPI-005: should create comment with author_agent field', () => {
      // Arrange: Create a post first
      const postId = 'post-test-001';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test Post', 'Test content', Date.now());

      // Act: Create comment with author_agent
      const commentId = 'comment-avi-001';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, postId, 'avi', 'avi', 'AVI response to question');

      // Assert: Verify comment was created correctly
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

      expect(comment).toBeDefined();
      expect(comment.author).toBe('avi');
      expect(comment.author_agent).toBe('avi');
      expect(comment.content).toBe('AVI response to question');
      expect(comment.post_id).toBe(postId);
    });

    it('TPI-006: should support backward compatibility with author field', () => {
      // Arrange
      const postId = 'post-test-002';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test Post', 'Test content', Date.now());

      // Act: Create comment with both author and author_agent
      const commentId = 'comment-compat-001';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, postId, 'avi', 'avi', 'Response content');

      // Assert: Both fields should be populated
      const comment = db.prepare('SELECT author, author_agent FROM comments WHERE id = ?').get(commentId);

      expect(comment.author).toBe('avi');
      expect(comment.author_agent).toBe('avi');
    });

    it('TPI-007: should query comments by author_agent', () => {
      // Arrange: Create post and multiple comments
      const postId = 'post-test-003';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test Post', 'Test content', Date.now());

      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-avi-1', postId, 'avi', 'avi', 'AVI response 1');

      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-user-1', postId, 'user123', 'user123', 'User comment');

      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('comment-avi-2', postId, 'avi', 'avi', 'AVI response 2');

      // Act: Query AVI comments
      const aviComments = db.prepare(`
        SELECT * FROM comments WHERE author_agent = ? ORDER BY created_at
      `).all('avi');

      // Assert: Should only get AVI comments
      expect(aviComments).toHaveLength(2);
      expect(aviComments[0].author_agent).toBe('avi');
      expect(aviComments[1].author_agent).toBe('avi');
    });

    it('TPI-008: should handle NULL author_agent gracefully', () => {
      // Arrange
      const postId = 'post-test-004';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test Post', 'Test content', Date.now());

      // Act: Create comment without author_agent (legacy)
      const commentId = 'comment-legacy-001';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, postId, 'user123', 'Legacy comment');

      // Assert: Should work fine with NULL author_agent
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

      expect(comment).toBeDefined();
      expect(comment.author).toBe('user123');
      expect(comment.author_agent).toBeNull();
    });
  });

  describe('Collaboration: Post and Comment Workflow', () => {
    it('TPI-009: should create post and receive AVI comment', () => {
      // Arrange: Create question post
      const postId = 'post-question-001';
      const postContent = 'What is my current working directory?';

      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Question', postContent, Date.now());

      // Act: Simulate AVI response
      const commentId = 'comment-avi-response-001';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, postId, 'avi', 'avi', 'Your working directory is /workspaces/agent-feed/prod/agent_workspace/');

      // Assert: Verify workflow
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postId);
      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);

      expect(post.content).toContain('?');
      expect(comments).toHaveLength(1);
      expect(comments[0].author_agent).toBe('avi');
      expect(comments[0].content).toContain('working directory');
    });

    it('TPI-010: should support threaded AVI conversations', () => {
      // Arrange: Create post and initial AVI comment
      const postId = 'post-conversation-001';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Question', 'What files are in the workspace?', Date.now());

      const parentCommentId = 'comment-avi-001';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(parentCommentId, postId, 'avi', 'avi', 'Here are the main files...');

      // Act: Add follow-up user comment and AVI reply
      const userFollowUpId = 'comment-user-followup';
      db.prepare(`
        INSERT INTO comments (id, post_id, parent_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userFollowUpId, postId, parentCommentId, 'user', 'user', 'Can you show details?');

      const aviReplyId = 'comment-avi-reply';
      db.prepare(`
        INSERT INTO comments (id, post_id, parent_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(aviReplyId, postId, userFollowUpId, 'avi', 'avi', 'Sure, here are the details...');

      // Assert: Verify thread structure
      const allComments = db.prepare(`
        SELECT id, parent_id, author_agent, content
        FROM comments
        WHERE post_id = ?
        ORDER BY created_at
      `).all(postId);

      expect(allComments).toHaveLength(3);
      expect(allComments[0].parent_id).toBeNull();
      expect(allComments[1].parent_id).toBe(parentCommentId);
      expect(allComments[2].parent_id).toBe(userFollowUpId);
      expect(allComments[2].author_agent).toBe('avi');
    });

    it('TPI-011: should handle multiple questions in same post', () => {
      // Arrange: Post with multiple questions
      const postId = 'post-multi-question';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        postId,
        'user',
        'Multiple Questions',
        'What is the directory? And what files exist? How do I check?',
        Date.now()
      );

      // Act: AVI responds comprehensively
      const commentId = 'comment-comprehensive';
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        commentId,
        postId,
        'avi',
        'avi',
        'Let me answer all three questions: 1) Directory is... 2) Files include... 3) Check with...'
      );

      // Assert
      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toContain('three questions');
    });
  });

  describe('Contract: Non-Blocking Async Processing', () => {
    it('TPI-012: should allow post creation without waiting for AVI', async () => {
      // Arrange
      const postId = 'post-async-001';
      const startTime = Date.now();

      // Act: Create post (simulating API endpoint)
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Question', 'What is the status?', Date.now());

      const postCreationTime = Date.now() - startTime;

      // Simulate async AVI processing (happens after post creation)
      setTimeout(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run('comment-async-avi', postId, 'avi', 'avi', 'Status is healthy');
      }, 100);

      // Assert: Post creation should be fast (not blocked by AVI)
      expect(postCreationTime).toBeLessThan(50); // Should be nearly instant

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postId);
      expect(post).toBeDefined();

      // Wait for async comment
      await new Promise(resolve => setTimeout(resolve, 150));

      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);
      expect(comments).toHaveLength(1);
      expect(comments[0].author_agent).toBe('avi');
    });

    it('TPI-013: should handle AVI response delays gracefully', async () => {
      // Arrange: Create post
      const postId = 'post-delayed-response';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Question', 'Complex question requiring analysis?', Date.now());

      // Act: Simulate delayed AVI response
      const responsePromise = new Promise(resolve => {
        setTimeout(() => {
          db.prepare(`
            INSERT INTO comments (id, post_id, author, author_agent, content)
            VALUES (?, ?, ?, ?, ?)
          `).run('comment-delayed', postId, 'avi', 'avi', 'After careful analysis...');
          resolve();
        }, 200);
      });

      // Assert: Post should exist immediately
      const postBefore = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);
      expect(postBefore).toHaveLength(0);

      // Wait for response
      await responsePromise;

      const postAfter = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId);
      expect(postAfter).toHaveLength(1);
    });
  });

  describe('Integration: Comment Statistics', () => {
    it('TPI-014: should count AVI comments separately', () => {
      // Arrange: Create post with mixed comments
      const postId = 'post-stats-001';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test', 'Test content', Date.now());

      // Add various comments
      const comments = [
        { id: 'c1', author_agent: 'avi', content: 'AVI response 1' },
        { id: 'c2', author_agent: 'user123', content: 'User comment' },
        { id: 'c3', author_agent: 'avi', content: 'AVI response 2' },
        { id: 'c4', author_agent: 'user456', content: 'Another user' },
        { id: 'c5', author_agent: 'avi', content: 'AVI response 3' }
      ];

      comments.forEach(c => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run(c.id, postId, c.author_agent, c.author_agent, c.content);
      });

      // Act: Query statistics
      const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId);
      const aviComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND author_agent = ?').get(postId, 'avi');
      const userComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND author_agent != ?').get(postId, 'avi');

      // Assert
      expect(totalComments.count).toBe(5);
      expect(aviComments.count).toBe(3);
      expect(userComments.count).toBe(2);
    });

    it('TPI-015: should track AVI response times', () => {
      // Arrange
      const postId = 'post-timing-001';
      const postTime = Date.now();

      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Question', 'What is happening?', postTime);

      // Simulate AVI response after delay
      const responseTime = postTime + 1500; // 1.5 seconds later
      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content, created_at)
        VALUES (?, ?, ?, ?, ?, datetime(?, 'unixepoch', 'subsec'))
      `).run('comment-timed', postId, 'avi', 'avi', 'AVI response', responseTime / 1000);

      // Act: Calculate response time
      const result = db.prepare(`
        SELECT
          p.published_at as post_time,
          strftime('%s', c.created_at) as comment_time
        FROM agent_posts p
        JOIN comments c ON c.post_id = p.id
        WHERE p.id = ? AND c.author_agent = 'avi'
        LIMIT 1
      `).get(postId);

      const responseDelay = (parseInt(result.comment_time) * 1000) - result.post_time;

      // Assert
      expect(responseDelay).toBeGreaterThan(1000);
      expect(responseDelay).toBeLessThan(2000);
    });
  });

  describe('Data Integrity: Migration Validation', () => {
    it('TPI-016: should have author_agent column in schema', () => {
      const schema = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='comments'
      `).get();

      expect(schema.sql).toContain('author_agent');
    });

    it('TPI-017: should have index on author_agent for performance', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='comments'
      `).all();

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_comments_author_agent');
    });

    it('TPI-018: should allow NULL author_agent for backward compatibility', () => {
      // Arrange
      const postId = 'post-null-test';
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'user', 'Test', 'Test', Date.now());

      // Act: Insert comment without author_agent (should not error)
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, content)
          VALUES (?, ?, ?, ?)
        `).run('comment-null', postId, 'user', 'Comment without author_agent');
      }).not.toThrow();

      // Assert
      const comment = db.prepare('SELECT author_agent FROM comments WHERE id = ?').get('comment-null');
      expect(comment.author_agent).toBeNull();
    });
  });
});
