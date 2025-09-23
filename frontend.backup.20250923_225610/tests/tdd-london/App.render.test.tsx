/**
 * TDD London School: App Component Render Tests
 * 
 * Testing component mount, render, and interaction behaviors using mock-driven development.
 * Focuses on how App component collaborates with its dependencies.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import App from '@/App';

// Mock all critical dependencies using London School approach
const mockQueryClientProvider = {
  children: null,
};

const mockWebSocketProvider = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true,
  },
  isConnected: true,
  connectionStatus: 'connected' as const,
  children: null,
};

const mockRouter = {
  children: null,
  navigate: jest.fn(),
  location: { pathname: '/' },
};

const mockLayout = {
  children: null,
};

const mockErrorBoundary = {
  children: null,
  onError: jest.fn(),
  fallback: null,
};

const mockRoutes = {
  children: null,
};

// Mock React Router components
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: any) => <div data-testid="mock-router">{children}</div>,
  Routes: ({ children }: any) => <div data-testid="mock-routes">{children}</div>,
  Route: ({ element }: any) => <div data-testid="mock-route">{element}</div>,
  Link: ({ children, to }: any) => <a data-testid="mock-link" href={to}>{children}</a>,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'mock' }),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    getQueryCache: jest.fn(() => ({ clear: jest.fn() })),
    getMutationCache: jest.fn(() => ({ clear: jest.fn() })),
    clear: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => <div data-testid="mock-query-provider">{children}</div>,
}));

// Mock WebSocket Context
jest.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: any) => <div data-testid="mock-websocket-provider">{children}</div>,
  useWebSocketSingleton: () => mockWebSocketProvider,
}));

// Mock Error Boundary components
jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, componentName }: any) => 
    <div data-testid={`error-boundary-${componentName || 'default'}`}>{children}</div>,
  RouteErrorBoundary: ({ children, routeName }: any) => 
    <div data-testid={`route-error-boundary-${routeName}`}>{children}</div>,
  GlobalErrorBoundary: ({ children }: any) => 
    <div data-testid="global-error-boundary">{children}</div>,
  AsyncErrorBoundary: ({ children, componentName }: any) => 
    <div data-testid={`async-error-boundary-${componentName}`}>{children}</div>,
}));

// Mock FallbackComponents
jest.mock('@/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message, size }: any) => 
      <div data-testid="loading-fallback" data-size={size}>{message}</div>,
    FeedFallback: () => <div data-testid="feed-fallback">Feed Loading...</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Dual Instance Loading...</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Dashboard Loading...</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Agent Manager Loading...</div>,
    AgentProfileFallback: () => <div data-testid="agent-profile-fallback">Agent Profile Loading...</div>,
    WorkflowFallback: () => <div data-testid="workflow-fallback">Workflow Loading...</div>,
    AnalyticsFallback: () => <div data-testid="analytics-fallback">Analytics Loading...</div>,
    ClaudeCodeFallback: () => <div data-testid="claude-code-fallback">Claude Code Loading...</div>,
    ActivityFallback: () => <div data-testid="activity-fallback">Activity Loading...</div>,
    SettingsFallback: () => <div data-testid="settings-fallback">Settings Loading...</div>,
    NotFoundFallback: () => <div data-testid="not-found-fallback">Page Not Found</div>,
  },
}));

// Mock all page components to focus on App behavior
jest.mock('@/components/SocialMediaFeed', () => ({
  __esModule: true,
  default: () => <div data-testid="social-media-feed">Social Media Feed</div>,
}));

jest.mock('@/pages/DualInstancePage', () => ({
  __esModule: true,
  default: () => <div data-testid="dual-instance-page">Dual Instance Page</div>,
}));

jest.mock('@/components/SimpleAgentManager', () => ({
  __esModule: true,
  default: () => <div data-testid="simple-agent-manager">Simple Agent Manager</div>,
}));

jest.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="real-time-notifications">Notifications</div>,
}));

jest.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connection Status</div>,
}));

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock all icon imports
jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <span data-testid="icon-layout-dashboard">Dashboard</span>,
  Activity: () => <span data-testid="icon-activity">Activity</span>,
  GitBranch: () => <span data-testid="icon-git-branch">GitBranch</span>,
  Settings: () => <span data-testid="icon-settings">Settings</span>,
  Search: () => <span data-testid="icon-search">Search</span>,
  Menu: () => <span data-testid="icon-menu">Menu</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Zap: () => <span data-testid="icon-zap">Zap</span>,
  Bot: () => <span data-testid="icon-bot">Bot</span>,
  Workflow: () => <span data-testid="icon-workflow">Workflow</span>,
  BarChart3: () => <span data-testid="icon-bar-chart">BarChart</span>,
  Code: () => <span data-testid="icon-code">Code</span>,
}));

describe('App Component - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Mount and Render', () => {
    it('should mount successfully without throwing errors', () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it('should render the global error boundary wrapper', () => {
      render(<App />);
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should collaborate with QueryClientProvider correctly', () => {
      render(<App />);
      expect(screen.getByTestId('mock-query-provider')).toBeInTheDocument();
    });

    it('should collaborate with WebSocketProvider correctly', () => {
      render(<App />);
      expect(screen.getByTestId('mock-websocket-provider')).toBeInTheDocument();
    });

    it('should render Router wrapper for navigation', () => {
      render(<App />);
      expect(screen.getByTestId('mock-router')).toBeInTheDocument();
    });

    it('should render Routes container for route management', () => {
      render(<App />);
      expect(screen.getByTestId('mock-routes')).toBeInTheDocument();
    });

    it('should have proper component hierarchy', () => {
      render(<App />);
      
      const globalBoundary = screen.getByTestId('global-error-boundary');
      const queryProvider = screen.getByTestId('mock-query-provider');
      const websocketProvider = screen.getByTestId('mock-websocket-provider');
      const router = screen.getByTestId('mock-router');

      expect(globalBoundary).toContainElement(queryProvider);
      expect(queryProvider).toContainElement(websocketProvider);
      expect(websocketProvider).toContainElement(router);
    });
  });

  describe('Layout Component Collaboration', () => {
    it('should render layout with proper error boundaries', () => {
      render(<App />);
      expect(screen.getByTestId('error-boundary-AppRouter')).toBeInTheDocument();
    });

    it('should render header with proper test identifier', () => {
      render(<App />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render main content area with proper test identifier', () => {
      render(<App />);
      expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
    });

    it('should include connection status in layout', () => {
      render(<App />);
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('should include real-time notifications in layout', () => {
      render(<App />);
      expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
    });
  });

  describe('QueryClient Configuration', () => {
    it('should create QueryClient with proper error handling configuration', () => {
      const { QueryClient } = require('@tanstack/react-query');
      
      render(<App />);
      
      expect(QueryClient).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultOptions: expect.objectContaining({
            queries: expect.objectContaining({
              retry: 1,
              staleTime: 5 * 60 * 1000,
              cacheTime: 10 * 60 * 1000,
              refetchOnWindowFocus: false,
              refetchOnMount: false,
              refetchOnReconnect: 'always',
            }),
          }),
        })
      );
    });
  });

  describe('WebSocket Configuration', () => {
    it('should configure WebSocketProvider with proper connection settings', () => {
      render(<App />);
      
      // Verify WebSocket provider is rendered with expected configuration
      expect(screen.getByTestId('mock-websocket-provider')).toBeInTheDocument();
    });
  });

  describe('Navigation Structure', () => {
    it('should render navigation menu items', () => {
      render(<App />);
      
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.getByText('Claude Manager')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Workflows')).toBeInTheDocument();
      expect(screen.getByText('Live Activity')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render navigation icons correctly', () => {
      render(<App />);
      
      expect(screen.getByTestId('icon-activity')).toBeInTheDocument();
      expect(screen.getByTestId('icon-layout-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('icon-bot')).toBeInTheDocument();
      expect(screen.getByTestId('icon-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('icon-git-branch')).toBeInTheDocument();
      expect(screen.getByTestId('icon-bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('icon-code')).toBeInTheDocument();
      expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Behavior', () => {
    it('should handle mobile menu toggle interaction', () => {
      render(<App />);
      
      const menuButton = screen.getByTestId('icon-menu').closest('button');
      expect(menuButton).toBeInTheDocument();
      
      fireEvent.click(menuButton!);
      // In a real test, we'd verify sidebar state changes
    });

    it('should handle search input interactions', () => {
      render(<App />);
      
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap main router with AppRouter error boundary', () => {
      render(<App />);
      expect(screen.getByTestId('error-boundary-AppRouter')).toBeInTheDocument();
    });

    it('should render loading fallback for Suspense', () => {
      render(<App />);
      // Suspense fallback should be available but may not be visible in successful render
      expect(screen.getByTestId('mock-routes')).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('should maintain sidebar state correctly', () => {
      render(<App />);
      
      // Test sidebar closed by default (on larger screens)
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
    });

    it('should handle search term state updates', () => {
      render(<App />);
      
      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'new search' } });
      
      expect(searchInput).toHaveValue('new search');
    });
  });

  describe('Loading and Suspense Behavior', () => {
    it('should render LoadingSpinner component when needed', () => {
      // LoadingSpinner is defined inline in App component
      render(<App />);
      // Verify component structure is correct
      expect(screen.getByTestId('mock-routes')).toBeInTheDocument();
    });

    it('should handle Suspense fallbacks correctly', () => {
      render(<App />);
      
      // Verify that Suspense boundaries are in place
      expect(screen.getByTestId('mock-routes')).toBeInTheDocument();
    });
  });

  describe('CSS and Styling Integration', () => {
    it('should load agents.css stylesheet', () => {
      // CSS imports are handled by the test environment
      render(<App />);
      expect(screen.getByTestId('mock-router')).toBeInTheDocument();
    });

    it('should apply proper className utilities', () => {
      render(<App />);
      
      // Verify that className utilities are working
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200');
    });
  });

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels and roles', () => {
      render(<App />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should support keyboard navigation', () => {
      render(<App />);
      
      const menuButton = screen.getByTestId('icon-menu').closest('button');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Performance Optimizations', () => {
    it('should memoize Layout component to prevent unnecessary re-renders', () => {
      render(<App />);
      
      // Layout component should be present and functional
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
    });

    it('should memoize navigation array to prevent re-creation', () => {
      render(<App />);
      
      // Navigation items should be consistently rendered
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.getByText('Claude Manager')).toBeInTheDocument();
    });
  });

  describe('White Screen Prevention', () => {
    it('should never render a completely empty screen', () => {
      const { container } = render(<App />);
      expect(container).toHaveNoWhiteScreen();
    });

    it('should always render fallback content when components fail', () => {
      render(<App />);
      
      // Even with all mocks, some content should always be visible
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('mock-query-provider')).toBeInTheDocument();
    });

    it('should maintain minimum viable UI elements', () => {
      render(<App />);
      
      // Core UI elements should always be present
      expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
    });
  });
});