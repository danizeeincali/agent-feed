# Agent Tier E2E Tests - Quick Start

## 1. Prerequisites Check

```bash
# Ensure servers are running
lsof -i :5173 :3000 | grep LISTEN

# If not running:
# Terminal 1: cd frontend && npm run dev
# Terminal 2: node api-server/server.js
```

## 2. Run Tests

```bash
# Simple run
npx playwright test agent-tier-filtering.spec.ts

# With script (includes pre-flight checks)
./tests/e2e/run-agent-tier-tests.sh
```

## 3. Common Commands

```bash
# Interactive UI mode
npx playwright test agent-tier-filtering.spec.ts --ui

# Debug mode
npx playwright test agent-tier-filtering.spec.ts --debug

# Update screenshots
npx playwright test agent-tier-filtering.spec.ts --update-snapshots

# View last report
npx playwright show-report tests/e2e/playwright-report
```

## 4. Expected Results

- ✅ 45 tests should pass
- ✅ HTML report generated
- ✅ Screenshots captured (on first run)

## 5. Test Counts

| Filter | Expected Agents |
|--------|----------------|
| Tier 1 (default) | 8 |
| Tier 2 | 11 |
| All | 19 |

## 6. Quick Troubleshooting

**Tests timeout?**
→ Check servers are running on 5173 and 3000

**Visual regression fails?**
→ Run with `--update-snapshots` to create baselines

**Need help?**
→ See `/workspaces/agent-feed/tests/e2e/AGENT-TIER-TESTING-GUIDE.md`

---

**Full Documentation**: `/workspaces/agent-feed/tests/e2e/AGENT-TIER-TESTING-GUIDE.md`
