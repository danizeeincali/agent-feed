# Quick Start: SVG Icon Validation E2E Tests

## Run Tests (3 Commands)

```bash
# 1. Navigate to project root
cd /workspaces/agent-feed

# 2. Ensure servers are running
# Terminal 1: npm run dev (frontend on :5173)
# Terminal 2: npm start (backend on :3001)

# 3. Run SVG icon tests
npx playwright test tests/e2e/svg-icon-validation.spec.ts --reporter=list
```

## Expected Output

```
Running 16 tests using 1 worker

✓ [chromium] › svg-icon-validation.spec.ts:54:3 › SVG Icon Validation - Visual Tests › should display SVG icons for all agents (no emoji fallbacks)
✓ [chromium] › svg-icon-validation.spec.ts:86:3 › SVG Icon Validation - Visual Tests › should display blue SVG icons for T1 agents
✓ [chromium] › svg-icon-validation.spec.ts:117:3 › SVG Icon Validation - Visual Tests › should display gray SVG icons for T2 agents
✓ [chromium] › svg-icon-validation.spec.ts:157:3 › SVG Icon Validation - Resolution Tests › should resolve correct icon count for All filter
✓ [chromium] › svg-icon-validation.spec.ts:172:3 › SVG Icon Validation - Resolution Tests › should resolve correct icon count for T1 filter
✓ [chromium] › svg-icon-validation.spec.ts:185:3 › SVG Icon Validation - Resolution Tests › should resolve correct icon count for T2 filter
✓ [chromium] › svg-icon-validation.spec.ts:198:3 › SVG Icon Validation - Resolution Tests › should not render emoji fallbacks in any filter state
✓ [chromium] › svg-icon-validation.spec.ts:228:3 › SVG Icon Validation - Console Error Tests › should not log icon lookup errors
✓ [chromium] › svg-icon-validation.spec.ts:263:3 › SVG Icon Validation - Console Error Tests › should not log React key warnings for icons
✓ [chromium] › svg-icon-validation.spec.ts:287:3 › SVG Icon Validation - Tier Color Tests › should apply correct Tailwind classes for tier colors
✓ [chromium] › svg-icon-validation.spec.ts:327:3 › SVG Icon Validation - Tier Color Tests › should maintain tier colors after filter toggle
✓ [chromium] › svg-icon-validation.spec.ts:364:3 › SVG Icon Validation - Individual Agent Tests › should display SVG icon for each individual agent
✓ [chromium] › svg-icon-validation.spec.ts:388:3 › SVG Icon Validation - Individual Agent Tests › should not have mixed icon types (SVG + emoji) in same view
✓ [chromium] › svg-icon-validation.spec.ts:406:3 › SVG Icon Validation - Accessibility Tests › should have proper ARIA labels on all SVG icons
✓ [chromium] › svg-icon-validation.spec.ts:424:3 › SVG Icon Validation - Accessibility Tests › should have role="img" on all SVG icons
✓ [chromium] › svg-icon-validation.spec.ts:439:3 › SVG Icon Validation - Screenshot Comparison › should capture baseline screenshots for visual regression

16 passed (45s)
```

## View Screenshots

```bash
ls -la /workspaces/agent-feed/screenshots/svg-icons/

# Expected files:
# - svg-icons-all-agents.png
# - svg-icons-tier1-filtered.png
# - svg-icons-tier2-filtered.png
# - svg-icons-tier-colors-detailed.png
# - svg-icons-filter-toggle-complete.png
# - baseline-all-agents.png
# - baseline-tier1-filtered.png
# - baseline-tier2-filtered.png
# - baseline-single-agent.png
```

## Test Categories

1. **Visual Tests (3)** - Screenshot capture + icon validation
2. **Resolution Tests (4)** - Icon count verification per filter
3. **Console Error Tests (2)** - Error monitoring
4. **Tier Color Tests (2)** - Color validation
5. **Individual Agent Tests (2)** - Per-agent validation
6. **Accessibility Tests (2)** - ARIA compliance
7. **Screenshot Comparison (1)** - Visual regression baseline

## One-Liner Test Execution

```bash
cd /workspaces/agent-feed && npx playwright test tests/e2e/svg-icon-validation.spec.ts --reporter=list,html && npx playwright show-report
```

## Debug Mode

```bash
npx playwright test tests/e2e/svg-icon-validation.spec.ts --debug
```

## Success Criteria

- ✓ 16/16 tests passing
- ✓ 9 screenshots captured
- ✓ 0 console errors
- ✓ 0 emoji fallbacks
- ✓ 19+ SVG icons displayed

---

**Test File**: `/workspaces/agent-feed/tests/e2e/svg-icon-validation.spec.ts`  
**Screenshots**: `/workspaces/agent-feed/screenshots/svg-icons/`
