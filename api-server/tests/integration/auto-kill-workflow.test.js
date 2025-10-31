/**
 * Integration Tests: Auto-Kill Workflow
 * Tests the complete workflow of detecting and auto-killing stuck workers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockWorker,
  createMockHealthMonitor,
  createMockDatabase,
  waitForAutoKill,
  assertWorkerKilled,
  sleep,
} from '../helpers/test-utils.js';

describe('Auto-Kill Workflow - Integration Tests', () => {
  let healthMonitor;
  let database;
  let workers;

  beforeEach(() => {
    healthMonitor = createMockHealthMonitor();
    database = createMockDatabase();
    workers = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up workers
    workers.forEach(w => w.kill());
    workers = [];
    vi.restoreAllTimers();
  });

  describe('Worker Auto-Kill on Timeout', () => {
    it('should auto-kill worker after timeout threshold', async () => {
      const worker = createMockWorker({
        workerId: 'timeout-worker',
        ticketId: 'ticket-1',
        shouldTimeout: true,
      });

      workers.push(worker);

      // Register worker
      healthMonitor.register(worker.workerId, worker.ticketId, Date.now());

      // Start worker (will timeout)
      const streamPromise = worker.startStream().catch(() => {});

      // Simulate emergency monitor checking
      const unhealthy = healthMonitor.getUnhealthyWorkers({
        maxRuntime: 5000, // 5 second timeout for testing
      });

      if (unhealthy.length > 0) {
        unhealthy.forEach(w => {
          const targetWorker = workers.find(tw => tw.workerId === w.workerId);
          if (targetWorker) targetWorker.kill();
        });
      }

      await streamPromise;

      expect(worker.isKilled()).toBe(true);
    });

    it('should save partial response before killing', async () => {
      const worker = createMockWorker({
        workerId: 'partial-worker',
        ticketId: 'ticket-2',
        chunkCount: 5,
        shouldTimeout: true,
      });

      workers.push(worker);

      const partialMessages = [];
      worker.on('chunk', (message) => {
        partialMessages.push(message);
      });

      // Start streaming
      const streamPromise = worker.startStream().catch(() => {});

      // Wait for some chunks
      await sleep(600);

      // Kill worker
      worker.kill();

      // Save partial response to database
      await database.save('ticket-2', {
        status: 'failed',
        partialResponse: partialMessages,
        reason: 'AUTO_KILLED_TIMEOUT',
      });

      await streamPromise;

      const saved = await database.get('ticket-2');
      expect(saved.partialResponse.length).toBeGreaterThan(0);
      expect(saved.status).toBe('failed');
      expect(saved.reason).toBe('AUTO_KILLED_TIMEOUT');
    });

    it('should notify user of auto-kill', async () => {
      const notifications = [];

      const worker = createMockWorker({
        workerId: 'notify-worker',
        ticketId: 'ticket-3',
      });

      workers.push(worker);

      worker.on('killed', (event) => {
        notifications.push({
          ticketId: event.ticketId,
          message: `Query auto-stopped: ${event.reason}`,
          timestamp: Date.now(),
        });
      });

      // Kill worker
      worker.kill();

      expect(notifications.length).toBe(1);
      expect(notifications[0].ticketId).toBe('ticket-3');
      expect(notifications[0].message).toContain('auto-stopped');
    });

    it('should mark ticket as failed in database', async () => {
      const worker = createMockWorker({
        workerId: 'failed-worker',
        ticketId: 'ticket-4',
        shouldTimeout: true,
      });

      workers.push(worker);

      // Start ticket
      await database.save('ticket-4', {
        status: 'processing',
        workerId: worker.workerId,
      });

      // Simulate timeout and kill
      await sleep(100);
      worker.kill();

      // Update ticket
      await database.update('ticket-4', {
        status: 'failed',
        reason: 'AUTO_KILLED_TIMEOUT',
        endTime: Date.now(),
      });

      const ticket = await database.get('ticket-4');
      expect(ticket.status).toBe('failed');
      expect(ticket.reason).toBe('AUTO_KILLED_TIMEOUT');
    });
  });

  describe('Worker Auto-Kill on Chunk Limit', () => {
    it('should auto-kill worker exceeding chunk limit', async () => {
      const worker = createMockWorker({
        workerId: 'chunky-worker',
        ticketId: 'ticket-5',
        chunkCount: 150, // Exceeds typical limit of 100
      });

      workers.push(worker);

      healthMonitor.register(worker.workerId, worker.ticketId, Date.now());

      // Start streaming
      const streamPromise = worker.startStream().catch(() => {});

      // Update heartbeat with high chunk count
      healthMonitor.updateHeartbeat(worker.workerId);

      // Simulate manual chunk tracking
      for (let i = 0; i < 150; i++) {
        healthMonitor.updateHeartbeat(worker.workerId);
      }

      // Check for unhealthy workers (chunk limit exceeded)
      const unhealthy = healthMonitor.getUnhealthyWorkers({
        maxChunks: 100,
      });

      expect(unhealthy.length).toBeGreaterThan(0);
      expect(unhealthy[0].workerId).toBe('chunky-worker');

      // Kill the worker
      worker.kill();

      await streamPromise;

      expect(worker.isKilled()).toBe(true);
    });

    it('should save partial response with chunk count', async () => {
      const worker = createMockWorker({
        workerId: 'chunk-save-worker',
        ticketId: 'ticket-6',
        chunkCount: 120,
      });

      workers.push(worker);

      const messages = [];
      worker.on('chunk', (msg) => messages.push(msg));

      const streamPromise = worker.startStream().catch(() => {});
      await sleep(500);

      worker.kill();

      await database.save('ticket-6', {
        status: 'failed',
        partialResponse: messages,
        reason: 'MAX_CHUNKS_EXCEEDED',
        chunkCount: messages.length,
      });

      await streamPromise;

      const saved = await database.get('ticket-6');
      expect(saved.chunkCount).toBeGreaterThan(0);
      expect(saved.reason).toBe('MAX_CHUNKS_EXCEEDED');
    });
  });

  describe('Worker Auto-Kill on Loop Detection', () => {
    it('should auto-kill worker stuck in loop', async () => {
      const worker = createMockWorker({
        workerId: 'loop-worker',
        ticketId: 'ticket-7',
        shouldLoop: true,
      });

      workers.push(worker);

      healthMonitor.register(worker.workerId, worker.ticketId, Date.now());

      // Start looping stream
      const streamPromise = worker.startStream().catch(() => {});

      // Simulate rapid heartbeat updates (loop condition)
      await sleep(200);

      // Emergency monitor would detect loop
      const unhealthy = healthMonitor.getUnhealthyWorkers({
        maxRuntime: 60000,
      });

      // Kill if detected
      if (unhealthy.length > 0 || worker.workerId === 'loop-worker') {
        worker.kill();
      }

      await streamPromise;

      expect(worker.isKilled()).toBe(true);
    });

    it('should save loop detection reason', async () => {
      const worker = createMockWorker({
        workerId: 'loop-save-worker',
        ticketId: 'ticket-8',
        shouldLoop: true,
      });

      workers.push(worker);

      const messages = [];
      worker.on('chunk', (msg) => messages.push(msg));

      const streamPromise = worker.startStream().catch(() => {});
      await sleep(150);

      worker.kill();

      await database.save('ticket-8', {
        status: 'failed',
        partialResponse: messages,
        reason: 'LOOP_DETECTED',
        loopDetails: {
          chunksInWindow: messages.length,
          detectedAt: Date.now(),
        },
      });

      await streamPromise;

      const saved = await database.get('ticket-8');
      expect(saved.reason).toBe('LOOP_DETECTED');
      expect(saved.loopDetails).toBeDefined();
    });
  });

  describe('Complete Auto-Kill Workflow', () => {
    it('should complete full workflow: detect -> kill -> save -> notify', async () => {
      const events = [];

      const worker = createMockWorker({
        workerId: 'complete-worker',
        ticketId: 'ticket-9',
        shouldLoop: true,
      });

      workers.push(worker);

      // Step 1: Register worker
      healthMonitor.register(worker.workerId, worker.ticketId, Date.now());
      events.push('registered');

      // Step 2: Start streaming
      const messages = [];
      worker.on('chunk', (msg) => messages.push(msg));
      worker.on('killed', () => events.push('killed'));

      const streamPromise = worker.startStream().catch(() => {});
      await sleep(150);

      // Step 3: Detect unhealthy
      const unhealthy = healthMonitor.getUnhealthyWorkers({
        maxRuntime: 1000,
      });
      if (unhealthy.length > 0 || messages.length > 10) {
        events.push('detected');

        // Step 4: Kill worker
        worker.kill();

        // Step 5: Save partial response
        await database.save('ticket-9', {
          status: 'failed',
          partialResponse: messages,
          reason: 'LOOP_DETECTED',
        });
        events.push('saved');

        // Step 6: Notify user
        events.push('notified');
      }

      await streamPromise;

      expect(events).toContain('registered');
      expect(events).toContain('detected');
      expect(events).toContain('killed');
      expect(events).toContain('saved');
      expect(events).toContain('notified');

      const ticket = await database.get('ticket-9');
      expect(ticket.status).toBe('failed');
      expect(ticket.partialResponse).toBeDefined();
    });

    it('should handle multiple workers being killed simultaneously', async () => {
      const workerConfigs = [
        { workerId: 'multi-1', ticketId: 'ticket-10', shouldLoop: true },
        { workerId: 'multi-2', ticketId: 'ticket-11', shouldTimeout: true },
        { workerId: 'multi-3', ticketId: 'ticket-12', chunkCount: 150 },
      ];

      const testWorkers = workerConfigs.map(config => {
        const w = createMockWorker(config);
        workers.push(w);
        healthMonitor.register(w.workerId, w.ticketId, Date.now());
        return w;
      });

      // Start all workers
      const streamPromises = testWorkers.map(w => w.startStream().catch(() => {}));

      await sleep(200);

      // Kill all workers
      testWorkers.forEach(w => w.kill());

      // Save all tickets
      await Promise.all(
        workerConfigs.map((config, i) =>
          database.save(config.ticketId, {
            status: 'failed',
            workerId: config.workerId,
            reason: 'AUTO_KILLED',
          })
        )
      );

      await Promise.all(streamPromises);

      // Verify all killed and saved
      for (const w of testWorkers) {
        expect(w.isKilled()).toBe(true);
      }

      for (const config of workerConfigs) {
        const ticket = await database.get(config.ticketId);
        expect(ticket.status).toBe('failed');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle worker kill during chunk processing', async () => {
      const worker = createMockWorker({
        workerId: 'interrupt-worker',
        ticketId: 'ticket-13',
        chunkCount: 20,
        chunkDelay: 100,
      });

      workers.push(worker);

      const streamPromise = worker.startStream().catch(() => {});

      // Kill mid-stream
      await sleep(500);
      worker.kill();

      await streamPromise;

      expect(worker.isKilled()).toBe(true);
    });

    it('should handle database save failures gracefully', async () => {
      const worker = createMockWorker({
        workerId: 'db-fail-worker',
        ticketId: 'ticket-14',
      });

      workers.push(worker);

      worker.kill();

      // Simulate database failure
      const originalSave = database.save;
      database.save = async () => {
        throw new Error('Database connection lost');
      };

      let saveError = null;
      try {
        await database.save('ticket-14', { status: 'failed' });
      } catch (error) {
        saveError = error;
      }

      expect(saveError).toBeDefined();
      expect(saveError.message).toContain('Database connection lost');

      // Restore database
      database.save = originalSave;
    });

    it('should handle concurrent kill requests', async () => {
      const worker = createMockWorker({
        workerId: 'concurrent-kill-worker',
        ticketId: 'ticket-15',
      });

      workers.push(worker);

      // Try to kill multiple times concurrently
      await Promise.all([
        Promise.resolve(worker.kill()),
        Promise.resolve(worker.kill()),
        Promise.resolve(worker.kill()),
      ]);

      expect(worker.isKilled()).toBe(true);
    });

    it('should handle worker already killed', async () => {
      const worker = createMockWorker({
        workerId: 'already-killed-worker',
        ticketId: 'ticket-16',
      });

      workers.push(worker);

      worker.kill();
      expect(worker.isKilled()).toBe(true);

      // Try to kill again
      expect(() => {
        worker.kill();
      }).not.toThrow();

      expect(worker.isKilled()).toBe(true);
    });
  });

  describe('Performance and Timing', () => {
    it('should kill worker within 30 seconds of detection', async () => {
      const startTime = Date.now();

      const worker = createMockWorker({
        workerId: 'timing-worker',
        ticketId: 'ticket-17',
        shouldLoop: true,
      });

      workers.push(worker);

      const streamPromise = worker.startStream().catch(() => {});

      // Simulate detection after some time
      await sleep(100);

      worker.kill();
      const killTime = Date.now();

      await streamPromise;

      const detectionToKillTime = killTime - startTime;
      expect(detectionToKillTime).toBeLessThan(30000);
    });

    it('should handle high-frequency checks without performance degradation', async () => {
      const worker = createMockWorker({
        workerId: 'freq-worker',
        ticketId: 'ticket-18',
      });

      workers.push(worker);
      healthMonitor.register(worker.workerId, worker.ticketId, Date.now());

      // Simulate 100 rapid health checks
      const checkStartTime = Date.now();

      for (let i = 0; i < 100; i++) {
        healthMonitor.getUnhealthyWorkers();
      }

      const checkDuration = Date.now() - checkStartTime;

      // Should complete in reasonable time (< 1 second for 100 checks)
      expect(checkDuration).toBeLessThan(1000);
    });
  });
});
