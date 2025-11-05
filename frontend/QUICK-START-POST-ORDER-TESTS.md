# Quick Start: Onboarding Post Order E2E Tests

## TL;DR - Run Tests Now

```bash
cd /workspaces/agent-feed/frontend
./run-onboarding-post-order-tests.sh
```

---

## Prerequisites Checklist

- ✅ Backend server running (port 3001)
- ✅ Frontend server running (port 5173)
- ✅ Database reset completed
- ✅ Node.js and npm installed
- ✅ Playwright installed

**Verify Prerequisites**:
```bash
./verify-test-setup.sh
```

---

## Common Commands

### Run All Tests
```bash
./run-onboarding-post-order-tests.sh
```

### Run with Browser Visible
```bash
npx playwright test --config=playwright.config.onboarding-post-order.ts --headed
```

### Run Single Test
```bash
npx playwright test --config=playwright.config.onboarding-post-order.ts -g "exactly 3 onboarding posts"
```

### Debug Mode
```bash
npx playwright test --config=playwright.config.onboarding-post-order.ts --debug
```

### View Report
```bash
npx playwright show-report playwright-report-post-order
```

---

## What Tests Validate

1. ✅ **Exactly 3 posts** displayed
2. ✅ **First post**: "Welcome to Agent Feed!" by Λvi
3. ✅ **Second post**: "Hi! Let's Get Started" by Get-to-Know-You
4. ✅ **Third post**: "📚 How Agent Feed Works" by System Guide
5. ✅ **No duplicates**
6. ✅ **Order persists** after refresh
7. ✅ **Timestamps** in descending order

---

## Screenshots Location

`/workspaces/agent-feed/docs/screenshots/post-order-fix/`

---

## Troubleshooting

### Servers Not Running
```bash
# Terminal 1 - Backend
cd /workspaces/agent-feed/api-server
node server.js

# Terminal 2 - Frontend
cd /workspaces/agent-feed/frontend
npm run dev
```

### Database Issues
```bash
cd /workspaces/agent-feed
./scripts/reset-production-database.sh
```

### Test Failures
```bash
# View detailed report
npx playwright show-report playwright-report-post-order

# View trace
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## Files

- **Test File**: `src/tests/e2e/onboarding-post-order-validation.spec.ts`
- **Config**: `playwright.config.onboarding-post-order.ts`
- **Run Script**: `run-onboarding-post-order-tests.sh`
- **Verify Script**: `verify-test-setup.sh`
- **Full Docs**: `src/tests/e2e/README-onboarding-post-order.md`
- **Summary**: `/workspaces/agent-feed/docs/E2E-ONBOARDING-POST-ORDER-TEST-SUMMARY.md`

---

## Success Output

```
================================================
Onboarding Post Order Validation E2E Tests
================================================

✓ Backend server is running
✓ Frontend server is running
✓ Directory created

Running Playwright tests...

Running 14 tests using 1 worker
  ✓ [onboarding-post-order-chrome] › onboarding-post-order-validation.spec.ts:20:3 › Should navigate...
  ✓ [onboarding-post-order-chrome] › onboarding-post-order-validation.spec.ts:27:3 › Should wait...
  ✓ [onboarding-post-order-chrome] › onboarding-post-order-validation.spec.ts:40:3 › Should display exactly 3...
  ✓ [onboarding-post-order-chrome] › onboarding-post-order-validation.spec.ts:54:3 › Should display first post...
  ... (all tests passing)

  14 passed (1.2m)

================================================
✓ All tests passed!

Screenshots saved to: ../docs/screenshots/post-order-fix/
HTML report: playwright-report-post-order/index.html

View report with:
  npx playwright show-report playwright-report-post-order
================================================
```

---

## Need More Info?

- Full documentation: `src/tests/e2e/README-onboarding-post-order.md`
- Complete summary: `/workspaces/agent-feed/docs/E2E-ONBOARDING-POST-ORDER-TEST-SUMMARY.md`
