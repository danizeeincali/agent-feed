# Regression Test Suite - Quick Reference

## 🎯 Purpose

Verify that **AVI DM** and **Quick Post** functionality still work after the ghost post fix for the `connection_status` column issue.

## 🚀 Quick Start

### 1. Start the Application
```bash
cd /workspaces/agent-feed
npm run dev
```

### 2. Run All Tests
```bash
./scripts/run-regression-tests.sh
```

### 3. Run Specific Tests
```bash
# AVI DM tests only
./scripts/run-regression-tests.sh --suite avi-dm

# Quick Post tests only
./scripts/run-regression-tests.sh --suite quick-post

# Feed tests only
./scripts/run-regression-tests.sh --suite feed

# Ghost post prevention
./scripts/run-regression-tests.sh --suite ghost-post
```

### 4. Interactive Debugging
```bash
./scripts/run-regression-tests.sh --ui
```

## 📊 Test Coverage

### ✅ AVI DM Tests (2 tests)
1. **Message Exchange** - Send "hello", verify AVI responds
2. **Chat History** - Multiple messages persist in history

### ✅ Quick Post Tests (2 tests)
1. **Post Creation** - Create post, verify in feed, verify count increases
2. **Content Validation** - Empty post submission should be prevented

### ✅ Feed Tests (3 tests)
1. **Page Reload** - Posts load correctly after refresh
2. **Interactions** - Like/comment buttons visible
3. **Empty Feed** - Graceful handling of no posts

### ✅ Ghost Post Prevention (2 tests)
1. **Connection Status Field** - Verify `connection_status` in API requests
2. **Post Persistence** - Posts don't disappear after reload

**Total: 9 regression tests**

## 📸 Screenshots Generated

Location: `/workspaces/agent-feed/tests/screenshots/regression/`

1. `avi-dm-working.png` - AVI DM chat with messages
2. `quick-post-working.png` - Post creation and feed display
3. `feed-functional.png` - Feed with interactions

## 🔧 Test Commands

### Basic Commands
```bash
# Run all tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts

# Run with UI
npx playwright test tests/e2e/ghost-post-regression.spec.ts --ui

# Run in debug mode
npx playwright test tests/e2e/ghost-post-regression.spec.ts --debug

# Run headed (visible browser)
npx playwright test tests/e2e/ghost-post-regression.spec.ts --headed

# Generate HTML report
npx playwright test tests/e2e/ghost-post-regression.spec.ts --reporter=html
npx playwright show-report
```

### Filtered Commands
```bash
# Run only AVI DM tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "AVI DM"

# Run only Quick Post tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Quick Post"

# Run only Feed tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Feed"

# Run only Ghost Post tests
npx playwright test tests/e2e/ghost-post-regression.spec.ts -g "Ghost Post"
```

## ✅ Expected Output

```
Running 9 tests using 1 worker

  ✓ AVI DM Functionality › should successfully send message and receive AVI response (5.2s)
  ✓ AVI DM Functionality › should maintain chat history across messages (3.8s)
  ✓ Quick Post Functionality › should successfully create post and display in feed (4.1s)
  ✓ Quick Post Functionality › should validate post content before submission (2.3s)
  ✓ Feed Functionality › should load posts correctly on page refresh (2.9s)
  ✓ Feed Functionality › should display post interactions correctly (2.1s)
  ✓ Feed Functionality › should handle empty feed gracefully (1.8s)
  ✓ Ghost Post Prevention › should verify connection_status field exists (3.5s)
  ✓ Ghost Post Prevention › should verify posts persist after reload (4.2s)

  9 passed (30s)
```

## 🐛 Troubleshooting

### App Not Running
```
Error: Application is not running at http://localhost:5173
Solution: npm run dev
```

### Element Not Found
```
Error: Timeout waiting for element
Solution:
  1. Check UI component exists
  2. Update selectors in test file
  3. Run with --ui to inspect DOM
```

### Test Timeout
```
Error: Test timeout of 30000ms exceeded
Solution:
  1. Check backend API is running
  2. Verify database is accessible
  3. Increase timeout in test if needed
```

### Post Not Appearing
```
Error: Post not visible in feed
Solution:
  1. Verify ghost post fix is deployed
  2. Check database has connection_status column
  3. Review API logs for errors
```

## 📁 File Locations

```
/workspaces/agent-feed/
├── tests/
│   ├── e2e/
│   │   ├── ghost-post-regression.spec.ts    ← Main test file
│   │   └── README-REGRESSION.md             ← Detailed documentation
│   └── screenshots/
│       └── regression/                       ← Screenshot output
│           ├── avi-dm-working.png
│           ├── quick-post-working.png
│           └── feed-functional.png
├── scripts/
│   └── run-regression-tests.sh              ← Test runner script
├── GHOST-POST-FIX-SPEC.md                   ← Fix specification
└── REGRESSION-TEST-QUICK-REF.md             ← This file
```

## 🎓 Test Structure

```typescript
test.describe('Ghost Post Fix - Regression Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    // Wait for app to load
    // Verify accessibility
  });

  test.describe('1. AVI DM Functionality', () => {
    test('should send message and receive response', async ({ page }) => {
      // Click AVI DM tab
      // Send message "hello"
      // Verify AVI response
      // Screenshot: avi-dm-working.png
    });
  });

  test.describe('2. Quick Post Functionality', () => {
    test('should create post and display in feed', async ({ page }) => {
      // Click Quick Post tab
      // Enter content
      // Submit post
      // Verify in feed
      // Screenshot: quick-post-working.png
    });
  });

  test.describe('3. Feed Functionality', () => {
    test('should load posts on refresh', async ({ page }) => {
      // Reload page
      // Verify posts load
      // Verify interactions visible
      // Screenshot: feed-functional.png
    });
  });

  test.describe('4. Ghost Post Prevention', () => {
    test('should verify connection_status handling', async ({ page }) => {
      // Create post
      // Intercept API request
      // Verify connection_status field
      // Verify post persists
    });
  });
});
```

## 📋 Checklist

Before running tests:
- [ ] App running at http://localhost:5173
- [ ] Database accessible
- [ ] Ghost post fix deployed
- [ ] `connection_status` column exists with default value

After running tests:
- [ ] All 9 tests pass
- [ ] 3 screenshots generated
- [ ] No console errors
- [ ] Posts persist after reload

## 🔗 Related Documentation

- **GHOST-POST-FIX-SPEC.md** - Technical specification for the fix
- **CONNECTION-STATUS-FIX-E2E-VALIDATION.md** - E2E validation plan
- **tests/e2e/README-REGRESSION.md** - Detailed test documentation
- **Playwright Docs** - https://playwright.dev/docs/intro

## 💡 Tips

1. **Use UI Mode** for visual debugging: `--ui`
2. **Check Screenshots** after test runs for visual evidence
3. **Review Traces** for failed tests in `test-results/`
4. **Run Specific Suites** to isolate issues: `--suite avi-dm`
5. **Enable Headed Mode** to watch browser: `--headed`

## ⏱️ Performance Expectations

| Test Suite | Expected Duration |
|-----------|------------------|
| AVI DM | 8-10 seconds |
| Quick Post | 6-8 seconds |
| Feed | 6-8 seconds |
| Ghost Post | 7-9 seconds |
| **Total** | **30-35 seconds** |

## 🎯 Success Criteria

✅ **All tests pass**
✅ **AVI DM sends and receives messages**
✅ **Quick Post creates posts in feed**
✅ **Feed loads and displays interactions**
✅ **Posts persist after page reload (no ghost posts)**
✅ **Screenshots show working UI**

---

**Ready to run?**
```bash
./scripts/run-regression-tests.sh
```
