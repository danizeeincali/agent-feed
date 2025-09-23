/**
 * Setup file for SPARC Tailwind CSS validation tests
 */

const fs = require('fs');
const path = require('path');

// Ensure test environment is set up correctly
beforeAll(() => {
  // Create necessary directories
  const dirs = [
    'tests/sparc-tailwind-validation/screenshots',
    'tests/sparc-tailwind-validation/coverage',
    'tests/sparc-tailwind-validation/reports'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.NEXT_TELEMETRY_DISABLED = '1';

  console.log('🧪 SPARC Tailwind validation test environment initialized');
});

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await global.sleep(delay);
    }
  }
};

// Cleanup after all tests
afterAll(() => {
  console.log('🧹 SPARC Tailwind validation tests completed');
});