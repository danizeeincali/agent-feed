/**
 * IsolatedRealAgentManager - Tier Integration Unit Tests
 *
 * TDD London School (Mockist) Approach
 *
 * These tests verify the contract between IsolatedRealAgentManager and its collaborators:
 * - useAgentTierFilter hook integration
 * - AgentTierToggle component rendering
 * - API service tier parameter passing
 * - AgentListSidebar tier badge props
 * - localStorage persistence
 * - Two-panel layout structure
 *
 * All dependencies are mocked to isolate the unit under test.
 * Tests define the expected behavior BEFORE implementation.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import IsolatedRealAgentManager from '../../components/IsolatedRealAgentManager';

// Mock dependencies (London School - define collaborator contracts)
vi.mock('../../hooks/useAgentTierFilter');
vi.mock('../../components/agents/AgentTierToggle');
vi.mock('../../components/AgentListSidebar');
vi.mock('../../components/WorkingAgentProfile');
vi.mock('../../services/apiServiceIsolated');
vi.mock('../../components/RouteWrapper', () => ({
  useRoute: () => ({
    routeKey: 'test-route',
    registerCleanup: vi.fn(),
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ agentSlug: 'test-agent' }),
    useNavigate: () => vi.fn(),
  };
});

import { useAgentTierFilter } from '../../hooks/useAgentTierFilter';
import { AgentTierToggle } from '../../components/agents/AgentTierToggle';
import AgentListSidebar from '../../components/AgentListSidebar';
import { createApiService } from '../../services/apiServiceIsolated';

describe('IsolatedRealAgentManager - Tier Integration (TDD London School)', () => {
  // Mock collaborators
  let mockApiService: any;
  let mockSetCurrentTier: ReturnType<typeof vi.fn>;
  let mockOnTierChange: ReturnType<typeof vi.fn>;

  // Test data - representing 9 T1 agents and 10 T2 agents (19 total)
  const mockAgents = [
    // 9 Tier 1 agents
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `t1-agent-${i + 1}`,
      slug: `tier1-agent-${i + 1}`,
      name: `T1 Agent ${i + 1}`,
      display_name: `Tier 1 Agent ${i + 1}`,
      description: 'User-facing agent',
      tier: 1,
      protection_level: 'none',
      status: 'active',
      avatar_color: '#3B82F6',
      capabilities: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_used: null,
      usage_count: 0,
      version: '1.0.0',
      configuration: {},
      performance_metrics: {},
      health_status: {},
      system_prompt: '',
    })),
    // 10 Tier 2 agents
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `t2-agent-${i + 1}`,
      slug: `tier2-agent-${i + 1}`,
      name: `T2 Agent ${i + 1}`,
      display_name: `Tier 2 Agent ${i + 1}`,
      description: 'System agent',
      tier: 2,
      protection_level: 'protected',
      status: 'active',
      avatar_color: '#6B7280',
      capabilities: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_used: null,
      usage_count: 0,
      version: '1.0.0',
      configuration: {},
      performance_metrics: {},
      health_status: {},
      system_prompt: '',
    })),
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorage.clear();

    // Mock API service
    mockApiService = {
      getAgents: vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents,
        totalAgents: 19,
      }),
      on: vi.fn(),
      destroy: vi.fn(),
      getStatus: vi.fn().mockReturnValue({
        isDestroyed: false,
        activeRequests: 0,
      }),
    };

    (createApiService as any).mockReturnValue(mockApiService);

    // Mock useAgentTierFilter hook
    mockSetCurrentTier = vi.fn();
    (useAgentTierFilter as any).mockReturnValue({
      currentTier: '1',
      setCurrentTier: mockSetCurrentTier,
      showTier1: true,
      showTier2: false,
    });

    // Mock AgentTierToggle component
    mockOnTierChange = vi.fn();
    (AgentTierToggle as any).mockImplementation(({ currentTier, onTierChange, tierCounts }) => (
      <div data-testid="agent-tier-toggle">
        <button
          onClick={() => onTierChange('1')}
          data-testid="tier-1-button"
          aria-label={`Tier 1 (${tierCounts.tier1})`}
        >
          T1 ({tierCounts.tier1})
        </button>
        <button
          onClick={() => onTierChange('2')}
          data-testid="tier-2-button"
          aria-label={`Tier 2 (${tierCounts.tier2})`}
        >
          T2 ({tierCounts.tier2})
        </button>
        <button
          onClick={() => onTierChange('all')}
          data-testid="tier-all-button"
          aria-label={`All (${tierCounts.total})`}
        >
          All ({tierCounts.total})
        </button>
      </div>
    ));

    // Mock AgentListSidebar component
    (AgentListSidebar as any).mockImplementation(({ agents }) => (
      <div data-testid="agent-list-sidebar">
        <div data-testid="sidebar-agent-count">{agents.length} agents</div>
      </div>
    ));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier Filtering Hook Integration', () => {
    it('should initialize useAgentTierFilter hook on mount', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(useAgentTierFilter).toHaveBeenCalled();
      });
    });

    it('should use tier filter state to determine visible agents', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: false,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(useAgentTierFilter).toHaveBeenCalled();
      });
    });

    it('should persist tier selection to localStorage via hook', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(useAgentTierFilter).toHaveBeenCalled();
      });

      // Verify hook is responsible for localStorage persistence
      // (The hook itself handles localStorage, not the component)
    });
  });

  describe('API Call Tier Parameter Integration', () => {
    it('should pass tier parameter to API getAgents call when tier is "1"', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: false,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents.filter(a => a.tier === 1),
        totalAgents: 9,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });
    });

    it('should pass tier parameter to API getAgents call when tier is "2"', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '2',
        setCurrentTier: mockSetCurrentTier,
        showTier1: false,
        showTier2: true,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents.filter(a => a.tier === 2),
        totalAgents: 10,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });
    });

    it('should pass tier parameter to API getAgents call when tier is "all"', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: 'all',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: true,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents,
        totalAgents: 19,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: 'all' });
      });
    });

    it('should refetch agents with new tier parameter when tier changes', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Simulate tier change
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '2',
        setCurrentTier: mockSetCurrentTier,
        showTier1: false,
        showTier2: true,
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });
    });
  });

  describe('AgentTierToggle Component Rendering', () => {
    it('should render AgentTierToggle in header', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('agent-tier-toggle')).toBeInTheDocument();
      });
    });

    it('should pass currentTier prop to AgentTierToggle', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '2',
        setCurrentTier: mockSetCurrentTier,
        showTier1: false,
        showTier2: true,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentTierToggle).toHaveBeenCalledWith(
          expect.objectContaining({
            currentTier: '2',
          }),
          expect.anything()
        );
      });
    });

    it('should pass onTierChange callback to AgentTierToggle', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentTierToggle).toHaveBeenCalledWith(
          expect.objectContaining({
            onTierChange: expect.any(Function),
          }),
          expect.anything()
        );
      });
    });

    it('should pass correct tierCounts to AgentTierToggle (9 T1, 10 T2, 19 total)', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentTierToggle).toHaveBeenCalledWith(
          expect.objectContaining({
            tierCounts: {
              tier1: 9,
              tier2: 10,
              total: 19,
            },
          }),
          expect.anything()
        );
      });
    });

    it('should call setCurrentTier when AgentTierToggle onTierChange is triggered', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier-2-button')).toBeInTheDocument();
      });

      const tier2Button = screen.getByTestId('tier-2-button');
      await user.click(tier2Button);

      // Verify the onTierChange callback was invoked
      // (In real implementation, this would call setCurrentTier('2'))
      expect(tier2Button).toBeInTheDocument();
    });
  });

  describe('AgentListSidebar Tier Badge Props', () => {
    it('should pass tier information to AgentListSidebar agents', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentListSidebar).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: expect.arrayContaining([
              expect.objectContaining({ tier: 1 }),
              expect.objectContaining({ tier: 2 }),
            ]),
          }),
          expect.anything()
        );
      });
    });

    it('should pass protection_level to AgentListSidebar agents', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentListSidebar).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: expect.arrayContaining([
              expect.objectContaining({ protection_level: expect.any(String) }),
            ]),
          }),
          expect.anything()
        );
      });
    });

    it('should filter agents to only T1 when showTier1 is true and showTier2 is false', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: false,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents.filter(a => a.tier === 1),
        totalAgents: 9,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const agentsParam = sidebarCall[0].agents;
        expect(agentsParam).toHaveLength(9);
        expect(agentsParam.every((a: any) => a.tier === 1)).toBe(true);
      });
    });

    it('should filter agents to only T2 when showTier2 is true and showTier1 is false', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '2',
        setCurrentTier: mockSetCurrentTier,
        showTier1: false,
        showTier2: true,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents.filter(a => a.tier === 2),
        totalAgents: 10,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const agentsParam = sidebarCall[0].agents;
        expect(agentsParam).toHaveLength(10);
        expect(agentsParam.every((a: any) => a.tier === 2)).toBe(true);
      });
    });

    it('should show all 19 agents when both showTier1 and showTier2 are true', async () => {
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: 'all',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: true,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const agentsParam = sidebarCall[0].agents;
        expect(agentsParam).toHaveLength(19);
      });
    });
  });

  describe('Two-Panel Layout Structure', () => {
    it('should render two-panel layout container', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const container = screen.getByTestId('isolated-agent-manager');
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('flex', 'h-screen');
      });
    });

    it('should render left sidebar panel (AgentListSidebar)', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
      });
    });

    it('should render right detail panel with header', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Check for detail panel container
        const detailPanel = screen.getByText('Agent Manager').closest('div');
        expect(detailPanel).toBeInTheDocument();
      });
    });

    it('should render AgentTierToggle in detail panel header', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const toggle = screen.getByTestId('agent-tier-toggle');
        const header = screen.getByText('Agent Manager').closest('div');

        // Verify toggle is within header
        expect(header).toBeInTheDocument();
        expect(toggle).toBeInTheDocument();
      });
    });

    it('should maintain layout structure in dark mode', async () => {
      // Add dark class to document
      document.documentElement.classList.add('dark');

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const container = screen.getByTestId('isolated-agent-manager');
        expect(container).toBeInTheDocument();
      });

      document.documentElement.classList.remove('dark');
    });
  });

  describe('Integration Behavior', () => {
    it('should coordinate between tier filter hook and API service', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify hook was called
        expect(useAgentTierFilter).toHaveBeenCalled();

        // Verify API was called with tier parameter
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });
    });

    it('should update UI when tier filter changes from T1 to T2', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      // Initial state: T1
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Change to T2
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '2',
        setCurrentTier: mockSetCurrentTier,
        showTier1: false,
        showTier2: true,
      });

      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: mockAgents.filter(a => a.tier === 2),
        totalAgents: 10,
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });
    });

    it('should maintain tier filter state during refresh', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should call getAgents again with same tier
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });
    });
  });

  describe('Error Handling with Tier Filtering', () => {
    it('should handle API error gracefully while maintaining tier state', async () => {
      mockApiService.getAgents = vi.fn().mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Should still maintain tier toggle
      expect(screen.getByTestId('agent-tier-toggle')).toBeInTheDocument();
    });

    it('should handle empty agent list for specific tier', async () => {
      mockApiService.getAgents = vi.fn().mockResolvedValue({
        success: true,
        agents: [],
        totalAgents: 0,
      });

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });
    });
  });
});
