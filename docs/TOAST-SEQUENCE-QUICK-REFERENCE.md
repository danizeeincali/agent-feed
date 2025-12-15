# Toast Notification Sequence - Quick Reference

**Test File:** `/workspaces/agent-feed/tests/playwright/toast-notification-sequence.spec.ts`

---

## ⚡ Quick Start

```bash
# 1. Start backend
npm start

# 2. Run tests
./tests/playwright/run-toast-sequence-validation.sh

# 3. View screenshots
ls -lh /workspaces/agent-feed/docs/validation/screenshots/toast-notifications/

# 4. View report
npx playwright show-report
```

---

## 🎯 Test Scenarios (6 Total)

| # | Test Name | Duration | Screenshots |
|---|-----------|----------|-------------|
| 1 | Happy Path - Complete Sequence | 90s | 8 |
| 2 | Work Queue Flow | 15s | 1 |
| 3 | AVI Mention Flow | 15s | 1 |
| 4 | Toast Timing | 20s | 1 |
| 5 | Error Handling | 15s | 1 |
| 6 | Visual Validation | 30s | 4 |

**Total:** ~4 minutes, 16 screenshots

---

## 📋 Toast Sequence

```
1. "Post created successfully!" (immediate)
   ↓ 5 sec
2. "Queued for agent processing..." (~5 sec)
   ↓ 5 sec
3. "Agent is analyzing..." (~10 sec)
   ↓ 30-60 sec
4. "Agent response posted!" (~30-60 sec)
   ↓
   Agent comment appears
```

---

## 🚀 Run Commands

```bash
# All tests (headed)
npx playwright test toast-notification-sequence.spec.ts --headed

# Single test
npx playwright test -g "Happy Path" --headed

# Debug mode
npx playwright test toast-notification-sequence.spec.ts --debug

# With config
npx playwright test --config=playwright.config.toast-sequence.cjs
```

---

## 📸 Screenshots

Location: `/workspaces/agent-feed/docs/validation/screenshots/toast-notifications/`

**Test 1 (Happy Path):**
- 01-initial-state.png
- 02-post-filled.png
- 03-toast-post-created.png
- 04-toast-queued.png
- 05-toast-analyzing.png
- 06-toast-response-posted.png
- 07-agent-comment-visible.png
- 08-final-state.png

**Test 2-6:**
- 09-work-queue-flow.png
- 10-avi-mention-flow.png
- 11-toast-timing.png
- 12-error-toast.png
- 13-toast-visual-validation.png
- 14-toast-desktop.png
- 15-toast-tablet.png
- 16-toast-mobile.png

---

## ✅ Expected Results

**All tests pass:**
- ✅ 6/6 tests passing
- ✅ 16 screenshots captured
- ✅ No console errors
- ✅ HTML report generated
- ✅ Visual proof of sequence

---

## 🐛 Troubleshooting

**Backend not running:**
```bash
npm start
curl http://localhost:3000
```

**Timeout:**
```bash
# Increase in test or use debug
npx playwright test --debug
```

**No screenshots:**
```bash
mkdir -p /workspaces/agent-feed/docs/validation/screenshots/toast-notifications/
```

---

## 📚 Files

- **Test:** `tests/playwright/toast-notification-sequence.spec.ts`
- **Run Script:** `tests/playwright/run-toast-sequence-validation.sh`
- **Config:** `playwright.config.toast-sequence.cjs`
- **Docs:** `docs/TOAST-SEQUENCE-E2E-DELIVERY.md`
- **Quick Ref:** `docs/TOAST-SEQUENCE-QUICK-REFERENCE.md`

---

**Status:** ✅ READY TO RUN
