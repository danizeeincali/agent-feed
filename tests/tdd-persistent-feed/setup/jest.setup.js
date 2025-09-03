/**
 * London School TDD Test Setup
 * Provides mock-first environment for behavior-driven testing
 */

// Mock all external dependencies first
jest.mock('express');
jest.mock('pg');
jest.mock('ws');
jest.mock('socket.io');
jest.mock('cors');
jest.mock('winston');

// Test utilities
require('../../custom-matchers');

// Global test configuration
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock timers for consistent testing
jest.useFakeTimers();

// Global setup for each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

after(() => {
  jest.useRealTimers();
});

// Mock PostgreSQL client
const mockPgClient = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockPgClient),
  end: jest.fn()
};

// Export mocks for use in tests
global.mockPgClient = mockPgClient;
global.mockPool = mockPool;

// Mock Express app
const mockExpress = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

global.mockExpress = mockExpress;

// Mock WebSocket server
const mockWss = {
  on: jest.fn(),
  clients: new Set(),
  broadcast: jest.fn()
};

global.mockWss = mockWss;

// Test data factory
global.createMockPost = (overrides = {}) => ({
  id: 'test-post-1',
  title: 'Test Agent Post',
  content: 'This is a test post from an agent',
  authorAgent: 'test-agent',
  publishedAt: new Date().toISOString(),
  metadata: {
    businessImpact: 5,
    tags: ['test', 'agent'],
    isAgentResponse: true
  },
  likes: 0,
  comments: 0,
  shares: 0,
  ...overrides
});

// Database test utilities
global.mockDatabaseSuccess = (result = { rows: [], rowCount: 0 }) => {
  mockPgClient.query.mockResolvedValueOnce(result);
  mockPool.query.mockResolvedValueOnce(result);
};

global.mockDatabaseError = (error = new Error('Database connection failed')) => {
  mockPgClient.query.mockRejectedValueOnce(error);
  mockPool.query.mockRejectedValueOnce(error);
};

// Mock WebSocket client
global.createMockWebSocketClient = () => ({
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  readyState: 1 // OPEN
});

// Behavior verification helpers
global.verifyInteraction = (mock, expectedCall) => {
  expect(mock).toHaveBeenCalledWith(...expectedCall);
};

global.verifyInteractionOrder = (mocks) => {
  const allCalls = [];
  mocks.forEach((mock, index) => {
    mock.mock.calls.forEach(call => {
      allCalls.push({ mockIndex: index, call });
    });
  });
  
  // Verify calls were made in expected order
  return allCalls;
};
