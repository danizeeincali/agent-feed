# Dynamic Agent Pages E2E Tests

Comprehensive Playwright test suite for the Phase 3 dynamic agent pages functionality.

## Overview

This test suite validates the complete user journey for dynamic agent pages, including:

- **Navigation flows** - Agent card navigation to home pages
- **Content rendering** - Dynamic content display and updates  
- **Customization workflows** - Agent profile editing capabilities
- **Responsive design** - Cross-device compatibility
- **Real-time updates** - WebSocket-based live data synchronization
- **Performance** - Load times and interaction responsiveness
- **Accessibility** - WCAG 2.1 AA compliance

## Test Structure

```
specs/
├── navigation/          # Navigation flow tests
│   ├── agent-card-navigation.spec.ts
│   └── tab-navigation.spec.ts
├── content/             # Content rendering tests
│   └── dynamic-content-rendering.spec.ts
├── customization/       # Profile customization tests
│   └── profile-customization.spec.ts
├── responsive/          # Responsive design tests
│   └── mobile-responsive.spec.ts
├── realtime/           # Real-time functionality tests
│   └── websocket-updates.spec.ts
├── performance/        # Performance tests
│   └── load-performance.spec.ts
├── accessibility/      # Accessibility compliance tests
│   └── accessibility-compliance.spec.ts
├── setup.ts           # Test environment setup
└── teardown.ts        # Test cleanup
```

## Test Features

### Multi-Browser Support
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome & Safari
- High-DPI displays
- Slow network simulation

### Test Data Management
- Realistic agent test data
- Mock WebSocket events
- Performance benchmarks
- Accessibility guidelines

### Page Object Models
- `AgentsListPage` - Agents listing page interactions
- `AgentHomePage` - Individual agent home page interactions
- Comprehensive helper functions

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Run All Tests

```bash
# Run complete test suite
npm run test:e2e:dynamic-agent-pages

# Or run Playwright directly
npx playwright test --config=tests/e2e/dynamic-agent-pages/playwright.config.ts
```

### Run Specific Test Categories

```bash
# Navigation tests only
npx playwright test tests/e2e/dynamic-agent-pages/specs/navigation/

# Performance tests only
npx playwright test tests/e2e/dynamic-agent-pages/specs/performance/

# Mobile responsive tests
npx playwright test tests/e2e/dynamic-agent-pages/specs/responsive/

# Real-time functionality
npx playwright test tests/e2e/dynamic-agent-pages/specs/realtime/

# Accessibility compliance
npx playwright test tests/e2e/dynamic-agent-pages/specs/accessibility/
```

### Browser-Specific Testing

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only  
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit

# Mobile devices only
npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
```

### Development Mode

```bash
# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Run with UI mode
npx playwright test --ui

# Generate and update screenshots
npx playwright test --update-snapshots
```

## Test Configuration

### Environment Variables

```bash
# Test user credentials (if authentication required)
TEST_USERNAME=testuser@example.com
TEST_PASSWORD=testpassword

# Base URL override
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Enable debug logging
DEBUG=pw:api
```

### Performance Thresholds

The tests include performance budgets:

- Page load time: < 3 seconds
- Tab switching: < 200ms  
- First Contentful Paint: < 1.5 seconds
- Largest Contentful Paint: < 2.5 seconds
- Cumulative Layout Shift: < 0.1

### Accessibility Standards

Tests validate WCAG 2.1 AA compliance:

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Color contrast ratios
- Screen reader compatibility
- Focus management

## Reports and Artifacts

### HTML Reports

```bash
# View test results
npx playwright show-report tests/e2e/dynamic-agent-pages/reports/html
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots at failure point
- Video recordings of test execution
- Network traces for debugging

### CI/CD Integration

```bash
# CI-optimized test run
CI=true npx playwright test --reporter=github
```

## Test Data

### Mock Agents

The test suite includes realistic agent data:

```typescript
{
  id: 'productivity-master',
  name: 'Productivity Master AI',
  type: 'productivity', 
  status: 'active',
  capabilities: ['Task Automation', 'Analytics', 'Optimization'],
  metrics: { successRate: 98.7, todayTasks: 47 }
}
```

### WebSocket Events

Mock real-time events:

```typescript
{
  event: 'agent-update',
  data: { agentId: 'test-agent', updates: { status: 'busy' } }
}
```

## Debugging

### Common Issues

1. **Tests timing out**
   - Check if services are running on correct ports
   - Increase timeout values for slow environments
   - Verify network connectivity

2. **Navigation failures**
   - Ensure agent data is properly loaded
   - Check for JavaScript errors in console
   - Verify routing configuration

3. **Real-time tests failing**
   - WebSocket mocking may need adjustment
   - Check for proper event handling
   - Verify connection establishment

### Debug Tools

```bash
# Trace viewer for step-by-step debugging
npx playwright show-trace tests/e2e/dynamic-agent-pages/test-results/trace.zip

# Generate test code
npx playwright codegen localhost:3000/agents
```

## Contributing

### Adding New Tests

1. Create test file in appropriate category folder
2. Use existing page object models
3. Follow naming convention: `*.spec.ts`
4. Include proper test descriptions and tags

### Test Categories

Use consistent test grouping:

```typescript
test.describe('Feature Category', () => {
  test.describe('Specific Functionality', () => {
    test('should do something specific', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices

- Use page object models for reusable interactions
- Include proper wait strategies for dynamic content
- Test both positive and negative scenarios  
- Validate accessibility in all tests
- Include performance assertions where relevant
- Mock external dependencies consistently

## Support

For issues with the test suite:

1. Check the HTML test report for detailed failure information
2. Review screenshots and videos of failed tests
3. Run tests in headed mode for visual debugging
4. Consult the trace viewer for step-by-step analysis

## Roadmap

Future enhancements:

- Visual regression testing with screenshot comparisons
- API integration testing with backend services
- Cross-browser performance benchmarking
- Automated accessibility scoring
- Load testing with multiple concurrent users