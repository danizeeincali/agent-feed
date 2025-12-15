# Tabs and Anchor Navigation E2E Test Suite

## Overview

Comprehensive Playwright E2E test suite validating tabs component functionality and anchor navigation on the component showcase page.

**Test File:** `/workspaces/agent-feed/frontend/tests/e2e/tabs-and-anchor-validation.spec.ts`

**Target Page:** `http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples`

**Total Tests:** 21

---

## Test Categories

### 1. Tabs Component Functionality (8 Tests)

#### TEST 1: Page loads without React hook errors in console
- **Purpose:** Detect React hook errors that could break tabs
- **Validates:** No "Invalid hook call", "useEffect", "useState" errors
- **Evidence:** Console log capture + screenshot

#### TEST 2: Tabs component renders correctly on page
- **Purpose:** Verify tabs DOM structure is present
- **Validates:**
  - `[role="tablist"]` exists
  - `[role="tab"]` elements present
  - Tab labels are readable
- **Evidence:** Screenshot of rendered tabs

#### TEST 3: First tab is active by default
- **Purpose:** Verify initial state is correct
- **Validates:**
  - First tab has `aria-selected="true"` OR active class
  - Proper `tabindex` attribute
- **Evidence:** ARIA attribute inspection + screenshot

#### TEST 4: Clicking tabs switches active content
- **Purpose:** Validate tab interaction works
- **Validates:**
  - Click second tab changes `aria-selected`
  - Tab panel content changes
- **Evidence:** Before/after screenshots

#### TEST 5: Tabs have proper ARIA attributes for accessibility
- **Purpose:** Ensure accessibility compliance
- **Validates:**
  - `[role="tablist"]` exists
  - Each tab has `role="tab"`
  - `aria-selected` attribute present
  - `aria-controls` linking to panels
- **Evidence:** ARIA attribute analysis

#### TEST 6: Visual regression - capture tabs component screenshots
- **Purpose:** Detect visual regressions
- **Validates:**
  - Full page appearance
  - Individual tab states
- **Evidence:** Multiple screenshots of each tab state

#### TEST 7: Tab state persists after page interaction
- **Purpose:** Verify state management is stable
- **Validates:**
  - Selected tab remains selected after scroll
  - State survives DOM updates
- **Evidence:** Screenshot after scroll

#### TEST 8: Multiple tab components can coexist on same page
- **Purpose:** Test multiple instances work independently
- **Validates:**
  - Multiple `[role="tablist"]` detected
  - Each operates independently
- **Evidence:** Screenshot showing both tab sets

---

### 2. Anchor Navigation Functionality (8 Tests)

#### TEST 9: Sidebar anchor links exist and are properly formatted
- **Purpose:** Verify anchor links are in the DOM
- **Validates:**
  - `a[href^="#"]` elements exist
  - Links point to valid targets
- **Evidence:** Link list + screenshot

#### TEST 10: Headers have id attributes in DOM (browser inspection)
- **Purpose:** Ensure headers can be anchor targets
- **Validates:**
  - `h1-h6` elements have `id` attributes
  - IDs are properly formatted
- **Evidence:**
  - Console log of all IDs
  - Screenshot with highlighted headers

#### TEST 11: Clicking anchor link scrolls to target element
- **Purpose:** Verify scroll behavior works
- **Validates:**
  - Scroll position changes after click
  - Target element comes into viewport
- **Evidence:** Before/after scroll screenshots

#### TEST 12: URL hash updates correctly after anchor click
- **Purpose:** Validate URL hash synchronization
- **Validates:**
  - URL contains expected hash after click
  - Browser address bar updates
- **Evidence:** Console log of URL + screenshot

#### TEST 13: Multiple anchor navigation works sequentially
- **Purpose:** Test multiple navigations in sequence
- **Validates:**
  - Each anchor click updates URL
  - Each target scrolls into view
- **Evidence:** Screenshot of each navigation step

#### TEST 14: Browser back/forward navigation with anchors
- **Purpose:** Verify browser history integration
- **Validates:**
  - Back button returns to previous anchor
  - Forward button works
  - URL hash updates correctly
- **Evidence:** Screenshot of navigation states

#### TEST 15: Direct URL with hash loads and scrolls correctly
- **Purpose:** Test deep linking functionality
- **Validates:**
  - Page loads with hash in URL
  - Auto-scrolls to target element on load
- **Evidence:** Screenshot of loaded page

#### TEST 16: Screenshot proof of anchor navigation functionality
- **Purpose:** Visual documentation
- **Validates:**
  - All anchor links highlighted
  - Target elements highlighted
- **Evidence:**
  - Highlighted anchor links screenshot
  - Highlighted target screenshot

---

### 3. Combined Scenarios (5 Tests)

#### TEST 17: Navigate via anchor to section containing tabs
- **Purpose:** Test integration of both features
- **Validates:**
  - Anchor navigation to tabs section works
  - Tabs are visible after navigation
- **Evidence:** Before/after navigation screenshots

#### TEST 18: Tabs functionality works after anchor navigation
- **Purpose:** Verify tabs aren't broken by navigation
- **Validates:**
  - Tabs clickable after anchor navigation
  - Tab switching still works
- **Evidence:** Tab interaction screenshot

#### TEST 19: Full user workflow - navigate, switch tabs, navigate again
- **Purpose:** Simulate real user interaction
- **Validates:**
  - Multi-step workflow completes
  - All features work in sequence
- **Evidence:** Screenshot of each workflow step

#### TEST 20: Tab state preserved during anchor navigation
- **Purpose:** Test state management
- **Validates:**
  - Active tab stays active during scroll
  - Tab state persists through navigation
- **Evidence:** Screenshot showing preserved state

#### TEST 21: Complex interaction - tabs, anchors, and browser history
- **Purpose:** Stress test all features together
- **Validates:**
  - Anchor → Tab → Anchor → Back → Tab workflow
  - All features remain functional
- **Evidence:** Screenshots of each step

---

## Running the Tests

### Quick Start

```bash
# From frontend directory
./tests/e2e/run-tabs-anchor-tests.sh
```

### Prerequisites

1. **Frontend server running:**
   ```bash
   npm run dev
   # Server should be accessible at http://localhost:5173
   ```

2. **Playwright installed:**
   ```bash
   npm install
   npx playwright install
   ```

3. **Test page exists:**
   - Navigate to: `/agents/page-builder-agent/pages/component-showcase-and-examples`
   - Verify page loads and contains tabs + anchor links

### Manual Test Execution

```bash
# Run all tests
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts

# Run specific test category
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts -g "TABS COMPONENT"
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts -g "ANCHOR NAVIGATION"
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts -g "COMBINED SCENARIO"

# Run with UI mode (interactive)
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts --ui

# Run in debug mode
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts --debug

# Run in headed mode (see browser)
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts --headed
```

---

## Screenshot Evidence

All tests capture screenshots as proof of functionality.

**Screenshot Location:** `/tmp/screenshots/`

**Naming Convention:** `test-{number}-{description}-{timestamp}.png`

### Key Screenshots

- `test-1-no-hook-errors` - Console validation
- `test-2-tabs-render` - Tabs component structure
- `test-4-before-tab-click` / `test-4-after-tab-click` - Tab switching
- `test-6-visual-tab-{n}-state` - Each tab state
- `test-10-header-ids-highlighted` - Headers with IDs
- `test-11-before-scroll` / `test-11-after-scroll` - Anchor scroll
- `test-16-proof-anchors-highlighted` - All anchors highlighted
- `test-16-proof-target-highlighted` - Target element highlighted
- `test-19-step{n}` - Full workflow steps

### Viewing Screenshots

```bash
# List all screenshots
ls -lt /tmp/screenshots/

# View with image viewer
eog /tmp/screenshots/*.png

# Or open folder
xdg-open /tmp/screenshots/
```

---

## Test Results & Reports

### HTML Report

```bash
# Run tests with HTML report
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts --reporter=html

# View report
npx playwright show-report
```

### Console Output

Each test outputs detailed console logs:
- ✅ Success indicators
- ❌ Failure indicators
- 📸 Screenshot captures
- 🧪 Test step descriptions
- 📊 Summary statistics

### Example Output

```
🧪 TEST 1: Checking for React hook errors...
Found 0 total console errors
Found 0 React hook errors
📸 Screenshot saved: /tmp/screenshots/test-1-no-hook-errors-1696800000000.png
✅ TEST 1 PASSED: No React hook errors detected

🧪 TEST 2: Verifying tabs component renders...
Found 3 tab elements
  Tab 1: "Overview"
  Tab 2: "Examples"
  Tab 3: "API"
📸 Screenshot saved: /tmp/screenshots/test-2-tabs-render-1696800001000.png
✅ TEST 2 PASSED: Tabs component renders correctly
```

---

## Troubleshooting

### Common Issues

#### 1. No tabs found
**Symptom:** `expect(tabs.length).toBeGreaterThan(0)` fails

**Solutions:**
- Verify component showcase page has tabs component
- Check if tabs use `[role="tab"]` attribute
- Inspect page HTML structure
- Screenshot: `test-2-tabs-render` shows what was found

#### 2. Anchor links not working
**Symptom:** Tests 11-16 fail

**Solutions:**
- Verify headers have `id` attributes
- Check `a[href^="#"]` links exist
- Test manually: click sidebar link
- Screenshot: `test-10-header-ids-highlighted` shows IDs

#### 3. React hook errors
**Symptom:** Test 1 fails with hook errors

**Solutions:**
- Check browser console for actual errors
- Look for conditional hook calls
- Verify hooks only called in function components
- Check component re-render logic

#### 4. Tests timeout
**Symptom:** Tests exceed 60 second timeout

**Solutions:**
- Increase timeout in test config
- Check if page is loading slowly
- Verify server is responsive
- Check network tab for slow requests

### Debug Mode

Run tests in debug mode to pause and inspect:

```bash
npx playwright test tests/e2e/tabs-and-anchor-validation.spec.ts --debug
```

This allows:
- Stepping through tests
- Inspecting DOM in browser
- Checking console errors
- Viewing network requests

---

## Test Maintenance

### Updating Tests

When component showcase page changes:

1. **Update selectors** if HTML structure changes
2. **Add new tests** for new features
3. **Update expected IDs** in TEST 10, 13
4. **Regenerate visual baselines** if needed

### Adding New Tests

Follow the existing pattern:

```typescript
test('TEST 22: New test description', async ({ page }) => {
  console.log('🧪 TEST 22: What this test does...');

  // Test implementation
  // ...

  await takeTimestampedScreenshot(page, 'test-22-description');

  // Assertions
  expect(something).toBe(expected);

  console.log('✅ TEST 22 PASSED: Success message');
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tabs & Anchor E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run dev &
      - run: sleep 10
      - run: ./tests/e2e/run-tabs-anchor-tests.sh
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-screenshots
          path: /tmp/screenshots/
```

---

## Success Criteria

All 21 tests must pass:

- ✅ **0 React hook errors** detected
- ✅ **Tabs render** and are interactive
- ✅ **ARIA attributes** properly set
- ✅ **Anchor links** exist and work
- ✅ **Headers have IDs** for targeting
- ✅ **URL hash** updates correctly
- ✅ **Browser navigation** works with anchors
- ✅ **Combined scenarios** all functional
- ✅ **Visual proof** screenshots captured

---

## Contact & Support

**Test File Location:**
```
/workspaces/agent-feed/frontend/tests/e2e/tabs-and-anchor-validation.spec.ts
```

**Runner Script:**
```
/workspaces/agent-feed/frontend/tests/e2e/run-tabs-anchor-tests.sh
```

**Documentation:**
```
/workspaces/agent-feed/frontend/tests/e2e/TABS_AND_ANCHOR_VALIDATION_README.md
```

For issues or questions, check:
1. Test output console logs
2. Screenshots in `/tmp/screenshots/`
3. Playwright HTML report
4. Browser DevTools console
