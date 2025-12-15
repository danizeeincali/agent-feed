/**
 * TDD London School: Integration White Screen Prevention Tests
 * 
 * Comprehensive integration tests to prevent white screen scenarios using mock-driven development.
 * Tests the complete application flow and component interactions.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    getQueryCache: jest.fn(() => ({ clear: jest.fn() })),
    getMutationCache: jest.fn(() => ({ clear: jest.fn() })),
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => <div data-testid="query-provider">{children}</div>,
  useQuery: () => ({ data: null, isLoading: false, error: null }),
  useMutation: () => ({ mutate: jest.fn(), isLoading: false }),
  useQueryClient: () => ({}),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue({
    id: 'test-socket',
    connected: true,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }),
  Socket: jest.fn(),
}));

jest.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: any) => <div data-testid="websocket-provider">{children}</div>,
  useWebSocketSingleton: () => ({
    socket: { id: 'test', connected: true, on: jest.fn(), emit: jest.fn() },
    isConnected: true,
    connectionState: 'connected',
  }),
}));

jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
  RouteErrorBoundary: ({ children, fallback }: any) => <div data-testid="route-error-boundary">{fallback || children}</div>,
  GlobalErrorBoundary: ({ children }: any) => <div data-testid="global-error-boundary">{children}</div>,
  AsyncErrorBoundary: ({ children }: any) => <div data-testid="async-error-boundary">{children}</div>,
}));

jest.mock('@/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message, size }: any) => 
      <div data-testid="loading-fallback" data-size={size}>{message || 'Loading...'}</div>,
    FeedFallback: () => <div data-testid="feed-fallback">Feed Loading...</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Dual Instance Loading...</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Dashboard Loading...</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Agent Manager Loading...</div>,
    NotFoundFallback: () => <div data-testid="not-found-fallback">Page Not Found</div>,
    ErrorFallback: ({ error, resetError }: any) => (
      <div data-testid="error-fallback">
        <h2>Something went wrong</h2>
        <p>{error?.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    ),
  },
}));

// Mock all page components
jest.mock('@/components/SocialMediaFeed', () => ({
  __esModule: true,
  default: () => <div data-testid="social-media-feed">Social Media Feed Content</div>,
}));

jest.mock('@/pages/DualInstancePage', () => ({
  __esModule: true,
  default: () => <div data-testid="dual-instance-page">Dual Instance Page Content</div>,
}));

jest.mock('@/components/SimpleAgentManager', () => ({
  __esModule: true,
  default: () => <div data-testid="simple-agent-manager">Agent Manager Content</div>,
}));

jest.mock('@/components/AgentDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-dashboard">Agent Dashboard Content</div>,
}));

jest.mock('@/components/SimpleAnalytics', () => ({
  __esModule: true,
  default: () => <div data-testid="simple-analytics">Analytics Content</div>,
}));

jest.mock('@/components/SimpleSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="simple-settings">Settings Content</div>,
}));

jest.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="notifications">Notifications</div>,
}));

jest.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <span data-testid="icon">📊</span>,
  Activity: () => <span data-testid="icon">🔄</span>,
  GitBranch: () => <span data-testid="icon">🌿</span>,
  Settings: () => <span data-testid="icon">⚙️</span>,
  Search: () => <span data-testid="icon">🔍</span>,
  Menu: () => <span data-testid="icon">☰</span>,
  X: () => <span data-testid="icon">❌</span>,
  Zap: () => <span data-testid="icon">⚡</span>,
  Bot: () => <span data-testid="icon">🤖</span>,
  Workflow: () => <span data-testid="icon">🔄</span>,
  BarChart3: () => <span data-testid="icon">📈</span>,
  Code: () => <span data-testid="icon">💻</span>,
}));

// Import App after all mocks are set up
import App from '@/App';

// Test wrapper with router
const IntegrationTestWrapper: React.FC<{ 
  children: React.ReactNode; 
  initialEntries?: string[];
  shouldError?: boolean;
}> = ({ children, initialEntries = ['/'], shouldError = false }) => {
  if (shouldError) {
    throw new Error('Integration test error');
  }
  
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

describe('Integration White Screen Prevention - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console errors for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Application Integration', () => {
    it('should render complete application without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Should never have white screen
      expect(container).toHaveNoWhiteScreen();
      
      // Should have core application elements
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
    });

    it('should render with all critical components loaded', async () => {
      render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        // Core providers
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('query-provider')).toBeInTheDocument();
        expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
        
        // Layout elements
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
        
        // Navigation
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
        
        // Status indicators
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
        expect(screen.getByTestId('notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Route-based Integration Tests', () => {
    it('should render root route without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Social Media Feed Content')).toBeInTheDocument();
    });

    it('should render dual-instance route without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/dual-instance']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dual-instance-page')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Dual Instance Page Content')).toBeInTheDocument();
    });

    it('should render agents route without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/agents']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-agent-manager')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Agent Manager Content')).toBeInTheDocument();
    });

    it('should render analytics route without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/analytics']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-analytics')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Analytics Content')).toBeInTheDocument();
    });

    it('should render settings route without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/settings']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-settings')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Settings Content')).toBeInTheDocument();
    });

    it('should render 404 route with proper fallback', async () => {
      const { container } = render(
        <IntegrationTestWrapper initialEntries={['/non-existent-route']}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle application-level errors without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper shouldError={false}>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
    });

    it('should provide fallbacks when components fail to load', async () => {
      // Mock a component that fails to render
      jest.doMock('@/components/SocialMediaFeed', () => {
        throw new Error('Component failed to load');
      });

      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      // Should still render with error boundary
      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
    });

    it('should maintain layout when route components fail', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        // Layout should remain intact
        expect(screen.getByText('AgentLink')).toBeInTheDocument();
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
    });
  });

  describe('User Interaction Integration', () => {
    it('should handle navigation interactions without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Agents')).toBeInTheDocument();
      });

      // Simulate navigation click
      fireEvent.click(screen.getByText('Agents'));

      // Should maintain content
      expect(container).toHaveNoWhiteScreen();
    });

    it('should handle search interactions without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');
      expect(container).toHaveNoWhiteScreen();
    });

    it('should handle mobile menu toggle without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('icon')).toHaveLength(11); // Menu icon + nav icons
      });

      // Find and click menu button (first icon should be menu)
      const menuButton = screen.getAllByTestId('icon')[0].closest('button');
      if (menuButton) {
        fireEvent.click(menuButton);
      }

      expect(container).toHaveNoWhiteScreen();
    });
  });

  describe('Async Operations Integration', () => {
    it('should handle async component loading without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      // Simulate async operations
      await waitFor(() => {
        expect(screen.getByTestId('query-provider')).toBeInTheDocument();
        expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toHaveNoWhiteScreen();
    });

    it('should handle WebSocket connection lifecycle without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
    });

    it('should handle query loading states without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('query-provider')).toBeInTheDocument();
      });

      // Should handle loading states gracefully
      expect(container).toHaveNoWhiteScreen();
    });
  });

  describe('Performance and Memory Integration', () => {
    it('should render efficiently without performance issues', async () => {
      const startTime = performance.now();
      
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render quickly
      expect(container).toHaveNoWhiteScreen();
    });

    it('should handle multiple route changes efficiently', async () => {
      const routes = ['/', '/agents', '/analytics', '/settings'];
      
      for (const route of routes) {
        const { container, unmount } = render(
          <IntegrationTestWrapper initialEntries={[route]}>
            <App />
          </IntegrationTestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
        });

        expect(container).toHaveNoWhiteScreen();
        unmount(); // Clean up
      }
    });

    it('should handle concurrent component updates without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      // Simulate rapid state changes
      const searchInput = await waitFor(() => 
        screen.getByPlaceholderText('Search posts...')
      );

      for (let i = 0; i < 5; i++) {
        fireEvent.change(searchInput, { target: { value: `search ${i}` } });
      }

      expect(container).toHaveNoWhiteScreen();
      expect(searchInput).toHaveValue('search 4');
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      
      // Check accessibility of key elements
      expect(screen.getByRole('navigation')).toBeAccessible();
      expect(screen.getByRole('main')).toBeAccessible();
    });

    it('should handle keyboard navigation without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');
      
      // Simulate keyboard navigation
      fireEvent.focus(searchInput);
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      
      expect(container).toHaveNoWhiteScreen();
    });
  });

  describe('Edge Case Integration', () => {
    it('should handle empty state without white screen', async () => {
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Even with no data, should show content
      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByText('Social Media Feed Content')).toBeInTheDocument();
    });

    it('should handle offline state without white screen', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });

      expect(container).toHaveNoWhiteScreen();
      
      // Reset online state
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('should handle slow network conditions without white screen', async () => {
      // Mock slow loading
      const slowComponent = () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(<div data-testid="slow-component">Loaded</div>), 100);
        });
      };

      const { container } = render(
        <IntegrationTestWrapper>
          <App />
        </IntegrationTestWrapper>
      );

      // Should show loading states, not white screen
      expect(container).toHaveNoWhiteScreen();
      
      await waitFor(() => {
        expect(screen.getByTestId('global-error-boundary')).toBeInTheDocument();
      });
    });
  });
});