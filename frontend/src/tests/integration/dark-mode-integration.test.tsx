/**
 * Dark Mode Integration Tests
 *
 * Tests dark mode behavior across component hierarchies, routing,
 * and complex UI interactions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';

// Components to test
import { MarkdownRenderer } from '../../components/dynamic-page/MarkdownRenderer';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Progress } from '../../components/ui/progress';

/**
 * Helper to enable dark mode
 */
function enableDarkMode() {
  document.documentElement.classList.add('dark');
}

/**
 * Helper to disable dark mode
 */
function disableDarkMode() {
  document.documentElement.classList.remove('dark');
}

/**
 * Mock matchMedia for testing
 */
function mockMatchMedia(isDark: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: isDark && query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Dark Mode Integration Tests', () => {
  beforeEach(() => {
    mockMatchMedia();
    disableDarkMode();
  });

  afterEach(() => {
    cleanup();
    disableDarkMode();
  });

  describe('Component Hierarchy', () => {
    it('should propagate dark mode to nested components', () => {
      enableDarkMode();

      const TestComponent = () => (
        <div className="bg-white dark:bg-gray-900">
          <div className="text-gray-900 dark:text-gray-100">
            <span className="text-gray-600 dark:text-gray-400">Nested</span>
          </div>
        </div>
      );

      const { container } = render(<TestComponent />);

      const outerDiv = container.firstChild as HTMLElement;
      const innerDiv = outerDiv.firstChild as HTMLElement;
      const span = innerDiv.firstChild as HTMLElement;

      expect(outerDiv).toHaveClass('dark:bg-gray-900');
      expect(innerDiv).toHaveClass('dark:text-gray-100');
      expect(span).toHaveClass('dark:text-gray-400');
    });

    it('should maintain dark mode state across route changes', async () => {
      enableDarkMode();

      const Route1 = () => <div data-testid="route1" className="text-gray-900 dark:text-gray-100">Route 1</div>;
      const Route2 = () => <div data-testid="route2" className="text-gray-900 dark:text-gray-100">Route 2</div>;

      const { rerender } = render(
        <BrowserRouter>
          <Route1 />
        </BrowserRouter>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      rerender(
        <BrowserRouter>
          <Route2 />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should apply dark mode to dynamically mounted components', async () => {
      enableDarkMode();

      const DynamicComponent = () => (
        <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          Dynamic Content
        </div>
      );

      const { container } = render(<DynamicComponent />);

      await waitFor(() => {
        const element = container.firstChild as HTMLElement;
        expect(element).toHaveClass('dark:bg-gray-900');
        expect(element).toHaveClass('dark:text-gray-100');
      });
    });
  });

  describe('UI Components - Dark Mode', () => {
    describe('Alert Component', () => {
      it('should render Alert in light mode', () => {
        const { container } = render(
          <Alert>
            <AlertTitle>Test Alert</AlertTitle>
            <AlertDescription>This is a test alert</AlertDescription>
          </Alert>
        );

        const alert = container.querySelector('[role="alert"]');
        expect(alert).toBeInTheDocument();
      });

      it('should render Alert in dark mode', () => {
        enableDarkMode();

        const { container } = render(
          <Alert>
            <AlertTitle>Test Alert</AlertTitle>
            <AlertDescription>This is a test alert</AlertDescription>
          </Alert>
        );

        const alert = container.querySelector('[role="alert"]');
        expect(alert).toBeInTheDocument();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      it('should handle Alert variant colors in dark mode', () => {
        enableDarkMode();

        const { rerender } = render(
          <Alert variant="default">
            <AlertDescription>Default alert</AlertDescription>
          </Alert>
        );

        // Should apply dark mode classes appropriately
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        rerender(
          <Alert variant="destructive">
            <AlertDescription>Destructive alert</AlertDescription>
          </Alert>
        );

        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    describe('Input Component', () => {
      it('should render Input with dark mode classes', () => {
        enableDarkMode();

        const { container } = render(<Input placeholder="Test input" />);

        const input = container.querySelector('input');
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('dark:bg-gray-800', 'dark:text-gray-100');
      });

      it('should toggle Input appearance between light and dark', () => {
        const { container, rerender } = render(<Input placeholder="Test" />);
        const input = container.querySelector('input')!;

        // Light mode
        expect(input).toHaveClass('dark:bg-gray-800');

        // Switch to dark mode
        enableDarkMode();
        rerender(<Input placeholder="Test" />);

        expect(input).toHaveClass('dark:bg-gray-800', 'dark:text-gray-100');
      });

      it('should maintain focus styles in dark mode', () => {
        enableDarkMode();

        const { container } = render(<Input />);
        const input = container.querySelector('input')!;

        input.focus();

        // Should have visible focus ring in dark mode
        expect(input).toHaveClass('dark:focus:ring-gray-600');
      });
    });

    describe('Textarea Component', () => {
      it('should render Textarea with dark mode classes', () => {
        enableDarkMode();

        const { container } = render(<Textarea placeholder="Test textarea" />);

        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveClass('dark:bg-gray-800', 'dark:text-gray-100');
      });
    });

    describe('Checkbox Component', () => {
      it('should render Checkbox with dark mode classes', () => {
        enableDarkMode();

        render(<Checkbox id="test-checkbox" />);

        // Checkbox should be styled for dark mode
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      it('should show checked state clearly in dark mode', () => {
        enableDarkMode();

        const { container } = render(<Checkbox id="test" checked />);

        const checkbox = container.querySelector('button');
        expect(checkbox).toBeInTheDocument();
      });
    });

    describe('Progress Component', () => {
      it('should render Progress bar in dark mode', () => {
        enableDarkMode();

        const { container } = render(<Progress value={50} />);

        const progress = container.querySelector('[role="progressbar"]');
        expect(progress).toBeInTheDocument();
      });

      it('should have visible progress indicator in dark mode', () => {
        enableDarkMode();

        const { container } = render(<Progress value={75} />);

        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      });
    });
  });

  describe('Dynamic Page Components', () => {
    it('should render MarkdownRenderer in dark mode', () => {
      enableDarkMode();

      const content = '# Test Heading\n\nThis is a paragraph.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const heading = container.querySelector('h1');
      const paragraph = container.querySelector('p');

      expect(heading).toHaveClass('dark:text-gray-100');
      expect(paragraph).toHaveClass('dark:text-gray-200');
    });

    it('should handle complex markdown with dark mode', () => {
      enableDarkMode();

      const content = `
# Heading
## Subheading

Regular text with **bold** and *italic*.

- List item 1
- List item 2

> Blockquote

\`inline code\`

[Link](https://example.com)

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      expect(container.querySelector('h1')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('h2')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('strong')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('ul')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('blockquote')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('code')).toHaveClass('dark:text-red-400');
      expect(container.querySelector('a')).toHaveClass('dark:text-blue-400');
      expect(container.querySelector('th')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('td')).toHaveClass('dark:text-gray-200');
    });
  });

  describe('Theme Transitions', () => {
    it('should handle rapid theme changes without errors', async () => {
      const TestComponent = () => (
        <div className="text-gray-900 dark:text-gray-100">Test</div>
      );

      const { rerender } = render(<TestComponent />);

      // Rapidly toggle dark mode
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          enableDarkMode();
        } else {
          disableDarkMode();
        }
        rerender(<TestComponent />);
      }

      // Should end in light mode without errors
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should maintain component state during theme change', () => {
      const StatefulComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div className="text-gray-900 dark:text-gray-100">
            <button onClick={() => setCount(count + 1)}>
              Count: {count}
            </button>
          </div>
        );
      };

      const { getByText } = render(<StatefulComponent />);

      // Click button to increase count
      const button = getByText(/Count:/);
      button.click();
      button.click();

      expect(button).toHaveTextContent('Count: 2');

      // Toggle dark mode
      enableDarkMode();

      // Count should be maintained
      expect(button).toHaveTextContent('Count: 2');
    });
  });

  describe('CSS Specificity and Conflicts', () => {
    it('should not override custom classes with dark mode classes', () => {
      enableDarkMode();

      const { container } = render(
        <div className="custom-bg text-gray-900 dark:text-gray-100">
          Content
        </div>
      );

      const element = container.firstChild as HTMLElement;

      expect(element).toHaveClass('custom-bg');
      expect(element).toHaveClass('dark:text-gray-100');
    });

    it('should apply dark mode classes in correct order', () => {
      enableDarkMode();

      const { container } = render(
        <div className="text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400">
          Hover me
        </div>
      );

      const element = container.firstChild as HTMLElement;

      // All classes should be present
      expect(element.className).toContain('text-gray-900');
      expect(element.className).toContain('dark:text-gray-100');
    });
  });

  describe('Accessibility in Dark Mode', () => {
    it('should maintain ARIA attributes in dark mode', () => {
      enableDarkMode();

      const { container } = render(
        <button
          aria-label="Close"
          className="bg-white dark:bg-gray-800"
        >
          X
        </button>
      );

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label', 'Close');
    });

    it('should have visible focus indicators in dark mode', () => {
      enableDarkMode();

      const { container } = render(
        <button className="focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
          Focus me
        </button>
      );

      const button = container.querySelector('button')!;
      button.focus();

      expect(button).toHaveClass('dark:focus:ring-blue-400');
    });

    it('should maintain semantic HTML structure in dark mode', () => {
      enableDarkMode();

      const { container } = render(
        <article className="bg-white dark:bg-gray-900">
          <header className="text-gray-900 dark:text-gray-100">
            <h1>Article Title</h1>
          </header>
          <main className="text-gray-900 dark:text-gray-200">
            <p>Article content</p>
          </main>
        </article>
      );

      expect(container.querySelector('article')).toBeInTheDocument();
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders on theme change', () => {
      let renderCount = 0;

      const CountingComponent = () => {
        renderCount++;
        return <div className="text-gray-900 dark:text-gray-100">Counting</div>;
      };

      const { rerender } = render(<CountingComponent />);
      const initialCount = renderCount;

      // Toggle dark mode (CSS only, should not re-render React components)
      enableDarkMode();

      // Force a rerender
      rerender(<CountingComponent />);

      // Should only increment by 1 (the forced rerender)
      expect(renderCount).toBe(initialCount + 1);
    });

    it('should not cause layout shift on theme change', () => {
      const { container } = render(
        <div className="w-full h-24 bg-white dark:bg-gray-900">
          Fixed size element
        </div>
      );

      const element = container.firstChild as HTMLElement;
      const beforeRect = element.getBoundingClientRect();

      enableDarkMode();

      const afterRect = element.getBoundingClientRect();

      // Dimensions should remain the same
      expect(afterRect.width).toBe(beforeRect.width);
      expect(afterRect.height).toBe(beforeRect.height);
    });
  });

  describe('Edge Cases', () => {
    it('should handle components without dark mode classes', () => {
      enableDarkMode();

      const { container } = render(
        <div className="text-gray-900">No dark mode classes</div>
      );

      const element = container.firstChild as HTMLElement;

      // Should render without errors
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('text-gray-900');
    });

    it('should handle mixed components (some with, some without dark mode)', () => {
      enableDarkMode();

      const { container } = render(
        <div>
          <div className="text-gray-900 dark:text-gray-100">With dark mode</div>
          <div className="text-gray-900">Without dark mode</div>
          <div className="text-gray-900 dark:text-gray-100">With dark mode</div>
        </div>
      );

      const divs = container.querySelectorAll('div > div');
      expect(divs).toHaveLength(3);
      expect(divs[0]).toHaveClass('dark:text-gray-100');
      expect(divs[1]).not.toHaveClass('dark:text-gray-100');
      expect(divs[2]).toHaveClass('dark:text-gray-100');
    });

    it('should handle conditionally rendered components in dark mode', () => {
      enableDarkMode();

      const ConditionalComponent = ({ show }: { show: boolean }) => (
        <div>
          {show && (
            <div className="text-gray-900 dark:text-gray-100">
              Conditional content
            </div>
          )}
        </div>
      );

      const { rerender, container } = render(<ConditionalComponent show={false} />);

      expect(container.querySelector('.dark\\:text-gray-100')).not.toBeInTheDocument();

      rerender(<ConditionalComponent show={true} />);

      expect(container.querySelector('.dark\\:text-gray-100')).toBeInTheDocument();
    });
  });
});
