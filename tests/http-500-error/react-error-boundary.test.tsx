/**
 * React Error Boundary Tests for HTTP 500 Response Handling
 * Tests error boundaries and component error handling for server errors
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Mock fetch to simulate server errors
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock SimpleLauncher component for testing
const MockSimpleLauncher = () => {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleApiCall = async (endpoint: string, method: string = 'GET') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/claude${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Operation failed');
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="simple-launcher">
      {error && (
        <div data-testid="error-display" className="error-message">
          Error: {error}
        </div>
      )}
      
      <button
        data-testid="launch-button"
        disabled={loading}
        onClick={() => handleApiCall('/launch', 'POST')}
      >
        {loading ? 'Loading...' : 'Launch'}
      </button>
      
      <button
        data-testid="stop-button"
        disabled={loading}
        onClick={() => handleApiCall('/stop', 'POST')}
      >
        {loading ? 'Loading...' : 'Stop'}
      </button>
      
      <button
        data-testid="check-button"
        disabled={loading}
        onClick={() => handleApiCall('/check')}
      >
        {loading ? 'Loading...' : 'Check'}
      </button>
      
      <button
        data-testid="status-button"
        disabled={loading}
        onClick={() => handleApiCall('/status')}
      >
        {loading ? 'Loading...' : 'Status'}
      </button>
    </div>
  );
};

// Error Boundary component for testing
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong</h2>
          <p data-testid="error-message">{this.state.errorInfo}</p>
          <button
            data-testid="retry-button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

describe('React Error Boundary Tests for HTTP 500 Errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('HTTP 500 Error Response Handling', () => {
    test('should handle 500 error from launch endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: 'Failed to spawn process',
          message: 'Process launch failed'
        })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      const launchButton = screen.getByTestId('launch-button');
      fireEvent.click(launchButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-display')).toHaveTextContent(
        'HTTP 500: Internal Server Error'
      );
    });

    test('should handle 500 error from stop endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: 'Process kill failed',
          message: 'Unable to terminate process'
        })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('stop-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'HTTP 500: Internal Server Error'
        );
      });
    });

    test('should handle 500 error from check endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: 'Claude CLI detection failed'
        })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('check-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'HTTP 500: Internal Server Error'
        );
      });
    });

    test('should handle 500 error from status endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: 'Status check failed'
        })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('status-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'HTTP 500: Internal Server Error'
        );
      });
    });
  });

  describe('Network and Parse Error Handling', () => {
    test('should handle network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('launch-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'Network error'
        );
      });
    });

    test('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('launch-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'HTTP 500: Internal Server Error'
        );
      });
    });

    test('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 1000);
        })
      );

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('launch-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent(
          'Request timeout'
        );
      }, { timeout: 2000 });
    });
  });

  describe('Error Boundary Integration', () => {
    test('should catch unhandled component errors', async () => {
      const ThrowingComponent = () => {
        throw new Error('Component error');
      };

      render(
        <TestErrorBoundary>
          <ThrowingComponent />
        </TestErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Component error');
    });

    test('should allow error recovery through retry button', async () => {
      let shouldThrow = true;
      
      const ConditionalThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div data-testid="success">Component loaded successfully</div>;
      };

      render(
        <TestErrorBoundary>
          <ConditionalThrowingComponent />
        </TestErrorBoundary>
      );

      // Should show error boundary
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

      // Fix the condition and retry
      shouldThrow = false;
      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success')).toBeInTheDocument();
      });
    });

    test('should handle async errors in components', async () => {
      const AsyncErrorComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          const throwAsyncError = async () => {
            try {
              throw new Error('Async component error');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unknown error');
            }
          };
          
          throwAsyncError();
        }, []);

        if (error) {
          throw new Error(error);
        }

        return <div>Component content</div>;
      };

      render(
        <TestErrorBoundary>
          <AsyncErrorComponent />
        </TestErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Async component error'
        );
      });
    });
  });

  describe('Loading States and UI Consistency', () => {
    test('should show loading state during API calls', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('launch-button'));

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();

      // Resolve with error
      act(() => {
        resolvePromise!({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ success: false, error: 'Server error' })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Launch')).toBeInTheDocument();
        expect(screen.getByTestId('launch-button')).not.toBeDisabled();
      });
    });

    test('should clear previous errors on new requests', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ success: false, error: 'First error' })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('launch-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent('First error');
      });

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Success' })
      });

      fireEvent.click(screen.getByTestId('launch-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
      });
    });
  });

  describe('Specific Error Type Handling', () => {
    const errorScenarios = [
      {
        name: 'Process spawn failure',
        error: { success: false, error: 'Failed to spawn process' },
        expectedText: 'Failed to spawn process'
      },
      {
        name: 'Permission denied',
        error: { success: false, error: 'EACCES: permission denied' },
        expectedText: 'EACCES: permission denied'
      },
      {
        name: 'File not found',
        error: { success: false, error: 'ENOENT: no such file or directory' },
        expectedText: 'ENOENT: no such file or directory'
      },
      {
        name: 'Resource exhaustion',
        error: { success: false, error: 'EMFILE: too many open files' },
        expectedText: 'EMFILE: too many open files'
      },
      {
        name: 'Process kill failure',
        error: { success: false, error: 'ESRCH: No such process' },
        expectedText: 'ESRCH: No such process'
      }
    ];

    errorScenarios.forEach(scenario => {
      test(`should handle ${scenario.name} appropriately`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => scenario.error
        });

        render(
          <TestErrorBoundary>
            <MockSimpleLauncher />
          </TestErrorBoundary>
        );

        fireEvent.click(screen.getByTestId('launch-button'));

        await waitFor(() => {
          expect(screen.getByTestId('error-display')).toHaveTextContent(
            'HTTP 500: Internal Server Error'
          );
        });
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent requests gracefully', async () => {
      let requestCount = 0;
      mockFetch.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({
            success: false,
            error: `Concurrent error ${requestCount}`
          })
        });
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      // Fire multiple requests rapidly
      fireEvent.click(screen.getByTestId('launch-button'));
      fireEvent.click(screen.getByTestId('stop-button'));
      fireEvent.click(screen.getByTestId('check-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });

      // Should handle the errors without crashing
      expect(screen.getByTestId('simple-launcher')).toBeInTheDocument();
    });

    test('should maintain component state consistency during errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ success: false, error: 'Server error' })
      });

      render(
        <TestErrorBoundary>
          <MockSimpleLauncher />
        </TestErrorBoundary>
      );

      // Verify initial state
      expect(screen.getByTestId('launch-button')).not.toBeDisabled();

      // Trigger error
      fireEvent.click(screen.getByTestId('launch-button'));

      // Should show loading, then error, then return to normal state
      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByTestId('launch-button')).not.toBeDisabled();
      });
    });
  });
});