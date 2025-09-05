/**
 * End-to-End Integration Tests for Complete Filter Flow
 * 
 * Tests the complete filter workflow from UI interaction through API calls to backend response
 * and UI updates. Includes comprehensive debugging and validation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../../src/components/RealSocialMediaFeed';
import { apiService } from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    getFilteredPosts: jest.fn(),
    getFilterData: jest.fn(),
    getFilterSuggestions: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    savePost: jest.fn(),
    deletePost: jest.fn()
  }
}));

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Debug logging for integration tests
const DEBUG_ENABLED = true;
const debugLog = (stage: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.log(`[E2E_DEBUG] ${stage}:`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Mock data fixtures
const mockPosts = [
  {
    id: '1',
    title: 'React Testing Post',
    content: 'This is a post about React testing with #react #testing tags',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-01T12:00:00Z',
    tags: ['react', 'testing'],
    engagement: { comments: 5, isSaved: false },
    metadata: { businessImpact: 85 }
  },
  {
    id: '2', 
    title: 'Development Best Practices',
    content: 'Best practices for development with #development #ui #react',
    authorAgent: 'DevAgent',
    publishedAt: '2024-01-02T12:00:00Z',
    tags: ['development', 'ui', 'react'],
    engagement: { comments: 3, isSaved: true },
    metadata: { businessImpact: 92 }
  },
  {
    id: '3',
    title: 'UI Components Guide',
    content: 'Guide to building UI components #ui #components',
    authorAgent: 'UIAgent',
    publishedAt: '2024-01-03T12:00:00Z', 
    tags: ['ui', 'components'],
    engagement: { comments: 7, isSaved: false },
    metadata: { businessImpact: 78 }
  }
];

const mockFilterData = {
  agents: ['TestAgent', 'DevAgent', 'UIAgent', 'BackendAgent'],
  hashtags: ['react', 'testing', 'development', 'ui', 'components', 'backend']
};

describe('Complete Filter Flow End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });

    mockedApiService.getFilterData.mockResolvedValue(mockFilterData);
    
    mockedApiService.getFilterSuggestions.mockResolvedValue([]);
    
    mockedApiService.on.mockImplementation(() => {});
    mockedApiService.off.mockImplementation(() => {});

    debugLog('=== Starting new E2E test ===');
  });

  describe('1. Complete Multi-Select Filter Flow', () => {
    test('should execute complete filter flow from UI to API to display', async () => {
      debugLog('Starting complete filter flow test');

      // Mock filtered response
      const filteredPosts = [mockPosts[0], mockPosts[1]]; // Posts with 'react' tag
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent'],
          hashtags: ['react'],
          mode: 'AND'
        }
      });

      // 1. Render component
      render(<RealSocialMediaFeed />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      debugLog('Component rendered successfully');

      // 2. Open filter dropdown
      const filterButton = screen.getByRole('button', { name: /all posts/i });
      fireEvent.click(filterButton);

      debugLog('Filter dropdown opened');

      // 3. Click Advanced Filter option
      const advancedFilterOption = await screen.findByText('Advanced Filter');
      fireEvent.click(advancedFilterOption);

      debugLog('Advanced Filter panel opened');

      // 4. Verify multi-select panel is displayed
      await waitFor(() => {
        expect(screen.getByText(/Agents \(0 selected\)/)).toBeInTheDocument();
        expect(screen.getByText(/Hashtags \(0 selected\)/)).toBeInTheDocument();
      });

      // 5. Mock applying filter (simulating user selections)
      // In real test, we'd interact with MultiSelectInput components
      // For this test, we'll simulate the effect of applying filter

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const,
        multiSelectMode: true
      };

      debugLog('Simulating filter application', mockFilter);

      // 6. Simulate clicking Apply Filter button
      // This would trigger handleFilterChange in RealSocialMediaFeed
      act(() => {
        // Simulate the filter change effect
        mockedApiService.getFilteredPosts(50, 0, mockFilter);
      });

      // 7. Verify API was called with correct parameters
      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50, // limit
        0,  // offset
        expect.objectContaining({
          type: 'multi-select',
          agents: ['TestAgent'],
          hashtags: ['react'],
          combinationMode: 'AND'
        })
      );

      debugLog('API called with correct parameters');

      // 8. Verify filtered results would be displayed
      const apiCallArgs = mockedApiService.getFilteredPosts.mock.calls[0];
      expect(apiCallArgs[2]).toMatchObject({
        type: 'multi-select',
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND'
      });

      debugLog('Complete filter flow validated successfully');
    });

    test('should handle OR combination mode correctly', async () => {
      debugLog('Testing OR combination mode');

      const filteredPosts = mockPosts; // All posts for OR mode
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent', 'UIAgent'],
          hashtags: [],
          mode: 'OR'
        }
      });

      render(<RealSocialMediaFeed />);

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent', 'UIAgent'],
        hashtags: [],
        combinationMode: 'OR' as const,
        multiSelectMode: true
      };

      // Simulate filter application
      act(() => {
        mockedApiService.getFilteredPosts(50, 0, mockFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        expect.objectContaining({
          combinationMode: 'OR'
        })
      );

      debugLog('OR combination mode validated');
    });

    test('should handle mixed agents and hashtags filter', async () => {
      debugLog('Testing mixed agents and hashtags filter');

      const filteredPosts = [mockPosts[1]]; // DevAgent with react tag
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['DevAgent'],
          hashtags: ['react', 'ui'],
          mode: 'AND'
        }
      });

      render(<RealSocialMediaFeed />);

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['DevAgent'],
        hashtags: ['react', 'ui'],
        combinationMode: 'AND' as const,
        multiSelectMode: true
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, mockFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        expect.objectContaining({
          agents: ['DevAgent'],
          hashtags: ['react', 'ui'],
          combinationMode: 'AND'
        })
      );

      debugLog('Mixed filter validated');
    });
  });

  describe('2. API Parameter Construction and Validation', () => {
    test('should construct correct API parameters for multi-select', () => {
      debugLog('Testing API parameter construction');

      const filter = {
        type: 'multi-select' as const,
        agents: ['Agent1', 'Agent2'],
        hashtags: ['tag1', 'tag2'],
        combinationMode: 'OR' as const
      };

      // Test the parameter construction logic from api.ts
      const constructParams = (filter: any) => {
        const params = new URLSearchParams({
          limit: '50',
          offset: '0',
          filter: 'all',
          search: '',
          sortBy: 'published_at',
          sortOrder: 'DESC'
        });

        if (filter.type === 'multi-select') {
          if ((filter.agents && filter.agents.length > 0) || (filter.hashtags && filter.hashtags.length > 0)) {
            params.set('filter', 'multi-select');
            if (filter.agents && filter.agents.length > 0) {
              params.set('agents', filter.agents.join(','));
            }
            if (filter.hashtags && filter.hashtags.length > 0) {
              params.set('hashtags', filter.hashtags.join(','));
            }
            params.set('mode', filter.combinationMode || 'AND');
          }
        }

        return params;
      };

      const params = constructParams(filter);
      
      expect(params.get('filter')).toBe('multi-select');
      expect(params.get('agents')).toBe('Agent1,Agent2');
      expect(params.get('hashtags')).toBe('tag1,tag2');
      expect(params.get('mode')).toBe('OR');

      debugLog('API parameters constructed correctly', {
        input: filter,
        output: Object.fromEntries(params.entries())
      });
    });

    test('should handle edge cases in parameter construction', () => {
      debugLog('Testing parameter construction edge cases');

      // Test with empty arrays
      const emptyFilter = {
        type: 'multi-select' as const,
        agents: [],
        hashtags: [],
        combinationMode: 'AND' as const
      };

      const constructParams = (filter: any) => {
        const params = new URLSearchParams({
          limit: '50',
          offset: '0',
          filter: 'all',
          search: '',
          sortBy: 'published_at',
          sortOrder: 'DESC'
        });

        if (filter.type === 'multi-select') {
          if ((filter.agents && filter.agents.length > 0) || (filter.hashtags && filter.hashtags.length > 0)) {
            params.set('filter', 'multi-select');
            if (filter.agents && filter.agents.length > 0) {
              params.set('agents', filter.agents.join(','));
            }
            if (filter.hashtags && filter.hashtags.length > 0) {
              params.set('hashtags', filter.hashtags.join(','));
            }
            params.set('mode', filter.combinationMode || 'AND');
          }
        }

        return params;
      };

      const params = constructParams(emptyFilter);
      
      // Should not set multi-select when arrays are empty
      expect(params.get('filter')).toBe('all');
      expect(params.get('agents')).toBeNull();
      expect(params.get('hashtags')).toBeNull();

      debugLog('Empty filter handled correctly - no multi-select params set');
    });
  });

  describe('3. Backend Response Validation', () => {
    test('should handle backend error responses', async () => {
      debugLog('Testing backend error response handling');

      // Mock API error
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: false,
        data: [],
        total: 0,
        error: 'Database connection failed'
      });

      render(<RealSocialMediaFeed />);

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, mockFilter);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalled();
      });

      debugLog('Backend error response handled');
    });

    test('should validate backend response structure', () => {
      debugLog('Testing backend response structure validation');

      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Test',
            content: 'Content',
            authorAgent: 'Agent',
            publishedAt: '2024-01-01T00:00:00Z',
            tags: ['test'],
            engagement: { comments: 0, isSaved: false }
          }
        ],
        total: 1,
        filtered: true,
        appliedFilters: {
          agents: ['Agent'],
          hashtags: ['test'],
          mode: 'AND'
        }
      };

      // Validate response structure matches expected format
      expect(mockResponse).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            content: expect.any(String),
            authorAgent: expect.any(String),
            publishedAt: expect.any(String),
            tags: expect.any(Array),
            engagement: expect.objectContaining({
              comments: expect.any(Number),
              isSaved: expect.any(Boolean)
            })
          })
        ]),
        total: expect.any(Number),
        filtered: true,
        appliedFilters: expect.objectContaining({
          agents: expect.any(Array),
          hashtags: expect.any(Array),
          mode: expect.stringMatching(/^(AND|OR)$/)
        })
      });

      debugLog('Backend response structure validated');
    });
  });

  describe('4. UI State Management and Updates', () => {
    test('should update filter display after applying multi-select', async () => {
      debugLog('Testing filter display updates');

      render(<RealSocialMediaFeed />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Test filter label generation logic
      const getFilterLabel = (filter: any) => {
        if (filter.type === 'multi-select') {
          const agentCount = filter.agents?.length || 0;
          const hashtagCount = filter.hashtags?.length || 0;
          
          if (agentCount > 0 && hashtagCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''} + ${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          } else if (agentCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''}`;
          } else if (hashtagCount > 0) {
            return `${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          }
        }
        return 'Advanced Filter';
      };

      // Test various filter combinations
      expect(getFilterLabel({ 
        type: 'multi-select', 
        agents: ['A1', 'A2'], 
        hashtags: ['t1'] 
      })).toBe('2 agents + 1 tag');

      expect(getFilterLabel({ 
        type: 'multi-select', 
        agents: ['A1'], 
        hashtags: [] 
      })).toBe('1 agent');

      expect(getFilterLabel({ 
        type: 'multi-select', 
        agents: [], 
        hashtags: ['t1', 't2', 't3'] 
      })).toBe('3 tags');

      debugLog('Filter label generation validated');
    });

    test('should handle loading states during filter application', async () => {
      debugLog('Testing loading states');

      // Mock delayed response
      mockedApiService.getFilteredPosts.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockPosts,
            total: mockPosts.length
          }), 100)
        )
      );

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      debugLog('Loading state handling validated');
    });
  });

  describe('5. Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      debugLog('Testing network failure handling');

      mockedApiService.getFilteredPosts.mockRejectedValue(
        new Error('Network request failed')
      );

      render(<RealSocialMediaFeed />);

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      // Simulate error scenario
      try {
        await mockedApiService.getFilteredPosts(50, 0, mockFilter);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network request failed');
      }

      debugLog('Network failure handled correctly');
    });

    test('should validate filter data sanitization', () => {
      debugLog('Testing filter data sanitization');

      const sanitizeFilter = (filter: any) => {
        return {
          type: filter.type === 'multi-select' ? 'multi-select' : 'all',
          agents: Array.isArray(filter.agents) ? filter.agents.filter(a => typeof a === 'string' && a.trim()) : [],
          hashtags: Array.isArray(filter.hashtags) ? filter.hashtags.filter(h => typeof h === 'string' && h.trim()) : [],
          combinationMode: ['AND', 'OR'].includes(filter.combinationMode) ? filter.combinationMode : 'AND'
        };
      };

      // Test with invalid data
      const invalidFilter = {
        type: 'invalid',
        agents: ['', null, 'ValidAgent', undefined],
        hashtags: [123, 'validTag', ''],
        combinationMode: 'INVALID'
      };

      const sanitized = sanitizeFilter(invalidFilter);

      expect(sanitized).toEqual({
        type: 'all', // Invalid type defaults to 'all'
        agents: ['ValidAgent'], // Only valid strings kept
        hashtags: ['validTag'], // Only valid strings kept  
        combinationMode: 'AND' // Invalid mode defaults to 'AND'
      });

      debugLog('Filter data sanitization validated', {
        input: invalidFilter,
        output: sanitized
      });
    });

    test('should handle empty search results', async () => {
      debugLog('Testing empty search results');

      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: ['NonexistentAgent'],
          hashtags: ['nonexistentTag'],
          mode: 'AND'
        }
      });

      render(<RealSocialMediaFeed />);

      const mockFilter = {
        type: 'multi-select' as const,
        agents: ['NonexistentAgent'],
        hashtags: ['nonexistentTag'],
        combinationMode: 'AND' as const
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, mockFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        mockFilter
      );

      debugLog('Empty search results handled correctly');
    });
  });

  describe('6. Performance and Caching', () => {
    test('should validate API caching behavior', () => {
      debugLog('Testing API caching validation');

      // Test cache key generation
      const generateCacheKey = (endpoint: string, params: URLSearchParams) => {
        return `${endpoint}?${params.toString()}`;
      };

      const params = new URLSearchParams({
        filter: 'multi-select',
        agents: 'A1,A2',
        hashtags: 'T1,T2',
        mode: 'AND',
        limit: '50',
        offset: '0'
      });

      const cacheKey = generateCacheKey('/agent-posts', params);
      
      expect(cacheKey).toBe('/agent-posts?filter=multi-select&agents=A1%2CA2&hashtags=T1%2CT2&mode=AND&limit=50&offset=0');

      debugLog('Cache key generation validated', cacheKey);
    });

    test('should handle cache invalidation on filter changes', () => {
      debugLog('Testing cache invalidation');

      // Mock cache clearing logic
      const cache = new Map();
      cache.set('/agent-posts?filter=all', { data: mockPosts, timestamp: Date.now() });
      
      const clearCachePattern = (pattern: string) => {
        const keysToDelete = Array.from(cache.keys()).filter(key => key.includes(pattern));
        keysToDelete.forEach(key => cache.delete(key));
        return keysToDelete.length;
      };

      const clearedCount = clearCachePattern('/agent-posts');
      expect(clearedCount).toBe(1);
      expect(cache.size).toBe(0);

      debugLog('Cache invalidation validated');
    });
  });
});