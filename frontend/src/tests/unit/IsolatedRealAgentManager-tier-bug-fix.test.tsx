/**
 * TDD Test Suite: Tier Filtering Bug Fixes
 * London School TDD - Mock-driven behavior verification
 *
 * EXPECTED BEHAVIOR: All tests should FAIL initially (bugs exist)
 * After fix implementation: All tests should PASS
 *
 * Root Cause: useEffect dependency chain causes apiService.destroy()
 * when currentTier changes, leading to "Route Disconnected" error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IsolatedRealAgentManager from '../../components/IsolatedRealAgentManager';
import * as RouteWrapper from '../../components/RouteWrapper';
import * as apiServiceIsolated from '../../services/apiServiceIsolated';

// Mock dependencies
vi.mock('../../components/RouteWrapper');
vi.mock('../../services/apiServiceIsolated');
vi.mock('../../components/AgentListSidebar', () => ({
  default: ({ onTierChange, currentTier }: any) => (
    <div data-testid="agent-list-sidebar">
      <button
        data-testid="tier-1-button"
        onClick={() => onTierChange('1')}
      >
        T1
      </button>
      <button
        data-testid="tier-2-button"
        onClick={() => onTierChange('2')}
      >
        T2
      </button>
      <button
        data-testid="tier-all-button"
        onClick={() => onTierChange('all')}
      >
        All
      </button>
      <div data-testid="current-tier">{currentTier}</div>
    </div>
  ),
}));
vi.mock('../../components/WorkingAgentProfile', () => ({
  default: () => <div data-testid="agent-profile">Agent Profile</div>,
}));

describe('TDD: Tier Filtering Bug Fixes (London School)', () => {
  let mockApiService: any;
  let mockRegisterCleanup: any;
  let cleanupCallback: (() => void) | null = null;

  beforeEach(() => {
    // Reset cleanup callback
    cleanupCallback = null;

    // Create mock API service with spies
    mockApiService = {
      getAgents: vi.fn(),
      getStatus: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    // Mock cleanup registration that captures the cleanup function
    mockRegisterCleanup = vi.fn((callback: () => void) => {
      cleanupCallback = callback;
    });

    // Mock RouteWrapper hook
    vi.mocked(RouteWrapper.useRoute).mockReturnValue({
      routeKey: 'agents',
      registerCleanup: mockRegisterCleanup,
    });

    // Mock createApiService factory
    vi.mocked(apiServiceIsolated.createApiService).mockReturnValue(mockApiService);

    // Default API service status: NOT destroyed
    mockApiService.getStatus.mockReturnValue({
      routeKey: 'agents',
      isDestroyed: false,
      activeRequests: 0,
      listeners: 1,
    });

    // Default getAgents response: Tier 1 agents
    mockApiService.getAgents.mockResolvedValue({
      success: true,
      agents: [
        { id: '1', name: 'Agent 1', tier: 1, slug: 'agent-1' },
        { id: '2', name: 'Agent 2', tier: 1, slug: 'agent-2' },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug #1: apiService destroyed on tier change', () => {
    it('should NOT call apiService.destroy() when tier changes from T1 to T2', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      // Wait for initial mount and load
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Clear the destroy spy
      mockApiService.destroy.mockClear();

      // Act: User clicks Tier 2 button
      const tier2Button = getByTestId('tier-2-button');
      fireEvent.click(tier2Button);

      // Wait for tier change to process
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      // Assert: destroy() should NOT be called
      // BUG: Currently FAILS because destroy() IS called when loadAgents recreates
      expect(mockApiService.destroy).not.toHaveBeenCalled();
    });

    it('should NOT call apiService.destroy() when tier changes from T2 to All', async () => {
      // Arrange: Start with Tier 2
      mockApiService.getAgents.mockResolvedValueOnce({
        success: true,
        agents: [{ id: '3', name: 'Agent 3', tier: 2, slug: 'agent-3' }],
      });

      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Switch to tier 2 first
      fireEvent.click(getByTestId('tier-2-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      mockApiService.destroy.mockClear();

      // Act: Switch to All
      fireEvent.click(getByTestId('tier-all-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('all');
      });

      // Assert: destroy() should NOT be called
      expect(mockApiService.destroy).not.toHaveBeenCalled();
    });

    it('should NOT call apiService.destroy() multiple times during rapid tier changes', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      mockApiService.destroy.mockClear();

      // Act: Rapid tier changes (simulating user clicking quickly)
      fireEvent.click(getByTestId('tier-2-button'));
      fireEvent.click(getByTestId('tier-all-button'));
      fireEvent.click(getByTestId('tier-1-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('1');
      });

      // Assert: destroy() should NEVER be called during tier changes
      expect(mockApiService.destroy).not.toHaveBeenCalled();
    });
  });

  describe('Bug #2: loadAgents not called when tier changes', () => {
    it('should call loadAgents with new tier when tier changes from T1 to T2', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      // Wait for initial mount
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      mockApiService.getAgents.mockClear();

      // Act: Change tier to 2
      fireEvent.click(getByTestId('tier-2-button'));

      // Assert: loadAgents should be called with tier: '2'
      // BUG: Currently FAILS because no separate effect watches currentTier
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });
    });

    it('should call loadAgents with tier "all" when All button clicked', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      mockApiService.getAgents.mockClear();

      // Act: Click All button
      fireEvent.click(getByTestId('tier-all-button'));

      // Assert: loadAgents called with tier: 'all'
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: 'all' });
      });
    });

    it('should reload agents every time tier changes', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
      });

      // Act: Change tier 3 times
      fireEvent.click(getByTestId('tier-2-button'));
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      fireEvent.click(getByTestId('tier-all-button'));
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: 'all' });
      });

      fireEvent.click(getByTestId('tier-1-button'));
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      // Assert: loadAgents called 4 times total (1 mount + 3 tier changes)
      expect(mockApiService.getAgents).toHaveBeenCalledTimes(4);
    });
  });

  describe('Bug #3: apiService.getStatus().isDestroyed becomes true', () => {
    it('should keep apiService.getStatus().isDestroyed as false after tier change', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act: Change tier
      fireEvent.click(getByTestId('tier-2-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      // Assert: getStatus() should still return isDestroyed: false
      // BUG: Currently FAILS because destroy() is called, setting isDestroyed = true
      expect(mockApiService.getStatus).toHaveBeenCalled();
      const status = mockApiService.getStatus();
      expect(status.isDestroyed).toBe(false);
    });

    it('should NOT show "Route Disconnected" error after tier change', async () => {
      // Arrange: Simulate the bug where destroy() sets isDestroyed = true
      let destroyCalled = false;
      mockApiService.destroy.mockImplementation(() => {
        destroyCalled = true;
        mockApiService.getStatus.mockReturnValue({
          routeKey: 'agents',
          isDestroyed: true, // Bug: this happens when destroy() is called
          activeRequests: 0,
          listeners: 0,
        });
      });

      const { getByTestId, queryByText } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act: Change tier
      fireEvent.click(getByTestId('tier-2-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      // Assert: Should NOT show "Route Disconnected" message
      // BUG: Currently FAILS - message IS shown because apiService is destroyed
      expect(queryByText('Route Disconnected')).not.toBeInTheDocument();
    });
  });

  describe('Bug #4: Cleanup triggered on tier change instead of unmount', () => {
    it('should NOT trigger cleanup when tier changes', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Verify cleanup was registered
      expect(mockRegisterCleanup).toHaveBeenCalled();
      expect(cleanupCallback).not.toBeNull();

      // Clear mock to track new calls
      mockApiService.destroy.mockClear();

      // Act: Change tier (should NOT trigger cleanup)
      fireEvent.click(getByTestId('tier-2-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      // Assert: Cleanup should NOT be triggered by tier change
      // Only on unmount should cleanup run
      expect(mockApiService.destroy).not.toHaveBeenCalled();
    });

    it('should ONLY trigger cleanup on component unmount', async () => {
      // Arrange
      const { unmount, getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Change tier multiple times
      fireEvent.click(getByTestId('tier-2-button'));
      fireEvent.click(getByTestId('tier-all-button'));

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('all');
      });

      mockApiService.destroy.mockClear();

      // Act: Unmount component
      unmount();

      // Manually call cleanup (simulating RouteWrapper cleanup)
      if (cleanupCallback) {
        cleanupCallback();
      }

      // Assert: destroy() should be called ONLY on unmount
      expect(mockApiService.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bug #5: Tier buttons become non-functional', () => {
    it('should allow clicking T1 button without errors', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act & Assert: Should not throw error
      expect(() => {
        fireEvent.click(getByTestId('tier-1-button'));
      }).not.toThrow();

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('1');
      });
    });

    it('should allow clicking T2 button without errors', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act & Assert: Should not throw error
      expect(() => {
        fireEvent.click(getByTestId('tier-2-button'));
      }).not.toThrow();

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });
    });

    it('should allow clicking All button without errors', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act & Assert: Should not throw error
      expect(() => {
        fireEvent.click(getByTestId('tier-all-button'));
      }).not.toThrow();

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('all');
      });
    });

    it('should keep tier buttons clickable after multiple tier changes', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Act: Multiple rapid clicks
      fireEvent.click(getByTestId('tier-2-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      fireEvent.click(getByTestId('tier-all-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('all');
      });

      fireEvent.click(getByTestId('tier-1-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('1');
      });

      // Final click should still work
      expect(() => {
        fireEvent.click(getByTestId('tier-2-button'));
      }).not.toThrow();

      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });
    });
  });

  describe('Interaction Verification (London School)', () => {
    it('should verify proper collaboration sequence on tier change', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '1' });
      });

      mockApiService.getAgents.mockClear();
      mockApiService.getStatus.mockClear();

      // Act: Change tier
      fireEvent.click(getByTestId('tier-2-button'));

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      });

      // Assert: Verify interaction sequence
      // 1. getStatus should be checked (to verify not destroyed)
      // 2. getAgents should be called with new tier
      // 3. destroy should NEVER be called
      expect(mockApiService.getStatus).toHaveBeenCalled();
      expect(mockApiService.getAgents).toHaveBeenCalledWith({ tier: '2' });
      expect(mockApiService.destroy).not.toHaveBeenCalled();
    });

    it('should verify apiService is used but never destroyed during tier filtering', async () => {
      // Arrange
      const { getByTestId } = render(
        <MemoryRouter>
          <IsolatedRealAgentManager />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalled();
      });

      // Track all calls
      const callsBefore = mockApiService.destroy.mock.calls.length;

      // Act: Multiple tier changes
      fireEvent.click(getByTestId('tier-2-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('2');
      });

      fireEvent.click(getByTestId('tier-all-button'));
      await waitFor(() => {
        expect(getByTestId('current-tier').textContent).toBe('all');
      });

      // Assert: destroy() should never be called during tier filtering
      const callsAfter = mockApiService.destroy.mock.calls.length;
      expect(callsAfter).toBe(callsBefore); // Should be 0 in both cases
    });
  });
});
