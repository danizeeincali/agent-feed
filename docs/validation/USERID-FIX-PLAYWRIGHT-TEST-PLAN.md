# UserId Fix - Playwright UI Verification Test Plan

## Overview
This document outlines the comprehensive Playwright test suite created to verify that the userId fix resolves the 500 Internal Server Error issues in Avi DM and post creation.

## Test File Location
`/workspaces/agent-feed/tests/playwright/ui-validation/userid-fix-verification.spec.js`

## Test Execution
```bash
# Quick run
npx playwright test tests/playwright/ui-validation/userid-fix-verification.spec.js --project=chromium

# Or use the provided script
./tests/playwright/run-userid-verification.sh
```

## Test Scenarios

### Test 01: Avi DM Message Send Verification
**Purpose**: Verify that sending a message to Avi DM does not produce a 500 error

**Steps**:
1. Navigate to home page (http://localhost:5173)
2. Capture screenshot: `userid-fix-01-home.png`
3. Click Avi DM button (tries multiple selectors)
4. Capture screenshot: `userid-fix-02-avi-dm-page.png`
5. Find message textarea
6. Type test message: "Test userId fix - what is 2+2?"
7. Capture screenshot: `userid-fix-03-message-composed.png`
8. Click send button
9. Capture screenshot: `userid-fix-04-message-sent.png`
10. Wait for response (15s timeout allowed)
11. Capture screenshot: `userid-fix-05-response-received.png` or `userid-fix-05-response-timeout.png`

**Validations**:
- ❌ NO "500 Internal Server Error" in page content
- ❌ NO "API error: 500" in page content
- ❌ NO "I encountered an error" messages
- ❌ NO FOREIGN KEY errors in console logs
- ❌ NO SqliteError in console logs
- ❌ NO 500 status network responses
- ✅ Message sends successfully
- ✅ No database constraint violations

### Test 02: Post Creation Verification
**Purpose**: Verify that creating a post does not produce errors

**Steps**:
1. Navigate to feed page (http://localhost:5173)
2. Capture screenshot: `userid-fix-06-feed-page.png`
3. Find post textarea
4. Type test post: "userId fix test post - [timestamp]"
5. Capture screenshot: `userid-fix-07-post-composed.png`
6. Click post/submit button
7. Capture screenshot: `userid-fix-08-post-created.png`

**Validations**:
- ❌ NO "500 Internal Server Error"
- ❌ NO "FOREIGN KEY" errors
- ❌ NO SqliteError messages
- ❌ NO 500 status network responses
- ✅ Post creates successfully

### Test 03: Backend UserId Flow Verification
**Purpose**: Verify backend properly handles userId without errors

**Steps**:
1. Navigate to settings page (http://localhost:5173/settings)
2. Wait for page load and backend auth checks
3. Capture screenshot: `userid-fix-09-settings.png`

**Validations**:
- ❌ NO SqliteError in page content
- ❌ NO FOREIGN KEY errors
- ❌ NO "no such table" errors
- ❌ NO SQLITE_CONSTRAINT errors
- ❌ NO userId undefined/null console errors
- ❌ NO server errors (500+) in network responses
- ✅ Settings page loads correctly

### Test 04: Comprehensive Error Detection Scan
**Purpose**: Final comprehensive scan for any error patterns

**Steps**:
1. Navigate to home page
2. Wait for full page load (3s)
3. Capture screenshot: `userid-fix-10-final-scan.png`
4. Scan for all error patterns

**Validations**:
- Checks 12+ error patterns in page content:
  - 500 Internal Server Error
  - API error: 500
  - FOREIGN KEY constraint failed
  - SqliteError
  - SQLITE_CONSTRAINT
  - Database error
  - userId is undefined
  - userId is null
  - Cannot read property.*userId
  - Failed to create.*userId
- Console error filtering for critical issues
- Network response validation

## Screenshot Deliverables

### Expected Screenshots (10 total)
1. `userid-fix-01-home.png` - Home page initial load
2. `userid-fix-02-avi-dm-page.png` - Avi DM conversation page
3. `userid-fix-03-message-composed.png` - Message typed in textarea
4. `userid-fix-04-message-sent.png` - After clicking send
5. `userid-fix-05-response-received.png` - Bot response received (or timeout)
6. `userid-fix-06-feed-page.png` - Main feed page
7. `userid-fix-07-post-composed.png` - Post text entered
8. `userid-fix-08-post-created.png` - Post submitted
9. `userid-fix-09-settings.png` - Settings page loaded
10. `userid-fix-10-final-scan.png` - Final comprehensive scan

All screenshots saved to: `docs/validation/screenshots/`

## Error Monitoring

### Console Error Tracking
- Monitors `console.error()` messages
- Filters for critical keywords:
  - FOREIGN KEY
  - SqliteError
  - SQLITE_CONSTRAINT
  - userId undefined/null

### Network Error Tracking
- Monitors all HTTP responses
- Tracks responses with status >= 400
- Special attention to 500+ errors
- Captures URL, status, and status text

## Success Criteria

### All Tests Must Pass
- ✅ All 4 test scenarios complete successfully
- ✅ 10 screenshots captured
- ✅ Zero 500 Internal Server Errors detected
- ✅ Zero FOREIGN KEY constraint errors
- ✅ Zero SqliteError messages
- ✅ Zero userId undefined/null errors
- ✅ Avi DM messages send successfully
- ✅ Posts create successfully
- ✅ Settings page loads without errors

### Regression Prevention
- Tests verify the fix doesn't break existing functionality
- Tests can be run before/after deployments
- Tests provide visual proof via screenshots

## Running the Tests

### Prerequisites
```bash
# Ensure servers are running
npm run dev          # Frontend on port 5173
npm run server       # Backend on port 3001

# Verify servers
curl http://localhost:5173
curl http://localhost:3001/health
```

### Execute Tests
```bash
# Option 1: Direct Playwright command
npx playwright test tests/playwright/ui-validation/userid-fix-verification.spec.js \
  --project=chromium \
  --reporter=list,html

# Option 2: Use provided script
./tests/playwright/run-userid-verification.sh

# View HTML report
npx playwright show-report
```

### Test Output
```
Running 4 tests using 1 worker
✓  userid-fix-verification.spec.js:01 - Verify Avi DM sends without 500 error
✓  userid-fix-verification.spec.js:02 - Verify post creation works without errors
✓  userid-fix-verification.spec.js:03 - Verify backend logs show correct userId flow
✓  userid-fix-verification.spec.js:04 - Comprehensive error detection scan

4 passed (45s)

To view the HTML report, run: npx playwright show-report
```

## Debugging Failed Tests

### If Tests Fail
1. Check screenshot files in `docs/validation/screenshots/`
2. Review console output for specific error messages
3. Check HTML report: `npx playwright show-report`
4. Verify backend server logs
5. Check database state

### Common Issues
- **Server not running**: Start dev and API servers
- **Port conflicts**: Ensure 5173 and 3001 are available
- **Timeout errors**: May be acceptable if no 500 error occurred
- **Element not found**: UI may have changed, update selectors

## Integration with CI/CD

### Recommended Workflow
```yaml
- name: Run UserId Fix Tests
  run: |
    npm run dev &
    npm run server &
    sleep 5
    npx playwright test tests/playwright/ui-validation/userid-fix-verification.spec.js
```

## Maintenance

### Updating Tests
- Keep selectors up-to-date with UI changes
- Add new error patterns as discovered
- Update screenshots if UI design changes
- Expand test coverage as needed

### Test Review Schedule
- Run before each deployment
- Run after backend changes
- Run after frontend changes
- Include in PR checks

## Documentation References
- [Playwright Documentation](https://playwright.dev/)
- [Original Bug Report](docs/AGENT1-USERID-AUTH-FIX-COMPLETE.md)
- [TDD Test Deliverables](docs/AGENT2-TDD-TESTS-DELIVERY.md)

## Support
For issues with these tests, refer to:
1. Test output console logs
2. Screenshot evidence
3. Playwright HTML report
4. Backend server logs
5. Browser developer console

---

**Created**: 2025-11-10
**Test File**: `tests/playwright/ui-validation/userid-fix-verification.spec.js`
**Agent**: QA Testing Specialist
**Purpose**: Verify zero 500 errors after userId fix implementation
