/**
 * Integration Tests for /api/avi/streaming-chat endpoint
 * Tests the Anthropic SDK integration for Avi DM functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-node';
import fetch from 'node-fetch';
import MockApiServer from '../mock-servers/mock-api-server';
import {
  aviChatTestMessages,
  errorTestCases,
  performanceTestData,
  validationSchemas,
  delay,
  waitForCondition,
  generateLargePayload
} from '../fixtures/test-data';

// Type definitions for responses
interface AviChatResponse {
  success: boolean;
  responses?: Array<{
    content: string;
    role: string;
    timestamp: string;
  }>;
  timestamp: string;
  error?: string;
}

interface HealthResponse {
  success: boolean;
  healthy: boolean;
  status: Record<string, any>;
  timestamp: string;
}

describe('Avi Streaming Chat API Integration Tests', () => {
  let mockServer: MockApiServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Start mock server for isolated testing
    mockServer = new MockApiServer({
      port: 3001,
      cors: true,
      logging: false
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

  describe('POST /api/avi/streaming-chat - Message Processing', () => {
    test('should successfully process simple text message', async () => {
      const testCase = aviChatTestMessages.simple;

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message })
      });

      expect(response.status).toBe(200);

      const data: AviChatResponse = await response.json();

      // Validate response structure
      expect(data.success).toBe(true);
      expect(data.responses).toBeDefined();
      expect(Array.isArray(data.responses)).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);

      // Validate response content
      if (data.responses && data.responses.length > 0) {
        const firstResponse = data.responses[0];
        expect(firstResponse.content).toBeDefined();
        expect(firstResponse.role).toBe('assistant');
        expect(firstResponse.timestamp).toBeDefined();
      }
    });

    test('should handle messages with image content', async () => {
      const testCase = aviChatTestMessages.withImages;

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message })
      });

      expect(response.status).toBe(200);

      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.responses).toBeDefined();
    });

    test('should reject empty message', async () => {
      const testCase = aviChatTestMessages.empty;

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message })
      });

      expect(response.status).toBe(400);

      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message is required');
    });

    test('should reject null message', async () => {
      const testCase = aviChatTestMessages.invalid;

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message })
      });

      expect(response.status).toBe(400);

      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message is required');
    });

    test('should handle very long messages', async () => {
      const testCase = aviChatTestMessages.long;

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message })
      });

      expect(response.status).toBe(200);

      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.responses).toBeDefined();
    });

    test('should process messages with options', async () => {
      const message = "Test message with options";
      const options = {
        temperature: 0.7,
        maxTokens: 1000,
        userId: 'test-user'
      };

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, options })
      });

      expect(response.status).toBe(200);

      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Response Validation and Schema Compliance', () => {
    test('should return valid response schema for successful requests', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Test schema validation" })
      });

      const data: AviChatResponse = await response.json();

      // Required fields
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.timestamp).toBe('string');

      // Conditional fields
      if (data.success) {
        expect(data).toHaveProperty('responses');
        expect(Array.isArray(data.responses)).toBe(true);
      } else {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });

    test('should return proper error response schema', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "" })
      });

      const data: AviChatResponse = await response.json();

      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    test('should include proper timestamps', async () => {
      const beforeRequest = Date.now();

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Timestamp test" })
      });

      const afterRequest = Date.now();
      const data: AviChatResponse = await response.json();

      const responseTime = new Date(data.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(beforeRequest);
      expect(responseTime).toBeLessThanOrEqual(afterRequest + 5000); // Allow 5s tolerance
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"message": "incomplete json"'
      });

      expect(response.status).toBe(400);
    });

    test('should handle missing Content-Type header', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        body: JSON.stringify({ message: "No content type" })
      });

      // Should still process or return appropriate error
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle non-string message types gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 123 })
      });

      expect(response.status).toBe(400);
      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('string');
    });

    test('should simulate server errors correctly', async () => {
      // Override response to simulate server error
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 500,
        data: { success: false, error: 'Simulated server error' }
      });

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "This will error" })
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Performance test" })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(performanceTestData.expectedResponseTime);
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from(
        { length: performanceTestData.concurrentRequests },
        (_, i) => fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Concurrent request ${i}` })
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(performanceTestData.expectedResponseTime * 2);
    });

    test('should handle large payloads', async () => {
      const largeMessage = generateLargePayload(10); // 10KB

      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: largeMessage })
      });

      expect(response.status).toBe(200);
      const data: AviChatResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('should handle request timeouts', async () => {
      // Override response to simulate slow response
      mockServer.setResponseOverride('POST:/api/avi/streaming-chat', {
        status: 200,
        data: { success: true, responses: [], timestamp: new Date().toISOString() },
        delay: 6000 // 6 second delay
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      try {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Timeout test" }),
          signal: controller.signal
        });

        // Should not reach here due to timeout
        fail('Request should have timed out');
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });

  describe('Health Check and Status Endpoints', () => {
    test('should return healthy status from health endpoint', async () => {
      const response = await fetch(`${baseUrl}/api/avi/health`);

      expect(response.status).toBe(200);

      const data: HealthResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    test('should return system status', async () => {
      const response = await fetch(`${baseUrl}/api/avi/status`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('HTTP Methods and CORS', () => {
    test('should reject non-POST methods for chat endpoint', async () => {
      const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
          method: method as any
        });

        expect([404, 405]).toContain(response.status);
      }
    });

    test('should handle CORS preflight requests', async () => {
      const response = await fetch(`${baseUrl}/api/avi/streaming-chat`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      // Should allow CORS or return appropriate status
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting when enabled', async () => {
      // Create server with rate limiting
      const rateLimitedServer = new MockApiServer({
        port: 3002,
        rateLimiting: true,
        logging: false
      });

      try {
        await rateLimitedServer.start();
        const rateLimitedUrl = rateLimitedServer.getUrl();

        // Make many requests quickly
        const requests = Array.from({ length: 150 }, (_, i) =>
          fetch(`${rateLimitedUrl}/api/avi/streaming-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Rate limit test ${i}` })
          })
        );

        const responses = await Promise.allSettled(requests);

        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(result =>
          result.status === 'fulfilled' &&
          (result.value as any).status === 429
        );

        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      } finally {
        await rateLimitedServer.stop();
      }
    }, 30000);
  });
});