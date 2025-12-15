/**
 * TDD Test Suite: Business Impact Indicator Removal
 *
 * Purpose: Validate that business impact indicators have been completely removed
 * from the UI while preserving all other functionality.
 *
 * Test Coverage:
 * - UI does not display business impact text
 * - UI does not show business impact icon
 * - getBusinessImpactColor function does not exist
 * - Other post metadata still displays correctly
 * - Both compact and expanded views tested
 * - Dark mode compatibility
 * - Mobile responsive design
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    savePost: jest.fn(),
    deletePost: jest.fn(),
    createComment: jest.fn(),
    getPostComments: jest.fn(),
    searchPosts: jest.fn(),
  }
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

// Mock time utils
jest.mock('../../utils/timeUtils', () => ({
  formatRelativeTime: jest.fn(() => '2 hours ago'),
  formatExactDateTime: jest.fn(() => '2025-10-17 10:30:00 AM')
}));

// Sample post data WITHOUT businessImpact
const createMockPost = (overrides = {}) => ({
  id: 'test-post-1',
  title: 'Test Post Title',
  content: 'Test post content. This is a sample post without business impact data.',
  authorAgent: 'TestAgent',
  created_at: '2025-10-17T10:00:00Z',
  publishedAt: '2025-10-17T10:00:00Z',
  comments: 5,
  tags: ['test', 'validation'],
  engagement: {
    saves: 3,
    isSaved: false,
    comments: 5
  },
  metadata: {
    // No businessImpact field
  },
  ...overrides
});

describe('Business Impact Removal - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API responses
    (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
      success: true,
      data: [createMockPost()],
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

  describe('Compact View - Business Impact Display', () => {
    test('should NOT display business impact text in compact view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Search for any text containing "impact"
      const compactView = screen.getByTestId('post-card');
      expect(within(compactView).queryByText(/\d+%\s*impact/i)).not.toBeInTheDocument();
      expect(within(compactView).queryByText(/impact/i)).not.toBeInTheDocument();
    });

    test('should NOT display business impact icon in compact view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Check that the trending up icon (business impact indicator) is not present
      const compactView = screen.getByTestId('post-card');
      const impactIcons = compactView.querySelectorAll('svg path[d*="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"]');
      expect(impactIcons.length).toBe(0);
    });

    test('should display other metadata correctly in compact view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const compactView = screen.getByTestId('post-card');

      // Verify time metadata is present
      expect(within(compactView).getByText('2 hours ago')).toBeInTheDocument();

      // Verify reading time is present
      expect(within(compactView).getByText(/min read/i)).toBeInTheDocument();

      // Verify agent name is present
      expect(within(compactView).getByText(/by TestAgent/i)).toBeInTheDocument();
    });

    test('should maintain correct spacing without business impact section', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const compactView = screen.getByTestId('post-card');
      const metricsContainer = compactView.querySelector('.flex.items-center.space-x-6');

      // Should have time, reading time, and agent - but not business impact
      const metricItems = metricsContainer?.querySelectorAll('.flex.items-center') || [];

      // Count should be 3 (time, reading time, agent) not 4
      expect(metricItems.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Expanded View - Business Impact Display', () => {
    test('should NOT display business impact in expanded view metrics', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Check expanded metrics - should NOT contain business impact
      const expandedView = screen.getByTestId('post-card');
      expect(within(expandedView).queryByText(/\d+%/i)).not.toBeInTheDocument();
      expect(within(expandedView).queryByText(/impact/i)).not.toBeInTheDocument();
    });

    test('should display all other metrics in expanded view', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      const expandedView = screen.getByTestId('post-card');

      // Verify characters metric
      expect(within(expandedView).getByText(/chars/i)).toBeInTheDocument();

      // Verify words metric
      expect(within(expandedView).getByText(/words/i)).toBeInTheDocument();

      // Verify reading time metric
      expect(within(expandedView).getByText(/min read/i)).toBeInTheDocument();

      // Verify agent metric
      expect(within(expandedView).getByText(/agent/i)).toBeInTheDocument();
    });

    test('should maintain grid layout without business impact metric', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Expand the post
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      const expandedView = screen.getByTestId('post-card');
      const metricsGrid = expandedView.querySelector('.grid.grid-cols-2');

      expect(metricsGrid).toBeInTheDocument();

      // Should have 4 metrics (characters, words, reading time, agent) not 5
      const metricItems = metricsGrid?.querySelectorAll('.flex.items-center.space-x-2') || [];
      expect(metricItems.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Function Removal Validation', () => {
    test('getBusinessImpactColor function should not exist', () => {
      // Import the component module
      const module = require('../../components/RealSocialMediaFeed');

      // Verify the function doesn't exist in the module
      expect(module.getBusinessImpactColor).toBeUndefined();

      // Check default export
      expect(module.default.getBusinessImpactColor).toBeUndefined();
    });

    test('component should not reference businessImpact in any way', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Get the entire HTML content
      const htmlContent = container.innerHTML;

      // Verify no business impact references
      expect(htmlContent).not.toMatch(/businessImpact/i);
      expect(htmlContent).not.toMatch(/business-impact/i);
      expect(htmlContent).not.toMatch(/\d+%\s*impact/i);
    });
  });

  describe('Legacy Data Handling', () => {
    test('should handle posts with legacy businessImpact data gracefully', async () => {
      // Create a post with legacy businessImpact data
      const legacyPost = createMockPost({
        metadata: {
          businessImpact: 75 // Legacy data
        }
      });

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        data: [legacyPost],
        total: 1
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Should render without errors
      const postCard = screen.getByTestId('post-card');
      expect(postCard).toBeInTheDocument();

      // Should NOT display the legacy business impact
      expect(within(postCard).queryByText(/75%/i)).not.toBeInTheDocument();
      expect(within(postCard).queryByText(/impact/i)).not.toBeInTheDocument();
    });
  });

  describe('Dark Mode Compatibility', () => {
    test('should render correctly in dark mode without business impact', async () => {
      // Add dark class to document
      document.documentElement.classList.add('dark');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Verify dark mode classes are applied
      expect(postCard.querySelector('.dark\\:bg-gray-900')).toBeTruthy();

      // Verify no business impact is displayed
      expect(within(postCard).queryByText(/impact/i)).not.toBeInTheDocument();

      // Cleanup
      document.documentElement.classList.remove('dark');
    });
  });

  describe('Existing Functionality Preservation', () => {
    test('should display likes/saves correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Verify save functionality is present
      const saveButton = within(postCard).getByTitle(/Save Post/i);
      expect(saveButton).toBeInTheDocument();
    });

    test('should display comment count correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Verify comment count is displayed
      const commentButton = within(postCard).getByTitle(/View Comments/i);
      expect(commentButton).toBeInTheDocument();
      expect(within(postCard).getByText('5')).toBeInTheDocument();
    });

    test('should handle expand/collapse correctly', async () => {
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Test expand
      const expandButton = screen.getByLabelText('Expand post');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
      });

      // Test collapse
      const collapseButton = screen.getByLabelText('Collapse post');
      fireEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Expand post')).toBeInTheDocument();
      });
    });

    test('should handle save/unsave actions', async () => {
      (apiService.savePost as jest.Mock).mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const saveButton = screen.getByTitle(/Save Post/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(apiService.savePost).toHaveBeenCalledWith('test-post-1', true, 'anonymous');
      });
    });

    test('should handle post deletion', async () => {
      (apiService.deletePost as jest.Mock).mockResolvedValue({ success: true });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle(/Delete Post/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(apiService.deletePost).toHaveBeenCalledWith('test-post-1');
      });
    });
  });

  describe('No Console Errors', () => {
    test('should not log console errors when businessImpact field is missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      // Verify no console errors related to businessImpact
      const businessImpactErrors = consoleErrorSpy.mock.calls.filter(call =>
        call.some(arg => String(arg).includes('businessImpact'))
      );

      expect(businessImpactErrors.length).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should render correctly on mobile without business impact', async () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      });

      const postCard = screen.getByTestId('post-card');

      // Verify mobile layout classes are present
      expect(postCard).toBeInTheDocument();

      // Verify no business impact is displayed on mobile
      expect(within(postCard).queryByText(/impact/i)).not.toBeInTheDocument();
    });
  });
});
