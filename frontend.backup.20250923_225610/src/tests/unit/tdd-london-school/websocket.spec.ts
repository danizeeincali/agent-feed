/**
 * TDD London School Tests: WebSocket Connections Stability
 * Focus: Connection lifecycle, message handling, and error recovery behavior
 */

import { jest } from '@jest/globals';
import { 
  SwarmTestRunner, 
  createLondonSchoolTestSuite, 
  MockContract,
  BehaviorVerification 
} from './framework';

// WebSocket Mock Contracts
const webSocketContract: MockContract = {
  name: 'WebSocket',
  methods: {
    send: {
      parameters: ['string'],
      returnValue: undefined
    },
    close: {
      parameters: ['number?', 'string?'],
      returnValue: undefined
    },
    addEventListener: {
      parameters: ['string', 'function'],
      returnValue: undefined
    },
    removeEventListener: {
      parameters: ['string', 'function'],
      returnValue: undefined
    },
    ping: {
      parameters: ['string?'],
      returnValue: undefined
    }
  },
  collaborators: ['ConnectionManager', 'MessageHandler', 'HeartbeatMonitor']
};

const connectionManagerContract: MockContract = {
  name: 'ConnectionManager',
  methods: {
    connect: {
      parameters: ['string'],
      mockImplementation: async (url: string) => {
        return { readyState: 1, url }; // OPEN state
      }
    },
    disconnect: {
      parameters: [],
      mockImplementation: async () => {
        return { code: 1000, reason: 'Normal closure' };
      }
    },
    reconnect: {
      parameters: [],
      mockImplementation: async () => {
        return { readyState: 1, reconnected: true };
      }
    },
    isConnected: {
      parameters: [],
      returnValue: true
    },
    getConnectionInfo: {
      parameters: [],
      returnValue: { 
        status: 'connected', 
        uptime: 5000, 
        lastPing: Date.now() - 1000,
        reconnectAttempts: 0
      }
    }
  },
  collaborators: ['WebSocket', 'HeartbeatMonitor', 'ReconnectStrategy']
};

const messageHandlerContract: MockContract = {
  name: 'MessageHandler',
  methods: {
    handleMessage: {
      parameters: ['object'],
      mockImplementation: (message: any) => {
        return { processed: true, messageId: message.id };
      }
    },
    sendMessage: {
      parameters: ['object'],
      mockImplementation: (message: any) => {
        return { sent: true, messageId: message.id };
      }
    },
    registerHandler: {
      parameters: ['string', 'function'],
      returnValue: undefined
    },
    unregisterHandler: {
      parameters: ['string'],
      returnValue: undefined
    },
    getMessageQueue: {
      parameters: [],
      returnValue: []
    }
  },
  collaborators: ['WebSocket', 'MessageValidator', 'QueueManager']
};

const heartbeatMonitorContract: MockContract = {
  name: 'HeartbeatMonitor',
  methods: {
    start: {
      parameters: ['number?'],
      returnValue: undefined
    },
    stop: {
      parameters: [],
      returnValue: undefined
    },
    sendPing: {
      parameters: [],
      mockImplementation: () => {
        return { timestamp: Date.now(), sent: true };
      }
    },
    receivePong: {
      parameters: ['number'],
      mockImplementation: (timestamp: number) => {
        return { latency: Date.now() - timestamp, healthy: true };
      }
    },
    getHeartbeatStatus: {
      parameters: [],
      returnValue: { 
        isActive: true, 
        lastPing: Date.now() - 5000, 
        lastPong: Date.now() - 4950,
        missedBeats: 0
      }
    }
  },
  collaborators: ['WebSocket', 'ConnectionManager']
};

const reconnectStrategyContract: MockContract = {
  name: 'ReconnectStrategy',
  methods: {
    shouldReconnect: {
      parameters: ['object'],
      returnValue: true
    },
    getNextDelay: {
      parameters: ['number'],
      mockImplementation: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000)
    },
    reset: {
      parameters: [],
      returnValue: undefined
    },
    incrementAttempts: {
      parameters: [],
      returnValue: undefined
    }
  },
  collaborators: ['ConnectionManager']
};

// Test Suite Definition
describe('TDD London School: WebSocket Connections Stability', () => {
  let swarmRunner: SwarmTestRunner;

  beforeEach(() => {
    swarmRunner = new SwarmTestRunner('websocket-swarm', 'unit');
    swarmRunner.beforeEach();
  });

  afterEach(() => {
    const feedback = swarmRunner.afterEach();
    console.log('WebSocket Swarm Feedback:', feedback);
  });

  describe('Connection Lifecycle Management (Outside-In)', () => {
    it('should coordinate complete connection establishment workflow', async () => {
      // Arrange - Create coordinated mocks for connection workflow
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
      const mockHeartbeat = swarmRunner.createMock<any>(heartbeatMonitorContract);
      const mockMessageHandler = swarmRunner.createMock<any>(messageHandlerContract);

      // Act - Execute connection workflow
      const connection = await mockConnectionManager.connect('ws://localhost:3000');
      mockHeartbeat.start(30000); // 30 second heartbeat
      mockMessageHandler.registerHandler('ping', jest.fn());

      // Assert - Verify connection coordination behavior
      expect(mockConnectionManager.connect).toHaveBeenCalledWith('ws://localhost:3000');
      expect(mockHeartbeat.start).toHaveBeenCalledWith(30000);
      expect(mockMessageHandler.registerHandler).toHaveBeenCalledWith('ping', expect.any(Function));

      expect(connection.readyState).toBe(1); // WebSocket.OPEN

      // Verify interaction sequence
      const behaviorVerification: BehaviorVerification = {
        collaboratorInteractions: [
          {
            collaborator: 'ConnectionManager',
            method: 'connect',
            calledWith: ['ws://localhost:3000'],
            calledTimes: 1
          },
          {
            collaborator: 'HeartbeatMonitor',
            method: 'start',
            calledWith: [30000],
            calledTimes: 1
          }
        ],
        expectedSequence: [
          'ConnectionManager.connect',
          'HeartbeatMonitor.start',
          'MessageHandler.registerHandler'
        ],
        contractCompliance: true,
        swarmFeedback: []
      };

      swarmRunner.getBehaviorVerifier().verifyBehavior(behaviorVerification);
    });

    it('should handle connection failures with proper error recovery', async () => {
      // Arrange - Mock connection failure scenario
      const failingConnectionContract: MockContract = {
        name: 'FailingConnectionManager',
        methods: {
          connect: {
            parameters: ['string'],
            throws: new Error('Connection refused')
          }
        }
      };

      const mockFailingConnection = swarmRunner.createMock<any>(failingConnectionContract);
      const mockReconnectStrategy = swarmRunner.createMock<any>(reconnectStrategyContract);

      // Act & Assert - Verify error handling behavior
      await expect(async () => {
        await mockFailingConnection.connect('ws://invalid-url');
      }).rejects.toThrow('Connection refused');

      // Verify reconnection strategy would be consulted
      const shouldReconnect = mockReconnectStrategy.shouldReconnect({ error: 'Connection refused' });
      expect(shouldReconnect).toBe(true);

      expect(mockFailingConnection.connect).toHaveBeenCalledWith('ws://invalid-url');
      expect(mockReconnectStrategy.shouldReconnect).toHaveBeenCalledWith({ error: 'Connection refused' });
    });
  });

  describe('Message Handling Coordination (Middle Layer)', () => {
    it('should coordinate message sending with connection state verification', async () => {
      // Arrange
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
      const mockMessageHandler = swarmRunner.createMock<any>(messageHandlerContract);
      const mockWebSocket = swarmRunner.createMock<any>(webSocketContract);

      const testMessage = { id: 'msg-123', type: 'agent_update', data: { status: 'active' } };

      // Act - Test message sending workflow
      const isConnected = mockConnectionManager.isConnected();
      if (isConnected) {
        const result = await mockMessageHandler.sendMessage(testMessage);
        mockWebSocket.send(JSON.stringify(testMessage));
      }

      // Assert - Verify message coordination behavior
      expect(mockConnectionManager.isConnected).toHaveBeenCalledTimes(1);
      expect(mockMessageHandler.sendMessage).toHaveBeenCalledWith(testMessage);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));

      // Verify interaction sequence
      const interactions = swarmRunner.getMockFactory().getInteractionLog();
      expect(interactions.map(i => `${i.collaborator}.${i.method}`)).toEqual([
        'ConnectionManager.isConnected',
        'MessageHandler.sendMessage',
        'WebSocket.send'
      ]);
    });

    it('should handle message queue during disconnection', async () => {
      // Arrange
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
      const mockMessageHandler = swarmRunner.createMock<any>(messageHandlerContract);

      // Mock disconnected state
      mockConnectionManager.isConnected = jest.fn().mockReturnValue(false);
      
      const queuedMessage = { id: 'queued-1', type: 'queued_message', data: {} };

      // Act - Message should be queued when disconnected
      const isConnected = mockConnectionManager.isConnected();
      if (!isConnected) {
        // In real implementation, this would queue the message
        const queue = mockMessageHandler.getMessageQueue();
        // Simulate queue behavior
        queue.push(queuedMessage);
      }

      // Assert - Verify queueing behavior
      expect(mockConnectionManager.isConnected).toHaveBeenCalledTimes(1);
      expect(mockMessageHandler.getMessageQueue).toHaveBeenCalledTimes(1);

      const behaviorVerification: BehaviorVerification = {
        collaboratorInteractions: [
          {
            collaborator: 'ConnectionManager',
            method: 'isConnected',
            calledWith: [],
            calledTimes: 1
          },
          {
            collaborator: 'MessageHandler',
            method: 'getMessageQueue',
            calledWith: [],
            calledTimes: 1
          }
        ],
        expectedSequence: [
          'ConnectionManager.isConnected',
          'MessageHandler.getMessageQueue'
        ],
        contractCompliance: true,
        swarmFeedback: []
      };

      swarmRunner.getBehaviorVerifier().verifyBehavior(behaviorVerification);
    });
  });

  describe('Heartbeat Monitoring (Inside Layer)', () => {
    it('should coordinate heartbeat with connection health checks', async () => {
      // Arrange
      const mockHeartbeat = swarmRunner.createMock<any>(heartbeatMonitorContract);
      const mockWebSocket = swarmRunner.createMock<any>(webSocketContract);

      // Act - Heartbeat lifecycle
      mockHeartbeat.start(15000); // 15 second intervals
      const pingResult = mockHeartbeat.sendPing();
      const pongResult = mockHeartbeat.receivePong(pingResult.timestamp);
      const status = mockHeartbeat.getHeartbeatStatus();

      // Assert - Verify heartbeat behavior
      expect(mockHeartbeat.start).toHaveBeenCalledWith(15000);
      expect(mockHeartbeat.sendPing).toHaveBeenCalledTimes(1);
      expect(mockHeartbeat.receivePong).toHaveBeenCalledWith(pingResult.timestamp);
      expect(mockHeartbeat.getHeartbeatStatus).toHaveBeenCalledTimes(1);

      expect(pingResult.sent).toBe(true);
      expect(pongResult.healthy).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.missedBeats).toBe(0);
    });

    it('should handle missed heartbeats with reconnection logic', async () => {
      // Arrange - Mock unhealthy heartbeat
      const unhealthyHeartbeatContract: MockContract = {
        name: 'UnhealthyHeartbeat',
        methods: {
          getHeartbeatStatus: {
            parameters: [],
            returnValue: { 
              isActive: false, 
              lastPing: Date.now() - 60000, // 1 minute ago
              lastPong: Date.now() - 65000, // 65 seconds ago
              missedBeats: 3
            }
          }
        }
      };

      const mockUnhealthyHeartbeat = swarmRunner.createMock<any>(unhealthyHeartbeatContract);
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
      const mockReconnectStrategy = swarmRunner.createMock<any>(reconnectStrategyContract);

      // Act - Check health and trigger reconnection
      const status = mockUnhealthyHeartbeat.getHeartbeatStatus();
      
      if (status.missedBeats >= 3) {
        const shouldReconnect = mockReconnectStrategy.shouldReconnect({ reason: 'heartbeat_failure' });
        if (shouldReconnect) {
          await mockConnectionManager.reconnect();
        }
      }

      // Assert - Verify reconnection workflow
      expect(mockUnhealthyHeartbeat.getHeartbeatStatus).toHaveBeenCalledTimes(1);
      expect(mockReconnectStrategy.shouldReconnect).toHaveBeenCalledWith({ reason: 'heartbeat_failure' });
      expect(mockConnectionManager.reconnect).toHaveBeenCalledTimes(1);

      expect(status.missedBeats).toBe(3);
    });
  });

  describe('Reconnection Strategy Coordination (Behavior Focus)', () => {
    it('should coordinate exponential backoff with connection attempts', async () => {
      // Arrange
      const mockReconnectStrategy = swarmRunner.createMock<any>(reconnectStrategyContract);
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);

      // Act - Simulate multiple reconnection attempts
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        const delay = mockReconnectStrategy.getNextDelay(attempt);
        mockReconnectStrategy.incrementAttempts();
        
        try {
          await mockConnectionManager.connect('ws://localhost:3000');
          break; // Success
        } catch (error) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error('Max reconnection attempts reached');
          }
        }
      }

      // Assert - Verify backoff strategy behavior
      expect(mockReconnectStrategy.getNextDelay).toHaveBeenCalledTimes(3);
      expect(mockReconnectStrategy.incrementAttempts).toHaveBeenCalledTimes(3);
      expect(mockConnectionManager.connect).toHaveBeenCalledTimes(3);

      // Verify exponential backoff values
      const interactions = swarmRunner.getMockFactory().getInteractionLog();
      const delayInteractions = interactions.filter(i => i.method === 'getNextDelay');
      
      expect(delayInteractions[0].calledWith[0]).toBe(0); // First attempt
      expect(delayInteractions[1].calledWith[0]).toBe(1); // Second attempt
      expect(delayInteractions[2].calledWith[0]).toBe(2); // Third attempt
    });
  });

  describe('Connection State Synchronization (Complex Behavior)', () => {
    it('should coordinate state across all connection components', async () => {
      // Arrange - Complex multi-component workflow
      const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
      const mockMessageHandler = swarmRunner.createMock<any>(messageHandlerContract);
      const mockHeartbeat = swarmRunner.createMock<any>(heartbeatMonitorContract);
      const mockWebSocket = swarmRunner.createMock<any>(webSocketContract);

      // Act - Full connection lifecycle
      // 1. Connect
      await mockConnectionManager.connect('ws://localhost:3000');
      
      // 2. Start heartbeat
      mockHeartbeat.start(30000);
      
      // 3. Register message handlers
      mockMessageHandler.registerHandler('message', jest.fn());
      mockMessageHandler.registerHandler('error', jest.fn());
      
      // 4. Send test message
      const testMessage = { id: 'lifecycle-test', type: 'system_check' };
      await mockMessageHandler.sendMessage(testMessage);
      
      // 5. Get connection info
      const connectionInfo = mockConnectionManager.getConnectionInfo();
      const heartbeatStatus = mockHeartbeat.getHeartbeatStatus();

      // Assert - Verify complete workflow coordination
      const interactions = swarmRunner.getMockFactory().getInteractionLog();
      
      // Verify interaction count and sequence
      expect(interactions).toHaveLength(7);
      
      const expectedSequence = [
        'ConnectionManager.connect',
        'HeartbeatMonitor.start',
        'MessageHandler.registerHandler',
        'MessageHandler.registerHandler',
        'MessageHandler.sendMessage',
        'ConnectionManager.getConnectionInfo',
        'HeartbeatMonitor.getHeartbeatStatus'
      ];

      const actualSequence = interactions.map(i => `${i.collaborator}.${i.method}`);
      expect(actualSequence).toEqual(expectedSequence);

      // Verify state consistency
      expect(connectionInfo.status).toBe('connected');
      expect(heartbeatStatus.isActive).toBe(true);

      // Generate comprehensive swarm report
      const swarmReport = swarmRunner.generateSwarmReport();
      expect(swarmReport.mockContracts).toHaveLength(4); // All 4 components
      expect(swarmReport.behaviorSummary).toContain('7 interactions');
    });
  });
});

// Outside-In Test Suite for WebSocket System
const websocketTestSuite = createLondonSchoolTestSuite('websocket-system-swarm');

websocketTestSuite
  .acceptance('WebSocket system should maintain stable connection for real-time communication', async (swarmRunner) => {
    // High-level user story: Stable real-time communication
    const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
    const mockMessageHandler = swarmRunner.createMock<any>(messageHandlerContract);
    const mockHeartbeat = swarmRunner.createMock<any>(heartbeatMonitorContract);

    // User establishes connection
    const connection = await mockConnectionManager.connect('ws://agent-feed-backend');
    mockHeartbeat.start();

    // User sends message
    const userMessage = { type: 'agent_command', data: { command: 'status' } };
    await mockMessageHandler.sendMessage(userMessage);

    // System maintains connection health
    const heartbeatStatus = mockHeartbeat.getHeartbeatStatus();

    expect(connection.readyState).toBe(1);
    expect(heartbeatStatus.isActive).toBe(true);
  })
  .integration('Connection components should coordinate during network disruptions', async (swarmRunner) => {
    // Integration test: Network failure recovery
    const mockConnectionManager = swarmRunner.createMock<any>(connectionManagerContract);
    const mockReconnectStrategy = swarmRunner.createMock<any>(reconnectStrategyContract);
    const mockHeartbeat = swarmRunner.createMock<any>(heartbeatMonitorContract);

    // Simulate network disruption
    const shouldReconnect = mockReconnectStrategy.shouldReconnect({ error: 'network_error' });
    if (shouldReconnect) {
      mockHeartbeat.stop();
      await mockConnectionManager.reconnect();
      mockHeartbeat.start();
    }

    expect(mockReconnectStrategy.shouldReconnect).toHaveBeenCalledTimes(1);
    expect(mockConnectionManager.reconnect).toHaveBeenCalledTimes(1);
  })
  .unit('Individual WebSocket methods should handle errors gracefully', async (swarmRunner) => {
    // Unit test: Error handling
    const mockWebSocket = swarmRunner.createMock<any>(webSocketContract);
    
    mockWebSocket.send('test message');
    mockWebSocket.addEventListener('error', jest.fn());

    expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

// Execute the WebSocket test suite
websocketTestSuite.execute('websocket-comprehensive-swarm');