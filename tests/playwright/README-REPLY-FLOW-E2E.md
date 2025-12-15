# Reply Flow E2E Tests

Comprehensive Playwright E2E test suite validating reply processing pill visibility and agent response routing.

## Quick Start

```bash
# Run full test suite (recommended)
./run-reply-flow-validation.sh

# Quick smoke test (single test)
./QUICK-TEST-REPLY-FLOW.sh

# View results
npx playwright show-report reports/reply-flow-html
```

## Test Files

- `comment-reply-full-flow.spec.ts` - 4 comprehensive E2E tests
- `playwright.config.reply-flow.ts` - Test configuration (in root)
- `run-reply-flow-validation.sh` - Full suite runner
- `QUICK-TEST-REPLY-FLOW.sh` - Quick smoke test

## Test Scenarios

### Test 1: Processing Pill Visibility (~15s)
Validates spinner appears during reply submission

### Test 2: Agent Response to Reply (~45s)
Validates Avi responds to his own thread

### Test 3: Deep Threading (~60s)
Validates multi-level reply chains (5+ levels)

### Test 4: Multiple Agents (~45s)
Validates different agents maintain separate threads

## Expected Results

```
✓ Test 1: Reply Processing Pill Visibility (15s)
✓ Test 2: Agent Response to Reply (45s)
✓ Test 3: Deep Threading (Reply to Reply) (60s)
✓ Test 4: Multiple Agents - Get-to-Know-You (45s)

4 passed (165s)
```

## Screenshots

16+ automated screenshots captured at:
`screenshots/reply-flow/`

Critical screenshots:
- `reply-2-processing-pill.png` - Shows spinner during submission
- `routing-3-avi-responded.png` - Shows agent routing working
- `deep-thread-5-avi-third-comment.png` - Shows deep threading

## Reports

- **HTML**: `reports/reply-flow-html/index.html`
- **JSON**: `reports/reply-flow-results.json`
- **JUnit**: `reports/reply-flow-junit.xml`

## Documentation

Full documentation in `/docs/`:

- **Quick Start**: `REPLY-FLOW-E2E-QUICK-START.md` (2 min read)
- **Full Guide**: `REPLY-FLOW-E2E-TEST-SUITE.md` (10 min read)
- **Validation**: `REPLY-FLOW-E2E-VALIDATION-CHECKLIST.md` (15 min)
- **Index**: `REPLY-FLOW-E2E-TEST-INDEX.md` (overview)
- **Delivery**: `REPLY-FLOW-E2E-DELIVERY-SUMMARY.md` (complete)

## Prerequisites

1. Frontend running: http://localhost:5173
2. Backend running: http://localhost:3000
3. Playwright installed: `npm install --save-dev @playwright/test`
4. Chromium browser: `npx playwright install chromium`

## Troubleshooting

### Servers Not Running
```bash
# Frontend
npm run dev

# Backend
cd api-server && npm start
```

### Tests Fail
```bash
# Debug mode
npx playwright test --config=playwright.config.reply-flow.ts --debug

# Single test
npx playwright test --config=playwright.config.reply-flow.ts --grep "Test 1"
```

### Screenshots Missing
```bash
mkdir -p screenshots/reply-flow
./run-reply-flow-validation.sh
```

## What's Being Tested

### Fix 1: Reply Processing Pill
**Location**: `/frontend/src/components/CommentThread.tsx:371-397`

Visual feedback during reply submission:
- Spinner icon appears
- "Posting..." text shown
- Form stays open during submission
- Success state after completion

### Fix 2: Agent Response Routing
**Location**: `/api-server/avi/orchestrator.js:270-290`

Correct agent responds to replies:
- Parent comment author identified
- Same agent responds to reply
- No other agents interfere
- Deep threading maintained

## Success Criteria

- All 4 tests pass
- 16+ screenshots captured
- Processing spinner visible in screenshots
- Agent routing correct in all scenarios
- No regressions in existing functionality

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Reply Flow E2E Tests
  run: |
    npx playwright test \
      --config=playwright.config.reply-flow.ts \
      --reporter=html,json,junit
```

## Version

- **Version**: 1.0.0
- **Created**: 2025-11-14
- **Status**: Production Ready

---

For detailed documentation, see `/docs/REPLY-FLOW-E2E-TEST-INDEX.md`
