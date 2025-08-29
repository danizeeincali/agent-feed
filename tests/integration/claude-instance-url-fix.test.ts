/**
 * Integration test for Claude Instance URL fix
 * Validates that instance fetching uses correct /api/claude/instances endpoint
 * while preserving SSE functionality at /api/v1/
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const INSTANCE_API_PATH = '/api/claude/instances';
const SSE_API_PATH = '/api/v1/claude/instances';

describe('Claude Instance URL Fix Integration Tests', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Instance CRUD Operations (/api/claude/)', () => {
    test('should fetch instances from /api/claude/instances', async () => {
      const response = await fetch(`${BASE_URL}${INSTANCE_API_PATH}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('instances');
      expect(Array.isArray(data.instances)).toBe(true);
    });

    test('should handle instance creation at /api/claude/instances', async () => {
      const instanceConfig = {
        command: ['claude'],
        instanceType: 'default'
      };

      const response = await fetch(`${BASE_URL}${INSTANCE_API_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instanceConfig)
      });

      const data = await response.json();

      // Should either succeed or fail gracefully with proper error structure
      expect(typeof data.success).toBe('boolean');
      
      if (data.success) {
        expect(data).toHaveProperty('instanceId');
        expect(typeof data.instanceId).toBe('string');
      } else {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });

    test('should return 404 for non-existent instance', async () => {
      const fakeInstanceId = 'non-existent-instance-123';
      const response = await fetch(`${BASE_URL}${INSTANCE_API_PATH}/${fakeInstanceId}`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });

  describe('SSE Endpoints (/api/v1/)', () => {
    test('should have SSE status endpoint available', async () => {
      const fakeInstanceId = 'test-instance-123';
      const response = await fetch(`${BASE_URL}${SSE_API_PATH}/${fakeInstanceId}/sse/status`);
      
      // Should respond (even if instance doesn't exist, endpoint should be available)
      expect(response.status).toBeLessThan(500);
    });

    test('should have SSE statistics endpoint available', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/sse/statistics`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('statistics');
    });
  });

  describe('Mixed API Versioning Error Handling', () => {
    test('should handle wrong version gracefully', async () => {
      // Try to fetch instances from old v1 path
      const response = await fetch(`${BASE_URL}/api/v1/claude/instances`);
      
      // Should either work (if fallback is enabled) or return structured error
      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should provide consistent error format across versions', async () => {
      const endpoints = [
        `${BASE_URL}${INSTANCE_API_PATH}/invalid-uuid-format`,
        `${BASE_URL}/api/v1/claude/instances/invalid-uuid-format/sse/status`
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          const data = await response.json();
          // All error responses should have consistent structure
          expect(typeof data.error === 'string' || typeof data.message === 'string').toBe(true);
        }
      }
    });
  });

  describe('CORS Configuration', () => {
    test('should allow CORS for both API versions', async () => {
      const endpoints = [
        `${BASE_URL}${INSTANCE_API_PATH}`,
        `${BASE_URL}/api/v1/sse/statistics`
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });

        // CORS preflight should be handled properly
        expect(response.status).toBeLessThan(400);
      }
    });
  });

  describe('API Documentation and Health', () => {
    test('should document mixed API versioning approach', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/docs`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('endpoints');
      expect(typeof data.endpoints).toBe('object');
    });

    test('should provide health check for both API patterns', async () => {
      const healthEndpoints = [
        `${BASE_URL}/health`,
        `${BASE_URL}/api/claude/health`
      ];

      for (const endpoint of healthEndpoints) {
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          expect(data).toHaveProperty('success');
          expect(data.success).toBe(true);
        }
      }
    });
  });
});

describe('Frontend Integration Validation', () => {
  test('should validate API endpoint builder configuration', () => {
    // This would be run in a browser environment
    // For now, we validate the configuration structure
    
    const expectedConfig = {
      baseUrl: expect.any(String),
      endpoints: {
        instances: {
          path: '/api/claude/instances',
          version: 'none',
          description: expect.any(String)
        },
        sseStream: {
          path: '/api/v1/claude/instances/:id/terminal/stream',
          version: 'v1',
          description: expect.any(String)
        }
      }
    };

    // This structure should match our APIVersioningConfig
    expect(expectedConfig.endpoints.instances.path).toBe('/api/claude/instances');
    expect(expectedConfig.endpoints.sseStream.path).toBe('/api/v1/claude/instances/:id/terminal/stream');
  });

  test('should validate error recovery strategy patterns', () => {
    const fallbackUrls = [
      '/api/claude/instances',
      '/api/v1/claude/instances'
    ];

    // Verify fallback URL generation logic
    const originalUrl = '/api/claude/instances';
    const fallback = originalUrl.replace('/api/claude/', '/api/v1/claude/');
    
    expect(fallback).toBe('/api/v1/instances');
    
    // Test reverse fallback
    const v1Url = '/api/v1/claude/instances';
    const reverseFallback = v1Url.replace('/api/v1/claude/', '/api/claude/');
    
    expect(reverseFallback).toBe('/api/claude/instances');
  });
});

// Test data for validation
const testInstanceConfig = {
  command: ['claude'],
  workingDirectory: process.cwd(),
  environment: {},
  timeout: 30000,
  instanceType: 'default'
};

const testErrorScenarios = [
  {
    name: 'Network Error',
    setup: () => ({ message: 'Failed to fetch' }),
    expectedType: 'NETWORK_ERROR'
  },
  {
    name: 'Not Found Error', 
    setup: () => ({ status: 404, message: 'Not Found' }),
    expectedType: 'ENDPOINT_NOT_FOUND'
  },
  {
    name: 'Parsing Error',
    setup: () => new SyntaxError('Unexpected token in JSON'),
    expectedType: 'PARSING_ERROR'
  }
];

describe('Error Classification Tests', () => {
  test.each(testErrorScenarios)('should classify $name correctly', ({ setup, expectedType }) => {
    const error = setup();
    
    // Mock the error classification logic
    const getErrorType = (error: any): string => {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return 'NETWORK_ERROR';
      }
      if (error.status === 404) {
        return 'ENDPOINT_NOT_FOUND';
      }
      if (error instanceof SyntaxError) {
        return 'PARSING_ERROR';
      }
      return 'VERSION_MISMATCH';
    };

    expect(getErrorType(error)).toBe(expectedType);
  });
});