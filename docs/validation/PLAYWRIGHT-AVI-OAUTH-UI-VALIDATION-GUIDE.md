# Avi DM OAuth Integration - Playwright UI Validation Guide

**Agent**: Playwright UI Validation Agent
**Date**: 2025-11-11
**Test Suite**: Avi DM OAuth UI Validation
**Test File**: `tests/playwright/avi-dm-oauth-ui-validation.spec.ts`

---

## 📋 Overview

This comprehensive Playwright test suite validates the Avi DM OAuth integration through real browser automation, capturing 20+ screenshots at every critical step to provide visual proof of functionality.

## 🎯 Test Coverage

### 10 Comprehensive Test Scenarios

1. **OAuth User - Avi DM Success Flow** (7 screenshots)
   - Home page navigation
   - DM interface loading
   - Auth status verification
   - Message composition
   - Message sending
   - Response receipt
   - Success validation

2. **API Key User - Avi DM Success Flow** (7 screenshots)
   - Settings navigation
   - Auth method selection
   - API key entry
   - Settings save
   - DM interface with API key
   - Message composition and send
   - Response validation

3. **Platform PAYG User - Avi DM Flow** (6 screenshots)
   - Settings navigation
   - PAYG selection
   - Settings save
   - DM interface with PAYG
   - Message send
   - Response with billing

4. **OAuth Token Refresh Flow** (5 screenshots)
   - Initial settings state
   - OAuth activation
   - DM interface ready
   - Message send (triggers token validation)
   - Response after refresh

5. **Error Handling - Invalid OAuth Token** (2 screenshots)
   - Initial error state
   - Error messaging UI

6. **Responsive UI - Desktop View (1920x1080)** (2 screenshots)
   - Desktop home page
   - Desktop DM interface

7. **Responsive UI - Tablet View (768x1024)** (2 screenshots)
   - Tablet home page
   - Tablet DM interface

8. **Responsive UI - Mobile View (375x667)** (2 screenshots)
   - Mobile home page
   - Mobile DM interface

9. **Auth Method Switching Flow** (4 screenshots)
   - Settings initial state
   - OAuth selected
   - API Key selected
   - PAYG selected

10. **Complete End-to-End OAuth Flow** (10 screenshots)
    - Full user journey from home to response
    - All critical steps documented

**Total Expected Screenshots**: 47+ screenshots

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Ensure servers are running
npm run dev:frontend  # Port 5173
npm run dev:api       # Port 3001

# 2. Install Playwright browsers (if not already installed)
npx playwright install chromium
```

### Run Tests

**Option 1: Using the automated test runner script**
```bash
./tests/playwright/run-avi-oauth-validation.sh
```

**Option 2: Using Playwright CLI**
```bash
# Run all tests
npx playwright test --config=playwright.config.avi-dm-oauth.cjs

# Run in headed mode (see browser)
npx playwright test --config=playwright.config.avi-dm-oauth.cjs --headed

# Run specific test
npx playwright test --config=playwright.config.avi-dm-oauth.cjs -g "OAuth User"

# Debug mode
npx playwright test --config=playwright.config.avi-dm-oauth.cjs --debug
```

---

## 📸 Screenshot Gallery

All screenshots are saved to: `docs/validation/screenshots/`

### Screenshot Naming Convention

```
avi-oauth-01-home-page.png
avi-oauth-02-dm-interface-loaded.png
avi-oauth-03-auth-status-verified.png
avi-oauth-04-message-composed.png
avi-oauth-05-message-sent.png
avi-oauth-06-response-received.png
avi-oauth-07-test-complete.png

avi-apikey-01-settings-page.png
avi-apikey-02-auth-method-selected.png
...

avi-payg-01-settings-page.png
...

oauth-refresh-01-initial-settings.png
...

error-oauth-01-initial-state.png
...

responsive-01-desktop-1920x1080.png
responsive-02-desktop-dm-interface.png
responsive-03-tablet-768x1024.png
responsive-04-tablet-dm-interface.png
responsive-05-mobile-375x667.png
responsive-06-mobile-dm-interface.png

auth-switch-01-settings-initial.png
...

e2e-01-home-page.png
e2e-02-settings-page.png
e2e-03-oauth-selected.png
e2e-04-settings-saved.png
e2e-05-dm-interface.png
e2e-06-message-composed.png
e2e-07-message-sent.png
e2e-08-response-received.png
e2e-09-response-validated.png
e2e-10-test-complete.png
```

---

## 🧪 Test Specifications

### Test 01: OAuth User - Avi DM Success Flow

**Purpose**: Validate OAuth CLI authentication works end-to-end for Avi DM

**Steps**:
1. Navigate to home page
2. Click Avi DM link
3. Verify OAuth status indicator
4. Compose test message
5. Send message
6. Wait for Avi response (max 30s)
7. Verify response content exists
8. Verify no error messages

**Expected Result**: ✅ Message sent successfully, response received, no errors

**Screenshots**: 7 total

---

### Test 02: API Key User - Avi DM Success Flow

**Purpose**: Validate User API Key authentication works for Avi DM

**Steps**:
1. Navigate to settings
2. Select "User API Key" auth method
3. Enter test API key: `sk-ant-api03-test-key-for-validation-20250111`
4. Save settings
5. Navigate to Avi DM
6. Compose and send message
7. Wait for response
8. Verify success

**Expected Result**: ✅ API Key auth successful, response received

**Screenshots**: 7 total

---

### Test 03: Platform PAYG User - Avi DM Flow

**Purpose**: Validate Platform PAYG authentication and billing tracking

**Steps**:
1. Navigate to settings
2. Select "Platform PAYG" auth method
3. Save settings
4. Navigate to Avi DM
5. Send message
6. Verify response received
7. Verify billing tracked (if applicable)

**Expected Result**: ✅ PAYG auth successful, billing tracked

**Screenshots**: 6 total

---

### Test 04: OAuth Token Refresh Flow

**Purpose**: Validate OAuth token refresh happens transparently

**Steps**:
1. Verify OAuth is active
2. Navigate to Avi DM
3. Send message (triggers token validation)
4. Wait for response (token refresh should happen automatically)
5. Verify message succeeds

**Expected Result**: ✅ Token refresh successful, message delivered

**Screenshots**: 5 total

---

### Test 05: Error Handling - Invalid OAuth Token

**Purpose**: Validate graceful error handling for invalid OAuth tokens

**Steps**:
1. Navigate to Avi DM
2. Check for error messaging UI
3. Verify error handling elements exist

**Expected Result**: ✅ Error handling UI in place

**Screenshots**: 2 total

---

### Test 06-08: Responsive UI Tests

**Purpose**: Validate UI works across different screen sizes

**Viewports**:
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667

**Steps** (for each viewport):
1. Set viewport size
2. Load home page
3. Navigate to Avi DM
4. Capture screenshots

**Expected Result**: ✅ UI renders correctly at all breakpoints

**Screenshots**: 6 total (2 per viewport)

---

### Test 09: Auth Method Switching Flow

**Purpose**: Validate users can switch between auth methods seamlessly

**Steps**:
1. Navigate to settings
2. Capture initial state
3. Select OAuth CLI → screenshot
4. Select User API Key → screenshot
5. Select Platform PAYG → screenshot

**Expected Result**: ✅ All auth methods selectable, UI updates correctly

**Screenshots**: 4 total

---

### Test 10: Complete End-to-End OAuth Flow

**Purpose**: Document the complete user journey from start to finish

**Steps**:
1. Home page → screenshot
2. Settings page → screenshot
3. Select OAuth → screenshot
4. Save settings → screenshot
5. Navigate to DM → screenshot
6. Compose message → screenshot
7. Send message → screenshot
8. Response received → screenshot
9. Response validated → screenshot
10. Test complete → screenshot

**Expected Result**: ✅ Complete flow works without errors

**Screenshots**: 10 total

---

## 📊 Test Reports

### Generated Reports

After test execution, the following reports are generated:

1. **HTML Report**: `tests/playwright/html-report/index.html`
   - Interactive report with screenshots
   - Test execution timeline
   - Failure details with traces

2. **JSON Report**: `tests/playwright/test-results.json`
   - Machine-readable test results
   - Detailed timing information
   - Screenshot paths

3. **JUnit XML**: `tests/playwright/junit-results.xml`
   - CI/CD integration format
   - Test suite summary
   - Pass/fail status

4. **Summary Text**: `tests/playwright/avi-oauth-validation-summary.txt`
   - Quick overview of results
   - Screenshot count
   - Test coverage summary

### Viewing Reports

```bash
# Open HTML report in browser
open tests/playwright/html-report/index.html

# View summary
cat tests/playwright/avi-oauth-validation-summary.txt

# List all screenshots
ls -lh docs/validation/screenshots/
```

---

## 🔍 Test Selectors

### Data Test IDs Used

```typescript
// Navigation
'a[href*="/avi"]'          // Avi DM link
'a[href*="/settings"]'     // Settings link

// Auth Status
'[data-testid="auth-status"]'
'.auth-indicator'
'.oauth-status'

// DM Interface
'[data-testid="dm-message-input"]'
'textarea[placeholder*="message"]'
'[data-testid="send-dm-button"]'
'button:has-text("Send")'

// Response
'[data-testid="avi-response"]'
'.avi-message'
'.dm-response'

// Error Handling
'[data-testid="error-message"]'
'.error'
'.error-banner'

// Settings
'[data-testid="auth-method-oauth-cli"]'
'[data-testid="auth-method-user-api-key"]'
'[data-testid="auth-method-platform-payg"]'
'[data-testid="api-key-input"]'
'[data-testid="save-auth-button"]'
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue 1: Tests fail with "Navigation timeout"**
```bash
# Solution: Ensure servers are running
npm run dev:frontend
npm run dev:api

# Check servers
curl http://localhost:5173
curl http://localhost:3001/health
```

**Issue 2: No screenshots captured**
```bash
# Solution: Check screenshot directory permissions
mkdir -p docs/validation/screenshots
chmod 755 docs/validation/screenshots

# Verify Playwright can write
ls -la docs/validation/screenshots/
```

**Issue 3: "Selector not found" errors**
```bash
# Solution: Update selectors in test file
# The test uses multiple fallback selectors
# If UI changes, update selector arrays in test file
```

**Issue 4: Response timeout (30s)**
```bash
# Solution: Increase timeout or check Avi service
# Edit RESPONSE_TIMEOUT in test file:
const RESPONSE_TIMEOUT = 60000; // Increase to 60s
```

**Issue 5: Authentication errors**
```bash
# Solution: Verify OAuth token in database
sqlite3 database.db "SELECT * FROM claude_auth WHERE auth_method='oauth-cli';"

# Reset auth if needed
sqlite3 database.db "DELETE FROM claude_auth;"
```

---

## 📈 Success Criteria

**Test Suite Passes If**:
- ✅ All 10 tests pass
- ✅ 45+ screenshots captured
- ✅ No error messages during OAuth flow
- ✅ Avi response received within 30s
- ✅ UI renders correctly on all viewports
- ✅ Auth method switching works
- ✅ Token refresh happens transparently

**Test Suite Fails If**:
- ❌ Any test throws unhandled exception
- ❌ OAuth flow returns 500 error
- ❌ No response from Avi after 30s
- ❌ Less than 15 screenshots captured
- ❌ UI broken on any viewport
- ❌ Auth method switching broken

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Avi OAuth Validation

on:
  push:
    branches: [main, v1]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Start servers
        run: |
          npm run dev:frontend &
          npm run dev:api &
          sleep 10

      - name: Run Playwright tests
        run: ./tests/playwright/run-avi-oauth-validation.sh

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: docs/validation/screenshots/

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: tests/playwright/
```

---

## 📚 Additional Resources

### Playwright Documentation
- [Playwright Docs](https://playwright.dev)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Screenshots API](https://playwright.dev/docs/screenshots)

### Project Documentation
- [OAuth Integration Summary](./AVI-OAUTH-DELIVERY-SUMMARY.md)
- [OAuth Quick Reference](./AVI-OAUTH-QUICK-REFERENCE.md)
- [Manual Testing Guide](./MANUAL-BROWSER-TEST-GUIDE.md)

### Test Strategy
- [TDD Test Delivery](../TDD-OAUTH-PRODUCTION-TESTS-DELIVERY.md)
- [Regression Testing](./REGRESSION-TESTING-COMPLETE.md)

---

## 🎯 Next Steps

After running this test suite:

1. **Review Screenshots**
   - Open `docs/validation/screenshots/`
   - Verify all screenshots show expected UI state
   - Check for any visual regressions

2. **Analyze Test Results**
   - Open HTML report
   - Review any failed tests
   - Check test execution timeline

3. **Manual Verification**
   - Follow manual testing guide
   - Verify OAuth flow in real browser
   - Test edge cases not covered by automation

4. **Production Deployment**
   - If all tests pass, proceed to production
   - Monitor OAuth flow in production
   - Set up alerts for OAuth failures

---

## ✅ Deliverables Checklist

- [x] Playwright test file created: `tests/playwright/avi-dm-oauth-ui-validation.spec.ts`
- [x] 10 comprehensive test scenarios implemented
- [x] Playwright configuration: `playwright.config.avi-dm-oauth.cjs`
- [x] Automated test runner script: `tests/playwright/run-avi-oauth-validation.sh`
- [x] Documentation guide created
- [ ] Tests executed successfully
- [ ] 45+ screenshots captured
- [ ] Test reports generated
- [ ] Visual validation complete

---

**End of Guide**

For questions or issues, refer to the troubleshooting section or contact the development team.
