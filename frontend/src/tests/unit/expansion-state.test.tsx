/**
 * Expansion State Test Suite
 *
 * Tests for post expansion/collapse behavior to ensure posts render
 * in fully collapsed state by default (not half-expanded).
 *
 * Fixes: Issue where "How Agent Feed Works" post appeared half-expanded
 *
 * @author Agent-4 (Debug and Fix Half-Expanded State)
 * @date 2025-11-04
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealSocialMediaFeed } from '../../components/RealSocialMediaFeed';
import { apiService } from '../../services/api';

// Mock API service
jest.mock('../../services/api');

// Mock data - includes long-form content that was causing half-expansion
const mockPosts = [
  {
    id: 'post-1',
    title: 'How Agent Feed Works',
    content: `# Welcome to Agent Feed

This is a comprehensive guide to how the Agent Feed system works. It includes detailed information about the architecture, design patterns, and implementation details.

## Key Features

- Real-time updates via WebSocket
- Markdown rendering with syntax highlighting
- Interactive mentions and hashtags
- Advanced filtering and search capabilities
- Thread-based commenting system

## Architecture Overview

The system is built using React with TypeScript, featuring a modern component-based architecture. The backend uses Node.js with Express and SQLite for data persistence.

This content is intentionally long to test the collapsed state rendering and ensure that posts don't appear "half-expanded" when they should be fully collapsed.`,
    authorAgent: 'system',
    created_at: '2025-11-04T00:00:00.000Z',
    engagement: { comments: 5, likes: 10, shares: 2, views: 100 },
    tags: ['guide', 'documentation']
  },
  {
    id: 'post-2',
    title: 'Short Post',
    content: 'This is a short post with minimal content.',
    authorAgent: 'lambda-vi',
    created_at: '2025-11-03T00:00:00.000Z',
    engagement: { comments: 2, likes: 5, shares: 1, views: 50 },
    tags: ['test']
  }
];

const mockApiResponse = {
  success: true,
  data: mockPosts,
  total: mockPosts.length
};

describe('Post Expansion State', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock API calls
    (apiService.getAgentPosts as jest.Mock).mockResolvedValue(mockApiResponse);
    (apiService.getFilterData as jest.Mock).mockResolvedValue({
      agents: ['system', 'lambda-vi'],
      hashtags: ['guide', 'documentation', 'test']
    });
    (apiService.getFilterStats as jest.Mock).mockResolvedValue({
      savedPosts: 0,
      myPosts: 0
    });
    (apiService.on as jest.Mock).mockImplementation(() => {});
    (apiService.off as jest.Mock).mockImplementation(() => {});
  });

  describe('Initial Rendering (Collapsed State)', () => {
    it('should render all posts in fully collapsed state by default', async () => {
      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Check that the long-form post is present
      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      expect(postCard).toBeInTheDocument();

      // Verify the collapsed preview has CSS line-clamp applied
      const previewDiv = postCard?.querySelector('.overflow-hidden');
      expect(previewDiv).toBeInTheDocument();
      expect(previewDiv).toHaveStyle({
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        maxHeight: '4.5rem'
      });
    });

    it('should show "Click to expand" indicator for collapsed posts', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Find all "Click to expand" indicators
      const expandIndicators = screen.getAllByText('Click to expand');
      expect(expandIndicators.length).toBeGreaterThan(0);
    });

    it('should not show full content in collapsed state', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // The full content should not be visible (Architecture Overview is far down)
      expect(screen.queryByText(/Architecture Overview/)).not.toBeInTheDocument();
    });

    it('should apply consistent collapsed height to all posts', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Get all post previews
      const postCards = screen.getAllByTestId('post-card');
      const previewDivs = postCards
        .map(card => card.querySelector('.overflow-hidden'))
        .filter(div => div !== null);

      // All should have the same max-height constraint
      previewDivs.forEach(div => {
        expect(div).toHaveStyle({ maxHeight: '4.5rem' });
      });
    });
  });

  describe('Expansion Toggle Behavior', () => {
    it('should expand post when chevron button is clicked', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Find the chevron down button
      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const chevronButton = postCard?.querySelector('[aria-label="Expand post"]');

      expect(chevronButton).toBeInTheDocument();

      // Click to expand
      if (chevronButton) {
        fireEvent.click(chevronButton);
      }

      // After expansion, full content should be visible
      await waitFor(() => {
        expect(screen.getByText(/Architecture Overview/)).toBeInTheDocument();
      });
    });

    it('should show "Click to expand" indicator when collapsed', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Click the expansion indicator
      const expandIndicator = screen.getAllByText('Click to expand')[0];
      fireEvent.click(expandIndicator);

      // Indicator should disappear after expansion
      await waitFor(() => {
        expect(screen.queryByText('Click to expand')).not.toBeInTheDocument();
      });
    });

    it('should collapse post when chevron up button is clicked', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // First expand
      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const expandButton = postCard?.querySelector('[aria-label="Expand post"]');
      if (expandButton) {
        fireEvent.click(expandButton);
      }

      // Wait for expansion
      await waitFor(() => {
        expect(screen.getByText(/Architecture Overview/)).toBeInTheDocument();
      });

      // Then collapse
      const collapseButton = postCard?.querySelector('[aria-label="Collapse post"]');
      if (collapseButton) {
        fireEvent.click(collapseButton);
      }

      // Full content should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText(/Architecture Overview/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Content Truncation Logic', () => {
    it('should apply getHookContent() for preview generation', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // The preview should show the beginning of the content
      expect(screen.getByText(/Welcome to Agent Feed/)).toBeInTheDocument();

      // But not the full markdown headers (those are further down)
      expect(screen.queryByText(/Key Features/)).not.toBeInTheDocument();
    });

    it('should handle short content without truncation issues', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Short Post')).toBeInTheDocument();
      });

      // Short content should still have the CSS constraints applied
      const shortPostCard = screen.getByText('Short Post').closest('[data-testid="post-card"]');
      const previewDiv = shortPostCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveStyle({
        display: '-webkit-box',
        WebkitLineClamp: 3,
        maxHeight: '4.5rem'
      });
    });
  });

  describe('CSS Line Clamp Implementation', () => {
    it('should apply -webkit-box display mode', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const previewDiv = postCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveStyle({ display: '-webkit-box' });
    });

    it('should set WebkitLineClamp to 3 lines', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const previewDiv = postCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveStyle({ WebkitLineClamp: 3 });
    });

    it('should set vertical box orientation', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const previewDiv = postCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveStyle({ WebkitBoxOrient: 'vertical' });
    });

    it('should set maxHeight to 4.5rem (3 lines)', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const previewDiv = postCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveStyle({ maxHeight: '4.5rem' });
    });

    it('should include overflow-hidden class', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      const postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      const previewDiv = postCard?.querySelector('.overflow-hidden');

      expect(previewDiv).toHaveClass('overflow-hidden');
    });
  });

  describe('Regression Prevention', () => {
    it('should NOT render posts in half-expanded state', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Get all post cards
      const postCards = screen.getAllByTestId('post-card');

      // Each post should either be:
      // 1. Fully collapsed (has CSS line-clamp)
      // 2. Fully expanded (no line-clamp, shows full content)
      postCards.forEach(card => {
        const previewDiv = card.querySelector('.overflow-hidden');
        const hasChevronDown = card.querySelector('[aria-label="Expand post"]');
        const hasChevronUp = card.querySelector('[aria-label="Collapse post"]');

        if (hasChevronDown) {
          // Collapsed state - must have CSS constraints
          expect(previewDiv).toBeInTheDocument();
          expect(previewDiv).toHaveStyle({ maxHeight: '4.5rem' });
        } else if (hasChevronUp) {
          // Expanded state - no constraints needed
          expect(previewDiv).toBeFalsy();
        }
      });
    });

    it('should maintain collapsed state after re-render', async () => {
      const { rerender } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      // Verify collapsed
      let postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      let previewDiv = postCard?.querySelector('.overflow-hidden');
      expect(previewDiv).toHaveStyle({ maxHeight: '4.5rem' });

      // Re-render
      rerender(<RealSocialMediaFeed />);

      // Should still be collapsed
      await waitFor(() => {
        expect(screen.getByText('How Agent Feed Works')).toBeInTheDocument();
      });

      postCard = screen.getByText('How Agent Feed Works').closest('[data-testid="post-card"]');
      previewDiv = postCard?.querySelector('.overflow-hidden');
      expect(previewDiv).toHaveStyle({ maxHeight: '4.5rem' });
    });
  });
});
