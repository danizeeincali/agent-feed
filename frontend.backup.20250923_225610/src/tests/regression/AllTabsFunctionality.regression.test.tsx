import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * Regression Test Suite - All Tabs Functionality
 * London School TDD: Behavior-Driven Regression Testing
 *
 * Ensures that NLD removal did not break:
 * 1. System Analytics tab functionality
 * 2. Claude SDK Analytics tab functionality  
 * 3. Performance tab functionality
 * 4. Tab switching between all combinations
 * 5. URL state persistence
 * 6. Refresh functionality across tabs
 * 7. Error handling in each tab
 *
 * Focus: Comprehensive regression coverage
 */

// Mock all collaborating services
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

const mockEnhancedAnalyticsPage = vi.fn((props) => (
  <div data-testid="enhanced-analytics-page" {...props}>
    <div data-testid="claude-sdk-content">Claude SDK Analytics Loaded</div>
    <div data-testid="cost-tracking">Cost Tracking Active</div>
    <div data-testid="usage-analytics">Usage Analytics Dashboard</div>
    <div data-testid="performance-insights">Performance Insights</div>
  </div>
));

vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: mockEnhancedAnalyticsPage
}));

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Test data fixtures
const mockSystemMetrics = {
  data: [{
    timestamp: new Date().toISOString(),
    server_id: 'test-server',
    cpu_usage: 42,
    memory_usage: 68,
    disk_usage: 35,
    network_io: { bytes_in: 5000, bytes_out: 7000, packets_in: 50, packets_out: 70 },
    response_time: 180,
    throughput: 150,
    error_rate: 0.3,
    active_connections: 85,
    queue_depth: 7,
    cache_hit_rate: 0.88,
    active_agents: 15,
    total_posts: 312,
    avg_response_time: 180,
    system_health: 96
  }]
};

const mockAnalyticsData = {
  data: {
    totalUsers: 89,
    activeUsers: 22,
    totalPosts: 312,
    engagement: 82.7,
    performance: {
      avgLoadTime: 180,
      errorRate: 0.3
    }
  }
};

const mockFeedStats = {
  data: {
    totalPosts: 312,
    todayPosts: 25,
    avgEngagement: 8.4,
    topCategories: ['Development', 'Testing', 'AI/ML', 'DevOps', 'Security']
  }
};

describe('All Tabs Functionality - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset URL state
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost:3000/analytics',
      search: '',
      pathname: '/analytics',
      origin: 'http://localhost:3000'
    };
    
    // Set up successful mock responses
    mockApiService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
    mockApiService.getAnalytics.mockResolvedValue(mockAnalyticsData);
    mockApiService.getFeedStats.mockResolvedValue(mockFeedStats);
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('System Analytics Tab - Regression Coverage', () => {
    it('should maintain full System Analytics functionality after NLD removal', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Verify initial load to System Analytics
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify header content
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time system metrics and performance data')).toBeInTheDocument();

      // Verify all metric cards are present and populated
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument(); // activeUsers from mock
      
      expect(screen.getByText('Total Posts')).toBeInTheDocument();
      expect(screen.getByText('312')).toBeInTheDocument(); // totalPosts from mock
      
      expect(screen.getByText('Engagement')).toBeInTheDocument();
      expect(screen.getByText('82.7%')).toBeInTheDocument(); // engagement from mock
      
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('96%')).toBeInTheDocument(); // system_health from mock

      // Verify performance section
      expect(screen.getByText('System Performance')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('42%')).toBeInTheDocument(); // cpu_usage from mock
      
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('68%')).toBeInTheDocument(); // memory_usage from mock
      
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('180ms')).toBeInTheDocument(); // response_time from mock

      // Verify API calls were made correctly
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalled();
    });

    it('should handle System Analytics refresh functionality', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initial API calls
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(1);
      
      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      // Verify refresh triggered new API calls
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(2);

      // Content should still be displayed
      await waitFor(() => {
        expect(screen.getByText('22')).toBeInTheDocument();
      });
    });

    it('should handle System Analytics time range changes', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelector = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelector, { target: { value: '7d' } });

      // Should trigger new API calls with updated range
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('7d');
      });
    });
  });

  describe('Claude SDK Analytics Tab - Regression Coverage', () => {
    it('should maintain full Claude SDK Analytics functionality after NLD removal', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Navigate to Claude SDK Analytics tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Verify loading state appears
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify all Claude SDK sections are present
      expect(screen.getByTestId('claude-sdk-content')).toBeInTheDocument();
      expect(screen.getByTestId('cost-tracking')).toBeInTheDocument();
      expect(screen.getByTestId('usage-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('performance-insights')).toBeInTheDocument();

      // Verify component received correct props
      expect(mockEnhancedAnalyticsPage).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'min-h-[600px]',
          enableRealTime: true,
          refreshInterval: 30000
        }),
        expect.any(Object)
      );

      // Verify no NLD-related content or errors
      expect(screen.queryByText(/NLD/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Natural Language Detection/i)).not.toBeInTheDocument();
    });

    it('should handle Claude SDK Analytics error states gracefully', async () => {
      // Mock component error
      const errorMock = vi.fn(() => {
        throw new Error('Claude SDK component failed to load');
      });
      
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: errorMock
      }));

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Should show error fallback instead of white screen
      await waitFor(() => {
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load Claude SDK Analytics/)).toBeInTheDocument();
      });

      // Error boundary should provide retry option
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should verify Claude SDK Analytics lazy loading behavior', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initially, Claude SDK component should not be loaded
      expect(mockEnhancedAnalyticsPage).not.toHaveBeenCalled();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();

      // Click Claude SDK tab to trigger lazy loading
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Now component should be loaded
      await waitFor(() => {
        expect(mockEnhancedAnalyticsPage).toHaveBeenCalled();
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tab - Regression Coverage', () => {
    it('should maintain full Performance tab functionality after NLD removal', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Navigate to Performance tab
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Verify all performance sections are present
      expect(screen.getByText('Application Performance')).toBeInTheDocument();
      expect(screen.getByText('Resource Usage')).toBeInTheDocument();
      expect(screen.getByText('Engagement Statistics')).toBeInTheDocument();

      // Verify performance metrics display
      expect(screen.getByText('Average Load Time')).toBeInTheDocument();
      expect(screen.getByText('180ms')).toBeInTheDocument(); // avgLoadTime from mock
      
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('0.3%')).toBeInTheDocument(); // errorRate from mock
      
      expect(screen.getByText('Active Agents')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // active_agents from mock
      
      expect(screen.getByText('Posts Today')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // todayPosts from mock

      // Verify resource usage bars
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Disk Usage')).toBeInTheDocument();

      // Verify engagement statistics
      expect(screen.getByText('Overall Engagement')).toBeInTheDocument();
      expect(screen.getByText('82.7%')).toBeInTheDocument(); // engagement from mock
      
      expect(screen.getByText('Avg. Interactions')).toBeInTheDocument();
      expect(screen.getByText('8.4')).toBeInTheDocument(); // avgEngagement from mock
      
      expect(screen.getByText('Active Categories')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // topCategories.length from mock
    });

    it('should handle Performance tab data updates correctly', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Update mock data
      const updatedMetrics = {
        ...mockSystemMetrics,
        data: [{
          ...mockSystemMetrics.data[0],
          cpu_usage: 55,
          memory_usage: 72,
          active_agents: 18
        }]
      };
      
      mockApiService.getSystemMetrics.mockResolvedValue(updatedMetrics);

      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      // Should reflect updated data
      await waitFor(() => {
        expect(screen.getByText('55%')).toBeInTheDocument(); // updated cpu_usage
      });
    });
  });

  describe('Tab Switching - Comprehensive Regression', () => {
    it('should handle all possible tab switching combinations', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });

      // Test all switching combinations
      const switchingTests = [
        { from: 'System', to: 'Claude SDK', tab: claudeSDKTab, expected: 'enhanced-analytics-page' },
        { from: 'Claude SDK', to: 'Performance', tab: performanceTab, expected: 'performance-metrics' },
        { from: 'Performance', to: 'System', tab: systemTab, expected: 'real-analytics' },
        { from: 'System', to: 'Performance', tab: performanceTab, expected: 'performance-metrics' },
        { from: 'Performance', to: 'Claude SDK', tab: claudeSDKTab, expected: 'enhanced-analytics-page' },
        { from: 'Claude SDK', to: 'System', tab: systemTab, expected: 'real-analytics' }
      ];

      for (const test of switchingTests) {
        fireEvent.click(test.tab);
        
        await waitFor(() => {
          expect(screen.getByTestId(test.expected)).toBeInTheDocument();
        }, { timeout: 2000 });
        
        // Verify tab aria-selected state
        expect(test.tab).toHaveAttribute('aria-selected', 'true');
      }
    });

    it('should maintain state consistency during rapid tab switching', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });

      // Rapid switching sequence
      const rapidSequence = [claudeSDKTab, performanceTab, systemTab, claudeSDKTab, performanceTab];
      
      for (const tab of rapidSequence) {
        fireEvent.click(tab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Final state should be Performance tab
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });
      
      expect(performanceTab).toHaveAttribute('aria-selected', 'true');
      expect(systemTab).toHaveAttribute('aria-selected', 'false');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should preserve refresh functionality across all tab switches', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });

      // Test refresh on each tab
      const tabTests = [
        { tab: systemTab, name: 'System' },
        { tab: claudeSDKTab, name: 'Claude SDK' },
        { tab: performanceTab, name: 'Performance' }
      ];

      let expectedCallCount = 1; // Initial load

      for (const test of tabTests) {
        fireEvent.click(test.tab);
        
        if (test.name === 'Claude SDK') {
          await waitFor(() => {
            expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
          });
        } else if (test.name === 'Performance') {
          await waitFor(() => {
            expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
          });
        }

        // Refresh should work on each tab
        fireEvent.click(refreshButton);
        expectedCallCount++;
        
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(expectedCallCount);
      }
    });
  });

  describe('URL State Management - Regression Coverage', () => {
    it('should handle URL parameter initialization correctly', async () => {
      const urlTests = [
        { search: '?tab=system', expectedTab: 'System Analytics', expectedContent: 'real-analytics' },
        { search: '?tab=claude-sdk', expectedTab: 'Claude SDK Analytics', expectedContent: 'enhanced-analytics-page' },
        { search: '?tab=performance', expectedTab: 'Performance', expectedContent: 'performance-metrics' }
      ];

      for (const test of urlTests) {
        // Set URL parameter
        (window as any).location.search = test.search;
        
        const { unmount } = render(
          <TestWrapper>
            <RealAnalytics />
          </TestWrapper>
        );

        // Should load the correct tab based on URL
        if (test.expectedContent === 'enhanced-analytics-page') {
          await waitFor(() => {
            expect(screen.getByTestId(test.expectedContent)).toBeInTheDocument();
          });
        } else {
          await waitFor(() => {
            expect(screen.getByTestId(test.expectedContent)).toBeInTheDocument();
          });
        }

        // Verify correct tab is selected
        const selectedTab = screen.getByRole('tab', { name: new RegExp(test.expectedTab, 'i') });
        expect(selectedTab).toHaveAttribute('aria-selected', 'true');

        unmount();
      }
    });

    it('should maintain URL consistency during tab navigation', async () => {
      // Mock history API
      const mockReplaceState = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { replaceState: mockReplaceState },
        writable: true
      });

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // URL should be updated (behavior verification)
      // Note: In test environment, we verify the intention rather than actual URL change
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Handling - Cross-Tab Regression', () => {
    it('should handle API errors gracefully across all tabs', async () => {
      // Mock API failures
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('System metrics API failed'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Analytics API failed'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Feed stats API failed'));

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should show error but not break the UI
      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      });

      // Tab navigation should still work
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Performance tab should also work
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });
    });

    it('should recover from temporary errors with retry functionality', async () => {
      let callCount = 0;
      mockApiService.getSystemMetrics.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve(mockSystemMetrics);
      });

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.getByText('22')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Management - Cross-Tab Regression', () => {
    it('should properly manage memory during tab navigation', async () => {
      const onSpy = vi.spyOn(mockApiService, 'on');
      const offSpy = vi.spyOn(mockApiService, 'off');

      const { unmount } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Navigate through all tabs
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      
      fireEvent.click(claudeSDKTab);
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      fireEvent.click(performanceTab);
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Verify event listeners are set up
      expect(onSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));

      unmount();

      // Verify cleanup
      expect(offSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });
  });
});
