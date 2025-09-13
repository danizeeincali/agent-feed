/**
 * TDD London School: Emergency Hooks Violation Detection Test
 * Target: AgentPagesTab persistent "Rendered more hooks than during the previous render" error
 * 
 * This test uses mock-driven development to isolate and expose the exact hooks violation
 * occurring when the Pages tab is clicked in UnifiedAgentPage.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import AgentPagesTab from '../../../src/components/AgentPagesTab';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// Mock all external dependencies to isolate hooks behavior
jest.mock('../../../src/hooks/useDebounced', () => {
  // Track hooks calls to detect count variations
  const callCount = { current: 0 };
  
  return {
    useDebounced: jest.fn((value: string, delay: number) => {
      callCount.current++;
      console.log(`useDebounced call #${callCount.current}: value="${value}", delay=${delay}`);
      
      // Return debounced value immediately to avoid async issues
      return value;
    })
  };
});

jest.mock('../../../src/services/api', () => ({
  workspaceApi: {
    listPages: jest.fn().mockResolvedValue({ pages: [] }),
    createPage: jest.fn().mockResolvedValue({ id: 'new-page' })
  }
}));

jest.mock('../../../src/utils/cn', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' '))
}));

// Hook count tracker for precise violation detection
let hookCallCounts: number[] = [];
let renderCount = 0;

// Intercept React hooks to count them
const originalUseState = React.useState;
const originalUseEffect = React.useEffect;
const originalUseMemo = React.useMemo;

const trackHookCall = (hookName: string) => {
  const currentRender = renderCount;
  if (!hookCallCounts[currentRender]) {
    hookCallCounts[currentRender] = 0;
  }
  hookCallCounts[currentRender]++;
  console.log(`Render #${currentRender}: ${hookName} call #${hookCallCounts[currentRender]}`);
};

// Replace React hooks with tracking versions
React.useState = ((initialState: any) => {
  trackHookCall('useState');
  return originalUseState(initialState);
}) as any;

React.useEffect = ((effect: any, deps: any) => {
  trackHookCall('useEffect');
  return originalUseEffect(effect, deps);
}) as any;

React.useMemo = ((factory: any, deps: any) => {
  trackHookCall('useMemo');
  return originalUseMemo(factory, deps);
}) as any;

describe('AgentPagesTab Hooks Violation Detection', () => {
  let mockAgent: UnifiedAgentData;

  beforeEach(() => {
    // Reset tracking
    hookCallCounts = [];
    renderCount = 0;
    jest.clearAllMocks();

    // Create mock agent data
    mockAgent = {
      id: 'test-agent-123',
      name: 'Test Agent',
      description: 'Test agent for hooks violation detection',
      status: 'active' as const,
      capabilities: ['test', 'mock', 'validation'],
      stats: {
        tasksCompleted: 100,
        successRate: 95,
        averageResponseTime: 1.2,
        uptime: 99.5,
        todayTasks: 5,
        weeklyTasks: 25,
        satisfaction: 4.5
      },
      recentActivities: [],
      recentPosts: [],
      configuration: {
        profile: {
          name: 'Test Agent',
          description: 'Test description',
          specialization: 'Testing',
          avatar: '🤖'
        },
        behavior: {
          responseStyle: 'friendly' as const,
          proactivity: 'medium' as const,
          verbosity: 'detailed' as const
        },
        privacy: {
          isPublic: true,
          showMetrics: true,
          showActivity: true,
          allowComments: true
        },
        theme: {
          primaryColor: '#3B82F6',
          accentColor: '#8B5CF6',
          layout: 'grid' as const
        }
      },
      pages: [] // Empty pages to trigger empty state
    };
  });

  afterEach(() => {
    // Restore original hooks
    React.useState = originalUseState;
    React.useEffect = originalUseEffect;
    React.useMemo = originalUseMemo;
  });

  test('FAIL: Detects hooks count mismatch on component mounting', () => {
    console.log('=== INITIAL RENDER ===');
    
    // First render - establish baseline hook count
    const { rerender } = render(<AgentPagesTab agent={mockAgent} />);
    const firstRenderHooks = hookCallCounts[0] || 0;
    renderCount++;
    
    console.log(`First render hook count: ${firstRenderHooks}`);
    expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();

    console.log('=== RERENDER WITH SAME PROPS ===');
    
    // Second render with same props - should have same hook count
    rerender(<AgentPagesTab agent={mockAgent} />);
    const secondRenderHooks = hookCallCounts[1] || 0;
    
    console.log(`Second render hook count: ${secondRenderHooks}`);
    console.log(`Hook count difference: ${secondRenderHooks - firstRenderHooks}`);

    // This assertion should FAIL when hooks violation occurs
    expect(secondRenderHooks).toBe(firstRenderHooks);
  });

  test('FAIL: Detects hooks violation during search interaction', () => {
    console.log('=== SEARCH INTERACTION TEST ===');
    
    // Render with pages data to avoid empty state
    const agentWithPages = {
      ...mockAgent,
      pages: [
        {
          id: 'page-1',
          title: 'Test Page',
          description: 'Test description',
          type: 'documentation',
          category: 'guide',
          url: '/test',
          lastUpdated: new Date().toISOString(),
          tags: ['test'],
          readTime: 5,
          difficulty: 'beginner',
          featured: false,
          status: 'published'
        }
      ]
    };

    const { rerender } = render(<AgentPagesTab agent={agentWithPages} />);
    const initialHooks = hookCallCounts[renderCount] || 0;
    renderCount++;

    console.log(`Initial render hooks: ${initialHooks}`);

    // Simulate search input (this should trigger useDebounced)
    const searchInput = screen.getByTestId('pages-search');
    
    console.log('=== TRIGGERING SEARCH INPUT ===');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'test search' } });
    });

    // Force rerender to check hooks consistency
    rerender(<AgentPagesTab agent={agentWithPages} />);
    const afterSearchHooks = hookCallCounts[renderCount] || 0;
    
    console.log(`After search render hooks: ${afterSearchHooks}`);
    console.log(`Hook count difference: ${afterSearchHooks - initialHooks}`);

    // This should FAIL if hooks are called inconsistently
    expect(afterSearchHooks).toBe(initialHooks);
  });

  test('FAIL: Detects conditional hook execution violation', () => {
    console.log('=== CONDITIONAL HOOKS TEST ===');
    
    // Test with different agent states that might cause conditional hooks
    const scenarios = [
      { ...mockAgent, status: 'active' as const },
      { ...mockAgent, status: 'inactive' as const },
      { ...mockAgent, status: 'error' as const }
    ];

    const hookCounts: number[] = [];

    scenarios.forEach((agent, index) => {
      console.log(`=== SCENARIO ${index + 1}: ${agent.status} ===`);
      renderCount = index; // Reset for each scenario
      hookCallCounts[index] = 0;
      
      render(<AgentPagesTab agent={agent} />);
      hookCounts.push(hookCallCounts[index] || 0);
      
      console.log(`Scenario ${index + 1} hook count: ${hookCounts[index]}`);
    });

    // All scenarios should have same hook count
    const baselineHooks = hookCounts[0];
    hookCounts.forEach((count, index) => {
      console.log(`Comparing scenario ${index + 1}: ${count} vs baseline ${baselineHooks}`);
      expect(count).toBe(baselineHooks);
    });
  });

  test('FAIL: Detects useDebounced hook stability violation', () => {
    console.log('=== USE_DEBOUNCED STABILITY TEST ===');
    
    const { useDebounced } = require('../../../src/hooks/useDebounced');
    const mockDebounced = useDebounced as jest.MockedFunction<any>;
    
    // Clear previous calls
    mockDebounced.mockClear();
    
    console.log('Initial render with empty search term...');
    const { rerender } = render(<AgentPagesTab agent={mockAgent} />);
    
    const initialCalls = mockDebounced.mock.calls.length;
    console.log(`useDebounced called ${initialCalls} times on initial render`);
    
    // Rerender with same props
    console.log('Rerendering with same props...');
    rerender(<AgentPagesTab agent={mockAgent} />);
    
    const afterRerenderCalls = mockDebounced.mock.calls.length;
    console.log(`useDebounced called ${afterRerenderCalls} times after rerender`);
    console.log(`Additional calls: ${afterRerenderCalls - initialCalls}`);
    
    // useDebounced should be called same number of times on each render
    // This test should FAIL when hooks are called inconsistently
    expect(afterRerenderCalls).toBe(initialCalls * 2); // Should double with rerender
  });

  test('FAIL: Precise hooks count tracking per render cycle', () => {
    console.log('=== PRECISE HOOKS TRACKING ===');
    
    let totalHookCalls = 0;
    const hookCallsPerRender: number[] = [];

    // Override hook tracking for this test
    const trackCall = () => {
      totalHookCalls++;
      const currentRender = hookCallsPerRender.length;
      hookCallsPerRender[currentRender] = (hookCallsPerRender[currentRender] || 0) + 1;
    };

    React.useState = ((initialState: any) => {
      trackCall();
      return originalUseState(initialState);
    }) as any;

    React.useEffect = ((effect: any, deps: any) => {
      trackCall();
      return originalUseEffect(effect, deps);
    }) as any;

    React.useMemo = ((factory: any, deps: any) => {
      trackCall();
      return originalUseMemo(factory, deps);
    }) as any;

    // Render component multiple times
    const { rerender } = render(<AgentPagesTab agent={mockAgent} />);
    hookCallsPerRender.push(0); // Mark end of first render
    
    rerender(<AgentPagesTab agent={mockAgent} />);
    hookCallsPerRender.push(0); // Mark end of second render
    
    rerender(<AgentPagesTab agent={mockAgent} />);
    hookCallsPerRender.push(0); // Mark end of third render

    console.log('Hook calls per render:', hookCallsPerRender);
    console.log('Total hook calls:', totalHookCalls);

    // All renders should have same hook count
    const firstRenderHooks = hookCallsPerRender[0];
    hookCallsPerRender.slice(1).forEach((count, index) => {
      console.log(`Render ${index + 2} hooks: ${count} vs baseline ${firstRenderHooks}`);
      expect(count).toBe(firstRenderHooks);
    });
  });

  test('FAIL: Exposes exact moment hooks violation occurs', () => {
    console.log('=== EXACT VIOLATION MOMENT ===');
    
    // Create wrapper to simulate UnifiedAgentPage tab switching
    const TabWrapper = ({ showPages }: { showPages: boolean }) => {
      console.log(`TabWrapper render: showPages=${showPages}`);
      
      if (!showPages) {
        return <div data-testid="other-tab">Other tab content</div>;
      }
      
      // This is the critical moment - Pages tab activation
      return <AgentPagesTab agent={mockAgent} />;
    };

    // Start with other tab active
    console.log('=== INITIAL: Other tab active ===');
    const { rerender } = render(<TabWrapper showPages={false} />);
    expect(screen.getByTestId('other-tab')).toBeInTheDocument();
    
    const preTabSwitchHooks = hookCallCounts[renderCount] || 0;
    renderCount++;

    // Switch to Pages tab - THIS IS WHERE VIOLATION OCCURS
    console.log('=== SWITCHING TO PAGES TAB ===');
    act(() => {
      rerender(<TabWrapper showPages={true} />);
    });
    
    const postTabSwitchHooks = hookCallCounts[renderCount] || 0;
    console.log(`Pre-switch hooks: ${preTabSwitchHooks}`);
    console.log(`Post-switch hooks: ${postTabSwitchHooks}`);
    
    // Verify AgentPagesTab mounted
    expect(screen.getByTestId('empty-pages-state')).toBeInTheDocument();
    
    // Switch back to other tab
    console.log('=== SWITCHING BACK TO OTHER TAB ===');
    renderCount++;
    act(() => {
      rerender(<TabWrapper showPages={false} />);
    });
    
    const backToOtherTabHooks = hookCallCounts[renderCount] || 0;
    console.log(`Back to other tab hooks: ${backToOtherTabHooks}`);
    
    // Switch to Pages tab AGAIN - this should show the violation
    console.log('=== SWITCHING TO PAGES TAB AGAIN ===');
    renderCount++;
    act(() => {
      rerender(<TabWrapper showPages={true} />);
    });
    
    const secondPagesTabHooks = hookCallCounts[renderCount] || 0;
    console.log(`Second pages tab switch hooks: ${secondPagesTabHooks}`);
    console.log(`Difference from first switch: ${secondPagesTabHooks - postTabSwitchHooks}`);
    
    // This should FAIL - hooks count should be consistent
    expect(secondPagesTabHooks).toBe(postTabSwitchHooks);
  });
});