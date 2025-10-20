# Agent Tabs Validation - Quick Start Guide

## Prerequisites

1. Backend server running on `http://localhost:3001`
2. Frontend server running on `http://localhost:5173`
3. Coder agents have completed their changes:
   - ✅ Backend: `/api/agents/:slug` includes `tools` field
   - ✅ Frontend: WorkingAgentProfile.tsx reduced to 2 tabs
   - ✅ Frontend: Tools section added to Overview tab

## Quick Validation (30 seconds)

```bash
cd /workspaces/agent-feed/tests/e2e

# Check backend API
./validate-backend-api-v2.sh

# If backend passes, run E2E tests
cd /workspaces/agent-feed
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts --reporter=line
```

## Full Validation (5 minutes)

```bash
cd /workspaces/agent-feed

# 1. Backend API validation
tests/e2e/validate-backend-api-v2.sh

# 2. Run all E2E tests
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts --reporter=html

# 3. Run visual regression tests
npx playwright test tests/e2e/visual-regression-validation.spec.ts --reporter=html

# 4. View reports
npx playwright show-report
```

## Specific Test Cases

```bash
# Test only tab count
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "VALIDATION-002"

# Test only tools section
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "VALIDATION-003"

# Test removed tabs
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "VALIDATION-004"

# Test multiple agents
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "VALIDATION-006"

# Test responsive design
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "responsive"
```

## Debug Mode

```bash
# Run with headed browser (see what's happening)
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts --headed

# Run in debug mode
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts --debug

# Run single test in debug mode
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts -g "VALIDATION-002" --debug
```

## Expected Results

### ✅ Success Criteria

**Backend**:
```
✓ meta-agent (3 tools)
✓ tech-guru (4 tools)
✓ code-reviewer (5 tools)
...
Passed: 5/5
Pass Rate: 100%
```

**E2E Tests**:
```
✅ VALIDATION-001: Backend API returns tools field
✅ VALIDATION-002: Agent profile shows exactly 2 tabs
✅ VALIDATION-003: Overview tab contains Tools section
✅ VALIDATION-004: Removed tabs are not present
✅ VALIDATION-005: Dynamic Pages tab functions correctly
✅ VALIDATION-006: Test multiple agents
✅ VALIDATION-007: Responsive design - Tablet
✅ VALIDATION-008: Responsive design - Mobile
✅ VALIDATION-009: Dark mode support
✅ VALIDATION-010: Light mode support
✅ VALIDATION-011: No console errors
✅ VALIDATION-012: Tools data is real
✅ VALIDATION-013: Agent navigation works
✅ VALIDATION-014: Performance validation
✅ VALIDATION-015: Tab switching is smooth

15 passed (2.5m)
```

### ❌ Current State (Before Implementation)

**Backend**:
```
✗ meta-agent (missing tools field)
✗ tech-guru (missing tools field)
...
Passed: 0/5
Pass Rate: 0%
```

**E2E Tests**:
```
❌ VALIDATION-002: Expected 2 tabs, found 5
❌ VALIDATION-003: Tools section not found
❌ VALIDATION-004: Removed tabs still present
...
```

## Reports Location

After running tests, check:

- **Backend Report**: `/workspaces/agent-feed/tests/e2e/reports/backend-api-validation-*.txt`
- **Screenshots**: `/workspaces/agent-feed/tests/e2e/reports/screenshots/`
- **Playwright HTML Report**: `playwright-report/index.html`
- **Test Results JSON**: `/workspaces/agent-feed/tests/e2e/test-results.json`

## Troubleshooting

### Backend validation fails
```bash
# Check if backend is running
curl http://localhost:3001/api/agents/meta-agent | jq

# Check if tools field exists
curl http://localhost:3001/api/agents/meta-agent | jq '.data.tools'
```

### E2E tests timeout
```bash
# Check if frontend is running
curl http://localhost:5173

# Run with increased timeout
npx playwright test tests/e2e/agent-tabs-final-validation.spec.ts --timeout=60000
```

### Screenshots not captured
```bash
# Ensure directory exists
mkdir -p /workspaces/agent-feed/tests/e2e/reports/screenshots

# Run visual regression separately
npx playwright test tests/e2e/visual-regression-validation.spec.ts
```

## Manual Verification

If automated tests are unclear, manually verify:

1. **Open browser**: http://localhost:5173/agents
2. **Click any agent** (e.g., meta-agent)
3. **Count tabs**: Should see exactly 2 tabs (Overview, Dynamic Pages)
4. **Check Overview tab**: Should see "Tools" section
5. **Verify tools**: Each tool should have name + description
6. **Check removed tabs**: Should NOT see Activities, Performance, Capabilities

## Next Steps After Validation

### If All Tests Pass ✅
1. Review validation report
2. Collect evidence (screenshots, logs)
3. Mark validation as COMPLETE
4. Approve for production

### If Tests Fail ❌
1. Review failure report
2. Identify which changes are incomplete
3. Notify coder agents
4. Re-run validation after fixes

## Contact

**Questions?** Check `/workspaces/agent-feed/tests/e2e/reports/AGENT-TABS-VALIDATION-REPORT.md`
