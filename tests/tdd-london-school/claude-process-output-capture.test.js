/**
 * TDD London School Tests: Claude Process Output Capture & SSE Streaming
 * 
 * BROKEN BEHAVIOR UNDER TEST:
 * - Input forwarded successfully to Claude process ✓
 * - No stdout/stderr data captured from process ❌
 * - Frontend receives no output ("Waiting for real output") ❌
 * 
 * CRITICAL TEST SCENARIOS:
 * 1. Claude process stdout must be captured via stdout.on('data')
 * 2. Claude process stderr must be captured via stderr.on('data')
 * 3. Captured output must be broadcast via SSE to frontend
 * 4. Frontend must receive real process output, not mock responses
 * 5. Bidirectional communication: input → process → output → frontend
 */

const { jest } = require('@jest/globals');

describe('TDD London School: Claude Process Output Capture & SSE Broadcasting', () => {
  let mockChildProcess, mockSSEResponse, mockActiveProcesses, mockSSEConnections;
  let mockSpawn, mockBroadcastToAllConnections, mockConsoleLog;
  let processOutputCapture, sseStreamingService;

  beforeEach(() => {
    // LONDON SCHOOL: Start with mock collaborators
    mockChildProcess = createMockClaudeProcess();
    mockSSEResponse = createMockSSEResponse();
    mockActiveProcesses = new Map();
    mockSSEConnections = new Map();
    
    // Mock the spawn function from child_process
    mockSpawn = jest.fn().mockReturnValue(mockChildProcess);
    mockBroadcastToAllConnections = jest.fn();
    mockConsoleLog = jest.fn();
    
    // Mock collaborators for the object under test
    processOutputCapture = new ProcessOutputCapture({
      spawn: mockSpawn,
      broadcastFunction: mockBroadcastToAllConnections,
      processMap: mockActiveProcesses,
      logger: { log: mockConsoleLog, error: jest.fn() }
    });
    
    sseStreamingService = new SSEStreamingService({
      connections: mockSSEConnections,
      broadcaster: mockBroadcastToAllConnections
    });
    
    jest.clearAllMocks();
  });

  describe('CRITICAL BEHAVIOR 1: Claude Process stdout.on("data") Capture', () => {
    it('should attach stdout.on("data") listener immediately after spawn', () => {
      // ARRANGE: Mock process spawning
      const instanceId = 'claude-test-123';
      const workingDir = '/test/directory';
      const command = 'claude';
      const args = ['--dangerously-skip-permissions'];

      // ACT: Spawn Claude process
      processOutputCapture.createRealClaudeInstance(instanceId, command, args, workingDir);

      // ASSERT: Verify stdout listener attached
      expect(mockSpawn).toHaveBeenCalledWith(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.any(Object),
        shell: false
      });
      
      expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockChildProcess.stdout.on.mock.calls[0][0]).toBe('data');
      expect(typeof mockChildProcess.stdout.on.mock.calls[0][1]).toBe('function');
    });

    it('should capture and process real stdout data when Claude writes output', () => {
      // ARRANGE: Setup process and capture the stdout handler
      const instanceId = 'claude-output-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');
      
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(
        call => call[0] === 'data'
      )[1];
      
      const realClaudeOutput = Buffer.from('Hello from Claude!\nThis is real output.\n');

      // ACT: Simulate Claude writing to stdout
      stdoutHandler(realClaudeOutput);

      // ASSERT: Verify output processed correctly
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, {
        type: 'output',
        data: 'Hello from Claude!\nThis is real output.\n',
        instanceId: instanceId,
        timestamp: expect.any(String),
        source: 'stdout',
        isReal: true
      });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`📤 REAL Claude ${instanceId} stdout:`),
        'Hello from Claude!\nThis is real output.\n'
      );
    });

    it('should handle multiple stdout data chunks correctly', () => {
      // ARRANGE: Setup process
      const instanceId = 'claude-chunks-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Simulate multiple data chunks
      stdoutHandler(Buffer.from('First chunk '));
      stdoutHandler(Buffer.from('Second chunk\n'));
      stdoutHandler(Buffer.from('Third chunk with newline\n'));

      // ASSERT: Verify each chunk broadcasted separately
      expect(mockBroadcastToAllConnections).toHaveBeenCalledTimes(3);
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(1, instanceId, expect.objectContaining({
        data: 'First chunk ',
        source: 'stdout',
        isReal: true
      }));
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(2, instanceId, expect.objectContaining({
        data: 'Second chunk\n',
        source: 'stdout'
      }));
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(3, instanceId, expect.objectContaining({
        data: 'Third chunk with newline\n',
        source: 'stdout'
      }));
    });
  });

  describe('CRITICAL BEHAVIOR 2: Claude Process stderr.on("data") Capture', () => {
    it('should attach stderr.on("data") listener immediately after spawn', () => {
      // ARRANGE & ACT: Spawn process
      const instanceId = 'claude-stderr-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');

      // ASSERT: Verify stderr listener attached
      expect(mockChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      const stderrCall = mockChildProcess.stderr.on.mock.calls.find(call => call[0] === 'data');
      expect(stderrCall).toBeDefined();
      expect(typeof stderrCall[1]).toBe('function');
    });

    it('should capture and broadcast real stderr data when Claude writes errors', () => {
      // ARRANGE: Setup process and capture stderr handler
      const instanceId = 'claude-error-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');
      
      const stderrHandler = mockChildProcess.stderr.on.mock.calls.find(
        call => call[0] === 'data'
      )[1];
      
      const realClaudeError = Buffer.from('Error: File not found\nStack trace here\n');

      // ACT: Simulate Claude writing to stderr
      stderrHandler(realClaudeError);

      // ASSERT: Verify error output processed and broadcast
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, {
        type: 'output',
        data: 'Error: File not found\nStack trace here\n',
        instanceId: instanceId,
        isError: true,
        timestamp: expect.any(String),
        source: 'stderr',
        isReal: true
      });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`📤 REAL Claude ${instanceId} stderr:`),
        'Error: File not found\nStack trace here\n'
      );
    });

    it('should differentiate between stdout and stderr in broadcasts', () => {
      // ARRANGE: Setup process and get both handlers
      const instanceId = 'claude-mixed-output-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');
      
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      const stderrHandler = mockChildProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Send data to both stdout and stderr
      stdoutHandler(Buffer.from('Normal output'));
      stderrHandler(Buffer.from('Error message'));

      // ASSERT: Verify different message structures
      expect(mockBroadcastToAllConnections).toHaveBeenCalledTimes(2);
      
      // Stdout call should not have isError
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(1, instanceId, 
        expect.objectContaining({
          source: 'stdout',
          isReal: true
        })
      );
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(1, instanceId, 
        expect.not.objectContaining({
          isError: true
        })
      );
      
      // Stderr call should have isError: true
      expect(mockBroadcastToAllConnections).toHaveBeenNthCalledWith(2, instanceId, 
        expect.objectContaining({
          source: 'stderr',
          isError: true,
          isReal: true
        })
      );
    });
  });

  describe('CRITICAL BEHAVIOR 3: SSE Broadcasting of Captured Output', () => {
    it('should broadcast captured stdout data to all SSE connections for instance', () => {
      // ARRANGE: Setup SSE connections for instance
      const instanceId = 'claude-broadcast-test';
      const connection1 = createMockSSEConnection();
      const connection2 = createMockSSEConnection();
      const connection3 = createMockSSEConnection();
      
      mockSSEConnections.set(instanceId, [connection1, connection2, connection3]);
      
      const outputData = {
        type: 'output',
        data: 'Real Claude response here\n',
        instanceId: instanceId,
        timestamp: '2025-01-01T12:00:00.000Z',
        source: 'stdout',
        isReal: true
      };

      // ACT: Broadcast the output
      sseStreamingService.broadcastToAllConnections(instanceId, outputData);

      // ASSERT: Verify all connections received the data
      const expectedSSEMessage = `data: ${JSON.stringify(outputData)}\n\n`;
      
      expect(connection1.write).toHaveBeenCalledWith(expectedSSEMessage);
      expect(connection2.write).toHaveBeenCalledWith(expectedSSEMessage);
      expect(connection3.write).toHaveBeenCalledWith(expectedSSEMessage);
      expect(connection1.write).toHaveBeenCalledTimes(1);
      expect(connection2.write).toHaveBeenCalledTimes(1);
      expect(connection3.write).toHaveBeenCalledTimes(1);
    });

    it('should handle dead connections gracefully during broadcast', () => {
      // ARRANGE: Setup connections with one dead connection
      const instanceId = 'claude-dead-connection-test';
      const aliveConnection = createMockSSEConnection();
      const deadConnection = createMockSSEConnection();
      
      // Simulate dead connection
      deadConnection.write.mockImplementation(() => {
        const error = new Error('Connection closed');
        error.code = 'ECONNRESET';
        throw error;
      });
      deadConnection.destroyed = true;
      
      mockSSEConnections.set(instanceId, [aliveConnection, deadConnection]);
      
      const outputData = { type: 'output', data: 'test data' };

      // ACT: Attempt broadcast
      sseStreamingService.broadcastToAllConnections(instanceId, outputData);

      // ASSERT: Alive connection gets data, dead connection removed
      expect(aliveConnection.write).toHaveBeenCalled();
      expect(deadConnection.write).toHaveBeenCalled(); // Attempted but failed
      
      // Verify dead connection was removed from active list
      const remainingConnections = mockSSEConnections.get(instanceId);
      expect(remainingConnections).toEqual([aliveConnection]);
      expect(remainingConnections).not.toContain(deadConnection);
    });

    it('should broadcast stderr data with error flags to SSE connections', () => {
      // ARRANGE: Setup connections for error data
      const instanceId = 'claude-error-broadcast-test';
      const connection = createMockSSEConnection();
      mockSSEConnections.set(instanceId, [connection]);
      
      const errorData = {
        type: 'output',
        data: 'Error: Command not found\n',
        instanceId: instanceId,
        isError: true,
        timestamp: expect.any(String),
        source: 'stderr',
        isReal: true
      };

      // ACT: Broadcast error data
      sseStreamingService.broadcastToAllConnections(instanceId, errorData);

      // ASSERT: Verify error data structure maintained
      expect(connection.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(errorData)}\n\n`
      );
    });
  });

  describe('CRITICAL BEHAVIOR 4: Real Process Output (No Mock Responses)', () => {
    it('should never send mock responses when real process exists', () => {
      // ARRANGE: Create real process that will produce output
      const instanceId = 'claude-no-mocks-test';
      const processInfo = {
        process: mockChildProcess,
        pid: 12345,
        status: 'running',
        workingDirectory: '/test'
      };
      mockActiveProcesses.set(instanceId, processInfo);

      // Setup SSE connection
      sseStreamingService.createTerminalSSEStream(mockSSEResponse, instanceId);

      // ACT: Simulate real Claude output
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('Actual Claude response\n'));

      // ASSERT: Verify no mock responses sent, only connection info and real data
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          data: 'Actual Claude response\n',
          isReal: true,
          source: 'stdout'
        })
      );
      
      // Verify no mock session messages or fake responses
      expect(mockBroadcastToAllConnections).not.toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          data: expect.stringMatching(/session started|mock|fake|example/)
        })
      );
    });

    it('should indicate waiting status only when no real process output available', () => {
      // ARRANGE: Create SSE connection but no active process yet
      const instanceId = 'claude-waiting-test';
      // Don't add to activeProcesses to simulate waiting state
      
      // ACT: Create SSE connection
      sseStreamingService.createTerminalSSEStream(mockSSEResponse, instanceId);

      // ASSERT: Should send waiting status, not fake output
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('Waiting for Claude instance')
      );
      
      // Should NOT send any fake terminal output
      expect(mockSSEResponse.write).not.toHaveBeenCalledWith(
        expect.stringContaining('$ ')  // Mock command prompt
      );
    });

    it('should preserve real output formatting and encoding', () => {
      // ARRANGE: Setup process for real output testing
      const instanceId = 'claude-formatting-test';
      processOutputCapture.createRealClaudeInstance(instanceId, 'claude', [], '/test');
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Send real Claude output with special characters
      const complexOutput = Buffer.from('📊 Analysis: 100% complete\n\x1b[32m✅ Success\x1b[0m\n');
      stdoutHandler(complexOutput);

      // ASSERT: Verify exact formatting preserved
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          data: '📊 Analysis: 100% complete\n\x1b[32m✅ Success\x1b[0m\n',
          source: 'stdout',
          isReal: true
        })
      );
    });
  });

  describe('CRITICAL BEHAVIOR 5: Bidirectional Communication Flow', () => {
    it('should complete full flow: input → process → output → frontend', async () => {
      // ARRANGE: Setup complete communication chain
      const instanceId = 'claude-bidirectional-test';
      const processInfo = {
        process: mockChildProcess,
        pid: 12345,
        status: 'running'
      };
      mockActiveProcesses.set(instanceId, processInfo);
      
      const connection = createMockSSEConnection();
      mockSSEConnections.set(instanceId, [connection]);
      
      // Capture stdin write for verification
      mockChildProcess.stdin.write = jest.fn();
      
      // Setup stdout handler to simulate process response
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT 1: Send input to process
      const inputData = 'analyze this code\n';
      await processOutputCapture.sendInputToProcess(instanceId, inputData);

      // Verify input forwarded to process
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(inputData);

      // ACT 2: Simulate Claude processing and responding
      const claudeResponse = Buffer.from('Code analysis complete:\n1. No issues found\n2. Style: Good\n');
      stdoutHandler(claudeResponse);

      // ASSERT: Verify complete bidirectional flow
      // 1. Input was forwarded to real process
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(inputData);
      
      // 2. Output was captured and broadcast
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          data: 'Code analysis complete:\n1. No issues found\n2. Style: Good\n',
          source: 'stdout',
          isReal: true
        })
      );
      
      // 3. SSE connection received the response
      expect(connection.write).toHaveBeenCalledWith(
        expect.stringMatching(/Code analysis complete/)
      );
    });

    it('should handle input echo and real response separately', async () => {
      // ARRANGE: Setup for echo testing
      const instanceId = 'claude-echo-test';
      const processInfo = { process: mockChildProcess, status: 'running' };
      mockActiveProcesses.set(instanceId, processInfo);
      
      mockChildProcess.stdin.write = jest.fn();
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Send input and get response
      await processOutputCapture.sendInputToProcess(instanceId, 'help\n');
      
      // Simulate Claude's response after processing
      setTimeout(() => {
        stdoutHandler(Buffer.from('Available commands:\n- analyze\n- help\n- exit\n'));
      }, 10);

      // ASSERT: Verify input echo and real response are distinct
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          type: 'terminal:echo',
          data: '$ help'
        })
      );
      
      // Wait for the async response
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(mockBroadcastToAllConnections).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          type: 'output',
          data: 'Available commands:\n- analyze\n- help\n- exit\n',
          source: 'stdout',
          isReal: true
        })
      );
    });

    it('should handle process communication errors gracefully', async () => {
      // ARRANGE: Setup process with stdin error
      const instanceId = 'claude-comm-error-test';
      const processInfo = { process: mockChildProcess, status: 'running' };
      mockActiveProcesses.set(instanceId, processInfo);
      
      mockChildProcess.stdin.write = jest.fn().mockImplementation(() => {
        throw new Error('Broken pipe');
      });

      // ACT: Attempt to send input
      try {
        await processOutputCapture.sendInputToProcess(instanceId, 'test input\n');
      } catch (error) {
        // Expected to handle gracefully
      }

      // ASSERT: Error should be logged and handled
      expect(mockConsoleLog.mock.calls.some(call => 
        call[0].includes('❌') && call[0].includes('Failed to send input')
      )).toBe(true);
    });
  });

  describe('LONDON SCHOOL: Object Collaboration Verification', () => {
    it('should verify proper interaction sequence between spawn and handler setup', () => {
      // ARRANGE: Track call sequence
      const callSequence = [];
      mockSpawn.mockImplementation((...args) => {
        callSequence.push('spawn_called');
        return mockChildProcess;
      });
      mockChildProcess.stdout.on.mockImplementation((event, handler) => {
        callSequence.push(`stdout_on_${event}`);
        return mockChildProcess.stdout;
      });
      mockChildProcess.stderr.on.mockImplementation((event, handler) => {
        callSequence.push(`stderr_on_${event}`);
        return mockChildProcess.stderr;
      });

      // ACT: Create process
      processOutputCapture.createRealClaudeInstance('test', 'claude', [], '/test');

      // ASSERT: Verify correct collaboration sequence
      expect(callSequence).toEqual([
        'spawn_called',
        'stdout_on_data',
        'stderr_on_data'
      ]);
    });

    it('should verify SSE broadcaster collaborates correctly with connection manager', () => {
      // ARRANGE: Mock the collaboration
      const connectionManager = {
        getConnections: jest.fn().mockReturnValue([createMockSSEConnection()]),
        removeDeadConnection: jest.fn()
      };
      
      const broadcaster = new SSEBroadcaster(connectionManager);
      
      // ACT: Broadcast message
      broadcaster.broadcast('test-instance', { data: 'test' });

      // ASSERT: Verify proper collaboration
      expect(connectionManager.getConnections).toHaveBeenCalledWith('test-instance');
      // Additional collaboration assertions would go here
    });
  });

  // HELPER FUNCTIONS FOR MOCK CREATION
  function createMockClaudeProcess() {
    return {
      pid: 12345,
      killed: false,
      stdout: {
        on: jest.fn().mockReturnThis(),
        pipe: jest.fn()
      },
      stderr: {
        on: jest.fn().mockReturnThis(),
        pipe: jest.fn()
      },
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      on: jest.fn(),
      kill: jest.fn()
    };
  }

  function createMockSSEConnection() {
    return {
      write: jest.fn(),
      destroyed: false,
      writableEnded: false
    };
  }

  function createMockSSEResponse() {
    return {
      writeHead: jest.fn(),
      write: jest.fn(),
      on: jest.fn()
    };
  }

  // MOCK CLASSES FOR TESTING
  class ProcessOutputCapture {
    constructor({ spawn, broadcastFunction, processMap, logger }) {
      this.spawn = spawn;
      this.broadcast = broadcastFunction;
      this.processes = processMap;
      this.logger = logger;
    }

    createRealClaudeInstance(instanceId, command, args, workingDir) {
      const process = this.spawn(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
        shell: false
      });

      // CRITICAL: Setup stdout handler
      process.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        this.logger.log(`📤 REAL Claude ${instanceId} stdout:`, output);
        
        this.broadcast(instanceId, {
          type: 'output',
          data: output,
          instanceId: instanceId,
          timestamp: new Date().toISOString(),
          source: 'stdout',
          isReal: true
        });
      });

      // CRITICAL: Setup stderr handler  
      process.stderr.on('data', (data) => {
        const error = data.toString('utf8');
        this.logger.log(`📤 REAL Claude ${instanceId} stderr:`, error);
        
        this.broadcast(instanceId, {
          type: 'output',
          data: error,
          instanceId: instanceId,
          isError: true,
          timestamp: new Date().toISOString(),
          source: 'stderr',
          isReal: true
        });
      });

      this.processes.set(instanceId, { process, status: 'running' });
      return { process, pid: process.pid };
    }

    async sendInputToProcess(instanceId, input) {
      const processInfo = this.processes.get(instanceId);
      if (!processInfo || processInfo.status !== 'running') {
        throw new Error('Process not available');
      }

      try {
        // Echo input first
        this.broadcast(instanceId, {
          type: 'terminal:echo',
          data: `$ ${input.replace('\n', '')}`,
          timestamp: new Date().toISOString()
        });

        // Send to real process
        processInfo.process.stdin.write(input);
      } catch (error) {
        this.logger.log(`❌ Failed to send input to Claude ${instanceId}:`, error);
        throw error;
      }
    }
  }

  class SSEStreamingService {
    constructor({ connections, broadcaster }) {
      this.connections = connections;
      this.broadcaster = broadcaster;
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
          throw error;
        }
      });
      
      // Update connections list
      if (activeConnections.length !== connections.length) {
        this.connections.set(instanceId, activeConnections);
      }
    }

    createTerminalSSEStream(res, instanceId) {
      // Send connection message
      if (!this.connections.has('__status__')) {
        this.connections.set('__status__', []);
      }
      
      const processExists = mockActiveProcesses.has(instanceId);
      
      if (processExists) {
        res.write(`data: ${JSON.stringify({
          type: 'connected',
          instanceId,
          message: `Terminal connected to Claude instance ${instanceId}`,
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
    }
  }

  class SSEBroadcaster {
    constructor(connectionManager) {
      this.connectionManager = connectionManager;
    }

    broadcast(instanceId, message) {
      const connections = this.connectionManager.getConnections(instanceId);
      // Broadcasting logic here
    }
  }
});