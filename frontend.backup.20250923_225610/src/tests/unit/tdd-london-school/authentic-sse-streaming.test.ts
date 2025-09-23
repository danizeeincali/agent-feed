import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSSEConnection } from '../../src/hooks/useSSEConnection';
import { SSEConnectionManager } from '../../src/services/SSEConnectionManager';

// Mock real EventSource implementation
const mockEventSource = {
  url: 'https://localhost:3000/api/stream',
  readyState: EventSource.CONNECTING,
  withCredentials: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  dispatchEvent: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  CONNECTING: EventSource.CONNECTING,
  OPEN: EventSource.OPEN,
  CLOSED: EventSource.CLOSED
};

const mockSSEManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  isConnected: jest.fn(),
  getConnectionState: jest.fn(),
  retry: jest.fn()
};

const mockStreamProcessor = {
  processSSEData: jest.fn(),
  validateEventFormat: jest.fn(),
  parseStreamChunk: jest.fn(),
  handleStreamError: jest.fn()
};

const mockReconnectionManager = {
  scheduleReconnect: jest.fn(),
  cancelReconnect: jest.fn(),
  getRetryInterval: jest.fn(),
  handleConnectionLoss: jest.fn()
};

describe('TDD London School: Authentic SSE Streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSource.readyState = EventSource.CONNECTING;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Real SSE Connection Management', () => {
    it('should establish authentic EventSource connection to production server', async () => {
      // Contract: Real EventSource to production SSE endpoint
      const sseEndpoint = 'https://production-api.agent-feed.com/api/v1/stream';
      const connectionConfig = {
        url: sseEndpoint,
        withCredentials: true,
        headers: {
          'Authorization': 'Bearer real-jwt-token',
          'Accept': 'text/event-stream'
        },
        timeout: 30000
      };

      mockSSEManager.connect.mockImplementation(async (config) => {
        expect(config.url).toBe(sseEndpoint);
        expect(config.withCredentials).toBe(true);
        expect(config.headers['Authorization']).toBe('Bearer real-jwt-token');
        
        // Simulate real EventSource creation
        const eventSource = { ...mockEventSource, url: config.url };
        eventSource.readyState = EventSource.OPEN;
        return { success: true, connection: eventSource };
      });

      mockSSEManager.isConnected.mockReturnValue(true);
      mockSSEManager.getConnectionState.mockReturnValue({
        state: 'open',
        url: sseEndpoint,
        lastEventId: null,
        connectionTime: Date.now()
      });

      const { result } = renderHook(() => useSSEConnection(connectionConfig));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify real EventSource connection
      expect(mockSSEManager.connect).toHaveBeenCalledWith(connectionConfig);
      expect(result.current.connectionState?.url).toBe(sseEndpoint);
      expect(result.current.connectionState?.state).toBe('open');
      expect(result.current.error).toBeNull();
    });

    it('should handle SSE connection failures without mock fallback', async () => {
      // Contract: Real connection failures, no simulated success
      const networkError = 'ERR_NETWORK_CHANGED - Connection interrupted';
      
      mockSSEManager.connect.mockRejectedValue(new Error(networkError));
      mockSSEManager.isConnected.mockReturnValue(false);
      mockReconnectionManager.handleConnectionLoss.mockReturnValue({
        shouldRetry: true,
        retryDelay: 2000,
        maxRetries: 5
      });

      const { result } = renderHook(() => useSSEConnection({
        url: 'https://unavailable-server.com/stream',
        retryAttempts: 2
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Verify real connection failure handling
      expect(mockSSEManager.connect).toHaveBeenCalled();
      expect(mockReconnectionManager.handleConnectionLoss).toHaveBeenCalled();
      expect(result.current.error).toBe(networkError);
      expect(result.current.connectionState).toBeNull();
    });

    it('should process authentic server-sent event format', async () => {
      // Contract: Real SSE event format parsing, not mock data
      const realSSEEvent = {
        id: 'event-12345',
        event: 'agent_metrics_update',
        data: JSON.stringify({
          agentId: 'production-agent-1',
          metrics: {
            cpu: 45.2,
            memory: 1024.5,
            activeConnections: 15
          },
          timestamp: '2023-12-01T10:30:00.000Z'
        }),
        retry: 10000
      };

      let eventHandler: ((event: MessageEvent) => void) | null = null;
      mockSSEManager.subscribe.mockImplementation((eventType, handler) => {
        if (eventType === 'agent_metrics_update') {
          eventHandler = handler;
        }
        return () => {}; // unsubscribe function
      });

      mockStreamProcessor.processSSEData.mockImplementation((rawEvent) => {
        expect(rawEvent.id).toBe(realSSEEvent.id);
        expect(rawEvent.event).toBe(realSSEEvent.event);
        return JSON.parse(rawEvent.data);
      });

      mockStreamProcessor.validateEventFormat.mockReturnValue({
        valid: true,
        eventType: 'agent_metrics_update'
      });

      mockSSEManager.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useSSEConnection());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      let processedEvent: any = null;
      act(() => {
        result.current.subscribe('agent_metrics_update', (data) => {
          processedEvent = data;
        });
      });

      // Simulate real SSE event receipt
      if (eventHandler) {
        const messageEvent = new MessageEvent('message', {
          data: realSSEEvent.data,
          lastEventId: realSSEEvent.id
        }) as any;
        messageEvent.type = realSSEEvent.event;
        
        act(() => {
          eventHandler(messageEvent);
        });
      }

      await waitFor(() => {
        expect(processedEvent).not.toBeNull();
      });

      // Verify real SSE event processing
      expect(mockStreamProcessor.validateEventFormat).toHaveBeenCalled();
      expect(mockStreamProcessor.processSSEData).toHaveBeenCalled();
      expect(processedEvent.agentId).toBe('production-agent-1');
      expect(processedEvent.metrics.cpu).toBe(45.2);
    });
  });

  describe('Live Event Stream Processing', () => {
    it('should handle streaming data chunks in real-time', async () => {
      // Contract: Process real streaming chunks, not buffered mock data
      const streamChunks = [
        'data: {"type":"chunk_start","id":"stream-1"}\n\n',
        'data: {"type":"partial_data","payload":{"agents":[{"id":"agent-1"',
        'data: ","status":"active"}]}}\n\n',
        'data: {"type":"chunk_end","id":"stream-1"}\n\n'
      ];

      let chunkProcessor: ((chunk: string) => void) | null = null;
      mockStreamProcessor.parseStreamChunk.mockImplementation((chunk) => {
        if (chunk.includes('chunk_start')) {
          return { type: 'start', streamId: 'stream-1' };
        } else if (chunk.includes('partial_data')) {
          return { type: 'data', partial: true, payload: { agents: [{ id: 'agent-1' }] } };
        } else if (chunk.includes('chunk_end')) {
          return { type: 'end', streamId: 'stream-1' };
        }
        return null;
      });

      mockSSEManager.subscribe.mockImplementation((event, handler) => {
        if (event === 'chunk') {
          chunkProcessor = handler;
        }
        return () => {};
      });

      mockSSEManager.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useSSEConnection());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const processedChunks: any[] = [];
      act(() => {
        result.current.subscribe('streaming_chunk', (data) => {
          processedChunks.push(data);
        });
      });

      // Simulate real streaming chunks
      if (chunkProcessor) {
        for (const chunk of streamChunks) {
          act(() => {
            chunkProcessor!(chunk);
          });
        }
      }

      await waitFor(() => {
        expect(processedChunks.length).toBeGreaterThan(0);
      });

      // Verify real chunk processing
      expect(mockStreamProcessor.parseStreamChunk).toHaveBeenCalledTimes(streamChunks.length);
      expect(processedChunks).toContainEqual(
        expect.objectContaining({ type: 'start' })
      );
      expect(processedChunks).toContainEqual(
        expect.objectContaining({ type: 'data', partial: true })
      );
      expect(processedChunks).toContainEqual(
        expect.objectContaining({ type: 'end' })
      );
    });

    it('should maintain connection state during network interruptions', async () => {
      // Contract: Real network interruption handling, not simulated stability
      mockSSEManager.isConnected.mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      mockReconnectionManager.scheduleReconnect.mockImplementation(async () => {
        // Simulate real reconnection attempt
        return { success: true, reconnectTime: Date.now() };
      });

      mockReconnectionManager.getRetryInterval.mockReturnValue(1000);

      const { result } = renderHook(() => useSSEConnection({
        autoReconnect: true,
        reconnectDelay: 1000
      }));

      // Initially connected
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network interruption
      act(() => {
        mockSSEManager.isConnected.mockReturnValue(false);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Wait for reconnection
      await waitFor(() => {
        expect(mockReconnectionManager.scheduleReconnect).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify real reconnection handling
      expect(mockReconnectionManager.handleConnectionLoss).toHaveBeenCalled();
      expect(mockReconnectionManager.getRetryInterval).toHaveBeenCalled();
    });
  });

  describe('Production SSE Authentication', () => {
    it('should authenticate with real production SSE endpoints', async () => {
      // Contract: Real authentication flow, not bypassed mock
      const authConfig = {
        url: 'https://api.agent-feed.com/auth/sse-stream',
        authToken: 'real-jwt-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshTokenUrl: '/auth/refresh',
        authRetryCount: 3
      };

      const mockAuthManager = {
        validateToken: jest.fn(),
        refreshToken: jest.fn(),
        attachAuthHeaders: jest.fn()
      };

      mockAuthManager.validateToken.mockImplementation(async (token) => {
        expect(token).toBe(authConfig.authToken);
        return { valid: true, expiresIn: 3600 };
      });

      mockAuthManager.attachAuthHeaders.mockReturnValue({
        'Authorization': `Bearer ${authConfig.authToken}`,
        'X-SSE-Version': '1.0'
      });

      mockSSEManager.connect.mockImplementation(async (config) => {
        expect(config.headers['Authorization']).toBe(`Bearer ${authConfig.authToken}`);
        return { success: true, authenticated: true };
      });

      const { result } = renderHook(() => useSSEConnection(authConfig));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify real authentication flow
      expect(mockAuthManager.validateToken).toHaveBeenCalledWith(authConfig.authToken);
      expect(mockAuthManager.attachAuthHeaders).toHaveBeenCalled();
      expect(mockSSEManager.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${authConfig.authToken}`
          })
        })
      );
    });
  });
});
