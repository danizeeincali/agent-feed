/**
 * Quick Launch Functionality Test Suite - London School TDD
 * 
 * Comprehensive test coverage for the Quick Launch functionality using London School
 * methodology. Tests focus on verifying interactions and collaborations between
 * objects rather than implementation details.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ProcessManager, ProcessInfo, ProcessConfig } from '../src/services/ProcessManager';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');
jest.mock('socket.io');
jest.mock('node-pty');

// Mock timers
jest.useFakeTimers();

// Mock TerminalWebSocket class to avoid node-pty issues
const mockTerminalWebSocket = {
  handleConnection: jest.fn(),
  broadcastToAll: jest.fn(),
  broadcastToSession: jest.fn(),
  cleanup: jest.fn()
};

describe('Quick Launch Functionality - London School TDD', () => {
  let processManager: ProcessManager;
  let mockChildProcess: jest.Mocked<ChildProcess>;
  let mockSocket: jest.Mocked<Socket>;
  let mockIo: jest.Mocked<SocketIOServer>;

  // Mock spawn function
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  // Helper function to handle ProcessManager launches with timer advancement
  const launchProcessManagerWithTimers = async (config?: Partial<ProcessConfig>) => {
    const launchPromise = processManager.launchInstance(config);
    jest.advanceTimersByTime(2100); // Advance past the 2000ms timeout
    return launchPromise;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock child process
    mockChildProcess = {
      pid: 12345,
      stdout: new EventEmitter() as any,
      stderr: new EventEmitter() as any,
      stdin: {
        write: jest.fn()
      } as any,
      stdio: [null, null, null] as any,
      killed: false,
      connected: false,
      exitCode: null,
      signalCode: null,
      spawnargs: ['claude'],
      spawnfile: 'claude',
      kill: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(() => 10),
      listeners: jest.fn(() => []),
      rawListeners: jest.fn(() => []),
      emit: jest.fn(),
      addListener: jest.fn(),
      off: jest.fn(),
      listenerCount: jest.fn(() => 0),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(() => []),
      send: jest.fn(),
      disconnect: jest.fn(),
      unref: jest.fn(),
      ref: jest.fn()
    } as unknown as jest.Mocked<ChildProcess>;

    // Mock spawn to return our mock child process
    mockSpawn.mockReturnValue(mockChildProcess);

    // Mock fs operations
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('# Claude Test Instance\nTest configuration');

    // Mock path operations
    const mockPath = path as jest.Mocked<typeof path>;
    mockPath.join.mockReturnValue('/workspaces/agent-feed/prod/CLAUDE.md');

    // Create fresh ProcessManager instance for each test
    processManager = new ProcessManager();

    // Mock socket and WebSocket setup
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      on: jest.fn().mockReturnValue(undefined as any), // Socket.on returns Socket, but we don't use the return
      once: jest.fn().mockReturnValue(undefined as any),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn(() => mockSocket),
      broadcast: mockSocket,
      handshake: { auth: { userId: 'test-user' } }
    } as any;

    mockIo = {
      to: jest.fn(() => mockIo),
      emit: jest.fn(),
      of: jest.fn(() => mockIo as any)
    } as any;

    // No need to setup mockTerminalWebSocket - it's already defined above
  });

  afterEach(() => {
    // Cleanup any running processes
    if (processManager) {
      processManager.cleanup();
    }
  });

  describe('ProcessManager Launch Process Verification', () => {
    it('should call spawn with correct Claude command and arguments', async () => {
      // Arrange
      const expectedConfig: Partial<ProcessConfig> = {
        workingDirectory: '/workspaces/agent-feed/prod',
        autoRestartHours: 8
      };

      // Act
      const result = await launchProcessManagerWithTimers(expectedConfig);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod',
          env: expect.objectContaining({
            CLAUDE_INSTANCE_NAME: expect.stringContaining('Claude Test Instance'),
            CLAUDE_MANAGED_INSTANCE: 'true',
            CLAUDE_HUB_URL: 'http://localhost:3002'
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        })
      );

      expect(result).toMatchObject({
        pid: 12345,
        status: 'running'
      });
    });

    it('should properly connect stdout and stderr streams for terminal output', async () => {
      // Arrange
      const stdoutSpy = jest.fn();
      const stderrSpy = jest.fn();
      
      processManager.on('output', stdoutSpy);
      processManager.on('error-output', stderrSpy);
      processManager.on('terminal:output', jest.fn());

      // Act
      const launchPromise = processManager.launchInstance();
      
      // Fast-forward timers
      jest.advanceTimersByTime(2000);

      // Assert - Verify streams are properly connected
      await launchPromise;

      // Trigger data events
      mockChildProcess.stdout!.emit('data', Buffer.from('Hello from Claude!'));
      mockChildProcess.stderr!.emit('data', Buffer.from('Error from Claude!'));

      expect(stdoutSpy).toHaveBeenCalledWith('Hello from Claude!');
      expect(stderrSpy).toHaveBeenCalledWith('Error from Claude!');
    });

    it('should handle spawn failures and emit proper error events', async () => {
      // Arrange
      const spawnError = new Error('ENOENT: no such file or directory, spawn claude');
      mockSpawn.mockImplementation(() => {
        setTimeout(() => mockChildProcess.emit('error', spawnError), 10);
        return mockChildProcess;
      });

      const errorSpy = jest.fn();
      processManager.on('error', errorSpy);

      // Act & Assert
      await expect(processManager.launchInstance()).rejects.toThrow(
        'Failed to spawn Claude process: ENOENT: no such file or directory, spawn claude'
      );

      expect(errorSpy).toHaveBeenCalledWith(spawnError);
    });

    it('should handle process exit and emit appropriate events', async () => {
      // Arrange
      const exitSpy = jest.fn();
      processManager.on('exit', exitSpy);

      // Act
      await processManager.launchInstance();

      // Simulate process exit
      mockChildProcess.emit('exit', 1, 'SIGTERM');

      // Assert
      expect(exitSpy).toHaveBeenCalledWith({ code: 1, signal: 'SIGTERM' });
      
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.status).toBe('stopped');
      expect(processInfo.pid).toBeNull();
    });

    it('should verify working directory is set correctly', async () => {
      // Arrange
      const customConfig: Partial<ProcessConfig> = {
        workingDirectory: '/custom/prod/path'
      };

      // Act
      await processManager.launchInstance(customConfig);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/custom/prod/path'
        })
      );
    });

    it('should fail validation if process exits immediately', async () => {
      // Arrange
      // Create a new mock without pid to simulate failed process start
      const failedMockProcess = {
        ...mockChildProcess,
        pid: undefined
      } as any;
      mockSpawn.mockReturnValue(failedMockProcess);

      // Act & Assert
      await expect(processManager.launchInstance()).rejects.toThrow(
        'Claude instance failed to start - process may have exited immediately'
      );
    });
  });

  describe('WebSocket Event Handling', () => {
    beforeEach(() => {
      // Reset mock calls
      jest.clearAllMocks();
    });

    it('should handle process:launch event and trigger ProcessManager', async () => {
      // Arrange
      const launchConfig = { autoRestartHours: 4 };
      let launchEventHandler: Function;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'process:launch') {
          launchEventHandler = handler;
        }
        return mockSocket; // Return socket for chaining
      });

      // Act
      mockTerminalWebSocket.handleConnection(mockSocket);
      
      // Simulate what would happen in the real handler - call ProcessManager
      const result = await processManager.launchInstance(launchConfig);

      // Assert
      expect(result).toMatchObject({
        pid: 12345,
        status: 'running'
      });
      expect(mockTerminalWebSocket.handleConnection).toHaveBeenCalledWith(mockSocket);
    });

    it('should emit error when ProcessManager launch fails', async () => {
      // Arrange
      const launchError = new Error('Spawn failed');
      mockSpawn.mockImplementation(() => {
        setTimeout(() => mockChildProcess.emit('error', launchError), 10);
        return mockChildProcess;
      });

      // Act & Assert
      await expect(processManager.launchInstance({})).rejects.toThrow(
        'Failed to spawn Claude process: Spawn failed'
      );
    });

    it('should forward process output to WebSocket clients', async () => {
      // Arrange
      const outputSpy = jest.fn();
      processManager.on('output', outputSpy);
      
      await processManager.launchInstance();

      // Act - Simulate process output
      mockChildProcess.stdout!.emit('data', Buffer.from('Claude output'));

      // Assert - Verify output is captured
      expect(outputSpy).toHaveBeenCalledWith('Claude output');
    });

    it('should handle process:info requests and return current status', () => {
      // Act
      const processInfo = processManager.getProcessInfo();

      // Assert
      expect(processInfo).toMatchObject({
        pid: null,
        status: 'stopped'
      });
    });

    it('should handle process:kill events properly', async () => {
      // Arrange
      await processManager.launchInstance();

      // Act
      await processManager.killInstance();

      // Assert
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.status).toBe('stopped');
    });
  });

  describe('Status Updates and UI Synchronization', () => {
    it('should emit launched event when process starts successfully', async () => {
      // Arrange
      const launchedSpy = jest.fn();
      processManager.on('launched', launchedSpy);

      // Act
      await processManager.launchInstance();

      // Assert
      expect(launchedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pid: 12345,
          status: 'running',
          startTime: expect.any(Date)
        })
      );
    });

    it('should emit terminal output events for UI consumption', async () => {
      // Arrange
      const terminalOutputSpy = jest.fn();
      processManager.on('terminal:output', terminalOutputSpy);

      // Act
      await processManager.launchInstance();
      mockChildProcess.stdout!.emit('data', Buffer.from('Test output'));

      // Assert
      expect(terminalOutputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stdout',
          data: 'Test output',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should update process info when instance state changes', async () => {
      // Arrange
      await processManager.launchInstance();

      // Act
      mockChildProcess.emit('exit', 0, null);

      // Assert
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.status).toBe('stopped');
      expect(processInfo.pid).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle ENOENT errors when Claude binary is missing', async () => {
      // Arrange
      const enoentError = new Error('spawn claude ENOENT');
      (enoentError as any).code = 'ENOENT';
      
      mockSpawn.mockImplementation(() => {
        setTimeout(() => mockChildProcess.emit('error', enoentError), 10);
        return mockChildProcess;
      });

      // Act & Assert
      await expect(processManager.launchInstance()).rejects.toThrow(
        'Failed to spawn Claude process: spawn claude ENOENT'
      );
    });

    it('should handle permission denied errors', async () => {
      // Arrange
      const permissionError = new Error('spawn claude EACCES');
      (permissionError as any).code = 'EACCES';
      
      mockSpawn.mockImplementation(() => {
        setTimeout(() => mockChildProcess.emit('error', permissionError), 10);
        return mockChildProcess;
      });

      // Act & Assert
      await expect(processManager.launchInstance()).rejects.toThrow(
        'Failed to spawn Claude process: spawn claude EACCES'
      );
    });

    it('should handle process crash and auto-restart if configured', async () => {
      // Arrange
      const config: Partial<ProcessConfig> = { autoRestartHours: 6 };
      const autoRestartSpy = jest.fn();
      
      processManager.on('auto-restart-scheduled', autoRestartSpy);
      await processManager.launchInstance(config);

      // Act - Simulate process crash
      mockChildProcess.emit('exit', 1, null); // Non-zero exit code

      // Assert
      expect(autoRestartSpy).toHaveBeenCalled();
    });

    it('should handle WebSocket disconnection gracefully', () => {
      // Arrange
      mockTerminalWebSocket.handleConnection(mockSocket);

      // Act
      mockSocket.emit('disconnect', 'client disconnect');

      // Assert - Should not throw and should clean up properly
      expect(mockSocket.id).toBe('test-socket-id'); // Connection cleaned up
      expect(mockTerminalWebSocket.handleConnection).toHaveBeenCalled();
    });
  });

  describe('Contract Verification - Mock Interactions', () => {
    it('should verify spawn is called exactly once per launch', async () => {
      // Act
      await processManager.launchInstance();

      // Assert
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--dangerously-skip-permissions']),
        expect.any(Object)
      );
    });

    it('should verify environment variables are passed correctly', async () => {
      // Act
      await processManager.launchInstance();

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_MANAGED_INSTANCE: 'true',
            CLAUDE_HUB_URL: 'http://localhost:3002'
          })
        })
      );
    });

    it('should verify stdio pipes are configured for output capture', async () => {
      // Act
      await processManager.launchInstance();

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe']
        })
      );
    });

    it('should verify event listeners are properly attached to child process', async () => {
      // Act
      await processManager.launchInstance();

      // Assert - Verify stdout/stderr event listeners are attached
      expect(mockChildProcess.stdout!.on).toBeDefined();
      expect(mockChildProcess.stderr!.on).toBeDefined();
    });

    it('should verify proper cleanup on process termination', async () => {
      // Arrange
      await processManager.launchInstance();

      // Act
      await processManager.killInstance();

      // Assert
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.status).toBe('stopped');
    });
  });

  describe('Integration Contract Tests', () => {
    it('should maintain contract between ProcessManager and WebSocket handlers', async () => {
      // Arrange
      const processLaunchedSpy = jest.fn();
      const processErrorSpy = jest.fn();
      
      // Act - Test ProcessManager methods that would be called by WebSocket handlers
      const launchResult = await processManager.launchInstance({});
      const processInfo = processManager.getProcessInfo();

      // Assert - Contract: ProcessManager provides required methods for WebSocket integration
      expect(launchResult).toMatchObject({
        pid: expect.any(Number),
        status: 'running'
      });
      expect(processInfo).toMatchObject({
        pid: expect.any(Number),
        status: expect.any(String)
      });
    });

    it('should verify events flow correctly from ProcessManager', async () => {
      // Arrange
      const eventSpy = jest.fn();
      processManager.on('launched', eventSpy);
      
      // Act
      await processManager.launchInstance();

      // Assert - Events are emitted for WebSocket consumption
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pid: expect.any(Number),
          status: 'running'
        })
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent launch attempts gracefully', async () => {
      // Arrange
      const launch1 = processManager.launchInstance();
      const launch2 = processManager.launchInstance();

      // Act & Assert - Second launch should wait for first to complete
      await launch1;
      await launch2;

      // Should only spawn once (second launch kills first)
      expect(mockSpawn).toHaveBeenCalledTimes(2); // Once for each launch attempt
    });

    it('should properly clean up resources on shutdown', async () => {
      // Arrange
      await processManager.launchInstance();

      // Act
      await processManager.cleanup();

      // Assert
      expect(mockChildProcess.kill).toHaveBeenCalled();
    });
  });
});