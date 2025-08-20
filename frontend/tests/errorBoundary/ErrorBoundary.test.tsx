/**
 * TDD London School ErrorBoundary Tests
 * 
 * Tests error boundaries and fallback UI to ensure zero white screens.
 * Focuses on behavior verification and error handling patterns.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import error boundary components
import { 
  ErrorBoundary, 
  RouteErrorBoundary, 
  ComponentErrorBoundary,
  AsyncErrorBoundary,
  GlobalErrorBoundary,
  LegacyErrorBoundary 
} from '@/components/ErrorBoundary';
import FallbackComponents from '@/components/FallbackComponents';

// Mock error handling utilities
const mockErrorHandler = {
  captureComponentError: jest.fn().mockReturnValue('error-id-123'),
  logErrorBoundaryRender: jest.fn(),
  exportErrorLog: jest.fn().mockReturnValue('{"errors": []}')
};

jest.mock('@/utils/errorHandling', () => ({
  ...jest.requireActual('@/utils/errorHandling'),
  captureComponentError: mockErrorHandler.captureComponentError,
  logErrorBoundaryRender: mockErrorHandler.logErrorBoundaryRender,
  errorHandler: mockErrorHandler
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(void 0)
  }
});

describe('ErrorBoundary Tests - TDD London School', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('ErrorBoundary Component Behavior', () => {
    const ThrowingComponent = ({ shouldThrow = true, message = 'Test error' }) => {
      if (shouldThrow) {
        throw new Error(message);
      }
      return <div data-testid="working-component">Component works!</div>;
    };

    it('should catch errors and display fallback UI', async () => {
      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Assert - Error boundary should catch error and show fallback
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should log error with proper context', async () => {
      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent message="Detailed test error" />
        </ErrorBoundary>
      );

      // Assert - Verify error logging behavior
      await waitFor(() => {
        expect(mockErrorHandler.captureComponentError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Detailed test error' }),
          'TestComponent',
          expect.any(Object),
          expect.any(Object)
        );
      });

      expect(mockErrorHandler.logErrorBoundaryRender).toHaveBeenCalledWith('TestComponent', true);
    });

    it('should reset error state when retry button is clicked', async () => {
      // Arrange - Component that can be fixed
      let shouldThrow = true;
      const ConditionalComponent = () => {
        if (shouldThrow) {
          throw new Error('Fixable error');
        }
        return <div data-testid="recovered-component">Fixed!</div>;
      };

      render(
        <ErrorBoundary componentName="ConditionalComponent">
          <ConditionalComponent />
        </ErrorBoundary>
      );

      // Assert initial error state
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Fix the error and retry
      shouldThrow = false;
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Assert - Component should recover
      await waitFor(() => {
        expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should use custom fallback when provided', async () => {
      // Arrange
      const CustomFallback = <div data-testid="custom-fallback">Custom error message</div>;

      // Act
      render(
        <ErrorBoundary componentName="TestComponent" fallback={CustomFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should handle onError callback properly', async () => {
      // Arrange
      const mockOnError = jest.fn();

      // Act
      render(
        <ErrorBoundary componentName="TestComponent" onError={mockOnError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Assert - Callback should be called
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Test error' }),
          expect.any(Object)
        );
      });
    });
  });

  describe('RouteErrorBoundary Behavior', () => {
    it('should handle route-specific errors', async () => {
      // Act
      render(
        <RouteErrorBoundary routeName="TestRoute">
          <div>
            {(() => { throw new Error('Route error'); })()}
          </div>
        </RouteErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify route-specific error capture
      expect(mockErrorHandler.captureComponentError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Route error' }),
        'Route-TestRoute',
        expect.objectContaining({ routeName: 'TestRoute' }),
        expect.objectContaining({ hasError: true })
      );
    });

    it('should use route-specific fallback', async () => {
      // Arrange
      const RouteFallback = <div data-testid="route-fallback">Route is unavailable</div>;

      // Act
      render(
        <RouteErrorBoundary routeName="TestRoute" fallback={RouteFallback}>
          <div>
            {(() => { throw new Error('Route error'); })()}
          </div>
        </RouteErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('route-fallback')).toBeInTheDocument();
      });
    });

    it('should reset on route changes', async () => {
      // Arrange - Mock location change
      const originalLocation = window.location.pathname;
      
      let shouldThrow = true;
      const RouteComponent = () => {
        if (shouldThrow) {
          throw new Error('Route error');
        }
        return <div data-testid="route-content">Route content</div>;
      };

      const { rerender } = render(
        <RouteErrorBoundary routeName="TestRoute">
          <RouteComponent />
        </RouteErrorBoundary>
      );

      // Assert initial error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Simulate route change and fix
      shouldThrow = false;
      Object.defineProperty(window, 'location', {
        value: { pathname: '/new-route' },
        writable: true
      });

      rerender(
        <RouteErrorBoundary routeName="NewRoute">
          <RouteComponent />
        </RouteErrorBoundary>
      );

      // Assert - Should reset and show content
      await waitFor(() => {
        expect(screen.getByTestId('route-content')).toBeInTheDocument();
      });

      // Cleanup
      Object.defineProperty(window, 'location', {
        value: { pathname: originalLocation },
        writable: true
      });
    });
  });

  describe('ComponentErrorBoundary Behavior', () => {
    it('should display component-specific error UI', async () => {
      // Act
      render(
        <ComponentErrorBoundary componentName="TestWidget">
          <div>
            {(() => { throw new Error('Widget error'); })()}
          </div>
        </ComponentErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('TestWidget-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/TestWidget component encountered an error/i)).toBeInTheDocument();
    });

    it('should display minimal error UI when minimal=true', async () => {
      // Act
      render(
        <ComponentErrorBoundary componentName="TestWidget" minimal={true}>
          <div>
            {(() => { throw new Error('Widget error'); })()}
          </div>
        </ComponentErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('TestWidget-error-minimal')).toBeInTheDocument();
      });

      expect(screen.getByText(/TestWidget Error/i)).toBeInTheDocument();
    });

    it('should isolate errors when isolate=true', async () => {
      // This test verifies that isolated components use LegacyErrorBoundary
      const mockOnError = jest.fn();

      // Act
      render(
        <div>
          <ComponentErrorBoundary componentName="IsolatedWidget" isolate={true} onError={mockOnError}>
            <div>
              {(() => { throw new Error('Isolated error'); })()}
            </div>
          </ComponentErrorBoundary>
          <div data-testid="sibling-component">Sibling component</div>
        </div>
      );

      // Assert - Error should be contained
      await waitFor(() => {
        expect(screen.getByTestId('sibling-component')).toBeInTheDocument();
      });

      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('AsyncErrorBoundary Behavior', () => {
    it('should handle chunk loading errors', async () => {
      // Arrange
      const ChunkErrorComponent = () => {
        const error = new Error('Loading chunk 123 failed');
        error.name = 'ChunkLoadError';
        throw error;
      };

      const mockOnChunkError = jest.fn();

      // Act
      render(
        <AsyncErrorBoundary componentName="AsyncComponent" onChunkError={mockOnChunkError}>
          <ChunkErrorComponent />
        </AsyncErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(mockOnChunkError).toHaveBeenCalled();
      });
    });

    it('should auto-reload on chunk errors', async () => {
      // Arrange
      const originalReload = window.location.reload;
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      });

      jest.useFakeTimers();

      const ChunkErrorComponent = () => {
        const error = new Error('Loading chunk failed');
        error.name = 'ChunkLoadError';
        throw error;
      };

      // Act
      render(
        <AsyncErrorBoundary componentName="AsyncComponent">
          <ChunkErrorComponent />
        </AsyncErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockReload).toHaveBeenCalled();

      // Cleanup
      jest.useRealTimers();
      Object.defineProperty(window.location, 'reload', {
        value: originalReload,
        writable: true
      });
    });
  });

  describe('GlobalErrorBoundary Behavior', () => {
    it('should catch app-level errors', async () => {
      // Act
      render(
        <GlobalErrorBoundary>
          <div>
            {(() => { throw new Error('App-level error'); })()}
          </div>
        </GlobalErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Verify global error logging
      expect(mockErrorHandler.captureComponentError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'App-level error' }),
        'GlobalErrorBoundary',
        expect.objectContaining({ global: true }),
        expect.objectContaining({ hasError: true })
      );
    });

    it('should reset on location changes', async () => {
      // Arrange
      const originalPathname = window.location.pathname;
      
      let shouldThrow = true;
      const AppComponent = () => {
        if (shouldThrow) {
          throw new Error('App error');
        }
        return <div data-testid="app-content">App content</div>;
      };

      const { rerender } = render(
        <GlobalErrorBoundary>
          <AppComponent />
        </GlobalErrorBoundary>
      );

      // Assert initial error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Simulate navigation and fix
      shouldThrow = false;
      Object.defineProperty(window, 'location', {
        value: { pathname: '/new-path' },
        writable: true
      });

      rerender(
        <GlobalErrorBoundary>
          <AppComponent />
        </GlobalErrorBoundary>
      );

      // Assert - Should reset
      await waitFor(() => {
        expect(screen.getByTestId('app-content')).toBeInTheDocument();
      });

      // Cleanup
      Object.defineProperty(window, 'location', {
        value: { pathname: originalPathname },
        writable: true
      });
    });
  });

  describe('Error Fallback UI Interactions', () => {
    it('should copy error ID when copy button is clicked', async () => {
      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <div>
            {(() => { throw new Error('Test error'); })()}
          </div>
        </ErrorBoundary>
      );

      // Assert fallback is shown
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Click copy button
      const copyButton = screen.getByTitle('Copy error ID');
      fireEvent.click(copyButton);

      // Assert - Clipboard should be called
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('error-id-123');
      });
    });

    it('should navigate to home when home button is clicked', async () => {
      // Arrange
      const originalHref = window.location.href;
      delete (window as any).location;
      window.location = { href: '' } as any;

      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <div>
            {(() => { throw new Error('Test error'); })()}
          </div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const homeButton = screen.getByRole('button', { name: /go back to the home page/i });
      fireEvent.click(homeButton);

      // Assert
      expect(window.location.href).toBe('/');

      // Cleanup
      window.location.href = originalHref;
    });

    it('should reload page when reload button is clicked', async () => {
      // Arrange
      const originalReload = window.location.reload;
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      });

      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <div>
            {(() => { throw new Error('Test error'); })()}
          </div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const reloadButton = screen.getByRole('button', { name: /reload the page/i });
      fireEvent.click(reloadButton);

      // Assert
      expect(mockReload).toHaveBeenCalled();

      // Cleanup
      Object.defineProperty(window.location, 'reload', {
        value: originalReload,
        writable: true
      });
    });

    it('should export error log in development mode', async () => {
      // Arrange - Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock URL.createObjectURL and document.createElement
      const mockObjectURL = 'blob:http://localhost:3000/test-url';
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockObjectURL);
      global.URL.revokeObjectURL = jest.fn();

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      // Act
      render(
        <ErrorBoundary componentName="TestComponent">
          <div>
            {(() => { throw new Error('Test error'); })()}
          </div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Click details to expand
      const detailsButton = screen.getByText(/report this issue/i);
      fireEvent.click(detailsButton);

      const exportButton = screen.getByRole('button', { name: /export log/i });
      fireEvent.click(exportButton);

      // Assert
      expect(mockErrorHandler.exportErrorLog).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Fallback Components Integration', () => {
    it('should work with FallbackComponents', async () => {
      // Act
      render(
        <ErrorBoundary 
          componentName="TestComponent"
          fallback={<FallbackComponents.ComponentErrorFallback componentName="TestComponent" />}
        >
          <div>
            {(() => { throw new Error('Test error'); })()}
          </div>
        </ErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      });
    });

    it('should handle network errors with NetworkErrorFallback', async () => {
      // Act
      render(
        <ErrorBoundary 
          componentName="NetworkComponent"
          fallback={<FallbackComponents.NetworkErrorFallback />}
        >
          <div>
            {(() => { throw new Error('Network error'); })()}
          </div>
        </ErrorBoundary>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('network-error-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Composition', () => {
    it('should handle nested error boundaries', async () => {
      // Act
      render(
        <ErrorBoundary componentName="Outer">
          <div data-testid="outer-content">
            Outer content
            <ErrorBoundary componentName="Inner">
              <div>
                {(() => { throw new Error('Inner error'); })()}
              </div>
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Assert - Inner error should be caught by inner boundary
      await waitFor(() => {
        expect(screen.getByTestId('outer-content')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Inner error should not affect outer component
      expect(screen.getByText('Outer content')).toBeInTheDocument();
    });

    it('should escalate errors when inner boundary fails', async () => {
      // This is a complex scenario where the inner boundary itself fails
      const FaultyErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        // Simulate error boundary that also throws
        throw new Error('Error boundary failed');
      };

      // Act
      render(
        <ErrorBoundary componentName="Outer">
          <FaultyErrorBoundary>
            <div>
              {(() => { throw new Error('Inner error'); })()}
            </div>
          </FaultyErrorBoundary>
        </ErrorBoundary>
      );

      // Assert - Outer boundary should catch the escalated error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });
});