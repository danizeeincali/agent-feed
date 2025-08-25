import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudeInstanceLifecycle } from '@/services/claude-instance-lifecycle';
import { ClaudeInstance, InstanceState } from '@/types/claude-types';
import { EventEmitter } from 'events';

// Mock external dependencies
vi.mock('@/services/claude-process-manager');
vi.mock('@/services/websocket-manager');

interface MockClaudeInstance extends ClaudeInstance {
  _emitter: EventEmitter;
}

describe('ClaudeInstanceLifecycle', () => {
  let lifecycle: ClaudeInstanceLifecycle;
  let mockInstance: MockClaudeInstance;

  beforeEach(() => {
    lifecycle = new ClaudeInstanceLifecycle();
    mockInstance = {
      id: 'test-instance-1',
      name: 'Test Instance',
      mode: 'chat',
      port: 3001,
      state: InstanceState.INITIALIZING,
      pid: undefined,
      startTime: new Date(),
      lastActivity: new Date(),
      config: {
        autoRestart: true,
        maxMemoryMB: 512,
        timeout: 30000
      },
      _emitter: new EventEmitter()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Instance Initialization', () => {
    test('should transition instance through initialization states', async () => {
      const stateChanges: InstanceState[] = [];
      
      lifecycle.on('stateChange', (instance, newState) => {
        stateChanges.push(newState);
      });

      await lifecycle.initialize(mockInstance);

      expect(stateChanges).toEqual([
        InstanceState.INITIALIZING,
        InstanceState.STARTING,
        InstanceState.RUNNING
      ]);
    });

    test('should set process PID after successful start', async () => {
      const result = await lifecycle.initialize(mockInstance);

      expect(result.pid).toBeDefined();
      expect(result.state).toBe(InstanceState.RUNNING);
      expect(result.startTime).toBeInstanceOf(Date);
    });

    test('should handle initialization failures', async () => {
      mockInstance.port = -1; // Invalid port

      await expect(lifecycle.initialize(mockInstance))
        .rejects.toThrow('Failed to initialize Claude instance');

      expect(mockInstance.state).toBe(InstanceState.FAILED);
    });

    test('should validate instance configuration', async () => {
      mockInstance.config.maxMemoryMB = -1; // Invalid memory limit

      await expect(lifecycle.initialize(mockInstance))
        .rejects.toThrow('Invalid configuration');
    });

    test('should set up health monitoring after initialization', async () => {
      const result = await lifecycle.initialize(mockInstance);

      expect(lifecycle.isMonitoring(result.id)).toBe(true);
    });
  });

  describe('State Transitions', () => {
    test('should validate state transition rules', () => {
      // Valid transitions
      expect(lifecycle.canTransition(InstanceState.INITIALIZING, InstanceState.STARTING))
        .toBe(true);
      expect(lifecycle.canTransition(InstanceState.STARTING, InstanceState.RUNNING))
        .toBe(true);
      expect(lifecycle.canTransition(InstanceState.RUNNING, InstanceState.STOPPING))
        .toBe(true);

      // Invalid transitions
      expect(lifecycle.canTransition(InstanceState.INITIALIZING, InstanceState.RUNNING))
        .toBe(false);
      expect(lifecycle.canTransition(InstanceState.STOPPED, InstanceState.STARTING))
        .toBe(false);
    });

    test('should emit events on state changes', async () => {
      await lifecycle.initialize(mockInstance);
      
      const stateChangePromise = new Promise((resolve) => {
        lifecycle.once('stateChange', (instance, newState, oldState) => {
          resolve({ instance: instance.id, newState, oldState });
        });
      });

      await lifecycle.transition(mockInstance.id, InstanceState.STOPPING);
      
      const result = await stateChangePromise;
      expect(result).toEqual({
        instance: 'test-instance-1',
        newState: InstanceState.STOPPING,
        oldState: InstanceState.RUNNING
      });
    });

    test('should prevent invalid state transitions', async () => {
      mockInstance.state = InstanceState.STOPPED;

      await expect(lifecycle.transition(mockInstance.id, InstanceState.RUNNING))
        .rejects.toThrow('Invalid state transition');
    });

    test('should handle concurrent state transitions', async () => {
      await lifecycle.initialize(mockInstance);

      const transition1 = lifecycle.transition(mockInstance.id, InstanceState.STOPPING);
      const transition2 = lifecycle.transition(mockInstance.id, InstanceState.RESTARTING);

      // Only one should succeed
      const results = await Promise.allSettled([transition1, transition2]);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(failed).toBe(1);
    });
  });

  describe('Health Monitoring', () => {
    test('should detect unresponsive instances', async () => {
      await lifecycle.initialize(mockInstance);
      
      const healthCheckPromise = new Promise((resolve) => {
        lifecycle.once('healthCheck', (instance, status) => {
          resolve({ instance: instance.id, status });
        });
      });

      // Simulate unresponsive instance
      vi.advanceTimersByTime(mockInstance.config.timeout! + 1000);
      
      const result = await healthCheckPromise;
      expect(result).toEqual({
        instance: 'test-instance-1',
        status: 'unhealthy'
      });
    });

    test('should monitor memory usage', async () => {
      await lifecycle.initialize(mockInstance);
      
      const memoryCheckPromise = new Promise((resolve) => {
        lifecycle.once('memoryThreshold', (instance, usage) => {
          resolve({ instance: instance.id, usage });
        });
      });

      // Simulate high memory usage
      lifecycle.reportMemoryUsage(mockInstance.id, 600); // Exceeds 512MB limit
      
      const result = await memoryCheckPromise;
      expect(result).toEqual({
        instance: 'test-instance-1',
        usage: 600
      });
    });

    test('should track activity timestamps', async () => {
      await lifecycle.initialize(mockInstance);
      
      const initialActivity = mockInstance.lastActivity;
      
      // Simulate activity
      await lifecycle.recordActivity(mockInstance.id);
      
      const updatedInstance = lifecycle.getInstance(mockInstance.id);
      expect(updatedInstance!.lastActivity.getTime())
        .toBeGreaterThan(initialActivity.getTime());
    });

    test('should calculate uptime accurately', async () => {
      await lifecycle.initialize(mockInstance);
      
      vi.advanceTimersByTime(5000); // 5 seconds
      
      const uptime = lifecycle.getUptime(mockInstance.id);
      expect(uptime).toBeCloseTo(5000, 100); // Allow 100ms tolerance
    });
  });

  describe('Graceful Shutdown', () => {
    test('should perform graceful shutdown sequence', async () => {
      await lifecycle.initialize(mockInstance);
      
      const shutdownStates: InstanceState[] = [];
      lifecycle.on('stateChange', (instance, newState) => {
        shutdownStates.push(newState);
      });

      await lifecycle.gracefulShutdown(mockInstance.id);

      expect(shutdownStates).toContain(InstanceState.STOPPING);
      expect(shutdownStates).toContain(InstanceState.STOPPED);
    });

    test('should wait for ongoing operations to complete', async () => {
      await lifecycle.initialize(mockInstance);
      
      // Simulate ongoing operation
      lifecycle.markBusy(mockInstance.id, 'processing-request');
      
      const startTime = Date.now();
      const shutdownPromise = lifecycle.gracefulShutdown(mockInstance.id);
      
      // Complete the operation after a delay
      setTimeout(() => {
        lifecycle.markIdle(mockInstance.id);
      }, 1000);
      
      await shutdownPromise;
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    test('should force shutdown after timeout', async () => {
      await lifecycle.initialize(mockInstance);
      
      // Simulate stuck operation
      lifecycle.markBusy(mockInstance.id, 'stuck-operation');
      
      const shutdownOptions = {
        gracefulTimeout: 500,
        force: true
      };
      
      const startTime = Date.now();
      await lifecycle.gracefulShutdown(mockInstance.id, shutdownOptions);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(1000); // Should not wait indefinitely
    });
  });

  describe('Auto-Restart Functionality', () => {
    test('should restart instance on unexpected termination', async () => {
      mockInstance.config.autoRestart = true;
      await lifecycle.initialize(mockInstance);
      
      const restartPromise = new Promise((resolve) => {
        lifecycle.once('restarted', (instance) => {
          resolve(instance.id);
        });
      });

      // Simulate unexpected termination
      lifecycle.handleProcessExit(mockInstance.id, 1, 'SIGTERM');
      
      const restartedInstanceId = await restartPromise;
      expect(restartedInstanceId).toBe('test-instance-1');
    });

    test('should not restart if auto-restart is disabled', async () => {
      mockInstance.config.autoRestart = false;
      await lifecycle.initialize(mockInstance);
      
      let restarted = false;
      lifecycle.once('restarted', () => {
        restarted = true;
      });

      lifecycle.handleProcessExit(mockInstance.id, 1, 'SIGTERM');
      
      // Wait to ensure no restart occurs
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(restarted).toBe(false);
    });

    test('should implement restart backoff policy', async () => {
      mockInstance.config.autoRestart = true;
      await lifecycle.initialize(mockInstance);
      
      const restartTimes: number[] = [];
      
      lifecycle.on('restartAttempt', () => {
        restartTimes.push(Date.now());
      });

      // Simulate multiple crashes
      for (let i = 0; i < 3; i++) {
        lifecycle.handleProcessExit(mockInstance.id, 1, 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Check that restart delays increase
      if (restartTimes.length >= 2) {
        const delay1 = restartTimes[1] - restartTimes[0];
        const delay2 = restartTimes[2] - restartTimes[1];
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    test('should reset restart counter after successful uptime', async () => {
      mockInstance.config.autoRestart = true;
      await lifecycle.initialize(mockInstance);
      
      // Simulate crash and restart
      lifecycle.handleProcessExit(mockInstance.id, 1, 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate successful uptime
      vi.advanceTimersByTime(300000); // 5 minutes
      
      const restartCount = lifecycle.getRestartCount(mockInstance.id);
      expect(restartCount).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    test('should clean up resources on instance termination', async () => {
      await lifecycle.initialize(mockInstance);
      
      await lifecycle.terminate(mockInstance.id);
      
      expect(lifecycle.getInstance(mockInstance.id)).toBeUndefined();
      expect(lifecycle.isMonitoring(mockInstance.id)).toBe(false);
    });

    test('should close all open connections', async () => {
      await lifecycle.initialize(mockInstance);
      
      const connectionsSpy = vi.spyOn(lifecycle, 'closeConnections');
      
      await lifecycle.terminate(mockInstance.id);
      
      expect(connectionsSpy).toHaveBeenCalledWith(mockInstance.id);
    });
  });
});
