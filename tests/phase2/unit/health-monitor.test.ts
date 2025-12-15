/**
 * Health Monitor Unit Tests
 * London School TDD: Mock all dependencies, test behavior through interactions
 */

import { HealthMonitor } from '../../../src/avi/health-monitor';
import { HealthConfig, HealthStatus } from '../../../src/types/health';

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;
  let mockTokenCounter: jest.Mock;
  const defaultConfig: HealthConfig = {
    maxContextTokens: 50000,
    checkInterval: 30000,
    restartThreshold: 0.9,
  };

  beforeEach(() => {
    // Mock token counting function
    mockTokenCounter = jest.fn().mockReturnValue(1000);
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      monitor = new HealthMonitor();

      const metrics = monitor.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.healthy).toBe(true);
      expect(metrics.contextTokens).toBe(0);
      expect(metrics.warnings).toEqual([]);
    });

    it('should initialize with custom config', () => {
      const customConfig: HealthConfig = {
        maxContextTokens: 100000,
        checkInterval: 60000,
        restartThreshold: 0.8,
      };

      monitor = new HealthMonitor(customConfig);

      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.healthy).toBe(true);
    });

    it('should start with zero uptime', () => {
      monitor = new HealthMonitor();

      const metrics = monitor.getMetrics();

      expect(metrics.uptime).toBe(0);
    });
  });

  describe('health checking', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should check health status', () => {
      mockTokenCounter.mockReturnValue(10000);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.contextTokens).toBe(10000);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(mockTokenCounter).toHaveBeenCalled();
    });

    it('should detect context bloat at 90% threshold', () => {
      // 45000 tokens = 90% of 50000 max
      mockTokenCounter.mockReturnValue(45000);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(false);
      expect(status.warnings[0]).toContain('Context approaching limit');
    });

    it('should detect context bloat above 90% threshold', () => {
      // 46000 tokens = 92% of 50000 max
      mockTokenCounter.mockReturnValue(46000);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(false);
      expect(status.contextTokens).toBe(46000);
    });

    it('should be healthy below threshold', () => {
      // 40000 tokens = 80% of 50000 max
      mockTokenCounter.mockReturnValue(40000);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.warnings).toHaveLength(0);
    });

    it('should update lastCheck timestamp', () => {
      const beforeCheck = new Date();
      jest.advanceTimersByTime(100);

      const status = monitor.checkHealth();

      expect(status.lastCheck.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
    });
  });

  describe('restart signaling', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should emit restart signal when threshold exceeded', (done) => {
      mockTokenCounter.mockReturnValue(45000); // 90%

      monitor.on('restart-needed', (status: HealthStatus) => {
        expect(status.contextTokens).toBe(45000);
        expect(status.healthy).toBe(false);
        done();
      });

      monitor.checkHealth();
    });

    it('should not emit restart signal below threshold', () => {
      mockTokenCounter.mockReturnValue(40000); // 80%
      const restartHandler = jest.fn();

      monitor.on('restart-needed', restartHandler);
      monitor.checkHealth();

      expect(restartHandler).not.toHaveBeenCalled();
    });

    it('should emit restart signal only once per threshold breach', () => {
      mockTokenCounter.mockReturnValue(45000);
      const restartHandler = jest.fn();

      monitor.on('restart-needed', restartHandler);

      // Multiple checks at same bloat level
      monitor.checkHealth();
      monitor.checkHealth();
      monitor.checkHealth();

      // Should only emit once until cleared
      expect(restartHandler).toHaveBeenCalledTimes(1);
    });

    it('should determine shouldRestart correctly', () => {
      mockTokenCounter.mockReturnValue(45000);
      monitor.checkHealth();

      expect(monitor.shouldRestart()).toBe(true);

      mockTokenCounter.mockReturnValue(30000);
      monitor.checkHealth();

      expect(monitor.shouldRestart()).toBe(false);
    });
  });

  describe('uptime tracking', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should track uptime correctly', () => {
      monitor.start();

      // Advance 60 seconds
      jest.advanceTimersByTime(60000);

      const metrics = monitor.getMetrics();
      expect(metrics.uptime).toBeGreaterThanOrEqual(60000);
    });

    it('should reset uptime on stop', () => {
      monitor.start();
      jest.advanceTimersByTime(30000);
      monitor.stop();

      const metrics = monitor.getMetrics();
      expect(metrics.uptime).toBe(0);
    });

    it('should continue tracking uptime across checks', () => {
      monitor.start();

      jest.advanceTimersByTime(15000);
      monitor.checkHealth();

      jest.advanceTimersByTime(15000);
      monitor.checkHealth();

      const metrics = monitor.getMetrics();
      expect(metrics.uptime).toBeGreaterThanOrEqual(30000);
    });
  });

  describe('warning collection', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should collect warnings for high context usage', () => {
      mockTokenCounter.mockReturnValue(45000);

      const status = monitor.checkHealth();

      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.warnings[0]).toContain('Context approaching limit');
    });

    it('should clear warnings when context is healthy', () => {
      // First check: unhealthy
      mockTokenCounter.mockReturnValue(45000);
      monitor.checkHealth();

      // Second check: healthy
      mockTokenCounter.mockReturnValue(30000);
      const status = monitor.checkHealth();

      expect(status.warnings).toHaveLength(0);
    });

    it('should accumulate multiple warnings', () => {
      // Mock a scenario with multiple issues
      mockTokenCounter.mockReturnValue(48000); // 96%

      const status = monitor.checkHealth();

      expect(status.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('monitoring lifecycle', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should start monitoring with interval', () => {
      const checkHealthSpy = jest.spyOn(monitor, 'checkHealth');

      monitor.start();

      // Should not check immediately
      expect(checkHealthSpy).not.toHaveBeenCalled();

      // Should check after interval
      jest.advanceTimersByTime(30000);
      expect(checkHealthSpy).toHaveBeenCalledTimes(1);

      // Should check again after another interval
      jest.advanceTimersByTime(30000);
      expect(checkHealthSpy).toHaveBeenCalledTimes(2);
    });

    it('should stop monitoring gracefully', () => {
      const checkHealthSpy = jest.spyOn(monitor, 'checkHealth');

      monitor.start();
      jest.advanceTimersByTime(30000);
      expect(checkHealthSpy).toHaveBeenCalledTimes(1);

      monitor.stop();
      jest.advanceTimersByTime(30000);

      // Should not check after stop
      expect(checkHealthSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple start calls safely', () => {
      monitor.start();
      monitor.start();
      monitor.start();

      const checkHealthSpy = jest.spyOn(monitor, 'checkHealth');

      jest.advanceTimersByTime(30000);

      // Should only have one active interval
      expect(checkHealthSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle stop without start', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('metrics retrieval', () => {
    beforeEach(() => {
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);
    });

    it('should return current metrics snapshot', () => {
      mockTokenCounter.mockReturnValue(35000);
      monitor.start();
      jest.advanceTimersByTime(45000);

      const metrics = monitor.getMetrics();

      expect(metrics.healthy).toBe(true);
      expect(metrics.contextTokens).toBe(35000);
      expect(metrics.uptime).toBeGreaterThanOrEqual(45000);
      expect(metrics.lastCheck).toBeInstanceOf(Date);
    });

    it('should return immutable metrics', () => {
      const metrics1 = monitor.getMetrics();
      mockTokenCounter.mockReturnValue(10000);
      monitor.checkHealth();
      const metrics2 = monitor.getMetrics();

      // Should be different objects
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1.contextTokens).not.toBe(metrics2.contextTokens);
    });
  });

  describe('edge cases', () => {
    it('should handle exactly at threshold', () => {
      mockTokenCounter.mockReturnValue(45000); // Exactly 90%
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(false);
      expect(monitor.shouldRestart()).toBe(true);
    });

    it('should handle zero tokens', () => {
      mockTokenCounter.mockReturnValue(0);
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.contextTokens).toBe(0);
    });

    it('should handle token counter errors gracefully', () => {
      mockTokenCounter.mockImplementation(() => {
        throw new Error('Token counting failed');
      });
      monitor = new HealthMonitor(defaultConfig, mockTokenCounter);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.warnings[0]).toContain('Error checking health');
    });

    it('should handle custom threshold correctly', () => {
      const customConfig: HealthConfig = {
        maxContextTokens: 100000,
        checkInterval: 30000,
        restartThreshold: 0.5, // 50% threshold
      };
      mockTokenCounter.mockReturnValue(50000); // Exactly 50%
      monitor = new HealthMonitor(customConfig, mockTokenCounter);

      const status = monitor.checkHealth();

      expect(status.healthy).toBe(false);
      expect(monitor.shouldRestart()).toBe(true);
    });
  });
});
