# Dark Mode Testing - Quick Start Guide

⏱️ **Total Time:** 15-30 minutes for complete validation

---

## 🚀 Quick Test Commands

```bash
# Run existing dark mode tests (31 tests)
npm run test -- MarkdownRenderer.dark-mode.test.tsx

# Run new hook tests (25 tests)
npm run test -- useDarkMode.test.tsx

# Run integration tests (40 tests)
npm run test -- dark-mode-integration.test.tsx

# Run E2E tests (all browsers)
npm run test:e2e -- dark-mode-e2e.spec.ts

# Run ALL dark mode tests
npm run test -- dark-mode

# Run with coverage report
npm run test -- dark-mode --coverage

# Watch mode for development
npm run test -- dark-mode --watch
```

---

## ✅ 5-Minute Visual Verification

### Step 1: OS-Level Testing (2 minutes)
```
1. Set your OS to DARK mode
2. Open http://localhost:5173
3. Verify: Dark background, light text
4. Check: Buttons, inputs, links all visible

5. Set your OS to LIGHT mode
6. Refresh the page
7. Verify: Light background, dark text
8. Check: All components look normal
```

### Step 2: Runtime Toggle (1 minute)
```
1. Start with Light mode
2. Change OS to Dark mode (don't refresh)
3. Theme should update within 1 second
4. No errors in console
5. Toggle back to Light
6. Theme updates immediately
```

### Step 3: Component Spot Check (2 minutes)
```
✅ Headings: Light text on dark bg (or vice versa)
✅ Paragraphs: Readable contrast
✅ Links: Blue and clearly visible
✅ Buttons: Clear hover states
✅ Input fields: Visible borders
✅ Code blocks: Syntax highlighting works
✅ Tables: Border colors visible
✅ Alerts: Appropriate color scheme
```

---

## 🧪 Browser DevTools Testing

### Check Dark Mode State
Open browser console:
```javascript
// Check if dark mode is active
document.documentElement.classList.contains('dark')
// Should return: true (dark mode) or false (light mode)

// Check OS preference
window.matchMedia('(prefers-color-scheme: dark)').matches
// Should return: true (dark preference) or false (light preference)
```

### Manual Toggle (for testing)
```javascript
// Force dark mode ON
document.documentElement.classList.add('dark')

// Force dark mode OFF
document.documentElement.classList.remove('dark')

// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

### Check Colors
```javascript
// Get text color
getComputedStyle(document.querySelector('p')).color

// Get background color
getComputedStyle(document.body).backgroundColor

// Check heading color
getComputedStyle(document.querySelector('h1')).color
```

---

## 🌐 Browser Compatibility Testing

### Priority 1: Critical Browsers (Test These)
```
✅ Chrome (latest)
✅ Firefox (latest)
✅ Safari (latest, if on Mac)
```

### Priority 2: Mobile (If time permits)
```
✅ iPhone Safari
✅ Android Chrome
```

### Quick Test Per Browser:
1. Open app in browser
2. Set OS to dark mode
3. Verify dark theme loads
4. Toggle OS preference
5. Verify theme updates
6. Check for console errors

---

## 🐛 Common Issues & Quick Fixes

### Issue 1: Flash of White on Load
**Symptom:** Brief white screen when loading in dark mode
**Quick Fix:** Verify `useDarkMode()` is called in App.tsx
**Test:**
```javascript
// In browser console
performance.getEntriesByType('paint')
// First paint should already have dark class
```

### Issue 2: Some Components Stay Light
**Symptom:** Certain UI elements don't switch to dark
**Quick Fix:** Add `dark:` variants to those components
**Test:** Inspect element and check for `dark:` classes

### Issue 3: Poor Contrast
**Symptom:** Text hard to read in dark mode
**Quick Fix:** Use lighter gray values (200-400 range)
**Test:** Chrome DevTools → Elements → Accessibility → Contrast

### Issue 4: Theme Doesn't Update
**Symptom:** Theme stuck in one mode
**Quick Fix:** Check matchMedia listener is attached
**Test:**
```javascript
// Should log true/false when you toggle OS setting
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', e => console.log('Changed to:', e.matches))
```

---

## 📊 Performance Quick Check

### Bundle Size (Expected: +3-5KB)
```bash
npm run build
du -h dist/assets/*.js | sort -h
# Check that total increase is < 5KB
```

### Runtime Performance (Expected: <50ms)
```javascript
// In browser console
const start = performance.now();
document.documentElement.classList.toggle('dark');
const end = performance.now();
console.log('Toggle time:', end - start, 'ms');
// Should be < 50ms
```

### No Layout Shift
```javascript
// Before toggle
const before = document.body.getBoundingClientRect();

// Toggle theme
document.documentElement.classList.toggle('dark');

// After toggle
const after = document.body.getBoundingClientRect();

console.log('Layout shift:', {
  width: after.width - before.width,
  height: after.height - before.height
});
// Should be 0 or very close to 0
```

---

## ♿ Accessibility Quick Check

### Contrast Ratios (use Chrome DevTools)
1. Open DevTools
2. Select text element
3. Go to "Accessibility" tab
4. Check contrast ratio

**Required:**
- Normal text: ≥ 4.5:1
- Large text (18pt+): ≥ 3:1
- UI components: ≥ 3:1

### Keyboard Navigation
```
1. Tab through interactive elements
2. Check focus ring is visible in dark mode
3. Should see blue/colored outline
4. Test on buttons, inputs, links
```

### Screen Reader (Optional)
```
1. Enable screen reader (VoiceOver/NVDA)
2. Navigate through page
3. Content should be announced normally
4. Dark mode should not affect screen reader
```

---

## 📝 Test Results Checklist

```markdown
## Dark Mode Test Results

**Date:** ___________
**Tester:** ___________
**Browser:** ___________

### Unit Tests
- [ ] MarkdownRenderer: __/31 passed
- [ ] useDarkMode hook: __/25 passed
- [ ] Integration: __/40 passed
- [ ] Total: __/96 passed

### Visual Tests
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] OS toggle works
- [ ] Runtime updates work
- [ ] All components visible

### Browser Tests
- [ ] Chrome: Passed / Failed
- [ ] Firefox: Passed / Failed
- [ ] Safari: Passed / Failed

### Performance
- [ ] Toggle time < 50ms
- [ ] Bundle size < 5KB increase
- [ ] No layout shift

### Accessibility
- [ ] Contrast ratios ≥ 4.5:1
- [ ] Focus visible in dark mode
- [ ] No screen reader issues

### Issues Found
- [ ] None
- [ ] (List any issues)

### Approval
- [ ] Ready for production
- [ ] Needs fixes
```

---

## 🎨 Color Reference

### Dark Mode Colors
```css
/* Text */
text-gray-100   /* Headings - lightest */
text-gray-200   /* Body text */
text-gray-400   /* Muted text */

/* Backgrounds */
bg-gray-950     /* Darkest - code blocks */
bg-gray-900     /* Main background */
bg-gray-800     /* Secondary background */

/* Accents */
text-blue-400   /* Links */
text-red-400    /* Code/errors */
border-gray-700 /* Borders */
```

### Light Mode Colors
```css
/* Text */
text-gray-900   /* Headings & body */
text-gray-600   /* Muted text */

/* Backgrounds */
bg-white        /* Main background */
bg-gray-50      /* Secondary background */
bg-gray-100     /* Tertiary background */

/* Accents */
text-blue-600   /* Links */
text-red-600    /* Code/errors */
border-gray-200 /* Borders */
```

---

## 🚨 Emergency Rollback

If critical issues found:

```bash
# Find dark mode commits
git log --oneline | grep -i "dark mode"

# Revert the commit
git revert <commit-hash>

# Or disable via CSS
# Add to global styles:
html.dark * {
  /* Reset all dark styles */
  color: inherit !important;
  background: inherit !important;
}
```

---

## 📚 Documentation Links

- **Full Testing Strategy:** `/DARK_MODE_TESTING_STRATEGY.md`
- **Test Files:**
  - `/src/tests/MarkdownRenderer.dark-mode.test.tsx`
  - `/src/tests/hooks/useDarkMode.test.tsx`
  - `/src/tests/integration/dark-mode-integration.test.tsx`
  - `/src/tests/e2e/dark-mode-e2e.spec.ts`

- **Tailwind Docs:** https://tailwindcss.com/docs/dark-mode
- **matchMedia API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia

---

## 🎯 Success Criteria

✅ **All unit tests pass (96/96)**
✅ **Visual verification complete**
✅ **No console errors**
✅ **Performance targets met (<50ms)**
✅ **Accessibility compliant (WCAG AA)**
✅ **Cross-browser compatible**

---

**Last Updated:** 2025-10-09
**Next Review:** Before Production Deploy
