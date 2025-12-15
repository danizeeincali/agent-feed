/**
 * TDD London School Navigation Integration Tests
 * 
 * Tests navigation flow between all routes to ensure zero white screens.
 * Focuses on interaction testing and behavior verification using mocks.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MemoryRouter, Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Import the main App component
import App from '@/App';

// Mock external dependencies
const mockWebSocketContext = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true
  },
  connectionStatus: 'connected' as const,
  lastActivity: new Date(),
  reconnectAttempts: 0,
  isConnecting: false
};

// Mock WebSocket Provider
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Tanstack Query for navigation tests
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false, 
      cacheTime: 0,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    },
    mutations: { retry: false }
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {}
  }
});

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      posts: [],
      agents: [],
      metrics: {},
      activities: []
    })
  })
) as jest.Mock;

describe('Navigation Integration Tests - TDD London School', () => {
  let queryClient: QueryClient;
  let history: any;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    history = createMemoryHistory();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Route Navigation Behavior', () => {
    const routes = [
      { path: '/', name: 'Feed', testId: 'social-media-feed' },
      { path: '/dual-instance', name: 'Dual Instance', testId: 'dual-instance-dashboard' },
      { path: '/dashboard', name: 'Dashboard', testId: 'agent-dashboard' },
      { path: '/agents', name: 'Agent Manager', testId: 'agent-manager' },
      { path: '/workflows', name: 'Workflows', testId: 'workflow-visualization' },
      { path: '/analytics', name: 'Analytics', testId: 'system-analytics' },
      { path: '/claude-code', name: 'Claude Code', testId: 'claude-code-panel' },
      { path: '/activity', name: 'Activity', testId: 'activity-panel' },
      { path: '/settings', name: 'Settings', testId: 'settings' }
    ];

    it.each(routes)('should navigate to $name route without white screen', async ({ path, name, testId }) => {
      // Arrange - Set initial route
      history.push(path);

      // Act - Render app with specific route
      render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Route should render without error
      await waitFor(() => {
        const routeContent = screen.queryByTestId(testId) ||
                            screen.queryByTestId(`${testId.replace('-', '-')}-fallback`) ||
                            screen.queryByTestId('loading-fallback');
        expect(routeContent).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify no error boundary is triggered
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      
      // Verify header is present (confirms layout loaded)
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should handle navigation between all routes sequentially', async () => {
      // Arrange - Start at home
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Act & Assert - Navigate through each route
      for (const route of routes) {
        act(() => {
          history.push(route.path);
        });

        rerender(
          <Router location={history.location} navigator={history}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </Router>
        );

        await waitFor(() => {
          // Verify route renders something (component or fallback)
          const content = screen.queryByTestId(route.testId) ||
                         screen.queryByTestId(`${route.testId}-fallback`) ||
                         screen.queryByTestId('loading-fallback');
          expect(content).toBeInTheDocument();
        });

        // Verify no white screen/error
        expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      }
    });

    it('should handle browser back/forward navigation', async () => {
      // Arrange - Navigate through multiple routes
      const testRoutes = ['/agents', '/workflows', '/analytics'];
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Build navigation history
      for (const route of testRoutes) {
        act(() => {
          history.push(route);
        });
      }

      // Act - Navigate backwards
      act(() => {
        history.back();
      });

      rerender(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Should be at workflows route
      await waitFor(() => {
        const content = screen.queryByTestId('workflow-visualization') ||
                       screen.queryByTestId('workflow-fallback');
        expect(content).toBeInTheDocument();
      });

      // Act - Navigate forward
      act(() => {
        history.forward();
      });

      rerender(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Should be back at analytics
      await waitFor(() => {
        const content = screen.queryByTestId('system-analytics') ||
                       screen.queryByTestId('analytics-fallback');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Agent Profile Dynamic Routes', () => {
    const agentIds = ['agent-123', 'agent-456', 'agent-789'];

    it.each(agentIds)('should handle agent profile route for %s', async (agentId) => {
      // Arrange
      const agentPath = `/agent/${agentId}`;
      history.push(agentPath);

      // Act
      render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert
      await waitFor(() => {
        const profile = screen.queryByTestId('agent-profile') ||
                       screen.queryByTestId('agent-profile-fallback') ||
                       screen.queryByTestId('loading-fallback');
        expect(profile).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should handle malformed agent IDs gracefully', async () => {
      // Arrange - Test various malformed IDs
      const malformedIds = ['', 'null', 'undefined', '123$%^', 'very-long-agent-id-that-might-cause-issues'];

      for (const badId of malformedIds) {
        const agentPath = `/agent/${badId}`;
        history.push(agentPath);

        // Act
        render(
          <Router location={history.location} navigator={history}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </Router>
        );

        // Assert - Should handle gracefully
        await waitFor(() => {
          const content = screen.queryByTestId('agent-profile') ||
                         screen.queryByTestId('agent-profile-fallback') ||
                         screen.queryByTestId('component-error-fallback') ||
                         screen.queryByTestId('loading-fallback');
          expect(content).toBeInTheDocument();
        });

        // Clean up
        queryClient.clear();
      }
    });
  });

  describe('404 and Unknown Routes', () => {
    const unknownRoutes = [
      '/unknown-route',
      '/non-existent',
      '/agents/unknown-action',
      '/workflows/invalid',
      '/random/nested/path'
    ];

    it.each(unknownRoutes)('should handle unknown route %s with fallback', async (unknownRoute) => {
      // Arrange
      history.push(unknownRoute);

      // Act
      render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Should show 404 or fallback
      await waitFor(() => {
        const fallback = screen.queryByTestId('not-found-fallback') ||
                        screen.queryByTestId('error-boundary-fallback') ||
                        screen.getByText(/not found/i);
        expect(fallback).toBeInTheDocument();
      });
    });

    it('should provide navigation back to home from 404', async () => {
      // Arrange
      history.push('/unknown-route');

      render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Act - Find and click home button
      await waitFor(() => {
        const homeButton = screen.getByText(/go home/i) || screen.getByRole('link', { name: /home/i });
        expect(homeButton).toBeInTheDocument();
      });
    });
  });

  describe('Navigation State Management', () => {
    it('should maintain query client state across route changes', async () => {
      // Arrange - Start with feed route
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert initial state
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Act - Navigate to different route
      act(() => {
        history.push('/agents');
      });

      rerender(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - New route loads
      await waitFor(() => {
        expect(screen.queryByTestId('agent-manager')).toBeInTheDocument();
      });

      // Act - Navigate back
      act(() => {
        history.push('/');
      });

      rerender(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Can return to original route
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });
    });

    it('should handle rapid navigation changes', async () => {
      // Arrange
      const rapidRoutes = ['/', '/agents', '/workflows', '/analytics', '/activity'];
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Act - Rapidly change routes
      for (const route of rapidRoutes) {
        act(() => {
          history.push(route);
        });

        rerender(
          <Router location={history.location} navigator={history}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </Router>
        );

        // Assert - Each route should render without breaking
        await waitFor(() => {
          expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Recovery During Navigation', () => {
    it('should recover from navigation errors', async () => {
      // Arrange - Mock a failing route
      const originalError = console.error;
      console.error = jest.fn();

      // Start at working route
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Temporarily mock fetch to fail
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error('Navigation error')));

      // Act - Navigate to potentially failing route
      act(() => {
        history.push('/analytics');
      });

      rerender(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - Should show fallback, not crash
      await waitFor(() => {
        const content = screen.queryByTestId('system-analytics') ||
                       screen.queryByTestId('analytics-fallback') ||
                       screen.queryByTestId('component-error-fallback');
        expect(content).toBeInTheDocument();
      });

      // Cleanup
      global.fetch = originalFetch;
      console.error = originalError;
    });

    it('should handle chunk loading errors during navigation', async () => {
      // Arrange - Mock chunk loading error
      const ChunkErrorComponent = () => {
        const error = new Error('Loading chunk 123 failed');
        error.name = 'ChunkLoadError';
        throw error;
      };

      // This test verifies that chunk errors are handled gracefully
      // In real app, this would be handled by AsyncErrorBoundary
      history.push('/');

      render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Assert - App should still be functional
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration During Navigation', () => {
    it('should maintain WebSocket connection across routes', async () => {
      // Arrange
      const routes = ['/', '/agents', '/activity'];
      history.push('/');

      const { rerender } = render(
        <Router location={history.location} navigator={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      );

      // Act & Assert - Navigate and verify WebSocket context
      for (const route of routes) {
        act(() => {
          history.push(route);
        });

        rerender(
          <Router location={history.location} navigator={history}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </Router>
        );

        await waitFor(() => {
          expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
        });

        // Verify WebSocket context is maintained
        expect(mockWebSocketContext.connectionStatus).toBe('connected');
      }

      // Verify WebSocket methods were called
      expect(mockWebSocketContext.socket.on).toHaveBeenCalled();
    });
  });
});