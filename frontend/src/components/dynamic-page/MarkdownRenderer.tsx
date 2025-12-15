import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'highlight.js/styles/github-dark.css';
import type { Components } from 'react-markdown';

/**
 * Props interface for MarkdownRenderer component
 */
interface MarkdownProps {
  /** Markdown string content to render */
  content: string;
  /** Enable XSS protection via rehype-sanitize (default: true) */
  sanitize?: boolean;
  /** Additional CSS classes to apply to the container */
  className?: string;
}

/**
 * Error boundary component for Mermaid diagrams
 */
interface MermaidErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface MermaidErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MermaidErrorBoundary extends React.Component<
  MermaidErrorBoundaryProps,
  MermaidErrorBoundaryState
> {
  constructor(props: MermaidErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MermaidErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Mermaid rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
            <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
              Mermaid Diagram Error
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm font-mono">
              {this.state.error?.message || 'Failed to render diagram'}
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Mermaid diagram renderer component with error handling
 */
interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    // SPARC FIX: Track if component is mounted to prevent state updates after unmount
    let isMounted = true;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        if (isMounted) {
          setIsRendering(true);
          setError(null);
        }

        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          sequence: {
            useMaxWidth: true,
            wrap: true,
          },
          gantt: {
            useMaxWidth: true,
          },
          er: {
            useMaxWidth: true,
          },
          pie: {
            useMaxWidth: true,
          },
        });

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Validate chart syntax
        const isValid = await mermaid.parse(chart.trim());

        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, chart.trim());

        // SPARC REAL FIX: Store SVG in React state instead of manual DOM manipulation
        // This prevents removeChild errors by letting React manage all children
        if (isMounted) {
          setSvgContent(svg);  // React will handle rendering
          setIsRendering(false);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error rendering diagram');
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    // Cleanup: Prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
        <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
          Invalid Mermaid Syntax
        </p>
        <p className="text-red-600 dark:text-red-300 text-sm mb-3">{error}</p>
        <details className="text-xs">
          <summary className="cursor-pointer text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200">
            Show diagram code
          </summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-x-auto">
            <code className="text-red-800 dark:text-red-300">{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  // SPARC REAL FIX: Pure React solution - no manual DOM manipulation
  // React manages both loading spinner and SVG content via state
  return (
    <div
      ref={containerRef}
      className="mermaid-diagram flex justify-center items-center my-6 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-x-auto"
      style={{ maxWidth: '100%', minHeight: isRendering ? '120px' : undefined }}
    >
      {isRendering && (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300"></div>
          <span className="text-gray-700 dark:text-gray-300 text-sm">
            Rendering diagram...
          </span>
        </div>
      )}
      {svgContent && !isRendering && (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}
    </div>
  );
};

/**
 * Production-ready Markdown renderer component with XSS protection and Mermaid support
 *
 * Features:
 * - GitHub-flavored markdown (tables, strikethrough, task lists, etc.)
 * - XSS protection using rehype-sanitize
 * - Code syntax highlighting with rehype-highlight
 * - Mermaid diagram support (flowcharts, sequence diagrams, gantt charts, etc.)
 * - Custom styled components with Tailwind CSS
 * - Responsive design
 * - Safe link handling (external links open in new tab)
 * - Image rendering with alt text
 * - Template variable support
 * - Error boundaries for robust diagram rendering
 *
 * Supported Mermaid diagram types:
 * - Flowcharts (graph)
 * - Sequence diagrams
 * - Class diagrams
 * - State diagrams
 * - Entity Relationship diagrams
 * - User Journey diagrams
 * - Gantt charts
 * - Pie charts
 * - Git graphs
 *
 * @example
 * ```tsx
 * <MarkdownRenderer
 *   content={`
 *     # Project Flow
 *
 *     \`\`\`mermaid
 *     graph TD
 *         A[Start] --> B{Decision}
 *         B -->|Yes| C[Success]
 *         B -->|No| D[Try Again]
 *     \`\`\`
 *   `}
 *   sanitize={true}
 * />
 * ```
 */
export const MarkdownRenderer: React.FC<MarkdownProps> = ({
  content,
  sanitize = true,
  className = '',
}) => {
  /**
   * Custom component renderers for markdown elements
   * Provides Tailwind styling and safe rendering
   */
  const components: Components = {
    // Headings with proper hierarchy and spacing
    h1: ({ children, ...props }) => (
      <h1 className="text-4xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-3xl font-bold mb-3 mt-5 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-2xl font-semibold mb-3 mt-4 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-xl font-semibold mb-2 mt-3 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 className="text-lg font-semibold mb-2 mt-3 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 className="text-base font-semibold mb-2 mt-2 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h6>
    ),

    // Paragraphs with proper spacing and WCAG AA contrast
    p: ({ children, ...props }) => (
      <p className="mb-4 text-gray-900 dark:text-gray-200 leading-relaxed" {...props}>
        {children}
      </p>
    ),

    // Links - external links open in new tab with security attributes
    a: ({ href, children, ...props }) => {
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
      return (
        <a
          href={href}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
          {...(isExternal && {
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
          {...props}
        >
          {children}
        </a>
      );
    },

    // Images with responsive sizing and alt text
    img: ({ src, alt, ...props }) => (
      <img
        src={src}
        alt={alt || 'Image'}
        className="max-w-full h-auto rounded-lg my-4 shadow-md"
        loading="lazy"
        {...props}
      />
    ),

    // Lists with proper styling and WCAG AA contrast
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-900 dark:text-gray-200" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-900 dark:text-gray-200" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="ml-4" {...props}>
        {children}
      </li>
    ),

    // Blockquotes with border, background, and WCAG AA contrast
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic text-gray-900 dark:text-gray-200"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Code blocks with syntax highlighting and Mermaid support
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      const match = /language-(\w+)/.exec(className || '');
      const language = match?.[1];

      if (isInline) {
        // Inline code
        return (
          <code
            className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      // Check if this is a mermaid code block
      if (language === 'mermaid') {
        const chartCode = String(children).replace(/\n$/, '');
        return (
          <MermaidErrorBoundary>
            <MermaidDiagram chart={chartCode} />
          </MermaidErrorBoundary>
        );
      }

      // Block code (syntax highlighting handled by rehype-highlight)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => {
      // Check if the pre contains a mermaid code block
      const childIsCodeElement = React.isValidElement(children) && children.type === 'code';
      if (childIsCodeElement) {
        const codeProps = children.props as any;
        const className = codeProps?.className || '';
        if (className.includes('language-mermaid')) {
          // Return just the code element, which will be handled by the code renderer above
          return <>{children}</>;
        }
      }

      return (
        <pre
          className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 shadow-lg"
          {...props}
        >
          {children}
        </pre>
      );
    },

    // Horizontal rules
    hr: (props) => (
      <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
    ),

    // Tables with responsive design
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200"
        {...props}
      >
        {children}
      </td>
    ),

    // Strong (bold) and emphasis (italic)
    strong: ({ children, ...props }) => (
      <strong className="font-bold text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),

    // Strikethrough (GFM) with improved contrast
    del: ({ children, ...props }) => (
      <del className="line-through text-gray-600 dark:text-gray-400" {...props}>
        {children}
      </del>
    ),

    // Task lists (GFM)
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2 align-middle"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
  };

  /**
   * Build rehype plugins array
   * Conditionally include sanitization based on props
   */
  const rehypePlugins = [
    rehypeHighlight, // Syntax highlighting for code blocks
    ...(sanitize ? [rehypeSanitize] : []), // XSS protection
  ];

  return (
    <div className={`markdown-renderer max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // GitHub-flavored markdown
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
