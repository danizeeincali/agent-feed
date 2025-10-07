# Layer 2: Page Verification Agent - E2E Test Suite

## Overview

This test suite provides comprehensive automated validation for dynamic agent pages, ensuring that all components render correctly, navigation works as expected, and interactive elements are functional.

## Test Coverage

### 1. Sidebar Navigation Tests (11 Tests)

| Test ID | Description | Coverage |
|---------|-------------|----------|
| SIDEBAR-01 | All sidebar items visible and clickable | Click detection, disabled state |
| SIDEBAR-02 | Hash anchor navigation scrolling | Smooth scroll behavior, viewport detection |
| SIDEBAR-03 | Route navigation URL changes | React Router integration |
| SIDEBAR-04 | Nested items expand/collapse | Animation, state management |
| SIDEBAR-05 | Disabled items not clickable | Accessibility, visual feedback |
| SIDEBAR-06 | Badge notifications display | Badge rendering, count accuracy |
| SIDEBAR-07 | Active item highlighting | Route-based highlighting |
| SIDEBAR-08 | Keyboard navigation | Tab, Arrow keys, Enter, Space |
| SIDEBAR-09 | Mobile hamburger menu | Responsive behavior, overlay |
| SIDEBAR-10 | Collapsible sidebar | Width transitions, state persistence |
| SIDEBAR-11 | Icon rendering | Lucide icons, fallback handling |

### 2. Component Rendering Tests (9 Tests)

| Test ID | Description | Coverage |
|---------|-------------|----------|
| RENDER-01 | Components render without errors | Error boundary detection |
| RENDER-02 | Error boundaries catch failures | Graceful degradation |
| RENDER-03 | Props validation and display | Schema validation, prop passing |
| RENDER-04 | Empty state messaging | User guidance, action buttons |
| RENDER-05 | Loading states during fetch | Spinner, skeleton screens |
| RENDER-06 | Multiple component coexistence | No conflicts, isolation |
| RENDER-07 | Styling isolation | No global CSS conflicts |
| RENDER-08 | Responsive layouts | Desktop, tablet, mobile |
| RENDER-09 | Dark mode support | Theme switching, contrast |

### 3. Interactive Elements Tests (7 Tests)

| Test ID | Description | Coverage |
|---------|-------------|----------|
| INTERACTIVE-01 | Buttons have actions | Click handlers, event detection |
| INTERACTIVE-02 | Forms have submit handlers | Form validation, submission |
| INTERACTIVE-03 | Links have valid hrefs | URL validation, navigation |
| INTERACTIVE-04 | Inputs are functional | Text input, state updates |
| INTERACTIVE-05 | Visual feedback on click | State changes, animations |
| INTERACTIVE-06 | Hover states visible | CSS transitions, affordance |
| INTERACTIVE-07 | Focus states for a11y | Keyboard navigation, ARIA |

### 4. Visual Regression Tests (5 Tests)

| Test ID | Description | Coverage |
|---------|-------------|----------|
| VISUAL-01 | Full page baseline | Complete layout capture |
| VISUAL-02 | Sidebar baseline | Component isolation |
| VISUAL-03 | Content area baseline | Main content validation |
| VISUAL-04 | Layout shift detection | CLS measurement, stability |
| VISUAL-05 | Multi-viewport comparison | Responsive design validation |

## Test Architecture

### Page Object Model (POM)

The test suite uses the Page Object Model pattern for maintainability and reusability:

```typescript
class DynamicPageObject {
  // Navigation
  navigateToAgentPage(agentId, pageId)
  waitForPageLoad()

  // Sidebar
  getSidebarItems()
  clickSidebarItem(label)
  expandSidebarItem(label)
  collapseSidebarItem(label)

  // Components
  getRenderedComponents()
  getComponentByType(type)
  hasComponentErrors()

  // Interactive Elements
  getAllButtons()
  getAllLinks()
  getAllForms()
  getAllInputs()

  // Screenshots
  captureFullPageScreenshot(name)
  captureElementScreenshot(selector, name)
}
```

### Test Data Factory

Creates consistent test data across tests:

```typescript
class TestDataFactory {
  static createTestPageData(options)
  static createSidebarConfig(options)
}
```

## Running Tests

### All Tests

```bash
npx playwright test page-verification.spec.ts
```

### Specific Test Group

```bash
# Sidebar tests only
npx playwright test page-verification.spec.ts --grep "Sidebar Navigation"

# Component rendering tests only
npx playwright test page-verification.spec.ts --grep "Component Rendering"

# Interactive elements tests only
npx playwright test page-verification.spec.ts --grep "Interactive Elements"

# Visual regression tests only
npx playwright test page-verification.spec.ts --grep "Visual Regression"
```

### Interactive Mode (UI)

```bash
npx playwright test page-verification.spec.ts --ui
```

### Debug Mode

```bash
npx playwright test page-verification.spec.ts --debug
```

### Headed Mode (See Browser)

```bash
npx playwright test page-verification.spec.ts --headed
```

### Specific Browser

```bash
# Chrome
npx playwright test page-verification.spec.ts --project=chromium

# Firefox
npx playwright test page-verification.spec.ts --project=firefox

# Safari
npx playwright test page-verification.spec.ts --project=webkit
```

### Update Visual Baselines

```bash
npx playwright test page-verification.spec.ts --update-snapshots
```

### Generate HTML Report

```bash
npx playwright test page-verification.spec.ts
npx playwright show-report
```

## Screenshot Capture

All tests capture screenshots on failure and for specific validation scenarios. Screenshots are saved to:

```
/workspaces/agent-feed/frontend/tests/e2e/screenshots/page-verification/
```

### Screenshot Organization

```
screenshots/page-verification/
├── baseline-full-page.png
├── baseline-sidebar.png
├── baseline-content.png
├── sidebar-items-visible.png
├── sidebar-expanded.png
├── sidebar-collapsed.png
├── sidebar-disabled-item.png
├── sidebar-badge.png
├── sidebar-active-item.png
├── mobile-sidebar-open.png
├── mobile-sidebar-closed.png
├── empty-state.png
├── error-boundary.png
├── multiple-components.png
├── responsive-desktop.png
├── responsive-tablet.png
├── responsive-mobile.png
├── dark-mode.png
├── light-mode.png
└── ...
```

## MCP Tools for Execution

This test suite is designed to work with Playwright MCP (Model Context Protocol) tools:

### Available MCP Tools

1. **mcp__playwright__runTests**
   - Execute test files with full configuration
   - Supports filtering, retries, parallel execution

2. **mcp__playwright__inspectPage**
   - Interactive page inspection
   - DOM exploration, element selection

3. **mcp__playwright__captureScreenshot**
   - On-demand screenshot capture
   - Element or full page screenshots

4. **mcp__playwright__generateReport**
   - HTML test report generation
   - JSON results export

### Example MCP Usage

```typescript
// Run all page verification tests
await mcp__playwright__runTests({
  testFile: 'page-verification/page-verification.spec.ts',
  project: 'chromium',
  workers: 4
});

// Capture specific element screenshot
await mcp__playwright__captureScreenshot({
  url: '/agents/test-agent-1/pages/test-page-1',
  selector: 'aside[role="navigation"]',
  outputPath: 'sidebar-custom.png'
});

// Generate test report
await mcp__playwright__generateReport({
  format: 'html',
  outputDir: 'test-results/page-verification'
});
```

## Continuous Integration (CI)

### GitHub Actions Example

```yaml
name: Page Verification Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

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
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run page verification tests
        run: npx playwright test page-verification.spec.ts

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: page-verification-screenshots
          path: frontend/tests/e2e/screenshots/page-verification/

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check network conditions
   - Verify API mocks are responding

2. **Visual regression failures**
   - Update baselines with `--update-snapshots`
   - Check for dynamic content (timestamps, animations)
   - Review threshold settings in test config

3. **Screenshots not captured**
   - Verify screenshot directory permissions
   - Check disk space
   - Ensure screenshot directory exists

4. **Component not found errors**
   - Verify component is registered in DynamicPageRenderer
   - Check API mock data structure
   - Review component type spelling

## Best Practices

1. **Stable Selectors**
   - Use `data-testid` attributes
   - Prefer ARIA roles and labels
   - Avoid brittle CSS selectors

2. **Test Independence**
   - Each test should be isolated
   - No shared state between tests
   - Clean up after each test

3. **Screenshot Naming**
   - Use descriptive names
   - Include test ID in filename
   - Organize by feature/component

4. **Waiting Strategies**
   - Wait for specific conditions, not arbitrary timeouts
   - Use `waitForSelector` with state options
   - Handle loading states explicitly

## Metrics and Reporting

After running tests, view metrics in the HTML report:

- **Test Duration**: Individual and total test times
- **Screenshot Diff**: Visual regression comparisons
- **Error Details**: Stack traces and failure context
- **Coverage**: Which tests passed/failed by category

## Contributing

When adding new tests:

1. Follow the existing naming convention (e.g., `SIDEBAR-XX`, `RENDER-XX`)
2. Add test description to this README
3. Capture screenshots for visual validation
4. Update the test count in overview section
5. Ensure tests are independent and repeatable

## Support

For issues or questions:

- Check Playwright documentation: https://playwright.dev
- Review existing test examples in this file
- Consult Page Object Model patterns
- Check screenshot captures for visual debugging

## License

Copyright (c) 2025 Agent Feed Project
