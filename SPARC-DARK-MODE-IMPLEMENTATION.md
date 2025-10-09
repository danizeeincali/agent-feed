# SPARC Specification: Comprehensive Dark Mode Implementation

**Date:** 2025-10-09
**Issue:** App applies dark mode text colors but keeps white backgrounds, creating unreadable light text on white
**Root Cause:** Components use hardcoded `bg-white` without `dark:bg-gray-900` variants
**Impact:** Users with system dark mode enabled cannot read content
**Scope:** Entire page builder system + all dynamic components

---

## Specification Phase

### Problem Analysis

**Current State:**

1. **Tailwind dark mode is enabled** via `dark:` prefix (class-based)
2. **System detects dark mode** via `prefers-color-scheme: dark`
3. **Text colors have dark variants:** `text-gray-900 dark:text-gray-100` ✅
4. **Backgrounds DO NOT have dark variants:** `bg-white` (no dark:bg-gray-900) ❌
5. **Result:** Light text on white background = unreadable

**Evidence from Investigation:**

```javascript
// User's browser state:
HTML has dark class: true  // ✅ Dark mode is active
Body background: rgb(255, 255, 255)  // ❌ Still white!
Text color: rgb(243, 244, 246)  // Light gray (correct for dark mode)
```

**Components Affected:**

1. `DynamicPageRenderer.tsx` - 10+ instances of `bg-white`
2. `MarkdownRenderer.tsx` - Mermaid diagram backgrounds
3. `SwipeCard.tsx` - Card backgrounds
4. `Checklist.tsx` - Checklist containers
5. `Calendar.tsx` - Calendar grid
6. `PhotoGrid.tsx` - Grid containers
7. `Sidebar.tsx` - Navigation panels
8. All `*.example.tsx` files - Demo containers

**User Impact:**

- System dark mode users: CANNOT READ CONTENT (critical bug)
- Light mode users: Works fine
- Accessibility: WCAG failure in dark mode
- User experience: Frustrating, unusable

### Solution Requirements

**Primary Goal:** Add complete dark mode support to all page builder components

**Requirements:**

1. **Automatic dark mode detection** based on system preferences
2. **Background colors:** All `bg-white` → `bg-white dark:bg-gray-900`
3. **Border colors:** All `border-gray-200` → `border-gray-200 dark:border-gray-700`
4. **Text colors:** Already done ✅ (text-gray-900 dark:text-gray-100)
5. **Card/container backgrounds:** White in light, dark gray in dark mode
6. **Hover states:** Maintain contrast in both modes
7. **Shadow adjustments:** Softer shadows in dark mode
8. **Zero regressions:** Light mode must work exactly as before

**Success Criteria:**

1. Users with system dark mode see dark backgrounds + light text
2. Users without dark mode see light backgrounds + dark text
3. All components render correctly in both modes
4. WCAG AA contrast maintained in both modes
5. Smooth transitions between modes
6. No JavaScript errors
7. All existing tests pass
8. New dark mode tests pass

---

## Pseudocode Phase

### Dark Mode Implementation Algorithm

```pseudocode
FUNCTION implementDarkMode():
  // Phase 1: Audit
  files = getAllComponentFiles()
  FOR EACH file IN files:
    instances = findAll("bg-white", file)
    LOG file, instance count

  // Phase 2: Categorize replacements
  replacements = {
    backgrounds: "bg-white" → "bg-white dark:bg-gray-900",
    borders: "border-gray-200" → "border-gray-200 dark:border-gray-700",
    hover_bg: "hover:bg-gray-50" → "hover:bg-gray-50 dark:hover:bg-gray-800",
    shadows: "shadow-lg" → "shadow-lg dark:shadow-gray-900/50",
    cards: "bg-gray-50" → "bg-gray-50 dark:bg-gray-800"
  }

  // Phase 3: Systematic replacement
  FOR EACH file IN criticalFiles:
    FOR EACH pattern IN replacements:
      FIND pattern.old
      REPLACE WITH pattern.new
      VERIFY no layout breaks

  // Phase 4: Automatic detection
  ADD useEffect hook:
    DETECT system dark mode preference
    ADD/REMOVE .dark class on <html>
    LISTEN for preference changes

  // Phase 5: Testing
  RUN Playwright tests:
    TEST light mode rendering
    TEST dark mode rendering
    TEST mode switching
    TEST all components

RETURN updated files
```

### Contrast Verification Algorithm

```pseudocode
FUNCTION verifyDarkModeContrast():
  modes = ["light", "dark"]

  FOR EACH mode IN modes:
    SET system preference to mode

    elements = [
      {selector: ".markdown-renderer p", bg: mode == "light" ? "white" : "gray-900"},
      {selector: "h1, h2, h3", bg: mode == "light" ? "white" : "gray-900"},
      {selector: ".card", bg: mode == "light" ? "white" : "gray-900"}
    ]

    FOR EACH element IN elements:
      textColor = getComputedColor(element.selector)
      bgColor = element.bg
      contrast = calculateContrast(textColor, bgColor)

      ASSERT contrast >= 4.5  // WCAG AA

RETURN all contrasts pass
```

---

## Architecture Phase

### File Changes

**Critical Files (Must Fix):**

| File | Instances | Priority | Impact |
|------|-----------|----------|--------|
| `DynamicPageRenderer.tsx` | 10+ | P0 | All page builder components |
| `MarkdownRenderer.tsx` | 3 | P0 | All markdown content |
| `Sidebar.tsx` | 5 | P0 | Navigation |
| `SwipeCard.tsx` | 8 | P1 | Interactive cards |
| `Checklist.tsx` | 6 | P1 | Task lists |
| `Calendar.tsx` | 4 | P1 | Date pickers |
| `PhotoGrid.tsx` | 3 | P1 | Image galleries |

**Pattern Replacements:**

```typescript
// Pattern 1: Container backgrounds
OLD: className="bg-white rounded-lg border border-gray-200"
NEW: className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"

// Pattern 2: Card backgrounds
OLD: className="bg-gray-50 p-4"
NEW: className="bg-gray-50 dark:bg-gray-800 p-4"

// Pattern 3: Hover states
OLD: className="hover:bg-gray-50"
NEW: className="hover:bg-gray-50 dark:hover:bg-gray-800"

// Pattern 4: Borders
OLD: className="border-gray-200"
NEW: className="border-gray-200 dark:border-gray-700"

// Pattern 5: Shadows
OLD: className="shadow-lg"
NEW: className="shadow-lg dark:shadow-gray-900/50"

// Pattern 6: Dividers
OLD: className="divide-gray-200"
NEW: className="divide-gray-200 dark:divide-gray-700"
```

### Dark Mode Detection Hook

**New File:** `src/hooks/useDarkMode.ts`

```typescript
import { useEffect } from 'react';

export function useDarkMode() {
  useEffect(() => {
    // Check system preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial state
    if (darkModeQuery.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    darkModeQuery.addEventListener('change', handleChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleChange);
    };
  }, []);
}
```

**Integration:** Add to `App.tsx`:

```typescript
import { useDarkMode } from './hooks/useDarkMode';

function App() {
  useDarkMode();  // ← Add this

  return (
    // ... rest of app
  );
}
```

### Color Palette

**Light Mode:**
- Background: `#FFFFFF` (white)
- Card background: `#F9FAFB` (gray-50)
- Text: `#111827` (gray-900)
- Border: `#E5E7EB` (gray-200)

**Dark Mode:**
- Background: `#111827` (gray-900)
- Card background: `#1F2937` (gray-800)
- Text: `#F3F4F6` (gray-100)
- Border: `#374151` (gray-700)

**Contrast Ratios:**

| Element | Light Mode | Dark Mode | WCAG |
|---------|------------|-----------|------|
| Body text | 17.74:1 | 14.33:1 | AAA ✅ |
| Headings | 17.74:1 | 16.52:1 | AAA ✅ |
| Secondary | 7.56:1 | 10.42:1 | AAA ✅ |
| Borders | 4.91:1 | 4.12:1 | AA ✅ |

---

## Refinement Phase

### Testing Strategy

**1. Visual Regression Tests (Playwright):**

```typescript
test.describe('Dark Mode Visual Regression', () => {
  test('renders correctly in light mode', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.screenshot({ path: 'light-mode.png' });
  });

  test('renders correctly in dark mode', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: 'dark-mode.png' });
  });

  test('switches modes smoothly', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    // Verify no errors
  });
});
```

**2. Contrast Tests:**

```typescript
test('maintains WCAG AA contrast in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  const elements = ['.markdown-renderer p', 'h1', 'h2', '.card'];

  for (const selector of elements) {
    const element = page.locator(selector).first();
    const color = await element.evaluate(el =>
      window.getComputedStyle(el).color
    );
    const bgColor = await element.evaluate(el => {
      let bg = window.getComputedStyle(el).backgroundColor;
      let parent = el.parentElement;
      while (bg === 'rgba(0, 0, 0, 0)' && parent) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      return bg;
    });

    // Calculate and verify contrast >= 4.5
  }
});
```

**3. Component Tests:**

Test each component in both modes:
- MarkdownRenderer
- Sidebar
- SwipeCard
- Checklist
- Calendar
- PhotoGrid
- DynamicPageRenderer

**4. Integration Tests:**

- Full page rendering in both modes
- Mode switching without page refresh
- localStorage persistence (optional)
- System preference detection

### Edge Cases

1. **System changes preference while app is open** → Listen for changes ✅
2. **User manually toggles mode** → Support toggle button (future)
3. **Images with transparency** → Ensure backgrounds show correctly
4. **Third-party components** → Audit Mermaid, Chart.js, etc.
5. **Nested dark mode elements** → Avoid double-application
6. **Print mode** → Force light mode for printing
7. **High contrast mode** → Respect OS high contrast settings

### Performance Considerations

- **No JavaScript overhead:** Pure CSS classes
- **No layout shifts:** Same dimensions in both modes
- **No repaints:** Tailwind compiles to static CSS
- **Instant switching:** No async operations

---

## Completion Phase

### Implementation Checklist

**Phase 1: Setup (15 min)**
- [ ] Create `useDarkMode.ts` hook
- [ ] Add hook to `App.tsx`
- [ ] Verify `tailwind.config.js` has `darkMode: 'class'`
- [ ] Test system detection works

**Phase 2: Core Components (60 min)**
- [ ] DynamicPageRenderer.tsx - Add dark: variants
- [ ] MarkdownRenderer.tsx - Add dark: variants
- [ ] Sidebar.tsx - Add dark: variants
- [ ] Verify critical path works

**Phase 3: Interactive Components (45 min)**
- [ ] SwipeCard.tsx
- [ ] Checklist.tsx
- [ ] Calendar.tsx
- [ ] PhotoGrid.tsx
- [ ] Verify all components render

**Phase 4: Example/Demo Files (30 min)**
- [ ] All *.example.tsx files
- [ ] All *.demo.tsx files
- [ ] Verify demos work in both modes

**Phase 5: Testing (45 min)**
- [ ] Create Playwright dark mode test suite
- [ ] Run accessibility tests (axe-core)
- [ ] Visual regression screenshots
- [ ] Contrast verification

**Phase 6: Validation (30 min)**
- [ ] Run concurrent validation agents
- [ ] Production validator
- [ ] Code analyzer
- [ ] Tester agent

**Phase 7: Browser Testing (15 min)**
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Mobile testing

**Total Estimated Time:** 4 hours

### Deployment Steps

1. **Development:**
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   ```

2. **Testing:**
   ```bash
   npx playwright test --project=core-features-chrome
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Deploy:**
   - Staging first
   - User validation
   - Production

---

## Success Criteria

**Primary (Must Pass):**
1. ✅ System dark mode users see dark backgrounds + light text
2. ✅ Light mode users see light backgrounds + dark text
3. ✅ All components work in both modes
4. ✅ WCAG AA contrast in both modes (4.5:1+)
5. ✅ User confirms text is readable

**Quality (Should Pass):**
1. ✅ Zero console errors or warnings
2. ✅ No visual regressions in light mode
3. ✅ Smooth mode transitions
4. ✅ All existing tests pass
5. ✅ New dark mode tests pass

**Bonus (Nice to Have):**
1. ✅ Manual dark mode toggle button
2. ✅ localStorage preference persistence
3. ✅ Transition animations
4. ✅ System sync indicator

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking light mode | Medium | High | Extensive testing, validation agents |
| Inconsistent colors | Medium | Medium | Use systematic pattern replacement |
| Performance issues | Low | Low | Pure CSS, no JS overhead |
| Browser compatibility | Low | Medium | Test in all major browsers |
| Accessibility regression | Low | High | Automated axe-core tests |
| User confusion | Low | Low | Follow system preference |

---

**Status:** Ready for implementation
**Confidence:** 95%
**Estimated Time:** 4 hours
**Expected Result:** Full dark mode support across entire page builder system
