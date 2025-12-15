# Processing Pills & Display Name E2E Tests - QUICK START

## ⚡ Run Tests in 3 Commands

```bash
# 1. Ensure services are running
npm run dev

# 2. Run tests (in new terminal)
npm run test:both-fixes

# 3. View results
npm run test:both-fixes:report
```

## 📊 What Gets Tested

### Fix #1: Processing Pills ✓
- "Posting..." button with spinner during submission
- Button disabled while processing
- Button resets after completion
- Independent per-post (no global interference)

### Fix #2: Display Names ✓
- "John Connor" appears as author (not "user")
- Correct in all comments
- Correct in all replies
- Consistent across entire page

## 🎬 Test Execution Options

```bash
# Default (headless)
npm run test:both-fixes

# Watch browser (headed mode)
npm run test:both-fixes:headed

# Step through tests (debug mode)
npm run test:both-fixes:debug

# Interactive UI
npm run test:both-fixes:ui

# Specific browser
npm run test:both-fixes:chromium
npm run test:both-fixes:firefox
npm run test:both-fixes:webkit

# View last report
npm run test:both-fixes:report
```

## 📸 Where to Find Screenshots

```
tests/playwright/screenshots/both-fixes/
├── scenario1-step4-processing-pill-visible.png  ← CRITICAL
├── scenario2-step2-new-comment-with-john-connor.png  ← CRITICAL
└── scenario3-step2-first-processing-second-enabled.png  ← CRITICAL
```

## ✅ Success Criteria

All tests pass if you see:
```
✓ Scenario 1: Top-Level Comment Processing Pill - Full Flow (8-10s)
✓ Scenario 2: Display Name Validation - John Connor vs user (10-12s)
✓ Scenario 3: Multiple Posts Independence - Parallel Processing (15-18s)
✓ Edge Case: Rapid Sequential Comments (8-10s)
✓ Edge Case: Reply Processing Pills (10-12s)
✓ Display Name Consistency Tests (5s)
✓ Processing Pill UI Tests (5s)

Total: 7 tests passed (51-62s)
```

## 🐛 Quick Troubleshooting

### Tests fail immediately
```bash
# Check services are running
curl http://localhost:5173  # Frontend
curl http://localhost:3001/health  # Backend
```

### Processing pill not visible
- This might be a real bug! Check the screenshots to see what actually appeared.
- Screenshot location: `tests/playwright/screenshots/both-fixes/scenario1-step4-processing-pill-visible.png`

### Display name shows "user"
```bash
# Check database
sqlite3 api-server/db/data.db "SELECT display_name FROM users WHERE id=1;"
# Should return: John Connor
```

### Need more details
- Full README: `tests/playwright/README-BOTH-FIXES-E2E.md`
- Quick Reference: `docs/BOTH-FIXES-E2E-QUICK-REFERENCE.md`
- Complete Index: `docs/BOTH-FIXES-E2E-INDEX.md`

## 📁 Test File Locations

```
Main test file:    tests/playwright/processing-pills-and-display-name-e2e.spec.ts
Test runner:       tests/playwright/run-both-fixes-validation.sh
Config:            playwright.config.both-fixes.ts
Screenshots:       tests/playwright/screenshots/both-fixes/
Reports:           tests/playwright/reports/both-fixes/
```

## 🎯 What Each Screenshot Shows

1. **Page loaded** - Initial state with posts
2. **Comment form visible** - Form scrolled into view
3. **Text entered** - User typed comment
4. **Processing pill visible** ⚠️ - Button shows "Posting..." + spinner (CRITICAL)
5. **Button reset** - Comment posted, button back to normal
6. **Existing comments** - Author names in current comments
7. **New comment with John Connor** ⚠️ - Correct display name (CRITICAL)
8. **Reply with John Connor** - Reply has correct author
9. **Two posts visible** - Multiple posts ready to test
10. **First processing, second enabled** ⚠️ - Independence test (CRITICAL)
11. **Both processing** - Both posts processing independently
12. **Both completed** - Both comments posted successfully

## 💡 Pro Tips

1. Run in **headed mode** first to see what's happening
2. Check **screenshots** if tests fail - they show the exact state
3. Use **--debug** to step through failing tests
4. Open **HTML report** for detailed results with screenshots
5. Tests use **real backend** - no mocks!

## 📞 Need Help?

1. Check screenshots: `tests/playwright/screenshots/both-fixes/`
2. View HTML report: `npm run test:both-fixes:report`
3. Check backend logs: `api-server/logs/backend.log`
4. Read full docs: `tests/playwright/README-BOTH-FIXES-E2E.md`

---

**Ready to test?** Run: `npm run test:both-fixes`
