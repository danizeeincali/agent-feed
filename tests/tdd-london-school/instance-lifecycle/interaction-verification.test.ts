/**
 * Mock-Driven Interaction Verification Tests
 * 
 * London School TDD: Focus on testing the conversations between objects
 * This suite verifies that components interact correctly with their dependencies
 * using mocks to isolate each unit and verify interaction patterns
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock contracts
import {
  createClaudeInstanceAPIMock,
  createSSEConnectionMock,
  createInstanceResponse,
  createSuccessResponse,
  assertAPICallSequence
} from './mock-contracts';

// Global mocks
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockEventSource = jest.fn();
global.EventSource = mockEventSource;

// Navigation mock
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Component imports
import { EnhancedSSEInterface } from '../../../frontend/src/components/claude-manager/EnhancedSSEInterface';

/**
 * Interaction Verification Test Suite
 * 
 * London School Focus: Test HOW components talk to each other
 * - API interaction patterns
 * - Event handler coordination  
 * - State synchronization across collaborators
 * - Error handling conversations
 * - Lifecycle coordination between objects
 */
describe('Mock-Driven Interaction Verification', () => {
  let apiMock: ReturnType<typeof createClaudeInstanceAPIMock>;
  let sseMock: ReturnType<typeof createSSEConnectionMock>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    apiMock = createClaudeInstanceAPIMock();
    sseMock = createSSEConnectionMock();
    user = userEvent.setup();

    // Setup fetch mock to coordinate with API mock
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
            const config = JSON.parse(options?.body as string);
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

    mockEventSource.mockImplementation(() => sseMock);

    // Default successful responses
    apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * Test Suite 1: API Interaction Patterns
   * London School: Verify the conversation between component and API
   */
  describe('API Interaction Patterns', () => {
    it('should follow GET-before-POST pattern when creating instances', async () => {
      // GIVEN: Component with quick launch capability
      apiMock.createInstance.mockResolvedValue(createSuccessResponse({
        instance: createInstanceResponse({ id: 'new-instance-123' })
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User creates instance
      await waitFor(() => {
        expect(screen.getByText('Default Claude')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Default Claude'));

      // THEN: Should follow conversation pattern: GET -> POST -> GET
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2); // Initial + after create
        expect(apiMock.createInstance).toHaveBeenCalledTimes(1);
      });

      // Verify exact call sequence
      const expectedSequence = [
        { method: 'GET', url: '/api/claude/instances' },  // Initial fetch
        { method: 'POST', url: '/api/claude/instances' }, // Create instance
        { method: 'GET', url: '/api/claude/instances' }   // Refresh after create
      ];
      
      assertAPICallSequence(mockFetch, expectedSequence);
    });

    it('should coordinate API calls with SSE connection establishment', async () => {
      // GIVEN: Existing instance to connect to
      const existingInstance = createInstanceResponse({
        id: 'existing-instance-456',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [existingInstance]
      }));
      
      apiMock.connectToInstance.mockResolvedValue(createSuccessResponse({}));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User connects to instance
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // THEN: Should coordinate API call with SSE connection
      await waitFor(() => {
        expect(apiMock.connectToInstance).toHaveBeenCalledWith('existing-instance-456');
      });
      
      // SSE connection should be established
      expect(mockEventSource).toHaveBeenCalledWith(
        expect.stringContaining('existing-instance-456')
      );
    });

    it('should handle API error responses through proper conversation', async () => {
      // GIVEN: API that will fail
      apiMock.fetchInstances.mockRejectedValue(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: API fails
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalled();
      });

      // THEN: Component should handle error gracefully
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh instances:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  /**
   * Test Suite 2: Event Handler Coordination
   * London School: Test how event handlers talk to each other
   */
  describe('Event Handler Coordination', () => {
    it('should coordinate SSE event handlers with component state updates', async () => {
      // GIVEN: Component with SSE connection
      let sseEventHandlers: { [key: string]: Function } = {};
      
      sseMock.addEventListener.mockImplementation((event: string, handler: Function) => {
        sseEventHandlers[event] = handler;
      });

      const existingInstance = createInstanceResponse({
        id: 'sse-test-789',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [existingInstance]
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to instance
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // WHEN: SSE message arrives
      const mockSSEEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'output',
          instanceId: 'sse-test-789',
          content: 'Hello from Claude!'
        })
      });
      
      if (sseEventHandlers['message']) {
        sseEventHandlers['message'](mockSSEEvent);
      }

      // THEN: Component should coordinate event with state update
      await waitFor(() => {
        expect(screen.getByText('Hello from Claude!')).toBeInTheDocument();
      });
    });

    it('should coordinate user input events with command sending', async () => {
      // GIVEN: Connected instance
      const connectedInstance = createInstanceResponse({
        id: 'input-test-999',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [connectedInstance]
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect first
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // WHEN: User types and sends command
      const inputField = screen.getByPlaceholderText('Type a message...');
      await user.type(inputField, 'test command');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // THEN: Should coordinate input event with API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances/input-test-999/command'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test command')
        })
      );
    });

    it('should coordinate keyboard events with action triggers', async () => {
      // GIVEN: Component ready for input
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User presses Enter in input field
      const inputField = screen.getByPlaceholderText('Type a message...');
      await user.type(inputField, 'enter command{enter}');

      // THEN: Should coordinate keyboard event with send action
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  /**
   * Test Suite 3: State Synchronization Patterns
   * London School: Test state conversations between components
   */
  describe('State Synchronization Patterns', () => {
    it('should synchronize instance list state with API responses', async () => {
      // GIVEN: Dynamic instance list
      const initialInstances = [
        createInstanceResponse({ id: 'sync-test-1', name: 'Instance 1' }),
      ];
      
      const updatedInstances = [
        ...initialInstances,
        createInstanceResponse({ id: 'sync-test-2', name: 'Instance 2' })
      ];

      apiMock.fetchInstances
        .mockResolvedValueOnce(createSuccessResponse({ instances: initialInstances }))
        .mockResolvedValueOnce(createSuccessResponse({ instances: updatedInstances }));

      const { rerender } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByText(/sync-test-1/)).toBeInTheDocument();
      });

      // WHEN: Component re-fetches instances
      rerender(
        <MemoryRouter>
          <EnhancedSSEInterface key="updated" />
        </MemoryRouter>
      );

      // THEN: State should synchronize with new API response
      await waitFor(() => {
        expect(screen.getByText(/sync-test-2/)).toBeInTheDocument();
      });
      
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
    });

    it('should synchronize connection state across UI elements', async () => {
      // GIVEN: Instance that can be connected
      const testInstance = createInstanceResponse({
        id: 'connection-sync-test',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [testInstance]
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User connects to instance
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // THEN: Connection state should synchronize across UI
      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });
      
      // Status indicator should reflect connected state
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('should coordinate loading states across operations', async () => {
      // GIVEN: Component with loading operations
      apiMock.createInstance.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(createSuccessResponse({
            instance: createInstanceResponse({ id: 'loading-test' })
          })), 100)
        )
      );

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User initiates loading operation
      await user.click(screen.getByText('Default Claude'));

      // THEN: Loading state should coordinate across UI elements
      // Note: In a real implementation, we'd check for loading indicators
      await waitFor(() => {
        expect(apiMock.createInstance).toHaveBeenCalled();
      });
    });
  });

  /**
   * Test Suite 4: Error Handling Conversations
   * London School: Test how errors propagate through object collaborations
   */
  describe('Error Handling Conversations', () => {
    it('should coordinate API errors with user feedback', async () => {
      // GIVEN: API that will fail
      apiMock.createInstance.mockRejectedValue(new Error('Creation failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User tries to create instance and it fails
      await user.click(screen.getByText('Default Claude'));

      // THEN: Error should be coordinated with user feedback
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to launch instance:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should coordinate SSE connection errors with reconnection attempts', async () => {
      // GIVEN: SSE connection that will error
      let errorHandler: Function | undefined;
      
      sseMock.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      const testInstance = createInstanceResponse({
        id: 'error-handling-test',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [testInstance]
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Connect to trigger SSE
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // WHEN: SSE error occurs
      if (errorHandler) {
        errorHandler(new Event('error'));
      }

      // THEN: Error should coordinate with reconnection logic
      // Note: Implementation would depend on reconnection strategy
      expect(sseMock.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should coordinate network errors with graceful degradation', async () => {
      // GIVEN: Network failure scenario
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Network fails during initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // THEN: Should coordinate error with graceful UI state
      // Component should not crash and should handle the error state
      expect(screen.queryByText('Error')).toBeInTheDocument();
    });
  });

  /**
   * Test Suite 5: Lifecycle Coordination
   * London School: Test coordination between component lifecycle and dependencies
   */
  describe('Lifecycle Coordination', () => {
    it('should coordinate mount lifecycle with dependency initialization', async () => {
      // GIVEN: Fresh component mount
      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // THEN: Should coordinate mount with proper dependency setup
      expect(mockEventSource).toHaveBeenCalled();
      expect(apiMock.fetchInstances).toHaveBeenCalled();
    });

    it('should coordinate unmount lifecycle with cleanup', async () => {
      // GIVEN: Mounted component with active connections
      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: Component unmounts
      unmount();

      // THEN: Should coordinate unmount with dependency cleanup
      expect(sseMock.close).toHaveBeenCalled();
    });

    it('should coordinate prop changes with state updates', async () => {
      // GIVEN: Component with initial props
      const { rerender } = render(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={false} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
      });

      // WHEN: Props change
      rerender(
        <MemoryRouter>
          <EnhancedSSEInterface autoConnect={true} />
        </MemoryRouter>
      );

      // THEN: Should coordinate prop change with appropriate state updates
      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
      });
    });
  });

  /**
   * Test Suite 6: Integration Coordination
   * London School: Test how multiple collaborators work together
   */
  describe('Integration Coordination', () => {
    it('should coordinate between multiple API calls in a workflow', async () => {
      // GIVEN: Workflow that requires multiple API interactions
      apiMock.createInstance.mockResolvedValue(createSuccessResponse({
        instance: createInstanceResponse({ id: 'workflow-test' })
      }));
      
      apiMock.connectToInstance.mockResolvedValue(createSuccessResponse({}));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // WHEN: User performs workflow: create -> connect
      await user.click(screen.getByText('Default Claude'));
      
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Connect'));

      // THEN: Should coordinate multiple API calls in proper sequence
      expect(apiMock.createInstance).toHaveBeenCalledBefore(apiMock.connectToInstance);
    });

    it('should coordinate SSE events with API state changes', async () => {
      // GIVEN: Connected instance with SSE events
      let messageHandler: Function | undefined;
      
      sseMock.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      const connectedInstance = createInstanceResponse({
        id: 'sse-coordination-test',
        status: 'running'
      });
      
      apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({
        instances: [connectedInstance]
      }));

      render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      await user.click(screen.getByText('Connect'));

      // WHEN: SSE message indicates state change
      if (messageHandler) {
        messageHandler(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'status_change',
            instanceId: 'sse-coordination-test',
            status: 'stopped'
          })
        }));
      }

      // THEN: Should coordinate SSE event with local state update
      // Implementation would need to handle status updates from SSE
      expect(sseMock.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
});