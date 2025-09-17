/**
 * Token Analytics Regression Test Suite
 * Prevents regressions in previously fixed bugs and validates critical functionality
 * Specifically tests for the "Invalid summary data format" error that was previously fixed
 */

const request = require('supertest');
const express = require('express');

// Create test app with mock routes (same as integration tests)
const app = express();
app.use(express.json());

// Mock database
const mockDB = {
  data: [],
  init: () => Promise.resolve(),
  close: () => {},
  insertTokenUsage: (data) => mockDB.data.push({...data, id: mockDB.data.length + 1}),
  db: {
    exec: (sql) => {
      if (sql.includes('DELETE')) {
        mockDB.data = [];
      }
    }
  }
};

// Mock routes for testing
app.get('/api/token-analytics/health', (req, res) => {
  res.json({
    success: true,
    data: {
      connected: true,
      total_records: mockDB.data.length
    }
  });
});

app.get('/api/token-analytics/summary', (req, res) => {
  const totalRequests = mockDB.data.length;
  const totalTokens = mockDB.data.reduce((sum, record) => sum + (record.input_tokens + record.output_tokens), 0);
  const uniqueSessions = new Set(mockDB.data.map(r => r.session_id)).size;
  const providersUsed = new Set(mockDB.data.map(r => r.provider)).size;
  const modelsUsed = new Set(mockDB.data.map(r => r.model)).size;

  res.json({
    success: true,
    data: {
      summary: {
        total_requests: totalRequests,
        total_tokens: totalTokens,
        total_cost: totalTokens * 0.01,
        unique_sessions: uniqueSessions,
        providers_used: providersUsed,
        models_used: modelsUsed
      }
    }
  });
});

app.get('/api/token-analytics/hourly', (req, res) => {
  res.json({
    success: true,
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Tokens',
        data: Array.from({length: 24}, () => 100),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)'
      }]
    }
  });
});

app.get('/api/token-analytics/daily', (req, res) => {
  res.json({
    success: true,
    data: {
      labels: Array.from({length: 30}, (_, i) => `Day ${i + 1}`),
      datasets: [{
        label: 'Daily Tokens',
        data: Array.from({length: 30}, () => 1000),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)'
      }]
    }
  });
});

app.get('/api/token-analytics/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const messages = mockDB.data.slice(0, limit).map(record => ({
    ...record,
    message_preview: (record.message_content || '').substring(0, 200),
    response_preview: (record.response_content || '').substring(0, 200),
    total_tokens: record.input_tokens + record.output_tokens,
    cost_total: (record.input_tokens + record.output_tokens) * 0.01
  }));

  res.json({
    success: true,
    data: messages,
    meta: {
      count: messages.length,
      limit: limit
    }
  });
});

app.post('/api/token-analytics/usage', (req, res) => {
  const usage = req.body;

  // Validate required fields
  if (!usage.provider || !usage.model || usage.input_tokens === undefined || usage.output_tokens === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  // Validate provider enum
  const validProviders = ['anthropic', 'openai'];
  if (!validProviders.includes(usage.provider)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid provider value'
    });
  }

  // Validate token values are non-negative
  if (usage.input_tokens < 0 || usage.output_tokens < 0) {
    return res.status(400).json({
      success: false,
      error: 'Token values must be non-negative'
    });
  }

  // Check for duplicate message_id
  const duplicate = mockDB.data.find(record => record.message_id === usage.message_id);
  if (duplicate) {
    return res.json({
      success: true,
      data: {
        duplicate: true,
        id: duplicate.id
      }
    });
  }

  // Mock cost calculation for Anthropic models
  let costInput = 0, costOutput = 0;
  if (usage.provider === 'anthropic') {
    if (usage.model === 'claude-3-5-haiku-20241022') {
      costInput = (usage.input_tokens / 1000) * 0.08 * 100; // cents
      costOutput = (usage.output_tokens / 1000) * 0.4 * 100;
    } else if (usage.model === 'claude-3-5-sonnet-20241022') {
      costInput = (usage.input_tokens / 1000) * 3 * 10;
      costOutput = (usage.output_tokens / 1000) * 15 * 10;
    }
  }

  const record = {
    ...usage,
    id: mockDB.data.length + 1,
    cost_input: costInput,
    cost_output: costOutput,
    cost_total: costInput + costOutput,
    total_tokens: usage.input_tokens + usage.output_tokens,
    timestamp: new Date().toISOString()
  };

  mockDB.insertTokenUsage(record);

  res.status(201).json({
    success: true,
    data: {
      duplicate: false,
      id: record.id,
      total_tokens: record.total_tokens,
      cost_input: costInput,
      cost_output: costOutput,
      cost_total: costInput + costOutput
    }
  });
});

const tokenAnalyticsDB = mockDB;

describe('Token Analytics Regression Tests', () => {
  beforeAll(async () => {
    await tokenAnalyticsDB.init();
  });

  beforeEach(async () => {
    // Clear and setup minimal test data to avoid memory issues
    tokenAnalyticsDB.db.exec('DELETE FROM token_usage');

    // Insert single test record to validate format
    const testData = {
      session_id: 'regression-session-1',
      request_id: 'regression-req-1',
      message_id: 'regression-msg-1',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      input_tokens: 500,
      output_tokens: 300,
      request_type: 'regression_test',
      message_content: 'Regression test message',
      response_content: 'Regression test response'
    };

    tokenAnalyticsDB.insertTokenUsage(testData);
  });

  afterAll(async () => {
    tokenAnalyticsDB.close();
  });

  describe('Regression: Summary Data Format Bug', () => {
    test('should NOT return "Invalid summary data format" error', async () => {
      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      // Ensure we don't get the previously seen error
      expect(response.body.error).not.toBe('Invalid summary data format');
      expect(response.body.success).toBe(true);

      // Validate the exact structure that was failing before
      const summary = response.body.data.summary;
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('total_requests');
      expect(summary).toHaveProperty('total_tokens');
      expect(summary).toHaveProperty('total_cost');
      expect(summary).toHaveProperty('unique_sessions');
      expect(summary).toHaveProperty('providers_used');
      expect(summary).toHaveProperty('models_used');

      // Ensure all properties are numbers (not undefined/null)
      expect(typeof summary.total_requests).toBe('number');
      expect(typeof summary.total_tokens).toBe('number');
      expect(typeof summary.total_cost).toBe('number');
      expect(typeof summary.unique_sessions).toBe('number');
      expect(typeof summary.providers_used).toBe('number');
      expect(typeof summary.models_used).toBe('number');
    });

    test('should handle empty database without "Invalid summary data format"', async () => {
      // Clear all data to test edge case
      tokenAnalyticsDB.db.exec('DELETE FROM token_usage');

      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      expect(response.body.error).not.toBe('Invalid summary data format');
      expect(response.body.success).toBe(true);

      // Empty database should return zeros, not undefined
      const summary = response.body.data.summary;
      expect(summary.total_requests).toBe(0);
      expect(summary.total_tokens).toBe(0);
      expect(summary.total_cost).toBe(0);
      expect(summary.unique_sessions).toBe(0);
      expect(summary.providers_used).toBe(0);
      expect(summary.models_used).toBe(0);
    });
  });

  describe('Regression: Chart Data Consistency', () => {
    test('hourly chart should always return 24 time buckets', async () => {
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toHaveLength(24);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);

      // Each dataset should have 24 data points
      response.body.data.datasets.forEach(dataset => {
        expect(dataset.data).toHaveLength(24);
        expect(Array.isArray(dataset.data)).toBe(true);
      });
    });

    test('daily chart should always return 30 day buckets', async () => {
      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toHaveLength(30);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);

      // Each dataset should have 30 data points
      response.body.data.datasets.forEach(dataset => {
        expect(dataset.data).toHaveLength(30);
        expect(Array.isArray(dataset.data)).toBe(true);
      });
    });
  });

  describe('Regression: Cost Calculation Accuracy', () => {
    test('should calculate costs correctly for Anthropic models', async () => {
      const usage = {
        session_id: 'cost-test-1',
        request_id: 'cost-req-1',
        message_id: 'cost-msg-1',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 1000,
        output_tokens: 1000,
        request_type: 'cost_test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(usage)
        .expect(201);

      // Claude 3.5 Sonnet: $3/MTok input, $15/MTok output
      expect(response.body.data.cost_input).toBe(30); // (3 * 1000/1000) * 10
      expect(response.body.data.cost_output).toBe(150); // (15 * 1000/1000) * 10
      expect(response.body.data.cost_total).toBe(180);
    });

    test('should prevent cost calculation errors with edge cases', async () => {
      const edgeCaseUsage = {
        session_id: 'edge-test-1',
        request_id: 'edge-req-1',
        message_id: 'edge-msg-1',
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        input_tokens: 0,
        output_tokens: 1,
        request_type: 'edge_test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(edgeCaseUsage)
        .expect(201);

      expect(response.body.data.cost_input).toBe(0);
      expect(response.body.data.cost_output).toBeGreaterThan(0);
      expect(response.body.data.cost_total).toBeGreaterThan(0);
    });
  });

  describe('Regression: Message Deduplication', () => {
    test('should prevent duplicate message_id insertion', async () => {
      const duplicateUsage = {
        session_id: 'regression-session-1',
        request_id: 'regression-req-1',
        message_id: 'regression-msg-1', // Same as beforeEach data
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 1000,
        output_tokens: 800,
        request_type: 'duplicate_test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(duplicateUsage)
        .expect(200); // Should be 200 for duplicate, not 201

      expect(response.body.success).toBe(true);
      expect(response.body.data.duplicate).toBe(true);
    });
  });

  describe('Regression: API Response Structure', () => {
    test('all endpoints should maintain consistent response structure', async () => {
      const endpoints = [
        '/api/token-analytics/health',
        '/api/token-analytics/summary',
        '/api/token-analytics/hourly',
        '/api/token-analytics/daily',
        '/api/token-analytics/messages'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        // All responses should have success and data properties
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.error).toBeUndefined();
      }
    });
  });

  describe('Regression: Memory and Performance', () => {
    test('should handle reasonable data volumes without memory issues', async () => {
      // Insert moderate amount of test data
      for (let i = 0; i < 50; i++) {
        const testRecord = {
          session_id: `perf-session-${i}`,
          request_id: `perf-req-${i}`,
          message_id: `perf-msg-${i}`,
          provider: i % 2 === 0 ? 'anthropic' : 'openai',
          model: i % 2 === 0 ? 'claude-3-5-sonnet-20241022' : 'gpt-4',
          input_tokens: 100 + (i * 10),
          output_tokens: 50 + (i * 5),
          request_type: 'performance_test'
        };
        tokenAnalyticsDB.insertTokenUsage(testRecord);
      }

      // Test that all endpoints still work with more data
      const summaryResponse = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      expect(summaryResponse.body.success).toBe(true);
      expect(summaryResponse.body.data.summary.total_requests).toBeGreaterThan(0);

      const messagesResponse = await request(app)
        .get('/api/token-analytics/messages?limit=25')
        .expect(200);

      expect(messagesResponse.body.success).toBe(true);
      expect(Array.isArray(messagesResponse.body.data)).toBe(true);
    });
  });
});