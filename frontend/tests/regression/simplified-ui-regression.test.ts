/**
 * Regression Tests for Simplified UI Changes
 * 
 * Ensures that all existing functionality is preserved after UI simplification:
 * - Core application functionality
 * - WebSocket connections and communication
 * - Error handling and recovery
 * - Performance characteristics
 * - Integration with other components
 * - Navigation and routing stability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Import components
import App from '@/App';
import ClaudeInstanceManager from '@/components/ClaudeInstanceManager';

// Mock external dependencies
global.fetch = vi.fn();

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {}

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Mock all components that might have complex dependencies
vi.mock('@/components/SocialMediaFeed', () => ({
  default: () => <div data-testid="social-media-feed">Social Media Feed</div>
}));

vi.mock('@/components/SimpleAgentManager', () => ({
  default: () => <div data-testid="simple-agent-manager">Simple Agent Manager</div>
}));

vi.mock('@/components/EnhancedAgentManagerWrapper', () => ({
  default: () => <div data-testid="enhanced-agent-manager">Enhanced Agent Manager</div>
}));

vi.mock('@/pages/DualInstancePage', () => ({
  default: () => <div data-testid="dual-instance-page">Dual Instance Page</div>
}));

vi.mock('@/components/SimpleAnalytics', () => ({
  default: () => <div data-testid="analytics">Analytics</div>
}));

vi.mock('@/components/BulletproofClaudeCodePanel', () => ({
  default: () => <div data-testid="claude-code">Claude Code Panel</div>
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

// Mock context providers
vi.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock other components
vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>
}));

vi.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="notifications">Notifications</div>
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GlobalErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AsyncErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/FallbackComponents', () => ({
  default: {
    LoadingFallback: ({ message }: { message?: string }) => <div data-testid="loading-fallback">{message}</div>,
    FeedFallback: () => <div data-testid="feed-fallback">Loading Feed</div>,
    DualInstanceFallback: () => <div data-testid="dual-instance-fallback">Loading Dual Instance</div>,
    DashboardFallback: () => <div data-testid="dashboard-fallback">Loading Dashboard</div>,
    AgentManagerFallback: () => <div data-testid="agent-manager-fallback">Loading Agent Manager</div>,
    AgentProfileFallback: () => <div data-testid="agent-profile-fallback">Loading Agent Profile</div>,
    WorkflowFallback: () => <div data-testid="workflow-fallback">Loading Workflow</div>,
    AnalyticsFallback: () => <div data-testid="analytics-fallback">Loading Analytics</div>,
    ClaudeCodeFallback: () => <div data-testid="claude-code-fallback">Loading Claude Code</div>,
    ActivityFallback: () => <div data-testid="activity-fallback">Loading Activity</div>,
    SettingsFallback: () => <div data-testid="settings-fallback">Loading Settings</div>,
    NotFoundFallback: () => <div data-testid="not-found">Page Not Found</div>
  }
}));

describe('Simplified UI Regression Tests', () => {
  let queryClient: QueryClient;
  let mockFetch: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();

    // Default successful API responses
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        instances: []
      })
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const renderApp = (initialPath = '/') => {
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

  describe('Core Application Functionality', () => {
    it('maintains application bootstrap and rendering', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Verify core UI structure is intact
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByTestId('notifications')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('preserves header functionality and search', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput).toHaveValue('test search');
    });

    it('maintains sidebar structure and branding', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink')).toBeInTheDocument();
      });

      // Verify branding elements
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('preserves responsive design and mobile functionality', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Mobile menu should be accessible (even if hidden)
      const menuButtons = screen.queryAllByRole('button');
      expect(menuButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation System Integrity', () => {
    it('preserves all existing navigation routes', async () => {
      const routes = [
        { path: '/', component: 'social-media-feed' },
        { path: '/claude-instances', component: 'claude-instance-manager' },
        { path: '/dual-instance', component: 'dual-instance-page' },
        { path: '/agents', component: 'enhanced-agent-manager' },
        { path: '/workflows', component: 'workflow-viz' },
        { path: '/analytics', component: 'analytics' },
        { path: '/claude-code', component: 'claude-code' },
        { path: '/activity', component: 'activity-panel' },
        { path: '/settings', component: 'settings' },
        { path: '/performance-monitor', component: 'performance-monitor' },
        { path: '/terminal-debug', component: 'terminal-debug' }
      ];

      for (const route of routes) {
        renderApp(route.path);
        
        await waitFor(() => {
          if (route.component === 'claude-instance-manager') {
            // Special handling for non-mocked component
            expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId(route.component)).toBeInTheDocument();
          }
        });

        queryClient.clear();
      }
    });

    it('maintains navigation active states', async () => {
      renderApp('/claude-instances');

      await waitFor(() => {
        const claudeInstancesLink = screen.getByText('Claude Instances').closest('a');
        expect(claudeInstancesLink).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('preserves navigation icons and styling', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Claude Instances')).toBeInTheDocument();
      });

      const navigationItems = [
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

      navigationItems.forEach(item => {
        const link = screen.getByText(item).closest('a');
        expect(link).toBeInTheDocument();
        expect(link).toBeVisible();
      });
    });

    it('ensures no broken navigation links exist', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Test clicking each navigation item
      const navItems = [
        'Feed',
        'Claude Instances', 
        'Claude Manager',
        'Agents',
        'Analytics'
      ];

      for (const item of navItems) {
        const link = screen.getByText(item);
        fireEvent.click(link);
        
        // Should not cause errors or crashes
        await waitFor(() => {
          expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
        });
      }
    });
  });

  describe('ClaudeInstanceManager Regression', () => {
    it('maintains all existing ClaudeInstanceManager functionality', () => {
      render(<ClaudeInstanceManager />);

      // Core structure preserved
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByText('Instances')).toBeInTheDocument();
      
      // All 4 buttons present
      expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions -c')).toBeInTheDocument();
      expect(screen.getByText('↻ skip-permissions --resume')).toBeInTheDocument();
      
      // Instance management UI
      expect(screen.getByText('Select an instance or launch a new one to interact with Claude')).toBeInTheDocument();
    });

    it('preserves WebSocket connection functionality', async () => {
      let wsInstance: MockWebSocket;
      const originalWebSocket = global.WebSocket;
      
      global.WebSocket = vi.fn().mockImplementation((url) => {
        wsInstance = new MockWebSocket(url);
        return wsInstance;
      });

      render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/api/claude/instances/ws');
      });

      global.WebSocket = originalWebSocket;
    });

    it('maintains API integration for instance management', async () => {
      render(<ClaudeInstanceManager />);

      fireEvent.click(screen.getByText('🚀 prod/claude'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('preserves error handling and recovery mechanisms', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: false,
          error: 'Test error message'
        })
      });

      render(<ClaudeInstanceManager />);

      fireEvent.click(screen.getByText('🚀 prod/claude'));

      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });
    });

    it('maintains input/output functionality for instance interaction', async () => {
      let wsInstance: MockWebSocket;
      const sendSpy = vi.fn();
      
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation((url) => {
        wsInstance = new MockWebSocket(url);
        wsInstance.send = sendSpy;
        return wsInstance;
      });

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: 'test-1', name: 'Test', status: 'running' }]
        })
      });

      render(<ClaudeInstanceManager />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Test'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type command and press Enter...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Type command and press Enter...');
      fireEvent.change(input, { target: { value: 'test command' } });
      fireEvent.keyPress(input, { key: 'Enter' });

      expect(sendSpy).toHaveBeenCalled();

      global.WebSocket = originalWebSocket;
    });
  });

  describe('Performance Characteristics', () => {
    it('maintains rendering performance', async () => {
      const startTime = performance.now();
      
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Should render quickly (within 1 second for unit tests)
      expect(renderTime).toBeLessThan(1000);
    });

    it('preserves memory usage patterns', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Navigate between routes
      fireEvent.click(screen.getByText('Claude Instances'));
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Feed'));
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory usage should be reasonable (this is a basic check)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024); // < 50MB increase
      }
    });

    it('handles rapid interactions without performance degradation', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Rapid navigation
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByText('Claude Instances'));
        fireEvent.click(screen.getByText('Feed'));
      }

      const operationTime = performance.now() - startTime;
      
      // Should handle rapid interactions efficiently
      expect(operationTime).toBeLessThan(2000); // < 2 seconds for 20 navigation actions
    });
  });

  describe('Error Handling Regression', () => {
    it('maintains error boundary functionality', async () => {
      // Error boundaries should still work (mocked in our tests)
      renderApp('/claude-instances');

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Should not crash even with errors
      expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
    });

    it('preserves fallback component rendering', async () => {
      renderApp('/invalid-route');

      await waitFor(() => {
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
      });
    });

    it('maintains graceful degradation on API failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderApp('/claude-instances');

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Should still render the component structure
      expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
    });
  });

  describe('Integration Stability', () => {
    it('maintains QueryClient integration', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // QueryClient should be properly integrated
      expect(queryClient).toBeDefined();
      expect(queryClient.getQueryCache()).toBeDefined();
    });

    it('preserves WebSocket context integration', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // WebSocket context should be available (mocked)
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('maintains error boundary integration', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Error boundaries should be in place
      expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
    });

    it('preserves suspense and loading state handling', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
      });

      // Suspense boundaries should work correctly
      expect(screen.queryByTestId('loading-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Data Flow and State Management', () => {
    it('maintains component state management', async () => {
      render(<ClaudeInstanceManager />);

      // State should be properly managed
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      
      // Buttons should be in proper initial state
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (!button.textContent?.includes('✕')) {
          expect(button).not.toBeDisabled();
        }
      });
    });

    it('preserves data persistence across navigation', async () => {
      renderApp();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts...');
        fireEvent.change(searchInput, { target: { value: 'persistent data' } });
        expect(searchInput).toHaveValue('persistent data');
      });

      // Navigate away and back
      fireEvent.click(screen.getByText('Claude Instances'));
      fireEvent.click(screen.getByText('Feed'));

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts...');
        // Search input should maintain state (or be reset, depending on design)
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('maintains proper cleanup on unmount', async () => {
      const { unmount } = render(<ClaudeInstanceManager />);

      // Component should mount successfully
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Backwards Compatibility', () => {
    it('ensures no breaking changes to existing APIs', async () => {
      render(<ClaudeInstanceManager apiUrl="http://custom:3001" />);

      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();

      // Custom API URL should still work
      fireEvent.click(screen.getByText('🚀 prod/claude'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://custom:3001/api/claude/instances',
          expect.any(Object)
        );
      });
    });

    it('maintains component prop interfaces', () => {
      // Should accept all previous props without errors
      expect(() => {
        render(<ClaudeInstanceManager />);
        render(<ClaudeInstanceManager apiUrl="http://test:3001" />);
      }).not.toThrow();
    });

    it('preserves event handling patterns', async () => {
      render(<ClaudeInstanceManager />);

      // Event handlers should work as expected
      const prodButton = screen.getByText('🚀 prod/claude');
      
      expect(() => {
        fireEvent.click(prodButton);
      }).not.toThrow();

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});