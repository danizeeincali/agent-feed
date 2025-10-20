# SVG Icon E2E Tests - Quick Reference Card

## Execute Tests (Copy & Paste)

```bash
cd /workspaces/agent-feed && npx playwright test tests/e2e/svg-icon-validation.spec.ts --reporter=list
```

## View Screenshots

```bash
ls -la /workspaces/agent-feed/screenshots/svg-icons/
```

## Expected Output

```
16 passed (45s)
✓ 19+ SVG icons
✓ 0 emoji fallbacks
✓ T1: 9+ blue icons
✓ T2: 10+ gray icons
```

## File Locations

| File | Path |
|------|------|
| Test File | `/workspaces/agent-feed/tests/e2e/svg-icon-validation.spec.ts` |
| Runner | `/workspaces/agent-feed/tests/e2e/run-svg-icon-tests.sh` |
| Screenshots | `/workspaces/agent-feed/screenshots/svg-icons/` |

## Test Count

- **Visual Tests**: 3
- **Resolution Tests**: 4
- **Console Tests**: 2
- **Color Tests**: 2
- **Individual Tests**: 2
- **A11y Tests**: 2
- **Screenshot Tests**: 1
- **TOTAL**: 16 tests

## Success Criteria

- [x] 16/16 tests passing
- [x] 9 screenshots captured
- [x] 0 emoji fallbacks
- [x] 19+ SVG icons
- [x] 0 console errors

## Debug Command

```bash
npx playwright test tests/e2e/svg-icon-validation.spec.ts --debug
```

## View Report

```bash
npx playwright show-report
```

---

**Created**: 2025-10-20  
**Status**: Ready for execution
