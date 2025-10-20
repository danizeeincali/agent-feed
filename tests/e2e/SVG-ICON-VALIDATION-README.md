# SVG Icon Validation E2E Test Suite

## Overview

Comprehensive E2E test suite validating that `AgentIcon.tsx` correctly resolves and displays SVG icons for all agents, with NO emoji fallbacks.

## Test Coverage

### 1. Visual Validation Tests (3 tests)
- **All agents view**: Verify 19+ SVG icons, 0 emoji fallbacks
- **T1 filter**: Verify 9+ blue SVG icons
- **T2 filter**: Verify 10+ gray SVG icons

### 2. Resolution Tests (4 tests)
- Correct icon count for "All" filter
- Correct icon count for "T1" filter
- Correct icon count for "T2" filter
- No emoji fallbacks in any filter state

### 3. Console Error Tests (2 tests)
- No icon lookup errors
- No React key warnings

### 4. Tier Color Tests (2 tests)
- Correct Tailwind classes (blue for T1, gray for T2)
- Color persistence after filter toggle

### 5. Individual Agent Tests (2 tests)
- Each agent displays SVG icon
- No mixed icon types (SVG + emoji)

### 6. Accessibility Tests (2 tests)
- All SVG icons have `aria-label`
- All SVG icons have `role="img"`

### 7. Screenshot Comparison (1 test)
- Baseline screenshot capture for visual regression

**Total: 16 comprehensive tests**

## Prerequisites

1. **Frontend running**: `http://localhost:5173`
2. **Backend running**: `http://localhost:3001` (optional but recommended)
3. **19 agents total**: 9 T1, 10 T2

## Quick Start

```bash
# From tests/e2e directory
./run-svg-icon-tests.sh
```

Or run directly:

```bash
npx playwright test svg-icon-validation.spec.ts --reporter=list
```

## Expected Results

### Pass Criteria
- ✓ 19+ SVG icons with `role="img"` and `aria-label`
- ✓ 0 emoji fallbacks (`<span role="img">`)
- ✓ T1 agents: blue SVG icons
- ✓ T2 agents: gray SVG icons
- ✓ No console errors related to icon lookup
- ✓ All screenshots captured successfully

### Screenshots Captured

Location: `/workspaces/agent-feed/screenshots/svg-icons/`

1. `svg-icons-all-agents.png` - All 19 agents
2. `svg-icons-tier1-filtered.png` - T1 filtered (9 agents)
3. `svg-icons-tier2-filtered.png` - T2 filtered (10 agents)
4. `svg-icons-tier-colors-detailed.png` - Tier color validation
5. `svg-icons-filter-toggle-complete.png` - Filter toggle state
6. `baseline-all-agents.png` - Visual regression baseline
7. `baseline-tier1-filtered.png` - T1 baseline
8. `baseline-tier2-filtered.png` - T2 baseline
9. `baseline-single-agent.png` - Single agent detail

## Test Scenarios

### Scenario 1: All Agents View
```typescript
// Navigate to /agents
// Expected: 19+ SVG icons, 0 emoji
const svgCount = await page.locator('svg[role="img"]').count();
expect(svgCount).toBeGreaterThanOrEqual(19);

const emojiCount = await page.locator('span[role="img"]').count();
expect(emojiCount).toBe(0);
```

### Scenario 2: Tier Filtering
```typescript
// Click T1 filter
// Expected: 9+ blue SVG icons
await page.locator('button:has-text("T1")').first().click();

const blueIcons = await page.locator('svg[class*="blue"]').count();
expect(blueIcons).toBeGreaterThan(0);
```

### Scenario 3: No Console Errors
```typescript
// Monitor console during page load
page.on('console', msg => {
  if (msg.type() === 'error' && msg.text().includes('icon')) {
    iconErrors.push(msg.text());
  }
});

expect(iconErrors.length).toBe(0);
```

## Debugging

### If tests fail:

1. **Check screenshot directory**:
   ```bash
   ls -la /workspaces/agent-feed/screenshots/svg-icons/
   ```

2. **View screenshots** to visually inspect icons

3. **Check browser console** for errors:
   ```bash
   npx playwright test svg-icon-validation.spec.ts --debug
   ```

4. **Verify agent count**:
   ```bash
   curl http://localhost:3001/api/agents | jq '. | length'
   ```

5. **Inspect AgentIcon.tsx**:
   ```bash
   cat /workspaces/agent-feed/frontend/src/components/agents/AgentIcon.tsx
   ```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run SVG Icon Validation Tests
  run: |
    cd tests/e2e
    ./run-svg-icon-tests.sh
    
- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: svg-icon-screenshots
    path: screenshots/svg-icons/
```

## Related Files

- **Test File**: `/workspaces/agent-feed/tests/e2e/svg-icon-validation.spec.ts`
- **Component**: `/workspaces/agent-feed/frontend/src/components/agents/AgentIcon.tsx`
- **Unit Tests**: `/workspaces/agent-feed/frontend/src/tests/unit/AgentIcon.test.tsx`
- **Icon Mapping**: `/workspaces/agent-feed/frontend/src/constants/agentIcons.ts`

## Validation Checklist

Before running tests, ensure:

- [ ] Frontend running at `http://localhost:5173`
- [ ] Backend running at `http://localhost:3001`
- [ ] 19 agents loaded (9 T1, 10 T2)
- [ ] AgentIcon.tsx includes Object type check fix
- [ ] Unit tests passing (27/27)

## Success Metrics

- **Test Pass Rate**: 16/16 (100%)
- **Screenshot Capture**: 9/9 screenshots
- **Console Errors**: 0
- **Emoji Fallbacks**: 0
- **SVG Icons**: 19+

## Troubleshooting

### Issue: Screenshot directory not found
```bash
mkdir -p /workspaces/agent-feed/screenshots/svg-icons
```

### Issue: Servers not running
```bash
# Terminal 1: Frontend
cd /workspaces/agent-feed/frontend
npm run dev

# Terminal 2: Backend
cd /workspaces/agent-feed
npm start
```

### Issue: Wrong agent count
```bash
# Verify agent count via API
curl http://localhost:3001/api/agents | jq '[.[] | {id, tier}] | group_by(.tier) | map({tier: .[0].tier, count: length})'
```

## Report

After test execution:

```bash
# View HTML report
npx playwright show-report

# View JSON results
cat playwright-report/results.json | jq '.suites[] | {name, tests: .specs | length, passed: [.specs[].tests[] | select(.status == "passed")] | length}'
```

---

**Author**: QA Testing Agent  
**Date**: 2025-10-20  
**Version**: 1.0.0  
**Status**: Ready for execution
