# Quick Start: Running Anchor Navigation Tests

## Prerequisites
```bash
cd /workspaces/agent-feed/frontend
npm install
```

## Run Tests

### Option 1: UI Mode (Recommended - Visual Debugging)
```bash
npm run test:e2e -- --project=page-verification --ui anchor-navigation-complete
```
**Benefits:**
- Watch tests run in real-time
- Step through test actions
- Inspect DOM at each step
- View screenshots immediately
- Debug failures interactively

### Option 2: Headless Mode (CI/Automated)
```bash
npm run test:e2e -- --project=page-verification anchor-navigation-complete
```

### Option 3: Run Single Test
```bash
npm run test:e2e -- --project=page-verification -g "Headers have auto-generated IDs"
```

### Option 4: Debug Mode
```bash
npm run test:e2e -- --project=page-verification --debug anchor-navigation-complete
```

## View Results

### HTML Report
```bash
npx playwright show-report
```

### Screenshots
```bash
ls -la screenshots/anchor-test-*.png
```

### Traces (on failure)
```bash
npx playwright show-trace test-results/[latest-trace-file]
```

## Common Issues & Solutions

### Issue 1: "Test page not found"
**Problem**: `/test-page-with-anchors` doesn't exist

**Solution**: Update the test page URL in `navigateToTestPage()`:
```typescript
// Line ~14 in anchor-navigation-complete.spec.ts
async function navigateToTestPage(page: Page) {
  await page.goto(`${BASE_URL}/your-actual-page-url`);
  await page.waitForLoadState('networkidle');
}
```

### Issue 2: "No anchor links found"
**Problem**: Sidebar selector doesn't match your HTML

**Solution**: Update the sidebar selector:
```typescript
// Find this pattern in tests and update:
page.locator('nav a[href^="#"], aside a[href^="#"], .your-sidebar-class a[href^="#"]')
```

### Issue 3: "Server not running"
**Problem**: Dev server at localhost:5173 not accessible

**Solution**: Playwright auto-starts server, but if needed:
```bash
npm run dev
```

### Issue 4: "Tests timeout"
**Problem**: Page takes too long to load

**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
timeout: 90000, // Increase from 60000
```

## Test Coverage

### ✅ What's Tested (22 tests)
1. Header ID auto-generation
2. Kebab-case formatting
3. Special character handling
4. Number handling in IDs
5. All header levels (h1-h6)
6. Sidebar link matching
7. Click and scroll behavior
8. Smooth scrolling
9. Multiple clicks
10. URL hash updates
11. Direct URL navigation
12. Browser back/forward
13. Post-interaction navigation
14. Viewport positioning
15. Non-existent ID handling
16. Collapsed sidebar
17. Mobile viewport
18. Rapid clicking stress test
19. Tab + anchor integration
20. Full user workflow
21. Console error detection
22. Performance measurement

## Expected Results

### All Passing ✅
```
22 passed (1m 30s)
```

### Sample Failure ❌
```
anchor-navigation-complete.spec.ts:XX:YY › Test Name

Expected: true
Received: false

    at tests/e2e/page-verification/anchor-navigation-complete.spec.ts:XX:YY
```

**Action**: Check screenshot in `screenshots/anchor-test-*.png`

## Screenshot Guide

Each test generates specific screenshots:

| Test # | Screenshot File | What It Shows |
|--------|----------------|---------------|
| 1 | `anchor-test-1-header-ids-verification.png` | All headers with IDs |
| 2 | `anchor-test-2-special-characters.png` | Special char handling |
| 3 | `anchor-test-3-numbers.png` | Number handling |
| 7 | `anchor-test-7-before-scroll.png` | Before anchor click |
| 7 | `anchor-test-7-after-scroll.png` | After anchor click |
| 10 | `anchor-test-10-url-hash.png` | URL with hash |
| 17 | `anchor-test-17-mobile.png` | Mobile viewport |
| 22 | `anchor-test-22-performance.png` | Performance metrics |

## Performance Expectations

### Good Performance ✅
- Scroll duration: < 500ms
- Test suite: < 2 minutes
- No console errors
- All screenshots captured

### Poor Performance ❌
- Scroll duration: > 1000ms
- Test suite: > 5 minutes
- Console errors present
- Missing screenshots

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Anchor Navigation Tests
  run: |
    npm run test:e2e -- --project=page-verification anchor-navigation-complete

- name: Upload Screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: anchor-test-screenshots
    path: frontend/screenshots/anchor-test-*.png

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: frontend/test-results/
```

## Next Steps

1. **Customize**: Update test page URL and selectors
2. **Run**: Execute tests in UI mode
3. **Review**: Check screenshots and results
4. **Fix**: Address any failures
5. **Integrate**: Add to CI/CD pipeline
6. **Monitor**: Track test stability over time

## Support

- **Playwright Docs**: https://playwright.dev
- **Test File**: `tests/e2e/page-verification/anchor-navigation-complete.spec.ts`
- **Config**: `playwright.config.ts`
- **Summary**: `ANCHOR_NAVIGATION_TEST_SUMMARY.md`

---
**Quick Reference Created**: 2025-10-07
