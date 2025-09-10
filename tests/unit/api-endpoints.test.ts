import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { TestSetup, setupGlobalTestEnvironment } from '../helpers/test-setup';

describe('API Endpoints Unit Tests', () => {
  let app: Express;
  let dbService: any;

  setupGlobalTestEnvironment();

  beforeAll(async () => {
    dbService = await TestSetup.setupDatabase();
    app = await createApp();
  });

  describe('Posts API Endpoints', () => {
    describe('GET /api/posts', () => {
      it('should return all posts', async () => {
        const response = await request(app)
          .get('/api/posts')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(0);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toBeValidPost();
        }
      });

      it('should support pagination with limit and offset', async () => {
        const response = await request(app)
          .get('/api/posts?limit=1&offset=0')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(1);
      });

      it('should handle invalid pagination parameters gracefully', async () => {
        await request(app)
          .get('/api/posts?limit=invalid&offset=abc')
          .expect(200); // Should use defaults
      });

      it('should filter by hashtags when provided', async () => {
        const response = await request(app)
          .get('/api/posts?hashtag=test')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach(post => {
          expect(post.hashtags).toContain('test');
        });
      });
    });

    describe('POST /api/posts', () => {
      it('should create a new post with valid data', async () => {
        const newPost = {
          title: 'New Test Post',
          content: 'This is a new test post content',
          author: 'test-author',
          hashtags: ['new', 'test']
        };

        const response = await request(app)
          .post('/api/posts')
          .send(newPost)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe(newPost.title);
        expect(response.body.content).toBe(newPost.content);
        expect(response.body.author).toBe(newPost.author);
        expect(response.body.hashtags).toEqual(newPost.hashtags);
      });

      it('should reject posts with missing required fields', async () => {
        const incompletePost = {
          title: 'Incomplete Post'
          // Missing content and author
        };

        await request(app)
          .post('/api/posts')
          .send(incompletePost)
          .expect((res) => {
            expect([400, 422]).toContain(res.status);
          });
      });

      it('should handle posts with empty hashtags array', async () => {
        const postWithoutHashtags = {
          title: 'Post Without Hashtags',
          content: 'This post has no hashtags',
          author: 'test-author',
          hashtags: []
        };

        const response = await request(app)
          .post('/api/posts')
          .send(postWithoutHashtags)
          .expect(201);

        expect(response.body.hashtags).toEqual([]);
      });

      it('should sanitize input data', async () => {
        const postWithScripts = {
          title: '<script>alert("xss")</script>Clean Title',
          content: 'Clean content with <script>evil()</script> tags',
          author: 'clean-author',
          hashtags: ['clean']
        };

        const response = await request(app)
          .post('/api/posts')
          .send(postWithScripts)
          .expect(201);

        expect(response.body.title).not.toContain('<script>');
        expect(response.body.content).not.toContain('<script>');
      });
    });

    describe('GET /api/posts/:id', () => {
      it('should retrieve a specific post by ID', async () => {
        // First create a post
        const newPost = {
          title: 'Retrievable Post',
          content: 'This post will be retrieved',
          author: 'test-author',
          hashtags: ['retrievable']
        };

        const createResponse = await request(app)
          .post('/api/posts')
          .send(newPost)
          .expect(201);

        const postId = createResponse.body.id;

        // Now retrieve it
        const response = await request(app)
          .get(`/api/posts/${postId}`)
          .expect(200);

        expect(response.body.id).toBe(postId);
        expect(response.body.title).toBe(newPost.title);
      });

      it('should return 404 for non-existent post', async () => {
        await request(app)
          .get('/api/posts/999999')
          .expect(404);
      });

      it('should handle invalid post ID formats', async () => {
        await request(app)
          .get('/api/posts/invalid-id')
          .expect((res) => {
            expect([400, 404]).toContain(res.status);
          });
      });
    });

    describe('DELETE /api/posts/:id', () => {
      it('should delete a post successfully', async () => {
        // Create a post to delete
        const newPost = {
          title: 'Post to Delete',
          content: 'This post will be deleted',
          author: 'test-author',
          hashtags: ['deletable']
        };

        const createResponse = await request(app)
          .post('/api/posts')
          .send(newPost)
          .expect(201);

        const postId = createResponse.body.id;

        // Delete the post
        await request(app)
          .delete(`/api/posts/${postId}`)
          .expect(200);

        // Verify it's deleted
        await request(app)
          .get(`/api/posts/${postId}`)
          .expect(404);
      });

      it('should return 404 when trying to delete non-existent post', async () => {
        await request(app)
          .delete('/api/posts/999999')
          .expect(404);
      });
    });
  });

  describe('Agents API Endpoints', () => {
    describe('GET /api/agents', () => {
      it('should return all agents', async () => {
        const response = await request(app)
          .get('/api/agents')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toBeValidAgent();
        }
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/api/agents?status=active')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach(agent => {
          expect(agent.status).toBe('active');
        });
      });
    });

    describe('GET /api/agents/:id', () => {
      it('should retrieve a specific agent by ID', async () => {
        const response = await request(app)
          .get('/api/agents/test-agent-1')
          .expect(200);

        expect(response.body.id).toBe('test-agent-1');
        expect(response.body).toBeValidAgent();
      });

      it('should return 404 for non-existent agent', async () => {
        await request(app)
          .get('/api/agents/non-existent-agent')
          .expect(404);
      });
    });

    describe('PUT /api/agents/:id/status', () => {
      it('should update agent status', async () => {
        const statusUpdate = {
          status: 'busy',
          lastSeen: new Date().toISOString()
        };

        const response = await request(app)
          .put('/api/agents/test-agent-1/status')
          .send(statusUpdate)
          .expect(200);

        expect(response.body.status).toBe('busy');
      });

      it('should reject invalid status values', async () => {
        const invalidStatusUpdate = {
          status: 'invalid-status'
        };

        await request(app)
          .put('/api/agents/test-agent-1/status')
          .send(invalidStatusUpdate)
          .expect(400);
      });
    });
  });

  describe('Feed API Endpoints', () => {
    describe('GET /api/feed', () => {
      it('should return formatted feed data', async () => {
        const response = await request(app)
          .get('/api/feed')
          .expect(200);

        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
        expect(response.body).toHaveProperty('totalCount');
        expect(response.body).toHaveProperty('lastUpdated');
      });

      it('should support different feed formats', async () => {
        const response = await request(app)
          .get('/api/feed?format=rss')
          .expect((res) => {
            expect([200, 501]).toContain(res.status);
          });
      });
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('healthy');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    describe('GET /api/health', () => {
      it('should return detailed health information', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('database');
        expect(response.body).toHaveProperty('uptime');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid sequential requests', async () => {
      const promises = Array(50).fill(null).map((_, index) =>
        request(app).get('/api/posts').expect(200)
      );

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toRespondWithinTime(10000); // 10 seconds for 50 requests
    });

    it('should maintain performance with large datasets', async () => {
      // Create multiple posts for performance testing
      const createPromises = Array(20).fill(null).map((_, index) =>
        request(app)
          .post('/api/posts')
          .send({
            title: `Performance Test Post ${index}`,
            content: `Content for performance test post ${index}`,
            author: `perf-test-${index}`,
            hashtags: [`perf`, `test${index}`]
          })
      );

      await Promise.all(createPromises);

      // Test retrieval performance
      const start = Date.now();
      const response = await request(app)
        .get('/api/posts')
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.length).toBeGreaterThanOrEqual(20);
      expect(duration).toRespondWithinTime(2000); // 2 seconds
    });
  });
});