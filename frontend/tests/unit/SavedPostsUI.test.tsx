/**
 * TDD London School Tests - Saved Posts UI Interactions
 * 
 * Focus: Testing UI component behavior and user interactions with mocked dependencies
 * London School approach: Mock external dependencies, test object collaborations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';

// Mock API service completely - London School approach
const mockApiService = {
  getAgentPosts: vi.fn(),
  getFilteredPosts: vi.fn(),
  savePost: vi.fn(),
  updatePostEngagement: vi.fn(),
  deletePost: vi.fn(),
  getFilterData: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('../../src/services/api', () => ({
  apiService: mockApiService
}));

// Mock other dependencies
vi.mock('../../src/utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => <span>{content}</span>),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => []),
}));

vi.mock('../../src/components/FilterPanel', () => ({
  default: ({ onFilterChange, currentFilter, postCount }: any) => (
    <div data-testid="filter-panel">
      <button 
        data-testid="saved-filter-btn" 
        onClick={() => onFilterChange({ type: 'saved' })}
      >
        Show Saved ({postCount})
      </button>
      <button 
        data-testid="all-filter-btn" 
        onClick={() => onFilterChange({ type: 'all' })}
      >
        Show All
      </button>
      <div data-testid="current-filter">{currentFilter.type}</div>
    </div>
  )
}));

describe('TDD London School: Saved Posts UI Interactions', () => {
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Test Post 1',
      content: 'This is a test post content.',
      authorAgent: 'TestAgent',
      publishedAt: '2024-01-01T00:00:00Z',
      metadata: { businessImpact: 75 },
      engagement: { likes: 5, comments: 2, isSaved: false },
      tags: ['test', 'demo']
    },
    {
      id: 'post-2',
      title: 'Saved Test Post 2',
      content: 'This is a saved test post.',
      authorAgent: 'SavedAgent',
      publishedAt: '2024-01-02T00:00:00Z',
      metadata: { businessImpact: 85 },
      engagement: { likes: 10, comments: 5, isSaved: true },
      tags: ['saved', 'important']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });

    mockApiService.getFilteredPosts.mockResolvedValue({
      success: true,
      data: mockPosts.filter(p => p.engagement.isSaved),
      total: 1
    });

    mockApiService.getFilterData.mockResolvedValue({
      agents: ['TestAgent', 'SavedAgent'],
      hashtags: ['test', 'demo', 'saved', 'important']
    });

    mockApiService.savePost.mockResolvedValue({
      success: true,
      data: { id: 'save-123', post_id: 'post-1', user_id: 'anonymous' }
    });

    // Mock WebSocket-like behavior
    mockApiService.on.mockImplementation(() => {});
    mockApiService.off.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Save Post Interactions', () => {
    it('should display save button for unsaved posts', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Assert - Should show save button for unsaved post
      const saveButtons = screen.getAllByTitle('Save Post');
      expect(saveButtons.length).toBeGreaterThan(0);
      
      // Find save button for unsaved post
      const unsavedPostSaveBtn = saveButtons.find(btn => 
        btn.closest('[data-testid*="post"]')?.textContent?.includes('Test Post 1')
      );
      expect(unsavedPostSaveBtn).toBeInTheDocument();
    });

    it('should display unsave button for saved posts', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Saved Test Post 2')).toBeInTheDocument();
      });

      // Assert - Should show unsave button for saved post
      const unsaveButtons = screen.getAllByTitle('Unsave Post');
      expect(unsaveButtons.length).toBeGreaterThan(0);
    });

    it('should call savePost when save button is clicked', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Find and click save button for unsaved post
      const saveButtons = screen.getAllByTitle('Save Post');
      await user.click(saveButtons[0]);

      // Assert - Should call API with correct parameters
      await waitFor(() => {
        expect(mockApiService.savePost).toHaveBeenCalledWith('post-1', true);
      });
    });

    it('should call savePost with false when unsave button is clicked', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Saved Test Post 2')).toBeInTheDocument();
      });

      // Find and click unsave button
      const unsaveButtons = screen.getAllByTitle('Unsave Post');
      await user.click(unsaveButtons[0]);

      // Assert - Should call API to unsave
      await waitFor(() => {
        expect(mockApiService.savePost).toHaveBeenCalledWith('post-2', false);
      });
    });

    it('should update UI state immediately after save action', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Find save button and click
      const saveButton = screen.getAllByTitle('Save Post')[0];
      await user.click(saveButton);

      // Assert - UI should reflect saved state
      await waitFor(() => {
        // Button should change to "Saved" state
        const savedButton = screen.getByTitle('Unsave Post');
        expect(savedButton).toBeInTheDocument();
        
        // Text should change from "Save" to "Saved"
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('should handle save operation errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Arrange - Mock API error
      mockApiService.savePost.mockRejectedValueOnce(new Error('Network error'));
      
      // Spy on console.error to verify error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      const saveButton = screen.getAllByTitle('Save Post')[0];
      await user.click(saveButton);

      // Assert - Should handle error without crashing
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save/unsave post:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Saved Posts Filtering', () => {
    it('should call getFilteredPosts when saved filter is applied', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });

      // Click saved filter
      const savedFilterBtn = screen.getByTestId('saved-filter-btn');
      await user.click(savedFilterBtn);

      // Assert - Should call filtered posts API
      await waitFor(() => {
        expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
          20, // limit
          0,  // offset
          { type: 'saved' }
        );
      });
    });

    it('should display only saved posts when saved filter is active', async () => {
      const user = userEvent.setup();
      
      // Arrange - Mock filtered response with only saved posts
      mockApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [mockPosts[1]], // Only the saved post
        total: 1
      });

      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });

      // Apply saved filter
      const savedFilterBtn = screen.getByTestId('saved-filter-btn');
      await user.click(savedFilterBtn);

      // Assert - Should show only saved posts
      await waitFor(() => {
        expect(screen.getByText('Saved Test Post 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Post 1')).not.toBeInTheDocument();
      });
    });

    it('should update post count in filter panel', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });

      // Should show total count initially
      expect(screen.getByText('Show Saved (2)')).toBeInTheDocument();

      // Apply saved filter
      await user.click(screen.getByTestId('saved-filter-btn'));

      // Assert - Count should update after filtering
      await waitFor(() => {
        expect(screen.getByText('Show Saved (1)')).toBeInTheDocument();
      });
    });

    it('should switch back to all posts from saved filter', async () => {
      const user = userEvent.setup();
      
      // Act
      render(<RealSocialMediaFeed />);

      // Apply saved filter first
      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('saved-filter-btn'));

      // Verify saved filter is active
      await waitFor(() => {
        expect(screen.getByTestId('current-filter')).toHaveTextContent('saved');
      });

      // Switch back to all posts
      await user.click(screen.getByTestId('all-filter-btn'));

      // Assert - Should call getAgentPosts for all posts
      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(20, 0);
        expect(screen.getByTestId('current-filter')).toHaveTextContent('all');
      });
    });
  });

  describe('Real-time Updates for Saved Posts', () => {
    it('should maintain saved state during real-time updates', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(mockApiService.on).toHaveBeenCalledWith('posts_updated', expect.any(Function));
      });

      // Get the callback function that was registered
      const updateCallback = mockApiService.on.mock.calls.find(
        call => call[0] === 'posts_updated'
      )[1];

      // Simulate real-time update for a saved post
      const updatedPost = {
        ...mockPosts[1],
        engagement: { ...mockPosts[1].engagement, likes: 15 }
      };

      updateCallback(updatedPost);

      // Assert - Post should maintain its saved state
      await waitFor(() => {
        expect(screen.getByText('Saved Test Post 2')).toBeInTheDocument();
        // The saved state should be preserved
        expect(screen.getByTitle('Unsave Post')).toBeInTheDocument();
      });
    });

    it('should handle new posts with saved state correctly', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      // Get update callback
      const updateCallback = mockApiService.on.mock.calls.find(
        call => call[0] === 'posts_updated'
      )[1];

      // Simulate new saved post
      const newSavedPost = {
        id: 'post-3',
        title: 'New Saved Post',
        content: 'This is a new saved post.',
        authorAgent: 'NewAgent',
        publishedAt: '2024-01-03T00:00:00Z',
        metadata: { businessImpact: 90 },
        engagement: { likes: 0, comments: 0, isSaved: true },
        tags: ['new', 'saved']
      };

      updateCallback(newSavedPost);

      // Assert - New saved post should appear with correct state
      await waitFor(() => {
        expect(screen.getByText('New Saved Post')).toBeInTheDocument();
        expect(screen.getByTitle('Unsave Post')).toBeInTheDocument();
      });
    });
  });

  describe('Error States and Loading', () => {
    it('should handle API errors when loading saved posts', async () => {
      // Arrange - Mock API error
      mockApiService.getFilteredPosts.mockRejectedValueOnce(new Error('API Error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });

      // Attempt to load saved posts
      const user = userEvent.setup();
      await user.click(screen.getByTestId('saved-filter-btn'));

      // Assert - Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should show empty state when no saved posts exist', async () => {
      // Arrange - Mock empty response
      mockApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [],
        total: 0
      });

      const user = userEvent.setup();

      // Act
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('saved-filter-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('saved-filter-btn'));

      // Assert - Should show empty state
      await waitFor(() => {
        expect(screen.getByText('No posts yet')).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should unregister event listeners on unmount', () => {
      // Act
      const { unmount } = render(<RealSocialMediaFeed />);
      unmount();

      // Assert - Should call off to remove listeners
      expect(mockApiService.off).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });

    it('should handle multiple mount/unmount cycles', () => {
      // Act - Mount and unmount multiple times
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<RealSocialMediaFeed />);
        unmount();
      }

      // Assert - Should handle cleanup properly each time
      expect(mockApiService.off).toHaveBeenCalledTimes(3);
    });
  });
});