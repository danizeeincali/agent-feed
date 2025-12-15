# Component Rendering Test Suite - Quick Start

## TL;DR

```bash
# Run all tests with script
/workspaces/agent-feed/run-component-rendering-tests.sh

# Or run directly
cd /workspaces/agent-feed/frontend
npx playwright test component-rendering-validation.spec.ts
```

## What Gets Tested

### Critical Validation
✓ **NO JSON Fallback** - Verifies components render instead of JSON dump
✓ **All Component Types** - Container, Stack, Grid, Card, Badge, Button, Metric, Progress
✓ **Nested Hierarchies** - Container → Stack → Grid → Card rendering
✓ **Data Bindings** - Template variables like `{{stats.total_tasks}}`
✓ **Responsive Design** - Mobile (375px), Tablet (768px), Desktop (1920px)
✓ **Performance** - Load time < 8s, Interactive < 10s

## Test Results Location

**Screenshots:** `/workspaces/agent-feed/frontend/tests/e2e/screenshots/component-rendering/`
**HTML Report:** `/workspaces/agent-feed/frontend/playwright-report/index.html`

## Test Suites (18 tests total)

1. **Component Rendering Validation** (3 tests)
   - Dashboard renders without JSON fallback
   - All component types present
   - Nested component hierarchy

2. **Data Binding Validation** (2 tests)
   - Template variables display
   - Badge variants render

3. **Backward Compatibility** (1 test)
   - Legacy layout format works

4. **Error Handling** (2 tests)
   - Invalid pages fail gracefully
   - Console errors monitored

5. **Responsive Design** (3 tests)
   - Mobile, Tablet, Desktop viewports

6. **Performance** (2 tests)
   - Load performance metrics
   - Element rendering speed

7. **Comprehensive Validation** (1 test)
   - Full end-to-end workflow

## Expected Screenshots (18 total)

```
comprehensive-dashboard-rendered.png  ← Most important: No JSON fallback
all-component-types.png
nested-components.png
data-bindings.png
badge-variants.png
legacy-format.png
json-fallback.png
error-monitoring.png
mobile-view.png
desktop-view.png
tablet-view.png
performance-loaded.png
rendering-complete.png
workflow-step1-navigation.png
workflow-step2-rendering.png
workflow-step3-components.png
workflow-step4-errors.png
workflow-complete.png
```

## Success Criteria

**PASS if:**
- No "Page Data" text appears (JSON fallback)
- 10+ component types render
- Nesting depth > 5 levels
- Console errors < 10
- Load time < 8 seconds
- All viewports render content

**FAIL if:**
- "Page Data" text found (components not rendering)
- < 5 component types
- Console errors >= 10
- Load time > 10 seconds
- Blank screens in any viewport

## Quick Commands

```bash
# Run all tests
npx playwright test component-rendering-validation.spec.ts

# Run with HTML report
npx playwright test component-rendering-validation.spec.ts --reporter=html
npx playwright show-report

# Run single test suite
npx playwright test component-rendering-validation.spec.ts -g "Component Rendering"

# Run in debug mode
npx playwright test component-rendering-validation.spec.ts --debug

# Run in headed mode (see browser)
npx playwright test component-rendering-validation.spec.ts --headed

# Run specific test
npx playwright test component-rendering-validation.spec.ts -g "Comprehensive Dashboard"
```

## Troubleshooting

### Test fails with "Page Data" found
**Problem:** Components not rendering, falling back to JSON
**Fix:** Check DynamicPageRenderer.tsx handles both `components` and `layout` arrays

### High console error count
**Problem:** JavaScript errors during rendering
**Fix:** Check browser console in headed mode to identify errors

### Slow load times
**Problem:** Performance targets exceeded
**Fix:** Check network tab for slow API calls, optimize data fetching

### Screenshots missing
**Problem:** Screenshot directory doesn't exist
**Fix:** Run `mkdir -p frontend/tests/e2e/screenshots/component-rendering`

### No elements rendering
**Problem:** Page shows blank or minimal content
**Fix:** Check page spec JSON is valid and contains components array

## Files

**Test Spec:** `/workspaces/agent-feed/frontend/tests/e2e/component-rendering-validation.spec.ts` (656 lines)
**Test Runner:** `/workspaces/agent-feed/run-component-rendering-tests.sh`
**Test Data:** `/workspaces/agent-feed/data/agent-pages/personal-todos-agent-comprehensive-dashboard.json`
**Documentation:** `/workspaces/agent-feed/COMPONENT_RENDERING_TEST_SUITE.md`

## Test Page Used

**URL:** `http://localhost:5173/agents/personal-todos-agent/comprehensive-dashboard`
**Agent:** personal-todos-agent
**Page ID:** comprehensive-dashboard
**Format:** Components array (new format)

## Next Steps After Running

1. Check test output for pass/fail
2. Review screenshots in `/frontend/tests/e2e/screenshots/component-rendering/`
3. Open HTML report: `npx playwright show-report`
4. If failures, check console errors logged in test output
5. Verify `comprehensive-dashboard-rendered.png` shows components (not JSON)

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Component Rendering Tests
  run: |
    cd frontend
    npx playwright test component-rendering-validation.spec.ts --reporter=html,junit

- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: component-rendering-screenshots
    path: frontend/tests/e2e/screenshots/component-rendering/
```

## Performance Baselines

| Metric | Target | Acceptable |
|--------|--------|------------|
| Time to Interactive | < 8s | < 10s |
| Load Complete | < 5s | < 8s |
| Element Count | > 100 | > 50 |
| Console Errors | 0 | < 10 |

---

**Last Updated:** 2025-10-04
**Test Suite Version:** 1.0
**Total Test Scenarios:** 18
**Total Screenshots:** 18
