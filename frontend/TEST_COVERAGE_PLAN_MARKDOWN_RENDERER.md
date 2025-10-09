# MarkdownRenderer Prose Class Removal - Test Coverage Plan

## Executive Summary

The MarkdownRenderer component has removed Tailwind's `prose` utility classes in favor of explicit color utilities (`text-gray-900`, `text-gray-200`, etc.). This change requires comprehensive testing to ensure:

1. **No visual regressions** - All text maintains proper contrast and readability
2. **WCAG compliance** - All text meets AA/AAA contrast standards
3. **Dark mode functionality** - Proper color switching in dark mode
4. **All markdown features work** - No broken rendering
5. **Cross-browser compatibility** - Consistent appearance across browsers

---

## 1. What Changed: Analysis

### Before (with prose classes)
```tsx
<div className="markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none">
```
- Relied on Tailwind's `@tailwindcss/typography` plugin
- Automatic text colors via prose utility
- Less explicit control over individual element colors

### After (explicit colors)
```tsx
<div className="markdown-renderer max-w-none">
```

With explicit color classes on each element:
- **Paragraphs**: `text-gray-900 dark:text-gray-200`
- **Headings**: `text-gray-900 dark:text-gray-100`
- **Lists**: `text-gray-900 dark:text-gray-200`
- **Blockquotes**: `text-gray-900 dark:text-gray-200`
- **Tables**: `text-gray-900 dark:text-gray-200` (cells), `text-gray-900 dark:text-gray-100` (headers)
- **Bold text**: `text-gray-900 dark:text-gray-100`
- **Strikethrough**: `text-gray-600 dark:text-gray-400` (intentionally muted)
- **Links**: `text-blue-600 dark:text-blue-400`
- **Inline code**: `text-red-600 dark:text-red-400`

---

## 2. Critical Test Cases

### 2.1 Text Color Verification Tests

**Priority: CRITICAL**

#### Test: Paragraph Text Contrast (Light Mode)
```typescript
it('should render paragraphs with text-gray-900 in light mode', () => {
  const content = 'This is a test paragraph.';
  const { container } = render(<MarkdownRenderer content={content} />);

  const paragraph = container.querySelector('p');
  expect(paragraph).toHaveClass('text-gray-900');

  // Verify computed color
  const computedColor = getComputedStyle(paragraph!).color;
  expect(computedColor).toBe('rgb(17, 24, 39)'); // gray-900
});
```

**Expected**: Dark, high-contrast text (gray-900 = #111827)
**Risk**: Medium - If colors not applied, text may be default browser color
**Verification**: Visual + Automated

#### Test: Paragraph Text Contrast (Dark Mode)
```typescript
it('should render paragraphs with text-gray-200 in dark mode', () => {
  document.documentElement.classList.add('dark');

  const content = 'This is a test paragraph.';
  const { container } = render(<MarkdownRenderer content={content} />);

  const paragraph = container.querySelector('p');
  expect(paragraph).toHaveClass('dark:text-gray-200');

  // Verify computed color in dark mode
  const computedColor = getComputedStyle(paragraph!).color;
  expect(computedColor).toBe('rgb(229, 231, 235)'); // gray-200
});
```

**Expected**: Light gray text on dark background
**Risk**: HIGH - Dark mode may not switch properly
**Verification**: Visual + Automated

#### Test: All Heading Levels Have Correct Colors
```typescript
it('should render all headings with text-gray-900 in light mode', () => {
  const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
  `;

  const { container } = render(<MarkdownRenderer content={content} />);

  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const heading = container.querySelector(tag);
    expect(heading).toHaveClass('text-gray-900');
  });
});
```

**Expected**: All headings dark gray (900) in light mode, light gray (100) in dark mode
**Risk**: Low - Straightforward class application
**Verification**: Automated

#### Test: List Items Have Correct Text Colors
```typescript
it('should render list items with text-gray-900', () => {
  const content = `
- Item 1
- Item 2
- Item 3
  `;

  const { container } = render(<MarkdownRenderer content={content} />);

  const ul = container.querySelector('ul');
  expect(ul).toHaveClass('text-gray-900');

  // List inherits color from parent
  const items = container.querySelectorAll('li');
  items.forEach(item => {
    const computedColor = getComputedStyle(item).color;
    expect(computedColor).toBe('rgb(17, 24, 39)');
  });
});
```

**Expected**: List text inherits gray-900 from parent ul/ol
**Risk**: Medium - Inheritance may not work as expected
**Verification**: Automated + Visual

#### Test: Blockquote Text Color
```typescript
it('should render blockquotes with text-gray-900', () => {
  const content = '> This is a blockquote';
  const { container } = render(<MarkdownRenderer content={content} />);

  const blockquote = container.querySelector('blockquote');
  expect(blockquote).toHaveClass('text-gray-900');
});
```

**Expected**: Dark text on light gray background
**Risk**: Medium - Background + text color interaction
**Verification**: Visual (contrast ratio)

#### Test: Table Headers and Cells
```typescript
it('should render table headers with text-gray-900', () => {
  const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
  `;

  const { container } = render(<MarkdownRenderer content={content} />);

  const th = container.querySelector('th');
  expect(th).toHaveClass('text-gray-900');

  const td = container.querySelector('td');
  expect(td).toHaveClass('text-gray-900');
});
```

**Expected**: Consistent dark text in both headers and cells
**Risk**: Low
**Verification**: Automated

---

### 2.2 WCAG AA Contrast Compliance Tests

**Priority: CRITICAL**

All tests from `/workspaces/agent-feed/frontend/src/tests/accessibility/markdown-contrast.test.tsx` should pass:

#### Test: Paragraph Contrast Ratio
```typescript
it('should meet WCAG AA contrast for paragraphs', () => {
  const foreground = getTailwindColor('gray-900'); // #111827
  const background = getTailwindColor('white');      // #ffffff

  const ratio = calculateContrastRatio(foreground, background);

  expect(ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA requirement
  expect(ratio).toBeGreaterThanOrEqual(7.0); // Should achieve AAA (21:1 max)
});
```

**Expected**: ~21:1 contrast ratio (AAA level)
**Risk**: LOW - gray-900 on white is excellent contrast
**Verification**: Automated (color math)

#### Test: Dark Mode Contrast Ratio
```typescript
it('should meet WCAG AA contrast for dark mode paragraphs', () => {
  const foreground = getTailwindColor('gray-200'); // #e5e7eb
  const background = getTailwindColor('gray-900'); // #111827

  const ratio = calculateContrastRatio(foreground, background);

  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
```

**Expected**: >4.5:1 (actual: ~12.6:1)
**Risk**: LOW
**Verification**: Automated

#### Test: All Elements Pass WCAG AA
```typescript
it('should verify all markdown elements meet WCAG AA', () => {
  const testCases = [
    { fg: 'gray-900', bg: 'white', element: 'paragraph' },
    { fg: 'gray-900', bg: 'white', element: 'heading' },
    { fg: 'gray-900', bg: 'gray-50', element: 'blockquote' },
    { fg: 'blue-600', bg: 'white', element: 'link' },
    { fg: 'red-600', bg: 'gray-100', element: 'inline-code' },
    { fg: 'gray-900', bg: 'white', element: 'table-cell' },
  ];

  testCases.forEach(({ fg, bg, element }) => {
    const ratio = calculateContrastRatio(
      getTailwindColor(fg),
      getTailwindColor(bg)
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5);
    console.log(`✓ ${element}: ${ratio.toFixed(2)}:1`);
  });
});
```

**Expected**: All ratios >4.5:1
**Risk**: MEDIUM - Some combinations (inline code) may be borderline
**Verification**: Automated

---

### 2.3 Markdown Feature Completeness Tests

**Priority: HIGH**

These tests verify that removing prose classes didn't break any markdown rendering:

#### Test: All Markdown Elements Render
```typescript
it('should render all markdown elements correctly', () => {
  const complexMarkdown = `
# Main Heading
## Subheading

This is a paragraph with **bold**, *italic*, and \`inline code\`.

- Unordered list item 1
- Unordered list item 2

1. Ordered list item 1
2. Ordered list item 2

> This is a blockquote

[Link](https://example.com)

![Image](https://example.com/image.jpg)

---

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

\`\`\`javascript
const code = 'block';
\`\`\`

This has ~~strikethrough~~ text.
  `;

  const { container } = render(<MarkdownRenderer content={complexMarkdown} />);

  // Verify all elements exist
  expect(container.querySelector('h1')).toBeInTheDocument();
  expect(container.querySelector('h2')).toBeInTheDocument();
  expect(container.querySelector('p')).toBeInTheDocument();
  expect(container.querySelector('strong')).toBeInTheDocument();
  expect(container.querySelector('em')).toBeInTheDocument();
  expect(container.querySelector('code')).toBeInTheDocument();
  expect(container.querySelector('ul')).toBeInTheDocument();
  expect(container.querySelector('ol')).toBeInTheDocument();
  expect(container.querySelector('blockquote')).toBeInTheDocument();
  expect(container.querySelector('a')).toBeInTheDocument();
  expect(container.querySelector('img')).toBeInTheDocument();
  expect(container.querySelector('hr')).toBeInTheDocument();
  expect(container.querySelector('table')).toBeInTheDocument();
  expect(container.querySelector('pre')).toBeInTheDocument();
  expect(container.querySelector('del')).toBeInTheDocument();
});
```

**Expected**: All elements render without errors
**Risk**: LOW - Component structure unchanged
**Verification**: Automated

#### Test: Mermaid Diagrams Still Work
```typescript
it('should render mermaid diagrams without issues', async () => {
  const content = `
\`\`\`mermaid
graph TD
  A[Start] --> B[End]
\`\`\`
  `;

  const { container } = render(<MarkdownRenderer content={content} />);

  // Wait for mermaid to render
  await waitFor(() => {
    expect(container.querySelector('svg')).toBeInTheDocument();
  }, { timeout: 5000 });

  // Verify no errors
  expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
});
```

**Expected**: Diagrams render successfully
**Risk**: LOW - Mermaid rendering separate from prose classes
**Verification**: E2E test

---

### 2.4 Dark Mode Tests

**Priority: CRITICAL**

#### Test: Dark Mode Toggle Switches Colors
```typescript
it('should switch all text colors when toggling dark mode', () => {
  const content = `
# Heading
This is a paragraph.
- List item
> Blockquote
  `;

  const { container, rerender } = render(<MarkdownRenderer content={content} />);

  // Light mode verification
  const h1 = container.querySelector('h1')!;
  const p = container.querySelector('p')!;

  expect(getComputedStyle(h1).color).toBe('rgb(17, 24, 39)'); // gray-900
  expect(getComputedStyle(p).color).toBe('rgb(17, 24, 39)');

  // Enable dark mode
  document.documentElement.classList.add('dark');
  rerender(<MarkdownRenderer content={content} />);

  // Dark mode verification
  expect(getComputedStyle(h1).color).toBe('rgb(243, 244, 246)'); // gray-100
  expect(getComputedStyle(p).color).toBe('rgb(229, 231, 235)'); // gray-200

  // Cleanup
  document.documentElement.classList.remove('dark');
});
```

**Expected**: Colors switch correctly
**Risk**: HIGH - This is the main risk area
**Verification**: Automated + Visual

#### Test: Dark Mode Background Contrast
```typescript
it('should maintain proper background contrast in dark mode', () => {
  document.documentElement.classList.add('dark');

  const content = '> Blockquote with background';
  const { container } = render(<MarkdownRenderer content={content} />);

  const blockquote = container.querySelector('blockquote')!;
  const computedBg = getComputedStyle(blockquote).backgroundColor;
  const computedColor = getComputedStyle(blockquote).color;

  // Verify dark background
  expect(computedBg).toContain('31, 41, 55'); // gray-800

  // Verify light text
  expect(computedColor).toContain('229, 231, 235'); // gray-200

  document.documentElement.classList.remove('dark');
});
```

**Expected**: Proper contrast in dark mode
**Risk**: MEDIUM
**Verification**: Automated

---

### 2.5 Visual Regression Tests

**Priority: HIGH**

#### Test: Before/After Screenshot Comparison
```typescript
// Using Playwright for visual regression
test('should match previous rendering visually', async ({ page }) => {
  await page.goto('/test-markdown-renderer');

  // Take screenshot
  const screenshot = await page.screenshot();

  // Compare with baseline (stored screenshot from before change)
  expect(screenshot).toMatchSnapshot('markdown-renderer-light.png');
});
```

**Expected**: Visual appearance unchanged except for text color
**Risk**: MEDIUM - May show minor differences
**Verification**: Visual regression tool (Playwright/Percy)

#### Test: Dark Mode Visual Regression
```typescript
test('should match dark mode rendering visually', async ({ page }) => {
  await page.goto('/test-markdown-renderer');
  await page.evaluate(() => document.documentElement.classList.add('dark'));

  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot('markdown-renderer-dark.png');
});
```

**Expected**: Consistent dark mode appearance
**Risk**: HIGH - Main area of concern
**Verification**: Visual regression

---

### 2.6 Cross-Browser Compatibility Tests

**Priority: MEDIUM**

#### Test: Color Consistency Across Browsers
```typescript
// Playwright multi-browser test
test.describe('Cross-browser color rendering', () => {
  test('renders same colors in Chromium', async ({ page }) => {
    // Chromium-specific test
  });

  test('renders same colors in Firefox', async ({ page }) => {
    // Firefox-specific test
  });

  test('renders same colors in WebKit/Safari', async ({ page }) => {
    // WebKit-specific test
  });
});
```

**Expected**: Identical rendering across browsers
**Risk**: LOW - CSS colors are standard
**Verification**: E2E on multiple browsers

---

### 2.7 Spacing and Layout Tests

**Priority: MEDIUM**

#### Test: Spacing Maintained Without Prose
```typescript
it('should maintain proper spacing between elements', () => {
  const content = `
# Heading

Paragraph 1

Paragraph 2

- List item 1
- List item 2
  `;

  const { container } = render(<MarkdownRenderer content={content} />);

  const h1 = container.querySelector('h1')!;
  const p1 = container.querySelectorAll('p')[0]!;

  // Verify margins
  expect(getComputedStyle(h1).marginBottom).toBeTruthy();
  expect(getComputedStyle(p1).marginBottom).toBeTruthy();

  // Classes should still be present
  expect(h1).toHaveClass('mb-4');
  expect(p1).toHaveClass('mb-4');
});
```

**Expected**: Spacing unchanged
**Risk**: LOW - Spacing classes still present
**Verification**: Automated

---

## 3. Risk Assessment

### 3.1 High-Risk Areas

| Risk Area | Severity | Probability | Impact | Mitigation |
|-----------|----------|-------------|--------|------------|
| **Dark mode not switching** | CRITICAL | Medium | High | Comprehensive dark mode tests |
| **Text invisible (wrong color)** | CRITICAL | Low | Critical | Color verification tests |
| **WCAG contrast failure** | HIGH | Low | High | Automated contrast testing |
| **Visual regressions** | MEDIUM | Medium | Medium | Screenshot comparison tests |

### 3.2 Medium-Risk Areas

| Risk Area | Severity | Probability | Impact | Mitigation |
|-----------|----------|-------------|--------|------------|
| **Inline code hard to read** | MEDIUM | Low | Medium | Manual testing + user feedback |
| **Blockquote contrast** | MEDIUM | Low | Medium | Specific contrast tests |
| **Table readability** | MEDIUM | Low | Medium | Visual inspection |

### 3.3 Low-Risk Areas

| Risk Area | Severity | Probability | Impact | Mitigation |
|-----------|----------|-------------|--------|------------|
| **Mermaid diagrams** | LOW | Very Low | Low | Mermaid unchanged by this change |
| **Code blocks** | LOW | Very Low | Low | Already tested separately |
| **Link functionality** | LOW | Very Low | Low | Link handling unchanged |

---

## 4. Testing Strategy

### 4.1 Test Pyramid

```
                    /\
                   /E2E\        Visual Regression (5 tests)
                  /------\      Browser Compatibility
                 /--------\
                /Integration\   Component Integration (10 tests)
               /------------\   Dark Mode Toggle
              /--------------\
             /   Unit Tests   \  Color Verification (40+ tests)
            /------------------\ Contrast Ratios, Rendering
           /--------------------\
```

### 4.2 Test Execution Order

1. **Phase 1: Unit Tests** (Fastest, run first)
   - Color class verification
   - Contrast ratio calculations
   - Element rendering
   - ~40 tests, <5 seconds

2. **Phase 2: Integration Tests**
   - Dark mode switching
   - Complex markdown rendering
   - Nested elements
   - ~10 tests, <30 seconds

3. **Phase 3: E2E Tests**
   - Visual regression
   - Browser compatibility
   - Real user workflows
   - ~5 tests, ~2 minutes

4. **Phase 4: Manual Testing**
   - Accessibility review
   - UX verification
   - Edge cases
   - ~15 minutes

### 4.3 Automation Strategy

```typescript
// package.json scripts
{
  "test:markdown": "vitest run tests/MarkdownRenderer.test.tsx",
  "test:markdown:contrast": "vitest run tests/accessibility/markdown-contrast.test.tsx",
  "test:markdown:e2e": "playwright test tests/e2e/markdown-rendering.spec.ts",
  "test:markdown:visual": "playwright test --update-snapshots tests/visual-regression/markdown.spec.ts",
  "test:markdown:all": "npm run test:markdown && npm run test:markdown:contrast && npm run test:markdown:e2e"
}
```

---

## 5. Acceptance Criteria

### 5.1 Must Pass (Blocking)

- [ ] All existing unit tests pass
- [ ] All contrast tests pass (WCAG AA)
- [ ] Dark mode switches colors correctly
- [ ] No visual regressions in light mode
- [ ] No visual regressions in dark mode
- [ ] All markdown elements render
- [ ] Mermaid diagrams work

### 5.2 Should Pass (High Priority)

- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)
- [ ] Mobile responsive rendering
- [ ] Accessibility audit passes
- [ ] No console errors/warnings

### 5.3 Nice to Have

- [ ] Performance benchmarks met
- [ ] Screenshot tests pass
- [ ] User acceptance testing complete

---

## 6. Test Execution Plan

### 6.1 Pre-Deployment Checklist

```bash
# 1. Run all unit tests
npm run test:markdown

# 2. Run accessibility tests
npm run test:markdown:contrast

# 3. Run E2E tests
npm run test:markdown:e2e

# 4. Update visual regression baselines if needed
npm run test:markdown:visual

# 5. Manual testing
# - Toggle dark mode manually
# - Check each markdown element type
# - Verify colors visually
# - Test on mobile device

# 6. Browser compatibility
# - Test in Chrome
# - Test in Firefox
# - Test in Safari

# 7. Accessibility audit
# - Run axe DevTools
# - Verify screen reader compatibility
```

### 6.2 Rollback Plan

If critical issues found:

1. **Immediate**: Revert commit
2. **Short-term**: Fix issues identified
3. **Long-term**: Add missing test coverage

---

## 7. Recommended Test Files

### Files to Create/Update:

1. **Unit Tests** (Exists)
   - `/workspaces/agent-feed/frontend/src/tests/MarkdownRenderer.test.tsx`
   - ✅ Already comprehensive

2. **Contrast Tests** (Exists)
   - `/workspaces/agent-feed/frontend/src/tests/accessibility/markdown-contrast.test.tsx`
   - ✅ Already comprehensive

3. **Dark Mode Tests** (Create New)
   - `/workspaces/agent-feed/frontend/src/tests/MarkdownRenderer.dark-mode.test.tsx`
   - ⚠️ Needs creation

4. **Visual Regression** (Create New)
   - `/workspaces/agent-feed/frontend/src/__tests__/e2e/markdown-visual-regression.spec.ts`
   - ⚠️ Needs creation

5. **Integration Tests** (Update Existing)
   - `/workspaces/agent-feed/frontend/src/tests/components/DynamicPageRenderer-mermaid.test.tsx`
   - ⚠️ Verify mermaid still works

---

## 8. Critical Test Cases Summary

### Must Test Before Deployment:

1. ✅ **Paragraph text is dark gray (gray-900)** - AUTOMATED
2. ✅ **Headings are dark gray (gray-900)** - AUTOMATED
3. ✅ **Lists are dark gray (gray-900)** - AUTOMATED
4. ⚠️ **Dark mode switches to light gray (gray-200/100)** - MANUAL + AUTOMATED
5. ✅ **WCAG AA contrast ratios met** - AUTOMATED
6. ✅ **All markdown elements render** - AUTOMATED
7. ⚠️ **Mermaid diagrams work** - E2E
8. ⚠️ **No visual regressions** - VISUAL REGRESSION
9. ⚠️ **Cross-browser consistency** - E2E

---

## 9. Test Results Template

```markdown
## Test Execution Results

**Date**: [DATE]
**Tester**: [NAME]
**Environment**: [ENV]

### Unit Tests
- [ ] Color verification: PASS/FAIL
- [ ] Contrast ratios: PASS/FAIL
- [ ] Element rendering: PASS/FAIL

### Integration Tests
- [ ] Dark mode: PASS/FAIL
- [ ] Complex markdown: PASS/FAIL

### E2E Tests
- [ ] Visual regression: PASS/FAIL
- [ ] Browser compat: PASS/FAIL

### Manual Testing
- [ ] Dark mode toggle: PASS/FAIL
- [ ] Accessibility: PASS/FAIL
- [ ] Mobile: PASS/FAIL

### Issues Found
1. [Description]
2. [Description]

### Sign-off
- [ ] Ready for deployment
- [ ] Needs fixes
```

---

## 10. Conclusion

This test coverage plan ensures that the prose class removal does not introduce:
- Visual regressions
- Accessibility issues
- Functional breakages
- Dark mode problems

**Recommendation**: Execute all automated tests, perform visual inspection in light/dark modes, and verify on multiple browsers before deploying.

**Estimated Test Time**:
- Automated: ~5 minutes
- Manual: ~15 minutes
- Total: ~20 minutes

**Risk Level**: MEDIUM-LOW (with proper testing)
