/**
 * TDD London School: Comment URL Navigation & Fragment Handling Tests
 * 
 * Focus: Mock-driven testing of URL fragment navigation, scroll behavior,
 * and comment linking using outside-in TDD approach with behavior verification.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommentThread, Comment } from '@/components/CommentThread';
import { BrowserRouter } from 'react-router-dom';

// Mock scroll behavior
const mockScrollIntoView = vi.fn();
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  writable: true,
});

// Mock window.location
const mockLocation = {
  origin: 'https://test.example.com',
  pathname: '/test-path',
  hash: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock getElementById for direct DOM access
const mockGetElementById = vi.fn();
Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  writable: true,
});

describe('CommentThread - TDD London School: Navigation & URL Fragments', () => {
  
  // Mock comment data factory
  const createMockComment = (id: string, parentId?: string): Comment => ({
    id,
    content: `Comment content for ${id}`,
    author: `author-${id}`,
    createdAt: new Date().toISOString(),
    parentId,
    replies: [],
    repliesCount: 0,
    threadDepth: parentId ? 1 : 0,
    threadPath: parentId ? `${parentId}.${id}` : id,
    authorType: 'user' as const,
  });

  const createCommentHierarchy = () => {
    const parent = createMockComment('parent-123');
    const child1 = createMockComment('child-456', 'parent-123');
    const child2 = createMockComment('child-789', 'parent-123');
    
    parent.replies = [child1, child2];
    parent.repliesCount = 2;
    
    return [parent];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScrollIntoView.mockClear();
    mockWriteText.mockClear();
    mockGetElementById.mockClear();
    mockLocation.hash = '';
  });

  describe('URL Fragment Navigation', () => {
    it('should parse URL fragments and highlight target comments on load', async () => {
      // Arrange: Set URL fragment
      mockLocation.hash = '#comment-child-456';
      const mockElement = document.createElement('div');
      mockElement.id = 'comment-child-456';
      mockGetElementById.mockReturnValue(mockElement);
      
      const comments = createCommentHierarchy();
      
      // Act: Render with URL fragment
      render(
        <BrowserRouter>
          <CommentThread
            postId="test-post"
            comments={comments}
            currentUser="test-user"
          />
        </BrowserRouter>
      );
      
      // Assert: Target comment should be highlighted and scrolled to
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith('comment-child-456');
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      });
    });

    it('should handle invalid comment fragments gracefully', () => {
      mockLocation.hash = '#comment-nonexistent';
      mockGetElementById.mockReturnValue(null);
      
      const comments = createCommentHierarchy();
      
      // Should not crash with invalid fragment
      expect(() => {
        render(
          <BrowserRouter>
            <CommentThread
              postId="test-post"
              comments={comments}
              currentUser="test-user"
            />
          </BrowserRouter>
        );
      }).not.toThrow();
      
      // Should not attempt to scroll
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });

    it('should update URL fragment when navigating to comments', () => {
      const comments = createCommentHierarchy();
      const mockHistoryPushState = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { pushState: mockHistoryPushState },
        writable: true,
      });
      
      render(
        <BrowserRouter>
          <CommentThread
            postId="test-post"
            comments={comments}
            currentUser="test-user"
          />
        </BrowserRouter>
      );
      
      // Navigate to a specific comment (simulate highlight action)
      const highlightButton = screen.getByText('Highlight');
      fireEvent.click(highlightButton);
      
      // Should update URL to include comment fragment
      expect(mockHistoryPushState).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('#comment-')
      );
    });
  });

  describe('Scroll Behavior and Element Targeting', () => {
    it('should scroll to comment with smooth behavior when highlighted', async () => {
      const comments = createCommentHierarchy();
      const targetElement = document.createElement('div');
      targetElement.id = 'comment-child-456';
      mockGetElementById.mockReturnValue(targetElement);
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Simulate highlighting a comment
      const commentElement = screen.getByText(/comment content for child-456/i).closest('[id^="comment-"]');
      const highlightButton = screen.getByText('Highlight');
      fireEvent.click(highlightButton);
      
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      });
    });

    it('should center comments in viewport when scrolling', () => {
      const comments = [createMockComment('target-comment')];
      const mockElement = document.createElement('div');
      mockGetElementById.mockReturnValue(mockElement);
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Trigger navigation to comment
      const highlightButton = screen.getByText('Highlight');
      fireEvent.click(highlightButton);
      
      expect(mockScrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({
          block: 'center' // Should center in viewport
        })
      );
    });

    it('should handle scroll behavior when element is not in DOM', () => {
      const comments = createCommentHierarchy();
      mockGetElementById.mockReturnValue(null); // Element not found
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Try to navigate to non-existent element
      const highlightButton = screen.getByText('Highlight');
      fireEvent.click(highlightButton);
      
      // Should not crash or scroll
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('Permalink Generation and Sharing', () => {
    it('should generate correct permalink for comments', async () => {
      const comments = [createMockComment('test-comment-123')];
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Find and click permalink button
      const permalinkButton = screen.getByTitle('Copy permalink');
      fireEvent.click(permalinkButton);
      
      // Should copy correct URL format
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          'https://test.example.com/test-path#comment-test-comment-123'
        );
      });
    });

    it('should handle permalink copying errors gracefully', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));
      const comments = [createMockComment('test-comment')];
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const permalinkButton = screen.getByTitle('Copy permalink');
      
      // Should not crash when clipboard fails
      expect(() => {
        fireEvent.click(permalinkButton);
      }).not.toThrow();
    });

    it('should include post context in permalink URLs', async () => {
      mockLocation.pathname = '/posts/123';
      const comments = [createMockComment('comment-456')];
      
      render(
        <CommentThread
          postId="test-post-123"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const permalinkButton = screen.getByTitle('Copy permalink');
      fireEvent.click(permalinkButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('/posts/123#comment-comment-456')
        );
      });
    });
  });

  describe('Parent-Child Navigation Controls', () => {
    it('should navigate to parent comment when parent button is clicked', async () => {
      const parent = createMockComment('parent-comment');
      const child = createMockComment('child-comment', 'parent-comment');
      parent.replies = [child];
      
      const mockParentElement = document.createElement('div');
      mockParentElement.id = 'comment-parent-comment';
      mockGetElementById.mockReturnValue(mockParentElement);
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parent]}
          currentUser="test-user"
        />
      );
      
      // Find parent navigation button in child comment
      const parentButton = screen.getByTitle('Go to parent');
      fireEvent.click(parentButton);
      
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith('comment-parent-comment');
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      });
    });

    it('should navigate between sibling comments', async () => {
      const parent = createMockComment('parent');
      const sibling1 = createMockComment('sibling-1', 'parent');
      const sibling2 = createMockComment('sibling-2', 'parent');
      parent.replies = [sibling1, sibling2];
      
      const mockSiblingElement = document.createElement('div');
      mockSiblingElement.id = 'comment-sibling-2';
      mockGetElementById.mockReturnValue(mockSiblingElement);
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parent]}
          currentUser="test-user"
        />
      );
      
      // Navigate to next sibling
      const nextButton = screen.getByTitle('Next sibling');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith('comment-sibling-2');
        expect(mockScrollIntoView).toHaveBeenCalled();
      });
    });

    it('should handle navigation when target sibling does not exist', () => {
      const parent = createMockComment('parent');
      const onlyChild = createMockComment('only-child', 'parent');
      parent.replies = [onlyChild];
      
      mockGetElementById.mockReturnValue(null);
      
      render(
        <CommentThread
          postId="test-post"
          comments={[parent]}
          currentUser="test-user"
        />
      );
      
      // Try to navigate to non-existent next sibling
      const nextButton = screen.getByTitle('Next sibling');
      fireEvent.click(nextButton);
      
      // Should not scroll or crash
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('Comment Highlighting and Visual Feedback', () => {
    it('should apply highlight styles to target comments', () => {
      const comments = [createMockComment('highlight-target')];
      
      const { container } = render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Simulate highlighting
      const highlightButton = screen.getByText('Highlight');
      fireEvent.click(highlightButton);
      
      // Check for highlight CSS classes
      const commentElement = container.querySelector('#comment-highlight-target');
      expect(commentElement).toHaveClass('ring-2', 'ring-blue-500', 'ring-opacity-50');
    });

    it('should toggle highlight state when clicked multiple times', () => {
      const comments = [createMockComment('toggle-target')];
      
      const { container } = render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      const highlightButton = screen.getByText('Highlight');
      const commentElement = container.querySelector('#comment-toggle-target');
      
      // First click - highlight
      fireEvent.click(highlightButton);
      expect(commentElement).toHaveClass('ring-2', 'ring-blue-500');
      
      // Second click - remove highlight
      fireEvent.click(highlightButton);
      expect(commentElement).not.toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should clear previous highlight when highlighting new comment', () => {
      const comment1 = createMockComment('comment-1');
      const comment2 = createMockComment('comment-2');
      
      const { container } = render(
        <CommentThread
          postId="test-post"
          comments={[comment1, comment2]}
          currentUser="test-user"
        />
      );
      
      const element1 = container.querySelector('#comment-comment-1');
      const element2 = container.querySelector('#comment-comment-2');
      
      // Highlight first comment
      const highlightButtons = screen.getAllByText('Highlight');
      fireEvent.click(highlightButtons[0]);
      expect(element1).toHaveClass('ring-2', 'ring-blue-500');
      
      // Highlight second comment
      fireEvent.click(highlightButtons[1]);
      expect(element1).not.toHaveClass('ring-2', 'ring-blue-500');
      expect(element2).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('URL Fragment Edge Cases', () => {
    it('should handle malformed URL fragments', () => {
      mockLocation.hash = '#invalid-fragment-format';
      const comments = createCommentHierarchy();
      
      expect(() => {
        render(
          <CommentThread
            postId="test-post"
            comments={comments}
            currentUser="test-user"
          />
        );
      }).not.toThrow();
    });

    it('should handle empty URL fragments', () => {
      mockLocation.hash = '#';
      const comments = createCommentHierarchy();
      
      render(
        <CommentThread
          postId="test-post"
          comments={comments}
          currentUser="test-user"
        />
      );
      
      // Should not attempt any navigation
      expect(mockGetElementById).not.toHaveBeenCalled();
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });

    it('should handle URL fragments for comments not yet loaded', async () => {
      mockLocation.hash = '#comment-future-comment';
      const initialComments = [createMockComment('existing-comment')];
      
      const { rerender } = render(
        <CommentThread
          postId="test-post"
          comments={initialComments}
          currentUser="test-user"
        />
      );
      
      // Comment not found initially
      expect(mockScrollIntoView).not.toHaveBeenCalled();
      
      // Add the target comment later
      const updatedComments = [...initialComments, createMockComment('future-comment')];
      const mockElement = document.createElement('div');
      mockGetElementById.mockReturnValue(mockElement);
      
      rerender(
        <CommentThread
          postId="test-post"
          comments={updatedComments}
          currentUser="test-user"
        />
      );
      
      // Should now scroll to the newly available comment
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled();
      });
    });
  });
});
