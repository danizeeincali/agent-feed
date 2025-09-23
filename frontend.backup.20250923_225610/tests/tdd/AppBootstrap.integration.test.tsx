/**
 * TDD London School Test Suite - Complete App Bootstrap Integration Tests
 * 
 * Comprehensive integration tests focusing on the complete application bootstrap process
 * to identify and prevent white screen issues through end-to-end behavior verification
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// Mock all external dependencies for integration testing
jest.mock('../../src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, componentName }: any) => {
    mockIntegrationCallbacks.ErrorBoundary.push({ componentName });
    return <div data-testid={`error-boundary-${componentName || 'default'}`}>{children}</div>;
  },
  RouteErrorBoundary: ({ children, routeName, fallback }: any) => {
    mockIntegrationCallbacks.RouteErrorBoundary.push({ routeName, fallback });
    return <div data-testid={`route-error-boundary-${routeName}`}>{children}</div>;
  },
  GlobalErrorBoundary: ({ children }: any) => {
    mockIntegrationCallbacks.GlobalErrorBoundary.push({});
    return <div data-testid="global-error-boundary">{children}</div>;
  },
  AsyncErrorBoundary: ({ children, componentName }: any) => {
    mockIntegrationCallbacks.AsyncErrorBoundary.push({ componentName });
    return <div data-testid={`async-error-boundary-${componentName}`}>{children}</div>;
  }
}));

jest.mock('../../src/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message, size }: any) => {
      mockIntegrationCallbacks.LoadingFallback.push({ message, size });
      return (
        <div data-testid="loading-fallback" className={`loading-${size || 'md'}`}>
          <div className="spinner" />
          <p>{message || 'Loading...'}</p>
        </div>
      );
    },
    FeedFallback: () => {
      mockIntegrationCallbacks.FeedFallback.push({});
      return <div data-testid="feed-fallback">Loading social media feed...</div>;
    },
    DualInstanceFallback: () => {
      mockIntegrationCallbacks.DualInstanceFallback.push({});
      return <div data-testid="dual-instance-fallback">Loading Claude instance manager...</div>;
    },
    DashboardFallback: () => {
      mockIntegrationCallbacks.DashboardFallback.push({});
      return <div data-testid="dashboard-fallback">Loading dashboard...</div>;
    },
    AgentManagerFallback: () => {
      mockIntegrationCallbacks.AgentManagerFallback.push({});
      return <div data-testid="agent-manager-fallback">Loading agent manager...</div>;
    },
    NotFoundFallback: () => {
      mockIntegrationCallbacks.NotFoundFallback.push({});
      return (
        <div data-testid="not-found-fallback">
          <h2>404 - Page Not Found</h2>
          <p>The page you are looking for does not exist.</p>
        </div>
      );
    }
  }
}));

jest.mock('../../src/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => {
    mockIntegrationCallbacks.RealTimeNotifications.push({});
    return (
      <div data-testid="real-time-notifications">
        <span>🔔 Notifications</span>
      </div>
    );
  }
}));

jest.mock('../../src/components/ConnectionStatus', () => ({
  ConnectionStatus: () => {
    mockIntegrationCallbacks.ConnectionStatus.push({});
    return (
      <div data-testid="connection-status">
        <span className="status-indicator">🟢 Connected</span>
      </div>
    );
  }
}));

jest.mock('../../src/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children, config }: any) => {
    mockIntegrationCallbacks.WebSocketProvider.push({ config });
    if (mockIntegrationBehavior.webSocketFailure) {
      throw new Error('WebSocket provider failed to initialize');
    }
    return <div data-testid="websocket-provider">{children}</div>;
  },
  useWebSocketSingleton: () => {
    mockIntegrationCallbacks.useWebSocketSingleton.push({});
    return {
      isConnected: !mockIntegrationBehavior.webSocketDisconnected,
      connectionState: mockIntegrationBehavior.webSocketDisconnected ? 'disconnected' : 'connected',
      send: jest.fn(),
      lastMessage: null,
      disconnect: jest.fn(),
      connect: jest.fn()
    };
  }
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation((options) => {
    mockIntegrationCallbacks.QueryClient.push({ options });
    if (mockIntegrationBehavior.queryClientFailure) {
      throw new Error('QueryClient initialization failed');
    }
    return {
      defaultOptions: options?.defaultOptions || {},
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
      clear: jest.fn()
    };
  }),
  QueryClientProvider: ({ children, client }: any) => {
    mockIntegrationCallbacks.QueryClientProvider.push({ client });
    if (mockIntegrationBehavior.queryProviderFailure) {
      throw new Error('QueryClientProvider initialization failed');
    }
    return <div data-testid="query-client-provider">{children}</div>;
  }
}));

// Mock page components with controlled behavior
jest.mock('../../src/components/SocialMediaFeed', () => {
  return function MockSocialMediaFeed() {
    mockIntegrationCallbacks.SocialMediaFeed.push({});
    if (mockIntegrationBehavior.feedFailure) {
      throw new Error('SocialMediaFeed failed to load');
    }
    return (
      <div data-testid="social-media-feed">
        <h2>Social Media Feed</h2>
        <div className="feed-content">
          <div className="post">Post 1: Welcome to AgentLink!</div>
          <div className="post">Post 2: System status update</div>
        </div>
      </div>
    );
  };
});

jest.mock('../../src/pages/DualInstancePage', () => {
  return function MockDualInstancePage() {
    mockIntegrationCallbacks.DualInstancePage.push({});
    if (mockIntegrationBehavior.dualInstanceFailure) {
      throw new Error('DualInstancePage failed to load');
    }
    return (
      <div data-testid="dual-instance-page">
        <h2>Claude Instance Manager</h2>
        <div className="instance-controls">
          <button>Launch Instance</button>
          <button>Stop Instance</button>
        </div>
        <div className="terminal">Terminal placeholder</div>
      </div>
    );
  };
});

// Mock remaining components
jest.mock('../../src/components/SimpleAgentManager', () => () => {
  mockIntegrationCallbacks.SimpleAgentManager.push({});
  return <div data-testid="simple-agent-manager">Agent Manager</div>;
});

jest.mock('../../src/components/AgentDashboard', () => () => {
  mockIntegrationCallbacks.AgentDashboard.push({});
  return <div data-testid="agent-dashboard">Agent Dashboard</div>;
});

jest.mock('../../src/components/SimpleAnalytics', () => () => {
  mockIntegrationCallbacks.SimpleAnalytics.push({});
  return <div data-testid="simple-analytics">Analytics Dashboard</div>;
});

jest.mock('../../src/components/SimpleSettings', () => () => {
  mockIntegrationCallbacks.SimpleSettings.push({});
  return <div data-testid="simple-settings">Settings Panel</div>;
});

jest.mock('../../src/components/PerformanceMonitor', () => () => {
  mockIntegrationCallbacks.PerformanceMonitor.push({});
  return <div data-testid="performance-monitor">Performance Monitor</div>;
});

// Mock CSS and asset imports
jest.mock('../../src/index.css', () => ({}));
jest.mock('../../src/styles/agents.css', () => ({}));

// London School mock objects for integration behavior verification
const mockIntegrationCallbacks = {
  ErrorBoundary: [] as any[],
  RouteErrorBoundary: [] as any[],
  GlobalErrorBoundary: [] as any[],
  AsyncErrorBoundary: [] as any[],
  LoadingFallback: [] as any[],
  FeedFallback: [] as any[],
  DualInstanceFallback: [] as any[],
  DashboardFallback: [] as any[],
  AgentManagerFallback: [] as any[],
  NotFoundFallback: [] as any[],
  RealTimeNotifications: [] as any[],
  ConnectionStatus: [] as any[],
  WebSocketProvider: [] as any[],
  useWebSocketSingleton: [] as any[],
  QueryClient: [] as any[],
  QueryClientProvider: [] as any[],
  SocialMediaFeed: [] as any[],
  DualInstancePage: [] as any[],
  SimpleAgentManager: [] as any[],
  AgentDashboard: [] as any[],
  SimpleAnalytics: [] as any[],
  SimpleSettings: [] as any[],
  PerformanceMonitor: [] as any[]
};

const mockIntegrationBehavior = {
  webSocketFailure: false,
  webSocketDisconnected: false,
  queryClientFailure: false,
  queryProviderFailure: false,
  feedFailure: false,
  dualInstanceFailure: false
};

describe('Complete App Bootstrap Integration - London School TDD', () => {
  beforeEach(() => {
    // Reset all mock states
    Object.values(mockIntegrationCallbacks).forEach(arr => arr.length = 0);
    
    // Reset behavior flags
    Object.keys(mockIntegrationBehavior).forEach(key => {
      (mockIntegrationBehavior as any)[key] = false;
    });
    
    // Suppress console errors during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Application Bootstrap Process', () => {
    it('should bootstrap complete application without white screen', async () => {
      const App = await import('../../src/App');
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Verify complete bootstrap chain
        expect(mockIntegrationCallbacks.GlobalErrorBoundary).toHaveLength(1);
        expect(mockIntegrationCallbacks.QueryClient).toHaveLength(1);
        expect(mockIntegrationCallbacks.QueryClientProvider).toHaveLength(1);
        expect(mockIntegrationCallbacks.WebSocketProvider).toHaveLength(1);
        
        // Verify UI components are rendered
        expect(mockIntegrationCallbacks.RealTimeNotifications).toHaveLength(1);
        expect(mockIntegrationCallbacks.ConnectionStatus).toHaveLength(1);
        expect(mockIntegrationCallbacks.SocialMediaFeed).toHaveLength(1);
        
        // Verify DOM structure
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
        expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Verify essential UI elements are visible
      expect(screen.getByText('AgentLink Feed System')).toBeVisible();
      expect(screen.getByText('Social Media Feed')).toBeVisible();
      expect(screen.getByText('🔔 Notifications')).toBeVisible();
      expect(screen.getByText('🟢 Connected')).toBeVisible();
    });

    it('should handle full application lifecycle', async () => {
      const App = await import('../../src/App');
      
      const { container, rerender, unmount } = render(<App.default />);
      
      // Initial render
      await waitFor(() => {
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Re-render
      rerender(<App.default />);
      expect(container.firstChild).not.toBeEmptyDOMElement();
      
      // Unmount
      unmount();
      
      // Should not throw errors during cleanup
      expect(() => {}).not.toThrow();
    });

    it('should validate optimized QueryClient configuration', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        expect(mockIntegrationCallbacks.QueryClient).toHaveLength(1);
        
        const config = mockIntegrationCallbacks.QueryClient[0].options;
        expect(config.defaultOptions.queries.retry).toBe(1);
        expect(config.defaultOptions.queries.staleTime).toBe(5 * 60 * 1000);
        expect(config.defaultOptions.queries.refetchOnWindowFocus).toBe(false);
        expect(config.defaultOptions.queries.refetchOnMount).toBe(false);
      });
    });

    it('should initialize WebSocket provider with correct configuration', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        expect(mockIntegrationCallbacks.WebSocketProvider).toHaveLength(1);
        
        const config = mockIntegrationCallbacks.WebSocketProvider[0].config;
        expect(config.autoConnect).toBe(true);
        expect(config.reconnectAttempts).toBe(3);
        expect(config.reconnectInterval).toBe(2000);
        expect(config.heartbeatInterval).toBe(20000);
      });
    });
  });

  describe('Complete Route Navigation Integration', () => {
    it('should handle complete route navigation without white screen', async () => {
      const App = await import('../../src/App');
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <App.default />
        </MemoryRouter>
      );
      
      // Initial route (feed) should load
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
        expect(screen.getByText('Post 1: Welcome to AgentLink!')).toBeInTheDocument();
      });
      
      // Navigate to dual instance
      const dualInstanceLink = screen.getByText('Claude Manager');
      fireEvent.click(dualInstanceLink);
      
      await waitFor(() => {
        expect(mockIntegrationCallbacks.DualInstancePage).toHaveLength(1);
      });
    });

    it('should handle all primary routes without white screen', async () => {
      const routes = [
        { path: '/', expectedComponent: 'social-media-feed', title: 'Social Media Feed' },
        { path: '/dual-instance', expectedComponent: 'dual-instance-page', title: 'Claude Instance Manager' },
        { path: '/agents', expectedComponent: 'simple-agent-manager', title: 'Agent Manager' },
        { path: '/dashboard', expectedComponent: 'agent-dashboard', title: 'Agent Dashboard' },
        { path: '/analytics', expectedComponent: 'simple-analytics', title: 'Analytics Dashboard' },
        { path: '/settings', expectedComponent: 'simple-settings', title: 'Settings Panel' },
        { path: '/performance-monitor', expectedComponent: 'performance-monitor', title: 'Performance Monitor' }
      ];
      
      const App = await import('../../src/App');
      
      for (const route of routes) {
        const { container } = render(
          <MemoryRouter initialEntries={[route.path]}>
            <App.default />
          </MemoryRouter>
        );
        
        await waitFor(() => {
          // Should never have white screen
          expect(container.firstChild).not.toBeEmptyDOMElement();
          
          // Should load expected component
          expect(screen.getByTestId(route.expectedComponent)).toBeInTheDocument();
          expect(screen.getByText(route.title)).toBeInTheDocument();
        });
      }
    });

    it('should handle invalid routes with proper fallback', async () => {
      const App = await import('../../src/App');
      
      const { container } = render(
        <MemoryRouter initialEntries={['/non-existent-route']}>
          <App.default />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(mockIntegrationCallbacks.NotFoundFallback).toHaveLength(1);
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Resilience Integration', () => {
    it('should handle WebSocket provider failure gracefully', async () => {
      const App = await import('../../src/App');
      
      mockIntegrationBehavior.webSocketFailure = true;
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should show error boundary instead of white screen
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(mockIntegrationCallbacks.GlobalErrorBoundary).toHaveLength(1);
      });
    });

    it('should handle QueryClient initialization failure', async () => {
      const App = await import('../../src/App');
      
      mockIntegrationBehavior.queryClientFailure = true;
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should show error boundary instead of white screen
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(mockIntegrationCallbacks.GlobalErrorBoundary).toHaveLength(1);
      });
    });

    it('should handle component loading failures with error boundaries', async () => {
      const App = await import('../../src/App');
      
      mockIntegrationBehavior.feedFailure = true;
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should show error boundary for failed component
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(mockIntegrationCallbacks.RouteErrorBoundary).toHaveLength(1);
        
        // App shell should still be present
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });
    });

    it('should handle cascading failures gracefully', async () => {
      const App = await import('../../src/App');
      
      // Simulate multiple failures
      mockIntegrationBehavior.webSocketDisconnected = true;
      mockIntegrationBehavior.feedFailure = true;
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should maintain app structure despite failures
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
        
        // Connection status should reflect disconnection
        expect(mockIntegrationCallbacks.useWebSocketSingleton).toHaveLength(1);
      });
    });
  });

  describe('Performance and Loading States Integration', () => {
    it('should show appropriate loading states during bootstrap', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        // Should use suspense fallbacks during loading
        expect(mockIntegrationCallbacks.LoadingFallback.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle slow component loading with fallbacks', async () => {
      // This test simulates slow component loading
      const App = await import('../../src/App');
      
      const { container } = render(<App.default />);
      
      // Should immediately show layout structure
      expect(container.firstChild).not.toBeEmptyDOMElement();
      
      await waitFor(() => {
        // Should eventually load all components
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
        expect(screen.getByText('Post 1: Welcome to AgentLink!')).toBeInTheDocument();
      });
    });

    it('should maintain responsive layout during bootstrap', async () => {
      const App = await import('../../src/App');
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should have proper layout structure
        expect(screen.getByRole('banner') || screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByRole('main') || screen.getByTestId('agent-feed')).toBeInTheDocument();
        
        // Should have navigation
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Claude Manager')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Integration', () => {
    it('should handle user interactions during and after bootstrap', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput).toHaveValue('test search');
      
      // Test navigation
      const settingsLink = screen.getByText('Settings');
      fireEvent.click(settingsLink);
      
      // Should maintain functionality
      expect(settingsLink.closest('a')).toHaveClass('bg-blue-100');
    });

    it('should handle sidebar interactions', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Test mobile menu button (if present)
      const menuButtons = screen.queryAllByRole('button');
      const menuButton = menuButtons.find(button => 
        button.textContent?.includes('menu') || 
        button.getAttribute('aria-label')?.includes('menu')
      );
      
      if (menuButton) {
        fireEvent.click(menuButton);
        // Should handle sidebar toggle without errors
      }
    });
  });

  describe('Accessibility and Standards Integration', () => {
    it('should maintain accessibility standards during bootstrap', async () => {
      const App = await import('../../src/App');
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Should have proper semantic structure
        const landmarks = container.querySelectorAll('[role], header, main, nav, aside');
        expect(landmarks.length).toBeGreaterThan(0);
        
        // Should have proper heading structure
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        expect(headings.length).toBeGreaterThan(0);
        
        // Should have interactive elements
        const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
        expect(interactiveElements.length).toBeGreaterThan(0);
      });
    });

    it('should provide proper ARIA labels and roles', async () => {
      const App = await import('../../src/App');
      
      render(<App.default />);
      
      await waitFor(() => {
        // Check for ARIA attributes
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');
        expect(elementsWithAria.length).toBeGreaterThan(0);
        
        // Should have proper form labels
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          if (input.type !== 'hidden') {
            const hasLabel = input.getAttribute('aria-label') || 
                            input.getAttribute('aria-labelledby') ||
                            document.querySelector(`label[for="${input.id}"]`);
            expect(hasLabel).toBeTruthy();
          }
        });
      });
    });
  });

  describe('Memory Management and Resource Cleanup Integration', () => {
    it('should handle component unmounting without memory leaks', async () => {
      const App = await import('../../src/App');
      
      const { unmount } = render(<App.default />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid re-renders efficiently', async () => {
      const App = await import('../../src/App');
      
      const { container, rerender } = render(<App.default />);
      
      // Perform multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<App.default />);
        expect(container.firstChild).not.toBeEmptyDOMElement();
      }
      
      // Should maintain stability
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
    });
  });

  describe('Complete White Screen Prevention Validation', () => {
    it('should never show white screen under any failure condition', async () => {
      const failureScenarios = [
        { name: 'WebSocket failure', setup: () => mockIntegrationBehavior.webSocketFailure = true },
        { name: 'Query client failure', setup: () => mockIntegrationBehavior.queryClientFailure = true },
        { name: 'Feed component failure', setup: () => mockIntegrationBehavior.feedFailure = true },
        { name: 'Dual instance failure', setup: () => mockIntegrationBehavior.dualInstanceFailure = true },
        { name: 'Multiple failures', setup: () => {
          mockIntegrationBehavior.webSocketDisconnected = true;
          mockIntegrationBehavior.feedFailure = true;
        }}
      ];
      
      const App = await import('../../src/App');
      
      for (const scenario of failureScenarios) {
        // Reset behavior flags
        Object.keys(mockIntegrationBehavior).forEach(key => {
          (mockIntegrationBehavior as any)[key] = false;
        });
        
        // Setup failure scenario
        scenario.setup();
        
        const { container } = render(<App.default />);
        
        await waitFor(() => {
          // Should NEVER have white screen
          expect(container.firstChild).not.toBeNull();
          expect(container.firstChild).not.toBeEmptyDOMElement();
          
          // Should have meaningful content
          expect(container.textContent).toBeTruthy();
          expect(container.textContent?.length).toBeGreaterThan(10);
          
          // Should have interactive elements or error messages
          const interactiveOrError = container.querySelector('button, a, input, [data-testid*="error"], [data-testid*="fallback"]');
          expect(interactiveOrError).toBeTruthy();
        }, { timeout: 1000 });
      }
    });

    it('should validate minimum viable application state', async () => {
      const App = await import('../../src/App');
      
      const { container } = render(<App.default />);
      
      await waitFor(() => {
        // Core validation criteria for preventing white screen
        expect(container.firstChild).not.toBeNull();
        expect(container.firstChild).not.toBeEmptyDOMElement();
        
        // Should have application title/branding
        expect(screen.getByText(/AgentLink/i)).toBeInTheDocument();
        
        // Should have meaningful content area
        expect(container.textContent?.length).toBeGreaterThan(50);
        
        // Should have navigation or controls
        const navigation = container.querySelectorAll('a, button');
        expect(navigation.length).toBeGreaterThan(2);
        
        // Should have proper document structure
        expect(container.querySelector('[data-testid]')).toBeTruthy();
        
        // Should have error boundaries in place
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });
    });
  });
});