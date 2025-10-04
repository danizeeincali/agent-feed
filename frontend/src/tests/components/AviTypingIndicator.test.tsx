/**
 * Unit Tests for AviTypingIndicator Component
 *
 * SPARC TDD - London School Testing:
 * - Test component behavior and animation frames
 * - Mock timer functions for precise frame control
 * - Verify color cycling through ROYGBIV spectrum
 * - Validate accessibility and lifecycle management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import AviTypingIndicator from '../../components/AviTypingIndicator';

// Animation test data
const FRAMES = [
  'A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'Λ v !',
  'A v !', 'A V !', 'A V i', 'A v i', 'Λ v i'
];

const ROYGBIV = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3'  // Violet
];

describe('AviTypingIndicator - Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('🎨 Rendering Tests', () => {
    test('renders when isVisible is true', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toBeVisible();
    });

    test('does not render when isVisible is false', () => {
      const { container } = render(<AviTypingIndicator isVisible={false} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('displays initial frame "A v i"', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');
    });

    test('has correct ARIA attributes for accessibility', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
      expect(indicator).toHaveAttribute('aria-label', 'Avi is typing');
      expect(indicator).toHaveAttribute('aria-busy', 'true');
    });

    test('has accessible screen reader text', () => {
      render(<AviTypingIndicator isVisible={true} />);

      // Check for visually hidden screen reader text
      const srText = screen.getByText('Avi is typing...');
      expect(srText).toHaveClass('sr-only');
    });
  });

  describe('🎬 Animation Frame Tests', () => {
    test('shows frame 1: "A v i" at start (0ms)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');
    });

    test('shows frame 2: "Λ v i" after 200ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(200);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('shows frame 3: "Λ V i" after 400ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(400);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ V i');
    });

    test('shows frame 4: "Λ V !" after 600ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(600);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ V !');
    });

    test('shows frame 5: "Λ v !" after 800ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(800);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ v !');
    });

    test('shows frame 10: "Λ v i" after 1800ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(1800);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('loops back to frame 1: "A v i" after 2000ms (full cycle)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      // Complete one full cycle (10 frames × 200ms = 2000ms)
      vi.advanceTimersByTime(2000);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');
    });

    test('continues looping to frame 2: "Λ v i" after 2200ms (second cycle)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(2200);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('all frames match expected sequence', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');

      FRAMES.forEach((expectedFrame, index) => {
        vi.advanceTimersByTime(index === 0 ? 0 : 200);
        expect(indicator).toHaveTextContent(expectedFrame);
      });
    });
  });

  describe('🌈 Color Cycling Tests', () => {
    test('frame 1 has red color (#FF0000)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#FF0000' });
    });

    test('frame 2 has orange color (#FF7F00)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(200);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#FF7F00' });
    });

    test('frame 3 has yellow color (#FFFF00)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(400);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#FFFF00' });
    });

    test('frame 4 has green color (#00FF00)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(600);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#00FF00' });
    });

    test('frame 5 has blue color (#0000FF)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(800);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#0000FF' });
    });

    test('frame 6 has indigo color (#4B0082)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(1000);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#4B0082' });
    });

    test('frame 7 has violet color (#9400D3)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(1200);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#9400D3' });
    });

    test('frame 8 restarts color cycle with red (#FF0000)', () => {
      render(<AviTypingIndicator isVisible={true} />);

      vi.advanceTimersByTime(1400);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');
      expect(textElement).toHaveStyle({ color: '#FF0000' });
    });

    test('color matches expected ROYGBIV index for each frame', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');

      // Test first 10 frames
      for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
        if (frameIndex > 0) {
          vi.advanceTimersByTime(200);
        }

        const expectedColorIndex = frameIndex % ROYGBIV.length;
        const expectedColor = ROYGBIV[expectedColorIndex];

        expect(textElement).toHaveStyle({ color: expectedColor });
      }
    });

    test('color cycle continues correctly in second loop', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');

      // Advance to second loop (frame 11 = index 10)
      vi.advanceTimersByTime(2000); // Back to frame 1
      expect(textElement).toHaveStyle({ color: '#FF0000' });

      vi.advanceTimersByTime(200); // Frame 2
      expect(textElement).toHaveStyle({ color: '#FF7F00' });

      vi.advanceTimersByTime(200); // Frame 3
      expect(textElement).toHaveStyle({ color: '#FFFF00' });
    });
  });

  describe('♻️ Lifecycle Tests', () => {
    test('animation starts on mount when visible', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');

      vi.advanceTimersByTime(200);
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('animation clears interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(<AviTypingIndicator isVisible={true} />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test('animation stops when isVisible changes to false', () => {
      const { rerender } = render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();

      // Change to not visible
      rerender(<AviTypingIndicator isVisible={false} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('no memory leaks - interval is cleared properly', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(<AviTypingIndicator isVisible={true} />);

      const intervalCalls = setIntervalSpy.mock.results.length;

      unmount();

      // Every setInterval should have a matching clearInterval
      expect(clearIntervalSpy).toHaveBeenCalledTimes(intervalCalls);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    test('interval reference is stored and cleared correctly', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount, rerender } = render(<AviTypingIndicator isVisible={true} />);

      // Rerender with same props - should not create new interval
      rerender(<AviTypingIndicator isVisible={true} />);

      unmount();

      // Should only clear once
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      clearIntervalSpy.mockRestore();
    });

    test('cleanup happens when component unmounts during animation', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(<AviTypingIndicator isVisible={true} />);

      // Advance to middle of animation
      vi.advanceTimersByTime(1000);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('🔄 Visibility Toggle Tests', () => {
    test('shows animation when prop changes from false to true', async () => {
      const { rerender } = render(<AviTypingIndicator isVisible={false} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      rerender(<AviTypingIndicator isVisible={true} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    test('hides animation when prop changes from true to false', () => {
      const { rerender } = render(<AviTypingIndicator isVisible={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<AviTypingIndicator isVisible={false} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('smooth transition with opacity change on hide', () => {
      const { rerender } = render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('opacity-100');

      rerender(<AviTypingIndicator isVisible={false} />);

      // Component should be removed (not just opacity 0)
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('smooth transition with opacity change on show', async () => {
      const { rerender } = render(<AviTypingIndicator isVisible={false} />);

      rerender(<AviTypingIndicator isVisible={true} />);

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveClass('opacity-100');
      });
    });

    test('animation state resets when toggling visibility', () => {
      const { rerender } = render(<AviTypingIndicator isVisible={true} />);

      // Advance animation
      vi.advanceTimersByTime(800);
      expect(screen.getByRole('status')).toHaveTextContent('Λ v !');

      // Hide
      rerender(<AviTypingIndicator isVisible={false} />);

      // Show again - should reset to first frame
      rerender(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');
    });

    test('multiple rapid toggles handle cleanup correctly', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = render(<AviTypingIndicator isVisible={true} />);

      // Rapid toggles
      rerender(<AviTypingIndicator isVisible={false} />);
      rerender(<AviTypingIndicator isVisible={true} />);
      rerender(<AviTypingIndicator isVisible={false} />);
      rerender(<AviTypingIndicator isVisible={true} />);

      // Each hide should clear interval
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(0);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('⏱️ Timing Precision Tests', () => {
    test('each frame displays for exactly 200ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');

      // Frame 1 at 0ms
      expect(indicator).toHaveTextContent('A v i');

      // Just before next frame (199ms) - should still be frame 1
      vi.advanceTimersByTime(199);
      expect(indicator).toHaveTextContent('A v i');

      // Exactly at 200ms - should be frame 2
      vi.advanceTimersByTime(1);
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('animation cycle completes in exactly 2000ms', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');

      // Start at frame 1
      expect(indicator).toHaveTextContent('A v i');

      // Just before full cycle (1999ms)
      vi.advanceTimersByTime(1999);
      expect(indicator).toHaveTextContent('Λ v i');

      // Exactly at 2000ms - back to frame 1
      vi.advanceTimersByTime(1);
      expect(indicator).toHaveTextContent('A v i');
    });

    test('interval is set to 200ms', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(<AviTypingIndicator isVisible={true} />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 200);

      setIntervalSpy.mockRestore();
    });
  });

  describe('🎯 Edge Cases', () => {
    test('handles rapid mount/unmount cycles', () => {
      const { unmount, rerender } = render(<AviTypingIndicator isVisible={true} />);

      unmount();

      const { unmount: unmount2 } = render(<AviTypingIndicator isVisible={true} />);
      unmount2();

      const { unmount: unmount3 } = render(<AviTypingIndicator isVisible={true} />);

      // Should still work correctly
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();

      unmount3();
    });

    test('handles long animation duration without issues', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');

      // Simulate 30 seconds of animation (15 complete cycles)
      vi.advanceTimersByTime(30000);

      // Should still be working correctly
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('A v i'); // Should be at start of cycle
    });

    test('handles component with className prop', () => {
      render(<AviTypingIndicator isVisible={true} className="custom-class" />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('custom-class');
    });

    test('animation works when mounted initially as visible', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('A v i');

      vi.advanceTimersByTime(200);
      expect(indicator).toHaveTextContent('Λ v i');
    });

    test('no errors when mounted initially as hidden', () => {
      const { container } = render(<AviTypingIndicator isVisible={false} />);

      expect(container.firstChild).toBeNull();

      // Advance time - should not cause errors
      vi.advanceTimersByTime(1000);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('📝 Activity Text Feature', () => {
    test('should display activity text with correct styling', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} activityText="Test activity" />);

      expect(container.textContent).toContain('- Test activity');

      // Find the activity text span
      const activityElement = container.querySelector('span[style*="color: rgb(209, 213, 219)"]');
      expect(activityElement).toBeInTheDocument();
      expect(activityElement).toHaveStyle({
        color: '#D1D5DB',
        fontWeight: '400',
        fontSize: '0.85rem'
      });
    });

    test('should truncate long activity text at 80 chars', () => {
      const longText = 'A'.repeat(100);
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} activityText={longText} />);

      // The full text content includes the animation frame and separator
      const fullText = container.textContent || '';

      // Check that the text contains the ellipsis
      expect(fullText).toContain('...');

      // The truncated part should be at most 80 characters
      const parts = fullText.split(' - ');
      if (parts.length > 1) {
        const activityPart = parts[1];
        expect(activityPart.length).toBeLessThanOrEqual(80);
      }
    });

    test('should not display separator when no activity', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} />);
      expect(container.textContent).not.toContain(' - ');
    });

    test('should handle empty string activity', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} activityText="" />);
      expect(container.textContent).not.toContain(' - ');
    });

    test('should handle whitespace-only activity', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} activityText="   " />);
      expect(container.textContent).not.toContain(' - ');
    });

    test('should update activity text instantly without fade', () => {
      const { container, rerender } = render(<AviTypingIndicator isVisible={true} inline={true} activityText="First activity" />);

      expect(container.textContent).toContain('First activity');

      rerender(<AviTypingIndicator isVisible={true} inline={true} activityText="Second activity" />);

      expect(container.textContent).toContain('Second activity');
      expect(container.textContent).not.toContain('First activity');
    });

    test('should show activity with margin left of 0.5rem', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={true} activityText="Test activity" />);

      const activityElement = container.querySelector('span[style*="margin-left"]');
      expect(activityElement).toHaveStyle({ marginLeft: '0.5rem' });
    });

    test('should not show activity in absolute mode', () => {
      const { container } = render(<AviTypingIndicator isVisible={true} inline={false} activityText="Test activity" />);

      expect(container.textContent).not.toContain('Test activity');
    });
  });

  describe('📏 Full-Width Layout Tests', () => {
    test('should render with display flex in inline mode', () => {
      const { container } = render(
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText="Test activity"
        />
      );

      const indicator = container.querySelector('.avi-wave-text-inline');
      expect(indicator).toBeInTheDocument();

      // Get computed styles
      const styles = window.getComputedStyle(indicator as Element);
      expect(styles.display).toBe('flex');
    });

    test('should render with 100% width in inline mode', () => {
      const { container } = render(
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText="Test activity"
        />
      );

      const indicator = container.querySelector('.avi-wave-text-inline') as HTMLElement;
      expect(indicator).toBeInTheDocument();
      expect(indicator.style.width).toBe('100%');
    });

    test('should maintain center alignment with flex layout', () => {
      const { container } = render(
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText="Test activity"
        />
      );

      const indicator = container.querySelector('.avi-wave-text-inline') as HTMLElement;
      expect(indicator).toBeInTheDocument();
      expect(indicator.style.alignItems).toBe('center');
      expect(indicator.style.gap).toBe('0.25rem');
    });

    test('should not wrap activity text', () => {
      const longActivity = 'This is a very long activity message that should not wrap to next line';

      const { container } = render(
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText={longActivity}
        />
      );

      // Find the activity text span - it's the second span inside the indicator
      const spans = container.querySelectorAll('span');
      const activitySpan = spans[2] as HTMLElement; // First span is container, second is animation, third is activity

      expect(activitySpan).toBeTruthy();
      expect(activitySpan.style.whiteSpace).toBe('nowrap');
      expect(activitySpan.style.overflow).toBe('hidden');
      expect(activitySpan.style.textOverflow).toBe('ellipsis');
    });

    test('should truncate activity text at 80 characters with ellipsis', () => {
      const longActivity = 'A'.repeat(100);

      const { container } = render(
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText={longActivity}
        />
      );

      const fullText = container.textContent || '';

      // Check that the text contains ellipsis
      expect(fullText).toContain('...');

      // Extract activity part (after "- ")
      const parts = fullText.split(' - ');
      if (parts.length > 1) {
        const activityPart = parts[1];
        // Should be truncated to 80 chars max (77 + '...' = 80)
        expect(activityPart.length).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('♿ Accessibility Tests', () => {
    test('has role="status" for screen readers', () => {
      render(<AviTypingIndicator isVisible={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('has aria-live="polite" for non-intrusive updates', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    test('has aria-busy="true" during animation', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-busy', 'true');
    });

    test('provides text alternative for animation', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const srText = screen.getByText('Avi is typing...');
      expect(srText).toBeInTheDocument();
    });

    test('screen reader text is visually hidden but accessible', () => {
      render(<AviTypingIndicator isVisible={true} />);

      const srText = screen.getByText('Avi is typing...');
      expect(srText).toHaveClass('sr-only');
    });

    test('respects prefers-reduced-motion', () => {
      // Mock matchMedia for reduced motion
      const mockMatchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      render(<AviTypingIndicator isVisible={true} />);

      const indicator = screen.getByRole('status');

      // Should have reduced motion class or no animation
      expect(
        indicator.classList.contains('motion-reduce') ||
        indicator.hasAttribute('data-reduced-motion')
      ).toBe(true);
    });
  });
});
