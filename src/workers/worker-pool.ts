/**
 * Worker Pool
 * Phase 2: Worker Slot Management
 * TDD London School Implementation
 *
 * Manages worker slots for concurrent execution:
 * - Slot acquisition and release
 * - Capacity management
 * - Auto-release with timeout
 * - Pool statistics
 */

import { WorkerPoolConfig, WorkerSlot } from '../types/worker';

export class WorkerPool {
  private slots: Map<number, WorkerSlot> = new Map();
  private workerToSlot: Map<string, number> = new Map();
  private config: WorkerPoolConfig;
  private nextSlotId: number = 0;
  private autoReleaseInterval?: NodeJS.Timeout;

  constructor(config?: Partial<WorkerPoolConfig>) {
    this.config = {
      maxWorkers: 5,
      autoRelease: false,
      slotTimeout: undefined,
      ...config
    };

    // Validate configuration
    if (this.config.maxWorkers <= 0) {
      throw new Error('Max workers must be greater than 0');
    }

    // Initialize slots
    this.initializeSlots();

    // Setup auto-release if enabled
    if (this.config.autoRelease && this.config.slotTimeout) {
      this.startAutoRelease();
    }
  }

  /**
   * Initialize all worker slots
   */
  private initializeSlots(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.slots.set(i, {
        slotId: i,
        occupied: false
      });
    }
    this.nextSlotId = this.config.maxWorkers;
  }

  /**
   * Acquire a slot for a worker
   */
  acquire(workerId: string): WorkerSlot | null {
    // Validate worker ID
    if (!workerId || workerId.trim() === '') {
      throw new Error('Worker ID cannot be empty');
    }

    // Check for duplicate
    if (this.workerToSlot.has(workerId)) {
      throw new Error(`Worker ID already exists in pool: ${workerId}`);
    }

    // Find available slot
    const availableSlot = Array.from(this.slots.values()).find(slot => !slot.occupied);

    if (!availableSlot) {
      return null; // At capacity
    }

    // Occupy slot
    availableSlot.occupied = true;
    availableSlot.workerId = workerId;
    availableSlot.acquiredAt = Date.now();

    // Map worker to slot
    this.workerToSlot.set(workerId, availableSlot.slotId);

    return availableSlot;
  }

  /**
   * Release a slot by worker ID
   */
  release(workerId: string): void {
    const slotId = this.workerToSlot.get(workerId);

    if (slotId === undefined) {
      throw new Error(`Worker not found in pool: ${workerId}`);
    }

    const slot = this.slots.get(slotId);

    if (slot) {
      // Clear slot
      slot.occupied = false;
      slot.workerId = undefined;
      slot.acquiredAt = undefined;
    }

    // Remove mapping
    this.workerToSlot.delete(workerId);
  }

  /**
   * Check if pool is at capacity
   */
  isAtCapacity(): boolean {
    return this.getAvailableSlots() === 0;
  }

  /**
   * Get number of available slots
   */
  getAvailableSlots(): number {
    return Array.from(this.slots.values()).filter(slot => !slot.occupied).length;
  }

  /**
   * Get number of active workers
   */
  getActiveCount(): number {
    return this.workerToSlot.size;
  }

  /**
   * Get list of active worker IDs
   */
  getActiveWorkers(): string[] {
    return Array.from(this.workerToSlot.keys());
  }

  /**
   * Get slot info by worker ID
   */
  getSlotInfo(workerId: string): WorkerSlot | null {
    const slotId = this.workerToSlot.get(workerId);

    if (slotId === undefined) {
      return null;
    }

    return this.slots.get(slotId) || null;
  }

  /**
   * Check if slot has timed out
   */
  hasSlotTimedOut(slotId: number): boolean {
    if (!this.config.slotTimeout) {
      return false; // No timeout configured
    }

    const slot = this.slots.get(slotId);

    if (!slot || !slot.occupied || !slot.acquiredAt) {
      return false;
    }

    const elapsed = Date.now() - slot.acquiredAt;
    return elapsed > this.config.slotTimeout;
  }

  /**
   * Get maximum workers
   */
  getMaxWorkers(): number {
    return this.config.maxWorkers;
  }

  /**
   * Set maximum workers (resize pool)
   */
  setMaxWorkers(max: number): void {
    if (max <= 0) {
      throw new Error('Max workers must be greater than 0');
    }

    const oldMax = this.config.maxWorkers;
    this.config.maxWorkers = max;

    if (max > oldMax) {
      // Add new slots
      for (let i = oldMax; i < max; i++) {
        this.slots.set(i, {
          slotId: i,
          occupied: false
        });
      }
    }
    // Note: We don't remove slots when decreasing capacity
    // Active workers beyond new limit can continue
  }

  /**
   * Get pool configuration
   */
  getConfig(): WorkerPoolConfig {
    return { ...this.config };
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    maxWorkers: number;
    activeWorkers: number;
    availableSlots: number;
    utilizationPercent: number;
  } {
    const activeWorkers = this.getActiveCount();
    const utilizationPercent = Math.round((activeWorkers / this.config.maxWorkers) * 100);

    return {
      maxWorkers: this.config.maxWorkers,
      activeWorkers,
      availableSlots: this.getAvailableSlots(),
      utilizationPercent
    };
  }

  /**
   * Start auto-release timer
   */
  private startAutoRelease(): void {
    if (!this.config.slotTimeout) {
      return;
    }

    // Check every second for timed-out slots
    this.autoReleaseInterval = setInterval(() => {
      this.checkAndReleaseTimedOutSlots();
    }, 1000);
  }

  /**
   * Check for timed-out slots and release them
   */
  private checkAndReleaseTimedOutSlots(): void {
    for (const [workerId, slotId] of this.workerToSlot.entries()) {
      if (this.hasSlotTimedOut(slotId)) {
        this.release(workerId);
      }
    }
  }

  /**
   * Stop auto-release timer
   */
  stopAutoRelease(): void {
    if (this.autoReleaseInterval) {
      clearInterval(this.autoReleaseInterval);
      this.autoReleaseInterval = undefined;
    }
  }

  /**
   * Cleanup pool resources
   */
  destroy(): void {
    this.stopAutoRelease();
    this.slots.clear();
    this.workerToSlot.clear();
  }
}
