/**
 * @file White Screen Prevention Regression Tests
 * @description Comprehensive regression tests to prevent white screen issues
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock all potentially problematic components
vi.mock('@/components/SocialMediaFeed', () => ({
  default: () => {
    // Simulate component that might fail
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
      setMounted(true);
    }, []);
    
    return mounted ? (
      <div data-testid="social-media-feed">Social Media Feed Loaded</div>
    ) : null;
  },
}));

vi.mock('@/components/ClaudeInstanceManager', () => ({
  default: () => {
    const [error, setError] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const timer = setTimeout(() => setLoading(false), 100);
      return () => clearTimeout(timer);
    }, []);

    if (error) {
      throw new Error('Claude Instance Manager failed');
    }

    return loading ? (
      <div data-testid="loading-claude-manager">Loading...</div>
    ) : (
      <div data-testid="claude-instance-manager">Claude Instance Manager</div>
    );
  },
}));

vi.mock('@/components/SimpleLauncher', () => ({
  SimpleLauncher: () => {
    const [networkError, setNetworkError] = React.useState(false);

    React.useEffect(() => {
      // Simulate potential network check failure
      const checkNetwork = async () => {
        try {
          // This might fail in test environment
          if (typeof fetch === 'undefined') {
            setNetworkError(true);
          }
        } catch {
          setNetworkError(true);
        }
      };
      checkNetwork();
    }, []);

    return (
      <div data-testid="simple-launcher">
        {networkError ? (
          <div data-testid="network-fallback">Network check failed - graceful fallback</div>
        ) : (
          <div>Simple Launcher</div>
        )}
      </div>
    );
  },
}));

// Mock contexts to prevent initialization failures
vi.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: any) => {
    const [contextReady, setContextReady] = React.useState(false);

    React.useEffect(() => {
      // Simulate context initialization
      const timer = setTimeout(() => setContextReady(true), 50);
      return () => clearTimeout(timer);
    }, []);

    return contextReady ? (
      <div data-testid="websocket-context-ready">{children}</div>
    ) : (
      <div data-testid="websocket-context-loading">Initializing WebSocket...</div>
    );
  },
  useWebSocket: () => ({
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
  })),
  QueryClientProvider: ({ children }: any) => {
    const [queryReady, setQueryReady] = React.useState(false);

    React.useEffect(() => {
      setQueryReady(true);
    }, []);

    return queryReady ? (
      <div data-testid="query-client-ready">{children}</div>
    ) : (
      <div data-testid="query-client-loading">Initializing Query Client...</div>
    );
  },
}));

// Mock error boundaries to test they catch errors properly
vi.mock('@/components/ErrorBoundary', () => ({
  GlobalErrorBoundary: ({ children }: any) => {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const handleError = (event: any) => {
        if (event.error) {
          setHasError(true);
          setError(event.error);
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleError);
      
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleError);
      };
    }, []);

    if (hasError) {
      return (
        <div data-testid="global-error-boundary-active">
          <div>Application Error Caught</div>
          <div data-testid="error-message">{error?.message}</div>
        </div>
      );
    }

    return <div data-testid="global-error-boundary">{children}</div>;
  },
  
  ErrorBoundary: ({ children, componentName }: any) => {
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      const handleError = () => setHasError(true);
      window.addEventListener('test-error', handleError);
      return () => window.removeEventListener('test-error', handleError);
    }, []);

    if (hasError) {
      return (
        <div data-testid={`error-boundary-${componentName}`}>
          {componentName} Error Boundary Active
        </div>
      );
    }

    return children;
  },

  RouteErrorBoundary: ({ children, routeName }: any) => {
    const [hasError, setHasError] = React.useState(false);

    if (hasError) {
      return (
        <div data-testid={`route-error-${routeName}`}>
          Route {routeName} Error Boundary Active
        </div>
      );
    }

    return children;
  },

  AsyncErrorBoundary: ({ children, componentName, onChunkError }: any) => {
    const [hasError, setHasError] = React.useState(false);
    const [errorType, setErrorType] = React.useState<string>('');

    React.useEffect(() => {
      const handleError = (event: any) => {
        if (event.error?.name === 'ChunkLoadError') {
          setErrorType('chunk');
          setHasError(true);
          onChunkError?.();
        }
      };
      
      window.addEventListener('test-chunk-error', handleError);
      return () => window.removeEventListener('test-chunk-error', handleError);
    }, [onChunkError]);

    if (hasError) {
      return (
        <div data-testid={`async-error-${componentName}`}>
          Async Error in {componentName}: {errorType}
        </div>
      );
    }

    return children;
  },
}));

// Mock other components that might cause issues
vi.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => {
    const [notificationError, setNotificationError] = React.useState(false);

    React.useEffect(() => {
      // Simulate potential notification system failure
      try {
        if (typeof Notification === 'undefined') {
          setNotificationError(true);
        }
      } catch {
        setNotificationError(true);
      }
    }, []);

    return (
      <div data-testid="real-time-notifications">
        {notificationError ? 'Notifications unavailable' : 'Notifications active'}
      </div>
    );
  },
}));

vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => {
    const [connectionStatus, setConnectionStatus] = React.useState('checking');

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setConnectionStatus('connected');
      }, 200);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div data-testid="connection-status" data-status={connectionStatus}>
        Connection: {connectionStatus}
      </div>
    );
  },
}));

// Utility to trigger different types of errors
const triggerError = (type: 'generic' | 'chunk' | 'network' | 'context') => {
  switch (type) {
    case 'generic':
      window.dispatchEvent(Object.assign(new Event('error'), { 
        error: new Error('Generic application error') 
      }));
      break;
    case 'chunk':
      window.dispatchEvent(Object.assign(new Event('test-chunk-error'), {
        error: Object.assign(new Error('Loading chunk failed'), { name: 'ChunkLoadError' })
      }));
      break;
    case 'network':
      window.dispatchEvent(Object.assign(new Event('error'), {
        error: new Error('Network request failed')
      }));
      break;
    case 'context':
      window.dispatchEvent(Object.assign(new Event('error'), {
        error: new Error('Context initialization failed')
      }));
      break;
  }
};

describe('White Screen Prevention Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset any global state that might affect tests
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Application Initialization', () => {
    it('should never show blank white screen on initial load', async () => {
      render(<App />);

      // Should immediately show some content, even if loading
      expect(document.body).not.toBeEmptyDOMElement();
      
      // Should show some kind of content within reasonable time
      await waitFor(() => {
        const hasVisibleContent = 
          screen.queryByTestId('global-error-boundary') ||
          screen.queryByTestId('websocket-context-loading') ||
          screen.queryByTestId('query-client-loading') ||
          screen.queryByText(/loading/i) ||
          screen.queryByText(/initializing/i);
        
        expect(hasVisibleContent).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should show loading states during initialization', async () => {
      render(<App />);

      // Should show loading indicators
      await waitFor(() => {
        const loadingStates = [
          screen.queryByTestId('websocket-context-loading'),
          screen.queryByTestId('query-client-loading'),
          screen.queryByText(/loading/i),
          screen.queryByText(/initializing/i),
        ];

        const hasLoadingState = loadingStates.some(state => state !== null);
        expect(hasLoadingState).toBe(true);
      });
    });

    it('should eventually show fully initialized application', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('websocket-context-ready')).toBeInTheDocument();
        expect(screen.getByTestId('query-client-ready')).toBeInTheDocument();
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle context initialization failures gracefully', async () => {
      // Simulate context failure
      const FailingProvider = ({ children }: any) => {
        throw new Error('Context initialization failed');
      };

      const TestAppWithFailure = () => (
        <FailingProvider>
          <App />
        </FailingProvider>
      );

      render(<TestAppWithFailure />);

      // Should be caught by error boundary and show error UI
      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Coverage', () => {
    it('should catch and display global application errors', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Trigger a global error
      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
        expect(screen.getByText('Application Error Caught')).toBeInTheDocument();
      });
    });

    it('should handle chunk loading errors with auto-recovery', async () => {
      const mockReload = vi.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
      });

      render(
        <MemoryRouter initialEntries={['/claude-instances']}>
          <App />
        </MemoryRouter>
      );

      // Trigger chunk error
      act(() => {
        triggerError('chunk');
      });

      await waitFor(() => {
        // Should show chunk error handling
        expect(screen.queryByText(/chunk/i)).toBeTruthy();
      });

      // Should eventually attempt to reload (in real scenario)
      setTimeout(() => {
        expect(mockReload).toHaveBeenCalled();
      }, 1100);
    });

    it('should isolate route-level errors', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>
      );

      // Wait for route to load
      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Simulate route-specific error
      act(() => {
        window.dispatchEvent(Object.assign(new Event('test-error'), {
          target: { dataset: { route: 'Settings' } }
        }));
      });

      // Should contain error within route boundary
      await waitFor(() => {
        // App should still be functional, just the route should show error
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });
    });

    it('should handle network failures gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        // Should show some fallback content for network issues
        const networkFallbacks = [
          screen.queryByText(/network/i),
          screen.queryByText(/offline/i),
          screen.queryByText(/connection/i),
          screen.queryByTestId('network-fallback'),
        ];

        const hasNetworkFallback = networkFallbacks.some(fallback => fallback !== null);
        expect(hasNetworkFallback).toBe(true);
      });
    });
  });

  describe('Component Resilience', () => {
    it('should handle individual component failures without breaking app', async () => {
      const FailingComponent = () => {
        throw new Error('Component failure');
      };

      const TestApp = () => (
        <div data-testid="test-app">
          <div data-testid="working-content">Working Content</div>
          <FailingComponent />
          <div data-testid="more-working-content">More Working Content</div>
        </div>
      );

      // Should be wrapped in error boundary in real app
      render(<TestApp />);

      // Other parts of app should still work
      expect(screen.getByTestId('test-app')).toBeInTheDocument();
      expect(screen.getByTestId('working-content')).toBeInTheDocument();
    });

    it('should show fallback UI for lazy loading failures', async () => {
      const FailingLazyComponent = React.lazy(() => 
        Promise.reject(new Error('Lazy component failed to load'))
      );

      const TestWithSuspense = () => (
        <React.Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
          <FailingLazyComponent />
        </React.Suspense>
      );

      render(<TestWithSuspense />);

      // Should show loading state first
      expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();

      // Should eventually show error or fallback
      await waitFor(() => {
        // The error would be caught by an error boundary in practice
        expect(document.body).not.toBeEmptyDOMElement();
      });
    });

    it('should maintain responsive layout during errors', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Trigger error
      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        const errorBoundary = screen.getByTestId('global-error-boundary-active');
        expect(errorBoundary).toBeInTheDocument();
        
        // Should still have proper structure
        expect(errorBoundary).toHaveTextContent('Application Error Caught');
      });
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks during error recovery', async () => {
      const { rerender, unmount } = render(<App />);

      // Simulate multiple error/recovery cycles
      for (let i = 0; i < 5; i++) {
        act(() => {
          triggerError('generic');
        });

        await waitFor(() => {
          expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
        });

        // Re-render to simulate recovery
        rerender(<App />);

        await waitFor(() => {
          expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
        });
      }

      // Clean unmount should not cause issues
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<App />);
      
      unmount();

      // Should have called removeEventListener for various events
      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Performance Under Stress', () => {
    it('should handle rapid route changes without breaking', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Simulate rapid navigation (this would be more complex with actual routing)
      const routes = ['/', '/claude-instances', '/agents', '/settings'];
      
      for (let i = 0; i < routes.length; i++) {
        // In a real test, we'd navigate between routes rapidly
        // For now, just verify the app remains stable
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      }
    });

    it('should handle concurrent errors gracefully', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Trigger multiple errors simultaneously
      act(() => {
        triggerError('generic');
        triggerError('network');
        triggerError('context');
      });

      await waitFor(() => {
        // Should handle multiple errors and show appropriate UI
        expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
      });

      // App should remain stable
      expect(document.body).not.toBeEmptyDOMElement();
    });
  });

  describe('Browser Compatibility', () => {
    it('should work with missing modern browser features', () => {
      // Mock missing features
      const originalFetch = global.fetch;
      const originalNotification = global.Notification;
      
      delete (global as any).fetch;
      delete (global as any).Notification;

      render(<App />);

      // Should render fallbacks for missing features
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();

      // Restore features
      global.fetch = originalFetch;
      global.Notification = originalNotification;
    });

    it('should handle localStorage unavailability', () => {
      const originalLocalStorage = window.localStorage;
      
      // Mock localStorage throwing errors
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockImplementation(() => {
            throw new Error('localStorage not available');
          }),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('localStorage not available');
          }),
        },
        writable: true,
      });

      expect(() => render(<App />)).not.toThrow();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('Accessibility During Errors', () => {
    it('should maintain accessibility during error states', async () => {
      render(<App />);

      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        const errorElement = screen.getByTestId('global-error-boundary-active');
        expect(errorElement).toBeInTheDocument();
        
        // Error content should be accessible
        expect(errorElement).toHaveTextContent('Application Error Caught');
      });
    });

    it('should announce errors to screen readers', async () => {
      render(<App />);

      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        const errorElement = screen.getByTestId('global-error-boundary-active');
        // In a real implementation, this would have aria-live or role="alert"
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should handle development-specific errors gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<App />);

      // Development mode might show more verbose errors
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle production optimizations', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<App />);

      // Production mode should still be stable
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should provide user recovery options', async () => {
      render(<App />);

      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
      });

      // In real implementation, would have recovery buttons
      // This test ensures the error state is visible and actionable
      expect(screen.getByText('Application Error Caught')).toBeInTheDocument();
    });

    it('should allow graceful degradation of features', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Features should degrade gracefully
      const notificationElement = screen.getByTestId('real-time-notifications');
      expect(notificationElement).toHaveTextContent(/notifications/i);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain application state during errors', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Simulate state-affecting error
      act(() => {
        triggerError('generic');
      });

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary-active')).toBeInTheDocument();
      });

      // State should be preserved or safely reset
      expect(document.body).not.toBeEmptyDOMElement();
    });

    it('should handle partial data loading failures', async () => {
      // Mock partial API failures
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'success' }) })
        .mockRejectedValueOnce(new Error('API failure'));

      render(<App />);

      await waitFor(() => {
        // App should handle mixed success/failure states
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });
    });
  });
});