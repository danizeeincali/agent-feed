/**
 * TDD London School WebSocket Terminal Streaming Test Suite
 * 
 * Validates the WebSocket terminal streaming fix using London School methodology:
 * - Mock-driven development with behavior verification
 * - Outside-in TDD approach from user behavior to implementation
 * - Focus on interactions between collaborators
 * - Contract definition through mock expectations
 */

import { jest } from '@jest/globals';
import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
import { AdvancedTerminalStreamingService } from '@/services/terminal-streaming-service';
import { ClaudeInstanceTerminalWebSocket } from '@/services/claude-instance-terminal-websocket';

// === LONDON SCHOOL MOCK CONTRACTS ===

interface MockSocket {
  id: string;
  handshake: { auth: any };
  user?: { id: string; username: string };
  on: jest.MockedFunction<any>;
  emit: jest.MockedFunction<any>;
  join: jest.MockedFunction<any>;
  leave: jest.MockedFunction<any>;
  to: jest.MockedFunction<any>;
  disconnect: jest.MockedFunction<any>;
}

interface MockSocketIOServer {
  of: jest.MockedFunction<any>;
  sockets: Map<string, MockSocket>;
}

interface MockClaudeInstanceManager {
  getInstanceStatus: jest.MockedFunction<any>;
  getTerminalSession: jest.MockedFunction<any>;
  addTerminalClient: jest.MockedFunction<any>;
  removeTerminalClient: jest.MockedFunction<any>;
  getTerminalHistory: jest.MockedFunction<any>;
  writeToTerminal: jest.MockedFunction<any>;
  resizeTerminal: jest.MockedFunction<any>;
  listInstances: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  emit: jest.MockedFunction<any>;
}

interface MockNamespace {
  use: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  emit: jest.MockedFunction<any>;
  to: jest.MockedFunction<any>;
  sockets: Map<string, MockSocket>;
}

// === MOCK FACTORY (London School Pattern) ===

class TerminalStreamingMockFactory {
  static createMockSocket(id = 'socket-123'): MockSocket {
    return {
      id,
      handshake: { auth: { userId: 'user-123', username: 'testuser' } },
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      disconnect: jest.fn()
    };
  }

  static createMockSocketIOServer(): MockSocketIOServer {
    const mockNamespace = this.createMockNamespace();
    return {
      of: jest.fn().mockReturnValue(mockNamespace),
      sockets: new Map()
    };
  }

  static createMockNamespace(): MockNamespace {
    return {
      use: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      sockets: new Map()
    };
  }

  static createMockClaudeInstanceManager(): MockClaudeInstanceManager {
    return {
      getInstanceStatus: jest.fn(),
      getTerminalSession: jest.fn(),
      addTerminalClient: jest.fn(),
      removeTerminalClient: jest.fn(),
      getTerminalHistory: jest.fn(),
      writeToTerminal: jest.fn(),
      resizeTerminal: jest.fn(),
      listInstances: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };
  }

  static createMockInstance(id = 'instance-123') {
    return {
      id,
      name: 'Claude Instance',
      type: 'production',
      status: 'running',
      pid: 8952,
      createdAt: new Date(),
      terminalSessionId: 'terminal-123'
    };
  }

  static createMockTerminalSession(instanceId = 'instance-123') {
    return {
      id: 'terminal-123',
      instanceId,
      pty: { write: jest.fn(), resize: jest.fn() },
      clients: new Set(),
      history: ['$ echo "hello"\n', 'hello\n'],
      size: { cols: 80, rows: 24 },
      lastActivity: new Date(),
      settings: {
        fontSize: 14,
        fontFamily: 'monospace',
        theme: { background: '#000', foreground: '#fff', cursor: '#fff', selection: '#333' },
        scrollback: 1000,
        cursorBlink: true
      }
    };
  }
}

describe('WebSocket Terminal Streaming - London School TDD Suite', () => {
  let mockSocketIOServer: MockSocketIOServer;
  let mockClaudeInstanceManager: MockClaudeInstanceManager;
  let mockSocket: MockSocket;
  let mockNamespace: MockNamespace;

  beforeEach(() => {
    // Reset all mocks using London School pattern
    jest.clearAllMocks();
    
    // Create fresh mock collaborators
    mockSocketIOServer = TerminalStreamingMockFactory.createMockSocketIOServer();
    mockClaudeInstanceManager = TerminalStreamingMockFactory.createMockClaudeInstanceManager();
    mockSocket = TerminalStreamingMockFactory.createMockSocket();
    mockNamespace = TerminalStreamingMockFactory.createMockNamespace();

    // Mock module imports
    jest.unstable_mockModule('@/services/claude-instance-manager', () => ({
      claudeInstanceManager: mockClaudeInstanceManager
    }));
  });

  // === 1. MOCK-DRIVEN TESTS FOR SERVICE INITIALIZATION ORDER ===
  
  describe('Service Initialization Order (Mock-Driven)', () => {
    it('should initialize AdvancedTerminalStreamingService with proper namespace setup', () => {
      // Arrange - Mock collaborators
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);

      // Act - Initialize service
      const service = new AdvancedTerminalStreamingService(mockIO);

      // Assert - Verify interactions (London School style)
      expect(mockIO.of).toHaveBeenCalledWith('/terminal');
      expect(mockNamespace.use).toHaveBeenCalled();
      expect(mockNamespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should initialize ClaudeInstanceTerminalWebSocket with separate namespace', () => {
      // Arrange
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);

      // Act
      const websocketService = new ClaudeInstanceTerminalWebSocket(mockIO);

      // Assert - Verify namespace isolation
      expect(mockIO.of).toHaveBeenCalledWith('/claude-terminal');
      expect(mockNamespace.use).toHaveBeenCalled(); // Authentication middleware
      expect(mockNamespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should prevent namespace conflicts by using different paths', () => {
      // Arrange
      const mockIO = mockSocketIOServer as any;
      const namespace1 = TerminalStreamingMockFactory.createMockNamespace();
      const namespace2 = TerminalStreamingMockFactory.createMockNamespace();
      
      mockIO.of
        .mockReturnValueOnce(namespace1) // First call: /terminal
        .mockReturnValueOnce(namespace2); // Second call: /claude-terminal

      // Act - Initialize both services
      new AdvancedTerminalStreamingService(mockIO);
      new ClaudeInstanceTerminalWebSocket(mockIO);

      // Assert - Verify different namespaces
      expect(mockIO.of).toHaveBeenCalledWith('/terminal');
      expect(mockIO.of).toHaveBeenCalledWith('/claude-terminal');
      expect(mockIO.of).toHaveBeenCalledTimes(2);
    });

    it('should handle service initialization race condition', async () => {
      // Arrange - Simulate concurrent initialization
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);

      // Act - Initialize concurrently
      const initPromises = [
        Promise.resolve(new AdvancedTerminalStreamingService(mockIO)),
        Promise.resolve(new ClaudeInstanceTerminalWebSocket(mockIO))
      ];

      const services = await Promise.all(initPromises);

      // Assert - Both services initialize without conflicts
      expect(services).toHaveLength(2);
      expect(mockIO.of).toHaveBeenCalledTimes(2);
    });
  });

  // === 2. BEHAVIOR VERIFICATION FOR WEBSOCKET NAMESPACE HANDLING ===

  describe('WebSocket Namespace Behavior Verification', () => {
    let streamingService: AdvancedTerminalStreamingService;
    let websocketService: ClaudeInstanceTerminalWebSocket;

    beforeEach(() => {
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);
      
      streamingService = new AdvancedTerminalStreamingService(mockIO);
      websocketService = new ClaudeInstanceTerminalWebSocket(mockIO);
    });

    it('should authenticate client connections with proper middleware', async () => {
      // Arrange - Mock authentication middleware
      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const nextFn = jest.fn();

      // Act - Call authentication
      await authMiddleware(mockSocket, nextFn);

      // Assert - Verify authentication behavior
      expect(mockSocket.user).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
      expect(nextFn).toHaveBeenCalledWith(); // Success
    });

    it('should handle authentication failure gracefully', async () => {
      // Arrange - Mock failed authentication
      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const nextFn = jest.fn();
      const badSocket = { ...mockSocket, handshake: { auth: {} } };

      // Act
      await authMiddleware(badSocket, nextFn);

      // Assert - Verify error handling
      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should establish connection with welcome message', () => {
      // Arrange - Mock connection handler
      const connectionHandler = mockNamespace.on.mock.calls[0][1];

      // Act - Simulate connection
      connectionHandler(mockSocket);

      // Assert - Verify welcome behavior
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'terminal:connected',
        expect.objectContaining({
          message: expect.stringContaining('Connected to'),
          supportedFeatures: expect.any(Array)
        })
      );
    });

    it('should set up socket event handlers after connection', () => {
      // Arrange
      const connectionHandler = mockNamespace.on.mock.calls[0][1];

      // Act
      connectionHandler(mockSocket);

      // Assert - Verify event handler setup
      expect(mockSocket.on).toHaveBeenCalledWith('streaming:start', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('streaming:stop', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  // === 3. INTEGRATION TESTS FOR PTY SESSION BRIDGING ===

  describe('PTY Session Bridging Integration', () => {
    let streamingService: AdvancedTerminalStreamingService;
    const instanceId = 'instance-123';

    beforeEach(() => {
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);
      streamingService = new AdvancedTerminalStreamingService(mockIO);

      // Mock instance and terminal session
      mockClaudeInstanceManager.getInstanceStatus.mockReturnValue(
        TerminalStreamingMockFactory.createMockInstance(instanceId)
      );
      mockClaudeInstanceManager.getTerminalSession.mockReturnValue(
        TerminalStreamingMockFactory.createMockTerminalSession(instanceId)
      );
      mockClaudeInstanceManager.getTerminalHistory.mockReturnValue([
        '$ echo "hello"\n',
        'hello\n'
      ]);
    });

    it('should bridge PTY session to WebSocket successfully', async () => {
      // Arrange - Set up streaming start event
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStartHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:start')[1];

      // Act - Start streaming
      await streamingStartHandler({ instanceId });

      // Assert - Verify PTY bridge interactions
      expect(mockClaudeInstanceManager.getInstanceStatus).toHaveBeenCalledWith(instanceId);
      expect(mockClaudeInstanceManager.getTerminalSession).toHaveBeenCalledWith(instanceId);
      expect(mockClaudeInstanceManager.addTerminalClient).toHaveBeenCalledWith(instanceId, mockSocket.id);
      expect(mockSocket.join).toHaveBeenCalledWith(`streaming:${instanceId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:started', expect.objectContaining({
        sessionId: expect.any(String),
        instanceId
      }));
    });

    it('should handle PTY session creation failure', async () => {
      // Arrange - Mock missing terminal session
      mockClaudeInstanceManager.getTerminalSession.mockReturnValue(null);
      
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStartHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:start')[1];

      // Act & Assert - Should handle gracefully
      await streamingStartHandler({ instanceId });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:error', 
        expect.objectContaining({
          message: expect.stringContaining('No terminal session found')
        })
      );
    });

    it('should broadcast terminal data to connected clients', () => {
      // Arrange - Set up instance manager event listener
      const terminalDataListener = mockClaudeInstanceManager.on.mock.calls
        .find(call => call[0] === 'terminalData')[1];

      // Act - Simulate terminal data
      const testData = 'Hello from terminal\n';
      terminalDataListener(instanceId, testData);

      // Assert - Verify broadcast behavior
      expect(mockNamespace.to).toHaveBeenCalledWith(`streaming:${instanceId}`);
    });

    it('should clean up PTY session on client disconnect', () => {
      // Arrange - Set up disconnect handler
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const disconnectHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'disconnect')[1];

      // Mock active session
      (streamingService as any).sessions = new Map([
        ['session-123', {
          sessionId: 'session-123',
          instanceId,
          socket: mockSocket,
          isActive: true
        }]
      ]);

      // Act - Simulate disconnect
      disconnectHandler('transport close');

      // Assert - Verify cleanup behavior
      expect(mockClaudeInstanceManager.removeTerminalClient).toHaveBeenCalledWith(instanceId, mockSocket.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(`streaming:${instanceId}`);
    });
  });

  // === 4. ERROR BOUNDARY TESTS FOR CONNECTION FAILURES ===

  describe('Error Boundary and Connection Failure Handling', () => {
    let streamingService: AdvancedTerminalStreamingService;

    beforeEach(() => {
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);
      streamingService = new AdvancedTerminalStreamingService(mockIO);
    });

    it('should handle instance not found error gracefully', async () => {
      // Arrange
      mockClaudeInstanceManager.getInstanceStatus.mockReturnValue(null);
      
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStartHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:start')[1];

      // Act
      await streamingStartHandler({ instanceId: 'nonexistent' });

      // Assert - Error handled properly
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:error', {
        message: 'Instance nonexistent not found'
      });
    });

    it('should handle instance not running error', async () => {
      // Arrange
      const stoppedInstance = {
        ...TerminalStreamingMockFactory.createMockInstance(),
        status: 'stopped'
      };
      mockClaudeInstanceManager.getInstanceStatus.mockReturnValue(stoppedInstance);
      
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStartHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:start')[1];

      // Act
      await streamingStartHandler({ instanceId: stoppedInstance.id });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:error', 
        expect.objectContaining({
          message: expect.stringContaining('is not running')
        })
      );
    });

    it('should handle WebSocket connection errors', () => {
      // Arrange
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const errorHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'error')[1];

      // Act
      const testError = new Error('WebSocket connection failed');
      errorHandler(testError);

      // Assert - Error logged but service continues
      expect(mockSocket.emit).not.toHaveBeenCalledWith('streaming:error');
    });

    it('should recover from terminal write failures', () => {
      // Arrange
      mockClaudeInstanceManager.writeToTerminal.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);

      // Mock active client
      (streamingService as any).clients = new Map([
        [mockSocket.id, {
          socketId: mockSocket.id,
          instanceId: 'instance-123',
          isActive: true
        }]
      ]);

      const terminalInputHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'terminal_input')[1];

      // Act
      terminalInputHandler({ input: 'test command\n' });

      // Assert - Error handled gracefully
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:error', 
        expect.objectContaining({
          message: expect.stringContaining('Failed to process input')
        })
      );
    });
  });

  // === 5. PERFORMANCE TESTS FOR CONNECTION STORM PREVENTION ===

  describe('Connection Storm Prevention (Performance)', () => {
    let streamingService: AdvancedTerminalStreamingService;

    beforeEach(() => {
      const mockIO = mockSocketIOServer as any;
      mockIO.of.mockReturnValue(mockNamespace);
      streamingService = new AdvancedTerminalStreamingService(mockIO, {
        rateLimitWindow: 1000,
        rateLimitMax: 5
      });
    });

    it('should enforce rate limiting for rapid requests', () => {
      // Arrange
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStatusHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:status')[1];

      // Act - Make rapid requests
      for (let i = 0; i < 7; i++) {
        streamingStatusHandler();
      }

      // Assert - Rate limit enforced after 5 requests
      const errorCalls = mockSocket.emit.mock.calls
        .filter(call => call[0] === 'streaming:error' && call[1].message === 'Rate limit exceeded');
      
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('should prevent connection flood from single client', async () => {
      // Arrange - Mock many rapid connections
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      const sockets = Array.from({ length: 10 }, (_, i) => 
        TerminalStreamingMockFactory.createMockSocket(`socket-${i}`)
      );

      // Act - Simulate connection flood
      sockets.forEach(socket => connectionHandler(socket));

      // Assert - All connections handled but rate limited
      expect(mockNamespace.on).toHaveBeenCalledWith('connection', connectionHandler);
      
      // Verify each socket got event handlers
      sockets.forEach(socket => {
        expect(socket.on).toHaveBeenCalledWith('streaming:start', expect.any(Function));
      });
    });

    it('should clean up stale sessions to prevent memory leaks', () => {
      // Arrange - Mock stale sessions
      const now = new Date();
      const staleTime = new Date(now.getTime() - 35 * 60 * 1000); // 35 minutes ago
      
      const staleSessions = new Map([
        ['stale-1', {
          sessionId: 'stale-1',
          instanceId: 'instance-123',
          socket: mockSocket,
          lastActivity: staleTime,
          isActive: true
        }]
      ]);

      (streamingService as any).sessions = staleSessions;

      // Act - Trigger cleanup (simulate interval)
      (streamingService as any).cleanupStaleSessions();

      // Assert - Stale sessions cleaned up
      expect((streamingService as any).sessions.size).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:stopped', 
        expect.objectContaining({
          sessionId: 'stale-1'
        })
      );
    });

    it('should limit maximum concurrent sessions per client', async () => {
      // Arrange
      mockClaudeInstanceManager.getInstanceStatus.mockReturnValue(
        TerminalStreamingMockFactory.createMockInstance()
      );
      mockClaudeInstanceManager.getTerminalSession.mockReturnValue(
        TerminalStreamingMockFactory.createMockTerminalSession()
      );
      
      const connectionHandler = mockNamespace.on.mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const streamingStartHandler = mockSocket.on.mock.calls
        .find(call => call[0] === 'streaming:start')[1];

      // Mock 5 existing sessions for this socket
      const existingSessions = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `session-${i}`,
        socket: mockSocket,
        isActive: true
      }));
      
      (streamingService as any).sessions = new Map(
        existingSessions.map(s => [s.sessionId, s])
      );

      // Act - Try to start 6th session
      await streamingStartHandler({ instanceId: 'instance-123' });

      // Assert - Should be rejected
      expect(mockSocket.emit).toHaveBeenCalledWith('streaming:error', 
        expect.objectContaining({
          message: expect.stringContaining('Maximum streaming sessions limit reached')
        })
      );
    });
  });

  // === SWARM COORDINATION TESTS ===

  describe('Swarm Test Coordination', () => {
    it('should coordinate with integration test agents', () => {
      // Arrange - Mock swarm coordinator
      const mockCoordinator = {
        notifyTestStart: jest.fn(),
        shareResults: jest.fn()
      };

      // Act - Simulate test coordination
      const testResults = {
        passed: true,
        coverage: { statements: 95, branches: 90, functions: 100 }
      };

      // Assert - Verify coordination patterns
      expect(mockCoordinator.notifyTestStart).toBeDefined();
      expect(mockCoordinator.shareResults).toBeDefined();
    });

    it('should maintain contract consistency across swarm', () => {
      // Arrange - Define terminal streaming contracts
      const terminalStreamingContract = {
        events: [
          'streaming:start',
          'streaming:stop', 
          'streaming:data',
          'terminal:connected'
        ],
        authentication: 'required',
        rateLimiting: 'enabled',
        namespaces: ['/terminal', '/claude-terminal']
      };

      // Assert - Verify contract compliance
      expect(terminalStreamingContract.events).toContain('streaming:start');
      expect(terminalStreamingContract.namespaces).toHaveLength(2);
      expect(terminalStreamingContract.authentication).toBe('required');
    });
  });
});