/**
 * WebSocket Terminal Integration Test Suite - London School TDD
 * Tests end-to-end WebSocket terminal functionality with real WebSocket interactions
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useWebSocketTerminal } from '../../hooks/useWebSocketTerminal';
import { MockWebSocket, WebSocketTestUtils } from '../mocks/MockWebSocket';
import { Server } from 'ws';

// London School: Mock external dependencies while testing real integration
const mockServer = {
  start: jest.fn(),
  stop: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  clients: new Set(),
};

describe('WebSocket Terminal Integration Tests - London School TDD', () => {
  let originalWebSocket: typeof WebSocket;
  let wsServer: any;
  
  beforeEach(() => {
    // Setup mock WebSocket environment
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
    MockWebSocket.reset();
    
    // Mock server setup
    mockServer.clients.clear();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup
    global.WebSocket = originalWebSocket;
    MockWebSocket.reset();
    if (wsServer) {
      wsServer.close();
    }
  });

  describe('Single Connection Enforcement Integration', () => {
    it('should enforce single connection across multiple hook instances', async () => {
      // London School: Test collaboration between multiple hook instances
      const { result: hook1 } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );
      const { result: hook2 } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      // Act: Connect from first hook
      await act(async () => {
        await hook1.current.connectToTerminal('terminal-1');
      });

      // Verify first connection established
      expect(hook1.current.connectionState.isConnected).toBe(true);
      expect(hook1.current.connectionState.terminalId).toBe('terminal-1');

      // Act: Connect from second hook (should replace first)
      await act(async () => {
        await hook2.current.connectToTerminal('terminal-2');
      });

      // London School: Verify connection replacement behavior
      const mockWs1 = MockWebSocket.getAllInstances()[0];
      const mockWs2 = MockWebSocket.getAllInstances()[1];

      expect(mockWs1.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
      expect(hook1.current.connectionState.isConnected).toBe(false);
      expect(hook2.current.connectionState.isConnected).toBe(true);
      expect(hook2.current.connectionState.terminalId).toBe('terminal-2');
    });

    it('should prevent race conditions during concurrent connections', async () => {
      // London School: Test race condition handling with real timing
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const connectPromise1 = act(async () => {
        await result.current.connectToTerminal('concurrent-1');
      });
      
      const connectPromise2 = act(async () => {
        await result.current.connectToTerminal('concurrent-2');
      });

      // Act: Execute concurrent connections
      await Promise.allSettled([connectPromise1, connectPromise2]);

      // London School: Verify only one connection succeeded
      const instances = MockWebSocket.getAllInstances();
      const openConnections = instances.filter(ws => ws.readyState === WebSocket.OPEN);
      
      expect(openConnections).toHaveLength(1);
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(['concurrent-1', 'concurrent-2']).toContain(result.current.connectionState.terminalId);
    });

    it('should handle connection lock timeout scenarios', async () => {
      // London School: Test timeout behavior with mock timing
      const { result } = renderHook(() => 
        useWebSocketTerminal({ 
          url: 'ws://localhost:3000',
          maxRetryAttempts: 1
        })
      );

      // Setup mock to simulate hung connection
      MockWebSocket.prototype.withConnectDelay(2000);

      jest.useFakeTimers();

      // Act: Start connection that will timeout
      const connectPromise = act(async () => {
        await result.current.connectToTerminal('timeout-terminal');
      });

      // Fast-forward past connection timeout
      jest.advanceTimersByTime(5000);

      await expect(connectPromise).rejects.toThrow();

      // Verify timeout handling
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.lastError).toContain('timeout');

      jest.useRealTimers();
    });
  });

  describe('Message Flow Integration', () => {
    it('should handle complete command execution workflow', async () => {
      // London School: Test full command execution with mocked responses
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const mockWs = WebSocketTestUtils.createMockConnection('ws://localhost:3000/terminal/test', {
        autoResponses: {
          'input': { type: 'terminal_output', data: 'Command executed successfully\n' }
        }
      });

      // Setup event capture for verification
      const outputMessages: any[] = [];
      act(() => {
        result.current.subscribe('terminal:output', (data) => {
          outputMessages.push(data);
        });
      });

      // Act: Connect and send command
      await act(async () => {
        await result.current.connectToTerminal('test-terminal');
        await result.current.sendCommand('test-terminal', 'echo "test"');
      });

      // London School: Verify message flow interactions
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          data: 'echo "test"\n',
          terminalId: 'test-terminal'
        })
      );

      // Verify response handling
      expect(outputMessages).toHaveLength(1);
      expect(outputMessages[0]).toMatchObject({
        terminalId: 'test-terminal',
        output: 'Command executed successfully\n'
      });
    });

    it('should handle permission request workflow', async () => {
      // London School: Test permission request handling
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const permissionRequests: any[] = [];
      act(() => {
        result.current.subscribe('permission_request', (data) => {
          permissionRequests.push(data);
        });
      });

      await act(async () => {
        await result.current.connectToTerminal('permission-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Simulate permission request from server
      act(() => {
        mockWs.simulateMessage({
          type: 'permission_request',
          data: 'Allow file system access?',
          requestId: 'perm-123'
        });
      });

      // London School: Verify permission handling
      expect(permissionRequests).toHaveLength(1);
      expect(permissionRequests[0]).toMatchObject({
        terminalId: 'permission-terminal',
        message: 'Allow file system access?',
        requestId: 'perm-123'
      });
    });

    it('should handle loading state updates during operations', async () => {
      // London School: Test loading state management
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const loadingUpdates: any[] = [];
      act(() => {
        result.current.subscribe('loading', (data) => {
          loadingUpdates.push(data);
        });
      });

      await act(async () => {
        await result.current.connectToTerminal('loading-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Simulate loading sequence
      act(() => {
        mockWs.simulateMessage({ type: 'loading', data: 'Processing...', isComplete: false });
        mockWs.simulateMessage({ type: 'loading', data: 'Complete!', isComplete: true });
      });

      // London School: Verify loading state progression
      expect(loadingUpdates).toHaveLength(2);
      expect(loadingUpdates[0]).toMatchObject({
        terminalId: 'loading-terminal',
        message: 'Processing...',
        isComplete: false
      });
      expect(loadingUpdates[1]).toMatchObject({
        terminalId: 'loading-terminal',
        message: 'Complete!',
        isComplete: true
      });
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle connection failure and recovery', async () => {
      // London School: Test error recovery workflow
      const { result } = renderHook(() => 
        useWebSocketTerminal({ 
          url: 'ws://localhost:3000',
          enableRetry: true,
          maxRetryAttempts: 2,
          retryDelay: 100
        })
      );

      // Setup first connection to fail, second to succeed
      let connectionAttempt = 0;
      const originalConstructor = MockWebSocket;
      global.WebSocket = jest.fn().mockImplementation((url) => {
        connectionAttempt++;
        const mock = new originalConstructor(url);
        if (connectionAttempt === 1) {
          mock.withFailOnConnect();
        }
        return mock;
      }) as any;

      jest.useFakeTimers();

      // Act: Attempt connection (will fail first, then retry)
      const connectPromise = act(async () => {
        await result.current.connectToTerminal('retry-terminal');
      });

      // Advance timers for retry
      jest.advanceTimersByTime(200);

      await connectPromise;

      // London School: Verify retry behavior
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.connectionState.connectionAttempts).toBeGreaterThan(1);

      jest.useRealTimers();
    });

    it('should handle WebSocket error events gracefully', async () => {
      // London School: Test error event handling
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const errorEvents: any[] = [];
      act(() => {
        result.current.subscribe('error', (data) => {
          errorEvents.push(data);
        });
      });

      await act(async () => {
        await result.current.connectToTerminal('error-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Simulate WebSocket error
      act(() => {
        mockWs.simulateError(new Error('Network connection lost'));
      });

      // London School: Verify error handling
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        instanceId: 'error-terminal',
        error: 'WebSocket connection failed'
      });
      expect(result.current.connectionState.isConnected).toBe(false);
    });

    it('should clean up resources on component unmount', async () => {
      // London School: Test cleanup behavior
      const { result, unmount } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      await act(async () => {
        await result.current.connectToTerminal('cleanup-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Unmount component
      unmount();

      // London School: Verify cleanup interactions
      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
    });
  });

  describe('Real-time Communication Integration', () => {
    it('should handle bidirectional message flow', async () => {
      // London School: Test real-time communication patterns
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const allMessages: any[] = [];
      act(() => {
        result.current.subscribe('message', (data) => {
          allMessages.push(data);
        });
      });

      await act(async () => {
        await result.current.connectToTerminal('realtime-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Send command and simulate various responses
      await act(async () => {
        await result.current.sendCommand('realtime-terminal', 'npm install');
      });

      act(() => {
        // Simulate installation progress
        mockWs.simulateMessage({ type: 'output', data: 'Downloading packages...\n' });
        mockWs.simulateMessage({ type: 'status', status: 'installing' });
        mockWs.simulateMessage({ type: 'output', data: 'Installation complete!\n' });
        mockWs.simulateMessage({ type: 'status', status: 'ready' });
      });

      // London School: Verify real-time message handling
      expect(allMessages.filter(msg => msg.type === 'output')).toHaveLength(2);
      expect(allMessages.filter(msg => msg.type === 'status')).toHaveLength(2);
      
      const statusMessages = allMessages.filter(msg => msg.type === 'status');
      expect(statusMessages[0].status).toBe('installing');
      expect(statusMessages[1].status).toBe('ready');
    });

    it('should maintain message ordering during high-frequency updates', async () => {
      // London School: Test message ordering under load
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const orderedMessages: any[] = [];
      act(() => {
        result.current.subscribe('terminal:output', (data) => {
          orderedMessages.push(data.output);
        });
      });

      await act(async () => {
        await result.current.connectToTerminal('ordering-terminal');
      });

      const mockWs = MockWebSocket.getLastInstance()!;

      // Act: Send rapid sequence of messages
      act(() => {
        for (let i = 1; i <= 10; i++) {
          mockWs.simulateMessage({ 
            type: 'terminal_output', 
            data: `Message ${i}\n` 
          });
        }
      });

      // London School: Verify message ordering preserved
      expect(orderedMessages).toHaveLength(10);
      orderedMessages.forEach((message, index) => {
        expect(message).toBe(`Message ${index + 1}\n`);
      });
    });
  });

  describe('Connection Health Monitoring Integration', () => {
    it('should provide accurate connection health metrics', async () => {
      // London School: Test health monitoring accuracy
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      const startTime = Date.now();

      await act(async () => {
        await result.current.connectToTerminal('health-terminal');
      });

      // Simulate some activity
      await act(async () => {
        await result.current.sendCommand('health-terminal', 'test command 1');
        await result.current.sendCommand('health-terminal', 'test command 2');
      });

      // Act: Get health status
      const healthStatus = result.current.getConnectionHealth();

      // London School: Verify health metrics accuracy
      expect(healthStatus.isConnected).toBe(true);
      expect(healthStatus.instanceId).toBe('health-terminal');
      expect(healthStatus.uptime).toBeGreaterThanOrEqual(0);
      expect(healthStatus.lastConnectionTime).toBeGreaterThanOrEqual(startTime);
      expect(healthStatus.wsEndpoint).toBe('ws://localhost:3000/terminal');
      expect(healthStatus.activeConnections).toBe(1);
    });

    it('should track connection statistics over time', async () => {
      // London School: Test connection statistics tracking
      const { result } = renderHook(() => 
        useWebSocketTerminal({ url: 'ws://localhost:3000' })
      );

      // Connect and disconnect multiple times
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          await result.current.connectToTerminal(`stats-terminal-${i}`);
          await result.current.disconnectFromTerminal();
        });
      }

      // Final connection
      await act(async () => {
        await result.current.connectToTerminal('final-terminal');
      });

      const allConnections = result.current.getAllConnections();

      // London School: Verify statistics tracking
      expect(result.current.connectionState.connectionAttempts).toBeGreaterThan(0);
      expect(allConnections.connections).toContain('final-terminal');
      expect(MockWebSocket.getAllInstances()).toHaveLength(4); // 3 + 1 final
    });
  });
});