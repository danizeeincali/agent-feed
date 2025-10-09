# SPARC Specification: Prose Class Removal Fix

**Date:** 2025-10-09
**Issue:** Text colors (text-gray-900) being overridden by conflicting `prose` classes
**Root Cause:** Tailwind Typography `prose` classes override custom component text colors
**Impact:** User-reported text still appears light gray despite color updates

---

## Specification Phase

### Problem Analysis

**The Conflict:**

MarkdownRenderer.tsx has BOTH custom text colors AND conflicting prose classes:

```typescript
// Line 498 - Container with conflicting classes
<div className={`markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none ${className}`}>
  <ReactMarkdown components={components}>
    {content}
  </ReactMarkdown>
</div>

// Lines 289, 325, 330, 343, 445 - Custom colors that are being overridden
<p className="mb-4 text-gray-900 dark:text-gray-200 leading-relaxed">
```

**What's Happening:**

1. Custom component renderers set `text-gray-900`
2. Container has `prose` class
3. Tailwind Typography plugin (if present) OR residual CSS generates:
   ```css
   .prose p { color: rgb(55, 65, 81); } /* gray-700 - OVERRIDES custom */
   .prose ul { color: rgb(55, 65, 81); }
   .prose blockquote { color: rgb(55, 65, 81); }
   ```
4. CSS cascade: `.prose p` has SAME specificity as `.text-gray-900`
5. Last one in CSS bundle wins → `prose` wins if loaded last

**Evidence:**
- @tailwindcss/typography is NOT in package.json
- BUT `prose` classes still exist in the codebase
- This means either:
  - Plugin was installed then removed (residual CSS)
  - Custom prose CSS exists somewhere
  - Classes are inert but causing confusion

**User Impact:**
- Text appears gray-700 instead of gray-900
- Low contrast makes text hard to read
- Accessibility improvement BLOCKED by conflicting classes

### Solution Requirements

**Primary Goal:** Remove conflicting `prose` classes so custom text-gray-900 colors work

**Requirements:**
1. Remove `prose`, `prose-sm`, `prose-lg` classes from container
2. Maintain all existing markdown rendering functionality
3. Preserve responsive max-width behavior
4. Keep custom component renderers intact
5. Ensure no visual regressions

**Success Criteria:**
- Text renders with text-gray-900 (dark, high contrast)
- No CSS conflicts
- All markdown features work (headings, lists, tables, code, etc.)
- Responsive design maintained
- Dark mode works correctly

---

## Pseudocode Phase

### Removal Algorithm

```pseudocode
FUNCTION removeProseClasses():
  // Step 1: Locate the container div
  file = "MarkdownRenderer.tsx"
  line = 498

  // Step 2: Identify conflicting classes
  conflictingClasses = ["prose", "prose-sm", "sm:prose", "lg:prose-lg"]

  // Step 3: Define what to keep
  keepClasses = ["markdown-renderer", "max-w-none", "${className}"]

  // Step 4: Replace className
  OLD_CLASSNAME = "markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none ${className}"
  NEW_CLASSNAME = "markdown-renderer max-w-none ${className}"

  // Step 5: Verify no side effects
  CHECK that custom component renderers still work:
    - <p className="text-gray-900"> should now apply
    - <ul className="text-gray-900"> should now apply
    - No other styling lost

  RETURN updated file
```

### CSS Specificity Analysis

```pseudocode
BEFORE (conflicting):
  .prose p { color: gray-700; }  // Specificity: 0,0,2,0
  .text-gray-900 { color: gray-900; }  // Specificity: 0,0,1,0

  WINNER: .prose p (higher specificity) → gray-700 ❌

AFTER (no conflict):
  .text-gray-900 { color: gray-900; }  // Specificity: 0,0,1,0

  WINNER: .text-gray-900 → gray-900 ✅
```

---

## Architecture Phase

### File Changes

**File:** `/workspaces/agent-feed/frontend/src/components/dynamic-page/MarkdownRenderer.tsx`

**Single Line Change:**

| Line | Before | After | Rationale |
|------|--------|-------|-----------|
| 498 | `className={`markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none ${className}`}` | `className={`markdown-renderer max-w-none ${className}`}` | Remove conflicting prose classes |

**What Stays:**
- ✅ `markdown-renderer` - Custom class for targeting
- ✅ `max-w-none` - Prevents width constraints
- ✅ `${className}` - Allow parent to add custom classes

**What's Removed:**
- ❌ `prose` - Conflicts with custom colors
- ❌ `prose-sm` - Not needed, using custom component renderers
- ❌ `sm:prose` - Responsive prose (not needed)
- ❌ `lg:prose-lg` - Responsive prose (not needed)

### Impact Analysis

**No Functionality Lost:**

The `prose` classes were providing:
1. **Typography styles** → We have custom component renderers that handle this
2. **Spacing/rhythm** → We define spacing in each component (mb-4, space-y-2, etc.)
3. **Color scheme** → This is what we're FIXING (was gray-700, now gray-900)
4. **Responsive sizing** → Handled by custom component renderers

**Everything is already handled by our custom components**, so prose is redundant and conflicting.

---

## Refinement Phase

### Testing Strategy

**1. Visual Regression Tests:**
- Before/after screenshots of markdown content
- Verify text is darker (gray-900 vs gray-700)
- Check all element types render correctly
- Test both light and dark mode

**2. Functional Tests:**
- All markdown syntax works (headings, lists, tables, code, blockquotes)
- Links are clickable
- Code syntax highlighting works
- Mermaid diagrams render
- Images display correctly

**3. Contrast Tests:**
- Measure actual rendered color values
- Verify WCAG AA compliance (4.5:1+)
- Test with Playwright color extraction
- Compare with expected RGB values

**4. Cross-Browser Tests:**
- Chrome, Firefox, Safari
- Mobile browsers
- Different screen sizes

### Edge Cases

1. **Custom className prop:** Parent can still add classes via `${className}`
2. **Nested markdown:** Custom renderers handle nesting correctly
3. **Code blocks:** Syntax highlighting preserved (rehype-highlight)
4. **Mermaid blocks:** Already using custom renderer, unaffected
5. **Empty content:** Gracefully handles empty strings
6. **Very long content:** Scrolling and performance maintained

### Rollback Plan

If issues occur:
```typescript
// Revert to original
<div className={`markdown-renderer prose prose-sm sm:prose lg:prose-lg max-w-none ${className}`}>
```

**Risk:** VERY LOW (prose classes weren't doing much anyway)

---

## Completion Phase

### Implementation Checklist

**Code Changes:**
- [ ] Update line 498 in MarkdownRenderer.tsx
- [ ] Remove: `prose prose-sm sm:prose lg:prose-lg`
- [ ] Keep: `markdown-renderer max-w-none ${className}`
- [ ] Verify TypeScript compilation
- [ ] Check for any CSS imports of prose styles

**Validation:**
- [ ] Run concurrent validation agents
- [ ] Create Playwright visual regression tests
- [ ] Extract and verify actual rendered colors
- [ ] Test all markdown element types
- [ ] Browser validation with screenshots
- [ ] Compare before/after screenshots

**Documentation:**
- [ ] Update component documentation
- [ ] Add comments explaining prose removal
- [ ] Document color contrast standards

---

## Success Criteria

**Primary (Must Pass):**
1. Text renders with text-gray-900 color (RGB 17, 24, 39)
2. No CSS conflicts or overrides
3. All markdown features work correctly
4. WCAG AA contrast achieved (verified in browser)
5. User confirms text is now visible and dark

**Quality (Should Pass):**
1. Zero breaking changes to markdown rendering
2. All existing tests pass
3. No console errors or warnings
4. Performance unchanged
5. Dark mode works correctly

**Bonus (Nice to Have):**
1. Visual regression tests pass
2. Automated contrast verification
3. Cross-browser screenshots

---

**Status:** Ready for implementation
**Confidence:** 95%
**Risk:** Very Low (removing unused conflicting classes)
**Estimated Time:** 10 minutes
**Expected Result:** Text-gray-900 colors will finally work, text will be dark and readable
