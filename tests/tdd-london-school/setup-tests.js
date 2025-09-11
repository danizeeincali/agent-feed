/**
 * London School TDD Test Setup
 * Configures mock-driven testing environment with behavior verification
 */

import '@testing-library/jest-dom';

// Mock coordination for London School TDD
global.mockRegistry = new Map();
global.contractRegistry = new Map();
global.interactionHistory = [];

// Enhanced mock factory for London School methodology
global.createSwarmMock = (name, methods = {}) => {
  const mockInstance = {};
  const mockMethods = {};
  
  Object.keys(methods).forEach(methodName => {
    if (typeof methods[methodName] === 'function') {
      mockMethods[methodName] = jest.fn(methods[methodName]);
    } else {
      mockMethods[methodName] = jest.fn().mockResolvedValue(methods[methodName]);
    }
    
    // Track interactions for behavior verification
    mockMethods[methodName].mockImplementation((...args) => {
      global.interactionHistory.push({
        mock: name,
        method: methodName,
        args: args,
        timestamp: Date.now()
      });
      
      return methods[methodName] && typeof methods[methodName] === 'function' 
        ? methods[methodName](...args)
        : methods[methodName];
    });
  });
  
  Object.assign(mockInstance, mockMethods);
  global.mockRegistry.set(name, mockInstance);
  
  return mockInstance;
};

// Contract verification utilities
global.defineContract = (serviceName, contract) => {
  global.contractRegistry.set(serviceName, contract);
};

global.verifyContract = (serviceName, implementation) => {
  const contract = global.contractRegistry.get(serviceName);
  if (!contract) {
    throw new Error(`No contract defined for service: ${serviceName}`);
  }
  
  const missingMethods = Object.keys(contract).filter(method => 
    typeof implementation[method] !== 'function'
  );
  
  if (missingMethods.length > 0) {
    throw new Error(`Contract violation for ${serviceName}. Missing methods: ${missingMethods.join(', ')}`);
  }
  
  return true;
};

// Interaction verification utilities
global.verifyInteractionSequence = (expectedSequence) => {
  const actualSequence = global.interactionHistory.map(interaction => ({
    mock: interaction.mock,
    method: interaction.method
  }));
  
  expectedSequence.forEach((expected, index) => {
    const actual = actualSequence[index];
    if (!actual || actual.mock !== expected.mock || actual.method !== expected.method) {
      throw new Error(`Interaction sequence mismatch at index ${index}. Expected: ${expected.mock}.${expected.method}, Actual: ${actual ? `${actual.mock}.${actual.method}` : 'undefined'}`);
    }
  });
};

global.clearInteractionHistory = () => {
  global.interactionHistory = [];
};

// London School specific matchers
expect.extend({
  toHaveBeenCalledBefore(received, other) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    if (!receivedCalls || !otherCalls || receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        message: () => 'Both functions must have been called to verify order',
        pass: false
      };
    }
    
    const lastReceived = Math.max(...receivedCalls);
    const firstOther = Math.min(...otherCalls);
    
    const pass = lastReceived < firstOther;
    
    return {
      message: () => pass 
        ? `Expected ${received.getMockName()} not to be called before ${other.getMockName()}`
        : `Expected ${received.getMockName()} to be called before ${other.getMockName()}`,
      pass
    };
  },
  
  toSatisfyContract(received, contract) {
    const missingMethods = Object.keys(contract).filter(method => 
      typeof received[method] !== 'function'
    );
    
    const pass = missingMethods.length === 0;
    
    return {
      message: () => pass 
        ? `Expected object not to satisfy contract`
        : `Expected object to satisfy contract. Missing methods: ${missingMethods.join(', ')}`,
      pass
    };
  }
});

// Global test utilities
global.waitFor = async (condition, timeout = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Condition not met within timeout');
};

// Clean up after each test
afterEach(() => {
  global.mockRegistry.clear();
  global.clearInteractionHistory();
  jest.clearAllMocks();
});

// Environment setup
beforeAll(() => {
  // Mock console methods to reduce noise in tests
  global.console.log = jest.fn();
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
  
  // Mock window.location for navigation tests
  delete window.location;
  window.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  };
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});