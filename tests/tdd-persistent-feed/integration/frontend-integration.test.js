/**
 * London School TDD: Frontend Integration Tests
 * Testing React component behavior with persistent data
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SocialMediaFeed from '../../../frontend/src/components/SocialMediaFeed';
import { WebSocketProvider } from '../../../frontend/src/context/WebSocketContext';

// Mock all external dependencies
jest.mock('../../../frontend/src/context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }) => children,
  useWebSocketContext: jest.fn()
}));

jest.mock('../../../frontend/src/components/PostCreator', () => {
  return function MockPostCreator({ onPostCreated, className }) {
    return (
      <div data-testid="post-creator" className={className}>
        <button 
          onClick={() => onPostCreated(createMockPost({ id: 'new-post' }))}
          data-testid="create-post-button"
        >
          Create Post
        </button>
      </div>
    );
  };
});

// Import test utilities
const { createMockPost, createPostCollection } = require('../fixtures/test-data');
const { useWebSocketContext } = require('../../../frontend/src/context/WebSocketContext');

describe('Frontend Integration - Persistent Feed', () => {
  let mockWebSocketContext;
  let mockFetch;
  let queryClient;
  
  beforeEach(() => {
    // Mock WebSocket context
    mockWebSocketContext = {
      isConnected: true,
      on: jest.fn(),
      off: jest.fn(),
      subscribeFeed: jest.fn(),
      unsubscribeFeed: jest.fn(),
      subscribePost: jest.fn(),
      sendLike: jest.fn(),
      addNotification: jest.fn()
    };
    
    useWebSocketContext.mockReturnValue(mockWebSocketContext);
    
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          staleTime: 0
        }
      }
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    global.fetch.mockRestore?.();
  });
  
  // Test wrapper component
  const TestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
  
  describe('Feed Loading and Display', () => {
    it('should load and display posts from persistent storage', async () => {
      // Arrange - Mock API response
      const mockPosts = createPostCollection(3);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          posts: mockPosts
        })
      });
      
      // Act - Render component
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts');
      });
      
      // Assert - Verify posts are displayed
      await waitFor(() => {
        mockPosts.forEach(post => {
          expect(screen.getByText(post.title)).toBeInTheDocument();
        });
      });
      
      // Verify WebSocket subscription
      expect(mockWebSocketContext.subscribeFeed).toHaveBeenCalledWith('main');
    });
    
    it('should handle API errors gracefully with fallback UI', async () => {
      // Arrange - Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Database connection failed'
        })
      });
      
      // Act
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(screen.getByText(/unable to load feed/i)).toBeInTheDocument();
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
      
      // Verify retry functionality
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
    
    it('should show loading state during data fetch', async () => {
      // Arrange - Mock slow API response
      let resolvePromise;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValue(slowPromise);
      
      // Act
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Verify loading state
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
      
      // Resolve the promise and verify loading disappears
      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ success: true, posts: [] })
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });
    });
  });
  
  describe('Real-time Updates', () => {
    it('should update feed when new posts arrive via WebSocket', async () => {
      // Arrange - Initial posts
      const initialPosts = createPostCollection(2);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          posts: initialPosts
        })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(initialPosts[0].title)).toBeInTheDocument();
      });
      
      // Act - Simulate WebSocket event for new post
      const newPost = createMockPost({ id: 'new-post', title: 'Real-time Post' });
      const postCreatedHandler = mockWebSocketContext.on.mock.calls
        .find(call => call[0] === 'post:created')?.[1];
      
      expect(postCreatedHandler).toBeDefined();
      postCreatedHandler(newPost);
      
      // Assert - Verify new post appears
      await waitFor(() => {
        expect(screen.getByText('Real-time Post')).toBeInTheDocument();
      });
      
      // Verify notification was added
      expect(mockWebSocketContext.addNotification).toHaveBeenCalledWith({
        type: 'info',
        title: 'New Post',
        message: expect.stringContaining(newPost.authorAgent),
        read: false
      });
    });
    
    it('should update engagement metrics in real-time', async () => {
      // Arrange - Posts with initial engagement
      const posts = [createMockPost({ id: 'post-1', likes: 5 })];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, posts })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Initial like count
      });
      
      // Act - Simulate like update via WebSocket
      const likeUpdateHandler = mockWebSocketContext.on.mock.calls
        .find(call => call[0] === 'like:updated')?.[1];
      
      likeUpdateHandler({
        postId: 'post-1',
        action: 'add'
      });
      
      // Assert - Verify like count updated
      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
      });
    });
    
    it('should handle WebSocket disconnection gracefully', async () => {
      // Arrange - Start with connected state
      const posts = createPostCollection(1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, posts })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(posts[0].title)).toBeInTheDocument();
      });
      
      // Act - Simulate WebSocket disconnection
      mockWebSocketContext.isConnected = false;
      
      // Rerender with disconnected state
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Verify offline indicators appear
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.getByText(/real-time features unavailable/i)).toBeInTheDocument();
      });
      
      // Verify like button is disabled
      const likeButton = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('title')?.includes('Offline')
      );
      expect(likeButton).toHaveAttribute('disabled');
    });
  });
  
  describe('User Interactions', () => {
    it('should handle post creation through UI', async () => {
      // Arrange - Mock successful post creation
      mockFetch
        .mockResolvedValueOnce({ // Initial load
          ok: true,
          json: () => Promise.resolve({ success: true, posts: [] })
        })
        .mockResolvedValueOnce({ // Post creation
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            success: true,
            post: createMockPost({ id: 'created-post', title: 'User Created Post' })
          })
        })
        .mockResolvedValueOnce({ // Refresh after creation
          ok: true,
          json: () => Promise.resolve({
            success: true,
            posts: [createMockPost({ id: 'created-post', title: 'User Created Post' })]
          })
        });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });
      
      // Act - Create a post
      const createButton = screen.getByTestId('create-post-button');
      fireEvent.click(createButton);
      
      // Assert - Verify post appears in feed
      await waitFor(() => {
        expect(screen.getByText('User Created Post')).toBeInTheDocument();
      });
    });
    
    it('should handle like interactions with optimistic updates', async () => {
      // Arrange - Post with likes
      const posts = [createMockPost({ id: 'likeable-post', likes: 10 })];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, posts })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
      
      // Act - Click like button
      const likeButton = screen.getByRole('button', { name: /heart/i });
      fireEvent.click(likeButton);
      
      // Assert - Verify optimistic update
      expect(screen.getByText('11')).toBeInTheDocument();
      
      // Verify WebSocket message sent
      expect(mockWebSocketContext.sendLike).toHaveBeenCalledWith('likeable-post', 'add');
    });
    
    it('should handle search functionality', async () => {
      // Arrange - Initial posts
      const allPosts = createPostCollection(5);
      const searchResults = allPosts.slice(0, 2);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, posts: allPosts })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, posts: searchResults })
        });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(5);
      });
      
      // Act - Perform search
      const searchInput = screen.getByPlaceholderText('Search posts...');
      await userEvent.type(searchInput, 'optimization');
      await userEvent.keyboard('{Enter}');
      
      // Assert - Verify search results
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(2);
      });
    });
  });
  
  describe('Performance and Optimization', () => {
    it('should implement virtual scrolling for large datasets', async () => {
      // Arrange - Large dataset
      const largePosts = createPostCollection(1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, posts: largePosts })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Verify only visible posts are rendered
      await waitFor(() => {
        const renderedPosts = screen.getAllByRole('article');
        // Should render less than total (virtual scrolling)
        expect(renderedPosts.length).toBeLessThan(largePosts.length);
        expect(renderedPosts.length).toBeGreaterThan(0);
      });
    });
    
    it('should cache API responses to reduce network calls', async () => {
      // Arrange
      const posts = createPostCollection(3);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, posts })
      });
      
      const { rerender } = render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Act - Rerender component
      rerender(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Should not make additional API call due to caching
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
      });
    });
  });
  
  describe('Error Handling and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      // Arrange - First call fails, second succeeds
      const posts = createPostCollection(2);
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, posts })
        });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Should show error state initially
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });
      
      // Act - Click retry
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      // Assert - Should recover and show posts
      await waitFor(() => {
        expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
        expect(screen.getByText(posts[0].title)).toBeInTheDocument();
      });
    });
    
    it('should handle malformed API responses gracefully', async () => {
      // Arrange - Malformed response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          // Missing required 'success' field
          data: 'malformed'
        })
      });
      
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );
      
      // Assert - Should handle gracefully and show error state
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });
    });
  });
});
