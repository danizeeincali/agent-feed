/**
 * TDD London School Tests for useTerminalSocket Hook
 * 
 * Tests focus on interaction patterns and collaborations between objects,
 * using mocks to define contracts and verify behavior rather than state.
 * 
 * Key London School principles applied:
 * 1. Outside-in development (user behavior -> implementation)
 * 2. Mock-first approach to define collaborator contracts
 * 3. Behavior verification over state inspection
 * 4. Focus on how objects collaborate
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';
import { mockSocketFactory, MockSocket } from './__mocks__/socket-io-client';
import { broadcastChannelManager, MockBroadcastChannel } from './__mocks__/broadcast-channel';

// Mock Socket.IO client
jest.mock('socket.io-client');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock document visibility API
let mockVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
  get: () => mockVisibilityState,
  configurable: true
});

const mockAddEventListener = jest.spyOn(document, 'addEventListener');
const mockRemoveEventListener = jest.spyOn(document, 'removeEventListener');

describe('useTerminalSocket - London School TDD', () => {
  let mockSocket: MockSocket;
  let mockBroadcastChannel: MockBroadcastChannel;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketFactory.clearSocketHistory();
    broadcastChannelManager.clearChannelHistory();
    
    // Setup localStorage mocks with default values
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      const defaults: Record<string, string> = {
        'auth-token': 'test-auth-token',
        'user-id': 'test-user-123',
        'username': 'Test User'
      };
      return defaults[key] || null;
    });
  });

  afterEach(() => {
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    mockVisibilityState = 'visible';
  });

  describe('Connection Workflow (Outside-in)', () => {
    it('should orchestrate successful terminal connection workflow', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'test-instance-123';

      act(() => {
        result.current.connect(instanceId);
      });

      // Verify the conversation between useTerminalSocket and its collaborators
      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        expect(mockSocket).toBeTruthy();
      });

      // Contract verification: Socket should be created with correct parameters
      expect(mockSocket.connect).toHaveBeenCalledWith();
      
      // Simulate successful connection sequence
      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId,
          instanceName: 'Test Instance',
          instanceType: 'development',
          pid: 12345,
          sessionId: 'session-456',
          clientCount: 1
        });
      });

      // Verify state transitions and collaborator interactions
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.connecting).toBe(false);
        expect(result.current.instanceInfo?.id).toBe(instanceId);
      });

      // Verify socket interactions followed expected pattern
      expect(mockSocket.emit).toHaveBeenCalledWith('connect_terminal', { instanceId });
    });

    it('should coordinate cross-tab synchronization setup during connection', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'test-instance-456';

      act(() => {
        result.current.connect(instanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Verify BroadcastChannel collaboration
      const channels = broadcastChannelManager.getAllChannels();
      const terminalChannel = channels.find(ch => ch.name === `terminal-${instanceId}`);
      expect(terminalChannel).toBeTruthy();
    });
  });

  describe('Authentication Contract Verification', () => {
    it('should provide authentication credentials to socket collaborator', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Verify authentication contract with Socket.IO
      const expectedAuth = {
        token: 'test-auth-token',
        userId: 'test-user-123',
        username: 'Test User'
      };

      // Socket should be created with auth parameters
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user-id');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('username');
    });

    it('should provide fallback authentication when localStorage is empty', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Should still attempt to get auth values and provide defaults
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user-id');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('username');
    });
  });

  describe('Terminal Data Flow Interactions', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'test-instance'
        });
      });
    });

    it('should coordinate terminal data reception and cross-tab broadcasting', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const testData = { data: 'console output line 1', timestamp: new Date().toISOString() };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', testData);
      });

      await waitFor(() => {
        expect(result.current.history).toContain(testData.data);
      });

      // Verify cross-tab broadcasting collaboration
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-test-instance');
      expect(messageHistory.length).toBeGreaterThan(0);
    });

    it('should differentiate between history and live data broadcasting', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // History data should not be broadcast to other tabs
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
          data: 'historical data',
          timestamp: new Date().toISOString(),
          isHistory: true
        });
      });

      // Live data should be broadcast
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
          data: 'live data',
          timestamp: new Date().toISOString(),
          isHistory: false
        });
      });

      await waitFor(() => {
        expect(result.current.history).toContain('historical data');
        expect(result.current.history).toContain('live data');
      });

      // Only live data should be in broadcast history
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-test-instance');
      const liveDataBroadcast = messageHistory.some(msg => 
        msg.message.data?.content === 'live data'
      );
      expect(liveDataBroadcast).toBe(true);
    });

    it('should handle terminal input delegation to socket', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const inputData = 'ls -la';

      act(() => {
        result.current.sendInput(inputData);
      });

      // Verify interaction with socket collaborator
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_input', { data: inputData });
    });

    it('should coordinate terminal resize events with socket', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const cols = 120;
      const rows = 30;

      act(() => {
        result.current.sendResize(cols, rows);
      });

      // Verify resize command delegation
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal_resize', { cols, rows });
    });
  });

  describe('Error Handling Interactions', () => {
    it('should coordinate error propagation across cross-tab synchronization', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      const testError = new Error('Connection failed');
      
      act(() => {
        mockSocketFactory.simulateConnectionError(mockSocket, testError);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Verify error status is broadcast to other tabs
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-test-instance');
      const errorBroadcast = messageHistory.some(msg => 
        msg.message.type === 'connection_status' && msg.message.data?.error
      );
      expect(errorBroadcast).toBe(true);
    });

    it('should handle instance destruction notification', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'instance_destroyed', {
          instanceId: 'test-instance'
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.error).toBe('Instance has been destroyed');
      });
    });
  });

  describe('Heartbeat and Health Monitoring', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should establish heartbeat protocol with socket collaborator', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'test-instance'
        });
      });

      // Fast-forward to trigger heartbeat
      act(() => {
        jest.advanceTimersByTime(30000); // HEARTBEAT_INTERVAL
      });

      // Verify ping was sent to maintain connection
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    it('should handle heartbeat responses and update activity tracking', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      const beforePong = result.current.lastActivity;
      
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'pong', {});
      });

      await waitFor(() => {
        expect(result.current.lastActivity).not.toBe(beforePong);
      });
    });
  });

  describe('Reconnection Strategy Interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should coordinate reconnection workflow with exponential backoff', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Simulate disconnection
      act(() => {
        mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
      });

      // Clear previous socket mocks to track new connection attempts
      mockSocketFactory.clearSocketHistory();

      // Fast-forward through reconnection delays
      act(() => {
        jest.advanceTimersByTime(1000); // First reconnection attempt
      });

      // Verify new connection attempt was made
      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket();
        expect(newSocket).toBeTruthy();
        expect(newSocket).not.toBe(mockSocket);
      });
    });

    it('should respect maximum reconnection attempts contract', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 11; i++) { // MAX_RECONNECT_ATTEMPTS is 10
        act(() => {
          mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
          jest.advanceTimersByTime(Math.pow(2, i) * 1000);
        });
        
        await waitFor(() => {
          mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        });
      }

      // After maximum attempts, should stop reconnecting
      expect(result.current.stats.reconnectAttempts).toBeLessThanOrEqual(10);
    });
  });

  describe('Visibility Change Handling', () => {
    it('should coordinate reconnection on page visibility change', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'test-instance'
        });
      });

      // Simulate page becoming hidden and then visible while disconnected
      mockVisibilityState = 'hidden';
      act(() => {
        mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      mockSocketFactory.clearSocketHistory();
      mockVisibilityState = 'visible';
      
      // Trigger visibility change event
      act(() => {
        const visibilityChangeHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'visibilitychange'
        )?.[1] as EventListener;
        
        if (visibilityChangeHandler) {
          visibilityChangeHandler(new Event('visibilitychange'));
        }
      });

      // Should attempt to reconnect when page becomes visible
      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket();
        expect(newSocket).toBeTruthy();
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should properly coordinate cleanup of all collaborators', async () => {
      const { result, unmount } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'test-instance'
        });
      });

      // Unmount component to trigger cleanup
      unmount();

      // Verify all collaborators were properly cleaned up
      expect(mockSocket.disconnect).toHaveBeenCalled();
      
      const activeChannels = broadcastChannelManager.getAllChannels();
      const terminalChannels = activeChannels.filter(ch => ch.name.startsWith('terminal-'));
      terminalChannels.forEach(channel => {
        expect(channel.close).toHaveBeenCalled();
      });

      expect(mockRemoveEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should handle manual disconnection without triggering reconnection', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
      });

      // Manual disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      
      // Clear socket tracking and advance time to check if reconnection is attempted
      mockSocketFactory.clearSocketHistory();
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not attempt reconnection after manual disconnect
      const newSocket = mockSocketFactory.getLastCreatedSocket();
      expect(newSocket).toBeNull();
    });
  });

  describe('Connection Quality and Statistics', () => {
    it('should track connection quality based on reconnection patterns', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // Fresh connection should have good quality
      expect(result.current.connectionQuality).toBe('good');
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Simulate multiple reconnections to degrade quality
      for (let i = 0; i < 2; i++) {
        act(() => {
          mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
          jest.advanceTimersByTime(1000 * Math.pow(2, i));
        });

        await waitFor(() => {
          mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        });
      }

      expect(result.current.connectionQuality).toBe('fair');
    });

    it('should provide accurate statistics about connection state', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'test-instance',
          clientCount: 3
        });
      });

      // Add some terminal data to track history size
      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
          data: 'test output line 1',
          timestamp: new Date().toISOString()
        });
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
          data: 'test output line 2', 
          timestamp: new Date().toISOString()
        });
      });

      await waitFor(() => {
        expect(result.current.stats.historySize).toBe(2);
        expect(result.current.stats.clientCount).toBe(3);
        expect(result.current.stats.reconnectAttempts).toBe(0);
      });
    });
  });
});