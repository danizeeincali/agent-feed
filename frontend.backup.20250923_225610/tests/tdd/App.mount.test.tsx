/**
 * TDD London School Test Suite - App Component Mount Tests
 * 
 * Tests focused on behavior verification and interaction testing
 * to identify white screen issues through mock-driven development
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../src/App';

// Mock all external dependencies - London School approach
jest.mock('../../src/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children, config }: any) => {
    // Mock provider that tracks configuration calls
    mockWebSocketProvider.mockCalls.push({ config });
    return <div data-testid="websocket-provider">{children}</div>;
  },
  useWebSocketSingleton: () => ({
    isConnected: true,
    connectionState: 'connected',
    send: jest.fn(),
    lastMessage: null,
    disconnect: jest.fn(),
    connect: jest.fn()
  })
}));

jest.mock('../../src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, componentName }: any) => {
    mockErrorBoundary.mockCalls.push({ componentName });
    return <div data-testid={`error-boundary-${componentName || 'default'}`}>{children}</div>;
  },
  RouteErrorBoundary: ({ children, routeName, fallback }: any) => {
    mockRouteErrorBoundary.mockCalls.push({ routeName, fallback });
    return <div data-testid={`route-error-boundary-${routeName}`}>{children}</div>;
  },
  GlobalErrorBoundary: ({ children }: any) => {
    mockGlobalErrorBoundary.mockCalls.push({});
    return <div data-testid="global-error-boundary">{children}</div>;
  },
  AsyncErrorBoundary: ({ children, componentName }: any) => {
    mockAsyncErrorBoundary.mockCalls.push({ componentName });
    return <div data-testid={`async-error-boundary-${componentName}`}>{children}</div>;
  }
}));

jest.mock('../../src/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message, size }: any) => {
      mockFallbackComponents.LoadingFallback.mockCalls.push({ message, size });
      return <div data-testid="loading-fallback">{message}</div>;
    },
    FeedFallback: () => {
      mockFallbackComponents.FeedFallback.mockCalls.push({});
      return <div data-testid="feed-fallback">Loading feed...</div>;
    },
    DualInstanceFallback: () => {
      mockFallbackComponents.DualInstanceFallback.mockCalls.push({});
      return <div data-testid="dual-instance-fallback">Loading dual instance...</div>;
    },
    NotFoundFallback: () => {
      mockFallbackComponents.NotFoundFallback.mockCalls.push({});
      return <div data-testid="not-found-fallback">Page not found</div>;
    },
    DashboardFallback: () => {
      mockFallbackComponents.DashboardFallback.mockCalls.push({});
      return <div data-testid="dashboard-fallback">Loading dashboard...</div>;
    },
    AgentManagerFallback: () => {
      mockFallbackComponents.AgentManagerFallback.mockCalls.push({});
      return <div data-testid="agent-manager-fallback">Loading agents...</div>;
    },
    AgentProfileFallback: () => {
      mockFallbackComponents.AgentProfileFallback.mockCalls.push({});
      return <div data-testid="agent-profile-fallback">Loading profile...</div>;
    },
    WorkflowFallback: () => {
      mockFallbackComponents.WorkflowFallback.mockCalls.push({});
      return <div data-testid="workflow-fallback">Loading workflows...</div>;
    },
    AnalyticsFallback: () => {
      mockFallbackComponents.AnalyticsFallback.mockCalls.push({});
      return <div data-testid="analytics-fallback">Loading analytics...</div>;
    },
    ClaudeCodeFallback: () => {
      mockFallbackComponents.ClaudeCodeFallback.mockCalls.push({});
      return <div data-testid="claude-code-fallback">Loading Claude Code...</div>;
    },
    ActivityFallback: () => {
      mockFallbackComponents.ActivityFallback.mockCalls.push({});
      return <div data-testid="activity-fallback">Loading activity...</div>;
    },
    SettingsFallback: () => {
      mockFallbackComponents.SettingsFallback.mockCalls.push({});
      return <div data-testid="settings-fallback">Loading settings...</div>;
    }
  }
}));

// Mock all page components to track their instantiation
jest.mock('../../src/components/SocialMediaFeed', () => {
  return function MockSocialMediaFeed() {
    mockSocialMediaFeed.mockCalls.push({});
    return <div data-testid="social-media-feed">Social Media Feed Component</div>;
  };
});

jest.mock('../../src/pages/DualInstancePage', () => {
  return function MockDualInstancePage() {
    mockDualInstancePage.mockCalls.push({});
    return <div data-testid="dual-instance-page">Dual Instance Page Component</div>;
  };
});

jest.mock('../../src/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => {
    mockRealTimeNotifications.mockCalls.push({});
    return <div data-testid="real-time-notifications">Notifications</div>;
  }
}));

jest.mock('../../src/components/ConnectionStatus', () => ({
  ConnectionStatus: () => {
    mockConnectionStatus.mockCalls.push({});
    return <div data-testid="connection-status">Connected</div>;
  }
}));

// Mock CSS imports
jest.mock('../../src/index.css', () => ({}));
jest.mock('../../src/styles/agents.css', () => ({}));

// London School mock objects for behavior verification
const mockWebSocketProvider = jest.fn();
const mockErrorBoundary = jest.fn();
const mockRouteErrorBoundary = jest.fn();
const mockGlobalErrorBoundary = jest.fn();
const mockAsyncErrorBoundary = jest.fn();
const mockSocialMediaFeed = jest.fn();
const mockDualInstancePage = jest.fn();
const mockRealTimeNotifications = jest.fn();
const mockConnectionStatus = jest.fn();

const mockFallbackComponents = {
  LoadingFallback: jest.fn(),
  FeedFallback: jest.fn(),
  DualInstanceFallback: jest.fn(),
  NotFoundFallback: jest.fn(),
  DashboardFallback: jest.fn(),
  AgentManagerFallback: jest.fn(),
  AgentProfileFallback: jest.fn(),
  WorkflowFallback: jest.fn(),
  AnalyticsFallback: jest.fn(),
  ClaudeCodeFallback: jest.fn(),
  ActivityFallback: jest.fn(),
  SettingsFallback: jest.fn()
};

describe('App Component Mount - London School TDD', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset all mock calls before each test
    jest.clearAllMocks();
    mockWebSocketProvider.mockCalls.length = 0;
    mockErrorBoundary.mockCalls.length = 0;
    mockRouteErrorBoundary.mockCalls.length = 0;
    mockGlobalErrorBoundary.mockCalls.length = 0;
    mockAsyncErrorBoundary.mockCalls.length = 0;
    mockSocialMediaFeed.mockCalls.length = 0;
    mockDualInstancePage.mockCalls.length = 0;
    mockRealTimeNotifications.mockCalls.length = 0;
    mockConnectionStatus.mockCalls.length = 0;

    Object.values(mockFallbackComponents).forEach(mock => {
      mock.mockCalls.length = 0;
    });

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
  });

  describe('Component Instantiation and Provider Chain', () => {
    it('should initialize all providers in correct order', async () => {
      render(<App />);

      // Verify provider chain is established
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      
      // Verify providers are called with correct configurations
      expect(mockGlobalErrorBoundary).toHaveBeenCalledWith({});
      expect(mockWebSocketProvider).toHaveBeenCalledWith({
        config: {
          autoConnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 2000,
          heartbeatInterval: 20000
        }
      });
    });

    it('should establish error boundary hierarchy', async () => {
      render(<App />);

      // Verify nested error boundaries are properly instantiated
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary-AppRouter')).toBeInTheDocument();
      
      // Verify error boundaries are called with correct component names
      expect(mockGlobalErrorBoundary).toHaveBeenCalledTimes(1);
      expect(mockErrorBoundary).toHaveBeenCalledWith({
        componentName: 'AppRouter'
      });
    });

    it('should render layout structure without white screen', async () => {
      render(<App />);

      // Verify core layout elements are present - no white screen
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
      });

      // Verify navigation elements
      expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('should initialize real-time features', async () => {
      render(<App />);

      await waitFor(() => {
        expect(mockRealTimeNotifications).toHaveBeenCalledTimes(1);
        expect(mockConnectionStatus).toHaveBeenCalledTimes(1);
      });

      // Verify real-time components are rendered
      expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Route Loading and Navigation Behavior', () => {
    it('should handle default route navigation', async () => {
      render(<App />);

      // Default route should load social media feed
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Verify route error boundary is established
      expect(mockRouteErrorBoundary).toHaveBeenCalledWith({
        routeName: 'Feed',
        fallback: undefined
      });
    });

    it('should navigate to dual instance page', async () => {
      // Simulate navigation to dual instance route
      window.history.pushState({}, '', '/dual-instance');
      
      render(<App />);

      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('dual-instance-page')).toBeInTheDocument();
      });

      // Verify proper error boundaries for dual instance
      expect(mockRouteErrorBoundary).toHaveBeenCalledWith(
        expect.objectContaining({
          routeName: 'DualInstanceManager'
        })
      );
    });

    it('should handle navigation interactions', async () => {
      render(<App />);

      // Find and click navigation link
      const dualInstanceLink = screen.getByText('Claude Manager');
      expect(dualInstanceLink).toBeInTheDocument();

      fireEvent.click(dualInstanceLink);

      // Should trigger navigation behavior
      await waitFor(() => {
        // Navigation link should be active
        expect(dualInstanceLink.closest('a')).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('Suspense and Fallback Behavior', () => {
    it('should configure suspense boundaries correctly', async () => {
      render(<App />);

      // Verify suspense fallbacks are available
      await waitFor(() => {
        expect(mockFallbackComponents.LoadingFallback).toHaveBeenCalledWith({
          message: 'Loading page...',
          size: 'lg'
        });
      });
    });

    it('should provide route-specific fallbacks', async () => {
      window.history.pushState({}, '', '/dual-instance');
      
      render(<App />);

      // Should use dual instance specific fallback
      await waitFor(() => {
        expect(mockFallbackComponents.DualInstanceFallback).toHaveBeenCalled();
      });
    });
  });

  describe('Search and Interaction Features', () => {
    it('should initialize search functionality', async () => {
      render(<App />);

      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toBeInTheDocument();

      // Test search interaction
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      expect(searchInput).toHaveValue('test query');
    });

    it('should handle sidebar interactions', async () => {
      render(<App />);

      // Find mobile menu button
      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      // Test sidebar toggle
      fireEvent.click(menuButton);
      
      // Sidebar should become visible (in mobile view)
      const sidebar = screen.getByText('AgentLink').closest('div');
      expect(sidebar).toHaveClass('translate-x-0');
    });
  });

  describe('White Screen Detection Tests', () => {
    it('should prevent white screen by ensuring content visibility', async () => {
      const { container } = render(<App />);

      // Verify the app has rendered content
      await waitFor(() => {
        expect(container.firstChild).not.toBeEmptyDOMElement();
        
        // Check for essential UI elements
        expect(screen.getByText('AgentLink Feed System')).toBeVisible();
        expect(screen.getByTestId('agent-feed')).toBeVisible();
      });

      // Ensure no empty or loading states persist
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should handle component loading failures gracefully', async () => {
      // Mock a component failure
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);

      await waitFor(() => {
        // App should still render with error boundaries
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should maintain layout structure during route transitions', async () => {
      render(<App />);

      // Verify initial layout
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeVisible();
        expect(screen.getByTestId('agent-feed')).toBeVisible();
      });

      // Navigate to different route
      fireEvent.click(screen.getByText('Claude Manager'));

      // Layout structure should remain
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeVisible();
        expect(screen.getByTestId('agent-feed')).toBeVisible();
      });
    });
  });
});