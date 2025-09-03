/**
 * TDD London School - Outside-In Integration Tests
 * 
 * Integration tests following London School outside-in approach
 * Testing the complete behavior from user interaction to system response
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

describe('Outside-In Integration Tests - Sharing Removal (London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      posts: [
        createMockPost({ 
          id: 'integration-post-1', 
          title: 'Integration Test Post 1',
          likes: 10, 
          comments: 5,
          shares: 8
        }),
        createMockPost({ 
          id: 'integration-post-2', 
          title: 'Integration Test Post 2',
          likes: 25, 
          comments: 12,
          shares: 15
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

  describe('User Journey - Complete Engagement Flow WITHOUT Sharing', () => {
    test('user loads feed, sees posts, and engages without sharing options', async () => {
      // GIVEN: User opens the social media feed
      render(<SocialMediaFeed />);
      
      // WHEN: Feed loads
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // THEN: Posts are displayed with engagement options (but no sharing)
      expect(screen.getByText('Integration Test Post 1')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Post 2')).toBeInTheDocument();
      
      // AND: Like and comment buttons are present
      const likeButtons = screen.getAllByRole('button', { name: /like/i });
      const commentButtons = screen.getAllByRole('button', { name: /comment/i });
      
      expect(likeButtons).toHaveLength(2);
      expect(commentButtons).toHaveLength(2);
      
      // AND: Share buttons are NOT present
      const shareButtons = screen.queryAllByRole('button', { name: /share/i });
      expect(shareButtons).toHaveLength(0);
    });

    test('user likes a post - complete interaction flow', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // GIVEN: Initial like count is 10
      expect(screen.getByText('10')).toBeInTheDocument();

      // WHEN: User clicks like button
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // THEN: Optimistic UI update occurs
      await waitFor(() => {
        expect(screen.getByText('11')).toBeInTheDocument();
      });

      // AND: API call is made
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'integration-post-1',
        'like'
      );

      // AND: WebSocket event is sent
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('integration-post-1', 'add');

      // AND: No share-related calls are made
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('user opens comments - complete interaction flow', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // WHEN: User clicks comment button
      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      fireEvent.click(commentButton);

      // THEN: WebSocket subscription is created
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('integration-post-1');

      // AND: No API call is made for comments (just subscription)
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        'integration-post-1',
        'comment'
      );

      // AND: No share-related calls are made
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('user refreshes feed - complete data flow without sharing', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // WHEN: User clicks refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // THEN: API is called again
      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalledTimes(2);
      });

      // AND: Posts are re-rendered without sharing elements
      expect(screen.getAllByRole('button', { name: /like/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /comment/i })).toHaveLength(2);
      expect(screen.queryAllByRole('button', { name: /share/i })).toHaveLength(0);
    });
  });

  describe('End-to-End Scenario - Multiple User Interactions', () => {
    test('complex user workflow without sharing interference', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // STEP 1: User likes first post
      const firstLikeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(firstLikeButton);

      await waitFor(() => {
        expect(screen.getByText('11')).toBeInTheDocument();
      });

      // STEP 2: User opens comments on second post
      const secondCommentButton = screen.getAllByRole('button', { name: /comment/i })[1];
      fireEvent.click(secondCommentButton);

      // STEP 3: User opens search
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      const searchInput = screen.getByPlaceholderText(/search posts/i);
      fireEvent.change(searchInput, { target: { value: 'integration' } });

      // STEP 4: User changes filter
      const filterSelect = screen.getByDisplayValue('All Posts');
      fireEvent.change(filterSelect, { target: { value: 'high-impact' } });

      // VERIFY: All interactions worked correctly
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('integration-post-1', 'like');
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('integration-post-2');
      expect(mockApiService.searchPosts).toHaveBeenCalledWith('integration');
      expect(mockApiService.getAgentPosts).toHaveBeenCalledWith(
        20, 0, 'high-impact', '', 'published_at', 'DESC'
      );

      // VERIFY: No sharing functionality was triggered
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('error recovery workflow maintains non-sharing functionality', async () => {
      // GIVEN: API initially fails
      mockApiService.getAgentPosts.mockRejectedValueOnce(new Error('Network error'));

      render(<SocialMediaFeed />);
      
      // WHEN: Error state is displayed
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      // AND: User clicks retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // Reset mock to succeed
      mockApiService.getAgentPosts.mockResolvedValueOnce({
        success: true,
        posts: [createMockPost({ id: 'recovery-post', likes: 5, comments: 3 })]
      });
      
      fireEvent.click(retryButton);

      // THEN: Feed loads successfully
      await waitFor(() => {
        expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
      });

      // AND: Engagement features work without sharing
      const likeButton = screen.getByRole('button', { name: /like/i });
      fireEvent.click(likeButton);

      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('recovery-post', 'like');
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });
  });

  describe('Real-time Interaction Flow', () => {
    test('WebSocket events update UI without sharing interference', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Simulate WebSocket events
      const mockOnCall = mockWebSocketContext.on.mock.calls.find(call => 
        call[0] === 'like:updated'
      );
      
      if (mockOnCall) {
        const likeHandler = mockOnCall[1];
        
        // Simulate like update from WebSocket
        likeHandler({
          postId: 'integration-post-1',
          action: 'add'
        });

        // UI should update - like count should increase
        await waitFor(() => {
          expect(screen.getByText('11')).toBeInTheDocument();
        });
      }

      // Verify no share-related WebSocket events
      const shareEvents = mockWebSocketContext.on.mock.calls.filter(call =>
        call[0].includes('share') || call[0].includes('Share')
      );
      expect(shareEvents).toHaveLength(0);
    });

    test('post creation via WebSocket excludes sharing from UI', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Simulate new post creation
      const mockOnCall = mockWebSocketContext.on.mock.calls.find(call => 
        call[0] === 'post:created'
      );
      
      if (mockOnCall) {
        const postCreatedHandler = mockOnCall[1];
        
        // Simulate new post with sharing data (but UI shouldn't show it)
        postCreatedHandler(createMockPost({
          id: 'new-post',
          title: 'New Real-time Post',
          shares: 0
        }));

        // New post should appear
        await waitFor(() => {
          expect(screen.getByText('New Real-time Post')).toBeInTheDocument();
        });

        // But share button should not be present
        const shareButtons = screen.queryAllByRole('button', { name: /share/i });
        expect(shareButtons).toHaveLength(0);

        // Like and comment buttons should be present
        const likeButtons = screen.getAllByRole('button', { name: /like/i });
        const commentButtons = screen.getAllByRole('button', { name: /comment/i });
        
        expect(likeButtons.length).toBeGreaterThan(2); // Original 2 + new post
        expect(commentButtons.length).toBeGreaterThan(2);
      }
    });
  });

  describe('State Management Integration', () => {
    test('component state updates correctly without sharing state', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Trigger multiple state updates
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Multiple interactions
      fireEvent.click(likeButton);
      fireEvent.click(commentButton);
      fireEvent.click(refreshButton);

      // Verify state consistency
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'integration-post-1',
        'like'
      );
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('integration-post-1');
      expect(mockApiService.getAgentPosts).toHaveBeenCalledTimes(2);

      // Verify no sharing state updates
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('offline to online transition maintains non-sharing functionality', async () => {
      // Start in offline mode
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: false,
        fallback: true
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Fallback')).toBeInTheDocument();
      });

      // Like buttons should be disabled
      const likeButtons = screen.getAllByRole('button', { name: /like/i });
      expect(likeButtons[0]).toBeDisabled();

      // Transition to online
      mockApiService.checkDatabaseConnection.mockResolvedValue({
        connected: true,
        fallback: false
      });

      // Trigger connection check (simulated)
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Database')).toBeInTheDocument();
      });

      // Like buttons should be enabled again
      expect(likeButtons[0]).not.toBeDisabled();

      // Functionality should work
      fireEvent.click(likeButtons[0]);
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(
        'integration-post-1',
        'like'
      );

      // Still no sharing
      expect(screen.queryAllByRole('button', { name: /share/i })).toHaveLength(0);
    });
  });

  describe('Complete System Integration', () => {
    test('full system behavior verification without sharing', async () => {
      // Mock complete system response
      mockApiService.getAgentPosts.mockResolvedValue({
        success: true,
        posts: [
          createMockPost({ id: 'system-test-1', likes: 100, comments: 50, shares: 25 }),
        ]
      });

      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Verify system initialization
      expect(mockApiService.getAgentPosts).toHaveBeenCalled();
      expect(mockApiService.checkDatabaseConnection).toHaveBeenCalled();
      expect(mockWebSocketContext.subscribeFeed).toHaveBeenCalledWith('main');

      // Verify UI elements (without sharing)
      expect(screen.getByText('Test Agent Post')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /like/i })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: /comment/i })).toHaveLength(1);
      expect(screen.queryAllByRole('button', { name: /share/i })).toHaveLength(0);

      // Verify engagement system works
      const likeButton = screen.getByRole('button', { name: /like/i });
      fireEvent.click(likeButton);

      // Complete interaction verification
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('system-test-1', 'like');
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('system-test-1', 'add');

      // Final verification: no sharing in entire system
      const allApiCalls = mockApiService.updatePostEngagement.mock.calls;
      const shareCalls = allApiCalls.filter(call => call[1] === 'share');
      expect(shareCalls).toHaveLength(0);
    });
  });
});