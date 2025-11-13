# Quick Reference: UI Testing

**Last Updated:** November 9, 2025

---

## 🚀 Quick Start

### Run Automated Tests
```bash
cd /workspaces/agent-feed/tests/manual-validation
npx playwright test --config=playwright.config.js
```

### View Screenshots
```bash
ls -lh ../../docs/validation/screenshots/
```

### View Test Report
```bash
cat ../../docs/validation/playwright-ui-validation-report.md
```

---

## 📊 Current Status

| Item | Status | Progress |
|------|--------|----------|
| Test Infrastructure | ✅ Complete | 100% |
| Automated Tests | ✅ Passing | 2/2 |
| Screenshots | ⚠️ Partial | 4/18 (22%) |
| Documentation | ✅ Complete | 100% |

---

## 📸 Screenshots Captured

✅ `06-billing-dashboard.png` (46KB)
✅ `13-desktop-1920x1080.png` (118KB)
✅ `14-tablet-768x1024.png` (89KB)
✅ `15-mobile-375x667.png` (53KB)

**Missing:** 14 screenshots (settings, dark mode, forms)

---

## 📁 Key Files

### Test Files
- `/tests/manual-validation/playwright-auth-ui.spec.js` (376 lines)
- `/tests/manual-validation/playwright-auth-ui-simple.spec.js` (171 lines)
- `/tests/manual-validation/playwright.config.js` (58 lines)

### Documentation
- `/docs/validation/playwright-ui-validation-report.md` (364 lines)
- `/docs/validation/manual-ui-testing-guide.md` (479 lines)
- `/docs/validation/playwright-ui-test-execution-summary.md` (current)

### Screenshots
- `/docs/validation/screenshots/*.png`

---

## 🔧 Common Commands

### Test Execution
```bash
# Run all tests
npx playwright test tests/manual-validation/

# Run specific test
npx playwright test tests/manual-validation/playwright-auth-ui-simple.spec.js

# Run with UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed
```

### Screenshot Management
```bash
# List all screenshots
ls -lh docs/validation/screenshots/

# View specific screenshot
open docs/validation/screenshots/06-billing-dashboard.png

# Count screenshots
ls docs/validation/screenshots/*.png | wc -l
```

### Server Management
```bash
# Start dev server
npm run dev

# Check if running
lsof -i :5173

# Kill server
pkill -f "vite"
```

---

## ⚠️ Known Issues

### Issue 1: Server Timeout
**Symptom:** Tests timeout when navigating to /settings or /billing
**Cause:** React app initialization takes >15s
**Solution:** Increase timeout to 30s or optimize React initialization

### Issue 2: Server Crashes
**Symptom:** ERR_CONNECTION_REFUSED after first test
**Cause:** Vite dev server resource exhaustion
**Solution:** Use Playwright's webServer config

---

## 🎯 Next Steps

1. **Optimize Server:** Fix initialization timeout
2. **Capture Screenshots:** Get remaining 14 screenshots
3. **Test Accessibility:** Complete keyboard/ARIA tests
4. **Test Dark Mode:** Validate theme switching
5. **Test Forms:** Validate input/validation flows

---

## 📞 Quick Support

### Check Test Status
```bash
cd /workspaces/agent-feed
npx playwright test tests/manual-validation/ --reporter=list
```

### View Traces
```bash
npx playwright show-trace docs/validation/test-artifacts/**/trace.zip
```

### Check Hooks
```bash
npx claude-flow@alpha hooks --help
```

---

## ✅ Success Criteria

- [ ] 18 screenshots captured
- [ ] All tests passing
- [ ] No console errors
- [ ] Accessibility validated
- [ ] Dark mode tested
- [ ] Forms validated
- [ ] Responsive design confirmed

**Current:** 4/7 criteria met (57%)

---

## 📚 Related Docs

- Full Report: `playwright-ui-validation-report.md`
- Manual Guide: `manual-ui-testing-guide.md`
- Execution Summary: `playwright-ui-test-execution-summary.md`

---

**Quick Reference Version:** 1.0
**Agent:** UI/UX Testing Specialist
