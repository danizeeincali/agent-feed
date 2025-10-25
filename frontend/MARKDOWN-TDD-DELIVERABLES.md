# Markdown Renderer TDD Test Suite - Deliverables

**Project:** Agent Feed - Markdown Rendering Integration
**Methodology:** London School TDD (Mockist Approach)
**Framework:** Vitest + React Testing Library
**Status:** RED PHASE - Ready for Implementation
**Date:** 2025-10-25

---

## Executive Summary

Complete TDD test suite created following London School methodology for Markdown rendering with @mention, #hashtag, and URL preservation. All dependencies installed, SPARC documentation complete, comprehensive test coverage ready.

### Deliverables Summary

| Item | Location | Status |
|------|----------|--------|
| **Test Suite** | `/frontend/src/tests/unit/markdown-renderer.test.tsx` | Complete (47 tests) |
| **Test Summary** | `/frontend/src/tests/unit/MARKDOWN-RENDERER-TDD-SUMMARY.md` | Complete |
| **Quick Start** | `/frontend/src/tests/unit/MARKDOWN-TDD-QUICK-START.md` | Complete |
| **SPARC Spec** | `/docs/SPARC-MARKDOWN-RENDERING-SPEC.md` | Pre-existing |
| **SPARC Architecture** | `/docs/SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md` | Pre-existing |
| **SPARC Pseudocode** | `/docs/SPARC-MARKDOWN-RENDERING-PSEUDOCODE.md` | Pre-existing |

---

## Test Suite Overview

### File: `/frontend/src/tests/unit/markdown-renderer.test.tsx`

**Total Tests:** 47
**Current Status:** All failing (TDD RED phase)
**Lines of Code:** 800+
**Coverage Target:** 80%+

### Test Breakdown by Category

#### 1. Basic Markdown Features (8 tests)
- FR-002: Headers (H1, H2, H3) rendering - 4 tests
- FR-003: Text formatting (bold, italic, inline code) - 4 tests

#### 2. Preserve Special Content (17 tests) - CRITICAL
- FR-009: @Mention preservation and click handlers - 5 tests
- FR-010: #Hashtag preservation (excluding ## headers) - 5 tests
- FR-011: URL preservation and link previews - 7 tests

#### 3. Security (4 tests)
- XSS prevention (script tags, javascript:, onerror) - 4 tests

#### 4. Integration (8 tests)
- Combined markdown + special content - 3 tests
- Edge cases (empty, whitespace, malformed, performance) - 5 tests

#### 5. Behavior Verification (8 tests) - London School Focus
- Mention/hashtag click handler collaboration - 3 tests
- Link preview generation collaboration - 2 tests
- Multiple clicks and handler invocations - 3 tests

#### 6. Styling (2 tests)
- CSS class application - 2 tests

---

## London School TDD Methodology

### Principles Applied

#### 1. Mock All External Dependencies
```typescript
✅ react-markdown - Mocked
✅ remark-gfm - Mocked
✅ rehype-sanitize - Mocked
✅ rehype-highlight - Mocked
```

#### 2. Test Behavior, Not Implementation
```typescript
// Testing: What the user sees and interacts with
✅ Clickable @mention buttons
✅ Click handlers trigger with correct arguments
✅ Markdown renders to correct HTML elements
✅ Link previews appear/disappear based on flag

// NOT testing: Internal state, data structures, parsing logic
```

#### 3. Focus on Object Collaboration
```typescript
// Test conversations between objects:
Button Click → Handler Called → Correct Argument Passed
URL Detected → Preview Generated → Preview Visible
Flag Disabled → Preview Not Generated
```

---

## Critical Test Cases

### 1. Markdown Headers vs Hashtags (Most Complex)

**Test:** "should NOT treat markdown headers as hashtags"

**Why Critical:**
Markdown uses `##` for headers. App uses `#` for hashtags. Parser must distinguish:
- `## Header` → `<h2>Header</h2>` (NOT clickable)
- `#hashtag` → `<button>#hashtag</button>` (clickable)

**Test Code:**
```typescript
it('should NOT treat markdown headers as hashtags (CRITICAL)', () => {
  const content = `
## This is a Header
This is a #hashtag
  `.trim();

  render(<MarkdownRenderer content={content} />);

  // ✓ ## header rendered as H2
  expect(screen.queryByRole('heading', { level: 2 }))
    .toHaveTextContent('This is a Header');

  // ✓ Real hashtag rendered as clickable button
  expect(screen.queryByTestId('hashtag-hashtag')).toBeInTheDocument();

  // ✓ NO button for ## header symbols
  expect(screen.queryByTestId('hashtag-This')).not.toBeInTheDocument();
});
```

### 2. Comprehensive Integration Test

**Test:** "should handle markdown + mentions + hashtags + URLs in same post"

**Why Critical:**
Real-world posts combine all features. This test verifies everything works together.

**Test Code:**
```typescript
it('should handle markdown + mentions + hashtags + URLs in same post', () => {
  const content = `
# Project Update

Thanks to @alice for the **excellent** code review!

Topics covered: #react #typescript

Documentation: https://docs.example.com
  `.trim();

  const handleMentionClick = vi.fn();
  const handleHashtagClick = vi.fn();

  render(
    <MarkdownRenderer
      content={content}
      onMentionClick={handleMentionClick}
      onHashtagClick={handleHashtagClick}
      enableLinkPreviews={true}
    />
  );

  // ✓ Markdown rendering
  expect(screen.queryByRole('heading', { level: 1 }))
    .toHaveTextContent('Project Update');
  expect(screen.queryByText('excellent')?.tagName).toBe('STRONG');

  // ✓ Mentions clickable
  const mention = screen.queryByTestId('mention-alice');
  fireEvent.click(mention);
  expect(handleMentionClick).toHaveBeenCalledWith('alice');

  // ✓ Hashtags clickable
  const hashtag = screen.queryByTestId('hashtag-react');
  fireEvent.click(hashtag);
  expect(handleHashtagClick).toHaveBeenCalledWith('react');

  // ✓ URLs and previews
  expect(screen.queryByTestId('url-0'))
    .toHaveAttribute('href', 'https://docs.example.com');
  expect(screen.queryByTestId('link-previews')).toBeInTheDocument();
});
```

### 3. Security: XSS Prevention

**Test:** "should sanitize script tags"

**Why Critical:**
User-generated content must be sanitized to prevent XSS attacks.

**Test Code:**
```typescript
it('should sanitize script tags', () => {
  const maliciousContent = '<script>alert("XSS")</script>Hello';
  render(<MarkdownRenderer content={maliciousContent} />);

  // ✓ Content visible
  expect(screen.getByText(/Hello/)).toBeInTheDocument();

  // ✓ Script stripped
  expect(document.querySelector('script')).not.toBeInTheDocument();
  expect(document.body.innerHTML).not.toContain('alert("XSS")');
});
```

---

## Mock Setup (London School)

### Mock Dependencies

```typescript
// Mock react-markdown - simulates behavior we expect
vi.mock('react-markdown', () => ({
  default: vi.fn(({ children, components }: any) => {
    // Mock implementation for testing our component's behavior
    return <div className="react-markdown-mock">{children}</div>;
  })
}));

// Mock plugins
vi.mock('remark-gfm', () => ({ default: vi.fn(() => ({})) }));
vi.mock('rehype-sanitize', () => ({
  default: vi.fn(() => ({})),
  defaultSchema: {}
}));
vi.mock('rehype-highlight', () => ({ default: vi.fn(() => ({})) }));
```

**Why Mock?**
- **Isolation:** Test our component's behavior, not react-markdown's
- **Speed:** Faster tests without real markdown parsing
- **Control:** Predictable behavior for testing edge cases
- **London School:** Focus on collaboration, not implementation

---

## Dependencies (Already Installed)

```json
{
  "dependencies": {
    "react-markdown": "10.1.0",
    "remark-gfm": "4.0.1",
    "rehype-sanitize": "6.0.0",
    "rehype-highlight": "7.0.2"
  },
  "devDependencies": {
    "vitest": "^1.6.1",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.0.1"
  }
}
```

---

## Running the Tests

### Quick Commands

```bash
# Run all markdown tests
npm test markdown-renderer.test.tsx

# Watch mode (recommended for TDD)
npm test -- --watch markdown-renderer.test.tsx

# Run specific test
npm test -- -t "should render mentions as clickable buttons"

# Run specific describe block
npm test -- -t "FR-009: @Mention Preservation"

# Run with coverage
npm test -- --coverage markdown-renderer.test.tsx
```

### Expected Output (Current - RED Phase)

```
FAIL  src/tests/unit/markdown-renderer.test.tsx

Markdown Renderer - Basic Features
  FR-002: Headers Rendering
    × should render H1 headers correctly
    × should render H2 headers correctly
    × should render H3 headers correctly
    × should render multiple headers in hierarchy
  FR-003: Text Formatting
    × should render bold text
    × should render italic text
    × should render inline code
    × should handle combined formatting

Markdown Renderer - Preserve Special Content
  FR-009: @Mention Preservation
    × should render mentions as clickable buttons
    × should trigger onMentionClick when mention is clicked
    × should handle multiple mentions
    × should preserve mentions in markdown context
    × should handle mentions with underscores and hyphens
  [... 32 more failing tests ...]

Test Files  1 failed (1)
     Tests  0 passed | 47 failed (47)
  Duration  < 1s
```

**This is EXPECTED for TDD Red Phase!**

### Expected Output (After Implementation - GREEN Phase)

```
PASS  src/tests/unit/markdown-renderer.test.tsx

Markdown Renderer - Basic Features
  FR-002: Headers Rendering
    ✓ should render H1 headers correctly (15ms)
    ✓ should render H2 headers correctly (8ms)
    ✓ should render H3 headers correctly (7ms)
    ✓ should render multiple headers in hierarchy (12ms)
  [... 43 more passing tests ...]

Test Files  1 passed (1)
     Tests  47 passed (47)
  Duration  < 1s
```

---

## Implementation Requirements

### Component Interface

```typescript
interface MarkdownRendererProps {
  content: string;
  onMentionClick?: (agent: string) => void;
  onHashtagClick?: (tag: string) => void;
  enableLinkPreviews?: boolean;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps>;
```

### Component Location

**Create:** `/workspaces/agent-feed/frontend/src/components/markdown/MarkdownRenderer.tsx`

### Algorithm Overview

```
1. Pre-processing Phase
   ├─ Extract URLs → __URL_0__, __URL_1__, ...
   ├─ Extract @mentions → __MENTION_0__, __MENTION_1__, ...
   ├─ Extract #hashtags (skip ## headers) → __HASHTAG_0__, __HASHTAG_1__, ...
   └─ Store token map { type, value, placeholder }

2. Markdown Parsing Phase
   ├─ Pass preprocessed content to ReactMarkdown
   ├─ Apply remark-gfm plugin
   ├─ Apply rehype-sanitize plugin
   └─ Apply rehype-highlight plugin

3. Token Restoration Phase
   ├─ Replace __MENTION_*__ → <button onClick={onMentionClick}>@username</button>
   ├─ Replace __HASHTAG_*__ → <button onClick={onHashtagClick}>#tag</button>
   └─ Replace __URL_*__ → <a href={url} target="_blank">url</a>

4. Link Preview Generation Phase
   ├─ Extract URLs from token map
   ├─ Check enableLinkPreviews flag
   └─ Render EnhancedLinkPreview components
```

---

## Test-Driven Development Workflow

### Step-by-Step TDD Cycle

#### 1. RED Phase (Current Status) ✅
```bash
# All tests written and failing
npm test markdown-renderer.test.tsx --run

# Output: 0 passed | 47 failed
```

#### 2. GREEN Phase (Next Step)
```bash
# Start watch mode
npm test -- --watch markdown-renderer.test.tsx

# Implement MarkdownRenderer component
# Watch tests turn green one by one

# Goal: All tests passing
```

#### 3. REFACTOR Phase (After Green)
```bash
# Tests still passing after refactor?
npm test markdown-renderer.test.tsx --run

# Extract utilities
# Optimize performance
# Improve code quality
```

### Recommended Development Sequence

**Iteration 1: Basic Structure**
- Create component file
- Set up TypeScript interfaces
- Render placeholder
- Goal: 2 styling tests pass

**Iteration 2: Markdown Rendering**
- Integrate react-markdown
- Configure plugins
- Goal: 8 basic markdown tests pass

**Iteration 3: Mention Preservation**
- Implement mention extraction
- Implement button rendering
- Connect click handlers
- Goal: 5 mention tests pass

**Iteration 4: Hashtag Preservation**
- Implement hashtag extraction (skip ## headers)
- Implement button rendering
- Connect click handlers
- Goal: 5 hashtag tests pass

**Iteration 5: URL Preservation**
- Implement URL extraction
- Implement link rendering
- Implement link preview generation
- Goal: 7 URL tests pass

**Iteration 6: Security**
- Verify sanitization working
- Test XSS prevention
- Goal: 4 security tests pass

**Iteration 7: Integration**
- Test combined scenarios
- Test edge cases
- Goal: 8 integration tests pass

**Iteration 8: Behavior Verification**
- Verify all collaborations
- Test multiple interactions
- Goal: 8 behavior tests pass

---

## Coverage Targets

### Target Coverage: 80%+

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
MarkdownRenderer.tsx    |   82.5  |   78.3   |   85.0  |   83.2
```

### Current Coverage: 0% (Component not implemented)

```bash
# Check coverage after implementation
npm test -- --coverage markdown-renderer.test.tsx
```

---

## Integration with Existing System

### Current System
- `contentParser.tsx` handles @mentions, #hashtags, URLs
- `RealSocialMediaFeed.tsx` renders posts
- `EnhancedLinkPreview.tsx` renders link previews

### Integration Points

**1. Update contentParser.tsx**
```typescript
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer';

export const renderParsedContent = (
  parsedContent: ParsedContent[],
  options: ContentParserOptions = {}
): JSX.Element => {
  const { enableMarkdown = true } = options;
  const content = parsedContent.map(p => p.content).join('');

  // Use MarkdownRenderer if markdown detected
  if (enableMarkdown && hasMarkdown(content)) {
    return <MarkdownRenderer content={content} {...options} />;
  }

  // Fallback to existing parser
  return renderLegacyContent(parsedContent, options);
};
```

**2. Update RealSocialMediaFeed.tsx**
```typescript
// No changes needed - uses contentParser.tsx internally
// Markdown will be automatically enabled for posts with markdown syntax
```

**3. Feature Flag (Optional)**
```typescript
// Enable/disable markdown globally
const ENABLE_MARKDOWN = process.env.REACT_APP_ENABLE_MARKDOWN !== 'false';
```

---

## Documentation Provided

### 1. Test Suite Summary
**File:** `/frontend/src/tests/unit/MARKDOWN-RENDERER-TDD-SUMMARY.md`
**Content:**
- Comprehensive test suite overview
- London School methodology explanation
- Test breakdown by category
- Mock implementation examples
- Coverage map
- Implementation checklist

### 2. Quick Start Guide
**File:** `/frontend/src/tests/unit/MARKDOWN-TDD-QUICK-START.md`
**Content:**
- Quick summary of tests
- Running tests commands
- TDD Red-Green-Refactor cycle
- Implementation checklist
- Troubleshooting guide
- Expected test results

### 3. SPARC Documentation (Pre-existing)
**Files:**
- `/docs/SPARC-MARKDOWN-RENDERING-SPEC.md`
- `/docs/SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md`
- `/docs/SPARC-MARKDOWN-RENDERING-PSEUDOCODE.md`

---

## Success Criteria

### Definition of Done

- [x] All dependencies installed
- [x] 47 comprehensive tests written
- [x] Tests follow London School methodology
- [x] Tests currently failing (RED phase)
- [x] Documentation complete
- [ ] MarkdownRenderer component implemented
- [ ] All 47 tests passing (GREEN phase)
- [ ] Code coverage ≥ 80%
- [ ] Performance tests passing
- [ ] Security tests passing
- [ ] Integration with contentParser.tsx
- [ ] Feature deployed with flag

---

## Next Actions

### Immediate Next Steps

1. **Create component file**
   ```bash
   mkdir -p /workspaces/agent-feed/frontend/src/components/markdown
   touch /workspaces/agent-feed/frontend/src/components/markdown/MarkdownRenderer.tsx
   ```

2. **Start TDD watch mode**
   ```bash
   npm test -- --watch markdown-renderer.test.tsx
   ```

3. **Implement component** (follow Quick Start guide)

4. **Watch tests turn green**

5. **Refactor when all green**

6. **Integrate with contentParser.tsx**

---

## Test File Locations

### Primary Deliverables
```
/workspaces/agent-feed/frontend/
├── src/
│   ├── tests/
│   │   └── unit/
│   │       ├── markdown-renderer.test.tsx         (Test Suite - 47 tests)
│   │       ├── MARKDOWN-RENDERER-TDD-SUMMARY.md   (Detailed Summary)
│   │       └── MARKDOWN-TDD-QUICK-START.md        (Quick Start Guide)
│   └── components/
│       └── markdown/
│           └── MarkdownRenderer.tsx               (TO BE CREATED)
└── MARKDOWN-TDD-DELIVERABLES.md                  (This file)
```

### SPARC Documentation
```
/workspaces/agent-feed/docs/
├── SPARC-MARKDOWN-RENDERING-SPEC.md
├── SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md
└── SPARC-MARKDOWN-RENDERING-PSEUDOCODE.md
```

---

## Summary

### What's Complete ✅
- Comprehensive TDD test suite (47 tests)
- London School methodology applied
- All dependencies installed
- Complete documentation
- SPARC specifications
- Quick start guide
- Integration plan

### What's Next 📋
- Implement MarkdownRenderer component
- Run TDD cycle (RED → GREEN → REFACTOR)
- Achieve 80%+ test coverage
- Integrate with existing system
- Deploy with feature flag

### Test Status 🔴
**RED PHASE:** All 47 tests failing as expected (TDD Red phase)

**Ready for implementation!**

---

**Questions or Issues?**
- Review SPARC documentation in `/docs/`
- Check Quick Start Guide for troubleshooting
- Run tests in watch mode for iterative development

**Let's turn those tests GREEN! 🟢**
