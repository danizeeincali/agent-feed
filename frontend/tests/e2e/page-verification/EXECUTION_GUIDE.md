# Page Verification Agent - Test Execution Guide

## Quick Start

### 1. Validate Setup

Before running tests, ensure your environment is properly configured:

```bash
cd /workspaces/agent-feed/frontend/tests/e2e/page-verification
npx ts-node validate-setup.ts
```

This will check:
- Node.js version (>= 16)
- Playwright installation
- Browser installations
- Required files and directories
- Configuration files

### 2. Run All Tests

```bash
./run-tests.sh all
```

This executes all 32 tests across 4 categories.

### 3. View Results

```bash
./run-tests.sh report
```

Opens the HTML test report in your browser.

## Test Categories

### Category 1: Sidebar Navigation (11 Tests)

**What it tests:**
- Sidebar item visibility and clickability
- Hash anchor navigation (smooth scrolling)
- React Router navigation
- Nested item expansion/collapse
- Disabled items behavior
- Badge notifications
- Active item highlighting
- Keyboard navigation (Tab, Arrow, Enter, Space)
- Mobile hamburger menu
- Sidebar collapse/expand
- Icon rendering

**Run command:**
```bash
./run-tests.sh sidebar
```

**Expected duration:** ~2-3 minutes

**Screenshots captured:**
- `sidebar-items-visible.png`
- `sidebar-expanded.png`
- `sidebar-collapsed.png`
- `sidebar-disabled-item.png`
- `sidebar-badge.png`
- `sidebar-active-item.png`
- `mobile-sidebar-open.png`
- `mobile-sidebar-closed.png`
- And more...

### Category 2: Component Rendering (9 Tests)

**What it tests:**
- Components render without errors
- Error boundaries catch failures
- Props validation and display
- Empty state messaging
- Loading states
- Multiple component coexistence
- Styling isolation
- Responsive layouts
- Dark mode support

**Run command:**
```bash
./run-tests.sh rendering
```

**Expected duration:** ~2-3 minutes

**Screenshots captured:**
- `all-components-rendered.png`
- `error-boundary.png`
- `empty-state.png`
- `loading-state.png`
- `multiple-components.png`
- `responsive-desktop.png`
- `responsive-tablet.png`
- `responsive-mobile.png`
- `dark-mode.png`
- `light-mode.png`

### Category 3: Interactive Elements (7 Tests)

**What it tests:**
- All buttons have actions
- All forms have submit handlers
- All links have valid hrefs
- All inputs are functional
- Click events provide visual feedback
- Hover states are visible
- Focus states for accessibility

**Run command:**
```bash
./run-tests.sh interactive
```

**Expected duration:** ~1-2 minutes

**Screenshots captured:**
- `buttons-without-handlers.png` (if any found)
- `invalid-links.png` (if any found)
- `inputs-functional.png`
- `before-click.png`
- `after-click.png`
- `hover-state.png`
- `focus-state.png`

### Category 4: Visual Regression (5 Tests)

**What it tests:**
- Full page baseline screenshots
- Sidebar component baseline
- Content area baseline
- Layout shift detection (CLS)
- Multi-viewport comparison

**Run command:**
```bash
./run-tests.sh visual
```

**Expected duration:** ~2-3 minutes

**Screenshots captured:**
- `baseline-full-page.png`
- `baseline-sidebar.png`
- `baseline-content.png`
- `layout-shift-test.png`
- `visual-desktop.png`
- `visual-tablet-landscape.png`
- `visual-tablet-portrait.png`
- `visual-mobile.png`

## Advanced Usage

### Run Specific Tests

Run a single test by name:
```bash
npx playwright test page-verification.spec.ts -g "SIDEBAR-01"
```

Run multiple specific tests:
```bash
npx playwright test page-verification.spec.ts -g "SIDEBAR-01|RENDER-01"
```

### Run with Different Browsers

Chrome only:
```bash
./run-tests.sh all --project=chromium
```

Firefox only:
```bash
./run-tests.sh all --project=firefox
```

Safari/WebKit only:
```bash
./run-tests.sh all --project=webkit
```

All browsers:
```bash
./run-tests.sh all --project=chromium --project=firefox --project=webkit
```

### Debug Mode

Open Playwright Inspector for step-by-step debugging:
```bash
./run-tests.sh debug
```

Or for a specific test:
```bash
npx playwright test page-verification.spec.ts -g "SIDEBAR-01" --debug
```

### UI Mode

Interactive test explorer:
```bash
./run-tests.sh ui
```

Features:
- Visual test runner
- Live browser preview
- Time travel debugging
- Screenshot comparison
- Filter and search tests

### Headed Mode

See the browser during test execution:
```bash
./run-tests.sh all --headed
```

Slower but useful for understanding test flow.

### Update Visual Baselines

After intentional UI changes, update screenshot baselines:
```bash
./run-tests.sh update-baselines
```

Or:
```bash
npx playwright test page-verification.spec.ts --update-snapshots
```

**Warning:** Only update baselines after verifying changes are correct!

### Parallel Execution

Run tests in parallel (faster):
```bash
./run-tests.sh all --workers=4
```

Run sequentially (slower but more stable):
```bash
./run-tests.sh all --workers=1
```

### Retry Failed Tests

Automatically retry failed tests:
```bash
./run-tests.sh all --retries=3
```

### CI Mode

Optimized for continuous integration:
```bash
./run-tests.sh ci
```

Features:
- Multiple reporters (HTML, JSON, JUnit)
- 2 workers (balanced performance)
- 3 retries (handles flakiness)
- Optimized output format

## Playwright MCP Tools Integration

### Available MCP Tools

This test suite is designed to work with Playwright MCP (Model Context Protocol) tools for AI-assisted test execution and debugging.

#### 1. Run Tests via MCP

```typescript
// Execute via MCP
mcp__playwright__runTests({
  testPath: 'frontend/tests/e2e/page-verification/page-verification.spec.ts',
  grep: 'Sidebar Navigation',
  project: 'chromium',
  headed: false,
  workers: 4
});
```

#### 2. Inspect Pages via MCP

```typescript
// Interactive page inspection
mcp__playwright__inspectPage({
  url: 'http://localhost:5173/agents/test-agent-1/pages/test-page-1',
  selector: 'aside[role="navigation"]',
  action: 'screenshot'
});
```

#### 3. Capture Screenshots via MCP

```typescript
// On-demand screenshot capture
mcp__playwright__captureScreenshot({
  url: '/agents/test-agent-1/pages/test-page-1',
  selector: 'aside[role="navigation"]',
  fullPage: false,
  outputPath: 'custom-sidebar-screenshot.png'
});
```

#### 4. Generate Reports via MCP

```typescript
// Generate custom reports
mcp__playwright__generateReport({
  testResults: 'test-results/*.json',
  format: 'html',
  outputDir: 'reports/page-verification',
  includeScreenshots: true
});
```

#### 5. Analyze Test Results via MCP

```typescript
// AI-powered test result analysis
mcp__playwright__analyzeResults({
  resultsPath: 'test-results/page-verification.json',
  screenshotsPath: 'screenshots/page-verification',
  failuresOnly: true
});
```

### MCP-Enhanced Workflows

#### Workflow 1: AI-Assisted Debugging

```bash
# 1. Run tests and capture failures
./run-tests.sh all

# 2. Use MCP to analyze failures
mcp__playwright__analyzeResults({
  resultsPath: 'test-results/e2e-results.json',
  screenshotsPath: '../screenshots/page-verification',
  failuresOnly: true
})

# 3. Get AI recommendations for fixes
# (MCP tool will analyze screenshots and provide suggestions)
```

#### Workflow 2: Visual Regression Analysis

```bash
# 1. Capture new screenshots
./run-tests.sh visual

# 2. Compare via MCP
mcp__playwright__compareScreenshots({
  baseline: 'screenshots/page-verification/baseline-*.png',
  current: 'screenshots/page-verification/*.png',
  threshold: 0.2,
  generateReport: true
})

# 3. Review AI-generated diff analysis
```

#### Workflow 3: Continuous Monitoring

```typescript
// Set up automated test runs via MCP
mcp__playwright__scheduleTests({
  testPath: 'page-verification/page-verification.spec.ts',
  schedule: '0 */2 * * *', // Every 2 hours
  notifyOn: 'failure',
  slackWebhook: 'https://hooks.slack.com/...'
});
```

## Output and Artifacts

### Directory Structure

```
frontend/tests/e2e/
├── page-verification/
│   ├── page-verification.spec.ts      # Main test file
│   ├── README.md                       # Documentation
│   ├── EXECUTION_GUIDE.md             # This file
│   ├── run-tests.sh                   # Test runner
│   └── validate-setup.ts              # Setup validator
│
├── screenshots/
│   └── page-verification/
│       ├── baseline-*.png             # Visual baselines
│       ├── sidebar-*.png              # Sidebar screenshots
│       ├── responsive-*.png           # Responsive screenshots
│       └── ...                        # Other screenshots
│
├── test-results/
│   ├── e2e-results.json              # JSON results
│   ├── e2e-junit.xml                 # JUnit XML
│   └── ...                           # Individual test results
│
└── playwright-report/
    ├── index.html                     # HTML report
    ├── data/                          # Test data
    └── assets/                        # Report assets
```

### HTML Report

Access via:
```bash
./run-tests.sh report
```

Features:
- Test execution timeline
- Pass/fail statistics
- Screenshot galleries
- Detailed error messages
- Trace viewer integration
- Filter by status/browser/test

### JSON Results

Programmatic access to test results:
```bash
cat test-results/e2e-results.json
```

Structure:
```json
{
  "config": {...},
  "suites": [
    {
      "title": "Sidebar Navigation Tests",
      "tests": [
        {
          "title": "SIDEBAR-01: All sidebar items should be visible and clickable",
          "status": "passed",
          "duration": 1234,
          "attachments": [...]
        }
      ]
    }
  ],
  "stats": {
    "expected": 30,
    "unexpected": 2,
    "flaky": 0,
    "skipped": 0
  }
}
```

### JUnit XML

For CI/CD integration:
```bash
cat test-results/e2e-junit.xml
```

Compatible with:
- Jenkins
- GitHub Actions
- GitLab CI
- CircleCI
- Travis CI

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Symptoms:**
- Tests hang indefinitely
- "Timeout exceeded" errors

**Solutions:**
```bash
# Increase timeout
./run-tests.sh all --timeout=90000

# Run with fewer workers
./run-tests.sh all --workers=1

# Check API mock responses
```

#### 2. Visual Regression Failures

**Symptoms:**
- "Screenshot comparison failed" errors
- Many pixel differences

**Solutions:**
```bash
# Update baselines (if changes are intentional)
./run-tests.sh update-baselines

# Adjust threshold
npx playwright test page-verification.spec.ts --grep "Visual" --config playwright.config.ts

# Review screenshots manually
open screenshots/page-verification/
```

#### 3. Component Not Found

**Symptoms:**
- "Element not found" errors
- "Selector not visible"

**Solutions:**
```bash
# Run in debug mode to inspect
./run-tests.sh debug

# Check API mocks in beforeEach
# Verify component registration in DynamicPageRenderer

# Increase wait timeout
```

#### 4. Flaky Tests

**Symptoms:**
- Tests pass sometimes, fail other times
- Different results on reruns

**Solutions:**
```bash
# Use retries
./run-tests.sh all --retries=3

# Run sequentially
./run-tests.sh all --workers=1

# Add explicit waits instead of timeouts
# Use waitForSelector with state options
```

#### 5. Screenshot Directory Permissions

**Symptoms:**
- "Permission denied" when saving screenshots
- "EACCES" errors

**Solutions:**
```bash
# Fix permissions
chmod -R 755 screenshots/page-verification/

# Recreate directory
rm -rf screenshots/page-verification/
mkdir -p screenshots/page-verification/
```

### Debug Checklist

When tests fail:

1. ✅ Check test output for error messages
2. ✅ Review screenshots in `screenshots/page-verification/`
3. ✅ Open HTML report: `./run-tests.sh report`
4. ✅ Run single failing test in debug mode
5. ✅ Check API mock data structure
6. ✅ Verify component selectors exist
7. ✅ Review trace viewer in HTML report
8. ✅ Check browser console logs
9. ✅ Verify test data factory output
10. ✅ Run validation script: `npx ts-node validate-setup.ts`

## Performance Metrics

### Expected Test Times

| Category | Tests | Duration (parallel) | Duration (sequential) |
|----------|-------|-------------------|---------------------|
| Sidebar Navigation | 11 | ~2 min | ~5 min |
| Component Rendering | 9 | ~2 min | ~4 min |
| Interactive Elements | 7 | ~1 min | ~3 min |
| Visual Regression | 5 | ~2 min | ~4 min |
| **Total** | **32** | **~5-7 min** | **~16 min** |

### Optimization Tips

1. **Parallel Execution**
   - Use `--workers=4` for faster execution
   - Watch CPU/memory usage

2. **Browser Selection**
   - Run Chromium only for development
   - Run all browsers for CI/CD

3. **Screenshot Comparison**
   - Adjust `maxDiffPixels` threshold
   - Disable animations for consistency

4. **Test Isolation**
   - Each test should be independent
   - Use `beforeEach` for setup
   - Clean up after each test

## Continuous Integration

### GitHub Actions Example

```yaml
name: Page Verification E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily at midnight

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Validate test setup
        run: npx ts-node frontend/tests/e2e/page-verification/validate-setup.ts

      - name: Run Page Verification tests
        run: |
          cd frontend/tests/e2e/page-verification
          ./run-tests.sh ci --project=${{ matrix.browser }}

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots-${{ matrix.browser }}
          path: frontend/tests/e2e/screenshots/page-verification/
          retention-days: 30

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.browser }}
          path: frontend/tests/test-results/
          retention-days: 30

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('frontend/tests/test-results/e2e-results.json', 'utf8'));
            const passed = results.stats.expected;
            const failed = results.stats.unexpected;
            const total = passed + failed;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Page Verification E2E Tests (${{ matrix.browser }})\\n\\n✅ Passed: ${passed}\\n❌ Failed: ${failed}\\n📊 Total: ${total}`
            });
```

### GitLab CI Example

```yaml
page-verification-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm ci
    - npx playwright install
    - cd frontend/tests/e2e/page-verification
    - npx ts-node validate-setup.ts
    - ./run-tests.sh ci
  artifacts:
    when: always
    paths:
      - frontend/tests/e2e/screenshots/page-verification/
      - frontend/tests/test-results/
      - playwright-report/
    expire_in: 30 days
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
```

## Best Practices

### Writing Tests

1. **Use Page Object Model**
   - Encapsulate page interactions
   - Reuse selectors and methods
   - Improve maintainability

2. **Descriptive Test Names**
   - Include test ID (e.g., SIDEBAR-01)
   - Explain what is being tested
   - Use present tense

3. **Independent Tests**
   - Each test should stand alone
   - No shared state
   - Clean up after each test

4. **Explicit Waits**
   - Use `waitForSelector` with state
   - Avoid arbitrary timeouts
   - Handle async operations properly

5. **Screenshot Everything**
   - Capture on failure
   - Capture key states
   - Use descriptive filenames

### Maintenance

1. **Update Baselines Carefully**
   - Review visual changes
   - Document baseline updates
   - Get team approval

2. **Monitor Flakiness**
   - Track flaky tests
   - Fix root causes
   - Don't just add retries

3. **Keep Tests Fast**
   - Optimize selectors
   - Minimize waits
   - Run in parallel

4. **Document Changes**
   - Update README for new tests
   - Comment complex logic
   - Keep examples current

## Support

### Getting Help

1. **Read Documentation**
   - README.md - Test overview
   - EXECUTION_GUIDE.md - This file
   - Playwright docs: https://playwright.dev

2. **Check Examples**
   - Review existing tests
   - Check page object patterns
   - Study screenshot captures

3. **Debug Tools**
   - Playwright Inspector: `--debug`
   - UI Mode: `--ui`
   - Trace Viewer in HTML report

4. **Team Resources**
   - Ask in team chat
   - Create GitHub issue
   - Review PR comments

### Useful Links

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Visual Regression Testing](https://playwright.dev/docs/test-snapshots)
- [Debugging Tests](https://playwright.dev/docs/debug)

## Changelog

### Version 1.0.0 (2025-01-06)
- Initial release
- 32 comprehensive E2E tests
- 4 test categories
- Full MCP integration
- Screenshot capture on all scenarios
- Page Object Model implementation
- CI/CD examples

---

**Last Updated:** 2025-01-06
**Test Suite Version:** 1.0.0
**Playwright Version:** 1.40.0+
