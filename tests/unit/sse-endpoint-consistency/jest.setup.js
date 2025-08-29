/**
 * Jest Setup for SSE Endpoint Consistency Tests
 * Configures global test environment and utilities
 */

// Global test setup
import 'jest-environment-jsdom';

// Mock console to capture logs during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console spies for each test
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console after each test
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Restore original console for debugging when needed
  restoreConsole: () => {
    Object.assign(console, originalConsole);
  },
  
  // Helper to wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock URLs
  createMockURL: (base, path) => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`,
  
  // Helper to extract URL components
  parseURL: (url) => {
    try {
      const parsed = new URL(url);
      return {
        protocol: parsed.protocol,
        host: parsed.host,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash
      };
    } catch (error) {
      return null;
    }
  }
};

// Mock EventSource globally
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1; 
  static CLOSED = 2;

  constructor(url, eventSourceInitDict) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    this.withCredentials = eventSourceInitDict?.withCredentials || false;
    
    // Event handlers
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Track for testing
    MockEventSource._instances = MockEventSource._instances || [];
    MockEventSource._instances.push(this);
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    const index = MockEventSource._instances?.indexOf(this);
    if (index !== -1) {
      MockEventSource._instances.splice(index, 1);
    }
  }

  addEventListener(type, listener) {
    if (type === 'open') this.onopen = listener;
    if (type === 'message') this.onmessage = listener;
    if (type === 'error') this.onerror = listener;
  }

  removeEventListener(type, listener) {
    if (type === 'open' && this.onopen === listener) this.onopen = null;
    if (type === 'message' && this.onmessage === listener) this.onmessage = null;
    if (type === 'error' && this.onerror === listener) this.onerror = null;
  }

  static reset() {
    MockEventSource._instances = [];
  }

  static getInstances() {
    return MockEventSource._instances || [];
  }
}

// Make MockEventSource available globally
global.EventSource = MockEventSource;
global.MockEventSource = MockEventSource;

// Mock fetch globally
const originalFetch = global.fetch;

global.fetch = jest.fn().mockImplementation((url, options = {}) => {
  // Default mock responses based on URL patterns
  if (typeof url === 'string') {
    // V1 API endpoints (should succeed)
    if (url.includes('/api/v1/claude/instances')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({
          success: true,
          data: { instanceId: 'test', status: 'running' }
        })
      });
    }
    
    // Unversioned API endpoints (should fail with 404)
    if (url.includes('/api/claude/instances')) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          error: 'Not Found',
          message: 'Endpoint not found. Use /api/v1/ prefix.'
        })
      });
    }
  }
  
  // Default successful response
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ success: true })
  });
});

// Helper to restore original fetch
global.restoreOriginalFetch = () => {
  global.fetch = originalFetch;
};

// Clean up between tests
afterEach(() => {
  MockEventSource.reset();
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});

// Additional matchers for better test assertions
expect.extend({
  toMatchURLPattern(received, pattern) {
    const pass = new RegExp(pattern).test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to match pattern ${pattern}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to match pattern ${pattern}`,
        pass: false,
      };
    }
  },
  
  toHaveValidAPIVersion(received) {
    const pass = received.includes('/api/v1/') || received.includes('/api/v2/');
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid API version`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid API version (v1, v2, etc.)`,
        pass: false,
      };
    }
  }
});

console.log('🧪 SSE Endpoint Consistency Test Environment Ready');
console.log('   - EventSource mocked');
console.log('   - Fetch mocked with URL pattern responses'); 
console.log('   - Custom matchers available');
console.log('   - Global test utilities loaded');