# Quick Start Guide: Anchor Navigation E2E Tests

## 🎯 What This Is

**22 comprehensive E2E tests** for anchor navigation functionality using **real Chromium browser** (no mocks).

## ⚡ Quick Commands

### Run Everything (Recommended for First Time)

```bash
cd /workspaces/agent-feed/frontend

# 1. Validate setup
./tests/e2e/validate-anchor-tests.sh

# 2. Run all tests with UI
npx playwright test tests/e2e/anchor-navigation.spec.js --ui
```

### Run Specific Tests

```bash
# Just the comprehensive test (Test #20)
npx playwright test tests/e2e/anchor-navigation.spec.js -g "all 15 anchor links"

# Just visual screenshot tests
npx playwright test tests/e2e/anchor-navigation.spec.js -g "screenshot"

# Just keyboard navigation tests
npx playwright test tests/e2e/anchor-navigation.spec.js -g "keyboard"

# Just basic navigation tests
npx playwright test tests/e2e/anchor-navigation.spec.js -g "Should render\|Should click\|Should update"
```

### Debug Mode

```bash
# Run with browser visible
npx playwright test tests/e2e/anchor-navigation.spec.js --headed

# Run with inspector
npx playwright test tests/e2e/anchor-navigation.spec.js --debug

# Run single test in debug
npx playwright test tests/e2e/anchor-navigation.spec.js -g "all 15 anchor links" --debug
```

## 📋 Prerequisites

### Servers Must Be Running

**Terminal 1 - Frontend:**
```bash
cd /workspaces/agent-feed/frontend
npm run dev
# Should show: http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd /workspaces/agent-feed/api-server
npm run dev
# Should show: http://localhost:3001
```

### One-Time Setup

```bash
cd /workspaces/agent-feed/frontend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Make scripts executable
chmod +x tests/e2e/*.sh
```

## ✅ Validation Checklist

Run the validator before tests:

```bash
./tests/e2e/validate-anchor-tests.sh
```

**Expected output:**
```
🔍 Validating Anchor Navigation E2E Test Setup...

Checking test file exists... ✓
Checking screenshot directory... ✓
Checking frontend server (port 5173)... ✓
Checking backend server (port 3001)... ✓
Checking Playwright installation... ✓
Checking Chromium browser... ✓
Checking test page URL... ✓
Checking node_modules... ✓
Checking test file syntax... ✓
Checking Playwright config... ✓

✅ All checks passed!
```

## 📊 Test Overview

**22 Tests Total:**

1-6: **Basic Navigation** (sidebar, headers, clicks, URLs, scroll, highlighting)
7-9: **Multiple Anchors** (multi-section nav, scroll stability, rapid clicks)
10-13: **Edge Cases** (non-existent IDs, nested components, reload, history)
14-16: **Keyboard Navigation** (Tab, Enter, accessibility)
17-19: **Visual Verification** (3 screenshot tests)
20-22: **Comprehensive** (all anchors, performance, mobile)

## 🖼️ Generated Screenshots

After running tests, check:
```bash
ls -lh tests/screenshots/anchor-navigation/
```

**Expected files:**
- `01-initial-page-state.png` - Full page before interaction
- `02-after-anchor-navigation.png` - After scrolling to anchor
- `02b-viewport-after-navigation.png` - Viewport view
- `03-active-sidebar-highlighting.png` - Active menu item
- `04-all-anchors-test-complete.png` - Final state
- `05-mobile-viewport-navigation.png` - Mobile view (375x667)

## 📈 Expected Results

**All tests should PASS with:**
- ✅ 22/22 tests passing
- ✅ 6 screenshots generated
- ✅ Zero console errors
- ✅ Performance < 1s per navigation
- ✅ 80%+ anchor success rate (Test #20)

## 🎥 View Test Results

### HTML Report

```bash
# Generate report
npx playwright test tests/e2e/anchor-navigation.spec.js --reporter=html

# Open report
npx playwright show-report
```

### JSON Report

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --reporter=json > test-results.json
cat test-results.json | jq '.suites[0].specs[] | {title: .title, ok: .ok}'
```

## 🐛 Troubleshooting

### Issue: "baseURL not found"

**Fix:** Ensure frontend server is running on port 5173
```bash
curl http://localhost:5173
```

### Issue: "Test timeout"

**Fix:** Increase timeout in test or config
```bash
# Run with longer timeout
npx playwright test tests/e2e/anchor-navigation.spec.js --timeout=60000
```

### Issue: "Cannot find test page"

**Fix:** Verify the component showcase page exists
```bash
curl http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples
```

### Issue: Screenshots not saving

**Fix:** Ensure directory exists and is writable
```bash
mkdir -p tests/screenshots/anchor-navigation
chmod -R 755 tests/screenshots
```

### Issue: Tests fail randomly

**Fix:** Run sequentially (one at a time)
```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --workers=1
```

## 📝 Test Customization

### Run Specific Test Number

```bash
# Test #1 only
npx playwright test tests/e2e/anchor-navigation.spec.js -g "^1\."

# Test #20 only (comprehensive)
npx playwright test tests/e2e/anchor-navigation.spec.js -g "^20\."

# Tests 17-19 (screenshots)
npx playwright test tests/e2e/anchor-navigation.spec.js -g "^1[7-9]\."
```

### Change Browser

```bash
# Firefox
npx playwright test tests/e2e/anchor-navigation.spec.js --project=firefox

# WebKit (Safari)
npx playwright test tests/e2e/anchor-navigation.spec.js --project=webkit

# All browsers
npx playwright test tests/e2e/anchor-navigation.spec.js --project=chromium --project=firefox --project=webkit
```

### Slow Motion (See actions)

```bash
npx playwright test tests/e2e/anchor-navigation.spec.js --headed --slowmo=1000
```

## 🎬 Typical Test Run

```bash
$ npx playwright test tests/e2e/anchor-navigation.spec.js

Running 22 tests using 1 worker

  ✓  1. Should render page with sidebar and content sections (2.3s)
  ✓  2. Should render header elements with ID attributes in DOM (1.8s)
  ✓  3. Should click sidebar item and navigate to anchor (2.1s)
  ✓  4. Should update URL hash when anchor clicked (1.9s)
  ✓  5. Should scroll to target element smoothly (2.5s)
  ✓  6. Should highlight active sidebar item (2.0s)
  ✓  7. Should navigate between multiple anchor sections (3.2s)
  ✓  8. Should maintain scroll position after navigation (2.8s)
  ✓  9. Should handle rapid clicks on different anchors (2.4s)
  ✓  10. Should handle anchor to non-existent ID gracefully (1.7s)
  ✓  11. Should work with deeply nested components (1.5s)
  ✓  12. Should preserve anchor navigation on page reload (3.1s)
  ✓  13. Should work with browser back/forward buttons (3.5s)
  ✓  14. Should navigate with Tab key to sidebar items (2.6s)
  ✓  15. Should activate anchor with Enter key (2.2s)
  ✓  16. Should support keyboard accessibility (1.8s)
  ✓  17. Take screenshot of initial page state (2.9s)
  ✓  18. Take screenshot after anchor navigation (3.4s)
  ✓  19. Take screenshot of active sidebar highlighting (2.7s)
  ✓  20. Verify all 15 anchor links work (8.9s)
  ✓  21. Verify anchor navigation performance (3.3s)
  ✓  22. Verify anchor navigation works on mobile viewport (2.6s)

  22 passed (62.0s)
```

## 🔄 Continuous Testing

### Watch Mode

```bash
# Rerun tests on file changes
npx playwright test tests/e2e/anchor-navigation.spec.js --watch
```

### CI/CD Integration

Add to your `.github/workflows/test.yml`:
```yaml
- name: Run Anchor Navigation Tests
  run: |
    cd frontend
    npx playwright test tests/e2e/anchor-navigation.spec.js
```

## 📚 Documentation

- **Full README:** `ANCHOR_NAVIGATION_TESTS_README.md` (detailed guide)
- **Test Summary:** `ANCHOR_NAVIGATION_TEST_SUMMARY.md` (complete breakdown)
- **This Guide:** `RUN_ANCHOR_TESTS.md` (quick start)
- **Test File:** `anchor-navigation.spec.js` (735 lines, 22 tests)

## 💡 Pro Tips

1. **Always run validation first** - Catches common issues
2. **Use UI mode for debugging** - Visual test explorer
3. **Check screenshots** - Visual proof of functionality
4. **Run sequentially first time** - Avoid race conditions
5. **Use headed mode to watch** - See what's happening
6. **Check console output** - Rich logging included

## 🎯 Success Metrics

After running, verify:

```bash
# Check test results
echo "Tests passed!"

# Check screenshots generated
ls tests/screenshots/anchor-navigation/ | wc -l
# Should output: 6

# Check no error screenshots
ls tests/screenshots/anchor-navigation/*error* 2>/dev/null | wc -l
# Should output: 0

# View HTML report
npx playwright show-report
```

## 🚀 Next Steps

After tests pass:
1. Review HTML report for detailed results
2. Check screenshots for visual verification
3. Run tests in CI/CD pipeline
4. Add to regression test suite
5. Update as features evolve

---

**Need Help?**
- Run: `./tests/e2e/validate-anchor-tests.sh`
- Check: `ANCHOR_NAVIGATION_TESTS_README.md`
- Debug: `npx playwright test --debug`

**Happy Testing!** ✨
