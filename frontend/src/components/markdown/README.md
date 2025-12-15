# Markdown Components with Mermaid Support

Production-ready markdown rendering with syntax highlighting, XSS protection, and Mermaid diagram support.

## Components

### MarkdownRenderer

Main component for rendering markdown content with all features enabled.

```tsx
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';

function MyComponent() {
  const markdown = `
# Hello World

This is **bold** and this is *italic*.

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
  `;

  return <MarkdownRenderer content={markdown} />;
}
```

### CodeBlock

Renders code blocks with syntax highlighting and Mermaid diagram support.

```tsx
import CodeBlock from '@/components/markdown/CodeBlock';

<CodeBlock language="javascript" showLineNumbers>
  console.log('Hello');
</CodeBlock>
```

### MermaidDiagram

Standalone Mermaid diagram renderer with error handling.

```tsx
import MermaidDiagram from '@/components/markdown/MermaidDiagram';

<MermaidDiagram
  chart="graph TD\n    A --> B"
  id="my-diagram"
/>
```

## Features

### Markdown Features
- ✅ GitHub Flavored Markdown (GFM)
- ✅ Tables
- ✅ Strikethrough
- ✅ Task lists
- ✅ Autolinks
- ✅ XSS protection (sanitization)
- ✅ Semantic HTML output
- ✅ Accessibility (ARIA labels)

### Code Highlighting
- ✅ 12+ programming languages
- ✅ Auto-detected language
- ✅ Line numbers (auto-show for >10 lines)
- ✅ Copy to clipboard button
- ✅ Dark theme (VS Code Dark+)
- ✅ Inline code support

### Mermaid Diagrams
- ✅ Flowcharts
- ✅ Sequence diagrams
- ✅ Class diagrams
- ✅ State diagrams
- ✅ Entity Relationship diagrams
- ✅ Gantt charts
- ✅ Pie charts
- ✅ User journey diagrams
- ✅ Git graphs
- ✅ Timeline diagrams
- ✅ Error handling and validation
- ✅ Loading states
- ✅ Responsive design
- ✅ Security (strict mode)

## Usage Examples

### Basic Markdown

```tsx
const markdown = `
# Heading 1
## Heading 2

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

\`Inline code\` example.
`;

<MarkdownRenderer content={markdown} />
```

### Code Blocks

```tsx
const markdown = `
JavaScript example:

\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

Python example:

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`
`;

<MarkdownRenderer content={markdown} />
```

### Mermaid Diagrams

#### Flowchart

```tsx
const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Retry]
\`\`\`
`;

<MarkdownRenderer content={markdown} />
```

#### Sequence Diagram

```tsx
const markdown = `
\`\`\`mermaid
sequenceDiagram
    User->>API: Request
    API->>DB: Query
    DB-->>API: Data
    API-->>User: Response
\`\`\`
`;

<MarkdownRenderer content={markdown} />
```

#### Class Diagram

```tsx
const markdown = `
\`\`\`mermaid
classDiagram
    Animal <|-- Dog
    Animal : +String name
    Animal : +makeSound()
    Dog : +bark()
\`\`\`
`;

<MarkdownRenderer content={markdown} />
```

### Tables

```tsx
const markdown = `
| Feature | Supported |
|---------|-----------|
| Markdown | ✓ |
| Code | ✓ |
| Diagrams | ✓ |
`;

<MarkdownRenderer content={markdown} />
```

### Task Lists

```tsx
const markdown = `
- [x] Completed task
- [ ] Pending task
- [ ] Another task
`;

<MarkdownRenderer content={markdown} />
```

## API Reference

### MarkdownRenderer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | required | Markdown content to render |
| `className` | `string` | `''` | Additional CSS classes |

### CodeBlock Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inline` | `boolean` | `false` | Render as inline code |
| `className` | `string` | `''` | CSS class (e.g., `language-javascript`) |
| `children` | `ReactNode` | - | Code content |
| `language` | `string` | auto-detected | Programming language |
| `showLineNumbers` | `boolean` | auto (>10 lines) | Show line numbers |

### MermaidDiagram Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chart` | `string` | required | Mermaid diagram code |
| `id` | `string` | auto-generated | Unique diagram ID |
| `className` | `string` | `''` | Additional CSS classes |

## Supported Languages

### Syntax Highlighting

- JavaScript / TypeScript
- Python
- Bash / Shell
- JSON
- SQL
- HTML / CSS
- Markdown
- JSX / TSX

### Mermaid Diagram Types

- `flowchart` / `graph` - Flowcharts and graphs
- `sequenceDiagram` - Sequence diagrams
- `classDiagram` - Class diagrams
- `stateDiagram` - State diagrams
- `erDiagram` - Entity relationship diagrams
- `gantt` - Gantt charts
- `pie` - Pie charts
- `journey` - User journey diagrams
- `gitGraph` - Git workflow diagrams
- `timeline` - Timeline diagrams
- `mindmap` - Mind maps

## Error Handling

### Invalid Mermaid Syntax

When Mermaid syntax is invalid, an error message is displayed:

```
┌───────────────────────────────┐
│ Invalid Mermaid Syntax        │
│ Error: Parse error on line 2  │
│ > Show diagram code           │
└───────────────────────────────┘
```

The error includes:
- Error message
- Expandable code view
- Helpful styling
- Non-breaking (doesn't crash the page)

### Empty Content

Empty or invalid content is handled gracefully:

```tsx
<MarkdownRenderer content="" /> // Returns null
<MarkdownRenderer content={undefined} /> // Returns null
```

## Styling

### Custom Styling

You can customize the appearance using CSS classes:

```tsx
<MarkdownRenderer
  content={markdown}
  className="custom-markdown"
/>
```

```css
.custom-markdown h1 {
  color: blue;
}

.custom-markdown .mermaid-diagram {
  background: #f5f5f5;
  border-radius: 8px;
}
```

### Dark Mode

All components support dark mode via Tailwind's `dark:` classes:

- Code blocks: Dark background automatically
- Mermaid diagrams: Dark mode compatible
- Error messages: Dark mode styling
- Tables: Dark mode borders and backgrounds

## Performance

### Optimization Features

1. **Memoization**: Components use React.memo to prevent unnecessary re-renders
2. **Lazy Loading**: Images use `loading="lazy"` attribute
3. **Code Splitting**: Mermaid library loaded on demand
4. **Efficient Rendering**: Diagrams rendered asynchronously
5. **Caching**: Mermaid caches rendered diagrams

### Best Practices

1. **Keep diagrams simple**: Avoid overly complex diagrams
2. **Use appropriate diagram types**: Choose the right diagram for your use case
3. **Test on mobile**: Ensure diagrams are responsive
4. **Handle errors**: Always test diagram syntax before deploying

## Security

### XSS Protection

1. **No dangerouslySetInnerHTML**: All content rendered safely via React
2. **Mermaid strict mode**: Diagrams rendered with `securityLevel: 'strict'`
3. **Link sanitization**: External links have `rel="noopener noreferrer"`
4. **Content sanitization**: Null bytes and dangerous content removed

### Security Best Practices

1. Always validate user-provided content
2. Use the built-in sanitization
3. Never disable security features
4. Test with malicious input

## Testing

### Running Tests

```bash
npm test src/components/markdown
```

### Test Coverage

- MarkdownRenderer: Full GFM support
- CodeBlock: 54 tests covering all languages and edge cases
- MermaidDiagram: Error handling, loading states, rendering

### Manual Testing

Use the demo component to test all features:

```tsx
import MermaidDemo from '@/components/markdown/MermaidDemo';

<MermaidDemo />
```

## Troubleshooting

### Diagram Not Rendering

**Problem**: Diagram shows "Rendering diagram..." forever

**Solution**:
1. Check browser console for errors
2. Verify Mermaid syntax at [mermaid.live](https://mermaid.live)
3. Ensure mermaid package is installed: `npm install mermaid`

### Syntax Highlighting Not Working

**Problem**: Code appears as plain text

**Solution**:
1. Ensure language is specified: ` ```javascript `
2. Check if language is supported (see Supported Languages)
3. Verify react-syntax-highlighter is installed

### Styling Issues

**Problem**: Markdown looks unstyled

**Solution**:
1. Ensure Tailwind CSS is configured
2. Check that styles are imported
3. Verify className props are correct

## Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

## Examples

See comprehensive examples in:
- `/src/components/markdown/MermaidDemo.tsx`
- `/mermaid-examples.md`

## License

This component library follows the project's license. Mermaid.js is licensed under MIT.
