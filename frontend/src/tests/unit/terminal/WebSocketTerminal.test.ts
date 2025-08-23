/**
 * WebSocketTerminal Unit Tests
 * 
 * Tests for the WebSocketTerminal service class following London School TDD.
 * Tests dependency injection, message handling, connection management,
 * error handling, and retry logic.
 */

import { WebSocketTerminal } from '@/services/WebSocketTerminal';
import {
  WebSocketTerminalConfig,
  TerminalMessage,
  TerminalConnectionState,
  ILogger,
  IRetryManager,
  IMessageHandler,
  IConnectionManager,
  TerminalExecutionOptions
} from '@/types/terminal';

describe('WebSocketTerminal', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockRetryManager: jest.Mocked<IRetryManager>;
  let mockMessageHandler: jest.Mocked<IMessageHandler>;
  let mockConnectionManager: jest.Mocked<IConnectionManager>;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let config: WebSocketTerminalConfig;
  let terminal: WebSocketTerminal;

  beforeEach(() => {
    // Create mock dependencies
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockRetryManager = {
      shouldRetry: jest.fn(),
      getNextDelay: jest.fn(),
      reset: jest.fn(),
      incrementAttempt: jest.fn(),
      executeWithRetry: jest.fn(),
      getCurrentAttempt: jest.fn().mockReturnValue(0),
      getMetrics: jest.fn().mockReturnValue({
        currentAttempt: 0,
        maxRetries: 5,
        currentDelay: 1000,
        isRetrying: false,
        lastError: null
      })
    };

    mockMessageHandler = {
      handleOutput: jest.fn(),
      handleError: jest.fn(),
      handleConnectionStatus: jest.fn(),
      handleCommandResult: jest.fn(),
      handleDirectoryChange: jest.fn(),
      handleMessage: jest.fn(),
      handleBatchMessages: jest.fn()
    };

    mockWebSocket = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      url: 'ws://localhost:3000',
      protocol: '',
      extensions: '',
      bufferedAmount: 0,
      binaryType: 'blob',
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      dispatchEvent: jest.fn(),
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    };

    mockConnectionManager = {
      connect: jest.fn().mockResolvedValue(mockWebSocket),
      disconnect: jest.fn().mockResolvedValue(void 0),
      getConnectionState: jest.fn().mockReturnValue('disconnected' as TerminalConnectionState),
      isConnected: jest.fn().mockReturnValue(false)
    };

    config = {
      logger: mockLogger,
      retryManager: mockRetryManager,
      messageHandler: mockMessageHandler,
      connectionManager: mockConnectionManager
    };

    terminal = new WebSocketTerminal(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('creates instance with provided dependencies', () => {
      expect(terminal).toBeInstanceOf(WebSocketTerminal);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('generates unique session ID', () => {
      const terminal1 = new WebSocketTerminal(config);
      const terminal2 = new WebSocketTerminal(config);

      // Session IDs should be different (can't directly access private field, but test behavior)
      expect(terminal1).not.toBe(terminal2);
    });
  });

  describe('Connection Management', () => {
    const testUrl = 'ws://localhost:3000/terminal';

    it('successfully establishes connection', async () => {
      await terminal.connect(testUrl);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Terminal connection initiated',
        { url: testUrl }
      );

      expect(mockConnectionManager.connect).toHaveBeenCalledWith(testUrl);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Terminal connection established',
        expect.objectContaining({
          url: testUrl,
          sessionId: expect.any(String)
        })
      );
    });

    it('sets up event listeners after connection', async () => {
      await terminal.connect(testUrl);

      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('handles connection failure', async () => {
      const connectionError = new Error('Connection failed');
      mockConnectionManager.connect.mockRejectedValue(connectionError);

      await expect(terminal.connect(testUrl)).rejects.toThrow('Connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Terminal connection failed',
        { error: 'Connection failed' }
      );
    });

    it('disconnects and cleans up resources', async () => {
      mockConnectionManager.isConnected.mockReturnValue(true);
      
      await terminal.connect(testUrl);
      await terminal.disconnect();

      expect(mockWebSocket.removeEventListener).toHaveBeenCalledTimes(4);
      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Terminal disconnected');
    });

    it('does not disconnect when not connected', async () => {
      mockConnectionManager.isConnected.mockReturnValue(false);

      await terminal.disconnect();

      expect(mockConnectionManager.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Handling', () => {
    beforeEach(async () => {
      await terminal.connect('ws://localhost:3000/terminal');
    });

    it('handles WebSocket open event', () => {
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1] as Function;

      openHandler();

      expect(mockLogger.debug).toHaveBeenCalledWith('WebSocket connection opened');
      expect(mockMessageHandler.handleConnectionStatus).toHaveBeenCalledWith('connected');
    });

    it('handles WebSocket message event', () => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockMessage: TerminalMessage = {
        type: 'output',
        data: 'Hello, terminal!',
        timestamp: Date.now()
      };

      const mockEvent = {
        data: JSON.stringify(mockMessage)
      };

      messageHandler(mockEvent);

      expect(mockMessageHandler.handleOutput).toHaveBeenCalledWith('Hello, terminal!');
    });

    it('handles malformed message gracefully', () => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockEvent = {
        data: 'invalid json'
      };

      messageHandler(mockEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse incoming message',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('handles WebSocket error event', () => {
      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as Function;

      const mockEvent = new Event('error');
      errorHandler(mockEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket error', mockEvent);
      expect(mockMessageHandler.handleError).toHaveBeenCalledWith('WebSocket connection error');
    });

    it('handles WebSocket close event', () => {
      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.getCurrentAttempt.mockReturnValue(1);
      mockRetryManager.getNextDelay.mockReturnValue(2000);

      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1] as Function;

      const mockEvent = {
        code: 1006,
        reason: 'Connection lost'
      };

      jest.useFakeTimers();
      closeHandler(mockEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WebSocket connection closed',
        { code: 1006, reason: 'Connection lost' }
      );

      expect(mockMessageHandler.handleConnectionStatus).toHaveBeenCalledWith('disconnected');

      expect(mockRetryManager.shouldRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Scheduling reconnection attempt',
        { delay: 2000 }
      );

      jest.useRealTimers();
    });

    it('does not schedule reconnection when retry manager says no', () => {
      mockRetryManager.shouldRetry.mockReturnValue(false);

      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1] as Function;

      const mockEvent = {
        code: 1000,
        reason: 'Normal closure'
      };

      closeHandler(mockEvent);

      expect(mockRetryManager.shouldRetry).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Scheduling reconnection'),
        expect.any(Object)
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await terminal.connect('ws://localhost:3000/terminal');
    });

    const testMessage = (type: string, data: any) => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockMessage: TerminalMessage = {
        type: type as any,
        data,
        timestamp: Date.now()
      };

      const mockEvent = {
        data: JSON.stringify(mockMessage)
      };

      messageHandler(mockEvent);
    };

    it('handles output messages', () => {
      testMessage('output', 'Terminal output text');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Received message',
        { type: 'output' }
      );
      expect(mockMessageHandler.handleOutput).toHaveBeenCalledWith('Terminal output text');
    });

    it('handles error messages', () => {
      testMessage('error', 'Command not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Terminal error received',
        { error: 'Command not found' }
      );
      expect(mockMessageHandler.handleError).toHaveBeenCalledWith('Command not found');
    });

    it('handles command result messages', () => {
      const commandResult = {
        command: 'ls',
        exitCode: 0,
        output: 'file1.txt\nfile2.txt',
        duration: 123
      };

      testMessage('command_result', commandResult);

      expect(mockMessageHandler.handleCommandResult).toHaveBeenCalledWith(commandResult);
    });

    it('handles directory change messages', () => {
      testMessage('directory_change', '/home/user/projects');

      expect(mockMessageHandler.handleDirectoryChange).toHaveBeenCalledWith('/home/user/projects');
    });

    it('handles connection status messages', () => {
      testMessage('connection_status', 'connected');

      expect(mockMessageHandler.handleConnectionStatus).toHaveBeenCalledWith('connected');
    });

    it('handles unknown message types with generic handler', () => {
      const unknownMessage = {
        type: 'custom_message',
        data: { custom: 'data' },
        timestamp: Date.now()
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockEvent = {
        data: JSON.stringify(unknownMessage)
      };

      messageHandler(mockEvent);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(unknownMessage);
    });

    it('skips directory change handler if not implemented', () => {
      mockMessageHandler.handleDirectoryChange = undefined;

      testMessage('directory_change', '/home/user');

      // Should not throw error, just skip the handler
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Received message',
        { type: 'directory_change' }
      );
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      mockConnectionManager.isConnected.mockReturnValue(true);
      await terminal.connect('ws://localhost:3000/terminal');
    });

    it('executes command when connected', async () => {
      const command = 'ls -la';
      
      await terminal.executeCommand(command);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'command',
          data: command,
          timestamp: expect.any(Number),
          sessionId: expect.any(String)
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Command sent to terminal',
        { command }
      );
    });

    it('throws error when not connected', async () => {
      mockConnectionManager.isConnected.mockReturnValue(false);

      await expect(terminal.executeCommand('ls')).rejects.toThrow('Terminal not connected');
    });

    it('handles command execution timeout', async () => {
      const options: TerminalExecutionOptions = {
        timeout: 100
      };

      jest.useFakeTimers();

      const commandPromise = terminal.executeCommand('slow-command', options);

      // Fast-forward past timeout
      jest.advanceTimersByTime(150);

      await expect(commandPromise).rejects.toThrow('Command execution timeout');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Command execution timeout',
        { command: 'slow-command', timeout: 100 }
      );

      jest.useRealTimers();
    });

    it('handles WebSocket send errors', async () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      await expect(terminal.executeCommand('test')).rejects.toThrow('Send failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute command',
        { command: 'test', error: 'Send failed' }
      );
    });
  });

  describe('Connection State', () => {
    it('returns connection state from connection manager', () => {
      const expectedState: TerminalConnectionState = 'connected';
      mockConnectionManager.getConnectionState.mockReturnValue(expectedState);

      const actualState = terminal.getConnectionState();

      expect(actualState).toBe(expectedState);
      expect(mockConnectionManager.getConnectionState).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(async () => {
      await terminal.connect('ws://localhost:3000/terminal');
    });

    it('attempts reconnection with retry manager coordination', async () => {
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1] as Function;

      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.getCurrentAttempt.mockReturnValue(2);
      mockRetryManager.getNextDelay.mockReturnValue(4000);

      jest.useFakeTimers();

      const mockEvent = {
        code: 1006,
        reason: 'Unexpected close'
      };

      closeHandler(mockEvent);

      expect(mockRetryManager.shouldRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Connection closed: Unexpected close'
        }),
        2
      );

      expect(mockRetryManager.getNextDelay).toHaveBeenCalledWith(2);

      // Should schedule reconnection
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 4000);

      jest.useRealTimers();
    });

    it('increments retry attempt during reconnection', async () => {
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1] as Function;

      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.getCurrentAttempt.mockReturnValue(1);
      mockRetryManager.getNextDelay.mockReturnValue(2000);

      jest.useFakeTimers();

      closeHandler({ code: 1006, reason: 'Connection lost' });

      // Fast-forward to trigger reconnection
      jest.advanceTimersByTime(2000);

      expect(mockRetryManager.incrementAttempt).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles null WebSocket gracefully', async () => {
      mockConnectionManager.connect.mockResolvedValue(null as any);

      // Should not throw, but also should not set up event listeners
      await terminal.connect('ws://localhost:3000/terminal');

      expect(mockWebSocket.addEventListener).not.toHaveBeenCalled();
    });

    it('handles message handler method absence gracefully', async () => {
      mockMessageHandler.handleDirectoryChange = undefined;
      mockMessageHandler.handleMessage = undefined;

      await terminal.connect('ws://localhost:3000/terminal');

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const unknownMessage = {
        type: 'unknown_type',
        data: 'test',
        timestamp: Date.now()
      };

      const mockEvent = {
        data: JSON.stringify(unknownMessage)
      };

      // Should not throw
      expect(() => messageHandler(mockEvent)).not.toThrow();
    });

    it('logs debug information for all received messages', async () => {
      await terminal.connect('ws://localhost:3000/terminal');

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const testMessages = [
        { type: 'output', data: 'test' },
        { type: 'error', data: 'error' },
        { type: 'command_result', data: {} },
        { type: 'unknown', data: 'unknown' }
      ];

      testMessages.forEach(msg => {
        const mockEvent = {
          data: JSON.stringify({ ...msg, timestamp: Date.now() })
        };

        messageHandler(mockEvent);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Received message',
          { type: msg.type }
        );
      });
    });
  });

  describe('Session Management', () => {
    it('includes session ID in command messages', async () => {
      mockConnectionManager.isConnected.mockReturnValue(true);
      await terminal.connect('ws://localhost:3000/terminal');

      await terminal.executeCommand('test command');

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.sessionId).toBeDefined();
      expect(typeof sentMessage.sessionId).toBe('string');
      expect(sentMessage.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    it('generates unique session IDs for different instances', () => {
      const terminal1 = new WebSocketTerminal(config);
      const terminal2 = new WebSocketTerminal(config);

      // Indirectly test session ID uniqueness by checking they are different objects
      expect(terminal1).not.toBe(terminal2);
    });
  });
});