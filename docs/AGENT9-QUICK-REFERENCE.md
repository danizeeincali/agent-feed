# Agent 9 - Quick Reference Guide

**Last Updated:** 2025-11-12
**Status:** Test Infrastructure Ready ✅

---

## 🚀 Quick Start

### Run All Tests
```bash
cd /workspaces/agent-feed
./tests/playwright/run-final-validation.sh
```

### Run with Browser UI
```bash
./tests/playwright/run-final-validation.sh --headed
```

### Debug Mode
```bash
./tests/playwright/run-final-validation.sh --debug
```

---

## 📋 Test Coverage

| Test | Issue | What It Tests | Pass Criteria |
|------|-------|---------------|---------------|
| **ISSUE-1** | WebSocket | Connection stability >30s | Max 1 disconnect |
| **ISSUE-2** | Avatar | Display name "D" not "A" | Correct initial shown |
| **ISSUE-3** | Counter | Real-time update 0→1 | No refresh needed |
| **ISSUE-4** | Toast | Agent response notification | Toast appears |
| **REGRESSION** | Errors | No new JS errors | Zero critical errors |
| **INTEGRATION** | E2E | All fixes together | Complete flow works |

---

## 📁 File Locations

### Test Files
```
/workspaces/agent-feed/tests/playwright/
├── final-4-issue-validation.spec.ts   # Main test suite
└── run-final-validation.sh            # Execution script
```

### Documentation
```
/workspaces/agent-feed/docs/
├── AGENT9-TEST-PLAN.md           # Full test plan (this file)
├── AGENT9-QUICK-REFERENCE.md     # Quick reference
└── AGENT9-EXECUTION-SUMMARY.md   # Results (created after run)
```

### Screenshots
```
/workspaces/agent-feed/docs/validation/screenshots/final-4-issue-validation/
├── 01-websocket-initial.png
├── 02-websocket-stable.png
├── 03-avatar-user-post.png
├── 07-counter-after-agent-response.png
├── 10-toast-appeared.png
└── 13-integration-complete.png
```

---

## ⚙️ Prerequisites

### Services Must Be Running

**Backend:**
```bash
npm run server
# Check: curl http://localhost:3001/health
```

**Frontend:**
```bash
npm run dev
# Check: curl http://localhost:5173
```

### Install Playwright (if needed)
```bash
npx playwright install
```

---

## 🧪 Test Scenarios

### 1. WebSocket Stability (35 seconds)
**Validates:** Connection doesn't disconnect rapidly
**Duration:** ~35 seconds
**Screenshot:** `02-websocket-stable.png`

### 2. Avatar Display Name
**Validates:** User posts show "D" for Dunedain
**Duration:** ~2 seconds
**Screenshot:** `03-avatar-user-post.png`

### 3. Comment Counter Real-Time
**Validates:** Counter updates without refresh
**Duration:** ~38 seconds (includes agent response)
**Screenshot:** `07-counter-after-agent-response.png`

### 4. Toast Notification
**Validates:** "Avi responded" toast appears
**Duration:** ~42 seconds (includes agent response)
**Screenshot:** `10-toast-appeared.png`

### 5. No Console Errors
**Validates:** Zero JavaScript errors during flow
**Duration:** ~15 seconds
**Screenshot:** `12-regression-complete.png`

### 6. Full Integration
**Validates:** All 4 fixes work together
**Duration:** ~55 seconds
**Screenshot:** `13-integration-complete.png`

---

## 🐛 Common Issues

### Test Fails: "Backend not running"
```bash
# Start backend
npm run server

# Verify
curl http://localhost:3001/health
```

### Test Fails: "Frontend not running"
```bash
# Start frontend
npm run dev

# Verify
curl http://localhost:5173
```

### Test Timeout: "Agent response not received"
- Agent might be slow to respond (increase timeout in spec file)
- Check agent worker logs: `tail -f logs/agent-worker.log`

### Screenshot Missing
- Check directory: `docs/validation/screenshots/final-4-issue-validation/`
- Create manually: `mkdir -p docs/validation/screenshots/final-4-issue-validation`

---

## 📊 Expected Results

### Success Output
```
╔════════════════════════════════════════════════════════════════╗
║  ✅ ALL TESTS PASSED                                           ║
╚════════════════════════════════════════════════════════════════╝

Test Coverage:
✅ ISSUE-1: WebSocket stability (>30 seconds)
✅ ISSUE-2: Avatar display name ("D" for Dunedain)
✅ ISSUE-3: Comment counter real-time updates
✅ ISSUE-4: Toast notification for agent responses
✅ REGRESSION: No console errors
✅ INTEGRATION: All fixes working together
```

### Failure Output
```
╔════════════════════════════════════════════════════════════════╗
║  ❌ SOME TESTS FAILED                                          ║
╚════════════════════════════════════════════════════════════════╝

🔍 Debugging steps:
   1. Check screenshots in docs/validation/screenshots/
   2. Review console logs in test output
   3. Run with browser UI: ./run-final-validation.sh --headed
```

---

## 🔍 Debugging Commands

### Run Single Test
```bash
npx playwright test tests/playwright/final-4-issue-validation.spec.ts \
  --grep "ISSUE-1"
```

### Run with UI Inspector
```bash
npx playwright test tests/playwright/final-4-issue-validation.spec.ts \
  --debug
```

### View HTML Report
```bash
npx playwright show-report
```

### Check WebSocket Logs
```bash
# Browser console (during test)
[PostCard] ✅ Socket.IO connected, socket.id: xxx
[PostCard] 📡 Subscribed to post room: yyy
```

---

## 📈 Performance Benchmarks

| Test | Expected Duration | Max Acceptable |
|------|-------------------|----------------|
| WebSocket Stability | 35s | 40s |
| Avatar Display | 2s | 5s |
| Comment Counter | 38s | 50s |
| Toast Notification | 42s | 50s |
| Regression | 15s | 20s |
| Integration | 55s | 70s |
| **Total Suite** | **~3 minutes** | **~4 minutes** |

---

## 🎯 Success Criteria

### All Tests Must Pass
- ✅ ISSUE-1: WebSocket stable (0-1 disconnects)
- ✅ ISSUE-2: Avatar shows "D"
- ✅ ISSUE-3: Counter updates real-time
- ✅ ISSUE-4: Toast appears
- ✅ REGRESSION: Zero errors
- ✅ INTEGRATION: E2E flow complete

### Artifacts Generated
- ✅ 13+ screenshots in validation folder
- ✅ JUnit XML report for CI/CD
- ✅ JSON test results
- ✅ Console logs captured

---

## 📝 Next Steps After Tests Pass

1. **Review Screenshots**
   ```bash
   ls -la docs/validation/screenshots/final-4-issue-validation/
   ```

2. **Create Execution Summary**
   - Document test results
   - Include pass/fail status for each test
   - Note any anomalies or warnings

3. **Share with Team**
   - Test plan: `AGENT9-TEST-PLAN.md`
   - Quick ref: `AGENT9-QUICK-REFERENCE.md`
   - Results: `AGENT9-EXECUTION-SUMMARY.md`

4. **Update Production Readiness Checklist**
   - [ ] All Playwright tests passing
   - [ ] Screenshots reviewed
   - [ ] No console errors
   - [ ] Documentation complete

---

## 🔗 Related Documents

- **Full Test Plan:** `/workspaces/agent-feed/docs/AGENT9-TEST-PLAN.md`
- **Agent 1 Refactor:** `/workspaces/agent-feed/docs/AGENT1-REFACTOR-COMPLETE.md`
- **WebSocket Fix:** `/workspaces/agent-feed/frontend/src/services/socket.ts`
- **PostCard Component:** `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`

---

## 💡 Tips

### Speed Up Tests
- Use `--headed` only for debugging
- Run parallel tests when possible
- Use `--grep` to run specific tests

### Capture More Screenshots
```typescript
// Add to test
await page.screenshot({
  path: `${SCREENSHOT_DIR}/custom-screenshot.png`,
  fullPage: true
})
```

### Monitor WebSocket Events
```typescript
// Browser console during test
(window as any)._wsMonitor.connectionLog
```

---

## ✅ Agent 9 Deliverables Checklist

- [x] Test suite created: `final-4-issue-validation.spec.ts`
- [x] Execution script: `run-final-validation.sh`
- [x] Full test plan: `AGENT9-TEST-PLAN.md`
- [x] Quick reference: `AGENT9-QUICK-REFERENCE.md`
- [ ] Execute tests (ready to run)
- [ ] Execution summary (after test run)

**Status:** Infrastructure Complete ✅
**Ready to Execute:** YES ✅

---

**End of Quick Reference**
