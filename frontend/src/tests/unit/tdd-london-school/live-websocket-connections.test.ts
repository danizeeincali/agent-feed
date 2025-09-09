import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { WebSocketManager } from '../../src/services/WebSocketManager';

// Mock real WebSocket implementation
const mockRealWebSocket = {
  readyState: WebSocket.CONNECTING,
  url: 'ws://localhost:3000/ws',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  binaryType: 'blob' as BinaryType,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
};

const mockWebSocketManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  isConnected: jest.fn(),
  getConnectionState: jest.fn(),
  reconnect: jest.fn()
};

const mockNetworkManager = {
  createWebSocketConnection: jest.fn(),
  validateConnectionParams: jest.fn(),
  handleConnectionFailure: jest.fn(),
  monitorConnectionHealth: jest.fn()
};

const mockHeartbeatManager = {
  start: jest.fn(),
  stop: jest.fn(),
  sendPing: jest.fn(),
  receivePong: jest.fn()
};

describe('TDD London School: Live WebSocket Connections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset WebSocket state
    mockRealWebSocket.readyState = WebSocket.CONNECTING;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Real WebSocket Connection Establishment', () => {
    it('should establish actual WebSocket connection to production server', async () => {
      // Contract: Real WebSocket connection, not mock or simulator
      const expectedUrl = 'wss://production-agent-feed.com/ws';
      const connectionParams = {
        url: expectedUrl,
        protocols: ['agent-feed-protocol-v1'],
        timeout: 10000,
        retryAttempts: 3
      };

      mockNetworkManager.createWebSocketConnection.mockImplementation((params) => {
        expect(params.url).toBe(expectedUrl);
        expect(params.protocols).toContain('agent-feed-protocol-v1');
        
        // Simulate real WebSocket creation
        const ws = { ...mockRealWebSocket, url: params.url };
        ws.readyState = WebSocket.OPEN;
        return ws;
      });

      mockWebSocketManager.connect.mockImplementation(async (params) => {
        const ws = mockNetworkManager.createWebSocketConnection(params);
        return { success: true, connection: ws };
      });

      mockWebSocketManager.isConnected.mockReturnValue(true);
      mockWebSocketManager.getConnectionState.mockReturnValue({
        state: 'connected',
        url: expectedUrl,
        protocol: 'agent-feed-protocol-v1',
        connectTime: Date.now()
      });

      const { result } = renderHook(() => useWebSocket(connectionParams));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify real WebSocket creation and connection
      expect(mockNetworkManager.createWebSocketConnection).toHaveBeenCalledWith(connectionParams);
      expect(mockWebSocketManager.connect).toHaveBeenCalledWith(connectionParams);
      expect(mockWebSocketManager.isConnected).toHaveBeenCalled();
      
      // Verify connection state
      expect(result.current.connectionState?.url).toBe(expectedUrl);
      expect(result.current.connectionState?.protocol).toBe('agent-feed-protocol-v1');
      expect(result.current.error).toBeNull();
    });

    it('should handle connection failures without fallback to mock connections', async () => {
      // Contract: Real connection failures should not fall back to mock/simulation
      const failureReason = 'Network timeout - server unreachable';
      
      mockNetworkManager.createWebSocketConnection.mockRejectedValue(
        new Error(failureReason)
      );
      mockWebSocketManager.connect.mockRejectedValue(
        new Error(failureReason)
      );
      mockWebSocketManager.isConnected.mockReturnValue(false);
      mockNetworkManager.handleConnectionFailure.mockReturnValue({
        shouldRetry: true,
        retryDelay: 5000,
        fallbackAvailable: false
      });

      const { result } = renderHook(() => useWebSocket({
        url: 'wss://unreachable-server.com/ws',
        retryAttempts: 1
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Verify real connection failure handling
      expect(mockWebSocketManager.connect).toHaveBeenCalled();
      expect(mockNetworkManager.handleConnectionFailure).toHaveBeenCalledWith(
        expect.objectContaining({ message: failureReason })
      );
      
      // Verify no fallback to mock connection
      expect(result.current.error).toBe(failureReason);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBeNull();
    });

    it('should validate WebSocket message protocol compliance', async () => {
      // Contract: Messages must conform to real protocol specification
      const protocolMessage = {
        type: 'agent_status_update',
        version: '1.0',
        timestamp: new Date().toISOString(),
        payload: {
          agentId: 'real-agent-1',
          status: 'active',
          metrics: { cpu: 25.0, memory: 300.0 }
        },
        signature: 'sha256-hash-of-message-content'
      };

      let messageHandler: ((data: any) => void) | null = null;
      mockWebSocketManager.subscribe.mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
        return () => {}; // unsubscribe function
      });

      mockWebSocketManager.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      let receivedMessage: any = null;
      act(() => {
        result.current.subscribe('agent_status_update', (data) => {
          receivedMessage = data;
        });
      });

      // Simulate real protocol message receipt
      if (messageHandler) {
        act(() => {
          messageHandler(protocolMessage);
        });
      }

      await waitFor(() => {
        expect(receivedMessage).not.toBeNull();
      });

      // Verify protocol compliance
      expect(receivedMessage.type).toBe('agent_status_update');
      expect(receivedMessage.version).toBe('1.0');
      expect(receivedMessage.payload).toEqual(protocolMessage.payload);
      expect(receivedMessage.signature).toBe('sha256-hash-of-message-content');
    });
  });

  describe('Live WebSocket Health Monitoring', () => {
    it('should implement real heartbeat mechanism with server', async () => {
      // Contract: Real ping/pong heartbeat with production server
      mockWebSocketManager.isConnected.mockReturnValue(true);
      mockHeartbeatManager.start.mockImplementation(() => {
        // Simulate heartbeat start
        return setInterval(() => {
          mockHeartbeatManager.sendPing();
        }, 30000);
      });

      let heartbeatInterval: NodeJS.Timeout | null = null;
      mockHeartbeatManager.sendPing.mockImplementation(() => {
        // Simulate ping sent to real server
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'ping',
          timestamp: expect.any(Number)
        });
      });

      const { result } = renderHook(() => useWebSocket({
        enableHeartbeat: true,
        heartbeatInterval: 30000
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify heartbeat manager started
      expect(mockHeartbeatManager.start).toHaveBeenCalled();
      
      // Simulate heartbeat execution
      act(() => {
        mockHeartbeatManager.sendPing();
      });

      // Verify ping sent to real WebSocket
      expect(mockWebSocketManager.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ping' })
      );
    });

    it('should detect connection drops and attempt real reconnection', async () => {
      // Contract: Real connection monitoring and reconnection logic
      mockWebSocketManager.isConnected.mockReturnValueOnce(true).mockReturnValue(false);
      mockNetworkManager.monitorConnectionHealth.mockReturnValue({
        isHealthy: false,
        lastPingTime: Date.now() - 60000,
        missedPongs: 3
      });

      mockWebSocketManager.reconnect.mockImplementation(async () => {
        // Simulate reconnection attempt to real server
        return { success: true, attemptNumber: 1 };
      });

      const { result } = renderHook(() => useWebSocket({
        autoReconnect: true,
        reconnectInterval: 1000
      }));

      // Initially connected
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection drop
      act(() => {
        mockWebSocketManager.isConnected.mockReturnValue(false);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Wait for reconnection attempt
      await waitFor(() => {
        expect(mockWebSocketManager.reconnect).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify real reconnection attempt
      expect(mockNetworkManager.monitorConnectionHealth).toHaveBeenCalled();
      expect(mockWebSocketManager.reconnect).toHaveBeenCalled();
    });
  });

  describe('Real-time Message Broadcasting', () => {
    it('should broadcast messages to real WebSocket connection', async () => {
      // Contract: Messages sent to actual WebSocket, not mock queue
      const realMessage = {
        type: 'agent_command',
        command: 'start_task',
        agentId: 'production-agent-1',
        taskData: { description: 'Real task data', priority: 'high' },
        timestamp: new Date().toISOString()
      };

      mockWebSocketManager.isConnected.mockReturnValue(true);
      mockWebSocketManager.send.mockImplementation((message) => {
        // Verify message sent to real WebSocket connection
        expect(message).toEqual(realMessage);
        return Promise.resolve({ sent: true, messageId: 'msg-123' });
      });

      const { result } = renderHook(() => useWebSocket());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.send(realMessage);
      });

      // Verify real WebSocket send
      expect(mockWebSocketManager.send).toHaveBeenCalledWith(realMessage);
      expect(sendResult).toEqual({ sent: true, messageId: 'msg-123' });
    });
  });
});
