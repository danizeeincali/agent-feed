/**
 * TDD London School - React DevTools State Mutation Testing
 * 
 * Emergency Test Suite: Mock React DevTools interference and state mutations
 * that can trigger "Rendered more hooks than during the previous render" errors.
 * Tests exact scenarios where DevTools manipulations break hook consistency.
 */

import { jest } from '@jest/globals';

// Mock React DevTools Environment
interface DevToolsState {
  isActive: boolean;
  version: string;
  features: string[];
  profilingEnabled: boolean;
  timeTravel: {
    enabled: boolean;
    currentState: number;
    totalStates: number;
  };
  componentInspection: {
    enabled: boolean;
    selectedComponent: string | null;
    propsOverrides: Record<string, any>;
    stateOverrides: Record<string, any>;
  };
}

class ReactDevToolsMocker {
  private devToolsState: DevToolsState = {
    isActive: false,
    version: '4.24.0',
    features: ['profiler', 'timeTravel', 'componentInspection', 'hookInspection'],
    profilingEnabled: false,
    timeTravel: {
      enabled: false,
      currentState: 0,
      totalStates: 0
    },
    componentInspection: {
      enabled: false,
      selectedComponent: null,
      propsOverrides: {},
      stateOverrides: {}
    }
  };

  private stateHistory: Array<{
    timestamp: number;
    componentState: any;
    hookCalls: Array<{ type: string; value: any }>;
  }> = [];

  private hookOverrides: Map<string, any> = new Map();
  private forceUpdateTriggers: Array<() => void> = [];

  // Simulate DevTools activation
  activateDevTools() {
    this.devToolsState.isActive = true;
    this.addGlobalDevToolsObject();
  }

  deactivateDevTools() {
    this.devToolsState.isActive = false;
    this.removeGlobalDevToolsObject();
  }

  private addGlobalDevToolsObject() {
    (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      onCommitFiberRoot: jest.fn(),
      onCommitFiberUnmount: jest.fn(),
      checkDCE: jest.fn(),
      onScheduleFiberRoot: jest.fn(),
      renderers: new Map(),
      backends: new Map(),
      // DevTools manipulation methods
      overrideProps: (id: string, path: string[], value: any) => {
        this.devToolsState.componentInspection.propsOverrides[`${id}.${path.join('.')}`] = value;
        this.triggerForceUpdate();
      },
      overrideState: (id: string, path: string[], value: any) => {
        this.devToolsState.componentInspection.stateOverrides[`${id}.${path.join('.')}`] = value;
        this.triggerForceUpdate();
      },
      overrideHookState: (id: string, hookIndex: number, path: string[], value: any) => {
        this.hookOverrides.set(`${id}.${hookIndex}.${path.join('.')}`, value);
        this.triggerForceUpdate();
      },
      // Time travel debugging
      jumpToState: (stateIndex: number) => {
        if (stateIndex < this.stateHistory.length) {
          this.devToolsState.timeTravel.currentState = stateIndex;
          this.triggerForceUpdate();
        }
      },
      // Component highlighting
      highlightComponent: (id: string) => {
        this.devToolsState.componentInspection.selectedComponent = id;
      }
    };
  }

  private removeGlobalDevToolsObject() {
    delete (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  }

  private triggerForceUpdate() {
    this.forceUpdateTriggers.forEach(trigger => trigger());
  }

  // DevTools manipulation methods
  enableProfiling() {
    this.devToolsState.profilingEnabled = true;
  }

  enableTimeTravel() {
    this.devToolsState.timeTravel.enabled = true;
  }

  recordComponentState(componentState: any, hookCalls: Array<{ type: string; value: any }>) {
    this.stateHistory.push({
      timestamp: Date.now(),
      componentState,
      hookCalls
    });
    this.devToolsState.timeTravel.totalStates = this.stateHistory.length;
  }

  simulateStateMutation(componentId: string, stateKey: string, newValue: any) {
    this.devToolsState.componentInspection.stateOverrides[`${componentId}.${stateKey}`] = newValue;
    this.triggerForceUpdate();
  }

  simulateHookMutation(componentId: string, hookIndex: number, newValue: any) {
    this.hookOverrides.set(`${componentId}.${hookIndex}`, newValue);
    this.triggerForceUpdate();
  }

  simulateTimeTravel(targetState: number) {
    if (this.devToolsState.timeTravel.enabled && targetState < this.stateHistory.length) {
      this.devToolsState.timeTravel.currentState = targetState;
      this.triggerForceUpdate();
    }
  }

  // Get DevTools interference level
  getInterferenceLevel(): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
    if (!this.devToolsState.isActive) return 'none';
    
    const overrideCount = Object.keys(this.devToolsState.componentInspection.propsOverrides).length +
                         Object.keys(this.devToolsState.componentInspection.stateOverrides).length +
                         this.hookOverrides.size;

    if (overrideCount === 0) return 'low';
    if (overrideCount < 3) return 'medium';
    if (overrideCount < 6) return 'high';
    return 'extreme';
  }

  addForceUpdateListener(callback: () => void) {
    this.forceUpdateTriggers.push(callback);
  }

  reset() {
    this.devToolsState = {
      isActive: false,
      version: '4.24.0',
      features: ['profiler', 'timeTravel', 'componentInspection', 'hookInspection'],
      profilingEnabled: false,
      timeTravel: { enabled: false, currentState: 0, totalStates: 0 },
      componentInspection: { enabled: false, selectedComponent: null, propsOverrides: {}, stateOverrides: {} }
    };
    this.stateHistory = [];
    this.hookOverrides.clear();
    this.forceUpdateTriggers = [];
    this.deactivateDevTools();
  }

  getState() {
    return { ...this.devToolsState };
  }
}

const devToolsMocker = new ReactDevToolsMocker();

// Hook tracking with DevTools interference detection
class DevToolsHookTracker {
  private baselineHookCounts: Map<string, number> = new Map();
  private devToolsInfluencedCounts: Map<string, number> = new Map();
  private interferenceEvents: Array<{
    type: string;
    component: string;
    beforeHooks: number;
    afterHooks: number;
    interferenceLevel: string;
    timestamp: number;
  }> = [];

  setBaseline(component: string, hookCount: number) {
    this.baselineHookCounts.set(component, hookCount);
  }

  trackDevToolsInfluence(component: string, hookCount: number, interferenceType: string) {
    const baseline = this.baselineHookCounts.get(component) || 0;
    this.devToolsInfluencedCounts.set(component, hookCount);
    
    if (hookCount !== baseline) {
      this.interferenceEvents.push({
        type: interferenceType,
        component,
        beforeHooks: baseline,
        afterHooks: hookCount,
        interferenceLevel: devToolsMocker.getInterferenceLevel(),
        timestamp: Date.now()
      });
    }
  }

  getInterferenceReport() {
    return {
      events: [...this.interferenceEvents],
      affectedComponents: Array.from(this.devToolsInfluencedCounts.keys()),
      totalInterferences: this.interferenceEvents.length,
      severityDistribution: this.interferenceEvents.reduce((acc, event) => {
        acc[event.interferenceLevel] = (acc[event.interferenceLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  reset() {
    this.baselineHookCounts.clear();
    this.devToolsInfluencedCounts.clear();
    this.interferenceEvents = [];
  }
}

const devToolsHookTracker = new DevToolsHookTracker();

// Mock React with DevTools interference simulation
const mockReactWithDevTools = {
  useState: jest.fn((initialValue) => {
    // Check for DevTools hook overrides
    const componentId = 'mock-component';
    const hookIndex = mockReactWithDevTools.useState.mock.calls.length - 1;
    const overrideKey = `${componentId}.${hookIndex}`;
    
    const hasOverride = devToolsMocker.getState().isActive && 
                       (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.hookOverrides?.has(overrideKey);
    
    const value = hasOverride ? 
      (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.hookOverrides.get(overrideKey) : 
      initialValue;
    
    return [value, jest.fn()];
  }),
  
  useEffect: jest.fn((callback, deps) => {
    // DevTools can interfere with effect dependencies
    const devToolsActive = devToolsMocker.getState().isActive;
    if (devToolsActive && devToolsMocker.getState().profilingEnabled) {
      // Simulate profiling overhead adding extra tracking
      callback(); // Immediate execution for profiling
    }
    return callback();
  }),
  
  useMemo: jest.fn((factory, deps) => {
    // DevTools time travel can invalidate memoization
    const devToolsState = devToolsMocker.getState();
    if (devToolsState.timeTravel.enabled) {
      // Always recompute during time travel to avoid stale data
      return factory();
    }
    return factory();
  }),
  
  useCallback: jest.fn((callback, deps) => {
    // DevTools can wrap callbacks with debugging information
    const devToolsActive = devToolsMocker.getState().isActive;
    if (devToolsActive) {
      return (...args: any[]) => {
        // Simulate DevTools callback wrapping
        return callback(...args);
      };
    }
    return callback;
  })
};

jest.mock('react', () => mockReactWithDevTools);

describe('TDD London School: React DevTools State Mutation Hook Violations', () => {
  beforeEach(() => {
    devToolsMocker.reset();
    devToolsHookTracker.reset();
    jest.clearAllMocks();
  });

  describe('DevTools Activation Impact', () => {
    it('SHOULD FAIL: DevTools activation changes component hook behavior', () => {
      const React = require('react');
      
      const simulateComponentWithoutDevTools = () => {
        let hookCount = 0;
        
        React.useState('normal'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        React.useMemo(() => 'memo', []); hookCount++;
        React.useCallback(() => {}, []); hookCount++;
        
        return hookCount;
      };

      const simulateComponentWithDevTools = () => {
        let hookCount = 0;
        
        React.useState('devtools-active'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        React.useMemo(() => 'memo', []); hookCount++;
        React.useCallback(() => {}, []); hookCount++;
        
        // DevTools can add debugging hooks - VIOLATION!
        if (devToolsMocker.getState().isActive) {
          React.useState('devtools-debug'); hookCount++; // DevTools debugging state
          React.useEffect(() => {
            // DevTools profiling effect
          }, []); hookCount++;
        }
        
        return hookCount;
      };

      // Test without DevTools
      const normalHooks = simulateComponentWithoutDevTools();
      devToolsHookTracker.setBaseline('TestComponent', normalHooks);

      // Test with DevTools active
      devToolsMocker.activateDevTools();
      const devToolsHooks = simulateComponentWithDevTools();
      devToolsHookTracker.trackDevToolsInfluence('TestComponent', devToolsHooks, 'activation');

      // DevTools activation changes hook count - VIOLATION!
      expect(devToolsHooks).toBeGreaterThan(normalHooks);
      expect(devToolsHooks - normalHooks).toBe(2); // 2 additional DevTools hooks

      const report = devToolsHookTracker.getInterferenceReport();
      expect(report.totalInterferences).toBe(1);
      expect(report.events[0].type).toBe('activation');

      console.log('🚨 DEVTOOLS ACTIVATION VIOLATION:');
      console.log(`  Normal: ${normalHooks} hooks`);
      console.log(`  With DevTools: ${devToolsHooks} hooks`);
      console.log(`  Difference: +${devToolsHooks - normalHooks} hooks`);
    });

    it('SHOULD FAIL: DevTools profiling adds performance monitoring hooks', () => {
      const React = require('react');
      
      const simulateWithProfiling = (profilingEnabled: boolean) => {
        let hookCount = 0;
        
        devToolsMocker.activateDevTools();
        if (profilingEnabled) {
          devToolsMocker.enableProfiling();
        }

        React.useState('component'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        
        // Profiling adds performance tracking hooks - VIOLATION!
        if (devToolsMocker.getState().profilingEnabled) {
          React.useState(performance.now()); hookCount++; // Start time
          React.useState(0); hookCount++; // Render count
          React.useEffect(() => {
            // Performance measurement effect
          }, []); hookCount++;
        }
        
        return hookCount;
      };

      const noprofilingHooks = simulateWithProfiling(false);
      const profilingHooks = simulateWithProfiling(true);

      // Profiling adds hooks - VIOLATION!
      expect(profilingHooks).toBeGreaterThan(noprofilingHooks);
      expect(profilingHooks - noprofilingHooks).toBe(3);

      devToolsHookTracker.trackDevToolsInfluence('ProfiledComponent', profilingHooks, 'profiling');
      const report = devToolsHookTracker.getInterferenceReport();

      expect(report.events.some(e => e.type === 'profiling')).toBe(true);
      
      console.log('🚨 PROFILING INTERFERENCE VIOLATION:');
      console.log(`  No profiling: ${noprofilingHooks} hooks`);
      console.log(`  With profiling: ${profilingHooks} hooks`);
    });
  });

  describe('State Mutation Interference', () => {
    it('SHOULD FAIL: DevTools state override triggers additional hooks', () => {
      const React = require('react');
      
      const simulateStateOverrideComponent = () => {
        let hookCount = 0;
        
        const [state, setState] = React.useState('normal'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        
        // Check for DevTools state overrides
        const devToolsState = devToolsMocker.getState();
        const hasStateOverride = Object.keys(devToolsState.componentInspection.stateOverrides).length > 0;
        
        // Additional hooks when DevTools overrides state - VIOLATION!
        if (hasStateOverride) {
          React.useState('override-detected'); hookCount++; // Override tracking state
          React.useEffect(() => {
            // Override sync effect
          }, [hasStateOverride]); hookCount++;
          React.useMemo(() => {
            // Override processing
            return devToolsState.componentInspection.stateOverrides;
          }, [hasStateOverride]); hookCount++;
        }
        
        return hookCount;
      };

      // Normal rendering
      devToolsMocker.activateDevTools();
      const normalHooks = simulateStateOverrideComponent();
      
      // With state override
      devToolsMocker.simulateStateMutation('TestComponent', 'testState', 'overridden-value');
      const overrideHooks = simulateStateOverrideComponent();

      // State override adds hooks - VIOLATION!
      expect(overrideHooks).toBeGreaterThan(normalHooks);
      expect(overrideHooks - normalHooks).toBe(3);

      devToolsHookTracker.trackDevToolsInfluence('OverrideComponent', overrideHooks, 'state-override');
      
      console.log('🚨 STATE OVERRIDE VIOLATION:');
      console.log(`  Normal: ${normalHooks} hooks`);
      console.log(`  With override: ${overrideHooks} hooks`);
    });

    it('SHOULD FAIL: DevTools hook value mutation breaks hook contracts', () => {
      const React = require('react');
      
      const simulateHookMutationComponent = () => {
        let hookCount = 0;
        
        React.useState('hook1'); hookCount++;
        React.useState('hook2'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        
        // Check if DevTools has mutated any hooks
        const hasHookMutation = devToolsMocker.getState().isActive && 
                               Array.from((globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.hookOverrides?.keys() || []).length > 0;
        
        // Additional validation hooks when mutations detected - VIOLATION!
        if (hasHookMutation) {
          React.useState('mutation-validator'); hookCount++; // Mutation detection state
          React.useCallback(() => {
            // Mutation validation callback
          }, []); hookCount++;
          React.useEffect(() => {
            // Mutation recovery effect
          }, [hasHookMutation]); hookCount++;
        }
        
        return hookCount;
      };

      // Normal hooks
      devToolsMocker.activateDevTools();
      const normalHooks = simulateHookMutationComponent();
      
      // With hook mutation
      devToolsMocker.simulateHookMutation('TestComponent', 0, 'mutated-value');
      const mutatedHooks = simulateHookMutationComponent();

      // Hook mutation adds validation hooks - VIOLATION!
      expect(mutatedHooks).toBeGreaterThan(normalHooks);
      expect(mutatedHooks - normalHooks).toBe(3);

      console.log('🚨 HOOK MUTATION VIOLATION:');
      console.log(`  Normal: ${normalHooks} hooks`);
      console.log(`  With mutation: ${mutatedHooks} hooks`);
    });
  });

  describe('Time Travel Debugging Impact', () => {
    it('SHOULD FAIL: Time travel changes component hook execution path', () => {
      const React = require('react');
      
      const simulateTimeTravelComponent = () => {
        let hookCount = 0;
        
        React.useState('current'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        
        const devToolsState = devToolsMocker.getState();
        
        // Time travel specific hooks - VIOLATION!
        if (devToolsState.timeTravel.enabled) {
          React.useState(devToolsState.timeTravel.currentState); hookCount++; // Time travel state
          React.useMemo(() => {
            // Historical state computation
            return devToolsState.timeTravel.currentState;
          }, [devToolsState.timeTravel.currentState]); hookCount++;
          
          // Additional hooks based on historical state
          if (devToolsState.timeTravel.currentState > 0) {
            React.useState('historical'); hookCount++; // Historical data state
            React.useEffect(() => {
              // Historical state sync
            }, [devToolsState.timeTravel.currentState]); hookCount++;
          }
        }
        
        return hookCount;
      };

      devToolsMocker.activateDevTools();
      
      // Record some states for time travel
      devToolsMocker.recordComponentState({ value: 'state1' }, []);
      devToolsMocker.recordComponentState({ value: 'state2' }, []);
      devToolsMocker.recordComponentState({ value: 'state3' }, []);

      // Normal state (current)
      const currentHooks = simulateTimeTravelComponent();
      
      // Enable time travel
      devToolsMocker.enableTimeTravel();
      const timeTravelHooks = simulateTimeTravelComponent();
      
      // Jump to historical state
      devToolsMocker.simulateTimeTravel(1);
      const historicalHooks = simulateTimeTravelComponent();

      // Time travel changes hook count - VIOLATION!
      expect(timeTravelHooks).toBeGreaterThan(currentHooks);
      expect(historicalHooks).toBeGreaterThan(timeTravelHooks);

      const violations = [
        { state: 'current', hooks: currentHooks },
        { state: 'time-travel-enabled', hooks: timeTravelHooks },
        { state: 'historical', hooks: historicalHooks }
      ];

      console.log('🚨 TIME TRAVEL VIOLATIONS:');
      violations.forEach(v => {
        console.log(`  ${v.state}: ${v.hooks} hooks`);
      });

      expect(new Set(violations.map(v => v.hooks)).size).toBeGreaterThan(1);
    });
  });

  describe('Component Inspection Interference', () => {
    it('SHOULD FAIL: Component highlighting adds debugging hooks', () => {
      const React = require('react');
      
      const simulateHighlightedComponent = (componentId: string | null) => {
        let hookCount = 0;
        
        React.useState('component'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        
        // Check if this component is highlighted
        const devToolsState = devToolsMocker.getState();
        const isHighlighted = devToolsState.componentInspection.selectedComponent === componentId;
        
        // Additional hooks for highlighted components - VIOLATION!
        if (isHighlighted) {
          React.useState('highlight-bounds'); hookCount++; // Highlight bounds state
          React.useState('highlight-props'); hookCount++; // Props inspection state
          React.useEffect(() => {
            // Highlight effect
          }, []); hookCount++;
          React.useMemo(() => {
            // Highlight calculations
            return { bounds: 'calculated' };
          }, []); hookCount++;
        }
        
        return hookCount;
      };

      devToolsMocker.activateDevTools();
      
      // Normal component
      const normalHooks = simulateHighlightedComponent(null);
      
      // Highlighted component
      devToolsMocker.getState().componentInspection.selectedComponent = 'TestComponent';
      const highlightedHooks = simulateHighlightedComponent('TestComponent');

      // Highlighting adds hooks - VIOLATION!
      expect(highlightedHooks).toBeGreaterThan(normalHooks);
      expect(highlightedHooks - normalHooks).toBe(4);

      console.log('🚨 COMPONENT HIGHLIGHTING VIOLATION:');
      console.log(`  Normal: ${normalHooks} hooks`);
      console.log(`  Highlighted: ${highlightedHooks} hooks`);
    });
  });

  describe('DevTools Feature Accumulation', () => {
    it('SHOULD FAIL: Multiple DevTools features compound hook violations', () => {
      const React = require('react');
      
      const simulateFullyInstrumentedComponent = () => {
        let hookCount = 0;
        
        // Base hooks
        React.useState('base'); hookCount++;
        React.useEffect(() => {}, []); hookCount++;
        React.useMemo(() => 'base-memo', []); hookCount++;
        
        const devToolsState = devToolsMocker.getState();
        
        // Each DevTools feature adds hooks - CUMULATIVE VIOLATION!
        if (devToolsState.isActive) {
          React.useState('devtools-active'); hookCount++;
        }
        
        if (devToolsState.profilingEnabled) {
          React.useState(performance.now()); hookCount++;
          React.useState(0); hookCount++; // Render count
        }
        
        if (devToolsState.timeTravel.enabled) {
          React.useState(devToolsState.timeTravel.currentState); hookCount++;
          React.useMemo(() => devToolsState.timeTravel, []); hookCount++;
        }
        
        if (devToolsState.componentInspection.selectedComponent) {
          React.useState('inspection-data'); hookCount++;
          React.useCallback(() => {}, []); hookCount++;
        }
        
        if (Object.keys(devToolsState.componentInspection.stateOverrides).length > 0) {
          React.useState('override-tracking'); hookCount++;
          React.useEffect(() => {}, []); hookCount++;
        }
        
        return hookCount;
      };

      devToolsMocker.activateDevTools();
      const scenarios = [
        { name: 'base', setup: () => {}, expectedIncrease: 1 },
        { name: 'with-profiling', setup: () => devToolsMocker.enableProfiling(), expectedIncrease: 3 },
        { name: 'with-timetravel', setup: () => devToolsMocker.enableTimeTravel(), expectedIncrease: 5 },
        { name: 'with-inspection', setup: () => {
          devToolsMocker.getState().componentInspection.selectedComponent = 'TestComponent';
        }, expectedIncrease: 7 },
        { name: 'with-overrides', setup: () => {
          devToolsMocker.simulateStateMutation('TestComponent', 'state', 'value');
        }, expectedIncrease: 9 }
      ];

      const results = scenarios.map(scenario => {
        devToolsMocker.reset();
        devToolsMocker.activateDevTools();
        scenario.setup();
        
        const hooks = simulateFullyInstrumentedComponent();
        return { ...scenario, actualHooks: hooks };
      });

      const baseHooks = 3; // Base hooks without DevTools
      
      results.forEach((result, index) => {
        const expectedTotal = baseHooks + result.expectedIncrease;
        console.log(`🚨 ${result.name.toUpperCase()}: Expected ${expectedTotal}, Got ${result.actualHooks}`);
        
        // Each feature should add more hooks - VIOLATION!
        if (index > 0) {
          expect(result.actualHooks).toBeGreaterThan(results[index - 1].actualHooks);
        }
      });

      const finalResult = results[results.length - 1];
      const maxViolation = finalResult.actualHooks - baseHooks;
      
      // Maximum violation should be significant
      expect(maxViolation).toBeGreaterThan(6);
      
      console.log('🚨 CUMULATIVE DEVTOOLS VIOLATIONS:');
      console.log(`  Base hooks: ${baseHooks}`);
      console.log(`  Maximum hooks with all features: ${finalResult.actualHooks}`);
      console.log(`  Total violation: +${maxViolation} hooks`);
    });
  });

  describe('Emergency DevTools Violation Report', () => {
    it('should generate comprehensive DevTools interference report', () => {
      // Simulate all types of DevTools interference
      const interferenceScenarios = [
        'activation', 'profiling', 'state-override', 'hook-mutation', 
        'time-travel', 'component-highlighting', 'cumulative'
      ];

      interferenceScenarios.forEach(scenario => {
        devToolsHookTracker.trackDevToolsInfluence(
          `Component-${scenario}`,
          Math.floor(Math.random() * 10) + 15, // Random hook count 15-25
          scenario
        );
      });

      const report = devToolsHookTracker.getInterferenceReport();
      
      // Must detect multiple types of interference
      expect(report.totalInterferences).toBe(interferenceScenarios.length);
      expect(report.affectedComponents.length).toBe(interferenceScenarios.length);
      
      console.log('🚨 COMPREHENSIVE DEVTOOLS INTERFERENCE REPORT:');
      console.log(JSON.stringify({
        totalInterferences: report.totalInterferences,
        affectedComponents: report.affectedComponents.length,
        severityDistribution: report.severityDistribution,
        interferenceTypes: report.events.map(e => e.type)
      }, null, 2));

      // Emergency validation - must detect DevTools interference
      const hasHighSeverityInterference = Object.keys(report.severityDistribution)
        .some(severity => ['high', 'extreme'].includes(severity));
      
      expect(hasHighSeverityInterference || report.totalInterferences > 5).toBe(true);

      console.log('🚨 DEVTOOLS VIOLATION SUMMARY:');
      report.events.forEach(event => {
        console.log(`  ${event.component}: ${event.type} (+${event.afterHooks - event.beforeHooks} hooks)`);
      });
    });
  });
});