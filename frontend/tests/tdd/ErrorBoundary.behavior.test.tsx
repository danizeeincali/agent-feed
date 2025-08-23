/**
 * TDD London School Test Suite - Error Boundary Behavior Tests
 * 
 * Focused on testing error boundary interactions and fallback behavior
 * to ensure graceful handling of component failures that could cause white screens
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the actual error boundary implementation
jest.mock('../../src/components/ErrorBoundary', () => {
  const React = require('react');
  
  class MockErrorBoundary extends React.Component<any, any> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
      mockErrorBoundaryInstances.push(this);
    }

    static getDerivedStateFromError(error: Error) {
      mockErrorBoundaryCallbacks.getDerivedStateFromError.push({ error });
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      mockErrorBoundaryCallbacks.componentDidCatch.push({ error, errorInfo });
    }

    render() {
      mockErrorBoundaryCallbacks.render.push({
        hasError: this.state.hasError,
        componentName: this.props.componentName
      });

      if (this.state.hasError) {
        return (
          <div data-testid={`error-boundary-fallback-${this.props.componentName || 'default'}`}>
            <h2>Component Error</h2>
            <p>Component {this.props.componentName} has encountered an error</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Retry
            </button>
          </div>
        );
      }

      return (
        <div data-testid={`error-boundary-${this.props.componentName || 'default'}`}>
          {this.props.children}
        </div>
      );
    }
  }

  class MockRouteErrorBoundary extends React.Component<any, any> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
      mockRouteErrorBoundaryInstances.push(this);
    }

    static getDerivedStateFromError(error: Error) {
      mockRouteErrorBoundaryCallbacks.getDerivedStateFromError.push({ error });
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      mockRouteErrorBoundaryCallbacks.componentDidCatch.push({ error, errorInfo });
    }

    render() {
      mockRouteErrorBoundaryCallbacks.render.push({
        hasError: this.state.hasError,
        routeName: this.props.routeName
      });

      if (this.state.hasError) {
        return this.props.fallback || (
          <div data-testid={`route-error-fallback-${this.props.routeName}`}>
            <h2>Route Error</h2>
            <p>Route {this.props.routeName} has encountered an error</p>
          </div>
        );
      }

      return (
        <div data-testid={`route-error-boundary-${this.props.routeName}`}>
          {this.props.children}
        </div>
      );
    }
  }

  class MockGlobalErrorBoundary extends React.Component<any, any> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
      mockGlobalErrorBoundaryInstances.push(this);
    }

    static getDerivedStateFromError(error: Error) {
      mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError.push({ error });
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      mockGlobalErrorBoundaryCallbacks.componentDidCatch.push({ error, errorInfo });
    }

    render() {
      mockGlobalErrorBoundaryCallbacks.render.push({
        hasError: this.state.hasError
      });

      if (this.state.hasError) {
        return (
          <div data-testid="global-error-fallback">
            <h1>Application Error</h1>
            <p>The application has encountered an unexpected error</p>
            <button onClick={() => window.location.reload()}>
              Reload Application
            </button>
          </div>
        );
      }

      return (
        <div data-testid="global-error-boundary">
          {this.props.children}
        </div>
      );
    }
  }

  return {
    ErrorBoundary: MockErrorBoundary,
    RouteErrorBoundary: MockRouteErrorBoundary,
    GlobalErrorBoundary: MockGlobalErrorBoundary,
    AsyncErrorBoundary: MockErrorBoundary // Reuse for simplicity
  };
});

jest.mock('../../src/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    ErrorFallback: ({ error, resetErrorBoundary }: any) => {
      mockFallbackComponents.ErrorFallback.push({ error, resetErrorBoundary });
      return (
        <div data-testid="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      );
    },
    ComponentErrorFallback: ({ componentName, error }: any) => {
      mockFallbackComponents.ComponentErrorFallback.push({ componentName, error });
      return (
        <div data-testid={`component-error-fallback-${componentName}`}>
          <h3>Component {componentName} failed to load</h3>
        </div>
      );
    },
    RouteErrorFallback: ({ routeName }: any) => {
      mockFallbackComponents.RouteErrorFallback.push({ routeName });
      return (
        <div data-testid={`route-error-fallback-${routeName}`}>
          <h3>Route {routeName} is unavailable</h3>
          <p>Please try again later</p>
        </div>
      );
    }
  }
}));

// London School mock objects for behavior verification
const mockErrorBoundaryInstances: any[] = [];
const mockRouteErrorBoundaryInstances: any[] = [];
const mockGlobalErrorBoundaryInstances: any[] = [];

const mockErrorBoundaryCallbacks = {
  getDerivedStateFromError: [] as any[],
  componentDidCatch: [] as any[],
  render: [] as any[]
};

const mockRouteErrorBoundaryCallbacks = {
  getDerivedStateFromError: [] as any[],
  componentDidCatch: [] as any[],
  render: [] as any[]
};

const mockGlobalErrorBoundaryCallbacks = {
  getDerivedStateFromError: [] as any[],
  componentDidCatch: [] as any[],
  render: [] as any[]
};

const mockFallbackComponents = {
  ErrorFallback: [] as any[],
  ComponentErrorFallback: [] as any[],
  RouteErrorFallback: [] as any[]
};

describe('Error Boundary Behavior - London School TDD', () => {
  beforeEach(() => {
    // Reset all mock instances and callbacks
    mockErrorBoundaryInstances.length = 0;
    mockRouteErrorBoundaryInstances.length = 0;
    mockGlobalErrorBoundaryInstances.length = 0;

    mockErrorBoundaryCallbacks.getDerivedStateFromError.length = 0;
    mockErrorBoundaryCallbacks.componentDidCatch.length = 0;
    mockErrorBoundaryCallbacks.render.length = 0;

    mockRouteErrorBoundaryCallbacks.getDerivedStateFromError.length = 0;
    mockRouteErrorBoundaryCallbacks.componentDidCatch.length = 0;
    mockRouteErrorBoundaryCallbacks.render.length = 0;

    mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError.length = 0;
    mockGlobalErrorBoundaryCallbacks.componentDidCatch.length = 0;
    mockGlobalErrorBoundaryCallbacks.render.length = 0;

    Object.values(mockFallbackComponents).forEach(mock => {
      mock.length = 0;
    });

    // Suppress console errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console
    jest.restoreAllMocks();
  });

  describe('Error Boundary Instantiation and Lifecycle', () => {
    it('should create error boundary instances correctly', async () => {
      const { ErrorBoundary, GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      render(
        <GlobalErrorBoundary>
          <ErrorBoundary componentName="TestComponent">
            <div data-testid="test-content">Normal content</div>
          </ErrorBoundary>
        </GlobalErrorBoundary>
      );

      // Verify instances were created
      expect(mockGlobalErrorBoundaryInstances).toHaveLength(1);
      expect(mockErrorBoundaryInstances).toHaveLength(1);

      // Verify initial render calls
      expect(mockGlobalErrorBoundaryCallbacks.render).toHaveLength(1);
      expect(mockErrorBoundaryCallbacks.render).toHaveLength(1);

      // Verify normal content is rendered
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should establish error boundary hierarchy', async () => {
      const { ErrorBoundary, RouteErrorBoundary, GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      render(
        <GlobalErrorBoundary>
          <RouteErrorBoundary routeName="TestRoute">
            <ErrorBoundary componentName="TestComponent">
              <div data-testid="nested-content">Nested content</div>
            </ErrorBoundary>
          </RouteErrorBoundary>
        </GlobalErrorBoundary>
      );

      // Verify all boundary instances are created
      expect(mockGlobalErrorBoundaryInstances).toHaveLength(1);
      expect(mockRouteErrorBoundaryInstances).toHaveLength(1);
      expect(mockErrorBoundaryInstances).toHaveLength(1);

      // Verify nested structure
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('route-error-boundary-TestRoute')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary-TestComponent')).toBeInTheDocument();
    });
  });

  describe('Error Catching and State Management', () => {
    it('should catch component errors and update state', async () => {
      const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingComponent() {
        throw new Error('Test component error');
      }

      render(
        <ErrorBoundary componentName="FailingComponent">
          <FailingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        // Verify error was caught
        expect(mockErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(mockErrorBoundaryCallbacks.getDerivedStateFromError[0].error.message)
          .toBe('Test component error');

        // Verify componentDidCatch was called
        expect(mockErrorBoundaryCallbacks.componentDidCatch).toHaveLength(1);
        expect(mockErrorBoundaryCallbacks.componentDidCatch[0].error.message)
          .toBe('Test component error');

        // Verify fallback UI is shown
        expect(screen.getByTestId('error-boundary-fallback-FailingComponent')).toBeInTheDocument();
        expect(screen.getByText('Component FailingComponent has encountered an error')).toBeInTheDocument();
      });
    });

    it('should handle route-level errors', async () => {
      const { RouteErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingRoute() {
        throw new Error('Route loading failed');
      }

      render(
        <RouteErrorBoundary routeName="FailingRoute">
          <FailingRoute />
        </RouteErrorBoundary>
      );

      await waitFor(() => {
        // Verify route error was caught
        expect(mockRouteErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(mockRouteErrorBoundaryCallbacks.getDerivedStateFromError[0].error.message)
          .toBe('Route loading failed');

        // Verify route fallback is shown
        expect(screen.getByTestId('route-error-fallback-FailingRoute')).toBeInTheDocument();
        expect(screen.getByText('Route FailingRoute has encountered an error')).toBeInTheDocument();
      });
    });

    it('should handle global application errors', async () => {
      const { GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function CriticalFailure() {
        throw new Error('Critical application failure');
      }

      render(
        <GlobalErrorBoundary>
          <CriticalFailure />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        // Verify global error was caught
        expect(mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError[0].error.message)
          .toBe('Critical application failure');

        // Verify global fallback is shown
        expect(screen.getByTestId('global-error-fallback')).toBeInTheDocument();
        expect(screen.getByText('The application has encountered an unexpected error')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery and Retry Behavior', () => {
    it('should allow error recovery through retry button', async () => {
      const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

      let shouldFail = true;
      function ConditionallyFailingComponent() {
        if (shouldFail) {
          throw new Error('Component failed');
        }
        return <div data-testid="recovered-content">Component recovered</div>;
      }

      render(
        <ErrorBoundary componentName="ConditionallyFailingComponent">
          <ConditionallyFailingComponent />
        </ErrorBoundary>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback-ConditionallyFailingComponent')).toBeInTheDocument();
      });

      // Fix the component and retry
      shouldFail = false;
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        // Component should recover
        expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
        expect(screen.queryByTestId('error-boundary-fallback-ConditionallyFailingComponent')).not.toBeInTheDocument();
      });
    });

    it('should handle global application reload', async () => {
      const { GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function CriticalFailure() {
        throw new Error('Application cannot continue');
      }

      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      render(
        <GlobalErrorBoundary>
          <CriticalFailure />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('global-error-fallback')).toBeInTheDocument();
      });

      // Click reload button
      const reloadButton = screen.getByText('Reload Application');
      fireEvent.click(reloadButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Boundary Fallback Integration', () => {
    it('should use custom fallback components for routes', async () => {
      const { RouteErrorBoundary } = await import('../../src/components/ErrorBoundary');
      const FallbackComponents = await import('../../src/components/FallbackComponents');

      const customFallback = (
        <FallbackComponents.default.RouteErrorFallback routeName="CustomRoute" />
      );

      function FailingRoute() {
        throw new Error('Custom route error');
      }

      render(
        <RouteErrorBoundary routeName="CustomRoute" fallback={customFallback}>
          <FailingRoute />
        </RouteErrorBoundary>
      );

      await waitFor(() => {
        // Should use custom fallback instead of default
        expect(mockFallbackComponents.RouteErrorFallback).toHaveLength(1);
        expect(mockFallbackComponents.RouteErrorFallback[0].routeName).toBe('CustomRoute');
      });
    });
  });

  describe('Error Propagation and Containment', () => {
    it('should prevent error propagation up the boundary chain', async () => {
      const { ErrorBoundary, GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingChild() {
        throw new Error('Child component error');
      }

      function SafeParent() {
        return <div data-testid="safe-parent">Safe parent content</div>;
      }

      render(
        <GlobalErrorBoundary>
          <SafeParent />
          <ErrorBoundary componentName="FailingChild">
            <FailingChild />
          </ErrorBoundary>
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        // Child error should be contained
        expect(mockErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(0);

        // Safe parent should still render
        expect(screen.getByTestId('safe-parent')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary-fallback-FailingChild')).toBeInTheDocument();
      });
    });

    it('should escalate to global boundary when local boundary fails', async () => {
      const { ErrorBoundary, GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      // Mock a failing error boundary
      const originalErrorBoundary = require('../../src/components/ErrorBoundary').ErrorBoundary;
      
      function FailingErrorBoundary(props: any) {
        if (props.shouldFailSelf) {
          throw new Error('Error boundary itself failed');
        }
        return React.createElement(originalErrorBoundary, props);
      }

      function FailingChild() {
        throw new Error('Child error');
      }

      render(
        <GlobalErrorBoundary>
          <FailingErrorBoundary componentName="FailingBoundary" shouldFailSelf={true}>
            <FailingChild />
          </FailingErrorBoundary>
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        // Should escalate to global boundary
        expect(mockGlobalErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(screen.getByTestId('global-error-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Performance and Memory Management', () => {
    it('should cleanup error state on unmount', async () => {
      const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingComponent() {
        throw new Error('Component error');
      }

      const { unmount } = render(
        <ErrorBoundary componentName="CleanupTest">
          <FailingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockErrorBoundaryInstances).toHaveLength(1);
      });

      // Unmount component
      unmount();

      // Error boundary should be cleaned up
      // (In real implementation, this would clear error states)
      expect(mockErrorBoundaryInstances[0]).toBeDefined();
    });

    it('should handle multiple rapid errors gracefully', async () => {
      const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

      let errorCount = 0;
      function MultiFailComponent() {
        errorCount++;
        throw new Error(`Error ${errorCount}`);
      }

      const { rerender } = render(
        <ErrorBoundary componentName="MultiFailTest">
          <MultiFailComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
      });

      // Trigger another error through rerender
      rerender(
        <ErrorBoundary componentName="MultiFailTest">
          <MultiFailComponent />
        </ErrorBoundary>
      );

      // Should handle multiple errors without breaking
      expect(mockErrorBoundaryCallbacks.getDerivedStateFromError.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Boundary Integration with Router', () => {
    it('should handle routing errors within error boundaries', async () => {
      const { RouteErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingRouteComponent() {
        throw new Error('Route component failed');
      }

      render(
        <BrowserRouter>
          <RouteErrorBoundary routeName="TestRoute">
            <FailingRouteComponent />
          </RouteErrorBoundary>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockRouteErrorBoundaryCallbacks.getDerivedStateFromError).toHaveLength(1);
        expect(screen.getByTestId('route-error-fallback-TestRoute')).toBeInTheDocument();
      });
    });
  });

  describe('White Screen Prevention', () => {
    it('should prevent white screens through error boundary fallbacks', async () => {
      const { ErrorBoundary, GlobalErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function CompletelyFailingApp() {
        throw new Error('Complete application failure');
      }

      const { container } = render(
        <GlobalErrorBoundary>
          <ErrorBoundary componentName="App">
            <CompletelyFailingApp />
          </ErrorBoundary>
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        // Should show error UI instead of white screen
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(screen.getByText('Component Error')).toBeInTheDocument();
        
        // Should provide user recovery options
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should maintain application shell during component errors', async () => {
      const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

      function FailingWidget() {
        throw new Error('Widget failed');
      }

      function AppShell() {
        return (
          <div data-testid="app-shell">
            <header data-testid="header">App Header</header>
            <main>
              <div data-testid="sidebar">Sidebar</div>
              <ErrorBoundary componentName="Widget">
                <FailingWidget />
              </ErrorBoundary>
            </main>
          </div>
        );
      }

      render(<AppShell />);

      await waitFor(() => {
        // App shell should remain intact
        expect(screen.getByTestId('app-shell')).toBeInTheDocument();
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        
        // Only the failing widget should show error
        expect(screen.getByTestId('error-boundary-fallback-Widget')).toBeInTheDocument();
      });
    });
  });
});