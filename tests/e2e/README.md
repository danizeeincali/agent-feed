# E2E Testing Suite - Agent Feed Application

## Overview

Comprehensive End-to-End testing suite using Playwright for real user workflow validation in the Agent Feed application. Tests real browser interactions with actual frontend (port 5173) and backend (port 3000) services - **no mocks or simulations**.

## Test Structure

### Core Test Suites

- **`user-workflows.spec.ts`** - Complete user journey validation
- **`loading-animations.spec.ts`** - Visual feedback and loading state testing
- **`permission-dialogs.spec.ts`** - Interactive dialog and permission testing
- **`websocket-communication.spec.ts`** - Real-time communication validation
- **`error-scenarios.spec.ts`** - Error handling and recovery testing

### Page Object Model

- **`pages/AgentFeedPage.ts`** - Main application page object with all interactions
- **`utils/TestHelpers.ts`** - Utility functions for common test operations
- **`fixtures/TestData.ts`** - Test data and scenarios for consistent testing

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run with visible browser
npm run test:e2e:headed
```

### Browser-Specific Testing

```bash
# Test specific browsers
npm run test:e2e:chromium
npm run test:e2e:firefox  
npm run test:e2e:webkit

# Test mobile devices
npm run test:e2e:mobile
```

### Specialized Test Suites

```bash
# Performance testing
npm run test:e2e:performance

# Visual regression testing
npm run test:e2e:visual

# Generate and view HTML report
npm run test:e2e:report
```

## Test Scenarios

### 1. Complete User Workflows

**Button Click Flow:**
- Navigate to application
- Click "Create Instance" button
- Verify loading animations appear
- Wait for instance creation with PID tracking
- Validate instance appears in list

**Command Execution:**
- Execute simple commands (`ls -la`, `echo "test"`)
- Verify tool call visualization bullets
- Test complex commands requiring multiple tool calls
- Handle interactive commands with user input

### 2. Loading Animation Testing

**Visual Feedback Validation:**
- Instance creation loading states
- Command execution loading indicators  
- Animation performance timing (< 100ms appearance)
- Visual consistency across browsers
- Accessibility attributes verification

### 3. Permission Dialog Testing

**Interactive Permission Handling:**
- File system permission requests
- Network access permission dialogs
- System command permission warnings
- Allow/Deny button functionality
- Keyboard navigation and accessibility
- Permission memory and persistence

### 4. WebSocket Communication

**Real-time Communication Testing:**
- Connection establishment verification
- Message exchange validation
- Reconnection handling after network loss
- Concurrent message handling
- Binary data transmission
- Connection stability under load

### 5. Error Scenarios

**Comprehensive Error Handling:**
- Backend service unavailability
- Invalid command execution
- Network connectivity loss
- WebSocket connection failures
- Instance creation failures
- Command timeout handling
- Memory/resource exhaustion
- Browser compatibility issues

## Configuration

### Environment Setup

Tests automatically start required services:
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:3000` (Express server with WebSocket)

### Browser Configuration

Supports multiple browsers and devices:
- **Desktop**: Chromium, Firefox, WebKit
- **Mobile**: iPhone 12, Pixel 5
- **Custom**: Configurable viewport sizes

### Performance Thresholds

```typescript
export const performanceThresholds = {
  pageLoadTime: 3000,      // 3 seconds
  commandExecutionTime: 5000,  // 5 seconds  
  instanceCreationTime: 10000, // 10 seconds
  webSocketConnectionTime: 2000 // 2 seconds
};
```

## CI/CD Integration

### GitHub Actions Workflow

Automated testing pipeline with:
- **Multi-browser testing** (Chromium, Firefox, WebKit)
- **Mobile device testing** (Chrome Mobile, Safari Mobile)
- **Performance validation**
- **Visual regression testing**
- **Artifact collection** (screenshots, reports, videos)

### Workflow Triggers

- **Push** to `main` or `develop` branches
- **Pull Request** to `main` branch
- **Manual dispatch** with browser selection

## Test Artifacts

### Generated Reports

- **HTML Report**: `tests/e2e/reports/html/`
- **JSON Results**: `tests/e2e/reports/results.json`
- **JUnit XML**: `tests/e2e/reports/junit.xml`

### Screenshots and Videos

- **Screenshots**: `tests/e2e/screenshots/`
- **Videos**: Captured on test failure
- **Visual Regression**: Baseline and comparison images

## Best Practices

### Test Writing Guidelines

1. **Real User Interactions**: Use actual clicks, typing, navigation
2. **No Mocks**: Test against real services and APIs
3. **Explicit Waits**: Use `waitFor` patterns, avoid `sleep`
4. **Error Validation**: Verify error handling and recovery
5. **Performance Aware**: Include timing validations
6. **Cross-Browser**: Test core functionality on all browsers

### Page Object Patterns

```typescript
// Good: Descriptive methods
await agentFeedPage.createNewInstance();
await agentFeedPage.executeCommand('ls -la');
await agentFeedPage.verifyToolCallVisualization();

// Good: Explicit waits
await expect(element).toBeVisible({ timeout: 10000 });
await agentFeedPage.waitForCommandCompletion();
```

### Test Data Management

Use fixtures for consistent test data:
```typescript
import { testCommands, testScenarios } from './fixtures/TestData';

await agentFeedPage.executeCommand(testCommands.simple.command);
await expect(output).toContainText(testCommands.simple.expectedOutput);
```

## Debugging

### Local Debugging

```bash
# Run single test with debug
npx playwright test user-workflows.spec.ts --debug

# Run with browser visible
npx playwright test --headed

# Generate trace for failed tests
npx playwright test --trace on-first-retry
```

### CI Debugging

- Download artifacts from GitHub Actions
- View HTML reports and screenshots
- Check console logs and error messages
- Analyze performance metrics

## Maintenance

### Regular Updates

1. **Browser Updates**: Keep Playwright browsers current
2. **Test Data**: Update test scenarios as features change
3. **Thresholds**: Adjust performance thresholds as needed
4. **Screenshots**: Update visual regression baselines

### Monitoring

- **Test Duration**: Monitor for increasing test times
- **Flaky Tests**: Identify and fix unstable tests
- **Coverage**: Ensure new features have E2E coverage
- **Performance**: Track performance regression trends

## Contributing

### Adding New Tests

1. Follow page object model patterns
2. Use descriptive test names and descriptions
3. Include both positive and negative test cases
4. Add appropriate assertions and error handling
5. Update test data fixtures as needed

### Test Categories

Use test descriptions for categorization:
- `test.describe('Feature Name - Test Category', () => {})`
- Include relevant tags: `Performance`, `Visual`, `Mobile`
- Group related test cases logically

## Support

- **Playwright Docs**: https://playwright.dev/docs
- **Test Reports**: View HTML reports after test runs
- **Issues**: Create GitHub issues for test failures or improvements