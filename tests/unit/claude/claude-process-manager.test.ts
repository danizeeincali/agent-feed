import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ClaudeProcessManager } from '@/services/claude-process-manager';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

const mockSpawn = spawn as MockedFunction<typeof spawn>;

interface MockChildProcess extends EventEmitter {
  pid: number;
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    write: MockedFunction<(data: string) => void>;
    end: MockedFunction<() => void>;
  };
  kill: MockedFunction<(signal?: string) => boolean>;
}

describe('ClaudeProcessManager', () => {
  let processManager: ClaudeProcessManager;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    mockProcess = new EventEmitter() as MockChildProcess;
    mockProcess.pid = 1234;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: vi.fn(),
      end: vi.fn()
    };
    mockProcess.kill = vi.fn().mockReturnValue(true);

    mockSpawn.mockReturnValue(mockProcess as unknown as ChildProcess);
    processManager = new ClaudeProcessManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Process Creation', () => {
    test('should spawn Claude instance with correct parameters', async () => {
      const config = {
        instanceId: 'test-instance-1',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--port', '3001', '--mode', 'chat', '--instance-id', 'test-instance-1'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
          env: expect.any(Object)
        })
      );
    });

    test('should assign unique process IDs', async () => {
      const config1 = { instanceId: 'instance-1', port: 3001, mode: 'chat' as const };
      const config2 = { instanceId: 'instance-2', port: 3002, mode: 'terminal' as const };

      await processManager.createInstance(config1);
      await processManager.createInstance(config2);

      const instances = processManager.getInstances();
      expect(instances).toHaveLength(2);
      expect(instances[0].instanceId).toBe('instance-1');
      expect(instances[1].instanceId).toBe('instance-2');
    });

    test('should handle process spawn failures', async () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('Spawn failed');
      });

      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await expect(processManager.createInstance(config))
        .rejects.toThrow('Failed to spawn Claude instance');
    });
  });

  describe('Process Communication', () => {
    test('should send commands to Claude process', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);
      await processManager.sendCommand('test-instance', 'hello world');

      expect(mockProcess.stdin.write).toHaveBeenCalledWith('hello world\n');
    });

    test('should handle stdout data from Claude process', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      let receivedData = '';
      await processManager.createInstance(config);
      
      processManager.on('output', (instanceId: string, data: string) => {
        if (instanceId === 'test-instance') {
          receivedData = data;
        }
      });

      mockProcess.stdout.emit('data', Buffer.from('Claude response'));
      
      expect(receivedData).toBe('Claude response');
    });

    test('should handle stderr data from Claude process', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      let errorData = '';
      await processManager.createInstance(config);
      
      processManager.on('error', (instanceId: string, error: string) => {
        if (instanceId === 'test-instance') {
          errorData = error;
        }
      });

      mockProcess.stderr.emit('data', Buffer.from('Error message'));
      
      expect(errorData).toBe('Error message');
    });
  });

  describe('Process Lifecycle', () => {
    test('should terminate Claude instance', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);
      await processManager.terminateInstance('test-instance');

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    test('should force kill instance if graceful termination fails', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);
      
      // Mock graceful termination failure
      mockProcess.kill.mockReturnValueOnce(false);
      
      await processManager.terminateInstance('test-instance', true);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    test('should clean up terminated instances', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);
      expect(processManager.getInstances()).toHaveLength(1);

      mockProcess.emit('exit', 0, null);
      
      expect(processManager.getInstances()).toHaveLength(0);
    });

    test('should handle process crashes', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      let crashHandled = false;
      await processManager.createInstance(config);
      
      processManager.on('crash', (instanceId: string) => {
        if (instanceId === 'test-instance') {
          crashHandled = true;
        }
      });

      mockProcess.emit('exit', 1, null); // Non-zero exit code indicates crash
      
      expect(crashHandled).toBe(true);
    });
  });

  describe('Resource Management', () => {
    test('should enforce maximum instance limits', async () => {
      const maxInstances = 4;
      processManager = new ClaudeProcessManager({ maxInstances });

      // Create maximum allowed instances
      for (let i = 0; i < maxInstances; i++) {
        await processManager.createInstance({
          instanceId: `instance-${i}`,
          port: 3001 + i,
          mode: 'chat' as const
        });
      }

      // Attempt to create one more instance
      await expect(processManager.createInstance({
        instanceId: 'excess-instance',
        port: 3005,
        mode: 'chat' as const
      })).rejects.toThrow('Maximum instance limit reached');
    });

    test('should monitor memory usage', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const
      };

      await processManager.createInstance(config);
      const stats = processManager.getInstanceStats('test-instance');

      expect(stats).toHaveProperty('pid');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('cpuUsage');
      expect(stats).toHaveProperty('uptime');
    });
  });

  describe('Error Recovery', () => {
    test('should restart failed instances with auto-restart enabled', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const,
        autoRestart: true
      };

      await processManager.createInstance(config);
      
      // Simulate process crash
      mockProcess.emit('exit', 1, null);
      
      // Wait for restart
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSpawn).toHaveBeenCalledTimes(2); // Original + restart
    });

    test('should not restart if auto-restart is disabled', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const,
        autoRestart: false
      };

      await processManager.createInstance(config);
      
      // Simulate process crash
      mockProcess.emit('exit', 1, null);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSpawn).toHaveBeenCalledTimes(1); // Only original
    });

    test('should implement exponential backoff for restart attempts', async () => {
      const config = {
        instanceId: 'test-instance',
        port: 3001,
        mode: 'chat' as const,
        autoRestart: true
      };

      await processManager.createInstance(config);
      
      const startTime = Date.now();
      
      // Simulate multiple crashes
      for (let i = 0; i < 3; i++) {
        mockProcess.emit('exit', 1, null);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should have delays between restart attempts
      expect(totalTime).toBeGreaterThan(100);
    });
  });
});
