/**
 * TDD London School Integration Tests for Tab Navigation
 * Testing end-to-end tab behavior and cross-component interactions
 *
 * London School Integration Approach:
 * - Focus on how components collaborate as a system
 * - Test the conversation between different UI layers
 * - Verify integration contracts and behavior flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import RealAnalytics from '../../components/RealAnalytics';

// Integration test setup - minimal mocking to test real interactions
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
  }
}));

// Mock only the heavy lazy-loaded component to prevent loading issues
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: ({ className, enableRealTime, refreshInterval }: any) => (
    <div
      data-testid="enhanced-analytics-integration"
      className={className}
      data-real-time={enableRealTime?.toString()}
      data-refresh-interval={refreshInterval?.toString()}
    >
      <h2>Claude SDK Analytics</h2>
      <div data-testid="cost-overview">Cost Overview Dashboard</div>
      <div data-testid="message-analytics">Message & Steps Analytics</div>
      <div data-testid="optimization-recommendations">Optimization Recommendations</div>
      <div data-testid="export-features">Export & Reports</div>
    </div>
  )
}));

describe('Tab Navigation Integration - London School TDD', () => {
  let mockApiService: any;
  let user: any;

  beforeEach(async () => {
    // Initialize user events
    user = userEvent.setup();

    // Clear all mocks
    vi.clearAllMocks();

    // Setup API service mocks
    const { apiService } = await import('../../services/api');
    mockApiService = apiService;

    // Setup successful API responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: '2024-01-01T00:00:00Z',
        server_id: 'integration-test-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        active_agents: 8,
        total_posts: 156,
        avg_response_time: 285,
        system_health: 95
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        totalUsers: 42,
        activeUsers: 8,
        totalPosts: 156,
        engagement: 78.5,
        performance: {
          avgLoadTime: 285,
          errorRate: 0.5
        }
      }
    });

    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalPosts: 156,
        todayPosts: 12,
        avgEngagement: 6.2,
        topCategories: ['Technology', 'AI', 'Development']
      }
    });

    // Mock window environment
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        search: '',
        pathname: '/',
        origin: 'http://localhost:3000'
      },
      writable: true
    });

    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn(),
        pushState: vi.fn()
      },
      writable: true
    });
  });

  describe('Complete Tab Navigation Flow', () => {
    it('should handle full user journey through tab navigation', async () => {
      render(<RealAnalytics />);

      // Wait for initial load and data population
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
        expect(screen.getByText('System Analytics')).toBeInTheDocument();
        expect(screen.getByText('Claude SDK Analytics')).toBeInTheDocument();
      });

      // Verify initial system tab content is visible
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // activeUsers from mock

      // User clicks Claude SDK Analytics tab
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      // Verify tab switch occurred and Claude SDK content loads
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
        expect(screen.getByText('Claude SDK Analytics')).toBeInTheDocument();
      });

      // Verify system analytics is no longer visible
      expect(screen.queryByTestId('real-analytics')).not.toBeInTheDocument();

      // User switches back to system tab
      const systemTab = screen.getByText('System Analytics');
      await user.click(systemTab);

      // Verify system content is restored
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
      });

      // Verify Claude SDK content is hidden
      expect(screen.queryByTestId('enhanced-analytics-integration')).not.toBeInTheDocument();
    });

    it('should maintain data integrity across tab switches', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify initial API calls were made
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalled();

      // Switch to Claude SDK tab
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      // Switch back to system tab
      const systemTab = screen.getByText('System Analytics');
      await user.click(systemTab);

      // Verify data is preserved (no additional API calls during tab switches)
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(1);
      expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(1);
      expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(1);

      // Verify data is still displayed correctly
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument(); // activeUsers
        expect(screen.getByText('156')).toBeInTheDocument(); // totalPosts
      });
    });
  });

  describe('URL Integration and Browser History', () => {
    it('should integrate tab state with browser URL', async () => {
      const mockReplaceState = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { replaceState: mockReplaceState },
        writable: true
      });

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Click Claude SDK tab
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      // Verify URL was updated
      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalledWith(
          {},
          '',
          expect.stringContaining('tab=claude-sdk')
        );
      });

      // Click back to system tab
      const systemTab = screen.getByText('System Analytics');
      await user.click(systemTab);

      // Verify URL parameter was removed (back to default)
      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalledWith(
          {},
          '',
          expect.not.stringContaining('tab=')
        );
      });
    });

    it('should initialize with correct tab from URL parameter', async () => {
      // Mock URL with claude-sdk parameter
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000?tab=claude-sdk',
          search: '?tab=claude-sdk'
        },
        writable: true
      });

      render(<RealAnalytics />);

      // Should initialize directly to Claude SDK tab
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // System analytics should not be visible initially
      expect(screen.queryByTestId('real-analytics')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle tab switching during API errors gracefully', async () => {
      // Setup initial success
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Simulate API error after initial load
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Network timeout'));

      // Switch to Claude SDK tab (should work despite system API error)
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // Switch back to system tab (should show error state)
      const systemTab = screen.getByText('System Analytics');
      await user.click(systemTab);

      // Should still allow tab switching even with errors
      await waitFor(() => {
        expect(screen.getByText('System Analytics')).toBeInTheDocument();
      });
    });

    it('should provide error recovery through tab interaction', async () => {
      // Start with API error
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Initial error'));

      render(<RealAnalytics />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Fix API and click retry
      mockApiService.getSystemMetrics.mockResolvedValue({
        data: [{ system_health: 95, cpu_usage: 45, memory_usage: 65, avg_response_time: 285 }]
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should recover and allow normal tab operation
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify tabs work after recovery
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should optimize resource loading for inactive tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Initially, Claude SDK content should not be rendered (lazy loading)
      expect(screen.queryByTestId('enhanced-analytics-integration')).not.toBeInTheDocument();

      // Only load when tab is activated
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });
    });

    it('should handle rapid tab switching without race conditions', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      const systemTab = screen.getByText('System Analytics');

      // Rapidly switch tabs
      await user.click(claudeSdkTab);
      await user.click(systemTab);
      await user.click(claudeSdkTab);
      await user.click(systemTab);

      // Should settle on system tab content
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Claude SDK content should not be visible
      expect(screen.queryByTestId('enhanced-analytics-integration')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide complete keyboard navigation for tab system', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Find tab triggers by their role
      const systemTabTrigger = screen.getByRole('tab', { name: /system analytics/i });
      const claudeTabTrigger = screen.getByRole('tab', { name: /claude sdk analytics/i });

      // Test keyboard navigation
      systemTabTrigger.focus();
      expect(systemTabTrigger).toHaveFocus();

      // Navigate to next tab with arrow key
      fireEvent.keyDown(systemTabTrigger, { key: 'ArrowRight' });
      expect(claudeTabTrigger).toHaveFocus();

      // Activate with Enter
      fireEvent.keyDown(claudeTabTrigger, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // Verify ARIA states
      expect(claudeTabTrigger).toHaveAttribute('aria-selected', 'true');
      expect(systemTabTrigger).toHaveAttribute('aria-selected', 'false');
    });

    it('should maintain focus management during tab content changes', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeTabTrigger = screen.getByRole('tab', { name: /claude sdk analytics/i });

      // Click and verify focus remains manageable
      await user.click(claudeTabTrigger);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // Tab panel should be accessible
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toBeInTheDocument();
      expect(tabPanel).toHaveAttribute('aria-labelledby', expect.stringContaining('claude-sdk'));
    });
  });

  describe('Real-time Data and Refresh Integration', () => {
    it('should coordinate refresh across tab system', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should trigger coordinated refresh
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
        expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(2);
        expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(2);
      });

      // Switch to Claude SDK tab during refresh
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      // Should still maintain refresh state
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });
    });

    it('should handle time range changes affecting all tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      await user.selectOptions(timeRangeSelect, '7d');

      // Should trigger API calls with new time range
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('7d');
        expect(mockApiService.getAnalytics).toHaveBeenCalledWith('7d');
      });

      // Switch tabs and verify time range persists
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // Time range should still be set to 7d
      expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
    });
  });

  describe('Cross-Component Communication', () => {
    it('should verify proper props flow to EnhancedAnalyticsPage', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        const enhancedAnalytics = screen.getByTestId('enhanced-analytics-integration');
        expect(enhancedAnalytics).toBeInTheDocument();

        // Verify props are passed correctly
        expect(enhancedAnalytics).toHaveAttribute('data-real-time', 'true');
        expect(enhancedAnalytics).toHaveAttribute('data-refresh-interval', '30000');
        expect(enhancedAnalytics).toHaveClass('min-h-[600px]');
      });
    });

    it('should handle component unmounting and remounting cleanly', async () => {
      const { unmount, rerender } = render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSdkTab = screen.getByText('Claude SDK Analytics');
      await user.click(claudeSdkTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-integration')).toBeInTheDocument();
      });

      // Unmount and remount
      unmount();
      rerender(<RealAnalytics />);

      // Should reinitialize properly
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Should be back to default system tab
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
    });
  });
});