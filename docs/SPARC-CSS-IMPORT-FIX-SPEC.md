# SPARC Specification: CSS Import Order Fix

**Document Version:** 1.0.0
**Created:** 2025-10-27
**Status:** Draft
**Component:** Frontend Styling System
**Priority:** High
**Severity:** Critical - Build Failure

---

## Executive Summary

This specification addresses a critical CSS specification violation in `/workspaces/agent-feed/frontend/src/index.css` that causes Vite build failures and prevents markdown styles from loading. The CSS @import rule appears after @tailwind directives, violating the CSS specification requirement that @import must precede all other CSS statements except @charset.

### Impact
- **Build System:** Vite throws fatal error: `[vite:css] @import must precede all other statements`
- **User Experience:** Markdown content in posts and comments renders without formatting
- **Visual Regression:** Loss of typography hierarchy, code blocks, tables, and all markdown styling

---

## 1. Current State Analysis

### 1.1 Problem Location

**File:** `/workspaces/agent-feed/frontend/src/index.css`

**Current (INCORRECT) Order:**
```css
Line 1: @tailwind base;
Line 2: @tailwind components;
Line 3: @tailwind utilities;
Line 4:
Line 5: /* Import Markdown Styling */
Line 6: @import './styles/markdown.css';
```

### 1.2 Root Cause

**CSS Specification Violation:**
- Per CSS2.1 and CSS3 specifications, `@import` rules MUST appear before all other rules except `@charset`
- The `@tailwind` directives are processed as regular CSS rules by Vite
- Current ordering violates W3C CSS specification Section 3.3

**Technical Context:**
- Vite's CSS processor strictly enforces CSS specification compliance
- PostCSS pipeline processes `@tailwind` directives before `@import` validation
- This creates a parsing error at build time

### 1.3 Impact Analysis

#### Build Impact
- **Severity:** Critical
- **Effect:** Complete build failure in production
- **Error Message:** `[vite:css] @import must precede all other statements (except @charset)`
- **Deployment:** Blocks all deployments until resolved

#### Style Impact
- **Affected File:** `/workspaces/agent-feed/frontend/src/styles/markdown.css` (742 lines)
- **Lost Styles:**
  - Typography hierarchy (h1-h6 with custom borders and spacing)
  - Text formatting (bold, italic, strikethrough, underline)
  - Code blocks with syntax highlighting (hljs theme)
  - Blockquotes with left border styling
  - Tables with hover effects and alternating rows
  - Task lists with custom checkboxes
  - Links with hover states and external indicators
  - Images with borders and shadows
  - Dark mode variants for all elements
  - Responsive design breakpoints
  - Accessibility focus styles
  - Print styles

#### User Experience Impact
- **Markdown Posts:** Plain unstyled text
- **Code Snippets:** No syntax highlighting or monospace fonts
- **Tables:** No borders, hover effects, or structure
- **Blockquotes:** No visual distinction from regular text
- **Lists:** Basic browser defaults only
- **Dark Mode:** No markdown-specific dark theme

### 1.4 Dependencies Analysis

**Imported File:** `/workspaces/agent-feed/frontend/src/styles/markdown.css`
- **Size:** 742 lines
- **Dependencies:** Tailwind CSS `@apply` directives throughout
- **Critical:** Yes - provides all markdown rendering styles

**Tailwind Dependencies:**
- `@tailwind base` - Required for Tailwind's CSS reset
- `@tailwind components` - Required for component layer
- `@tailwind utilities` - Required for utility classes
- **Order Requirement:** Must process AFTER `@import` to allow `@apply` in markdown.css

### 1.5 CSS Specification Reference

**W3C CSS2.1 Specification - Section 3.3:**
> The '@import' rule allows users to import style rules from other style sheets. Any @import rules must precede all other at-rules and rule sets in a style sheet.

**CSS3 Cascading and Inheritance:**
> The @import rules must precede all other rules, except @charset rules.

---

## 2. Functional Requirements

### FR-001: CSS Import Order Compliance
**Priority:** Critical
**ID:** FR-001

**Description:**
The `index.css` file MUST comply with CSS specification by placing all `@import` statements before `@tailwind` directives.

**Acceptance Criteria:**
- [ ] All `@import` statements appear before line 1 of current file
- [ ] `@import './styles/markdown.css'` is the first CSS statement
- [ ] `@tailwind` directives follow after all `@import` statements
- [ ] Comments can appear anywhere but do not affect @-rule ordering
- [ ] File validates against CSS specification

**Current State:**
```css
@tailwind base;           /* Line 1 - WRONG POSITION */
@tailwind components;     /* Line 2 */
@tailwind utilities;      /* Line 3 */
@import './styles/markdown.css'; /* Line 6 - VIOLATES SPEC */
```

**Required State:**
```css
@import './styles/markdown.css'; /* Line 1 - CORRECT POSITION */
@tailwind base;                  /* Line 2 */
@tailwind components;            /* Line 3 */
@tailwind utilities;             /* Line 4 */
```

### FR-002: Vite Build Success
**Priority:** Critical
**ID:** FR-002

**Description:**
The Vite build process MUST complete successfully without CSS parsing errors.

**Acceptance Criteria:**
- [ ] `npm run build` completes without errors
- [ ] No `[vite:css]` error messages in build output
- [ ] CSS bundle generation succeeds
- [ ] Production build artifacts created successfully
- [ ] Development server starts without CSS errors

**Validation Command:**
```bash
cd /workspaces/agent-feed/frontend
npm run build
```

**Expected Output:**
- No errors in build log
- `dist/` directory created with CSS assets
- Exit code 0

### FR-003: Markdown Style Preservation
**Priority:** High
**ID:** FR-003

**Description:**
All markdown styles from `markdown.css` MUST load and render correctly in the application.

**Acceptance Criteria:**
- [ ] All 742 lines of markdown.css styles are applied
- [ ] Typography hierarchy renders (h1-h6 with borders)
- [ ] Code blocks have syntax highlighting
- [ ] Tables render with borders and hover effects
- [ ] Blockquotes display with left border
- [ ] Task lists show custom checkboxes
- [ ] Links have hover states and external indicators
- [ ] Dark mode styles apply correctly
- [ ] Responsive breakpoints work (mobile/desktop)
- [ ] Print styles apply when printing

**Test Locations:**
- Post content with markdown
- Comment threads with code snippets
- Agent descriptions with tables
- Any component using `.markdown-content` class

### FR-004: Tailwind Integration Compatibility
**Priority:** High
**ID:** FR-004

**Description:**
The `markdown.css` file uses Tailwind's `@apply` directive extensively, requiring Tailwind to be available when processing the imported stylesheet.

**Acceptance Criteria:**
- [ ] All `@apply` directives in markdown.css resolve correctly
- [ ] Tailwind utility classes are available to imported stylesheet
- [ ] No undefined utility class errors
- [ ] Dark mode variants (`dark:` prefix) work correctly
- [ ] Responsive variants (`md:`, `lg:` etc.) work correctly
- [ ] Custom Tailwind theme values are accessible

**Critical Dependencies:**
```css
/* markdown.css uses these throughout: */
@apply text-gray-900 dark:text-gray-100;
@apply border-gray-200 dark:border-gray-700;
@apply hover:text-blue-800 dark:hover:text-blue-300;
```

---

## 3. Non-Functional Requirements

### NFR-001: CSS Processing Performance
**Category:** Performance
**ID:** NFR-001

**Description:**
CSS processing and bundling MUST not introduce significant build time increases.

**Metrics:**
- Build time increase: < 5% compared to current build
- CSS bundle size: No change expected
- PostCSS processing: Same number of passes

**Measurement:**
```bash
time npm run build
```

### NFR-002: Browser Compatibility
**Category:** Compatibility
**ID:** NFR-002

**Description:**
The corrected CSS import order MUST maintain compatibility with all supported browsers.

**Requirements:**
- [ ] No browser-specific CSS parsing issues
- [ ] Same CSS output as current working state
- [ ] No additional vendor prefixes required
- [ ] CSS cascade order preserved

**Supported Browsers:**
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### NFR-003: Maintainability
**Category:** Code Quality
**ID:** NFR-003

**Description:**
The CSS file structure MUST be clear and maintainable with proper documentation.

**Requirements:**
- [ ] Clear comments explaining import order requirement
- [ ] Documentation reference to CSS specification
- [ ] Warning against moving @import statements
- [ ] Section markers for file organization

**Documentation Standard:**
```css
/**
 * CRITICAL: CSS Import Order
 *
 * Per CSS specification, @import rules MUST appear before all other
 * CSS statements (except @charset). Moving @import below @tailwind
 * will cause Vite build failures.
 *
 * Reference: https://www.w3.org/TR/css-cascade-3/#at-import
 */
@import './styles/markdown.css';

/* Tailwind Directives */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### NFR-004: Zero Visual Regression
**Category:** User Experience
**ID:** NFR-004

**Description:**
The fix MUST produce identical visual output to the intended design.

**Requirements:**
- [ ] No visual changes to rendered markdown
- [ ] Same computed styles for all elements
- [ ] Identical dark mode appearance
- [ ] Same responsive behavior

**Validation Method:**
- Visual regression testing
- Before/after screenshot comparison
- Computed style comparison in DevTools

### NFR-005: Development Workflow Compatibility
**Category:** Developer Experience
**ID:** NFR-005

**Description:**
Hot module replacement (HMR) and development server MUST continue to work seamlessly.

**Requirements:**
- [ ] CSS changes trigger HMR correctly
- [ ] No full page reload required for style changes
- [ ] Development server starts without errors
- [ ] File watching works correctly

---

## 4. Constraints and Boundaries

### 4.1 Technical Constraints

**CSS Specification Compliance:**
- MUST follow W3C CSS specification for @-rule ordering
- CANNOT violate CSS parsing rules
- MUST maintain valid CSS syntax

**Vite Build System:**
- MUST work with current Vite version
- CANNOT require Vite configuration changes
- MUST be compatible with PostCSS pipeline

**Tailwind CSS Integration:**
- `markdown.css` REQUIRES Tailwind utilities to be available
- `@apply` directives REQUIRE Tailwind to be processed
- Dark mode variants REQUIRE Tailwind's dark mode support

### 4.2 File Constraints

**Cannot Modify:**
- `/workspaces/agent-feed/frontend/src/styles/markdown.css` (except if optimization needed)
- Tailwind configuration
- Vite configuration (unless absolutely required)
- PostCSS configuration

**Must Modify:**
- `/workspaces/agent-feed/frontend/src/index.css` ONLY

### 4.3 Scope Boundaries

**In Scope:**
- Correcting CSS import order in `index.css`
- Validating build success
- Verifying style loading
- Documentation of fix

**Out of Scope:**
- Refactoring markdown.css structure
- Optimizing CSS bundle size
- Adding new markdown features
- Changing Tailwind configuration
- Modifying other CSS files in the project

### 4.4 Compatibility Constraints

**Browser Support:**
- Must support same browsers as current application
- No browser-specific hacks or workarounds
- Standard CSS only

**Framework Compatibility:**
- React 18.x
- Vite 5.x
- Tailwind CSS 3.x
- PostCSS 8.x

---

## 5. Solution Design

### 5.1 Proposed Solution

**File:** `/workspaces/agent-feed/frontend/src/index.css`

**Change Required:**
Move line 6 (`@import './styles/markdown.css';`) to line 1 (before all `@tailwind` directives).

**Implementation:**
```css
/* BEFORE (INCORRECT): */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import Markdown Styling */
@import './styles/markdown.css';

/* AFTER (CORRECT): */
/* Import Markdown Styling */
@import './styles/markdown.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5.2 CSS Processing Flow

**Current (Broken) Flow:**
1. Vite reads `index.css`
2. PostCSS processes `@tailwind base` → Generates base styles
3. PostCSS processes `@tailwind components` → Generates component classes
4. PostCSS processes `@tailwind utilities` → Generates utility classes
5. CSS parser encounters `@import` → **ERROR: @import after other rules**
6. Build fails

**Corrected Flow:**
1. Vite reads `index.css`
2. CSS parser encounters `@import` → Loads `markdown.css`
3. PostCSS processes imported `markdown.css` (contains `@apply` directives)
4. PostCSS processes `@tailwind base` → Makes Tailwind utilities available
5. PostCSS processes `@tailwind components`
6. PostCSS processes `@tailwind utilities`
7. All styles resolve correctly, build succeeds

### 5.3 Why This Order Works

**Critical Understanding:**
- `@import` MUST come first (CSS spec requirement)
- `markdown.css` contains `@apply` directives that NEED Tailwind
- PostCSS processes files in order but resolves `@apply` lazily
- Tailwind makes utilities available globally once processed
- The `@apply` directives in imported file resolve against Tailwind's later definitions

**PostCSS Resolution:**
```
Parse Phase:          @import markdown.css (read file content)
                     ↓
                     @tailwind base (register utilities)
                     @tailwind components
                     @tailwind utilities
                     ↓
Resolution Phase:     Resolve @apply in markdown.css content
                     (utilities now available from @tailwind)
```

---

## 6. Testing Requirements

### 6.1 Unit Tests

**Test ID:** UT-001
**Component:** CSS Import Order Validation

**Test Case:**
```javascript
describe('CSS Import Order', () => {
  it('should have @import before @tailwind directives', () => {
    const cssContent = fs.readFileSync('src/index.css', 'utf8');
    const lines = cssContent.split('\n');

    const importIndex = lines.findIndex(line => line.includes('@import'));
    const tailwindIndex = lines.findIndex(line => line.includes('@tailwind'));

    expect(importIndex).toBeLessThan(tailwindIndex);
  });
});
```

### 6.2 Integration Tests

**Test ID:** IT-001
**Component:** Vite Build Process

**Test Steps:**
1. Clean build directory: `rm -rf dist/`
2. Run build: `npm run build`
3. Verify exit code: `echo $?` equals 0
4. Verify CSS bundle exists: `ls dist/assets/*.css`
5. Verify no error messages in output

**Expected Result:**
- Build completes successfully
- CSS bundle generated in `dist/assets/`
- No console errors

---

**Test ID:** IT-002
**Component:** Development Server

**Test Steps:**
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Open DevTools console
4. Check for CSS errors

**Expected Result:**
- Server starts without errors
- No CSS parsing errors in console
- Hot reload works for CSS changes

### 6.3 Visual Regression Tests

**Test ID:** VRT-001
**Component:** Markdown Rendering

**Test Locations:**
- `/feed` - Posts with markdown content
- `/agents` - Agent descriptions with markdown
- Comment threads with code blocks

**Test Steps:**
1. Navigate to test location
2. Inspect element with class `.markdown-content`
3. Verify computed styles match specification

**Verification Checklist:**
- [ ] h1 has `border-bottom: 2px solid`
- [ ] h2 has `border-bottom: 1px solid`
- [ ] Code blocks have `background: rgb(17, 24, 39)` (gray-900)
- [ ] Blockquotes have `border-left: 4px solid rgb(59, 130, 246)` (blue-500)
- [ ] Tables have `border: 1px solid`
- [ ] Links have `color: rgb(37, 99, 235)` (blue-600)
- [ ] Task checkboxes render with custom styling

---

**Test ID:** VRT-002
**Component:** Dark Mode Markdown

**Test Steps:**
1. Enable dark mode in application
2. Navigate to page with markdown content
3. Verify dark mode styles apply

**Verification Checklist:**
- [ ] Background colors use dark variants
- [ ] Text uses light colors (`text-gray-100`)
- [ ] Borders use dark variants (`border-gray-700`)
- [ ] Code blocks maintain readability
- [ ] Syntax highlighting colors appropriate for dark theme

### 6.4 Browser Compatibility Tests

**Test ID:** BCT-001
**Component:** Cross-Browser CSS Rendering

**Test Matrix:**

| Browser | Version | Test | Expected |
|---------|---------|------|----------|
| Chrome | Latest | Markdown rendering | All styles apply |
| Firefox | Latest | Markdown rendering | All styles apply |
| Safari | Latest | Markdown rendering | All styles apply |
| Edge | Latest | Markdown rendering | All styles apply |
| iOS Safari | Latest | Markdown rendering | All styles apply |
| Chrome Mobile | Latest | Markdown rendering | All styles apply |

### 6.5 Performance Tests

**Test ID:** PT-001
**Component:** Build Performance

**Metrics to Measure:**
```bash
# Baseline (current broken state - if it built)
time npm run build

# After fix
time npm run build

# Comparison
- Total build time should be +/- 5%
- CSS processing time should be unchanged
- Bundle size should be identical
```

### 6.6 Acceptance Tests

**Test ID:** AT-001
**Component:** End-to-End Markdown Rendering

**Scenario:** User creates post with comprehensive markdown

**Test Data:**
```markdown
# Heading 1
## Heading 2
**Bold text** and *italic text*

- List item 1
- List item 2

`inline code` and:

```javascript
function test() {
  console.log('code block');
}
```

> Blockquote text

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

[Link text](https://example.com)

- [ ] Task item unchecked
- [x] Task item checked
```

**Expected Result:**
- All markdown elements render with proper styling
- Syntax highlighting appears in code block
- Table borders and hover effects work
- Task checkboxes are interactive
- Links are clickable with proper styling

---

## 7. Success Criteria

### 7.1 Build Success Criteria

**Critical (Must Pass):**
- [ ] `npm run build` exits with code 0
- [ ] No `[vite:css]` errors in build output
- [ ] CSS bundle generated in `dist/assets/`
- [ ] Bundle size within 5% of expected size

**High Priority (Should Pass):**
- [ ] Build time within 5% of baseline
- [ ] No PostCSS warnings
- [ ] Source maps generated correctly

### 7.2 Functionality Success Criteria

**Critical (Must Pass):**
- [ ] All markdown styles load correctly
- [ ] Dark mode markdown styles work
- [ ] Code syntax highlighting appears
- [ ] Table styling renders properly
- [ ] Blockquote left borders visible

**High Priority (Should Pass):**
- [ ] Task list checkboxes interactive
- [ ] Link hover effects work
- [ ] External link indicators appear
- [ ] Image borders and shadows render
- [ ] Responsive styles apply on mobile

### 7.3 Quality Success Criteria

**Code Quality:**
- [ ] CSS validates against W3C specification
- [ ] Comments explain import order requirement
- [ ] No linting errors
- [ ] Documentation updated

**Maintainability:**
- [ ] Clear structure for future developers
- [ ] Warning comments about @import positioning
- [ ] Reference to CSS specification included

### 7.4 Regression Prevention Criteria

**Zero Regressions:**
- [ ] No visual changes to existing markdown
- [ ] No changes to non-markdown styles
- [ ] Same computed styles as intended design
- [ ] No new browser console warnings

**Performance:**
- [ ] HMR continues to work in development
- [ ] No increase in development server startup time
- [ ] CSS changes still trigger fast refresh

---

## 8. Implementation Checklist

### 8.1 Pre-Implementation

- [ ] Read and understand CSS specification for @import
- [ ] Review current `index.css` file structure
- [ ] Document current build error
- [ ] Capture baseline metrics (build time, bundle size)
- [ ] Create before screenshots of markdown rendering

### 8.2 Implementation Steps

**Step 1: Backup Current File**
```bash
cp /workspaces/agent-feed/frontend/src/index.css /workspaces/agent-feed/frontend/src/index.css.backup
```

**Step 2: Edit File**
- [ ] Open `/workspaces/agent-feed/frontend/src/index.css`
- [ ] Move line 6 (`@import './styles/markdown.css';`) to line 1
- [ ] Move comment "/* Import Markdown Styling */" to line 1
- [ ] Ensure blank line between import and tailwind directives
- [ ] Add documentation comment explaining order requirement

**Step 3: Add Documentation**
```css
/**
 * CSS Import Order - Critical Requirement
 *
 * Per W3C CSS Specification, @import rules MUST precede all other statements
 * except @charset. Do NOT move @import below @tailwind directives.
 *
 * Reference: https://www.w3.org/TR/css-cascade-3/#at-import
 */
```

### 8.3 Testing Steps

**Build Testing:**
- [ ] Run `npm run build` and verify success
- [ ] Check build output for errors
- [ ] Verify CSS bundle created
- [ ] Compare bundle size to baseline

**Development Testing:**
- [ ] Start development server: `npm run dev`
- [ ] Verify server starts without errors
- [ ] Test HMR by editing CSS
- [ ] Check browser console for errors

**Visual Testing:**
- [ ] Navigate to feed with markdown posts
- [ ] Verify all markdown styles render
- [ ] Test dark mode markdown
- [ ] Check responsive layout on mobile
- [ ] Verify code syntax highlighting

**Cross-Browser Testing:**
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test on mobile devices

### 8.4 Post-Implementation

- [ ] Remove backup file if all tests pass
- [ ] Document fix in changelog
- [ ] Update any related documentation
- [ ] Commit with descriptive message
- [ ] Deploy to staging environment
- [ ] Verify in production environment

---

## 9. Edge Cases and Scenarios

### 9.1 Multiple @import Statements

**Scenario:** What if we need to import multiple CSS files?

**Solution:**
```css
/* All @import statements MUST come first */
@import './styles/markdown.css';
@import './styles/custom-theme.css';
@import './styles/utilities.css';

/* Then Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Rule:** ALL @import statements before ANY other rules.

### 9.2 Comments and @import

**Scenario:** Can comments appear before @import?

**Solution:**
```css
/* YES - Comments can appear anywhere */
/**
 * Project styles
 */
@import './styles/markdown.css';

/* Comments between imports are fine */
@import './styles/theme.css';

/* Tailwind directives */
@tailwind base;
```

**Rule:** Comments do not affect @-rule ordering.

### 9.3 @charset with @import

**Scenario:** What if we need @charset?

**Solution:**
```css
@charset "UTF-8";  /* ONLY @charset can precede @import */
@import './styles/markdown.css';
@tailwind base;
```

**Rule:** Order is: @charset → @import → all other rules.

### 9.4 Conditional Imports

**Scenario:** Can we use media queries with @import?

**Solution:**
```css
/* Conditional imports are valid CSS */
@import './styles/markdown.css';
@import './styles/print.css' print;
@import './styles/mobile.css' (max-width: 768px);

@tailwind base;
```

**Rule:** Conditional @import still must precede other rules.

### 9.5 Future-Proofing

**Scenario:** How to prevent this issue in the future?

**Solutions:**

1. **Linting Rule:**
```json
// .stylelintrc.json
{
  "rules": {
    "no-invalid-position-at-import-rule": true
  }
}
```

2. **Pre-commit Hook:**
```bash
# .git/hooks/pre-commit
grep -n "@import" frontend/src/index.css | while read line; do
  line_num=$(echo $line | cut -d: -f1)
  tailwind_line=$(grep -n "@tailwind" frontend/src/index.css | head -1 | cut -d: -f1)
  if [ $line_num -gt $tailwind_line ]; then
    echo "ERROR: @import after @tailwind in index.css"
    exit 1
  fi
done
```

3. **Documentation:**
- Add warning comment in CSS file
- Document in README
- Add to style guide

---

## 10. Risk Analysis

### 10.1 Implementation Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Build still fails | High | Low | Test build before committing |
| Visual regression | Medium | Low | Visual testing before deploy |
| Performance impact | Low | Very Low | Measure build time |
| Browser compatibility | Low | Very Low | Same CSS output as intended |
| Breaking HMR | Medium | Very Low | Test in development mode |

### 10.2 Deployment Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Production build fails | Critical | Very Low | CI/CD pipeline testing |
| Styles missing in prod | High | Very Low | Staging environment testing |
| CDN cache issues | Low | Low | Cache busting with file hashes |
| Rollback required | Medium | Very Low | Keep backup, test thoroughly |

### 10.3 Long-Term Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Future developer moves @import | Medium | Medium | Comments + linting |
| New imports added incorrectly | Medium | Medium | Documentation + examples |
| Tailwind upgrade breaks order | Low | Low | Test after upgrades |
| PostCSS config changes | Low | Low | Document dependencies |

---

## 11. Dependencies and Prerequisites

### 11.1 Required Knowledge

**CSS Specifications:**
- W3C CSS Cascading and Inheritance Level 3
- CSS @-rule ordering requirements
- PostCSS processing pipeline

**Build Tools:**
- Vite bundler
- PostCSS plugins
- Tailwind CSS processing

### 11.2 Required Tools

**Development:**
- Node.js (version from package.json)
- npm or yarn
- Text editor with CSS support

**Testing:**
- Modern browsers for visual testing
- DevTools for style inspection
- Build tools for integration testing

### 11.3 Required Access

- Read/write access to `/workspaces/agent-feed/frontend/src/index.css`
- Ability to run build commands
- Access to development server

---

## 12. Documentation Updates Required

### 12.1 Code Documentation

**File:** `/workspaces/agent-feed/frontend/src/index.css`

Add header comment:
```css
/**
 * Main Stylesheet - Agent Feed Frontend
 *
 * CRITICAL: CSS Import Order
 * -------------------------
 * Per W3C CSS Specification (https://www.w3.org/TR/css-cascade-3/#at-import),
 * @import rules MUST precede all other CSS statements except @charset.
 *
 * The @import statement below loads markdown styling that uses Tailwind's
 * @apply directive. While @import must come first per CSS spec, PostCSS
 * resolves @apply directives lazily, allowing them to reference utilities
 * defined later by @tailwind directives.
 *
 * DO NOT MOVE @import BELOW @tailwind - this will cause build failures:
 * [vite:css] @import must precede all other statements
 */
```

### 12.2 Technical Documentation

Create or update:
- `/workspaces/agent-feed/docs/STYLING-GUIDE.md` - Add CSS import order section
- `/workspaces/agent-feed/frontend/README.md` - Add common pitfalls section
- `/workspaces/agent-feed/CONTRIBUTING.md` - Add CSS guidelines

### 12.3 Developer Onboarding

Add to onboarding checklist:
- [ ] Review CSS import order requirements
- [ ] Understand @import vs @tailwind positioning
- [ ] Know how to verify build success

---

## 13. Validation Checklist

### 13.1 Specification Validation

- [ ] Solution addresses root cause (CSS import order)
- [ ] All functional requirements covered
- [ ] All non-functional requirements defined
- [ ] Constraints documented
- [ ] Edge cases considered
- [ ] Risks identified and mitigated

### 13.2 Technical Validation

- [ ] CSS syntax correctness verified
- [ ] Tailwind integration preserved
- [ ] Build process compatibility confirmed
- [ ] Browser compatibility maintained
- [ ] Performance impact assessed

### 13.3 Testing Validation

- [ ] Unit tests defined
- [ ] Integration tests defined
- [ ] Visual regression tests defined
- [ ] Performance tests defined
- [ ] Acceptance criteria clear

### 13.4 Documentation Validation

- [ ] Implementation steps clear
- [ ] Success criteria measurable
- [ ] Risk mitigation strategies defined
- [ ] Future prevention measures documented

---

## 14. Appendices

### Appendix A: CSS Specification References

**W3C CSS Cascading and Inheritance Level 3:**
- URL: https://www.w3.org/TR/css-cascade-3/
- Section 3.3: @import
- Quote: "The '@import' rule allows users to import style rules from other style sheets. Any @import rules must precede all other at-rules and rule sets in a style sheet."

**MDN Web Docs:**
- URL: https://developer.mozilla.org/en-US/docs/Web/CSS/@import
- Quote: "The @import rule must be at the top of the stylesheet, before any other rules (with the exception of @charset and @layer rules)."

### Appendix B: Related Files

**Primary Files:**
- `/workspaces/agent-feed/frontend/src/index.css` (File to modify)
- `/workspaces/agent-feed/frontend/src/styles/markdown.css` (Imported file)

**Configuration Files:**
- `/workspaces/agent-feed/frontend/vite.config.ts` (Build configuration)
- `/workspaces/agent-feed/frontend/tailwind.config.js` (Tailwind settings)
- `/workspaces/agent-feed/frontend/postcss.config.js` (PostCSS plugins)

**Other CSS Files (for reference):**
- `/workspaces/agent-feed/frontend/src/styles/agents.css`
- `/workspaces/agent-feed/frontend/src/styles/comments.css`
- `/workspaces/agent-feed/frontend/src/styles/mobile-responsive.css`
- `/workspaces/agent-feed/frontend/src/styles/terminal-responsive.css`

### Appendix C: Error Messages

**Current Error:**
```
[vite:css] @import must precede all other statements (except @charset)

file: /workspaces/agent-feed/frontend/src/index.css:6:0
```

**After Fix (Expected):**
```
No errors - build successful
```

### Appendix D: Visual Examples

**Expected Markdown Rendering:**

```
Heading 1
─────────────────────  ← 2px border bottom

Heading 2
─────────────────────  ← 1px border bottom

Regular paragraph text in gray-700

**Bold text** in gray-900

`inline code` with pink background

┌────────────────────────┐
│ function example() {   │  ← Dark background code block
│   return true;         │    with syntax highlighting
│ }                      │
└────────────────────────┘

│ Blockquote text       ← Blue left border (4px)
│ with light blue bg

╔════════╦════════╗
║ Header │ Header ║      ← Table with borders
╠════════╪════════╣        and hover effects
║ Data   │ Data   ║
╚════════╧════════╝

☐ Unchecked task         ← Custom checkboxes
☑ Checked task

Link text ↗               ← Blue underline + external indicator
```

---

## 15. Glossary

**@import:** CSS at-rule that imports style rules from other stylesheets.

**@tailwind:** Tailwind CSS directive that injects base, component, or utility styles.

**@apply:** Tailwind CSS directive that applies utility classes within CSS rules.

**PostCSS:** Tool for transforming CSS with JavaScript plugins.

**Vite:** Fast build tool and development server for modern web projects.

**HMR (Hot Module Replacement):** Development feature that updates modules without full page reload.

**CSS Cascade:** Algorithm determining which CSS rules apply when multiple rules target same element.

**At-rule:** CSS statement beginning with @ symbol, providing metadata or conditional instructions.

---

## Document Approval

**Author:** SPARC Specification Agent
**Date:** 2025-10-27
**Status:** Ready for Implementation

**Next Steps:**
1. Review specification with development team
2. Approve specification
3. Proceed to Pseudocode phase (SPARC methodology)
4. Implement solution
5. Execute test plan
6. Deploy to production

---

**End of Specification Document**
