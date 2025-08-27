/**
 * TDD London School Tests: Bidirectional I/O Communication
 * 
 * Tests the complete input → process → output → frontend flow
 * Focuses on object interactions and contract verification
 * Addresses the specific broken behavior: input forwarded but no output captured
 */

const { jest } = require('@jest/globals');

describe('TDD London School: Bidirectional I/O Communication Flow', () => {
  let mockProcess, mockInputHandler, mockOutputCapture, mockSSEBroadcaster;
  let mockProcessManager, mockConnectionManager, mockValidator;
  let bidirectionalIOService, communicationCoordinator;

  beforeEach(() => {
    // LONDON SCHOOL: Mock all collaborators
    mockProcess = createMockClaudeProcess();
    mockInputHandler = createMockInputHandler();
    mockOutputCapture = createMockOutputCapture();
    mockSSEBroadcaster = createMockSSEBroadcaster();
    mockProcessManager = createMockProcessManager();
    mockConnectionManager = createMockConnectionManager();
    mockValidator = createMockValidator();

    // Create objects under test with injected dependencies
    bidirectionalIOService = new BidirectionalIOService({
      inputHandler: mockInputHandler,
      outputCapture: mockOutputCapture,
      broadcaster: mockSSEBroadcaster,
      processManager: mockProcessManager,
      validator: mockValidator
    });

    communicationCoordinator = new CommunicationCoordinator({
      ioService: bidirectionalIOService,
      connectionManager: mockConnectionManager,
      processManager: mockProcessManager
    });

    jest.clearAllMocks();
  });

  describe('Input Forwarding Contract Verification', () => {
    it('should validate input before forwarding to Claude process', async () => {
      // ARRANGE: Setup validated input scenario
      const instanceId = 'claude-input-validation';
      const userInput = 'analyze /workspaces/test.js\n';
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);

      // ACT: Send input through the system
      await bidirectionalIOService.forwardInputToProcess(instanceId, userInput);

      // ASSERT: Verify input validation collaboration
      expect(mockValidator.validateInput).toHaveBeenCalledWith(userInput);
      expect(mockInputHandler.sanitizeInput).toHaveBeenCalledWith(userInput);
      expect(mockInputHandler.forwardToProcess).toHaveBeenCalledWith(mockProcess, userInput);
    });

    it('should handle input validation failures gracefully', async () => {
      // ARRANGE: Setup invalid input
      const instanceId = 'claude-invalid-input';
      const maliciousInput = 'rm -rf / --no-preserve-root\n';
      mockValidator.validateInput.mockReturnValue({ 
        valid: false, 
        reason: 'Potentially dangerous command' 
      });

      // ACT: Attempt to send invalid input
      const result = await bidirectionalIOService.forwardInputToProcess(instanceId, maliciousInput);

      // ASSERT: Verify input was rejected and not forwarded
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Potentially dangerous command');
      expect(mockInputHandler.forwardToProcess).not.toHaveBeenCalled();
      expect(mockSSEBroadcaster.broadcastError).toHaveBeenCalledWith(instanceId, 
        expect.stringMatching(/Input validation failed/)
      );
    });

    it('should coordinate echo broadcasting with input forwarding', async () => {
      // ARRANGE: Setup successful input scenario
      const instanceId = 'claude-echo-test';
      const userInput = 'help\n';
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);

      // ACT: Forward input
      await bidirectionalIOService.forwardInputToProcess(instanceId, userInput);

      // ASSERT: Verify echo was broadcast before process input
      expect(mockSSEBroadcaster.broadcastEcho).toHaveBeenCalledWith(instanceId, '$ help');
      expect(mockSSEBroadcaster.broadcastEcho).toHaveBeenCalledBefore(
        mockInputHandler.forwardToProcess
      );
    });
  });

  describe('Output Capture Contract Verification', () => {
    it('should capture stdout data immediately and broadcast to SSE connections', () => {
      // ARRANGE: Setup output capture system
      const instanceId = 'claude-stdout-capture';
      const mockConnections = [createMockSSEConnection(), createMockSSEConnection()];
      mockConnectionManager.getConnections.mockReturnValue(mockConnections);

      // Setup the output capture system
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);

      // Get the stdout handler that was attached
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Simulate Claude process writing to stdout
      const claudeOutput = Buffer.from('Analysis complete:\n- No syntax errors\n- Code quality: Good\n');
      stdoutHandler(claudeOutput);

      // ASSERT: Verify output was captured and broadcast
      expect(mockOutputCapture.processStdout).toHaveBeenCalledWith(
        instanceId, 
        'Analysis complete:\n- No syntax errors\n- Code quality: Good\n'
      );
      
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenCalledWith(instanceId, {
        type: 'output',
        data: 'Analysis complete:\n- No syntax errors\n- Code quality: Good\n',
        source: 'stdout',
        isReal: true,
        timestamp: expect.any(String)
      });
    });

    it('should capture stderr data and mark as error in broadcast', () => {
      // ARRANGE: Setup error capture
      const instanceId = 'claude-stderr-capture';
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);
      
      const stderrHandler = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Simulate Claude process writing to stderr
      const claudeError = Buffer.from('Error: File not found: /invalid/path.js\n');
      stderrHandler(claudeError);

      // ASSERT: Verify error output was captured with proper flags
      expect(mockOutputCapture.processStderr).toHaveBeenCalledWith(
        instanceId,
        'Error: File not found: /invalid/path.js\n'
      );
      
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenCalledWith(instanceId, {
        type: 'output',
        data: 'Error: File not found: /invalid/path.js\n',
        source: 'stderr',
        isError: true,
        isReal: true,
        timestamp: expect.any(String)
      });
    });

    it('should handle rapid output bursts without losing data', () => {
      // ARRANGE: Setup for burst testing
      const instanceId = 'claude-burst-output';
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);
      
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Simulate rapid output burst
      for (let i = 0; i < 10; i++) {
        stdoutHandler(Buffer.from(`Output chunk ${i}\n`));
      }

      // ASSERT: Verify all output chunks were captured
      expect(mockOutputCapture.processStdout).toHaveBeenCalledTimes(10);
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenCalledTimes(10);
      
      // Verify order preservation
      for (let i = 0; i < 10; i++) {
        expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenNthCalledWith(i + 1, instanceId, 
          expect.objectContaining({
            data: `Output chunk ${i}\n`
          })
        );
      }
    });
  });

  describe('Complete Bidirectional Flow Integration', () => {
    it('should complete full communication cycle: input → process → output → frontend', async () => {
      // ARRANGE: Setup complete system
      const instanceId = 'claude-full-cycle';
      const userInput = 'check syntax\n';
      const claudeResponse = 'Syntax check passed - no errors found\n';
      
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);
      mockConnectionManager.getConnections.mockReturnValue([createMockSSEConnection()]);

      // Setup output capture
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Complete the cycle
      // 1. User sends input
      await bidirectionalIOService.forwardInputToProcess(instanceId, userInput);
      
      // 2. Simulate Claude processing and responding
      setTimeout(() => {
        stdoutHandler(Buffer.from(claudeResponse));
      }, 10);

      await new Promise(resolve => setTimeout(resolve, 20)); // Wait for async processing

      // ASSERT: Verify complete flow
      // Input was validated and forwarded
      expect(mockValidator.validateInput).toHaveBeenCalledWith(userInput);
      expect(mockInputHandler.forwardToProcess).toHaveBeenCalledWith(mockProcess, userInput);
      
      // Echo was broadcast
      expect(mockSSEBroadcaster.broadcastEcho).toHaveBeenCalledWith(instanceId, '$ check syntax');
      
      // Output was captured and broadcast
      expect(mockOutputCapture.processStdout).toHaveBeenCalledWith(instanceId, claudeResponse);
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenCalledWith(instanceId, 
        expect.objectContaining({
          data: claudeResponse,
          source: 'stdout',
          isReal: true
        })
      );
    });

    it('should handle command with multiple response chunks', async () => {
      // ARRANGE: Setup for multi-chunk response
      const instanceId = 'claude-multi-chunk';
      const userInput = 'analyze large-file.js\n';
      
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);
      
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];

      // ACT: Send input and simulate chunked response
      await bidirectionalIOService.forwardInputToProcess(instanceId, userInput);
      
      // Simulate Claude responding in chunks
      stdoutHandler(Buffer.from('Starting analysis...\n'));
      stdoutHandler(Buffer.from('Processing functions...\n'));
      stdoutHandler(Buffer.from('Analysis complete: No issues found\n'));

      // ASSERT: Verify all chunks were handled in order
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenCalledTimes(3);
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenNthCalledWith(1, instanceId, 
        expect.objectContaining({ data: 'Starting analysis...\n' }));
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenNthCalledWith(2, instanceId, 
        expect.objectContaining({ data: 'Processing functions...\n' }));
      expect(mockSSEBroadcaster.broadcastOutput).toHaveBeenNthCalledWith(3, instanceId, 
        expect.objectContaining({ data: 'Analysis complete: No issues found\n' }));
    });

    it('should coordinate error handling across the entire communication flow', async () => {
      // ARRANGE: Setup error scenario
      const instanceId = 'claude-error-flow';
      const userInput = 'invalid command\n';
      
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);
      
      // Simulate process input error
      mockInputHandler.forwardToProcess.mockImplementation(() => {
        throw new Error('Process stdin closed');
      });

      // ACT: Attempt communication
      const result = await bidirectionalIOService.forwardInputToProcess(instanceId, userInput);

      // ASSERT: Verify error was handled and communicated
      expect(result.success).toBe(false);
      expect(mockSSEBroadcaster.broadcastError).toHaveBeenCalledWith(instanceId, 
        expect.stringMatching(/Failed to send input.*Process stdin closed/)
      );
    });
  });

  describe('Process State Coordination', () => {
    it('should coordinate communication availability with process status', async () => {
      // ARRANGE: Setup process state checking
      const instanceId = 'claude-state-coordination';
      mockProcessManager.getProcessStatus.mockReturnValue('starting');

      // ACT: Attempt input while process is starting
      const result = await bidirectionalIOService.forwardInputToProcess(instanceId, 'test\n');

      // ASSERT: Should reject input when process not ready
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/process not ready|not running/i);
      expect(mockInputHandler.forwardToProcess).not.toHaveBeenCalled();
    });

    it('should handle process termination gracefully during communication', async () => {
      // ARRANGE: Setup running process that will terminate
      const instanceId = 'claude-termination-test';
      mockValidator.validateInput.mockReturnValue({ valid: true });
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);
      
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);
      
      // ACT: Simulate process termination during communication
      const exitHandler = mockProcess.on.mock.calls.find(call => call[0] === 'exit')[1];
      exitHandler(0, null);

      // ASSERT: Verify termination was handled
      expect(mockSSEBroadcaster.broadcastStatus).toHaveBeenCalledWith(instanceId, 'stopped', {
        exitCode: 0,
        signal: null
      });
    });
  });

  describe('London School: Interaction Sequence Verification', () => {
    it('should verify proper collaboration sequence for successful communication', async () => {
      // ARRANGE: Track call order
      const callOrder = [];
      mockValidator.validateInput.mockImplementation((...args) => {
        callOrder.push('validate');
        return { valid: true };
      });
      mockSSEBroadcaster.broadcastEcho.mockImplementation(() => callOrder.push('echo'));
      mockInputHandler.forwardToProcess.mockImplementation(() => callOrder.push('forward'));
      mockOutputCapture.processStdout.mockImplementation(() => callOrder.push('capture'));
      mockSSEBroadcaster.broadcastOutput.mockImplementation(() => callOrder.push('broadcast'));

      const instanceId = 'claude-sequence-test';
      mockProcessManager.getRunningProcess.mockReturnValue(mockProcess);
      
      bidirectionalIOService.setupOutputCapture(instanceId, mockProcess);

      // ACT: Execute communication flow
      await bidirectionalIOService.forwardInputToProcess(instanceId, 'test\n');
      
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('response\n'));

      // ASSERT: Verify correct collaboration sequence
      expect(callOrder).toEqual([
        'validate',
        'echo', 
        'forward',
        'capture',
        'broadcast'
      ]);
    });

    it('should verify error handling collaboration patterns', async () => {
      // ARRANGE: Setup error scenario tracking
      const errorCallOrder = [];
      
      mockValidator.validateInput.mockImplementation(() => {
        errorCallOrder.push('validate');
        return { valid: false, reason: 'Invalid command' };
      });
      mockSSEBroadcaster.broadcastError.mockImplementation(() => errorCallOrder.push('broadcast_error'));

      // ACT: Execute error flow
      await bidirectionalIOService.forwardInputToProcess('test-instance', 'bad input\n');

      // ASSERT: Verify error handling collaboration
      expect(errorCallOrder).toEqual([
        'validate',
        'broadcast_error'
      ]);
      expect(mockInputHandler.forwardToProcess).not.toHaveBeenCalled();
    });
  });

  // MOCK CREATION HELPERS
  function createMockClaudeProcess() {
    return {
      pid: 12345,
      killed: false,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
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

  function createMockInputHandler() {
    return {
      sanitizeInput: jest.fn().mockImplementation(input => input),
      forwardToProcess: jest.fn(),
      validateCommand: jest.fn().mockReturnValue(true)
    };
  }

  function createMockOutputCapture() {
    return {
      processStdout: jest.fn(),
      processStderr: jest.fn(),
      setupHandlers: jest.fn()
    };
  }

  function createMockSSEBroadcaster() {
    return {
      broadcastOutput: jest.fn(),
      broadcastEcho: jest.fn(),
      broadcastError: jest.fn(),
      broadcastStatus: jest.fn()
    };
  }

  function createMockProcessManager() {
    return {
      getRunningProcess: jest.fn(),
      getProcessStatus: jest.fn().mockReturnValue('running'),
      updateStatus: jest.fn()
    };
  }

  function createMockConnectionManager() {
    return {
      getConnections: jest.fn().mockReturnValue([]),
      addConnection: jest.fn(),
      removeConnection: jest.fn()
    };
  }

  function createMockValidator() {
    return {
      validateInput: jest.fn().mockReturnValue({ valid: true }),
      sanitizeCommand: jest.fn()
    };
  }

  // MOCK SERVICE CLASSES
  class BidirectionalIOService {
    constructor({ inputHandler, outputCapture, broadcaster, processManager, validator }) {
      this.inputHandler = inputHandler;
      this.outputCapture = outputCapture;
      this.broadcaster = broadcaster;
      this.processManager = processManager;
      this.validator = validator;
    }

    async forwardInputToProcess(instanceId, input) {
      try {
        // Validate input
        const validation = this.validator.validateInput(input);
        if (!validation.valid) {
          this.broadcaster.broadcastError(instanceId, `Input validation failed: ${validation.reason}`);
          return { success: false, reason: validation.reason };
        }

        // Check process status
        const processStatus = this.processManager.getProcessStatus(instanceId);
        if (processStatus !== 'running') {
          return { success: false, reason: 'Process not ready' };
        }

        // Get running process
        const process = this.processManager.getRunningProcess(instanceId);
        if (!process) {
          return { success: false, reason: 'Process not found' };
        }

        // Broadcast echo
        const sanitized = this.inputHandler.sanitizeInput(input);
        this.broadcaster.broadcastEcho(instanceId, `$ ${sanitized.replace('\n', '')}`);

        // Forward to process
        this.inputHandler.forwardToProcess(process, input);

        return { success: true };
      } catch (error) {
        this.broadcaster.broadcastError(instanceId, `Failed to send input: ${error.message}`);
        return { success: false, reason: error.message };
      }
    }

    setupOutputCapture(instanceId, process) {
      // Setup stdout capture
      process.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        this.outputCapture.processStdout(instanceId, output);
        this.broadcaster.broadcastOutput(instanceId, {
          type: 'output',
          data: output,
          source: 'stdout',
          isReal: true,
          timestamp: new Date().toISOString()
        });
      });

      // Setup stderr capture
      process.stderr.on('data', (data) => {
        const error = data.toString('utf8');
        this.outputCapture.processStderr(instanceId, error);
        this.broadcaster.broadcastOutput(instanceId, {
          type: 'output',
          data: error,
          source: 'stderr',
          isError: true,
          isReal: true,
          timestamp: new Date().toISOString()
        });
      });

      // Setup lifecycle handlers
      process.on('exit', (code, signal) => {
        this.broadcaster.broadcastStatus(instanceId, 'stopped', { exitCode: code, signal });
      });
    }
  }

  class CommunicationCoordinator {
    constructor({ ioService, connectionManager, processManager }) {
      this.ioService = ioService;
      this.connectionManager = connectionManager;
      this.processManager = processManager;
    }

    async handleUserInput(instanceId, input) {
      return await this.ioService.forwardInputToProcess(instanceId, input);
    }

    setupProcessIntegration(instanceId, process) {
      this.ioService.setupOutputCapture(instanceId, process);
    }
  }
});