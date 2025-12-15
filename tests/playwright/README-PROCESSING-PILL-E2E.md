# Comment Processing Pill E2E Test Suite

## Overview

This test suite validates the comment processing pill UI with visual screenshots, ensuring users receive clear feedback during comment submission.

## Test Coverage

### 1. Main Processing Flow Test
**File**: `comment-processing-pill-e2e.spec.ts`

**Scenario**: Complete user journey from form to submission
- Opens Agent Feed
- Navigates to "Get-to-Know-You" post
- Expands comments section
- Opens comment form
- Types comment text
- **Screenshot 1**: Form ready state
- Submits comment
- **Screenshot 2**: Processing state (spinner + disabled form)
- Waits for completion
- **Screenshot 3**: Success state (comment visible)

### 2. Blue Pill Fallback Test
**Scenario**: Validates the blue processing pill below form
- Submits comment
- Verifies "Processing comment..." text appears
- Confirms blue background styling (`bg-blue-50`)
- **Screenshot**: Blue pill state

### 3. Rapid Submission Prevention Test
**Scenario**: Ensures no duplicate comments from rapid clicks
- Submits comment
- Attempts multiple rapid clicks
- Verifies button is disabled during processing
- **Screenshot**: Disabled state
- Confirms only 1 comment is created (not 3)

### 4. State Persistence Test
**Scenario**: Processing state survives component re-renders
- Submits comment
- Takes screenshots at 0.5s and 1.5s intervals
- Verifies processing indicator remains visible
- Ensures no UI flicker during processing

### 5. Agent Question Test
**Scenario**: Processing pill for agent-triggering questions
- Asks question: "What is your favorite color?"
- **Screenshot 1**: Before submission
- **Screenshot 2**: During processing
- **Screenshot 3**: After agent response
- Verifies both user question and agent response appear

## Prerequisites

### Install Dependencies
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### Ensure Backend is Running
```bash
# Terminal 1: Backend
cd api-server
node server.js

# Terminal 2: Frontend (handled by Playwright webServer config)
# Auto-starts with `npm run dev`
```

## Running Tests

### Run All Tests
```bash
npx playwright test --config=playwright.config.processing-pill.ts
```

### Run Single Test
```bash
npx playwright test --config=playwright.config.processing-pill.ts -g "should show processing pill when submitting comment"
```

### Run with UI Mode (Interactive)
```bash
npx playwright test --config=playwright.config.processing-pill.ts --ui
```

### Debug Mode
```bash
npx playwright test --config=playwright.config.processing-pill.ts --debug
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --config=playwright.config.processing-pill.ts --headed
```

## Screenshot Locations

All screenshots are saved to:
```
tests/playwright/screenshots/
├── processing-pill-1-ready.png
├── processing-pill-2-processing.png
├── processing-pill-3-success.png
├── processing-pill-blue-fallback.png
├── processing-pill-rapid-submission.png
├── processing-pill-state-0.5s.png
├── processing-pill-state-1.5s.png
├── processing-pill-question-before.png
├── processing-pill-question-processing.png
└── processing-pill-question-complete.png
```

## Test Results

### HTML Report
```bash
npx playwright show-report tests/playwright/playwright-report
```

### JSON Results
Located at: `tests/playwright/test-results.json`

## Expected Behavior

### Processing State Indicators
1. **Button Text Change**: "Add Comment" → "Adding Comment..."
2. **Spinner Icon**: Loader2 component with `animate-spin` class
3. **Form Disabled**: Textarea becomes disabled
4. **Blue Pill (Fallback)**: "Processing comment..." with blue background

### Success Criteria
✅ All 5 tests pass
✅ 10 screenshots captured successfully
✅ No duplicate comments created
✅ Processing state persists throughout submission
✅ Agent responses appear correctly

## Troubleshooting

### Test Failures

**Issue**: "Timeout waiting for processing indicator"
```bash
# Solution: Check if backend is running
curl http://localhost:3000/health

# Restart backend
cd api-server && node server.js
```

**Issue**: "Element not visible"
```bash
# Solution: Increase wait times in flaky tests
# Edit spec file and adjust waitForTimeout values
```

**Issue**: "Screenshot directory not found"
```bash
# Solution: Manually create directory
mkdir -p tests/playwright/screenshots
```

### Slow Tests
- Default timeout: 60s per test
- Adjust in `playwright.config.processing-pill.ts`:
```typescript
timeout: 120000, // 2 minutes
```

### Backend Connection Issues
```bash
# Check if ports are available
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Kill processes if needed
kill -9 <PID>
```

## Configuration Details

**File**: `playwright.config.processing-pill.ts`

Key settings:
- **Workers**: 1 (sequential execution)
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 60s per test
- **Browser**: Chromium (Desktop Chrome)
- **Slow Motion**: 100ms (for screenshot capture)
- **Auto-start**: Frontend dev server

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Processing Pill E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd api-server
          node server.js &
          sleep 5

      - name: Run E2E tests
        run: npx playwright test --config=playwright.config.processing-pill.ts

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: processing-pill-screenshots
          path: tests/playwright/screenshots/

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright/playwright-report/
```

## Visual Regression Testing (Future)

To add visual regression tests:
```bash
npm install --save-dev @playwright/test playwright-screenshot-checker

# Update spec to use screenshot comparison
await expect(page).toHaveScreenshot('processing-pill-baseline.png', {
  maxDiffPixels: 100,
});
```

## Maintenance

### Update Selectors
If UI changes break tests, update selectors in:
```typescript
// Example: Change button selector
const submitButton = post.locator('button[data-testid="submit-comment"]');
```

### Add New Tests
1. Add test case to `comment-processing-pill-e2e.spec.ts`
2. Follow naming pattern: `processing-pill-{feature}-{state}.png`
3. Update this README with new screenshot

### Performance Monitoring
Track test execution time:
```bash
npx playwright test --config=playwright.config.processing-pill.ts --reporter=html
# Check HTML report for timing details
```

## Success Metrics

- **Test Pass Rate**: 100%
- **Screenshot Capture Rate**: 10/10
- **Average Test Duration**: ~15-20s per test
- **No Duplicate Comments**: 100% prevention
- **Processing State Visibility**: 100% during submission

## Related Documentation

- Main test suite: `/tests/README.md`
- Frontend components: `/frontend/src/components/CommentThread.tsx`
- Backend orchestrator: `/api-server/avi/orchestrator.js`
- Onboarding flow: `/docs/ONBOARDING-FLOW-SPEC.md`

---

**Last Updated**: 2025-11-14
**Test Suite Version**: 1.0.0
**Playwright Version**: Latest
