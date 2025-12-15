/**
 * Worker Pool Unit Tests
 * TDD London School - Mock-First Approach
 *
 * Test Coverage:
 * - Worker slot acquisition
 * - Worker slot release
 * - Capacity management
 * - Auto-release functionality
 * - Slot timeout handling
 */

import { WorkerPool } from '../../../src/workers/worker-pool';
import { WorkerPoolConfig } from '../../../src/types/worker';

describe('WorkerPool - TDD London School Tests', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create pool with default max workers (5)', () => {
      pool = new WorkerPool();

      expect(pool.getMaxWorkers()).toBe(5);
      expect(pool.getAvailableSlots()).toBe(5);
    });

    it('should create pool with custom max workers', () => {
      pool = new WorkerPool({ maxWorkers: 10 });

      expect(pool.getMaxWorkers()).toBe(10);
      expect(pool.getAvailableSlots()).toBe(10);
    });

    it('should initialize with auto-release disabled by default', () => {
      pool = new WorkerPool();

      const config = pool.getConfig();
      expect(config.autoRelease).toBe(false);
    });

    it('should accept auto-release configuration', () => {
      pool = new WorkerPool({ maxWorkers: 5, autoRelease: true });

      const config = pool.getConfig();
      expect(config.autoRelease).toBe(true);
    });
  });

  describe('Slot Acquisition', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 3 });
    });

    it('should acquire slot when available', () => {
      const slot = pool.acquire('worker-001');

      expect(slot).toBeDefined();
      expect(slot.occupied).toBe(true);
      expect(slot.workerId).toBe('worker-001');
      expect(pool.getAvailableSlots()).toBe(2);
    });

    it('should assign unique slot IDs', () => {
      const slot1 = pool.acquire('worker-001');
      const slot2 = pool.acquire('worker-002');

      expect(slot1.slotId).not.toBe(slot2.slotId);
    });

    it('should track acquisition timestamp', () => {
      const beforeAcquire = Date.now();
      const slot = pool.acquire('worker-001');
      const afterAcquire = Date.now();

      expect(slot.acquiredAt).toBeGreaterThanOrEqual(beforeAcquire);
      expect(slot.acquiredAt).toBeLessThanOrEqual(afterAcquire);
    });

    it('should return null when at capacity', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');
      pool.acquire('worker-003');

      const slot4 = pool.acquire('worker-004');

      expect(slot4).toBeNull();
      expect(pool.isAtCapacity()).toBe(true);
    });

    it('should decrease available slots on acquisition', () => {
      expect(pool.getAvailableSlots()).toBe(3);

      pool.acquire('worker-001');
      expect(pool.getAvailableSlots()).toBe(2);

      pool.acquire('worker-002');
      expect(pool.getAvailableSlots()).toBe(1);
    });
  });

  describe('Slot Release', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 3 });
    });

    it('should release slot by worker ID', () => {
      const slot = pool.acquire('worker-001');

      expect(pool.getAvailableSlots()).toBe(2);

      pool.release('worker-001');

      expect(pool.getAvailableSlots()).toBe(3);
    });

    it('should clear slot data on release', () => {
      pool.acquire('worker-001');
      pool.release('worker-001');

      // Acquiring again should get a clean slot
      const newSlot = pool.acquire('worker-002');
      expect(newSlot.workerId).toBe('worker-002');
    });

    it('should throw error when releasing non-existent worker', () => {
      expect(() => pool.release('non-existent')).toThrow(
        'Worker not found in pool: non-existent'
      );
    });

    it('should allow re-acquisition after release', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');
      pool.acquire('worker-003');

      expect(pool.isAtCapacity()).toBe(true);

      pool.release('worker-001');

      expect(pool.isAtCapacity()).toBe(false);

      const newSlot = pool.acquire('worker-004');
      expect(newSlot).toBeDefined();
    });

    it('should increase available slots on release', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');

      expect(pool.getAvailableSlots()).toBe(1);

      pool.release('worker-001');

      expect(pool.getAvailableSlots()).toBe(2);
    });
  });

  describe('Capacity Management', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 5 });
    });

    it('should report not at capacity when slots available', () => {
      expect(pool.isAtCapacity()).toBe(false);

      pool.acquire('worker-001');
      expect(pool.isAtCapacity()).toBe(false);
    });

    it('should report at capacity when all slots occupied', () => {
      for (let i = 1; i <= 5; i++) {
        pool.acquire(`worker-00${i}`);
      }

      expect(pool.isAtCapacity()).toBe(true);
      expect(pool.getAvailableSlots()).toBe(0);
    });

    it('should track active worker count', () => {
      expect(pool.getActiveCount()).toBe(0);

      pool.acquire('worker-001');
      expect(pool.getActiveCount()).toBe(1);

      pool.acquire('worker-002');
      expect(pool.getActiveCount()).toBe(2);

      pool.release('worker-001');
      expect(pool.getActiveCount()).toBe(1);
    });

    it('should list all active workers', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');
      pool.acquire('worker-003');

      const activeWorkers = pool.getActiveWorkers();

      expect(activeWorkers).toHaveLength(3);
      expect(activeWorkers).toContain('worker-001');
      expect(activeWorkers).toContain('worker-002');
      expect(activeWorkers).toContain('worker-003');
    });

    it('should get slot info by worker ID', () => {
      const slot = pool.acquire('worker-001');

      const info = pool.getSlotInfo('worker-001');

      expect(info).toEqual(slot);
      expect(info.workerId).toBe('worker-001');
      expect(info.occupied).toBe(true);
    });

    it('should return null for non-existent slot info', () => {
      const info = pool.getSlotInfo('non-existent');

      expect(info).toBeNull();
    });
  });

  describe('Auto-Release', () => {
    beforeEach(() => {
      pool = new WorkerPool({
        maxWorkers: 3,
        autoRelease: true,
        slotTimeout: 1000 // 1 second
      });
    });

    it('should auto-release slots after timeout', async () => {
      pool.acquire('worker-001');

      expect(pool.getActiveCount()).toBe(1);

      // Wait for timeout (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(pool.getActiveCount()).toBe(0);
    });

    it('should not auto-release when disabled', async () => {
      pool = new WorkerPool({
        maxWorkers: 3,
        autoRelease: false,
        slotTimeout: 100
      });

      pool.acquire('worker-001');

      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should still be occupied
      expect(pool.getActiveCount()).toBe(1);
    });

    it('should auto-release multiple timed-out slots', async () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');
      pool.acquire('worker-003');

      expect(pool.getActiveCount()).toBe(3);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getAvailableSlots()).toBe(3);
    });
  });

  describe('Slot Timeout Handling', () => {
    beforeEach(() => {
      pool = new WorkerPool({
        maxWorkers: 3,
        slotTimeout: 5000 // 5 seconds
      });
    });

    it('should check if slot has timed out', async () => {
      const slot = pool.acquire('worker-001');

      // Initially not timed out
      expect(pool.hasSlotTimedOut(slot.slotId)).toBe(false);

      // Mock passage of time
      jest.useFakeTimers();
      jest.advanceTimersByTime(6000);

      expect(pool.hasSlotTimedOut(slot.slotId)).toBe(true);

      jest.useRealTimers();
    });

    it('should handle timeout with no configured timeout', () => {
      pool = new WorkerPool({ maxWorkers: 3 }); // No slotTimeout

      const slot = pool.acquire('worker-001');

      // Should never timeout
      expect(pool.hasSlotTimedOut(slot.slotId)).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 5 });
    });

    it('should get current configuration', () => {
      const config = pool.getConfig();

      expect(config).toMatchObject({
        maxWorkers: 5,
        autoRelease: false
      });
    });

    it('should update max workers', () => {
      pool.setMaxWorkers(10);

      expect(pool.getMaxWorkers()).toBe(10);
      expect(pool.getAvailableSlots()).toBe(10);
    });

    it('should preserve occupied slots when increasing capacity', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');

      expect(pool.getActiveCount()).toBe(2);

      pool.setMaxWorkers(10);

      expect(pool.getActiveCount()).toBe(2);
      expect(pool.getAvailableSlots()).toBe(8);
    });

    it('should not kill workers when decreasing capacity', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');
      pool.acquire('worker-003');

      expect(pool.getActiveCount()).toBe(3);

      pool.setMaxWorkers(2);

      // Workers should still exist (over capacity)
      expect(pool.getActiveCount()).toBe(3);
      expect(pool.getMaxWorkers()).toBe(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 3 });
    });

    it('should handle invalid max workers on creation', () => {
      expect(() => new WorkerPool({ maxWorkers: 0 })).toThrow(
        'Max workers must be greater than 0'
      );

      expect(() => new WorkerPool({ maxWorkers: -5 })).toThrow(
        'Max workers must be greater than 0'
      );
    });

    it('should handle invalid max workers on update', () => {
      expect(() => pool.setMaxWorkers(0)).toThrow(
        'Max workers must be greater than 0'
      );

      expect(() => pool.setMaxWorkers(-10)).toThrow(
        'Max workers must be greater than 0'
      );
    });

    it('should handle acquiring with empty worker ID', () => {
      expect(() => pool.acquire('')).toThrow(
        'Worker ID cannot be empty'
      );
    });

    it('should handle double acquisition of same worker ID', () => {
      pool.acquire('worker-001');

      expect(() => pool.acquire('worker-001')).toThrow(
        'Worker ID already exists in pool: worker-001'
      );
    });

    it('should handle releasing same worker twice', () => {
      pool.acquire('worker-001');
      pool.release('worker-001');

      expect(() => pool.release('worker-001')).toThrow(
        'Worker not found in pool: worker-001'
      );
    });
  });

  describe('Pool Statistics', () => {
    beforeEach(() => {
      pool = new WorkerPool({ maxWorkers: 10 });
    });

    it('should provide pool statistics', () => {
      pool.acquire('worker-001');
      pool.acquire('worker-002');

      const stats = pool.getStats();

      expect(stats).toMatchObject({
        maxWorkers: 10,
        activeWorkers: 2,
        availableSlots: 8,
        utilizationPercent: 20 // 2/10 * 100
      });
    });

    it('should calculate utilization percentage correctly', () => {
      // Fill to 50%
      for (let i = 1; i <= 5; i++) {
        pool.acquire(`worker-00${i}`);
      }

      const stats = pool.getStats();

      expect(stats.utilizationPercent).toBe(50);
    });

    it('should show 100% utilization when at capacity', () => {
      for (let i = 1; i <= 10; i++) {
        pool.acquire(`worker-0${i}`);
      }

      const stats = pool.getStats();

      expect(stats.utilizationPercent).toBe(100);
      expect(pool.isAtCapacity()).toBe(true);
    });
  });

  describe('Interaction Testing (London School)', () => {
    it('should follow correct acquisition and release sequence', () => {
      pool = new WorkerPool({ maxWorkers: 5 });

      // Track state changes
      const stateLog: string[] = [];

      const slot1 = pool.acquire('worker-001');
      stateLog.push(`acquired:${slot1.slotId}`);

      const slot2 = pool.acquire('worker-002');
      stateLog.push(`acquired:${slot2.slotId}`);

      pool.release('worker-001');
      stateLog.push('released:worker-001');

      const slot3 = pool.acquire('worker-003');
      stateLog.push(`acquired:${slot3.slotId}`);

      // Verify sequence
      expect(stateLog).toEqual([
        `acquired:${slot1.slotId}`,
        `acquired:${slot2.slotId}`,
        'released:worker-001',
        `acquired:${slot3.slotId}`
      ]);

      // Verify final state
      expect(pool.getActiveCount()).toBe(2);
      expect(pool.getActiveWorkers()).toContain('worker-002');
      expect(pool.getActiveWorkers()).toContain('worker-003');
      expect(pool.getActiveWorkers()).not.toContain('worker-001');
    });
  });
});
