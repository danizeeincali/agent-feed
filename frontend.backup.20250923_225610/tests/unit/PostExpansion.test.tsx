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
    id: 'test-post-1',
    title: 'Test Post Title',
    content: 'This is a test post content that is long enough to be truncated. '.repeat(10) + 'This should trigger the expand/collapse functionality.',
    authorAgent: 'test-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 5,
      comments: 3,
      stars: { average: 4.5, count: 10 },
      isSaved: false,
      userRating: 0
    },
    tags: ['test', 'expansion'],
    metadata: {
      businessImpact: 85,
      isAgentResponse: false
    }
  },
  {
    id: 'test-post-2',
    title: 'Short Post',
    content: 'This is a short post that should not be truncated.',
    authorAgent: 'short-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 2,
      comments: 1,
      stars: { average: 3.0, count: 2 },
      isSaved: true,
      userRating: 3
    },
    tags: ['short'],
    metadata: {
      businessImpact: 60,
      isAgentResponse: true
    }
  }
];

describe('Post Expansion Functionality', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });
    
    mockedApiService.getFilterData.mockResolvedValue({
      agents: ['test-agent', 'short-agent'],
      hashtags: ['test', 'expansion', 'short']
    });

    // Mock event listeners
    mockedApiService.on = jest.fn();
    mockedApiService.off = jest.fn();
  });

  describe('Chevron Expand/Collapse Functionality', () => {
    it('should display chevron down button for long posts in collapsed view', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Look for chevron down button (expand button)
      const expandButton = screen.getByLabelText('Expand post');
      expect(expandButton).toBeInTheDocument();
      
      // Check that ChevronDown icon is rendered
      const chevronDown = expandButton.querySelector('svg');
      expect(chevronDown).toBeInTheDocument();
    });

    it('should not display chevron button for short posts', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Short Post')).toBeInTheDocument();
      });

      // Short post should not have expand button
      const expandButtons = screen.queryAllByLabelText('Expand post');
      expect(expandButtons).toHaveLength(1); // Only the long post should have it
    });

    it('should expand post when chevron down is clicked', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      
      // Initially should show truncated content
      expect(screen.getByText(/This is a test post content.*\.\.\./)).toBeInTheDocument();
      
      // Click expand button
      fireEvent.click(expandButton);
      
      // Should show full content and collapse button
      await waitFor(() => {
        const collapseButton = screen.getByLabelText('Collapse post');
        expect(collapseButton).toBeInTheDocument();
      });
    });

    it('should collapse post when chevron up is clicked', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        const collapseButton = screen.getByLabelLabel('Collapse post');
        expect(collapseButton).toBeInTheDocument();
      });

      // Click collapse button
      const collapseButton = screen.getByLabelText('Collapse post');
      fireEvent.click(collapseButton);
      
      // Should show expand button again
      await waitFor(() => {
        const newExpandButton = screen.getByLabelText('Expand post');
        expect(newExpandButton).toBeInTheDocument();
      });
    });

    it('should maintain expansion state per post independently', async () => {
      // Add another long post for testing
      const longPosts = [
        mockPosts[0],
        {
          ...mockPosts[0],
          id: 'test-post-3',
          title: 'Another Long Post',
          content: 'Another long post content that should be expandable. '.repeat(15)
        }
      ];

      mockedApiService.getAgentPosts.mockResolvedValue({
        success: true,
        data: longPosts,
        total: longPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
        expect(screen.getByText('Another Long Post')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByLabelText('Expand post');
      expect(expandButtons).toHaveLength(2);

      // Expand first post
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Second post should still be collapsed
      const remainingExpandButtons = screen.getAllByLabelText('Expand post');
      expect(remainingExpandButtons).toHaveLength(1);
    });
  });

  describe('Content Display in Different Views', () => {
    it('should show truncated content in collapsed view', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Should show first sentence only in collapsed view
      const collapsedContent = screen.getByText(/This is a test post content.*\./);
      expect(collapsedContent).toBeInTheDocument();
      
      // Should not show full content
      expect(screen.queryByText(/This should trigger the expand/)).not.toBeInTheDocument();
    });

    it('should show full content in expanded view', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        // Should show full content including the end part
        expect(screen.getByText(/This should trigger the expand/)).toBeInTheDocument();
      });
    });

    it('should show different layouts for collapsed vs expanded views', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // In collapsed view, title should be in header
      const collapsedTitle = screen.getByText('Test Post Title');
      expect(collapsedTitle).toHaveClass('text-lg', 'font-bold');

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        // In expanded view, title should be larger
        const expandedTitle = screen.getByText('Test Post Title');
        expect(expandedTitle).toHaveClass('text-2xl', 'font-bold');
      });
    });

    it('should show metrics appropriately in both views', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Collapsed view should show basic metrics
      expect(screen.getByText(/min read/)).toBeInTheDocument();
      expect(screen.getByText(/85% impact/)).toBeInTheDocument();

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        // Expanded view should show detailed metrics
        expect(screen.getByText(/chars/)).toBeInTheDocument();
        expect(screen.getByText(/words/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for expand/collapse buttons', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      expect(expandButton).toHaveAttribute('aria-label', 'Expand post');
      
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        const collapseButton = screen.getByLabelText('Collapse post');
        expect(collapseButton).toHaveAttribute('aria-label', 'Collapse post');
      });
    });

    it('should be keyboard accessible', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText('Expand post');
      
      // Should be focusable
      expandButton.focus();
      expect(expandButton).toHaveFocus();
      
      // Should work with Enter key
      fireEvent.keyDown(expandButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render other posts when expanding one post', async () => {
      const renderSpy = jest.spyOn(React, 'createElement');
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;
      
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Should have minimal additional renders (just the expanded post)
      const finalRenderCount = renderSpy.mock.calls.length;
      const additionalRenders = finalRenderCount - initialRenderCount;
      
      // Allow for some renders but not excessive re-rendering
      expect(additionalRenders).toBeLessThan(10);
      
      renderSpy.mockRestore();
    });
  });
});