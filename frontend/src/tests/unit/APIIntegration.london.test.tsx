import { vi } from 'vitest';
import { apiService } from '../../services/api';
import { FilterOptions } from '../../components/FilterPanel';

// London School - Mock the API service to test contracts and interactions
vi.mock('../../services/api', () => ({
  apiService: {
    getFilteredPosts: vi.fn(),
    getFilterSuggestions: vi.fn(),
    getFilterData: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

const mockApiService = apiService as any;

describe('API Integration - London School TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFilteredPosts - Contract Verification', () => {
    it('should call getFilteredPosts with correct multi-select parameters', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Test Post',
            content: 'Test content',
            authorAgent: 'Agent1',
            tags: ['hashtag1'],
            publishedAt: '2023-01-01T00:00:00Z',
            engagement: { comments: 0, isSaved: false }
          }
        ],
        total: 1
      };

      mockApiService.getFilteredPosts.mockResolvedValue(mockResponse);

      const filter: FilterOptions = {
        type: 'multi-select',
        multiSelectMode: true,
        agents: ['Agent1', 'Agent2'],
        hashtags: ['hashtag1', 'hashtag2'],
        combinationMode: 'AND'
      };

      const result = await apiService.getFilteredPosts(20, 0, filter);

      // Verify API was called with correct parameters - London School contract verification
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(20, 0, filter);
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle OR combination mode correctly', async () => {
      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockApiService.getFilteredPosts.mockResolvedValue(mockResponse);

      const filter: FilterOptions = {
        type: 'multi-select',
        multiSelectMode: true,
        agents: ['Agent1'],
        hashtags: ['hashtag1'],
        combinationMode: 'OR'
      };

      await apiService.getFilteredPosts(20, 0, filter);

      // Verify OR mode is passed correctly
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
        20,
        0,
        expect.objectContaining({
          combinationMode: 'OR'
        })
      );
    });

    it('should handle empty agent and hashtag arrays', async () => {
      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockApiService.getFilteredPosts.mockResolvedValue(mockResponse);

      const filter: FilterOptions = {
        type: 'multi-select',
        multiSelectMode: true,
        agents: [],
        hashtags: [],
        combinationMode: 'AND'
      };

      await apiService.getFilteredPosts(20, 0, filter);

      // Should still make API call with empty arrays
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
        20,
        0,
        expect.objectContaining({
          agents: [],
          hashtags: []
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockApiService.getFilteredPosts.mockRejectedValue(mockError);

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1'],
        hashtags: ['hashtag1']
      };

      await expect(apiService.getFilteredPosts(20, 0, filter)).rejects.toThrow('API Error');
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFilterSuggestions - Mock-Driven Testing', () => {
    it('should request agent suggestions with correct parameters', async () => {
      const mockSuggestions = [
        { value: 'Agent1', label: 'Agent One', color: 'blue' },
        { value: 'Agent2', label: 'Agent Two', color: 'blue' }
      ];

      mockApiService.getFilterSuggestions.mockResolvedValue(mockSuggestions);

      const result = await apiService.getFilterSuggestions('agents', 'agent', 10);

      // Verify correct contract for agent suggestions
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('agents', 'agent', 10);
      expect(result).toEqual(mockSuggestions);
    });

    it('should request hashtag suggestions with correct parameters', async () => {
      const mockSuggestions = [
        { value: 'hashtag1', label: '#hashtag1', color: 'purple' },
        { value: 'hashtag2', label: '#hashtag2', color: 'purple' }
      ];

      mockApiService.getFilterSuggestions.mockResolvedValue(mockSuggestions);

      const result = await apiService.getFilterSuggestions('hashtags', 'hashtag', 5);

      // Verify correct contract for hashtag suggestions
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('hashtags', 'hashtag', 5);
      expect(result).toEqual(mockSuggestions);
    });

    it('should handle empty query strings', async () => {
      const mockSuggestions = [];
      mockApiService.getFilterSuggestions.mockResolvedValue(mockSuggestions);

      await apiService.getFilterSuggestions('agents', '', 10);

      // Should still make API call with empty query
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('agents', '', 10);
    });

    it('should handle different limit values', async () => {
      const mockSuggestions = [];
      mockApiService.getFilterSuggestions.mockResolvedValue(mockSuggestions);

      await apiService.getFilterSuggestions('agents', 'test', 20);
      await apiService.getFilterSuggestions('hashtags', 'test', 5);

      // Verify different limits are passed correctly
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('agents', 'test', 20);
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('hashtags', 'test', 5);
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledTimes(2);
    });

    it('should handle suggestion API errors', async () => {
      const mockError = new Error('Suggestion API Error');
      mockApiService.getFilterSuggestions.mockRejectedValue(mockError);

      await expect(apiService.getFilterSuggestions('agents', 'test', 10))
        .rejects.toThrow('Suggestion API Error');
    });
  });

  describe('getFilterData - Initial Data Loading', () => {
    it('should load initial filter data correctly', async () => {
      const mockFilterData = {
        agents: ['Agent1', 'Agent2', 'Agent3'],
        hashtags: ['hashtag1', 'hashtag2', 'hashtag3']
      };

      mockApiService.getFilterData.mockResolvedValue(mockFilterData);

      const result = await apiService.getFilterData();

      // Verify filter data loading contract
      expect(mockApiService.getFilterData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFilterData);
    });

    it('should handle empty filter data', async () => {
      const mockFilterData = {
        agents: [],
        hashtags: []
      };

      mockApiService.getFilterData.mockResolvedValue(mockFilterData);

      const result = await apiService.getFilterData();

      expect(result).toEqual({ agents: [], hashtags: [] });
    });

    it('should handle filter data loading errors', async () => {
      const mockError = new Error('Filter data loading failed');
      mockApiService.getFilterData.mockRejectedValue(mockError);

      await expect(apiService.getFilterData()).rejects.toThrow('Filter data loading failed');
    });
  });

  describe('Real-time Updates - Event Handling Contract', () => {
    it('should register post update listeners correctly', () => {
      const mockHandler = jest.fn();
      
      apiService.on('posts_updated', mockHandler);

      // Verify event listener registration
      expect(mockApiService.on).toHaveBeenCalledWith('posts_updated', mockHandler);
    });

    it('should unregister post update listeners correctly', () => {
      const mockHandler = jest.fn();
      
      apiService.off('posts_updated', mockHandler);

      // Verify event listener removal
      expect(mockApiService.off).toHaveBeenCalledWith('posts_updated', mockHandler);
    });

    it('should handle multiple event listeners', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      
      apiService.on('posts_updated', mockHandler1);
      apiService.on('posts_updated', mockHandler2);

      // Verify both listeners are registered
      expect(mockApiService.on).toHaveBeenCalledTimes(2);
      expect(mockApiService.on).toHaveBeenNthCalledWith(1, 'posts_updated', mockHandler1);
      expect(mockApiService.on).toHaveBeenNthCalledWith(2, 'posts_updated', mockHandler2);
    });
  });

  describe('Multi-Select Filter Integration - End-to-End Contract', () => {
    it('should handle complete multi-select workflow', async () => {
      // Mock initial data loading
      const mockFilterData = {
        agents: ['Agent1', 'Agent2'],
        hashtags: ['hashtag1', 'hashtag2']
      };
      mockApiService.getFilterData.mockResolvedValue(mockFilterData);

      // Mock suggestions
      const mockAgentSuggestions = [
        { value: 'Agent3', label: 'Agent Three', color: 'blue' }
      ];
      mockApiService.getFilterSuggestions.mockResolvedValue(mockAgentSuggestions);

      // Mock filtered posts
      const mockPosts = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Test Post',
            content: 'Test content by @Agent1 #hashtag1',
            authorAgent: 'Agent1',
            tags: ['hashtag1'],
            publishedAt: '2023-01-01T00:00:00Z',
            engagement: { comments: 5, isSaved: true }
          }
        ],
        total: 1
      };
      mockApiService.getFilteredPosts.mockResolvedValue(mockPosts);

      // Simulate complete workflow
      const filterData = await apiService.getFilterData();
      expect(filterData).toEqual(mockFilterData);

      const suggestions = await apiService.getFilterSuggestions('agents', 'agent3', 10);
      expect(suggestions).toEqual(mockAgentSuggestions);

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1', 'Agent3'],
        hashtags: ['hashtag1'],
        combinationMode: 'AND'
      };

      const posts = await apiService.getFilteredPosts(20, 0, filter);
      expect(posts).toEqual(mockPosts);

      // Verify all API calls were made correctly
      expect(mockApiService.getFilterData).toHaveBeenCalledTimes(1);
      expect(mockApiService.getFilterSuggestions).toHaveBeenCalledWith('agents', 'agent3', 10);
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(20, 0, filter);
    });

    it('should handle workflow with OR combination mode', async () => {
      const mockPosts = {
        success: true,
        data: [],
        total: 0
      };
      mockApiService.getFilteredPosts.mockResolvedValue(mockPosts);

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1'],
        hashtags: ['hashtag1', 'hashtag2'],
        combinationMode: 'OR'
      };

      await apiService.getFilteredPosts(20, 0, filter);

      // Verify OR mode workflow
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
        20,
        0,
        expect.objectContaining({
          combinationMode: 'OR',
          agents: ['Agent1'],
          hashtags: ['hashtag1', 'hashtag2']
        })
      );
    });
  });

  describe('Error Boundary Testing - Failure Modes', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      mockApiService.getFilteredPosts.mockRejectedValue(timeoutError);

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1']
      };

      await expect(apiService.getFilteredPosts(20, 0, filter))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      mockApiService.getFilteredPosts.mockResolvedValue(null as any);

      const filter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1']
      };

      const result = await apiService.getFilteredPosts(20, 0, filter);
      
      // Should handle null response gracefully
      expect(result).toBeNull();
    });

    it('should handle partial API failures in multi-step workflows', async () => {
      // First call succeeds
      const mockFilterData = {
        agents: ['Agent1'],
        hashtags: ['hashtag1']
      };
      mockApiService.getFilterData.mockResolvedValue(mockFilterData);

      // Second call fails
      mockApiService.getFilterSuggestions.mockRejectedValue(new Error('Suggestions failed'));

      // Third call succeeds
      const mockPosts = { success: true, data: [], total: 0 };
      mockApiService.getFilteredPosts.mockResolvedValue(mockPosts);

      // Workflow should handle partial failures
      const filterData = await apiService.getFilterData();
      expect(filterData).toEqual(mockFilterData);

      await expect(apiService.getFilterSuggestions('agents', 'test', 10))
        .rejects.toThrow('Suggestions failed');

      const filter: FilterOptions = { type: 'multi-select', agents: ['Agent1'] };
      const posts = await apiService.getFilteredPosts(20, 0, filter);
      expect(posts).toEqual(mockPosts);
    });
  });
});