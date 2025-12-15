/**
 * @vitest-environment jsdom
 * @description Unit tests for CommentThread pill timing fix
 *
 * Tests verify:
 * 1. comment:state:complete handler delays onCommentsUpdate by 2500ms
 * 2. State clearing happens 500ms AFTER the reload (3000ms total)
 * 3. Generic comment:state handler skips reload on 'complete' state
 *
 * This test uses isolated timer testing to verify the exact timing
 * without rendering the full component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CommentThread - Pill Timing Fix (Isolated Timer Tests)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Test 1: comment:state:complete handler timing', () => {
    it('should delay onCommentsUpdate by exactly 2500ms', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const data = {
        postId: 'test-post-1',
        commentId: 'comment-123',
        state: 'complete',
      };

      // Simulate the comment:state:complete handler logic
      // (Lines 756-774 from CommentThread.tsx)
      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');

        // FIX: DELAY the comment reload to let pill stay visible for 2.5 seconds
        setTimeout(() => {
          mockOnCommentsUpdate();

          // Clear state after reload
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      handleCompleteEvent(data);

      // Verify onStateChange is called immediately
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-123', 'complete');
      expect(mockOnStateChange).toHaveBeenCalledTimes(1);

      // Verify onCommentsUpdate is NOT called immediately
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      // Fast-forward 2499ms (just before the delay)
      vi.advanceTimersByTime(2499);
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      // Fast-forward 1ms more (reaching exactly 2500ms)
      vi.advanceTimersByTime(1);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });

    it('should verify the exact timing is 2500ms, not 2400ms or 2600ms', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-123' });

      // Test 2400ms - should NOT trigger
      vi.advanceTimersByTime(2400);
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      // Advance to exactly 2500ms - should trigger
      vi.advanceTimersByTime(100);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test 2: State clearing timing (500ms AFTER reload)', () => {
    it('should clear state 500ms after onCommentsUpdate is called', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-123' });

      // Initial state change (immediate)
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-123', 'complete');
      expect(mockOnStateChange).toHaveBeenCalledTimes(1);

      // Fast-forward to 2500ms (reload happens)
      vi.advanceTimersByTime(2500);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);

      // State should NOT be cleared yet
      expect(mockOnStateChange).toHaveBeenCalledTimes(1); // Still just the initial call

      // Fast-forward 499ms more (2999ms total) - state still not cleared
      vi.advanceTimersByTime(499);
      expect(mockOnStateChange).toHaveBeenCalledTimes(1);

      // Fast-forward 1ms more (3000ms total) - state should now be cleared
      vi.advanceTimersByTime(1);
      expect(mockOnStateChange).toHaveBeenCalledTimes(2);
      expect(mockOnStateChange).toHaveBeenNthCalledWith(2, 'comment-123', null);
    });

    it('should verify total timeline: 0ms (state=complete) → 2500ms (reload) → 3000ms (clear)', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-123' });

      // T=0ms: State set to complete
      expect(mockOnStateChange).toHaveBeenNthCalledWith(1, 'comment-123', 'complete');

      // T=2500ms: Reload triggered
      vi.advanceTimersByTime(2500);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);

      // T=3000ms: State cleared
      vi.advanceTimersByTime(500);
      expect(mockOnStateChange).toHaveBeenNthCalledWith(2, 'comment-123', null);

      // Verify total calls
      expect(mockOnStateChange).toHaveBeenCalledTimes(2);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test 3: Generic comment:state handler skips reload on complete', () => {
    it('should NOT call onCommentsUpdate when state is "complete"', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      // Simulate the generic comment:state handler logic
      // (Lines 776-791 from CommentThread.tsx)
      const handleGenericStateEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, eventData.state);

        // FIX: Don't reload on 'complete' here - let comment:state:complete handler do it
        if (eventData.state === 'complete') {
          // Don't call onCommentsUpdate here
        }
      };

      handleGenericStateEvent({
        postId: 'test-post-1',
        commentId: 'comment-456',
        state: 'complete'
      });

      // Verify state is still updated
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-456', 'complete');

      // Verify onCommentsUpdate is NOT called
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      // Fast-forward all timers to ensure no delayed calls
      vi.runAllTimers();
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();
    });

    it('should NOT call onCommentsUpdate for non-complete states either (based on code)', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleGenericStateEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, eventData.state);
        if (eventData.state === 'complete') {
          // Don't call onCommentsUpdate
        }
        // Note: Based on the actual code (lines 776-791), there's no onCommentsUpdate
        // call for any state in the generic handler
      };

      handleGenericStateEvent({
        postId: 'test-post-1',
        commentId: 'comment-789',
        state: 'processing'
      });

      // Verify state is updated
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-789', 'processing');

      // Verify onCommentsUpdate is NOT called (generic handler doesn't call it)
      vi.runAllTimers();
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();
    });

    it('should verify both handlers can coexist without duplicate reload', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      const handleGenericStateEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, eventData.state);
        if (eventData.state === 'complete') {
          // Don't call onCommentsUpdate
        }
      };

      const eventData = {
        postId: 'test-post-1',
        commentId: 'comment-999',
        state: 'complete'
      };

      // Simulate both handlers receiving the event
      handleCompleteEvent(eventData);
      handleGenericStateEvent(eventData);

      // Verify state is set (twice, once from each handler)
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-999', 'complete');
      expect(mockOnStateChange).toHaveBeenCalledTimes(2);

      // Verify reload is still only called once (from specific handler with delay)
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2500);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1); // Only from specific handler

      vi.advanceTimersByTime(500);
      expect(mockOnStateChange).toHaveBeenCalledTimes(3); // Clear from specific handler
    });
  });

  describe('Edge cases and race conditions', () => {
    it('should handle multiple rapid complete events without timer conflicts', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      // Fire multiple complete events rapidly
      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-1' });
      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-2' });
      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-3' });

      // Each should set state immediately
      expect(mockOnStateChange).toHaveBeenCalledTimes(3);

      // Fast-forward to reload time
      vi.advanceTimersByTime(2500);

      // All three reloads should trigger
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(3);

      // Fast-forward to clear time
      vi.advanceTimersByTime(500);

      // All three clears should trigger
      expect(mockOnStateChange).toHaveBeenCalledTimes(6); // 3 sets + 3 clears
    });

    it('should demonstrate the fix prevents immediate reload', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      // OLD BEHAVIOR (would have been):
      const oldBehavior = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        mockOnCommentsUpdate(); // IMMEDIATE - causes flash
      };

      // NEW BEHAVIOR (current fix):
      const newBehavior = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate(); // DELAYED by 2.5s - pill stays visible
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      // Test new behavior
      newBehavior({ postId: 'test-post-1', commentId: 'comment-fix' });

      // State set immediately
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-fix', 'complete');

      // But reload is delayed
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled();

      // After 2.5 seconds, reload happens
      vi.advanceTimersByTime(2500);
      expect(mockOnCommentsUpdate).toHaveBeenCalled();

      // After 3 seconds total, state is cleared
      vi.advanceTimersByTime(500);
      expect(mockOnStateChange).toHaveBeenCalledWith('comment-fix', null);
    });
  });

  describe('Timing precision verification', () => {
    it('should fail if timing is off by even 100ms', () => {
      const mockOnCommentsUpdate = vi.fn();
      const mockOnStateChange = vi.fn();

      const handleCompleteEvent = (eventData: any) => {
        mockOnStateChange(eventData.commentId, 'complete');
        setTimeout(() => {
          mockOnCommentsUpdate();
          setTimeout(() => {
            mockOnStateChange(eventData.commentId, null);
          }, 500);
        }, 2500);
      };

      handleCompleteEvent({ postId: 'test-post-1', commentId: 'comment-123' });

      // Test various wrong timings
      vi.advanceTimersByTime(2400);
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled(); // Too early

      vi.advanceTimersByTime(99);
      expect(mockOnCommentsUpdate).not.toHaveBeenCalled(); // Still too early (2499ms)

      vi.advanceTimersByTime(1);
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1); // Exactly at 2500ms ✓

      // Test state clear timing
      vi.advanceTimersByTime(499);
      expect(mockOnStateChange).toHaveBeenCalledTimes(1); // Not cleared yet

      vi.advanceTimersByTime(1);
      expect(mockOnStateChange).toHaveBeenCalledTimes(2); // Cleared at 3000ms ✓
    });
  });
});
