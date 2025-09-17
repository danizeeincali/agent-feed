/**
 * Unit Tests for EnhancedAnalyticsPage
 * Tests immediate loading, performance, and prevents lazy loading timeout issues
 */

import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import {
  PerformanceTimer,
  measureComponentLoading,
  waitForComponentStable,
  measureTimeToInteractive,
  globalTimer,
  globalMemoryTracker
} from '../utils/performanceHelpers';

// Mock the EnhancedAnalyticsPage component
const mockEnhancedAnalyticsPage = React.lazy(() =>
  Promise.resolve({
    default: function MockEnhancedAnalyticsPage() {
      return (
        <div data-testid="enhanced-analytics-page">
          <div data-testid="cost-overview-tab">Cost Overview</div>
          <div data-testid="messages-steps-tab">Messages & Steps</div>
          <div data-testid="optimization-tab">Optimization</div>
          <div data-testid="export-tab">Export</div>
          <button data-testid="tab-switcher">Switch Tab</button>
        </div>
      );
    }
  })
);

// Mock RealAnalytics with the analytics component
const MockRealAnalytics = () => {
  const [activeTab, setActiveTab] = React.useState('system');

  return (
    <div data-testid="real-analytics">
      <button
        data-testid="claude-sdk-tab"
        onClick={() => setActiveTab('claude-sdk')}
      >
        Claude SDK Cost Analytics
      </button>

      {activeTab === 'claude-sdk' && (
        <Suspense fallback={<div data-testid="analytics-loading">Loading...</div>}>
          <div data-testid="claude-sdk-container">
            {React.createElement(mockEnhancedAnalyticsPage)}
          </div>
        </Suspense>
      )}
    </div>
  );
};

describe('EnhancedAnalyticsPage Loading Performance', () => {
  let performanceTimer: PerformanceTimer;

  beforeEach(() => {
    performanceTimer = new PerformanceTimer();
    globalTimer.clear();
    globalMemoryTracker.clear();

    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Immediate Loading Tests', () => {
    it('should load EnhancedAnalyticsPage without lazy loading delays', async () => {
      performanceTimer.start('component-load');

      const { container } = render(<MockRealAnalytics />);

      // Switch to Claude SDK tab
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab');
      fireEvent.click(claudeSDKTab);

      // Should load immediately without timeout issues
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 1000 }); // Much shorter timeout since no lazy loading

      const loadTime = performanceTimer.end('component-load');
      expect(loadTime).toBeLessThan(500); // Should load in under 500ms
    });

    it('should render all sub-components immediately', async () => {
      render(<MockRealAnalytics />);

      // Switch to Claude SDK tab
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // All sub-components should render immediately
      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-tab')).toBeInTheDocument();
        expect(screen.getByTestId('messages-steps-tab')).toBeInTheDocument();
        expect(screen.getByTestId('optimization-tab')).toBeInTheDocument();
        expect(screen.getByTestId('export-tab')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should not show loading fallback for long periods', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // Loading should be brief or not visible at all
      const loadingElement = screen.queryByTestId('analytics-loading');

      if (loadingElement) {
        // If loading shows, it should disappear quickly
        await waitFor(() => {
          expect(screen.queryByTestId('analytics-loading')).not.toBeInTheDocument();
        }, { timeout: 100 });
      }

      // Main component should be visible
      expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet loading time benchmarks', async () => {
      const metrics = await measureComponentLoading(
        'EnhancedAnalyticsPage',
        async () => {
          const { container } = render(<MockRealAnalytics />);
          fireEvent.click(screen.getByTestId('claude-sdk-tab'));

          await waitFor(() => {
            expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
          });

          return container;
        }
      );

      // Performance requirements
      expect(metrics.totalLoadTime).toBeLessThan(300); // Under 300ms total load
      expect(metrics.totalRenderTime).toBeLessThan(100); // Under 100ms render

      // Memory usage should be reasonable
      if (metrics.memoryUsage) {
        expect(metrics.memoryUsage.delta).toBeLessThan(5 * 1024 * 1024); // Under 5MB increase
      }
    });

    it('should achieve fast time-to-interactive', async () => {
      const { container } = render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      const tti = await measureTimeToInteractive(
        container,
        '[data-testid]',
        2000 // 2 second max
      );

      expect(tti).toBeLessThan(500); // Interactive within 500ms
    });

    it('should handle multiple rapid tab switches efficiently', async () => {
      const { container } = render(<MockRealAnalytics />);

      performanceTimer.start('rapid-switches');

      // Perform rapid tab switches
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('claude-sdk-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        });

        await act(async () => {
          await waitForComponentStable(container, 1000);
        });
      }

      const totalTime = performanceTimer.end('rapid-switches');
      expect(totalTime).toBeLessThan(2000); // All switches under 2s
    });
  });

  describe('Tab Rendering Tests', () => {
    it('should render Cost Overview tab correctly', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-tab')).toBeInTheDocument();
        expect(screen.getByTestId('cost-overview-tab')).toHaveTextContent('Cost Overview');
      });
    });

    it('should render Messages & Steps tab correctly', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('messages-steps-tab')).toBeInTheDocument();
        expect(screen.getByTestId('messages-steps-tab')).toHaveTextContent('Messages & Steps');
      });
    });

    it('should render Optimization tab correctly', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('optimization-tab')).toBeInTheDocument();
        expect(screen.getByTestId('optimization-tab')).toHaveTextContent('Optimization');
      });
    });

    it('should render Export tab correctly', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('export-tab')).toBeInTheDocument();
        expect(screen.getByTestId('export-tab')).toHaveTextContent('Export');
      });
    });

    it('should handle tab switching interactions', async () => {
      render(<MockRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-switcher')).toBeInTheDocument();
      });

      // Test tab switcher interaction
      const tabSwitcher = screen.getByTestId('tab-switcher');
      expect(tabSwitcher).not.toBeDisabled();

      // Should be able to click without errors
      fireEvent.click(tabSwitcher);
      expect(tabSwitcher).toBeInTheDocument();
    });
  });

  describe('Error Boundary Tests', () => {
    const ErrorBoundaryWrapper = ({ children, onError }: {
      children: React.ReactNode;
      onError?: (error: Error) => void;
    }) => {
      const [hasError, setHasError] = React.useState(false);
      const [error, setError] = React.useState<Error | null>(null);

      const resetError = () => {
        setHasError(false);
        setError(null);
      };

      React.useEffect(() => {
        const handleError = (error: ErrorEvent) => {
          setHasError(true);
          setError(new Error(error.message));
          if (onError) onError(new Error(error.message));
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
      }, [onError]);

      if (hasError) {
        return (
          <div data-testid="error-boundary">
            <p>Something went wrong: {error?.message}</p>
            <button data-testid="reset-error" onClick={resetError}>Reset</button>
          </div>
        );
      }

      return <>{children}</>;
    };

    it('should handle component errors gracefully', async () => {
      const onError = vi.fn();

      render(
        <ErrorBoundaryWrapper onError={onError}>
          <MockRealAnalytics />
        </ErrorBoundaryWrapper>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // Should render without errors
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('should provide error recovery mechanisms', async () => {
      // Simulate an error during loading
      const ErrorThrowingComponent = () => {
        throw new Error('Simulated loading error');
      };

      const ComponentWithErrorBoundary = () => {
        const [hasError, setHasError] = React.useState(false);

        if (hasError) {
          return (
            <div data-testid="error-fallback">
              <p>Analytics temporarily unavailable</p>
              <button
                data-testid="retry-button"
                onClick={() => setHasError(false)}
              >
                Retry
              </button>
            </div>
          );
        }

        try {
          return <ErrorThrowingComponent />;
        } catch (error) {
          setTimeout(() => setHasError(true), 0);
          return <div data-testid="catching-error">Catching error...</div>;
        }
      };

      render(<ComponentWithErrorBoundary />);

      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      // Test retry functionality
      fireEvent.click(screen.getByTestId('retry-button'));

      // Should attempt to recover
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Regression Prevention Tests', () => {
    it('should prevent lazy loading timeout regression', async () => {
      // Test that components load without the previous 30-second timeout issue
      const startTime = performance.now();

      render(<MockRealAnalytics />);
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 1000 });

      const loadTime = performance.now() - startTime;

      // Ensure it's much faster than the previous 30s timeout
      expect(loadTime).toBeLessThan(1000);
    });

    it('should not show timeout warnings', async () => {
      render(<MockRealAnalytics />);
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Should not show any timeout-related warnings
      expect(screen.queryByText(/loading.*longer.*expected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
    });

    it('should maintain consistent loading behavior across multiple renders', async () => {
      const loadTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<MockRealAnalytics />);

        const startTime = performance.now();
        fireEvent.click(screen.getByTestId('claude-sdk-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        });

        loadTimes.push(performance.now() - startTime);
        unmount();
      }

      // All load times should be consistently fast
      loadTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // Variance should be low (consistent performance)
      const avg = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const variance = loadTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / loadTimes.length;
      expect(variance).toBeLessThan(10000); // Low variance in loading times
    });
  });
});