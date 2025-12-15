# Dark Mode Test Execution Checklist

Use this checklist when executing the dark mode test suite.

---

## Pre-Execution Setup

- [ ] Pull latest code from repository
- [ ] Install dependencies: `npm install`
- [ ] Build project: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Verify app loads: http://localhost:5173

---

## Test Execution

### Unit Tests (30 minutes)

#### 1. Existing MarkdownRenderer Tests (5 min)
```bash
npm run test -- MarkdownRenderer.dark-mode.test.tsx --run
```

**Expected:** ✅ 32/32 tests pass
**Current:** ✅ 32/32 PASSING
**Status:** [ ] Pass / [ ] Fail
**Notes:** _______________

#### 2. useDarkMode Hook Tests (10 min)
```bash
npm run test -- useDarkMode.test.tsx --run
```

**Expected:** ✅ 26/26 tests pass
**Current:** Not yet run
**Status:** [ ] Pass / [ ] Fail
**Failures:** _______________
**Notes:** _______________

#### 3. Coverage Report (5 min)
```bash
npm run test -- dark-mode --coverage --run
```

**Expected:** >85% coverage
**Actual:** ____%
**Status:** [ ] Pass / [ ] Fail
**Notes:** _______________

---

### Integration Tests (45 minutes)

#### 4. Component Integration (20 min)
```bash
npm run test -- dark-mode-integration.test.tsx --run
```

**Expected:** ✅ 31/31 tests pass
**Current:** Not yet run
**Status:** [ ] Pass / [ ] Fail
**Failures:** _______________
**Notes:** _______________

#### 5. UI Components Check (10 min)
Specific test groups to verify:
- [ ] Alert components
- [ ] Input/Textarea components
- [ ] Checkbox/Progress components
- [ ] Select components
- [ ] MarkdownRenderer
- [ ] Dynamic page components

**Notes:** _______________

---

### E2E Tests (60 minutes)

#### 6. Chrome E2E (15 min)
```bash
npm run test:e2e -- dark-mode-e2e.spec.ts --project=core-features-chrome
```

**Expected:** ✅ All tests pass
**Status:** [ ] Pass / [ ] Fail
**Failures:** _______________
**Screenshots:** [ ] Captured

#### 7. Firefox E2E (15 min)
```bash
npm run test:e2e -- dark-mode-e2e.spec.ts --project=core-features-firefox
```

**Expected:** ✅ All tests pass
**Status:** [ ] Pass / [ ] Fail
**Failures:** _______________
**Screenshots:** [ ] Captured

#### 8. Safari E2E (15 min)
```bash
npm run test:e2e -- dark-mode-e2e.spec.ts --project=core-features-webkit
```

**Expected:** ✅ All tests pass
**Status:** [ ] Pass / [ ] Fail
**Failures:** _______________
**Screenshots:** [ ] Captured

#### 9. Mobile Tests (15 min)
```bash
npm run test:e2e -- dark-mode-e2e.spec.ts --project=mobile-chrome
npm run test:e2e -- dark-mode-e2e.spec.ts --project=mobile-safari
```

**Expected:** ✅ All tests pass
**Status:** [ ] Pass / [ ] Fail
**Notes:** _______________

---

## Manual Testing (30 minutes)

### Visual Verification

#### 10. Light Mode Check (5 min)
- [ ] Set OS to light mode
- [ ] Refresh application
- [ ] All text is dark on light background
- [ ] Buttons are clearly visible
- [ ] Links are blue and visible
- [ ] Forms have proper borders
- [ ] No visual glitches

**Issues:** _______________

#### 11. Dark Mode Check (5 min)
- [ ] Set OS to dark mode
- [ ] Refresh application
- [ ] All text is light on dark background
- [ ] Buttons are clearly visible
- [ ] Links are blue and visible
- [ ] Forms have proper borders
- [ ] No visual glitches

**Issues:** _______________

#### 12. Runtime Toggle (5 min)
- [ ] Start in light mode
- [ ] Toggle OS to dark mode (don't refresh)
- [ ] Theme updates within 1 second
- [ ] No console errors
- [ ] Toggle back to light
- [ ] Theme updates immediately
- [ ] No data loss

**Issues:** _______________

#### 13. Component Spot Check (10 min)
Navigate through app and verify:
- [ ] Home page
- [ ] Navigation elements
- [ ] Dynamic pages (if available)
- [ ] Forms/inputs
- [ ] Buttons/CTAs
- [ ] Tables (if present)
- [ ] Code blocks
- [ ] Modals/dialogs (if present)

**Issues:** _______________

#### 14. Browser Compatibility (5 min)
Test in at least 3 browsers:
- [ ] Chrome: Works correctly
- [ ] Firefox: Works correctly
- [ ] Safari (or Edge): Works correctly

**Issues:** _______________

---

## Performance Testing (15 minutes)

#### 15. Bundle Size Check (5 min)
```bash
npm run build
du -sh dist/
ls -lh dist/assets/*.js
```

**Before dark mode:** _______
**After dark mode:** _______
**Increase:** _______
**Acceptable:** [ ] Yes (<5KB) / [ ] No

#### 16. Runtime Performance (5 min)
```javascript
// In browser console
const start = performance.now();
document.documentElement.classList.toggle('dark');
const end = performance.now();
console.log('Toggle time:', end - start, 'ms');
```

**Toggle time:** _______ ms
**Acceptable:** [ ] Yes (<50ms) / [ ] No

#### 17. Lighthouse Audit (5 min)
```bash
npx lighthouse http://localhost:5173 --output html --output-path lighthouse-report.html
```

**Light mode score:** _______ / 100
**Dark mode score:** _______ / 100
**Acceptable:** [ ] Yes (>90) / [ ] No

---

## Accessibility Testing (20 minutes)

#### 18. Contrast Ratios (10 min)
Use Chrome DevTools to check:
- [ ] Body text: ≥4.5:1 in both modes
- [ ] Headings: ≥4.5:1 in both modes
- [ ] Links: ≥4.5:1 in both modes
- [ ] Buttons: ≥3:1 in both modes
- [ ] Form elements: ≥3:1 in both modes

**Issues:** _______________

#### 19. Keyboard Navigation (5 min)
- [ ] Tab through elements in light mode
- [ ] Focus indicators visible
- [ ] Tab through elements in dark mode
- [ ] Focus indicators visible
- [ ] No keyboard traps

**Issues:** _______________

#### 20. Screen Reader (5 min) [Optional]
- [ ] Enable screen reader
- [ ] Navigate through page
- [ ] Content announced correctly
- [ ] Dark mode doesn't affect announcements

**Issues:** _______________

---

## Regression Testing (15 minutes)

#### 21. Existing Functionality (10 min)
Verify these still work in BOTH light and dark modes:
- [ ] Page navigation
- [ ] Form submissions
- [ ] Button clicks
- [ ] Modal interactions
- [ ] Data loading
- [ ] Any AJAX/API calls
- [ ] Dynamic content rendering

**Issues:** _______________

#### 22. Console Errors (5 min)
- [ ] No errors in light mode
- [ ] No errors in dark mode
- [ ] No errors when toggling
- [ ] No warnings about deprecated APIs

**Errors:** _______________

---

## Final Checks

### Documentation Review
- [ ] All test files created
- [ ] Documentation complete
- [ ] Quick start guide reviewed
- [ ] Test commands work

### Test Results Summary
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Manual tests complete
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] No regressions found

### Issues Log
**Critical Issues:** _______________
**Medium Issues:** _______________
**Minor Issues:** _______________
**Notes:** _______________

---

## Sign-Off

### Test Execution
**Executed by:** _______________
**Date:** _______________
**Duration:** _______ minutes
**Overall Status:** [ ] PASS / [ ] FAIL / [ ] BLOCKED

### Approvals Required
- [ ] QA Team Approval
- [ ] Design Team Approval
- [ ] Accessibility Team Approval
- [ ] Engineering Lead Approval

### Deployment Decision
- [ ] APPROVED for production deployment
- [ ] BLOCKED - fixes required
- [ ] DEFERRED - schedule follow-up

**Deployment Date:** _______________
**Deployed by:** _______________

---

## Notes & Comments

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

---

**Checklist Version:** 1.0
**Last Updated:** 2025-10-09
