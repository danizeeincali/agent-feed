/**
 * TDD Tests: Activity-Based Post Sorting
 *
 * Tests that posts are sorted by most recent activity (post creation OR latest comment)
 *
 * Sort Logic: ORDER BY COALESCE(last_activity_at, created_at) DESC
 *
 * Expected Behavior:
 * - New posts appear at top (sorted by created_at)
 * - Posts with new comments "bump" to top (sorted by comment.created_at)
 * - Posts without comments use created_at for sorting
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// Test database path
const TEST_DB_PATH = ':memory:'; // In-memory database for tests

let app;
let db;

beforeAll(() => {
  // Create test database
  db = new Database(TEST_DB_PATH);

  // Create agent_posts table
  db.exec(`
    CREATE TABLE agent_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      authorAgent TEXT,
      publishedAt TEXT,
      metadata TEXT,
      engagement TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME
    )
  `);

  // Create comments table
  db.exec(`
    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      likes INTEGER DEFAULT 0,
      mentioned_users TEXT DEFAULT '[]',
      FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // Create index for activity-based sorting
  db.exec(`
    CREATE INDEX idx_posts_last_activity ON agent_posts(last_activity_at DESC)
  `);

  // Create trigger to update last_activity_at on comment
  db.exec(`
    CREATE TRIGGER update_post_activity_on_comment
    AFTER INSERT ON comments
    FOR EACH ROW
    BEGIN
      UPDATE agent_posts
      SET last_activity_at = NEW.created_at
      WHERE id = NEW.post_id
        AND (last_activity_at IS NULL OR NEW.created_at > datetime(last_activity_at));
    END
  `);

  // Setup Express app for testing
  app = express();
  app.use(express.json());

  // GET /api/v1/agent-posts endpoint
  app.get('/api/v1/agent-posts', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100'
        });
      }

      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Database not initialized'
        });
      }

      const countResult = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();
      const total = countResult.total;

      const posts = db.prepare(`
        SELECT
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at, last_activity_at,
          CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count
        FROM agent_posts
        ORDER BY
          datetime(COALESCE(last_activity_at, created_at)) DESC,  -- Most recent activity
          id ASC                                                    -- Tiebreaker
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const transformedPosts = posts.map(post => ({
        ...post,
        metadata: JSON.parse(post.metadata || '{}'),
        engagement: JSON.parse(post.engagement || '{}')
      }));

      return res.json({
        success: true,
        data: transformedPosts,
        meta: {
          total,
          limit,
          offset,
          source: null
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: error.message
      });
    }
  });

  // POST /api/agent-posts/:postId/comments endpoint
  app.post('/api/agent-posts/:postId/comments', (req, res) => {
    try {
      const { postId } = req.params;
      const { content, author } = req.body;

      if (!content || !author) {
        return res.status(400).json({
          success: false,
          error: 'Content and author are required'
        });
      }

      const commentId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO comments (id, post_id, content, author, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, postId, content, author, now);

      // Trigger automatically updates agent_posts.last_activity_at

      // Update comment count in engagement JSON
      const post = db.prepare('SELECT engagement FROM agent_posts WHERE id = ?').get(postId);
      const engagement = JSON.parse(post.engagement);
      engagement.comments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

      db.prepare('UPDATE agent_posts SET engagement = ? WHERE id = ?').run(JSON.stringify(engagement), postId);

      return res.json({
        success: true,
        data: { id: commentId, post_id: postId, content, author, created_at: now },
        message: 'Comment created successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create comment',
        details: error.message
      });
    }
  });
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

afterEach(() => {
  // Clean up after each test
  db.prepare('DELETE FROM comments').run();
  db.prepare('DELETE FROM agent_posts').run();
});

// Helper function to create test post
function createPost({ id, title, created_at, comment_count = 0 }) {
  const engagement = JSON.stringify({ comments: comment_count, shares: 0, views: 0, saves: 0, reactions: {}, stars: { average: 0, count: 0, distribution: {} }, isSaved: false });
  const metadata = JSON.stringify({});

  db.prepare(`
    INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement, created_at, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, 'Test content', 'test-agent', created_at, metadata, engagement, created_at, created_at);

  return { id, title, created_at, comment_count };
}

// Helper function to add comment to post
function addComment(postId, content, author, created_at) {
  const commentId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO comments (id, post_id, content, author, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, postId, content, author, created_at);

  return { id: commentId, post_id: postId, content, author, created_at };
}

describe('Activity-Based Post Sorting', () => {
  describe('Basic Chronological Sorting (No Comments)', () => {
    test('New post appears before older post', async () => {
      // Arrange
      createPost({ id: 'old-post', title: 'Old Post', created_at: '2025-10-01T10:00:00Z', comment_count: 0 });
      createPost({ id: 'new-post', title: 'New Post', created_at: '2025-10-03T10:00:00Z', comment_count: 0 });

      // Act
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].id).toBe('new-post'); // Newest first
      expect(response.body.data[1].id).toBe('old-post');
    });

    test('Three posts appear in reverse chronological order', async () => {
      // Arrange
      createPost({ id: 'post-1', title: 'Post 1', created_at: '2025-10-01T10:00:00Z' });
      createPost({ id: 'post-2', title: 'Post 2', created_at: '2025-10-02T10:00:00Z' });
      createPost({ id: 'post-3', title: 'Post 3', created_at: '2025-10-03T10:00:00Z' });

      // Act
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert
      expect(response.body.data[0].id).toBe('post-3'); // Newest
      expect(response.body.data[1].id).toBe('post-2');
      expect(response.body.data[2].id).toBe('post-1'); // Oldest
    });
  });

  describe('Comment "Bump" Behavior', () => {
    test('Old post with new comment bumps to top', async () => {
      // Arrange: Create posts
      createPost({ id: 'old-post', title: 'Old Post', created_at: '2025-10-01T10:00:00Z' });
      createPost({ id: 'recent-post', title: 'Recent Post', created_at: '2025-10-03T10:00:00Z' });

      // Act: Add comment to old post (makes it more recent)
      addComment('old-post', 'New comment', 'test-user', '2025-10-03T12:00:00Z');

      // Fetch posts
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Old post with new comment should be first
      expect(response.body.data[0].id).toBe('old-post'); // BUMPED to top!
      expect(response.body.data[0].last_activity_at).toBe('2025-10-03T12:00:00Z');
      expect(response.body.data[1].id).toBe('recent-post'); // Without comment, older activity
    });

    test('Multiple comments: only latest comment time matters', async () => {
      // Arrange
      createPost({ id: 'post-1', title: 'Post 1', created_at: '2025-10-01T10:00:00Z' });

      // Act: Add 3 comments at different times
      addComment('post-1', 'Comment 1', 'user1', '2025-10-02T10:00:00Z');
      addComment('post-1', 'Comment 2', 'user2', '2025-10-03T10:00:00Z');
      addComment('post-1', 'Comment 3', 'user3', '2025-10-04T10:00:00Z'); // Latest

      // Fetch post
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: last_activity_at should be the LATEST comment time
      expect(response.body.data[0].id).toBe('post-1');
      expect(response.body.data[0].last_activity_at).toBe('2025-10-04T10:00:00Z'); // Latest comment
    });

    test('Post with comment beats newer post without comment', async () => {
      // Arrange
      createPost({ id: 'post-with-comment', title: 'Post With Comment', created_at: '2025-10-01T10:00:00Z' });
      createPost({ id: 'newer-post-no-comment', title: 'Newer Post No Comment', created_at: '2025-10-02T10:00:00Z' });

      // Act: Add comment to older post at time AFTER newer post
      addComment('post-with-comment', 'New comment', 'user', '2025-10-03T10:00:00Z');

      // Fetch
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Post with comment should be first (most recent activity)
      expect(response.body.data[0].id).toBe('post-with-comment'); // Activity: Oct 3
      expect(response.body.data[1].id).toBe('newer-post-no-comment'); // Activity: Oct 2
    });
  });

  describe('Trigger Verification', () => {
    test('Adding comment updates last_activity_at automatically', async () => {
      // Arrange
      createPost({ id: 'test-post', title: 'Test Post', created_at: '2025-10-01T10:00:00Z' });

      // Verify initial state
      let post = db.prepare('SELECT last_activity_at FROM agent_posts WHERE id = ?').get('test-post');
      expect(post.last_activity_at).toBe('2025-10-01T10:00:00Z'); // Same as created_at

      // Act: Add comment via API
      await request(app)
        .post('/api/agent-posts/test-post/comments')
        .send({ content: 'Test comment', author: 'test-user' });

      // Assert: last_activity_at should be updated by trigger
      post = db.prepare('SELECT last_activity_at FROM agent_posts WHERE id = ?').get('test-post');
      expect(post.last_activity_at).not.toBe('2025-10-01T10:00:00Z'); // Updated!
      expect(new Date(post.last_activity_at).getTime()).toBeGreaterThan(new Date('2025-10-01T10:00:00Z').getTime());
    });

    test('Trigger only updates if new comment is NEWER than last_activity_at', async () => {
      // Arrange
      createPost({ id: 'test-post', title: 'Test Post', created_at: '2025-10-03T10:00:00Z' });

      // Add comment at time BEFORE post creation
      addComment('test-post', 'Old comment', 'user', '2025-10-01T10:00:00Z');

      // Assert: last_activity_at should NOT be updated (comment is older)
      const post = db.prepare('SELECT last_activity_at FROM agent_posts WHERE id = ?').get('test-post');
      expect(post.last_activity_at).toBe('2025-10-03T10:00:00Z'); // Still post creation time
    });
  });

  describe('Mixed Scenarios', () => {
    test('Complex scenario: 3 posts with different activity patterns', async () => {
      // Arrange: Create 3 posts
      createPost({ id: 'post-a', title: 'Post A', created_at: '2025-10-01T10:00:00Z' }); // Oldest
      createPost({ id: 'post-b', title: 'Post B', created_at: '2025-10-02T10:00:00Z' });
      createPost({ id: 'post-c', title: 'Post C', created_at: '2025-10-03T10:00:00Z' }); // Newest

      // Act: Add comments
      addComment('post-a', 'Comment on A', 'user', '2025-10-04T10:00:00Z'); // Makes Post A most recent

      // Fetch
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Order should be A (comment Oct 4), C (post Oct 3), B (post Oct 2)
      expect(response.body.data[0].id).toBe('post-a'); // Most recent activity (comment Oct 4)
      expect(response.body.data[1].id).toBe('post-c'); // Second most recent (post Oct 3)
      expect(response.body.data[2].id).toBe('post-b'); // Oldest activity (post Oct 2)
    });

    test('User creates new post - stays at top after 1 second', async () => {
      // Arrange: Create some old posts
      createPost({ id: 'old-1', title: 'Old Post 1', created_at: '2025-10-01T10:00:00Z', comment_count: 5 });
      createPost({ id: 'old-2', title: 'Old Post 2', created_at: '2025-10-02T10:00:00Z', comment_count: 10 });

      // Act: User creates new post (NOW)
      const now = new Date().toISOString();
      createPost({ id: 'user-new-post', title: 'User New Post', created_at: now, comment_count: 0 });

      // Wait 1 second (simulate frontend refresh)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch posts (simulating API refresh)
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: New post should STILL be at top (not buried by comment count)
      expect(response.body.data[0].id).toBe('user-new-post'); // ✅ Still at top!
      expect(response.body.data[0].engagement.comments).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('Posts created at exact same millisecond: sorted by ID', async () => {
      // Arrange
      const sameTime = '2025-10-03T10:00:00.123Z';
      createPost({ id: 'post-aaa', title: 'Post AAA', created_at: sameTime });
      createPost({ id: 'post-zzz', title: 'Post ZZZ', created_at: sameTime });

      // Act
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Sorted by ID ASC (tiebreaker)
      expect(response.body.data[0].id).toBe('post-aaa'); // Lower ID first
      expect(response.body.data[1].id).toBe('post-zzz');
    });

    test('Post without last_activity_at falls back to created_at', async () => {
      // Arrange: Manually insert post without last_activity_at
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement, created_at, last_activity_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('post-no-activity', 'Post No Activity', 'Test', 'agent', '2025-10-03T10:00:00Z', '{}', '{"comments":0}', '2025-10-03T10:00:00Z', null);

      createPost({ id: 'post-with-activity', title: 'Post With Activity', created_at: '2025-10-02T10:00:00Z' });

      // Act
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Post without last_activity_at should use created_at (COALESCE)
      expect(response.body.data[0].id).toBe('post-no-activity'); // Oct 3 (created_at)
      expect(response.body.data[1].id).toBe('post-with-activity'); // Oct 2
    });
  });

  describe('API Response Validation', () => {
    test('API returns posts in correct order immediately after creation', async () => {
      // Act: Create posts in specific order
      createPost({ id: 'post-1', title: 'Post 1', created_at: '2025-10-01T10:00:00Z' });
      createPost({ id: 'post-2', title: 'Post 2', created_at: '2025-10-02T10:00:00Z' });
      createPost({ id: 'post-3', title: 'Post 3', created_at: '2025-10-03T10:00:00Z' });

      // Fetch immediately
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: API should return correct order immediately
      expect(response.body.success).toBe(true);
      expect(response.body.meta.source).toBeNull(); // Real data, not mock
      expect(response.body.data[0].title).toBe('Post 3');
      expect(response.body.data[1].title).toBe('Post 2');
      expect(response.body.data[2].title).toBe('Post 1');
    });

    test('Comment count does NOT affect sort order (only activity time)', async () => {
      // Arrange: Create posts with different comment counts
      createPost({ id: 'many-comments', title: 'Many Comments', created_at: '2025-10-01T10:00:00Z', comment_count: 100 });
      createPost({ id: 'no-comments', title: 'No Comments', created_at: '2025-10-03T10:00:00Z', comment_count: 0 });

      // Act
      const response = await request(app).get('/api/v1/agent-posts?limit=10');

      // Assert: Newer post (0 comments) should be first
      expect(response.body.data[0].id).toBe('no-comments'); // Newer activity
      expect(response.body.data[1].id).toBe('many-comments'); // Older activity (despite 100 comments)
    });
  });
});

describe('Performance & Regression Tests', () => {
  test('Query performance with 100 posts', async () => {
    // Arrange: Create 100 posts
    for (let i = 0; i < 100; i++) {
      const created_at = new Date(Date.now() - i * 1000 * 60).toISOString(); // 1 minute apart
      createPost({
        id: `post-${i}`,
        title: `Post ${i}`,
        created_at,
        comment_count: Math.floor(Math.random() * 10)
      });
    }

    // Act: Measure query time
    const start = Date.now();
    const response = await request(app).get('/api/v1/agent-posts?limit=10');
    const duration = Date.now() - start;

    // Assert: Query should complete in < 100ms
    expect(duration).toBeLessThan(100);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(10);
  });

  test('No regression: Frontend still works (no breaking changes)', async () => {
    // Arrange
    createPost({ id: 'test-post', title: 'Test Post', created_at: '2025-10-03T10:00:00Z' });

    // Act
    const response = await request(app).get('/api/v1/agent-posts?limit=10');

    // Assert: API contract unchanged
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.data[0]).toHaveProperty('id');
    expect(response.body.data[0]).toHaveProperty('title');
    expect(response.body.data[0]).toHaveProperty('created_at');
    expect(response.body.data[0]).toHaveProperty('engagement');
  });
});
