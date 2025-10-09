import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MermaidDiagram from '../MermaidDiagram';
import mermaid from 'mermaid';

/**
 * MermaidDiagram Component Tests
 *
 * Tests for Mermaid diagram rendering with error handling
 *
 * SPARC SPEC: Comprehensive test coverage for diagram rendering
 */

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(),
    render: vi.fn(),
  },
}));

describe('MermaidDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Rendering', () => {
    it('should render a valid mermaid diagram', async () => {
      const chart = 'graph TD\n    A --> B';

      // Mock successful parsing and rendering
      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test SVG</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      // Should show loading state initially
      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();

      // Wait for diagram to render
      await waitFor(() => {
        expect(mermaid.initialize).toHaveBeenCalled();
        expect(mermaid.parse).toHaveBeenCalledWith(chart);
      });
    });

    it('should initialize mermaid with strict security', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            securityLevel: 'strict',
            startOnLoad: false,
          })
        );
      });
    });

    it('should generate unique diagram IDs', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith(
          expect.stringMatching(/^mermaid-/),
          chart
        );
      });
    });

    it('should use custom ID when provided', async () => {
      const chart = 'graph TD\n    A --> B';
      const customId = 'my-custom-diagram';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} id={customId} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledWith(customId, chart);
      });
    });

    it('should trim whitespace from chart', async () => {
      const chart = '  \n  graph TD\n    A --> B  \n  ';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith(chart.trim());
        expect(mermaid.render).toHaveBeenCalledWith(
          expect.any(String),
          chart.trim()
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message for invalid syntax', async () => {
      const chart = 'invalid mermaid syntax';
      const errorMessage = 'Parse error on line 1';

      vi.mocked(mermaid.parse).mockRejectedValue(new Error(errorMessage));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Mermaid Syntax')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show expandable code details on error', async () => {
      const chart = 'invalid syntax';

      vi.mocked(mermaid.parse).mockRejectedValue(new Error('Parse error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText('Show diagram code')).toBeInTheDocument();
      });
    });

    it('should handle parse returning false', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(false);

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Mermaid Syntax')).toBeInTheDocument();
      });
    });

    it('should handle rendering errors', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockRejectedValue(new Error('Render failed'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(screen.getByText('Render failed')).toBeInTheDocument();
      });
    });

    it('should handle unknown errors gracefully', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockRejectedValue('Unknown error');

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(
          screen.getByText('Unknown error rendering diagram')
        ).toBeInTheDocument();
      });
    });

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const chart = 'invalid';
      const error = new Error('Test error');

      vi.mocked(mermaid.parse).mockRejectedValue(error);

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Mermaid rendering error:',
          error
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while rendering', () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MermaidDiagram chart={chart} />);

      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should hide loading state after successful render', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(
          screen.queryByText('Rendering diagram...')
        ).not.toBeInTheDocument();
      });
    });

    it('should hide loading state after error', async () => {
      const chart = 'invalid';

      vi.mocked(mermaid.parse).mockRejectedValue(new Error('Error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(
          screen.queryByText('Rendering diagram...')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for success state', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const diagram = screen.getByRole('img');
        expect(diagram).toHaveAttribute('aria-label', 'Mermaid diagram');
      });
    });

    it('should have proper ARIA labels for error state', async () => {
      const chart = 'invalid';

      vi.mocked(mermaid.parse).mockRejectedValue(new Error('Error'));

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for loading state', () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockImplementation(
        () => new Promise(() => {})
      );

      render(<MermaidDiagram chart={chart} />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply custom className', async () => {
      const chart = 'graph TD\n    A --> B';
      const customClass = 'my-custom-class';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      const { container } = render(
        <MermaidDiagram chart={chart} className={customClass} />
      );

      await waitFor(() => {
        const diagram = container.querySelector('.mermaid-diagram');
        expect(diagram).toHaveClass(customClass);
      });
    });

    it('should have default styling classes', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      const { container } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        const diagram = container.querySelector('.mermaid-diagram');
        expect(diagram).toHaveClass('flex');
        expect(diagram).toHaveClass('justify-center');
        expect(diagram).toHaveClass('rounded-lg');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chart string', async () => {
      const chart = '';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg></svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith('');
      });
    });

    it('should handle very long chart strings', async () => {
      const chart = 'graph TD\n' + 'A --> B\n'.repeat(100);

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Large diagram</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith(chart.trim());
      });
    });

    it('should handle special characters in chart', async () => {
      const chart = 'graph TD\n    A["User Input: \\"Hello\\""] --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith(chart);
      });
    });
  });

  describe('Re-rendering', () => {
    it('should re-render when chart changes', async () => {
      const chart1 = 'graph TD\n    A --> B';
      const chart2 = 'graph TD\n    C --> D';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      const { rerender } = render(<MermaidDiagram chart={chart1} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith(chart1);
      });

      rerender(<MermaidDiagram chart={chart2} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledWith(chart2);
      });
    });

    it('should not re-render when chart is the same', async () => {
      const chart = 'graph TD\n    A --> B';

      vi.mocked(mermaid.parse).mockResolvedValue(true);
      vi.mocked(mermaid.render).mockResolvedValue({
        svg: '<svg>Test</svg>',
      });

      const { rerender } = render(<MermaidDiagram chart={chart} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledTimes(1);
      });

      rerender(<MermaidDiagram chart={chart} />);

      // Should not call parse again due to React.memo
      expect(mermaid.parse).toHaveBeenCalledTimes(1);
    });
  });
});
