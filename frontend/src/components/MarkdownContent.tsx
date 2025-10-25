/**
 * MarkdownContent Component
 *
 * Renders markdown content while preserving interactive elements (@mentions, #hashtags, URLs).
 * Implements SPARC architecture with security, performance, and accessibility considerations.
 *
 * @module components/MarkdownContent
 */

import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import {
  extractSpecialTokens,
  sanitizeMarkdown,
  type SpecialToken
} from '../utils/markdownParser';
import 'highlight.js/styles/github-dark.css';

/**
 * Props for the MarkdownContent component
 */
export interface MarkdownContentProps {
  /** Raw markdown content to render */
  content: string;
  /** Callback when a mention is clicked */
  onMentionClick?: (agent: string) => void;
  /** Callback when a hashtag is clicked */
  onHashtagClick?: (tag: string) => void;
  /** Whether to enable link previews (URLs will be extracted) */
  enableLinkPreviews?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to enable markdown rendering (default: true) */
  enableMarkdown?: boolean;
}

/**
 * MarkdownContent Component
 *
 * Features:
 * - Full GitHub Flavored Markdown support
 * - Interactive @mentions and #hashtags preserved
 * - Security: XSS prevention via sanitization
 * - Performance: Memoized rendering
 * - Accessibility: WCAG 2.1 AA compliant
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <MarkdownContent
 *   content="# Hello @alice\n\nCheck #update at https://example.com"
 *   onMentionClick={(agent) => console.log('Clicked:', agent)}
 *   onHashtagClick={(tag) => console.log('Tag:', tag)}
 *   enableLinkPreviews={true}
 * />
 * ```
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = React.memo(({
  content,
  onMentionClick,
  onHashtagClick,
  enableLinkPreviews = true,
  className = '',
  enableMarkdown = true
}) => {
  // Handle empty content
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return (
      <div className={`markdown-content ${className}`} role="article" aria-label="Content">
        <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300"></p>
      </div>
    );
  }

  // Sanitize content first (pre-processing)
  const sanitizedContent = useMemo(() => sanitizeMarkdown(content), [content]);

  // Extract special tokens and get processed content
  const extraction = useMemo(() => {
    return extractSpecialTokens(sanitizedContent, {
      extractMentions: true,
      extractHashtags: true,
      extractUrls: enableLinkPreviews,
      preserveMarkdownHeaders: true
    });
  }, [sanitizedContent, enableLinkPreviews]);

  // Render special token (mention, hashtag, or URL)
  const renderToken = useCallback((token: SpecialToken) => {
    switch (token.type) {
      case 'mention':
        return (
          <button
            onClick={() => onMentionClick?.(token.data.agent!)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center"
            title={`View posts by ${token.data.agent}`}
            data-mention={token.data.agent}
            data-type="mention"
            data-testid={`mention-${token.data.agent}`}
            type="button"
          >
            {token.originalContent}
          </button>
        );

      case 'hashtag':
        return (
          <button
            onClick={() => onHashtagClick?.(token.data.tag!)}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline font-medium bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center"
            title={`View posts with ${token.originalContent}`}
            data-hashtag={token.data.tag}
            data-type="hashtag"
            data-testid={`hashtag-${token.data.tag}`}
            type="button"
          >
            {token.originalContent}
          </button>
        );

      case 'url':
        const displayUrl = token.originalContent.length > 60
          ? token.originalContent.slice(0, 57) + '...'
          : token.originalContent;

        // Extract URL index from token ID (e.g., "___URL_0___" -> "0")
        const urlIndexMatch = token.id.match(/_URL_(\d+)_/);
        const urlIndex = urlIndexMatch ? urlIndexMatch[1] : '0';

        return (
          <a
            href={token.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-all inline-flex items-center"
            data-url={token.data.url}
            data-type="url"
            data-testid={`url-${urlIndex}`}
          >
            {displayUrl}
          </a>
        );

      default:
        return <span>{token.originalContent}</span>;
    }
  }, [onMentionClick, onHashtagClick]);

  // Process text content to restore placeholders
  const processTextContent = useCallback((text: string): React.ReactNode => {
    // Check if text contains placeholders
    const hasPlaceholder = text.includes('___MENTION_') ||
                          text.includes('___HASHTAG_') ||
                          text.includes('___URL_');

    if (!hasPlaceholder) {
      return text;
    }

    // Split text by placeholders
    const segments: React.ReactNode[] = [];
    let key = 0;

    // Find all placeholders in order
    const placeholderRegex = /(___(?:MENTION|HASHTAG|URL)_\d+___)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholderId = match[1];
      const position = match.index;

      // Add text before placeholder
      if (position > lastIndex) {
        const textSegment = text.slice(lastIndex, position);
        segments.push(<span key={`text-${key++}`}>{textSegment}</span>);
      }

      // Add token component
      const token = extraction.tokenMap.get(placeholderId);
      if (token) {
        segments.push(
          <React.Fragment key={`token-${key++}`}>
            {renderToken(token)}
          </React.Fragment>
        );
      } else {
        // Fallback if token not found
        segments.push(<span key={`ph-${key++}`}>{placeholderId}</span>);
      }

      lastIndex = position + placeholderId.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(<span key={`text-${key++}`}>{text.slice(lastIndex)}</span>);
    }

    return <>{segments}</>;
  }, [extraction.tokenMap, renderToken]);

  // Create custom renderers for react-markdown
  const customComponents = useMemo<Components>(() => ({
    // Text renderer - restores placeholders
    p: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });

      return (
        <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
          {processedChildren}
        </p>
      );
    },

    // Headings - process text content for placeholders
    h1: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6 border-b-2 border-gray-200 dark:border-gray-700 pb-2" {...props}>
          {processedChildren}
        </h1>
      );
    },

    h2: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-5 border-b border-gray-200 dark:border-gray-700 pb-1" {...props}>
          {processedChildren}
        </h2>
      );
    },

    h3: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-4" {...props}>
          {processedChildren}
        </h3>
      );
    },

    h4: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-3" {...props}>
          {processedChildren}
        </h4>
      );
    },

    h5: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h5 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-3" {...props}>
          {processedChildren}
        </h5>
      );
    },

    h6: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <h6 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-3" {...props}>
          {processedChildren}
        </h6>
      );
    },

    // Code blocks
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono border border-gray-200 dark:border-gray-700" {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="relative mb-4">
          {language && (
            <div className="absolute top-2 right-2 text-xs text-gray-400 uppercase font-semibold bg-gray-800 px-2 py-1 rounded">
              {language}
            </div>
          )}
          <pre className="rounded-lg overflow-x-auto bg-gray-900 dark:bg-gray-950 border border-gray-700">
            <code className={`block p-4 text-sm leading-relaxed ${className || ''}`} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },

    // Links
    a: ({ href, children, ...props }) => {
      // Security: validate URL
      if (!href || href.startsWith('javascript:') || href.startsWith('data:')) {
        return <span className="text-gray-500">{children}</span>;
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-700 transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic" {...props}>
        {children}
      </blockquote>
    ),

    // Lists
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }) => (
      <li className="leading-relaxed" {...props}>{children}</li>
    ),

    // Tables
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }) => (
      <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
        {children}
      </thead>
    ),

    tbody: ({ children, ...props }) => (
      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700" {...props}>
        {children}
      </tbody>
    ),

    th: ({ children, ...props }) => (
      <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 border-b-2 border-gray-300 dark:border-gray-600" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }) => (
      <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700" {...props}>
        {children}
      </td>
    ),

    // Horizontal rule
    hr: (props) => (
      <hr className="my-8 border-0 border-t-2 border-gray-200 dark:border-gray-700" {...props} />
    ),

    // Strong - process text content
    strong: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <strong className="font-bold text-gray-900 dark:text-gray-100" {...props}>
          {processedChildren}
        </strong>
      );
    },

    // Emphasis - process text content
    em: ({ children, ...props }) => {
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processTextContent(child);
        }
        return child;
      });
      return (
        <em className="italic" {...props}>
          {processedChildren}
        </em>
      );
    },

    // Strikethrough
    del: ({ children, ...props }) => (
      <del className="text-gray-500 dark:text-gray-400 line-through" {...props}>
        {children}
      </del>
    )
  }), [processTextContent]);

  // Sanitization schema for rehype-sanitize
  const sanitizationSchema = useMemo(() => {
    return {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        code: [
          ...(defaultSchema.attributes?.code || []),
          ['className', /^language-./, 'hljs']
        ]
      },
      protocols: {
        href: ['http', 'https', 'mailto'],
        src: ['http', 'https']
      }
    };
  }, []);

  // Skip markdown rendering if disabled or no markdown detected
  if (!enableMarkdown || !extraction.hasMarkdown) {
    const processedText = processTextContent(extraction.processedContent);
    return (
      <div className={`markdown-content ${className}`} role="article" aria-label="Content">
        <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
          {processedText}
        </p>
      </div>
    );
  }

  return (
    <div className={`markdown-content ${className}`} role="article" aria-label="Markdown content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, sanitizationSchema],
          rehypeHighlight
        ]}
        components={customComponents}
      >
        {extraction.processedContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownContent.displayName = 'MarkdownContent';

export default MarkdownContent;
