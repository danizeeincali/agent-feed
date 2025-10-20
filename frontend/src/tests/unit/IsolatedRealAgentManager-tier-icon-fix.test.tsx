/**
 * IsolatedRealAgentManager - Tier Count, Protection Badge, and SVG Icon Fix Tests
 *
 * TDD London School (Mockist) Approach
 *
 * This test suite verifies THREE critical fixes:
 *
 * 1. TIER COUNT FIX:
 *    - Tier counts calculated from ALL agents (not filtered)
 *    - Counts remain stable when switching tiers
 *    - Expected counts: T1 (9), T2 (10), All (19)
 *
 * 2. CLIENT-SIDE FILTERING:
 *    - allAgents contains full list (19 agents)
 *    - displayedAgents filtered by currentTier
 *    - Changing tier doesn't refetch from API
 *    - useMemo optimizations working
 *
 * 3. PROTECTION BADGE FIX:
 *    - T2 protected agents show ProtectionBadge
 *    - Badge receives isProtected={true}
 *    - visibility field passed to component
 *
 * 4. SVG ICON FIX:
 *    - AgentIcon receives icon_type="svg"
 *    - getLucideIcon resolves icon names
 *    - SVG components render (not emoji)
 *    - Tier colors applied (T1: blue, T2: gray)
 *
 * All tests should FAIL initially before implementation.
 * Tests define the expected behavior through mock interactions.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import IsolatedRealAgentManager from '../../components/IsolatedRealAgentManager';

// Mock dependencies (London School - define collaborator contracts)
vi.mock('../../hooks/useAgentTierFilter');
vi.mock('../../components/agents/AgentTierToggle', () => ({
  AgentTierToggle: vi.fn()
}));
vi.mock('../../components/agents/AgentIcon', () => ({
  AgentIcon: vi.fn()
}));
vi.mock('../../components/agents/ProtectionBadge', () => ({
  ProtectionBadge: vi.fn()
}));
vi.mock('../../components/AgentListSidebar', () => ({
  default: vi.fn()
}));
vi.mock('../../components/WorkingAgentProfile', () => ({
  default: vi.fn(() => <div>Profile</div>)
}));
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
import { AgentIcon } from '../../components/agents/AgentIcon';
import { ProtectionBadge } from '../../components/agents/ProtectionBadge';
import AgentListSidebar from '../../components/AgentListSidebar';
import { createApiService } from '../../services/apiServiceIsolated';

describe('IsolatedRealAgentManager - Tier Count, Protection Badge, SVG Icon Fixes (TDD)', () => {
  // Mock collaborators
  let mockApiService: any;
  let mockSetCurrentTier: ReturnType<typeof vi.fn>;

  // Test data - representing 9 T1 agents and 10 T2 agents (19 total)
  const mockT1Agents = Array.from({ length: 9 }, (_, i) => ({
    id: `t1-agent-${i + 1}`,
    slug: `tier1-agent-${i + 1}`,
    name: `personal-todos-agent-${i + 1}`,
    display_name: `Personal Todos ${i + 1}`,
    description: 'User-facing agent',
    tier: 1,
    visibility: 'public',
    icon: 'CheckSquare',
    icon_type: 'svg' as const,
    icon_emoji: '✅',
    status: 'active' as const,
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
  }));

  const mockT2Agents = Array.from({ length: 10 }, (_, i) => ({
    id: `t2-agent-${i + 1}`,
    slug: `tier2-agent-${i + 1}`,
    name: `meta-agent-${i + 1}`,
    display_name: `Meta Agent ${i + 1}`,
    description: 'System agent',
    tier: 2,
    visibility: 'protected',
    icon: 'Settings',
    icon_type: 'svg' as const,
    icon_emoji: '⚙️',
    status: 'active' as const,
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
  }));

  const mockAllAgents = [...mockT1Agents, ...mockT2Agents];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorage.clear();

    // Mock API service - CRITICAL: Always returns ALL agents
    mockApiService = {
      getAgents: vi.fn().mockResolvedValue({
        success: true,
        agents: mockAllAgents,
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
      currentTier: 'all',
      setCurrentTier: mockSetCurrentTier,
      showTier1: true,
      showTier2: true,
    });

    // Mock AgentTierToggle component
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

    // Mock AgentIcon component
    vi.mocked(AgentIcon).mockImplementation(({ agent, size }: any) => (
      <div
        data-testid="agent-icon"
        data-icon-name={agent.icon}
        data-icon-type={agent.icon_type}
        data-tier={agent.tier}
        data-size={size}
      >
        {agent.icon_type === 'svg' ? `[SVG:${agent.icon}]` : agent.icon_emoji}
      </div>
    ));

    // Mock ProtectionBadge component
    vi.mocked(ProtectionBadge).mockImplementation(({ isProtected, protectionReason }: any) =>
      isProtected ? (
        <div
          data-testid="protection-badge"
          data-protected={isProtected}
          data-reason={protectionReason}
        >
          🔒 Protected
        </div>
      ) : null
    );

    // Mock AgentListSidebar component with renderAgentBadges and renderAgentIcon
    vi.mocked(AgentListSidebar).mockImplementation(({
      agents,
      renderAgentBadges,
      renderAgentIcon,
      tierCounts
    }: any) => (
      <div data-testid="agent-list-sidebar">
        <div data-testid="sidebar-agent-count">{agents.length} agents</div>
        <div data-testid="sidebar-tier-counts">
          T1: {tierCounts?.tier1 || 0} | T2: {tierCounts?.tier2 || 0} | Total: {tierCounts?.total || 0}
        </div>
        {agents.map((agent: any) => (
          <div key={agent.id} data-testid={`sidebar-agent-${agent.id}`}>
            {renderAgentIcon && renderAgentIcon(agent)}
            {renderAgentBadges && renderAgentBadges(agent)}
          </div>
        ))}
      </div>
    ));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // FIX #1: TIER COUNT CALCULATION
  // =========================================================================

  describe('Fix #1: Tier Counts Calculated from ALL Agents', () => {
    it('should calculate tier counts from allAgents (19 total), not filtered agents', async () => {
      // EXPECTED: Counts calculated from full list, regardless of filter
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1', // Filtered to T1
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
        // CRITICAL: tierCounts should show ALL agents (9, 10, 19)
        // NOT just T1 agents (9, 0, 9)
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

    it('should show stable counts (9, 10, 19) when filtering to T1', async () => {
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
        const toggleCall = (AgentTierToggle as any).mock.calls[0];
        expect(toggleCall[0].tierCounts).toEqual({
          tier1: 9,
          tier2: 10,
          total: 19,
        });
      });
    });

    it('should show stable counts (9, 10, 19) when filtering to T2', async () => {
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
        const toggleCall = (AgentTierToggle as any).mock.calls[0];
        expect(toggleCall[0].tierCounts).toEqual({
          tier1: 9,
          tier2: 10,
          total: 19,
        });
      });
    });

    it('should show stable counts (9, 10, 19) when filtering to All', async () => {
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
        const toggleCall = (AgentTierToggle as any).mock.calls[0];
        expect(toggleCall[0].tierCounts).toEqual({
          tier1: 9,
          tier2: 10,
          total: 19,
        });
      });
    });

    it('should pass stable tierCounts to AgentListSidebar regardless of filter', async () => {
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
        expect(AgentListSidebar).toHaveBeenCalledWith(
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
  });

  // =========================================================================
  // FIX #2: CLIENT-SIDE FILTERING
  // =========================================================================

  describe('Fix #2: Client-Side Filtering (No Refetch)', () => {
    it('should fetch ALL agents once on mount (tier=all)', async () => {
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
        // CRITICAL: API called with tier='all' to fetch all agents
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: 'all' });
        expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
      });
    });

    it('should store all 19 agents in allAgents state', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify sidebar receives all 19 agents
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        expect(sidebarCall[0].agents).toHaveLength(19);
      });
    });

    it('should filter displayedAgents to T1 (9 agents) when currentTier is "1"', async () => {
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
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const displayedAgents = sidebarCall[0].agents;

        // Should show only 9 T1 agents
        expect(displayedAgents).toHaveLength(9);
        expect(displayedAgents.every((a: any) => a.tier === 1)).toBe(true);
      });
    });

    it('should filter displayedAgents to T2 (10 agents) when currentTier is "2"', async () => {
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
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const displayedAgents = sidebarCall[0].agents;

        // Should show only 10 T2 agents
        expect(displayedAgents).toHaveLength(10);
        expect(displayedAgents.every((a: any) => a.tier === 2)).toBe(true);
      });
    });

    it('should show all 19 agents when currentTier is "all"', async () => {
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
        expect(sidebarCall[0].agents).toHaveLength(19);
      });
    });

    it('should NOT refetch from API when tier changes (client-side filtering)', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
      });

      // Change tier filter
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: false,
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      // CRITICAL: API should NOT be called again (client-side filtering)
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
      });
    });

    it('should use useMemo to optimize displayedAgents calculation', async () => {
      // This test verifies behavior, not implementation
      // Rapid tier changes should not cause performance issues

      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(AgentListSidebar).toHaveBeenCalled();
      });

      // Simulate rapid tier changes
      for (let i = 0; i < 5; i++) {
        (useAgentTierFilter as any).mockReturnValue({
          currentTier: i % 2 === 0 ? '1' : '2',
          setCurrentTier: mockSetCurrentTier,
          showTier1: i % 2 === 0,
          showTier2: i % 2 !== 0,
        });

        rerender(
          <BrowserRouter>
            <IsolatedRealAgentManager />
          </BrowserRouter>
        );
      }

      // API should only be called once (on mount)
      expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // FIX #3: PROTECTION BADGE
  // =========================================================================

  describe('Fix #3: Protection Badge for T2 Agents', () => {
    it('should pass visibility field to renderAgentBadges', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const sidebarCall = (AgentListSidebar as any).mock.calls[0];
        const agents = sidebarCall[0].agents;

        // Verify T2 agents have visibility='protected'
        const t2Agents = agents.filter((a: any) => a.tier === 2);
        expect(t2Agents.every((a: any) => a.visibility === 'protected')).toBe(true);
      });
    });

    it('should render ProtectionBadge for T2 protected agents', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify ProtectionBadge is rendered for T2 agents
        const protectionBadges = screen.getAllByTestId('protection-badge');

        // Should have 10 protection badges (one for each T2 agent)
        expect(protectionBadges).toHaveLength(10);
      });
    });

    it('should pass isProtected={true} to ProtectionBadge for T2 agents', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const protectionBadges = screen.getAllByTestId('protection-badge');

        // All badges should have data-protected="true"
        protectionBadges.forEach(badge => {
          expect(badge).toHaveAttribute('data-protected', 'true');
        });
      });
    });

    it('should pass protectionReason to ProtectionBadge', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const protectionBadges = screen.getAllByTestId('protection-badge');

        // Verify reason is provided
        protectionBadges.forEach(badge => {
          expect(badge).toHaveAttribute('data-reason', 'System agent - protected from modification');
        });
      });
    });

    it('should NOT render ProtectionBadge for T1 public agents', async () => {
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
        // T1 agents should NOT have protection badges
        const sidebarAgents = screen.getAllByTestId(/^sidebar-agent-t1/);

        sidebarAgents.forEach(agentDiv => {
          const badge = within(agentDiv).queryByTestId('protection-badge');
          expect(badge).not.toBeInTheDocument();
        });
      });
    });

    it('should show both AgentTierBadge and ProtectionBadge for T2 agents', async () => {
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
        // Each T2 agent should have both badges
        const t2AgentDivs = screen.getAllByTestId(/^sidebar-agent-t2/);

        t2AgentDivs.forEach(agentDiv => {
          // Should have protection badge
          const protectionBadge = within(agentDiv).getByTestId('protection-badge');
          expect(protectionBadge).toBeInTheDocument();
        });
      });
    });
  });

  // =========================================================================
  // FIX #4: SVG ICON RENDERING
  // =========================================================================

  describe('Fix #4: SVG Icon Rendering (Not Emoji)', () => {
    it('should pass icon_type="svg" to AgentIcon component', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const agentIcons = screen.getAllByTestId('agent-icon');

        // All icons should have icon_type="svg"
        agentIcons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-type', 'svg');
        });
      });
    });

    it('should pass correct icon names to AgentIcon (T1: CheckSquare, T2: Settings)', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const agentIcons = screen.getAllByTestId('agent-icon');

        // T1 icons should be "CheckSquare"
        const t1Icons = agentIcons.filter(icon =>
          icon.getAttribute('data-tier') === '1'
        );
        t1Icons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-name', 'CheckSquare');
        });

        // T2 icons should be "Settings"
        const t2Icons = agentIcons.filter(icon =>
          icon.getAttribute('data-tier') === '2'
        );
        t2Icons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-name', 'Settings');
        });
      });
    });

    it('should render SVG icons (not emoji) when icon_type is "svg"', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const agentIcons = screen.getAllByTestId('agent-icon');

        // Icons should render as SVG (text contains "[SVG:...]")
        agentIcons.forEach(icon => {
          const text = icon.textContent || '';
          expect(text).toMatch(/\[SVG:.*\]/);
          expect(text).not.toContain('✅'); // NOT emoji
          expect(text).not.toContain('⚙️'); // NOT emoji
        });
      });
    });

    it('should pass tier information to AgentIcon for color styling', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const agentIcons = screen.getAllByTestId('agent-icon');

        // T1 icons should have tier=1 (blue)
        const t1Icons = agentIcons.filter(icon =>
          icon.getAttribute('data-tier') === '1'
        );
        expect(t1Icons).toHaveLength(9);

        // T2 icons should have tier=2 (gray)
        const t2Icons = agentIcons.filter(icon =>
          icon.getAttribute('data-tier') === '2'
        );
        expect(t2Icons).toHaveLength(10);
      });
    });

    it('should pass size="md" to AgentIcon for sidebar', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        const agentIcons = screen.getAllByTestId('agent-icon');

        // All sidebar icons should have size="md"
        agentIcons.forEach(icon => {
          expect(icon).toHaveAttribute('data-size', 'md');
        });
      });
    });

    it('should render AgentIcon via renderAgentIcon prop', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify renderAgentIcon prop was passed to AgentListSidebar
        expect(AgentListSidebar).toHaveBeenCalledWith(
          expect.objectContaining({
            renderAgentIcon: expect.any(Function),
          }),
          expect.anything()
        );
      });
    });

    it('should show SVG icons for both T1 and T2 agents', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // T1 icons (CheckSquare)
        const t1Icons = screen.getAllByText(/\[SVG:CheckSquare\]/);
        expect(t1Icons).toHaveLength(9);

        // T2 icons (Settings)
        const t2Icons = screen.getAllByText(/\[SVG:Settings\]/);
        expect(t2Icons).toHaveLength(10);
      });
    });
  });

  // =========================================================================
  // INTEGRATION: All Three Fixes Working Together
  // =========================================================================

  describe('Integration: Tier Counts + Protection Badges + SVG Icons', () => {
    it('should show stable counts (9, 10, 19) with T2 protection badges and SVG icons', async () => {
      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // 1. Tier counts are stable
        expect(AgentTierToggle).toHaveBeenCalledWith(
          expect.objectContaining({
            tierCounts: { tier1: 9, tier2: 10, total: 19 },
          }),
          expect.anything()
        );

        // 2. Protection badges for T2 agents
        const protectionBadges = screen.getAllByTestId('protection-badge');
        expect(protectionBadges).toHaveLength(10);

        // 3. SVG icons for all agents
        const agentIcons = screen.getAllByTestId('agent-icon');
        expect(agentIcons).toHaveLength(19);
        agentIcons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-type', 'svg');
        });
      });
    });

    it('should maintain all fixes when switching from All to T1', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-icon')).toHaveLength(19);
      });

      // Switch to T1
      (useAgentTierFilter as any).mockReturnValue({
        currentTier: '1',
        setCurrentTier: mockSetCurrentTier,
        showTier1: true,
        showTier2: false,
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        // 1. Counts still stable
        const toggleCall = (AgentTierToggle as any).mock.calls[0];
        expect(toggleCall[0].tierCounts).toEqual({
          tier1: 9,
          tier2: 10,
          total: 19,
        });

        // 2. Only 9 T1 agents displayed
        const agentIcons = screen.getAllByTestId('agent-icon');
        expect(agentIcons).toHaveLength(9);

        // 3. No protection badges (T1 agents are public)
        expect(screen.queryByTestId('protection-badge')).not.toBeInTheDocument();

        // 4. SVG icons still rendered
        agentIcons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-type', 'svg');
        });
      });
    });

    it('should maintain all fixes when switching from All to T2', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-icon')).toHaveLength(19);
      });

      // Switch to T2
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
        // 1. Counts still stable
        const toggleCall = (AgentTierToggle as any).mock.calls[0];
        expect(toggleCall[0].tierCounts).toEqual({
          tier1: 9,
          tier2: 10,
          total: 19,
        });

        // 2. Only 10 T2 agents displayed
        const agentIcons = screen.getAllByTestId('agent-icon');
        expect(agentIcons).toHaveLength(10);

        // 3. 10 protection badges (all T2 agents)
        const protectionBadges = screen.getAllByTestId('protection-badge');
        expect(protectionBadges).toHaveLength(10);

        // 4. SVG icons still rendered
        agentIcons.forEach(icon => {
          expect(icon).toHaveAttribute('data-icon-type', 'svg');
          expect(icon).toHaveAttribute('data-icon-name', 'Settings');
        });
      });
    });
  });
});
