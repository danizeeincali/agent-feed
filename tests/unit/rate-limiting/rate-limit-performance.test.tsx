/**
 * @test Rate Limiting Performance Tests
 * @description TDD performance tests for rate limiting implementation
 * Tests ensure rate limiting doesn't cause performance issues or memory leaks
 * 
 * CURRENT PERFORMANCE ISSUES:
 * - Rate limit checks during every render cycle
 * - Potential memory leaks from timestamp arrays
 * - Unnecessary re-computations during component lifecycle
 * 
 * EXPECTED PERFORMANCE:
 * - Rate limiting should have minimal render-time impact  
 * - Memory usage should be bounded and cleaned up
 * - Performance should remain constant with usage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react';
import { performance } from 'perf_hooks';

// Mock performance API for older environments
const mockPerformance = {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

// Use native performance API or mock
const perf = typeof performance !== 'undefined' ? performance : mockPerformance as any;

// Mock the actual useRateLimit hook for isolated testing
const useRateLimit = (maxCalls: number = 3, windowMs: number = 60000) => {
  const callTimestamps = React.useRef<number[]>([]);
  
  const checkRateLimit = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // POTENTIAL PERFORMANCE ISSUE: This filter runs on every check
    const currentWindowTimestamps = callTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    return currentWindowTimestamps.length >= maxCalls;
  }, [maxCalls, windowMs]);
  
  const recordAttempt = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // PERFORMANCE CRITICAL: Array mutation and filtering
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

// Test component for performance benchmarking
const PerformanceTestComponent: React.FC<{
  onAction: () => void;
  callCheckDuringRender?: boolean;
}> = ({ onAction, callCheckDuringRender = false }) => {
  const { checkRateLimit, recordAttempt } = useRateLimit(3, 60000);
  const [renderCount, setRenderCount] = React.useState(0);
  
  // Track render performance
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  });
  
  // PROBLEMATIC: Calling rate limit check during render
  const isRateLimited = callCheckDuringRender ? checkRateLimit() : false;
  
  const handleClick = () => {
    if (!callCheckDuringRender && checkRateLimit()) {
      return;
    }
    
    if (recordAttempt()) {
      onAction();
    }
  };
  
  return (
    <div>
      <button 
        disabled={isRateLimited}
        onClick={handleClick}
        data-testid="perf-button"
      >
        Click Me (Renders: {renderCount})
      </button>
      <div data-testid="rate-limited-indicator">
        {isRateLimited ? 'Rate Limited' : 'Available'}
      </div>
    </div>
  );
};

describe('Rate Limiting Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test 1: Render Performance Impact
   * Tests that rate limiting doesn't slow down component renders
   */
  describe('CRITICAL: Render Performance', () => {
    test('SHOULD FAIL: Rate limit checks during render cause performance overhead', () => {
      const mockOnAction = jest.fn();
      
      // Measure render time WITHOUT rate limiting during render
      const startTimeWithout = perf.now();
      const { unmount: unmount1 } = render(
        <PerformanceTestComponent 
          onAction={mockOnAction}
          callCheckDuringRender={false}
        />
      );
      const renderTimeWithout = perf.now() - startTimeWithout;
      unmount1();
      
      // Measure render time WITH rate limiting during render (current problematic implementation)
      const startTimeWith = perf.now();
      const { unmount: unmount2 } = render(
        <PerformanceTestComponent 
          onAction={mockOnAction}
          callCheckDuringRender={true}
        />
      );
      const renderTimeWith = perf.now() - startTimeWith;
      unmount2();
      
      console.log('Render Performance Comparison:', {
        withoutRateLimitCheck: `${renderTimeWithout.toFixed(2)}ms`,
        withRateLimitCheck: `${renderTimeWith.toFixed(2)}ms`,
        performanceImpact: `${((renderTimeWith - renderTimeWithout) / renderTimeWithout * 100).toFixed(1)}%`
      });
      
      // EXPECTED TO FAIL: Rate limiting during render should add minimal overhead
      // CURRENT ISSUE: checkRateLimit() called during every render
      const performanceThreshold = 0.1; // 0.1ms threshold
      const performanceDifference = renderTimeWith - renderTimeWithout;
      
      expect(performanceDifference).toBeLessThan(performanceThreshold);
      
      // Log for debugging
      if (performanceDifference >= performanceThreshold) {
        console.warn(`🚨 Performance issue detected: Rate limiting adds ${performanceDifference.toFixed(2)}ms to render time`);
      }
    });

    test('SHOULD FAIL: Multiple renders with rate limiting should scale linearly', () => {
      const mockOnAction = jest.fn();
      const renderTimes: number[] = [];
      
      // Test render performance over multiple renders
      for (let i = 1; i <= 10; i++) {
        const startTime = perf.now();
        const { rerender, unmount } = render(
          <PerformanceTestComponent 
            onAction={mockOnAction}
            callCheckDuringRender={true}
          />
        );
        
        // Force multiple re-renders
        for (let j = 0; j < i; j++) {
          rerender(
            <PerformanceTestComponent 
              onAction={mockOnAction}
              callCheckDuringRender={true}
            />
          );
        }
        
        const endTime = perf.now();
        renderTimes.push(endTime - startTime);
        unmount();
      }
      
      // Check that performance scales reasonably
      const firstRender = renderTimes[0];
      const lastRender = renderTimes[renderTimes.length - 1];
      const scalingRatio = lastRender / firstRender;
      
      console.log('Render Scaling Performance:', {
        firstRender: `${firstRender.toFixed(2)}ms`,
        lastRender: `${lastRender.toFixed(2)}ms`,
        scalingRatio: `${scalingRatio.toFixed(2)}x`,
        allRenderTimes: renderTimes.map(t => `${t.toFixed(2)}ms`)
      });
      
      // EXPECTED: Scaling should be reasonable (not exponential)
      // CURRENT ISSUE: May scale poorly if rate limiting has O(n) complexity per render
      expect(scalingRatio).toBeLessThan(15); // Allow some scaling but not exponential
    });

    test('SHOULD PASS: Event-handler-only rate limiting has minimal render impact', () => {
      const mockOnAction = jest.fn();
      
      const { rerender } = render(
        <PerformanceTestComponent 
          onAction={mockOnAction}
          callCheckDuringRender={false}
        />
      );
      
      const startTime = perf.now();
      
      // Force many re-renders
      for (let i = 0; i < 100; i++) {
        rerender(
          <PerformanceTestComponent 
            onAction={mockOnAction}
            callCheckDuringRender={false}
          />
        );
      }
      
      const totalRenderTime = perf.now() - startTime;
      const averageRenderTime = totalRenderTime / 100;
      
      console.log('Event-handler-only Performance:', {
        totalRenderTime: `${totalRenderTime.toFixed(2)}ms`,
        averageRenderTime: `${averageRenderTime.toFixed(3)}ms`,
        rendersPerSecond: `${(1000 / averageRenderTime).toFixed(0)}`
      });
      
      // Should have excellent performance when not checking rate limits during render
      expect(averageRenderTime).toBeLessThan(1); // Less than 1ms per render
    });
  });

  /**
   * Test 2: Memory Management
   * Tests that rate limiting doesn't cause memory leaks
   */
  describe('CRITICAL: Memory Management', () => {
    test('SHOULD PASS: Timestamp array should not grow indefinitely', () => {
      const { result } = renderHook(() => useRateLimit(5, 1000));
      
      // Simulate heavy usage over time
      for (let i = 0; i < 1000; i++) {
        act(() => {
          result.current.recordAttempt();
          // Advance time to trigger cleanup
          jest.advanceTimersByTime(100);
        });
        
        // Every 100 iterations, check that we can still record attempts
        // (indicating array is being cleaned up)
        if (i % 100 === 0 && i > 0) {
          const canRecord = result.current.recordAttempt();
          expect(canRecord).toBe(true); // Should always be true due to time advancement
        }
      }
      
      // Final check should not be rate limited (indicating cleanup worked)
      expect(result.current.checkRateLimit()).toBe(false);
    });

    test('SHOULD PASS: Memory usage should be bounded', () => {
      const { result } = renderHook(() => useRateLimit(10, 10000));
      
      // Fill up to the limit
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.recordAttempt();
        }
      });
      
      // Should be at the limit
      expect(result.current.checkRateLimit()).toBe(true);
      
      // Try to record many more attempts (should be rejected)
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.recordAttempt(); // These should be rejected
        }
      });
      
      // Should still be at the limit, not growing
      expect(result.current.checkRateLimit()).toBe(true);
      
      // After time passes, should be able to record new attempts
      act(() => {
        jest.advanceTimersByTime(11000);
      });
      
      expect(result.current.checkRateLimit()).toBe(false);
      
      // Should be able to record up to the limit again
      act(() => {
        for (let i = 0; i < 10; i++) {
          const success = result.current.recordAttempt();
          expect(success).toBe(true);
        }
      });
    });

    test('SHOULD PASS: Hook cleanup should release memory', () => {
      // Test that hook unmounting doesn't leave references
      const { unmount } = renderHook(() => useRateLimit(3, 60000));
      
      // This test primarily ensures no errors during unmount
      // and that no cleanup warnings are logged
      expect(() => unmount()).not.toThrow();
      
      // No direct way to test memory cleanup in Jest, but we can ensure
      // no errors or warnings are generated during unmount
    });
  });

  /**
   * Test 3: Computational Complexity
   * Tests that rate limiting operations have reasonable time complexity
   */
  describe('CRITICAL: Computational Complexity', () => {
    test('SHOULD PASS: checkRateLimit should be O(n) where n is window size, not total calls', () => {
      const { result } = renderHook(() => useRateLimit(100, 5000));
      
      // Record many attempts over time to create a long history
      const attemptTimes: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        act(() => {
          const startTime = perf.now();
          result.current.recordAttempt();
          jest.advanceTimersByTime(200); // Spread out over time
          const endTime = perf.now();
          attemptTimes.push(endTime - startTime);
        });
      }
      
      // Now test checkRateLimit performance with long history
      const checkTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = perf.now();
        result.current.checkRateLimit();
        const endTime = perf.now();
        checkTimes.push(endTime - startTime);
      }
      
      const averageCheckTime = checkTimes.reduce((sum, time) => sum + time, 0) / checkTimes.length;
      
      console.log('Rate Limit Check Performance:', {
        totalAttempts: 50,
        averageCheckTime: `${averageCheckTime.toFixed(3)}ms`,
        checkTimes: checkTimes.map(t => `${t.toFixed(3)}ms`)
      });
      
      // Should be very fast even with long history
      expect(averageCheckTime).toBeLessThan(0.1); // Less than 0.1ms
    });

    test('SHOULD PASS: recordAttempt should be O(n) where n is current window size', () => {
      const { result } = renderHook(() => useRateLimit(1000, 5000));
      
      // Fill with attempts that will be cleaned up
      act(() => {
        for (let i = 0; i < 500; i++) {
          result.current.recordAttempt();
          jest.advanceTimersByTime(20); // 20ms each, total 10 seconds
        }
      });
      
      // Now measure recordAttempt performance
      const recordTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = perf.now();
        act(() => {
          result.current.recordAttempt();
        });
        const endTime = perf.now();
        recordTimes.push(endTime - startTime);
      }
      
      const averageRecordTime = recordTimes.reduce((sum, time) => sum + time, 0) / recordTimes.length;
      
      console.log('Rate Limit Record Performance:', {
        historySize: '500 attempts over 10s',
        averageRecordTime: `${averageRecordTime.toFixed(3)}ms`,
        recordTimes: recordTimes.map(t => `${t.toFixed(3)}ms`)
      });
      
      // Should be fast even with cleanup overhead
      expect(averageRecordTime).toBeLessThan(0.5); // Less than 0.5ms
    });

    test('SHOULD FAIL: Render-time checks should not have cumulative performance impact', () => {
      const mockOnAction = jest.fn();
      
      // Create component that checks rate limit during render (problematic)
      const TestComponentWithRenderCheck = () => {
        const { checkRateLimit } = useRateLimit(3, 60000);
        const [renderCount, setRenderCount] = React.useState(0);
        
        // PROBLEMATIC: Check rate limit during every render
        const isRateLimited = checkRateLimit();
        
        React.useEffect(() => {
          setRenderCount(prev => prev + 1);
        });
        
        return (
          <div>
            <button disabled={isRateLimited}>
              Renders: {renderCount}, Limited: {isRateLimited.toString()}
            </button>
          </div>
        );
      };
      
      const { rerender } = render(<TestComponentWithRenderCheck />);
      
      const renderTimes: number[] = [];
      
      // Measure performance over many re-renders
      for (let i = 0; i < 20; i++) {
        const startTime = perf.now();
        rerender(<TestComponentWithRenderCheck />);
        const endTime = perf.now();
        renderTimes.push(endTime - startTime);
      }
      
      // Check if render times are increasing (indicating cumulative performance impact)
      const firstFive = renderTimes.slice(0, 5);
      const lastFive = renderTimes.slice(-5);
      const firstAverage = firstFive.reduce((sum, time) => sum + time, 0) / firstFive.length;
      const lastAverage = lastFive.reduce((sum, time) => sum + time, 0) / lastFive.length;
      
      const performanceDegradation = (lastAverage - firstAverage) / firstAverage;
      
      console.log('Cumulative Render Performance:', {
        firstFiveAverage: `${firstAverage.toFixed(3)}ms`,
        lastFiveAverage: `${lastAverage.toFixed(3)}ms`,
        degradation: `${(performanceDegradation * 100).toFixed(1)}%`,
        allTimes: renderTimes.map(t => `${t.toFixed(3)}ms`)
      });
      
      // EXPECTED TO FAIL: Should not have significant performance degradation
      // CURRENT ISSUE: Render-time rate limiting may accumulate overhead
      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });

  /**
   * Test 4: Stress Testing
   * Tests rate limiting under heavy load conditions
   */
  describe('CRITICAL: Stress Testing', () => {
    test('SHOULD PASS: High frequency operations should remain performant', () => {
      const { result } = renderHook(() => useRateLimit(100, 10000));
      
      const startTime = perf.now();
      
      // Simulate high frequency usage
      act(() => {
        for (let i = 0; i < 1000; i++) {
          if (i % 10 === 0) {
            // Every 10th operation, advance time slightly
            jest.advanceTimersByTime(50);
          }
          result.current.recordAttempt();
          result.current.checkRateLimit();
        }
      });
      
      const endTime = perf.now();
      const totalTime = endTime - startTime;
      const averageOperationTime = totalTime / 2000; // 1000 record + 1000 check
      
      console.log('High Frequency Stress Test:', {
        totalOperations: 2000,
        totalTime: `${totalTime.toFixed(2)}ms`,
        averageOperationTime: `${averageOperationTime.toFixed(4)}ms`,
        operationsPerSecond: `${(2000000 / totalTime).toFixed(0)}`
      });
      
      // Should handle high frequency operations efficiently
      expect(averageOperationTime).toBeLessThan(0.01); // Less than 0.01ms per operation
      expect(totalTime).toBeLessThan(100); // Total should be under 100ms
    });

    test('SHOULD PASS: Large time windows should not cause performance issues', () => {
      // Test with a very large time window (24 hours)
      const { result } = renderHook(() => useRateLimit(1000, 24 * 60 * 60 * 1000));
      
      // Fill with many attempts over simulated time
      const recordTimes: number[] = [];
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          const startTime = perf.now();
          result.current.recordAttempt();
          const endTime = perf.now();
          recordTimes.push(endTime - startTime);
          
          // Advance time by 10 minutes each iteration
          jest.advanceTimersByTime(10 * 60 * 1000);
        }
      });
      
      // Test performance of operations with large time window
      const checkTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = perf.now();
        result.current.checkRateLimit();
        const endTime = perf.now();
        checkTimes.push(endTime - startTime);
      }
      
      const averageRecordTime = recordTimes.reduce((sum, time) => sum + time, 0) / recordTimes.length;
      const averageCheckTime = checkTimes.reduce((sum, time) => sum + time, 0) / checkTimes.length;
      
      console.log('Large Time Window Performance:', {
        timeWindow: '24 hours',
        attempts: 100,
        averageRecordTime: `${averageRecordTime.toFixed(4)}ms`,
        averageCheckTime: `${averageCheckTime.toFixed(4)}ms`
      });
      
      // Should remain performant even with large time windows
      expect(averageRecordTime).toBeLessThan(1); // Less than 1ms
      expect(averageCheckTime).toBeLessThan(1); // Less than 1ms
    });

    test('SHOULD PASS: Concurrent component instances should not interfere', () => {
      // Test multiple components using rate limiting simultaneously
      const mockOnAction1 = jest.fn();
      const mockOnAction2 = jest.fn();
      const mockOnAction3 = jest.fn();
      
      const startTime = perf.now();
      
      render(
        <div>
          <PerformanceTestComponent onAction={mockOnAction1} />
          <PerformanceTestComponent onAction={mockOnAction2} />
          <PerformanceTestComponent onAction={mockOnAction3} />
        </div>
      );
      
      const renderTime = perf.now() - startTime;
      
      // Find all buttons
      const buttons = screen.getAllByTestId('perf-button');
      expect(buttons).toHaveLength(3);
      
      // Test concurrent interactions
      const interactionStart = perf.now();
      
      buttons.forEach((button, index) => {
        for (let i = 0; i < 5; i++) {
          fireEvent.click(button);
        }
      });
      
      const interactionTime = perf.now() - interactionStart;
      
      console.log('Concurrent Components Performance:', {
        componentsCount: 3,
        renderTime: `${renderTime.toFixed(2)}ms`,
        interactionTime: `${interactionTime.toFixed(2)}ms`,
        totalClicks: 15,
        averageClickTime: `${(interactionTime / 15).toFixed(3)}ms`
      });
      
      // Should handle concurrent components efficiently
      expect(renderTime).toBeLessThan(10); // Render should be fast
      expect(interactionTime).toBeLessThan(50); // Interactions should be fast
      expect(interactionTime / 15).toBeLessThan(5); // Average per click should be reasonable
    });
  });
});

/**
 * SUMMARY OF PERFORMANCE EXPECTATIONS:
 * 
 * TESTS THAT SHOULD FAIL WITH CURRENT IMPLEMENTATION:
 * 1. "Rate limit checks during render cause performance overhead"
 *    - Current issue: checkRateLimit() called during every render
 *    - Impact: Unnecessary computation on each render cycle
 * 
 * 2. "Multiple renders with rate limiting should scale linearly" 
 *    - Current issue: O(n) computation per render for rate limit checking
 *    - Impact: Performance degrades with render frequency
 * 
 * 3. "Render-time checks should not have cumulative performance impact"
 *    - Current issue: Repeated render-time checks may accumulate overhead
 *    - Impact: App slows down over time with heavy component usage
 * 
 * TESTS THAT SHOULD PASS AFTER OPTIMIZATION:
 * - Event-handler-only performance tests
 * - Memory management tests  
 * - Computational complexity tests
 * - Stress testing scenarios
 * 
 * PERFORMANCE OPTIMIZATIONS NEEDED:
 * 1. Remove rate limit checking from render cycle
 * 2. Implement efficient timestamp cleanup
 * 3. Ensure O(1) or O(log n) complexity for common operations
 * 4. Add memory bounds to prevent unbounded growth
 * 5. Optimize for high-frequency usage patterns
 * 
 * PERFORMANCE TARGETS:
 * - Render impact: < 0.1ms additional overhead
 * - Memory: Bounded timestamp array with automatic cleanup
 * - Operation time: < 0.01ms for rate limit checks
 * - Scaling: Linear or better with usage frequency
 * - Concurrent usage: No performance interference between instances
 */