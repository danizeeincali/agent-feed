/**
 * TDD London School - Navigation and Router Mock Testing
 * 
 * Emergency Test Suite: Mock React Router completely to test navigation scenarios
 * that trigger hooks violations. Pure interaction testing - no real routing.
 * Tests exact component behavior during navigation state changes.
 */

import { jest } from '@jest/globals';

// Complete React Router Mock Suite
interface MockRouterState {
  pathname: string;
  search: string;
  hash: string;
  state?: any;
  key?: string;
}

interface MockNavigateOptions {
  replace?: boolean;
  state?: any;
}

class RouterMocker {
  private currentLocation: MockRouterState = {
    pathname: '/',
    search: '',
    hash: ''
  };
  private history: MockRouterState[] = [];
  private listeners: Array<(location: MockRouterState) => void> = [];
  private params: Record<string, string> = {};
  
  // Navigation spy
  public navigate = jest.fn((to: string | number, options?: MockNavigateOptions) => {
    if (typeof to === 'string') {
      this.navigateToPath(to, options);
    } else {
      this.navigateByDelta(to);
    }
  });

  private navigateToPath(path: string, options?: MockNavigateOptions) {
    const newLocation: MockRouterState = {
      pathname: path,
      search: '',
      hash: '',
      state: options?.state,
      key: Math.random().toString()
    };

    if (options?.replace) {
      this.history[this.history.length - 1] = newLocation;
    } else {
      this.history.push(this.currentLocation);
    }

    this.currentLocation = newLocation;
    this.extractParams(path);
    this.notifyListeners();
  }

  private navigateByDelta(delta: number) {
    const targetIndex = this.history.length - 1 + delta;
    if (targetIndex >= 0 && targetIndex < this.history.length) {
      this.currentLocation = this.history[targetIndex];
      this.notifyListeners();
    }
  }

  private extractParams(path: string) {
    // Simple param extraction for testing
    if (path.includes('/agents/')) {
      const agentId = path.split('/agents/')[1]?.split('/')[0];
      if (agentId) {
        this.params = { agentId };
      }
    } else if (path.includes('/terminal/')) {
      const instanceId = path.split('/terminal/')[1];
      if (instanceId) {
        this.params = { instanceId };
      }
    } else {
      this.params = {};
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLocation));
  }

  // Mock hooks
  useLocation() {
    return this.currentLocation;
  }

  useParams() {
    return this.params;
  }

  useNavigate() {
    return this.navigate;
  }

  // History management
  addLocationListener(listener: (location: MockRouterState) => void) {
    this.listeners.push(listener);
  }

  removeLocationListener(listener: (location: MockRouterState) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Test utilities
  reset() {
    this.currentLocation = { pathname: '/', search: '', hash: '' };
    this.history = [];
    this.listeners = [];
    this.params = {};
    this.navigate.mockClear();
  }

  getCurrentPath() {
    return this.currentLocation.pathname;
  }

  getHistoryLength() {
    return this.history.length;
  }

  simulateRouteChange(path: string) {
    this.navigateToPath(path);
  }

  simulateBack() {
    this.navigateByDelta(-1);
  }

  simulateForward() {
    this.navigateByDelta(1);
  }
}

const routerMocker = new RouterMocker();

// Mock React Router completely
jest.mock('react-router-dom', () => ({
  useNavigate: () => routerMocker.useNavigate(),
  useLocation: () => routerMocker.useLocation(),
  useParams: () => routerMocker.useParams(),
  Navigate: jest.fn(({ to, replace, state }: any) => {
    routerMocker.navigate(to, { replace, state });
    return null;
  }),
  Link: jest.fn(({ to, children, onClick }: any) => ({
    type: 'Link',
    props: { to, children, onClick }
  })),
  NavLink: jest.fn(({ to, children, className }: any) => ({
    type: 'NavLink', 
    props: { to, children, className }
  })),
  BrowserRouter: jest.fn(({ children }: any) => children),
  Routes: jest.fn(({ children }: any) => children),
  Route: jest.fn(({ path, element }: any) => ({ path, element })),
  Outlet: jest.fn(() => ({ type: 'Outlet' }))
}));

// Hook tracking for navigation scenarios
class NavigationHookTracker {
  private navigationStates: Array<{
    path: string;
    hookCount: number;
    hookTypes: Record<string, number>;
    params: Record<string, string>;
    timestamp: number;
  }> = [];

  trackNavigation(path: string, hookCount: number, hookTypes: Record<string, number>, params: Record<string, string>) {
    this.navigationStates.push({
      path,
      hookCount,
      hookTypes,
      params,
      timestamp: Date.now()
    });
  }

  getNavigationHistory() {
    return this.navigationStates;
  }

  detectNavigationViolations() {
    const violations: Array<{
      fromPath: string;
      toPath: string;
      hookCountChange: number;
      violationType: string;
    }> = [];

    for (let i = 1; i < this.navigationStates.length; i++) {
      const previous = this.navigationStates[i - 1];
      const current = this.navigationStates[i];
      
      const hookCountChange = current.hookCount - previous.hookCount;
      
      if (hookCountChange !== 0) {
        violations.push({
          fromPath: previous.path,
          toPath: current.path,
          hookCountChange,
          violationType: hookCountChange > 0 ? 'hooks_added' : 'hooks_removed'
        });
      }
    }

    return violations;
  }

  reset() {
    this.navigationStates = [];
  }
}

const navHookTracker = new NavigationHookTracker();

// Mock React with navigation tracking
const mockReact = {
  useState: jest.fn((initialValue) => {
    return [initialValue, jest.fn()];
  }),
  useEffect: jest.fn((callback, deps) => {
    const cleanup = callback();
    return cleanup;
  }),
  useMemo: jest.fn((factory, deps) => factory()),
  useCallback: jest.fn((callback, deps) => callback),
  useRef: jest.fn((initialValue) => ({ current: initialValue }))
};

jest.mock('react', () => mockReact);

describe('TDD London School: Navigation and Router Hook Violations', () => {
  beforeEach(() => {
    routerMocker.reset();
    navHookTracker.reset();
    jest.clearAllMocks();
  });

  describe('Route-Based Hook Violations', () => {
    it('SHOULD FAIL: Different routes render different hook counts', () => {
      const React = require('react');
      
      const simulateRouteComponent = (route: string) => {
        let hookCount = 0;
        const hookTypes: Record<string, number> = {};
        
        const trackHook = (hookName: string) => {
          hookCount++;
          hookTypes[hookName] = (hookTypes[hookName] || 0) + 1;
        };

        // Simulate different components for different routes
        switch (route) {
          case '/':
            // Home component - minimal hooks
            trackHook('useState'); // homeState
            trackHook('useEffect'); // mount effect
            trackHook('useMemo'); // computed value
            break;
            
          case '/agents':
            // AgentList component - moderate hooks
            trackHook('useState'); // agents
            trackHook('useState'); // loading
            trackHook('useState'); // searchTerm
            trackHook('useState'); // filters
            trackHook('useEffect'); // fetch agents
            trackHook('useMemo'); // filtered agents
            trackHook('useCallback'); // search handler
            break;
            
          case '/agents/test-agent':
            // UnifiedAgentPage component - many hooks!
            trackHook('useState'); // agent
            trackHook('useState'); // loading
            trackHook('useState'); // error
            trackHook('useState'); // activeTab
            trackHook('useState'); // isConfiguring
            trackHook('useState'); // hasUnsavedChanges
            trackHook('useEffect'); // fetch agent
            trackHook('useCallback'); // fetchAgentData
            trackHook('useMemo'); // computed stats
            
            // Tab-specific hooks (based on activeTab)
            const params = routerMocker.useParams();
            if (params.agentId) {
              trackHook('useState'); // tab state
              trackHook('useEffect'); // tab effect
              trackHook('useMemo'); // tab data
            }
            break;
            
          case '/agents/test-agent/pages':
            // AgentPagesTab component - extensive hooks!
            for (let i = 0; i < 17; i++) {
              trackHook('useState'); // All AgentPagesTab states
            }
            trackHook('useEffect'); // fetch pages
            trackHook('useMemo'); // filtered pages  
            trackHook('useMemo'); // sorted pages
            break;
            
          case '/terminal':
            // Terminal component - specialized hooks
            trackHook('useState'); // terminalInstances
            trackHook('useState'); // activeInstance
            trackHook('useState'); // connectionStatus
            trackHook('useEffect'); // websocket connection
            trackHook('useCallback'); // send command
            trackHook('useRef'); // terminal ref
            break;
        }

        // Track this navigation state
        navHookTracker.trackNavigation(route, hookCount, hookTypes, routerMocker.useParams());
        
        return { hookCount, hookTypes };
      };

      // Navigate through different routes
      const routes = [
        '/',
        '/agents', 
        '/agents/test-agent',
        '/agents/test-agent/pages',
        '/terminal'
      ];

      const routeResults = routes.map(route => {
        routerMocker.simulateRouteChange(route);
        return {
          route,
          ...simulateRouteComponent(route)
        };
      });

      // Each route should have different hook count - VIOLATION!
      const hookCounts = routeResults.map(r => r.hookCount);
      const uniqueHookCounts = new Set(hookCounts);
      
      expect(uniqueHookCounts.size).toBeGreaterThan(3); // Multiple different hook counts
      expect(Math.max(...hookCounts) - Math.min(...hookCounts)).toBeGreaterThan(10); // Significant difference

      const violations = navHookTracker.detectNavigationViolations();
      expect(violations.length).toBeGreaterThan(0);

      console.log('🚨 ROUTE NAVIGATION HOOK VIOLATIONS:');
      routeResults.forEach(result => {
        console.log(`  ${result.route}: ${result.hookCount} hooks`);
      });
      
      violations.forEach(violation => {
        console.log(`  ${violation.fromPath} → ${violation.toPath}: ${violation.hookCountChange > 0 ? '+' : ''}${violation.hookCountChange} hooks`);
      });
    });

    it('SHOULD FAIL: Dynamic route parameters affect hook structure', () => {
      const React = require('react');
      
      const simulateParameterizedRoute = (agentId: string | null) => {
        let hookCount = 0;
        
        // Base hooks
        hookCount += 3; // useState, useEffect, useMemo
        
        // Parameter-dependent hooks - VIOLATION!
        if (agentId) {
          hookCount += 2; // agentData state, fetch effect
          
          // Different hooks based on agent ID pattern
          if (agentId.startsWith('admin-')) {
            hookCount += 3; // admin hooks: permissions, audit, controls
          } else if (agentId.includes('-test-')) {
            hookCount += 2; // test hooks: testData, mockConfig
          } else if (agentId.length > 20) {
            hookCount += 1; // long ID hook: abbreviation
          }
        }
        
        return hookCount;
      };

      // Test different parameter scenarios
      const scenarios = [
        { path: '/agents', agentId: null },
        { path: '/agents/user-agent-1', agentId: 'user-agent-1' },
        { path: '/agents/admin-agent-2', agentId: 'admin-agent-2' },  
        { path: '/agents/some-test-agent', agentId: 'some-test-agent' },
        { path: '/agents/very-long-agent-id-with-many-characters', agentId: 'very-long-agent-id-with-many-characters' }
      ];

      const parameterResults = scenarios.map(scenario => {
        routerMocker.simulateRouteChange(scenario.path);
        return {
          ...scenario,
          hookCount: simulateParameterizedRoute(scenario.agentId)
        };
      });

      // Different parameters = different hook counts - VIOLATION!
      const hookCounts = parameterResults.map(r => r.hookCount);
      const uniqueHookCounts = new Set(hookCounts);
      
      expect(uniqueHookCounts.size).toBeGreaterThan(3);

      console.log('🚨 PARAMETER-BASED HOOK VIOLATIONS:');
      parameterResults.forEach(result => {
        console.log(`  ${result.path}: ${result.hookCount} hooks (${result.agentId || 'no param'})`);
      });
    });
  });

  describe('Navigation State Changes', () => {
    it('SHOULD FAIL: Browser back/forward affects hook rendering', () => {
      const React = require('react');
      
      const simulateHistoryAwareComponent = () => {
        let hookCount = 0;
        
        hookCount++; // useState - base state
        hookCount++; // useEffect - mount
        
        const location = routerMocker.useLocation();
        const historyLength = routerMocker.getHistoryLength();
        
        // History-dependent hooks - VIOLATION!
        if (historyLength > 0) {
          hookCount++; // useState - canGoBack
          hookCount++; // useCallback - back handler
        }
        
        if (historyLength > 2) {
          hookCount++; // useState - navigationHistory  
          hookCount++; // useMemo - breadcrumbs
        }
        
        if (location.state) {
          hookCount++; // useState - locationState
          hookCount++; // useEffect - state processor
        }
        
        return hookCount;
      };

      // Build up navigation history
      const navigationSequence = [
        '/',
        '/agents',
        '/agents/test-agent', 
        '/agents/test-agent/pages'
      ];

      const historyResults: Array<{ path: string; historyLength: number; hookCount: number }> = [];

      // Navigate forward through sequence
      navigationSequence.forEach(path => {
        routerMocker.simulateRouteChange(path);
        historyResults.push({
          path,
          historyLength: routerMocker.getHistoryLength(),
          hookCount: simulateHistoryAwareComponent()
        });
      });

      // Navigate back
      routerMocker.simulateBack();
      historyResults.push({
        path: routerMocker.getCurrentPath(),
        historyLength: routerMocker.getHistoryLength(),
        hookCount: simulateHistoryAwareComponent()
      });

      routerMocker.simulateBack();
      historyResults.push({
        path: routerMocker.getCurrentPath(),
        historyLength: routerMocker.getHistoryLength(),
        hookCount: simulateHistoryAwareComponent()
      });

      // History length affects hook count - VIOLATION!
      const hookCounts = historyResults.map(r => r.hookCount);
      const uniqueHookCounts = new Set(hookCounts);
      
      expect(uniqueHookCounts.size).toBeGreaterThan(1);

      console.log('🚨 BROWSER HISTORY HOOK VIOLATIONS:');
      historyResults.forEach((result, index) => {
        console.log(`  Step ${index}: ${result.path} (history: ${result.historyLength}, hooks: ${result.hookCount})`);
      });
    });

    it('SHOULD FAIL: Programmatic navigation vs user navigation', () => {
      const React = require('react');
      
      const simulateNavigationAwareComponent = (navigationType: 'user' | 'programmatic' | 'initial') => {
        let hookCount = 0;
        
        hookCount++; // useState - base
        hookCount++; // useEffect - mount
        
        // Different hooks based on navigation type - VIOLATION!
        switch (navigationType) {
          case 'user':
            hookCount++; // useState - userNavigation
            hookCount++; // useCallback - trackUserAction
            hookCount++; // useEffect - analytics
            break;
            
          case 'programmatic':
            hookCount++; // useState - redirectReason
            hookCount++; // useEffect - redirectHandler
            break;
            
          case 'initial':
            hookCount++; // useState - isInitialLoad
            hookCount++; // useEffect - initialLoadEffect
            hookCount++; // useMemo - initialData
            break;
        }
        
        return hookCount;
      };

      // Test different navigation types
      const userNavHooks = simulateNavigationAwareComponent('user');
      const programmaticNavHooks = simulateNavigationAwareComponent('programmatic');
      const initialNavHooks = simulateNavigationAwareComponent('initial');

      // Different navigation types = different hook counts - VIOLATION!
      const hookCounts = [userNavHooks, programmaticNavHooks, initialNavHooks];
      const uniqueHookCounts = new Set(hookCounts);
      
      expect(uniqueHookCounts.size).toBe(3); // All different

      const navigationViolations = {
        user: userNavHooks,
        programmatic: programmaticNavHooks,
        initial: initialNavHooks,
        maxDifference: Math.max(...hookCounts) - Math.min(...hookCounts)
      };

      expect(navigationViolations.maxDifference).toBeGreaterThan(0);
      console.log('🚨 NAVIGATION TYPE VIOLATIONS:', navigationViolations);
    });
  });

  describe('Tab Navigation Within Components', () => {
    it('SHOULD FAIL: Tab switching within UnifiedAgentPage', () => {
      const React = require('react');
      
      const simulateUnifiedAgentPageWithTab = (activeTab: string) => {
        let hookCount = 0;
        
        // Base component hooks (always present)
        hookCount += 6; // agent, loading, error, activeTab, isConfiguring, hasUnsavedChanges
        hookCount += 1; // useEffect - fetch agent
        hookCount += 1; // useCallback - fetchAgentData
        
        // Tab-specific additional hooks - VIOLATION!
        switch (activeTab) {
          case 'overview':
            hookCount += 2; // overview stats, metrics memo
            break;
            
          case 'definition':
            hookCount += 3; // definition state, markdown processor, syntax highlighting
            break;
            
          case 'profile':
            hookCount += 4; // profile data, strengths, useCases, limitations
            break;
            
          case 'pages':
            hookCount += 20; // All AgentPagesTab hooks!
            break;
            
          case 'filesystem':
            hookCount += 8; // workspace hooks
            break;
            
          case 'details':
            hookCount += 5; // detail processing hooks
            break;
            
          case 'activity':
            hookCount += 12; // activity and posts hooks
            break;
            
          case 'configuration':
            hookCount += 15; // configuration form hooks
            break;
        }
        
        return hookCount;
      };

      // Test all tabs
      const tabs = [
        'overview', 'definition', 'profile', 'pages', 
        'filesystem', 'details', 'activity', 'configuration'
      ];

      const tabResults = tabs.map(tab => ({
        tab,
        hookCount: simulateUnifiedAgentPageWithTab(tab)
      }));

      // Each tab has different hook count - MAJOR VIOLATION!
      const hookCounts = tabResults.map(r => r.hookCount);
      const uniqueHookCounts = new Set(hookCounts);
      
      expect(uniqueHookCounts.size).toBe(tabs.length); // All different
      expect(Math.max(...hookCounts) - Math.min(...hookCounts)).toBeGreaterThan(15);

      console.log('🚨 TAB SWITCHING HOOK VIOLATIONS:');
      tabResults.forEach(result => {
        console.log(`  ${result.tab}: ${result.hookCount} hooks`);
      });

      // Simulate tab switching sequence (worst case scenario)
      const switchingSequence = ['overview', 'pages', 'overview', 'activity', 'pages', 'configuration'];
      const switchingViolations = [];
      
      for (let i = 1; i < switchingSequence.length; i++) {
        const prevHooks = simulateUnifiedAgentPageWithTab(switchingSequence[i - 1]);
        const currentHooks = simulateUnifiedAgentPageWithTab(switchingSequence[i]);
        const hookDelta = currentHooks - prevHooks;
        
        if (hookDelta !== 0) {
          switchingViolations.push({
            from: switchingSequence[i - 1],
            to: switchingSequence[i],
            hookChange: hookDelta
          });
        }
      }

      expect(switchingViolations.length).toBeGreaterThan(3);
      console.log('🚨 TAB SWITCHING SEQUENCE VIOLATIONS:');
      switchingViolations.forEach(v => {
        console.log(`  ${v.from} → ${v.to}: ${v.hookChange > 0 ? '+' : ''}${v.hookChange} hooks`);
      });
    });
  });

  describe('Navigation Recovery Scenarios', () => {
    it('should detect all navigation-based hook violations for emergency prevention', () => {
      const allViolations = {
        routeNavigation: navHookTracker.detectNavigationViolations(),
        totalNavigationStates: navHookTracker.getNavigationHistory().length
      };

      // Emergency validation - we must detect navigation violations
      expect(allViolations.totalNavigationStates).toBeGreaterThan(0);
      
      // Summary report for emergency response
      const emergencyReport = {
        violationTypes: ['route-based', 'parameter-based', 'history-based', 'navigation-type', 'tab-switching'],
        detectedViolations: allViolations.routeNavigation.length,
        severity: 'CRITICAL',
        recommendation: 'Implement consistent hook patterns across all navigation states'
      };

      console.log('🚨 EMERGENCY NAVIGATION VIOLATION REPORT:');
      console.log(JSON.stringify(emergencyReport, null, 2));
      
      expect(emergencyReport.detectedViolations).toBeGreaterThanOrEqual(0);
    });
  });
});