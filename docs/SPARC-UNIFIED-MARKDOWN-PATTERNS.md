# SPARC Specification: Unified Markdown Pattern Detection

## Date: 2025-10-31
## Version: 2.0.0
## Status: Implementation Ready

---

## 📋 SPECIFICATION Phase

### Problem Statement
**Critical Issue**: Dual markdown detection implementations causing rendering failures in browser despite passing tests.

**Root Cause**:
- `contentParser.tsx::hasMarkdown()` has 11 patterns
- `markdownParser.ts::detectMarkdownSyntax()` has 8 patterns
- Content passes first check but fails second check → shows raw markdown symbols

**Impact**:
- ✅ Tests pass (13/13) - use content that triggers both
- ❌ Browser fails - real comments trigger only first check
- 🔴 Severity: CRITICAL - affects all comment rendering

### Requirements

**FR-1: Single Source of Truth**
- Create centralized markdown pattern constants
- All detection functions must use identical patterns
- Patterns must be immutable and type-safe

**FR-2: Pattern Completeness**
Must detect all markdown syntax:
1. Bold: `**text**`
2. Italic: `*text*` (strict - no empty space)
3. Inline code: `` `code` ``
4. Code blocks: ` ```code``` `
5. Headers: `# H1` through `###### H6`
6. Unordered lists: `- item`, `* item`, `+ item`
7. Ordered lists: `1. item`, `2. item`
8. Blockquotes: `> quote`
9. Links: `[text](url)`
10. Horizontal rules: `---`, `***`, `___`
11. Strikethrough: `~~text~~` (GFM)

**FR-3: Backward Compatibility**
- Existing tests must continue passing
- No breaking changes to API
- Maintain performance characteristics

**FR-4: Test Coverage**
- Unit tests: Pattern detection accuracy (100+ samples)
- Integration tests: Component rendering validation
- E2E tests: Browser visual regression with screenshots
- Parity tests: Both functions return identical results

**NFR-1: Performance**
- Pattern matching: < 1ms for typical comment (500 chars)
- No regex compilation overhead
- Memoization where applicable

**NFR-2: Maintainability**
- Single file for pattern definitions
- Comprehensive inline documentation
- Type-safe exports

---

## 🔧 PSEUDOCODE Phase

### Architecture Overview

```
markdownConstants.ts (NEW)
    ↓ (import)
contentParser.tsx (UPDATE) ← Uses MARKDOWN_PATTERNS
    ↓ (import)
markdownParser.ts (UPDATE) ← Uses MARKDOWN_PATTERNS
    ↓ (used by)
MarkdownContent.tsx (NO CHANGE)
    ↓ (renders)
CommentThread.tsx (NO CHANGE)
```

### Core Algorithm

```typescript
// File: markdownConstants.ts

DEFINE MARKDOWN_PATTERNS as ReadonlyArray<RegExp>:
  [
    BOLD_PATTERN,        // \*\*[^*]+\*\*/
    ITALIC_PATTERN,      // \*[^*\s][^*]*\*/ (strict)
    INLINE_CODE_PATTERN, // `[^`]+`/
    CODE_BLOCK_PATTERN,  // ```[\s\S]*?```/
    HEADER_PATTERN,      // ^#{1,6}\s/m
    UNORDERED_LIST,      // ^\s*[-*+]\s/m
    ORDERED_LIST,        // ^\s*\d+\.\s/m
    BLOCKQUOTE,          // ^>\s/m
    LINK_PATTERN,        // \[([^\]]+)\]\(([^)]+)\)/
    HORIZONTAL_RULE,     // ^---+$/m
    STRIKETHROUGH        // ~~[^~]+~~/
  ]

FUNCTION hasMarkdownSyntax(content: string) -> boolean:
  FOR EACH pattern IN MARKDOWN_PATTERNS:
    IF pattern.test(content):
      RETURN true
  RETURN false

EXPORT MARKDOWN_PATTERNS (read-only)
EXPORT hasMarkdownSyntax (primary detection function)
```

### Migration Strategy

```typescript
// Step 1: Create markdownConstants.ts
CREATE new file with centralized patterns

// Step 2: Update contentParser.tsx
IMPORT { MARKDOWN_PATTERNS, hasMarkdownSyntax } from './markdownConstants'
REPLACE local patterns with imported MARKDOWN_PATTERNS
UPDATE hasMarkdown() to use imported function

// Step 3: Update markdownParser.ts
IMPORT { MARKDOWN_PATTERNS, hasMarkdownSyntax } from './markdownConstants'
REPLACE MARKDOWN_PATTERNS constant with import
UPDATE detectMarkdownSyntax() to use imported function

// Step 4: Add parity tests
CREATE markdown-parity.test.tsx
TEST: contentParser.hasMarkdown === markdownConstants.hasMarkdownSyntax
TEST: markdownParser.detectMarkdownSyntax === markdownConstants.hasMarkdownSyntax
TEST: 100+ content samples return identical results
```

---

## 🏗️ ARCHITECTURE Phase

### File Structure

```
frontend/src/
├── utils/
│   ├── markdownConstants.ts          ← NEW (source of truth)
│   ├── contentParser.tsx             ← UPDATE (import patterns)
│   └── markdownParser.ts             ← UPDATE (import patterns)
├── components/
│   ├── MarkdownContent.tsx           ← NO CHANGE
│   └── comments/
│       └── CommentThread.tsx         ← NO CHANGE
└── tests/
    ├── unit/
    │   ├── markdown-detection.test.tsx      ← EXISTS
    │   └── markdown-parity.test.tsx         ← NEW (critical)
    ├── integration/
    │   └── comment-markdown-rendering.test.tsx  ← EXISTS
    └── e2e/
        └── markdown-rendering.spec.ts       ← UPDATE (add screenshots)
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ markdownConstants.ts (Single Source of Truth)               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ MARKDOWN_PATTERNS: ReadonlyArray<RegExp> (11 patterns) │ │
│ │ hasMarkdownSyntax(content: string): boolean             │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ contentParser.tsx│        │ markdownParser.ts│
│ ┌──────────────┐ │        │ ┌──────────────┐ │
│ │hasMarkdown() │ │        │ │detectMarkdown│ │
│ │   ↓ calls    │ │        │ │Syntax()      │ │
│ │hasMarkdown   │ │        │ │   ↓ calls    │ │
│ │Syntax()      │ │        │ │hasMarkdown   │ │
│ └──────────────┘ │        │ │Syntax()      │ │
└────────┬─────────┘        │ └──────────────┘ │
         │                  └────────┬─────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐    ┌───────────────────┐
│renderParsedContent()│    │extractSpecial     │
│                     │    │Tokens()           │
└─────────┬───────────┘    └─────────┬─────────┘
          │                          │
          └──────────┬───────────────┘
                     ▼
          ┌──────────────────────┐
          │MarkdownContent.tsx   │
          │ (now both checks use │
          │  same patterns)      │
          └──────────────────────┘
```

### Data Flow

```
User Comment Input
    ↓
Database (content_type field)
    ↓
API Response
    ↓
CommentThread.tsx
    ↓
shouldRenderMarkdown = useMemo(() => {
  1. Check contentType === 'markdown' ✅
  2. Check author.type === 'agent' && hasMarkdown() ✅
  3. Check hasMarkdown() as fallback ✅
})
    ↓
renderParsedContent(parseContent(content), {enableMarkdown: true})
    ↓
hasMarkdown(content) from contentParser [Uses MARKDOWN_PATTERNS]
    ↓ (if true)
<MarkdownContent content={content} />
    ↓
extractSpecialTokens(content)
    ↓
detectMarkdownSyntax(content) [Uses MARKDOWN_PATTERNS]
    ↓
extraction.hasMarkdown === true ✅ (NOW GUARANTEED)
    ↓
<ReactMarkdown>{content}</ReactMarkdown>
    ↓
Rendered Markdown in Browser ✅
```

---

## 🧪 REFINEMENT Phase - TDD Implementation

### Test Strategy

**Phase 1: Unit Tests**
```typescript
// markdown-parity.test.tsx
describe('Markdown Pattern Parity', () => {
  // Test suite: 100+ samples
  const testSamples = [
    { content: '**bold**', expected: true },
    { content: '*italic*', expected: true },
    { content: '```code```', expected: true },
    { content: '---', expected: true },
    { content: '~~strike~~', expected: true },
    { content: 'plain text', expected: false },
    // ... 94 more samples
  ];

  test('contentParser.hasMarkdown === markdownConstants.hasMarkdownSyntax', () => {
    testSamples.forEach(sample => {
      const result1 = hasMarkdown(sample.content);
      const result2 = hasMarkdownSyntax(sample.content);
      expect(result1).toBe(result2);
      expect(result1).toBe(sample.expected);
    });
  });

  test('markdownParser.detectMarkdownSyntax === markdownConstants.hasMarkdownSyntax', () => {
    testSamples.forEach(sample => {
      const result1 = detectMarkdownSyntax(sample.content);
      const result2 = hasMarkdownSyntax(sample.content);
      expect(result1).toBe(result2);
    });
  });
});
```

**Phase 2: Integration Tests**
- Verify CommentThread renders markdown correctly
- Verify MarkdownContent receives correct data
- Verify both new and old comments render

**Phase 3: E2E Tests (Playwright)**
- Start dev server
- Navigate to posts with markdown comments
- Take screenshots of rendered markdown
- Verify no raw symbols visible
- Test auto-detection for agent comments
- Test explicit markdown content_type

### Performance Benchmarks

**Target Metrics**:
- Pattern compilation: < 0.1ms
- Detection on 500-char comment: < 1ms
- Component render: < 16ms (60fps)
- Total page load: < 2s

---

## ✅ COMPLETION Phase - Validation Criteria

### Definition of Done

**Code Quality**:
- ✅ TypeScript strict mode passing
- ✅ ESLint 0 errors, 0 warnings
- ✅ All existing tests passing
- ✅ New tests passing (parity + E2E)

**Functionality**:
- ✅ Both new and old comments render markdown
- ✅ Agent comments auto-detect markdown
- ✅ User comments respect content_type
- ✅ No raw markdown symbols in browser

**Testing**:
- ✅ Unit tests: 100% passing (31+ existing + 20+ new)
- ✅ Integration tests: 100% passing (13 existing)
- ✅ E2E tests: 100% passing (6+ with screenshots)
- ✅ Regression: All previous tests still pass

**Documentation**:
- ✅ Inline code documentation
- ✅ Migration guide created
- ✅ Test reports generated
- ✅ Screenshot evidence of browser rendering

**Browser Validation**:
- ✅ Visual inspection of rendered comments
- ✅ Screenshot comparison before/after
- ✅ Real comment data (not mocked)
- ✅ WebSocket real-time comments working

---

## 🎯 Success Metrics

**Before Fix**:
- ❌ Browser shows raw markdown symbols
- ✅ Tests pass (false positive)
- ❌ User experience degraded

**After Fix**:
- ✅ Browser renders markdown correctly
- ✅ Tests pass (true positive)
- ✅ User experience excellent
- ✅ 100% pattern detection parity

---

## 📊 Risk Assessment

**Low Risk**:
- ✅ Centralized pattern management (easier to maintain)
- ✅ No API changes (backward compatible)
- ✅ Comprehensive test coverage

**Medium Risk**:
- ⚠️ Regex performance (mitigated by benchmark tests)
- ⚠️ Edge cases (mitigated by 100+ test samples)

**Mitigation**:
- Run performance benchmarks before merge
- Add monitoring for pattern detection failures
- Gradual rollout with feature flag (optional)

---

**Status**: Ready for concurrent agent implementation
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Validation**: 100% real, no mocks, browser verified
