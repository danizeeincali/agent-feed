# Advanced Components E2E Tests - Quick Start Guide

## 🚀 Run Tests in 3 Steps

### Step 1: Start Servers

```bash
# Terminal 1 - Backend
cd /workspaces/agent-feed/backend
npm run dev

# Terminal 2 - Frontend
cd /workspaces/agent-feed/frontend
npm run dev
```

### Step 2: Run Tests

```bash
cd /workspaces/agent-feed/frontend

# Option A: Using test runner script (recommended)
./tests/e2e/run-advanced-components-tests.sh

# Option B: Direct Playwright command
npx playwright test tests/e2e/advanced-components-validation.spec.ts --reporter=list
```

### Step 3: View Results

```bash
# View screenshots
ls -lh tests/e2e/screenshots/

# Open HTML report (if generated)
npx playwright show-report
```

---

## 📋 Common Commands

### Run All Tests
```bash
./tests/e2e/run-advanced-components-tests.sh
```

### Run with Visual UI
```bash
./tests/e2e/run-advanced-components-tests.sh --ui
```

### Run Specific Component
```bash
./tests/e2e/run-advanced-components-tests.sh --component Checklist
./tests/e2e/run-advanced-components-tests.sh --component Calendar
./tests/e2e/run-advanced-components-tests.sh --component PhotoGrid
./tests/e2e/run-advanced-components-tests.sh --component Markdown
./tests/e2e/run-advanced-components-tests.sh --component Sidebar
./tests/e2e/run-advanced-components-tests.sh --component SwipeCard
./tests/e2e/run-advanced-components-tests.sh --component GanttChart
```

### Debug Mode
```bash
./tests/e2e/run-advanced-components-tests.sh --debug
```

### Watch Browser Execute
```bash
./tests/e2e/run-advanced-components-tests.sh --headed
```

---

## 🎯 What's Being Tested

| Component | Tests | Screenshots |
|-----------|-------|-------------|
| Checklist | 3 | 2 |
| Calendar | 3 | 3 |
| PhotoGrid | 3 | 3 |
| Markdown | 2 | 2 |
| Sidebar | 3 | 3 |
| SwipeCard | 3 | 3 |
| GanttChart | 4 | 4 |
| Integration | 1 | 1 |
| **TOTAL** | **22** | **23** |

---

## ✅ Pre-flight Checklist

Before running tests:
- [ ] Backend running on http://localhost:3001
- [ ] Frontend running on http://localhost:5173
- [ ] Internet connection available
- [ ] Playwright installed: `npx playwright install`

---

## 📸 Screenshot Locations

All screenshots saved to:
```
/workspaces/agent-feed/frontend/tests/e2e/screenshots/
```

View screenshots:
```bash
cd tests/e2e/screenshots
ls -lh *.png
```

---

## 🐛 Troubleshooting

### Tests won't start?
```bash
# Check if servers are running
curl http://localhost:3001/api/health
curl http://localhost:5173
```

### "Page not found" errors?
- Ensure backend API is running
- Check agent pages API endpoints work

### No screenshots generated?
- Tests may have failed before screenshot capture
- Check test output for errors

---

## 📚 Documentation

- **Full Guide**: `RUN_ADVANCED_COMPONENTS_TESTS.md`
- **Test Summary**: `ADVANCED_COMPONENTS_TEST_SUMMARY.md`
- **Validation Report**: `VALIDATION_REPORT.md`

---

## 🎓 Test Examples

### Checklist
- ✅ Renders all checkbox items
- ✅ Toggles on click
- ✅ Keyboard navigation

### Calendar
- ✅ Single/multiple/range modes
- ✅ Event markers displayed

### PhotoGrid
- ✅ Grid layouts (3-col, 4-col)
- ✅ Lightbox opens on click

### Markdown
- ✅ Renders all elements
- ✅ XSS protection works

### Sidebar
- ✅ Navigation items
- ✅ Nested item expand/collapse
- ✅ Mobile responsive

### SwipeCard
- ✅ Card stack renders
- ✅ Swipe buttons work
- ✅ Touch gestures

### GanttChart
- ✅ Timeline views (week/month)
- ✅ Task dependencies
- ✅ Progress indicators

---

## 🔧 Quick Fixes

### Clear test data
```bash
# Delete test agent pages
curl -X DELETE http://localhost:3001/api/agent-pages/agents/test-agent-advanced-components
```

### Reinstall Playwright
```bash
npx playwright install --force
```

### Reset everything
```bash
# Stop servers
pkill -f "npm run dev"

# Restart
cd /workspaces/agent-feed/backend && npm run dev &
cd /workspaces/agent-feed/frontend && npm run dev &

# Wait and run tests
sleep 5
./tests/e2e/run-advanced-components-tests.sh
```

---

## 📊 Expected Output

```
========================================
Advanced Components E2E Test Suite
========================================

Checking if servers are running...
✓ Backend server is running on http://localhost:3001
✓ Frontend server is running on http://localhost:5173

Running E2E tests for all 7 advanced components...

Running 22 tests using 1 worker

  ✓ Checklist Component › should render checklist with all items
  ✓ Checklist Component › should toggle checkbox items
  ✓ Checklist Component › should handle keyboard navigation
  ✓ Calendar Component › should render calendar in single mode
  ... (18 more tests)

  22 passed (2m 30s)

========================================
✓ All tests passed successfully!
========================================

Screenshots saved to:
  /workspaces/agent-feed/frontend/tests/e2e/screenshots/
```

---

## 🎉 Success Criteria

- ✅ 22 tests passing
- ✅ 23 screenshots generated
- ✅ Zero console errors
- ✅ All components render
- ✅ All interactions work

---

## 💡 Pro Tips

1. **Run in UI mode first** - Visual debugging is easier
2. **Test one component at a time** - Faster iteration
3. **Check screenshots** - Visual validation catches bugs
4. **Use --headed mode** - Watch tests execute live
5. **Read error messages carefully** - Playwright errors are descriptive

---

## 🆘 Need Help?

1. Check full documentation: `RUN_ADVANCED_COMPONENTS_TESTS.md`
2. Review test code: `advanced-components-validation.spec.ts`
3. Check validation report: `VALIDATION_REPORT.md`
4. Run with `--debug` flag for step-by-step execution

---

**Ready to test? Run this command:**

```bash
./tests/e2e/run-advanced-components-tests.sh
```

Good luck! 🚀
