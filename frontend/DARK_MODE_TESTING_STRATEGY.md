# Dark Mode Testing Strategy

**Project:** Agent Feed Frontend
**Feature:** Dark Mode Implementation
**Date:** October 9, 2025
**Status:** Production Ready Testing Phase

---

## Executive Summary

This document provides a comprehensive testing strategy for the dark mode implementation across the Agent Feed frontend application. The implementation includes automatic system preference detection, 435+ dark mode variant classes, and a hook-based architecture.

### Implementation Overview
- **Architecture:** Hook-based with `useDarkMode()`
- **Detection:** Automatic via `matchMedia('prefers-color-scheme: dark')`
- **Coverage:** 39 component files with dark: variants
- **Test File:** `MarkdownRenderer.dark-mode.test.tsx` (existing, comprehensive)
- **Dark Mode Classes:** 435+ instances across components
- **Tailwind Config:** Class-based strategy enabled

---

## 1. Test Execution Plan

### 1.1 Unit Test Execution

#### Existing Test Suite
**File:** `/workspaces/agent-feed/frontend/src/tests/MarkdownRenderer.dark-mode.test.tsx`

**Test Coverage:**
- ✅ Paragraph text colors (light/dark)
- ✅ Heading text colors (h1-h6)
- ✅ List text colors (ul/ol)
- ✅ Blockquote colors and backgrounds
- ✅ Table headers and cells
- ✅ Link colors
- ✅ Inline code colors
- ✅ Bold text colors
- ✅ Strikethrough colors
- ✅ Complex markdown integration
- ✅ Edge cases and nested elements
- ✅ Accessibility contrast validation
- ✅ Prose class removal verification

**Execute Commands:**
```bash
# Run dark mode specific tests
npm run test -- MarkdownRenderer.dark-mode.test.tsx

# Run with coverage
npm run test -- MarkdownRenderer.dark-mode.test.tsx --coverage

# Run in watch mode for development
npm run test -- MarkdownRenderer.dark-mode.test.tsx --watch

# Run with UI for interactive debugging
npm run test:ui -- MarkdownRenderer.dark-mode.test.tsx
```

#### Expected Results
- **Total Tests:** 31 test cases
- **Expected Pass Rate:** 100%
- **Coverage Target:** >90% for MarkdownRenderer component
- **Execution Time:** <5 seconds

#### Failure Handling
If tests fail:
1. Check dark mode class application in browser DevTools
2. Verify Tailwind config has `darkMode: 'class'`
3. Ensure `useDarkMode()` hook is called in App.tsx
4. Validate HTML element has `dark` class when system preference is dark

---

### 1.2 Hook Testing Plan

Create comprehensive tests for `useDarkMode()` hook:

**File to Create:** `/workspaces/agent-feed/frontend/src/tests/hooks/useDarkMode.test.tsx`

**Test Cases:**

```typescript
describe('useDarkMode Hook', () => {
  describe('Initial State Detection', () => {
    it('should add dark class when system prefers dark mode')
    it('should not add dark class when system prefers light mode')
    it('should handle undefined matchMedia gracefully')
  })

  describe('Preference Change Handling', () => {
    it('should add dark class when preference changes to dark')
    it('should remove dark class when preference changes to light')
    it('should handle rapid preference toggles')
  })

  describe('Cleanup', () => {
    it('should remove event listener on unmount')
    it('should not cause memory leaks')
  })

  describe('Edge Cases', () => {
    it('should work in SSR environment (window undefined)')
    it('should handle browser without matchMedia support')
  })
})

describe('isDarkMode Utility', () => {
  it('should return true when dark class exists')
  it('should return false when dark class does not exist')
  it('should return false in SSR environment')
})

describe('toggleDarkMode Utility', () => {
  it('should add dark class when not present')
  it('should remove dark class when present')
  it('should not error in SSR environment')
})
```

**Execution:**
```bash
npm run test -- useDarkMode.test.tsx
```

---

### 1.3 Integration Testing Plan

Test dark mode across component interactions:

**File to Create:** `/workspaces/agent-feed/frontend/src/tests/integration/dark-mode-integration.test.tsx`

**Test Scenarios:**

```typescript
describe('Dark Mode Integration', () => {
  describe('Component Hierarchy', () => {
    it('should propagate dark mode to all child components')
    it('should maintain dark mode state across route changes')
    it('should apply dark mode to dynamically loaded components')
  })

  describe('UI Components', () => {
    it('should apply dark mode to Alert components')
    it('should apply dark mode to Input components')
    it('should apply dark mode to Select components')
    it('should apply dark mode to Textarea components')
    it('should apply dark mode to Progress components')
    it('should apply dark mode to Checkbox components')
  })

  describe('Dynamic Pages', () => {
    it('should render Checklist in dark mode')
    it('should render PhotoGrid in dark mode')
    it('should render Calendar in dark mode')
    it('should render SwipeCard in dark mode')
    it('should render Sidebar in dark mode')
    it('should render MarkdownRenderer in dark mode')
  })

  describe('Chat Interfaces', () => {
    it('should apply dark mode to AviChatInterface')
    it('should apply dark mode to EnhancedChatInterface')
    it('should apply dark mode to ImageUploadZone')
  })
})
```

---

## 2. Manual Testing Checklist

### 2.1 Visual Verification Checklist

#### System Preference Testing
- [ ] **Light Mode Default**
  - [ ] Set OS to light mode
  - [ ] Open application
  - [ ] Verify light color scheme is applied
  - [ ] Check all text is readable (dark text on light background)

- [ ] **Dark Mode Default**
  - [ ] Set OS to dark mode
  - [ ] Open application
  - [ ] Verify dark color scheme is applied
  - [ ] Check all text is readable (light text on dark background)

- [ ] **Runtime Toggle**
  - [ ] Start application in light mode
  - [ ] Change OS setting to dark mode while app is running
  - [ ] Verify immediate theme change without refresh
  - [ ] Change back to light mode
  - [ ] Verify immediate theme change

#### Component Visual Testing
- [ ] **Typography Elements**
  - [ ] Headings (h1-h6) have correct contrast
  - [ ] Paragraphs are readable
  - [ ] Links are visible and distinguishable
  - [ ] Code blocks have appropriate syntax highlighting
  - [ ] Inline code has proper background/text color

- [ ] **Interactive Elements**
  - [ ] Buttons have clear hover states
  - [ ] Input fields have visible borders
  - [ ] Checkboxes are clearly visible
  - [ ] Dropdown menus are readable
  - [ ] Alert/notification colors are appropriate

- [ ] **Layout Elements**
  - [ ] Cards have proper background colors
  - [ ] Borders are visible but not harsh
  - [ ] Shadows work in dark mode (lighter, not darker)
  - [ ] Dividers/separators are visible

- [ ] **Dynamic Page Components**
  - [ ] Markdown content renders correctly
  - [ ] Tables have alternating row colors (if applicable)
  - [ ] Blockquotes have distinct styling
  - [ ] Lists (ordered/unordered) are readable
  - [ ] Calendar component shows proper date highlighting
  - [ ] Photo grid images have proper borders/shadows
  - [ ] Checklist items have clear checkboxes
  - [ ] Sidebar navigation is readable

- [ ] **Chat Interfaces**
  - [ ] Message bubbles have distinct colors
  - [ ] User vs. Agent messages are distinguishable
  - [ ] Timestamps are readable
  - [ ] Input area is clearly visible
  - [ ] Code snippets in messages render properly

#### Edge Case Visual Testing
- [ ] Empty states have proper styling
- [ ] Loading states are visible
- [ ] Error states are clearly visible (red tones)
- [ ] Success states are visible (green tones)
- [ ] Disabled states have reduced opacity/different color
- [ ] Focus states are visible (keyboard navigation)

---

### 2.2 Interaction Testing Checklist

- [ ] **Form Interactions**
  - [ ] All input fields are accessible in dark mode
  - [ ] Placeholder text is visible but not too bright
  - [ ] Error messages are readable
  - [ ] Success messages are readable
  - [ ] Form validation states are clear

- [ ] **Navigation**
  - [ ] Active route is clearly highlighted
  - [ ] Hover states on navigation items
  - [ ] Breadcrumbs are visible

- [ ] **Modals/Dialogs**
  - [ ] Modal overlays have appropriate darkness
  - [ ] Modal content is readable
  - [ ] Close buttons are visible
  - [ ] Modal borders/shadows work correctly

- [ ] **Tooltips/Popovers**
  - [ ] Tooltips have contrasting background
  - [ ] Tooltip text is readable
  - [ ] Tooltip arrows/pointers are styled

---

### 2.3 Performance Testing Checklist

- [ ] **Initial Load**
  - [ ] Dark mode detection doesn't delay initial render
  - [ ] No flash of unstyled content (FOUC)
  - [ ] No flash of wrong theme

- [ ] **Theme Toggle Performance**
  - [ ] Theme change is instantaneous (<100ms perceived)
  - [ ] No layout shift during theme change
  - [ ] Smooth transition (if transitions are enabled)

- [ ] **Memory Testing**
  - [ ] No memory leaks from event listeners
  - [ ] matchMedia listener properly cleaned up
  - [ ] Component unmounting doesn't cause errors

---

## 3. Browser Compatibility Test Matrix

### 3.1 Desktop Browser Testing

| Browser | Version | Light Mode | Dark Mode | Auto-Detect | Runtime Toggle | Priority |
|---------|---------|------------|-----------|-------------|----------------|----------|
| **Chrome** | Latest | ⬜ | ⬜ | ⬜ | ⬜ | Critical |
| Chrome | Latest-1 | ⬜ | ⬜ | ⬜ | ⬜ | High |
| **Firefox** | Latest | ⬜ | ⬜ | ⬜ | ⬜ | Critical |
| Firefox | ESR | ⬜ | ⬜ | ⬜ | ⬜ | Medium |
| **Safari** | Latest (macOS) | ⬜ | ⬜ | ⬜ | ⬜ | Critical |
| Safari | Latest-1 | ⬜ | ⬜ | ⬜ | ⬜ | High |
| **Edge** | Latest | ⬜ | ⬜ | ⬜ | ⬜ | High |
| Opera | Latest | ⬜ | ⬜ | ⬜ | ⬜ | Low |
| Brave | Latest | ⬜ | ⬜ | ⬜ | ⬜ | Medium |

### 3.2 Mobile Browser Testing

| Device | Browser | Version | Light Mode | Dark Mode | Auto-Detect | Priority |
|--------|---------|---------|------------|-----------|-------------|----------|
| **iPhone 14** | Safari | iOS 17 | ⬜ | ⬜ | ⬜ | Critical |
| iPhone 13 | Safari | iOS 16 | ⬜ | ⬜ | ⬜ | High |
| **iPad Pro** | Safari | iPadOS 17 | ⬜ | ⬜ | ⬜ | High |
| **Pixel 7** | Chrome | Android 14 | ⬜ | ⬜ | ⬜ | Critical |
| Samsung S23 | Samsung Internet | Latest | ⬜ | ⬜ | ⬜ | Medium |
| **Generic Android** | Chrome | Android 13 | ⬜ | ⬜ | ⬜ | High |

### 3.3 Browser Feature Detection

Test across browsers for:

- [ ] **matchMedia API Support**
  - [ ] Chrome: API available and functional
  - [ ] Firefox: API available and functional
  - [ ] Safari: API available and functional
  - [ ] Edge: API available and functional

- [ ] **prefers-color-scheme Support**
  - [ ] Chrome: Media query recognized
  - [ ] Firefox: Media query recognized
  - [ ] Safari: Media query recognized
  - [ ] Edge: Media query recognized

- [ ] **Event Listener Support**
  - [ ] Chrome: 'change' event fires
  - [ ] Firefox: 'change' event fires
  - [ ] Safari: 'change' event fires (or 'addListener' fallback)
  - [ ] Edge: 'change' event fires

### 3.4 Cross-Browser Test Commands

```bash
# Run Playwright tests across all browsers
npm run test:e2e -- --project=core-features-chrome
npm run test:e2e -- --project=core-features-firefox
npm run test:e2e -- --project=core-features-webkit

# Mobile browser testing
npm run test:e2e -- --project=mobile-chrome
npm run test:e2e -- --project=mobile-safari

# Cross-browser analytics tests
npm run test:analytics:cross-browser
```

---

## 4. Regression Test Checklist

### 4.1 Existing Functionality Verification

- [ ] **Light Mode Unchanged**
  - [ ] All components work exactly as before in light mode
  - [ ] No color regressions in light mode
  - [ ] No layout shifts introduced

- [ ] **Component Props**
  - [ ] Components accept same props as before
  - [ ] No breaking changes to component APIs
  - [ ] Optional className props still work

- [ ] **CSS Specificity**
  - [ ] Dark mode classes don't override custom classes
  - [ ] Utility class order is correct (dark: variants last)
  - [ ] No unintended style cascading

### 4.2 Performance Regression Tests

- [ ] **Bundle Size**
  - [ ] Measure bundle size before dark mode
  - [ ] Measure bundle size after dark mode
  - [ ] Ensure increase is <5KB (acceptable for CSS)

- [ ] **Initial Load Time**
  - [ ] Measure FCP (First Contentful Paint)
  - [ ] Measure LCP (Largest Contentful Paint)
  - [ ] Ensure no degradation >50ms

- [ ] **Runtime Performance**
  - [ ] No additional re-renders introduced
  - [ ] useEffect in useDarkMode runs only once
  - [ ] Event listener doesn't cause performance issues

### 4.3 Test Data for Regression

```bash
# Before dark mode (baseline)
npm run build
# Record: Build time, bundle size, lighthouse scores

# After dark mode
npm run build
# Compare: Build time should be similar, bundle size +3-5KB acceptable

# Run existing test suite
npm run test
# Ensure: 100% of existing tests still pass
```

### 4.4 Accessibility Regression

- [ ] **WCAG Compliance Maintained**
  - [ ] AA contrast ratios maintained in light mode
  - [ ] AA contrast ratios achieved in dark mode
  - [ ] No decrease in accessibility score

- [ ] **Screen Reader Testing**
  - [ ] Dark mode doesn't affect screen reader behavior
  - [ ] ARIA labels unchanged
  - [ ] Focus order unchanged

### 4.5 Regression Test Execution

```bash
# Run full regression suite
npm run test:e2e -- --project=regression-chrome
npm run test:e2e -- --project=regression-firefox
npm run test:e2e -- --project=regression-webkit

# Visual regression tests
npm run test:e2e -- --project=visual

# Accessibility regression
npm run test:e2e -- --project=accessibility
```

---

## 5. Performance Test Plan

### 5.1 Initial Render Performance

**Metrics to Measure:**
- Time to detect system preference
- Time to apply dark class to HTML element
- Time for first paint with correct theme

**Performance Targets:**
- System preference detection: <10ms
- Class application: <5ms
- No visible flash of wrong theme (FOUC)

**Test Script:**
```typescript
describe('Dark Mode Performance', () => {
  it('should detect preference within 10ms', async () => {
    const start = performance.now();
    // Render app
    const end = performance.now();
    expect(end - start).toBeLessThan(10);
  });

  it('should not cause layout shift', async () => {
    // Measure CLS (Cumulative Layout Shift)
    // Expect: CLS < 0.1
  });
});
```

### 5.2 Theme Toggle Performance

**Metrics to Measure:**
- Time to update DOM when preference changes
- Number of re-renders triggered
- Paint time for theme change

**Performance Targets:**
- Theme toggle response: <50ms
- Re-renders: 0 (CSS-only change)
- Paint time: <16ms (60fps)

**Manual Test:**
1. Open Chrome DevTools → Performance
2. Start recording
3. Toggle OS dark mode setting
4. Stop recording
5. Analyze: Should see single "Recalculate Style" event <50ms

### 5.3 Memory Leak Testing

**Test Cases:**
- [ ] Mount/unmount component 1000 times
- [ ] Toggle theme 1000 times
- [ ] Monitor heap size in DevTools

**Expected Results:**
- Heap size stabilizes (no continuous growth)
- Event listeners properly removed
- No detached DOM nodes

**Test Script:**
```typescript
describe('Dark Mode Memory Leaks', () => {
  it('should not leak memory on repeated mount/unmount', () => {
    for (let i = 0; i < 1000; i++) {
      const { unmount } = render(<App />);
      unmount();
    }
    // Take heap snapshot
    // Compare initial vs final heap size
    // Expect: <5% growth
  });
});
```

### 5.4 Bundle Size Impact

**Measurements:**
```bash
# Build and analyze bundle
npm run build
npx vite-bundle-visualizer

# Expected impact:
# - Dark mode hook: ~500 bytes
# - Additional CSS: ~2-3KB (compressed)
# - Total increase: <5KB
```

### 5.5 Lighthouse Performance Scores

**Run Lighthouse audits:**
- [ ] Desktop - Light Mode: Score ≥90
- [ ] Desktop - Dark Mode: Score ≥90
- [ ] Mobile - Light Mode: Score ≥85
- [ ] Mobile - Dark Mode: Score ≥85

**Metrics to Monitor:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)
- Total Blocking Time (TBT)

---

## 6. User Acceptance Criteria

### 6.1 Functional Requirements

✅ **FR-1: Automatic Detection**
- System MUST automatically detect user's OS color scheme preference
- Detection MUST occur on initial page load
- No user interaction required for initial theme

✅ **FR-2: Runtime Updates**
- System MUST respond to OS preference changes without page refresh
- Theme change MUST be instantaneous (<100ms perceived)
- No data loss or component reset when theme changes

✅ **FR-3: Consistent Styling**
- All components MUST have both light and dark mode styles
- Color contrast MUST meet WCAG AA standards (4.5:1 for text)
- No components should be invisible or unreadable in either mode

✅ **FR-4: Performance**
- Dark mode MUST NOT increase initial page load by >100ms
- Theme toggle MUST NOT cause layout shift
- Memory usage MUST NOT increase by >10MB

### 6.2 Non-Functional Requirements

✅ **NFR-1: Browser Compatibility**
- MUST work in Chrome, Firefox, Safari, Edge (latest 2 versions)
- MUST gracefully degrade in browsers without matchMedia
- MUST work on iOS Safari and Chrome Android

✅ **NFR-2: Accessibility**
- MUST maintain WCAG AA compliance in both modes
- MUST NOT affect screen reader functionality
- Focus indicators MUST be visible in both modes

✅ **NFR-3: Maintainability**
- Dark mode classes MUST follow Tailwind conventions
- Hook implementation MUST be well-documented
- New components MUST include dark mode styles (enforced by linting)

### 6.3 Acceptance Test Scenarios

#### Scenario 1: New User with Dark Mode Preference
```
GIVEN a new user with OS set to dark mode
WHEN they visit the application
THEN they should see the dark theme immediately
AND no flash of light theme should occur
AND all content should be readable
```

#### Scenario 2: User Changes Preference During Session
```
GIVEN a user with the application open in light mode
WHEN they change their OS preference to dark mode
THEN the application theme should update within 1 second
AND no content should be lost
AND the page should not reload
```

#### Scenario 3: Component Rendering in Dark Mode
```
GIVEN the application is in dark mode
WHEN a dynamic page component renders
THEN all text should be light-colored on dark backgrounds
AND all interactive elements should be clearly visible
AND no console errors should occur
```

#### Scenario 4: Browser Without Support
```
GIVEN a browser without matchMedia support
WHEN the application loads
THEN it should default to light mode
AND no JavaScript errors should occur
AND functionality should remain intact
```

### 6.4 Acceptance Criteria Verification Checklist

- [ ] **Visual Acceptance**
  - [ ] Product owner approves light mode appearance
  - [ ] Product owner approves dark mode appearance
  - [ ] Design team verifies color palette consistency
  - [ ] UX team confirms no usability regressions

- [ ] **Technical Acceptance**
  - [ ] All unit tests pass (31/31 for MarkdownRenderer)
  - [ ] All integration tests pass
  - [ ] All E2E tests pass across target browsers
  - [ ] Performance benchmarks meet targets

- [ ] **User Acceptance**
  - [ ] Beta users report positive feedback
  - [ ] No critical bugs reported
  - [ ] Accessibility audit passes
  - [ ] Analytics show expected dark mode adoption rate

---

## 7. Risk Assessment

### 7.1 High Priority Risks

#### Risk 1: Flash of Unstyled Content (FOUC)
- **Probability:** Medium
- **Impact:** High (poor user experience)
- **Mitigation:**
  - Use inline script to detect theme before React hydration
  - Set dark class before first paint
  - Test across slow 3G connections

#### Risk 2: Browser Compatibility Issues
- **Probability:** Low-Medium
- **Impact:** High (broken experience for some users)
- **Mitigation:**
  - Implement feature detection
  - Provide fallback to light mode
  - Test on actual devices, not just emulators

#### Risk 3: Contrast/Accessibility Failures
- **Probability:** Medium
- **Impact:** Critical (WCAG violation, potential legal issues)
- **Mitigation:**
  - Use automated contrast checkers
  - Manual review of all color combinations
  - Test with actual screen readers

### 7.2 Medium Priority Risks

#### Risk 4: Performance Degradation
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Benchmark before/after
  - Use CSS-only theme switching (no JS re-renders)
  - Monitor with Lighthouse CI

#### Risk 5: CSS Specificity Conflicts
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Follow Tailwind best practices
  - Use consistent class ordering
  - Test with existing custom styles

#### Risk 6: State Management Issues
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Keep dark mode state in DOM (class on html)
  - Don't duplicate in React state
  - Avoid unnecessary re-renders

### 7.3 Low Priority Risks

#### Risk 7: Incomplete Coverage
- **Probability:** Medium
- **Impact:** Low (some components missing dark styles)
- **Mitigation:**
  - Create component inventory
  - Systematic review of all pages
  - Establish linting rules for new components

#### Risk 8: Third-Party Library Conflicts
- **Probability:** Low
- **Impact:** Low
- **Mitigation:**
  - Review library documentation for dark mode support
  - Add custom overrides if needed
  - Test all third-party UI components

### 7.4 Risk Monitoring Plan

**Weekly Monitoring:**
- [ ] Review user feedback for dark mode issues
- [ ] Check analytics for dark mode adoption
- [ ] Monitor error logs for dark mode related errors

**Pre-Release Checklist:**
- [ ] All high-priority risks mitigated
- [ ] All medium-priority risks have plans
- [ ] Rollback plan documented
- [ ] Feature flag ready (if applicable)

### 7.5 Rollback Strategy

**If Critical Issues Arise:**

1. **Immediate Rollback (< 5 minutes)**
   ```bash
   # Option 1: Feature flag
   # Set DARK_MODE_ENABLED=false in environment

   # Option 2: Code revert
   git revert <dark-mode-commit>
   npm run build
   npm run deploy
   ```

2. **Partial Rollback**
   - Keep detection logic
   - Default all users to light mode
   - Allow manual toggle (if implemented)

3. **Graceful Degradation**
   - Remove dark: classes from critical components
   - Keep dark mode for less critical features
   - Fix issues incrementally

---

## 8. Test Execution Timeline

### Phase 1: Unit Testing (Day 1)
- ✅ Run existing MarkdownRenderer dark mode tests
- ⬜ Create and run useDarkMode hook tests
- ⬜ Achieve >90% coverage on dark mode code

### Phase 2: Integration Testing (Day 2)
- ⬜ Create integration test suite
- ⬜ Test all UI components in dark mode
- ⬜ Test all dynamic page components

### Phase 3: E2E Testing (Day 3)
- ⬜ Run cross-browser tests (Chrome, Firefox, Safari)
- ⬜ Run mobile browser tests
- ⬜ Visual regression testing

### Phase 4: Manual Testing (Day 4)
- ⬜ Complete visual verification checklist
- ⬜ Complete interaction testing checklist
- ⬜ Performance testing with DevTools

### Phase 5: Acceptance Testing (Day 5)
- ⬜ Stakeholder review
- ⬜ Accessibility audit
- ⬜ Final approval for production

---

## 9. Test Artifacts

### 9.1 Test Reports

**Generated Reports:**
- `/test-results/unit-junit.xml` - JUnit format for CI
- `/test-results/unit-results.json` - JSON format
- `/test-results/e2e-results.json` - E2E test results
- `/test-results/coverage/` - Code coverage reports

### 9.2 Screenshots/Videos

**Capture for Documentation:**
- Light mode: All major pages
- Dark mode: All major pages
- Theme toggle: Video recording
- Browser comparison: Side-by-side screenshots

### 9.3 Performance Reports

**Generate with:**
```bash
npm run build
npx lighthouse http://localhost:5173 --output html --output-path ./lighthouse-light.html

# Switch to dark mode in DevTools
npx lighthouse http://localhost:5173 --output html --output-path ./lighthouse-dark.html
```

---

## 10. Success Metrics

### Quantitative Metrics
- ✅ Unit test pass rate: 100%
- ✅ E2E test pass rate: >95%
- ✅ Code coverage: >85%
- ✅ WCAG AA compliance: 100%
- ✅ Performance score: >90 (Lighthouse)
- ✅ Browser compatibility: 99% of target users

### Qualitative Metrics
- ✅ No user-reported critical bugs
- ✅ Positive feedback from beta testers
- ✅ Design team approval
- ✅ Accessibility team approval

### Business Metrics
- Target: 30-40% dark mode adoption within first month
- Target: <0.1% error rate for dark mode users
- Target: No increase in support tickets

---

## 11. Appendices

### Appendix A: Component Inventory

**Components with Dark Mode Support (39 files):**
1. `dynamic-page/Checklist.tsx`
2. `dynamic-page/PhotoGrid.tsx`
3. `dynamic-page/Calendar.tsx`
4. `dynamic-page/SwipeCard.tsx`
5. `dynamic-page/Sidebar.tsx`
6. `dynamic-page/MarkdownRenderer.tsx`
7. `dynamic-page/Markdown.tsx`
8. `markdown/MermaidDiagram.tsx`
9. `ui/input.tsx`
10. `ui/select.tsx`
11. `ui/textarea.tsx`
12. `ui/progress.tsx`
13. `ui/alert.tsx`
14. `ui/checkbox.tsx`
15. `TerminalView.tsx`
16. `claude-instances/ImageUploadZone.tsx`
17. `claude-instances/InstanceStatusIndicator.tsx`
18. `claude-instances/AviChatInterface.tsx`
19. `claude-instances/ClaudeInstanceSelector.tsx`
20. `claude-instances/EnhancedChatInterface.tsx`
21. `claude-instances/ClaudeInstanceManagementDemo.tsx`
22. `avi-integration/AviChatInterface.tsx`
... (and 17 more)

### Appendix B: Color Palette Reference

**Light Mode Colors:**
- Text: `gray-900` (#111827)
- Headings: `gray-900` (#111827)
- Muted text: `gray-600` (#4B5563)
- Backgrounds: `white`, `gray-50`, `gray-100`
- Borders: `gray-200`, `gray-300`
- Links: `blue-600` (#2563EB)
- Code: `red-600` (#DC2626)

**Dark Mode Colors:**
- Text: `gray-200` (#E5E7EB)
- Headings: `gray-100` (#F3F4F6)
- Muted text: `gray-400` (#9CA3AF)
- Backgrounds: `gray-900`, `gray-800`, `gray-950`
- Borders: `gray-700`, `gray-600`
- Links: `blue-400` (#60A5FA)
- Code: `red-400` (#F87171)

### Appendix C: Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| matchMedia | ✅ 76+ | ✅ 69+ | ✅ 12.1+ | ✅ 79+ |
| prefers-color-scheme | ✅ 76+ | ✅ 67+ | ✅ 12.1+ | ✅ 79+ |
| addEventListener('change') | ✅ 76+ | ✅ 69+ | ✅ 14+ | ✅ 79+ |

### Appendix D: Useful Commands Reference

```bash
# Testing
npm run test                          # Run all unit tests
npm run test -- MarkdownRenderer      # Run specific test
npm run test:ui                       # Interactive test UI
npm run test:e2e                      # E2E tests all browsers
npm run test:e2e:ui                   # Playwright UI mode

# Development
npm run dev                           # Start dev server
npm run build                         # Production build
npm run preview                       # Preview production build

# Analysis
npx lighthouse http://localhost:5173  # Performance audit
npx vite-bundle-visualizer            # Bundle analysis

# Accessibility
npm run test:e2e -- --project=accessibility

# Browser specific
npm run test:e2e -- --project=core-features-chrome
npm run test:e2e -- --project=core-features-firefox
npm run test:e2e -- --project=core-features-webkit
```

---

## Document Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-09 | 1.0 | Initial comprehensive testing strategy | QA Team |

---

**End of Testing Strategy Document**
