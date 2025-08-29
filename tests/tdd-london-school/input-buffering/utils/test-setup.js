/**
 * TDD London School: Input Buffering Test Setup
 * Utilities for comprehensive mock-driven testing setup
 */

const {
  createMockInputHandlerSystem,
  mockVerification,
  contractVerification
} = require('../mocks/input-handling-mocks');

/**
 * Global test setup for input buffering tests
 */
const setupInputBufferingTests = () => {
  // Global beforeEach setup
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset any global state
    global.testStartTime = Date.now();
    
    // Setup console spy for error monitoring
    global.consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  // Global afterEach cleanup
  afterEach(() => {
    // Restore console
    if (global.consoleSpy) {
      global.consoleSpy.mockRestore();
    }
    
    // Clean up any timers
    jest.clearAllTimers();
    
    // Clear test state
    delete global.testStartTime;
    delete global.consoleSpy;
  });

  // Setup custom matchers
  expect.extend({
    toHaveBeenCalledBefore(received, expected) {
      const receivedCalls = received.mock.calls;
      const expectedCalls = expected.mock.calls;
      
      if (receivedCalls.length === 0) {
        return {
          message: () => `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}, but it was never called`,
          pass: false
        };
      }
      
      if (expectedCalls.length === 0) {
        return {
          message: () => `Expected ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
          pass: false
        };
      }
      
      // Compare invocation order (simplified)
      const receivedTime = receivedCalls[0]?.[0]?.timestamp || 0;
      const expectedTime = expectedCalls[0]?.[0]?.timestamp || 1;
      
      const pass = receivedTime < expectedTime;
      
      return {
        message: () => `Expected ${received.getMockName()} to have been called ${pass ? 'after' : 'before'} ${expected.getMockName()}`,
        pass
      };
    },

    toSatisfyContract(received, contract) {
      const missingProperties = [];
      
      for (const property of contract.requiredProperties || []) {
        if (!(property in received)) {
          missingProperties.push(property);
        }
      }
      
      const pass = missingProperties.length === 0;
      
      return {
        message: () => pass 
          ? `Expected object not to satisfy contract`
          : `Expected object to satisfy contract, missing: ${missingProperties.join(', ')}`,
        pass
      };
    },

    toHaveInteractionPattern(received, expectedPattern) {
      const calls = received.mock.calls;
      const actualPattern = calls.map(call => call.map(arg => typeof arg === 'object' ? Object.keys(arg) : arg));
      
      const pass = JSON.stringify(actualPattern) === JSON.stringify(expectedPattern);
      
      return {
        message: () => `Expected interaction pattern ${JSON.stringify(expectedPattern)}, but got ${JSON.stringify(actualPattern)}`,
        pass
      };
    }
  });
};

/**
 * Create comprehensive test environment for input buffering
 */
const createTestEnvironment = (overrides = {}) => {
  const system = createMockInputHandlerSystem(overrides);
  
  return {
    ...system,
    // Test utilities
    simulateTyping: async (text, delayMs = 0) => {
      const results = [];
      for (const char of text) {
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        system.inputElement.value = system.inputElement.value + char;
        const keyEvent = { key: char, target: system.inputElement };
        
        // Simulate the input handling
        const isEnter = system.enterKeyDetector.isEnterKey(keyEvent);
        if (isEnter) {
          results.push({ type: 'enter', value: system.inputElement.value });
        } else {
          results.push({ type: 'char', char, value: system.inputElement.value });
        }
      }
      return results;
    },
    
    simulateEnterKey: async () => {
      const enterEvent = { key: 'Enter', keyCode: 13, target: system.inputElement };
      system.enterKeyDetector.isEnterKey.mockReturnValue(true);
      return enterEvent;
    },
    
    getBufferedInput: () => {
      return system.inputBuffer.getCurrentLine();
    },
    
    clearInput: () => {
      system.inputElement.value = '';
      system.inputBuffer.clear();
    },
    
    verifyNoCharacterSending: () => {
      mockVerification.verifyNoCharacterSending(system.webSocket);
    },
    
    verifyCommandSent: (expectedCommand) => {
      mockVerification.verifyWebSocketSendOnce(system.webSocket, expectedCommand);
    }
  };
};

/**
 * Input buffering test scenarios
 */
const inputBufferingScenarios = {
  /**
   * Scenario: User types command and presses Enter
   */
  completeCommandEntry: async (testEnv, command) => {
    // Simulate typing without Enter
    await testEnv.simulateTyping(command);
    testEnv.verifyNoCharacterSending();
    
    // Simulate Enter key
    const enterEvent = await testEnv.simulateEnterKey();
    
    return {
      command,
      enterEvent,
      finalValue: testEnv.inputElement.value
    };
  },

  /**
   * Scenario: User types partial command (no Enter)
   */
  partialCommandEntry: async (testEnv, partialCommand) => {
    await testEnv.simulateTyping(partialCommand);
    
    return {
      buffered: testEnv.getBufferedInput(),
      sent: false
    };
  },

  /**
   * Scenario: Rapid typing with eventual Enter
   */
  rapidTypingWithEnter: async (testEnv, command, typingSpeed = 50) => {
    const startTime = Date.now();
    await testEnv.simulateTyping(command, typingSpeed);
    const typingDuration = Date.now() - startTime;
    
    testEnv.verifyNoCharacterSending();
    
    const enterEvent = await testEnv.simulateEnterKey();
    
    return {
      command,
      typingDuration,
      enterEvent
    };
  },

  /**
   * Scenario: Mixed character types (special chars, numbers, letters)
   */
  mixedCharacterInput: async (testEnv) => {
    const mixedInput = 'echo "Hello, World! 123 @#$%"';
    const results = await testEnv.simulateTyping(mixedInput);
    
    testEnv.verifyNoCharacterSending();
    
    return {
      input: mixedInput,
      characterTypes: results.map(r => ({
        char: r.char,
        isAlphaNumeric: /[a-zA-Z0-9]/.test(r.char),
        isSpecial: /[^a-zA-Z0-9\s]/.test(r.char)
      }))
    };
  }
};

/**
 * Performance testing utilities
 */
const performanceTestUtils = {
  measureInputHandling: async (testEnv, inputSize = 1000) => {
    const longInput = 'a'.repeat(inputSize);
    
    const startTime = performance.now();
    await testEnv.simulateTyping(longInput);
    const endTime = performance.now();
    
    return {
      inputSize,
      duration: endTime - startTime,
      charactersPerMs: inputSize / (endTime - startTime)
    };
  },

  stressTestCharacterPrevention: async (testEnv, iterations = 100) => {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      await testEnv.simulateTyping(randomChar);
      
      results.push({
        iteration: i,
        char: randomChar,
        webSocketCalls: testEnv.webSocket.send.mock.calls.length
      });
    }
    
    return results;
  }
};

/**
 * Contract testing utilities
 */
const contractTestUtils = {
  verifyInputHandlerContract: (handler) => {
    const requiredMethods = [
      'handleKeyDown',
      'handleInput', 
      'sendCommand',
      'clearInput'
    ];
    
    return contractVerification.verifyInputHandlerContract(handler);
  },

  verifyWebSocketContract: (webSocket) => {
    return contractVerification.verifyWebSocketContract(webSocket);
  },

  verifyEnterKeyDetectorContract: (detector) => {
    return contractVerification.verifyEnterKeyDetectorContract(detector);
  }
};

/**
 * Export all test utilities
 */
module.exports = {
  setupInputBufferingTests,
  createTestEnvironment,
  inputBufferingScenarios,
  performanceTestUtils,
  contractTestUtils,
  mockVerification,
  contractVerification
};