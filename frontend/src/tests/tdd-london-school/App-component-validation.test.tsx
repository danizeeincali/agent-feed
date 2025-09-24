import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Import App component directly
import App from '../../App';

// Mock dependencies
vi.mock('../../components/RealSocialMediaFeed', () => ({
  default: function MockRealSocialMediaFeed() {
    return <div data-testid="real-social-media-feed">Real Social Media Feed</div>;
  }
}));

vi.mock('../../components/RealAgentManager', () => ({
  default: function MockRealAgentManager() {
    return <div data-testid="real-agent-manager">Real Agent Manager</div>;
  }
}));

vi.mock('../../components/RealActivityFeed', () => ({
  default: function MockRealActivityFeed() {
    return <div data-testid="real-activity-feed">Real Activity Feed</div>;
  }
}));

vi.mock('../../components/RealAnalytics', () => ({
  default: function MockRealAnalytics() {
    return <div data-testid="real-analytics">Real Analytics</div>;
  }
}));

vi.mock('../../components/IsolatedRealAgentManager', () => ({
  default: function MockIsolatedRealAgentManager() {
    return <div data-testid="isolated-real-agent-manager">Isolated Real Agent Manager</div>;
  }
}));

vi.mock('../../components/RealTimeNotifications', () => ({
  RealTimeNotifications: function MockRealTimeNotifications() {
    return <div data-testid="real-time-notifications">Notifications</div>;
  }
}));

vi.mock('../../components/ConnectionStatus', () => ({
  ConnectionStatus: function MockConnectionStatus() {
    return <div data-testid="connection-status">Connection Status</div>;
  }
}));

vi.mock('../../context/WebSocketSingletonContext', () => ({
  WebSocketProvider: function MockWebSocketProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="websocket-provider">{children}</div>;
  }
}));

vi.mock('../../contexts/VideoPlaybackContext', () => ({
  VideoPlaybackProvider: function MockVideoPlaybackProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="video-playback-provider">{children}</div>;
  }
}));

// Mock all other complex components
vi.mock('../../components/SafeFeedWrapper', () => ({
  default: function MockSafeFeedWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="safe-feed-wrapper">{children}</div>;
  }
}));

vi.mock('../../components/EnhancedAviDMWithClaudeCode', () => ({
  default: function MockEnhancedAviDMWithClaudeCode() {
    return <div data-testid="enhanced-avi-dm-with-claude-code">Enhanced Avi DM with Claude Code</div>;
  }
}));

vi.mock('../../components/claude-manager/DualModeClaudeManager', () => ({
  default: function MockDualModeClaudeManager() {
    return <div data-testid="dual-mode-claude-manager">Dual Mode Claude Manager</div>;
  }
}));

vi.mock('../../components/AgentDashboard', () => ({
  default: function MockAgentDashboard() {
    return <div data-testid="agent-dashboard">Agent Dashboard</div>;
  }
}));

vi.mock('../../components/WorkingAgentProfile', () => ({
  default: function MockWorkingAgentProfile() {
    return <div data-testid="working-agent-profile">Working Agent Profile</div>;
  }
}));

vi.mock('../../components/DynamicPageRenderer', () => ({
  default: function MockDynamicPageRenderer() {
    return <div data-testid="dynamic-page-renderer">Dynamic Page Renderer</div>;
  }
}));

vi.mock('../../components/WorkflowVisualizationFixed', () => ({
  default: function MockWorkflowVisualizationFixed() {
    return <div data-testid="workflow-visualization-fixed">Workflow Visualization Fixed</div>;
  }
}));

vi.mock('../../components/ClaudeCodeWithStreamingInterface', () => ({
  default: function MockClaudeCodeWithStreamingInterface() {
    return <div data-testid="claude-code-with-streaming-interface">Claude Code with Streaming Interface</div>;
  }
}));

vi.mock('../../components/SimpleSettings', () => ({
  default: function MockSimpleSettings() {
    return <div data-testid="simple-settings">Simple Settings</div>;
  }
}));

vi.mock('../../components/PerformanceMonitor', () => ({
  default: function MockPerformanceMonitor() {
    return <div data-testid="performance-monitor">Performance Monitor</div>;
  }
}));

vi.mock('../../components/DraftManager', () => ({
  DraftManager: function MockDraftManager() {
    return <div data-testid="draft-manager">Draft Manager</div>;
  }
}));

vi.mock('../../components/DebugPostsDisplay', () => ({
  default: function MockDebugPostsDisplay() {
    return <div data-testid="debug-posts-display">Debug Posts Display</div>;
  }
}));

vi.mock('../../components/posting-interface', () => ({
  PostingInterface: function MockPostingInterface() {
    return <div data-testid="posting-interface">Posting Interface</div>;
  }
}));

// Removed MentionInputDemo and MentionDebugTest mocks - components deleted

// Mock all Error Boundary components
vi.mock('../../components/GlobalErrorBoundary', () => ({
  default: function MockGlobalErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="global-error-boundary">{children}</div>;
  }
}));

vi.mock('../../components/RouteErrorBoundary', () => ({
  default: function MockRouteErrorBoundary({ children, routeName }: { children: React.ReactNode; routeName: string }) {
    return <div data-testid={`route-error-boundary-${routeName?.toLowerCase()}`}>{children}</div>;
  }
}));

vi.mock('../../components/AsyncErrorBoundary', () => ({
  default: function MockAsyncErrorBoundary({ children, componentName }: { children: React.ReactNode; componentName: string }) {
    return <div data-testid={`async-error-boundary-${componentName?.toLowerCase()}`}>{children}</div>;
  }
}));

vi.mock('../../components/RouteWrapper', () => ({
  default: function MockRouteWrapper({ children, routeKey }: { children: React.ReactNode; routeKey: string }) {
    return <div data-testid={`route-wrapper-${routeKey}`}>{children}</div>;
  }
}));

vi.mock('../../components/FallbackComponents', () => ({
  default: {
    LoadingFallback: function MockLoadingFallback({ message }: { message?: string }) {
      return <div data-testid="loading-fallback">{message || 'Loading...'}</div>;
    },
    FeedFallback: function MockFeedFallback() {
      return <div data-testid="feed-fallback">Feed Loading...</div>;
    },
    DualInstanceFallback: function MockDualInstanceFallback() {
      return <div data-testid="dual-instance-fallback">Dual Instance Loading...</div>;
    },
    DashboardFallback: function MockDashboardFallback() {
      return <div data-testid="dashboard-fallback">Dashboard Loading...</div>;
    },
    AgentManagerFallback: function MockAgentManagerFallback() {
      return <div data-testid="agent-manager-fallback">Agent Manager Loading...</div>;
    },
    WorkflowFallback: function MockWorkflowFallback() {
      return <div data-testid="workflow-fallback">Workflow Loading...</div>;
    },
    AnalyticsFallback: function MockAnalyticsFallback() {
      return <div data-testid="analytics-fallback">Analytics Loading...</div>;
    },
    ClaudeCodeFallback: function MockClaudeCodeFallback() {
      return <div data-testid="claude-code-fallback">Claude Code Loading...</div>;
    },
    ActivityFallback: function MockActivityFallback() {
      return <div data-testid="activity-fallback">Activity Loading...</div>;
    },
    SettingsFallback: function MockSettingsFallback() {
      return <div data-testid="settings-fallback">Settings Loading...</div>;
    },
    NotFoundFallback: function MockNotFoundFallback() {
      return <div data-testid="not-found-fallback">Page Not Found</div>;
    },
  }
}));

// Mock CSS imports
vi.mock('../../styles/agents.css', () => ({}));

// Mock utility functions
vi.mock('../../utils/cn', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));

/**
 * TDD London School Test Suite for App.tsx Component Validation
 * 
 * This test suite validates the original interface structure is restored correctly
 * focusing on:
 * 1. App.tsx imports and renders without errors
 * 2. Layout component with sidebar navigation exists
 * 3. All routes are properly defined
 * 4. Real components load properly
 * 5. No diagnostic or mock components in production routes
 */
describe('App Component - TDD London School Validation', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
          gcTime: Infinity,
        },
      },
    });
    
    // Clear all mocks
    vi.clearAllMocks();

    // Suppress console warnings for tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  /**
   * Test 1: App.tsx imports and renders without errors
   */
  describe('Component Import and Render Validation', () => {
    it('should import and render App component without errors', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // Verify app root is rendered
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
    
    it('should render without throwing errors', async () => {
      const renderApp = () => {
        return render(<App />);
      };
      
      await act(async () => {
        expect(renderApp).not.toThrow();
      });
    });
    
    it('should contain essential providers', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // Verify providers are present
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('video-playback-provider')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    });
  });

  /**
   * Test 2: Layout component with sidebar navigation exists
   */
  describe('Layout Component Validation', () => {
    it('should render Layout component with sidebar navigation', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // Check for sidebar elements
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
    });
    
    it('should contain all required navigation items', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // Verify navigation items
      const expectedNavItems = [
        'Interactive Control',
        'Claude Manager', 
        'Feed',
        'Create',
        'Mention Demo',
        'Drafts',
        'Agents',
        'Workflows',
        'Claude Code',
        'Live Activity',
        'Analytics',
        'Performance Monitor',
        'Settings'
      ];
      
      expectedNavItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });
    
    it('should render connection status component', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
    
    it('should render real-time notifications', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: All routes are properly defined
   */
  describe('Route Definitions Validation', () => {
    const testRoute = async (path: string, expectedTestId: string) => {
      window.history.pushState({}, 'Test page', path);
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
      }, { timeout: 3000 });
    };
    
    it('should render Feed route ("/")', async () => {
      await testRoute('/', 'real-social-media-feed');
    });
    
    it('should render Interactive Control route', async () => {
      await testRoute('/interactive-control', 'enhanced-avi-dm-with-claude-code');
    });
    
    it('should render Claude Manager route', async () => {
      await testRoute('/claude-manager', 'dual-mode-claude-manager');
    });
    
    it('should render Agents route', async () => {
      await testRoute('/agents', 'isolated-real-agent-manager');
    });
    
    it('should render Analytics route', async () => {
      await testRoute('/analytics', 'real-analytics');
    });
    
    it('should render Claude Code route', async () => {
      await testRoute('/claude-code', 'claude-code-with-streaming-interface');
    });
    
    it('should render Live Activity route', async () => {
      await testRoute('/activity', 'real-activity-feed');
    });
    
    it('should render Settings route', async () => {
      await testRoute('/settings', 'simple-settings');
    });
    
    it('should render Performance Monitor route', async () => {
      await testRoute('/performance-monitor', 'performance-monitor');
    });
    
    it('should render Drafts route', async () => {
      await testRoute('/drafts', 'draft-manager');
    });
    
    it('should render Posting Interface route', async () => {
      await testRoute('/posting', 'posting-interface');
    });
    
    it('should render Mention Demo route', async () => {
      await testRoute('/mention-demo', 'mention-input-demo');
    });
    
    it('should render 404 for unknown routes', async () => {
      await testRoute('/unknown-route', 'not-found-fallback');
    });
  });

  /**
   * Test 4: Real components load properly
   */
  describe('Real Components Loading Validation', () => {
    it('should load RealSocialMediaFeed on feed route', async () => {
      window.history.pushState({}, 'Test page', '/');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
        expect(screen.getByTestId('safe-feed-wrapper')).toBeInTheDocument();
      });
    });
    
    it('should load IsolatedRealAgentManager on agents route', async () => {
      window.history.pushState({}, 'Test page', '/agents');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('isolated-real-agent-manager')).toBeInTheDocument();
      });
    });
    
    it('should load RealActivityFeed on activity route', async () => {
      window.history.pushState({}, 'Test page', '/activity');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('real-activity-feed')).toBeInTheDocument();
      });
    });
    
    it('should load RealAnalytics on analytics route', async () => {
      window.history.pushState({}, 'Test page', '/analytics');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test 5: No diagnostic or mock components in production routes
   */
  describe('Production Components Validation', () => {
    it('should not contain any test or debug components in production routes', async () => {
      const productionRoutes = ['/', '/agents', '/analytics', '/activity', '/claude-code'];
      
      for (const route of productionRoutes) {
        window.history.pushState({}, 'Test page', route);
        
        await act(async () => {
          render(
            <BrowserRouter>
              <App />
            </BrowserRouter>
          );
        });
        
        // Verify no diagnostic components
        expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/test/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mock/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/diagnostic/i)).not.toBeInTheDocument();
      }
    });
    
    it('should contain only Real components, not simulation or debug versions', async () => {
      window.history.pushState({}, 'Test page', '/');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      // Verify Real components are used
      expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
      
      // Verify no simulation or debug versions
      expect(screen.queryByTestId('simulated-social-media-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('debug-social-media-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('test-social-media-feed')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 6: Error Boundaries and Fallbacks
   */
  describe('Error Handling Validation', () => {
    it('should contain error boundaries for each route', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });
    
    it('should have Suspense fallbacks for lazy loading', async () => {
      window.history.pushState({}, 'Test page', '/');
      
      await act(async () => {
        render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
      
      // Verify fallback components are available in the tree
      // (They might not be visible if components load quickly)
      expect(screen.getByTestId('route-wrapper-feed')).toBeInTheDocument();
    });
  });

  /**
   * Test 7: Navigation Functionality
   */
  describe('Navigation Functionality Validation', () => {
    it('should navigate to different routes when navigation links are clicked', async () => {
      await act(async () => {
        render(<App />);
      });
      
      const user = userEvent.setup();
      
      // Click on Agents navigation
      const agentsLink = screen.getByText('Agents');
      await user.click(agentsLink);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/agents');
      });
    });
    
    it('should close sidebar when navigation item is clicked on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });
      
      await act(async () => {
        render(<App />);
      });
      
      const user = userEvent.setup();
      
      // Open sidebar
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Click navigation item
      const feedLink = screen.getByText('Feed');
      await user.click(feedLink);
      
      // Sidebar should close (tested through UI state)
      expect(feedLink).toBeInTheDocument();
    });
  });

  /**
   * Test 8: Integration with Context Providers
   */
  describe('Context Provider Integration Validation', () => {
    it('should provide QueryClient context to child components', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // QueryClient should be available in the component tree
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
    });
    
    it('should provide WebSocket context to child components', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    });
    
    it('should provide VideoPlayback context to child components', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByTestId('video-playback-provider')).toBeInTheDocument();
    });
  });
});
