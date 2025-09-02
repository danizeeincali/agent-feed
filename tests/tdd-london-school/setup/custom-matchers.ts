/**
 * Custom Jest Matchers for London School TDD
 * 
 * Specialized matchers for testing object interactions and behaviors
 * Focus on HOW objects collaborate rather than WHAT they contain
 */

import { jest, expect } from '@jest/globals';

/**
 * Matcher: toHaveBeenCalledBefore
 * Verifies that one mock was called before another (interaction sequencing)
 */
expect.extend({
  toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    const firstReceivedCall = Math.min(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    
    const pass = firstReceivedCall < firstExpectedCall;
    
    return {
      message: () => 
        pass
          ? `Expected ${received.getMockName()} NOT to have been called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass,
    };
  },
});

/**
 * Matcher: toHaveBeenCalledAfter
 * Verifies that one mock was called after another (interaction sequencing)
 */
expect.extend({
  toHaveBeenCalledAfter(received: jest.Mock, expected: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called after ${expected.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    if (expectedCalls.length === 0) {
      return {
        message: () => `Expected ${expected.getMockName()} to have been called before ${received.getMockName()}, but it was never called`,
        pass: false,
      };
    }
    
    const lastReceivedCall = Math.max(...receivedCalls);
    const lastExpectedCall = Math.max(...expectedCalls);
    
    const pass = lastReceivedCall > lastExpectedCall;
    
    return {
      message: () => 
        pass
          ? `Expected ${received.getMockName()} NOT to have been called after ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to have been called after ${expected.getMockName()}`,
      pass,
    };
  },
});

/**
 * Matcher: toHaveInteractionPattern
 * Verifies a specific pattern of interactions between mocks
 */
expect.extend({
  toHaveInteractionPattern(received: jest.Mock[], pattern: string[]) {
    if (!Array.isArray(received)) {
      return {
        message: () => `Expected an array of mocks, received ${typeof received}`,
        pass: false,
      };
    }
    
    const interactions = global.mockInteractionTracker.getInteractions();
    const actualPattern = interactions.map(i => i.mockName);
    
    const pass = JSON.stringify(actualPattern) === JSON.stringify(pattern);
    
    return {
      message: () => 
        pass
          ? `Expected interaction pattern NOT to match ${JSON.stringify(pattern)}`
          : `Expected interaction pattern ${JSON.stringify(actualPattern)} to match ${JSON.stringify(pattern)}`,
      pass,
    };
  },
});

/**
 * Matcher: toHaveBeenCalledWithContract
 * Verifies that a mock was called with arguments matching a contract
 */
expect.extend({
  toHaveBeenCalledWithContract(received: jest.Mock, contract: Record<string, any>) {
    if (!received.mock.calls.length) {
      return {
        message: () => `Expected ${received.getMockName()} to have been called with contract, but it was never called`,
        pass: false,
      };
    }
    
    const lastCall = received.mock.calls[received.mock.calls.length - 1];
    const [actualArg] = lastCall;
    
    // Check if actual arguments satisfy the contract
    const satisfiesContract = Object.keys(contract).every(key => {
      const expectedValue = contract[key];
      const actualValue = actualArg?.[key];
      
      if (typeof expectedValue === 'function') {
        return expectedValue(actualValue);
      }
      
      return actualValue === expectedValue;
    });
    
    return {
      message: () => 
        satisfiesContract
          ? `Expected ${received.getMockName()} NOT to have been called with contract ${JSON.stringify(contract)}`
          : `Expected ${received.getMockName()} to have been called with contract ${JSON.stringify(contract)}, but received ${JSON.stringify(actualArg)}`,
      pass: satisfiesContract,
    };
  },
});

/**
 * Matcher: toHaveCollaboratedWith
 * Verifies that two mocks have interacted in some way (London School collaboration testing)
 */
expect.extend({
  toHaveCollaboratedWith(received: jest.Mock, collaborator: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const collaboratorCalls = collaborator.mock.invocationCallOrder;
    
    const hasCollaboration = receivedCalls.length > 0 && collaboratorCalls.length > 0;
    
    return {
      message: () => 
        hasCollaboration
          ? `Expected ${received.getMockName()} NOT to have collaborated with ${collaborator.getMockName()}`
          : `Expected ${received.getMockName()} to have collaborated with ${collaborator.getMockName()}`,
      pass: hasCollaboration,
    };
  },
});

/**
 * Matcher: toHaveResourcesCleanedUp
 * Verifies that cleanup mocks were called appropriately
 */
expect.extend({
  toHaveResourcesCleanedUp(received: { close?: jest.Mock; disconnect?: jest.Mock; removeEventListener?: jest.Mock; cleanup?: jest.Mock; }) {
    const cleanupMethods = ['close', 'disconnect', 'removeEventListener', 'cleanup'];
    const calledCleanupMethods = cleanupMethods.filter(method => {
      const mock = received[method as keyof typeof received];
      return mock && mock.mock && mock.mock.calls.length > 0;
    });
    
    const hasCleanup = calledCleanupMethods.length > 0;
    
    return {
      message: () => 
        hasCleanup
          ? `Expected resources NOT to be cleaned up, but these methods were called: ${calledCleanupMethods.join(', ')}`
          : `Expected resources to be cleaned up, but none of these methods were called: ${cleanupMethods.join(', ')}`,
      pass: hasCleanup,
    };
  },
});

/**
 * Matcher: toHaveNoResourceLeaks
 * Verifies that no resources are accumulating (for resource leak tests)
 */
expect.extend({
  toHaveNoResourceLeaks(received: { initial: number; current: number; threshold: number }) {
    const { initial, current, threshold } = received;
    const growth = current - initial;
    const hasLeaks = growth > threshold;
    
    return {
      message: () => 
        hasLeaks
          ? `Expected no resource leaks, but detected growth of ${growth} (threshold: ${threshold})`
          : `Expected resource leaks, but growth of ${growth} is within threshold of ${threshold}`,
      pass: !hasLeaks,
    };
  },
});

/**
 * Matcher: toHaveFollowedLifecycleContract
 * Verifies that component lifecycle methods follow expected patterns
 */
expect.extend({
  toHaveFollowedLifecycleContract(
    received: { mount?: jest.Mock; unmount?: jest.Mock; update?: jest.Mock }, 
    contract: { mustMount?: boolean; mustUnmount?: boolean; mustNotAutoCreate?: boolean }
  ) {
    const violations = [];
    
    if (contract.mustMount && (!received.mount || received.mount.mock.calls.length === 0)) {
      violations.push('mount method not called');
    }
    
    if (contract.mustUnmount && (!received.unmount || received.unmount.mock.calls.length === 0)) {
      violations.push('unmount method not called');
    }
    
    if (contract.mustNotAutoCreate) {
      // Check that no creation methods were called automatically
      const autoCreationMethods = Object.keys(received).filter(key => 
        key.includes('create') || key.includes('launch')
      );
      
      const autoCreatedAny = autoCreationMethods.some(method => {
        const mock = (received as any)[method];
        return mock && mock.mock && mock.mock.calls.length > 0;
      });
      
      if (autoCreatedAny) {
        violations.push('auto-creation detected');
      }
    }
    
    const pass = violations.length === 0;
    
    return {
      message: () => 
        pass
          ? 'Expected lifecycle contract violations, but found none'
          : `Lifecycle contract violations: ${violations.join(', ')}`,
      pass,
    };
  },
});

/**
 * Matcher: toSatisfyBehaviorContract
 * Generic matcher for verifying behavioral contracts
 */
expect.extend({
  toSatisfyBehaviorContract(received: any, contract: (received: any) => { pass: boolean; message: string }) {
    const result = contract(received);
    
    return {
      message: () => result.message,
      pass: result.pass,
    };
  },
});

/**
 * Helper function to create behavioral contracts
 */
export const createBehaviorContract = (contractName: string, validations: Array<(received: any) => boolean>) => {
  return (received: any) => {
    const failures = validations
      .map((validation, index) => ({ validation, index, passed: validation(received) }))
      .filter(result => !result.passed);
    
    return {
      pass: failures.length === 0,
      message: failures.length === 0 
        ? `${contractName} contract satisfied`
        : `${contractName} contract violations: ${failures.map(f => `validation ${f.index + 1}`).join(', ')}`
    };
  };
};

/**
 * Pre-built contracts for common patterns
 */
export const ComponentLifecycleContract = createBehaviorContract('ComponentLifecycle', [
  (received) => received.mount !== undefined,
  (received) => received.unmount !== undefined,
  (received) => received.cleanup !== undefined,
]);

export const APIInteractionContract = createBehaviorContract('APIInteraction', [
  (received) => received.fetch !== undefined,
  (received) => received.handleError !== undefined,
  (received) => received.parseResponse !== undefined,
]);

export const ResourceManagementContract = createBehaviorContract('ResourceManagement', [
  (received) => received.acquire !== undefined,
  (received) => received.release !== undefined,
  (received) => received.cleanup !== undefined,
]);