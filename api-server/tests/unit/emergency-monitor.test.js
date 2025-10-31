/**
 * Unit Tests: Emergency Monitor
 * Tests the emergency background monitoring system for worker auto-kill
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sleep } from '../helpers/test-utils.js';

// Mock implementation for testing (replace with real import when available)
class EmergencyMonitor {
  constructor(healthMonitor, options = {}) {
    this.healthMonitor = healthMonitor;
    this.options = {
      checkIntervalMs: options.checkIntervalMs || 15000,
      enabled: options.enabled !== false,
    };
    this.isRunning = false;
    this.intervalId = null;
    this.killCallbacks = [];
    this.checkCount = 0;
  }

  start() {
    if (this.isRunning) return;
    if (!this.options.enabled) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkWorkers();
    }, this.options.checkIntervalMs);
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  checkWorkers() {
    if (!this.isRunning) return;

    this.checkCount++;
    const unhealthy = this.healthMonitor.getUnhealthyWorkers();

    for (const worker of unhealthy) {
      this.killWorker(worker);
    }

    return unhealthy;
  }

  killWorker(worker) {
    // Notify all registered callbacks
    for (const callback of this.killCallbacks) {
      try {
        callback(worker);
      } catch (error) {
        console.error('Error in kill callback:', error);
      }
    }
  }

  onKill(callback) {
    this.killCallbacks.push(callback);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkCount: this.checkCount,
      checkInterval: this.options.checkIntervalMs,
      enabled: this.options.enabled,
    };
  }
}

describe('EmergencyMonitor - Unit Tests', () => {
  let monitor;
  let healthMonitor;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock health monitor
    healthMonitor = {
      getUnhealthyWorkers: vi.fn(() => []),
    };

    monitor = new EmergencyMonitor(healthMonitor, {
      checkIntervalMs: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.restoreAllTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with health monitor', () => {
      expect(monitor.healthMonitor).toBe(healthMonitor);
    });

    it('should use default options', () => {
      const defaultMonitor = new EmergencyMonitor(healthMonitor);
      expect(defaultMonitor.options.checkIntervalMs).toBe(15000);
      expect(defaultMonitor.options.enabled).toBe(true);
    });

    it('should accept custom options', () => {
      const customMonitor = new EmergencyMonitor(healthMonitor, {
        checkIntervalMs: 30000,
        enabled: false,
      });
      expect(customMonitor.options.checkIntervalMs).toBe(30000);
      expect(customMonitor.options.enabled).toBe(false);
    });

    it('should initialize not running', () => {
      expect(monitor.isRunning).toBe(false);
    });

    it('should initialize with zero check count', () => {
      expect(monitor.checkCount).toBe(0);
    });
  });

  describe('Start and Stop', () => {
    it('should start monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    it('should not start if already running', () => {
      monitor.start();
      const firstIntervalId = monitor.intervalId;

      monitor.start(); // Try to start again

      expect(monitor.intervalId).toBe(firstIntervalId);
    });

    it('should not start if disabled', () => {
      const disabledMonitor = new EmergencyMonitor(healthMonitor, {
        enabled: false,
      });

      disabledMonitor.start();

      expect(disabledMonitor.isRunning).toBe(false);
      expect(disabledMonitor.intervalId).toBeNull();
    });

    it('should stop monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);

      monitor.stop();

      expect(monitor.isRunning).toBe(false);
      expect(monitor.intervalId).toBeNull();
    });

    it('should handle stop when not running', () => {
      expect(() => {
        monitor.stop();
      }).not.toThrow();
    });
  });

  describe('Periodic Checking', () => {
    it('should check workers at regular intervals', () => {
      monitor.start();

      expect(monitor.checkCount).toBe(0);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      expect(monitor.checkCount).toBe(1);

      // Advance another second
      vi.advanceTimersByTime(1000);
      expect(monitor.checkCount).toBe(2);

      // Advance 3 more seconds
      vi.advanceTimersByTime(3000);
      expect(monitor.checkCount).toBe(5);
    });

    it('should call health monitor on each check', () => {
      monitor.start();

      vi.advanceTimersByTime(3000); // 3 checks

      expect(healthMonitor.getUnhealthyWorkers).toHaveBeenCalledTimes(3);
    });

    it('should stop checking after stop() is called', () => {
      monitor.start();

      vi.advanceTimersByTime(2000); // 2 checks
      expect(monitor.checkCount).toBe(2);

      monitor.stop();

      vi.advanceTimersByTime(3000); // Try 3 more
      expect(monitor.checkCount).toBe(2); // Still 2
    });

    it('should not check if not running', () => {
      // Don't start
      vi.advanceTimersByTime(5000);

      expect(monitor.checkCount).toBe(0);
      expect(healthMonitor.getUnhealthyWorkers).not.toHaveBeenCalled();
    });
  });

  describe('Worker Auto-Kill', () => {
    it('should kill unhealthy workers', () => {
      const unhealthyWorker = {
        workerId: 'worker-1',
        ticketId: 'ticket-1',
        reason: 'TIMEOUT',
      };

      healthMonitor.getUnhealthyWorkers.mockReturnValue([unhealthyWorker]);

      const killCallback = vi.fn();
      monitor.onKill(killCallback);

      monitor.start();
      vi.advanceTimersByTime(1000);

      expect(killCallback).toHaveBeenCalledWith(unhealthyWorker);
    });

    it('should kill multiple unhealthy workers', () => {
      const unhealthyWorkers = [
        { workerId: 'worker-1', ticketId: 'ticket-1', reason: 'TIMEOUT' },
        { workerId: 'worker-2', ticketId: 'ticket-2', reason: 'LOOP_DETECTED' },
        { workerId: 'worker-3', ticketId: 'ticket-3', reason: 'MAX_CHUNKS' },
      ];

      healthMonitor.getUnhealthyWorkers.mockReturnValue(unhealthyWorkers);

      const killCallback = vi.fn();
      monitor.onKill(killCallback);

      monitor.start();
      vi.advanceTimersByTime(1000);

      expect(killCallback).toHaveBeenCalledTimes(3);
      expect(killCallback).toHaveBeenCalledWith(unhealthyWorkers[0]);
      expect(killCallback).toHaveBeenCalledWith(unhealthyWorkers[1]);
      expect(killCallback).toHaveBeenCalledWith(unhealthyWorkers[2]);
    });

    it('should not kill if no unhealthy workers', () => {
      healthMonitor.getUnhealthyWorkers.mockReturnValue([]);

      const killCallback = vi.fn();
      monitor.onKill(killCallback);

      monitor.start();
      vi.advanceTimersByTime(3000);

      expect(killCallback).not.toHaveBeenCalled();
    });

    it('should notify multiple callbacks', () => {
      const unhealthyWorker = {
        workerId: 'worker-1',
        ticketId: 'ticket-1',
        reason: 'TIMEOUT',
      };

      healthMonitor.getUnhealthyWorkers.mockReturnValue([unhealthyWorker]);

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      monitor.onKill(callback1);
      monitor.onKill(callback2);
      monitor.onKill(callback3);

      monitor.start();
      vi.advanceTimersByTime(1000);

      expect(callback1).toHaveBeenCalledWith(unhealthyWorker);
      expect(callback2).toHaveBeenCalledWith(unhealthyWorker);
      expect(callback3).toHaveBeenCalledWith(unhealthyWorker);
    });

    it('should handle callback errors gracefully', () => {
      const unhealthyWorker = {
        workerId: 'worker-1',
        ticketId: 'ticket-1',
        reason: 'TIMEOUT',
      };

      healthMonitor.getUnhealthyWorkers.mockReturnValue([unhealthyWorker]);

      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();

      monitor.onKill(errorCallback);
      monitor.onKill(goodCallback);

      monitor.start();

      expect(() => {
        vi.advanceTimersByTime(1000);
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Status Monitoring', () => {
    it('should report status when stopped', () => {
      const status = monitor.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.checkCount).toBe(0);
      expect(status.checkInterval).toBe(1000);
      expect(status.enabled).toBe(true);
    });

    it('should report status when running', () => {
      monitor.start();
      vi.advanceTimersByTime(2000);

      const status = monitor.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.checkCount).toBe(2);
    });

    it('should report disabled status', () => {
      const disabledMonitor = new EmergencyMonitor(healthMonitor, {
        enabled: false,
      });

      const status = disabledMonitor.getStatus();

      expect(status.enabled).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 5; i++) {
        monitor.start();
        vi.advanceTimersByTime(500);
        monitor.stop();
      }

      expect(monitor.isRunning).toBe(false);
    });

    it('should handle check with null health monitor response', () => {
      healthMonitor.getUnhealthyWorkers.mockReturnValue(null);

      monitor.start();

      expect(() => {
        vi.advanceTimersByTime(1000);
      }).toThrow();
    });

    it('should handle empty worker object', () => {
      healthMonitor.getUnhealthyWorkers.mockReturnValue([{}]);

      const killCallback = vi.fn();
      monitor.onKill(killCallback);

      monitor.start();
      vi.advanceTimersByTime(1000);

      expect(killCallback).toHaveBeenCalledWith({});
    });
  });

  describe('Integration Scenarios', () => {
    it('should detect and kill worker within 30 seconds', () => {
      // Simulate worker becoming unhealthy after 20 seconds
      let checksCompleted = 0;
      healthMonitor.getUnhealthyWorkers.mockImplementation(() => {
        checksCompleted++;
        if (checksCompleted >= 2) { // After 2 checks (2 seconds)
          return [{
            workerId: 'slow-worker',
            ticketId: 'ticket-999',
            reason: 'LOOP_DETECTED',
          }];
        }
        return [];
      });

      const killCallback = vi.fn();
      monitor.onKill(killCallback);

      monitor.start();

      // First check - no unhealthy
      vi.advanceTimersByTime(1000);
      expect(killCallback).not.toHaveBeenCalled();

      // Second check - unhealthy detected and killed
      vi.advanceTimersByTime(1000);
      expect(killCallback).toHaveBeenCalledTimes(1);
      expect(killCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: 'slow-worker',
          reason: 'LOOP_DETECTED',
        })
      );
    });

    it('should continuously monitor over extended period', () => {
      monitor.start();

      // Run for 1 minute
      vi.advanceTimersByTime(60000);

      expect(monitor.checkCount).toBe(60); // 60 checks at 1s intervals
      expect(healthMonitor.getUnhealthyWorkers).toHaveBeenCalledTimes(60);
    });
  });
});
