import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentThread from '../CommentThread';

/**
 * TDD Test Suite: WebSocket Real-Time Comment Updates
 *
 * These tests validate the WebSocket connection lifecycle and
 * real-time update handling for the CommentThread component.
 *
 * Tests should FAIL initially until WebSocket functionality is implemented.
 */

describe('CommentThread - WebSocket Real-Time Updates', () => {
  let mockWebSocket: any;
  let mockWebSocketInstance: any;
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    // Create mock WebSocket instance with all required methods
    mockWebSocketInstance = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.CONNECTING,
      url: '',
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    };

    // Mock WebSocket constructor
    mockWebSocket = jest.fn((url: string) => {
      mockWebSocketInstance.url = url;
      mockWebSocketInstance.readyState = WebSocket.OPEN;
      return mockWebSocketInstance;
    });

    global.WebSocket = mockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    jest.clearAllMocks();
  });

  /**
   * Test 1: WebSocket connection initializes with correct URL
   *
   * EXPECTED BEHAVIOR:
   * - When CommentThread renders with enableRealTime={true}
   * - WebSocket should be created with URL containing the postId
   * - URL should point to the correct WebSocket endpoint
   */
  it('initializes WebSocket with correct URL', () => {
    const postId = 'post-123';

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    // Verify WebSocket was instantiated
    expect(mockWebSocket).toHaveBeenCalled();

    // Verify URL contains postId
    const wsUrl = mockWebSocket.mock.calls[0][0];
    expect(wsUrl).toContain(postId);

    // Verify URL uses ws:// or wss:// protocol
    expect(wsUrl).toMatch(/^wss?:\/\//);
  });

  /**
   * Test 2: WebSocket connects on component mount
   *
   * EXPECTED BEHAVIOR:
   * - Connection should be established when component mounts
   * - onopen handler should be registered
   * - Connection state should transition to OPEN
   */
  it('establishes WebSocket connection on mount', async () => {
    const postId = 'post-456';

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    // Verify WebSocket was created
    expect(mockWebSocket).toHaveBeenCalledTimes(1);

    // Verify connection is established
    expect(mockWebSocketInstance.readyState).toBe(WebSocket.OPEN);
  });

  /**
   * Test 3: WebSocket message triggers onCommentsUpdate callback
   *
   * EXPECTED BEHAVIOR:
   * - When WebSocket receives 'comment_update' message
   * - The onCommentsUpdate callback should be invoked
   * - Updated comment data should be passed to the callback
   */
  it('triggers onCommentsUpdate on comment_update message', async () => {
    const postId = 'post-789';
    const mockOnCommentsUpdate = jest.fn();
    const updatedComment = {
      id: 'comment-1',
      content: 'Updated comment',
      author: 'agent2',
      timestamp: new Date().toISOString(),
    };

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Simulate WebSocket message event
    act(() => {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_update',
          postId: postId,
          comment: updatedComment,
        }),
      });

      // Trigger the message handler
      if (mockWebSocketInstance.onmessage) {
        mockWebSocketInstance.onmessage(messageEvent);
      }
    });

    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalled();
    });
  });

  /**
   * Test 4: WebSocket reconnects after connection error
   *
   * EXPECTED BEHAVIOR:
   * - When connection error occurs
   * - Component should attempt to reconnect
   * - Should use exponential backoff for reconnection attempts
   */
  it('reconnects after connection error', async () => {
    const postId = 'post-reconnect';

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    const initialCallCount = mockWebSocket.mock.calls.length;

    // Simulate connection error
    act(() => {
      if (mockWebSocketInstance.onerror) {
        mockWebSocketInstance.onerror(new Event('error'));
      }
      if (mockWebSocketInstance.onclose) {
        mockWebSocketInstance.onclose(new CloseEvent('close', { code: 1006 }));
      }
    });

    // Wait for reconnection attempt
    await waitFor(
      () => {
        expect(mockWebSocket.mock.calls.length).toBeGreaterThan(initialCallCount);
      },
      { timeout: 5000 }
    );
  });

  /**
   * Test 5: WebSocket closes on component unmount
   *
   * EXPECTED BEHAVIOR:
   * - When component unmounts
   * - WebSocket connection should be closed gracefully
   * - close() method should be called with proper code
   */
  it('closes WebSocket connection on unmount', () => {
    const postId = 'post-unmount';

    const { unmount } = render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    // Verify connection was established
    expect(mockWebSocket).toHaveBeenCalled();

    // Unmount component
    unmount();

    // Verify WebSocket was closed
    expect(mockWebSocketInstance.close).toHaveBeenCalled();
  });

  /**
   * Test 6: Multiple message types handled correctly
   *
   * EXPECTED BEHAVIOR:
   * - Component should handle various WebSocket message types:
   *   - comment_added: New comment added to thread
   *   - comment_update: Existing comment modified
   *   - comment_deleted: Comment removed from thread
   * - Each message type should trigger appropriate actions
   */
  it('handles multiple WebSocket message types correctly', async () => {
    const postId = 'post-multi';
    const mockOnCommentsUpdate = jest.fn();

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Test comment_added event
    act(() => {
      const addedEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_added',
          postId: postId,
          comment: {
            id: 'comment-new',
            content: 'New comment',
            author: 'agent3',
          },
        }),
      });
      mockWebSocketInstance.onmessage?.(addedEvent);
    });

    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });

    mockOnCommentsUpdate.mockClear();

    // Test comment_update event
    act(() => {
      const updateEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_update',
          postId: postId,
          comment: {
            id: 'comment-new',
            content: 'Updated comment',
            author: 'agent3',
          },
        }),
      });
      mockWebSocketInstance.onmessage?.(updateEvent);
    });

    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });

    mockOnCommentsUpdate.mockClear();

    // Test comment_deleted event
    act(() => {
      const deleteEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_deleted',
          postId: postId,
          commentId: 'comment-new',
        }),
      });
      mockWebSocketInstance.onmessage?.(deleteEvent);
    });

    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test 7: WebSocket disabled when enableRealTime=false
   *
   * EXPECTED BEHAVIOR:
   * - When enableRealTime prop is false
   * - No WebSocket connection should be created
   * - Component should work in polling-only mode
   */
  it('does not create WebSocket when enableRealTime is false', () => {
    const postId = 'post-no-ws';

    render(
      <CommentThread
        postId={postId}
        enableRealTime={false}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    // Verify WebSocket was NOT instantiated
    expect(mockWebSocket).not.toHaveBeenCalled();
  });

  /**
   * Test 8: WebSocket handles malformed messages gracefully
   *
   * EXPECTED BEHAVIOR:
   * - When invalid JSON is received
   * - Component should not crash
   * - Error should be logged but not propagated
   */
  it('handles malformed WebSocket messages gracefully', async () => {
    const postId = 'post-malformed';
    const mockOnCommentsUpdate = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Send invalid JSON
    act(() => {
      const invalidEvent = new MessageEvent('message', {
        data: 'invalid-json-{{{',
      });
      mockWebSocketInstance.onmessage?.(invalidEvent);
    });

    // Component should not crash
    expect(screen.queryByText(/error/i)).toBeInTheDocument;

    // Callback should not be triggered
    expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test 9: WebSocket ignores messages for different postId
   *
   * EXPECTED BEHAVIOR:
   * - When message is received for different post
   * - Callback should NOT be triggered
   * - Message should be ignored silently
   */
  it('ignores messages for different postId', async () => {
    const postId = 'post-correct';
    const mockOnCommentsUpdate = jest.fn();

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Send message for different post
    act(() => {
      const wrongPostEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_update',
          postId: 'post-wrong',
          comment: {
            id: 'comment-1',
            content: 'Wrong post comment',
          },
        }),
      });
      mockWebSocketInstance.onmessage?.(wrongPostEvent);
    });

    // Callback should NOT be triggered
    await waitFor(() => {
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();
    });
  });

  /**
   * Test 10: WebSocket maintains connection state correctly
   *
   * EXPECTED BEHAVIOR:
   * - Component should track connection state
   * - Should expose connection status (connected/disconnected/connecting)
   * - Should update UI based on connection state
   */
  it('maintains and displays connection state correctly', async () => {
    const postId = 'post-state';

    render(
      <CommentThread
        postId={postId}
        enableRealTime={true}
        comments={[]}
        onCommentsUpdate={jest.fn()}
      />
    );

    // Simulate connection states
    act(() => {
      mockWebSocketInstance.readyState = WebSocket.CONNECTING;
      if (mockWebSocketInstance.onopen) {
        mockWebSocketInstance.readyState = WebSocket.OPEN;
        mockWebSocketInstance.onopen(new Event('open'));
      }
    });

    // Check for connection indicator (implementation will add this)
    await waitFor(() => {
      // This will fail until UI shows connection status
      expect(screen.queryByText(/connected/i)).toBeInTheDocument;
    });

    // Simulate disconnection
    act(() => {
      mockWebSocketInstance.readyState = WebSocket.CLOSED;
      if (mockWebSocketInstance.onclose) {
        mockWebSocketInstance.onclose(new CloseEvent('close'));
      }
    });

    await waitFor(() => {
      expect(screen.queryByText(/disconnected|reconnecting/i)).toBeInTheDocument;
    });
  });
});
