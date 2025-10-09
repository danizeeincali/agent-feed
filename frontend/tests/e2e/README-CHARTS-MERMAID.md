# Chart & Mermaid E2E Tests - Quick Reference

## Test File Location
`/workspaces/agent-feed/frontend/tests/e2e/charts-flowcharts-e2e.spec.ts`

## Quick Stats
- **Total Tests:** 53
- **Test Suites:** 19
- **Lines of Code:** 1,120
- **Screenshots:** 50+ captured

## Prerequisites

### 1. Start Development Servers
```bash
# Terminal 1: Start Frontend (Vite)
cd /workspaces/agent-feed/frontend
npm run dev
# Should be running on http://localhost:5173

# Terminal 2: Start API Server
cd /workspaces/agent-feed/api-server
npm start
# Should be running on http://localhost:3001
```

### 2. Install Playwright (if not already installed)
```bash
npm install @playwright/test
npx playwright install
```

## Running Tests

### Run All Chart/Mermaid Tests
```bash
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts
```

### Run with UI Mode (Interactive)
```bash
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --ui
```

### Run Specific Test Suite
```bash
# Chart Components only
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Chart Components"

# Mermaid Diagrams only
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Mermaid Diagrams"

# Integration Tests only
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Integration"
```

### Run Individual Tests
```bash
# LineChart tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "LineChart"

# BarChart tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "BarChart"

# PieChart tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "PieChart"

# Mermaid Flowchart tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Flowchart"

# Accessibility tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Accessibility"
```

### Run with Different Browsers
```bash
# Chromium (default)
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --project=chromium

# Firefox
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --project=firefox

# WebKit (Safari)
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --project=webkit

# All browsers
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --project=chromium --project=firefox --project=webkit
```

### Debug Mode
```bash
# Run in headed mode (see browser)
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --headed

# Debug with Playwright Inspector
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --debug

# Debug specific test
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "should render LineChart" --debug
```

### Screenshot Management
```bash
# Force screenshot on all tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --screenshot=on

# View screenshots after test run
ls -la /tmp/e2e-screenshots/

# Clean screenshots
rm -rf /tmp/e2e-screenshots/*.png
```

### Generate Reports
```bash
# Generate HTML report
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --reporter=html

# Open HTML report
npx playwright show-report

# Generate JSON report
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --reporter=json

# Multiple reporters
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --reporter=html,json,junit
```

## Test Categories

### 1. Chart Component Tests (27 tests)
```bash
# All chart tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Chart Components"

# Specific chart type
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "LineChart Rendering"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "BarChart Rendering"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "PieChart Rendering"

# Interactivity tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Chart Interactivity"

# Responsive tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Chart Responsiveness"

# Accessibility tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Chart Accessibility"
```

### 2. Mermaid Diagram Tests (18 tests)
```bash
# All Mermaid tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Mermaid Diagrams"

# Specific diagram type
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Flowchart Diagram"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Sequence Diagram"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Class Diagram"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "State Diagram"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "ER Diagram"
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Gantt Chart"

# Error handling
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Error Handling"

# Dark mode
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Dark Mode"
```

### 3. Integration Tests (8 tests)
```bash
# All integration tests
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts -g "Integration"
```

## Troubleshooting

### Tests Failing?

**1. Check servers are running:**
```bash
# Frontend should be on localhost:5173
curl http://localhost:5173

# API should be on localhost:3001
curl http://localhost:3001/health
```

**2. Clear Playwright cache:**
```bash
npx playwright install --force
```

**3. Check console for errors:**
```bash
# Run tests with console output
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --reporter=line
```

**4. Inspect failed test:**
```bash
# Run in UI mode to see what's happening
npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts --ui --grep="failing test name"
```

**5. Check screenshot directory permissions:**
```bash
ls -la /tmp/e2e-screenshots/
chmod 755 /tmp/e2e-screenshots/
```

### Common Issues

**Timeout errors:**
- Increase timeout in test config
- Check if servers are slow to respond
- Verify network connectivity

**Element not found:**
- Check if component is actually rendered
- Verify selector syntax
- Use `--headed` mode to see browser

**Screenshot failures:**
- Ensure `/tmp/e2e-screenshots/` exists
- Check disk space
- Verify write permissions

## Test Data

### Chart Data Available:
- **LineChart:** 5 data points with timestamps
- **BarChart:** 4 product categories
- **PieChart:** Browser market share data

### Mermaid Diagrams Available:
- Flowchart (graph TD)
- Sequence diagram
- Class diagram
- State diagram (v2)
- ER diagram
- Gantt chart
- Invalid syntax (for error testing)

## Configuration

**Test Config:**
```typescript
{
  baseURL: 'http://localhost:5173',
  apiURL: 'http://localhost:3001',
  screenshotDir: '/tmp/e2e-screenshots',
  timeout: 30000,
  viewports: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  }
}
```

## Expected Output

When all tests pass, you should see:
```
✓ 53 passed (5m)
```

Screenshots will be saved to:
```
/tmp/e2e-screenshots/
├── linechart-initial.png
├── barchart-vertical.png
├── piechart-initial.png
├── mermaid-flowchart.png
├── mermaid-sequence.png
├── integration-full-page.png
└── ... (50+ total)
```

## CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Run Chart & Mermaid E2E Tests
  run: |
    npm run dev &
    cd api-server && npm start &
    sleep 10
    npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts
```

### Docker Example:
```bash
docker run -it --rm \
  -v $(pwd):/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.40.0-focal \
  npx playwright test tests/e2e/charts-flowcharts-e2e.spec.ts
```

## More Information

- **Full Test Summary:** `/tmp/e2e-test-summary.md`
- **Playwright Docs:** https://playwright.dev
- **Chart Components:** `/workspaces/agent-feed/frontend/src/components/charts/`
- **Mermaid Component:** `/workspaces/agent-feed/frontend/src/components/markdown/MermaidDiagram.tsx`

## Support

If tests continue to fail:
1. Check test file for comments
2. Review screenshot evidence
3. Run individual failing test with `--debug`
4. Check component implementation
5. Verify API responses
