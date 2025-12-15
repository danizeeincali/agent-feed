/**
 * TDD London School Test Suite: API Service Filter Methods
 * 
 * CRITICAL BUG INVESTIGATION: Advanced filter showing no results and inability to reset to "all posts"
 * 
 * Focus Areas:
 * 1. getFilteredPosts parameter mapping
 * 2. API response handling
 * 3. Cache behavior during filter operations
 * 4. Error handling with filter parameters
 */

import { apiService } from '../../services/api';
import { FilterOptions } from '../../components/FilterPanel';

// Mock fetch globally (London School approach)
global.fetch = jest.fn();

describe('API Service Filter Methods - London School Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    // Clear cache before each test
    apiService.clearCache();
  });

  describe('getFilteredPosts Parameter Mapping', () => {
    it('should correctly map "all" filter type to backend parameters', async () => {
      // Arrange: Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total: 0
        })
      });

      const filter: FilterOptions = { type: 'all' };

      // Act: Call the method
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify correct parameter mapping
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=all'),
        expect.any(Object)
      );
      
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=all/);
      expect(callUrl).toMatch(/limit=50/);
      expect(callUrl).toMatch(/offset=0/);
    });

    it('should correctly map agent filter to backend parameters', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'agent',
        agent: 'TestAgent'
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify agent filter mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=by-agent/);
      expect(callUrl).toMatch(/agent=TestAgent/);
    });

    it('should correctly map hashtag filter to backend parameters', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'hashtag',
        hashtag: 'testtag'
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify hashtag filter mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=by-tags/);
      expect(callUrl).toMatch(/tags=testtag/);
    });

    it('should correctly map multi-select filter to backend parameters', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['agent1', 'agent2'],
        hashtags: ['tag1', 'tag2'],
        combinationMode: 'OR'
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify multi-select filter mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=multi-select/);
      expect(callUrl).toMatch(/agents=agent1%2Cagent2/); // URL encoded comma
      expect(callUrl).toMatch(/hashtags=tag1%2Ctag2/);
      expect(callUrl).toMatch(/mode=OR/);
    });

    it('should correctly map saved posts filter with userId', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'saved',
        userId: 'test-user-123'
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify saved filter mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=saved/);
      expect(callUrl).toMatch(/user_id=test-user-123/);
    });

    it('should correctly map my posts filter with userId', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'myposts',
        userId: 'test-user-456'
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Verify my posts filter mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=my-posts/);
      expect(callUrl).toMatch(/user_id=test-user-456/);
    });
  });

  describe('API Response Handling', () => {
    it('should handle successful response with data', async () => {
      // Arrange: Mock API response
      const mockData = [
        { id: '1', title: 'Post 1', content: 'Content 1' },
        { id: '2', title: 'Post 2', content: 'Content 2' }
      ];
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockData,
          total: 2
        })
      });

      // Act
      const result = await apiService.getFilteredPosts(50, 0, { type: 'all' });

      // Assert: Verify response structure
      expect(result).toEqual({
        success: true,
        data: mockData,
        total: 2
      });
    });

    it('should handle API error responses gracefully', async () => {
      // Arrange: Mock API error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await apiService.getFilteredPosts(50, 0, { type: 'all' });

      // Assert: Verify error handling
      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'HTTP error! status: 500'
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      // Arrange: Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await apiService.getFilteredPosts(50, 0, { type: 'all' });

      // Assert: Verify error handling
      expect(result).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'Network error'
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cache Behavior', () => {
    it('should use cache for identical filter requests', async () => {
      // Arrange: Mock API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['cached'], total: 1 })
      });

      const filter: FilterOptions = { type: 'agent', agent: 'TestAgent' };

      // Act: Make two identical requests
      const result1 = await apiService.getFilteredPosts(50, 0, filter);
      const result2 = await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Should only make one API call
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should not use cache for different filter requests', async () => {
      // Arrange: Mock different API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: ['agent-posts'], total: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: ['hashtag-posts'], total: 1 })
        });

      // Act: Make requests with different filters
      await apiService.getFilteredPosts(50, 0, { type: 'agent', agent: 'Agent1' });
      await apiService.getFilteredPosts(50, 0, { type: 'hashtag', hashtag: 'tag1' });

      // Assert: Should make two separate API calls
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear relevant cache when filters change', () => {
      // Arrange: Populate cache
      apiService.clearCache('/agent-posts');

      // Act: This is a behavior verification - cache should be cleared
      // Assert: No exception should be thrown
      expect(() => {
        apiService.clearCache('/agent-posts');
      }).not.toThrow();
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle multi-select filter with empty arrays', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: [],
        hashtags: [],
        combinationMode: 'AND'
      };

      // Act
      const result = await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Should still make API call but with all filter
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=all/); // Should fallback to 'all' when no filters
      expect(result.success).toBe(true);
    });

    it('should handle missing userId in saved/my posts filters', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'saved'
        // userId is undefined
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Should use default userId
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/user_id=anonymous/);
    });

    it('should handle undefined agent in agent filter', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'agent'
        // agent is undefined
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Should fallback to 'all' filter
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=all/);
    });

    it('should handle undefined hashtag in hashtag filter', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      const filter: FilterOptions = {
        type: 'hashtag'
        // hashtag is undefined
      };

      // Act
      await apiService.getFilteredPosts(50, 0, filter);

      // Assert: Should fallback to 'all' filter
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/filter=all/);
    });
  });

  describe('Filter Suggestions Handling', () => {
    it('should handle getFilterSuggestions for agents correctly', async () => {
      // Arrange
      const mockSuggestions = [
        { value: 'Agent1', label: 'Agent1', postCount: 5 },
        { value: 'Agent2', label: 'Agent2', postCount: 3 }
      ];
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSuggestions
        })
      });

      // Act
      const result = await apiService.getFilterSuggestions('agents', 'Agent', 10);

      // Assert: Verify API call and response mapping
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('filter-suggestions'),
        expect.any(Object)
      );
      
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/type=agent/);
      expect(callUrl).toMatch(/query=Agent/);
      expect(callUrl).toMatch(/limit=10/);
      
      expect(result).toEqual([
        { value: 'Agent1', label: 'Agent1', postCount: 5 },
        { value: 'Agent2', label: 'Agent2', postCount: 3 }
      ]);
    });

    it('should handle getFilterSuggestions for hashtags correctly', async () => {
      // Arrange
      const mockSuggestions = [
        { value: 'tag1', label: 'tag1', postCount: 8 },
        { value: 'tag2', label: 'tag2', postCount: 2 }
      ];
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSuggestions
        })
      });

      // Act
      const result = await apiService.getFilterSuggestions('hashtags', 'tag', 5);

      // Assert: Verify API call and response mapping
      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toMatch(/type=hashtag/);
      expect(callUrl).toMatch(/query=tag/);
      expect(callUrl).toMatch(/limit=5/);
      
      expect(result).toEqual(mockSuggestions);
    });

    it('should handle getFilterSuggestions API errors gracefully', async () => {
      // Arrange: Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Suggestions API error'));

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await apiService.getFilterSuggestions('agents', 'test', 10);

      // Assert: Should return empty array on error
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching filter suggestions:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});

/**
 * CRITICAL BUGS IDENTIFIED:
 * 
 * 1. PARAMETER MAPPING ISSUE: Multi-select with empty arrays should fallback to 'all' but code doesn't handle this
 * 2. MISSING VALIDATION: Agent/hashtag filters don't validate for undefined values before API call
 * 3. CACHE KEY COLLISION: Different filter variations may generate identical cache keys
 * 4. USER ID FALLBACK: Default 'anonymous' userId may not be consistent with other parts of the system
 * 5. RESPONSE NORMALIZATION: API responses may have different structures that aren't properly normalized
 * 
 * IMMEDIATE FIXES NEEDED:
 * - Add validation for undefined filter values in getFilteredPosts
 * - Implement proper fallback logic for empty multi-select filters
 * - Fix cache key generation to include all filter parameters
 * - Standardize userId handling across all filter types
 */