import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import CodeBlock from './CodeBlock';
import LinkRenderer from './LinkRenderer';

/**
 * MarkdownRenderer Component
 *
 * Main markdown rendering component with:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Syntax highlighting via CodeBlock
 * - Secure link rendering via LinkRenderer
 * - XSS protection (no dangerouslySetInnerHTML)
 * - Performance optimization (memoization)
 * - Accessibility (semantic HTML, ARIA)
 *
 * SPARC SPEC: 5-layer security, TDD with 45 tests
 */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Custom component overrides for react-markdown
 * Delegates code and links to specialized components
 */
const createMarkdownComponents = (): Components => ({
  // SPARC SPEC: Delegate code rendering to CodeBlock
  code: ({ inline, className, children, ...props }) => {
    return (
      <CodeBlock
        inline={inline}
        className={className}
        {...props}
      >
        {children}
      </CodeBlock>
    );
  },

  // SPARC SPEC: Delegate link rendering to LinkRenderer (security layer)
  a: ({ href, children, title, ...props }) => {
    return (
      <LinkRenderer
        href={href}
        title={title}
        {...props}
      >
        {children}
      </LinkRenderer>
    );
  },

  // SPARC SPEC: Table styling (GitHub-style)
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full divide-y divide-gray-300 border border-gray-300"
        {...props}
      >
        {children}
      </table>
    </div>
  ),

  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50" {...props}>
      {children}
    </thead>
  ),

  tbody: ({ children, ...props }) => (
    <tbody className="bg-white divide-y divide-gray-200" {...props}>
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
      className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      className="px-4 py-2 text-sm text-gray-900"
      {...props}
    >
      {children}
    </td>
  ),

  // SPARC SPEC: Blockquote styling
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 py-2 my-4 italic text-gray-700 bg-gray-50"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // SPARC SPEC: Heading styling with proper hierarchy
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props}>
      {children}
    </h1>
  ),

  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props}>
      {children}
    </h2>
  ),

  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props}>
      {children}
    </h3>
  ),

  h4: ({ children, ...props }) => (
    <h4 className="text-base font-semibold mt-3 mb-2 text-gray-900" {...props}>
      {children}
    </h4>
  ),

  h5: ({ children, ...props }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1 text-gray-900" {...props}>
      {children}
    </h5>
  ),

  h6: ({ children, ...props }) => (
    <h6 className="text-xs font-semibold mt-2 mb-1 text-gray-700" {...props}>
      {children}
    </h6>
  ),

  // SPARC SPEC: List styling
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside my-4 space-y-2 text-gray-900" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside my-4 space-y-2 text-gray-900" {...props}>
      {children}
    </ol>
  ),

  li: ({ children, ...props }) => (
    <li className="text-gray-900" {...props}>
      {children}
    </li>
  ),

  // SPARC SPEC: Paragraph styling
  p: ({ children, ...props }) => (
    <p className="my-2 text-gray-900 leading-relaxed" {...props}>
      {children}
    </p>
  ),

  // SPARC SPEC: Emphasis styling
  strong: ({ children, ...props }) => (
    <strong className="font-bold text-gray-900" {...props}>
      {children}
    </strong>
  ),

  em: ({ children, ...props }) => (
    <em className="italic text-gray-900" {...props}>
      {children}
    </em>
  ),

  del: ({ children, ...props }) => (
    <del className="line-through text-gray-600" {...props}>
      {children}
    </del>
  ),

  // SPARC SPEC: Horizontal rule
  hr: ({ ...props }) => (
    <hr className="my-6 border-t border-gray-300" {...props} />
  ),

  // SPARC SPEC: Image styling (responsive)
  img: ({ src, alt, title, ...props }) => (
    <img
      src={src}
      alt={alt || ''}
      title={title}
      className="max-w-full h-auto rounded-lg shadow-sm my-4"
      loading="lazy"
      {...props}
    />
  ),
});

const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({
  content,
  className = ''
}) => {
  // SPARC PERFORMANCE: Memoize components to prevent re-creation
  const components = useMemo(() => createMarkdownComponents(), []);

  // SPARC SECURITY: Sanitize content (remove null bytes, excessive whitespace)
  const sanitizedContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return '';
    }

    return content
      .replace(/\0/g, '') // Remove null bytes
      .trim();
  }, [content]);

  // SPARC EDGE CASE: Handle empty content
  if (!sanitizedContent) {
    return null;
  }

  return (
    <div
      className={`markdown-renderer prose prose-sm max-w-none ${className}`}
      role="article"
      aria-label="Markdown content"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
