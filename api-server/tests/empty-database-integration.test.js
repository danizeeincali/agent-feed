/**
 * Comprehensive Database Integration Tests
 *
 * Tests the API endpoints with database state validation.
 * Validates engagement tracking, comment triggers, and data persistence.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'database.db');

describe('Comprehensive Database Integration Tests', () => {
  let db;
  let createdPostId;
  const baseURL = 'http://localhost:3001';

  beforeAll(() => {
    // Initialize database connection
    db = new Database(dbPath);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('1. GET /api/agent-posts with database state', () => {
    it('should return success: true', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return valid total count', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should return data array', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('2. POST /api/v1/agent-posts (create first post)', () => {
    const newPost = {
      title: 'First Post in Empty Database',
      content: 'This is the first post in the empty database',
      author_agent: 'test-agent-001',
      metadata: {
        test: true,
        scenario: 'empty-database-integration'
      }
    };

    it('should successfully create the first post', async () => {
      const response = await request(baseURL)
        .post('/api/v1/agent-posts')
        .send(newPost)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      createdPostId = response.body.data.id;
      expect(createdPostId).toBeDefined();
    });

    it('should return created post with correct fields', async () => {
      const response = await request(baseURL)
        .post('/api/v1/agent-posts')
        .send({
          ...newPost,
          title: 'Second Test Post',
          author_agent: 'test-agent-002'
        })
        .expect(201);

      const post = response.body.data;

      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title', 'Second Test Post');
      expect(post).toHaveProperty('authorAgent', 'test-agent-002');
      expect(post).toHaveProperty('content', newPost.content);
      expect(post).toHaveProperty('publishedAt');
      expect(post).toHaveProperty('engagement');
    });

    it('should initialize engagement with zeros', async () => {
      const response = await request(baseURL)
        .post('/api/v1/agent-posts')
        .send({
          ...newPost,
          title: 'Third Test Post',
          author_agent: 'test-agent-003'
        })
        .expect(201);

      const engagement = response.body.data.engagement;

      expect(engagement).toHaveProperty('comments', 0);
      expect(engagement).toHaveProperty('shares', 0);
      expect(engagement).toHaveProperty('views', 0);
      expect(engagement).toHaveProperty('saves', 0);
    });
  });

  describe('3. GET /api/agent-posts after creating posts', () => {
    it('should return at least 3 posts', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
      // Note: API has pagination limit, data.length may be less than total
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data.length).toBeLessThanOrEqual(response.body.total);
    });

    it('should return posts with correct data structure', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const posts = response.body.data;
      expect(posts.length).toBeGreaterThan(0);

      posts.forEach(post => {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('authorAgent');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('created_at');
        expect(post).toHaveProperty('engagement');

        // Validate engagement structure
        expect(post.engagement).toHaveProperty('comments');
        expect(post.engagement).toHaveProperty('shares');
        expect(post.engagement).toHaveProperty('views');
        expect(post.engagement).toHaveProperty('saves');
      });
    });
  });

  describe('4. POST /api/agent-posts/:postId/comments', () => {
    let testPostId;
    let initialEngagement;

    beforeAll(async () => {
      // Create a specific post for comment testing
      const response = await request(baseURL)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Comment Test Post',
          content: 'Post to test comment triggers',
          author_agent: 'comment-test-agent'
        });

      testPostId = response.body.data.id;
      initialEngagement = response.body.data.engagement;
    });

    it('should successfully create a comment', async () => {
      const commentData = {
        author: 'commenter-agent-001',
        content: 'This is a test comment to verify triggers'
      };

      const response = await request(baseURL)
        .post(`/api/agent-posts/${testPostId}/comments`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('post_id', testPostId);
      expect(response.body.data).toHaveProperty('author', commentData.author);
      expect(response.body.data).toHaveProperty('content', commentData.content);
    });

    it('should increment engagement.comments to 1 (trigger verification)', async () => {
      // Get the post to check engagement
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const post = response.body.data.find(p => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post.engagement.comments).toBe(1);
    });

    it('should increment comments count for multiple comments', async () => {
      // Add second comment
      await request(baseURL)
        .post(`/api/agent-posts/${testPostId}/comments`)
        .send({
          author: 'commenter-agent-002',
          content: 'Second comment'
        })
        .expect(201);

      // Add third comment
      await request(baseURL)
        .post(`/api/agent-posts/${testPostId}/comments`)
        .send({
          author: 'commenter-agent-003',
          content: 'Third comment'
        })
        .expect(201);

      // Verify count is now 3
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const post = response.body.data.find(p => p.id === testPostId);
      expect(post.engagement.comments).toBe(3);
    });
  });

  describe('5. Data Persistence Validation', () => {
    let persistenceTestPostId;

    beforeAll(async () => {
      const response = await request(baseURL)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Persistence Test Post',
          content: 'Post to verify data persistence',
          author_agent: 'persistence-test-agent'
        });

      persistenceTestPostId = response.body.data.id;
    });

    it('should persist post data correctly', async () => {
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const post = response.body.data.find(p => p.id === persistenceTestPostId);
      expect(post).toBeDefined();
      expect(post.title).toBe('Persistence Test Post');
      expect(post.content).toBe('Post to verify data persistence');
      expect(post.authorAgent).toBe('persistence-test-agent');
    });

    it('should maintain engagement data through API calls', async () => {
      // Add a comment
      await request(baseURL)
        .post(`/api/agent-posts/${persistenceTestPostId}/comments`)
        .send({
          author: 'test-commenter',
          content: 'Test comment for persistence'
        })
        .expect(201);

      // Verify engagement persists
      const response = await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const post = response.body.data.find(p => p.id === persistenceTestPostId);
      expect(post.engagement.comments).toBeGreaterThan(0);
    });
  });

  describe('7. Performance Metrics', () => {
    it('should measure GET /api/agent-posts response time', async () => {
      const start = Date.now();

      await request(baseURL)
        .get('/api/agent-posts')
        .expect(200);

      const duration = Date.now() - start;

      console.log(`GET /api/agent-posts response time: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should measure POST /api/v1/agent-posts response time', async () => {
      const start = Date.now();

      await request(baseURL)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Performance Test Post',
          content: 'Performance test post',
          author_agent: 'performance-test-agent'
        })
        .expect(201);

      const duration = Date.now() - start;

      console.log(`POST /api/v1/agent-posts response time: ${duration}ms`);
      expect(duration).toBeLessThan(500); // Should respond within 500ms
    });

    it('should measure POST comment response time', async () => {
      // Get a post ID first
      const postsResponse = await request(baseURL).get('/api/agent-posts');
      const postId = postsResponse.body.data[0]?.id;

      if (postId) {
        const start = Date.now();

        await request(baseURL)
          .post(`/api/agent-posts/${postId}/comments`)
          .send({
            author: 'perf-comment-agent',
            content: 'Performance test comment'
          })
          .expect(201);

        const duration = Date.now() - start;

        console.log(`POST comment response time: ${duration}ms`);
        expect(duration).toBeLessThan(500);
      }
    });
  });
});
