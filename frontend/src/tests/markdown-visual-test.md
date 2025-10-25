# Markdown Styling Visual Test Document

This document demonstrates all supported Markdown elements for visual testing.

## Table of Contents

1. [Typography](#typography)
2. [Text Formatting](#text-formatting)
3. [Lists](#lists)
4. [Code](#code)
5. [Blockquotes](#blockquotes)
6. [Tables](#tables)
7. [Links](#links)
8. [Media](#media)
9. [GitHub Flavored Markdown](#github-flavored-markdown)

---

## Typography

### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

This is a paragraph with normal text. It should have proper line height and spacing. Multiple paragraphs are separated by blank lines to ensure readability.

This is a second paragraph to demonstrate spacing between paragraphs. The text should flow naturally and be easy to read.

## Text Formatting

**Bold text** demonstrates strong emphasis.

*Italic text* shows subtle emphasis.

***Bold and italic*** combines both styles.

~~Strikethrough text~~ indicates removed content.

<u>Underlined text</u> for special emphasis (HTML).

<ins>Inserted text</ins> shows additions.

Inline `code` for variable names like `const myVariable = 42;`.

## Lists

### Unordered List

- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Fourth item

### Ordered List

1. First step
2. Second step
3. Third step
   1. Substep 3.1
   2. Substep 3.2
4. Fourth step

### Task List (GFM)

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
- [x] Another completed task

## Code

### Inline Code

Use `npm install` to install dependencies. Variables like `myVariable` are shown in code style.

### Code Blocks

#### JavaScript

```javascript
// JavaScript example
function greet(name) {
  console.log(`Hello, ${name}!`);
}

const user = {
  name: 'Alice',
  age: 30
};

greet(user.name);
```

#### TypeScript

```typescript
// TypeScript example
interface User {
  name: string;
  age: number;
  email?: string;
}

function createUser(name: string, age: number): User {
  return { name, age };
}

const user: User = createUser('Bob', 25);
```

#### Python

```python
# Python example
def factorial(n):
    """Calculate factorial recursively"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(5)
print(f"Factorial: {result}")
```

#### CSS

```css
/* CSS example */
.markdown-content h1 {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.dark .markdown-content h1 {
  color: #f3f4f6;
}
```

#### JSON

```json
{
  "name": "agent-feed",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-markdown": "^10.1.0"
  }
}
```

#### SQL

```sql
-- SQL example
SELECT
  users.name,
  COUNT(posts.id) as post_count
FROM users
LEFT JOIN posts ON users.id = posts.author_id
WHERE users.active = true
GROUP BY users.id
ORDER BY post_count DESC
LIMIT 10;
```

#### Shell/Bash

```bash
#!/bin/bash
# Shell script example

echo "Starting deployment..."
npm install
npm run build
npm run test

if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed!"
  exit 1
fi
```

## Blockquotes

> This is a simple blockquote.
> It can span multiple lines.

> **Note:** Important information can be highlighted in blockquotes.
>
> You can include multiple paragraphs.

> ### Nested Heading
>
> > This is a nested blockquote.
> > It has a different style.
>
> Back to the outer blockquote.

## Tables

### Simple Table

| Name | Role | Status |
|------|------|--------|
| Alice | Developer | Active |
| Bob | Designer | Active |
| Charlie | Manager | Away |

### Complex Table

| Feature | Description | Support | Priority |
|---------|-------------|---------|----------|
| Markdown Rendering | Full GFM support | ✅ Yes | High |
| Syntax Highlighting | Code block colors | ✅ Yes | High |
| Dark Mode | Theme switching | ✅ Yes | High |
| Tables | Responsive tables | ✅ Yes | Medium |
| Task Lists | Interactive checkboxes | ✅ Yes | Medium |
| Images | Lazy loading | ✅ Yes | Low |

### Aligned Columns

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Text | Text | Text |
| More text | More text | More text |
| Even more | Even more | Even more |

## Links

[External link to GitHub](https://github.com)

[Internal documentation](/docs/README.md)

[Email link](mailto:support@example.com)

## Media

### Images

![Placeholder Image](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Markdown+Image+Example)

*Figure 1: Example image with caption*

### Horizontal Rule

Use three dashes for a horizontal rule:

---

Content after the rule.

## GitHub Flavored Markdown

### Keyboard Input

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

Use <kbd>Cmd</kbd> + <kbd>V</kbd> on macOS.

### Abbreviations

The HTML specification is maintained by the W3C.

*[HTML]: Hyper Text Markup Language
*[W3C]: World Wide Web Consortium

### Highlighting

This is ==highlighted text== (if supported).

### Subscript and Superscript

H<sub>2</sub>O is water.

E = mc<sup>2</sup> is Einstein's formula.

### Details/Summary (Collapsible)

<details>
<summary>Click to expand</summary>

This content is hidden by default and revealed when clicking the summary.

You can include any markdown content here:

- Lists
- **Bold text**
- `Code`
- And more!

</details>

---

## Special Cases

### Mixed Content

This paragraph contains **bold**, *italic*, `code`, and [a link](https://example.com) all together. It should render correctly with proper spacing and styling.

### Long Code Lines

```javascript
const veryLongFunctionNameThatShouldCauseHorizontalScrollingInTheCodeBlockBecauseItExceedsTheAvailableWidth = (parameter1, parameter2, parameter3) => {
  return parameter1 + parameter2 + parameter3;
};
```

### Long URLs

Visit this very long URL: https://example.com/very/long/path/that/should/break/properly/on/mobile/devices/and/not/cause/horizontal/scrolling

### Complex List

1. First level
   - Nested unordered
   - Another nested
     1. Nested ordered
     2. Another ordered
        - Deep nested unordered
2. Back to first level
   - [ ] Task in ordered list
   - [x] Completed task

---

## Performance Test

### Large Table

| ID | Name | Email | Role | Department | Status | Joined | Last Active |
|----|------|-------|------|------------|--------|--------|-------------|
| 1 | Alice Johnson | alice@example.com | Developer | Engineering | Active | 2023-01-15 | 2025-10-25 |
| 2 | Bob Smith | bob@example.com | Designer | Design | Active | 2023-02-20 | 2025-10-24 |
| 3 | Charlie Brown | charlie@example.com | Manager | Management | Away | 2023-03-10 | 2025-10-20 |
| 4 | Diana Prince | diana@example.com | Developer | Engineering | Active | 2023-04-05 | 2025-10-25 |
| 5 | Eve Davis | eve@example.com | QA Engineer | Quality | Active | 2023-05-12 | 2025-10-25 |

### Nested Lists Deep

- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5
          - Level 6 (maximum practical depth)

---

## Accessibility Test

### Semantic Structure

Proper heading hierarchy ensures screen readers can navigate effectively.

### Link Context

[Learn more about Markdown](https://www.markdownguide.org/) (external link indicator should appear).

### Image Alt Text

![A beautiful sunset over the ocean](https://via.placeholder.com/600x300/f59e0b/ffffff?text=Accessible+Image)

---

## Edge Cases

### Empty Elements

>

```

```

### Special Characters

Characters like <, >, &, ", and ' should be properly escaped.

### Mixed Language Code

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .markdown { color: blue; }
  </style>
  <script>
    console.log('JavaScript in HTML');
  </script>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
```

---

**End of Visual Test Document**

*Test all elements in both light and dark modes!*
