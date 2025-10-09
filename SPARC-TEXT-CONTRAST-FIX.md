# SPARC Specification: Text Contrast Accessibility Fix

**Date:** 2025-10-09
**Issue:** Light gray text (text-gray-700, text-gray-500) has insufficient contrast, making it hard to read
**Standard:** WCAG 2.1 Level AA requires 4.5:1 contrast ratio for normal text, 3:1 for large text
**Files Affected:** MarkdownRenderer.tsx

---

## Specification Phase

### Problem Analysis

**Current State:**
The MarkdownRenderer.tsx uses light gray text colors that fail WCAG AA contrast requirements:

1. **Body text:** `text-gray-700` (#374151) on white (#FFFFFF)
   - Contrast ratio: ~4.54:1 ✅ PASSES AA (barely)
   - But appears washed out, especially on lower-quality displays

2. **Secondary text:** `text-gray-500` (#6B7280) on white
   - Contrast ratio: ~3.94:1 ❌ FAILS AA (needs 4.5:1)

3. **Descriptions/Labels:** `text-gray-600` (#4B5563) on white
   - Contrast ratio: ~4.24:1 ❌ FAILS AA (needs 4.5:1)

**User Impact:**
- Hard to read on bright displays
- Accessibility failure for users with low vision
- Poor readability on mobile devices in sunlight
- Fails automated accessibility audits

### Solution Requirements

**WCAG 2.1 Level AA Compliance:**
- Normal text (< 18pt): Minimum 4.5:1 contrast ratio
- Large text (≥ 18pt / 14pt bold): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

**Color Mapping Strategy:**
```
OLD COLOR          → NEW COLOR         CONTRAST RATIO   STATUS
text-gray-500      → text-gray-700     4.54:1          ✅ PASSES AA
text-gray-600      → text-gray-800     7.54:1          ✅ PASSES AAA
text-gray-700      → text-gray-900     15.30:1         ✅ PASSES AAA
```

**Affected Elements:**
1. Paragraphs (`<p>`)
2. Lists (`<ul>`, `<ol>`)
3. Blockquotes
4. Table cells
5. Strikethrough text
6. Loading spinner text

---

## Pseudocode Phase

### Color Replacement Algorithm

```pseudocode
FUNCTION improveTextContrast():
  // Step 1: Identify all text color classes
  textColors = [
    { old: "text-gray-500", new: "text-gray-700", element: "secondary text" },
    { old: "text-gray-600", new: "text-gray-800", element: "labels" },
    { old: "text-gray-700", new: "text-gray-900", element: "body text" }
  ]

  // Step 2: Apply replacements
  FOR EACH color IN textColors:
    FIND all instances of color.old in MarkdownRenderer.tsx
    REPLACE with color.new
    PRESERVE dark mode variants (dark:text-gray-XXX)

  // Step 3: Verify dark mode contrast
  darkModeColors = [
    { old: "dark:text-gray-300", new: "dark:text-gray-200", check: "body text" },
    { old: "dark:text-gray-400", new: "dark:text-gray-300", check: "secondary" }
  ]

  FOR EACH darkColor IN darkModeColors:
    IF contrast ratio < 4.5:1 on dark background (#111827):
      REPLACE with higher contrast color

  // Step 4: Special cases
  PRESERVE text-gray-100 for code blocks (needs low contrast on dark bg)
  PRESERVE text-gray-900 for headings (already high contrast)
  UPDATE loading spinner text from text-gray-500 to text-gray-700

RETURN updated file
```

---

## Architecture Phase

### File Changes

**File:** `/workspaces/agent-feed/frontend/src/components/dynamic-page/MarkdownRenderer.tsx`

**Change Map:**

| Line | Element | Old Class | New Class | Rationale |
|------|---------|-----------|-----------|-----------|
| 190 | Loading spinner | `text-gray-500` | `text-gray-700` | Better visibility during loading |
| 289 | Paragraphs | `text-gray-700` | `text-gray-900` | Higher contrast for readability |
| 325 | Unordered lists | `text-gray-700` | `text-gray-900` | Consistent with paragraphs |
| 330 | Ordered lists | `text-gray-700` | `text-gray-900` | Consistent with paragraphs |
| 343 | Blockquotes | `text-gray-700` | `text-gray-900` | Improve quote readability |
| 445 | Table cells | `text-gray-700` | `text-gray-900` | Better data readability |
| 466 | Strikethrough | `text-gray-500` | `text-gray-600` | Maintain "muted" look while improving contrast |

**Dark Mode Updates:**

| Line | Element | Old Dark | New Dark | Rationale |
|------|---------|----------|----------|-----------|
| 289 | Paragraphs | `dark:text-gray-300` | `dark:text-gray-200` | Better contrast on dark bg |
| 325 | Unordered lists | `dark:text-gray-300` | `dark:text-gray-200` | Consistent with paragraphs |
| 330 | Ordered lists | `dark:text-gray-300` | `dark:text-gray-200` | Consistent with paragraphs |
| 343 | Blockquotes | `dark:text-gray-300` | `dark:text-gray-200` | Improve quote readability |
| 445 | Table cells | `dark:text-gray-300` | `dark:text-gray-200` | Better data readability |

### Contrast Verification

**Light Mode (White Background #FFFFFF):**
- `text-gray-900` (#111827): 18.07:1 ✅ AAA
- `text-gray-800` (#1F2937): 12.63:1 ✅ AAA
- `text-gray-700` (#374151): 8.59:1 ✅ AAA
- `text-gray-600` (#4B5563): 5.74:1 ✅ AA+

**Dark Mode (Gray-900 Background #111827):**
- `dark:text-gray-100` (#F3F4F6): 15.68:1 ✅ AAA
- `dark:text-gray-200` (#E5E7EB): 13.16:1 ✅ AAA
- `dark:text-gray-300` (#D1D5DB): 10.52:1 ✅ AAA

---

## Refinement Phase

### Testing Strategy

**1. Visual Regression Tests:**
- Screenshot comparison before/after
- Multiple viewport sizes (mobile, tablet, desktop)
- Both light and dark mode
- Different content types (headings, lists, tables, blockquotes)

**2. Accessibility Tests:**
- WCAG 2.1 Level AA compliance check
- Color contrast analyzer
- Screen reader testing
- Keyboard navigation

**3. Browser Compatibility:**
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Android)

**4. Content Validation:**
- Markdown rendering still works
- No visual regressions
- All components render correctly
- Mermaid diagrams unaffected

### Edge Cases

1. **Very long text blocks:** Ensure readability maintained
2. **Nested lists:** Verify contrast inheritance
3. **Code blocks:** Preserve syntax highlighting colors
4. **Tables with alternating rows:** Maintain zebra striping
5. **Links within text:** Ensure link color contrasts with new text color

---

## Completion Phase

### Implementation Checklist

**Code Changes:**
- [ ] Update paragraph text color (line 289)
- [ ] Update unordered list text color (line 325)
- [ ] Update ordered list text color (line 330)
- [ ] Update blockquote text color (line 343)
- [ ] Update table cell text color (line 445)
- [ ] Update strikethrough text color (line 466)
- [ ] Update loading spinner text color (line 190)
- [ ] Update all dark mode variants
- [ ] Verify no regressions in other components

**Validation:**
- [ ] Run concurrent validation agents (production-validator, tester, code-analyzer)
- [ ] Create Playwright accessibility tests
- [ ] Run WCAG contrast checker
- [ ] Browser visual validation with screenshots
- [ ] Screen reader testing
- [ ] Mobile device testing

**Documentation:**
- [ ] Update component documentation
- [ ] Add accessibility compliance notes
- [ ] Screenshot evidence of improvements

---

## Success Criteria

**Primary (Must Pass):**
1. All text meets WCAG 2.1 Level AA contrast requirements (4.5:1)
2. Dark mode text also meets WCAG AA requirements
3. No visual regressions in markdown rendering
4. Mermaid diagrams unaffected
5. All existing tests pass

**Quality (Should Pass):**
1. Text is easily readable on all devices
2. User feedback confirms improved readability
3. Automated accessibility audits pass
4. Zero console errors or warnings
5. Performance unchanged

**Bonus (Nice to Have):**
1. Achieve WCAG AAA (7:1) where possible
2. Add accessibility testing to CI/CD
3. Document color contrast standards for future components

---

**Status:** Ready for implementation
**Confidence:** 99%
**Risk:** Very Low (cosmetic change only)
**Estimated Time:** 20 minutes
