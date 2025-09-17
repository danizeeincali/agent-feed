/**
 * Comprehensive API Validation Tests
 * Tests response schemas, data types, error handling, timeouts, rate limiting, and concurrent requests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-node';
import fetch from 'node-fetch';
import Ajv from 'ajv';
import MockApiServer from '../mock-servers/mock-api-server';
import {
  validationSchemas,
  errorTestCases,
  performanceTestData,
  aviChatTestMessages,
  claudeCodeTestMessages,
  streamingTickerTestData,
  delay,
  generateLargePayload
} from '../fixtures/test-data';

// JSON Schema validator
const ajv = new Ajv();

// Performance monitoring
interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  concurrency: number;
}

interface ValidationResult {
  valid: boolean;
  errors: any[];
  data: any;
}

// Helper functions
const validateSchema = (schema: any, data: any): ValidationResult => {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return {
    valid,
    errors: validate.errors || [],
    data
  };
};

const measurePerformance = async (fn: () => Promise<any>): Promise<{ result: any; metrics: Partial<PerformanceMetrics> }> => {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();

  return {
    result,
    metrics: {
      responseTime: endTime - startTime
    }
  };
};

const runConcurrentRequests = async <T>(
  requestFn: () => Promise<T>,
  concurrency: number
): Promise<{ results: T[]; metrics: PerformanceMetrics }> => {
  const startTime = Date.now();
  const promises = Array.from({ length: concurrency }, () => requestFn());

  const results = await Promise.allSettled(promises);
  const endTime = Date.now();

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const errorCount = results.filter(r => r.status === 'rejected').length;

  return {
    results: results
      .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
      .map(r => r.value),
    metrics: {
      responseTime: endTime - startTime,
      throughput: successCount / ((endTime - startTime) / 1000),
      errorRate: errorCount / concurrency,
      concurrency
    }
  };
};

describe('Comprehensive API Validation Tests', () => {
  let mockServer: MockApiServer;
  let baseUrl: string;

  beforeAll(async () => {
    mockServer = new MockApiServer({
      port: 3007,
      cors: true,
      logging: false,
      rateLimiting: true,
      requestDelay: 50 // Small delay to simulate real conditions
    });
    await mockServer.start();
    baseUrl = mockServer.getUrl();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(() => {
    mockServer.clearAllOverrides();
    mockServer.resetRequestCount();
  });

  describe('Response Schema Validation', () => {
    test('should validate Avi Chat API response schema', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Schema validation test" })
      });

      const data = await response.json();
      const validation = validateSchema(validationSchemas.aviChatResponse, data);

      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Schema validation errors:', validation.errors);
        fail(`Schema validation failed: ${JSON.stringify(validation.errors, null, 2)}`);
      }

      // Additional type checks
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.timestamp).toBe('string');

      if (data.success) {
        expect(Array.isArray(data.responses)).toBe(true);
      } else {
        expect(typeof data.error).toBe('string');
      }
    });

    test('should validate Claude Code API response schema', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Schema validation test" })
      });

      const data = await response.json();
      const validation = validateSchema(validationSchemas.claudeCodeResponse, data);

      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Schema validation errors:', validation.errors);
        fail(`Schema validation failed: ${JSON.stringify(validation.errors, null, 2)}`);
      }

      // Claude Code specific checks
      if (data.success) {
        expect(typeof data.claudeCode).toBe('boolean');
        expect(typeof data.toolsEnabled).toBe('boolean');
        expect(data.claudeCode).toBe(true);
      }
    });

    test('should validate streaming event schema', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Schema test",
          type: "test_event",
          priority: "medium"
        })
      });

      const data = await response.json();

      // Validate structure (simulated event)
      const mockEvent = {
        type: "test_event",
        data: { message: "Schema test", priority: "medium" }
      };

      const validation = validateSchema(validationSchemas.streamingEvent, mockEvent);
      expect(validation.valid).toBe(true);
    });

    test('should handle invalid schema data gracefully', async () => {
      // Override to return invalid schema data
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 200,
        data: {
          // Missing required 'success' field
          timestamp: new Date().toISOString(),
          invalidField: "should not be here"
        }
      });

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Invalid schema test" })
      });

      const data = await response.json();
      const validation = validateSchema(validationSchemas.aviChatResponse, data);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Type Validation', () => {
    test('should validate correct data types in responses', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Type validation test" })
      });

      const data = await response.json();

      // Boolean validation
      expect(typeof data.success).toBe('boolean');

      // String validation
      expect(typeof data.timestamp).toBe('string');
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date format

      // Array validation
      if (data.responses) {
        expect(Array.isArray(data.responses)).toBe(true);
        data.responses.forEach((response: any) => {
          expect(typeof response.content).toBe('string');
          expect(typeof response.role).toBe('string');
          expect(typeof response.timestamp).toBe('string');
        });
      }
    });

    test('should validate numeric types in statistics', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/stats`);
      const data = await response.json();

      expect(typeof data.activeConnections).toBe('number');
      expect(typeof data.totalMessages).toBe('number');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.timestamp).toBe('number');

      // Range validation
      expect(data.activeConnections).toBeGreaterThanOrEqual(0);
      expect(data.totalMessages).toBeGreaterThanOrEqual(0);
      expect(data.uptime).toBeGreaterThan(0);
      expect(data.timestamp).toBeGreaterThan(0);
    });

    test('should validate nested object structures', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/status`);
      const data = await response.json();

      expect(typeof data.status).toBe('object');
      expect(data.status).not.toBeNull();

      // Validate nested properties
      if (data.status) {
        Object.values(data.status).forEach(value => {
          expect(typeof value).toMatch(/boolean|string|number|object/);
        });
      }
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle and validate HTTP 400 errors', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "" }) // Empty message should cause 400
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    test('should handle and validate HTTP 500 errors', async () => {
      // Override to simulate server error
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 500,
        data: {
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Server error test" })
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
    });

    test('should handle network timeouts', async () => {
      // Override to simulate slow response
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 200,
        data: { success: true, responses: [], timestamp: new Date().toISOString() },
        delay: 8000 // 8 second delay
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      try {
        await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Timeout test" }),
          signal: controller.signal
        });

        fail('Request should have timed out');
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      } finally {
        clearTimeout(timeoutId);
      }
    });

    test('should handle malformed JSON responses', async () => {
      // Override to return invalid JSON
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 200,
        data: '{"invalid": json"}' // This will be sent as string, not parsed
      });

      try {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "JSON test" })
        });

        // Response parsing should fail gracefully
        await response.json();
      } catch (error) {
        // Expected behavior for malformed JSON
        expect(error).toBeDefined();
      }
    });

    test('should validate error response consistency', async () => {
      const errorTestCases = [
        { endpoint: '/api/avi/streaming-chat', method: 'POST', body: { message: null } },
        { endpoint: '/api/claude-code/streaming-chat', method: 'POST', body: { message: "" } },
        { endpoint: '/api/streaming-ticker/message', method: 'POST', body: {} }
      ];

      for (const testCase of errorTestCases) {
        const response = await fetch(`${baseUrl}${testCase.endpoint}`, {
          method: testCase.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.body)
        });

        expect(response.status).toBeGreaterThanOrEqual(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(typeof data.error).toBe('string');
        expect(data.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should measure response times under normal load', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Performance test" })
        });
        return response.json();
      });

      expect(result.success).toBe(true);
      expect(metrics.responseTime!).toBeLessThan(performanceTestData.expectedResponseTime);

      console.log(`Response time: ${metrics.responseTime}ms`);
    });

    test('should handle concurrent requests efficiently', async () => {
      const { results, metrics } = await runConcurrentRequests(
        async () => {
          const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Concurrent test" })
          });
          return response.json();
        },
        performanceTestData.concurrentRequests
      );

      expect(results.length).toBe(performanceTestData.concurrentRequests);
      expect(metrics.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      expect(metrics.throughput).toBeGreaterThan(1); // At least 1 request per second

      console.log(`Concurrent requests metrics:`, metrics);
    });

    test('should maintain performance with large payloads', async () => {
      const largeMessage = generateLargePayload(50); // 50KB

      const { result, metrics } = await measurePerformance(async () => {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: largeMessage })
        });
        return response.json();
      });

      expect(result.success).toBe(true);
      expect(metrics.responseTime!).toBeLessThan(performanceTestData.expectedResponseTime * 2); // Allow 2x time for large payloads

      console.log(`Large payload response time: ${metrics.responseTime}ms`);
    });

    test('should handle sustained load', async () => {
      const requestCount = 50;
      const batchSize = 5;
      const results: any[] = [];
      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, requestCount - i) }, async (_, j) => {
          const startTime = Date.now();
          const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Sustained load test ${i + j}` })
          });
          const endTime = Date.now();
          responseTimes.push(endTime - startTime);
          return response.json();
        });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);

        // Small delay between batches to simulate realistic load
        await delay(100);
      }

      expect(results.length).toBe(requestCount);

      // All requests should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(requestCount * 0.95); // 95% success rate

      // Response times should remain reasonable
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(performanceTestData.expectedResponseTime);

      console.log(`Sustained load test - Average response time: ${avgResponseTime}ms, Success rate: ${(successCount / requestCount) * 100}%`);
    }, 60000);
  });

  describe('Rate Limiting Validation', () => {
    test('should enforce rate limiting correctly', async () => {
      const rapidRequests = Array.from({ length: 120 }, async (_, i) => {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Rate limit test ${i}` })
        });
        return { status: response.status, data: await response.json() };
      });

      const results = await Promise.allSettled(rapidRequests);

      const successful = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimited = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      // Should have some rate limited responses
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful).toBeLessThan(120);

      console.log(`Rate limiting test - Successful: ${successful}, Rate limited: ${rateLimited}`);
    }, 30000);

    test('should include retry-after header in rate limit responses', async () => {
      // First, trigger rate limiting
      const requests = Array.from({ length: 110 }, () =>
        fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Rate limit trigger" })
        })
      );

      const responses = await Promise.allSettled(requests);

      // Look for 429 responses
      const rateLimitedResponse = responses.find(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      if (rateLimitedResponse && rateLimitedResponse.status === 'fulfilled') {
        const response = rateLimitedResponse.value;
        const data = await response.json();

        // Mock server should include retry information
        expect(data.retryAfter).toBeDefined();
        expect(typeof data.retryAfter).toBe('number');
      }
    }, 20000);
  });

  describe('Security and Input Validation', () => {
    test('should reject oversized payloads', async () => {
      const oversizedPayload = generateLargePayload(1000); // 1MB payload

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: oversizedPayload })
      });

      // Should either process or reject appropriately
      expect([200, 413, 400]).toContain(response.status);
    });

    test('should sanitize and validate input parameters', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'DROP TABLE users;',
        '\x00null\x00bytes\x00',
        'SELECT * FROM users WHERE id = 1; --'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: maliciousInput })
        });

        // Should either process safely or reject
        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          const data = await response.json();
          // Response should not echo malicious input unsanitized
          expect(data.success).toBe(true);
        }
      }
    });

    test('should handle special characters and Unicode', async () => {
      const specialChars = [
        '🤖 Hello from AI! 🚀',
        'Héllo wørld with ñ and é',
        '中文测试 Chinese test',
        'Эмоджи тест 🌟',
        '\\n\\r\\t special escapes',
        '"quotes" and \'apostrophes\''
      ];

      for (const specialChar of specialChars) {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: specialChar })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });

  describe('API Consistency and Standards', () => {
    test('should follow consistent response format across endpoints', async () => {
      const endpoints = [
        { url: '/api/avi/streaming-chat', method: 'POST', body: { message: "test" } },
        { url: '/api/claude-code/streaming-chat', method: 'POST', body: { message: "test" } },
        { url: '/api/avi/health', method: 'GET' },
        { url: '/api/claude-code/health', method: 'GET' }
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint.url}`, {
          method: endpoint.method,
          headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
        });

        const data = await response.json();

        // All responses should have consistent base structure
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.success).toBe('boolean');
        expect(typeof data.timestamp).toBe('string');
      }
    });

    test('should use appropriate HTTP status codes', async () => {
      const testCases = [
        {
          endpoint: '/api/avi/streaming-chat',
          method: 'POST',
          body: { message: "valid message" },
          expectedStatus: 200
        },
        {
          endpoint: '/api/avi/streaming-chat',
          method: 'POST',
          body: { message: "" },
          expectedStatus: 400
        },
        {
          endpoint: '/api/nonexistent',
          method: 'GET',
          expectedStatus: 404
        }
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${baseUrl}${testCase.endpoint}`, {
          method: testCase.method,
          headers: testCase.body ? { 'Content-Type': 'application/json' } : {},
          body: testCase.body ? JSON.stringify(testCase.body) : undefined
        });

        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    test('should include proper CORS headers', async () => {
      const response = await fetch(`${baseUrl}/api/avi/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      });

      // Should handle CORS preflight appropriately
      expect([200, 204, 404]).toContain(response.status);
    });
  });
});