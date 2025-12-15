# MarkdownRenderer - Quick Start Guide

## Installation ✅

Already installed! No additional packages needed.

## Basic Usage

```tsx
import { MarkdownRenderer } from '@/components/dynamic-page';

function MyComponent() {
  return <MarkdownRenderer content="# Hello World" />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | **required** | Markdown content to render |
| `sanitize` | `boolean` | `true` | Enable XSS protection |
| `className` | `string` | `''` | Additional CSS classes |

## Common Examples

### 1. Basic Markdown

```tsx
<MarkdownRenderer content="# Title\n\nParagraph with **bold**" />
```

### 2. Code Blocks

```tsx
const code = `
\`\`\`typescript
const hello = "world";
\`\`\`
`;

<MarkdownRenderer content={code} />
```

### 3. Tables

```tsx
const table = `
| Name | Age |
|------|-----|
| John | 30  |
`;

<MarkdownRenderer content={table} />
```

### 4. Task Lists

```tsx
<MarkdownRenderer content="- [x] Done\n- [ ] Todo" />
```

### 5. Custom Styling

```tsx
<MarkdownRenderer
  content={markdown}
  className="bg-white p-6 rounded-lg shadow"
/>
```

## Security

### ✅ Safe (Default)
```tsx
<MarkdownRenderer content={userGeneratedContent} />
// XSS protection is ON by default
```

### ⚠️ Unsafe (Use with Caution)
```tsx
<MarkdownRenderer content={trustedHTML} sanitize={false} />
// Only use with 100% trusted content!
```

## Supported Markdown

- ✅ Headings (H1-H6)
- ✅ Bold, italic, strikethrough
- ✅ Lists (ordered, unordered, task)
- ✅ Links (internal & external)
- ✅ Images
- ✅ Code blocks with syntax highlighting
- ✅ Tables
- ✅ Blockquotes
- ✅ Horizontal rules

## Features

- 🛡️ XSS Protection (default: ON)
- 🎨 Syntax Highlighting (100+ languages)
- 📱 Responsive Design
- 🌙 Dark Mode Support
- ♿ Accessible (WCAG)
- ⚡ Performance Optimized

## Links Open Safely

External links automatically get:
```html
target="_blank"
rel="noopener noreferrer"
```

## Example: Blog Post

```tsx
function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <MarkdownRenderer content={post.body} />
    </article>
  );
}
```

## Example: Documentation

```tsx
const docs = `
# API Reference

## GET /users

Returns a list of users.

\`\`\`http
GET /api/users?page=1
Authorization: Bearer TOKEN
\`\`\`

**Response:**

\`\`\`json
{
  "data": [...],
  "meta": { "page": 1 }
}
\`\`\`
`;

<MarkdownRenderer content={docs} />
```

## Troubleshooting

### Code not highlighted?
Make sure highlight.js CSS is imported (already done in component).

### Dark mode not working?
Ensure Tailwind dark mode is configured in your project.

### Tables not responsive?
Tables auto-wrap in scrollable container. Check parent width.

## Files

- **Component:** `MarkdownRenderer.tsx`
- **Docs:** `MarkdownRenderer.README.md`
- **Examples:** `MarkdownRenderer.example.tsx`
- **Demo:** `MarkdownRenderer.demo.tsx`

## Need Help?

Check the full documentation in `MarkdownRenderer.README.md` or view examples in `MarkdownRenderer.example.tsx`.

---

**Status:** ✅ Production Ready
**Security:** 🛡️ XSS Protected by Default
**Performance:** ⚡ Optimized
**Accessibility:** ♿ WCAG Compliant
