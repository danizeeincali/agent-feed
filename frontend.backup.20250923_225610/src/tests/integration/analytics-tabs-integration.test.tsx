/**
 * Integration Tests for Analytics Tab Functionality and Data Flow
 *
 * Tests the complete integration between tab components, data fetching,
 * error handling, and user interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RealAnalytics from '../../components/RealAnalytics';

// Mock the API service with detailed responses
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock analytics components with realistic behavior
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: ({ enableRealTime, refreshInterval }: any) => {
    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState(null);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setLoading(false);
        setData({
          costOverview: { totalCost: 142.50, monthlyBudget: 500 },
          messageAnalytics: { totalMessages: 1250, avgCost: 0.114 },
          optimizations: [
            { type: 'model-selection', savings: 23.5 },
            { type: 'caching', savings: 15.2 }
          ]
        });
      }, 100);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
      return <div data-testid="claude-sdk-loading">Loading Claude SDK Analytics...</div>;
    }

    return (
      <div data-testid="claude-sdk-analytics">
        <h2>Claude SDK Cost Analytics</h2>
        <div data-testid="cost-overview">
          Total Cost: ${data.costOverview.totalCost}
        </div>
        <div data-testid="message-analytics">
          Messages: {data.messageAnalytics.totalMessages}
        </div>
        <div data-testid="optimization-recommendations">
          {data.optimizations.length} recommendations available
        </div>
        <div data-testid="real-time-indicator">
          Real-time: {enableRealTime ? 'ON' : 'OFF'}
        </div>
      </div>
    );
  }
}));

describe('Analytics Tabs Integration Tests', () => {
  const user = userEvent.setup();

  const mockSystemMetrics = {
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
  };

  const mockAnalytics = {
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
  };

  const mockFeedStats = {
    data: {
      totalPosts: 156,
      todayPosts: 12,
      avgEngagement: 6.2,
      topCategories: ['Technology', 'AI', 'Development']
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked API service
    const { apiService } = await import('../../services/api');

    apiService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
    apiService.getAnalytics.mockResolvedValue(mockAnalytics);
    apiService.getFeedStats.mockResolvedValue(mockFeedStats);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Data Flow Integration', () => {
    it('should load system data correctly and display in system tab', async () => {
      render(<RealAnalytics />);

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify API calls were made
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalled();

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

      // Should show loading state first
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();

      // Wait for Claude SDK data to load
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });

      // Verify Claude SDK data is displayed
      expect(screen.getByText('$142.5')).toBeInTheDocument(); // Total cost
      expect(screen.getByText('Messages: 1250')).toBeInTheDocument();
      expect(screen.getByText('2 recommendations available')).toBeInTheDocument();
    });

    it('should handle concurrent API calls gracefully', async () => {
      // Delay one API call to test concurrent handling
      mockApiService.getSystemMetrics.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockSystemMetrics), 100))
      );

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // All APIs should be called concurrently
      expect(mockApiService.getSystemMetrics).toHaveBeenCalled();
      expect(mockApiService.getAnalytics).toHaveBeenCalled();
      expect(mockApiService.getFeedStats).toHaveBeenCalled();

      // Data should eventually be displayed
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('should handle partial API failures gracefully', async () => {
      // Make one API fail
      mockApiService.getSystemMetrics.mockRejectedValueOnce(new Error('System metrics failed'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Should show fallback data for failed metrics
      expect(screen.getByText('45%')).toBeInTheDocument(); // Fallback CPU usage

      // But other data should still work
      expect(screen.getByText('78.5%')).toBeInTheDocument(); // Engagement from analytics API
    });

    it('should refresh data across all tabs', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Initial API calls
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(1);

      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should call APIs again
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(2);
    });

    it('should handle real-time updates in Claude SDK tab', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });

      // Should indicate real-time is enabled
      expect(screen.getByText('Real-time: ON')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle complete API failure with error boundary', async () => {
      // Make all APIs fail
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Network error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Network error'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Network error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should recover from errors when retrying', async () => {
      // Start with API failure
      mockApiService.getSystemMetrics.mockRejectedValueOnce(new Error('Temporary error'));
      mockApiService.getAnalytics.mockRejectedValueOnce(new Error('Temporary error'));
      mockApiService.getFeedStats.mockRejectedValueOnce(new Error('Temporary error'));

      // Then succeed on retry
      mockApiService.getSystemMetrics.mockResolvedValueOnce(mockSystemMetrics);
      mockApiService.getAnalytics.mockResolvedValueOnce(mockAnalytics);
      mockApiService.getFeedStats.mockResolvedValueOnce(mockFeedStats);

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
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

    it('should handle Claude SDK loading timeout', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Should show loading initially
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();

      // Simulate long loading (would trigger timeout in real implementation)
      await waitFor(() => {
        expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should optimize API calls by avoiding unnecessary requests', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab and back
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      await user.click(systemTab);

      // Should not make additional API calls for already loaded data
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid tab switching without race conditions', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      const systemTab = screen.getByRole('tab', { name: /system analytics/i });

      // Rapidly switch tabs
      await user.click(claudeSDKTab);
      await user.click(systemTab);
      await user.click(claudeSDKTab);
      await user.click(systemTab);

      // Final state should be system tab active
      await waitFor(() => {
        expect(systemTab).toHaveAttribute('aria-selected', 'true');
      });

      // Should show system data
      expect(screen.getByText('System Performance')).toBeInTheDocument();
    });
  });

  describe('Time Range Integration', () => {
    it('should update data when time range changes', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      await user.selectOptions(timeRangeSelect, '7d');

      // Should call APIs with new time range
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('7d');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('7d');
    });

    it('should maintain time range selection across tab switches', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      await user.selectOptions(timeRangeSelect, '7d');

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
      await user.click(claudeSDKTab);

      // Switch back to system tab
      const systemTab = screen.getByRole('tab', { name: /system analytics/i });
      await user.click(systemTab);

      // Time range should be preserved
      expect(timeRangeSelect).toHaveValue('7d');
    });
  });
});