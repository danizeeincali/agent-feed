import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * Integration Test Suite - Claude SDK Analytics Full Validation
 * London School TDD Approach: Outside-In Testing
 *
 * Tests the complete integration of:
 * 1. RealAnalytics component
 * 2. EnhancedAnalyticsPage lazy loading
 * 3. Tab navigation system
 * 4. Error boundaries and fallbacks
 * 5. URL state management
 * 6. API service integration
 *
 * Focus: Behavior verification after NLD removal
 */

// Integration test collaborators
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

// Full mock of EnhancedAnalyticsPage with all expected features
const mockEnhancedAnalyticsPage = vi.fn(({ className, enableRealTime, refreshInterval }) => (
  <div 
    data-testid="enhanced-analytics-page" 
    className={className}
    data-real-time={enableRealTime}
    data-refresh-interval={refreshInterval}
  >
    {/* Cost Overview Tab */}
    <div data-testid="cost-overview-section">
      <h2>Cost Overview Dashboard</h2>
      <div data-testid="cost-metrics">
        <div data-testid="total-cost">$125.50</div>
        <div data-testid="daily-cost">$4.25</div>
        <div data-testid="monthly-projection">$127.50</div>
      </div>
      <div data-testid="cost-breakdown">
        <div data-testid="api-calls-cost">API Calls: $85.30</div>
        <div data-testid="storage-cost">Storage: $25.20</div>
        <div data-testid="bandwidth-cost">Bandwidth: $15.00</div>
      </div>
    </div>

    {/* Message Step Analytics Tab */}
    <div data-testid="message-analytics-section">
      <h2>Message Step Analytics</h2>
      <div data-testid="message-metrics">
        <div data-testid="total-messages">1,247</div>
        <div data-testid="avg-steps-per-message">3.2</div>
        <div data-testid="successful-completions">98.5%</div>
      </div>
      <div data-testid="step-breakdown">
        <div data-testid="code-generation-steps">Code Generation: 425</div>
        <div data-testid="analysis-steps">Analysis: 312</div>
        <div data-testid="testing-steps">Testing: 298</div>
      </div>
    </div>

    {/* Optimization Recommendations Tab */}
    <div data-testid="optimization-section">
      <h2>Optimization Recommendations</h2>
      <div data-testid="optimization-list">
        <div data-testid="recommendation-1">
          Reduce API call frequency during low-activity periods
        </div>
        <div data-testid="recommendation-2">
          Implement caching for repeated code analysis requests
        </div>
        <div data-testid="recommendation-3">
          Optimize message batching for better throughput
        </div>
      </div>
      <button data-testid="apply-optimizations">Apply Recommendations</button>
    </div>

    {/* Export and Reporting Tab */}
    <div data-testid="export-section">
      <h2>Export & Reporting Features</h2>
      <div data-testid="export-options">
        <button data-testid="export-pdf">Export PDF Report</button>
        <button data-testid="export-csv">Export CSV Data</button>
        <button data-testid="export-json">Export JSON Data</button>
      </div>
      <div data-testid="report-templates">
        <select data-testid="report-template-selector">
          <option value="weekly">Weekly Summary</option>
          <option value="monthly">Monthly Report</option>
          <option value="quarterly">Quarterly Analysis</option>
        </select>
      </div>
    </div>

    {/* Real-time Status Indicator */}
    <div data-testid="real-time-status">
      Real-time updates: {enableRealTime ? 'Active' : 'Inactive'}
      {enableRealTime && <div data-testid="refresh-indicator">⟳</div>}
    </div>
  </div>
));

// Mock the lazy-loaded component
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: mockEnhancedAnalyticsPage
}));

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Claude SDK Analytics - Full Integration Validation', () => {
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
    
    // Mock successful responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'main-server',
        cpu_usage: 35,
        memory_usage: 55,
        disk_usage: 40,
        network_io: { bytes_in: 2000, bytes_out: 3000, packets_in: 20, packets_out: 30 },
        response_time: 150,
        throughput: 120,
        error_rate: 0.2,
        active_connections: 55,
        queue_depth: 3,
        cache_hit_rate: 0.92,
        active_agents: 12,
        total_posts: 247,
        avg_response_time: 150,
        system_health: 98
      }]
    });
    
    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        totalUsers: 68,
        activeUsers: 15,
        totalPosts: 247,
        engagement: 85.3,
        performance: {
          avgLoadTime: 150,
          errorRate: 0.2
        }
      }
    });
    
    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalPosts: 247,
        todayPosts: 18,
        avgEngagement: 7.8,
        topCategories: ['Development', 'AI/ML', 'Testing', 'DevOps']
      }
    });
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('Complete User Journey - Outside-In Testing', () => {
    it('should complete full analytics exploration journey', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Step 1: Initial load shows System Analytics
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time system metrics and performance data')).toBeInTheDocument();

      // Step 2: Verify system metrics are displayed
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // activeUsers from mock
      expect(screen.getByText('247')).toBeInTheDocument(); // totalPosts from mock
      expect(screen.getByText('85.3%')).toBeInTheDocument(); // engagement from mock

      // Step 3: Navigate to Claude SDK Analytics
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Step 4: Verify loading state
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();

      // Step 5: Wait for Claude SDK Analytics to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Step 6: Verify all Claude SDK sections are present
      expect(screen.getByTestId('cost-overview-section')).toBeInTheDocument();
      expect(screen.getByTestId('message-analytics-section')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-section')).toBeInTheDocument();
      expect(screen.getByTestId('export-section')).toBeInTheDocument();

      // Step 7: Verify cost metrics are displayed
      expect(screen.getByTestId('total-cost')).toBeInTheDocument();
      expect(screen.getByText('$125.50')).toBeInTheDocument();
      expect(screen.getByText('$4.25')).toBeInTheDocument();

      // Step 8: Verify message analytics
      expect(screen.getByTestId('total-messages')).toBeInTheDocument();
      expect(screen.getByText('1,247')).toBeInTheDocument();
      expect(screen.getByText('3.2')).toBeInTheDocument();

      // Step 9: Test Performance tab
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      expect(screen.getByText('Application Performance')).toBeInTheDocument();
      expect(screen.getByText('Resource Usage')).toBeInTheDocument();

      // Step 10: Return to Claude SDK tab
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Component should maintain state and not reload
      expect(screen.getByTestId('real-time-status')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates: Active')).toBeInTheDocument();
    });

    it('should handle URL-driven navigation correctly', async () => {
      // Start with Claude SDK tab in URL
      (window as any).location.search = '?tab=claude-sdk';
      
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load directly to Claude SDK Analytics
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify we skipped the loading screen and went straight to content
      expect(screen.queryByTestId('claude-sdk-loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('cost-overview-section')).toBeInTheDocument();

      // Navigate to system tab
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      fireEvent.click(systemTab);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      });

      // URL should be updated (mocked, but behavior should trigger)
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Scenarios and Recovery - Behavior Verification', () => {
    it('should handle API failures gracefully without breaking analytics', async () => {
      // Mock API failures
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('API service unavailable'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Analytics service down'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Feed service error'));

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should still load with fallback data
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should show error message but maintain UI structure
      expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      expect(screen.getByText('API service unavailable')).toBeInTheDocument();

      // Tab navigation should still work
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toBeInTheDocument();
      
      // Clicking should still attempt to load analytics
      fireEvent.click(claudeSDKTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should recover from component loading errors', async () => {
      // Mock component that fails on first load but succeeds on retry
      let failureCount = 0;
      const unreliableMock = vi.fn(() => {
        failureCount++;
        if (failureCount === 1) {
          throw new Error('Component initialization failed');
        }
        return mockEnhancedAnalyticsPage();
      });

      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: unreliableMock
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

      // Should show error fallback
      await waitFor(() => {
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      });
      
      mockApiService.getSystemMetrics.mockReturnValue(timeoutPromise);
      mockApiService.getAnalytics.mockReturnValue(timeoutPromise);
      mockApiService.getFeedStats.mockReturnValue(timeoutPromise);

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();

      // After timeout, should show error
      await waitFor(() => {
        expect(screen.getByText('Analytics Error')).toBeInTheDocument();
      }, { timeout: 500 });

      // Retry button should be available
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Performance and Real-time Features', () => {
    it('should verify real-time updates are properly configured', async () => {
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

      // Verify real-time configuration
      const analyticsPage = screen.getByTestId('enhanced-analytics-page');
      expect(analyticsPage).toHaveAttribute('data-real-time', 'true');
      expect(analyticsPage).toHaveAttribute('data-refresh-interval', '30000');

      // Verify real-time status is displayed
      expect(screen.getByTestId('real-time-status')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates: Active')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-indicator')).toBeInTheDocument();
    });

    it('should handle refresh operations across all tabs', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      
      // Initial API calls
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(1);
      
      // Refresh system analytics
      fireEvent.click(refreshButton);
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Refresh should still work on Claude SDK tab
      fireEvent.click(refreshButton);
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(3);
    });

    it('should verify export functionality in Claude SDK Analytics', async () => {
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

      // Verify export section is present
      expect(screen.getByTestId('export-section')).toBeInTheDocument();
      expect(screen.getByText('Export & Reporting Features')).toBeInTheDocument();

      // Verify export options
      expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
      expect(screen.getByTestId('export-csv')).toBeInTheDocument();
      expect(screen.getByTestId('export-json')).toBeInTheDocument();

      // Test export button functionality
      const exportPdfButton = screen.getByTestId('export-pdf');
      fireEvent.click(exportPdfButton);
      
      // Should not cause any errors
      expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should verify keyboard navigation works correctly', async () => {
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

      // Test keyboard navigation
      systemTab.focus();
      expect(document.activeElement).toBe(systemTab);

      // Arrow key navigation (simulated)
      fireEvent.keyDown(systemTab, { key: 'ArrowRight' });
      
      // Should be able to navigate to Claude SDK tab
      fireEvent.click(claudeSDKTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should verify ARIA attributes and screen reader compatibility', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify tab structure has proper ARIA attributes
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });

      expect(systemTab).toHaveAttribute('aria-selected', 'true');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
      expect(performanceTab).toHaveAttribute('aria-selected', 'false');

      // Switch tab and verify ARIA updates
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
        expect(systemTab).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should verify loading states provide adequate feedback', async () => {
      // Mock slow loading
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve({ data: [] }), 200);
      });
      
      mockApiService.getSystemMetrics.mockReturnValue(slowPromise);
      mockApiService.getAnalytics.mockReturnValue(slowPromise);
      mockApiService.getFeedStats.mockReturnValue(slowPromise);

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should show appropriate loading message
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
      expect(screen.getByText('Initializing cost tracking and performance monitoring')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Loading message should be gone
      expect(screen.queryByText('Loading Claude SDK Analytics...')).not.toBeInTheDocument();
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should properly clean up event listeners and prevent memory leaks', async () => {
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

      // Verify event listeners are set up
      expect(onSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));

      // Unmount component
      unmount();

      // Verify cleanup
      expect(offSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });

    it('should handle rapid mount/unmount cycles gracefully', async () => {
      const { unmount, rerender } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Rapid unmount/remount cycle
      unmount();
      
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should still function normally
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });
  });
});
