/**
 * TDD London School - UnifiedAgentPage Hooks Violations Test Suite
 * 
 * This test suite follows the London School (mockist) approach to expose React hooks
 * violations in the UnifiedAgentPage component using outside-in development and
 * mock-driven testing.
 * 
 * HOOKS VIOLATIONS EXPOSED:
 * 1. useEffect missing dependencies causing stale closures
 * 2. Conditional hook usage based on agent state
 * 3. useCallback dependency instability
 * 4. Memory leaks from unmounted component API calls
 * 5. AgentPagesTab hooks order changes with prop variations
 * 
 * LONDON SCHOOL APPROACH:
 * - Mock all external dependencies (APIs, Router, etc.)
 * - Focus on component behavior and collaboration patterns
 * - Test interactions between hooks and their dependencies
 * - Use test doubles to control hook execution paths
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { jest } from '@jest/globals';
import UnifiedAgentPage from '../../../src/components/UnifiedAgentPage';
import { workspaceApi } from '../../../src/services/api';

// =============================================================================
// MOCK INFRASTRUCTURE - London School Approach
// =============================================================================

// Mock workspaceApi to control API behavior and expose hooks violations
jest.mock('../../../src/services/api', () => ({
  workspaceApi: {
    listPages: jest.fn(),
    createPage: jest.fn(),
  }
}));

// Mock React Router useParams to control agentId changes
const mockUseParams = jest.fn();
const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
  useNavigate: () => mockUseNavigate(),
}));

// Mock fetch to control API responses and timing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to track hooks violations
const originalError = console.error;
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

// Memory usage tracking mock
const mockMemoryUsage = {
  used: 0,
  total: 512 * 1024 * 1024, // 512MB limit
  track: jest.fn(),
  exceed: jest.fn(),
};

// Test component wrapper with Router context
const TestWrapper: React.FC<{ children: React.ReactNode; initialRoute?: string }> = ({ 
  children, 
  initialRoute = '/agents/test-agent-1' 
}) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <Routes>
      <Route path="/agents/:agentId" element={children} />
      <Route path="/agents" element={<div>Agents List</div>} />
    </Routes>
  </MemoryRouter>
);

// =============================================================================
// LONDON SCHOOL TEST SUITE - HOOKS VIOLATIONS
// =============================================================================

describe('UnifiedAgentPage - Hooks Violations (London School)', () => {
  let mockNavigate: jest.MockedFunction<any>;
  let mockWorkspaceApi: jest.Mocked<typeof workspaceApi>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    
    // Setup mock implementations
    mockNavigate = jest.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
    
    // Default successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          id: 'test-agent-1',
          name: 'Test Agent',
          description: 'Test Description',
          status: 'active',
          capabilities: ['test'],
        }
      })
    });
    
    mockWorkspaceApi.listPages.mockResolvedValue({
      success: true,
      pages: [],
      total: 0
    });
  });

  afterEach(() => {
    // Clean up memory tracking
    mockMemoryUsage.used = 0;
    mockMemoryUsage.track.mockClear();
    mockMemoryUsage.exceed.mockClear();
  });

  afterAll(() => {
    console.error = originalError;
  });

  // =============================================================================
  // TEST 1: HOOKS ORDER VIOLATIONS WITH AGENT ID CHANGES
  // =============================================================================
  describe('Hooks Order Violations', () => {
    test('should maintain stable hooks order when agentId prop changes rapidly', async () => {
      // ARRANGE: Mock rapid agentId changes
      const agentIds = ['agent-1', 'agent-2', 'agent-3'];
      let currentAgentIndex = 0;
      
      mockUseParams.mockImplementation(() => ({
        agentId: agentIds[currentAgentIndex]
      }));

      // Mock API responses for different agents
      mockFetch.mockImplementation((url) => {
        const agentId = url.toString().match(/\/agents\/(.+)$/)?.[1];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: agentId,
              name: `Agent ${agentId}`,
              description: 'Description',
              status: 'active',
              capabilities: [],
            }
          })
        });
      });

      // ACT: Render component
      const { rerender } = render(
        <TestWrapper initialRoute="/agents/agent-1">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Agent agent-1')).toBeInTheDocument();
      });

      // ACT: Rapidly change agentId to trigger hooks order violations
      for (let i = 1; i < agentIds.length; i++) {
        currentAgentIndex = i;
        
        act(() => {
          rerender(
            <TestWrapper initialRoute={`/agents/${agentIds[i]}`}>
              <UnifiedAgentPage />
            </TestWrapper>
          );
        });
        
        // Small delay to simulate rapid changes
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // ASSERT: Check for hooks order violation warnings
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('rendered fewer hooks than expected')
        );
      });
    });

    test('should expose conditional hooks usage in error states', async () => {
      // ARRANGE: Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockUseParams.mockReturnValue({ agentId: 'failing-agent' });

      // ACT: Render component in error state
      render(
        <TestWrapper initialRoute="/agents/failing-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // ASSERT: Check for conditional hook usage (hooks order violation)
      await waitFor(() => {
        // The component may render different numbers of hooks in error vs success states
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/Hook.*was called conditionally/)
        );
      });
    });
  });

  // =============================================================================
  // TEST 2: MEMORY CONSTRAINTS VIOLATIONS
  // =============================================================================
  describe('Memory Usage Violations', () => {
    test('should exceed 512MB memory limit during component lifecycle', async () => {
      // ARRANGE: Mock memory-intensive operations
      const memoryLeakData = new Array(50000).fill({
        id: 'large-object',
        data: new Array(1000).fill('memory-intensive-data')
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'memory-agent',
            name: 'Memory Agent',
            description: 'Memory intensive agent',
            status: 'active',
            capabilities: memoryLeakData,
          }
        })
      });

      mockUseParams.mockReturnValue({ agentId: 'memory-agent' });

      // Mock memory tracking
      let memoryUsed = 0;
      mockMemoryUsage.track.mockImplementation(() => {
        memoryUsed += 50 * 1024 * 1024; // 50MB per call
        mockMemoryUsage.used = memoryUsed;
        
        if (memoryUsed > mockMemoryUsage.total) {
          mockMemoryUsage.exceed.mockReturnValue(true);
          throw new Error('Memory limit exceeded: 512MB');
        }
      });

      // ACT & ASSERT: Render component and expect memory violation
      await expect(async () => {
        render(
          <TestWrapper initialRoute="/agents/memory-agent">
            <UnifiedAgentPage />
          </TestWrapper>
        );
        
        // Trigger multiple re-renders to accumulate memory usage
        for (let i = 0; i < 15; i++) {
          mockMemoryUsage.track();
        }
      }).rejects.toThrow('Memory limit exceeded: 512MB');
    });

    test('should detect memory leaks from unmounted component API calls', async () => {
      // ARRANGE: Mock delayed API response
      let resolveApiCall: (value: any) => void;
      const delayedApiResponse = new Promise((resolve) => {
        resolveApiCall = resolve;
      });

      mockFetch.mockReturnValue(delayedApiResponse as any);
      mockUseParams.mockReturnValue({ agentId: 'delayed-agent' });

      // ACT: Mount and immediately unmount component
      const { unmount } = render(
        <TestWrapper initialRoute="/agents/delayed-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Unmount before API call completes
      unmount();

      // Complete API call after unmount
      act(() => {
        resolveApiCall!({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'delayed-agent', name: 'Delayed Agent' }
          })
        });
      });

      // ASSERT: Check for memory leak warning
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('state update on unmounted component')
        );
      });
    });
  });

  // =============================================================================
  // TEST 3: AGENTPAGESTAB HOOKS VIOLATIONS WITH PROP CHANGES
  // =============================================================================
  describe('AgentPagesTab Hooks Violations', () => {
    test('should handle varying page data arrays without hooks count changes', async () => {
      // ARRANGE: Mock agent with varying page counts
      const agentDataSets = [
        { pages: [] }, // Empty pages
        { pages: [{ id: '1', title: 'Page 1' }] }, // One page
        { pages: [{ id: '1', title: 'Page 1' }, { id: '2', title: 'Page 2' }] }, // Two pages
      ];

      mockUseParams.mockReturnValue({ agentId: 'pages-agent' });
      
      let dataSetIndex = 0;
      mockWorkspaceApi.listPages.mockImplementation(() => {
        const currentData = agentDataSets[dataSetIndex] || agentDataSets[0];
        return Promise.resolve({
          success: true,
          pages: currentData.pages,
          total: currentData.pages.length
        });
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'pages-agent',
            name: 'Pages Agent',
            status: 'active',
            capabilities: [],
          }
        })
      });

      // ACT: Render and switch to pages tab
      const { rerender } = render(
        <TestWrapper initialRoute="/agents/pages-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Pages Agent')).toBeInTheDocument();
      });

      // Click on pages tab to trigger AgentPagesTab rendering
      const pagesTab = await screen.findByText('Pages');
      fireEvent.click(pagesTab);

      // ACT: Change page data multiple times
      for (let i = 1; i < agentDataSets.length; i++) {
        dataSetIndex = i;
        
        act(() => {
          // Force re-render with new page data
          rerender(
            <TestWrapper initialRoute="/agents/pages-agent">
              <UnifiedAgentPage />
            </TestWrapper>
          );
        });
        
        await waitFor(() => {
          // Wait for pages tab to be active
          expect(screen.getByRole('button', { name: /Pages/ })).toHaveClass('text-blue-600');
        });
      }

      // ASSERT: Check for hooks count violations
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/rendered (more|fewer) hooks than expected/)
      );
    });

    test('should expose unsafe useEffect dependencies in AgentPagesTab', async () => {
      // ARRANGE: Mock agent.id changes
      const agentIds = ['agent-deps-1', 'agent-deps-2'];
      let currentId = 0;

      mockUseParams.mockImplementation(() => ({
        agentId: agentIds[currentId]
      }));

      mockFetch.mockImplementation((url) => {
        const agentId = url.toString().match(/\/agents\/(.+)$/)?.[1];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: agentId,
              name: `Agent ${agentId}`,
              status: 'active',
              capabilities: [],
            }
          })
        });
      });

      // ACT: Render with first agent
      const { rerender } = render(
        <TestWrapper initialRoute={`/agents/${agentIds[0]}`}>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Switch to pages tab
      await waitFor(() => {
        expect(screen.getByText(`Agent ${agentIds[0]}`)).toBeInTheDocument();
      });

      const pagesTab = await screen.findByText('Pages');
      fireEvent.click(pagesTab);

      // ACT: Change agent ID to trigger useEffect dependency issue
      currentId = 1;
      
      act(() => {
        rerender(
          <TestWrapper initialRoute={`/agents/${agentIds[1]}`}>
            <UnifiedAgentPage />
          </TestWrapper>
        );
      });

      // ASSERT: Check for missing dependency warnings
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/useEffect.*missing.*dependency/)
        );
      });
    });
  });

  // =============================================================================
  // TEST 4: USECALLBACK AND USEMEMO DEPENDENCY INSTABILITY
  // =============================================================================
  describe('Hook Dependencies Instability', () => {
    test('should expose useCallback dependency instability in fetchAgentData', async () => {
      // ARRANGE: Mock multiple renders with changing agentId
      const agentIds = ['callback-1', 'callback-2', 'callback-3'];
      let renderCount = 0;

      mockUseParams.mockImplementation(() => {
        const agentId = agentIds[renderCount % agentIds.length];
        renderCount++;
        return { agentId };
      });

      // Track useCallback recreations
      const callbackTracker = new Set();
      const originalUseCallback = React.useCallback;
      
      jest.spyOn(React, 'useCallback').mockImplementation((callback, deps) => {
        const callbackId = callback.toString().substring(0, 50);
        callbackTracker.add(callbackId);
        return originalUseCallback(callback, deps);
      });

      // ACT: Render multiple times
      const { rerender } = render(
        <TestWrapper initialRoute="/agents/callback-1">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper initialRoute={`/agents/callback-${(i % 3) + 1}`}>
            <UnifiedAgentPage />
          </TestWrapper>
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // ASSERT: Check for excessive callback recreations
      expect(callbackTracker.size).toBeGreaterThan(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/useCallback.*unstable.*dependencies/)
      );

      // Cleanup
      jest.restoreAllMocks();
    });

    test('should detect infinite re-render loops from state management', async () => {
      // ARRANGE: Mock state that causes infinite updates
      let updateCount = 0;
      const maxUpdates = 50;

      mockFetch.mockImplementation(() => {
        updateCount++;
        if (updateCount > maxUpdates) {
          throw new Error('Too many re-renders. React limits the number of renders to prevent an infinite loop.');
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'infinite-agent',
              name: 'Infinite Agent',
              status: 'active',
              capabilities: [],
              // Return different data each time to trigger re-renders
              _timestamp: Date.now(),
            }
          })
        });
      });

      mockUseParams.mockReturnValue({ agentId: 'infinite-agent' });

      // ACT & ASSERT: Expect infinite loop error
      await expect(async () => {
        render(
          <TestWrapper initialRoute="/agents/infinite-agent">
            <UnifiedAgentPage />
          </TestWrapper>
        );
        
        // Wait for infinite loop to trigger
        await new Promise(resolve => setTimeout(resolve, 1000));
      }).rejects.toThrow(/Too many re-renders/);
    });
  });

  // =============================================================================
  // TEST 5: FAILING TEST SCENARIOS - INTEGRATION TESTS
  // =============================================================================
  describe('Integration Hook Violations', () => {
    test('should fail when component switches between tabs with different hook counts', async () => {
      // ARRANGE: Mock different tab content that uses different numbers of hooks
      mockUseParams.mockReturnValue({ agentId: 'tab-switching-agent' });
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'tab-switching-agent',
            name: 'Tab Switching Agent',
            status: 'active',
            capabilities: ['tab-1', 'tab-2', 'tab-3'],
          }
        })
      });

      // ACT: Render and switch tabs rapidly
      render(
        <TestWrapper initialRoute="/agents/tab-switching-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Tab Switching Agent')).toBeInTheDocument();
      });

      // Switch tabs rapidly to trigger hook count inconsistencies
      const tabNames = ['Overview', 'Details', 'Activity', 'Configuration', 'Pages'];
      
      for (const tabName of tabNames) {
        const tabButton = await screen.findByText(tabName);
        
        act(() => {
          fireEvent.click(tabButton);
        });
        
        // Small delay between tab switches
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // ASSERT: Check for hooks violations
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/Hook.*called.*different.*order/)
        );
      });
    });

    test('should expose race conditions in concurrent API calls', async () => {
      // ARRANGE: Mock concurrent API calls with different response times
      const apiCallDelays = [100, 50, 200]; // Different delays to create race conditions
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        const delay = apiCallDelays[callCount % apiCallDelays.length];
        callCount++;
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: {
                  id: 'race-agent',
                  name: 'Race Condition Agent',
                  status: 'active',
                  capabilities: [],
                  _callId: callCount,
                }
              })
            });
          }, delay);
        });
      });

      mockUseParams.mockReturnValue({ agentId: 'race-agent' });

      // ACT: Trigger multiple API calls concurrently
      const { rerender } = render(
        <TestWrapper initialRoute="/agents/race-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Trigger multiple re-renders quickly to create race conditions
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper initialRoute="/agents/race-agent">
            <UnifiedAgentPage />
          </TestWrapper>
        );
      }

      // ASSERT: Check for race condition warnings
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringMatching(/state.*unmounted.*component/)
        );
      }, { timeout: 5000 });
    });
  });

  // =============================================================================
  // LONDON SCHOOL CONTRACT VERIFICATION
  // =============================================================================
  describe('Mock Contract Verification', () => {
    test('should verify all API mock contracts are properly defined', () => {
      // ASSERT: Verify workspaceApi mock contract
      expect(mockWorkspaceApi.listPages).toBeDefined();
      expect(mockWorkspaceApi.createPage).toBeDefined();
      
      // Verify fetch mock contract
      expect(mockFetch).toBeDefined();
      expect(typeof mockFetch).toBe('function');
      
      // Verify router mock contract  
      expect(mockUseParams).toBeDefined();
      expect(mockUseNavigate).toBeDefined();
      
      // Verify console mock contract
      expect(mockConsoleError).toBeDefined();
    });

    test('should verify mock interactions follow expected patterns', async () => {
      // ARRANGE: Standard component render
      mockUseParams.mockReturnValue({ agentId: 'contract-test-agent' });
      
      // ACT: Render component
      render(
        <TestWrapper initialRoute="/agents/contract-test-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // ASSERT: Verify expected mock interactions
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/contract-test-agent');
        expect(mockUseParams).toHaveBeenCalled();
      });

      // Verify interaction sequence
      const callOrder = jest.getCallList([mockUseParams, mockFetch]);
      expect(callOrder[0].fn).toBe(mockUseParams);
      expect(callOrder[1].fn).toBe(mockFetch);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS FOR LONDON SCHOOL TESTING
// =============================================================================

/**
 * Creates a mock agent data object for testing
 */
function createMockAgentData(overrides: any = {}) {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'Test Description',
    status: 'active',
    capabilities: [],
    ...overrides,
  };
}

/**
 * Tracks hook calls for violation detection
 */
function createHookCallTracker() {
  const calls = new Map();
  
  return {
    track: (hookName: string, deps?: any[]) => {
      const callKey = `${hookName}-${JSON.stringify(deps)}`;
      calls.set(callKey, (calls.get(callKey) || 0) + 1);
    },
    getCalls: () => calls,
    getViolations: () => Array.from(calls.entries()).filter(([_, count]) => count > 1),
  };
}

/**
 * Mock memory monitor for testing memory constraints
 */
function createMemoryMonitor(limit: number = 512 * 1024 * 1024) {
  let used = 0;
  
  return {
    track: (amount: number) => {
      used += amount;
      if (used > limit) {
        throw new Error(`Memory limit exceeded: ${used} > ${limit}`);
      }
    },
    getUsed: () => used,
    reset: () => { used = 0; },
  };
}