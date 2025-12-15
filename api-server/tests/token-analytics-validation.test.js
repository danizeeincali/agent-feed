/**
 * Token Analytics Data Validation Tests
 * Validates data accuracy and transformations between database and API
 *
 * Test Coverage:
 * - Database records match API response
 * - Cost calculations are accurate
 * - Token sums are correct
 * - Provider inference is correct
 * - Date filtering works correctly
 * - No data loss in transformation
 * - Aggregation accuracy
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

let db;
let testApp;

// Helper to create test app (simplified version)
function createTestApp(dbInstance) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const inferProvider = (model) => {
    if (!model) return 'unknown';
    const modelLower = model.toLowerCase();
    if (modelLower.includes('claude')) return 'anthropic';
    if (modelLower.includes('gpt')) return 'openai';
    if (modelLower.includes('gemini')) return 'google';
    return 'unknown';
  };

  app.get('/api/token-analytics/summary', (req, res) => {
    try {
      const summaryQuery = `
        SELECT
          COUNT(*) as total_requests,
          SUM(totalTokens) as total_tokens,
          ROUND(SUM(estimatedCost), 4) as total_cost,
          COUNT(DISTINCT sessionId) as unique_sessions,
          COUNT(DISTINCT model) as models_used
        FROM token_analytics
      `;
      const summary = dbInstance.prepare(summaryQuery).get();

      const modelsQuery = `SELECT DISTINCT model FROM token_analytics`;
      const models = dbInstance.prepare(modelsQuery).all();
      const providers = new Set(models.map(m => inferProvider(m.model)));
      summary.providers_used = providers.size;

      const byModelQuery = `
        SELECT
          model,
          COUNT(*) as requests,
          SUM(totalTokens) as tokens,
          ROUND(SUM(estimatedCost), 4) as cost
        FROM token_analytics
        GROUP BY model
        ORDER BY requests DESC
      `;
      const modelStats = dbInstance.prepare(byModelQuery).all().map(m => ({
        model: m.model,
        provider: inferProvider(m.model),
        requests: m.requests,
        tokens: m.tokens,
        cost: m.cost
      }));

      const byProvider = {};
      modelStats.forEach(m => {
        if (!byProvider[m.provider]) {
          byProvider[m.provider] = {
            provider: m.provider,
            requests: 0,
            tokens: 0,
            cost: 0
          };
        }
        byProvider[m.provider].requests += m.requests;
        byProvider[m.provider].tokens += m.tokens;
        byProvider[m.provider].cost += m.cost;
      });

      const providerStats = Object.values(byProvider).sort((a, b) => b.requests - a.requests);

      res.json({
        success: true,
        data: {
          summary: {
            total_requests: summary.total_requests || 0,
            total_tokens: summary.total_tokens || 0,
            total_cost: summary.total_cost || 0,
            unique_sessions: summary.unique_sessions || 0,
            providers_used: summary.providers_used || 0,
            models_used: summary.models_used || 0
          },
          by_provider: providerStats,
          by_model: modelStats
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return app;
}

describe('Token Analytics - Database to API Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
    testApp = createTestApp(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should match total requests count between DB and API', async () => {
    // Direct DB query
    const dbCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();

    // API response
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.total_requests).toBe(dbCount.count);
    console.log(`✅ Total requests match: DB=${dbCount.count}, API=${response.body.data.summary.total_requests}`);
  });

  it('should match total tokens between DB and API', async () => {
    // Direct DB query
    const dbSum = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get();

    // API response
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.total_tokens).toBe(dbSum.total);
    console.log(`✅ Total tokens match: DB=${dbSum.total}, API=${response.body.data.summary.total_tokens}`);
  });

  it('should calculate cost correctly (DB dollars to API dollars)', async () => {
    // Direct DB query (in dollars)
    const dbCost = db.prepare('SELECT SUM(estimatedCost) as total FROM token_analytics').get();
    const expectedCostDollars = parseFloat(dbCost.total.toFixed(4));

    // API response (should be in dollars)
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.total_cost).toBeCloseTo(expectedCostDollars, 4);
    console.log(`✅ Cost conversion correct: DB=$${dbCost.total.toFixed(4)}, API=$${response.body.data.summary.total_cost.toFixed(4)}`);
  });

  it('should match unique sessions between DB and API', async () => {
    // Direct DB query
    const dbSessions = db.prepare('SELECT COUNT(DISTINCT sessionId) as count FROM token_analytics').get();

    // API response
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.unique_sessions).toBe(dbSessions.count);
    console.log(`✅ Unique sessions match: DB=${dbSessions.count}, API=${response.body.data.summary.unique_sessions}`);
  });

  it('should match unique models between DB and API', async () => {
    // Direct DB query
    const dbModels = db.prepare('SELECT COUNT(DISTINCT model) as count FROM token_analytics').get();

    // API response
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    expect(response.body.data.summary.models_used).toBe(dbModels.count);
    console.log(`✅ Unique models match: DB=${dbModels.count}, API=${response.body.data.summary.models_used}`);
  });
});

describe('Token Analytics - Provider Inference Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
    testApp = createTestApp(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should correctly infer Anthropic from Claude models', async () => {
    const claudeRecords = db.prepare(`
      SELECT * FROM token_analytics
      WHERE model LIKE '%claude%'
      LIMIT 5
    `).all();

    if (claudeRecords.length > 0) {
      const response = await request(testApp)
        .get('/api/token-analytics/summary')
        .expect(200);

      const anthropicProvider = response.body.data.by_provider.find(p => p.provider === 'anthropic');
      expect(anthropicProvider).toBeDefined();
      expect(anthropicProvider.requests).toBeGreaterThan(0);

      console.log(`✅ Anthropic inference correct: ${anthropicProvider.requests} requests`);
    }
  });

  it('should correctly infer OpenAI from GPT models', async () => {
    const gptRecords = db.prepare(`
      SELECT * FROM token_analytics
      WHERE model LIKE '%gpt%'
      LIMIT 5
    `).all();

    if (gptRecords.length > 0) {
      const response = await request(testApp)
        .get('/api/token-analytics/summary')
        .expect(200);

      const openaiProvider = response.body.data.by_provider.find(p => p.provider === 'openai');
      expect(openaiProvider).toBeDefined();
      expect(openaiProvider.requests).toBeGreaterThan(0);

      console.log(`✅ OpenAI inference correct: ${openaiProvider.requests} requests`);
    }
  });

  it('should correctly infer Google from Gemini models', async () => {
    const geminiRecords = db.prepare(`
      SELECT * FROM token_analytics
      WHERE model LIKE '%gemini%'
      LIMIT 5
    `).all();

    if (geminiRecords.length > 0) {
      const response = await request(testApp)
        .get('/api/token-analytics/summary')
        .expect(200);

      const googleProvider = response.body.data.by_provider.find(p => p.provider === 'google');
      expect(googleProvider).toBeDefined();
      expect(googleProvider.requests).toBeGreaterThan(0);

      console.log(`✅ Google inference correct: ${googleProvider.requests} requests`);
    }
  });
});

describe('Token Analytics - Model Aggregation Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
    testApp = createTestApp(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should accurately aggregate tokens by model', async () => {
    // Get all unique models from DB
    const models = db.prepare('SELECT DISTINCT model FROM token_analytics').all();

    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    for (const { model } of models) {
      // DB aggregation for this model
      const dbStats = db.prepare(`
        SELECT
          COUNT(*) as requests,
          SUM(totalTokens) as tokens,
          ROUND(SUM(estimatedCost), 4) as cost
        FROM token_analytics
        WHERE model = ?
      `).get(model);

      // API aggregation for this model
      const apiModelStats = response.body.data.by_model.find(m => m.model === model);

      expect(apiModelStats).toBeDefined();
      expect(apiModelStats.requests).toBe(dbStats.requests);
      expect(apiModelStats.tokens).toBe(dbStats.tokens);
      expect(apiModelStats.cost).toBeCloseTo(dbStats.cost, 4);

      console.log(`✅ Model ${model}: requests=${dbStats.requests}, tokens=${dbStats.tokens}`);
    }
  });

  it('should accurately aggregate by provider', async () => {
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    const byProvider = response.body.data.by_provider;

    // Verify provider totals sum to overall totals
    const totalRequests = byProvider.reduce((sum, p) => sum + p.requests, 0);
    const totalTokens = byProvider.reduce((sum, p) => sum + p.tokens, 0);
    const totalCost = byProvider.reduce((sum, p) => sum + p.cost, 0);

    expect(totalRequests).toBe(response.body.data.summary.total_requests);
    expect(totalTokens).toBe(response.body.data.summary.total_tokens);
    // Allow $0.01 tolerance due to rounding at model level before provider aggregation
    expect(Math.abs(totalCost - response.body.data.summary.total_cost)).toBeLessThanOrEqual(0.01);

    console.log('✅ Provider aggregations sum to totals correctly');
  });
});

describe('Token Analytics - Data Integrity Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should verify all records have totalTokens = inputTokens + outputTokens', () => {
    const records = db.prepare('SELECT * FROM token_analytics').all();

    let valid = 0;
    let invalid = 0;

    records.forEach(record => {
      if (record.totalTokens === record.inputTokens + record.outputTokens) {
        valid++;
      } else {
        invalid++;
        console.error(`❌ Invalid token sum for record ${record.id}: ${record.totalTokens} !== ${record.inputTokens} + ${record.outputTokens}`);
      }
    });

    expect(invalid).toBe(0);
    console.log(`✅ All ${valid} records have valid token sums`);
  });

  it('should verify all costs are positive', () => {
    const records = db.prepare('SELECT * FROM token_analytics').all();

    records.forEach(record => {
      expect(record.estimatedCost).toBeGreaterThan(0);
    });

    console.log(`✅ All ${records.length} records have positive costs`);
  });

  it('should verify all timestamps are valid ISO format', () => {
    const records = db.prepare('SELECT timestamp FROM token_analytics').all();

    records.forEach(record => {
      const date = new Date(record.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    console.log(`✅ All ${records.length} timestamps are valid ISO format`);
  });

  it('should verify no records have negative token counts', () => {
    const negativeTokens = db.prepare(`
      SELECT COUNT(*) as count FROM token_analytics
      WHERE inputTokens < 0 OR outputTokens < 0 OR totalTokens < 0
    `).get();

    expect(negativeTokens.count).toBe(0);
    console.log('✅ No records with negative token counts');
  });

  it('should verify all required fields are non-null', () => {
    const nullFields = db.prepare(`
      SELECT COUNT(*) as count FROM token_analytics
      WHERE
        id IS NULL OR
        timestamp IS NULL OR
        sessionId IS NULL OR
        operation IS NULL OR
        inputTokens IS NULL OR
        outputTokens IS NULL OR
        totalTokens IS NULL OR
        estimatedCost IS NULL OR
        model IS NULL
    `).get();

    expect(nullFields.count).toBe(0);
    console.log('✅ All required fields are non-null');
  });
});

describe('Token Analytics - Date Filtering Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should correctly filter records by date range', () => {
    const startDate = '2025-09-20';
    const endDate = '2025-09-30';

    const records = db.prepare(`
      SELECT * FROM token_analytics
      WHERE DATE(timestamp) BETWEEN ? AND ?
    `).all(startDate, endDate);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day

    records.forEach(record => {
      const recordDate = new Date(record.timestamp);
      expect(recordDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(recordDate.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    console.log(`✅ ${records.length} records correctly filtered to date range`);
  });

  it('should correctly aggregate hourly data within 24 hours', () => {
    const hourlyData = db.prepare(`
      SELECT
        strftime('%H:00', timestamp) as hour,
        COUNT(*) as count,
        SUM(totalTokens) as tokens
      FROM token_analytics
      WHERE datetime(timestamp) >= datetime('now', '-24 hours')
      GROUP BY strftime('%H:00', timestamp)
    `).all();

    // Verify hour format
    hourlyData.forEach(row => {
      expect(row.hour).toMatch(/^\d{2}:00$/);
      expect(row.count).toBeGreaterThan(0);
      expect(row.tokens).toBeGreaterThan(0);
    });

    console.log(`✅ ${hourlyData.length} hourly buckets with valid aggregations`);
  });

  it('should correctly aggregate daily data', () => {
    const dailyData = db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count,
        SUM(totalTokens) as tokens
      FROM token_analytics
      GROUP BY DATE(timestamp)
    `).all();

    // Verify date format
    dailyData.forEach(row => {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.count).toBeGreaterThan(0);
      expect(row.tokens).toBeGreaterThan(0);
    });

    console.log(`✅ ${dailyData.length} daily buckets with valid aggregations`);
  });
});

describe('Token Analytics - No Data Loss Validation', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
    testApp = createTestApp(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should account for all database records in summary', async () => {
    // Get total records from DB
    const dbCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();

    // Get summary from API
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    // Sum up all model requests
    const totalModelRequests = response.body.data.by_model.reduce((sum, m) => sum + m.requests, 0);

    // Should match total
    expect(totalModelRequests).toBe(dbCount.count);
    expect(totalModelRequests).toBe(response.body.data.summary.total_requests);

    console.log(`✅ No data loss: ${dbCount.count} DB records = ${totalModelRequests} API model requests`);
  });

  it('should account for all tokens in aggregations', async () => {
    // Get total tokens from DB
    const dbTokens = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get();

    // Get summary from API
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    // Sum up all model tokens
    const totalModelTokens = response.body.data.by_model.reduce((sum, m) => sum + m.tokens, 0);

    // Should match total
    expect(totalModelTokens).toBe(dbTokens.total);
    expect(totalModelTokens).toBe(response.body.data.summary.total_tokens);

    console.log(`✅ No token loss: ${dbTokens.total} DB tokens = ${totalModelTokens} API tokens`);
  });

  it('should account for all costs in aggregations', async () => {
    // Get total cost from DB (using ROUND to match API)
    const dbCost = db.prepare('SELECT ROUND(SUM(estimatedCost), 4) as total FROM token_analytics').get();
    const expectedCost = dbCost.total;

    // Get summary from API
    const response = await request(testApp)
      .get('/api/token-analytics/summary')
      .expect(200);

    // Sum up all model costs
    const totalModelCost = response.body.data.by_model.reduce((sum, m) => sum + m.cost, 0);

    // Should match total (allow $0.01 tolerance due to rounding at model level)
    expect(Math.abs(totalModelCost - expectedCost)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(totalModelCost - response.body.data.summary.total_cost)).toBeLessThanOrEqual(0.01);

    console.log(`✅ No cost loss: $${expectedCost.toFixed(4)} DB = $${totalModelCost.toFixed(4)} API`);
  });
});
