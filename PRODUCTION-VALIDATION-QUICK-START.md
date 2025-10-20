# Production Validation - Quick Start Guide

## What This Does

This test validates **100% real Claude Code integration** with:

- ✅ Real browser (you'll see it open)
- ✅ Real Claude API calls
- ✅ Real responses (no mocks)
- ✅ Screenshots at every step
- ✅ Network request logging
- ✅ Response authenticity verification

## Prerequisites

### 1. Backend Must Be Running

```bash
cd /workspaces/agent-feed/api-server
npm start
```

Backend should be available at: http://localhost:3001

### 2. Frontend Must Be Running

```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

Frontend should be available at: http://localhost:5173

### 3. Valid Claude API Key

Your backend `.env` must have:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

⚠️ **CRITICAL:** Without a valid API key, you'll get 403 Forbidden errors.

## Running the Test

### Option 1: Full Automated Test (Recommended)

```bash
./scripts/run-production-validation.sh
```

This will:
1. Check backend/frontend are running
2. Run the Playwright test
3. Wait for real Claude response (up to 2 minutes)
4. Take screenshots at each step
5. Generate comprehensive report

### Option 2: Manual Playwright Test

```bash
npx playwright test tests/e2e/production-validation-real-browser.spec.ts \
    --headed \
    --project=chromium \
    --timeout=180000
```

## What to Expect

### Timeline

1. **0-5 seconds:** Browser opens, navigates to app
2. **5-10 seconds:** Locates AVI DM interface
3. **10-15 seconds:** Sends test message
4. **15-120 seconds:** Waits for real Claude response
5. **120-130 seconds:** Validates response, takes final screenshots

**Total time:** ~2-3 minutes

### What You'll See

1. **Chrome browser opens** (not headless)
2. **Application loads** at http://localhost:5173
3. **Test navigates** to AVI DM interface
4. **Message is sent:** "List files in the current directory"
5. **Response appears** with real file listings
6. **Screenshots captured** at each step
7. **Test completes** with pass/fail

## Expected Results

### ✅ Success Indicators

- Backend returns **200 OK** (not 403)
- Response shows **tool usage** (Read/Bash/Glob)
- Response contains **real files** (package.json, src/, etc.)
- Response is **NOT a mock** (no "TODO", "fake", "placeholder")
- All **screenshots** saved to `screenshots/production-validation/`

### ❌ Failure Indicators

- **403 Forbidden:** Invalid or missing API key
- **Timeout:** Claude API slow or network issues
- **UI not found:** Frontend structure changed
- **Mock response:** Backend not properly configured

## Test Artifacts

After running, you'll have:

### 1. Screenshots
Location: `/workspaces/agent-feed/screenshots/production-validation/`

- `01-initial-load.png` - App first load
- `03-avi-dm-ready.png` - AVI DM interface
- `05-message-typed.png` - Test message entered
- `06-message-sent.png` - Message sent
- `07-response-received.png` - Claude response
- `09-final-state.png` - Final state
- `ERROR-state.png` - If test failed

### 2. JSON Report
Location: `/workspaces/agent-feed/screenshots/production-validation/validation-report.json`

Contains:
- All test steps
- Network requests/responses
- Validation results
- Errors (if any)

### 3. Comprehensive Report
Location: `/workspaces/agent-feed/PRODUCTION-VALIDATION-COMPLETE.md`

Full markdown report with:
- Executive summary
- All screenshots
- Network analysis
- Response validation
- Success criteria
- Production readiness assessment

### 4. Playwright Report
Location: `/workspaces/agent-feed/playwright-report/index.html`

Interactive HTML report with:
- Video recording
- Trace viewer
- Step-by-step details

## Viewing Results

### View Screenshots

```bash
# List all screenshots
ls -lh screenshots/production-validation/

# Open folder
open screenshots/production-validation/  # macOS
xdg-open screenshots/production-validation/  # Linux
```

### View JSON Report

```bash
# Pretty print
cat screenshots/production-validation/validation-report.json | jq

# Check validation results
cat screenshots/production-validation/validation-report.json | jq '.validations'

# Check network requests
cat screenshots/production-validation/validation-report.json | jq '.networkRequests'
```

### View Comprehensive Report

```bash
# Read the report
cat PRODUCTION-VALIDATION-COMPLETE.md

# Or open in editor
code PRODUCTION-VALIDATION-COMPLETE.md
```

### View Playwright Report

```bash
npx playwright show-report
```

## Troubleshooting

### Problem: 403 Forbidden

**Cause:** Invalid or missing ANTHROPIC_API_KEY

**Solution:**
1. Check `api-server/.env` has `ANTHROPIC_API_KEY=sk-ant-...`
2. Verify key is valid
3. Restart backend: `cd api-server && npm start`
4. Re-run test

### Problem: Timeout (No Response)

**Cause:** Claude API slow or network issues

**Solution:**
1. Check internet connection
2. Verify Claude API status: https://status.anthropic.com
3. Try again (API might be temporarily slow)
4. Check backend logs for errors

### Problem: UI Not Found

**Cause:** Frontend structure changed

**Solution:**
1. Verify frontend is running: http://localhost:5173
2. Check console for errors
3. Update test selectors if UI changed
4. Check screenshots to see what was found

### Problem: Mock Response Detected

**Cause:** Backend returning hardcoded data

**Solution:**
1. Check backend is using real Claude API
2. Verify `orchestrator.js` not using mocks
3. Check network logs in report
4. Ensure API key is set correctly

## Success Criteria

For production readiness, ALL must pass:

- [ ] Backend returns 200 OK
- [ ] Response shows real tool usage
- [ ] Response contains actual file data
- [ ] No mock indicators in response
- [ ] Network requests succeed
- [ ] UI renders correctly
- [ ] Screenshots captured
- [ ] Report generated

## Next Steps

### If All Tests Pass ✅

1. Review `PRODUCTION-VALIDATION-COMPLETE.md`
2. Verify screenshots show correct behavior
3. Confirm network logs show 200 OK
4. Application is **PRODUCTION READY** 🚀

### If Tests Fail ❌

1. Review error messages
2. Check screenshots for issues
3. Review network logs
4. Fix identified problems
5. Re-run validation
6. Repeat until all pass

## Manual Testing (Optional)

If you want to manually verify:

1. Open http://localhost:5173
2. Navigate to AVI DM interface
3. Send message: "List files in the current directory"
4. Wait for response (may take 30-60 seconds)
5. Verify response shows real files
6. Check browser DevTools Network tab for 200 OK

## Integration with CI/CD

To integrate into CI/CD:

```yaml
# .github/workflows/production-validation.yml
name: Production Validation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Start backend
        run: |
          cd api-server
          npm start &
          sleep 5
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Start frontend
        run: |
          cd frontend
          npm run dev &
          sleep 5

      - name: Run production validation
        run: ./scripts/run-production-validation.sh

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: validation-results
          path: |
            screenshots/production-validation/
            PRODUCTION-VALIDATION-COMPLETE.md
```

## Contact

If you encounter issues:

1. Check `PRODUCTION-VALIDATION-COMPLETE.md` for details
2. Review screenshots in `screenshots/production-validation/`
3. Check network logs in JSON report
4. Review Playwright HTML report
5. Check backend logs

---

**Last Updated:** 2025-10-20
**Test Version:** 1.0.0
**Status:** Ready for production validation
