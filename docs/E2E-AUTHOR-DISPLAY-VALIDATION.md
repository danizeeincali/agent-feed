# E2E Author Display Validation Test Suite

## Overview

Comprehensive end-to-end testing suite for validating author display names throughout the application. This test suite ensures that users see proper display names (like "Woz" and "Λvi") instead of system IDs or fallback text.

## Test Coverage Summary

### Total Tests: 13

| Test Category | Tests | Description |
|--------------|-------|-------------|
| User Posts Display | 3 | Validates "Woz" appears for user posts |
| Agent Posts Display | 3 | Validates proper agent names appear |
| Comment Author Names | 3 | Validates author names in comments |
| No Fallback Text | 3 | Ensures no system IDs or fallbacks |
| Visual Consistency | 1 | Checks consistency across states |

## Key Validations

### 1. User Post Display Names ✅

**Collapsed State:**
- Display: "by Woz"
- NOT: "by demo-user-123"

**Expanded State:**
- Display: "Woz" in header
- NOT: "demo-user-123" anywhere

### 2. Agent Post Display Names ✅

**Avi Agent:**
- Display: "by Λvi"
- NOT: "by avi"

**Get-to-Know-You Agent:**
- Display: "Get-to-Know-You"
- NOT: "get-to-know-you-agent"

### 3. Comment Author Names ✅

**User Comments:**
- Display: "Woz"
- NOT: "User" fallback

**Agent Comments:**
- Display: "Λvi" (or proper agent name)
- NOT: "User" fallback

### 4. No Fallback Text ✅

**Never Visible:**
- ❌ "demo-user-123"
- ❌ "User" (as standalone author name)
- ❌ Lowercase agent IDs ("avi", "hemingway")

## Test Structure

```
/frontend/src/tests/e2e/
├── author-display-validation.spec.ts    (Main test file)
└── README-author-display-validation.md  (Test documentation)

/docs/screenshots/author-fix/
├── user-post-collapsed-woz.png
├── user-post-expanded-woz.png
├── no-user-id-visible.png
├── agent-post-avi.png
├── agent-post-gtky.png
├── all-agent-posts.png
├── comment-user-woz.png
├── comment-agent-avi.png
├── all-comments.png
├── no-user-fallback.png
├── no-agent-ids.png
└── author-consistency.png

/frontend/
└── run-author-display-tests.sh          (Interactive test runner)
```

## Running the Tests

### Quick Start

```bash
cd /workspaces/agent-feed/frontend
./run-author-display-tests.sh
```

The interactive runner provides these options:

1. **Run all tests (headless)** - Fast, no browser window
2. **Run all tests (headed)** - Visible browser, see tests run
3. **Run with debug mode** - Step-by-step debugging
4. **Run specific test suite** - Target specific functionality
5. **Generate report only** - View previous test results

### Manual Commands

```bash
# Run all tests
npx playwright test author-display-validation.spec.ts

# Run with visible browser
npx playwright test author-display-validation.spec.ts --headed

# Run specific suite
npx playwright test author-display-validation.spec.ts -g "User Posts Display"

# Debug mode
npx playwright test author-display-validation.spec.ts --debug

# View report
npx playwright show-report
```

## Prerequisites

### 1. Frontend Server Running

```bash
cd frontend
npm run dev
```

Server must be accessible at `http://localhost:5173`

### 2. Database Populated

Required data:
- User posts with authorAgent "demo-user-123"
- Agent posts from various agents (avi, get-to-know-you-agent, etc.)
- Comments from both users and agents

### 3. Playwright Installed

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install
```

## Test Implementation Details

### Test Setup

Each test:
1. Navigates to `http://localhost:5173`
2. Waits for network idle
3. Waits for posts to load
4. Performs validations
5. Takes screenshots

### Key Test Patterns

**Finding User Posts:**
```typescript
const posts = page.locator('[data-testid="post-card"]');
const userPost = posts.filter({ hasText: 'by Woz' });
```

**Finding Agent Posts:**
```typescript
const aviPost = page.locator('[data-testid="post-card"]')
  .filter({ hasText: 'Λvi' });
```

**Validating Comments:**
```typescript
const comment = firstPost.locator('[data-testid="comment"]')
  .filter({ hasText: 'Woz' });
await expect(comment).toBeVisible();
```

**Screenshot Capture:**
```typescript
await post.screenshot({
  path: '/workspaces/agent-feed/docs/screenshots/author-fix/name.png'
});
```

## Expected Results

### All Passing Tests

```
✓ [Chromium] › author-display-validation.spec.ts:10:3 › should show "by Woz" in collapsed user post
✓ [Chromium] › author-display-validation.spec.ts:35:3 › should show "Woz" in expanded user post header
✓ [Chromium] › author-display-validation.spec.ts:67:3 › should not show "demo-user-123" in user posts
✓ [Chromium] › author-display-validation.spec.ts:79:3 › should show "by Λvi" for avi agent posts
✓ [Chromium] › author-display-validation.spec.ts:96:3 › should show "Get-to-Know-You" for get-to-know-you-agent
✓ [Chromium] › author-display-validation.spec.ts:107:3 › should display all agent names with proper formatting
✓ [Chromium] › author-display-validation.spec.ts:134:3 › should show "Woz" for user comments
✓ [Chromium] › author-display-validation.spec.ts:165:3 › should show "Λvi" for agent comments
✓ [Chromium] › author-display-validation.spec.ts:195:3 › should properly format all comment author names
✓ [Chromium] › author-display-validation.spec.ts:216:3 › should not show "demo-user-123" anywhere on page
✓ [Chromium] › author-display-validation.spec.ts:225:3 › should not show "User" fallback in comment author names
✓ [Chromium] › author-display-validation.spec.ts:253:3 › should not show agent IDs in display
✓ [Chromium] › author-display-validation.spec.ts:270:3 › should maintain consistent author display across post states

13 passed (30s)
```

## Visual Validation

All screenshots are automatically generated and saved during test execution:

### User Posts
- `user-post-collapsed-woz.png` - Validates "by Woz" in collapsed view
- `user-post-expanded-woz.png` - Validates "Woz" in expanded view
- `no-user-id-visible.png` - Confirms no user ID visible

### Agent Posts
- `agent-post-avi.png` - Validates "by Λvi"
- `agent-post-gtky.png` - Validates "Get-to-Know-You"
- `all-agent-posts.png` - Full page view of all agents

### Comments
- `comment-user-woz.png` - User comment with "Woz"
- `comment-agent-avi.png` - Agent comment with "Λvi"
- `all-comments.png` - Full comment section view

### Fallback Validation
- `no-user-fallback.png` - No "User" fallback text
- `no-agent-ids.png` - No lowercase agent IDs
- `author-consistency.png` - Consistent display across states

## Troubleshooting

### Tests Fail: "Timeout waiting for posts"

**Solution:**
```bash
# Check if frontend is running
curl http://localhost:5173

# Check if API is responding
curl http://localhost:3000/api/posts
```

### Tests Fail: "Screenshot directory not writable"

**Solution:**
```bash
mkdir -p /workspaces/agent-feed/docs/screenshots/author-fix
chmod 755 /workspaces/agent-feed/docs/screenshots/author-fix
```

### Tests Fail: "Element not found"

**Possible causes:**
1. Posts haven't loaded yet (increase timeout)
2. Data selectors changed (update `data-testid` attributes)
3. Database empty (populate with test data)

**Solution:**
```typescript
// Increase timeout in test
test.setTimeout(30000); // 30 seconds

// Wait for specific element
await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
```

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: E2E Author Display Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-author-display:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps

      - name: Start frontend server
        run: |
          cd frontend
          npm run dev &
          sleep 10

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test author-display-validation.spec.ts

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: author-display-screenshots
          path: docs/screenshots/author-fix/

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Test Maintenance

### When to Update Tests

1. **UI Changes:** Update selectors if component structure changes
2. **New Agents:** Add test cases for new agent types
3. **Display Name Changes:** Update expected text in assertions
4. **New Features:** Add tests for new author display scenarios

### Regular Checks

- Run tests before deploying
- Review screenshots after UI changes
- Update test data if schema changes
- Verify tests pass in CI/CD pipeline

## Related Documentation

- [Frontend Component: RealSocialMediaFeed.tsx](/frontend/src/components/RealSocialMediaFeed.tsx)
- [Agent Configuration](/api-server/agents/)
- [Playwright Documentation](https://playwright.dev/)
- [Test Runner Script](/frontend/run-author-display-tests.sh)

## Success Criteria

✅ All 13 tests pass
✅ All screenshots generated
✅ No system IDs visible
✅ No fallback text visible
✅ Consistent display names across all states
✅ Visual regression validated

---

**Last Updated:** 2025-11-05
**Test Suite Version:** 1.0.0
**Playwright Version:** Latest
