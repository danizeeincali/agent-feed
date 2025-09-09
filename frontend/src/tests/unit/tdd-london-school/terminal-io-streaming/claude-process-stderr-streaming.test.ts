/**
 * TDD London School Tests: Claude Process stderr Streaming via SSE
 * 
 * Focus: Testing error handling and stderr streaming collaboration patterns
 * between ClaudeProcessManager, ErrorHandler, and SSEStreamer for real stderr output.
 */

import { jest } from '@jest/globals';

describe('Claude Process stderr Streaming via SSE', () => {
  let mockClaudeProcess: any;
  let mockSSEStreamer: any;
  let mockErrorHandler: any;
  let mockTerminalInterface: any;
  let realClaudeErrors: string[];
  
  beforeEach(() => {
    mockClaudeProcess = {
      stderr: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      stdout: {
        on: jest.fn()
      },
      pid: 12345,
      kill: jest.fn()
    };

    mockSSEStreamer = {
      broadcastError: jest.fn(),
      sendTerminalOutput: jest.fn(),
      sendErrorAlert: jest.fn()
    };

    mockErrorHandler = {
      handleProcessError: jest.fn(),
      categorizeError: jest.fn(),
      shouldRetry: jest.fn()
    };

    mockTerminalInterface = {
      displayError: jest.fn(),
      highlightErrorOutput: jest.fn(),
      showErrorContext: jest.fn()
    };

    // Real Claude stderr output samples
    realClaudeErrors = [
      'Warning: API rate limit approaching\n',
      'Error: File not found: /invalid/path\n',
      'Claude CLI: Connection timeout after 30s\n',
      'Debug: Memory usage: 245MB\n'
    ];
  });

  describe('Real Claude Process stderr Streaming', () => {
    it('should stream Claude process stderr directly to frontend via SSE', async () => {
      const stderrStreamingManager = new StderrStreamingManager(
        mockSSEStreamer,
        mockErrorHandler
      );

      // Setup stderr event simulation
      mockClaudeProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          realClaudeErrors.forEach((error, index) => {
            setTimeout(() => callback(Buffer.from(error)), index * 15);
          });
        }
      });

      // Act: Start stderr monitoring
      await stderrStreamingManager.monitorProcess(mockClaudeProcess);

      // Assert: Verify stderr event handler setup
      expect(mockClaudeProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));

      // Wait for error events to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify SSE streaming of real stderr
      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stderr',
          data: 'Warning: API rate limit approaching\n',
          source: 'claude-process',
          level: 'warning'
        })
      );

      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stderr',
          data: 'Error: File not found: /invalid/path\n',
          source: 'claude-process',
          level: 'error'
        })
      );
    });

    it('should collaborate with ErrorHandler to categorize stderr output', async () => {
      const errorStreamCoordinator = new ErrorStreamCoordinator(
        mockClaudeProcess,
        mockSSEStreamer,
        mockErrorHandler
      );

      // Setup error categorization behavior
      mockErrorHandler.categorizeError.mockImplementation((error) => {
        if (error.includes('Warning')) return { level: 'warning', category: 'rate-limit' };
        if (error.includes('Error')) return { level: 'error', category: 'file-system' };
        if (error.includes('Debug')) return { level: 'debug', category: 'performance' };
        return { level: 'info', category: 'general' };
      });

      mockClaudeProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('Warning: API rate limit approaching\n'));
        }
      });

      // Act: Process stderr with coordination
      await errorStreamCoordinator.handleStderrOutput();

      // Assert: Verify collaboration sequence
      expect(mockErrorHandler.categorizeError).toHaveBeenCalledWith(
        'Warning: API rate limit approaching\n'
      );

      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stderr',
          level: 'warning',
          category: 'rate-limit'
        })
      );
    });

    it('should coordinate error display with terminal interface', async () => {
      const terminalErrorCoordinator = new TerminalErrorCoordinator(
        mockSSEStreamer,
        mockTerminalInterface,
        mockErrorHandler
      );

      const errorEvent = {
        type: 'stderr',
        data: 'Error: File not found: /invalid/path\n',
        source: 'claude-process',
        level: 'error',
        timestamp: Date.now()
      };

      // Act: Coordinate error handling
      await terminalErrorCoordinator.handleErrorOutput(errorEvent);

      // Assert: Verify coordination between components
      expect(mockTerminalInterface.displayError).toHaveBeenCalledWith({
        message: errorEvent.data,
        level: 'error',
        source: 'claude-process',
        timestamp: errorEvent.timestamp
      });

      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledWith(errorEvent);
    });
  });

  describe('Error Filtering and Enhancement', () => {
    it('should enhance stderr output with contextual information', () => {
      const stderrEnhancer = new StderrEnhancer();
      const rawErrors = [
        'Error: ENOENT: no such file or directory\n',
        'Warning: Deprecated API usage\n',
        'Claude CLI: Authentication failed\n'
      ];

      rawErrors.forEach(rawError => {
        const enhanced = stderrEnhancer.enhance(rawError);
        
        expect(enhanced).toHaveProperty('originalMessage', rawError);
        expect(enhanced).toHaveProperty('enhancedMessage');
        expect(enhanced).toHaveProperty('suggestedAction');
        expect(enhanced).toHaveProperty('errorCode');
        expect(enhanced.source).toBe('claude-process');
      });
    });

    it('should not mock or simulate stderr content', () => {
      const stderrValidator = new StderrValidator();
      const invalidStderr = [
        '[MOCK] Simulated error',
        '[RESPONSE] Error simulation',
        'Fake stderr output for testing',
        '[DEBUG] Mock error message'
      ];

      invalidStderr.forEach(fakeError => {
        const validation = stderrValidator.validate(fakeError);
        
        expect(validation.isValid).toBe(false);
        expect(validation.reason).toMatch(/mock|simulated|fake/);
        expect(validation.shouldBlock).toBe(true);
      });
    });
  });

  describe('Critical Error Handling', () => {
    it('should handle Claude process crashes via stderr monitoring', async () => {
      const crashMonitor = new ProcessCrashMonitor(
        mockClaudeProcess,
        mockSSEStreamer,
        mockErrorHandler
      );

      const crashError = 'FATAL: Claude process terminated unexpectedly\n';
      
      mockClaudeProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(crashError));
        }
      });

      mockErrorHandler.shouldRetry.mockReturnValue(true);

      // Act: Monitor for crash
      await crashMonitor.startMonitoring();

      // Wait for crash detection
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: Verify crash handling collaboration
      expect(mockErrorHandler.handleProcessError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'process-crash',
          message: crashError,
          pid: 12345
        })
      );

      expect(mockSSEStreamer.sendErrorAlert).toHaveBeenCalledWith({
        type: 'critical',
        message: 'Claude process crashed and will be restarted',
        action: 'restart-process'
      });
    });

    it('should maintain stderr streaming during process recovery', async () => {
      const recoveryStreamManager = new RecoveryStreamManager(
        mockSSEStreamer,
        mockErrorHandler
      );

      const recoverySequence = [
        'Process terminated with code 1\n',
        'Attempting restart...\n',
        'Claude Code, v1.0.0\n',
        'Recovery complete\n'
      ];

      // Act: Simulate recovery streaming
      for (const [index, message] of recoverySequence.entries()) {
        await recoveryStreamManager.streamRecoveryMessage({
          message,
          step: index + 1,
          totalSteps: recoverySequence.length
        });
      }

      // Assert: Verify continuous streaming during recovery
      expect(mockSSEStreamer.sendTerminalOutput).toHaveBeenCalledTimes(4);
      
      const finalCall = mockSSEStreamer.sendTerminalOutput.mock.calls[3][0];
      expect(finalCall.data).toBe('Recovery complete\n');
      expect(finalCall.type).toBe('stderr');
      expect(finalCall.level).toBe('info');
    });
  });
});