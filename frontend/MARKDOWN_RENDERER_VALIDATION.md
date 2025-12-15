# MarkdownRenderer Validation Checklist

## Quick Validation Script

Run these commands to validate the prose class removal:

```bash
# 1. Run all MarkdownRenderer tests
npm run test -- MarkdownRenderer

# 2. Run accessibility/contrast tests
npm run test -- markdown-contrast

# 3. Run dark mode tests
npm run test -- MarkdownRenderer.dark-mode

# 4. Run all tests together
npm run test -- "MarkdownRenderer|markdown-contrast"
```

## Manual Testing Checklist

### Light Mode Testing (5 minutes)

1. **Paragraph Text**
   - [ ] Open a page with markdown content
   - [ ] Verify paragraph text is dark gray (almost black)
   - [ ] Text should be clearly readable

2. **Headings**
   - [ ] Check all heading levels (H1-H6)
   - [ ] All headings should be dark gray
   - [ ] Headings should be darker than paragraphs

3. **Lists**
   - [ ] Check bullet lists
   - [ ] Check numbered lists
   - [ ] Text should be dark gray

4. **Blockquotes**
   - [ ] Check blockquote text is dark
   - [ ] Background should be light gray
   - [ ] Border should be visible on left

5. **Tables**
   - [ ] Header text should be dark
   - [ ] Cell text should be dark
   - [ ] Table should be readable

6. **Links**
   - [ ] Links should be blue
   - [ ] Hover should work
   - [ ] External links should open in new tab

7. **Code**
   - [ ] Inline code should be red/pink
   - [ ] Code blocks should have dark background
   - [ ] Syntax highlighting should work

### Dark Mode Testing (5 minutes)

1. **Toggle Dark Mode**
   - [ ] Switch to dark mode (usually via UI toggle)
   - [ ] Page should immediately update

2. **Paragraph Text**
   - [ ] Text should be light gray (not pure white)
   - [ ] Should be readable against dark background
   - [ ] No eye strain

3. **Headings**
   - [ ] Headings should be lighter than paragraphs
   - [ ] Should stand out clearly

4. **Lists**
   - [ ] List text should be light gray
   - [ ] Bullets/numbers should be visible

5. **Blockquotes**
   - [ ] Text should be light
   - [ ] Background should be darker gray
   - [ ] Border should still be visible

6. **Tables**
   - [ ] Headers should be light
   - [ ] Cells should be light
   - [ ] Table should remain readable

7. **Links**
   - [ ] Links should be lighter blue
   - [ ] Hover should still work
   - [ ] Still distinguishable from regular text

8. **Code**
   - [ ] Inline code should be lighter red/pink
   - [ ] Code blocks should be even darker
   - [ ] Syntax highlighting colors should adjust

### Cross-Browser Testing (10 minutes)

Test in at least 2 browsers:

**Chrome/Edge**
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] No console errors

**Firefox**
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] No console errors

**Safari** (if available)
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] No console errors

### Mobile Testing (5 minutes)

1. **Responsive Design**
   - [ ] Open on mobile device or use DevTools
   - [ ] Text should be readable
   - [ ] No horizontal scrolling on paragraphs
   - [ ] Tables should scroll horizontally

2. **Dark Mode on Mobile**
   - [ ] Toggle dark mode
   - [ ] Colors should switch
   - [ ] Readable in sunlight (if possible)

### Accessibility Testing (5 minutes)

1. **Contrast Ratios**
   - [ ] Run automated tests (see script above)
   - [ ] All should pass WCAG AA

2. **Screen Reader** (Optional)
   - [ ] Test with screen reader if available
   - [ ] Content should be readable
   - [ ] Headings should be announced correctly

3. **Keyboard Navigation**
   - [ ] Tab through links
   - [ ] Links should be focusable
   - [ ] Focus indicator should be visible

## Visual Regression Checklist

Compare before/after screenshots:

### Elements to Compare:

1. **Text Color**
   - [ ] Paragraphs darker than before? ✅
   - [ ] Headings darker than before? ✅
   - [ ] Lists darker than before? ✅

2. **Spacing**
   - [ ] Margins the same? ✅
   - [ ] Line height the same? ✅
   - [ ] Element spacing preserved? ✅

3. **Layout**
   - [ ] No layout shifts? ✅
   - [ ] Tables still formatted? ✅
   - [ ] Code blocks still formatted? ✅

## Known Issues / Acceptable Changes

### Expected Differences:
- ✅ Text may be slightly darker (gray-900 vs prose default)
- ✅ Dark mode may look different (explicit gray-200 vs prose-invert)
- ✅ Overall contrast should be BETTER

### Unacceptable Changes:
- ❌ Text completely invisible
- ❌ Wrong colors (blue text where it should be gray)
- ❌ Layout broken
- ❌ Spacing drastically changed
- ❌ Dark mode not working at all

## Test Results

### Automated Tests
```
Date: _____________
Tester: _____________

[ ] MarkdownRenderer.test.tsx: PASS / FAIL
[ ] markdown-contrast.test.tsx: PASS / FAIL
[ ] MarkdownRenderer.dark-mode.test.tsx: PASS / FAIL

Failures: _____________
```

### Manual Tests
```
Date: _____________
Tester: _____________

Light Mode:
[ ] Paragraphs: PASS / FAIL
[ ] Headings: PASS / FAIL
[ ] Lists: PASS / FAIL
[ ] Blockquotes: PASS / FAIL
[ ] Tables: PASS / FAIL
[ ] Links: PASS / FAIL
[ ] Code: PASS / FAIL

Dark Mode:
[ ] Paragraphs: PASS / FAIL
[ ] Headings: PASS / FAIL
[ ] Lists: PASS / FAIL
[ ] Blockquotes: PASS / FAIL
[ ] Tables: PASS / FAIL
[ ] Links: PASS / FAIL
[ ] Code: PASS / FAIL

Cross-Browser:
[ ] Chrome: PASS / FAIL
[ ] Firefox: PASS / FAIL
[ ] Safari: PASS / FAIL

Mobile:
[ ] Responsive: PASS / FAIL
[ ] Dark Mode: PASS / FAIL

Notes: _____________________________________________
```

## Sign-Off

**Ready for Production?**

- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] No critical issues found
- [ ] Visual regression acceptable
- [ ] Accessibility maintained

**Signed**: _______________ **Date**: _______________

---

## Quick Issue Checklist

If you find issues, check these common problems:

### Text Not Visible
- Check if Tailwind classes are being applied
- Verify dark mode class on `<html>` element
- Check browser console for errors

### Colors Wrong
- Verify class names (text-gray-900, not text-gray-800)
- Check Tailwind config includes all colors
- Verify no CSS conflicts

### Dark Mode Not Working
- Check `<html class="dark">` is being added
- Verify Tailwind dark mode is enabled in config
- Check for JavaScript errors

### Layout Broken
- Verify spacing classes still present (mb-4, mt-6, etc.)
- Check for CSS conflicts
- Verify max-w-none still present

## Rollback Procedure

If critical issues found:

```bash
# 1. Revert the commit
git revert <commit-hash>

# 2. Or restore previous version
git checkout <previous-commit> -- src/components/dynamic-page/MarkdownRenderer.tsx

# 3. Commit the fix
git add .
git commit -m "Revert MarkdownRenderer prose class removal due to [ISSUE]"

# 4. Deploy fix
git push
```

## Contact

For questions about this validation:
- See: TEST_COVERAGE_PLAN_MARKDOWN_RENDERER.md
- Review: src/tests/MarkdownRenderer.test.tsx
- Check: src/tests/accessibility/markdown-contrast.test.tsx
