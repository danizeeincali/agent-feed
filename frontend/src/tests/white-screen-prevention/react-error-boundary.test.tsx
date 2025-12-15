import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * WHITE SCREEN PREVENTION TEST SUITE
 * Test 2: React Error Boundary Functionality
 *
 * This test suite validates that react-error-boundary is properly configured
 * and working to catch errors and prevent white screens.
 */

describe('White Screen Prevention - React Error Boundary', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // Component that throws an error for testing
  const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
    if (shouldThrow) {
      throw new Error('Test error for error boundary validation');
    }
    return <div data-testid="error-component-success">No error thrown</div>;
  };

  // Custom error fallback component
  const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary
  }) => (
    <div data-testid="error-fallback" role="alert">
      <h2>Something went wrong</h2>
      <p data-testid="error-message">{error.message}</p>
      <button data-testid="retry-button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );

  describe('Basic Error Boundary Functionality', () => {
    it('should catch and display errors without crashing the app', () => {
      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error for error boundary validation'
      );
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-component-success')).toBeInTheDocument();
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });

    it('should provide reset functionality', () => {
      const { rerender } = render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();

      // Reset the error boundary
      fireEvent.click(screen.getByTestId('retry-button'));

      // Rerender with no error
      rerender(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-component-success')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Configuration Tests', () => {
    it('should work with custom fallback render prop', () => {
      const customFallback = ({ error }: { error: Error }) => (
        <div data-testid="custom-fallback">
          Custom error: {error.message}
        </div>
      );

      render(
        <ErrorBoundary fallbackRender={customFallback}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('custom-fallback')).toHaveTextContent(
        'Custom error: Test error for error boundary validation'
      );
    });

    it('should work with fallback component prop', () => {
      const FallbackComponent = () => (
        <div data-testid="fallback-component">Fallback component rendered</div>
      );

      render(
        <ErrorBoundary FallbackComponent={FallbackComponent}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    });

    it('should call onError handler when error occurs', () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary fallbackRender={ErrorFallback} onError={onErrorSpy}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should handle nested error boundaries correctly', () => {
      const OuterFallback = () => <div data-testid="outer-fallback">Outer boundary</div>;
      const InnerFallback = () => <div data-testid="inner-fallback">Inner boundary</div>;

      render(
        <ErrorBoundary FallbackComponent={OuterFallback}>
          <div>
            <ErrorBoundary FallbackComponent={InnerFallback}>
              <ErrorThrowingComponent />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    });

    it('should bubble to outer boundary if inner boundary fails', () => {
      const OuterFallback = () => <div data-testid="outer-fallback">Outer boundary</div>;
      const FailingInnerFallback = () => {
        throw new Error('Fallback component error');
      };

      render(
        <ErrorBoundary FallbackComponent={OuterFallback}>
          <div>
            <ErrorBoundary FallbackComponent={FailingInnerFallback}>
              <ErrorThrowingComponent />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Outer boundary should catch the error from the failing inner fallback
      expect(screen.getByTestId('outer-fallback')).toBeInTheDocument();
    });
  });

  describe('Async Error Handling', () => {
    const AsyncErrorComponent: React.FC = () => {
      const [error, setError] = React.useState<Error | null>(null);

      React.useEffect(() => {
        // Simulate async error
        setTimeout(() => {
          setError(new Error('Async error occurred'));
        }, 10);
      }, []);

      if (error) {
        throw error;
      }

      return <div data-testid="async-component">Async component loaded</div>;
    };

    it('should catch errors from async operations', async () => {
      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <AsyncErrorComponent />
        </ErrorBoundary>
      );

      // Initially should show the component
      expect(screen.getByTestId('async-component')).toBeInTheDocument();

      // Wait for async error to be thrown and caught
      await vi.waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Async error occurred');
    });
  });

  describe('Error Recovery Testing', () => {
    it('should recover after error is fixed', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div data-testid="recovered-component">Recovered successfully</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Error should be caught
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry button
      fireEvent.click(screen.getByTestId('retry-button'));

      // Should recover
      rerender(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
    });
  });

  describe('Production-like Error Scenarios', () => {
    it('should handle component import failures gracefully', () => {
      const ImportFailureComponent = () => {
        throw new Error('ChunkLoadError: Loading chunk 5 failed');
      };

      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <ImportFailureComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('ChunkLoadError');
    });

    it('should handle network-related errors', () => {
      const NetworkErrorComponent = () => {
        throw new Error('NetworkError: Failed to fetch resource');
      };

      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('NetworkError');
    });

    it('should handle TypeScript compilation errors gracefully', () => {
      const TypeErrorComponent = () => {
        throw new Error('TypeError: Cannot read property of undefined');
      };

      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <TypeErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('TypeError');
    });
  });

  describe('Error Boundary Integration with App Structure', () => {
    it('should work within router context', () => {
      const { BrowserRouter } = require('react-router-dom');

      render(
        <BrowserRouter>
          <ErrorBoundary fallbackRender={ErrorFallback}>
            <ErrorThrowingComponent />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });

    it('should work within query client context', () => {
      const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary fallbackRender={ErrorFallback}>
            <ErrorThrowingComponent />
          </ErrorBoundary>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });
  });
});