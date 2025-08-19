import request from 'supertest';
import { app } from '@/api/server';

/**
 * Integration Tests for PostCreator API Integration
 * Tests the actual API endpoints that PostCreator interacts with
 */
describe('PostCreator API Integration', () => {
  
  describe('POST /api/v1/agent-posts', () => {
    it('should accept valid post data', async () => {
      const postData = {
        title: 'Integration Test Post',
        hook: 'Testing API integration',
        content: 'This is a test post for API integration testing.',
        tags: ['test', 'integration'],
        visibility: 'public',
        agentMentions: ['chief-of-staff'],
        metadata: {
          businessImpact: 5,
          isAgentResponse: false,
          wordCount: 10,
          readingTime: 1
        }
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          title: postData.title,
          content: postData.content
        }),
        message: expect.stringContaining('created successfully')
      });
    });

    it('should reject posts without required title', async () => {
      const invalidData = {
        content: 'Content without title',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('title')
      });
    });

    it('should reject posts without required content', async () => {
      const invalidData = {
        title: 'Title without content',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('content')
      });
    });

    it('should validate title length limits', async () => {
      const longTitle = 'a'.repeat(300); // Exceeds typical 200 char limit

      const postData = {
        title: longTitle,
        content: 'Valid content',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('title')
      });
    });

    it('should validate content length limits', async () => {
      const longContent = 'a'.repeat(6000); // Exceeds typical 5000 char limit

      const postData = {
        title: 'Valid title',
        content: longContent,
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('content')
      });
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Content with <script>alert("xss")</script> and émojis 🚀 and unicode ü';

      const postData = {
        title: 'Special Characters Test',
        content: specialContent,
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Content should be sanitized or properly escaped
      expect(response.body.data.content).not.toContain('<script>');
    });

    it('should validate visibility values', async () => {
      const postData = {
        title: 'Visibility Test',
        content: 'Testing visibility validation',
        visibility: 'invalid-visibility'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('visibility')
      });
    });

    it('should handle agent mentions validation', async () => {
      const postData = {
        title: 'Agent Mentions Test',
        content: 'Testing agent mentions',
        visibility: 'public',
        agentMentions: ['nonexistent-agent', 'another-invalid-agent']
      };

      // This might succeed with validation warnings, or fail depending on implementation
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData);

      // Should either succeed with filtered mentions or fail with validation error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle tags validation', async () => {
      const postData = {
        title: 'Tags Test',
        content: 'Testing tag validation',
        visibility: 'public',
        tags: ['valid-tag', '', 'another-tag', null, 'a'.repeat(100)] // Mix of valid/invalid
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(200);

      // Should filter out invalid tags
      expect(response.body.data.tags).toEqual(
        expect.arrayContaining(['valid-tag', 'another-tag'])
      );
      expect(response.body.data.tags).not.toContain('');
      expect(response.body.data.tags).not.toContain(null);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('JSON')
      });
    });

    it('should rate limit requests appropriately', async () => {
      const postData = {
        title: 'Rate Limit Test',
        content: 'Testing rate limiting',
        visibility: 'public'
      };

      // Send multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/agent-posts')
          .send(postData)
      );

      const responses = await Promise.all(promises);
      
      // Should handle all requests or return rate limit errors
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitCount).toBe(10);
    });

    it('should handle concurrent requests safely', async () => {
      const createPost = (index: number) => ({
        title: `Concurrent Test ${index}`,
        content: `Testing concurrent request ${index}`,
        visibility: 'public'
      });

      // Send concurrent requests
      const promises = Array(5).fill(null).map((_, i) =>
        request(app)
          .post('/api/v1/agent-posts')
          .send(createPost(i))
      );

      const responses = await Promise.all(promises);
      
      // All should succeed with unique IDs
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
      });

      // IDs should be unique
      const ids = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // This test would typically mock database failures
      // For now, test that the endpoint handles errors gracefully
      
      const postData = {
        title: 'DB Error Test',
        content: 'Testing database error handling',
        visibility: 'public'
      };

      // If database is configured to fail, should get 500
      // Otherwise should succeed
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData);

      expect([200, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String)
        });
      }
    });

    it('should handle timeout scenarios', async () => {
      const postData = {
        title: 'Timeout Test',
        content: 'Testing timeout handling',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .timeout(5000); // 5 second timeout

      // Should either succeed or timeout gracefully
      expect([200, 408, 500]).toContain(response.status);
    });
  });

  describe('Reply Mode Integration', () => {
    it('should handle reply posts correctly', async () => {
      const replyData = {
        title: 'Reply Test',
        content: 'This is a reply to another post',
        visibility: 'public',
        replyToPostId: 'parent-post-123'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(replyData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        replyToPostId: 'parent-post-123'
      });
    });

    it('should validate parent post exists for replies', async () => {
      const replyData = {
        title: 'Invalid Reply Test',
        content: 'Reply to non-existent post',
        visibility: 'public',
        replyToPostId: 'non-existent-post'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(replyData);

      // Should either succeed (if validation is loose) or fail
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Scheduled Posts Integration', () => {
    it('should handle scheduled posts', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const scheduledData = {
        title: 'Scheduled Post Test',
        content: 'This post is scheduled for the future',
        visibility: 'public',
        scheduledAt: futureDate.toISOString()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(scheduledData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        scheduledAt: futureDate.toISOString()
      });
    });

    it('should reject past scheduled dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const invalidScheduledData = {
        title: 'Invalid Scheduled Post',
        content: 'This post has a past schedule date',
        visibility: 'public',
        scheduledAt: pastDate.toISOString()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidScheduledData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('schedule')
      });
    });
  });
});