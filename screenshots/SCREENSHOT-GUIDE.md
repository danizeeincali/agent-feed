# AviDM Fix Screenshot Validation Guide

## Overview

This guide explains how to use the screenshot validation script to capture before/after evidence of the AviDM port fix.

## Quick Start

### 1. Prerequisites

Ensure you have the following running:

```bash
# Terminal 1: Start the API server (port 3001)
cd /workspaces/agent-feed
npm run dev:api

# Terminal 2: Start the frontend (port 5173)
cd /workspaces/agent-feed/frontend
npm run dev

# Terminal 3: Run the screenshot script
cd /workspaces/agent-feed
npx tsx scripts/capture-avidm-fix-screenshots.ts
```

### 2. What the Script Does

The script automatically:

1. **Launches Playwright browser** with DevTools open
2. **Navigates to the app** (http://localhost:5173)
3. **Opens AviDM interface** by clicking Avi's profile
4. **Sends a test message** to Avi
5. **Waits for Claude's response**
6. **Captures 8 screenshots** showing the full flow
7. **Monitors network requests** for 200 OK vs 403 errors
8. **Records console messages** to verify no errors
9. **Generates HTML comparison page** with all screenshots

### 3. Expected Output

```
screenshots/avidm-fix/
├── 01-initial-state.png           # App loaded
├── 02-avidm-interface.png         # DM interface open
├── 03-message-composed.png        # Message typed
├── 04-message-sent.png            # After clicking send
├── 05-response-loading.png        # Loading state
├── 06-response-received.png       # Full response visible
├── 07-console-clean.png           # Console with no errors
├── 08-network-tab.png             # Network tab showing 200 OK
├── comparison.html                # Visual comparison page
├── metadata.json                  # Technical details
└── videos/                        # Screen recording
    └── validation.webm
```

## Screenshot Details

### Screenshot 1: Initial State
- **File**: `01-initial-state.png`
- **Shows**: Application loaded with main feed view
- **Purpose**: Baseline state before interaction
- **Expected**: Clean UI with agent feed visible

### Screenshot 2: AviDM Interface
- **File**: `02-avidm-interface.png`
- **Shows**: DM interface opened and ready
- **Purpose**: Verify UI is accessible
- **Expected**: Message input field and send button visible

### Screenshot 3: Message Composed
- **File**: `03-message-composed.png`
- **Shows**: Test message typed in input field
- **Purpose**: Show user interaction
- **Expected**: Message text visible in input

### Screenshot 4: Message Sent
- **File**: `04-message-sent.png`
- **Shows**: State immediately after clicking send
- **Purpose**: Capture the sending action
- **Expected**: Loading indicator or sent confirmation

### Screenshot 5: Response Loading
- **File**: `05-response-loading.png`
- **Shows**: Loading state while waiting for Claude
- **Purpose**: Show system is processing
- **Expected**: Loading spinner or progress indicator

### Screenshot 6: Response Received
- **File**: `06-response-received.png`
- **Shows**: Full response from Avi/Claude
- **Purpose**: Prove end-to-end flow works
- **Expected**: Complete message from Avi displayed

### Screenshot 7: Console Clean
- **File**: `07-console-clean.png`
- **Shows**: Browser console with no errors
- **Purpose**: Verify no JavaScript errors
- **Expected**: Clean console (or only info/debug messages)

### Screenshot 8: Network Tab
- **File**: `08-network-tab.png`
- **Shows**: Network tab with API requests
- **Purpose**: Prove 200 OK responses
- **Expected**: `/api/avi-dm/chat` with 200 status

## Viewing Results

### Option 1: Open HTML Comparison (Recommended)

```bash
# Open in browser
open screenshots/avidm-fix/comparison.html

# Or with a specific browser
google-chrome screenshots/avidm-fix/comparison.html
firefox screenshots/avidm-fix/comparison.html
```

The HTML page includes:
- Before/After comparison
- All 8 screenshots with descriptions
- Network request summary
- Console message summary
- Technical metadata
- Timestamp information

### Option 2: View Individual Screenshots

```bash
# View all screenshots
ls -lh screenshots/avidm-fix/*.png

# Open specific screenshot
open screenshots/avidm-fix/06-response-received.png
```

### Option 3: Review Metadata JSON

```bash
# View technical details
cat screenshots/avidm-fix/metadata.json | jq .

# Check network summary
cat screenshots/avidm-fix/metadata.json | jq '.summary'

# View all network requests
cat screenshots/avidm-fix/metadata.json | jq '.networkRequests'
```

## Troubleshooting

### Problem: Script can't find AviDM interface

**Solution**: Update the selectors in the script

```typescript
// Edit scripts/capture-avidm-fix-screenshots.ts
// Line ~180-190: Update these selectors to match your UI

const aviButton = await this.page.locator(
  '[data-testid="avi-profile"]',  // Add your selector here
  'button:has-text("Avi")',
  '.agent-profile:has-text("Avi")'
).first();

const dmButton = await this.page.locator(
  '[data-testid="dm-button"]',    // Add your selector here
  'button:has-text("Message")',
  'button:has-text("DM")'
).first();
```

### Problem: API server not running

**Error**: `Network requests show no responses`

**Solution**:
```bash
# Check if API server is running
curl http://localhost:3001/api/agents

# If not running, start it
npm run dev:api
```

### Problem: Frontend not running

**Error**: `Failed to navigate to http://localhost:5173`

**Solution**:
```bash
# Check if frontend is running
curl http://localhost:5173

# If not running, start it
cd frontend && npm run dev
```

### Problem: Screenshots show errors

**Check**:
1. Review `metadata.json` for error details
2. Look at `console-clean.png` for error messages
3. Check `network-tab.png` for failed requests

**Common Issues**:
- 403 errors = Port still wrong (check AviDMService.ts)
- 500 errors = API server crash (check API logs)
- Timeout = Claude API key missing (check .env)

## Manual Validation

If the automated script fails, validate manually:

### Step 1: Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "avi-dm"
4. Send a message through UI
5. Verify request shows:
   - URL: `http://localhost:3001/api/avi-dm/chat`
   - Status: `200 OK`
   - Response: Valid JSON with Claude's response

### Step 2: Check Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Send a message
4. Verify no red error messages

### Step 3: Test End-to-End Flow

1. Load app at http://localhost:5173
2. Click on Avi's profile
3. Click "Message" or DM button
4. Type: "Hello Avi, test message"
5. Click Send
6. Wait for response (10-30 seconds)
7. Verify response appears in chat

## Before/After Comparison

### BEFORE Fix (Port 5000)

```
Request URL: http://localhost:5000/api/avi-dm/chat
Status Code: 403 Forbidden
Response: Cannot GET /api/avi-dm/chat

Console Errors:
❌ Failed to send message: Error: Request failed with status code 403
❌ Network request failed: 403 Forbidden

User Experience:
❌ Cannot send messages to Avi
❌ Error messages displayed
❌ Broken functionality
```

### AFTER Fix (Port 3001)

```
Request URL: http://localhost:3001/api/avi-dm/chat
Status Code: 200 OK
Response: {
  "response": "Hello! I'd be happy to help...",
  "agent": "avi",
  "timestamp": "2025-10-20T..."
}

Console:
✅ No errors
✅ Clean console output
✅ Successful API calls

User Experience:
✅ Messages send successfully
✅ Responses appear as expected
✅ Full functionality working
```

## Integration with Testing

### Add to CI/CD Pipeline

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  screenshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Start services
        run: |
          npm run dev:api &
          npm run dev &
          sleep 10

      - name: Capture screenshots
        run: npx tsx scripts/capture-avidm-fix-screenshots.ts

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        with:
          name: avidm-screenshots
          path: screenshots/avidm-fix/
```

### Add to Test Suite

```typescript
// tests/e2e/avidm-validation.spec.ts
import { test, expect } from '@playwright/test';
import { AviDMScreenshotCapture } from '../scripts/capture-avidm-fix-screenshots';

test('AviDM API returns 200 OK', async ({ page }) => {
  const capture = new AviDMScreenshotCapture();
  await capture.initialize();
  await capture.runValidation();

  // Assertions
  const metadata = capture.getMetadata();
  const responses = metadata.networkRequests
    .filter(r => r.url.includes('/avi-dm/chat'));

  expect(responses.length).toBeGreaterThan(0);
  expect(responses[0].status).toBe(200);
});
```

## Documentation Links

- **Fix Implementation**: `/workspaces/agent-feed/AVI-DM-FIX-COMPLETE.md`
- **TDD Report**: `/workspaces/agent-feed/AVIDM-PORT-FIX-TDD-REPORT.md`
- **Validation Summary**: `/workspaces/agent-feed/AVIDM-PORT-FIX-VALIDATION-SUMMARY.md`
- **Quick Reference**: `/workspaces/agent-feed/AVIDM-PORT-FIX-QUICK-REFERENCE.md`

## Questions?

If you encounter issues:

1. Check the console output from the script
2. Review `metadata.json` for technical details
3. Verify both frontend and API are running
4. Ensure Anthropic API key is configured
5. Check that ports 3001 and 5173 are available

## Advanced Usage

### Custom Test Message

Edit the script to use your own test message:

```typescript
// Line ~200
await messageInput.fill('Your custom test message here');
```

### Different Viewport Sizes

```typescript
// Line ~45
viewport: { width: 1920, height: 1080 },  // Change to 1366x768, etc.
```

### Headless Mode

```typescript
// Line ~40
headless: true,  // Change to true for CI/CD
```

### Capture More Screenshots

Add custom capture points:

```typescript
// After any step
await this.captureScreenshot(
  '09-custom-state',
  'Your custom screenshot description'
);
```

## Success Criteria

✅ All 8 screenshots captured successfully
✅ No 403 errors in network tab
✅ All API requests return 200 OK
✅ No console errors displayed
✅ Full response received from Claude
✅ HTML comparison page generated
✅ Metadata JSON includes network summary
✅ Video recording available

## Next Steps

After validating screenshots:

1. Review comparison.html
2. Share screenshots with team
3. Update validation documentation
4. Archive screenshots for compliance
5. Add to production deployment checklist

---

**Last Updated**: 2025-10-20
**Script Location**: `/workspaces/agent-feed/scripts/capture-avidm-fix-screenshots.ts`
**Output Location**: `/workspaces/agent-feed/screenshots/avidm-fix/`
