/**
 * Hemingway Bridge Component Tests
 * Tests for the always-visible engagement bridge
 *
 * Test Coverage:
 * - Bridge fetches from API on mount
 * - Bridge displays correct content and priority
 * - Bridge action button works
 * - Bridge updates after action
 * - Bridge handles errors gracefully
 * - Bridge shows loading state
 * - Bridge persists across feed changes
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HemingwayBridge } from '../../components/HemingwayBridge';

// Mock fetch
global.fetch = vi.fn();

describe('HemingwayBridge', () => {
  const mockUserId = 'demo-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    (global.fetch as any).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<HemingwayBridge userId={mockUserId} />);

    expect(screen.getByText(/loading next step/i)).toBeInTheDocument();
  });

  it('should fetch active bridge on mount', async () => {
    const mockBridge = {
      id: 'bridge-1',
      user_id: mockUserId,
      bridge_type: 'question',
      content: "What's on your mind today?",
      priority: 4,
      post_id: null,
      agent_id: null,
      action: null,
      active: 1,
      created_at: 1699000000,
      completed_at: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        allBridges: [mockBridge],
        count: 1
      })
    });

    render(<HemingwayBridge userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(mockBridge.content)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(`/api/bridges/active/${mockUserId}`);
  });

  it('should display bridge content correctly', async () => {
    const mockBridge = {
      id: 'bridge-1',
      user_id: mockUserId,
      bridge_type: 'next_step',
      content: 'Complete your onboarding!',
      priority: 2,
      post_id: null,
      agent_id: 'get-to-know-you-agent',
      action: 'trigger_phase2',
      active: 1,
      created_at: 1699000000,
      completed_at: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        allBridges: [mockBridge],
        count: 1
      })
    });

    render(<HemingwayBridge userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Complete your onboarding!')).toBeInTheDocument();
      expect(screen.getByText('Next Step')).toBeInTheDocument();
      expect(screen.getByText('Priority 2')).toBeInTheDocument();
      expect(screen.getByText('Start Phase 2')).toBeInTheDocument();
    });
  });

  it('should call completeBridge when action button clicked', async () => {
    const mockBridge = {
      id: 'bridge-1',
      user_id: mockUserId,
      bridge_type: 'question',
      content: "What's on your mind?",
      priority: 4,
      post_id: null,
      agent_id: null,
      action: null,
      active: 1,
      created_at: 1699000000,
      completed_at: null
    };

    const mockNewBridge = {
      id: 'bridge-2',
      user_id: mockUserId,
      bridge_type: 'insight',
      content: 'Tip: Mention agents with @',
      priority: 5,
      post_id: null,
      agent_id: null,
      action: null,
      active: 1,
      created_at: 1699000100,
      completed_at: null
    };

    // Mock initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        allBridges: [mockBridge],
        count: 1
      })
    });

    render(<HemingwayBridge userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(mockBridge.content)).toBeInTheDocument();
    });

    // Mock complete bridge
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: { ...mockBridge, active: 0, completed_at: 1699000050 },
        newBridge: mockNewBridge
      })
    });

    const actionButton = screen.getByTestId('bridge-action-button');
    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(screen.getByText(mockNewBridge.content)).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/bridges/complete/${mockBridge.id}`,
      { method: 'POST' }
    );
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<HemingwayBridge userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should call onBridgeAction callback when provided', async () => {
    const mockBridge = {
      id: 'bridge-1',
      user_id: mockUserId,
      bridge_type: 'next_step',
      content: 'Continue onboarding',
      priority: 2,
      post_id: null,
      agent_id: 'get-to-know-you-agent',
      action: 'trigger_phase2',
      active: 1,
      created_at: 1699000000,
      completed_at: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        allBridges: [mockBridge],
        count: 1
      })
    });

    const mockCallback = vi.fn();
    render(<HemingwayBridge userId={mockUserId} onBridgeAction={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByText(mockBridge.content)).toBeInTheDocument();
    });

    // Mock complete bridge
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        newBridge: mockBridge
      })
    });

    const actionButton = screen.getByTestId('bridge-action-button');
    fireEvent.click(actionButton);

    expect(mockCallback).toHaveBeenCalledWith('trigger_phase2', mockBridge);
  });

  it('should display correct icon for each bridge type', async () => {
    const bridgeTypes = [
      { type: 'continue_thread', label: 'Continue Thread' },
      { type: 'next_step', label: 'Next Step' },
      { type: 'new_feature', label: 'New Feature' },
      { type: 'question', label: 'Question' },
      { type: 'insight', label: 'Tip' }
    ];

    for (const { type, label } of bridgeTypes) {
      const mockBridge = {
        id: `bridge-${type}`,
        user_id: mockUserId,
        bridge_type: type,
        content: `Test ${type}`,
        priority: 1,
        post_id: null,
        agent_id: null,
        action: null,
        active: 1,
        created_at: 1699000000,
        completed_at: null
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          bridge: mockBridge,
          allBridges: [mockBridge],
          count: 1
        })
      });

      const { unmount } = render(<HemingwayBridge userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      unmount();
      vi.clearAllMocks();
    }
  });

  it('should have sticky positioning', async () => {
    const mockBridge = {
      id: 'bridge-1',
      user_id: mockUserId,
      bridge_type: 'question',
      content: 'Test bridge',
      priority: 4,
      post_id: null,
      agent_id: null,
      action: null,
      active: 1,
      created_at: 1699000000,
      completed_at: null
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        bridge: mockBridge,
        allBridges: [mockBridge],
        count: 1
      })
    });

    render(<HemingwayBridge userId={mockUserId} />);

    await waitFor(() => {
      const bridgeElement = screen.getByTestId('hemingway-bridge');
      expect(bridgeElement).toHaveClass('sticky');
      expect(bridgeElement).toHaveClass('top-0');
      expect(bridgeElement).toHaveClass('z-40');
    });
  });
});
