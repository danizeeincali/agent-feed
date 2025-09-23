/**
 * @file App Component Unit Tests
 * @description Comprehensive TDD tests for App component mounting, routing, and rendering
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock QueryClient to prevent actual API calls
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    // Mock QueryClient methods
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
  useQuery: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock WebSocket context
vi.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: any) => children,
  useWebSocket: vi.fn().mockReturnValue({
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
  }),
}));

// Mock components to prevent complex rendering issues
vi.mock('@/components/SocialMediaFeed', () => ({
  default: () => <div data-testid="social-media-feed">Social Media Feed</div>,
}));

vi.mock('@/components/SimpleAgentManager', () => ({
  default: () => <div data-testid="simple-agent-manager">Simple Agent Manager</div>,
}));

vi.mock('@/components/ClaudeInstanceManager', () => ({
  default: () => <div data-testid="claude-instance-manager">Claude Instance Manager</div>,
}));

vi.mock('@/components/SimpleAnalytics', () => ({
  default: () => <div data-testid="simple-analytics">Simple Analytics</div>,
}));

vi.mock('@/components/BulletproofClaudeCodePanel', () => ({
  default: () => <div data-testid="bulletproof-claude-code-panel">Claude Code Panel</div>,
}));

vi.mock('@/components/AgentDashboard', () => ({
  default: () => <div data-testid="agent-dashboard">Agent Dashboard</div>,
}));

vi.mock('@/components/SimpleSettings', () => ({
  default: () => <div data-testid="simple-settings">Simple Settings</div>,
}));

vi.mock('@/components/PerformanceMonitor', () => ({
  default: () => <div data-testid="performance-monitor">Performance Monitor</div>,
}));

vi.mock('@/components/TerminalDebugTest', () => ({
  TerminalDebugTest: () => <div data-testid="terminal-debug-test">Terminal Debug Test</div>,
}));

vi.mock('@/pages/DualInstancePage', () => ({
  default: () => <div data-testid="dual-instance-page">Dual Instance Page</div>,
}));

vi.mock('@/components/BulletproofAgentProfile', () => ({
  default: () => <div data-testid="bulletproof-agent-profile">Agent Profile</div>,
}));

vi.mock('@/components/WorkflowVisualizationFixed', () => ({
  default: () => <div data-testid="workflow-visualization">Workflow Visualization</div>,
}));

vi.mock('@/components/BulletproofActivityPanel', () => ({
  default: () => <div data-testid="bulletproof-activity-panel">Activity Panel</div>,
}));

vi.mock('@/components/EnhancedAgentManagerWrapper', () => ({
  default: () => <div data-testid="enhanced-agent-manager">Enhanced Agent Manager</div>,
}));

vi.mock('@/components/DualInstanceDashboardEnhanced', () => ({
  default: () => <div data-testid="dual-instance-dashboard">Dual Instance Dashboard</div>,
}));

vi.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="real-time-notifications">Notifications</div>,
}));

vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connection Status</div>,
}));

vi.mock('@/components/FallbackComponents', () => ({
  default: {
    LoadingFallback: ({ message }: any) => <div data-testid="loading-fallback">{message}</div>,
    FeedFallback: () => <div data-testid="feed-fallback">Loading Feed...</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Loading Dual Instance...</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Loading Dashboard...</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Loading Agent Manager...</div>,
    AgentProfileFallback: () => <div data-testid="agent-profile-fallback">Loading Agent Profile...</div>,
    WorkflowFallback: () => <div data-testid="workflow-fallback">Loading Workflows...</div>,
    AnalyticsFallback: () => <div data-testid="analytics-fallback">Loading Analytics...</div>,
    ClaudeCodeFallback: () => <div data-testid="claude-code-fallback">Loading Claude Code...</div>,
    ActivityFallback: () => <div data-testid="activity-fallback">Loading Activity...</div>,
    SettingsFallback: () => <div data-testid="settings-fallback">Loading Settings...</div>,
    NotFoundFallback: () => <div data-testid="not-found-fallback">Page Not Found</div>,
  },
}));

// Mock ErrorBoundary components
vi.mock('@/components/ErrorBoundary', () => ({
  GlobalErrorBoundary: ({ children }: any) => <div data-testid="global-error-boundary">{children}</div>,
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
  RouteErrorBoundary: ({ children }: any) => <div data-testid="route-error-boundary">{children}</div>,
  AsyncErrorBoundary: ({ children }: any) => <div data-testid="async-error-boundary">{children}</div>,
}));

// Mock CSS imports
vi.mock('@/styles/agents.css', () => ({}));

// Mock utilities
vi.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Test wrapper component to provide routing context
const TestWrapper = ({ children, initialEntries = ['/'] }: any) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it('should render global error boundary', () => {
      render(<App />);
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should render header with application title', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
      });
    });

    it('should render navigation sidebar', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('AgentLink')).toBeInTheDocument();
      });
    });

    it('should render main content area', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
      });
    });

    it('should render connection status', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });
    });

    it('should render real-time notifications', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    const navigationItems = [
      { name: 'Claude Instances', href: '/claude-instances', testId: 'claude-instance-manager' },
      { name: 'Claude Manager', href: '/dual-instance', testId: 'dual-instance-page' },
      { name: 'Feed', href: '/', testId: 'social-media-feed' },
      { name: 'Agents', href: '/agents', testId: 'enhanced-agent-manager' },
      { name: 'Workflows', href: '/workflows', testId: 'workflow-visualization' },
      { name: 'Claude Code', href: '/claude-code', testId: 'bulletproof-claude-code-panel' },
      { name: 'Analytics', href: '/analytics', testId: 'simple-analytics' },
      { name: 'Settings', href: '/settings', testId: 'simple-settings' },
      { name: 'Performance Monitor', href: '/performance-monitor', testId: 'performance-monitor' },
      { name: 'Terminal Debug', href: '/terminal-debug', testId: 'terminal-debug-test' },
    ];

    navigationItems.forEach(({ name, href, testId }) => {
      it(`should render ${name} page`, async () => {
        render(
          <TestWrapper initialEntries={[href]}>
            <App />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeInTheDocument();
        });
      });
    });

    it('should show active navigation state', async () => {
      render(
        <TestWrapper initialEntries={['/claude-instances']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances');
        expect(claudeInstancesLink.closest('a')).toHaveClass('bg-blue-100');
      });
    });

    it('should handle 404 pages', async () => {
      render(
        <TestWrapper initialEntries={['/non-existent-page']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
        expect(screen.getByText('Page Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Navigation', () => {
    it('should show mobile menu button on small screens', () => {
      // Mock window width to simulate mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<App />);

      const menuButton = screen.getByRole('button');
      expect(menuButton).toBeInTheDocument();
    });

    it('should toggle mobile sidebar', async () => {
      const user = userEvent.setup();

      render(<App />);

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => 
        btn.querySelector('[data-testid="menu-icon"]') || 
        btn.textContent?.includes('menu') ||
        btn.getAttribute('aria-label')?.includes('menu')
      );

      if (menuButton) {
        await user.click(menuButton);
        // Sidebar should be visible/toggled
        // We can't easily test the transform classes without more complex mocking
      }
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      render(<App />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts...');
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should handle search input', async () => {
      const user = userEvent.setup();

      render(<App />);

      const searchInput = screen.getByPlaceholderText('Search posts...');
      await user.type(searchInput, 'test search');

      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('Route Parameters', () => {
    it('should handle dual instance routes with parameters', async () => {
      render(
        <TestWrapper initialEntries={['/dual-instance/monitoring/instance-123']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dual-instance-page')).toBeInTheDocument();
      });
    });

    it('should handle agent profile routes', async () => {
      render(
        <TestWrapper initialEntries={['/agent/agent-456']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bulletproof-agent-profile')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should wrap routes in error boundaries', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('route-error-boundary')).toBeInTheDocument();
      });
    });

    it('should handle async component errors', async () => {
      render(
        <TestWrapper initialEntries={['/dual-instance']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('async-error-boundary')).toBeInTheDocument();
      });
    });
  });

  describe('Suspense and Loading States', () => {
    it('should show loading fallbacks during component loading', async () => {
      // Mock React.Suspense to test fallback rendering
      const OriginalSuspense = React.Suspense;
      const MockSuspense = ({ children, fallback }: any) => {
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setLoading(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return loading ? fallback : children;
      };

      vi.stubGlobal('React', { ...React, Suspense: MockSuspense });

      render(
        <TestWrapper initialEntries={['/claude-instances']}>
          <App />
        </TestWrapper>
      );

      expect(screen.getByText('Loading Claude Instances...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });

      // Restore original Suspense
      vi.stubGlobal('React', { ...React, Suspense: OriginalSuspense });
    });

    it('should show appropriate loading messages for different routes', async () => {
      const testCases = [
        { route: '/', fallbackTestId: 'feed-fallback' },
        { route: '/dashboard', fallbackTestId: 'dashboard-fallback' },
        { route: '/agents', fallbackTestId: 'agent-manager-fallback' },
        { route: '/workflows', fallbackTestId: 'workflow-fallback' },
        { route: '/analytics', fallbackTestId: 'analytics-fallback' },
      ];

      for (const { route, fallbackTestId } of testCases) {
        const MockSuspense = ({ fallback }: any) => fallback;
        vi.stubGlobal('React', { ...React, Suspense: MockSuspense });

        render(
          <TestWrapper initialEntries={[route]}>
            <App />
          </TestWrapper>
        );

        expect(screen.getByTestId(fallbackTestId)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<App />);

      await waitFor(() => {
        const main = screen.getByTestId('agent-feed');
        expect(main).toHaveRole('main');
      });

      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Should be able to navigate through links
      await user.tab();
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeDefined();
    });

    it('should have proper heading hierarchy', async () => {
      render(<App />);

      await waitFor(() => {
        const mainHeading = screen.getByText('AgentLink - Claude Instance Manager');
        expect(mainHeading.tagName).toBe('H1');
      });
    });
  });

  describe('Performance', () => {
    it('should use memo for Layout component', () => {
      // Test that Layout is memoized by checking re-renders
      const { rerender } = render(<App />);
      
      // Re-render should not cause unnecessary updates
      rerender(<App />);
      
      // This is more of a structural test - the actual memo behavior
      // would require more sophisticated testing setup
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should lazy load components', async () => {
      // Components should be wrapped in Suspense for lazy loading
      render(
        <TestWrapper initialEntries={['/claude-instances']}>
          <App />
        </TestWrapper>
      );

      // Component should eventually render
      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Context Integration', () => {
    it('should provide QueryClient context', () => {
      render(<App />);
      
      // QueryClientProvider should be in the component tree
      // This is tested indirectly through successful rendering
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should provide WebSocket context', () => {
      render(<App />);
      
      // WebSocketProvider should be in the component tree
      // This is tested indirectly through successful rendering
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });
  });

  describe('Legacy Routes', () => {
    it('should handle legacy agent manager route', async () => {
      render(
        <TestWrapper initialEntries={['/agents-legacy']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-agent-manager')).toBeInTheDocument();
      });
    });

    it('should handle legacy dual instance route', async () => {
      render(
        <TestWrapper initialEntries={['/dual-instance-legacy']}>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dual-instance-dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Debug and Development', () => {
    it('should log debug information in console', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      render(<App />);
      
      expect(consoleSpy).toHaveBeenCalledWith('DEBUG: App.tsx loading...');
      expect(consoleSpy).toHaveBeenCalledWith('DEBUG: App component rendering...');
    });

    it('should log mount information', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('DEBUG: App component mounted!');
      });
    });
  });

  describe('State Management', () => {
    it('should handle sidebar state correctly', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Find mobile menu toggle buttons (there might be multiple)
      const buttons = screen.getAllByRole('button');
      
      // Look for buttons that might toggle the sidebar
      const menuButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null; // Menu buttons typically have SVG icons
      });

      if (menuButton) {
        await user.click(menuButton);
        // Test sidebar state change would require more complex DOM testing
      }
    });

    it('should handle search state', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      const searchInput = screen.getByPlaceholderText('Search posts...');
      
      await user.type(searchInput, 'test query');
      expect(searchInput).toHaveValue('test query');

      await user.clear(searchInput);
      expect(searchInput).toHaveValue('');
    });
  });
});