/**
 * WebSocket Integration Tests
 * London School TDD - Real-time Communication Testing
 */

const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { WebSocketEventFactory } = require('../utils/test-factories');
const { MockWebSocket, testUtils } = require('../utils/test-setup');

// WebSocket Integration Service
class AgentWebSocketIntegration {
  constructor(webSocketFactory, eventHandler, reconnectionStrategy) {
    this.webSocketFactory = webSocketFactory;
    this.eventHandler = eventHandler;
    this.reconnectionStrategy = reconnectionStrategy;
    this.connection = null;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect(url) {
    try {
      this.connection = await this.webSocketFactory.create(url);
      this.setupEventHandlers();
      this.reconnectAttempts = 0;
      
      await this.eventHandler.onConnected(this.connection);
      
      return this.connection;
    } catch (error) {
      await this.handleConnectionError(error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.connection.addEventListener('message', this.handleMessage.bind(this));
    this.connection.addEventListener('close', this.handleDisconnection.bind(this));
    this.connection.addEventListener('error', this.handleError.bind(this));
  }

  async subscribe(eventType, handler) {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    
    this.subscriptions.get(eventType).add(handler);
    
    // Send subscription message to server
    const subscriptionMessage = {
      type: 'subscribe',
      event: eventType,
      timestamp: Date.now()
    };
    
    await this.send(subscriptionMessage);
  }

  async unsubscribe(eventType, handler) {
    if (this.subscriptions.has(eventType)) {
      this.subscriptions.get(eventType).delete(handler);
      
      if (this.subscriptions.get(eventType).size === 0) {
        this.subscriptions.delete(eventType);
        
        // Send unsubscription message to server
        const unsubscriptionMessage = {
          type: 'unsubscribe',
          event: eventType,
          timestamp: Date.now()
        };
        
        await this.send(unsubscriptionMessage);
      }
    }
  }

  async send(message) {
    if (this.connection?.readyState === 1) { // OPEN
      this.connection.send(JSON.stringify(message));
      await this.eventHandler.onMessageSent(message);
    } else {
      throw new Error('WebSocket connection not open');
    }
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const handlers = this.subscriptions.get(message.type);
      
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`Error in message handler for ${message.type}:`, error);
          }
        });
      }
      
      this.eventHandler.onMessageReceived(message);
    } catch (error) {
      this.eventHandler.onMessageParsingError(error, event.data);
    }
  }

  async handleDisconnection(event) {
    await this.eventHandler.onDisconnected(event);
    
    if (this.shouldAttemptReconnection()) {
      await this.attemptReconnection();
    }
  }

  async handleError(error) {
    await this.eventHandler.onError(error);
  }

  async handleConnectionError(error) {
    await this.eventHandler.onConnectionError(error);
  }

  shouldAttemptReconnection() {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  async attemptReconnection() {
    this.reconnectAttempts++;
    const delay = this.reconnectionStrategy.calculateDelay(this.reconnectAttempts);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connect(this.connection?.url);
      await this.resubscribeAll();
    } catch (error) {
      if (this.shouldAttemptReconnection()) {
        await this.attemptReconnection();
      } else {
        await this.eventHandler.onReconnectionFailed(error);
      }
    }
  }

  async resubscribeAll() {
    for (const [eventType] of this.subscriptions) {
      const subscriptionMessage = {
        type: 'subscribe',
        event: eventType,
        timestamp: Date.now()
      };
      
      await this.send(subscriptionMessage);
    }
  }

  async disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.subscriptions.clear();
    }
  }
}

// Mock Dependencies
class MockWebSocketFactory {
  constructor() {
    this.create = jest.fn();
  }
}

class MockEventHandler {
  constructor() {
    this.onConnected = jest.fn();
    this.onDisconnected = jest.fn();
    this.onError = jest.fn();
    this.onConnectionError = jest.fn();
    this.onMessageReceived = jest.fn();
    this.onMessageSent = jest.fn();
    this.onMessageParsingError = jest.fn();
    this.onReconnectionFailed = jest.fn();
  }
}

class MockReconnectionStrategy {
  constructor() {
    this.calculateDelay = jest.fn().mockReturnValue(1000);
  }
}

describe('WebSocket Integration', () => {
  let integration;
  let mockWebSocketFactory;
  let mockEventHandler;
  let mockReconnectionStrategy;
  let mockWebSocket;

  beforeEach(() => {
    mockWebSocketFactory = new MockWebSocketFactory();
    mockEventHandler = new MockEventHandler();
    mockReconnectionStrategy = new MockReconnectionStrategy();
    mockWebSocket = testUtils.createMockWebSocket('ws://localhost:3001');

    integration = new AgentWebSocketIntegration(
      mockWebSocketFactory,
      mockEventHandler,
      mockReconnectionStrategy
    );

    mockWebSocketFactory.create.mockResolvedValue(mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Establishment', () => {
    describe('when connecting successfully', () => {
      beforeEach(async () => {
        await integration.connect('ws://localhost:3001');
      });

      it('should create WebSocket connection via factory', () => {
        expect(mockWebSocketFactory.create).toHaveBeenCalledWith('ws://localhost:3001');
      });

      it('should setup event handlers on connection', () => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      });

      it('should notify event handler of successful connection', () => {
        expect(mockEventHandler.onConnected).toHaveBeenCalledWith(mockWebSocket);
      });

      it('should reset reconnection attempts counter', () => {
        expect(integration.reconnectAttempts).toBe(0);
      });

      it('should store connection reference', () => {
        expect(integration.connection).toBe(mockWebSocket);
      });
    });

    describe('when connection fails', () => {
      const connectionError = new Error('Connection refused');

      beforeEach(() => {
        mockWebSocketFactory.create.mockRejectedValue(connectionError);
      });

      it('should handle connection error', async () => {
        await expect(integration.connect('ws://localhost:3001')).rejects.toThrow('Connection refused');
        
        expect(mockEventHandler.onConnectionError).toHaveBeenCalledWith(connectionError);
      });

      it('should not setup event handlers on failed connection', async () => {
        try {
          await integration.connect('ws://localhost:3001');
        } catch (error) {
          // Expected error
        }

        expect(mockWebSocket.addEventListener).not.toHaveBeenCalled();
      });
    });
  });

  describe('Event Subscription Management', () => {
    beforeEach(async () => {
      await integration.connect('ws://localhost:3001');
    });

    describe('when subscribing to events', () => {
      const eventHandler = jest.fn();

      beforeEach(async () => {
        await integration.subscribe('agent-status-change', eventHandler);
      });

      it('should store subscription handler', () => {
        expect(integration.subscriptions.has('agent-status-change')).toBe(true);
        expect(integration.subscriptions.get('agent-status-change').has(eventHandler)).toBe(true);
      });

      it('should send subscription message to server', () => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'subscribe',
            event: 'agent-status-change',
            timestamp: expect.any(Number)
          })
        );
      });

      it('should notify event handler of sent message', () => {
        expect(mockEventHandler.onMessageSent).toHaveBeenCalledWith({
          type: 'subscribe',
          event: 'agent-status-change',
          timestamp: expect.any(Number)
        });
      });
    });

    describe('when unsubscribing from events', () => {
      const eventHandler = jest.fn();

      beforeEach(async () => {
        await integration.subscribe('agent-status-change', eventHandler);
        jest.clearAllMocks();
        await integration.unsubscribe('agent-status-change', eventHandler);
      });

      it('should remove subscription handler', () => {
        expect(integration.subscriptions.has('agent-status-change')).toBe(false);
      });

      it('should send unsubscription message to server', () => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'unsubscribe',
            event: 'agent-status-change',
            timestamp: expect.any(Number)
          })
        );
      });
    });

    describe('when multiple handlers subscribe to same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      beforeEach(async () => {
        await integration.subscribe('agent-status-change', handler1);
        await integration.subscribe('agent-status-change', handler2);
      });

      it('should store multiple handlers for same event', () => {
        const handlers = integration.subscriptions.get('agent-status-change');
        expect(handlers.size).toBe(2);
        expect(handlers.has(handler1)).toBe(true);
        expect(handlers.has(handler2)).toBe(true);
      });

      it('should not unsubscribe from server until all handlers removed', async () => {
        await integration.unsubscribe('agent-status-change', handler1);
        
        // Should not send unsubscribe message yet
        expect(mockWebSocket.send).not.toHaveBeenCalledWith(
          expect.stringContaining('unsubscribe')
        );
        
        await integration.unsubscribe('agent-status-change', handler2);
        
        // Now should send unsubscribe message
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'unsubscribe',
            event: 'agent-status-change',
            timestamp: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await integration.connect('ws://localhost:3001');
    });

    describe('when receiving valid messages', () => {
      const agentStatusHandler = jest.fn();
      const agentUpdateHandler = jest.fn();

      beforeEach(async () => {
        await integration.subscribe('agent-status-change', agentStatusHandler);
        await integration.subscribe('agent-updated', agentUpdateHandler);
      });

      it('should parse and dispatch status change messages', () => {
        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange(
          'personal-todos-agent',
          'inactive'
        );

        mockWebSocket.simulateMessage(statusChangeEvent);

        expect(agentStatusHandler).toHaveBeenCalledWith(statusChangeEvent);
        expect(mockEventHandler.onMessageReceived).toHaveBeenCalledWith(statusChangeEvent);
      });

      it('should dispatch messages to correct subscribers only', () => {
        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange();
        const metricsUpdateEvent = WebSocketEventFactory.createAgentMetricsUpdate();

        mockWebSocket.simulateMessage(statusChangeEvent);
        mockWebSocket.simulateMessage(metricsUpdateEvent);

        expect(agentStatusHandler).toHaveBeenCalledWith(statusChangeEvent);
        expect(agentStatusHandler).not.toHaveBeenCalledWith(metricsUpdateEvent);
      });

      it('should handle multiple handlers for same event type', () => {
        const additionalHandler = jest.fn();
        integration.subscriptions.get('agent-status-change').add(additionalHandler);

        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange();
        mockWebSocket.simulateMessage(statusChangeEvent);

        expect(agentStatusHandler).toHaveBeenCalledWith(statusChangeEvent);
        expect(additionalHandler).toHaveBeenCalledWith(statusChangeEvent);
      });
    });

    describe('when receiving invalid messages', () => {
      beforeEach(async () => {
        await integration.subscribe('agent-status-change', jest.fn());
      });

      it('should handle JSON parsing errors gracefully', () => {
        const invalidMessageEvent = new MessageEvent('message', {
          data: '{ invalid json }'
        });

        mockWebSocket.dispatchEvent(invalidMessageEvent);

        expect(mockEventHandler.onMessageParsingError).toHaveBeenCalledWith(
          expect.any(Error),
          '{ invalid json }'
        );
      });

      it('should handle handler errors without crashing', () => {
        const faultyHandler = jest.fn().mockImplementation(() => {
          throw new Error('Handler error');
        });
        
        integration.subscriptions.get('agent-status-change').add(faultyHandler);

        const statusChangeEvent = WebSocketEventFactory.createAgentStatusChange();
        
        expect(() => {
          mockWebSocket.simulateMessage(statusChangeEvent);
        }).not.toThrow();
        
        expect(faultyHandler).toHaveBeenCalled();
      });
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await integration.connect('ws://localhost:3001');
    });

    describe('when connection is open', () => {
      const testMessage = { type: 'test', data: 'hello' };

      beforeEach(async () => {
        mockWebSocket.readyState = 1; // OPEN
        await integration.send(testMessage);
      });

      it('should serialize and send message', () => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
      });

      it('should notify event handler of sent message', () => {
        expect(mockEventHandler.onMessageSent).toHaveBeenCalledWith(testMessage);
      });
    });

    describe('when connection is not open', () => {
      beforeEach(() => {
        mockWebSocket.readyState = 0; // CONNECTING
      });

      it('should throw error for closed connection', async () => {
        const testMessage = { type: 'test' };
        
        await expect(integration.send(testMessage)).rejects.toThrow(
          'WebSocket connection not open'
        );
      });

      it('should not notify event handler for failed sends', async () => {
        try {
          await integration.send({ type: 'test' });
        } catch (error) {
          // Expected error
        }

        expect(mockEventHandler.onMessageSent).not.toHaveBeenCalled();
      });
    });
  });

  describe('Connection Recovery', () => {
    beforeEach(async () => {
      await integration.connect('ws://localhost:3001');
    });

    describe('when connection is lost', () => {
      beforeEach(() => {
        mockReconnectionStrategy.calculateDelay.mockReturnValue(100);
      });

      it('should attempt reconnection within retry limits', async () => {
        const closeEvent = new CloseEvent('close');
        
        mockWebSocket.dispatchEvent(closeEvent);
        
        // Wait for reconnection attempt
        await testUtils.waitFor(() => {
          return mockWebSocketFactory.create.mock.calls.length > 1;
        }, { timeout: 1000 });

        expect(mockWebSocketFactory.create).toHaveBeenCalledTimes(2);
        expect(mockEventHandler.onDisconnected).toHaveBeenCalledWith(closeEvent);
      });

      it('should use reconnection strategy for delay calculation', async () => {
        const closeEvent = new CloseEvent('close');
        
        mockWebSocket.dispatchEvent(closeEvent);
        
        await testUtils.waitFor(() => {
          return mockReconnectionStrategy.calculateDelay.mock.calls.length > 0;
        }, { timeout: 500 });

        expect(mockReconnectionStrategy.calculateDelay).toHaveBeenCalledWith(1);
      });

      it('should resubscribe to all events after reconnection', async () => {
        await integration.subscribe('agent-status-change', jest.fn());
        await integration.subscribe('agent-updated', jest.fn());
        
        jest.clearAllMocks();
        mockWebSocket.readyState = 1;
        
        const closeEvent = new CloseEvent('close');
        mockWebSocket.dispatchEvent(closeEvent);
        
        // Wait for reconnection and resubscription
        await testUtils.waitFor(() => {
          return mockWebSocket.send.mock.calls.length >= 2;
        }, { timeout: 1000 });

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringContaining('agent-status-change')
        );
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringContaining('agent-updated')
        );
      });

      it('should stop attempting after max retries exceeded', async () => {
        integration.maxReconnectAttempts = 2;
        mockWebSocketFactory.create.mockRejectedValue(new Error('Connection failed'));

        const closeEvent = new CloseEvent('close');
        mockWebSocket.dispatchEvent(closeEvent);

        await testUtils.waitFor(() => {
          return mockEventHandler.onReconnectionFailed.mock.calls.length > 0;
        }, { timeout: 1000 });

        expect(mockEventHandler.onReconnectionFailed).toHaveBeenCalledWith(
          expect.any(Error)
        );
        expect(mockWebSocketFactory.create).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });
    });
  });

  describe('Cleanup and Disconnection', () => {
    beforeEach(async () => {
      await integration.connect('ws://localhost:3001');
      await integration.subscribe('agent-status-change', jest.fn());
    });

    describe('when disconnecting manually', () => {
      beforeEach(async () => {
        await integration.disconnect();
      });

      it('should close WebSocket connection', () => {
        expect(mockWebSocket.close).toHaveBeenCalled();
      });

      it('should clear connection reference', () => {
        expect(integration.connection).toBeNull();
      });

      it('should clear all subscriptions', () => {
        expect(integration.subscriptions.size).toBe(0);
      });
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle WebSocket factory failures', async () => {
      const factoryError = new Error('Factory failed to create WebSocket');
      mockWebSocketFactory.create.mockRejectedValue(factoryError);

      await expect(integration.connect('ws://localhost:3001')).rejects.toThrow(factoryError);
      expect(mockEventHandler.onConnectionError).toHaveBeenCalledWith(factoryError);
    });

    it('should handle event handler failures gracefully', async () => {
      mockEventHandler.onConnected.mockRejectedValue(new Error('Handler failed'));

      // Should not prevent connection establishment
      await integration.connect('ws://localhost:3001');
      
      expect(integration.connection).toBe(mockWebSocket);
    });
  });
});