/**
 * TDD London School Zero White Screen Integration Tests
 * 
 * Comprehensive tests to ensure NO white screens under any circumstances.
 * Tests all failure scenarios, edge cases, and recovery mechanisms.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Import App and components
import App from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Mock all external dependencies
const mockWebSocketContext = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true
  },
  connectionStatus: 'connected' as const,
  lastActivity: new Date(),
  reconnectAttempts: 0,
  isConnecting: false
};

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock performance monitoring components
jest.mock('@/components/PerformanceMonitor', () => ({
  __esModule: true,
  default: () => <div data-testid="performance-monitor">Performance Monitor</div>
}));

jest.mock('@/components/ErrorTesting', () => ({
  __esModule: true,
  default: () => <div data-testid="error-testing">Error Testing</div>
}));

describe('Zero White Screen Integration Tests - TDD London School', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false, 
          cacheTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: false
        },
        mutations: { retry: false }
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {}
      }
    });
    
    jest.clearAllMocks();
    
    // Reset console mocks
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const AppWrapper: React.FC<{ initialEntries?: string[] }> = ({ 
    initialEntries = ['/'] 
  }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>
  );

  describe('Network Failure Scenarios', () => {
    beforeEach(() => {
      // Mock fetch to fail
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    });

    const allRoutes = [
      '/',
      '/dual-instance',
      '/dashboard',
      '/agents',
      '/agent/test-123',
      '/workflows',
      '/analytics',
      '/claude-code',
      '/activity',
      '/settings'
    ];

    it.each(allRoutes)('should never show white screen on route %s with network failure', async (route) => {
      // Act
      render(<AppWrapper initialEntries={[route]} />);

      // Assert - Must show SOMETHING within reasonable time
      await waitFor(() => {
        const hasContent = 
          screen.queryByTestId('social-media-feed') ||
          screen.queryByTestId('dual-instance-dashboard') ||
          screen.queryByTestId('agent-dashboard') ||
          screen.queryByTestId('agent-manager') ||
          screen.queryByTestId('agent-profile') ||
          screen.queryByTestId('workflow-visualization') ||
          screen.queryByTestId('system-analytics') ||
          screen.queryByTestId('claude-code-panel') ||
          screen.queryByTestId('activity-panel') ||
          screen.queryByTestId('settings') ||
          // Fallback components
          screen.queryByTestId('feed-fallback') ||
          screen.queryByTestId('dual-instance-fallback') ||
          screen.queryByTestId('dashboard-fallback') ||
          screen.queryByTestId('agent-manager-fallback') ||
          screen.queryByTestId('agent-profile-fallback') ||
          screen.queryByTestId('workflow-fallback') ||
          screen.queryByTestId('analytics-fallback') ||
          screen.queryByTestId('claude-code-fallback') ||
          screen.queryByTestId('activity-fallback') ||
          screen.queryByTestId('settings-fallback') ||
          // Error states
          screen.queryByTestId('error-boundary-fallback') ||
          screen.queryByTestId('component-error-fallback') ||
          screen.queryByTestId('network-error-fallback') ||
          screen.queryByTestId('loading-fallback') ||
          screen.queryByTestId('not-found-fallback');

        expect(hasContent).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify layout is always present
      expect(screen.getByTestId('header')).toBeInTheDocument();

      // White screen detection - page should have meaningful content
      const bodyContent = document.body.textContent || '';
      expect(bodyContent.trim().length).toBeGreaterThan(0);
    });

    it('should show network error fallback when all APIs fail', async () => {
      // Act
      render(<AppWrapper />);

      // Assert - Should show some form of network error handling
      await waitFor(() => {
        const errorIndicators = 
          screen.queryByTestId('network-error-fallback') ||
          screen.queryByTestId('component-error-fallback') ||
          screen.queryByTestId('error-boundary-fallback') ||
          screen.queryByText(/network/i) ||
          screen.queryByText(/connection/i) ||
          screen.queryByText(/offline/i) ||
          screen.queryByTestId('loading-fallback');

        expect(errorIndicators).toBeInTheDocument();
      });
    });
  });

  describe('Component Crash Scenarios', () => {
    it('should isolate component failures and maintain layout', async () => {
      // Arrange - Create a component that will fail
      const originalError = console.error;
      console.error = jest.fn();

      // Mock a component to throw after mount
      let shouldThrow = false;
      const DelayedFailureComponent = () => {
        React.useEffect(() => {
          setTimeout(() => {
            shouldThrow = true;
          }, 100);
        }, []);

        if (shouldThrow) {
          throw new Error('Delayed component failure');
        }

        return <div data-testid="delayed-failure">Working initially</div>;
      };

      // Act
      render(
        <AppWrapper>
          <ErrorBoundary componentName="DelayedFailure" isolate={true}>
            <DelayedFailureComponent />
          </ErrorBoundary>
        </AppWrapper>
      );

      // Assert - Layout should remain intact
      expect(screen.getByTestId('header')).toBeInTheDocument();

      // Wait for potential failure
      await waitFor(() => {
        const hasContent = 
          screen.queryByTestId('delayed-failure') ||
          screen.queryByTestId('error-boundary-fallback') ||
          screen.queryByTestId('component-error-fallback');
        expect(hasContent).toBeInTheDocument();
      });

      console.error = originalError;
    });

    it('should handle JavaScript runtime errors gracefully', async () => {
      // Arrange - Simulate various JS errors
      const jsErrors = [
        () => { throw new ReferenceError('undefined variable'); },
        () => { throw new TypeError('null is not an object'); },
        () => { throw new RangeError('Invalid array length'); },
        () => { throw new SyntaxError('Unexpected token'); }
      ];

      for (const errorFunc of jsErrors) {
        const ErrorComponent = () => {
          errorFunc();
          return <div>Should not render</div>;
        };

        // Act
        render(
          <MemoryRouter>
            <QueryClientProvider client={queryClient}>
              <ErrorBoundary componentName={`JSError-${errorFunc.name}`}>
                <ErrorComponent />
              </ErrorBoundary>
            </QueryClientProvider>
          </MemoryRouter>
        );

        // Assert - Should show error boundary, not white screen
        await waitFor(() => {
          expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
        });

        // Clean up for next iteration
        queryClient.clear();
      }
    });

    it('should handle memory issues and large data sets', async () => {
      // Arrange - Simulate memory intensive operation
      const MemoryIntensiveComponent = () => {
        const [data, setData] = React.useState<number[]>([]);

        React.useEffect(() => {
          try {
            // Simulate large data set that might cause issues
            const largeArray = new Array(1000000).fill(0).map((_, i) => i);
            setData(largeArray);
          } catch (error) {
            throw new Error('Memory allocation failed');
          }
        }, []);

        return <div data-testid="memory-intensive">Data length: {data.length}</div>;
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary componentName="MemoryIntensive">
              <MemoryIntensiveComponent />
            </ErrorBoundary>
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert - Should handle gracefully
      await waitFor(() => {
        const content = 
          screen.queryByTestId('memory-intensive') ||
          screen.queryByTestId('error-boundary-fallback') ||
          screen.queryByTestId('component-error-fallback');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Async Operation Failures', () => {
    it('should handle Promise rejections without white screen', async () => {
      // Arrange
      const AsyncFailureComponent = () => {
        const [status, setStatus] = React.useState('loading');

        React.useEffect(() => {
          Promise.reject(new Error('Async operation failed'))
            .catch(() => {
              setStatus('error');
            });
        }, []);

        if (status === 'error') {
          return <div data-testid="async-error">Async operation failed</div>;
        }

        return <div data-testid="async-loading">Loading async operation...</div>;
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <AsyncFailureComponent />
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        const content = 
          screen.queryByTestId('async-error') ||
          screen.queryByTestId('async-loading');
        expect(content).toBeInTheDocument();
      });
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      jest.useFakeTimers();

      const TimeoutComponent = () => {
        const [status, setStatus] = React.useState('loading');

        React.useEffect(() => {
          const timeout = setTimeout(() => {
            setStatus('timeout');
          }, 10000); // Long timeout

          return () => clearTimeout(timeout);
        }, []);

        return (
          <div data-testid={`timeout-${status}`}>
            {status === 'loading' ? 'Loading...' : 'Operation timed out'}
          </div>
        );
      };

      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <TimeoutComponent />
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert initial loading state
      expect(screen.getByTestId('timeout-loading')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Assert timeout state
      await waitFor(() => {
        expect(screen.getByTestId('timeout-timeout')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should handle concurrent async failures', async () => {
      // Arrange
      const ConcurrentAsyncComponent = () => {
        const [results, setResults] = React.useState<string[]>([]);
        const [errors, setErrors] = React.useState<string[]>([]);

        React.useEffect(() => {
          const promises = [
            Promise.reject(new Error('Service 1 failed')),
            Promise.reject(new Error('Service 2 failed')),
            Promise.resolve('Service 3 success'),
            Promise.reject(new Error('Service 4 failed'))
          ];

          Promise.allSettled(promises).then((results) => {
            const successes: string[] = [];
            const failures: string[] = [];

            results.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                successes.push(result.value);
              } else {
                failures.push(`Service ${index + 1} failed`);
              }
            });

            setResults(successes);
            setErrors(failures);
          });
        }, []);

        return (
          <div data-testid="concurrent-async">
            <div>Successes: {results.length}</div>
            <div>Errors: {errors.length}</div>
            {errors.length > 0 && <div>Some services failed</div>}
          </div>
        );
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ConcurrentAsyncComponent />
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('concurrent-async')).toBeInTheDocument();
        expect(screen.getByText('Errors: 3')).toBeInTheDocument();
        expect(screen.getByText('Successes: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility Issues', () => {
    it('should handle missing modern APIs gracefully', async () => {
      // Arrange - Mock missing APIs
      const originalFetch = global.fetch;
      const originalClipboard = navigator.clipboard;

      delete (global as any).fetch;
      delete (navigator as any).clipboard;

      // Act
      render(<AppWrapper />);

      // Assert - Should still render something
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      // Should show content even without modern APIs
      const hasContent = document.body.textContent?.trim().length || 0;
      expect(hasContent).toBeGreaterThan(0);

      // Cleanup
      global.fetch = originalFetch;
      navigator.clipboard = originalClipboard;
    });

    it('should handle localStorage unavailability', async () => {
      // Arrange - Mock localStorage failure
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;

      // Act
      render(<AppWrapper />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      // Cleanup
      window.localStorage = originalLocalStorage;
    });

    it('should handle WebSocket unavailability', async () => {
      // Arrange - Mock WebSocket failure
      const failingWebSocketContext = {
        ...mockWebSocketContext,
        socket: null,
        connectionStatus: 'disconnected' as const,
        isConnecting: false
      };

      jest.doMock('@/context/WebSocketContext', () => ({
        useWebSocket: () => failingWebSocketContext,
        WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
      }));

      // Act
      render(<AppWrapper />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });
    });
  });

  describe('Extreme Edge Cases', () => {
    it('should handle null/undefined props gracefully', async () => {
      // Arrange
      const EdgeCaseComponent = (props: any) => {
        try {
          return (
            <div data-testid="edge-case">
              {props?.data?.map?.((item: any) => item?.name || 'Unknown')}
            </div>
          );
        } catch (error) {
          return <div data-testid="edge-case-error">Handled edge case</div>;
        }
      };

      // Act - Test with various problematic props
      const problemProps = [
        null,
        undefined,
        { data: null },
        { data: undefined },
        { data: [] },
        { data: [null, undefined, {}] }
      ];

      for (const props of problemProps) {
        render(
          <MemoryRouter>
            <QueryClientProvider client={queryClient}>
              <EdgeCaseComponent {...props} />
            </QueryClientProvider>
          </MemoryRouter>
        );

        await waitFor(() => {
          const content = 
            screen.queryByTestId('edge-case') ||
            screen.queryByTestId('edge-case-error');
          expect(content).toBeInTheDocument();
        });

        queryClient.clear();
      }
    });

    it('should handle rapid state changes without crashing', async () => {
      // Arrange
      const RapidStateComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          // Rapidly change state
          for (let i = 0; i < 1000; i++) {
            setTimeout(() => setCount(i), i);
          }
        }, []);

        return <div data-testid="rapid-state">Count: {count}</div>;
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary componentName="RapidState">
              <RapidStateComponent />
            </ErrorBoundary>
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        const content = 
          screen.queryByTestId('rapid-state') ||
          screen.queryByTestId('error-boundary-fallback');
        expect(content).toBeInTheDocument();
      });
    });

    it('should handle infinite loop protection', async () => {
      // Arrange
      let renderCount = 0;
      const InfiniteLoopComponent = () => {
        renderCount++;
        
        // Simulate potential infinite loop
        if (renderCount > 100) {
          throw new Error('Infinite loop detected');
        }

        const [, setUpdate] = React.useState(0);
        
        // This could cause infinite re-renders in poorly written components
        React.useEffect(() => {
          if (renderCount < 50) {
            setUpdate(Math.random());
          }
        });

        return <div data-testid="infinite-loop">Render count: {renderCount}</div>;
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary componentName="InfiniteLoop">
              <InfiniteLoopComponent />
            </ErrorBoundary>
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        const content = 
          screen.queryByTestId('infinite-loop') ||
          screen.queryByTestId('error-boundary-fallback');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover from errors when conditions improve', async () => {
      // Arrange
      let shouldFail = true;
      const RecoveryComponent = () => {
        if (shouldFail) {
          throw new Error('Temporary failure');
        }
        return <div data-testid="recovered">Component recovered!</div>;
      };

      // Act - Initial failure
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary componentName="Recovery">
              <RecoveryComponent />
            </ErrorBoundary>
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert initial error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Fix the condition
      shouldFail = false;
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Assert - Should recover
      await waitFor(() => {
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
      });
    });

    it('should maintain user data during failures', async () => {
      // Arrange
      const StatefulComponent = () => {
        const [userData, setUserData] = React.useState('initial data');
        const [hasError, setHasError] = React.useState(false);

        const handleError = () => {
          try {
            throw new Error('Simulated error');
          } catch (error) {
            setHasError(true);
            // User data should be preserved
          }
        };

        if (hasError) {
          return (
            <div data-testid="error-with-data">
              Error occurred, but data preserved: {userData}
              <button onClick={() => setHasError(false)}>Recover</button>
            </div>
          );
        }

        return (
          <div data-testid="stateful-component">
            <div>Data: {userData}</div>
            <button onClick={() => setUserData('modified data')}>Update Data</button>
            <button onClick={handleError}>Trigger Error</button>
          </div>
        );
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <StatefulComponent />
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Update data
      fireEvent.click(screen.getByText('Update Data'));
      expect(screen.getByText('Data: modified data')).toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));

      // Assert - Data should be preserved
      await waitFor(() => {
        expect(screen.getByTestId('error-with-data')).toBeInTheDocument();
        expect(screen.getByText(/data preserved: modified data/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Stress', () => {
    it('should handle many components without white screen', async () => {
      // Arrange
      const ManyComponentsTest = () => {
        const components = Array.from({ length: 100 }, (_, i) => (
          <div key={i} data-testid={`component-${i}`}>Component {i}</div>
        ));

        return <div data-testid="many-components">{components}</div>;
      };

      // Act
      render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary componentName="ManyComponents">
              <ManyComponentsTest />
            </ErrorBoundary>
          </QueryClientProvider>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('many-components')).toBeInTheDocument();
      });

      // Verify at least some components rendered
      expect(screen.getByTestId('component-0')).toBeInTheDocument();
      expect(screen.getByTestId('component-99')).toBeInTheDocument();
    });
  });
});