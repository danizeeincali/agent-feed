/**
 * TDD London School Test Suite: WebSocket Terminal Connection
 * 
 * Following London School (mockist) approach:
 * - Mock all external dependencies
 * - Focus on behavior verification over state testing
 * - Test object interactions and collaborations
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebSocketTerminal } from '../../services/WebSocketTerminal';
import { TerminalMessage, TerminalConnectionState } from '../../types/terminal';

// Mock WebSocket constructor
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

// Mock logger for behavior verification
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock retry manager for connection resilience
const mockRetryManager = {
  shouldRetry: jest.fn(),
  getNextDelay: jest.fn(),
  reset: jest.fn(),
  incrementAttempt: jest.fn()
};

// Mock message handler for terminal output
const mockMessageHandler = {
  handleOutput: jest.fn(),
  handleError: jest.fn(),
  handleConnectionStatus: jest.fn(),
  handleCommandResult: jest.fn()
};

// Mock connection manager for WebSocket lifecycle
const mockConnectionManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  getConnectionState: jest.fn(),
  isConnected: jest.fn()
};

describe('WebSocketTerminal - London School TDD', () => {
  let terminal: WebSocketTerminal;
  let mockWebSocketConstructor: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock WebSocket constructor
    mockWebSocketConstructor = jest.fn(() => mockWebSocket);
    (global as any).WebSocket = mockWebSocketConstructor;
    
    // Create terminal with mocked dependencies
    terminal = new WebSocketTerminal({
      logger: mockLogger,
      retryManager: mockRetryManager,
      messageHandler: mockMessageHandler,
      connectionManager: mockConnectionManager
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Connection Establishment', () => {
    it('should coordinate with connection manager during connection establishment', async () => {
      // Given
      const connectionUrl = 'ws://localhost:3001/terminal';
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      mockConnectionManager.getConnectionState.mockReturnValue('connected');

      // When
      await terminal.connect(connectionUrl);

      // Then - Verify the conversation between objects
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(connectionUrl);
      expect(mockLogger.info).toHaveBeenCalledWith('Terminal connection initiated', { url: connectionUrl });
    });

    it('should handle connection manager failure gracefully', async () => {
      // Given
      const connectionUrl = 'ws://localhost:3001/terminal';
      const connectionError = new Error('Connection failed');
      mockConnectionManager.connect.mockRejectedValue(connectionError);

      // When & Then
      await expect(terminal.connect(connectionUrl)).rejects.toThrow('Connection failed');
      
      // Verify error handling collaboration
      expect(mockLogger.error).toHaveBeenCalledWith('Terminal connection failed', { 
        error: connectionError.message 
      });
    });

    it('should register event listeners after successful connection', async () => {
      // Given
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      
      // When
      await terminal.connect('ws://localhost:3001/terminal');

      // Then - Verify WebSocket event listener registration
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should notify message handler of connection status changes', async () => {
      // Given
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      
      // When
      await terminal.connect('ws://localhost:3001/terminal');
      
      // Simulate open event
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();

      // Then
      expect(mockMessageHandler.handleConnectionStatus).toHaveBeenCalledWith('connected');
    });
  });

  describe('Message Passing', () => {
    beforeEach(async () => {
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      mockConnectionManager.isConnected.mockReturnValue(true);
      await terminal.connect('ws://localhost:3001/terminal');
    });

    it('should coordinate command execution through WebSocket and message handler', async () => {
      // Given
      const command = 'ls -la';
      const expectedMessage: TerminalMessage = {
        type: 'command',
        data: command,
        timestamp: expect.any(Number),
        sessionId: expect.any(String)
      };

      // When
      await terminal.executeCommand(command);

      // Then - Verify the message passing collaboration
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(expectedMessage));
      expect(mockLogger.debug).toHaveBeenCalledWith('Command sent to terminal', { command });
    });

    it('should handle incoming messages through message handler collaboration', async () => {
      // Given
      const incomingMessage: TerminalMessage = {
        type: 'output',
        data: 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .',
        timestamp: Date.now(),
        sessionId: 'test-session'
      };
      
      // When - Simulate incoming message
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      messageHandler({ data: JSON.stringify(incomingMessage) });

      // Then
      expect(mockMessageHandler.handleOutput).toHaveBeenCalledWith(incomingMessage.data);
    });

    it('should handle error messages through proper error collaboration', async () => {
      // Given
      const errorMessage: TerminalMessage = {
        type: 'error',
        data: 'Command not found: invalid-command',
        timestamp: Date.now(),
        sessionId: 'test-session'
      };
      
      // When
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      messageHandler({ data: JSON.stringify(errorMessage) });

      // Then
      expect(mockMessageHandler.handleError).toHaveBeenCalledWith(errorMessage.data);
      expect(mockLogger.warn).toHaveBeenCalledWith('Terminal error received', { 
        error: errorMessage.data 
      });
    });

    it('should reject command execution when not connected', async () => {
      // Given
      mockConnectionManager.isConnected.mockReturnValue(false);

      // When & Then
      await expect(terminal.executeCommand('ls')).rejects.toThrow('Terminal not connected');
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Retries', () => {
    it('should coordinate with retry manager on connection errors', async () => {
      // Given
      const connectionError = new Error('Network error');
      mockConnectionManager.connect
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce(mockWebSocket);
      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.getNextDelay.mockReturnValue(1000);

      // When
      const connectPromise = terminal.connect('ws://localhost:3001/terminal');

      // Then - Verify retry coordination
      await expect(connectPromise).rejects.toThrow('Network error');
      expect(mockRetryManager.shouldRetry).toHaveBeenCalled();
      expect(mockRetryManager.incrementAttempt).toHaveBeenCalled();
    });

    it('should handle WebSocket error events through error collaboration', async () => {
      // Given
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      await terminal.connect('ws://localhost:3001/terminal');
      
      const websocketError = { message: 'WebSocket error' };

      // When
      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorHandler(websocketError);

      // Then
      expect(mockMessageHandler.handleError).toHaveBeenCalledWith('WebSocket connection error');
      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket error', websocketError);
    });

    it('should coordinate reconnection attempts on close events', async () => {
      // Given
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      await terminal.connect('ws://localhost:3001/terminal');
      
      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.getNextDelay.mockReturnValue(2000);

      // When
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      closeHandler({ code: 1006, reason: 'Connection lost' });

      // Then
      expect(mockMessageHandler.handleConnectionStatus).toHaveBeenCalledWith('disconnected');
      expect(mockRetryManager.shouldRetry).toHaveBeenCalled();
    });

    it('should stop retrying when retry manager says no', async () => {
      // Given
      mockConnectionManager.connect.mockRejectedValue(new Error('Persistent failure'));
      mockRetryManager.shouldRetry.mockReturnValue(false);

      // When
      await expect(terminal.connect('ws://localhost:3001/terminal')).rejects.toThrow('Persistent failure');

      // Then
      expect(mockRetryManager.shouldRetry).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Terminal connection failed permanently');
    });
  });

  describe('Command Execution Workflow', () => {
    beforeEach(async () => {
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      mockConnectionManager.isConnected.mockReturnValue(true);
      await terminal.connect('ws://localhost:3001/terminal');
    });

    it('should coordinate complete command execution workflow', async () => {
      // Given
      const command = 'npm test';
      const commandResult = 'Tests passed: 15, Failed: 0';
      
      // When
      const executionPromise = terminal.executeCommand(command);
      
      // Simulate command result message
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      messageHandler({ 
        data: JSON.stringify({
          type: 'command_result',
          data: commandResult,
          timestamp: Date.now(),
          sessionId: 'test-session'
        })
      });

      await executionPromise;

      // Then - Verify complete workflow
      expect(mockWebSocket.send).toHaveBeenCalled();
      expect(mockMessageHandler.handleCommandResult).toHaveBeenCalledWith(commandResult);
      expect(mockLogger.debug).toHaveBeenCalledWith('Command sent to terminal', { command });
    });

    it('should handle command timeout through proper collaboration', async () => {
      // Given
      const command = 'long-running-command';
      jest.useFakeTimers();

      // When
      const executionPromise = terminal.executeCommand(command, { timeout: 5000 });
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(6000);

      // Then
      await expect(executionPromise).rejects.toThrow('Command execution timeout');
      expect(mockLogger.warn).toHaveBeenCalledWith('Command execution timeout', { 
        command, 
        timeout: 5000 
      });

      jest.useRealTimers();
    });
  });

  describe('Connection Lifecycle Management', () => {
    it('should coordinate proper cleanup on disconnect', async () => {
      // Given
      mockConnectionManager.connect.mockResolvedValue(mockWebSocket);
      await terminal.connect('ws://localhost:3001/terminal');

      // When
      await terminal.disconnect();

      // Then
      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Terminal disconnected');
    });

    it('should coordinate state management through connection manager', () => {
      // Given
      const expectedState: TerminalConnectionState = 'connected';
      mockConnectionManager.getConnectionState.mockReturnValue(expectedState);

      // When
      const actualState = terminal.getConnectionState();

      // Then
      expect(mockConnectionManager.getConnectionState).toHaveBeenCalled();
      expect(actualState).toBe(expectedState);
    });
  });
});