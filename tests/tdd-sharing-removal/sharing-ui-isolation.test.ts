/**
 * TDD London School - UI Component Isolation Tests
 * 
 * Focus on testing the UI rendering behavior in isolation
 * Mock all external dependencies and verify UI interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialMediaFeed from '../../frontend/src/components/SocialMediaFeed';
import { 
  createMockApiService, 
  createMockWebSocketContext,
  createMockPost 
} from './mock-contracts';

// Comprehensive mocking setup
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

describe('Sharing UI Isolation Tests (London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      posts: [
        createMockPost({ id: 'post-1', shares: 5 }),
        createMockPost({ id: 'post-2', shares: 12, likes: 8, comments: 3 }),
      ]
    });
    
    mockApiService.checkDatabaseConnection.mockResolvedValue({
      connected: true,
      fallback: false
    });
  });

  describe('Current State - WITH Sharing UI Elements', () => {
    test('should render Share2 icons from lucide-react', async () => {
      render(<SocialMediaFeed />);
      
      // Wait for posts to load
      await screen.findByText('Test Agent Post');

      // Share2 icon should be present (from lucide-react import)
      const shareElements = screen.getAllByTestId('share-icon') || 
                           screen.getAllByRole('button', { name: /share/i });
      
      expect(shareElements.length).toBeGreaterThan(0);
    });

    test('should display share counts in post actions', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Should show share counts
      expect(screen.getByText('5')).toBeInTheDocument(); // First post shares
      expect(screen.getByText('12')).toBeInTheDocument(); // Second post shares
    });

    test('should have handleSharePost function called on share button click', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApiService.updatePostEngagement.mockResolvedValue({ success: true });

      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Click share button
      const shareButtons = screen.getAllByRole('button', { name: /share/i });
      fireEvent.click(shareButtons[0]);

      // Verify API call
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'share');

      consoleSpy.mockRestore();
    });
  });

  describe('Target State - WITHOUT Sharing UI Elements', () => {
    test('should NOT import Share2 from lucide-react', () => {
      // This test verifies that Share2 import is removed
      // We'll check this by ensuring no share-related icons exist
      
      render(<SocialMediaFeed />);
      
      // After sharing removal, these should not exist
      expect(screen.queryByTestId('share-icon')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('button', { name: /share/i })).toHaveLength(0);
    });

    test('should NOT display shares property in post actions', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Like and comment counts should still be visible
      expect(screen.getByText('0')).toBeInTheDocument(); // Default likes
      expect(screen.getByText('0')).toBeInTheDocument(); // Default comments

      // Share counts should NOT be displayed
      expect(screen.queryByTestId('share-count')).not.toBeInTheDocument();
    });

    test('should NOT have handleSharePost function', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Try to trigger any share-related functionality
      const allButtons = screen.getAllByRole('button');
      
      allButtons.forEach(button => {
        if (button.textContent?.toLowerCase().includes('share')) {
          fireEvent.click(button);
        }
      });

      // No share API calls should be made
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('should remove shares field from AgentPost interface usage', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Verify that only likes and comments are shown in UI
      const engagementButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.match(/\d+/) // Buttons with numeric content
      );

      // Should only have like and comment buttons, no share buttons
      engagementButtons.forEach(button => {
        expect(button.textContent).not.toContain('share');
        expect(button.getAttribute('title')).not.toContain('share');
      });
    });
  });

  describe('UI Interaction Behavior Verification', () => {
    test('should verify like button interactions remain functional', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Find and click like button
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Verify like interactions still work
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('post-1', 'add');
    });

    test('should verify comment button interactions remain functional', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Find and click comment button
      const commentButton = screen.getAllByRole('button', { name: /comment/i })[0];
      fireEvent.click(commentButton);

      // Verify comment interactions still work
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('post-1');
    });

    test('should verify post actions section layout without sharing', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Post actions should contain only like and comment buttons
      const postActionsContainer = screen.getAllByRole('button').filter(button =>
        button.closest('[class*="border-t"]') // Post actions are in border-t container
      );

      // Count engagement buttons (like, comment, but NOT share)
      const engagementButtons = postActionsContainer.filter(button =>
        button.textContent?.includes('♥') || 
        button.textContent?.includes('💬') ||
        button.getAttribute('title')?.includes('like') ||
        button.getAttribute('title')?.includes('comment')
      );

      expect(engagementButtons.length).toBe(4); // 2 posts × 2 buttons each (like + comment)
    });

    test('should maintain proper spacing and layout without share button', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Verify the flex layout still works with only 2 buttons instead of 3
      const postActions = screen.getAllByRole('button').filter(button =>
        button.closest('.flex.items-center.space-x-6')
      );

      // Should have proper spacing between like and comment buttons
      expect(postActions.length).toBe(4); // 2 posts × 2 engagement buttons
    });
  });

  describe('Mock Interaction Verification (London School Core)', () => {
    test('should verify all mocks are properly configured', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Verify API service mock interactions
      expect(mockApiService.getAgentPosts).toHaveBeenCalled();
      expect(mockApiService.checkDatabaseConnection).toHaveBeenCalled();

      // Verify WebSocket context mock interactions
      expect(mockWebSocketContext.subscribeFeed).toHaveBeenCalledWith('main');
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('post-1');
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('post-2');
    });

    test('should verify mock contracts for engagement actions', async () => {
      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      // Test like engagement contract
      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('post-1', 'add');

      // Verify share engagement is NOT in the contract
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String), 
        'share'
      );
    });

    test('should verify error handling contracts', async () => {
      // Mock API error for likes
      mockApiService.updatePostEngagement.mockRejectedValueOnce(new Error('Network error'));

      render(<SocialMediaFeed />);
      
      await screen.findByText('Test Agent Post');

      const likeButton = screen.getAllByRole('button', { name: /like/i })[0];
      fireEvent.click(likeButton);

      // Should attempt the call and handle error
      expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
      
      // Should NOT attempt any share calls even in error scenarios
      expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });
  });
});