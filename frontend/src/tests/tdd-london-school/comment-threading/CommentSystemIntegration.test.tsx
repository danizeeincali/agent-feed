/**
 * TDD London School: Comment System End-to-End Integration Tests
 * 
 * Focus: Complete workflow testing from user interaction to API response,
 * validating the entire comment threading and navigation system.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CommentThread, Comment } from '@/components/CommentThread';
import { CommentForm } from '@/components/CommentForm';
import { RealSocialMediaFeed } from '@/components/RealSocialMediaFeed';
import { apiService } from '@/services/api';

// Comprehensive mocking for integration testing
vi.mock('@/services/api', () => ({
  apiService: {
    createComment: vi.fn(),
    getPostComments: vi.fn(),
    getAgentPosts: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

vi.mock('@/utils/commentUtils', () => ({
  buildCommentTree: vi.fn((comments) => comments),
  extractMentions: vi.fn(() => []),
  extractHashtags: vi.fn(() => []),
}));

// Mock all DOM APIs for consistent testing
const mockScrollIntoView = vi.fn();
const mockWriteText = vi.fn();
const mockGetElementById = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  configurable: true,
});

Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  configurable: true,
});

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  configurable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  configurable: true,
});

// Mock window.location for URL testing
const mockLocation = {
  origin: 'https://test-app.com',
  pathname: '/feed',
  hash: '',
  href: 'https://test-app.com/feed',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  configurable: true,
});

describe('Comment System - TDD London School: Complete Integration', () => {
  const mockApiService = apiService as vi.Mocked<typeof apiService>;
  
  // Comprehensive test data factory
  const createCompleteComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: `comment-${Math.random().toString(36).substr(2, 9)}`,
    content: 'Comprehensive test comment with detailed analysis',
    author: 'test-author',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parentId: undefined,
    replies: [],
    repliesCount: 0,
    threadDepth: 0,
    threadPath: 'root',
    edited: false,
    editedAt: undefined,
    isDeleted: false,
    isEdited: false,
    isPinned: false,
    isModerated: false,
    editHistory: [],
    mentionedUsers: [],
    reportedCount: 0,
    moderatorNotes: undefined,
    authorType: 'user' as const,
    ...overrides,
  });

  const createThreadedStructure = (): Comment[] => {
    const rootComment = createCompleteComment({ 
      id: 'root-comment-123',
      content: 'Root level comment for threading test'
    });
    
    const level1Reply = createCompleteComment({
      id: 'level1-reply-456',
      parentId: 'root-comment-123',
      threadDepth: 1,
      content: 'First level reply with technical analysis'
    });
    
    const level2Reply = createCompleteComment({
      id: 'level2-reply-789',
      parentId: 'level1-reply-456',
      threadDepth: 2,
      content: 'Second level nested reply'
    });
    
    const level3Reply = createCompleteComment({
      id: 'level3-reply-abc',
      parentId: 'level2-reply-789',
      threadDepth: 3,
      content: 'Deep nested reply for hierarchy testing'
    });
    
    // Build the hierarchical structure
    level2Reply.replies = [level3Reply];
    level1Reply.replies = [level2Reply];
    rootComment.replies = [level1Reply];
    rootComment.repliesCount = 3;
    
    return [rootComment];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.hash = '';
  });

  describe('Complete Comment Threading Workflow', () => {
    it('should handle full comment creation and threading workflow', async () => {
      // Arrange: Mock API responses
      const newCommentResponse = {
        id: 'new-comment-xyz',
        success: true,
        comment: createCompleteComment({ id: 'new-comment-xyz' })
      };
      
      mockApiService.createComment.mockResolvedValue(newCommentResponse);
      const onCommentsUpdate = vi.fn();
      const initialComments = createThreadedStructure();
      
      // Act: Render full comment system
      render(
        <BrowserRouter>
          <CommentThread
            postId="integration-test-post"
            comments={initialComments}
            currentUser="integration-test-user"
            onCommentsUpdate={onCommentsUpdate}
            maxDepth={6}
            enableRealTime={true}
            showModeration={false}
          />
        </BrowserRouter>
      );
      
      // Assert: Initial structure rendered
      expect(screen.getByText('Root level comment for threading test')).toBeInTheDocument();
      expect(screen.getByText('First level reply with technical analysis')).toBeInTheDocument();
      
      // Act: Create new reply
      const replyButtons = screen.getAllByText('Reply');
      await userEvent.click(replyButtons[0]); // Reply to root comment
      
      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      await userEvent.type(replyTextarea, 'Integration test reply content');
      
      const postReplyButton = screen.getByText(/post reply/i);
      await userEvent.click(postReplyButton);
      
      // Assert: API contract fulfilled
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledWith(
          'integration-test-post',
          'Integration test reply content',
          expect.objectContaining({
            parentId: 'root-comment-123',
            author: 'integration-test-user'
          })
        );
      });
      
      expect(onCommentsUpdate).toHaveBeenCalled();
    });

    it('should handle complete navigation workflow with URL fragments', async () => {
      // Arrange: Set initial URL fragment
      mockLocation.hash = '#comment-level2-reply-789';
      const mockElement = document.createElement('div');
      mockElement.id = 'comment-level2-reply-789';
      mockGetElementById.mockReturnValue(mockElement);
      
      const comments = createThreadedStructure();
      
      // Act: Render with URL navigation
      render(
        <BrowserRouter>
          <CommentThread
            postId="navigation-test-post"
            comments={comments}
            currentUser="test-user"
          />
        </BrowserRouter>
      );
      
      // Assert: URL fragment processing
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith('comment-level2-reply-789');
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      });
      
      // Act: Navigate to parent
      const parentNavButton = screen.getByTitle('Go to parent');
      await userEvent.click(parentNavButton);
      
      // Assert: Parent navigation works
      expect(mockGetElementById).toHaveBeenCalledWith('comment-level1-reply-456');
    });

    it('should handle thread collapse/expand with state persistence', async () => {
      const comments = createThreadedStructure();
      
      const { rerender } = render(
        <CommentThread
          postId="state-test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Initially expanded - replies visible
      expect(screen.getByText('First level reply with technical analysis')).toBeInTheDocument();
      
      // Collapse thread
      const collapseButton = screen.getByText(/3 replies/);
      await userEvent.click(collapseButton);
      
      // Verify collapsed state
      const replyElement = document.getElementById('comment-level1-reply-456');
      await waitFor(() => {
        expect(replyElement).toHaveClass('opacity-0');
      });
      
      // Re-render component (state should persist)
      rerender(
        <CommentThread
          postId="state-test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // State should be maintained
      const persistedElement = document.getElementById('comment-level1-reply-456');
      expect(persistedElement).toHaveClass('opacity-0');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should gracefully handle API failures during comment creation', async () => {
      // Arrange: API failure scenario
      const apiError = new Error('Network connection failed');
      mockApiService.createComment.mockRejectedValue(apiError);
      
      render(
        <CommentForm
          postId="error-test-post"
          currentUser="test-user"
        />
      );
      
      // Act: Attempt to create comment
      const textarea = screen.getByPlaceholderText(/provide technical analysis/i);
      const submitButton = screen.getByText(/post analysis/i);
      
      await userEvent.type(textarea, 'Test error handling');
      await userEvent.click(submitButton);
      
      // Assert: Error handled gracefully
      await waitFor(() => {
        expect(screen.getByText(/failed to post technical analysis/i)).toBeInTheDocument();
      });
      
      // Form should remain accessible
      expect(textarea).toHaveValue('Test error handling');
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle malformed comment data without crashing', () => {
      // Arrange: Malformed data
      const malformedComments = [
        { id: 'malformed-1' }, // Missing required fields
        null, // Null comment
        undefined, // Undefined comment
        createCompleteComment({ content: null as any }) // Invalid content
      ].filter(Boolean) as Comment[];
      
      // Act & Assert: Should not crash
      expect(() => {
        render(
          <CommentThread
            postId="malformed-test-post"
            comments={malformedComments}
            currentUser="test-user"
          />
        );
      }).not.toThrow();
    });

    it('should handle deep nesting beyond maximum depth', () => {
      // Arrange: Extremely deep nesting
      const createDeepStructure = (depth: number): Comment => {
        if (depth === 0) {
          return createCompleteComment({ 
            id: `deep-${depth}`,
            content: `Deep comment at level ${depth}`
          });
        }
        
        const child = createDeepStructure(depth - 1);
        const parent = createCompleteComment({
          id: `deep-${depth}`,
          content: `Deep comment at level ${depth}`,
          threadDepth: depth,
          replies: [child],
          repliesCount: 1
        });
        
        child.parentId = parent.id;
        return parent;
      };
      
      const deepComment = createDeepStructure(10); // Beyond typical max depth
      
      render(
        <CommentThread
          postId="deep-test-post"
          comments={[deepComment]}
          currentUser="test-user"
          maxDepth={6}
        />
      );
      
      // Should render up to max depth
      expect(screen.getByText('Deep comment at level 10')).toBeInTheDocument();
      
      // Should show depth limitation indicators
      expect(screen.getByText(/more replies/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should properly cleanup resources on component unmount', () => {
      // Act: Mount and unmount component
      const { unmount } = render(
        <CommentThread
          postId="cleanup-test-post"
          comments={createThreadedStructure()}
          currentUser="test-user"
          enableRealTime={true}
        />
      );
      
      // Verify event listeners setup
      expect(mockApiService.on).toHaveBeenCalledWith(
        'posts_updated',
        expect.any(Function)
      );
      
      // Unmount
      unmount();
      
      // Verify cleanup
      expect(mockApiService.off).toHaveBeenCalledWith(
        'posts_updated',
        expect.any(Function)
      );
    });

    it('should handle large comment threads efficiently', () => {
      // Arrange: Large comment structure
      const createLargeStructure = (): Comment[] => {
        const root = createCompleteComment({ id: 'large-root' });
        const children: Comment[] = [];
        
        // Create 100 direct replies
        for (let i = 0; i < 100; i++) {
          children.push(createCompleteComment({
            id: `large-child-${i}`,
            parentId: 'large-root',
            threadDepth: 1
          }));
        }
        
        root.replies = children;
        root.repliesCount = children.length;
        
        return [root];
      };
      
      const largeComments = createLargeStructure();
      
      // Act & Assert: Should render without performance issues
      const startTime = performance.now();
      
      render(
        <CommentThread
          postId="large-test-post"
          comments={largeComments}
          currentUser="test-user"
        />
      );
      
      const renderTime = performance.now() - startTime;
      
      // Should render within reasonable time (2 seconds max for large structure)
      expect(renderTime).toBeLessThan(2000);
      
      // Should display count correctly
      expect(screen.getByText(/100 replies/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide complete keyboard navigation support', async () => {
      const comments = createThreadedStructure();
      
      render(
        <CommentThread
          postId="a11y-test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Test tab navigation
      const replyButton = screen.getAllByText('Reply')[0];
      replyButton.focus();
      
      expect(replyButton).toHaveFocus();
      
      // Test Enter key activation
      await userEvent.keyboard('{Enter}');
      
      // Reply form should appear
      expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
      
      // Test Escape to cancel
      await userEvent.keyboard('{Escape}');
      
      // Form should disappear
      expect(screen.queryByPlaceholderText(/write a reply/i)).not.toBeInTheDocument();
    });

    it('should provide proper screen reader support for hierarchical structure', () => {
      const comments = createThreadedStructure();
      
      render(
        <CommentThread
          postId="screen-reader-test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Check for proper ARIA labels
      expect(screen.getByLabelText(/expand post/i)).toBeInTheDocument();
      
      // Check for depth indicators
      expect(screen.getByText('L1')).toBeInTheDocument();
      expect(screen.getByText('L2')).toBeInTheDocument();
      expect(screen.getByText('L3')).toBeInTheDocument();
      
      // Check for navigation helpers
      expect(screen.getByTitle('Go to parent')).toBeInTheDocument();
      expect(screen.getByTitle('Next sibling')).toBeInTheDocument();
      expect(screen.getByTitle('Previous sibling')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates and WebSocket Integration', () => {
    it('should handle real-time comment updates correctly', async () => {
      let updateHandler: Function;
      mockApiService.on.mockImplementation((event, handler) => {
        if (event === 'posts_updated') {
          updateHandler = handler;
        }
      });
      
      const initialComments = createThreadedStructure();
      const onCommentsUpdate = vi.fn();
      
      render(
        <CommentThread
          postId="realtime-test-post"
          comments={initialComments}
          currentUser="test-user"
          onCommentsUpdate={onCommentsUpdate}
          enableRealTime={true}
        />
      );
      
      // Simulate real-time update
      const updatedComment = createCompleteComment({
        id: 'realtime-comment',
        content: 'Real-time updated content'
      });
      
      // Trigger the update handler
      updateHandler!(updatedComment);
      
      // Should trigger comments update
      expect(onCommentsUpdate).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    // Clean up any remaining state
    vi.clearAllMocks();
  });
});
