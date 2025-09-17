/**
 * Jest CI Setup
 * Additional setup for CI environment
 */

// Import base setup
require('./testSetup.ts');

// CI-specific setup
beforeAll(() => {
  // Set CI environment
  process.env.CI = 'true';
  process.env.NODE_ENV = 'test';

  // Increase timeout for slower CI environments
  jest.setTimeout(15000);

  // Mock console methods to reduce noise
  global.console = {
    ...console,
    // Keep error and warn for debugging
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
});

afterAll(() => {
  // Cleanup any global resources
  if (global.gc) {
    global.gc();
  }
});

// Enhanced error handling for CI
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in CI, let Jest handle it
});

// Performance monitoring
const testStartTimes = new Map();

beforeEach(() => {
  const testName = expect.getState().currentTestName;
  testStartTimes.set(testName, Date.now());
});

afterEach(() => {
  const testName = expect.getState().currentTestName;
  const startTime = testStartTimes.get(testName);

  if (startTime) {
    const duration = Date.now() - startTime;

    // Log slow tests in CI
    if (duration > 5000) {
      console.warn(`Slow test detected: ${testName} took ${duration}ms`);
    }

    testStartTimes.delete(testName);
  }
});