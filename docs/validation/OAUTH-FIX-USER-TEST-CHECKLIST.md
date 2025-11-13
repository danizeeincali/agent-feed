# OAuth Detection Fix - User Test Checklist

**Quick Reference for Manual Browser Testing**

---

## Pre-Test Verification

✅ Servers running:
```bash
# Check backend (port 3001)
lsof -i :3001 | grep LISTEN
# Expected: node process listening

# Check frontend (port 5173)
lsof -i :5173 | grep LISTEN
# Expected: node process listening
```

✅ CLI credentials present:
```bash
stat ~/.claude/.credentials.json
# Expected: File exists with 0600 permissions
```

✅ API endpoint responding:
```bash
curl -s http://localhost:5173/api/claude-code/oauth/detect-cli | jq .
# Expected: {"detected": true, "method": "oauth", "email": "max"}
```

---

## Manual Browser Test Steps

### Step 1: Open Settings Page

**Action:** Navigate to http://localhost:5173/settings

**Expected:**
- Settings page loads successfully
- "Connect with OAuth" button visible

---

### Step 2: Click OAuth Connect

**Action:** Click the "Connect with OAuth" button

**Expected:**
- Browser redirects to `/oauth-consent`
- URL contains OAuth parameters (client_id, redirect_uri, state, scope)

---

### Step 3: Verify Green Banner

**Action:** Check the banner on OAuth consent page

**Expected:**
- ✅ **GREEN** banner (not yellow)
- Text reads: "You're logged in to Claude CLI via max subscription"
- NO text about "Anthropic doesn't offer public OAuth"

---

### Step 4: Verify API Key Field

**Action:** Check the API key input field

**Expected:**
- Field is **empty** (OAuth doesn't pre-populate keys)
- Placeholder text: "sk-ant-api03-..."
- Link to console.anthropic.com is visible

---

### Step 5: Check Network Request (DevTools)

**Action:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh page if needed
4. Find `/api/claude-code/oauth/detect-cli` request

**Expected Response:**
```json
{
  "detected": true,
  "method": "oauth",
  "email": "max",
  "message": "Claude CLI OAuth login detected"
}
```

**Security Check:**
- ❌ Should NOT contain `accessToken`
- ❌ Should NOT contain `refreshToken`
- ✅ Only contains detection metadata

---

### Step 6: Verify Page Elements

**Action:** Scroll through consent page

**Expected Elements:**
- 🔐 Lock emoji at top
- Title: "Authorize Claude API Access"
- Blue info box with permissions:
  - ✓ Access Claude AI models
  - ✓ Generate AI responses (inference)
  - ✓ Track API usage
- Green detection banner
- API key input field
- "Authorize" button (enabled after key entered)
- "Cancel" button
- Security note at bottom (AES-256-GCM encryption)

---

## Testing Different Scenarios

### Scenario A: OAuth Logged In (Current)

**Setup:** Current state (has `~/.claude/.credentials.json`)

**Expected:**
- ✅ Green banner
- ✅ Shows "max subscription"
- ✅ Empty API key field
- ✅ Link to console.anthropic.com

---

### Scenario B: API Key in Config (Optional Test)

**Setup:**
```bash
# Temporarily rename credentials
mv ~/.claude/.credentials.json ~/.claude/.credentials.json.backup

# Create config with API key
echo '{"api_key": "sk-ant-api03-'$(head -c 95 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 95)'", "email": "test@example.com"}' > ~/.claude/config.json
```

**Expected:**
- ✅ Green banner
- ✅ API key field **pre-populated** (encrypted)
- ✅ Shows email from config

**Cleanup:**
```bash
# Restore credentials
mv ~/.claude/.credentials.json.backup ~/.claude/.credentials.json
rm ~/.claude/config.json
```

---

### Scenario C: No CLI Login (Optional Test)

**Setup:**
```bash
# Temporarily rename credentials
mv ~/.claude/.credentials.json ~/.claude/.credentials.json.backup
```

**Expected:**
- ❌ **YELLOW** banner (not green)
- ❌ Text: "Anthropic doesn't currently offer public OAuth"
- ❌ Empty API key field
- ❌ Manual entry required

**Cleanup:**
```bash
# Restore credentials
mv ~/.claude/.credentials.json.backup ~/.claude/.credentials.json
```

---

## Success Criteria

### ✅ Pass Conditions

1. Green banner appears when OAuth detected
2. Banner shows correct subscription type ("max")
3. No yellow warning about OAuth unavailability
4. API endpoint returns `detected: true`
5. OAuth tokens NOT exposed in network response
6. Page renders correctly without errors
7. All UI elements present and functional

### ❌ Fail Conditions

1. Yellow banner appears when OAuth credentials exist
2. Banner shows generic text instead of subscription type
3. OAuth tokens visible in network response
4. Console errors in browser DevTools
5. Page fails to load or redirect
6. API key field incorrectly pre-populated for OAuth

---

## Troubleshooting

### Issue: Yellow banner shows instead of green

**Check:**
```bash
# Verify credentials file exists
stat ~/.claude/.credentials.json

# Check API response
curl -s http://localhost:5173/api/claude-code/oauth/detect-cli | jq .
```

**Solution:** Ensure `~/.claude/.credentials.json` exists and contains valid OAuth tokens

---

### Issue: API endpoint returns error

**Check:**
```bash
# Check backend logs
# Look for errors in terminal running api-server

# Test backend directly
curl -s http://localhost:3001/api/claude-code/oauth/detect-cli
```

**Solution:** Restart backend server if needed

---

### Issue: Network request fails

**Check:**
```bash
# Verify Vite proxy configuration
cat frontend/vite.config.ts | grep -A5 proxy
```

**Solution:** Ensure proxy forwards `/api/claude-code` to backend

---

## Browser DevTools Console

### Expected: No Errors

**Open:** F12 → Console tab

**Expected:**
- No red error messages
- May see info logs about detection
- React warnings are acceptable (non-blocking)

### Expected Network Requests

**Open:** F12 → Network tab

**Requests:**
1. `/oauth-consent` - HTML page (200 OK)
2. `/api/claude-code/oauth/detect-cli` - JSON response (200 OK)
3. React/Vite hot-reload sockets (normal)

---

## Quick Test Command Summary

```bash
# 1. Check servers
lsof -i :3001 :5173 | grep LISTEN

# 2. Test API endpoint
curl -s http://localhost:5173/api/claude-code/oauth/detect-cli | jq .

# 3. Verify credentials
stat ~/.claude/.credentials.json

# 4. Check subscription type
cat ~/.claude/.credentials.json | jq .claudeAiOauth.subscriptionType

# 5. Test frontend page
curl -s -I http://localhost:5173/oauth-consent
```

---

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Settings page loads | ✅ 200 OK |
| OAuth redirect works | ✅ Redirects to /oauth-consent |
| Green banner appears | ✅ Shows "max subscription" |
| API detection works | ✅ Returns detected: true |
| No token exposure | ✅ No accessToken in response |
| Page renders correctly | ✅ All elements visible |
| No console errors | ✅ Clean console |

---

## Final Confirmation

After completing all tests, confirm:

- [ ] Green banner appears for OAuth login
- [ ] Subscription type displayed correctly
- [ ] API key field empty (OAuth mode)
- [ ] Link to console.anthropic.com visible
- [ ] No OAuth tokens in network response
- [ ] No browser console errors
- [ ] Page fully functional

---

**If all checks pass:** ✅ OAuth detection fix verified and working!

**If any checks fail:** See troubleshooting section or refer to full verification report at:
`/workspaces/agent-feed/docs/validation/OAUTH-FIX-PRODUCTION-VERIFICATION.md`
