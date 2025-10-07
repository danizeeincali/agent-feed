import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/**
 * Props for the Markdown component
 */
interface MarkdownProps {
  /**
   * Markdown content string or template variable to render
   */
  content: string;
  /**
   * Whether to sanitize HTML to prevent XSS attacks
   * @default true
   */
  sanitize?: boolean;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * Production-ready Markdown component with XSS protection and syntax highlighting
 *
 * Features:
 * - GitHub-flavored markdown (tables, strikethrough, task lists)
 * - XSS protection via HTML sanitization
 * - Syntax highlighting for code blocks
 * - Responsive Tailwind CSS styling
 * - Accessible heading hierarchy
 * - External links open in new tab with security
 *
 * @example
 * ```tsx
 * <Markdown content="# Hello World\n\nThis is **bold** text." />
 * ```
 */
export const Markdown: React.FC<MarkdownProps> = ({
  content,
  sanitize = true,
  className = '',
}) => {
  // Build rehype plugins array conditionally
  const rehypePlugins = [
    rehypeHighlight,
    ...(sanitize ? [rehypeSanitize] : []),
  ];

  return (
    <div
      className={`prose prose-slate dark:prose-invert max-w-none ${className}`}
      data-testid="markdown-container"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
          // Headings with proper hierarchy and styling
          h1: ({ node, ...props }) => (
            <h1
              className="text-4xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-3xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-2xl font-semibold mt-5 mb-2 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          h5: ({ node, ...props }) => (
            <h5
              className="text-lg font-semibold mt-3 mb-2 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          h6: ({ node, ...props }) => (
            <h6
              className="text-base font-semibold mt-3 mb-2 text-gray-700 dark:text-gray-300"
              {...props}
            />
          ),

          // Paragraph styling
          p: ({ node, ...props }) => (
            <p
              className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed"
              {...props}
            />
          ),

          // Links with external link security
          a: ({ node, href, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                {...(isExternal && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
                {...props}
              />
            );
          },

          // Code blocks with syntax highlighting
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`${className || ''} block bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Pre blocks for code
          pre: ({ node, ...props }) => (
            <pre
              className="mb-4 overflow-x-auto rounded-lg shadow-lg"
              {...props}
            />
          ),

          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50"
              {...props}
            />
          ),

          // Unordered lists
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4"
              {...props}
            />
          ),

          // Ordered lists
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4"
              {...props}
            />
          ),

          // List items
          li: ({ node, children, ...props }) => {
            // Check if this is a task list item
            const isTaskList = typeof children === 'object' &&
              Array.isArray(children) &&
              children.some(child =>
                child?.type === 'input' &&
                (child?.props?.type === 'checkbox')
              );

            if (isTaskList) {
              return (
                <li
                  className="flex items-start space-x-2 list-none -ml-4"
                  {...props}
                >
                  {children}
                </li>
              );
            }

            return (
              <li className="ml-4" {...props}>
                {children}
              </li>
            );
          },

          // Task list checkboxes
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  disabled
                  className="mt-1 mr-2 cursor-not-allowed"
                  {...props}
                />
              );
            }
            return <input {...props} />;
          },

          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table
                className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700 rounded-lg"
                {...props}
              />
            </div>
          ),

          thead: ({ node, ...props }) => (
            <thead
              className="bg-gray-100 dark:bg-gray-800"
              {...props}
            />
          ),

          tbody: ({ node, ...props }) => (
            <tbody
              className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900"
              {...props}
            />
          ),

          tr: ({ node, ...props }) => (
            <tr
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              {...props}
            />
          ),

          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),

          td: ({ node, ...props }) => (
            <td
              className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
              {...props}
            />
          ),

          // Images - responsive and accessible
          img: ({ node, alt, src, ...props }) => (
            <img
              src={src}
              alt={alt || 'Image'}
              className="max-w-full h-auto rounded-lg shadow-md my-4"
              loading="lazy"
              {...props}
            />
          ),

          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr
              className="my-8 border-gray-300 dark:border-gray-700"
              {...props}
            />
          ),

          // Strong (bold)
          strong: ({ node, ...props }) => (
            <strong
              className="font-bold text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),

          // Emphasis (italic)
          em: ({ node, ...props }) => (
            <em
              className="italic text-gray-800 dark:text-gray-200"
              {...props}
            />
          ),

          // Strikethrough (GFM)
          del: ({ node, ...props }) => (
            <del
              className="line-through text-gray-600 dark:text-gray-400"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
