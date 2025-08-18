/**
 * Test Setup - London School TDD Configuration
 * Mock-driven development setup for all test suites
 */

import { jest } from '@jest/globals';
import { MockFactory } from '../factories/mock-factory.js';
import { SwarmTestCoordinator } from '../helpers/swarm-coordinator.js';

// Global test configuration
global.mockFactory = new MockFactory();
global.swarmCoordinator = new SwarmTestCoordinator();

// Jest custom matchers for London School TDD
expect.extend({
  // Verify mock call order
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (!receivedCalls.length || !expectedCalls.length) {
      return {
        message: () => 'Expected both mocks to have been called',
        pass: false
      };
    }
    
    const lastReceivedCall = Math.max(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    const pass = lastReceivedCall < firstExpectedCall;
    
    return {
      message: () => 
        pass 
          ? `Expected ${received.getMockName()} not to be called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to be called before ${expected.getMockName()}`,
      pass
    };
  },
  
  // Verify contract compliance
  toSatisfyContract(received, contract) {
    const mockCalls = received.mock.calls;
    const contractViolations = [];
    
    // Check input parameters
    mockCalls.forEach((call, index) => {
      if (contract.input && !this.utils.deepEqual(call[0], contract.input)) {
        contractViolations.push(`Call ${index}: input mismatch`);
      }
    });
    
    // Check output values
    const mockResults = received.mock.results;
    mockResults.forEach((result, index) => {
      if (contract.output && !this.utils.deepEqual(result.value, contract.output)) {
        contractViolations.push(`Call ${index}: output mismatch`);
      }
    });
    
    const pass = contractViolations.length === 0;
    
    return {
      message: () => 
        pass 
          ? `Expected mock not to satisfy contract`
          : `Contract violations: ${contractViolations.join(', ')}`,
      pass
    };
  },
  
  // Verify interaction patterns
  toFollowInteractionPattern(received, pattern) {
    const allMockCalls = jest.getAllMockCalls();
    const patternMatches = pattern.every((step, index) => {
      const call = allMockCalls[index];
      return call && call[0] === step.mock && 
             this.utils.deepEqual(call[1], step.args);
    });
    
    return {
      message: () => 
        patternMatches 
          ? `Expected not to follow interaction pattern`
          : `Expected to follow interaction pattern: ${JSON.stringify(pattern)}`,
      pass: patternMatches
    };
  }
});

// Global test hooks
beforeEach(async () => {
  // Initialize test environment
  await global.swarmCoordinator.initializeTest();
  
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup test-specific mocks
  global.mockClaudeCodeTools = global.mockFactory.createClaudeCodeMocks();
  global.mockAgentLinkAPI = global.mockFactory.createAgentLinkMocks();
  global.mockSwarmCoordination = global.mockFactory.createSwarmMocks();
});

afterEach(async () => {
  // Verify no unexpected interactions
  global.swarmCoordinator.verifyNoUnexpectedInteractions();
  
  // Clean up test environment
  await global.swarmCoordinator.cleanupTest();
  
  // Report test results to swarm
  await global.swarmCoordinator.reportTestResults();
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});