# Advanced Components E2E Test Suite

## Overview

Comprehensive Playwright E2E test suite validating all 7 advanced dynamic page components with real browser interactions and screenshot capture.

## Components Tested

### 1. Checklist Component
- ✅ Renders checklist with all items
- ✅ Toggles checkbox items
- ✅ Keyboard navigation support
- 📸 Screenshots: `checklist-rendered.png`, `checklist-toggled.png`

### 2. Calendar Component
- ✅ Single date selection mode
- ✅ Range selection mode
- ✅ Event display on calendar
- 📸 Screenshots: `calendar-single.png`, `calendar-range.png`, `calendar-with-events.png`

### 3. PhotoGrid Component
- ✅ 3-column grid layout
- ✅ 4-column grid layout
- ✅ Lightbox on image click
- 📸 Screenshots: `photogrid-3col.png`, `photogrid-4col.png`, `photogrid-lightbox.png`

### 4. Markdown Component
- ✅ Renders all markdown elements (headings, lists, tables, code, etc.)
- ✅ XSS protection and sanitization
- 📸 Screenshots: `markdown-rendered.png`, `markdown-xss-protection.png`

### 5. Sidebar Component
- ✅ Desktop navigation rendering
- ✅ Expandable/collapsible nested items
- ✅ Mobile responsive layout
- 📸 Screenshots: `sidebar-desktop.png`, `sidebar-expanded.png`, `sidebar-mobile.png`

### 6. SwipeCard Component
- ✅ Card stack rendering
- ✅ Button controls for swiping
- ✅ Mobile touch gesture support
- 📸 Screenshots: `swipecard-stack.png`, `swipecard-after-swipe.png`, `swipecard-mobile.png`

### 7. GanttChart Component
- ✅ Task timeline rendering
- ✅ Week view mode
- ✅ Month view mode
- ✅ Task dependencies display
- ✅ Progress indicators
- 📸 Screenshots: `gantt-week-view.png`, `gantt-month-view.png`, `gantt-dependencies.png`, `gantt-progress.png`

### 8. Integration Test
- ✅ All 7 components rendered together on same page
- ✅ No component conflicts
- ✅ No console errors
- 📸 Screenshot: `all-components-integrated.png`

## Prerequisites

1. **Backend running**: API server must be running on `http://localhost:3001`
2. **Frontend running**: Vite dev server must be running on `http://localhost:5173`
3. **Playwright installed**: Run `npm install` if not already done

## Running Tests

### Run all advanced component tests:
```bash
npx playwright test tests/e2e/advanced-components-validation.spec.ts --reporter=list
```

### Run with UI mode (interactive):
```bash
npx playwright test tests/e2e/advanced-components-validation.spec.ts --ui
```

### Run specific component test:
```bash
# Checklist only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "Checklist Component"

# Calendar only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "Calendar Component"

# PhotoGrid only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "PhotoGrid Component"

# Markdown only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "Markdown Component"

# Sidebar only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "Sidebar Component"

# SwipeCard only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "SwipeCard Component"

# GanttChart only
npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "GanttChart Component"
```

### Run with headed browser (see tests execute):
```bash
npx playwright test tests/e2e/advanced-components-validation.spec.ts --headed
```

### Run with debugging:
```bash
npx playwright test tests/e2e/advanced-components-validation.spec.ts --debug
```

### Generate HTML report:
```bash
npx playwright test tests/e2e/advanced-components-validation.spec.ts --reporter=html
npx playwright show-report
```

## Screenshot Locations

All screenshots are saved to: `/workspaces/agent-feed/frontend/tests/e2e/screenshots/`

### Screenshot Manifest:
- `checklist-rendered.png` - Initial checklist state
- `checklist-toggled.png` - After toggling checkboxes
- `calendar-single.png` - Single date mode
- `calendar-range.png` - Range selection mode
- `calendar-with-events.png` - Calendar with event markers
- `photogrid-3col.png` - 3-column photo grid
- `photogrid-4col.png` - 4-column photo grid
- `photogrid-lightbox.png` - Lightbox opened on image click
- `markdown-rendered.png` - Rendered markdown with all elements
- `markdown-xss-protection.png` - XSS sanitization in action
- `sidebar-desktop.png` - Sidebar on desktop viewport
- `sidebar-expanded.png` - Sidebar with expanded nested items
- `sidebar-mobile.png` - Sidebar on mobile viewport (375x667)
- `swipecard-stack.png` - Card stack initial state
- `swipecard-after-swipe.png` - After swiping a card
- `swipecard-mobile.png` - SwipeCard on mobile viewport
- `gantt-week-view.png` - Gantt chart in week view
- `gantt-month-view.png` - Gantt chart in month view
- `gantt-dependencies.png` - Task dependencies visualization
- `gantt-progress.png` - Task progress indicators
- `all-components-integrated.png` - All components on one page

## Test Architecture

### Helper Functions

1. **createTestPage(page, pageId, title, components)**
   - Creates a dynamic page via API
   - Used in `beforeEach` hooks

2. **deleteTestPage(page, pageId)**
   - Cleans up test pages
   - Used in `afterEach` hooks

3. **navigateToTestPage(page, pageId)**
   - Navigates to page and waits for load
   - Waits for `networkidle` state

4. **setupConsoleErrorTracking(page)**
   - Tracks console errors during tests
   - Returns array of error messages

### Test Pattern

Each test follows the AAA pattern:
```typescript
test('should do something', async ({ page }) => {
  // Arrange: Create test page with component
  await createTestPage(page, PAGE_ID, 'Test Title', [
    {
      type: 'ComponentName',
      props: { /* props */ }
    }
  ]);

  // Act: Navigate and interact
  await navigateToTestPage(page, PAGE_ID);
  await page.click('button');

  // Assert: Verify behavior
  await expect(page.locator('element')).toBeVisible();

  // Capture screenshot
  await page.screenshot({ path: 'screenshot.png' });

  // Cleanup
  await deleteTestPage(page, PAGE_ID);
});
```

## Continuous Integration

These tests can be run in CI/CD pipelines:

```yaml
# .github/workflows/e2e-advanced-components.yml
name: E2E Advanced Components Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Start backend
        run: npm run start:backend &

      - name: Start frontend
        run: npm run dev &

      - name: Wait for servers
        run: npx wait-on http://localhost:3001 http://localhost:5173

      - name: Run E2E tests
        run: npx playwright test tests/e2e/advanced-components-validation.spec.ts

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-screenshots
          path: frontend/tests/e2e/screenshots/
          retention-days: 30
```

## Troubleshooting

### Tests fail with "Page not found"
- Ensure backend API is running on `http://localhost:3001`
- Check that agent pages API endpoints are working

### Screenshots are blank
- Increase `waitForTimeout` values for slower image loading
- Check network connectivity for external images (picsum.photos)

### Calendar tests fail
- Calendar component may use different selectors
- Check for `.rdp`, `[role="application"]`, or other calendar-specific selectors

### Lightbox doesn't open
- Different lightbox libraries use different selectors
- Update selectors to match your PhotoGrid lightbox implementation

### Console errors detected
- Check browser console for actual errors
- Some errors may be expected (e.g., network errors for test images)

## Performance Considerations

- Tests use `waitForTimeout` for image loading - adjust as needed
- PhotoGrid tests wait 2 seconds for images to load from picsum.photos
- Consider using local test images for faster, more reliable tests

## Next Steps

1. **Visual Regression Testing**: Compare screenshots against baselines
2. **Accessibility Testing**: Add axe-core checks for WCAG compliance
3. **Performance Testing**: Measure component render times
4. **Cross-browser Testing**: Run on Firefox, Safari, and Edge
5. **Mobile Testing**: Add more mobile viewport tests

## Contributing

When adding new component tests:
1. Follow the existing test pattern
2. Add screenshots for visual validation
3. Include console error tracking
4. Clean up test data in `afterEach`
5. Update this README with new component info
