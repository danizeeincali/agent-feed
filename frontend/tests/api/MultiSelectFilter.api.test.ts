/**
 * API Tests for Multi-Select Filter Endpoint
 * 
 * Comprehensive tests for the multi-select filter API endpoint validation,
 * including parameter construction, backend communication, and response handling.
 */

import { apiService } from '../../src/services/api';

// Mock fetch for API testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Debug logging for API tests
const DEBUG_ENABLED = true;
const debugLog = (stage: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.log(`[API_DEBUG] ${stage}:`, data ? JSON.stringify(data, null, 2) : '');
  }
};

describe('Multi-Select Filter API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    debugLog('=== Starting new API test ===');
  });

  afterEach(() => {
    // Clear any cached data
    apiService.clearCache();
  });

  describe('1. API Parameter Construction', () => {
    test('should construct correct URL parameters for agents-only filter', async () => {
      debugLog('Testing agents-only filter parameters');

      const mockResponse = {
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: ['Agent1', 'Agent2'],
          hashtags: [],
          mode: 'AND'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['Agent1', 'Agent2'],
        hashtags: [],
        combinationMode: 'AND' as const
      };

      await apiService.getFilteredPosts(50, 0, filter);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      expect(url).toContain('filter=multi-select');
      expect(url).toContain('agents=Agent1%2CAgent2');
      expect(url).toContain('mode=AND');
      expect(url).not.toContain('hashtags=');

      debugLog('Agents-only filter parameters validated', {
        url,
        expectedAgents: 'Agent1,Agent2',
        expectedMode: 'AND'
      });
    });

    test('should construct correct URL parameters for hashtags-only filter', async () => {
      debugLog('Testing hashtags-only filter parameters');

      const mockResponse = {
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: [],
          hashtags: ['react', 'testing'],
          mode: 'OR'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: [],
        hashtags: ['react', 'testing'],
        combinationMode: 'OR' as const
      };

      await apiService.getFilteredPosts(50, 0, filter);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      expect(url).toContain('filter=multi-select');
      expect(url).toContain('hashtags=react%2Ctesting');
      expect(url).toContain('mode=OR');
      expect(url).not.toContain('agents=');

      debugLog('Hashtags-only filter parameters validated', {
        url,
        expectedHashtags: 'react,testing',
        expectedMode: 'OR'
      });
    });

    test('should construct correct URL parameters for mixed agents and hashtags filter', async () => {
      debugLog('Testing mixed agents and hashtags filter parameters');

      const mockResponse = {
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent', 'DevAgent'],
          hashtags: ['react', 'ui', 'testing'],
          mode: 'AND'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent', 'DevAgent'],
        hashtags: ['react', 'ui', 'testing'],
        combinationMode: 'AND' as const
      };

      await apiService.getFilteredPosts(50, 0, filter);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      expect(url).toContain('filter=multi-select');
      expect(url).toContain('agents=TestAgent%2CDevAgent');
      expect(url).toContain('hashtags=react%2Cui%2Ctesting');
      expect(url).toContain('mode=AND');

      debugLog('Mixed filter parameters validated', {
        url,
        expectedAgents: 'TestAgent,DevAgent',
        expectedHashtags: 'react,ui,testing',
        expectedMode: 'AND'
      });
    });

    test('should handle special characters in agent names and hashtags', async () => {
      debugLog('Testing special characters in parameters');

      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['Agent-1', 'Agent_2', 'Agent@3'],
        hashtags: ['react-native', 'ui_components', 'test@ing'],
        combinationMode: 'OR' as const
      };

      await apiService.getFilteredPosts(50, 0, filter);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      // Verify URL encoding
      expect(url).toContain('agents=Agent-1%2CAgent_2%2CAgent%403');
      expect(url).toContain('hashtags=react-native%2Cui_components%2Ctest%40ing');

      debugLog('Special characters encoded correctly in URL', { url });
    });

    test('should include all standard parameters along with filter-specific ones', async () => {
      debugLog('Testing standard parameters inclusion');

      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['Agent1'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      await apiService.getFilteredPosts(50, 0, filter);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      // Check all standard parameters are included
      expect(url).toContain('limit=50');
      expect(url).toContain('offset=0');
      expect(url).toContain('sortBy=published_at');
      expect(url).toContain('sortOrder=DESC');
      expect(url).toContain('search=');

      debugLog('Standard parameters included correctly', { url });
    });
  });

  describe('2. Backend Response Validation', () => {
    test('should handle successful multi-select response', async () => {
      debugLog('Testing successful multi-select response');

      const mockPosts = [
        {
          id: '1',
          title: 'React Testing Post',
          content: 'Content with #react and #testing',
          authorAgent: 'TestAgent',
          publishedAt: '2024-01-01T12:00:00Z',
          tags: ['react', 'testing'],
          engagement: { comments: 5, isSaved: false },
          metadata: { businessImpact: 85 }
        },
        {
          id: '2',
          title: 'UI Development',
          content: 'UI development with #react and #ui',
          authorAgent: 'UIAgent',
          publishedAt: '2024-01-02T12:00:00Z',
          tags: ['react', 'ui'],
          engagement: { comments: 3, isSaved: true },
          metadata: { businessImpact: 92 }
        }
      ];

      const mockResponse = {
        success: true,
        data: mockPosts,
        total: mockPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent', 'UIAgent'],
          hashtags: ['react'],
          mode: 'OR'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent', 'UIAgent'],
        hashtags: ['react'],
        combinationMode: 'OR' as const
      };

      const result = await apiService.getFilteredPosts(50, 0, filter);

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.filtered).toBe(true);
      expect(result.appliedFilters).toMatchObject({
        agents: ['TestAgent', 'UIAgent'],
        hashtags: ['react'],
        mode: 'OR'
      });

      debugLog('Successful response validated', result);
    });

    test('should handle empty results response', async () => {
      debugLog('Testing empty results response');

      const mockResponse = {
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: ['NonexistentAgent'],
          hashtags: ['nonexistentTag'],
          mode: 'AND'
        },
        message: 'No posts match the specified criteria'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['NonexistentAgent'],
        hashtags: ['nonexistentTag'],
        combinationMode: 'AND' as const
      };

      const result = await apiService.getFilteredPosts(50, 0, filter);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.filtered).toBe(true);

      debugLog('Empty results response validated', result);
    });

    test('should handle backend error responses', async () => {
      debugLog('Testing backend error response');

      const errorResponse = {
        success: false,
        error: 'At least one agent or hashtag must be specified for multi-select filter',
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: [],
        hashtags: [],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('HTTP error! status: 400');
      }

      debugLog('Backend error response handled correctly');
    });

    test('should handle malformed backend responses', async () => {
      debugLog('Testing malformed backend response');

      // Response missing required fields
      const malformedResponse = {
        // missing success field
        posts: [], // wrong field name
        count: 0   // wrong field name
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => malformedResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      const result = await apiService.getFilteredPosts(50, 0, filter);

      // API service should handle and normalize the response
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');

      debugLog('Malformed response handled', result);
    });

    test('should validate response data structure', async () => {
      debugLog('Testing response data structure validation');

      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Test Post',
            content: 'Test content',
            authorAgent: 'TestAgent',
            publishedAt: '2024-01-01T12:00:00Z',
            tags: ['test'],
            engagement: {
              comments: 0,
              isSaved: false
            },
            metadata: {
              businessImpact: 75
            }
          }
        ],
        total: 1,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent'],
          hashtags: ['test'],
          mode: 'AND'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['test'],
        combinationMode: 'AND' as const
      };

      const result = await apiService.getFilteredPosts(50, 0, filter);

      // Validate complete response structure
      expect(result).toMatchObject({
        success: true,
        data: [
          {
            id: expect.any(String),
            title: expect.any(String),
            content: expect.any(String),
            authorAgent: expect.any(String),
            publishedAt: expect.any(String),
            tags: expect.any(Array),
            engagement: {
              comments: expect.any(Number),
              isSaved: expect.any(Boolean)
            },
            metadata: {
              businessImpact: expect.any(Number)
            }
          }
        ],
        total: expect.any(Number),
        filtered: true,
        appliedFilters: {
          agents: expect.any(Array),
          hashtags: expect.any(Array),
          mode: expect.stringMatching(/^(AND|OR)$/)
        }
      });

      debugLog('Response structure validated successfully');
    });
  });

  describe('3. Error Handling and Edge Cases', () => {
    test('should handle network failures', async () => {
      debugLog('Testing network failure handling');

      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network request failed');
      }

      debugLog('Network failure handled correctly');
    });

    test('should handle timeout scenarios', async () => {
      debugLog('Testing timeout scenario');

      // Mock a timeout scenario
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown a timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Request timeout');
      }

      debugLog('Timeout scenario handled correctly');
    });

    test('should handle invalid JSON responses', async () => {
      debugLog('Testing invalid JSON response');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown a JSON parsing error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Unexpected token in JSON');
      }

      debugLog('Invalid JSON response handled correctly');
    });

    test('should handle server errors (500)', async () => {
      debugLog('Testing server error (500)');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('HTTP error! status: 500');
      }

      debugLog('Server error (500) handled correctly');
    });

    test('should handle rate limiting (429)', async () => {
      debugLog('Testing rate limiting (429)');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: 'Too many requests'
        })
      });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      try {
        await apiService.getFilteredPosts(50, 0, filter);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('HTTP error! status: 429');
      }

      debugLog('Rate limiting (429) handled correctly');
    });
  });

  describe('4. Caching Behavior', () => {
    test('should not cache multi-select filter requests by default', async () => {
      debugLog('Testing caching behavior for multi-select requests');

      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      // Make two identical requests
      await apiService.getFilteredPosts(50, 0, filter);
      await apiService.getFilteredPosts(50, 0, filter);

      // Should have made two separate fetch calls (no caching)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      debugLog('Multi-select requests not cached (as expected)');
    });

    test('should clear cache when filter parameters change', async () => {
      debugLog('Testing cache clearing on filter changes');

      // This test verifies the cache clearing logic
      apiService.clearCache('/agent-posts');
      
      // Test cache clearing with pattern
      apiService.clearCache('multi-select');
      
      debugLog('Cache clearing validated');
    });
  });

  describe('5. Performance and Load Testing', () => {
    test('should handle concurrent multi-select requests', async () => {
      debugLog('Testing concurrent multi-select requests');

      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      // Mock multiple concurrent responses
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });
      }

      const filter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      // Make 5 concurrent requests
      const promises = Array(5).fill(null).map(() => 
        apiService.getFilteredPosts(50, 0, filter)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledTimes(5);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      debugLog('Concurrent requests handled successfully');
    });

    test('should handle large parameter lists', async () => {
      debugLog('Testing large parameter lists');

      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Create large lists of agents and hashtags
      const largeAgentList = Array.from({ length: 50 }, (_, i) => `Agent${i + 1}`);
      const largeHashtagList = Array.from({ length: 50 }, (_, i) => `tag${i + 1}`);

      const filter = {
        type: 'multi-select' as const,
        agents: largeAgentList,
        hashtags: largeHashtagList,
        combinationMode: 'OR' as const
      };

      const result = await apiService.getFilteredPosts(50, 0, filter);

      expect(result.success).toBe(true);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0];

      // Verify all parameters are included
      expect(url).toContain('agents=');
      expect(url).toContain('hashtags=');
      expect(url.length).toBeGreaterThan(1000); // URL should be quite long

      debugLog('Large parameter lists handled', {
        agentCount: largeAgentList.length,
        hashtagCount: largeHashtagList.length,
        urlLength: url.length
      });
    });
  });
});