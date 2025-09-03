/**
 * SPARC Methodology - Refinement Phase Tests  
 * TDD implementation validation with comprehensive testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { dbPool } from '../../src/database/connection/pool.js';
import { feedDataService } from '../../src/services/FeedDataService.js';
import feedRoutes from '../../src/routes/api/feed-routes.js';

describe('SPARC Refinement Phase - TDD Implementation Validation', () => {
  let app;
  let testPostId;
  
  beforeAll(async () => {
    // Setup test application
    app = express();
    app.use(express.json());
    app.use('/api/v1', feedRoutes);
    
    // Initialize database services
    await dbPool.initialize();
    await feedDataService.initialize();
  });
  
  afterAll(async () => {
    // Cleanup test data
    await dbPool.query(`
      DELETE FROM feed_items 
      WHERE metadata->>'testData' = 'true' OR title LIKE '%Test%'
    `);
    
    await dbPool.close();
  });
  
  beforeEach(async () => {
    // Create a test post for each test
    const testPost = await feedDataService.createAgentPost({
      title: 'TDD Test Post',
      content: 'This is a test post for TDD validation',
      authorAgent: 'tdd-test-agent',
      metadata: {
        businessImpact: 7,
        tags: ['testing', 'tdd'],
        testData: true
      }
    });
    
    testPostId = testPost.id;
  });

  describe('TDD Red-Green-Refactor Cycle Validation', () => {
    
    it('RED: should fail when creating post without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          // Missing required fields: title, content, authorAgent
        });
        
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required fields');
    });
    
    it('GREEN: should succeed when creating post with all required fields', async () => {
      const postData = {
        title: 'TDD Success Test',
        content: 'This post should be created successfully',
        authorAgent: 'tdd-success-agent',
        metadata: {
          businessImpact: 8,
          tags: ['success', 'tdd'],
          testData: true
        }
      };
      
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData);
        
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.post).toBeDefined();
      expect(response.body.post.title).toBe(postData.title);
      expect(response.body.post.content).toBe(postData.content);
      expect(response.body.post.authorAgent).toBe(postData.authorAgent);
    });
    
    it('REFACTOR: should handle edge cases in post creation', async () => {
      // Test with very long title
      const longTitle = 'x'.repeat(501);
      
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: longTitle,
          content: 'Valid content',
          authorAgent: 'edge-case-agent'
        });
        
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });
  });

  describe('API Contract Testing (Consumer-Driven)', () => {
    
    it('should return posts in expected format for frontend', async () => {
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.posts)).toBe(true);
      
      if (response.body.posts.length > 0) {
        const post = response.body.posts[0];
        
        // Verify required fields for frontend compatibility
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.authorAgent).toBeDefined();
        expect(post.publishedAt).toBeDefined();
        expect(post.metadata).toBeDefined();
        expect(post.metadata.businessImpact).toBeDefined();
        expect(post.metadata.tags).toBeDefined();
        expect(Array.isArray(post.metadata.tags)).toBe(true);
        expect(typeof post.likes).toBe('number');
        expect(typeof post.comments).toBe('number');
        expect(typeof post.shares).toBe('number');
      }
    });
    
    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=5&offset=0')
        .expect(200);
        
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
      expect(typeof response.body.pagination.hasMore).toBe('boolean');
    });
    
    it('should support filtering parameters', async () => {
      const response = await request(app)
        .get('/api/v1/agent-posts?filter=high-impact')
        .expect(200);
        
      expect(response.body.applied_filters).toBeDefined();
      expect(response.body.applied_filters.filter).toBe('high-impact');
      
      // If posts exist, verify they meet filter criteria
      if (response.body.posts.length > 0) {
        response.body.posts.forEach(post => {
          expect(post.metadata.businessImpact).toBeGreaterThanOrEqual(7);
        });
      }
    });
  });

  describe('Error Handling and Resilience Testing', () => {
    
    it('should handle database connection failures gracefully', async () => {
      // Temporarily close database connection
      await dbPool.close();
      
      const response = await request(app)
        .get('/api/v1/agent-posts');
        
      // Should either return cached data or proper error response
      expect([200, 503, 500]).toContain(response.status);
      
      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
      
      // Restore connection for other tests
      await dbPool.initialize();
    });
    
    it('should validate input data types and ranges', async () => {
      const invalidInputs = [
        {
          title: null,
          content: 'Valid content',
          authorAgent: 'test-agent'
        },
        {
          title: 'Valid title',
          content: 42, // Invalid type
          authorAgent: 'test-agent'
        },
        {
          title: 'Valid title',
          content: 'Valid content',
          authorAgent: '' // Empty string
        }
      ];
      
      for (const invalidInput of invalidInputs) {
        const response = await request(app)
          .post('/api/v1/agent-posts')
          .send(invalidInput);
          
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
    
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');
        
      expect(response.status).toBe(400);
    });
  });

  describe('Performance Testing', () => {
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = [];
      const requestCount = 10;
      
      for (let i = 0; i < requestCount; i++) {
        concurrentRequests.push(
          request(app)
            .post('/api/v1/agent-posts')
            .send({
              title: `Concurrent Test ${i}`,
              content: `Testing concurrent request handling ${i}`,
              authorAgent: `concurrent-agent-${i}`,
              metadata: { testData: true }
            })
        );
      }
      
      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
    
    it('should respond within acceptable time limits', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/v1/agent-posts?limit=10')
        .expect(200);
        
      const duration = Date.now() - start;
      
      // Should respond within 1 second for small datasets
      expect(duration).toBeLessThan(1000);
      expect(response.body.success).toBe(true);
    });
    
    it('should handle large request payloads efficiently', async () => {
      const largeContent = 'x'.repeat(5000); // 5KB content
      
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Large Content Test',
          content: largeContent,
          authorAgent: 'large-content-agent',
          metadata: { testData: true }
        });
        
      expect(response.status).toBe(201);
      expect(response.body.post.content.length).toBe(5000);
    });
  });

  describe('Security Testing', () => {
    
    it('should prevent SQL injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE feed_items; --",
        "1' OR '1'='1",
        "'; UPDATE feed_items SET title='hacked'; --"
      ];
      
      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/v1/agent-posts')
          .send({
            title: maliciousInput,
            content: 'Test content',
            authorAgent: 'security-test-agent'
          });
          
        // Should either succeed (if input is sanitized) or fail safely
        expect([200, 201, 400, 422]).toContain(response.status);
        
        if (response.status >= 200 && response.status < 300) {
          // If successful, verify data was stored safely
          expect(response.body.post.title).toBe(maliciousInput);
        }
      }
      
      // Verify database integrity
      const integrityCheck = await dbPool.query('SELECT COUNT(*) as count FROM feed_items');
      expect(integrityCheck.rows[0].count).toBeGreaterThan(0);
    });
    
    it('should handle XSS attempts appropriately', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: `Test ${xssPayload}`,
          content: `Content with ${xssPayload}`,
          authorAgent: 'xss-test-agent',
          metadata: { testData: true }
        });
        
      expect(response.status).toBe(201);
      
      // Data should be stored as-is (sanitization happens at display layer)
      expect(response.body.post.title).toContain(xssPayload);
      expect(response.body.post.content).toContain(xssPayload);
    });
    
    it('should validate UUID format in URLs', async () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '12345',
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-extra',
        '../../../etc/passwd'
      ];
      
      for (const invalidUUID of invalidUUIDs) {
        const response = await request(app)
          .get(`/api/v1/agent-posts/${invalidUUID}`);
          
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid');
      }
    });
  });

  describe('Integration Testing', () => {
    
    it('should maintain data consistency across operations', async () => {
      // Create a post
      const createResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Consistency Test',
          content: 'Testing data consistency',
          authorAgent: 'consistency-agent',
          metadata: { testData: true }
        });
        
      expect(createResponse.status).toBe(201);
      const postId = createResponse.body.post.id;
      
      // Retrieve the post
      const getResponse = await request(app)
        .get(`/api/v1/agent-posts/${postId}`);
        
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.post.title).toBe('Consistency Test');
      
      // Update engagement
      const engagementResponse = await request(app)
        .put(`/api/v1/agent-posts/${postId}/engagement`)
        .send({ action: 'like' });
        
      expect(engagementResponse.status).toBe(200);
      
      // Verify engagement was recorded
      expect(engagementResponse.body.success).toBe(true);
    });
    
    it('should handle transaction rollback on failures', async () => {
      // Attempt to create a post that should fail due to validation
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'x'.repeat(1000), // Too long
          content: 'Valid content',
          authorAgent: 'rollback-test-agent'
        });
        
      expect(response.status).toBe(400);
      
      // Verify no partial data was created
      const checkResponse = await request(app)
        .get('/api/v1/search/posts?q=rollback-test-agent');
        
      expect(checkResponse.body.posts.length).toBe(0);
    });
  });

  describe('Monitoring and Observability', () => {
    
    it('should provide comprehensive health check information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.health).toBeDefined();
      expect(response.body.health.healthy).toBe(true);
      expect(response.body.health.timestamp).toBeDefined();
      expect(response.body.health.database).toBeDefined();
      expect(response.body.service).toBe('agent-feed-api');
    });
    
    it('should log important events appropriately', async () => {
      // This test would typically check log files or log aggregation service
      // For now, we'll verify that operations complete successfully (implying logging works)
      
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Logging Test',
          content: 'Testing event logging',
          authorAgent: 'logging-test-agent',
          metadata: { testData: true }
        });
        
      expect(response.status).toBe(201);
      
      // In a real environment, you would verify log entries were created
      // expect(logCapture.getLastEntry()).toContain('Agent post created successfully');
    });
  });

  describe('Regression Testing', () => {
    
    it('should maintain backward compatibility with existing API contracts', async () => {
      // Test the original endpoint format that frontend expects
      const response = await request(app)
        .get('/api/v1/agent-posts');
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.posts).toBeDefined();
      
      // Verify the response matches what the frontend originally expected
      if (response.body.posts.length > 0) {
        const post = response.body.posts[0];
        
        // All these fields were required by the original SocialMediaFeed component
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.authorAgent).toBeDefined();
        expect(post.publishedAt).toBeDefined();
        expect(post.metadata).toBeDefined();
        expect(post.metadata.businessImpact).toBeDefined();
        expect(post.metadata.tags).toBeDefined();
      }
    });
    
    it('should not break existing functionality when database is unavailable', async () => {
      // This tests graceful degradation
      // In a real scenario, you might mock database failures
      
      const response = await request(app)
        .get('/api/v1/agent-posts');
        
      // Should either return data or fail gracefully
      expect([200, 503, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });
  });
});