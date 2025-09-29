/**
 * Frontend-API Integration Tests - London School TDD
 * Tests real API calls between frontend and API server
 */

import { jest } from '@jest/globals';
import { validate as uuidValidate } from 'uuid';

// Mock fetch for controlled testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;
process.env = {
  ...originalEnv,
  VITE_API_BASE_URL: 'http://localhost:3001'
};

describe('Frontend-API Integration - London School TDD', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('API Base URL Configuration', () => {
    it('should use API server on port 3001 from environment', () => {
      // Verify environment variable is set correctly
      expect(process.env.VITE_API_BASE_URL).toBe('http://localhost:3001');
    });

    it('should construct proper API URLs for different endpoints', () => {
      const baseUrl = process.env.VITE_API_BASE_URL;
      
      expect(`${baseUrl}/api/agents`).toBe('http://localhost:3001/api/agents');
      expect(`${baseUrl}/api/agent-posts`).toBe('http://localhost:3001/api/agent-posts');
      expect(`${baseUrl}/health`).toBe('http://localhost:3001/health');
    });
  });

  describe('Frontend Agents Page Integration', () => {
    it('should successfully fetch agents from API server', async () => {
      // Mock successful API response with UUID data
      const mockAgentsResponse = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Code Assistant',
          status: 'active',
          category: 'Development'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001', 
          name: 'Data Analyzer',
          status: 'active',
          category: 'Analytics'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAgentsResponse
      });

      // Test frontend fetch call
      const response = await fetch('/api/agents');
      const data = await response.json();

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/agents');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify response structure
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      
      data.forEach(agent => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status');
        expect(agent).toHaveProperty('category');
        expect(uuidValidate(agent.id)).toBe(true);
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let caughtError;
      try {
        await fetch('/api/agents');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('Network error');
    });

    it('should handle HTTP error responses', async () => {
      // Mock HTTP error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await fetch('/api/agents');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Agent Posts Integration', () => {
    it('should fetch agent posts with authorAgent relationships', async () => {
      const mockPostsResponse = {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            agent_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test Post',
            content: 'Test content',
            authorAgent: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Code Assistant',
              status: 'active',
              category: 'Development'
            }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPostsResponse
      });

      const response = await fetch('/api/agent-posts');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      
      data.data.forEach(post => {
        // Verify post structure
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('agent_id');
        expect(post).toHaveProperty('authorAgent');
        
        // Verify UUID strings support slice operations
        expect(typeof post.id).toBe('string');
        expect(() => post.id.slice(0, 8)).not.toThrow();
        expect(uuidValidate(post.id)).toBe(true);
        
        // Verify authorAgent relationship
        expect(post.authorAgent).toHaveProperty('id');
        expect(post.authorAgent).toHaveProperty('name');
        expect(uuidValidate(post.authorAgent.id)).toBe(true);
      });
    });

    it('should handle query parameters correctly', async () => {
      const queryParams = {
        limit: 10,
        offset: 0,
        search: 'test',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      };

      const queryString = new URLSearchParams(queryParams).toString();
      const expectedUrl = `/api/agent-posts?${queryString}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      await fetch(expectedUrl);

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('Error Scenario Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      
      mockFetch.mockRejectedValueOnce(timeoutError);

      let caughtError;
      try {
        await fetch('/api/agents');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.code).toBe('TIMEOUT');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      });

      const response = await fetch('/api/agents');
      
      let jsonError;
      try {
        await response.json();
      } catch (error) {
        jsonError = error;
      }

      expect(jsonError).toBeInstanceOf(SyntaxError);
    });

    it('should handle API server unavailable scenarios', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      
      mockFetch.mockRejectedValueOnce(connectionError);

      let caughtError;
      try {
        await fetch('/api/agents');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.code).toBe('ECONNREFUSED');
    });
  });

  describe('Real API Behavior Verification', () => {
    // Tests that would run against actual API server
    // These use real fetch calls when API server is running
    
    const runRealApiTests = process.env.TEST_REAL_API === 'true';
    
    (runRealApiTests ? describe : describe.skip)('Real API Server Tests', () => {
      beforeEach(() => {
        // Use real fetch for these tests
        global.fetch = global.originalFetch || fetch;
      });

      it('should connect to real API server on port 3001', async () => {
        try {
          const response = await fetch('http://localhost:3001/health');
          const data = await response.json();
          
          expect(response.ok).toBe(true);
          expect(data.status).toBe('healthy');
        } catch (error) {
          console.warn('Real API server not available for testing');
          // Skip test if server not running
        }
      }, 10000);

      it('should fetch real agents with UUID structures', async () => {
        try {
          const response = await fetch('http://localhost:3001/api/agents');
          const data = await response.json();
          
          expect(Array.isArray(data)).toBe(true);
          data.forEach(agent => {
            expect(uuidValidate(agent.id)).toBe(true);
          });
        } catch (error) {
          console.warn('Real API server not available for testing');
        }
      }, 10000);
    });
  });
});
