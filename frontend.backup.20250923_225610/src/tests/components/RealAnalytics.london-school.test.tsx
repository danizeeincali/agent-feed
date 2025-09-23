import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { Suspense } from 'react';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * TDD London School Test Suite for RealAnalytics White Screen Issues
 *
 * Focus Areas:
 * 1. Dynamic import validation and error handling
 * 2. Suspense fallback behavior verification
 * 3. Error boundary interaction testing
 * 4. Component mounting and lifecycle verification
 */

describe('RealAnalytics - London School TDD White Screen Analysis', () => {
  // Mock collaborators following London School approach
  const mockApiService = {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  };

  const mockAnalyticsMonitoring = vi.fn();
  const mockEnhancedAnalyticsPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock implementations to successful state
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        id: '1',
        timestamp: new Date().toISOString(),
        active_agents: 5,
        total_posts: 100,
        cpu_usage: 45,
        memory_usage: 60,
        db_performance: 95,
        avg_response_time: 250
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        agentOperations: 45,
        postCreations: 23,
        systemEvents: 12,
        userInteractions: 67
      }
    });

    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalAgents: 5,
        totalPosts: 100,
        systemHealth: 95
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('Dynamic Import Validation', () => {
    it('should handle ClaudeSDKAnalytics import failure gracefully', async () => {
      // Mock the dynamic import to fail
      const mockImportError = new Error('Module not found');

      // Test the interaction between RealAnalytics and its dynamic import
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => {
        throw mockImportError;
      });

      render(<RealAnalytics />);

      // Verify component loads with system tab first
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab to trigger dynamic import
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Verify fallback error component is shown instead of white screen
      await waitFor(() => {
        expect(screen.getByText(/Analytics Unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      // Verify the error is logged but doesn't crash the app
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load Claude SDK Analytics:',
        expect.any(Error)
      );
    });

    it('should verify dynamic import contract and fallback behavior', async () => {
      // Mock API service collaborator
      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      // Mock the analytics monitoring collaborator
      vi.doMock('../../components/analytics/AnalyticsMonitoringIntegration', () => ({
        AnalyticsMonitoringIntegration: mockAnalyticsMonitoring
      }));

      const component = render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify collaborator interactions
      expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
      expect(mockApiService.getFeedStats).toHaveBeenCalled();

      // Verify event listener setup for real-time updates
      expect(mockApiService.on).toHaveBeenCalledWith('metrics_updated', expect.any(Function));

      component.unmount();

      // Verify cleanup
      expect(mockApiService.off).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });

    it('should handle missing UI components dependency gracefully', async () => {
      // Mock missing UI components that could cause white screen
      vi.doMock('@/components/ui/tabs', () => ({
        Tabs: ({ children }: any) => <div data-testid="mock-tabs">{children}</div>,
        TabsContent: ({ children }: any) => <div data-testid="mock-tabs-content">{children}</div>,
        TabsList: ({ children }: any) => <div data-testid="mock-tabs-list">{children}</div>,
        TabsTrigger: ({ children }: any) => <button data-testid="mock-tab-trigger">{children}</button>
      }));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify component renders even with mock UI components
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });
  });

  describe('Suspense Fallback Behavior Verification', () => {
    it('should show loading fallback while ClaudeSDKAnalytics loads', async () => {
      // Mock a delayed import to test Suspense behavior
      const delayedImport = new Promise(resolve => {
        setTimeout(() => {
          resolve({
            default: () => <div data-testid="claude-sdk-analytics">Loaded!</div>
          });
        }, 100);
      });

      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => delayedImport);

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Verify loading fallback is shown
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
      expect(screen.getByText('Initializing cost tracking and performance monitoring')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
      });
    });

    it('should handle Suspense boundary errors without white screen', async () => {
      // Mock a component that throws during render
      const ErrorComponent = () => {
        throw new Error('Render error in ClaudeSDKAnalytics');
      };

      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: ErrorComponent
      }));

      // Wrap in error boundary to catch the error
      const TestWrapper = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <RealAnalytics />
        </React.Suspense>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });

      // This should be caught by the error boundary, not cause white screen
      expect(() => fireEvent.click(claudeSDKTab)).not.toThrow();
    });

    it('should verify Suspense fallback component lifecycle', async () => {
      const mockFallbackComponent = vi.fn(() => (
        <div data-testid="loading-fallback">Custom Loading...</div>
      ));

      // Test custom fallback behavior
      const TestComponentWithSuspense = () => (
        <Suspense fallback={<mockFallbackComponent />}>
          <RealAnalytics />
        </Suspense>
      );

      render(<TestComponentWithSuspense />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify fallback wasn't called for main component (already loaded)
      expect(mockFallbackComponent).not.toHaveBeenCalled();
    });
  });

  describe('Error Boundary Interaction Testing', () => {
    it('should interact correctly with AnalyticsErrorBoundary', async () => {
      const mockErrorBoundary = vi.fn(({ children }: any) => children);

      vi.doMock('../../components/analytics/AnalyticsErrorBoundary', () => ({
        default: mockErrorBoundary
      }));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify error boundary was used in the collaboration
      expect(mockErrorBoundary).toHaveBeenCalled();
    });

    it('should handle API errors without breaking component mounting', async () => {
      // Mock API to throw errors
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('API Error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('API Error'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('API Error'));

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<RealAnalytics />);

      // Component should still mount and show error, not white screen
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify error is displayed properly
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      // Verify UI is still functional
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('should verify error recovery interaction patterns', async () => {
      const mockOnErrorDetected = vi.fn();
      const mockOnRecoveryTriggered = vi.fn();

      vi.doMock('../../components/analytics/AnalyticsMonitoringIntegration', () => ({
        AnalyticsMonitoringIntegration: ({ onErrorDetected, onRecoveryTriggered }: any) => {
          // Store the callbacks for later verification
          mockOnErrorDetected.mockImplementation(onErrorDetected);
          mockOnRecoveryTriggered.mockImplementation(onRecoveryTriggered);
          return null;
        }
      }));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Simulate error event
      const errorEvent = {
        severity: 'critical',
        type: 'http_500_analytics',
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockOnErrorDetected(errorEvent);
      });

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/Analytics monitoring detected/)).toBeInTheDocument();
      });

      // Simulate recovery
      const recoveryEvent = {
        type: 'analytics_recovery',
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockOnRecoveryTriggered(recoveryEvent);
      });

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText(/Analytics monitoring detected/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Mounting Verification', () => {
    it('should verify complete component mounting lifecycle', async () => {
      const mountSpy = vi.fn();
      const unmountSpy = vi.fn();

      // Create test wrapper to monitor lifecycle
      const TestWrapper = ({ children }: any) => {
        React.useEffect(() => {
          mountSpy();
          return unmountSpy;
        }, []);
        return children;
      };

      const { unmount } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Verify mounting
      expect(mountSpy).toHaveBeenCalledOnce();

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify all expected elements are present
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('Real-time production metrics and performance data')).toBeInTheDocument();

      unmount();

      // Verify unmounting
      expect(unmountSpy).toHaveBeenCalledOnce();
    });

    it('should handle rapid tab switching without white screen', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('button', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });

      // Rapid tab switching
      for (let i = 0; i < 5; i++) {
        fireEvent.click(claudeSDKTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
        fireEvent.click(systemTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Component should still be functional
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    it('should verify state management during component lifecycle', async () => {
      const { rerender } = render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initial state verification
      expect(screen.getByText('Loading real analytics data...')).not.toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();

      // Rerender with different props
      rerender(<RealAnalytics className="test-class" />);

      // State should be preserved
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    it('should handle memory leaks and cleanup properly', async () => {
      const eventListenerSpy = vi.spyOn(mockApiService, 'on');
      const eventCleanupSpy = vi.spyOn(mockApiService, 'off');

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      const { unmount } = render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Verify event listeners are set up
      expect(eventListenerSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));

      unmount();

      // Verify cleanup
      expect(eventCleanupSpy).toHaveBeenCalledWith('metrics_updated', expect.any(Function));
    });
  });

  describe('White Screen Prevention Integration', () => {
    it('should never render completely empty content', async () => {
      // Test with all possible error conditions
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('System error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Analytics error'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Feed error'));

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<RealAnalytics />);

      // Even with all errors, should show some content
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should show error but still have UI structure
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should provide meaningful feedback for all loading states', async () => {
      // Test loading state
      const neverResolvingPromise = new Promise(() => {});
      mockApiService.getSystemMetrics.mockReturnValue(neverResolvingPromise);
      mockApiService.getAnalytics.mockReturnValue(neverResolvingPromise);
      mockApiService.getFeedStats.mockReturnValue(neverResolvingPromise);

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<RealAnalytics />);

      // Should show loading state, not blank screen
      expect(screen.getByText('Loading real analytics data...')).toBeInTheDocument();
    });

    it('should gracefully handle missing dependencies', async () => {
      // Mock missing lucide-react icons
      vi.doMock('lucide-react', () => ({
        TrendingUp: () => <span data-testid="mock-icon">📈</span>,
        Users: () => <span data-testid="mock-icon">👥</span>,
        Activity: () => <span data-testid="mock-icon">📊</span>,
        Database: () => <span data-testid="mock-icon">🗄️</span>,
        RefreshCw: () => <span data-testid="mock-icon">🔄</span>,
        AlertCircle: () => <span data-testid="mock-icon">⚠️</span>,
        BarChart3: () => <span data-testid="mock-icon">📊</span>,
        PieChart: () => <span data-testid="mock-icon">🥧</span>,
        DollarSign: () => <span data-testid="mock-icon">💲</span>,
        Bot: () => <span data-testid="mock-icon">🤖</span>,
        Zap: () => <span data-testid="mock-icon">⚡</span>
      }));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should render with fallback icons
      expect(screen.getAllByTestId('mock-icon')).toHaveLength(
        expect.any(Number)
      );
    });
  });
});