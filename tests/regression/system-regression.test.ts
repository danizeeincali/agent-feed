import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { TestSetup } from '../helpers/test-setup';
import path from 'path';
import fs from 'fs/promises';

describe('System Regression Tests', () => {
  let app: Express;
  let dbService: any;

  beforeAll(async () => {
    dbService = await TestSetup.setupDatabase();
    app = await createApp();
  });

  afterAll(async () => {
    await TestSetup.cleanupDatabase();
  });

  beforeEach(async () => {
    await TestSetup.resetDatabase();
    await TestSetup.seedTestData();
  });

  describe('Critical User Workflows', () => {
    it('should handle complete post creation and retrieval workflow', async () => {
      // Create a post
      const newPost = {
        title: 'Regression Test Post',
        content: 'This is a regression test post to ensure the system works end-to-end',
        author: 'regression-test-agent',
        hashtags: ['regression', 'test', 'workflow']
      };

      const createResponse = await request(app)
        .post('/api/posts')
        .send(newPost)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      const postId = createResponse.body.id;

      // Retrieve the post
      const getResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .expect(200);

      expect(getResponse.body).toMatchObject(newPost);

      // Verify it appears in the posts list
      const listResponse = await request(app)
        .get('/api/posts')
        .expect(200);

      const createdPost = listResponse.body.find(p => p.id === postId);
      expect(createdPost).toBeTruthy();
      expect(createdPost).toMatchObject(newPost);

      // Verify it appears in the feed
      const feedResponse = await request(app)
        .get('/api/feed')
        .expect(200);

      expect(feedResponse.body.posts.some(p => p.id === postId)).toBe(true);
    });

    it('should handle agent discovery and status workflows', async () => {
      // List all agents
      const agentsResponse = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(agentsResponse.body)).toBe(true);
      expect(agentsResponse.body.length).toBeGreaterThan(0);

      const testAgent = agentsResponse.body[0];
      expect(testAgent).toHaveProperty('id');

      // Get specific agent details
      const agentResponse = await request(app)
        .get(`/api/agents/${testAgent.id}`)
        .expect(200);

      expect(agentResponse.body.id).toBe(testAgent.id);

      // Update agent status
      const statusUpdate = {
        status: 'busy',
        lastSeen: new Date().toISOString()
      };

      await request(app)
        .put(`/api/agents/${testAgent.id}/status`)
        .send(statusUpdate)
        .expect(200);

      // Verify status was updated
      const updatedAgentResponse = await request(app)
        .get(`/api/agents/${testAgent.id}`)
        .expect(200);

      expect(updatedAgentResponse.body.status).toBe('busy');
    });

    it('should handle hashtag filtering and search workflows', async () => {
      // Create posts with specific hashtags
      const posts = [
        {
          title: 'AI Research Post',
          content: 'Content about AI research',
          author: 'ai-researcher',
          hashtags: ['ai', 'research', 'ml']
        },
        {
          title: 'Web Development Post',
          content: 'Content about web development',
          author: 'web-dev',
          hashtags: ['web', 'development', 'javascript']
        },
        {
          title: 'Mixed Topic Post',
          content: 'Content about AI and web development',
          author: 'mixed-author',
          hashtags: ['ai', 'web', 'mixed']
        }
      ];

      const createdPosts = [];
      for (const post of posts) {
        const response = await request(app)
          .post('/api/posts')
          .send(post)
          .expect(201);
        createdPosts.push(response.body);
      }

      // Filter by 'ai' hashtag
      const aiPostsResponse = await request(app)
        .get('/api/posts?hashtag=ai')
        .expect(200);

      expect(aiPostsResponse.body.length).toBe(2);
      aiPostsResponse.body.forEach(post => {
        expect(post.hashtags).toContain('ai');
      });

      // Filter by 'web' hashtag
      const webPostsResponse = await request(app)
        .get('/api/posts?hashtag=web')
        .expect(200);

      expect(webPostsResponse.body.length).toBe(2);
      webPostsResponse.body.forEach(post => {
        expect(post.hashtags).toContain('web');
      });

      // Filter by unique hashtag
      const jsPostsResponse = await request(app)
        .get('/api/posts?hashtag=javascript')
        .expect(200);

      expect(jsPostsResponse.body.length).toBe(1);
      expect(jsPostsResponse.body[0].hashtags).toContain('javascript');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should gracefully handle malformed requests', async () => {
      // Test various malformed requests
      const malformedRequests = [
        { method: 'POST', url: '/api/posts', body: '{ invalid json }', contentType: 'application/json' },
        { method: 'POST', url: '/api/posts', body: { title: null, content: '', author: '' } },
        { method: 'GET', url: '/api/posts/invalid-id' },
        { method: 'PUT', url: '/api/agents/non-existent/status', body: { status: 'invalid-status' } },
        { method: 'DELETE', url: '/api/posts/999999' }
      ];

      for (const req of malformedRequests) {
        const response = await request(app)
          [req.method.toLowerCase()](req.url)
          .send(req.body)
          .type(req.contentType || 'application/json')
          .expect(res => {
            // Should return proper error codes, not crash
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.status).toBeLessThan(600);
          });

        // Response should have error information
        if (response.body && typeof response.body === 'object') {
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should handle high load scenarios', async () => {
      // Simulate high load with concurrent requests
      const concurrentRequests = Array(50).fill(null).map((_, index) => {
        const operations = [
          () => request(app).get('/api/posts'),
          () => request(app).get('/api/agents'),
          () => request(app).get('/api/feed'),
          () => request(app).post('/api/posts').send({
            title: `Load Test Post ${index}`,
            content: `Content for load test ${index}`,
            author: `load-agent-${index % 5}`,
            hashtags: [`load`, `test${index % 10}`]
          })
        ];

        const operation = operations[index % operations.length];
        return operation();
      });

      const start = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const duration = Date.now() - start;

      // Check results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(40); // At least 80% success rate
      expect(duration).toBeLessThan(30000); // Complete within 30 seconds

      if (failed > 0) {
        console.warn(`${failed} out of ${concurrentRequests.length} requests failed during load test`);
      }
    });

    it('should maintain data consistency under stress', async () => {
      // Create multiple agents and posts concurrently
      const agentCreationPromises = Array(10).fill(null).map(async (_, index) => {
        const agent = {
          id: `stress-agent-${index}`,
          name: `Stress Test Agent ${index}`,
          description: `Agent ${index} for stress testing`,
          capabilities: ['stress-testing'],
          version: '1.0.0',
          status: 'active'
        };

        try {
          await dbService.createAgent(agent);
          return { success: true, agent };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const postCreationPromises = Array(20).fill(null).map(async (_, index) => {
        return request(app)
          .post('/api/posts')
          .send({
            title: `Stress Test Post ${index}`,
            content: `Content for stress test post ${index}`,
            author: `stress-agent-${index % 10}`,
            hashtags: ['stress', 'test']
          });
      });

      // Execute all operations concurrently
      const [agentResults, postResults] = await Promise.all([
        Promise.allSettled(agentCreationPromises),
        Promise.allSettled(postCreationPromises)
      ]);

      // Verify data consistency
      const finalAgents = await request(app).get('/api/agents').expect(200);
      const finalPosts = await request(app).get('/api/posts').expect(200);

      // Check that we have the expected amount of data
      const stressAgents = finalAgents.body.filter(a => a.id.startsWith('stress-agent-'));
      const stressPosts = finalPosts.body.filter(p => p.title.startsWith('Stress Test Post'));

      expect(stressAgents.length).toBeGreaterThan(5); // At least some agents created
      expect(stressPosts.length).toBeGreaterThan(10); // At least some posts created

      // Verify referential integrity
      for (const post of stressPosts) {
        expect(post.author).toMatch(/^stress-agent-\d+$/);
        expect(stressAgents.some(a => a.id === post.author)).toBe(true);
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain acceptable response times for basic operations', async () => {
      const performanceTests = [
        { name: 'GET /api/posts', operation: () => request(app).get('/api/posts'), maxTime: 1000 },
        { name: 'GET /api/agents', operation: () => request(app).get('/api/agents'), maxTime: 1000 },
        { name: 'GET /api/feed', operation: () => request(app).get('/api/feed'), maxTime: 2000 },
        { name: 'POST /api/posts', operation: () => request(app).post('/api/posts').send({
          title: 'Performance Test',
          content: 'Testing performance',
          author: 'perf-agent',
          hashtags: ['performance']
        }), maxTime: 2000 }
      ];

      for (const test of performanceTests) {
        const start = Date.now();
        await test.operation().expect(res => expect(res.status).toBeLessThan(400));
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(test.maxTime);
        console.log(`${test.name}: ${duration}ms (max: ${test.maxTime}ms)`);
      }
    });

    it('should handle database operations efficiently', async () => {
      // Create a larger dataset for performance testing
      const largePosts = Array(100).fill(null).map((_, index) => ({
        title: `Performance Post ${index}`,
        content: `This is performance test content for post ${index}. `.repeat(10), // Longer content
        author: `perf-agent-${index % 10}`,
        hashtags: [`perf`, `test${index % 20}`, `category${index % 5}`]
      }));

      const start = Date.now();

      // Batch create posts
      for (const post of largePosts) {
        await request(app)
          .post('/api/posts')
          .send(post)
          .expect(201);
      }

      const createDuration = Date.now() - start;
      expect(createDuration).toBeLessThan(30000); // 30 seconds for 100 posts

      // Test retrieval performance with larger dataset
      const retrievalStart = Date.now();
      
      const allPostsResponse = await request(app)
        .get('/api/posts')
        .expect(200);
      
      const retrievalDuration = Date.now() - retrievalStart;
      expect(retrievalDuration).toBeLessThan(3000); // 3 seconds to retrieve all posts
      expect(allPostsResponse.body.length).toBeGreaterThan(100);

      // Test filtered queries performance
      const filterStart = Date.now();
      
      await request(app)
        .get('/api/posts?hashtag=perf')
        .expect(200);
      
      const filterDuration = Date.now() - filterStart;
      expect(filterDuration).toBeLessThan(2000); // 2 seconds for filtered query
    });
  });

  describe('Data Integrity Regression Tests', () => {
    it('should preserve data across multiple operations', async () => {
      // Create initial data
      const initialPost = {
        title: 'Integrity Test Post',
        content: 'This post tests data integrity',
        author: 'integrity-agent',
        hashtags: ['integrity', 'test']
      };

      const createResponse = await request(app)
        .post('/api/posts')
        .send(initialPost)
        .expect(201);

      const postId = createResponse.body.id;

      // Perform multiple read operations
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get(`/api/posts/${postId}`)
          .expect(200);

        expect(response.body).toMatchObject(initialPost);
        expect(response.body.id).toBe(postId);
      }

      // Verify data is consistent in different endpoints
      const listResponse = await request(app)
        .get('/api/posts')
        .expect(200);

      const postInList = listResponse.body.find(p => p.id === postId);
      expect(postInList).toMatchObject(initialPost);

      const feedResponse = await request(app)
        .get('/api/feed')
        .expect(200);

      const postInFeed = feedResponse.body.posts.find(p => p.id === postId);
      expect(postInFeed).toMatchObject(initialPost);

      const hashtagResponse = await request(app)
        .get('/api/posts?hashtag=integrity')
        .expect(200);

      const postInHashtag = hashtagResponse.body.find(p => p.id === postId);
      expect(postInHashtag).toMatchObject(initialPost);
    });

    it('should maintain consistency during concurrent modifications', async () => {
      const testAgentId = 'concurrent-test-agent';
      
      // Create an agent for testing
      await dbService.createAgent({
        id: testAgentId,
        name: 'Concurrent Test Agent',
        description: 'Agent for concurrent modification testing',
        capabilities: ['testing'],
        version: '1.0.0',
        status: 'active'
      });

      // Simulate concurrent status updates
      const statusUpdates = Array(10).fill(null).map((_, index) => 
        request(app)
          .put(`/api/agents/${testAgentId}/status`)
          .send({
            status: index % 2 === 0 ? 'active' : 'busy',
            lastSeen: new Date().toISOString()
          })
      );

      await Promise.all(statusUpdates);

      // Verify final state is consistent
      const finalAgentResponse = await request(app)
        .get(`/api/agents/${testAgentId}`)
        .expect(200);

      expect(['active', 'busy']).toContain(finalAgentResponse.body.status);
      expect(finalAgentResponse.body.id).toBe(testAgentId);
    });
  });
});