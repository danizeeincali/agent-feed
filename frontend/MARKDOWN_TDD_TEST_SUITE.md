# Markdown Components - London School TDD Test Suite

## Overview

Comprehensive test suite for markdown rendering components using **London School TDD** methodology (mock-driven development). All tests are written FIRST before implementation and focus on behavior verification and object interactions.

## Test Files Created

### 1. MarkdownRenderer.test.tsx
**Location:** `/workspaces/agent-feed/frontend/src/components/markdown/MarkdownRenderer.test.tsx`

**Test Coverage:**
- Basic Markdown Rendering (5 tests)
  - Plain text, bold, italic, headers, strikethrough
- Code Block Rendering (5 tests)
  - Delegation to CodeBlock component
  - Language detection
  - Inline vs block code
  - Multiple code blocks
- Link Rendering (3 tests)
  - Delegation to LinkRenderer component
  - Multiple links
  - Missing href handling
- List Rendering (4 tests)
  - Unordered, ordered, nested, task lists
- Table Rendering (3 tests)
  - Headers, alignment, empty cells
- Blockquote Rendering (3 tests)
  - Single, nested, with markdown elements
- Edge Cases (5 tests)
  - Empty, null, undefined, malformed, long content
- Security Tests (6 tests)
  - Script tag escaping
  - Protocol blocking (javascript:, vbscript:, data:)
  - HTML sanitization
- Performance Tests (4 tests)
  - Memoization
  - Large content rendering
  - Re-render optimization
- Component Integration (4 tests)
  - CodeBlock integration
  - LinkRenderer integration
  - Custom styling
- Accessibility (3 tests)
  - Semantic HTML, heading hierarchy, image alt text

**Total Tests:** 45

---

### 2. CodeBlock.test.tsx
**Location:** `/workspaces/agent-feed/frontend/src/components/markdown/CodeBlock.test.tsx`

**Test Coverage:**
- Inline Code Rendering (4 tests)
  - Single backtick, styling, no copy button, no line numbers
- Code Block Rendering (6 tests)
  - Language detection, default language, container structure
  - Language label, case handling
- Syntax Highlighting (9 tests)
  - JavaScript, TypeScript, Python, Bash, JSON, CSS, HTML, SQL
  - Unsupported language fallback
- Line Numbers (6 tests)
  - Show for >10 lines
  - Hide for ≤10 lines
  - Correct numbering
  - Alignment
  - Manual control via props
- Copy Button Behavior (9 tests)
  - Show/hide on hover
  - Copy to clipboard
  - "Copied!" feedback
  - Timeout reset
  - Error handling
  - Multiline code preservation
  - Whitespace preservation
- Edge Cases (7 tests)
  - Empty, null, undefined code
  - Very long lines
  - Special characters, unicode, tabs
- Styling and Themes (4 tests)
  - Dark/light theme
  - Custom className and styles
- Performance Tests (3 tests)
  - Large code blocks
  - Memoization
  - Debouncing
- Accessibility (4 tests)
  - Accessible copy button
  - Screen reader announcements
  - ARIA roles
  - Keyboard navigation
- Integration Tests (2 tests)
  - MarkdownRenderer integration
  - react-markdown props handling

**Total Tests:** 54

---

### 3. LinkRenderer.test.tsx
**Location:** `/workspaces/agent-feed/frontend/src/components/markdown/LinkRenderer.test.tsx`

**Test Coverage:**
- Basic Link Rendering (4 tests)
  - href attribute, text content, multiple children, styling
- External Link Handling (8 tests)
  - target="_blank" for external
  - rel="noopener noreferrer"
  - Internal link detection
  - Hash links
  - Protocol detection (http, https, //)
- Security - Protocol Validation (10 tests)
  - Block javascript:, vbscript:, data:, file:
  - Allow mailto:, tel:
  - Case-insensitive checking
  - Encoded protocol blocking
  - Event handler sanitization
- Edge Cases (8 tests)
  - Missing, null, undefined href
  - Empty children
  - Whitespace handling
  - Special characters, unicode
  - Very long URLs
- Styling and Customization (5 tests)
  - Custom className, style
  - Class merging
  - External link indicator
- Accessibility (7 tests)
  - Role attribute
  - aria-label support
  - Screen reader indication
  - Keyboard navigation
  - Focus indicator
  - Title attribute
- Click Behavior (4 tests)
  - Click events
  - Prevent default
  - Middle button clicks
  - Ctrl+Click
- URL Validation (3 tests)
  - Valid HTTP URLs
  - Relative URLs
  - URL normalization
- Integration (2 tests)
  - react-markdown props
  - Children as array
- Performance (2 tests)
  - Render time
  - Memoization
- Error Logging (2 tests)
  - Warning for blocked protocols
  - No warnings for safe protocols

**Total Tests:** 55

---

## London School TDD Patterns Used

### 1. Mock-First Approach
All external dependencies are mocked before writing tests:
```typescript
const mockCodeBlock = jest.fn((props) => (
  <div data-testid="mock-code-block">{props.children}</div>
));

const mockClipboard = {
  writeText: jest.fn(),
  readText: jest.fn(),
};
```

### 2. Behavior Verification
Tests focus on HOW objects collaborate:
```typescript
expect(mockCodeBlock).toHaveBeenCalledWith(
  expect.objectContaining({
    language: 'javascript',
    children: 'const x = 42;',
  }),
  expect.anything()
);
```

### 3. Interaction Testing
Verify component conversations:
```typescript
await userEvent.click(copyButton);
expect(mockClipboard.writeText).toHaveBeenCalledWith(code);
expect(screen.findByText('Copied!')).toBeInTheDocument();
```

### 4. Contract Definition
Mock expectations define component contracts:
```typescript
// LinkRenderer contract: must receive href and children
expect(mockLinkRenderer).toHaveBeenCalledWith(
  expect.objectContaining({
    href: 'https://example.com',
    children: 'Click here',
  }),
  expect.anything()
);
```

## Test Execution

### Run All Tests
```bash
cd /workspaces/agent-feed/frontend
npm test -- --testPathPattern=markdown
```

### Run Individual Test Files
```bash
# MarkdownRenderer tests
npm test -- MarkdownRenderer.test.tsx

# CodeBlock tests
npm test -- CodeBlock.test.tsx

# LinkRenderer tests
npm test -- LinkRenderer.test.tsx
```

### Run with Coverage
```bash
npm test -- --coverage --testPathPattern=markdown
```

### Watch Mode
```bash
npm test -- --watch --testPathPattern=markdown
```

## Expected Initial Results

**All tests will FAIL** until components are implemented. This is expected with TDD!

Example expected errors:
```
Cannot find module './MarkdownRenderer'
Cannot find module './CodeBlock'
Cannot find module './LinkRenderer'
```

## Implementation Checklist

Components should be created in this order:

1. **LinkRenderer** (simplest, no external dependencies)
   - File: `/workspaces/agent-feed/frontend/src/components/markdown/LinkRenderer.tsx`
   - 55 tests to pass

2. **CodeBlock** (moderate complexity, clipboard integration)
   - File: `/workspaces/agent-feed/frontend/src/components/markdown/CodeBlock.tsx`
   - Dependencies: react-syntax-highlighter
   - 54 tests to pass

3. **MarkdownRenderer** (most complex, integrates others)
   - File: `/workspaces/agent-feed/frontend/src/components/markdown/MarkdownRenderer.tsx`
   - Dependencies: react-markdown, CodeBlock, LinkRenderer
   - 45 tests to pass

## Required Dependencies

Add these to package.json if not already present:

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-sanitize": "^6.0.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@jest/globals": "^29.0.0"
  }
}
```

Install:
```bash
cd /workspaces/agent-feed/frontend
npm install react-markdown remark-gfm rehype-sanitize react-syntax-highlighter
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

## Test Statistics

- **Total Test Files:** 3
- **Total Test Suites:** 154 tests across all components
- **Security Tests:** 16 tests
- **Accessibility Tests:** 14 tests
- **Performance Tests:** 9 tests
- **Integration Tests:** 8 tests
- **Edge Case Tests:** 20 tests

## Key Testing Principles Applied

1. **Tests First, Code Second** - All tests written before implementation
2. **Mock External Dependencies** - Isolate units under test
3. **Verify Behavior, Not Implementation** - Test what components DO, not how
4. **Focus on Interactions** - Test how components collaborate
5. **Define Contracts Through Mocks** - Mock expectations specify interfaces
6. **Security as Priority** - Extensive XSS and protocol validation tests
7. **Accessibility Built-In** - ARIA, keyboard navigation, screen reader tests
8. **Performance Conscious** - Memoization and render time tests

## Next Steps

1. Run tests to confirm they fail (TDD red phase)
2. Implement LinkRenderer to pass its 55 tests
3. Implement CodeBlock to pass its 54 tests
4. Implement MarkdownRenderer to pass its 45 tests
5. Run full test suite to confirm all 154 tests pass (TDD green phase)
6. Refactor implementations while keeping tests green

## Success Criteria

- All 154 tests pass
- No security vulnerabilities in link/markdown rendering
- Clipboard API properly mocked and tested
- Components properly memoized for performance
- Full accessibility compliance
- All edge cases handled gracefully
