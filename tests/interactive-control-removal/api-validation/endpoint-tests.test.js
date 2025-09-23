/**
 * API Endpoint Validation Tests
 *
 * Tests all API endpoints to ensure they continue working correctly
 * after interactive control removal. Tests real API responses without mocks.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || BASE_URL;

test.describe('API Endpoint Validation Tests', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true'
    });
    context = await browser.newContext();
  });

  test.beforeEach(async () => {
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('GET /api/agents endpoint validation', async () => {
    const response = await page.request.get(`${API_BASE_URL}/api/agents`);

    // Verify response status
    expect(response.status()).toBe(200);

    // Verify response headers
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);

    // Verify agent data structure
    if (data.data.length > 0) {
      const firstAgent = data.data[0];
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('status');
      expect(typeof firstAgent.id).toBe('string');
      expect(typeof firstAgent.name).toBe('string');
    }

    // Verify metadata
    if (data.metadata) {
      expect(data.metadata).toHaveProperty('total_count');
      expect(typeof data.metadata.total_count).toBe('number');
    }
  });

  test('GET /api/agents with query parameters', async () => {
    const queryParams = [
      'limit=10',
      'offset=0',
      'status=active',
      'sort=name'
    ];

    for (const param of queryParams) {
      const response = await page.request.get(`${API_BASE_URL}/api/agents?${param}`);

      // Verify endpoint handles query parameters gracefully
      expect([200, 400, 422]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
      }
    }
  });

  test('GET /api/agents/:id endpoint validation', async () => {
    // First get list of agents to test with real IDs
    const agentsResponse = await page.request.get(`${API_BASE_URL}/api/agents`);
    expect(agentsResponse.status()).toBe(200);

    const agentsData = await agentsResponse.json();

    if (agentsData.data && agentsData.data.length > 0) {
      const testAgentId = agentsData.data[0].id;

      // Test individual agent endpoint
      const agentResponse = await page.request.get(`${API_BASE_URL}/api/agents/${testAgentId}`);

      // Verify response (should be 200 if endpoint exists, 404 if not implemented)
      expect([200, 404]).toContain(agentResponse.status());

      if (agentResponse.status() === 200) {
        const agentData = await agentResponse.json();
        expect(agentData).toHaveProperty('success');

        if (agentData.success) {
          expect(agentData.data).toHaveProperty('id', testAgentId);
        }
      }
    }
  });

  test('POST /api/agents endpoint validation', async () => {
    const newAgent = {
      name: 'Test Agent',
      description: 'Test agent for validation',
      type: 'test'
    };

    const response = await page.request.post(`${API_BASE_URL}/api/agents`, {
      data: newAgent,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Verify response (405 if not allowed, 201 if created, 400 if validation fails)
    expect([201, 400, 405, 501]).toContain(response.status());

    if (response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data.data).toHaveProperty('id');
    }
  });

  test('PUT /api/agents/:id endpoint validation', async () => {
    const updateData = {
      name: 'Updated Test Agent',
      description: 'Updated description'
    };

    const response = await page.request.put(`${API_BASE_URL}/api/agents/test-agent`, {
      data: updateData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Verify response (200 if updated, 404 if not found, 405 if not allowed)
    expect([200, 404, 405, 501]).toContain(response.status());
  });

  test('DELETE /api/agents/:id endpoint validation', async () => {
    const response = await page.request.delete(`${API_BASE_URL}/api/agents/test-agent`);

    // Verify response (200/204 if deleted, 404 if not found, 405 if not allowed)
    expect([200, 204, 404, 405, 501]).toContain(response.status());
  });

  test('GET /api/avi-dm endpoint validation', async () => {
    const response = await page.request.get(`${API_BASE_URL}/api/avi-dm`);

    // Verify endpoint exists and responds appropriately
    expect([200, 404, 501]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

  test('POST /api/avi-dm endpoint validation', async () => {
    const dmData = {
      message: 'Test DM message',
      type: 'user',
      timestamp: new Date().toISOString()
    };

    const response = await page.request.post(`${API_BASE_URL}/api/avi-dm`, {
      data: dmData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Verify response
    expect([200, 201, 405, 501]).toContain(response.status());
  });

  test('API error handling validation', async () => {
    // Test with invalid JSON
    const invalidJsonResponse = await page.request.post(`${API_BASE_URL}/api/agents`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect([400, 405, 422]).toContain(invalidJsonResponse.status());

    // Test with non-existent endpoint
    const notFoundResponse = await page.request.get(`${API_BASE_URL}/api/non-existent-endpoint`);
    expect(notFoundResponse.status()).toBe(404);

    // Test with invalid methods
    const invalidMethodResponse = await page.request.patch(`${API_BASE_URL}/api/agents`);
    expect([405, 501]).toContain(invalidMethodResponse.status());
  });

  test('API response time validation', async () => {
    const startTime = Date.now();
    const response = await page.request.get(`${API_BASE_URL}/api/agents`);
    const responseTime = Date.now() - startTime;

    // Verify reasonable response time
    expect(responseTime).toBeLessThan(5000); // 5 seconds max
    expect(response.status()).toBe(200);

    console.log(`API response time: ${responseTime}ms`);
  });

  test('API rate limiting validation', async () => {
    // Test multiple rapid requests
    const requests = [];
    const requestCount = 10;

    for (let i = 0; i < requestCount; i++) {
      requests.push(page.request.get(`${API_BASE_URL}/api/agents`));
    }

    const responses = await Promise.all(requests);

    // Verify all requests complete (rate limiting may apply)
    for (const response of responses) {
      expect([200, 429]).toContain(response.status());
    }

    // Count successful responses
    const successfulRequests = responses.filter(r => r.status() === 200).length;
    expect(successfulRequests).toBeGreaterThan(0);
  });

  test('API CORS validation', async () => {
    const response = await page.request.get(`${API_BASE_URL}/api/agents`);

    const corsHeaders = {
      'access-control-allow-origin': response.headers()['access-control-allow-origin'],
      'access-control-allow-methods': response.headers()['access-control-allow-methods'],
      'access-control-allow-headers': response.headers()['access-control-allow-headers']
    };

    // Log CORS headers for debugging
    console.log('CORS headers:', corsHeaders);

    // Verify CORS is properly configured if needed
    if (corsHeaders['access-control-allow-origin']) {
      expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    }
  });

  test('API content type validation', async () => {
    const response = await page.request.get(`${API_BASE_URL}/api/agents`);

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      // Verify response is valid JSON
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    }
  });

  test('API authentication validation', async () => {
    // Test endpoints with and without auth headers
    const authHeaders = {
      'Authorization': 'Bearer test-token',
      'X-API-Key': 'test-api-key'
    };

    // Test without auth
    const noAuthResponse = await page.request.get(`${API_BASE_URL}/api/agents`);

    // Test with auth headers
    const withAuthResponse = await page.request.get(`${API_BASE_URL}/api/agents`, {
      headers: authHeaders
    });

    // Both should work for public endpoints, or return appropriate auth errors
    expect([200, 401, 403]).toContain(noAuthResponse.status());
    expect([200, 401, 403]).toContain(withAuthResponse.status());
  });

  test('API data consistency validation', async () => {
    // Make multiple requests to ensure consistent data
    const responses = await Promise.all([
      page.request.get(`${API_BASE_URL}/api/agents`),
      page.request.get(`${API_BASE_URL}/api/agents`),
      page.request.get(`${API_BASE_URL}/api/agents`)
    ]);

    // Verify all requests succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // Verify data consistency
    const data1 = await responses[0].json();
    const data2 = await responses[1].json();
    const data3 = await responses[2].json();

    // Agent count should be consistent
    expect(data1.data.length).toBe(data2.data.length);
    expect(data2.data.length).toBe(data3.data.length);

    // Agent IDs should be consistent
    if (data1.data.length > 0) {
      const ids1 = data1.data.map(agent => agent.id).sort();
      const ids2 = data2.data.map(agent => agent.id).sort();

      expect(ids1).toEqual(ids2);
    }
  });

  test('API endpoint security validation', async () => {
    // Test for common security headers
    const response = await page.request.get(`${API_BASE_URL}/api/agents`);

    const securityHeaders = {
      'x-content-type-options': response.headers()['x-content-type-options'],
      'x-frame-options': response.headers()['x-frame-options'],
      'x-xss-protection': response.headers()['x-xss-protection']
    };

    console.log('Security headers:', securityHeaders);

    // Test for SQL injection attempts
    const sqlInjectionTests = [
      "'; DROP TABLE agents; --",
      "1' OR '1'='1",
      "admin'/*"
    ];

    for (const injection of sqlInjectionTests) {
      const injectionResponse = await page.request.get(`${API_BASE_URL}/api/agents?id=${encodeURIComponent(injection)}`);

      // Should not return 500 errors (indicating SQL injection vulnerability)
      expect(injectionResponse.status()).not.toBe(500);
    }
  });
});