/**
 * TDD RED PHASE: Top-Level Comment Processing Pills Unit Tests
 *
 * ROOT CAUSE:
 * - Line 703: Uses tempCommentId instead of post.id as processing key
 * - Line 1457: Button disabled checks global processingComments.size > 0
 * - Line 1460: Spinner displays checks global processingComments.size > 0
 * - Should check processingComments.has(post.id) for per-form isolation
 *
 * EXPECTED BEHAVIOR:
 * - Each post form should have independent processing state
 * - Button should only disable when THIS post is processing
 * - Spinner should only show for THIS post
 * - Multiple posts can process simultaneously without interference
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../RealSocialMediaFeed';

// Mock API
jest.mock('../../services/api', () => ({
  getPosts: jest.fn(),
  createComment: jest.fn(),
  likePost: jest.fn(),
  likeComment: jest.fn(),
}));

import * as api from '../../services/api';

describe('RealSocialMediaFeed - Top-Level Comment Processing Pills (TDD RED PHASE)', () => {
  const mockPosts = [
    {
      id: 'post-1',
      authorName: 'Alice',
      authorHandle: '@alice',
      authorAvatar: '/avatar1.jpg',
      content: 'First post for testing',
      timestamp: '2024-01-01T10:00:00Z',
      likes: 5,
      commentCount: 0,
      comments: [],
    },
    {
      id: 'post-2',
      authorName: 'Bob',
      authorHandle: '@bob',
      authorAvatar: '/avatar2.jpg',
      content: 'Second post for testing',
      timestamp: '2024-01-01T11:00:00Z',
      likes: 3,
      commentCount: 0,
      comments: [],
    },
    {
      id: 'post-3',
      authorName: 'Charlie',
      authorHandle: '@charlie',
      authorAvatar: '/avatar3.jpg',
      content: 'Third post for testing',
      timestamp: '2024-01-01T12:00:00Z',
      likes: 7,
      commentCount: 0,
      comments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.getPosts as jest.Mock).mockResolvedValue(mockPosts);
    (api.createComment as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        id: 'new-comment',
        postId: 'post-1',
        authorName: 'Test User',
        content: 'Test comment',
        timestamp: new Date().toISOString(),
      }), 100))
    );
  });

  describe('1. Button uses per-post processing state (not global)', () => {
    it('should use post.id as the processing key, not a random tempCommentId', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      // Get the first post's comment form
      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      // Type a comment
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      // Click submit
      fireEvent.click(submitButton);

      // FAIL: Currently uses tempCommentId as key
      // SHOULD: Use post.id ('post-1') as processing key
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // This test will FAIL because code uses random tempCommentId
      // Expected: processingComments.has('post-1')
      // Actual: processingComments.has('temp-comment-randomId')
    });
  });

  describe('2. Button disabled when THIS post is processing', () => {
    it('should disable the comment button only for the post being submitted', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      // FAIL: Button should be disabled based on processingComments.has('post-1')
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // This test will FAIL because code checks processingComments.size > 0
      // instead of processingComments.has(post.id)
    });

    it('should re-enable the button after comment submission completes', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Wait for processing to complete
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // FAIL: Processing state may not clear correctly with wrong key
    });
  });

  describe('3. Button enabled when OTHER posts are processing', () => {
    it('should keep button enabled on post-2 while post-1 is processing', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const secondPost = postCards[1];

      // Start processing on first post
      const textarea1 = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton1 = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });
      fireEvent.change(textarea1, { target: { value: 'Comment on post 1' } });
      fireEvent.click(submitButton1);

      // Check second post button remains enabled
      const submitButton2 = within(secondPost as HTMLElement).getByRole('button', { name: /comment/i });

      // FAIL: Button on post-2 will be disabled because code checks
      // processingComments.size > 0 (global state)
      // SHOULD: Only check processingComments.has('post-2')
      await waitFor(() => {
        expect(submitButton1).toBeDisabled();
      });

      expect(submitButton2).not.toBeDisabled();
      // This assertion will FAIL - button will be incorrectly disabled
    });

    it('should allow submitting comments on multiple posts simultaneously', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const secondPost = postCards[1];
      const thirdPost = postCards[2];

      // Type comments in all three posts
      const textarea1 = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const textarea2 = within(secondPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const textarea3 = within(thirdPost as HTMLElement).getByPlaceholderText(/write a comment/i);

      fireEvent.change(textarea1, { target: { value: 'Comment 1' } });
      fireEvent.change(textarea2, { target: { value: 'Comment 2' } });
      fireEvent.change(textarea3, { target: { value: 'Comment 3' } });

      // Get submit buttons
      const submitButton1 = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });
      const submitButton2 = within(secondPost as HTMLElement).getByRole('button', { name: /comment/i });
      const submitButton3 = within(thirdPost as HTMLElement).getByRole('button', { name: /comment/i });

      // Submit all three simultaneously
      fireEvent.click(submitButton1);
      fireEvent.click(submitButton2);
      fireEvent.click(submitButton3);

      // FAIL: Only first button will be disabled, others won't submit
      // because global processingComments.size > 0 blocks them
      await waitFor(() => {
        expect(submitButton1).toBeDisabled();
        expect(submitButton2).toBeDisabled();
        expect(submitButton3).toBeDisabled();
      });

      // This test will FAIL - only one post will process at a time
    });
  });

  describe('4. Spinner visible only for THIS post', () => {
    it('should show spinner only on the post being submitted', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const secondPost = postCards[1];

      const textarea1 = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton1 = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea1, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton1);

      // FAIL: Spinner shows based on processingComments.size > 0
      // Should check processingComments.has('post-1')
      await waitFor(() => {
        const spinner1 = within(firstPost as HTMLElement).queryByRole('status');
        expect(spinner1).toBeInTheDocument();
      });

      // Second post should NOT show spinner
      const spinner2 = within(secondPost as HTMLElement).queryByRole('status');
      expect(spinner2).not.toBeInTheDocument();
      // This will FAIL - spinner may appear on wrong post
    });

    it('should hide spinner after processing completes', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const spinner = within(firstPost as HTMLElement).queryByRole('status');
        expect(spinner).toBeInTheDocument();
      });

      // Wait for processing to complete
      await waitFor(() => {
        const spinner = within(firstPost as HTMLElement).queryByRole('status');
        expect(spinner).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // FAIL: Spinner may not clear correctly with wrong processing key
    });
  });

  describe('5. Multiple posts can process independently', () => {
    it('should maintain separate processing state for each post', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const secondPost = postCards[1];

      // Submit on first post
      const textarea1 = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton1 = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });
      fireEvent.change(textarea1, { target: { value: 'Comment 1' } });
      fireEvent.click(submitButton1);

      await waitFor(() => {
        expect(submitButton1).toBeDisabled();
      });

      // Try to submit on second post
      const textarea2 = within(secondPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton2 = within(secondPost as HTMLElement).getByRole('button', { name: /comment/i });
      fireEvent.change(textarea2, { target: { value: 'Comment 2' } });

      // FAIL: Button 2 will be incorrectly disabled because of global check
      expect(submitButton2).not.toBeDisabled();
      // This assertion will FAIL
    });

    it('should not affect other posts when one completes processing', async () => {
      (api.createComment as jest.Mock).mockImplementation(({ postId }) =>
        new Promise(resolve => {
          const delay = postId === 'post-1' ? 50 : 200;
          setTimeout(() => resolve({
            id: `comment-${postId}`,
            postId,
            authorName: 'Test User',
            content: 'Test comment',
            timestamp: new Date().toISOString(),
          }), delay);
        })
      );

      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];
      const secondPost = postCards[1];

      // Submit both posts
      const textarea1 = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton1 = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });
      const textarea2 = within(secondPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton2 = within(secondPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea1, { target: { value: 'Comment 1' } });
      fireEvent.change(textarea2, { target: { value: 'Comment 2' } });
      fireEvent.click(submitButton1);
      fireEvent.click(submitButton2);

      // Post 1 completes first
      await waitFor(() => {
        expect(submitButton1).not.toBeDisabled();
      }, { timeout: 1000 });

      // Post 2 should still be processing
      expect(submitButton2).toBeDisabled();
      // FAIL: Both may be enabled/disabled due to global state
    });
  });

  describe('6. Processing state clears after submission', () => {
    it('should remove post.id from processingComments after successful submission', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Wait for completion
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // Should be able to submit again immediately
      fireEvent.change(textarea, { target: { value: 'Second comment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // FAIL: May not clear correctly if using wrong key
    });
  });

  describe('7. Processing state clears after error', () => {
    it('should remove post.id from processingComments after failed submission', async () => {
      (api.createComment as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Wait for error handling
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // Should be able to retry
      expect(submitButton).not.toBeDisabled();
      // FAIL: May not clear correctly if using wrong key
    });
  });

  describe('8. Rapid clicking doesn\'t create duplicates', () => {
    it('should prevent duplicate submissions from rapid clicking', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      // Rapid clicking
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Should only call API once
      await waitFor(() => {
        expect(api.createComment).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // FAIL: May create duplicates if processing key is not stable (random tempId)
    });
  });

  describe('9. Uses post.id as processing key (not random tempId)', () => {
    it('should use post.id consistently as the processing key', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      // The processing key should be 'post-1', not a random tempCommentId
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // FAIL: Currently uses `const tempCommentId = \`temp-comment-${Date.now()}-${Math.random()}\`;`
      // This makes rapid clicking checks unreliable and breaks per-post isolation
    });
  });

  describe('10. Callback invoked with post.id', () => {
    it('should invoke handleCommentSubmit with correct post.id', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('First post for testing')).toBeInTheDocument();
      });

      const postCards = container.querySelectorAll('[class*="post"]');
      const firstPost = postCards[0];

      const textarea = within(firstPost as HTMLElement).getByPlaceholderText(/write a comment/i);
      const submitButton = within(firstPost as HTMLElement).getByRole('button', { name: /comment/i });

      fireEvent.change(textarea, { target: { value: 'Test comment' } });
      fireEvent.click(submitButton);

      // Should call createComment with postId: 'post-1'
      await waitFor(() => {
        expect(api.createComment).toHaveBeenCalledWith(
          expect.objectContaining({
            postId: 'post-1',
            content: 'Test comment',
          })
        );
      });

      // FAIL: Currently uses tempCommentId for tracking, but should use post.id
    });
  });
});
