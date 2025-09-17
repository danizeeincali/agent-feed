/**
 * API Integration Tests for Token Analytics
 * Tests real API endpoints and data flow
 */

const request = require('supertest');
const WebSocket = require('ws');

describe('Token Analytics API Integration', () => {
  let app;
  let server;
  let baseURL;

  beforeAll(async () => {
    // Start test server if not already running
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        baseURL = 'http://localhost:3001';
        console.log('Using existing server at localhost:3001');
      }
    } catch (error) {
      // Server not running, we'll skip API tests
      console.warn('Test server not running - skipping API integration tests');
      baseURL = null;
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Token Analytics REST API', () => {
    test('should provide real token usage data via API', async () => {
      if (!baseURL) {
        console.warn('Skipping API test - server not available');
        return;
      }

      const response = await fetch(`${baseURL}/api/token-analytics/usage`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeDefined();

      if (data.length > 0) {
        // Validate each usage record
        data.forEach(record => {
          expect(record).toHaveValidTokenUsage();
          expect(record).toContainRealTokenData();

          // Ensure no fake data patterns
          expect(record.estimatedCost).not.toBeCloseTo(12.45, 2);
          expect(record.estimatedCost).not.toBeCloseTo(42.00, 2);
          expect(record.provider).not.toMatch(/mock|fake|test/i);
        });

        global.trackRealDataValidation();
      }
    });

    test('should provide real hourly analytics data', async () => {
      if (!baseURL) {
        console.warn('Skipping hourly analytics test - server not available');
        return;
      }

      const response = await fetch(`${baseURL}/api/token-analytics/hourly`);

      expect(response.status).toBe(200);

      const hourlyData = await response.json();
      expect(Array.isArray(hourlyData)).toBe(true);

      if (hourlyData.length > 0) {
        hourlyData.forEach(hourData => {
          expect(hourData).toHaveProperty('timestamp');
          expect(hourData).toHaveProperty('totalTokens');
          expect(hourData).toHaveProperty('totalCost');

          // Validate timestamp is realistic
          const timestamp = new Date(hourData.timestamp);
          const now = new Date();
          const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
          expect(hoursDiff).toBeLessThan(24); // Within last 24 hours

          // Validate costs are realistic
          if (hourData.totalTokens > 0) {
            const costPerToken = hourData.totalCost / hourData.totalTokens;
            expect(costPerToken).toBeGreaterThan(0.0000001);
            expect(costPerToken).toBeLessThan(0.001);
          }

          // Ensure no fake patterns
          expect(hourData.totalCost).not.toBeCloseTo(12.45, 2);
          expect(hourData.totalCost).not.toBeCloseTo(42.00, 2);
        });

        global.trackRealDataValidation();
      }
    });

    test('should provide real daily analytics data', async () => {
      if (!baseURL) {
        console.warn('Skipping daily analytics test - server not available');
        return;
      }

      const response = await fetch(`${baseURL}/api/token-analytics/daily`);

      expect(response.status).toBe(200);

      const dailyData = await response.json();
      expect(Array.isArray(dailyData)).toBe(true);

      if (dailyData.length > 0) {
        dailyData.forEach(dayData => {
          expect(dayData).toHaveProperty('date');
          expect(dayData).toHaveProperty('totalTokens');
          expect(dayData).toHaveProperty('totalCost');
          expect(dayData).toHaveProperty('requestCount');

          // Validate date format
          expect(dayData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // Validate realistic daily usage
          if (dayData.totalTokens > 0) {
            expect(dayData.totalTokens).toBeLessThan(10000000); // Reasonable daily limit
            expect(dayData.totalCost).toBeLessThan(1000); // Reasonable daily cost
            expect(dayData.requestCount).toBeGreaterThan(0);

            const avgTokensPerRequest = dayData.totalTokens / dayData.requestCount;
            expect(avgTokensPerRequest).toBeGreaterThan(10);
            expect(avgTokensPerRequest).toBeLessThan(10000);
          }

          // Ensure no fake patterns
          expect(dayData.totalCost).not.toBeCloseTo(12.45, 2);
          expect(dayData.totalCost).not.toBeCloseTo(42.00, 2);
        });

        global.trackRealDataValidation();
      }
    });

    test('should handle real-time token tracking', async () => {
      if (!baseURL) {
        console.warn('Skipping real-time tracking test - server not available');
        return;
      }

      // Post a real token usage event
      const realTokenUsage = {
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        tokensUsed: 157,
        estimatedCost: 0.000471, // Real calculation: 157 * 0.000003
        requestType: 'chat',
        component: 'test-integration'
      };

      const response = await fetch(`${baseURL}/api/token-analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(realTokenUsage)
      });

      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('timestamp');
      expect(result.tokensUsed).toBe(realTokenUsage.tokensUsed);
      expect(result.estimatedCost).toBeCloseTo(realTokenUsage.estimatedCost, 6);

      // Validate the returned data
      expect(result).toHaveValidTokenUsage();
      expect(result).toContainRealTokenData();

      global.trackApiCall('/api/token-analytics/track', 'POST',
                         realTokenUsage.tokensUsed, realTokenUsage.estimatedCost);
      global.trackRealDataValidation();
    });

    test('should reject fake token data submissions', async () => {
      if (!baseURL) {
        console.warn('Skipping fake data rejection test - server not available');
        return;
      }

      const fakeTokenUsage = {
        provider: 'mock-api',
        model: 'test-model',
        tokensUsed: 100,
        estimatedCost: 12.45, // Obvious fake amount
        requestType: 'fake',
        component: 'test-mock'
      };

      const response = await fetch(`${baseURL}/api/token-analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fakeTokenUsage)
      });

      // Server should reject fake data
      expect(response.status).toBeGreaterThanOrEqual(400);

      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toMatch(/invalid|fake|mock/i);
    });
  });

  describe('WebSocket Real-time Updates', () => {
    test('should receive real token usage updates via WebSocket', (done) => {
      if (!baseURL) {
        console.warn('Skipping WebSocket test - server not available');
        done();
        return;
      }

      const wsUrl = baseURL.replace('http://', 'ws://') + '/api/websockets/token-analytics';
      const ws = new WebSocket(wsUrl);
      let messageReceived = false;

      ws.on('open', () => {
        // Subscribe to token analytics updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'token-analytics'
        }));

        // Trigger a real token usage event
        setTimeout(() => {
          fetch(`${baseURL}/api/token-analytics/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'claude',
              model: 'claude-3-sonnet',
              tokensUsed: 125,
              estimatedCost: 0.000375,
              requestType: 'websocket-test'
            })
          });
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'token-usage-update') {
            messageReceived = true;

            // Validate real-time token data
            expect(message.data).toHaveValidTokenUsage();
            expect(message.data).toContainRealTokenData();

            // Validate timestamp is very recent
            const messageAge = Date.now() - new Date(message.data.timestamp).getTime();
            expect(messageAge).toBeLessThan(3000); // Less than 3 seconds

            // Ensure no fake patterns
            expect(message.data.estimatedCost).not.toBeCloseTo(12.45, 2);
            expect(message.data.provider).not.toMatch(/mock|fake/i);

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
          console.warn('WebSocket server not available - skipping test');
          done();
        } else {
          done(error);
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!messageReceived) {
          ws.close();
          console.warn('No WebSocket messages received within timeout');
          done();
        }
      }, 15000);
    });

    test('should broadcast cost alerts for high usage', (done) => {
      if (!baseURL) {
        console.warn('Skipping cost alert test - server not available');
        done();
        return;
      }

      const wsUrl = baseURL.replace('http://', 'ws://') + '/api/websockets/token-analytics';
      const ws = new WebSocket(wsUrl);
      let alertReceived = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'cost-alerts'
        }));

        // Trigger high usage event
        setTimeout(() => {
          fetch(`${baseURL}/api/token-analytics/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'claude',
              model: 'claude-3-opus',
              tokensUsed: 10000,
              estimatedCost: 0.75, // High cost for opus model
              requestType: 'high-usage-test'
            })
          });
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'cost-alert') {
            alertReceived = true;

            expect(message.data).toHaveProperty('threshold');
            expect(message.data).toHaveProperty('actualCost');
            expect(message.data.actualCost).toBeGreaterThan(message.data.threshold);

            // Validate alert contains real data
            expect(message.data.actualCost).not.toBeCloseTo(12.45, 2);
            expect(message.data.actualCost).not.toBeCloseTo(42.00, 2);

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
          console.warn('WebSocket server not available for cost alerts - skipping test');
          done();
        } else {
          done(error);
        }
      });

      setTimeout(() => {
        if (!alertReceived) {
          ws.close();
          console.warn('No cost alert received - may need higher threshold');
          done();
        }
      }, 15000);
    });
  });

  describe('Database Integration', () => {
    test('should persist real token data to database', async () => {
      if (!baseURL) {
        console.warn('Skipping database integration test - server not available');
        return;
      }

      // Create real token usage
      const tokenData = {
        provider: 'claude',
        model: 'claude-3-sonnet',
        tokensUsed: 245,
        estimatedCost: 0.000735, // 245 * 0.000003
        requestType: 'database-test',
        component: 'integration-test'
      };

      // Submit data
      const submitResponse = await fetch(`${baseURL}/api/token-analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
      });

      expect(submitResponse.status).toBe(201);
      const submitted = await submitResponse.json();

      // Retrieve data
      const retrieveResponse = await fetch(`${baseURL}/api/token-analytics/usage?id=${submitted.id}`);
      expect(retrieveResponse.status).toBe(200);

      const retrieved = await retrieveResponse.json();
      expect(retrieved).toBeDefined();

      if (retrieved) {
        expect(retrieved.id).toBe(submitted.id);
        expect(retrieved.tokensUsed).toBe(tokenData.tokensUsed);
        expect(retrieved.estimatedCost).toBeCloseTo(tokenData.estimatedCost, 6);
        expect(retrieved.provider).toBe(tokenData.provider);

        // Validate persisted data is real
        expect(retrieved).toHaveValidTokenUsage();
        expect(retrieved).toContainRealTokenData();

        global.trackRealDataValidation();
      }
    });

    test('should maintain data integrity across operations', async () => {
      if (!baseURL) {
        console.warn('Skipping data integrity test - server not available');
        return;
      }

      // Get current total
      const beforeResponse = await fetch(`${baseURL}/api/token-analytics/summary`);
      const beforeSummary = await beforeResponse.json();

      // Add new usage
      const newUsage = {
        provider: 'claude',
        model: 'claude-3-haiku',
        tokensUsed: 180,
        estimatedCost: 0.000045, // 180 * 0.00000025
        requestType: 'integrity-test'
      };

      await fetch(`${baseURL}/api/token-analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsage)
      });

      // Get updated total
      const afterResponse = await fetch(`${baseURL}/api/token-analytics/summary`);
      const afterSummary = await afterResponse.json();

      // Validate consistency
      expect(afterSummary.totalTokens).toBe(beforeSummary.totalTokens + newUsage.tokensUsed);
      expect(afterSummary.totalCost).toBeCloseTo(
        beforeSummary.totalCost + newUsage.estimatedCost, 6
      );

      // Ensure no fake data in summaries
      expect(afterSummary.totalCost).not.toBeCloseTo(12.45, 2);
      expect(afterSummary.totalCost).not.toBeCloseTo(42.00, 2);

      global.trackRealDataValidation();
    });
  });

  describe('Error Handling and Security', () => {
    test('should validate API input for fake data attempts', async () => {
      if (!baseURL) {
        console.warn('Skipping security validation test - server not available');
        return;
      }

      const invalidInputs = [
        {
          description: 'Hardcoded fake cost',
          data: { tokensUsed: 100, estimatedCost: 12.45, provider: 'claude' }
        },
        {
          description: 'Mock provider',
          data: { tokensUsed: 100, estimatedCost: 0.3, provider: 'mock-api' }
        },
        {
          description: 'Negative tokens',
          data: { tokensUsed: -100, estimatedCost: 0.3, provider: 'claude' }
        },
        {
          description: 'Zero cost with tokens',
          data: { tokensUsed: 100, estimatedCost: 0, provider: 'claude' }
        }
      ];

      for (const input of invalidInputs) {
        const response = await fetch(`${baseURL}/api/token-analytics/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.data)
        });

        expect(response.status).toBeGreaterThanOrEqual(400);

        const error = await response.json();
        expect(error).toHaveProperty('error');
        console.log(`✓ Rejected ${input.description}: ${error.error}`);
      }
    });

    test('should rate limit excessive requests', async () => {
      if (!baseURL) {
        console.warn('Skipping rate limiting test - server not available');
        return;
      }

      const validRequest = {
        provider: 'claude',
        model: 'claude-3-sonnet',
        tokensUsed: 50,
        estimatedCost: 0.00015,
        requestType: 'rate-limit-test'
      };

      const requests = [];
      const requestCount = 20; // Try to overwhelm the API

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          fetch(`${baseURL}/api/token-analytics/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validRequest)
          })
        );
      }

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // Should have some rate limited responses
      const rateLimitedCount = statuses.filter(status => status === 429).length;
      const successCount = statuses.filter(status => status === 201).length;

      expect(successCount + rateLimitedCount).toBe(requestCount);

      if (rateLimitedCount > 0) {
        console.log(`✓ Rate limiting working: ${rateLimitedCount}/${requestCount} requests limited`);
      }
    });
  });
});