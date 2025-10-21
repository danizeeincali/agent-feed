/**
 * Integration Tests for Database Selector Column Names
 *
 * TDD London School Approach - Outside-In Testing
 *
 * These tests verify:
 * 1. Database queries execute without column name errors
 * 2. Results use correct camelCase naming conventions
 * 3. Data is properly ordered by publishedAt
 * 4. All expected columns are present and correctly typed
 * 5. API endpoints work with the database layer
 * 6. Frontend can successfully connect and retrieve data
 *
 * Tests use REAL database, REAL data, NO MOCKS
 *
 * Expected to FAIL initially due to column name mismatches (published_at vs publishedAt)
 * Will PASS after fixing the SELECT query to use proper aliases
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');

// Import the database selector module
const dbSelector = require('../../backend/services/database-selector');

describe('Database Selector Column Names Integration Tests', () => {
  let db;
  let dbAll;
  let dbGet;
  let dbRun;

  beforeAll(async () => {
    // Initialize the database selector
    await dbSelector.initialize();

    // Connect to the real database for direct queries
    const dbPath = path.join(__dirname, '../../data/agent-pages.db');
    db = new sqlite3.Database(dbPath);

    // Promisify database methods
    dbAll = promisify(db.all.bind(db));
    dbGet = promisify(db.get.bind(db));
    dbRun = promisify(db.run.bind(db));
  });

  afterAll(async () => {
    // Close database selector
    await dbSelector.close();

    // Close direct database connection
    if (db) {
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });

  describe('getAllPosts() - Query Execution and Column Names', () => {
    test('should execute query without column name errors', async () => {
      // This will fail if column names don't match (published_at vs publishedAt)
      await expect(dbSelector.getAllPosts()).resolves.not.toThrow();
    });

    test('should return posts ordered by publishedAt descending', async () => {
      const posts = await dbSelector.getAllPosts();

      expect(Array.isArray(posts)).toBe(true);

      if (posts.length > 1) {
        // Verify descending order
        for (let i = 0; i < posts.length - 1; i++) {
          const currentDate = new Date(posts[i].publishedAt);
          const nextDate = new Date(posts[i + 1].publishedAt);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('should return posts with correct camelCase column names', async () => {
      const posts = await dbSelector.getAllPosts();

      if (posts.length > 0) {
        const post = posts[0];

        // Verify camelCase naming convention
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('agentName');
        expect(post).toHaveProperty('agentTitle');
        expect(post).toHaveProperty('agentAvatar');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('publishedAt');
        expect(post).toHaveProperty('likes');
        expect(post).toHaveProperty('shares');
        expect(post).toHaveProperty('comments');
        expect(post).toHaveProperty('imageUrl');
        expect(post).toHaveProperty('category');
        expect(post).toHaveProperty('outcomes');

        // Verify NO snake_case columns exist
        expect(post).not.toHaveProperty('agent_name');
        expect(post).not.toHaveProperty('agent_title');
        expect(post).not.toHaveProperty('agent_avatar');
        expect(post).not.toHaveProperty('published_at');
        expect(post).not.toHaveProperty('image_url');
      }
    });

    test('should return posts with correct data types', async () => {
      const posts = await dbSelector.getAllPosts();

      if (posts.length > 0) {
        const post = posts[0];

        expect(typeof post.id).toBe('number');
        expect(typeof post.agentName).toBe('string');
        expect(typeof post.agentTitle).toBe('string');
        expect(typeof post.content).toBe('string');
        expect(typeof post.publishedAt).toBe('string');
        expect(typeof post.likes).toBe('number');
        expect(typeof post.shares).toBe('number');
        expect(typeof post.comments).toBe('number');
        expect(typeof post.category).toBe('string');

        // Optional fields
        if (post.agentAvatar !== null) {
          expect(typeof post.agentAvatar).toBe('string');
        }
        if (post.imageUrl !== null) {
          expect(typeof post.imageUrl).toBe('string');
        }
        if (post.outcomes !== null) {
          expect(typeof post.outcomes).toBe('string');
        }
      }
    });

    test('should return publishedAt as valid ISO 8601 date string', async () => {
      const posts = await dbSelector.getAllPosts();

      if (posts.length > 0) {
        const post = posts[0];

        // Should be a valid date string
        const date = new Date(post.publishedAt);
        expect(date).toBeInstanceOf(Date);
        expect(date.toString()).not.toBe('Invalid Date');

        // Should match ISO 8601 format
        expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe('getPostById() - Single Post Retrieval', () => {
    test('should retrieve post by ID with correct column names', async () => {
      // First get a valid post ID
      const posts = await dbSelector.getAllPosts();

      if (posts.length > 0) {
        const validId = posts[0].id;
        const post = await dbSelector.getPostById(validId);

        expect(post).toBeDefined();
        expect(post.id).toBe(validId);

        // Verify camelCase columns
        expect(post).toHaveProperty('agentName');
        expect(post).toHaveProperty('publishedAt');
        expect(post).not.toHaveProperty('agent_name');
        expect(post).not.toHaveProperty('published_at');
      }
    });

    test('should return null for non-existent post ID', async () => {
      const post = await dbSelector.getPostById(999999);
      expect(post).toBeNull();
    });

    test('should handle post retrieval without errors', async () => {
      const posts = await dbSelector.getAllPosts();

      if (posts.length > 0) {
        const validId = posts[0].id;
        await expect(dbSelector.getPostById(validId)).resolves.not.toThrow();
      }
    });
  });

  describe('createPost() - Post Creation', () => {
    let createdPostId;

    test('should create post with correct column mapping', async () => {
      const newPost = {
        agentName: 'Test Agent',
        agentTitle: 'Test Specialist',
        agentAvatar: '/avatars/test.png',
        content: 'Test post content for column name verification',
        publishedAt: new Date().toISOString(),
        likes: 0,
        shares: 0,
        comments: 0,
        imageUrl: null,
        category: 'Testing',
        outcomes: 'Test outcomes'
      };

      const result = await dbSelector.createPost(newPost);

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');

      createdPostId = result.id;
    });

    test('should retrieve created post with correct column names', async () => {
      if (createdPostId) {
        const post = await dbSelector.getPostById(createdPostId);

        expect(post).toBeDefined();
        expect(post.agentName).toBe('Test Agent');
        expect(post).toHaveProperty('publishedAt');
        expect(post).not.toHaveProperty('published_at');
      }
    });

    afterAll(async () => {
      // Cleanup: Delete test post
      if (createdPostId) {
        await dbRun('DELETE FROM posts WHERE id = ?', [createdPostId]);
      }
    });
  });

  describe('API Endpoint Integration - /api/agent-posts', () => {
    let app;

    beforeAll(() => {
      // Import the Express app
      app = require('../../backend/server');
    });

    test('should return 200 OK from API endpoint', async () => {
      const response = await request(app)
        .get('/api/agent-posts')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    test('should return posts with camelCase columns from API', async () => {
      const response = await request(app)
        .get('/api/agent-posts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const post = response.body[0];

        // Verify camelCase naming
        expect(post).toHaveProperty('agentName');
        expect(post).toHaveProperty('publishedAt');
        expect(post).not.toHaveProperty('agent_name');
        expect(post).not.toHaveProperty('published_at');
      }
    });

    test('should return properly ordered posts from API', async () => {
      const response = await request(app)
        .get('/api/agent-posts')
        .expect(200);

      const posts = response.body;

      if (posts.length > 1) {
        // Verify descending order by publishedAt
        for (let i = 0; i < posts.length - 1; i++) {
          const currentDate = new Date(posts[i].publishedAt);
          const nextDate = new Date(posts[i + 1].publishedAt);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('Frontend Connection Check', () => {
    test('should successfully query database directly', async () => {
      const query = `
        SELECT
          id,
          agent_name as agentName,
          agent_title as agentTitle,
          agent_avatar as agentAvatar,
          content,
          published_at as publishedAt,
          likes,
          shares,
          comments,
          image_url as imageUrl,
          category,
          outcomes
        FROM posts
        ORDER BY published_at DESC
        LIMIT 10
      `;

      await expect(dbAll(query)).resolves.not.toThrow();
    });

    test('should return valid data structure for frontend consumption', async () => {
      const query = `
        SELECT
          id,
          agent_name as agentName,
          agent_title as agentTitle,
          agent_avatar as agentAvatar,
          content,
          published_at as publishedAt,
          likes,
          shares,
          comments,
          image_url as imageUrl,
          category,
          outcomes
        FROM posts
        ORDER BY published_at DESC
        LIMIT 1
      `;

      const rows = await dbAll(query);

      if (rows.length > 0) {
        const post = rows[0];

        // Verify structure matches frontend expectations
        expect(post).toMatchObject({
          id: expect.any(Number),
          agentName: expect.any(String),
          agentTitle: expect.any(String),
          content: expect.any(String),
          publishedAt: expect.any(String),
          likes: expect.any(Number),
          shares: expect.any(Number),
          comments: expect.any(Number),
          category: expect.any(String)
        });
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty result set gracefully', async () => {
      // This should work even with empty results
      const posts = await dbSelector.getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
    });

    test('should handle malformed post IDs', async () => {
      await expect(dbSelector.getPostById('invalid')).resolves.not.toThrow();
      await expect(dbSelector.getPostById(null)).resolves.not.toThrow();
      await expect(dbSelector.getPostById(undefined)).resolves.not.toThrow();
    });

    test('should validate column name consistency across operations', async () => {
      const allPosts = await dbSelector.getAllPosts();

      if (allPosts.length > 0) {
        const postFromList = allPosts[0];
        const postById = await dbSelector.getPostById(postFromList.id);

        // Both should have same column structure
        expect(Object.keys(postFromList).sort()).toEqual(Object.keys(postById).sort());
      }
    });
  });
});
