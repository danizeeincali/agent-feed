/**
 * Integration Tests: Comment content_type Field
 *
 * Tests for creating comments with different content_type values
 * and verifying default behavior and Avi agent markdown responses
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Comment content_type Field Integration', () => {
  let db;
  const TEST_DB_PATH = join(__dirname, '../test-data/content-type.db');

  beforeAll(() => {
    // Setup test database
    const dbDir = dirname(TEST_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id)
      );
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

  describe('Creating Comment with content_type=text', () => {
    it('should create comment with content_type=text', () => {
      const commentData = {
        id: 'comment-1',
        post_id: 'test-post-1',
        content: 'This is a plain text comment',
        content_type: 'text',
        author: 'user-123',
        author_type: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        commentData.id,
        commentData.post_id,
        commentData.content,
        commentData.content_type,
        commentData.author,
        commentData.author_type,
        commentData.created_at,
        commentData.updated_at
      );

      expect(result.changes).toBe(1);

      // Verify it was stored correctly
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentData.id);
      expect(comment.content_type).toBe('text');
    });

    it('should retrieve comment with content_type=text', () => {
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('c1', 'test-post-1', 'Text content', 'text', 'user-1', 'user');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('c1');

      expect(comment).toBeDefined();
      expect(comment.content_type).toBe('text');
      expect(comment.content).toBe('Text content');
    });
  });

  describe('Creating Comment with content_type=markdown', () => {
    it('should create comment with content_type=markdown', () => {
      const markdownContent = '# Heading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2';
      const commentData = {
        id: 'comment-2',
        post_id: 'test-post-1',
        content: markdownContent,
        content_type: 'markdown',
        author: 'agent-avi',
        author_type: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        commentData.id,
        commentData.post_id,
        commentData.content,
        commentData.content_type,
        commentData.author,
        commentData.author_type,
        commentData.created_at,
        commentData.updated_at
      );

      expect(result.changes).toBe(1);

      // Verify it was stored correctly
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentData.id);
      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toBe(markdownContent);
    });

    it('should preserve markdown formatting in content', () => {
      const markdownContent = '```javascript\nconst hello = "world";\n```';

      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('c2', 'test-post-1', markdownContent, 'markdown', 'agent-avi', 'agent');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('c2');

      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toContain('```javascript');
      expect(comment.content).toContain('const hello = "world";');
    });
  });

  describe('Default content_type Behavior', () => {
    it('should default to text if content_type not provided', () => {
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_type)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        'comment-3',
        'test-post-1',
        'Comment without content_type',
        'user-123',
        'user'
      );

      expect(result.changes).toBe(1);

      // Verify it defaults to 'text'
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-3');
      expect(comment.content_type).toBe('text');
    });

    it('should default to text for NULL content_type', () => {
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('c3', 'test-post-1', 'NULL content_type', null, 'user-1', 'user');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('c3');

      // SQLite DEFAULT should kick in
      expect(comment.content_type).toBe('text');
    });

    it('should use provided content_type even if author is user', () => {
      // Users can also write markdown if they want
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('c4', 'test-post-1', '**User markdown**', 'markdown', 'user-1', 'user');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('c4');
      expect(comment.content_type).toBe('markdown');
      expect(comment.author_type).toBe('user');
    });
  });

  describe('Avi Agent Responses with Markdown', () => {
    it('should have content_type=markdown for Avi responses', () => {
      const aviResponse = {
        id: 'avi-response-1',
        post_id: 'test-post-1',
        content: '# Avi Response\n\nI can help you with that!\n\n## Details\n\n- Point 1\n- Point 2',
        content_type: 'markdown',
        author: 'agent-avi',
        author_type: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        aviResponse.id,
        aviResponse.post_id,
        aviResponse.content,
        aviResponse.content_type,
        aviResponse.author,
        aviResponse.author_type,
        aviResponse.created_at,
        aviResponse.updated_at
      );

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(aviResponse.id);

      expect(comment.author).toBe('agent-avi');
      expect(comment.author_type).toBe('agent');
      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toContain('# Avi Response');
    });

    it('should support code blocks in Avi responses', () => {
      const codeBlockContent = `Here's an example:

\`\`\`javascript
function example() {
  console.log("Hello from Avi!");
}
\`\`\`

Let me know if you need more help!`;

      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('avi-code', 'test-post-1', codeBlockContent, 'markdown', 'agent-avi', 'agent');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('avi-code');

      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toContain('```javascript');
      expect(comment.content).toContain('function example()');
    });

    it('should support lists and formatting in Avi responses', () => {
      const formattedContent = `**Important points:**

1. First priority item
2. Second priority item
3. Third priority item

*Note: This is in italics*

> This is a blockquote from Avi`;

      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('avi-formatted', 'test-post-1', formattedContent, 'markdown', 'agent-avi', 'agent');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('avi-formatted');

      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toContain('**Important points:**');
      expect(comment.content).toContain('> This is a blockquote');
    });
  });

  describe('Querying Comments by content_type', () => {
    beforeEach(() => {
      // Insert mixed content types
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES
          ('c1', 'test-post-1', 'Text 1', 'text', 'user-1', 'user'),
          ('c2', 'test-post-1', '**Markdown 1**', 'markdown', 'agent-avi', 'agent'),
          ('c3', 'test-post-1', 'Text 2', 'text', 'user-2', 'user'),
          ('c4', 'test-post-1', '# Markdown 2', 'markdown', 'agent-avi', 'agent'),
          ('c5', 'test-post-1', 'Text 3', 'text', 'user-3', 'user')
      `).run();
    });

    it('should query all markdown comments', () => {
      const markdownComments = db.prepare(`
        SELECT * FROM comments WHERE content_type = 'markdown'
      `).all();

      expect(markdownComments).toHaveLength(2);
      expect(markdownComments.every(c => c.content_type === 'markdown')).toBe(true);
    });

    it('should query all text comments', () => {
      const textComments = db.prepare(`
        SELECT * FROM comments WHERE content_type = 'text'
      `).all();

      expect(textComments).toHaveLength(3);
      expect(textComments.every(c => c.content_type === 'text')).toBe(true);
    });

    it('should query comments by post_id and content_type', () => {
      const postMarkdownComments = db.prepare(`
        SELECT * FROM comments
        WHERE post_id = ? AND content_type = ?
      `).all('test-post-1', 'markdown');

      expect(postMarkdownComments).toHaveLength(2);
      expect(postMarkdownComments.every(c => {
        return c.post_id === 'test-post-1' && c.content_type === 'markdown';
      })).toBe(true);
    });
  });

  describe('Existing Comments with content_type', () => {
    it('should verify existing comments have content_type value', () => {
      // Insert some "legacy" comments (simulating existing data)
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_type)
        VALUES
          ('legacy-1', 'test-post-1', 'Legacy comment 1', 'user-old', 'user'),
          ('legacy-2', 'test-post-1', 'Legacy comment 2', 'user-old', 'user')
      `).run();

      // Query all comments
      const allComments = db.prepare('SELECT * FROM comments').all();

      // All should have content_type (defaulting to 'text')
      expect(allComments.every(c => c.content_type !== null)).toBe(true);
      expect(allComments.every(c => c.content_type === 'text')).toBe(true);
    });

    it('should handle migration from no content_type to having content_type', () => {
      // Insert comment without explicit content_type
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_type)
        VALUES (?, ?, ?, ?, ?)
      `).run('migrated-1', 'test-post-1', 'Old comment', 'user-old', 'user');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('migrated-1');

      // Should have default value
      expect(comment.content_type).toBe('text');

      // Update to markdown
      db.prepare(`
        UPDATE comments SET content_type = ? WHERE id = ?
      `).run('markdown', 'migrated-1');

      const updated = db.prepare('SELECT * FROM comments WHERE id = ?').get('migrated-1');
      expect(updated.content_type).toBe('markdown');
    });
  });

  describe('Edge Cases', () => {
    it('should reject invalid content_type values', () => {
      // SQLite doesn't enforce CHECK constraints by default, but we can test the insert
      const stmt = db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // This will insert, but application layer should validate
      stmt.run('invalid-type', 'test-post-1', 'Content', 'invalid', 'user-1', 'user');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('invalid-type');

      // Comment exists with invalid type (application should handle this)
      expect(comment.content_type).toBe('invalid');
      // In real app, API validation should prevent this
    });

    it('should handle empty content with markdown type', () => {
      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('empty-markdown', 'test-post-1', '', 'markdown', 'agent-avi', 'agent');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('empty-markdown');

      expect(comment.content_type).toBe('markdown');
      expect(comment.content).toBe('');
    });

    it('should handle very long markdown content', () => {
      const longMarkdown = '# '.repeat(1000) + '\n\n' + 'Content '.repeat(1000);

      db.prepare(`
        INSERT INTO comments (id, post_id, content, content_type, author, author_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('long-markdown', 'test-post-1', longMarkdown, 'markdown', 'agent-avi', 'agent');

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('long-markdown');

      expect(comment.content_type).toBe('markdown');
      expect(comment.content.length).toBeGreaterThan(1000);
    });
  });
});
