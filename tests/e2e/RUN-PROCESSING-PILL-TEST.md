# Quick Guide: Running Processing Pill Visibility Test

## Overview
This test validates that processing pills stay visible for at least 2 seconds after submitting a comment reply.

## Prerequisites
- Backend server running on http://localhost:3000
- Frontend server running on http://localhost:5173
- Playwright installed (`npm install`)

## Running the Test

### Single Test Run
```bash
cd /workspaces/agent-feed
npx playwright test comment-reply-processing-pill-validation --reporter=line
```

### With UI Mode (Visual Debugging)
```bash
npx playwright test comment-reply-processing-pill-validation --ui
```

### With Headed Browser (Watch Test Execute)
```bash
npx playwright test comment-reply-processing-pill-validation --headed
```

### Generate HTML Report
```bash
npx playwright test comment-reply-processing-pill-validation
npx playwright show-report tests/e2e/playwright-report
```

## Test File Location
- **Test**: `/workspaces/agent-feed/tests/e2e/comment-reply-processing-pill-validation.spec.ts`
- **Screenshots**: `/workspaces/agent-feed/tests/e2e/screenshots/`
- **Report**: `/workspaces/agent-feed/tests/e2e/PROCESSING-PILL-2SEC-TEST-REPORT.md`

## What the Test Validates

1. ✅ Processing pill appears when reply is submitted
2. ✅ Pill stays visible for at least 2 seconds
3. ✅ Pill shows processing states (waiting, analyzing, responding, complete)
4. ✅ No premature UI reloads that would hide the pill

## Expected Results

- Test duration: ~15-20 seconds
- Processing pill visibility: 2-5 seconds
- Screenshots captured: 10 images documenting each step

## Troubleshooting

### Test Fails with "No reply buttons found"
- Check that posts have existing comments
- Verify the app loaded correctly (check screenshots)
- Ensure WebSocket connection is working

### Processing pill not visible
- Check CommentThread.tsx for the 2.5s delay in `comment:state:complete` handler
- Verify WebSocket events are being emitted properly
- Check browser console for errors

### Timeout errors
- Increase timeout in test file (currently 60s)
- Check network tab for slow API calls
- Verify backend is responding

## Success Criteria

The test passes when:
- Processing pill is found (using selector: `span:has-text("Processing")`)
- Pill is visible at 1 second ✅
- Pill is visible at 2 seconds ✅
- Pill is visible at 2.5 seconds ✅
- Total visibility >= 2000ms

## Latest Test Run

**Date**: 2025-11-25  
**Status**: ✅ PASSED  
**Duration**: 17.4s  
**Pill Visibility**: 4.6 seconds  

See full report: `/workspaces/agent-feed/tests/e2e/PROCESSING-PILL-2SEC-TEST-REPORT.md`
