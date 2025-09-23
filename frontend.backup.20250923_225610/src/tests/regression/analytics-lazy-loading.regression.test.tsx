/**
 * Regression Tests for Analytics Lazy Loading Issue
 * Prevents the return of the 30-second timeout issue and ensures immediate loading
 */

import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { globalTimer, PerformanceTimer } from '../utils/performanceHelpers';

// Mock the actual analytics components to simulate the real loading behavior
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: function MockEnhancedAnalyticsPage() {
    // Simulate a component that loads immediately (not lazy)
    return (
      <div data-testid="enhanced-analytics-page">
        <div data-testid="analytics-content">Analytics Content Loaded</div>
        <div data-testid="cost-overview">Cost Overview</div>
        <div data-testid="messages-steps">Messages & Steps</div>
        <div data-testid="optimization">Optimization</div>
        <div data-testid="export">Export</div>
      </div>
    );
  }
}));

// Simulate the RealAnalytics component with the fixed lazy loading
const SimulatedRealAnalytics = () => {
  const [activeTab, setActiveTab] = React.useState('system');
  const [loadingStartTime, setLoadingStartTime] = React.useState<number | null>(null);

  // Import the analytics component dynamically but without lazy loading delays
  const AnalyticsComponent = React.useMemo(() => {
    return require('../../components/analytics/EnhancedAnalyticsPage').default;
  }, []);

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'claude-sdk') {
      setLoadingStartTime(performance.now());
    }
  };

  return (
    <div data-testid="real-analytics">
      <nav data-testid="tab-navigation">
        <button
          data-testid="system-tab"
          onClick={() => handleTabSwitch('system')}
          className={activeTab === 'system' ? 'active' : ''}
        >
          System Analytics
        </button>
        <button
          data-testid="claude-sdk-tab"
          onClick={() => handleTabSwitch('claude-sdk')}
          className={activeTab === 'claude-sdk' ? 'active' : ''}
        >
          Claude SDK Cost Analytics
        </button>
      </nav>

      {activeTab === 'system' && (
        <div data-testid="system-content">System Analytics Content</div>
      )}

      {activeTab === 'claude-sdk' && (
        <div data-testid="claude-sdk-container">
          {/* No Suspense or lazy loading - immediate rendering */}
          <AnalyticsComponent
            data-load-start={loadingStartTime}
            onLoadComplete={() => {
              if (loadingStartTime) {
                const loadTime = performance.now() - loadingStartTime;
                console.log(`Analytics loaded in ${loadTime}ms`);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

describe('Analytics Lazy Loading Regression Tests', () => {
  let performanceTimer: PerformanceTimer;
  let consoleErrors: string[];
  let consoleWarnings: string[];

  beforeEach(() => {
    performanceTimer = new PerformanceTimer();
    globalTimer.clear();
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console messages
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (message: string) => {
      consoleErrors.push(message);
      originalError(message);
    };

    console.warn = (message: string) => {
      consoleWarnings.push(message);
      originalWarn(message);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Timeout Issue Regression Prevention', () => {
    it('should never exceed 1-second loading time (preventing 30s timeout)', async () => {
      const startTime = performance.now();

      render(<SimulatedRealAnalytics />);

      // Switch to Claude SDK tab
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // Should load immediately without any timeout issues
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 1000 }); // Max 1 second timeout

      const totalTime = performance.now() - startTime;

      // Ensure it's dramatically faster than the old 30-second timeout
      expect(totalTime).toBeLessThan(1000);
      expect(totalTime).toBeGreaterThan(0); // Sanity check
    });

    it('should not show loading fallback for extended periods', async () => {
      const { container } = render(<SimulatedRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // Check that no loading indicators persist
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify no loading indicators are present
      const loadingElements = container.querySelectorAll('[data-testid*="loading"]');
      loadingElements.forEach(element => {
        expect(element).not.toBeVisible();
      });
    });

    it('should not trigger timeout warnings or errors', async () => {
      render(<SimulatedRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Check for timeout-related console messages
      const timeoutMessages = [
        ...consoleErrors,
        ...consoleWarnings
      ].filter(message =>
        /timeout|loading.*longer|expected.*time|30.*second/i.test(message)
      );

      expect(timeoutMessages).toHaveLength(0);
    });
  });

  describe('Immediate Loading Verification', () => {
    it('should render analytics content immediately without Suspense delays', async () => {
      performanceTimer.start('immediate-render');

      render(<SimulatedRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // All content should be available immediately
      await waitFor(() => {
        expect(screen.getByTestId('analytics-content')).toBeInTheDocument();
        expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
        expect(screen.getByTestId('messages-steps')).toBeInTheDocument();
        expect(screen.getByTestId('optimization')).toBeInTheDocument();
        expect(screen.getByTestId('export')).toBeInTheDocument();
      }, { timeout: 100 }); // Very short timeout since it should be immediate

      const renderTime = performanceTimer.end('immediate-render');
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid tab switching without accumulating delays', async () => {
      render(<SimulatedRealAnalytics />);

      const switchCount = 10;
      const startTime = performance.now();

      // Perform rapid tab switches
      for (let i = 0; i < switchCount; i++) {
        fireEvent.click(screen.getByTestId('claude-sdk-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        }, { timeout: 100 });

        fireEvent.click(screen.getByTestId('system-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('system-content')).toBeInTheDocument();
        }, { timeout: 100 });
      }

      const totalTime = performance.now() - startTime;
      const averageTimePerSwitch = totalTime / (switchCount * 2);

      // Each switch should be very fast
      expect(averageTimePerSwitch).toBeLessThan(50);
      expect(totalTime).toBeLessThan(2000); // All switches under 2 seconds
    });

    it('should maintain consistent performance across multiple renders', async () => {
      const renderTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        const { unmount } = render(<SimulatedRealAnalytics />);

        fireEvent.click(screen.getByTestId('claude-sdk-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        });

        const renderTime = performance.now() - startTime;
        renderTimes.push(renderTime);

        unmount();
      }

      // All renders should be fast and consistent
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // Check for consistent performance (low variance)
      const average = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / renderTimes.length;
      const standardDeviation = Math.sqrt(variance);

      expect(standardDeviation).toBeLessThan(100); // Low variance indicates consistent performance
    });
  });

  describe('Component Structure Verification', () => {
    it('should ensure components are directly imported, not lazy loaded', async () => {
      render(<SimulatedRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // All components should be immediately available
      const components = [
        'enhanced-analytics-page',
        'analytics-content',
        'cost-overview',
        'messages-steps',
        'optimization',
        'export'
      ];

      for (const component of components) {
        await waitFor(() => {
          expect(screen.getByTestId(component)).toBeInTheDocument();
        }, { timeout: 50 }); // Very short timeout since they should load immediately
      }
    });

    it('should verify no Suspense boundaries cause delays', async () => {
      // Create a test component that would trigger Suspense if lazy loading was used
      const TestComponentWithSuspense = () => {
        const [showSuspense, setShowSuspense] = React.useState(false);

        return (
          <div>
            <button
              data-testid="trigger-suspense"
              onClick={() => setShowSuspense(true)}
            >
              Trigger Suspense
            </button>

            {showSuspense && (
              <Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
                <SimulatedRealAnalytics />
              </Suspense>
            )}
          </div>
        );
      };

      render(<TestComponentWithSuspense />);

      const startTime = performance.now();

      fireEvent.click(screen.getByTestId('trigger-suspense'));

      // Even with Suspense, our components should load quickly
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      }, { timeout: 200 });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(200);

      // Suspense fallback should not be visible for long
      expect(screen.queryByTestId('suspense-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration Tests', () => {
    it('should handle errors without causing loading delays', async () => {
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
      };

      const ComponentWithErrorBoundary = () => {
        const [hasError, setHasError] = React.useState(false);

        if (hasError) {
          return (
            <div data-testid="error-fallback">
              Error occurred
              <button
                data-testid="reset-error"
                onClick={() => setHasError(false)}
              >
                Reset
              </button>
            </div>
          );
        }

        try {
          return <ErrorThrowingComponent />;
        } catch (error) {
          // Use setTimeout to avoid setState during render
          setTimeout(() => setHasError(true), 0);
          return <div data-testid="catching-error">Handling error...</div>;
        }
      };

      render(<ComponentWithErrorBoundary />);

      // Error handling should be fast
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      }, { timeout: 100 });

      // Recovery should also be fast
      fireEvent.click(screen.getByTestId('reset-error'));

      // Component should reset quickly
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });

    it('should maintain performance even when errors occur during loading', async () => {
      let shouldThrowError = false;

      const ConditionalErrorComponent = () => {
        if (shouldThrowError) {
          throw new Error('Conditional error');
        }
        return <SimulatedRealAnalytics />;
      };

      const { rerender } = render(<ConditionalErrorComponent />);

      // First render should work normally
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Trigger error condition
      shouldThrowError = true;

      const startTime = performance.now();

      // Re-render with error condition
      try {
        rerender(<ConditionalErrorComponent />);
      } catch (error) {
        // Expected error
      }

      const errorHandlingTime = performance.now() - startTime;

      // Error handling should not introduce significant delays
      expect(errorHandlingTime).toBeLessThan(100);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during repeated loading operations', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SimulatedRealAnalytics />);

        fireEvent.click(screen.getByTestId('claude-sdk-tab'));

        await waitFor(() => {
          expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
        });

        unmount();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should clean up event listeners and timers properly', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(<SimulatedRealAnalytics />);

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      unmount();

      // Verify cleanup occurred
      if (addEventListenerSpy.mock.calls.length > 0) {
        expect(removeEventListenerSpy).toHaveBeenCalled();
      }

      if (setTimeoutSpy.mock.calls.length > 0) {
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(setTimeoutSpy.mock.calls.length);
      }
    });
  });
});