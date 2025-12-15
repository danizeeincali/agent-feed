/**
 * Jest Setup File
 *
 * Global test setup for Λvi system identity tests.
 * Runs before each test file.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.TEST_CONSTANTS = {
  AVI_AGENT_ID: 'avi',
  AVI_DISPLAY_NAME: 'Λvi (Amplifying Virtual Intelligence)',
  AVI_DESCRIPTION: 'AI system coordinator and amplification agent',
  TOKEN_BUDGET: 500,
  MAX_TOKEN_USAGE: 100
};

// Performance timing utilities
global.measurePerformance = (fn) => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
};

global.measurePerformanceAsync = async (fn) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

// Console helpers for test debugging
if (process.env.DEBUG_TESTS) {
  console.log('🧪 Λvi Test Suite - Debug Mode Enabled');
  console.log(`📍 Working Directory: ${process.cwd()}`);
  console.log(`🔧 Node Version: ${process.version}`);
  console.log(`⚡ Test Environment: ${process.env.NODE_ENV}`);
}

// Cleanup function for after all tests
afterAll(() => {
  if (process.env.DEBUG_TESTS) {
    console.log('✅ All tests completed');
  }
});

// Handle unhandled rejections in tests
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection in Test:', error);
  throw error;
});

// Custom matchers (optional)
expect.extend({
  toBeAviAgent(received) {
    const pass = received === 'avi';
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be avi agent`
          : `expected ${received} to be avi agent (must be exactly 'avi')`
    };
  },

  toHaveTokenCount(received, expected) {
    const tokens = Math.ceil(JSON.stringify(received).length / 4);
    const pass = tokens === expected;
    return {
      pass,
      message: () =>
        pass
          ? `expected token count not to be ${expected}`
          : `expected ${tokens} tokens to be ${expected} tokens`
    };
  },

  toBeWithinTokenBudget(received, budget) {
    const tokens = Math.ceil(JSON.stringify(received).length / 4);
    const pass = tokens <= budget;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${tokens} tokens to exceed budget of ${budget}`
          : `expected ${tokens} tokens to be within budget of ${budget} tokens`
    };
  }
});

console.log('✅ Test setup complete');
