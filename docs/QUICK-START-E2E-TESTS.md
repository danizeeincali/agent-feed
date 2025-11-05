# Quick Start: User Feedback E2E Tests

## Run Tests in 3 Steps

### Step 1: Ensure API Server is Running
```bash
# Check if server is running
lsof -ti:3001

# If not running, start it:
cd /workspaces/agent-feed/api-server
node server.js &
```

### Step 2: Run the Tests
```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e:user-feedback
```

### Step 3: View Results
```bash
# View HTML report
npm run test:e2e:report

# Check screenshots
ls -lah /workspaces/agent-feed/docs/screenshots/
```

---

## Alternative Run Methods

### Run with Visible Browser
```bash
npm run test:e2e:user-feedback:headed
```

### Run in Debug Mode (Step Through)
```bash
npm run test:e2e:user-feedback:debug
```

### Run in Interactive UI
```bash
npm run test:e2e:user-feedback:ui
```

### Use Shell Script
```bash
./run-user-feedback-tests.sh
```

---

## What the Tests Validate

1. ✅ Posts display in correct order (Lambda-vi first)
2. ✅ Hemingway Bridge shows correct content (no onboarding)
3. ✅ Lambda-vi avatar shows Λ symbol
4. ✅ No "Click to expand" text visible
5. ✅ Post expansion works without half-state
6. ✅ Overall layout is correct

---

## Expected Output

```
Running 6 tests using 1 worker

✓ 1 user-feedback-validation › user-feedback-validation.spec.ts:13:3 › Posts display in correct order
✓ 2 user-feedback-validation › user-feedback-validation.spec.ts:35:3 › Hemingway Bridge content
✓ 3 user-feedback-validation › user-feedback-validation.spec.ts:57:3 › Lambda-vi avatar shows Λ
✓ 4 user-feedback-validation › user-feedback-validation.spec.ts:82:3 › No "Click to expand" text
✓ 5 user-feedback-validation › user-feedback-validation.spec.ts:100:3 › Post expansion mechanics
✓ 6 user-feedback-validation › user-feedback-validation.spec.ts:138:3 › Overall layout validation

6 passed (60s)

Screenshots saved to: /workspaces/agent-feed/docs/screenshots/
```

---

## Troubleshooting

**Problem**: Server not running
**Solution**: `cd /workspaces/agent-feed/api-server && node server.js`

**Problem**: Tests fail to find elements
**Solution**: Wait for page to fully load, check server is healthy

**Problem**: Screenshots not saved
**Solution**: Check directory permissions: `mkdir -p /workspaces/agent-feed/docs/screenshots`

---

## Files & Locations

**Test File**: `/workspaces/agent-feed/frontend/src/tests/e2e/user-feedback-validation.spec.ts`
**Config**: `/workspaces/agent-feed/frontend/playwright.config.ts`
**Screenshots**: `/workspaces/agent-feed/docs/screenshots/`
**Reports**: `/workspaces/agent-feed/frontend/test-results/`

---

## Full Documentation

See: `/workspaces/agent-feed/docs/E2E-USER-FEEDBACK-TESTS-README.md`
