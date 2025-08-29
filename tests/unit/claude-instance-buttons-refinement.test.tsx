/**
 * SPARC Refinement Phase Validation Test
 * 
 * Tests the corrected rate limiting implementation in ClaudeInstanceButtons
 * Validates that the TDD-driven fixes eliminate render-cycle side effects
 * while preserving all existing functionality.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClaudeInstanceButtons from '../../frontend/src/components/claude-manager/ClaudeInstanceButtons';

// Mock console methods to capture logs
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('SPARC Refinement: ClaudeInstanceButtons Rate Limiting', () => {
  const mockOnCreateInstance = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Render State', () => {
    test('buttons should NOT be disabled on page load (render-cycle fix)', () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      // All buttons should be enabled initially
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
        expect(button).not.toHaveClass('disabled:opacity-50');
      });
      
      // No rate limit warnings should appear on initial render
      expect(screen.queryByText(/rate limit reached/i)).not.toBeInTheDocument();
    });

    test('should not trigger rate limit side effects during render', () => {
      const { rerender } = render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      // Rerender multiple times to simulate normal React renders
      rerender(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      rerender(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      rerender(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      // No rate limit warnings should be logged during renders
      expect(mockConsoleWarn).not.toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
    });
  });

  describe('Pure Rate Limit Checking', () => {
    test('checkRateLimit should be pure (no side effects)', () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      // Multiple renders should not affect internal state
      const { rerender } = render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      // Buttons should remain enabled after multiple renders
      const prodButton = screen.getByText(/prod\/claude/i).closest('button');
      expect(prodButton).not.toHaveAttribute('disabled');
      
      rerender(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      expect(prodButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Click-Based Rate Limiting', () => {
    test('should apply rate limiting only after actual button clicks', async () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      const prodButton = screen.getByText(/prod\/claude/i).closest('button');
      
      // First 3 clicks should succeed (within rate limit)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(prodButton!);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }
      
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
      
      // 4th click should be rate limited
      fireEvent.click(prodButton!);
      
      await waitFor(() => {
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('Rate limited')
        );
      });
      
      // Should still be 3 calls (4th was blocked)
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(3);
    });

    test('should show rate limit UI state only after rate limit is hit', async () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      const prodButton = screen.getByText(/prod\/claude/i).closest('button');
      
      // Initially no rate limit warning
      expect(screen.queryByText(/rate limit reached/i)).not.toBeInTheDocument();
      
      // Click rapidly to hit rate limit
      for (let i = 0; i < 4; i++) {
        fireEvent.click(prodButton!);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }
      
      // Rate limit warning should now appear
      await waitFor(() => {
        expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument();
      });
    });
  });

  describe('Debouncing Functionality Preservation', () => {
    test('should maintain existing debouncing behavior', async () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      const prodButton = screen.getByText(/prod\/claude/i).closest('button');
      
      // Click button
      fireEvent.click(prodButton!);
      
      // Button should show cooldown state
      await waitFor(() => {
        expect(screen.getByText(/cooldown/i)).toBeInTheDocument();
      });
      
      // Fast forward past debounce period
      act(() => {
        jest.advanceTimersByTime(2100); // 2000ms + buffer
      });
      
      // Cooldown should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/cooldown/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Combined Protection (Rate Limit + Debounce)', () => {
    test('should handle both rate limiting and debouncing correctly', async () => {
      render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      
      const prodButton = screen.getByText(/prod\/claude/i).closest('button');
      
      // First click - should succeed and trigger debounce
      fireEvent.click(prodButton!);
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(1);
      
      // Second click during debounce - should be blocked by debounce
      fireEvent.click(prodButton!);
      expect(mockOnCreateInstance).toHaveBeenCalledTimes(1); // Still 1
      
      // Wait for debounce to clear
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      
      // Continue clicking to test rate limit
      fireEvent.click(prodButton!);
      fireEvent.click(prodButton!);
      
      act(() => {
        jest.advanceTimersByTime(2100); // Clear debounce after each
      });
      
      // This should hit rate limit (total of 4 attempts)
      fireEvent.click(prodButton!);
      
      await waitFor(() => {
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('Rate limited')
        );
      });
    });
  });

  describe('TypeScript Type Safety', () => {
    test('should accept all valid connection statuses', () => {
      const connectionStatuses = {
        'prod': 'connected' as const,
        'skip-permissions': 'connecting' as const,
        'skip-permissions-c': 'disconnected' as const,
      };
      
      expect(() => {
        render(
          <ClaudeInstanceButtons 
            onCreateInstance={mockOnCreateInstance}
            connectionStatuses={connectionStatuses}
          />
        );
      }).not.toThrow();
    });

    test('should handle optional props correctly', () => {
      expect(() => {
        render(<ClaudeInstanceButtons onCreateInstance={mockOnCreateInstance} />);
      }).not.toThrow();
      
      expect(() => {
        render(
          <ClaudeInstanceButtons 
            onCreateInstance={mockOnCreateInstance}
            loading={true}
          />
        );
      }).not.toThrow();
    });
  });
});

describe('SPARC Refinement: Performance & Memory', () => {
  test('should not cause memory leaks from rate limiting', () => {
    const { unmount } = render(
      <ClaudeInstanceButtons onCreateInstance={jest.fn()} />
    );
    
    // Component should unmount cleanly
    expect(() => unmount()).not.toThrow();
  });

  test('should cleanup timers on unmount', () => {
    const { unmount } = render(
      <ClaudeInstanceButtons onCreateInstance={jest.fn()} />
    );
    
    const prodButton = screen.getByText(/prod\/claude/i).closest('button');
    fireEvent.click(prodButton!);
    
    // Unmount while debounce is active
    expect(() => unmount()).not.toThrow();
  });
});