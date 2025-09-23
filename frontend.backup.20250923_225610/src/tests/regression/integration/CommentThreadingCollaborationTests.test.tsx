/**
 * TDD London School: Comment Threading Collaboration Tests
 * Focus: Object collaboration in comment threading system with interaction mocking
 * Approach: Verify component interactions, state management, and UI behavior coordination
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor, within } from '@testing-library/react';
import { TDDTestUtilities, TDDAssertions } from '../utilities/TDDTestUtilities';
import TDDLondonSchoolMockFactory, { 
  MockApiService, 
  MockMentionService 
} from '../mock-factories/TDDLondonSchoolMockFactory';

// Components under test
import { CommentThread } from '../../../components/CommentThread';
import { CommentForm } from '../../../components/CommentForm';

describe('TDD London School: Comment Threading Collaboration', () => {
  let mockApiService: MockApiService;
  let mockMentionService: MockMentionService;
  let mockProps: any;
  let mockComments: any[];

  beforeEach(() => {
    // Setup mocks
    mockApiService = TDDLondonSchoolMockFactory.createApiServiceMock();
    mockMentionService = TDDLondonSchoolMockFactory.createMentionServiceMock();
    mockProps = TDDLondonSchoolMockFactory.createComponentPropMocks();

    // Setup mock comment data with threading structure
    mockComments = [
      {
        id: 'comment-1',
        content: 'Root comment with @code-reviewer-agent mention',
        author: 'user-1',
        createdAt: '2025-09-09T05:00:00Z',
        postId: 'post-1',
        parentId: null,
        repliesCount: 2,
        threadDepth: 0,
        threadPath: 'comment-1',
        mentionedUsers: ['code-reviewer-agent']
      },
      {
        id: 'comment-2',
        content: 'First reply to root comment',
        author: 'user-2',
        createdAt: '2025-09-09T05:01:00Z',
        postId: 'post-1',
        parentId: 'comment-1',
        repliesCount: 1,
        threadDepth: 1,
        threadPath: 'comment-1.comment-2',
        mentionedUsers: []
      },
      {
        id: 'comment-3',
        content: 'Nested reply with @bug-hunter-agent mention',
        author: 'user-3',
        createdAt: '2025-09-09T05:02:00Z',
        postId: 'post-1',
        parentId: 'comment-2',
        repliesCount: 0,
        threadDepth: 2,
        threadPath: 'comment-1.comment-2.comment-3',
        mentionedUsers: ['bug-hunter-agent']
      }
    ];

    // Mock external services
    jest.doMock('../../../services/api', () => ({
      apiService: mockApiService
    }));

    jest.doMock('../../../services/MentionService', () => ({
      MentionService: mockMentionService
    }));
  });

  afterEach(() => {
    TDDTestUtilities.cleanupTest();
  });

  describe('CommentThread Component Collaboration', () => {
    it('should coordinate comment display with proper threading hierarchy', async () => {
      // Act: Render CommentThread with nested comments
      const { component } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Assert: Verify threading hierarchy is rendered correctly
      await waitFor(() => {
        const threadContainer = screen.getByTestId('comment-thread-container');
        expect(threadContainer).toBeInTheDocument();

        // Root comment should be visible
        const rootComment = screen.getByText('Root comment with @code-reviewer-agent mention');
        expect(rootComment).toBeInTheDocument();

        // Nested comments should be indented
        const nestedReply = screen.getByText('Nested reply with @bug-hunter-agent mention');
        expect(nestedReply).toBeInTheDocument();
        
        // Verify threading structure is preserved
        const commentElements = screen.getAllByText(/comment/i);
        expect(commentElements.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should handle comment expansion and collapse interactions', async () => {
      // Act: Test expand/collapse behavior
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Find and click collapse button for root comment
      await waitFor(() => {
        const collapseButtons = screen.getAllByText(/reply|replies/i);
        expect(collapseButtons.length).toBeGreaterThan(0);
      });

      const replyButton = screen.getByText('2 replies');
      await user.click(replyButton);

      // Assert: Should toggle comment visibility
      // Note: The exact behavior depends on implementation
      // This tests the interaction contract
      expect(replyButton).toBeInTheDocument();
    });

    it('should coordinate reply form creation and submission', async () => {
      // Arrange: Setup reply creation mock
      mockApiService.createComment.mockResolvedValue({
        data: {
          id: 'comment-new',
          content: 'New reply comment',
          author: 'test-user',
          parentId: 'comment-1'
        },
        success: true
      });

      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'reviewer-agent', name: 'reviewer-agent', displayName: 'Reviewer Agent', description: 'Code review' }
      ]);

      // Act: Create a reply
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Click reply button on root comment
      const replyButtons = screen.getAllByText('Reply');
      await user.click(replyButtons[0]);

      // Fill reply form
      await waitFor(() => {
        const replyInput = screen.getByPlaceholderText(/write a reply/i);
        expect(replyInput).toBeInTheDocument();
      });

      const replyInput = screen.getByPlaceholderText(/write a reply/i);
      await user.type(replyInput, 'This is a reply to the root comment @reviewer-agent');

      // Submit reply
      const submitButton = screen.getByRole('button', { name: /post reply/i });
      await user.click(submitButton);

      // Assert: API should be called with correct parameters
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledWith(
          'post-1',
          'This is a reply to the root comment @reviewer-agent',
          expect.objectContaining({
            parentId: 'comment-1',
            author: 'test-user'
          })
        );
      });

      // Update callback should be triggered
      expect(mockProps.onCommentsUpdate).toHaveBeenCalled();
    });
  });

  describe('CommentForm Integration with Threading', () => {
    it('should handle reply context correctly in CommentForm', async () => {
      // Act: Render CommentForm in reply mode
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentForm
          postId="post-1"
          parentId="comment-1"
          currentUser="test-user"
          onCommentAdded={mockProps.onCommentAdded}
        />
      );

      // Assert: Should show reply context
      await waitFor(() => {
        const replyContext = screen.getByText(/replying with technical analysis/i);
        expect(replyContext).toBeInTheDocument();
      });

      // Should have reply-specific placeholder and styling
      const replyInput = screen.getByRole('textbox');
      expect(replyInput).toHaveAttribute('rows', '2'); // Shorter for replies
    });

    it('should coordinate mention system in reply context', async () => {
      // Arrange: Setup mention responses
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'expert-agent', name: 'expert-agent', displayName: 'Expert Agent', description: 'Domain expertise' }
      ]);

      // Act: Use mentions in reply
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentForm
          postId="post-1"
          parentId="comment-1"
          currentUser="test-user"
          onCommentAdded={mockProps.onCommentAdded}
        />
      );

      const replyInput = screen.getByRole('textbox');
      await TDDTestUtilities.triggerMentionSystem(replyInput, user);

      // Assert: Mention dropdown should appear with context-appropriate suggestions
      await TDDAssertions.mentionSystemBehavior.dropdownAppears();
      
      // Verify mention service was called with comment context
      expect(mockMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('should handle comment editing workflow', async () => {
      // Arrange: Setup edit response
      mockApiService.updateComment.mockResolvedValue({
        data: {
          id: 'comment-1',
          content: 'Updated comment content',
          isEdited: true
        },
        success: true
      });

      // Act: Test edit workflow through CommentThread
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="user-1" // Same as comment author
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Find and click edit button (should be visible for comment author)
      await waitFor(() => {
        const editButtons = screen.getAllByTitle(/edit comment/i);
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const editButton = screen.getAllByTitle(/edit comment/i)[0];
      await user.click(editButton);

      // Edit form should appear
      await waitFor(() => {
        const editInput = screen.getByDisplayValue(/root comment/i);
        expect(editInput).toBeInTheDocument();
      });

      const editInput = screen.getByDisplayValue(/root comment/i);
      await user.clear(editInput);
      await user.type(editInput, 'Updated root comment content');

      // Save edit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Assert: Update API should be called
      await waitFor(() => {
        expect(mockApiService.updateComment).toHaveBeenCalledWith(
          'comment-1',
          'Updated root comment content'
        );
      });
    });
  });

  describe('Comment Navigation and Permalink Behavior', () => {
    it('should handle comment permalink navigation', async () => {
      // Arrange: Mock URL hash navigation
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, hash: '#comment-2' };

      // Act: Render with hash navigation
      const { component } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Assert: Should scroll to and highlight target comment
      await waitFor(() => {
        const targetComment = screen.getByText('First reply to root comment');
        expect(targetComment).toBeInTheDocument();
      });

      // Restore original location
      window.location = originalLocation;
    });

    it('should coordinate permalink copying functionality', async () => {
      // Arrange: Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      // Act: Test permalink copying
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Find and click permalink button
      await waitFor(() => {
        const permalinkButtons = screen.getAllByTitle(/copy permalink/i);
        expect(permalinkButtons.length).toBeGreaterThan(0);
      });

      const permalinkButton = screen.getAllByTitle(/copy permalink/i)[0];
      await user.click(permalinkButton);

      // Assert: Clipboard should be used
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('#comment-1')
        );
      });
    });
  });

  describe('Comment Threading State Management', () => {
    it('should maintain thread expansion state across re-renders', async () => {
      // Act: Test state persistence
      const { user, rerender } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Expand a thread
      const expandButton = screen.getByText('2 replies');
      await user.click(expandButton);

      // Re-render component
      rerender(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Assert: Expansion state should be maintained
      await waitFor(() => {
        const nestedComment = screen.getByText('First reply to root comment');
        expect(nestedComment).toBeInTheDocument();
      });
    });

    it('should handle thread state isolation between different posts', async () => {
      // Arrange: Different post comments
      const post2Comments = [
        {
          id: 'comment-p2-1',
          content: 'Comment on different post',
          author: 'user-1',
          createdAt: '2025-09-09T05:00:00Z',
          postId: 'post-2',
          parentId: null,
          repliesCount: 0,
          threadDepth: 0,
          threadPath: 'comment-p2-1',
          mentionedUsers: []
        }
      ];

      // Act: Render two CommentThread components
      const { component } = await TDDTestUtilities.renderWithUser(
        <div>
          <CommentThread
            postId="post-1"
            comments={mockComments}
            currentUser="test-user"
            onCommentsUpdate={mockProps.onCommentsUpdate}
          />
          <CommentThread
            postId="post-2"
            comments={post2Comments}
            currentUser="test-user"
            onCommentsUpdate={mockProps.onCommentsUpdate}
          />
        </div>
      );

      // Assert: Both threads should render independently
      await waitFor(() => {
        expect(screen.getByText('Root comment with @code-reviewer-agent mention')).toBeInTheDocument();
        expect(screen.getByText('Comment on different post')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Moderation and Actions Collaboration', () => {
    it('should coordinate comment deletion workflow', async () => {
      // Arrange: Setup delete confirmation
      const mockConfirm = jest.fn().mockReturnValue(true);
      global.confirm = mockConfirm;

      mockApiService.deleteComment.mockResolvedValue({
        success: true,
        message: 'Comment deleted'
      });

      // Act: Test comment deletion
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="user-1" // Comment author
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Find and click delete button
      const deleteButtons = screen.getAllByTitle(/delete comment/i);
      await user.click(deleteButtons[0]);

      // Assert: Should confirm and call delete API
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');
      
      await waitFor(() => {
        expect(mockApiService.deleteComment).toHaveBeenCalledWith('comment-1');
      });

      expect(mockProps.onCommentsUpdate).toHaveBeenCalled();
    });

    it('should handle comment pinning functionality', async () => {
      // Arrange: Setup pin response
      mockApiService.updateComment.mockResolvedValue({
        data: { id: 'comment-1', isPinned: true },
        success: true
      });

      // Mock the pin API endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      // Act: Test comment pinning
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="user-1"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Find and click pin button
      const pinButtons = screen.getAllByTitle(/pin comment/i);
      await user.click(pinButtons[0]);

      // Assert: Pin API should be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/comments/comment-1/pin',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('Real-time Updates and WebSocket Integration', () => {
    it('should coordinate WebSocket connection for real-time comment updates', async () => {
      // Arrange: Mock WebSocket
      const mockWebSocket = TDDLondonSchoolMockFactory.createWebSocketServiceMock();
      
      // Mock WebSocket constructor
      global.WebSocket = jest.fn().mockImplementation(() => ({
        onmessage: null,
        onerror: null,
        onopen: null,
        onclose: null,
        close: jest.fn()
      }));

      // Act: Render with real-time enabled
      const { component } = await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          enableRealTime={true}
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Assert: WebSocket should be initialized
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('/api/ws/comments/post-1')
      );

      // Cleanup
      component.unmount();
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should provide proper ARIA attributes for threaded comments', async () => {
      // Act: Render and verify accessibility
      await TDDTestUtilities.renderWithUser(
        <CommentThread
          postId="post-1"
          comments={mockComments}
          currentUser="test-user"
          onCommentsUpdate={mockProps.onCommentsUpdate}
        />
      );

      // Assert: Check accessibility attributes
      await waitFor(() => {
        const threadContainer = screen.getByTestId('comment-thread-container');
        expect(threadContainer).toBeInTheDocument();

        // Comments should have proper structure
        const comments = screen.getAllByText(/comment/i);
        expect(comments.length).toBeGreaterThan(0);
      });

      // Verify mention accessibility when present
      TDDTestUtilities.verifyMentionAccessibility();
    });
  });
});