/**
 * IsolatedRealAgentManager - Tier Filter Click Bug Fix Tests
 *
 * TDD London School (Mockist) Approach
 * Bug: Clicking tier buttons destroys apiService causing "Route Disconnected" error
 *
 * Investigation: /workspaces/agent-feed/TIER-FILTER-ERRORS-INVESTIGATION.md
 *
 * Root Cause:
 * - useEffect has loadAgents in dependencies
 * - loadAgents has currentTier in dependencies
 * - When currentTier changes, loadAgents is recreated
 * - useEffect sees loadAgents changed, runs cleanup
 * - Cleanup calls apiService.destroy()
 * - Component shows "Route Disconnected" error
 *
 * These tests MUST fail initially (TDD - write tests first).
 * All collaborators are mocked (London School).
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import IsolatedRealAgentManager from '../../components/IsolatedRealAgentManager';

// Mock all dependencies (London School - isolate the unit)
vi.mock('../../hooks/useAgentTierFilter');
vi.mock('../../components/agents/AgentTierToggle');
vi.mock('../../components/AgentListSidebar');
vi.mock('../../components/WorkingAgentProfile');
vi.mock('../../services/apiServiceIsolated');
vi.mock('../../components/RouteWrapper', () => ({
  useRoute: () => ({
    routeKey: 'agents',
    registerCleanup: vi.fn(),
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ agentSlug: undefined }),
    useNavigate: () => vi.fn(),
  };
});

import { useAgentTierFilter } from '../../hooks/useAgentTierFilter';
import { AgentTierToggle } from '../../components/agents/AgentTierToggle';
import AgentListSidebar from '../../components/AgentListSidebar';
import { createApiService } from '../../services/apiServiceIsolated';

describe('IsolatedRealAgentManager - Tier Filter Click Behavior (TDD London School)', () => {
  // Mock collaborators
  let mockApiService: any;
  let mockSetCurrentTier: ReturnType<typeof vi.fn>;
  let mockDestroy: ReturnType<typeof vi.fn>;
  let mockGetAgents: ReturnType<typeof vi.fn>;
  let currentTierValue: '1' | '2' | 'all';

  // Test data - 9 T1 agents, 10 T2 agents (19 total)
  const tier1Agents = Array.from({ length: 9 }, (_, i) => ({
    id: `t1-${i + 1}`,
    slug: `tier1-agent-${i + 1}`,
    name: `T1 Agent ${i + 1}`,
    display_name: `Tier 1 Agent ${i + 1}`,
    tier: 1,
    visibility: 'public',
    icon: '🤖',
    icon_type: 'emoji',
    icon_emoji: '🤖',
    description: 'User-facing agent',
    status: 'active',
  }));

  const tier2Agents = Array.from({ length: 10 }, (_, i) => ({
    id: `t2-${i + 1}`,
    slug: `tier2-agent-${i + 1}`,
    name: `T2 Agent ${i + 1}`,
    display_name: `Tier 2 Agent ${i + 1}`,
    tier: 2,
    visibility: 'protected',
    icon: '⚙️',
    icon_type: 'emoji',
    icon_emoji: '⚙️',
    description: 'System agent',
    status: 'active',
  }));

  const allAgents = [...tier1Agents, ...tier2Agents];

  beforeEach(() => {
    vi.clearAllMocks();
    currentTierValue = '1'; // Default tier

    // Mock API service with destroy spy
    mockDestroy = vi.fn();
    mockGetAgents = vi.fn().mockResolvedValue({
      success: true,
      agents: tier1Agents,
      totalAgents: 9,
    });

    mockApiService = {
      getAgents: mockGetAgents,
      on: vi.fn(),
      destroy: mockDestroy,
      getStatus: vi.fn().mockReturnValue({
        isDestroyed: false,
        activeRequests: 0,
      }),
    };

    (createApiService as any).mockReturnValue(mockApiService);

    // Mock useAgentTierFilter with dynamic tier changes
    mockSetCurrentTier = vi.fn((newTier: '1' | '2' | 'all') => {
      currentTierValue = newTier;
    });

    (useAgentTierFilter as any).mockImplementation(() => ({
      currentTier: currentTierValue,
      setCurrentTier: mockSetCurrentTier,
      showTier1: currentTierValue === '1' || currentTierValue === 'all',
      showTier2: currentTierValue === '2' || currentTierValue === 'all',
    }));

    // Mock AgentTierToggle - renders clickable buttons
    (AgentTierToggle as any).mockImplementation(({ currentTier, onTierChange, tierCounts }) => (
      <div data-testid="agent-tier-toggle">
        <button
          onClick={() => onTierChange('1')}
          data-testid="tier-1-button"
          aria-label={`Tier 1 (${tierCounts?.tier1 || 0})`}
        >
          T1 ({tierCounts?.tier1 || 0})
        </button>
        <button
          onClick={() => onTierChange('2')}
          data-testid="tier-2-button"
          aria-label={`Tier 2 (${tierCounts?.tier2 || 0})`}
        >
          T2 ({tierCounts?.tier2 || 0})
        </button>
        <button
          onClick={() => onTierChange('all')}
          data-testid="tier-all-button"
          aria-label={`All (${tierCounts?.total || 0})`}
        >
          All ({tierCounts?.total || 0})
        </button>
      </div>
    ));

    // Mock AgentListSidebar
    (AgentListSidebar as any).mockImplementation(({ agents }) => (
      <div data-testid="agent-list-sidebar">
        <div data-testid="agent-count">{agents.length}</div>
      </div>
    ));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * CRITICAL TEST #1: apiService.destroy() Should NOT Be Called on Tier Change
   *
   * This is the core bug: changing currentTier recreates loadAgents callback,
   * which triggers useEffect cleanup, which calls apiService.destroy().
   *
   * Expected: apiService.destroy() is NEVER called when tier changes
   * Current: apiService.destroy() IS called (BUG)
   *
   * EXPECTED TO FAIL until bug is fixed
   */
  describe('BUG FIX: apiService Lifecycle Protection', () => {
    it('should NOT destroy apiService when currentTier changes from "1" to "2"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      // Wait for initial mount
      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Verify apiService not destroyed yet
      expect(mockDestroy).not.toHaveBeenCalled();

      // TRIGGER THE BUG: Change tier from '1' to '2'
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      // Wait for new tier to load
      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      // CRITICAL ASSERTION: apiService.destroy() should NOT be called
      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('should NOT destroy apiService when currentTier changes from "2" to "all"', async () => {
      currentTierValue = '2';
      mockGetAgents.mockResolvedValue({
        success: true,
        agents: tier2Agents,
        totalAgents: 10,
      });

      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      expect(mockDestroy).not.toHaveBeenCalled();

      // Change to 'all'
      await act(async () => {
        currentTierValue = 'all';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: allAgents,
          totalAgents: 19,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: 'all' });
      });

      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('should NOT destroy apiService when tier changes multiple times (T1 → T2 → All → T1)', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // T1 → T2
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });
      rerender(<BrowserRouter><IsolatedRealAgentManager /></BrowserRouter>);
      await waitFor(() => expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' }));

      // T2 → All
      await act(async () => {
        currentTierValue = 'all';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: allAgents,
          totalAgents: 19,
        });
      });
      rerender(<BrowserRouter><IsolatedRealAgentManager /></BrowserRouter>);
      await waitFor(() => expect(mockGetAgents).toHaveBeenCalledWith({ tier: 'all' }));

      // All → T1
      await act(async () => {
        currentTierValue = '1';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier1Agents,
          totalAgents: 9,
        });
      });
      rerender(<BrowserRouter><IsolatedRealAgentManager /></BrowserRouter>);
      await waitFor(() => expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' }));

      // CRITICAL: destroy should NEVER be called during tier changes
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });

  /**
   * TEST #2: loadAgents Should Be Called on Tier Change
   *
   * When tier changes, we need to reload agents with new tier parameter.
   * This should happen WITHOUT destroying apiService.
   */
  describe('Agent Reloading on Tier Change', () => {
    it('should call loadAgents when currentTier changes from "1" to "2"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      const initialCallCount = mockGetAgents.mock.calls.length;

      // Change tier
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
        expect(mockGetAgents.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should pass correct tier parameter to API when tier changes to "all"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      await act(async () => {
        currentTierValue = 'all';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: allAgents,
          totalAgents: 19,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: 'all' });
      });
    });
  });

  /**
   * TEST #3: apiService.isDestroyed Should Stay False
   *
   * After tier changes, apiService should still be active (not destroyed).
   */
  describe('API Service Status After Tier Change', () => {
    it('should keep apiService.isDestroyed as false after tier change from "1" to "2"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Get initial status
      const initialStatus = mockApiService.getStatus();
      expect(initialStatus.isDestroyed).toBe(false);

      // Change tier
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      // Verify status still active
      const statusAfterChange = mockApiService.getStatus();
      expect(statusAfterChange.isDestroyed).toBe(false);
    });

    it('should keep apiService.isDestroyed as false after multiple tier changes', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Multiple tier changes
      for (const tier of ['2', 'all', '1', '2'] as const) {
        await act(async () => {
          currentTierValue = tier;
          const agents = tier === '1' ? tier1Agents : tier === '2' ? tier2Agents : allAgents;
          mockGetAgents.mockResolvedValue({
            success: true,
            agents,
            totalAgents: agents.length,
          });
        });

        rerender(
          <BrowserRouter>
            <IsolatedRealAgentManager />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(mockGetAgents).toHaveBeenCalledWith({ tier });
        });

        // Verify service not destroyed
        expect(mockApiService.getStatus().isDestroyed).toBe(false);
      }
    });
  });

  /**
   * TEST #4: No "Route Disconnected" Error
   *
   * The component should NOT show "Route Disconnected" message after tier change.
   * This message appears when apiService.isDestroyed === true.
   */
  describe('No Route Disconnected Error After Tier Change', () => {
    it('should NOT show "Route Disconnected" error after tier change from "1" to "2"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Verify no error initially
      expect(screen.queryByText(/Route Disconnected/i)).not.toBeInTheDocument();

      // Change tier
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      // CRITICAL: No "Route Disconnected" error should appear
      expect(screen.queryByText(/Route Disconnected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/This component has been cleaned up/i)).not.toBeInTheDocument();
    });

    it('should NOT show "Route Disconnected" error after rapid tier changes', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Rapid tier changes: T1 → T2 → All → T1
      for (const tier of ['2', 'all', '1'] as const) {
        await act(async () => {
          currentTierValue = tier;
          const agents = tier === '1' ? tier1Agents : tier === '2' ? tier2Agents : allAgents;
          mockGetAgents.mockResolvedValue({
            success: true,
            agents,
            totalAgents: agents.length,
          });
        });

        rerender(
          <BrowserRouter>
            <IsolatedRealAgentManager />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(mockGetAgents).toHaveBeenCalledWith({ tier });
        });

        // Should never show error
        expect(screen.queryByText(/Route Disconnected/i)).not.toBeInTheDocument();
      }
    });
  });

  /**
   * TEST #5: Correct Agent Counts After Tier Change
   *
   * After tier change, the correct number of agents should be displayed.
   */
  describe('Agent Count Updates on Tier Change', () => {
    it('should update agents to 9 when tier changes to "1"', async () => {
      currentTierValue = 'all';
      mockGetAgents.mockResolvedValue({
        success: true,
        agents: allAgents,
        totalAgents: 19,
      });

      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: 'all' });
      });

      // Change to tier 1
      await act(async () => {
        currentTierValue = '1';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier1Agents,
          totalAgents: 9,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Verify correct agent count
      await waitFor(() => {
        expect(screen.getByTestId('agent-count')).toHaveTextContent('9');
      });
    });

    it('should update agents to 10 when tier changes to "2"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Change to tier 2
      await act(async () => {
        currentTierValue = '2';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: tier2Agents,
          totalAgents: 10,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      // Verify correct agent count
      await waitFor(() => {
        expect(screen.getByTestId('agent-count')).toHaveTextContent('10');
      });
    });

    it('should update agents to 19 when tier changes to "all"', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Change to all tiers
      await act(async () => {
        currentTierValue = 'all';
        mockGetAgents.mockResolvedValue({
          success: true,
          agents: allAgents,
          totalAgents: 19,
        });
      });

      rerender(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ tier: 'all' });
      });

      // Verify correct agent count
      await waitFor(() => {
        expect(screen.getByTestId('agent-count')).toHaveTextContent('19');
      });
    });
  });

  /**
   * TEST #6: Component Interaction Tests
   *
   * Test actual button clicks triggering tier changes
   */
  describe('Tier Button Click Interactions', () => {
    it('should handle clicking Tier 2 button without destroying apiService', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier-2-button')).toBeInTheDocument();
      });

      // Clear previous calls
      mockDestroy.mockClear();

      // Click tier 2 button
      const tier2Button = screen.getByTestId('tier-2-button');
      await user.click(tier2Button);

      // Wait a bit for any effects to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // apiService should NOT be destroyed
      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('should handle clicking All button without destroying apiService', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier-all-button')).toBeInTheDocument();
      });

      mockDestroy.mockClear();

      // Click all button
      const allButton = screen.getByTestId('tier-all-button');
      await user.click(allButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('should handle rapid button clicks without destroying apiService', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <IsolatedRealAgentManager />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier-1-button')).toBeInTheDocument();
      });

      mockDestroy.mockClear();

      // Rapid clicks: T1 → T2 → All → T1 → T2
      const tier1Btn = screen.getByTestId('tier-1-button');
      const tier2Btn = screen.getByTestId('tier-2-button');
      const allBtn = screen.getByTestId('tier-all-button');

      await user.click(tier2Btn);
      await user.click(allBtn);
      await user.click(tier1Btn);
      await user.click(tier2Btn);

      await new Promise(resolve => setTimeout(resolve, 200));

      // apiService should NEVER be destroyed
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });
});
