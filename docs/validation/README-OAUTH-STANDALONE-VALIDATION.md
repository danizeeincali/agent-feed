# OAuth Standalone UI Validation - README

**Quick Start Guide for OAuth User Flow Testing**

---

## 🚀 Quick Start (3 Steps)

```bash
# 1. Start services (2 terminals)
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2

# 2. Run tests (Terminal 3)
./tests/playwright/run-oauth-standalone-validation.sh

# 3. View results
npx playwright show-report
```

---

## 📚 Documentation Navigation

### Start Here
1. **[Index](./OAUTH-STANDALONE-VALIDATION-INDEX.md)** - Complete navigation hub
2. **[Quick Reference](./OAUTH-STANDALONE-VALIDATION-QUICK-REFERENCE.md)** - Commands and tips
3. **[Main Report](../PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md)** - Full validation report

### Reference Documents
- **[Delivery Summary](../OAUTH-STANDALONE-UI-VALIDATION-DELIVERY-SUMMARY.md)** - What was delivered
- **[Verification Checklist](./OAUTH-STANDALONE-VALIDATION-VERIFICATION.md)** - Quality assurance
- **[Screenshot Gallery](./OAUTH-STANDALONE-SCREENSHOT-GALLERY.md)** - Auto-generated after tests

---

## 🎯 What This Tests

### OAuth User Flow
1. ✅ Settings page shows OAuth status
2. ✅ DM interface loads correctly
3. ✅ Message composition works
4. ⚠️ **Message send may fail with 500 error** (testing for cache bug)

### Comparison with Other Auth Types
5. ✅ API Key users work normally
6. ✅ PAYG users work normally

---

## 📸 What You'll Get

After running tests:
- **30+ Screenshots** - Visual evidence at every step
- **3 Network Log Files** - Request/response details
- **Screenshot Gallery** - Auto-generated markdown index
- **HTML Report** - Playwright test results

---

## 🔍 Key Files

### Test Suite
```
tests/playwright/oauth-standalone-ui-validation.spec.ts
```
Main test file with 6 scenarios

### Test Runner
```
tests/playwright/run-oauth-standalone-validation.sh
```
Automated test execution script

### Results
```
docs/validation/screenshots/oauth-standalone-*/
```
Screenshots organized by scenario

---

## 🎬 Execution Options

### Standard (Browser Visible)
```bash
./tests/playwright/run-oauth-standalone-validation.sh
```

### Headless Mode
```bash
./tests/playwright/run-oauth-standalone-validation.sh headless
```

### Debug Mode
```bash
./tests/playwright/run-oauth-standalone-validation.sh debug
```

### Direct Playwright
```bash
npx playwright test tests/playwright/oauth-standalone-ui-validation.spec.ts --headed
```

---

## 🐛 What We're Testing For

### Expected Issue: OAuth 500 Error

**Symptom**: OAuth user gets 500 error when sending DM message

**Evidence**:
- Screenshot shows error in UI
- Network log shows auth mismatch
- Control tests (API Key, PAYG) pass

**Root Cause**: Worker queue caching previous API key authentication

---

## 📊 Test Results

### Success Indicators
- ✅ All 6 scenarios execute
- ✅ 30+ screenshots captured
- ✅ Network logs saved
- ⚠️ OAuth 500 error detected (if bug exists)
- ✅ Control tests pass

### Failure Indicators
- ❌ Tests don't run (check prerequisites)
- ❌ Screenshots not captured (check permissions)
- ❌ Network logs empty (check API calls)

---

## 🔧 Troubleshooting

### Backend Not Running
```bash
# Check backend
curl http://localhost:3001/health

# Start if needed
npm run dev:backend
```

### Frontend Not Running
```bash
# Check frontend
curl http://localhost:5173

# Start if needed
npm run dev:frontend
```

### Tests Won't Execute
```bash
# Install Playwright
npx playwright install

# Check file permissions
chmod +x tests/playwright/run-oauth-standalone-validation.sh
```

### No Screenshots
```bash
# Check directory exists
ls docs/validation/screenshots/

# Create if needed
mkdir -p docs/validation/screenshots/oauth-standalone-{01..06}-*/
```

---

## 📖 Understanding Results

### Scenario Results

| # | Scenario | Expected | Evidence |
|---|----------|----------|----------|
| 1 | Settings Page | ✅ Pass | Screenshots show OAuth status |
| 2 | DM Navigation | ✅ Pass | Screenshots show interface |
| 3 | Compose Message | ✅ Pass | Screenshots show input |
| 4 | OAuth Send | ⚠️ May Fail | Network log shows 500 |
| 5 | API Key Send | ✅ Pass | Network log shows 200 |
| 6 | PAYG Send | ✅ Pass | Network log shows 200 |

### Network Log Analysis

**Look for**:
- Request headers: `Authorization: Bearer {token}`
- Response status: `500` in Scenario 4
- Error body: Auth type mismatch

**Example 500 Error**:
```json
{
  "status": 500,
  "error": "Authentication failed",
  "authType": "api-key"  // ❌ Should be "oauth"
}
```

---

## 📞 Need Help?

1. **Quick commands**: See [Quick Reference](./OAUTH-STANDALONE-VALIDATION-QUICK-REFERENCE.md)
2. **Detailed info**: See [Main Report](../PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md)
3. **Full navigation**: See [Index](./OAUTH-STANDALONE-VALIDATION-INDEX.md)
4. **What was delivered**: See [Delivery Summary](../OAUTH-STANDALONE-UI-VALIDATION-DELIVERY-SUMMARY.md)

---

## ✅ Checklist Before Running

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Playwright installed (`npx playwright install`)
- [ ] Screenshot directories exist
- [ ] Test runner script executable

---

## 🎉 After Running Tests

1. **View Playwright Report**
   ```bash
   npx playwright show-report
   ```

2. **Browse Screenshots**
   ```bash
   open docs/validation/screenshots/
   ```

3. **Check Network Logs**
   ```bash
   cat docs/validation/screenshots/oauth-standalone-04-send/network-logs.json | jq
   ```

4. **View Screenshot Gallery**
   ```bash
   open docs/validation/OAUTH-STANDALONE-SCREENSHOT-GALLERY.md
   ```

5. **Update Main Report**
   - Document findings
   - Add annotations to screenshots
   - Update recommendations

---

## 🏆 Success Criteria

Test run is successful if:
- ✅ All 6 scenarios execute without framework errors
- ✅ 30+ screenshots are captured
- ✅ Network logs are saved
- ✅ Screenshot gallery is generated
- ⚠️ OAuth 500 error is detected (if bug present)

---

**Status**: ✅ Ready for Immediate Execution

**Next Command**: `./tests/playwright/run-oauth-standalone-validation.sh`

---

*Last Updated: 2025-11-11*
*Version: 1.0.0*
