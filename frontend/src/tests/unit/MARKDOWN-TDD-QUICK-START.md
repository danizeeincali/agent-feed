# Markdown Renderer TDD - Quick Start Guide

**Status:** RED PHASE (Tests failing - ready for implementation)
**Methodology:** London School TDD
**Test File:** `/workspaces/agent-feed/frontend/src/tests/unit/markdown-renderer.test.tsx`
**Created:** 2025-10-25

---

## Quick Summary

Comprehensive TDD test suite with 47 tests covering:
- Markdown rendering (headers, bold, italic, code)
- @mention preservation and click handlers
- #hashtag preservation (excluding markdown ## headers)
- URL detection and link previews
- XSS security prevention
- Integration scenarios

**ALL TESTS ARE CURRENTLY FAILING** (This is intentional - TDD Red Phase)

---

## Running the Tests

```bash
# Run all markdown tests
npm test markdown-renderer.test.tsx

# Run in watch mode (recommended for TDD)
npm test -- --watch markdown-renderer.test.tsx

# Run specific test group
npm test -- -t "FR-009: @Mention Preservation"

# Run with coverage
npm test -- --coverage markdown-renderer.test.tsx
```

---

## TDD Red-Green-Refactor Cycle

### Phase 1: RED (Current Status)
```bash
$ npm test markdown-renderer.test.tsx --run

✗ All 47 tests failing
```

**Status:** Complete. Tests written and failing as expected.

### Phase 2: GREEN (Implementation Needed)

**Create the component:**
`/workspaces/agent-feed/frontend/src/components/markdown/MarkdownRenderer.tsx`

**Implementation Requirements:**

1. **Pre-process content** to extract special tokens
   ```typescript
   // Extract: @mentions, #hashtags, URLs
   // Replace with: __MENTION_0__, __HASHTAG_0__, __URL_0__
   // Store in token map
   ```

2. **Parse markdown** with react-markdown
   ```typescript
   import ReactMarkdown from 'react-markdown';
   import remarkGfm from 'remark-gfm';
   import rehypeSanitize from 'rehype-sanitize';
   ```

3. **Restore special tokens** after markdown processing
   ```typescript
   // Replace placeholders with:
   // - Clickable @mention buttons
   // - Clickable #hashtag buttons
   // - Clickable URL links
   ```

4. **Generate link previews** for extracted URLs

**Watch tests turn green:**
```bash
npm test -- --watch markdown-renderer.test.tsx
```

### Phase 3: REFACTOR (After Green)

Once all tests pass:
- Extract utilities (preprocessing, token restoration)
- Optimize performance (memoization with React.memo)
- Improve code organization
- Add TypeScript type safety
- Ensure tests still pass after refactoring

---

## Test Coverage Breakdown

### FR-009 to FR-011: Critical Features (17 tests)

**FR-009: @Mention Preservation (5 tests)**
```typescript
✗ should render mentions as clickable buttons
✗ should trigger onMentionClick when mention is clicked
✗ should handle multiple mentions
✗ should preserve mentions in markdown context
✗ should handle mentions with underscores and hyphens
```

**FR-010: #Hashtag Preservation (5 tests)**
```typescript
✗ should render hashtags as clickable buttons
✗ should trigger onHashtagClick when hashtag is clicked
✗ should handle multiple hashtags
✗ should NOT treat markdown headers as hashtags (CRITICAL)
✗ should distinguish between markdown headers and hashtags in same content
```

**FR-011: URL Preservation and Link Previews (7 tests)**
```typescript
✗ should render URLs as clickable links
✗ should generate link previews for URLs
✗ should disable link previews when enableLinkPreviews is false
✗ should handle multiple URLs with multiple previews
✗ should handle URLs with query parameters
✗ should handle URLs with fragments
```

### Security: XSS Prevention (4 tests)
```typescript
✗ should sanitize script tags
✗ should sanitize javascript: URLs
✗ should sanitize onerror attributes
✗ should allow safe markdown elements
```

### Integration: Combined Features (8 tests)
```typescript
✗ should handle markdown + mentions + hashtags + URLs in same post
✗ should handle mentions and hashtags inside markdown formatting
✗ should preserve special content after markdown processing
✗ should handle empty content
✗ should handle content with only whitespace
✗ should handle malformed markdown gracefully
✗ should handle very long content efficiently
✗ should handle many mentions efficiently
```

---

## Most Critical Test

**FR-010: Distinguishing ## headers from #hashtags**

```typescript
it('should NOT treat markdown headers as hashtags (CRITICAL)', () => {
  const content = `
## This is a Header
This is a #hashtag
  `.trim();

  render(<MarkdownRenderer content={content} />);

  // ## header rendered as H2 (NOT as #hashtag)
  expect(screen.queryByRole('heading', { level: 2 }))
    .toHaveTextContent('This is a Header');

  // Real hashtag rendered as clickable button
  expect(screen.queryByTestId('hashtag-hashtag')).toBeInTheDocument();

  // NO button for ## header symbols
  expect(screen.queryByTestId('hashtag-This')).not.toBeInTheDocument();
});
```

**Why Critical:**
Markdown uses `##` for headers. App uses `#` for hashtags. Parser must distinguish:
- `## Header` → `<h2>Header</h2>` (NOT clickable)
- `#hashtag` → `<button onClick={...}>#hashtag</button>` (clickable)

---

## London School Methodology

### Key Principles Applied

1. **Mock External Dependencies**
   ```typescript
   vi.mock('react-markdown', () => ({
     default: vi.fn(/* mock implementation */)
   }));
   ```

2. **Test Behavior, Not Implementation**
   ```typescript
   // BAD (Classical TDD - testing internal state)
   expect(parsedContent.mentions).toHaveLength(2);

   // GOOD (London School - testing observable behavior)
   expect(screen.getByTestId('mention-alice')).toBeInTheDocument();
   fireEvent.click(mentionButton);
   expect(handleMentionClick).toHaveBeenCalledWith('alice');
   ```

3. **Focus on Collaboration**
   ```typescript
   // Test the CONVERSATION between objects
   it('should verify mention button triggers correct handler', () => {
     const mockHandler = vi.fn();
     render(<MarkdownRenderer onMentionClick={mockHandler} />);

     fireEvent.click(mentionButton);

     // Verify: button → handler → correct argument
     expect(mockHandler).toHaveBeenCalledWith('alice');
   });
   ```

---

## Implementation Checklist

### Step 1: Create Component Structure
- [ ] Create directory: `/frontend/src/components/markdown/`
- [ ] Create file: `MarkdownRenderer.tsx`
- [ ] Define TypeScript interfaces
- [ ] Set up basic component skeleton

### Step 2: Implement Pre-processing
- [ ] Extract URLs (regex: `/(https?:\/\/[^\s]+)/g`)
- [ ] Extract mentions (regex: `/@([a-zA-Z0-9_-]+)/g`)
- [ ] Extract hashtags (regex: `/#([a-zA-Z0-9_-]+)/g`)
- [ ] Skip hashtags at line start (markdown headers)
- [ ] Replace with placeholders
- [ ] Store token map

### Step 3: Implement Markdown Parsing
- [ ] Import react-markdown, remark-gfm, rehype-sanitize
- [ ] Pass preprocessed content to ReactMarkdown
- [ ] Configure plugins
- [ ] Apply sanitization schema

### Step 4: Implement Token Restoration
- [ ] Replace `__MENTION_*__` with button components
- [ ] Replace `__HASHTAG_*__` with button components
- [ ] Replace `__URL_*__` with link components
- [ ] Connect onClick handlers

### Step 5: Implement Link Previews
- [ ] Extract URLs from token map
- [ ] Render preview components when `enableLinkPreviews` is true
- [ ] Use existing EnhancedLinkPreview component

### Step 6: Run Tests
```bash
npm test -- --watch markdown-renderer.test.tsx
```

Watch tests turn green one by one!

---

## Expected Test Results After Implementation

```
✓ Markdown Renderer - Basic Features (8)
  ✓ FR-002: Headers Rendering (4)
  ✓ FR-003: Text Formatting (4)

✓ Markdown Renderer - Preserve Special Content (17)
  ✓ FR-009: @Mention Preservation (5)
  ✓ FR-010: #Hashtag Preservation (5)
  ✓ FR-011: URL Preservation and Link Previews (7)

✓ Markdown Renderer - Security (4)
  ✓ XSS Prevention (4)

✓ Markdown Renderer - Integration Tests (8)
  ✓ Combined Markdown and Special Content (3)
  ✓ Edge Cases (5)

✓ Markdown Renderer - Behavior Verification (8)
  ✓ Collaboration: Mentions and Click Handlers (2)
  ✓ Collaboration: Hashtags and Click Handlers (1)
  ✓ Collaboration: Link Preview Generation (2)

✓ Markdown Renderer - Styling (2)

Test Files  1 passed (1)
     Tests  47 passed (47)
  Duration  < 1s
```

---

## Integration with Existing System

After MarkdownRenderer passes all tests:

### Update contentParser.tsx

```typescript
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer';

export const renderParsedContent = (
  parsedContent: ParsedContent[],
  options: ContentParserOptions = {}
): JSX.Element => {
  const { enableMarkdown = true, ...otherOptions } = options;

  // Reconstruct content
  const content = parsedContent.map(p => p.content).join('');

  // Check if markdown syntax exists
  if (enableMarkdown && hasMarkdown(content)) {
    return <MarkdownRenderer content={content} {...otherOptions} />;
  }

  // Fallback to existing parser
  return <div>{/* existing rendering logic */}</div>;
};
```

---

## Success Criteria

- [ ] All 47 tests pass
- [ ] Code coverage ≥ 80%
- [ ] No console errors during test execution
- [ ] Performance test passes (< 200ms for long content)
- [ ] Security tests pass (XSS prevention)
- [ ] Integration tests pass (markdown + special content)

---

## Troubleshooting

### Tests Still Failing After Implementation?

**Check:**
1. Component exports: `export const MarkdownRenderer: React.FC<MarkdownRendererProps>`
2. Test data-testid attributes match component
3. Click handlers connected correctly
4. Placeholder replacement logic working
5. react-markdown configured with correct plugins

**Debug Commands:**
```bash
# Run single test with full output
npm test -- -t "should render mentions as clickable buttons" --reporter=verbose

# Check test coverage
npm test -- --coverage markdown-renderer.test.tsx

# Watch mode for iterative development
npm test -- --watch markdown-renderer.test.tsx
```

---

## Next Steps

1. **Implement MarkdownRenderer** component
2. **Watch tests turn green** in TDD cycle
3. **Refactor** for optimization
4. **Integrate** with RealSocialMediaFeed component
5. **Deploy** with feature flag

---

## Resources

- **SPARC Spec:** `/workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-SPEC.md`
- **SPARC Architecture:** `/workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md`
- **SPARC Pseudocode:** `/workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-PSEUDOCODE.md`
- **Test Suite:** `/workspaces/agent-feed/frontend/src/tests/unit/markdown-renderer.test.tsx`
- **Test Summary:** `/workspaces/agent-feed/frontend/src/tests/unit/MARKDOWN-RENDERER-TDD-SUMMARY.md`

---

**Ready to implement? Start with Step 1 of the Implementation Checklist above!**
