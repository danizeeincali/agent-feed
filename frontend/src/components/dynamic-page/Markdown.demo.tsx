import React, { useState } from 'react';
import { Markdown } from './Markdown';

/**
 * Demo component showcasing Markdown component capabilities
 */
export const MarkdownDemo: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState('basic');

  const examples = {
    basic: `# Basic Formatting

This is a **bold text** and this is *italic text*.

You can also use ~~strikethrough~~ text.

Inline code: \`const x = 42;\``,

    lists: `## Lists Demo

### Unordered List
- First item
- Second item
  - Nested item
  - Another nested
- Third item

### Ordered List
1. Step one
2. Step two
3. Step three

### Task List
- [x] Completed task
- [x] Another done
- [ ] Pending task
- [ ] To be done`,

    code: `## Syntax Highlighting

### JavaScript
\`\`\`javascript
const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};

greet('World');
\`\`\`

### TypeScript
\`\`\`typescript
interface User {
  name: string;
  email: string;
  age?: number;
}

const user: User = {
  name: "John Doe",
  email: "john@example.com"
};
\`\`\`

### Python
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\``,

    tables: `## Table Example

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Markdown Parsing | ✅ Done | High | Core feature |
| Syntax Highlighting | ✅ Done | High | Uses highlight.js |
| XSS Protection | ✅ Done | Critical | rehype-sanitize |
| Dark Mode | ✅ Done | Medium | Tailwind dark: |
| Custom Themes | ⏳ Planned | Low | Future enhancement |

### Alignment Examples

| Left | Center | Right |
|:-----|:------:|------:|
| L1 | C1 | R1 |
| L2 | C2 | R2 |`,

    links: `## Links and Images

### Internal Links
- [Home page](/home)
- [About us](/about)
- [Contact](/contact)

### External Links
- [Google](https://google.com) (opens in new tab)
- [GitHub](https://github.com) (with security)
- [MDN](https://developer.mozilla.org)

### Images
![Placeholder Image](https://via.placeholder.com/600x300?text=Responsive+Image)

Images are lazy-loaded and responsive!`,

    quotes: `## Blockquotes

> "The best way to predict the future is to invent it."
> — Alan Kay

> This is a multi-line blockquote.
> It can contain **formatting** and \`code\`.
>
> Even multiple paragraphs!

### Nested Quote
> Level 1
>> Level 2
>>> Level 3`,

    mixed: `# Complete Example

## Project Overview

This is a **comprehensive demo** of the Markdown component with *all features* enabled.

## Features Checklist

- [x] GitHub-flavored Markdown
- [x] XSS Protection
- [x] Syntax Highlighting
- [x] Responsive Design
- [x] Dark Mode Support
- [ ] Custom Plugins
- [ ] Real-time Preview

## Code Sample

\`\`\`typescript
// Production-ready Markdown component
import { Markdown } from '@/components/dynamic-page/Markdown';

export default function Page() {
  return <Markdown content="# Hello World" />;
}
\`\`\`

## Metrics Table

| Metric | Value | Status |
|--------|-------|--------|
| Performance | 98/100 | ✅ Excellent |
| Accessibility | 100/100 | ✅ Perfect |
| Best Practices | 95/100 | ✅ Great |
| SEO | 92/100 | ✅ Good |

## Important Notes

> ⚠️ **Security Notice**: XSS protection is enabled by default.
> Always keep \`sanitize={true}\` for user-generated content.

## Useful Links

- [React Markdown](https://github.com/remarkjs/react-markdown)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Highlight.js](https://highlightjs.org/)

---

### Footer

Made with ❤️ using React and TypeScript`,

    xss: `## XSS Protection Demo

The following malicious code is automatically sanitized:

\`\`\`html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<iframe src="javascript:alert('XSS')"></iframe>
\`\`\`

### Actual Output

<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">

All dangerous HTML is removed! ✅`,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Markdown Component Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore all features of the production-ready Markdown component
          </p>

          {/* Example Selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.keys(examples).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedExample(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedExample === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              Markdown Source
            </h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{examples[selectedExample as keyof typeof examples]}</code>
            </pre>
          </div>

          {/* Rendered Output */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Rendered Output
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <Markdown
                content={examples[selectedExample as keyof typeof examples]}
              />
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Component Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature
              icon="🔒"
              title="XSS Protection"
              description="Automatic HTML sanitization prevents security vulnerabilities"
            />
            <Feature
              icon="🎨"
              title="Syntax Highlighting"
              description="Beautiful code blocks with highlight.js support"
            />
            <Feature
              icon="📱"
              title="Responsive Design"
              description="Mobile-first design with Tailwind CSS"
            />
            <Feature
              icon="🌙"
              title="Dark Mode"
              description="Full dark mode support out of the box"
            />
            <Feature
              icon="♿"
              title="Accessible"
              description="Semantic HTML and ARIA compliance"
            />
            <Feature
              icon="⚡"
              title="Performance"
              description="Lazy-loaded images and optimized rendering"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureProps {
  icon: string;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => (
  <div className="flex items-start space-x-3">
    <span className="text-2xl">{icon}</span>
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

export default MarkdownDemo;
