const MonitoringService = require('../../src/monitoring/monitoring-service.js');
const Database = require('better-sqlite3');
const os = require('os');
const fs = require('fs');
const path = require('path');

describe('MonitoringService', () => {
  let monitoringService;
  let testDb;
  let testDbPath;

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join(__dirname, 'test-monitoring.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new Database(testDbPath);
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        last_active DATETIME
      );
    `);

    // Insert test data
    testDb.prepare('INSERT INTO agents (id, name, status, last_active) VALUES (?, ?, ?, ?)').run(
      'agent1',
      'Test Agent',
      'active',
      new Date().toISOString()
    );
    testDb.prepare('INSERT INTO posts (content) VALUES (?)').run('Test post');

    monitoringService = new MonitoringService({
      db: testDb,
      collectInterval: 100 // Fast collection for testing
    });
  });

  afterEach(() => {
    if (monitoringService) {
      monitoringService.stop();
    }
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('System Metrics Collection', () => {
    test('should collect CPU metrics', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.system).toBeDefined();
      expect(metrics.system.cpu).toBeDefined();
      expect(metrics.system.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.system.cpu.loadAverage).toBeDefined();
      expect(Array.isArray(metrics.system.cpu.loadAverage)).toBe(true);
    });

    test('should collect memory metrics', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.system.memory).toBeDefined();
      expect(metrics.system.memory.total).toBeGreaterThan(0);
      expect(metrics.system.memory.free).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memory.used).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memory.usedPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memory.usedPercentage).toBeLessThanOrEqual(100);
    });

    test('should collect disk metrics', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.system.disk).toBeDefined();
      expect(metrics.system.disk.total).toBeGreaterThan(0);
      expect(metrics.system.disk.free).toBeGreaterThanOrEqual(0);
      expect(metrics.system.disk.used).toBeGreaterThanOrEqual(0);
      expect(metrics.system.disk.usedPercentage).toBeGreaterThanOrEqual(0);
    });

    test('should collect process metrics', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.system.process).toBeDefined();
      expect(metrics.system.process.uptime).toBeGreaterThan(0);
      expect(metrics.system.process.memoryUsage).toBeDefined();
      expect(metrics.system.process.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.system.process.memoryUsage.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('Database Metrics Collection', () => {
    test('should collect database connection metrics', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.database).toBeDefined();
      expect(metrics.database.connected).toBe(true);
      expect(metrics.database.readOnly).toBeDefined();
    });

    test('should collect database query performance', async () => {
      // Execute some queries
      testDb.prepare('SELECT * FROM posts').all();
      testDb.prepare('SELECT * FROM agents').all();

      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.database.queryCount).toBeGreaterThanOrEqual(0);
      expect(metrics.database.avgQueryTime).toBeGreaterThanOrEqual(0);
    });

    test('should collect database table counts', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.database.tables).toBeDefined();
      expect(typeof metrics.database.tables.posts).toBe('number');
      expect(typeof metrics.database.tables.agents).toBe('number');
      expect(metrics.database.tables.posts).toBeGreaterThanOrEqual(1);
      expect(metrics.database.tables.agents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('API Metrics Collection', () => {
    test('should track API request rate', () => {
      monitoringService.recordRequest('/api/test', 'GET', 200, 150);
      monitoringService.recordRequest('/api/test', 'GET', 200, 120);
      monitoringService.recordRequest('/api/test', 'POST', 201, 200);

      const metrics = monitoringService.getMetrics();

      expect(metrics.api.totalRequests).toBe(3);
      expect(metrics.api.requestsPerSecond).toBeGreaterThanOrEqual(0);
    });

    test('should track response times by endpoint', () => {
      monitoringService.recordRequest('/api/users', 'GET', 200, 100);
      monitoringService.recordRequest('/api/users', 'GET', 200, 200);
      monitoringService.recordRequest('/api/posts', 'GET', 200, 150);

      const metrics = monitoringService.getMetrics();

      expect(metrics.api.endpoints['/api/users']).toBeDefined();
      expect(metrics.api.endpoints['/api/users'].count).toBe(2);
      expect(metrics.api.endpoints['/api/users'].avgResponseTime).toBe(150);
      expect(metrics.api.endpoints['/api/posts'].avgResponseTime).toBe(150);
    });

    test('should track error rates', () => {
      monitoringService.recordRequest('/api/test', 'GET', 200, 100);
      monitoringService.recordRequest('/api/test', 'GET', 500, 100);
      monitoringService.recordRequest('/api/test', 'GET', 404, 50);

      const metrics = monitoringService.getMetrics();

      expect(metrics.api.errors).toBe(2);
      expect(metrics.api.errorRate).toBeGreaterThan(0);
      expect(metrics.api.statusCodes['200']).toBe(1);
      expect(metrics.api.statusCodes['500']).toBe(1);
      expect(metrics.api.statusCodes['404']).toBe(1);
    });

    test('should track response time percentiles', () => {
      // Add many requests to get meaningful percentiles
      for (let i = 0; i < 100; i++) {
        monitoringService.recordRequest('/api/test', 'GET', 200, i * 10);
      }

      const metrics = monitoringService.getMetrics();

      expect(metrics.api.responseTimePercentiles).toBeDefined();
      expect(metrics.api.responseTimePercentiles.p50).toBeDefined();
      expect(metrics.api.responseTimePercentiles.p95).toBeDefined();
      expect(metrics.api.responseTimePercentiles.p99).toBeDefined();
      expect(metrics.api.responseTimePercentiles.p95).toBeGreaterThan(
        metrics.api.responseTimePercentiles.p50
      );
    });
  });

  describe('Business Metrics Collection', () => {
    test('should collect active agents count', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.business.activeAgents).toBeGreaterThanOrEqual(1);
    });

    test('should collect posts count', async () => {
      await monitoringService.collectMetrics();
      const metrics = monitoringService.getMetrics();

      expect(metrics.business.totalPosts).toBeGreaterThanOrEqual(1);
    });

    test('should allow custom business metrics', () => {
      monitoringService.recordCustomMetric('user_signups', 5);
      monitoringService.recordCustomMetric('api_calls_today', 1000);

      const metrics = monitoringService.getMetrics();

      expect(metrics.business.custom.user_signups).toBe(5);
      expect(metrics.business.custom.api_calls_today).toBe(1000);
    });
  });

  describe('Prometheus Format Export', () => {
    test('should export metrics in Prometheus format', async () => {
      await monitoringService.collectMetrics();
      monitoringService.recordRequest('/api/test', 'GET', 200, 100);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();

      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toContain('# HELP');
      expect(prometheusMetrics).toContain('# TYPE');
      expect(prometheusMetrics).toContain('system_cpu_usage');
      expect(prometheusMetrics).toContain('system_memory_used_bytes');
      expect(prometheusMetrics).toContain('api_requests_total');
      expect(prometheusMetrics).toContain('api_response_time_ms');
    });

    test('should include labels in Prometheus metrics', async () => {
      monitoringService.recordRequest('/api/users', 'GET', 200, 100);
      monitoringService.recordRequest('/api/posts', 'POST', 201, 150);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();

      expect(prometheusMetrics).toContain('endpoint="/api/users"');
      expect(prometheusMetrics).toContain('method="GET"');
      expect(prometheusMetrics).toContain('endpoint="/api/posts"');
      expect(prometheusMetrics).toContain('method="POST"');
    });
  });

  describe('Start/Stop Control', () => {
    test('should start collecting metrics automatically', (done) => {
      monitoringService.start();

      setTimeout(() => {
        const metrics = monitoringService.getMetrics();
        expect(metrics.system).toBeDefined();
        done();
      }, 150);
    });

    test('should stop collecting metrics', (done) => {
      monitoringService.start();

      setTimeout(() => {
        const firstCollection = monitoringService.getMetrics().timestamp;
        monitoringService.stop();

        setTimeout(() => {
          const secondCollection = monitoringService.getMetrics().timestamp;
          // Timestamp should not change after stop
          expect(firstCollection).toBe(secondCollection);
          done();
        }, 150);
      }, 150);
    });

    test('should expose health status', async () => {
      await monitoringService.collectMetrics();
      const health = monitoringService.getHealth();

      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.checks).toBeDefined();
      expect(health.checks.database).toBeDefined();
      expect(health.checks.memory).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Historical Statistics', () => {
    test('should track metrics over time', async () => {
      await monitoringService.collectMetrics();
      await new Promise(resolve => setTimeout(resolve, 150));
      await monitoringService.collectMetrics();

      const stats = monitoringService.getHistoricalStats();

      expect(stats.dataPoints).toBeGreaterThanOrEqual(2);
      expect(stats.timeRange).toBeDefined();
      expect(Array.isArray(stats.cpuHistory)).toBe(true);
      expect(Array.isArray(stats.memoryHistory)).toBe(true);
    });

    test('should calculate trends', async () => {
      // Collect multiple data points
      for (let i = 0; i < 5; i++) {
        await monitoringService.collectMetrics();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const stats = monitoringService.getHistoricalStats();

      expect(stats.trends).toBeDefined();
      expect(stats.trends.cpu).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(stats.trends.cpu);
    });
  });

  describe('Metric Retention', () => {
    test('should limit historical data points', async () => {
      // Collect many data points
      for (let i = 0; i < 150; i++) {
        await monitoringService.collectMetrics();
      }

      const stats = monitoringService.getHistoricalStats();

      // Should not exceed max retention (default 100)
      expect(stats.dataPoints).toBeLessThanOrEqual(100);
    });
  });
});
