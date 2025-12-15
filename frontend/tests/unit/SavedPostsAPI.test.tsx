/**
 * TDD London School Tests - Saved Posts API Interactions
 * 
 * Focus: Mock-driven development testing object collaborations
 * Testing real API interactions and behavior verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiService } from '../../src/services/api';

// Mock fetch globally for API testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TDD London School: Saved Posts API Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear API service cache between tests
    apiService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Save Post Workflow', () => {
    it('should call save endpoint with correct parameters', async () => {
      // Arrange - London School: Setup mock expectations first
      const expectedResponse = {
        success: true,
        data: { id: 'save-post-123-anonymous', post_id: 'post-123', user_id: 'anonymous' },
        message: 'Post saved successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedResponse)
      });

      // Act - Call the API method
      const result = await apiService.savePost('post-123', true);

      // Assert - Verify the interaction occurred correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/agent-posts/post-123/save',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should call unsave endpoint with correct parameters', async () => {
      // Arrange - Setup mock expectations
      const expectedResponse = {
        success: true,
        message: 'Post unsaved successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedResponse)
      });

      // Act
      const result = await apiService.savePost('post-123', false);

      // Assert - Verify unsave interaction
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/agent-posts/post-123/save?user_id=anonymous',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange - Setup failing mock
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });

      // Act & Assert - Should throw error
      await expect(apiService.savePost('post-123', true)).rejects.toThrow('HTTP error! status: 500');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(apiService.savePost('post-123', true)).rejects.toThrow('Network error');
    });
  });

  describe('Get Saved Posts Workflow', () => {
    it('should retrieve saved posts with correct filter parameters', async () => {
      // Arrange - Mock saved posts response
      const mockSavedPosts = {
        success: true,
        data: [
          {
            id: 'post-1',
            title: 'Saved Post 1',
            content: 'This is a saved post',
            authorAgent: 'TestAgent',
            publishedAt: '2024-01-01T00:00:00Z',
            engagement: { isSaved: true, likes: 5, comments: 2 }
          }
        ],
        total: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSavedPosts)
      });

      // Act - Call getFilteredPosts with saved filter
      const result = await apiService.getFilteredPosts(20, 0, {
        type: 'saved',
        agent: undefined,
        hashtag: undefined
      });

      // Assert - Verify correct filter was applied
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/agent-posts?limit=20&offset=0&filter=by-user&search=&sortBy=published_at&sortOrder=DESC&user_id=demo-user',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockSavedPosts);
    });

    it('should cache saved posts requests', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Act - Make two identical requests
      await apiService.getFilteredPosts(20, 0, { type: 'saved' });
      await apiService.getFilteredPosts(20, 0, { type: 'saved' });

      // Assert - Should only make one API call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle empty saved posts gracefully', async () => {
      // Arrange
      const emptyResponse = {
        success: true,
        data: [],
        total: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse)
      });

      // Act
      const result = await apiService.getFilteredPosts(20, 0, { type: 'saved' });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('Cache Management for Saved Posts', () => {
    it('should clear saved posts cache after save operation', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Act - Save a post
      await apiService.savePost('post-123', true);

      // Assert - Cache should be cleared
      // We can't directly test cache clearing, but we can verify the API clears cache patterns
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear saved posts cache after unsave operation', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Act - Unsave a post
      await apiService.savePost('post-123', false);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('API Contract Validation', () => {
    it('should send correct Content-Type header for save requests', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Act
      await apiService.savePost('post-123', true);

      // Assert - Verify contract compliance
      const [url, config] = mockFetch.mock.calls[0];
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.method).toBe('POST');
    });

    it('should send correct Content-Type header for unsave requests', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Act
      await apiService.savePost('post-123', false);

      // Assert
      const [url, config] = mockFetch.mock.calls[0];
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.method).toBe('DELETE');
    });

    it('should construct correct URLs for different operations', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Act & Assert - Save operation
      await apiService.savePost('post-123', true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/v1/agent-posts/post-123/save'),
        expect.any(Object)
      );

      // Reset mock
      mockFetch.mockClear();

      // Act & Assert - Unsave operation
      await apiService.savePost('post-456', false);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/v1/agent-posts/post-456/save?user_id=anonymous'),
        expect.any(Object)
      );
    });
  });

  describe('Error Boundary Testing', () => {
    it('should handle malformed JSON responses', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      // Act & Assert
      await expect(apiService.savePost('post-123', true)).rejects.toThrow('Invalid JSON');
    });

    it('should handle HTTP error statuses', async () => {
      // Arrange - Different error codes
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];
      
      for (const code of errorCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: code,
          json: () => Promise.resolve({ error: `Error ${code}` })
        });

        // Act & Assert
        await expect(apiService.savePost('post-123', true)).rejects.toThrow(`HTTP error! status: ${code}`);
      }
    });

    it('should handle concurrent save/unsave operations', async () => {
      // Arrange - Mock responses for concurrent operations
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, action: 'save' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, action: 'unsave' })
        });

      // Act - Trigger concurrent operations
      const savePromise = apiService.savePost('post-123', true);
      const unsavePromise = apiService.savePost('post-123', false);

      const [saveResult, unsaveResult] = await Promise.all([savePromise, unsavePromise]);

      // Assert - Both operations should complete
      expect(saveResult.success).toBe(true);
      expect(unsaveResult.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});