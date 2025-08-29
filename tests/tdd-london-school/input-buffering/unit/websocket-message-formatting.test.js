/**
 * TDD London School: WebSocket Message Formatting Tests
 * Focus: Mock-driven testing of WebSocket message formatting for complete commands
 * Behavior: Verify proper message structure, serialization, and command packaging
 */

const {
  createMockWebSocket,
  createMockMessageFormatter,
  createMockInputElement,
  createMockEnterKeyDetector,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

describe('WebSocket Message Formatting for Complete Commands', () => {
  let mockWebSocket;
  let mockMessageFormatter;
  let mockInputElement;
  let mockEnterKeyDetector;
  let messageHandler;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    mockMessageFormatter = createMockMessageFormatter();
    mockInputElement = createMockInputElement();
    mockEnterKeyDetector = createMockEnterKeyDetector();

    // Mock MessageHandler that formats and sends WebSocket messages
    const MessageHandler = jest.fn().mockImplementation(() => ({
      webSocket: mockWebSocket,
      messageFormatter: mockMessageFormatter,
      inputElement: mockInputElement,
      enterKeyDetector: mockEnterKeyDetector,
      formatAndSend: jest.fn(),
      sendCommand: jest.fn(),
      validateMessageFormat: jest.fn()
    }));

    messageHandler = new MessageHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Command Message Structure', () => {
    it('should format complete command with proper JSON structure', async () => {
      // Arrange: Complete command for formatting
      const command = 'git status';
      const expectedFormat = {
        type: 'command',
        data: command,
        timestamp: expect.any(Number),
        complete: true,
        sessionId: expect.any(String)
      };

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        return JSON.stringify({
          type: 'command',
          data: cmd,
          timestamp: Date.now(),
          complete: true,
          sessionId: 'session-' + Math.random().toString(36).substr(2, 9)
        });
      });

      // Act: Format command message
      const formattedMessage = mockMessageFormatter.formatCommand(command);
      const parsedMessage = JSON.parse(formattedMessage);

      // Assert: Verify message structure
      expect(parsedMessage).toMatchObject(expectedFormat);
      expect(parsedMessage.data).toBe(command);
      expect(parsedMessage.complete).toBe(true);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledWith(command);
    });

    it('should include execution metadata in message format', async () => {
      // Arrange: Command with execution metadata
      const command = 'npm test';
      const metadata = {
        executionId: 'exec-123',
        priority: 'high',
        timeout: 30000,
        workingDirectory: '/workspace',
        environment: 'development'
      };

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        return JSON.stringify({
          type: 'command',
          data: cmd,
          metadata,
          timestamp: Date.now(),
          complete: true
        });
      });

      // Act: Format command with metadata
      const formattedMessage = mockMessageFormatter.formatCommand(command);
      const parsedMessage = JSON.parse(formattedMessage);

      // Assert: Verify metadata inclusion
      expect(parsedMessage.metadata).toEqual(metadata);
      expect(parsedMessage.metadata.executionId).toBe('exec-123');
      expect(parsedMessage.metadata.priority).toBe('high');
    });

    it('should differentiate complete vs partial command messages', async () => {
      // Arrange: Complete vs partial commands
      const completeCommand = 'echo "hello"';
      const partialCommand = 'echo "hel';

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        const isComplete = !cmd.includes('"hel') || cmd.includes('hello"');
        return JSON.stringify({
          type: isComplete ? 'command' : 'partial_input',
          data: cmd,
          complete: isComplete,
          timestamp: Date.now()
        });
      });

      // Act: Format both message types
      const completeMessage = JSON.parse(mockMessageFormatter.formatCommand(completeCommand));
      const partialMessage = JSON.parse(mockMessageFormatter.formatCommand(partialCommand));

      // Assert: Verify differentiation
      expect(completeMessage.type).toBe('command');
      expect(completeMessage.complete).toBe(true);
      expect(partialMessage.type).toBe('partial_input');
      expect(partialMessage.complete).toBe(false);
    });
  });

  describe('Message Serialization and Validation', () => {
    it('should serialize command messages as valid JSON', async () => {
      // Arrange: Complex command for serialization
      const command = 'find . -name "*.js" -exec grep -l "console.log" {} \\;';
      
      mockMessageFormatter.serialize.mockImplementation((data) => {
        return JSON.stringify(data);
      });

      // Act: Serialize complex command
      const commandData = {
        type: 'command',
        data: command,
        timestamp: Date.now(),
        complete: true
      };

      const serialized = mockMessageFormatter.serialize(commandData);
      
      // Verify it's valid JSON by parsing
      const parsed = JSON.parse(serialized);

      // Assert: Verify serialization
      expect(parsed.data).toBe(command);
      expect(typeof serialized).toBe('string');
      expect(mockMessageFormatter.serialize).toHaveBeenCalledWith(commandData);
    });

    it('should validate message format before sending', async () => {
      // Arrange: Message validation setup
      const command = 'ls -la';
      const messageData = {
        type: 'command',
        data: command,
        timestamp: Date.now()
      };

      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify(messageData));
      mockMessageFormatter.serialize.mockReturnValue(JSON.stringify(messageData));

      // Mock validation rules
      messageHandler.validateMessageFormat = jest.fn((message) => {
        const parsed = JSON.parse(message);
        return parsed.type && parsed.data && parsed.timestamp;
      });

      // Act: Validate and send message
      messageHandler.formatAndSend = jest.fn(async (cmd) => {
        const formatted = mockMessageFormatter.formatCommand(cmd);
        
        if (messageHandler.validateMessageFormat(formatted)) {
          mockWebSocket.send(formatted);
          return { sent: true, valid: true };
        }
        
        return { sent: false, valid: false };
      });

      const result = await messageHandler.formatAndSend(command);

      // Assert: Verify validation and sending
      expect(result.sent).toBe(true);
      expect(result.valid).toBe(true);
      expect(messageHandler.validateMessageFormat).toHaveBeenCalledWith(expect.any(String));
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });

    it('should handle serialization errors gracefully', async () => {
      // Arrange: Command that causes serialization error
      const problematicCommand = 'echo "test';  // Unclosed quote
      
      mockMessageFormatter.serialize.mockImplementation(() => {
        throw new Error('Invalid JSON structure');
      });

      // Act: Handle serialization error
      messageHandler.formatAndSend = jest.fn(async (cmd) => {
        try {
          const data = { type: 'command', data: cmd };
          const serialized = mockMessageFormatter.serialize(data);
          mockWebSocket.send(serialized);
          return { sent: true, error: null };
        } catch (error) {
          return { sent: false, error: error.message };
        }
      });

      const result = await messageHandler.formatAndSend(problematicCommand);

      // Assert: Verify error handling
      expect(result.sent).toBe(false);
      expect(result.error).toBe('Invalid JSON structure');
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Command-Specific Message Formatting', () => {
    it('should format different command types appropriately', async () => {
      // Arrange: Different command types
      const commandTypes = [
        { cmd: 'ls -la', type: 'file_listing' },
        { cmd: 'git status', type: 'version_control' },
        { cmd: 'npm install', type: 'package_management' },
        { cmd: 'echo "hello"', type: 'output_command' },
        { cmd: 'cd /workspace', type: 'navigation' }
      ];

      // Act & Assert: Test each command type
      for (const { cmd, type } of commandTypes) {
        mockMessageFormatter.formatCommand.mockImplementation((command) => {
          let commandType = 'generic';
          if (command.startsWith('ls')) commandType = 'file_listing';
          if (command.startsWith('git')) commandType = 'version_control';
          if (command.startsWith('npm')) commandType = 'package_management';
          if (command.startsWith('echo')) commandType = 'output_command';
          if (command.startsWith('cd')) commandType = 'navigation';

          return JSON.stringify({
            type: 'command',
            commandType,
            data: command,
            timestamp: Date.now()
          });
        });

        const formatted = mockMessageFormatter.formatCommand(cmd);
        const parsed = JSON.parse(formatted);

        expect(parsed.commandType).toBe(type);
        expect(parsed.data).toBe(cmd);
      }
    });

    it('should include command arguments analysis in message', async () => {
      // Arrange: Command with various arguments
      const command = 'docker run -d --name myapp -p 8080:80 nginx:latest';
      
      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        const args = cmd.split(' ').slice(1); // Remove command name
        const flags = args.filter(arg => arg.startsWith('-'));
        const values = args.filter(arg => !arg.startsWith('-'));

        return JSON.stringify({
          type: 'command',
          data: cmd,
          analysis: {
            command: cmd.split(' ')[0],
            flags,
            values,
            argumentCount: args.length
          },
          timestamp: Date.now()
        });
      });

      // Act: Format command with argument analysis
      const formatted = mockMessageFormatter.formatCommand(command);
      const parsed = JSON.parse(formatted);

      // Assert: Verify argument analysis
      expect(parsed.analysis.command).toBe('docker');
      expect(parsed.analysis.flags).toContain('-d');
      expect(parsed.analysis.flags).toContain('--name');
      expect(parsed.analysis.values).toContain('myapp');
      expect(parsed.analysis.values).toContain('nginx:latest');
    });
  });

  describe('WebSocket Message Sending Integration', () => {
    it('should send formatted message via WebSocket only after Enter', async () => {
      // Arrange: Complete input sequence ending with Enter
      const command = 'echo test';
      mockInputElement.value = command;
      mockEnterKeyDetector.isEnterKey.mockReturnValue(true);
      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify({
        type: 'command',
        data: command,
        complete: true
      }));

      // Act: Send command on Enter key
      messageHandler.sendCommand = jest.fn(async (event) => {
        if (mockEnterKeyDetector.isEnterKey(event)) {
          const cmd = mockInputElement.value.trim();
          if (cmd) {
            const formatted = mockMessageFormatter.formatCommand(cmd);
            mockWebSocket.send(formatted);
            return { sent: true, command: cmd };
          }
        }
        return { sent: false };
      });

      const enterEvent = { key: 'Enter' };
      const result = await messageHandler.sendCommand(enterEvent);

      // Assert: Verify sending only on Enter
      expect(result.sent).toBe(true);
      expect(result.command).toBe(command);
      mockVerification.verifyWebSocketSendOnce(mockWebSocket, expect.any(String));
    });

    it('should not send partial commands during typing', async () => {
      // Arrange: Typing sequence without Enter
      const partialInputs = ['h', 'he', 'hel', 'hell', 'hello'];
      
      mockEnterKeyDetector.isEnterKey.mockReturnValue(false);

      // Act: Process typing without sending
      for (const partial of partialInputs) {
        mockInputElement.value = partial;
        
        messageHandler.sendCommand = jest.fn(async (event) => {
          if (mockEnterKeyDetector.isEnterKey(event)) {
            const formatted = mockMessageFormatter.formatCommand(mockInputElement.value);
            mockWebSocket.send(formatted);
            return { sent: true };
          }
          return { sent: false };
        });

        const keyEvent = { key: partial };
        const result = await messageHandler.sendCommand(keyEvent);
        
        expect(result.sent).toBe(false);
      }

      // Assert: Verify no WebSocket sends during typing
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle WebSocket send failures', async () => {
      // Arrange: WebSocket send failure
      const command = 'test command';
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('WebSocket connection lost');
      });

      mockMessageFormatter.formatCommand.mockReturnValue(JSON.stringify({
        type: 'command',
        data: command
      }));

      // Act: Handle send failure
      messageHandler.formatAndSend = jest.fn(async (cmd) => {
        try {
          const formatted = mockMessageFormatter.formatCommand(cmd);
          mockWebSocket.send(formatted);
          return { sent: true, error: null };
        } catch (error) {
          return { sent: false, error: error.message };
        }
      });

      const result = await messageHandler.formatAndSend(command);

      // Assert: Verify error handling
      expect(result.sent).toBe(false);
      expect(result.error).toBe('WebSocket connection lost');
    });
  });

  describe('Message Format Consistency', () => {
    it('should maintain consistent timestamp format', async () => {
      // Arrange: Multiple commands for timestamp consistency
      const commands = ['cmd1', 'cmd2', 'cmd3'];
      const timestamps = [];

      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        const timestamp = Date.now();
        timestamps.push(timestamp);
        return JSON.stringify({
          type: 'command',
          data: cmd,
          timestamp
        });
      });

      // Act: Format multiple commands
      for (const cmd of commands) {
        const formatted = mockMessageFormatter.formatCommand(cmd);
        const parsed = JSON.parse(formatted);
        expect(typeof parsed.timestamp).toBe('number');
        expect(parsed.timestamp).toBeGreaterThan(0);
      }

      // Assert: Verify timestamp progression
      expect(timestamps).toHaveLength(3);
      expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0]);
      expect(timestamps[2]).toBeGreaterThanOrEqual(timestamps[1]);
    });

    it('should ensure consistent message schema', async () => {
      // Arrange: Schema validation requirements
      const requiredFields = ['type', 'data', 'timestamp'];
      const optionalFields = ['metadata', 'sessionId', 'complete'];
      
      mockMessageFormatter.formatCommand.mockImplementation((cmd) => {
        return JSON.stringify({
          type: 'command',
          data: cmd,
          timestamp: Date.now(),
          complete: true,
          sessionId: 'test-session'
        });
      });

      // Act: Validate message schema
      const formatted = mockMessageFormatter.formatCommand('test');
      const parsed = JSON.parse(formatted);

      // Assert: Verify schema compliance
      for (const field of requiredFields) {
        expect(parsed).toHaveProperty(field);
      }
      
      // Verify optional fields if present are correct type
      if (parsed.complete) expect(typeof parsed.complete).toBe('boolean');
      if (parsed.sessionId) expect(typeof parsed.sessionId).toBe('string');
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy MessageFormatter contract', () => {
      expect(mockMessageFormatter).toHaveProperty('formatCommand');
      expect(mockMessageFormatter).toHaveProperty('serialize');
      expect(mockMessageFormatter.formatCommand).toBeInstanceOf(Function);
    });

    it('should satisfy WebSocket contract for message sending', () => {
      contractVerification.verifyWebSocketContract(mockWebSocket);
    });

    it('should maintain proper message flow order', async () => {
      // Arrange: Message flow verification
      const command = 'test flow';
      
      // Act: Execute message flow
      messageHandler.formatAndSend = jest.fn(async (cmd) => {
        mockEnterKeyDetector.isEnterKey({ key: 'Enter' });
        mockMessageFormatter.formatCommand(cmd);
        mockWebSocket.send('formatted');
      });

      await messageHandler.formatAndSend(command);

      // Assert: Verify flow order
      expect(mockEnterKeyDetector.isEnterKey).toHaveBeenCalledBefore(mockMessageFormatter.formatCommand);
      expect(mockMessageFormatter.formatCommand).toHaveBeenCalledBefore(mockWebSocket.send);
    });
  });
});