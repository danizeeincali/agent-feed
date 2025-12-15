/**
 * Integration Test: User Name Display System
 *
 * Tests the complete user name display system:
 * - User settings with display names
 * - Comment creation with user_id tracking
 * - Comment queries with joined user display names
 *
 * Real database integration - no mocks
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

describe('User Name Display System', () => {
  let db;

  beforeAll(() => {
    db = new Database('/workspaces/agent-feed/database.db');
  });

  afterAll(() => {
    db.close();
  });

  describe('Database Schema', () => {
    test('user_settings table has display_name column', () => {
      const tableInfo = db.prepare('PRAGMA table_info(user_settings)').all();
      const displayNameColumn = tableInfo.find(col => col.name === 'display_name');

      expect(displayNameColumn).toBeDefined();
      expect(displayNameColumn.type).toBe('TEXT');
    });

    test('comments table has author_user_id column', () => {
      const tableInfo = db.prepare('PRAGMA table_info(comments)').all();
      const authorUserIdColumn = tableInfo.find(col => col.name === 'author_user_id');

      expect(authorUserIdColumn).toBeDefined();
      expect(authorUserIdColumn.type).toBe('TEXT');
    });

    test('index exists on author_user_id', () => {
      const indexes = db.prepare('PRAGMA index_list(comments)').all();
      const authorUserIdIndex = indexes.find(idx => idx.name === 'idx_comments_author_user_id');

      expect(authorUserIdIndex).toBeDefined();
    });
  });

  describe('User Settings', () => {
    test('demo-user-123 has display name "Woz"', () => {
      const user = db.prepare('SELECT user_id, display_name FROM user_settings WHERE user_id = ?')
        .get('demo-user-123');

      expect(user).toBeDefined();
      expect(user.display_name).toBe('Woz');
    });
  });

  describe('Comment Migration', () => {
    test('existing ProductionValidator comments migrated to demo-user-123', () => {
      const comments = db.prepare(
        'SELECT id, author, author_user_id FROM comments WHERE author = ?'
      ).all('ProductionValidator');

      comments.forEach(comment => {
        expect(comment.author_user_id).toBe('demo-user-123');
      });
    });

    test('existing avi comments have author_user_id set to avi', () => {
      const comments = db.prepare(
        'SELECT id, author, author_user_id FROM comments WHERE author = ?'
      ).all('avi');

      comments.forEach(comment => {
        expect(comment.author_user_id).toBe('avi');
      });
    });

    test('all comments have author_user_id populated', () => {
      const result = db.prepare(
        'SELECT COUNT(*) as total, COUNT(author_user_id) as with_user_id FROM comments'
      ).get();

      expect(result.total).toBeGreaterThan(0);
      expect(result.with_user_id).toBe(result.total);
    });
  });

  describe('Comment Queries with User Names', () => {
    test('comments joined with user_settings return display names', () => {
      const comments = db.prepare(`
        SELECT
          c.id,
          c.author,
          c.author_agent,
          c.author_user_id,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.author_user_id = 'demo-user-123'
        LIMIT 5
      `).all();

      expect(comments.length).toBeGreaterThan(0);
      comments.forEach(comment => {
        expect(comment.display_name).toBe('Woz');
        expect(comment.author_user_id).toBe('demo-user-123');
      });
    });

    test('avi comments show avi as display name', () => {
      const comments = db.prepare(`
        SELECT
          c.id,
          c.author,
          c.author_agent,
          c.author_user_id,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.author_user_id = 'avi'
        LIMIT 5
      `).all();

      expect(comments.length).toBeGreaterThan(0);
      comments.forEach(comment => {
        expect(comment.display_name).toBe('avi');
        expect(comment.author_user_id).toBe('avi');
      });
    });

    test('comments without matching user fall back to author field', () => {
      // Create a test post first to satisfy foreign key constraint
      const testPostId = 'test-post-' + Date.now();
      db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        testPostId,
        'TestAgent',
        'Test post content',
        'Test Post',
        new Date().toISOString(),
        JSON.stringify({}),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      // Create a test comment with a non-existent user_id
      const testCommentId = uuidv4();

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, author_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testCommentId, testPostId, 'Test content', 'TestAuthor', 'TestAgent', 'non-existent-user');

      const comment = db.prepare(`
        SELECT
          c.id,
          c.author,
          c.author_user_id,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.id = ?
      `).get(testCommentId);

      expect(comment.display_name).toBe('TestAuthor');

      // Cleanup
      db.prepare('DELETE FROM comments WHERE id = ?').run(testCommentId);
      db.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
    });
  });

  describe('Comment View', () => {
    test('comments_with_user_names view exists', () => {
      const views = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='view' AND name='comments_with_user_names'"
      ).all();

      expect(views.length).toBe(1);
    });

    test('view returns comments with display names', () => {
      const comments = db.prepare(`
        SELECT id, author, author_user_id, display_name
        FROM comments_with_user_names
        WHERE author_user_id = 'demo-user-123'
        LIMIT 5
      `).all();

      expect(comments.length).toBeGreaterThan(0);
      comments.forEach(comment => {
        expect(comment.display_name).toBe('Woz');
      });
    });
  });

  describe('New Comment Creation', () => {
    test('creates comment with user_id and returns display name', () => {
      // Create a test post first to satisfy foreign key constraint
      const testPostId = 'test-post-' + Date.now();
      db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        testPostId,
        'demo-user-123',
        'Test post content',
        'Test Post',
        new Date().toISOString(),
        JSON.stringify({}),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const testCommentId = uuidv4();

      // Create comment
      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, author_agent, author_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testCommentId, testPostId, 'Test comment content', 'Woz', 'demo-user-123', 'demo-user-123');

      // Query with join
      const comment = db.prepare(`
        SELECT
          c.*,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name,
          u.display_name_style
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.id = ?
      `).get(testCommentId);

      expect(comment).toBeDefined();
      expect(comment.author_user_id).toBe('demo-user-123');
      expect(comment.display_name).toBe('Woz');
      expect(comment.content).toBe('Test comment content');

      // Cleanup
      db.prepare('DELETE FROM comments WHERE id = ?').run(testCommentId);
      db.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
    });
  });
});
