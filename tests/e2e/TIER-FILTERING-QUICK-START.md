# Tier Filtering UI Tests - Quick Start Guide

**5-Minute Setup & Execution**

---

## Prerequisites Check (30 seconds)

```bash
# 1. Check servers are running
lsof -i :5173 :3000 | grep LISTEN

# 2. If not running:
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
node api-server/server.js
```

---

## Run Tests (1 minute)

### Option 1: Automated Script (Recommended)
```bash
./tests/e2e/run-tier-filtering-ui-tests.sh
```

### Option 2: Manual Command
```bash
npx playwright test tier-filtering-ui-validation.spec.ts
```

---

## Expected Results

### TDD Phase (Before Backend Implementation)
```
❌ Some tests will FAIL (this is expected!)

Likely failures:
- API endpoint not implemented (404 errors)
- Agent counts don't match (backend filtering missing)
- Protection badges missing

Action: Implement backend tier filtering endpoint
```

### Production Phase (After Backend Implementation)
```
✅ All 21 tests PASS

Success indicators:
- 8 tier 1 agents
- 11 tier 2 agents
- 19 total agents
- localStorage persistence works
- Screenshots captured
```

---

## Quick Commands

```bash
# Run specific group only
npx playwright test tier-filtering-ui-validation.spec.ts -g "Group 1"

# Interactive UI mode
npx playwright test tier-filtering-ui-validation.spec.ts --ui

# Debug single test
npx playwright test tier-filtering-ui-validation.spec.ts -g "1.1" --debug

# View last report
npx playwright show-report

# Update screenshots (first run)
npx playwright test tier-filtering-ui-validation.spec.ts --update-snapshots
```

---

## Test Counts

| Filter | Expected Agents |
|--------|----------------|
| **Tier 1** (default) | 8 |
| **Tier 2** | 11 |
| **All** | 19 |

---

## File Locations

```
📁 Test Suite
/workspaces/agent-feed/tests/e2e/tier-filtering-ui-validation.spec.ts

📁 Test Runner
/workspaces/agent-feed/tests/e2e/run-tier-filtering-ui-tests.sh

📁 Screenshots
/workspaces/agent-feed/tests/e2e/screenshots/tier-filtering-ui/

📁 Full Report
/workspaces/agent-feed/tests/e2e/TIER-FILTERING-UI-TEST-REPORT.md
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests timeout | Check servers: `lsof -i :5173 :3000` |
| 404 errors | Backend API not implemented yet (expected) |
| Wrong counts | Verify agent database has tier metadata |
| No screenshots | Run with `--update-snapshots` flag |

---

## What's Being Tested?

✅ **21 Comprehensive Tests:**
1. Default tier 1 view (3 tests)
2. Tier toggle interaction (4 tests)
3. Visual components (4 tests)
4. localStorage persistence (3 tests)
5. API integration (3 tests)
6. Screenshot capture (4 tests)

---

## Next Steps After Test Run

### If Tests FAIL (TDD Phase):
1. Review failure messages
2. Implement backend tier filtering
3. Re-run tests
4. Iterate until all pass

### If Tests PASS:
1. Review screenshots for visual accuracy
2. Run cross-browser tests
3. Perform manual QA
4. Sign off on feature

---

**Need Help?**
See full documentation: `/workspaces/agent-feed/tests/e2e/TIER-FILTERING-UI-TEST-REPORT.md`
