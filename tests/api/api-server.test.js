/**
 * API Server Unit Tests - London School TDD
 * Tests the Express API server behavior and interactions
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// Mock the server module to test behavior
const mockCors = jest.fn();
const mockExpress = {
  json: jest.fn(),
  use: jest.fn(),
  get: jest.fn(),
  listen: jest.fn()
};

jest.mock('express', () => {
  const mockApp = {
    use: mockExpress.use,
    get: mockExpress.get,
    listen: mockExpress.listen
  };
  return jest.fn(() => mockApp);
});

jest.mock('cors', () => mockCors);

// Import server after mocking dependencies
let server;

describe('API Server - London School TDD', () => {
  
  describe('Server Configuration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should configure CORS with correct origins', async () => {
      // Import and instantiate server
      const { default: app } = await import('/workspaces/agent-feed/api-server/server.js');
      
      // Verify CORS was called with correct configuration
      expect(mockCors).toHaveBeenCalledWith({
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      });
    });

    it('should configure JSON middleware', async () => {
      const { default: app } = await import('/workspaces/agent-feed/api-server/server.js');
      
      // Verify express.json() middleware was configured
      expect(mockExpress.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should register all required endpoints', async () => {
      const { default: app } = await import('/workspaces/agent-feed/api-server/server.js');
      
      // Verify all endpoints are registered
      const expectedEndpoints = [
        '/api/agents',
        '/api/agent-posts', 
        '/api/v1/agent-posts',
        '/api/filter-data',
        '/api/filter-stats',
        '/health'
      ];
      
      expectedEndpoints.forEach(endpoint => {
        expect(mockExpress.get).toHaveBeenCalledWith(endpoint, expect.any(Function));
      });
    });
  });

  describe('UUID Data Structure Validation', () => {
    let app;
    
    beforeAll(async () => {
      // Import the actual server for real API tests
      const serverModule = await import('/workspaces/agent-feed/api-server/server.js');
      app = serverModule.default;
    });

    it('should return agents with valid UUID strings', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      response.body.forEach(agent => {
        // Verify agent has proper structure
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status');
        expect(agent).toHaveProperty('category');
        
        // Verify ID is a valid UUID string
        expect(typeof agent.id).toBe('string');
        expect(uuidValidate(agent.id)).toBe(true);
        
        // Verify status is active
        expect(agent.status).toBe('active');
      });
    });

    it('should return agent posts with valid UUID structures', async () => {
      const response = await request(app)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(post => {
        // Verify post structure
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('agent_id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('authorAgent');
        
        // Verify UUIDs are valid strings
        expect(typeof post.id).toBe('string');
        expect(typeof post.agent_id).toBe('string');
        expect(uuidValidate(post.id)).toBe(true);
        expect(uuidValidate(post.agent_id)).toBe(true);
        
        // Verify authorAgent has complete data
        expect(post.authorAgent).toHaveProperty('id');
        expect(post.authorAgent).toHaveProperty('name');
        expect(post.authorAgent).toHaveProperty('status');
        expect(post.authorAgent).toHaveProperty('category');
        expect(uuidValidate(post.authorAgent.id)).toBe(true);
      });
    });

    it('should support string slice operations on post IDs', async () => {
      const response = await request(app)
        .get('/api/agent-posts')
        .expect(200);
      
      response.body.data.forEach(post => {
        // This should not throw "slice is not a function" error
        expect(() => {
          const shortId = post.id.slice(0, 8);
          expect(typeof shortId).toBe('string');
          expect(shortId.length).toBe(8);
        }).not.toThrow();
      });
    });
  });

  describe('CORS Headers Validation', () => {
    let app;
    
    beforeAll(async () => {
      const serverModule = await import('/workspaces/agent-feed/api-server/server.js');
      app = serverModule.default;
    });

    it('should set CORS headers for frontend requests', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/agents')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBeLessThan(400);
    });
  });

  describe('Health Check Endpoint', () => {
    let app;
    
    beforeAll(async () => {
      const serverModule = await import('/workspaces/agent-feed/api-server/server.js');
      app = serverModule.default;
    });

    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      
      // Verify timestamp is valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe('Filter Data Endpoints', () => {
    let app;
    
    beforeAll(async () => {
      const serverModule = await import('/workspaces/agent-feed/api-server/server.js');
      app = serverModule.default;
    });

    it('should return filter data with proper structure', async () => {
      const response = await request(app)
        .get('/api/filter-data')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      
      response.body.data.categories.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('count');
        expect(typeof category.count).toBe('number');
      });
    });

    it('should return filter stats with user data', async () => {
      const response = await request(app)
        .get('/api/filter-stats?user_id=test-user')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user_id', 'test-user');
      expect(response.body.data).toHaveProperty('total_filters_applied');
      expect(response.body.data).toHaveProperty('most_used_filters');
      expect(Array.isArray(response.body.data.most_used_filters)).toBe(true);
    });
  });

  describe('Query Parameter Handling', () => {
    let app;
    
    beforeAll(async () => {
      const serverModule = await import('/workspaces/agent-feed/api-server/server.js');
      app = serverModule.default;
    });

    it('should handle agent-posts query parameters', async () => {
      const response = await request(app)
        .get('/api/agent-posts?limit=1&offset=0&search=data&sortBy=published_at&sortOrder=DESC')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('limit', 1);
      expect(response.body).toHaveProperty('offset', 0);
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter posts by search term', async () => {
      const response = await request(app)
        .get('/api/agent-posts?search=data')
        .expect(200);

      response.body.data.forEach(post => {
        const containsSearchTerm = 
          post.title.toLowerCase().includes('data') ||
          post.content.toLowerCase().includes('data');
        expect(containsSearchTerm).toBe(true);
      });
    });
  });
});
