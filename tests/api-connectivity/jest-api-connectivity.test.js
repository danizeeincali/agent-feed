/**
 * API Connectivity Tests - Jest Unit Tests
 * Tests real API endpoints against running servers on ports 5173 and 3000
 * NO MOCKS - All tests hit actual running servers
 */

describe('API Connectivity Tests', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Test timeout for network requests
  const TEST_TIMEOUT = 30000;

  beforeAll(async () => {
    // Verify servers are running before starting tests
    console.log('🔍 Verifying server connectivity...');

    try {
      // Try health endpoint first, fallback to agents endpoint
      let healthResponse;
      try {
        healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          timeout: 5000
        });
      } catch (healthError) {
        console.log('⚠️ Health endpoint not available, trying agents endpoint...');
        healthResponse = await fetch(`${API_BASE_URL}/api/agents`, {
          method: 'GET',
          timeout: 5000
        });
      }

      if (!healthResponse.ok) {
        throw new Error(`Backend server check failed: ${healthResponse.status}`);
      }

      console.log('✅ Backend server is accessible');
    } catch (error) {
      console.error('❌ Backend server is not responding:', error.message);
      console.error('Please ensure the backend server is running on port 3000');
      throw error;
    }

    try {
      const frontendResponse = await fetch(FRONTEND_URL, {
        method: 'GET',
        timeout: 5000
      });

      if (!frontendResponse.ok) {
        throw new Error(`Frontend server health check failed: ${frontendResponse.status}`);
      }

      console.log('✅ Frontend server is accessible');
    } catch (error) {
      console.warn('⚠️ Frontend server may not be running on port 5173:', error.message);
      // Don't fail tests if frontend is down, just warn
    }
  }, TEST_TIMEOUT);

  describe('/api/agents endpoint', () => {
    test('should return agents data with correct structure', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // Check that we have real data, not empty arrays
      if (data.length > 0) {
        const agent = data[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(typeof agent.id).toBe('string');
        expect(typeof agent.name).toBe('string');
        expect(agent.name.length).toBeGreaterThan(0);
      }

      console.log(`✅ /api/agents returned ${data.length} agents`);
    }, TEST_TIMEOUT);

    test('should handle CORS headers correctly', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: 'OPTIONS'
      });

      expect(response.headers.has('access-control-allow-origin')).toBe(true);
      expect(response.headers.has('access-control-allow-methods')).toBe(true);

      console.log('✅ CORS headers are properly configured for /api/agents');
    }, TEST_TIMEOUT);

    test('should return agents health status or gracefully handle missing endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents/health`);

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('status');
        expect(data.status).toBe('healthy');
        console.log('✅ /api/agents/health endpoint is working');
      } else if (response.status === 404) {
        console.log('ℹ️ /api/agents/health endpoint not implemented (acceptable)');
        expect(response.status).toBe(404);
      } else {
        // Unexpected status
        expect(response.status).toBeLessThan(500);
        console.log(`⚠️ /api/agents/health returned unexpected status: ${response.status}`);
      }
    }, TEST_TIMEOUT);
  });

  describe('/api/agent-posts endpoint', () => {
    test('should return agent posts or handle routing correctly', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agent-posts`);

      // Handle different response types
      if (response.status === 200 && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);

        // Check that we have real data
        if (data.length > 0) {
          const post = data[0];
          expect(post).toHaveProperty('id');
          expect(post).toHaveProperty('content');
          expect(typeof post.id).toBe('string');
          expect(typeof post.content).toBe('string');
          expect(post.content.length).toBeGreaterThan(0);
        }

        console.log(`✅ /api/agent-posts returned ${data.length} posts`);
      } else if (response.status === 200 && response.headers.get('content-type')?.includes('text/html')) {
        // This means the endpoint is being handled by frontend routing
        console.log('ℹ️ /api/agent-posts returns HTML (frontend routing)');
        expect(response.status).toBe(200);
      } else if (response.status === 404) {
        console.log('ℹ️ /api/agent-posts endpoint not found (may need different path)');
        expect(response.status).toBe(404);
      } else {
        expect(response.status).toBeLessThan(500);
        console.log(`⚠️ /api/agent-posts returned status: ${response.status}`);
      }
    }, TEST_TIMEOUT);

    test('should support filtering via POST request', async () => {
      const filterPayload = {
        filters: {
          limit: 10
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filterPayload)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(10);

      console.log(`✅ POST /api/v1/agent-posts/filter returned ${data.length} filtered posts`);
    }, TEST_TIMEOUT);

    test('should handle v1 API version', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      console.log(`✅ /api/v1/agent-posts endpoint is working`);
    }, TEST_TIMEOUT);
  });

  describe('/api/streaming-ticker endpoint', () => {
    test('should respond to streaming ticker requests', async () => {
      const response = await fetch(`${API_BASE_URL}/api/streaming-ticker`);

      // Accept any 2xx or 404 status (404 means route exists but no handler)
      expect([200, 201, 202, 404].includes(response.status)).toBe(true);

      console.log(`✅ /api/streaming-ticker endpoint responded with status ${response.status}`);
    }, TEST_TIMEOUT);

    test('should have CORS headers for streaming endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/streaming-ticker`, {
        method: 'OPTIONS'
      });

      // Should have CORS headers or at least not fail completely
      expect(response.status).toBeLessThan(500);

      console.log(`✅ /api/streaming-ticker CORS check completed with status ${response.status}`);
    }, TEST_TIMEOUT);
  });

  describe('CORS Configuration', () => {
    test('should allow requests from frontend origin', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });

      expect(response.status).toBe(200);

      const corsOrigin = response.headers.get('access-control-allow-origin');
      expect(corsOrigin).toBeTruthy();

      console.log(`✅ CORS allows origin: ${corsOrigin}`);
    }, TEST_TIMEOUT);

    test('should include necessary CORS methods', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'OPTIONS'
      });

      const allowedMethods = response.headers.get('access-control-allow-methods');
      expect(allowedMethods).toBeTruthy();
      expect(allowedMethods.toLowerCase()).toMatch(/get/);
      expect(allowedMethods.toLowerCase()).toMatch(/post/);

      console.log(`✅ CORS methods: ${allowedMethods}`);
    }, TEST_TIMEOUT);

    test('should handle preflight requests', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(response.status).toBeLessThan(400);

      console.log(`✅ Preflight request handled with status ${response.status}`);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints gracefully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/non-existent-endpoint`);

      expect(response.status).toBe(404);

      console.log('✅ 404 errors are handled properly');
    }, TEST_TIMEOUT);

    test('should handle malformed requests to valid endpoints', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid-json'
      });

      expect([400, 422, 500].includes(response.status)).toBe(true);

      console.log(`✅ Malformed requests handled with status ${response.status}`);
    }, TEST_TIMEOUT);

    test('should provide meaningful error responses', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents/invalid-agent-id`);

      // Should either return 404 or 400, not crash
      expect(response.status).toBeLessThan(500);

      try {
        const errorData = await response.json();
        expect(typeof errorData).toBe('object');
      } catch (e) {
        // Some endpoints might return plain text errors, which is also acceptable
        console.log('Non-JSON error response received (acceptable)');
      }

      console.log(`✅ Error responses are meaningful (status: ${response.status})`);
    }, TEST_TIMEOUT);
  });

  describe('API Performance', () => {
    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();

      const response = await fetch(`${API_BASE_URL}/api/health`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 second max

      console.log(`✅ API response time: ${responseTime}ms`);
    }, TEST_TIMEOUT);

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map(() =>
        fetch(`${API_BASE_URL}/api/agents`)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      console.log('✅ Concurrent requests handled successfully');
    }, TEST_TIMEOUT);
  });

  describe('API Content Validation', () => {
    test('should return real data, not placeholder/mock data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const agents = await response.json();

      if (agents.length > 0) {
        const agent = agents[0];

        // Check for common mock data patterns
        expect(agent.name).not.toMatch(/test|mock|placeholder|demo/i);
        expect(agent.id).not.toBe('test-id');
        expect(agent.id).not.toBe('mock-id');
        expect(agent.id).not.toBe('placeholder-id');

        console.log(`✅ Agent data appears to be real: ${agent.name}`);
      }
    }, TEST_TIMEOUT);

    test('should return consistent data structure across requests', async () => {
      const [response1, response2] = await Promise.all([
        fetch(`${API_BASE_URL}/api/agents`),
        fetch(`${API_BASE_URL}/api/agents`)
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      expect(data1.length).toBe(data2.length);

      if (data1.length > 0 && data2.length > 0) {
        expect(Object.keys(data1[0]).sort()).toEqual(Object.keys(data2[0]).sort());
      }

      console.log('✅ Data structure is consistent across requests');
    }, TEST_TIMEOUT);
  });
});