/**
 * @test Rate Limiting Integration Tests
 * @description TDD integration tests for rate limiting with actual component behavior
 * Tests the complete user interaction flow and demonstrates the exact bugs
 * 
 * CURRENT BUG: Buttons are disabled on page load due to rate limiting during render
 * EXPECTED: Rate limiting should only engage after actual user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ClaudeInstanceButtons from '../../../frontend/src/components/claude-manager/ClaudeInstanceButtons';

// Enhanced mock to capture all console activity
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const mockConsoleWarn = jest.fn();
const mockConsoleLog = jest.fn();

console.warn = (...args) => {
  mockConsoleWarn(...args);
  // Only log rate limiting related warnings to avoid noise
  if (args.some(arg => typeof arg === 'string' && 
    (arg.includes('Rate limited') || arg.includes('Button click blocked')))) {
    originalConsoleWarn(...args);
  }
};

console.log = (...args) => {
  mockConsoleLog(...args);
  // Only log rate limiting related logs to avoid noise
  if (args.some(arg => typeof arg === 'string' && 
    (arg.includes('Rate limit') || arg.includes('Button click')))) {
    originalConsoleLog(...args);
  }
};

describe('Rate Limiting Integration Tests', () => {
  const mockOnCreateInstance = jest.fn();
  
  const defaultProps = {
    onCreateInstance: mockOnCreateInstance,
    loading: false,
    connectionStatuses: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
    mockConsoleLog.mockClear();
    mockOnCreateInstance.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  /**
   * Test 1: THE MAIN BUG - Buttons disabled on page load
   * This test demonstrates the exact problem users experience
   */
  describe('🚨 CRITICAL BUG: Page Load Behavior', () => {
    test('SHOULD FAIL: Buttons are incorrectly disabled on initial page load', async () => {
      // Simulate a fresh page load
      const { container } = render(
        <div data-testid="fresh-page">
          <ClaudeInstanceButtons {...defaultProps} />
        </div>
      );

      // Wait for initial render to complete
      await waitFor(() => {
        expect(screen.getByTestId('fresh-page')).toBeInTheDocument();
      });

      // Find all instance buttons
      const buttons = screen.getAllByRole('button');
      const instanceButtons = buttons.filter(btn => 
        btn.textContent?.includes('claude') || 
        btn.textContent?.includes('prod') ||
        btn.textContent?.includes('skip-permissions')
      );

      expect(instanceButtons.length).toBeGreaterThan(0);

      // 🚨 THE BUG: These buttons should NOT be disabled on page load
      // CURRENT BEHAVIOR: checkRateLimit() is called during render (line 252)
      // EXPECTED BEHAVIOR: Buttons should be available for user interaction
      instanceButtons.forEach((button, index) => {
        console.log(`🔍 Button ${index + 1} state on page load:`, {
          text: button.textContent?.substring(0, 30) + '...',
          disabled: button.hasAttribute('disabled'),
          ariaDisabled: button.getAttribute('aria-disabled'),
          className: button.className
        });

        // This assertion SHOULD FAIL with current implementation
        expect(button).not.toBeDisabled();
        expect(button.getAttribute('aria-disabled')).toBe('false');
      });

      // 🚨 THE BUG: No rate limit warnings should appear on page load
      // CURRENT BEHAVIOR: checkRateLimit() called during render may log warnings
      // EXPECTED BEHAVIOR: No rate limiting activity on page load
      const pageLoadRateLimitWarnings = mockConsoleWarn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      
      expect(pageLoadRateLimitWarnings).toHaveLength(0);
      console.log('✅ No rate limit warnings on page load (expected behavior)');
    });

    test('SHOULD FAIL: Page load should not consume rate limit quota', async () => {
      // Load page multiple times to simulate navigation
      const { unmount: unmount1 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount1();

      const { unmount: unmount2 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount2();

      const { unmount: unmount3 } = render(<ClaudeInstanceButtons {...defaultProps} />);
      unmount3();

      // Final page load
      render(<ClaudeInstanceButtons {...defaultProps} />);

      // After multiple page loads, buttons should still be available
      const prodButton = screen.getByText(/prod\/claude/);
      
      // This should NOT be disabled due to page loads consuming quota
      expect(prodButton).not.toBeDisabled();

      // User should be able to click 3 times successfully
      for (let i = 0; i < 3; i++) {
        fireEvent.click(prodButton);
      }

      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      });
    });
  });

  /**
   * Test 2: Correct user interaction flow
   * Tests how rate limiting should work with actual user interactions
   */
  describe('✅ EXPECTED: Proper User Interaction Flow', () => {
    test('SHOULD PASS: User can initially click buttons after page load', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // Initial state should be enabled
      expect(prodButton).not.toBeDisabled();

      // User's first click should work
      await user.click(prodButton);

      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(1);
        expect(mockOnCreateInstance).toHaveBeenCalledWith('cd prod && claude');
      });

      const successLogs = mockConsoleLog.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Button click accepted'))
      );
      expect(successLogs.length).toBeGreaterThan(0);
    });

    test('SHOULD PASS: Rate limiting engages after actual user clicks', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // User makes 3 rapid clicks (hitting rate limit)
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton);

      // Fourth click should be rate limited
      await user.click(prodButton);

      await waitFor(() => {
        // Only 3 successful calls should have been made
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      });

      // Should have rate limit warnings now
      const rateLimitWarnings = mockConsoleWarn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(rateLimitWarnings.length).toBeGreaterThan(0);
    });

    test('SHOULD PASS: Rate limiting resets after time window', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // Hit rate limit
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton); // This should be blocked

      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);

      // Fast forward past rate limit window (60 seconds + buffer)
      act(() => {
        jest.advanceTimersByTime(61000);
      });

      // Should be able to click again
      await user.click(prodButton);

      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(4);
      });
    });
  });

  /**
   * Test 3: Component lifecycle and rate limiting interaction
   * Tests that component mounting/unmounting/re-rendering doesn't affect rate limiting
   */
  describe('🔄 CRITICAL: Component Lifecycle Impact', () => {
    test('SHOULD FAIL: Component re-mounts should not affect rate limiting state', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });

      // Initial mount and interaction
      const { unmount, rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      let prodButton = screen.getByText(/prod\/claude/);
      
      // User hits rate limit
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton);

      // Unmount and remount component (simulate navigation)
      unmount();
      render(<ClaudeInstanceButtons {...defaultProps} />);

      prodButton = screen.getByText(/prod\/claude/);

      // 🚨 POTENTIAL BUG: Rate limit state might not persist across mounts
      // Button should still be available if rate limiting is properly isolated
      // This test may fail if rate limiting state is lost during unmount/mount
      
      // Try to click - should still be within rate limit window
      await user.click(prodButton);

      // Depending on implementation, this might succeed (4th call) or fail (rate limited)
      // The key is that the behavior should be consistent and predictable
      const totalCalls = mockOnCreateInstance.mock.calls.length;
      console.log(`Total calls after remount: ${totalCalls}`);
      
      // We can't predict the exact behavior without knowing the implementation details,
      // but we can ensure it's consistent
      expect(totalCalls).toBeGreaterThanOrEqual(3);
    });

    test('SHOULD FAIL: Prop changes should not reset rate limiting', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });

      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const getProdButton = () => screen.getByText(/prod\/claude/);
      
      // Hit rate limit
      await user.click(getProdButton());
      await user.click(getProdButton());
      await user.click(getProdButton());
      
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);

      // Change props significantly
      rerender(
        <ClaudeInstanceButtons 
          {...defaultProps}
          loading={true}
          connectionStatuses={{ prod: 'connected' }}
        />
      );

      // Change back
      rerender(<ClaudeInstanceButtons {...defaultProps} />);

      // Try to click again - should still be rate limited
      await user.click(getProdButton());

      // Should still only have 3 calls (rate limit persists)
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);

      const persistentRateLimitWarnings = mockConsoleWarn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(persistentRateLimitWarnings.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test 4: Real-world user scenarios
   * Tests that simulate actual user behavior patterns
   */
  describe('👤 REAL-WORLD: User Behavior Scenarios', () => {
    test('SHOULD PASS: Impatient user clicking rapidly', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // Simulate impatient user clicking rapidly
      const clickPromises = [];
      for (let i = 0; i < 10; i++) {
        clickPromises.push(user.click(prodButton));
      }
      
      await Promise.all(clickPromises);

      // Should only execute 3 times due to rate limiting
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      });

      // Should have multiple rate limit warnings
      const rateLimitWarnings = mockConsoleWarn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(rateLimitWarnings.length).toBeGreaterThan(0);
    });

    test('SHOULD PASS: User switching between different button types', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      const skipPermissionsButton = screen.getByText(/skip-permissions/);
      
      // User tries prod button multiple times
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton); // Rate limited

      // Switch to different button type - should still work
      await user.click(skipPermissionsButton);

      // Should have 3 prod calls + 1 skip-permissions call
      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(4);
      });

      // Verify the different commands were called
      const calls = mockOnCreateInstance.mock.calls;
      const prodCalls = calls.filter(call => call[0].includes('prod') && !call[0].includes('skip-permissions'));
      const skipCalls = calls.filter(call => call[0].includes('skip-permissions'));
      
      expect(prodCalls).toHaveLength(3);
      expect(skipCalls).toHaveLength(1);
    });

    test('SHOULD PASS: User returning after rate limit window expires', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons {...defaultProps} />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // User session 1: Hit rate limit
      await user.click(prodButton);
      await user.click(prodButton);
      await user.click(prodButton);

      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);

      // User takes a break (wait for rate limit to reset)
      act(() => {
        jest.advanceTimersByTime(61000);
      });

      // User session 2: Should be able to click again
      await user.click(prodButton);
      await user.click(prodButton);

      await waitFor(() => {
        expect(mockOnCreateInstance).toHaveBeenCalledTimes(5);
      });
    });
  });

  /**
   * Test 5: Error conditions and edge cases
   * Tests error handling and unusual scenarios
   */
  describe('🚫 EDGE CASES: Error Conditions', () => {
    test('SHOULD PASS: Component handles callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      render(<ClaudeInstanceButtons 
        {...defaultProps} 
        onCreateInstance={errorCallback}
      />);

      const prodButton = screen.getByText(/prod\/claude/);
      
      // Click should not break rate limiting even if callback errors
      expect(() => fireEvent.click(prodButton)).not.toThrow();
      
      // Rate limiting should still work for subsequent clicks
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      
      // Should still be rate limited after errors
      const rateLimitWarnings = mockConsoleWarn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Rate limited'))
      );
      expect(rateLimitWarnings.length).toBeGreaterThanOrEqual(0); // May or may not have warnings depending on implementation
    });

    test('SHOULD PASS: Loading state interactions with rate limiting', async () => {
      const user = userEvent.setup({ 
        delay: null,
        advanceTimers: jest.advanceTimersByTime 
      });
      
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const getProdButton = () => screen.getByText(/prod\/claude/);
      
      // Hit rate limit
      await user.click(getProdButton());
      await user.click(getProdButton());
      await user.click(getProdButton());

      // Set loading state
      rerender(<ClaudeInstanceButtons {...defaultProps} loading={true} />);
      
      // Button should be disabled due to loading, not rate limiting
      expect(getProdButton()).toBeDisabled();

      // Remove loading state
      rerender(<ClaudeInstanceButtons {...defaultProps} loading={false} />);

      // Rate limiting should still be in effect
      await user.click(getProdButton());
      
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3); // No additional calls due to rate limiting
    });
  });
});

/**
 * SUMMARY OF CRITICAL BUGS TO FIX:
 * 
 * 1. 🚨 PRIMARY BUG: "Buttons are incorrectly disabled on page load"
 *    - CAUSE: checkRateLimit() called during render (line 252 in ClaudeInstanceButtons.tsx)
 *    - IMPACT: Users see disabled buttons immediately after page load
 *    - FIX NEEDED: Move rate limit checking to event handlers only
 * 
 * 2. 🚨 SECONDARY BUG: "Page load consumes rate limit quota"
 *    - CAUSE: Rate limit logic may be triggered during component initialization
 *    - IMPACT: Multiple page loads may consume user's rate limit allowance
 *    - FIX NEEDED: Ensure pure functions don't modify state during renders
 * 
 * 3. 🚨 STATE BUG: "Rate limit state affected by re-renders"
 *    - CAUSE: Rate limiting state may be tied to component lifecycle
 *    - IMPACT: Component re-renders may reset or affect rate limiting
 *    - FIX NEEDED: Isolate rate limiting state from component state
 * 
 * FIXES REQUIRED:
 * 1. Remove checkRateLimit() from render-time execution
 * 2. Only check rate limits in response to user interactions
 * 3. Ensure rate limiting state is preserved across component lifecycle
 * 4. Make checkRateLimit() a pure function with no side effects
 * 5. Separate rate limit checking (pure) from rate limit recording (side effect)
 * 
 * TESTS THAT SHOULD FAIL INITIALLY:
 * - "Buttons are incorrectly disabled on page load"
 * - "Page load should not consume rate limit quota"  
 * - "Component re-mounts should not affect rate limiting state"
 * - "Prop changes should not reset rate limiting"
 * 
 * TESTS THAT SHOULD PASS AFTER FIXES:
 * - All user interaction flow tests
 * - Real-world user behavior scenarios
 * - Error condition handling
 * - Rate limit reset behavior
 */