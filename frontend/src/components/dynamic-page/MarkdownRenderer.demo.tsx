import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * Interactive Demo for MarkdownRenderer
 *
 * This demo allows you to test the MarkdownRenderer component
 * with live editing and various examples.
 */

const defaultMarkdown = `# Welcome to MarkdownRenderer

This is a **production-ready** markdown renderer with:

- GitHub Flavored Markdown support
- Syntax highlighting for code
- XSS protection (enabled by default)
- Responsive tables
- And much more!

## Try editing this markdown!

You can type in the editor on the left and see the results here.

### Code Example

\`\`\`typescript
const greet = (name: string): string => {
  return \`Hello, \${name}!\`;
};

console.log(greet("World"));
\`\`\`

### Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| Tables | ✅ | Responsive |
| Code | ✅ | Syntax highlighted |
| Links | ✅ | Safe by default |

### Task List

- [x] Implement MarkdownRenderer
- [x] Add XSS protection
- [x] Add syntax highlighting
- [ ] Add more examples

> **Note:** This component is safe by default and sanitizes all HTML!
`;

const examples = {
  basic: `# Basic Example

This shows **bold**, *italic*, and ~~strikethrough~~ text.

Here's a [link](https://example.com) and some \`inline code\`.`,

  code: `# Code Examples

JavaScript:
\`\`\`javascript
const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};
\`\`\`

Python:
\`\`\`python
def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)
\`\`\`

Bash:
\`\`\`bash
#!/bin/bash
echo "Hello from Bash!"
for i in {1..5}; do
  echo "Count: $i"
done
\`\`\``,

  table: `# Table Examples

| Name | Age | Country |
|------|-----|---------|
| Alice | 30 | USA |
| Bob | 25 | UK |
| Charlie | 35 | Canada |

## Complex Table

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Users | 1 | 10 | Unlimited |
| Storage | 1GB | 100GB | Unlimited |
| Support | Email | Priority | Dedicated |
| Price | $0 | $29/mo | Custom |`,

  lists: `# Lists

## Unordered
- Item 1
- Item 2
  - Nested 2.1
  - Nested 2.2
- Item 3

## Ordered
1. First
2. Second
3. Third

## Task Lists
- [x] Completed
- [ ] In Progress
- [ ] Todo`,

  xss: `# XSS Protection Demo

This content tries to inject malicious code:

<script>alert("This won't execute!")</script>

<a href="javascript:alert('Blocked!')">Dangerous Link</a>

<img src="x" onerror="alert('Also blocked!')">

All dangerous content is sanitized automatically! ✅`,
};

export const MarkdownRendererDemo: React.FC = () => {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [sanitize, setSanitize] = useState(true);
  const [selectedExample, setSelectedExample] = useState<keyof typeof examples | 'custom'>('custom');

  const loadExample = (key: keyof typeof examples) => {
    setMarkdown(examples[key]);
    setSelectedExample(key);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            MarkdownRenderer Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive demo for the production-ready Markdown component
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sanitize}
                  onChange={(e) => setSanitize(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  XSS Protection
                </span>
              </label>
            </div>

            <div className="flex-1" />

            <div className="flex gap-2">
              <button
                onClick={() => loadExample('basic')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedExample === 'basic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Basic
              </button>
              <button
                onClick={() => loadExample('code')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedExample === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => loadExample('table')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedExample === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tables
              </button>
              <button
                onClick={() => loadExample('lists')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedExample === 'lists'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Lists
              </button>
              <button
                onClick={() => loadExample('xss')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedExample === 'xss'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                XSS Demo
              </button>
            </div>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Markdown Input
              </h2>
            </div>
            <textarea
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                setSelectedExample('custom');
              }}
              className="w-full h-[600px] p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
              placeholder="Enter markdown here..."
            />
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Preview
              </h2>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  sanitize
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {sanitize ? 'Sanitized' : 'Unsanitized'}
                </span>
              </div>
            </div>
            <div className="h-[600px] overflow-y-auto p-4">
              <MarkdownRenderer
                content={markdown}
                sanitize={sanitize}
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ About This Component
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Powered by react-markdown with rehype-sanitize and rehype-highlight</li>
            <li>• GitHub Flavored Markdown support (tables, task lists, strikethrough)</li>
            <li>• Syntax highlighting for 100+ programming languages</li>
            <li>• XSS protection enabled by default (toggle to see difference)</li>
            <li>• Fully responsive with Tailwind CSS</li>
            <li>• Dark mode support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MarkdownRendererDemo;
