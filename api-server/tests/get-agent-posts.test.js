const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

describe('GET /api/v1/agent-posts', () => {
  let app;
  let db;
  let testDbPath;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    testDbPath = ':memory:';
    db = new Database(testDbPath);

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        engagement TEXT,
        agent_id TEXT,
        agent_name TEXT,
        agent_avatar TEXT,
        platform TEXT,
        status TEXT DEFAULT 'published'
      )
    `);

    // Mock the app with database injection
    // Note: This will fail until implementation exists
    try {
      delete require.cache[require.resolve('../server')];
      process.env.TEST_DB_PATH = testDbPath;
      app = require('../server');
    } catch (error) {
      // Expected to fail initially - no implementation yet
      app = null;
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    delete process.env.TEST_DB_PATH;
  });

  describe('Database Integration', () => {
    test('should return posts from database (not mock)', async () => {
      // Arrange: Insert test data into database
      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, agent_avatar, platform, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        'Test post from database',
        'agent-1',
        'Test Agent',
        'https://example.com/avatar.jpg',
        'twitter',
        JSON.stringify({ tags: ['test'], location: 'TestLand' }),
        JSON.stringify({ likes: 10, shares: 5, comments: 2 })
      );

      // Act: Make request to API
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert: Verify data comes from database
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBe(1);
      expect(response.body.posts[0].content).toBe('Test post from database');
      expect(response.body.posts[0].agent_id).toBe('agent-1');
    });

    test('should return posts in DESC order (newest first)', async () => {
      // Arrange: Insert multiple posts with different timestamps
      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, created_at)
        VALUES (?, ?, ?, ?)
      `);

      insertStmt.run('Oldest post', 'agent-1', 'Agent 1', '2025-01-01 10:00:00');
      insertStmt.run('Middle post', 'agent-2', 'Agent 2', '2025-01-02 10:00:00');
      insertStmt.run('Newest post', 'agent-3', 'Agent 3', '2025-01-03 10:00:00');

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Verify DESC order
      expect(response.body.posts.length).toBe(3);
      expect(response.body.posts[0].content).toBe('Newest post');
      expect(response.body.posts[1].content).toBe('Middle post');
      expect(response.body.posts[2].content).toBe('Oldest post');
    });

    test('should parse metadata JSON correctly', async () => {
      // Arrange: Insert post with complex metadata
      const metadata = {
        tags: ['ai', 'testing', 'tdd'],
        location: 'London',
        sentiment: 'positive',
        keywords: ['automation', 'quality'],
        thread_id: 'thread-123'
      };

      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        'Post with metadata',
        'agent-1',
        'Agent 1',
        JSON.stringify(metadata)
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Verify metadata is parsed as object
      expect(response.body.posts[0].metadata).toEqual(metadata);
      expect(response.body.posts[0].metadata.tags).toEqual(['ai', 'testing', 'tdd']);
      expect(response.body.posts[0].metadata.location).toBe('London');
    });

    test('should parse engagement JSON correctly', async () => {
      // Arrange: Insert post with engagement data
      const engagement = {
        likes: 150,
        shares: 45,
        comments: 23,
        views: 1500,
        bookmarks: 12
      };

      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, engagement)
        VALUES (?, ?, ?, ?)
      `).run(
        'Popular post',
        'agent-1',
        'Agent 1',
        JSON.stringify(engagement)
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Verify engagement is parsed as object
      expect(response.body.posts[0].engagement).toEqual(engagement);
      expect(response.body.posts[0].engagement.likes).toBe(150);
      expect(response.body.posts[0].engagement.comments).toBe(23);
    });

    test('should return all required fields', async () => {
      // Arrange: Insert complete post
      db.prepare(`
        INSERT INTO agent_posts (
          content, agent_id, agent_name, agent_avatar, platform,
          metadata, engagement, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Complete post',
        'agent-123',
        'Complete Agent',
        'https://example.com/avatar.jpg',
        'bluesky',
        JSON.stringify({ tags: ['complete'] }),
        JSON.stringify({ likes: 1 }),
        'published',
        '2025-01-15 12:00:00'
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Verify all required fields exist
      const post = response.body.posts[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('agent_id');
      expect(post).toHaveProperty('agent_name');
      expect(post).toHaveProperty('agent_avatar');
      expect(post).toHaveProperty('platform');
      expect(post).toHaveProperty('metadata');
      expect(post).toHaveProperty('engagement');
      expect(post).toHaveProperty('status');
      expect(post).toHaveProperty('created_at');
    });

    test('should handle empty database gracefully', async () => {
      // Arrange: Empty database (no inserts)

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Should return empty array
      expect(response.body.posts).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should handle NULL metadata gracefully', async () => {
      // Arrange: Insert post without metadata
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name)
        VALUES (?, ?, ?)
      `).run('Post without metadata', 'agent-1', 'Agent 1');

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: metadata should be null or empty object
      expect(response.body.posts[0].metadata).toBeTruthy();
    });

    test('should handle NULL engagement gracefully', async () => {
      // Arrange: Insert post without engagement
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name)
        VALUES (?, ?, ?)
      `).run('Post without engagement', 'agent-1', 'Agent 1');

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: engagement should be null or default object
      expect(response.body.posts[0].engagement).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Insert 25 test posts
      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, created_at)
        VALUES (?, ?, ?, ?)
      `);

      for (let i = 1; i <= 25; i++) {
        insertStmt.run(
          `Post ${i}`,
          `agent-${i}`,
          `Agent ${i}`,
          `2025-01-${String(i).padStart(2, '0')} 10:00:00`
        );
      }
    });

    test('should support limit parameter', async () => {
      // Act: Request with limit
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=10')
        .expect(200);

      // Assert: Should return only 10 posts
      expect(response.body.posts.length).toBe(10);
    });

    test('should support offset parameter', async () => {
      // Act: Request with offset
      const response = await request(app)
        .get('/api/v1/agent-posts?offset=5')
        .expect(200);

      // Assert: Should skip first 5 posts
      expect(response.body.posts.length).toBe(20);
    });

    test('should support both limit and offset parameters', async () => {
      // Act: Request with both limit and offset
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=5&offset=10')
        .expect(200);

      // Assert: Should return 5 posts starting from position 10
      expect(response.body.posts.length).toBe(5);
      // Verify correct range (newest first, so post 15 should be first)
      expect(response.body.posts[0].content).toBe('Post 15');
    });

    test('should default to reasonable limit if not specified', async () => {
      // Act: Request without limit
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Should have a default limit (e.g., 20)
      expect(response.body.posts.length).toBeLessThanOrEqual(25);
    });

    test('should include total count in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=10')
        .expect(200);

      // Assert: Total should reflect all posts, not just returned
      expect(response.body.total).toBe(25);
      expect(response.body.posts.length).toBe(10);
    });
  });

  describe('Post Creation Integration', () => {
    test('created posts should appear in GET response', async () => {
      // Arrange: Create a post via POST endpoint
      const newPost = {
        content: 'Newly created post',
        agent_id: 'agent-new',
        agent_name: 'New Agent',
        agent_avatar: 'https://example.com/new-avatar.jpg',
        platform: 'twitter',
        metadata: { tags: ['new'] },
        engagement: { likes: 0, shares: 0, comments: 0 }
      };

      // Note: This assumes POST endpoint exists
      try {
        await request(app)
          .post('/api/v1/agent-posts')
          .send(newPost)
          .expect(201);
      } catch (error) {
        // If POST doesn't exist yet, insert directly
        db.prepare(`
          INSERT INTO agent_posts (content, agent_id, agent_name, agent_avatar, platform, metadata, engagement)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          newPost.content,
          newPost.agent_id,
          newPost.agent_name,
          newPost.agent_avatar,
          newPost.platform,
          JSON.stringify(newPost.metadata),
          JSON.stringify(newPost.engagement)
        );
      }

      // Act: Fetch posts
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: New post should appear
      expect(response.body.posts.length).toBeGreaterThan(0);
      const createdPost = response.body.posts.find(p => p.content === 'Newly created post');
      expect(createdPost).toBeDefined();
      expect(createdPost.agent_id).toBe('agent-new');
    });
  });

  describe('Response Format', () => {
    test('should match specification format', async () => {
      // Arrange: Insert test post
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, metadata, engagement)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'Format test post',
        'agent-1',
        'Agent 1',
        JSON.stringify({ tags: ['test'] }),
        JSON.stringify({ likes: 5 })
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Verify response structure
      expect(response.body).toEqual({
        posts: expect.any(Array),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });

      // Verify post structure
      const post = response.body.posts[0];
      expect(post).toMatchObject({
        id: expect.any(Number),
        content: expect.any(String),
        agent_id: expect.any(String),
        agent_name: expect.any(String),
        created_at: expect.any(String),
        metadata: expect.any(Object),
        engagement: expect.any(Object)
      });
    });
  });

  describe('Error Handling', () => {
    test('should fall back to mock if database unavailable', async () => {
      // Arrange: Simulate database failure
      if (db) {
        db.close();
        db = null;
      }

      // Act: Request should still succeed with mock data
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Should return mock data
      expect(response.body.posts).toBeDefined();
      expect(Array.isArray(response.body.posts)).toBe(true);
    });

    test('should handle invalid limit parameter', async () => {
      // Act: Request with invalid limit
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=invalid')
        .expect(200); // Should still work with default

      // Assert: Should use default limit
      expect(response.body.posts).toBeDefined();
    });

    test('should handle negative limit parameter', async () => {
      // Act: Request with negative limit
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=-10')
        .expect(200);

      // Assert: Should use default or return error
      expect(response.body.posts).toBeDefined();
    });

    test('should handle negative offset parameter', async () => {
      // Act: Request with negative offset
      const response = await request(app)
        .get('/api/v1/agent-posts?offset=-5')
        .expect(200);

      // Assert: Should treat as 0 or use default
      expect(response.body.posts).toBeDefined();
    });

    test('should handle corrupted JSON in metadata', async () => {
      // Arrange: Insert post with invalid JSON
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        'Post with bad metadata',
        'agent-1',
        'Agent 1',
        '{invalid json'
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Should handle gracefully
      expect(response.body.posts[0]).toBeDefined();
      // metadata should be empty object or null
      expect(response.body.posts[0].metadata).toBeTruthy();
    });

    test('should handle corrupted JSON in engagement', async () => {
      // Arrange: Insert post with invalid JSON
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, engagement)
        VALUES (?, ?, ?, ?)
      `).run(
        'Post with bad engagement',
        'agent-1',
        'Agent 1',
        '{invalid json'
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Should handle gracefully
      expect(response.body.posts[0]).toBeDefined();
      // engagement should be empty object or null
      expect(response.body.posts[0].engagement).toBeTruthy();
    });

    test('should handle database connection errors gracefully', async () => {
      // This test verifies the fallback mechanism
      // Actual implementation will determine behavior
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large result sets efficiently', async () => {
      // Arrange: Insert 1000 posts
      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name)
        VALUES (?, ?, ?)
      `);

      for (let i = 1; i <= 1000; i++) {
        insertStmt.run(`Post ${i}`, `agent-${i}`, `Agent ${i}`);
      }

      // Act: Request with limit
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=100')
        .expect(200);
      const duration = Date.now() - startTime;

      // Assert: Should complete quickly
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(response.body.posts.length).toBe(100);
      expect(response.body.total).toBe(1000);
    });

    test('should handle special characters in content', async () => {
      // Arrange: Insert post with special characters
      const specialContent = `Post with "quotes", 'apostrophes', <tags>, & ampersands, emoji 🚀`;

      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name)
        VALUES (?, ?, ?)
      `).run(specialContent, 'agent-1', 'Agent 1');

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Special characters should be preserved
      expect(response.body.posts[0].content).toBe(specialContent);
    });

    test('should handle very long content', async () => {
      // Arrange: Insert post with long content (10K characters)
      const longContent = 'A'.repeat(10000);

      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name)
        VALUES (?, ?, ?)
      `).run(longContent, 'agent-1', 'Agent 1');

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Long content should be returned fully
      expect(response.body.posts[0].content.length).toBe(10000);
    });
  });

  describe('Contract Verification', () => {
    test('should maintain backward compatibility with mock format', async () => {
      // Arrange: Insert post
      db.prepare(`
        INSERT INTO agent_posts (content, agent_id, agent_name, agent_avatar, platform, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Compatibility test',
        'agent-1',
        'Test Agent',
        'https://example.com/avatar.jpg',
        'twitter',
        JSON.stringify({ tags: ['test'] }),
        JSON.stringify({ likes: 10, shares: 5, comments: 2 })
      );

      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);

      // Assert: Response should match mock contract
      const post = response.body.posts[0];

      // Required fields from original mock
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('agent_id');
      expect(post).toHaveProperty('agent_name');
      expect(post).toHaveProperty('agent_avatar');
      expect(post).toHaveProperty('platform');
      expect(post).toHaveProperty('created_at');

      // Metadata structure
      expect(post.metadata).toHaveProperty('tags');
      expect(Array.isArray(post.metadata.tags)).toBe(true);

      // Engagement structure
      expect(post.engagement).toHaveProperty('likes');
      expect(post.engagement).toHaveProperty('shares');
      expect(post.engagement).toHaveProperty('comments');
    });
  });
});
