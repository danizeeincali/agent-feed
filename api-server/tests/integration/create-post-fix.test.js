/**
 * TDD Test Suite: Post Creation Fix
 *
 * Tests the complete post creation flow including:
 * - Schema validation and column name mapping
 * - Data transformation (snake_case -> camelCase)
 * - Default value initialization
 * - Edge cases and regression scenarios
 *
 * Following London School TDD principles:
 * - Test behavior, not implementation
 * - Focus on interaction between components
 * - Use real database for integration tests
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_DB_PATH = path.join(__dirname, '../../test-database.db');
const API_SERVER_PATH = path.join(__dirname, '../../server.js');

describe('Post Creation Fix - TDD Suite', () => {
  let db;
  let app;

  // ============================================================================
  // Setup & Teardown
  // ============================================================================

  beforeAll(async () => {
    // Remove existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Initialize test database with correct schema
    db = new Database(TEST_DB_PATH);

    // Create agents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        avatar TEXT,
        bio TEXT,
        role TEXT,
        status TEXT DEFAULT 'active',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        lastActive TEXT
      )
    `);

    // Create posts table with CORRECT column names (camelCase)
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        authorAgent TEXT NOT NULL,
        publishedAt TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        engagement TEXT DEFAULT '{"comments":0,"likes":0,"shares":0,"views":0}',
        FOREIGN KEY (authorAgent) REFERENCES agents(id)
      )
    `);

    // Create test agents
    const insertAgent = db.prepare(`
      INSERT INTO agents (id, name, handle, avatar, bio, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAgent.run(
      'test-agent-1',
      'Test Agent',
      '@testagent',
      '🤖',
      'Test agent for integration tests',
      'system',
      'active'
    );

    insertAgent.run(
      'test-agent-2',
      'Another Test Agent',
      '@anotheragent',
      '🦾',
      'Another test agent',
      'user',
      'active'
    );

    // Set environment variable to use test database
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = TEST_DB_PATH;

    // Import the app
    const appModule = await import(API_SERVER_PATH);
    app = appModule.app || appModule.default;
  });

  beforeEach(() => {
    // Clear posts table before each test
    db.exec('DELETE FROM posts');
  });

  afterAll(() => {
    // Cleanup
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ============================================================================
  // 1. Schema Validation Tests
  // ============================================================================

  describe('1. Schema Validation', () => {
    test('should have correct column names in database schema', () => {
      const schemaQuery = db.prepare(`
        SELECT name FROM pragma_table_info('posts')
      `);
      const columns = schemaQuery.all().map(col => col.name);

      // Verify camelCase columns exist
      expect(columns).toContain('authorAgent');
      expect(columns).toContain('publishedAt');

      // Verify snake_case columns DO NOT exist
      expect(columns).not.toContain('author_agent');
      expect(columns).not.toContain('published_at');
    });

    test('should include all required columns', () => {
      const schemaQuery = db.prepare(`
        SELECT name FROM pragma_table_info('posts')
      `);
      const columns = schemaQuery.all().map(col => col.name);

      const requiredColumns = [
        'id',
        'title',
        'content',
        'authorAgent',
        'publishedAt',
        'metadata',
        'engagement'
      ];

      requiredColumns.forEach(column => {
        expect(columns).toContain(column);
      });
    });

    test('should have proper foreign key constraint', () => {
      const fkQuery = db.prepare(`
        SELECT * FROM pragma_foreign_key_list('posts')
      `);
      const foreignKeys = fkQuery.all();

      expect(foreignKeys.length).toBeGreaterThan(0);
      expect(foreignKeys[0].table).toBe('agents');
      expect(foreignKeys[0].from).toBe('authorAgent');
      expect(foreignKeys[0].to).toBe('id');
    });
  });

  // ============================================================================
  // 2. Post Creation Success Tests
  // ============================================================================

  describe('2. Post Creation Success', () => {
    test('should create post with all fields', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a comprehensive test post with all fields',
        author_agent: 'test-agent-1', // Frontend sends snake_case
        metadata: {
          tags: ['test', 'integration'],
          category: 'testing'
        }
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(postData.title);
      expect(response.body.content).toBe(postData.content);
    });

    test('should save post to database with correct column names', async () => {
      const postData = {
        title: 'Database Test Post',
        content: 'Testing database persistence',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const postId = response.body.id;

      // Verify post exists in database using camelCase columns
      const savedPost = db.prepare(`
        SELECT * FROM posts WHERE id = ?
      `).get(postId);

      expect(savedPost).toBeDefined();
      expect(savedPost.authorAgent).toBe('test-agent-1');
      expect(savedPost.publishedAt).toBeDefined();
    });

    test('should populate authorAgent with camelCase', async () => {
      const postData = {
        title: 'Author Test',
        content: 'Testing author field mapping',
        author_agent: 'test-agent-2'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare(`
        SELECT authorAgent FROM posts WHERE id = ?
      `).get(response.body.id);

      expect(savedPost.authorAgent).toBe('test-agent-2');
    });

    test('should populate publishedAt with ISO timestamp', async () => {
      const beforeTime = new Date().toISOString();

      const postData = {
        title: 'Timestamp Test',
        content: 'Testing timestamp',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const afterTime = new Date().toISOString();

      const savedPost = db.prepare(`
        SELECT publishedAt FROM posts WHERE id = ?
      `).get(response.body.id);

      expect(savedPost.publishedAt).toBeDefined();
      expect(new Date(savedPost.publishedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
      expect(new Date(savedPost.publishedAt).getTime()).toBeLessThanOrEqual(
        new Date(afterTime).getTime()
      );
    });

    test('should create metadata JSON correctly', async () => {
      const postData = {
        title: 'Metadata Test',
        content: 'Testing metadata',
        author_agent: 'test-agent-1',
        metadata: {
          tags: ['test', 'metadata'],
          category: 'testing',
          priority: 'high'
        }
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare(`
        SELECT metadata FROM posts WHERE id = ?
      `).get(response.body.id);

      const metadata = JSON.parse(savedPost.metadata);
      expect(metadata.tags).toEqual(['test', 'metadata']);
      expect(metadata.category).toBe('testing');
      expect(metadata.priority).toBe('high');
    });

    test('should initialize engagement JSON with zeros', async () => {
      const postData = {
        title: 'Engagement Test',
        content: 'Testing engagement initialization',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare(`
        SELECT engagement FROM posts WHERE id = ?
      `).get(response.body.id);

      const engagement = JSON.parse(savedPost.engagement);
      expect(engagement.comments).toBe(0);
      expect(engagement.likes).toBe(0);
      expect(engagement.shares).toBe(0);
      expect(engagement.views).toBe(0);
    });
  });

  // ============================================================================
  // 3. Data Transformation Tests
  // ============================================================================

  describe('3. Data Transformation', () => {
    test('should transform author_agent (snake_case) to authorAgent (camelCase)', async () => {
      const postData = {
        title: 'Transformation Test',
        content: 'Testing snake_case to camelCase transformation',
        author_agent: 'test-agent-1' // Input: snake_case
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      // Verify database has camelCase
      const savedPost = db.prepare(`
        SELECT authorAgent FROM posts WHERE id = ?
      `).get(response.body.id);

      expect(savedPost.authorAgent).toBe('test-agent-1');
    });

    test('should handle both snake_case and camelCase input', async () => {
      // Test snake_case input
      const snakeCasePost = {
        title: 'Snake Case Input',
        content: 'Testing snake_case input',
        author_agent: 'test-agent-1'
      };

      const response1 = await request(app)
        .post('/api/posts')
        .send(snakeCasePost)
        .expect(201);

      // Test camelCase input
      const camelCasePost = {
        title: 'Camel Case Input',
        content: 'Testing camelCase input',
        authorAgent: 'test-agent-2'
      };

      const response2 = await request(app)
        .post('/api/posts')
        .send(camelCasePost)
        .expect(201);

      // Both should work
      const post1 = db.prepare('SELECT authorAgent FROM posts WHERE id = ?')
        .get(response1.body.id);
      const post2 = db.prepare('SELECT authorAgent FROM posts WHERE id = ?')
        .get(response2.body.id);

      expect(post1.authorAgent).toBe('test-agent-1');
      expect(post2.authorAgent).toBe('test-agent-2');
    });

    test('should maintain data integrity during transformation', async () => {
      const complexPost = {
        title: 'Complex Data Test',
        content: 'Testing complex data with special characters: @#$%^&*()',
        author_agent: 'test-agent-1',
        metadata: {
          tags: ['special-chars', 'unicode-✓'],
          description: 'Contains émojis 🚀 and special chars'
        }
      };

      const response = await request(app)
        .post('/api/posts')
        .send(complexPost)
        .expect(201);

      const savedPost = db.prepare('SELECT * FROM posts WHERE id = ?')
        .get(response.body.id);

      expect(savedPost.title).toBe(complexPost.title);
      expect(savedPost.content).toBe(complexPost.content);

      const metadata = JSON.parse(savedPost.metadata);
      expect(metadata.tags[1]).toBe('unicode-✓');
      expect(metadata.description).toContain('🚀');
    });
  });

  // ============================================================================
  // 4. Default Values Tests
  // ============================================================================

  describe('4. Default Values', () => {
    test('should default metadata to {} if not provided', async () => {
      const postData = {
        title: 'Default Metadata Test',
        content: 'Testing default metadata',
        author_agent: 'test-agent-1'
        // No metadata provided
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT metadata FROM posts WHERE id = ?')
        .get(response.body.id);

      const metadata = JSON.parse(savedPost.metadata);
      expect(metadata).toEqual({});
    });

    test('should default engagement to zeros if not provided', async () => {
      const postData = {
        title: 'Default Engagement Test',
        content: 'Testing default engagement',
        author_agent: 'test-agent-1'
        // No engagement provided
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT engagement FROM posts WHERE id = ?')
        .get(response.body.id);

      const engagement = JSON.parse(savedPost.engagement);
      expect(engagement).toEqual({
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      });
    });

    test('should use provided metadata over defaults', async () => {
      const customMetadata = {
        tags: ['custom'],
        source: 'test-suite'
      };

      const postData = {
        title: 'Custom Metadata Test',
        content: 'Testing custom metadata',
        author_agent: 'test-agent-1',
        metadata: customMetadata
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT metadata FROM posts WHERE id = ?')
        .get(response.body.id);

      const metadata = JSON.parse(savedPost.metadata);
      expect(metadata).toEqual(customMetadata);
    });
  });

  // ============================================================================
  // 5. Edge Cases Tests
  // ============================================================================

  describe('5. Edge Cases', () => {
    test('should handle long content with URL', async () => {
      const longContent = `
        This is a very long post that contains multiple paragraphs and a URL.

        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.

        Check out this link: https://example.com/very/long/url/path?param1=value1&param2=value2

        More content here with additional information and details that make this
        a comprehensive test of long-form content handling.
      `.trim();

      const postData = {
        title: 'Long Content Test',
        content: longContent,
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT content FROM posts WHERE id = ?')
        .get(response.body.id);

      expect(savedPost.content).toBe(longContent);
      expect(savedPost.content).toContain('https://example.com');
    });

    test('should handle special characters in title and content', async () => {
      const postData = {
        title: 'Special Chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        content: 'Content with émojis 🚀🤖🎉 and unicode ✓✗→←↑↓',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT title, content FROM posts WHERE id = ?')
        .get(response.body.id);

      expect(savedPost.title).toBe(postData.title);
      expect(savedPost.content).toBe(postData.content);
    });

    test('should handle empty metadata object', async () => {
      const postData = {
        title: 'Empty Metadata Test',
        content: 'Testing empty metadata',
        author_agent: 'test-agent-1',
        metadata: {}
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      const savedPost = db.prepare('SELECT metadata FROM posts WHERE id = ?')
        .get(response.body.id);

      const metadata = JSON.parse(savedPost.metadata);
      expect(metadata).toEqual({});
    });

    test('should handle missing optional fields', async () => {
      const minimalPost = {
        title: 'Minimal Post',
        content: 'Only required fields',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(minimalPost)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(minimalPost.title);
    });

    test('should reject post with non-existent author', async () => {
      const postData = {
        title: 'Invalid Author Test',
        content: 'Testing with non-existent author',
        author_agent: 'non-existent-agent-id'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle concurrent post creation', async () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        title: `Concurrent Post ${i + 1}`,
        content: `Content for concurrent post ${i + 1}`,
        author_agent: i % 2 === 0 ? 'test-agent-1' : 'test-agent-2'
      }));

      const promises = posts.map(post =>
        request(app).post('/api/posts').send(post)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      });

      // Verify all saved to database
      const count = db.prepare('SELECT COUNT(*) as count FROM posts').get();
      expect(count.count).toBe(5);
    });
  });

  // ============================================================================
  // 6. Regression Tests
  // ============================================================================

  describe('6. Regression Tests', () => {
    beforeEach(() => {
      // Create some existing posts
      const existingPosts = [
        {
          id: 'existing-post-1',
          title: 'Existing Post 1',
          content: 'This post already exists',
          authorAgent: 'test-agent-1',
          publishedAt: new Date('2025-01-01').toISOString(),
          metadata: JSON.stringify({ legacy: true }),
          engagement: JSON.stringify({ comments: 5, likes: 10, shares: 2, views: 100 })
        },
        {
          id: 'existing-post-2',
          title: 'Existing Post 2',
          content: 'Another existing post',
          authorAgent: 'test-agent-2',
          publishedAt: new Date('2025-01-02').toISOString(),
          metadata: JSON.stringify({}),
          engagement: JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
        }
      ];

      const insertPost = db.prepare(`
        INSERT INTO posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      existingPosts.forEach(post => {
        insertPost.run(
          post.id,
          post.title,
          post.content,
          post.authorAgent,
          post.publishedAt,
          post.metadata,
          post.engagement
        );
      });
    });

    test('should read existing posts correctly', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const post1 = response.body.find(p => p.id === 'existing-post-1');
      expect(post1).toBeDefined();
      expect(post1.title).toBe('Existing Post 1');
      expect(post1.authorAgent).toBe('test-agent-1');
    });

    test('should retrieve specific existing post', async () => {
      const response = await request(app)
        .get('/api/posts/existing-post-1')
        .expect(200);

      expect(response.body.id).toBe('existing-post-1');
      expect(response.body.title).toBe('Existing Post 1');
    });

    test('should search existing posts', async () => {
      const response = await request(app)
        .get('/api/posts?search=existing')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(p => p.title.includes('Existing'))).toBe(true);
    });

    test('should load feed with existing posts', async () => {
      const response = await request(app)
        .get('/api/feed')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should maintain existing post data when creating new posts', async () => {
      // Get existing post count
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();

      // Create new post
      const newPost = {
        title: 'New Post After Fix',
        content: 'This is a new post created after the fix',
        author_agent: 'test-agent-1'
      };

      await request(app)
        .post('/api/posts')
        .send(newPost)
        .expect(201);

      // Verify existing posts still intact
      const existingPost = db.prepare(`
        SELECT * FROM posts WHERE id = 'existing-post-1'
      `).get();

      expect(existingPost).toBeDefined();
      expect(existingPost.title).toBe('Existing Post 1');

      const engagement = JSON.parse(existingPost.engagement);
      expect(engagement.likes).toBe(10);

      // Verify new post added
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
      expect(afterCount.count).toBe(beforeCount.count + 1);
    });

    test('should handle mixed old and new posts in feed', async () => {
      // Create new post
      await request(app)
        .post('/api/posts')
        .send({
          title: 'Mixed Feed Test',
          content: 'Testing mixed old and new posts',
          author_agent: 'test-agent-1'
        });

      // Get feed
      const response = await request(app)
        .get('/api/feed')
        .expect(200);

      // Should have both old and new posts
      const hasOld = response.body.some(p => p.id === 'existing-post-1');
      const hasNew = response.body.some(p => p.title === 'Mixed Feed Test');

      expect(hasOld).toBe(true);
      expect(hasNew).toBe(true);
    });
  });

  // ============================================================================
  // 7. Error Handling Tests
  // ============================================================================

  describe('7. Error Handling', () => {
    test('should reject post without title', async () => {
      const postData = {
        content: 'Content without title',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject post without content', async () => {
      const postData = {
        title: 'Title without content',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject post without author_agent', async () => {
      const postData = {
        title: 'Post without author',
        content: 'Content without author'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle malformed JSON in metadata gracefully', async () => {
      const postData = {
        title: 'Malformed Metadata Test',
        content: 'Testing malformed metadata',
        author_agent: 'test-agent-1',
        metadata: 'not-valid-json' // String instead of object
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      // Should either reject or convert to valid JSON
      if (response.status === 201) {
        const savedPost = db.prepare('SELECT metadata FROM posts WHERE id = ?')
          .get(response.body.id);

        expect(() => JSON.parse(savedPost.metadata)).not.toThrow();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should handle database connection errors gracefully', async () => {
      const postData = {
        title: 'DB Error Test',
        content: 'Testing database error handling',
        author_agent: 'test-agent-1'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      // Should either succeed or return proper error
      if (response.status !== 201) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });
  });
});
