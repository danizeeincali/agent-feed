/**
 * Jest Test Setup for TDD London School Input Handling Tests
 * Configures global mocks and test utilities
 */

// Extend Jest matchers
require('jest-extended');

// Global test utilities
global.createMockWebSocket = () => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  url: 'ws://localhost:3001'
});

global.createMockEvent = (overrides = {}) => ({
  key: 'Enter',
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: null,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  ...overrides
});

global.createMockElement = (overrides = {}) => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  value: '',
  focus: jest.fn(),
  blur: jest.fn(),
  ...overrides
});

// Mock global objects
global.WebSocket = jest.fn().mockImplementation(() => global.createMockWebSocket());
global.document = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getElementById: jest.fn().mockReturnValue(global.createMockElement()),
  createElement: jest.fn().mockReturnValue(global.createMockElement())
};

global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Console warning suppression for test output
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected in tests
  if (args[0] && args[0].includes && args[0].includes('Warning:')) {
    return;
  }
  originalWarn.apply(console, args);
};

// Custom Jest matchers for London School TDD
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (!receivedCalls.length || !expectedCalls.length) {
      return {
        message: () => `Expected both functions to have been called`,
        pass: false
      };
    }
    
    const lastReceivedCall = Math.max(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    
    const pass = lastReceivedCall < firstExpectedCall;
    
    return {
      message: () => 
        pass 
          ? `Expected ${received.getMockName()} not to have been called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass
    };
  },

  toSatisfyContract(received, contract) {
    const pass = Object.keys(contract).every(key => {
      if (typeof contract[key] === 'function') {
        return typeof received[key] === 'function';
      }
      return received[key] === contract[key];
    });

    return {
      message: () => 
        pass 
          ? `Expected object not to satisfy contract`
          : `Expected object to satisfy contract: ${JSON.stringify(contract)}`,
      pass
    };
  },

  toHaveInteractionPattern(received, pattern) {
    const calls = received.mock.calls;
    const pass = pattern.every((expectedCall, index) => {
      const actualCall = calls[index];
      return actualCall && expectedCall.every((arg, argIndex) => {
        if (typeof arg === 'function') {
          return typeof actualCall[argIndex] === 'function';
        }
        return actualCall[argIndex] === arg;
      });
    });

    return {
      message: () => 
        pass 
          ? `Expected mock not to have interaction pattern`
          : `Expected mock to have interaction pattern: ${JSON.stringify(pattern)}`,
      pass
    };
  }
});

// Mock timers setup
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Swarm coordination test utilities
global.createMockSwarmCoordinator = () => ({
  initializeSwarm: jest.fn().mockResolvedValue(true),
  spawnAgent: jest.fn().mockResolvedValue({ id: 'mock-agent', type: 'tester' }),
  terminateAgent: jest.fn().mockResolvedValue(true),
  broadcastMessage: jest.fn().mockResolvedValue(true),
  getAgentStatus: jest.fn().mockReturnValue('active'),
  synchronizeAgents: jest.fn().mockResolvedValue(true),
  beforeCommandSend: jest.fn().mockResolvedValue(true),
  afterCommandSend: jest.fn(),
  notifyAgents: jest.fn()
});

global.createMockMemoryManager = () => ({
  store: jest.fn(),
  retrieve: jest.fn().mockResolvedValue(null),
  shareTestData: jest.fn(),
  retrieveTestData: jest.fn().mockResolvedValue(null),
  synchronizeState: jest.fn().mockResolvedValue(true)
});

global.createMockHasher = () => ({
  hash: jest.fn().mockImplementation(content => `hash_${content.slice(0, 8)}`),
  compare: jest.fn().mockImplementation((hash1, hash2) => hash1 === hash2)
});

global.createMockStorage = () => ({
  has: jest.fn().mockReturnValue(false),
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  size: jest.fn().mockReturnValue(0)
});

// Contract testing utilities
global.createSwarmMock = (name, methods) => {
  const mock = {};
  Object.keys(methods).forEach(method => {
    mock[method] = jest.fn().mockImplementation(methods[method]);
  });
  mock._contractName = name;
  mock._swarmId = `swarm_${Date.now()}`;
  return mock;
};

global.extendSwarmMock = (baseMock, extensions) => {
  const extended = { ...baseMock };
  Object.keys(extensions).forEach(method => {
    extended[method] = jest.fn().mockImplementation(extensions[method]);
  });
  return extended;
};

// Test result aggregation
global.aggregateTestResults = (results) => {
  return results.reduce((acc, result) => {
    acc.totalTests += result.totalTests || 0;
    acc.passed += result.passed || 0;
    acc.failed += result.failed || 0;
    acc.duration += result.duration || 0;
    return acc;
  }, { totalTests: 0, passed: 0, failed: 0, duration: 0 });
};