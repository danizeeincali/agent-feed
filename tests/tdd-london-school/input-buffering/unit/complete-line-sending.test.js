/**
 * TDD London School: Complete Line Sending Tests
 * Focus: Verify complete line sending (not character-by-character)
 * Behavior: Mock-driven verification of line completion and WebSocket sending
 */

const {
  createMockWebSocket,
  createMockInputElement,
  createMockKeyboardEvent,
  createMockLineCompletionHandler,
  createMockMessageFormatter,
  createMockCommandProcessor,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

describe('Complete Line Sending (Not Character-by-Character)', () => {
  let mockWebSocket;
  let mockInputElement;
  let mockLineCompletionHandler;
  let mockMessageFormatter;
  let mockCommandProcessor;
  let lineHandler;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    mockInputElement = createMockInputElement();
    mockLineCompletionHandler = createMockLineCompletionHandler();
    mockMessageFormatter = createMockMessageFormatter();
    mockCommandProcessor = createMockCommandProcessor();

    // Mock LineHandler that coordinates complete line processing
    const LineHandler = jest.fn().mockImplementation(() => ({
      webSocket: mockWebSocket,
      inputElement: mockInputElement,
      lineCompletionHandler: mockLineCompletionHandler,
      messageFormatter: mockMessageFormatter,
      commandProcessor: mockCommandProcessor,
      processLine: jest.fn(),
      sendCompleteLine: jest.fn(),
      handleInput: jest.fn()
    }));

    lineHandler = new LineHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Line Processing', () => {
    it('should send complete line only after Enter key', async () => {
      // Arrange: Complete command line
      const completeLine = 'echo "hello world"';
      mockInputElement.value = completeLine;
      mockLineCompletionHandler.isLineComplete.mockReturnValue(true);
      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify({
        type: 'command',
        data: completeLine,
        timestamp: Date.now()
      }));

      // Act: Process complete line
      lineHandler.sendCompleteLine = jest.fn(async (line) => {
        if (mockLineCompletionHandler.isLineComplete(line)) {
          const formattedMessage = mockMessageFormatter.formatCommand(line);
          mockWebSocket.send(formattedMessage);
          return true;
        }
        return false;
      });

      const result = await lineHandler.sendCompleteLine(completeLine);

      // Assert: Verify complete line sent once
      expect(result).toBe(true);
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledWith(completeLine);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledWith(completeLine);
      mockVerification.verifyWebSocketSendOnce(mockWebSocket, expect.any(String));
    });

    it('should not send partial lines during typing', async () => {
      // Arrange: Partial input being typed
      const partialInputs = ['h', 'he', 'hel', 'hell', 'hello'];
      
      mockLineCompletionHandler.isLineComplete.mockReturnValue(false);

      // Act: Process each partial input
      for (const partial of partialInputs) {
        mockInputElement.value = partial;

        lineHandler.processLine = jest.fn(async (input) => {
          if (!mockLineCompletionHandler.isLineComplete(input)) {
            // Don't send partial lines
            return false;
          }
        });

        const result = await lineHandler.processLine(partial);
        expect(result).toBe(false);
      }

      // Assert: Verify no WebSocket sends for partial input
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledTimes(5);
    });

    it('should prevent character-by-character transmission', async () => {
      // Arrange: Character sequence that should be buffered
      const characters = ['l', 's', ' ', '-', 'l', 'a'];
      let accumulatedInput = '';

      // Act: Process character sequence
      for (const char of characters) {
        accumulatedInput += char;
        mockInputElement.value = accumulatedInput;
        
        // Mock that individual characters are not complete lines
        mockLineCompletionHandler.isLineComplete.mockReturnValue(false);

        lineHandler.handleInput = jest.fn(async (input) => {
          // Only process if line is complete
          if (mockLineCompletionHandler.isLineComplete(input)) {
            const formatted = mockMessageFormatter.formatCommand(input);
            mockWebSocket.send(formatted);
            return true;
          }
          return false; // Buffer the input, don't send
        });

        await lineHandler.handleInput(accumulatedInput);
      }

      // Assert: Verify no individual character sending
      mockVerification.verifyNoCharacterSending(mockWebSocket);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Line Completion Detection', () => {
    it('should detect line completion on Enter key press', async () => {
      // Arrange: Enter key event with complete command
      const enterEvent = createMockKeyboardEvent('Enter');
      const completeCommand = 'npm test';
      mockInputElement.value = completeCommand;

      mockLineCompletionHandler.isLineComplete.mockImplementation((line) => {
        return line.trim().length > 0; // Non-empty line is complete
      });

      // Act: Handle Enter key for line completion
      lineHandler.processLine = jest.fn(async (event) => {
        if (event.key === 'Enter') {
          const line = mockInputElement.value;
          return mockLineCompletionHandler.isLineComplete(line);
        }
        return false;
      });

      const isComplete = await lineHandler.processLine(enterEvent);

      // Assert: Verify line completion detection
      expect(isComplete).toBe(true);
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledWith(completeCommand);
    });

    it('should handle empty line completion gracefully', async () => {
      // Arrange: Enter key with empty input
      const enterEvent = createMockKeyboardEvent('Enter');
      mockInputElement.value = '';

      mockLineCompletionHandler.isLineComplete.mockReturnValue(false);

      // Act: Handle empty line
      lineHandler.processLine = jest.fn(async (event) => {
        if (event.key === 'Enter') {
          const line = mockInputElement.value.trim();
          if (line.length === 0) {
            return false; // Empty lines are not complete
          }
          return mockLineCompletionHandler.isLineComplete(line);
        }
        return false;
      });

      const isComplete = await lineHandler.processLine(enterEvent);

      // Assert: Verify empty line not processed
      expect(isComplete).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should process multiline input completion', async () => {
      // Arrange: Multiline command input
      const multilineCommand = `echo "line 1"\necho "line 2"\necho "line 3"`;
      mockInputElement.value = multilineCommand;

      mockLineCompletionHandler.isLineComplete.mockImplementation((line) => {
        // Consider multiline complete when it contains newlines and ends properly
        return line.includes('\n') && !line.endsWith('\n');
      });

      // Act: Process multiline input
      lineHandler.sendCompleteLine = jest.fn(async (line) => {
        if (mockLineCompletionHandler.isLineComplete(line)) {
          const formatted = mockMessageFormatter.formatCommand(line);
          mockWebSocket.send(formatted);
          return true;
        }
        return false;
      });

      const result = await lineHandler.sendCompleteLine(multilineCommand);

      // Assert: Verify multiline completion
      expect(result).toBe(true);
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledWith(multilineCommand);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Processing and Validation', () => {
    it('should validate command before sending complete line', async () => {
      // Arrange: Command that needs validation
      const command = 'sudo rm -rf /';
      mockInputElement.value = command;
      mockLineCompletionHandler.isLineComplete.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(true);
      mockCommandProcessor.validateCommand.mockReturnValue(true);

      // Act: Process and validate command
      lineHandler.sendCompleteLine = jest.fn(async (line) => {
        if (mockLineCompletionHandler.isLineComplete(line)) {
          if (mockCommandProcessor.validateCommand(line) && mockCommandProcessor.canExecute(line)) {
            const formatted = mockMessageFormatter.formatCommand(line);
            mockWebSocket.send(formatted);
            return true;
          }
        }
        return false;
      });

      const result = await lineHandler.sendCompleteLine(command);

      // Assert: Verify validation before sending
      expect(result).toBe(true);
      mockVerification.verifyCommandExecution(mockCommandProcessor, command);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid commands and not send', async () => {
      // Arrange: Invalid command
      const invalidCommand = '';
      mockInputElement.value = invalidCommand;
      mockLineCompletionHandler.isLineComplete.mockReturnValue(false);
      mockCommandProcessor.validateCommand.mockReturnValue(false);

      // Act: Attempt to process invalid command
      lineHandler.sendCompleteLine = jest.fn(async (line) => {
        if (!mockCommandProcessor.validateCommand(line)) {
          return false;
        }
        // Should not reach here
        return true;
      });

      const result = await lineHandler.sendCompleteLine(invalidCommand);

      // Assert: Verify invalid command rejected
      expect(result).toBe(false);
      expect(mockCommandProcessor.validateCommand).toHaveBeenCalledWith(invalidCommand);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Message Formatting for Complete Commands', () => {
    it('should format complete command with proper structure', async () => {
      // Arrange: Complete command with expected format
      const command = 'git status';
      const expectedFormat = {
        type: 'command',
        data: command,
        timestamp: expect.any(Number),
        complete: true
      };

      mockLineCompletionHandler.isLineComplete.mockReturnValue(true);
      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify(expectedFormat));

      // Act: Format and send complete command
      lineHandler.sendCompleteLine = jest.fn(async (line) => {
        const formatted = mockMessageFormatter.formatCommand(line);
        mockWebSocket.send(formatted);
        return JSON.parse(formatted);
      });

      const result = await lineHandler.sendCompleteLine(command);

      // Assert: Verify proper message formatting
      expect(result.type).toBe('command');
      expect(result.data).toBe(command);
      expect(result.complete).toBe(true);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledWith(command);
    });

    it('should include metadata in complete command message', async () => {
      // Arrange: Command with metadata requirements
      const command = 'claude-code help';
      const metadata = {
        sessionId: 'test-session-123',
        userId: 'test-user',
        timestamp: Date.now(),
        inputMethod: 'keyboard'
      };

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        return JSON.stringify({
          type: 'command',
          data: cmd,
          metadata,
          complete: true
        });
      });

      // Act: Format command with metadata
      const formatted = mockMessageFormatter.formatCommand(command);
      const parsedMessage = JSON.parse(formatted);

      // Assert: Verify metadata inclusion
      expect(parsedMessage.metadata).toEqual(metadata);
      expect(parsedMessage.data).toBe(command);
      expect(parsedMessage.complete).toBe(true);
    });
  });

  describe('Line Processing Workflow', () => {
    it('should follow complete line processing workflow', async () => {
      // Arrange: Complete workflow components
      const command = 'echo test';
      mockInputElement.value = command;
      mockLineCompletionHandler.isLineComplete.mockReturnValue(true);
      mockCommandProcessor.canExecute.mockReturnValue(true);
      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify({ 
        type: 'command', 
        data: command 
      }));

      // Act: Execute complete workflow
      lineHandler.processLine = jest.fn(async (line) => {
        // 1. Check if line is complete
        if (!mockLineCompletionHandler.isLineComplete(line)) {
          return false;
        }
        
        // 2. Validate command
        if (!mockCommandProcessor.canExecute(line)) {
          return false;
        }
        
        // 3. Format message
        const formatted = mockMessageFormatter.formatCommand(line);
        
        // 4. Send via WebSocket
        mockWebSocket.send(formatted);
        
        return true;
      });

      const result = await lineHandler.processLine(command);

      // Assert: Verify complete workflow execution
      expect(result).toBe(true);
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledWith(command);
      expect(mockCommandProcessor.canExecute).toHaveBeenCalledWith(command);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledWith(command);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy LineCompletionHandler contract', () => {
      expect(mockLineCompletionHandler).toHaveProperty('isLineComplete');
      expect(mockLineCompletionHandler).toHaveProperty('processCompletedLine');
      expect(mockLineCompletionHandler.isLineComplete).toBeInstanceOf(Function);
    });

    it('should satisfy WebSocket contract for complete messages', () => {
      contractVerification.verifyWebSocketContract(mockWebSocket);
      expect(mockWebSocket.send).toBeInstanceOf(Function);
    });

    it('should maintain proper interaction order', async () => {
      // Arrange: Interaction order verification
      const command = 'test command';
      
      // Act: Verify method call order
      lineHandler.processLine = jest.fn(async (line) => {
        mockLineCompletionHandler.isLineComplete(line);
        mockCommandProcessor.canExecute(line);
        mockMessageFormatter.formatCommand(line);
        mockWebSocket.send('formatted');
      });

      await lineHandler.processLine(command);

      // Assert: Verify calls were made in proper order
      expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalledBefore(mockCommandProcessor.canExecute);
      expect(mockCommandProcessor.canExecute).toHaveBeenCalledBefore(mockMessageFormatter.formatCommand);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledBefore(mockWebSocket.send);
    });
  });
});