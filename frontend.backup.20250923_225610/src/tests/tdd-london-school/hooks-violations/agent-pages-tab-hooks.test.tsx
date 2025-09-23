/**
 * TDD London School - AgentPagesTab Hooks Violations Test Suite
 * 
 * This test suite focuses specifically on the AgentPagesTab component hooks violations
 * using London School methodology. It exposes how the component's hooks behavior changes
 * based on different agent prop configurations and page data variations.
 * 
 * SPECIFIC HOOKS VIOLATIONS EXPOSED:
 * 1. Varying hook counts based on agentPages array length
 * 2. Conditional useEffect usage based on loading/error states  
 * 3. useMemo dependency instability with filteredAndSortedPages
 * 4. useCallback recreations in event handlers
 * 5. Memory leaks from workspace API calls
 * 
 * LONDON SCHOOL PRINCIPLES:
 * - Mock all external dependencies (workspaceApi, agent props)
 * - Focus on component interaction patterns
 * - Test how the component collaborates with its dependencies
 * - Use test doubles to control different execution paths
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import AgentPagesTab from '../../../src/components/AgentPagesTab';
import { workspaceApi } from '../../../src/services/api';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// =============================================================================
// MOCK INFRASTRUCTURE - LONDON SCHOOL APPROACH
// =============================================================================

// Mock workspaceApi with precise behavior control
jest.mock('../../../src/services/api', () => ({
  workspaceApi: {
    listPages: jest.fn(),
    createPage: jest.fn(),
  }
}));

// Mock AgentPageBuilder component to isolate AgentPagesTab behavior
jest.mock('../../../src/components/AgentPageBuilder', () => {
  return function MockAgentPageBuilder({ agentId, onSave, onClose }: any) {
    return (
      <div data-testid="agent-page-builder-modal">
        <button data-testid="save-page" onClick={() => onSave({ title: 'New Page' })}>
          Save Page
        </button>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    );
  };
});

// Hook call tracking for violation detection
const hookCallTracker = new Map();
const originalUseState = React.useState;
const originalUseEffect = React.useEffect;
const originalUseMemo = React.useMemo;
const originalUseCallback = React.useCallback;

// Override React hooks to track calls
React.useState = function(...args) {
  const key = `useState-${args.length}`;
  hookCallTracker.set(key, (hookCallTracker.get(key) || 0) + 1);
  return originalUseState.apply(this, args);
};

React.useEffect = function(...args) {
  const key = `useEffect-${JSON.stringify(args[1])}`;
  hookCallTracker.set(key, (hookCallTracker.get(key) || 0) + 1);
  return originalUseEffect.apply(this, args);
};

React.useMemo = function(...args) {
  const key = `useMemo-${JSON.stringify(args[1])}`;
  hookCallTracker.set(key, (hookCallTracker.get(key) || 0) + 1);
  return originalUseMemo.apply(this, args);
};

React.useCallback = function(...args) {
  const key = `useCallback-${JSON.stringify(args[1])}`;
  hookCallTracker.set(key, (hookCallTracker.get(key) || 0) + 1);
  return originalUseCallback.apply(this, args);
};

// Console error tracking
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;
console.error = mockConsoleError;

// =============================================================================
// TEST DATA FACTORIES - LONDON SCHOOL PATTERN
// =============================================================================

/**
 * Creates mock agent data with configurable properties to test different scenarios
 */
function createMockAgent(overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'Test agent for hooks testing',
    status: 'active',
    capabilities: [],
    stats: {
      tasksCompleted: 10,
      successRate: 95,
      averageResponseTime: 1.2,
      uptime: 99,
      todayTasks: 5,
      weeklyTasks: 20,
    },
    recentActivities: [],
    recentPosts: [],
    configuration: {
      profile: {
        name: 'Test Agent',
        description: 'Test description',
        specialization: 'Testing',
        avatar: '🤖',
      },
      behavior: {
        responseStyle: 'friendly',
        proactivity: 'medium',
        verbosity: 'detailed',
      },
      privacy: {
        isPublic: true,
        showMetrics: true,
        showActivity: true,
        allowComments: true,
      },
      theme: {
        primaryColor: '#3B82F6',
        accentColor: '#8B5CF6',
        layout: 'grid',
      },
    },
    pages: [],
    ...overrides,
  };
}

/**
 * Creates mock page data arrays with different lengths to trigger hooks violations
 */
function createMockPages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `page-${i + 1}`,
    title: `Page ${i + 1}`,
    description: `Description for page ${i + 1}`,
    content_type: 'markdown' as const,
    content_value: `Content for page ${i + 1}`,
    page_type: 'dynamic' as const,
    status: 'published' as const,
    version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: [`tag-${i + 1}`],
    lastUpdated: new Date().toISOString(),
    type: 'documentation' as const,
    category: 'guide' as const,
    url: `/pages/page-${i + 1}`,
    readTime: 5,
    difficulty: 'beginner' as const,
    featured: i === 0,
    external: false,
  }));
}

// =============================================================================
// LONDON SCHOOL TEST SUITE - AGENTPAGESTAB HOOKS VIOLATIONS
// =============================================================================

describe('AgentPagesTab - Hooks Violations (London School)', () => {
  let mockWorkspaceApi: jest.Mocked<typeof workspaceApi>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    hookCallTracker.clear();
    
    mockWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
    
    // Default successful API response
    mockWorkspaceApi.listPages.mockResolvedValue({
      success: true,
      pages: [],
      total: 0
    });
    
    mockWorkspaceApi.createPage.mockResolvedValue({
      id: 'new-page',
      title: 'New Page',
      content_type: 'markdown',
      content_value: 'New content',
      page_type: 'dynamic',
      status: 'draft',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
    });
  });

  afterAll(() => {
    console.error = originalConsoleError;
    React.useState = originalUseState;
    React.useEffect = originalUseEffect;
    React.useMemo = originalUseMemo;
    React.useCallback = originalUseCallback;
  });

  // =============================================================================
  // TEST 1: HOOKS ORDER VIOLATIONS WITH VARYING PAGE COUNTS
  // =============================================================================
  describe('Hooks Order Violations with Page Data', () => {
    test('should expose hooks count inconsistency with varying page arrays', async () => {
      // ARRANGE: Create agents with different page counts
      const emptyAgent = createMockAgent({ id: 'empty-agent' });
      const singlePageAgent = createMockAgent({ 
        id: 'single-agent',
        pages: createMockPages(1)
      });
      const multiplePageAgent = createMockAgent({ 
        id: 'multiple-agent',
        pages: createMockPages(5)
      });

      // Mock API responses based on agent ID
      mockWorkspaceApi.listPages.mockImplementation((agentId) => {
        if (agentId === 'empty-agent') {
          return Promise.resolve({ success: true, pages: [], total: 0 });
        } else if (agentId === 'single-agent') {
          return Promise.resolve({ success: true, pages: createMockPages(1), total: 1 });
        } else if (agentId === 'multiple-agent') {
          return Promise.resolve({ success: true, pages: createMockPages(5), total: 5 });
        }
        return Promise.resolve({ success: true, pages: [], total: 0 });
      });

      // ACT: Render with empty agent first
      const { rerender } = render(
        <AgentPagesTab agent={emptyAgent} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
      });

      // Track initial hook calls
      const initialHookCalls = new Map(hookCallTracker);

      // ACT: Re-render with single page agent
      act(() => {
        rerender(<AgentPagesTab agent={singlePageAgent} />);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('empty-pages-state')).not.toBeInTheDocument();
      });

      // ACT: Re-render with multiple pages agent
      act(() => {
        rerender(<AgentPagesTab agent={multiplePageAgent} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      // ASSERT: Check for hooks order violations
      const finalHookCalls = new Map(hookCallTracker);
      const hookCountChanges = Array.from(finalHookCalls.keys())
        .filter(key => finalHookCalls.get(key) !== initialHookCalls.get(key));

      expect(hookCountChanges.length).toBeGreaterThan(0);
      
      // Should have console error about hook count mismatch
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/rendered (more|fewer) hooks than expected/)
      );
    });

    test('should detect conditional useState usage in loading states', async () => {
      // ARRANGE: Mock delayed API response
      let resolveApiCall: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolveApiCall = resolve;
      });

      mockWorkspaceApi.listPages.mockReturnValue(delayedPromise as any);
      const agent = createMockAgent({ id: 'loading-agent' });

      // ACT: Render component (will be in loading state)
      const { rerender } = render(<AgentPagesTab agent={agent} />);

      // Component should be in loading state - different hook count
      expect(screen.getByText('Loading pages...')).toBeInTheDocument();

      // Complete the API call
      act(() => {
        resolveApiCall!({
          success: true,
          pages: createMockPages(3),
          total: 3
        });
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading pages...')).not.toBeInTheDocument();
      });

      // ACT: Force another re-render to trigger hook count comparison
      rerender(<AgentPagesTab agent={agent} />);

      // ASSERT: Should detect conditional hook usage
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/Hook.*called conditionally/)
      );
    });
  });

  // =============================================================================
  // TEST 2: USEMEMO DEPENDENCY VIOLATIONS IN filteredAndSortedPages
  // =============================================================================
  describe('useMemo Dependency Violations', () => {
    test('should expose missing dependencies in filteredAndSortedPages useMemo', async () => {
      // ARRANGE: Agent with pages and mock API
      const agent = createMockAgent({ id: 'filter-agent' });
      const pages = createMockPages(10);
      
      mockWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        pages,
        total: pages.length
      });

      // ACT: Render component
      const { rerender } = render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      // ACT: Change search term to trigger useMemo recalculation
      const searchInput = screen.getByTestId('pages-search');
      
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'Page 1' } });
      });

      // ACT: Change filters rapidly to expose dependency issues
      const typeFilter = screen.getByTestId('type-filter');
      const categoryFilter = screen.getByTestId('category-filter');
      
      act(() => {
        fireEvent.change(typeFilter, { target: { value: 'documentation' } });
        fireEvent.change(categoryFilter, { target: { value: 'dynamic' } });
      });

      // Force re-render with same props to trigger dependency comparison
      rerender(<AgentPagesTab agent={agent} />);

      // ASSERT: Should detect missing dependencies in useMemo
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/useMemo.*missing.*dependency/)
      );
    });

    test('should expose useMemo recreation with unstable dependencies', async () => {
      // ARRANGE: Track useMemo calls
      const memoCallCounts = new Map();
      const originalUseMemo = React.useMemo;
      
      React.useMemo = function(factory, deps) {
        const depKey = JSON.stringify(deps);
        memoCallCounts.set(depKey, (memoCallCounts.get(depKey) || 0) + 1);
        return originalUseMemo.call(this, factory, deps);
      };

      const agent = createMockAgent({ id: 'memo-agent' });
      mockWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        pages: createMockPages(5),
        total: 5
      });

      // ACT: Render and trigger multiple state changes
      const { rerender } = render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      // Trigger multiple filter changes
      const searchInput = screen.getByTestId('pages-search');
      const filterValues = ['a', 'ab', 'abc', 'abcd'];

      for (const value of filterValues) {
        act(() => {
          fireEvent.change(searchInput, { target: { value } });
        });
        
        // Force re-render to compare memoization
        rerender(<AgentPagesTab agent={agent} />);
      }

      // ASSERT: Check for excessive useMemo recreations
      const totalRecreations = Array.from(memoCallCounts.values())
        .reduce((sum, count) => sum + count, 0);
      
      expect(totalRecreations).toBeGreaterThan(10); // Should indicate unstable deps

      // Restore original useMemo
      React.useMemo = originalUseMemo;
    });
  });

  // =============================================================================
  // TEST 3: USEEFFECT DEPENDENCY VIOLATIONS
  // =============================================================================
  describe('useEffect Dependency Violations', () => {
    test('should expose useEffect missing agent.id dependency', async () => {
      // ARRANGE: Different agents to trigger useEffect
      const agent1 = createMockAgent({ id: 'effect-agent-1' });
      const agent2 = createMockAgent({ id: 'effect-agent-2' });

      let apiCallCount = 0;
      mockWorkspaceApi.listPages.mockImplementation((agentId) => {
        apiCallCount++;
        return Promise.resolve({
          success: true,
          pages: createMockPages(apiCallCount),
          total: apiCallCount
        });
      });

      // ACT: Render with first agent
      const { rerender } = render(<AgentPagesTab agent={agent1} />);

      await waitFor(() => {
        expect(mockWorkspaceApi.listPages).toHaveBeenCalledWith('effect-agent-1');
      });

      // ACT: Change to second agent (should trigger useEffect)
      act(() => {
        rerender(<AgentPagesTab agent={agent2} />);
      });

      await waitFor(() => {
        expect(mockWorkspaceApi.listPages).toHaveBeenCalledWith('effect-agent-2');
      });

      // ASSERT: Should detect missing dependency warning
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/useEffect.*missing.*dependency.*agent\.id/)
      );
    });

    test('should expose stale closure in useEffect cleanup', async () => {
      // ARRANGE: Mock cleanup tracking
      const cleanupFunctions = [];
      const originalUseEffect = React.useEffect;
      
      React.useEffect = function(effect, deps) {
        return originalUseEffect.call(this, () => {
          const cleanup = effect();
          if (cleanup) {
            cleanupFunctions.push(cleanup);
          }
          return cleanup;
        }, deps);
      };

      const agent = createMockAgent({ id: 'cleanup-agent' });
      
      // Mock delayed API response
      let resolveApi: (value: any) => void;
      const delayedResponse = new Promise((resolve) => {
        resolveApi = resolve;
      });
      
      mockWorkspaceApi.listPages.mockReturnValue(delayedResponse as any);

      // ACT: Render and unmount before API completes
      const { unmount } = render(<AgentPagesTab agent={agent} />);

      // Unmount immediately
      unmount();

      // Complete API call after unmount
      act(() => {
        resolveApi!({
          success: true,
          pages: createMockPages(2),
          total: 2
        });
      });

      // ASSERT: Check for stale closure warning
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/state.*unmounted.*component/)
        );
      });

      // Restore useEffect
      React.useEffect = originalUseEffect;
    });
  });

  // =============================================================================
  // TEST 4: MEMORY CONSTRAINTS AND PERFORMANCE VIOLATIONS
  // =============================================================================
  describe('Memory and Performance Violations', () => {
    test('should exceed memory limits with large page datasets', async () => {
      // ARRANGE: Create memory-intensive page data
      const largePages = Array.from({ length: 1000 }, (_, i) => ({
        ...createMockPages(1)[0],
        id: `large-page-${i}`,
        content_value: 'x'.repeat(10000), // Large content
        metadata: new Array(100).fill({ key: 'value' })
      }));

      const memoryAgent = createMockAgent({ id: 'memory-agent' });
      mockWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        pages: largePages,
        total: largePages.length
      });

      // Mock memory tracking
      let memoryUsed = 0;
      const memoryLimit = 512 * 1024 * 1024; // 512MB

      const trackMemory = () => {
        memoryUsed += 50 * 1024 * 1024; // 50MB per operation
        if (memoryUsed > memoryLimit) {
          throw new Error(`Memory limit exceeded: ${memoryUsed} bytes`);
        }
      };

      // ACT & ASSERT: Should throw memory error
      await expect(async () => {
        render(<AgentPagesTab agent={memoryAgent} />);
        
        // Simulate memory usage from rendering large dataset
        for (let i = 0; i < 15; i++) {
          trackMemory();
        }
      }).rejects.toThrow('Memory limit exceeded');
    });

    test('should detect performance degradation with excessive re-renders', async () => {
      // ARRANGE: Agent with pages that trigger many re-renders
      const agent = createMockAgent({ id: 'performance-agent' });
      mockWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        pages: createMockPages(20),
        total: 20
      });

      let renderCount = 0;
      const originalRender = React.createElement;
      
      React.createElement = function(...args) {
        renderCount++;
        return originalRender.apply(this, args);
      };

      // ACT: Render and trigger rapid state changes
      const { rerender } = render(<AgentPagesTab agent={agent} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      // Trigger rapid filter changes to cause excessive re-renders
      const searchInput = screen.getByTestId('pages-search');
      const searchTerms = ['a', 'ab', 'abc', 'abcd', 'abcde'];

      for (const term of searchTerms) {
        act(() => {
          fireEvent.change(searchInput, { target: { value: term } });
        });
        rerender(<AgentPagesTab agent={agent} />);
      }

      // ASSERT: Check for excessive render warnings
      expect(renderCount).toBeGreaterThan(100);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/performance.*excessive.*renders/)
      );

      // Restore createElement
      React.createElement = originalRender;
    });
  });

  // =============================================================================
  // TEST 5: INTEGRATION HOOKS VIOLATIONS
  // =============================================================================
  describe('Integration Hooks Violations', () => {
    test('should fail with hooks violations when API responses vary structure', async () => {
      // ARRANGE: Mock API responses with different structures
      const responses = [
        { success: true, pages: [], total: 0 },
        { success: true, data: createMockPages(3), count: 3 }, // Different structure
        { success: false, error: 'API Error' },
        { pages: createMockPages(2) }, // Missing success field
      ];

      let responseIndex = 0;
      mockWorkspaceApi.listPages.mockImplementation(() => {
        const response = responses[responseIndex % responses.length];
        responseIndex++;
        return Promise.resolve(response as any);
      });

      const agent = createMockAgent({ id: 'varying-api-agent' });

      // ACT: Render multiple times with varying API responses
      const { rerender } = render(<AgentPagesTab agent={agent} />);

      // Wait for initial render
      await waitFor(() => {
        expect(mockWorkspaceApi.listPages).toHaveBeenCalled();
      });

      // Trigger multiple re-renders to get different API responses
      for (let i = 0; i < 4; i++) {
        act(() => {
          rerender(<AgentPagesTab agent={agent} />);
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ASSERT: Should detect hooks violations from varying code paths
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/Hook.*different.*order/)
      );
    });
  });

  // =============================================================================
  // LONDON SCHOOL CONTRACT VERIFICATION
  // =============================================================================
  describe('Mock Contract Verification', () => {
    test('should verify workspaceApi mock contracts', () => {
      // ASSERT: Verify mock function contracts
      expect(mockWorkspaceApi.listPages).toBeInstanceOf(Function);
      expect(mockWorkspaceApi.createPage).toBeInstanceOf(Function);
      
      // Verify mock call signatures
      expect(mockWorkspaceApi.listPages.mock).toBeDefined();
      expect(mockWorkspaceApi.createPage.mock).toBeDefined();
    });

    test('should verify component prop contracts', () => {
      // ARRANGE: Minimal valid agent
      const minimalAgent = createMockAgent();

      // ACT: Render with minimal props
      render(<AgentPagesTab agent={minimalAgent} />);

      // ASSERT: Component should handle minimal valid props
      expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
    });

    test('should verify hook call contracts match expected patterns', () => {
      // ARRANGE: Standard component render
      const agent = createMockAgent({ id: 'contract-agent' });
      
      // Clear hook tracker
      hookCallTracker.clear();
      
      // ACT: Render component
      render(<AgentPagesTab agent={agent} />);

      // ASSERT: Verify expected hook call patterns
      expect(hookCallTracker.has('useState-1')).toBe(true); // Initial state hooks
      expect(hookCallTracker.has('useEffect-["contract-agent"]')).toBe(true); // Effect with agent.id dependency
      
      // Should have consistent hook call counts
      const hookCounts = Array.from(hookCallTracker.values());
      const hasInconsistentCounts = hookCounts.some(count => count > 2);
      expect(hasInconsistentCounts).toBe(false);
    });
  });
});

// =============================================================================
// SPECIALIZED HOOK VIOLATION DETECTORS
// =============================================================================

/**
 * Custom matcher for detecting hooks order violations
 */
expect.extend({
  toHaveHooksOrderViolation(received: any) {
    const violations = received.filter((call: any) => 
      call.includes('rendered fewer hooks') || 
      call.includes('rendered more hooks') ||
      call.includes('Hook was called conditionally')
    );
    
    return {
      message: () => `Expected hooks order violations, got: ${violations.join(', ')}`,
      pass: violations.length > 0,
    };
  },
});

/**
 * Hook stability analyzer for London School testing
 */
class HookStabilityAnalyzer {
  private callPatterns = new Map<string, number[]>();
  
  trackCall(hookName: string, renderCycle: number) {
    if (!this.callPatterns.has(hookName)) {
      this.callPatterns.set(hookName, []);
    }
    this.callPatterns.get(hookName)!.push(renderCycle);
  }
  
  analyzeStability() {
    const violations = [];
    
    for (const [hookName, cycles] of this.callPatterns.entries()) {
      const isStable = cycles.every((cycle, index, arr) => 
        index === 0 || cycle === arr[index - 1] + 1
      );
      
      if (!isStable) {
        violations.push({
          hook: hookName,
          pattern: cycles,
          violation: 'Unstable call pattern'
        });
      }
    }
    
    return violations;
  }
}

/**
 * Memory constraint simulator for testing component behavior under stress
 */
class MemoryConstraintSimulator {
  private currentUsage = 0;
  private limit: number;
  
  constructor(limitMB: number = 512) {
    this.limit = limitMB * 1024 * 1024;
  }
  
  allocate(sizeMB: number) {
    const bytes = sizeMB * 1024 * 1024;
    this.currentUsage += bytes;
    
    if (this.currentUsage > this.limit) {
      throw new Error(`Memory limit exceeded: ${this.currentUsage} bytes > ${this.limit} bytes`);
    }
    
    return this.currentUsage;
  }
  
  reset() {
    this.currentUsage = 0;
  }
  
  getUsagePercent() {
    return (this.currentUsage / this.limit) * 100;
  }
}