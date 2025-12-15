# Comment Reply E2E Tests - Quick Reference

## Run Tests

```bash
# Quick run (auto-starts dev server)
./tests/playwright/run-reply-processing-tests.sh

# Manual run
npm run dev  # Terminal 1
npx playwright test --config=playwright.config.reply-processing.ts  # Terminal 2

# UI mode (debugging)
npx playwright test --config=playwright.config.reply-processing.ts --ui

# View report
npx playwright show-report tests/playwright/reports/reply-processing
```

## Test Files

| File | Purpose |
|------|---------|
| `tests/playwright/comment-reply-processing-e2e.spec.ts` | Test suite |
| `playwright.config.reply-processing.ts` | Config |
| `tests/playwright/run-reply-processing-tests.sh` | Runner script |
| `tests/playwright/screenshots/` | Screenshot output |

## Test Scenarios

### 1. Processing Indicator
- Opens reply form
- Submits reply
- Verifies spinner + "Posting..." text
- Confirms textarea is disabled

**Screenshots**: `reply-1-ready.png`, `reply-2-processing.png`, `reply-3-success.png`

### 2. Real-time Update
- Posts reply
- Verifies reply appears WITHOUT page reload
- Confirms URL unchanged

**Screenshots**: `reply-realtime-update.png`

### 3. Multiple Forms
- Opens 2+ reply forms
- Submits first form
- Verifies second form stays enabled

**Screenshots**: `reply-multiple-forms.png`, `reply-independent-processing.png`

### 4. Duplicate Prevention
- Clicks "Post Reply" 5 times rapidly
- Verifies only 1 reply created
- Confirms button disabled after first click

**Screenshots**: `reply-rapid-click-prevented.png`

### 5. Form Clearing
- Submits reply
- Verifies textarea cleared after success

**Screenshots**: `reply-form-cleared.png`

### 6. Agent Response
- Posts question as reply
- Waits for agent processing
- Captures final state

**Screenshots**: `reply-user-posted.png`, `reply-with-agent-response.png`

### 7. Empty Validation
- Attempts to submit empty reply
- Verifies button is disabled

**Screenshots**: `reply-empty-disabled.png`

## Key Assertions

```typescript
// Processing state
await expect(comment.locator('text=Posting...')).toBeVisible();
await expect(comment.locator('svg.animate-spin')).toBeVisible();
await expect(textarea).toBeDisabled();

// Success state
await expect(replyText).toBeVisible({ timeout: 5000 });
await expect(textarea).toHaveValue(''); // Cleared

// Duplicate prevention
expect(await replies.count()).toBeLessThanOrEqual(1);

// No page reload
expect(page.url()).toBe(BASE_URL + '/');
```

## Debugging

```bash
# View screenshots
ls -lh tests/playwright/screenshots/

# Check test videos (on failure)
ls tests/playwright/test-results/*/video.webm

# Run single test
npx playwright test --config=playwright.config.reply-processing.ts -g "processing indicator"

# Debug mode
npx playwright test --config=playwright.config.reply-processing.ts --debug
```

## Expected Screenshots

1. `reply-1-ready.png` - Form with text
2. `reply-2-processing.png` - Spinner visible
3. `reply-3-success.png` - Reply shown
4. `reply-realtime-update.png` - No refresh
5. `reply-multiple-forms.png` - 2 forms open
6. `reply-independent-processing.png` - Independent states
7. `reply-rapid-click-prevented.png` - Single reply
8. `reply-form-cleared.png` - Empty form
9. `reply-user-posted.png` - User reply
10. `reply-with-agent-response.png` - With agent
11. `reply-empty-disabled.png` - Validation

## Common Issues

**Tests timeout**: Increase timeout in config or add `test.setTimeout(90000)`

**Dev server not running**: Start with `npm run dev` first

**Screenshots missing**: Check `mkdir -p tests/playwright/screenshots`

**Flaky tests**: Add `await page.waitForLoadState('networkidle')`

## Performance

- Single test: ~10-15s
- Full suite: ~60-90s
- With agent responses: ~120s

## CI/CD Integration

```yaml
- name: Run E2E tests
  run: |
    npm run dev &
    npx playwright test --config=playwright.config.reply-processing.ts

- name: Upload screenshots
  uses: actions/upload-artifact@v3
  with:
    name: reply-screenshots
    path: tests/playwright/screenshots/
```
