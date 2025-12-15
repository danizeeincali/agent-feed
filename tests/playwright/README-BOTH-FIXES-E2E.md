# Processing Pills & Display Name E2E Test Suite

## Overview

This comprehensive E2E test suite validates two critical fixes implemented in the agent-feed application:

1. **Processing Pill Visibility**: Ensures "Posting..." pill with spinner appears during comment/reply submission
2. **Display Name Correctness**: Validates "John Connor" appears instead of "user" as the author name

## Test Architecture

### Test File Structure

```
tests/playwright/
├── processing-pills-and-display-name-e2e.spec.ts  # Main test suite
├── run-both-fixes-validation.sh                    # Test runner script
├── screenshots/both-fixes/                         # Screenshot output directory
│   ├── scenario1-step1-page-loaded.png
│   ├── scenario1-step2-comment-form-visible.png
│   ├── scenario1-step3-text-entered.png
│   ├── scenario1-step4-processing-pill-visible.png  # CRITICAL
│   ├── scenario1-step5-comment-posted-button-reset.png
│   ├── scenario2-step1-existing-comments-with-names.png
│   ├── scenario2-step2-new-comment-with-john-connor.png
│   ├── scenario2-step3-reply-with-john-connor.png
│   ├── scenario3-step1-two-posts-visible.png
│   ├── scenario3-step2-first-processing-second-enabled.png
│   ├── scenario3-step3-both-processing-independently.png
│   └── scenario3-step4-both-completed.png
└── reports/both-fixes/                             # Test reports
    ├── index.html                                  # HTML report
    ├── results.json                                # JSON results
    └── junit.xml                                   # JUnit format
```

## Test Scenarios

### Scenario 1: Top-Level Comment Processing Pill (6 Screenshots)

**Purpose**: Validate processing pill appears and functions correctly during top-level comment submission.

**Steps**:
1. Navigate to http://localhost:5173
2. Page loads with posts visible
3. Scroll to "Add Comment" section at bottom of first post
4. Type test text in textarea
5. Click "Post" button
6. **CRITICAL**: Verify button shows spinner + "Posting..." text
7. Verify button is disabled during processing
8. Wait for submission to complete
9. Verify comment appears in list
10. Verify button resets and is enabled again

**Key Assertions**:
```typescript
// Processing pill is visible
await expect(page.locator('button:has-text("Posting...")')).toBeVisible();

// Spinner is visible
await expect(page.locator('.animate-spin')).toBeVisible();

// Button is disabled
await expect(postButton).toBeDisabled();

// Comment appears after completion
await expect(page.locator(`text=${testComment}`)).toBeVisible();

// Button is reset and enabled
await expect(postButton).toBeEnabled();
```

### Scenario 2: Display Name Validation (4 Screenshots)

**Purpose**: Validate "John Connor" appears as author name instead of "user".

**Steps**:
1. Check existing comments for author names
2. Verify "John Connor" appears (not "user")
3. Create new top-level comment
4. Verify new comment shows "John Connor" as author
5. Create reply to existing comment
6. Verify reply shows "John Connor" as author

**Key Assertions**:
```typescript
// John Connor name is visible
await expect(page.locator('text=John Connor')).toBeVisible();

// Standalone "user" should not appear
const userCount = await page.locator('text=/^user$/i').count();
expect(userCount).toBe(0); // or minimal

// New comment has correct author
const authorInNewComment = commentContainer.locator('text=John Connor').first();
await expect(authorInNewComment).toBeVisible();
```

### Scenario 3: Multiple Posts Independence (4 Screenshots)

**Purpose**: Validate processing pills work independently across multiple posts.

**Steps**:
1. Open comment forms for two different posts
2. Submit first post's comment
3. Verify first post shows processing pill
4. **CRITICAL**: Verify second post button is still enabled
5. Submit second post's comment
6. Verify both posts process independently
7. Wait for both to complete
8. Verify both comments appear

**Key Assertions**:
```typescript
// First post is processing
await expect(firstProcessingButton).toBeVisible();
await expect(firstProcessingButton).toBeDisabled();

// Second post button is still enabled (CRITICAL)
await expect(secondPostButton).toBeEnabled();

// Second post can be submitted independently
await secondPostButton.click();
await expect(secondProcessingButton).toBeVisible();
```

## Edge Case Tests

### Edge Case 1: Rapid Sequential Comments

Tests processing state integrity when submitting multiple comments rapidly in sequence.

**Validates**:
- Button properly disables/enables between submissions
- Processing pill appears for each submission
- No state leakage between submissions

### Edge Case 2: Reply Processing Pills

Tests processing pills in nested comment (reply) scenarios.

**Validates**:
- Reply button shows processing state
- Reply processing is independent of parent comment
- Reply appears with correct display name after submission

## Running the Tests

### Quick Start

```bash
# Run all tests with default settings
./tests/playwright/run-both-fixes-validation.sh

# Run in headed mode (visible browser)
./tests/playwright/run-both-fixes-validation.sh --headed

# Run in debug mode with Playwright Inspector
./tests/playwright/run-both-fixes-validation.sh --debug

# Run with Playwright UI (interactive mode)
./tests/playwright/run-both-fixes-validation.sh --ui

# Run on specific browser
./tests/playwright/run-both-fixes-validation.sh --browser firefox
./tests/playwright/run-both-fixes-validation.sh --browser webkit

# Update visual snapshots
./tests/playwright/run-both-fixes-validation.sh --update-snapshots
```

### Manual Execution

```bash
# Run tests directly with Playwright
npx playwright test \
  --config=playwright.config.both-fixes.ts \
  --project=chromium

# Run specific test
npx playwright test \
  --config=playwright.config.both-fixes.ts \
  --grep "Scenario 1"

# View HTML report
npx playwright show-report tests/playwright/reports/both-fixes
```

## Prerequisites

### Required Services

1. **Backend Server**: Must be running on `http://localhost:3001`
   ```bash
   cd api-server
   npm start
   ```

2. **Frontend Server**: Must be running on `http://localhost:5173`
   ```bash
   cd frontend
   npm run dev
   ```

3. **Database**: SQLite database must be initialized and populated
   ```bash
   # Database should exist at: api-server/db/data.db
   # Run migrations if needed
   ```

### Environment Setup

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Verify installation
npx playwright --version
```

## Screenshot Analysis

### Critical Screenshots

The following screenshots are CRITICAL for validating the fixes:

1. **scenario1-step4-processing-pill-visible.png**
   - Must show "Posting..." text
   - Must show spinner animation
   - Button must appear disabled (opacity reduced)

2. **scenario2-step2-new-comment-with-john-connor.png**
   - Must show "John Connor" as author
   - Must NOT show "user" as author

3. **scenario3-step2-first-processing-second-enabled.png**
   - First post must show processing state
   - Second post button must appear enabled

### Screenshot Validation Checklist

Use this checklist to manually validate screenshots:

#### Processing Pill Screenshots
- [ ] "Posting..." or "Processing..." text is visible
- [ ] Spinner icon is visible and animated
- [ ] Button has disabled styling (reduced opacity)
- [ ] Button is in correct position (not layout shifted)
- [ ] Text is readable and properly styled

#### Display Name Screenshots
- [ ] "John Connor" appears as author name
- [ ] No standalone "user" text as author
- [ ] Author name is properly positioned
- [ ] Font and styling are correct
- [ ] Author name appears in all comments/replies

#### Independence Screenshots
- [ ] Each post's processing state is independent
- [ ] Other post buttons remain enabled
- [ ] No visual interference between posts
- [ ] Processing pills appear per-post, not globally

## Test Results Interpretation

### Success Criteria

All tests pass if:
1. All assertions pass without errors
2. All screenshots capture expected states
3. No timeout errors occur
4. No console errors appear
5. Tests complete within timeout (60s per test)

### Common Failure Scenarios

#### Failure: Processing pill not visible

**Symptoms**:
- Test fails at `expect(processingButton).toBeVisible()`
- Screenshot shows "Post" button instead of "Posting..."

**Causes**:
- Processing happens too fast (< 200ms)
- Button state not updating correctly
- Frontend state management issue

**Debug**:
```typescript
// Add longer wait time
await page.waitForTimeout(500);

// Check if processing state exists at all
const hasProcessingState = await page.locator('button:has-text("Posting...")').count();
console.log(`Processing state count: ${hasProcessingState}`);
```

#### Failure: Display name shows "user"

**Symptoms**:
- "John Connor" not visible in comments
- "user" appears instead

**Causes**:
- User profile data not loaded
- Display name not propagating from onboarding
- Database not seeded with correct user data

**Debug**:
```bash
# Check database for user data
sqlite3 api-server/db/data.db "SELECT * FROM users LIMIT 1;"

# Check if onboarding was completed
sqlite3 api-server/db/data.db "SELECT * FROM onboarding_state WHERE user_id=1;"
```

#### Failure: Multiple posts interfere

**Symptoms**:
- Second post button becomes disabled when first is processing
- Global processing state instead of per-post

**Causes**:
- React state not properly scoped to post ID
- Global state mutation
- Event handlers not properly bound

**Debug**:
```typescript
// Check if button IDs are unique
const firstButtonId = await firstPostButton.getAttribute('id');
const secondButtonId = await secondPostButton.getAttribute('id');
console.log(`Button IDs: ${firstButtonId}, ${secondButtonId}`);
```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: E2E Tests - Both Fixes

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start services
        run: |
          npm run start:backend &
          npm run start:frontend &
          sleep 10

      - name: Run E2E tests
        run: ./tests/playwright/run-both-fixes-validation.sh

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/playwright/screenshots/both-fixes/

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/playwright/reports/both-fixes/
```

## Performance Benchmarks

Expected test execution times:

| Test Scenario | Duration | Screenshots |
|--------------|----------|-------------|
| Scenario 1: Top-level comment | ~8-10s | 5 |
| Scenario 2: Display name | ~10-12s | 4 |
| Scenario 3: Multiple posts | ~15-18s | 4 |
| Edge Case 1: Rapid sequential | ~8-10s | 2 |
| Edge Case 2: Reply processing | ~10-12s | 3 |
| **Total** | **~51-62s** | **18+** |

## Troubleshooting

### Issue: Tests timeout

**Solution**:
```bash
# Increase timeout in playwright.config.both-fixes.ts
timeout: 120000, // 2 minutes
```

### Issue: Screenshots not captured

**Solution**:
```bash
# Ensure directory exists and is writable
mkdir -p tests/playwright/screenshots/both-fixes
chmod 755 tests/playwright/screenshots/both-fixes
```

### Issue: Browser not found

**Solution**:
```bash
# Reinstall Playwright browsers
npx playwright install --force
```

### Issue: Port already in use

**Solution**:
```bash
# Kill existing processes
lsof -ti:5173 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add screenshot capture at critical steps
3. Document test purpose and assertions
4. Update this README with new test scenarios
5. Ensure tests are idempotent (can run multiple times)
6. Clean up test data after execution

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review screenshot artifacts
3. Check browser console logs
4. Review backend logs: `api-server/logs/`
5. Open an issue with test output and screenshots
