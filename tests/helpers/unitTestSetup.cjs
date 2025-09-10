/**
 * Unit Test Setup for Agent Feed TDD Suite
 */

// Jest DOM matchers
require('@testing-library/jest-dom');

// Global test configuration
beforeAll(() => {
  // Suppress console warnings during tests
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:')) return;
    originalWarn(...args);
  };
});

afterAll(() => {
  // Restore console
  console.warn = console.warn;
});

// Global test utilities
global.testUtils = {
  createMockAgent: (overrides = {}) => ({
    name: 'test-agent',
    description: 'Test agent description',
    tools: ['Read', 'Write'],
    model: 'sonnet',
    color: '#blue',
    proactive: true,
    priority: 'P1',
    usage: 'Testing purposes',
    body: '# Test Agent\n\nThis is a test agent.',
    filePath: '/test/test-agent.md',
    lastModified: new Date('2023-01-01'),
    workspaceDirectory: '/workspace/test-agent/',
    ...overrides
  }),

  createMockWorkspace: (overrides = {}) => ({
    name: 'test-agent',
    directory: '/workspace/test-agent/',
    files: ['README.md'],
    logs: [],
    lastActivity: new Date('2023-01-01'),
    ...overrides
  }),

  createMockMetrics: (overrides = {}) => ({
    name: 'test-agent',
    totalInvocations: 10,
    successRate: 0.9,
    averageResponseTime: 1500,
    lastUsed: new Date('2023-01-01'),
    errorCount: 1,
    ...overrides
  })
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';