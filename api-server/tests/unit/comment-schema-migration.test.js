/**
 * Comment Schema Migration Tests - TDD London School
 *
 * Migration Focus:
 * - author_agent column addition
 * - Data migration from author to author_agent
 * - Backward compatibility preservation
 * - Index creation for performance
 *
 * London School Approach:
 * - Test migration behavior contracts
 * - Verify data integrity across migration
 * - Focus on collaboration between old and new schema
 * - Ensure no breaking changes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '../../../data/test-comment-migration.db');

describe('Comment Schema Migration Tests', () => {
  let db;

  beforeAll(() => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Reset database for each test
    db.exec('DROP TABLE IF EXISTS comments');
    db.exec('DROP TABLE IF EXISTS agent_posts');
  });

  describe('Contract: Pre-Migration Schema', () => {
    it('TCSM-001: should have original schema without author_agent', () => {
      // Arrange: Create original schema
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          parent_id TEXT,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          mentioned_users TEXT DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );
      `);

      // Act: Query schema
      const schema = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='comments'
      `).get();

      // Assert: Should NOT have author_agent
      expect(schema.sql).toContain('author TEXT NOT NULL');
      expect(schema.sql).not.toContain('author_agent');
    });

    it('TCSM-002: should have existing comments with only author field', () => {
      // Arrange: Create original schema and data
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );
      `);

      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      db.prepare(`
        INSERT INTO comments (id, post_id, author, content)
        VALUES (?, ?, ?, ?)
      `).run('comment-1', 'post-1', 'link-logger-agent', 'Test comment');

      // Act: Query comment
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');

      // Assert
      expect(comment.author).toBe('link-logger-agent');
      expect(comment).not.toHaveProperty('author_agent');
    });
  });

  describe('Interaction: Migration Execution', () => {
    beforeEach(() => {
      // Setup pre-migration state
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );
      `);

      // Insert test data
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      const testComments = [
        { id: 'c1', author: 'link-logger-agent', content: 'Comment 1' },
        { id: 'c2', author: 'user123', content: 'Comment 2' },
        { id: 'c3', author: 'avi', content: 'Comment 3' },
        { id: 'c4', author: 'proactive-agent', content: 'Comment 4' }
      ];

      testComments.forEach(c => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, content)
          VALUES (?, ?, ?, ?)
        `).run(c.id, 'post-1', c.author, c.content);
      });
    });

    it('TCSM-003: should add author_agent column successfully', () => {
      // Act: Apply migration
      db.exec('ALTER TABLE comments ADD COLUMN author_agent TEXT');

      // Assert: Column should exist
      const schema = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='comments'
      `).get();

      expect(schema.sql).toContain('author_agent TEXT');
    });

    it('TCSM-004: should migrate existing data from author to author_agent', () => {
      // Arrange: Add column
      db.exec('ALTER TABLE comments ADD COLUMN author_agent TEXT');

      // Act: Migrate data
      db.exec('UPDATE comments SET author_agent = author WHERE author_agent IS NULL');

      // Assert: All comments should have author_agent populated
      const nullCount = db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE author_agent IS NULL
      `).get();

      expect(nullCount.count).toBe(0);
    });

    it('TCSM-005: should preserve author data during migration', () => {
      // Arrange
      const beforeComments = db.prepare('SELECT id, author FROM comments ORDER BY id').all();

      // Act: Apply migration
      db.exec('ALTER TABLE comments ADD COLUMN author_agent TEXT');
      db.exec('UPDATE comments SET author_agent = author WHERE author_agent IS NULL');

      // Assert: author values should remain unchanged
      const afterComments = db.prepare('SELECT id, author FROM comments ORDER BY id').all();

      expect(afterComments).toEqual(beforeComments);
    });

    it('TCSM-006: should copy exact values from author to author_agent', () => {
      // Act: Apply migration
      db.exec('ALTER TABLE comments ADD COLUMN author_agent TEXT');
      db.exec('UPDATE comments SET author_agent = author WHERE author_agent IS NULL');

      // Assert: Values should match exactly
      const comments = db.prepare(`
        SELECT author, author_agent FROM comments
      `).all();

      comments.forEach(c => {
        expect(c.author_agent).toBe(c.author);
      });
    });

    it('TCSM-007: should create index on author_agent for performance', () => {
      // Arrange: Complete migration
      db.exec('ALTER TABLE comments ADD COLUMN author_agent TEXT');
      db.exec('UPDATE comments SET author_agent = author');

      // Act: Create index
      db.exec('CREATE INDEX idx_comments_author_agent ON comments(author_agent)');

      // Assert: Index should exist
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='comments'
      `).all();

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_comments_author_agent');
    });
  });

  describe('Contract: Post-Migration Schema', () => {
    beforeEach(() => {
      // Setup post-migration state
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          author_agent TEXT,
          content TEXT NOT NULL,
          mentioned_users TEXT DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );

        CREATE INDEX idx_comments_author_agent ON comments(author_agent);
      `);
    });

    it('TCSM-008: should accept both author and author_agent in inserts', () => {
      // Arrange
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      // Act: Insert with both fields
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run('comment-1', 'post-1', 'avi', 'avi', 'Test comment');
      }).not.toThrow();

      // Assert
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-1');
      expect(comment.author).toBe('avi');
      expect(comment.author_agent).toBe('avi');
    });

    it('TCSM-009: should allow NULL author_agent for backward compatibility', () => {
      // Arrange
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      // Act: Insert without author_agent (legacy code)
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, content)
          VALUES (?, ?, ?, ?)
        `).run('comment-legacy', 'post-1', 'user123', 'Legacy comment');
      }).not.toThrow();

      // Assert
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-legacy');
      expect(comment.author).toBe('user123');
      expect(comment.author_agent).toBeNull();
    });

    it('TCSM-010: should query efficiently using author_agent index', () => {
      // Arrange: Insert test data
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      for (let i = 0; i < 100; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `comment-${i}`,
          'post-1',
          i % 3 === 0 ? 'avi' : 'user',
          i % 3 === 0 ? 'avi' : 'user',
          `Comment ${i}`
        );
      }

      // Act: Query with EXPLAIN QUERY PLAN
      const queryPlan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM comments WHERE author_agent = 'avi'
      `).all();

      // Assert: Should use index
      const planStr = queryPlan.map(p => p.detail).join(' ');
      expect(planStr).toContain('idx_comments_author_agent');
    });
  });

  describe('Behavior Verification: Dual-Field Operations', () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          author_agent TEXT,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );
      `);

      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());
    });

    it('TCSM-011: should filter by author_agent when provided', () => {
      // Arrange: Insert mixed comments
      db.prepare(`INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('c1', 'post-1', 'avi', 'avi', 'AVI comment 1');

      db.prepare(`INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('c2', 'post-1', 'user', 'user', 'User comment');

      db.prepare(`INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('c3', 'post-1', 'avi', 'avi', 'AVI comment 2');

      // Act: Query by author_agent
      const aviComments = db.prepare(`
        SELECT * FROM comments WHERE author_agent = ?
      `).all('avi');

      // Assert
      expect(aviComments).toHaveLength(2);
      aviComments.forEach(c => {
        expect(c.author_agent).toBe('avi');
      });
    });

    it('TCSM-012: should fallback to author when author_agent is NULL', () => {
      // Arrange: Insert legacy comment
      db.prepare(`INSERT INTO comments (id, post_id, author, content)
        VALUES (?, ?, ?, ?)
      `).run('c1', 'post-1', 'legacy-user', 'Legacy comment');

      // Act: Query using COALESCE
      const comments = db.prepare(`
        SELECT
          id,
          COALESCE(author_agent, author) as effective_author
        FROM comments
        WHERE COALESCE(author_agent, author) = ?
      `).all('legacy-user');

      // Assert
      expect(comments).toHaveLength(1);
      expect(comments[0].effective_author).toBe('legacy-user');
    });

    it('TCSM-013: should support updating author_agent independently', () => {
      // Arrange: Insert comment with both fields
      db.prepare(`INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('c1', 'post-1', 'old-author', 'old-agent', 'Comment');

      // Act: Update only author_agent
      db.prepare(`UPDATE comments SET author_agent = ? WHERE id = ?`)
        .run('new-agent', 'c1');

      // Assert: author should remain unchanged
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('c1');
      expect(comment.author).toBe('old-author');
      expect(comment.author_agent).toBe('new-agent');
    });
  });

  describe('Data Integrity: Validation and Constraints', () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          author_agent TEXT,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE
        );
      `);
    });

    it('TCSM-014: should still require author field', () => {
      // Arrange
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      // Act & Assert: Should fail without author
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author_agent, content)
          VALUES (?, ?, ?, ?)
        `).run('c1', 'post-1', 'avi', 'Comment');
      }).toThrow();
    });

    it('TCSM-015: should enforce foreign key on post_id', () => {
      // Act & Assert: Should fail with invalid post_id
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run('c1', 'non-existent-post', 'user', 'user', 'Comment');
      }).toThrow();
    });

    it('TCSM-016: should cascade delete comments when post is deleted', () => {
      // Arrange
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());

      db.prepare(`
        INSERT INTO comments (id, post_id, author, author_agent, content)
        VALUES (?, ?, ?, ?, ?)
      `).run('c1', 'post-1', 'user', 'user', 'Comment');

      // Act: Delete post
      db.prepare('DELETE FROM agent_posts WHERE id = ?').run('post-1');

      // Assert: Comment should be deleted
      const comments = db.prepare('SELECT * FROM comments WHERE id = ?').all('c1');
      expect(comments).toHaveLength(0);
    });
  });

  describe('Performance: Index Effectiveness', () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE agent_posts (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );

        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author TEXT NOT NULL,
          author_agent TEXT,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES agent_posts(id)
        );

        CREATE INDEX idx_comments_author_agent ON comments(author_agent);
      `);

      // Insert test post
      db.prepare(`
        INSERT INTO agent_posts (id, agent_id, title, content, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', 'user', 'Test', 'Content', Date.now());
    });

    it('TCSM-017: should use index for equality queries', () => {
      // Arrange: Insert data
      for (let i = 0; i < 50; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run(`c${i}`, 'post-1', 'user', i % 5 === 0 ? 'avi' : 'user', 'Content');
      }

      // Act: Explain query
      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM comments WHERE author_agent = 'avi'
      `).all();

      // Assert
      const usesIndex = plan.some(p =>
        p.detail.includes('idx_comments_author_agent')
      );
      expect(usesIndex).toBe(true);
    });

    it('TCSM-018: should support efficient IN queries on author_agent', () => {
      // Arrange
      const agents = ['avi', 'link-logger-agent', 'proactive-agent'];
      for (let i = 0; i < 30; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author, author_agent, content)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `c${i}`,
          'post-1',
          'user',
          agents[i % agents.length],
          'Content'
        );
      }

      // Act: Query with IN clause
      const results = db.prepare(`
        SELECT * FROM comments
        WHERE author_agent IN ('avi', 'link-logger-agent')
      `).all();

      // Assert
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(['avi', 'link-logger-agent']).toContain(r.author_agent);
      });
    });
  });
});
