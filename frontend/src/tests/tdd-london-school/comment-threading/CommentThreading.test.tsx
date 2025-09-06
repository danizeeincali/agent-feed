/**
 * TDD London School: Comment Threading & Nested Structure Tests
 * 
 * Focus: Mock-driven testing of comment tree structure, reply relationships,
 * and hierarchical rendering behavior using outside-in TDD approach.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommentThread, Comment } from '@/components/CommentThread';
import { apiService } from '@/services/api';

// Mock the API service completely
vi.mock('@/services/api', () => ({
  apiService: {
    createComment: vi.fn(),
    getPostComments: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

// Mock scroll behavior
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('CommentThread - TDD London School: Threading Structure', () => {
  const mockApiService = apiService as vi.Mocked<typeof apiService>;
  
  // Mock comment data with nested structure
  const createMockComment = (id: string, parentId?: string, depth: number = 0): Comment => ({
    id,
    content: `Test comment content ${id}`,
    author: `author-${id}`,
    createdAt: new Date().toISOString(),
    parentId,
    replies: [],
    repliesCount: 0,
    threadDepth: depth,
    threadPath: parentId ? `parent-path.${id}` : id,
    authorType: 'user' as const,
  });

  const createNestedCommentStructure = (): Comment[] => {
    const rootComment = createMockComment('root-1', undefined, 0);
    const level1Reply = createMockComment('reply-1-1', 'root-1', 1);
    const level2Reply = createMockComment('reply-2-1', 'reply-1-1', 2);
    const level3Reply = createMockComment('reply-3-1', 'reply-2-1', 3);
    
    // Build tree structure
    level2Reply.replies = [level3Reply];
    level1Reply.replies = [level2Reply];
    rootComment.replies = [level1Reply];
    rootComment.repliesCount = 3; // Total nested replies
    
    return [rootComment];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.createComment.mockResolvedValue({ id: 'new-comment' });
  });

  describe('Nested Comment Structure Rendering', () => {
    it('should render root comments without indentation', () => {
      const rootComments = [createMockComment('root-1')];
      
      render(
        <CommentThread
          postId="test-post"
          comments={rootComments}
          currentUser="test-user"
        />
      );
      
      const commentElement = screen.getByTestId ? 
        screen.queryByTestId('comment-root-1') : 
        document.getElementById('comment-root-1');
      
      expect(commentElement).toBeInTheDocument();
      expect(commentElement).not.toHaveClass('ml-6'); // No indentation for root
    });

    it('should render nested comments with proper indentation hierarchy', () => {
      const nestedComments = createNestedCommentStructure();
      
      render(
        <CommentThread
          postId="test-post"
          comments={nestedComments}
          currentUser="test-user"
          maxDepth={6}
        />
      );
      
      // Verify hierarchical structure exists in DOM
      const rootComment = document.getElementById('comment-root-1');
      const level1Reply = document.getElementById('comment-reply-1-1');
      const level2Reply = document.getElementById('comment-reply-2-1');
      const level3Reply = document.getElementById('comment-reply-3-1');
      
      expect(rootComment).toBeInTheDocument();
      expect(level1Reply).toBeInTheDocument();
      expect(level2Reply).toBeInTheDocument();
      expect(level3Reply).toBeInTheDocument();
      
      // Verify indentation classes are applied correctly
      expect(level1Reply).toHaveClass('comment-level-1');
      expect(level2Reply).toHaveClass('comment-level-2');
      expect(level3Reply).toHaveClass('comment-level-3');
    });

    it('should display depth indicators for nested comments', () => {
      const nestedComments = createNestedCommentStructure();
      
      render(
        <CommentThread
          postId="test-post"
          comments={nestedComments}
          currentUser="test-user"
        />
      );
      
      // Check depth indicators are shown
      expect(screen.getByText('L1')).toBeInTheDocument(); // Level 1
      expect(screen.getByText('L2')).toBeInTheDocument(); // Level 2
      expect(screen.getByText('L3')).toBeInTheDocument(); // Level 3
    });

    it('should limit nesting at maxDepth and show continuation indicators', () => {
      const deepComments = createNestedCommentStructure();
      const maxDepth = 2;
      
      render(
        <CommentThread
          postId="test-post"
          comments={deepComments}
          currentUser="test-user"
          maxDepth={maxDepth}
        />
      );
      
      // Should not render replies beyond maxDepth
      const level3Comment = document.getElementById('comment-reply-3-1');
      expect(level3Comment).not.toBeInTheDocument();
      
      // Should show "Show more replies" or similar indicator
      expect(screen.getByText(/more replies/i)).toBeInTheDocument();
    });
  });

  describe('Comment Reply Form Interactions', () => {
    const mockHandleReply = vi.fn();
    
    beforeEach(() => {
      mockHandleReply.mockClear();
    });

    it('should show reply form when reply button is clicked', async () => {
      const comments = [createMockComment('root-1')];
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const replyButton = screen.getByText('Reply');
      fireEvent.click(replyButton);
      
      // Reply form should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
      });
    });

    it('should hide reply button at maximum depth', () => {
      const deepComment = createMockComment('deep-comment', 'parent', 6); // At max depth
      
      render(
        <CommentThread
          postId="test-post"
          comments={[deepComment]}
          currentUser="test-user"
          maxDepth={6}
        />
      );
      
      // Reply button should not be present at max depth
      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });

    it('should create nested reply with proper parent relationship', async () => {
      const parentComment = createMockComment('parent-1');
      mockApiService.createComment.mockResolvedValue({ 
        id: 'new-reply',
        parentId: 'parent-1'
      });
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parentComment]}
          currentUser="test-user"
          onCommentsUpdate={() => {}}
        />
      );
      
      // Click reply button
      const replyButton = screen.getByText('Reply');
      fireEvent.click(replyButton);
      
      // Fill in reply content
      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply content' } });
      
      // Submit reply
      const postButton = screen.getByText(/post reply/i);
      fireEvent.click(postButton);
      
      // Verify API call with correct parent relationship
      await waitFor(() => {
        expect(mockApiService.createComment).toHaveBeenCalledWith(
          'test-post',
          'Test reply content',
          expect.objectContaining({
            parentId: 'parent-1',
            author: 'test-user'
          })
        );
      });
    });
  });

  describe('Thread Navigation and Interaction', () => {
    it('should expand/collapse comment threads', async () => {
      const commentWithReplies = createMockComment('root-1');
      commentWithReplies.replies = [createMockComment('reply-1', 'root-1')];
      commentWithReplies.repliesCount = 1;
      
      render(
        <CommentThread
          postId="test-post"
          comments={[commentWithReplies]}
          currentUser="test-user"
        />
      );
      
      // Find collapse/expand button
      const toggleButton = screen.getByText(/1 reply/);
      
      // Initially expanded (replies visible)
      expect(document.getElementById('comment-reply-1')).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const replyElement = document.getElementById('comment-reply-1');
        expect(replyElement).toHaveClass('opacity-0'); // Collapsed state
      });
    });

    it('should navigate to parent comment when parent button is clicked', () => {
      const parentComment = createMockComment('parent-1');
      const childComment = createMockComment('child-1', 'parent-1');
      childComment.replies = [];
      parentComment.replies = [childComment];
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parentComment]}
          currentUser="test-user"
        />
      );
      
      // Find parent navigation button in child comment
      const childElement = document.getElementById('comment-child-1');
      const parentNavButton = within(childElement!).getByTitle('Go to parent');
      
      fireEvent.click(parentNavButton);
      
      // Verify parent comment gets highlighted
      const parentElement = document.getElementById('comment-parent-1');
      expect(parentElement).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should navigate between sibling comments', () => {
      const parent = createMockComment('parent-1');
      const sibling1 = createMockComment('sibling-1', 'parent-1');
      const sibling2 = createMockComment('sibling-2', 'parent-1');
      
      parent.replies = [sibling1, sibling2];
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parent]}
          currentUser="test-user"
        />
      );
      
      // Find next button in first sibling
      const sibling1Element = document.getElementById('comment-sibling-1');
      const nextButton = within(sibling1Element!).getByTitle('Next sibling');
      
      fireEvent.click(nextButton);
      
      // Verify second sibling gets highlighted
      const sibling2Element = document.getElementById('comment-sibling-2');
      expect(sibling2Element).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Comment Content and Metadata', () => {
    it('should render comment content with proper formatting', () => {
      const comment = createMockComment('test-1');
      comment.content = 'Test comment with @mention and #hashtag';
      
      render(
        <CommentThread
          postId="test-post"
          comments={[comment]}
          currentUser="test-user"
        />
      );
      
      expect(screen.getByText(/test comment with/i)).toBeInTheDocument();
      // Mentions and hashtags should be highlighted
      expect(screen.getByText('@mention')).toHaveClass('text-blue-600');
    });

    it('should display comment author and timestamp', () => {
      const comment = createMockComment('test-1');
      comment.author = 'TestAuthor';
      
      render(
        <CommentThread
          postId="test-post"
          comments={[comment]}
          currentUser="test-user"
        />
      );
      
      expect(screen.getByText('TestAuthor')).toBeInTheDocument();
      expect(screen.getByText(/ago/)).toBeInTheDocument(); // Timestamp
    });

    it('should show edit indicators for edited comments', () => {
      const comment = createMockComment('test-1');
      comment.isEdited = true;
      comment.editedAt = new Date().toISOString();
      
      render(
        <CommentThread
          postId="test-post"
          comments={[comment]}
          currentUser="test-user"
        />
      );
      
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });
  });

  describe('Thread State Management', () => {
    it('should maintain thread state across interactions', () => {
      const comments = createNestedCommentStructure();
      
      const { rerender } = render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Interact with thread (expand/collapse)
      const toggleButton = screen.getByText(/replies/);
      fireEvent.click(toggleButton);
      
      // Re-render with same data
      rerender(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // State should be preserved
      const replyElement = document.getElementById('comment-reply-1-1');
      expect(replyElement).toHaveClass('opacity-0'); // Still collapsed
    });
  });

  describe('Accessibility and UX', () => {
    it('should provide keyboard navigation support', () => {
      const comments = [createMockComment('test-1')];
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const replyButton = screen.getByText('Reply');
      
      // Should be focusable
      replyButton.focus();
      expect(replyButton).toHaveFocus();
      
      // Should respond to Enter key
      fireEvent.keyDown(replyButton, { key: 'Enter' });
      expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
    });

    it('should provide proper ARIA labels for screen readers', () => {
      const comments = createNestedCommentStructure();
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Check for proper aria labels
      expect(screen.getByLabelText(/expand post/i)).toBeInTheDocument();
      expect(screen.getByTitle(/go to parent/i)).toBeInTheDocument();
    });
  });
});
