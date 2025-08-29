/**
 * TDD London School: WebSocket Singleton Pattern Tests
 * Focus: Mock-driven testing of WebSocket behavior and interactions
 */

describe('WebSocket Singleton Pattern', () => {
  let mockWebSocket;
  let mockWebSocketConstructor;
  let websocketManager;
  let originalWebSocket;

  beforeEach(() => {
    // Mock WebSocket constructor and instance
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1, // WebSocket.OPEN
      url: 'ws://localhost:3001'
    };

    mockWebSocketConstructor = jest.fn().mockReturnValue(mockWebSocket);
    
    // Store original and replace with mock
    originalWebSocket = global.WebSocket;
    global.WebSocket = mockWebSocketConstructor;

    // Reset singleton instance before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
  });

  describe('Singleton Instance Management', () => {
    it('should create only one WebSocket instance', () => {
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      
      const instance1 = WebSocketManager.getInstance();
      const instance2 = WebSocketManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing connection when already open', () => {
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      
      const manager = WebSocketManager.getInstance();
      manager.connect();
      manager.connect(); // Second call should not create new connection
      
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
      expect(mockWebSocket.close).not.toHaveBeenCalled();
    });

    it('should create new connection when previous was closed', () => {
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      
      const manager = WebSocketManager.getInstance();
      manager.connect();
      
      // Simulate connection closing
      mockWebSocket.readyState = 3; // WebSocket.CLOSED
      
      manager.connect();
      
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection State Management', () => {
    it('should verify connection state before sending messages', () => {
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      
      const manager = WebSocketManager.getInstance();
      mockWebSocket.readyState = 0; // WebSocket.CONNECTING
      
      const result = manager.send('test message');
      
      expect(result).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle connection failures gracefully', () => {
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockWebSocketConstructor.mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      const manager = WebSocketManager.getInstance();
      const result = manager.connect();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection failed')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Swarm Coordination', () => {
    it('should coordinate with swarm memory manager for connection state', () => {
      const mockSwarmMemory = {
        store: jest.fn(),
        retrieve: jest.fn().mockResolvedValue(null)
      };
      
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      const manager = WebSocketManager.getInstance();
      manager.setSwarmMemory(mockSwarmMemory);
      
      manager.connect();
      
      expect(mockSwarmMemory.store).toHaveBeenCalledWith(
        'websocket/connection-state',
        expect.objectContaining({
          state: 'connected',
          url: 'ws://localhost:3001'
        })
      );
    });

    it('should notify swarm agents of connection events', () => {
      const mockSwarmCoordinator = {
        notifyAgents: jest.fn()
      };
      
      const WebSocketManager = require('../../../../src/websocket/WebSocketManager');
      const manager = WebSocketManager.getInstance();
      manager.setSwarmCoordinator(mockSwarmCoordinator);
      
      // Simulate connection open event
      const openHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'open')[1];
      
      openHandler();
      
      expect(mockSwarmCoordinator.notifyAgents).toHaveBeenCalledWith({
        event: 'websocket-connected',
        timestamp: expect.any(Number)
      });
    });
  });
});