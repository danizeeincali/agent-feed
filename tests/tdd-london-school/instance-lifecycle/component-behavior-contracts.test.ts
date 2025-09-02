/**
 * Component Behavior Contracts Test Suite
 * 
 * London School TDD: Focus on HOW components collaborate
 * These tests define the behavioral contracts that prevent the current instance lifecycle bugs
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock contracts (imported from our contracts file)
import {
  createClaudeInstanceAPIMock,
  createSSEConnectionMock,
  verifyNoAutoInstanceCreation,
  verifyUserInitiatedCreation,
  verifyProperCleanupSequence,
  verifyResourceLeakPrevention,
  assertExactlyOneInstanceCreated,
  assertNoInstancesCreated,
  assertProperConnectionCleanup,
  assertAPICallSequence,
  createInstanceResponse,
  createSuccessResponse,
  InstanceConfig
} from './mock-contracts';

// Mock the global fetch and EventSource before importing components
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockEventSource = jest.fn();
global.EventSource = mockEventSource;

// Import components after mocks are set up
import { EnhancedSSEInterface } from '../../../frontend/src/components/claude-manager/EnhancedSSEInterface';

/**
 * Test Suite: Component Lifecycle Behavior Contracts
 * 
 * These tests define the exact behaviors required to prevent instance lifecycle bugs:
 * 1. Components must NOT auto-create instances on mount
 * 2. Components must cleanup all resources on unmount  
 * 3. Instance creation must only happen on explicit user action
 * 4. Navigation must not create duplicate instances
 * 5. Resource leaks must be prevented across mount/unmount cycles
 */
describe('Component Lifecycle Behavior Contracts', () => {
  let apiMock: ReturnType<typeof createClaudeInstanceAPIMock>;
  let sseMock: ReturnType<typeof createSSEConnectionMock>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Create fresh mocks for each test
    apiMock = createClaudeInstanceAPIMock();
    sseMock = createSSEConnectionMock();
    user = userEvent.setup();
    
    // Setup fetch mock to use our API mock
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      
      switch (method) {
        case 'GET':
          if (url.includes('/api/claude/instances')) {
            return Promise.resolve({
              ok: true,
              json: () => apiMock.fetchInstances()
            });
          }
          break;
          
        case 'POST':
          if (url.includes('/api/claude/instances')) {
            const config = JSON.parse(options?.body as string) as InstanceConfig;
            return Promise.resolve({
              ok: true,
              json: () => apiMock.createInstance(config)
            });
          }
          break;
          
        case 'DELETE':
          if (url.includes('/api/claude/instances')) {
            const instanceId = url.split('/').pop() || '';
            return Promise.resolve({
              ok: true,
              json: () => apiMock.terminateInstance(instanceId)
            });
          }
          break;
      }
      
      return Promise.reject(new Error(`Unexpected API call: ${method} ${url}`));
    });
    
    // Setup EventSource mock
    mockEventSource.mockImplementation(() => sseMock);
    
    // Default API responses
    apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * CONTRACT 1: Mount Behavior - No Auto-Creation
   * Critical for preventing the "instances created on every mount" bug
   */
  describe('Contract 1: Mount Behavior (No Auto-Creation)', () => {
    it('MUST fetch existing instances but MUST NOT create new ones on mount', async () => {
      // GIVEN: Clean system with no existing instances
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));

      // WHEN: Component mounts
      render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={false} />
        </MemoryRouter>
      );

      // THEN: Component MUST follow contract
      await waitFor(() => {
        // MUST fetch existing instances
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      });
      
      // MUST NOT auto-create instances
      verifyNoAutoInstanceCreation(apiMock);
      
      // Verify API call pattern
      assertAPICallSequence(mockFetch, [
        { method: 'GET', url: '/api/claude/instances' }
      ]);
    });

    it('MUST maintain no-auto-creation contract even with autoConnect=true', async () => {
      // GIVEN: autoConnect is enabled
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));

      // WHEN: Component mounts with autoConnect
      render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={true} />
        </MemoryRouter>
      );

      // THEN: MUST still not auto-create instances
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalled();
      });
      
      verifyNoAutoInstanceCreation(apiMock);
    });

    it('MUST only connect to existing instances, never create new ones', async () => {
      // GIVEN: Existing running instance
      const existingInstance = createInstanceResponse({
        id: 'existing-123',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ 
        instances: [existingInstance] 
      }));
      
      apiMock.connectToInstance.mockResolvedValue(createSuccessResponse({}));

      // WHEN: Component mounts and user connects to existing instance
      const { getByText } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getByText('Connect')).toBeInTheDocument();
      });

      // User connects to existing instance
      await user.click(getByText('Connect'));

      // THEN: MUST connect to existing, MUST NOT create new
      expect(apiMock.connectToInstance).toHaveBeenCalledWith('existing-123');
      verifyNoAutoInstanceCreation(apiMock);
    });
  });

  /**
   * CONTRACT 2: User-Initiated Creation Only
   * Critical for ensuring instances are only created when user explicitly requests
   */
  describe('Contract 2: User-Initiated Creation Only', () => {
    it('MUST create instance only when user explicitly clicks create button', async () => {
      // GIVEN: No existing instances
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));
      apiMock.createInstance.mockResolvedValue(createSuccessResponse({
        instance: createInstanceResponse({ id: 'user-created-456' })
      }));

      // WHEN: Component mounts
      const { getByText } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Wait for component to be ready
      await waitFor(() => {
        expect(getByText('No instances available')).toBeInTheDocument();
      });

      // Verify no instances created yet
      assertNoInstancesCreated(apiMock);

      // WHEN: User explicitly clicks create
      await user.click(getByText('Default Claude'));

      // THEN: MUST create exactly one instance
      await waitFor(() => {
        assertExactlyOneInstanceCreated(apiMock);
      });
      
      verifyUserInitiatedCreation(apiMock, {
        command: 'claude',
        name: 'Default Claude',
        type: 'default'
      });
    });

    it('MUST track exact sequence of user actions without auto-creation', async () => {
      // GIVEN: Component ready for user interaction
      const { getByText } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getByText('Skip Permissions')).toBeInTheDocument();
      });

      // WHEN: User performs multiple explicit actions
      await user.click(getByText('Skip Permissions'));
      await user.click(getByText('Interactive Mode'));

      // THEN: MUST track each user action separately
      expect(apiMock.createInstance).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({
          command: 'claude --dangerously-skip-permissions'
        })
      );
      
      expect(apiMock.createInstance).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          command: 'claude --interactive'
        })
      );
      
      expect(apiMock.createInstance).toHaveBeenCalledTimes(2);
    });

    it('MUST prevent creation when user never initiates action', async () => {
      // GIVEN: Component mounted for extended period
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Time passes without user interaction
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
      });

      // THEN: MUST NOT create any instances
      assertNoInstancesCreated(apiMock);
      
      // Only fetch should have occurred
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * CONTRACT 3: Unmount Cleanup
   * Critical for preventing resource leaks and zombie instances
   */
  describe('Contract 3: Unmount Cleanup', () => {
    it('MUST cleanup all resources when component unmounts', async () => {
      // GIVEN: Component with connected instance
      const runningInstance = createInstanceResponse({
        id: 'cleanup-test-789',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [runningInstance]
      }));
      
      apiMock.connectToInstance.mockResolvedValue(createSuccessResponse({}));
      apiMock.terminateInstance.mockResolvedValue(createSuccessResponse({}));

      const { getByText, unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to instance
      await waitFor(() => {
        expect(getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(getByText('Connect'));

      // WHEN: Component unmounts
      unmount();

      // THEN: MUST cleanup all resources
      assertProperConnectionCleanup(sseMock);
      
      // Verify proper cleanup sequence
      verifyProperCleanupSequence(apiMock, sseMock);
    });

    it('MUST close all SSE connections on unmount', async () => {
      // GIVEN: Component with active SSE connections
      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Component unmounts
      unmount();

      // THEN: MUST close SSE connections
      expect(sseMock.close).toHaveBeenCalled();
    });

    it('MUST cleanup event listeners to prevent memory leaks', async () => {
      // GIVEN: Component with event listeners
      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Verify event listeners were added
      expect(sseMock.addEventListener).toHaveBeenCalled();

      // WHEN: Component unmounts
      unmount();

      // THEN: MUST remove event listeners
      expect(sseMock.removeEventListener).toHaveBeenCalled();
    });
  });

  /**
   * CONTRACT 4: Navigation Behavior
   * Critical for preventing duplicate instances during navigation
   */
  describe('Contract 4: Navigation Behavior', () => {
    it('MUST NOT create duplicate instances when navigating away and back', async () => {
      // GIVEN: Component in routing context
      const { rerender } = render(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
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

      // THEN: MUST NOT create duplicate instances
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
      });
      
      assertNoInstancesCreated(apiMock);
    });

    it('MUST preserve existing instance state across navigation', async () => {
      // GIVEN: Component with existing instances
      const persistentInstance = createInstanceResponse({
        id: 'persistent-999',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [persistentInstance]
      }));

      const { rerender } = render(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      });

      // WHEN: Navigate away and back
      rerender(<div>Away</div>);
      rerender(
        <MemoryRouter initialEntries={['/claude-manager']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: MUST preserve instances, NOT create new ones
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
      });
      
      assertNoInstancesCreated(apiMock);
    });
  });

  /**
   * CONTRACT 5: Resource Leak Prevention
   * Critical for preventing accumulating instances across cycles
   */
  describe('Contract 5: Resource Leak Prevention', () => {
    it('MUST prevent accumulating instances across multiple mount/unmount cycles', async () => {
      // GIVEN: Multiple mount/unmount cycles
      const cycles = 5;
      
      for (let i = 0; i < cycles; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(apiMock.fetchInstances).toHaveBeenCalled();
        });

        unmount();
      }

      // THEN: MUST NOT accumulate instances
      verifyResourceLeakPrevention(apiMock, cycles);
    });

    it('MUST ensure proper cleanup order to prevent race conditions', async () => {
      // GIVEN: Component with connected instance
      const runningInstance = createInstanceResponse({
        id: 'race-condition-test',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [runningInstance]
      }));

      const { getByText, unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to instance
      await waitFor(() => {
        expect(getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(getByText('Connect'));

      // WHEN: Component unmounts
      unmount();

      // THEN: MUST follow proper cleanup order
      verifyProperCleanupSequence(apiMock, sseMock);
      
      // Verify no race conditions in cleanup
      expect(sseMock.close).toHaveBeenCalled();
    });

    it('MUST handle concurrent mount/unmount without resource leaks', async () => {
      // GIVEN: Multiple component instances mounted concurrently
      const components = Array.from({ length: 3 }, () =>
        render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        )
      );

      // Wait for all to mount
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(3);
      });

      // WHEN: All unmount simultaneously
      components.forEach(({ unmount }) => unmount());

      // THEN: MUST cleanup all resources properly
      expect(sseMock.close).toHaveBeenCalledTimes(3);
      assertNoInstancesCreated(apiMock);
    });
  });

  /**
   * CONTRACT 6: Integration Contracts
   * Critical for ensuring components work together correctly
   */
  describe('Contract 6: Component Integration', () => {
    it('MUST maintain consistent API call patterns across all components', async () => {
      // GIVEN: Component making API calls
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: MUST follow consistent API pattern
      assertAPICallSequence(mockFetch, [
        { method: 'GET', url: '/api/claude/instances' }
      ]);
    });

    it('MUST coordinate state changes without conflicts', async () => {
      // GIVEN: Multiple state changes
      const { rerender } = render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={false} />
        </MemoryRouter>
      );

      // WHEN: Props change
      rerender(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={true} />
        </MemoryRouter>
      );

      // THEN: MUST handle state changes without creating instances
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
      assertNoInstancesCreated(apiMock);
    });
  });
});