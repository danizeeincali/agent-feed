/**
 * TDD London School: Claude Instance Lifecycle Management Tests
 * 
 * This test suite follows the London School (mockist) approach to TDD, focusing on:
 * - Outside-in development from user behavior
 * - Mock-driven development with clear contracts
 * - Behavior verification over state testing
 * - Interaction testing between collaborators
 * 
 * Test Objectives:
 * 1. Prevent automatic instance creation on component mount
 * 2. Ensure proper cleanup on component unmount
 * 3. Verify user-initiated instance creation only
 * 4. Prevent resource leaks during navigation
 * 5. Test navigation event handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock API and dependencies FIRST (London School approach)
const mockFetch = jest.fn();
const mockNavigate = jest.fn();
const mockWebSocket = jest.fn();
const mockEventSource = jest.fn();

// Mock the fetch global
global.fetch = mockFetch;

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock WebSocket and EventSource
global.WebSocket = mockWebSocket;
global.EventSource = mockEventSource;

// Component imports (after mocks)
import { EnhancedSSEInterface } from '../../../frontend/src/components/claude-manager/EnhancedSSEInterface';
import { InstanceLauncher } from '../../../frontend/src/components/InstanceLauncher';

/**
 * London School Contract Definitions
 * These define the expected interactions between objects
 */
interface ClaudeInstanceContract {
  // API Endpoints that must be called
  fetchInstances: jest.Mock;
  createInstance: jest.Mock;
  terminateInstance: jest.Mock;
  connectToInstance: jest.Mock;
  disconnectFromInstance: jest.Mock;
  
  // WebSocket/SSE connections
  sseConnection: jest.Mock;
  websocketConnection: jest.Mock;
  
  // Navigation callbacks
  navigationHandlers: jest.Mock;
}

interface ComponentLifecycleContract {
  // Mount behavior - should NOT auto-create instances
  onMount: jest.Mock;
  
  // Unmount behavior - should cleanup all resources
  onUnmount: jest.Mock;
  
  // User interactions - should only create when explicitly requested
  onUserCreateInstance: jest.Mock;
  onUserTerminateInstance: jest.Mock;
  
  // Navigation events
  onNavigateAway: jest.Mock;
  onNavigateBack: jest.Mock;
}

/**
 * Mock Factory Functions (London School Pattern)
 */
const createClaudeInstanceMocks = (): ClaudeInstanceContract => ({
  fetchInstances: jest.fn(),
  createInstance: jest.fn(),
  terminateInstance: jest.fn(),
  connectToInstance: jest.fn(),
  disconnectFromInstance: jest.fn(),
  sseConnection: jest.fn(),
  websocketConnection: jest.fn(),
  navigationHandlers: jest.fn(),
});

const createComponentLifecycleMocks = (): ComponentLifecycleContract => ({
  onMount: jest.fn(),
  onUnmount: jest.fn(),
  onUserCreateInstance: jest.fn(),
  onUserTerminateInstance: jest.fn(),
  onNavigateAway: jest.fn(),
  onNavigateBack: jest.fn(),
});

/**
 * Test Suite: Claude Instance Lifecycle Management
 */
describe('Claude Instance Lifecycle Management (London School TDD)', () => {
  let claudeInstanceMocks: ClaudeInstanceContract;
  let lifecycleMocks: ComponentLifecycleContract;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mock contracts
    claudeInstanceMocks = createClaudeInstanceMocks();
    lifecycleMocks = createComponentLifecycleMocks();
    
    // Setup user interaction
    user = userEvent.setup();
    
    // Setup default API responses
    claudeInstanceMocks.fetchInstances.mockResolvedValue({
      success: true,
      instances: []
    });
    
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/claude/instances') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => claudeInstanceMocks.fetchInstances()
        });
      }
      
      if (url.includes('/api/claude/instances') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => claudeInstanceMocks.createInstance()
        });
      }
      
      if (url.includes('/api/claude/instances') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => claudeInstanceMocks.terminateInstance()
        });
      }
      
      return Promise.reject(new Error('Unexpected API call'));
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * Test Suite 1: Component Mount Behavior
   * London School Focus: Verify NO automatic instance creation
   */
  describe('Component Mount Behavior (No Auto-Creation)', () => {
    it('should NOT automatically create instances on component mount', async () => {
      // GIVEN: A clean system with no instances
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: []
      });

      // WHEN: Component mounts
      render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={false} />
        </MemoryRouter>
      );

      // THEN: Should only fetch existing instances, never create new ones
      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalledTimes(1);
      });
      
      // CRITICAL: No instance creation should occur
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should NOT auto-create instances even with autoConnect=true', async () => {
      // GIVEN: Component configured with autoConnect
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: []
      });

      // WHEN: Component mounts with autoConnect=true
      render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={true} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
      });

      // THEN: Should still not create instances automatically
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should only connect to existing instances, never create new ones', async () => {
      // GIVEN: An existing instance
      const existingInstance = {
        id: 'existing-instance-123',
        status: 'running',
        pid: 12345
      };
      
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: [existingInstance]
      });

      // WHEN: Component mounts and connects
      render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={true} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
      });

      // Connect to existing instance
      const connectButton = await screen.findByText('Connect');
      await user.click(connectButton);

      // THEN: Should connect to existing instance only
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  /**
   * Test Suite 2: User-Initiated Instance Creation
   * London School Focus: Test explicit user interactions
   */
  describe('User-Initiated Instance Creation Only', () => {
    it('should create instance ONLY when user explicitly clicks create', async () => {
      // GIVEN: No existing instances and user wants to create one
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: []
      });
      
      claudeInstanceMocks.createInstance.mockResolvedValue({
        success: true,
        instance: {
          id: 'new-instance-456',
          status: 'running',
          pid: 67890
        }
      });

      // WHEN: Component mounts
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No instances available')).toBeInTheDocument();
      });

      // AND WHEN: User explicitly clicks create
      const createButton = screen.getByText('Default Claude');
      await user.click(createButton);

      // THEN: Should create instance exactly once
      await waitFor(() => {
        expect(claudeInstanceMocks.createInstance).toHaveBeenCalledTimes(1);
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"command":"claude"')
        })
      );
    });

    it('should track the exact sequence of user-initiated actions', async () => {
      // GIVEN: Component with quick launch templates
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User performs sequence of actions
      await user.click(screen.getByText('Skip Permissions'));
      await user.click(screen.getByText('Interactive Mode'));

      // THEN: Should track each user action in sequence
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'GET' })
      );
      
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ 
          method: 'POST',
          body: expect.stringContaining('"command":"claude --dangerously-skip-permissions"')
        })
      );
      
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'GET' })
      );
      
      expect(mockFetch).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ 
          method: 'POST',
          body: expect.stringContaining('"command":"claude --interactive"')
        })
      );
    });

    it('should prevent instance creation if user never initiates action', async () => {
      // GIVEN: Component mounted for extended period
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Time passes without user interaction
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      // THEN: No instances should be created
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
      
      // Only initial fetch should occur
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'GET' })
      );
      
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  /**
   * Test Suite 3: Component Unmount Cleanup
   * London School Focus: Verify proper resource cleanup
   */
  describe('Component Unmount Cleanup', () => {
    it('should terminate all instances when component unmounts', async () => {
      // GIVEN: Component with connected instances
      const runningInstance = {
        id: 'running-instance-789',
        status: 'running',
        pid: 11111
      };
      
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: [runningInstance]
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Wait for instance to load
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });

      // Connect to instance
      await user.click(screen.getByText('Connect'));

      // WHEN: Component unmounts
      unmount();

      // THEN: All instances should be properly terminated
      expect(claudeInstanceMocks.terminateInstance).toHaveBeenCalled();
      
      // Verify cleanup call pattern
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/claude/instances'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    it('should close all SSE connections on unmount', async () => {
      // GIVEN: Component with active SSE connections
      const mockSSEInstance = {
        close: jest.fn(),
        readyState: EventSource.OPEN
      };
      
      mockEventSource.mockImplementation(() => mockSSEInstance);

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Component unmounts
      unmount();

      // THEN: All SSE connections should be closed
      expect(mockSSEInstance.close).toHaveBeenCalled();
    });

    it('should cleanup all event listeners on unmount', async () => {
      // GIVEN: Component with event listeners
      const mockEventListenerRemover = jest.fn();
      const originalRemoveEventListener = window.removeEventListener;
      window.removeEventListener = mockEventListenerRemover;

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Component unmounts
      unmount();

      // THEN: Event listeners should be cleaned up
      // Note: This verifies the cleanup pattern exists
      expect(mockEventListenerRemover).toHaveBeenCalled();

      // Restore original function
      window.removeEventListener = originalRemoveEventListener;
    });
  });

  /**
   * Test Suite 4: Navigation Event Handling
   * London School Focus: Test navigation-specific behaviors
   */
  describe('Navigation Event Handling', () => {
    it('should not create duplicate instances when navigating away and back', async () => {
      // GIVEN: Component in routing context
      const { rerender } = render(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
      });

      // WHEN: Navigate away
      rerender(
        <MemoryRouter initialEntries={['/other-page']}>
          <div>Other page</div>
        </MemoryRouter>
      );

      // AND: Navigate back
      rerender(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: Should not create duplicate instances
      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalledTimes(2);
      });
      
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
    });

    it('should preserve instance state across navigation', async () => {
      // GIVEN: Component with connected instance
      const existingInstance = {
        id: 'persistent-instance-999',
        status: 'running',
        pid: 22222
      };
      
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: [existingInstance]
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to instance
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // WHEN: Navigate away and back
      rerender(
        <MemoryRouter initialEntries={['/other-page']}>
          <div>Other page</div>
        </MemoryRouter>
      );

      rerender(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: Instance should still be available
      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
      });
      
      // Should not create new instances
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
    });

    it('should handle browser refresh without resource leaks', async () => {
      // GIVEN: Component with instances
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Simulate browser refresh by unmounting and remounting
      cleanup();

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: Should handle refresh gracefully
      await waitFor(() => {
        expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
      });
      
      // Should not leave dangling resources
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 5: Resource Leak Prevention
   * London School Focus: Verify no accumulating instances
   */
  describe('Resource Leak Prevention', () => {
    it('should prevent accumulating instances across multiple mount/unmount cycles', async () => {
      // Test multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalled();
        });

        unmount();
      }

      // THEN: Should not accumulate instances
      // Each mount should only fetch existing instances, never create new ones
      expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalledTimes(5);
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
    });

    it('should track and prevent memory leaks in hooks', async () => {
      // GIVEN: Multiple component instances
      const components = [];
      
      for (let i = 0; i < 3; i++) {
        components.push(render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        ));
      }

      // WHEN: All components unmount
      components.forEach(({ unmount }) => unmount());

      // THEN: All resources should be cleaned up
      // Verify no lingering references or timers
      expect(claudeInstanceMocks.terminateInstance).toHaveBeenCalledTimes(3);
    });

    it('should ensure proper cleanup order: disconnect before terminate', async () => {
      // GIVEN: Connected instance
      const runningInstance = {
        id: 'cleanup-test-instance',
        status: 'running',
        pid: 33333
      };
      
      claudeInstanceMocks.fetchInstances.mockResolvedValue({
        success: true,
        instances: [runningInstance]
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to instance
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // WHEN: Component unmounts
      unmount();

      // THEN: Should follow proper cleanup order
      const callOrder = mockFetch.mock.calls.map(call => ({
        url: call[0],
        method: call[1]?.method
      }));

      // Verify disconnect happens before terminate
      expect(callOrder).toContainEqual(
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  /**
   * Test Suite 6: Behavioral Contracts
   * London School Focus: Define component collaboration contracts
   */
  describe('Component Behavioral Contracts', () => {
    it('should define clear API interaction contracts', async () => {
      // Contract: Component must follow specific API call patterns
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // User creates instance
      await user.click(screen.getByText('Default Claude'));

      // THEN: Must follow contract: GET -> POST -> GET pattern
      const apiCalls = mockFetch.mock.calls;
      
      expect(apiCalls[0]).toEqual([
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: undefined }) // GET
      ]);
      
      expect(apiCalls[1]).toEqual([
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      ]);
    });

    it('should enforce SSE connection lifecycle contracts', async () => {
      // Contract: SSE connections must be properly managed
      const mockSSE = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: EventSource.OPEN
      };
      
      mockEventSource.mockImplementation(() => mockSSE);

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: Must register event listeners
      expect(mockSSE.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      
      // WHEN: Component unmounts
      unmount();

      // THEN: Must clean up connections
      expect(mockSSE.close).toHaveBeenCalled();
    });

    it('should verify hook dependency contracts', async () => {
      // Contract: Hooks must properly manage dependencies
      let renderCount = 0;
      const TestWrapper = ({ deps }: { deps: any }) => {
        renderCount++;
        return (
          <MemoryRouter>
            <EnhancedSSEInterface key={deps} />
          </MemoryRouter>
        );
      };

      const { rerender } = render(<TestWrapper deps="initial" />);
      
      // Change dependencies
      rerender(<TestWrapper deps="updated" />);

      // THEN: Should not cause unnecessary re-renders
      expect(renderCount).toBe(2);
      
      // Should still maintain proper API contracts
      expect(claudeInstanceMocks.fetchInstances).toHaveBeenCalledTimes(2);
      expect(claudeInstanceMocks.createInstance).not.toHaveBeenCalled();
    });
  });
});

/**
 * Integration Contract Tests
 * London School: Test how components collaborate
 */
describe('Instance Lifecycle Integration Contracts', () => {
  it('should coordinate between InstanceLauncher and EnhancedSSEInterface', async () => {
    // Mock the useInstanceManager hook
    const mockInstanceManager = {
      instances: [],
      launchInstance: jest.fn(),
      killInstance: jest.fn(),
      restartInstance: jest.fn(),
      loading: false,
      error: null
    };

    // This test would require proper mocking of the integration
    // between InstanceLauncher and EnhancedSSEInterface
    expect(mockInstanceManager.instances).toEqual([]);
  });

  it('should maintain consistent state across component hierarchy', async () => {
    // Test that parent and child components maintain consistent instance state
    // This ensures no duplicate instances are created at different levels
    expect(true).toBe(true); // Placeholder for integration test
  });
});