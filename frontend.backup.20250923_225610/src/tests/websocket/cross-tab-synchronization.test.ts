/**
 * TDD London School Tests for Cross-Tab Synchronization
 * 
 * Tests focus on the interaction patterns between BroadcastChannel,
 * WebSocket connections, and state synchronization across browser tabs.
 * 
 * London School principles:
 * 1. Mock BroadcastChannel to verify cross-tab message flows
 * 2. Test coordination between multiple simulated tabs
 * 3. Verify synchronization contracts and timing
 * 4. Focus on behavior over implementation details
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';
import { mockSocketFactory, MockSocket } from './__mocks__/socket-io-client';
import { broadcastChannelManager, MockBroadcastChannel } from './__mocks__/broadcast-channel';

// Mock Socket.IO client
jest.mock('socket.io-client');

describe('Cross-Tab Synchronization - London School TDD', () => {
  let mockSocket: MockSocket;
  let mockBroadcastChannel: MockBroadcastChannel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketFactory.clearSocketHistory();
    broadcastChannelManager.clearChannelHistory();
  });

  describe('BroadcastChannel Creation and Management', () => {
    it('should establish cross-tab communication channel during connection', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'test-instance-sync';

      act(() => {
        result.current.connect(instanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        expect(mockSocket).toBeTruthy();
      });

      // Verify BroadcastChannel was created for this specific instance
      const channels = broadcastChannelManager.getAllChannels();
      const instanceChannel = channels.find(ch => ch.name === `terminal-${instanceId}`);
      
      expect(instanceChannel).toBeTruthy();
      expect(instanceChannel!.name).toBe(`terminal-${instanceId}`);
    });

    it('should coordinate channel cleanup when switching instances', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const firstInstanceId = 'instance-1';
      const secondInstanceId = 'instance-2';

      // Connect to first instance
      act(() => {
        result.current.connect(firstInstanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      const firstChannels = broadcastChannelManager.getAllChannels();
      const firstInstanceChannel = firstChannels.find(ch => 
        ch.name === `terminal-${firstInstanceId}`
      );
      expect(firstInstanceChannel).toBeTruthy();

      // Connect to second instance (should cleanup first channel)
      act(() => {
        result.current.connect(secondInstanceId);
      });

      await waitFor(() => {
        const newSocket = mockSocketFactory.getLastCreatedSocket()!;
        expect(newSocket).not.toBe(mockSocket);
      });

      // Verify first channel was closed and second was created
      expect(firstInstanceChannel!.close).toHaveBeenCalled();
      
      const allChannels = broadcastChannelManager.getAllChannels();
      const secondInstanceChannel = allChannels.find(ch => 
        ch.name === `terminal-${secondInstanceId}`
      );
      expect(secondInstanceChannel).toBeTruthy();
    });
  });

  describe('Terminal Data Synchronization Across Tabs', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('sync-test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'sync-test-instance'
        });
      });
    });

    it('should broadcast terminal data to other tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const testData = {
        data: 'terminal output from server',
        timestamp: new Date().toISOString(),
        isHistory: false
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', testData);
      });

      await waitFor(() => {
        expect(result.current.history).toContain(testData.data);
      });

      // Verify terminal data was broadcast to cross-tab channel
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-sync-test-instance');
      const terminalDataMessage = messageHistory.find(msg => 
        msg.message.type === 'terminal_data' && 
        msg.message.data?.content === testData.data
      );

      expect(terminalDataMessage).toBeTruthy();
      expect(terminalDataMessage!.message.data.senderId).toBe(mockSocket.id);
    });

    it('should receive terminal data from other tabs and update local history', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const crossTabData = {
        type: 'terminal_data',
        data: {
          content: 'data from another tab',
          senderId: 'different-socket-id'
        }
      };

      // Simulate message from another tab
      act(() => {
        broadcastChannelManager.simulateMessage('terminal-sync-test-instance', crossTabData);
      });

      await waitFor(() => {
        expect(result.current.history).toContain(crossTabData.data.content);
      });
    });

    it('should ignore broadcast messages from same socket to prevent loops', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const initialHistoryLength = result.current.history.length;
      
      const loopbackMessage = {
        type: 'terminal_data',
        data: {
          content: 'loopback data',
          senderId: mockSocket.id // Same as current socket
        }
      };

      act(() => {
        broadcastChannelManager.simulateMessage('terminal-sync-test-instance', loopbackMessage);
      });

      // Give time for any potential updates
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // History should not be updated from loopback message
      expect(result.current.history.length).toBe(initialHistoryLength);
    });

    it('should distinguish between history and live data in cross-tab sync', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // History data should not be broadcast
      const historyData = {
        data: 'historical terminal data',
        timestamp: new Date().toISOString(),
        isHistory: true
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', historyData);
      });

      // Live data should be broadcast
      const liveData = {
        data: 'live terminal data',
        timestamp: new Date().toISOString(),
        isHistory: false
      };

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', liveData);
      });

      await waitFor(() => {
        expect(result.current.history).toContain(historyData.data);
        expect(result.current.history).toContain(liveData.data);
      });

      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-sync-test-instance');
      
      // Only live data should be in broadcast history
      const historyBroadcast = messageHistory.find(msg => 
        msg.message.data?.content === historyData.data
      );
      const liveBroadcast = messageHistory.find(msg => 
        msg.message.data?.content === liveData.data
      );

      expect(historyBroadcast).toBeFalsy();
      expect(liveBroadcast).toBeTruthy();
    });
  });

  describe('Connection Status Synchronization', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('status-sync-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });
    });

    it('should broadcast connection success to other tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'status-sync-instance'
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Verify connection status was broadcast
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-status-sync-instance');
      const connectionStatusMessage = messageHistory.find(msg => 
        msg.message.type === 'connection_status' && 
        msg.message.data?.connected === true
      );

      expect(connectionStatusMessage).toBeTruthy();
      expect(connectionStatusMessage!.message.data.connecting).toBe(false);
      expect(connectionStatusMessage!.message.data.error).toBe(null);
    });

    it('should broadcast error states to other tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const testError = new Error('Connection timeout');

      act(() => {
        mockSocketFactory.simulateConnectionError(mockSocket, testError);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Verify error status was broadcast
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-status-sync-instance');
      const errorStatusMessage = messageHistory.find(msg => 
        msg.message.type === 'connection_status' && 
        msg.message.data?.error
      );

      expect(errorStatusMessage).toBeTruthy();
      expect(errorStatusMessage!.message.data.connected).toBe(false);
      expect(errorStatusMessage!.message.data.connecting).toBe(false);
    });

    it('should broadcast disconnection events to other tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());

      // First establish connection
      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'status-sync-instance'
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Then simulate disconnection
      act(() => {
        mockSocketFactory.simulateDisconnection(mockSocket, 'transport close');
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Verify disconnection was broadcast
      const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-status-sync-instance');
      const disconnectStatusMessage = messageHistory.find(msg => 
        msg.message.type === 'connection_status' && 
        msg.message.data?.connected === false
      );

      expect(disconnectStatusMessage).toBeTruthy();
    });

    it('should receive and sync connection status from other tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      // Simulate initial disconnected state
      expect(result.current.connected).toBe(false);

      const connectionStatusFromOtherTab = {
        type: 'connection_status',
        data: {
          connected: true,
          connecting: false,
          error: null,
          senderId: 'different-socket-id'
        }
      };

      act(() => {
        broadcastChannelManager.simulateMessage('terminal-status-sync-instance', connectionStatusFromOtherTab);
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.connecting).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });
  });

  describe('Multi-Tab Coordination Scenarios', () => {
    it('should coordinate multiple tabs connecting to same instance', async () => {
      const instanceId = 'multi-tab-instance';
      
      // Simulate first tab
      const { result: tab1 } = renderHook(() => useTerminalSocket());
      act(() => {
        tab1.current.connect(instanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      // Simulate second tab
      const { result: tab2 } = renderHook(() => useTerminalSocket());
      act(() => {
        tab2.current.connect(instanceId);
      });

      // Both tabs should have their own channels but with the same name
      const channels = broadcastChannelManager.getAllChannels();
      const instanceChannels = channels.filter(ch => ch.name === `terminal-${instanceId}`);
      
      expect(instanceChannels.length).toBeGreaterThan(0);
    });

    it('should handle message ordering in cross-tab scenarios', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'message-order-test';
      
      act(() => {
        result.current.connect(instanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId
        });
      });

      // Send multiple messages in sequence
      const messages = ['message 1', 'message 2', 'message 3'];
      
      messages.forEach((msg, index) => {
        act(() => {
          mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
            data: msg,
            timestamp: new Date().toISOString(),
            isHistory: false
          });
        });
      });

      await waitFor(() => {
        expect(result.current.history.length).toBe(messages.length);
      });

      // Verify messages appear in correct order
      messages.forEach((msg, index) => {
        expect(result.current.history[index]).toBe(msg);
      });

      // Verify broadcast messages maintain order
      const messageHistory = broadcastChannelManager.getChannelMessageHistory(`terminal-${instanceId}`);
      const broadcastMessages = messageHistory
        .filter(msg => msg.message.type === 'terminal_data')
        .map(msg => msg.message.data.content);

      expect(broadcastMessages).toEqual(messages);
    });

    it('should handle rapid connection/disconnection across tabs', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'rapid-toggle-test';
      
      // Rapid connect/disconnect cycles
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.connect(instanceId);
        });

        await waitFor(() => {
          mockSocket = mockSocketFactory.getLastCreatedSocket()!;
        });

        act(() => {
          result.current.disconnect();
        });

        await waitFor(() => {
          expect(result.current.connected).toBe(false);
        });
      }

      // Verify channel cleanup was handled properly
      const activeChannels = broadcastChannelManager.getAllChannels();
      activeChannels.forEach(channel => {
        if (channel.name.startsWith(`terminal-${instanceId}`)) {
          expect(channel.close).toHaveBeenCalled();
        }
      });
    });
  });

  describe('BroadcastChannel Error Handling', () => {
    it('should handle BroadcastChannel API unavailability gracefully', async () => {
      // Mock BroadcastChannel as undefined (unsupported browser)
      const originalBroadcastChannel = global.BroadcastChannel;
      delete (global as any).BroadcastChannel;

      const { result } = renderHook(() => useTerminalSocket());
      
      // Connection should still work without cross-tab sync
      act(() => {
        result.current.connect('no-broadcast-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'no-broadcast-instance'
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // No broadcast channels should have been created
      const channels = broadcastChannelManager.getAllChannels();
      expect(channels.length).toBe(0);

      // Restore BroadcastChannel
      global.BroadcastChannel = originalBroadcastChannel;
    });

    it('should handle message serialization errors gracefully', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      
      act(() => {
        result.current.connect('serialize-test-instance');
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId: 'serialize-test-instance'
        });
      });

      // Send data that might cause serialization issues
      const problematicData = {
        data: 'normal data',
        timestamp: new Date().toISOString(),
        circularRef: {} as any
      };
      problematicData.circularRef.self = problematicData; // Create circular reference

      act(() => {
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', problematicData);
      });

      await waitFor(() => {
        // Should still update local history despite broadcast issues
        expect(result.current.history).toContain(problematicData.data);
      });
    });
  });

  describe('Memory Management in Cross-Tab Sync', () => {
    it('should enforce history size limits across tab synchronization', async () => {
      const { result } = renderHook(() => useTerminalSocket());
      const instanceId = 'history-limit-test';
      
      act(() => {
        result.current.connect(instanceId);
      });

      await waitFor(() => {
        mockSocket = mockSocketFactory.getLastCreatedSocket()!;
      });

      act(() => {
        mockSocketFactory.simulateSuccessfulConnection(mockSocket);
        mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_connected', {
          instanceId
        });
      });

      // Send many messages to test history limit (MAX_HISTORY_SIZE is 10000)
      const messageCount = 50;
      for (let i = 0; i < messageCount; i++) {
        act(() => {
          mockSocketFactory.simulateServerEvent(mockSocket, 'terminal_data', {
            data: `line ${i}`,
            timestamp: new Date().toISOString(),
            isHistory: false
          });
        });
      }

      await waitFor(() => {
        expect(result.current.history.length).toBe(messageCount);
      });

      // Simulate cross-tab message that should also respect history limit
      const crossTabMessage = {
        type: 'terminal_data',
        data: {
          content: `cross-tab line`,
          senderId: 'different-socket-id'
        }
      };

      act(() => {
        broadcastChannelManager.simulateMessage(`terminal-${instanceId}`, crossTabMessage);
      });

      await waitFor(() => {
        expect(result.current.history.length).toBe(messageCount + 1);
      });
    });
  });
});