# User Feedback Validation E2E Tests

## Overview

Comprehensive Playwright E2E test suite validating all user-reported fixes for the social media feed application.

## Test Location

**Test File**: `/workspaces/agent-feed/frontend/src/tests/e2e/user-feedback-validation.spec.ts`

## Test Coverage

### Test 1: Post Order Validation
**Purpose**: Verify posts display in correct order with Lambda-vi first

**Validation**:
- Lambda-vi's post appears first in feed
- All posts load correctly
- Screenshot proof of correct ordering

**Screenshot**: `docs/screenshots/post-order-validation.png`

---

### Test 2: Hemingway Bridge Content
**Purpose**: Ensure Hemingway Bridge doesn't show onboarding content

**Validation**:
- No "getting to know you" text
- No "onboarding" text
- No "welcome" messaging
- Screenshot proof of correct content

**Screenshot**: `docs/screenshots/bridge-validation.png`

---

### Test 3: Lambda-vi Avatar Symbol
**Purpose**: Verify Lambda-vi's avatar displays Λ symbol

**Validation**:
- Avatar shows "Λ" character
- Symbol is properly rendered
- Screenshot proof of correct avatar

**Screenshot**: `docs/screenshots/avatar-validation.png`

---

### Test 4: No "Click to Expand" Text
**Purpose**: Confirm no "Click to expand" text is visible anywhere

**Validation**:
- Page content doesn't contain "Click to expand"
- No expansion hints visible
- Screenshot proof of clean interface

**Screenshot**: `docs/screenshots/no-click-to-expand.png`

---

### Test 5: Post Expansion Mechanics
**Purpose**: Validate post expand/collapse works without half-state

**Validation**:
- Posts expand when clicked
- Posts collapse when clicked again
- No intermediate/broken states
- Height changes appropriately
- Screenshot proof of expansion working

**Screenshot**: `docs/screenshots/post-expansion-validation.png`

---

### Test 6: Overall Layout (Bonus)
**Purpose**: Visual regression check for overall design

**Validation**:
- All key elements visible
- Layout matches expected design
- Full page screenshot for review

**Screenshot**: `docs/screenshots/full-page-layout.png`

---

## Running the Tests

### Option 1: Run All User Feedback Tests
```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e:user-feedback
```

### Option 2: Run with Headed Browser (Visual Mode)
```bash
npm run test:e2e:user-feedback:headed
```

### Option 3: Run in Debug Mode
```bash
npm run test:e2e:user-feedback:debug
```

### Option 4: Run in Interactive UI Mode
```bash
npm run test:e2e:user-feedback:ui
```

### Option 5: View HTML Report
```bash
npm run test:e2e:report
```

---

## Prerequisites

### 1. Install Dependencies
```bash
cd /workspaces/agent-feed/frontend
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install chromium
```

### 3. Start Development Server
The tests automatically start the dev server, but you can also run it manually:
```bash
npm run dev
```

Server should be running on: `http://localhost:3001`

---

## Test Configuration

**Browser**: Chromium (Chrome)
**Viewport**: 1920x1080
**Screenshot Mode**: ON (all screenshots captured)
**Video Recording**: ON (on failure)
**Trace**: ON (for debugging)

**Configuration File**: `/workspaces/agent-feed/frontend/playwright.config.ts`

---

## Screenshots Directory

All screenshots are saved to:
```
/workspaces/agent-feed/docs/screenshots/
```

### Expected Screenshots:
1. `post-order-validation.png` - Full feed showing Lambda-vi first
2. `bridge-validation.png` - Hemingway Bridge content
3. `avatar-validation.png` - Lambda-vi's Λ avatar
4. `no-click-to-expand.png` - Clean interface without hints
5. `post-expansion-validation.png` - Expanded post state
6. `full-page-layout.png` - Overall layout validation

---

## Test Results

### HTML Report
Generated at: `/workspaces/agent-feed/frontend/test-results/html-report/`

View with:
```bash
npx playwright show-report
```

### JSON Results
Located at: `/workspaces/agent-feed/frontend/test-results/results.json`

### Video Recordings
Located at: `/workspaces/agent-feed/frontend/test-results/`
(Only generated on test failure)

---

## Success Criteria

All 6 tests must pass:
- ✅ Post order validation
- ✅ Hemingway Bridge content validation
- ✅ Lambda-vi avatar symbol validation
- ✅ No "Click to expand" text validation
- ✅ Post expansion mechanics validation
- ✅ Overall layout validation

Each test produces screenshot proof of the fix working correctly.

---

## Troubleshooting

### Issue: Server not starting
**Solution**: Ensure port 3001 is available or update `baseURL` in playwright.config.ts

### Issue: Screenshots not generated
**Solution**: Check `/workspaces/agent-feed/docs/screenshots/` directory permissions

### Issue: Tests timing out
**Solution**: Increase timeout in test file or check server is running

### Issue: Browser not installed
**Solution**: Run `npx playwright install chromium`

---

## Coordination Hooks

This test suite integrates with Claude-Flow coordination:

**Pre-task**: Initializes task tracking
```bash
npx claude-flow@alpha hooks pre-task --description "Playwright E2E tests"
```

**Notify**: Reports progress
```bash
npx claude-flow@alpha hooks notify --message "Screenshots captured"
```

**Post-task**: Completes task tracking
```bash
npx claude-flow@alpha hooks post-task --task-id "agent-6"
```

---

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [User Feedback Fixes Report](./docs/USER-FEEDBACK-FIXES.md)
- [Test Strategy](./docs/TEST-STRATEGY.md)

---

## Maintenance

**Created**: 2025-11-04
**Last Updated**: 2025-11-04
**Test Framework**: Playwright v1.56.1
**Agent**: Agent 6 - E2E Testing Specialist
