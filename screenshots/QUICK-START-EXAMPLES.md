# AviDM Screenshot Validation - Quick Start Examples

## One-Command Validation

The easiest way to run validation:

```bash
# Navigate to project root
cd /workspaces/agent-feed

# Run the automated script (starts services, captures screenshots, opens results)
./scripts/run-screenshot-validation.sh
```

That's it! The script will:
1. ✅ Check prerequisites
2. ✅ Start API and frontend (if not running)
3. ✅ Capture all 8 screenshots
4. ✅ Generate comparison HTML
5. ✅ Open results in browser

## Common Usage Patterns

### Pattern 1: Full Automated Validation

```bash
# Complete validation with browser UI
./scripts/run-screenshot-validation.sh
```

### Pattern 2: Headless Validation (CI/CD)

```bash
# Run without browser UI (for CI/CD)
./scripts/run-screenshot-validation.sh --headless
```

### Pattern 3: No Auto-Open (Server Environments)

```bash
# Don't automatically open browser
./scripts/run-screenshot-validation.sh --no-open

# Then manually open
open screenshots/avidm-fix/comparison.html
```

### Pattern 4: Manual Script Execution

```bash
# If you prefer to run the TypeScript script directly
npx tsx scripts/capture-avidm-fix-screenshots.ts
```

## Step-by-Step Manual Validation

If you want more control, run each step manually:

### Step 1: Start Services

```bash
# Terminal 1: API Server
cd /workspaces/agent-feed
npm run dev:api

# Terminal 2: Frontend
cd /workspaces/agent-feed/frontend
npm run dev

# Wait for both to be ready
curl http://localhost:3001/api/agents  # Should return agent list
curl http://localhost:5173             # Should return HTML
```

### Step 2: Run Screenshot Script

```bash
# Terminal 3: Screenshot capture
cd /workspaces/agent-feed
npx tsx scripts/capture-avidm-fix-screenshots.ts
```

### Step 3: View Results

```bash
# Open comparison page
open screenshots/avidm-fix/comparison.html

# Or view individual screenshots
ls -lh screenshots/avidm-fix/*.png
```

## Validation Checklist

Use this checklist while reviewing screenshots:

### Screenshot 1: Initial State ✓
- [ ] App loads without errors
- [ ] Feed displays agents
- [ ] UI is responsive
- [ ] No console errors

### Screenshot 2: AviDM Interface ✓
- [ ] DM interface opens
- [ ] Message input visible
- [ ] Send button present
- [ ] Clean UI layout

### Screenshot 3: Message Composed ✓
- [ ] Text appears in input
- [ ] Character count works (if present)
- [ ] Send button enabled
- [ ] No UI glitches

### Screenshot 4: Message Sent ✓
- [ ] Message appears in chat
- [ ] Timestamp displayed
- [ ] Loading indicator shown
- [ ] No errors in console

### Screenshot 5: Response Loading ✓
- [ ] Loading spinner visible
- [ ] User message still displayed
- [ ] UI remains responsive
- [ ] No timeout errors

### Screenshot 6: Response Received ✓
- [ ] Full response visible
- [ ] Formatting correct
- [ ] Timestamp present
- [ ] Chat history maintained

### Screenshot 7: Console Clean ✓
- [ ] No red error messages
- [ ] API calls successful
- [ ] No warnings (or expected ones only)
- [ ] Performance acceptable

### Screenshot 8: Network Tab ✓
- [ ] `/api/avi-dm/chat` request visible
- [ ] Status code: `200 OK`
- [ ] Response has valid JSON
- [ ] No 403 or 500 errors

## Expected Results

### Successful Validation

```
✅ All 8 screenshots captured
✅ comparison.html generated
✅ metadata.json created
✅ Video recording saved

Metadata Summary:
  ✓ Successful API requests: 1+
  ✗ Failed API requests: 0
  ⚠ Console errors: 0

Status: PASS
```

### Failed Validation (Port Not Fixed)

```
❌ Screenshots captured but show errors
⚠ comparison.html generated with errors
⚠ metadata.json shows failures

Metadata Summary:
  ✓ Successful API requests: 0
  ✗ Failed API requests: 1+
  ⚠ Console errors: 1+

Common errors:
  - 403 Forbidden on /api/avi-dm/chat
  - CORS errors
  - Network timeout

Status: FAIL - Port fix not applied
```

## Example Scenarios

### Scenario 1: First-Time Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd agent-feed

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY

# 4. Run validation
./scripts/run-screenshot-validation.sh
```

### Scenario 2: After Making Changes

```bash
# 1. Make your changes
vim frontend/src/services/AviDMService.ts

# 2. Restart services
pkill -f "vite"
pkill -f "nodemon"

npm run dev:api &
cd frontend && npm run dev &

# 3. Wait for services to start (10 seconds)
sleep 10

# 4. Validate
./scripts/run-screenshot-validation.sh
```

### Scenario 3: CI/CD Integration

```bash
# In CI environment
export CI=true

# Run headless validation
./scripts/run-screenshot-validation.sh --headless --no-open

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Validation passed"
  exit 0
else
  echo "❌ Validation failed"
  exit 1
fi
```

### Scenario 4: Debugging Failed Validation

```bash
# 1. Run validation
./scripts/run-screenshot-validation.sh

# 2. If it fails, check logs
cat screenshots/avidm-fix/metadata.json | jq '.consoleMessages'
cat screenshots/avidm-fix/metadata.json | jq '.networkRequests'

# 3. Check API server logs
tail -f logs/combined.log

# 4. Check frontend console
open http://localhost:5173
# Open DevTools (F12) and check Console + Network tabs

# 5. Test API directly
curl -X POST http://localhost:3001/api/avi-dm/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "agentId": "avi"}'
```

## Troubleshooting Examples

### Problem: Port Already in Use

```bash
# Error: Port 3001 is already in use

# Solution 1: Kill existing process
lsof -ti:3001 | xargs kill -9

# Solution 2: Use different port
export API_PORT=3002
npm run dev:api
```

### Problem: Playwright Not Installed

```bash
# Error: npx playwright not found

# Solution: Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

### Problem: Missing Environment Variables

```bash
# Error: ANTHROPIC_API_KEY is not defined

# Solution: Add to .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Restart services
pkill -f "nodemon" && npm run dev:api &
```

### Problem: Screenshots Show 403 Errors

```bash
# This means the port fix is NOT applied

# Check current configuration
grep -n "baseURL" frontend/src/services/AviDMService.ts

# Should show:
# baseURL: 'http://localhost:3001'

# If it shows 5000, fix it:
sed -i 's/localhost:5000/localhost:3001/g' frontend/src/services/AviDMService.ts

# Restart and re-validate
./scripts/run-screenshot-validation.sh
```

## Viewing Results

### Option 1: Browser (Recommended)

```bash
# Automatically opens
./scripts/run-screenshot-validation.sh

# Or manually
open screenshots/avidm-fix/comparison.html
```

### Option 2: Command Line

```bash
# View metadata
cat screenshots/avidm-fix/metadata.json | jq .

# Count screenshots
ls screenshots/avidm-fix/*.png | wc -l

# Check network summary
cat screenshots/avidm-fix/metadata.json | jq '.summary'
```

### Option 3: Image Viewer

```bash
# View all screenshots
open screenshots/avidm-fix/

# Or specific one
open screenshots/avidm-fix/06-response-received.png
```

## Integration Examples

### Example 1: Pre-Commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running AviDM screenshot validation..."
./scripts/run-screenshot-validation.sh --headless --no-open

if [ $? -ne 0 ]; then
  echo "❌ Screenshot validation failed"
  echo "Fix issues before committing"
  exit 1
fi

echo "✅ Validation passed"
exit 0
```

### Example 2: GitHub Actions

```yaml
# .github/workflows/screenshot-validation.yml
name: Screenshot Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      - name: Run screenshot validation
        run: ./scripts/run-screenshot-validation.sh --headless --no-open
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: screenshots/avidm-fix/
```

### Example 3: Make Target

```makefile
# Makefile
.PHONY: validate-screenshots
validate-screenshots:
	@echo "Running screenshot validation..."
	@./scripts/run-screenshot-validation.sh

.PHONY: validate-headless
validate-headless:
	@echo "Running headless validation..."
	@./scripts/run-screenshot-validation.sh --headless --no-open

.PHONY: validate-ci
validate-ci: validate-headless
	@echo "CI validation complete"
```

Then use:

```bash
make validate-screenshots
make validate-headless
make validate-ci
```

## Performance Notes

- Full validation takes: **30-60 seconds**
- Screenshot capture: **~5 seconds each**
- Claude response wait: **10-30 seconds**
- Browser startup: **5-10 seconds**
- Total screenshots: **8 images (~5-10 MB)**
- Video recording: **~50-100 MB**

## Best Practices

1. **Always run after making changes** to AviDM configuration
2. **Check comparison.html** for visual confirmation
3. **Review metadata.json** for technical details
4. **Save successful validations** for historical reference
5. **Archive screenshots** before major deployments
6. **Run headless in CI/CD** to save resources
7. **Keep services running** during development
8. **Clean old screenshots** periodically

## Quick Commands Reference

```bash
# Full validation
./scripts/run-screenshot-validation.sh

# Headless
./scripts/run-screenshot-validation.sh --headless

# No browser
./scripts/run-screenshot-validation.sh --no-open

# View results
open screenshots/avidm-fix/comparison.html

# Check metadata
jq . screenshots/avidm-fix/metadata.json

# Count successes
jq '.summary.successfulRequests' screenshots/avidm-fix/metadata.json

# View errors
jq '.consoleMessages[] | select(.type=="error")' screenshots/avidm-fix/metadata.json
```

---

**Quick Reference Card**

```
┌─────────────────────────────────────────────────┐
│   AviDM Screenshot Validation Cheat Sheet       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Run:    ./scripts/run-screenshot-validation.sh │
│  View:   open screenshots/avidm-fix/comparison  │
│  Check:  jq . screenshots/avidm-fix/metadata    │
│                                                 │
│  Headless:  --headless                         │
│  No-open:   --no-open                          │
│                                                 │
│  Expected: 8 screenshots, 200 OK, 0 errors     │
│                                                 │
└─────────────────────────────────────────────────┘
```

Happy validating! 🎯
