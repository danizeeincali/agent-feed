# OAuth Consent Detection Fix - Manual Validation Test

## Test Objective
Verify that the OAuthConsent page correctly handles both API key and OAuth-only detection scenarios.

## Prerequisites
- Server running on http://localhost:5173
- Detection endpoint available at `/api/claude-code/oauth/detect-cli`

## Test Scenarios

### Scenario 1: API Key Detected (config.json exists)
**Expected Response:**
```json
{
  "detected": true,
  "method": "api-key",
  "email": "user@example.com",
  "encryptedKey": "sk-ant-api03-..."
}
```

**Expected UI Behavior:**
- ✅ Green banner shows: "We detected your Claude CLI login (user@example.com). Click Authorize to continue, or edit the key below."
- ✅ API key field is pre-populated with encrypted key
- ✅ NO yellow warning banner

### Scenario 2: OAuth Detected (Only .credentials.json exists)
**Expected Response:**
```json
{
  "detected": true,
  "method": "oauth",
  "email": "max",
  "message": "Claude CLI OAuth login detected"
}
```

**Expected UI Behavior:**
- ✅ Green banner shows: "You're logged in to Claude CLI via max subscription. Please enter your API key from console.anthropic.com to continue."
- ✅ API key field is EMPTY (user must enter manually)
- ✅ Link to console.anthropic.com is present
- ✅ NO yellow warning banner

### Scenario 3: No Detection
**Expected Response:**
```json
{
  "detected": false,
  "message": "No Claude CLI login detected"
}
```

**Expected UI Behavior:**
- ✅ Yellow warning banner shows: "Anthropic doesn't currently offer public OAuth. Please enter your API key directly."
- ✅ API key field is empty
- ✅ NO green detection banner

## Code Changes Made

### Detection Logic (lines 39-47 in OAuthConsent.tsx)
```typescript
// BEFORE (BROKEN):
if (data.detected && data.encryptedKey) {
  setApiKey(data.encryptedKey);
  setDetectedEmail(data.email || 'Unknown');
  setCliDetected(true);
}

// AFTER (FIXED):
if (data.detected) {
  // Pre-populate API key if available
  if (data.encryptedKey) {
    setApiKey(data.encryptedKey);
  }
  // Always set detection state
  setDetectedEmail(data.email || 'Unknown');
  setCliDetected(true);
}
```

### UI Rendering (lines 132-157 in OAuthConsent.tsx)
```typescript
// FIXED: Show different messages based on whether API key was pre-populated
{cliDetected ? (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
    {apiKey ? (
      <p className="text-sm text-green-800">
        <strong>✓ We detected your Claude CLI login ({detectedEmail}).</strong>
        {' '}Click Authorize to continue, or edit the key below.
      </p>
    ) : (
      <p className="text-sm text-green-800">
        <strong>✓ You're logged in to Claude CLI via {detectedEmail} subscription.</strong>
        {' '}Please enter your API key from{' '}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline text-green-900 hover:text-green-700">
          console.anthropic.com
        </a>
        {' '}to continue.
      </p>
    )}
  </div>
) : (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
    <p className="text-sm text-yellow-800">
      <strong>Note:</strong> Anthropic doesn't currently offer public OAuth.
      Please enter your API key directly. It will be encrypted and stored securely.
    </p>
  </div>
)}
```

## Manual Test Steps

1. **Start the development server:**
   ```bash
   cd /workspaces/agent-feed
   npm run dev
   ```

2. **Test Scenario 2 (OAuth Only - The Bug Fix):**
   - Navigate to: `http://localhost:5173/oauth/consent?client_id=test&redirect_uri=http://localhost:5173/settings&scope=inference&state=abc123`
   - Open browser DevTools Network tab
   - Check the response from `/api/claude-code/oauth/detect-cli`
   - Verify:
     - If response has `detected: true` with NO `encryptedKey`:
       - Green banner appears
       - Message says "You're logged in to Claude CLI via [email] subscription"
       - API key field is empty
       - Link to console.anthropic.com exists

3. **Test Scenario 1 (API Key Detected):**
   - If config.json exists with encrypted key:
     - Green banner appears
     - Message says "We detected your Claude CLI login"
     - API key field is pre-populated

4. **Test Scenario 3 (No Detection):**
   - If both files missing:
     - Yellow warning banner appears
     - No green banner
     - API key field empty

## Test Results

**Date:** 2025-11-09
**Tester:** Claude Code Agent

**Test Results:** ✅ Code changes implemented successfully

**Fix Summary:**
1. Detection logic now processes `data.detected` independently of `data.encryptedKey`
2. UI conditional rendering checks both `cliDetected` state AND `apiKey` value
3. OAuth-only users now see green banner with helpful instructions
4. API key users still get pre-population functionality

**Files Modified:**
- `/workspaces/agent-feed/frontend/src/pages/OAuthConsent.tsx`

**Status:** READY FOR MANUAL BROWSER TESTING
