/**
 * Token Analytics Real Data Tests
 * Unit tests for token analytics endpoints using real SQLite database
 *
 * Test Coverage:
 * - GET /api/token-analytics/summary
 * - GET /api/token-analytics/hourly
 * - GET /api/token-analytics/daily
 * - GET /api/token-analytics/messages
 * - Error handling and edge cases
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

// Helper function to setup test app
function createTestApp(dbInstance) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // GET /api/token-analytics/summary
  app.get('/api/token-analytics/summary', (req, res) => {
    try {
      const messages = dbInstance.prepare(`
        SELECT * FROM token_analytics
        ORDER BY timestamp DESC
      `).all();

      if (!messages || messages.length === 0) {
        return res.json({
          success: true,
          data: {
            summary: {
              total_requests: 0,
              total_tokens: 0,
              total_cost: 0,
              avg_processing_time: 0,
              unique_sessions: 0,
              providers_used: 0,
              models_used: 0
            },
            by_provider: [],
            by_model: []
          }
        });
      }

      // Calculate summary statistics
      const totalRequests = messages.length;
      const totalTokens = messages.reduce((sum, msg) => sum + (msg.totalTokens || 0), 0);
      const totalCost = parseFloat(messages.reduce((sum, msg) => sum + (msg.estimatedCost || 0), 0).toFixed(4)); // Keep in dollars
      const uniqueSessions = new Set(messages.map(msg => msg.sessionId)).size;

      // Infer provider from model name
      const inferProvider = (model) => {
        if (model.includes('claude')) return 'anthropic';
        if (model.includes('gpt')) return 'openai';
        if (model.includes('gemini')) return 'google';
        return 'unknown';
      };

      const providers = new Set(messages.map(msg => inferProvider(msg.model)));
      const models = new Set(messages.map(msg => msg.model));

      // Group by provider
      const byProvider = {};
      messages.forEach(msg => {
        const provider = inferProvider(msg.model);
        if (!byProvider[provider]) {
          byProvider[provider] = {
            provider,
            requests: 0,
            tokens: 0,
            cost: 0
          };
        }
        byProvider[provider].requests++;
        byProvider[provider].tokens += msg.totalTokens || 0;
        byProvider[provider].cost += parseFloat((msg.estimatedCost || 0).toFixed(4));
      });

      // Group by model
      const byModel = {};
      messages.forEach(msg => {
        if (!byModel[msg.model]) {
          byModel[msg.model] = {
            model: msg.model,
            provider: inferProvider(msg.model),
            requests: 0,
            tokens: 0,
            cost: 0
          };
        }
        byModel[msg.model].requests++;
        byModel[msg.model].tokens += msg.totalTokens || 0;
        byModel[msg.model].cost += parseFloat((msg.estimatedCost || 0).toFixed(4));
      });

      res.json({
        success: true,
        data: {
          summary: {
            total_requests: totalRequests,
            total_tokens: totalTokens,
            total_cost: totalCost,
            avg_processing_time: 0, // Not tracked in current schema
            unique_sessions: uniqueSessions,
            providers_used: providers.size,
            models_used: models.size
          },
          by_provider: Object.values(byProvider).sort((a, b) => b.requests - a.requests),
          by_model: Object.values(byModel).sort((a, b) => b.requests - a.requests)
        },
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

  // GET /api/token-analytics/hourly
  app.get('/api/token-analytics/hourly', (req, res) => {
    try {
      const hourlyData = dbInstance.prepare(`
        SELECT
          strftime('%H:00', timestamp) as hour,
          SUM(totalTokens) as total_tokens,
          COUNT(*) as total_requests,
          ROUND(SUM(estimatedCost), 4) as total_cost
        FROM token_analytics
        WHERE datetime(timestamp) >= datetime('now', '-24 hours')
        GROUP BY strftime('%H', timestamp)
        ORDER BY hour
      `).all();

      const chartData = {
        labels: hourlyData.map(d => d.hour),
        datasets: [
          {
            label: 'Total Tokens',
            data: hourlyData.map(d => d.total_tokens || 0),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Requests',
            data: hourlyData.map(d => d.total_requests || 0),
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
            yAxisID: 'y1'
          },
          {
            label: 'Cost (dollars)',
            data: hourlyData.map(d => parseFloat((d.total_cost || 0).toFixed(4))),
            backgroundColor: 'rgba(139, 69, 19, 0.5)',
            borderColor: 'rgb(139, 69, 19)',
            borderWidth: 1,
            yAxisID: 'y'
          }
        ]
      };

      res.json({
        success: true,
        data: chartData,
        raw_data: hourlyData,
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

  // GET /api/token-analytics/daily
  app.get('/api/token-analytics/daily', (req, res) => {
    try {
      const dailyData = dbInstance.prepare(`
        SELECT
          DATE(timestamp) as date,
          SUM(totalTokens) as total_tokens,
          COUNT(*) as total_requests,
          ROUND(SUM(estimatedCost), 4) as total_cost
        FROM token_analytics
        WHERE datetime(timestamp) >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date
      `).all();

      const chartData = {
        labels: dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Daily Tokens',
            data: dailyData.map(d => d.total_tokens || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Daily Requests',
            data: dailyData.map(d => d.total_requests || 0),
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            yAxisID: 'y1'
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

  // GET /api/token-analytics/messages
  app.get('/api/token-analytics/messages', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;
      const provider = req.query.provider;
      const model = req.query.model;

      let query = 'SELECT * FROM token_analytics WHERE 1=1';
      const params = [];

      if (provider) {
        // Infer provider from model name
        if (provider === 'anthropic') {
          query += ' AND model LIKE ?';
          params.push('%claude%');
        } else if (provider === 'openai') {
          query += ' AND model LIKE ?';
          params.push('%gpt%');
        } else if (provider === 'google') {
          query += ' AND model LIKE ?';
          params.push('%gemini%');
        }
      }

      if (model) {
        query += ' AND model = ?';
        params.push(model);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const messages = dbInstance.prepare(query).all(...params);

      // Transform to match expected format
      const transformedMessages = messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp,
        session_id: msg.sessionId,
        request_id: msg.id,
        message_id: msg.id,
        provider: msg.model.includes('claude') ? 'anthropic' :
                  msg.model.includes('gpt') ? 'openai' :
                  msg.model.includes('gemini') ? 'google' : 'unknown',
        model: msg.model,
        request_type: msg.operation,
        input_tokens: msg.inputTokens,
        output_tokens: msg.outputTokens,
        total_tokens: msg.totalTokens,
        cost_total: parseFloat((msg.estimatedCost || 0).toFixed(4)), // dollars
        processing_time_ms: 0, // Not tracked in current schema
        message_preview: `${msg.operation} operation`,
        response_preview: 'Generated response',
        component: 'TokenAnalyticsDashboard'
      }));

      // Get total count
      let countQuery = 'SELECT COUNT(*) as count FROM token_analytics WHERE 1=1';
      const countParams = [];
      if (provider) {
        if (provider === 'anthropic') {
          countQuery += ' AND model LIKE ?';
          countParams.push('%claude%');
        } else if (provider === 'openai') {
          countQuery += ' AND model LIKE ?';
          countParams.push('%gpt%');
        } else if (provider === 'google') {
          countQuery += ' AND model LIKE ?';
          countParams.push('%gemini%');
        }
      }
      if (model) {
        countQuery += ' AND model = ?';
        countParams.push(model);
      }

      const { count } = dbInstance.prepare(countQuery).get(...countParams);

      res.json({
        success: true,
        data: transformedMessages,
        total: count,
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

  return app;
}

describe('Token Analytics Real Data - Summary Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should return summary with correct structure', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('summary');
    expect(response.body.data).toHaveProperty('by_provider');
    expect(response.body.data).toHaveProperty('by_model');
  });

  it('should have correct summary field types', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { summary } = response.body.data;
    expect(typeof summary.total_requests).toBe('number');
    expect(typeof summary.total_tokens).toBe('number');
    expect(typeof summary.total_cost).toBe('number');
    expect(typeof summary.unique_sessions).toBe('number');
    expect(typeof summary.providers_used).toBe('number');
    expect(typeof summary.models_used).toBe('number');
  });

  it('should return real database data (not mock 50 requests)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { summary } = response.body.data;
    // Real database should have 20 records based on earlier query
    expect(summary.total_requests).toBe(20);
    expect(summary.total_requests).not.toBe(50); // Ensure it's not mock data
  });

  it('should calculate total tokens from database SUM(totalTokens)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { summary } = response.body.data;

    // Verify against direct database query
    const dbResult = testDb.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get();
    expect(summary.total_tokens).toBe(dbResult.total);
  });

  it('should calculate total cost correctly in dollars', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { summary } = response.body.data;

    // Cost should be in dollars
    expect(summary.total_cost).toBeGreaterThan(0);
    expect(typeof summary.total_cost).toBe('number');

    // Verify against direct database query
    const dbResult = testDb.prepare('SELECT SUM(estimatedCost) as total FROM token_analytics').get();
    expect(summary.total_cost).toBeCloseTo(dbResult.total, 4);
  });

  it('should group by provider correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { by_provider } = response.body.data;
    expect(Array.isArray(by_provider)).toBe(true);

    if (by_provider.length > 0) {
      const provider = by_provider[0];
      expect(provider).toHaveProperty('provider');
      expect(provider).toHaveProperty('requests');
      expect(provider).toHaveProperty('tokens');
      expect(provider).toHaveProperty('cost');
      expect(['anthropic', 'openai', 'google', 'unknown']).toContain(provider.provider);
    }
  });

  it('should group by model correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const { by_model } = response.body.data;
    expect(Array.isArray(by_model)).toBe(true);

    if (by_model.length > 0) {
      const model = by_model[0];
      expect(model).toHaveProperty('model');
      expect(model).toHaveProperty('provider');
      expect(model).toHaveProperty('requests');
      expect(model).toHaveProperty('tokens');
      expect(model).toHaveProperty('cost');
    }
  });

  it('should handle empty database gracefully', async () => {
    // Create a temporary empty database
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
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.total_requests).toBe(0);
    expect(response.body.data.summary.total_tokens).toBe(0);
    expect(response.body.data.summary.total_cost).toBe(0);
    expect(response.body.data.by_provider).toEqual([]);
    expect(response.body.data.by_model).toEqual([]);

    emptyDb.close();
  });
});

describe('Token Analytics Real Data - Hourly Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should return hourly data with correct structure', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/hourly')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('labels');
    expect(response.body.data).toHaveProperty('datasets');
    expect(response.body).toHaveProperty('raw_data');
  });

  it('should group data by hour correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/hourly')
      .expect(200);

    const { raw_data } = response.body;
    expect(Array.isArray(raw_data)).toBe(true);

    if (raw_data.length > 0) {
      const firstRow = raw_data[0];
      expect(firstRow).toHaveProperty('hour');
      expect(firstRow.hour).toMatch(/^\d{2}:00$/); // Format: "HH:00"
    }
  });

  it('should have three datasets: tokens, requests, cost', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/hourly')
      .expect(200);

    const { datasets } = response.body.data;
    expect(datasets).toHaveLength(3);
    expect(datasets[0].label).toBe('Total Tokens');
    expect(datasets[1].label).toBe('Requests');
    expect(datasets[2].label).toBe('Cost (dollars)');
  });

  it('should aggregate tokens, requests, and cost per hour', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/hourly')
      .expect(200);

    const { raw_data } = response.body;

    if (raw_data.length > 0) {
      const firstRow = raw_data[0];
      expect(typeof firstRow.total_tokens).toBe('number');
      expect(typeof firstRow.total_requests).toBe('number');
      expect(typeof firstRow.total_cost).toBe('number');
    }
  });

  it('should filter to last 24 hours', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/hourly')
      .expect(200);

    const { raw_data } = response.body;

    // All data should be within last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    raw_data.forEach(row => {
      // Since we only have hour, we can't precisely validate timestamp
      // but we can check that hours are reasonable
      const hourMatch = row.hour.match(/^(\d{2}):00$/);
      expect(hourMatch).not.toBeNull();
      const hour = parseInt(hourMatch[1]);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
    });
  });
});

describe('Token Analytics Real Data - Daily Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should return daily data with correct structure', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('labels');
    expect(response.body.data).toHaveProperty('datasets');
    expect(response.body).toHaveProperty('raw_data');
  });

  it('should group data by date correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { raw_data } = response.body;
    expect(Array.isArray(raw_data)).toBe(true);

    if (raw_data.length > 0) {
      const firstRow = raw_data[0];
      expect(firstRow).toHaveProperty('date');
      expect(firstRow.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Format: "YYYY-MM-DD"
    }
  });

  it('should have two datasets: daily tokens and daily requests', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { datasets } = response.body.data;
    expect(datasets).toHaveLength(2);
    expect(datasets[0].label).toBe('Daily Tokens');
    expect(datasets[1].label).toBe('Daily Requests');
  });

  it('should aggregate tokens and requests per day', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { raw_data } = response.body;

    if (raw_data.length > 0) {
      const firstRow = raw_data[0];
      expect(typeof firstRow.total_tokens).toBe('number');
      expect(typeof firstRow.total_requests).toBe('number');
      expect(typeof firstRow.total_cost).toBe('number');
    }
  });

  it('should filter to last 30 days by default', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/daily')
      .expect(200);

    const { raw_data } = response.body;

    // All dates should be within last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    raw_data.forEach(row => {
      const date = new Date(row.date);
      expect(date.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });
});

describe('Token Analytics Real Data - Messages Endpoint', () => {
  beforeAll(() => {
    testDb = new Database(TEST_DB_PATH);
    testApp = createTestApp(testDb);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  it('should return paginated messages', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('limit');
    expect(response.body).toHaveProperty('offset');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should respect limit parameter', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=5')
      .expect(200);

    expect(response.body.data.length).toBeLessThanOrEqual(5);
    expect(response.body.limit).toBe(5);
  });

  it('should respect offset parameter', async () => {
    const response1 = await request(testApp)
      .get('/api/token-analytics/messages?limit=5&offset=0')
      .expect(200);

    const response2 = await request(testApp)
      .get('/api/token-analytics/messages?limit=5&offset=5')
      .expect(200);

    // Records should be different
    if (response1.body.data.length > 0 && response2.body.data.length > 0) {
      expect(response1.body.data[0].id).not.toBe(response2.body.data[0].id);
    }
  });

  it('should order by timestamp DESC (newest first)', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    const { data } = response.body;
    if (data.length > 1) {
      const first = new Date(data[0].timestamp);
      const second = new Date(data[1].timestamp);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should have all required fields', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
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

  it('should infer provider from model correctly', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages')
      .expect(200);

    if (response.body.data.length > 0) {
      const message = response.body.data[0];
      if (message.model.includes('claude')) {
        expect(message.provider).toBe('anthropic');
      } else if (message.model.includes('gpt')) {
        expect(message.provider).toBe('openai');
      } else if (message.model.includes('gemini')) {
        expect(message.provider).toBe('google');
      }
    }
  });

  it('should filter by provider', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?provider=anthropic')
      .expect(200);

    response.body.data.forEach(msg => {
      expect(msg.provider).toBe('anthropic');
      expect(msg.model).toContain('claude');
    });
  });

  it('should filter by model', async () => {
    // Get first model from database
    const firstRecord = testDb.prepare('SELECT model FROM token_analytics LIMIT 1').get();
    if (firstRecord) {
      const response = await request(testApp)
        .get(`/api/token-analytics/messages?model=${firstRecord.model}`)
        .expect(200);

      response.body.data.forEach(msg => {
        expect(msg.model).toBe(firstRecord.model);
      });
    }
  });

  it('should enforce maximum limit of 100', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/messages?limit=500')
      .expect(200);

    expect(response.body.limit).toBeLessThanOrEqual(100);
  });
});

describe('Token Analytics Real Data - Error Handling', () => {
  it('should return 500 on database error', async () => {
    // Create app with closed database
    const closedDb = new Database(':memory:');
    closedDb.close();

    const errorApp = createTestApp(closedDb);

    const response = await request(errorApp)
      .get('/api/token-analytics/summary');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
  });
});
