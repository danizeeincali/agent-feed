/**
 * Mermaid Flowchart and Diagram Tests - London School TDD
 *
 * Tests for MarkdownRenderer with Mermaid diagram support
 * Following London School methodology with mocked collaborators
 *
 * Test Coverage:
 * - Mermaid code block detection
 * - Flowchart rendering
 * - Sequence diagram rendering
 * - Invalid syntax handling
 * - Multiple diagrams on page
 * - Markdown + Mermaid integration
 * - Error boundaries and fallbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarkdownRenderer } from '@/components/dynamic-page/MarkdownRenderer';

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from 'mermaid';

describe('Mermaid Flowchart and Diagram Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful mermaid behavior
    (mermaid.parse as any).mockResolvedValue(true);
    (mermaid.render as any).mockResolvedValue({
      svg: '<svg><text>Mermaid Diagram</text></svg>',
    });
  });

  describe('Mermaid Block Detection', () => {
    it('should detect mermaid code block in markdown', async () => {
      const markdown = `
# Test Document

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(mermaid.initialize).toHaveBeenCalled();
      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalled();
      });
    });

    it('should ignore non-mermaid code blocks', async () => {
      const markdown = `
\`\`\`javascript
const x = 10;
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      // Mermaid should not be called for JavaScript code
      await waitFor(() => {
        expect(mermaid.parse).not.toHaveBeenCalled();
      });
    });

    it('should detect multiple mermaid blocks', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Some text in between

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle empty mermaid blocks', async () => {
      const markdown = `
\`\`\`mermaid
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalled();
      });
    });

    it('should detect mermaid block with various whitespace', async () => {
      const markdown = `
\`\`\`mermaid

graph TD
    A --> B

\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalled();
      });
    });
  });

  describe('Flowchart Rendering', () => {
    it('should render basic flowchart', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render flowchart with decision nodes', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Failure]
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        const chartCode = callArgs[1];
        expect(chartCode).toContain('Decision');
        expect(chartCode).toContain('Success');
        expect(chartCode).toContain('Failure');
      });
    });

    it('should render horizontal flowchart (LR)', async () => {
      const markdown = `
\`\`\`mermaid
graph LR
    A --> B --> C
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('graph LR');
      });
    });

    it('should render bottom-to-top flowchart (BT)', async () => {
      const markdown = `
\`\`\`mermaid
graph BT
    A --> B --> C
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('graph BT');
      });
    });

    it('should render flowchart with styling', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A[Start]:::highlight --> B[End]
    classDef highlight fill:#f9f,stroke:#333,stroke-width:4px
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });
  });

  describe('Sequence Diagram Rendering', () => {
    it('should render basic sequence diagram', async () => {
      const markdown = `
\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob->>Alice: Hello Alice
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('sequenceDiagram');
        expect(callArgs[1]).toContain('Alice->>Bob');
      });
    });

    it('should render sequence diagram with activations', async () => {
      const markdown = `
\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    activate A
    A->>B: Request
    activate B
    B-->>A: Response
    deactivate B
    deactivate A
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('activate');
        expect(callArgs[1]).toContain('deactivate');
      });
    });

    it('should render sequence diagram with loops', async () => {
      const markdown = `
\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
    loop Every minute
        Bob->>Alice: Ping
    end
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('loop');
      });
    });

    it('should render sequence diagram with alt/else', async () => {
      const markdown = `
\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Request
    alt Success
        Bob->>Alice: OK
    else Failure
        Bob->>Alice: Error
    end
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const callArgs = (mermaid.render as any).mock.calls[0];
        expect(callArgs[1]).toContain('alt');
        expect(callArgs[1]).toContain('else');
      });
    });
  });

  describe('Other Diagram Types', () => {
    it('should render class diagram', async () => {
      const markdown = `
\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +eat()
    }
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render state diagram', async () => {
      const markdown = `
\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render entity relationship diagram', async () => {
      const markdown = `
\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render pie chart', async () => {
      const markdown = `
\`\`\`mermaid
pie title Pets
    "Dogs" : 386
    "Cats" : 85
    "Birds" : 15
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render gantt chart', async () => {
      const markdown = `
\`\`\`mermaid
gantt
    title A Gantt Diagram
    section Section
    Task 1 :a1, 2025-01-01, 30d
    Task 2 :after a1, 20d
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });
  });

  describe('Invalid Syntax Handling', () => {
    it('should show error message for invalid syntax', async () => {
      (mermaid.parse as any).mockResolvedValue(false);

      const markdown = `
\`\`\`mermaid
invalid mermaid syntax here
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });
    });

    it('should show error for parse exceptions', async () => {
      (mermaid.parse as any).mockRejectedValue(new Error('Syntax error at line 1'));

      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
    C --> incomplete
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(screen.getByText(/Syntax error/i)).toBeInTheDocument();
      });
    });

    it('should display original code in error fallback', async () => {
      (mermaid.parse as any).mockResolvedValue(false);

      const badCode = 'invalid diagram';
      const markdown = `
\`\`\`mermaid
${badCode}
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const detailsElement = screen.getByText('Show diagram code');
        expect(detailsElement).toBeInTheDocument();
      });
    });

    it('should recover from render errors gracefully', async () => {
      (mermaid.render as any).mockRejectedValue(new Error('Render failed'));

      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during rendering', async () => {
      // Delay the render to see loading state
      (mermaid.render as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();
    });
  });

  describe('Multiple Diagrams on Page', () => {
    it('should render multiple different diagram types', async () => {
      const markdown = `
# Documentation

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

## Sequence

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hi
\`\`\`

## State

\`\`\`mermaid
stateDiagram-v2
    [*] --> Active
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(3);
      });
    });

    it('should generate unique IDs for each diagram', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`mermaid
graph TD
    C --> D
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const renderCalls = (mermaid.render as any).mock.calls;
        const firstId = renderCalls[0][0];
        const secondId = renderCalls[1][0];
        expect(firstId).not.toBe(secondId);
      });
    });

    it('should handle mixed valid and invalid diagrams', async () => {
      let callCount = 0;
      (mermaid.parse as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount !== 2); // Second diagram fails
      });

      const markdown = `
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
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.parse).toHaveBeenCalledTimes(3);
        expect(screen.getByText(/Invalid Mermaid Syntax/i)).toBeInTheDocument();
      });
    });
  });

  describe('Markdown + Mermaid Integration', () => {
    it('should render markdown text alongside mermaid diagrams', async () => {
      const markdown = `
# Project Workflow

This is the standard workflow for our project:

\`\`\`mermaid
graph TD
    A[Planning] --> B[Development]
    B --> C[Testing]
    C --> D[Deployment]
\`\`\`

Each phase is critical for success.
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText('Project Workflow')).toBeInTheDocument();
      expect(screen.getByText(/Each phase is critical/)).toBeInTheDocument();

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render markdown lists with mermaid diagrams', async () => {
      const markdown = `
## Features

- Feature 1
- Feature 2

\`\`\`mermaid
graph LR
    F1[Feature 1] --> F2[Feature 2]
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Feature 2')).toBeInTheDocument();

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should render markdown tables with mermaid diagrams', async () => {
      const markdown = `
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText('Column 1')).toBeInTheDocument();
      expect(screen.getByText('Value 1')).toBeInTheDocument();

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalled();
      });
    });

    it('should handle inline code and code blocks mixed with mermaid', async () => {
      const markdown = `
Use \`inline code\` for examples.

\`\`\`javascript
const x = 10;
\`\`\`

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText('inline code')).toBeInTheDocument();
      expect(screen.getByText('const x = 10;')).toBeInTheDocument();

      await waitFor(() => {
        expect(mermaid.render).toHaveBeenCalledTimes(1);
      });
    });

    it('should preserve markdown formatting in text around diagrams', async () => {
      const markdown = `
**Bold text** before diagram

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

*Italic text* after diagram
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      const boldText = screen.getByText('Bold text');
      expect(boldText).toHaveClass('font-bold');

      const italicText = screen.getByText('Italic text');
      expect(italicText.tagName.toLowerCase()).toBe('em');
    });
  });

  describe('Mermaid Configuration', () => {
    it('should initialize mermaid with correct configuration', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        expect(mermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict',
          })
        );
      });
    });

    it('should use strict security level', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const config = (mermaid.initialize as any).mock.calls[0][0];
        expect(config.securityLevel).toBe('strict');
      });
    });

    it('should configure flowchart options', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const config = (mermaid.initialize as any).mock.calls[0][0];
        expect(config.flowchart).toBeDefined();
        expect(config.flowchart.useMaxWidth).toBe(true);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should configure diagrams to use max width', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
      `.trim();

      const { container } = render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const diagramContainer = container.querySelector('.mermaid-diagram');
        expect(diagramContainer).toHaveStyle({ maxWidth: '100%' });
      });
    });

    it('should allow horizontal scrolling for wide diagrams', async () => {
      const markdown = `
\`\`\`mermaid
graph LR
    A --> B --> C --> D --> E --> F --> G --> H
\`\`\`
      `.trim();

      const { container } = render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const diagramContainer = container.querySelector('.mermaid-diagram');
        expect(diagramContainer).toHaveClass('overflow-x-auto');
      });
    });
  });

  describe('Accessibility', () => {
    it('should render diagram in accessible container', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
      `.trim();

      const { container } = render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const diagramContainer = container.querySelector('.mermaid-diagram');
        expect(diagramContainer).toBeInTheDocument();
      });
    });

    it('should provide error messages that are readable', async () => {
      (mermaid.parse as any).mockResolvedValue(false);

      const markdown = `
\`\`\`mermaid
invalid
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Invalid Mermaid Syntax/i);
        expect(errorMessage).toBeVisible();
      });
    });
  });
});
