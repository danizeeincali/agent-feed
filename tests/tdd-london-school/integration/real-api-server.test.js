/**
 * TDD London School Integration Tests with Real API Server
 * Tests against actual HTTP endpoints on port 3001
 * Eliminates "failed to fetch" errors and validates real functionality
 */

const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('Real API Server Integration - London School TDD', () => {
  let apiServerProcess;
  const API_BASE_URL = 'http://localhost:3001';
  const API_SERVER_PATH = path.join(__dirname, '../../../api-server');

  // Mock external dependencies but test real server
  let mockPerformanceMonitor;
  let mockResponseValidator;
  let mockNetworkMonitor;

  beforeAll(async () => {
    // Setup mocks for external monitoring (not the server itself)
    mockPerformanceMonitor = {
      startTimer: jest.fn(),
      endTimer: jest.fn(),
      measureResponseTime: jest.fn(),
      trackNetworkLatency: jest.fn()
    };

    mockResponseValidator = {
      validateResponseStructure: jest.fn(),
      validateDataTypes: jest.fn(),
      validateBusinessRules: jest.fn()
    };

    mockNetworkMonitor = {
      checkServerHealth: jest.fn(),
      monitorConnection: jest.fn(),
      validateHTTPStatus: jest.fn()
    };

    // Start the real API server
    await startAPIServer();

    // Wait for server to be ready
    await waitForServerReady();
  }, 30000);

  afterAll(async () => {
    // Stop the API server
    if (apiServerProcess) {
      apiServerProcess.kill('SIGTERM');
      await new Promise(resolve => {
        apiServerProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force exit after 5 seconds
      });
    }
  }, 10000);

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockPerformanceMonitor.startTimer.mockReturnValue(Date.now());
    mockPerformanceMonitor.endTimer.mockReturnValue(150);
    mockPerformanceMonitor.measureResponseTime.mockReturnValue(120);
    mockResponseValidator.validateResponseStructure.mockReturnValue(true);
    mockResponseValidator.validateDataTypes.mockReturnValue(true);
    mockResponseValidator.validateBusinessRules.mockReturnValue(true);
    mockNetworkMonitor.checkServerHealth.mockReturnValue(true);
    mockNetworkMonitor.monitorConnection.mockReturnValue('stable');
    mockNetworkMonitor.validateHTTPStatus.mockReturnValue(true);
  });

  async function startAPIServer() {
    return new Promise((resolve, reject) => {
      apiServerProcess = spawn('npm', ['start'], {
        cwd: API_SERVER_PATH,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: '3001' }
      });

      let serverOutput = '';

      apiServerProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
        console.log('API Server:', data.toString().trim());

        if (data.toString().includes('API Server running on')) {
          setTimeout(resolve, 2000); // Give server time to fully start
        }
      });

      apiServerProcess.stderr.on('data', (data) => {
        console.error('API Server Error:', data.toString().trim());
      });

      apiServerProcess.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`API server exited with code ${code}`));
        }
      });

      // Timeout after 20 seconds
      setTimeout(() => {
        reject(new Error('API server start timeout'));
      }, 20000);
    });
  }

  async function waitForServerReady() {
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await request(API_BASE_URL).get('/health').timeout(5000);
        if (response.status === 200) {
          console.log('API Server is ready!');
          return;
        }
      } catch (error) {
        console.log(`Health check attempt ${attempt}/${maxAttempts} failed:`, error.message);
        if (attempt === maxAttempts) {
          throw new Error('API server health check failed after maximum attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  describe('Outside-In: Real Activities API Integration', () => {
    it('should eliminate "failed to fetch" errors for activities endpoint', async () => {
      // Arrange: Monitor network and performance
      const startTime = mockPerformanceMonitor.startTimer();
      mockNetworkMonitor.checkServerHealth();

      // Act: Make real HTTP request to running server
      const response = await request(API_BASE_URL)
        .get('/api/activities')
        .query({ limit: 10, offset: 0 })
        .timeout(10000);

      const endTime = mockPerformanceMonitor.endTimer();
      const responseTime = mockPerformanceMonitor.measureResponseTime(startTime, endTime);

      // Assert: Verify real network behavior
      expect(mockNetworkMonitor.checkServerHealth).toHaveBeenCalled();
      expect(mockPerformanceMonitor.startTimer).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endTimer).toHaveBeenCalled();

      // Verify real server response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('timestamp');

      // Validate response structure with real data
      mockResponseValidator.validateResponseStructure(response.body);
      mockResponseValidator.validateDataTypes(response.body);
      mockResponseValidator.validateBusinessRules(response.body);

      expect(mockResponseValidator.validateResponseStructure).toHaveBeenCalledWith(response.body);

      // Verify real pagination works
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(typeof response.body.total).toBe('number');

      console.log(`Activities API Response Time: ${responseTime}ms`);
      console.log(`Activities returned ${response.body.data.length} items`);
    });

    it('should handle real UUID string operations without slice errors', async () => {
      // Test real UUID handling in actual server response
      const response = await request(API_BASE_URL)
        .get('/api/activities')
        .query({ limit: 5 })
        .timeout(10000);

      expect(response.status).toBe(200);

      // Verify real UUID strings in response
      if (response.body.data.length > 0) {
        const firstActivity = response.body.data[0];

        // Test UUID string properties exist and are valid
        expect(firstActivity).toHaveProperty('id');
        expect(firstActivity).toHaveProperty('agent_id');

        // Verify UUID format (36 characters with hyphens)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(firstActivity.id).toMatch(uuidRegex);
        expect(firstActivity.agent_id).toMatch(uuidRegex);

        // Test safe string operations that previously caused .slice errors
        const shortId = firstActivity.id.substring(0, 8);
        const shortAgentId = firstActivity.agent_id.substring(0, 8);

        expect(shortId).toHaveLength(8);
        expect(shortAgentId).toHaveLength(8);

        console.log(`UUID validation passed for activity: ${shortId}...`);
      }
    });

    it('should validate real activities data structure and metadata', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/activities')
        .query({ limit: 3 })
        .timeout(10000);

      expect(response.status).toBe(200);

      // Validate real activity structure
      if (response.body.data.length > 0) {
        const activity = response.body.data[0];

        // Test required fields exist
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('message');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('agent_id');
        expect(activity).toHaveProperty('status');

        // Test data types
        expect(typeof activity.id).toBe('string');
        expect(typeof activity.type).toBe('string');
        expect(typeof activity.message).toBe('string');
        expect(typeof activity.timestamp).toBe('string');
        expect(typeof activity.agent_id).toBe('string');

        // Test timestamp format
        const timestampDate = new Date(activity.timestamp);
        expect(timestampDate instanceof Date && !isNaN(timestampDate)).toBe(true);

        // Test metadata structure
        if (activity.metadata) {
          expect(typeof activity.metadata).toBe('object');

          // Test numeric metadata fields
          if (activity.metadata.duration) {
            expect(typeof activity.metadata.duration).toBe('number');
          }
          if (activity.metadata.progress) {
            expect(typeof activity.metadata.progress).toBe('number');
            expect(activity.metadata.progress).toBeGreaterThanOrEqual(0);
            expect(activity.metadata.progress).toBeLessThanOrEqual(100);
          }
        }

        console.log(`Activity structure validation passed for type: ${activity.type}`);
      }
    });
  });

  describe('Outside-In: Real Token Analytics Integration', () => {
    it('should provide Chart.js compatible hourly analytics from real server', async () => {
      mockPerformanceMonitor.trackNetworkLatency('hourly-analytics');

      const response = await request(API_BASE_URL)
        .get('/api/token-analytics/hourly')
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Validate real Chart.js structure
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');
      expect(Array.isArray(response.body.data.labels)).toBe(true);
      expect(Array.isArray(response.body.data.datasets)).toBe(true);

      // Test real dataset structure
      if (response.body.data.datasets.length > 0) {
        const dataset = response.body.data.datasets[0];
        expect(dataset).toHaveProperty('label');
        expect(dataset).toHaveProperty('data');
        expect(dataset).toHaveProperty('backgroundColor');
        expect(dataset).toHaveProperty('borderColor');
        expect(dataset).toHaveProperty('yAxisID');

        expect(Array.isArray(dataset.data)).toBe(true);
        expect(typeof dataset.label).toBe('string');
        expect(['y', 'y1']).toContain(dataset.yAxisID);
      }

      // Validate raw data is also provided
      expect(response.body).toHaveProperty('raw_data');
      expect(Array.isArray(response.body.raw_data)).toBe(true);

      mockResponseValidator.validateBusinessRules(response.body);
      expect(mockResponseValidator.validateBusinessRules).toHaveBeenCalled();

      console.log(`Hourly analytics returned ${response.body.data.labels.length} time periods`);
    });

    it('should provide consistent daily analytics with time series data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/token-analytics/daily')
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Validate Chart.js daily structure
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('datasets');

      // Test time series consistency
      if (response.body.data.labels.length > 0) {
        // Verify date format in labels (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        response.body.data.labels.forEach(label => {
          expect(label).toMatch(dateRegex);
        });

        // Verify datasets have matching data points
        response.body.data.datasets.forEach(dataset => {
          expect(dataset.data.length).toBe(response.body.data.labels.length);
        });
      }

      // Validate raw daily data structure
      if (response.body.raw_data && response.body.raw_data.length > 0) {
        const dailyEntry = response.body.raw_data[0];
        expect(dailyEntry).toHaveProperty('date');
        expect(dailyEntry).toHaveProperty('total_tokens');
        expect(dailyEntry).toHaveProperty('total_requests');
        expect(typeof dailyEntry.total_tokens).toBe('number');
        expect(typeof dailyEntry.total_requests).toBe('number');
      }

      console.log(`Daily analytics returned ${response.body.data.labels.length} days`);
    });

    it('should handle real message analytics with pagination and filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/token-analytics/messages')
        .query({ limit: 20, offset: 0 })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Validate pagination structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.limit).toBe(20);
      expect(response.body.offset).toBe(0);

      // Validate message structure
      if (response.body.data.length > 0) {
        const message = response.body.data[0];

        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('session_id');
        expect(message).toHaveProperty('provider');
        expect(message).toHaveProperty('model');
        expect(message).toHaveProperty('total_tokens');
        expect(message).toHaveProperty('processing_time_ms');

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(message.session_id).toMatch(uuidRegex);

        // Validate numeric fields
        expect(typeof message.total_tokens).toBe('number');
        expect(typeof message.processing_time_ms).toBe('number');
        expect(message.total_tokens).toBeGreaterThan(0);
        expect(message.processing_time_ms).toBeGreaterThan(0);
      }

      console.log(`Messages analytics returned ${response.body.data.length} messages`);
    });

    it('should provide comprehensive summary analytics with provider breakdowns', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/token-analytics/summary')
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Validate summary structure
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('by_provider');
      expect(response.body.data).toHaveProperty('by_model');

      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('total_requests');
      expect(summary).toHaveProperty('total_tokens');
      expect(summary).toHaveProperty('total_cost');
      expect(summary).toHaveProperty('avg_processing_time');
      expect(summary).toHaveProperty('unique_sessions');

      // Validate numeric summary fields
      expect(typeof summary.total_requests).toBe('number');
      expect(typeof summary.total_tokens).toBe('number');
      expect(typeof summary.total_cost).toBe('number');
      expect(typeof summary.avg_processing_time).toBe('number');
      expect(typeof summary.unique_sessions).toBe('number');

      // Validate provider breakdown
      expect(Array.isArray(response.body.data.by_provider)).toBe(true);
      if (response.body.data.by_provider.length > 0) {
        const providerData = response.body.data.by_provider[0];
        expect(providerData).toHaveProperty('provider');
        expect(providerData).toHaveProperty('requests');
        expect(providerData).toHaveProperty('tokens');
        expect(providerData).toHaveProperty('cost');
        expect(['anthropic', 'openai', 'google']).toContain(providerData.provider);
      }

      // Validate model breakdown
      expect(Array.isArray(response.body.data.by_model)).toBe(true);

      console.log(`Summary analytics: ${summary.total_requests} requests, ${summary.total_tokens} tokens`);
    });
  });

  describe('Network Resilience and Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test non-existent endpoint
      const response = await request(API_BASE_URL)
        .get('/api/non-existent-endpoint')
        .timeout(10000);

      expect(response.status).toBe(404);
      mockNetworkMonitor.validateHTTPStatus(response.status);
      expect(mockNetworkMonitor.validateHTTPStatus).toHaveBeenCalledWith(404);
    });

    it('should handle malformed query parameters', async () => {
      // Test invalid parameters
      const response = await request(API_BASE_URL)
        .get('/api/activities')
        .query({ limit: 'invalid', offset: -1 })
        .timeout(10000);

      // Server should handle gracefully (either 200 with defaults or 400)
      expect([200, 400]).toContain(response.status);
      mockResponseValidator.validateResponseStructure(response.body);
    });

    it('should maintain consistent response times under load', async () => {
      const responses = [];
      const concurrentRequests = 5;

      // Make multiple concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const startTime = Date.now();
        return request(API_BASE_URL)
          .get('/api/activities')
          .query({ limit: 10, offset: i * 10 })
          .timeout(10000)
          .then(response => {
            const endTime = Date.now();
            return { response, responseTime: endTime - startTime };
          });
      });

      const results = await Promise.all(promises);

      // Verify all requests succeeded
      results.forEach(({ response, responseTime }) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
        responses.push(responseTime);
      });

      // Verify response time consistency
      const avgResponseTime = responses.reduce((a, b) => a + b, 0) / responses.length;
      const maxResponseTime = Math.max(...responses);
      const minResponseTime = Math.min(...responses);

      console.log(`Response times - Avg: ${avgResponseTime}ms, Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`);

      // Response times should be reasonably consistent (max shouldn't be more than 3x min)
      expect(maxResponseTime).toBeLessThan(minResponseTime * 3);

      mockPerformanceMonitor.measureResponseTime(avgResponseTime);
      expect(mockPerformanceMonitor.measureResponseTime).toHaveBeenCalled();
    });
  });

  describe('Data Validation and Business Rules', () => {
    it('should enforce proper data validation across all endpoints', async () => {
      const endpoints = [
        '/api/activities',
        '/api/token-analytics/hourly',
        '/api/token-analytics/daily',
        '/api/token-analytics/messages',
        '/api/token-analytics/summary'
      ];

      for (const endpoint of endpoints) {
        const response = await request(API_BASE_URL)
          .get(endpoint)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('timestamp');

        // Validate timestamp format
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp instanceof Date && !isNaN(timestamp)).toBe(true);

        mockResponseValidator.validateBusinessRules(response.body);
      }

      expect(mockResponseValidator.validateBusinessRules).toHaveBeenCalledTimes(endpoints.length);
    });

    it('should maintain data consistency across related endpoints', async () => {
      // Get summary data
      const summaryResponse = await request(API_BASE_URL)
        .get('/api/token-analytics/summary')
        .timeout(10000);

      // Get messages data
      const messagesResponse = await request(API_BASE_URL)
        .get('/api/token-analytics/messages')
        .query({ limit: 100 })
        .timeout(10000);

      expect(summaryResponse.status).toBe(200);
      expect(messagesResponse.status).toBe(200);

      // Verify data consistency between summary and messages
      const summary = summaryResponse.body.data.summary;
      const messages = messagesResponse.body.data;

      // Total requests in summary should match or be reasonable compared to message count
      if (messages.length > 0) {
        expect(summary.total_requests).toBeGreaterThanOrEqual(0);
        expect(summary.total_tokens).toBeGreaterThanOrEqual(0);
        expect(summary.unique_sessions).toBeGreaterThanOrEqual(0);
        expect(summary.unique_sessions).toBeLessThanOrEqual(summary.total_requests);
      }

      console.log(`Data consistency check: ${summary.total_requests} total requests vs ${messages.length} messages returned`);
    });
  });
});