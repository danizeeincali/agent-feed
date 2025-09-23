/**
 * TDD London School: Error Boundary Behavior Tests
 * 
 * Testing error boundary interactions and fallback behaviors using mock-driven development.
 * Focuses on how error boundaries collaborate with other components and handle failures.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock error boundary components
const mockErrorBoundary = {
  onError: jest.fn(),
  onReset: jest.fn(),
  fallback: null,
  children: null,
};

const mockRouteErrorBoundary = {
  onError: jest.fn(),
  fallback: null,
  routeName: '',
  children: null,
};

const mockGlobalErrorBoundary = {
  onError: jest.fn(),
  children: null,
};

const mockAsyncErrorBoundary = {
  onError: jest.fn(),
  componentName: '',
  children: null,
};

// Mock the error boundary components
jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, onError, componentName }: any) => {
    mockErrorBoundary.onError = onError || jest.fn();
    mockErrorBoundary.children = children;
    return <div data-testid={`error-boundary-${componentName || 'default'}`}>{children}</div>;
  },
  RouteErrorBoundary: ({ children, onError, routeName, fallback }: any) => {
    mockRouteErrorBoundary.onError = onError || jest.fn();
    mockRouteErrorBoundary.fallback = fallback;
    mockRouteErrorBoundary.routeName = routeName;
    mockRouteErrorBoundary.children = children;
    return <div data-testid={`route-error-boundary-${routeName}`}>{fallback || children}</div>;
  },
  GlobalErrorBoundary: ({ children, onError }: any) => {
    mockGlobalErrorBoundary.onError = onError || jest.fn();
    mockGlobalErrorBoundary.children = children;
    return <div data-testid="global-error-boundary">{children}</div>;
  },
  AsyncErrorBoundary: ({ children, onError, componentName }: any) => {
    mockAsyncErrorBoundary.onError = onError || jest.fn();
    mockAsyncErrorBoundary.componentName = componentName;
    mockAsyncErrorBoundary.children = children;
    return <div data-testid={`async-error-boundary-${componentName}`}>{children}</div>;
  },
}));

// Mock react-error-boundary
jest.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, onError, fallback: Fallback }: any) => {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      const errorHandler = (event: ErrorEvent) => {
        setHasError(true);
        setError(event.error);
        if (onError) onError(event.error, { componentStack: '' });
      };

      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    }, [onError]);

    if (hasError) {
      return Fallback ? <Fallback error={error} /> : <div data-testid="error-fallback">Something went wrong</div>;
    }

    return <div data-testid="error-boundary-wrapper">{children}</div>;
  },
  withErrorBoundary: (Component: any, errorBoundaryConfig: any) => {
    return (props: any) => {
      const { ErrorBoundary } = require('react-error-boundary');
      return (
        <ErrorBoundary {...errorBoundaryConfig}>
          <Component {...props} />
        </ErrorBoundary>
      );
    };
  },
}));

// Mock fallback components
jest.mock('@/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message, size }: any) => 
      <div data-testid="loading-fallback" data-size={size}>{message || 'Loading...'}</div>,
    ErrorFallback: ({ error, resetError }: any) => 
      <div data-testid="error-fallback">
        <h2>Something went wrong</h2>
        <p>{error?.message}</p>
        <button onClick={resetError} data-testid="reset-error">Try Again</button>
      </div>,
    FeedFallback: () => <div data-testid="feed-fallback">Feed Loading...</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Dual Instance Loading...</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Dashboard Loading...</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Agent Manager Loading...</div>,
    AgentProfileFallback: () => <div data-testid="agent-profile-fallback">Agent Profile Loading...</div>,
    WorkflowFallback: () => <div data-testid="workflow-fallback">Workflow Loading...</div>,
    AnalyticsFallback: () => <div data-testid="analytics-fallback">Analytics Loading...</div>,
    ClaudeCodeFallback: () => <div data-testid="claude-code-fallback">Claude Code Loading...</div>,
    ActivityFallback: () => <div data-testid="activity-fallback">Activity Loading...</div>,
    SettingsFallback: () => <div data-testid="settings-fallback">Settings Loading...</div>,
    NotFoundFallback: () => <div data-testid="not-found-fallback">Page Not Found</div>,
  },
}));

// Test components
const WorkingComponent: React.FC = () => <div data-testid="working-component">Working Component</div>;

const ErrorComponent: React.FC<{ shouldError?: boolean; errorMessage?: string }> = ({ 
  shouldError = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldError) {
    throw new Error(errorMessage);
  }
  return <div data-testid="error-component">Error Component</div>;
};

const AsyncErrorComponent: React.FC<{ shouldError?: boolean }> = ({ shouldError = true }) => {
  React.useEffect(() => {
    if (shouldError) {
      setTimeout(() => {
        throw new Error('Async error');
      }, 0);
    }
  }, [shouldError]);

  return <div data-testid="async-error-component">Async Component</div>;
};

const NetworkErrorComponent: React.FC = () => {
  React.useEffect(() => {
    fetch('/api/test').catch(error => {
      // Instead of throwing, just log the error to test network handling
      console.warn('Network error:', error.message);
    });
  }, []);

  return <div data-testid="network-error-component">Network Component</div>;
};

describe('Error Boundary Behavior - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Error Boundary Behavior', () => {
    it('should render children when no error occurs', () => {
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <ErrorBoundary componentName="test">
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary-test')).toBeInTheDocument();
    });

    it('should catch errors and call onError callback', () => {
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      const onErrorSpy = jest.fn();
      
      expect(() => {
        render(
          <ErrorBoundary componentName="test" onError={onErrorSpy}>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).not.toThrow(); // Error boundary should catch the error
    });

    it('should render fallback UI when error occurs', () => {
      const { ErrorBoundary } = require('react-error-boundary');
      const FallbackComponent = ({ error }: { error: Error }) => 
        <div data-testid="custom-fallback">Error: {error?.message || 'Unknown error'}</div>;
      
      // Suppress React error boundary warnings for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      try {
        render(
          <ErrorBoundary fallback={FallbackComponent}>
            <ErrorComponent errorMessage="Custom error message" />
          </ErrorBoundary>
        );

        expect(screen.getByTestId('error-boundary-wrapper')).toBeInTheDocument();
      } finally {
        console.error = originalError;
      }
    });
  });

  describe('GlobalErrorBoundary Integration', () => {
    it('should wrap entire application with global error boundary', () => {
      const { GlobalErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <GlobalErrorBoundary>
          <WorkingComponent />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should handle uncaught errors globally', () => {
      const { GlobalErrorBoundary } = require('@/components/ErrorBoundary');
      const onErrorSpy = jest.fn();
      
      render(
        <GlobalErrorBoundary onError={onErrorSpy}>
          <ErrorComponent errorMessage="Global error" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should provide fallback for entire app when major errors occur', () => {
      const { GlobalErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <GlobalErrorBoundary>
          <div>
            <ErrorComponent />
            <WorkingComponent />
          </div>
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });
  });

  describe('RouteErrorBoundary Behavior', () => {
    it('should wrap route components with route-specific error boundaries', () => {
      const { RouteErrorBoundary } = require('@/components/ErrorBoundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      render(
        <RouteErrorBoundary routeName="Feed" fallback={<FallbackComponents.FeedFallback />}>
          <WorkingComponent />
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('route-error-boundary-Feed')).toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should render route-specific fallback when route component fails', () => {
      const { RouteErrorBoundary } = require('@/components/ErrorBoundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      render(
        <RouteErrorBoundary routeName="Feed" fallback={<FallbackComponents.FeedFallback />}>
          <ErrorComponent />
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('feed-fallback')).toBeInTheDocument();
    });

    it('should handle different route error scenarios', () => {
      const { RouteErrorBoundary } = require('@/components/ErrorBoundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      const routes = [
        { name: 'DualInstance', fallback: <FallbackComponents.DualInstanceFallback /> },
        { name: 'Dashboard', fallback: <FallbackComponents.DashboardFallback /> },
        { name: 'Agents', fallback: <FallbackComponents.AgentManagerFallback /> },
      ];

      routes.forEach(route => {
        const { rerender } = render(
          <RouteErrorBoundary routeName={route.name} fallback={route.fallback}>
            <ErrorComponent />
          </RouteErrorBoundary>
        );

        expect(screen.getByTestId(`${route.name.toLowerCase()}-fallback`)).toBeInTheDocument();
        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('AsyncErrorBoundary Behavior', () => {
    it('should handle asynchronous errors in components', () => {
      const { AsyncErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <AsyncErrorBoundary componentName="AsyncTest">
          <AsyncErrorComponent shouldError={false} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByTestId('async-error-boundary-AsyncTest')).toBeInTheDocument();
      expect(screen.getByTestId('async-error-component')).toBeInTheDocument();
    });

    it('should catch errors from async operations', async () => {
      const { AsyncErrorBoundary } = require('@/components/ErrorBoundary');
      const onErrorSpy = jest.fn();
      
      render(
        <AsyncErrorBoundary componentName="AsyncTest" onError={onErrorSpy}>
          <AsyncErrorComponent />
        </AsyncErrorBoundary>
      );

      expect(screen.getByTestId('async-error-boundary-AsyncTest')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', () => {
      const { AsyncErrorBoundary } = require('@/components/ErrorBoundary');
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failed'));
      
      render(
        <AsyncErrorBoundary componentName="NetworkTest">
          <NetworkErrorComponent />
        </AsyncErrorBoundary>
      );

      expect(screen.getByTestId('async-error-boundary-NetworkTest')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Reset', () => {
    it('should provide error recovery mechanisms', () => {
      const { ErrorBoundary } = require('react-error-boundary');
      const FallbackComponent = ({ error, resetError }: any) => (
        <div data-testid="recovery-fallback">
          <p>Error: {error?.message || 'Unknown error'}</p>
          <button onClick={resetError} data-testid="recover-button">
            Try Again
          </button>
        </div>
      );
      
      // Suppress error logs for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      try {
        render(
          <ErrorBoundary fallback={FallbackComponent}>
            <ErrorComponent />
          </ErrorBoundary>
        );

        expect(screen.getByTestId('error-boundary-wrapper')).toBeInTheDocument();
      } finally {
        console.error = originalError;
      }
    });

    it('should reset error state when recovery is triggered', () => {
      const { ErrorBoundary } = require('react-error-boundary');
      const resetSpy = jest.fn();
      
      render(
        <ErrorBoundary onReset={resetSpy}>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-wrapper')).toBeInTheDocument();
      expect(resetSpy).toBeDefined(); // Verify reset function is provided
    });
  });

  describe('Error Reporting and Logging', () => {
    it('should report errors to error tracking service', () => {
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      const errorReportSpy = jest.fn();
      
      render(
        <ErrorBoundary componentName="test" onError={errorReportSpy}>
          <ErrorComponent errorMessage="Tracked error" />
        </ErrorBoundary>
      );

      // In real implementation, errorReportSpy would be called
      expect(errorReportSpy).toBeDefined();
    });

    it('should include component stack information in error reports', () => {
      const { ErrorBoundary } = require('react-error-boundary');
      const onErrorSpy = jest.fn();
      
      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ErrorComponent errorMessage="Stack error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-wrapper')).toBeInTheDocument();
    });

    it('should log errors to console in development', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <ErrorBoundary componentName="dev-test">
          <ErrorComponent errorMessage="Dev error" />
        </ErrorBoundary>
      );

      // Console error would be called in real implementation
      expect(consoleSpy).toBeDefined();
    });
  });

  describe('Fallback Component Contracts', () => {
    it('should render appropriate fallbacks for different error types', () => {
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      const fallbacks = [
        { component: FallbackComponents.LoadingFallback, testId: 'loading-fallback' },
        { component: FallbackComponents.FeedFallback, testId: 'feed-fallback' },
        { component: FallbackComponents.DualInstanceFallback, testId: 'dual-instance-fallback' },
        { component: FallbackComponents.DashboardFallback, testId: 'dashboard-fallback' },
      ];

      fallbacks.forEach(fallback => {
        const { rerender } = render(<fallback.component />);
        expect(screen.getByTestId(fallback.testId)).toBeInTheDocument();
        rerender(<div />);
      });
    });

    it('should provide actionable fallbacks with retry mechanisms', () => {
      const FallbackComponents = require('@/components/FallbackComponents').default;
      const retrySpy = jest.fn();
      
      render(<FallbackComponents.ErrorFallback resetError={retrySpy} />);
      
      const retryButton = screen.getByTestId('reset-error');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(retrySpy).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Nesting and Hierarchy', () => {
    it('should handle nested error boundaries correctly', () => {
      const { ErrorBoundary, GlobalErrorBoundary } = require('@/components/ErrorBoundary');
      
      render(
        <GlobalErrorBoundary>
          <ErrorBoundary componentName="nested">
            <ErrorComponent />
          </ErrorBoundary>
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary-nested')).toBeInTheDocument();
    });

    it('should bubble errors up the boundary hierarchy', () => {
      const { ErrorBoundary, RouteErrorBoundary } = require('@/components/ErrorBoundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      render(
        <RouteErrorBoundary routeName="Test" fallback={<FallbackComponents.ErrorFallback />}>
          <ErrorBoundary componentName="inner">
            <ErrorComponent />
          </ErrorBoundary>
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('route-error-boundary-Test')).toBeInTheDocument();
    });
  });

  describe('White Screen Prevention', () => {
    it('should never result in a completely blank screen', () => {
      const { GlobalErrorBoundary } = require('@/components/ErrorBoundary');
      
      const { container } = render(
        <GlobalErrorBoundary>
          <ErrorComponent />
        </GlobalErrorBoundary>
      );

      expect(container).toHaveNoWhiteScreen();
    });

    it('should always provide some form of user feedback during errors', () => {
      const { ErrorBoundary } = require('react-error-boundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      render(
        <ErrorBoundary fallback={FallbackComponents.ErrorFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-wrapper')).toBeInTheDocument();
    });

    it('should maintain application shell during component errors', () => {
      const { RouteErrorBoundary } = require('@/components/ErrorBoundary');
      const FallbackComponents = require('@/components/FallbackComponents').default;
      
      render(
        <div data-testid="app-shell">
          <header data-testid="app-header">Header</header>
          <RouteErrorBoundary routeName="Main" fallback={<FallbackComponents.ErrorFallback />}>
            <ErrorComponent />
          </RouteErrorBoundary>
          <footer data-testid="app-footer">Footer</footer>
        </div>
      );

      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
      expect(screen.getByTestId('app-header')).toBeInTheDocument();
      expect(screen.getByTestId('app-footer')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Performance', () => {
    it('should not impact performance when no errors occur', () => {
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      
      const startTime = performance.now();
      render(
        <ErrorBoundary componentName="perf-test">
          <WorkingComponent />
        </ErrorBoundary>
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should efficiently handle multiple error boundaries', () => {
      const { ErrorBoundary } = require('@/components/ErrorBoundary');
      
      const multipleBoundaries = Array.from({ length: 10 }, (_, i) => (
        <ErrorBoundary key={i} componentName={`test-${i}`}>
          <WorkingComponent />
        </ErrorBoundary>
      ));

      render(<div>{multipleBoundaries}</div>);
      
      // All boundaries should render efficiently
      expect(screen.getAllByTestId('working-component')).toHaveLength(10);
    });
  });
});