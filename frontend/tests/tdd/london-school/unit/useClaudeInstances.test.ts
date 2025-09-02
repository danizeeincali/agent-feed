/**
 * useClaudeInstances Hook Unit Tests - London School TDD
 * Mock-driven tests for the Claude instances management hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useClaudeInstances } from '../../../../src/hooks/useClaudeInstances';
import { useRobustWebSocketContext } from '../../../../src/components/RobustWebSocketProvider';
import { 
  ClaudeInstanceConfig, 
  ClaudeInstance, 
  ClaudeInstanceError,
  ClaudeInstanceMessage 
} from '../../../../src/types/claude-instances';
import { createMockContracts, expectInteractionPattern, validateContractCompliance } from '../test-setup';

// Mock WebSocket context
jest.mock('../../../../src/components/RobustWebSocketProvider');

const mockUseRobustWebSocketContext = useRobustWebSocketContext as jest.MockedFunction<typeof useRobustWebSocketContext>;

describe('useClaudeInstances Hook - London School Unit Tests', () => {
  let mockWebSocketContext: ReturnType<typeof useRobustWebSocketContext>;
  let mockContracts: ReturnType<typeof createMockContracts>;

  beforeEach(() => {
    mockContracts = createMockContracts();
    
    mockWebSocketContext = {
      socket: { id: 'mock-socket' } as any,
      isConnected: true,
      emit: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      url: 'ws://localhost:3333',
      readyState: 1,
      lastMessage: null,
      lastJsonMessage: null
    };

    mockUseRobustWebSocketContext.mockReturnValue(mockWebSocketContext);
  });

  describe('Hook Initialization and Contract Setup', () => {
    it('should establish WebSocket event contracts on initialization', async () => {
      // Act
      const { result } = renderHook(() => useClaudeInstances({
        autoConnect: true,
        enableMetrics: true
      }));

      // Assert - Verify all required event subscriptions
      await waitFor(() => {
        const expectedEvents = [
          'instances:list',
          'instance:created', 
          'instance:started',
          'instance:stopped',
          'instance:error',
          'instance:status',
          'instance:output',
          'chat:message',
          'metrics:update'
        ];

        expectedEvents.forEach(event => {
          expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
            event,
            expect.any(Function)
          );
        });
      });

      // Verify initial instance list request
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith('instances:list');
    });

    it('should validate contract compliance for instance creation', async () => {
      // Arrange
      const instanceConfig: Partial<ClaudeInstanceConfig> = {
        name: 'Test Instance',
        workingDirectory: '/workspaces/agent-feed/prod',
        useProductionMode: true
      };

      // Mock event handlers to simulate responses
      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Act
      await act(async () => {
        const createPromise = result.current.createInstance(instanceConfig);
        
        // Simulate instance created event
        const createHandler = eventHandlers.get('instance:created');
        if (createHandler) {
          createHandler({
            id: 'claude-123',
            name: 'Test Instance',
            workingDirectory: '/workspaces/agent-feed/prod',
            useProductionMode: true,
            status: 'starting',
            createdAt: new Date(),
            updatedAt: new Date(),
            isConnected: false,
            hasOutput: false
          } as ClaudeInstance);
        }

        await createPromise;
      });

      // Assert - Verify instance creation contract
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith(
        'instance:create',
        expect.objectContaining({
          name: 'Test Instance',
          workingDirectory: '/workspaces/agent-feed/prod',
          useProductionMode: true
        })
      );
    });
  });

  describe('Instance Lifecycle Management', () => {
    it('should coordinate start/stop instance workflow', async () => {
      // Arrange
      const instanceId = 'claude-test-456';
      const eventHandlers = new Map();
      
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Act - Start instance
      await act(async () => {
        const startPromise = result.current.startInstance(instanceId);
        
        // Simulate instance started event
        const startHandler = eventHandlers.get('instance:started');
        if (startHandler) {
          startHandler({
            id: instanceId,
            status: 'running',
            pid: 12345,
            startTime: new Date()
          });
        }

        await startPromise;
      });

      // Assert start workflow
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith(
        'instance:start',
        { instanceId }
      );

      // Act - Stop instance
      await act(async () => {
        const stopPromise = result.current.stopInstance(instanceId);
        
        // Simulate instance stopped event
        const stopHandler = eventHandlers.get('instance:stopped');
        if (stopHandler) {
          stopHandler({
            id: instanceId,
            status: 'stopped'
          });
        }

        await stopPromise;
      });

      // Assert stop workflow
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith(
        'instance:stop',
        { instanceId }
      );
    });

    it('should handle restart workflow with proper sequence', async () => {
      // Arrange
      const instanceId = 'claude-restart-test';
      const eventHandlers = new Map();
      
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Mock timer for restart delay
      jest.useFakeTimers();

      // Act
      await act(async () => {
        const restartPromise = result.current.restartInstance(instanceId);
        
        // Simulate stop event
        const stopHandler = eventHandlers.get('instance:stopped');
        if (stopHandler) {
          stopHandler({ id: instanceId, status: 'stopped' });
        }

        // Fast-forward timer for restart delay
        jest.advanceTimersByTime(2000);

        // Simulate start event
        const startHandler = eventHandlers.get('instance:started');
        if (startHandler) {
          startHandler({ id: instanceId, status: 'running' });
        }

        await restartPromise;
      });

      // Assert restart sequence
      expectInteractionPattern(mockWebSocketContext as any, [
        { mock: 'emit', args: ['instance:stop', { instanceId }] },
        { mock: 'emit', args: ['instance:start', { instanceId }] }
      ]);

      jest.useRealTimers();
    });
  });

  describe('Message and Communication Contracts', () => {
    it('should handle chat message workflow with proper typing', async () => {
      // Arrange
      const instanceId = 'claude-chat-test';
      const message = 'Test message for Claude';
      const eventHandlers = new Map();
      
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Act
      await act(async () => {
        result.current.sendMessage(instanceId, message);
      });

      // Assert - Verify chat message contract
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith(
        'chat:message',
        expect.objectContaining({
          instanceId,
          type: 'user',
          role: 'user',
          content: message,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle command execution with proper validation', async () => {
      // Arrange
      const instanceId = 'claude-cmd-test';
      const command = {
        type: 'terminal' as const,
        command: 'ls -la',
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      const { result } = renderHook(() => useClaudeInstances());

      // Act
      await act(async () => {
        result.current.sendCommand(instanceId, command);
      });

      // Assert - Verify command contract
      expect(mockWebSocketContext.emit).toHaveBeenCalledWith(
        'instance:command',
        {
          instanceId,
          command
        }
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle connection failures with retry logic', async () => {
      // Arrange
      mockWebSocketContext.isConnected = false;
      const connectionError = new Error('WebSocket connection failed');
      mockWebSocketContext.connect = jest.fn().mockRejectedValue(connectionError);

      // Act
      const { result } = renderHook(() => useClaudeInstances({
        autoConnect: true,
        maxRetries: 2,
        retryInterval: 1000
      }));

      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert - Should attempt connection
      expect(mockWebSocketContext.connect).toHaveBeenCalled();
      expect(result.current.error).toContain('Connection failed');
    });

    it('should handle instance creation timeout gracefully', async () => {
      // Arrange
      jest.useFakeTimers();
      
      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Act - Create instance without responding to events
      await act(async () => {
        const createPromise = result.current.createInstance({
          name: 'Timeout Test'
        });

        // Fast-forward past timeout
        jest.advanceTimersByTime(31000);

        // Expect timeout error
        await expect(createPromise).rejects.toThrow(ClaudeInstanceError);
        await expect(createPromise).rejects.toThrow('Create instance timeout');
      });

      jest.useRealTimers();
    });
  });

  describe('State Management and Data Flow', () => {
    it('should manage instance state updates correctly', async () => {
      // Arrange
      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      const mockInstances: ClaudeInstance[] = [
        {
          id: 'claude-1',
          name: 'Instance 1',
          status: 'starting',
          createdAt: new Date(),
          updatedAt: new Date(),
          isConnected: false,
          hasOutput: false
        }
      ];

      // Act - Simulate instances list update
      await act(() => {
        const listHandler = eventHandlers.get('instances:list');
        if (listHandler) {
          listHandler(mockInstances);
        }
      });

      // Assert - State should be updated
      expect(result.current.instances).toEqual(mockInstances);
      expect(result.current.error).toBeNull();
    });

    it('should handle message flow with proper state isolation', async () => {
      // Arrange
      const instanceId = 'claude-msg-test';
      const message: ClaudeInstanceMessage = {
        id: 'msg-123',
        instanceId,
        type: 'output',
        content: 'Test output message',
        timestamp: new Date()
      };

      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Act - Simulate output message
      await act(() => {
        const outputHandler = eventHandlers.get('instance:output');
        if (outputHandler) {
          outputHandler(message);
        }
      });

      // Assert - Message should be stored correctly
      const messages = result.current.getInstanceMessages(instanceId);
      expect(messages).toContain(message);
      
      // Verify instance state update
      expect(result.current.instances.find(i => i.id === instanceId)?.hasOutput).toBe(true);
    });
  });

  describe('Contract Validation and Compliance', () => {
    it('should enforce ClaudeInstanceConfig contract', async () => {
      // Arrange
      const invalidConfig = {
        // Missing required id and name
        workingDirectory: '/test'
      };

      const { result } = renderHook(() => useClaudeInstances());

      // Act & Assert - Should handle missing required fields
      await act(async () => {
        const instance = await result.current.createInstance(invalidConfig);
        
        // Hook should auto-generate required fields
        expect(instance.id).toMatch(/^instance-\d+$/);
        expect(instance.name).toBe('New Claude Instance');
      });
    });

    it('should validate WebSocket event contract compliance', async () => {
      // Arrange
      const { result } = renderHook(() => useClaudeInstances());

      // Act - Verify subscription contracts
      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
        'instances:list',
        expect.any(Function)
      );
      
      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
        'instance:created',
        expect.any(Function)
      );

      // Verify all required events are subscribed
      const requiredEvents = [
        'instances:list',
        'instance:created',
        'instance:started', 
        'instance:stopped',
        'instance:error',
        'instance:status',
        'instance:output',
        'chat:message',
        'metrics:update'
      ];

      requiredEvents.forEach(event => {
        expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith(
          event,
          expect.any(Function)
        );
      });
    });
  });

  describe('Metrics and Performance Monitoring', () => {
    it('should collect and manage instance metrics when enabled', async () => {
      // Arrange
      const instanceId = 'claude-metrics-test';
      const mockMetrics = {
        instanceId,
        timestamp: new Date(),
        cpu: 25.5,
        memory: 512,
        diskUsage: 1024,
        networkIn: 100,
        networkOut: 200,
        responseTime: 150,
        tokensPerMinute: 50,
        errorRate: 0.01,
        uptime: 3600
      };

      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances({
        enableMetrics: true
      }));

      // Act - Simulate metrics update
      await act(() => {
        const metricsHandler = eventHandlers.get('metrics:update');
        if (metricsHandler) {
          metricsHandler(mockMetrics);
        }
      });

      // Assert - Metrics should be stored and retrievable
      const storedMetrics = result.current.getInstanceMetrics(instanceId);
      expect(storedMetrics).toEqual(mockMetrics);
    });
  });

  describe('Error Recovery and Fault Tolerance', () => {
    it('should handle instance errors with proper cleanup', async () => {
      // Arrange
      const instanceId = 'claude-error-test';
      const errorMessage = 'Instance process crashed';

      const eventHandlers = new Map();
      mockWebSocketContext.subscribe.mockImplementation((event, handler) => {
        eventHandlers.set(event, handler);
      });

      const { result } = renderHook(() => useClaudeInstances());

      // Simulate existing instance
      await act(() => {
        const listHandler = eventHandlers.get('instances:list');
        if (listHandler) {
          listHandler([{
            id: instanceId,
            name: 'Error Test Instance',
            status: 'running',
            createdAt: new Date(),
            updatedAt: new Date(),
            isConnected: true,
            hasOutput: false
          } as ClaudeInstance]);
        }
      });

      // Act - Simulate instance error
      await act(() => {
        const errorHandler = eventHandlers.get('instance:error');
        if (errorHandler) {
          errorHandler({
            instanceId,
            error: errorMessage
          });
        }
      });

      // Assert - Instance state should reflect error
      const instance = result.current.instances.find(i => i.id === instanceId);
      expect(instance?.status).toBe('error');
      expect(instance?.lastError).toBe(errorMessage);
      expect(instance?.isConnected).toBe(false);
      expect(result.current.error).toContain(errorMessage);
    });

    it('should handle disconnection scenarios gracefully', async () => {
      // Arrange
      mockWebSocketContext.isConnected = false;
      const { result } = renderHook(() => useClaudeInstances());

      // Act & Assert - Commands should fail when disconnected
      await expect(
        result.current.sendCommand('claude-123', {
          type: 'terminal',
          command: 'test'
        })
      ).rejects.toThrow(ClaudeInstanceError);

      await expect(
        result.current.sendMessage('claude-123', 'test message')
      ).rejects.toThrow(ClaudeInstanceError);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should clean up resources when instance is deleted', async () => {
      // Arrange
      const instanceId = 'claude-cleanup-test';
      const { result, unmount } = renderHook(() => useClaudeInstances());

      // Pre-populate with test data
      await act(() => {
        result.current.selectInstance(instanceId);
      });

      // Act - Delete instance
      await act(async () => {
        result.current.deleteInstance(instanceId);
      });

      // Assert - Should clean up all references
      expect(result.current.selectedInstance).toBeNull();
      expect(result.current.getInstanceMessages(instanceId)).toEqual([]);
      expect(result.current.getInstanceMetrics(instanceId)).toBeNull();

      // Cleanup - Unmount to verify subscription cleanup
      unmount();

      // Verify unsubscription
      expect(mockWebSocketContext.unsubscribe).toHaveBeenCalled();
    });
  });
});