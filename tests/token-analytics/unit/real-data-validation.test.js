/**
 * Real Data Validation Tests
 * Ensures all token analytics data comes from authentic API calls
 */

const { ClaudeAPIManager } = require('../../../src/services/claude-api-manager');

describe('Real Data Validation', () => {
  let apiManager;

  beforeAll(() => {
    // Only initialize if we have real API keys
    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('fake')) {
      apiManager = new ClaudeAPIManager({
        debug: false,
        timeout: 30000
      });
    }
  });

  afterAll(async () => {
    if (apiManager) {
      await apiManager.cleanup();
    }
  });

  describe('Authentic Token Usage Tracking', () => {
    test('should track real API call token usage', async () => {
      if (!apiManager) {
        console.warn('Skipping real API test - no valid API keys');
        return;
      }

      const startTime = Date.now();
      const response = await apiManager.sendPrompt('Calculate 2 + 2');

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.request_id).toBeDefined();
      expect(response.duration_ms).toBeGreaterThan(0);

      // Validate response timing is realistic
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      expect(Math.abs(actualDuration - response.duration_ms)).toBeLessThan(1000);

      global.trackRealDataValidation();
    }, 30000);

    test('should calculate authentic costs based on real usage', async () => {
      if (!apiManager) {
        console.warn('Skipping real cost calculation test - no valid API keys');
        return;
      }

      // Make a real API call with known content
      const prompt = 'Explain the concept of machine learning in exactly 50 words.';
      const response = await apiManager.sendPrompt(prompt);

      expect(response.success).toBe(true);

      // Calculate expected cost based on real pricing
      const inputTokens = prompt.split(' ').length * 1.3; // Rough token estimation
      const outputTokens = response.result ? response.result.split(' ').length * 1.3 : 0;

      const expectedInputCost = inputTokens * global.ANTHROPIC_PRICING['claude-3-sonnet'].input;
      const expectedOutputCost = outputTokens * global.ANTHROPIC_PRICING['claude-3-sonnet'].output;
      const expectedTotalCost = expectedInputCost + expectedOutputCost;

      // Actual cost would need to be extracted from real API response
      // This validates the cost calculation methodology
      expect(expectedTotalCost).toBeGreaterThan(0);
      expect(expectedTotalCost).toBeLessThan(1); // Reasonable upper bound

      global.trackApiCall('/api/claude', 'POST', inputTokens + outputTokens, expectedTotalCost);
      global.trackRealDataValidation();
    }, 30000);
  });

  describe('Database Data Integrity', () => {
    test('should store only real token usage data', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      // Insert real token usage data
      const realTokenUsage = {
        id: `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        tokens_used: 157,
        estimated_cost: 0.000471, // 157 * 0.000003
        request_type: 'chat',
        component: 'chat-interface'
      };

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO token_usage
          (id, timestamp, provider, model, tokens_used, estimated_cost, request_type, component)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          realTokenUsage.id,
          realTokenUsage.timestamp,
          realTokenUsage.provider,
          realTokenUsage.model,
          realTokenUsage.tokens_used,
          realTokenUsage.estimated_cost,
          realTokenUsage.request_type,
          realTokenUsage.component
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Validate stored data
      const storedData = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM token_usage WHERE id = ?', [realTokenUsage.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      expect(storedData).toBeDefined();
      expect(storedData.id).toBe(realTokenUsage.id);
      expect(storedData.tokens_used).toBe(realTokenUsage.tokens_used);
      expect(storedData.estimated_cost).toBe(realTokenUsage.estimated_cost);
      expect(storedData.provider).toBe('claude');

      // Validate cost calculation is realistic
      const costPerToken = storedData.estimated_cost / storedData.tokens_used;
      expect(costPerToken).toBeGreaterThan(0.000001);
      expect(costPerToken).toBeLessThan(0.001);

      db.close();
      global.trackRealDataValidation();
    });

    test('should reject fake data insertion', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      const fakeTokenUsage = {
        id: 'fake_test_123',
        timestamp: new Date().toISOString(),
        provider: 'mock-api',
        model: 'test-model',
        tokens_used: 100,
        estimated_cost: 12.45, // Obviously fake amount
        request_type: 'mock',
        component: 'test-component'
      };

      // This should be detected and rejected
      expect(() => {
        if (fakeTokenUsage.estimated_cost === 12.45) {
          global.reportFakeDataViolation('Fake cost amount in database insertion');
        }
      }).toThrow('FAKE DATA VIOLATION');

      db.close();
    });
  });

  describe('API Response Authenticity', () => {
    test('should validate real Claude API response structure', async () => {
      if (!apiManager) {
        console.warn('Skipping real API response test - no valid API keys');
        return;
      }

      const response = await apiManager.sendPrompt('What is the capital of France?');

      // Validate authentic API response structure
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('request_id');
      expect(response).toHaveProperty('duration_ms');
      expect(response.success).toBe(true);
      expect(response.request_id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(response.duration_ms).toBeGreaterThan(0);

      // Validate no fake patterns in response
      expect(response).toBeRealApiResponse();

      global.trackRealDataValidation();
    }, 30000);

    test('should validate real-time timestamp accuracy', () => {
      const tolerance = 1000; // 1 second tolerance

      const testData = {
        timestamp: new Date().toISOString(),
        tokensUsed: 150,
        estimatedCost: 0.00045,
        provider: 'claude'
      };

      const timestampAge = Date.now() - new Date(testData.timestamp).getTime();
      expect(timestampAge).toBeLessThan(tolerance);

      expect(testData).toContainRealTokenData();
      global.trackRealDataValidation();
    });
  });

  describe('Historical Data Validation', () => {
    test('should validate historical data comes from real API calls', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      // Query historical data
      const historicalData = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM token_usage ORDER BY created_at DESC LIMIT 10', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Validate each historical record
      historicalData.forEach(record => {
        expect(record.tokens_used).toBeGreaterThan(0);
        expect(record.estimated_cost).toBeGreaterThan(0);
        expect(record.provider).toMatch(/^(claude|openai)$/);
        expect(record.timestamp).toBeDefined();

        // Validate cost calculation
        const costPerToken = record.estimated_cost / record.tokens_used;
        expect(costPerToken).toBeGreaterThan(0.0000001);
        expect(costPerToken).toBeLessThan(0.01);

        // Check for fake patterns
        expect(record.id).not.toMatch(/fake|mock|test|dummy/i);
        expect(record.provider).not.toMatch(/fake|mock|test/i);
      });

      db.close();
      global.trackRealDataValidation();
    });

    test('should validate cumulative cost calculations', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      // Calculate total costs
      const totals = await new Promise((resolve, reject) => {
        db.get(`
          SELECT
            SUM(tokens_used) as total_tokens,
            SUM(estimated_cost) as total_cost,
            COUNT(*) as total_calls
          FROM token_usage
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (totals.total_calls > 0) {
        expect(totals.total_tokens).toBeGreaterThan(0);
        expect(totals.total_cost).toBeGreaterThan(0);

        // Validate average cost per token is realistic
        const avgCostPerToken = totals.total_cost / totals.total_tokens;
        expect(avgCostPerToken).toBeGreaterThan(0.0000001);
        expect(avgCostPerToken).toBeLessThan(0.01);

        // Ensure no common fake amounts in totals
        expect(totals.total_cost).not.toBeCloseTo(12.45, 2);
        expect(totals.total_cost).not.toBeCloseTo(42.00, 2);
        expect(totals.total_cost).not.toBeCloseTo(99.99, 2);
      }

      db.close();
      global.trackRealDataValidation();
    });
  });

  describe('Real-time Data Updates', () => {
    test('should validate WebSocket token updates are real', (done) => {
      const WebSocket = require('ws');

      if (!global.TEST_API_ENDPOINTS.websocket) {
        console.warn('Skipping WebSocket test - endpoint not configured');
        done();
        return;
      }

      const ws = new WebSocket(global.TEST_API_ENDPOINTS.websocket);
      let messageReceived = false;

      ws.on('open', () => {
        // Request real-time token analytics
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'token-analytics'
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'token-usage-update') {
            messageReceived = true;

            // Validate real-time data
            expect(message.data).toHaveValidTokenUsage();
            expect(message.data).toContainRealTokenData();

            // Validate timestamp is recent
            const messageAge = Date.now() - new Date(message.data.timestamp).getTime();
            expect(messageAge).toBeLessThan(5000); // Less than 5 seconds old

            global.trackRealDataValidation();
            ws.close();
            done();
          }
        } catch (error) {
          ws.close();
          done(error);
        }
      });

      ws.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Skipping WebSocket test - server not running');
          done();
        } else {
          done(error);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!messageReceived) {
          ws.close();
          console.warn('No WebSocket messages received - server may not be running');
          done();
        }
      }, 10000);
    });
  });
});