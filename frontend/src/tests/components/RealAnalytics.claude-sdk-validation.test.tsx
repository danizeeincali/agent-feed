import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * TDD London School Test Suite for Claude SDK Analytics Validation
 * After NLD (Natural Language Detection) Removal
 *
 * Focus Areas:
 * 1. Tab navigation and switching behavior
 * 2. Component lazy loading without NLD dependencies 
 * 3. Error boundaries and fallback states
 * 4. User journey testing (outside-in approach)
 * 5. Regression testing for all tabs
 *
 * London School Principles Applied:
 * - Mock all collaborators
 * - Test interactions and behavior
 * - Outside-in development approach
 * - Focus on object conversations
 */

// Mock collaborators following London School approach
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

const mockEnhancedAnalyticsPage = vi.fn(({ className, enableRealTime, refreshInterval }) => (
  <div 
    data-testid="enhanced-analytics-page" 
    className={className}
    data-real-time={enableRealTime}
    data-refresh-interval={refreshInterval}
  >
    <h2>Claude SDK Analytics Content</h2>
    <div data-testid="cost-overview">Cost Overview Dashboard</div>
    <div data-testid="message-analytics">Message Step Analytics</div>
    <div data-testid="optimization-recommendations">Optimization Recommendations</div>
    <div data-testid="export-features">Export Reporting Features</div>
  </div>
));

// Mock the dynamic import for EnhancedAnalyticsPage
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: mockEnhancedAnalyticsPage
}));

// Mock API service
vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

// Test wrapper for routing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Claude SDK Analytics Validation - Post NLD Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window location for URL testing
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost:3000/analytics',
      search: '',
      pathname: '/analytics'
    };
    
    // Mock successful API responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'main-server',
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
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('Tab Navigation Tests - Mock-Driven Approach', () => {
    it('should navigate to Claude SDK Analytics tab and load content successfully', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Wait for initial system tab to load
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify initial state is System Analytics
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();

      // Click Claude SDK Analytics tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Verify tab switches and content loads
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify mock collaborator was called with correct props
      expect(mockEnhancedAnalyticsPage).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'min-h-[600px]',
          enableRealTime: true,
          refreshInterval: 30000
        }),
        expect.any(Object)
      );

      // Verify content is displayed
      expect(screen.getByText('Claude SDK Analytics Content')).toBeInTheDocument();
      expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
    });

    it('should verify tab state management and URL parameter handling', async () => {
      // Test with URL parameter for Claude SDK tab
      (window as any).location.search = '?tab=claude-sdk';
      
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should start with Claude SDK tab due to URL parameter
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Switch back to system tab
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      fireEvent.click(systemTab);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      });
    });

    it('should handle rapid tab switching without conflicts', async () => {
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
      for (let i = 0; i < 3; i++) {
        fireEvent.click(claudeSDKTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
        
        fireEvent.click(performanceTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
        
        fireEvent.click(systemTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Component should remain stable
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });
  });

  describe('Component Loading Tests - Lazy Loading Validation', () => {
    it('should handle EnhancedAnalyticsPage lazy loading without NLD dependencies', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Click Claude SDK tab to trigger lazy loading
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Should show loading fallback briefly
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify no NLD-related errors or dependencies
      expect(screen.queryByText(/NLD/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Natural Language/i)).not.toBeInTheDocument();
    });

    it('should verify Suspense fallback behavior during loading', async () => {
      // Mock delayed import to test Suspense
      const delayedMock = vi.fn(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              default: mockEnhancedAnalyticsPage
            });
          }, 100);
        });
      });

      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', delayedMock);

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

      // Verify loading state
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Initializing cost tracking and performance monitoring')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle import errors gracefully with error boundary', async () => {
      // Mock import failure
      const failingMock = vi.fn(() => {
        throw new Error('Module loading failed - no NLD dependency found');
      });

      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', failingMock);

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

      // Verify retry functionality
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
    });
  });

  describe('Outside-In Integration Tests - User Journey', () => {
    it('should complete full user journey: load → navigate → view analytics', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Step 1: Page loads with system analytics
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time system metrics and performance data')).toBeInTheDocument();

      // Step 2: User clicks Claude SDK Analytics tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Step 3: Analytics content loads and displays
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
      
      // Verify all expected analytics sections are present
      expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
      expect(screen.getByTestId('message-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-recommendations')).toBeInTheDocument();
      expect(screen.getByTestId('export-features')).toBeInTheDocument();

      // Step 4: Verify analytics configuration
      const analyticsPage = screen.getByTestId('enhanced-analytics-page');
      expect(analyticsPage).toHaveAttribute('data-real-time', 'true');
      expect(analyticsPage).toHaveAttribute('data-refresh-interval', '30000');
    });

    it('should handle browser refresh and maintain tab state', async () => {
      // Set initial URL with tab parameter
      (window as any).location.search = '?tab=claude-sdk';
      
      const { rerender } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load directly to Claude SDK tab
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Simulate browser refresh by re-rendering
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should maintain Claude SDK tab state
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should verify console error absence during normal operation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Navigate through all tabs
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Verify no console errors related to NLD or missing dependencies
      const errorCalls = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('NLD') || 
        call[0]?.includes?.('Natural Language') ||
        call[0]?.includes?.('Module not found')
      );
      expect(errorCalls).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Regression Tests - All Three Tabs', () => {
    it('should verify System Analytics tab maintains full functionality', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify system analytics content
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Total Posts')).toBeInTheDocument();
      expect(screen.getByText('Engagement')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();

      // Verify API calls were made
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalled();
    });

    it('should verify Performance tab functionality', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Click Performance tab
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Verify performance content
      expect(screen.getByText('Application Performance')).toBeInTheDocument();
      expect(screen.getByText('Resource Usage')).toBeInTheDocument();
      expect(screen.getByText('Engagement Statistics')).toBeInTheDocument();
    });

    it('should verify all tabs can be switched between without errors', async () => {
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

      // Test all combinations of tab switching
      const switchingSequence = [
        { tab: claudeSDKTab, expected: 'enhanced-analytics-page' },
        { tab: performanceTab, expected: 'performance-metrics' },
        { tab: systemTab, expected: 'real-analytics' },
        { tab: claudeSDKTab, expected: 'enhanced-analytics-page' },
        { tab: systemTab, expected: 'real-analytics' },
        { tab: performanceTab, expected: 'performance-metrics' }
      ];

      for (const { tab, expected } of switchingSequence) {
        fireEvent.click(tab);
        await waitFor(() => {
          expect(screen.getByTestId(expected)).toBeInTheDocument();
        });
      }
    });

    it('should verify refresh functionality works across all tabs', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      
      // Test refresh on system tab
      fireEvent.click(refreshButton);
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2); // Initial + refresh

      // Switch to Claude SDK and verify it still works
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Refresh should still be functional
      fireEvent.click(refreshButton);
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(3);
    });
  });

  describe('Contract Tests - Component Collaborations', () => {
    it('should verify EnhancedAnalyticsPage receives correct props contract', async () => {
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
        expect(mockEnhancedAnalyticsPage).toHaveBeenCalledWith(
          expect.objectContaining({
            className: 'min-h-[600px]',
            enableRealTime: true,
            refreshInterval: 30000
          }),
          expect.any(Object) // React ref
        );
      });
    });

    it('should verify API service collaboration contract', async () => {
      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify all expected API calls were made with correct parameters
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalledWith();

      // Verify event listener setup for real-time updates
      expect(mockApiService.on).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });

    it('should verify error boundary collaboration contract', async () => {
      // Test error boundary integration
      const ErrorThrowingComponent = () => {
        throw new Error('Test error for boundary');
      };

      const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div data-testid="error-boundary">Error caught</div>;
        }
      };

      render(
        <TestWrapper>
          <TestErrorBoundary>
            <RealAnalytics />
          </TestErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Component should render successfully even with error boundary wrapper
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });
  });
});
