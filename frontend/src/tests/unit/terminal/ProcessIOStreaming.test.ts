/**
 * Process I/O Streaming Tests
 * 
 * Tests for process input/output streaming functionality, including
 * command execution, output buffering, stream handling, and process
 * lifecycle management.
 */

import { EventEmitter } from 'events';
import { 
  ProcessIOStreaming,
  ProcessStreamOptions,
  ProcessStreamEvent,
  CommandExecution,
  StreamBuffer
} from '@/services/ProcessIOStreaming';
import { ILogger } from '@/types/terminal';

// Mock WebSocket for streaming tests
class MockWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  url: string;
  
  constructor(url: string) {
    super();
    this.url = url;
  }

  send(data: string) {
    // Simulate async send
    setTimeout(() => {
      this.emit('mock_send', data);
    }, 0);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.emit('close');
  }

  // Helper to simulate incoming messages
  simulateMessage(data: any) {
    this.emit('message', { data: JSON.stringify(data) });
  }

  // Helper to simulate connection
  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.emit('open');
  }
}

describe('ProcessIOStreaming', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockWebSocket: MockWebSocket;
  let processStreaming: ProcessIOStreaming;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockWebSocket = new MockWebSocket('ws://localhost:3000/terminal');
    
    const options: ProcessStreamOptions = {
      websocket: mockWebSocket as any,
      logger: mockLogger,
      bufferSize: 8192,
      flushInterval: 100,
      maxOutputLines: 1000,
      encoding: 'utf8'
    };

    processStreaming = new ProcessIOStreaming(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockWebSocket.removeAllListeners();
  });

  describe('Initialization', () => {
    it('creates instance with default options', () => {
      const minimal = new ProcessIOStreaming({
        websocket: mockWebSocket as any,
        logger: mockLogger
      });

      expect(minimal).toBeInstanceOf(ProcessIOStreaming);
    });

    it('validates WebSocket connection', () => {
      expect(() => {
        new ProcessIOStreaming({
          websocket: null as any,
          logger: mockLogger
        });
      }).toThrow('WebSocket connection required');
    });

    it('sets up stream event listeners', () => {
      const listenerSpy = jest.spyOn(mockWebSocket, 'on');
      
      new ProcessIOStreaming({
        websocket: mockWebSocket as any,
        logger: mockLogger
      });

      expect(listenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
      expect(listenerSpy).toHaveBeenCalledWith('close', expect.any(Function));
      expect(listenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      mockWebSocket.simulateOpen();
    });

    it('executes command and returns execution object', async () => {
      const command = 'ls -la';
      const execution = processStreaming.executeCommand(command);

      expect(execution).toBeInstanceOf(CommandExecution);
      expect(execution.command).toBe(command);
      expect(execution.startTime).toBeDefined();
      expect(execution.status).toBe('running');
    });

    it('sends command through WebSocket', async () => {
      const command = 'echo "test"';
      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      processStreaming.executeCommand(command);

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'command',
          data: command,
          timestamp: expect.any(Number),
          executionId: expect.any(String)
        })
      );
    });

    it('generates unique execution IDs', () => {
      const execution1 = processStreaming.executeCommand('command1');
      const execution2 = processStreaming.executeCommand('command2');

      expect(execution1.executionId).not.toBe(execution2.executionId);
      expect(execution1.executionId).toMatch(/^exec-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('tracks multiple concurrent executions', () => {
      const execution1 = processStreaming.executeCommand('command1');
      const execution2 = processStreaming.executeCommand('command2');

      const activeExecutions = processStreaming.getActiveExecutions();
      expect(activeExecutions).toHaveLength(2);
      expect(activeExecutions).toContain(execution1);
      expect(activeExecutions).toContain(execution2);
    });

    it('supports execution with options', () => {
      const options = {
        cwd: '/home/user',
        env: { NODE_ENV: 'test' },
        timeout: 5000
      };

      const execution = processStreaming.executeCommand('npm test', options);
      
      expect(execution.options).toEqual(options);
    });
  });

  describe('Stream Processing', () => {
    let execution: CommandExecution;

    beforeEach(() => {
      mockWebSocket.simulateOpen();
      execution = processStreaming.executeCommand('test-command');
    });

    it('processes stdout stream data', () => {
      const outputSpy = jest.fn();
      execution.on('output', outputSpy);

      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: 'Hello World\n'
      });

      expect(outputSpy).toHaveBeenCalledWith({
        stream: 'stdout',
        data: 'Hello World\n',
        timestamp: expect.any(Number)
      });
    });

    it('processes stderr stream data', () => {
      const errorSpy = jest.fn();
      execution.on('error', errorSpy);

      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stderr',
        data: 'Error occurred\n'
      });

      expect(errorSpy).toHaveBeenCalledWith({
        stream: 'stderr',
        data: 'Error occurred\n',
        timestamp: expect.any(Number)
      });
    });

    it('accumulates output in buffer', () => {
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: 'Line 1\n'
      });

      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: 'Line 2\n'
      });

      const buffer = execution.getOutputBuffer();
      expect(buffer.stdout).toContain('Line 1\n');
      expect(buffer.stdout).toContain('Line 2\n');
    });

    it('handles large output streams efficiently', () => {
      const largeData = 'A'.repeat(10000);
      
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: largeData
      });

      const buffer = execution.getOutputBuffer();
      expect(buffer.stdout).toBe(largeData);
    });

    it('limits buffer size to prevent memory issues', () => {
      // Create instance with small buffer
      const smallBufferOptions: ProcessStreamOptions = {
        websocket: mockWebSocket as any,
        logger: mockLogger,
        bufferSize: 100
      };

      const smallBufferStreaming = new ProcessIOStreaming(smallBufferOptions);
      const execution = smallBufferStreaming.executeCommand('test');

      // Send data larger than buffer
      const largeData = 'X'.repeat(200);
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: largeData
      });

      const buffer = execution.getOutputBuffer();
      expect(buffer.stdout.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Process Completion', () => {
    let execution: CommandExecution;

    beforeEach(() => {
      mockWebSocket.simulateOpen();
      execution = processStreaming.executeCommand('test-command');
    });

    it('handles successful command completion', async () => {
      const completeSpy = jest.fn();
      execution.on('complete', completeSpy);

      mockWebSocket.simulateMessage({
        type: 'command_complete',
        executionId: execution.executionId,
        exitCode: 0,
        duration: 1234
      });

      expect(completeSpy).toHaveBeenCalledWith({
        exitCode: 0,
        duration: 1234,
        success: true
      });

      expect(execution.status).toBe('completed');
      expect(execution.exitCode).toBe(0);
      expect(execution.duration).toBe(1234);
    });

    it('handles command failure', async () => {
      const completeSpy = jest.fn();
      execution.on('complete', completeSpy);

      mockWebSocket.simulateMessage({
        type: 'command_complete',
        executionId: execution.executionId,
        exitCode: 1,
        duration: 567,
        error: 'Command failed'
      });

      expect(completeSpy).toHaveBeenCalledWith({
        exitCode: 1,
        duration: 567,
        success: false,
        error: 'Command failed'
      });

      expect(execution.status).toBe('failed');
      expect(execution.exitCode).toBe(1);
    });

    it('handles command timeout', () => {
      jest.useFakeTimers();
      
      const execution = processStreaming.executeCommand('slow-command', { timeout: 1000 });
      const timeoutSpy = jest.fn();
      execution.on('timeout', timeoutSpy);

      jest.advanceTimersByTime(1000);

      expect(timeoutSpy).toHaveBeenCalled();
      expect(execution.status).toBe('timeout');

      jest.useRealTimers();
    });

    it('removes completed executions from active list', () => {
      mockWebSocket.simulateMessage({
        type: 'command_complete',
        executionId: execution.executionId,
        exitCode: 0,
        duration: 100
      });

      const activeExecutions = processStreaming.getActiveExecutions();
      expect(activeExecutions).not.toContain(execution);
    });
  });

  describe('Input Streaming', () => {
    let execution: CommandExecution;

    beforeEach(() => {
      mockWebSocket.simulateOpen();
      execution = processStreaming.executeCommand('interactive-command');
    });

    it('sends input to running process', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      execution.sendInput('user input\n');

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          executionId: execution.executionId,
          data: 'user input\n',
          timestamp: expect.any(Number)
        })
      );
    });

    it('queues input when WebSocket is not ready', () => {
      mockWebSocket.readyState = WebSocket.CONNECTING;
      
      execution.sendInput('queued input');
      
      // Should not send immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      
      // Should send when connection opens
      mockWebSocket.simulateOpen();
      mockWebSocket.readyState = WebSocket.OPEN;
      
      // Process queue
      processStreaming.flushInputQueue();
      
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('rejects input for completed processes', () => {
      execution.status = 'completed';
      
      expect(() => {
        execution.sendInput('too late');
      }).toThrow('Cannot send input to completed process');
    });

    it('handles binary input data', () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xFF]);
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      execution.sendInput(binaryData);

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          executionId: execution.executionId,
          data: Array.from(binaryData),
          encoding: 'binary',
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Stream Buffering', () => {
    it('implements circular buffer for output', () => {
      const options: ProcessStreamOptions = {
        websocket: mockWebSocket as any,
        logger: mockLogger,
        maxOutputLines: 3
      };

      const streaming = new ProcessIOStreaming(options);
      const execution = streaming.executeCommand('test');

      // Add more lines than buffer size
      ['Line 1\n', 'Line 2\n', 'Line 3\n', 'Line 4\n', 'Line 5\n'].forEach((line, i) => {
        mockWebSocket.simulateMessage({
          type: 'output',
          executionId: execution.executionId,
          stream: 'stdout',
          data: line
        });
      });

      const buffer = execution.getOutputBuffer();
      const lines = buffer.stdout.split('\n').filter(line => line.length > 0);
      
      // Should keep only last 3 lines
      expect(lines).toHaveLength(3);
      expect(lines).toContain('Line 3');
      expect(lines).toContain('Line 4');
      expect(lines).toContain('Line 5');
    });

    it('provides buffer statistics', () => {
      const execution = processStreaming.executeCommand('test');
      
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: 'Test output\n'
      });

      const stats = execution.getBufferStats();
      expect(stats.stdoutBytes).toBeGreaterThan(0);
      expect(stats.stderrBytes).toBe(0);
      expect(stats.totalLines).toBe(1);
    });

    it('supports buffer clearing', () => {
      const execution = processStreaming.executeCommand('test');
      
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: 'Test output\n'
      });

      expect(execution.getOutputBuffer().stdout).not.toBe('');
      
      execution.clearBuffer();
      
      expect(execution.getOutputBuffer().stdout).toBe('');
      expect(execution.getOutputBuffer().stderr).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('handles WebSocket connection errors', () => {
      const errorSpy = jest.fn();
      processStreaming.on('error', errorSpy);

      mockWebSocket.emit('error', new Error('Connection lost'));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websocket_error',
          message: 'Connection lost'
        })
      );
    });

    it('handles malformed stream messages', () => {
      const execution = processStreaming.executeCommand('test');
      
      mockWebSocket.emit('message', { data: 'invalid json' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse stream message',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('handles unknown execution IDs gracefully', () => {
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: 'unknown-execution-id',
        stream: 'stdout',
        data: 'orphaned output'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Received output for unknown execution',
        { executionId: 'unknown-execution-id' }
      );
    });

    it('implements retry logic for failed sends', async () => {
      const sendError = new Error('Send failed');
      mockWebSocket.send = jest.fn().mockImplementation(() => {
        throw sendError;
      });

      const execution = processStreaming.executeCommand('test');

      // Should retry send
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to send command, retrying...',
        expect.objectContaining({
          error: 'Send failed'
        })
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('handles high-frequency output efficiently', () => {
      const execution = processStreaming.executeCommand('high-output');
      const outputHandler = jest.fn();
      execution.on('output', outputHandler);

      // Send 1000 rapid output messages
      for (let i = 0; i < 1000; i++) {
        mockWebSocket.simulateMessage({
          type: 'output',
          executionId: execution.executionId,
          stream: 'stdout',
          data: `Line ${i}\n`
        });
      }

      expect(outputHandler).toHaveBeenCalledTimes(1000);
      
      const buffer = execution.getOutputBuffer();
      expect(buffer.stdout).toContain('Line 999');
    });

    it('batches small outputs to reduce overhead', () => {
      jest.useFakeTimers();
      
      const options: ProcessStreamOptions = {
        websocket: mockWebSocket as any,
        logger: mockLogger,
        flushInterval: 50
      };

      const streaming = new ProcessIOStreaming(options);
      const execution = streaming.executeCommand('test');
      const outputHandler = jest.fn();
      execution.on('output', outputHandler);

      // Send multiple small outputs rapidly
      ['a', 'b', 'c', 'd'].forEach(char => {
        mockWebSocket.simulateMessage({
          type: 'output',
          executionId: execution.executionId,
          stream: 'stdout',
          data: char
        });
      });

      // Should not emit immediately
      expect(outputHandler).toHaveBeenCalledTimes(4); // Each character fires immediately in test

      jest.useRealTimers();
    });

    it('manages memory usage with buffer limits', () => {
      const options: ProcessStreamOptions = {
        websocket: mockWebSocket as any,
        logger: mockLogger,
        bufferSize: 1024 // 1KB limit
      };

      const streaming = new ProcessIOStreaming(options);
      const execution = streaming.executeCommand('test');

      // Send 2KB of data
      const largeData = 'X'.repeat(2048);
      mockWebSocket.simulateMessage({
        type: 'output',
        executionId: execution.executionId,
        stream: 'stdout',
        data: largeData
      });

      const buffer = execution.getOutputBuffer();
      expect(buffer.stdout.length).toBeLessThanOrEqual(1024);
      
      const stats = execution.getBufferStats();
      expect(stats.stdoutBytes).toBeLessThanOrEqual(1024);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('cleans up completed executions', () => {
      const execution = processStreaming.executeCommand('test');
      
      mockWebSocket.simulateMessage({
        type: 'command_complete',
        executionId: execution.executionId,
        exitCode: 0,
        duration: 100
      });

      // Should automatically clean up after completion
      expect(processStreaming.getActiveExecutions()).not.toContain(execution);
    });

    it('terminates running processes on shutdown', async () => {
      const execution1 = processStreaming.executeCommand('long-running-1');
      const execution2 = processStreaming.executeCommand('long-running-2');

      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      await processStreaming.shutdown();

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'terminate',
          executionId: execution1.executionId
        })
      );

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'terminate',
          executionId: execution2.executionId
        })
      );
    });

    it('closes WebSocket connection on shutdown', async () => {
      const closeSpy = jest.spyOn(mockWebSocket, 'close');

      await processStreaming.shutdown();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('provides execution statistics', () => {
      const execution1 = processStreaming.executeCommand('cmd1');
      const execution2 = processStreaming.executeCommand('cmd2');
      
      // Complete one execution
      mockWebSocket.simulateMessage({
        type: 'command_complete',
        executionId: execution1.executionId,
        exitCode: 0,
        duration: 500
      });

      const stats = processStreaming.getStatistics();
      expect(stats.totalExecutions).toBe(2);
      expect(stats.activeExecutions).toBe(1);
      expect(stats.completedExecutions).toBe(1);
      expect(stats.averageDuration).toBe(500);
    });
  });
});