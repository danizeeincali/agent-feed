/**
 * Jest Setup for Terminal I/O London School Tests
 * Configure mocks and test environment
 */

// Jest is globally available, no need to import

// Global mock setup
beforeAll(() => {
  // Suppress console.log during tests unless explicitly needed
  global.originalConsoleLog = console.log;
  console.log = jest.fn();
  
  // Setup global test timeout
  jest.setTimeout(10000);
});

afterAll(() => {
  // Restore console.log
  console.log = global.originalConsoleLog;
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  // Reset modules to ensure clean mock state
  jest.resetModules();
});

afterEach(() => {
  // Verify no unexpected mock interactions
  const { contractVerifier } = require('./mock-contracts');
  
  // Add any global contract verifications here
});

// Global mock configurations
jest.mock('node-pty', () => ({
  spawn: jest.fn(() => ({
    write: jest.fn(),
    on: jest.fn(),
    kill: jest.fn(),
    resize: jest.fn(),
    pid: Math.floor(Math.random() * 10000)
  }))
}));

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => ({
    on: jest.fn(),
    clients: new Set()
  }))
}));

// Custom matchers for London School testing
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (!receivedCalls || !expectedCalls) {
      return {
        message: () => 'Mock functions must have been called to use toHaveBeenCalledBefore',
        pass: false,
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
      pass,
    };
  },
  
  toHaveInteractedWith(received, collaborator) {
    const receivedCalls = received.mock.calls;
    const collaboratorCalls = collaborator.mock.calls;
    
    const hasInteraction = receivedCalls.length > 0 && collaboratorCalls.length > 0;
    
    return {
      message: () => 
        hasInteraction
          ? `Expected no interaction between mocks`
          : `Expected interaction between mocks`,
      pass: hasInteraction,
    };
  }
});

// Global test utilities
global.testUtils = {
  createMockSuite: () => {
    const { createMockFactory } = require('./mock-contracts');
    return createMockFactory().createFullSuite();
  },
  
  simulateTyping: (handler, text) => {
    for (const char of text) {
      handler(char);
    }
  },
  
  simulateEnter: (handler) => {
    handler('\n');
  },
  
  expectNoEcho: (webSocketMock, chars) => {
    const { contractVerifier } = require('./mock-contracts');
    contractVerifier.verifyNoEcho(webSocketMock, chars);
  }
};