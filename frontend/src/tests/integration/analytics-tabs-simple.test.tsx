/**
 * Simple Integration Tests for Analytics Tab Functionality and Data Flow
 *
 * Focuses on key integration scenarios without complex mocking issues.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RealAnalytics from '../../components/RealAnalytics';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn().mockResolvedValue({
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
    }),
    getAnalytics: vi.fn().mockResolvedValue({
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
    }),
    getFeedStats: vi.fn().mockResolvedValue({
      data: {
        totalPosts: 156,
        todayPosts: 12,
        avgEngagement: 6.2,
        topCategories: ['Technology', 'AI', 'Development']
      }
    }),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock the enhanced analytics page
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: ({ enableRealTime }: { enableRealTime?: boolean }) => (
    <div data-testid="claude-sdk-analytics">
      <h2>Claude SDK Cost Analytics</h2>
      <div data-testid="cost-overview">Total Cost: $142.50</div>
      <div data-testid="message-analytics">Messages: 1250</div>
      <div data-testid="real-time-indicator">
        Real-time: {enableRealTime ? 'ON' : 'OFF'}
      </div>
    </div>
  )
}));

describe('Analytics Tabs Simple Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Data Flow Integration', () => {
    it('should load system data and display in system tab', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify system data is displayed
      expect(screen.getByText('8')).toBeInTheDocument(); // Active users
      expect(screen.getByText('156')).toBeInTheDocument(); // Total posts
      expect(screen.getByText('95%')).toBeInTheDocument(); // System health
      expect(screen.getByText('285ms')).toBeInTheDocument(); // Response time
    });

    it('should handle tab switching with proper data loading', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Wait for Claude SDK data to load
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });

      // Verify Claude SDK data is displayed
      expect(screen.getByText('$142.50')).toBeInTheDocument(); // Total cost
      expect(screen.getByText('Messages: 1250')).toBeInTheDocument();
      expect(screen.getByText('Real-time: ON')).toBeInTheDocument();
    });

    it('should handle refresh functionality across tabs', async () => {
      const { apiService } = await import('../../services/api');

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Initial API calls should have been made
      expect(apiService.getSystemMetrics).toHaveBeenCalled();

      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should call APIs again
      expect(apiService.getSystemMetrics).toHaveBeenCalledTimes(2);
    });

    it('should handle time range changes', async () => {
      const { apiService } = await import('../../services/api');

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      await user.selectOptions(timeRangeSelect, '7d');

      // Should call APIs with new time range
      expect(apiService.getSystemMetrics).toHaveBeenCalledWith('7d');
      expect(apiService.getAnalytics).toHaveBeenCalledWith('7d');
    });

    it('should maintain tab state during refresh', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Tab should remain active
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const { apiService } = await import('../../services/api');

      // Mock API to reject
      apiService.getSystemMetrics.mockRejectedValueOnce(new Error('Network error'));
      apiService.getAnalytics.mockRejectedValueOnce(new Error('Network error'));
      apiService.getFeedStats.mockRejectedValueOnce(new Error('Network error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should recover from errors when retrying', async () => {
      const { apiService } = await import('../../services/api');

      // Start with API failure
      apiService.getSystemMetrics.mockRejectedValueOnce(new Error('Temporary error'));
      apiService.getAnalytics.mockRejectedValueOnce(new Error('Temporary error'));
      apiService.getFeedStats.mockRejectedValueOnce(new Error('Temporary error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      });

      // Reset mocks to succeed
      apiService.getSystemMetrics.mockResolvedValueOnce({
        data: [{
          timestamp: new Date().toISOString(),
          server_id: 'main-server',
          cpu_usage: 45,
          memory_usage: 65,
          active_agents: 8,
          total_posts: 156,
          avg_response_time: 285,
          system_health: 95
        }]
      });
      apiService.getAnalytics.mockResolvedValueOnce({
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
      apiService.getFeedStats.mockResolvedValueOnce({
        data: {
          totalPosts: 156,
          todayPosts: 12,
          avgEngagement: 6.2,
          topCategories: ['Technology', 'AI', 'Development']
        }
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
      expect(screen.getByText('8')).toBeInTheDocument(); // Active users
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper ARIA relationships during tab switching', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });

      // Check initial state
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

      // Switch tabs
      await user.click(claudeSDKTab);

      // Check new state
      expect(systemTab).toHaveAttribute('aria-selected', 'false');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

      // Check tabpanel is associated correctly
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('aria-labelledby', 'tab-claude-sdk');
    });

    it('should support keyboard navigation', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });

      // Focus on system tab
      systemTab.focus();
      expect(systemTab).toHaveFocus();

      // Use keyboard to navigate and activate
      await user.keyboard('{ArrowRight}');
      expect(claudeSDKTab).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});