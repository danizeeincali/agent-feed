# Markdown Component - Usage Examples

## Overview

The `Markdown` component is a production-ready React component that renders Markdown content with XSS protection, syntax highlighting, and comprehensive styling.

## Features

- ✅ GitHub-flavored Markdown (GFM) support
- ✅ XSS protection via HTML sanitization
- ✅ Syntax highlighting for code blocks
- ✅ Responsive Tailwind CSS styling
- ✅ Dark mode support
- ✅ Accessible heading hierarchy
- ✅ External link security (noopener noreferrer)
- ✅ Task list support
- ✅ Table support
- ✅ Lazy-loaded images

## Installation

The component requires the following dependencies:

```bash
npm install react-markdown remark-gfm rehype-sanitize rehype-highlight highlight.js
```

## Basic Usage

```tsx
import { Markdown } from '@/components/dynamic-page/Markdown';

function MyPage() {
  const content = `
# Hello World

This is **bold** and this is *italic*.
  `;

  return <Markdown content={content} />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | required | Markdown content to render |
| `sanitize` | `boolean` | `true` | Enable XSS protection via HTML sanitization |
| `className` | `string` | `''` | Additional CSS classes for the container |

## Examples

### 1. Basic Text Formatting

```tsx
const content = `
# Main Heading
## Subheading

This is a paragraph with **bold text**, *italic text*, and ~~strikethrough~~.

You can also use \`inline code\` for technical terms.
`;

<Markdown content={content} />
```

### 2. Lists

```tsx
const content = `
## Unordered List
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

## Ordered List
1. First step
2. Second step
3. Third step

## Task List
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
`;

<Markdown content={content} />
```

### 3. Code Blocks with Syntax Highlighting

```tsx
const content = `
## JavaScript Example

\`\`\`javascript
const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};

greet('World');
\`\`\`

## Python Example

\`\`\`python
def greet(name):
    print(f"Hello, {name}!")

greet("World")
\`\`\`
`;

<Markdown content={content} />
```

### 4. Tables

```tsx
const content = `
| Feature | Supported | Notes |
|---------|-----------|-------|
| GFM | ✅ | GitHub-flavored markdown |
| Tables | ✅ | Responsive and styled |
| Syntax Highlighting | ✅ | Multiple languages |
| XSS Protection | ✅ | Enabled by default |
`;

<Markdown content={content} />
```

### 5. Links and Images

```tsx
const content = `
## Links
- [Internal link](/about)
- [External link](https://example.com) (opens in new tab)

## Images
![Alt text](https://via.placeholder.com/600x400)

Images are lazy-loaded and responsive.
`;

<Markdown content={content} />
```

### 6. Blockquotes

```tsx
const content = `
> This is a blockquote.
> It can span multiple lines.
>
> And even include **formatting**.
`;

<Markdown content={content} />
```

### 7. Mixed Content

```tsx
const content = `
# Project Documentation

## Overview
This project demonstrates the **Markdown component** with full GFM support.

## Features
- [x] Markdown parsing
- [x] Syntax highlighting
- [x] XSS protection
- [ ] Custom plugins

## Code Example

\`\`\`typescript
interface User {
  name: string;
  email: string;
}

const user: User = {
  name: "John Doe",
  email: "john@example.com"
};
\`\`\`

## Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Load Time | 1.2s | ✅ Good |
| Bundle Size | 45KB | ✅ Good |
| Lighthouse | 98 | ✅ Excellent |

> **Note**: All metrics measured on desktop.

## Links
- [Documentation](https://example.com/docs)
- [GitHub](https://github.com/example)
`;

<Markdown content={content} />
```

### 8. Custom Styling

```tsx
<Markdown
  content="# Custom Styled Content"
  className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
/>
```

### 9. Disable Sanitization (Use with Caution)

```tsx
// Only disable sanitization if you trust the content source
<Markdown
  content={trustedContent}
  sanitize={false}
/>
```

### 10. Dynamic Content

```tsx
function DynamicMarkdown() {
  const [content, setContent] = useState('# Loading...');

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.text())
      .then(setContent);
  }, []);

  return <Markdown content={content} />;
}
```

## Security

### XSS Protection

The component uses `rehype-sanitize` to prevent XSS attacks by default:

```tsx
// Safe - script tags are removed
<Markdown content='<script>alert("XSS")</script>' />

// Safe - dangerous attributes are removed
<Markdown content='<img src=x onerror="alert(1)">' />
```

### External Links

External links automatically open in a new tab with security attributes:

```tsx
// Renders as: <a href="..." target="_blank" rel="noopener noreferrer">
<Markdown content="[External](https://example.com)" />
```

## Styling

The component uses Tailwind CSS with dark mode support. All markdown elements are styled consistently:

- Headings: Hierarchical sizing with bottom borders
- Code blocks: Dark theme with syntax highlighting
- Tables: Responsive with hover effects
- Links: Blue with hover states
- Images: Responsive and lazy-loaded

## Syntax Highlighting

Powered by `highlight.js` with GitHub Dark theme. Supports:

- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP
- Shell/Bash
- And many more...

## Accessibility

- Proper heading hierarchy (h1-h6)
- Alt text for images (with fallback)
- Semantic HTML elements
- Keyboard navigation support
- Screen reader friendly

## Performance

- Lazy-loaded images
- Efficient rendering with React
- Minimal re-renders
- Small bundle size

## Best Practices

1. **Always enable sanitization for user-generated content**
   ```tsx
   <Markdown content={userContent} sanitize={true} />
   ```

2. **Provide meaningful alt text for images**
   ```markdown
   ![User profile photo](url)
   ```

3. **Use code blocks for technical content**
   ```markdown
   \`\`\`language
   code here
   \`\`\`
   ```

4. **Structure content with proper headings**
   ```markdown
   # Main Title (only one h1)
   ## Section (h2)
   ### Subsection (h3)
   ```

5. **Optimize images before use**
   - Use appropriate dimensions
   - Compress images
   - Use modern formats (WebP)

## Troubleshooting

### Code blocks not highlighting

Make sure to import the highlight.js CSS:

```tsx
import 'highlight.js/styles/github-dark.css';
```

### Styles not applying

Ensure Tailwind CSS is configured and the prose plugin is enabled.

### XSS content visible

Sanitization is enabled by default. If you're seeing unsanitized content, check that `sanitize` prop is not set to `false`.

## Advanced Usage

### Custom Remark/Rehype Plugins

To add custom plugins, you would need to extend the component:

```tsx
import { Markdown } from './Markdown';
import customPlugin from 'custom-plugin';

// Fork the component and add to remarkPlugins/rehypePlugins arrays
```

### Template Variable Support

The component accepts any string content, including template variables:

```tsx
const template = `
# Welcome, {{user.name}}!

Your email: {{user.email}}
`;

// Process template first, then render
const processed = processTemplate(template, { user });
<Markdown content={processed} />
```

## Related Components

- `DynamicPage`: Uses Markdown for rendering page content
- `RichTextEditor`: WYSIWYG editor that exports markdown
- `CodeBlock`: Standalone syntax-highlighted code component
