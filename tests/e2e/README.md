# E2E Testing with Playwright

This directory contains end-to-end tests for the Agent Feed application using Playwright.

## Structure

```
tests/e2e/
├── components/          # Component-specific tests
│   ├── navigation.spec.js
│   ├── feed.spec.js
│   └── agents.spec.js
├── pages/              # Page Object Models
│   ├── HomePage.js
│   ├── AgentsPage.js
│   └── FeedPage.js
├── fixtures/           # Test data and setup/teardown
│   ├── global-setup.js
│   ├── global-teardown.js
│   └── test-data.js
├── screenshots/        # Visual regression test screenshots
├── full-flow.spec.js   # Complete user journey tests
└── README.md          # This file
```

## Running Tests

### Basic Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Browser-Specific Tests

```bash
# Run only Chromium tests
npm run test:e2e:chromium

# Run only Firefox tests
npm run test:e2e:firefox

# Run only WebKit tests
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile
```

### Visual Regression Testing

```bash
# Update screenshots/snapshots
npm run test:e2e:update-snapshots
```

## Configuration

The tests are configured in `/playwright.config.js` with:

- **Base URL**: http://localhost:5173 (Vite dev server)
- **Test Directory**: `./tests/e2e`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## Test Types

### 1. Component Tests
- **Navigation**: Menu interactions, routing
- **Feed**: Feed loading, filtering, interactions
- **Agents**: Agent list, search, filtering

### 2. Page Object Models
- **HomePage**: Main landing page interactions
- **AgentsPage**: Agent management page
- **FeedPage**: Feed display and interactions

### 3. Full Flow Tests
- Complete user journeys
- Cross-page navigation
- Accessibility testing
- Performance validation

## Visual Regression Testing

Screenshots are automatically captured and compared for:
- Component layouts
- Page designs
- Mobile responsiveness
- Interactive states

## Fixtures and Test Data

Test data is centralized in `fixtures/test-data.js` including:
- Mock users
- Sample agents
- Feed items
- API responses

## Best Practices

1. **Page Object Model**: Use POM for better maintainability
2. **Data Attributes**: Use `data-testid` for reliable selectors
3. **Wait Strategies**: Proper waiting for elements and network requests
4. **Screenshots**: Visual regression testing for UI consistency
5. **Mobile Testing**: Responsive design validation

## Debugging

1. **UI Mode**: Use `npm run test:e2e:ui` for interactive debugging
2. **Debug Mode**: Use `npm run test:e2e:debug` to step through tests
3. **Screenshots**: Check `test-results/` for failure screenshots
4. **Videos**: Recorded videos available for failed tests
5. **Traces**: Use Playwright trace viewer for detailed analysis

## CI/CD Integration

Tests are configured to run in CI with:
- Retries on failure
- Parallel execution disabled in CI
- HTML, JUnit, and JSON reporters
- Artifact collection (screenshots, videos, traces)

## Prerequisites

Before running tests, ensure:
1. Application is running on `http://localhost:5173`
2. Playwright browsers are installed (`npx playwright install`)
3. All dependencies are installed (`npm install`)

## Troubleshooting

- **Port conflicts**: Ensure localhost:5173 is available
- **Browser issues**: Run `npx playwright install` to update browsers
- **Flaky tests**: Check network conditions and timing issues
- **Screenshot mismatches**: Update baselines with `--update-snapshots`