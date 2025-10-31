# Comment Reply E2E Tests - Quick Start Guide

## 🚀 Quick Run

```bash
cd /workspaces/agent-feed/frontend

# Run all comment reply tests
npx playwright test comment-replies --project=integration

# Run specific scenario
npx playwright test comment-replies -g "should display existing comment"

# Run with UI mode (interactive)
npx playwright test comment-replies --ui

# View HTML report
npx playwright show-report

# Debug with trace viewer
npx playwright show-trace test-results/[directory]/trace.zip
```

---

## 📋 Test Scenarios

1. **Display Existing Comments** - Verify comments render on posts
2. **Reply to Comment** - Post reply "divide by 2" to "97,000"
3. **Second Comment Thread** - Ask avi about directory
4. **Processing Indicator** - Verify "analyzing..." appears/disappears
5. **Nested Reply Threads** - Reply to avi's responses

---

## 🔧 Test Helpers Available

```typescript
import {
  findCommentByContent,    // Find comment by text
  findPostByContent,       // Find post by content
  replyToComment,         // Complete reply workflow
  waitForAviResponse,     // Wait for AI response (45s timeout)
  waitForProcessingComplete, // Track processing indicators
  getAllComments,         // Get all comment elements
  takeScreenshot,         // Capture screenshot
} from '../../helpers/comment-helpers';
```

### Example Usage:
```typescript
// Find and reply to a comment
await replyToComment(page, '97,000', 'divide by 2');

// Wait for avi's response
await waitForAviResponse(page, 45000);

// Take screenshot
await takeScreenshot(page, 'my-screenshot');
```

---

## 📁 File Locations

**Test Files**:
- `/workspaces/agent-feed/frontend/tests/e2e/integration/comment-replies.spec.ts`
- `/workspaces/agent-feed/frontend/tests/helpers/comment-helpers.ts`

**Output**:
- Screenshots: `/workspaces/agent-feed/frontend/tests/screenshots/comment-replies/`
- Test Results: `/workspaces/agent-feed/frontend/test-results/`

**Documentation**:
- This Guide: `QUICK-START.md`
- Detailed Report: `TEST-EXECUTION-REPORT.md`
- Agent Summary: `AGENT-4-SUMMARY.md`

---

## ⚠️ Current Status

**Status**: Infrastructure complete, waiting for UI fix

**Issue**: Posts not rendering on `/agents/avi` page

**Error**:
```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
waiting for locator('article, [data-testid="post"], .post')
```

**Once Fixed**: All tests will run successfully and capture screenshots

---

## 🎯 Success Criteria

- [ ] All 5 tests passing
- [ ] Screenshots captured at each step
- [ ] Avi responds to replies within 45 seconds
- [ ] Processing indicators appear/disappear
- [ ] Nested threads render correctly

---

## 🐛 Debugging

### View Trace Files:
```bash
npx playwright show-trace test-results/comment-replies-*/trace.zip
```

### Check Videos:
```bash
open test-results/comment-replies-*/video.webm
```

### View Screenshots:
```bash
open test-results/comment-replies-*/test-failed-1.png
```

### Check Logs:
```bash
cat /tmp/playwright-test-output.log
```

---

## 📊 Test Configuration

- **Browser**: Chrome (Desktop)
- **Timeout**: 60 seconds per test
- **AI Response Timeout**: 45 seconds
- **Retries**: 1 automatic retry
- **Workers**: 4 parallel
- **Screenshot**: On failure + manual
- **Video**: On failure
- **Trace**: On first retry

---

## 🔄 Re-run After UI Fix

```bash
# Full test suite
npx playwright test comment-replies --project=integration

# Watch mode
npx playwright test comment-replies --project=integration --ui

# Generate report
npx playwright test comment-replies --project=integration --reporter=html
npx playwright show-report
```

---

## 📞 Need Help?

1. Check `TEST-EXECUTION-REPORT.md` for detailed execution info
2. Read `AGENT-4-SUMMARY.md` for complete documentation
3. View Playwright docs: https://playwright.dev/docs/intro
4. Check trace files for detailed debugging

---

**Quick Start Version**: 1.0.0
**Last Updated**: 2025-10-31
**Status**: Ready to run once UI is fixed ✅
