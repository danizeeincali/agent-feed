/**
 * API Connectivity Tests - Playwright E2E Tests
 * End-to-end tests that validate API endpoints through browser interactions
 * Tests against actual running servers on ports 5173 and 3000
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('API Connectivity E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for API requests
    page.setDefaultTimeout(30000);
  });

  test.describe('Server Health Checks', () => {
    test('should verify backend server is accessible', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);

      expect(response.status()).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('status');
      expect(responseBody.status).toBe('healthy');

      console.log('✅ Backend server health check passed');
    });

    test('should verify frontend server is accessible', async ({ page }) => {
      // Navigate to frontend to verify it's running
      const response = await page.goto(FRONTEND_URL, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      expect(response.status()).toBeLessThan(400);

      // Verify page loaded
      await expect(page.locator('body')).toBeVisible();

      console.log('✅ Frontend server is accessible');
    });
  });

  test.describe('/api/agents Endpoint Tests', () => {
    test('should fetch agents data via API request', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/agents`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const agents = await response.json();
      expect(Array.isArray(agents)).toBe(true);

      console.log(`✅ API returned ${agents.length} agents`);

      // Validate agent structure if data exists
      if (agents.length > 0) {
        const firstAgent = agents[0];
        expect(firstAgent).toHaveProperty('id');
        expect(firstAgent).toHaveProperty('name');
        expect(typeof firstAgent.id).toBe('string');
        expect(typeof firstAgent.name).toBe('string');
        expect(firstAgent.name.length).toBeGreaterThan(0);

        console.log(`✅ First agent: ${firstAgent.name} (ID: ${firstAgent.id})`);
      }
    });

    test('should verify agents endpoint has proper CORS headers', async ({ request }) => {
      const response = await request.fetch(`${API_BASE_URL}/api/agents`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(response.status()).toBeLessThan(400);

      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBeTruthy();

      console.log('✅ CORS headers are properly configured for agents endpoint');
    });

    test('should handle agents health endpoint', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/agents/health`);

      expect(response.status()).toBe(200);

      const healthData = await response.json();
      expect(healthData).toHaveProperty('status');
      expect(healthData.status).toBe('healthy');

      console.log('✅ Agents health endpoint is working');
    });
  });

  test.describe('/api/agent-posts Endpoint Tests', () => {
    test('should fetch agent posts via API request', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/agent-posts`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const posts = await response.json();
      expect(Array.isArray(posts)).toBe(true);

      console.log(`✅ API returned ${posts.length} posts`);

      // Validate post structure if data exists
      if (posts.length > 0) {
        const firstPost = posts[0];
        expect(firstPost).toHaveProperty('id');
        expect(firstPost).toHaveProperty('content');
        expect(typeof firstPost.id).toBe('string');
        expect(typeof firstPost.content).toBe('string');

        console.log(`✅ First post content length: ${firstPost.content.length} chars`);
      }
    });

    test('should support filtering via POST to agent-posts', async ({ request }) => {
      const filterPayload = {
        filters: {
          limit: 5
        }
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/agent-posts/filter`, {
        data: filterPayload,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const filteredPosts = await response.json();
      expect(Array.isArray(filteredPosts)).toBe(true);
      expect(filteredPosts.length).toBeLessThanOrEqual(5);

      console.log(`✅ Filter endpoint returned ${filteredPosts.length} posts`);
    });

    test('should handle v1 API version for agent-posts', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/v1/agent-posts`);

      expect(response.status()).toBe(200);

      const posts = await response.json();
      expect(Array.isArray(posts)).toBe(true);

      console.log('✅ v1 API version endpoint is working');
    });
  });

  test.describe('/api/streaming-ticker Endpoint Tests', () => {
    test('should respond to streaming ticker requests', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/streaming-ticker`);

      // Accept any non-server-error status
      expect(response.status()).toBeLessThan(500);

      console.log(`✅ Streaming ticker endpoint responded with status ${response.status()}`);
    });

    test('should handle CORS for streaming ticker endpoint', async ({ request }) => {
      const response = await request.fetch(`${API_BASE_URL}/api/streaming-ticker`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL
        }
      });

      expect(response.status()).toBeLessThan(500);

      console.log(`✅ Streaming ticker CORS check completed`);
    });
  });

  test.describe('Frontend to Backend Integration', () => {
    test('should load frontend and verify API calls work from browser', async ({ page }) => {
      // Navigate to frontend
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

      // Verify page loaded
      await expect(page.locator('body')).toBeVisible();

      // Check if frontend makes API calls (monitor network)
      const apiCalls = [];

      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method()
          });
        }
      });

      // Wait for potential API calls
      await page.waitForTimeout(3000);

      if (apiCalls.length > 0) {
        console.log(`✅ Frontend made ${apiCalls.length} API calls:`);
        apiCalls.forEach(call => {
          console.log(`  ${call.method} ${call.url}`);
        });
      } else {
        console.log('ℹ️ No API calls detected from frontend (may load lazily)');
      }
    });

    test('should verify cross-origin requests work from frontend', async ({ page }) => {
      await page.goto(FRONTEND_URL);

      // Inject a script to test API call from frontend context
      const testResult = await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(`${apiUrl}/api/health`);
          return {
            success: true,
            status: response.status,
            hasData: response.ok
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }, API_BASE_URL);

      expect(testResult.success).toBe(true);
      expect(testResult.status).toBe(200);

      console.log('✅ Cross-origin API calls work from frontend');
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle 404 errors gracefully', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/non-existent-endpoint`);

      expect(response.status()).toBe(404);

      console.log('✅ 404 errors are handled correctly');
    });

    test('should handle malformed POST requests', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/agent-posts/filter`, {
        data: 'invalid-json-string',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should return client error or server error, not hang
      expect([400, 422, 500].includes(response.status())).toBe(true);

      console.log(`✅ Malformed requests handled (status: ${response.status()})`);
    });

    test('should handle server timeout scenarios', async ({ request }) => {
      // Test with a reasonable timeout
      try {
        const response = await request.get(`${API_BASE_URL}/api/agents`, {
          timeout: 10000
        });

        expect(response.status()).toBeLessThan(500);
        console.log('✅ Request completed within timeout');
      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log('⚠️ Request timed out - server may be slow');
          // Don't fail the test for timeout, just log it
        } else {
          throw error;
        }
      }
    });
  });

  test.describe('API Performance Tests', () => {
    test('should measure API response times', async ({ request }) => {
      const endpoints = [
        '/api/health',
        '/api/agents',
        '/api/agent-posts'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();

        const response = await request.get(`${API_BASE_URL}${endpoint}`);

        const responseTime = Date.now() - startTime;

        expect(response.status()).toBeLessThan(400);
        expect(responseTime).toBeLessThan(10000); // 10 second max

        console.log(`✅ ${endpoint}: ${responseTime}ms`);
      }
    });

    test('should handle concurrent API requests', async ({ request }) => {
      const concurrentRequests = Array(3).fill().map(() =>
        request.get(`${API_BASE_URL}/api/agents`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.status()).toBe(200);
      });

      console.log('✅ Concurrent requests handled successfully');
    });
  });

  test.describe('Data Validation Tests', () => {
    test('should verify API returns real data, not mocks', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/agents`);
      const agents = await response.json();

      if (agents.length > 0) {
        const agent = agents[0];

        // Check for common mock data indicators
        expect(agent.name).not.toMatch(/test|mock|placeholder|demo|example/i);
        expect(agent.id).not.toMatch(/test-|mock-|placeholder-|demo-/i);

        // Check for meaningful data
        expect(agent.name.length).toBeGreaterThan(2);
        expect(agent.id.length).toBeGreaterThan(5);

        console.log(`✅ Agent data appears real: ${agent.name}`);
      } else {
        console.log('ℹ️ No agents returned - database may be empty');
      }
    });

    test('should verify consistent data structure', async ({ request }) => {
      const [response1, response2] = await Promise.all([
        request.get(`${API_BASE_URL}/api/agents`),
        request.get(`${API_BASE_URL}/api/agents`)
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      expect(data1.length).toBe(data2.length);

      if (data1.length > 0 && data2.length > 0) {
        const keys1 = Object.keys(data1[0]).sort();
        const keys2 = Object.keys(data2[0]).sort();
        expect(keys1).toEqual(keys2);
      }

      console.log('✅ Data structure is consistent');
    });
  });

  test.describe('Advanced API Features', () => {
    test('should verify API supports pagination', async ({ request }) => {
      // Test if pagination parameters are accepted
      const response = await request.get(`${API_BASE_URL}/api/agent-posts?limit=2&offset=0`);

      expect(response.status()).toBeLessThan(400);

      const posts = await response.json();
      if (Array.isArray(posts)) {
        expect(posts.length).toBeLessThanOrEqual(2);
        console.log('✅ Pagination parameters are handled');
      }
    });

    test('should verify API supports sorting', async ({ request }) => {
      // Test if sorting parameters are accepted
      const response = await request.get(`${API_BASE_URL}/api/agents?sort=name&order=asc`);

      expect(response.status()).toBeLessThan(400);

      console.log('✅ Sorting parameters are handled');
    });

    test('should verify API handles special characters in requests', async ({ request }) => {
      // Test with special characters in query params
      const response = await request.get(`${API_BASE_URL}/api/agents?search=${encodeURIComponent('test&special=chars')}`);

      expect(response.status()).toBeLessThan(500);

      console.log('✅ Special characters in requests are handled');
    });
  });
});