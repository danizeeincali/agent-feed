# OAuth Standalone UI Validation - Quick Reference

## 🚀 Quick Start

```bash
# Make script executable (first time only)
chmod +x tests/playwright/run-oauth-standalone-validation.sh

# Run tests with browser visible (recommended)
./tests/playwright/run-oauth-standalone-validation.sh

# Run headless
./tests/playwright/run-oauth-standalone-validation.sh headless

# Run with debugger
./tests/playwright/run-oauth-standalone-validation.sh debug
```

## 📋 Test Scenarios

| # | Scenario | Purpose | Expected |
|---|----------|---------|----------|
| 1 | OAuth Settings Page | Verify OAuth status display | ✅ Pass |
| 2 | DM Interface Navigation | Test navigation and UI load | ✅ Pass |
| 3 | Message Composition | Test input functionality | ✅ Pass |
| 4 | OAuth Message Send | **Detect 500 error** | ⚠️ May fail |
| 5 | API Key Message Send | Control test | ✅ Pass |
| 6 | PAYG Message Send | Control test | ✅ Pass |

## 🎯 What This Tests

### OAuth User Flow
- ✅ Settings page displays OAuth status
- ✅ DM interface loads correctly
- ✅ Message input works
- ⚠️ **Message send may trigger 500 error**
- ✅ UI handles errors gracefully

### Comparison with Other Auth Types
- ✅ API Key users work normally
- ✅ PAYG users work normally
- ⚠️ OAuth users hit caching issue

## 📸 Screenshots

All screenshots saved to: `docs/validation/screenshots/oauth-standalone-*/`

Format: `{scenario}-step-{number}-{timestamp}.png`

### Scenarios:
- `oauth-standalone-01-settings/` - Settings page
- `oauth-standalone-02-dm-interface/` - DM navigation
- `oauth-standalone-03-compose/` - Message composition
- `oauth-standalone-04-send/` - OAuth send (may fail)
- `oauth-standalone-05-apikey-flow/` - API Key send (control)
- `oauth-standalone-06-payg-flow/` - PAYG send (control)

## 📝 Network Logs

Network logs saved to: `{scenario}/network-logs.json`

Example: `oauth-standalone-04-send/network-logs.json`

### View logs:
```bash
# Pretty print
cat docs/validation/screenshots/oauth-standalone-04-send/network-logs.json | jq

# Check for errors
grep '"status": 500' docs/validation/screenshots/oauth-standalone-04-send/network-logs.json
```

## 🔍 What to Look For

### In Screenshots:
1. **OAuth Status Display**: Look for "OAuth" or "Connected" badges
2. **Error Messages**: UI errors after send button click
3. **UI State Changes**: Button states, loading indicators
4. **Visual Differences**: Compare OAuth vs API Key vs PAYG

### In Network Logs:
1. **Request Headers**: Check `Authorization: Bearer {token}`
2. **Request Body**: Verify `userId` and `message`
3. **Response Status**: Look for 500 errors
4. **Response Body**: Check error messages

### Expected 500 Error Pattern:
```json
{
  "status": 500,
  "url": "http://localhost:3001/api/avi/dm/chat",
  "responseBody": {
    "error": "Authentication failed",
    "details": "Invalid or expired credentials",
    "authType": "api-key"  // ❌ Should be "oauth"
  }
}
```

## 📊 Results Analysis

### Success Criteria:
- ✅ All screenshots captured (30+)
- ✅ Network logs saved for each scenario
- ✅ OAuth status displays correctly in UI
- ✅ API Key and PAYG users work normally

### Failure Indicators:
- ❌ 500 error in OAuth message send
- ❌ Auth type mismatch in logs
- ❌ Error message shown to user
- ❌ Message not sent successfully

## 🎬 Manual Verification

If tests pass but you want to verify manually:

1. **Open browser dev tools**
2. **Navigate to** http://localhost:5173
3. **Open localStorage**: Check `claude_auth_session`
4. **Set OAuth user**:
```javascript
localStorage.setItem('claude_auth_session', JSON.stringify({
  user_id: 'oauth-test-user-001',
  auth_type: 'oauth',
  access_token: 'test-token',
  email: 'test@oauth.com'
}));
location.reload();
```
5. **Navigate to DM**: Try sending a message
6. **Check Network tab**: Look for 500 error on `/api/avi/dm/chat`

## 🐛 Known Issues

### Issue: Worker Queue Auth Caching
**Symptom**: OAuth users get 500 error when sending messages

**Cause**: Worker queue caches authentication context from previous API key requests

**Evidence**:
- OAuth token in request headers
- API key used in backend processing
- Other auth types work fine

**Workaround**: Clear worker queue between auth type switches

**Fix Needed**: See `docs/PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md` recommendations

## 📂 File Locations

```
tests/playwright/
├── oauth-standalone-ui-validation.spec.ts   # Test suite
└── run-oauth-standalone-validation.sh       # Test runner

docs/
├── PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md  # Full report
└── validation/
    ├── OAUTH-STANDALONE-SCREENSHOT-GALLERY.md # Screenshot gallery
    └── screenshots/
        ├── oauth-standalone-01-settings/
        ├── oauth-standalone-02-dm-interface/
        ├── oauth-standalone-03-compose/
        ├── oauth-standalone-04-send/
        ├── oauth-standalone-05-apikey-flow/
        └── oauth-standalone-06-payg-flow/
```

## 🔧 Troubleshooting

### Tests Won't Run
```bash
# Check prerequisites
curl http://localhost:3001/health  # Backend
curl http://localhost:5173         # Frontend

# Install Playwright
npx playwright install

# Install dependencies
npm install
```

### No Screenshots Generated
```bash
# Check permissions
ls -la docs/validation/screenshots/

# Create directories manually
mkdir -p docs/validation/screenshots/oauth-standalone-{01..06}-*/
```

### Network Logs Empty
```bash
# Check if API requests are being made
# Tests may need more wait time
# Edit spec file and increase waitForTimeout values
```

## 📞 Next Steps

After running tests:

1. **Review Screenshots**: Check visual evidence
2. **Analyze Network Logs**: Look for auth mismatches
3. **Document Findings**: Update main report
4. **Fix Issues**: Implement worker queue fix
5. **Re-test**: Verify fix resolves 500 errors

## 📖 Related Documentation

- [Main Validation Report](../PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md)
- [Screenshot Gallery](./OAUTH-STANDALONE-SCREENSHOT-GALLERY.md)
- [OAuth Implementation Guide](../oauth-implementation-analysis.md)
- [TDD Test Suite Summary](../tdd-test-suite-summary.md)

---

**Last Updated**: 2025-11-11
**Test Suite Version**: 1.0.0
**Playwright Version**: ^1.40.0
