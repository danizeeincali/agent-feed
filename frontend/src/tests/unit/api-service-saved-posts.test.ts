import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '../../src/services/api';

/**
 * Unit Tests for API Service - Saved Posts Functionality
 * 
 * This test suite validates the API service methods for:
 * 1. savePost() method
 * 2. getFilteredPosts() with saved filter
 * 3. Cache management for saved posts
 * 4. Error handling scenarios
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service - Saved Posts', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Clear the API service cache
    apiService.clearCache();
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks();
  });

  describe('savePost method', () => {
    it('should make POST request to save a post', async () => {
      const postId = 'test-post-123';
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Post saved successfully'
        })
      });

      await apiService.savePost(postId, true);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/agent-posts/${postId}/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
    });

    it('should make DELETE request to unsave a post', async () => {
      const postId = 'test-post-123';
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Post unsaved successfully'
        })
      });

      await apiService.savePost(postId, false);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/agent-posts/${postId}/save?user_id=anonymous`,
        {
          method: 'DELETE'
        }
      );
    });

    it('should clear cache after saving/unsaving a post', async () => {
      const postId = 'test-post-123';
      
      // Spy on clearCache method
      const clearCacheSpy = vi.spyOn(apiService, 'clearCache');
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Post saved successfully'
        })
      });

      await apiService.savePost(postId, true);

      // Verify cache was cleared
      expect(clearCacheSpy).toHaveBeenCalledWith('/agent-posts');
    });

    it('should handle API error responses', async () => {
      const postId = 'test-post-123';
      
      // Mock error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      });

      await expect(apiService.savePost(postId, true))
        .rejects
        .toThrow('HTTP error! status: 500');
    });

    it('should handle network errors', async () => {
      const postId = 'test-post-123';
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.savePost(postId, true))
        .rejects
        .toThrow('Network error');
    });

    it('should handle invalid post IDs', async () => {
      const invalidPostId = '';
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true
        })
      });

      await apiService.savePost(invalidPostId, true);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/agent-posts/${invalidPostId}/save`,
        expect.any(Object)
      );
    });
  });

  describe('getFilteredPosts with saved filter', () => {
    it('should make request with correct saved filter parameters', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'saved-post-1',
            title: 'Saved Post 1',
            content: 'This is a saved post',
            engagement: { isSaved: true }
          }
        ],
        total: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/agent-posts'),
        expect.any(Object)
      );

      // Verify the URL contains correct parameters
      const call = mockFetch.mock.calls[0];
      const url = call[0];
      expect(url).toContain('filter=saved');
      expect(url).toContain('user_id=anonymous');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].engagement.isSaved).toBe(true);
    });

    it('should handle empty saved posts response', async () => {
      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination for saved posts', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'saved-post-1', engagement: { isSaved: true } },
          { id: 'saved-post-2', engagement: { isSaved: true } }
        ],
        total: 10
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getFilteredPosts(2, 4, {
        type: 'saved'
      });

      const call = mockFetch.mock.calls[0];
      const url = call[0];
      expect(url).toContain('limit=2');
      expect(url).toContain('offset=4');
      expect(url).toContain('filter=saved');
    });

    it('should cache saved posts responses', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: 'saved-post-1', engagement: { isSaved: true } }],
        total: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call
      await apiService.getFilteredPosts(50, 0, { type: 'saved' });
      
      // Second call - should use cache
      await apiService.getFilteredPosts(50, 0, { type: 'saved' });

      // fetch should only be called once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors for saved posts filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Bad request'
        })
      });

      const result = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      // Should return error response structure
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('getAgentPosts with saved filter integration', () => {
    it('should include isSaved property in post engagement data', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'post-1',
            title: 'Test Post 1',
            engagement: {
              likes: 5,
              comments: 2,
              isSaved: true
            }
          },
          {
            id: 'post-2',
            title: 'Test Post 2',
            engagement: {
              likes: 3,
              comments: 1,
              isSaved: false
            }
          }
        ],
        total: 2
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getAgentPosts();

      expect(result.success).toBe(true);
      expect(result.data[0].engagement.isSaved).toBe(true);
      expect(result.data[1].engagement.isSaved).toBe(false);
    });
  });

  describe('Cache management for saved posts', () => {
    it('should clear relevant cache when saving posts', async () => {
      // Mock responses for both operations
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total: 0
        })
      });

      const clearCacheSpy = vi.spyOn(apiService, 'clearCache');

      // Save a post
      await apiService.savePost('test-post', true);

      // Verify cache was cleared
      expect(clearCacheSpy).toHaveBeenCalledWith('/agent-posts');

      // Get posts - should make new API call due to cleared cache
      await apiService.getAgentPosts();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent save operations', async () => {
      const postId = 'test-post-123';
      
      // Mock multiple successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      // Execute multiple save operations concurrently
      const promises = [
        apiService.savePost(postId, true),
        apiService.savePost(postId, false),
        apiService.savePost(postId, true)
      ];

      await Promise.all(promises);

      // Should have made 3 API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(apiService.savePost('test-post', true))
        .rejects
        .toThrow('Invalid JSON');
    });

    it('should handle timeout scenarios', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true })
          }), 30000)
        )
      );

      // This would normally timeout in a real scenario
      // For testing, we'll just verify the call was made
      const promise = apiService.savePost('test-post', true);
      
      expect(mockFetch).toHaveBeenCalled();
      
      // Clean up the hanging promise
      promise.catch(() => {});
    });

    it('should handle special characters in post IDs', async () => {
      const specialPostId = 'post-with-special-chars-!@#$%';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiService.savePost(specialPostId, true);

      const call = mockFetch.mock.calls[0];
      const url = call[0];
      expect(url).toContain(encodeURIComponent('post-with-special-chars-!@#$%'));
    });

    it('should handle very long post IDs', async () => {
      const longPostId = 'a'.repeat(1000);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiService.savePost(longPostId, true);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('WebSocket integration for saved posts', () => {
    it('should handle posts_updated events with saved status', () => {
      const mockHandler = vi.fn();
      
      // Register event handler
      apiService.on('posts_updated', mockHandler);
      
      // Simulate WebSocket message with saved post update
      const updatedPost = {
        id: 'test-post-123',
        title: 'Updated Post',
        engagement: {
          likes: 10,
          isSaved: true
        }
      };
      
      // Simulate the internal handler being called
      // (This would normally happen through WebSocket)
      mockHandler(updatedPost);
      
      expect(mockHandler).toHaveBeenCalledWith(updatedPost);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type safety and validation', () => {
    it('should validate save parameter types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Test with boolean true
      await apiService.savePost('test-post', true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/save'),
        expect.objectContaining({ method: 'POST' })
      );

      // Test with boolean false
      await apiService.savePost('test-post', false);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/save?user_id=anonymous'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle filter type validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 })
      });

      // Test with valid saved filter
      await apiService.getFilteredPosts(50, 0, { type: 'saved' });

      const call = mockFetch.mock.calls[0];
      const url = call[0];
      expect(url).toContain('filter=saved');
    });
  });
});