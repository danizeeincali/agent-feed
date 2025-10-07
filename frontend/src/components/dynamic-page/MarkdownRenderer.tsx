import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
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
 * Production-ready Markdown renderer component with XSS protection
 *
 * Features:
 * - GitHub-flavored markdown (tables, strikethrough, task lists, etc.)
 * - XSS protection using rehype-sanitize
 * - Code syntax highlighting with rehype-highlight
 * - Custom styled components with Tailwind CSS
 * - Responsive design
 * - Safe link handling (external links open in new tab)
 * - Image rendering with alt text
 * - Template variable support
 *
 * @example
 * ```tsx
 * <MarkdownRenderer
 *   content="# Hello World\n\nThis is **bold** text"
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

    // Paragraphs with proper spacing
    p: ({ children, ...props }) => (
      <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>
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

    // Lists with proper styling
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="ml-4" {...props}>
        {children}
      </li>
    ),

    // Blockquotes with border and background
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic text-gray-700 dark:text-gray-300"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Code blocks with syntax highlighting
    code: ({ className, children, ...props }) => {
      const isInline = !className;

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

      // Block code (syntax highlighting handled by rehype-highlight)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre
        className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 shadow-lg"
        {...props}
      >
        {children}
      </pre>
    ),

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
        className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
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

    // Strikethrough (GFM)
    del: ({ children, ...props }) => (
      <del className="line-through text-gray-500 dark:text-gray-400" {...props}>
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
    <div className={`markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none ${className}`}>
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
