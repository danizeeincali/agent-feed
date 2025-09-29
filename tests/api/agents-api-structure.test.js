/**
 * TDD Tests for API Response Structure Fix
 * Testing the new standardized API response structure across all endpoints
 */

import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';

// Mock Next.js API handler
const createTestServer = (handler) => {
  return createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    req.query = parsedUrl.query;
    handler(req, res);
  });
};

describe('API Response Structure Fix - TDD Tests', () => {
  describe('/api/agents endpoint', () => {
    let server;
    let agentsHandler;

    beforeEach(async () => {
      // Load the agents API handler
      const agentsModule = await import('../../pages/api/agents.js');
      agentsHandler = agentsModule.default;
      server = createTestServer(agentsHandler);
    });

    afterEach(() => {
      if (server) {
        server.close();
      }
    });

    describe('GET request', () => {
      it('should return proper object structure with success field', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('agents');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should return agents array in agents property', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(Array.isArray(response.body.agents)).toBe(true);
        expect(response.body.agents.length).toBeGreaterThan(0);
      });

      it('should return correct total count matching agents array length', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body.total).toBe(response.body.agents.length);
        expect(typeof response.body.total).toBe('number');
      });

      it('should return valid ISO timestamp', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body.timestamp).toBeDefined();
        expect(() => new Date(response.body.timestamp)).not.toThrow();

        const timestamp = new Date(response.body.timestamp);
        expect(timestamp.toISOString()).toBe(response.body.timestamp);
      });

      it('should maintain CORS headers', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
        expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
      });

      it('should contain expected agent properties', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        const firstAgent = response.body.agents[0];
        expect(firstAgent).toHaveProperty('id');
        expect(firstAgent).toHaveProperty('name');
        expect(firstAgent).toHaveProperty('status');
        expect(firstAgent).toHaveProperty('category');
      });

      it('should not return flat array (regression test)', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        // Ensure we're not returning the old flat array structure
        expect(Array.isArray(response.body)).toBe(false);
        expect(response.body).toBeInstanceOf(Object);
      });
    });

    describe('OPTIONS request (CORS preflight)', () => {
      it('should handle OPTIONS request correctly', async () => {
        await request(server)
          .options('/')
          .expect(200);
      });

      it('should return proper CORS headers for OPTIONS', async () => {
        const response = await request(server)
          .options('/');

        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
        expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
      });
    });

    describe('Unsupported methods', () => {
      it('should return 405 for POST requests', async () => {
        const response = await request(server)
          .post('/')
          .expect(405);

        expect(response.body).toHaveProperty('error', 'Method not allowed');
      });

      it('should return 405 for PUT requests', async () => {
        const response = await request(server)
          .put('/')
          .expect(405);

        expect(response.body).toHaveProperty('error', 'Method not allowed');
      });

      it('should return 405 for DELETE requests', async () => {
        const response = await request(server)
          .delete('/')
          .expect(405);

        expect(response.body).toHaveProperty('error', 'Method not allowed');
      });
    });
  });

  describe('/api/agent-posts endpoint', () => {
    let server;
    let agentPostsHandler;

    beforeEach(async () => {
      const agentPostsModule = await import('../../pages/api/agent-posts.js');
      agentPostsHandler = agentPostsModule.default;
      server = createTestServer(agentPostsHandler);
    });

    afterEach(() => {
      if (server) {
        server.close();
      }
    });

    describe('GET request with consistent structure', () => {
      it('should return proper object structure', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('limit');
        expect(response.body).toHaveProperty('offset');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should include timestamp field for consistency', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body.timestamp).toBeDefined();
        expect(() => new Date(response.body.timestamp)).not.toThrow();
      });

      it('should handle pagination parameters', async () => {
        const response = await request(server)
          .get('/?limit=5&offset=0')
          .expect(200);

        expect(response.body.limit).toBe(5);
        expect(response.body.offset).toBe(0);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should handle search parameters', async () => {
        const response = await request(server)
          .get('/?search=test&filter=published')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('/api/v1/agent-posts endpoint', () => {
    let server;
    let v1AgentPostsHandler;

    beforeEach(async () => {
      const v1Module = await import('../../pages/api/v1/agent-posts.js');
      v1AgentPostsHandler = v1Module.default;
      server = createTestServer(v1AgentPostsHandler);
    });

    afterEach(() => {
      if (server) {
        server.close();
      }
    });

    describe('V1 API structure consistency', () => {
      it('should return proper v1 API structure', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('version', '1.0');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
      });

      it('should include meta object with timestamp', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        expect(response.body.meta).toHaveProperty('timestamp');
        expect(response.body.meta).toHaveProperty('total');
        expect(response.body.meta).toHaveProperty('limit');
        expect(response.body.meta).toHaveProperty('offset');
      });

      it('should include enhanced post properties', async () => {
        const response = await request(server)
          .get('/')
          .expect(200);

        const firstPost = response.body.data[0];
        expect(firstPost).toHaveProperty('author');
        expect(firstPost).toHaveProperty('views');
        expect(firstPost).toHaveProperty('likes');
      });
    });
  });

  describe('API Structure Consistency Tests', () => {
    it('should maintain consistency across API versions', async () => {
      const [agentsModule, agentPostsModule, v1Module] = await Promise.all([
        import('../../pages/api/agents.js'),
        import('../../pages/api/agent-posts.js'),
        import('../../pages/api/v1/agent-posts.js')
      ]);

      const agentsHandler = agentsModule.default;
      const agentPostsHandler = agentPostsModule.default;
      const v1Handler = v1Module.default;

      const agentsServer = createTestServer(agentsHandler);
      const postsServer = createTestServer(agentPostsHandler);
      const v1Server = createTestServer(v1Handler);

      try {
        const [agentsResponse, postsResponse, v1Response] = await Promise.all([
          request(agentsServer).get('/'),
          request(postsServer).get('/'),
          request(v1Server).get('/')
        ]);

        // All should have success field
        expect(agentsResponse.body.success).toBe(true);
        expect(postsResponse.body.success).toBe(true);
        expect(v1Response.body.success).toBe(true);

        // All should have timestamp
        expect(agentsResponse.body.timestamp).toBeDefined();
        expect(postsResponse.body.timestamp).toBeDefined();
        expect(v1Response.body.meta.timestamp).toBeDefined();

        // All should return proper status codes
        expect(agentsResponse.status).toBe(200);
        expect(postsResponse.status).toBe(200);
        expect(v1Response.status).toBe(200);
      } finally {
        agentsServer.close();
        postsServer.close();
        v1Server.close();
      }
    });

    it('should ensure all APIs return objects, not arrays', async () => {
      const [agentsModule, agentPostsModule, v1Module] = await Promise.all([
        import('../../pages/api/agents.js'),
        import('../../pages/api/agent-posts.js'),
        import('../../pages/api/v1/agent-posts.js')
      ]);

      const handlers = [
        agentsModule.default,
        agentPostsModule.default,
        v1Module.default
      ];

      for (const handler of handlers) {
        const server = createTestServer(handler);
        try {
          const response = await request(server).get('/');

          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(false);
          expect(typeof response.body).toBe('object');
          expect(response.body).not.toBeNull();
        } finally {
          server.close();
        }
      }
    });
  });

  describe('Error Handling Structure', () => {
    it('should return consistent error structure for unsupported methods', async () => {
      const agentsModule = await import('../../pages/api/agents.js');
      const agentsHandler = agentsModule.default;
      const server = createTestServer(agentsHandler);

      try {
        const response = await request(server)
          .post('/')
          .expect(405);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Method not allowed');
      } finally {
        server.close();
      }
    });

    it('should maintain CORS headers even for error responses', async () => {
      const agentsModule = await import('../../pages/api/agents.js');
      const agentsHandler = agentsModule.default;
      const server = createTestServer(agentsHandler);

      try {
        const response = await request(server)
          .post('/')
          .expect(405);

        expect(response.headers['access-control-allow-origin']).toBe('*');
      } finally {
        server.close();
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond within acceptable time limits', async () => {
      const agentsModule = await import('../../pages/api/agents.js');
      const agentsHandler = agentsModule.default;
      const server = createTestServer(agentsHandler);

      try {
        const startTime = Date.now();
        await request(server).get('/').expect(200);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
      } finally {
        server.close();
      }
    });

    it('should handle multiple concurrent requests', async () => {
      const agentsModule = await import('../../pages/api/agents.js');
      const agentsHandler = agentsModule.default;
      const server = createTestServer(agentsHandler);

      try {
        const requests = Array(10).fill(null).map(() =>
          request(server).get('/').expect(200)
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
          expect(response.body.success).toBe(true);
          expect(response.body.agents).toBeDefined();
        });
      } finally {
        server.close();
      }
    });
  });
});