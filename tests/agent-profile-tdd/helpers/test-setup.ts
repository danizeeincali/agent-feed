/**
 * Test Setup for London School TDD Agent Profile Suite
 * Configures mocks, matchers, and test environment
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { beforeEach, afterEach, expect } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import { swarmCoordinator } from './swarm-coordinator';

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// London School TDD: Mock-first approach setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Initialize swarm test coordination
  swarmCoordinator.initializeTestSession();
  
  // Setup default mock behaviors
  setupDefaultMocks();
});

afterEach(() => {
  // Cleanup React components
  cleanup();
  
  // Verify all mock expectations were met
  verifyMockExpectations();
  
  // Report test results to swarm
  swarmCoordinator.reportTestCompletion();
});

// Global mock setup for London School approach
function setupDefaultMocks() {
  // Mock console methods to avoid noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  };
  
  // Mock window.location for navigation tests
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn()
    },
    writable: true
  });
  
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
  
  // Mock fetch for API calls
  global.fetch = jest.fn();
}

// Verify that all mock expectations were satisfied
function verifyMockExpectations() {
  // Check that all mocks were called as expected
  // This is crucial for London School TDD
  const allMocks = getMockRegistry();
  
  allMocks.forEach(mock => {
    if (mock.expectedCalls && !mock.verifyExpectations()) {
      throw new Error(`Mock ${mock.name} expectations not met`);
    }
  });
}

// Registry to track all mocks for verification
const mockRegistry = new Set();

function getMockRegistry() {
  return Array.from(mockRegistry);
}

// Custom matchers for London School TDD
expect.extend({
  toHaveBeenCalledInOrder(received, expectedCalls) {
    const actualCalls = received.mock.calls;
    let callIndex = 0;
    
    for (const expectedCall of expectedCalls) {
      let found = false;
      
      while (callIndex < actualCalls.length) {
        if (this.equals(actualCalls[callIndex], expectedCall)) {
          found = true;
          callIndex++;
          break;
        }
        callIndex++;
      }
      
      if (!found) {
        return {
          message: () => 
            `Expected call ${JSON.stringify(expectedCall)} was not found in order`,
          pass: false
        };
      }
    }
    
    return {
      message: () => 'All calls were made in expected order',
      pass: true
    };
  },
  
  toHaveInteractionContract(received, contract) {
    const mockCalls = received.mock.calls;
    const contractViolations = [];
    
    // Verify contract compliance
    contract.forEach((rule, index) => {
      if (!mockCalls[index] || !rule.matcher(mockCalls[index])) {
        contractViolations.push(`Contract violation at call ${index}: ${rule.description}`);
      }
    });
    
    return {
      message: () => contractViolations.length > 0 
        ? `Contract violations: ${contractViolations.join(', ')}`
        : 'All contract rules satisfied',
      pass: contractViolations.length === 0
    };
  }
});

// Export utilities for tests
export { mockRegistry, swarmCoordinator };