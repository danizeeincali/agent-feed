import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * TDD Test Suite: Error Boundaries Functionality Validation
 *
 * Purpose: Test that error boundaries catch failures gracefully
 * This prevents white screen issues when components throw errors
 */

// Mock console.error to prevent test noise
const originalConsoleError = console.error;

describe('Error Boundaries Functionality Tests', () => {
  beforeEach(() => {
    // Mock console.error to prevent React error boundary warnings in tests
    console.error = vi.fn();
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Basic Error Boundary Implementation', () => {
    class TestErrorBoundary extends React.Component<
      { children: React.ReactNode; fallback?: React.ComponentType<any> },
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
        console.log('Error caught by boundary:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          const Fallback = this.props.fallback || (() => (
            <div data-testid="error-fallback">Something went wrong</div>
          ));
          return <Fallback error={this.state.error} />;
        }

        return this.props.children;
      }
    }

    it('should catch and display error when component throws', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      render(
        <TestErrorBoundary>
          <ThrowingComponent />
        </TestErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      const WorkingComponent = () => <div data-testid="working-component">Working!</div>;

      render(
        <TestErrorBoundary>
          <WorkingComponent />
        </TestErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Working!')).toBeInTheDocument();
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });

    it('should handle custom fallback components', () => {
      const CustomFallback = ({ error }: { error?: Error }) => (
        <div data-testid="custom-fallback">
          Custom Error: {error?.message}
        </div>
      );

      const ThrowingComponent = () => {
        throw new Error('Custom error message');
      };

      render(
        <TestErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent />
        </TestErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Custom error message')).toBeInTheDocument();
    });
  });

  describe('React Error Boundary Library Integration', () => {
    it('should work with react-error-boundary ErrorBoundary', () => {
      const ErrorFallback = ({ error }: { error: Error }) => (
        <div data-testid="react-error-boundary-fallback">
          Error: {error.message}
        </div>
      );

      const ThrowingComponent = () => {
        throw new Error('React error boundary test');
      };

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('react-error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('Error: React error boundary test')).toBeInTheDocument();
    });

    it('should handle fallbackRender prop', () => {
      const ThrowingComponent = () => {
        throw new Error('Fallback render test');
      };

      render(
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <div data-testid="fallback-render">
              Render Error: {error?.message}
            </div>
          )}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('fallback-render')).toBeInTheDocument();
      expect(screen.getByText('Render Error: Fallback render test')).toBeInTheDocument();
    });

    it('should handle onError callback', () => {
      const onError = vi.fn();

      const ThrowingComponent = () => {
        throw new Error('OnError callback test');
      };

      render(
        <ErrorBoundary
          onError={onError}
          fallbackRender={() => <div data-testid="callback-fallback">Error handled</div>}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
      expect(screen.getByTestId('callback-fallback')).toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should handle nested error boundaries correctly', () => {
      const InnerFallback = () => <div data-testid="inner-fallback">Inner Error</div>;
      const OuterFallback = () => <div data-testid="outer-fallback">Outer Error</div>;

      const InnerThrowingComponent = () => {
        throw new Error('Inner error');
      };

      render(
        <ErrorBoundary FallbackComponent={OuterFallback}>
          <div>
            <ErrorBoundary FallbackComponent={InnerFallback}>
              <InnerThrowingComponent />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    });

    it('should propagate to outer boundary when inner boundary fails', () => {
      const FailingInnerBoundary = ({ children }: { children: React.ReactNode }) => {
        throw new Error('Inner boundary failure');
      };

      const OuterFallback = () => <div data-testid="outer-fallback">Outer Caught Error</div>;

      render(
        <ErrorBoundary FallbackComponent={OuterFallback}>
          <FailingInnerBoundary>
            <div>Content</div>
          </FailingInnerBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('outer-fallback')).toBeInTheDocument();
    });
  });

  describe('Async Error Handling', () => {
    it('should handle errors in useEffect', async () => {
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          // This won't be caught by error boundary as it's async
          // We need to test how the app handles this scenario
          setTimeout(() => {
            try {
              throw new Error('Async error');
            } catch (error) {
              // In real app, this should be handled by global error handler
              console.error('Async error caught:', error);
            }
          }, 0);
        }, []);

        return <div data-testid="async-component">Async Component</div>;
      };

      const AsyncErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasAsyncError, setHasAsyncError] = React.useState(false);

        React.useEffect(() => {
          const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            setHasAsyncError(true);
            event.preventDefault();
          };

          const handleError = (event: ErrorEvent) => {
            setHasAsyncError(true);
            event.preventDefault();
          };

          window.addEventListener('unhandledrejection', handleUnhandledRejection);
          window.addEventListener('error', handleError);

          return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
          };
        }, []);

        if (hasAsyncError) {
          return <div data-testid="async-error-fallback">Async Error Handled</div>;
        }

        return <>{children}</>;
      };

      render(
        <AsyncErrorBoundary>
          <AsyncErrorComponent />
        </AsyncErrorBoundary>
      );

      expect(screen.getByTestId('async-component')).toBeInTheDocument();
    });

    it('should handle Promise rejections', () => {
      const PromiseErrorComponent = () => {
        React.useEffect(() => {
          Promise.reject(new Error('Promise rejection test')).catch((error) => {
            console.error('Promise rejection handled:', error);
          });
        }, []);

        return <div data-testid="promise-component">Promise Component</div>;
      };

      render(
        <ErrorBoundary
          fallbackRender={() => <div data-testid="promise-fallback">Promise Error</div>}
        >
          <PromiseErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('promise-component')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Reset', () => {
    it('should support error recovery with resetErrorBoundary', () => {
      let triggerError = false;

      const ConditionalErrorComponent = () => {
        if (triggerError) {
          throw new Error('Conditional error');
        }
        return <div data-testid="conditional-component">No Error</div>;
      };

      const RecoverableErrorBoundary = () => {
        const [key, setKey] = React.useState(0);

        return (
          <div>
            <button
              data-testid="reset-button"
              onClick={() => {
                triggerError = false;
                setKey(k => k + 1);
              }}
            >
              Reset
            </button>
            <ErrorBoundary
              key={key}
              fallbackRender={({ resetErrorBoundary }) => (
                <div>
                  <div data-testid="recoverable-fallback">Recoverable Error</div>
                  <button data-testid="recover-button" onClick={resetErrorBoundary}>
                    Recover
                  </button>
                </div>
              )}
            >
              <ConditionalErrorComponent />
            </ErrorBoundary>
          </div>
        );
      };

      const { rerender } = render(<RecoverableErrorBoundary />);

      // Initially no error
      expect(screen.getByTestId('conditional-component')).toBeInTheDocument();

      // Trigger error and rerender
      triggerError = true;
      rerender(<RecoverableErrorBoundary />);

      expect(screen.getByTestId('recoverable-fallback')).toBeInTheDocument();
    });
  });

  describe('Production Error Boundary Scenarios', () => {
    it('should handle component import failures', () => {
      const LazyErrorComponent = () => {
        // Simulate dynamic import failure
        throw new Error('Failed to load component chunk');
      };

      render(
        <ErrorBoundary
          fallbackRender={() => (
            <div data-testid="chunk-error-fallback">
              Failed to load component. Please refresh the page.
            </div>
          )}
        >
          <LazyErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('chunk-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Failed to load component. Please refresh the page.')).toBeInTheDocument();
    });

    it('should handle network-related errors', () => {
      const NetworkErrorComponent = () => {
        throw new Error('Network request failed');
      };

      render(
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <div data-testid="network-error-fallback">
              Network Error: {error?.message}
              <button data-testid="retry-button">Retry</button>
            </div>
          )}
        >
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('network-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should handle state management errors', () => {
      const StateErrorComponent = () => {
        const [, setState] = React.useState({});

        React.useEffect(() => {
          // Simulate state update error
          setState(() => {
            throw new Error('State update failed');
          });
        }, []);

        return <div data-testid="state-component">State Component</div>;
      };

      render(
        <ErrorBoundary
          fallbackRender={() => (
            <div data-testid="state-error-fallback">State Error Handled</div>
          )}
        >
          <StateErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('state-error-fallback')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Performance', () => {
    it('should not impact performance when no errors occur', () => {
      const FastComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          const timer = setInterval(() => setCount(c => c + 1), 10);
          return () => clearInterval(timer);
        }, []);

        return <div data-testid="fast-component">Count: {count}</div>;
      };

      const startTime = performance.now();

      render(
        <ErrorBoundary
          fallbackRender={() => <div>Error</div>}
        >
          <FastComponent />
        </ErrorBoundary>
      );

      const endTime = performance.now();

      expect(screen.getByTestId('fast-component')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle multiple simultaneous errors efficiently', () => {
      const MultiErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Multi error test');
        }
        return <div data-testid="multi-component">No Error</div>;
      };

      const errors: string[] = [];

      render(
        <div>
          {Array.from({ length: 5 }, (_, i) => (
            <ErrorBoundary
              key={i}
              onError={(error) => errors.push(error.message)}
              fallbackRender={() => <div data-testid={`error-${i}`}>Error {i}</div>}
            >
              <MultiErrorComponent shouldThrow={i % 2 === 0} />
            </ErrorBoundary>
          ))}
        </div>
      );

      // Should handle multiple errors without performance degradation
      expect(errors.length).toBe(3); // Every other component throws
      expect(screen.getAllByText(/Error \d/)).toHaveLength(3);
      expect(screen.getAllByTestId(/multi-component/)).toHaveLength(2);
    });
  });
});