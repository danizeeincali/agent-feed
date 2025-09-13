/**
 * TDD London School - React Hooks Mock Infrastructure
 * 
 * Mock-first approach to track useState and useEffect behavior
 * Focus on interaction verification and contract definition
 */

import { vi, type MockedFunction } from 'vitest';

// Hook call tracking interface
interface HookCallTracker {
  id: string;
  type: 'useState' | 'useEffect' | 'useCallback';
  timestamp: number;
  stackTrace: string;
  args?: any[];
  returnValue?: any;
  dependencies?: any[];
  cleanupCalled?: boolean;
}

// State change tracking interface
interface StateChangeTracker {
  stateVariable: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  stackTrace: string;
  renderTriggered: boolean;
}

// Component lifecycle mock
interface ComponentLifecycleMock {
  mountCallbacks: Array<() => void>;
  unmountCallbacks: Array<() => void>;
  renderCount: number;
  stateUpdates: StateChangeTracker[];
  hookCalls: HookCallTracker[];
  rerenderTriggers: string[];
}

// Global tracking state
let componentLifecycleMocks: Map<string, ComponentLifecycleMock> = new Map();
let globalHookCallCount = 0;

// Enhanced useState mock with interaction tracking
export const createMockUseState = <T>(initialValue: T, stateKey: string) => {
  let currentValue = initialValue;
  const setterCalls: Array<{ value: T | ((prev: T) => T); timestamp: number; stackTrace: string }> = [];
  
  const setState = vi.fn((newValue: T | ((prev: T) => T)) => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 8).join('\n') || 'No stack trace';
    const timestamp = Date.now();
    
    const previousValue = currentValue;
    
    if (typeof newValue === 'function') {
      currentValue = (newValue as (prev: T) => T)(currentValue);
    } else {
      currentValue = newValue;
    }
    
    setterCalls.push({ value: newValue, timestamp, stackTrace });
    
    // Track state change
    const stateChange: StateChangeTracker = {
      stateVariable: stateKey,
      previousValue,
      newValue: currentValue,
      timestamp,
      stackTrace,
      renderTriggered: true // Mock assumes render is triggered
    };
    
    // Store state change in component lifecycle mock
    const componentMock = getCurrentComponentMock();
    componentMock.stateUpdates.push(stateChange);
    componentMock.renderCount++;
    componentMock.rerenderTriggers.push(`setState:${stateKey}`);
    
    console.log(`🔍 TDD MOCK: useState setter called for ${stateKey}`, {
      previousValue,
      newValue: currentValue,
      isFunction: typeof newValue === 'function',
      renderCount: componentMock.renderCount,
      stackTrace
    });
  });
  
  const getter = () => currentValue;
  
  // Track hook call
  trackHookCall({
    id: `useState-${stateKey}-${globalHookCallCount++}`,
    type: 'useState',
    timestamp: Date.now(),
    stackTrace: new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace',
    returnValue: [getter(), setState]
  });
  
  return [getter, setState] as const;
};

// Enhanced useEffect mock with dependency tracking
export const createMockUseEffect = (callback: () => void | (() => void), dependencies?: any[], effectKey?: string) => {
  const effectId = effectKey || `useEffect-${globalHookCallCount++}`;
  let cleanupFn: (() => void) | undefined;
  let lastDependencies = dependencies;
  
  const mockEffect = vi.fn(() => {
    const stackTrace = new Error().stack?.split('\n').slice(2, 8).join('\n') || 'No stack trace';
    const timestamp = Date.now();
    
    console.log(`🔍 TDD MOCK: useEffect called - ${effectId}`, {
      hasDependencies: !!dependencies,
      dependenciesLength: dependencies?.length,
      dependencies,
      timestamp
    });
    
    // Track effect call
    trackHookCall({
      id: effectId,
      type: 'useEffect',
      timestamp,
      stackTrace,
      dependencies: dependencies ? [...dependencies] : undefined
    });
    
    // Execute callback
    try {
      const result = callback();
      if (typeof result === 'function') {
        cleanupFn = result;
        console.log(`🔍 TDD MOCK: useEffect cleanup function registered - ${effectId}`);
      }
    } catch (error) {
      console.error(`🔍 TDD MOCK: useEffect callback error - ${effectId}:`, error);
      throw error;
    }
    
    return cleanupFn;
  });
  
  // Mock dependency comparison
  const shouldRunEffect = () => {
    if (!dependencies) return true; // No dependencies = run every time
    if (!lastDependencies) return true; // First run
    
    const changed = dependencies.some((dep, index) => 
      Object.is(dep, lastDependencies![index]) === false
    );
    
    console.log(`🔍 TDD MOCK: useEffect dependency check - ${effectId}`, {
      shouldRun: changed,
      currentDeps: dependencies,
      lastDeps: lastDependencies
    });
    
    lastDependencies = [...dependencies];
    return changed;
  };
  
  // Simulate effect execution
  if (shouldRunEffect()) {
    return mockEffect();
  }
  
  return mockEffect;
};

// Enhanced useCallback mock with dependency tracking
export const createMockUseCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[],
  callbackKey?: string
): T => {
  const callbackId = callbackKey || `useCallback-${globalHookCallCount++}`;
  let memoizedCallback = callback;
  let lastDependencies = dependencies;
  
  const mockCallback = vi.fn((...args: any[]) => {
    console.log(`🔍 TDD MOCK: useCallback function called - ${callbackId}`, {
      args,
      argsLength: args.length
    });
    
    return memoizedCallback(...args);
  }) as T;
  
  // Track hook call
  trackHookCall({
    id: callbackId,
    type: 'useCallback',
    timestamp: Date.now(),
    stackTrace: new Error().stack?.split('\n').slice(2, 6).join('\n') || 'No stack trace',
    dependencies: [...dependencies],
    returnValue: mockCallback
  });
  
  // Check if dependencies changed
  const depsChanged = dependencies.some((dep, index) => 
    Object.is(dep, lastDependencies[index]) === false
  );
  
  if (depsChanged) {
    console.log(`🔍 TDD MOCK: useCallback dependencies changed - ${callbackId}`, {
      currentDeps: dependencies,
      lastDeps: lastDependencies
    });
    memoizedCallback = callback;
    lastDependencies = [...dependencies];
  }
  
  return mockCallback;
};

// Helper functions for component lifecycle tracking
function getCurrentComponentMock(): ComponentLifecycleMock {
  const componentId = 'AgentDynamicPage'; // Can be made dynamic
  
  if (!componentLifecycleMocks.has(componentId)) {
    componentLifecycleMocks.set(componentId, {
      mountCallbacks: [],
      unmountCallbacks: [],
      renderCount: 0,
      stateUpdates: [],
      hookCalls: [],
      rerenderTriggers: []
    });
  }
  
  return componentLifecycleMocks.get(componentId)!;
}

function trackHookCall(hookCall: HookCallTracker): void {
  const componentMock = getCurrentComponentMock();
  componentMock.hookCalls.push(hookCall);
}

// Component mock registry
export const ComponentMockRegistry = {
  // Reset all mocks for fresh test
  resetAllMocks: () => {
    componentLifecycleMocks.clear();
    globalHookCallCount = 0;
    console.log('🔍 TDD MOCK: All component mocks reset');
  },
  
  // Get component lifecycle data
  getComponentLifecycle: (componentId: string = 'AgentDynamicPage'): ComponentLifecycleMock | null => {
    return componentLifecycleMocks.get(componentId) || null;
  },
  
  // Verify state updates occurred
  verifyStateUpdates: (componentId: string = 'AgentDynamicPage'): StateChangeTracker[] => {
    const lifecycle = componentLifecycleMocks.get(componentId);
    return lifecycle?.stateUpdates || [];
  },
  
  // Verify hook calls occurred
  verifyHookCalls: (componentId: string = 'AgentDynamicPage'): HookCallTracker[] => {
    const lifecycle = componentLifecycleMocks.get(componentId);
    return lifecycle?.hookCalls || [];
  },
  
  // Verify render count
  verifyRenderCount: (componentId: string = 'AgentDynamicPage'): number => {
    const lifecycle = componentLifecycleMocks.get(componentId);
    return lifecycle?.renderCount || 0;
  },
  
  // Assert state change pattern
  assertStateChangePattern: (
    stateKey: string, 
    expectedValue: any,
    componentId: string = 'AgentDynamicPage'
  ): boolean => {
    const stateUpdates = ComponentMockRegistry.verifyStateUpdates(componentId);
    const relevantUpdates = stateUpdates.filter(update => update.stateVariable === stateKey);
    
    if (relevantUpdates.length === 0) {
      console.error(`🔍 TDD ASSERTION FAILED: No state updates found for ${stateKey}`);
      return false;
    }
    
    const latestUpdate = relevantUpdates[relevantUpdates.length - 1];
    const matches = JSON.stringify(latestUpdate.newValue) === JSON.stringify(expectedValue);
    
    console.log(`🔍 TDD ASSERTION: State change pattern for ${stateKey}`, {
      expected: expectedValue,
      actual: latestUpdate.newValue,
      matches,
      updateCount: relevantUpdates.length
    });
    
    return matches;
  },
  
  // Assert hook call sequence
  assertHookCallSequence: (expectedSequence: string[], componentId: string = 'AgentDynamicPage'): boolean => {
    const hookCalls = ComponentMockRegistry.verifyHookCalls(componentId);
    const actualSequence = hookCalls.map(call => `${call.type}:${call.id.split('-')[1]}`);
    
    const matches = JSON.stringify(expectedSequence) === JSON.stringify(actualSequence.slice(0, expectedSequence.length));
    
    console.log(`🔍 TDD ASSERTION: Hook call sequence`, {
      expected: expectedSequence,
      actual: actualSequence,
      matches
    });
    
    return matches;
  }
};

// Export mock creators for test usage
export const MockHooks = {
  useState: createMockUseState,
  useEffect: createMockUseEffect,
  useCallback: createMockUseCallback
};