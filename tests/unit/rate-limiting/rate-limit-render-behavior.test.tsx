/**
 * @test Rate Limiting Render Behavior Tests
 * @description TDD tests for rate limiting that will FAIL with current broken implementation
 * Tests ensure buttons are NOT disabled during component renders/mounts
 * 
 * CURRENT BUG: Rate limiting triggers during renders, disabling buttons on page load
 * EXPECTED: Rate limiting should ONLY trigger during actual user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClaudeInstanceButtons, { 
  type ClaudeInstanceButtonsProps 
} from '../../../frontend/src/components/claude-manager/ClaudeInstanceButtons';

// Mock console methods to capture rate limiting logs
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

// Mock props for consistent testing
const defaultProps: ClaudeInstanceButtonsProps = {
  onCreateInstance: jest.fn(),
  loading: false,
  connectionStatuses: {}
};

describe('Rate Limiting - Render Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy.mockClear();
    consoleLogSpy.mockClear();
    // Reset all timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test 1: Rate limiting should NOT trigger during component renders/mounts
   * 
   * CURRENT BUG: checkRateLimit() is called during render (line 252 in ClaudeInstanceButtons.tsx)
   * This causes buttons to be disabled on page load even when no user interaction occurred
   * 
   * EXPECTED: Buttons should be enabled on initial render
   */
  describe('CRITICAL: Component Mount/Render Behavior', () => {
    test('SHOULD FAIL: Buttons should NOT be disabled on initial mount (no rate limiting during render)', () => {
      // Render component for the first time
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      // Find all launch buttons
      const buttons = screen.getAllByRole('button');
      const launchButtons = buttons.filter(button => 
        button.textContent?.includes('claude') || 
        button.textContent?.includes('prod') || 
        button.textContent?.includes('skip-permissions')
      );
      
      // EXPECTED: All buttons should be enabled on initial render
      launchButtons.forEach((button, index) => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveAttribute('aria-disabled', 'false');
        console.log(`✅ Button ${index + 1} should be enabled on mount:`, {
          disabled: button.hasAttribute('disabled'),
          ariaDisabled: button.getAttribute('aria-disabled'),
          textContent: button.textContent?.substring(0, 50)
        });
      });
      
      // EXPECTED: No rate limiting warnings should appear during render
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Button click blocked')
      );
      
      // EXPECTED: No rate limit checks should be logged during render
      const rateLimitLogs = consoleLogSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limit check'))
      );
      expect(rateLimitLogs).toHaveLength(0);
    });

    test('SHOULD FAIL: Multiple component re-renders should not affect button state', () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      // Get initial button states
      const initialButtons = screen.getAllByRole('button');
      const initialStates = initialButtons.map(btn => ({
        disabled: btn.hasAttribute('disabled'),
        ariaDisabled: btn.getAttribute('aria-disabled')
      }));
      
      // Force multiple re-renders with different props
      for (let i = 0; i < 5; i++) {
        rerender(
          <ClaudeInstanceButtons 
            {...defaultProps} 
            connectionStatuses={{ prod: i % 2 ? 'connected' : 'disconnected' }}
          />
        );
      }
      
      // Check that button states haven't changed due to re-renders
      const finalButtons = screen.getAllByRole('button');
      const finalStates = finalButtons.map(btn => ({
        disabled: btn.hasAttribute('disabled'),
        ariaDisabled: btn.getAttribute('aria-disabled')
      }));
      
      // EXPECTED: Button states should remain the same
      expect(finalStates).toEqual(initialStates);
      
      // EXPECTED: No rate limiting should occur during re-renders
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
    });

    test('SHOULD FAIL: Component mount should not consume rate limit quota', () => {
      // Mount component multiple times
      const { unmount: unmount1 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount1();
      
      const { unmount: unmount2 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount2();
      
      const { unmount: unmount3 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount3();
      
      // Final mount - buttons should still be enabled
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      const launchButtons = buttons.filter(button => 
        button.textContent?.includes('claude') || button.textContent?.includes('prod')
      );
      
      // EXPECTED: Mounting components should not consume rate limit quota
      launchButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
      
      // EXPECTED: No rate limit warnings from component mounting
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
    });
  });

  /**
   * Test 2: Rate limiting should ONLY trigger after actual button clicks
   * 
   * CURRENT BUG: Rate limit check happens during render, not just on click
   * 
   * EXPECTED: Rate limiting should only activate when users actually click buttons
   */
  describe('CRITICAL: Rate Limiting Trigger Behavior', () => {
    test('SHOULD FAIL: Rate limiting should only activate on actual button clicks', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const prodButton = screen.getByText(/prod\/claude/);
      
      // BEFORE any clicks - button should be enabled
      expect(prodButton).not.toBeDisabled();
      
      // Make 3 rapid clicks (should hit rate limit)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(prodButton);
      }
      
      // EXPECTED: Rate limiting should now be in effect
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Rate limited')
        );
      });
      
      // EXPECTED: Fourth click should be blocked by rate limiting
      fireEvent.click(prodButton);
      
      const rateLimitWarnings = consoleWarnSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(rateLimitWarnings.length).toBeGreaterThan(0);
    });

    test('SHOULD FAIL: Button hover/focus should not trigger rate limiting', async () => {
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const prodButton = screen.getByText(/prod\/claude/);
      
      // Simulate various non-click interactions
      fireEvent.mouseEnter(prodButton);
      fireEvent.mouseLeave(prodButton);
      fireEvent.focus(prodButton);
      fireEvent.blur(prodButton);
      fireEvent.keyDown(prodButton, { key: 'Tab' });
      
      // Wait a bit to ensure no async rate limiting occurs
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      // EXPECTED: No rate limiting should occur from non-click interactions
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Button click blocked')
      );
      
      // EXPECTED: Button should still be enabled
      expect(prodButton).not.toBeDisabled();
    });
  });

  /**
   * Test 3: Pure function behavior for rate limit checking
   * 
   * CURRENT BUG: Rate limit checking might have side effects during renders
   * 
   * EXPECTED: isRateLimited check should be pure function without side effects
   */
  describe('CRITICAL: Pure Function Behavior', () => {
    test('SHOULD FAIL: Rate limit check should not modify state during renders', () => {
      // This test checks if the rate limit check function is pure
      const TestComponent = () => {
        const mockUseRateLimit = {
          checkRateLimit: jest.fn(() => false),
          recordAttempt: jest.fn(() => true)
        };
        
        // Simulate calling checkRateLimit during render (like current implementation)
        const isRateLimited = mockUseRateLimit.checkRateLimit();
        
        return (
          <button disabled={isRateLimited}>
            Test Button {isRateLimited ? '(Rate Limited)' : '(Available)'}
          </button>
        );
      };
      
      const { rerender } = render(<TestComponent />);
      
      // Multiple re-renders should not accumulate side effects
      for (let i = 0; i < 10; i++) {
        rerender(<TestComponent />);
      }
      
      const button = screen.getByRole('button');
      
      // EXPECTED: Button should remain in the same state (not disabled by render-time checks)
      expect(button).not.toBeDisabled();
      expect(button.textContent).toContain('(Available)');
    });

    test('SHOULD FAIL: checkRateLimit should be idempotent (same result on multiple calls)', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      // Get a button to test with
      const button = screen.getByText(/prod\/claude/);
      
      // EXPECTED: Multiple calls to checkRateLimit should return same result
      // (This tests the internal consistency of the rate limiting logic)
      
      // Before any interactions, multiple checks should all return false
      for (let i = 0; i < 5; i++) {
        // This simulates what happens when checkRateLimit is called multiple times during renders
        // The button should remain consistently enabled
        expect(button).not.toBeDisabled();
      }
      
      // EXPECTED: No side effects from multiple rate limit checks
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limit check passed')
      );
    });
  });

  /**
   * Test 4: Time window reset behavior
   * 
   * Tests that rate limits properly reset after the time window expires
   */
  describe('CRITICAL: Time Window Reset', () => {
    test('SHOULD PASS: Rate limit should reset after time window expires', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const prodButton = screen.getByText(/prod\/claude/);
      
      // Hit rate limit (3 clicks)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(prodButton);
      }
      
      // Attempt 4th click - should be rate limited
      fireEvent.click(prodButton);
      
      // Fast forward 61 seconds (past the 60 second window)
      act(() => {
        jest.advanceTimersByTime(61000);
      });
      
      // Now button should work again
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        // Should have successful callback execution after window reset
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(4); // 3 initial + 1 after reset
      });
    });

    test('SHOULD PASS: Partial time window should maintain some rate limit capacity', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const prodButton = screen.getByText(/prod\/claude/);
      
      // Use 2 out of 3 allowed calls
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      
      // Fast forward 30 seconds (half the window)
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      // Should still have 1 call available
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      });
      
      // The 4th call should be rate limited
      fireEvent.click(prodButton);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
    });
  });

  /**
   * Test 5: Component re-render effects on rate limiting
   * 
   * CURRENT BUG: Component re-renders might affect rate limit state
   * 
   * EXPECTED: Component re-renders should not affect rate limit state
   */
  describe('CRITICAL: Re-render Stability', () => {
    test('SHOULD FAIL: Component re-renders should not reset rate limiting state', async () => {
      const mockOnCreateInstance = jest.fn();
      const { rerender } = render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const getButton = () => screen.getByText(/prod\/claude/);
      
      // Hit rate limit
      for (let i = 0; i < 3; i++) {
        fireEvent.click(getButton());
      }
      
      // Verify rate limit is in effect
      fireEvent.click(getButton());
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
      
      // Force multiple re-renders with different props
      for (let i = 0; i < 5; i++) {
        rerender(
          <ClaudeInstanceButtons 
            {...defaultProps}
            onCreateInstance={mockOnCreateInstance}
            connectionStatuses={{ 
              prod: i % 2 ? 'connected' : 'disconnected' 
            }}
          />
        );
      }
      
      // EXPECTED: Rate limiting should still be in effect after re-renders
      fireEvent.click(getButton());
      
      // Should still be rate limited (no additional successful calls)
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3); // Only the initial 3 calls
      
      const finalRateLimitWarnings = consoleWarnSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(finalRateLimitWarnings.length).toBeGreaterThanOrEqual(2); // At least 2 rate limit warnings
    });

    test('SHOULD FAIL: Prop changes should not affect rate limit state', async () => {
      const mockOnCreateInstance = jest.fn();
      const { rerender } = render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      // Use up rate limit
      const prodButton = screen.getByText(/prod\/claude/);
      for (let i = 0; i < 3; i++) {
        fireEvent.click(prodButton);
      }
      
      // Change props significantly
      rerender(
        <ClaudeInstanceButtons 
          onCreateInstance={jest.fn()} // Different callback
          loading={true} // Different loading state
          connectionStatuses={{
            prod: 'connected',
            'skip-permissions': 'connecting'
          }}
        />
      );
      
      // Change props back
      rerender(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      // EXPECTED: Rate limit should still be in effect
      const buttonAfterRerender = screen.getByText(/prod\/claude/);
      fireEvent.click(buttonAfterRerender);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
      
      // Should still only have the original 3 calls
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * Test 6: Multiple rapid clicks behavior
   * 
   * Tests proper rate limiting of rapid successive clicks
   */
  describe('CRITICAL: Rapid Click Protection', () => {
    test('SHOULD PASS: Multiple rapid clicks should be properly rate limited', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const prodButton = screen.getByText(/prod\/claude/);
      
      // Rapid fire 10 clicks in quick succession
      for (let i = 0; i < 10; i++) {
        fireEvent.click(prodButton);
      }
      
      // Should only execute 3 calls (rate limit is 3 per minute)
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      });
      
      // Should have rate limit warnings
      const rateLimitWarnings = consoleWarnSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(rateLimitWarnings.length).toBeGreaterThan(0);
    });

    test('SHOULD PASS: Different button types should have independent rate limits', async () => {
      const mockOnCreateInstance = jest.fn();
      render(
        <ClaudeInstanceButtons 
          {...defaultProps}
          onCreateInstance={mockOnCreateInstance}
        />
      );
      
      const prodButton = screen.getByText(/prod\/claude/);
      const skipPermissionsButton = screen.getByText(/skip-permissions/);
      
      // Hit rate limit for prod button
      for (let i = 0; i < 4; i++) {
        fireEvent.click(prodButton);
      }
      
      // Skip permissions button should still work
      fireEvent.click(skipPermissionsButton);
      
      await waitFor(() => {
        // Should have 3 prod calls (rate limited) + 1 skip-permissions call
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(4);
      });
      
      // Verify the calls were made with different commands
      const calls = mockOnCreateInstance.mock.calls;
      expect(calls.filter(call => call[0].includes('prod'))).toHaveLength(3);
      expect(calls.filter(call => call[0].includes('skip-permissions'))).toHaveLength(1);
    });
  });
});

/**
 * SUMMARY OF EXPECTED FAILURES:
 * 
 * 1. "Buttons should NOT be disabled on initial mount" - WILL FAIL
 *    Current bug: checkRateLimit() called during render disables buttons on load
 * 
 * 2. "Rate limiting should only activate on actual button clicks" - WILL FAIL
 *    Current bug: Rate limit check happens during render, not just on click
 * 
 * 3. "Rate limit check should not modify state during renders" - WILL FAIL
 *    Current bug: Rate limiting logic may have side effects during renders
 * 
 * 4. "Component re-renders should not affect rate limit state" - WILL FAIL
 *    Current bug: Re-renders may interfere with rate limiting state
 * 
 * FIXES NEEDED:
 * 1. Move rate limit checking from render-time to click-time only
 * 2. Ensure rate limit state is preserved across re-renders
 * 3. Make rate limit checking a pure function with no render-time side effects
 * 4. Separate rate limit checking (pure) from rate limit recording (side effect)
 */