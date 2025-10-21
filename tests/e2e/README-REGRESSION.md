# Ghost Post Fix - Regression Test Suite

## Overview

This regression test suite verifies that AVI DM and Quick Post functionality continue to work correctly after implementing the ghost post fix for the `connection_status` column issue.

## Test Coverage

### 1. AVI DM Functionality Tests
- ✅ Send message and receive AVI response
- ✅ Verify chat history persists across messages
- ✅ Validate message display in chat interface

### 2. Quick Post Functionality Tests
- ✅ Create post and verify it appears in feed
- ✅ Validate post count increases
- ✅ Verify post content validation
- ✅ Test empty post submission handling

### 3. Feed Functionality Tests
- ✅ Load posts correctly on page refresh
- ✅ Display post interactions (like, comment buttons)
- ✅ Handle empty feed gracefully
- ✅ Verify posts are visible and accessible

### 4. Ghost Post Prevention Validation
- ✅ Verify `connection_status` field handling in API requests
- ✅ Confirm posts persist after page reload (no ghost posts)
- ✅ Validate database schema compatibility

## Running the Tests

### Prerequisites
1. Start the application:
   ```bash
   cd /workspaces/agent-feed
   npm run dev
   ```

2. Ensure the app is accessible at http://localhost:5173

### Run All Regression Tests
```bash
cd /workspaces/agent-feed
npx playwright test tests/e2e/ghost-post-regression.spec.ts
```

### Run Specific Test Suite
```bash
# AVI DM tests only
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "AVI DM"

# Quick Post tests only
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Quick Post"

# Feed tests only
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Feed Functionality"

# Ghost post prevention tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Ghost Post Prevention"
```

### Run in UI Mode (Interactive)
```bash
npx playwright test tests/e2e/ghost-post-regression.spec.ts --ui
```

### Run in Debug Mode
```bash
npx playwright test tests/e2e/ghost-post-regression.spec.ts --debug
```

### Generate HTML Report
```bash
npx playwright test tests/e2e/ghost-post-regression.spec.ts --reporter=html
npx playwright show-report
```

## Test Artifacts

### Screenshots
Location: `/workspaces/agent-feed/tests/screenshots/regression/`

Generated screenshots:
- `avi-dm-working.png` - AVI DM chat interface with message exchange
- `quick-post-working.png` - Quick post creation and feed display
- `feed-functional.png` - Feed with visible post interactions

### Videos
Videos are recorded on test failure and saved to `test-results/` directory.

### Logs
Test execution logs include:
- API request/response interception logs
- Post count validation logs
- Success/failure indicators for each test

## Expected Results

All tests should **PASS** after the ghost post fix:

```
✓ AVI DM: Send message and receive response
✓ AVI DM: Maintain chat history
✓ Quick Post: Create and display post
✓ Quick Post: Validate content
✓ Feed: Load posts on refresh
✓ Feed: Display interactions
✓ Feed: Handle empty feed
✓ Ghost Post: Verify connection_status handling
✓ Ghost Post: Verify post persistence
```

## Troubleshooting

### Test Failures

#### "Element not found" errors
- Verify the app is running on http://localhost:5173
- Check that UI component selectors match current implementation
- Review screenshot/video to see actual UI state

#### "Timeout" errors
- Ensure backend API is running
- Check network tab for failed API requests
- Verify database is accessible and migrations are up to date

#### "Post not appearing in feed"
- Verify database has `connection_status` column with proper default
- Check API logs for post creation errors
- Validate the ghost post fix is properly deployed

### Debugging Tips

1. **Use UI Mode** for interactive debugging:
   ```bash
   npx playwright test --ui
   ```

2. **Enable trace recording**:
   ```bash
   npx playwright test --trace on
   ```

3. **View test artifacts**:
   ```bash
   npx playwright show-report
   ```

4. **Check console logs** in test output for detailed error messages

## Related Documentation

- [GHOST-POST-FIX-SPEC.md](/workspaces/agent-feed/GHOST-POST-FIX-SPEC.md) - Fix specification
- [CONNECTION-STATUS-FIX-E2E-VALIDATION.md](/workspaces/agent-feed/CONNECTION-STATUS-FIX-E2E-VALIDATION.md) - E2E validation plan
- [Playwright Documentation](https://playwright.dev/docs/intro)

## Success Criteria

✅ **All 9 regression tests pass**
✅ **AVI DM chat functional** - Messages sent and responses received
✅ **Quick Post functional** - Posts created and visible in feed
✅ **Feed functional** - Posts load, interactions visible
✅ **No ghost posts** - Posts persist after reload
✅ **Screenshots captured** - Visual evidence of working features

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Regression Tests
  run: |
    npm run dev &
    sleep 5
    npx playwright test tests/e2e/ghost-post-regression.spec.ts
```

## Maintenance

- Update selectors if UI components change
- Add new tests for additional features affected by schema changes
- Review and update timeouts based on performance metrics
- Keep test data unique using timestamps to avoid conflicts
