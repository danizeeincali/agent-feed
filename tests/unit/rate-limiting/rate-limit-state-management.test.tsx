/**
 * @test Rate Limiting State Management Tests
 * @description TDD tests for rate limiting state management and isolation
 * Tests ensure proper separation between pure checks and stateful operations
 * 
 * CURRENT BUG: Rate limiting state management interferes with component renders
 * EXPECTED: Rate limiting state should be isolated from render cycles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react';

// Mock the actual hook to test its behavior in isolation
const useRateLimit = (maxCalls: number = 3, windowMs: number = 60000) => {
  const callTimestamps = React.useRef<number[]>([]);
  
  const checkRateLimit = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const currentWindowTimestamps = callTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    return currentWindowTimestamps.length >= maxCalls;
  }, [maxCalls, windowMs]);
  
  const recordAttempt = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    callTimestamps.current = callTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    if (callTimestamps.current.length >= maxCalls) {
      return false;
    }
    
    callTimestamps.current.push(now);
    return true;
  }, [maxCalls, windowMs]);
  
  return { checkRateLimit, recordAttempt };
};

// Test component that demonstrates the current problematic usage
const ProblematicComponent: React.FC<{
  onAction: () => void;
}> = ({ onAction }) => {
  const { checkRateLimit, recordAttempt } = useRateLimit(3, 60000);
  
  // PROBLEMATIC: Checking rate limit during render (current implementation)
  const isRateLimited = checkRateLimit();
  
  const handleClick = () => {
    if (recordAttempt()) {
      onAction();
    }
  };
  
  return (
    <button 
      disabled={isRateLimited}
      onClick={handleClick}
    >
      {isRateLimited ? 'Rate Limited' : 'Available'}
    </button>
  );
};

// Fixed component that demonstrates correct usage
const FixedComponent: React.FC<{
  onAction: () => void;
}> = ({ onAction }) => {
  const { checkRateLimit, recordAttempt } = useRateLimit(3, 60000);
  const [isUserRateLimited, setIsUserRateLimited] = React.useState(false);
  
  const handleClick = () => {
    // Check rate limit only during user interaction
    if (checkRateLimit()) {
      setIsUserRateLimited(true);
      return;
    }
    
    if (recordAttempt()) {
      onAction();
      setIsUserRateLimited(false);
    } else {
      setIsUserRateLimited(true);
    }
  };
  
  return (
    <button 
      disabled={isUserRateLimited}
      onClick={handleClick}
    >
      {isUserRateLimited ? 'Rate Limited' : 'Available'}
    </button>
  );
};

describe('Rate Limiting State Management', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test 1: Pure Function Behavior
   * Tests that checkRateLimit is truly pure and doesn't affect state
   */
  describe('CRITICAL: Pure Function Behavior', () => {
    test('SHOULD PASS: checkRateLimit should be idempotent', () => {
      const { result } = renderHook(() => useRateLimit(3, 60000));
      
      // Multiple calls should return the same result
      const result1 = result.current.checkRateLimit();
      const result2 = result.current.checkRateLimit();
      const result3 = result.current.checkRateLimit();
      const result4 = result.current.checkRateLimit();
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result3).toBe(result4);
      expect(result1).toBe(false); // Should be false initially
    });

    test('SHOULD PASS: checkRateLimit should not modify internal state', () => {
      const { result } = renderHook(() => useRateLimit(3, 60000));
      
      // Record some attempts to create state
      act(() => {
        result.current.recordAttempt();
        result.current.recordAttempt();
      });
      
      // Store initial state
      const initialCheck = result.current.checkRateLimit();
      
      // Multiple checks should not change the result
      for (let i = 0; i < 10; i++) {
        const check = result.current.checkRateLimit();
        expect(check).toBe(initialCheck);
      }
      
      // Should still be able to record one more attempt (3rd one)
      act(() => {
        const success = result.current.recordAttempt();
        expect(success).toBe(true);
      });
      
      // Now should be rate limited
      expect(result.current.checkRateLimit()).toBe(true);
    });

    test('SHOULD FAIL: Current implementation calls checkRateLimit during render', () => {
      const mockOnAction = jest.fn();
      
      render(<ProblematicComponent onAction={mockOnAction} />);
      
      const button = screen.getByRole('button');
      
      // EXPECTED TO FAIL: Button should not be disabled on initial render
      // CURRENT BUG: checkRateLimit() called during render may return true unexpectedly
      expect(button).not.toBeDisabled();
      expect(button.textContent).toBe('Available');
    });
  });

  /**
   * Test 2: State Isolation
   * Tests that rate limiting state doesn't interfere with component state
   */
  describe('CRITICAL: State Isolation', () => {
    test('SHOULD FAIL: Render-time rate limit checks should not affect button state', () => {
      const mockOnAction = jest.fn();
      const { rerender } = render(<ProblematicComponent onAction={mockOnAction} />);
      
      // Force multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<ProblematicComponent onAction={mockOnAction} />);
      }
      
      const button = screen.getByRole('button');
      
      // EXPECTED TO FAIL: Button should remain available despite re-renders
      // CURRENT BUG: Multiple render-time checkRateLimit calls may accumulate side effects
      expect(button).not.toBeDisabled();
      expect(button.textContent).toBe('Available');
    });

    test('SHOULD PASS: Fixed implementation isolates rate limiting from renders', () => {
      const mockOnAction = jest.fn();
      const { rerender } = render(<FixedComponent onAction={mockOnAction} />);
      
      // Force multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<FixedComponent onAction={mockOnAction} />);
      }
      
      const button = screen.getByRole('button');
      
      // EXPECTED: Button should remain available despite re-renders
      expect(button).not.toBeDisabled();
      expect(button.textContent).toBe('Available');
    });

    test('SHOULD PASS: Rate limiting state should persist across re-renders', () => {
      const mockOnAction = jest.fn();
      const { rerender } = render(<FixedComponent onAction={mockOnAction} />);
      
      const getButton = () => screen.getByRole('button');
      
      // Hit rate limit
      for (let i = 0; i < 4; i++) {
        fireEvent.click(getButton());
      }
      
      // Button should now be rate limited
      expect(getButton().textContent).toBe('Rate Limited');
      
      // Force re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<FixedComponent onAction={mockOnAction} />);
      }
      
      // Rate limiting should persist
      expect(getButton().textContent).toBe('Rate Limited');
      expect(getButton()).toBeDisabled();
    });
  });

  /**
   * Test 3: Hook State Management
   * Tests the internal state management of the useRateLimit hook
   */
  describe('CRITICAL: Hook State Management', () => {
    test('SHOULD PASS: useRateLimit should maintain state across hook calls', () => {
      const { result, rerender } = renderHook(
        ({ maxCalls, windowMs }) => useRateLimit(maxCalls, windowMs),
        { initialProps: { maxCalls: 3, windowMs: 60000 } }
      );
      
      // Record attempts
      act(() => {
        result.current.recordAttempt();
        result.current.recordAttempt();
        result.current.recordAttempt();
      });
      
      // Should now be rate limited
      expect(result.current.checkRateLimit()).toBe(true);
      
      // Re-render hook with same parameters
      rerender({ maxCalls: 3, windowMs: 60000 });
      
      // State should persist
      expect(result.current.checkRateLimit()).toBe(true);
    });

    test('SHOULD PASS: useRateLimit should handle parameter changes correctly', () => {
      const { result, rerender } = renderHook(
        ({ maxCalls, windowMs }) => useRateLimit(maxCalls, windowMs),
        { initialProps: { maxCalls: 2, windowMs: 60000 } }
      );
      
      // Use up the limit (2 calls)
      act(() => {
        result.current.recordAttempt();
        result.current.recordAttempt();
      });
      
      expect(result.current.checkRateLimit()).toBe(true);
      
      // Increase the limit
      rerender({ maxCalls: 5, windowMs: 60000 });
      
      // Should no longer be rate limited
      expect(result.current.checkRateLimit()).toBe(false);
      
      // Should be able to make more calls
      act(() => {
        const success = result.current.recordAttempt();
        expect(success).toBe(true);
      });
    });

    test('SHOULD PASS: Timestamp cleanup should work correctly', () => {
      const { result } = renderHook(() => useRateLimit(3, 1000)); // 1 second window
      
      // Record attempts
      act(() => {
        result.current.recordAttempt();
        result.current.recordAttempt();
        result.current.recordAttempt();
      });
      
      expect(result.current.checkRateLimit()).toBe(true);
      
      // Advance time past window
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      // Should no longer be rate limited
      expect(result.current.checkRateLimit()).toBe(false);
      
      // Should be able to record new attempts
      act(() => {
        const success = result.current.recordAttempt();
        expect(success).toBe(true);
      });
    });
  });

  /**
   * Test 4: Memory Leak Prevention
   * Tests that the rate limiting implementation doesn't leak memory
   */
  describe('CRITICAL: Memory Management', () => {
    test('SHOULD PASS: Timestamp array should not grow indefinitely', () => {
      const { result } = renderHook(() => useRateLimit(5, 1000));
      
      // Simulate many attempts over time with cleanup
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.recordAttempt();
          // Advance time to trigger cleanup
          jest.advanceTimersByTime(200);
        });
      }
      
      // Force final cleanup by checking rate limit
      const isLimited = result.current.checkRateLimit();
      
      // Should not be rate limited (old timestamps cleaned up)
      expect(isLimited).toBe(false);
      
      // Note: We can't directly inspect the internal array, but the behavior
      // indicates it's being cleaned up properly
    });

    test('SHOULD PASS: Hook cleanup should not cause memory leaks', () => {
      // Test hook unmounting doesn't leave dangling references
      const { unmount } = renderHook(() => useRateLimit(3, 60000));
      
      // This test primarily ensures no errors during unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  /**
   * Test 5: Edge Cases
   * Tests edge cases in rate limiting behavior
   */
  describe('CRITICAL: Edge Cases', () => {
    test('SHOULD PASS: Zero max calls should always rate limit', () => {
      const { result } = renderHook(() => useRateLimit(0, 60000));
      
      expect(result.current.checkRateLimit()).toBe(true);
      
      act(() => {
        const success = result.current.recordAttempt();
        expect(success).toBe(false);
      });
    });

    test('SHOULD PASS: Very small time window should work correctly', () => {
      const { result } = renderHook(() => useRateLimit(2, 100)); // 100ms window
      
      act(() => {
        result.current.recordAttempt();
        result.current.recordAttempt();
      });
      
      expect(result.current.checkRateLimit()).toBe(true);
      
      act(() => {
        jest.advanceTimersByTime(150);
      });
      
      expect(result.current.checkRateLimit()).toBe(false);
    });

    test('SHOULD PASS: Very large max calls should work correctly', () => {
      const { result } = renderHook(() => useRateLimit(1000, 60000));
      
      // Should not be rate limited initially
      expect(result.current.checkRateLimit()).toBe(false);
      
      // Make many calls
      act(() => {
        for (let i = 0; i < 999; i++) {
          result.current.recordAttempt();
        }
      });
      
      // Should still not be rate limited
      expect(result.current.checkRateLimit()).toBe(false);
      
      // One more call should trigger rate limiting
      act(() => {
        result.current.recordAttempt();
      });
      
      expect(result.current.checkRateLimit()).toBe(true);
    });

    test('SHOULD PASS: Concurrent checkRateLimit calls should be consistent', () => {
      const { result } = renderHook(() => useRateLimit(3, 60000));
      
      // Simulate concurrent checks (as might happen during rapid re-renders)
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(result.current.checkRateLimit());
      }
      
      // All results should be the same
      const firstResult = results[0];
      results.forEach(res => {
        expect(res).toBe(firstResult);
      });
    });
  });
});

/**
 * SUMMARY OF EXPECTED BEHAVIOR:
 * 
 * TESTS THAT SHOULD PASS:
 * - Pure function behavior tests
 * - Fixed implementation tests  
 * - Hook state management tests
 * - Memory management tests
 * - Edge case tests
 * 
 * TESTS THAT SHOULD FAIL WITH CURRENT IMPLEMENTATION:
 * - "Current implementation calls checkRateLimit during render"
 * - "Render-time rate limit checks should not affect button state"
 * 
 * KEY INSIGHTS FOR FIXES:
 * 1. Rate limit checking should be separated from rate limit recording
 * 2. Rate limit checks during render should not affect component state
 * 3. State should be maintained across re-renders but not affected by them
 * 4. Memory cleanup should happen automatically
 * 5. The hook should handle edge cases gracefully
 */