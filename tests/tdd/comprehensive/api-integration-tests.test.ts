/**
 * TDD London School: API Integration Tests
 * 
 * Real API connectivity and response validation tests.
 * No mocks - tests actual API endpoints and data flow.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/app';
import { DatabaseService } from '../../../src/database/DatabaseService';
import { API_ENDPOINT_SPECS } from './test-specifications';
import type { Express } from 'express';

describe('TDD London School: Real API Integration Tests', () => {
  let app: Express;
  let dbService: DatabaseService;
  let server: any;

  beforeAll(async () => {
    // Setup real application instance
    app = await createApp();
    dbService = new DatabaseService();
    
    // Start server for integration testing
    server = app.listen(0); // Use random port
    
    // Ensure database is connected for real data tests
    await dbService.connect();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (dbService) {
      await dbService.disconnect();
    }
  });

  describe('Health Endpoints - Real Connectivity', () => {
    test('should return healthy status from /health endpoint', async () => {
      const spec = API_ENDPOINT_SPECS.find(s => s.endpoint === '/health')!;
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Verify real response structure
      expect(response.body).toMatchObject(spec.expectedResponse);
      expect(response.body.status).toBe('healthy');
      expect(typeof response.body.uptime).toBe('number');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      
      // Real data validation
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should return database health from /api/health endpoint', async () => {
      const spec = API_ENDPOINT_SPECS.find(s => s.endpoint === '/api/health')!;
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      // Verify real database connection
      expect(response.body).toMatchObject({
        status: 'healthy',
        database: 'connected',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
      
      // Real data validation - database is actually connected
      expect(response.body.database).toBe('connected');
      const isReallyConnected = await dbService.isConnected();
      expect(isReallyConnected).toBe(true);
    });

    test('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect database to test error handling
      await dbService.disconnect();
      
      const response = await request(app)
        .get('/api/health')
        .expect(500);
      
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('error');
      expect(response.body.error).toBeDefined();
      
      // Reconnect for other tests
      await dbService.connect();
    });
  });

  describe('Feed API - Real Data Integration', () => {
    test('should return real feed data from /api/feed endpoint', async () => {
      const spec = API_ENDPOINT_SPECS.find(s => s.endpoint === '/api/feed')!;
      
      const response = await request(app)
        .get('/api/feed')
        .expect(200);
      
      // Verify real response structure
      expect(response.body).toMatchObject(spec.expectedResponse);
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(typeof response.body.totalCount).toBe('number');
      expect(new Date(response.body.lastUpdated)).toBeInstanceOf(Date);
      
      // Real data validation
      expect(response.body.totalCount).toBe(response.body.posts.length);
      
      // Verify each post has real structure
      if (response.body.posts.length > 0) {
        const post = response.body.posts[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('timestamp');
      }
    });

    test('should handle database errors in feed endpoint', async () => {
      // Disconnect database to test error handling
      await dbService.disconnect();
      
      const response = await request(app)
        .get('/api/feed')
        .expect(500);
      
      expect(response.body.error).toBe('Failed to fetch feed');
      expect(response.body.message).toBeDefined();
      
      // Reconnect
      await dbService.connect();
    });
  });

  describe('Posts API - CRUD Operations', () => {
    let createdPostId: string;

    test('should create new post with real data', async () => {
      const postData = {
        content: 'Test post from integration test',
        author: 'test-user',
        timestamp: new Date().toISOString()
      };
      
      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(postData.content);
      expect(response.body.author).toBe(postData.author);
      
      createdPostId = response.body.id;
      
      // Verify post was actually saved to database
      const posts = await dbService.getAllPosts();
      const savedPost = posts.find(p => p.id === createdPostId);
      expect(savedPost).toBeDefined();
      expect(savedPost!.content).toBe(postData.content);
    });

    test('should retrieve specific post with real data', async () => {
      if (!createdPostId) {
        throw new Error('No post created for retrieval test');
      }
      
      const response = await request(app)
        .get(`/api/posts/${createdPostId}`)
        .expect(200);
      
      expect(response.body.id).toBe(createdPostId);
      expect(response.body.content).toBe('Test post from integration test');
      
      // Verify data consistency with database
      const posts = await dbService.getAllPosts();
      const dbPost = posts.find(p => p.id === createdPostId);
      expect(response.body).toMatchObject(dbPost!);
    });

    test('should update post with real data', async () => {
      if (!createdPostId) {
        throw new Error('No post created for update test');
      }
      
      const updateData = {
        content: 'Updated test post content'
      };
      
      const response = await request(app)
        .put(`/api/posts/${createdPostId}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.content).toBe(updateData.content);
      
      // Verify update was persisted to database
      const posts = await dbService.getAllPosts();
      const updatedPost = posts.find(p => p.id === createdPostId);
      expect(updatedPost!.content).toBe(updateData.content);
    });

    test('should delete post with real data cleanup', async () => {
      if (!createdPostId) {
        throw new Error('No post created for deletion test');
      }
      
      await request(app)
        .delete(`/api/posts/${createdPostId}`)
        .expect(200);
      
      // Verify post was actually removed from database
      const posts = await dbService.getAllPosts();
      const deletedPost = posts.find(p => p.id === createdPostId);
      expect(deletedPost).toBeUndefined();
      
      // Verify 404 when trying to retrieve deleted post
      await request(app)
        .get(`/api/posts/${createdPostId}`)
        .expect(404);
    });
  });

  describe('Agents API - Real Agent Management', () => {
    test('should retrieve agent list with real data', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      
      // Verify each agent has required properties
      if (response.body.length > 0) {
        const agent = response.body[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status');
        expect(agent).toHaveProperty('capabilities');
      }
    });

    test('should create new agent with real configuration', async () => {
      const agentData = {
        name: 'test-agent',
        type: 'integration-test',
        capabilities: ['testing', 'validation'],
        config: { testMode: true }
      };
      
      const response = await request(app)
        .post('/api/agents')
        .send(agentData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(agentData.name);
      expect(response.body.capabilities).toEqual(agentData.capabilities);
      
      // Cleanup: delete created agent
      await request(app)
        .delete(`/api/agents/${response.body.id}`)
        .expect(200);
    });
  });

  describe('Error Handling - Real Error Scenarios', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
      
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('/api/non-existent-endpoint');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const promises = Array(10).fill(0).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Total time should be reasonable (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle large payloads within limits', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      
      const response = await request(app)
        .post('/api/posts')
        .send({
          content: largeContent,
          author: 'load-test'
        })
        .expect(201);
      
      expect(response.body.content).toBe(largeContent);
      
      // Cleanup
      await request(app)
        .delete(`/api/posts/${response.body.id}`)
        .expect(200);
    });
  });

  describe('Security Testing - Real Security Validation', () => {
    test('should sanitize input data', async () => {
      const maliciousContent = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/posts')
        .send({
          content: maliciousContent,
          author: 'security-test'
        })
        .expect(201);
      
      // Verify content is sanitized or rejected
      expect(response.body.content).not.toContain('<script>');
      
      // Cleanup
      await request(app)
        .delete(`/api/posts/${response.body.id}`)
        .expect(200);
    });

    test('should handle SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE posts; --";
      
      const response = await request(app)
        .post('/api/posts')
        .send({
          content: sqlInjection,
          author: 'security-test'
        });
      
      // Should either sanitize or return error, but not crash
      expect([200, 201, 400]).toContain(response.status);
      
      // Verify database is still intact
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(healthResponse.body.database).toBe('connected');
    });
  });

  describe('Real Data Consistency Tests', () => {
    test('should maintain data consistency across operations', async () => {
      // Create multiple posts
      const posts = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/posts')
          .send({
            content: `Consistency test post ${i}`,
            author: `user-${i}`
          })
          .expect(201);
        
        posts.push(response.body.id);
      }
      
      // Verify all posts exist in feed
      const feedResponse = await request(app)
        .get('/api/feed')
        .expect(200);
      
      const feedPostIds = feedResponse.body.posts.map((p: any) => p.id);
      posts.forEach(postId => {
        expect(feedPostIds).toContain(postId);
      });
      
      // Cleanup all created posts
      for (const postId of posts) {
        await request(app)
          .delete(`/api/posts/${postId}`)
          .expect(200);
      }
      
      // Verify posts are removed from feed
      const updatedFeedResponse = await request(app)
        .get('/api/feed')
        .expect(200);
      
      const updatedFeedPostIds = updatedFeedResponse.body.posts.map((p: any) => p.id);
      posts.forEach(postId => {
        expect(updatedFeedPostIds).not.toContain(postId);
      });
    });
  });
});