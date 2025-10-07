# Quick Start: Sidebar Anchor Navigation Tests

## TL;DR

```bash
cd /workspaces/agent-feed/frontend
npm run dev &
sleep 5
./tests/e2e/run-anchor-tests.sh
```

## Step-by-Step Guide

### 1. Start Development Server

```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

Leave this running in a separate terminal.

### 2. Run All Tests (Easy Way)

```bash
./tests/e2e/run-anchor-tests.sh
```

### 3. Run All Tests (Manual Way)

```bash
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js
```

### 4. View Results

```bash
# Open HTML report
npx playwright show-report

# View screenshots
ls -lh tests/e2e/screenshots/

# View JSON report
cat tests/e2e/screenshots/test-report.json
```

## Quick Commands

### Run Specific Tests

```bash
# Run test #5
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js -g "Test multiple anchor links"

# Run tests 1-5
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js -g "^[1-5]\."

# Run edge case tests
npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js -g "Edge Cases"
```

### Run with UI

```bash
./tests/e2e/run-anchor-tests.sh --ui
```

### Run in Debug Mode

```bash
./tests/e2e/run-anchor-tests.sh --debug
```

### Run with Visible Browser

```bash
./tests/e2e/run-anchor-tests.sh --headed
```

### Run in Different Browser

```bash
# Firefox
./tests/e2e/run-anchor-tests.sh --browser=firefox

# WebKit (Safari)
./tests/e2e/run-anchor-tests.sh --browser=webkit
```

## What Gets Tested?

### Core Tests (19 Total)

1. **Basic Navigation** (Tests 1-5)
   - Page loads with sidebar
   - Clicking anchor links
   - Page scrolling
   - ID matching
   - Multiple anchors

2. **Advanced Features** (Tests 6-10)
   - Case-sensitive IDs
   - Smooth scrolling
   - Browser history
   - Direct URL navigation
   - Active highlighting

3. **Edge Cases** (Tests 11-18)
   - Hash updates
   - Scroll positions
   - Keyboard navigation
   - Special characters
   - Rapid clicking
   - Non-existent anchors
   - Empty hrefs
   - Page reloads

4. **Summary** (Test 19)
   - Comprehensive report
   - All scenarios
   - JSON output

## Expected Output

### Console Output

```
Running 19 tests using 1 worker

  ✓  1. Load page with sidebar containing anchor links (2.5s)
  ✓  2. Click sidebar item with anchor link (1.8s)
  ✓  3. Verify page scrolls to target element (2.1s)
  ✓  4. Verify anchor link target has matching ID (1.5s)
  ✓  5. Test multiple anchor links on same page (3.2s)
  ✓  6. Test anchor links with case-sensitive IDs (2.0s)
  ✓  7. Test smooth scrolling behavior (2.8s)
  ✓  8. Test browser back/forward with anchors (3.5s)
  ✓  9. Test direct URL navigation with hash (2.2s)
  ✓  10. Verify active item highlights correctly (2.4s)
  ✓  11. Test hash updates in URL on anchor click (2.6s)
  ✓  12. Test page scroll position changes on navigation (2.9s)
  ✓  13. Test anchor navigation with keyboard (2.3s)
  ✓  14. Test anchors with special characters in IDs (2.0s)
  ✓  15. Test rapid anchor clicking (3.1s)
  ✓  16. Test anchor to non-existent element (1.7s)
  ✓  17. Test empty anchor href (1.5s)
  ✓  18. Test anchor navigation preserves scroll on reload (2.8s)
  ✓  19. Comprehensive anchor navigation test summary (3.4s)

  19 passed (47.3s)
```

### Generated Files

```
tests/e2e/screenshots/
├── sidebar-anchor-initial-state.png
├── sidebar-anchor-01-page-loaded-with-sidebar.png
├── sidebar-anchor-02-clicked-features-link.png
├── sidebar-anchor-03-scrolled-to-implementation.png
├── sidebar-anchor-04-verified-matching-ids.png
├── sidebar-anchor-05-clicked-link-1-introduction.png
├── sidebar-anchor-05-clicked-link-2-features.png
├── sidebar-anchor-05-clicked-link-3-implementation.png
├── ...
├── sidebar-anchor-19-summary-click-introduction.png
└── test-report.json
```

## Troubleshooting

### "Dev server not running"

```bash
# Terminal 1: Start server
cd /workspaces/agent-feed/frontend
npm run dev

# Terminal 2: Run tests
./tests/e2e/run-anchor-tests.sh
```

### "Playwright not installed"

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### "Permission denied" on script

```bash
chmod +x tests/e2e/run-anchor-tests.sh
```

### "Screenshots directory not found"

```bash
mkdir -p tests/e2e/screenshots
```

### Tests timing out

```bash
# Increase timeout
PLAYWRIGHT_TIMEOUT=120000 npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js
```

## Viewing Screenshots

### Command Line

```bash
# List all screenshots
ls -lh tests/e2e/screenshots/

# View with image viewer (Linux)
eog tests/e2e/screenshots/sidebar-anchor-01-page-loaded-with-sidebar.png

# Open directory
xdg-open tests/e2e/screenshots/
```

### VS Code

1. Navigate to `tests/e2e/screenshots/` in Explorer
2. Click on any `.png` file
3. View in editor preview

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/anchor-tests.yml`:

```yaml
name: Anchor Navigation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npx playwright install --with-deps chromium
      - run: cd frontend && npm run dev &
      - run: sleep 10
      - run: cd frontend && npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: screenshots
          path: frontend/tests/e2e/screenshots/
```

## Performance Benchmarks

Expected timings on typical hardware:

- **Single test**: 1.5-3.5 seconds
- **Full suite**: 45-60 seconds
- **With headed browser**: +20-30%
- **With debug mode**: 2-3x slower

## Next Steps

1. ✅ Run tests locally
2. ✅ Review screenshots
3. ✅ Check test report
4. 📝 Add to CI/CD pipeline
5. 📝 Customize for your needs
6. 📝 Add more test scenarios

## Need Help?

- 📖 Read full documentation: `SIDEBAR_ANCHOR_NAVIGATION_TESTS.md`
- 🐛 Check screenshots for visual debugging
- 🔍 Run with `--debug` flag for step-by-step
- 📊 View HTML report: `npx playwright show-report`

## Quick Reference

| Command | Description |
|---------|-------------|
| `./tests/e2e/run-anchor-tests.sh` | Run all tests |
| `./tests/e2e/run-anchor-tests.sh --ui` | Run with UI |
| `./tests/e2e/run-anchor-tests.sh --headed` | Show browser |
| `./tests/e2e/run-anchor-tests.sh --debug` | Debug mode |
| `npx playwright show-report` | View HTML report |
| `ls tests/e2e/screenshots/` | List screenshots |

## Test Success Criteria

✅ All 19 tests pass
✅ No console errors
✅ Screenshots generated
✅ Test report created
✅ Scroll behavior correct
✅ Hash navigation works
✅ Active states update
✅ Browser history works

---

**Ready to run?** Start with: `./tests/e2e/run-anchor-tests.sh`
