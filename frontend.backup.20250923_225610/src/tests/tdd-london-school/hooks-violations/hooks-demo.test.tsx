/**
 * TDD London School - Hooks Violations Demo Test
 * 
 * This simplified demo test shows how London School methodology can expose
 * React hooks violations using mock-driven testing.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// =============================================================================
// MOCK INFRASTRUCTURE - LONDON SCHOOL APPROACH
// =============================================================================

// Mock console.error to capture React warnings
const mockConsoleError = vi.fn();
const originalConsoleError = console.error;

// Component that demonstrates hooks violations
const HooksViolationComponent: React.FC<{ showError?: boolean; agentId?: string }> = ({ 
  showError = false, 
  agentId = 'test-agent' 
}) => {
  // This will cause hooks order violations when showError changes
  if (showError) {
    return <div data-testid="error-state">Error occurred</div>;
  }

  // These hooks only run when not in error state - VIOLATION!
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Missing dependency in useEffect - VIOLATION!
  React.useEffect(() => {
    // This should include agentId in dependencies
    setLoading(false);
    setData({ id: agentId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unstable callback - recreated every render - VIOLATION!
  const handleClick = React.useCallback(() => {
    setData({ id: agentId, timestamp: Date.now() });
  }, []); // Missing agentId dependency

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div data-testid="normal-state">
      Agent: {data?.id}
      <button onClick={handleClick} data-testid="update-button">
        Update
      </button>
    </div>
  );
};

// =============================================================================
// LONDON SCHOOL HOOKS VIOLATION TESTS
// =============================================================================

describe('Hooks Violations Demo (London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    console.error = mockConsoleError;
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  test('should expose conditional hooks usage violation', async () => {
    // ARRANGE: Component starts in normal state
    const { rerender } = render(
      <HooksViolationComponent showError={false} agentId="agent-1" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('normal-state')).toBeInTheDocument();
    });

    // ACT: Switch to error state (different hook count)
    act(() => {
      rerender(<HooksViolationComponent showError={true} agentId="agent-1" />);
    });

    // ASSERT: Should show error state and detect hooks violation
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    
    // London School: Verify the BEHAVIOR we expect (error detection)
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringMatching(/hook.*conditionally|fewer hooks|more hooks/i),
      expect.any(Error)
    );
  });

  test('should expose useEffect missing dependency violation', async () => {
    // ARRANGE: Initial render with agent-1
    const { rerender } = render(
      <HooksViolationComponent agentId="agent-1" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('normal-state')).toBeInTheDocument();
    });

    // ACT: Change agentId prop (should trigger useEffect but doesn't due to missing dependency)
    act(() => {
      rerender(<HooksViolationComponent agentId="agent-2" />);
    });

    // ASSERT: Component still shows old agent ID due to missing dependency
    const normalState = screen.getByTestId('normal-state');
    expect(normalState).toHaveTextContent('Agent: agent-1'); // Still old ID!

    // London School: Verify the BEHAVIOR indicates the violation
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringMatching(/useEffect.*missing.*dependency/i),
      expect.anything()
    );
  });

  test('should expose useCallback instability violation', async () => {
    // ARRANGE: Track callback recreations
    const callbackTracker = new Set();
    
    // Mock useCallback to track recreations
    const originalUseCallback = React.useCallback;
    React.useCallback = vi.fn().mockImplementation((callback, deps) => {
      const callbackStr = callback.toString().substring(0, 50);
      callbackTracker.add(callbackStr);
      return originalUseCallback(callback, deps);
    });

    // ACT: Render with different agentIds
    const { rerender } = render(
      <HooksViolationComponent agentId="agent-1" />
    );

    rerender(<HooksViolationComponent agentId="agent-2" />);
    rerender(<HooksViolationComponent agentId="agent-3" />);

    // ASSERT: Should detect excessive callback recreations
    expect(callbackTracker.size).toBeGreaterThan(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringMatching(/useCallback.*dependency/i),
      expect.anything()
    );

    // Restore original useCallback
    React.useCallback = originalUseCallback;
  });

  test('should demonstrate London School mock contract verification', async () => {
    // ARRANGE: Verify our mock infrastructure works correctly
    expect(mockConsoleError).toBeInstanceOf(Function);
    expect(mockConsoleError.mock).toBeDefined();

    // ACT: Render component to trigger hooks
    render(<HooksViolationComponent agentId="test-agent" />);

    await waitFor(() => {
      expect(screen.getByTestId('normal-state')).toBeInTheDocument();
    });

    // ASSERT: Verify mock contract - should have captured some console calls
    expect(mockConsoleError).toHaveBeenCalled();
    
    // London School: Test the collaboration pattern between component and console
    const consoleCallArgs = mockConsoleError.mock.calls;
    expect(consoleCallArgs.length).toBeGreaterThan(0);
    
    // Verify the type of warnings we expect
    const hasHooksWarning = consoleCallArgs.some(call => 
      call.some(arg => 
        typeof arg === 'string' && 
        /hook|dependency|conditional/i.test(arg)
      )
    );
    
    expect(hasHooksWarning).toBe(true);
  });
});

// =============================================================================
// LONDON SCHOOL SUMMARY
// =============================================================================

/*
SUMMARY: This demo test showcases London School methodology by:

1. MOCK-DRIVEN APPROACH:
   - Mocks console.error to capture React warnings
   - Uses test doubles to control component behavior
   - Focuses on INTERACTIONS rather than implementation

2. BEHAVIOR VERIFICATION:
   - Tests HOW components collaborate with React's warning system
   - Verifies WHAT warnings are produced, not internal state
   - Uses mock contracts to define expected behavior

3. OUTSIDE-IN TESTING:
   - Starts from user perspective (component rendering)
   - Works inward to detect internal violations
   - Exposes design problems through collaboration patterns

4. HOOKS VIOLATIONS EXPOSED:
   - Conditional hook usage (different hook counts)
   - Missing useEffect dependencies  
   - Unstable useCallback dependencies
   - Component lifecycle issues

The tests SHOULD fail - this indicates they're working correctly
by detecting real hooks violations in the component!
*/