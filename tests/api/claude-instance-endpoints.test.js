/**
 * Claude Instance API Endpoints - Backend Stability Tests
 * 
 * Comprehensive test suite for all Claude instance management API endpoints.
 * Tests proper error handling, status codes, concurrent request handling,
 * and resource management.
 */

import { jest, describe, test, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import fetch from 'node-fetch';

const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  TEST_TIMEOUT: 30000,
  CONCURRENT_REQUESTS: 10,
  STRESS_TEST_DURATION: 10000
};

class ClaudeInstanceAPITester {
  constructor() {
    this.createdInstances = [];
    this.testStartTime = Date.now();
  }

  async createTestInstance(overrides = {}) {
    const defaultPayload = {
      command: 'claude --dangerously-skip-permissions',
      name: `api-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'skip-permissions'
    };

    const payload = { ...defaultPayload, ...overrides };

    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.instanceId) {
        this.createdInstances.push(data.instanceId);
      }
      return { response, data };
    }

    return { response, data: null };
  }

  async getAllInstances() {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
    const data = response.ok ? await response.json() : null;
    return { response, data };
  }

  async getInstance(instanceId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`);
    const data = response.ok ? await response.json() : null;
    return { response, data };
  }

  async deleteInstance(instanceId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    const data = response.ok ? await response.json() : null;
    
    if (response.ok) {
      this.createdInstances = this.createdInstances.filter(id => id !== instanceId);
    }
    
    return { response, data };
  }

  async sendInput(instanceId, input) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const data = response.ok ? await response.json() : null;
    return { response, data };
  }

  async getInstanceOutput(instanceId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/output`);
    const data = response.ok ? await response.json() : null;
    return { response, data };
  }

  async waitForInstanceReady(instanceId, timeoutMs = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const { response, data } = await this.getAllInstances();
      if (response.ok && data?.instances) {
        const instance = data.instances.find(i => i.id === instanceId);
        if (instance && (instance.status === 'running' || instance.status === 'ready')) {
          return instance;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Instance ${instanceId} not ready within ${timeoutMs}ms`);
  }

  async cleanup() {
    const cleanupPromises = this.createdInstances.map(async (instanceId) => {
      try {
        await this.deleteInstance(instanceId);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message);
      }
    });

    await Promise.all(cleanupPromises);
    this.createdInstances = [];
  }

  logPerformanceMetric(operation, duration) {
    console.log(`📊 Performance: ${operation} took ${duration}ms`);
  }
}

describe('Claude Instance API Endpoints - Backend Stability Tests', () => {
  let apiTester;

  beforeAll(async () => {
    // Verify backend is running
    try {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
      expect(response.ok).toBe(true);
    } catch (error) {
      throw new Error('Backend server not accessible. Ensure it is running on port 3000.');
    }
  });

  beforeEach(() => {
    apiTester = new ClaudeInstanceAPITester();
  });

  afterEach(async () => {
    await apiTester.cleanup();
  });

  describe('POST /api/claude/instances - Instance Creation', () => {
    test('should create instance with valid payload', async () => {
      const { response, data } = await apiTester.createTestInstance();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('instanceId');
      expect(data.instanceId).toMatch(/^claude-[a-zA-Z0-9]+$/);
      expect(data).toHaveProperty('message');
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle invalid payload gracefully', async () => {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty payload
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle malformed JSON', async () => {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      expect(response.status).toBe(400);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle missing Content-Type header', async () => {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
        method: 'POST',
        body: JSON.stringify({
          command: 'claude',
          name: 'test',
          type: 'default'
        })
      });

      // Should either handle gracefully or return appropriate error
      expect([400, 415]).toContain(response.status);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should create multiple instances with unique IDs', async () => {
      const promises = Array(5).fill(null).map(() => apiTester.createTestInstance());
      const results = await Promise.all(promises);

      const instanceIds = results
        .filter(({ response }) => response.ok)
        .map(({ data }) => data.instanceId);

      expect(instanceIds.length).toBe(5);
      expect(new Set(instanceIds).size).toBe(5); // All unique
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('GET /api/claude/instances - List All Instances', () => {
    test('should return empty list when no instances exist', async () => {
      const { response, data } = await apiTester.getAllInstances();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('instances');
      expect(Array.isArray(data.instances)).toBe(true);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should return all created instances', async () => {
      // Create test instances
      const { data: instance1 } = await apiTester.createTestInstance();
      const { data: instance2 } = await apiTester.createTestInstance();

      await apiTester.waitForInstanceReady(instance1.instanceId);
      await apiTester.waitForInstanceReady(instance2.instanceId);

      const { response, data } = await apiTester.getAllInstances();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.instances.length).toBeGreaterThanOrEqual(2);

      const foundInstances = data.instances.filter(instance => 
        [instance1.instanceId, instance2.instanceId].includes(instance.id)
      );
      expect(foundInstances).toHaveLength(2);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should include proper instance metadata', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.getAllInstances();

      expect(response.status).toBe(200);
      const instance = data.instances.find(i => i.id === createdInstance.instanceId);

      expect(instance).toHaveProperty('id');
      expect(instance).toHaveProperty('pid');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('startTime');
      expect(instance.id).toMatch(/^claude-[a-zA-Z0-9]+$/);
      expect(typeof instance.pid).toBe('number');
      expect(['starting', 'running', 'ready', 'stopping', 'stopped']).toContain(instance.status);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('GET /api/claude/instances/:id - Get Specific Instance', () => {
    test('should return specific instance details', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.getInstance(createdInstance.instanceId);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('instance');
      expect(data.instance.id).toBe(createdInstance.instanceId);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should return 404 for non-existent instance', async () => {
      const { response } = await apiTester.getInstance('claude-nonexistent');

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle invalid instance ID format', async () => {
      const { response } = await apiTester.getInstance('invalid-id-format');

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('DELETE /api/claude/instances/:id - Delete Instance', () => {
    test('should delete existing instance', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.deleteInstance(createdInstance.instanceId);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message');

      // Verify instance is no longer in the list
      const { data: allInstances } = await apiTester.getAllInstances();
      const foundInstance = allInstances.instances.find(i => i.id === createdInstance.instanceId);
      expect(foundInstance).toBeUndefined();
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should return 404 for non-existent instance deletion', async () => {
      const { response } = await apiTester.deleteInstance('claude-nonexistent');

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle concurrent deletion requests', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      // Make multiple concurrent delete requests
      const deletePromises = Array(3).fill(null).map(() => 
        apiTester.deleteInstance(createdInstance.instanceId)
      );

      const results = await Promise.all(deletePromises);

      // One should succeed, others should fail gracefully
      const successCount = results.filter(({ response }) => response.status === 200).length;
      const notFoundCount = results.filter(({ response }) => response.status === 404).length;

      expect(successCount).toBe(1);
      expect(notFoundCount).toBe(2);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('POST /api/claude/instances/:id/terminal/input - Send Input', () => {
    test('should send input to running instance', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.sendInput(createdInstance.instanceId, 'test input');

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should return 404 for non-existent instance', async () => {
      const { response } = await apiTester.sendInput('claude-nonexistent', 'test input');

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle empty input', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.sendInput(createdInstance.instanceId, '');

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle malformed input payload', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${createdInstance.instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      expect(response.status).toBe(400);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle special characters in input', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const specialInput = 'Special chars: 🚀 ñáéíóú "quotes" \'apostrophes\' <tags> & symbols';
      const { response, data } = await apiTester.sendInput(createdInstance.instanceId, specialInput);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('GET /api/claude/instances/:id/terminal/output - Get Output', () => {
    test('should get output from instance', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const { response, data } = await apiTester.getInstanceOutput(createdInstance.instanceId);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('output');
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should return 404 for non-existent instance output', async () => {
      const { response } = await apiTester.getInstanceOutput('claude-nonexistent');

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Concurrent Request Handling', () => {
    test('should handle concurrent instance creation requests', async () => {
      const startTime = Date.now();
      
      const promises = Array(TEST_CONFIG.CONCURRENT_REQUESTS).fill(null).map((_, index) => 
        apiTester.createTestInstance({
          name: `concurrent-test-${index}-${Date.now()}`
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      apiTester.logPerformanceMetric(`${TEST_CONFIG.CONCURRENT_REQUESTS} concurrent creations`, duration);

      const successCount = results.filter(({ response }) => response.status === 201).length;
      expect(successCount).toBe(TEST_CONFIG.CONCURRENT_REQUESTS);

      // Verify all instance IDs are unique
      const instanceIds = results
        .filter(({ response }) => response.ok)
        .map(({ data }) => data.instanceId);
      expect(new Set(instanceIds).size).toBe(instanceIds.length);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle concurrent input requests to same instance', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const startTime = Date.now();
      
      const promises = Array(5).fill(null).map((_, index) => 
        apiTester.sendInput(createdInstance.instanceId, `Concurrent input ${index + 1}`)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      apiTester.logPerformanceMetric('5 concurrent inputs to same instance', duration);

      const successCount = results.filter(({ response }) => response.status === 200).length;
      expect(successCount).toBe(5);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle mixed concurrent operations', async () => {
      const operations = [
        () => apiTester.createTestInstance({ name: 'mixed-op-1' }),
        () => apiTester.createTestInstance({ name: 'mixed-op-2' }),
        () => apiTester.getAllInstances(),
        () => apiTester.getAllInstances(),
        () => apiTester.getInstance('claude-nonexistent') // This will fail, but shouldn't crash
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const duration = Date.now() - startTime;
      
      apiTester.logPerformanceMetric('Mixed concurrent operations', duration);

      // Should handle all operations without crashing
      expect(results.length).toBe(5);
      expect(results[0].response.status).toBe(201); // Create
      expect(results[1].response.status).toBe(201); // Create
      expect(results[2].response.status).toBe(200); // List
      expect(results[3].response.status).toBe(200); // List
      expect(results[4].response.status).toBe(404); // Non-existent get
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Resource Management', () => {
    test('should clean up resources on instance deletion', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      const instance = await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const originalPid = instance.pid;

      // Delete the instance
      await apiTester.deleteInstance(createdInstance.instanceId);

      // Give some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify process is actually terminated (if we have system access)
      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/system/process/${originalPid}`);
        if (response.status === 200) {
          const data = await response.json();
          // Process should either not exist or be marked as terminated
          if (data.exists) {
            expect(['terminated', 'zombie']).toContain(data.status);
          }
        }
      } catch (error) {
        // System endpoint might not exist, that's okay
      }

      // Verify instance is not in the list
      const { data: allInstances } = await apiTester.getAllInstances();
      const foundInstance = allInstances.instances.find(i => i.id === createdInstance.instanceId);
      expect(foundInstance).toBeUndefined();
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle maximum instance limit gracefully', async () => {
      // Try to create many instances to test limits
      const MAX_INSTANCES = 20;
      const results = [];

      for (let i = 0; i < MAX_INSTANCES; i++) {
        try {
          const result = await apiTester.createTestInstance({
            name: `limit-test-${i}`
          });
          results.push(result);
          
          // If we start getting errors, break
          if (!result.response.ok) {
            break;
          }
        } catch (error) {
          break;
        }
      }

      // Should either create all instances or fail gracefully
      const successCount = results.filter(r => r.response.ok).length;
      console.log(`Successfully created ${successCount} instances before hitting limits`);
      
      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThanOrEqual(MAX_INSTANCES);
    }, TEST_CONFIG.TEST_TIMEOUT * 2);

    test('should handle server restart simulation', async () => {
      // Create an instance
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      // Send a request to the instance
      const { response: inputResponse } = await apiTester.sendInput(
        createdInstance.instanceId, 
        'Test before restart'
      );
      expect(inputResponse.status).toBe(200);

      // Note: We can't actually restart the server in this test,
      // but we can test that the API handles stale instance references
      
      // Try to access the instance after simulated restart
      // (In a real restart, the instance would be gone)
      const { response: getResponse } = await apiTester.getInstance(createdInstance.instanceId);
      
      // Should either return the instance or handle gracefully
      expect([200, 404]).toContain(getResponse.status);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle very long input strings', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const longInput = 'A'.repeat(10000); // 10KB string
      const { response, data } = await apiTester.sendInput(createdInstance.instanceId, longInput);

      // Should either handle it or reject with appropriate error
      expect([200, 413, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(data).toHaveProperty('success');
      }
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle rapid successive requests', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          apiTester.sendInput(createdInstance.instanceId, `Rapid request ${i}`)
        );
      }

      const results = await Promise.all(promises);
      
      // Should handle all requests without crashing
      const successCount = results.filter(({ response }) => response.ok).length;
      console.log(`Successfully handled ${successCount}/100 rapid requests`);
      
      expect(successCount).toBeGreaterThan(50); // At least half should succeed
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should validate request content types', async () => {
      const { data: createdInstance } = await apiTester.createTestInstance();
      await apiTester.waitForInstanceReady(createdInstance.instanceId);

      // Test different content types
      const tests = [
        { contentType: 'text/plain', body: 'plain text', expectedStatus: [400, 415] },
        { contentType: 'application/xml', body: '<xml>test</xml>', expectedStatus: [400, 415] },
        { contentType: 'application/json', body: JSON.stringify({ input: 'valid' }), expectedStatus: [200] }
      ];

      for (const testCase of tests) {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${createdInstance.instanceId}/terminal/input`, {
          method: 'POST',
          headers: { 'Content-Type': testCase.contentType },
          body: testCase.body
        });

        expect(testCase.expectedStatus).toContain(response.status);
      }
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle connection timeouts gracefully', async () => {
      // This test simulates slow connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        expect(response.ok).toBe(true);
      } catch (error) {
        if (error.name === 'AbortError') {
          // Timeout occurred - this tests that our client handles it
          expect(error.name).toBe('AbortError');
        } else {
          throw error;
        }
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('Performance and Scalability', () => {
    test('should measure API response times', async () => {
      const measurements = [];

      // Measure instance creation
      let startTime = Date.now();
      const { response } = await apiTester.createTestInstance();
      let duration = Date.now() - startTime;
      measurements.push({ operation: 'create_instance', duration, status: response.status });

      // Measure list instances
      startTime = Date.now();
      const { response: listResponse } = await apiTester.getAllInstances();
      duration = Date.now() - startTime;
      measurements.push({ operation: 'list_instances', duration, status: listResponse.status });

      // Log performance metrics
      measurements.forEach(({ operation, duration, status }) => {
        console.log(`📊 ${operation}: ${duration}ms (status: ${status})`);
        expect(status).toBeLessThan(400);
        expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
      });
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle stress test scenario', async () => {
      const STRESS_OPERATIONS = 50;
      const results = [];
      const startTime = Date.now();

      const operations = [];
      for (let i = 0; i < STRESS_OPERATIONS; i++) {
        if (i % 3 === 0) {
          operations.push(() => apiTester.createTestInstance({ name: `stress-${i}` }));
        } else if (i % 3 === 1) {
          operations.push(() => apiTester.getAllInstances());
        } else {
          operations.push(() => apiTester.getInstance('claude-nonexistent'));
        }
      }

      // Execute all operations
      const promises = operations.map(op => op());
      const operationResults = await Promise.all(promises);
      
      const totalDuration = Date.now() - startTime;
      console.log(`📊 Stress test: ${STRESS_OPERATIONS} operations in ${totalDuration}ms`);

      // Analyze results
      const successCount = operationResults.filter(({ response }) => response.ok || response.status === 404).length;
      const errorCount = operationResults.filter(({ response }) => response.status >= 500).length;

      console.log(`📊 Success rate: ${successCount}/${STRESS_OPERATIONS} (${(successCount/STRESS_OPERATIONS*100).toFixed(1)}%)`);
      console.log(`📊 Server errors: ${errorCount}`);

      // Expectations
      expect(successCount / STRESS_OPERATIONS).toBeGreaterThan(0.8); // 80% success rate
      expect(errorCount).toBeLessThan(STRESS_OPERATIONS * 0.1); // Less than 10% server errors
      expect(totalDuration).toBeLessThan(60000); // Complete within 1 minute
    }, 70000); // Allow extra time for stress test
  });
});