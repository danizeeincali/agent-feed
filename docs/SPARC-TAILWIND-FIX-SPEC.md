# SPARC Specification: Invalid Tailwind CSS Classes Fix

**Document Version:** 1.0.0
**Created:** 2025-10-27
**Status:** Active
**SPARC Phase:** Specification

---

## Executive Summary

This specification addresses a critical bug in the markdown CSS styling that causes Vite PostCSS compilation failures, resulting in a white screen for end users. The issue stems from invalid Tailwind CSS classes (`bg-gray-25` and `bg-gray-850`) that do not exist in Tailwind's default color palette.

**Impact:** HIGH - Production blocking
**Complexity:** LOW - Single file, two-line fix
**Priority:** CRITICAL - Prevents application from loading

---

## 1. Problem Statement

### 1.1 Current State

**File:** `/workspaces/agent-feed/frontend/src/styles/markdown.css`
**Line:** 437
**Current Code:**
```css
/* Alternating row colors */
.markdown-content tbody tr:nth-child(even) {
  @apply bg-gray-25 dark:bg-gray-850;
}
```

### 1.2 Root Cause Analysis

#### Invalid Tailwind Classes
- **`bg-gray-25`** - Does NOT exist in Tailwind CSS
- **`bg-gray-850`** - Does NOT exist in Tailwind CSS

#### Valid Tailwind Gray Scale
Tailwind CSS v3.4.1 provides the following gray scale values:
```
50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
```

**Source:** [Tailwind CSS Color Documentation](https://tailwindcss.com/docs/customizing-colors#default-color-palette)

#### Error Chain
1. Invalid `@apply` directive with non-existent classes
2. PostCSS compilation fails during Vite build/dev process
3. CSS bundle generation aborted
4. No styles loaded in browser
5. White screen presented to user

### 1.3 Discovery Context

This is a **pre-existing bug** that was exposed when CSS import order was corrected in a previous fix. The bug existed silently but was not caught by:
- Build process (should have failed)
- Type checking
- Linting
- Code review

---

## 2. Functional Requirements

### FR-001: Fix Invalid Light Mode Background
**Priority:** HIGH
**Description:** Replace `bg-gray-25` with the closest valid Tailwind class

**Acceptance Criteria:**
- [ ] Use `bg-gray-50` (lightest gray, closest to intended "25")
- [ ] Maintain zebra striping visual effect for table rows
- [ ] No visual regression in light mode
- [ ] PostCSS compiles without errors

**Rationale:**
- `bg-gray-50` is the lightest gray in Tailwind's palette
- Provides subtle alternating row background
- Maintains readability and accessibility

### FR-002: Fix Invalid Dark Mode Background
**Priority:** HIGH
**Description:** Replace `bg-gray-850` with the closest valid Tailwind class

**Acceptance Criteria:**
- [ ] Use `bg-gray-800` (closest to intended "850")
- [ ] Maintain zebra striping visual effect for table rows
- [ ] No visual regression in dark mode
- [ ] PostCSS compiles without errors

**Rationale:**
- `bg-gray-800` is the darkest gray before `bg-gray-900`
- Provides appropriate contrast in dark mode
- Balances visibility without overwhelming the UI

### FR-003: Preserve Table Styling Functionality
**Priority:** HIGH
**Description:** Ensure table row alternating colors continue to work

**Acceptance Criteria:**
- [ ] Even rows have distinct background color
- [ ] Odd rows maintain default background
- [ ] Hover effects continue to work (line 424-427)
- [ ] Zebra striping improves readability

---

## 3. Non-Functional Requirements

### NFR-001: Build Process Integrity
**Category:** Performance
**Priority:** CRITICAL

**Requirements:**
- [ ] Vite dev server starts without errors
- [ ] PostCSS compilation completes successfully
- [ ] Build time remains under 30 seconds
- [ ] No console warnings related to Tailwind

**Measurement:**
```bash
# Dev server start time
time npm run dev

# Build process verification
npm run build && echo "Build successful"
```

### NFR-002: Visual Consistency
**Category:** User Experience
**Priority:** HIGH

**Requirements:**
- [ ] Light mode table rows have subtle alternating backgrounds
- [ ] Dark mode table rows have visible alternating backgrounds
- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] No jarring color differences between modes

**Measurement:**
- Visual regression testing
- Contrast ratio verification using browser DevTools
- Side-by-side comparison before/after

### NFR-003: CSS Performance
**Category:** Performance
**Priority:** MEDIUM

**Requirements:**
- [ ] No increase in CSS bundle size
- [ ] No additional CSS processing overhead
- [ ] Class application remains efficient

**Measurement:**
```bash
# Check CSS bundle size
npm run build && ls -lh dist/assets/*.css
```

### NFR-004: Maintainability
**Category:** Code Quality
**Priority:** MEDIUM

**Requirements:**
- [ ] Use only valid Tailwind classes
- [ ] Follow existing CSS patterns in file
- [ ] Maintain code comments and documentation
- [ ] No custom color definitions needed

---

## 4. Technical Specification

### 4.1 Exact Changes Required

**File:** `/workspaces/agent-feed/frontend/src/styles/markdown.css`

**Change:**
```diff
 /* Alternating row colors */
 .markdown-content tbody tr:nth-child(even) {
-  @apply bg-gray-25 dark:bg-gray-850;
+  @apply bg-gray-50 dark:bg-gray-800;
 }
```

### 4.2 Color Mapping

| Invalid Class | Valid Replacement | Hex Value (Light) | Hex Value (Dark) |
|--------------|-------------------|-------------------|------------------|
| `bg-gray-25` | `bg-gray-50` | `#f9fafb` | - |
| `bg-gray-850` | `bg-gray-800` | - | `#1f2937` |

### 4.3 CSS Context

**Related Styles (No Changes Required):**
```css
/* Table base styles (line 396-401) */
.markdown-content table {
  @apply w-full mb-4 border-collapse;
  @apply border border-gray-200 dark:border-gray-700;
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Table hover effect (line 424-427) */
.markdown-content tbody tr:hover {
  @apply bg-gray-50 dark:bg-gray-800/50;
  @apply transition-colors duration-150;
}
```

**Note:** The hover effect uses `bg-gray-50` in light mode, which will now match the even-row background. This is acceptable and maintains consistency.

### 4.4 Affected Files

**Primary:**
- `/workspaces/agent-feed/frontend/src/styles/markdown.css` (line 437)

**No changes required:**
- Vite config
- Tailwind config
- PostCSS config
- Any component files

---

## 5. Test Requirements

### 5.1 Unit Tests (Not Applicable)
This is a CSS-only change with no JavaScript logic to test.

### 5.2 Integration Tests

#### Test Case IT-001: PostCSS Compilation
**Objective:** Verify Tailwind CSS processes without errors

**Prerequisites:**
- Clean `node_modules` and `dist` directories
- Fresh install of dependencies

**Steps:**
1. Run `npm run build`
2. Verify exit code is 0
3. Check console output for errors
4. Verify CSS files generated in `dist/assets/`

**Expected Results:**
- Build completes successfully
- No PostCSS errors in console
- CSS bundle contains compiled styles
- File size is reasonable (<500KB)

**Validation Command:**
```bash
npm run build 2>&1 | tee build.log && \
  grep -i "error" build.log && \
  echo "FAIL: Errors found" || \
  echo "PASS: Clean build"
```

#### Test Case IT-002: Vite Dev Server
**Objective:** Verify development server starts and serves styles

**Steps:**
1. Start dev server: `npm run dev`
2. Wait for "ready in Xms" message
3. Navigate to `http://localhost:5173`
4. Open browser DevTools Network tab
5. Verify CSS file loads (200 status)
6. Check console for errors

**Expected Results:**
- Dev server starts in <10 seconds
- CSS file serves successfully
- No 404 errors
- No console warnings

**Validation Command:**
```bash
timeout 30s npm run dev 2>&1 | grep -q "ready in" && \
  echo "PASS: Dev server started" || \
  echo "FAIL: Dev server failed"
```

### 5.3 Visual Regression Tests

#### Test Case VR-001: Light Mode Table Rendering
**Objective:** Verify table styling in light mode

**Prerequisites:**
- Application running in browser
- Sample markdown content with tables loaded

**Steps:**
1. Navigate to page with markdown tables
2. Verify light mode is active
3. Inspect table rows
4. Check even-row background color
5. Verify hover effects work

**Expected Results:**
- Even rows have subtle gray background (`#f9fafb`)
- Odd rows have white/transparent background
- Hover adds visual feedback
- Text is readable (contrast ratio ≥ 4.5:1)

**Visual Checkpoints:**
```
Even rows: rgb(249, 250, 251) - very light gray
Odd rows:  rgb(255, 255, 255) - white
Hover:     rgb(249, 250, 251) with 50% opacity
```

#### Test Case VR-002: Dark Mode Table Rendering
**Objective:** Verify table styling in dark mode

**Steps:**
1. Navigate to page with markdown tables
2. Switch to dark mode
3. Inspect table rows
4. Check even-row background color
5. Verify hover effects work

**Expected Results:**
- Even rows have dark gray background (`#1f2937`)
- Odd rows have darker transparent background
- Hover adds lighter overlay (50% opacity)
- Text is readable (contrast ratio ≥ 4.5:1)

**Visual Checkpoints:**
```
Even rows: rgb(31, 41, 55) - dark gray
Odd rows:  rgb(17, 24, 39) - darker gray (from table bg)
Hover:     rgb(31, 41, 55) with 50% opacity
```

### 5.4 Accessibility Tests

#### Test Case A11Y-001: Color Contrast
**Objective:** Verify WCAG AA compliance

**Tools Required:**
- Chrome DevTools Lighthouse
- axe DevTools extension

**Steps:**
1. Run Lighthouse accessibility audit
2. Check contrast ratios for table text
3. Verify no color contrast failures
4. Test with screen reader (optional)

**Expected Results:**
- All text passes WCAG AA (4.5:1 for normal text, 3:1 for large text)
- No accessibility violations reported
- Tables are navigable by keyboard
- Screen reader announces table structure

**Validation Command:**
```bash
# Using Playwright with axe
npm run test:e2e -- --grep "accessibility"
```

### 5.5 Regression Tests

#### Test Case REG-001: Previous CSS Import Fix
**Objective:** Ensure previous fix remains functional

**Context:** This bug was exposed by fixing CSS import order

**Steps:**
1. Verify CSS import order in main entry file
2. Check that markdown.css loads after base styles
3. Confirm no style conflicts
4. Verify cascading works correctly

**Expected Results:**
- CSS import order matches previous fix
- No style overrides breaking existing functionality
- Markdown styles apply correctly
- No specificity issues

**Files to Verify:**
- `/workspaces/agent-feed/frontend/src/main.tsx` (or equivalent)
- `/workspaces/agent-feed/frontend/src/index.css`
- `/workspaces/agent-feed/frontend/src/styles/markdown.css`

#### Test Case REG-002: Other Markdown Styles
**Objective:** Verify no unintended side effects

**Scope:** All other markdown CSS rules should remain unchanged

**Steps:**
1. Test heading styles (h1-h6)
2. Test code blocks and inline code
3. Test lists (ordered, unordered, task lists)
4. Test blockquotes
5. Test links and hover states
6. Test images and captions
7. Test horizontal rules

**Expected Results:**
- All markdown elements render correctly
- No style regressions
- Dark mode continues to work for all elements
- Responsive design remains intact

---

## 6. Acceptance Criteria

### 6.1 Must-Have (P0)

- [x] Replace `bg-gray-25` with `bg-gray-50`
- [x] Replace `bg-gray-850` with `bg-gray-800`
- [ ] Vite dev server starts without errors
- [ ] PostCSS compilation succeeds
- [ ] Build process completes successfully
- [ ] No console errors in browser
- [ ] CSS bundle loads correctly

### 6.2 Should-Have (P1)

- [ ] Visual consistency maintained in light mode
- [ ] Visual consistency maintained in dark mode
- [ ] Table zebra striping visible and functional
- [ ] Hover effects work correctly
- [ ] WCAG AA contrast ratios met

### 6.3 Nice-to-Have (P2)

- [ ] Documentation updated with valid class names
- [ ] Lint rules added to prevent invalid classes
- [ ] Build-time validation for Tailwind classes
- [ ] Unit test for CSS compilation (if feasible)

---

## 7. Implementation Strategy

### 7.1 Change Workflow

**Step 1: Verification**
```bash
# Confirm current state
grep -n "bg-gray-25\|bg-gray-850" frontend/src/styles/markdown.css

# Expected output:
# 437:  @apply bg-gray-25 dark:bg-gray-850;
```

**Step 2: Implementation**
```bash
# Edit file
# Replace line 437:
#   FROM: @apply bg-gray-25 dark:bg-gray-850;
#   TO:   @apply bg-gray-50 dark:bg-gray-800;
```

**Step 3: Validation**
```bash
# Verify change
grep -n "bg-gray-50\|bg-gray-800" frontend/src/styles/markdown.css

# Test build
cd frontend && npm run build

# Test dev server
npm run dev
```

### 7.2 Rollback Plan

**If issues occur:**
```bash
# Revert using git
git checkout HEAD -- frontend/src/styles/markdown.css

# Or restore original values
# Line 437: @apply bg-gray-25 dark:bg-gray-850;
```

**Note:** Rollback is NOT recommended as it will restore the bug.

### 7.3 Deployment Strategy

**Development:**
1. Make change in feature branch
2. Test locally with `npm run dev`
3. Run full build with `npm run build`
4. Verify in browser (light and dark modes)

**Staging:**
1. Deploy to staging environment
2. Run automated tests
3. Manual QA verification
4. Visual regression testing

**Production:**
1. Merge to main branch
2. Trigger production build
3. Deploy to production
4. Monitor for errors
5. Verify user-facing application loads

---

## 8. Dependencies

### 8.1 External Dependencies

**Tailwind CSS** v3.4.1
- Source of valid color classes
- Documentation: https://tailwindcss.com/docs/customizing-colors
- Color palette reference: https://tailwindcss.com/docs/customizing-colors#default-color-palette

**PostCSS** v8.4.38
- Processes `@apply` directives
- Compiles Tailwind utilities to CSS

**Vite** v5.4.20
- Build tool and dev server
- Runs PostCSS during build/dev process

### 8.2 Internal Dependencies

**No internal dependencies:** This is an isolated CSS fix with no JavaScript dependencies.

**Related Files (No Changes Required):**
- `/workspaces/agent-feed/frontend/tailwind.config.js` - Tailwind configuration
- `/workspaces/agent-feed/frontend/postcss.config.js` - PostCSS configuration
- `/workspaces/agent-feed/frontend/vite.config.ts` - Vite configuration

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Visual regression in light mode | Low | Medium | Visual regression tests |
| Visual regression in dark mode | Low | Medium | Visual regression tests |
| Hover effect conflicts | Very Low | Low | Test hover interactions |
| Build process failure | Very Low | High | Test build locally first |
| Browser compatibility issues | Very Low | Medium | Cross-browser testing |

### 9.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User complaints about colors | Very Low | Low | Colors are very similar |
| Accessibility concerns | Very Low | Medium | WCAG compliance testing |
| Deployment delays | Very Low | Low | Simple, isolated change |

### 9.3 Risk Mitigation Strategy

1. **Pre-deployment Testing:** Comprehensive local testing before deployment
2. **Staged Rollout:** Deploy to staging first, then production
3. **Monitoring:** Watch for errors post-deployment
4. **Quick Rollback:** Simple git revert if critical issues found
5. **Documentation:** Clear specification ensures correct implementation

---

## 10. Success Metrics

### 10.1 Technical Metrics

**Build Success:**
- ✅ PostCSS compilation: 0 errors
- ✅ Vite build time: <30 seconds
- ✅ CSS bundle size: No significant increase (±5KB)
- ✅ Dev server start time: <10 seconds

**Quality Metrics:**
- ✅ Lighthouse accessibility score: ≥95
- ✅ Lighthouse performance score: ≥90
- ✅ Zero console errors
- ✅ Zero console warnings related to CSS

### 10.2 User Experience Metrics

**Visual Quality:**
- ✅ Table readability: Subjective assessment (good/excellent)
- ✅ Color consistency: Matches design system
- ✅ Dark mode quality: Properly contrasted
- ✅ Hover feedback: Clear and responsive

**Accessibility:**
- ✅ WCAG AA compliance: 100% pass rate
- ✅ Screen reader compatibility: No regressions
- ✅ Keyboard navigation: Fully functional

### 10.3 Validation Checklist

**Pre-Deployment:**
- [ ] Code change implemented correctly
- [ ] Build succeeds locally
- [ ] Dev server runs without errors
- [ ] Visual inspection passed (light mode)
- [ ] Visual inspection passed (dark mode)
- [ ] Accessibility audit passed
- [ ] No console errors/warnings
- [ ] Git commit with clear message

**Post-Deployment:**
- [ ] Production build succeeds
- [ ] Application loads without white screen
- [ ] Tables render with alternating colors
- [ ] Dark mode toggle works
- [ ] No user-reported issues within 24 hours
- [ ] Monitoring shows no errors

---

## 11. Documentation Requirements

### 11.1 Code Documentation

**Inline Comments:**
```css
/* Alternating row colors - Using valid Tailwind classes */
/* bg-gray-50: Light mode even rows (#f9fafb) */
/* bg-gray-800: Dark mode even rows (#1f2937) */
.markdown-content tbody tr:nth-child(even) {
  @apply bg-gray-50 dark:bg-gray-800;
}
```

### 11.2 Change Log

**Entry for CHANGELOG.md:**
```markdown
## [Version] - 2025-10-27

### Fixed
- Fixed invalid Tailwind CSS classes in markdown table styling
  - Replaced `bg-gray-25` with `bg-gray-50` (light mode)
  - Replaced `bg-gray-850` with `bg-gray-800` (dark mode)
  - Resolved PostCSS compilation errors
  - Prevented white screen on application load
  - Maintained table zebra striping functionality
  - File: `frontend/src/styles/markdown.css` line 437
```

### 11.3 Developer Notes

**For Future Reference:**
- Always use valid Tailwind color classes: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
- Invalid classes cause PostCSS compilation failures
- Test builds locally before committing CSS changes
- Consider adding build-time validation for Tailwind classes

---

## 12. Constraints and Assumptions

### 12.1 Constraints

**Technical Constraints:**
- Must use standard Tailwind color palette (cannot add custom colors)
- Must maintain PostCSS compatibility
- Must work with Vite build process
- Cannot break existing dark mode functionality

**Business Constraints:**
- Must be fixed immediately (production blocker)
- Cannot introduce new dependencies
- Must maintain visual consistency with existing design

**Time Constraints:**
- Fix should be implementable in <1 hour
- Testing should be completable in <2 hours
- Total time to production: <4 hours

### 12.2 Assumptions

**Technical Assumptions:**
- Tailwind CSS v3.4.1 color palette is sufficient
- PostCSS is correctly configured
- Vite build process is stable
- No custom Tailwind color extensions needed

**User Assumptions:**
- Users expect subtle zebra striping in tables
- Color differences will be imperceptible to most users
- Accessibility is maintained with standard colors

**Environment Assumptions:**
- Development environment has Node.js 18+
- All npm packages are properly installed
- Build tools are correctly configured

---

## 13. Open Questions

### 13.1 Resolved Questions

**Q: Why were invalid classes not caught by build tools?**
A: The bug existed silently and was exposed when CSS import order was fixed. PostCSS should have failed earlier, indicating a possible issue with error handling in the build process.

**Q: Should we add custom color values for exact matches?**
A: No. Using standard Tailwind colors ensures consistency and maintainability. The visual difference is negligible.

**Q: Will this affect other components?**
A: No. This is scoped to markdown content styling only.

### 13.2 Outstanding Questions

**Q: Should we add build-time validation for Tailwind classes?**
A: Future enhancement. Consider adding ESLint plugin or PostCSS validation.

**Q: Are there other invalid classes in the codebase?**
A: Recommended: Run a codebase scan for invalid Tailwind classes:
```bash
grep -r "bg-gray-[0-9]\{1,4\}" frontend/src --include="*.css" --include="*.tsx"
```

---

## 14. References

### 14.1 External Documentation

- [Tailwind CSS Color Palette](https://tailwindcss.com/docs/customizing-colors#default-color-palette)
- [Tailwind CSS @apply Directive](https://tailwindcss.com/docs/functions-and-directives#apply)
- [PostCSS Documentation](https://postcss.org/)
- [Vite CSS Processing](https://vite.dev/guide/features.html#css)
- [WCAG 2.1 Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### 14.2 Internal Documentation

- SPARC Markdown Rendering Architecture: `/workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-ARCHITECTURE.md`
- Previous CSS Import Fix: (Reference to related documentation if available)

### 14.3 Related Issues

- Issue: White screen on application load (PostCSS failure)
- Root Cause: Invalid Tailwind classes in markdown.css
- Related: CSS import order fix that exposed this bug

---

## 15. Approval and Sign-off

### 15.1 Specification Review

**Specification Author:** Claude (SPARC Agent)
**Date Created:** 2025-10-27
**Version:** 1.0.0

### 15.2 Stakeholder Approval

**Technical Approval:**
- [ ] Frontend Developer: _______________
- [ ] Tech Lead: _______________

**QA Approval:**
- [ ] QA Engineer: _______________

**Product Approval:**
- [ ] Product Owner: _______________

### 15.3 Change Authorization

**Authorized for Implementation:** [ ]
**Implementation Date:** _______________
**Deployment Date:** _______________

---

## Appendix A: Color Reference

### Tailwind Gray Scale (Complete)

```css
/* Valid Tailwind Gray Colors */
gray-50:  #f9fafb  /* Lightest */
gray-100: #f3f4f6
gray-200: #e5e7eb
gray-300: #d1d5db
gray-400: #9ca3af
gray-500: #6b7280  /* Mid-tone */
gray-600: #4b5563
gray-700: #374151
gray-800: #1f2937  /* Dark */
gray-900: #111827
gray-950: #030712  /* Darkest */
```

### Invalid Classes to Avoid

```
❌ gray-25, gray-75
❌ gray-125, gray-150, gray-175
❌ gray-225, gray-250, gray-275
❌ gray-325, gray-350, gray-375
❌ gray-425, gray-450, gray-475
❌ gray-525, gray-550, gray-575
❌ gray-625, gray-650, gray-675
❌ gray-725, gray-750, gray-775
❌ gray-825, gray-850, gray-875
❌ gray-925, gray-975
```

---

## Appendix B: Test Commands

### Build and Development

```bash
# Install dependencies
cd /workspaces/agent-feed/frontend
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Verification Commands

```bash
# Check for invalid Tailwind classes
grep -n "bg-gray-25\|bg-gray-850" frontend/src/styles/markdown.css

# Verify fix
grep -n "bg-gray-50\|bg-gray-800" frontend/src/styles/markdown.css

# Build with error capture
npm run build 2>&1 | tee build.log

# Check build success
echo $?  # Should output: 0

# Verify CSS file generation
ls -lh dist/assets/*.css
```

### Testing Commands

```bash
# Run all tests
npm run test

# E2E tests (if available)
npm run test:e2e

# Accessibility tests
npm run test:e2e -- --grep "accessibility"
```

---

## Appendix C: Visual Comparison

### Before (Invalid Classes)

```css
/* ❌ INVALID - Causes PostCSS failure */
.markdown-content tbody tr:nth-child(even) {
  @apply bg-gray-25 dark:bg-gray-850;
}
```

**Result:** Build fails, white screen

### After (Valid Classes)

```css
/* ✅ VALID - Compiles successfully */
.markdown-content tbody tr:nth-child(even) {
  @apply bg-gray-50 dark:bg-gray-800;
}
```

**Result:** Build succeeds, tables render correctly

### Visual Impact

**Light Mode:**
- Before: (Not rendered - PostCSS error)
- After: Subtle light gray background on even rows (#f9fafb)
- Difference: Imperceptible to users (gray-50 is nearly white)

**Dark Mode:**
- Before: (Not rendered - PostCSS error)
- After: Dark gray background on even rows (#1f2937)
- Difference: Minimal - gray-800 vs hypothetical gray-850

---

**End of Specification Document**
