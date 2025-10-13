/**
 * HealthMonitorAdapter Unit Tests (London School TDD)
 * Tests the health monitoring adapter for orchestrator
 *
 * Focus: Behavior verification, callback interactions, interval management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { HealthStatus, IWorkQueue } from '../../../src/types/avi';

describe('HealthMonitorAdapter - Unit Tests (London School TDD)', () => {
  let mockWorkQueue: any;
  let adapter: any;

  beforeEach(() => {
    // Mock dependencies
    mockWorkQueue = {
      getPendingTickets: jest.fn(),
      assignTicket: jest.fn(),
      getQueueStats: jest.fn(),
    };

    // Clear all timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Contract: start()', () => {
    it('should start health monitoring interval', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 0,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue, 30000);

      // ACT
      await adapter.start();

      // ASSERT - Verify interval was set
      expect(adapter.running).toBe(true);
      expect(adapter.intervalHandle).toBeDefined();
    });

    it('should not start if already running', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      await adapter.start();
      const firstHandle = adapter.intervalHandle;

      await adapter.start(); // Second call should be no-op

      expect(adapter.intervalHandle).toBe(firstHandle); // Same handle
    });

    it('should perform initial health check on start', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 3,
        processing: 1,
        completed: 5,
        failed: 0,
      });

      const callback = jest.fn();
      adapter = new HealthMonitorAdapter(mockWorkQueue, 30000);
      adapter.onHealthChange(callback);

      // ACT
      await adapter.start();

      // Advance time to trigger first check
      jest.advanceTimersByTime(30000);

      // ASSERT
      expect(callback).toHaveBeenCalled();
      expect(mockWorkQueue.getQueueStats).toHaveBeenCalled();
    });
  });

  describe('Contract: stop()', () => {
    it('should clear monitoring interval', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);
      await adapter.start();

      // ACT
      await adapter.stop();

      // ASSERT
      expect(adapter.intervalHandle).toBeNull();
      expect(adapter.running).toBe(false);
    });

    it('should be safe to call stop() when not running', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // ACT - Stop without starting
      await expect(adapter.stop()).resolves.not.toThrow();

      expect(adapter.running).toBe(false);
    });

    it('should stop triggering callbacks after stop()', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const callback = jest.fn();
      adapter = new HealthMonitorAdapter(mockWorkQueue, 5000);
      adapter.onHealthChange(callback);

      await adapter.start();

      // Trigger one check
      jest.advanceTimersByTime(5000);
      const callCountBeforeStop = callback.mock.calls.length;

      // Stop monitoring
      await adapter.stop();

      // Advance time - should not trigger more callbacks
      jest.advanceTimersByTime(10000);

      expect(callback).toHaveBeenCalledTimes(callCountBeforeStop);
    });
  });

  describe('Contract: checkHealth()', () => {
    it('should return healthy status with valid metrics', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 10,
        processing: 3,
        completed: 50,
        failed: 1,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // ACT
      const health: HealthStatus = await adapter.checkHealth();

      // ASSERT - Verify HealthStatus contract
      expect(health).toMatchObject({
        healthy: expect.any(Boolean),
        timestamp: expect.any(Date),
        metrics: {
          cpuUsage: expect.any(Number),
          memoryUsage: expect.any(Number),
          activeWorkers: expect.any(Number),
          queueDepth: expect.any(Number),
        },
      });

      expect(mockWorkQueue.getQueueStats).toHaveBeenCalledTimes(1);
    });

    it('should detect high CPU usage issue', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 0,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // Mock high CPU
      jest.spyOn(adapter, 'getCPUUsage').mockReturnValue(95);

      // ACT
      const health = await adapter.checkHealth();

      // ASSERT
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('CPU usage above 90%');
    });

    it('should detect high memory usage issue', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 0,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // Mock high memory
      jest.spyOn(adapter, 'getMemoryUsage').mockReturnValue(90);

      // ACT
      const health = await adapter.checkHealth();

      // ASSERT
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Memory usage above 85%');
    });

    it('should detect excessive queue depth', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 1500, // Over 1000 threshold
        processing: 10,
        completed: 100,
        failed: 5,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // ACT
      const health = await adapter.checkHealth();

      // ASSERT
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Queue depth exceeds 1000 tickets');
    });

    it('should report multiple issues simultaneously', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 2000,
        processing: 5,
        completed: 50,
        failed: 2,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);
      jest.spyOn(adapter, 'getCPUUsage').mockReturnValue(92);
      jest.spyOn(adapter, 'getMemoryUsage').mockReturnValue(88);

      // ACT
      const health = await adapter.checkHealth();

      // ASSERT
      expect(health.healthy).toBe(false);
      expect(health.issues).toHaveLength(3);
      expect(health.issues).toContain('CPU usage above 90%');
      expect(health.issues).toContain('Memory usage above 85%');
      expect(health.issues).toContain('Queue depth exceeds 1000 tickets');
    });

    it('should update metrics with queue statistics', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 42,
        processing: 7,
        completed: 150,
        failed: 3,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // ACT
      const health = await adapter.checkHealth();

      // ASSERT
      expect(health.metrics.queueDepth).toBe(42);
      expect(health.metrics.activeWorkers).toBe(7);
    });
  });

  describe('Contract: onHealthChange()', () => {
    it('should register callback for health changes', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const callback = jest.fn();
      adapter = new HealthMonitorAdapter(mockWorkQueue, 5000);

      // ACT
      adapter.onHealthChange(callback);
      await adapter.start();

      // Trigger health check
      jest.advanceTimersByTime(5000);

      // ASSERT
      expect(callback).toHaveBeenCalled();
      const healthStatus = callback.mock.calls[0][0];
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('metrics');
    });

    it('should handle multiple registered callbacks', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      adapter = new HealthMonitorAdapter(mockWorkQueue, 5000);

      // ACT - Register multiple callbacks
      adapter.onHealthChange(callback1);
      adapter.onHealthChange(callback2);
      adapter.onHealthChange(callback3);

      await adapter.start();
      jest.advanceTimersByTime(5000);

      // ASSERT - All callbacks should be invoked
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);

      // All should receive same health status
      const status1 = callback1.mock.calls[0][0];
      const status2 = callback2.mock.calls[0][0];
      expect(status1.timestamp).toEqual(status2.timestamp);
    });

    it('should not crash if callback throws error', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const faultyCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      adapter = new HealthMonitorAdapter(mockWorkQueue, 5000);

      adapter.onHealthChange(faultyCallback);
      adapter.onHealthChange(goodCallback);

      await adapter.start();

      // ACT - Should not throw
      expect(() => jest.advanceTimersByTime(5000)).not.toThrow();

      // ASSERT - Good callback should still execute
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Collaboration Patterns', () => {
    it('should query work queue on each health check', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 1,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue, 5000);
      await adapter.start();

      // Trigger multiple health checks
      jest.advanceTimersByTime(5000);
      jest.advanceTimersByTime(5000);
      jest.advanceTimersByTime(5000);

      // ASSERT - Should have queried 3 times
      expect(mockWorkQueue.getQueueStats).toHaveBeenCalledTimes(3);
    });

    it('should use configurable check interval', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const callback = jest.fn();
      adapter = new HealthMonitorAdapter(mockWorkQueue, 10000); // 10 second interval
      adapter.onHealthChange(callback);

      await adapter.start();

      // Advance 9 seconds - should not trigger
      jest.advanceTimersByTime(9000);
      expect(callback).not.toHaveBeenCalled();

      // Advance 1 more second - should trigger
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle work queue errors gracefully', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockRejectedValue(new Error('Database error'));

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      // ACT - Should not crash
      await expect(adapter.checkHealth()).rejects.toThrow('Database error');
    });

    it('should provide default values when queue stats unavailable', async () => {
      const HealthMonitorAdapter = await import('../../../api-server/avi/adapters/health-monitor.adapter.js')
        .then(m => m.HealthMonitorAdapter)
        .catch(() => {
          throw new Error('HealthMonitorAdapter not implemented yet');
        });

      mockWorkQueue.getQueueStats.mockResolvedValue({
        pending: null,
        processing: null,
        completed: null,
        failed: null,
      });

      adapter = new HealthMonitorAdapter(mockWorkQueue);

      const health = await adapter.checkHealth();

      // Should have numeric defaults
      expect(typeof health.metrics.queueDepth).toBe('number');
      expect(typeof health.metrics.activeWorkers).toBe('number');
    });
  });
});
