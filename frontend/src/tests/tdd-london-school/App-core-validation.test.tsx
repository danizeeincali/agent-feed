import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Import App component directly
import App from '../../App';

// Mock all external dependencies to focus on App structure validation
vi.mock('../../components/RealSocialMediaFeed', () => ({
  default: function MockRealSocialMediaFeed() {
    return <div data-testid="real-social-media-feed">Real Social Media Feed Component</div>;
  }
}));

vi.mock('../../components/RealAgentManager', () => ({
  default: function MockRealAgentManager() {
    return <div data-testid="real-agent-manager">Real Agent Manager Component</div>;
  }
}));

vi.mock('../../components/IsolatedRealAgentManager', () => ({
  default: function MockIsolatedRealAgentManager() {
    return <div data-testid="isolated-real-agent-manager">Isolated Real Agent Manager Component</div>;
  }
}));

vi.mock('../../components/RealActivityFeed', () => ({
  default: function MockRealActivityFeed() {
    return <div data-testid="real-activity-feed">Real Activity Feed Component</div>;
  }
}));

vi.mock('../../components/RealAnalytics', () => ({
  default: function MockRealAnalytics() {
    return <div data-testid="real-analytics">Real Analytics Component</div>;
  }
}));

vi.mock('../../components/RealTimeNotifications', () => ({
  RealTimeNotifications: function MockRealTimeNotifications() {
    return <div data-testid="real-time-notifications">Real Time Notifications</div>;
  }
}));

vi.mock('../../components/ConnectionStatus', () => ({
  ConnectionStatus: function MockConnectionStatus() {
    return <div data-testid="connection-status">Connection Status</div>;
  }
}));

// Mock all other components to prevent routing errors
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

vi.mock('../../components/GlobalErrorBoundary', () => ({
  default: function MockGlobalErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="global-error-boundary">{children}</div>;
  }
}));

vi.mock('../../components/SafeFeedWrapper', () => ({
  default: function MockSafeFeedWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="safe-feed-wrapper">{children}</div>;
  }
}));

vi.mock('../../components/RouteErrorBoundary', () => ({
  default: function MockRouteErrorBoundary({ children, routeName }: { children: React.ReactNode; routeName?: string }) {
    return <div data-testid={`route-error-boundary-${routeName?.toLowerCase() || 'unknown'}`}>{children}</div>;
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
    NotFoundFallback: function MockNotFoundFallback() {
      return <div data-testid="not-found-fallback">Page Not Found</div>;
    },
  }
}));

// Mock all other complex components to prevent import errors
vi.mock('../../components/EnhancedAviDMWithClaudeCode', () => ({
  default: () => <div data-testid="enhanced-avi-dm-with-claude-code">Enhanced Avi DM</div>
}));
vi.mock('../../components/claude-manager/DualModeClaudeManager', () => ({
  default: () => <div data-testid="dual-mode-claude-manager">Dual Mode Claude Manager</div>
}));
vi.mock('../../components/AgentDashboard', () => ({
  default: () => <div data-testid="agent-dashboard">Agent Dashboard</div>
}));
vi.mock('../../components/WorkingAgentProfile', () => ({
  default: () => <div data-testid="working-agent-profile">Working Agent Profile</div>
}));
vi.mock('../../components/DynamicPageRenderer', () => ({
  default: () => <div data-testid="dynamic-page-renderer">Dynamic Page Renderer</div>
}));
vi.mock('../../components/WorkflowVisualizationFixed', () => ({
  default: () => <div data-testid="workflow-visualization-fixed">Workflow Visualization</div>
}));
vi.mock('../../components/ClaudeCodeWithStreamingInterface', () => ({
  default: () => <div data-testid="claude-code-with-streaming-interface">Claude Code Interface</div>
}));
vi.mock('../../components/SimpleSettings', () => ({
  default: () => <div data-testid="simple-settings">Simple Settings</div>
}));
vi.mock('../../components/PerformanceMonitor', () => ({
  default: () => <div data-testid="performance-monitor">Performance Monitor</div>
}));
vi.mock('../../components/DraftManager', () => ({
  DraftManager: () => <div data-testid="draft-manager">Draft Manager</div>
}));
vi.mock('../../components/DebugPostsDisplay', () => ({
  default: () => <div data-testid="debug-posts-display">Debug Posts Display</div>
}));
vi.mock('../../components/posting-interface', () => ({
  PostingInterface: () => <div data-testid="posting-interface">Posting Interface</div>
}));
vi.mock('../../components/MentionInputDemo', () => ({
  default: () => <div data-testid="mention-input-demo">Mention Input Demo</div>
}));
vi.mock('../../components/MentionDebugTest', () => ({
  MentionDebugTest: () => <div data-testid="mention-debug-test">Mention Debug Test</div>
}));
vi.mock('../../components/AsyncErrorBoundary', () => ({
  default: function MockAsyncErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="async-error-boundary">{children}</div>;
  }
}));

// Mock CSS and utility imports
vi.mock('../../styles/agents.css', () => ({}));
vi.mock('../../utils/cn', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));

/**
 * TDD London School Test Suite for App.tsx Core Validation
 *
 * This test suite validates that the App.tsx component structure is restored correctly.
 *
 * Test Requirements:
 * 1. App.tsx imports and renders without errors
 * 2. Layout component with sidebar navigation exists
 * 3. All routes are properly defined
 * 4. Real components load (RealSocialMediaFeed, RealAgentManager, etc.)
 * 5. No diagnostic or mock components in production
 */
describe('App.tsx - TDD London School Core Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Suppress console messages for cleaner test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
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

      // Verify core app structure is rendered
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should not throw errors during rendering', async () => {
      const renderApp = () => {
        return render(<App />);
      };

      await act(async () => {
        expect(renderApp).not.toThrow();
      });
    });

    it('should contain essential error boundaries and providers', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify essential providers are present
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('video-playback-provider')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    });
  });

  /**
   * Test 2: Layout component with sidebar navigation exists
   */
  describe('Layout Component Structure Validation', () => {
    it('should render Layout component with correct branding', async () => {
      await act(async () => {
        render(<App />);
      });

      // Check for correct branding and header
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
    });

    it('should contain all required navigation items', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify all navigation items from the requirements
      const requiredNavItems = [
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

      requiredNavItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('should render essential UI components', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify connection status and notifications
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: All routes are properly defined
   */
  describe('Route Structure Validation', () => {
    it('should have router structure in place', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify basic routing structure exists by checking app container
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    it('should render default feed route content', async () => {
      await act(async () => {
        render(<App />);
      });

      // On default route ("/"), should show the feed
      await waitFor(() => {
        expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
        expect(screen.getByTestId('safe-feed-wrapper')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should contain route wrappers for proper error handling', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify route wrapper exists for feed route
      expect(screen.getByTestId('route-wrapper-feed')).toBeInTheDocument();
    });
  });

  /**
   * Test 4: Real components load properly
   */
  describe('Real Components Loading Validation', () => {
    it('should load RealSocialMediaFeed component', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
        expect(screen.getByText('Real Social Media Feed Component')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should use Real component imports, not mock versions', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify Real components are being imported
      expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();

      // Verify these specific mock/debug components are NOT present
      expect(screen.queryByTestId('mock-social-media-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('debug-social-media-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('test-social-media-feed')).not.toBeInTheDocument();
    });

    it('should have all required Real component types available', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify that the component is structured to use Real components
      // (They are mocked for testing, but the imports are for Real components)
      const feedComponent = screen.getByTestId('real-social-media-feed');
      expect(feedComponent).toHaveTextContent('Real Social Media Feed Component');
    });
  });

  /**
   * Test 5: No diagnostic or mock components in production structure
   */
  describe('Production Components Validation', () => {
    it('should not contain diagnostic or debug components in main structure', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify no diagnostic components are present in the main app structure
      expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/diagnostic/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/test-component/i)).not.toBeInTheDocument();
    });

    it('should use production-ready component names', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify Real components are used, not temporary/mock versions
      expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();

      // Verify simulation/debug versions are not present
      expect(screen.queryByTestId('simulated-social-media-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('debug-social-media-feed')).not.toBeInTheDocument();
    });

    it('should have clean production-ready interface', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify the interface looks production-ready
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();

      // No development-only components should be visible
      expect(screen.queryByText(/development/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/testing/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Test 6: Error Boundaries and Context Integration
   */
  describe('Integration and Error Handling Validation', () => {
    it('should have proper error boundary structure', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify error boundaries are in place
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('route-error-boundary-feed')).toBeInTheDocument();
    });

    it('should integrate with required context providers', async () => {
      await act(async () => {
        render(<App />);
      });

      // Verify context providers are properly integrated
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      expect(screen.getByTestId('video-playback-provider')).toBeInTheDocument();
    });
  });

  /**
   * Test 7: Final TDD London School Validation Summary
   */
  describe('Final Validation Summary', () => {
    it('should pass all TDD London School validation requirements', async () => {
      await act(async () => {
        render(<App />);
      });

      // ✅ Requirement 1: App.tsx imports and renders without errors
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();

      // ✅ Requirement 2: Layout component with sidebar navigation exists
      expect(screen.getByText('AgentLink')).toBeInTheDocument();

      const navigationItems = [
        'Interactive Control', 'Claude Manager', 'Feed', 'Create',
        'Mention Demo', 'Drafts', 'Agents', 'Workflows', 'Claude Code',
        'Live Activity', 'Analytics', 'Performance Monitor', 'Settings'
      ];

      navigationItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });

      // ✅ Requirement 3: All routes are properly defined
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
      expect(screen.getByTestId('route-wrapper-feed')).toBeInTheDocument();

      // ✅ Requirement 4: Real components load
      expect(screen.getByTestId('real-social-media-feed')).toBeInTheDocument();
      expect(screen.getByText('Real Social Media Feed Component')).toBeInTheDocument();

      // ✅ Requirement 5: No diagnostic or mock components in production
      expect(screen.queryByText(/diagnostic/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('simulated-social-media-feed')).not.toBeInTheDocument();

      console.log('✅ All TDD London School validation requirements passed!');
    });
  });
});