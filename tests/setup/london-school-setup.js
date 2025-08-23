/**
 * London School TDD Test Setup
 * Focus: Configure Jest environment for mock-driven development
 * Approach: Emphasize collaboration testing patterns
 */

// Import custom matchers for London School testing
import { setupLondonSchoolTestEnvironment } from '../utils/mock-utilities.js';

// Global test setup
let testEnvironmentCleanup;

beforeAll(() => {
  // Setup London School test environment
  testEnvironmentCleanup = setupLondonSchoolTestEnvironment();
  
  // Configure global test behavior
  jest.setTimeout(10000); // 10 second timeout for async collaboration tests
  
  // Suppress console warnings from mocks during tests
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Suppress known mock warnings
    if (args[0] && args[0].includes('mock')) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  // Cleanup test environment
  if (testEnvironmentCleanup && testEnvironmentCleanup.restoreConsole) {
    testEnvironmentCleanup.restoreConsole();
  }
});

// Enhanced expect matchers for London School TDD
expect.extend({
  // Verify that mock was called before another mock (collaboration order)
  toHaveBeenCalledBefore(received, other) {
    const receivedCalls = received.mock.invocationCallOrder || [];
    const otherCalls = other.mock.invocationCallOrder || [];
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called, but it was never called`,
        pass: false
      };
    }
    
    if (otherCalls.length === 0) {
      return {
        message: () => `Expected ${other.getMockName()} to have been called for comparison, but it was never called`,
        pass: false
      };
    }
    
    const receivedFirst = Math.min(...receivedCalls);
    const otherFirst = Math.min(...otherCalls);
    
    const pass = receivedFirst < otherFirst;
    
    return {
      message: () => pass
        ? `Expected ${received.getMockName()} NOT to be called before ${other.getMockName()}`
        : `Expected ${received.getMockName()} to be called before ${other.getMockName()}`,
      pass
    };
  },

  // Verify mock interaction pattern matches expected collaboration sequence
  toFollowCollaborationPattern(systemUnderTest, expectedPattern) {
    const calls = jest.getAllMockCalls();
    const relevantCalls = calls
      .filter(call => expectedPattern.some(expected => call[0].includes(expected)))
      .map(call => call[0]);
    
    const pass = expectedPattern.every((expected, index) => {
      const actualCall = relevantCalls[index];
      return actualCall && actualCall.includes(expected);
    });
    
    return {
      message: () => pass
        ? `Expected system NOT to follow pattern ${JSON.stringify(expectedPattern)}`
        : `Expected collaboration pattern ${JSON.stringify(expectedPattern)}, but got ${JSON.stringify(relevantCalls)}`,
      pass
    };
  },

  // Verify that collaborator contracts are satisfied
  toSatisfyCollaboratorContract(mock, contract) {
    const missingMethods = [];
    const invalidMethods = [];
    
    if (!contract.interface) {
      return {
        message: () => 'Contract must define an interface',
        pass: false
      };
    }
    
    Object.keys(contract.interface).forEach(methodName => {
      if (!mock.hasOwnProperty(methodName)) {
        missingMethods.push(methodName);
      } else if (typeof mock[methodName] !== 'function') {
        invalidMethods.push(methodName);
      }
    });
    
    const pass = missingMethods.length === 0 && invalidMethods.length === 0;
    
    return {
      message: () => pass
        ? `Expected mock NOT to satisfy contract`
        : `Mock contract violation. Missing: [${missingMethods.join(', ')}], Invalid: [${invalidMethods.join(', ')}]`,
      pass
    };
  },

  // Verify error propagation through collaboration chain
  toHaveReceivedErrorFrom(errorHandler, sourceError, collaborator) {
    const errorHandlerCalls = errorHandler.mock.calls;
    const collaboratorCalls = collaborator.mock.calls;
    
    const errorReceived = errorHandlerCalls.some(call => 
      call.some(arg => 
        arg && arg.message === sourceError.message
      )
    );
    
    const collaboratorCalled = collaboratorCalls.length > 0;
    
    const pass = errorReceived && collaboratorCalled;
    
    return {
      message: () => pass
        ? `Expected error handler NOT to receive error from collaborator`
        : `Expected error handler to receive error "${sourceError.message}" from collaborator`,
      pass
    };
  },

  // Verify mock state isolation between tests
  toBeProperlyReset(mock) {
    const callCount = mock.mock.calls.length;
    const returnValueCount = mock.mock.results.length;
    const instanceCount = mock.mock.instances.length;
    
    const pass = callCount === 0 && returnValueCount === 0 && instanceCount === 0;
    
    return {
      message: () => pass
        ? `Expected mock NOT to be properly reset`
        : `Expected mock to be reset. Found ${callCount} calls, ${returnValueCount} results, ${instanceCount} instances`,
      pass
    };
  },

  // Verify data transformation correctness in collaboration
  toTransformDataCorrectly(transformerMock, inputData, expectedOutput) {
    const calls = transformerMock.mock.calls;
    const results = transformerMock.mock.results;
    
    const correctInput = calls.some(call => 
      JSON.stringify(call[0]) === JSON.stringify(inputData)
    );
    
    const correctOutput = results.some(result => 
      result.type === 'return' && 
      JSON.stringify(result.value) === JSON.stringify(expectedOutput)
    );
    
    const pass = correctInput && correctOutput;
    
    return {
      message: () => pass
        ? `Expected transformer NOT to transform data correctly`
        : `Expected transformer to transform ${JSON.stringify(inputData)} to ${JSON.stringify(expectedOutput)}`,
      pass
    };
  }
});

// Global mock behavior helpers
global.createMockCollaboratorSet = (collaboratorNames) => {
  const collaborators = {};
  
  collaboratorNames.forEach(name => {
    collaborators[name] = jest.fn();
  });
  
  return collaborators;
};

// Global test data generators
global.TestDataGenerators = {
  createMockError: (type = 'Error', message = 'Mock error') => {
    const error = new Error(message);
    error.name = type;
    return error;
  },
  
  createMockCollaborationContext: (collaborators) => ({
    mocks: collaborators,
    verifyCallOrder: (...methods) => {
      const callOrders = methods.map(method => 
        method.mock.invocationCallOrder[0] || Infinity
      );
      
      return callOrders.every((order, index) => 
        index === 0 || order > callOrders[index - 1]
      );
    }
  })
};

// Global cleanup helpers
global.cleanupMocks = (...mocks) => {
  mocks.forEach(mock => {
    if (mock && typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
};

// Mock validation helpers
global.validateMockContracts = (mocks, contracts) => {
  Object.keys(contracts).forEach(contractName => {
    const mock = mocks[contractName];
    const contract = contracts[contractName];
    
    if (mock && contract) {
      expect(mock).toSatisfyCollaboratorContract(contract);
    }
  });
};

// London School specific test utilities
global.LondonSchoolUtils = {
  // Create system under test with injected mocks
  createSystemWithMocks: (SystemClass, mocks) => {
    return new SystemClass(...Object.values(mocks));
  },
  
  // Verify collaboration invariants
  verifyInvariants: (invariants, mocks) => {
    invariants.forEach(invariant => {
      expect(invariant.check(mocks)).toBe(true);
    });
  },
  
  // Setup coordinated mock behavior
  setupMockScenario: (scenario, mocks) => {
    scenario.setup(mocks);
    return scenario.cleanup;
  }
};

// Test performance monitoring for London School patterns
const testPerformanceMonitor = {
  startTime: null,
  mockCallCounts: {},
  
  beforeEach: () => {
    testPerformanceMonitor.startTime = Date.now();
    testPerformanceMonitor.mockCallCounts = {};
  },
  
  afterEach: () => {
    const endTime = Date.now();
    const duration = endTime - testPerformanceMonitor.startTime;
    
    // Log performance warnings for slow tests
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow test detected: ${duration}ms. Consider optimizing mock interactions.`);
    }
  }
};

// Register performance monitoring
beforeEach(testPerformanceMonitor.beforeEach);
afterEach(testPerformanceMonitor.afterEach);

// Export utilities for use in tests
export {
  testPerformanceMonitor,
  testEnvironmentCleanup
};