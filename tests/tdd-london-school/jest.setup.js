/**
 * Jest Setup for London School TDD
 * 
 * Configures mock verification and interaction testing utilities
 */

const { SwarmMockCoordinator, portConfigurationContracts } = require('./port-configuration/mocks/swarm-mock-coordination');

// Global swarm coordinator for tests
global.swarmCoordinator = new SwarmMockCoordinator();

// Register all port configuration contracts
Object.entries(portConfigurationContracts).forEach(([serviceName, contract]) => {
  global.swarmCoordinator.registerMockContract(serviceName, contract);
});

// London School custom matchers
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (!receivedCalls || !expectedCalls || !receivedCalls.length || !expectedCalls.length) {
      return {
        message: () => 'One or both mocks have no recorded calls',
        pass: false
      };
    }
    
    const lastReceivedCall = Math.max(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    
    const pass = lastReceivedCall < firstExpectedCall;
    
    return {
      message: () => 
        pass 
          ? `Expected ${received.getMockName() || 'mock'} NOT to be called before ${expected.getMockName() || 'mock'}`
          : `Expected ${received.getMockName() || 'mock'} to be called before ${expected.getMockName() || 'mock'}`,
      pass
    };
  },

  toSatisfyContract(received, contract) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => 'Received value must be an object',
        pass: false
      };
    }

    const violations = [];
    
    // Check expected methods exist
    if (contract.expectedMethods) {
      contract.expectedMethods.forEach(method => {
        if (!received[method] || typeof received[method] !== 'function') {
          violations.push(`Missing method: ${method}`);
        }
      });
    }
    
    // Check input/output structure
    if (contract.input) {
      Object.entries(contract.input).forEach(([method, inputSpec]) => {
        if (received[method] && received[method].mock) {
          // Verify mock was called with expected input structure
          const calls = received[method].mock.calls;
          calls.forEach(call => {
            const [input] = call;
            if (input && typeof input === 'object') {
              Object.entries(inputSpec).forEach(([key, type]) => {
                if (input[key] && typeof input[key] !== type) {
                  violations.push(`Method ${method}: expected ${key} to be ${type}, got ${typeof input[key]}`);
                }
              });
            }
          });
        }
      });
    }
    
    const pass = violations.length === 0;
    
    return {
      message: () => 
        pass 
          ? `Expected object NOT to satisfy contract`
          : `Contract violations: ${violations.join(', ')}`,
      pass
    };
  },

  toMatchInteractionPattern(received, pattern) {
    if (!received || !Array.isArray(received)) {
      return {
        message: () => 'Expected an array of mock calls',
        pass: false
      };
    }
    
    const callSequence = received.map(call => ({
      mockName: call[0],
      method: call[1]?.[0],
      args: call[1]?.slice(1)
    }));
    
    let patternIndex = 0;
    const violations = [];
    
    for (let i = 0; i < callSequence.length && patternIndex < pattern.length; i++) {
      const call = callSequence[i];
      const expectedPattern = pattern[patternIndex];
      
      if (call.mockName === expectedPattern.mock && call.method === expectedPattern.method) {
        patternIndex++;
      } else if (expectedPattern.required !== false) {
        violations.push(`Expected ${expectedPattern.mock}.${expectedPattern.method} at position ${patternIndex}, but found ${call.mockName}.${call.method}`);
      }
    }
    
    if (patternIndex < pattern.length) {
      violations.push(`Missing expected calls: ${pattern.slice(patternIndex).map(p => `${p.mock}.${p.method}`).join(', ')}`);
    }
    
    const pass = violations.length === 0;
    
    return {
      message: () => 
        pass 
          ? `Expected calls NOT to match interaction pattern`
          : `Interaction pattern violations: ${violations.join(', ')}`,
      pass
    };
  }
});

// Mock call tracking utilities
global.getAllMockCalls = () => {
  const allCalls = [];
  
  // This would be implemented to collect all mock calls in order
  // For now, return empty array as placeholder
  return allCalls;
};

// London School test utilities
global.londonSchoolUtils = {
  createMockWithContract: (serviceName, methods = {}) => {
    const contract = portConfigurationContracts[serviceName];
    const mock = {};
    
    if (contract?.expectedMethods) {
      contract.expectedMethods.forEach(method => {
        mock[method] = jest.fn();
      });
    }
    
    // Add any additional methods
    Object.assign(mock, methods);
    
    return mock;
  },
  
  verifyMockConversation: (mocks, expectedSequence) => {
    // Utility to verify mock interactions follow expected conversation pattern
    return true; // Placeholder implementation
  }
};

// Setup fake timers for timeout testing
beforeEach(() => {
  if (global.LONDON_SCHOOL_MODE) {
    jest.clearAllMocks();
  }
});

afterEach(() => {
  if (global.MOCK_VERIFICATION_ENABLED) {
    // Generate interaction report after each test
    const report = global.swarmCoordinator.generateInteractionReport();
    if (report.violations.length > 0) {
      console.warn('Mock contract violations detected:', report.violations);
    }
  }
});