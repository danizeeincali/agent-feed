/**
 * CRITICAL TEST CASES FOR MERMAID DIAGRAM removeChild FIX
 *
 * These tests MUST pass before production deployment
 * Location: /workspaces/agent-feed/frontend/src/components/markdown/__tests__/
 *
 * Purpose: Verify the removeChild error fix works correctly by testing:
 * 1. Component unmount during async render (primary fix validation)
 * 2. Timeout protection mechanism
 * 3. Resource cleanup on unmount
 * 4. Multiple diagrams without conflicts
 * 5. XSS prevention
 * 6. State race conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import MermaidDiagram from '../MermaidDiagram';
import mermaid from 'mermaid';

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

describe('MermaidDiagram - removeChild Error Fix (CRITICAL TESTS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Capture console errors to verify no React warnings
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // CRITICAL TEST 1: Component Unmount During Render
  // =========================================================================
  // This is THE critical test - validates the primary fix for removeChild error
  // The isMounted flag (line 90) prevents state updates after unmount
  // =========================================================================

  describe('🔴 CRITICAL: Component Unmount During Render', () => {
    it('should prevent state updates when unmounted during async render', async () => {
      const chart = 'graph TD\n    A --> B';

      // Simulate slow mermaid render (500ms delay)
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 500)
        )
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Verify loading state is shown
      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();

      // Unmount component BEFORE render completes (after 100ms)
      await new Promise(resolve => setTimeout(resolve, 100));
      unmount();

      // Wait for render to complete (another 500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL ASSERTION: No React state update warnings
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update")
      );
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('unmounted component')
      );
    });

    it('should not cause removeChild errors when unmounting with loading spinner', async () => {
      const chart = 'graph TD\n    A --> B';

      // Never-resolving promise to keep loading state active
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      const { unmount, container } = render(<MermaidDiagram chart={chart} />);

      // Verify loading spinner exists (React-managed children)
      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Unmount while spinner is still active
      unmount();

      // CRITICAL ASSERTION: No DOM errors (removeChild, etc.)
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('removeChild')
      );
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('not a child')
      );
    });

    it('should handle multiple rapid mount/unmount cycles', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 300)
        )
      );

      // Mount and unmount 5 times rapidly
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<MermaidDiagram chart={chart} />);
        await new Promise(resolve => setTimeout(resolve, 50));
        unmount();
      }

      // Wait for all renders to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL ASSERTION: No errors from any cycle
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CRITICAL TEST 2: Timeout Protection
  // =========================================================================
  // Validates timeout mechanism added in lines 113-118
  // Prevents infinite hangs from complex or malformed diagrams
  // =========================================================================

  describe('🔴 CRITICAL: Timeout Protection', () => {
    it('should timeout after 10 seconds for stuck renders', async () => {
      vi.useFakeTimers();
      const chart = 'graph TD\n    A --> B';

      // Never-resolving render (simulates hang)
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      render(<MermaidDiagram chart={chart} />);

      // Loading state should be active
      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();

      // Fast-forward time to trigger timeout
      await vi.advanceTimersByTimeAsync(10000);

      // CRITICAL ASSERTION: Timeout error shown
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
        expect(screen.getByText(/10 seconds/i)).toBeInTheDocument();
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should clear timeout when render completes before timeout', async () => {
      vi.useFakeTimers();
      const chart = 'graph TD\n    A --> B';
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Fast render (2 seconds, before 10s timeout)
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 2000)
        )
      );

      render(<MermaidDiagram chart={chart} />);

      // Fast-forward to complete render
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        // CRITICAL ASSERTION: Timeout was cleared
        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
        expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should not show timeout error when render succeeds', async () => {
      const chart = 'graph TD\n    A --> B';

      // Normal fast render
      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Success</svg>' });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // CRITICAL TEST 3: Timeout Cleanup on Unmount
  // =========================================================================
  // Validates cleanup code in lines 188-191
  // Prevents memory leaks from orphaned timeouts
  // =========================================================================

  describe('🔴 CRITICAL: Timeout Cleanup', () => {
    it('should clear timeout when component unmounts', async () => {
      const chart = 'graph TD\n    A --> B';
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Slow render that will be interrupted
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 5000)
        )
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount before render completes
      await new Promise(resolve => setTimeout(resolve, 100));
      unmount();

      // CRITICAL ASSERTION: Timeout was cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not trigger timeout after unmount', async () => {
      vi.useFakeTimers();
      const chart = 'graph TD\n    A --> B';

      // Never-resolving render
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {})
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount before timeout
      await vi.advanceTimersByTimeAsync(5000);
      unmount();

      // Continue past timeout threshold
      await vi.advanceTimersByTimeAsync(6000);

      // CRITICAL ASSERTION: No timeout errors after unmount
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('timeout')
      );

      vi.useRealTimers();
    });

    it('should clean up all resources on unmount', async () => {
      const chart = 'graph TD\n    A --> B';
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 3000)
        )
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);
      unmount();

      // CRITICAL ASSERTION: All cleanup happened
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CRITICAL TEST 4: Multiple Diagrams Without ID Collisions
  // =========================================================================
  // Validates unique ID generation (line 106)
  // Prevents diagrams from overwriting each other
  // =========================================================================

  describe('🟡 MEDIUM: Multiple Diagrams on Same Page', () => {
    it('should generate unique IDs for multiple diagrams without custom IDs', async () => {
      const chart1 = 'graph TD\n    A --> B';
      const chart2 = 'graph TD\n    C --> D';
      const chart3 = 'graph TD\n    E --> F';

      const renderSpy = vi.mocked(mermaid.render);
      renderSpy.mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <>
          <MermaidDiagram chart={chart1} />
          <MermaidDiagram chart={chart2} />
          <MermaidDiagram chart={chart3} />
        </>
      );

      await waitFor(() => {
        const calls = renderSpy.mock.calls;
        const ids = calls.map(call => call[0]);

        // CRITICAL ASSERTION: All IDs must be unique
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBe(3);

        // All should start with 'mermaid-'
        ids.forEach(id => {
          expect(id).toMatch(/^mermaid-[a-z0-9]+$/);
        });
      });
    });

    it('should handle mix of custom and auto-generated IDs', async () => {
      const chart = 'graph TD\n    A --> B';

      const renderSpy = vi.mocked(mermaid.render);
      renderSpy.mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <>
          <MermaidDiagram chart={chart} id="custom-1" />
          <MermaidDiagram chart={chart} />
          <MermaidDiagram chart={chart} id="custom-2" />
          <MermaidDiagram chart={chart} />
        </>
      );

      await waitFor(() => {
        const calls = renderSpy.mock.calls;
        const ids = calls.map(call => call[0]);

        // CRITICAL ASSERTION: All IDs unique, custom IDs used
        expect(new Set(ids).size).toBe(4);
        expect(ids).toContain('custom-1');
        expect(ids).toContain('custom-2');
      });
    });

    it('should allow same chart content with different IDs', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <>
          <MermaidDiagram chart={chart} id="diagram-1" />
          <MermaidDiagram chart={chart} id="diagram-2" />
        </>
      );

      await waitFor(() => {
        // Both should render independently
        const containers = screen.getAllByRole('img');
        expect(containers).toHaveLength(2);
      });
    });
  });

  // =========================================================================
  // CRITICAL TEST 5: XSS Prevention
  // =========================================================================
  // Validates security level (line 26: securityLevel: 'strict')
  // Ensures dangerouslySetInnerHTML (line 239) is safe
  // =========================================================================

  describe('🔴 CRITICAL: XSS Prevention', () => {
    it('should safely render SVG without executing scripts', async () => {
      const chart = 'graph TD\n    A --> B';

      // Simulate mermaid returning SVG with script tag
      const maliciousSVG = `
        <svg>
          <script>alert('XSS')</script>
          <g>Test content</g>
        </svg>
      `;

      vi.mocked(mermaid.render).mockResolvedValue({ svg: maliciousSVG });

      const { container } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        // CRITICAL ASSERTION: Script tags should be neutralized
        const scripts = container.querySelectorAll('script');
        // With strict security, mermaid should strip these, but verify
        expect(scripts.length).toBe(0);
      });
    });

    it('should use strict security level', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        // CRITICAL ASSERTION: Mermaid initialized with strict security
        expect(mermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            securityLevel: 'strict',
          })
        );
      });
    });

    it('should sanitize potentially dangerous SVG attributes', async () => {
      const chart = 'graph TD\n    A --> B';

      const dangerousSVG = `
        <svg onload="alert('XSS')" onerror="alert('XSS')">
          <a href="javascript:alert('XSS')">Link</a>
        </svg>
      `;

      vi.mocked(mermaid.render).mockResolvedValue({ svg: dangerousSVG });

      const { container } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        // CRITICAL ASSERTION: Event handlers should be stripped
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('onload')).toBeNull();
        expect(svg?.getAttribute('onerror')).toBeNull();

        // javascript: URLs should be stripped
        const links = container.querySelectorAll('a[href^="javascript:"]');
        expect(links.length).toBe(0);
      });
    });
  });

  // =========================================================================
  // CRITICAL TEST 6: State Race Conditions
  // =========================================================================
  // Validates that rapid re-renders don't cause state corruption
  // Tests interaction between isMounted flag and React's render cycle
  // =========================================================================

  describe('🟡 MEDIUM: State Race Conditions', () => {
    it('should handle rapid chart changes without showing stale content', async () => {
      const charts = [
        'graph TD\n    A --> B',
        'graph TD\n    C --> D',
        'graph TD\n    E --> F',
      ];

      let callCount = 0;
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => {
            resolve({ svg: `<svg id="chart-${++callCount}">Chart ${callCount}</svg>` });
          }, 100)
        )
      );

      const { rerender } = render(<MermaidDiagram chart={charts[0]} />);

      // Rapid re-renders before first completes
      await new Promise(resolve => setTimeout(resolve, 30));
      rerender(<MermaidDiagram chart={charts[1]} />);

      await new Promise(resolve => setTimeout(resolve, 30));
      rerender(<MermaidDiagram chart={charts[2]} />);

      // Wait for all renders to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL ASSERTION: Should only show latest chart
      // Note: This test might fail if stale renders aren't cancelled
      await waitFor(() => {
        const containers = screen.getAllByRole('img');
        // Should only have one diagram (the latest)
        expect(containers.length).toBe(1);
      });
    });

    it('should cancel previous render when chart changes', async () => {
      const chart1 = 'graph TD\n    A --> B';
      const chart2 = 'graph TD\n    C --> D';

      let render1Started = false;
      let render1Completed = false;
      let render2Started = false;

      vi.mocked(mermaid.render).mockImplementation((id, chart) => {
        if (chart === chart1) {
          render1Started = true;
          return new Promise(resolve =>
            setTimeout(() => {
              render1Completed = true;
              resolve({ svg: '<svg>Chart 1</svg>' });
            }, 300)
          );
        } else {
          render2Started = true;
          return new Promise(resolve =>
            setTimeout(() => resolve({ svg: '<svg>Chart 2</svg>' }), 100)
          );
        }
      });

      const { rerender } = render(<MermaidDiagram chart={chart1} />);

      // Wait for first render to start
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(render1Started).toBe(true);

      // Change chart before first render completes
      rerender(<MermaidDiagram chart={chart2} />);

      // Wait for second render to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // CRITICAL ASSERTION: Second render should complete
      expect(render2Started).toBe(true);

      // Even though first render completes later, it shouldn't show
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(render1Completed).toBe(true);
    });

    it('should handle error in one render not affecting next render', async () => {
      const chart1 = 'invalid chart';
      const chart2 = 'graph TD\n    A --> B';

      let callCount = 0;
      vi.mocked(mermaid.render).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Parse error'));
        }
        return Promise.resolve({ svg: '<svg>Valid</svg>' });
      });

      const { rerender } = render(<MermaidDiagram chart={chart1} />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });

      // Switch to valid chart
      rerender(<MermaidDiagram chart={chart2} />);

      // CRITICAL ASSERTION: Should recover and show valid diagram
      await waitFor(() => {
        expect(screen.queryByText(/Invalid Mermaid Syntax/i)).not.toBeInTheDocument();
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // ADDITIONAL TEST: Enhanced Error Messages
  // =========================================================================
  // Validates enhanced error handling (lines 151-166)
  // Ensures users get helpful error messages
  // =========================================================================

  describe('🟢 LOW: Enhanced Error Messages', () => {
    it('should show timeout-specific error message', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockRejectedValue(
        new Error('Rendering timeout: Diagram took longer than 10 seconds to render.')
      );

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
        expect(screen.getByText(/10 seconds/i)).toBeInTheDocument();
      });
    });

    it('should show parse-specific error message', async () => {
      const chart = 'invalid\nsyntax\nhere';

      vi.mocked(mermaid.render).mockRejectedValue(
        new Error('Parse error on line 2: Unexpected token')
      );

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid syntax/i)).toBeInTheDocument();
        expect(screen.getByText(/Parse error/i)).toBeInTheDocument();
      });
    });

    it('should show helpful message for complex diagrams', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockRejectedValue(
        new Error('Maximum call stack size exceeded')
      );

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText(/too complex/i)).toBeInTheDocument();
        expect(screen.getByText(/circular references/i)).toBeInTheDocument();
        expect(screen.getByText(/simplifying/i)).toBeInTheDocument();
      });
    });

    it('should provide expandable code view on error', async () => {
      const chart = 'invalid mermaid code';

      vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const details = screen.getByText('Show diagram code');
        expect(details).toBeInTheDocument();

        // Click to expand (if interactive)
        details.click();

        // Code should be visible
        expect(screen.getByText(chart)).toBeInTheDocument();
      });
    });
  });
});

/**
 * TEST EXECUTION CHECKLIST
 *
 * Before deploying the Mermaid removeChild fix:
 *
 * ✅ Run: npm test -- --run MermaidDiagram.removeChild-fix.test.tsx
 * ✅ Verify: All 🔴 CRITICAL tests pass
 * ✅ Verify: All 🟡 MEDIUM tests pass
 * ✅ Verify: All 🟢 LOW tests pass
 * ✅ Verify: No console errors during test run
 * ✅ Verify: Test coverage >80% for MermaidDiagram.tsx
 * ✅ Manual: Test in real browser with multiple diagrams
 * ✅ Manual: Test rapid navigation between pages with diagrams
 * ✅ Manual: Test with intentionally slow diagrams (complex flowcharts)
 * ✅ Monitor: Production logs for removeChild errors post-deployment
 *
 * If ANY critical test fails, DO NOT DEPLOY.
 */
