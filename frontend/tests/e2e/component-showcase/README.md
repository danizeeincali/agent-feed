# Component Showcase E2E Tests

Quick-start guide for running E2E tests on the Component Showcase page.

## Overview

This test suite validates the Component Showcase page which demonstrates all dynamic page builder components. The tests are designed to be flexible and handle different implementations of the showcase page.

**Target URL**: `/agents/page-builder-agent/pages/component-showcase-and-examples`

## Prerequisites

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```

2. Ensure Playwright browsers are installed:
   ```bash
   npx playwright install
   ```

3. Ensure servers are running:
   - Frontend: `http://localhost:5173` (Vite dev server)
   - Backend: `http://localhost:3000` (API server)

## Quick Start

### Run All Tests

```bash
# From project root
npm run test:showcase

# Or with npx
npx playwright test tests/e2e/component-showcase
```

### Run with UI Mode (Recommended for Development)

```bash
npm run test:showcase:ui
```

### Run in Headed Mode (See Browser)

```bash
npm run test:showcase:headed
```

### Run Specific Browser

```bash
# Chromium
npm run test:showcase:chromium

# Firefox
npm run test:showcase:firefox

# WebKit
npm run test:showcase:webkit
```

### Debug Mode

```bash
npm run test:showcase:debug
```

## Test Structure

```
component-showcase/
├── README.md                               # This file
├── COMPONENT_SHOWCASE_E2E_TEST_PLAN.md    # Comprehensive test plan
├── component-showcase.spec.ts              # Main test suite
├── page-objects/
│   └── ComponentShowcasePage.ts            # Page Object Model
└── screenshots/                            # Generated screenshots
```

## Test Cases

The suite includes 15 core test cases:

1. **TC-001**: Page Loads Successfully
2. **TC-002**: All Components Render
3. **TC-003**: Sidebar Navigation Functions
4. **TC-004**: Interactive Components Are Present
5. **TC-005**: Component Sections Are Scrollable
6. **TC-006**: No Critical Console Errors
7. **TC-007**: Page Has Proper Structure
8. **TC-008**: Images Load Properly
9. **TC-009**: Mobile Responsive Layout
10. **TC-010**: Performance Check
11. **TC-011**: Visual Regression Baseline
12. **TC-012**: Accessibility Basics
13. **TC-013**: Text Content Is Present
14. **TC-014**: Links Are Functional
15. **TC-015**: Component Screenshots

## Expected Components

The test suite looks for these components:

- **Advanced Components**: PhotoGrid, SwipeCard, Checklist, Calendar, Markdown, GanttChart, Sidebar
- **Standard Components**: Card, Button, Grid, Badge, Metric

## Configuration

Tests are configured to:
- Be flexible with component detection (multiple selector strategies)
- Skip tests gracefully if components aren't found
- Provide detailed console output
- Capture screenshots on key actions
- Handle different page implementations

## Running While Unit Tests Run

Since you mentioned unit tests are running, you can run these E2E tests in parallel:

```bash
# Terminal 1: Unit tests
npm test

# Terminal 2: E2E tests (will run in headed mode to not interfere)
npm run test:showcase:headed
```

Or run them sequentially:

```bash
npm test && npm run test:showcase
```

## Viewing Results

### HTML Report

After running tests, view the HTML report:

```bash
npx playwright show-report tests/e2e/component-showcase/playwright-report
```

### Screenshots

Screenshots are saved to:
```
tests/e2e/component-showcase/screenshots/
```

### Test Results JSON

Test results are available in:
```
tests/e2e/component-showcase/test-results.json
```

## Visual Regression Testing

### Update Baselines

When you make intentional visual changes, update the baseline screenshots:

```bash
npm run test:showcase:snapshots
```

### Review Visual Diffs

If visual regression tests fail:

1. Check the diff images in `test-results/`
2. Review changes carefully
3. If changes are correct, update baselines:
   ```bash
   npm run test:showcase:snapshots
   ```

## Troubleshooting

### Tests Failing: "Component not found"

This is expected if the page doesn't have all components yet. The tests will:
- Warn about missing components
- Continue testing available components
- Pass if at least some components are found

### Tests Timing Out

Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Port Issues

If servers aren't on default ports, set environment variable:
```bash
BASE_URL=http://localhost:YOUR_PORT npm run test:showcase
```

### Visual Regression Failures

Visual tests may fail due to:
- Font rendering differences
- Dynamic content (timestamps, etc.)
- Browser version changes

To fix:
1. Review the diff images
2. Update baselines if changes are correct
3. Or adjust `maxDiffPixels` threshold in test

### Screenshots Not Saving

Ensure the directory exists:
```bash
mkdir -p tests/e2e/component-showcase/screenshots
```

## CI/CD Integration

Tests are configured to run in CI with:
- Headless mode
- Retries on failure
- Artifact uploads for screenshots and reports

See `.github/workflows/component-showcase-e2e.yml` for CI configuration.

## Test Maintenance

### Adding New Component Tests

1. Add component locator to `ComponentShowcasePage.ts`:
   ```typescript
   readonly newComponentSection: Locator;

   constructor(page: Page) {
     // ...
     this.newComponentSection = page.locator('[data-component="NewComponent"]');
   }
   ```

2. Add to `getAllComponentSections()`:
   ```typescript
   { name: 'NewComponent', locator: this.newComponentSection }
   ```

3. Add specific test if needed in `component-showcase.spec.ts`

### Updating Selectors

If page structure changes, update selectors in `ComponentShowcasePage.ts`. The page object uses flexible selectors with fallbacks.

## Performance Benchmarks

Current targets:
- Page load: < 10 seconds
- DOM Interactive: < 3 seconds
- First Paint: < 2 seconds

Adjust thresholds in TC-010 if needed for your environment.

## Accessibility Testing

Basic accessibility checks are included. For comprehensive testing:

1. Install axe-core:
   ```bash
   npm install -D @axe-core/playwright
   ```

2. Uncomment axe code in TC-014

## Best Practices

1. **Run tests frequently** during development
2. **Review screenshots** when tests fail
3. **Update baselines** when making intentional changes
4. **Keep tests flexible** - don't rely on exact component counts
5. **Use UI mode** for debugging test issues

## Support

For issues or questions:
1. Check the comprehensive test plan: `COMPONENT_SHOWCASE_E2E_TEST_PLAN.md`
2. Review test output and screenshots
3. Run with `--debug` flag for step-by-step execution

## Quick Commands Reference

```bash
# Run all tests
npm run test:showcase

# UI mode (recommended)
npm run test:showcase:ui

# Headed mode
npm run test:showcase:headed

# Debug mode
npm run test:showcase:debug

# Update snapshots
npm run test:showcase:snapshots

# View report
npx playwright show-report

# Specific test
npx playwright test tests/e2e/component-showcase -g "TC-001"

# Verbose output
npx playwright test tests/e2e/component-showcase --reporter=line
```

---

**Last Updated**: 2025-10-06
**Version**: 1.0
