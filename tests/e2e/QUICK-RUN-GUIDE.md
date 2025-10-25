# Quick Run Guide - Link Logger E2E Tests

## Run Tests

```bash
cd /workspaces/agent-feed

# Run simple test (recommended)
npx playwright test tests/e2e/link-logger-simple-test.spec.ts --project=chromium

# Run comprehensive test
npx playwright test tests/e2e/link-logger-comment-validation.spec.ts --project=chromium

# Run both tests
npx playwright test tests/e2e/link-logger*.spec.ts --project=chromium
```

## View Results

```bash
# View screenshots
ls -lh tests/screenshots/link-logger*.png

# View latest screenshot
open tests/screenshots/link-logger-07-comment-found.png

# View test report
cat tests/e2e/LINK-LOGGER-PLAYWRIGHT-TEST-RESULTS.md
```

## Manual Validation

1. Open http://localhost:5173
2. Create post: `Test [timestamp] - https://www.linkedin.com/posts/test-123`
3. Wait 60 seconds
4. Check for link-logger comment (nested under post, NOT standalone)

## Check Backend

```bash
# Is agent-worker running?
ps aux | grep agent-worker

# Recent link-logger activity?
sqlite3 api-server/database.db "SELECT * FROM posts WHERE author_name='link-logger' ORDER BY created_at DESC LIMIT 3;"

# Work queue status?
sqlite3 api-server/database.db "SELECT status, COUNT(*) FROM work_queue GROUP BY status;"
```

## Troubleshooting

**Test times out?**
- Check link-logger agent is running
- Verify URL detection service active
- Increase timeout in test file

**Post not submitting?**
- Check API is connected (green status)
- Check browser console for errors
- Try manual post first

**Screenshots blank?**
- Frontend may not be loading
- Check port 5173 is correct
- Try http://127.0.0.1:5173 instead
