# Real-Time Comment Flow E2E Tests - Production Validation

## Overview

This test suite provides **comprehensive production validation** for real-time comment functionality. All tests use **real backend APIs**, **real WebSocket connections**, and **real database state** - NO MOCKS!

## Test File Location

```
/workspaces/agent-feed/frontend/src/tests/e2e/comment-realtime-flow.spec.ts
```

## Prerequisites

### 1. Backend Server Running

```bash
# Start the API server (must be running on port 3001)
cd /workspaces/agent-feed/api-server
npm run dev
```

### 2. Frontend Server Running

```bash
# Start the frontend (must be running on port 5173)
cd /workspaces/agent-feed/frontend
npm run dev
```

### 3. Database Ready

Ensure PostgreSQL or your configured database is running and accessible.

## Running the Tests

### Run All Tests

```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e:realtime
```

### Run Specific Test

```bash
# Test 1: Comment Counter
npx playwright test comment-realtime-flow.spec.ts --grep "comment counter increments"

# Test 2: Toast Notifications
npx playwright test comment-realtime-flow.spec.ts --grep "toast notification shows"

# Test 3: Real-Time Appearance
npx playwright test comment-realtime-flow.spec.ts --grep "new comment appears immediately"

# Test 4: Markdown Rendering
npx playwright test comment-realtime-flow.spec.ts --grep "avi response renders with markdown"

# Test 5: Stress Test
npx playwright test comment-realtime-flow.spec.ts --grep "handles multiple rapid comments"

# Test 6: WebSocket Recovery
npx playwright test comment-realtime-flow.spec.ts --grep "recovers from temporary WebSocket"

# Database Validation
npx playwright test comment-realtime-flow.spec.ts --grep "UI comment count matches database"
```

### Run with UI Mode (Debugging)

```bash
npx playwright test comment-realtime-flow.spec.ts --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test comment-realtime-flow.spec.ts --headed
```

### Run with Debug Mode

```bash
npx playwright test comment-realtime-flow.spec.ts --debug
```

## Test Coverage

### Test 1: Comment Counter Real-Time Update

**Validates:** Comment counter increments without page refresh when new comment is added via API

**Flow:**
1. Navigate to feed and find a post
2. Get initial comment counter value
3. Click to open comments section
4. Create comment via direct API call (simulates real-time event)
5. **CRITICAL:** Verify counter updates WITHOUT page refresh
6. Take screenshot on success

**Success Criteria:**
- Counter increments by exactly 1
- No page refresh occurs
- Update happens within 10 seconds

### Test 2: Toast Notification Display

**Validates:** Toast notification appears when new comment is added

**Flow:**
1. Navigate to post and open comments
2. Create comment via API with distinct author
3. Wait for toast to appear
4. Verify toast contains author information
5. Verify toast has correct icon (🤖 for agent, 👤 for user)
6. Verify toast auto-dismisses after 5 seconds
7. Take screenshot

**Success Criteria:**
- Toast appears within 10 seconds
- Toast contains relevant information
- Toast auto-dismisses correctly

### Test 3: Real-Time Comment Appearance

**Validates:** New comment appears in DOM immediately without refresh via WebSocket

**Flow:**
1. Open post comments section
2. Count initial comments in DOM
3. Create comment via API with unique identifier
4. **CRITICAL:** Wait for comment to appear WITHOUT refresh
5. Verify comment count increased
6. Verify new comment is visible
7. Verify no page navigation occurred
8. Take screenshot

**Success Criteria:**
- Comment appears within 15 seconds
- Comment count increases
- No page refresh detected
- WebSocket event logs captured

### Test 4: Markdown Formatting Validation

**Validates:** Avi responses render with proper markdown formatting

**Flow:**
1. Open post comments
2. Create Avi comment with rich markdown via API:
   - Bold text
   - Italic text
   - Headings
   - Code blocks
   - Lists
   - Links
3. Wait for Avi comment to appear
4. **CRITICAL:** Verify markdown is RENDERED (HTML elements present)
5. Verify raw markdown syntax is NOT visible
6. Take screenshot of formatted content

**Success Criteria:**
- At least 3 markdown elements render correctly
- No raw markdown syntax visible (no `**`, `###`, ` ``` `)
- HTML elements present (strong, em, h3, pre, ul)

### Test 5: Multiple Comments Stress Test

**Validates:** System handles multiple rapid comment additions

**Flow:**
1. Open post comments section
2. Record initial comment count
3. Create 5 comments rapidly via API (200ms between each)
4. Alternate between user and agent comments
5. Wait for all comments to appear
6. Verify all comments rendered
7. Take screenshot

**Success Criteria:**
- All 5 comments appear within 20 seconds
- Final count = initial count + 5
- No comments lost
- UI remains responsive

### Test 6: WebSocket Connection Recovery

**Validates:** System recovers from temporary disconnections

**Flow:**
1. Establish initial WebSocket connection
2. Open post comments
3. Simulate network disconnection (offline mode)
4. Wait 2 seconds
5. Restore network connection
6. Create comment via API
7. Verify comment appears (connection recovered)

**Success Criteria:**
- Connection re-establishes after going online
- Real-time updates work after reconnection
- Comment appears within 15 seconds

### Database Validation Test

**Validates:** UI state matches database state

**Flow:**
1. Get UI comment count from post card
2. Get database comment count via API
3. Compare counts

**Success Criteria:**
- UI count exactly matches database count
- No phantom comments
- No missing comments

## Screenshots

All test screenshots are saved to:

```
/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/
```

**Success Screenshots:**
- `test1-counter-update-SUCCESS.png`
- `test2-toast-notification-SUCCESS.png`
- `test3-comment-appears-SUCCESS.png`
- `test4-markdown-rendering-SUCCESS.png`
- `test5-stress-test-SUCCESS.png`

**Failure Screenshots:**
Automatically captured on test failure with `-FAILURE.png` suffix

## API Endpoints Used

All tests use real API endpoints:

- `POST /api/agent-posts/:postId/comments` - Create comment
- `GET /api/agent-posts/:postId` - Get post details
- `GET /api/agent-posts/:postId/comments` - Get all comments

## WebSocket Events Monitored

Tests monitor these Socket.IO events:

- `comment:added` - New comment added
- `comment:updated` - Comment updated
- `comment:deleted` - Comment deleted
- `subscribe:post` - Subscribe to post room
- `connect` - Socket connection established
- `disconnect` - Socket disconnection

## Debugging Failed Tests

### Check Backend Logs

```bash
# In api-server terminal, look for:
- WebSocket connection logs
- Comment creation logs
- Socket.IO room subscription logs
```

### Check Frontend Logs

Look in browser console (captured in test output) for:
- `[Socket.IO] Connected to server`
- `[Realtime] Real-time comment received`
- `[CommentSystem] Real-time comment received`

### Check Database State

```bash
# Connect to database and verify comment exists
psql -d agent_feed -c "SELECT * FROM comments WHERE post_id = 'your-post-id';"
```

### Common Issues

**Issue:** Comments don't appear in real-time

**Troubleshooting:**
1. Check WebSocket connection in console logs
2. Verify Socket.IO server is running on port 3001
3. Check if `subscribe:post` event was emitted
4. Verify `comment:added` event is being emitted by backend

**Issue:** Markdown not rendering

**Troubleshooting:**
1. Check if markdown processor is imported
2. Verify `contentType` is set to `markdown`
3. Check rehype plugins are configured

**Issue:** Toast not appearing

**Troubleshooting:**
1. Check if `useToast` hook is working
2. Verify toast container is rendered in app
3. Check `onCommentAdded` callback is firing

## Test Reports

HTML reports are generated automatically:

```bash
# View test report
npx playwright show-report
```

## Performance Expectations

| Test | Max Duration | Expected Duration |
|------|-------------|------------------|
| Test 1 | 60s | ~10-15s |
| Test 2 | 60s | ~10-15s |
| Test 3 | 60s | ~15-20s |
| Test 4 | 60s | ~15-20s |
| Test 5 | 60s | ~25-30s |
| Test 6 | 60s | ~20-25s |

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/e2e-realtime-tests.yml
name: E2E Real-Time Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Start backend
        run: |
          cd api-server
          npm ci
          npm run dev &
          sleep 10

      - name: Start frontend
        run: |
          cd frontend
          npm run dev &
          sleep 10

      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e:realtime

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Test Maintenance

### Updating Tests

When updating comment system:

1. Update helper functions if API changes
2. Update selectors if DOM structure changes
3. Update timeout values if performance changes
4. Update expected behavior in assertions

### Adding New Tests

Follow the pattern:

```typescript
test('should validate new behavior', async ({ page }) => {
  console.log('\n🧪 TEST NAME: Description\n');

  // Step 1: Setup
  const { postId } = await findTestPost(page);

  // Step 2: Action
  await createCommentViaAPI(postId, 'test');

  // Step 3: Verification
  await expect(locator).toBeVisible({ timeout: 15000 });

  // Step 4: Screenshot
  await page.screenshot({ path: '...' });

  console.log('✅ TEST PASSED');
});
```

## Support

For issues or questions:

1. Check backend logs for API errors
2. Check browser console for WebSocket errors
3. Review test output for detailed error messages
4. Check screenshots in `/screenshots` directory
5. Run tests in debug mode: `--debug`

## Success Metrics

**All tests should:**
- ✅ Complete in under 60 seconds each
- ✅ Pass consistently (95%+ success rate)
- ✅ Capture detailed logs
- ✅ Generate meaningful screenshots
- ✅ Validate real production behavior
- ✅ Use no mocks or stubs
