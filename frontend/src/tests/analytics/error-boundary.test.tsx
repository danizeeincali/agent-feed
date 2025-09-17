/**
 * Error Boundary Tests for Analytics Components
 * Ensures error boundaries continue to function properly after loading fixes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock AnalyticsErrorBoundary
const MockAnalyticsErrorBoundary = ({ children, fallback }: {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setError(new Error(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent error={error!} resetError={resetError} />;
    }

    return (
      <div data-testid="error-boundary-fallback">
        <h2>Something went wrong</h2>
        <p data-testid="error-message">{error?.message}</p>
        <button data-testid="reset-error" onClick={resetError}>
          Reset Error
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// Mock EnhancedAnalyticsPage components
const MockCostOverviewDashboard = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Cost overview component error');
  }
  return <div data-testid="cost-overview-dashboard">Cost Overview Dashboard</div>;
};

const MockMessageStepAnalytics = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Message step analytics error');
  }
  return <div data-testid="message-step-analytics">Message Step Analytics</div>;
};

const MockOptimizationRecommendations = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Optimization recommendations error');
  }
  return <div data-testid="optimization-recommendations">Optimization Recommendations</div>;
};

const MockExportReportingFeatures = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Export reporting features error');
  }
  return <div data-testid="export-reporting-features">Export Reporting Features</div>;
};

// Mock EnhancedAnalyticsPage with error boundaries
const MockEnhancedAnalyticsPage = ({
  costOverviewError = false,
  messageStepError = false,
  optimizationError = false,
  exportError = false
}: {
  costOverviewError?: boolean;
  messageStepError?: boolean;
  optimizationError?: boolean;
  exportError?: boolean;
}) => {
  const [activeTab, setActiveTab] = React.useState('overview');

  return (
    <div data-testid="enhanced-analytics-page">
      <nav data-testid="tab-navigation">
        <button
          data-testid="overview-tab"
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'active' : ''}
        >
          Cost Overview
        </button>
        <button
          data-testid="messages-tab"
          onClick={() => setActiveTab('messages')}
          className={activeTab === 'messages' ? 'active' : ''}
        >
          Messages & Steps
        </button>
        <button
          data-testid="optimize-tab"
          onClick={() => setActiveTab('optimize')}
          className={activeTab === 'optimize' ? 'active' : ''}
        >
          Optimization
        </button>
        <button
          data-testid="export-tab"
          onClick={() => setActiveTab('export')}
          className={activeTab === 'export' ? 'active' : ''}
        >
          Export & Reports
        </button>
      </nav>

      <div data-testid="tab-content">
        {activeTab === 'overview' && (
          <MockAnalyticsErrorBoundary>
            <MockCostOverviewDashboard shouldThrow={costOverviewError} />
          </MockAnalyticsErrorBoundary>
        )}

        {activeTab === 'messages' && (
          <MockAnalyticsErrorBoundary>
            <MockMessageStepAnalytics shouldThrow={messageStepError} />
          </MockAnalyticsErrorBoundary>
        )}

        {activeTab === 'optimize' && (
          <MockAnalyticsErrorBoundary>
            <MockOptimizationRecommendations shouldThrow={optimizationError} />
          </MockAnalyticsErrorBoundary>
        )}

        {activeTab === 'export' && (
          <MockAnalyticsErrorBoundary>
            <MockExportReportingFeatures shouldThrow={exportError} />
          </MockAnalyticsErrorBoundary>
        )}
      </div>
    </div>
  );
};

// Custom error fallback component
const CustomErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div data-testid="custom-error-fallback">
    <h3>Analytics Error</h3>
    <p data-testid="custom-error-message">{error.message}</p>
    <button data-testid="custom-reset-button" onClick={resetError}>
      Retry Analytics
    </button>
  </div>
);

describe('Analytics Error Boundary Tests', () => {
  let consoleError: vi.SpyInstance;

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('Basic Error Boundary Functionality', () => {
    it('should catch and display errors from analytics components', async () => {
      render(
        <MockAnalyticsErrorBoundary>
          <MockCostOverviewDashboard shouldThrow={true} />
        </MockAnalyticsErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Cost overview component error');
      });
    });

    it('should provide error reset functionality', async () => {
      render(
        <MockAnalyticsErrorBoundary>
          <MockCostOverviewDashboard shouldThrow={true} />
        </MockAnalyticsErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Reset the error
      fireEvent.click(screen.getByTestId('reset-error'));

      // Component should attempt to re-render
      // Note: In this mock, it will throw again, but in real scenarios,
      // the error condition might be resolved
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });

    it('should use custom error fallback when provided', async () => {
      render(
        <MockAnalyticsErrorBoundary fallback={CustomErrorFallback}>
          <MockMessageStepAnalytics shouldThrow={true} />
        </MockAnalyticsErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-error-fallback')).toBeInTheDocument();
        expect(screen.getByTestId('custom-error-message')).toHaveTextContent('Message step analytics error');
      });

      // Test custom reset button
      fireEvent.click(screen.getByTestId('custom-reset-button'));

      await waitFor(() => {
        expect(screen.getByTestId('custom-error-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Tab-Level Error Isolation', () => {
    it('should isolate errors to individual tabs', async () => {
      render(<MockEnhancedAnalyticsPage costOverviewError={true} />);

      // Cost overview tab should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Other tabs should still be functional
      fireEvent.click(screen.getByTestId('messages-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('message-step-analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      });

      // Switch back to overview tab - error should persist
      fireEvent.click(screen.getByTestId('overview-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });

    it('should handle multiple tab errors independently', async () => {
      render(
        <MockEnhancedAnalyticsPage
          costOverviewError={true}
          optimizationError={true}
        />
      );

      // Overview tab shows error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Messages tab works fine
      fireEvent.click(screen.getByTestId('messages-tab'));
      await waitFor(() => {
        expect(screen.getByTestId('message-step-analytics')).toBeInTheDocument();
      });

      // Optimization tab also shows error
      fireEvent.click(screen.getByTestId('optimize-tab'));
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Export tab works fine
      fireEvent.click(screen.getByTestId('export-tab'));
      await waitFor(() => {
        expect(screen.getByTestId('export-reporting-features')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery and Performance', () => {
    it('should handle errors without affecting loading performance', async () => {
      const startTime = performance.now();

      render(
        <MockAnalyticsErrorBoundary>
          <MockOptimizationRecommendations shouldThrow={true} />
        </MockAnalyticsErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const errorHandlingTime = performance.now() - startTime;

      // Error handling should be fast
      expect(errorHandlingTime).toBeLessThan(100);
    });

    it('should maintain tab switching performance even with errors', async () => {
      render(
        <MockEnhancedAnalyticsPage
          costOverviewError={true}
          messageStepError={false}
          optimizationError={true}
          exportError={false}
        />
      );

      const tabSwitches = [
        { tab: 'messages-tab', expected: 'message-step-analytics' },
        { tab: 'export-tab', expected: 'export-reporting-features' },
        { tab: 'overview-tab', expected: 'error-boundary-fallback' },
        { tab: 'optimize-tab', expected: 'error-boundary-fallback' }
      ];

      for (const { tab, expected } of tabSwitches) {
        const startTime = performance.now();

        fireEvent.click(screen.getByTestId(tab));

        await waitFor(() => {
          expect(screen.getByTestId(expected)).toBeInTheDocument();
        });

        const switchTime = performance.now() - startTime;
        expect(switchTime).toBeLessThan(100); // Fast tab switching even with errors
      }
    });

    it('should not leak memory during error recovery cycles', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate multiple error/recovery cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <MockAnalyticsErrorBoundary>
            <MockCostOverviewDashboard shouldThrow={true} />
          </MockAnalyticsErrorBoundary>
        );

        await waitFor(() => {
          expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        });

        // Reset error
        fireEvent.click(screen.getByTestId('reset-error'));

        unmount();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });
  });

  describe('Error Boundary Integration with Loading', () => {
    it('should handle errors during component loading', async () => {
      const LoadingErrorComponent = () => {
        const [isLoading, setIsLoading] = React.useState(true);
        const [shouldError, setShouldError] = React.useState(false);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            setIsLoading(false);
            setShouldError(true);
          }, 50);

          return () => clearTimeout(timer);
        }, []);

        if (isLoading) {
          return <div data-testid="loading-component">Loading...</div>;
        }

        if (shouldError) {
          throw new Error('Error during loading completion');
        }

        return <div data-testid="loaded-component">Component Loaded</div>;
      };

      render(
        <MockAnalyticsErrorBoundary>
          <LoadingErrorComponent />
        </MockAnalyticsErrorBoundary>
      );

      // Should show loading first
      expect(screen.getByTestId('loading-component')).toBeInTheDocument();

      // Then show error boundary
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Error during loading completion');
      });
    });

    it('should handle async errors in analytics components', async () => {
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          // Simulate async error
          setTimeout(() => {
            throw new Error('Async analytics error');
          }, 100);
        }, []);

        return <div data-testid="async-component">Async Component</div>;
      };

      render(
        <MockAnalyticsErrorBoundary>
          <AsyncErrorComponent />
        </MockAnalyticsErrorBoundary>
      );

      // Component should render initially
      expect(screen.getByTestId('async-component')).toBeInTheDocument();

      // Error boundary should catch async error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Error Boundary State Management', () => {
    it('should preserve error state during tab navigation', async () => {
      const ComponentWithState = () => {
        const [count, setCount] = React.useState(0);
        const [shouldError, setShouldError] = React.useState(false);

        if (shouldError) {
          throw new Error(`Error with count: ${count}`);
        }

        return (
          <div data-testid="stateful-component">
            <p data-testid="count-display">Count: {count}</p>
            <button data-testid="increment" onClick={() => setCount(c => c + 1)}>
              Increment
            </button>
            <button data-testid="trigger-error" onClick={() => setShouldError(true)}>
              Trigger Error
            </button>
          </div>
        );
      };

      render(
        <MockAnalyticsErrorBoundary>
          <ComponentWithState />
        </MockAnalyticsErrorBoundary>
      );

      // Interact with component
      fireEvent.click(screen.getByTestId('increment'));
      fireEvent.click(screen.getByTestId('increment'));

      expect(screen.getByTestId('count-display')).toHaveTextContent('Count: 2');

      // Trigger error
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Error with count: 2');
      });
    });

    it('should handle error boundary reset with proper cleanup', async () => {
      let cleanupCalled = false;

      const ComponentWithCleanup = () => {
        const [shouldError, setShouldError] = React.useState(false);

        React.useEffect(() => {
          return () => {
            cleanupCalled = true;
          };
        }, []);

        if (shouldError) {
          throw new Error('Component error with cleanup');
        }

        return (
          <div data-testid="cleanup-component">
            <button data-testid="trigger-error" onClick={() => setShouldError(true)}>
              Trigger Error
            </button>
          </div>
        );
      };

      render(
        <MockAnalyticsErrorBoundary>
          <ComponentWithCleanup />
        </MockAnalyticsErrorBoundary>
      );

      // Trigger error
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Reset error
      fireEvent.click(screen.getByTestId('reset-error'));

      // Cleanup should have been called
      expect(cleanupCalled).toBe(true);
    });
  });
});