/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test utilities
global.__TEST__ = true;
global.__VERSION__ = '1.0.0';

// Mock console.error to avoid noise during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Global timeout for async operations
jest.setTimeout(30000);

// Global test helpers
global.createMockContent = (overrides = {}) => ({
  text: 'Sample content for testing',
  agentType: 'personal-todos',
  ...overrides
});

global.createMockUserData = (overrides = {}) => ({
  title: 'Test task',
  priority: 'P1',
  impact_score: 8,
  ...overrides
});

global.createMockContext = (overrides = {}) => ({
  userData: {
    name: 'Test User',
    role: 'Developer'
  },
  businessContext: 'Test project',
  ...overrides
});

// Performance test helper
global.measurePerformance = async (fn) => {
  const startTime = process.hrtime.bigint();
  const result = await fn();
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  return { result, duration };
};

// Mock response helper
global.createMockResponse = (overrides = {}) => ({
  score: 0.8,
  insights: [],
  suggestions: [],
  ...overrides
});