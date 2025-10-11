/**
 * AVI Control API Routes Tests
 * TDD tests for orchestrator control endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import aviControlRouter from '../../routes/avi-control.js';
import postgresManager from '../../config/postgres.js';
import aviStateRepo from '../../repositories/postgres/avi-state.repository.js';
import workQueueRepo from '../../repositories/postgres/work-queue.repository.js';

describe('AVI Control API Routes', () => {
  let app;

  beforeAll(async () => {
    // Connect to PostgreSQL
    await postgresManager.connect();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/avi', aviControlRouter);
  });

  afterAll(async () => {
    await postgresManager.close();
  });

  beforeEach(async () => {
    // Reset state
    await aviStateRepo.initialize();

    // Clear work queue
    await postgresManager.query('DELETE FROM work_queue');
  });

  describe('GET /api/avi/status', () => {
    it('should return orchestrator status', async () => {
      const response = await request(app)
        .get('/api/avi/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('contextSize');
      expect(response.body.data).toHaveProperty('activeWorkers');
      expect(response.body.data).toHaveProperty('queueStats');
    });

    it('should include queue statistics', async () => {
      const response = await request(app)
        .get('/api/avi/status')
        .expect(200);

      const { queueStats } = response.body.data;
      expect(queueStats).toHaveProperty('pending');
      expect(queueStats).toHaveProperty('processing');
      expect(queueStats).toHaveProperty('completed');
      expect(queueStats).toHaveProperty('failed');
    });
  });

  describe('POST /api/avi/start', () => {
    it('should start the orchestrator', async () => {
      const response = await request(app)
        .post('/api/avi/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('started');
      expect(response.body.data.status).toBe('running');
    });

    it('should reject start if already running', async () => {
      // Start first time
      await request(app).post('/api/avi/start').expect(200);

      // Try to start again
      const response = await request(app)
        .post('/api/avi/start')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already running');
    });
  });

  describe('POST /api/avi/stop', () => {
    it('should stop the orchestrator gracefully', async () => {
      // Start first
      await request(app).post('/api/avi/start').expect(200);

      // Stop
      const response = await request(app)
        .post('/api/avi/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('stopped');
    });

    it('should preserve pending tickets on stop', async () => {
      // Start orchestrator
      await request(app).post('/api/avi/start').expect(200);

      // Create pending tickets
      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-1',
        post_content: 'Test post',
        priority: 5
      });

      await workQueueRepo.createTicket({
        user_id: 'user-1',
        post_id: 'post-2',
        post_content: 'Test post 2',
        priority: 3
      });

      // Stop
      const response = await request(app)
        .post('/api/avi/stop')
        .expect(200);

      expect(response.body.data.preservedTickets).toBeGreaterThanOrEqual(0);
      expect(response.body.data.pendingTickets).toBeGreaterThan(0);
    });

    it('should reject stop if not running', async () => {
      const response = await request(app)
        .post('/api/avi/stop')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not running');
    });
  });

  describe('POST /api/avi/restart', () => {
    it('should restart the orchestrator', async () => {
      const response = await request(app)
        .post('/api/avi/restart')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('restarted');
      expect(response.body.data.status).toBe('running');
    });

    it('should reset context on restart', async () => {
      // Set high context size
      await aviStateRepo.updateContextSize(45000);

      // Restart
      await request(app).post('/api/avi/restart').expect(200);

      // Check context reset
      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(0);
    });
  });

  describe('GET /api/avi/metrics', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/avi/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orchestrator');
      expect(response.body.data).toHaveProperty('queue');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should include orchestrator metrics', async () => {
      const response = await request(app)
        .get('/api/avi/metrics')
        .expect(200);

      const { orchestrator } = response.body.data;
      expect(orchestrator).toHaveProperty('status');
      expect(orchestrator).toHaveProperty('contextSize');
      expect(orchestrator).toHaveProperty('activeWorkers');
      expect(orchestrator).toHaveProperty('workersSpawned');
      expect(orchestrator).toHaveProperty('ticketsProcessed');
    });

    it('should include queue metrics', async () => {
      const response = await request(app)
        .get('/api/avi/metrics')
        .expect(200);

      const { queue } = response.body.data;
      expect(queue).toHaveProperty('pending');
      expect(queue).toHaveProperty('processing');
      expect(queue).toHaveProperty('completed');
      expect(queue).toHaveProperty('total');
    });
  });

  describe('GET /api/avi/health', () => {
    it('should return health status when healthy', async () => {
      // Start orchestrator
      await request(app).post('/api/avi/start').expect(200);

      const response = await request(app)
        .get('/api/avi/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.healthy).toBe(true);
      expect(response.body.data.status).toBe('running');
    });

    it('should detect context over limit', async () => {
      // Set context over limit
      await aviStateRepo.updateContextSize(55000);
      await aviStateRepo.markRunning();

      const response = await request(app)
        .get('/api/avi/health')
        .expect(200);

      expect(response.body.data.contextOverLimit).toBe(true);
      expect(response.body.data.warnings).toContain('Context size over limit');
    });

    it('should report unhealthy when stopped', async () => {
      await aviStateRepo.updateState({ status: 'stopped' });

      const response = await request(app)
        .get('/api/avi/health')
        .expect(200);

      expect(response.body.healthy).toBe(false);
    });
  });
});
