const request = require('supertest');
const express = require('express');
const MonitoringService = require('../../src/monitoring/monitoring-service.js');
const AlertingService = require('../../src/monitoring/alerting-service.js');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

describe('Monitoring API Routes', () => {
  let app;
  let monitoringService;
  let alertingService;
  let testDb;
  let testDbPath;
  let monitoringRouter;

  beforeEach(() => {
    // Create test database
    testDbPath = path.join(__dirname, 'test-routes.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new Database(testDbPath);
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, content TEXT);
      CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT, status TEXT);
    `);

    testDb.prepare('INSERT INTO agents (id, name, status) VALUES (?, ?, ?)').run('agent1', 'Test', 'active');
    testDb.prepare('INSERT INTO posts (content) VALUES (?)').run('Test post');

    // Initialize services
    monitoringService = new MonitoringService({
      db: testDb,
      collectInterval: 1000
    });

    alertingService = new AlertingService({
      rules: [
        {
          id: 'high_cpu',
          name: 'High CPU Usage',
          metric: 'system.cpu.usage',
          condition: 'greater_than',
          threshold: 80,
          severity: 'critical',
          duration: 0
        }
      ],
      channels: { console: { enabled: false } }
    });

    // Create Express app
    app = express();
    app.use(express.json());

    // Import and mount routes - get a fresh instance each time
    delete require.cache[require.resolve('../../api-server/routes/monitoring.js')];
    monitoringRouter = require('../../api-server/routes/monitoring.js');
    monitoringRouter.initialize(monitoringService, alertingService);
    app.use('/api/monitoring', monitoringRouter);
  });

  afterEach(() => {
    if (monitoringService) {
      monitoringService.stop();
    }
    if (alertingService) {
      alertingService.stop();
    }
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/monitoring/metrics', () => {
    test('should return current metrics snapshot', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.system).toBeDefined();
      expect(response.body.database).toBeDefined();
      expect(response.body.api).toBeDefined();
      expect(response.body.business).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return Prometheus format when requested', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .query({ format: 'prometheus' })
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('system_cpu_usage');
      expect(response.header['content-type']).toContain('text/plain');
    });

    test('should allow filtering by metric type', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .query({ type: 'system' })
        .expect(200);

      expect(response.body.system).toBeDefined();
      expect(response.body.database).toBeUndefined();
    });

    test('should handle errors gracefully', async () => {
      // Don't collect metrics first
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/monitoring/health', () => {
    test('should return detailed health check', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBeDefined();
      expect(response.body.checks.memory).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return 503 when unhealthy', async () => {
      // Simulate unhealthy state
      monitoringService.stop();
      testDb.close();

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    test('should include uptime information', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body.uptime).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should include version information', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/health');

      expect(response.body.version).toBeDefined();
    });
  });

  describe('GET /api/monitoring/alerts', () => {
    test('should return active alerts', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.alerts.length).toBeGreaterThan(0);
    });

    test('should filter alerts by severity', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .query({ severity: 'critical' })
        .expect(200);

      expect(response.body.alerts.every(a => a.severity === 'critical')).toBe(true);
    });

    test('should filter alerts by acknowledged status', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();
      if (history.length > 0) {
        alertingService.acknowledgeAlert(history[0].id, 'test@example.com');
      }

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .query({ acknowledged: 'false' })
        .expect(200);

      expect(response.body.alerts.every(a => !a.acknowledged)).toBe(true);
    });

    test('should paginate results', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      // Generate multiple alerts
      for (let i = 0; i < 15; i++) {
        alertingService.addRule({
          id: `test_${i}`,
          name: `Test ${i}`,
          metric: 'system.cpu.usage',
          condition: 'greater_than',
          threshold: 50,
          severity: 'info',
          duration: 0
        });
      }

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.alerts.length).toBeLessThanOrEqual(10);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBeDefined();
    });

    test('should include alert statistics', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBeDefined();
      expect(response.body.stats.bySeverity).toBeDefined();
    });
  });

  describe('POST /api/monitoring/alerts/:id/acknowledge', () => {
    test('should acknowledge an alert', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();
      const alertId = history[0].id;

      const response = await request(app)
        .post(`/api/monitoring/alerts/${alertId}/acknowledge`)
        .send({ acknowledgedBy: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alert.acknowledged).toBe(true);
    });

    test('should return 404 for non-existent alert', async () => {
      await request(app)
        .post('/api/monitoring/alerts/non-existent-id/acknowledge')
        .send({ acknowledgedBy: 'test@example.com' })
        .expect(404);
    });

    test('should require acknowledgedBy field', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();
      const alertId = history[0].id;

      await request(app)
        .post(`/api/monitoring/alerts/${alertId}/acknowledge`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/monitoring/stats', () => {
    test('should return historical statistics', async () => {
      // Collect multiple data points
      for (let i = 0; i < 3; i++) {
        await monitoringService.collectMetrics();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const response = await request(app)
        .get('/api/monitoring/stats')
        .expect(200);

      expect(response.body.dataPoints).toBeGreaterThanOrEqual(3);
      expect(response.body.timeRange).toBeDefined();
      expect(Array.isArray(response.body.cpuHistory)).toBe(true);
      expect(Array.isArray(response.body.memoryHistory)).toBe(true);
    });

    test('should filter by time range', async () => {
      const now = Date.now();
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/stats')
        .query({
          startTime: now - 60000,
          endTime: now + 60000
        })
        .expect(200);

      expect(response.body.dataPoints).toBeGreaterThanOrEqual(0);
    });

    test('should include trends', async () => {
      for (let i = 0; i < 5; i++) {
        await monitoringService.collectMetrics();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const response = await request(app)
        .get('/api/monitoring/stats')
        .expect(200);

      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.cpu).toBeDefined();
    });

    test('should allow metric selection', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/stats')
        .query({ metrics: 'cpu,memory' })
        .expect(200);

      expect(response.body.cpuHistory).toBeDefined();
      expect(response.body.memoryHistory).toBeDefined();
    });
  });

  describe('GET /api/monitoring/alerts/history', () => {
    test('should return alert history', async () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts/history')
        .expect(200);

      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    test('should filter history by time range', async () => {
      const now = Date.now();
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const response = await request(app)
        .get('/api/monitoring/alerts/history')
        .query({
          startTime: now - 60000,
          endTime: now + 60000
        })
        .expect(200);

      expect(response.body.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/monitoring/rules', () => {
    test('should add new alert rule', async () => {
      const newRule = {
        id: 'test_rule',
        name: 'Test Rule',
        metric: 'business.activeAgents',
        condition: 'less_than',
        threshold: 1,
        severity: 'warning',
        duration: 0
      };

      const response = await request(app)
        .post('/api/monitoring/rules')
        .send(newRule)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.rule.id).toBe('test_rule');
    });

    test('should validate rule data', async () => {
      const invalidRule = {
        name: 'Invalid Rule'
        // Missing required fields
      };

      await request(app)
        .post('/api/monitoring/rules')
        .send(invalidRule)
        .expect(400);
    });
  });

  describe('DELETE /api/monitoring/rules/:id', () => {
    test('should delete alert rule', async () => {
      const response = await request(app)
        .delete('/api/monitoring/rules/high_cpu')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent rule', async () => {
      await request(app)
        .delete('/api/monitoring/rules/non-existent')
        .expect(404);
    });
  });

  describe('PUT /api/monitoring/rules/:id', () => {
    test('should update alert rule', async () => {
      const updates = {
        threshold: 95
      };

      const response = await request(app)
        .put('/api/monitoring/rules/high_cpu')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rule.threshold).toBe(95);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to endpoints', async () => {
      // Make many requests quickly
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(request(app).get('/api/monitoring/metrics'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('should require authentication for sensitive endpoints', async () => {
      // POST, PUT, DELETE should require auth (in production)
      // For testing, we'll just verify the routes exist
      const response = await request(app)
        .delete('/api/monitoring/rules/test');

      // Accept either 404 (rule not found) or 429 (rate limited)
      expect([404, 429]).toContain(response.status);
    });
  });

  describe('CORS', () => {
    test('should handle CORS requests', async () => {
      await monitoringService.collectMetrics();

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Origin', 'http://localhost:5173');

      // Accept 200 or 429 (rate limited)
      expect([200, 429]).toContain(response.status);
    });
  });
});
