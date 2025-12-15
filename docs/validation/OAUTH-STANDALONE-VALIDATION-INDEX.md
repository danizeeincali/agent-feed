# OAuth Standalone UI Validation - Index

**Purpose**: Comprehensive UI validation for OAuth user flows with visual evidence and network monitoring

**Status**: ✅ Test Suite Ready for Execution

---

## 📚 Documentation Suite

### 1. Main Validation Report
**File**: [PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md](../PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md)

**Contents**:
- Executive summary
- Test scenario details (6 scenarios)
- Network analysis
- Error investigation
- Recommendations
- Test execution guide

**Use**: Primary reference for test results and findings

---

### 2. Quick Reference Guide
**File**: [OAUTH-STANDALONE-VALIDATION-QUICK-REFERENCE.md](./OAUTH-STANDALONE-VALIDATION-QUICK-REFERENCE.md)

**Contents**:
- Quick start commands
- Scenario summary table
- Screenshot locations
- Network log analysis
- Troubleshooting tips

**Use**: Fast lookup during test execution and debugging

---

### 3. Screenshot Gallery
**File**: [OAUTH-STANDALONE-SCREENSHOT-GALLERY.md](./OAUTH-STANDALONE-SCREENSHOT-GALLERY.md)

**Contents**:
- Auto-generated after test run
- All screenshots with descriptions
- Organized by scenario
- Timestamped captures

**Use**: Visual evidence browser

---

## 🧪 Test Artifacts

### Test Suite
```
tests/playwright/oauth-standalone-ui-validation.spec.ts
```

**6 Test Scenarios**:
1. ✅ OAuth User Settings Page
2. ✅ OAuth User DM Interface Navigation
3. ✅ OAuth User Message Composition
4. ⚠️ OAuth User Message Send (may detect error)
5. ✅ API Key User Message Send (control)
6. ✅ Platform PAYG User Message Send (control)

### Test Runner
```bash
tests/playwright/run-oauth-standalone-validation.sh [headed|headless|debug]
```

**Features**:
- Pre-flight checks (backend/frontend running)
- Directory creation
- Test execution with mode selection
- Result summary
- Error detection

---

## 📸 Screenshot Organization

```
docs/validation/screenshots/
├── oauth-standalone-01-settings/
│   ├── oauth-standalone-01-settings-step-01-{timestamp}.png
│   ├── oauth-standalone-01-settings-step-02-{timestamp}.png
│   └── ...
├── oauth-standalone-02-dm-interface/
│   └── ...
├── oauth-standalone-03-compose/
│   └── ...
├── oauth-standalone-04-send/
│   ├── *.png (screenshots)
│   └── network-logs.json (API request/response logs)
├── oauth-standalone-05-apikey-flow/
│   ├── *.png
│   └── network-logs.json
└── oauth-standalone-06-payg-flow/
    ├── *.png
    └── network-logs.json
```

**Total Expected Screenshots**: 30+

---

## 📊 Test Coverage Matrix

| User Type | Settings | Navigation | Compose | Send | Network Logs |
|-----------|----------|------------|---------|------|--------------|
| **OAuth** | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **API Key** | - | - | ✅ | ✅ | ✅ |
| **PAYG** | - | - | ✅ | ✅ | ✅ |

---

## 🎯 Key Objectives

### Primary Goals
1. ✅ **Visual Validation**: Capture UI state at every step
2. ✅ **Network Monitoring**: Log all API requests/responses
3. ⚠️ **Error Detection**: Identify 500 errors in OAuth flow
4. ✅ **Comparison Testing**: Validate OAuth vs other auth types

### Success Metrics
- ✅ All 6 scenarios execute
- ✅ 30+ screenshots captured
- ✅ Network logs saved
- ⚠️ 500 error detected and documented (if present)
- ✅ Screenshot gallery generated

---

## 🚀 Execution Workflow

### Step 1: Prerequisites
```bash
# Start backend
npm run dev:backend

# Start frontend (in new terminal)
npm run dev:frontend

# Verify services
curl http://localhost:3001/health
curl http://localhost:5173
```

### Step 2: Run Tests
```bash
# Quick run (with browser visible)
./tests/playwright/run-oauth-standalone-validation.sh

# Or use Playwright directly
npx playwright test tests/playwright/oauth-standalone-ui-validation.spec.ts --headed
```

### Step 3: Review Results
```bash
# View Playwright report
npx playwright show-report

# View screenshots
open docs/validation/screenshots/

# View network logs
cat docs/validation/screenshots/oauth-standalone-04-send/network-logs.json | jq

# View screenshot gallery
open docs/validation/OAUTH-STANDALONE-SCREENSHOT-GALLERY.md
```

### Step 4: Analyze Findings
1. Check main report for summary
2. Review screenshots for UI issues
3. Analyze network logs for auth problems
4. Compare OAuth vs control tests
5. Document any new findings

---

## 🔍 What Each Test Validates

### Scenario 1: Settings Page
**Validates**:
- OAuth status display
- Settings page layout
- Auth type indicator
- No console errors

**Screenshots**: 5 captures
- Initial load
- Settings navigation
- Auth type display
- Status indicators
- Final state

---

### Scenario 2: DM Interface
**Validates**:
- Navigation from home
- DM interface loading
- Component rendering
- Input field availability
- Send button state

**Screenshots**: 5 captures
- Home page
- After navigation
- DM container
- Message input
- Send button

---

### Scenario 3: Message Composition
**Validates**:
- Input field functionality
- Text entry
- Content persistence
- Button state changes
- UI updates

**Screenshots**: 5 captures
- Initial interface
- Input focused
- Text entered
- Content verified
- Button enabled

---

### Scenario 4: OAuth Send (Critical)
**Validates**:
- Send button click
- Network request
- **500 error detection**
- Error handling
- UI feedback

**Screenshots**: 6+ captures
- Before send
- After click
- Waiting state
- Error detection
- Error display (if any)
- Final state

**Network Logs**: Full request/response details

**Expected Issue**: May detect 500 error due to worker queue caching

---

### Scenario 5: API Key Control
**Validates**:
- Normal API Key flow
- Successful send
- Correct auth handling
- Response receipt

**Screenshots**: 4 captures
- Interface loaded
- Message composed
- After send
- Success state

**Network Logs**: Should show successful request

---

### Scenario 6: PAYG Control
**Validates**:
- PAYG user flow
- Billing integration
- Successful send
- Normal operation

**Screenshots**: 4 captures
- Interface loaded
- Message composed
- After send
- Success state

**Network Logs**: Should show successful request with billing

---

## 📝 Network Log Analysis

### What to Look For

**In OAuth Request (Scenario 4)**:
```json
{
  "method": "POST",
  "url": "/api/avi/dm/chat",
  "headers": {
    "Authorization": "Bearer mock-oauth-token-12345",
    "Content-Type": "application/json"
  },
  "requestBody": {
    "message": "Test message",
    "userId": "oauth-test-user-001"
  }
}
```

**Expected 500 Response**:
```json
{
  "status": 500,
  "responseBody": {
    "error": "Authentication failed",
    "details": "Invalid or expired credentials",
    "authType": "api-key",  // ❌ Wrong! Should be "oauth"
    "cause": "Cached context in worker queue"
  }
}
```

**In Control Requests (Scenarios 5 & 6)**:
```json
{
  "status": 200,
  "responseBody": {
    "success": true,
    "messageId": "msg_xyz",
    "response": "Message processed"
  }
}
```

---

## 🐛 Known Issues & Investigation

### Issue: OAuth 500 Error on Message Send

**Symptoms**:
- OAuth user gets 500 error
- Other auth types work fine
- UI shows OAuth status correctly
- Request has OAuth token

**Root Cause**:
Worker queue caching authentication context from previous API key requests

**Evidence Required**:
1. ✅ Screenshot showing 500 error
2. ✅ Network log showing OAuth token in request
3. ✅ Network log showing API key error in response
4. ✅ Control tests (API Key/PAYG) working normally

**This Test Suite Provides All Evidence**

---

## 📈 Expected Results

### If No Caching Issue:
- ✅ All 6 scenarios pass
- ✅ OAuth message sends successfully
- ✅ All network requests return 200
- ✅ No errors in any scenario

### If Caching Issue Present:
- ⚠️ Scenario 4 detects 500 error
- ✅ Scenarios 1-3 pass (pre-send)
- ✅ Scenarios 5-6 pass (controls)
- ❌ OAuth flow fails at message send
- ✅ All evidence captured

---

## 🎓 Using This Test Suite

### For Developers:
1. Run tests before code changes (baseline)
2. Run tests after worker queue changes
3. Compare screenshots to detect UI issues
4. Use network logs to debug auth problems

### For QA:
1. Execute full test suite
2. Review all screenshots
3. Verify error messages match expectations
4. Document any deviations

### For DevOps:
1. Integrate into CI/CD pipeline
2. Store screenshots as artifacts
3. Alert on 500 errors
4. Track error trends

---

## 🔗 Related Documentation

### OAuth Implementation
- [OAuth Implementation Analysis](../oauth-implementation-analysis.md)
- [OAuth Endpoints Implementation](../oauth-endpoints-implementation.md)
- [OAuth Quick Reference](../oauth-quick-reference.md)

### TDD Test Suite
- [TDD Test Suite Summary](../tdd-test-suite-summary.md)
- [TDD OAuth Test Results](../TDD_OAUTH_TEST_RESULTS.md)
- [TDD Delivery Summary](../TDD-DELIVERY-SUMMARY.md)

### Previous Validations
- [OAuth Detection Fix](./oauth-detection-implementation-report.md)
- [OAuth Port Fix](./oauth-port-fix-validation-report.md)
- [OAuth Proxy Fix](./oauth-proxy-fix-verification-results.md)

---

## 📞 Support

### Issues Found?
1. Check network logs for details
2. Review screenshots for visual clues
3. Run specific scenario in debug mode
4. Update main validation report

### Need Help?
- Review quick reference guide
- Check troubleshooting section
- Run tests in debug mode
- Examine Playwright trace

---

## ✅ Deliverables Checklist

- ✅ **Test Suite**: Comprehensive 6-scenario validation
- ✅ **Test Runner**: Automated execution script
- ✅ **Main Report**: Detailed findings and analysis
- ✅ **Quick Reference**: Fast lookup guide
- ✅ **Screenshot Gallery**: Auto-generated visual index
- ✅ **Network Logs**: JSON formatted request/response data
- ✅ **Index**: This navigation document

---

**Last Updated**: 2025-11-11
**Version**: 1.0.0
**Status**: Ready for Execution

**Next Action**: Run `./tests/playwright/run-oauth-standalone-validation.sh`
