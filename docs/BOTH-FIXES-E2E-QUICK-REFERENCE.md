# Processing Pills & Display Name E2E - Quick Reference

## 🚀 Quick Start (30 seconds)

```bash
# 1. Ensure services are running
cd /workspaces/agent-feed/api-server && npm start &
cd /workspaces/agent-feed/frontend && npm run dev &

# 2. Run tests
./tests/playwright/run-both-fixes-validation.sh

# 3. View results
npx playwright show-report tests/playwright/reports/both-fixes
```

## 📋 Test Coverage Summary

| Fix | Test Scenarios | Screenshots | Assertions |
|-----|----------------|-------------|------------|
| **Processing Pills** | 4 scenarios | 13 | 15+ |
| **Display Names** | 2 scenarios | 5 | 8+ |
| **Total** | 6 scenarios | 18+ | 23+ |

## 🎯 Critical Validations

### ✅ Processing Pills Must Show:
- "Posting..." text visible
- Spinner animation visible
- Button disabled during processing
- Button resets after completion
- Independent per-post (no global state)

### ✅ Display Names Must Show:
- "John Connor" as author (not "user")
- Correct name in all comments
- Correct name in all replies
- Consistent across entire page

## 📸 Screenshot Map

```
Scenario 1: Top-Level Comment (5 screenshots)
├─ step1: Page loaded ✓
├─ step2: Comment form visible ✓
├─ step3: Text entered ✓
├─ step4: Processing pill visible ⚠️ CRITICAL
└─ step5: Comment posted, button reset ✓

Scenario 2: Display Names (4 screenshots)
├─ step1: Existing comments with names ✓
├─ step2: New comment with "John Connor" ⚠️ CRITICAL
└─ step3: Reply with "John Connor" ✓

Scenario 3: Multiple Posts (4 screenshots)
├─ step1: Two posts visible ✓
├─ step2: First processing, second enabled ⚠️ CRITICAL
├─ step3: Both processing independently ✓
└─ step4: Both completed ✓

Edge Cases (5+ screenshots)
├─ Rapid sequential comments ✓
└─ Reply processing pills ✓
```

## 🔍 What to Look For in Screenshots

### Processing Pill Screenshot Checklist:
```
□ "Posting..." text is visible
□ Spinner/loader icon is visible
□ Button has reduced opacity (disabled state)
□ Button position is correct (no layout shift)
□ Other post buttons remain enabled
```

### Display Name Screenshot Checklist:
```
□ "John Connor" appears as author
□ NO standalone "user" text visible
□ Name is properly positioned
□ Name appears in all comments
□ Name appears in all replies
```

## ⚡ Quick Commands

```bash
# Run specific scenario
npx playwright test --grep "Scenario 1"
npx playwright test --grep "Scenario 2"
npx playwright test --grep "Scenario 3"

# Run in headed mode (see browser)
./tests/playwright/run-both-fixes-validation.sh --headed

# Debug mode (step through)
./tests/playwright/run-both-fixes-validation.sh --debug

# UI mode (interactive)
./tests/playwright/run-both-fixes-validation.sh --ui

# Specific browser
./tests/playwright/run-both-fixes-validation.sh --browser firefox
./tests/playwright/run-both-fixes-validation.sh --browser webkit
```

## 🐛 Quick Troubleshooting

### Tests fail with timeout?
```bash
# Increase timeout in config
# Edit: playwright.config.both-fixes.ts
timeout: 120000, // 2 minutes
```

### Processing pill not visible?
```typescript
// Add delay to capture state
await page.waitForTimeout(500);
```

### Display name shows "user"?
```bash
# Check database
sqlite3 api-server/db/data.db "SELECT display_name FROM users WHERE id=1;"

# Should return: John Connor
```

### Services not starting?
```bash
# Kill existing processes
lsof -ti:5173 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Restart
npm run dev
```

## 📊 Expected Results

### All Tests Pass:
```
✓ Scenario 1: Top-Level Comment Processing Pill - Full Flow (8-10s)
✓ Scenario 2: Display Name Validation - John Connor vs user (10-12s)
✓ Scenario 3: Multiple Posts Independence - Parallel Processing (15-18s)
✓ Edge Case: Rapid Sequential Comments (8-10s)
✓ Edge Case: Reply Processing Pills (10-12s)
✓ Display Name Consistency Tests (5s)
✓ Processing Pill UI Tests (5s)

Total: 7 tests passed (51-62s)
Screenshots: 18+
```

## 🎬 Test Flow Visualization

```
User Action          →  Expected UI State       →  Assertion
─────────────────────────────────────────────────────────────
Open page            →  Posts visible           →  ✓ Posts loaded
Scroll to comment    →  Form visible            →  ✓ Form rendered
Type comment         →  Text in textarea        →  ✓ Input works
Click "Post"         →  "Posting..." + spinner  →  ✓ Processing pill
                     →  Button disabled         →  ✓ Can't double-click
Wait 2-3s            →  Comment appears         →  ✓ Comment saved
                     →  Button shows "Post"     →  ✓ Button reset
                     →  Author: "John Connor"   →  ✓ Display name
```

## 📁 File Locations

```
Tests:          tests/playwright/processing-pills-and-display-name-e2e.spec.ts
Config:         playwright.config.both-fixes.ts
Runner:         tests/playwright/run-both-fixes-validation.sh
Screenshots:    tests/playwright/screenshots/both-fixes/
Reports:        tests/playwright/reports/both-fixes/
Documentation:  tests/playwright/README-BOTH-FIXES-E2E.md
```

## 🔗 Related Documentation

- Full README: `tests/playwright/README-BOTH-FIXES-E2E.md`
- Fix #1 Spec: `docs/FIX-1-PROCESSING-PILLS-DELIVERY.md`
- Fix #2 Spec: `docs/FIX2-COMMENT-ROUTING-DELIVERY.md`
- Implementation: `frontend/src/components/CommentThread.tsx`

## 💡 Pro Tips

1. **Run headed mode first** to see what's happening
2. **Check screenshots** if tests fail - they show exact state
3. **Use --debug** to step through failing tests
4. **Check browser console** for JavaScript errors
5. **Verify services are running** before tests
6. **Clean database between runs** if state issues occur

## 📞 Support

If tests fail:
1. Check screenshots in `tests/playwright/screenshots/both-fixes/`
2. Review HTML report: `npx playwright show-report tests/playwright/reports/both-fixes`
3. Check backend logs: `api-server/logs/backend.log`
4. Verify services: `curl http://localhost:5173` and `curl http://localhost:3001/health`

---

**Last Updated**: 2025-11-19
**Test Version**: 1.0.0
**Playwright Version**: Latest
