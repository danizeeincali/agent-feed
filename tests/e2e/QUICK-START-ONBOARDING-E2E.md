# Quick Start: Onboarding E2E Tests

**Test Phase:** RED (Tests Will Fail)
**Duration:** 5-10 minutes
**Prerequisites:** Node.js, npm

## 🚀 One-Command Run

```bash
cd /workspaces/agent-feed
./tests/e2e/run-onboarding-e2e.sh
```

## What This Tests

✅ User comments "Nate Dog" on Get-to-Know-You post
✅ Get-to-Know-You agent responds with comment
✅ Get-to-Know-You agent creates use case question post
✅ Avi creates warm welcome post (NO technical jargon)
✅ All 3 responses visible simultaneously
✅ Toast notifications appear for each response
✅ Comment counter updates in real-time
✅ WebSocket connection stable
✅ No duplicate responses
✅ Correct response sequence order

## Expected Failures

These failures are EXPECTED in RED phase:

1. ❌ Get-to-Know-You agent does not respond (Avi responds instead)
2. ❌ Avi uses technical tone ("let me check the code...")
3. ❌ Response sequence wrong or incomplete

## Manual Run (No Script)

```bash
# Install Playwright (first time only)
npm install -D @playwright/test
npx playwright install

# Start backend (if not running)
cd api-server && npm start &

# Start frontend (if not running)
cd frontend && npm run dev &

# Run tests
npx playwright test --config playwright.config.onboarding.ts

# View results
npx playwright show-report tests/e2e/reports
```

## View Screenshots

```bash
# All screenshots
ls tests/screenshots/onboarding/

# Open screenshot folder
open tests/screenshots/onboarding/  # macOS
xdg-open tests/screenshots/onboarding/  # Linux
```

## Debug Failures

```bash
# Run in UI mode (recommended)
npx playwright test --config playwright.config.onboarding.ts --ui

# Run in debug mode
npx playwright test --config playwright.config.onboarding.ts --debug

# Run specific test
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding"
```

## Key Screenshots

After running tests, check these screenshots:

1. `03-gtk-comment-FAILED.png` - Shows Get-to-Know-You comment failure
2. `04-gtk-usecase-FAILED.png` - Shows use case post not created
3. `05-avi-welcome-FAILED.png` - Shows Avi welcome missing or wrong tone
4. `05-avi-technical-tone-FAILED.png` - Shows technical jargon in Avi response

## Success Criteria

Tests will pass when:
- ✅ Get-to-Know-You agent responds to name comment
- ✅ Get-to-Know-You creates use case post
- ✅ Avi creates warm welcome (NO technical terms)
- ✅ All responses visible in correct order
- ✅ Real-time updates via WebSocket

## Next Steps

1. Review failed test screenshots
2. Implement fixes per `/docs/ONBOARDING-FLOW-SPEC.md`
3. Re-run tests until GREEN
4. Run integration tests
5. Run unit tests

## Troubleshooting

**Backend not starting:**
```bash
cd api-server
npm start
```

**Frontend not loading:**
```bash
cd frontend
npm run dev
```

**Tests timeout:**
```bash
npx playwright test --config playwright.config.onboarding.ts --timeout=180000
```

**Need more detail:**
```bash
npx playwright test --config playwright.config.onboarding.ts --reporter=list
```

## Resources

- [Full E2E Test Documentation](README-ONBOARDING-E2E.md)
- [Onboarding Flow Specification](/docs/ONBOARDING-FLOW-SPEC.md)
- [Onboarding Architecture](/docs/ONBOARDING-ARCHITECTURE.md)
