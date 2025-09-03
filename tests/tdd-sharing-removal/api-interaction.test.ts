/**
 * TDD London School - API Interaction Tests
 * 
 * Mock-driven testing focused on verifying API interactions
 * Ensure sharing endpoints are never called after removal
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

// Mock modules
jest.mock('../../frontend/src/services/api', () => ({
  apiService: mockApiService
}));

jest.mock('../../frontend/src/context/WebSocketContext', () => ({
  useWebSocketContext: () => mockWebSocketContext
}));

jest.mock('../../frontend/src/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

describe('API Interaction Tests - Sharing Removal (London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      posts: [
        createMockPost({ 
          id: 'test-post-1', 
          shares: 5, 
          likes: 10, 
          comments: 2 
        }),
        createMockPost({ 
          id: 'test-post-2', 
          shares: 15, 
          likes: 20, 
          comments: 8 
        }),
      ]
    });
    
    mockApiService.checkDatabaseConnection.mockResolvedValue({
      connected: true,
      fallback: false
    });
    
    mockApiService.updatePostEngagement.mockResolvedValue({
      success: true,
      updatedPost: createMockPost()
    });
  });

  describe('Current API Interactions - WITH Sharing', () => {
    test('should call updatePostEngagement with share action', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Find and click share button
      const shareButton = screen.getAllByRole('button', { name: /share/i })[0];
      fireEvent.click(shareButton);

      // Verify share API call is made
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-1',
        'share'
      );
    });

    test('should handle share API success response', async () => {
      mockApiService.updatePostEngagement.mockResolvedValue({
        success: true,
        updatedPost: createMockPost({ shares: 6 })
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const shareButton = screen.getAllByRole('button', { name: /share/i })[0];
      fireEvent.click(shareButton);

      // Share count should update optimistically
      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
      });
    });

    test('should handle share API error response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.updatePostEngagement.mockRejectedValue(new Error('Share API failed'));

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const shareButton = screen.getAllByRole('button', { name: /share/i })[0];
      fireEvent.click(shareButton);

      // API call should be attempted
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-1',
        'share'
      );

      // Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to update share:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Target API Interactions - WITHOUT Sharing', () => {
    test('should NEVER call updatePostEngagement with share action', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Try to trigger any possible share functionality
      const allButtons = screen.getAllByRole('button');
      
      // Click all buttons to ensure none trigger share API
      for (const button of allButtons) {
        fireEvent.click(button);
      }

      // Wait for any async operations
      await waitFor(() => {
        // Should never call with 'share' action
        expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
          expect.any(String),
          'share'
        );
      });
    });

    test('should maintain like API interactions without share', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Click like button
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should call like API
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-1',
        'like'
      );

      // Should NOT call share API
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        'test-post-1',
        'share'
      );
    });

    test('should maintain comment API interactions without share', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Click comment button
      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      fireEvent.click(commentButton);

      // Should subscribe to post for comments
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('test-post-1');

      // Should NOT call share API
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('should verify API call isolation between engagement types', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Test like functionality
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Clear mock calls
      jest.clearAllMocks();

      // Test comment functionality
      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      fireEvent.click(commentButton);

      // Verify only comment-related calls were made
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('test-post-1');
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Interaction Verification', () => {
    test('should maintain WebSocket interactions for likes without share', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should send like via WebSocket
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('test-post-1', 'add');
      
      // Should NOT send any share-related WebSocket messages
      const allCalls = mockWebSocketContext.sendLike.mock.calls.flat();
      expect(allCalls).not.toContain('share');
    });

    test('should verify WebSocket event handling without share events', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Verify event listeners are registered
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('post:created', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('post:updated', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('like:updated', expect.any(Function));
      expect(mockWebSocketContext.on).toHaveBeenCalledWith('comment:created', expect.any(Function));

      // Should NOT register share-related event listeners
      const allOnCalls = mockWebSocketContext.on.mock.calls;
      const shareEvents = allOnCalls.filter(call => 
        call[0].includes('share') || call[0].includes('Share')
      );
      expect(shareEvents).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully without affecting share functionality', async () => {
      // Mock like API to fail
      mockApiService.updatePostEngagement.mockRejectedValue(new Error('API Error'));

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should attempt like API call
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-1',
        'like'
      );

      // Even in error conditions, should not call share API
      await waitFor(() => {
        expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
          expect.any(String),
          'share'
        );
      });
    });

    test('should handle offline mode without share functionality', async () => {
      // Mock offline state
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: false,
        fallback: true
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Verify offline state
      expect(screen.getByText('Fallback')).toBeInTheDocument();

      // Like buttons should be disabled
      const likeButtons = screen.getAllByRole('button', { name: /like/i });
      expect(likeButtons[0]).toBeDisabled();

      // Share buttons should not exist
      const shareButtons = screen.queryAllByRole('button', { name: /share/i });
      expect(shareButtons).toHaveLength(0);

      // No API calls should be made in offline mode
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalled();
    });

    test('should verify API caching behavior without share endpoints', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Trigger like to verify cache clearing
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Cache should be cleared for engagement updates
      expect(mockApiService.clearCache).toHaveBeenCalledWith('/agent-posts');

      // Should not clear cache for share-specific endpoints
      const clearCacheCalls = mockApiService.clearCache.mock.calls;
      const shareCacheCalls = clearCacheCalls.filter(call => 
        call[0] && call[0].includes('share')
      );
      expect(shareCacheCalls).toHaveLength(0);
    });
  });

  describe('Performance and Optimization Verification', () => {
    test('should verify optimistic updates work for likes without share interference', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Initial like count should be 10
      expect(screen.getByText('10')).toBeInTheDocument();

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should optimistically update to 11
      await waitFor(() => {
        expect(screen.getByText('11')).toBeInTheDocument();
      });

      // Should not affect any share-related optimistic updates
      expect(screen.queryByText('6')).not.toBeInTheDocument(); // Share count change
    });

    test('should verify component re-renders efficiently without share state', async () => {
      const renderSpy = jest.fn();
      
      // Mock component to track renders
      const WrappedComponent = () => {
        renderSpy();
        return <SocialMediaFeed />;
      };

      render(<WrappedComponent />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger like action
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      await waitFor(() => {
        // Should re-render for like update only, not share-related renders
        expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount);
      });
    });
  });
});