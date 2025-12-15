/**
 * Claude Process Interaction Tests
 * 
 * Tests for Claude-specific terminal interactions, command handling,
 * process management, and Claude instance communication protocols.
 */

import { ClaudeProcessManager, ClaudeProcessConfig, ClaudeCommandResult } from '@/services/ClaudeProcessManager';
import { ILogger, IEventEmitter } from '@/types/terminal';
import { EventEmitter } from 'events';

// Mock WebSocket for Claude communication
class MockClaudeWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  url: string;
  
  constructor(url: string) {
    super();
    this.url = url;
  }

  send(data: string) {
    setTimeout(() => this.emit('mock_send', data), 0);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.emit('close');
  }

  simulateMessage(data: any) {
    this.emit('message', { data: JSON.stringify(data) });
  }
}

describe('ClaudeProcessInteraction', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockEventEmitter: IEventEmitter;
  let mockWebSocket: MockClaudeWebSocket;
  let claudeManager: ClaudeProcessManager;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockEventEmitter = new EventEmitter();
    mockWebSocket = new MockClaudeWebSocket('ws://localhost:3000/claude');

    const config: ClaudeProcessConfig = {
      websocket: mockWebSocket as any,
      logger: mockLogger,
      eventEmitter: mockEventEmitter,
      instanceId: 'claude-test-instance',
      claudeVersion: '3.5',
      capabilities: ['code', 'analysis', 'files'],
      workingDirectory: '/workspace/test',
      environment: {
        NODE_ENV: 'test',
        CLAUDE_API_KEY: 'test-key'
      }
    };

    claudeManager = new ClaudeProcessManager(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventEmitter.removeAllListeners();
    mockWebSocket.removeAllListeners();
  });

  describe('Claude Instance Management', () => {
    it('initializes Claude process with correct configuration', () => {
      expect(claudeManager.getInstanceId()).toBe('claude-test-instance');
      expect(claudeManager.getCapabilities()).toEqual(['code', 'analysis', 'files']);
      expect(claudeManager.getWorkingDirectory()).toBe('/workspace/test');
    });

    it('starts Claude instance successfully', async () => {
      const startPromise = claudeManager.startInstance();

      // Simulate successful start response
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        version: '3.5',
        capabilities: ['code', 'analysis', 'files'],
        status: 'ready'
      });

      await startPromise;

      expect(claudeManager.isRunning()).toBe(true);
      expect(claudeManager.getProcessId()).toBe(12345);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Claude instance started successfully',
        expect.objectContaining({
          instanceId: 'claude-test-instance',
          pid: 12345
        })
      );
    });

    it('handles Claude instance start failure', async () => {
      const startPromise = claudeManager.startInstance();

      mockWebSocket.simulateMessage({
        type: 'claude_instance_error',
        error: 'Failed to initialize Claude',
        code: 'INIT_FAILED'
      });

      await expect(startPromise).rejects.toThrow('Failed to initialize Claude');
      expect(claudeManager.isRunning()).toBe(false);
    });

    it('stops Claude instance gracefully', async () => {
      // Start instance first
      const startPromise = claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });
      await startPromise;

      const stopPromise = claudeManager.stopInstance();
      
      mockWebSocket.simulateMessage({
        type: 'claude_instance_stopped',
        instanceId: 'claude-test-instance',
        exitCode: 0
      });

      await stopPromise;

      expect(claudeManager.isRunning()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Claude instance stopped',
        expect.objectContaining({
          instanceId: 'claude-test-instance',
          exitCode: 0
        })
      );
    });

    it('handles forced termination', async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });

      const terminatePromise = claudeManager.terminateInstance();

      mockWebSocket.simulateMessage({
        type: 'claude_instance_terminated',
        instanceId: 'claude-test-instance',
        signal: 'SIGKILL'
      });

      await terminatePromise;

      expect(claudeManager.isRunning()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Claude instance terminated forcefully',
        expect.objectContaining({
          signal: 'SIGKILL'
        })
      );
    });
  });

  describe('Claude Command Execution', () => {
    beforeEach(async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });
    });

    it('executes Claude commands with proper formatting', async () => {
      const command = 'analyze this code: console.log("hello")';
      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      const resultPromise = claudeManager.executeCommand(command);

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'claude_command',
          command,
          instanceId: 'claude-test-instance',
          requestId: expect.any(String),
          timestamp: expect.any(Number),
          context: {
            workingDirectory: '/workspace/test',
            capabilities: ['code', 'analysis', 'files']
          }
        })
      );

      // Simulate Claude response
      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: {
          analysis: 'This is a simple console.log statement',
          suggestions: ['Consider adding error handling'],
          confidence: 0.95
        },
        executionTime: 1234
      });

      const result = await resultPromise;
      expect(result.success).toBe(true);
      expect(result.result.analysis).toBe('This is a simple console.log statement');
      expect(result.executionTime).toBe(1234);
    });

    it('handles Claude command timeouts', async () => {
      jest.useFakeTimers();

      const command = 'complex analysis task';
      const resultPromise = claudeManager.executeCommand(command, { timeout: 5000 });

      // Fast-forward past timeout
      jest.advanceTimersByTime(5000);

      await expect(resultPromise).rejects.toThrow('Command execution timeout');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Claude command timed out',
        expect.objectContaining({
          command,
          timeout: 5000
        })
      );

      jest.useRealTimers();
    });

    it('processes file operations correctly', async () => {
      const fileCommand = 'read file: /workspace/test/example.js';
      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      claudeManager.executeCommand(fileCommand);

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'claude_command',
          command: fileCommand,
          instanceId: 'claude-test-instance',
          requestId: expect.any(String),
          timestamp: expect.any(Number),
          context: {
            workingDirectory: '/workspace/test',
            capabilities: ['code', 'analysis', 'files']
          }
        })
      );

      // Simulate file read response
      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: {
          fileContent: 'console.log("example file content");',
          filePath: '/workspace/test/example.js',
          fileSize: 35,
          lastModified: '2024-01-01T00:00:00Z'
        }
      });
    });

    it('handles code analysis requests', async () => {
      const analysisCommand = 'analyze code quality in current directory';
      
      const resultPromise = claudeManager.executeCommand(analysisCommand);

      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: {
          type: 'code_analysis',
          files_analyzed: 15,
          issues_found: 3,
          suggestions: [
            'Consider using TypeScript for better type safety',
            'Add unit tests for critical functions',
            'Improve error handling in async operations'
          ],
          metrics: {
            complexity: 'medium',
            maintainability: 85,
            coverage: 78
          }
        }
      });

      const result = await resultPromise;
      expect(result.result.type).toBe('code_analysis');
      expect(result.result.files_analyzed).toBe(15);
      expect(result.result.suggestions).toHaveLength(3);
    });

    it('manages concurrent command execution', async () => {
      const commands = [
        'analyze file1.js',
        'check syntax file2.js',
        'optimize file3.js'
      ];

      const promises = commands.map(cmd => claudeManager.executeCommand(cmd));

      // Simulate responses for all commands
      commands.forEach((cmd, index) => {
        mockWebSocket.simulateMessage({
          type: 'claude_command_result',
          requestId: expect.any(String),
          success: true,
          result: { command: cmd, index }
        });
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.result.index).toBe(index);
      });
    });
  });

  describe('Claude Communication Protocol', () => {
    beforeEach(async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });
    });

    it('handles Claude status updates', () => {
      const statusSpy = jest.fn();
      mockEventEmitter.on('claude:status_change', statusSpy);

      mockWebSocket.simulateMessage({
        type: 'claude_status_update',
        instanceId: 'claude-test-instance',
        status: 'busy',
        currentTask: 'analyzing large codebase',
        progress: 45
      });

      expect(statusSpy).toHaveBeenCalledWith({
        status: 'busy',
        currentTask: 'analyzing large codebase',
        progress: 45
      });

      expect(claudeManager.getCurrentStatus()).toBe('busy');
    });

    it('processes Claude suggestions and insights', () => {
      const insightSpy = jest.fn();
      mockEventEmitter.on('claude:insight', insightSpy);

      mockWebSocket.simulateMessage({
        type: 'claude_insight',
        instanceId: 'claude-test-instance',
        insight: {
          type: 'performance_optimization',
          title: 'Potential Memory Leak Detected',
          description: 'Event listeners not being cleaned up in component',
          file: '/workspace/test/Component.js',
          line: 45,
          severity: 'medium',
          suggestion: 'Add cleanup in useEffect return function'
        }
      });

      expect(insightSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance_optimization',
          title: 'Potential Memory Leak Detected',
          severity: 'medium'
        })
      );
    });

    it('handles Claude error reporting', () => {
      const errorSpy = jest.fn();
      mockEventEmitter.on('claude:error', errorSpy);

      mockWebSocket.simulateMessage({
        type: 'claude_error',
        instanceId: 'claude-test-instance',
        error: {
          code: 'ANALYSIS_FAILED',
          message: 'Unable to parse file syntax',
          file: '/workspace/test/broken.js',
          details: {
            line: 10,
            column: 15,
            syntaxError: 'Unexpected token'
          }
        }
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ANALYSIS_FAILED',
          message: 'Unable to parse file syntax'
        })
      );
    });

    it('maintains heartbeat with Claude instance', () => {
      jest.useFakeTimers();

      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      // Start heartbeat
      claudeManager.startHeartbeat(5000);

      // Fast-forward to trigger heartbeat
      jest.advanceTimersByTime(5000);

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'claude_heartbeat',
          instanceId: 'claude-test-instance',
          timestamp: expect.any(Number)
        })
      );

      claudeManager.stopHeartbeat();
      jest.useRealTimers();
    });
  });

  describe('Claude Context Management', () => {
    beforeEach(async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });
    });

    it('maintains conversation context across commands', async () => {
      // First command establishes context
      const firstCommand = 'analyze the main.js file';
      await claudeManager.executeCommand(firstCommand);

      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: { analysis: 'File contains React components' }
      });

      // Second command should reference previous context
      const secondCommand = 'suggest improvements for that file';
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      await claudeManager.executeCommand(secondCommand);

      expect(sendSpy).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: 'claude_command',
          command: secondCommand,
          instanceId: 'claude-test-instance',
          requestId: expect.any(String),
          timestamp: expect.any(Number),
          context: {
            workingDirectory: '/workspace/test',
            capabilities: ['code', 'analysis', 'files'],
            previousCommands: expect.arrayContaining([firstCommand])
          }
        })
      );
    });

    it('manages workspace context effectively', () => {
      claudeManager.updateWorkspaceContext({
        currentFiles: ['main.js', 'utils.js', 'config.json'],
        recentChanges: [
          { file: 'main.js', timestamp: Date.now() - 1000 },
          { file: 'utils.js', timestamp: Date.now() - 2000 }
        ],
        projectStructure: {
          type: 'react',
          dependencies: ['react', 'typescript', 'jest'],
          buildSystem: 'webpack'
        }
      });

      const context = claudeManager.getWorkspaceContext();
      expect(context.currentFiles).toHaveLength(3);
      expect(context.projectStructure.type).toBe('react');
    });

    it('clears context when requested', () => {
      claudeManager.updateWorkspaceContext({
        currentFiles: ['test.js']
      });

      expect(claudeManager.getWorkspaceContext().currentFiles).toHaveLength(1);

      claudeManager.clearContext();

      const context = claudeManager.getWorkspaceContext();
      expect(context.currentFiles).toHaveLength(0);
      expect(context.recentChanges).toHaveLength(0);
    });
  });

  describe('Claude Performance Monitoring', () => {
    beforeEach(async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });
    });

    it('tracks command execution metrics', async () => {
      const startTime = Date.now();
      
      const command = 'performance test command';
      const resultPromise = claudeManager.executeCommand(command);

      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: { test: 'data' },
        executionTime: 1500,
        memoryUsage: 256 * 1024 * 1024, // 256MB
        cpuUsage: 0.45
      });

      const result = await resultPromise;
      const metrics = claudeManager.getPerformanceMetrics();

      expect(metrics.totalCommands).toBe(1);
      expect(metrics.averageExecutionTime).toBe(1500);
      expect(metrics.memoryUsage.current).toBe(256 * 1024 * 1024);
      expect(result.executionTime).toBe(1500);
    });

    it('monitors resource usage over time', () => {
      const resourceSpy = jest.fn();
      mockEventEmitter.on('claude:resource_usage', resourceSpy);

      mockWebSocket.simulateMessage({
        type: 'claude_resource_usage',
        instanceId: 'claude-test-instance',
        metrics: {
          memory: {
            used: 512 * 1024 * 1024,
            available: 2 * 1024 * 1024 * 1024
          },
          cpu: {
            usage: 0.35,
            cores: 4
          },
          io: {
            reads: 1024,
            writes: 512
          }
        }
      });

      expect(resourceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          memory: expect.objectContaining({
            used: 512 * 1024 * 1024
          }),
          cpu: expect.objectContaining({
            usage: 0.35
          })
        })
      );
    });

    it('detects performance issues', () => {
      const warningSpy = jest.fn();
      mockEventEmitter.on('claude:performance_warning', warningSpy);

      // Simulate high resource usage
      mockWebSocket.simulateMessage({
        type: 'claude_performance_warning',
        instanceId: 'claude-test-instance',
        warning: {
          type: 'high_memory_usage',
          severity: 'medium',
          message: 'Memory usage above 80% threshold',
          currentUsage: 0.85,
          threshold: 0.80,
          recommendations: [
            'Consider clearing context history',
            'Reduce concurrent command execution'
          ]
        }
      });

      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_memory_usage',
          severity: 'medium',
          currentUsage: 0.85
        })
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('handles Claude process crashes gracefully', async () => {
      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });

      const crashSpy = jest.fn();
      mockEventEmitter.on('claude:process_crashed', crashSpy);

      // Simulate process crash
      mockWebSocket.simulateMessage({
        type: 'claude_process_crashed',
        instanceId: 'claude-test-instance',
        exitCode: -1,
        signal: 'SIGSEGV',
        error: 'Segmentation fault'
      });

      expect(crashSpy).toHaveBeenCalledWith({
        exitCode: -1,
        signal: 'SIGSEGV',
        error: 'Segmentation fault'
      });

      expect(claudeManager.isRunning()).toBe(false);
      expect(claudeManager.requiresRestart()).toBe(true);
    });

    it('implements automatic restart after crash', async () => {
      claudeManager.enableAutoRestart(true);

      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });

      // Simulate crash
      mockWebSocket.simulateMessage({
        type: 'claude_process_crashed',
        instanceId: 'claude-test-instance',
        exitCode: -1
      });

      // Should attempt restart
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting to restart Claude instance after crash',
        expect.any(Object)
      );

      // Simulate successful restart
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12346,
        status: 'ready'
      });

      expect(claudeManager.isRunning()).toBe(true);
      expect(claudeManager.getProcessId()).toBe(12346);
    });

    it('handles communication timeouts with retry', async () => {
      jest.useFakeTimers();

      await claudeManager.startInstance();
      mockWebSocket.simulateMessage({
        type: 'claude_instance_started',
        instanceId: 'claude-test-instance',
        pid: 12345,
        status: 'ready'
      });

      const command = 'timeout test command';
      const resultPromise = claudeManager.executeCommand(command, { 
        timeout: 5000,
        retryAttempts: 2
      });

      // First attempt times out
      jest.advanceTimersByTime(5000);

      // Should retry
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Command timed out, retrying...',
        expect.objectContaining({
          attempt: 1,
          maxAttempts: 2
        })
      );

      // Second attempt succeeds
      mockWebSocket.simulateMessage({
        type: 'claude_command_result',
        requestId: expect.any(String),
        success: true,
        result: { data: 'success on retry' }
      });

      const result = await resultPromise;
      expect(result.success).toBe(true);

      jest.useRealTimers();
    });

    it('implements circuit breaker for repeated failures', async () => {
      // Configure circuit breaker
      claudeManager.configureCircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 10000,
        monitoringPeriod: 60000
      });

      // Simulate repeated failures
      for (let i = 0; i < 4; i++) {
        try {
          const resultPromise = claudeManager.executeCommand(`failing command ${i}`);
          mockWebSocket.simulateMessage({
            type: 'claude_command_result',
            requestId: expect.any(String),
            success: false,
            error: 'Simulated failure'
          });
          await resultPromise;
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should be open
      expect(claudeManager.getCircuitBreakerState()).toBe('open');

      // Further commands should fail fast
      await expect(
        claudeManager.executeCommand('should fail fast')
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Integration with Terminal Features', () => {
    it('integrates with terminal output streaming', () => {
      const outputSpy = jest.fn();
      mockEventEmitter.on('claude:output', outputSpy);

      mockWebSocket.simulateMessage({
        type: 'claude_output_stream',
        instanceId: 'claude-test-instance',
        stream: 'stdout',
        data: 'Claude is analyzing your code...\n',
        timestamp: Date.now()
      });

      expect(outputSpy).toHaveBeenCalledWith({
        stream: 'stdout',
        data: 'Claude is analyzing your code...\n',
        timestamp: expect.any(Number)
      });
    });

    it('supports interactive prompts and responses', async () => {
      const promptSpy = jest.fn();
      mockEventEmitter.on('claude:prompt', promptSpy);

      // Claude asks for user input
      mockWebSocket.simulateMessage({
        type: 'claude_prompt',
        instanceId: 'claude-test-instance',
        prompt: {
          id: 'prompt-123',
          message: 'Which file would you like me to analyze first?',
          options: ['main.js', 'utils.js', 'config.js'],
          type: 'choice'
        }
      });

      expect(promptSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prompt-123',
          message: 'Which file would you like me to analyze first?',
          options: ['main.js', 'utils.js', 'config.js']
        })
      );

      // Respond to prompt
      claudeManager.respondToPrompt('prompt-123', 'main.js');

      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'claude_prompt_response',
          promptId: 'prompt-123',
          response: 'main.js'
        })
      );
    });

    it('provides terminal integration helpers', () => {
      const terminalCommands = claudeManager.getTerminalCommands();
      
      expect(terminalCommands).toContain('claude analyze');
      expect(terminalCommands).toContain('claude status');
      expect(terminalCommands).toContain('claude help');

      const commandHelp = claudeManager.getCommandHelp('claude analyze');
      expect(commandHelp).toContain('Analyze code files');
      expect(commandHelp).toContain('Usage:');
      expect(commandHelp).toContain('Examples:');
    });
  });
});