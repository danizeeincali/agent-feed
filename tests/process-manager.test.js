/**
 * ProcessManager Unit Tests - London School TDD
 * 
 * Focus: Mock-driven testing for Claude process management
 * Behavior verification over state testing
 * Outside-in development approach
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock child_process before importing ProcessManager
const mockChildProcess = {
  spawn: jest.fn(),
  ChildProcess: EventEmitter
};

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn()
};

// Mock path module
const mockPath = {
  join: jest.fn()
};

// Mock modules
jest.mock('child_process', () => mockChildProcess);
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);

// Mock process instance
const createMockProcess = (overrides = {}) => {
  const mockProcess = new EventEmitter();
  mockProcess.pid = 1234;
  mockProcess.kill = jest.fn();
  mockProcess.stdin = {
    write: jest.fn()
  };
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  
  return Object.assign(mockProcess, overrides);
};

describe('ProcessManager - London School TDD', () => {
  let ProcessManager;
  let processManager;
  let mockProcess;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh mock process
    mockProcess = createMockProcess();
    mockChildProcess.spawn.mockReturnValue(mockProcess);
    
    // Setup default fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('# Test Claude Instance');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    
    // Import ProcessManager after mocks are set
    const ProcessManagerModule = require('../src/services/ProcessManager');
    ProcessManager = ProcessManagerModule.ProcessManager;
    processManager = new ProcessManager();
  });

  afterEach(() => {
    // Cleanup any timers or listeners
    if (processManager && processManager.cleanup) {
      processManager.cleanup();
    }
  });

  describe('Process Spawning Behavior', () => {
    it('should spawn Claude process with correct arguments and environment', async () => {
      // Arrange
      const expectedConfig = {
        workingDirectory: '/workspaces/agent-feed/prod',
        environment: 'production'
      };
      
      // Act
      const processInfoPromise = processManager.launchInstance(expectedConfig);
      
      // Simulate successful spawn
      process.nextTick(() => mockProcess.emit('spawn'));
      const processInfo = await processInfoPromise;
      
      // Assert - Verify collaboration between ProcessManager and child_process
      expect(mockChildProcess.spawn).toHaveBeenCalledWith('claude', 
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: expectedConfig.workingDirectory,
          env: expect.objectContaining({
            CLAUDE_INSTANCE_NAME: expect.any(String),
            CLAUDE_MANAGED_INSTANCE: 'true',
            CLAUDE_HUB_URL: 'http://localhost:3002'
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        })
      );
      
      // Verify process information structure
      expect(processInfo).toEqual(
        expect.objectContaining({
          pid: expect.any(Number),
          name: expect.any(String),
          status: 'running',
          startTime: expect.any(Date),
          autoRestartEnabled: expect.any(Boolean),
          autoRestartHours: expect.any(Number)
        })
      );
    });

    it('should handle spawn failures by emitting error events', async () => {
      // Arrange
      const spawnError = new Error('Failed to spawn process');
      const errorListener = jest.fn();
      processManager.on('error', errorListener);
      
      // Act
      const launchPromise = processManager.launchInstance();
      
      // Simulate spawn failure
      process.nextTick(() => mockProcess.emit('error', spawnError));
      
      // Assert
      await expect(launchPromise).rejects.toThrow('Failed to spawn Claude process: Failed to spawn process');
      expect(errorListener).toHaveBeenCalledWith(spawnError);
    });

    it('should setup output handlers to capture stdout and stderr', async () => {
      // Arrange
      const outputListener = jest.fn();
      const errorOutputListener = jest.fn();
      const terminalOutputListener = jest.fn();
      
      processManager.on('output', outputListener);
      processManager.on('error-output', errorOutputListener);
      processManager.on('terminal:output', terminalOutputListener);
      
      // Act
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Simulate output
      const testOutput = 'Test stdout output';
      const testError = 'Test stderr output';
      mockProcess.stdout.emit('data', Buffer.from(testOutput));
      mockProcess.stderr.emit('data', Buffer.from(testError));
      
      // Assert - Verify output handling behavior
      expect(outputListener).toHaveBeenCalledWith(testOutput);
      expect(errorOutputListener).toHaveBeenCalledWith(testError);
      expect(terminalOutputListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stdout',
          data: testOutput,
          timestamp: expect.any(Date)
        })
      );
      expect(terminalOutputListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stderr',
          data: testError,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Status Monitoring Behavior', () => {
    it('should track process status transitions throughout lifecycle', async () => {
      // Arrange
      const statusListener = jest.fn();
      processManager.on('launched', statusListener);
      
      // Act - Launch process
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      const initialStatus = processManager.getProcessInfo();
      
      // Assert - Initial status
      expect(initialStatus.status).toBe('running');
      expect(initialStatus.pid).toBe(1234);
      expect(statusListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          pid: 1234
        })
      );
    });

    it('should update status when process exits unexpectedly', async () => {
      // Arrange
      const exitListener = jest.fn();
      processManager.on('exit', exitListener);
      
      // Launch process first
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Act - Simulate unexpected exit
      mockProcess.emit('exit', 1, null);
      
      // Assert
      expect(exitListener).toHaveBeenCalledWith({ code: 1, signal: null });
      
      const finalStatus = processManager.getProcessInfo();
      expect(finalStatus.status).toBe('stopped');
      expect(finalStatus.pid).toBeNull();
    });
  });

  describe('Process Termination Behavior', () => {
    it('should gracefully terminate process using SIGTERM then SIGKILL', async () => {
      // Arrange
      const killListener = jest.fn();
      processManager.on('killed', killListener);
      
      // Launch process first
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Act
      const killPromise = processManager.killInstance();
      
      // Simulate graceful exit after SIGTERM
      setTimeout(() => mockProcess.emit('exit', 0, 'SIGTERM'), 100);
      await killPromise;
      
      // Assert - Verify kill behavior
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(killListener).toHaveBeenCalledWith({ pid: 1234 });
      
      const finalStatus = processManager.getProcessInfo();
      expect(finalStatus.status).toBe('stopped');
    });

    it('should force kill process if graceful shutdown fails', async () => {
      // Arrange
      jest.useFakeTimers();
      
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Act
      const killPromise = processManager.killInstance();
      
      // Simulate process not responding to SIGTERM
      jest.advanceTimersByTime(5000);
      mockProcess.emit('exit', 0, 'SIGKILL');
      
      await killPromise;
      
      // Assert
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      
      jest.useRealTimers();
    });
  });

  describe('Auto-Restart Behavior', () => {
    it('should schedule auto-restart when configured', async () => {
      // Arrange
      jest.useFakeTimers();
      const autoRestartListener = jest.fn();
      processManager.on('auto-restart-configured', autoRestartListener);
      
      const config = { autoRestartHours: 2 };
      
      // Act
      const launchPromise = processManager.launchInstance(config);
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Assert
      expect(autoRestartListener).toHaveBeenCalledWith({
        hours: 2,
        nextRestart: expect.any(Date)
      });
      
      jest.useRealTimers();
    });

    it('should trigger auto-restart when timer expires', async () => {
      // Arrange
      jest.useFakeTimers();
      const restartListener = jest.fn();
      processManager.on('auto-restart-triggered', restartListener);
      
      const config = { autoRestartHours: 1 };
      
      // Launch initial process
      const launchPromise = processManager.launchInstance(config);
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Create new mock process for restart
      const newMockProcess = createMockProcess({ pid: 5678 });
      mockChildProcess.spawn.mockReturnValue(newMockProcess);
      
      // Act - Advance time to trigger auto-restart
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      
      // Simulate old process exit and new process spawn
      mockProcess.emit('exit', 0, 'SIGTERM');
      await new Promise(resolve => process.nextTick(resolve));
      newMockProcess.emit('spawn');
      
      // Assert
      expect(restartListener).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Input Handling Behavior', () => {
    it('should forward input to process stdin when available', async () => {
      // Arrange
      const inputListener = jest.fn();
      processManager.on('input', inputListener);
      
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Act
      const testInput = 'test command\n';
      processManager.sendInput(testInput);
      
      // Assert
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(testInput);
      expect(inputListener).toHaveBeenCalledWith(testInput);
    });

    it('should handle missing stdin gracefully', async () => {
      // Arrange
      const processWithoutStdin = createMockProcess({ stdin: null });
      mockChildProcess.spawn.mockReturnValue(processWithoutStdin);
      
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => processWithoutStdin.emit('spawn'));
      await launchPromise;
      
      // Act & Assert - Should not throw
      expect(() => {
        processManager.sendInput('test input');
      }).not.toThrow();
    });
  });

  describe('Configuration Management Behavior', () => {
    it('should update configuration and apply auto-restart changes', () => {
      // Arrange
      jest.useFakeTimers();
      const configListener = jest.fn();
      processManager.on('auto-restart-configured', configListener);
      
      const newConfig = {
        autoRestartHours: 3,
        workingDirectory: '/new/working/dir'
      };
      
      // Act
      processManager.updateConfig(newConfig);
      
      // Assert
      expect(configListener).toHaveBeenCalledWith({
        hours: 3,
        nextRestart: expect.any(Date)
      });
      
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.autoRestartHours).toBe(3);
      
      jest.useRealTimers();
    });
  });

  describe('Instance Name Generation Behavior', () => {
    it('should read instance name from CLAUDE.md when available', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('# My Custom Claude Instance\nSome content');
      
      // Act
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      const processInfo = await launchPromise;
      
      // Assert
      expect(mockPath.join).toHaveBeenCalledWith('/workspaces/agent-feed/prod', 'CLAUDE.md');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        '/workspaces/agent-feed/prod/CLAUDE.md', 
        'utf-8'
      );
      expect(processInfo.name).toContain('My Custom Claude Instance');
    });

    it('should generate fallback name when CLAUDE.md is not available', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      
      // Act
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      const processInfo = await launchPromise;
      
      // Assert
      expect(processInfo.name).toContain('Claude Instance');
      expect(processInfo.name).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Error Handling Behavior', () => {
    it('should emit error events for file system failures', async () => {
      // Arrange
      const errorListener = jest.fn();
      processManager.on('error', errorListener);
      
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      // Act & Assert - Should handle file system errors gracefully
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      const processInfo = await launchPromise;
      
      // Should still launch with fallback name
      expect(processInfo.name).toContain('Claude Instance');
    });

    it('should clean up resources on process exit events', async () => {
      // Arrange
      const exitListener = jest.fn();
      processManager.on('exit', exitListener);
      
      const launchPromise = processManager.launchInstance();
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Act
      mockProcess.emit('exit', 0, null);
      
      // Assert
      expect(exitListener).toHaveBeenCalledWith({ code: 0, signal: null });
      
      const processInfo = processManager.getProcessInfo();
      expect(processInfo.status).toBe('stopped');
      expect(processInfo.pid).toBeNull();
    });
  });
});