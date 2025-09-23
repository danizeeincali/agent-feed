import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../../src/components/RealSocialMediaFeed';
import { apiService } from '../../src/services/api';

/**
 * Unit Tests for RealSocialMediaFeed Component - Saved Posts Functionality
 * 
 * This test suite validates the React component behavior for:
 * 1. Save/Unsave button interactions
 * 2. UI state management for saved posts
 * 3. Filter functionality for saved posts
 * 4. Error handling in the UI
 */

// Mock the API service
vi.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    getFilteredPosts: vi.fn(),
    savePost: vi.fn(),
    getFilterData: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    clearCache: vi.fn()
  }
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  RefreshCw: ({ className, ...props }: any) => <div data-testid="refresh-icon" className={className} {...props} />,
  MessageCircle: ({ className, ...props }: any) => <div data-testid="message-circle-icon" className={className} {...props} />,
  Heart: ({ className, ...props }: any) => <div data-testid="heart-icon" className={className} {...props} />,
  AlertCircle: ({ className, ...props }: any) => <div data-testid="alert-circle-icon" className={className} {...props} />,
  ChevronDown: ({ className, ...props }: any) => <div data-testid="chevron-down-icon" className={className} {...props} />,
  ChevronUp: ({ className, ...props }: any) => <div data-testid="chevron-up-icon" className={className} {...props} />,
  User: ({ className, ...props }: any) => <div data-testid="user-icon" className={className} {...props} />,
  Bookmark: ({ className, ...props }: any) => <div data-testid="bookmark-icon" className={className} {...props} />,
  Trash2: ({ className, ...props }: any) => <div data-testid="trash-icon" className={className} {...props} />
}));

// Mock FilterPanel component
vi.mock('../../src/components/FilterPanel', () => ({
  default: ({ currentFilter, onFilterChange, postCount }: any) => (
    <div data-testid="filter-panel">
      <button 
        data-testid="filter-all" 
        onClick={() => onFilterChange({ type: 'all' })}
        className={currentFilter.type === 'all' ? 'active' : ''}
      >
        All ({postCount})
      </button>
      <button 
        data-testid="filter-saved" 
        onClick={() => onFilterChange({ type: 'saved' })}
        className={currentFilter.type === 'saved' ? 'active' : ''}
      >
        Saved
      </button>
    </div>
  )
}));

// Mock content parser utilities
vi.mock('../../src/utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => content),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => [])
}));

const mockPosts = [
  {
    id: 'post-1',
    title: 'Test Post 1',
    content: 'This is test content for post 1.',
    authorAgent: 'TestAgent1',
    publishedAt: '2024-01-01T12:00:00Z',
    engagement: {
      likes: 5,
      comments: 2,
      shares: 1,
      views: 100,
      saves: 0,
      isSaved: false
    },
    metadata: {
      businessImpact: 75,
      confidence_score: 0.95,
      isAgentResponse: true,
      processing_time_ms: 1500,
      model_version: 'claude-3',
      tokens_used: 150,
      temperature: 0.7
    },
    tags: ['test', 'demo']
  },
  {
    id: 'post-2',
    title: 'Test Post 2',
    content: 'This is test content for post 2.',
    authorAgent: 'TestAgent2',
    publishedAt: '2024-01-02T12:00:00Z',
    engagement: {
      likes: 8,
      comments: 3,
      shares: 2,
      views: 150,
      saves: 1,
      isSaved: true
    },
    metadata: {
      businessImpact: 85,
      confidence_score: 0.98,
      isAgentResponse: true,
      processing_time_ms: 1200,
      model_version: 'claude-3',
      tokens_used: 120,
      temperature: 0.7
    },
    tags: ['test', 'saved']
  }
];

describe('RealSocialMediaFeed - Saved Posts Component Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock responses
    (apiService.getAgentPosts as any).mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });

    (apiService.getFilterData as any).mockResolvedValue({
      agents: ['TestAgent1', 'TestAgent2'],
      hashtags: ['test', 'demo', 'saved']
    });

    (apiService.savePost as any).mockResolvedValue({
      success: true,
      message: 'Post saved successfully'
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Save Button Rendering', () => {
    it('should render save buttons for all posts', async () => {
      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Check that save buttons are rendered
      const saveButtons = screen.getAllByText(/Save|Saved/);
      expect(saveButtons).toHaveLength(mockPosts.length);
    });

    it('should show "Save" for unsaved posts and "Saved" for saved posts', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // First post should show "Save" (not saved)
      const saveButton = screen.getAllByText('Save')[0];
      expect(saveButton).toBeInTheDocument();

      // Second post should show "Saved" (already saved)
      const savedButton = screen.getByText('Saved');
      expect(savedButton).toBeInTheDocument();
    });

    it('should render bookmark icons with correct fill state', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      const bookmarkIcons = screen.getAllByTestId('bookmark-icon');
      expect(bookmarkIcons).toHaveLength(mockPosts.length);

      // Check if saved post has filled bookmark (this would be in className)
      // For the second post which is saved, the icon should have fill classes
      const savedPostIcon = bookmarkIcons[1];
      expect(savedPostIcon).toHaveClass('fill-blue-500');
    });
  });

  describe('Save/Unsave Functionality', () => {
    it('should call savePost API when clicking save button', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Find and click the save button for the first post
      const saveButton = screen.getAllByText('Save')[0];
      fireEvent.click(saveButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(apiService.savePost).toHaveBeenCalledWith('post-1', true);
      });
    });

    it('should call savePost API when clicking unsave button', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      });

      // Find and click the saved button for the second post
      const savedButton = screen.getByText('Saved');
      fireEvent.click(savedButton);

      // Verify API was called with correct parameters to unsave
      await waitFor(() => {
        expect(apiService.savePost).toHaveBeenCalledWith('post-2', false);
      });
    });

    it('should update UI state after successful save operation', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Click save button
      const saveButton = screen.getAllByText('Save')[0];
      fireEvent.click(saveButton);

      // Wait for UI to update
      await waitFor(() => {
        // The button text should change to "Saved"
        expect(screen.getAllByText('Saved')).toHaveLength(2); // Now both posts are saved
      });
    });

    it('should update UI state after successful unsave operation', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      });

      // Click saved button to unsave
      const savedButton = screen.getByText('Saved');
      fireEvent.click(savedButton);

      // Wait for UI to update
      await waitFor(() => {
        // Should now have 2 "Save" buttons and 0 "Saved" buttons
        const saveButtons = screen.getAllByText('Save');
        expect(saveButtons).toHaveLength(2);
        expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      });
    });

    it('should handle save operation errors gracefully', async () => {
      // Mock API to return error
      (apiService.savePost as any).mockRejectedValue(new Error('Save failed'));

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Click save button
      const saveButton = screen.getAllByText('Save')[0];
      fireEvent.click(saveButton);

      // UI should remain unchanged due to error
      await waitFor(() => {
        // Should still show "Save" for first post
        const saveButtons = screen.getAllByText('Save');
        expect(saveButtons).toHaveLength(1);
      });
    });
  });

  describe('Saved Posts Filter', () => {
    beforeEach(() => {
      // Mock filtered posts response
      (apiService.getFilteredPosts as any).mockResolvedValue({
        success: true,
        data: [mockPosts[1]], // Only the saved post
        total: 1
      });
    });

    it('should call getFilteredPosts when saved filter is applied', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Click the saved filter button
      const savedFilterButton = screen.getByTestId('filter-saved');
      fireEvent.click(savedFilterButton);

      // Verify the filtered API was called
      await waitFor(() => {
        expect(apiService.getFilteredPosts).toHaveBeenCalledWith(
          20, // limit
          0,  // offset
          { type: 'saved' }
        );
      });
    });

    it('should show only saved posts when saved filter is active', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Apply saved filter
      const savedFilterButton = screen.getByTestId('filter-saved');
      fireEvent.click(savedFilterButton);

      // Wait for filtered results
      await waitFor(() => {
        // Should only show the saved post (Post 2)
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Post 1')).not.toBeInTheDocument();
      });
    });

    it('should show all posts when all filter is applied after saved filter', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Apply saved filter first
      const savedFilterButton = screen.getByTestId('filter-saved');
      fireEvent.click(savedFilterButton);

      await waitFor(() => {
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      });

      // Then apply all filter
      const allFilterButton = screen.getByTestId('filter-all');
      fireEvent.click(allFilterButton);

      // Should show all posts again
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      // Mock delayed response
      (apiService.getAgentPosts as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<RealSocialMediaFeed />);

      // Should show loading state
      expect(screen.getByText('Loading real post data...')).toBeInTheDocument();
    });

    it('should hide loading state after posts are loaded', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Loading state should be gone
      expect(screen.queryByText('Loading real post data...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when posts fail to load', async () => {
      (apiService.getAgentPosts as any).mockRejectedValue(new Error('Failed to load posts'));

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
      });
    });

    it('should allow error dismissal', async () => {
      (apiService.getAgentPosts as any).mockRejectedValue(new Error('Failed to load posts'));

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // Find and click the dismiss button (×)
      const dismissButton = screen.getByText('×');
      fireEvent.click(dismissButton);

      // Error should be dismissed
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper titles on save buttons', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Check save button titles
      const saveButton = screen.getAllByTitle(/Save Post|Unsave Post/)[0];
      expect(saveButton).toBeInTheDocument();
    });

    it('should support keyboard navigation for save buttons', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      const saveButton = screen.getAllByText('Save')[0];
      
      // Focus the button
      saveButton.focus();
      expect(document.activeElement).toBe(saveButton);

      // Simulate Enter key press
      fireEvent.keyDown(saveButton, { key: 'Enter', code: 'Enter' });
      
      // API should be called
      await waitFor(() => {
        expect(apiService.savePost).toHaveBeenCalled();
      });
    });
  });

  describe('Post Metrics and UI', () => {
    it('should display post metrics correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Check for business impact display
      expect(screen.getByText('75% impact')).toBeInTheDocument();
      expect(screen.getByText('85% impact')).toBeInTheDocument();
    });

    it('should handle post expansion correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Find and click expand button
      const expandButton = screen.getAllByTestId('chevron-down-icon')[0].parentElement;
      if (expandButton) {
        fireEvent.click(expandButton);

        // Should show collapse button after expansion
        await waitFor(() => {
          expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should register WebSocket event handlers', () => {
      render(<RealSocialMediaFeed />);

      // Verify that event handlers were registered
      expect(apiService.on).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });

    it('should cleanup event handlers on unmount', () => {
      const { unmount } = render(<RealSocialMediaFeed />);

      unmount();

      // Verify that event handlers were cleaned up
      expect(apiService.off).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });
  });
});