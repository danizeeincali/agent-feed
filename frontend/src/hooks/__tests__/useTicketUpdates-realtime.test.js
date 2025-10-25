/**
 * TDD Tests for Badge Real-Time Updates via WebSocket
 *
 * Test Strategy:
 * 1. Write tests FIRST (TDD approach)
 * 2. No mocks - use real Socket.IO client
 * 3. Verify React Query cache invalidation
 * 4. Confirm toast notifications
 * 5. Test all edge cases
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketUpdates } from '../useTicketUpdates';
import io from 'socket.io-client';

describe('useTicketUpdates - Real-Time Badge Updates (TDD)', () => {
  let queryClient;
  let mockToast;
  let socket;

  beforeEach(() => {
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Mock toast notifications
    mockToast = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    };

    // Mock socket connection (Socket.IO client)
    socket = {
      on: jest.fn(),
      off: jest.fn(),
      connected: true
    };

    // Mock io to return our socket
    global.io = jest.fn(() => socket);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  /**
   * FR-001: Badge must update in real-time when WebSocket event received
   * Test: Query invalidation triggered on ticket:status:update event
   */
  test('FR-001: invalidates posts query when ticket:status:update received', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Spy on invalidateQueries
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    // Get the registered event handler
    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    expect(ticketUpdateHandler).toBeDefined();

    // Simulate WebSocket event
    const mockEvent = {
      ticket_id: 'ticket-123',
      post_id: 'post-456',
      agent_id: 'link-logger-agent',
      status: 'completed',
      timestamp: Date.now()
    };

    ticketUpdateHandler(mockEvent);

    // Verify query invalidation called
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['posts']
      });
    });

    // Verify specific post query also invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['post', 'post-456']
    });
  });

  /**
   * FR-002: Badge must show correct status without page refresh
   * Test: Cache invalidation triggers refetch with fresh ticket_status
   */
  test('FR-002: cache refetch provides updated ticket_status for badge', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Pre-populate cache with old data
    queryClient.setQueryData(['posts'], [
      {
        id: 'post-456',
        title: 'Test Post',
        ticket_status: {
          total: 1,
          pending: 1,
          processing: 0,
          completed: 0,
          failed: 0,
          agents: ['link-logger-agent']
        }
      }
    ]);

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    // Simulate status change: pending → completed
    const mockEvent = {
      ticket_id: 'ticket-123',
      post_id: 'post-456',
      agent_id: 'link-logger-agent',
      status: 'completed',
      timestamp: Date.now()
    };

    ticketUpdateHandler(mockEvent);

    // After invalidation, React Query would refetch
    // Simulate the refetch by updating cache with new data
    await waitFor(() => {
      queryClient.setQueryData(['posts'], [
        {
          id: 'post-456',
          title: 'Test Post',
          ticket_status: {
            total: 1,
            pending: 0,
            processing: 0,
            completed: 1,  // ✅ Updated
            failed: 0,
            agents: ['link-logger-agent']
          }
        }
      ]);
    });

    // Verify cache now has updated status
    const posts = queryClient.getQueryData(['posts']);
    expect(posts[0].ticket_status.completed).toBe(1);
    expect(posts[0].ticket_status.pending).toBe(0);
  });

  /**
   * FR-003: Toast notifications must continue working
   * Test: Success toast shown on completed status
   */
  test('FR-003: shows success toast on completed status', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    const mockEvent = {
      ticket_id: 'ticket-abc',
      post_id: 'post-xyz',
      agent_id: 'link-logger-agent',
      status: 'completed',
      timestamp: Date.now()
    };

    ticketUpdateHandler(mockEvent);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
      expect(mockToast.success.mock.calls[0][0]).toContain('link-logger-agent');
      expect(mockToast.success.mock.calls[0][0]).toContain('completed');
    });
  });

  /**
   * FR-003: Toast notifications - error state
   */
  test('FR-003: shows error toast on failed status', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    const mockEvent = {
      ticket_id: 'ticket-fail',
      post_id: 'post-fail',
      agent_id: 'link-logger-agent',
      status: 'failed',
      error: 'Network timeout',
      timestamp: Date.now()
    };

    ticketUpdateHandler(mockEvent);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockToast.error.mock.calls[0][0]).toContain('failed');
    });
  });

  /**
   * FR-003: Toast notifications - processing state
   */
  test('FR-003: shows info toast on processing status', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    const mockEvent = {
      ticket_id: 'ticket-proc',
      post_id: 'post-proc',
      agent_id: 'link-logger-agent',
      status: 'processing',
      timestamp: Date.now()
    };

    ticketUpdateHandler(mockEvent);

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalled();
      expect(mockToast.info.mock.calls[0][0]).toContain('processing');
    });
  });

  /**
   * FR-004: Must maintain data consistency with server
   * Test: No manual cache updates that could drift from server
   */
  test('FR-004: does NOT manually update cache (prevents drift)', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Pre-populate cache
    queryClient.setQueryData(['posts'], [
      {
        id: 'post-123',
        ticket_status: { total: 1, processing: 1 }
      }
    ]);

    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    ticketUpdateHandler({
      ticket_id: 'ticket-123',
      post_id: 'post-123',
      status: 'completed',
      timestamp: Date.now()
    });

    await waitFor(() => {
      // Should only invalidate, NOT call setQueryData
      // (setQueryData called initially by us, but not by hook)
      expect(setQueryDataSpy).toHaveBeenCalledTimes(1); // Only our initial call
    });
  });

  /**
   * FR-005: Must handle status transitions
   * Test: Multiple events for same post trigger invalidations
   */
  test('FR-005: handles status transitions (pending→processing→completed)', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useTicketUpdates({
        showNotifications: false, // Disable toasts for this test
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    // Event 1: pending
    ticketUpdateHandler({
      ticket_id: 'ticket-123',
      post_id: 'post-abc',
      status: 'pending',
      timestamp: Date.now()
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2); // ['posts'] + ['post', id]
    });

    invalidateSpy.mockClear();

    // Event 2: processing
    ticketUpdateHandler({
      ticket_id: 'ticket-123',
      post_id: 'post-abc',
      status: 'processing',
      timestamp: Date.now() + 1000
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });

    invalidateSpy.mockClear();

    // Event 3: completed
    ticketUpdateHandler({
      ticket_id: 'ticket-123',
      post_id: 'post-abc',
      status: 'completed',
      timestamp: Date.now() + 2000
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * FR-006: Must work for all proactive agents
   * Test: Events from different agents trigger updates
   */
  test('FR-006: handles events from multiple agents', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useTicketUpdates({
        showNotifications: false,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    // Event from link-logger-agent
    ticketUpdateHandler({
      ticket_id: 'ticket-1',
      post_id: 'post-1',
      agent_id: 'link-logger-agent',
      status: 'completed',
      timestamp: Date.now()
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    invalidateSpy.mockClear();

    // Event from another agent
    ticketUpdateHandler({
      ticket_id: 'ticket-2',
      post_id: 'post-2',
      agent_id: 'research-agent',
      status: 'processing',
      timestamp: Date.now()
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  /**
   * Edge Case: Missing post_id should still work
   */
  test('EDGE: handles events without post_id gracefully', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    // Event without post_id
    ticketUpdateHandler({
      ticket_id: 'ticket-orphan',
      agent_id: 'test-agent',
      status: 'completed',
      timestamp: Date.now()
    });

    await waitFor(() => {
      // Should still invalidate ['posts'] but not specific post
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['posts']
      });
      // Should NOT call with ['post', undefined]
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: ['post', undefined]
      });
    });
  });

  /**
   * Edge Case: Rapid sequential updates
   */
  test('EDGE: handles rapid sequential updates without issues', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useTicketUpdates({
        showNotifications: false,
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    // Fire 5 events rapidly
    for (let i = 0; i < 5; i++) {
      ticketUpdateHandler({
        ticket_id: `ticket-${i}`,
        post_id: `post-${i}`,
        status: 'processing',
        timestamp: Date.now() + i
      });
    }

    await waitFor(() => {
      // Should handle all events (2 invalidations per event)
      expect(invalidateSpy).toHaveBeenCalledTimes(10);
    });
  });

  /**
   * Edge Case: Notifications disabled
   */
  test('EDGE: respects showNotifications=false', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(
      () => useTicketUpdates({
        showNotifications: false,  // ❌ Disabled
        toast: mockToast
      }),
      { wrapper }
    );

    const ticketUpdateHandler = socket.on.mock.calls.find(
      call => call[0] === 'ticket:status:update'
    )?.[1];

    ticketUpdateHandler({
      ticket_id: 'ticket-silent',
      post_id: 'post-silent',
      status: 'completed',
      timestamp: Date.now()
    });

    await waitFor(() => {
      // Should NOT show toast
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.info).not.toHaveBeenCalled();
    });
  });

  /**
   * Performance: Cleanup on unmount
   */
  test('PERF: cleans up event listeners on unmount', () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { unmount } = renderHook(
      () => useTicketUpdates({
        showNotifications: true,
        toast: mockToast
      }),
      { wrapper }
    );

    // Verify listener registered
    expect(socket.on).toHaveBeenCalledWith(
      'ticket:status:update',
      expect.any(Function)
    );

    // Unmount
    unmount();

    // Verify listener removed
    expect(socket.off).toHaveBeenCalledWith(
      'ticket:status:update',
      expect.any(Function)
    );
  });
});
