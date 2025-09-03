/**
 * TDD London School - Regression Prevention Tests
 * 
 * Comprehensive regression testing to ensure that removing sharing
 * functionality doesn't break existing like/comment/engagement features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialMediaFeed from '../../frontend/src/components/SocialMediaFeed';
import { 
  createMockApiService, 
  createMockWebSocketContext,
  createMockPost 
} from './mock-contracts';

const mockApiService = createMockApiService();
const mockWebSocketContext = createMockWebSocketContext();

jest.mock('../../frontend/src/services/api', () => ({
  apiService: mockApiService
}));

jest.mock('../../frontend/src/context/WebSocketContext', () => ({
  useWebSocketContext: () => mockWebSocketContext
}));

jest.mock('../../frontend/src/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

describe('Regression Prevention Tests - Sharing Removal (London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      posts: [
        createMockPost({ 
          id: 'regression-test-1', 
          likes: 15, 
          comments: 8,
          shares: 5 
        }),
        createMockPost({ 
          id: 'regression-test-2', 
          likes: 25, 
          comments: 12,
          shares: 20 
        }),
      ]
    });
    
    mockApiService.checkDatabaseConnection.mockResolvedValue({
      connected: true,
      fallback: false
    });
    
    mockApiService.updatePostEngagement.mockResolvedValue({
      success: true
    });
  });

  describe('Like Functionality Regression Tests', () => {
    test('should maintain like button rendering and functionality', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Like buttons should still be present
      const likeButtons = screen.getAllByRole('button', { name: /like/i });
      expect(likeButtons).toHaveLength(2); // One per post

      // Like functionality should work
      fireEvent.click(likeButtons[0]);
      
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'regression-test-1',
        'like'
      );
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('regression-test-1', 'add');
    });

    test('should maintain optimistic like count updates', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Initial like count should be 15
      expect(screen.getByText('15')).toBeInTheDocument();

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should optimistically update to 16
      await waitFor(() => {
        expect(screen.getByText('16')).toBeInTheDocument();
      });
    });

    test('should handle like API errors with proper rollback', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.updatePostEngagement.mockRejectedValueOnce(new Error('Like API failed'));

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should attempt API call
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'regression-test-1',
        'like'
      );

      // Should rollback on error - count should remain 15
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test('should maintain like button styling and interaction states', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      
      // Should have proper hover and transition classes
      expect(likeButton).toHaveClass('transition-colors');
      expect(likeButton.closest('.flex')).toHaveClass('items-center', 'space-x-2');
    });

    test('should maintain like functionality in offline mode', async () => {
      // Mock offline state
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: false,
        fallback: true
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Like buttons should be disabled in offline mode
      const likeButtons = screen.getAllByRole('button', { name: /like/i });
      expect(likeButtons[0]).toBeDisabled();
      
      // Should show proper offline indicator
      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });
  });

  describe('Comment Functionality Regression Tests', () => {
    test('should maintain comment button rendering and functionality', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Comment buttons should still be present
      const commentButtons = screen.getAllByRole('button', { name: /comment/i });
      expect(commentButtons).toHaveLength(2); // One per post

      // Comment functionality should work
      fireEvent.click(commentButtons[0]);
      
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('regression-test-1');
    });

    test('should maintain comment count display', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Comment counts should be displayed
      expect(screen.getByText('8')).toBeInTheDocument(); // First post comments
      expect(screen.getByText('12')).toBeInTheDocument(); // Second post comments
    });

    test('should maintain comment WebSocket subscriptions', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should subscribe to posts for comments
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('regression-test-1');
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('regression-test-2');
    });

    test('should handle comment updates via WebSocket', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Verify comment event listener is registered
      expect(mockWebSocketContext.on).toHaveBeenCalledWith(
        'comment:created', 
        expect.any(Function)
      );
    });

    test('should maintain comment button styling and layout', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      
      // Should maintain proper styling
      expect(commentButton).toHaveClass('transition-colors');
      expect(commentButton.closest('.flex')).toHaveClass('items-center', 'space-x-2');
    });
  });

  describe('Feed Functionality Regression Tests', () => {
    test('should maintain post loading and rendering', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Posts should load and display
      expect(screen.getByText('Test Agent Post')).toBeInTheDocument();
      expect(mockApiService.getAgentPosts).toHaveBeenCalled();
    });

    test('should maintain feed refresh functionality', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Find and click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Should call API again
      expect(mockApiService.getAgentPosts).toHaveBeenCalledTimes(2);
    });

    test('should maintain search functionality', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Open search
      const searchToggle = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchToggle);

      // Search input should appear
      const searchInput = screen.getByPlaceholderText(/search posts/i);
      expect(searchInput).toBeInTheDocument();

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // Should call search API
      expect(mockApiService.searchPosts).toHaveBeenCalledWith('test query');
    });

    test('should maintain filter and sort functionality', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Find filter dropdown
      const filterSelect = screen.getByDisplayValue('All Posts');
      fireEvent.change(filterSelect, { target: { value: 'high-impact' } });

      // Should trigger new API call with filter
      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(
          20, 0, 'high-impact', '', 'published_at', 'DESC'
        );
      });
    });

    test('should maintain WebSocket event handling', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Verify all required event listeners are registered
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('post:created', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('post:updated', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('post:deleted', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('like:updated', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('comment:created', expect.any(Function));
    });
  });

  describe('UI Layout and Styling Regression Tests', () => {
    test('should maintain post card layout without share button', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Post actions should still have proper flex layout
      const postActions = screen.getAllByRole('button').filter(button =>
        button.closest('.flex.items-center.space-x-6')
      );

      // Should have like and comment buttons (2 per post)
      expect(postActions).toHaveLength(4); // 2 posts × 2 buttons each
    });

    test('should maintain proper spacing between engagement buttons', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Engagement section should maintain space-x-6 class
      const engagementSection = screen.getAllByRole('button')[0].closest('.flex.items-center.space-x-6');
      expect(engagementSection).toHaveClass('space-x-6');
    });

    test('should maintain post header styling and metadata', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Agent name should still be formatted properly
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      
      // Business impact should still be displayed
      expect(screen.getByText('5/10')).toBeInTheDocument();
      
      // Tags should still be displayed
      expect(screen.getByText('#test')).toBeInTheDocument();
      expect(screen.getByText('#automation')).toBeInTheDocument();
    });

    test('should maintain responsive design and mobile optimization', async () => {
      // Mock window.innerWidth for mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Component should still render properly in mobile view
      expect(screen.getByText('Agent Feed')).toBeInTheDocument();
    });
  });

  describe('Performance Regression Tests', () => {
    test('should not cause performance degradation in rendering', async () => {
      const startTime = performance.now();
      
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Rendering should complete within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
    });

    test('should not cause memory leaks in event listeners', async () => {
      const { unmount } = render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Verify event listeners are properly cleaned up
      expect(mockWebSocketContext.off).toHaveBeenCalledWith('post:created', expect.any(Function));
      expect(mockWebSocketContext.off).toHaveBeenCalledWith('post:updated', expect.any(Function));
      expect(mockWebSocketContext.off).toHaveBeenCalledWith('like:updated', expect.any(Function));
      expect(mockWebSocketContext.off).toHaveBeenCalledWith('comment:created', expect.any(Function));
    });

    test('should maintain efficient re-rendering on state updates', async () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return <SocialMediaFeed />;
      };

      render(<TestWrapper />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger like action
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      await waitFor(() => {
        // Should only trigger necessary re-renders
        const finalRenderCount = renderSpy.mock.calls.length;
        expect(finalRenderCount - initialRenderCount).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Error Handling Regression Tests', () => {
    test('should maintain error boundary functionality', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock API to throw error
      mockApiService.getAgentPosts.mockRejectedValueOnce(new Error('Network error'));

      render(<SocialMediaFeed />);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      // Error should be displayed
      expect(screen.getByText(/unable to load feed/i)).toBeInTheDocument();
      
      // Retry button should be present
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    test('should handle network failures gracefully', async () => {
      // Mock network failure
      mockApiService.getAgentPosts.mockRejectedValueOnce(new Error('Network error'));
      mockApiService.checkDatabaseConnection.mockRejectedValueOnce(new Error('Connection failed'));

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      // Should display appropriate error message
      expect(screen.getByText(/error connecting to api/i)).toBeInTheDocument();
    });
  });
});