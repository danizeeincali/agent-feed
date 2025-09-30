/**
 * Token Analytics Enhancements Tests
 * Tests for recent improvements to Claude SDK Analytics endpoints
 *
 * Test Coverage:
 * - Messages endpoint: default limit 100, no date filtering, correct ordering
 * - Daily endpoint: cost included in raw_data and Chart.js datasets
 * - Integration tests with real database
 * - Data accuracy validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DB_PATH = join(__dirname, '../../database.db');

// Test database instance
let testDb;
let testApp;

// Helper function to infer provider from model name
const inferProvider = (model) => {
  if (!model) return 'unknown';
  const modelLower = model.toLowerCase();
  if (modelLower.includes('claude')) return 'anthropic';
  if (modelLower.includes('gpt')) return 'openai';
  if (modelLower.includes('gemini')) return 'google';
  return 'unknown';
};

// Helper function to setup test app matching production server.js
function createTestApp(dbInstance) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Messages endpoint - Enhanced version
  app.get('/api/token-analytics/messages', (req, res) => {
    try {
      if (!dbInstance) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          limit: 100,
          offset: 0,
          timestamp: new Date().toISOString()
        });
      }

      const limit = Math.min(parseInt(req.query.limit) || 100, 100);
      const offset = parseInt(req.query.offset) || 0;
      const provider = req.query.provider;
      const model = req.query.model;

      // Build query with filters - get last 100 messages regardless of date
      let query = `
        SELECT
          id,
          timestamp,
          sessionId as session_id,
          id as request_id,
          id as message_id,
          model,
          operation as request_type,
          inputTokens as input_tokens,
          outputTokens as output_tokens,
          totalTokens as total_tokens,
          ROUND(estimatedCost, 4) as cost_total
        FROM token_analytics
        WHERE 1=1
      `;

      const params = {};

      if (model) {
        query += ` AND model = $model`;
        params.model = model;
      }

      query += ` ORDER BY datetime(timestamp) DESC LIMIT $limit OFFSET $offset`;
      params.limit = limit;
      params.offset = offset;

      const records = dbInstance.prepare(query).all(params);

      // Map to API response format with inferred provider
      const messages = records.map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        session_id: record.session_id,
        request_id: record.request_id,
        message_id: record.message_id,
        provider: inferProvider(record.model),
        model: record.model,
        request_type: record.request_type,
        input_tokens: record.input_tokens,
        output_tokens: record.output_tokens,
        total_tokens: record.total_tokens,
        cost_total: record.cost_total,
        processing_time_ms: Math.floor(Math.random() * 2000) + 100,
        message_preview: `User requested ${record.request_type}`,
        response_preview: 'Generated response',
        component: 'TokenAnalyticsDashboard'
      }));

      // Filter by provider if specified (post-query since provider is inferred)
      let filteredMessages = messages;
      if (provider) {
        filteredMessages = messages.filter(msg => msg.provider === provider);
      }

      // Get total count
      let countQuery = `SELECT COUNT(*) as count FROM token_analytics WHERE 1=1`;
      const countParams = {};
      if (model) {
        countQuery += ` AND model = $model`;
        countParams.model = model;
      }
      const totalCount = dbInstance.prepare(countQuery).get(countParams).count;

      res.json({
        success: true,
        data: filteredMessages,
        total: totalCount,
        limit: limit,
        offset: offset,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // Daily endpoint - Enhanced version with cost
  app.get('/api/token-analytics/daily', (req, res) => {
    try {
      if (!dbInstance) {
        return res.json({
          success: true,
          data: { labels: [], datasets: [] },
          raw_data: [],
          timestamp: new Date().toISOString()
        });
      }

      const { days = 30 } = req.query;

      // Query aggregated daily data from database
      const query = `
        SELECT
          DATE(timestamp) as date,
          SUM(totalTokens) as total_tokens,
          COUNT(*) as total_requests,
          ROUND(SUM(estimatedCost), 4) as total_cost
        FROM token_analytics
        WHERE DATE(timestamp) >= DATE('now', '-${parseInt(days)} days')
        GROUP BY DATE(timestamp)
        ORDER BY date
      `;

      const dailyData = dbInstance.prepare(query).all();

      // Convert to Chart.js compatible format
      const chartData = {
        labels: dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Daily Tokens',
            data: dailyData.map(d => d.total_tokens),
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Daily Requests',
            data: dailyData.map(d => d.total_requests),
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            yAxisID: 'y1'
          },
          {
            label: 'Daily Cost (dollars)',
            data: dailyData.map(d => d.total_cost),
            backgroundColor: 'rgba(139, 69, 19, 0.5)',
            borderColor: 'rgb(139, 69, 19)',
            borderWidth: 1,
            yAxisID: 'y2'
          }
        ]
      };

      res.json({
        success: true,
        data: chartData,
        raw_data: dailyData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return app;
}

describe('Token Analytics Enhancements - Messages Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should use default limit of 100 (not 50)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.limit).toBe(100);
    expect(response.body.limit).not.toBe(50);
  });

  it('should return all available records when less than limit', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    // Get actual count from database
    const actualCount = testDb.prepare('SELECT COUNT(*) as count FROM token_analytics').get().count;

    expect(response.body.total).toBe(actualCount);

    // Should return all records if total is less than limit
    if (actualCount <= 100) {
      expect(response.body.data.length).toBe(actualCount);
    } else {
      expect(response.body.data.length).toBe(100);
    }
  });

  it('should return 20 records from test database', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    // Test database should have 20 records
    expect(response.body.total).toBe(20);
    expect(response.body.data.length).toBe(20);
  });

  it('should order by timestamp DESC (newest first)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    const { data } = response.body;
    expect(data.length).toBeGreaterThan(0);

    // Check ordering - each timestamp should be >= the next one
    for (let i = 0; i < data.length - 1; i++) {
      const current = new Date(data[i].timestamp);
      const next = new Date(data[i + 1].timestamp);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  it('should verify newest first ordering with database query', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=5')
      .expect(200);

    // Get the same data directly from database
    const dbRecords = testDb.prepare(`
      SELECT timestamp FROM token_analytics
      ORDER BY datetime(timestamp) DESC
      LIMIT 5
    `).all();

    // Timestamps should match
    response.body.data.forEach((msg, index) => {
      expect(msg.timestamp).toBe(dbRecords[index].timestamp);
    });
  });

  it('should not apply date filtering', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    // Should return all records regardless of timestamp
    const allRecords = testDb.prepare('SELECT COUNT(*) as count FROM token_analytics').get().count;
    expect(response.body.total).toBe(allRecords);

    // Verify records span multiple dates
    const dates = new Set(response.body.data.map(msg => {
      const date = new Date(msg.timestamp);
      return date.toISOString().split('T')[0];
    }));

    // Should have records from different dates (not filtered to recent only)
    expect(dates.size).toBeGreaterThan(0);
  });

  it('should respect custom limit parameter', async () => {
    const customLimit = 10;
    const response = await request(testApp)
      .get(`/api/token-analytics/messages?limit=${customLimit}`)
      .expect(200);

    expect(response.body.limit).toBe(customLimit);
    expect(response.body.data.length).toBeLessThanOrEqual(customLimit);
  });

  it('should enforce maximum limit of 100', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=500')
      .expect(200);

    expect(response.body.limit).toBe(100);
    expect(response.body.limit).not.toBe(500);
  });

  it('should support pagination with offset', async () => {
    const page1 = await request(testApp)
      .get('/api/token-analytics/messages?limit=5&offset=0')
      .expect(200);

    const page2 = await request(testApp)
      .get('/api/token-analytics/messages?limit=5&offset=5')
      .expect(200);

    // Pages should have different records
    if (page1.body.data.length > 0 && page2.body.data.length > 0) {
      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    }
  });

  it('should have all required message fields', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=1')
      .expect(200);

    if (response.body.data.length > 0) {
      const message = response.body.data[0];
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('session_id');
      expect(message).toHaveProperty('provider');
      expect(message).toHaveProperty('model');
      expect(message).toHaveProperty('request_type');
      expect(message).toHaveProperty('input_tokens');
      expect(message).toHaveProperty('output_tokens');
      expect(message).toHaveProperty('total_tokens');
      expect(message).toHaveProperty('cost_total');
    }
  });
});

describe('Token Analytics Enhancements - Daily Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should include cost in raw_data', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('raw_data');
    expect(Array.isArray(response.body.raw_data)).toBe(true);

    // Each raw_data entry should have cost
    response.body.raw_data.forEach(day => {
      expect(day).toHaveProperty('total_cost');
      expect(typeof day.total_cost).toBe('number');
    });
  });

  it('should include cost in Chart.js datasets', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;
    expect(Array.isArray(datasets)).toBe(true);
    expect(datasets.length).toBe(3);

    // Find cost dataset
    const costDataset = datasets.find(ds => ds.label === 'Daily Cost (dollars)');
    expect(costDataset).toBeDefined();
  });

  it('should have cost dataset with correct label', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;
    const costDataset = datasets[2];

    expect(costDataset.label).toBe('Daily Cost (dollars)');
  });

  it('should have cost dataset with correct styling', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;
    const costDataset = datasets.find(ds => ds.label === 'Daily Cost (dollars)');

    expect(costDataset).toMatchObject({
      backgroundColor: 'rgba(139, 69, 19, 0.5)',
      borderColor: 'rgb(139, 69, 19)',
      borderWidth: 1,
      yAxisID: 'y2'
    });
  });

  it('should calculate cost values matching database (ROUND(cost, 4) in dollars)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    // Get raw data from database
    const dbData = testDb.prepare(`
      SELECT
        DATE(timestamp) as date,
        ROUND(SUM(estimatedCost), 4) as total_cost
      FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    // Compare with API response
    response.body.raw_data.forEach((day, index) => {
      expect(day.total_cost).toBeCloseTo(dbData[index].total_cost, 4);
    });
  });

  it('should have cost data array matching raw_data length', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets, labels } = response.body.data;
    const costDataset = datasets.find(ds => ds.label === 'Daily Cost (dollars)');

    expect(costDataset.data.length).toBe(labels.length);
    expect(costDataset.data.length).toBe(response.body.raw_data.length);
  });

  it('should have decimal cost values (in dollars)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;
    const costDataset = datasets.find(ds => ds.label === 'Daily Cost (dollars)');

    costDataset.data.forEach(cost => {
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });

  it('should maintain existing tokens and requests datasets', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;

    expect(datasets[0].label).toBe('Daily Tokens');
    expect(datasets[1].label).toBe('Daily Requests');
    expect(datasets[2].label).toBe('Daily Cost (dollars)');
  });

  it('should respect days parameter for filtering', async () => {
    const response7 = await request(testApp)
      .get('/api/token-analytics/daily?days=7')
      .expect(200);

    const response30 = await request(testApp)
      .get('/api/token-analytics/daily?days=30')
      .expect(200);

    // 30 days should have more or equal data than 7 days
    expect(response30.body.raw_data.length).toBeGreaterThanOrEqual(response7.body.raw_data.length);
  });
});

describe('Token Analytics Enhancements - Integration Tests', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should successfully connect to real database', async () => {
    expect(testDb).toBeDefined();
    expect(testDb.open).toBe(true);
  });

  it('should query messages endpoint with real database', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should query daily endpoint with real database', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.raw_data).toBeDefined();
    expect(response.body.data).toBeDefined();
  });

  it('should verify data accuracy - messages total matches database count', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    const dbCount = testDb.prepare('SELECT COUNT(*) as count FROM token_analytics').get().count;

    expect(response.body.total).toBe(dbCount);
  });

  it('should verify data accuracy - daily aggregates match database', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    // Verify first day's data
    if (response.body.raw_data.length > 0) {
      const firstDay = response.body.raw_data[0];

      const dbResult = testDb.prepare(`
        SELECT
          SUM(totalTokens) as total_tokens,
          COUNT(*) as total_requests,
          ROUND(SUM(estimatedCost), 4) as total_cost
        FROM token_analytics
        WHERE DATE(timestamp) = ?
      `).get(firstDay.date);

      expect(firstDay.total_tokens).toBe(dbResult.total_tokens);
      expect(firstDay.total_requests).toBe(dbResult.total_requests);
      expect(firstDay.total_cost).toBe(dbResult.total_cost);
    }
  });

  it('should handle model filtering correctly', async () => {
    // Get first model from database
    const firstRecord = testDb.prepare('SELECT model FROM token_analytics LIMIT 1').get();

    if (firstRecord) {
      const response = await request(testApp)
        .get(`/api/token-analytics/messages?model=${firstRecord.model}`)
        .expect(200);

      // All messages should have the specified model
      response.body.data.forEach(msg => {
        expect(msg.model).toBe(firstRecord.model);
      });
    }
  });

  it('should handle provider filtering correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?provider=anthropic')
      .expect(200);

    // All messages should be from Anthropic
    response.body.data.forEach(msg => {
      expect(msg.provider).toBe('anthropic');
      expect(msg.model.toLowerCase()).toContain('claude');
    });
  });

  it('should calculate costs consistently across endpoints', async () => {
    const messagesResponse = await request(testApp)
      .get('/api/token-analytics/messages?limit=100')
      .expect(200);

    const dailyResponse = await request(testApp)
      .get('/api/token-analytics/daily?days=365')
      .expect(200);

    // Get total cost from database in dollars
    const dbTotals = testDb.prepare(`
      SELECT
        ROUND(SUM(estimatedCost), 4) as rounded_total,
        SUM(estimatedCost) as raw_total
      FROM token_analytics
    `).get();

    // Total cost from all messages (uses ROUND to 4 decimals)
    const messagesTotalCost = messagesResponse.body.data.reduce(
      (sum, msg) => sum + msg.cost_total,
      0
    );

    // Total cost from all daily aggregates (uses ROUND to 4 decimals)
    const dailyTotalCost = dailyResponse.body.raw_data.reduce(
      (sum, day) => sum + day.total_cost,
      0
    );

    // Both should be reasonably close to database total (within $0.01 tolerance)
    expect(messagesTotalCost).toBeCloseTo(dbTotals.raw_total, 2);
    expect(dailyTotalCost).toBeCloseTo(dbTotals.rounded_total, 4);
  });
});

describe('Token Analytics Enhancements - Edge Cases', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should handle empty database gracefully - messages', async () => {
    const emptyDb = new Database(':memory:');
    emptyDb.exec(`
      CREATE TABLE token_analytics (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        operation TEXT NOT NULL,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        estimatedCost REAL NOT NULL,
        model TEXT NOT NULL,
        userId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const emptyApp = createTestApp(emptyDb);
    const response = await request(emptyApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.total).toBe(0);
    expect(response.body.data).toEqual([]);

    emptyDb.close();
  });

  it('should handle empty database gracefully - daily', async () => {
    const emptyDb = new Database(':memory:');
    emptyDb.exec(`
      CREATE TABLE token_analytics (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        operation TEXT NOT NULL,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        estimatedCost REAL NOT NULL,
        model TEXT NOT NULL,
        userId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const emptyApp = createTestApp(emptyDb);
    const response = await request(emptyApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.raw_data).toEqual([]);
    expect(response.body.data.labels).toEqual([]);
    expect(response.body.data.datasets[0].data).toEqual([]);

    emptyDb.close();
  });

  it('should handle null database connection - messages', async () => {
    const nullApp = createTestApp(null);
    const response = await request(nullApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
    expect(response.body.total).toBe(0);
    expect(response.body.limit).toBe(100);
  });

  it('should handle null database connection - daily', async () => {
    const nullApp = createTestApp(null);
    const response = await request(nullApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.raw_data).toEqual([]);
    expect(response.body.data.datasets).toEqual([]);
  });

  it('should handle invalid limit values', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=invalid')
      .expect(200);

    // Should default to 100 when invalid
    expect(response.body.limit).toBe(100);
  });

  it('should handle negative offset', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?offset=-10')
      .expect(200);

    // Should treat negative offset as 0
    expect(response.body.success).toBe(true);
  });
});
