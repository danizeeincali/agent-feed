# Manual Browser Testing Guide - OAuth Flow

**Purpose:** Verify OAuth flow works correctly in real browser
**Time Required:** 5 minutes
**Prerequisites:** Development servers running

---

## Quick Start

```bash
# 1. Ensure servers are running
npm run dev

# 2. Open browser to:
http://localhost:5173/settings

# 3. Follow test steps below
```

---

## Test Steps

### Step 1: Navigate to Settings
**URL:** http://localhost:5173/settings

**Expected:**
- ✅ Settings page loads
- ✅ "Claude Code Authentication" card visible
- ✅ Three authentication options displayed

**Screenshot Checklist:**
- [ ] Page title shows "Settings"
- [ ] Navigation menu visible
- [ ] Authentication options displayed

---

### Step 2: Select OAuth Option
**Action:** Click on "Option A: OAuth (Recommended)"

**Expected:**
- ✅ OAuth radio button selected
- ✅ Blue border appears around OAuth option
- ✅ "Connect with OAuth" button appears

**Visual Indicators:**
- Border color changes to blue (`border-blue-500`)
- Background changes to light blue (`bg-blue-50`)
- Button is enabled (not grayed out)

---

### Step 3: Click "Connect with OAuth"
**Action:** Click the "Connect with OAuth" button

**Expected:**
- ✅ Button shows "Connecting..." with spinner
- ✅ Browser redirects automatically
- ✅ URL changes to `/oauth-consent`

**CRITICAL CHECK:**
- ❌ **NO** 500 error page
- ❌ **NO** blank white screen
- ❌ **NO** error messages

---

### Step 4: Verify Consent Page Loads
**URL Should Be:**
```
http://localhost:5173/oauth-consent?
  client_id=agent-feed-platform&
  redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fapi%2Fclaude-code%2Foauth%2Fcallback&
  response_type=code&
  scope=inference&
  state=demo-user-123
```

**Expected Page Content:**
- ✅ Page title: "OAuth Authorization" or similar
- ✅ Description text about granting access
- ✅ API key input field visible
- ✅ "Authorize" or "Submit" button visible
- ✅ "Cancel" or "Deny" button visible

**Screenshot Checklist:**
- [ ] Consent page header visible
- [ ] Input field for API key
- [ ] Authorization buttons present
- [ ] No error messages

---

### Step 5: Test API Key Input
**Action:** Enter test API key: `sk-ant-api03-test123`

**Expected:**
- ✅ Input field accepts text
- ✅ Characters appear (may be masked)
- ✅ "Authorize" button remains enabled

**Validation:**
- Input should accept `sk-` prefix
- Field should validate format

---

### Step 6: Test Form Submission (Optional)
**Action:** Click "Authorize" button

**Expected:**
- ✅ Button shows loading state
- ✅ Form submits to backend
- ⚠️ May show error if test key is invalid (this is expected)

**Possible Outcomes:**
- ✅ **Success:** Redirects to callback URL
- ⚠️ **Invalid Key:** Shows error message (expected behavior)
- ❌ **500 Error:** FAIL (should not happen)

---

## Success Criteria

### ✅ PASS Criteria
- [ ] Settings page loads without errors
- [ ] OAuth option can be selected
- [ ] "Connect with OAuth" button works
- [ ] Redirect to consent page succeeds
- [ ] Consent page renders correctly
- [ ] Form fields are functional
- [ ] No 500 errors encountered

### ❌ FAIL Criteria
- [ ] 500 Internal Server Error appears
- [ ] Blank page after clicking OAuth button
- [ ] Consent page doesn't load
- [ ] JavaScript errors in console
- [ ] Redirect loop occurs

---

## Browser Console Checks

### Open Developer Tools
**Chrome/Edge:** `F12` or `Ctrl+Shift+I`
**Firefox:** `F12` or `Ctrl+Shift+K`
**Safari:** `Cmd+Option+I`

### Check for Errors
```javascript
// Console should NOT show:
❌ Uncaught TypeError
❌ Failed to fetch
❌500 Internal Server Error
❌ React error boundary

// Console MAY show (these are OK):
✅ [Vite] connected
✅ React DevTools
✅ API request logs
```

---

## Network Tab Verification

### Filter Network Requests
**Filter:** XHR or Fetch

### Expected Requests:

**1. OAuth Authorization Request**
```
GET /api/claude-code/oauth/authorize
Status: 302 Found
```

**2. Consent Page Load**
```
GET /oauth-consent?client_id=...
Status: 200 OK
```

**3. Auth Settings Load (initial)**
```
GET /api/claude-code/auth-settings?userId=demo-user-123
Status: 200 OK
```

---

## Troubleshooting

### Issue: 500 Error on OAuth Button Click

**Cause:** Backend OAuth endpoint not responding

**Fix:**
```bash
# Check backend server is running
ps aux | grep "node.*server"

# Restart backend
cd api-server && npm run dev
```

### Issue: Blank Page After Redirect

**Cause:** Frontend routing not configured

**Fix:**
```bash
# Verify React Router is set up
grep -r "oauth-consent" frontend/src/App.tsx

# Should show route configuration
```

### Issue: Console Shows React Errors

**Cause:** Component failed to render

**Fix:**
```bash
# Check OAuthConsent component exists
ls frontend/src/pages/OAuthConsent.tsx

# Verify imports in App.tsx
grep "OAuthConsent" frontend/src/App.tsx
```

---

## Test Report Template

```markdown
## Manual Browser Test Results

**Date:** [YYYY-MM-DD]
**Tester:** [Your Name]
**Browser:** [Chrome/Firefox/Safari] v[X.X]
**Environment:** Development (localhost:5173)

### Test Results

- [ ] Step 1: Settings page loaded ✅/❌
- [ ] Step 2: OAuth option selectable ✅/❌
- [ ] Step 3: OAuth button functional ✅/❌
- [ ] Step 4: Consent page loaded ✅/❌
- [ ] Step 5: API key input works ✅/❌
- [ ] Step 6: Form submission works ✅/❌

### Issues Found

[List any issues encountered]

### Screenshots

[Attach relevant screenshots]

### Conclusion

**Overall Status:** PASS / FAIL
**Notes:** [Additional observations]
```

---

## Browser Compatibility Testing

### Recommended Browsers

| Browser | Version | Priority | Status |
|---------|---------|----------|--------|
| Chrome | Latest | High | [ ] Tested |
| Firefox | Latest | High | [ ] Tested |
| Edge | Latest | Medium | [ ] Tested |
| Safari | Latest | Medium | [ ] Tested |

### Mobile Testing (Optional)

- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)
- [ ] Responsive design (DevTools)

---

## Automated vs Manual Testing

### Why Manual Testing is Important

1. **Visual Verification:** See actual UI rendering
2. **User Experience:** Test real interaction flow
3. **Browser Behavior:** Verify redirects work in real browser
4. **Console Errors:** Catch runtime JavaScript errors
5. **Network Timing:** See actual request/response timing

### Automated Testing Limitations

- ❌ Cannot verify visual appearance
- ❌ Headless browsers behave differently
- ❌ May miss timing-related issues
- ❌ Cannot test real user interactions
- ⚠️ May produce false positives (like the 500 error detection)

---

## Next Steps After Testing

### If Tests Pass ✅
1. Document results
2. Create production deployment checklist
3. Update automated tests to match real behavior
4. Consider adding E2E tests with real browser

### If Tests Fail ❌
1. Document failure mode
2. Check backend logs
3. Review network requests
4. Debug with browser DevTools
5. Fix issues and retest

---

**Happy Testing! 🧪**
