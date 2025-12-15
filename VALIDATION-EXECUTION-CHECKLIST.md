# Production Validation - Execution Checklist

## Pre-Execution Checklist

### System Requirements
- [ ] Node.js v18+ installed (current: v22.17.0) ✅
- [ ] npm v8+ installed (current: v9.8.1) ✅
- [ ] Playwright installed (current: v1.55.1) ✅
- [ ] Chrome/Chromium browser available
- [ ] At least 1 GB free disk space
- [ ] Internet connectivity active

### Services Status
- [ ] Backend running on port 3001 ✅
  ```bash
  curl http://localhost:3001/health
  ```
- [ ] Frontend running on port 5173 ✅
  ```bash
  curl http://localhost:5173
  ```
- [ ] No other Playwright tests running
- [ ] Development environment stable

### Configuration
- [ ] `api-server/.env` file exists
- [ ] `ANTHROPIC_API_KEY` set in `.env`
- [ ] API key format: `sk-ant-api03-...`
- [ ] API key is valid (not expired)
- [ ] Screenshots directory writable

### Optional: Verify API Key
```bash
# Test API key directly (optional)
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
# Should return 200 OK with response
```

---

## Execution Steps

### Step 1: Run Preflight Check

```bash
./scripts/preflight-production-validation.sh
```

**Expected Output:**
```
✓ Node.js installed: v22.17.0
✓ npm installed: v9.8.1
✓ Playwright installed: Version 1.55.1
✓ Backend is running on port 3001
✓ Frontend is running on port 5173
✓ ANTHROPIC_API_KEY found in .env
✓ ALL CRITICAL CHECKS PASSED
```

**Action:** If any checks fail, fix issues before proceeding.

---

### Step 2: Run Production Validation

```bash
./scripts/run-production-validation.sh
```

**What Will Happen:**
1. Script checks backend/frontend running
2. Chrome browser opens (you'll see it)
3. Browser navigates to http://localhost:5173
4. Test locates AVI DM interface
5. Test sends message: "List files in the current directory"
6. **Wait 30-120 seconds** for Claude response (be patient!)
7. Test validates response authenticity
8. Screenshots captured at each step
9. Report generated automatically

**Expected Duration:** 1-3 minutes

**You Should See:**
- Chrome window opens (not hidden)
- Application loads
- Message typed and sent
- Response appears with file listing
- Test completes successfully

---

### Step 3: Review Results

#### Check Test Status

```bash
# Test should pass with no errors
echo $?  # Should be 0
```

#### View Screenshots

```bash
ls -lh screenshots/production-validation/
```

**Expected Files:**
- `01-initial-load.png` - Initial app state
- `03-avi-dm-ready.png` - AVI DM interface
- `05-message-typed.png` - Message entered
- `06-message-sent.png` - Message sent
- `07-response-received.png` - Claude response
- `09-final-state.png` - Final state

#### View JSON Report

```bash
cat screenshots/production-validation/validation-report.json | jq '.validations'
```

**Expected Output:**
```json
{
  "backendConnectivity": true,
  "claudeApiIntegration": true,
  "realToolUsage": true,
  "actualDataReturned": true,
  "noMockResponses": true,
  "properStatusCodes": true
}
```

#### View Comprehensive Report

```bash
cat PRODUCTION-VALIDATION-COMPLETE.md
```

#### View Playwright Report

```bash
npx playwright show-report
```

---

## Success Criteria

### All Must Be True ✅

- [ ] Test completed without errors
- [ ] All 6 validations passed
- [ ] 9+ screenshots captured
- [ ] Response contains real file names
- [ ] Network requests show 200 OK
- [ ] No 403 Forbidden errors
- [ ] Report generated successfully

### Validation Details

#### 1. Backend Connectivity ✅
- [ ] Backend returned 200 OK
- [ ] Health endpoint accessible
- [ ] API endpoints reachable

#### 2. Claude API Integration ✅
- [ ] Claude API responded
- [ ] Response received in < 2 minutes
- [ ] Response format correct

#### 3. Real Tool Usage ✅
- [ ] Response mentions Read/Bash/Glob
- [ ] Tool execution visible
- [ ] Proper formatting present

#### 4. Actual Data Returned ✅
- [ ] Real file names (package.json, etc.)
- [ ] Actual directory structure
- [ ] Valid content (not placeholders)

#### 5. No Mock Responses ✅
- [ ] No "mock" keyword
- [ ] No "fake" keyword
- [ ] No "TODO" indicators
- [ ] No hardcoded test data

#### 6. Proper Status Codes ✅
- [ ] All requests return 200
- [ ] No 403 Forbidden
- [ ] No 500 errors

---

## Troubleshooting

### Issue: Preflight Check Failed

**Check:** Review preflight output for specific failures

**Common Fixes:**
- Backend not running: `cd api-server && npm start`
- Frontend not running: `cd frontend && npm run dev`
- Missing API key: Add to `api-server/.env`
- Playwright not installed: `npx playwright install chromium`

---

### Issue: Test Timeout

**Symptoms:** Test waits > 2 minutes with no response

**Possible Causes:**
1. Claude API slow (normal during peak hours)
2. Network connectivity issues
3. Backend not processing request
4. API key issues

**Debugging:**
```bash
# Check backend logs
tail -f api-server/logs/combined.log

# Check if backend is actually calling Claude
# (should see API requests in logs)

# Test API key directly
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $(grep ANTHROPIC_API_KEY api-server/.env | cut -d= -f2)" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

**Fix:**
1. Wait and try again (API may be slow)
2. Check https://status.anthropic.com
3. Verify API key is valid
4. Check internet connection

---

### Issue: 403 Forbidden

**Symptoms:** Network log shows 403 status code

**Cause:** Invalid or missing ANTHROPIC_API_KEY

**Fix:**
```bash
# 1. Check .env file
cat api-server/.env | grep ANTHROPIC_API_KEY

# 2. Should see: ANTHROPIC_API_KEY=sk-ant-api03-...

# 3. If missing or wrong, update it:
echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE" >> api-server/.env

# 4. Restart backend
cd api-server
npm start

# 5. Re-run validation
cd /workspaces/agent-feed
./scripts/run-production-validation.sh
```

---

### Issue: UI Not Found

**Symptoms:** Test fails at "Locate AVI DM Interface"

**Cause:** Frontend structure changed or UI not rendered

**Debugging:**
```bash
# 1. Check screenshot: 02-avi-not-found.png
# 2. Manually verify UI exists: http://localhost:5173
# 3. Check browser console for JavaScript errors
```

**Fix:**
1. If UI structure changed, update test selectors
2. If JavaScript errors, fix frontend issues
3. If UI not visible, check frontend build

---

### Issue: Mock Response Detected

**Symptoms:** Validation fails: `noMockResponses: false`

**Cause:** Backend returning hardcoded/mock data

**Debugging:**
```bash
# 1. Check network log in validation-report.json
cat screenshots/production-validation/validation-report.json | jq '.networkRequests'

# 2. Look at response body
# 3. Check if it contains real file names or mock data
```

**Fix:**
1. Verify backend is using real Claude API
2. Check `api-server/avi/orchestrator.js` not using mocks
3. Ensure API key is set and working
4. Restart backend and re-run

---

## Post-Execution Checklist

### If All Tests Pass ✅

- [ ] Review comprehensive report
- [ ] Verify screenshots show correct behavior
- [ ] Confirm network logs show 200 OK
- [ ] Check response contains real data
- [ ] Archive validation results (optional)

**Status:** ✅ **PRODUCTION READY**

**Next Actions:**
1. Document validation date/time
2. Save validation artifacts
3. Proceed with deployment
4. Schedule next validation

---

### If Tests Fail ❌

- [ ] Review error messages
- [ ] Check specific validation failures
- [ ] Review screenshots for visual clues
- [ ] Check network logs for errors
- [ ] Identify root cause

**Status:** ❌ **NOT PRODUCTION READY**

**Required Actions:**
1. Fix identified issues
2. Re-run preflight check
3. Re-run validation
4. Repeat until all pass

**Common Fixes:**
- 403 → Fix API key
- Timeout → Wait and retry / Check Claude status
- UI not found → Update selectors
- Mock detected → Enable real integration

---

## Validation Frequency

### Recommended Schedule

- **Before every production deployment** - Always
- **After significant changes** - Always
- **Daily** - Recommended for production systems
- **Every 6 hours** - Ideal for critical systems
- **On-demand** - When issues suspected

### Automated Scheduling

```bash
# Add to crontab
0 */6 * * * cd /workspaces/agent-feed && ./scripts/run-production-validation.sh
```

---

## Archive Validation Results

### Save Results by Date

```bash
# Create archive
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p validation-history/$DATE

# Copy artifacts
cp -r screenshots/production-validation/* validation-history/$DATE/
cp PRODUCTION-VALIDATION-COMPLETE.md validation-history/$DATE/

# Add metadata
echo "Validation Date: $(date)" > validation-history/$DATE/metadata.txt
echo "Status: $(cat screenshots/production-validation/validation-report.json | jq -r '.success')" >> validation-history/$DATE/metadata.txt
echo "Duration: $(cat screenshots/production-validation/validation-report.json | jq -r '.steps | length') steps" >> validation-history/$DATE/metadata.txt
```

---

## Quick Reference Commands

### Run Everything
```bash
./scripts/preflight-production-validation.sh && \
./scripts/run-production-validation.sh
```

### View Results
```bash
# Screenshots
ls -lh screenshots/production-validation/

# JSON summary
cat screenshots/production-validation/validation-report.json | jq '.validations'

# Full report
cat PRODUCTION-VALIDATION-COMPLETE.md

# Playwright report
npx playwright show-report
```

### Check Services
```bash
# Backend
curl http://localhost:3001/health | jq

# Frontend
curl -I http://localhost:5173

# API key (check it's set)
grep ANTHROPIC_API_KEY api-server/.env
```

### Clean Up
```bash
# Remove old screenshots
rm -rf screenshots/production-validation/*

# Remove old reports
rm -f PRODUCTION-VALIDATION-COMPLETE.md
rm -f screenshots/production-validation/validation-report.json

# Remove Playwright artifacts
rm -rf playwright-report/
rm -rf test-results/
```

---

## Integration with Deployment

### Pre-Deployment Script

```bash
#!/bin/bash
# deploy-with-validation.sh

echo "Running production validation before deployment..."

./scripts/run-production-validation.sh

if [ $? -eq 0 ]; then
    echo "✅ Validation passed - proceeding with deployment"
    ./scripts/deploy.sh
else
    echo "❌ Validation failed - deployment aborted"
    exit 1
fi
```

---

## Contact & Support

### If You Need Help

1. **Review this checklist** - Most issues covered here
2. **Check comprehensive report** - `PRODUCTION-VALIDATION-COMPLETE.md`
3. **Review screenshots** - Visual evidence of what happened
4. **Check network logs** - API request/response details
5. **Review backend logs** - `tail -f api-server/logs/combined.log`

### Common Resources

- Quick Start: `PRODUCTION-VALIDATION-QUICK-START.md`
- Comprehensive Report: `PRODUCTION-VALIDATION-COMPLETE.md`
- Test File: `tests/e2e/production-validation-real-browser.spec.ts`
- Runner Script: `scripts/run-production-validation.sh`

---

## Final Checklist Before Running

- [ ] Read this entire checklist
- [ ] Understand what will happen
- [ ] Backend is running
- [ ] Frontend is running
- [ ] API key is configured
- [ ] Ready to wait 1-3 minutes
- [ ] Ready to watch browser execute test

**Ready?** Run:
```bash
./scripts/run-production-validation.sh
```

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
**Status:** Ready for Execution
