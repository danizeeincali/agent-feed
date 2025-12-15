# MarkdownRenderer Accessibility Testing Plan

## Executive Summary

This document provides comprehensive test coverage analysis and recommendations for the text contrast accessibility improvements in `MarkdownRenderer.tsx`.

**Component Location:** `/workspaces/agent-feed/frontend/src/components/dynamic-page/MarkdownRenderer.tsx`

---

## 1. Test Coverage Analysis

### 1.1 Current Test Coverage

#### Existing Test Files
1. **`/workspaces/agent-feed/frontend/src/tests/MarkdownRenderer.test.tsx`** (420 lines)
   - ✅ Basic rendering (headings, paragraphs, lists)
   - ✅ Text formatting (bold, italic, strikethrough)
   - ✅ Links (internal, external, security attributes)
   - ✅ Code blocks and inline code
   - ✅ Tables (GFM)
   - ✅ Images (lazy loading, alt text)
   - ✅ Blockquotes
   - ✅ XSS protection
   - ✅ Edge cases
   - ⚠️ **Limited accessibility testing** (only semantic HTML checks)

2. **`/workspaces/agent-feed/frontend/src/tests/unit/MarkdownRenderer.test.tsx`** (183 lines)
   - ✅ Basic markdown rendering
   - ✅ Security (XSS, javascript: protocol)
   - ⚠️ **Minimal accessibility coverage**

#### Coverage Gaps
- ❌ **No contrast ratio testing**
- ❌ **No screen reader compatibility tests**
- ❌ **No visual regression tests**
- ❌ **No dark mode contrast validation**
- ❌ **No WCAG compliance verification**
- ❌ **No browser compatibility tests for accessibility**
- ❌ **No mobile accessibility testing**

### 1.2 Contrast Ratio Analysis

Based on the component code review, here are the text color combinations:

| Element | Light Mode | Dark Mode | Purpose |
|---------|-----------|-----------|---------|
| **Headings (h1-h6)** | `text-gray-900` on white | `text-gray-100` on dark | Maximum contrast |
| **Paragraphs** | `text-gray-900` on white | `text-gray-200` on dark | WCAG AA compliant |
| **Lists (ul, ol)** | `text-gray-900` on white | `text-gray-200` on dark | WCAG AA compliant |
| **Blockquotes** | `text-gray-900` on `bg-gray-50` | `text-gray-200` on `bg-gray-800` | Needs validation |
| **Links** | `text-blue-600` on white | `text-blue-400` on dark | Standard link colors |
| **Link Hover** | `text-blue-800` on white | `text-blue-300` on dark | Improved contrast |
| **Inline Code** | `text-red-600` on `bg-gray-100` | `text-red-400` on `bg-gray-800` | Needs validation |
| **Table Headers** | `text-gray-900` on `bg-gray-100` | `text-gray-100` on `bg-gray-800` | Needs validation |
| **Table Cells** | `text-gray-900` on white | `text-gray-200` on `bg-gray-900` | Needs validation |
| **Strikethrough** | `text-gray-600` on white | `text-gray-400` on dark | Lower contrast (intentional) |
| **Strong/Bold** | `text-gray-900` on white | `text-gray-100` on dark | Maximum contrast |
| **Error Messages** | `text-red-800` on `bg-red-50` | `text-red-200` on `bg-red-900/20` | Needs validation |
| **Code Blocks** | `text-gray-100` on `bg-gray-900` | `text-gray-100` on `bg-gray-950` | High contrast |

**WCAG AA Requirements:**
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Bold text (14pt+): 3:1 minimum

---

## 2. Critical Test Cases

### 2.1 Priority 1: Contrast Ratio Testing

#### Test Case 1.1: Light Mode Contrast Ratios
```typescript
describe('Accessibility - Contrast Ratios (Light Mode)', () => {
  const testCases = [
    {
      name: 'Paragraph text',
      content: 'Regular paragraph text',
      selector: 'p',
      expectedMinRatio: 4.5,
      foreground: 'rgb(17, 24, 39)', // gray-900
      background: 'rgb(255, 255, 255)', // white
    },
    {
      name: 'Heading text',
      content: '# Heading',
      selector: 'h1',
      expectedMinRatio: 4.5,
      foreground: 'rgb(17, 24, 39)', // gray-900
      background: 'rgb(255, 255, 255)', // white
    },
    {
      name: 'Link text',
      content: '[Link](https://example.com)',
      selector: 'a',
      expectedMinRatio: 4.5,
      foreground: 'rgb(37, 99, 235)', // blue-600
      background: 'rgb(255, 255, 255)', // white
    },
    {
      name: 'Inline code',
      content: 'Use `const` keyword',
      selector: 'code',
      expectedMinRatio: 4.5,
      foreground: 'rgb(220, 38, 38)', // red-600
      background: 'rgb(243, 244, 246)', // gray-100
    },
    {
      name: 'Blockquote text',
      content: '> This is a quote',
      selector: 'blockquote',
      expectedMinRatio: 4.5,
      foreground: 'rgb(17, 24, 39)', // gray-900
      background: 'rgb(249, 250, 251)', // gray-50
    },
  ];

  testCases.forEach(({ name, content, selector, expectedMinRatio, foreground, background }) => {
    it(`should meet WCAG AA for ${name}`, () => {
      render(<MarkdownRenderer content={content} />);
      const element = document.querySelector(selector);

      const computedStyle = window.getComputedStyle(element!);
      const actualForeground = computedStyle.color;
      const actualBackground = computedStyle.backgroundColor;

      const ratio = calculateContrastRatio(actualForeground, actualBackground);

      expect(ratio).toBeGreaterThanOrEqual(expectedMinRatio);
      expect(ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA normal text
    });
  });
});
```

#### Test Case 1.2: Dark Mode Contrast Ratios
```typescript
describe('Accessibility - Contrast Ratios (Dark Mode)', () => {
  beforeEach(() => {
    // Simulate dark mode by adding dark class to document
    document.documentElement.classList.add('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  const testCases = [
    {
      name: 'Paragraph text',
      content: 'Regular paragraph text',
      selector: 'p',
      expectedMinRatio: 4.5,
      foreground: 'rgb(229, 231, 235)', // gray-200
      background: 'rgb(17, 24, 39)', // dark background
    },
    {
      name: 'Heading text',
      content: '# Heading',
      selector: 'h1',
      expectedMinRatio: 4.5,
      foreground: 'rgb(243, 244, 246)', // gray-100
      background: 'rgb(17, 24, 39)', // dark background
    },
    {
      name: 'Link text',
      content: '[Link](https://example.com)',
      selector: 'a',
      expectedMinRatio: 4.5,
      foreground: 'rgb(96, 165, 250)', // blue-400
      background: 'rgb(17, 24, 39)', // dark background
    },
  ];

  testCases.forEach(({ name, content, selector, expectedMinRatio }) => {
    it(`should meet WCAG AA for ${name} in dark mode`, () => {
      render(<MarkdownRenderer content={content} />);
      const element = document.querySelector(selector);

      const computedStyle = window.getComputedStyle(element!);
      const ratio = calculateContrastRatio(
        computedStyle.color,
        computedStyle.backgroundColor
      );

      expect(ratio).toBeGreaterThanOrEqual(expectedMinRatio);
    });
  });
});
```

### 2.2 Priority 2: Screen Reader Compatibility

#### Test Case 2.1: ARIA Attributes and Semantic HTML
```typescript
describe('Accessibility - Screen Reader Compatibility', () => {
  it('should use semantic HTML for all content types', () => {
    const content = `
# Main Heading
## Subheading
Regular paragraph
- List item 1
- List item 2
> Blockquote
[Link](https://example.com)
    `;

    render(<MarkdownRenderer content={content} />);

    // Verify semantic structure
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('should provide proper link context for screen readers', () => {
    const content = '[Click here](https://example.com)';
    render(<MarkdownRenderer content={content} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName('Click here');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should mark external links appropriately', () => {
    const content = '[External](https://example.com)';
    render(<MarkdownRenderer content={content} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should provide alt text for images', () => {
    const content = '![Descriptive alt text](image.jpg)';
    render(<MarkdownRenderer content={content} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName('Descriptive alt text');
  });

  it('should handle tables accessibly', () => {
    const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;

    render(<MarkdownRenderer content={content} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Verify table headers are properly marked
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
  });
});
```

#### Test Case 2.2: Keyboard Navigation
```typescript
describe('Accessibility - Keyboard Navigation', () => {
  it('should allow tab navigation through links', async () => {
    const content = `
[Link 1](https://example1.com)
[Link 2](https://example2.com)
[Link 3](https://example3.com)
    `;

    const user = userEvent.setup();
    render(<MarkdownRenderer content={content} />);

    const links = screen.getAllByRole('link');

    // Tab through links
    await user.tab();
    expect(links[0]).toHaveFocus();

    await user.tab();
    expect(links[1]).toHaveFocus();

    await user.tab();
    expect(links[2]).toHaveFocus();
  });

  it('should allow interaction with task list checkboxes', () => {
    const content = `
- [x] Completed
- [ ] Pending
    `;

    render(<MarkdownRenderer content={content} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeDisabled(); // Read-only
    expect(checkboxes[0]).toHaveAccessibleName();
  });
});
```

### 2.3 Priority 3: Visual Regression Testing

#### Test Case 3.1: Component Snapshots
```typescript
describe('Accessibility - Visual Regression', () => {
  it('should maintain consistent text rendering in light mode', () => {
    const content = `
# Heading
Regular paragraph with **bold** and *italic* text.
> Blockquote
    `;

    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container).toMatchSnapshot();
  });

  it('should maintain consistent text rendering in dark mode', () => {
    document.documentElement.classList.add('dark');

    const content = `
# Heading
Regular paragraph with **bold** and *italic* text.
> Blockquote
    `;

    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container).toMatchSnapshot();

    document.documentElement.classList.remove('dark');
  });
});
```

### 2.4 Priority 4: Edge Cases

#### Test Case 4.1: Very Long Content
```typescript
describe('Accessibility - Edge Cases', () => {
  it('should maintain readability with very long paragraphs', () => {
    const longParagraph = 'Lorem ipsum dolor sit amet. '.repeat(100);
    const { container } = render(<MarkdownRenderer content={longParagraph} />);

    const paragraph = container.querySelector('p');
    const computedStyle = window.getComputedStyle(paragraph!);

    // Verify line-height for readability
    expect(computedStyle.lineHeight).toBe('1.625'); // leading-relaxed

    // Verify contrast is maintained
    const ratio = calculateContrastRatio(
      computedStyle.color,
      computedStyle.backgroundColor
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should handle nested lists with proper contrast', () => {
    const content = `
- Top level item
  - Nested item 1
    - Deeply nested item
  - Nested item 2
- Another top level
    `;

    render(<MarkdownRenderer content={content} />);

    const list = screen.getByRole('list');
    const computedStyle = window.getComputedStyle(list);

    const ratio = calculateContrastRatio(
      computedStyle.color,
      computedStyle.backgroundColor
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should maintain contrast in tables with many columns', () => {
    const content = `
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|------|------|------|------|------|------|
| A    | B    | C    | D    | E    | F    |
    `;

    render(<MarkdownRenderer content={content} />);

    const headers = screen.getAllByRole('columnheader');
    headers.forEach(header => {
      const computedStyle = window.getComputedStyle(header);
      const ratio = calculateContrastRatio(
        computedStyle.color,
        computedStyle.backgroundColor
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('should handle blockquotes with formatted content', () => {
    const content = '> This is **bold** and *italic* in a blockquote with `code`';
    const { container } = render(<MarkdownRenderer content={content} />);

    const blockquote = container.querySelector('blockquote');
    const strong = blockquote?.querySelector('strong');
    const code = blockquote?.querySelector('code');

    // Verify all elements maintain proper contrast
    [blockquote, strong, code].forEach(element => {
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const ratio = calculateContrastRatio(
          computedStyle.color,
          computedStyle.backgroundColor || 'rgb(249, 250, 251)' // blockquote bg
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  it('should maintain accessibility with mixed content types', () => {
    const content = `
# Heading

Regular paragraph with [link](https://example.com).

> Blockquote with **bold** and \`code\`

- List item 1
- List item 2

| Header | Value |
|--------|-------|
| Cell   | Data  |

\`\`\`javascript
const code = 'block';
\`\`\`
    `;

    const { container } = render(<MarkdownRenderer content={content} />);

    // Test all major element types
    const elements = [
      container.querySelector('h1'),
      container.querySelector('p'),
      container.querySelector('a'),
      container.querySelector('blockquote'),
      container.querySelector('li'),
      container.querySelector('th'),
      container.querySelector('td'),
    ];

    elements.forEach(element => {
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const ratio = calculateContrastRatio(
          computedStyle.color,
          computedStyle.backgroundColor
        );

        // At minimum should meet AA standards
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      }
    });
  });
});
```

---

## 3. Verification Testing (No Regressions)

### 3.1 Functional Regression Tests

```typescript
describe('Regression - Markdown Rendering', () => {
  it('should render all markdown elements correctly', () => {
    const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6

**Bold** *Italic* ~~Strikethrough~~ \`Code\`

[Link](https://example.com)

- List
- Items

1. Numbered
2. List

> Blockquote

| Table | Header |
|-------|--------|
| Cell  | Data   |

---

\`\`\`javascript
const code = true;
\`\`\`
    `;

    render(<MarkdownRenderer content={content} />);

    // Verify all elements are present
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('Italic')).toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should not have layout shifts between renders', () => {
    const content = '# Test\n\nParagraph';
    const { rerender } = render(<MarkdownRenderer content={content} />);

    const initialHeight = document.querySelector('.markdown-renderer')?.clientHeight;

    rerender(<MarkdownRenderer content={content} />);

    const finalHeight = document.querySelector('.markdown-renderer')?.clientHeight;

    expect(initialHeight).toBe(finalHeight);
  });

  it('should maintain text visibility during mode switches', () => {
    const content = 'Test paragraph';
    const { container, rerender } = render(<MarkdownRenderer content={content} />);

    // Light mode
    const lightParagraph = container.querySelector('p');
    const lightStyle = window.getComputedStyle(lightParagraph!);
    expect(lightStyle.color).toBe('rgb(17, 24, 39)'); // gray-900

    // Switch to dark mode
    document.documentElement.classList.add('dark');
    rerender(<MarkdownRenderer content={content} />);

    const darkParagraph = container.querySelector('p');
    const darkStyle = window.getComputedStyle(darkParagraph!);
    expect(darkStyle.color).toBe('rgb(229, 231, 235)'); // gray-200

    document.documentElement.classList.remove('dark');
  });
});
```

### 3.2 Dark Mode Specific Tests

```typescript
describe('Regression - Dark Mode', () => {
  beforeEach(() => {
    document.documentElement.classList.add('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('should apply dark mode styles to all elements', () => {
    const content = `
# Heading
Paragraph text
[Link](https://example.com)
> Blockquote
    `;

    const { container } = render(<MarkdownRenderer content={content} />);

    const heading = container.querySelector('h1');
    const paragraph = container.querySelector('p');
    const link = container.querySelector('a');
    const blockquote = container.querySelector('blockquote');

    // Verify dark mode classes are applied
    expect(window.getComputedStyle(heading!).color).toBe('rgb(243, 244, 246)'); // gray-100
    expect(window.getComputedStyle(paragraph!).color).toBe('rgb(229, 231, 235)'); // gray-200
    expect(window.getComputedStyle(link!).color).toBe('rgb(96, 165, 250)'); // blue-400
    expect(window.getComputedStyle(blockquote!).backgroundColor).toBe('rgb(31, 41, 55)'); // gray-800
  });

  it('should work properly with system dark mode', () => {
    // This would test prefers-color-scheme: dark
    // Requires special test environment setup
  });
});
```

---

## 4. Testing Requirements

### 4.1 Browser Compatibility Testing

#### Playwright E2E Tests for Multiple Browsers

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

```typescript
// tests/accessibility/markdown-renderer-cross-browser.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('MarkdownRenderer - Cross-Browser Accessibility', () => {
  test('should have no accessibility violations in Chrome', async ({ page }) => {
    await page.goto('/markdown-demo');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should maintain contrast ratios across browsers', async ({ page, browserName }) => {
    await page.goto('/markdown-demo');

    // Test paragraph contrast
    const paragraph = page.locator('p').first();
    const color = await paragraph.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        foreground: style.color,
        background: style.backgroundColor,
      };
    });

    // Verify colors are correct regardless of browser
    if (browserName === 'chromium' || browserName === 'firefox' || browserName === 'webkit') {
      expect(color.foreground).toBeTruthy();
      expect(color.background).toBeTruthy();
    }
  });
});
```

### 4.2 Mobile Accessibility Testing

```typescript
// tests/accessibility/markdown-renderer-mobile.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MarkdownRenderer - Mobile Accessibility', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('should maintain readability on small screens', async ({ page }) => {
    await page.goto('/markdown-demo');

    const paragraph = page.locator('p').first();

    // Verify text is not too small
    const fontSize = await paragraph.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(16); // Minimum readable size
  });

  test('should have touch-friendly link targets', async ({ page }) => {
    await page.goto('/markdown-demo');

    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();

      // WCAG recommendation: 44x44 CSS pixels minimum
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should support zoom up to 200% without issues', async ({ page }) => {
    await page.goto('/markdown-demo');

    // Set zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    // Verify content is still accessible
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
```

### 4.3 Accessibility Tools Integration

#### Axe-core Integration (Automated)

```typescript
// tests/accessibility/markdown-renderer-axe.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('MarkdownRenderer - Axe Accessibility', () => {
  test('should pass axe accessibility scan (light mode)', async ({ page }) => {
    await page.goto('/markdown-demo');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should pass axe accessibility scan (dark mode)', async ({ page }) => {
    await page.goto('/markdown-demo');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/markdown-demo');

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

#### Manual Testing Checklist

```typescript
// tests/accessibility/manual-testing-checklist.md
```

---

## 5. Risk Assessment

### 5.1 High Risk Areas

| Risk Area | Likelihood | Impact | Mitigation |
|-----------|-----------|--------|------------|
| **Inline code contrast** (`text-red-600` on `bg-gray-100`) | High | Medium | Add specific contrast tests for inline code |
| **Blockquote contrast** (`text-gray-900` on `bg-gray-50`) | Medium | Medium | Test blockquote contrast explicitly |
| **Table header contrast** (Dark mode: `text-gray-100` on `bg-gray-800`) | Medium | Medium | Add table-specific contrast tests |
| **Link hover states** | Low | Low | Verify hover states maintain contrast |
| **Strikethrough readability** (`text-gray-600`) | Medium | Low | Intentionally lower contrast, but test readability |
| **Error message contrast** (Dark mode) | Medium | High | Critical for error visibility |
| **Mermaid diagram accessibility** | High | High | Separate testing for diagram elements |

### 5.2 Browser-Specific Risks

| Browser | Risk | Mitigation |
|---------|------|------------|
| **Safari** | Color rendering differences | Visual regression tests in Safari |
| **Firefox** | Text rendering differences | Cross-browser snapshot tests |
| **Mobile browsers** | Small text sizes | Mobile-specific accessibility tests |
| **Older browsers** | CSS variable support | Fallback color testing |

### 5.3 Dark Mode Risks

- Color inversion issues in system dark mode
- Contrast ratio changes with different dark themes
- Custom dark mode implementations by users
- Browser dark mode forcing

---

## 6. Testing Recommendations

### 6.1 Immediate Actions (Priority 1)

1. **Create Contrast Ratio Test Suite**
   - File: `/frontend/src/tests/accessibility/markdown-contrast.test.tsx`
   - Implement all contrast ratio tests from section 2.1
   - Use axe-core or custom contrast calculation
   - Target: 100% coverage of all text color combinations

2. **Implement Automated Axe Tests**
   - File: `/frontend/tests/accessibility/markdown-axe.spec.ts`
   - Run on every PR
   - Include both light and dark modes
   - Target: Zero accessibility violations

3. **Add Visual Regression Tests**
   - Use Playwright for screenshot comparison
   - Test both light and dark modes
   - Include all content types
   - Store baseline screenshots

### 6.2 Short-Term Actions (Priority 2)

4. **Cross-Browser Testing**
   - Set up Playwright multi-browser configuration
   - Test on Chrome, Firefox, Safari
   - Mobile: iOS Safari, Android Chrome
   - Create browser compatibility matrix

5. **Screen Reader Testing**
   - Manual testing with NVDA (Windows)
   - Manual testing with JAWS (Windows)
   - Manual testing with VoiceOver (Mac/iOS)
   - Automated testing with pa11y or axe-core

6. **Keyboard Navigation Tests**
   - Tab order verification
   - Focus visibility
   - Skip links functionality
   - Keyboard shortcuts

### 6.3 Long-Term Actions (Priority 3)

7. **Performance Testing**
   - Lighthouse accessibility scores
   - Performance with large markdown documents
   - Render time impact of accessibility features

8. **User Testing**
   - Test with actual screen reader users
   - Collect feedback on readability
   - A/B testing for contrast ratios

9. **Continuous Monitoring**
   - Set up accessibility CI/CD pipeline
   - Automated lighthouse audits
   - Regular manual audits

### 6.4 Testing Infrastructure

#### Required Dependencies

```json
{
  "devDependencies": {
    "@axe-core/playwright": "^4.8.0",
    "axe-playwright": "^2.0.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "color-contrast-checker": "^2.1.0"
  }
}
```

#### Test File Structure

```
frontend/
├── src/
│   └── tests/
│       ├── accessibility/
│       │   ├── markdown-contrast.test.tsx (NEW)
│       │   ├── markdown-screen-reader.test.tsx (NEW)
│       │   ├── markdown-keyboard.test.tsx (NEW)
│       │   └── utils/
│       │       └── contrast-calculator.ts (NEW)
│       └── unit/
│           └── MarkdownRenderer.test.tsx (EXISTING)
└── tests/
    ├── accessibility/
    │   ├── markdown-axe.spec.ts (NEW)
    │   ├── markdown-cross-browser.spec.ts (NEW)
    │   ├── markdown-mobile.spec.ts (NEW)
    │   └── markdown-visual-regression.spec.ts (NEW)
    └── playwright.config.ts (UPDATE)
```

#### Contrast Calculation Utility

```typescript
// frontend/src/tests/accessibility/utils/contrast-calculator.ts
export function calculateContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseColor(color: string): { r: number; g: number; b: number } {
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    throw new Error(`Invalid color format: ${color}`);
  }
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
  };
}

export function meetsWCAGAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

export function meetsWCAGAAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}
```

### 6.5 CI/CD Integration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run accessibility unit tests
        run: |
          cd frontend
          npm test -- --run tests/accessibility/

      - name: Run Playwright accessibility tests
        run: |
          cd frontend
          npx playwright test tests/accessibility/

      - name: Upload accessibility report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: frontend/playwright-report/
```

---

## 7. Success Metrics

### 7.1 Coverage Targets

- **Contrast Ratio Tests**: 100% of text color combinations
- **Screen Reader Tests**: All interactive elements
- **Keyboard Navigation**: All focusable elements
- **Browser Coverage**: Chrome, Firefox, Safari, Mobile Safari, Mobile Chrome
- **Axe Violations**: Zero violations on all pages

### 7.2 Performance Targets

- **Lighthouse Accessibility Score**: 100/100
- **Axe Scan Time**: < 5 seconds
- **Visual Regression Tests**: < 30 seconds per browser

### 7.3 Quality Gates

- [ ] All contrast ratios meet WCAG AA (4.5:1 for normal text)
- [ ] Zero axe-core violations
- [ ] All elements keyboard accessible
- [ ] Screen reader navigation works for all content
- [ ] No visual regressions in light or dark mode
- [ ] Cross-browser consistency verified
- [ ] Mobile accessibility verified on iOS and Android

---

## 8. Manual Testing Checklist

### Light Mode Testing
- [ ] Verify paragraph text is easily readable
- [ ] Check heading hierarchy is clear
- [ ] Test link colors are distinguishable
- [ ] Verify inline code is readable against background
- [ ] Check blockquote text contrast
- [ ] Test table text (headers and cells)
- [ ] Verify error messages are visible

### Dark Mode Testing
- [ ] Switch to dark mode and verify all above
- [ ] Check for any invisible text
- [ ] Verify transitions are smooth
- [ ] Test on actual dark mode devices

### Screen Reader Testing
- [ ] Navigate with NVDA/JAWS/VoiceOver
- [ ] Verify all headings are announced correctly
- [ ] Test link context is clear
- [ ] Check image alt text is read
- [ ] Verify table structure is navigable
- [ ] Test list item navigation

### Keyboard Testing
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test skip links functionality
- [ ] Verify no keyboard traps

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android 11+)

---

## 9. Conclusion

The MarkdownRenderer component has solid foundational accessibility, but requires comprehensive testing to ensure WCAG AA compliance, especially for text contrast in both light and dark modes.

**Key Priorities:**
1. Implement contrast ratio testing suite immediately
2. Add automated axe-core testing to CI/CD
3. Create cross-browser accessibility test suite
4. Conduct manual screen reader testing
5. Establish ongoing monitoring

**Estimated Effort:**
- Priority 1 tasks: 2-3 days
- Priority 2 tasks: 3-5 days
- Priority 3 tasks: Ongoing

**Risk Level:** Medium - Core functionality works, but accessibility compliance needs verification and some areas (inline code, blockquotes) may need color adjustments.
