# Quick Start: Page Rendering E2E Tests

## 🚀 Fast Track (3 Commands)

```bash
# 1. Navigate to test directory
cd /workspaces/agent-feed/tests/e2e

# 2. Validate setup
./validate-test-setup.sh

# 3. Run tests
./run-page-rendering-tests.sh
```

## ⚡ Prerequisites

### Start Services (in separate terminals)

**Terminal 1 - API Server:**
```bash
cd /workspaces/agent-feed/api-server
npm install
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd /workspaces/agent-feed/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## 📋 Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:rendering` | Run all tests (headless) |
| `npm run test:rendering:headed` | Run with visible browser |
| `npm run test:rendering:debug` | Run with debugger |
| `npx playwright test page-rendering-fix.spec.ts --ui` | Run with UI mode |
| `npm run test:report` | View HTML report |

## ✅ What Gets Tested

1. ✅ Page loads and renders (not JSON)
2. ✅ Data bindings work (`{{variable}}` → actual values)
3. ✅ No console errors
4. ✅ Mobile responsive (375px, 768px, 1920px)
5. ✅ Component validation
6. ✅ Accessibility (WCAG AA)
7. ✅ Performance metrics
8. ✅ End-to-end user journey

## 📸 Screenshot Locations

All screenshots saved to:
```
/workspaces/agent-feed/tests/e2e/screenshots/page-rendering-fix/
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests fail with "Page not found" | Start API and frontend servers |
| "Cannot find module" error | Run `npm install` in `/tests/e2e/` |
| Browsers not installed | Run `npx playwright install` |
| Data bindings not resolving | Check API endpoint: `curl http://localhost:3001/api/agents/personal-todos-agent/data` |

## 📊 Success Criteria

All tests pass = All these are true:
- Page renders components (not raw JSON)
- Data bindings resolve correctly
- Zero critical console errors
- Mobile layouts work
- All components present
- Accessibility issues < 5
- Page loads < 5 seconds
- User journey completes

## 📚 Documentation

- **Comprehensive Guide:** `PAGE_RENDERING_TEST_GUIDE.md`
- **Full Summary:** `PAGE_RENDERING_TEST_SUMMARY.md`
- **Test File:** `page-rendering-fix.spec.ts`

## 🎯 Quick Test Run

```bash
# One-liner to run everything
cd /workspaces/agent-feed/tests/e2e && \
  ./validate-test-setup.sh && \
  ./run-page-rendering-tests.sh
```

## 🎬 Watch Tests Run

```bash
# See the browser in action
./run-page-rendering-tests.sh headed
```

## 📈 View Results

```bash
# After tests complete
npm run test:report

# Or manually check:
ls -la screenshots/page-rendering-fix/
cat results/test-results.json
```

---

**Need Help?** See `PAGE_RENDERING_TEST_GUIDE.md` for detailed documentation.
