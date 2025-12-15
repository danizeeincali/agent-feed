/**
 * Avi State Repository Tests
 * Tests for orchestrator state management (TIER 1: AVI Architecture)
 *
 * Test Strategy: Real PostgreSQL integration (no mocks)
 * Database: Uses PostgreSQL in test mode
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import aviStateRepo from '../../../repositories/postgres/avi-state.repository.js';
import postgresManager from '../../../config/postgres.js';

describe('AviStateRepository', () => {
  beforeAll(async () => {
    // Ensure PostgreSQL connection
    await postgresManager.connect();
    const healthy = await postgresManager.healthCheck();
    if (!healthy) {
      throw new Error('PostgreSQL not healthy');
    }
  });

  afterAll(async () => {
    await postgresManager.close();
  });

  beforeEach(async () => {
    // Reset state to clean slate
    await aviStateRepo.initialize();
  });

  describe('getState', () => {
    it('should retrieve current orchestrator state', async () => {
      const state = await aviStateRepo.getState();

      expect(state).toBeDefined();
      expect(state.id).toBe(1);
      expect(state).toHaveProperty('context_size');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('active_workers');
    });

    it('should return null if no state exists (edge case)', async () => {
      // Delete state temporarily
      await postgresManager.query('DELETE FROM avi_state WHERE id = 1');

      const state = await aviStateRepo.getState();
      expect(state).toBeNull();

      // Restore state
      await aviStateRepo.initialize();
    });
  });

  describe('updateState', () => {
    it('should update multiple state fields', async () => {
      const updates = {
        context_size: 1500,
        active_workers: 3,
        status: 'running'
      };

      const updated = await aviStateRepo.updateState(updates);

      expect(updated.context_size).toBe(1500);
      expect(updated.active_workers).toBe(3);
      expect(updated.status).toBe('running');
    });

    it('should update pending_tickets as JSONB', async () => {
      const ticketIds = ['ticket-1', 'ticket-2', 'ticket-3'];

      const updated = await aviStateRepo.updateState({
        pending_tickets: ticketIds
      });

      expect(updated.pending_tickets).toEqual(ticketIds);
    });

    it('should reject unknown fields', async () => {
      await expect(
        aviStateRepo.updateState({ invalid_field: 'test' })
      ).rejects.toThrow('No valid fields to update');
    });

    it('should always update updated_at timestamp', async () => {
      const before = await aviStateRepo.getState();

      // Wait a moment to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await aviStateRepo.updateState({ context_size: 100 });
      const after = await aviStateRepo.getState();

      expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
        new Date(before.updated_at).getTime()
      );
    });
  });

  describe('updateContextSize', () => {
    it('should update context size', async () => {
      const updated = await aviStateRepo.updateContextSize(25000);

      expect(updated.context_size).toBe(25000);
    });

    it('should handle zero context size', async () => {
      const updated = await aviStateRepo.updateContextSize(0);

      expect(updated.context_size).toBe(0);
    });
  });

  describe('updateFeedPosition', () => {
    it('should update last feed position', async () => {
      const postId = 'post-12345';
      const updated = await aviStateRepo.updateFeedPosition(postId);

      expect(updated.last_feed_position).toBe(postId);
    });
  });

  describe('updateActiveWorkers', () => {
    it('should update active worker count', async () => {
      const updated = await aviStateRepo.updateActiveWorkers(5);

      expect(updated.active_workers).toBe(5);
    });

    it('should handle zero workers', async () => {
      const updated = await aviStateRepo.updateActiveWorkers(0);

      expect(updated.active_workers).toBe(0);
    });
  });

  describe('incrementWorkersSpawned', () => {
    it('should increment workers spawned counter', async () => {
      await aviStateRepo.updateState({ workers_spawned: 10 });

      const updated = await aviStateRepo.incrementWorkersSpawned();

      expect(updated.workers_spawned).toBe(11);
    });

    it('should handle null initial value', async () => {
      await postgresManager.query(
        'UPDATE avi_state SET workers_spawned = NULL WHERE id = 1'
      );

      const updated = await aviStateRepo.incrementWorkersSpawned();

      expect(updated.workers_spawned).toBe(1);
    });
  });

  describe('incrementTicketsProcessed', () => {
    it('should increment tickets processed counter', async () => {
      await aviStateRepo.updateState({ tickets_processed: 100 });

      const updated = await aviStateRepo.incrementTicketsProcessed();

      expect(updated.tickets_processed).toBe(101);
    });
  });

  describe('recordRestart', () => {
    it('should record graceful restart with pending tickets', async () => {
      const pendingTickets = ['ticket-1', 'ticket-2'];

      const updated = await aviStateRepo.recordRestart(pendingTickets);

      expect(updated.status).toBe('restarting');
      expect(updated.context_size).toBe(0);
      expect(updated.pending_tickets).toEqual(pendingTickets);
      expect(updated.last_restart).toBeDefined();
    });

    it('should handle empty pending tickets array', async () => {
      const updated = await aviStateRepo.recordRestart([]);

      expect(updated.status).toBe('restarting');
      expect(updated.pending_tickets).toEqual([]);
    });
  });

  describe('markRunning', () => {
    it('should mark orchestrator as running', async () => {
      const updated = await aviStateRepo.markRunning();

      expect(updated.status).toBe('running');
      expect(updated.start_time).toBeDefined();
    });
  });

  describe('recordHealthCheck', () => {
    it('should record successful health check', async () => {
      const updated = await aviStateRepo.recordHealthCheck();

      expect(updated.last_health_check).toBeDefined();
      expect(updated.last_error).toBeNull();
    });

    it('should record failed health check with error', async () => {
      const errorMsg = 'Database connection timeout';
      const updated = await aviStateRepo.recordHealthCheck(errorMsg);

      expect(updated.last_health_check).toBeDefined();
      expect(updated.last_error).toBe(errorMsg);
    });
  });

  describe('isContextOverLimit', () => {
    it('should return true when context exceeds limit', async () => {
      await aviStateRepo.updateContextSize(55000);

      const isOver = await aviStateRepo.isContextOverLimit(50000);

      expect(isOver).toBe(true);
    });

    it('should return false when context under limit', async () => {
      await aviStateRepo.updateContextSize(45000);

      const isOver = await aviStateRepo.isContextOverLimit(50000);

      expect(isOver).toBe(false);
    });

    it('should use default limit of 50000', async () => {
      await aviStateRepo.updateContextSize(51000);

      const isOver = await aviStateRepo.isContextOverLimit();

      expect(isOver).toBe(true);
    });
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', async () => {
      await aviStateRepo.markRunning();

      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 100));

      const uptime = await aviStateRepo.getUptime();

      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });

    it('should return 0 if start_time is null', async () => {
      await postgresManager.query(
        'UPDATE avi_state SET start_time = NULL WHERE id = 1'
      );

      const uptime = await aviStateRepo.getUptime();

      expect(uptime).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics summary', async () => {
      await aviStateRepo.updateState({
        status: 'running',
        context_size: 15000,
        active_workers: 3,
        workers_spawned: 25,
        tickets_processed: 100
      });

      const metrics = await aviStateRepo.getMetrics();

      expect(metrics).toMatchObject({
        status: 'running',
        context_size: 15000,
        active_workers: 3,
        workers_spawned: 25,
        tickets_processed: 100
      });
      expect(metrics).toHaveProperty('uptime_seconds');
      expect(metrics).toHaveProperty('last_health_check');
    });

    it('should return null if no state exists', async () => {
      await postgresManager.query('DELETE FROM avi_state WHERE id = 1');

      const metrics = await aviStateRepo.getMetrics();

      expect(metrics).toBeNull();

      // Restore
      await aviStateRepo.initialize();
    });
  });

  describe('initialize', () => {
    it('should initialize fresh state', async () => {
      const state = await aviStateRepo.initialize();

      expect(state.id).toBe(1);
      expect(state.status).toBe('initializing');
      expect(state.context_size).toBe(0);
      expect(state.tickets_processed).toBe(0);
      expect(state.workers_spawned).toBe(0);
      expect(state.active_workers).toBe(0);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await aviStateRepo.initialize();
      await aviStateRepo.updateState({ context_size: 5000 });

      // Initialize again - should reset
      const state = await aviStateRepo.initialize();

      expect(state.context_size).toBe(0);
      expect(state.status).toBe('initializing');
    });
  });

  describe('Integration: Restart Workflow', () => {
    it('should handle complete restart workflow', async () => {
      // 1. Running state with context
      await aviStateRepo.markRunning();
      await aviStateRepo.updateContextSize(48000);
      await aviStateRepo.updateState({
        workers_spawned: 10,
        tickets_processed: 50
      });

      // 2. Record restart
      const pendingTickets = ['ticket-1', 'ticket-2'];
      const restart = await aviStateRepo.recordRestart(pendingTickets);
      expect(restart.status).toBe('restarting');
      expect(restart.context_size).toBe(0);
      expect(restart.pending_tickets).toEqual(pendingTickets);

      // 3. Mark running again
      const running = await aviStateRepo.markRunning();
      expect(running.status).toBe('running');

      // 4. Counters should persist
      const final = await aviStateRepo.getState();
      expect(final.workers_spawned).toBe(10);
      expect(final.tickets_processed).toBe(50);
    });
  });
});
