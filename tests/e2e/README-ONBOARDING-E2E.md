# Onboarding E2E Test Suite

**Status:** RED Phase (Tests Will Fail)
**Purpose:** Complete user experience validation with screenshot capture

## Overview

This E2E test suite validates the complete onboarding flow when a user comments their name on the Get-to-Know-You agent's welcome post. Tests use real browser automation with Playwright and NO MOCKS.

## Test Coverage

### 1. Complete User Journey (10+ assertions)
- Navigate to http://localhost:5173
- Find Get-to-Know-You agent post
- Click comment button
- Type "Nate Dog" in comment field
- Submit comment
- **Screenshot 1:** Comment submission
- Wait for Get-to-Know-You comment response: "Nice to meet you, Nate Dog!"
- **Screenshot 2:** Get-to-Know-You comment visible
- Wait for Get-to-Know-You new post: Use case question
- **Screenshot 3:** Get-to-Know-You use case question post
- Verify NO technical terms (code, debugging, architecture)
- Wait for Avi welcome post: "Welcome, Nate Dog!"
- **Screenshot 4:** Avi's warm welcome post
- Verify warm, conversational tone (NO technical jargon)
- Verify all 3 responses visible simultaneously

### 2. Real-Time Updates (5+ tests)
- Toast notifications appear for each response
- Comment counter updates immediately
- Posts appear without page refresh
- WebSocket connection remains stable

### 3. Visual Regression (3+ tests)
- Compare screenshots to baseline
- Verify response sequence order
- Verify no duplicate responses

### 4. Edge Cases (3+ tests)
- Rapid double-click protection
- Empty/whitespace name validation
- Long name input handling

## Expected Failures (RED Phase)

These tests WILL fail until backend fixes are implemented:

1. **Comment Routing Failure**
   - Expected: Get-to-Know-You agent responds
   - Actual: Avi responds with technical tone

2. **Response Sequence Failure**
   - Expected: Comment → New Post → Avi Welcome
   - Actual: Only partial sequence or wrong order

3. **Tone Validation Failure**
   - Expected: Avi uses warm, conversational tone
   - Actual: Avi uses technical jargon

## Running Tests

### Prerequisites
```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Run Full Suite
```bash
# Run all onboarding E2E tests
npx playwright test --config playwright.config.onboarding.ts

# Run with UI (recommended for debugging)
npx playwright test --config playwright.config.onboarding.ts --ui

# Run specific test
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding"
```

### Run in Different Browsers
```bash
# Chromium only (default)
npx playwright test --config playwright.config.onboarding.ts --project=chromium

# Firefox
npx playwright test --config playwright.config.onboarding.ts --project=firefox

# WebKit (Safari)
npx playwright test --config playwright.config.onboarding.ts --project=webkit

# All browsers
npx playwright test --config playwright.config.onboarding.ts --project=chromium --project=firefox --project=webkit
```

### View Results
```bash
# Open HTML report
npx playwright show-report tests/e2e/reports

# View screenshots
open tests/screenshots/onboarding/

# View videos (failures only)
open tests/e2e/test-results/
```

## Test Structure

```
tests/
├── e2e/
│   ├── onboarding-user-flow.spec.ts   # Main E2E test suite
│   ├── reports/                       # HTML/JSON/JUnit reports
│   └── test-results/                  # Videos, traces, screenshots
├── screenshots/
│   └── onboarding/                    # All captured screenshots
│       ├── 00-initial-feed.png
│       ├── 01-comment-typed.png
│       ├── 02-comment-submitted.png
│       ├── 03-gtk-comment-response.png
│       ├── 04-gtk-usecase-post.png
│       ├── 05-avi-welcome-post.png
│       ├── 06-complete-flow-all-responses.png
│       ├── toast-notifications.png
│       ├── comment-counter-update.png
│       ├── no-refresh-update.png
│       └── baseline-*.png             # Visual regression baselines
└── playwright.config.onboarding.ts    # Playwright configuration
```

## Screenshot Gallery

All screenshots are automatically saved to `/tests/screenshots/onboarding/`:

1. **00-initial-feed.png** - Initial feed state
2. **01-comment-typed.png** - After typing "Nate Dog"
3. **02-comment-submitted.png** - Comment submitted
4. **03-gtk-comment-response.png** - Get-to-Know-You comment visible
5. **04-gtk-usecase-post.png** - Get-to-Know-You use case post
6. **05-avi-welcome-post.png** - Avi welcome post
7. **06-complete-flow-all-responses.png** - All 3 responses visible

## Debugging

### Run in Debug Mode
```bash
# Step through tests
npx playwright test --config playwright.config.onboarding.ts --debug

# Run specific test in debug mode
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding" --debug
```

### View Traces
```bash
# Generate trace
npx playwright test --config playwright.config.onboarding.ts --trace on

# Open trace viewer
npx playwright show-trace tests/e2e/test-results/.../trace.zip
```

### Inspect WebSocket Events
Tests automatically log WebSocket events to console:
- `🔌 WebSocket connection established`
- `📨 WebSocket event received: comment_added`
- `📨 WebSocket event received: post_created`

## Success Criteria

Tests will PASS when:

1. ✅ Get-to-Know-You agent responds to name comment
2. ✅ Get-to-Know-You creates use case question post
3. ✅ Avi creates welcome post with warm tone (NO technical jargon)
4. ✅ All 3 responses visible simultaneously
5. ✅ Toast notifications appear for each response
6. ✅ Comment counter updates in real-time
7. ✅ No page refresh required (WebSocket updates)
8. ✅ No duplicate responses
9. ✅ Response sequence order correct

## Related Documentation

- [Onboarding Flow Specification](/docs/ONBOARDING-FLOW-SPEC.md)
- [Onboarding Architecture](/docs/ONBOARDING-ARCHITECTURE.md)
- [Comment Routing Spec](/docs/COMMENT-ROUTING-SPEC.md)
- [WebSocket Events](/docs/WEBSOCKET-EVENTS.md)

## Troubleshooting

### Test Timeout
```bash
# Increase timeout
npx playwright test --config playwright.config.onboarding.ts --timeout=180000
```

### WebSocket Connection Issues
1. Check backend is running: `curl http://localhost:3001/api/health`
2. Check WebSocket server: `curl http://localhost:3001/socket.io/`
3. Check browser console for WebSocket errors

### Screenshot Not Captured
- Ensure `/tests/screenshots/onboarding/` directory exists
- Check disk space
- Verify Playwright has write permissions

### Backend Not Starting
```bash
# Start backend manually
cd api-server
npm start

# Check logs
tail -f logs/backend.log
```

### Frontend Not Loading
```bash
# Start frontend manually
cd frontend
npm run dev

# Check logs
tail -f logs/frontend.log
```

## Next Steps

After these tests are GREEN:
1. Run integration tests: `npm run test:integration`
2. Run unit tests: `npm run test:unit`
3. Manual validation with real user flows
4. Performance testing with multiple concurrent users
