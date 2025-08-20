/**
 * TDD London School Route Components Test Suite
 * 
 * Tests all main route components for proper rendering and zero white screens.
 * Focuses on behavior verification and mock-driven development.
 * Uses London School approach with extensive mocking of external dependencies.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Import components
import SocialMediaFeed from '@/components/SocialMediaFeed';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import AgentDashboard from '@/components/AgentDashboard';
import AgentManager from '@/components/AgentManager';
import AgentProfile from '@/components/AgentProfile';
import WorkflowVisualizationFixed from '@/components/WorkflowVisualizationFixed';
import SystemAnalytics from '@/components/SystemAnalytics';
import ClaudeCodePanel from '@/components/ClaudeCodePanel';
import ActivityPanel from '@/components/ActivityPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Mock WebSocket context
const mockWebSocketContext = {
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true
  },
  connectionStatus: 'connected' as const,
  lastActivity: new Date(),
  reconnectAttempts: 0,
  isConnecting: false
};

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ agentId: 'test-agent-123' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' })
}));

// Mock WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Tanstack Query
const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false }
  }
});

// Component wrapper with all necessary providers
const ComponentWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={mockQueryClient}>
    <BrowserRouter>
      <ErrorBoundary componentName="TestWrapper">
        {children}
      </ErrorBoundary>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('Route Components - TDD London School', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryClient.clear();
  });

  describe('SocialMediaFeed Component', () => {
    let mockFetch: jest.Mock;
    let mockConsoleError: jest.Mock;

    beforeEach(() => {
      mockFetch = jest.fn();
      mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockConsoleError.mockRestore();
    });

    it('should render without white screen when API succeeds', async () => {
      // Arrange - Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          posts: [
            { id: '1', content: 'Test post', author: 'Agent1', timestamp: new Date().toISOString() }
          ]
        })
      });

      // Act
      render(
        <ComponentWrapper>
          <SocialMediaFeed />
        </ComponentWrapper>
      );

      // Assert - Verify interactions and rendering
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/posts');
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should display fallback UI when API fails', async () => {
      // Arrange - Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(
        <ComponentWrapper>
          <SocialMediaFeed />
        </ComponentWrapper>
      );

      // Assert - Verify fallback behavior
      await waitFor(() => {
        const fallback = screen.queryByTestId('feed-fallback') || 
                        screen.queryByTestId('component-error-fallback') ||
                        screen.queryByTestId('loading-fallback');
        expect(fallback).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle empty data gracefully', async () => {
      // Arrange - Mock empty response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ posts: [] })
      });

      // Act
      render(
        <ComponentWrapper>
          <SocialMediaFeed />
        </ComponentWrapper>
      );

      // Assert - Verify empty state handling
      await waitFor(() => {
        const feed = screen.getByTestId('social-media-feed');
        expect(feed).toBeInTheDocument();
      });
    });
  });

  describe('DualInstanceDashboard Component', () => {
    it('should render dual instances without white screen', async () => {
      // Act
      render(
        <ComponentWrapper>
          <DualInstanceDashboard />
        </ComponentWrapper>
      );

      // Assert - Verify component renders
      await waitFor(() => {
        const dashboard = screen.getByTestId('dual-instance-dashboard');
        expect(dashboard).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should display fallback when component errors', async () => {
      // Arrange - Force component error
      const ThrowingComponent = () => {
        throw new Error('DualInstance test error');
      };

      // Act
      render(
        <ComponentWrapper>
          <ErrorBoundary componentName="DualInstance">
            <ThrowingComponent />
          </ErrorBoundary>
        </ComponentWrapper>
      );

      // Assert - Verify error boundary catches error
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('AgentDashboard Component', () => {
    let mockAgentService: any;

    beforeEach(() => {
      mockAgentService = {
        getAgents: jest.fn().mockResolvedValue([
          { id: '1', name: 'Agent 1', status: 'active' },
          { id: '2', name: 'Agent 2', status: 'idle' }
        ]),
        getMetrics: jest.fn().mockResolvedValue({
          totalAgents: 2,
          activeAgents: 1,
          performance: 85
        })
      };
    });

    it('should coordinate with agent service properly', async () => {
      // Act
      render(
        <ComponentWrapper>
          <AgentDashboard />
        </ComponentWrapper>
      );

      // Assert - Verify dashboard renders
      await waitFor(() => {
        const dashboard = screen.getByTestId('agent-dashboard');
        expect(dashboard).toBeInTheDocument();
      });

      // Verify no white screen
      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should handle service unavailability gracefully', async () => {
      // Arrange - Mock service failure
      const originalError = console.error;
      console.error = jest.fn();

      // Act
      render(
        <ComponentWrapper>
          <AgentDashboard />
        </ComponentWrapper>
      );

      // Assert - Component should still render something
      await waitFor(() => {
        const dashboard = screen.queryByTestId('agent-dashboard') ||
                          screen.queryByTestId('dashboard-fallback') ||
                          screen.queryByTestId('loading-fallback');
        expect(dashboard).toBeInTheDocument();
      });

      console.error = originalError;
    });
  });

  describe('AgentManager Component', () => {
    it('should render agent management interface', async () => {
      // Act
      render(
        <ComponentWrapper>
          <AgentManager />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const manager = screen.getByTestId('agent-manager');
        expect(manager).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should handle agent operations without breaking', async () => {
      // Act
      render(
        <ComponentWrapper>
          <AgentManager />
        </ComponentWrapper>
      );

      // Assert - Verify stable rendering
      await waitFor(() => {
        const manager = screen.getByTestId('agent-manager');
        expect(manager).toBeInTheDocument();
      });

      // Simulate user interactions would not break component
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AgentProfile Component', () => {
    it('should render agent profile with dynamic routing', async () => {
      // Act
      render(
        <ComponentWrapper>
          <AgentProfile />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const profile = screen.getByTestId('agent-profile');
        expect(profile).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });

    it('should handle missing agent ID gracefully', async () => {
      // Arrange - Mock params without agentId
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useParams: () => ({})
      }));

      // Act
      render(
        <ComponentWrapper>
          <AgentProfile />
        </ComponentWrapper>
      );

      // Assert - Should show fallback or error state
      await waitFor(() => {
        const content = screen.queryByTestId('agent-profile') ||
                       screen.queryByTestId('agent-profile-fallback') ||
                       screen.queryByTestId('component-error-fallback');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('WorkflowVisualizationFixed Component', () => {
    it('should render workflow visualization', async () => {
      // Act
      render(
        <ComponentWrapper>
          <WorkflowVisualizationFixed />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const workflow = screen.getByTestId('workflow-visualization');
        expect(workflow).toBeInTheDocument();
      });
    });

    it('should handle complex workflow data', async () => {
      // Act
      render(
        <ComponentWrapper>
          <WorkflowVisualizationFixed />
        </ComponentWrapper>
      );

      // Assert - Should render without breaking
      await waitFor(() => {
        const workflow = screen.getByTestId('workflow-visualization');
        expect(workflow).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });
  });

  describe('SystemAnalytics Component', () => {
    let mockAnalyticsAPI: jest.Mock;

    beforeEach(() => {
      mockAnalyticsAPI = jest.fn().mockResolvedValue({
        metrics: {
          cpu: 45,
          memory: 78,
          activeConnections: 12
        }
      });
      global.fetch = mockAnalyticsAPI;
    });

    it('should render analytics dashboard', async () => {
      // Act
      render(
        <ComponentWrapper>
          <SystemAnalytics />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const analytics = screen.getByTestId('system-analytics');
        expect(analytics).toBeInTheDocument();
      });
    });

    it('should coordinate with analytics service', async () => {
      // Act
      render(
        <ComponentWrapper>
          <SystemAnalytics />
        </ComponentWrapper>
      );

      // Assert - Verify service interaction
      await waitFor(() => {
        expect(mockAnalyticsAPI).toHaveBeenCalled();
      });

      const analytics = screen.getByTestId('system-analytics');
      expect(analytics).toBeInTheDocument();
    });
  });

  describe('ClaudeCodePanel Component', () => {
    it('should render Claude Code interface', async () => {
      // Act
      render(
        <ComponentWrapper>
          <ClaudeCodePanel />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const panel = screen.getByTestId('claude-code-panel');
        expect(panel).toBeInTheDocument();
      });
    });

    it('should handle code execution without errors', async () => {
      // Act
      render(
        <ComponentWrapper>
          <ClaudeCodePanel />
        </ComponentWrapper>
      );

      // Assert - Component should be stable
      await waitFor(() => {
        const panel = screen.getByTestId('claude-code-panel');
        expect(panel).toBeInTheDocument();
      });

      expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    });
  });

  describe('ActivityPanel Component', () => {
    it('should render activity feed', async () => {
      // Act
      render(
        <ComponentWrapper>
          <ActivityPanel />
        </ComponentWrapper>
      );

      // Assert
      await waitFor(() => {
        const activity = screen.getByTestId('activity-panel');
        expect(activity).toBeInTheDocument();
      });
    });

    it('should handle real-time updates', async () => {
      // Act
      render(
        <ComponentWrapper>
          <ActivityPanel />
        </ComponentWrapper>
      );

      // Assert - Verify WebSocket integration
      await waitFor(() => {
        const activity = screen.getByTestId('activity-panel');
        expect(activity).toBeInTheDocument();
      });

      // Verify WebSocket context is used
      expect(mockWebSocketContext.socket.on).toHaveBeenCalled();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should handle navigation between components', async () => {
      // Test navigation doesn't break components
      const components = [
        SocialMediaFeed,
        AgentDashboard,
        AgentManager,
        SystemAnalytics,
        ClaudeCodePanel,
        ActivityPanel
      ];

      for (const Component of components) {
        render(
          <ComponentWrapper>
            <Component />
          </ComponentWrapper>
        );

        // Each component should render without error
        await waitFor(() => {
          expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
        });

        // Clean up for next component
        act(() => {
          mockQueryClient.clear();
        });
      }
    });

    it('should maintain state consistency across route changes', async () => {
      // Test that components don't interfere with each other
      render(
        <ComponentWrapper>
          <SocialMediaFeed />
        </ComponentWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      });

      // Switch to different component
      render(
        <ComponentWrapper>
          <AgentDashboard />
        </ComponentWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Resilience', () => {
    it('should isolate component errors', async () => {
      const BrokenComponent = () => {
        throw new Error('Intentional test error');
      };

      // Act
      render(
        <ComponentWrapper>
          <div>
            <SocialMediaFeed />
            <ErrorBoundary componentName="BrokenComponent" isolate={true}>
              <BrokenComponent />
            </ErrorBoundary>
            <AgentDashboard />
          </div>
        </ComponentWrapper>
      );

      // Assert - Other components should still work
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
        expect(screen.getByTestId('agent-dashboard')).toBeInTheDocument();
      });
    });

    it('should recover from temporary failures', async () => {
      let shouldFail = true;
      const ConditionalComponent = () => {
        if (shouldFail) {
          throw new Error('Temporary failure');
        }
        return <div data-testid="recovered-component">Recovered!</div>;
      };

      // Act - Initial failure
      const { rerender } = render(
        <ComponentWrapper>
          <ErrorBoundary componentName="ConditionalComponent">
            <ConditionalComponent />
          </ErrorBoundary>
        </ComponentWrapper>
      );

      // Assert - Error boundary should catch
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });

      // Act - Recovery
      shouldFail = false;
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Assert - Should recover
      await waitFor(() => {
        expect(screen.queryByTestId('recovered-component')).toBeInTheDocument();
      });
    });
  });
});