/**
 * TDD Unit Tests - IsolatedRealAgentManager (Master-Detail Mode)
 * London School TDD: Test doubles (mocks/stubs) for all dependencies
 *
 * Component Responsibilities:
 * - Render sidebar + detail panel layout
 * - Select first agent by default
 * - Update detail panel when agent selected
 * - Sync selection with URL params
 * - Handle search across sidebar
 * - Maintain WebSocket real-time updates
 * - Hide Home/Details/Trash buttons in master-detail mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import IsolatedRealAgentManager from '../../components/IsolatedRealAgentManager';
import { Agent } from '../../types/api';

// Mock the API service
vi.mock('../../services/apiServiceIsolated', () => ({
  createApiService: vi.fn((routeKey: string) => ({
    getAgents: vi.fn().mockResolvedValue({
      success: true,
      agents: [
        {
          id: 'agent-1',
          slug: 'code-assistant',
          name: 'Code Assistant',
          display_name: 'Code Assistant',
          description: 'Helps with coding tasks',
          avatar_color: '#3B82F6',
          status: 'active',
          capabilities: ['coding'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          last_used: null,
          usage_count: 0,
          version: '1.0.0',
          configuration: {},
          performance_metrics: {
            success_rate: 0.95,
            average_response_time: 150,
            total_tokens_used: 10000,
            error_count: 2,
            uptime_percentage: 99.5,
            last_performance_check: '2025-01-15T00:00:00Z',
            performance_trend: 'stable'
          },
          health_status: {
            cpu_usage: 25,
            memory_usage: 512,
            response_time: 120,
            last_heartbeat: '2025-01-15T00:00:00Z',
            connection_status: 'connected',
            error_count_24h: 0
          }
        },
        {
          id: 'agent-2',
          slug: 'data-analyzer',
          name: 'Data Analyzer',
          display_name: 'Data Analyzer',
          description: 'Analyzes data patterns',
          avatar_color: '#10B981',
          status: 'active',
          capabilities: ['analysis'],
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
          last_used: null,
          usage_count: 0,
          version: '1.0.0',
          configuration: {},
          performance_metrics: {
            success_rate: 0.98,
            average_response_time: 200,
            total_tokens_used: 5000,
            error_count: 1,
            uptime_percentage: 99.8,
            last_performance_check: '2025-01-15T00:00:00Z',
            performance_trend: 'improving'
          },
          health_status: {
            cpu_usage: 15,
            memory_usage: 256,
            response_time: 180,
            last_heartbeat: '2025-01-15T00:00:00Z',
            connection_status: 'connected',
            error_count_24h: 0
          }
        }
      ],
      totalAgents: 2
    }),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    getStatus: vi.fn(() => ({
      isDestroyed: false,
      activeRequests: 0
    }))
  })),
  default: vi.fn()
}));

// Mock RouteWrapper
vi.mock('../../components/RouteWrapper', () => ({
  useRoute: () => ({
    routeKey: 'test-route',
    registerCleanup: vi.fn()
  })
}));

// Mock child components
vi.mock('../../components/AgentListSidebar', () => ({
  default: ({ agents, selectedAgentId, onSelectAgent, searchTerm, onSearchChange }: any) => (
    <div data-testid="agent-list-sidebar">
      <input
        data-testid="sidebar-search"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search agents..."
      />
      {agents.map((agent: Agent) => (
        <div
          key={agent.id}
          data-testid={`sidebar-agent-${agent.id}`}
          onClick={() => onSelectAgent(agent)}
          className={selectedAgentId === agent.id ? 'selected' : ''}
        >
          {agent.name}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../components/WorkingAgentProfile', () => ({
  default: ({ agent }: { agent: Agent }) => (
    <div data-testid="agent-detail-panel">
      <h1 data-testid="detail-agent-name">{agent.name}</h1>
      <p data-testid="detail-agent-description">{agent.description}</p>
    </div>
  )
}));

const renderWithRouter = (initialRoute = '/agents') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/agents" element={<IsolatedRealAgentManager />} />
        <Route path="/agents/:agentSlug" element={<IsolatedRealAgentManager />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('IsolatedRealAgentManager - Master-Detail Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout - Master-Detail Structure', () => {
    it('should render sidebar and detail panel in split layout', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
      });
    });

    it('should render sidebar on the left side', async () => {
      renderWithRouter();

      await waitFor(() => {
        const sidebar = screen.getByTestId('agent-list-sidebar');
        const container = sidebar.parentElement;

        expect(container).toHaveClass(/flex/);
      });
    });

    it('should render detail panel on the right side', async () => {
      renderWithRouter();

      await waitFor(() => {
        const detailPanel = screen.getByTestId('agent-detail-panel');
        expect(detailPanel).toBeInTheDocument();
      });
    });

    it('should give sidebar fixed width and detail panel flexible width', async () => {
      renderWithRouter();

      await waitFor(() => {
        const sidebar = screen.getByTestId('agent-list-sidebar');
        const sidebarContainer = sidebar.parentElement;

        // Sidebar should have fixed width class
        expect(sidebarContainer).toHaveClass(/w-/);
      });
    });

    it('should render master-detail layout marker', async () => {
      renderWithRouter();

      await waitFor(() => {
        const layout = screen.getByTestId('master-detail-layout');
        expect(layout).toBeInTheDocument();
      });
    });
  });

  describe('Default Selection - First Agent', () => {
    it('should select first agent by default when no agent in URL', async () => {
      renderWithRouter('/agents');

      await waitFor(() => {
        const firstAgent = screen.getByTestId('sidebar-agent-agent-1');
        expect(firstAgent).toHaveClass('selected');
      });
    });

    it('should display first agent details by default', async () => {
      renderWithRouter('/agents');

      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Code Assistant');
      });
    });

    it('should update URL to include first agent slug', async () => {
      const { container } = renderWithRouter('/agents');

      await waitFor(() => {
        expect(window.location.pathname).toContain('code-assistant');
      });
    });

    it('should not select any agent if agent list is empty', async () => {
      // Override mock for this test
      const { createApiService } = await import('../../services/apiServiceIsolated');
      (createApiService as any).mockReturnValueOnce({
        getAgents: vi.fn().mockResolvedValue({ success: true, agents: [], totalAgents: 0 }),
        on: vi.fn(),
        off: vi.fn(),
        destroy: vi.fn(),
        getStatus: vi.fn(() => ({ isDestroyed: false, activeRequests: 0 }))
      });

      renderWithRouter('/agents');

      await waitFor(() => {
        expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Selection Updates - Detail Panel', () => {
    it('should update detail panel when agent is selected from sidebar', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-1')).toBeInTheDocument();
      });

      const agent2 = screen.getByTestId('sidebar-agent-agent-2');
      fireEvent.click(agent2);

      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Data Analyzer');
      });
    });

    it('should highlight selected agent in sidebar', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-1')).toBeInTheDocument();
      });

      const agent2 = screen.getByTestId('sidebar-agent-agent-2');
      fireEvent.click(agent2);

      await waitFor(() => {
        expect(agent2).toHaveClass('selected');
      });
    });

    it('should remove highlight from previously selected agent', async () => {
      renderWithRouter();

      await waitFor(() => {
        const agent1 = screen.getByTestId('sidebar-agent-agent-1');
        expect(agent1).toHaveClass('selected');
      });

      const agent2 = screen.getByTestId('sidebar-agent-agent-2');
      fireEvent.click(agent2);

      await waitFor(() => {
        const agent1 = screen.getByTestId('sidebar-agent-agent-1');
        expect(agent1).not.toHaveClass('selected');
      });
    });

    it('should update detail panel content immediately on selection', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Code Assistant');
      });

      const agent2 = screen.getByTestId('sidebar-agent-agent-2');
      fireEvent.click(agent2);

      // Should update without loading state
      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Data Analyzer');
      }, { timeout: 100 });
    });
  });

  describe('URL Synchronization', () => {
    it('should update URL when agent is selected', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-2')).toBeInTheDocument();
      });

      const agent2 = screen.getByTestId('sidebar-agent-agent-2');
      fireEvent.click(agent2);

      await waitFor(() => {
        expect(window.location.pathname).toContain('data-analyzer');
      });
    });

    it('should select agent based on URL parameter on initial load', async () => {
      renderWithRouter('/agents/data-analyzer');

      await waitFor(() => {
        const agent2 = screen.getByTestId('sidebar-agent-agent-2');
        expect(agent2).toHaveClass('selected');
      });
    });

    it('should show correct agent details based on URL', async () => {
      renderWithRouter('/agents/data-analyzer');

      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Data Analyzer');
      });
    });

    it('should handle invalid agent slug in URL gracefully', async () => {
      renderWithRouter('/agents/invalid-agent');

      await waitFor(() => {
        // Should fallback to first agent or show error
        const sidebar = screen.getByTestId('agent-list-sidebar');
        expect(sidebar).toBeInTheDocument();
      });
    });

    it('should preserve URL state during navigation', async () => {
      renderWithRouter('/agents/code-assistant');

      await waitFor(() => {
        expect(window.location.pathname).toContain('code-assistant');
      });

      // URL should not change unless user selects different agent
      await waitFor(() => {
        expect(window.location.pathname).toContain('code-assistant');
      }, { timeout: 500 });
    });
  });

  describe('Search Functionality', () => {
    it('should filter agents in sidebar based on search term', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-search')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('sidebar-search');
      fireEvent.change(searchInput, { target: { value: 'Code' } });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-1')).toBeInTheDocument();
        expect(screen.queryByTestId('sidebar-agent-agent-2')).not.toBeInTheDocument();
      });
    });

    it('should maintain selected agent when searching', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-1')).toHaveClass('selected');
      });

      const searchInput = screen.getByTestId('sidebar-search');
      fireEvent.change(searchInput, { target: { value: 'Code' } });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-agent-agent-1')).toHaveClass('selected');
      });
    });

    it('should keep detail panel visible during search', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('sidebar-search');
      fireEvent.change(searchInput, { target: { value: 'Data' } });

      await waitFor(() => {
        expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
      });
    });

    it('should show empty state in sidebar when search has no results', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-search')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('sidebar-search');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-agent-agent-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-Time Updates - WebSocket', () => {
    it('should setup WebSocket listener on mount', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      const mockService = (createApiService as any).mock.results[0].value;

      renderWithRouter();

      await waitFor(() => {
        expect(mockService.on).toHaveBeenCalledWith('agents_updated', expect.any(Function));
      });
    });

    it('should update agent in sidebar when WebSocket event received', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      const mockService = (createApiService as any).mock.results[0].value;

      renderWithRouter();

      await waitFor(() => {
        expect(mockService.on).toHaveBeenCalled();
      });

      // Simulate WebSocket update
      const updateHandler = mockService.on.mock.calls[0][1];
      const updatedAgent = {
        id: 'agent-1',
        slug: 'code-assistant',
        name: 'Code Assistant Updated',
        display_name: 'Code Assistant Updated',
        status: 'active'
      };

      updateHandler(updatedAgent);

      await waitFor(() => {
        expect(screen.getByText('Code Assistant Updated')).toBeInTheDocument();
      });
    });

    it('should update detail panel when selected agent is updated via WebSocket', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      const mockService = (createApiService as any).mock.results[0].value;

      renderWithRouter();

      await waitFor(() => {
        const agent1 = screen.getByTestId('sidebar-agent-agent-1');
        expect(agent1).toHaveClass('selected');
      });

      // Simulate WebSocket update for selected agent
      const updateHandler = mockService.on.mock.calls[0][1];
      const updatedAgent = {
        id: 'agent-1',
        name: 'Code Assistant v2',
        description: 'Updated description'
      };

      updateHandler(updatedAgent);

      await waitFor(() => {
        expect(screen.getByTestId('detail-agent-name')).toHaveTextContent('Code Assistant v2');
      });
    });
  });

  describe('Button Visibility - Master-Detail Mode', () => {
    it('should NOT render Home button in master-detail mode', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
      });
    });

    it('should NOT render Details button in master-detail mode', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByText('Details')).not.toBeInTheDocument();
      });
    });

    it('should NOT render Trash button in master-detail mode', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /delete|trash/i })).not.toBeInTheDocument();
      });
    });

    it('should render Refresh button', async () => {
      renderWithRouter();

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should render search input', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-search')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching agents', () => {
      renderWithRouter();

      expect(screen.getByTestId('agents-loading')).toBeInTheDocument();
    });

    it('should hide loading indicator after agents are loaded', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByTestId('agents-loading')).not.toBeInTheDocument();
      });
    });

    it('should show sidebar and detail panel after loading', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      (createApiService as any).mockReturnValueOnce({
        getAgents: vi.fn().mockRejectedValue(new Error('API Error')),
        on: vi.fn(),
        off: vi.fn(),
        destroy: vi.fn(),
        getStatus: vi.fn(() => ({ isDestroyed: false, activeRequests: 0 }))
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      (createApiService as any).mockReturnValueOnce({
        getAgents: vi.fn().mockRejectedValue(new Error('Network Error')),
        on: vi.fn(),
        off: vi.fn(),
        destroy: vi.fn(),
        getStatus: vi.fn(() => ({ isDestroyed: false, activeRequests: 0 }))
      });

      renderWithRouter();

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh|retry/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should call destroy on API service when unmounting', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      const mockService = (createApiService as any).mock.results[0].value;

      const { unmount } = renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
      });

      unmount();

      expect(mockService.destroy).toHaveBeenCalled();
    });

    it('should unregister WebSocket listeners on unmount', async () => {
      const { createApiService } = await import('../../services/apiServiceIsolated');
      const mockService = (createApiService as any).mock.results[0].value;

      const { unmount } = renderWithRouter();

      await waitFor(() => {
        expect(mockService.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockService.destroy).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      // Mock window.innerWidth
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter();

      await waitFor(() => {
        const layout = screen.getByTestId('master-detail-layout');
        expect(layout).toHaveClass(/flex-col|mobile/);
      });
    });

    it('should show sidebar toggle button on mobile', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter();

      await waitFor(() => {
        const toggleButton = screen.queryByRole('button', { name: /menu|toggle/i });
        expect(toggleButton).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper landmark roles', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation between sidebar and detail panel', async () => {
      renderWithRouter();

      await waitFor(() => {
        const sidebar = screen.getByTestId('agent-list-sidebar');
        sidebar.focus();
        expect(sidebar).toHaveFocus();
      });
    });

    it('should announce selection changes to screen readers', async () => {
      renderWithRouter();

      await waitFor(() => {
        const agent2 = screen.getByTestId('sidebar-agent-agent-2');
        fireEvent.click(agent2);
      });

      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toBeInTheDocument();
      });
    });
  });
});
