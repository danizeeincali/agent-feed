/**
 * TDD London School - Cache and State Manipulation Testing
 * 
 * Emergency Test Suite: Mock browser cache, localStorage, sessionStorage, and React state 
 * to test exact scenarios where cache/state changes trigger hooks violations.
 * Pure mockist approach - test interactions without real browser dependencies.
 */

import { jest } from '@jest/globals';

// Comprehensive browser storage mocking
interface MockStorage {
  data: Map<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
  key: jest.Mock;
  length: number;
}

class BrowserStorageMocker {
  private localStorage: MockStorage;
  private sessionStorage: MockStorage;
  private memoryCache: Map<string, any> = new Map();
  private cacheChangeListeners: Array<(key: string, value: any) => void> = [];

  constructor() {
    this.localStorage = this.createMockStorage();
    this.sessionStorage = this.createMockStorage();
  }

  private createMockStorage(): MockStorage {
    const data = new Map<string, string>();
    
    return {
      data,
      getItem: jest.fn((key: string) => data.get(key) || null),
      setItem: jest.fn((key: string, value: string) => {
        data.set(key, value);
        this.notifyCacheChange(key, value);
      }),
      removeItem: jest.fn((key: string) => data.delete(key)),
      clear: jest.fn(() => data.clear()),
      key: jest.fn((index: number) => Array.from(data.keys())[index] || null),
      get length() { return data.size; }
    };
  }

  getLocalStorage() {
    return this.localStorage;
  }

  getSessionStorage() {
    return this.sessionStorage;
  }

  setMemoryCache(key: string, value: any) {
    this.memoryCache.set(key, value);
    this.notifyCacheChange(key, value);
  }

  getMemoryCache(key: string) {
    return this.memoryCache.get(key);
  }

  clearMemoryCache() {
    this.memoryCache.clear();
  }

  onCacheChange(listener: (key: string, value: any) => void) {
    this.cacheChangeListeners.push(listener);
  }

  private notifyCacheChange(key: string, value: any) {
    this.cacheChangeListeners.forEach(listener => listener(key, value));
  }

  reset() {
    this.localStorage.clear();
    this.sessionStorage.clear();
    this.clearMemoryCache();
    this.cacheChangeListeners = [];
    jest.clearAllMocks();
  }

  simulateBrowserRefresh() {
    // Session storage persists, memory cache clears
    this.clearMemoryCache();
    // localStorage persists
  }

  simulateTabClose() {
    // Session storage clears, localStorage persists
    this.sessionStorage.clear();
  }

  simulateCacheClear() {
    this.localStorage.clear();
    this.sessionStorage.clear();
    this.clearMemoryCache();
  }
}

const browserStorage = new BrowserStorageMocker();

// Mock browser globals
Object.defineProperty(globalThis, 'localStorage', {
  value: browserStorage.getLocalStorage(),
  writable: true
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: browserStorage.getSessionStorage(),
  writable: true
});

// Mock React with hook tracking for cache scenarios
class CacheHookTracker {
  private hookCalls: Array<{
    hookType: string;
    callIndex: number;
    dependencies?: any[];
    cacheKey?: string;
    timestamp: number;
  }> = [];
  private renderCount = 0;

  reset() {
    this.hookCalls = [];
    this.renderCount = 0;
  }

  startRender() {
    this.renderCount++;
    this.hookCalls = [];
  }

  trackHook(hookType: string, dependencies?: any[], cacheKey?: string) {
    this.hookCalls.push({
      hookType,
      callIndex: this.hookCalls.length,
      dependencies,
      cacheKey,
      timestamp: Date.now()
    });
  }

  getHooksSummary() {
    return {
      renderCount: this.renderCount,
      totalHooks: this.hookCalls.length,
      hooksByType: this.hookCalls.reduce((acc, hook) => {
        acc[hook.hookType] = (acc[hook.hookType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      cacheRelatedHooks: this.hookCalls.filter(h => h.cacheKey).length
    };
  }

  detectViolation(previousSummary?: any) {
    if (!previousSummary) return { hasViolation: false };
    
    const current = this.getHooksSummary();
    const hasViolation = current.totalHooks !== previousSummary.totalHooks;
    
    return {
      hasViolation,
      details: hasViolation ? {
        previous: previousSummary.totalHooks,
        current: current.totalHooks,
        difference: current.totalHooks - previousSummary.totalHooks
      } : null
    };
  }
}

const cacheHookTracker = new CacheHookTracker();

// Mock React with cache-aware hooks
const mockReact = {
  useState: jest.fn((initialValue) => {
    cacheHookTracker.trackHook('useState');
    return [initialValue, jest.fn()];
  }),
  useEffect: jest.fn((callback, deps) => {
    cacheHookTracker.trackHook('useEffect', deps);
    return callback();
  }),
  useMemo: jest.fn((factory, deps) => {
    cacheHookTracker.trackHook('useMemo', deps);
    return factory();
  }),
  useCallback: jest.fn((callback, deps) => {
    cacheHookTracker.trackHook('useCallback', deps);
    return callback;
  })
};

jest.mock('react', () => mockReact);

describe('TDD London School: Cache and State Manipulation Hook Violations', () => {
  beforeEach(() => {
    browserStorage.reset();
    cacheHookTracker.reset();
    jest.clearAllMocks();
  });

  describe('localStorage State-Dependent Hooks', () => {
    it('SHOULD FAIL: Component renders different hooks based on localStorage', () => {
      const React = require('react');
      
      const simulateComponentWithLocalStorage = (scenario: string) => {
        cacheHookTracker.startRender();
        
        // Base hooks always present
        React.useState('baseState');
        React.useEffect(() => {}, []);
        
        // Get cached data
        const cachedData = localStorage.getItem('agentData');
        const cachedPreferences = localStorage.getItem('userPreferences');
        const cachedSession = localStorage.getItem('sessionData');
        
        // Conditional hooks based on cache state - VIOLATION!
        if (cachedData) {
          React.useState(JSON.parse(cachedData)); // Cached data state
          React.useEffect(() => {
            // Hydration effect
          }, [cachedData]);
          React.useMemo(() => {
            // Process cached data
            return JSON.parse(cachedData);
          }, [cachedData]);
        }
        
        if (cachedPreferences) {
          React.useState(JSON.parse(cachedPreferences)); // Preferences state
          React.useCallback(() => {
            // Save preferences handler
          }, [cachedPreferences]);
        }
        
        if (cachedSession && JSON.parse(cachedSession).isAuthenticated) {
          React.useState(true); // Auth state
          React.useState({}); // User profile state
          React.useEffect(() => {
            // Auth sync effect
          }, []);
        }
        
        return cacheHookTracker.getHooksSummary();
      };

      // First render - empty localStorage
      const emptyCacheSummary = simulateComponentWithLocalStorage('empty');
      
      // Second render - with cached agent data
      localStorage.setItem('agentData', JSON.stringify({ id: 'agent1', name: 'Test Agent' }));
      const withAgentDataSummary = simulateComponentWithLocalStorage('withAgentData');
      
      // Third render - with preferences too
      localStorage.setItem('userPreferences', JSON.stringify({ theme: 'dark' }));
      const withPreferencesSummary = simulateComponentWithLocalStorage('withPreferences');
      
      // Fourth render - with full session
      localStorage.setItem('sessionData', JSON.stringify({ isAuthenticated: true, user: {} }));
      const fullSessionSummary = simulateComponentWithLocalStorage('fullSession');

      // Each cache state produces different hook count - VIOLATION!
      const hookCounts = [
        emptyCacheSummary.totalHooks,
        withAgentDataSummary.totalHooks,
        withPreferencesSummary.totalHooks,
        fullSessionSummary.totalHooks
      ];

      const uniqueHookCounts = new Set(hookCounts);
      expect(uniqueHookCounts.size).toBeGreaterThan(1); // Should have different hook counts

      // Verify progressive hook increase
      expect(withAgentDataSummary.totalHooks).toBeGreaterThan(emptyCacheSummary.totalHooks);
      expect(withPreferencesSummary.totalHooks).toBeGreaterThan(withAgentDataSummary.totalHooks);
      expect(fullSessionSummary.totalHooks).toBeGreaterThan(withPreferencesSummary.totalHooks);

      console.log('🚨 LOCALSTORAGE HOOK VIOLATIONS:');
      console.log(`  Empty cache: ${emptyCacheSummary.totalHooks} hooks`);
      console.log(`  With agent data: ${withAgentDataSummary.totalHooks} hooks`);
      console.log(`  With preferences: ${withPreferencesSummary.totalHooks} hooks`);
      console.log(`  Full session: ${fullSessionSummary.totalHooks} hooks`);
    });

    it('SHOULD FAIL: Cache invalidation changes hook structure', () => {
      const React = require('react');
      
      // Setup initial cache state
      localStorage.setItem('cacheVersion', '1.0');
      localStorage.setItem('cachedData', JSON.stringify({ valid: true }));
      
      const simulateCacheValidation = (cacheVersion: string) => {
        cacheHookTracker.startRender();
        
        React.useState('data');
        React.useEffect(() => {}, []);
        
        const storedVersion = localStorage.getItem('cacheVersion');
        const isValidCache = storedVersion === cacheVersion;
        
        // Different hooks based on cache validity - VIOLATION!
        if (isValidCache) {
          const cachedData = localStorage.getItem('cachedData');
          React.useState(JSON.parse(cachedData || '{}'));
          React.useMemo(() => JSON.parse(cachedData || '{}'), [cachedData]);
        } else {
          React.useState(null); // Loading state
          React.useState(false); // Fetch in progress
          React.useEffect(() => {
            // Fetch fresh data effect
          }, []);
          React.useCallback(() => {
            // Refetch handler
          }, []);
        }
        
        return cacheHookTracker.getHooksSummary();
      };

      // Render with valid cache
      const validCacheSummary = simulateCacheValidation('1.0');
      
      // Simulate cache invalidation (version change)
      localStorage.setItem('cacheVersion', '2.0');
      const invalidCacheSummary = simulateCacheValidation('1.0'); // Still checking for v1.0

      // Cache invalidation changes hook count - VIOLATION!
      expect(validCacheSummary.totalHooks).not.toBe(invalidCacheSummary.totalHooks);
      expect(invalidCacheSummary.totalHooks).toBeGreaterThan(validCacheSummary.totalHooks);

      const violation = {
        valid: validCacheSummary.totalHooks,
        invalid: invalidCacheSummary.totalHooks,
        difference: invalidCacheSummary.totalHooks - validCacheSummary.totalHooks
      };

      expect(violation.difference).toBe(2); // 2 additional hooks for invalid cache
      console.log('🚨 CACHE INVALIDATION VIOLATION:', violation);
    });
  });

  describe('sessionStorage State-Dependent Hooks', () => {
    it('SHOULD FAIL: Session state affects component hook rendering', () => {
      const React = require('react');
      
      const simulateSessionBasedComponent = (sessionState: 'new' | 'existing' | 'expired') => {
        cacheHookTracker.startRender();
        
        React.useState('component');
        React.useEffect(() => {}, []);
        
        // Different hooks based on session state - VIOLATION!
        switch (sessionState) {
          case 'new':
            React.useState(false); // isFirstVisit
            React.useEffect(() => {
              // Welcome tour effect
            }, []);
            React.useState(null); // tourStep
            break;
            
          case 'existing':
            const sessionData = sessionStorage.getItem('sessionData');
            React.useState(sessionData ? JSON.parse(sessionData) : null);
            React.useMemo(() => {
              // Process session data
            }, [sessionData]);
            break;
            
          case 'expired':
            React.useState(true); // sessionExpired
            React.useState(0); // retryCount
            React.useCallback(() => {
              // Refresh session handler
            }, []);
            React.useEffect(() => {
              // Session recovery effect
            }, []);
            break;
        }
        
        return cacheHookTracker.getHooksSummary();
      };

      // Test each session state
      const newSessionSummary = simulateSessionBasedComponent('new');
      sessionStorage.setItem('sessionData', JSON.stringify({ timestamp: Date.now() }));
      const existingSessionSummary = simulateSessionBasedComponent('existing');
      const expiredSessionSummary = simulateSessionBasedComponent('expired');

      const hookCounts = {
        new: newSessionSummary.totalHooks,
        existing: existingSessionSummary.totalHooks,
        expired: expiredSessionSummary.totalHooks
      };

      // Each session state has different hook count - VIOLATION!
      const uniqueHookCounts = new Set(Object.values(hookCounts));
      expect(uniqueHookCounts.size).toBe(3); // All different
      expect(hookCounts.expired).toBeGreaterThan(hookCounts.existing);
      expect(hookCounts.new).not.toBe(hookCounts.existing);

      console.log('🚨 SESSION STATE HOOK VIOLATIONS:', hookCounts);
    });
  });

  describe('Memory Cache Scenarios', () => {
    it('SHOULD FAIL: In-memory cache affects hook execution', () => {
      const React = require('react');
      
      const simulateMemoryCacheComponent = () => {
        cacheHookTracker.startRender();
        
        React.useState('base');
        React.useEffect(() => {}, []);
        
        // Check various cache keys
        const agentCache = browserStorage.getMemoryCache('agents');
        const configCache = browserStorage.getMemoryCache('config');
        const metricsCache = browserStorage.getMemoryCache('metrics');
        
        // Conditional hooks based on cache presence - VIOLATION!
        if (agentCache) {
          React.useState(agentCache);
          React.useMemo(() => agentCache, [agentCache]);
        }
        
        if (configCache) {
          React.useState(configCache);
          React.useCallback(() => {}, [configCache]);
        }
        
        if (metricsCache) {
          React.useState(metricsCache);
          React.useEffect(() => {}, [metricsCache]);
          React.useMemo(() => {}, [metricsCache]);
        }
        
        return cacheHookTracker.getHooksSummary();
      };

      // Progressive cache population
      const summaries: any[] = [];
      
      // No cache
      summaries.push(simulateMemoryCacheComponent());
      
      // Add agent cache
      browserStorage.setMemoryCache('agents', [{ id: '1' }]);
      summaries.push(simulateMemoryCacheComponent());
      
      // Add config cache  
      browserStorage.setMemoryCache('config', { theme: 'dark' });
      summaries.push(simulateMemoryCacheComponent());
      
      // Add metrics cache
      browserStorage.setMemoryCache('metrics', { performance: 95 });
      summaries.push(simulateMemoryCacheComponent());

      const hookProgression = summaries.map(s => s.totalHooks);
      
      // Hook count should increase with each cache addition - VIOLATION!
      expect(hookProgression[1]).toBeGreaterThan(hookProgression[0]);
      expect(hookProgression[2]).toBeGreaterThan(hookProgression[1]);
      expect(hookProgression[3]).toBeGreaterThan(hookProgression[2]);

      const violations = {
        progression: hookProgression,
        totalIncrease: hookProgression[3] - hookProgression[0]
      };

      expect(violations.totalIncrease).toBeGreaterThan(5);
      console.log('🚨 MEMORY CACHE PROGRESSION VIOLATIONS:', violations);
    });
  });

  describe('Browser Refresh Scenarios', () => {
    it('SHOULD FAIL: Post-refresh state differs from pre-refresh', () => {
      const React = require('react');
      
      const simulatePreRefresh = () => {
        cacheHookTracker.startRender();
        
        // Simulate component with active session
        React.useState('active');
        React.useState(true); // hasActiveSession
        React.useState({}); // sessionData
        React.useEffect(() => {}, []); // session sync
        React.useMemo(() => ({}), []); // processed session
        
        // In-memory state (will be lost)
        React.useState([]); // temporary selections
        React.useState('draft'); // unsaved changes
        React.useCallback(() => {}, []); // save draft handler
        
        return cacheHookTracker.getHooksSummary();
      };

      const simulatePostRefresh = () => {
        cacheHookTracker.startRender();
        
        // After refresh - no in-memory state
        React.useState('active');
        React.useState(true); // hasActiveSession (from localStorage)
        React.useState({}); // sessionData (restored)
        React.useEffect(() => {}, []); // session sync
        React.useMemo(() => ({}), []); // processed session
        
        // Different hooks for post-refresh recovery - VIOLATION!
        React.useState(true); // needsRecovery
        React.useEffect(() => {
          // Recovery effect
        }, []);
        React.useCallback(() => {
          // Recovery handler
        }, []);
        
        return cacheHookTracker.getHooksSummary();
      };

      const preRefreshSummary = simulatePreRefresh();
      browserStorage.simulateBrowserRefresh();
      const postRefreshSummary = simulatePostRefresh();

      // Post-refresh component has different hook structure - VIOLATION!
      expect(postRefreshSummary.totalHooks).not.toBe(preRefreshSummary.totalHooks);

      const refreshViolation = {
        preRefresh: preRefreshSummary.totalHooks,
        postRefresh: postRefreshSummary.totalHooks,
        hookDifference: postRefreshSummary.totalHooks - preRefreshSummary.totalHooks
      };

      console.log('🚨 BROWSER REFRESH VIOLATION:', refreshViolation);
      expect(Math.abs(refreshViolation.hookDifference)).toBeGreaterThan(0);
    });

    it('SHOULD FAIL: Hard refresh clears cache differently than soft refresh', () => {
      const React = require('react');
      
      // Setup initial cache state
      localStorage.setItem('persistentData', JSON.stringify({ id: '123' }));
      sessionStorage.setItem('sessionData', JSON.stringify({ active: true }));
      browserStorage.setMemoryCache('tempData', { temp: true });
      
      const simulateAfterSoftRefresh = () => {
        cacheHookTracker.startRender();
        
        React.useState('refreshed');
        React.useEffect(() => {}, []);
        
        // localStorage and sessionStorage persist
        const persistent = localStorage.getItem('persistentData');
        const session = sessionStorage.getItem('sessionData');
        const memory = browserStorage.getMemoryCache('tempData'); // Still in memory
        
        if (persistent) {
          React.useState(JSON.parse(persistent));
          React.useMemo(() => JSON.parse(persistent), [persistent]);
        }
        
        if (session) {
          React.useState(JSON.parse(session));
          React.useCallback(() => {}, [session]);
        }
        
        if (memory) {
          React.useState(memory);
          React.useEffect(() => {}, [memory]);
        }
        
        return cacheHookTracker.getHooksSummary();
      };

      const simulateAfterHardRefresh = () => {
        cacheHookTracker.startRender();
        browserStorage.clearMemoryCache(); // Memory cache cleared in hard refresh
        
        React.useState('refreshed');
        React.useEffect(() => {}, []);
        
        // Only localStorage persists (sessionStorage might clear)
        const persistent = localStorage.getItem('persistentData');
        const session = null; // sessionStorage cleared in hard refresh
        const memory = browserStorage.getMemoryCache('tempData'); // Cleared
        
        if (persistent) {
          React.useState(JSON.parse(persistent));
          React.useMemo(() => JSON.parse(persistent), [persistent]);
        }
        
        // Different recovery hooks for hard refresh - VIOLATION!
        React.useState(false); // needsFullRecovery
        React.useEffect(() => {
          // Full recovery effect
        }, []);
        
        return cacheHookTracker.getHooksSummary();
      };

      const softRefreshSummary = simulateAfterSoftRefresh();
      const hardRefreshSummary = simulateAfterHardRefresh();

      // Different refresh types produce different hook counts - VIOLATION!
      expect(softRefreshSummary.totalHooks).not.toBe(hardRefreshSummary.totalHooks);

      const refreshComparison = {
        soft: softRefreshSummary.totalHooks,
        hard: hardRefreshSummary.totalHooks,
        difference: Math.abs(softRefreshSummary.totalHooks - hardRefreshSummary.totalHooks)
      };

      expect(refreshComparison.difference).toBeGreaterThan(1);
      console.log('🚨 REFRESH TYPE VIOLATIONS:', refreshComparison);
    });
  });

  describe('Cache Consistency Emergency Detection', () => {
    it('should provide comprehensive cache violation detection', () => {
      const React = require('react');
      
      const testCacheScenarios = () => {
        const scenarios = [
          { name: 'empty', setup: () => browserStorage.reset() },
          { name: 'localStorage-only', setup: () => {
            browserStorage.reset();
            localStorage.setItem('data', '{}');
          }},
          { name: 'sessionStorage-only', setup: () => {
            browserStorage.reset();
            sessionStorage.setItem('data', '{}');
          }},
          { name: 'memory-only', setup: () => {
            browserStorage.reset();
            browserStorage.setMemoryCache('data', {});
          }},
          { name: 'all-caches', setup: () => {
            browserStorage.reset();
            localStorage.setItem('data', '{}');
            sessionStorage.setItem('data', '{}');
            browserStorage.setMemoryCache('data', {});
          }}
        ];

        const results = scenarios.map(scenario => {
          scenario.setup();
          cacheHookTracker.startRender();
          
          React.useState('test');
          React.useEffect(() => {}, []);
          
          // Cache-dependent hooks
          if (localStorage.getItem('data')) {
            React.useState('localStorage');
            React.useMemo(() => {}, []);
          }
          
          if (sessionStorage.getItem('data')) {
            React.useState('sessionStorage');
            React.useCallback(() => {}, []);
          }
          
          if (browserStorage.getMemoryCache('data')) {
            React.useState('memory');
            React.useEffect(() => {}, []);
          }
          
          return {
            scenario: scenario.name,
            summary: cacheHookTracker.getHooksSummary()
          };
        });

        return results;
      };

      const scenarioResults = testCacheScenarios();
      const hookCounts = scenarioResults.map(r => r.summary.totalHooks);
      const uniqueHookCounts = new Set(hookCounts);

      // Multiple cache scenarios = multiple hook counts = VIOLATIONS!
      expect(uniqueHookCounts.size).toBeGreaterThan(2);

      const violations = scenarioResults.map((result, index) => ({
        scenario: result.scenario,
        hooks: result.summary.totalHooks,
        violatesPattern: index > 0 && result.summary.totalHooks !== scenarioResults[0].summary.totalHooks
      }));

      const violationCount = violations.filter(v => v.violatesPattern).length;
      expect(violationCount).toBeGreaterThan(2);

      console.log('🚨 COMPREHENSIVE CACHE VIOLATIONS:');
      violations.forEach(v => {
        console.log(`  ${v.scenario}: ${v.hooks} hooks ${v.violatesPattern ? '❌ VIOLATION' : ''}`);
      });
    });
  });
});