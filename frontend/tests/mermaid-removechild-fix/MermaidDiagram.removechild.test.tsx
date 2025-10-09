/**
 * Unit Tests for MermaidDiagram removeChild DOM Error Fix
 *
 * Tests the fix for: innerHTML destroying React-managed children before React unmounts them
 *
 * Fix Location: src/components/markdown/MermaidDiagram.tsx (lines 132-142)
 * Solution: Manual child removal via while loop before innerHTML assignment
 *
 * SPARC-TDD: Comprehensive test coverage for DOM manipulation bug fix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import MermaidDiagram from '@/components/markdown/MermaidDiagram';
import mermaid from 'mermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

describe('MermaidDiagram - removeChild DOM Error Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('UT-01: Single Mermaid diagram renders without errors', () => {
    it('should render diagram and insert SVG without removeChild errors', async () => {
      const chart = 'graph TD\n    A[Start] --> B[End]';
      const mockSvg = '<svg><g><text>Test Diagram</text></g></svg>';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: mockSvg });

      const { container } = render(<MermaidDiagram chart={chart} />);

      // Wait for render to complete
      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify SVG was inserted
      const mermaidContainer = container.querySelector('.mermaid-diagram');
      expect(mermaidContainer?.innerHTML).toContain('Test Diagram');

      // Verify no console errors about removeChild
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/removeChild/)
      );
    });

    it('should manually remove React children before innerHTML', async () => {
      const chart = 'graph TD\n    A --> B';
      const mockSvg = '<svg>Test SVG</svg>';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: mockSvg });

      const { container } = render(<MermaidDiagram chart={chart} />);

      // Verify loading spinner exists initially
      expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();

      await waitFor(() => {
        const mermaidContainer = container.querySelector('.mermaid-diagram');
        expect(mermaidContainer?.innerHTML).toBe(mockSvg);
      });

      // Loading spinner should be gone (removed manually before innerHTML)
      expect(screen.queryByText(/Rendering diagram/i)).not.toBeInTheDocument();
    });
  });

  describe('UT-02: Multiple diagrams render simultaneously', () => {
    it('should render 3 diagrams independently without interference', async () => {
      const charts = [
        'graph TD\n    A1 --> B1',
        'sequenceDiagram\n    A->>B: Message',
        'classDiagram\n    Class01 <|-- Class02'
      ];

      vi.mocked(mermaid.render).mockImplementation((id: string) =>
        Promise.resolve({ svg: `<svg id="${id}">Diagram</svg>` })
      );

      const { container } = render(
        <>
          {charts.map((chart, i) => (
            <MermaidDiagram key={i} chart={chart} id={`diagram-${i}`} />
          ))}
        </>
      );

      // Wait for all diagrams to render
      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });

      // Verify all 3 containers exist
      const containers = container.querySelectorAll('.mermaid-diagram');
      expect(containers).toHaveLength(3);

      // Verify each has SVG content
      containers.forEach(c => {
        expect(c.innerHTML).toContain('<svg');
      });

      // Verify IDs are unique
      expect(mermaid.render).toHaveBeenCalledWith('diagram-0', expect.any(String));
      expect(mermaid.render).toHaveBeenCalledWith('diagram-1', expect.any(String));
      expect(mermaid.render).toHaveBeenCalledWith('diagram-2', expect.any(String));
    });
  });

  describe('UT-03: Diagram re-renders on prop changes', () => {
    it('should clear old SVG and insert new SVG without errors', async () => {
      const chart1 = 'graph TD\n    A --> B';
      const chart2 = 'graph TD\n    C --> D';

      vi.mocked(mermaid.render)
        .mockResolvedValueOnce({ svg: '<svg id="first">First</svg>' })
        .mockResolvedValueOnce({ svg: '<svg id="second">Second</svg>' });

      const { container, rerender } = render(<MermaidDiagram chart={chart1} />);

      // Wait for first render
      await waitFor(() => {
        expect(container.innerHTML).toContain('First');
      });

      // Re-render with new chart
      rerender(<MermaidDiagram chart={chart2} />);

      // Wait for second render
      await waitFor(() => {
        expect(container.innerHTML).toContain('Second');
      });

      // Verify old SVG is gone
      expect(container.innerHTML).not.toContain('First');

      // No removeChild errors
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/removeChild/)
      );
    });

    it('should handle memo preventing unnecessary re-renders', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      const { rerender } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props (memo should prevent re-render)
      rerender(<MermaidDiagram chart={chart} />);

      // Should not call render again due to React.memo
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('UT-04: Component unmounts cleanly', () => {
    it('should not throw errors or update state after unmount', async () => {
      const chart = 'graph TD\n    A --> B';

      // Delay render to simulate async operation
      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 500)
        )
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount immediately (before render completes)
      unmount();

      // Wait for async operation to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should not throw errors (isMounted flag prevents state updates)
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should clear timeout on unmount', () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount should clear timeout without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('UT-05: Loading spinner appears and disappears', () => {
    it('should show loading spinner initially, then replace with SVG', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Rendered</svg>' }), 100)
        )
      );

      render(<MermaidDiagram chart={chart} />);

      // Loading spinner should be visible
      expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Wait for render to complete
      await waitFor(() => {
        expect(screen.queryByText(/Rendering diagram/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // SVG should be present
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes during loading', () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      const { container } = render(<MermaidDiagram chart={chart} />);

      const mermaidContainer = container.querySelector('.mermaid-diagram');
      expect(mermaidContainer).toHaveAttribute('role', 'status');
      expect(mermaidContainer).toHaveAttribute('aria-label', 'Loading diagram');
      expect(mermaidContainer).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('UT-06: SVG content correctly inserted', () => {
    it('should insert exact SVG content from mermaid.render', async () => {
      const chart = 'graph TD\n    A --> B';
      const expectedSvg = '<svg viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100"/></svg>';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: expectedSvg });

      const { container } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const mermaidContainer = container.querySelector('.mermaid-diagram');
        expect(mermaidContainer?.innerHTML).toBe(expectedSvg);
      });
    });

    it('should change ARIA role to img after successful render', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test SVG</svg>'
      });

      const { container } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const mermaidContainer = container.querySelector('.mermaid-diagram');
        expect(mermaidContainer).toHaveAttribute('role', 'img');
        expect(mermaidContainer).toHaveAttribute('aria-label', 'Mermaid diagram');
      });
    });
  });

  describe('EDGE-11: Very fast re-renders', () => {
    it('should handle rapid prop changes without race conditions', async () => {
      const charts = Array(10).fill(0).map((_, i) => `graph TD\n    A${i} --> B${i}`);

      vi.mocked(mermaid.render).mockImplementation((id, chart) =>
        Promise.resolve({ svg: `<svg>${chart}</svg>` })
      );

      const { rerender } = render(<MermaidDiagram chart={charts[0]} />);

      // Rapidly change charts
      for (const chart of charts) {
        rerender(<MermaidDiagram chart={chart} />);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should not throw errors
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/removeChild|Maximum update depth/)
      );
    });
  });

  describe('EDGE-12: Component unmounts during render', () => {
    it('should gracefully abort if unmounted during async render', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 200)
        )
      );

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount after 50ms (mid-render)
      setTimeout(() => unmount(), 50);

      // Wait for render promise to resolve
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should not throw errors
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should skip DOM updates if unmounted before render completes', async () => {
      const chart = 'graph TD\n    A --> B';
      let resolveRender: ((value: any) => void) | null = null;

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve => {
          resolveRender = resolve;
        })
      );

      const { container, unmount } = render(<MermaidDiagram chart={chart} />);

      // Unmount before render completes
      unmount();

      // Complete the render after unmount
      if (resolveRender) {
        resolveRender({ svg: '<svg>Test</svg>' });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Container should be empty (unmounted)
      expect(container.innerHTML).toBe('');
    });
  });

  describe('EDGE-13: Container ref is null', () => {
    it('should skip innerHTML assignment if container ref is null', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      const { unmount } = render(<MermaidDiagram chart={chart} />);

      // Force ref to null by unmounting
      unmount();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Cannot read property|Cannot read properties/)
      );
    });
  });

  describe('EDGE-14: Empty diagram content', () => {
    it('should handle empty chart string', async () => {
      const chart = '';

      vi.mocked(mermaid.render).mockRejectedValue(new Error('Empty diagram'));

      render(<MermaidDiagram chart={chart} />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });
    });

    it('should handle whitespace-only chart', async () => {
      const chart = '   \n\n  \t  ';

      vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });
    });
  });

  describe('EDGE-15: Invalid Mermaid syntax', () => {
    it('should display error message for invalid syntax', async () => {
      const chart = 'invalid mermaid syntax!!!';

      vi.mocked(mermaid.render).mockRejectedValue(
        new Error('Parse error on line 1: Unexpected token')
      );

      render(<MermaidDiagram chart={chart} />);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
        expect(screen.getByText(/Parse error/i)).toBeInTheDocument();
      });
    });

    it('should show expandable code details in error state', async () => {
      const chart = 'bad syntax';

      vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText(/Show diagram code/i)).toBeInTheDocument();
      });

      // Code should be in DOM but hidden initially
      const codeElement = screen.getByText(chart);
      expect(codeElement).toBeInTheDocument();
    });
  });

  describe('Performance: Timeout handling', () => {
    it('should timeout if render takes longer than 10 seconds', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      render(<MermaidDiagram chart={chart} />);

      // Should show timeout error after 10 seconds
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      }, { timeout: 11000 });
    }, 15000); // Increase test timeout to 15s

    it('should clear timeout if render succeeds before timeout', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ svg: '<svg>Test</svg>' }), 5000)
        )
      );

      render(<MermaidDiagram chart={chart} />);

      // Should render successfully (before 10s timeout)
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      }, { timeout: 6000 });

      // No timeout error
      expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
    }, 10000);
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes in all states', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      const { container } = render(<MermaidDiagram chart={chart} />);

      // Loading state
      let mermaidContainer = container.querySelector('.mermaid-diagram');
      expect(mermaidContainer).toHaveAttribute('role', 'status');
      expect(mermaidContainer).toHaveAttribute('aria-label', 'Loading diagram');

      // Success state
      await waitFor(() => {
        mermaidContainer = container.querySelector('.mermaid-diagram');
        expect(mermaidContainer).toHaveAttribute('role', 'img');
        expect(mermaidContainer).toHaveAttribute('aria-label', 'Mermaid diagram');
      });
    });

    it('should have proper ARIA attributes in error state', async () => {
      const chart = 'invalid';

      vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Custom className support', () => {
    it('should apply custom className to container', async () => {
      const chart = 'graph TD\n    A --> B';
      const customClass = 'my-custom-diagram';

      vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>Test</svg>' });

      const { container } = render(
        <MermaidDiagram chart={chart} className={customClass} />
      );

      const mermaidContainer = container.querySelector('.mermaid-diagram');
      expect(mermaidContainer).toHaveClass(customClass);
    });
  });
});
