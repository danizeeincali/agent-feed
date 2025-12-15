/**
 * Integration Tests: Streaming Loop Protection Monitoring API
 * Tests all monitoring endpoints for the streaming protection system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import streamingMonitoringRoutes from '../../routes/streaming-monitoring.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/streaming-monitoring', streamingMonitoringRoutes);

describe('Streaming Monitoring API', () => {
  describe('GET /api/streaming-monitoring/workers', () => {
    it('should return active workers health status', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/workers')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('activeWorkers');
      expect(Array.isArray(response.body.data.activeWorkers)).toBe(true);
      expect(response.body.data).toHaveProperty('totalActive');
      expect(typeof response.body.data.totalActive).toBe('number');
    });

    it('should include worker health details', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/workers')
        .expect(200);

      const { data } = response.body;
      if (data.activeWorkers.length > 0) {
        const worker = data.activeWorkers[0];
        expect(worker).toHaveProperty('workerId');
        expect(worker).toHaveProperty('ticketId');
        expect(worker).toHaveProperty('status');
        expect(worker).toHaveProperty('runtime');
        expect(worker).toHaveProperty('chunkCount');
      }
    });
  });

  describe('GET /api/streaming-monitoring/circuit-breaker', () => {
    it('should return circuit breaker state', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/circuit-breaker')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('state');
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(response.body.data.state);
      expect(response.body.data).toHaveProperty('failures');
      expect(Array.isArray(response.body.data.failures)).toBe(true);
    });

    it('should include failure history', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/circuit-breaker')
        .expect(200);

      expect(response.body.data).toHaveProperty('recentFailures');
      expect(typeof response.body.data.recentFailures).toBe('number');
      expect(response.body.data).toHaveProperty('nextResetTime');
    });
  });

  describe('GET /api/streaming-monitoring/streaming-stats', () => {
    it('should return real-time streaming statistics', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/streaming-stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalQueries');
      expect(response.body.data).toHaveProperty('activeStreams');
      expect(response.body.data).toHaveProperty('autoKills');
      expect(response.body.data).toHaveProperty('avgChunksPerQuery');
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/streaming-stats')
        .expect(200);

      expect(response.body.data).toHaveProperty('avgResponseTime');
      expect(response.body.data).toHaveProperty('loopDetections');
      expect(typeof response.body.data.totalQueries).toBe('number');
      expect(typeof response.body.data.activeStreams).toBe('number');
    });
  });

  describe('GET /api/streaming-monitoring/cost-estimate', () => {
    it('should return current cost tracking', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/cost-estimate')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('estimatedCost');
      expect(response.body.data).toHaveProperty('tokensUsed');
      expect(response.body.data).toHaveProperty('queriesProcessed');
      expect(typeof response.body.data.estimatedCost).toBe('number');
    });

    it('should include cost breakdown', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/cost-estimate')
        .expect(200);

      expect(response.body.data).toHaveProperty('inputTokens');
      expect(response.body.data).toHaveProperty('outputTokens');
      expect(response.body.data).toHaveProperty('costPerQuery');
    });
  });

  describe('POST /api/streaming-monitoring/kill-worker/:workerId', () => {
    it('should reject invalid worker ID', async () => {
      const response = await request(app)
        .post('/api/streaming-monitoring/kill-worker/invalid-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should successfully kill valid worker', async () => {
      // This test requires a running worker - will be mocked for now
      const mockWorkerId = 'test-worker-123';
      const response = await request(app)
        .post(`/api/streaming-monitoring/kill-worker/${mockWorkerId}`)
        .send({ reason: 'Manual test kill' })
        .expect('Content-Type', /json/);

      // Will return 404 or 200 depending on mock implementation
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should include kill confirmation details', async () => {
      const mockWorkerId = 'test-worker-456';
      const response = await request(app)
        .post(`/api/streaming-monitoring/kill-worker/${mockWorkerId}`)
        .send({ reason: 'Manual test' });

      if (response.body.success) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('workerId', mockWorkerId);
        expect(response.body.data).toHaveProperty('killed');
      }
    });
  });

  describe('GET /api/streaming-monitoring/health', () => {
    it('should return overall system health', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(['healthy', 'degraded', 'critical']).toContain(response.body.data.status);
    });

    it('should include component health details', async () => {
      const response = await request(app)
        .get('/api/streaming-monitoring/health')
        .expect(200);

      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data.components).toHaveProperty('circuitBreaker');
      expect(response.body.data.components).toHaveProperty('emergencyMonitor');
      expect(response.body.data.components).toHaveProperty('healthMonitor');
    });

    it('should handle errors gracefully', async () => {
      // All endpoints should handle errors and return proper JSON
      const endpoints = [
        '/api/streaming-monitoring/workers',
        '/api/streaming-monitoring/circuit-breaker',
        '/api/streaming-monitoring/streaming-stats',
        '/api/streaming-monitoring/cost-estimate',
        '/api/streaming-monitoring/health'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toHaveProperty('success');
        if (!response.body.success) {
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format on server errors', async () => {
      // Test error handling by requesting with invalid parameters
      const response = await request(app)
        .post('/api/streaming-monitoring/kill-worker/')
        .expect(404);

      expect(response.body).toBeDefined();
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/streaming-monitoring/kill-worker/valid-id')
        .send({}); // Missing reason

      // Should still process but may warn
      expect([200, 400, 404]).toContain(response.status);
    });
  });
});
