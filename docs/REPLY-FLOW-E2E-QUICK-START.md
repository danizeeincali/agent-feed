# Reply Flow E2E Tests - Quick Start Guide

## 🚀 Run Tests in 3 Steps

### Step 1: Start Servers
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd api-server && npm start
```

### Step 2: Run Tests
```bash
# Single command
./tests/playwright/run-reply-flow-validation.sh
```

### Step 3: View Results
```bash
# HTML report opens automatically
# Or open manually:
npx playwright show-report tests/playwright/reports/reply-flow-html
```

---

## 📸 What Gets Tested

### ✅ Test 1: Processing Pill (15s)
- Reply form shows spinner during submission
- **Screenshot**: `reply-2-processing-pill.png` shows spinner

### ✅ Test 2: Agent Routing (45s)
- Avi responds to replies on his comments
- **Screenshots**: 3 stages of conversation

### ✅ Test 3: Deep Threading (60s)
- Multi-level replies work correctly
- **Screenshots**: 5+ levels of conversation

### ✅ Test 4: Multiple Agents (45s)
- Get-to-Know-You agent maintains own thread
- **Screenshots**: Agent-specific routing

---

## 📊 Expected Results

```
✓ Test 1: Reply Processing Pill Visibility (15s)
✓ Test 2: Agent Response to Reply (45s)
✓ Test 3: Deep Threading (Reply to Reply) (60s)
✓ Test 4: Multiple Agents - Get-to-Know-You (45s)

4 passed (165s)
```

**Screenshots**: 16+ images in `tests/playwright/screenshots/reply-flow/`

---

## 🔧 Troubleshooting

### Servers Not Running
```bash
# Check frontend
curl http://localhost:5173

# Check backend
curl http://localhost:3000/health

# If not running, restart
```

### Tests Fail
```bash
# Run single test
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --grep "Test 1"

# Debug mode
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --debug
```

### Screenshots Missing
```bash
# Create directory
mkdir -p tests/playwright/screenshots/reply-flow

# Run tests again
./tests/playwright/run-reply-flow-validation.sh
```

---

## 📚 Full Documentation

See: `/docs/REPLY-FLOW-E2E-TEST-SUITE.md`

---

**Status**: ✅ Ready to run
**Duration**: ~3 minutes total
**Last Updated**: 2025-11-14
