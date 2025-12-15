# Avi DM OAuth Validation - Test Execution Guide

## Overview

This guide provides comprehensive instructions for executing Playwright tests that validate Avi DM functionality with OAuth authentication.

## Test Suite Details

**Test File**: `/workspaces/agent-feed/tests/playwright/ui-validation/avi-dm-oauth-validation.spec.js`

**Configuration**: `/workspaces/agent-feed/playwright.config.avi-oauth.cjs`

**Screenshots Directory**: `/workspaces/agent-feed/docs/validation/screenshots/avi-oauth/`

## Prerequisites

### 1. Required Services Running

Before running tests, ensure the following services are running:

```bash
# Frontend (port 5173)
npm run dev

# API Server (port 3001)
npm run server
```

**Verification**:
- Frontend accessible at: http://localhost:5173
- API server accessible at: http://localhost:3001
- Health check: http://localhost:3001/health

### 2. Claude CLI Authentication

For OAuth tests to pass, you need Claude CLI authenticated:

```bash
# Login to Claude CLI (if not already logged in)
claude login

# Verify login status
claude auth status
```

**Expected Output**:
```
✓ Authenticated via OAuth
Email: your-email@example.com
```

### 3. Database Setup

Ensure the database has test users:

```bash
# Initialize/migrate database if needed
npm run migrate
```

### 4. Install Playwright

If not already installed:

```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install chromium
```

## Running the Tests

### Option 1: Run All Tests (Recommended)

```bash
# Run all Avi OAuth validation tests
npx playwright test --config=playwright.config.avi-oauth.cjs
```

### Option 2: Run Specific Test Scenarios

```bash
# Run only Scenario 1 (OAuth DM Success)
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Scenario 1"

# Run only Scenario 2 (Settings Display)
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Scenario 2"

# Run only Scenario 3 (Response Validation)
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Scenario 3"

# Run only Scenario 4 (Multiple Auth Methods)
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Scenario 4"

# Run bonus network validation
npx playwright test --config=playwright.config.avi-oauth.cjs -g "Bonus"
```

### Option 3: Run with Visible Browser (Headed Mode)

```bash
# Run tests with browser visible (for debugging)
HEADLESS=false npx playwright test --config=playwright.config.avi-oauth.cjs
```

### Option 4: Run in Debug Mode

```bash
# Run tests with Playwright Inspector
npx playwright test --config=playwright.config.avi-oauth.cjs --debug
```

## Test Scenarios

### Scenario 1: OAuth User Sends DM to Avi - SUCCESS

**What it tests**:
- OAuth authentication is working
- User can send DM to Avi
- Avi response is received
- No 500 errors occur

**Expected Screenshots**:
1. `01-app-loaded.png` - Application loaded
2. `02-avi-dm-interface.png` - Avi DM interface
3. `03-message-composed.png` - Message composed
4. `04-message-sent.png` - Message sent
5. `05-avi-response.png` - Avi response received

**Pass Criteria**:
- Message successfully sent to Avi
- Response received within 45 seconds
- No 500 errors in console or network
- Screenshots captured at each step

### Scenario 2: Settings Page - Auth Method Display

**What it tests**:
- Settings page loads correctly
- OAuth method is displayed/selected
- CLI detection banner shows (green)
- Connection status visible

**Expected Screenshots**:
1. `06-settings-page-loaded.png` - Settings page
2. `07-oauth-selected.png` - OAuth selected
3. `08-settings-oauth-active.png` - OAuth active

**Pass Criteria**:
- OAuth radio button checked
- Green CLI detection banner visible
- Connection status displayed

### Scenario 3: Avi DM Response Validation - REAL API

**What it tests**:
- Real API integration (no mocks)
- Avi provides meaningful response
- No error messages displayed
- Response appears in UI

**Expected Screenshots**:
1. `09-test-question-sent.png` - Test question sent
2. `10-avi-dm-response.png` - Avi response

**Pass Criteria**:
- Question sent successfully
- Response received and displayed
- No error messages
- Response contains relevant content

### Scenario 4: Multiple Auth Methods

**What it tests**:
- Switching between OAuth and API key
- UI updates correctly
- Both methods are functional

**Expected Screenshots**:
1. `11-oauth-method.png` - OAuth method
2. `12-api-key-method.png` - API key method
3. `13-back-to-oauth.png` - Back to OAuth

**Pass Criteria**:
- Can switch between auth methods
- UI updates correctly for each method
- API key input visible when selected

### Bonus: Network Response Validation

**What it tests**:
- All API responses are correct
- No 500 errors in any endpoint
- Response status codes are valid

**Pass Criteria**:
- All API calls return 2xx status
- No 500 errors detected
- Auth settings endpoint works

## Expected Outputs

### 1. Screenshots

All screenshots will be saved to:
```
/workspaces/agent-feed/docs/validation/screenshots/avi-oauth/
```

**Minimum Expected Screenshots**: 13

**Screenshot List**:
- 01-app-loaded.png
- 02-avi-dm-interface.png
- 03-message-composed.png
- 04-message-sent.png
- 05-avi-response.png
- 06-settings-page-loaded.png
- 07-oauth-selected.png
- 08-settings-oauth-active.png
- 09-test-question-sent.png
- 10-avi-dm-response.png
- 11-oauth-method.png
- 12-api-key-method.png
- 13-back-to-oauth.png

### 2. Test Reports

**HTML Report**:
```
tests/playwright/ui-validation/results/avi-oauth-report/index.html
```

Open with:
```bash
npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report
```

**JSON Report**:
```
tests/playwright/ui-validation/results/avi-oauth-results.json
```

**JUnit XML**:
```
tests/playwright/ui-validation/results/avi-oauth-junit.xml
```

### 3. Console Output

Expected console output includes:
- Test scenario descriptions
- Step-by-step execution logs
- Screenshot capture confirmations
- API response logs
- Network activity summary
- Pass/fail status

## Troubleshooting

### Issue: Tests Timeout

**Cause**: Claude Code SDK responses can take 15-30 seconds

**Solution**:
- Tests are configured with 60-120 second timeouts
- If still timing out, check backend logs
- Verify Claude CLI is authenticated

### Issue: Screenshot Directory Not Found

**Cause**: Directory doesn't exist

**Solution**:
```bash
mkdir -p /workspaces/agent-feed/docs/validation/screenshots/avi-oauth
```

### Issue: Element Not Found

**Cause**: UI elements may have different selectors

**Solution**:
- Tests use multiple fallback selectors
- Check browser in headed mode: `HEADLESS=false`
- Inspect actual DOM structure

### Issue: 500 Errors Detected

**Cause**: Backend authentication or API issues

**Solution**:
- Check API server logs
- Verify Claude CLI authentication
- Check database user records
- Review backend auth configuration

### Issue: Claude CLI Not Detected

**Cause**: CLI not logged in

**Solution**:
```bash
# Login to Claude CLI
claude login

# Verify authentication
claude auth status
```

## Validation Checklist

After running tests, verify:

- [ ] All 5+ test scenarios passed
- [ ] At least 13 screenshots captured
- [ ] No 500 errors in any test
- [ ] Screenshots show working functionality
- [ ] OAuth authentication visible in settings
- [ ] Avi DM responses received successfully
- [ ] Network validation passed
- [ ] HTML report generated

## Success Criteria

**All tests PASS when**:

1. OAuth user can send DM to Avi without 500 errors
2. Settings page correctly displays OAuth method
3. CLI detection shows green banner
4. Avi responds to DM messages
5. No error messages in UI
6. All API responses return 2xx status codes
7. Screenshots show working functionality at each step

## Additional Commands

### View Screenshots

```bash
# Open screenshots directory
open docs/validation/screenshots/avi-oauth/

# Or on Linux
xdg-open docs/validation/screenshots/avi-oauth/
```

### Clean Up Test Artifacts

```bash
# Remove old test results
rm -rf tests/playwright/ui-validation/results/avi-oauth-*

# Remove old screenshots
rm -rf docs/validation/screenshots/avi-oauth/*
```

### Re-run Failed Tests Only

```bash
npx playwright test --config=playwright.config.avi-oauth.cjs --last-failed
```

## Environment Variables

Optional environment variables for customization:

```bash
# Frontend URL (default: http://localhost:5173)
export FRONTEND_URL=http://localhost:5173

# API URL (default: http://localhost:3001)
export API_URL=http://localhost:3001

# Run in headed mode (default: headless)
export HEADLESS=false

# Example: Run with custom ports
FRONTEND_URL=http://localhost:8080 API_URL=http://localhost:4000 npx playwright test --config=playwright.config.avi-oauth.cjs
```

## Quick Start (TL;DR)

```bash
# 1. Start services
npm run dev & npm run server &

# 2. Ensure Claude CLI logged in
claude login

# 3. Run tests
npx playwright test --config=playwright.config.avi-oauth.cjs

# 4. View results
npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report

# 5. Check screenshots
open docs/validation/screenshots/avi-oauth/
```

## Support

If tests fail unexpectedly:

1. Check prerequisites are met
2. Review console output for errors
3. Examine screenshots for visual clues
4. Run in headed mode for debugging
5. Check backend/frontend logs
6. Verify database state

## Summary

This test suite provides comprehensive validation of Avi DM functionality with OAuth authentication, capturing visual proof at every step. All tests use REAL endpoints (no mocking) for accurate validation.

**Test File**: `/workspaces/agent-feed/tests/playwright/ui-validation/avi-dm-oauth-validation.spec.js`

**Expected Results**: 5+ passing tests, 13+ screenshots, 0 500 errors
