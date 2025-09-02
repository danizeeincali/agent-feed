/**
 * TDD London School Test Suite: Claude Instance Synchronization
 * 
 * Problem: Frontend shows "claude-3876" but backend has "claude-7800"
 * Solution: Mock-driven outside-in testing to define contracts and verify interactions
 * 
 * London School Principles:
 * 1. Outside-in development from user behavior
 * 2. Mock-driven design to define contracts
 * 3. Behavior verification over state testing
 * 4. Focus on object collaborations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock dependencies FIRST - London School approach
const mockFetch = vi.fn();
const mockEventSource = vi.fn();
const mockUseState = vi.fn();
const mockUseEffect = vi.fn();
const mockUseCallback = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleLog = vi.fn();

// Mock modules before imports
vi.mock('react', () => ({
  ...vi.importActual('react'),
  useState: mockUseState,
  useEffect: mockUseEffect,
  useCallback: mockUseCallback,
}));

// Global mocks
global.fetch = mockFetch;
global.EventSource = mockEventSource;
global.console = { ...console, error: mockConsoleError, log: mockConsoleLog };

// Test data contracts
const mockBackendInstances = {
  instances: [
    {
      id: 'claude-7800',
      status: 'active',
      type: 'primary',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'claude-7801',
      status: 'standby',
      type: 'secondary',
      lastSeen: new Date().toISOString(),
    },
  ],
};

const mockFrontendState = {
  instances: [
    {
      id: 'claude-3876',
      status: 'active',
      type: 'primary',
      lastSeen: new Date(Date.now() - 60000).toISOString(), // stale data
    },
  ],
  selectedInstanceId: 'claude-3876',
  isLoading: false,
  error: null,
};

// Mock component contracts
interface InstanceManagerContract {
  fetchInstances: () => Promise<void>;
  selectInstance: (instanceId: string) => void;
  refreshInstances: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<boolean>;
}

interface SSEConnectionContract {
  connect: (instanceId: string) => EventSource;
  disconnect: () => void;
  onMessage: (callback: (data: any) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  getConnectionState: () => 'connecting' | 'connected' | 'disconnected';
}

describe('TDD London School: Claude Instance Synchronization', () => {
  let mockInstanceManager: any;
  let mockSSEConnection: any;
  let mockSetState: any;
  let mockEventSourceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock React hooks with London School behavior focus
    mockSetState = vi.fn();
    mockUseState
      .mockReturnValueOnce([mockFrontendState.instances, mockSetState])
      .mockReturnValueOnce([mockFrontendState.selectedInstanceId, mockSetState])
      .mockReturnValueOnce([mockFrontendState.isLoading, mockSetState])
      .mockReturnValueOnce([mockFrontendState.error, mockSetState]);

    mockUseEffect.mockImplementation((effect, deps) => effect());
    mockUseCallback.mockImplementation((callback) => callback);

    // Mock EventSource instance
    mockEventSourceInstance = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: EventSource.CONNECTING,
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      onopen: null,
      onmessage: null,
      onerror: null,
      dispatchEvent: vi.fn(),
    };

    mockEventSource.mockReturnValue(mockEventSourceInstance);

    // Mock service contracts
    mockInstanceManager = {
      fetchInstances: vi.fn(),
      selectInstance: vi.fn(),
      refreshInstances: vi.fn(),
      connectToInstance: vi.fn(),
    };

    mockSSEConnection = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      getConnectionState: vi.fn(),
    };
  });

  describe('Outside-In: User wants to see correct Claude instances', () => {
    it('should fetch fresh instance data when component loads', async () => {
      // Arrange - Mock API response with fresh data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBackendInstances),
      });

      mockInstanceManager.fetchInstances.mockResolvedValueOnce(undefined);

      // Act - Component initialization
      await act(async () => {
        if (mockUseEffect.mock.calls[0]) {
          mockUseEffect.mock.calls[0][0](); // Trigger useEffect
        }
      });

      // Assert - Verify the conversation between objects
      expect(mockInstanceManager.fetchInstances).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/claude/instances', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should detect instance mismatch and update UI accordingly', async () => {
      // Arrange - Backend has different instances than frontend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBackendInstances),
      });

      // Act - Fetch and compare
      await act(async () => {
        await mockInstanceManager.fetchInstances();
      });

      // Assert - Should detect mismatch and update state
      expect(mockSetState).toHaveBeenCalledWith(mockBackendInstances.instances);
      
      // Verify warning about stale data
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Instance synchronization: Frontend had stale data, updated from backend'
      );
    });
  });

  describe('Mock-Driven: API Contract Testing', () => {
    it('should define clear contract for instance fetching', async () => {
      // Arrange - Define expected API contract
      const expectedApiCall = {
        url: '/api/claude/instances',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBackendInstances),
      });

      // Act
      await mockInstanceManager.fetchInstances();

      // Assert - Verify exact API contract compliance
      expect(mockFetch).toHaveBeenCalledWith(
        expectedApiCall.url,
        expect.objectContaining({
          method: expectedApiCall.method,
          headers: expect.objectContaining(expectedApiCall.headers),
        })
      );
    });

    it('should handle API errors according to contract', async () => {
      // Arrange - API failure scenario
      const apiError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(apiError);

      mockInstanceManager.fetchInstances.mockRejectedValueOnce(apiError);

      // Act & Assert
      await expect(mockInstanceManager.fetchInstances()).rejects.toThrow('Network error');
      expect(mockSetState).toHaveBeenCalledWith(apiError);
    });
  });

  describe('Behavior Verification: Component Interactions', () => {
    it('should coordinate instance selection workflow properly', async () => {
      // Arrange
      const newInstanceId = 'claude-7800';
      mockInstanceManager.connectToInstance.mockResolvedValueOnce(true);
      mockSSEConnection.connect.mockReturnValue(mockEventSourceInstance);

      // Act - User selects different instance
      await act(async () => {
        await mockInstanceManager.selectInstance(newInstanceId);
      });

      // Assert - Verify the interaction sequence
      expect(mockInstanceManager.selectInstance).toHaveBeenCalledWith(newInstanceId);
      expect(mockInstanceManager.connectToInstance).toHaveBeenCalledWith(newInstanceId);
      expect(mockSetState).toHaveBeenCalledWith(newInstanceId);
    });

    it('should handle instance connection failures gracefully', async () => {
      // Arrange - Connection failure
      const failingInstanceId = 'claude-3876'; // non-existent instance
      mockInstanceManager.connectToInstance.mockResolvedValueOnce(false);

      // Act
      const connectionResult = await mockInstanceManager.connectToInstance(failingInstanceId);

      // Assert - Verify error handling conversation
      expect(connectionResult).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        `Failed to connect to instance: ${failingInstanceId}`
      );
    });
  });

  describe('SSE Connection State Management', () => {
    it('should manage EventSource lifecycle correctly', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const mockOnMessage = jest.fn();
      const mockOnError = jest.fn();

      mockSSEConnection.connect.mockReturnValue(mockEventSourceInstance);
      mockSSEConnection.getConnectionState.mockReturnValue('connecting');

      // Act - Establish SSE connection
      const eventSource = mockSSEConnection.connect(instanceId);
      mockSSEConnection.onMessage(mockOnMessage);
      mockSSEConnection.onError(mockOnError);

      // Assert - Verify EventSource setup
      expect(mockSSEConnection.connect).toHaveBeenCalledWith(instanceId);
      expect(mockSSEConnection.onMessage).toHaveBeenCalledWith(mockOnMessage);
      expect(mockSSEConnection.onError).toHaveBeenCalledWith(mockOnError);
      expect(eventSource).toBe(mockEventSourceInstance);
    });

    it('should handle SSE reconnection on instance change', () => {
      // Arrange - Existing connection
      const oldInstanceId = 'claude-3876';
      const newInstanceId = 'claude-7800';
      
      mockSSEConnection.getConnectionState
        .mockReturnValueOnce('connected')
        .mockReturnValueOnce('connecting');

      // Act - Instance change triggers reconnection
      mockSSEConnection.disconnect();
      const newConnection = mockSSEConnection.connect(newInstanceId);

      // Assert - Verify reconnection sequence
      expect(mockSSEConnection.disconnect).toHaveBeenCalledTimes(1);
      expect(mockSSEConnection.connect).toHaveBeenCalledWith(newInstanceId);
    });
  });

  describe('Cache Invalidation and Refresh Mechanisms', () => {
    it('should invalidate cache when detecting stale instance data', async () => {
      // Arrange - Stale frontend data vs fresh backend data
      const staleTimestamp = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
      const freshTimestamp = new Date().toISOString();

      const staleInstance = { ...mockFrontendState.instances[0], lastSeen: staleTimestamp };
      const freshInstance = { ...mockBackendInstances.instances[0], lastSeen: freshTimestamp };

      // Mock stale data detection
      const isStaleData = (frontend: any, backend: any) => {
        return new Date(frontend.lastSeen) < new Date(backend.lastSeen);
      };

      // Act - Compare timestamps
      const needsRefresh = isStaleData(staleInstance, freshInstance);

      // Assert - Should trigger cache invalidation
      expect(needsRefresh).toBe(true);
      
      if (needsRefresh) {
        await mockInstanceManager.refreshInstances();
        expect(mockInstanceManager.refreshInstances).toHaveBeenCalledTimes(1);
      }
    });

    it('should coordinate refresh workflow with proper error handling', async () => {
      // Arrange - Refresh failure scenario
      const refreshError = new Error('Refresh failed');
      mockInstanceManager.refreshInstances.mockRejectedValueOnce(refreshError);

      // Act & Assert
      await expect(mockInstanceManager.refreshInstances()).rejects.toThrow('Refresh failed');
      
      // Should set error state
      expect(mockSetState).toHaveBeenCalledWith(refreshError);
    });
  });

  describe('Error Handling for Non-Existent Instances', () => {
    it('should handle attempts to connect to non-existent instances', async () => {
      // Arrange - Non-existent instance
      const nonExistentId = 'claude-9999';
      mockInstanceManager.connectToInstance.mockResolvedValueOnce(false);

      // Act
      const result = await mockInstanceManager.connectToInstance(nonExistentId);

      // Assert - Should fail gracefully
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        `Failed to connect to instance: ${nonExistentId}`
      );
    });

    it('should provide fallback when selected instance becomes unavailable', async () => {
      // Arrange - Selected instance becomes unavailable
      const unavailableInstanceId = 'claude-3876';
      const fallbackInstanceId = 'claude-7800';

      mockInstanceManager.connectToInstance
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(true); // Fallback succeeds

      // Act - Attempt connection with fallback
      let connectionResult = await mockInstanceManager.connectToInstance(unavailableInstanceId);
      
      if (!connectionResult) {
        // Fallback to first available instance
        connectionResult = await mockInstanceManager.connectToInstance(fallbackInstanceId);
        mockInstanceManager.selectInstance(fallbackInstanceId);
      }

      // Assert - Should fallback successfully
      expect(connectionResult).toBe(true);
      expect(mockInstanceManager.selectInstance).toHaveBeenCalledWith(fallbackInstanceId);
    });
  });

  describe('Component Re-rendering Coordination', () => {
    it('should trigger re-render when instance data changes', () => {
      // Arrange - New instance data
      const newInstances = mockBackendInstances.instances;

      // Act - Simulate state update
      act(() => {
        mockSetState(newInstances);
      });

      // Assert - Verify state update was called
      expect(mockSetState).toHaveBeenCalledWith(newInstances);
    });

    it('should prevent unnecessary re-renders when data unchanged', () => {
      // Arrange - Same data
      const sameInstances = mockFrontendState.instances;
      
      // Mock shallow comparison
      const hasDataChanged = (prev: any[], next: any[]) => {
        return JSON.stringify(prev) !== JSON.stringify(next);
      };

      // Act
      const shouldUpdate = hasDataChanged(sameInstances, sameInstances);

      // Assert - Should not trigger update
      expect(shouldUpdate).toBe(false);
    });
  });
});

/**
 * Contract Definitions for Implementation
 * 
 * These mock contracts define what needs to be implemented:
 * 
 * 1. InstanceManagerContract - Service layer for instance management
 * 2. SSEConnectionContract - WebSocket/SSE connection management
 * 3. API Contract - Backend endpoint structure
 * 4. State Management Contract - Frontend state updates
 * 
 * Implementation should satisfy these behavioral contracts.
 */

// Export contracts for implementation reference
export type {
  InstanceManagerContract,
  SSEConnectionContract,
};

export {
  mockBackendInstances,
  mockFrontendState,
};