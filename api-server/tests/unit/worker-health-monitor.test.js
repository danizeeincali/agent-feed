import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkerHealthMonitor } from '../../services/worker-health-monitor.js';

describe('WorkerHealthMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new WorkerHealthMonitor();
    vi.useFakeTimers();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = new WorkerHealthMonitor();
      const instance2 = new WorkerHealthMonitor();

      expect(instance1).toBe(instance2);
    });
  });

  describe('registerWorker', () => {
    it('should register a new worker', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      const worker = monitor.workers.get('worker-1');
      expect(worker).toBeDefined();
      expect(worker.workerId).toBe('worker-1');
      expect(worker.ticketId).toBe('ticket-1');
      expect(worker.startTime).toBe(now);
      expect(worker.lastHeartbeat).toBe(now);
      expect(worker.chunkCount).toBe(0);
    });

    it('should handle multiple workers', () => {
      monitor.registerWorker('worker-1', 'ticket-1');
      monitor.registerWorker('worker-2', 'ticket-2');
      monitor.registerWorker('worker-3', 'ticket-3');

      expect(monitor.workers.size).toBe(3);
    });

    it('should update existing worker if re-registered', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      vi.setSystemTime(now + 5000);

      monitor.registerWorker('worker-1', 'ticket-2');

      const worker = monitor.workers.get('worker-1');
      expect(worker.ticketId).toBe('ticket-2');
      expect(worker.startTime).toBe(now + 5000);
    });
  });

  describe('updateHeartbeat', () => {
    it('should update worker heartbeat', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      vi.setSystemTime(now + 5000);

      monitor.updateHeartbeat('worker-1', 5);

      const worker = monitor.workers.get('worker-1');
      expect(worker.lastHeartbeat).toBe(now + 5000);
      expect(worker.chunkCount).toBe(5);
    });

    it('should increment chunk count if not provided', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      monitor.updateHeartbeat('worker-1');
      monitor.updateHeartbeat('worker-1');
      monitor.updateHeartbeat('worker-1');

      const worker = monitor.workers.get('worker-1');
      expect(worker.chunkCount).toBe(3);
    });

    it('should handle non-existent worker gracefully', () => {
      expect(() => {
        monitor.updateHeartbeat('non-existent');
      }).not.toThrow();
    });
  });

  describe('unregisterWorker', () => {
    it('should remove worker from tracking', () => {
      monitor.registerWorker('worker-1', 'ticket-1');
      expect(monitor.workers.has('worker-1')).toBe(true);

      monitor.unregisterWorker('worker-1');
      expect(monitor.workers.has('worker-1')).toBe(false);
    });

    it('should handle non-existent worker', () => {
      expect(() => {
        monitor.unregisterWorker('non-existent');
      }).not.toThrow();
    });
  });

  describe('getUnhealthyWorkers', () => {
    it('should detect workers running > 10 minutes', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      // Advance time by 11 minutes
      vi.setSystemTime(now + 11 * 60 * 1000);

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy.length).toBe(1);
      expect(unhealthy[0].workerId).toBe('worker-1');
      expect(unhealthy[0].reason).toContain('10 minutes');
    });

    it('should detect workers with no heartbeat for > 60 seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      // Advance time by 61 seconds without heartbeat
      vi.setSystemTime(now + 61000);

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy.length).toBe(1);
      expect(unhealthy[0].reason).toContain('No heartbeat');
    });

    it('should detect workers with > 100 chunks', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      // Update with 101 chunks
      monitor.updateHeartbeat('worker-1', 101);

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy.length).toBe(1);
      expect(unhealthy[0].reason).toContain('Excessive chunks');
    });

    it('should return empty array for healthy workers', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      // Keep updating heartbeat (healthy behavior)
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(now + i * 10000);
        monitor.updateHeartbeat('worker-1', i * 5);
      }

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy.length).toBe(0);
    });

    it('should detect multiple unhealthy workers', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');
      monitor.registerWorker('worker-2', 'ticket-2');
      monitor.registerWorker('worker-3', 'ticket-3');

      // Worker 1: Too long
      vi.setSystemTime(now + 11 * 60 * 1000);

      // Worker 2: No heartbeat (still at original time)
      // Worker 3: Update heartbeat (healthy)
      monitor.updateHeartbeat('worker-3', 10);

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy.length).toBe(2);
      expect(unhealthy.map(w => w.workerId)).toContain('worker-1');
      expect(unhealthy.map(w => w.workerId)).toContain('worker-2');
    });

    it('should provide detailed reason for each unhealthy worker', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');
      monitor.updateHeartbeat('worker-1', 150);

      const unhealthy = monitor.getUnhealthyWorkers();

      expect(unhealthy[0]).toMatchObject({
        workerId: 'worker-1',
        ticketId: 'ticket-1',
        reason: expect.any(String),
        runtime: expect.any(Number),
        chunkCount: 150
      });
    });
  });

  describe('getWorkerHealth', () => {
    it('should return health status for a specific worker', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');
      monitor.updateHeartbeat('worker-1', 50);

      const health = monitor.getWorkerHealth('worker-1');

      expect(health).toBeDefined();
      expect(health.workerId).toBe('worker-1');
      expect(health.isHealthy).toBe(true);
      expect(health.runtime).toBeDefined();
      expect(health.chunkCount).toBe(50);
      expect(health.timeSinceLastHeartbeat).toBeDefined();
    });

    it('should mark worker as unhealthy if criteria met', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');

      // Advance time by 11 minutes
      vi.setSystemTime(now + 11 * 60 * 1000);

      const health = monitor.getWorkerHealth('worker-1');

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Runtime exceeds 10 minutes');
    });

    it('should return null for non-existent worker', () => {
      const health = monitor.getWorkerHealth('non-existent');

      expect(health).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return overall statistics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      monitor.registerWorker('worker-1', 'ticket-1');
      monitor.registerWorker('worker-2', 'ticket-2');
      monitor.updateHeartbeat('worker-1', 50);
      monitor.updateHeartbeat('worker-2', 150);

      const stats = monitor.getStats();

      expect(stats.totalWorkers).toBe(2);
      expect(stats.healthyWorkers).toBe(1);
      expect(stats.unhealthyWorkers).toBe(1);
      expect(stats.totalChunks).toBe(200);
    });

    it('should handle empty monitor', () => {
      const stats = monitor.getStats();

      expect(stats.totalWorkers).toBe(0);
      expect(stats.healthyWorkers).toBe(0);
      expect(stats.unhealthyWorkers).toBe(0);
      expect(stats.totalChunks).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      expect(monitor.config.maxRuntime).toBe(10 * 60 * 1000);
      expect(monitor.config.heartbeatTimeout).toBe(60000);
      expect(monitor.config.maxChunks).toBe(100);
    });

    it('should allow custom configuration', () => {
      const customMonitor = new WorkerHealthMonitor({
        maxRuntime: 5 * 60 * 1000,
        heartbeatTimeout: 30000,
        maxChunks: 50
      });

      expect(customMonitor.config.maxRuntime).toBe(5 * 60 * 1000);
      expect(customMonitor.config.heartbeatTimeout).toBe(30000);
      expect(customMonitor.config.maxChunks).toBe(50);
    });
  });
});
