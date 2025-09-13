/**
 * TDD London School Test Setup
 * 
 * Global test configuration and utilities for mock-driven
 * behavior verification testing.
 */

// Jest globals are available in test environment
// const { jest } = require('@jest/globals');

// Global test configuration
global.TDD_LONDON_SCHOOL_MODE = true;
global.BEHAVIOR_VERIFICATION_ENABLED = true;

// Enhanced mock tracking for London School testing (only in test environment)
if (typeof jest !== 'undefined') {
  const originalJestFn = jest.fn;
  jest.fn = function(implementation) {
  const mockFn = originalJestFn(implementation);
  
  // Add call order tracking
  const originalMockCall = mockFn.mockImplementation;
  mockFn.mockImplementation = function(impl) {
    return originalMockCall.call(this, function(...args) {
      // Track call order for interaction testing
      if (!mockFn.mock.invocationCallOrder) {
        mockFn.mock.invocationCallOrder = [];
      }
      mockFn.mock.invocationCallOrder.push(Date.now() + Math.random());
      
      if (impl) {
        return impl.apply(this, args);
      }
    });
  };
  
  // Initialize call order tracking
  mockFn.mock.invocationCallOrder = [];
  
  return mockFn;
  };
}

// Custom matchers for London School testing patterns (only in test environment)
if (typeof expect !== 'undefined') {
  expect.extend({
  /**
   * Verify that one mock was called before another (London School interaction testing)
   */
  toHaveBeenCalledBefore(received, expected) {
    if (!received.mock || !expected.mock) {
      return {
        message: () => 'Both arguments must be Jest mock functions',
        pass: false
      };
    }
    
    if (!received.mock.invocationCallOrder || !expected.mock.invocationCallOrder) {
      return {
        message: () => 'Mock functions must have call order tracking enabled',
        pass: false
      };
    }
    
    const receivedFirstCall = received.mock.invocationCallOrder[0];
    const expectedFirstCall = expected.mock.invocationCallOrder[0];
    
    if (!receivedFirstCall || !expectedFirstCall) {
      return {
        message: () => 'Both mock functions must have been called',
        pass: false
      };
    }
    
    const pass = receivedFirstCall < expectedFirstCall;
    
    return {
      message: () => pass 
        ? `Expected ${received.getMockName() || 'mock function'} NOT to be called before ${expected.getMockName() || 'mock function'}`
        : `Expected ${received.getMockName() || 'mock function'} to be called before ${expected.getMockName() || 'mock function'}`,
      pass
    };
  },
  
  /**
   * Verify mock was called with contract-compliant arguments
   */
  toHaveBeenCalledWithContract(received, contractSpec) {
    if (!received.mock) {
      return {
        message: () => 'Argument must be a Jest mock function',
        pass: false
      };
    }
    
    const calls = received.mock.calls;
    if (calls.length === 0) {
      return {
        message: () => 'Mock function was not called',
        pass: false
      };
    }
    
    // Check if any call matches the contract
    const matchingCall = calls.find(callArgs => {
      return this.equals(callArgs[0], expect.objectContaining(contractSpec));
    });
    
    const pass = !!matchingCall;
    
    return {
      message: () => pass
        ? `Expected mock function NOT to be called with contract: ${this.utils.printExpected(contractSpec)}`
        : `Expected mock function to be called with contract: ${this.utils.printExpected(contractSpec)}`,
      pass
    };
  },
  
  /**
   * Verify that mock interactions follow expected collaboration pattern
   */
  toFollowCollaborationPattern(received, pattern) {
    if (!Array.isArray(received)) {
      return {
        message: () => 'Expected an array of mock functions',
        pass: false
      };
    }
    
    // Verify all mocks were called
    const uncalledMocks = received.filter(mock => mock.mock.calls.length === 0);
    if (uncalledMocks.length > 0) {
      return {
        message: () => `The following mocks were not called: ${uncalledMocks.map(m => m.getMockName()).join(', ')}`,
        pass: false
      };
    }
    
    // Verify call order matches pattern
    if (pattern.order && pattern.order === 'sequential') {
      for (let i = 1; i < received.length; i++) {
        const prevMock = received[i - 1];
        const currentMock = received[i];
        
        const prevCallTime = prevMock.mock.invocationCallOrder[0];
        const currentCallTime = currentMock.mock.invocationCallOrder[0];
        
        if (prevCallTime >= currentCallTime) {
          return {
            message: () => `Mock ${prevMock.getMockName()} should be called before ${currentMock.getMockName()}`,
            pass: false
          };
        }
      }
    }
    
    return {
      message: () => 'Collaboration pattern matches expected behavior',
      pass: true
    };
  },
  
  /**
   * Verify that no mock data patterns are present in arguments
   */
  toNotContainMockDataPatterns(received) {
    const mockDataPatterns = [
      /lorem ipsum/i,
      /sample data/i,
      /test data/i,
      /example/i,
      /mock/i,
      /fake/i,
      /placeholder/i,
      /dummy/i
    ];
    
    const stringified = JSON.stringify(received);
    const foundPatterns = mockDataPatterns.filter(pattern => pattern.test(stringified));
    
    const pass = foundPatterns.length === 0;
    
    return {
      message: () => pass
        ? 'No mock data patterns found'
        : `Found mock data patterns: ${foundPatterns.join(', ')}`,
      pass
    };
  }
  });
}

// Mock factory for consistent London School mock creation (only in test environment)
if (typeof jest !== 'undefined') {
  global.createLondonSchoolMock = function(name, methods = {}) {
    const mock = {};
    
    Object.keys(methods).forEach(methodName => {
      mock[methodName] = jest.fn(methods[methodName]);
      mock[methodName].getMockName = () => `${name}.${methodName}`;
    });
    
    return mock;
  };
}

// Behavior verification utilities (only in test environment)
if (typeof expect !== 'undefined') {
  global.verifyMockInteractions = function(mocks, expectedPattern) {
    const mockArray = Array.isArray(mocks) ? mocks : [mocks];
    
    return expect(mockArray).toFollowCollaborationPattern(expectedPattern);
  };

  // Contract testing utilities
  global.expectContractCompliance = function(mock, contract) {
    return expect(mock).toHaveBeenCalledWithContract(contract);
  };
}

// Setup test environment logging
console.log('TDD London School test environment initialized');
console.log('- Behavior verification: enabled');
console.log('- Mock interaction tracking: enabled');
console.log('- Contract testing utilities: loaded');

// Global cleanup after each test (only in test environment)
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    // Reset all mock call order tracking
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
    
    // Verify no mock data patterns were used in test
    if (global.BEHAVIOR_VERIFICATION_ENABLED) {
      // This could be expanded to automatically check for mock data usage
    }
  });
}

// Global test hooks for London School patterns (only in test environment)
if (typeof beforeAll !== 'undefined') {
  beforeAll(() => {
    console.log('Starting TDD London School test suite');
  });
}

if (typeof afterAll !== 'undefined') {
  afterAll(() => {
    console.log('Completed TDD London School test suite');
  });
}