/**
 * TDD Red Phase Tests for Sharing Functionality Removal
 * 
 * These tests validate that sharing functionality is completely removed while maintaining
 * all other functionality (like, comment, engagement).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SocialMediaFeed from '../frontend/src/components/SocialMediaFeed';
import { WebSocketContext } from '../frontend/src/context/WebSocketContext';
import { apiService } from '../frontend/src/services/api';

// Mock the API service
jest.mock('../frontend/src/services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    updatePostEngagement: jest.fn(),
    searchPosts: jest.fn(),
    checkDatabaseConnection: jest.fn(),
    getFeedStats: jest.fn(),
  }
}));

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: true,
  on: jest.fn(),
  off: jest.fn(),
  subscribeFeed: jest.fn(),
  unsubscribeFeed: jest.fn(),
  subscribePost: jest.fn(),
  sendLike: jest.fn(),
  addNotification: jest.fn(),
};

// Sample post data with sharing properties (should be removed)
const mockPostWithSharing = {
  id: 'post-1',
  title: 'Test Post',
  content: 'This is a test post content',
  authorAgent: 'test-agent',
  publishedAt: '2024-01-01T00:00:00Z',
  metadata: {
    businessImpact: 7,
    tags: ['test', 'sharing'],
    isAgentResponse: true,
  },
  likes: 5,
  comments: 3,
  shares: 2, // This should be removed
};

const mockPosts = [mockPostWithSharing];

const renderSocialMediaFeed = (props = {}) => {
  return render(
    <WebSocketContext.Provider value={mockWebSocketContext}>
      <SocialMediaFeed {...props} />
    </WebSocketContext.Provider>
  );
};

describe('Sharing Functionality Removal Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
      success: true,
      posts: mockPosts,
    });
    
    (apiService.checkDatabaseConnection as jest.Mock).mockResolvedValue({
      connected: true,
      fallback: false,
    });
    
    (apiService.updatePostEngagement as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  describe('UI Elements Removal', () => {
    it('should not display sharing buttons in post actions', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Should NOT have sharing button
      expect(screen.queryByTitle('Share this post')).not.toBeInTheDocument();
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
      
      // Should still have like and comment buttons
      expect(screen.getByTitle('Like this post')).toBeInTheDocument();
      expect(screen.getByTitle('View comments')).toBeInTheDocument();
    });

    it('should not display sharing count in post metadata', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Should not display shares count
      expect(screen.queryByText('2')).not.toBeInTheDocument(); // shares count
      
      // Should still display likes and comments counts
      expect(screen.getByText('5')).toBeInTheDocument(); // likes count
      expect(screen.getByText('3')).toBeInTheDocument(); // comments count
    });

    it('should not have Share2 icon imported or used', () => {
      // This test checks that Share2 icon is not imported
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      expect(componentSource).not.toMatch(/Share2/);
      expect(componentSource).not.toMatch(/share/i);
    });
  });

  describe('State Management Removal', () => {
    it('should not have sharing-related state variables', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not have sharing state
      expect(componentSource).not.toMatch(/sharing/i);
      expect(componentSource).not.toMatch(/shares.*useState/);
    });

    it('should not have sharing event handlers', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not have sharing handlers
      expect(componentSource).not.toMatch(/handleSharePost/);
      expect(componentSource).not.toMatch(/onShare/);
    });
  });

  describe('API Integration Removal', () => {
    it('should not make sharing API calls', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Verify no sharing API calls are made
      expect(apiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    it('should not have sharing endpoints in API service', () => {
      const apiSource = require('fs').readFileSync(
        '../frontend/src/services/api.ts',
        'utf-8'
      );
      
      // Check that sharing is not in API calls
      expect(apiSource).not.toMatch(/share.*endpoint/i);
    });
  });

  describe('TypeScript Interface Updates', () => {
    it('should not have shares property in AgentPost interface', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not have shares property in interface
      expect(componentSource).not.toMatch(/shares\?\s*:\s*number/);
    });
  });

  describe('Functionality Preservation', () => {
    it('should still handle like interactions correctly', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like this post');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(apiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
      });
    });

    it('should still handle comment interactions correctly', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      const commentButton = screen.getByTitle('View comments');
      fireEvent.click(commentButton);

      // Should still subscribe to post for comments
      expect(mockWebSocketContext.subscribePost).toHaveBeenCalledWith('post-1');
    });

    it('should maintain post creation functionality', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Post creator should still be available
      expect(screen.getByText('Start a post...')).toBeInTheDocument();
    });

    it('should maintain filtering and sorting functionality', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Filter dropdown should still work
      const filterSelect = screen.getByDisplayValue('All Posts');
      expect(filterSelect).toBeInTheDocument();
      
      // Sort dropdown should still work
      const sortSelect = screen.getByDisplayValue('Newest First');
      expect(sortSelect).toBeInTheDocument();
    });

    it('should maintain search functionality', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Search button should still work
      const searchButton = screen.getByTitle('Search posts');
      fireEvent.click(searchButton);

      expect(screen.getByPlaceholderText('Search posts by title, content, or author...')).toBeInTheDocument();
    });

    it('should maintain responsive design without sharing elements', async () => {
      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Post actions should still be properly styled
      const postActions = document.querySelector('[data-testid="post-actions"]') || 
                         document.querySelector('.flex.items-center.justify-between');
      
      if (postActions) {
        // Should have proper spacing without share button
        expect(postActions).toHaveClass('flex', 'items-center');
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should not have unused sharing imports affecting bundle size', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not import sharing-related utilities
      expect(componentSource).not.toMatch(/import.*sharing/i);
      expect(componentSource).not.toMatch(/import.*Share/);
    });

    it('should not have sharing-related event listeners', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not have sharing event listeners
      expect(componentSource).not.toMatch(/addEventListener.*share/i);
      expect(componentSource).not.toMatch(/on.*share/i);
    });
  });

  describe('Backend Integration', () => {
    it('should not have sharing routes in backend', () => {
      const backendSource = require('fs').readFileSync(
        '../simple-backend.js',
        'utf-8'
      );
      
      // Should not have sharing-specific endpoints
      expect(backendSource).not.toMatch(/\/.*share.*\/.*post/i);
      expect(backendSource).not.toMatch(/router.*share/i);
    });

    it('should handle engagement updates without sharing', async () => {
      (apiService.updatePostEngagement as jest.Mock).mockResolvedValue({
        success: true,
      });

      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like this post');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(apiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
        expect(apiService.updatePostEngagement).not.toHaveBeenCalledWith('post-1', 'share');
      });
    });
  });

  describe('Error Handling', () => {
    it('should not have sharing-related error handling', () => {
      const componentSource = require('fs').readFileSync(
        '../frontend/src/components/SocialMediaFeed.tsx',
        'utf-8'
      );
      
      // Should not have sharing error handling
      expect(componentSource).not.toMatch(/catch.*share/i);
      expect(componentSource).not.toMatch(/error.*share/i);
    });

    it('should maintain like/comment error handling', async () => {
      (apiService.updatePostEngagement as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderSocialMediaFeed();
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like this post');
      fireEvent.click(likeButton);

      // Should handle errors gracefully for remaining functionality
      await waitFor(() => {
        expect(apiService.updatePostEngagement).toHaveBeenCalledWith('post-1', 'like');
      });
    });
  });
});

/**
 * Integration Tests for Sharing Removal
 */
describe('Sharing Removal Integration Tests', () => {
  it('should render complete feed without sharing functionality', async () => {
    const mockApiResponse = {
      success: true,
      posts: [
        {
          id: 'post-1',
          title: 'Integration Test Post',
          content: 'Testing integration without sharing',
          authorAgent: 'test-agent',
          publishedAt: '2024-01-01T00:00:00Z',
          metadata: {
            businessImpact: 6,
            tags: ['integration'],
            isAgentResponse: true,
          },
          likes: 10,
          comments: 5,
          // shares: 3, // This should be ignored/removed
        }
      ],
    };

    (apiService.getAgentPosts as jest.Mock).mockResolvedValue(mockApiResponse);

    renderSocialMediaFeed();

    await waitFor(() => {
      expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
    });

    // Verify only like and comment actions are present
    expect(screen.getByText('10')).toBeInTheDocument(); // likes
    expect(screen.getByText('5')).toBeInTheDocument(); // comments
    expect(screen.queryByText('3')).not.toBeInTheDocument(); // shares should not appear

    // Verify no sharing buttons
    expect(screen.queryByTitle('Share this post')).not.toBeInTheDocument();
  });

  it('should handle real-time updates without sharing events', async () => {
    renderSocialMediaFeed();

    // Simulate WebSocket events for likes and comments (but not shares)
    const handleLikeUpdated = mockWebSocketContext.on.mock.calls
      .find(([event]) => event === 'like:updated')?.[1];
    
    const handleCommentCreated = mockWebSocketContext.on.mock.calls
      .find(([event]) => event === 'comment:created')?.[1];

    expect(handleLikeUpdated).toBeDefined();
    expect(handleCommentCreated).toBeDefined();

    // Should not have share event handlers
    const handleShareUpdated = mockWebSocketContext.on.mock.calls
      .find(([event]) => event === 'share:updated')?.[1];
    
    expect(handleShareUpdated).toBeUndefined();
  });
});