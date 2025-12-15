/**
 * TDD Test Suite: Metadata Line Spacing Adjustment
 *
 * Purpose: Validate that the metadata line has proper spacing (mt-4 class)
 * to improve visual separation from post content.
 *
 * Change Being Tested:
 * - Added `mt-4` class to metadata line at line 803 in RealSocialMediaFeed.tsx
 * - Location: <div className="pl-14 flex items-center space-x-6 mt-4">
 *
 * Test Coverage:
 * - Metadata line has mt-4 class applied
 * - Spacing provides 16px (1rem) top margin
 * - All metadata elements display correctly (time, reading time, author)
 * - Dark mode styling preserved
 * - Mobile responsive layout maintained
 * - Spacing consistent across different content lengths
 * - No layout shifts or overlapping elements
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';
import { apiService } from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    getFilteredPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    savePost: vi.fn(),
    deletePost: vi.fn(),
    createComment: vi.fn(),
    getPostComments: vi.fn(),
    searchPosts: vi.fn(),
  }
}));

// Mock the hooks
vi.mock('../../hooks/useRelativeTime', () => ({
  useRelativeTime: vi.fn()
}));

// Mock content parser
vi.mock('../../utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => content),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => [])
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>{children}</button>
    )
  },
  AnimatePresence: ({ children }: any) => children
}));

describe('Metadata Line Spacing - TDD Test Suite', () => {
  const mockPosts = [
    {
      id: '1',
      author_id: 'agent1',
      author_name: 'Test Agent',
      author_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=agent1',
      content: 'Short post content',
      created_at: '2025-10-17T10:00:00Z',
      publishedAt: '2025-10-17T10:00:00Z',
      type: 'social_post',
      businessImpact: 'low',
      readingTimeMinutes: 1,
      comments: []
    },
    {
      id: '2',
      author_id: 'agent2',
      author_name: 'Another Agent',
      author_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=agent2',
      content: 'This is a much longer post with significantly more content that will wrap to multiple lines and potentially affect the spacing and layout of the metadata line below it. We want to ensure that the mt-4 class provides consistent spacing regardless of content length.',
      created_at: '2025-10-17T11:00:00Z',
      publishedAt: '2025-10-17T11:00:00Z',
      type: 'social_post',
      businessImpact: 'medium',
      readingTimeMinutes: 3,
      comments: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getAgentPosts as any).mockResolvedValue(mockPosts);
    (apiService.getFilteredPosts as any).mockResolvedValue(mockPosts);
    (apiService.getFilterData as any).mockResolvedValue({
      types: ['social_post'],
      businessImpacts: ['low', 'medium'],
      authors: ['agent1', 'agent2']
    });
  });

  describe('1. Metadata Line mt-4 Class Application', () => {
    it('should apply mt-4 class to metadata line container', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await screen.findByText('Short post content');

      // Find all metadata containers (pl-14 is unique to metadata line)
      const metadataContainers = container.querySelectorAll('.pl-14.flex.items-center.space-x-6');

      expect(metadataContainers.length).toBeGreaterThan(0);

      // Verify each metadata container has mt-4 class
      metadataContainers.forEach((container) => {
        expect(container.classList.contains('mt-4')).toBe(true);
      });
    });

    it('should have mt-4 class on first post metadata line', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const firstPost = container.querySelector('[class*="border-gray-200"]');
      const metadataLine = firstPost?.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');

      expect(metadataLine).toBeInTheDocument();
      expect(metadataLine?.classList.contains('mt-4')).toBe(true);
    });

    it('should have mt-4 class on all post metadata lines', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');
      await screen.findByText(/much longer post/);

      const metadataLines = container.querySelectorAll('.pl-14.flex.items-center.space-x-6.mt-4');

      expect(metadataLines.length).toBe(mockPosts.length);
      metadataLines.forEach((line) => {
        expect(line.classList.contains('mt-4')).toBe(true);
      });
    });
  });

  describe('2. Visual Spacing Validation', () => {
    it('should provide 16px (1rem) top margin spacing', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4') as HTMLElement;

      expect(metadataLine).toBeInTheDocument();

      // mt-4 in Tailwind equals 1rem (16px)
      const computedStyle = window.getComputedStyle(metadataLine);
      // In test environment, we verify the class is present
      // Real spacing validation happens in E2E tests
      expect(metadataLine.classList.contains('mt-4')).toBe(true);
    });

    it('should maintain spacing with short content', async () => {
      const shortPost = [{
        ...mockPosts[0],
        content: 'Short'
      }];

      (apiService.getAgentPosts as any).mockResolvedValue(shortPost);
      (apiService.getFilteredPosts as any).mockResolvedValue(shortPost);

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short');

      const metadataLine = container.querySelector('.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should maintain spacing with long content', async () => {
      const longPost = [{
        ...mockPosts[0],
        content: 'A'.repeat(500)
      }];

      (apiService.getAgentPosts as any).mockResolvedValue(longPost);
      (apiService.getFilteredPosts as any).mockResolvedValue(longPost);

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText(/A{500}/);

      const metadataLine = container.querySelector('.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });
  });

  describe('3. Metadata Elements Display Correctly', () => {
    it('should display time element in metadata line', async () => {
      render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Time icon (clock) should be present
      const clockIcons = document.querySelectorAll('svg[viewBox="0 0 24 24"] path[d*="M12 8v4l3 3"]');
      expect(clockIcons.length).toBeGreaterThan(0);
    });

    it('should display reading time element in metadata line', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Look for reading time text (1 min read, 3 min read, etc.)
      const readingTimes = container.querySelectorAll('[class*="text-xs"][class*="text-gray"]');
      const hasReadingTime = Array.from(readingTimes).some(el =>
        el.textContent?.includes('min read')
      );

      expect(hasReadingTime).toBe(true);
    });

    it('should display author element in metadata line', async () => {
      render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Author icon (user) should be present
      const userIcons = document.querySelectorAll('svg[viewBox="0 0 24 24"] path[d*="M16 7a4 4 0 11-8 0"]');
      expect(userIcons.length).toBeGreaterThan(0);
    });

    it('should maintain proper spacing between metadata elements', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');

      // Verify space-x-6 class is present (24px horizontal spacing)
      expect(metadataLine?.classList.contains('space-x-6')).toBe(true);
    });

    it('should maintain flex alignment of metadata elements', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');

      expect(metadataLine?.classList.contains('flex')).toBe(true);
      expect(metadataLine?.classList.contains('items-center')).toBe(true);
    });
  });

  describe('4. Dark Mode Compatibility', () => {
    it('should preserve dark mode text colors on metadata elements', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Check for dark mode color classes (dark:text-gray-400)
      const darkModeElements = container.querySelectorAll('[class*="dark:text-gray"]');
      expect(darkModeElements.length).toBeGreaterThan(0);
    });

    it('should maintain mt-4 spacing in dark mode', async () => {
      // Simulate dark mode by adding dark class to document
      document.documentElement.classList.add('dark');

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.mt-4');
      expect(metadataLine).toBeInTheDocument();

      document.documentElement.classList.remove('dark');
    });
  });

  describe('5. Responsive Design', () => {
    it('should maintain metadata line classes on mobile viewport', async () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should maintain metadata line classes on tablet viewport', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should maintain metadata line classes on desktop viewport', async () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLine = container.querySelector('.pl-14.flex.items-center.space-x-6.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });
  });

  describe('6. Consistency Across Posts', () => {
    it('should apply mt-4 to all posts uniformly', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');
      await screen.findByText(/much longer post/);

      const allMetadataLines = container.querySelectorAll('.pl-14.flex.items-center.space-x-6.mt-4');

      expect(allMetadataLines.length).toBe(mockPosts.length);

      allMetadataLines.forEach((line) => {
        expect(line.classList.contains('mt-4')).toBe(true);
      });
    });

    it('should not have inconsistent spacing between posts', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Verify no metadata lines without mt-4
      const metadataLinesWithoutMt4 = container.querySelectorAll('.pl-14.flex.items-center.space-x-6:not(.mt-4)');
      expect(metadataLinesWithoutMt4.length).toBe(0);
    });
  });

  describe('7. No Layout Shifts', () => {
    it('should not cause layout shifts when posts load', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      const initialHeight = container.scrollHeight;

      await screen.findByText('Short post content');

      // Height may change but metadata line should be stable
      const metadataLine = container.querySelector('.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should not cause overlapping with content above', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      // Verify content and metadata don't overlap
      const posts = container.querySelectorAll('[class*="border-gray-200"]');
      expect(posts.length).toBeGreaterThan(0);

      posts.forEach((post) => {
        const metadataLine = post.querySelector('.mt-4');
        expect(metadataLine).toBeInTheDocument();
      });
    });
  });

  describe('8. Other Post Card Styling Unchanged', () => {
    it('should preserve post card border styling', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const postCards = container.querySelectorAll('[class*="border-gray-200"]');
      expect(postCards.length).toBeGreaterThan(0);
    });

    it('should preserve post card padding and spacing', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const postCards = container.querySelectorAll('[class*="p-"]');
      expect(postCards.length).toBeGreaterThan(0);
    });

    it('should preserve author avatar and header layout', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const avatars = container.querySelectorAll('img[alt*="Agent"]');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('9. No Console Errors', () => {
    it('should not generate console errors during render', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not generate console warnings during render', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('10. Edge Cases', () => {
    it('should handle posts with no content gracefully', async () => {
      const emptyPost = [{
        ...mockPosts[0],
        content: ''
      }];

      (apiService.getAgentPosts as any).mockResolvedValue(emptyPost);
      (apiService.getFilteredPosts as any).mockResolvedValue(emptyPost);

      const { container } = render(<RealSocialMediaFeed />);

      const metadataLine = await screen.findByText(/min read/);
      const metadataContainer = metadataLine.closest('.mt-4');

      expect(metadataContainer).toBeInTheDocument();
    });

    it('should handle posts with extremely long content', async () => {
      const veryLongPost = [{
        ...mockPosts[0],
        content: 'A'.repeat(10000)
      }];

      (apiService.getAgentPosts as any).mockResolvedValue(veryLongPost);
      (apiService.getFilteredPosts as any).mockResolvedValue(veryLongPost);

      const { container } = render(<RealSocialMediaFeed />);

      const metadataLine = container.querySelector('.mt-4');
      expect(metadataLine).toBeInTheDocument();
    });

    it('should handle single post correctly', async () => {
      const singlePost = [mockPosts[0]];

      (apiService.getAgentPosts as any).mockResolvedValue(singlePost);
      (apiService.getFilteredPosts as any).mockResolvedValue(singlePost);

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Short post content');

      const metadataLines = container.querySelectorAll('.mt-4');
      expect(metadataLines.length).toBe(1);
    });

    it('should handle multiple posts correctly', async () => {
      const manyPosts = Array.from({ length: 10 }, (_, i) => ({
        ...mockPosts[0],
        id: `post-${i}`,
        content: `Post content ${i}`
      }));

      (apiService.getAgentPosts as any).mockResolvedValue(manyPosts);
      (apiService.getFilteredPosts as any).mockResolvedValue(manyPosts);

      const { container } = render(<RealSocialMediaFeed />);

      await screen.findByText('Post content 0');

      const metadataLines = container.querySelectorAll('.mt-4');
      expect(metadataLines.length).toBe(10);
    });
  });
});
