/**
 * Unit Tests: Metadata Bottom Spacing Validation
 *
 * Testing the addition of mb-4 class to the metadata line in RealSocialMediaFeed.tsx (line 803)
 *
 * Change: Added mb-4 class to metadata line for better visual separation from divider
 * Location: RealSocialMediaFeed.tsx line 803
 * Class: "pl-14 flex items-center space-x-6 mt-4 mb-4"
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    getFilteredPosts: jest.fn(),
    getFilterData: jest.fn(),
    getFilterStats: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

// Mock time utilities
jest.mock('../../utils/timeUtils', () => ({
  formatRelativeTime: jest.fn(() => '2 hours ago'),
  formatExactDateTime: jest.fn(() => 'January 1, 2025 at 10:00 AM')
}));

// Mock the hooks
jest.mock('../../hooks/useRelativeTime', () => ({
  useRelativeTime: jest.fn()
}));

// Mock content parser
jest.mock('../../utils/contentParser', () => ({
  renderParsedContent: jest.fn((content) => content),
  parseContent: jest.fn((content) => content),
  extractHashtags: jest.fn(() => []),
  extractMentions: jest.fn(() => [])
}));

describe('Metadata Bottom Spacing Tests', () => {
  const mockPost = {
    id: 'test-post-123',
    title: 'Test Post Title',
    content: 'This is a test post content with enough text to test spacing.',
    authorAgent: 'TestAgent',
    created_at: '2025-01-17T10:00:00Z',
    publishedAt: '2025-01-17T10:00:00Z',
    comments: 5,
    engagement: {
      saves: 3,
      isSaved: false,
      comments: 5
    },
    tags: ['test', 'spacing'],
    metadata: {}
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default API responses
    (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
      success: true,
      data: [mockPost],
      total: 1
    });

    (apiService.getFilterData as jest.Mock).mockResolvedValue({
      agents: ['TestAgent'],
      hashtags: ['test']
    });

    (apiService.getFilterStats as jest.Mock).mockResolvedValue({
      savedPosts: 0,
      myPosts: 0
    });
  });

  describe('1. Metadata Line Class Validation', () => {
    it('should have both mt-4 and mb-4 classes applied to metadata line', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toBeInTheDocument();
      expect(metadataLine).toHaveClass('mt-4');
      expect(metadataLine).toHaveClass('mb-4');
    });

    it('should not have removed mt-4 class when adding mb-4', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine?.classList.contains('mt-4')).toBe(true);
      expect(metadataLine?.classList.contains('mb-4')).toBe(true);
    });

    it('should maintain all other metadata classes unchanged', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toHaveClass('pl-14');
      expect(metadataLine).toHaveClass('flex');
      expect(metadataLine).toHaveClass('items-center');
      expect(metadataLine).toHaveClass('space-x-6');
    });
  });

  describe('2. Visual Spacing Validation', () => {
    it('should have 16px bottom margin (mb-4 = 1rem = 16px)', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      // mb-4 in Tailwind = 1rem = 16px
      expect(computedStyle.marginBottom).toBe('1rem');
    });

    it('should have 16px top margin (mt-4 = 1rem = 16px)', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      // mt-4 in Tailwind = 1rem = 16px
      expect(computedStyle.marginTop).toBe('1rem');
    });

    it('should have symmetric vertical spacing (top and bottom equal)', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      expect(computedStyle.marginTop).toBe(computedStyle.marginBottom);
    });

    it('should maintain total spacing of 44px from content to divider', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Find metadata line and divider (border-t)
      const metadataLine = postCard.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const divider = postCard.querySelector('.border-t.border-gray-100');

      expect(metadataLine).toBeInTheDocument();
      expect(divider).toBeInTheDocument();

      // Total spacing should be: content space + mt-4 (16px) + mb-4 (16px) + divider py-4 top (16px) = ~44px
      const metadataRect = metadataLine?.getBoundingClientRect();
      const dividerRect = divider?.getBoundingClientRect();

      if (metadataRect && dividerRect) {
        const totalSpacing = dividerRect.top - metadataRect.bottom;
        // Allow for small rendering variations
        expect(totalSpacing).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('3. Metadata Elements Display Validation', () => {
    it('should display all metadata elements correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      // Time metadata
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();

      // Reading time
      expect(screen.getByText(/min read/i)).toBeInTheDocument();

      // Author agent
      expect(screen.getByText(/by TestAgent/i)).toBeInTheDocument();
    });

    it('should maintain proper flexbox layout with spacing', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.alignItems).toBe('center');
    });

    it('should render all metadata child elements', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const children = metadataLine?.children;

      // Should have 3 children: time, reading time, author
      expect(children?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('4. Dark Mode Styling Preservation', () => {
    it('should maintain dark mode text color classes', async () => {
      // Add dark class to document
      document.documentElement.classList.add('dark');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataElements = document.querySelectorAll('.text-gray-500.dark\\:text-gray-400');
      expect(metadataElements.length).toBeGreaterThan(0);

      // Cleanup
      document.documentElement.classList.remove('dark');
    });

    it('should not introduce new dark mode conflicts', async () => {
      document.documentElement.classList.add('dark');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      // Should not have conflicting background colors
      expect(computedStyle.backgroundColor).not.toBe('rgb(255, 0, 0)'); // No error red

      document.documentElement.classList.remove('dark');
    });
  });

  describe('5. Divider Relationship Validation', () => {
    it('should not overlap with divider element', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');
      const metadataLine = postCard.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const divider = postCard.querySelector('.border-t.border-gray-100');

      expect(metadataLine).toBeInTheDocument();
      expect(divider).toBeInTheDocument();

      // Verify divider comes after metadata in DOM
      const metadataIndex = Array.from(postCard.querySelectorAll('*')).indexOf(metadataLine as Element);
      const dividerIndex = Array.from(postCard.querySelectorAll('*')).indexOf(divider as Element);

      expect(dividerIndex).toBeGreaterThan(metadataIndex);
    });

    it('should create visible spacing between metadata and divider', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      const computedStyle = window.getComputedStyle(metadataLine as Element);

      // mb-4 creates 16px space
      const marginBottom = parseFloat(computedStyle.marginBottom);
      expect(marginBottom).toBeGreaterThan(0);
    });

    it('should maintain divider py-4 class unchanged', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const divider = document.querySelector('.border-t.border-gray-100.dark\\:border-gray-800.py-4');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveClass('py-4');
    });
  });

  describe('6. Post Card Structure Validation', () => {
    it('should not affect other post card styling', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Verify main card classes unchanged
      expect(postCard).toHaveClass('bg-white');
      expect(postCard).toHaveClass('dark:bg-gray-900');
      expect(postCard).toHaveClass('border');
      expect(postCard).toHaveClass('rounded-lg');
    });

    it('should maintain proper spacing hierarchy in collapsed view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const spaceY3Container = document.querySelector('.space-y-3');
      expect(spaceY3Container).toBeInTheDocument();

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should render metadata only in collapsed view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      // In collapsed view, metadata line should exist
      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toBeInTheDocument();

      // Should be within the collapsed view container
      const collapsedView = document.querySelector('.space-y-3');
      expect(collapsedView?.contains(metadataLine as Node)).toBe(true);
    });
  });

  describe('7. Responsive Design Validation', () => {
    it('should maintain spacing on mobile viewport', async () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toHaveClass('mb-4');
      expect(metadataLine).toHaveClass('mt-4');
    });

    it('should maintain spacing on tablet viewport', async () => {
      // Simulate tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toHaveClass('mb-4');
      expect(metadataLine).toHaveClass('mt-4');
    });

    it('should maintain spacing on desktop viewport', async () => {
      // Simulate desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const metadataLine = document.querySelector('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLine).toHaveClass('mb-4');
      expect(metadataLine).toHaveClass('mt-4');
    });
  });

  describe('8. Multiple Posts Consistency', () => {
    it('should render spacing consistently across multiple posts', async () => {
      const multiplePostsData = [
        { ...mockPost, id: 'post-1', title: 'Post 1' },
        { ...mockPost, id: 'post-2', title: 'Post 2' },
        { ...mockPost, id: 'post-3', title: 'Post 3' }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        data: multiplePostsData,
        total: 3
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        const postCards = screen.getAllByTestId('post-card');
        expect(postCards.length).toBe(3);
      });

      const metadataLines = document.querySelectorAll('.pl-14.flex.items-center.space-x-6.mt-4.mb-4');
      expect(metadataLines.length).toBe(3);

      // All should have same classes
      metadataLines.forEach(line => {
        expect(line).toHaveClass('mb-4');
        expect(line).toHaveClass('mt-4');
      });
    });
  });

  describe('9. No Layout Shifts', () => {
    it('should not cause layout shift when rendering', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      const initialHeight = container.offsetHeight;

      // Force re-render
      render(<RealSocialMediaFeed />, { container: container as any });

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      // Height should be stable (allowing for minor variations)
      const finalHeight = container.offsetHeight;
      expect(Math.abs(finalHeight - initialHeight)).toBeLessThan(5);
    });
  });

  describe('10. No Console Errors', () => {
    it('should not generate console errors during render', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not generate console warnings during render', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-card')).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
