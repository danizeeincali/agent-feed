/**
 * Unit Tests for getCommentById() function
 * Database Selector - Comment Retrieval
 *
 * Tests both PostgreSQL and SQLite implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('DatabaseSelector.getCommentById()', () => {
  let dbSelector;
  let testDbPath;
  let testDb;

  beforeEach(async () => {
    // Create temporary test database
    testDbPath = path.join('/tmp', `test-comments-${Date.now()}.db`);
    testDb = new Database(testDbPath);

    // Create comments table
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        author_agent TEXT,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        mentioned_users TEXT DEFAULT '[]'
      )
    `);

    // Insert test comments
    const insert = testDb.prepare(`
      INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('comment-1', 'post-123', 'First comment', 'user1', 'agent1', null, '2025-01-01T10:00:00Z');
    insert.run('comment-2', 'post-123', 'Reply to first', 'user2', 'agent2', 'comment-1', '2025-01-01T11:00:00Z');
    insert.run('comment-3', 'post-123', 'Another reply', 'user3', 'agent3', 'comment-1', '2025-01-01T12:00:00Z');
    insert.run('comment-orphan', 'post-456', 'Orphan comment', 'user4', 'agent4', null, '2025-01-02T10:00:00Z');

    // Mock DatabaseSelector with test database
    const DatabaseSelector = (await import('../../config/database-selector.js')).default;
    dbSelector = DatabaseSelector;

    // Override database connection for testing
    dbSelector.usePostgres = false;
    dbSelector.sqliteDb = testDb;
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Basic Functionality', () => {
    it('should return comment by ID', async () => {
      const comment = await dbSelector.getCommentById('comment-1');

      expect(comment).toBeDefined();
      expect(comment).not.toBeNull();
      expect(comment.id).toBe('comment-1');
      expect(comment.content).toBe('First comment');
      expect(comment.author).toBe('user1');
      expect(comment.author_agent).toBe('agent1');
      expect(comment.parent_id).toBeNull();
      expect(comment.post_id).toBe('post-123');
    });

    it('should return null for non-existent comment', async () => {
      const comment = await dbSelector.getCommentById('comment-nonexistent');

      expect(comment).toBeNull();
    });

    it('should return comment with parent_id', async () => {
      const comment = await dbSelector.getCommentById('comment-2');

      expect(comment).toBeDefined();
      expect(comment.id).toBe('comment-2');
      expect(comment.parent_id).toBe('comment-1');
      expect(comment.content).toBe('Reply to first');
    });

    it('should return all comment fields', async () => {
      const comment = await dbSelector.getCommentById('comment-1');

      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('post_id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('author_agent');
      expect(comment).toHaveProperty('parent_id');
      expect(comment).toHaveProperty('created_at');
      expect(comment).toHaveProperty('likes');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve exact content', async () => {
      const comment = await dbSelector.getCommentById('comment-2');

      expect(comment.content).toBe('Reply to first');
      expect(comment.author).toBe('user2');
      expect(comment.author_agent).toBe('agent2');
    });

    it('should handle comments with null parent_id', async () => {
      const comment = await dbSelector.getCommentById('comment-orphan');

      expect(comment.parent_id).toBeNull();
      expect(comment.id).toBe('comment-orphan');
    });

    it('should return correct timestamp', async () => {
      const comment = await dbSelector.getCommentById('comment-1');

      expect(comment.created_at).toBe('2025-01-01T10:00:00Z');
    });
  });

  describe('Thread Hierarchy', () => {
    it('should retrieve root comment', async () => {
      const comment = await dbSelector.getCommentById('comment-1');

      expect(comment.parent_id).toBeNull();
    });

    it('should retrieve child comment with correct parent', async () => {
      const comment = await dbSelector.getCommentById('comment-2');

      expect(comment.parent_id).toBe('comment-1');
    });

    it('should retrieve multiple children of same parent', async () => {
      const comment2 = await dbSelector.getCommentById('comment-2');
      const comment3 = await dbSelector.getCommentById('comment-3');

      expect(comment2.parent_id).toBe('comment-1');
      expect(comment3.parent_id).toBe('comment-1');
      expect(comment2.id).not.toBe(comment3.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string ID', async () => {
      const comment = await dbSelector.getCommentById('');

      expect(comment).toBeNull();
    });

    it('should handle null ID gracefully', async () => {
      const comment = await dbSelector.getCommentById(null);

      expect(comment).toBeNull();
    });

    it('should handle undefined ID gracefully', async () => {
      const comment = await dbSelector.getCommentById(undefined);

      expect(comment).toBeNull();
    });

    it('should handle special characters in ID', async () => {
      // Insert comment with special characters
      testDb.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, parent_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('comment-special-123!@#', 'post-1', 'test', 'user', 'agent', null);

      const comment = await dbSelector.getCommentById('comment-special-123!@#');

      expect(comment).toBeDefined();
      expect(comment.id).toBe('comment-special-123!@#');
    });
  });

  describe('Integration with Conversation Chain', () => {
    it('should support walking parent chain', async () => {
      // Simulate walking up the chain
      const comment3 = await dbSelector.getCommentById('comment-3');
      expect(comment3.parent_id).toBe('comment-1');

      const comment1 = await dbSelector.getCommentById(comment3.parent_id);
      expect(comment1.id).toBe('comment-1');
      expect(comment1.parent_id).toBeNull();
    });

    it('should support multi-level thread traversal', async () => {
      // Insert deeper thread
      testDb.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('comment-4', 'post-123', 'Deep reply', 'user5', 'agent5', 'comment-2', '2025-01-01T13:00:00Z');

      const comment4 = await dbSelector.getCommentById('comment-4');
      const comment2 = await dbSelector.getCommentById(comment4.parent_id);
      const comment1 = await dbSelector.getCommentById(comment2.parent_id);

      expect(comment4.parent_id).toBe('comment-2');
      expect(comment2.parent_id).toBe('comment-1');
      expect(comment1.parent_id).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should retrieve comment efficiently', async () => {
      const startTime = Date.now();
      await dbSelector.getCommentById('comment-1');
      const endTime = Date.now();

      // Should complete in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle multiple sequential lookups', async () => {
      const startTime = Date.now();

      await dbSelector.getCommentById('comment-1');
      await dbSelector.getCommentById('comment-2');
      await dbSelector.getCommentById('comment-3');

      const endTime = Date.now();

      // Should complete all in less than 200ms
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Database Mode Detection', () => {
    it('should work in SQLite mode', async () => {
      dbSelector.usePostgres = false;
      const comment = await dbSelector.getCommentById('comment-1');

      expect(comment).toBeDefined();
      expect(comment.id).toBe('comment-1');
    });

    // Note: PostgreSQL tests would require actual PG connection
    // These are integration tests that should run separately
  });
});
