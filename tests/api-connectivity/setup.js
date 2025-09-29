/**
 * Jest Setup for API Connectivity Tests
 * Pre-test setup and utility functions
 */

// Global timeout for all tests
jest.setTimeout(30000);

// Global variables
global.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
global.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Add fetch polyfill for Node.js if not available
if (!global.fetch) {
  const { default: fetch } = await import('node-fetch');
  global.fetch = fetch;
}

// Custom matchers
expect.extend({
  toBeValidJSON(received) {
    try {
      JSON.parse(received);
      return {
        message: () => `Expected ${received} not to be valid JSON`,
        pass: true
      };
    } catch (e) {
      return {
        message: () => `Expected ${received} to be valid JSON, but got error: ${e.message}`,
        pass: false
      };
    }
  },

  toHaveValidApiStructure(received) {
    const hasId = received.hasOwnProperty('id');
    const hasTimestamp = received.hasOwnProperty('created_at') ||
                        received.hasOwnProperty('createdAt') ||
                        received.hasOwnProperty('timestamp');

    if (hasId) {
      return {
        message: () => `Expected object to have valid API structure`,
        pass: true
      };
    }

    return {
      message: () => `Expected object to have valid API structure (missing id field)`,
      pass: false
    };
  },

  toBeWithinTimeRange(received, expectedMs = 5000) {
    const isWithinRange = received >= 0 && received <= expectedMs;

    if (isWithinRange) {
      return {
        message: () => `Expected ${received}ms not to be within ${expectedMs}ms`,
        pass: true
      };
    }

    return {
      message: () => `Expected ${received}ms to be within ${expectedMs}ms`,
      pass: false
    };
  }
});

// Global setup function
beforeAll(async () => {
  console.log('🚀 Starting API Connectivity Tests');
  console.log(`📍 API Base URL: ${global.API_BASE_URL}`);
  console.log(`🌐 Frontend URL: ${global.FRONTEND_URL}`);

  // Wait a moment for servers to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Global teardown function
afterAll(async () => {
  console.log('✅ API Connectivity Tests completed');
});

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Utility functions available globally
global.testUtils = {
  /**
   * Wait for a server to be ready
   */
  async waitForServer(url, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${url}/api/health`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Server not ready, wait and retry
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Server at ${url} did not become ready within ${maxAttempts * 2} seconds`);
  },

  /**
   * Make a safe API request with error handling
   */
  async safeApiRequest(endpoint, options = {}) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${global.API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        timeout: 10000,
        ...options
      });

      return {
        success: true,
        response,
        status: response.status,
        data: response.headers.get('content-type')?.includes('json')
          ? await response.json()
          : await response.text()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: null,
        data: null
      };
    }
  },

  /**
   * Validate API response structure
   */
  validateApiResponse(response, expectedFields = []) {
    expect(response).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.headers).toBeDefined();

    if (expectedFields.length > 0 && response.data) {
      expectedFields.forEach(field => {
        expect(response.data).toHaveProperty(field);
      });
    }

    return true;
  },

  /**
   * Check if data looks like real data (not mock/test data)
   */
  isRealData(data, field = 'name') {
    if (!data || typeof data !== 'object') return false;

    const value = data[field];
    if (!value || typeof value !== 'string') return false;

    // Check for common test/mock patterns
    const mockPatterns = /test|mock|placeholder|demo|example|fake|sample/i;
    return !mockPatterns.test(value) && value.length > 2;
  },

  /**
   * Measure response time
   */
  async measureResponseTime(apiCall) {
    const startTime = Date.now();
    const result = await apiCall();
    const endTime = Date.now();

    return {
      ...result,
      responseTime: endTime - startTime
    };
  }
};