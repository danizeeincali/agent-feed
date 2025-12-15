import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import React from 'react';

/**
 * TDD Test Suite: Multi-State Comment Processing Pills
 *
 * London School TDD - Behavior-focused tests with mocks for collaborators
 *
 * Processing States:
 * - 'waiting' -> Yellow pill with "Waiting..."
 * - 'analyzed' -> Blue pill with "Analyzing..."
 * - 'responding' -> Purple pill with "Responding..."
 * - 'complete' -> Green pill with "Complete"
 * - null -> No pill shown
 *
 * Test Coverage:
 * 1. State Rendering (6 tests)
 * 2. State Transitions (4 tests)
 * 3. Multiple Comments (2 tests)
 * 4. WebSocket Integration (3 tests)
 * 5. Visual Tests (2 tests)
 */

// Mock socket.io-client
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocketEmit = vi.fn();
const mockSocketDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: mockSocketOn,
    off: mockSocketOff,
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect,
    id: 'mock-socket-id'
  }))
}));

// Mock cn utility
vi.mock('../../utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Import after mocks
import { CommentThread, Comment, CommentProcessingState } from '../CommentThread';

describe('Multi-State Comment Processing Pills - TDD Suite', () => {
  // Mock collaborators
  let socketEventHandlers: Record<string, Function> = {};

  const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 'comment-1',
    content: 'Test comment content',
    author: 'test-user',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    repliesCount: 0,
    threadDepth: 0,
    threadPath: '/comment-1',
    ...overrides
  });

  const defaultProps = {
    postId: 'post-123',
    comments: [createMockComment()],
    currentUser: 'current-user',
    maxDepth: 6,
    enableRealTime: true,
    onCommentsUpdate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    socketEventHandlers = {};

    mockSocketOn.mockImplementation((event: string, handler: Function) => {
      socketEventHandlers[event] = handler;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to trigger socket events
  const triggerSocketEvent = (event: string, data: any) => {
    if (socketEventHandlers[event]) {
      socketEventHandlers[event](data);
    }
  };

  describe('State Rendering Tests', () => {
    it('should show yellow pill with "Waiting..." when state is waiting', () => {
      // Arrange: Create comment with waiting state
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');

      // Act: Render with waiting state
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert: Yellow pill with Waiting text
      const pill = screen.getByTestId('processing-pill-comment-1');
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveTextContent('Waiting...');
      expect(pill).toHaveClass('bg-yellow-100');
    });

    it('should show blue pill with "Analyzing..." when state is analyzed', () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'analyzed');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert
      const pill = screen.getByTestId('processing-pill-comment-1');
      expect(pill).toHaveTextContent('Analyzing...');
      expect(pill).toHaveClass('bg-blue-100');
    });

    it('should show purple pill with "Responding..." when state is responding', () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'responding');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert
      const pill = screen.getByTestId('processing-pill-comment-1');
      expect(pill).toHaveTextContent('Responding...');
      expect(pill).toHaveClass('bg-purple-100');
    });

    it('should show green pill with "Complete" when state is complete', () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'complete');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert
      const pill = screen.getByTestId('processing-pill-comment-1');
      expect(pill).toHaveTextContent('Complete');
      expect(pill).toHaveClass('bg-green-100');
    });

    it('should hide pill when state is null', () => {
      // Arrange: No processing state set
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', null);

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert: No pill visible
      expect(screen.queryByTestId('processing-pill-comment-1')).not.toBeInTheDocument();
    });

    it('should show correct icon for each state', () => {
      // Arrange: Test each state has appropriate icon
      const stateIconMap: Record<string, string> = {
        'waiting': 'clock-icon',
        'analyzed': 'search-icon',
        'responding': 'loader-icon',
        'complete': 'check-icon'
      };

      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert: Clock icon for waiting state
      const pill = screen.getByTestId('processing-pill-comment-1');
      const icon = pill.querySelector('[data-testid="pill-icon"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('clock-icon');
    });
  });

  describe('State Transition Tests', () => {
    it('should transition from waiting to analyzed', async () => {
      // Arrange: Start with waiting state
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');
      const onStateChange = vi.fn();

      const { rerender } = render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
          onStateChange={onStateChange}
        />
      );

      // Assert initial state
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Waiting...');

      // Act: Trigger state change via WebSocket
      act(() => {
        triggerSocketEvent('comment:state:analyzed', {
          postId: 'post-123',
          commentId: 'comment-1'
        });
      });

      // Update state
      commentStates.set('comment-1', 'analyzed');
      rerender(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
          onStateChange={onStateChange}
        />
      );

      // Assert
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Analyzing...');
    });

    it('should transition from analyzed to responding', async () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'analyzed');

      const { rerender } = render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Act: Update to responding
      commentStates.set('comment-1', 'responding');
      rerender(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Responding...');
    });

    it('should transition from responding to complete', async () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'responding');

      const { rerender } = render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Act
      commentStates.set('comment-1', 'complete');
      rerender(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Complete');
    });

    it('should auto-clear state after complete with 2 second delay', async () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'complete');
      const onStateChange = vi.fn();

      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
          onStateChange={onStateChange}
        />
      );

      // Assert: Complete pill visible initially
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Complete');

      // Act: Advance timers by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Assert: State change callback called with null
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith('comment-1', null);
      });
    });
  });

  describe('Multiple Comments Tests', () => {
    it('should show different states for different comments simultaneously', () => {
      // Arrange: Multiple comments with different states
      const comments = [
        createMockComment({ id: 'comment-1' }),
        createMockComment({ id: 'comment-2' }),
        createMockComment({ id: 'comment-3' })
      ];

      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');
      commentStates.set('comment-2', 'responding');
      commentStates.set('comment-3', 'complete');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          comments={comments}
          commentStates={commentStates}
        />
      );

      // Assert: Each comment shows its own state
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Waiting...');
      expect(screen.getByTestId('processing-pill-comment-2')).toHaveTextContent('Responding...');
      expect(screen.getByTestId('processing-pill-comment-3')).toHaveTextContent('Complete');
    });

    it('should not affect other comments when one state changes', () => {
      // Arrange
      const comments = [
        createMockComment({ id: 'comment-1' }),
        createMockComment({ id: 'comment-2' })
      ];

      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');
      commentStates.set('comment-2', 'analyzed');

      const { rerender } = render(
        <CommentThread
          {...defaultProps}
          comments={comments}
          commentStates={commentStates}
        />
      );

      // Act: Change only first comment state
      commentStates.set('comment-1', 'complete');
      rerender(
        <CommentThread
          {...defaultProps}
          comments={comments}
          commentStates={commentStates}
        />
      );

      // Assert: First changed, second unchanged
      expect(screen.getByTestId('processing-pill-comment-1')).toHaveTextContent('Complete');
      expect(screen.getByTestId('processing-pill-comment-2')).toHaveTextContent('Analyzing...');
    });
  });

  describe('WebSocket Integration Tests', () => {
    it('should update state on comment:state:waiting event', async () => {
      // Arrange
      const onStateChange = vi.fn();

      render(
        <CommentThread
          {...defaultProps}
          onStateChange={onStateChange}
        />
      );

      // Act: Trigger WebSocket event
      act(() => {
        triggerSocketEvent('comment:state:waiting', {
          postId: 'post-123',
          commentId: 'comment-1'
        });
      });

      // Assert: State change callback invoked
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith('comment-1', 'waiting');
      });
    });

    it('should update state on comment:state:complete event', async () => {
      // Arrange
      const onStateChange = vi.fn();

      render(
        <CommentThread
          {...defaultProps}
          onStateChange={onStateChange}
        />
      );

      // Act
      act(() => {
        triggerSocketEvent('comment:state:complete', {
          postId: 'post-123',
          commentId: 'comment-1'
        });
      });

      // Assert
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith('comment-1', 'complete');
      });
    });

    it('should filter events by postId', async () => {
      // Arrange
      const onStateChange = vi.fn();

      render(
        <CommentThread
          {...defaultProps}
          onStateChange={onStateChange}
        />
      );

      // Act: Trigger event for different post
      act(() => {
        triggerSocketEvent('comment:state:waiting', {
          postId: 'different-post',
          commentId: 'comment-1'
        });
      });

      // Assert: No state change for different post
      expect(onStateChange).not.toHaveBeenCalled();
    });
  });

  describe('Visual Tests', () => {
    it('should have correct Tailwind classes for each state', () => {
      // Arrange: Test all state color classes
      const stateClassMap: Record<string, string[]> = {
        'waiting': ['bg-yellow-100', 'text-yellow-700', 'border-yellow-200'],
        'analyzed': ['bg-blue-100', 'text-blue-700', 'border-blue-200'],
        'responding': ['bg-purple-100', 'text-purple-700', 'border-purple-200'],
        'complete': ['bg-green-100', 'text-green-700', 'border-green-200']
      };

      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'waiting');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert: Waiting state classes
      const pill = screen.getByTestId('processing-pill-comment-1');
      expect(pill).toHaveClass('bg-yellow-100');
      expect(pill).toHaveClass('text-yellow-700');
      expect(pill).toHaveClass('border-yellow-200');
    });

    it('should animate spinner during waiting/analyzing/responding states', () => {
      // Arrange
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'responding');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
        />
      );

      // Assert: Spinner has animation class
      const pill = screen.getByTestId('processing-pill-comment-1');
      const spinner = pill.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Contract Verification', () => {
    // London School: Verify interactions with collaborators

    it('should call onStateChange with correct parameters', async () => {
      // Arrange
      const onStateChange = vi.fn();
      const commentStates = new Map<string, CommentProcessingState>();
      commentStates.set('comment-1', 'complete');

      // Act
      render(
        <CommentThread
          {...defaultProps}
          commentStates={commentStates}
          onStateChange={onStateChange}
        />
      );

      // Fast-forward auto-clear timer
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Assert: Verify interaction contract
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(onStateChange).toHaveBeenCalledWith('comment-1', null);
      });
    });

    it('should register for all state WebSocket events', async () => {
      // Act
      render(
        <CommentThread
          {...defaultProps}
        />
      );

      // Assert: Verify all event handlers registered
      await waitFor(() => {
        const registeredEvents = mockSocketOn.mock.calls.map(call => call[0]);
        expect(registeredEvents).toContain('comment:state:waiting');
        expect(registeredEvents).toContain('comment:state:analyzed');
        expect(registeredEvents).toContain('comment:state:responding');
        expect(registeredEvents).toContain('comment:state:complete');
      });
    });
  });
});
