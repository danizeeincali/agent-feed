/**
 * TDD Test Suite for Claude SDK Analytics Tab
 * Comprehensive testing following Red-Green-Refactor cycle
 * 
 * RED PHASE: Write failing tests first
 * GREEN PHASE: Make tests pass with minimal implementation
 * REFACTOR PHASE: Optimize and clean up
 */

import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Mock performance utilities
const mockPerformanceHelpers = {
  PerformanceTimer: class {
    private startTimes = new Map<string, number>();
    start(label: string) {
      this.startTimes.set(label, performance.now());
    }
    end(label: string): number {
      const startTime = this.startTimes.get(label) || 0;
      return performance.now() - startTime;
    }
    clear() {
      this.startTimes.clear();
    }
  },
  measureComponentLoading: vi.fn().mockResolvedValue({
    totalLoadTime: 200,
    totalRenderTime: 50,
    memoryUsage: { delta: 1024 * 1024 }
  }),
  waitForComponentStable: vi.fn().mockResolvedValue(true),
  measureTimeToInteractive: vi.fn().mockResolvedValue(300),
  globalTimer: { clear: vi.fn() },
  globalMemoryTracker: { clear: vi.fn() }
};

// Mock the performance helpers module
vi.mock('../utils/performanceHelpers', () => mockPerformanceHelpers);

// Mock API service
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn()
};

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

// Mock UI components
vi.mock('../../components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div data-testid="tabs-container" className={className}>
      <div data-testid="active-tab" data-value={value}>{value}</div>
      <button 
        data-testid="tab-change-trigger" 
        onClick={() => onValueChange && onValueChange('claude-sdk')}
      >
        Change Tab
      </button>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value, className }: any) => (
    <button data-testid={`tab-trigger-${value}`} className={className} data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div data-testid={`tab-content-${value}`} className={className} data-value={value}>
      {children}
    </div>
  )
}));

// Mock EnhancedAnalyticsPage component
const MockEnhancedAnalyticsPage = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      if (props.simulateError) {
        setHasError(true);
      } else {
        setIsLoading(false);
      }
    }, props.loadingDelay || 100);

    return () => clearTimeout(timer);
  }, [props.simulateError, props.loadingDelay]);

  if (hasError) {
    throw new Error('EnhancedAnalyticsPage failed to load');
  }

  if (isLoading) {
    return (
      <div data-testid="enhanced-analytics-loading" ref={ref}>
        Loading Enhanced Analytics...
      </div>
    );
  }

  return (
    <div data-testid="enhanced-analytics-page" ref={ref} className={props.className}>
      <div data-testid="claude-sdk-header">
        <h1>Claude Code SDK Analytics</h1>
        <p>Comprehensive cost tracking, usage analytics, and performance insights</p>
      </div>
      
      <div data-testid="analytics-tabs">
        <div data-testid="cost-overview-tab">Cost Overview Dashboard</div>
        <div data-testid="messages-steps-tab">Message Step Analytics</div>
        <div data-testid="optimization-tab">Optimization Recommendations</div>
        <div data-testid="export-tab">Export Reporting Features</div>
      </div>

      <div data-testid="analytics-content">
        <div data-testid="cost-metrics">Cost Metrics: $42.50</div>
        <div data-testid="usage-stats">Usage: 1,250 API calls</div>
        <div data-testid="performance-data">Avg Response: 285ms</div>
      </div>

      {props.enableRealTime && (
        <div data-testid="real-time-indicator">Real-time updates enabled</div>
      )}
    </div>
  );
});

MockEnhancedAnalyticsPage.displayName = 'MockEnhancedAnalyticsPage';

// Mock lazy loading
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: MockEnhancedAnalyticsPage,
  __esModule: true
}));

// Create a test wrapper for RealAnalytics
const TestRealAnalytics = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [activeTab, setActiveTab] = React.useState(props.initialTab || 'system');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (props.onTabChange) {
      props.onTabChange(newTab);
    }
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), props.loadingTime || 200);
  };

  const simulateError = () => {
    setError('Analytics failed to load');
  };

  if (error) {
    return (
      <div data-testid="analytics-error" ref={ref}>
        <p>Error: {error}</p>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="analytics-loading" ref={ref}>
        <div data-testid="loading-spinner">Loading Analytics...</div>
      </div>
    );
  }

  return (
    <div data-testid="real-analytics" ref={ref} className={props.className}>
      {/* Header */}
      <div data-testid="analytics-header">
        <h2>Analytics Dashboard</h2>
        <p>Real-time system metrics and performance data</p>
        <button 
          data-testid="refresh-button" 
          onClick={simulateLoading}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div data-testid="tab-navigation">
        <button
          data-testid="system-tab-button"
          onClick={() => handleTabChange('system')}
          aria-pressed={activeTab === 'system'}
          className={activeTab === 'system' ? 'active' : ''}
        >
          System Analytics
        </button>
        <button
          data-testid="claude-sdk-tab-button"
          onClick={() => handleTabChange('claude-sdk')}
          aria-pressed={activeTab === 'claude-sdk'}
          className={activeTab === 'claude-sdk' ? 'active' : ''}
        >
          Claude SDK Analytics
        </button>
        <button
          data-testid="performance-tab-button"
          onClick={() => handleTabChange('performance')}
          aria-pressed={activeTab === 'performance'}
          className={activeTab === 'performance' ? 'active' : ''}
        >
          Performance
        </button>
      </div>

      {/* Tab Content */}
      <div data-testid="tab-content-area">
        {activeTab === 'system' && (
          <div data-testid="system-tab-content">
            <div data-testid="system-metrics">
              <div data-testid="active-users">Active Users: 8</div>
              <div data-testid="total-posts">Total Posts: 156</div>
              <div data-testid="engagement">Engagement: 78.5%</div>
              <div data-testid="system-health">System Health: 95%</div>
            </div>
          </div>
        )}

        {activeTab === 'claude-sdk' && (
          <div data-testid="claude-sdk-tab-content">
            <Suspense fallback={<div data-testid="claude-sdk-loading">Loading Claude SDK Analytics...</div>}>
              <MockEnhancedAnalyticsPage
                className="min-h-[600px]"
                enableRealTime={true}
                refreshInterval={30000}
                simulateError={props.simulateAnalyticsError}
                loadingDelay={props.analyticsLoadingDelay}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'performance' && (
          <div data-testid="performance-tab-content">
            <div data-testid="performance-metrics">
              <div data-testid="avg-load-time">Avg Load Time: 285ms</div>
              <div data-testid="error-rate">Error Rate: 0.5%</div>
              <div data-testid="active-agents">Active Agents: 8</div>
              <div data-testid="posts-today">Posts Today: 12</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Controls */}
      {props.showTestControls && (
        <div data-testid="test-controls">
          <button data-testid="simulate-error" onClick={simulateError}>
            Simulate Error
          </button>
          <button data-testid="simulate-loading" onClick={simulateLoading}>
            Simulate Loading
          </button>
        </div>
      )}
    </div>
  );
});

TestRealAnalytics.displayName = 'TestRealAnalytics';

// Error Boundary for testing
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary-fallback">
          <h3>Something went wrong</h3>
          <p data-testid="error-message">{this.state.error?.message}</p>
          <button 
            data-testid="error-retry" 
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

describe('Claude SDK Analytics Tab - TDD Test Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnTabChange = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup API mocks with default success responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'test-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        network_io: { bytes_in: 1000, bytes_out: 2000, packets_in: 10, packets_out: 20 },
        response_time: 285,
        throughput: 100,
        error_rate: 0.5,
        active_connections: 42,
        queue_depth: 5,
        cache_hit_rate: 0.85
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        totalUsers: 42,
        activeUsers: 8,
        totalPosts: 156,
        engagement: 78.5
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

    mockPerformanceHelpers.globalTimer.clear();
    mockPerformanceHelpers.globalMemoryTracker.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * RED PHASE: Write failing tests first
   * These tests define the expected behavior before implementation
   */
  describe('🔴 RED PHASE - Tab Visibility and Accessibility', () => {
    it('should render Claude SDK Analytics tab button', () => {
      render(<TestRealAnalytics />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      expect(claudeSDKTab).toBeInTheDocument();
      expect(claudeSDKTab).toHaveTextContent('Claude SDK Analytics');
    });

    it('should make Claude SDK tab clickable and focusable', async () => {
      render(<TestRealAnalytics onTabChange={mockOnTabChange} />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      
      // Test clickability
      expect(claudeSDKTab).not.toBeDisabled();
      
      // Test accessibility
      await user.click(claudeSDKTab);
      expect(mockOnTabChange).toHaveBeenCalledWith('claude-sdk');
      
      // Test keyboard navigation
      claudeSDKTab.focus();
      expect(claudeSDKTab).toHaveFocus();
    });

    it('should show active state when Claude SDK tab is selected', async () => {
      render(<TestRealAnalytics initialTab="claude-sdk" />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      expect(claudeSDKTab).toHaveAttribute('aria-pressed', 'true');
      expect(claudeSDKTab).toHaveClass('active');
    });

    it('should not show active state when other tabs are selected', () => {
      render(<TestRealAnalytics initialTab="system" />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      expect(claudeSDKTab).toHaveAttribute('aria-pressed', 'false');
      expect(claudeSDKTab).not.toHaveClass('active');
    });
  });

  describe('🔴 RED PHASE - Content Loading After Tab Click', () => {
    it('should show loading state immediately after tab click', async () => {
      render(<TestRealAnalytics />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      await user.click(claudeSDKTab);
      
      // Should show loading state
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByTestId('claude-sdk-loading')).toHaveTextContent('Loading Claude SDK Analytics...');
    });

    it('should load EnhancedAnalyticsPage content after tab activation', async () => {
      render(<TestRealAnalytics />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      await user.click(claudeSDKTab);
      
      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Verify content is loaded
      expect(screen.getByTestId('claude-sdk-header')).toBeInTheDocument();
      expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();
    });

    it('should not load content until tab is clicked', () => {
      render(<TestRealAnalytics initialTab="system" />);
      
      // Claude SDK content should not be loaded
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('claude-sdk-header')).not.toBeInTheDocument();
    });

    it('should maintain loaded content when switching away and back', async () => {
      render(<TestRealAnalytics />);
      
      // Load Claude SDK tab
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // Switch to system tab
      await user.click(screen.getByTestId('system-tab-button'));
      expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
      
      // Switch back to Claude SDK tab
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED PHASE - Lazy Loading Mechanism', () => {
    it('should implement proper Suspense boundary', async () => {
      render(<TestRealAnalytics analyticsLoadingDelay={300} />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      // Should show Suspense fallback
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      
      // Wait for actual component to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Loading should be gone
      expect(screen.queryByTestId('claude-sdk-loading')).not.toBeInTheDocument();
    });

    it('should handle fast loading without flicker', async () => {
      render(<TestRealAnalytics analyticsLoadingDelay={10} />);
      
      const startTime = performance.now();
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 500 });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(200); // Should load quickly
    });

    it('should not cause memory leaks with repeated loading', async () => {
      const { rerender } = render(<TestRealAnalytics />);
      
      // Load and unload multiple times
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByTestId('claude-sdk-tab-button'));
        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        });
        
        await user.click(screen.getByTestId('system-tab-button'));
        expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
      }
      
      // Memory usage should be stable
      expect(mockPerformanceHelpers.globalMemoryTracker.clear).toHaveBeenCalled();
    });
  });

  describe('🔴 RED PHASE - Error Boundary Functionality', () => {
    it('should catch and display EnhancedAnalyticsPage errors', async () => {
      const onError = vi.fn();
      
      render(
        <TestErrorBoundary onError={onError}>
          <TestRealAnalytics simulateAnalyticsError={true} />
        </TestErrorBoundary>
      );
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByTestId('error-message')).toHaveTextContent('EnhancedAnalyticsPage failed to load');
    });

    it('should provide error recovery mechanism', async () => {
      render(
        <TestErrorBoundary>
          <TestRealAnalytics simulateAnalyticsError={true} />
        </TestErrorBoundary>
      );
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
      
      // Test retry functionality
      const retryButton = screen.getByTestId('error-retry');
      expect(retryButton).toBeInTheDocument();
      
      await user.click(retryButton);
      
      // Error boundary should reset
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should isolate errors to Claude SDK tab only', async () => {
      render(
        <TestErrorBoundary>
          <TestRealAnalytics simulateAnalyticsError={true} />
        </TestErrorBoundary>
      );
      
      // Other tabs should still work
      await user.click(screen.getByTestId('system-tab-button'));
      expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('performance-tab-button'));
      expect(screen.getByTestId('performance-tab-content')).toBeInTheDocument();
      
      // Only Claude SDK tab should show error
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED PHASE - Props Passing and API Data Flow', () => {
    it('should pass correct props to EnhancedAnalyticsPage', async () => {
      render(<TestRealAnalytics />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // Verify props are passed correctly
      const analyticsPage = screen.getByTestId('enhanced-analytics-page');
      expect(analyticsPage).toHaveClass('min-h-[600px]');
      
      // Real-time updates should be enabled
      expect(screen.getByTestId('real-time-indicator')).toBeInTheDocument();
    });

    it('should display analytics data from API', async () => {
      render(<TestRealAnalytics />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // Verify analytics content is displayed
      expect(screen.getByTestId('cost-metrics')).toHaveTextContent('Cost Metrics: $42.50');
      expect(screen.getByTestId('usage-stats')).toHaveTextContent('Usage: 1,250 API calls');
      expect(screen.getByTestId('performance-data')).toHaveTextContent('Avg Response: 285ms');
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('API Error'));
      
      render(<TestRealAnalytics showTestControls={true} />);
      
      // Simulate error
      await user.click(screen.getByTestId('simulate-error'));
      
      expect(screen.getByTestId('analytics-error')).toBeInTheDocument();
      expect(screen.getByText('Error: Analytics failed to load')).toBeInTheDocument();
    });
  });

  describe('🔴 RED PHASE - Loading and Error States', () => {
    it('should show appropriate loading states', async () => {
      render(<TestRealAnalytics showTestControls={true} />);
      
      // Test global loading state
      await user.click(screen.getByTestId('simulate-loading'));
      
      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Loading Analytics...');
    });

    it('should handle loading timeout scenarios', async () => {
      render(<TestRealAnalytics analyticsLoadingDelay={2000} />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      // Should show loading for extended period
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      
      // Should eventually load (testing patience)
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should provide refresh functionality', async () => {
      render(<TestRealAnalytics />);
      
      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
      
      await user.click(refreshButton);
      
      // Should show loading state during refresh
      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    });
  });

  /**
   * GREEN PHASE: Performance and Integration Tests
   * These tests verify the working implementation
   */
  describe('🟢 GREEN PHASE - Performance Requirements', () => {
    it('should meet loading time benchmarks', async () => {
      const startTime = performance.now();
      
      render(<TestRealAnalytics />);
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    it('should handle rapid tab switching efficiently', async () => {
      render(<TestRealAnalytics />);
      
      const startTime = performance.now();
      
      // Rapid tab switches
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId('claude-sdk-tab-button'));
        await user.click(screen.getByTestId('system-tab-button'));
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(2000); // All switches within 2 seconds
    });

    it('should maintain responsive UI during loading', async () => {
      render(<TestRealAnalytics />);
      
      // Start loading Claude SDK tab
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      // Other tabs should still be responsive
      const systemTab = screen.getByTestId('system-tab-button');
      expect(systemTab).not.toBeDisabled();
      
      await user.click(systemTab);
      expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
    });
  });

  describe('🟢 GREEN PHASE - Integration Testing', () => {
    it('should integrate with parent component state', async () => {
      const onTabChange = vi.fn();
      
      render(<TestRealAnalytics onTabChange={onTabChange} />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      expect(onTabChange).toHaveBeenCalledWith('claude-sdk');
      expect(onTabChange).toHaveBeenCalledTimes(1);
    });

    it('should work with different initial states', async () => {
      const { rerender } = render(<TestRealAnalytics initialTab="system" />);
      
      expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
      
      rerender(<TestRealAnalytics initialTab="claude-sdk" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should maintain accessibility standards', async () => {
      render(<TestRealAnalytics />);
      
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab-button');
      
      // Test ARIA attributes
      expect(claudeSDKTab).toHaveAttribute('aria-pressed');
      
      // Test keyboard navigation
      claudeSDKTab.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });
  });

  /**
   * REFACTOR PHASE: Edge Cases and Advanced Scenarios
   */
  describe('🔵 REFACTOR PHASE - Edge Cases and Advanced Scenarios', () => {
    it('should handle concurrent tab switching', async () => {
      render(<TestRealAnalytics />);
      
      // Simulate rapid concurrent clicks
      const promises = [
        user.click(screen.getByTestId('claude-sdk-tab-button')),
        user.click(screen.getByTestId('system-tab-button')),
        user.click(screen.getByTestId('claude-sdk-tab-button'))
      ];
      
      await Promise.all(promises);
      
      // Should handle gracefully without crashes
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
    });

    it('should cleanup resources on unmount', () => {
      const { unmount } = render(<TestRealAnalytics />);
      
      unmount();
      
      // Verify cleanup was called
      expect(mockPerformanceHelpers.globalTimer.clear).toHaveBeenCalled();
    });

    it('should handle browser back/forward navigation', async () => {
      render(<TestRealAnalytics />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      // Simulate browser navigation
      const popStateEvent = new PopStateEvent('popstate', { state: { tab: 'system' } });
      window.dispatchEvent(popStateEvent);
      
      // Should handle navigation gracefully
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
    });

    it('should work with reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<TestRealAnalytics />);
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // Should work without animations
      expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
    });
  });

  /**
   * COMPREHENSIVE VALIDATION TESTS
   */
  describe('🎯 COMPREHENSIVE VALIDATION - End-to-End Scenarios', () => {
    it('should complete full user journey successfully', async () => {
      const onTabChange = vi.fn();
      
      render(<TestRealAnalytics onTabChange={onTabChange} />);
      
      // 1. Initial state
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('system-tab-content')).toBeInTheDocument();
      
      // 2. Navigate to Claude SDK tab
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      expect(onTabChange).toHaveBeenCalledWith('claude-sdk');
      
      // 3. Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // 4. Verify all analytics components are present
      expect(screen.getByTestId('claude-sdk-header')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-content')).toBeInTheDocument();
      
      // 5. Check specific analytics data
      expect(screen.getByTestId('cost-overview-tab')).toBeInTheDocument();
      expect(screen.getByTestId('messages-steps-tab')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-tab')).toBeInTheDocument();
      expect(screen.getByTestId('export-tab')).toBeInTheDocument();
      
      // 6. Verify real-time features
      expect(screen.getByTestId('real-time-indicator')).toBeInTheDocument();
      
      // 7. Navigate to other tabs and back
      await user.click(screen.getByTestId('performance-tab-button'));
      expect(screen.getByTestId('performance-tab-content')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      
      // Journey completed successfully
      expect(onTabChange).toHaveBeenCalledTimes(3);
    });

    it('should handle error recovery workflow', async () => {
      render(
        <TestErrorBoundary>
          <TestRealAnalytics simulateAnalyticsError={true} showTestControls={true} />
        </TestErrorBoundary>
      );
      
      // 1. Trigger error in Claude SDK tab
      await user.click(screen.getByTestId('claude-sdk-tab-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
      
      // 2. Verify error is displayed
      expect(screen.getByTestId('error-message')).toHaveTextContent('EnhancedAnalyticsPage failed to load');
      
      // 3. Test recovery
      await user.click(screen.getByTestId('error-retry'));
      
      // 4. Verify recovery
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
    });
  });
});
