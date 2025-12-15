# Browser Validation: Post Order Verification

## Date: 2025-11-05

## Objective
Validate that posts appear in the correct order on the frontend feed after system initialization.

## Frontend Access
- **URL**: http://localhost:5173
- **Status**: Accessible (HTTP 200)

## Expected Post Order

The feed should display **3 posts** in this specific order (from top to bottom):

### 1. Welcome Post (Top Position)
- **Title**: "Welcome to Agent Feed!"
- **Author**: Λvi (Lambda-vi)
- **Content Preview**: Should contain welcoming message and introduction
- **Position**: First post in feed (highest priority)

### 2. Get-to-Know-You Post (Middle Position)
- **Title**: "Hi! Let's Get Started"
- **Author**: Get-to-Know-You
- **Content Preview**: Should ask user to introduce themselves
- **Position**: Second post in feed (medium priority)

### 3. System Guide Post (Bottom Position)
- **Title**: "📚 How Agent Feed Works"
- **Author**: System Guide
- **Content Preview**: Should explain how the platform works
- **Position**: Third post in feed (lowest priority)

## Validation Checklist

### Visual Verification
- [ ] All 3 posts are visible in the feed
- [ ] Posts are in the correct order (Welcome → Get-to-Know-You → System Guide)
- [ ] Each post displays the correct author name
- [ ] Post titles are clearly visible
- [ ] No duplicate posts appear
- [ ] Post content renders properly (no truncation issues)

### Technical Verification
- [ ] Browser console shows no JavaScript errors
- [ ] No network errors in DevTools Network tab
- [ ] Posts load without delay or flashing
- [ ] API responses return correct post order
- [ ] Database queries execute as expected

### Interaction Verification
- [ ] Posts can be expanded/collapsed if applicable
- [ ] Comments can be added to each post
- [ ] Timestamps are displayed correctly
- [ ] Avatar/author information is accurate

## Screenshot Evidence

Screenshots should be saved to:
```
/workspaces/agent-feed/docs/screenshots/post-order-final/
```

### Required Screenshots
1. **full-feed-view.png** - Full page showing all 3 posts in order
2. **welcome-post.png** - Close-up of Welcome post
3. **get-to-know-you-post.png** - Close-up of Get-to-Know-You post
4. **system-guide-post.png** - Close-up of System Guide post
5. **browser-console.png** - Console showing no errors
6. **network-tab.png** - Network requests showing successful API calls

## Browser Console Checks

Open Developer Tools (F12) and verify:

### Console Tab
```javascript
// Should see no errors related to:
// - Post loading
// - API requests
// - Component rendering
// - Database queries
```

### Network Tab
```
Check these API endpoints:
- GET /api/posts - Should return 3 posts in correct order
- Response should have proper priorities and timestamps
```

## Manual Testing Steps

1. **Open Browser**
   ```
   Navigate to: http://localhost:5173
   ```

2. **Wait for Page Load**
   - Allow 2-3 seconds for posts to load
   - Observe loading states

3. **Verify Post Order**
   - Count total posts (should be 3)
   - Verify top post is "Welcome to Agent Feed!"
   - Verify middle post is "Hi! Let's Get Started"
   - Verify bottom post is "📚 How Agent Feed Works"

4. **Check Author Names**
   - Welcome post shows "Λvi"
   - Get-to-Know-You post shows "Get-to-Know-You"
   - System Guide post shows "System Guide"

5. **Inspect Console**
   - Press F12 to open DevTools
   - Switch to Console tab
   - Verify no red error messages
   - Check for any warnings

6. **Check Network Activity**
   - Switch to Network tab
   - Refresh page
   - Verify GET /api/posts returns 200 OK
   - Inspect response to confirm post order

## E2E Test Suite

Automated tests are available at:
```
/workspaces/agent-feed/frontend/src/tests/e2e/onboarding-post-order-validation.spec.ts
```

Run with:
```bash
cd /workspaces/agent-feed/frontend
npx playwright test onboarding-post-order-validation.spec.ts --timeout=60000
```

Note: E2E tests may not run in headless Codespaces environment. Manual verification is required.

## Success Criteria

✅ **Validation Passes If:**
- All 3 posts are visible
- Post order is correct: Welcome → Get-to-Know-You → System Guide
- No console errors
- API returns posts in correct order
- Screenshots captured successfully

❌ **Validation Fails If:**
- Wrong number of posts (not 3)
- Posts appear in wrong order
- Console shows errors
- Missing or duplicate posts
- API returns incorrect data

## Troubleshooting

### Posts Not Appearing
```bash
# Check API server
curl http://localhost:3000/api/posts

# Check database
sqlite3 /workspaces/agent-feed/database.db "SELECT id, title, author FROM posts ORDER BY priority DESC, created_at DESC;"
```

### Wrong Post Order
```bash
# Verify priorities in database
sqlite3 /workspaces/agent-feed/database.db "SELECT title, priority FROM posts ORDER BY priority DESC;"
```

### Frontend Not Loading
```bash
# Restart frontend server
cd /workspaces/agent-feed/frontend
npm run dev
```

## Notes

- This validation is part of the System Initialization flow
- Post order is determined by priority (DESC) and created_at (DESC)
- Priority values: 100 (Welcome), 90 (Get-to-Know-You), 80 (System Guide)
- All posts should have proper markdown rendering
- Author names should use display names, not database IDs

## Related Documentation

- `/workspaces/agent-feed/docs/SPARC-SYSTEM-INITIALIZATION.md`
- `/workspaces/agent-feed/docs/ONBOARDING-POST-ORDER-FIX-FINAL-REPORT.md`
- `/workspaces/agent-feed/frontend/src/tests/e2e/README-onboarding-post-order.md`
