/**
 * TDD London School Integration Tests for Claude Instance Synchronization
 * 
 * End-to-end behavior verification for the complete instance synchronization workflow,
 * testing the collaboration between all components using mock contracts.
 */

import { renderHook, act } from '@testing-library/react';
import { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';
import { SSEClaudeInstanceManager, ConnectionState } from '../../managers/ClaudeInstanceManager';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock EventSource
const mockEventSource = {
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  readyState: 0,
  url: '',
  withCredentials: false,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
};

global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

// Mock localStorage for caching
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Claude Instance Synchronization - London School Integration', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let MockedEventSource: jest.MockedClass<typeof EventSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    MockedEventSource = EventSource as jest.MockedClass<typeof EventSource>;
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Instance Discovery and Caching Workflow', () => {
    it('should coordinate instance fetching, caching, and state updates', async () => {
      const mockInstances = [
        { id: 'claude-active123', status: 'running', name: 'Active Instance' },
        { id: 'claude-starting456', status: 'starting', name: 'Starting Instance' },
        { id: 'claude-stopped789', status: 'stopped', name: 'Stopped Instance' }
      ];

      // Mock successful API response for instance list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: mockInstances
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      // Wait for initial instance fetch on mount
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/claude/instances', {
        signal: expect.any(AbortSignal)
      });

      // Verify instances were loaded and filtered correctly
      expect(result.current.availableInstances).toEqual([
        'claude-active123',
        'claude-starting456',
        'claude-stopped789'
      ]);

      expect(result.current.loading).toBe(false);
    });

    it('should handle instance discovery failure with error recovery', async () => {
      const networkError = new Error('Network unavailable');
      mockFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.connectionError).toBe('Network unavailable');
      expect(result.current.availableInstances).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should coordinate cache refresh when instances become stale', async () => {
      const initialInstances = [{ id: 'claude-old123', status: 'running', name: 'Old' }];
      const refreshedInstances = [
        { id: 'claude-new456', status: 'running', name: 'New' },
        { id: 'claude-updated789', status: 'starting', name: 'Updated' }
      ];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: initialInstances })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.availableInstances).toEqual(['claude-old123']);

      // Mock refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: refreshedInstances })
      } as Response);

      // Trigger manual refresh
      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.availableInstances).toEqual(['claude-new456', 'claude-updated789']);
    });
  });

  describe('Connection Validation Workflow', () => {
    it('should validate instance existence before attempting connection', async () => {
      const validInstanceId = 'claude-valid123';

      // Mock instance list fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: validInstanceId, status: 'running', name: 'Valid' }]
        })
      } as Response);

      // Mock instance validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: validInstanceId, status: 'running' }
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Attempt connection
      await act(async () => {
        await result.current.connectToInstance(validInstanceId);
      });

      // Verify validation API call
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/claude/instances/${validInstanceId}`
      );

      // Verify EventSource connection was attempted
      expect(MockedEventSource).toHaveBeenCalledWith(
        `http://localhost:3000/api/claude/instances/${validInstanceId}/terminal/stream`,
        { withCredentials: false }
      );

      expect(result.current.selectedInstanceId).toBe(validInstanceId);
    });

    it('should reject connection to non-existent instances', async () => {
      const nonExistentId = 'claude-nonexistent123';

      // Mock instance list (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: [] })
      } as Response);

      // Mock instance validation failure
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Instance not found'
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Attempt connection to non-existent instance
      await act(async () => {
        await result.current.connectToInstance(nonExistentId);
      });

      expect(result.current.connectionError).toContain('not running or does not exist');
      expect(MockedEventSource).not.toHaveBeenCalled();
    });

    it('should reject connection to stopped instances', async () => {
      const stoppedInstanceId = 'claude-stopped123';

      // Mock instance validation showing stopped status
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, instances: [] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: stoppedInstanceId, status: 'stopped' }
          })
        } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.connectToInstance(stoppedInstanceId);
      });

      expect(result.current.connectionError).toContain('not running or does not exist');
      expect(MockedEventSource).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization Workflow', () => {
    it('should coordinate state updates when instance becomes available', async () => {
      const instanceId = 'claude-sync123';

      // Initial empty instance list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: [] })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.availableInstances).toEqual([]);

      // Instance becomes available
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: instanceId, status: 'running', name: 'New Instance' }]
        })
      } as Response);

      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(result.current.availableInstances).toContain(instanceId);
    });

    it('should coordinate state cleanup when instance becomes unavailable', async () => {
      const disappearingInstanceId = 'claude-disappearing123';

      // Initial instance list with instance
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: disappearingInstanceId, status: 'running', name: 'Disappearing' }]
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId: disappearingInstanceId
      }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.availableInstances).toContain(disappearingInstanceId);

      // Instance disappears from list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: [] })
      } as Response);

      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(result.current.availableInstances).not.toContain(disappearingInstanceId);
    });

    it('should coordinate connection recovery when instance restarts', async () => {
      const restartingInstanceId = 'claude-restarting123';

      // Setup initial connection
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instances: [{ id: restartingInstanceId, status: 'running', name: 'Restarting' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: restartingInstanceId, status: 'running' }
          })
        } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.connectToInstance(restartingInstanceId);
      });

      // Simulate successful connection
      mockEventSource.onopen!(new Event('open'));

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);

      // Simulate instance restart (connection lost)
      mockEventSource.onerror!(new Event('error'));

      expect(result.current.connectionState).toBe(ConnectionState.ERROR);

      // Mock reconnection validation and setup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instance: { id: restartingInstanceId, status: 'running' }
        })
      } as Response);

      // Advance timers to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Simulate successful reconnection
      mockEventSource.onopen!(new Event('open'));

      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Error Recovery and Cache Invalidation', () => {
    it('should coordinate cache clearing when persistent errors occur', async () => {
      const problematicInstanceId = 'claude-problematic123';

      // Initial successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: problematicInstanceId, status: 'running', name: 'Problematic' }]
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.availableInstances).toContain(problematicInstanceId);

      // Subsequent API calls fail consistently
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      // Multiple refresh attempts should maintain error state
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.refreshInstances();
        });

        expect(result.current.connectionError).toBe('Service unavailable');
        expect(result.current.availableInstances).toEqual([]); // Cache cleared
      }
    });

    it('should coordinate state recovery after error resolution', async () => {
      const recoveringInstanceId = 'claude-recovering123';

      // Initial failure
      mockFetch.mockRejectedValueOnce(new Error('Temporary failure'));

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.connectionError).toBe('Temporary failure');
      expect(result.current.availableInstances).toEqual([]);

      // Service recovery
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: recoveringInstanceId, status: 'running', name: 'Recovering' }]
        })
      } as Response);

      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(result.current.connectionError).toBeNull(); // Error cleared
      expect(result.current.availableInstances).toContain(recoveringInstanceId);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Concurrent Operation Synchronization', () => {
    it('should coordinate simultaneous connection attempts correctly', async () => {
      const instance1 = 'claude-concurrent1';
      const instance2 = 'claude-concurrent2';

      // Mock instance list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [
            { id: instance1, status: 'running', name: 'Instance 1' },
            { id: instance2, status: 'running', name: 'Instance 2' }
          ]
        })
      } as Response);

      // Mock validation for both instances
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: instance1, status: 'running' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: instance2, status: 'running' }
          })
        } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Attempt concurrent connections
      await act(async () => {
        const connection1Promise = result.current.connectToInstance(instance1);
        const connection2Promise = result.current.connectToInstance(instance2);
        
        await Promise.all([connection1Promise, connection2Promise]);
      });

      // Should end up connected to the last requested instance
      expect(result.current.selectedInstanceId).toBe(instance2);
      
      // Should have closed previous connection
      expect(mockEventSource.close).toHaveBeenCalled();
      expect(MockedEventSource).toHaveBeenCalledTimes(2);
    });

    it('should coordinate refresh operations during active connections', async () => {
      const activeInstanceId = 'claude-active123';

      // Initial setup with connection
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instances: [{ id: activeInstanceId, status: 'running', name: 'Active' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: activeInstanceId, status: 'running' }
          })
        } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.connectToInstance(activeInstanceId);
      });

      mockEventSource.onopen!(new Event('open'));

      expect(result.current.isConnected).toBe(true);

      // Refresh instances while connected
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [
            { id: activeInstanceId, status: 'running', name: 'Active' },
            { id: 'claude-new456', status: 'starting', name: 'New' }
          ]
        })
      } as Response);

      await act(async () => {
        await result.current.refreshInstances();
      });

      // Connection should remain stable
      expect(result.current.isConnected).toBe(true);
      expect(result.current.selectedInstanceId).toBe(activeInstanceId);
      
      // Instance list should be updated
      expect(result.current.availableInstances).toContain('claude-new456');
    });
  });

  describe('Memory and Performance Optimization', () => {
    it('should coordinate resource cleanup on component unmount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, instances: [] })
      } as Response);

      const { result, unmount } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Create some connections
      const managersBeforeUnmount = result.current.manager;
      const cleanupSpy = jest.spyOn(managersBeforeUnmount, 'cleanup');

      unmount();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should coordinate efficient output buffer management', async () => {
      const instanceId = 'claude-buffer123';

      // Setup connection
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instances: [{ id: instanceId, status: 'running', name: 'Buffer Test' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            instance: { id: instanceId, status: 'running' }
          })
        } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId
      }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.connectToInstance(instanceId);
      });

      mockEventSource.onopen!(new Event('open'));

      // Simulate large number of output messages
      for (let i = 0; i < 1200; i++) {
        const outputMessage = {
          data: JSON.stringify({
            type: 'output',
            data: `Message ${i}`,
            instanceId,
            isReal: true,
            timestamp: new Date().toISOString()
          })
        };

        mockEventSource.onmessage!(outputMessage as MessageEvent);
      }

      // Output should be limited to prevent memory issues
      expect(result.current.output.length).toBeLessThanOrEqual(1000);
      expect(result.current.messageCount).toBe(1200); // Count should track all messages
    });
  });

  describe('Auto-Refresh and Synchronization Patterns', () => {
    it('should coordinate automatic instance refresh on connection events', async () => {
      const instanceId = 'claude-autorefresh123';

      // Initial setup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          instances: [{ id: instanceId, status: 'starting', name: 'Auto Refresh' }]
        })
      } as Response);

      const { result } = renderHook(() => useSSEClaudeInstance({
        autoConnect: true,
        instanceId
      }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.availableInstances).toContain(instanceId);

      // Instance status should be checked for auto-connection eligibility
      // Since status is 'starting', no auto-connection should occur
      expect(MockedEventSource).not.toHaveBeenCalled();
    });

    it('should coordinate state consistency across multiple hook instances', () => {
      // This tests the singleton-like behavior of the manager
      const { result: hook1 } = renderHook(() => useSSEClaudeInstance({
        instanceId: 'claude-shared123'
      }));

      const { result: hook2 } = renderHook(() => useSSEClaudeInstance({
        instanceId: 'claude-shared123'
      }));

      // Both hooks should use the same manager instance
      expect(hook1.current.manager).toBe(hook2.current.manager);
    });
  });
});