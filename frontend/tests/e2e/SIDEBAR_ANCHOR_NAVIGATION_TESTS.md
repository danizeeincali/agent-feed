# Sidebar Anchor Navigation E2E Tests

## Overview

Comprehensive Playwright E2E tests for sidebar navigation with anchor links. These tests verify real browser behavior with actual page interactions, scrolling, and URL hash management.

## Test File

**Location:** `/workspaces/agent-feed/frontend/tests/e2e/sidebar-anchor-navigation.spec.js`

## Test Coverage

### Core Navigation Tests (1-10)

1. **Load page with sidebar containing anchor links**
   - Verifies sidebar exists with proper structure
   - Checks all anchor links are present
   - Validates link text content

2. **Click sidebar item with anchor link**
   - Tests basic click functionality
   - Verifies URL hash updates

3. **Verify page scrolls to target element**
   - Measures scroll position changes
   - Confirms target element comes into view

4. **Verify anchor link target has matching ID**
   - Validates all links have corresponding target elements
   - Ensures ID matching is correct

5. **Test multiple anchor links on same page**
   - Clicks through all anchors sequentially
   - Verifies each navigation works correctly

6. **Test anchor links with case-sensitive IDs**
   - Tests mixed-case ID handling
   - Verifies exact ID matching

7. **Test smooth scrolling behavior**
   - Measures scroll animation
   - Validates progressive scroll positions

8. **Test browser back/forward with anchors**
   - Tests browser history navigation
   - Verifies back/forward button behavior

9. **Test direct URL navigation with hash**
   - Tests direct URL access with hash fragment
   - Verifies page scrolls to correct section

10. **Verify active item highlights correctly**
    - Tests active state management
    - Ensures only one link is active at a time

### Advanced Tests (11-15)

11. **Test hash updates in URL on anchor click**
    - Verifies URL hash changes for each navigation
    - Validates hash extraction from URL

12. **Test page scroll position changes on navigation**
    - Records scroll positions for each section
    - Verifies positions are sequential and correct

13. **Test anchor navigation with keyboard**
    - Tests keyboard accessibility (Tab, Enter)
    - Verifies keyboard-only navigation

14. **Test anchors with special characters in IDs**
    - Tests IDs with underscores, hyphens, periods
    - Verifies special character handling

15. **Test rapid anchor clicking (stress test)**
    - Tests rapid successive clicks
    - Verifies stability under rapid interaction

### Edge Cases (16-18)

16. **Test anchor to non-existent element**
    - Tests clicking link to missing target
    - Verifies graceful handling

17. **Test empty anchor href**
    - Tests links with empty hash
    - Verifies no errors occur

18. **Test anchor navigation preserves scroll on reload**
    - Tests page reload with hash in URL
    - Verifies scroll position restoration

### Summary Test (19)

19. **Comprehensive anchor navigation test summary**
    - Runs all basic scenarios
    - Generates test report with screenshots
    - Saves detailed JSON report

## Running the Tests

### Prerequisites

1. Ensure development server is running:
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   ```

2. Verify Playwright is installed:
   ```bash
   npx playwright --version
   ```

### Run All Anchor Navigation Tests

```bash
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js
```

### Run Specific Test

```bash
# Run a specific test by name
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js -g "Click sidebar item"

# Run tests 1-5 only
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js -g "^[1-5]\."
```

### Run with UI Mode

```bash
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --ui
```

### Run with Headed Browser

```bash
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --headed
```

### Run in Debug Mode

```bash
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --debug
```

### Run Specific Browser

```bash
# Chrome only
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --project=chromium

# Firefox only
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --project=firefox

# WebKit only
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --project=webkit
```

### Generate HTML Report

```bash
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --reporter=html
npx playwright show-report
```

## Test Architecture

### Helper Class: `SidebarAnchorTestHelper`

The test suite uses a helper class that provides:

- **setupTestPage()**: Creates a test page with sidebar and anchor links
- **cleanupTestPage()**: Removes test elements after tests
- **getScrollPosition()**: Returns current scroll position
- **getElementPosition()**: Gets element position relative to viewport
- **takeScreenshot()**: Captures screenshots with consistent naming
- **getActiveSidebarLink()**: Returns currently active sidebar link
- **waitForScrollToComplete()**: Waits for smooth scroll animations

### Test Page Structure

Each test creates a dynamic test page with:

```
├── Sidebar (Fixed, Left)
│   ├── Navigation Title
│   └── Anchor Links
│       ├── Introduction (#section-introduction)
│       ├── Features (#section-features)
│       └── Implementation (#section-implementation)
│
└── Content Area (Scrollable)
    ├── Introduction Section
    │   └── Content (800px+ height)
    ├── Features Section
    │   └── Content (800px+ height)
    └── Implementation Section
        └── Content (800px+ height)
```

## Screenshots

All test screenshots are saved to:
```
/workspaces/agent-feed/frontend/tests/e2e/screenshots/
```

Screenshot naming convention:
- `sidebar-anchor-{test-description}.png`
- Example: `sidebar-anchor-01-page-loaded-with-sidebar.png`

### Screenshot List

Tests generate the following screenshots:

1. `initial-state.png` - Before each test
2. `01-page-loaded-with-sidebar.png` - Initial page load
3. `02-clicked-features-link.png` - After clicking Features
4. `03-scrolled-to-implementation.png` - After scrolling
5. `04-verified-matching-ids.png` - ID verification
6. `05-clicked-link-{1,2,3}-{name}.png` - Multiple clicks
7. `06-case-sensitive-navigation.png` - Case-sensitive test
8. `07-smooth-scroll-complete.png` - Smooth scroll
9. `08-{01-04}-{state}.png` - Browser history tests
10. `09-direct-hash-navigation.png` - Direct URL navigation
11. `10-{01-02}-{section}-active.png` - Active state
12. `11-hash-updates-verified.png` - Hash verification
13. `12-scroll-positions-verified.png` - Scroll positions
14. `13-{01-02}-keyboard-{section}.png` - Keyboard nav
15. `14-special-chars-navigation.png` - Special characters
16. `15-rapid-clicking-complete.png` - Stress test
17. `16-non-existent-anchor.png` - Edge case
18. `17-empty-anchor-href.png` - Edge case
19. `18-after-reload-with-hash.png` - Reload test
20. `19-summary-{scenario}.png` - Summary tests

## Test Report

The comprehensive summary test (Test 19) generates a JSON report:

**Location:** `/workspaces/agent-feed/frontend/tests/e2e/screenshots/test-report.json`

**Format:**
```json
{
  "timestamp": "2025-10-06T20:59:00.000Z",
  "tests": [
    {
      "scenario": "Click Introduction",
      "url": "http://localhost:5173#section-introduction",
      "scrollPosition": 120,
      "screenshot": "/path/to/screenshot.png"
    }
  ]
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Anchor Navigation E2E Tests

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
        run: |
          cd frontend
          npm ci

      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps chromium

      - name: Start dev server
        run: |
          cd frontend
          npm run dev &
          sleep 10

      - name: Run anchor navigation tests
        run: |
          cd frontend
          npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: anchor-nav-screenshots
          path: frontend/tests/e2e/screenshots/
```

## Troubleshooting

### Test Failures

**Issue: "Target element not found"**
- Verify dev server is running on localhost:5173
- Check if test page setup completed successfully
- Ensure no conflicting elements in real app

**Issue: "Scroll position incorrect"**
- Increase wait times in `waitForScrollToComplete()`
- Check if smooth scroll CSS is properly applied
- Verify content height is sufficient for scrolling

**Issue: "URL hash not updating"**
- Check browser support for history.pushState
- Verify click handlers are properly attached
- Ensure no JavaScript errors in console

### Performance

**Slow tests:**
- Reduce wait times after verifying stability
- Run in headless mode
- Use fewer screenshot captures

**Memory issues:**
- Run tests sequentially instead of parallel
- Clear screenshots directory periodically
- Reduce test page content size

## Best Practices

1. **Always cleanup test page**: Use `afterEach` to remove test elements
2. **Wait for animations**: Use appropriate wait times for smooth scrolling
3. **Verify visual state**: Take screenshots at key points
4. **Test edge cases**: Include tests for error conditions
5. **Use descriptive names**: Make test names clear and specific
6. **Document assumptions**: Comment complex test logic
7. **Independent tests**: Each test should be self-contained

## Dependencies

- `@playwright/test`: ^1.55.0
- Node.js: 18+
- Browser: Chromium, Firefox, or WebKit

## Contributing

When adding new anchor navigation tests:

1. Follow the existing naming convention (Test N: Description)
2. Add appropriate screenshots with descriptive names
3. Update this README with new test details
4. Ensure tests are independent and cleanup properly
5. Add to appropriate test suite (Core, Advanced, or Edge Cases)

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)

## Support

For issues or questions:
- Check Playwright documentation
- Review test output and screenshots
- Examine browser console logs
- Run tests with `--debug` flag for step-by-step execution
