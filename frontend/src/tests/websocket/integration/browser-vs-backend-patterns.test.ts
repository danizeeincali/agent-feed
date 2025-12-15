/**
 * TDD London School Integration Tests
 * Browser vs Backend Pattern Validation
 * 
 * This test suite validates that our mocked browser environment tests
 * accurately simulate the behavioral patterns observed in successful backend tests.
 * 
 * London School methodology:
 * 1. Focus on interaction patterns rather than implementation
 * 2. Verify contracts between browser and backend match expectations
 * 3. Test coordination flows end-to-end
 * 4. Ensure mock behavior aligns with real-world patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';
import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { mockSocketFactory, MockSocket } from '../__mocks__/socket-io-client';
import { broadcastChannelManager } from '../__mocks__/broadcast-channel';
import { browserEnvironmentSimulator, setupBrowserScenario } from '../fixtures/browser-environment';

// Mock Socket.IO client
jest.mock('socket.io-client');

// Mock timers for controlled timing
jest.useFakeTimers();

describe('Browser vs Backend Pattern Validation - London School TDD', () => {
  let mockEnv: ReturnType<typeof browserEnvironmentSimulator.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketFactory.clearSocketHistory();
    broadcastChannelManager.clearChannelHistory();
    mockEnv = setupBrowserScenario('desktopChrome');
  });

  afterEach(() => {
    browserEnvironmentSimulator.cleanup();
    jest.runOnlyPendingTimers();
  });

  describe('Connection Establishment Patterns', () => {
    it('should match backend test connection success patterns', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'backend-pattern-test';

      // Backend pattern: Connection request -> Auth -> Terminal setup -> Success
      act(() => {
        result.current.connect(instanceId);
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        expect(mockSocket).toBeTruthy();
      });

      // Simulate backend connection sequence exactly as backend tests show
      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket!);
      });

      // Backend sends 'connected' first
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket!, 'connected');
      });

      // Frontend should emit connect_terminal (matches backend expectation)
      await waitFor(() => {
        expect(mockSocket!.emit).toHaveBeenCalledWith('connect_terminal', { instanceId });
      });

      // Backend responds with terminal_connected (matches backend test pattern)
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket!, 'terminal_connected', {
          instanceId,
          instanceName: 'Test Instance',
          instanceType: 'development',
          pid: 12345,
          sessionId: 'session-abc-123',
          clientCount: 1
        });
      });

      // Verify final state matches backend expectations
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.connecting).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.instanceInfo?.id).toBe(instanceId);
        expect(result.current.instanceInfo?.sessionId).toBe('session-abc-123');
      });

      // Verify authentication pattern matches backend expectations
      expect(mockEnv.localStorage.getItem).toHaveBeenCalledWith('auth-token');
      expect(mockEnv.localStorage.getItem).toHaveBeenCalledWith('user-id');
      expect(mockEnv.localStorage.getItem).toHaveBeenCalledWith('username');
    });

    it('should handle connection failures like backend tests', async () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        result.current.connect('failure-pattern-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Simulate connection failure (matches backend test failure scenarios)
      const connectionError = new Error('ECONNREFUSED: Connection refused');
      act(() => {
        mockSocketFactory.simulateConnectionError(mockSocket!, connectionError);
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.connecting).toBe(false);
        expect(result.current.error).toContain('Connection error');
      });

      // Verify reconnection attempt pattern matches backend
      act(() => {
        jest.advanceTimersByTime(1000); // Reconnection delay
      });

      // Should attempt to create new socket connection
      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket();
        expect(newSocket).toBeTruthy();
        expect(newSocket).not.toBe(mockSocket);
      });
    });
  });

  describe('Terminal Data Flow Patterns', () => {
    let mockSocket: MockSocket;

    beforeEach(async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('data-flow-test');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'data-flow-test'
        });
      });
    });

    it('should handle terminal data exactly like backend tests', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // Backend test pattern: Terminal sends data with specific format
      const terminalData = {
        data: 'user@host:~$ ls -la\ntotal 24\ndrwxr-xr-x 3 user user 4096 Jan 1 12:00 .\n',
        timestamp: '2024-01-01T12:00:00.000Z',
        isHistory: false
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', terminalData);
      });

      await waitFor(() => {
        expect(result.current.history).toContain(terminalData.data);
        expect(result.current.lastActivity).toBeTruthy();
      });

      // Verify cross-tab broadcast matches backend multi-client pattern
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-data-flow-test');
      const dataMessage = messageHistory.find(msg => 
        msg.message.type === 'terminal_data' && 
        msg.message.data.content === terminalData.data
      );
      expect(dataMessage).toBeTruthy();
    });

    it('should handle terminal input like backend expects', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      const inputCommand = 'npm run test';
      
      act(() => {
        result.current.sendInput(inputCommand);
      });

      // Verify input format matches backend expectation exactly
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_input', { data: inputCommand });
    });

    it('should handle resize events matching backend pattern', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      const cols = 120;
      const rows = 30;
      
      act(() => {
        result.current.sendResize(cols, rows);
      });

      // Verify resize format matches backend expectation
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_resize', { cols, rows });

      // Backend should respond with resize confirmation
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_resized', { cols, rows });
      });

      // Frontend should handle resize response (matches backend test)
      // No specific UI update expected, just event handling
      expect(result.current.connected).toBe(true); // Connection should remain stable
    });
  });

  describe('Heartbeat and Health Monitoring Patterns', () => {
    it('should implement heartbeat protocol matching backend expectations', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('heartbeat-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'heartbeat-test'
        });
      });

      // Wait for heartbeat to be established (30 second interval)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Verify ping sent (matches backend heartbeat expectation)
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');

      // Simulate pong response from backend
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'pong', { timestamp: Date.now() });
      });

      await waitFor(() => {
        expect(result.current.lastActivity).toBeTruthy();
      });
    });
  });

  describe('Instance Management Patterns', () => {
    it('should handle instance status updates like backend tests', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('instance-status-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'instance-status-test'
        });
      });

      // Backend sends instance status updates
      const statusUpdate = {
        instanceId: 'instance-status-test',
        status: 'running',
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'instance_status', statusUpdate);
      });

      // Verify instance info is updated
      await waitFor(() => {
        expect(result.current.instanceInfo?.id).toBe('instance-status-test');
      });
    });

    it('should handle instance destruction like backend tests', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('destruction-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'destruction-test'
        });
      });

      // Backend sends instance destruction notice
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'instance_destroyed', {
          instanceId: 'destruction-test',
          reason: 'process_exit'
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.error).toBe('Instance has been destroyed');
      });
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should handle network disconnection like backend tests expect', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('network-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'network-test'
        });
      });

      // Simulate network disconnection (matches backend test scenarios)
      act(() => {
        browserEnvironmentSimulator.simulateNetworkChange(false);
        mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Simulate network recovery
      act(() => {
        browserEnvironmentSimulator.simulateNetworkChange(true);
        jest.advanceTimersByTime(1000); // Reconnection delay
      });

      // Should attempt reconnection
      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket();
        expect(newSocket).toBeTruthy();
        expect(newSocket).not.toBe(mockSocket);
      });
    });

    it('should handle browser tab visibility changes matching backend multi-client expectations', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('visibility-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'visibility-test'
        });
      });

      // Simulate tab becoming hidden (backend sees client disconnect)
      act(() => {
        browserEnvironmentSimulator.simulateVisibilityChange('hidden');
        mockSocketFactory.simulateDisconnection(mockSocket, 'client namespace disconnect');
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Tab becomes visible again (backend should see reconnection)
      act(() => {
        browserEnvironmentSimulator.simulateVisibilityChange('visible');
      });

      // Should attempt reconnection when visible
      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket();
        expect(newSocket).toBeTruthy();
        expect(newSocket).not.toBe(mockSocket);
      });
    });
  });

  describe('Multi-Client Coordination Patterns', () => {
    it('should coordinate multiple browser tabs like backend handles multiple clients', async () => {
      // Simulate first tab
      const { result: tab1 } = renderHook(() => useTerminalSocket());
      const instanceId = 'multi-client-test';

      act(() => {
        tab1.current.connect(instanceId);
      });

      let socket1: MockSocket;
      await waitFor(() => {
        socket1 = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(socket1);
        mockSocketFactory.simulateServerEvent(socket1, 'connected');
        mockSocketFactory.simulateServerEvent(socket1, 'terminal_connected', {
          instanceId,
          clientCount: 1
        });
      });

      // Simulate second tab
      const { result: tab2 } = renderHook(() => useTerminalSocket());
      
      act(() => {
        tab2.current.connect(instanceId);
      });

      let socket2: MockSocket;
      await waitFor(() => {
        socket2 = mockSocketFactory.getLastCreatedSocket()!;
        expect(socket2).not.toBe(socket1);
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(socket2);
        mockSocketFactory.simulateServerEvent(socket2, 'connected');
        mockSocketFactory.simulateServerEvent(socket2, 'terminal_connected', {
          instanceId,
          clientCount: 2 // Backend shows multiple clients
        });
      });

      // Send data from backend to both clients (like backend test)
      const sharedData = {
        data: 'shared terminal output',
        timestamp: new Date().toISOString(),
        isHistory: false
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(socket1, 'terminal_data', sharedData);
        mockSocketFactory.simulateServerEvent(socket2, 'terminal_data', sharedData);
      });

      await waitFor(() => {
        expect(tab1.current.history).toContain(sharedData.data);
        expect(tab2.current.history).toContain(sharedData.data);
        expect(tab1.current.instanceInfo?.clientCount).toBe(1);
        expect(tab2.current.instanceInfo?.clientCount).toBe(2);
      });
    });
  });

  describe('Resource Cleanup Patterns', () => {
    it('should cleanup resources matching backend client disconnect expectations', async () => {
      const { result, unmount } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('cleanup-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'cleanup-test'
        });
      });

      // Unmount should trigger proper cleanup (backend expects clean disconnect)
      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      
      // Verify all browser APIs were cleaned up
      const documentListeners = browserEnvironmentSimulator.getEventListeners('document');
      const windowListeners = browserEnvironmentSimulator.getEventListeners('window');
      
      // Event listeners should be properly removed
      expect(mockEnv.document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange', 
        expect.any(Function)
      );
    });
  });

  describe('Performance and Scaling Patterns', () => {
    it('should handle high-frequency data like backend performance tests', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('performance-test');
      });

      let mockSocket: MockSocket;
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'connected');
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'performance-test'
        });
      });

      // Send high-frequency data (like backend stress tests)
      const dataCount = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < dataCount; i++) {
        act(() => {
          mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
            data: `line ${i}\n`,
            timestamp: new Date().toISOString(),
            isHistory: false
          });
        });
      }

      await waitFor(() => {
        expect(result.current.history.length).toBe(dataCount);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Performance should be reasonable (like backend tests expect)
      expect(duration).toBeLessThan(1000); // Should handle 100 messages in under 1 second
      
      // History should respect size limits (backend memory management)
      expect(result.current.stats.historySize).toBe(dataCount);
    });
  });
});