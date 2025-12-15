import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * Component Collaboration Contract Tests
 * London School TDD: Contract-Based Interaction Testing
 *
 * Validates the contracts between components after NLD removal:
 * 1. RealAnalytics <-> EnhancedAnalyticsPage contract
 * 2. RealAnalytics <-> API Service contract
 * 3. Component <-> Error Boundary contract
 * 4. Component <-> Suspense contract
 * 5. Tab system contracts
 * 6. Props passing contracts
 *
 * Focus: Interaction patterns and interface contracts
 */

// Contract test mocks - focus on interface compliance
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

// Mock that captures all prop interactions for contract validation
const mockEnhancedAnalyticsPage = vi.fn((props) => {
  // Contract: EnhancedAnalyticsPage should receive specific props
  const expectedContract = {
    className: expect.any(String),
    enableRealTime: expect.any(Boolean),
    refreshInterval: expect.any(Number)
  };
  
  // Validate prop contract
  expect(props).toMatchObject(expectedContract);
  
  return (
    <div 
      data-testid="enhanced-analytics-page"
      data-contract-test="props-received"
      data-class-name={props.className}
      data-real-time={props.enableRealTime}
      data-refresh-interval={props.refreshInterval}
    >
      <div data-testid="contract-validated">Contract compliance validated</div>
    </div>
  );
});

vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: mockEnhancedAnalyticsPage
}));

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Contract test data
const contractTestData = {
  systemMetrics: {
    data: [{
      timestamp: '2024-01-15T10:00:00Z',
      server_id: 'contract-test-server',
      cpu_usage: 40,
      memory_usage: 50,
      disk_usage: 30,
      network_io: {
        bytes_in: 2000,
        bytes_out: 3000,
        packets_in: 20,
        packets_out: 30
      },
      response_time: 150,
      throughput: 140,
      error_rate: 0.2,
      active_connections: 70,
      queue_depth: 4,
      cache_hit_rate: 0.93
    }]
  },
  analytics: {
    data: {
      totalUsers: 80,
      activeUsers: 20,
      totalPosts: 400,
      engagement: 90.5,
      performance: {
        avgLoadTime: 150,
        errorRate: 0.2
      }
    }
  },
  feedStats: {
    data: {
      totalPosts: 400,
      todayPosts: 25,
      avgEngagement: 9.5,
      topCategories: ['Contract', 'Testing', 'Analytics', 'Validation']
    }
  }
};

describe('Component Collaboration Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset URL state for consistent testing
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost:3000/analytics',
      search: '',
      pathname: '/analytics',
      origin: 'http://localhost:3000'
    };
    
    // Set up contract-compliant API responses
    mockApiService.getSystemMetrics.mockResolvedValue(contractTestData.systemMetrics);
    mockApiService.getAnalytics.mockResolvedValue(contractTestData.analytics);
    mockApiService.getFeedStats.mockResolvedValue(contractTestData.feedStats);
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('RealAnalytics <-> EnhancedAnalyticsPage Contract', () => {
    it('should pass correct props contract to EnhancedAnalyticsPage', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Trigger Claude SDK Analytics loading
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify contract compliance
      expect(mockEnhancedAnalyticsPage).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'min-h-[600px]',
          enableRealTime: true,
          refreshInterval: 30000
        }),
        expect.any(Object) // React ref
      );

      // Verify props were received correctly
      expect(screen.getByTestId('contract-validated')).toBeInTheDocument();
      
      const analyticsPage = screen.getByTestId('enhanced-analytics-page');
      expect(analyticsPage).toHaveAttribute('data-class-name', 'min-h-[600px]');
      expect(analyticsPage).toHaveAttribute('data-real-time', 'true');
      expect(analyticsPage).toHaveAttribute('data-refresh-interval', '30000');
    });

    it('should respect EnhancedAnalyticsPage lazy loading contract', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initially, EnhancedAnalyticsPage should not be loaded
      expect(mockEnhancedAnalyticsPage).not.toHaveBeenCalled();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();

      // Trigger lazy loading
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Should show loading state first
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();

      // Then load the component
      await waitFor(() => {
        expect(mockEnhancedAnalyticsPage).toHaveBeenCalled();
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Loading state should be gone
      expect(screen.queryByTestId('claude-sdk-loading')).not.toBeInTheDocument();
    });

    it('should maintain contract during component re-renders', async () => {
      const { rerender } = render(
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

      const initialCallCount = mockEnhancedAnalyticsPage.mock.calls.length;

      // Re-render component
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Component should maintain contract on re-render
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Contract should be maintained across re-renders
      expect(mockEnhancedAnalyticsPage.mock.calls[initialCallCount - 1][0]).toMatchObject({
        className: 'min-h-[600px]',
        enableRealTime: true,
        refreshInterval: 30000
      });
    });
  });

  describe('RealAnalytics <-> API Service Contract', () => {
    it('should call API service methods with correct contract parameters', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify API contract compliance
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalledWith();

      // Verify event listener contract
      expect(mockApiService.on).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });

    it('should handle API service response contract correctly', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify data is displayed according to contract
      expect(screen.getByText('80')).toBeInTheDocument(); // totalUsers
      expect(screen.getByText('20')).toBeInTheDocument(); // activeUsers
      expect(screen.getByText('400')).toBeInTheDocument(); // totalPosts
      expect(screen.getByText('90.5%')).toBeInTheDocument(); // engagement

      // Verify system metrics contract
      expect(screen.getByText('40%')).toBeInTheDocument(); // cpu_usage
      expect(screen.getByText('50%')).toBeInTheDocument(); // memory_usage
      expect(screen.getByText('150ms')).toBeInTheDocument(); // response_time
    });

    it('should handle time range parameter contract changes', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Change time range to trigger new API calls
      const timeRangeSelector = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelector, { target: { value: '7d' } });

      // Verify new API calls with updated contract
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('7d');
        expect(mockApiService.getAnalytics).toHaveBeenCalledWith('7d');
      });
    });

    it('should maintain API cleanup contract on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify event listener setup
      expect(mockApiService.on).toHaveBeenCalledWith('metrics_updated', expect.any(Function));

      // Unmount component
      unmount();

      // Verify cleanup contract
      expect(mockApiService.off).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });
  });

  describe('Error Boundary Contract Compliance', () => {
    it('should provide correct error information to error boundary', async () => {
      // Mock component that throws with specific error contract
      const errorComponent = vi.fn(() => {
        throw new Error('Contract test error: Component failed to load');
      });
      
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: errorComponent
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

      // Should show error boundary with contract-compliant error message
      await waitFor(() => {
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Contract test error: Component failed to load/)).toBeInTheDocument();
      });

      // Error boundary should provide recovery contract
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle error boundary reset contract', async () => {
      let shouldFail = true;
      const conditionalErrorComponent = vi.fn(() => {
        if (shouldFail) {
          throw new Error('Error boundary contract test');
        }
        return mockEnhancedAnalyticsPage({ 
          className: 'min-h-[600px]', 
          enableRealTime: true, 
          refreshInterval: 30000 
        });
      });
      
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: conditionalErrorComponent
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

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      });

      // Fix the error condition
      shouldFail = false;

      // Click retry to test recovery contract
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should recover and show component
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });
  });

  describe('Suspense Boundary Contract', () => {
    it('should provide correct fallback to Suspense boundary', async () => {
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

      // Should show Suspense fallback with contract-compliant content
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
      expect(screen.getByText('Initializing cost tracking and performance monitoring')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Fallback should be removed
      expect(screen.queryByTestId('claude-sdk-loading')).not.toBeInTheDocument();
    });

    it('should handle Suspense timeout contract', async () => {
      // Mock component that loads with delay to test timeout behavior
      const delayedComponent = vi.fn(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ 
              default: () => mockEnhancedAnalyticsPage({
                className: 'min-h-[600px]',
                enableRealTime: true,
                refreshInterval: 30000
              })
            });
          }, 12000); // Longer than timeout
        });
      });
      
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', delayedComponent);

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

      // Should show loading state
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();

      // Wait for timeout warning to appear (contract requirement)
      await waitFor(() => {
        expect(screen.getByText('Loading is taking longer than usual...')).toBeInTheDocument();
      }, { timeout: 15000 });
    });
  });

  describe('Tab System Contracts', () => {
    it('should maintain ARIA contract for tab accessibility', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify tab role contract
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });

      // Verify initial ARIA contract
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
      expect(performanceTab).toHaveAttribute('aria-selected', 'false');

      // Switch tab and verify ARIA contract maintenance
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
        expect(systemTab).toHaveAttribute('aria-selected', 'false');
        expect(performanceTab).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should maintain tab content visibility contract', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initial state: System Analytics visible
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('performance-metrics')).not.toBeInTheDocument();

      // Switch to Claude SDK: only Claude SDK content visible
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
      expect(screen.queryByTestId('performance-metrics')).not.toBeInTheDocument();

      // Switch to Performance: only Performance content visible
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
    });
  });

  describe('Props and State Contract Validation', () => {
    it('should validate className prop contract', async () => {
      render(
        <TestWrapper>
          <RealAnalytics className="custom-test-class" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Component should accept and apply className contract
      const container = screen.getByTestId('real-analytics').closest('.custom-test-class');
      expect(container).toBeInTheDocument();
    });

    it('should maintain state contract during prop changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealAnalytics className="initial-class" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Change props and verify state is maintained
      rerender(
        <TestWrapper>
          <RealAnalytics className="updated-class" />
        </TestWrapper>
      );

      // Should maintain Claude SDK tab state
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Event Handler Contracts', () => {
    it('should maintain refresh button contract', async () => {
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

      // Refresh button contract test
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      // Should trigger additional API calls per contract
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(2);
      expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(2);
    });

    it('should maintain time range selector contract', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const timeRangeSelector = screen.getByDisplayValue('Last 24 Hours');
      
      // Test contract for different time ranges
      const timeRangeTests = [
        { value: '7d', expectedCall: '7d' },
        { value: '30d', expectedCall: '30d' },
        { value: '90d', expectedCall: '90d' }
      ];

      for (const test of timeRangeTests) {
        fireEvent.change(timeRangeSelector, { target: { value: test.value } });
        
        await waitFor(() => {
          expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith(test.expectedCall);
        });
      }
    });
  });
});
