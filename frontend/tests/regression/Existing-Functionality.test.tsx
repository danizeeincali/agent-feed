import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import * as apiService from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock data for regression testing
const mockPosts = [
  {
    id: 'regression-post-1',
    title: 'Regression Test Post with @mentions and #hashtags',
    content: 'This post contains @agent1 mentions and #testing hashtags. It also has links like https://example.com and should parse content correctly.',
    authorAgent: 'regression-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 15,
      comments: 8,
      stars: { average: 4.3, count: 12 },
      isSaved: true,
      userRating: 4
    },
    tags: ['testing', 'regression', 'mentions'],
    metadata: {
      businessImpact: 88,
      isAgentResponse: false
    }
  },
  {
    id: 'regression-post-2',
    title: 'Mobile Responsive Test Post',
    content: 'This post tests mobile responsiveness and long content handling. '.repeat(20),
    authorAgent: 'mobile-agent',
    publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    engagement: {
      likes: 25,
      comments: 12,
      stars: { average: 4.7, count: 18 },
      isSaved: false,
      userRating: 5
    },
    tags: ['mobile', 'responsive'],
    metadata: {
      businessImpact: 92,
      isAgentResponse: true
    }
  }
];

const mockFilterData = {
  agents: ['regression-agent', 'mobile-agent'],
  hashtags: ['testing', 'regression', 'mentions', 'mobile', 'responsive']
};

describe('Regression Tests - Existing Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });
    
    mockedApiService.getFilterData.mockResolvedValue(mockFilterData);

    // Mock event listeners
    mockedApiService.on = jest.fn();
    mockedApiService.off = jest.fn();
  });

  describe('@mentions and #hashtags Functionality', () => {
    it('should still render @mentions as clickable elements', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Regression Test Post with @mentions and #hashtags')).toBeInTheDocument();
      });

      // @mentions should be clickable
      const mentionElement = screen.getByText('@agent1');
      expect(mentionElement).toBeInTheDocument();
      
      // Should have appropriate styling for mentions
      expect(mentionElement).toHaveClass('text-blue-600', 'hover:text-blue-800');
      
      // Should be clickable
      fireEvent.click(mentionElement);
      
      // Should trigger filter by agent
      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          expect.objectContaining({
            type: 'agent',
            agent: 'agent1'
          })
        );
      });
    });

    it('should still render #hashtags as clickable elements', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // #hashtags should be clickable
      const hashtagElement = screen.getByText('#testing');
      expect(hashtagElement).toBeInTheDocument();
      
      // Should have appropriate styling for hashtags
      expect(hashtagElement).toHaveClass('text-purple-600', 'hover:text-purple-800');
      
      // Should be clickable
      fireEvent.click(hashtagElement);
      
      // Should trigger filter by hashtag
      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          expect.objectContaining({
            type: 'hashtag',
            hashtag: 'testing'
          })
        );
      });
    });

    it('should parse and render multiple @mentions and #hashtags correctly', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should find both @mentions and #hashtags
      expect(screen.getByText('@agent1')).toBeInTheDocument();
      expect(screen.getByText('#testing')).toBeInTheDocument();
      
      // Content should be properly parsed with clickable elements
      const postContent = screen.getByText(/This post contains/);
      expect(postContent).toBeInTheDocument();
    });
  });

  describe('Content Parsing Functionality', () => {
    it('should still parse and render URLs as links', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // URLs should be rendered as links
      const linkElement = screen.getByText('https://example.com');
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', 'https://example.com');
      expect(linkElement).toHaveAttribute('target', '_blank');
      expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should preserve content parsing with new UI structure', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // All content elements should be parsed correctly
      expect(screen.getByText('@agent1')).toBeInTheDocument();
      expect(screen.getByText('#testing')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      
      // Should maintain proper text flow
      const contentContainer = screen.getByText(/This post contains/).closest('div');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should handle complex content parsing in both collapsed and expanded views', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Mobile Responsive Test Post/)).toBeInTheDocument();
      });

      // Find expandable post (long content)
      const expandButton = screen.getByLabelText('Expand post');
      
      // In collapsed view, parsed content should still work
      expect(screen.getByText(/This post tests mobile/)).toBeInTheDocument();
      
      // Expand the post
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });
      
      // In expanded view, all content should be parsed
      expect(screen.getByText(/This post tests mobile responsiveness/)).toBeInTheDocument();
    });
  });

  describe('Mobile Responsive Design', () => {
    it('should maintain mobile responsiveness with new UI structure', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Feed should adapt to mobile
      const feedContainer = screen.getByText(/Regression Test Post/).closest('div');
      expect(feedContainer).toBeInTheDocument();
      
      // Actions should be accessible on mobile
      const actionsButton = screen.getAllByLabelText('Post actions')[0];
      expect(actionsButton).toBeInTheDocument();
      
      // Filter should work on mobile
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      expect(filterButton).toBeInTheDocument();
    });

    it('should maintain touch interactions', async () => {
      // Mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Touch interactions should work
      const actionsButton = screen.getAllByLabelText('Post actions')[0];
      
      // Simulate touch event
      fireEvent.touchStart(actionsButton);
      fireEvent.touchEnd(actionsButton);
      fireEvent.click(actionsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Save Post')).toBeInTheDocument();
      });
    });

    it('should handle responsive breakpoints correctly', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Small mobile
        { width: 375, height: 667 }, // iPhone
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Desktop
      ];

      for (const viewport of viewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true });
        
        const { rerender } = render(<RealSocialMediaFeed />);
        
        await waitFor(() => {
          expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
        });

        // UI should be functional at all breakpoints
        expect(screen.getByRole('button', { name: /All Posts/ })).toBeInTheDocument();
        expect(screen.getAllByLabelText('Post actions')[0]).toBeInTheDocument();
        
        rerender(<></>); // Cleanup for next iteration
      }
    });
  });

  describe('Time Display and Formatting', () => {
    it('should maintain time formatting functionality', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should show time ago formatting
      expect(screen.getByText(/ago|just now|min|hour|day/)).toBeInTheDocument();
    });

    it('should show reading time calculations', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Mobile Responsive Test Post/)).toBeInTheDocument();
      });

      // Should show reading time
      expect(screen.getByText(/min read/)).toBeInTheDocument();
    });
  });

  describe('Business Impact Display', () => {
    it('should maintain business impact visualization', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should show business impact percentage
      expect(screen.getByText('88% impact')).toBeInTheDocument();
      expect(screen.getByText('92% impact')).toBeInTheDocument();
    });

    it('should apply correct styling based on business impact', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('88% impact')).toBeInTheDocument();
      });

      // High impact should have green color
      const highImpact = screen.getByText('92% impact');
      expect(highImpact).toHaveClass('text-green-600');
      
      // Medium impact should have appropriate color
      const mediumImpact = screen.getByText('88% impact');
      expect(mediumImpact).toHaveClass('text-green-600');
    });
  });

  describe('Agent Response Badges', () => {
    it('should maintain agent response badge display', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Mobile Responsive Test Post/)).toBeInTheDocument();
      });

      // Should show agent response badge for appropriate posts
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('Agent Response')).toBeInTheDocument();
      });
    });

    it('should not show agent response badge for non-agent posts', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Non-agent response posts should not have badge
      const expandButtons = screen.getAllByLabelText('Expand post');
      if (expandButtons.length > 0) {
        fireEvent.click(expandButtons[0]);
        
        await waitFor(() => {
          // First post should not have agent response badge
          const agentBadges = screen.queryAllByText('Agent Response');
          // Should only have one badge (from second post)
          expect(agentBadges.length).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Tag System', () => {
    it('should maintain tag display and functionality', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Expand post to see tags
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        // Should show tags
        expect(screen.getByText('#testing')).toBeInTheDocument();
        expect(screen.getByText('#regression')).toBeInTheDocument();
        expect(screen.getByText('#mentions')).toBeInTheDocument();
      });
    });

    it('should maintain tag styling and interactions', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        const tag = screen.getByText('#testing');
        
        // Should have gradient background
        expect(tag).toHaveClass('bg-gradient-to-r', 'from-blue-100', 'to-purple-100');
        
        // Should be clickable
        fireEvent.click(tag);
        
        // Should trigger hashtag filter
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should maintain WebSocket connection functionality', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should have established event listeners
      expect(mockedApiService.on).toHaveBeenCalledWith('posts_updated', expect.any(Function));
      
      // Should show connection status
      expect(screen.getByText('Live database feed active')).toBeInTheDocument();
    });

    it('should handle real-time post updates', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Simulate real-time update
      const updateHandler = mockedApiService.on.mock.calls.find(
        call => call[0] === 'posts_updated'
      )?.[1];

      if (updateHandler) {
        const updatedPost = {
          ...mockPosts[0],
          title: 'Updated Regression Test Post',
          engagement: {
            ...mockPosts[0].engagement,
            likes: 20
          }
        };

        updateHandler(updatedPost);

        await waitFor(() => {
          expect(screen.getByText('Updated Regression Test Post')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should maintain error handling for API failures', async () => {
      mockedApiService.getAgentPosts.mockRejectedValueOnce(new Error('Network error'));
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load posts/)).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText(/Network error|Failed to load posts/)).toBeInTheDocument();
      
      // Should have refresh button
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should handle partial data gracefully', async () => {
      const partialMockPosts = [
        {
          id: 'partial-post',
          title: 'Partial Post',
          content: 'Missing some fields',
          authorAgent: 'partial-agent',
          publishedAt: new Date().toISOString(),
          engagement: {
            likes: 0,
            comments: 0,
            stars: { average: 0, count: 0 },
            isSaved: false,
            userRating: 0
          },
          // Missing tags and metadata
        }
      ];

      mockedApiService.getAgentPosts.mockResolvedValueOnce({
        success: true,
        data: partialMockPosts,
        total: 1
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Partial Post')).toBeInTheDocument();
      });

      // Should render without crashing
      expect(screen.getByText('Missing some fields')).toBeInTheDocument();
    });
  });

  describe('Performance Regression', () => {
    it('should maintain rendering performance', async () => {
      const startTime = performance.now();
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (5 seconds)
      expect(renderTime).toBeLessThan(5000);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<RealSocialMediaFeed />);
      
      // Unmount component
      unmount();
      
      // Should clean up event listeners
      expect(mockedApiService.off).toHaveBeenCalled();
    });
  });

  describe('Accessibility Regression', () => {
    it('should maintain ARIA labels and keyboard navigation', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should have proper ARIA labels
      expect(screen.getByLabelText('Post actions')).toBeInTheDocument();
      
      // Should have proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Should be keyboard accessible
      const firstButton = buttons[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();
    });

    it('should maintain semantic HTML structure', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText(/Regression Test Post/)).toBeInTheDocument();
      });

      // Should use proper semantic elements
      expect(screen.getAllByRole('article')).toHaveLength(mockPosts.length);
      expect(screen.getAllByRole('button')).toHaveLength(expect.any(Number));
      
      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});