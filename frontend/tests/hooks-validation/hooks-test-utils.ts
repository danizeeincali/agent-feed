import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Hook Count Tracker
 * Tracks the number of hooks called during component renders
 */
export interface HookCounts {
  useState: number;
  useEffect: number;
  useCallback: number;
  useMemo: number;
  useRef: number;
  useContext: number;
}

export interface HookTracker {
  counts: HookCounts;
  reset: () => void;
  start: () => void;
  stop: () => void;
}

/**
 * Creates a hook tracker that monitors React hook usage
 */
export function createHookTracker(): HookTracker {
  const counts: HookCounts = {
    useState: 0,
    useEffect: 0,
    useCallback: 0,
    useMemo: 0,
    useRef: 0,
    useContext: 0,
  };

  const originalHooks = {
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useContext: React.useContext,
  };

  const spies: any[] = [];
  let isTracking = false;

  const reset = () => {
    Object.keys(counts).forEach(key => {
      counts[key as keyof HookCounts] = 0;
    });
  };

  const start = () => {
    if (isTracking) return;
    
    isTracking = true;
    reset();

    // Track useState
    const useStateSpy = vi.spyOn(React, 'useState').mockImplementation((...args) => {
      counts.useState++;
      return originalHooks.useState(...args);
    });
    spies.push(useStateSpy);

    // Track useEffect
    const useEffectSpy = vi.spyOn(React, 'useEffect').mockImplementation((...args) => {
      counts.useEffect++;
      return originalHooks.useEffect(...args);
    });
    spies.push(useEffectSpy);

    // Track useCallback
    const useCallbackSpy = vi.spyOn(React, 'useCallback').mockImplementation((...args) => {
      counts.useCallback++;
      return originalHooks.useCallback(...args);
    });
    spies.push(useCallbackSpy);

    // Track useMemo
    const useMemoSpy = vi.spyOn(React, 'useMemo').mockImplementation((...args) => {
      counts.useMemo++;
      return originalHooks.useMemo(...args);
    });
    spies.push(useMemoSpy);

    // Track useRef
    const useRefSpy = vi.spyOn(React, 'useRef').mockImplementation((...args) => {
      counts.useRef++;
      return originalHooks.useRef(...args);
    });
    spies.push(useRefSpy);

    // Track useContext
    const useContextSpy = vi.spyOn(React, 'useContext').mockImplementation((...args) => {
      counts.useContext++;
      return originalHooks.useContext(...args);
    });
    spies.push(useContextSpy);
  };

  const stop = () => {
    if (!isTracking) return;
    
    isTracking = false;
    spies.forEach(spy => spy.mockRestore());
    spies.length = 0;
  };

  return {
    counts,
    reset,
    start,
    stop,
  };
}

/**
 * Renders a component and tracks hook usage
 */
export function renderWithHookTracking<T extends React.ComponentType<any>>(
  Component: T,
  props: React.ComponentProps<T> = {} as React.ComponentProps<T>,
  options?: RenderOptions
): RenderResult & { hookTracker: HookTracker } {
  const hookTracker = createHookTracker();
  
  hookTracker.start();
  const result = render(React.createElement(Component, props), options);
  hookTracker.stop();
  
  return {
    ...result,
    hookTracker,
  };
}

/**
 * Tests hook consistency across multiple renders
 */
export async function testHookConsistency<T extends React.ComponentType<any>>(
  Component: T,
  propVariations: Array<React.ComponentProps<T>>,
  renderCount: number = 3
): Promise<{
  success: boolean;
  message: string;
  hookCounts: HookCounts[];
}> {
  const allHookCounts: HookCounts[] = [];
  
  try {
    for (let i = 0; i < renderCount; i++) {
      for (const props of propVariations) {
        const hookTracker = createHookTracker();
        
        hookTracker.start();
        const { unmount } = render(React.createElement(Component, props));
        hookTracker.stop();
        
        allHookCounts.push({ ...hookTracker.counts });
        unmount();
      }
    }
    
    // Check consistency
    const firstRender = allHookCounts[0];
    for (let i = 1; i < allHookCounts.length; i++) {
      const currentRender = allHookCounts[i];
      
      for (const hookName of Object.keys(firstRender) as Array<keyof HookCounts>) {
        if (firstRender[hookName] !== currentRender[hookName]) {
          return {
            success: false,
            message: `Hook count inconsistency detected: ${hookName} changed from ${firstRender[hookName]} to ${currentRender[hookName]} at render ${i}`,
            hookCounts: allHookCounts,
          };
        }
      }
    }
    
    return {
      success: true,
      message: `All ${allHookCounts.length} renders maintained consistent hook counts`,
      hookCounts: allHookCounts,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error during hook consistency test: ${error instanceof Error ? error.message : String(error)}`,
      hookCounts: allHookCounts,
    };
  }
}

/**
 * React Hooks Rules Validator
 * Detects common React hooks rule violations
 */
export class HooksRulesValidator {
  private violations: string[] = [];
  private consoleErrorSpy: any;
  
  start() {
    this.violations = [];
    this.consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string') {
        // Check for hooks-related errors
        if (
          message.includes('Rendered more hooks') ||
          message.includes('Rendered fewer hooks') ||
          message.includes('Hooks can only be called') ||
          message.includes('Invalid hook call')
        ) {
          this.violations.push(message);
        }
      }
    });
  }
  
  stop() {
    if (this.consoleErrorSpy) {
      this.consoleErrorSpy.mockRestore();
    }
  }
  
  getViolations(): string[] {
    return [...this.violations];
  }
  
  hasViolations(): boolean {
    return this.violations.length > 0;
  }
  
  reset() {
    this.violations = [];
  }
}

/**
 * Stress test component with rapid re-renders
 */
export async function stressTestComponent<T extends React.ComponentType<any>>(
  Component: T,
  props: React.ComponentProps<T>,
  iterations: number = 50
): Promise<{
  success: boolean;
  message: string;
  violations: string[];
}> {
  const validator = new HooksRulesValidator();
  
  try {
    validator.start();
    
    const { rerender, unmount } = render(React.createElement(Component, props));
    
    // Rapid re-renders
    for (let i = 0; i < iterations; i++) {
      rerender(React.createElement(Component, { ...props, key: i }));
    }
    
    unmount();
    validator.stop();
    
    const violations = validator.getViolations();
    
    return {
      success: violations.length === 0,
      message: violations.length === 0 
        ? `Component survived ${iterations} rapid re-renders without violations`
        : `Component failed stress test with ${violations.length} violations`,
      violations,
    };
  } catch (error) {
    validator.stop();
    return {
      success: false,
      message: `Stress test failed with error: ${error instanceof Error ? error.message : String(error)}`,
      violations: validator.getViolations(),
    };
  }
}

/**
 * Memory leak detector for component lifecycle
 */
export class MemoryLeakDetector {
  private initialMemory: number = 0;
  private listeners: Array<{ event: string; handler: Function }> = [];
  
  startTracking() {
    this.initialMemory = process.memoryUsage().heapUsed;
    this.listeners = [];
    
    // Mock common event listener methods to track additions/removals
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(event, handler, options) {
      this.listeners.push({ event, handler });
      return originalAddEventListener.call(this, event, handler, options);
    }.bind(this);
    
    EventTarget.prototype.removeEventListener = function(event, handler, options) {
      const index = this.listeners.findIndex(l => l.event === event && l.handler === handler);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
      return originalRemoveEventListener.call(this, event, handler, options);
    }.bind(this);
  }
  
  checkForLeaks(): {
    memoryIncrease: number;
    potentialLeaks: Array<{ event: string; count: number }>;
    hasLeaks: boolean;
  } {
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = currentMemory - this.initialMemory;
    
    // Group listeners by event type
    const listenerCounts = this.listeners.reduce((acc, listener) => {
      acc[listener.event] = (acc[listener.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const potentialLeaks = Object.entries(listenerCounts).map(([event, count]) => ({
      event,
      count,
    }));
    
    return {
      memoryIncrease,
      potentialLeaks,
      hasLeaks: potentialLeaks.some(leak => leak.count > 0) || memoryIncrease > 10 * 1024 * 1024, // 10MB threshold
    };
  }
  
  cleanup() {
    // Restore original methods if needed
    // Note: In a real implementation, you'd want to properly restore the original methods
  }
}

/**
 * Component behavior test utilities
 */
export const ComponentBehaviorTester = {
  /**
   * Test component with various prop combinations
   */
  async testWithPropCombinations<T extends React.ComponentType<any>>(
    Component: T,
    propCombinations: Array<React.ComponentProps<T>>
  ) {
    const results = [];
    
    for (const props of propCombinations) {
      const validator = new HooksRulesValidator();
      validator.start();
      
      try {
        const { unmount } = render(React.createElement(Component, props));
        unmount();
        
        results.push({
          props,
          success: !validator.hasViolations(),
          violations: validator.getViolations(),
        });
      } catch (error) {
        results.push({
          props,
          success: false,
          violations: [`Render error: ${error instanceof Error ? error.message : String(error)}`],
        });
      } finally {
        validator.stop();
      }
    }
    
    return results;
  },
  
  /**
   * Test component lifecycle multiple times
   */
  async testLifecycleStability<T extends React.ComponentType<any>>(
    Component: T,
    props: React.ComponentProps<T>,
    cycles: number = 10
  ) {
    const validator = new HooksRulesValidator();
    validator.start();
    
    try {
      for (let i = 0; i < cycles; i++) {
        const { unmount } = render(React.createElement(Component, props));
        unmount();
      }
      
      return {
        success: !validator.hasViolations(),
        violations: validator.getViolations(),
        cycles,
      };
    } finally {
      validator.stop();
    }
  },
};
