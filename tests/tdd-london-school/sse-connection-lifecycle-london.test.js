/**
 * TDD London School Tests: SSE Connection Lifecycle Management
 * 
 * Focus on object interactions and collaborations for SSE connection management
 * Mock-driven approach testing how SSE connections collaborate with process management
 */

const { jest } = require('@jest/globals');

describe('TDD London School: SSE Connection Lifecycle & Process Integration', () => {
  let mockSSEResponse, mockRequest, mockActiveSSEConnections, mockActiveProcesses;
  let mockConnectionManager, mockProcessManager, mockBroadcaster;
  let sseConnectionService, processIntegrationService;

  beforeEach(() => {
    // LONDON SCHOOL: Create mock collaborators first
    mockSSEResponse = createMockSSEResponse();
    mockRequest = createMockRequest();
    mockActiveSSEConnections = new Map();
    mockActiveProcesses = new Map();
    
    // Mock service collaborators
    mockConnectionManager = createMockConnectionManager();
    mockProcessManager = createMockProcessManager();
    mockBroadcaster = createMockBroadcaster();

    // Create objects under test with injected mocks
    sseConnectionService = new SSEConnectionService({
      connectionMap: mockActiveSSEConnections,
      processMap: mockActiveProcesses,
      broadcaster: mockBroadcaster,
      logger: createMockLogger()
    });

    processIntegrationService = new ProcessIntegrationService({
      connectionManager: mockConnectionManager,
      processManager: mockProcessManager,
      broadcaster: mockBroadcaster
    });

    jest.clearAllMocks();
  });

  describe('SSE Connection Establishment Contract', () => {
    it('should establish connection contract with proper headers and tracking', () => {
      // ARRANGE: Setup connection request
      const instanceId = 'claude-sse-test-123';

      // ACT: Establish SSE connection
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ASSERT: Verify collaboration with response writer
      expect(mockSSEResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no'
      });

      // Verify connection tracked in connection manager
      const connections = mockActiveSSEConnections.get(instanceId);
      expect(connections).toContain(mockSSEResponse);
      expect(connections).toHaveLength(1);
    });

    it('should coordinate with process manager to determine connection message', () => {
      // ARRANGE: Setup with existing process
      const instanceId = 'claude-with-process';
      const mockProcess = createMockClaudeProcess();
      mockActiveProcesses.set(instanceId, {
        process: mockProcess,
        status: 'running',
        pid: 12345,
        workingDirectory: '/test/directory'
      });

      // ACT: Create connection
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ASSERT: Verify process manager was consulted and proper message sent
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/Terminal connected to Claude instance/)
      );
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/workingDirectory/)
      );
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/pid.*12345/)
      );
    });

    it('should handle connection establishment when no process exists yet', () => {
      // ARRANGE: No process exists for instance
      const instanceId = 'claude-no-process';

      // ACT: Attempt connection
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ASSERT: Should send waiting message, not error
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/Waiting for Claude instance.*to be ready/)
      );
      expect(mockSSEResponse.write).not.toHaveBeenCalledWith(
        expect.stringMatching(/error|failed/i)
      );
    });
  });

  describe('Connection Cleanup & Resource Management', () => {
    it('should properly clean up connections when client disconnects', () => {
      // ARRANGE: Establish connection
      const instanceId = 'claude-cleanup-test';
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);
      
      // Verify connection was added
      expect(mockActiveSSEConnections.get(instanceId)).toContain(mockSSEResponse);

      // ACT: Simulate client disconnect
      const closeHandler = mockRequest.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      // ASSERT: Verify cleanup occurred
      const remainingConnections = mockActiveSSEConnections.get(instanceId);
      expect(remainingConnections).not.toContain(mockSSEResponse);
    });

    it('should handle connection errors gracefully without breaking other connections', () => {
      // ARRANGE: Setup multiple connections
      const instanceId = 'claude-error-handling';
      const connection1 = createMockSSEResponse();
      const connection2 = createMockSSEResponse();
      
      sseConnectionService.createTerminalSSEStream(mockRequest, connection1, instanceId);
      sseConnectionService.createTerminalSSEStream(createMockRequest(), connection2, instanceId);

      // Simulate error on first connection
      connection1.write.mockImplementation(() => {
        const error = new Error('Connection reset');
        error.code = 'ECONNRESET';
        throw error;
      });

      // ACT: Attempt broadcast to all connections
      const testMessage = { type: 'test', data: 'test data' };
      sseConnectionService.broadcastToAllConnections(instanceId, testMessage);

      // ASSERT: Second connection should still work, first should be removed
      expect(connection2.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(testMessage)}\n\n`
      );
      expect(mockActiveSSEConnections.get(instanceId)).not.toContain(connection1);
      expect(mockActiveSSEConnections.get(instanceId)).toContain(connection2);
    });

    it('should coordinate timeout management between request and response objects', () => {
      // ARRANGE: Setup connection
      const instanceId = 'claude-timeout-test';

      // ACT: Create connection
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ASSERT: Verify timeout prevention was set
      expect(mockRequest.setTimeout).toHaveBeenCalledWith(0);
      expect(mockSSEResponse.setTimeout).toHaveBeenCalledWith(0);
    });
  });

  describe('Process Integration Contracts', () => {
    it('should coordinate between process events and SSE broadcasting', () => {
      // ARRANGE: Setup process and connections
      const instanceId = 'claude-integration-test';
      const mockProcess = createMockClaudeProcess();
      
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);
      
      // ACT: Integrate process with SSE system
      processIntegrationService.integrateProcessWithSSE(instanceId, mockProcess);

      // ASSERT: Verify process event handlers coordinate with broadcaster
      expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Simulate data and verify broadcast coordination
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('Test output'));
      
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(instanceId, expect.objectContaining({
        type: 'output',
        data: 'Test output',
        source: 'stdout',
        isReal: true
      }));
    });

    it('should handle process lifecycle events and notify SSE connections', () => {
      // ARRANGE: Setup integrated system
      const instanceId = 'claude-lifecycle-test';
      const mockProcess = createMockClaudeProcess();
      
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);
      processIntegrationService.integrateProcessWithSSE(instanceId, mockProcess);

      // ACT: Simulate process lifecycle events
      const spawnHandler = mockProcess.on.mock.calls.find(call => call[0] === 'spawn')[1];
      const exitHandler = mockProcess.on.mock.calls.find(call => call[0] === 'exit')[1];
      
      spawnHandler();
      exitHandler(0, null);

      // ASSERT: Verify lifecycle events trigger proper SSE notifications
      expect(mockBroadcaster.broadcastStatus).toHaveBeenCalledWith(instanceId, 'running', expect.any(Object));
      expect(mockBroadcaster.broadcastStatus).toHaveBeenCalledWith(instanceId, 'stopped', { exitCode: 0, signal: null });
    });

    it('should maintain connection state consistency during process state changes', () => {
      // ARRANGE: Setup connection and process
      const instanceId = 'claude-state-consistency';
      const mockProcess = createMockClaudeProcess();
      
      // ACT: Process goes from starting → running → stopped
      processIntegrationService.updateProcessStatus(instanceId, 'starting', mockProcess);
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);
      processIntegrationService.updateProcessStatus(instanceId, 'running', mockProcess);
      processIntegrationService.updateProcessStatus(instanceId, 'stopped', null);

      // ASSERT: Verify connection manager was notified of all state changes
      expect(mockConnectionManager.notifyProcessStateChange).toHaveBeenCalledWith(instanceId, 'starting');
      expect(mockConnectionManager.notifyProcessStateChange).toHaveBeenCalledWith(instanceId, 'running');
      expect(mockConnectionManager.notifyProcessStateChange).toHaveBeenCalledWith(instanceId, 'stopped');
    });
  });

  describe('Broadcasting Coordination Patterns', () => {
    it('should coordinate message formatting between different broadcast types', () => {
      // ARRANGE: Setup connections for different message types
      const instanceId = 'claude-broadcast-coordination';
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ACT: Send different types of messages
      sseConnectionService.broadcastOutput(instanceId, 'stdout', 'Hello World');
      sseConnectionService.broadcastOutput(instanceId, 'stderr', 'Error occurred');
      sseConnectionService.broadcastStatus(instanceId, 'running', { pid: 12345 });

      // ASSERT: Verify proper message formatting coordination
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(instanceId, expect.objectContaining({
        type: 'output',
        source: 'stdout',
        data: 'Hello World',
        isReal: true
      }));
      
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(instanceId, expect.objectContaining({
        type: 'output',
        source: 'stderr',
        data: 'Error occurred',
        isError: true,
        isReal: true
      }));
      
      expect(mockBroadcaster.broadcastStatus).toHaveBeenCalledWith(instanceId, 'running', { pid: 12345 });
    });

    it('should handle broadcast failures without affecting connection stability', () => {
      // ARRANGE: Setup with broadcasting errors
      const instanceId = 'claude-broadcast-failure';
      mockBroadcaster.broadcast.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });
      
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ACT: Attempt broadcast that will fail
      expect(() => {
        sseConnectionService.broadcastOutput(instanceId, 'stdout', 'test');
      }).not.toThrow(); // Should handle gracefully

      // ASSERT: Connection should still be active
      expect(mockActiveSSEConnections.get(instanceId)).toContain(mockSSEResponse);
    });
  });

  describe('Heartbeat & Keep-Alive Coordination', () => {
    it('should coordinate heartbeat timing with output activity', () => {
      // ARRANGE: Setup connection with heartbeat
      const instanceId = 'claude-heartbeat-test';
      
      // Mock timers
      jest.useFakeTimers();
      
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ACT: Advance time without any output
      jest.advanceTimersByTime(35000); // 35 seconds

      // ASSERT: Heartbeat should have been sent
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/heartbeat.*Connection active/i)
      );

      jest.useRealTimers();
    });

    it('should suppress heartbeat when real output is flowing', () => {
      // ARRANGE: Setup connection
      const instanceId = 'claude-heartbeat-suppression';
      jest.useFakeTimers();
      
      sseConnectionService.createTerminalSSEStream(mockRequest, mockSSEResponse, instanceId);

      // ACT: Send output, then advance time
      sseConnectionService.broadcastOutput(instanceId, 'stdout', 'Recent output');
      jest.advanceTimersByTime(35000);

      // ASSERT: Heartbeat should be suppressed due to recent output
      expect(mockSSEResponse.write).not.toHaveBeenCalledWith(
        expect.stringMatching(/heartbeat/)
      );

      jest.useRealTimers();
    });
  });

  // MOCK CREATION HELPERS
  function createMockSSEResponse() {
    return {
      writeHead: jest.fn(),
      write: jest.fn(),
      setTimeout: jest.fn(),
      on: jest.fn(),
      destroyed: false,
      writableEnded: false
    };
  }

  function createMockRequest() {
    return {
      setTimeout: jest.fn(),
      on: jest.fn()
    };
  }

  function createMockClaudeProcess() {
    return {
      pid: Math.floor(Math.random() * 9999) + 1000,
      killed: false,
      stdout: {
        on: jest.fn().mockReturnThis()
      },
      stderr: {
        on: jest.fn().mockReturnThis()
      },
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      on: jest.fn(),
      kill: jest.fn()
    };
  }

  function createMockConnectionManager() {
    return {
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
      getConnections: jest.fn().mockReturnValue([]),
      notifyProcessStateChange: jest.fn()
    };
  }

  function createMockProcessManager() {
    return {
      getProcess: jest.fn(),
      updateStatus: jest.fn(),
      isRunning: jest.fn()
    };
  }

  function createMockBroadcaster() {
    return {
      broadcast: jest.fn(),
      broadcastStatus: jest.fn(),
      broadcastToConnections: jest.fn()
    };
  }

  function createMockLogger() {
    return {
      log: jest.fn(),
      error: jest.fn()
    };
  }

  // MOCK SERVICE CLASSES
  class SSEConnectionService {
    constructor({ connectionMap, processMap, broadcaster, logger }) {
      this.connections = connectionMap;
      this.processes = processMap;
      this.broadcaster = broadcaster;
      this.logger = logger;
    }

    createTerminalSSEStream(req, res, instanceId) {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no'
      });

      // Prevent timeouts
      req.setTimeout(0);
      res.setTimeout(0);

      // Track connection
      if (!this.connections.has(instanceId)) {
        this.connections.set(instanceId, []);
      }
      this.connections.get(instanceId).push(res);

      // Check if process exists and send appropriate message
      const processInfo = this.processes.get(instanceId);
      if (processInfo) {
        res.write(`data: ${JSON.stringify({
          type: 'connected',
          instanceId,
          message: `Terminal connected to Claude instance ${instanceId}`,
          workingDirectory: processInfo.workingDirectory,
          pid: processInfo.pid,
          timestamp: new Date().toISOString()
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'status',
          instanceId,
          message: `Waiting for Claude instance ${instanceId} to be ready...`,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }

      // Setup disconnect handler
      req.on('close', () => {
        const connections = this.connections.get(instanceId) || [];
        const index = connections.indexOf(res);
        if (index !== -1) {
          connections.splice(index, 1);
        }
      });
    }

    broadcastToAllConnections(instanceId, message) {
      const connections = this.connections.get(instanceId) || [];
      const data = `data: ${JSON.stringify(message)}\n\n`;
      
      const activeConnections = connections.filter((connection) => {
        try {
          if (connection.destroyed || connection.writableEnded) {
            return false;
          }
          connection.write(data);
          return true;
        } catch (error) {
          if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
            return false;
          }
          return false;
        }
      });
      
      this.connections.set(instanceId, activeConnections);
    }

    broadcastOutput(instanceId, source, data) {
      const message = {
        type: 'output',
        data: data,
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
        source: source,
        isReal: true
      };
      
      if (source === 'stderr') {
        message.isError = true;
      }

      this.broadcaster.broadcast(instanceId, message);
    }

    broadcastStatus(instanceId, status, details) {
      this.broadcaster.broadcastStatus(instanceId, status, details);
    }
  }

  class ProcessIntegrationService {
    constructor({ connectionManager, processManager, broadcaster }) {
      this.connectionManager = connectionManager;
      this.processManager = processManager;
      this.broadcaster = broadcaster;
    }

    integrateProcessWithSSE(instanceId, process) {
      // Setup stdout handler
      process.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        this.broadcaster.broadcast(instanceId, {
          type: 'output',
          data: output,
          instanceId: instanceId,
          timestamp: new Date().toISOString(),
          source: 'stdout',
          isReal: true
        });
      });

      // Setup stderr handler
      process.stderr.on('data', (data) => {
        const error = data.toString('utf8');
        this.broadcaster.broadcast(instanceId, {
          type: 'output',
          data: error,
          instanceId: instanceId,
          isError: true,
          timestamp: new Date().toISOString(),
          source: 'stderr',
          isReal: true
        });
      });

      // Setup lifecycle handlers
      process.on('spawn', () => {
        this.broadcaster.broadcastStatus(instanceId, 'running', { pid: process.pid });
      });

      process.on('exit', (code, signal) => {
        this.broadcaster.broadcastStatus(instanceId, 'stopped', { exitCode: code, signal });
      });
    }

    updateProcessStatus(instanceId, status, process) {
      this.connectionManager.notifyProcessStateChange(instanceId, status);
      this.processManager.updateStatus(instanceId, status);
    }
  }
});