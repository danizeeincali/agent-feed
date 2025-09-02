/**
 * TDD London School Tests for useSSEClaudeInstance Hook
 * 
 * Mock-driven behavior verification focusing on object collaborations
 * and contract definitions for Claude instance synchronization.
 */

import { renderHook, act } from '@testing-library/react';
import { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';
import { SSEClaudeInstanceManager, ConnectionState } from '../../managers/ClaudeInstanceManager';

// Mock the manager class completely
jest.mock('../../managers/ClaudeInstanceManager', () => ({
  SSEClaudeInstanceManager: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    getAvailableInstances: jest.fn(),
    connectToInstance: jest.fn(),
    disconnectFromInstance: jest.fn(),
    sendCommand: jest.fn(),
    getConnectionStatus: jest.fn(),
    getInstanceOutput: jest.fn(),
    clearInstanceOutput: jest.fn(),
    cleanup: jest.fn()
  })),
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error'
  }
}));

describe('useSSEClaudeInstance - London School TDD', () => {
  let mockManager: jest.Mocked<SSEClaudeInstanceManager>;
  let MockedSSEClaudeInstanceManager: jest.MockedClass<typeof SSEClaudeInstanceManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedSSEClaudeInstanceManager = SSEClaudeInstanceManager as jest.MockedClass<typeof SSEClaudeInstanceManager>;
    mockManager = new MockedSSEClaudeInstanceManager({
      apiUrl: 'http://localhost:3000'
    }) as jest.Mocked<SSEClaudeInstanceManager>;
  });

  describe('Hook Initialization Contract', () => {
    it('should create manager with correct configuration on first render', () => {
      const options = {
        apiUrl: 'http://localhost:3000',
        reconnectAttempts: 3,
        reconnectInterval: 1500,
        maxBackoffDelay: 20000
      };

      renderHook(() => useSSEClaudeInstance(options));

      expect(MockedSSEClaudeInstanceManager).toHaveBeenCalledWith({
        apiUrl: 'http://localhost:3000',
        reconnectAttempts: 3,
        reconnectInterval: 1500,
        maxBackoffDelay: 20000
      });
    });

    it('should register all required event listeners on mount', () => {
      renderHook(() => useSSEClaudeInstance());

      expect(mockManager.on).toHaveBeenCalledWith('instance:connected', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('instance:disconnected', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('instance:output', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('instance:error', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('connection:state_change', expect.any(Function));
    });

    it('should setup event listener cleanup on unmount', () => {
      const { unmount } = renderHook(() => useSSEClaudeInstance());

      unmount();

      expect(mockManager.off).toHaveBeenCalledTimes(5);
      expect(mockManager.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Instance Fetching Behavior Contract', () => {
    it('should coordinate with manager to fetch available instances on mount', async () => {
      const mockInstances = ['claude-instance-1', 'claude-instance-2'];
      mockManager.getAvailableInstances.mockResolvedValue(mockInstances);

      const { result } = renderHook(() => useSSEClaudeInstance());

      // Wait for initial refresh
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockManager.getAvailableInstances).toHaveBeenCalledTimes(1);
      expect(result.current.availableInstances).toEqual(mockInstances);
    });

    it('should handle instance fetching failure through error contract', async () => {
      const fetchError = new Error('API unavailable');
      mockManager.getAvailableInstances.mockRejectedValue(fetchError);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.connectionError).toBe('API unavailable');
      expect(result.current.availableInstances).toEqual([]);
    });

    it('should coordinate refresh instances action with manager', async () => {
      const updatedInstances = ['claude-instance-3', 'claude-instance-4'];
      mockManager.getAvailableInstances.mockResolvedValue(updatedInstances);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(mockManager.getAvailableInstances).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
      expect(result.current.availableInstances).toEqual(updatedInstances);
    });
  });

  describe('Connection Management Behavior Contracts', () => {
    it('should orchestrate connection workflow through manager', async () => {
      const instanceId = 'claude-instance-1';
      mockManager.connectToInstance.mockResolvedValue();

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await result.current.connectToInstance(instanceId);
      });

      expect(mockManager.connectToInstance).toHaveBeenCalledWith(instanceId);
      expect(result.current.selectedInstanceId).toBe(instanceId);
      expect(result.current.output).toEqual([]);
      expect(result.current.messageCount).toBe(0);
    });

    it('should handle connection failure contract', async () => {
      const instanceId = 'claude-nonexistent';
      const connectionError = new Error('Instance not found');
      mockManager.connectToInstance.mockRejectedValue(connectionError);

      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await result.current.connectToInstance(instanceId);
      });

      expect(result.current.connectionError).toBe('Instance not found');
      expect(result.current.selectedInstanceId).toBe(instanceId); // Still set even if connection failed
    });

    it('should coordinate disconnection workflow', async () => {
      const instanceId = 'claude-instance-1';
      mockManager.disconnectFromInstance.mockResolvedValue();

      const { result } = renderHook(() => useSSEClaudeInstance());

      // First connect
      await act(async () => {
        await result.current.connectToInstance(instanceId);
      });

      // Then disconnect
      await act(async () => {
        await result.current.disconnectFromInstance(instanceId);
      });

      expect(mockManager.disconnectFromInstance).toHaveBeenCalledWith(instanceId);
      expect(result.current.selectedInstanceId).toBeNull();
      expect(result.current.output).toEqual([]);
      expect(result.current.messageCount).toBe(0);
    });
  });

  describe('Command Sending Behavior Contract', () => {
    it('should coordinate command sending with immediate input display', async () => {
      const instanceId = 'claude-instance-1';
      const command = 'ls -la';
      const commandResponse = { success: true, message: 'Command sent' };
      
      mockManager.sendCommand.mockResolvedValue(commandResponse);

      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId
      }));

      // Set selected instance
      act(() => {
        result.current.connectToInstance(instanceId);
      });

      await act(async () => {
        await result.current.sendCommand(instanceId, command);
      });

      expect(mockManager.sendCommand).toHaveBeenCalledWith(instanceId, command);
      
      // Verify input message was added immediately
      expect(result.current.output).toHaveLength(1);
      expect(result.current.output[0]).toMatchObject({
        instanceId,
        type: 'input',
        content: '> ls -la\n',
        isReal: true
      });
      expect(result.current.messageCount).toBe(1);
    });

    it('should handle command failure contract', async () => {
      const instanceId = 'claude-instance-1';
      const command = 'invalid-command';
      const commandError = { success: false, error: 'Command failed' };
      
      mockManager.sendCommand.mockResolvedValue(commandError);

      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId
      }));

      await act(async () => {
        await result.current.sendCommand(instanceId, command);
      });

      expect(result.current.connectionError).toBe('Command failed');
    });

    it('should reject empty commands per business rules', async () => {
      const instanceId = 'claude-instance-1';
      const { result } = renderHook(() => useSSEClaudeInstance());

      await act(async () => {
        await result.current.sendCommand(instanceId, '   '); // Empty/whitespace command
      });

      expect(mockManager.sendCommand).not.toHaveBeenCalled();
    });
  });

  describe('Event Handler Behavior Contracts', () => {
    it('should coordinate instance connected events with state updates', async () => {
      const instanceId = 'claude-instance-1';
      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId
      }));

      // Get the event handler that was registered
      const connectedHandler = mockManager.on.mock.calls
        .find(call => call[0] === 'instance:connected')?.[1];
      
      expect(connectedHandler).toBeDefined();

      act(() => {
        connectedHandler({ instanceId });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.connectionError).toBeNull();
      expect(result.current.output).toEqual([]); // Should clear output for newly connected instance
    });

    it('should coordinate instance disconnected events', () => {
      const instanceId = 'claude-instance-1';
      const { result } = renderHook(() => useSSEClaudeInstance());

      const disconnectedHandler = mockManager.on.mock.calls
        .find(call => call[0] === 'instance:disconnected')?.[1];

      act(() => {
        disconnectedHandler({ instanceId });
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
    });

    it('should coordinate output events for selected instance only', () => {
      const selectedInstanceId = 'claude-instance-1';
      const otherInstanceId = 'claude-instance-2';
      
      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId: selectedInstanceId
      }));

      const outputHandler = mockManager.on.mock.calls
        .find(call => call[0] === 'instance:output')?.[1];

      // Output from selected instance should be added
      act(() => {
        outputHandler({
          instanceId: selectedInstanceId,
          content: 'Hello from instance 1',
          isReal: true,
          timestamp: '2023-01-01T00:00:00Z'
        });
      });

      expect(result.current.output).toHaveLength(1);
      expect(result.current.messageCount).toBe(1);

      // Output from different instance should be ignored
      act(() => {
        outputHandler({
          instanceId: otherInstanceId,
          content: 'Hello from instance 2',
          isReal: true,
          timestamp: '2023-01-01T00:00:00Z'
        });
      });

      expect(result.current.output).toHaveLength(1); // Should not have increased
      expect(result.current.messageCount).toBe(1);
    });

    it('should coordinate error events with state updates', () => {
      const instanceId = 'claude-instance-1';
      const errorMessage = 'Connection failed';
      
      const { result } = renderHook(() => useSSEClaudeInstance());

      const errorHandler = mockManager.on.mock.calls
        .find(call => call[0] === 'instance:error')?.[1];

      act(() => {
        errorHandler({ instanceId, error: errorMessage });
      });

      expect(result.current.connectionError).toBe(errorMessage);
      expect(result.current.connectionState).toBe(ConnectionState.ERROR);
    });
  });

  describe('State Synchronization Contracts', () => {
    it('should synchronize connection status when selected instance changes', () => {
      const instanceId = 'claude-instance-1';
      const mockStatus = {
        isConnected: true,
        state: ConnectionState.CONNECTED,
        connectionStats: {
          lastActivity: new Date('2023-01-01T00:00:00Z'),
          messageCount: 5
        }
      };
      const mockOutput = [
        { id: '1', instanceId, type: 'output', content: 'Previous output', timestamp: new Date() }
      ];

      mockManager.getConnectionStatus.mockReturnValue(mockStatus);
      mockManager.getInstanceOutput.mockReturnValue(mockOutput);

      const { result, rerender } = renderHook(
        ({ instanceId }) => useSSEClaudeInstance({ instanceId }),
        { initialProps: { instanceId: null } }
      );

      // Change to specific instance
      rerender({ instanceId });

      expect(mockManager.getConnectionStatus).toHaveBeenCalledWith(instanceId);
      expect(mockManager.getInstanceOutput).toHaveBeenCalledWith(instanceId);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.output).toEqual(mockOutput);
      expect(result.current.messageCount).toBe(5);
    });

    it('should reset state when no instance is selected', () => {
      const { result, rerender } = renderHook(
        ({ instanceId }) => useSSEClaudeInstance({ instanceId }),
        { initialProps: { instanceId: 'claude-instance-1' } }
      );

      // Change to no instance
      rerender({ instanceId: null });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
      expect(result.current.output).toEqual([]);
      expect(result.current.messageCount).toBe(0);
      expect(result.current.lastActivity).toBeNull();
    });
  });

  describe('Auto-Connect Behavior Contract', () => {
    it('should coordinate auto-connect workflow on mount when configured', async () => {
      const instanceId = 'claude-instance-1';
      const mockInstances = [instanceId];
      
      mockManager.getAvailableInstances.mockResolvedValue(mockInstances);
      mockManager.connectToInstance.mockResolvedValue();

      renderHook(() => useSSEClaudeInstance({
        instanceId,
        autoConnect: true
      }));

      // Wait for auto-connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockManager.connectToInstance).toHaveBeenCalledWith(instanceId);
    });

    it('should not auto-connect when disabled', async () => {
      const instanceId = 'claude-instance-1';
      
      renderHook(() => useSSEClaudeInstance({
        instanceId,
        autoConnect: false
      }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockManager.connectToInstance).not.toHaveBeenCalled();
    });
  });

  describe('Output Management Behavior Contracts', () => {
    it('should coordinate output clearing with manager', () => {
      const instanceId = 'claude-instance-1';
      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId
      }));

      act(() => {
        result.current.clearOutput(instanceId);
      });

      expect(mockManager.clearInstanceOutput).toHaveBeenCalledWith(instanceId);
      expect(result.current.output).toEqual([]);
      expect(result.current.messageCount).toBe(0);
    });

    it('should only clear output for selected instance', () => {
      const selectedInstanceId = 'claude-instance-1';
      const otherInstanceId = 'claude-instance-2';
      
      const { result } = renderHook(() => useSSEClaudeInstance({
        instanceId: selectedInstanceId
      }));

      // Clear other instance - should not affect local state
      act(() => {
        result.current.clearOutput(otherInstanceId);
      });

      expect(mockManager.clearInstanceOutput).toHaveBeenCalledWith(otherInstanceId);
      // Local state should not be cleared since it's for a different instance
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading state during async operations', async () => {
      let resolveConnect: () => void;
      const connectPromise = new Promise<void>(resolve => {
        resolveConnect = resolve;
      });
      
      mockManager.connectToInstance.mockReturnValue(connectPromise);

      const { result } = renderHook(() => useSSEClaudeInstance());

      // Start connection
      act(() => {
        result.current.connectToInstance('claude-instance-1');
      });

      expect(result.current.loading).toBe(true);

      // Complete connection
      await act(async () => {
        resolveConnect();
        await connectPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });
});