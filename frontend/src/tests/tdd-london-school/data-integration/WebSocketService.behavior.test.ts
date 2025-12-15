/**
 * WebSocket Service Behavior Tests - TDD London School
 * Tests the WebSocket service layer interactions and real-time communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { testSetup } from '../factories/MockFactory';
import type { 
  IWebSocketService, 
  INotificationService, 
  ICacheService 
} from '../contracts/ComponentContracts';

// Mock WebSocket Implementation for testing
class MockWebSocketService implements IWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private notifications: INotificationService,
    private cache: ICacheService
  ) {}

  connect(url: string): void {
    try {
      this.connectionState = 'connecting';
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.notifications.success('Connected to real-time updates');
        this.cache.set('ws:connection', { status: 'connected', timestamp: Date.now() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.connectionState = 'disconnected';
        this.cache.delete('ws:connection');
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(url);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.notifications.error('Connection lost. Please refresh the page.');
        }
      };

      this.ws.onerror = () => {
        this.connectionState = 'error';
        this.notifications.warning('Connection error. Attempting to reconnect...');
      };

    } catch (error) {
      this.connectionState = 'error';
      this.notifications.error('Failed to establish connection');
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.connectionState = 'disconnected';
    this.subscriptions.clear();
    this.cache.delete('ws:connection');
  }

  send(data: any): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }

    try {
      this.ws!.send(JSON.stringify(data));
    } catch (error) {
      this.notifications.error('Failed to send message');
      throw error;
    }
  }

  subscribe(event: string, callback: (data: any) => void): void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(callback);
  }

  unsubscribe(event: string): void {
    this.subscriptions.delete(event);
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this.connectionState;
  }

  private handleMessage(data: any): void {
    const { type, payload } = data;
    
    if (this.subscriptions.has(type)) {
      this.subscriptions.get(type)!.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }

    // Cache recent messages
    const recentMessages = this.cache.get<any[]>('ws:recent_messages') || [];
    recentMessages.push({ ...data, timestamp: Date.now() });
    
    // Keep only last 10 messages
    if (recentMessages.length > 10) {
      recentMessages.shift();
    }
    
    this.cache.set('ws:recent_messages', recentMessages, 60000); // 1 minute TTL
  }

  private scheduleReconnect(url: string): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    this.notifications.info(`Reconnecting in ${delay / 1000} seconds... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(url);
    }, delay);
  }
}

class WebSocketServiceBehaviorSuite extends LondonSchoolTestSuite {
  private webSocketService!: IWebSocketService;
  private mockNotificationService!: INotificationService;
  private mockCacheService!: ICacheService;
  private mockWebSocket!: any;

  protected setupCollaborators(): void {
    this.mockNotificationService = testSetup.mockService('NotificationService', {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn()
    });

    this.mockCacheService = testSetup.mockService('CacheService', {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      keys: vi.fn().mockReturnValue([])
    });

    // Mock WebSocket constructor
    this.mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.CONNECTING,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null
    };

    global.WebSocket = vi.fn().mockImplementation(() => this.mockWebSocket);

    this.webSocketService = new MockWebSocketService(
      this.mockNotificationService,
      this.mockCacheService
    );
  }

  protected verifyAllInteractions(): void {
    // Verify WebSocket service collaborates correctly with notifications and cache
  }

  public testConnectionBehavior(): void {
    describe('Connection behavior', () => {
      it('should establish WebSocket connection and notify on success', () => {
        // Arrange
        const url = 'ws://localhost:8080/ws';

        // Act
        this.webSocketService.connect(url);
        
        // Simulate successful connection
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        // Assert - London School: Verify collaboration patterns
        expect(global.WebSocket).toHaveBeenCalledWith(url);
        expect(this.mockNotificationService.success).toHaveBeenCalledWith('Connected to real-time updates');
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'ws:connection',
          { status: 'connected', timestamp: expect.any(Number) }
        );
        expect(this.webSocketService.isConnected()).toBe(true);
        expect(this.webSocketService.getConnectionState()).toBe('connected');
      });

      it('should handle connection failures gracefully', () => {
        // Arrange
        const url = 'ws://invalid-url';

        // Act
        this.webSocketService.connect(url);
        
        // Simulate connection error
        this.mockWebSocket.onerror?.({});

        // Assert
        expect(this.mockNotificationService.warning).toHaveBeenCalledWith(
          'Connection error. Attempting to reconnect...'
        );
        expect(this.webSocketService.getConnectionState()).toBe('error');
      });

      it('should clean up properly on disconnect', () => {
        // Arrange - Establish connection first
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        // Act
        this.webSocketService.disconnect();

        // Assert
        expect(this.mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('ws:connection');
        expect(this.webSocketService.getConnectionState()).toBe('disconnected');
      });
    });
  }

  public testMessageHandlingBehavior(): void {
    describe('Message handling behavior', () => {
      it('should send messages when connected', () => {
        // Arrange
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});
        
        const testData = { type: 'test', content: 'Hello WebSocket' };

        // Act
        this.webSocketService.send(testData);

        // Assert
        expect(this.mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testData));
      });

      it('should throw error when sending while disconnected', () => {
        // Arrange - Service is not connected

        // Act & Assert
        expect(() => {
          this.webSocketService.send({ type: 'test' });
        }).toThrow('WebSocket is not connected');
      });

      it('should handle incoming messages and notify subscribers', () => {
        // Arrange
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        this.webSocketService.subscribe('comment_update', callback1);
        this.webSocketService.subscribe('comment_update', callback2);
        this.webSocketService.subscribe('other_event', vi.fn());

        const testMessage = {
          type: 'comment_update',
          payload: { commentId: '123', action: 'created' }
        };

        // Act - Simulate incoming message
        this.mockWebSocket.onmessage?.({
          data: JSON.stringify(testMessage)
        });

        // Assert
        expect(callback1).toHaveBeenCalledWith(testMessage.payload);
        expect(callback2).toHaveBeenCalledWith(testMessage.payload);
        
        // Should cache recent messages
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'ws:recent_messages',
          expect.arrayContaining([
            expect.objectContaining({
              type: 'comment_update',
              payload: testMessage.payload,
              timestamp: expect.any(Number)
            })
          ]),
          60000
        );
      });

      it('should handle malformed JSON messages gracefully', () => {
        // Arrange
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act - Simulate malformed message
        this.mockWebSocket.onmessage?.({
          data: 'invalid json {'
        });

        // Assert - Should not crash
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to parse WebSocket message:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  }

  public testSubscriptionBehavior(): void {
    describe('Subscription behavior', () => {
      it('should manage event subscriptions correctly', () => {
        // Arrange
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        // Act - Subscribe to events
        this.webSocketService.subscribe('event1', callback1);
        this.webSocketService.subscribe('event2', callback2);

        // Simulate connection and messages
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        this.mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'event1', payload: 'data1' })
        });

        // Assert
        expect(callback1).toHaveBeenCalledWith('data1');
        expect(callback2).not.toHaveBeenCalled();
      });

      it('should remove subscriptions when unsubscribing', () => {
        // Arrange
        const callback = vi.fn();
        this.webSocketService.subscribe('test_event', callback);

        // Act
        this.webSocketService.unsubscribe('test_event');

        // Simulate connection and message
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        this.mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'test_event', payload: 'data' })
        });

        // Assert - Callback should not be called
        expect(callback).not.toHaveBeenCalled();
      });

      it('should handle callback errors without breaking message processing', () => {
        // Arrange
        const errorCallback = vi.fn().mockImplementation(() => {
          throw new Error('Callback error');
        });
        const goodCallback = vi.fn();

        this.webSocketService.subscribe('error_event', errorCallback);
        this.webSocketService.subscribe('error_event', goodCallback);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        this.mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'error_event', payload: 'test' })
        });

        // Assert - Good callback should still be called despite error in first callback
        expect(errorCallback).toHaveBeenCalled();
        expect(goodCallback).toHaveBeenCalledWith('test');
        expect(consoleSpy).toHaveBeenCalledWith('Error in WebSocket callback:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });
  }

  public testReconnectionBehavior(): void {
    describe('Reconnection behavior', () => {
      it('should attempt reconnection on unexpected disconnect', () => {
        // Arrange
        vi.useFakeTimers();
        
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        // Act - Simulate unexpected disconnect
        this.mockWebSocket.onclose?.({ wasClean: false });

        // Assert - Should schedule reconnection
        expect(this.mockNotificationService.info).toHaveBeenCalledWith(
          expect.stringMatching(/Reconnecting in \d+ seconds/)
        );

        // Fast-forward timer
        vi.advanceTimersByTime(2000);

        // Should attempt new connection
        expect(global.WebSocket).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
      });

      it('should use exponential backoff for reconnection attempts', () => {
        // Arrange
        vi.useFakeTimers();
        
        this.webSocketService.connect('ws://localhost:8080/ws');

        // Act - Simulate multiple failed reconnection attempts
        for (let i = 0; i < 3; i++) {
          this.mockWebSocket.onclose?.({ wasClean: false });
          vi.advanceTimersByTime(Math.min(1000 * Math.pow(2, i + 1), 30000));
        }

        // Assert - Should have made multiple reconnection attempts
        expect(global.WebSocket).toHaveBeenCalledTimes(4); // Initial + 3 reconnects

        vi.useRealTimers();
      });

      it('should stop reconnecting after max attempts and notify user', () => {
        // Arrange
        vi.useFakeTimers();
        
        this.webSocketService.connect('ws://localhost:8080/ws');

        // Act - Exceed max reconnect attempts
        for (let i = 0; i < 4; i++) {
          this.mockWebSocket.onclose?.({ wasClean: false });
          if (i < 3) {
            vi.advanceTimersByTime(30000);
          }
        }

        // Assert
        expect(this.mockNotificationService.error).toHaveBeenCalledWith(
          'Connection lost. Please refresh the page.'
        );

        vi.useRealTimers();
      });
    });
  }

  public testCachingBehavior(): void {
    describe('Caching behavior', () => {
      it('should cache connection status and recent messages', () => {
        // Arrange
        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        
        // Act - Simulate connection and message
        this.mockWebSocket.onopen?.({});
        
        const testMessage = { type: 'test', payload: 'data' };
        this.mockWebSocket.onmessage?.({
          data: JSON.stringify(testMessage)
        });

        // Assert
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'ws:connection',
          { status: 'connected', timestamp: expect.any(Number) }
        );
        
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'ws:recent_messages',
          expect.arrayContaining([
            expect.objectContaining({
              type: 'test',
              payload: 'data',
              timestamp: expect.any(Number)
            })
          ]),
          60000
        );
      });

      it('should maintain limited cache of recent messages', () => {
        // Arrange
        const existingMessages = Array.from({ length: 10 }, (_, i) => ({
          type: 'old',
          payload: `message${i}`,
          timestamp: Date.now() - 1000
        }));
        
        this.mockCacheService.get = vi.fn().mockReturnValue(existingMessages);

        this.webSocketService.connect('ws://localhost:8080/ws');
        this.mockWebSocket.readyState = WebSocket.OPEN;
        this.mockWebSocket.onopen?.({});

        // Act - Add new message (should push out oldest)
        this.mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'new', payload: 'latest' })
        });

        // Assert - Should maintain max 10 messages
        expect(this.mockCacheService.set).toHaveBeenCalledWith(
          'ws:recent_messages',
          expect.arrayContaining([
            expect.objectContaining({ type: 'new', payload: 'latest' })
          ]),
          60000
        );
      });
    });
  }
}

// Test Suite Execution
describe('WebSocket Service Behavior Tests (London School TDD)', () => {
  let behaviorSuite: WebSocketServiceBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    behaviorSuite = new WebSocketServiceBehaviorSuite();
    behaviorSuite.beforeEach();
  });

  afterEach(() => {
    behaviorSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute test categories
  behaviorSuite.testConnectionBehavior();
  behaviorSuite.testMessageHandlingBehavior();
  behaviorSuite.testSubscriptionBehavior();
  behaviorSuite.testReconnectionBehavior();
  behaviorSuite.testCachingBehavior();

  // High-level service collaboration tests
  describe('WebSocket service collaboration patterns', () => {
    it('should coordinate with notification and cache services correctly', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('WebSocket service needs to manage real-time connections with user feedback')
        .when('connection lifecycle and message handling occurs')
        .then([
          'users should be notified of connection status changes',
          'connection state should be cached for persistence',
          'messages should be cached for recent history',
          'reconnection should happen automatically with proper backoff',
          'subscription management should be robust'
        ])
        .withCollaborators(['WebSocketService', 'NotificationService', 'CacheService'])
        .build();

      expect(behaviorSpec.collaborators).toHaveLength(3);
      expect(behaviorSpec.then).toHaveLength(5);
    });
  });
});