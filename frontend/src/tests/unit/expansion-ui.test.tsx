import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';

// Mock API service
vi.mock('../../services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(() => Promise.resolve({
      success: true,
      data: [
        {
          id: 'test-post-1',
          title: 'Welcome to Agent Feed!',
          content: '# Welcome to Agent Feed!\n\nThis is the first paragraph with some content.\n\nSecond paragraph here.',
          authorAgent: 'lambda-vi',
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        }
      ],
      total: 1
    })),
    getFilteredPosts: vi.fn(() => Promise.resolve({
      success: true,
      data: [],
      total: 0
    })),
    getFilterData: vi.fn(() => Promise.resolve({
      agents: [],
      hashtags: []
    })),
    getFilterStats: vi.fn(() => Promise.resolve({
      savedPosts: 0,
      myPosts: 0
    })),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock hooks
vi.mock('../../hooks/useRelativeTime', () => ({
  useRelativeTime: vi.fn()
}));

vi.mock('../../hooks/useTicketUpdates', () => ({
  useTicketUpdates: vi.fn()
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
    dismissToast: vi.fn()
  }))
}));

vi.mock('../../hooks/useSystemInitialization', () => ({
  useSystemInitialization: vi.fn(() => ({
    initialized: true,
    loading: false,
    error: null
  }))
}));

describe('Expansion UI Tests', () => {
  describe('Collapsed View', () => {
    it('should show "Click to expand" indicator in collapsed view', async () => {
      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Check for expansion indicator
      const expandIndicator = screen.getByText(/click to expand/i);
      expect(expandIndicator).toBeInTheDocument();
      expect(expandIndicator).toBeVisible();
    });

    it('should display expansion indicator with chevron icon', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Check that the expansion indicator has proper styling
      const expandIndicator = screen.getByText(/click to expand/i);
      expect(expandIndicator.parentElement).toHaveClass('text-blue-600');
      expect(expandIndicator.parentElement).toHaveClass('cursor-pointer');
    });

    it('should show collapsed hook content in collapsed view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Post should be initially collapsed (not showing full content)
      const postCard = screen.getByTestId('post-card');
      expect(postCard).toBeInTheDocument();

      // Should show "Click to expand" indicator
      expect(screen.getByText(/click to expand/i)).toBeInTheDocument();
    });
  });

  describe('Expanded View', () => {
    it('should show title only once when expanded', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Count how many times the title appears
      const titleElements = screen.getAllByText('Welcome to Agent Feed!');

      // Title should appear only once (in markdown content, not as separate h2)
      // Note: The title appears in the markdown H1, not as a separate element
      expect(titleElements.length).toBe(1);
    });

    it('should not show duplicate title in expanded view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Should not find separate h2 element for title (only in markdown)
      const h2Elements = document.querySelectorAll('h2.text-2xl.font-bold');
      expect(h2Elements.length).toBe(0);
    });

    it('should hide "Click to expand" when post is expanded', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Verify indicator is visible when collapsed
      expect(screen.getByText(/click to expand/i)).toBeInTheDocument();

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // "Click to expand" should not be visible in expanded view
      expect(screen.queryByText(/click to expand/i)).not.toBeInTheDocument();
    });
  });

  describe('Expansion Toggle Behavior', () => {
    it('should toggle between collapsed and expanded states', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Initially collapsed
      expect(screen.getByLabelText('Expand post')).toBeInTheDocument();
      expect(screen.getByText(/click to expand/i)).toBeInTheDocument();

      // Expand
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Collapse again
      const collapseButton = screen.getByLabelText('Collapse post');
      fireEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Expand post')).toBeInTheDocument();
      });

      // Should show "Click to expand" again
      expect(screen.getByText(/click to expand/i)).toBeInTheDocument();
    });

    it('should maintain expansion state for individual posts', async () => {
      // Mock multiple posts
      const { apiService } = await import('../../services/api');
      vi.mocked(apiService.getAgentPosts).mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'post-1',
            title: 'First Post',
            content: '# First Post\n\nContent here.',
            authorAgent: 'lambda-vi',
            created_at: new Date().toISOString(),
            engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
          },
          {
            id: 'post-2',
            title: 'Second Post',
            content: '# Second Post\n\nMore content.',
            authorAgent: 'system',
            created_at: new Date(Date.now() - 1000).toISOString(),
            engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
          }
        ],
        total: 2
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        const posts = screen.getAllByTestId('post-card');
        expect(posts.length).toBe(2);
      });

      // Expand first post
      const expandButtons = screen.getAllByLabelText('Expand post');
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Second post should still show "Click to expand"
      const expandIndicators = screen.getAllByText(/click to expand/i);
      expect(expandIndicators.length).toBe(1); // Only second post
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for expansion controls', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Collapsed state
      expect(screen.getByLabelText('Expand post')).toBeInTheDocument();

      // Expand
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });
    });

    it('should indicate expansion is interactive via cursor style', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const expandIndicator = screen.getByText(/click to expand/i);
      expect(expandIndicator.parentElement).toHaveClass('cursor-pointer');
    });
  });
});
