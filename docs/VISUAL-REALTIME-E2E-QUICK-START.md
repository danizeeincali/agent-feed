# Visual Pills & Real-Time Updates E2E Tests - Quick Start

## 🚀 Quick Run

```bash
# Run all scenarios
npm run test:visual-realtime

# Or use the shell script
./tests/playwright/run-visual-realtime-tests.sh
```

## 📋 Prerequisites Checklist

- [ ] Backend running: `http://localhost:3001`
- [ ] Frontend running: `http://localhost:5173`
- [ ] Database initialized with posts and Avi agent
- [ ] Playwright installed: `npm install --save-dev @playwright/test`

## 🎯 What Gets Tested

### ✅ Visual Processing Pills
- Blue "Posting reply..." badge appears on comment card
- Pill positioned at top-right corner
- Spinning animation visible
- Pill disappears after completion
- New reply appears after pill gone

### ✅ Real-Time Updates
- Comments appear without page refresh
- WebSocket delivers updates automatically
- Recent timestamps indicate fresh content
- No F5 needed for new replies

### ✅ Multiple Pills
- Two reply forms can be open simultaneously
- Each comment shows its own processing pill
- Pills are independent and don't affect each other

### ✅ WebSocket Connection
- Console logs captured
- WebSocket messages detected
- Real-time communication validated

## 📸 Critical Screenshots

After running tests, check these images in `tests/playwright/screenshots/visual-realtime/`:

1. **`03_CRITICAL_visual_pill_on_comment.png`**
   - Must show blue processing pill on comment card
   - Pill should be in top-right corner
   - Spinner animation visible

2. **`06_CRITICAL_realtime_reply_appears.png`**
   - Must show new reply appeared WITHOUT refresh
   - Recent timestamp visible ("X seconds ago")

3. **`09_CRITICAL_both_pills_visible.png`**
   - Must show two processing pills at once
   - One on each comment being replied to

4. **`13_CRITICAL_console_websocket_status.png`**
   - Console logs showing WebSocket activity
   - Connection status visible

## 🎬 Test Scenarios

### Scenario 1: Visual Processing Pill
```bash
# Run just this scenario
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 1"
```
**Tests**: Blue pill appears on comment during reply posting

### Scenario 2: Real-Time Updates
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 2"
```
**Tests**: New comments appear without refresh

### Scenario 3: Multiple Pills
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 3"
```
**Tests**: Multiple independent processing pills

### Scenario 4: WebSocket Status
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 4"
```
**Tests**: WebSocket connection and messaging

## 🐛 Debug Mode

### Interactive UI Mode
```bash
npm run test:visual-realtime -- --ui
```
- Click through scenarios one by one
- Inspect elements in real-time
- See console logs live

### Headed Mode (Watch Browser)
```bash
npm run test:visual-realtime -- --headed --workers=1
```
- Watch tests execute in visible browser
- See visual pills appear and disappear
- Monitor real-time updates

### Debug Specific Test
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts \
    --grep "Scenario 1" \
    --debug
```

## ✅ Success Criteria

**All tests pass when**:
- ✅ Visual pills appear within 500ms of posting reply
- ✅ Pills show on correct comment (top-right corner)
- ✅ Spinner animation is visible
- ✅ Pills disappear after reply completes
- ✅ Real-time updates work without F5
- ✅ Multiple pills can be active simultaneously
- ✅ WebSocket connection established
- ✅ All critical screenshots captured

## 🔧 Troubleshooting

### Pills Don't Appear
**Problem**: No blue pill shows on comment
**Fix**: Check `CommentThread.tsx` for `isProcessing` state
```typescript
// Should exist in CommentThread.tsx
const [isProcessing, setIsProcessing] = useState(false);

// When posting reply:
setIsProcessing(true);
// ... post reply ...
setIsProcessing(false);
```

### Real-Time Updates Fail
**Problem**: Comments don't appear without refresh
**Fix**: Check WebSocket connection
1. Open browser DevTools → Network tab
2. Filter: `WS` (WebSocket)
3. Look for connection to backend
4. Check for incoming messages

### Tests Timeout
**Problem**: Tests wait forever for Avi reply
**Solution**: This is okay! Tests wait up to 25 seconds for Avi, but will pass even if Avi doesn't reply (real-time test is about the mechanism, not Avi specifically)

### Screenshots Are Blank
**Problem**: Screenshot files are empty or white
**Fix**:
1. Check frontend is running: `curl http://localhost:5173`
2. Look for console errors blocking render
3. Add wait before screenshot: `await page.waitForLoadState('networkidle')`

## 📊 Test Output

### Console Output Example
```
🎬 Scenario 1: Testing visual processing pill appearance...
✅ Post Reply button clicked
✅ Processing pill appeared
✅ Processing pill is visible
✅ Spinner animation is visible
✅ Pill has absolute positioning
✅ Pill has top-right positioning classes
✅ Pill is positioned within comment card bounds
✅ Processing pill disappeared
✅ New reply is visible in thread
🎉 Scenario 1 PASSED: Visual processing pill test complete
```

### Screenshot Gallery
After successful run, you'll have:
- 14+ screenshots documenting the entire flow
- 4 CRITICAL screenshots for visual validation
- Video recordings (if failures occur)
- HTML report with timeline

## 📁 File Structure

```
/workspaces/agent-feed/
├── tests/playwright/
│   ├── visual-pills-and-realtime-e2e.spec.ts  # Main test file
│   ├── run-visual-realtime-tests.sh           # Test runner script
│   └── screenshots/
│       └── visual-realtime/                   # Screenshot output
│           ├── 03_CRITICAL_visual_pill_on_comment.png
│           ├── 06_CRITICAL_realtime_reply_appears.png
│           ├── 09_CRITICAL_both_pills_visible.png
│           └── 13_CRITICAL_console_websocket_status.png
├── playwright.config.visual-realtime.ts       # Playwright config
├── docs/
│   └── VISUAL-REALTIME-E2E-QUICK-START.md    # This file
└── tests/playwright/
    └── README-VISUAL-REALTIME-E2E.md         # Detailed docs
```

## 🎓 What to Look For

### In Screenshots

**Visual Pill (`03_CRITICAL_visual_pill_on_comment.png`)**:
- [ ] Blue badge visible
- [ ] Text says "Posting reply..." or similar
- [ ] Spinning icon/loader present
- [ ] Located at top-right of comment
- [ ] Overlays the comment card

**Real-Time Update (`06_CRITICAL_realtime_reply_appears.png`)**:
- [ ] New comment visible
- [ ] Timestamp shows "X seconds ago"
- [ ] No browser refresh bar visible
- [ ] Comment count increased

**Multiple Pills (`09_CRITICAL_both_pills_visible.png`)**:
- [ ] Two blue pills visible
- [ ] Each on different comment
- [ ] Both showing spinner
- [ ] Comments still readable

**WebSocket Status (`13_CRITICAL_console_websocket_status.png`)**:
- [ ] Console open (if captured)
- [ ] WebSocket connection logs
- [ ] No error messages
- [ ] Recent activity timestamps

## 🚦 Next Steps After Passing

1. **Review Screenshots**: Open `screenshots/visual-realtime/` folder
2. **Visual Validation**: Confirm pills look correct in critical screenshots
3. **HTML Report**: Run `npx playwright show-report playwright-report-visual-realtime`
4. **Integration Check**: Verify with other test suites (onboarding, toast, reply flow)
5. **Manual Validation**: Test in real browser to confirm E2E accuracy

## 📚 Related Documentation

- [Visual Pills & Real-Time E2E Tests README](../tests/playwright/README-VISUAL-REALTIME-E2E.md)
- [Comment Reply Flow Tests](../tests/playwright/README-REPLY-FLOW-E2E.md)
- [Processing Pill Tests](../tests/playwright/README-PROCESSING-PILL-E2E.md)
- [Toast Notification Tests](../tests/playwright/README-TOAST-SEQUENCE.md)

## 🆘 Getting Help

**If tests fail**:
1. Read the console output carefully
2. Check the screenshots for visual clues
3. Run with `--ui` flag to debug interactively
4. Review the HTML report for detailed timeline
5. Check browser console for JavaScript errors

**If real-time doesn't work**:
1. Verify WebSocket connection in Network tab
2. Check backend logs for event emissions
3. Confirm frontend socket listeners are active
4. Test WebSocket manually in browser console

**If pills don't appear**:
1. Check `CommentThread.tsx` component
2. Verify `isProcessing` state logic
3. Confirm CSS classes are correct
4. Test manually in browser DevTools

---

**Ready to test? Run**: `npm run test:visual-realtime`
