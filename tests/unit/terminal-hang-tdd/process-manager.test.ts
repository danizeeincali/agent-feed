/**
 * SPARC REFINEMENT PHASE: Process Manager Unit Tests
 * Test-driven development for background Claude process management
 */

import { ProcessManager } from '../../../src/services/ProcessManager';
import { ProcessConfig, ProcessInfo, ProcessStatus } from '../../../src/types/process';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock utilities
jest.mock('../../../src/utils/process-utils', () => ({
  isProcessAlive: jest.fn(),
  killProcess: jest.fn(),
  getProcessResourceUsage: jest.fn()
}));

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockChildProcess: jest.Mocked<ChildProcess & EventEmitter>;

  beforeEach(() => {
    processManager = new ProcessManager({
      maxProcesses: 10,
      healthCheckInterval: 1000,
      processTimeout: 30000
    });
    
    // Create mock child process
    mockChildProcess = Object.assign(new EventEmitter(), {
      pid: 1234,
      kill: jest.fn(),
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      killed: false,
      exitCode: null,
      signalCode: null
    }) as any;
    
    // Reset mocks
    jest.clearAllMocks();
    (require('child_process').spawn as jest.Mock).mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    processManager.cleanup();
  });

  describe('spawnProcess', () => {
    const validConfig: ProcessConfig = {
      command: 'claude',
      workingDirectory: '/prod',
      args: ['--help'],
      env: { NODE_ENV: 'test' }
    };

    it('should spawn Claude process successfully', async () => {
      // ACT
      const processId = await processManager.spawnProcess(validConfig);

      // ASSERT
      expect(processId).toBeTruthy();
      expect(typeof processId).toBe('string');
      
      const processInfo = processManager.getProcessStatus(processId);
      expect(processInfo).toMatchObject({
        status: 'starting',
        command: 'claude',
        workingDirectory: '/prod',
        pid: 1234
      });
      
      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'claude',
        ['--help'],
        expect.objectContaining({
          cwd: '/prod',
          env: expect.objectContaining({ NODE_ENV: 'test' })
        })
      );
    });

    it('should handle process spawn failure gracefully', async () => {
      // ARRANGE
      const spawnError = new Error('ENOENT: no such file or directory');
      (require('child_process').spawn as jest.Mock).mockImplementation(() => {
        throw spawnError;
      });

      const invalidConfig: ProcessConfig = {
        command: 'nonexistent-command',
        workingDirectory: '/invalid',
        args: []
      };

      // ACT & ASSERT
      await expect(processManager.spawnProcess(invalidConfig))
        .rejects.toThrow('Process spawn failed: ENOENT: no such file or directory');
    });

    it('should enforce maximum process limit', async () => {
      // ARRANGE
      processManager.setMaxProcesses(2);
      
      // Spawn max processes
      await processManager.spawnProcess(validConfig);
      await processManager.spawnProcess(validConfig);

      // ACT & ASSERT
      await expect(processManager.spawnProcess(validConfig))
        .rejects.toThrow('Maximum process limit (2) exceeded');
    });

    it('should generate unique process IDs', async () => {
      // ACT
      const processId1 = await processManager.spawnProcess(validConfig);
      const processId2 = await processManager.spawnProcess(validConfig);

      // ASSERT
      expect(processId1).not.toBe(processId2);
      expect(processId1).toMatch(/^proc-\d+-[a-f0-9]{8}$/);
      expect(processId2).toMatch(/^proc-\d+-[a-f0-9]{8}$/);
    });

    it('should setup process event handlers correctly', async () => {
      // ARRANGE
      const outputHandler = jest.fn();
      processManager.on('process:output', outputHandler);

      // ACT
      const processId = await processManager.spawnProcess(validConfig);
      
      // Simulate process output
      mockChildProcess.stdout.emit('data', Buffer.from('Hello World'));

      // ASSERT
      expect(outputHandler).toHaveBeenCalledWith({
        processId,
        stream: 'stdout',
        data: 'Hello World',
        timestamp: expect.any(Number)
      });
    });

    it('should handle process ready state transition', async () => {
      // ARRANGE
      const readyHandler = jest.fn();
      processManager.on('process:ready', readyHandler);

      // ACT
      const processId = await processManager.spawnProcess(validConfig);
      
      // Simulate process ready (Claude prompt detection)
      mockChildProcess.stdout.emit('data', Buffer.from('> '));

      // ASSERT
      expect(readyHandler).toHaveBeenCalledWith({
        processId,
        pid: 1234
      });
      
      const processInfo = processManager.getProcessStatus(processId);
      expect(processInfo?.status).toBe('running');
    });
  });

  describe('terminateProcess', () => {
    let processId: string;

    beforeEach(async () => {
      processId = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
    });

    it('should terminate running process gracefully', async () => {
      // ACT
      await processManager.terminateProcess(processId);

      // ASSERT
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      
      const processInfo = processManager.getProcessStatus(processId);
      expect(processInfo?.status).toBe('stopping');
    });

    it('should force kill process after timeout', async () => {
      // ARRANGE
      processManager.setGracefulTerminationTimeout(100);
      
      // Don't respond to SIGTERM
      mockChildProcess.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM') return true;
        return false;
      });

      // ACT
      const terminatePromise = processManager.terminateProcess(processId);
      
      // Fast forward time
      jest.advanceTimersByTime(150);
      
      await terminatePromise;

      // ASSERT
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should handle termination of non-existent process', async () => {
      // ARRANGE
      const nonExistentId = 'invalid-process-id';

      // ACT & ASSERT
      await expect(processManager.terminateProcess(nonExistentId))
        .rejects.toThrow('Process not found: invalid-process-id');
    });

    it('should emit termination events', async () => {
      // ARRANGE
      const exitHandler = jest.fn();
      processManager.on('process:exit', exitHandler);

      // ACT
      await processManager.terminateProcess(processId);
      
      // Simulate process exit
      mockChildProcess.emit('exit', 0, 'SIGTERM');

      // ASSERT
      expect(exitHandler).toHaveBeenCalledWith({
        processId,
        exitCode: 0,
        signal: 'SIGTERM',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('process health monitoring', () => {
    let processId: string;

    beforeEach(async () => {
      processId = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
      
      // Mark as running
      mockChildProcess.stdout.emit('data', Buffer.from('> '));
    });

    it('should detect hung processes', async () => {
      // ARRANGE
      const { isProcessAlive } = require('../../../src/utils/process-utils');
      isProcessAlive.mockReturnValue(true);
      
      const hangHandler = jest.fn();
      processManager.on('process:hang', hangHandler);
      
      // Set short timeout for testing
      processManager.setHangDetectionTimeout(100);

      // ACT
      // Fast forward time beyond hang threshold
      jest.advanceTimersByTime(200);

      // ASSERT
      expect(hangHandler).toHaveBeenCalledWith({
        processId,
        lastActivity: expect.any(Number)
      });
    });

    it('should detect dead processes', async () => {
      // ARRANGE
      const { isProcessAlive } = require('../../../src/utils/process-utils');
      isProcessAlive.mockReturnValue(false);
      
      const deathHandler = jest.fn();
      processManager.on('process:death', deathHandler);

      // ACT
      // Trigger health check
      processManager.performHealthCheck();

      // ASSERT
      expect(deathHandler).toHaveBeenCalledWith({
        processId,
        pid: 1234
      });
      
      const processInfo = processManager.getProcessStatus(processId);
      expect(processInfo?.status).toBe('failed');
    });

    it('should restart failed processes when enabled', async () => {
      // ARRANGE
      processManager.enableAutoRestart(processId, { maxAttempts: 2, backoffDelay: 100 });
      
      const { isProcessAlive } = require('../../../src/utils/process-utils');
      isProcessAlive.mockReturnValue(false);

      // ACT
      processManager.performHealthCheck();
      
      // Fast forward backoff delay
      jest.advanceTimersByTime(150);

      // ASSERT
      // Should spawn new process (second call to spawn)
      expect(require('child_process').spawn).toHaveBeenCalledTimes(2);
    });
  });

  describe('process input handling', () => {
    let processId: string;

    beforeEach(async () => {
      processId = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
    });

    it('should send input to process stdin', async () => {
      // ACT
      await processManager.sendInput(processId, 'help\n');

      // ASSERT
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith('help\n', 'utf8');
    });

    it('should handle input to non-existent process', async () => {
      // ARRANGE
      const nonExistentId = 'invalid-process-id';

      // ACT & ASSERT
      await expect(processManager.sendInput(nonExistentId, 'test'))
        .rejects.toThrow('Process not found: invalid-process-id');
    });

    it('should handle input to terminated process', async () => {
      // ARRANGE
      await processManager.terminateProcess(processId);
      mockChildProcess.emit('exit', 0);

      // ACT & ASSERT
      await expect(processManager.sendInput(processId, 'test'))
        .rejects.toThrow('Cannot send input to terminated process');
    });
  });

  describe('process status management', () => {
    it('should return null for non-existent process', () => {
      // ACT
      const status = processManager.getProcessStatus('non-existent');

      // ASSERT
      expect(status).toBeNull();
    });

    it('should list all active processes', async () => {
      // ARRANGE
      const processId1 = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
      
      const processId2 = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/test',
        args: ['--help']
      });

      // ACT
      const processes = processManager.listActiveProcesses();

      // ASSERT
      expect(processes).toHaveLength(2);
      expect(processes.map(p => p.id)).toEqual([processId1, processId2]);
    });

    it('should clean up terminated processes', async () => {
      // ARRANGE
      const processId = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
      
      // Terminate and mark as exited
      await processManager.terminateProcess(processId);
      mockChildProcess.emit('exit', 0);

      // ACT
      processManager.cleanupTerminatedProcesses();

      // ASSERT
      const status = processManager.getProcessStatus(processId);
      expect(status).toBeNull();
      
      const activeProcesses = processManager.listActiveProcesses();
      expect(activeProcesses).toHaveLength(0);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle process spawn errors', async () => {
      // ARRANGE
      const errorHandler = jest.fn();
      processManager.on('process:error', errorHandler);
      
      (require('child_process').spawn as jest.Mock).mockImplementation(() => {
        const errorProcess = new EventEmitter();
        setTimeout(() => errorProcess.emit('error', new Error('Spawn failed')), 10);
        return errorProcess;
      });

      // ACT
      await expect(processManager.spawnProcess({
        command: 'invalid-command',
        workingDirectory: '/prod',
        args: []
      })).rejects.toThrow();

      // ASSERT
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          phase: 'spawn'
        })
      );
    });

    it('should handle process runtime errors', async () => {
      // ARRANGE
      const errorHandler = jest.fn();
      processManager.on('process:error', errorHandler);
      
      const processId = await processManager.spawnProcess({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });

      // ACT
      mockChildProcess.emit('error', new Error('Runtime error'));

      // ASSERT
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          processId,
          error: expect.any(Error),
          phase: 'runtime'
        })
      );
    });
  });
});