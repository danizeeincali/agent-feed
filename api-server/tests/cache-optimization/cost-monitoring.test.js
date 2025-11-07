import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import CostMonitoringService from '../../services/cost-monitoring-service.js';
import dbManager from '../../database.js';

describe('Cost Monitoring Service', () => {
  let service;
  let db;

  beforeAll(() => {
    // Initialize database schema for testing
    db = dbManager.getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS cache_cost_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        cache_write_tokens INTEGER NOT NULL,
        cache_read_tokens INTEGER NOT NULL,
        cache_write_cost_usd REAL NOT NULL,
        cache_read_cost_usd REAL NOT NULL,
        total_cost_usd REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        UNIQUE(date, timestamp)
      ) STRICT;
    `);
  });

  beforeEach(() => {
    service = new CostMonitoringService();
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM cache_cost_metrics');
  });

  afterAll(() => {
    // Clean up and close database
    db.exec('DROP TABLE IF EXISTS cache_cost_metrics');
  });

  test('should track cache write tokens', async () => {
    await service.recordCacheUsage({
      cache_write_tokens: 417312,
      cache_read_tokens: 0,
      timestamp: Date.now()
    });

    const metrics = await service.getDailyMetrics();
    expect(metrics.cache_write_tokens).toBe(417312);
  });

  test('should calculate daily cost from tokens', () => {
    const cost = service.calculateCost({
      cache_write_tokens: 417312,
      cache_read_tokens: 816139
    });

    // Cache write: 417,312 / 1000 * $0.00375 = $1.5649
    // Cache read: 816,139 / 1000 * $0.000375 = $0.3061
    expect(cost.cache_write_cost_usd).toBeCloseTo(1.5649, 3);
    expect(cost.cache_read_cost_usd).toBeCloseTo(0.3061, 3);
    expect(cost.total_cost_usd).toBeCloseTo(1.871, 2);
  });

  test('should trigger alert when cost exceeds $5/day', async () => {
    const alertTriggered = await service.checkCostThreshold({
      daily_cost_usd: 14.67
    });

    expect(alertTriggered).toBe(true);
    expect(service.getLastAlert()).toContain('Cost threshold exceeded');
  });

  test('should not trigger alert when cost is below threshold', async () => {
    const alertTriggered = await service.checkCostThreshold({
      daily_cost_usd: 2.50
    });

    expect(alertTriggered).toBe(false);
  });

  test('should calculate cache hit ratio', () => {
    const ratio = service.calculateCacheHitRatio({
      cache_read_tokens: 816139,
      cache_write_tokens: 417312
    });

    // Ratio should be (816139 / (816139 + 417312)) * 100 = 66.17%
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(100);
    expect(ratio).toBeCloseTo(66.17, 1);
  });

  test('should handle zero cache write tokens in hit ratio', () => {
    const ratio = service.calculateCacheHitRatio({
      cache_read_tokens: 100,
      cache_write_tokens: 0
    });

    expect(ratio).toBe(0);
  });

  test('should provide 7-day cost trend', async () => {
    // Insert test data for multiple days
    const today = Date.now();
    for (let i = 0; i < 7; i++) {
      const timestamp = today - (i * 24 * 60 * 60 * 1000);
      await service.recordCacheUsage({
        cache_write_tokens: 100000 + (i * 1000),
        cache_read_tokens: 200000 + (i * 2000),
        timestamp
      });
    }

    const trend = await service.getCostTrend(7);
    expect(trend.length).toBeGreaterThan(0);
    expect(trend.length).toBeLessThanOrEqual(7);
    expect(trend[0]).toHaveProperty('date');
    expect(trend[0]).toHaveProperty('cost_usd');
  });

  test('should integrate with database for persistence', async () => {
    const testDate = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    await service.recordCacheUsage({
      cache_write_tokens: 417312,
      cache_read_tokens: 816139,
      timestamp
    });

    const retrieved = await service.getMetricsByDate(testDate);
    expect(retrieved).toBeTruthy();
    expect(retrieved.cache_write_tokens).toBe(417312);
    expect(retrieved.cache_read_tokens).toBe(816139);
  });

  test('should handle API errors gracefully', async () => {
    // Test error handling for null input
    await expect(service.recordCacheUsage(null)).rejects.toThrow();
  });

  test('should aggregate daily metrics correctly', async () => {
    const today = Date.now();

    // Record multiple usage entries for the same day
    await service.recordCacheUsage({
      cache_write_tokens: 100000,
      cache_read_tokens: 200000,
      timestamp: today
    });

    await service.recordCacheUsage({
      cache_write_tokens: 50000,
      cache_read_tokens: 100000,
      timestamp: today + 1000
    });

    const aggregated = await service.getAggregatedDailyMetrics();
    expect(aggregated.total_cache_write_tokens).toBe(150000);
    expect(aggregated.total_cache_read_tokens).toBe(300000);
  });

  test('should calculate cost savings from cache usage', () => {
    const savings = service.calculateCacheSavings({
      cache_read_tokens: 816139,
      cache_write_tokens: 417312,
      input_tokens_without_cache: 1233451  // Total tokens that would be used without cache
    });

    // Savings = (input_tokens_without_cache * input_cost) - (cache_write_cost + cache_read_cost)
    expect(savings).toHaveProperty('savings_usd');
    expect(savings).toHaveProperty('savings_percentage');
    expect(savings.savings_usd).toBeGreaterThan(0);

    // Expected: $3.70 (no cache) - $1.87 (with cache) = $1.83 savings
    expect(savings.savings_usd).toBeCloseTo(1.83, 1);
  });

  test('should get comprehensive cost summary', async () => {
    const timestamp = Date.now();

    await service.recordCacheUsage({
      cache_write_tokens: 417312,
      cache_read_tokens: 816139,
      timestamp
    });

    const summary = await service.getCostSummary();

    expect(summary).toHaveProperty('today');
    expect(summary).toHaveProperty('cache_hit_ratio');
    expect(summary).toHaveProperty('seven_day_trend');
    expect(summary).toHaveProperty('alert_threshold_usd');
    expect(summary).toHaveProperty('threshold_exceeded');

    expect(summary.today.total_cache_write_tokens).toBe(417312);
    expect(summary.today.total_cache_read_tokens).toBe(816139);
    expect(summary.cache_hit_ratio).toBeCloseTo(66.17, 1);
  });
});
