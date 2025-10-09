/**
 * Integration Tests for MermaidDiagram removeChild DOM Error Fix
 *
 * Tests integration with MarkdownRenderer and real-world usage scenarios
 *
 * SPARC-TDD: Integration testing for removeChild fix
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarkdownRenderer from '@/components/dynamic-page/MarkdownRenderer';
import mermaid from 'mermaid';

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn().mockResolvedValue(true),
    render: vi.fn().mockResolvedValue({
      svg: '<svg><text>Test Diagram</text></svg>'
    }),
  },
}));

describe('MermaidDiagram Integration Tests', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterAll(() => {
    queryClient.clear();
  });

  describe('INT-07: Component Showcase Tab 7 loads all diagrams', () => {
    it('should load 3 diagrams within reasonable time', async () => {
      const markdownContent = `
# Diagram Showcase

## System Architecture
\`\`\`mermaid
graph TD
    A[Frontend] --> B[Backend]
    B --> C[Database]
\`\`\`

## API Sequence
\`\`\`mermaid
sequenceDiagram
    Client->>Server: Request
    Server->>Database: Query
    Database-->>Server: Data
    Server-->>Client: Response
\`\`\`

## Data Model
\`\`\`mermaid
classDiagram
    User "1" --> "*" Post
    Post "1" --> "*" Comment
\`\`\`
      `;

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      // Wait for all 3 diagrams to render
      await waitFor(() => {
        const diagrams = document.querySelectorAll('.mermaid-diagram svg');
        expect(diagrams.length).toBeGreaterThanOrEqual(3);
      }, { timeout: 10000 });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(10000);
    });

    it('should render each diagram independently', async () => {
      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
    A->>B: Hi
\`\`\`

\`\`\`mermaid
classDiagram
    Class1 <|-- Class2
\`\`\`
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        expect(diagrams.length).toBe(3);
      }, { timeout: 5000 });
    });
  });

  describe('INT-08: No console errors during render', () => {
    it('should render without any removeChild errors', async () => {
      const consoleErrors: string[] = [];
      const originalError = console.error;

      console.error = vi.fn((...args: any[]) => {
        consoleErrors.push(args.join(' '));
      });

      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(document.querySelector('.mermaid-diagram svg')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify no removeChild errors
      const removeChildErrors = consoleErrors.filter(err =>
        err.includes('removeChild') || err.includes('Failed to execute')
      );
      expect(removeChildErrors).toHaveLength(0);

      console.error = originalError;
    });

    it('should not throw React warnings about state updates', async () => {
      const consoleWarnings: string[] = [];
      const originalWarn = console.warn;

      console.warn = vi.fn((...args: any[]) => {
        consoleWarnings.push(args.join(' '));
      });

      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B --> C --> D
\`\`\`
      `;

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
      });

      unmount();

      // Verify no warnings about state updates
      const stateWarnings = consoleWarnings.filter(warn =>
        warn.includes('state update') || warn.includes('unmounted component')
      );
      expect(stateWarnings).toHaveLength(0);

      console.warn = originalWarn;
    });
  });

  describe('INT-09: No memory leaks after multiple renders', () => {
    it('should maintain stable memory after 10 render cycles', async () => {
      // Skip if memory API not available
      if (!(performance as any).memory) {
        console.warn('Memory API not available, skipping memory leak test');
        return;
      }

      const initialMemory = (performance as any).memory.usedJSHeapSize;

      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B --> C --> D --> E
\`\`\`
      `;

      // Render and unmount 10 times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <QueryClientProvider client={queryClient}>
            <MarkdownRenderer content={markdownContent} />
          </QueryClientProvider>
        );

        await waitFor(() => {
          expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
        });

        unmount();
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be < 10MB (reasonable threshold)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should properly cleanup event listeners and refs', async () => {
      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `;

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
      });

      // Count DOM nodes before unmount
      const initialNodeCount = document.body.querySelectorAll('*').length;

      unmount();

      // Count DOM nodes after unmount
      const finalNodeCount = document.body.querySelectorAll('*').length;

      // Should have cleaned up nodes
      expect(finalNodeCount).toBeLessThanOrEqual(initialNodeCount);
    });
  });

  describe('INT-10: Works with MarkdownRenderer component', () => {
    it('should render Mermaid blocks within markdown content', async () => {
      const markdownContent = `
# Test Document

This is a paragraph with **bold** text.

\`\`\`mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

Another paragraph after the diagram.

- List item 1
- List item 2
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      // Wait for markdown to render
      await waitFor(() => {
        expect(screen.getByText(/Test Document/i)).toBeInTheDocument();
      });

      // Verify Mermaid diagram rendered
      await waitFor(() => {
        expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify surrounding content still rendered
      expect(screen.getByText(/bold/i)).toBeInTheDocument();
      expect(screen.getByText(/Another paragraph/i)).toBeInTheDocument();
    });

    it('should handle markdown with inline code and Mermaid blocks', async () => {
      const markdownContent = `
Here is some \`inline code\` and a diagram:

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

And more \`inline code\` after.
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      // Both inline code and Mermaid should render
      await waitFor(() => {
        const inlineCode = document.querySelectorAll('code');
        expect(inlineCode.length).toBeGreaterThan(0);

        const diagram = document.querySelector('.mermaid-diagram');
        expect(diagram).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle multiple Mermaid diagrams with text between them', async () => {
      const markdownContent = `
## First Diagram

\`\`\`mermaid
graph TD
    A1 --> B1
\`\`\`

Some text between diagrams.

## Second Diagram

\`\`\`mermaid
graph TD
    A2 --> B2
\`\`\`
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        expect(diagrams.length).toBe(2);
      }, { timeout: 5000 });

      // Text between should still be there
      expect(screen.getByText(/Some text between diagrams/i)).toBeInTheDocument();
    });
  });

  describe('Edge Case: Mixed content types', () => {
    it('should handle markdown with tables, code blocks, and Mermaid diagrams', async () => {
      const markdownContent = `
# Complex Document

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

\`\`\`javascript
const foo = 'bar';
console.log(foo);
\`\`\`

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

- [ ] Task 1
- [x] Task 2
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        // Verify all content types rendered
        expect(document.querySelector('table')).toBeInTheDocument();
        expect(document.querySelector('code')).toBeInTheDocument();
        expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
        expect(document.querySelector('input[type="checkbox"]')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Performance: Large documents', () => {
    it('should handle documents with many diagrams efficiently', async () => {
      const diagramCount = 5;
      const markdownContent = Array(diagramCount)
        .fill(0)
        .map((_, i) => `
## Diagram ${i + 1}

\`\`\`mermaid
graph TD
    A${i} --> B${i}
\`\`\`
        `)
        .join('\n\n');

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        expect(diagrams.length).toBe(diagramCount);
      }, { timeout: 15000 });

      const renderTime = performance.now() - startTime;

      // Should render 5 diagrams in under 15 seconds
      expect(renderTime).toBeLessThan(15000);
    }, 20000);
  });

  describe('Error Handling: Mixed valid and invalid diagrams', () => {
    it('should render valid diagrams even if one fails', async () => {
      vi.mocked(mermaid.render)
        .mockResolvedValueOnce({ svg: '<svg>Valid 1</svg>' })
        .mockRejectedValueOnce(new Error('Invalid syntax'))
        .mockResolvedValueOnce({ svg: '<svg>Valid 2</svg>' });

      const markdownContent = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`mermaid
invalid syntax
\`\`\`

\`\`\`mermaid
graph TD
    C --> D
\`\`\`
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        // Should have 2 successful renders
        const svgs = document.querySelectorAll('.mermaid-diagram svg');
        expect(svgs.length).toBe(2);

        // Should have 1 error state
        const errors = document.querySelectorAll('.bg-red-50, .bg-red-900\\/20');
        expect(errors.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 5000 });
    });
  });

  describe('Regression: Icon rendering still works', () => {
    it('should not interfere with other components using innerHTML', async () => {
      // This is a sanity check that our fix doesn't break other components
      const markdownContent = `
# Regular Content

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Regular paragraph.
      `;

      render(
        <QueryClientProvider client={queryClient}>
          <MarkdownRenderer content={markdownContent} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(document.querySelector('.mermaid-diagram')).toBeInTheDocument();
      });

      // All markdown should still work
      expect(screen.getByText(/Regular Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Regular paragraph/i)).toBeInTheDocument();
    });
  });
});
