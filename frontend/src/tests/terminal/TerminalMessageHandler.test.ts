/**
 * TDD London School Test Suite: Terminal Message Handler
 * 
 * Focus on testing the collaborations between message handlers and their dependencies
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { TerminalMessageHandler } from '../../services/TerminalMessageHandler';
import { TerminalMessage, TerminalOutputType } from '../../types/terminal';

// Mock terminal output renderer
const mockOutputRenderer = {
  renderOutput: jest.fn(),
  renderError: jest.fn(),
  renderPrompt: jest.fn(),
  clearScreen: jest.fn(),
  scrollToBottom: jest.fn()
};

// Mock terminal state manager
const mockStateManager = {
  updateConnectionState: jest.fn(),
  updateCommandHistory: jest.fn(),
  getCurrentDirectory: jest.fn(),
  setCurrentDirectory: jest.fn(),
  getSessionId: jest.fn()
};

// Mock event emitter for notifications
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
};

// Mock analytics tracker
const mockAnalytics = {
  trackCommand: jest.fn(),
  trackError: jest.fn(),
  trackPerformance: jest.fn(),
  trackConnectionEvent: jest.fn()
};

describe('TerminalMessageHandler - London School TDD', () => {
  let messageHandler: TerminalMessageHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    messageHandler = new TerminalMessageHandler({
      outputRenderer: mockOutputRenderer,
      stateManager: mockStateManager,
      eventEmitter: mockEventEmitter,
      analytics: mockAnalytics
    });
  });

  describe('Output Message Handling', () => {
    it('should coordinate output rendering with proper formatting', () => {
      // Given
      const outputData = 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .';
      const expectedOutput = {
        content: outputData,
        type: 'stdout' as TerminalOutputType,
        timestamp: expect.any(Number)
      };

      // When
      messageHandler.handleOutput(outputData);

      // Then - Verify collaboration with renderer
      expect(mockOutputRenderer.renderOutput).toHaveBeenCalledWith(expectedOutput);
      expect(mockOutputRenderer.scrollToBottom).toHaveBeenCalled();
    });

    it('should coordinate with analytics when handling output', () => {
      // Given
      const outputData = 'Command completed successfully';

      // When
      messageHandler.handleOutput(outputData);

      // Then
      expect(mockAnalytics.trackPerformance).toHaveBeenCalledWith('output_processed', {
        contentLength: outputData.length,
        timestamp: expect.any(Number)
      });
    });

    it('should emit output events for other components', () => {
      // Given
      const outputData = 'Test output';

      // When
      messageHandler.handleOutput(outputData);

      // Then
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('terminal:output', {
        data: outputData,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Error Message Handling', () => {
    it('should coordinate error rendering with proper styling', () => {
      // Given
      const errorMessage = 'bash: command-not-found: command not found';
      const expectedError = {
        content: errorMessage,
        type: 'stderr' as TerminalOutputType,
        timestamp: expect.any(Number),
        isError: true
      };

      // When
      messageHandler.handleError(errorMessage);

      // Then
      expect(mockOutputRenderer.renderError).toHaveBeenCalledWith(expectedError);
      expect(mockOutputRenderer.scrollToBottom).toHaveBeenCalled();
    });

    it('should coordinate with analytics for error tracking', () => {
      // Given
      const errorMessage = 'Permission denied';

      // When
      messageHandler.handleError(errorMessage);

      // Then
      expect(mockAnalytics.trackError).toHaveBeenCalledWith('terminal_error', {
        message: errorMessage,
        timestamp: expect.any(Number)
      });
    });

    it('should emit error events for error boundary handling', () => {
      // Given
      const errorMessage = 'Critical terminal error';

      // When
      messageHandler.handleError(errorMessage);

      // Then
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('terminal:error', {
        error: errorMessage,
        timestamp: expect.any(Number),
        severity: 'error'
      });
    });
  });

  describe('Connection Status Handling', () => {
    it('should coordinate state updates with connection changes', () => {
      // Given
      const connectionStatus = 'connected';

      // When
      messageHandler.handleConnectionStatus(connectionStatus);

      // Then
      expect(mockStateManager.updateConnectionState).toHaveBeenCalledWith(connectionStatus);
      expect(mockAnalytics.trackConnectionEvent).toHaveBeenCalledWith('status_change', {
        status: connectionStatus,
        timestamp: expect.any(Number)
      });
    });

    it('should render connection status in terminal', () => {
      // Given
      const connectionStatus = 'disconnected';

      // When
      messageHandler.handleConnectionStatus(connectionStatus);

      // Then
      expect(mockOutputRenderer.renderOutput).toHaveBeenCalledWith({
        content: 'Terminal disconnected',
        type: 'system',
        timestamp: expect.any(Number),
        isSystemMessage: true
      });
    });

    it('should emit connection events for UI updates', () => {
      // Given
      const connectionStatus = 'connecting';

      // When
      messageHandler.handleConnectionStatus(connectionStatus);

      // Then
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('terminal:connection', {
        status: connectionStatus,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Command Result Handling', () => {
    it('should coordinate command completion with state management', () => {
      // Given
      const commandResult = {
        command: 'ls -la',
        exitCode: 0,
        output: 'file1.txt\nfile2.txt',
        duration: 150
      };

      // When
      messageHandler.handleCommandResult(commandResult);

      // Then
      expect(mockStateManager.updateCommandHistory).toHaveBeenCalledWith({
        command: commandResult.command,
        exitCode: commandResult.exitCode,
        timestamp: expect.any(Number),
        duration: commandResult.duration
      });
    });

    it('should coordinate analytics tracking for command performance', () => {
      // Given
      const commandResult = {
        command: 'npm test',
        exitCode: 0,
        output: 'All tests passed',
        duration: 2500
      };

      // When
      messageHandler.handleCommandResult(commandResult);

      // Then
      expect(mockAnalytics.trackCommand).toHaveBeenCalledWith({
        command: commandResult.command,
        exitCode: commandResult.exitCode,
        duration: commandResult.duration,
        timestamp: expect.any(Number)
      });
    });

    it('should render command completion status', () => {
      // Given
      const commandResult = {
        command: 'git status',
        exitCode: 0,
        output: 'On branch main',
        duration: 80
      };

      // When
      messageHandler.handleCommandResult(commandResult);

      // Then
      expect(mockOutputRenderer.renderPrompt).toHaveBeenCalledWith({
        directory: expect.any(String),
        exitCode: 0
      });
    });

    it('should handle command failures with proper error coordination', () => {
      // Given
      const commandResult = {
        command: 'invalid-command',
        exitCode: 127,
        output: '',
        error: 'command not found',
        duration: 10
      };

      // When
      messageHandler.handleCommandResult(commandResult);

      // Then
      expect(mockOutputRenderer.renderError).toHaveBeenCalledWith({
        content: commandResult.error,
        type: 'stderr',
        timestamp: expect.any(Number),
        isError: true
      });
      expect(mockAnalytics.trackError).toHaveBeenCalledWith('command_failed', {
        command: commandResult.command,
        exitCode: commandResult.exitCode,
        error: commandResult.error
      });
    });
  });

  describe('Directory Change Handling', () => {
    it('should coordinate directory updates with state manager', () => {
      // Given
      const newDirectory = '/home/user/projects';
      const directoryMessage = {
        type: 'directory_change',
        data: newDirectory
      };

      // When
      messageHandler.handleMessage(directoryMessage);

      // Then
      expect(mockStateManager.setCurrentDirectory).toHaveBeenCalledWith(newDirectory);
    });

    it('should render directory change in terminal', () => {
      // Given
      const newDirectory = '/var/log';
      mockStateManager.getCurrentDirectory.mockReturnValue(newDirectory);

      // When
      messageHandler.handleDirectoryChange(newDirectory);

      // Then
      expect(mockOutputRenderer.renderPrompt).toHaveBeenCalledWith({
        directory: newDirectory,
        exitCode: 0
      });
    });
  });

  describe('Message Processing Pipeline', () => {
    it('should coordinate complete message processing workflow', () => {
      // Given
      const terminalMessage: TerminalMessage = {
        type: 'output',
        data: 'Processing complete',
        timestamp: Date.now(),
        sessionId: 'test-session-123'
      };

      // When
      messageHandler.handleMessage(terminalMessage);

      // Then - Verify complete workflow coordination
      expect(mockOutputRenderer.renderOutput).toHaveBeenCalled();
      expect(mockOutputRenderer.scrollToBottom).toHaveBeenCalled();
      expect(mockAnalytics.trackPerformance).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('terminal:output', expect.any(Object));
    });

    it('should handle unknown message types gracefully', () => {
      // Given
      const unknownMessage = {
        type: 'unknown_type',
        data: 'some data'
      };

      // When
      messageHandler.handleMessage(unknownMessage);

      // Then
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('terminal:unknown_message', {
        message: unknownMessage,
        timestamp: expect.any(Number)
      });
    });

    it('should coordinate batch message processing', () => {
      // Given
      const messages: TerminalMessage[] = [
        { type: 'output', data: 'Line 1', timestamp: Date.now(), sessionId: 'test' },
        { type: 'output', data: 'Line 2', timestamp: Date.now(), sessionId: 'test' },
        { type: 'output', data: 'Line 3', timestamp: Date.now(), sessionId: 'test' }
      ];

      // When
      messageHandler.handleBatchMessages(messages);

      // Then
      expect(mockOutputRenderer.renderOutput).toHaveBeenCalledTimes(3);
      // Should only scroll once at the end for performance
      expect(mockOutputRenderer.scrollToBottom).toHaveBeenCalledTimes(1);
    });
  });
});