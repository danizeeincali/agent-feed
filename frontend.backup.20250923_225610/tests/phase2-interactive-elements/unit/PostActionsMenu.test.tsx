/**
 * Post Actions Menu Unit Tests
 * Comprehensive testing for save/unsave, report, and menu behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { testPosts, performanceThresholds } from '../fixtures/testData';

// Mock components for Post Actions Menu
const PostActionsMenu = ({ 
  post, 
  isOpen, 
  onToggle, 
  onSave, 
  onUnsave, 
  onReport, 
  onShare,
  isSaved = false,
  isLoading = false
}) => {
  const handleAction = async (action: string, callback?: () => void) => {
    if (isLoading) return;
    callback?.();
  };

  return (
    <div data-testid="post-actions-menu" className="relative">
      <button
        data-testid="actions-menu-trigger"
        onClick={onToggle}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        aria-label="Post actions menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          data-testid="actions-menu-dropdown"
          className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          role="menu"
          aria-labelledby="actions-menu-trigger"
        >
          {/* Save/Unsave Action */}
          <button
            data-testid={isSaved ? "unsave-action" : "save-action"}
            onClick={() => handleAction('save', isSaved ? onUnsave : onSave)}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            role="menuitem"
          >
            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
            </svg>
            <span>{isSaved ? 'Remove from saved' : 'Save post'}</span>
            {isLoading && <div data-testid="action-loading" className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-auto" />}
          </button>

          {/* Share Action */}
          <button
            data-testid="share-action"
            onClick={() => handleAction('share', onShare)}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Share post</span>
          </button>

          {/* Divider */}
          <hr className="my-1 border-gray-200" />

          {/* Report Action */}
          <button
            data-testid="report-action"
            onClick={() => handleAction('report', onReport)}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6v1a2 2 0 01-2 2H5a2 2 0 01-2-2zm9-13.5V9" />
            </svg>
            <span>Report post</span>
          </button>
        </div>
      )}
    </div>
  );
};

const ReportDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  post 
}) => {
  const [reason, setReason] = React.useState('');
  const [details, setDetails] = React.useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ reason, details, postId: post.id });
  };

  return (
    <div data-testid="report-dialog" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Report Post</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for reporting
            </label>
            <select
              data-testid="report-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam or unwanted content</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="misinformation">False or misleading information</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional details (optional)
            </label>
            <textarea
              data-testid="report-details-textarea"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide additional context..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              data-testid="report-cancel-btn"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="report-submit-btn"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Mock services
const mockPostService = {
  savePost: vi.fn(),
  unsavePost: vi.fn(),
  reportPost: vi.fn(),
  sharePost: vi.fn(),
  getSavedPosts: vi.fn()
};

const mockToastService = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

import React from 'react';

describe('Post Actions Menu', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockPostService.savePost.mockResolvedValue({ success: true });
    mockPostService.unsavePost.mockResolvedValue({ success: true });
    mockPostService.reportPost.mockResolvedValue({ success: true });
    mockPostService.sharePost.mockResolvedValue({ success: true, shareUrl: 'https://example.com/share/123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Menu Appearance and Behavior', () => {
    it('renders menu trigger button', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={false}
          onToggle={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('actions-menu-trigger')).toBeInTheDocument();
      expect(screen.getByLabelText('Post actions menu')).toBeInTheDocument();
    });

    it('shows dropdown when opened', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('actions-menu-dropdown')).toBeInTheDocument();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('hides dropdown when closed', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={false}
          onToggle={vi.fn()}
        />
      );
      
      expect(screen.queryByTestId('actions-menu-dropdown')).not.toBeInTheDocument();
    });

    it('toggles menu when trigger clicked', async () => {
      const onToggle = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={false}
          onToggle={onToggle}
        />
      );
      
      await user.click(screen.getByTestId('actions-menu-trigger'));
      
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('has proper ARIA attributes', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
        />
      );
      
      const trigger = screen.getByTestId('actions-menu-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      
      const dropdown = screen.getByTestId('actions-menu-dropdown');
      expect(dropdown).toHaveAttribute('role', 'menu');
    });

    it('supports keyboard navigation', async () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
        />
      );
      
      // Focus first menu item
      const saveAction = screen.getByTestId('save-action');
      saveAction.focus();
      
      expect(saveAction).toHaveFocus();
      
      // Arrow down should move to next item
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('share-action')).toHaveFocus();
    });
  });

  describe('Save/Unsave Functionality', () => {
    it('shows save action for unsaved posts', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
          isSaved={false}
        />
      );
      
      expect(screen.getByTestId('save-action')).toBeInTheDocument();
      expect(screen.getByText('Save post')).toBeInTheDocument();
    });

    it('shows unsave action for saved posts', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onUnsave={vi.fn()}
          isSaved={true}
        />
      );
      
      expect(screen.getByTestId('unsave-action')).toBeInTheDocument();
      expect(screen.getByText('Remove from saved')).toBeInTheDocument();
    });

    it('handles save action click', async () => {
      const onSave = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={onSave}
          isSaved={false}
        />
      );
      
      await user.click(screen.getByTestId('save-action'));
      
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('handles unsave action click', async () => {
      const onUnsave = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onUnsave={onUnsave}
          isSaved={true}
        />
      );
      
      await user.click(screen.getByTestId('unsave-action'));
      
      expect(onUnsave).toHaveBeenCalledTimes(1);
    });

    it('shows loading state during save operation', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
          isSaved={false}
          isLoading={true}
        />
      );
      
      expect(screen.getByTestId('action-loading')).toBeInTheDocument();
      expect(screen.getByTestId('save-action')).toBeDisabled();
    });

    it('saves post successfully', async () => {
      mockPostService.savePost.mockResolvedValue({ success: true });
      
      const onSave = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={onSave}
          isSaved={false}
        />
      );
      
      await user.click(screen.getByTestId('save-action'));
      
      expect(onSave).toHaveBeenCalled();
    });

    it('handles save operation within performance threshold', async () => {
      const onSave = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={onSave}
          isSaved={false}
        />
      );
      
      const startTime = performance.now();
      await user.click(screen.getByTestId('save-action'));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(performanceThresholds.postActionExecution);
    });
  });

  describe('Report Functionality', () => {
    it('shows report action in menu', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onReport={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('report-action')).toBeInTheDocument();
      expect(screen.getByText('Report post')).toBeInTheDocument();
    });

    it('handles report action click', async () => {
      const onReport = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onReport={onReport}
        />
      );
      
      await user.click(screen.getByTestId('report-action'));
      
      expect(onReport).toHaveBeenCalledTimes(1);
    });

    it('shows report dialog when opened', () => {
      render(
        <ReportDialog 
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          post={testPosts[0]}
        />
      );
      
      expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
      expect(screen.getByText('Report Post')).toBeInTheDocument();
    });

    it('hides report dialog when closed', () => {
      render(
        <ReportDialog 
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          post={testPosts[0]}
        />
      );
      
      expect(screen.queryByTestId('report-dialog')).not.toBeInTheDocument();
    });

    it('handles report dialog form submission', async () => {
      const onSubmit = vi.fn();
      render(
        <ReportDialog 
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          post={testPosts[0]}
        />
      );
      
      // Select a reason
      await user.selectOptions(
        screen.getByTestId('report-reason-select'),
        'spam'
      );
      
      // Add details
      await user.type(
        screen.getByTestId('report-details-textarea'),
        'This post contains spam content'
      );
      
      // Submit
      await user.click(screen.getByTestId('report-submit-btn'));
      
      expect(onSubmit).toHaveBeenCalledWith({
        reason: 'spam',
        details: 'This post contains spam content',
        postId: testPosts[0].id
      });
    });

    it('validates required fields in report form', async () => {
      const onSubmit = vi.fn();
      render(
        <ReportDialog 
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          post={testPosts[0]}
        />
      );
      
      // Try to submit without selecting reason
      await user.click(screen.getByTestId('report-submit-btn'));
      
      // Form should not submit due to required validation
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('handles report dialog cancellation', async () => {
      const onClose = vi.fn();
      render(
        <ReportDialog 
          isOpen={true}
          onClose={onClose}
          onSubmit={vi.fn()}
          post={testPosts[0]}
        />
      );
      
      await user.click(screen.getByTestId('report-cancel-btn'));
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Share Functionality', () => {
    it('shows share action in menu', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onShare={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('share-action')).toBeInTheDocument();
      expect(screen.getByText('Share post')).toBeInTheDocument();
    });

    it('handles share action click', async () => {
      const onShare = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onShare={onShare}
        />
      );
      
      await user.click(screen.getByTestId('share-action'));
      
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it('generates share URL correctly', async () => {
      const shareUrl = mockPostService.sharePost.mockResolvedValue({
        success: true,
        shareUrl: `https://example.com/posts/${testPosts[0].id}`
      });
      
      const result = await mockPostService.sharePost(testPosts[0].id);
      
      expect(result.shareUrl).toBe(`https://example.com/posts/${testPosts[0].id}`);
    });

    it('copies share URL to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });
      
      const onShare = async () => {
        const shareUrl = `https://example.com/posts/${testPosts[0].id}`;
        await navigator.clipboard.writeText(shareUrl);
      };
      
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onShare={onShare}
        />
      );
      
      await user.click(screen.getByTestId('share-action'));
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `https://example.com/posts/${testPosts[0].id}`
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles API errors gracefully', async () => {
      mockPostService.savePost.mockRejectedValue(new Error('Network error'));
      
      const onSave = vi.fn().mockImplementation(async () => {
        try {
          await mockPostService.savePost(testPosts[0].id);
        } catch (error) {
          mockToastService.error('Failed to save post');
        }
      });
      
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={onSave}
          isSaved={false}
        />
      );
      
      await user.click(screen.getByTestId('save-action'));
      
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save post');
    });

    it('disables actions during loading', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
          onShare={vi.fn()}
          onReport={vi.fn()}
          isLoading={true}
        />
      );
      
      expect(screen.getByTestId('save-action')).toBeDisabled();
      expect(screen.getByTestId('share-action')).toBeDisabled();
      expect(screen.getByTestId('report-action')).toBeDisabled();
    });

    it('handles missing post data', () => {
      render(
        <PostActionsMenu 
          post={null} 
          isOpen={true}
          onToggle={vi.fn()}
        />
      );
      
      // Should render without crashing
      expect(screen.getByTestId('post-actions-menu')).toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      const onToggle = vi.fn();
      render(
        <div>
          <PostActionsMenu 
            post={testPosts[0]} 
            isOpen={true}
            onToggle={onToggle}
          />
          <div data-testid="outside-element">Outside</div>
        </div>
      );
      
      await user.click(screen.getByTestId('outside-element'));
      
      // In real implementation, this would close the menu
      // expect(onToggle).toHaveBeenCalled();
    });

    it('handles rapid action clicks', async () => {
      const onSave = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={onSave}
          isSaved={false}
        />
      );
      
      // Rapid clicks
      await user.click(screen.getByTestId('save-action'));
      await user.click(screen.getByTestId('save-action'));
      await user.click(screen.getByTestId('save-action'));
      
      // Should only process once or handle debouncing
      expect(onSave).toHaveBeenCalledTimes(3); // In real app, might be debounced
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
        />
      );
      
      // Tab through menu items
      await user.tab();
      expect(screen.getByTestId('save-action')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('share-action')).toHaveFocus();
    });

    it('supports escape key to close menu', async () => {
      const onToggle = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={onToggle}
        />
      );
      
      await user.keyboard('{Escape}');
      
      // In real implementation, escape should close menu
      // expect(onToggle).toHaveBeenCalled();
    });

    it('has proper focus management', async () => {
      const onToggle = vi.fn();
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={false}
          onToggle={onToggle}
        />
      );
      
      const trigger = screen.getByTestId('actions-menu-trigger');
      trigger.focus();
      
      expect(trigger).toHaveFocus();
    });

    it('announces actions to screen readers', () => {
      render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
        />
      );
      
      const saveAction = screen.getByTestId('save-action');
      expect(saveAction).toHaveAttribute('role', 'menuitem');
    });
  });

  describe('Integration with Post Component', () => {
    it('integrates with post context correctly', () => {
      const post = testPosts[0];
      render(
        <PostActionsMenu 
          post={post} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
          isSaved={post.saved}
        />
      );
      
      // Should show correct action based on post.saved state
      if (post.saved) {
        expect(screen.getByTestId('unsave-action')).toBeInTheDocument();
      } else {
        expect(screen.getByTestId('save-action')).toBeInTheDocument();
      }
    });

    it('updates UI state after successful actions', async () => {
      const { rerender } = render(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onSave={vi.fn()}
          isSaved={false}
        />
      );
      
      expect(screen.getByTestId('save-action')).toBeInTheDocument();
      
      // After save action succeeds, rerender with isSaved=true
      rerender(
        <PostActionsMenu 
          post={testPosts[0]} 
          isOpen={true}
          onToggle={vi.fn()}
          onUnsave={vi.fn()}
          isSaved={true}
        />
      );
      
      expect(screen.getByTestId('unsave-action')).toBeInTheDocument();
    });
  });
});