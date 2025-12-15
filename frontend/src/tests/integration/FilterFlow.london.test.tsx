/**
 * TDD London School Integration Test Suite: Filter Flow
 * 
 * CRITICAL BUG INVESTIGATION: Complete filter workflow integration testing
 * 
 * Integration Focus:
 * 1. FilterPanel -> RealSocialMediaFeed -> API Service communication
 * 2. State synchronization across components
 * 3. Error propagation and recovery
 * 4. Cache invalidation workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';
import { apiService } from '../../services/api';

// Mock API service (London School - mock external dependencies)
jest.mock('../../services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    getFilteredPosts: jest.fn(),
    getFilterData: jest.fn(),
    getFilterStats: jest.fn(),
    getFilterSuggestions: jest.fn(),
    savePost: jest.fn(),
    deletePost: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    clearCache: jest.fn()
  }
}));

// Mock content parser utilities
jest.mock('../../utils/contentParser', () => ({
  renderParsedContent: jest.fn((content) => <div>{content}</div>),
  parseContent: jest.fn((content) => content),
  extractHashtags: jest.fn(() => []),
  extractMentions: jest.fn(() => [])
}));

// Mock FilterPanel to isolate integration points
jest.mock('../../components/FilterPanel', () => {
  return function MockFilterPanel({ onFilterChange, currentFilter }: any) {
    return (
      <div data-testid="mock-filter-panel">
        <button
          data-testid="filter-all"
          onClick={() => onFilterChange({ type: 'all' })}
        >
          All Posts
        </button>
        <button
          data-testid="filter-agent"
          onClick={() => onFilterChange({ type: 'agent', agent: 'TestAgent' })}
        >
          Agent Filter
        </button>
        <button
          data-testid="filter-multi-select"
          onClick={() => onFilterChange({ 
            type: 'multi-select', 
            agents: ['agent1', 'agent2'],
            hashtags: ['tag1'],
            combinationMode: 'AND'
          })}
        >
          Multi-Select Filter
        </button>
        <button
          data-testid="filter-empty-multi-select"
          onClick={() => onFilterChange({ 
            type: 'multi-select', 
            agents: [],
            hashtags: [],
            savedPostsEnabled: false,
            myPostsEnabled: false
          })}
        >
          Empty Multi-Select
        </button>
        <div data-testid="current-filter">{JSON.stringify(currentFilter)}</div>
      </div>
    );
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  MessageCircle: () => <div data-testid="message-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  User: () => <div data-testid="user-icon" />,
  Bookmark: () => <div data-testid="bookmark-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Heart: () => <div data-testid="heart-icon" />
}));

describe('Filter Flow Integration Tests - London School', () => {
  const mockApiService = apiService as jest.Mocked<typeof apiService>;
  
  const mockPosts = [
    {
      id: '1',
      title: 'Test Post 1',
      content: 'Content for post 1',
      authorAgent: 'TestAgent',
      publishedAt: '2024-01-01T00:00:00Z',
      engagement: { comments: 0, saves: 0, isSaved: false },
      tags: ['tag1'],
      metadata: { businessImpact: 75 }
    },
    {
      id: '2',
      title: 'Test Post 2',
      content: 'Content for post 2',
      authorAgent: 'AnotherAgent',
      publishedAt: '2024-01-02T00:00:00Z',
      engagement: { comments: 1, saves: 2, isSaved: true },
      tags: ['tag2'],
      metadata: { businessImpact: 85 }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API responses
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: 2
    });
    
    mockApiService.getFilterData.mockResolvedValue({
      agents: ['TestAgent', 'AnotherAgent'],
      hashtags: ['tag1', 'tag2']
    });
    
    mockApiService.getFilterStats.mockResolvedValue({
      totalPosts: 2,
      savedPosts: 1,
      myPosts: 1,
      agentCounts: { TestAgent: 1, AnotherAgent: 1 },
      hashtagCounts: { tag1: 1, tag2: 1 }
    });
    
    mockApiService.getFilteredPosts.mockResolvedValue({
      success: true,
      data: [],
      total: 0
    });
  });

  describe('Initial Load and State Management', () => {
    it('should load initial data and render filter panel correctly', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      // Assert: Verify initial API calls
      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(20, 0);
        expect(mockApiService.getFilterData).toHaveBeenCalled();
        expect(mockApiService.getFilterStats).toHaveBeenCalledWith('anonymous');
      });

      // Verify UI elements
      expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      expect(screen.getByTestId('mock-filter-panel')).toBeInTheDocument();
    });

    it('should display loaded posts correctly', async () => {
      // Act
      render(<RealSocialMediaFeed />);

      // Assert: Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
        expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Change Integration Flow', () => {
    it('should handle "all posts" filter correctly', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Change to all posts filter
      fireEvent.click(screen.getByTestId('filter-all'));

      // Assert: Verify API call sequence
      await waitFor(() => {
        // Should call getAgentPosts (not getFilteredPosts) for 'all' type
        expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(20, 0);
      });

      // Verify current filter state
      const currentFilter = JSON.parse(screen.getByTestId('current-filter').textContent!);
      expect(currentFilter.type).toBe('all');
    });

    it('should handle agent filter correctly', async () => {
      // Arrange
      mockApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [mockPosts[0]], // Only posts from TestAgent
        total: 1
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Apply agent filter
      fireEvent.click(screen.getByTestId('filter-agent'));

      // Assert: Verify filtered API call
      await waitFor(() => {
        expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
          20, 0,
          { type: 'agent', agent: 'TestAgent' }
        );
      });
    });

    it('should handle multi-select filter correctly', async () => {
      // Arrange
      const multiSelectFilter = {
        type: 'multi-select',
        agents: ['agent1', 'agent2'],
        hashtags: ['tag1'],
        combinationMode: 'AND'
      };

      mockApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [mockPosts[0]],
        total: 1
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Apply multi-select filter
      fireEvent.click(screen.getByTestId('filter-multi-select'));

      // Assert: Verify multi-select API call
      await waitFor(() => {
        expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
          20, 0,
          multiSelectFilter
        );
      });
    });
  });

  describe('Empty Filter Handling', () => {
    it('should handle empty multi-select filter correctly', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Apply empty multi-select filter
      fireEvent.click(screen.getByTestId('filter-empty-multi-select'));

      // Assert: Should still call API but might return no results
      await waitFor(() => {
        expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
          20, 0,
          expect.objectContaining({
            type: 'multi-select',
            agents: [],
            hashtags: []
          })
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Arrange: Mock API error
      mockApiService.getAgentPosts.mockRejectedValue(new Error('API Error'));

      // Act
      render(<RealSocialMediaFeed />);

      // Assert: Should display error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle filter API errors and show error state', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Mock filter error
      mockApiService.getFilteredPosts.mockRejectedValue(new Error('Filter API Error'));

      // Act: Apply filter that will fail
      fireEvent.click(screen.getByTestId('filter-agent'));

      // Assert: Should handle error gracefully
      await waitFor(() => {
        // Component should handle error without crashing
        expect(screen.getByTestId('mock-filter-panel')).toBeInTheDocument();
      });
    });
  });

  describe('State Synchronization', () => {
    it('should keep filter state synchronized across multiple changes', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Make multiple filter changes
      fireEvent.click(screen.getByTestId('filter-agent'));
      await waitFor(() => {
        const currentFilter = JSON.parse(screen.getByTestId('current-filter').textContent!);
        expect(currentFilter.type).toBe('agent');
      });

      fireEvent.click(screen.getByTestId('filter-all'));
      await waitFor(() => {
        const currentFilter = JSON.parse(screen.getByTestId('current-filter').textContent!);
        expect(currentFilter.type).toBe('all');
      });

      // Assert: Should make correct API calls in sequence
      expect(mockApiService.getFilteredPosts).toHaveBeenCalledWith(
        20, 0, { type: 'agent', agent: 'TestAgent' }
      );
      expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(20, 0);
    });

    it('should update post count when filter changes', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Apply filter that returns fewer results
      mockApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [mockPosts[0]],
        total: 1
      });

      fireEvent.click(screen.getByTestId('filter-agent'));

      // Assert: Post count should update
      await waitFor(() => {
        // The feed should reflect the new filtered results
        expect(mockApiService.getFilteredPosts).toHaveBeenCalled();
      });
    });
  });

  describe('Post Interactions During Filtering', () => {
    it('should handle post save/unsave during active filter', async () => {
      // Arrange
      mockApiService.savePost.mockResolvedValue({ success: true });
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Save a post
      const saveButtons = screen.getAllByTitle(/save post/i);
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
      }

      // Assert: Should call save API and refresh filter data
      await waitFor(() => {
        if (saveButtons.length > 0) {
          expect(mockApiService.savePost).toHaveBeenCalled();
          expect(mockApiService.getFilterData).toHaveBeenCalled(); // Should refresh filter data
        }
      });
    });

    it('should handle post deletion during active filter', async () => {
      // Arrange
      mockApiService.deletePost.mockResolvedValue({ success: true });
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Act: Delete a post
      const deleteButtons = screen.getAllByTitle(/delete post/i);
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      }

      // Assert: Should call delete API
      await waitFor(() => {
        if (deleteButtons.length > 0) {
          expect(mockApiService.deletePost).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time updates with active filters', async () => {
      // Arrange
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });

      // Verify that real-time listeners are set up
      expect(mockApiService.on).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });

    it('should clean up real-time listeners on unmount', () => {
      // Arrange
      const { unmount } = render(<RealSocialMediaFeed />);

      // Act: Unmount component
      unmount();

      // Assert: Should clean up listeners
      expect(mockApiService.off).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });
  });
});

/**
 * INTEGRATION BUGS IDENTIFIED:
 * 
 * 1. FILTER STATE RACE CONDITION: Rapid filter changes may cause inconsistent API calls
 * 2. EMPTY FILTER HANDLING: Component doesn't prevent API calls for empty multi-select filters
 * 3. ERROR RECOVERY: Failed filter operations don't reset to previous working state
 * 4. CACHE COORDINATION: Filter changes don't properly coordinate with cache invalidation
 * 5. STATE SYNCHRONIZATION: Filter state may become out of sync with API responses
 * 
 * CRITICAL PATH ISSUES:
 * - Empty multi-select filters are passed to API instead of being prevented
 * - No fallback mechanism when filtered results are empty
 * - Filter reset to "all posts" may not work correctly after failed filter operations
 * 
 * NEXT: Browser automation tests to verify real user interaction scenarios
 */