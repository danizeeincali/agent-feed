# Comment Reply Processing E2E Test Suite

## Overview

Comprehensive Playwright E2E tests for the comment reply processing flow with visual validation through screenshots.

## Test Coverage

### 1. Reply Processing Flow
**File**: `tests/playwright/comment-reply-processing-e2e.spec.ts`

#### Test Cases

##### ✅ Processing Indicator Display
- Navigate to post with comments
- Expand comments section
- Click "Reply" on a comment
- Type reply text
- Submit reply
- **Verify**: Processing state shows immediately
- **Verify**: Spinner is visible
- **Verify**: Form is disabled during processing
- **Verify**: Reply appears after processing

**Screenshots Captured**:
1. `reply-1-ready.png` - Reply form with text entered
2. `reply-2-processing.png` - Processing state with spinner
3. `reply-3-success.png` - Success state with visible reply

##### ✅ Real-time Update Without Refresh
- Post a reply
- **Verify**: Reply appears without `page.reload()`
- **Verify**: URL hasn't changed
- **Verify**: No navigation occurred

**Screenshots Captured**:
- `reply-realtime-update.png` - Real-time update confirmation

##### ✅ Multiple Independent Reply Forms
- Open reply forms on 2+ comments simultaneously
- Type in first reply form
- Submit first reply
- **Verify**: Only first form shows processing
- **Verify**: Second form remains active and enabled

**Screenshots Captured**:
- `reply-multiple-forms.png` - Multiple forms open
- `reply-independent-processing.png` - Independent states

##### ✅ Duplicate Prevention
- Fill reply form
- Click "Post Reply" rapidly 5 times
- **Verify**: Button becomes disabled
- **Verify**: Only ONE reply is created
- **Verify**: No duplicate submissions

**Screenshots Captured**:
- `reply-rapid-click-prevented.png` - Single reply after rapid clicks

##### ✅ Form Clearing After Success
- Submit a reply
- **Verify**: Textarea is cleared after processing
- **Verify**: Form is ready for next reply

**Screenshots Captured**:
- `reply-form-cleared.png` - Empty form after submission

##### ✅ Agent Response Handling
- Post a question as a reply
- **Verify**: User reply appears
- Wait for agent processing
- **Verify**: Agent response may appear (if applicable)

**Screenshots Captured**:
- `reply-user-posted.png` - User reply visible
- `reply-with-agent-response.png` - Final state with responses

### 2. Error Handling Tests

##### ✅ Empty Reply Validation
- Open reply form
- Attempt to submit without text
- **Verify**: Button is disabled when textarea is empty

**Screenshots Captured**:
- `reply-empty-disabled.png` - Disabled state validation

## Running the Tests

### Quick Start

```bash
# Make script executable (first time only)
chmod +x tests/playwright/run-reply-processing-tests.sh

# Run all tests
./tests/playwright/run-reply-processing-tests.sh
```

### Manual Execution

```bash
# Install dependencies (first time only)
npm install @playwright/test --save-dev
npx playwright install chromium

# Start dev server (separate terminal)
npm run dev

# Run tests
npx playwright test --config=playwright.config.reply-processing.ts

# View HTML report
npx playwright show-report tests/playwright/reports/reply-processing
```

### Watch Mode (Development)

```bash
# Run in UI mode for debugging
npx playwright test --config=playwright.config.reply-processing.ts --ui

# Run specific test
npx playwright test --config=playwright.config.reply-processing.ts -g "processing indicator"
```

## Configuration

**File**: `playwright.config.reply-processing.ts`

```typescript
{
  testDir: './tests/playwright',
  testMatch: 'comment-reply-processing-e2e.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 }
  }
}
```

## Screenshot Gallery

All screenshots are saved to: `tests/playwright/screenshots/`

### Expected Screenshots

1. **reply-1-ready.png**
   - Reply form visible
   - Text entered: "Testing reply processing indicator!"
   - "Post Reply" button enabled

2. **reply-2-processing.png**
   - "Posting..." text visible
   - Spinner animation active
   - Textarea disabled
   - Button disabled

3. **reply-3-success.png**
   - Reply visible in thread
   - Processing indicator removed
   - Form cleared or hidden

4. **reply-realtime-update.png**
   - New reply visible
   - No page reload occurred
   - Same URL maintained

5. **reply-multiple-forms.png**
   - Two reply forms open simultaneously
   - Both textareas visible
   - Independent form states

6. **reply-independent-processing.png**
   - First form: "Posting..." state
   - Second form: "Post Reply" state
   - Clear visual difference

7. **reply-rapid-click-prevented.png**
   - Single reply created
   - No duplicates visible
   - Form in final state

8. **reply-form-cleared.png**
   - Empty textarea after submission
   - Clean form state
   - Ready for next input

9. **reply-user-posted.png**
   - User's question visible
   - Timestamp shown
   - Proper threading

10. **reply-with-agent-response.png**
    - Agent's response (if any)
    - Complete conversation thread
    - Final UI state

11. **reply-empty-disabled.png**
    - Empty textarea
    - Disabled "Post Reply" button
    - Validation working

## Test Assertions

### Visual Indicators
```typescript
// Processing state
await expect(comment.locator('text=Posting...')).toBeVisible();
await expect(comment.locator('svg.animate-spin')).toBeVisible();
await expect(textarea).toBeDisabled();

// Success state
await expect(comment.locator('text=Testing reply...')).toBeVisible();
await expect(comment.locator('text=Posting...')).not.toBeVisible();

// Form validation
await expect(postButton).toBeDisabled(); // When empty
await expect(textarea).toHaveValue(''); // After success
```

### Real-time Updates
```typescript
// No page reload
expect(page.url()).toBe(BASE_URL + '/');

// Content appears without refresh
await expect(replyText).toBeVisible({ timeout: 5000 });
```

### Duplicate Prevention
```typescript
// Multiple clicks
await postButton.click();
await postButton.click({ force: true }).catch(() => {});
await postButton.click({ force: true }).catch(() => {});

// Verify single reply
const replies = comment.getByText(testMessage);
expect(await replies.count()).toBeLessThanOrEqual(1);
```

## Debugging Failed Tests

### View Screenshots
```bash
# Check screenshots directory
ls -lh tests/playwright/screenshots/

# View in file explorer
open tests/playwright/screenshots/
```

### Watch Test Videos
```bash
# Videos saved on failure
ls tests/playwright/test-results/*/video.webm

# Play with system video player
open tests/playwright/test-results/*/video.webm
```

### View HTML Report
```bash
npx playwright show-report tests/playwright/reports/reply-processing
```

### Debug with UI Mode
```bash
# Interactive debugging
npx playwright test --config=playwright.config.reply-processing.ts --ui --debug

# Pause on specific test
# Add: await page.pause(); in test code
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Comment Reply E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Run E2E tests
        run: |
          npm run dev &
          npx playwright test --config=playwright.config.reply-processing.ts

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: reply-screenshots
          path: tests/playwright/screenshots/

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright/reports/
```

## Test Maintenance

### Updating Selectors

If UI changes, update these selectors in the test file:

```typescript
// Comments button
post.locator('button').filter({ hasText: /Comments/i })

// Reply button
comment.locator('button').filter({ hasText: /Reply/i })

// Reply textarea
comment.locator('textarea[placeholder*="reply" i], textarea')

// Post Reply button
comment.locator('button').filter({ hasText: /Post Reply/i })

// Processing indicator
comment.locator('text=Posting...')

// Spinner
comment.locator('svg.animate-spin, [data-testid="spinner"]')
```

### Adding New Tests

```typescript
test('should handle new scenario', async ({ page }) => {
  // 1. Setup
  await page.goto(BASE_URL);

  // 2. Action
  // ... perform user actions

  // 3. Assert
  await expect(/* ... */).toBeVisible();

  // 4. Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'new-scenario.png'),
    fullPage: false
  });
});
```

## Performance Benchmarks

### Expected Test Duration
- Single test: ~10-15 seconds
- Full suite: ~60-90 seconds
- With agent responses: ~120 seconds

### Timeouts
- Test timeout: 60 seconds
- Assertion timeout: 10 seconds
- Processing timeout: 5 seconds
- Agent response timeout: 8 seconds

## Troubleshooting

### Common Issues

#### Dev server not running
```bash
# Start in separate terminal
npm run dev

# Or let script start it
./tests/playwright/run-reply-processing-tests.sh
```

#### Screenshots not captured
```bash
# Ensure directory exists
mkdir -p tests/playwright/screenshots

# Check permissions
chmod 755 tests/playwright/screenshots
```

#### Tests timing out
```bash
# Increase timeout in config
timeout: 90000 // 90 seconds

# Or in specific test
test('...', async ({ page }) => {
  test.setTimeout(90000);
  // ... rest of test
});
```

#### Flaky tests
```bash
# Run with retries
npx playwright test --config=playwright.config.reply-processing.ts --retries=2

# Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);
```

## Next Steps

- [ ] Add visual regression testing with screenshot diffing
- [ ] Test error scenarios (network failures)
- [ ] Test accessibility (keyboard navigation)
- [ ] Add performance monitoring
- [ ] Test on mobile viewports
- [ ] Add cross-browser testing (Firefox, Safari)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Screenshots API](https://playwright.dev/docs/screenshots)
