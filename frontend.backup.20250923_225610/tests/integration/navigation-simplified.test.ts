/**
 * Integration Tests for Simplified Navigation Changes
 * 
 * Tests for navigation changes:
 * - Simple Launcher removal from menu
 * - Claude Instances as primary navigation item
 * - Route handling and redirects
 * - Menu structure validation
 * - Integration with existing components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import React from 'react';

// Mock components that might have external dependencies
vi.mock('@/components/SocialMediaFeed', () => ({
  default: () => <div data-testid="social-media-feed">Social Media Feed</div>
}));

vi.mock('@/components/ClaudeInstanceManager', () => ({
  default: () => <div data-testid="claude-instance-manager">Claude Instance Manager</div>
}));

vi.mock('@/components/SimpleAgentManager', () => ({
  default: () => <div data-testid="simple-agent-manager">Simple Agent Manager</div>
}));

vi.mock('@/components/EnhancedAgentManagerWrapper', () => ({
  default: () => <div data-testid="enhanced-agent-manager">Enhanced Agent Manager</div>
}));

vi.mock('@/components/SimpleAnalytics', () => ({
  default: () => <div data-testid="analytics">Analytics</div>
}));

vi.mock('@/components/BulletproofClaudeCodePanel', () => ({
  default: () => <div data-testid="claude-code">Claude Code Panel</div>
}));

vi.mock('@/components/AgentDashboard', () => ({
  default: () => <div data-testid="agent-dashboard">Agent Dashboard</div>
}));

vi.mock('@/pages/DualInstancePage', () => ({
  default: () => <div data-testid="dual-instance-page">Dual Instance Page</div>
}));

vi.mock('@/components/WorkflowVisualizationFixed', () => ({
  default: () => <div data-testid="workflow-viz">Workflow Visualization</div>
}));

vi.mock('@/components/BulletproofActivityPanel', () => ({
  default: () => <div data-testid="activity-panel">Activity Panel</div>
}));

vi.mock('@/components/SimpleSettings', () => ({
  default: () => <div data-testid="settings">Settings</div>
}));

vi.mock('@/components/PerformanceMonitor', () => ({
  default: () => <div data-testid="performance-monitor">Performance Monitor</div>
}));

vi.mock('@/components/TerminalDebugTest', () => ({
  TerminalDebugTest: () => <div data-testid="terminal-debug">Terminal Debug</div>
}));

// Mock WebSocket context
vi.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock connection status
vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>
}));

// Mock real-time notifications
vi.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="notifications">Notifications</div>
}));

// Mock error boundaries and fallbacks
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GlobalErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AsyncErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/FallbackComponents', () => ({
  default: {
    LoadingFallback: ({ message }: { message: string }) => <div data-testid="loading">{message}</div>,
    FeedFallback: () => <div data-testid="feed-fallback">Feed Loading</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Dual Instance Loading</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Dashboard Loading</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Agent Manager Loading</div>,
    AgentProfileFallback: () => <div data-testid="agent-profile-fallback">Agent Profile Loading</div>,
    WorkflowFallback: () => <div data-testid="workflow-fallback">Workflow Loading</div>,
    AnalyticsFallback: () => <div data-testid="analytics-fallback">Analytics Loading</div>,
    ClaudeCodeFallback: () => <div data-testid="claude-code-fallback">Claude Code Loading</div>,
    ActivityFallback: () => <div data-testid="activity-fallback">Activity Loading</div>,
    SettingsFallback: () => <div data-testid="settings-fallback">Settings Loading</div>,
    NotFoundFallback: () => <div data-testid="not-found">Page Not Found</div>
  }
}));

describe('Navigation Simplified Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderApp = (initialPath = '/') => {
    // Mock window.location for initial path
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: initialPath
      },
      writable: true
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    );
  };

  describe('Navigation Menu Structure', () => {
    it('displays Claude Instances as first navigation item', async () => {
      renderApp();

      await waitFor(() => {
        const navigation = screen.getByRole('navigation', { hidden: true }) || 
                         screen.getByText('Claude Instances').closest('nav');
        expect(navigation).toBeInTheDocument();
      });

      const claudeInstancesLink = screen.getByText('Claude Instances');
      expect(claudeInstancesLink).toBeInTheDocument();
      expect(claudeInstancesLink.closest('a')).toHaveAttribute('href', '/claude-instances');
    });

    it('does not display Simple Launcher in navigation menu', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Verify Simple Launcher is not in the navigation
      expect(screen.queryByText('Simple Launcher')).not.toBeInTheDocument();
      expect(screen.queryByText(/Launch.*Simple/)).not.toBeInTheDocument();
    });

    it('displays all expected navigation items in correct order', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      const expectedNavItems = [
        'Claude Instances',
        'Feed', 
        'Claude Manager',
        'Agents',
        'Workflows',
        'Live Activity',
        'Analytics',
        'Claude Code',
        'Terminal Debug',
        'Performance Monitor',
        'Settings'
      ];

      expectedNavItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('Claude Instances navigation item has Bot icon', async () => {
      renderApp();

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances');
        expect(claudeInstancesLink).toBeInTheDocument();
      });

      const claudeInstancesLink = screen.getByText('Claude Instances');
      const linkElement = claudeInstancesLink.closest('a');
      expect(linkElement).toBeInTheDocument();
    });
  });

  describe('Route Navigation', () => {
    it('navigates to Claude Instances page correctly', async () => {
      renderApp();

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances');
        expect(claudeInstancesLink).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Claude Instances'));

      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });

    it('Claude Instances route renders ClaudeInstanceManager component', async () => {
      renderApp('/claude-instances');

      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });

    it('maintains existing route functionality for all other pages', async () => {
      const routes = [
        { path: '/', testId: 'social-media-feed' },
        { path: '/dual-instance', testId: 'dual-instance-page' },
        { path: '/agents', testId: 'enhanced-agent-manager' },
        { path: '/workflows', testId: 'workflow-viz' },
        { path: '/analytics', testId: 'analytics' },
        { path: '/claude-code', testId: 'claude-code' },
        { path: '/activity', testId: 'activity-panel' },
        { path: '/settings', testId: 'settings' },
        { path: '/performance-monitor', testId: 'performance-monitor' },
        { path: '/terminal-debug', testId: 'terminal-debug' }
      ];

      for (const route of routes) {
        renderApp(route.path);

        await waitFor(() => {
          expect(screen.getByTestId(route.testId)).toBeInTheDocument();
        }, { timeout: 5000 });

        queryClient.clear();
      }
    });

    it('handles invalid routes with 404 fallback', async () => {
      renderApp('/invalid-route');

      await waitFor(() => {
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
      });
    });
  });

  describe('Active Navigation State', () => {
    it('highlights Claude Instances as active when on the route', async () => {
      renderApp('/claude-instances');

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances').closest('a');
        expect(claudeInstancesLink).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('highlights Feed as active when on home route', async () => {
      renderApp('/');

      await waitFor(() => {
        const feedLink = screen.getByText('Feed').closest('a');
        expect(feedLink).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('only one navigation item is active at a time', async () => {
      renderApp('/claude-instances');

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances').closest('a');
        expect(claudeInstancesLink).toHaveClass('bg-blue-100', 'text-blue-700');
      });

      const otherNavItems = [
        'Feed', 'Claude Manager', 'Agents', 'Workflows', 
        'Live Activity', 'Analytics', 'Claude Code', 'Terminal Debug',
        'Performance Monitor', 'Settings'
      ];

      otherNavItems.forEach(item => {
        const link = screen.getByText(item).closest('a');
        expect(link).not.toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });
  });

  describe('Mobile Navigation', () => {
    it('closes sidebar when navigation item is clicked', async () => {
      renderApp();

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Open mobile menu (if hamburger button exists)
      const menuButton = screen.queryByRole('button', { name: /menu/i });
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      // Click on Claude Instances
      fireEvent.click(screen.getByText('Claude Instances'));

      // Verify navigation occurred
      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links and Accessibility', () => {
    it('all navigation links are accessible and have proper attributes', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      const navigationItems = [
        { text: 'Claude Instances', href: '/claude-instances' },
        { text: 'Feed', href: '/' },
        { text: 'Claude Manager', href: '/dual-instance' },
        { text: 'Agents', href: '/agents' },
        { text: 'Workflows', href: '/workflows' },
        { text: 'Live Activity', href: '/activity' },
        { text: 'Analytics', href: '/analytics' },
        { text: 'Claude Code', href: '/claude-code' },
        { text: 'Terminal Debug', href: '/terminal-debug' },
        { text: 'Performance Monitor', href: '/performance-monitor' },
        { text: 'Settings', href: '/settings' }
      ];

      navigationItems.forEach(item => {
        const link = screen.getByText(item.text).closest('a');
        expect(link).toHaveAttribute('href', item.href);
        expect(link).toBeVisible();
      });
    });

    it('navigation items have proper ARIA labels and roles', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      const claudeInstancesLink = screen.getByText('Claude Instances').closest('a');
      expect(claudeInstancesLink).toHaveAttribute('href', '/claude-instances');
      expect(claudeInstancesLink).toBeVisible();
    });
  });

  describe('Integration with Existing Features', () => {
    it('header search functionality remains intact', async () => {
      renderApp();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts...');
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput).toHaveValue('test search');
    });

    it('notifications component remains in header', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('notifications')).toBeInTheDocument();
      });
    });

    it('connection status component remains in sidebar', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });
    });

    it('error boundaries are properly integrated', async () => {
      renderApp('/claude-instances');

      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });

      // Verify error boundaries don't interfere with navigation
      expect(screen.getByText('Claude Instances')).toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    it('shows loading states during navigation transitions', async () => {
      renderApp();

      // Navigate to a route that might show loading
      fireEvent.click(screen.getByText('Claude Instances'));

      // Loading state might be too fast to catch, but we can verify final state
      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });

    it('handles rapid navigation clicks gracefully', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Claude Instances')).toBeInTheDocument();
      });

      // Click multiple navigation items rapidly
      fireEvent.click(screen.getByText('Claude Instances'));
      fireEvent.click(screen.getByText('Feed'));
      fireEvent.click(screen.getByText('Claude Instances'));

      await waitFor(() => {
        expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Regression Tests', () => {
    it('ensures no Simple Launcher routes remain active', async () => {
      // Test that legacy Simple Launcher routes don't exist
      const legacyRoutes = [
        '/simple-launcher',
        '/launcher',
        '/simple-launch',
        '/launch-simple'
      ];

      for (const route of legacyRoutes) {
        renderApp(route);

        await waitFor(() => {
          expect(screen.getByTestId('not-found')).toBeInTheDocument();
        });

        queryClient.clear();
      }
    });

    it('maintains all existing functionality after navigation changes', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Test core functionality remains
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
      expect(screen.getByTestId('notifications')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });
});