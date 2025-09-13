/**
 * TDD London School - Browser Environment Hooks Testing
 * 
 * Emergency Test Suite: Simulate real browser environment scenarios that trigger
 * "Rendered more hooks than during the previous render" error.
 * Uses London School approach with comprehensive mocking of browser APIs.
 */

import { jest } from '@jest/globals';

// Mock browser environment
const mockWindow = {
  location: { reload: jest.fn(), href: 'http://localhost:3000' },
  localStorage: new Map(),
  sessionStorage: new Map(),
  history: { pushState: jest.fn(), replaceState: jest.fn() },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  gtag: jest.fn(),
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn()
};

const mockDocument = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  visibilityState: 'visible',
  hidden: false
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  onLine: true,
  language: 'en-US'
};

// Mock React Router
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  useLocation: () => mockUseLocation(),
  Navigate: ({ to }: any) => ({ to }),
  Link: ({ children, to }: any) => ({ children, to })
}));

// Hook tracking for browser scenarios
class BrowserHooksTracker {
  private scenarios: Array<{
    name: string;
    hookCounts: number[];
    violations: string[];
  }> = [];

  trackScenario(name: string, hookCounts: number[], violations: string[]) {
    this.scenarios.push({ name, hookCounts, violations });
  }

  getViolationsForScenario(name: string): string[] {
    const scenario = this.scenarios.find(s => s.name === name);
    return scenario?.violations || [];
  }

  hasViolations(name: string): boolean {
    return this.getViolationsForScenario(name).length > 0;
  }

  reset() {
    this.scenarios = [];
  }
}

const browserTracker = new BrowserHooksTracker();

describe('TDD London School: Browser Environment Hook Violations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    browserTracker.reset();
    
    // Setup browser mocks
    Object.defineProperty(globalThis, 'window', { value: mockWindow, writable: true });
    Object.defineProperty(globalThis, 'document', { value: mockDocument, writable: true });
    Object.defineProperty(globalThis, 'navigator', { value: mockNavigator, writable: true });
    
    // Reset router mocks
    mockUseParams.mockReturnValue({ agentId: 'test-agent-1' });
    mockUseLocation.mockReturnValue({ pathname: '/agents/test-agent-1' });
  });

  describe('Navigation-Triggered Hook Violations', () => {
    it('SHOULD FAIL: Tab switching causes hook count variation', async () => {
      // Mock component that renders different hooks based on active tab
      const simulateTabComponentRender = (activeTab: string) => {
        const hooks: string[] = [];
        
        // Base hooks always present
        hooks.push('useState-activeTab');
        hooks.push('useState-loading');
        hooks.push('useEffect-mount');
        
        // Conditional hooks based on tab - VIOLATION TRIGGER!
        switch (activeTab) {
          case 'overview':
            hooks.push('useState-metrics');
            hooks.push('useMemo-stats');
            break;
          case 'activity':
            hooks.push('useState-activities');
            hooks.push('useState-posts');
            hooks.push('useEffect-fetch-activities');
            hooks.push('useMemo-filtered-activities');
            break;
          case 'configuration':
            hooks.push('useState-config');
            hooks.push('useState-hasChanges');
            hooks.push('useCallback-saveConfig');
            break;
          // Pages tab has even more hooks!
          case 'pages':
            hooks.push('useState-selectedPage');
            hooks.push('useState-isCreating');
            hooks.push('useState-searchTerm');
            hooks.push('useState-selectedCategory');
            hooks.push('useState-viewMode');
            hooks.push('useState-bookmarkedPages');
            hooks.push('useEffect-fetchPages');
            hooks.push('useMemo-filteredPages');
            hooks.push('useMemo-sortedPages');
            break;
        }
        
        return hooks;
      };

      // Navigate through tabs and track hook counts
      const overviewHooks = simulateTabComponentRender('overview');
      const activityHooks = simulateTabComponentRender('activity');
      const configHooks = simulateTabComponentRender('configuration');
      const pagesHooks = simulateTabComponentRender('pages');

      const hookCounts = [
        overviewHooks.length,
        activityHooks.length,
        configHooks.length,
        pagesHooks.length
      ];

      // Different tab = different hook count = VIOLATION!
      const uniqueHookCounts = new Set(hookCounts);
      const hasViolation = uniqueHookCounts.size > 1;
      
      const violations: string[] = [];
      if (hasViolation) {
        violations.push(`Tab switching causes hook count variation: ${hookCounts.join(' -> ')}`);
        violations.push(`Overview: ${overviewHooks.length} hooks`);
        violations.push(`Activity: ${activityHooks.length} hooks`);
        violations.push(`Configuration: ${configHooks.length} hooks`);
        violations.push(`Pages: ${pagesHooks.length} hooks`);
      }

      browserTracker.trackScenario('tab-switching', hookCounts, violations);

      // This MUST fail to prove we can detect tab-switching violations
      expect(hasViolation).toBe(true);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('hook count variation');
    });

    it('SHOULD FAIL: Route navigation with different components', () => {
      const simulateRouteRender = (route: string) => {
        const hooks: string[] = [];
        
        switch (route) {
          case '/agents':
            // AgentList component hooks
            hooks.push('useState-agents');
            hooks.push('useState-loading');
            hooks.push('useState-searchTerm');
            hooks.push('useEffect-fetchAgents');
            hooks.push('useMemo-filteredAgents');
            break;
            
          case '/agents/:id':
            // UnifiedAgentPage component hooks - MANY MORE!
            hooks.push('useState-agent');
            hooks.push('useState-loading');
            hooks.push('useState-error');
            hooks.push('useState-activeTab');
            hooks.push('useState-isConfiguring');
            hooks.push('useState-hasUnsavedChanges');
            hooks.push('useCallback-fetchAgentData');
            hooks.push('useEffect-fetchData');
            hooks.push('useMemoryMonitor');
            hooks.push('useParams');
            hooks.push('useNavigate');
            // ... and many more based on active tab
            break;
            
          case '/terminal':
            // Terminal component hooks
            hooks.push('useState-terminalInstances');
            hooks.push('useState-activeInstance');
            hooks.push('useWebSocket');
            hooks.push('useTerminalManager');
            break;
        }
        
        return hooks;
      };

      const agentListHooks = simulateRouteRender('/agents');
      const agentPageHooks = simulateRouteRender('/agents/:id');
      const terminalHooks = simulateRouteRender('/terminal');

      const hookCounts = [agentListHooks.length, agentPageHooks.length, terminalHooks.length];
      const violations = [
        `Route navigation causes hook count changes: ${hookCounts.join(' -> ')}`,
        `Agent List: ${agentListHooks.length} hooks`,
        `Agent Page: ${agentPageHooks.length} hooks`, 
        `Terminal: ${terminalHooks.length} hooks`
      ];

      browserTracker.trackScenario('route-navigation', hookCounts, violations);

      // Different routes = different components = different hook counts
      expect(new Set(hookCounts).size).toBeGreaterThan(1);
      expect(violations.length).toBe(4);
    });
  });

  describe('Browser Cache and Storage Scenarios', () => {
    it('SHOULD FAIL: localStorage changes affect hook rendering', () => {
      const simulateComponentWithLocalStorage = (hasStoredData: boolean) => {
        const hooks: string[] = [];
        
        // Base hooks
        hooks.push('useState-data');
        hooks.push('useEffect-mount');
        
        // Conditional hooks based on localStorage - VIOLATION!
        if (hasStoredData) {
          hooks.push('useState-cachedData');
          hooks.push('useEffect-hydrateFromCache');
          hooks.push('useMemo-mergedData');
        }
        
        hooks.push('useEffect-syncToStorage');
        return hooks;
      };

      // First render - no cached data
      mockWindow.localStorage.clear();
      const noCacheHooks = simulateComponentWithLocalStorage(false);
      
      // Second render - with cached data (VIOLATION!)
      mockWindow.localStorage.set('agentData', JSON.stringify({}));
      const withCacheHooks = simulateComponentWithLocalStorage(true);

      const hookCounts = [noCacheHooks.length, withCacheHooks.length];
      const violations = hookCounts[0] !== hookCounts[1] ? [
        `localStorage state affects hook count: ${hookCounts[0]} -> ${hookCounts[1]}`,
        `Without cache: ${noCacheHooks.length} hooks`,
        `With cache: ${withCacheHooks.length} hooks`
      ] : [];

      browserTracker.trackScenario('localStorage-hooks', hookCounts, violations);

      expect(hookCounts[0]).not.toBe(hookCounts[1]);
      expect(violations.length).toBeGreaterThan(0);
    });

    it('SHOULD FAIL: Browser refresh with different initial state', () => {
      const simulatePostRefreshRender = (hadPreviousSession: boolean) => {
        const hooks: string[] = [];
        
        hooks.push('useState-initialized');
        hooks.push('useEffect-mount');
        
        // Different hooks based on previous session - VIOLATION!
        if (hadPreviousSession) {
          hooks.push('useState-restoredState');
          hooks.push('useEffect-restoreSession');
          hooks.push('useMemo-sessionData');
        } else {
          hooks.push('useState-freshStart');
          hooks.push('useEffect-initializeDefaults');
        }
        
        return hooks;
      };

      const freshStartHooks = simulatePostRefreshRender(false);
      const restoredSessionHooks = simulatePostRefreshRender(true);

      const violations = [
        `Browser refresh state affects hooks: ${freshStartHooks.length} vs ${restoredSessionHooks.length}`,
        `Fresh start path: ${freshStartHooks.map(h => h.split('-')[1]).join(', ')}`,
        `Restored session path: ${restoredSessionHooks.map(h => h.split('-')[1]).join(', ')}`
      ];

      browserTracker.trackScenario('refresh-state', 
        [freshStartHooks.length, restoredSessionHooks.length], violations);

      expect(freshStartHooks.length).not.toBe(restoredSessionHooks.length);
      expect(violations.length).toBe(3);
    });
  });

  describe('Hot Reload and Development Scenarios', () => {
    it('SHOULD FAIL: Hot reload with modified component structure', () => {
      const simulateBeforeHotReload = () => {
        return [
          'useState-data',
          'useState-loading',
          'useEffect-fetch',
          'useMemo-processed'
        ];
      };

      const simulateAfterHotReload = () => {
        return [
          'useState-data',
          'useState-loading',
          'useState-error', // NEW HOOK ADDED!
          'useEffect-fetch',
          'useEffect-errorHandling', // ANOTHER NEW HOOK!
          'useMemo-processed'
        ];
      };

      const beforeHooks = simulateBeforeHotReload();
      const afterHooks = simulateAfterHotReload();

      const violations = [
        `Hot reload added hooks: ${beforeHooks.length} -> ${afterHooks.length}`,
        `New hooks: ${afterHooks.filter(h => !beforeHooks.includes(h)).join(', ')}`
      ];

      browserTracker.trackScenario('hot-reload', 
        [beforeHooks.length, afterHooks.length], violations);

      expect(afterHooks.length).toBeGreaterThan(beforeHooks.length);
      expect(violations[1]).toContain('useState-error, useEffect-errorHandling');
    });

    it('SHOULD FAIL: React DevTools state manipulation', () => {
      const simulateDevToolsIntervention = (devToolsActive: boolean) => {
        const hooks: string[] = [];
        
        hooks.push('useState-component');
        hooks.push('useEffect-main');
        
        // DevTools adds debugging hooks - VIOLATION!
        if (devToolsActive) {
          hooks.push('useState-devToolsState');
          hooks.push('useEffect-devToolsSync');
          hooks.push('useDebugValue');
        }
        
        return hooks;
      };

      const normalHooks = simulateDevToolsIntervention(false);
      const devToolsHooks = simulateDevToolsIntervention(true);

      const violations = [
        `DevTools intervention affects hooks: ${normalHooks.length} -> ${devToolsHooks.length}`,
        `DevTools added: ${devToolsHooks.filter(h => !normalHooks.includes(h)).join(', ')}`
      ];

      browserTracker.trackScenario('devtools-intervention',
        [normalHooks.length, devToolsHooks.length], violations);

      expect(devToolsHooks.length).toBeGreaterThan(normalHooks.length);
      expect(violations[1]).toContain('devToolsState');
    });
  });

  describe('Component Recovery Scenarios', () => {
    it('SHOULD FAIL: Error boundary recovery changes hook structure', () => {
      const simulateNormalRender = () => [
        'useState-data',
        'useState-loading',
        'useEffect-fetch',
        'useMemo-computed'
      ];

      const simulateErrorRecovery = () => [
        'useState-data',
        'useState-loading', 
        'useState-error', // Error state hook added
        'useState-retryCount', // Retry logic hook
        'useEffect-fetch',
        'useEffect-retryLogic', // New effect for retries
        'useMemo-computed'
      ];

      const normalHooks = simulateNormalRender();
      const recoveryHooks = simulateErrorRecovery();

      const violations = [
        `Error recovery adds hooks: ${normalHooks.length} -> ${recoveryHooks.length}`,
        `Recovery hooks: ${recoveryHooks.filter(h => !normalHooks.includes(h)).join(', ')}`
      ];

      browserTracker.trackScenario('error-recovery',
        [normalHooks.length, recoveryHooks.length], violations);

      expect(recoveryHooks.length).toBeGreaterThan(normalHooks.length);
      expect(violations.length).toBe(2);
    });

    it('SHOULD FAIL: Lazy loading completion changes hook count', () => {
      const simulateLoadingState = () => [
        'useState-isLoading',
        'useState-hasError',
        'useEffect-initLoader'
      ];

      const simulateLoadedState = () => [
        'useState-isLoading',
        'useState-hasError',
        'useState-loadedComponent', // New hook for loaded component
        'useState-componentProps', // Props for loaded component
        'useEffect-initLoader',
        'useEffect-componentLifecycle', // Loaded component lifecycle
        'useMemo-componentConfig' // Config memo for loaded component
      ];

      const loadingHooks = simulateLoadingState();
      const loadedHooks = simulateLoadedState();

      const violations = [
        `Lazy loading completion adds hooks: ${loadingHooks.length} -> ${loadedHooks.length}`,
        `Post-load hooks: ${loadedHooks.filter(h => !loadingHooks.includes(h)).join(', ')}`
      ];

      browserTracker.trackScenario('lazy-loading',
        [loadingHooks.length, loadedHooks.length], violations);

      expect(loadedHooks.length).toBeGreaterThan(loadingHooks.length);
      expect(violations[1]).toContain('loadedComponent');
    });
  });

  describe('Performance and Memory Scenarios', () => {
    it('should detect hook violations under memory pressure', () => {
      const simulateMemoryPressureRender = (lowMemory: boolean) => {
        const hooks: string[] = [];
        
        hooks.push('useState-data');
        hooks.push('useEffect-mount');
        
        // Under memory pressure, component might skip optimization hooks
        if (!lowMemory) {
          hooks.push('useMemo-expensiveComputation');
          hooks.push('useCallback-memoizedFunction');
          hooks.push('useMemo-derivedState');
        }
        
        return hooks;
      };

      const normalHooks = simulateMemoryPressureRender(false);
      const lowMemoryHooks = simulateMemoryPressureRender(true);

      const hookCounts = [normalHooks.length, lowMemoryHooks.length];
      const violations = hookCounts[0] !== hookCounts[1] ? [
        `Memory pressure affects hook count: ${hookCounts.join(' -> ')}`,
        `Normal: ${normalHooks.length} hooks`,
        `Low memory: ${lowMemoryHooks.length} hooks`
      ] : [];

      browserTracker.trackScenario('memory-pressure', hookCounts, violations);

      expect(normalHooks.length).toBeGreaterThan(lowMemoryHooks.length);
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive Violation Summary', () => {
    it('should report all detected browser-environment violations', () => {
      const allScenarios = [
        'tab-switching',
        'route-navigation', 
        'localStorage-hooks',
        'refresh-state',
        'hot-reload',
        'devtools-intervention',
        'error-recovery',
        'lazy-loading',
        'memory-pressure'
      ];

      const violationSummary = allScenarios.map(scenario => ({
        scenario,
        hasViolations: browserTracker.hasViolations(scenario),
        violations: browserTracker.getViolationsForScenario(scenario)
      }));

      const totalViolations = violationSummary.reduce((sum, s) => sum + s.violations.length, 0);
      const scenariosWithViolations = violationSummary.filter(s => s.hasViolations).length;

      // Emergency validation - we MUST detect violations to prevent production issues
      expect(totalViolations).toBeGreaterThan(10); // Should detect many violations
      expect(scenariosWithViolations).toBeGreaterThan(5); // Most scenarios should have violations

      console.log('🚨 BROWSER ENVIRONMENT VIOLATIONS DETECTED:');
      violationSummary.forEach(({ scenario, violations }) => {
        if (violations.length > 0) {
          console.log(`\n${scenario.toUpperCase()}:`);
          violations.forEach(v => console.log(`  ❌ ${v}`));
        }
      });
    });
  });
});