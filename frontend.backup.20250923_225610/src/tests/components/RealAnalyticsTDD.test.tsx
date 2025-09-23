/**
 * TDD Test Suite for RealAnalytics Tab Functionality and SDK Analytics Access
 *
 * This test suite follows Test-Driven Development (TDD) principles:
 * 1. RED: Write failing tests for missing functionality
 * 2. GREEN: Implement minimum code to pass tests
 * 3. REFACTOR: Optimize and clean up implementation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RealAnalytics from '../../components/RealAnalytics';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock the analytics components
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="claude-sdk-analytics" className={className}>
      <h2>Claude SDK Cost Analytics</h2>
      <div data-testid="cost-overview">Cost Overview Dashboard</div>
      <div data-testid="message-analytics">Message Analytics</div>
      <div data-testid="optimization-recommendations">Optimization Recommendations</div>
      <div data-testid="export-features">Export Features</div>
    </div>
  )
}));

// Mock Radix UI tabs for testing
vi.mock('@radix-ui/react-tabs', () => ({
  Root: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="tabs-root" data-value={value} {...props}>
      {children}
    </div>
  ),
  List: ({ children, ...props }: any) => (
    <div role="tablist" data-testid="tabs-list" {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, value, ...props }: any) => (
    <button
      role="tab"
      data-testid={`tab-trigger-${value}`}
      data-value={value}
      {...props}
    >
      {children}
    </button>
  ),
  Content: ({ children, value, ...props }: any) => (
    <div
      role="tabpanel"
      data-testid={`tab-content-${value}`}
      data-value={value}
      {...props}
    >
      {children}
    </div>
  )
}));

describe('RealAnalytics TDD Test Suite', () => {
  const user = userEvent.setup();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked API service
    const { apiService } = await import('../../services/api');

    // Setup default successful API responses
    apiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'main-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        active_agents: 8,
        total_posts: 156,
        avg_response_time: 285,
        system_health: 95
      }]
    });

    apiService.getAnalytics.mockResolvedValue({
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

    apiService.getFeedStats.mockResolvedValue({
      data: {
        totalPosts: 156,
        todayPosts: 12,
        avgEngagement: 6.2,
        topCategories: ['Technology', 'AI', 'Development']
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('RED Phase: Failing Tests for Missing Tab Functionality', () => {
    it('should render tab navigation with System and Claude SDK tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // These tests will fail initially because tabs aren't implemented yet
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /system analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /claude sdk analytics/i })).toBeInTheDocument();
    });

    it('should have System tab active by default', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'true');

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should switch tabs when clicked', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should show appropriate content for each tab', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // System tab content should be visible by default
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('System Performance')).toBeInTheDocument();

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Claude SDK content should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });
      expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
    });

    it('should support keyboard navigation for tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      systemTab.focus();

      // Arrow key navigation
      await user.keyboard('{ArrowRight}');
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      expect(claudeSDKTab).toHaveFocus();

      // Enter key activation
      await user.keyboard('{Enter}');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle tab loading states', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Should show loading state for Claude SDK tab
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
    });

    it('should handle Claude SDK Analytics lazy loading', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Should eventually load the Claude SDK component
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText('Claude SDK Cost Analytics')).toBeInTheDocument();
    });

    it('should handle Claude SDK Analytics loading errors', async () => {
      // Mock dynamic import failure
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => {
        throw new Error('Failed to load Claude SDK Analytics');
      });

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      });
      expect(screen.getByText(/failed to load claude sdk analytics/i)).toBeInTheDocument();
    });

    it('should show error boundary for tab content errors', async () => {
      // Mock API to reject for Claude SDK tab
      mockApiService.getAnalytics.mockRejectedValueOnce(new Error('Claude SDK API Error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should maintain tab state during data refresh', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      });

      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Tab should remain active after refresh
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should have proper ARIA attributes for accessibility', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Check for proper ARIA structure
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });

      expect(systemTab).toHaveAttribute('aria-selected', 'true');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

      // Check tabpanel exists
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toBeInTheDocument();
    });

    it('should handle tab switching performance', async () => {
      const performanceSpy = vi.spyOn(performance, 'now');

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const startTime = performance.now();
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      });

      const endTime = performance.now();
      const tabSwitchTime = endTime - startTime;

      // Tab switching should be fast (< 100ms)
      expect(tabSwitchTime).toBeLessThan(100);

      performanceSpy.mockRestore();
    });

    it('should handle URL-based tab routing', async () => {
      // Mock window.location
      const mockLocation = {
        ...window.location,
        search: '?tab=claude-sdk'
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Should activate Claude SDK tab based on URL parameter
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle concurrent tab operations', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      const systemTab = screen.getByRole('tab', { name: /system analytics/i });

      // Rapidly switch between tabs
      await user.click(claudeSDKTab);
      await user.click(systemTab);
      await user.click(claudeSDKTab);

      // Final state should be Claude SDK tab active
      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should display analytics data in both tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // System tab should show system metrics
      expect(screen.getByText('8')).toBeInTheDocument(); // Active users
      expect(screen.getByText('156')).toBeInTheDocument(); // Total posts

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });

      // Claude SDK tab should show cost analytics
      expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
      expect(screen.getByTestId('message-analytics')).toBeInTheDocument();
    });

    it('should handle tab content overflow and scrolling', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Tab content should be scrollable when it overflows
      const tabContent = screen.getByRole('tabpanel');
      expect(tabContent).toHaveStyle({ overflowY: 'auto' });
    });
  });

  describe('GREEN Phase: Integration Tests for Complete Tab Functionality', () => {
    it('should integrate system analytics with tab functionality', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify system tab is working with real data
      expect(screen.getByText('System Performance')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('65%')).toBeInTheDocument(); // Memory usage
    });

    it('should integrate Claude SDK analytics with tab functionality', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });

      // Verify Claude SDK components are loaded
      expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
      expect(screen.getByTestId('message-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-recommendations')).toBeInTheDocument();
      expect(screen.getByTestId('export-features')).toBeInTheDocument();
    });

    it('should handle error recovery across tabs', async () => {
      // Start with working API
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Simulate API recovery
      mockApiService.getAnalytics.mockResolvedValueOnce({
        data: { /* recovered data */ }
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should recover and show content
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });
    });
  });

  describe('REFACTOR Phase: Performance and Optimization Tests', () => {
    it('should optimize tab switching with lazy loading', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Claude SDK component should not be loaded initially
      expect(screen.queryByTestId('claude-sdk-analytics')).not.toBeInTheDocument();

      // Only load when tab is activated
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });
    });

    it('should handle memory cleanup when switching tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      const systemTab = screen.getByRole('tab', { name: /system analytics/i });

      // Switch between tabs multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(claudeSDKTab);
        await user.click(systemTab);
      }

      // Should not cause memory leaks
      expect(mockApiService.on).toHaveBeenCalledTimes(1); // Only one listener
      expect(mockApiService.off).toHaveBeenCalled(); // Cleanup called
    });
  });
});