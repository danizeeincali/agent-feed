# Comprehensive Anchor Navigation E2E Tests

## Overview

This test suite provides **22 comprehensive Playwright E2E tests** for anchor navigation functionality. All tests run against the **real page** created by the page-builder-agent without any mocks.

**Test File:** `/workspaces/agent-feed/frontend/tests/e2e/anchor-navigation.spec.js`

**Target URL:** `http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples`

## Test Coverage (22 Tests)

### Basic Navigation (Tests 1-6)
1. ✅ Should render page with sidebar and content sections
2. ✅ Should render header elements with ID attributes in DOM
3. ✅ Should click sidebar item and navigate to anchor
4. ✅ Should update URL hash when anchor clicked
5. ✅ Should scroll to target element smoothly
6. ✅ Should highlight active sidebar item

### Multiple Anchors (Tests 7-9)
7. ✅ Should navigate between multiple anchor sections
8. ✅ Should maintain scroll position after navigation
9. ✅ Should handle rapid clicks on different anchors

### Edge Cases (Tests 10-13)
10. ✅ Should handle anchor to non-existent ID gracefully
11. ✅ Should work with deeply nested components
12. ✅ Should preserve anchor navigation on page reload
13. ✅ Should work with browser back/forward buttons

### Keyboard Navigation (Tests 14-16)
14. ✅ Should navigate with Tab key to sidebar items
15. ✅ Should activate anchor with Enter key
16. ✅ Should support keyboard accessibility

### Visual Verification (Tests 17-19)
17. ✅ Take screenshot of initial page state
18. ✅ Take screenshot after anchor navigation (verify scroll)
19. ✅ Take screenshot of active sidebar highlighting

### Comprehensive Tests (Tests 20-22)
20. ✅ Verify all 15 anchor links work on component showcase page
21. ✅ Verify anchor navigation performance
22. ✅ Verify anchor navigation works on mobile viewport

## Prerequisites

### 1. Servers Running

**Frontend Server** (Port 5173):
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

**Backend API Server** (Port 3001):
```bash
cd /workspaces/agent-feed/api-server
npm run dev
```

### 2. Playwright Installed

```bash
cd /workspaces/agent-feed/frontend
npm install
npx playwright install chromium
```

### 3. Test Page Available

Ensure the component showcase page exists at:
```
http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples
```

## Running the Tests

### Run All Tests

```bash
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/anchor-navigation.spec.js
```

### Run with UI Mode (Recommended)

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --ui
```

### Run Specific Test

```bash
# Run only test #20 (comprehensive anchor test)
npx playwright test tests/e2e/anchor-navigation.spec.js -g "Verify all 15 anchor links"

# Run only visual tests
npx playwright test tests/e2e/anchor-navigation.spec.js -g "screenshot"

# Run only keyboard tests
npx playwright test tests/e2e/anchor-navigation.spec.js -g "keyboard"
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --headed
```

### Run with Debug Mode

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --debug
```

### Run in Specific Browser

```bash
# Chromium (default)
npx playwright test tests/e2e/anchor-navigation.spec.js --project=chromium

# Firefox
npx playwright test tests/e2e/anchor-navigation.spec.js --project=firefox

# WebKit (Safari)
npx playwright test tests/e2e/anchor-navigation.spec.js --project=webkit
```

## Expected Anchor Links

The component showcase page should have these 15 anchor links:

1. `#text-content` - Text Content
2. `#interactive-forms` - Interactive Forms
3. `#data-visualization` - Data Visualization
4. `#layout-components` - Layout Components
5. `#media-content` - Media Content
6. `#navigation-elements` - Navigation Elements
7. `#feedback-components` - Feedback Components
8. `#advanced-components` - Advanced Components
9. `#code-examples` - Code Examples
10. `#tables-lists` - Tables & Lists
11. `#cards-containers` - Cards & Containers
12. `#modals-dialogs` - Modals & Dialogs
13. `#progress-indicators` - Progress Indicators
14. `#date-time` - Date & Time
15. `#accessibility-features` - Accessibility Features

## Screenshot Outputs

All screenshots are saved to: `/workspaces/agent-feed/frontend/tests/screenshots/anchor-navigation/`

### Generated Screenshots

- `01-initial-page-state.png` - Full page before any navigation
- `02-after-anchor-navigation.png` - Full page after scrolling to anchor
- `02b-viewport-after-navigation.png` - Viewport view after navigation
- `03-active-sidebar-highlighting.png` - Sidebar with active item highlighted
- `04-all-anchors-test-complete.png` - Final state after testing all anchors
- `05-mobile-viewport-navigation.png` - Mobile viewport (375x667)

## Test Reports

### HTML Report

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --reporter=html
```

View report:
```bash
npx playwright show-report
```

### JSON Report

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --reporter=json
```

## Troubleshooting

### Issue: "Page not found"

**Solution:** Ensure both servers are running and the page exists
```bash
# Check frontend
curl http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples

# Check backend
curl http://localhost:3001/api/agent-pages/page-builder-agent/pages/component-showcase-and-examples
```

### Issue: "Timeout waiting for selector"

**Solution:** Increase timeout in playwright.config.js
```javascript
use: {
  actionTimeout: 60000,
  navigationTimeout: 60000,
}
```

### Issue: Tests fail intermittently

**Solution:** Add wait times or run sequentially
```bash
# Run tests one at a time
npx playwright test tests/e2e/anchor-navigation.spec.js --workers=1
```

### Issue: Screenshots not saving

**Solution:** Ensure directory exists
```bash
mkdir -p /workspaces/agent-feed/frontend/tests/screenshots/anchor-navigation
chmod -R 755 /workspaces/agent-feed/frontend/tests/screenshots
```

## Performance Benchmarks

Expected performance metrics:

- **Page Load:** < 3 seconds
- **Anchor Navigation:** < 500ms per click
- **Smooth Scroll:** 300-800ms animation
- **Screenshot Capture:** < 2 seconds

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Anchor Navigation E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
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

      - name: Start servers
        run: |
          cd frontend && npm run dev &
          cd api-server && npm run dev &
          sleep 10

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test tests/e2e/anchor-navigation.spec.js

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: anchor-navigation-screenshots
          path: frontend/tests/screenshots/anchor-navigation/

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/tests/test-results/
```

## Test Configuration

### Playwright Config Override

Create `playwright.config.anchor-nav.js` for isolated test runs:

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/anchor-navigation.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 2,
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },

  projects: [
    { name: 'chromium' },
  ],
});
```

Run with custom config:
```bash
npx playwright test --config=playwright.config.anchor-nav.js
```

## Code Quality

### ESLint

```bash
cd /workspaces/agent-feed/frontend
npx eslint tests/e2e/anchor-navigation.spec.js
```

### Prettier

```bash
npx prettier --write tests/e2e/anchor-navigation.spec.js
```

## Test Maintenance

### Updating Expected Anchors

If the component showcase page changes, update the `EXPECTED_ANCHORS` array in the test file:

```javascript
const EXPECTED_ANCHORS = [
  { id: 'new-section', label: 'New Section' },
  // ... add new anchors
];
```

### Adding New Tests

Follow the existing pattern:
```javascript
test('23. Your new test description', async ({ page }) => {
  // Test implementation
  console.log('✓ Test passed');
});
```

## Best Practices

1. **Always run with servers active** - Tests require live backend
2. **Check screenshots** - Visual proof of functionality
3. **Use headed mode for debugging** - See what's happening
4. **Run sequentially first** - Avoid parallel execution issues
5. **Check console output** - Rich logging for diagnostics
6. **Keep timeouts reasonable** - Balance speed vs stability

## Support

For issues or questions:
- Check the test output logs
- Review generated screenshots
- Run with `--debug` flag
- Check server logs (frontend & backend)

## Success Criteria

All 22 tests should **PASS** with:
- ✅ All anchor links functional
- ✅ Smooth scrolling animations
- ✅ URL hash updates correctly
- ✅ Keyboard navigation working
- ✅ Screenshots captured successfully
- ✅ No JavaScript errors
- ✅ 80%+ success rate on comprehensive test

---

**Last Updated:** October 7, 2025
**Test Suite Version:** 1.0.0
**Playwright Version:** 1.55.0
