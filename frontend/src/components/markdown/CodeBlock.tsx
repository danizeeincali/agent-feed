import React, { useState, memo, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

/**
 * CodeBlock Component
 *
 * Renders inline and block code with:
 * - Syntax highlighting (Prism with 10 languages)
 * - Mermaid diagram support (flowcharts, sequence diagrams, etc.)
 * - Line numbers (auto-show for >10 lines)
 * - Copy button with visual feedback
 * - Inline vs block detection
 * - Accessibility (ARIA, keyboard navigation)
 * - Performance optimization (memoization)
 *
 * SPARC SPEC: TDD with 54 tests covering all edge cases
 */

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  language?: string;
  showLineNumbers?: boolean;
}

// SPARC SPEC: Supported languages for syntax highlighting
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'bash', 'shell',
  'json', 'sql', 'markdown', 'html', 'css', 'jsx', 'tsx',
  'mermaid' // Special: renders as diagram, not code
];

/**
 * Extracts language from className (e.g., "language-javascript" -> "javascript")
 * @param className - CSS class string
 * @returns Language name or 'text' if not found
 */
const extractLanguage = (className?: string): string => {
  if (!className) return 'text';

  const match = className.match(/language-(\w+)/);
  if (match && match[1]) {
    const lang = match[1].toLowerCase();
    // Map common aliases
    if (lang === 'js') return 'javascript';
    if (lang === 'ts') return 'typescript';
    if (lang === 'py') return 'python';
    if (lang === 'sh') return 'bash';
    if (lang === 'md') return 'markdown';

    return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'text';
  }

  return 'text';
};

/**
 * Converts React children to plain string
 * @param children - React node children
 * @returns String representation of children
 */
const childrenToString = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(childrenToString).join('');
  }
  if (React.isValidElement(children) && children.props.children) {
    return childrenToString(children.props.children);
  }
  return '';
};

const CodeBlock: React.FC<CodeBlockProps> = memo(({
  inline = false,
  className = '',
  children,
  language: propLanguage,
  showLineNumbers: propShowLineNumbers
}) => {
  const [copied, setCopied] = useState(false);

  const code = childrenToString(children);
  const lang = propLanguage || extractLanguage(className);

  // SPARC SPEC: Auto-show line numbers for >10 lines
  const lineCount = code.split('\n').length;
  const shouldShowLineNumbers = propShowLineNumbers !== undefined
    ? propShowLineNumbers
    : lineCount > 10;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [code]);

  // SPARC SPEC: Inline code (simple monospace span)
  if (inline) {
    return (
      <code
        className={`bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono ${className}`}
      >
        {code}
      </code>
    );
  }

  // SPARC SPEC: Mermaid diagram rendering
  if (lang === 'mermaid') {
    return <MermaidDiagram chart={code} />;
  }

  // SPARC SPEC: Block code (syntax highlighted with copy button)
  return (
    <div
      className={`relative group my-4 rounded-lg overflow-hidden border border-gray-200 ${className}`}
      role="region"
      aria-label={`Code block in ${lang}`}
    >
      {/* Language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-xs font-medium">
        <span className="uppercase tracking-wide">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={lang}
        style={vscDarkPlus}
        showLineNumbers={shouldShowLineNumbers}
        wrapLines={true}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          backgroundColor: '#1e1e1e',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
export { extractLanguage, childrenToString };
