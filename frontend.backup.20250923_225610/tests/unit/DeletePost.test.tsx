import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import * as apiService from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock data for testing
const mockPosts = [
  {
    id: 'delete-test-post-1',
    title: 'Post to be Deleted',
    content: 'This post should be deletable and update the UI immediately.',
    authorAgent: 'test-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 5,
      comments: 3,
      stars: { average: 4.5, count: 10 },
      isSaved: false,
      userRating: 0
    },
    tags: ['test', 'delete'],
    metadata: {
      businessImpact: 85,
      isAgentResponse: false
    }
  },
  {
    id: 'keep-test-post-2',
    title: 'Post to Keep',
    content: 'This post should remain after deletion of other posts.',
    authorAgent: 'test-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 2,
      comments: 1,
      stars: { average: 3.0, count: 2 },
      isSaved: true,
      userRating: 3
    },
    tags: ['test', 'keep'],
    metadata: {
      businessImpact: 60,
      isAgentResponse: true
    }
  }
];

describe('Delete Post Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });
    
    mockedApiService.getFilterData.mockResolvedValue({
      agents: ['test-agent'],
      hashtags: ['test', 'delete', 'keep']
    });

    // Mock delete post endpoint
    mockedApiService.deletePost = jest.fn();

    // Mock event listeners
    mockedApiService.on = jest.fn();
    mockedApiService.off = jest.fn();
  });

  describe('Delete Button Presence', () => {
    it('should show delete button for user owned posts', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      // Look for delete action in PostActions menu
      const actionButtons = screen.getAllByLabelText('Post actions');
      expect(actionButtons.length).toBeGreaterThan(0);
      
      // Click first post actions
      fireEvent.click(actionButtons[0]);
      
      await waitFor(() => {
        // Should show delete option in dropdown
        expect(screen.getByText('Delete Post')).toBeInTheDocument();
      });
    });

    it('should not show delete button for posts user cannot delete', async () => {
      // Mock post with different author or permissions
      const restrictedPost = {
        ...mockPosts[0],
        authorAgent: 'different-agent',
        canDelete: false
      };

      mockedApiService.getAgentPosts.mockResolvedValue({
        success: true,
        data: [restrictedPost],
        total: 1
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      await waitFor(() => {
        // Should not show delete option
        expect(screen.queryByText('Delete Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Confirmation Dialog', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Post');
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete this post/)).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should close confirmation dialog when Cancel is clicked', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during deletion', async () => {
      mockedApiService.deletePost.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
      });
    });
  });

  describe('Delete Post Operation', () => {
    it('should call deletePost API with correct postId', async () => {
      mockedApiService.deletePost.mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        expect(mockedApiService.deletePost).toHaveBeenCalledWith('delete-test-post-1');
      });
    });

    it('should remove post from UI immediately after successful deletion', async () => {
      mockedApiService.deletePost.mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
        expect(screen.getByText('Post to Keep')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        // Deleted post should be removed from UI
        expect(screen.queryByText('Post to be Deleted')).not.toBeInTheDocument();
        // Other post should remain
        expect(screen.getByText('Post to Keep')).toBeInTheDocument();
      });
    });

    it('should update post count after deletion', async () => {
      mockedApiService.deletePost.mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('2 posts')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        // Post count should be updated
        expect(screen.getByText('1 post')).toBeInTheDocument();
      });
    });

    it('should handle delete operation errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedApiService.deletePost.mockRejectedValue(new Error('Delete failed'));

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete post:', expect.any(Error));
        // Post should still be visible after failed deletion
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show error message for failed deletions', async () => {
      mockedApiService.deletePost.mockRejectedValue(new Error('Network error'));

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to delete post/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket delete events', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
        expect(screen.getByText('Post to Keep')).toBeInTheDocument();
      });

      // Simulate WebSocket delete event
      const mockWebSocketHandler = mockedApiService.on.mock.calls.find(
        call => call[0] === 'post_deleted'
      )?.[1];

      if (mockWebSocketHandler) {
        mockWebSocketHandler({ id: 'delete-test-post-1' });
      }

      await waitFor(() => {
        expect(screen.queryByText('Post to be Deleted')).not.toBeInTheDocument();
        expect(screen.getByText('Post to Keep')).toBeInTheDocument();
      });
    });

    it('should sync delete operations across multiple tabs', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getAllByText(/Post to be Deleted|Post to Keep/)).toHaveLength(2);
      });

      // Simulate delete from another tab via WebSocket
      const deleteHandler = mockedApiService.on.mock.calls.find(
        call => call[0] === 'post_deleted'
      )?.[1];

      if (deleteHandler) {
        deleteHandler({ id: 'delete-test-post-1' });
      }

      await waitFor(() => {
        expect(screen.queryByText('Post to be Deleted')).not.toBeInTheDocument();
        expect(screen.getByText('Post to Keep')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should support keyboard navigation for delete action', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      const firstActionButton = actionButtons[0];
      
      // Focus and open with keyboard
      firstActionButton.focus();
      expect(firstActionButton).toHaveFocus();
      
      fireEvent.keyDown(firstActionButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Delete Post')).toBeInTheDocument();
      });

      // Navigate to delete option with keyboard
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.keyDown(deleteButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });
    });

    it('should support Escape key to close delete dialog', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders of other posts during deletion', async () => {
      const renderSpy = jest.spyOn(React, 'createElement');
      mockedApiService.deletePost.mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Post to be Deleted')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);
      
      const deleteButton = screen.getByText('Delete Post');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i });
        fireEvent.click(confirmDeleteButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Post to be Deleted')).not.toBeInTheDocument();
      });

      const finalRenderCount = renderSpy.mock.calls.length;
      const additionalRenders = finalRenderCount - initialRenderCount;
      
      // Should have minimal renders (optimistic updates)
      expect(additionalRenders).toBeLessThan(15);
      
      renderSpy.mockRestore();
    });
  });
});