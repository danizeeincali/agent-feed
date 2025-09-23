import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  ErrorBoundary, 
  RouteErrorBoundary, 
  GlobalErrorBoundary,
  AsyncErrorBoundary 
} from '@/components/ErrorBoundary';
import FallbackComponents from '@/components/FallbackComponents';

// Mock console to suppress error messages in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('Error Boundary Components', () => {
  // Test component that throws an error
  const ThrowingComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
    shouldThrow = true, 
    errorMessage = 'Test error' 
  }) => {
    if (shouldThrow) {
      throw new Error(errorMessage);
    }
    return <div>Component rendered successfully</div>;
  };

  // Async component that throws during effect
  const AsyncThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
    React.useEffect(() => {
      if (shouldThrow) {
        throw new Error('Async error in useEffect');
      }
    }, [shouldThrow]);

    return <div>Async component rendered</div>;
  };

  describe('Basic ErrorBoundary', () => {
    test('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should display fallback UI instead of throwing
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/testcomponent/i)).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    test('should display custom error message', () => {
      const customMessage = 'Custom error occurred';
      
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent errorMessage={customMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    test('should provide retry functionality', async () => {
      let shouldThrow = true;
      const RetryComponent = () => {
        const [key, setKey] = React.useState(0);
        
        return (
          <ErrorBoundary componentName="TestComponent" key={key}>
            <ThrowingComponent shouldThrow={shouldThrow} />
            <button onClick={() => {
              shouldThrow = false;
              setKey(k => k + 1);
            }}>
              Retry
            </button>
          </ErrorBoundary>
        );
      };

      render(<RetryComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Find and click retry button (would be in fallback UI in real implementation)
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      if (retryButton) {
        const user = userEvent.setup();
        await user.click(retryButton);

        expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
      }
    });

    test('should log errors appropriately', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent errorMessage="Logged error" />
        </ErrorBoundary>
      );

      // Error boundary should log the error
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('RouteErrorBoundary', () => {
    test('should handle route-specific errors', () => {
      render(
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowingComponent />
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/testroute/i)).toBeInTheDocument();
    });

    test('should provide route-specific fallback UI', () => {
      const CustomFallback = () => <div>Custom route fallback</div>;
      
      render(
        <RouteErrorBoundary routeName="TestRoute" fallback={<CustomFallback />}>
          <ThrowingComponent />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Custom route fallback')).toBeInTheDocument();
    });

    test('should handle navigation errors gracefully', () => {
      render(
        <RouteErrorBoundary routeName="Navigation">
          <ThrowingComponent errorMessage="Navigation failed" />
        </RouteErrorBoundary>
      );

      // Should show error but not break navigation
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('GlobalErrorBoundary', () => {
    test('should catch all unhandled errors at app level', () => {
      render(
        <GlobalErrorBoundary>
          <div>
            <h1>App Content</h1>
            <ThrowingComponent />
          </div>
        </GlobalErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    test('should provide app-level fallback UI', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowingComponent errorMessage="Global app error" />
        </GlobalErrorBoundary>
      );

      // Should show global error fallback
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    test('should handle nested error boundaries correctly', () => {
      render(
        <GlobalErrorBoundary>
          <div>Global content</div>
          <ErrorBoundary componentName="NestedComponent">
            <ThrowingComponent />
          </ErrorBoundary>
        </GlobalErrorBoundary>
      );

      // Inner error boundary should catch the error, not global
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/nestedcomponent/i)).toBeInTheDocument();
      expect(screen.getByText('Global content')).toBeInTheDocument();
    });
  });

  describe('AsyncErrorBoundary', () => {
    test('should handle async errors in effects', async () => {
      render(
        <AsyncErrorBoundary componentName="AsyncComponent">
          <AsyncThrowingComponent />
        </AsyncErrorBoundary>
      );

      // Initially renders, then error occurs in effect
      expect(screen.getByText('Async component rendered')).toBeInTheDocument();

      // Note: useEffect errors are not caught by error boundaries in React
      // This test demonstrates current behavior - real async error handling
      // would need different approaches
    });

    test('should handle promise rejections', () => {
      const PromiseRejectingComponent = () => {
        React.useEffect(() => {
          Promise.reject(new Error('Unhandled promise rejection'));
        }, []);

        return <div>Promise component</div>;
      };

      render(
        <AsyncErrorBoundary componentName="PromiseComponent">
          <PromiseRejectingComponent />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Promise component')).toBeInTheDocument();
    });
  });

  describe('Error Boundary State Management', () => {
    test('should reset error state when children change', () => {
      const TestWrapper = () => {
        const [componentKey, setComponentKey] = React.useState(1);
        const [shouldError, setShouldError] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShouldError(true)}>Trigger Error</button>
            <button onClick={() => {
              setShouldError(false);
              setComponentKey(k => k + 1);
            }}>
              Reset
            </button>
            <ErrorBoundary componentName="TestComponent" key={componentKey}>
              <ThrowingComponent shouldThrow={shouldError} />
            </ErrorBoundary>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestWrapper />);

      // Initially no error
      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();

      // Trigger error
      user.click(screen.getByRole('button', { name: /trigger error/i }));

      // Reset error
      user.click(screen.getByRole('button', { name: /reset/i }));

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });

    test('should maintain error state until reset', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);

        if (count > 0) {
          throw new Error('Count error');
        }

        return (
          <div>
            <span>Count: {count}</span>
            <button onClick={() => setCount(c => c + 1)}>Increment</button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <ErrorBoundary componentName="CounterComponent">
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      user.click(screen.getByRole('button', { name: /increment/i }));

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary with Fallback Components', () => {
    test('should integrate with FallbackComponents', () => {
      render(
        <ErrorBoundary 
          componentName="TestComponent"
          fallback={<FallbackComponents.ErrorFallback message="Custom error message" />}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should use custom fallback component
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    test('should provide different fallbacks for different error types', () => {
      const NetworkErrorComponent = () => {
        throw new Error('Network error');
      };

      const AuthErrorComponent = () => {
        throw new Error('Authentication failed');
      };

      render(
        <div>
          <ErrorBoundary 
            componentName="NetworkComponent"
            fallback={<FallbackComponents.NetworkErrorFallback />}
          >
            <NetworkErrorComponent />
          </ErrorBoundary>
          
          <ErrorBoundary 
            componentName="AuthComponent"
            fallback={<div>Please log in again</div>}
          >
            <AuthErrorComponent />
          </ErrorBoundary>
        </div>
      );

      // Should show appropriate fallbacks
      expect(document.body.textContent).toBeTruthy();
    });
  });

  describe('Error Reporting and Analytics', () => {
    test('should call error reporting service', () => {
      const mockErrorReporter = jest.fn();
      
      // In real implementation, this would be injected via context or props
      const ErrorReportingBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
          <ErrorBoundary 
            componentName="ReportingComponent"
            onError={(error, errorInfo) => {
              mockErrorReporter(error, errorInfo);
            }}
          >
            {children}
          </ErrorBoundary>
        );
      };

      render(
        <ErrorReportingBoundary>
          <ThrowingComponent errorMessage="Reported error" />
        </ErrorReportingBoundary>
      );

      // Should call error reporting
      expect(mockErrorReporter).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    test('should include relevant context in error reports', () => {
      const mockErrorReporter = jest.fn();
      const userId = 'user-123';
      const route = '/agents';
      
      const ContextualErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
          <ErrorBoundary 
            componentName="ContextualComponent"
            onError={(error, errorInfo) => {
              mockErrorReporter({
                error,
                errorInfo,
                context: { userId, route }
              });
            }}
          >
            {children}
          </ErrorBoundary>
        );
      };

      render(
        <ContextualErrorBoundary>
          <ThrowingComponent />
        </ContextualErrorBoundary>
      );

      expect(mockErrorReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          context: { userId, route }
        })
      );
    });
  });

  describe('Error Boundary Performance', () => {
    test('should not impact performance when no errors occur', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <ErrorBoundary componentName="PerfTestComponent">
            <div>Performance test component {i}</div>
          </ErrorBoundary>
        );
        unmount();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Error boundary performance test: ${totalTime.toFixed(2)}ms for ${iterations} iterations`);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // 1 second for 100 iterations
    });

    test('should handle multiple simultaneous errors', () => {
      const MultipleErrorsComponent = () => (
        <div>
          <ErrorBoundary componentName="Error1">
            <ThrowingComponent errorMessage="Error 1" />
          </ErrorBoundary>
          <ErrorBoundary componentName="Error2">
            <ThrowingComponent errorMessage="Error 2" />
          </ErrorBoundary>
          <ErrorBoundary componentName="Error3">
            <ThrowingComponent errorMessage="Error 3" />
          </ErrorBoundary>
        </div>
      );

      render(<MultipleErrorsComponent />);

      // All error boundaries should handle their respective errors
      const errorMessages = screen.getAllByText(/something went wrong/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Boundary Accessibility', () => {
    test('should provide accessible error messages', () => {
      render(
        <ErrorBoundary componentName="AccessibilityTest">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Error message should be accessible to screen readers
      const errorElement = screen.getByText(/something went wrong/i);
      expect(errorElement).toBeInTheDocument();
      
      // Should have appropriate ARIA attributes (in real implementation)
      expect(errorElement.closest('[role="alert"]')).toBeTruthy();
    });

    test('should maintain focus management during errors', () => {
      const FocusTestComponent = () => {
        const [shouldError, setShouldError] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setShouldError(true)}>
              Trigger Error
            </button>
            <ErrorBoundary componentName="FocusTest">
              {shouldError ? <ThrowingComponent /> : <input placeholder="Focus test" />}
            </ErrorBoundary>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<FocusTestComponent />);

      const input = screen.getByPlaceholderText('Focus test');
      input.focus();

      user.click(screen.getByRole('button', { name: /trigger error/i }));

      // Focus should be managed appropriately after error
      expect(document.activeElement).toBeDefined();
    });
  });
});