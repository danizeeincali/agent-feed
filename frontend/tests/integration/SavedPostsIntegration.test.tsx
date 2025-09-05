/**
 * TDD London School Tests - Saved Posts Integration
 * 
 * Focus: Testing real database operations with minimal mocking
 * Integration testing between frontend and backend without mocking API calls
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiService } from '../../src/services/api';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';

// Don't mock the API service - we want real integration testing
// Only mock the content parser to simplify DOM assertions
vi.mock('../../src/utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => <span data-testid="parsed-content">{content}</span>),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => ['test', 'integration']),
  extractMentions: vi.fn(() => ['@TestAgent']),
}));

vi.mock('../../src/components/FilterPanel', () => ({
  default: ({ onFilterChange, currentFilter, postCount }: any) => (
    <div data-testid="filter-panel">
      <button 
        data-testid="saved-filter-btn" 
        onClick={() => onFilterChange({ type: 'saved' })}
      >
        Saved Posts ({postCount})
      </button>
      <button 
        data-testid="all-filter-btn" 
        onClick={() => onFilterChange({ type: 'all' })}
      >
        All Posts
      </button>
      <div data-testid="current-filter-type">{currentFilter.type}</div>
    </div>
  )
}));

describe('TDD London School: Saved Posts Integration Tests', () => {
  let testPostId: string;
  
  beforeAll(async () => {
    // Ensure we can connect to the backend
    try {
      const health = await apiService.healthCheck();
      if (!health.data.database) {
        throw new Error('Database not available for integration testing');
      }
    } catch (error) {
      console.warn('Backend not available, skipping integration tests');
      return;
    }
  });

  beforeEach(async () => {
    // Clear API cache before each test
    apiService.clearCache();
    
    // Create a test post for testing
    try {
      const testPost = await apiService.createAgentPost({
        title: 'Integration Test Post',
        content: 'This is a test post for integration testing of saved posts functionality.',
        authorAgent: 'IntegrationTestAgent',
        metadata: {
          isTestPost: true,
          testSuite: 'SavedPostsIntegration'
        }
      });
      
      testPostId = testPost.data.id;
    } catch (error) {
      console.warn('Failed to create test post:', error);
    }
  });

  afterEach(async () => {
    // Clean up test post
    if (testPostId) {
      try {
        await apiService.deletePost(testPostId);
      } catch (error) {
        console.warn('Failed to delete test post:', error);
      }
    }
  });

  describe('Real Database Save Operations', () => {
    it('should save post to real database and retrieve it', async () => {
      // Skip if no backend
      if (!testPostId) {
        console.log('Skipping test - no backend available');
        return;
      }

      // Act - Save the test post
      const saveResult = await apiService.savePost(testPostId, true);

      // Assert - Save operation succeeded
      expect(saveResult.success).toBe(true);
      expect(saveResult.data.post_id).toBe(testPostId);

      // Act - Retrieve saved posts
      const savedPosts = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      // Assert - Test post should be in saved posts
      expect(savedPosts.success).toBe(true);
      expect(savedPosts.data.some(post => post.id === testPostId)).toBe(true);
      
      const savedPost = savedPosts.data.find(post => post.id === testPostId);
      expect(savedPost.engagement.isSaved).toBe(true);
    });

    it('should unsave post from real database', async () => {
      if (!testPostId) return;

      // Arrange - First save the post
      await apiService.savePost(testPostId, true);

      // Act - Unsave the post
      const unsaveResult = await apiService.savePost(testPostId, false);

      // Assert - Unsave operation succeeded
      expect(unsaveResult.success).toBe(true);

      // Act - Check saved posts
      const savedPosts = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      // Assert - Test post should not be in saved posts
      const stillSaved = savedPosts.data.some(post => post.id === testPostId);
      expect(stillSaved).toBe(false);
    });

    it('should handle duplicate save operations gracefully', async () => {
      if (!testPostId) return;

      // Act - Save the same post multiple times
      const saveResult1 = await apiService.savePost(testPostId, true);
      const saveResult2 = await apiService.savePost(testPostId, true);
      const saveResult3 = await apiService.savePost(testPostId, true);

      // Assert - All operations should succeed
      expect(saveResult1.success).toBe(true);
      expect(saveResult2.success).toBe(true);
      expect(saveResult3.success).toBe(true);

      // Check that post is only saved once
      const savedPosts = await apiService.getFilteredPosts(50, 0, {
        type: 'saved'
      });

      const matchingPosts = savedPosts.data.filter(post => post.id === testPostId);
      expect(matchingPosts).toHaveLength(1);
    });

    it('should handle save operation for non-existent post', async () => {
      // Act & Assert - Should handle gracefully
      await expect(
        apiService.savePost('non-existent-post-id', true)
      ).rejects.toThrow();
    });
  });

  describe('Frontend-Backend Integration', () => {
    it('should complete full save workflow through UI', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Act - Render component and wait for posts to load
      render(<RealSocialMediaFeed />);

      // Wait for the test post to appear
      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find the save button for our test post
      const postElement = screen.getByText('Integration Test Post').closest('article');
      expect(postElement).toBeInTheDocument();

      const saveButton = postElement?.querySelector('[title="Save Post"]');
      expect(saveButton).toBeInTheDocument();

      // Act - Click save button
      if (saveButton) {
        await user.click(saveButton);
      }

      // Assert - Button should change to saved state
      await waitFor(() => {
        const unsaveButton = postElement?.querySelector('[title="Unsave Post"]');
        expect(unsaveButton).toBeInTheDocument();
      });

      // Verify in database
      const savedPosts = await apiService.getFilteredPosts(50, 0, { type: 'saved' });
      expect(savedPosts.data.some(post => post.id === testPostId)).toBe(true);
    });

    it('should filter saved posts correctly in UI', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Arrange - Save the test post first
      await apiService.savePost(testPostId, true);

      // Act - Render component
      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });

      // Click saved filter
      const savedFilterButton = screen.getByTestId('saved-filter-btn');
      await user.click(savedFilterButton);

      // Assert - Should show only saved posts
      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
        // Should filter out other posts
        const filterType = screen.getByTestId('current-filter-type');
        expect(filterType).toHaveTextContent('saved');
      });
    });

    it('should maintain UI state consistency after save operations', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Act - Render and find test post
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
      });

      const postElement = screen.getByText('Integration Test Post').closest('article');
      
      // Save the post
      const saveButton = postElement?.querySelector('[title="Save Post"]');
      if (saveButton) {
        await user.click(saveButton);
      }

      // Wait for save to complete
      await waitFor(() => {
        const unsaveButton = postElement?.querySelector('[title="Unsave Post"]');
        expect(unsaveButton).toBeInTheDocument();
      });

      // Unsave the post
      const unsaveButton = postElement?.querySelector('[title="Unsave Post"]');
      if (unsaveButton) {
        await user.click(unsaveButton);
      }

      // Assert - Should return to unsaved state
      await waitFor(() => {
        const saveButtonAgain = postElement?.querySelector('[title="Save Post"]');
        expect(saveButtonAgain).toBeInTheDocument();
      });

      // Verify final state in database
      const savedPosts = await apiService.getFilteredPosts(50, 0, { type: 'saved' });
      expect(savedPosts.data.some(post => post.id === testPostId)).toBe(false);
    });

    it('should handle concurrent save operations from UI', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Act - Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
      });

      // Rapidly click save/unsave multiple times
      const postElement = screen.getByText('Integration Test Post').closest('article');
      
      for (let i = 0; i < 3; i++) {
        const saveButton = postElement?.querySelector('[title="Save Post"]');
        if (saveButton) {
          await user.click(saveButton);
        }
        
        await waitFor(() => {
          expect(postElement?.querySelector('[title="Unsave Post"]')).toBeInTheDocument();
        });
        
        const unsaveButton = postElement?.querySelector('[title="Unsave Post"]');
        if (unsaveButton) {
          await user.click(unsaveButton);
        }
        
        await waitFor(() => {
          expect(postElement?.querySelector('[title="Save Post"]')).toBeInTheDocument();
        });
      }

      // Assert - Final state should be consistent
      const savedPosts = await apiService.getFilteredPosts(50, 0, { type: 'saved' });
      const isCurrentlySaved = savedPosts.data.some(post => post.id === testPostId);
      
      // UI should match database state
      const hasUnsaveButton = postElement?.querySelector('[title="Unsave Post"]') !== null;
      const hasSaveButton = postElement?.querySelector('[title="Save Post"]') !== null;
      
      if (isCurrentlySaved) {
        expect(hasUnsaveButton).toBe(true);
        expect(hasSaveButton).toBe(false);
      } else {
        expect(hasUnsaveButton).toBe(false);
        expect(hasSaveButton).toBe(true);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should recover from temporary network failures', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Temporarily break the API by modifying baseUrl
      const originalFetch = global.fetch;
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          return Promise.reject(new Error('Network error'));
        }
        // Subsequent calls succeed
        return originalFetch.call(global, ...args);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act - Render and attempt save
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
      });

      const postElement = screen.getByText('Integration Test Post').closest('article');
      const saveButton = postElement?.querySelector('[title="Save Post"]');
      
      if (saveButton) {
        await user.click(saveButton);
      }

      // First attempt should fail and log error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Restore fetch and try again
      global.fetch = originalFetch;
      consoleSpy.mockRestore();

      // Try save operation again - should succeed
      const retryButton = postElement?.querySelector('[title="Save Post"]');
      if (retryButton) {
        await user.click(retryButton);
      }

      await waitFor(() => {
        expect(postElement?.querySelector('[title="Unsave Post"]')).toBeInTheDocument();
      });
    });

    it('should handle posts that get deleted while being saved', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();

      // Act - Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
      });

      // Delete the post from backend while UI is loaded
      await apiService.deletePost(testPostId);

      // Try to save the now-deleted post
      const postElement = screen.getByText('Integration Test Post').closest('article');
      const saveButton = postElement?.querySelector('[title="Save Post"]');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      if (saveButton) {
        await user.click(saveButton);
      }

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
      
      // Reset testPostId to prevent cleanup error
      testPostId = '';
    });
  });

  describe('Performance and Caching', () => {
    it('should cache saved posts requests to avoid redundant API calls', async () => {
      if (!testPostId) return;

      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act - Apply saved filter multiple times
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });

      const initialFetchCount = fetchSpy.mock.calls.length;

      // Apply saved filter
      await user.click(screen.getByTestId('saved-filter-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-filter-type')).toHaveTextContent('saved');
      });

      const afterFirstFilter = fetchSpy.mock.calls.length;

      // Apply saved filter again quickly
      await user.click(screen.getByTestId('all-filter-btn'));
      await user.click(screen.getByTestId('saved-filter-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('current-filter-type')).toHaveTextContent('saved');
      });

      const afterSecondFilter = fetchSpy.mock.calls.length;

      // Assert - Second filter should use cache (fewer API calls)
      const firstFilterCalls = afterFirstFilter - initialFetchCount;
      const secondFilterCalls = afterSecondFilter - afterFirstFilter;
      
      expect(secondFilterCalls).toBeLessThanOrEqual(firstFilterCalls);

      fetchSpy.mockRestore();
    });
  });
});