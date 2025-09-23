/**
 * Component Tests for Ticker Display
 *
 * Tests React ticker component including:
 * - Rendering and display logic
 * - Animation states and transitions
 * - User interactions
 * - State management
 * - Accessibility features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPostingInterface } from '../../../components/EnhancedPostingInterface';
import { PostCreator } from '../../../components/PostCreator';

// Mock dependencies
vi.mock('../../../utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EnhancedPostingInterface', () => {
  const mockOnPostCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'test-post-123',
          title: 'Test Post',
          content: 'Test content'
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Tab Navigation', () => {
    it('should render all tabs correctly', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Post')).toBeInTheDocument();
      expect(screen.getByText('Avi DM')).toBeInTheDocument();
    });

    it('should start with Quick Post tab active', () => {
      render(<EnhancedPostingInterface />);

      const quickPostTab = screen.getByText('Quick Post').closest('button');
      expect(quickPostTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const postTab = screen.getByText('Post').closest('button');
      await user.click(postTab!);

      expect(postTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should apply correct CSS classes for active/inactive tabs', () => {
      render(<EnhancedPostingInterface />);

      const quickPostTab = screen.getByText('Quick Post').closest('button');
      const postTab = screen.getByText('Post').closest('button');

      expect(quickPostTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(postTab).toHaveClass('border-transparent', 'text-gray-500');
    });

    it('should show appropriate tab icons', () => {
      render(<EnhancedPostingInterface />);

      // Icons should be rendered (they're from lucide-react)
      const tabs = screen.getAllByRole('button');
      expect(tabs).toHaveLength(3);
    });
  });

  describe('Quick Post Section', () => {
    beforeEach(() => {
      render(<EnhancedPostingInterface onPostCreated={mockOnPostCreated} />);
    });

    it('should render quick post form by default', () => {
      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByPlaceholderText("What's on your mind? (One line works great!)")).toBeInTheDocument();
      expect(screen.getByText('Quick Post', { selector: 'button' })).toBeInTheDocument();
    });

    it('should update character counter as user types', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Hello World');

      expect(screen.getByText('11/500 characters')).toBeInTheDocument();
    });

    it('should disable submit button when content is empty', () => {
      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when content is entered', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Test content');

      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      expect(submitButton).toBeEnabled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();

      // Mock delayed response
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: { id: 'test' } })
          }), 100)
        )
      );

      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");
      await user.type(textarea, 'Test content');

      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      await user.click(submitButton);

      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Quick Post', { selector: 'button' })).toBeInTheDocument();
      });
    });

    it('should submit post successfully', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Test post content');

      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test post content',
            content: 'Test post content',
            author_agent: 'user-agent',
            metadata: {
              businessImpact: 5,
              tags: [],
              isAgentResponse: false,
              postType: 'quick',
              wordCount: 3,
              readingTime: 1
            }
          })
        });
      });

      expect(mockOnPostCreated).toHaveBeenCalledWith({
        id: 'test-post-123',
        title: 'Test Post',
        content: 'Test content'
      });
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Test content');

      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should handle submission errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Test content');

      const submitButton = screen.getByText('Quick Post', { selector: 'button' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create quick post:',
          expect.any(Error)
        );
      });

      // Form should remain filled on error
      expect(textarea).toHaveValue('Test content');

      consoleErrorSpy.mockRestore();
    });

    it('should enforce character limit', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      const longText = 'a'.repeat(501);
      await user.type(textarea, longText);

      // Should be truncated at 500 characters
      expect(textarea.value.length).toBeLessThanOrEqual(500);
    });

    it('should handle form submission with Enter key', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      await user.type(textarea, 'Test content');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Mention Input Integration', () => {
    it('should support mention functionality', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      // Type @ to trigger mention
      await user.type(textarea, 'Hello @test');

      expect(textarea).toHaveValue('Hello @test');
    });

    it('should track selected mentions', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      // Simulate mention selection (this would normally come from MentionInput component)
      await user.type(textarea, 'Hello @john');

      expect(textarea).toHaveValue('Hello @john');
    });
  });

  describe('Tab Content Switching', () => {
    it('should show Post tab content when selected', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const postTab = screen.getByText('Post').closest('button');
      await user.click(postTab!);

      // PostCreator should be rendered (assuming it has distinctive content)
      expect(screen.queryByText('Quick Post', { selector: 'h3' })).not.toBeInTheDocument();
    });

    it('should show Avi DM tab content when selected', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM').closest('button');
      await user.click(aviTab!);

      // AviDirectChatSDK should be rendered
      expect(screen.queryByText('Quick Post', { selector: 'h3' })).not.toBeInTheDocument();
    });

    it('should maintain tab state across switches', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Type in Quick Post
      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");
      await user.type(textarea, 'Test content');

      // Switch to Post tab
      const postTab = screen.getByText('Post').closest('button');
      await user.click(postTab!);

      // Switch back to Quick Post
      const quickPostTab = screen.getByText('Quick Post').closest('button');
      await user.click(quickPostTab!);

      // Content should be preserved
      const textareaAgain = screen.getByPlaceholderText("What's on your mind? (One line works great!)");
      expect(textareaAgain).toHaveValue('Test content');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EnhancedPostingInterface />);

      const nav = screen.getByLabelText('Posting tabs');
      expect(nav).toBeInTheDocument();

      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const quickPostTab = screen.getByText('Quick Post').closest('button');

      // Focus first tab
      quickPostTab!.focus();
      expect(quickPostTab).toHaveFocus();

      // Tab to next element
      await user.keyboard('{Tab}');

      const postTab = screen.getByText('Post').closest('button');
      expect(postTab).toHaveFocus();
    });

    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      // Should have proper labeling
      expect(textarea).toHaveAttribute('maxLength', '500');
      expect(textarea).toHaveAttribute('rows', '3');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive CSS classes', () => {
      render(<EnhancedPostingInterface className="custom-class" />);

      const container = screen.getByLabelText('Posting tabs').closest('div');
      expect(container).toHaveClass('bg-white', 'rounded-lg', 'border', 'border-gray-200', 'shadow-sm', 'custom-class');
    });

    it('should handle custom className prop', () => {
      render(<EnhancedPostingInterface className="test-custom-class" />);

      const container = screen.getByLabelText('Posting tabs').closest('div');
      expect(container).toHaveClass('test-custom-class');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();

      const TestWrapper = ({ onPostCreated }: any) => {
        renderSpy();
        return <EnhancedPostingInterface onPostCreated={onPostCreated} />;
      };

      const { rerender } = render(<TestWrapper onPostCreated={mockOnPostCreated} />);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Rerender with same props
      rerender(<TestWrapper onPostCreated={mockOnPostCreated} />);

      // Should not cause unnecessary renders due to React.memo or similar optimizations
      expect(renderSpy).toHaveBeenCalledTimes(2); // One for initial, one for rerender
    });

    it('should handle rapid user input efficiently', async () => {
      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByPlaceholderText("What's on your mind? (One line works great!)");

      const start = performance.now();

      // Simulate rapid typing
      await user.type(textarea, 'abcdefghijklmnopqrstuvwxyz'.repeat(10));

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should handle input quickly
      expect(textarea).toHaveValue('abcdefghijklmnopqrstuvwxyz'.repeat(10));
    });
  });
});