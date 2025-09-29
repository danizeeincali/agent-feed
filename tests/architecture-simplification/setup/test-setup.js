/**
 * Test Setup for Architecture Simplification Suite
 * TDD London School - Mock-driven development setup
 */

import { jest } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock filesystem operations for safe testing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
}));

// Mock process.env for consistent testing
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    PORT: '3001',
    VITE_PORT: '5173',
  };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

// Global timeout for architecture tests
jest.setTimeout(30000);

// Architecture test utilities
global.ArchitectureTestUtils = {
  // Mock Next.js server
  createNextMock: () => ({
    listen: jest.fn(),
    close: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    use: jest.fn(),
  }),

  // Mock Vite dev server
  createViteMock: () => ({
    listen: jest.fn(),
    close: jest.fn(),
    middlewares: {
      use: jest.fn(),
    },
    ssrLoadModule: jest.fn(),
  }),

  // Mock database connections
  createDbMock: () => ({
    prepare: jest.fn(),
    exec: jest.fn(),
    close: jest.fn(),
    transaction: jest.fn(),
  }),

  // Mock API responses
  createApiMock: (data = {}) => ({
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    ok: true,
    status: 200,
    headers: new Map(),
  }),
};

// Contract verification utilities
global.ContractVerification = {
  // Verify API contract compatibility
  verifyApiContract: (mockCall, expectedContract) => {
    expect(mockCall).toHaveBeenCalledWith(
      expect.objectContaining(expectedContract)
    );
  },

  // Verify component interface contracts
  verifyComponentContract: (component, expectedProps) => {
    expect(component.props).toEqual(
      expect.objectContaining(expectedProps)
    );
  },

  // Verify data flow contracts
  verifyDataFlow: (input, transformFn, expectedOutput) => {
    const result = transformFn(input);
    expect(result).toEqual(expectedOutput);
  },
};