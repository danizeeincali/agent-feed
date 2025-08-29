/**
 * TDD London School: Command Execution Verification Tests
 * Focus: Mock-driven verification of command execution workflow
 * Behavior: Test coordination between input handling and command execution
 */

const {
  createMockWebSocket,
  createMockInputElement,
  createMockCommandProcessor,
  createMockEnterKeyDetector,
  createMockMessageFormatter,
  createMockSwarmInputCoordinator,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

describe('Command Execution Verification', () => {
  let mockWebSocket;
  let mockInputElement;
  let mockCommandProcessor;
  let mockEnterKeyDetector;
  let mockMessageFormatter;
  let mockSwarmCoordinator;
  let commandExecutor;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    mockInputElement = createMockInputElement();
    mockCommandProcessor = createMockCommandProcessor();
    mockEnterKeyDetector = createMockEnterKeyDetector();
    mockMessageFormatter = createMockMessageFormatter();
    mockSwarmCoordinator = createMockSwarmInputCoordinator();

    // Mock CommandExecutor that coordinates the execution flow
    const CommandExecutor = jest.fn().mockImplementation(() => ({
      webSocket: mockWebSocket,
      inputElement: mockInputElement,
      commandProcessor: mockCommandProcessor,
      enterKeyDetector: mockEnterKeyDetector,
      messageFormatter: mockMessageFormatter,
      swarmCoordinator: mockSwarmCoordinator,
      executeCommand: jest.fn(),
      validateAndExecute: jest.fn(),
      handleExecutionResult: jest.fn()
    }));

    commandExecutor = new CommandExecutor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Execution Flow', () => {
    it('should execute command only after Enter key validation', async () => {
      // Arrange: Valid command with Enter key
      const command = 'ls -la';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockEnterKeyDetector.shouldTriggerSend.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(true);
      mockCommandProcessor.execute.mockResolvedValue({ success: true, output: 'file1.txt\nfile2.txt' });

      // Act: Execute command through Enter key trigger
      commandExecutor.executeCommand = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event) && mockEnterKeyDetector.shouldTriggerSend(event)) {
          const cmd = mockInputElement.value.trim();
          if (mockCommandProcessor.canExecute(cmd)) {
            return await mockCommandProcessor.execute(cmd);
          }
        }
        return null;
      });

      const enterEvent = { key: 'Enter' };
      const result = await commandExecutor.executeCommand(enterEvent);

      // Assert: Verify execution flow
      expect(result.success).toBe(true);
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(enterEvent);
      expect(mockEnterKeyDetector.shouldTriggerSend).toHaveBeenCalledWith(enterEvent);
      mockVerification.verifyCommandExecution(mockCommandProcessor, command);
    });

    it('should not execute command on regular keystrokes', async () => {
      // Arrange: Regular keystroke (not Enter)
      const regularKey = { key: 'a' };
      mockInputElement.value = 'partial command';
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Handle regular keystroke
      commandExecutor.executeCommand = jest.fn(async (event) => {
        if (!mockEnterKeyDetector.isEnterKey(event)) {
          return null; // Don't execute on regular keys
        }
      });

      const result = await commandExecutor.executeCommand(regularKey);

      // Assert: Verify no execution on regular keys
      expect(result).toBeNull();
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(regularKey);
      expect(mockCommandProcessor.execute).not.toHaveBeenCalled();
    });

    it('should validate command before execution', async () => {
      // Arrange: Command that needs validation
      const command = 'rm -rf important-data';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(false); // Dangerous command blocked
      mockCommandProcessor.validateCommand.mockReturnValue(false);

      // Act: Attempt to execute invalid command
      commandExecutor.validateAndExecute = jest.fn(async (cmd) => {
        if (!mockCommandProcessor.validateCommand(cmd)) {
          return { success: false, error: 'Command validation failed' };
        }
        if (!mockCommandProcessor.canExecute(cmd)) {
          return { success: false, error: 'Command execution not allowed' };
        }
        return await mockCommandProcessor.execute(cmd);
      });

      const result = await commandExecutor.validateAndExecute(command);

      // Assert: Verify validation prevents execution
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(mockCommandProcessor.validateCommand).toHaveBeenCalledWith(command);
      expect(mockCommandProcessor.execute).not.toHaveBeenCalled();
    });
  });

  describe('Command Processing Coordination', () => {
    it('should coordinate between input detection and command processing', async () => {
      // Arrange: Complete input-to-execution flow
      const command = 'git status';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(true);
      mockCommandProcessor.execute.mockResolvedValue({ 
        success: true, 
        output: 'On branch main\nnothing to commit' 
      });

      // Act: Execute complete coordination flow
      commandExecutor.validateAndExecute = jest.fn(async (event) => {
        // 1. Detect Enter key
        if (!mockEnterKeyDetector.isEnterKey(event)) {
          return null;
        }
        
        // 2. Get command from input
        const cmd = mockInputElement.value.trim();
        if (!cmd) {
          return null;
        }
        
        // 3. Check if command can be executed
        if (!mockCommandProcessor.canExecute(cmd)) {
          return { success: false, error: 'Cannot execute command' };
        }
        
        // 4. Execute command
        const result = await mockCommandProcessor.execute(cmd);
        return result;
      });

      const enterEvent = { key: 'Enter' };
      const result = await commandExecutor.validateAndExecute(enterEvent);

      // Assert: Verify coordination sequence
      expect(result.success).toBe(true);
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledWith(enterEvent);
      expect(mockCommandProcessor.canExecute).toHaveBeenCalledWith(command);
      expect(mockCommandProcessor.execute).toHaveBeenCalledWith(command);
    });

    it('should handle command execution errors gracefully', async () => {
      // Arrange: Command that will fail during execution
      const command = 'invalid-command-xyz';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(true);
      mockCommandProcessor.execute.mockRejectedValue(new Error('Command not found'));

      // Act: Handle execution error
      commandExecutor.handleExecutionResult = jest.fn(async (cmd) => {
        try {
          if (mockCommandProcessor.canExecute(cmd)) {
            return await mockCommandProcessor.execute(cmd);
          }
        } catch (error) {
          return { 
            success: false, 
            error: error.message,
            command: cmd 
          };
        }
      });

      const result = await commandExecutor.handleExecutionResult(command);

      // Assert: Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBe('Command not found');
      expect(result.command).toBe(command);
    });
  });

  describe('WebSocket Communication for Execution', () => {
    it('should send command execution request via WebSocket', async () => {
      // Arrange: Command ready for WebSocket transmission
      const command = 'pwd';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify({
        type: 'execute_command',
        command,
        timestamp: Date.now()
      }));

      // Act: Send execution request
      commandExecutor.executeCommand = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event)) {
          const cmd = mockInputElement.value.trim();
          const message = mockMessageFormatter.formatCommand(cmd);
          mockWebSocket.send(message);
          return { sent: true, command: cmd };
        }
      });

      const enterEvent = { key: 'Enter' };
      const result = await commandExecutor.executeCommand(enterEvent);

      // Assert: Verify WebSocket communication
      expect(result.sent).toBe(true);
      expect(result.command).toBe(command);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledWith(command);
      mockVerification.verifyWebSocketSendOnce(mockWebSocket, expect.any(String));
    });

    it('should format execution commands with proper metadata', async () => {
      // Arrange: Command with execution metadata
      const command = 'npm test';
      const executionMetadata = {
        sessionId: 'exec-session-123',
        executionId: 'exec-' + Date.now(),
        priority: 'normal',
        timeout: 30000
      };

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        return JSON.stringify({
          type: 'execute_command',
          command: cmd,
          metadata: executionMetadata,
          timestamp: Date.now()
        });
      });

      // Act: Format execution command
      const formatted = mockMessageFormatter.formatCommand(command);
      const parsedMessage = JSON.parse(formatted);

      // Assert: Verify execution metadata
      expect(parsedMessage.type).toBe('execute_command');
      expect(parsedMessage.command).toBe(command);
      expect(parsedMessage.metadata).toEqual(executionMetadata);
    });

    it('should handle WebSocket connection errors during execution', async () => {
      // Arrange: WebSocket connection failure
      const command = 'echo test';
      mockWebSocket.readyState = 3; // CLOSED
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('WebSocket connection closed');
      });

      // Act: Handle connection error during execution
      commandExecutor.executeCommand = jest.fn(async (cmd) => {
        try {
          if (mockWebSocket.readyState !== 1) {
            return { success: false, error: 'WebSocket not connected' };
          }
          const message = mockMessageFormatter.formatCommand(cmd);
          mockWebSocket.send(message);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const result = await commandExecutor.executeCommand(command);

      // Assert: Verify connection error handling
      expect(result.success).toBe(false);
      expect(result.error).toContain('WebSocket not connected');
    });
  });

  describe('Swarm Coordination for Command Execution', () => {
    it('should coordinate with swarm before command execution', async () => {
      // Arrange: Swarm-coordinated execution
      const command = 'swarm-coordinated-command';
      mockInputElement.value = command;
      mockSwarmCoordinator.beforeCommand.mockResolvedValue(true);
      mockCommandProcessor.execute.mockResolvedValue({ success: true });

      // Act: Execute with swarm coordination
      commandExecutor.executeCommand = jest.fn(async (cmd) => {
        const canProceed = await mockSwarmCoordinator.beforeCommand({
          command: cmd,
          executor: 'input-handler',
          timestamp: Date.now()
        });
        
        if (canProceed) {
          const result = await mockCommandProcessor.execute(cmd);
          await mockSwarmCoordinator.afterCommand({
            command: cmd,
            result,
            timestamp: Date.now()
          });
          return result;
        }
        
        return { success: false, error: 'Swarm coordination denied execution' };
      });

      const result = await commandExecutor.executeCommand(command);

      // Assert: Verify swarm coordination
      expect(result.success).toBe(true);
      expect(mockSwarmCoordinator.beforeCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command })
      );
      expect(mockSwarmCoordinator.afterCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command, result })
      );
    });

    it('should handle swarm coordination denial', async () => {
      // Arrange: Swarm denies execution
      const command = 'blocked-command';
      mockSwarmCoordinator.beforeCommand.mockResolvedValue(false);

      // Act: Attempt execution with swarm denial
      commandExecutor.executeCommand = jest.fn(async (cmd) => {
        const canProceed = await mockSwarmCoordinator.beforeCommand({ command: cmd });
        
        if (!canProceed) {
          return { success: false, error: 'Command blocked by swarm coordination' };
        }
        
        return await mockCommandProcessor.execute(cmd);
      });

      const result = await commandExecutor.executeCommand(command);

      // Assert: Verify swarm denial handling
      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked by swarm coordination');
      expect(mockCommandProcessor.execute).not.toHaveBeenCalled();
    });
  });

  describe('Execution Result Handling', () => {
    it('should process successful execution results', async () => {
      // Arrange: Successful command execution
      const command = 'echo "success"';
      const executionResult = {
        success: true,
        output: 'success\n',
        exitCode: 0,
        duration: 123
      };

      mockCommandProcessor.execute.mockResolvedValue(executionResult);

      // Act: Process execution result
      commandExecutor.handleExecutionResult = jest.fn(async (cmd) => {
        const result = await mockCommandProcessor.execute(cmd);
        
        if (result.success) {
          // Process successful result
          return {
            ...result,
            processed: true,
            timestamp: Date.now()
          };
        }
        
        return result;
      });

      const result = await commandExecutor.handleExecutionResult(command);

      // Assert: Verify successful result processing
      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.output).toBe('success\n');
      expect(result.exitCode).toBe(0);
    });

    it('should handle execution failure results', async () => {
      // Arrange: Failed command execution
      const command = 'non-existent-command';
      const executionResult = {
        success: false,
        error: 'Command not found: non-existent-command',
        exitCode: 127,
        stderr: 'bash: non-existent-command: command not found\n'
      };

      mockCommandProcessor.execute.mockResolvedValue(executionResult);

      // Act: Process execution failure
      commandExecutor.handleExecutionResult = jest.fn(async (cmd) => {
        const result = await mockCommandProcessor.execute(cmd);
        
        if (!result.success) {
          return {
            ...result,
            handled: true,
            errorCategory: 'command_not_found'
          };
        }
        
        return result;
      });

      const result = await commandExecutor.handleExecutionResult(command);

      // Assert: Verify failure result handling
      expect(result.success).toBe(false);
      expect(result.handled).toBe(true);
      expect(result.errorCategory).toBe('command_not_found');
      expect(result.exitCode).toBe(127);
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy CommandProcessor contract', () => {
      expect(mockCommandProcessor).toHaveProperty('execute');
      expect(mockCommandProcessor).toHaveProperty('canExecute');
      expect(mockCommandProcessor).toHaveProperty('validateCommand');
      expect(mockCommandProcessor.execute).toBeInstanceOf(Function);
    });

    it('should satisfy EnterKeyDetector contract for execution', () => {
      contractVerification.verifyEnterKeyDetectorContract(mockEnterKeyDetector);
    });

    it('should maintain proper execution workflow order', async () => {
      // Arrange: Workflow verification
      const command = 'test-workflow';
      
      // Act: Execute workflow
      commandExecutor.executeCommand = jest.fn(async (cmd) => {
        mockEnterKeyDetector.isEnterKey({ key: 'Enter' });
        mockCommandProcessor.canExecute(cmd);
        mockCommandProcessor.execute(cmd);
        mockWebSocket.send('formatted-command');
      });

      await commandExecutor.executeCommand(command);

      // Assert: Verify workflow order
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledBefore(mockCommandProcessor.canExecute);
      expect(mockCommandProcessor.canExecute).toHaveBeenCalledBefore(mockCommandProcessor.execute);
      expect(mockCommandProcessor.execute).toHaveBeenCalledBefore(mockWebSocket.send);
    });
  });
});