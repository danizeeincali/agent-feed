# Page Rendering Fix Validation Test Guide

## Overview

Comprehensive Playwright E2E tests to validate page rendering functionality with real browser, real API, and real database integration.

## Test File

**Location:** `/workspaces/agent-feed/tests/e2e/page-rendering-fix.spec.ts`

## Test Coverage

### 1. Page Loads and Renders (not raw JSON)
- ✅ Navigates to dashboard URL
- ✅ Verifies components render (not "Page Data")
- ✅ Verifies DataCard components visible
- ✅ Verifies Badge components visible
- ✅ Takes screenshot on success

### 2. Data Bindings Work
- ✅ Verifies {{stats.total_tasks}} replaced with actual values
- ✅ Verifies {{priorities.P0}} shows numbers (not binding syntax)
- ✅ Takes screenshot of rendered metrics
- ✅ Validates binding resolution rate

### 3. No Console Errors
- ✅ Monitors browser console
- ✅ Verifies no React errors
- ✅ Verifies no fetch errors
- ✅ Reports detailed error breakdown

### 4. Mobile Responsive
- ✅ Tests at 375px width (mobile)
- ✅ Tests at 768px width (tablet)
- ✅ Tests at 1920px width (desktop)
- ✅ Verifies mobile layout works
- ✅ Takes screenshots for each viewport

### 5. Component Validation
- ✅ Verifies all required components present
- ✅ Validates component rendering quality
- ✅ Checks for validation errors
- ✅ Component inventory report

### 6. Accessibility (WCAG AA)
- ✅ Heading hierarchy validation
- ✅ Interactive elements have accessible text
- ✅ Images have alt text
- ✅ Form labels validation

### 7. Performance Metrics
- ✅ Page load time measurement
- ✅ DOM content loaded timing
- ✅ Network idle detection
- ✅ Element count validation
- ✅ Memory usage reporting

### 8. End-to-End User Journey
- ✅ Navigation flow
- ✅ Data loading verification
- ✅ Interactive elements validation
- ✅ Scroll behavior testing
- ✅ Error-free journey validation

## Prerequisites

### 1. Install Dependencies

```bash
cd /workspaces/agent-feed/tests/e2e
npm install
```

### 2. Start Services

**Terminal 1 - API Server:**
```bash
cd /workspaces/agent-feed/api-server
npm install
npm run dev
# Should run on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd /workspaces/agent-feed/frontend
npm install
npm run dev
# Should run on http://localhost:5173
```

### 3. Verify Data Exists

Check that test data is available:
```bash
ls -la /workspaces/agent-feed/data/agent-pages/personal-todos-agent-comprehensive-dashboard.json
```

## Running the Tests

### Run All Tests
```bash
cd /workspaces/agent-feed/tests/e2e
npm run test:rendering
```

### Run with Visible Browser (Headed Mode)
```bash
npm run test:rendering:headed
```

### Run with Debugger
```bash
npm run test:rendering:debug
```

### Run Specific Test
```bash
npx playwright test page-rendering-fix.spec.ts --grep "Page Loads and Renders"
```

### Run with UI Mode
```bash
npx playwright test page-rendering-fix.spec.ts --ui
```

## Test Results

### Console Output

The tests provide detailed console output for each test:

```
=== Test 1: Page Loads and Renders ===
Navigating to: http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard
✓ Page loaded in 1234ms
Raw JSON detected: NO (PASS)
Page title: "Personal Todos - Comprehensive Task Management Dashboard"
DataCard components found: 8
Badge components found: 15
📸 Screenshot saved: /workspaces/agent-feed/tests/e2e/screenshots/page-rendering-fix/test1-page-loaded-successfully-1234567890.png
✅ Test 1 PASSED: Page renders correctly (not JSON)
```

### Screenshots

All screenshots are saved to:
```
/workspaces/agent-feed/tests/e2e/screenshots/page-rendering-fix/
```

Screenshots include:
- `test1-page-loaded-successfully-*.png` - Initial page load
- `test2-data-bindings-resolved-*.png` - Data binding resolution
- `test3-console-errors-check-*.png` - Console error check
- `test4-responsive-375px-*.png` - Mobile viewport
- `test4-responsive-768px-*.png` - Tablet viewport
- `test4-responsive-1920px-*.png` - Desktop viewport
- `test5-component-validation-*.png` - Component validation
- `test6-accessibility-validation-*.png` - Accessibility check
- `test7-performance-metrics-*.png` - Performance metrics
- `test8-journey-step*.png` - User journey steps
- `failure-*.png` - Failure screenshots (if any test fails)

### HTML Report

After running tests, view the HTML report:
```bash
npm run test:report
```

This opens an interactive HTML report with:
- Test results summary
- Detailed test execution timeline
- Screenshots and videos
- Error traces

### JSON Report

Detailed JSON results are saved to:
```
/workspaces/agent-feed/tests/e2e/results/test-results.json
```

### JUnit Report

CI/CD-compatible JUnit XML report:
```
/workspaces/agent-feed/tests/e2e/results/junit.xml
```

## Test Configuration

### Timeouts
- Page load timeout: 30 seconds
- Navigation timeout: 30 seconds
- Assertion timeout: 10 seconds
- Overall test timeout: 2 minutes

### Performance Targets
- Max page load time: 5000ms (5 seconds)
- Max data binding time: 2000ms (2 seconds)
- Max render time: 3000ms (3 seconds)

### Test URLs
- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- Test Agent: `personal-todos-agent`
- Test Page: `comprehensive-dashboard`

## Troubleshooting

### Test Fails: Page Not Found

**Solution:** Ensure both frontend and API servers are running:
```bash
# Check frontend
curl http://localhost:5173

# Check API
curl http://localhost:3001/api/agent-pages/agents/personal-todos-agent/pages/comprehensive-dashboard
```

### Test Fails: Data Bindings Not Resolved

**Solution:** Verify test data exists and API endpoint returns data:
```bash
curl http://localhost:3001/api/agents/personal-todos-agent/data
```

### Test Fails: Console Errors

**Solution:** Check browser console in headed mode:
```bash
npm run test:rendering:headed
```

### Screenshots Not Saved

**Solution:** Verify directory exists and has write permissions:
```bash
mkdir -p /workspaces/agent-feed/tests/e2e/screenshots/page-rendering-fix
chmod 755 /workspaces/agent-feed/tests/e2e/screenshots/page-rendering-fix
```

### TypeScript Errors

**Solution:** Ensure TypeScript config is valid:
```bash
cat /workspaces/agent-feed/tests/e2e/tsconfig.json
```

## Debugging

### Enable Verbose Logging
```bash
DEBUG=pw:api npx playwright test page-rendering-fix.spec.ts
```

### Slow Motion (for visual debugging)
Add to test:
```typescript
test.use({ launchOptions: { slowMo: 500 } });
```

### Pause on Failure
```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    await page.pause();
  }
});
```

### Video Recording
Enabled by default on failure. Videos saved to:
```
/workspaces/agent-feed/tests/e2e/results/test-artifacts/
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: |
    cd tests/e2e
    npm install

- name: Start services
  run: |
    npm run start:api &
    npm run start:frontend &
    sleep 10

- name: Run E2E tests
  run: |
    cd tests/e2e
    npm run test:rendering

- name: Upload screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-screenshots
    path: tests/e2e/screenshots/
```

## Success Criteria

All tests must pass with:
- ✅ Page renders components (not JSON)
- ✅ Data bindings resolve to actual values
- ✅ Zero critical console errors
- ✅ Mobile responsive layout works
- ✅ All required components present
- ✅ Accessibility issues < 5
- ✅ Page load time < 5 seconds
- ✅ End-to-end journey completes successfully

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Configuration](/workspaces/agent-feed/tests/e2e/playwright.config.js)
- [Test Suite Manifest](/workspaces/agent-feed/tests/e2e/TEST_SUITE_MANIFEST.md)
- [Quick Start Guide](/workspaces/agent-feed/tests/e2e/QUICK_START.md)

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Review screenshots in `/screenshots/page-rendering-fix/`
3. Run with `--headed` flag to see browser behavior
4. Check HTML report with `npm run test:report`
