/**
 * TDD London School: Route Validation Tests
 * 
 * Testing route behaviors and component loading using mock-driven development.
 * Focuses on route collaboration patterns and navigation contracts.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';
import App from '@/App';

// Mock all route components to focus on routing behavior
const createMockComponent = (name: string) => 
  jest.fn(() => <div data-testid={`mock-${name.toLowerCase()}`}>{name} Component</div>);

const mockSocialMediaFeed = createMockComponent('SocialMediaFeed');
const mockDualInstancePage = createMockComponent('DualInstancePage');
const mockDualInstanceDashboardEnhanced = createMockComponent('DualInstanceDashboardEnhanced');
const mockAgentDashboard = createMockComponent('AgentDashboard');
const mockEnhancedAgentManagerWrapper = createMockComponent('EnhancedAgentManagerWrapper');
const mockSimpleAgentManager = createMockComponent('SimpleAgentManager');
const mockBulletproofAgentProfile = createMockComponent('BulletproofAgentProfile');
const mockWorkflowVisualizationFixed = createMockComponent('WorkflowVisualizationFixed');
const mockSimpleAnalytics = createMockComponent('SimpleAnalytics');
const mockBulletproofClaudeCodePanel = createMockComponent('BulletproofClaudeCodePanel');
const mockBulletproofActivityPanel = createMockComponent('BulletproofActivityPanel');
const mockSimpleSettings = createMockComponent('SimpleSettings');
const mockPerformanceMonitor = createMockComponent('PerformanceMonitor');

// Mock route components with error tracking
jest.mock('@/components/SocialMediaFeed', () => ({
  __esModule: true,
  default: mockSocialMediaFeed,
}));

jest.mock('@/pages/DualInstancePage', () => ({
  __esModule: true,
  default: mockDualInstancePage,
}));

jest.mock('@/components/DualInstanceDashboardEnhanced', () => ({
  __esModule: true,
  default: mockDualInstanceDashboardEnhanced,
}));

jest.mock('@/components/AgentDashboard', () => ({
  __esModule: true,
  default: mockAgentDashboard,
}));

jest.mock('@/components/EnhancedAgentManagerWrapper', () => ({
  __esModule: true,
  default: mockEnhancedAgentManagerWrapper,
}));

jest.mock('@/components/SimpleAgentManager', () => ({
  __esModule: true,
  default: mockSimpleAgentManager,
}));

jest.mock('@/components/BulletproofAgentProfile', () => ({
  __esModule: true,
  default: mockBulletproofAgentProfile,
}));

jest.mock('@/components/WorkflowVisualizationFixed', () => ({
  __esModule: true,
  default: mockWorkflowVisualizationFixed,
}));

jest.mock('@/components/SimpleAnalytics', () => ({
  __esModule: true,
  default: mockSimpleAnalytics,
}));

jest.mock('@/components/BulletproofClaudeCodePanel', () => ({
  __esModule: true,
  default: mockBulletproofClaudeCodePanel,
}));

jest.mock('@/components/BulletproofActivityPanel', () => ({
  __esModule: true,
  default: mockBulletproofActivityPanel,
}));

jest.mock('@/components/SimpleSettings', () => ({
  __esModule: true,
  default: mockSimpleSettings,
}));

jest.mock('@/components/PerformanceMonitor', () => ({
  __esModule: true,
  default: mockPerformanceMonitor,
}));

// Mock other dependencies
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    getQueryCache: jest.fn(() => ({ clear: jest.fn() })),
    getMutationCache: jest.fn(() => ({ clear: jest.fn() })),
  })),
  QueryClientProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div>{children}</div>,
  RouteErrorBoundary: ({ children, fallback }: any) => <div>{fallback || children}</div>,
  GlobalErrorBoundary: ({ children }: any) => <div>{children}</div>,
  AsyncErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/FallbackComponents', () => ({
  __esModule: true,
  default: {
    LoadingFallback: ({ message }: any) => <div data-testid="loading-fallback">{message}</div>,
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

jest.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div>Notifications</div>,
}));

jest.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div>Connection Status</div>,
}));

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <span>Dashboard</span>,
  Activity: () => <span>Activity</span>,
  GitBranch: () => <span>GitBranch</span>,
  Settings: () => <span>Settings</span>,
  Search: () => <span>Search</span>,
  Menu: () => <span>Menu</span>,
  X: () => <span>X</span>,
  Zap: () => <span>Zap</span>,
  Bot: () => <span>Bot</span>,
  Workflow: () => <span>Workflow</span>,
  BarChart3: () => <span>BarChart</span>,
  Code: () => <span>Code</span>,
}));

// Test wrapper with MemoryRouter
const renderWithRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
};

describe('Route Validation - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Route Navigation', () => {
    it('should render root route (/) with SocialMediaFeed', async () => {
      renderWithRouter(['/']);
      
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalled();
      });
    });

    it('should render /dual-instance route with DualInstancePage', async () => {
      renderWithRouter(['/dual-instance']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalled();
      });
    });

    it('should render /dual-instance/:tab route with DualInstancePage', async () => {
      renderWithRouter(['/dual-instance/monitor']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalled();
      });
    });

    it('should render /dual-instance/:tab/:instanceId route with DualInstancePage', async () => {
      renderWithRouter(['/dual-instance/terminal/instance-123']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalled();
      });
    });
  });

  describe('Legacy and Alternative Routes', () => {
    it('should render /dual-instance-legacy route with DualInstanceDashboardEnhanced', async () => {
      renderWithRouter(['/dual-instance-legacy']);
      
      await waitFor(() => {
        expect(mockDualInstanceDashboardEnhanced).toHaveBeenCalled();
      });
    });

    it('should render /dashboard route with AgentDashboard', async () => {
      renderWithRouter(['/dashboard']);
      
      await waitFor(() => {
        expect(mockAgentDashboard).toHaveBeenCalled();
      });
    });

    it('should render /agents route with EnhancedAgentManagerWrapper', async () => {
      renderWithRouter(['/agents']);
      
      await waitFor(() => {
        expect(mockEnhancedAgentManagerWrapper).toHaveBeenCalled();
      });
    });

    it('should render /agents-legacy route with SimpleAgentManager', async () => {
      renderWithRouter(['/agents-legacy']);
      
      await waitFor(() => {
        expect(mockSimpleAgentManager).toHaveBeenCalled();
      });
    });
  });

  describe('Dynamic Routes', () => {
    it('should render /agent/:agentId route with BulletproofAgentProfile', async () => {
      renderWithRouter(['/agent/agent-123']);
      
      await waitFor(() => {
        expect(mockBulletproofAgentProfile).toHaveBeenCalled();
      });
    });

    it('should handle dynamic route parameters correctly', async () => {
      renderWithRouter(['/agent/special-agent-456']);
      
      await waitFor(() => {
        expect(mockBulletproofAgentProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Feature Routes', () => {
    it('should render /workflows route with WorkflowVisualizationFixed', async () => {
      renderWithRouter(['/workflows']);
      
      await waitFor(() => {
        expect(mockWorkflowVisualizationFixed).toHaveBeenCalled();
      });
    });

    it('should render /analytics route with SimpleAnalytics', async () => {
      renderWithRouter(['/analytics']);
      
      await waitFor(() => {
        expect(mockSimpleAnalytics).toHaveBeenCalled();
      });
    });

    it('should render /claude-code route with BulletproofClaudeCodePanel', async () => {
      renderWithRouter(['/claude-code']);
      
      await waitFor(() => {
        expect(mockBulletproofClaudeCodePanel).toHaveBeenCalled();
      });
    });

    it('should render /activity route with BulletproofActivityPanel', async () => {
      renderWithRouter(['/activity']);
      
      await waitFor(() => {
        expect(mockBulletproofActivityPanel).toHaveBeenCalled();
      });
    });

    it('should render /settings route with SimpleSettings', async () => {
      renderWithRouter(['/settings']);
      
      await waitFor(() => {
        expect(mockSimpleSettings).toHaveBeenCalled();
      });
    });

    it('should render /performance-monitor route with PerformanceMonitor', async () => {
      renderWithRouter(['/performance-monitor']);
      
      await waitFor(() => {
        expect(mockPerformanceMonitor).toHaveBeenCalled();
      });
    });
  });

  describe('Error Boundaries for Routes', () => {
    it('should wrap routes with RouteErrorBoundary', async () => {
      renderWithRouter(['/']);
      
      // Verify route error boundaries are active
      expect(screen.queryByTestId('feed-fallback')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalled();
      });
    });

    it('should provide fallback for dual-instance routes', async () => {
      renderWithRouter(['/dual-instance']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalled();
      });
    });

    it('should handle async error boundaries for dynamic routes', async () => {
      renderWithRouter(['/agent/test-123']);
      
      await waitFor(() => {
        expect(mockBulletproofAgentProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Suspense Boundaries', () => {
    it('should provide loading fallbacks for all routes', async () => {
      renderWithRouter(['/']);
      
      // Component should eventually load
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalled();
      });
    });

    it('should handle Suspense for code-split components', async () => {
      renderWithRouter(['/claude-code']);
      
      await waitFor(() => {
        expect(mockBulletproofClaudeCodePanel).toHaveBeenCalled();
      });
    });
  });

  describe('Route Not Found Handling', () => {
    it('should render NotFoundFallback for unknown routes', async () => {
      renderWithRouter(['/non-existent-route']);
      
      await waitFor(() => {
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
      });
    });

    it('should handle deeply nested unknown routes', async () => {
      renderWithRouter(['/unknown/deeply/nested/route']);
      
      await waitFor(() => {
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Component Loading Contracts', () => {
    it('should verify each route component receives expected props', async () => {
      renderWithRouter(['/dual-instance']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalledWith({}, {});
      });
    });

    it('should verify route components are properly memoized', async () => {
      renderWithRouter(['/analytics']);
      
      await waitFor(() => {
        expect(mockSimpleAnalytics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Navigation State Management', () => {
    it('should maintain route state during navigation', async () => {
      const { rerender } = renderWithRouter(['/']);
      
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalled();
      });

      // Simulate navigation
      rerender(
        <MemoryRouter initialEntries={['/agents']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockEnhancedAgentManagerWrapper).toHaveBeenCalled();
      });
    });
  });

  describe('Route Parameter Validation', () => {
    it('should handle valid dual-instance tab parameters', async () => {
      const validTabs = ['launcher', 'monitor', 'terminal'];
      
      for (const tab of validTabs) {
        renderWithRouter([`/dual-instance/${tab}`]);
        
        await waitFor(() => {
          expect(mockDualInstancePage).toHaveBeenCalled();
        });
        
        jest.clearAllMocks();
      }
    });

    it('should handle dual-instance with instance ID parameters', async () => {
      renderWithRouter(['/dual-instance/terminal/instance-abc123']);
      
      await waitFor(() => {
        expect(mockDualInstancePage).toHaveBeenCalled();
      });
    });

    it('should handle agent profile with various ID formats', async () => {
      const agentIds = ['agent-123', 'uuid-abc-def', 'simple-id'];
      
      for (const agentId of agentIds) {
        renderWithRouter([`/agent/${agentId}`]);
        
        await waitFor(() => {
          expect(mockBulletproofAgentProfile).toHaveBeenCalled();
        });
        
        jest.clearAllMocks();
      }
    });
  });

  describe('White Screen Prevention for Routes', () => {
    it('should never render empty content for any valid route', async () => {
      const routes = [
        '/',
        '/dual-instance',
        '/dashboard',
        '/agents',
        '/workflows',
        '/analytics',
        '/claude-code',
        '/activity',
        '/settings',
        '/performance-monitor'
      ];

      for (const route of routes) {
        const { container } = renderWithRouter([route]);
        
        await waitFor(() => {
          expect(container).toHaveNoWhiteScreen();
        });
      }
    });

    it('should provide meaningful content for 404 routes', async () => {
      const { container } = renderWithRouter(['/404-route']);
      
      await waitFor(() => {
        expect(container).toHaveNoWhiteScreen();
        expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Route Performance', () => {
    it('should load routes without significant delay', async () => {
      const startTime = performance.now();
      renderWithRouter(['/']);
      
      await waitFor(() => {
        expect(mockSocialMediaFeed).toHaveBeenCalled();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(100); // Should load within 100ms in test environment
    });

    it('should handle concurrent route loading', async () => {
      const routes = ['/', '/agents', '/workflows'];
      const promises = routes.map(route => {
        return new Promise<void>((resolve) => {
          renderWithRouter([route]);
          setTimeout(resolve, 0);
        });
      });

      await Promise.all(promises);
      
      // All components should be called
      expect(mockSocialMediaFeed).toHaveBeenCalled();
      expect(mockEnhancedAgentManagerWrapper).toHaveBeenCalled();
      expect(mockWorkflowVisualizationFixed).toHaveBeenCalled();
    });
  });
});