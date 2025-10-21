# Regression Test Screenshots

This directory contains visual evidence from the regression test suite that validates AVI DM and Quick Post functionality after the ghost post fix.

## Expected Screenshots

After running the regression test suite, the following screenshots will be generated:

### 1. avi-dm-working.png
**Purpose:** Verify AVI DM chat functionality
**Shows:**
- AVI DM tab selected
- User message "hello" sent
- AVI response displayed
- Chat history visible
- No console errors

**Success Criteria:**
- Message input field visible
- User message displayed
- AVI response text present
- Chat interface rendered correctly

---

### 2. quick-post-working.png
**Purpose:** Verify Quick Post creation and feed display
**Shows:**
- Quick Post tab selected
- Test post created successfully
- Post appears in feed
- Post count increased
- No errors displayed

**Success Criteria:**
- Post creation form visible
- Newly created post in feed
- Timestamp and metadata displayed
- Post interaction buttons visible

---

### 3. feed-functional.png
**Purpose:** Verify feed loads and displays correctly
**Shows:**
- Feed page loaded
- Multiple posts visible
- Like/comment buttons present
- Posts render correctly
- No missing data or errors

**Success Criteria:**
- Posts displayed in feed
- Interaction buttons visible
- Post metadata shown
- Layout renders properly

---

## Generating Screenshots

Screenshots are automatically generated when running the regression test suite:

```bash
# Run all tests (generates screenshots on success)
./scripts/run-regression-tests.sh

# Or use Playwright directly
npx playwright test tests/e2e/ghost-post-regression.spec.ts
```

## Screenshot Specifications

| Screenshot | Resolution | Format | Size (approx) |
|-----------|-----------|--------|---------------|
| avi-dm-working.png | 1280x720 | PNG | 200-500 KB |
| quick-post-working.png | 1280x720 | PNG | 200-500 KB |
| feed-functional.png | 1280x720 | PNG | 200-500 KB |

All screenshots are full-page captures to show complete UI state.

## Troubleshooting

### Screenshots Not Generated

**Problem:** Screenshot directory is empty after test run

**Solutions:**
1. Check test passed successfully (screenshots only on pass for evidence)
2. Verify directory permissions: `chmod -R 755 tests/screenshots/regression`
3. Check disk space: `df -h`
4. Review test logs for screenshot errors

### Screenshots Show Errors

**Problem:** Screenshots contain error messages or broken UI

**Solutions:**
1. Verify app is running: `curl http://localhost:5173`
2. Check backend is accessible: `curl http://localhost:3000/health`
3. Review browser console in test output
4. Run test with `--headed` flag to see browser: `./scripts/run-regression-tests.sh --headed`

### Screenshots Are Blank

**Problem:** Screenshots are white/blank pages

**Solutions:**
1. Check timeout settings in test file
2. Verify page loaded: look for "networkidle" in logs
3. Increase wait times for slow connections
4. Check test-results/ for video to see what happened

## Viewing Screenshots

### Command Line
```bash
# List all screenshots
ls -lah tests/screenshots/regression/

# View in terminal (if supported)
imgcat tests/screenshots/regression/avi-dm-working.png

# Open in default viewer
xdg-open tests/screenshots/regression/avi-dm-working.png  # Linux
open tests/screenshots/regression/avi-dm-working.png       # macOS
```

### HTML Report
```bash
# Generate and view HTML report with embedded screenshots
npx playwright test tests/e2e/ghost-post-regression.spec.ts --reporter=html
npx playwright show-report
```

## Screenshot Validation Checklist

Use this checklist to manually verify screenshot quality:

### ✅ avi-dm-working.png
- [ ] AVI DM tab is active/highlighted
- [ ] Chat interface is visible
- [ ] User message "hello" displayed
- [ ] AVI response text present and readable
- [ ] No error messages visible
- [ ] Chat history shows both messages
- [ ] UI is fully rendered (no loading states)

### ✅ quick-post-working.png
- [ ] Quick Post tab is active
- [ ] Test post visible in feed
- [ ] Post content matches test input
- [ ] Timestamp is displayed
- [ ] Post count increased
- [ ] Like/comment buttons visible
- [ ] No error states or missing data

### ✅ feed-functional.png
- [ ] Feed page loaded completely
- [ ] Multiple posts visible
- [ ] Post metadata displayed (author, time, etc.)
- [ ] Interaction buttons present
- [ ] No console errors visible
- [ ] Layout is correct (no overlapping elements)
- [ ] Connection status shows "Connected"

## Related Documentation

- [REGRESSION-TEST-QUICK-REF.md](/workspaces/agent-feed/REGRESSION-TEST-QUICK-REF.md) - Quick reference guide
- [tests/e2e/README-REGRESSION.md](/workspaces/agent-feed/tests/e2e/README-REGRESSION.md) - Full documentation
- [GHOST-POST-FIX-SPEC.md](/workspaces/agent-feed/GHOST-POST-FIX-SPEC.md) - Fix specification

## Screenshot Metadata

Each screenshot includes:
- **Timestamp:** When the test was run
- **Browser:** Chromium (Playwright default)
- **Viewport:** 1280x720 (configurable in test)
- **Full Page:** Yes (captures entire scrollable area)
- **Test Name:** Embedded in filename

## Archiving Screenshots

To archive screenshots from a test run:

```bash
# Create timestamped archive
tar -czf regression-screenshots-$(date +%Y%m%d-%H%M%S).tar.gz tests/screenshots/regression/*.png

# Move to archive directory
mkdir -p tests/screenshots/archive
mv regression-screenshots-*.tar.gz tests/screenshots/archive/
```

## CI/CD Integration

In CI/CD pipelines, screenshots are uploaded as artifacts:

```yaml
# GitHub Actions example
- name: Upload Screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: regression-screenshots
    path: tests/screenshots/regression/*.png
    retention-days: 30
```

---

**Ready to generate screenshots?**
```bash
./scripts/run-regression-tests.sh
```

Screenshots will appear in this directory after successful test execution.
