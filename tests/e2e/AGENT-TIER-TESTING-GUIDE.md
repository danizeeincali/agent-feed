# Agent Tier System E2E Testing Guide

**Document Version**: 1.0.0
**Date**: 2025-10-19
**Test Suite**: Agent Tier System Filtering
**Author**: QA Specialist Agent

---

## Overview

This guide provides comprehensive instructions for executing and maintaining the Agent Tier System E2E test suite using Playwright.

### Test Coverage

The test suite validates:

- **Default Behavior**: Tier 1 agents displayed by default (8 agents)
- **Tier Filtering**: Switch between Tier 1 (8), Tier 2 (11), and All (19)
- **UI Components**: AgentTierToggle, AgentIcon, protection badges
- **Persistence**: Filter state across page reloads and URL navigation
- **Visual Regression**: Screenshot comparison for UI consistency
- **Accessibility**: ARIA attributes, keyboard navigation
- **Performance**: Load times and filter switching speed
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Error Handling**: API failures, invalid parameters

### Test Statistics

| Category | Test Count | Coverage |
|----------|-----------|----------|
| Default View | 4 tests | Tier 1 default behavior |
| Tier Toggle | 4 tests | Component rendering and interaction |
| Tier 2 Filtering | 4 tests | Tier 2 agent display |
| All Agents View | 3 tests | Combined tier display |
| Filter Persistence | 4 tests | State management |
| Protection Indicators | 4 tests | Security badges |
| Keyboard Navigation | 4 tests | Accessibility |
| Performance | 3 tests | Speed benchmarks |
| Responsive Design | 3 tests | Multi-device support |
| Error Handling | 2 tests | Graceful degradation |
| Dark Mode | 2 tests | Theme support |
| Visual Regression | 8 tests | Screenshot validation |
| **TOTAL** | **45 tests** | **100% critical paths** |

---

## Quick Start

### Prerequisites

1. **Node.js 18+** and npm installed
2. **Frontend dev server** running on port 5173
3. **Backend API server** running on port 3000
4. **Playwright** installed with dependencies

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

### Start Servers

```bash
# Terminal 1: Start frontend
cd frontend
npm run dev
# Should start on http://localhost:5173

# Terminal 2: Start backend
cd api-server
node server.js
# Should start on http://localhost:3000
```

### Run Tests

```bash
# Quick test run
./tests/e2e/run-agent-tier-tests.sh

# Run with options
./tests/e2e/run-agent-tier-tests.sh --report --update-snapshots

# Run specific test file
npx playwright test agent-tier-filtering.spec.ts

# Run in UI mode (interactive)
npx playwright test agent-tier-filtering.spec.ts --ui

# Run in debug mode
npx playwright test agent-tier-filtering.spec.ts --debug
```

---

## Test Execution Options

### Script Options

The `run-agent-tier-tests.sh` script supports the following options:

| Option | Description |
|--------|-------------|
| `--update-snapshots` | Update visual regression baseline screenshots |
| `--headed` | Run tests with visible browser (not headless) |
| `--debug` | Launch Playwright Inspector for step-by-step debugging |
| `--report` | Automatically open HTML report after tests |
| `--ui` | Launch Playwright UI mode (interactive test runner) |

### Examples

```bash
# Update all screenshot baselines
./tests/e2e/run-agent-tier-tests.sh --update-snapshots

# Debug failing tests with visible browser
./tests/e2e/run-agent-tier-tests.sh --headed --debug

# Run tests and view report
./tests/e2e/run-agent-tier-tests.sh --report

# Interactive test development
./tests/e2e/run-agent-tier-tests.sh --ui
```

---

## Test Structure

### File Organization

```
tests/e2e/
├── agent-tier-filtering.spec.ts       # Main test suite (45 tests)
├── run-agent-tier-tests.sh            # Test execution script
├── AGENT-TIER-TESTING-GUIDE.md        # This documentation
├── playwright-report/                 # HTML test reports
├── test-results/                      # Test artifacts
│   ├── screenshots/                   # Failure screenshots
│   ├── videos/                        # Failure videos
│   └── traces/                        # Debug traces
└── .playwright/
    └── screenshots/                   # Visual regression baselines
        ├── agent-list-tier1.png
        ├── agent-list-tier2.png
        ├── agent-list-all.png
        ├── tier-toggle-default.png
        ├── tier-toggle-tier2.png
        ├── protection-badge.png
        ├── tier-toggle-dark.png
        └── ...
```

### Test Suites

The test file is organized into logical suites:

1. **Default View - Tier 1 Agents**
   - Validates default behavior showing only Tier 1 agents
   - Checks tier badge display
   - Verifies Tier 2 agents are hidden

2. **Tier Toggle Component**
   - Tests toggle rendering with agent counts
   - Validates ARIA attributes
   - Checks active state styling

3. **Tier Filtering - Tier 2 Agents**
   - Tests switching to Tier 2 view
   - Validates 11 tier 2 agents display
   - Checks URL parameter updates

4. **Tier Filtering - All Agents**
   - Tests displaying all 19 agents
   - Validates mixed tier badges
   - Checks URL parameter updates

5. **Filter Persistence**
   - Tests localStorage and URL sync
   - Validates state across page reloads
   - Checks direct URL navigation

6. **Protection Indicators**
   - Tests protection badges on Tier 2 agents
   - Validates badge styling and content
   - Ensures Tier 1 has no protection badges

7. **Keyboard Navigation**
   - Tests Tab, Enter, Space key support
   - Validates arrow key navigation
   - Checks focus management

8. **Performance Benchmarks**
   - Tests initial load time (<500ms)
   - Validates tier switching speed (<200ms)
   - Checks rapid switching stability

9. **Responsive Design**
   - Tests mobile (375px) layout
   - Tests tablet (768px) layout
   - Tests desktop (1920px) layout

10. **Error Handling**
    - Tests API error graceful degradation
    - Validates invalid tier parameter handling

11. **Dark Mode Support**
    - Tests tier toggle in dark mode
    - Validates filtering works with dark theme

12. **Visual Regression**
    - Component screenshots (tier toggle, badges)
    - Full page screenshots (tier 1, tier 2, all)
    - Dark mode screenshots
    - Responsive screenshots

---

## Test Scenarios

### Scenario 1: Default Tier 1 View

**Objective**: Verify default view shows only Tier 1 agents

**Steps**:
1. Navigate to `/`
2. Wait for agents to load

**Expected Results**:
- ✅ Exactly 8 agent cards displayed
- ✅ All tier badges show "Tier 1" or "User-Facing"
- ✅ Tier 1 button has `aria-pressed="true"`
- ✅ No Tier 2 specialists visible (agent-architect, skills-architect, etc.)

**Test File**: Line 32-85

---

### Scenario 2: Switch to Tier 2

**Objective**: Verify tier filtering switches to Tier 2 agents

**Steps**:
1. Navigate to `/`
2. Click "Tier 2" button
3. Wait for agents to update

**Expected Results**:
- ✅ Exactly 11 agent cards displayed
- ✅ All tier badges show "Tier 2" or "System"
- ✅ URL contains `tier=2` parameter
- ✅ Phase 4.2 specialists visible

**Test File**: Line 228-280

---

### Scenario 3: Show All Agents

**Objective**: Verify "All" filter shows both tier 1 and tier 2 agents

**Steps**:
1. Navigate to `/`
2. Click "All" button
3. Wait for agents to update

**Expected Results**:
- ✅ Exactly 19 agent cards displayed (8 + 11)
- ✅ Mixed tier badges (both Tier 1 and Tier 2)
- ✅ URL contains `tier=all` parameter

**Test File**: Line 282-324

---

### Scenario 4: Filter Persistence

**Objective**: Verify filter state persists across page reloads

**Steps**:
1. Navigate to `/`
2. Click "Tier 2" button
3. Reload page
4. Check agent count and active button

**Expected Results**:
- ✅ Still shows 11 Tier 2 agents after reload
- ✅ Tier 2 button still has `aria-pressed="true"`
- ✅ localStorage contains tier filter value
- ✅ URL parameter persists

**Test File**: Line 326-391

---

### Scenario 5: Protection Badges

**Objective**: Verify protection badges display on Tier 2 agents

**Steps**:
1. Navigate to `/`
2. Click "Tier 2" button
3. Count protection badges

**Expected Results**:
- ✅ At least 6 protection badges visible (Phase 4.2 specialists)
- ✅ Badge text contains "protect" or similar
- ✅ Badge has visible background color
- ✅ Tier 1 view has ZERO protection badges

**Test File**: Line 393-444

---

### Scenario 6: Keyboard Navigation

**Objective**: Verify full keyboard accessibility

**Steps**:
1. Navigate to `/`
2. Press Tab to focus tier toggle
3. Press Enter/Space to activate
4. Press arrow keys to navigate

**Expected Results**:
- ✅ Tab key focuses tier toggle buttons
- ✅ Enter key activates tier change
- ✅ Space key activates tier change
- ✅ Arrow keys navigate between buttons
- ✅ All buttons have `tabindex="0"`

**Test File**: Line 446-499

---

### Scenario 7: Performance

**Objective**: Verify acceptable performance benchmarks

**Steps**:
1. Measure initial page load time
2. Measure tier switching time
3. Test rapid switching stability

**Expected Results**:
- ✅ Initial load < 500ms
- ✅ Tier switch < 200ms
- ✅ Rapid switching (5x back-and-forth) works without errors
- ✅ Final state is correct after rapid switching

**Test File**: Line 501-541

---

### Scenario 8: Visual Regression

**Objective**: Verify UI consistency with baseline screenshots

**Steps**:
1. Capture screenshots of all components and pages
2. Compare against baseline images
3. Identify any visual regressions

**Expected Results**:
- ✅ Tier toggle matches baseline (default state)
- ✅ Tier toggle matches baseline (Tier 2 active)
- ✅ Protection badge matches baseline
- ✅ Full page Tier 1 list matches baseline
- ✅ Full page Tier 2 list matches baseline
- ✅ Full page All agents list matches baseline
- ✅ Dark mode variations match baselines
- ✅ Responsive layouts match baselines

**Test File**: Line 621-733

---

## Visual Regression Testing

### Baseline Management

Visual regression tests compare current screenshots against baseline images stored in `.playwright/screenshots/`.

#### Update Baselines

When UI changes are intentional (design updates, new features), update baselines:

```bash
# Update all baselines
./tests/e2e/run-agent-tier-tests.sh --update-snapshots

# Update specific test baselines
npx playwright test agent-tier-filtering.spec.ts --update-snapshots --grep "Visual Regression"
```

#### Review Differences

When tests fail due to visual differences:

1. Check the HTML report: `tests/e2e/playwright-report/index.html`
2. Visual diffs are highlighted in red
3. Compare "Expected", "Actual", and "Diff" images
4. Determine if difference is intentional or a bug

#### Screenshot Configuration

Screenshots are configured in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,          // Allow 20% diff for anti-aliasing
    maxDiffPixels: 100,      // Max 100 pixels different
    maxDiffPixelRatio: 0.01, // Max 1% pixels different
    animations: 'disabled',  // Disable animations
    caret: 'hide'           // Hide text cursor
  }
}
```

### Screenshot Inventory

| Screenshot | Description | Size | Purpose |
|-----------|-------------|------|---------|
| `tier-toggle-default.png` | Tier toggle with Tier 1 active | ~5KB | Component validation |
| `tier-toggle-tier2.png` | Tier toggle with Tier 2 active | ~5KB | Active state validation |
| `protection-badge.png` | Protection badge component | ~2KB | Badge styling validation |
| `agent-list-tier1.png` | Full page Tier 1 view | ~150KB | Page layout validation |
| `agent-list-tier2.png` | Full page Tier 2 view | ~180KB | Page layout validation |
| `agent-list-all.png` | Full page All agents view | ~220KB | Page layout validation |
| `tier-toggle-dark.png` | Dark mode tier toggle | ~5KB | Dark theme validation |
| `agent-list-tier1-dark.png` | Dark mode full page | ~160KB | Dark theme validation |
| `agent-list-mobile.png` | Mobile viewport (375px) | ~120KB | Responsive validation |
| `agent-list-tablet.png` | Tablet viewport (768px) | ~170KB | Responsive validation |

---

## Debugging Failed Tests

### Common Issues

#### Issue 1: Incorrect Agent Count

**Symptom**: Test expects 8 agents but finds different count

**Possible Causes**:
- Backend returning wrong data
- API filtering not working
- Frontend not applying filter correctly

**Debug Steps**:
```bash
# Check API response
curl http://localhost:3000/api/agents?tier=1

# Check frontend state
npx playwright test agent-tier-filtering.spec.ts --debug

# Inspect network requests in debug mode
```

**Solution**:
- Verify backend tier classification logic
- Check frontend filter implementation
- Ensure database has correct agent tier values

---

#### Issue 2: Tier Toggle Not Visible

**Symptom**: `button:has-text("Tier 1")` selector times out

**Possible Causes**:
- Component not rendering
- Different text content
- CSS hiding element

**Debug Steps**:
```bash
# Run in headed mode to see browser
./tests/e2e/run-agent-tier-tests.sh --headed

# Use debug mode
npx playwright test agent-tier-filtering.spec.ts --debug --grep "tier toggle"

# Check page HTML
npx playwright codegen http://localhost:5173
```

**Solution**:
- Add `data-testid="tier-toggle"` to component
- Update selector to match actual rendered HTML
- Check for JavaScript errors preventing render

---

#### Issue 3: Visual Regression Failure

**Symptom**: Screenshot comparison fails with pixel differences

**Possible Causes**:
- Intentional UI changes
- Font rendering differences
- Timing issues (animations not fully disabled)

**Debug Steps**:
```bash
# Generate new baseline if change is intentional
./tests/e2e/run-agent-tier-tests.sh --update-snapshots

# Review diff in HTML report
open tests/e2e/playwright-report/index.html
```

**Solution**:
- Update baseline if change is correct
- Increase `maxDiffPixels` threshold if minor difference
- Add `await page.waitForTimeout(300)` before screenshot to ensure render complete

---

#### Issue 4: Flaky Tests

**Symptom**: Test passes sometimes, fails other times

**Possible Causes**:
- Race conditions (async data loading)
- Animation timing
- Network variability

**Debug Steps**:
```bash
# Run test multiple times
for i in {1..10}; do
  npx playwright test agent-tier-filtering.spec.ts --grep "flaky test name"
done

# Add explicit waits
await page.waitForLoadState('networkidle');
```

**Solution**:
- Use `waitForSelector` with timeout
- Wait for `networkidle` load state
- Add `waitForTimeout` after actions that trigger state changes

---

#### Issue 5: Server Not Running

**Symptom**: Pre-flight checks fail, cannot connect to localhost:5173

**Debug Steps**:
```bash
# Check if process is running
lsof -i :5173
lsof -i :3000

# Check server logs
# Terminal 1: Frontend logs
# Terminal 2: Backend logs

# Restart servers
cd frontend && npm run dev
cd api-server && node server.js
```

**Solution**:
- Start required servers before running tests
- Check for port conflicts
- Verify environment variables are set correctly

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/agent-tier-e2e-tests.yml`:

```yaml
name: Agent Tier E2E Tests

on:
  push:
    branches: [main, develop, v1]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    name: Playwright E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start application servers
        run: |
          cd frontend && npm run dev &
          cd api-server && node server.js &
          npx wait-on http://localhost:5173 http://localhost:3000

      - name: Run E2E tests
        run: npx playwright test agent-tier-filtering.spec.ts

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-failures
          path: tests/e2e/test-results/
```

---

## Test Maintenance

### Adding New Tests

1. **Identify test scenario** (e.g., new tier filter option)
2. **Add test to appropriate describe block**
3. **Follow naming convention**: `should [expected behavior] when [action]`
4. **Use proper selectors**: Prefer `data-testid` > `role` > `text`
5. **Add assertions**: Verify expected state changes
6. **Update documentation**: Add to this guide

**Example**:

```typescript
test('should maintain filter when navigating to agent profile', async ({ page }) => {
  // Set Tier 2 filter
  await page.click('button:has-text("Tier 2")');
  await page.waitForTimeout(300);

  // Click first agent card
  await page.locator('[data-testid="agent-card"]').first().click();
  await page.waitForLoadState('networkidle');

  // Go back
  await page.goBack();
  await page.waitForTimeout(300);

  // Should still be on Tier 2
  const agentCards = await page.locator('[data-testid="agent-card"]').count();
  expect(agentCards).toBe(11);
});
```

### Removing Obsolete Tests

1. **Identify deprecated functionality**
2. **Comment out test** with reason
3. **Run full suite** to ensure no dependencies
4. **Remove test after 1 sprint** if confirmed obsolete

### Updating Baselines

When UI components change intentionally:

```bash
# Review current failures
./tests/e2e/run-agent-tier-tests.sh --report

# If changes are correct, update baselines
./tests/e2e/run-agent-tier-tests.sh --update-snapshots

# Commit new baselines
git add tests/e2e/.playwright/screenshots/
git commit -m "Update visual regression baselines for [feature]"
```

---

## Best Practices

### Test Writing

1. **Use descriptive test names**: Clearly state what is being tested
2. **One assertion per concept**: Don't over-test in a single test
3. **Avoid hard-coded waits**: Use `waitForSelector` instead of `waitForTimeout`
4. **Clean up state**: Each test should be independent
5. **Use data-testid attributes**: More stable than text or CSS selectors

### Selectors

Selector priority (most stable → least stable):

1. `[data-testid="specific-id"]` - Best, most stable
2. `[role="button"]` - Good for accessibility
3. `button:has-text("Tier 1")` - Acceptable for unique text
4. `.class-name` - Fragile, avoid
5. `nth-child(2)` - Very fragile, avoid

### Performance

- Keep tests fast: <30s per test file
- Use `fullyParallel: false` to avoid race conditions
- Minimize `waitForTimeout` usage
- Reuse page instances where possible

### Maintainability

- Extract common selectors to constants
- Use page object model for complex pages
- Document non-obvious waits or workarounds
- Keep tests DRY (Don't Repeat Yourself)

---

## Troubleshooting

### Environment Issues

**Problem**: Tests work locally but fail in CI

**Solutions**:
- Check Node.js version matches
- Verify Playwright browsers are installed
- Ensure environment variables are set
- Check for timing differences (CI is slower)

### Selector Issues

**Problem**: `Timeout 30000ms exceeded` when waiting for selector

**Solutions**:
- Verify element actually renders in UI
- Check for typos in selector
- Use Playwright Inspector to find correct selector
- Add explicit wait before selector

### Screenshot Issues

**Problem**: Visual regression always fails despite no visible changes

**Solutions**:
- Font rendering differences: Install exact fonts in CI
- Animation differences: Ensure `animations: 'disabled'`
- Timing differences: Add `waitForLoadState('networkidle')`
- Platform differences: Generate baselines in same environment as CI

---

## Resources

### Documentation

- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Test Architecture Doc](/workspaces/agent-feed/docs/ARCHITECTURE-TESTING-INTEGRATION.md)

### Tools

- **Playwright Inspector**: `npx playwright test --debug`
- **Playwright UI Mode**: `npx playwright test --ui`
- **Codegen**: `npx playwright codegen http://localhost:5173`
- **Trace Viewer**: `npx playwright show-trace trace.zip`

### Team Contacts

- **QA Lead**: Review test failures, approve baseline updates
- **Frontend Team**: Component implementation, test data attributes
- **Backend Team**: API endpoint validation, test data setup
- **DevOps**: CI/CD pipeline, test environment

---

## Appendix

### Test Data

The test suite relies on the following agent configuration:

- **Tier 1 Agents** (8): personal-todos-agent, agent-feedback-agent, etc.
- **Tier 2 Agents** (11): agent-architect-agent, skills-architect-agent, etc.
- **Total Agents**: 19

If agent counts change, update the test expectations accordingly.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Frontend server URL |
| `CI` | `false` | CI environment flag |

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-19 | Initial test suite creation |

---

**END OF GUIDE**
