# Author Display Name Validation E2E Tests

## Overview

Comprehensive Playwright E2E tests to validate that author display names are correctly shown throughout the application, with visual regression testing via screenshots.

## Test Coverage

### 1. User Posts Display "Woz"
- ✅ Collapsed user posts show "by Woz"
- ✅ Expanded user posts show "Woz" in header
- ✅ User ID "demo-user-123" is never visible

### 2. Agent Posts Display Agent Names
- ✅ Avi agent posts show "by Λvi"
- ✅ Get-to-Know-You agent posts show proper name
- ✅ All agent names are properly formatted

### 3. Comment Author Names
- ✅ User comments show "Woz"
- ✅ Agent comments show proper agent names (e.g., "Λvi")
- ✅ No "User" fallback text in comments

### 4. No Fallback Text
- ✅ "demo-user-123" never appears
- ✅ "User" fallback never appears as author name
- ✅ Agent IDs (lowercase) never appear
- ✅ Visual consistency across post states

## Test File

**Location:** `/frontend/src/tests/e2e/author-display-validation.spec.ts`

## Screenshots

All screenshots are saved to `/docs/screenshots/author-fix/`:

- `user-post-collapsed-woz.png` - User post in collapsed state showing "Woz"
- `user-post-expanded-woz.png` - User post in expanded state showing "Woz"
- `no-user-id-visible.png` - Full page showing no user IDs
- `agent-post-avi.png` - Avi agent post with proper name
- `agent-post-gtky.png` - Get-to-Know-You agent post
- `all-agent-posts.png` - Full page showing all agent posts
- `comment-user-woz.png` - User comment showing "Woz"
- `comment-agent-avi.png` - Agent comment showing "Λvi"
- `all-comments.png` - Full page showing all comments
- `no-user-fallback.png` - Verification of no "User" fallback
- `no-agent-ids.png` - Verification of no lowercase agent IDs
- `author-consistency.png` - Author display consistency check

## Running the Tests

### Run All Author Display Tests

```bash
cd frontend
npx playwright test author-display-validation.spec.ts
```

### Run with UI (headed mode)

```bash
npx playwright test author-display-validation.spec.ts --headed
```

### Run specific test suite

```bash
# User posts only
npx playwright test author-display-validation.spec.ts -g "User Posts Display"

# Agent posts only
npx playwright test author-display-validation.spec.ts -g "Agent Posts Display"

# Comments only
npx playwright test author-display-validation.spec.ts -g "Comment Author Names"

# Fallback validation
npx playwright test author-display-validation.spec.ts -g "No Fallback Text"
```

### Run with debug mode

```bash
npx playwright test author-display-validation.spec.ts --debug
```

## Prerequisites

1. **Frontend server running:**
   ```bash
   cd frontend
   npm run dev
   ```
   Server should be accessible at `http://localhost:5173`

2. **Database populated:**
   - User posts with author "demo-user-123" should exist
   - Agent posts from various agents should exist
   - Comments from both users and agents should exist

3. **Playwright installed:**
   ```bash
   cd frontend
   npm install --save-dev @playwright/test
   npx playwright install
   ```

## Expected Results

All tests should pass, validating:

1. ✅ User posts display "Woz" instead of "demo-user-123"
2. ✅ Agent posts display proper agent names (Λvi, Get-to-Know-You, etc.)
3. ✅ Comments show correct author names
4. ✅ No fallback text ("User", user IDs, agent IDs) is visible
5. ✅ Visual consistency across all post states

## Test Structure

```typescript
test.describe('Author Display Name Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for page load
  });

  test.describe('User Posts Display "Woz"', () => {
    // 3 tests for user post display
  });

  test.describe('Agent Posts Display Agent Names', () => {
    // 3 tests for agent post display
  });

  test.describe('Comment Author Names', () => {
    // 3 tests for comment author display
  });

  test.describe('No Fallback Text', () => {
    // 3 tests for fallback validation
  });

  test.describe('Visual Consistency', () => {
    // 1 test for consistency check
  });
});
```

## Troubleshooting

### Tests failing due to timeout

Increase timeout in test:
```typescript
test('test name', async ({ page }) => {
  test.setTimeout(30000); // 30 seconds
  // ... test code
});
```

### Screenshots not saved

Check permissions on `/docs/screenshots/author-fix/` directory:
```bash
mkdir -p /workspaces/agent-feed/docs/screenshots/author-fix
chmod 755 /workspaces/agent-feed/docs/screenshots/author-fix
```

### Posts not loading

Verify frontend server is running and API is accessible:
```bash
curl http://localhost:5173
curl http://localhost:3000/api/posts
```

## Integration with CI/CD

Add to `.github/workflows/e2e-tests.yml`:

```yaml
- name: Run Author Display Tests
  run: |
    cd frontend
    npx playwright test author-display-validation.spec.ts

- name: Upload Screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: author-display-screenshots
    path: docs/screenshots/author-fix/
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Author Display Name Implementation](/frontend/src/components/RealSocialMediaFeed.tsx)
- [Agent Display Name Mapping](/api-server/agents/)
