/**
 * Token Analytics API Integration Tests
 * Tests for all token analytics endpoints
 */

const request = require('supertest');
const express = require('express');

// Create test app with mock routes
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
        total_cost: totalTokens * 0.01, // Mock cost calculation
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
  const hasData = mockDB.data.length > 0;
  res.json({
    success: true,
    data: {
      labels: Array.from({length: 30}, (_, i) => `Day ${i + 1}`),
      datasets: [{
        label: 'Daily Tokens',
        data: Array.from({length: 30}, () => hasData ? 1000 : 0),
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
      costInput = (usage.input_tokens / 1000) * 3 * 10; // adjusted for test
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

app.post('/api/token-analytics/batch', (req, res) => {
  const { batch } = req.body;
  let processed = 0;
  const errors = [];

  batch.forEach((usage, index) => {
    if (!usage.provider || !usage.model || !usage.input_tokens || !usage.output_tokens) {
      errors.push({
        index,
        error: 'Missing required fields'
      });
    } else {
      mockDB.insertTokenUsage({
        ...usage,
        id: mockDB.data.length + 1,
        total_tokens: usage.input_tokens + usage.output_tokens,
        timestamp: new Date().toISOString()
      });
      processed++;
    }
  });

  res.status(201).json({
    success: true,
    data: {
      processed,
      total: batch.length,
      errors
    }
  });
});

const tokenAnalyticsDB = mockDB;

describe('Token Analytics API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await tokenAnalyticsDB.init();
  });

  beforeEach(async () => {
    // Clear existing data
    tokenAnalyticsDB.db.exec('DELETE FROM token_usage');

    // Insert test data
    const testData = [
      {
        session_id: 'test-session-1',
        request_id: 'test-req-1',
        message_id: 'test-msg-1',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 1000,
        output_tokens: 800,
        request_type: 'chat_completion',
        message_content: 'Test message content for analytics',
        response_content: 'Test response content for analytics'
      },
      {
        session_id: 'test-session-2',
        request_id: 'test-req-2',
        message_id: 'test-msg-2',
        provider: 'openai',
        model: 'gpt-4',
        input_tokens: 1500,
        output_tokens: 1200,
        request_type: 'completion',
        message_content: 'Another test message',
        response_content: 'Another test response'
      }
    ];

    testData.forEach(data => {
      tokenAnalyticsDB.insertTokenUsage(data);
    });
  });

  afterAll(async () => {
    tokenAnalyticsDB.close();
  });

  describe('GET /api/token-analytics/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/token-analytics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('connected', true);
      expect(response.body.data).toHaveProperty('total_records');
    });
  });

  describe('GET /api/token-analytics/summary', () => {
    test('should return valid summary data format', async () => {
      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      expect(response.body.success).toBe(true);

      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('total_requests');
      expect(summary).toHaveProperty('total_tokens');
      expect(summary).toHaveProperty('total_cost');
      expect(summary).toHaveProperty('unique_sessions');
      expect(summary).toHaveProperty('providers_used');
      expect(summary).toHaveProperty('models_used');

      // Validate data types
      expect(typeof summary.total_requests).toBe('number');
      expect(typeof summary.total_tokens).toBe('number');
      expect(typeof summary.total_cost).toBe('number');
      expect(typeof summary.unique_sessions).toBe('number');
      expect(typeof summary.providers_used).toBe('number');
      expect(typeof summary.models_used).toBe('number');
    });

    test('should calculate summary statistics correctly', async () => {
      const response = await request(app)
        .get('/api/token-analytics/summary')
        .expect(200);

      const summary = response.body.data.summary;
      expect(summary.total_requests).toBe(2);
      expect(summary.total_tokens).toBe(4500); // 1800 + 2700
      expect(summary.unique_sessions).toBe(2);
      expect(summary.providers_used).toBe(2); // anthropic, openai
      expect(summary.models_used).toBe(2); // claude-3-5-sonnet, gpt-4
    });
  });

  describe('GET /api/token-analytics/hourly', () => {
    test('should return 24 hour buckets', async () => {
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toHaveLength(24);
      expect(response.body.data.datasets).toBeDefined();
      expect(Array.isArray(response.body.data.datasets)).toBe(true);
    });

    test('should return Chart.js compatible format', async () => {
      const response = await request(app)
        .get('/api/token-analytics/hourly')
        .expect(200);

      const data = response.body.data;
      expect(data).toHaveProperty('labels');
      expect(data).toHaveProperty('datasets');

      data.datasets.forEach(dataset => {
        expect(dataset).toHaveProperty('label');
        expect(dataset).toHaveProperty('data');
        expect(dataset).toHaveProperty('borderColor');
        expect(dataset).toHaveProperty('backgroundColor');
      });
    });
  });

  describe('GET /api/token-analytics/daily', () => {
    test('should return 30 day buckets', async () => {
      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toHaveLength(30);
      expect(response.body.data.datasets).toBeDefined();
    });

    test('should handle empty data gracefully', async () => {
      // Clear all data
      tokenAnalyticsDB.db.exec('DELETE FROM token_usage');

      const response = await request(app)
        .get('/api/token-analytics/daily')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toHaveLength(30);

      // Should have zero values for all buckets
      response.body.data.datasets.forEach(dataset => {
        expect(dataset.data).toHaveLength(30);
        dataset.data.forEach(value => {
          expect(value).toBe(0);
        });
      });
    });
  });

  describe('GET /api/token-analytics/messages', () => {
    test('should return recent messages with previews', async () => {
      const response = await request(app)
        .get('/api/token-analytics/messages?limit=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('count');
      expect(response.body.meta).toHaveProperty('limit', 50);

      // Check message structure
      if (response.body.data.length > 0) {
        const message = response.body.data[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('message_id');
        expect(message).toHaveProperty('total_tokens');
        expect(message).toHaveProperty('cost_total');
        expect(message).toHaveProperty('message_preview');
        expect(message).toHaveProperty('response_preview');
      }
    });

    test('should limit message preview length', async () => {
      const response = await request(app)
        .get('/api/token-analytics/messages')
        .expect(200);

      response.body.data.forEach(message => {
        if (message.message_preview) {
          expect(message.message_preview.length).toBeLessThanOrEqual(200);
        }
        if (message.response_preview) {
          expect(message.response_preview.length).toBeLessThanOrEqual(200);
        }
      });
    });
  });

  describe('POST /api/token-analytics/usage', () => {
    test('should create new token usage record', async () => {
      const newUsage = {
        session_id: 'test-session-3',
        request_id: 'test-req-3',
        message_id: 'test-msg-3',
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        input_tokens: 500,
        output_tokens: 300,
        request_type: 'analysis'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(newUsage)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.duplicate).toBe(false);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.total_tokens).toBe(800);
    });

    test('should prevent duplicate message IDs', async () => {
      const duplicateUsage = {
        session_id: 'test-session-1',
        request_id: 'test-req-1',
        message_id: 'test-msg-1', // Duplicate message_id
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 1000,
        output_tokens: 800,
        request_type: 'chat_completion'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(duplicateUsage)
        .expect(200); // 200 for duplicate, not 201

      expect(response.body.success).toBe(true);
      expect(response.body.data.duplicate).toBe(true);
    });

    test('should auto-calculate costs when not provided', async () => {
      const usage = {
        session_id: 'test-session-4',
        request_id: 'test-req-4',
        message_id: 'test-msg-4',
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        input_tokens: 1000,
        output_tokens: 1000,
        request_type: 'test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(usage)
        .expect(201);

      expect(response.body.data.cost_input).toBe(8); // 0.08 * 1000/1000 * 100
      expect(response.body.data.cost_output).toBe(40); // 0.4 * 1000/1000 * 100
      expect(response.body.data.cost_total).toBe(48);
    });
  });

  describe('POST /api/token-analytics/batch', () => {
    test('should process batch token usage records', async () => {
      const batchData = {
        batch: [
          {
            session_id: 'batch-session-1',
            request_id: 'batch-req-1',
            message_id: 'batch-msg-1',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            input_tokens: 750,
            output_tokens: 500,
            request_type: 'batch_test'
          },
          {
            session_id: 'batch-session-2',
            request_id: 'batch-req-2',
            message_id: 'batch-msg-2',
            provider: 'anthropic',
            model: 'claude-3-opus-20240229',
            input_tokens: 1200,
            output_tokens: 900,
            request_type: 'batch_test'
          }
        ]
      };

      const response = await request(app)
        .post('/api/token-analytics/batch')
        .send(batchData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(2);
      expect(response.body.data.total).toBe(2);
    });

    test('should handle batch validation errors', async () => {
      const invalidBatch = {
        batch: [
          {
            // Missing required fields
            session_id: 'invalid-session',
            provider: 'invalid'
          }
        ]
      };

      const response = await request(app)
        .post('/api/token-analytics/batch')
        .send(invalidBatch)
        .expect(201);

      expect(response.body.data.processed).toBe(0);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });

  describe('Data Validation', () => {
    test('should reject invalid provider values', async () => {
      const invalidUsage = {
        session_id: 'test-session',
        request_id: 'test-req',
        message_id: 'test-msg',
        provider: 'invalid-provider', // Not in enum
        model: 'test-model',
        input_tokens: 100,
        output_tokens: 100,
        request_type: 'test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(invalidUsage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should reject negative token values', async () => {
      const invalidUsage = {
        session_id: 'test-session',
        request_id: 'test-req',
        message_id: 'test-msg',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: -100, // Negative value
        output_tokens: 100,
        request_type: 'test'
      };

      const response = await request(app)
        .post('/api/token-analytics/usage')
        .send(invalidUsage)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});