/**
 * Unit Tests: Comment Database Schema
 *
 * Tests for database schema structure including content_type column,
 * default values, and data integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Comment Schema Unit Tests', () => {
  let db;
  const TEST_DB_PATH = join(__dirname, '../test-data/comment-schema.db');

  beforeAll(() => {
    // Setup test database
    const dbDir = dirname(TEST_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema matching production
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'text',
        author TEXT NOT NULL,
        author_type TEXT DEFAULT 'user',
        parent_id TEXT,
        thread_depth INTEGER DEFAULT 0,
        thread_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (parent_id) REFERENCES comments(id)
      );

      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments(thread_path);
    `);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear test data
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM posts');

    // Insert test post
    db.prepare('INSERT INTO posts (id, title, content) VALUES (?, ?, ?)').run(
      'test-post-1',
      'Test Post',
      'Test content'
    );
  });

  describe('Comments Table Structure', () => {
    it('should have comments table', () => {
      const table = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='comments'
      `).get();

      expect(table).toBeDefined();
      expect(table.name).toBe('comments');
    });

    it('should have content_type column', () => {
      const columns = db.pragma('table_info(comments)');
      const contentTypeColumn = columns.find(col => col.name === 'content_type');

      expect(contentTypeColumn).toBeDefined();
      expect(contentTypeColumn.name).toBe('content_type');
      expect(contentTypeColumn.type).toBe('TEXT');
    });

    it('should have content_type with default value of text', () => {
      const columns = db.pragma('table_info(comments)');
      const contentTypeColumn = columns.find(col => col.name === 'content_type');

      expect(contentTypeColumn).toBeDefined();
      expect(contentTypeColumn.dflt_value).toBe("'text'");
    });

    it('should have all required columns', () => {
      const columns = db.pragma('table_info(comments)');
      const columnNames = columns.map(col => col.name);

      const requiredColumns = [
        'id',
        'post_id',
        'content',
        'content_type',
        'author',
        'author_type',
        'created_at',
        'updated_at'
      ];

      requiredColumns.forEach(colName => {
        expect(columnNames).toContain(colName);
      });
    });

    it('should have primary key on id', () => {
      const columns = db.pragma('table_info(comments)');
      const idColumn = columns.find(col => col.name === 'id');

      expect(idColumn).toBeDefined();
      expect(idColumn.pk).toBe(1); // Primary key indicator
    });

    it('should have NOT NULL constraint on required fields', () => {
      const columns = db.pragma('table_info(comments)');

      const requiredFields = ['id', 'post_id', 'content', 'author'];
      requiredFields.forEach(fieldName => {
        const column = columns.find(col => col.name === fieldName);
        expect(column.notnull).toBe(1); // NOT NULL indicator
      });
    });

    it('should allow NULL for optional fields', () => {
      const columns = db.pragma('table_info(comments)');

      const optionalFields = ['parent_id', 'thread_path'];
      optionalFields.forEach(fieldName => {
        const column = columns.find(col => col.name === fieldName);
        expect(column.notnull).toBe(0); // NULL allowed
      });
    });
  });

  describe('Default Value Behavior', () => {
    it('should apply default content_type=text when not specified', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_type)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run('c1', 'test-post-1', 'Test content', 'user-1', 'user');

      const comment = db.prepare('SELECT content_type FROM comments WHERE id = ?').get('c1');
      expect(comment.content_type).toBe('text');
    });

    it('should apply default author_type=user when not specified', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('c2', 'test-post-1', 'Test content', 'user-1');

      const comment = db.prepare('SELECT author_type FROM comments WHERE id = ?').get('c2');
      expect(comment.author_type).toBe('user');
    });

    it('should apply default thread_depth=0 when not specified', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('c3', 'test-post-1', 'Test content', 'user-1');

      const comment = db.prepare('SELECT thread_depth FROM comments WHERE id = ?').get('c3');
      expect(comment.thread_depth).toBe(0);
    });

    it('should auto-generate created_at timestamp', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('c4', 'test-post-1', 'Test content', 'user-1');

      const comment = db.prepare('SELECT created_at FROM comments WHERE id = ?').get('c4');
      expect(comment.created_at).toBeDefined();
      expect(comment.created_at).not.toBe('');
    });

    it('should auto-generate updated_at timestamp', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('c5', 'test-post-1', 'Test content', 'user-1');

      const comment = db.prepare('SELECT updated_at FROM comments WHERE id = ?').get('c5');
      expect(comment.updated_at).toBeDefined();
      expect(comment.updated_at).not.toBe('');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have foreign key constraint on post_id', () => {
      const foreignKeys = db.pragma('foreign_key_list(comments)');
      const postIdFK = foreignKeys.find(fk => fk.from === 'post_id');

      expect(postIdFK).toBeDefined();
      expect(postIdFK.table).toBe('posts');
      expect(postIdFK.to).toBe('id');
    });

    it('should have foreign key constraint on parent_id', () => {
      const foreignKeys = db.pragma('foreign_key_list(comments)');
      const parentIdFK = foreignKeys.find(fk => fk.from === 'parent_id');

      expect(parentIdFK).toBeDefined();
      expect(parentIdFK.table).toBe('comments');
      expect(parentIdFK.to).toBe('id');
    });

    it('should reject insert with invalid post_id', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, content, author)
          VALUES (?, ?, ?, ?)
        `).run('c-invalid', 'non-existent-post', 'Content', 'user-1');
      }).toThrow();
    });

    it('should allow insert with valid post_id', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      expect(() => {
        stmt.run('c-valid', 'test-post-1', 'Content', 'user-1');
      }).not.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have index on post_id', () => {
      const indexes = db.pragma('index_list(comments)');
      const postIdIndex = indexes.find(idx => idx.name === 'idx_comments_post_id');

      expect(postIdIndex).toBeDefined();
    });

    it('should have index on parent_id', () => {
      const indexes = db.pragma('index_list(comments)');
      const parentIdIndex = indexes.find(idx => idx.name === 'idx_comments_parent_id');

      expect(parentIdIndex).toBeDefined();
    });

    it('should have index on thread_path', () => {
      const indexes = db.pragma('index_list(comments)');
      const threadPathIndex = indexes.find(idx => idx.name === 'idx_comments_thread_path');

      expect(threadPathIndex).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should prevent duplicate IDs', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('duplicate-id', 'test-post-1', 'Content 1', 'user-1');

      expect(() => {
        stmt.run('duplicate-id', 'test-post-1', 'Content 2', 'user-2');
      }).toThrow();
    });

    it('should require id field', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO comments (post_id, content, author)
          VALUES (?, ?, ?)
        `).run('test-post-1', 'Content', 'user-1');
      }).toThrow();
    });

    it('should require post_id field', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, content, author)
          VALUES (?, ?, ?)
        `).run('c-no-post', 'Content', 'user-1');
      }).toThrow();
    });

    it('should require content field', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, author)
          VALUES (?, ?, ?)
        `).run('c-no-content', 'test-post-1', 'user-1');
      }).toThrow();
    });

    it('should require author field', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO comments (id, post_id, content)
          VALUES (?, ?, ?)
        `).run('c-no-author', 'test-post-1', 'Content');
      }).toThrow();
    });
  });

  describe('Existing Comments Verification', () => {
    beforeEach(() => {
      // Insert sample existing comments
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES
          ('existing-1', 'test-post-1', 'Comment 1', 'text', 'user-1', 'user'),
          ('existing-2', 'test-post-1', 'Comment 2', 'markdown', 'agent-avi', 'agent'),
          ('existing-3', 'test-post-1', 'Comment 3', 'text', 'user-2', 'user')
      `).run();
    });

    it('should verify all existing comments have content_type', () => {
      const comments = db.prepare('SELECT * FROM comments').all();

      expect(comments.length).toBeGreaterThan(0);
      comments.forEach(comment => {
        expect(comment.content_type).toBeDefined();
        expect(comment.content_type).not.toBe(null);
      });
    });

    it('should verify content_type is either text or markdown', () => {
      const comments = db.prepare('SELECT * FROM comments').all();

      comments.forEach(comment => {
        expect(['text', 'markdown']).toContain(comment.content_type);
      });
    });

    it('should count comments by content_type', () => {
      const textCount = db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE content_type = 'text'
      `).get();

      const markdownCount = db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE content_type = 'markdown'
      `).get();

      expect(textCount.count).toBe(2);
      expect(markdownCount.count).toBe(1);
    });

    it('should verify no comments have NULL content_type', () => {
      const nullContentTypeComments = db.prepare(`
        SELECT * FROM comments WHERE content_type IS NULL
      `).all();

      expect(nullContentTypeComments).toHaveLength(0);
    });
  });

  describe('Migration Compatibility', () => {
    it('should support adding content_type to existing table', () => {
      // Create a temporary table without content_type (simulating old schema)
      db.exec(`
        CREATE TABLE IF NOT EXISTS old_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          content TEXT NOT NULL,
          author TEXT NOT NULL
        );

        INSERT INTO old_comments (id, post_id, content, author)
        VALUES ('old-1', 'test-post-1', 'Old comment', 'user-old');
      `);

      // Migrate to new schema (this is what a migration would do)
      db.exec(`
        ALTER TABLE old_comments ADD COLUMN content_type TEXT DEFAULT 'text';
      `);

      const oldComment = db.prepare('SELECT * FROM old_comments WHERE id = ?').get('old-1');
      expect(oldComment.content_type).toBe('text');

      // Cleanup
      db.exec('DROP TABLE old_comments');
    });

    it('should handle batch updates of content_type', () => {
      // Insert comments without explicit content_type
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author)
        VALUES ('batch-1', 'test-post-1', 'Batch 1', 'user-1'),
               ('batch-2', 'test-post-1', 'Batch 2', 'user-2'),
               ('batch-3', 'test-post-1', 'Batch 3', 'user-3')
      `).run();

      // Verify all have default text
      const beforeUpdate = db.prepare('SELECT content_type FROM comments WHERE id LIKE ?').all('batch-%');
      expect(beforeUpdate.every(c => c.content_type === 'text')).toBe(true);

      // Batch update some to markdown
      db.prepare(`
        UPDATE comments SET content_type = 'markdown' WHERE id IN ('batch-1', 'batch-2')
      `).run();

      const afterUpdate = db.prepare('SELECT content_type FROM comments WHERE id LIKE ? ORDER BY id').all('batch-%');
      expect(afterUpdate[0].content_type).toBe('markdown');
      expect(afterUpdate[1].content_type).toBe('markdown');
      expect(afterUpdate[2].content_type).toBe('text');
    });
  });
});
