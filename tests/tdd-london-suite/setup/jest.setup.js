/**
 * Jest Setup for TDD London School Test Suite
 * 
 * Global test configuration and utilities for behavior-driven testing.
 * Sets up mocking boundaries and test helpers.
 */

// Extend Jest matchers for better assertions
expect.extend({
  // Custom matcher for contract verification
  toSatisfyContract(received, contract) {
    const pass = this.equals(received, expect.objectContaining(contract));
    
    if (pass) {
      return {
        message: () => `Expected object not to satisfy contract`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to satisfy contract:\n${this.utils.diff(contract, received)}`,
        pass: false
      };
    }
  },

  // Custom matcher for process behavior
  toHaveBeenCalledWithProcess(received, expectedProcess) {
    const pass = received.mock.calls.some(call => 
      call.some(arg => arg && arg.pid === expectedProcess.pid)
    );

    if (pass) {
      return {
        message: () => `Expected not to be called with process PID ${expectedProcess.pid}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected to be called with process PID ${expectedProcess.pid}`,
        pass: false
      };
    }
  },

  // Custom matcher for WebSocket messages
  toHaveReceivedWebSocketMessage(received, expectedMessage) {
    const calls = received.send.mock.calls;
    const pass = calls.some(call => {
      try {
        const message = JSON.parse(call[0]);
        return this.equals(message, expect.objectContaining(expectedMessage));
      } catch {
        return false;
      }
    });

    if (pass) {
      return {
        message: () => `Expected WebSocket not to receive message`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected WebSocket to receive message: ${JSON.stringify(expectedMessage)}`,
        pass: false
      };
    }
  },

  // Custom matcher for ANSI content
  toBeCleanOfAnsiSequences(received) {
    const ansiRegex = /\u001b\[[0-9;]*[a-zA-Z]/g;
    const hasAnsi = ansiRegex.test(received);

    if (!hasAnsi) {
      return {
        message: () => `Expected string to contain ANSI sequences`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected string to be clean of ANSI sequences but found: ${received.match(ansiRegex)}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create mock process with standard interface
  createMockProcess: (options = {}) => ({
    pid: options.pid || 12345,
    killed: false,
    stdin: {
      write: jest.fn(),
      end: jest.fn(),
      destroyed: false
    },
    stdout: {
      on: jest.fn(),
      removeAllListeners: jest.fn()
    },
    stderr: {
      on: jest.fn(),
      removeAllListeners: jest.fn()
    },
    on: jest.fn(),
    kill: jest.fn(),
    write: jest.fn(), // PTY method
    ...options
  }),

  // Create mock WebSocket with standard interface
  createMockWebSocket: (options = {}) => ({
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    readyState: 1, // OPEN
    ...options
  }),

  // Create mock HTTP response for SSE
  createMockSSEResponse: () => ({
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    destroyed: false,
    writable: true,
    writableEnded: false,
    on: jest.fn()
  }),

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test instance ID
  generateInstanceId: () => `claude-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

  // Mock global functions safely
  mockGlobal: (name, implementation) => {
    const original = global[name];
    global[name] = implementation;
    return () => { global[name] = original; };
  },

  // Capture console output for testing
  captureConsole: () => {
    const originalLog = console.log;
    const originalError = console.error;
    const logs = [];
    
    console.log = (...args) => logs.push({ type: 'log', args });
    console.error = (...args) => logs.push({ type: 'error', args });
    
    return {
      logs,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
      }
    };
  }
};

// Global test constants
global.testConstants = {
  MOCK_INSTANCE_ID: 'claude-test-123',
  MOCK_PID: 12345,
  TEST_TIMEOUT: 5000,
  WEBSOCKET_PORT: 3002,
  HTTP_PORT: 3000,
  
  // Standard test payloads
  STANDARD_INPUT: 'Hello Claude',
  STANDARD_OUTPUT: 'Claude: Hello! How can I help you?',
  
  // Error messages
  ERRORS: {
    INSTANCE_NOT_FOUND: 'Instance not found',
    INSTANCE_NOT_RUNNING: 'Instance not running', 
    INVALID_INPUT: 'Invalid input data'
  }
};

// Mock cleanup helpers
global.mockCleanup = {
  // Clean up all mocks and restore originals
  restoreAll: () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  },

  // Clean up specific mock implementations
  restoreGlobals: () => {
    // Restore commonly mocked globals
    if (global.activeProcesses && global.activeProcesses.clear) {
      global.activeProcesses.clear();
    }
    if (global.instanceOutputBuffers && global.instanceOutputBuffers.clear) {
      global.instanceOutputBuffers.clear();
    }
    if (global.wsConnections && global.wsConnections.clear) {
      global.wsConnections.clear();
    }
  }
};

// London School specific helpers
global.londonSchoolHelpers = {
  // Verify mock interactions follow expected patterns
  verifyMockInteractions: (mocks, expectedPattern) => {
    expectedPattern.forEach((expected, index) => {
      const mock = mocks[expected.mockName];
      expect(mock).toHaveBeenCalledTimes(expected.callCount || 1);
      if (expected.calledWith) {
        expect(mock).toHaveBeenCalledWith(...expected.calledWith);
      }
    });
  },

  // Create behavior verification suite
  createBehaviorVerifier: (collaborators) => ({
    expectBehavior: (behaviorName, assertions) => {
      describe(`Behavior: ${behaviorName}`, () => {
        assertions.forEach(assertion => {
          it(assertion.description, assertion.test);
        });
      });
    },
    
    verifyCollaborations: (expectedCollaborations) => {
      expectedCollaborations.forEach(collab => {
        expect(collaborators[collab.name]).toHaveBeenCalledWith(...collab.args);
      });
    }
  })
};

// Error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in test environment, but log the error
});

// Cleanup after each test
afterEach(() => {
  // Clean up any test-specific globals
  global.mockCleanup.restoreGlobals();
  
  // Clear any remaining timers
  jest.clearAllTimers();
});

// Global setup logging
console.log('🧪 TDD London School Test Suite Setup Complete');