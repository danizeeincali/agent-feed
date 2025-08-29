# Claude Process Regression Tests

Comprehensive Playwright E2E test suite for validating Claude process creation, interaction, and reliability.

## Overview

This test suite provides comprehensive regression testing for the Claude Code interface, covering:

- **Instance Creation**: All 4 button types (Working, Prod, Source, Tests)
- **Real Claude Validation**: Genuine Claude process verification
- **Terminal Streaming**: SSE and I/O validation
- **Error Handling**: Comprehensive error scenarios
- **Performance Testing**: Load and reliability testing
- **Visual Regression**: Screenshot comparison and UI validation

## Test Structure

```
tests/playwright/claude-regression/
├── specs/                          # Test specifications
│   ├── claude-instance-creation.spec.ts
│   ├── real-claude-validation.spec.ts
│   ├── terminal-streaming.spec.ts
│   ├── error-handling.spec.ts
│   ├── performance-reliability.spec.ts
│   └── visual-regression.spec.ts
├── page-objects/                   # Page Object Model
│   ├── ClaudeInstancePage.ts
│   ├── TerminalComponent.ts
│   └── StatusIndicator.ts
├── utils/                          # Test utilities
│   ├── custom-matchers.ts
│   ├── test-helpers.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
├── screenshots/                    # Visual regression baselines
├── playwright.config.ts           # Playwright configuration
├── package.json                   # Test dependencies
└── tsconfig.json                  # TypeScript configuration
```

## Installation

1. Install dependencies:
```bash
cd tests/playwright/claude-regression
npm install
npx playwright install
```

2. Install browser dependencies (if needed):
```bash
npx playwright install-deps
```

## Running Tests

### All Tests
```bash
npm run test
```

### Specific Test Suites
```bash
# Instance creation tests
npx playwright test claude-instance-creation

# Claude validation tests
npx playwright test real-claude-validation

# Terminal streaming tests
npx playwright test terminal-streaming

# Error handling tests
npx playwright test error-handling

# Performance tests
npx playwright test performance-reliability

# Visual regression tests
npx playwright test visual-regression
```

### Development Mode
```bash
# Run with headed browser
npm run test:headed

# Run with debug mode
npm run test:debug

# Run with UI mode
npm run test:ui
```

## Test Configuration

### Custom Matchers

The test suite includes custom Playwright matchers for Claude-specific assertions:

```typescript
// Claude welcome message
await expect(page).toHaveClaudeWelcome();

// Working directory validation
await expect(page).toHaveWorkingDirectory('/workspaces/agent-feed/prod');

// Interactive prompt
await expect(page).toHaveInteractivePrompt();

// Error absence
await expect(page).toNotHaveClaudeErrors();

// Status progression
await expect(page).toHaveStatusProgression(['starting', 'running']);

// Terminal streaming
await expect(page).toHaveTerminalStreaming([/pattern1/, /pattern2/]);

// Response time validation
await expect(page).toRespondWithin('Hello', 5000);

// Terminal content validation
await expect(page).toHaveTerminalContent('expected text');

// SSE connection validation
await expect(page).toHaveSSEConnection();
```

### Page Object Model

#### ClaudeInstancePage
- Button interactions for all 4 Claude instance types
- Status validation and waiting
- Screenshot capabilities
- Error detection

#### TerminalComponent  
- Terminal interaction and content validation
- Streaming output monitoring
- Command sending and response waiting
- SSE message monitoring

#### StatusIndicator
- Status progression tracking
- Error state detection
- Progress monitoring
- Visual state validation

### Test Helpers

The `TestHelpers` class provides utilities for:

- Performance measurement
- Context creation and cleanup
- Test data generation
- Network simulation
- Retry mechanisms with backoff
- Debugging and reporting

## Critical Test Scenarios

### 1. Instance Creation Validation
✅ Verifies "✻ Welcome to Claude Code!" appears  
✅ Checks correct working directory (cwd: /path)  
✅ Validates interactive prompt ">" appears  
✅ Ensures no "--print requires input" errors  
✅ Tests status progression "starting" → "running"

### 2. Button Type Coverage
- **Working Button**: `/workspaces/agent-feed`
- **Prod Button**: `/workspaces/agent-feed/prod` 
- **Source Button**: `/workspaces/agent-feed/src`
- **Tests Button**: `/workspaces/agent-feed/tests`

### 3. Error Prevention
- Prevents "--print requires input" error
- Handles server failures gracefully
- Manages network interruptions
- Validates input sanitization
- Tests resource exhaustion scenarios

### 4. Performance Requirements
- Instance creation: < 30 seconds
- Simple queries: < 5 seconds
- Complex queries: < 20 seconds
- Streaming responsiveness maintained
- Memory leak prevention

### 5. Visual Regression
- Landing page appearance
- Button layouts and styling
- Terminal interface consistency
- Status indicator states
- Cross-browser compatibility
- Responsive design validation

## Environment Requirements

### Prerequisites
- Node.js 16+ 
- Development server running on `localhost:3000`
- Playwright browsers installed

### Browser Support
- Chromium (primary)
- Firefox
- Safari/WebKit
- Mobile Chrome
- Mobile Safari
- Microsoft Edge

## Reporting and Debugging

### Test Reports
```bash
# View HTML report
npx playwright show-report

# Generate and open report
npm run test:report
```

### Screenshots and Videos
- Automatic screenshots on failure
- Video recording for failed tests
- Visual regression baseline comparison
- Debug screenshots available via helpers

### Performance Metrics
Tests collect and report:
- Instance creation time
- Response times per query type
- Memory usage patterns
- Network request counts
- Status transition timing

## Error Investigation

### Common Issues

1. **"--print requires input" Error**
   - Primary regression target
   - Check terminal output in test results
   - Review error-handling.spec.ts results

2. **Timeout Errors**
   - Check server accessibility
   - Review network conditions
   - Increase timeout if needed

3. **Visual Regression Failures**
   - Review screenshot diffs in `test-results/`
   - Check cross-browser compatibility
   - Update baselines if intentional changes

### Debug Mode
```bash
# Run specific test with debug
npx playwright test --debug claude-instance-creation

# Generate code for interactions
npx playwright codegen localhost:3000
```

## Continuous Integration

### CI Configuration Example
```yaml
- name: Run Claude Regression Tests
  run: |
    cd tests/playwright/claude-regression
    npm install
    npx playwright install --with-deps
    npm run test
  
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: tests/playwright/claude-regression/test-results/
```

### Performance Benchmarks
- Instance creation: 15-30s (acceptable)
- Simple responses: 1-5s (target)
- Complex responses: 5-20s (acceptable) 
- Memory usage: <100MB increase per session
- Visual consistency: >98% pixel accuracy

## Contributing

### Adding New Tests
1. Create test in appropriate `specs/` file
2. Use existing page objects and helpers
3. Add custom matchers if needed
4. Update visual baselines for UI changes
5. Document new test scenarios

### Best Practices
- Use descriptive test names
- Leverage page object model
- Include performance assertions
- Add visual validation for UI changes
- Handle async operations properly
- Clean up test artifacts

## Support

For issues or questions:
1. Check existing test results and logs
2. Review screenshot comparisons
3. Run tests locally with `--headed` mode
4. Check server logs during test execution
5. Verify environment requirements are met