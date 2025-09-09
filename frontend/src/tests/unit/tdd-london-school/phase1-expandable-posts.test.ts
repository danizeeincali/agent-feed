/**
 * TDD London School Phase 1: Expandable Post Details
 * 
 * Focus: Outside-in TDD with mock-driven development
 * Behavior verification over state testing
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocialMediaFeed } from '../../src/components/SocialMediaFeed';
import { ExpandablePost } from '../../src/components/ExpandablePost';
import { PostDetailsModal } from '../../src/components/PostDetailsModal';

// Mock external dependencies (London School approach)
const mockApiService = {
  getAgentPosts: jest.fn(),
  getPostDetails: jest.fn(),
  checkDatabaseConnection: jest.fn(),
  updatePostEngagement: jest.fn(),
  searchPosts: jest.fn()
};

const mockWebSocketContext = {
  isConnected: true,
  on: jest.fn(),
  off: jest.fn(),
  subscribeFeed: jest.fn(),
  unsubscribeFeed: jest.fn(),
  subscribePost: jest.fn(),
  sendLike: jest.fn(),
  addNotification: jest.fn()
};

const mockDebounce = jest.fn((value, delay) => value);

// Mock implementations
jest.mock('../../src/services/api', () => ({
  apiService: mockApiService
}));

jest.mock('../../src/context/WebSocketContext', () => ({
  useWebSocketContext: () => mockWebSocketContext
}));

jest.mock('../../src/hooks/useDebounce', () => ({
  useDebounce: mockDebounce
}));

describe('TDD London School: Expandable Post Details', () => {
  const mockPost = {
    id: 'post-123',
    title: 'Test Post Title',
    content: 'This is a test post content that should be expandable when clicked.',
    authorAgent: 'test-agent',
    publishedAt: '2023-12-01T10:00:00Z',
    metadata: {
      businessImpact: 7,
      tags: ['testing', 'tdd'],
      isAgentResponse: true
    },
    likes: 5,
    comments: 2
  };

  const mockDetailedPost = {
    ...mockPost,
    fullContent: 'This is the full detailed content with more information...',
    engagementHistory: [
      { type: 'like', timestamp: '2023-12-01T11:00:00Z', userId: 'user1' },
      { type: 'comment', timestamp: '2023-12-01T12:00:00Z', userId: 'user2' }
    ],
    relatedPosts: [],
    metrics: {
      views: 45,
      clickThrough: 0.12,
      timeSpent: 120
    }
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementations
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: [mockPost]
    });
    
    mockApiService.checkDatabaseConnection.mockResolvedValue({
      connected: true,
      fallback: false
    });
    
    mockApiService.getPostDetails.mockResolvedValue({
      success: true,
      data: mockDetailedPost
    });
  });

  describe('Contract Definition: Expandable Post Behavior', () => {
    it('should define contract for expandable post interaction', async () => {
      // FAIL: This test should fail initially as ExpandablePost doesn't exist
      render(<ExpandablePost post={mockPost} onExpand={jest.fn()} />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      expect(expandButton).toBeInTheDocument();
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should expand post when clicked and show detailed content', async () => {
      const mockOnExpand = jest.fn();
      
      // FAIL: Component doesn't exist yet
      render(<ExpandablePost post={mockPost} onExpand={mockOnExpand} />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      // Verify interaction contract
      expect(mockOnExpand).toHaveBeenCalledWith(mockPost.id);
      expect(mockOnExpand).toHaveBeenCalledTimes(1);
    });

    it('should verify collaboration with API service for detailed content', async () => {
      const mockOnExpand = jest.fn();
      
      render(<ExpandablePost post={mockPost} onExpand={mockOnExpand} />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      // Verify API collaboration
      await waitFor(() => {
        expect(mockApiService.getPostDetails).toHaveBeenCalledWith(mockPost.id);
      });
    });
  });

  describe('Outside-in TDD: User Workflow', () => {
    it('should handle complete expand-collapse workflow', async () => {
      const mockOnCollapse = jest.fn();
      
      render(<ExpandablePost 
        post={mockPost} 
        expanded={true}
        onCollapse={mockOnCollapse}
        detailedContent={mockDetailedPost}
      />);
      
      // Should show detailed content when expanded
      expect(screen.getByText(mockDetailedPost.fullContent)).toBeInTheDocument();
      expect(screen.getByTestId('post-metrics')).toBeInTheDocument();
      
      // Should have collapse button
      const collapseButton = screen.getByTestId('collapse-post-button');
      fireEvent.click(collapseButton);
      
      expect(mockOnCollapse).toHaveBeenCalledWith(mockPost.id);
    });

    it('should show loading state during content fetch', async () => {
      // Make API call slow to test loading state
      mockApiService.getPostDetails.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: mockDetailedPost
        }), 100))
      );
      
      const mockOnExpand = jest.fn();
      render(<ExpandablePost post={mockPost} onExpand={mockOnExpand} />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      // Should show loading state immediately
      expect(screen.getByTestId('post-loading-spinner')).toBeInTheDocument();
      
      // Should hide loading after content loads
      await waitFor(() => {
        expect(screen.queryByTestId('post-loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiService.getPostDetails.mockRejectedValue(new Error('API Error'));
      
      const mockOnExpand = jest.fn();
      const mockOnError = jest.fn();
      
      render(<ExpandablePost 
        post={mockPost} 
        onExpand={mockOnExpand}
        onError={mockOnError}
      />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to load post details');
      });
      
      expect(screen.getByText('Failed to load post details')).toBeInTheDocument();
    });
  });

  describe('Mock Verification: Interaction Patterns', () => {
    it('should verify proper event sequence for expansion', async () => {
      const mockOnExpand = jest.fn();
      const mockOnLoadingStart = jest.fn();
      const mockOnLoadingEnd = jest.fn();
      
      render(<ExpandablePost 
        post={mockPost}
        onExpand={mockOnExpand}
        onLoadingStart={mockOnLoadingStart}
        onLoadingEnd={mockOnLoadingEnd}
      />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      // Verify event sequence
      expect(mockOnExpand).toHaveBeenCalledBefore(mockOnLoadingStart);
      expect(mockOnLoadingStart).toHaveBeenCalledBefore(mockApiService.getPostDetails);
      
      await waitFor(() => {
        expect(mockOnLoadingEnd).toHaveBeenCalled();
      });
    });

    it('should track user engagement metrics', async () => {
      const mockTracker = {
        trackPostExpansion: jest.fn(),
        trackTimeSpent: jest.fn(),
        trackInteraction: jest.fn()
      };
      
      render(<ExpandablePost 
        post={mockPost}
        onExpand={jest.fn()}
        engagementTracker={mockTracker}
      />);
      
      const expandButton = screen.getByTestId('expand-post-button');
      fireEvent.click(expandButton);
      
      expect(mockTracker.trackPostExpansion).toHaveBeenCalledWith({
        postId: mockPost.id,
        authorAgent: mockPost.authorAgent,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Integration: Feed Component Collaboration', () => {
    it('should integrate expandable posts in social media feed', async () => {
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(mockPost.title)).toBeInTheDocument();
      });
      
      // Find expand button within the post
      const postElement = screen.getByTestId(`post-${mockPost.id}`);
      const expandButton = postElement.querySelector('[data-testid="expand-post-button"]');
      
      fireEvent.click(expandButton);
      
      // Should call API for details
      await waitFor(() => {
        expect(mockApiService.getPostDetails).toHaveBeenCalledWith(mockPost.id);
      });
    });

    it('should handle multiple expanded posts simultaneously', async () => {
      const secondPost = { ...mockPost, id: 'post-456', title: 'Second Post' };
      
      mockApiService.getAgentPosts.mockResolvedValue({
        success: true,
        data: [mockPost, secondPost]
      });
      
      render(<SocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(mockPost.title)).toBeInTheDocument();
        expect(screen.getByText(secondPost.title)).toBeInTheDocument();
      });
      
      // Expand both posts
      const firstExpandButton = screen.getByTestId(`expand-button-${mockPost.id}`);
      const secondExpandButton = screen.getByTestId(`expand-button-${secondPost.id}`);
      
      fireEvent.click(firstExpandButton);
      fireEvent.click(secondExpandButton);
      
      // Should make API calls for both
      expect(mockApiService.getPostDetails).toHaveBeenCalledWith(mockPost.id);
      expect(mockApiService.getPostDetails).toHaveBeenCalledWith(secondPost.id);
      expect(mockApiService.getPostDetails).toHaveBeenCalledTimes(2);
    });
  });

  describe('Modal Component Collaboration', () => {
    it('should open post details in modal when expand action triggers', async () => {
      const mockOnOpen = jest.fn();
      const mockOnClose = jest.fn();
      
      render(<PostDetailsModal 
        isOpen={false}
        post={mockDetailedPost}
        onOpen={mockOnOpen}
        onClose={mockOnClose}
      />);
      
      // Modal should not be visible initially
      expect(screen.queryByTestId('post-details-modal')).not.toBeInTheDocument();
      
      // When opened
      render(<PostDetailsModal 
        isOpen={true}
        post={mockDetailedPost}
        onOpen={mockOnOpen}
        onClose={mockOnClose}
      />);
      
      expect(screen.getByTestId('post-details-modal')).toBeInTheDocument();
      expect(screen.getByText(mockDetailedPost.fullContent)).toBeInTheDocument();
    });

    it('should handle modal close interaction', async () => {
      const mockOnClose = jest.fn();
      
      render(<PostDetailsModal 
        isOpen={true}
        post={mockDetailedPost}
        onClose={mockOnClose}
      />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle escape key to close modal', async () => {
      const mockOnClose = jest.fn();
      
      render(<PostDetailsModal 
        isOpen={true}
        post={mockDetailedPost}
        onClose={mockOnClose}
      />);
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});