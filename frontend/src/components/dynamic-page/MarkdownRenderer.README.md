# MarkdownRenderer Component

A production-ready, secure Markdown renderer component built with React and react-markdown, featuring XSS protection, syntax highlighting, and GitHub-flavored markdown support.

## Features

- ✅ **GitHub Flavored Markdown (GFM)**: Tables, strikethrough, task lists, and more
- ✅ **XSS Protection**: Built-in HTML sanitization using rehype-sanitize
- ✅ **Syntax Highlighting**: Code blocks with rehype-highlight
- ✅ **Responsive Design**: Mobile-friendly with Tailwind CSS
- ✅ **Accessibility**: Semantic HTML with proper ARIA attributes
- ✅ **Safe Links**: External links open in new tab with security attributes
- ✅ **Image Support**: Lazy loading with alt text
- ✅ **Dark Mode**: Full support for light/dark themes
- ✅ **Custom Styling**: Easy customization with Tailwind classes

## Installation

The component uses the following dependencies (already installed):

```json
{
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "rehype-sanitize": "^6.0.0",
  "rehype-highlight": "^7.0.2",
  "highlight.js": "^11.x"
}
```

## Basic Usage

```tsx
import { MarkdownRenderer } from '@/components/dynamic-page/MarkdownRenderer';

function MyComponent() {
  const markdown = `
# Hello World

This is **bold** and this is *italic*.
  `;

  return <MarkdownRenderer content={markdown} />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | Required | Markdown string to render |
| `sanitize` | `boolean` | `true` | Enable XSS protection via rehype-sanitize |
| `className` | `string` | `''` | Additional CSS classes for the container |

## Examples

### Basic Markdown

```tsx
<MarkdownRenderer
  content="# Title\n\nThis is a paragraph with **bold** text."
/>
```

### Code with Syntax Highlighting

```tsx
const codeExample = `
\`\`\`typescript
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1, name: "John" };
\`\`\`
`;

<MarkdownRenderer content={codeExample} />
```

### Tables (GFM)

```tsx
const tableMarkdown = `
| Feature | Status |
|---------|--------|
| Tables  | ✅     |
| Lists   | ✅     |
`;

<MarkdownRenderer content={tableMarkdown} />
```

### Task Lists (GFM)

```tsx
const taskList = `
- [x] Completed task
- [ ] Pending task
- [x] Another done
`;

<MarkdownRenderer content={taskList} />
```

### Custom Styling

```tsx
<MarkdownRenderer
  content={markdown}
  className="custom-style bg-white p-6 rounded-lg shadow"
/>
```

### Disable Sanitization (Use with Caution!)

```tsx
<MarkdownRenderer
  content={trustedHtmlContent}
  sanitize={false}
/>
```

**Warning:** Only disable sanitization if you completely trust the content source!

## Supported Markdown Features

### Headings
```markdown
# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading
```

### Text Formatting
```markdown
**Bold text**
*Italic text*
***Bold and italic***
~~Strikethrough~~
`Inline code`
```

### Links and Images
```markdown
[Link text](https://example.com)
![Alt text](https://example.com/image.png)
```

External links automatically open in a new tab with `rel="noopener noreferrer"`.

### Lists

**Unordered:**
```markdown
- Item 1
- Item 2
  - Nested item
```

**Ordered:**
```markdown
1. First
2. Second
3. Third
```

**Task Lists:**
```markdown
- [x] Done
- [ ] Todo
```

### Code Blocks

**Inline code:**
```markdown
Use `const x = 5;` for variables.
```

**Code blocks with syntax highlighting:**
````markdown
```javascript
function hello() {
  console.log("Hello World");
}
```
````

Supported languages: JavaScript, TypeScript, Python, Bash, SQL, JSON, HTML, CSS, and 100+ more.

### Blockquotes

```markdown
> This is a blockquote.
> It can span multiple lines.
```

### Tables

```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### Horizontal Rules

```markdown
---
```

## Security

### XSS Protection (Default: Enabled)

The component uses `rehype-sanitize` to prevent XSS attacks:

- Script tags are removed
- Dangerous protocols (`javascript:`, `data:`) are blocked
- Null bytes are stripped
- Only safe HTML elements and attributes are allowed

**Example of blocked content:**
```html
<script>alert('XSS')</script>  <!-- Removed -->
<a href="javascript:alert('XSS')">Click</a>  <!-- Href sanitized -->
```

### Safe by Default

```tsx
// This is safe - XSS protection is ON by default
<MarkdownRenderer content={userGeneratedContent} />

// This is safe - explicitly enabled
<MarkdownRenderer content={userGeneratedContent} sanitize={true} />

// This is UNSAFE - only use with trusted content!
<MarkdownRenderer content={trustedContent} sanitize={false} />
```

## Styling

### Default Styles

The component includes:
- Tailwind Typography (`prose` classes)
- Custom component styles for all markdown elements
- Dark mode support
- Responsive design

### Customization

**Add custom classes:**
```tsx
<MarkdownRenderer
  content={markdown}
  className="my-custom-class"
/>
```

**Override with Tailwind:**
```tsx
<div className="[&_.markdown-renderer]:max-w-2xl">
  <MarkdownRenderer content={markdown} />
</div>
```

## Accessibility

- Semantic HTML5 elements
- Proper heading hierarchy
- Alt text for images
- ARIA attributes for code blocks
- Keyboard navigation support
- Screen reader friendly

## Performance

- Memoized component renderers
- Lazy loading for images
- Efficient rehype/remark plugin chain
- Minimal re-renders

## Browser Support

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Migration from Other Components

### From existing Markdown component:

```diff
- import { Markdown } from './Markdown';
+ import { MarkdownRenderer } from './MarkdownRenderer';

- <Markdown content={text} />
+ <MarkdownRenderer content={text} />
```

The API is compatible, but MarkdownRenderer includes built-in sanitization and highlighting.

## Troubleshooting

### Code blocks not highlighted

Make sure highlight.js CSS is imported (already done in the component):
```tsx
import 'highlight.js/styles/github-dark.css';
```

### Dark mode not working

Ensure Tailwind dark mode is configured in your project.

### Tables not responsive

Tables are automatically wrapped in a scrollable container. Check that parent elements don't restrict width.

## Best Practices

1. **Always sanitize user-generated content** (default behavior)
2. **Use semantic markdown** instead of raw HTML
3. **Provide alt text** for all images
4. **Keep content accessible** - use proper heading hierarchy
5. **Test with long content** to ensure responsive behavior
6. **Validate markdown** before rendering if accepting user input

## Advanced Usage

### Dynamic Content

```tsx
function BlogPost({ post }) {
  return (
    <div>
      <h1>{post.title}</h1>
      <MarkdownRenderer content={post.body} />
    </div>
  );
}
```

### With Template Variables

```tsx
const template = `
# Welcome, {{name}}!

Your account was created on {{date}}.
`;

const content = template
  .replace('{{name}}', user.name)
  .replace('{{date}}', user.createdAt);

<MarkdownRenderer content={content} />
```

### Combine Multiple Sources

```tsx
const combined = [
  introduction,
  features,
  documentation,
  footer
].join('\n\n---\n\n');

<MarkdownRenderer content={combined} />
```

## Related Components

- `Markdown` - Simpler markdown component without sanitization
- `CodeBlock` - Standalone code block component
- `LinkRenderer` - Secure link rendering component

## License

Part of the agent-feed project.

## Support

For issues or questions, please check the existing components in:
- `/workspaces/agent-feed/frontend/src/components/dynamic-page/`
- Examples: `MarkdownRenderer.example.tsx`
