# Authentication DM/Post Flow - Playwright Validation Tests

## Overview

This test suite validates that DMs and posts work correctly with OAuth and API key authentication, with visual proof via screenshots.

## Test Scenarios

### Scenario 1: OAuth User Sends DM ✅
- **Purpose**: Validate that a user authenticated via OAuth (max subscription) can send a DM to Avi
- **Expected**: NO 500 errors, DM sent successfully, Avi responds
- **Screenshots**:
  - `auth-fix-01-oauth-user-dm-compose.png` - Composing DM
  - `auth-fix-02-oauth-user-dm-sent.png` - DM sent successfully
  - `auth-fix-03-oauth-user-dm-response.png` - Avi response received

### Scenario 2: API Key User Creates Post ✅
- **Purpose**: Validate that a user with API key can create posts
- **Expected**: NO 500 errors, post created successfully
- **Screenshots**:
  - `auth-fix-04-apikey-user-post-compose.png` - Composing post
  - `auth-fix-05-apikey-user-post-created.png` - Post created
  - `auth-fix-06-apikey-user-post-processed.png` - Post processed

### Scenario 3: Unauthenticated User ✅
- **Purpose**: Validate error handling for users without authentication
- **Expected**: Friendly error message (NOT 500), redirect to Settings or auth prompt
- **Screenshots**:
  - `auth-fix-07-unauth-user-error.png` - Friendly error shown

### Scenario 4: Real OAuth Detection (No Mocks) ✅
- **Purpose**: Validate REAL OAuth detection from Settings page
- **Expected**: Auth status shown correctly without mocking
- **Screenshots**:
  - `auth-fix-08-real-oauth-status.png` - Real detection result

### Bonus: Network Request Validation ✅
- **Purpose**: Verify auth headers in API requests
- **Expected**: Correct headers sent with DM/Post requests

## Prerequisites

### 1. Environment Setup
```bash
# Frontend must be running
npm run dev --workspace=frontend
# Should be accessible at http://localhost:5173

# API server must be running
npm start
# Should be accessible at http://localhost:3001
```

### 2. Database Setup
- SQLite database should be initialized with user tables
- User settings table should include `claude_auth_method` column

### 3. Screenshot Directory
```bash
# Create screenshots directory
mkdir -p docs/validation/screenshots
```

## Running the Tests

### Run All Tests
```bash
# Run complete test suite
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js
```

### Run Individual Scenario
```bash
# Scenario 1: OAuth user DM
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js -g "Scenario 1"

# Scenario 2: API key user post
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js -g "Scenario 2"

# Scenario 3: Unauthenticated user
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js -g "Scenario 3"

# Scenario 4: Real OAuth detection
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js -g "Scenario 4"
```

### Run with UI (Headed Mode)
```bash
# See browser actions in real-time
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js --headed
```

### Debug Mode
```bash
# Step through tests with Playwright Inspector
npx playwright test tests/playwright/ui-validation/auth-dm-post-flow.spec.js --debug
```

## Test Execution Report

After running tests, check:

1. **Screenshots**: `/workspaces/agent-feed/docs/validation/screenshots/`
   - 8 screenshots proving visual validation
   - All scenarios documented with screenshots

2. **Console Output**:
   - Detailed step-by-step logs
   - API request/response logging
   - Error detection results

3. **Playwright HTML Report**:
   ```bash
   npx playwright show-report
   ```

## Expected Results

### ✅ Success Criteria

1. **No 500 Errors**: All scenarios should complete without 500 server errors
2. **Visual Proof**: All 8 screenshots captured successfully
3. **Functional Validation**:
   - OAuth user can send DMs
   - API key user can create posts
   - Unauthenticated user gets friendly error
   - Real OAuth detection works without mocks

### 🔍 Verification Points

- **Network Tab**: Verify requests have correct auth headers
- **Console**: Check for 500 errors (should be NONE)
- **DOM**: Verify success messages appear
- **Database**: Verify tickets created with correct userId

## API Mocking Strategy

### Scenarios 1-3 (Mocked)
- Mock `/api/claude-code/auth-settings` with different auth configs:
  - OAuth: `{ method: 'oauth', hasApiKey: false }`
  - API Key: `{ method: 'user_api_key', hasApiKey: true }`
  - None: `{ method: 'platform_payg', hasApiKey: false }`
- Mock Claude API responses for success scenarios

### Scenario 4 (Real - NO Mocks)
- NO mocking enabled
- Uses REAL `/api/claude-code/auth-settings` endpoint
- Validates actual OAuth detection logic

## Troubleshooting

### Tests Fail: Element Not Found
- Check that frontend is running on correct port
- Verify UI component selectors match actual DOM
- Try running in headed mode to see browser

### Screenshots Not Saving
- Ensure directory exists: `mkdir -p docs/validation/screenshots`
- Check file permissions
- Verify path in test: `SCREENSHOT_DIR`

### 500 Errors Detected
- Check API server logs
- Verify database schema includes auth columns
- Check ClaudeAuthManager implementation

### Real OAuth Detection Fails
- Ensure no API route mocking in Scenario 4
- Check backend `/api/claude-code/auth-settings` endpoint
- Verify OAuthTokenExtractor service is working

## Architecture

### Test File Structure
```
tests/playwright/ui-validation/
├── auth-dm-post-flow.spec.js   # Main test suite
├── README.md                    # This file
└── results/                     # Test results (auto-generated)
```

### Helper Functions
- `captureScreenshot()` - Save screenshot with description
- `mockAuthSettings()` - Mock auth endpoint with different configs
- `mockClaudeApiSuccess()` - Mock Claude API responses
- `waitForElement()` - Wait for element with error handling
- `setupErrorMonitoring()` - Detect 500 errors

## Related Documentation

- `/workspaces/agent-feed/docs/OAUTH-FIX-COMPLETE.md` - OAuth implementation summary
- `/workspaces/agent-feed/docs/CLAUDE-AUTH-MANAGER-IMPLEMENTATION.md` - Auth manager details
- `/workspaces/agent-feed/api-server/routes/auth/claude-auth.js` - Auth endpoints

## Success Metrics

- ✅ All 4 scenarios pass
- ✅ 8 screenshots captured
- ✅ Zero 500 errors detected
- ✅ Real OAuth detection works
- ✅ Network requests include correct auth headers

## Deliverables

1. `/workspaces/agent-feed/tests/playwright/ui-validation/auth-dm-post-flow.spec.js` ✅
2. 8 screenshots in `/workspaces/agent-feed/docs/validation/screenshots/` (generated on test run)
3. Test execution report (generated on test run)

---

**Last Updated**: 2025-11-10
**Test Coverage**: OAuth + API Key authentication for DMs and Posts
**Visual Validation**: 8 screenshots proving all scenarios
