# E2E Test: Onboarding Post Order Validation

## Overview

This test suite validates that the onboarding posts appear in the correct order in the UI after database reset and system initialization.

## Test File Location

`/workspaces/agent-feed/frontend/src/tests/e2e/onboarding-post-order-validation.spec.ts`

## Expected Post Order

1. **"Welcome to Agent Feed!"** by **Λvi**
2. **"Hi! Let's Get Started"** by **Get-to-Know-You**
3. **"📚 How Agent Feed Works"** by **System Guide**

## Test Scenarios (14 Tests)

1. ✅ Navigate to application successfully
2. ✅ Wait for feed to load and render posts
3. ✅ Display exactly 3 onboarding posts
4. ✅ First post: "Welcome to Agent Feed!" by Λvi
5. ✅ Second post: "Hi! Let's Get Started" by Get-to-Know-You
6. ✅ Third post: "📚 How Agent Feed Works" by System Guide
7. ✅ Take screenshot showing all posts in correct order
8. ✅ Expand first post and verify content
9. ✅ Take screenshot of expanded Λvi post
10. ✅ Post order persists after page refresh
11. ✅ Post timestamps in descending order
12. ✅ No duplicate posts exist
13. ✅ Author display names match exactly
14. ✅ Comprehensive validation (all criteria)

## Prerequisites

1. **Database must be reset** - Run the Database Reset Agent first
2. **Backend server must be running** on port 3001
3. **Frontend dev server must be running** on port 5173

### Start Servers

```bash
# Terminal 1 - Backend
cd /workspaces/agent-feed/api-server
node server.js

# Terminal 2 - Frontend
cd /workspaces/agent-feed/frontend
npm run dev
```

## Running the Tests

### Run All Tests

```bash
cd /workspaces/agent-feed/frontend
npx playwright test onboarding-post-order-validation.spec.ts
```

### Run with UI (Headed Mode)

```bash
npx playwright test onboarding-post-order-validation.spec.ts --headed
```

### Run Specific Test

```bash
npx playwright test onboarding-post-order-validation.spec.ts -g "Should display exactly 3 onboarding posts"
```

### Debug Mode

```bash
npx playwright test onboarding-post-order-validation.spec.ts --debug
```

### Generate HTML Report

```bash
npx playwright test onboarding-post-order-validation.spec.ts
npx playwright show-report
```

## Screenshots

All screenshots are saved to:
`/workspaces/agent-feed/docs/screenshots/post-order-fix/`

Generated screenshots:
- `all-posts-correct-order.png` - Full page showing all 3 posts
- `avi-post-expanded.png` - Expanded Λvi welcome post
- `comprehensive-validation-complete.png` - Final validation screenshot

## Test Structure

Each test follows the **Arrange-Act-Assert** pattern:

```typescript
test('description', async ({ page }) => {
  // Arrange - Setup
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Act - Perform action
  const posts = await page.locator('[class*="post"]').all();

  // Assert - Verify expectations
  expect(posts.length).toBe(3);
});
```

## Validation Points

### Post Count
- Exactly 3 posts must be visible
- No duplicates allowed

### Post Order
- Posts ordered by timestamp (newest first)
- Order persists after page refresh

### Post Content
- Each post has correct title
- Each post has correct author
- Post content contains expected keywords

### Post Authors
- **Λvi** - AI assistant/companion
- **Get-to-Know-You** - Onboarding agent
- **System Guide** - Tutorial/help agent

## Troubleshooting

### Test Fails: "Timed out waiting for selector"

```bash
# Check if servers are running
curl http://localhost:3001/health
curl http://localhost:5173

# Restart servers if needed
```

### Test Fails: "Expected 3 posts, got X"

```bash
# Database may need reset
cd /workspaces/agent-feed
./scripts/reset-production-database.sh

# Or run the Database Reset Agent
```

### Screenshots Not Created

```bash
# Create directory manually
mkdir -p /workspaces/agent-feed/docs/screenshots/post-order-fix

# Check permissions
ls -la /workspaces/agent-feed/docs/screenshots/
```

### Wrong Post Order

Check the backend database query:
- `/api-server/avi/session-manager.js`
- Verify `ORDER BY created_at DESC`

## Coverage Report

Run tests with coverage:

```bash
npx playwright test onboarding-post-order-validation.spec.ts --reporter=html
npx playwright show-report
```

## Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
- name: Run Onboarding Post Order E2E Tests
  run: |
    cd frontend
    npx playwright test onboarding-post-order-validation.spec.ts
```

## Related Files

- Backend: `/api-server/avi/session-manager.js` - Post ordering logic
- Frontend: `/frontend/src/components/RealSocialMediaFeed.tsx` - Post display
- Database: `/database.db` - SQLite database with posts

## Success Criteria

All 14 tests must pass:
- ✅ All assertions green
- ✅ Screenshots generated successfully
- ✅ No console errors
- ✅ Order consistent across page refreshes

## Next Steps

After tests pass:
1. Review screenshots for visual validation
2. Test on different screen sizes (mobile, tablet, desktop)
3. Add accessibility tests (ARIA labels, keyboard navigation)
4. Performance tests (load time, rendering speed)

## Support

For issues or questions:
- Check test output in terminal
- Review Playwright trace viewer: `npx playwright show-trace`
- Check browser console for errors
- Review backend logs: `/api-server/server.js`
