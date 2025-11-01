# E2E Tests for Real-time Comments

## Overview

These tests validate the real-time comment system using **real Socket.IO connections** with no mocks.

## Test Files

### 1. `comments-realtime.spec.ts`
Comprehensive real-time validation tests including:
- Immediate comment display without refresh
- Multi-user real-time updates via Socket.IO
- Connection state verification
- Markdown rendering validation

### 2. `comments-realtime-simple.spec.ts`
Simplified core functionality tests with progressive screenshots:
- UI state validation
- Comment form interaction
- Text input testing
- Optimistic updates

## Prerequisites

**Backend must be running:**
```bash
curl http://localhost:3001/health
```

**Frontend must be running:**
```bash
curl http://localhost:5173
```

## Running Tests

### Run all real-time tests
```bash
npx playwright test src/tests/e2e/comments-realtime.spec.ts --project=realtime-comments
```

### Run simplified tests
```bash
npx playwright test src/tests/e2e/comments-realtime-simple.spec.ts --project=realtime-comments
```

### Run with UI mode (debug)
```bash
npx playwright test src/tests/e2e/comments-realtime.spec.ts --ui
```

### Generate HTML report
```bash
npx playwright show-report
```

## Screenshot Output

Screenshots are saved to: `test-results/screenshots/`

Progressive captures include:
- Initial page load
- Comment button click
- Form expansion
- Text input
- Submit action
- Post-submission state
- Socket.IO connection state

## No Mocks Policy

All tests use real services:
- ✅ Real Socket.IO connection to localhost:3001
- ✅ Real frontend at localhost:5173
- ✅ Real database operations
- ✅ Real WebSocket events
- ❌ No mocked responses
- ❌ No stubbed functions

## Test Strategy

1. **Visual Validation**: Screenshots capture UI state at each step
2. **Real-time Verification**: Tests actual WebSocket message flow
3. **Multi-Context**: Simulates multiple users with separate browser contexts
4. **Progressive Testing**: Each test builds on previous validations

## Known Issues

1. **Headed Mode**: Requires X server (use headless in CI)
2. **Selectors**: May need data-testid attributes for stability
3. **Timing**: Some tests may timeout on slow connections

## Recommendations

- Add `data-testid` attributes to components
- Use `waitForSelector` instead of `waitForTimeout`
- Run in headless mode for CI/CD
- Ensure services are running before test execution
