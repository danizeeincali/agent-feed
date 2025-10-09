/**
 * TDD Test Suite for MermaidDiagram Option A Fix
 *
 * Testing Strategy:
 * - Verify hasRenderedRef removal doesn't cause infinite loops
 * - Ensure debug logging works
 * - Validate render success and error states
 * - Test timeout protection
 * - Verify cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MermaidDiagram from '../../components/markdown/MermaidDiagram';

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from 'mermaid';

describe('MermaidDiagram - Option A Fix', () => {
  const mockChart = 'graph TD\n  A[Start] --> B[End]';
  const mockSvg = '<svg>mock diagram</svg>';

  // Spy on console methods
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default successful render
    (mermaid.render as ReturnType<typeof vi.fn>).mockResolvedValue({
      svg: mockSvg,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('hasRenderedRef Removal', () => {
    it('should render without hasRenderedRef blocking', async () => {
      render(<MermaidDiagram chart={mockChart} id="test-diagram" />);

      // Should show loading initially
      expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();

      // Wait for render to complete
      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should allow re-renders when props change', async () => {
      const { rerender } = render(<MermaidDiagram chart={mockChart} id="test-1" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });

      // Change chart prop - should trigger new render
      const newChart = 'graph TD\n  X[New] --> Y[Chart]';
      rerender(<MermaidDiagram chart={newChart} id="test-1" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(2);
      });
    });

    it('should not cause infinite render loops', async () => {
      render(<MermaidDiagram chart={mockChart} id="loop-test" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // Wait a bit longer to ensure no additional renders
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should still be only 1 call
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('Debug Logging', () => {
    it('should log useEffect trigger', async () => {
      render(<MermaidDiagram chart={mockChart} id="debug-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] useEffect triggered'),
          expect.anything()
        );
      });
    });

    it('should log container ref status', async () => {
      render(<MermaidDiagram chart={mockChart} id="ref-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] containerRef.current exists'),
          expect.anything()
        );
      });
    });

    it('should log render start', async () => {
      render(<MermaidDiagram chart={mockChart} id="start-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] Starting render'),
          expect.anything()
        );
      });
    });

    it('should log mermaid.render() call', async () => {
      render(<MermaidDiagram chart={mockChart} id="render-call-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] Calling mermaid.render()')
        );
      });
    });

    it('should log successful render completion', async () => {
      render(<MermaidDiagram chart={mockChart} id="success-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] Render complete'),
          expect.anything()
        );
      });
    });

    it('should log SVG insertion', async () => {
      render(<MermaidDiagram chart={mockChart} id="svg-test" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] SVG inserted into DOM')
        );
      });
    });

    it('should log cleanup on unmount', async () => {
      const { unmount } = render(<MermaidDiagram chart={mockChart} id="cleanup-test" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });

      unmount();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mermaid] Cleanup triggered'),
        expect.anything()
      );
    });
  });

  describe('Render Success States', () => {
    it('should display loading state initially', () => {
      render(<MermaidDiagram chart={mockChart} />);
      expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render SVG after successful mermaid.render()', async () => {
      const { container } = render(<MermaidDiagram chart={mockChart} id="svg-render" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith('svg-render', mockChart);
      });

      await waitFor(() => {
        const diagramContainer = container.querySelector('.mermaid-diagram');
        expect(diagramContainer).toBeInTheDocument();
        expect(diagramContainer?.innerHTML).toContain('mock diagram');
      });
    });

    it('should clear loading state after render', async () => {
      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.queryByText(/Rendering diagram/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should generate unique ID if not provided', async () => {
      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith(
          expect.stringMatching(/^mermaid-[a-z0-9]+$/),
          mockChart
        );
      });
    });

    it('should use provided ID', async () => {
      render(<MermaidDiagram chart={mockChart} id="custom-id" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith('custom-id', mockChart);
      });
    });

    it('should trim chart content before rendering', async () => {
      const chartWithWhitespace = '\n  graph TD\n  A --> B  \n';
      render(<MermaidDiagram chart={chartWithWhitespace} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith(
          expect.any(String),
          chartWithWhitespace.trim()
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state on render failure', async () => {
      const errorMessage = 'Parse error on line 1';
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      render(<MermaidDiagram chart="invalid syntax" />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });
    });

    it('should log error details', async () => {
      const error = new Error('Test error');
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Mermaid] Full error details'),
          expect.objectContaining({
            error,
            chart: expect.any(String),
            diagramType: expect.any(String),
          })
        );
      });
    });

    it('should handle timeout errors', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      }, { timeout: 11000 });
    });

    it('should handle syntax errors with specific message', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Parse error: unexpected token')
      );

      render(<MermaidDiagram chart="bad syntax" />);

      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid syntax/i)).toBeInTheDocument();
      });
    });

    it('should handle lexical errors', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('lexical error: unrecognized text')
      );

      render(<MermaidDiagram chart="bad syntax" />);

      await waitFor(() => {
        expect(screen.getByText(/Mermaid syntax error/i)).toBeInTheDocument();
        expect(screen.getByText(/Check your diagram code/i)).toBeInTheDocument();
      });
    });

    it('should handle stack overflow errors', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Maximum call stack size exceeded')
      );

      render(<MermaidDiagram chart="complex" />);

      await waitFor(() => {
        expect(screen.getByText(/too complex/i)).toBeInTheDocument();
      });
    });

    it('should show diagram code in error details', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Test error')
      );

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.getByText(/Show diagram code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Timeout Protection', () => {
    it('should implement Promise.race for timeout', async () => {
      vi.useFakeTimers();

      // Make render hang indefinitely
      (mermaid.render as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<MermaidDiagram chart={mockChart} />);

      // Fast-forward past timeout
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should clear timeout after successful render', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Test error')
      );

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout on unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(<MermaidDiagram chart={mockChart} />);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should cleanup timeout on unmount', async () => {
      const { unmount } = render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });

      unmount();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mermaid] Cleanup triggered'),
        expect.anything()
      );
    });

    it('should handle unmount during render', async () => {
      // Make render slow
      (mermaid.render as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ svg: mockSvg }), 1000))
      );

      const { unmount } = render(<MermaidDiagram chart={mockChart} />);

      // Unmount before render completes
      unmount();

      // Should not throw errors
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mermaid] Cleanup triggered'),
        expect.anything()
      );
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" during loading', () => {
      render(<MermaidDiagram chart={mockChart} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have role="alert" during error', async () => {
      (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Test error')
      );

      render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should have role="img" for rendered diagram', async () => {
      const { container } = render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });

      await waitFor(() => {
        const diagram = container.querySelector('[role="img"]');
        expect(diagram).toBeInTheDocument();
      });
    });

    it('should have aria-label for diagram', async () => {
      const { container } = render(<MermaidDiagram chart={mockChart} />);

      await waitFor(() => {
        const diagram = container.querySelector('[aria-label]');
        expect(diagram).toHaveAttribute('aria-label', 'Mermaid diagram');
      });
    });

    it('should have aria-live="polite" for status updates', () => {
      render(<MermaidDiagram chart={mockChart} />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render if props unchanged', async () => {
      const { rerender } = render(<MermaidDiagram chart={mockChart} id="memo-test" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props
      rerender(<MermaidDiagram chart={mockChart} id="memo-test" />);

      // Should not trigger new render due to memo
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render when chart prop changes', async () => {
      const { rerender } = render(<MermaidDiagram chart={mockChart} id="memo-test" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });

      const newChart = 'graph TD\n  X --> Y';
      rerender(<MermaidDiagram chart={newChart} id="memo-test" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(2);
      });
    });

    it('should re-render when id prop changes', async () => {
      const { rerender } = render(<MermaidDiagram chart={mockChart} id="id-1" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });

      rerender(<MermaidDiagram chart={mockChart} id="id-2" />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(2);
      });
    });
  });
});
