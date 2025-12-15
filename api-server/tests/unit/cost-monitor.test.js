import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostMonitor } from '../../services/cost-monitor.js';

describe('CostMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new CostMonitor();
    vi.useFakeTimers();
  });

  describe('constructor', () => {
    it('should initialize with empty cost tracking', () => {
      expect(monitor.workerCosts.size).toBe(0);
      expect(monitor.totalCost).toBe(0);
    });

    it('should initialize with default configuration', () => {
      expect(monitor.config.costPerMinute).toBe(0.05);
      expect(monitor.config.costPerChunk).toBe(0.001);
      expect(monitor.config.alertThreshold).toBe(0.50);
    });

    it('should accept custom configuration', () => {
      const customMonitor = new CostMonitor({
        costPerMinute: 0.10,
        costPerChunk: 0.002,
        alertThreshold: 1.00
      });

      expect(customMonitor.config.costPerMinute).toBe(0.10);
      expect(customMonitor.config.costPerChunk).toBe(0.002);
      expect(customMonitor.config.alertThreshold).toBe(1.00);
    });
  });

  describe('trackWorkerCost', () => {
    it('should calculate cost for worker duration', () => {
      const duration = 60000; // 1 minute
      const chunks = 0;

      monitor.trackWorkerCost('worker-1', duration, chunks);

      const workerCost = monitor.getWorkerCost('worker-1');
      expect(workerCost).toBe(0.05); // 1 minute * $0.05
    });

    it('should calculate cost for worker chunks', () => {
      const duration = 0;
      const chunks = 50;

      monitor.trackWorkerCost('worker-1', duration, chunks);

      const workerCost = monitor.getWorkerCost('worker-1');
      expect(workerCost).toBe(0.05); // 50 chunks * $0.001
    });

    it('should calculate combined cost for duration and chunks', () => {
      const duration = 120000; // 2 minutes
      const chunks = 30;

      monitor.trackWorkerCost('worker-1', duration, chunks);

      const workerCost = monitor.getWorkerCost('worker-1');
      // (2 * $0.05) + (30 * $0.001) = $0.10 + $0.03 = $0.13
      expect(workerCost).toBeCloseTo(0.13, 2);
    });

    it('should accumulate costs for same worker', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10); // $0.05 + $0.01 = $0.06
      monitor.trackWorkerCost('worker-1', 60000, 20); // $0.05 + $0.02 = $0.07

      const workerCost = monitor.getWorkerCost('worker-1');
      expect(workerCost).toBeCloseTo(0.13, 2);
    });

    it('should track multiple workers separately', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10);
      monitor.trackWorkerCost('worker-2', 120000, 20);

      expect(monitor.getWorkerCost('worker-1')).toBeCloseTo(0.06, 2);
      expect(monitor.getWorkerCost('worker-2')).toBeCloseTo(0.12, 2);
    });

    it('should update total cost', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10); // $0.06
      monitor.trackWorkerCost('worker-2', 120000, 20); // $0.12

      expect(monitor.getTotalCost()).toBeCloseTo(0.18, 2);
    });
  });

  describe('alertHighCost', () => {
    it('should not alert for costs below threshold', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10); // $0.06

      const alert = monitor.alertHighCost('worker-1');

      expect(alert.shouldAlert).toBe(false);
      expect(alert.cost).toBeCloseTo(0.06, 2);
    });

    it('should alert when worker cost exceeds $0.50', () => {
      // $0.50 threshold: 10 minutes = $0.50
      monitor.trackWorkerCost('worker-1', 11 * 60000, 0); // 11 minutes = $0.55

      const alert = monitor.alertHighCost('worker-1');

      expect(alert.shouldAlert).toBe(true);
      expect(alert.cost).toBeCloseTo(0.55, 2);
      expect(alert.threshold).toBe(0.50);
      expect(alert.workerId).toBe('worker-1');
    });

    it('should alert when chunk costs exceed threshold', () => {
      // $0.50 threshold: 500 chunks = $0.50
      monitor.trackWorkerCost('worker-1', 0, 501); // 501 chunks = $0.501

      const alert = monitor.alertHighCost('worker-1');

      expect(alert.shouldAlert).toBe(true);
      expect(alert.cost).toBeCloseTo(0.501, 3);
    });

    it('should alert for combined costs', () => {
      // 5 minutes ($0.25) + 300 chunks ($0.30) = $0.55
      monitor.trackWorkerCost('worker-1', 5 * 60000, 300);

      const alert = monitor.alertHighCost('worker-1');

      expect(alert.shouldAlert).toBe(true);
      expect(alert.cost).toBeCloseTo(0.55, 2);
    });

    it('should return null for non-existent worker', () => {
      const alert = monitor.alertHighCost('non-existent');

      expect(alert).toBeNull();
    });

    it('should include duration and chunk details in alert', () => {
      monitor.trackWorkerCost('worker-1', 11 * 60000, 100);

      const alert = monitor.alertHighCost('worker-1');

      expect(alert.duration).toBe(11 * 60000);
      expect(alert.chunks).toBe(100);
      expect(alert.message).toContain('$0.50');
    });
  });

  describe('getTotalCost', () => {
    it('should return zero for no workers', () => {
      expect(monitor.getTotalCost()).toBe(0);
    });

    it('should sum costs across all workers', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10); // $0.06
      monitor.trackWorkerCost('worker-2', 120000, 20); // $0.12
      monitor.trackWorkerCost('worker-3', 180000, 30); // $0.18

      expect(monitor.getTotalCost()).toBeCloseTo(0.36, 2);
    });

    it('should update as costs are tracked', () => {
      expect(monitor.getTotalCost()).toBe(0);

      monitor.trackWorkerCost('worker-1', 60000, 0);
      expect(monitor.getTotalCost()).toBeCloseTo(0.05, 2);

      monitor.trackWorkerCost('worker-2', 60000, 0);
      expect(monitor.getTotalCost()).toBeCloseTo(0.10, 2);
    });
  });

  describe('getWorkerCost', () => {
    it('should return cost for specific worker', () => {
      monitor.trackWorkerCost('worker-1', 120000, 50);

      const cost = monitor.getWorkerCost('worker-1');

      expect(cost).toBeCloseTo(0.15, 2); // (2 * $0.05) + (50 * $0.001)
    });

    it('should return zero for non-existent worker', () => {
      const cost = monitor.getWorkerCost('non-existent');

      expect(cost).toBe(0);
    });

    it('should handle multiple cost entries for same worker', () => {
      monitor.trackWorkerCost('worker-1', 60000, 10);
      monitor.trackWorkerCost('worker-1', 60000, 10);
      monitor.trackWorkerCost('worker-1', 60000, 10);

      const cost = monitor.getWorkerCost('worker-1');

      expect(cost).toBeCloseTo(0.18, 2); // 3 * ($0.05 + $0.01)
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      monitor.trackWorkerCost('worker-1', 120000, 50);
      monitor.trackWorkerCost('worker-2', 300000, 200);

      const stats = monitor.getStats();

      expect(stats.totalWorkers).toBe(2);
      expect(stats.totalCost).toBeCloseTo(0.45, 2);
      expect(stats.averageCostPerWorker).toBeCloseTo(0.225, 3);
      expect(stats.workersAboveThreshold).toBe(0);
    });

    it('should identify workers above threshold', () => {
      monitor.trackWorkerCost('worker-1', 11 * 60000, 0); // $0.55
      monitor.trackWorkerCost('worker-2', 60000, 10); // $0.06

      const stats = monitor.getStats();

      expect(stats.workersAboveThreshold).toBe(1);
      expect(stats.highCostWorkers).toHaveLength(1);
      expect(stats.highCostWorkers[0].workerId).toBe('worker-1');
    });

    it('should handle empty monitor', () => {
      const stats = monitor.getStats();

      expect(stats.totalWorkers).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageCostPerWorker).toBe(0);
      expect(stats.workersAboveThreshold).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all cost tracking', () => {
      monitor.trackWorkerCost('worker-1', 120000, 50);
      monitor.trackWorkerCost('worker-2', 300000, 200);

      expect(monitor.getTotalCost()).toBeGreaterThan(0);

      monitor.reset();

      expect(monitor.getTotalCost()).toBe(0);
      expect(monitor.workerCosts.size).toBe(0);
    });

    it('should allow fresh tracking after reset', () => {
      monitor.trackWorkerCost('worker-1', 120000, 50);
      monitor.reset();

      monitor.trackWorkerCost('worker-2', 60000, 10);

      expect(monitor.getTotalCost()).toBeCloseTo(0.06, 2);
      expect(monitor.getWorkerCost('worker-1')).toBe(0);
      expect(monitor.getWorkerCost('worker-2')).toBeCloseTo(0.06, 2);
    });
  });

  describe('real-world scenarios', () => {
    it('should correctly track cost for 11-minute loop (real incident)', () => {
      // Real incident: 11 minutes, 60+ chunks
      const duration = 11 * 60 * 1000; // 11 minutes
      const chunks = 60;

      monitor.trackWorkerCost('loop-worker', duration, chunks);

      const cost = monitor.getWorkerCost('loop-worker');
      // (11 * $0.05) + (60 * $0.001) = $0.55 + $0.06 = $0.61
      expect(cost).toBeCloseTo(0.61, 2);

      const alert = monitor.alertHighCost('loop-worker');
      expect(alert.shouldAlert).toBe(true);
      expect(alert.cost).toBeGreaterThan(0.50);
    });

    it('should handle normal query costs', () => {
      // Normal query: 30 seconds, 10 chunks
      const duration = 30000;
      const chunks = 10;

      monitor.trackWorkerCost('normal-worker', duration, chunks);

      const cost = monitor.getWorkerCost('normal-worker');
      // (0.5 * $0.05) + (10 * $0.001) = $0.025 + $0.01 = $0.035
      expect(cost).toBeCloseTo(0.035, 3);

      const alert = monitor.alertHighCost('normal-worker');
      expect(alert.shouldAlert).toBe(false);
    });
  });
});
