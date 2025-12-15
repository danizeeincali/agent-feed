# Avi DM OAuth Validation - Quick Reference

## One-Command Test Execution

```bash
# Run all tests with report
npx playwright test --config=playwright.config.avi-oauth.cjs && npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report
```

## File Locations

| Item | Path |
|------|------|
| Test Spec | `/workspaces/agent-feed/tests/playwright/ui-validation/avi-dm-oauth-validation.spec.js` |
| Config | `/workspaces/agent-feed/playwright.config.avi-oauth.cjs` |
| Screenshots | `/workspaces/agent-feed/docs/validation/screenshots/avi-oauth/` |
| Test Guide | `/workspaces/agent-feed/docs/validation/AVI-OAUTH-TEST-EXECUTION-GUIDE.md` |
| Quick Reference | `/workspaces/agent-feed/docs/validation/AVI-OAUTH-QUICK-REFERENCE.md` |

## Test Scenarios Summary

| # | Scenario | Purpose | Key Validation |
|---|----------|---------|----------------|
| 1 | OAuth DM Success | Primary test - OAuth user sends DM | No 500 errors, response received |
| 2 | Settings Display | Auth method shown correctly | OAuth selected, CLI banner green |
| 3 | Response Validation | Real API integration test | Avi responds to questions |
| 4 | Multiple Auth Methods | Auth switching works | OAuth and API key both functional |
| 5 | Network Validation | All endpoints return correct status | No 500 errors anywhere |

## Expected Screenshots (13 minimum)

```
01-app-loaded.png              - Application loaded
02-avi-dm-interface.png        - Avi DM interface
03-message-composed.png        - Message composed
04-message-sent.png            - Message sent
05-avi-response.png            - Avi response received
06-settings-page-loaded.png    - Settings page
07-oauth-selected.png          - OAuth selected
08-settings-oauth-active.png   - OAuth active in settings
09-test-question-sent.png      - Test question sent
10-avi-dm-response.png         - Avi DM response
11-oauth-method.png            - OAuth method
12-api-key-method.png          - API key method
13-back-to-oauth.png           - Back to OAuth
```

## Quick Commands

### Run Tests
```bash
# All tests
npx playwright test --config=playwright.config.avi-oauth.cjs

# With visible browser
HEADLESS=false npx playwright test --config=playwright.config.avi-oauth.cjs

# Debug mode
npx playwright test --config=playwright.config.avi-oauth.cjs --debug

# Specific scenario
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Scenario 1"
```

### View Results
```bash
# Open HTML report
npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report

# View screenshots
open docs/validation/screenshots/avi-oauth/

# View JSON results
cat tests/playwright/ui-validation/results/avi-oauth-results.json | jq
```

### Prerequisites Check
```bash
# Check frontend (should return HTML)
curl http://localhost:5173

# Check backend (should return health status)
curl http://localhost:3001/health

# Check Claude CLI auth
claude auth status
```

## Success Indicators

**PASS**: All tests green
- 5+ scenarios passed
- 13+ screenshots captured
- No 500 errors detected
- All API responses 2xx
- OAuth working in settings
- Avi responds to DMs

**FAIL**: Red X on any test
- Check console output
- Review screenshots
- Verify prerequisites
- Check backend logs

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Timeout | Claude SDK slow (15-30s) - this is normal |
| Element not found | Run in headed mode to inspect DOM |
| 500 errors | Check backend auth, Claude CLI login |
| CLI not detected | Run `claude login` |
| Screenshots missing | Run `mkdir -p docs/validation/screenshots/avi-oauth` |

## Test Validation Checklist

- [ ] Frontend running (localhost:5173)
- [ ] Backend running (localhost:3001)
- [ ] Claude CLI logged in
- [ ] All tests passed
- [ ] 13+ screenshots captured
- [ ] No 500 errors
- [ ] Screenshots show working UI
- [ ] HTML report generated

## What Each Test Proves

### Scenario 1: OAuth DM Success
**Proves**: OAuth authentication works end-to-end for Avi DM without 500 errors

**Visual Proof**:
- Message composed in Avi DM interface
- Message sent successfully
- Avi response received and displayed

### Scenario 2: Settings Display
**Proves**: Settings page correctly detects and displays OAuth authentication

**Visual Proof**:
- OAuth radio button checked
- Green CLI detection banner visible
- Connection status displayed

### Scenario 3: Response Validation
**Proves**: Real API integration works (no mocking)

**Visual Proof**:
- Question sent to Avi
- Relevant response received
- No error messages

### Scenario 4: Multiple Auth Methods
**Proves**: User can switch between OAuth and API key

**Visual Proof**:
- OAuth method selected
- API key method selected
- UI updates correctly

### Bonus: Network Validation
**Proves**: All API endpoints return correct status codes

**Console Proof**:
- All responses logged
- No 500 errors
- All responses 2xx

## Quick Troubleshooting

```bash
# 1. Start services if not running
npm run dev & npm run server &

# 2. Verify services
curl http://localhost:5173 && curl http://localhost:3001/health

# 3. Login to Claude CLI if needed
claude login

# 4. Create screenshot directory
mkdir -p docs/validation/screenshots/avi-oauth

# 5. Run tests
npx playwright test --config=playwright.config.avi-oauth.cjs

# 6. View results
npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report
```

## Deliverables Checklist

- [x] Test spec file created
- [x] Playwright config created
- [x] Screenshot directory created
- [x] Test execution guide written
- [x] Quick reference guide written
- [ ] Tests executed successfully (run tests to complete)
- [ ] Screenshots captured (run tests to complete)
- [ ] HTML report generated (run tests to complete)

## Next Steps

1. Ensure all prerequisites are met
2. Run the test suite
3. Review screenshots
4. Verify all tests pass
5. Check HTML report
6. Share results

## Contact / Support

If tests fail unexpectedly, review:
1. Console output for error details
2. Screenshots for visual clues
3. Backend logs for API errors
4. Frontend console for client errors
5. Test execution guide for troubleshooting

---

**Test Suite**: Avi DM OAuth Validation
**Purpose**: Validate Avi DM works with OAuth authentication
**Method**: Real E2E testing with Playwright (no mocks)
**Output**: Screenshots + HTML report + Test results
