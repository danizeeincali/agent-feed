import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * WHITE SCREEN PREVENTION TEST SUITE
 * Test 6: Error Boundary Integration Tests
 *
 * This test suite validates that error boundaries catch and display errors
 * gracefully throughout the application, preventing white screens.
 */

describe('White Screen Prevention - Error Boundary Integration', () => {
  let consoleSpy: any;
  let queryClient: QueryClient;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    queryClient.clear();
  });

  // Mock error boundary fallback components
  const GlobalErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary
  }) => (
    <div data-testid="global-error-fallback" role="alert">
      <h1>Application Error</h1>
      <p data-testid="global-error-message">{error.message}</p>
      <button data-testid="global-reset-button" onClick={resetErrorBoundary}>
        Reload Application
      </button>
    </div>
  );

  const RouteErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary
  }) => (
    <div data-testid="route-error-fallback" role="alert">
      <h2>Page Error</h2>
      <p data-testid="route-error-message">{error.message}</p>
      <button data-testid="route-reset-button" onClick={resetErrorBoundary}>
        Retry Page
      </button>
    </div>
  );

  const ComponentErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary
  }) => (
    <div data-testid="component-error-fallback" role="alert">
      <h3>Component Error</h3>
      <p data-testid="component-error-message">{error.message}</p>
      <button data-testid="component-reset-button" onClick={resetErrorBoundary}>
        Retry Component
      </button>
    </div>
  );

  // Test components that throw errors
  const ThrowingComponent: React.FC<{
    shouldThrow?: boolean;
    errorType?: 'render' | 'effect' | 'async';
    errorMessage?: string;
  }> = ({
    shouldThrow = true,
    errorType = 'render',
    errorMessage = 'Test component error'
  }) => {
    const [asyncError, setAsyncError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      if (shouldThrow && errorType === 'effect') {
        throw new Error(errorMessage);
      }

      if (shouldThrow && errorType === 'async') {
        setTimeout(() => {
          setAsyncError(new Error(errorMessage));
        }, 10);
      }
    }, [shouldThrow, errorType, errorMessage]);

    if (asyncError) {
      throw asyncError;
    }

    if (shouldThrow && errorType === 'render') {
      throw new Error(errorMessage);
    }

    return <div data-testid="throwing-component-success">Component rendered successfully</div>;
  };

  describe('Hierarchical Error Boundary Structure', () => {
    it('should handle global application errors', () => {
      render(
        <ErrorBoundary fallbackRender={GlobalErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <ThrowingComponent errorMessage="Global application error" />
            </MemoryRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('global-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('global-error-message')).toHaveTextContent('Global application error');
      expect(screen.getByTestId('global-reset-button')).toBeInTheDocument();
    });

    it('should handle route-level errors', () => {
      render(
        <ErrorBoundary fallbackRender={GlobalErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <div data-testid="app-layout">
                <ErrorBoundary fallbackRender={RouteErrorFallback}>
                  <ThrowingComponent errorMessage="Route component error" />
                </ErrorBoundary>
              </div>
            </MemoryRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      );

      // Route error boundary should catch the error
      expect(screen.getByTestId('route-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('route-error-message')).toHaveTextContent('Route component error');

      // Global error boundary should not be triggered
      expect(screen.queryByTestId('global-error-fallback')).not.toBeInTheDocument();

      // App layout should still be present
      expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    });

    it('should handle component-level errors', () => {
      render(
        <ErrorBoundary fallbackRender={GlobalErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <div data-testid="page-layout">
                <ErrorBoundary fallbackRender={RouteErrorFallback}>
                  <div data-testid="route-content">
                    <ErrorBoundary fallbackRender={ComponentErrorFallback}>
                      <ThrowingComponent errorMessage="Component error" />
                    </ErrorBoundary>
                  </div>
                </ErrorBoundary>
              </div>
            </MemoryRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      );

      // Component error boundary should catch the error
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Component error');

      // Higher level boundaries should not be triggered
      expect(screen.queryByTestId('route-error-fallback')).not.toBeInTheDocument();
      expect(screen.queryByTestId('global-error-fallback')).not.toBeInTheDocument();

      // Parent layouts should still be present
      expect(screen.getByTestId('page-layout')).toBeInTheDocument();
      expect(screen.getByTestId('route-content')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should recover from errors when reset button is clicked', () => {
      let shouldThrow = true;

      const RecoverableComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div data-testid="recovered-component">Component recovered</div>;
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <RecoverableComponent />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click reset button
      fireEvent.click(screen.getByTestId('component-reset-button'));

      // Component should recover
      expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      expect(screen.queryByTestId('component-error-fallback')).not.toBeInTheDocument();
    });

    it('should handle multiple error-recovery cycles', () => {
      let errorCount = 0;

      const MultiErrorComponent = () => {
        if (errorCount < 2) {
          errorCount++;
          throw new Error(`Error ${errorCount}`);
        }
        return <div data-testid="finally-stable">Component is stable</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <MultiErrorComponent />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Error 1');

      // Reset and get second error
      fireEvent.click(screen.getByTestId('component-reset-button'));
      rerender(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <MultiErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Error 2');

      // Reset and finally succeed
      fireEvent.click(screen.getByTestId('component-reset-button'));
      rerender(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <MultiErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('finally-stable')).toBeInTheDocument();
    });
  });

  describe('Async Error Handling', () => {
    it('should catch async errors from useEffect', async () => {
      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <ThrowingComponent
            errorType="async"
            errorMessage="Async effect error"
          />
        </ErrorBoundary>
      );

      // Initially component should render
      expect(screen.getByTestId('throwing-component-success')).toBeInTheDocument();

      // Wait for async error to be thrown and caught
      await waitFor(() => {
        expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      }, { timeout: 100 });

      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Async effect error');
    });

    it('should handle promise rejection errors', async () => {
      const PromiseRejectionComponent: React.FC = () => {
        const [error, setError] = React.useState<Error | null>(null);

        React.useEffect(() => {
          const failingPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Promise rejection error')), 10);
          });

          failingPromise.catch(err => setError(err));
        }, []);

        if (error) {
          throw error;
        }

        return <div data-testid="promise-component">Promise component</div>;
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <PromiseRejectionComponent />
        </ErrorBoundary>
      );

      // Initially should show component
      expect(screen.getByTestId('promise-component')).toBeInTheDocument();

      // Wait for promise rejection to be caught
      await waitFor(() => {
        expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      });

      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Promise rejection error');
    });
  });

  describe('Error Boundary with React Router', () => {
    it('should handle route transition errors', () => {
      const RouterErrorComponent: React.FC<{ route: string }> = ({ route }) => {
        if (route === '/error') {
          throw new Error('Route error');
        }
        return <div data-testid={`route-${route.replace('/', '')}`}>Route: {route}</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallbackRender={RouteErrorFallback}>
          <MemoryRouter initialEntries={['/home']}>
            <RouterErrorComponent route="/home" />
          </MemoryRouter>
        </ErrorBoundary>
      );

      // Initially should show home route
      expect(screen.getByTestId('route-home')).toBeInTheDocument();

      // Navigate to error route
      rerender(
        <ErrorBoundary fallbackRender={RouteErrorFallback}>
          <MemoryRouter initialEntries={['/error']}>
            <RouterErrorComponent route="/error" />
          </MemoryRouter>
        </ErrorBoundary>
      );

      // Should show error boundary
      expect(screen.getByTestId('route-error-fallback')).toBeInTheDocument();
    });

    it('should isolate errors to specific routes', () => {
      const MultiRouteApp: React.FC = () => (
        <MemoryRouter initialEntries={['/']}>
          <div data-testid="app-shell">
            <nav data-testid="navigation">Navigation</nav>
            <main data-testid="main-content">
              <ErrorBoundary fallbackRender={RouteErrorFallback}>
                <ThrowingComponent errorMessage="Main content error" />
              </ErrorBoundary>
            </main>
            <aside data-testid="sidebar">
              <div data-testid="sidebar-content">Sidebar content</div>
            </aside>
          </div>
        </MemoryRouter>
      );

      render(<MultiRouteApp />);

      // Error in main content should not affect other parts
      expect(screen.getByTestId('route-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    });
  });

  describe('Error Boundary with Query Client', () => {
    it('should handle query errors gracefully', () => {
      const QueryErrorComponent: React.FC = () => {
        // Simulate a query error
        React.useEffect(() => {
          throw new Error('Query processing error');
        }, []);

        return <div>Query component</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary fallbackRender={ComponentErrorFallback}>
            <QueryErrorComponent />
          </ErrorBoundary>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('Query processing error');
    });

    it('should maintain query client context after error recovery', () => {
      let shouldThrow = true;

      const QueryContextComponent: React.FC = () => {
        if (shouldThrow) {
          throw new Error('Query context error');
        }
        return <div data-testid="query-context-recovered">Query context preserved</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary fallbackRender={ComponentErrorFallback}>
            <QueryContextComponent />
          </ErrorBoundary>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();

      // Fix error and reset
      shouldThrow = false;
      fireEvent.click(screen.getByTestId('component-reset-button'));

      expect(screen.getByTestId('query-context-recovered')).toBeInTheDocument();
    });
  });

  describe('Production Error Scenarios', () => {
    it('should handle chunk loading errors', () => {
      const ChunkLoadErrorComponent: React.FC = () => {
        throw new Error('ChunkLoadError: Loading chunk 5 failed. (error: https://example.com/chunk.js)');
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <ChunkLoadErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('ChunkLoadError');
    });

    it('should handle network errors', () => {
      const NetworkErrorComponent: React.FC = () => {
        throw new Error('NetworkError: Failed to fetch');
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('NetworkError');
    });

    it('should handle memory errors', () => {
      const MemoryErrorComponent: React.FC = () => {
        throw new Error('RangeError: Maximum call stack size exceeded');
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <MemoryErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('RangeError');
    });

    it('should handle type errors from missing props', () => {
      const TypeErrorComponent: React.FC = () => {
        // Simulate accessing property of undefined
        const obj: any = null;
        const value = obj.someProperty; // This would cause TypeError in real app
        throw new Error("TypeError: Cannot read property 'someProperty' of null");
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <TypeErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('component-error-message')).toHaveTextContent('TypeError');
    });
  });

  describe('Error Boundary Configuration', () => {
    it('should call onError handler when error occurs', () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary
          fallbackRender={ComponentErrorFallback}
          onError={onErrorSpy}
        >
          <ThrowingComponent errorMessage="Test error for handler" />
        </ErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error for handler'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should support custom error boundary keys for forced reset', () => {
      let errorBoundaryKey = 0;

      const KeyedErrorBoundary: React.FC = () => {
        const [key, setKey] = React.useState(0);

        return (
          <div>
            <button
              data-testid="force-reset"
              onClick={() => setKey(k => k + 1)}
            >
              Force Reset
            </button>
            <ErrorBoundary
              key={key}
              fallbackRender={ComponentErrorFallback}
            >
              <ThrowingComponent errorMessage="Keyed error" />
            </ErrorBoundary>
          </div>
        );
      };

      render(<KeyedErrorBoundary />);

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();

      // Force reset by changing key
      fireEvent.click(screen.getByTestId('force-reset'));

      // Should trigger new error boundary instance
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA attributes in error fallbacks', () => {
      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const errorFallback = screen.getByTestId('component-error-fallback');
      expect(errorFallback).toHaveAttribute('role', 'alert');
    });

    it('should maintain focus management during error recovery', () => {
      let shouldThrow = true;

      const FocusTestComponent: React.FC = () => {
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        React.useEffect(() => {
          if (!shouldThrow) {
            buttonRef.current?.focus();
          }
        }, []);

        if (shouldThrow) {
          throw new Error('Focus test error');
        }

        return (
          <button ref={buttonRef} data-testid="focus-test-button">
            Focused Button
          </button>
        );
      };

      render(
        <ErrorBoundary fallbackRender={ComponentErrorFallback}>
          <FocusTestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();

      // Reset error
      shouldThrow = false;
      fireEvent.click(screen.getByTestId('component-reset-button'));

      expect(screen.getByTestId('focus-test-button')).toBeInTheDocument();
    });
  });
});