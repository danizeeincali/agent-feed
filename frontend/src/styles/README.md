# Markdown Styling System

Comprehensive CSS styling for Markdown content in the Agent Feed application.

## Overview

This directory contains the complete styling system for rendered Markdown content, providing rich text formatting while maintaining security, performance, and accessibility standards.

## Files

### `markdown.css`
**Size:** 17KB (741 lines)
**Purpose:** Complete styling for all Markdown elements

**Includes:**
- Typography hierarchy (h1-h6)
- Text formatting (bold, italic, code, strikethrough, etc.)
- Lists (unordered, ordered, task lists)
- Code blocks with syntax highlighting
- Blockquotes
- Tables (responsive with hover effects)
- Links with states
- Images
- Horizontal rules
- Special elements (kbd, mark, details, etc.)
- Dark mode support
- Responsive design
- Accessibility features
- Print styles
- Performance optimizations

## Integration

The markdown.css file is automatically imported in `/workspaces/agent-feed/frontend/src/index.css`:

```css
@import './styles/markdown.css';
```

This makes the styles globally available to all components.

## Usage

### In React Components

```tsx
import { MarkdownContent } from '../components/MarkdownContent';

function MyComponent() {
  return (
    <MarkdownContent
      content="# Hello World\n\n**Bold** text"
      enableMarkdown={true}
    />
  );
}
```

### CSS Classes

The main container class is `.markdown-content`:

```tsx
<div className="markdown-content">
  {/* Markdown content here */}
</div>
```

### Optional Modifiers

```tsx
// Constrain width for readability
<div className="markdown-content max-readable">

// Compact spacing for dense content
<div className="markdown-content compact">
```

## Supported Markdown Elements

### Typography
- ✅ Headings (h1-h6) with proper hierarchy
- ✅ Paragraphs with optimized spacing
- ✅ Line breaks

### Text Formatting
- ✅ **Bold** (`**text**` or `__text__`)
- ✅ *Italic* (`*text*` or `_text_`)
- ✅ ~~Strikethrough~~ (`~~text~~`)
- ✅ `Inline code` (`` `code` ``)
- ✅ <u>Underline</u> (`<u>text</u>`)
- ✅ <ins>Inserted</ins> (`<ins>text</ins>`)

### Lists
- ✅ Unordered lists (`-`, `*`, `+`)
- ✅ Ordered lists (`1.`, `2.`, etc.)
- ✅ Nested lists
- ✅ Task lists (`- [ ]` and `- [x]`)

### Code
- ✅ Inline code with styling
- ✅ Fenced code blocks
- ✅ Syntax highlighting (20+ languages)
- ✅ Language labels

### Blockquotes
- ✅ Single blockquotes (`>`)
- ✅ Nested blockquotes (`> >`)
- ✅ Styled with left border

### Tables
- ✅ GitHub Flavored Markdown tables
- ✅ Responsive horizontal scrolling
- ✅ Hover effects
- ✅ Header styling
- ✅ Alternating rows

### Links & Media
- ✅ External links with indicator
- ✅ Internal links
- ✅ Email links
- ✅ Images with borders and shadows
- ✅ Image captions

### Special Elements
- ✅ Horizontal rules (`---`)
- ✅ Keyboard input (`<kbd>`)
- ✅ Highlighting (`<mark>`)
- ✅ Subscript & superscript
- ✅ Abbreviations
- ✅ Details/summary (collapsible)
- ✅ Definition lists

## Dark Mode Support

All elements automatically adapt to dark mode using Tailwind's `dark:` variants:

```css
/* Light mode */
.markdown-content h1 {
  @apply text-gray-900;
}

/* Dark mode */
.markdown-content h1 {
  @apply dark:text-gray-100;
}
```

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Body text | `gray-700` | `gray-300` |
| Headings | `gray-900` | `gray-100` |
| Links | `blue-600` | `blue-400` |
| Code inline | `pink-600` | `pink-400` |
| Code block bg | `gray-900` | `gray-950` |
| Borders | `gray-200` | `gray-700` |

## Syntax Highlighting

Powered by `highlight.js` with custom color scheme:

- **Keywords:** Purple (`#c084fc`)
- **Strings:** Green (`#4ade80`)
- **Numbers:** Orange (`#fb923c`)
- **Comments:** Gray (`#6b7280`), italic
- **Functions:** Blue (`#60a5fa`)
- **Classes:** Yellow (`#facc15`)
- **Variables:** Cyan (`#22d3ee`)

Supports 20+ languages including:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- CSS/SCSS
- HTML
- JSON
- SQL
- Bash/Shell
- Go
- Rust
- PHP
- Ruby
- And more...

## Responsive Design

### Breakpoints

**Mobile (<768px):**
- Reduced heading sizes
- Smaller table text
- Compact code block padding
- Reduced list indentation

```css
@media (max-width: 768px) {
  .markdown-content h1 {
    @apply text-2xl; /* Reduced from text-3xl */
  }
}
```

### Touch Optimization
- Larger tap targets for interactive elements
- Smooth scrolling for tables and code blocks
- Contained overscroll behavior

## Accessibility (WCAG 2.1 AA)

### Features

1. **Keyboard Navigation**
   - All interactive elements are keyboard accessible
   - Visible focus indicators (2px blue ring)
   - Proper tab order

2. **Screen Readers**
   - Semantic HTML structure
   - Proper heading hierarchy
   - Alt text support for images
   - ARIA labels where needed

3. **Color Contrast**
   - Text: 4.5:1 minimum ratio
   - Headings: 3:1 minimum ratio
   - Interactive elements: Enhanced contrast

4. **Focus Indicators**
   ```css
   .markdown-content a:focus {
     @apply ring-2 ring-blue-500 ring-offset-2;
   }
   ```

## Performance Optimizations

### Hardware Acceleration
```css
.markdown-content {
  transform: translateZ(0);
  -webkit-font-smoothing: antialiased;
}
```

### Rendering Optimization
```css
table, pre {
  contain: layout style paint;
}
```

### Best Practices
- Memoized rendering in React components
- Lazy loading for images
- Optimized scrolling for large tables
- Efficient repaints

## Print Styles

Special styles for printing:

```css
@media print {
  /* Black text for readability */
  .markdown-content {
    @apply text-black;
  }

  /* Print URLs after links */
  .markdown-content a[href]::after {
    content: " (" attr(href) ")";
  }

  /* Prevent page breaks inside elements */
  pre, code, table, img {
    page-break-inside: avoid;
  }
}
```

## Testing

### Visual Testing
Use the test document: `/workspaces/agent-feed/frontend/src/tests/markdown-visual-test.md`

Test checklist:
- [ ] All headings render correctly
- [ ] Code blocks show syntax highlighting
- [ ] Tables are responsive
- [ ] Links show hover states
- [ ] Task lists work
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Print layout correct

### Browser Testing
Tested and supported:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Customization

### Changing Colors

Modify Tailwind classes in `markdown.css`:

```css
/* Example: Change link color */
.markdown-content a {
  @apply text-blue-600 dark:text-blue-400; /* Modify these */
}
```

### Adjusting Spacing

```css
/* Example: Reduce heading spacing */
.markdown-content h1 {
  @apply mb-4 mt-6; /* Adjust margins */
}
```

### Custom Utility Classes

Add custom classes for specific use cases:

```css
/* Compact mode */
.markdown-content.compact p {
  @apply mb-2; /* Reduced from mb-4 */
}
```

## Dependencies

### Required Packages
```json
{
  "react-markdown": "10.1.0",
  "remark-gfm": "4.0.1",
  "rehype-sanitize": "6.0.0",
  "rehype-highlight": "7.0.2",
  "highlight.js": "11.11.1"
}
```

### CSS Framework
- Tailwind CSS 3.4.1
- PostCSS for processing

## Architecture

Based on SPARC specification:
- **Security:** XSS prevention via sanitization
- **Performance:** Hardware acceleration, containment
- **Accessibility:** WCAG 2.1 AA compliance
- **Responsive:** Mobile-first design
- **Compatibility:** Cross-browser support

## File Structure

```
src/styles/
├── markdown.css          # Main Markdown styling (this file)
└── README.md            # Documentation (you are here)

src/components/
└── MarkdownContent.tsx  # React component using these styles

src/tests/
└── markdown-visual-test.md  # Visual test document
```

## Troubleshooting

### Styles not applying
1. Check import in `index.css`
2. Verify `.markdown-content` class is applied
3. Clear build cache: `npm run build`

### Dark mode not working
1. Ensure Tailwind dark mode is configured
2. Check `darkMode: 'class'` in `tailwind.config.js`
3. Verify dark class is applied to root element

### Syntax highlighting missing
1. Verify `rehype-highlight` is installed
2. Check highlight.js import in component
3. Ensure language is specified in code fence

### Mobile styles broken
1. Check responsive breakpoints
2. Test with device emulation
3. Verify Tailwind responsive classes

## Support

For issues or questions:
1. Check SPARC Architecture document
2. Review MarkdownContent component implementation
3. Consult Tailwind CSS documentation
4. Check highlight.js documentation

## Changelog

### Version 1.0.0 (2025-10-25)
- ✅ Initial implementation
- ✅ Full SPARC architecture compliance
- ✅ Complete Markdown element support
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Accessibility compliance
- ✅ Print styles
- ✅ Performance optimizations

## License

Part of the Agent Feed application.

---

**Last Updated:** 2025-10-25
**Maintained by:** Development Team
**Status:** Production Ready
