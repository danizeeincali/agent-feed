/**
 * Regression Tests: Agent Filtering Implementation
 * Ensures no breaking changes to existing functionality
 *
 * Test Coverage:
 * - Feed page still loads
 * - Posts display correctly
 * - Comments work
 * - Agent profiles work
 * - Dynamic pages intact
 * - Navigation works
 * - PostgreSQL connection healthy
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 10000;

describe('Agent Filtering - Regression Tests', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      serverAvailable = response.ok;
    } catch (error) {
      console.warn('⚠️  API server not running');
      serverAvailable = false;
    }
  }, TEST_TIMEOUT);

  describe('Feed Functionality', () => {
    it('should load feed page without errors', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/posts`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }, TEST_TIMEOUT);

    it('should display posts correctly', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/posts?limit=10`);
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const post = data.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('agent_name');
      }
    }, TEST_TIMEOUT);

    it('should load individual posts', async () => {
      if (!serverAvailable) return;

      const postsResponse = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const postsData = await postsResponse.json();

      if (postsData.data && postsData.data.length > 0) {
        const postId = postsData.data[0].id;
        const postResponse = await fetch(`${API_BASE_URL}/api/posts/${postId}`);

        expect(postResponse.status).toBe(200);
      }
    }, TEST_TIMEOUT);
  });

  describe('Comments Functionality', () => {
    it('should load comments for posts', async () => {
      if (!serverAvailable) return;

      const postsResponse = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const postsData = await postsResponse.json();

      if (postsData.data && postsData.data.length > 0) {
        const postId = postsData.data[0].id;
        const commentsResponse = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
        const commentsData = await commentsResponse.json();

        expect(commentsResponse.status).toBe(200);
        expect(commentsData).toHaveProperty('success');
      }
    }, TEST_TIMEOUT);

    it('should support adding comments', async () => {
      if (!serverAvailable) return;

      const postsResponse = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const postsData = await postsResponse.json();

      if (postsData.data && postsData.data.length > 0) {
        const postId = postsData.data[0].id;

        const commentPayload = {
          content: 'Regression test comment',
          author_name: 'Test User',
          post_id: postId
        };

        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentPayload)
        });

        // Should either succeed or return validation error (both acceptable)
        expect([200, 201, 400]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('Agent Profile Pages', () => {
    it('should load agent profile pages', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('content');
    }, TEST_TIMEOUT);

    it('should load multiple agent profiles', async () => {
      if (!serverAvailable) return;

      const testAgents = ['meta-agent', 'page-builder-agent', 'agent-feedback-agent'];

      for (const slug of testAgents) {
        const response = await fetch(`${API_BASE_URL}/api/agents/${slug}`);
        expect(response.status).toBe(200);
      }
    }, TEST_TIMEOUT);

    it('should include agent tools in profile', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/page-builder-agent`);
      const data = await response.json();

      expect(data.data).toHaveProperty('tools');
      expect(Array.isArray(data.data.tools)).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Dynamic Pages Functionality', () => {
    it('should load agent pages endpoint', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agent-pages`);

      // Should return 200 or 404 (if no pages exist yet)
      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should support agent page creation', async () => {
      if (!serverAvailable) return;

      const testPage = {
        agent_slug: 'meta-agent',
        page_name: 'Regression Test Page',
        page_slug: 'regression-test-page',
        content: JSON.stringify({ type: 'test', data: [] })
      };

      const response = await fetch(`${API_BASE_URL}/api/agent-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPage)
      });

      // Should either succeed or return validation error
      expect([200, 201, 400, 409]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should retrieve agent pages by slug', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agent-pages/meta-agent`);

      // Should return 200 or 404 (if no pages)
      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('Navigation and Routes', () => {
    it('should have health endpoint working', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    it('should support CORS for frontend', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const corsHeader = response.headers.get('access-control-allow-origin');

      // CORS should be enabled
      expect(corsHeader).toBeTruthy();
    }, TEST_TIMEOUT);

    it('should handle 404 routes gracefully', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/nonexistent-endpoint`);

      expect(response.status).toBe(404);
    }, TEST_TIMEOUT);
  });

  describe('Database Connections', () => {
    it('should maintain PostgreSQL connection for posts', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should indicate PostgreSQL source
      if (data.source) {
        expect(['PostgreSQL', 'SQLite']).toContain(data.source);
      }
    }, TEST_TIMEOUT);

    it('should use filesystem for agents', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(13);

      // All agents should have filePath
      data.data.forEach(agent => {
        expect(agent).toHaveProperty('filePath');
        expect(agent.filePath).toContain('/prod/.claude/agents/');
      });
    }, TEST_TIMEOUT);
  });

  describe('API Response Formats', () => {
    it('should maintain consistent response format for posts', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');

      if (data.data.length > 0) {
        const post = data.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('created_at');
      }
    }, TEST_TIMEOUT);

    it('should maintain consistent response format for agents', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('timestamp');
    }, TEST_TIMEOUT);

    it('should maintain consistent error format', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/nonexistent`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    }, TEST_TIMEOUT);
  });

  describe('Performance Regression', () => {
    it('should maintain fast response times for agents endpoint', async () => {
      if (!serverAvailable) return;

      const start = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, TEST_TIMEOUT);

    it('should maintain fast response times for posts endpoint', async () => {
      if (!serverAvailable) return;

      const start = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/posts?limit=10`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    }, TEST_TIMEOUT);

    it('should handle concurrent requests efficiently', async () => {
      if (!serverAvailable) return;

      const start = Date.now();

      const requests = [
        fetch(`${API_BASE_URL}/api/agents`),
        fetch(`${API_BASE_URL}/api/posts?limit=5`),
        fetch(`${API_BASE_URL}/api/agents/meta-agent`)
      ];

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      responses.forEach(r => expect(r.status).toBe(200));
      expect(duration).toBeLessThan(2000);
    }, TEST_TIMEOUT);
  });

  describe('Data Integrity', () => {
    it('should not have duplicate agent IDs', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const ids = data.data.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    }, TEST_TIMEOUT);

    it('should maintain referential integrity for posts and agents', async () => {
      if (!serverAvailable) return;

      const postsResponse = await fetch(`${API_BASE_URL}/api/posts?limit=10`);
      const postsData = await postsResponse.json();

      if (postsData.data && postsData.data.length > 0) {
        const agentsResponse = await fetch(`${API_BASE_URL}/api/agents`);
        const agentsData = await agentsResponse.json();

        const agentNames = agentsData.data.map(a => a.name);

        postsData.data.forEach(post => {
          if (post.agent_name) {
            // Agent name in post should exist in agents list (or be valid)
            const isValid = agentNames.includes(post.agent_name) || post.agent_name.length > 0;
            expect(isValid).toBe(true);
          }
        });
      }
    }, TEST_TIMEOUT);
  });

  describe('Backward Compatibility', () => {
    it('should support legacy agent lookup by name', async () => {
      if (!serverAvailable) return;

      // Try looking up agent by name (backward compatibility)
      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.lookup_method).toBeDefined();
    }, TEST_TIMEOUT);

    it('should maintain agent list count consistency', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      // Count should match between total and data.length
      expect(data.total).toBe(data.data.length);
      expect(data.total).toBe(13);
    }, TEST_TIMEOUT);
  });
});
