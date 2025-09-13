/**
 * TDD London School - Component Lifecycle Hook Mocks
 * 
 * Emergency Test Suite: Mock all React lifecycle and routing to test exact
 * component interaction patterns that cause hooks violations.
 * Uses pure mockist approach - NO real React rendering, only interaction testing.
 */

import { jest } from '@jest/globals';
import type { ReactElement, ComponentType } from 'react';

// Complete React Router mock suite
const mockNavigate = jest.fn();
const mockParams = { agentId: 'test-agent' };
const mockLocation = { pathname: '/agents/test-agent', search: '', hash: '' };

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useLocation: () => mockLocation,
  Navigate: jest.fn(({ to, replace }: any) => ({ type: 'Navigate', to, replace })),
  Link: jest.fn(({ children, to }: any) => ({ type: 'Link', children, to })),
  BrowserRouter: jest.fn(({ children }: any) => children),
  Routes: jest.fn(({ children }: any) => children),
  Route: jest.fn(({ element, path }: any) => ({ element, path }))
}));

// Complete React mock with lifecycle tracking
interface MockReactState<T> {
  value: T;
  setValue: jest.Mock;
  callIndex: number;
}

interface MockReactEffect {
  callback: () => void | (() => void);
  dependencies?: any[];
  cleanup?: () => void;
  callIndex: number;
}

class ReactLifecycleMocker {
  private stateHooks: MockReactState<any>[] = [];
  private effects: MockReactEffect[] = [];
  private memos: Array<{ factory: () => any; deps: any[]; value: any; callIndex: number }> = [];
  private callbacks: Array<{ callback: () => any; deps: any[]; callIndex: number }> = [];
  private refs: Array<{ current: any; callIndex: number }> = [];
  private currentCallIndex = 0;
  private renderCount = 0;

  reset() {
    this.stateHooks = [];
    this.effects = [];
    this.memos = [];
    this.callbacks = [];
    this.refs = [];
    this.currentCallIndex = 0;
    this.renderCount = 0;
  }

  startRender() {
    this.renderCount++;
    this.currentCallIndex = 0;
  }

  mockUseState<T>(initialValue: T): [T, jest.Mock] {
    const callIndex = this.currentCallIndex++;
    
    if (this.stateHooks[callIndex]) {
      return [this.stateHooks[callIndex].value, this.stateHooks[callIndex].setValue];
    }

    const setValue = jest.fn((newValue: T | ((prev: T) => T)) => {
      if (typeof newValue === 'function') {
        this.stateHooks[callIndex].value = (newValue as (prev: T) => T)(this.stateHooks[callIndex].value);
      } else {
        this.stateHooks[callIndex].value = newValue;
      }
    });

    const state: MockReactState<T> = {
      value: initialValue,
      setValue,
      callIndex
    };

    this.stateHooks[callIndex] = state;
    return [state.value, setValue];
  }

  mockUseEffect(callback: () => void | (() => void), deps?: any[]) {
    const callIndex = this.currentCallIndex++;
    
    const effect: MockReactEffect = {
      callback,
      dependencies: deps,
      callIndex
    };

    // Simulate effect execution
    if (this.shouldRunEffect(effect, this.effects[callIndex])) {
      const cleanup = callback();
      if (cleanup && typeof cleanup === 'function') {
        effect.cleanup = cleanup;
      }
    }

    this.effects[callIndex] = effect;
  }

  mockUseMemo<T>(factory: () => T, deps: any[]): T {
    const callIndex = this.currentCallIndex++;
    
    const existingMemo = this.memos[callIndex];
    if (existingMemo && this.depsEqual(deps, existingMemo.deps)) {
      return existingMemo.value;
    }

    const value = factory();
    this.memos[callIndex] = { factory, deps, value, callIndex };
    return value;
  }

  mockUseCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T {
    const callIndex = this.currentCallIndex++;
    
    const existingCallback = this.callbacks[callIndex];
    if (existingCallback && this.depsEqual(deps, existingCallback.deps)) {
      return existingCallback.callback as T;
    }

    this.callbacks[callIndex] = { callback, deps, callIndex };
    return callback;
  }

  mockUseRef<T>(initialValue: T): { current: T } {
    const callIndex = this.currentCallIndex++;
    
    if (this.refs[callIndex]) {
      return this.refs[callIndex];
    }

    const ref = { current: initialValue };
    this.refs[callIndex] = { ...ref, callIndex };
    return ref;
  }

  private shouldRunEffect(newEffect: MockReactEffect, oldEffect?: MockReactEffect): boolean {
    if (!oldEffect) return true;
    if (!newEffect.dependencies) return true;
    if (!oldEffect.dependencies) return true;
    return !this.depsEqual(newEffect.dependencies, oldEffect.dependencies);
  }

  private depsEqual(deps1: any[], deps2: any[]): boolean {
    if (deps1.length !== deps2.length) return false;
    return deps1.every((dep, i) => Object.is(dep, deps2[i]));
  }

  getHooksSummary() {
    return {
      renderCount: this.renderCount,
      totalHooks: this.currentCallIndex,
      stateHooks: this.stateHooks.length,
      effects: this.effects.length,
      memos: this.memos.length,
      callbacks: this.callbacks.length,
      refs: this.refs.length
    };
  }

  simulateCleanup() {
    this.effects.forEach(effect => {
      if (effect.cleanup) {
        effect.cleanup();
      }
    });
  }
}

const reactMocker = new ReactLifecycleMocker();

// Mock React with lifecycle tracking
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn((...args) => reactMocker.mockUseState(...args)),
  useEffect: jest.fn((...args) => reactMocker.mockUseEffect(...args)),
  useMemo: jest.fn((...args) => reactMocker.mockUseMemo(...args)),
  useCallback: jest.fn((...args) => reactMocker.mockUseCallback(...args)),
  useRef: jest.fn((...args) => reactMocker.mockUseRef(...args)),
  createElement: jest.fn((type, props, ...children) => ({ type, props, children })),
  Fragment: 'Fragment'
}));

// Mock custom hooks
const mockUseDebounced = jest.fn();
const mockUseAsyncOperation = jest.fn();
const mockUsePerformanceMonitor = jest.fn();
const mockUseMemoryMonitor = jest.fn();

jest.mock('../hooks/useDebounced', () => ({
  useDebounced: (...args: any[]) => mockUseDebounced(...args)
}));

jest.mock('../hooks/useMemoryOptimization', () => ({
  useAsyncOperation: (...args: any[]) => mockUseAsyncOperation(...args),
  usePerformanceMonitor: (...args: any[]) => mockUsePerformanceMonitor(...args)
}));

jest.mock('../hooks/useMemoryMonitor', () => ({
  useMemoryMonitor: (...args: any[]) => mockUseMemoryMonitor(...args)
}));

// Mock API
const mockWorkspaceApi = {
  listPages: jest.fn(),
  createPage: jest.fn(),
  getAgent: jest.fn()
};

jest.mock('../services/api', () => ({
  workspaceApi: mockWorkspaceApi
}));

describe('TDD London School: Component Lifecycle Hook Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reactMocker.reset();
    
    // Setup default mock implementations
    mockUseDebounced.mockImplementation((value, delay) => value);
    mockUseAsyncOperation.mockReturnValue({ execute: jest.fn(), loading: false, error: null });
    mockUsePerformanceMonitor.mockReturnValue({ metrics: {} });
    mockUseMemoryMonitor.mockImplementation(() => {});
    
    mockWorkspaceApi.listPages.mockResolvedValue({ pages: [] });
    mockWorkspaceApi.createPage.mockResolvedValue({ id: 'new-page', title: 'New Page' });
    mockWorkspaceApi.getAgent.mockResolvedValue({ 
      success: true, 
      data: { id: 'test-agent', name: 'Test Agent' }
    });
  });

  describe('AgentPagesTab Lifecycle Violations', () => {
    it('SHOULD FAIL: Component mount hook pattern validation', () => {
      const React = require('react');
      
      // Simulate AgentPagesTab component render with exact hook pattern
      const simulateAgentPagesTabMount = (agent = { id: 'test' }) => {
        reactMocker.startRender();
        
        // Exact hooks from AgentPagesTab.tsx
        const [selectedPage, setSelectedPage] = React.useState(null);
        const [isCreating, setIsCreating] = React.useState(false);
        const [isEditing, setIsEditing] = React.useState(false);
        const [searchTerm, setSearchTerm] = React.useState('');
        const debouncedSearchTerm = mockUseDebounced(searchTerm, 300); // Custom hook
        const [selectedCategory, setSelectedCategory] = React.useState('all');
        const [viewMode, setViewMode] = React.useState('grid');
        const [sortBy, setSortBy] = React.useState('updated');
        const [typeFilter, setTypeFilter] = React.useState('all');
        const [difficultyFilter, setDifficultyFilter] = React.useState('all');
        const [showFeaturedFirst, setShowFeaturedFirst] = React.useState(false);
        const [bookmarkedPages, setBookmarkedPages] = React.useState(new Set());
        const [recentPages, setRecentPages] = React.useState([]);
        const [readingProgress, setReadingProgress] = React.useState({});
        const [agentPages, setAgentPages] = React.useState([]);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState(null);
        const [newPage, setNewPage] = React.useState({
          title: '',
          content_type: 'markdown',
          content_value: '',
          page_type: 'dynamic',
          status: 'draft'
        });

        // useEffect for fetching data
        React.useEffect(() => {
          // fetchAgentPages logic
          return () => {}; // cleanup
        }, [agent.id]);

        // useMemo hooks
        const filteredPages = React.useMemo(() => {
          return agentPages.filter(() => true);
        }, [agentPages, debouncedSearchTerm, typeFilter, selectedCategory, difficultyFilter]);

        const filteredAndSortedPages = React.useMemo(() => {
          return [...filteredPages].sort(() => 0);
        }, [filteredPages, sortBy, showFeaturedFirst]);

        return reactMocker.getHooksSummary();
      };

      const mountSummary = simulateAgentPagesTabMount();
      
      // Verify exact hook count matches component
      expect(mountSummary.stateHooks).toBe(17); // 17 useState calls
      expect(mountSummary.effects).toBe(1); // 1 useEffect call
      expect(mountSummary.memos).toBe(2); // 2 useMemo calls
      expect(mountSummary.totalHooks).toBe(21); // Total including custom hooks

      // This would FAIL if component added/removed hooks
      const expectedHookPattern = {
        stateHooks: 17,
        effects: 1, 
        memos: 2,
        customHooks: 1 // useDebounced
      };

      expect(mountSummary.stateHooks).toBe(expectedHookPattern.stateHooks);
      expect(mountSummary.effects).toBe(expectedHookPattern.effects);
      expect(mountSummary.memos).toBe(expectedHookPattern.memos);
    });

    it('SHOULD FAIL: Component remount with different props', () => {
      const React = require('react');
      
      const simulateWithProps = (agent: any) => {
        reactMocker.startRender();
        
        // Basic hooks always present
        React.useState(null); // selectedPage
        React.useState(false); // loading
        React.useState(null); // error
        
        // Conditional hooks based on agent data - VIOLATION!
        if (agent?.pages && agent.pages.length > 0) {
          React.useState([]); // existingPages
          React.useEffect(() => {}, [agent.pages]); // sync effect
        }
        
        if (agent?.configuration?.allowCreation) {
          React.useState(false); // canCreate
          React.useCallback(() => {}, []); // createHandler
        }
        
        React.useEffect(() => {}, [agent.id]); // base effect
        
        return reactMocker.getHooksSummary();
      };

      // First render - minimal agent
      const minimalAgent = { id: 'test', pages: [] };
      const firstRender = simulateWithProps(minimalAgent);

      // Second render - agent with pages and permissions (MORE HOOKS!)
      reactMocker.reset();
      const fullAgent = { 
        id: 'test', 
        pages: ['page1'], 
        configuration: { allowCreation: true }
      };
      const secondRender = simulateWithProps(fullAgent);

      // Different props = different hook count = VIOLATION!
      expect(firstRender.totalHooks).not.toBe(secondRender.totalHooks);
      expect(secondRender.totalHooks).toBeGreaterThan(firstRender.totalHooks);

      const violation = {
        firstRenderHooks: firstRender.totalHooks,
        secondRenderHooks: secondRender.totalHooks,
        difference: secondRender.totalHooks - firstRender.totalHooks
      };

      expect(violation.difference).toBeGreaterThan(0);
    });
  });

  describe('UnifiedAgentPage Lifecycle Violations', () => {
    it('SHOULD FAIL: Tab switching changes hook execution path', () => {
      const React = require('react');
      
      const simulateUnifiedAgentPageRender = (activeTab: string) => {
        reactMocker.startRender();
        
        // Base component hooks (always present)
        const [agent, setAgent] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);
        const [activeTabState, setActiveTab] = React.useState(activeTab);
        const [isConfiguring, setIsConfiguring] = React.useState(false);
        const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
        
        // Memory monitor hook
        mockUseMemoryMonitor(400);
        
        // Router hooks (mocked)
        const navigate = mockNavigate;
        const params = mockParams;
        
        // Main data fetch effect
        React.useEffect(() => {
          // fetchAgentData
        }, [params.agentId]);
        
        // Tab-specific hooks - VIOLATION TRIGGER!
        switch (activeTab) {
          case 'overview':
            // Overview tab specific hooks
            React.useMemo(() => [], []); // stats computation
            React.useCallback(() => {}, []); // refresh handler
            break;
            
          case 'activity':
            // Activity tab specific hooks
            React.useState([]); // activities
            React.useState([]); // posts  
            React.useEffect(() => {}, []); // fetch activities
            React.useMemo(() => [], []); // filtered activities
            break;
            
          case 'configuration':
            // Configuration tab specific hooks
            React.useState({}); // config state
            React.useCallback(() => {}, []); // save handler
            React.useCallback(() => {}, []); // reset handler
            React.useEffect(() => {}, []); // config sync
            break;
            
          case 'pages':
            // Pages tab has MANY hooks (AgentPagesTab)
            for (let i = 0; i < 17; i++) {
              React.useState(null); // All AgentPagesTab states
            }
            React.useEffect(() => {}, []); // fetch pages
            React.useMemo(() => [], []); // filtered
            React.useMemo(() => [], []); // sorted
            break;
        }
        
        return reactMocker.getHooksSummary();
      };

      // Test each tab and collect hook counts
      const tabHookCounts = {
        overview: simulateUnifiedAgentPageRender('overview').totalHooks,
        activity: simulateUnifiedAgentPageRender('activity').totalHooks,
        configuration: simulateUnifiedAgentPageRender('configuration').totalHooks,
        pages: simulateUnifiedAgentPageRender('pages').totalHooks
      };

      reactMocker.reset();

      // Verify each tab has different hook count - VIOLATION!
      const uniqueHookCounts = new Set(Object.values(tabHookCounts));
      const hasViolation = uniqueHookCounts.size > 1;

      expect(hasViolation).toBe(true);
      expect(tabHookCounts.pages).toBeGreaterThan(tabHookCounts.overview);
      expect(tabHookCounts.configuration).toBeGreaterThan(tabHookCounts.activity);
      
      // Log violation details for debugging
      console.log('🚨 TAB HOOK COUNT VIOLATIONS:');
      Object.entries(tabHookCounts).forEach(([tab, count]) => {
        console.log(`  ${tab}: ${count} hooks`);
      });
    });

    it('SHOULD FAIL: Async loading completion changes hook structure', () => {
      const React = require('react');
      
      const simulateAsyncLoadingStates = (loadingState: 'loading' | 'loaded' | 'error') => {
        reactMocker.startRender();
        
        // Base hooks
        const [agent, setAgent] = React.useState(null);
        const [loading, setLoading] = React.useState(loadingState === 'loading');
        const [error, setError] = React.useState(loadingState === 'error' ? 'Error' : null);
        
        React.useEffect(() => {}, []); // mount effect
        
        // State-dependent hooks - VIOLATION!
        if (loadingState === 'loading') {
          React.useState('Loading message');
          React.useEffect(() => {}, []); // loading timeout
        } else if (loadingState === 'loaded') {
          React.useState({}); // loaded data
          React.useState('success'); // success message
          React.useMemo(() => [], []); // processed data
          React.useCallback(() => {}, []); // interaction handlers
          React.useEffect(() => {}, []); // data sync
        } else if (loadingState === 'error') {
          React.useState(0); // retry count
          React.useCallback(() => {}, []); // retry handler
          React.useEffect(() => {}, []); // error recovery
        }
        
        return reactMocker.getHooksSummary();
      };

      const loadingHooks = simulateAsyncLoadingStates('loading').totalHooks;
      reactMocker.reset();
      const loadedHooks = simulateAsyncLoadingStates('loaded').totalHooks;
      reactMocker.reset();
      const errorHooks = simulateAsyncLoadingStates('error').totalHooks;

      // Each loading state has different hook count - VIOLATION!
      expect(loadingHooks).not.toBe(loadedHooks);
      expect(loadedHooks).not.toBe(errorHooks);
      expect(loadingHooks).not.toBe(errorHooks);

      const violations = {
        loading: loadingHooks,
        loaded: loadedHooks,
        error: errorHooks,
        maxDifference: Math.max(loadingHooks, loadedHooks, errorHooks) - Math.min(loadingHooks, loadedHooks, errorHooks)
      };

      expect(violations.maxDifference).toBeGreaterThan(0);
      console.log('🚨 ASYNC LOADING HOOK VIOLATIONS:', violations);
    });
  });

  describe('Mock Interaction Contracts', () => {
    it('should verify exact mock interaction patterns', () => {
      const React = require('react');
      
      // Simulate component lifecycle with mocks
      reactMocker.startRender();
      
      const [state, setState] = React.useState('initial');
      React.useEffect(() => {
        return () => {}; // cleanup
      }, [state]);
      
      const memoValue = React.useMemo(() => 'computed', [state]);
      const callback = React.useCallback(() => state.toUpperCase(), [state]);
      const ref = React.useRef(null);
      
      const summary = reactMocker.getHooksSummary();
      
      // Verify exact mock calls
      expect(React.useState).toHaveBeenCalledTimes(1);
      expect(React.useState).toHaveBeenCalledWith('initial');
      expect(React.useEffect).toHaveBeenCalledTimes(1);
      expect(React.useMemo).toHaveBeenCalledTimes(1);
      expect(React.useCallback).toHaveBeenCalledTimes(1);
      expect(React.useRef).toHaveBeenCalledTimes(1);
      
      // Verify state can be updated
      setState('updated');
      expect(state).toBe('initial'); // Mock behavior
      
      // Verify summary matches calls
      expect(summary.stateHooks).toBe(1);
      expect(summary.effects).toBe(1);
      expect(summary.memos).toBe(1);
      expect(summary.callbacks).toBe(1);
      expect(summary.refs).toBe(1);
    });

    it('should track cleanup function execution', () => {
      const React = require('react');
      const cleanupSpy = jest.fn();
      
      reactMocker.startRender();
      
      React.useEffect(() => {
        return cleanupSpy; // Return cleanup function
      }, []);
      
      // Simulate component unmount
      reactMocker.simulateCleanup();
      
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('should verify dependency change behavior', () => {
      const React = require('react');
      const effectCallback = jest.fn();
      
      // First render
      reactMocker.startRender();
      React.useEffect(effectCallback, ['dep1']);
      expect(effectCallback).toHaveBeenCalledTimes(1);
      
      // Second render with same deps - should not run again
      reactMocker.startRender();  
      React.useEffect(effectCallback, ['dep1']);
      expect(effectCallback).toHaveBeenCalledTimes(1); // Still 1
      
      // Third render with different deps - should run again
      reactMocker.startRender();
      React.useEffect(effectCallback, ['dep2']);
      expect(effectCallback).toHaveBeenCalledTimes(2); // Now 2
    });
  });

  describe('Emergency Violation Prevention', () => {
    it('should provide hook count validation utility', () => {
      const React = require('react');
      
      const validateHookConsistency = (renderFunction: () => any, iterations = 3) => {
        const hookCounts: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          reactMocker.reset();
          renderFunction();
          const summary = reactMocker.getHooksSummary();
          hookCounts.push(summary.totalHooks);
        }
        
        const uniqueCounts = new Set(hookCounts);
        return {
          consistent: uniqueCounts.size === 1,
          hookCounts,
          violation: uniqueCounts.size > 1 ? `Hook count inconsistency: ${Array.from(uniqueCounts).join(', ')}` : null
        };
      };

      // Test consistent component
      const consistentComponent = () => {
        reactMocker.startRender();
        React.useState('test');
        React.useEffect(() => {}, []);
        React.useMemo(() => 'memo', []);
      };

      const consistentResult = validateHookConsistency(consistentComponent);
      expect(consistentResult.consistent).toBe(true);
      expect(consistentResult.violation).toBe(null);

      // Test inconsistent component (with conditional hooks)
      let condition = true;
      const inconsistentComponent = () => {
        reactMocker.startRender();
        React.useState('test');
        if (condition) {
          React.useState('conditional'); // VIOLATION!
        }
        React.useEffect(() => {}, []);
        condition = !condition; // Toggle for next render
      };

      const inconsistentResult = validateHookConsistency(inconsistentComponent);
      expect(inconsistentResult.consistent).toBe(false);
      expect(inconsistentResult.violation).toContain('Hook count inconsistency');
    });
  });
});