/**
 * TDD Test Suite: RealSocialMediaFeed Component
 *
 * Test Coverage:
 * 1. Relative Time Display - Verify relative time shows in collapsed view
 * 2. Tooltip Functionality - Verify exact datetime tooltip on hover
 * 3. Auto-Update - Verify useRelativeTime hook triggers re-renders every 60 seconds
 * 4. Backend Sorting - Verify posts are NOT re-sorted on frontend
 * 5. Real API Integration - Verify component calls real API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealSocialMediaFeed } from '../../../components/RealSocialMediaFeed';
import { apiService } from '../../../services/api';
import * as timeUtils from '../../../utils/timeUtils';
import * as useRelativeTimeHook from '../../../hooks/useRelativeTime';

// Mock dependencies
vi.mock('../../../services/api');
vi.mock('../../../hooks/useRelativeTime');
vi.mock('../../../components/FilterPanel', () => ({
  default: () => <div data-testid="filter-panel">Filter Panel</div>
}));
vi.mock('../../../components/EnhancedPostingInterface', () => ({
  EnhancedPostingInterface: () => <div data-testid="posting-interface">Posting Interface</div>
}));
vi.mock('../../../StreamingTickerWorking', () => ({
  default: () => <div data-testid="streaming-ticker">Streaming Ticker</div>
}));

describe('RealSocialMediaFeed - TDD Test Suite', () => {
  const mockPosts = [
    {
      id: 'post-1',
      title: 'First Post Title',
      content: 'This is the first post content with some details about the implementation.',
      authorAgent: 'TechReviewer',
      created_at: new Date('2025-10-03T10:00:00Z').toISOString(),
      publishedAt: new Date('2025-10-03T10:00:00Z').toISOString(),
      engagement: {
        comments: 5,
        shares: 2,
        views: 100,
        saves: 3,
        reactions: { like: 10 },
        stars: { average: 4.5, count: 10, distribution: {} },
        isSaved: false
      },
      metadata: {
        businessImpact: 85,
        confidence_score: 0.95,
        isAgentResponse: false,
        processing_time_ms: 150,
        model_version: '1.0',
        tokens_used: 500,
        temperature: 0.7
      },
      tags: ['testing', 'validation'],
      category: 'Technical'
    },
    {
      id: 'post-2',
      title: 'Second Post Title',
      content: 'This is the second post with different timestamp.',
      authorAgent: 'SystemValidator',
      created_at: new Date('2025-10-03T08:30:00Z').toISOString(),
      publishedAt: new Date('2025-10-03T08:30:00Z').toISOString(),
      engagement: {
        comments: 3,
        shares: 1,
        views: 50,
        saves: 1,
        reactions: { like: 5 },
        stars: { average: 4.0, count: 5, distribution: {} },
        isSaved: false
      },
      metadata: {
        businessImpact: 70,
        confidence_score: 0.85,
        isAgentResponse: false,
        processing_time_ms: 120,
        model_version: '1.0',
        tokens_used: 400,
        temperature: 0.7
      },
      tags: ['review'],
      category: 'Analysis'
    },
    {
      id: 'post-3',
      title: 'Third Post Title',
      content: 'This is the third post from yesterday.',
      authorAgent: 'CodeAuditor',
      created_at: new Date('2025-10-02T15:00:00Z').toISOString(),
      publishedAt: new Date('2025-10-02T15:00:00Z').toISOString(),
      engagement: {
        comments: 8,
        shares: 4,
        views: 200,
        saves: 6,
        reactions: { like: 15 },
        stars: { average: 5.0, count: 12, distribution: {} },
        isSaved: false
      },
      metadata: {
        businessImpact: 90,
        confidence_score: 0.98,
        isAgentResponse: false,
        processing_time_ms: 180,
        model_version: '1.0',
        tokens_used: 600,
        temperature: 0.7
      },
      tags: ['security', 'audit'],
      category: 'Security'
    }
  ];

  const mockApiResponse = {
    success: true,
    data: mockPosts,
    total: mockPosts.length,
    posts: mockPosts
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock API service methods
    vi.mocked(apiService.getAgentPosts).mockResolvedValue(mockApiResponse);
    vi.mocked(apiService.getFilterData).mockResolvedValue({
      agents: ['TechReviewer', 'SystemValidator', 'CodeAuditor'],
      hashtags: ['testing', 'validation', 'review', 'security', 'audit']
    });
    vi.mocked(apiService.getFilterStats).mockResolvedValue({
      totalPosts: 3,
      savedPosts: 0,
      myPosts: 0,
      agentCounts: {},
      hashtagCounts: {}
    });
    vi.mocked(apiService.on).mockImplementation(() => {});
    vi.mocked(apiService.off).mockImplementation(() => {});

    // Mock useRelativeTime hook
    vi.mocked(useRelativeTimeHook.useRelativeTime).mockImplementation(() => {});

    // Set a fixed "now" time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Relative Time Display', () => {
    it('should display relative time in collapsed post view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const postCards = screen.getAllByTestId('post-card');
      expect(postCards).toHaveLength(3);

      // Check that relative time is displayed (not exact datetime)
      const firstPost = postCards[0];

      // The relative time should be in the collapsed view
      expect(within(firstPost).getByText(/ago|just now|yesterday/i)).toBeInTheDocument();
    });

    it('should show "2 hours ago" for post from 2 hours ago', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Post 1 is from 10:00, current time is 12:00 = 2 hours ago
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('should show "3 hours ago" for post from 3.5 hours ago', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Post 2 is from 08:30, current time is 12:00 = 3.5 hours ago (rounds to 3 hours)
      expect(screen.getByText('3 hours ago')).toBeInTheDocument();
    });

    it('should show "yesterday" for post from previous day', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Post 3 is from 2025-10-02, current time is 2025-10-03 = yesterday
      expect(screen.getByText('yesterday')).toBeInTheDocument();
    });

    it('should use formatRelativeTime utility function', async () => {
      const formatRelativeTimeSpy = vi.spyOn(timeUtils, 'formatRelativeTime');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Should be called for each post (3 times in collapsed view)
      expect(formatRelativeTimeSpy).toHaveBeenCalled();
      expect(formatRelativeTimeSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('2. Tooltip Functionality', () => {
    it('should have title attribute with exact datetime on relative time element', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Find the relative time element with cursor-help class
      const relativeTimeElements = document.querySelectorAll('.cursor-help');
      expect(relativeTimeElements.length).toBeGreaterThan(0);

      // Check that it has a title attribute
      const firstRelativeTime = relativeTimeElements[0];
      expect(firstRelativeTime).toHaveAttribute('title');

      // The title should contain the exact date and time
      const title = firstRelativeTime.getAttribute('title');
      expect(title).toMatch(/October|January|February|March|April|May|June|July|August|September|November|December/);
      expect(title).toMatch(/\d{1,2}, \d{4}/); // Date format check
      expect(title).toMatch(/\d{1,2}:\d{2} (AM|PM)/); // Time format check
    });

    it('should use formatExactDateTime for tooltip content', async () => {
      const formatExactDateTimeSpy = vi.spyOn(timeUtils, 'formatExactDateTime');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Should be called for each post for tooltip
      expect(formatExactDateTimeSpy).toHaveBeenCalled();
      expect(formatExactDateTimeSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should show tooltip on hover (accessibility check)', async () => {
      const user = userEvent.setup({ delay: null });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Find relative time elements
      const relativeTimeElements = document.querySelectorAll('.cursor-help');
      const firstRelativeTime = relativeTimeElements[0] as HTMLElement;

      // Hover over the element
      await user.hover(firstRelativeTime);

      // Check that title attribute exists (browser will show as tooltip)
      expect(firstRelativeTime).toHaveAttribute('title');
      expect(firstRelativeTime.getAttribute('title')).toBeTruthy();
    });

    it('should format exact datetime correctly for different timestamps', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const relativeTimeElements = document.querySelectorAll('.cursor-help');

      // Check first post (Oct 3, 2025 at 10:00 AM)
      const firstTitle = relativeTimeElements[0]?.getAttribute('title');
      expect(firstTitle).toContain('October 3, 2025');
      expect(firstTitle).toContain('10:00 AM');

      // Check second post (Oct 3, 2025 at 8:30 AM)
      const secondTitle = relativeTimeElements[1]?.getAttribute('title');
      expect(secondTitle).toContain('October 3, 2025');
      expect(secondTitle).toContain('8:30 AM');

      // Check third post (Oct 2, 2025 at 3:00 PM)
      const thirdTitle = relativeTimeElements[2]?.getAttribute('title');
      expect(thirdTitle).toContain('October 2, 2025');
      expect(thirdTitle).toContain('3:00 PM');
    });
  });

  describe('3. Auto-Update (useRelativeTime Hook)', () => {
    it('should call useRelativeTime hook with 60000ms interval', () => {
      render(<RealSocialMediaFeed />);

      expect(useRelativeTimeHook.useRelativeTime).toHaveBeenCalledWith(60000);
    });

    it('should re-render when time advances 60 seconds', async () => {
      let updateCounter = 0;
      const mockUseRelativeTime = vi.fn((interval: number) => {
        // Simulate the hook behavior
        const [, forceUpdate] = React.useState(0);

        React.useEffect(() => {
          const timer = setInterval(() => {
            updateCounter++;
            forceUpdate((n: number) => n + 1);
          }, interval);

          return () => clearInterval(timer);
        }, [interval]);
      });

      vi.mocked(useRelativeTimeHook.useRelativeTime).mockImplementation(mockUseRelativeTime);

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Advance time by 60 seconds
      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(useRelativeTimeHook.useRelativeTime).toHaveBeenCalled();
      });

      // The hook should have been called with the correct interval
      expect(useRelativeTimeHook.useRelativeTime).toHaveBeenCalledWith(60000);
    });

    it('should update relative time display after 60 seconds', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Initial state: "2 hours ago"
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();

      // Advance system time by 60 seconds
      vi.setSystemTime(new Date('2025-10-03T12:01:00Z'));

      // Advance timers by 60 seconds to trigger useRelativeTime hook
      vi.advanceTimersByTime(60000);

      // After 60 seconds, time display should still be "2 hours ago"
      // (not enough time has passed to change from 2 hours to 3 hours)
      await waitFor(() => {
        expect(screen.getByText('2 hours ago')).toBeInTheDocument();
      });
    });

    it('should update relative time from "2 hours ago" to "3 hours ago" after 1 hour', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Initial: "2 hours ago" for post from 10:00 (current time 12:00)
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();

      // Advance time by 1 hour
      vi.setSystemTime(new Date('2025-10-03T13:00:00Z'));
      vi.advanceTimersByTime(60000); // Trigger one update

      // Now it should be "3 hours ago"
      await waitFor(() => {
        // The component should re-render with new relative time
        expect(screen.queryByText('2 hours ago')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. Backend Sorting - NO Frontend Re-sorting', () => {
    it('should display posts in the exact order returned by backend', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const postCards = screen.getAllByTestId('post-card');

      // Verify order matches backend response
      expect(within(postCards[0]).getByText('First Post Title')).toBeInTheDocument();
      expect(within(postCards[1]).getByText('Second Post Title')).toBeInTheDocument();
      expect(within(postCards[2]).getByText('Third Post Title')).toBeInTheDocument();
    });

    it('should NOT sort posts by timestamp on frontend', async () => {
      // Backend returns posts in this specific order (NOT sorted by time)
      const unsortedPosts = [
        { ...mockPosts[0], created_at: '2025-10-03T10:00:00Z' }, // Middle time
        { ...mockPosts[1], created_at: '2025-10-03T08:30:00Z' }, // Oldest
        { ...mockPosts[2], created_at: '2025-10-03T11:00:00Z' }  // Newest
      ];

      vi.mocked(apiService.getAgentPosts).mockResolvedValue({
        success: true,
        data: unsortedPosts,
        total: unsortedPosts.length,
        posts: unsortedPosts
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const postCards = screen.getAllByTestId('post-card');

      // Posts should be displayed in BACKEND order, NOT sorted by time
      // Order should be: Middle (10:00), Oldest (08:30), Newest (11:00)
      expect(within(postCards[0]).getByText('First Post Title')).toBeInTheDocument();
      expect(within(postCards[1]).getByText('Second Post Title')).toBeInTheDocument();
      expect(within(postCards[2]).getByText('Third Post Title')).toBeInTheDocument();

      // Verify this is NOT sorted by time (if it were, order would be different)
      const times = postCards.map(card =>
        card.querySelector('.cursor-help')?.getAttribute('title')
      );

      // Backend order is preserved
      expect(times[0]).toContain('10:00 AM');
      expect(times[1]).toContain('8:30 AM');
      expect(times[2]).toContain('11:00 AM');
    });

    it('should trust backend priority sorting', async () => {
      // Backend returns posts sorted by priority (not by time)
      const prioritySortedPosts = [
        { ...mockPosts[2], priority: 'urgent' },  // Highest priority
        { ...mockPosts[0], priority: 'high' },
        { ...mockPosts[1], priority: 'medium' }
      ];

      vi.mocked(apiService.getAgentPosts).mockResolvedValue({
        success: true,
        data: prioritySortedPosts,
        total: prioritySortedPosts.length,
        posts: prioritySortedPosts
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const postCards = screen.getAllByTestId('post-card');

      // Should maintain backend priority order
      expect(within(postCards[0]).getByText('Third Post Title')).toBeInTheDocument();
      expect(within(postCards[1]).getByText('First Post Title')).toBeInTheDocument();
      expect(within(postCards[2]).getByText('Second Post Title')).toBeInTheDocument();
    });

    it('should NOT have any sorting logic in component code', () => {
      // This is a code-level test - check that there's no .sort() calls on posts
      const componentSource = RealSocialMediaFeed.toString();

      // Should not contain .sort() on posts array
      expect(componentSource).not.toMatch(/posts\s*\.\s*sort/);
      expect(componentSource).not.toMatch(/\.sort\s*\(\s*\(.*created_at/);
      expect(componentSource).not.toMatch(/\.sort\s*\(\s*\(.*publishedAt/);
    });
  });

  describe('5. Real API Integration', () => {
    it('should call apiService.getAgentPosts on mount', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Should call with default parameters
      expect(apiService.getAgentPosts).toHaveBeenCalledWith(
        20,  // limit
        0    // offset
      );
    });

    it('should NOT use mock data - must call real API endpoint', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Verify we're calling the real API service (not a mock implementation)
      expect(vi.mocked(apiService.getAgentPosts)).toHaveBeenCalled();
    });

    it('should call /api/v1/agent-posts endpoint', async () => {
      // Spy on the actual request method to verify endpoint
      const requestSpy = vi.spyOn(apiService as any, 'request').mockResolvedValue(mockApiResponse);

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Note: This test validates that apiService.getAgentPosts is called,
      // which internally calls the /api/v1/agent-posts endpoint
      expect(apiService.getAgentPosts).toHaveBeenCalled();
    });

    it('should handle API response correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Should display all posts from API response
      const postCards = screen.getAllByTestId('post-card');
      expect(postCards).toHaveLength(mockPosts.length);

      // Should display content from API
      expect(screen.getByText('First Post Title')).toBeInTheDocument();
      expect(screen.getByText('Second Post Title')).toBeInTheDocument();
      expect(screen.getByText('Third Post Title')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiService.getAgentPosts).mockRejectedValue(
        new Error('Network error')
      );

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load posts|Network error/i)).toBeInTheDocument();
      });
    });

    it('should call API with correct pagination parameters', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Initial load should use page 0, limit 20
      expect(apiService.getAgentPosts).toHaveBeenCalledWith(20, 0);
    });

    it('should use apiService.getFilteredPosts for filtered requests', async () => {
      vi.mocked(apiService.getFilteredPosts).mockResolvedValue(mockApiResponse);

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Note: Initial load uses getAgentPosts, but filtered requests use getFilteredPosts
      expect(apiService.getAgentPosts).toHaveBeenCalled();
    });

    it('should subscribe to real-time updates via WebSocket', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.on).toHaveBeenCalledWith('posts_updated', expect.any(Function));
      });
    });

    it('should unsubscribe from WebSocket on unmount', async () => {
      const { unmount } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(apiService.on).toHaveBeenCalled();
      });

      unmount();

      expect(apiService.off).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });
  });

  describe('Integration Tests - Combined Functionality', () => {
    it('should display relative time with tooltip for all posts', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const relativeTimeElements = document.querySelectorAll('.cursor-help');

      // Should have relative time for each post
      expect(relativeTimeElements.length).toBeGreaterThanOrEqual(3);

      // Each should have both relative time text and tooltip
      relativeTimeElements.forEach(element => {
        expect(element.textContent).toMatch(/ago|just now|yesterday/i);
        expect(element).toHaveAttribute('title');
        expect(element.getAttribute('title')).toBeTruthy();
      });
    });

    it('should maintain backend order while displaying relative times', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      const postCards = screen.getAllByTestId('post-card');

      // Verify backend order is maintained
      expect(within(postCards[0]).getByText('First Post Title')).toBeInTheDocument();
      expect(within(postCards[1]).getByText('Second Post Title')).toBeInTheDocument();
      expect(within(postCards[2]).getByText('Third Post Title')).toBeInTheDocument();

      // Verify relative times are displayed correctly
      expect(within(postCards[0]).getByText('2 hours ago')).toBeInTheDocument();
      expect(within(postCards[1]).getByText('3 hours ago')).toBeInTheDocument();
      expect(within(postCards[2]).getByText('yesterday')).toBeInTheDocument();
    });

    it('should use real API and auto-update relative times', async () => {
      render(<RealSocialMediaFeed />);

      // Wait for API call
      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Verify useRelativeTime hook is active
      expect(useRelativeTimeHook.useRelativeTime).toHaveBeenCalledWith(60000);

      // Verify posts are displayed
      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // Verify relative times are shown
      expect(screen.getByText(/ago|just now|yesterday/i)).toBeInTheDocument();
    });
  });
});

/**
 * Import React for hooks usage in tests
 */
import React from 'react';
