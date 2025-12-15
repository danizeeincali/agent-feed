# Anchor Navigation E2E Tests - Summary

## File Location
`/workspaces/agent-feed/frontend/tests/e2e/page-verification/anchor-navigation-complete.spec.ts`

## Overview
Comprehensive Playwright E2E test suite for anchor navigation functionality with 22 tests across 4 categories.

## Test Categories

### Category 1: Header ID Verification (6 tests)
Tests that verify headers have proper auto-generated IDs:

1. ✅ **Headers have auto-generated IDs from titles**
   - Verifies all h1-h6 elements have id attributes
   - Confirms kebab-case format
   - Screenshot: `anchor-test-1-header-ids-verification.png`

2. ✅ **ID generation handles special characters**
   - Tests headers with special chars like "Text & Content"
   - Verifies conversion to "text-content"
   - Screenshot: `anchor-test-2-special-characters.png`

3. ✅ **ID generation handles numbers**
   - Tests headers containing numbers
   - Verifies numbers preserved in kebab-case
   - Screenshot: `anchor-test-3-numbers.png`

4. ✅ **All header levels (h1-h6) have IDs**
   - Checks all 6 header levels
   - Screenshot: `anchor-test-4-all-levels.png`

5. ✅ **Sidebar links match header IDs**
   - Cross-references sidebar anchor links with header IDs
   - Screenshot: `anchor-test-5-sidebar-match.png`

6. ✅ **No missing IDs**
   - Ensures zero headers without id attribute
   - Screenshot: `anchor-test-6-no-missing-ids.png`

### Category 2: Anchor Click and Scroll (8 tests)
Tests that verify anchor click behavior and scrolling:

7. ✅ **Clicking sidebar link scrolls to header**
   - Measures scroll position before/after
   - Verifies target in viewport
   - Screenshots: before and after

8. ✅ **Smooth scrolling works**
   - Checks scroll-behavior CSS property
   - Screenshot: `anchor-test-8-smooth-scroll.png`

9. ✅ **Multiple anchor clicks work**
   - Clicks 3 different anchors
   - Screenshots for each click

10. ✅ **URL hash updates on click**
    - Verifies URL contains correct #anchor
    - Screenshot: `anchor-test-10-url-hash.png`

11. ✅ **Direct URL with hash scrolls to target**
    - Tests navigation to URL with hash
    - Screenshot: `anchor-test-11-direct-url-hash.png`

12. ✅ **Back/forward navigation works**
    - Tests browser back button
    - Screenshot: `anchor-test-12-back-navigation.png`

13. ✅ **Anchor navigation after page interaction**
    - Clicks tab first, then anchor
    - Screenshot: `anchor-test-13-after-interaction.png`

14. ✅ **Viewport positioning**
    - Verifies target header at top of viewport
    - Screenshot: `anchor-test-14-viewport-position.png`

### Category 3: Edge Cases (4 tests)
Tests that verify edge case handling:

15. ✅ **Anchor to non-existent ID fails gracefully**
    - Tests #nonexistent anchor
    - Verifies no JavaScript errors
    - Screenshot: `anchor-test-15-nonexistent-id.png`

16. ✅ **Anchor navigation with collapsed sidebar**
    - Collapses sidebar first
    - Tests anchor still works
    - Screenshot: `anchor-test-16-collapsed-sidebar.png`

17. ✅ **Anchor navigation on mobile**
    - Sets viewport to 375x667 (mobile)
    - Tests anchor navigation
    - Screenshot: `anchor-test-17-mobile.png`

18. ✅ **Rapid anchor clicking**
    - Clicks 5 anchors rapidly (100ms delay)
    - Verifies no errors
    - Screenshot: `anchor-test-18-rapid-clicking.png`

### Category 4: Integration Tests (4 tests)
Tests that verify integration with other features:

19. ✅ **Tabs + Anchor navigation together**
    - Clicks tab component
    - Then clicks anchor
    - Screenshot: `anchor-test-19-tabs-and-anchors.png`

20. ✅ **Full user workflow**
    - Multi-step workflow simulation
    - Screenshots at each step

21. ✅ **Console has no errors**
    - Monitors console during all interactions
    - Verifies 0 JavaScript errors
    - Screenshot: `anchor-test-21-console-check.png`

22. ✅ **Performance - scrolling is smooth**
    - Measures scroll duration
    - Verifies < 1 second per scroll
    - Screenshot: `anchor-test-22-performance.png`

## Test Configuration

### Project: page-verification
- **Browser**: Chrome (Desktop)
- **Viewport**: 1920x1080
- **Screenshot**: On (all tests)
- **Video**: On (recording enabled)
- **Trace**: On (for debugging)
- **Server**: http://localhost:5173

### Helper Functions
- `navigateToTestPage(page)` - Navigate to test page
- `getScrollPosition(page)` - Get current scroll Y position
- `isInViewport(page, selector)` - Check if element is visible in viewport

## Running the Tests

### Run all anchor navigation tests:
```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e -- --project=page-verification anchor-navigation-complete
```

### Run specific test:
```bash
npm run test:e2e -- --project=page-verification -g "Headers have auto-generated IDs"
```

### Run with UI mode (recommended):
```bash
npm run test:e2e -- --project=page-verification --ui anchor-navigation-complete
```

### Generate HTML report:
```bash
npx playwright show-report
```

## Screenshot Output
All screenshots saved to:
- `/workspaces/agent-feed/frontend/screenshots/anchor-test-*.png`

## Test Results
Test results saved to:
- `/workspaces/agent-feed/frontend/test-results/`

## Prerequisites

1. **Test page must exist**: `/test-page-with-anchors`
   - Page should have multiple headers (h1-h6)
   - Headers should have auto-generated IDs
   - Page should have sidebar with anchor links

2. **Dev server running**: `npm run dev` (auto-started by Playwright)

3. **Playwright installed**: `npm install @playwright/test`

## Expected Outcomes

### All 22 tests should pass if:
- Headers have auto-generated kebab-case IDs
- Anchor links in sidebar match header IDs
- Clicking anchors scrolls to correct position
- URL hash updates correctly
- Browser back/forward navigation works
- No JavaScript console errors
- Smooth scrolling is enabled
- Mobile viewport works correctly
- Performance is good (< 1s scroll time)

### Common Failures:
- **Missing IDs**: Headers without id attributes
- **Wrong format**: IDs not in kebab-case
- **Broken links**: Sidebar links don't match header IDs
- **No scroll**: Clicking anchor doesn't scroll
- **Console errors**: JavaScript errors during navigation
- **Performance**: Scroll takes > 1 second

## Debugging Tips

1. **Use UI Mode**: See tests run in real-time
   ```bash
   npm run test:e2e -- --ui
   ```

2. **Check screenshots**: All tests generate screenshots
   ```bash
   ls screenshots/anchor-test-*.png
   ```

3. **View trace**: If test fails, view trace
   ```bash
   npx playwright show-trace test-results/[trace-file]
   ```

4. **Console logs**: Check browser console in trace viewer

5. **Adjust selectors**: Update selectors if your sidebar/headers use different classes

## Customization

### Update test page URL:
Change `navigateToTestPage()` function:
```typescript
async function navigateToTestPage(page: Page) {
  await page.goto(`${BASE_URL}/your-page-url`);
  await page.waitForLoadState('networkidle');
}
```

### Update sidebar selector:
Modify anchor link locator:
```typescript
page.locator('nav a[href^="#"], aside a[href^="#"], .your-sidebar-class a[href^="#"]')
```

### Adjust timeouts:
Modify wait times if scrolling is slower:
```typescript
await page.waitForTimeout(500); // Increase to 1000 if needed
```

## Notes

- Tests are defensive: use conditional checks for optional elements
- Tests gracefully skip if elements don't exist
- All tests include proper error handling
- Performance test measures actual scroll duration
- Mobile test uses real mobile viewport (375x667)
- Rapid clicking test verifies stability under stress

## Maintenance

- Update selectors if HTML structure changes
- Add more edge cases as discovered
- Adjust performance thresholds based on requirements
- Keep screenshots for visual regression testing

## CI/CD Integration

Tests configured for CI with:
- Retries on failure (3x in CI)
- Parallel execution (2 workers in CI)
- HTML/JSON/JUnit reports
- Video/trace on failure only in CI

---

**Created**: 2025-10-07
**Total Tests**: 22
**Categories**: 4
**Coverage**: Header IDs, Scroll Behavior, Edge Cases, Integration
