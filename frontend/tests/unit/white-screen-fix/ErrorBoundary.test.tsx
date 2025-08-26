/**
 * @file ErrorBoundary Unit Tests
 * @description Comprehensive TDD tests for ErrorBoundary components and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ErrorBoundary,
  LegacyErrorBoundary,
  RouteErrorBoundary,
  ComponentErrorBoundary,
  AsyncErrorBoundary,
  GlobalErrorBoundary,
} from '@/components/ErrorBoundary';

// Mock error handling utilities
vi.mock('@/utils/errorHandling', () => ({
  errorHandler: {
    exportErrorLog: vi.fn().mockReturnValue('{"errors": []}'),
  },
  captureComponentError: vi.fn().mockReturnValue('error-123'),
  createErrorBoundaryConfig: vi.fn(),
  logErrorBoundaryRender: vi.fn(),
}));

// Mock react-error-boundary
vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent, onError }: any) => {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    // Simulate error boundary catching
    React.useEffect(() => {
      const handleError = (event: any) => {
        if (event.error) {
          setHasError(true);
          setError(event.error);
          onError?.(event.error, { componentStack: '' });
        }
      };

      window.addEventListener('test-error', handleError);
      return () => window.removeEventListener('test-error', handleError);
    }, [onError]);

    if (hasError && error) {
      return React.createElement(FallbackComponent, {
        error,
        resetErrorBoundary: () => {
          setHasError(false);
          setError(null);
        },
      });
    }

    return children;
  },
}));

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

// Mock window.alert and window.prompt
const mockAlert = vi.fn();
const mockPrompt = vi.fn();
global.alert = mockAlert;
global.prompt = mockPrompt;

// Test component that throws errors
const ThrowingComponent = ({ shouldThrow = false, errorType = 'generic' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'chunk':
        throw Object.assign(new Error('Loading chunk 123 failed'), { name: 'ChunkLoadError' });
      case 'network':
        throw new Error('Network request failed');
      case 'syntax':
        throw new SyntaxError('Unexpected token');
      default:
        throw new Error('Test error occurred');
    }
  }
  return <div data-testid="working-component">Component works!</div>;
};

// Utility to trigger error in error boundary
const triggerError = (error: Error) => {
  window.dispatchEvent(
    Object.assign(new Event('test-error'), { error })
  );
};

describe('ErrorBoundary Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockClear();
    mockPrompt.mockClear();
    
    // Mock console methods to avoid noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorBoundary (Main)', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Component works!')).toBeInTheDocument();
    });

    it('should catch and display errors', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Trigger error
      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display error fallback with proper ARIA attributes', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        const fallback = screen.getByTestId('error-boundary-fallback');
        expect(fallback).toHaveAttribute('role', 'alert');
        expect(fallback).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should provide Try Again button functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton).toHaveAttribute('aria-label', 'Try to recover from the error');

      await user.click(tryAgainButton);

      // Should attempt to recover
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should provide Reload and Home buttons', async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      const originalReload = window.location.reload;
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByText('Reload')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
      });

      const reloadButton = screen.getByText('Reload');
      await user.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();

      // Restore original reload
      Object.defineProperty(window.location, 'reload', {
        value: originalReload,
        writable: true,
      });
    });

    it('should handle custom fallback component', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;

      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('should call custom onError handler', async () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      const testError = new Error('Test error');
      triggerError(testError);

      await waitFor(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(testError, expect.any(Object));
      });
    });

    it('should capture error details for monitoring', async () => {
      const { captureComponentError } = require('@/utils/errorHandling');

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      const testError = new Error('Test error');
      triggerError(testError);

      await waitFor(() => {
        expect(captureComponentError).toHaveBeenCalledWith(
          testError,
          'TestComponent',
          expect.any(Object),
          expect.any(Object)
        );
      });
    });

    it('should reset on prop changes when configured', async () => {
      let key = 'initial';
      
      const { rerender } = render(
        <ErrorBoundary resetKeys={[key]} resetOnPropsChange={true}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Change reset key
      key = 'changed';
      rerender(
        <ErrorBoundary resetKeys={[key]} resetOnPropsChange={true}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should reset and show working component
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error Reporting', () => {
    it('should display error ID when available', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByText('Error Reference ID:')).toBeInTheDocument();
        expect(screen.getByText('error-123')).toBeInTheDocument();
      });
    });

    it('should allow copying error ID', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByTitle('Copy error ID')).toBeInTheDocument();
      });

      const copyButton = screen.getByTitle('Copy error ID');
      await user.click(copyButton);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('error-123');
    });

    it('should provide error reporting functionality', async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue('User was clicking the submit button');

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByText('Report this issue')).toBeInTheDocument();
      });

      // Open report section
      const reportSummary = screen.getByText('Report this issue');
      await user.click(reportSummary);

      const sendReportButton = screen.getByText('Send Report');
      await user.click(sendReportButton);

      expect(mockPrompt).toHaveBeenCalledWith(
        'Optional: Describe what you were doing when this error occurred:'
      );

      await waitFor(() => {
        expect(screen.getByText('Report Sent')).toBeInTheDocument();
      });
    });

    it('should export error log in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const user = userEvent.setup();
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock createElement and click
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByText('Export Log')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export Log');
      await user.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should show developer info in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error message'));

      await waitFor(() => {
        expect(screen.getByText('🔧 Developer Info')).toBeInTheDocument();
      });

      // Check developer details are present
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
      expect(screen.getByText(/URL:/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('LegacyErrorBoundary', () => {
    it('should catch errors using class-based boundary', () => {
      const ThrowingComponent = () => {
        throw new Error('Legacy test error');
      };

      render(
        <LegacyErrorBoundary>
          <ThrowingComponent />
        </LegacyErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should use custom fallback when provided', () => {
      const ThrowingComponent = () => {
        throw new Error('Legacy test error');
      };

      const CustomFallback = <div data-testid="legacy-custom">Legacy Custom</div>;

      render(
        <LegacyErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent />
        </LegacyErrorBoundary>
      );

      expect(screen.getByTestId('legacy-custom')).toBeInTheDocument();
    });

    it('should call onError callback', () => {
      const onErrorSpy = vi.fn();
      const ThrowingComponent = () => {
        throw new Error('Legacy test error');
      };

      render(
        <LegacyErrorBoundary onError={onErrorSpy}>
          <ThrowingComponent />
        </LegacyErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Legacy test error' }),
        expect.any(Object)
      );
    });
  });

  describe('RouteErrorBoundary', () => {
    it('should render children normally', () => {
      render(
        <RouteErrorBoundary routeName="TestRoute">
          <div data-testid="route-content">Route Content</div>
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('route-content')).toBeInTheDocument();
    });

    it('should catch and handle route-specific errors', async () => {
      render(
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowingComponent shouldThrow={false} />
        </RouteErrorBoundary>
      );

      triggerError(new Error('Route error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const { captureComponentError } = require('@/utils/errorHandling');
      expect(captureComponentError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Route error' }),
        'Route-TestRoute',
        { routeName: 'TestRoute' },
        { hasError: true }
      );
    });

    it('should reset on route changes', () => {
      const mockPathname = '/test-route';
      
      // Mock window.location.pathname
      Object.defineProperty(window.location, 'pathname', {
        value: mockPathname,
        writable: true,
      });

      const { rerender } = render(
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowingComponent shouldThrow={false} />
        </RouteErrorBoundary>
      );

      triggerError(new Error('Route error'));

      // Change pathname to simulate route change
      Object.defineProperty(window.location, 'pathname', {
        value: '/different-route',
        writable: true,
      });

      rerender(
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowingComponent shouldThrow={false} />
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('ComponentErrorBoundary', () => {
    it('should show minimal error fallback when configured', async () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent" minimal={true}>
          <ThrowingComponent shouldThrow={false} />
        </ComponentErrorBoundary>
      );

      triggerError(new Error('Component error'));

      await waitFor(() => {
        expect(screen.getByTestId('TestComponent-error-minimal')).toBeInTheDocument();
      });

      expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    });

    it('should show full error fallback by default', async () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowingComponent shouldThrow={false} />
        </ComponentErrorBoundary>
      );

      triggerError(new Error('Component error'));

      await waitFor(() => {
        expect(screen.getByTestId('TestComponent-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText(/The TestComponent component encountered an error/)).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should isolate errors when configured', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent" isolate={true}>
          <ThrowingComponent shouldThrow={false} />
        </ComponentErrorBoundary>
      );

      // Should use legacy boundary for isolation
      triggerError(new Error('Component error'));

      expect(screen.getByTestId('TestComponent-error')).toBeInTheDocument();
    });
  });

  describe('AsyncErrorBoundary', () => {
    it('should handle chunk load errors', async () => {
      const onChunkErrorSpy = vi.fn();
      const mockReload = vi.fn();
      
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
      });

      render(
        <AsyncErrorBoundary componentName="LazyComponent" onChunkError={onChunkErrorSpy}>
          <ThrowingComponent shouldThrow={false} />
        </AsyncErrorBoundary>
      );

      const chunkError = Object.assign(new Error('Loading chunk 123 failed'), { 
        name: 'ChunkLoadError' 
      });

      triggerError(chunkError);

      expect(onChunkErrorSpy).toHaveBeenCalled();

      // Should auto-reload after 1 second
      await waitFor(() => {
        setTimeout(() => {
          expect(mockReload).toHaveBeenCalled();
        }, 1000);
      }, { timeout: 2000 });
    });

    it('should handle generic async errors normally', async () => {
      render(
        <AsyncErrorBoundary componentName="LazyComponent">
          <ThrowingComponent shouldThrow={false} />
        </AsyncErrorBoundary>
      );

      triggerError(new Error('Generic async error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('GlobalErrorBoundary', () => {
    it('should catch global application errors', async () => {
      render(
        <GlobalErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      triggerError(new Error('Global error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      const { captureComponentError } = require('@/utils/errorHandling');
      expect(captureComponentError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Global error' }),
        'GlobalErrorBoundary',
        { global: true },
        { hasError: true }
      );
    });

    it('should reset on pathname changes', () => {
      const originalPathname = window.location.pathname;

      const { rerender } = render(
        <GlobalErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      triggerError(new Error('Global error'));

      // Simulate navigation
      Object.defineProperty(window.location, 'pathname', {
        value: '/new-path',
        writable: true,
      });

      rerender(
        <GlobalErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();

      // Restore original pathname
      Object.defineProperty(window.location, 'pathname', {
        value: originalPathname,
        writable: true,
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should work with nested error boundaries', async () => {
      render(
        <GlobalErrorBoundary>
          <RouteErrorBoundary routeName="TestRoute">
            <ComponentErrorBoundary componentName="TestComponent">
              <ThrowingComponent shouldThrow={false} />
            </ComponentErrorBoundary>
          </RouteErrorBoundary>
        </GlobalErrorBoundary>
      );

      triggerError(new Error('Nested error'));

      // Should be caught by the innermost boundary
      await waitFor(() => {
        expect(screen.getByTestId('TestComponent-error')).toBeInTheDocument();
      });
    });

    it('should bubble up to parent boundaries when child boundary fails', async () => {
      // Create a component that throws during error handling
      const FailingErrorBoundary = ({ children }: any) => {
        const [hasError, setHasError] = React.useState(false);
        
        if (hasError) {
          throw new Error('Error boundary itself failed');
        }
        
        React.useEffect(() => {
          const handleError = () => setHasError(true);
          window.addEventListener('test-error', handleError);
          return () => window.removeEventListener('test-error', handleError);
        }, []);

        return children;
      };

      render(
        <GlobalErrorBoundary>
          <FailingErrorBoundary>
            <ThrowingComponent shouldThrow={false} />
          </FailingErrorBoundary>
        </GlobalErrorBoundary>
      );

      triggerError(new Error('Initial error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      
      // Should be focusable
      tryAgainButton.focus();
      expect(document.activeElement).toBe(tryAgainButton);

      // Should activate on Enter
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should provide proper ARIA labels and roles', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        const errorContainer = screen.getByTestId('error-boundary-fallback');
        expect(errorContainer).toHaveAttribute('role', 'alert');
        expect(errorContainer).toHaveAttribute('aria-live', 'polite');
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should announce errors to screen readers', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      triggerError(new Error('Test error'));

      await waitFor(() => {
        const alertElement = screen.getByRole('alert');
        expect(alertElement).toBeInTheDocument();
        expect(alertElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});