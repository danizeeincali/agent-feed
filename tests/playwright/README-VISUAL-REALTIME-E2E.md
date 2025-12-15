# Visual Pills & Real-Time Updates E2E Test Suite

## Overview

This test suite validates the **critical visual UX features** that users interact with:
1. **Visual processing pills** appearing on comment cards during reply posting
2. **Real-time updates** working without browser refresh (WebSocket)
3. **Multiple independent pills** for concurrent operations
4. **WebSocket connection** status and message handling

## Test Files

- **Main Test**: `/workspaces/agent-feed/tests/playwright/visual-pills-and-realtime-e2e.spec.ts`
- **Screenshots**: `/workspaces/agent-feed/tests/playwright/screenshots/visual-realtime/`

## Critical Scenarios

### ✅ Scenario 1: Visual Processing Pill Appears
**What it tests**: The blue "Posting reply..." badge appears on the comment card (top-right corner)

**Critical validations**:
- Pill is visible immediately after clicking "Post Reply"
- Pill contains spinning animation icon
- Pill is positioned with `absolute`, `top-2`, `right-2` classes
- Pill is within comment card boundaries
- Pill disappears after reply is posted
- New reply appears after pill disappears

**Screenshots**:
- `01_initial_post_state.png` - Starting state
- `02_reply_form_open.png` - Reply form visible
- `03_CRITICAL_visual_pill_on_comment.png` - **THE MONEY SHOT** - Blue pill on comment
- `04_pill_disappeared_reply_visible.png` - Final state

### ✅ Scenario 2: Real-Time Updates Without Refresh
**What it tests**: New comments/replies appear automatically via WebSocket (NO F5)

**Critical validations**:
- Comment count increases without page reload
- New comments appear automatically
- Recent timestamps indicate fresh content ("X seconds ago")
- No navigation/reload events detected
- Avi's replies appear in real-time

**Screenshots**:
- `05_initial_state_before_realtime.png` - Before posting
- `06_CRITICAL_realtime_reply_appears.png` - **THE MONEY SHOT** - New reply without refresh

### ✅ Scenario 3: Multiple Independent Pills
**What it tests**: Multiple comments can show processing pills simultaneously

**Critical validations**:
- Reply forms open on multiple comments
- First pill appears when first reply posted
- Second pill appears when second reply posted
- Pills are independent (don't affect each other)
- Both pills disappear after completion

**Screenshots**:
- `07_both_reply_forms_open.png` - Two forms ready
- `08_first_comment_shows_pill.png` - First pill active
- `09_CRITICAL_both_pills_visible.png` - **THE MONEY SHOT** - Both pills at once
- `10_both_pills_disappeared.png` - Both completed

### ✅ Scenario 4: WebSocket Connection Status
**What it tests**: WebSocket connection and message handling

**Critical validations**:
- Console logs captured during session
- WebSocket-related messages detected
- Posted comments appear (validates communication)
- Real-time replies received
- No connection errors

**Screenshots**:
- `11_app_loaded_websocket_check.png` - Initial load
- `12_after_websocket_activity.png` - After action
- `13_CRITICAL_console_websocket_status.png` - **THE MONEY SHOT** - Console validation

### 🎁 Bonus: Styling Verification
**What it tests**: Processing pill has correct visual styling

**Critical validations**:
- Background color (blue theme)
- Spinner animation active
- Proper positioning
- Visual appearance

**Screenshots**:
- `14_pill_styling_closeup.png` - Close-up of pill styling

## Running the Tests

### Quick Run (All Scenarios)
```bash
npm run test:visual-realtime
```

### Run Specific Scenario
```bash
# Scenario 1: Visual Pills
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 1"

# Scenario 2: Real-Time Updates
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 2"

# Scenario 3: Multiple Pills
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 3"

# Scenario 4: WebSocket Status
npx playwright test visual-pills-and-realtime-e2e.spec.ts -g "Scenario 4"
```

### Run with UI Mode (Recommended for Debugging)
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts --ui
```

### Run in Headed Mode (Watch in Browser)
```bash
npx playwright test visual-pills-and-realtime-e2e.spec.ts --headed --workers=1
```

## Prerequisites

1. **Backend running**: `http://localhost:3001`
2. **Frontend running**: `http://localhost:5173`
3. **Database initialized**: Worker and Avi configured
4. **Playwright installed**: `npm install --save-dev @playwright/test`

## Expected Behavior

### Visual Processing Pill
- **Appears**: Within 500ms of clicking "Post Reply"
- **Location**: Top-right corner of comment card
- **Color**: Blue (bg-blue-500 or similar)
- **Icon**: Spinning loader/spinner
- **Text**: "Posting reply..." or "Processing..."
- **Duration**: 2-10 seconds (until reply posted)

### Real-Time Updates
- **Trigger**: Any comment/reply posted
- **Mechanism**: WebSocket message from backend
- **Latency**: <3 seconds typically
- **Indicator**: "X seconds ago" timestamp
- **No Refresh**: Navigation count remains 1

### Multiple Pills
- **Independent**: Each comment tracks its own reply state
- **Concurrent**: Multiple pills can be active simultaneously
- **Non-blocking**: UI remains responsive during processing

## Debugging Tips

### If Pills Don't Appear
1. Check `CommentThread.tsx` for processing state logic
2. Verify `isProcessing` state updates when posting
3. Check CSS classes: `absolute`, `top-2`, `right-2`
4. Look for conditional rendering: `{isProcessing && <ProcessingPill />}`

### If Real-Time Fails
1. Check WebSocket connection in Network tab (Filter: WS)
2. Verify backend emits events: `io.emit('new-comment', ...)`
3. Check frontend listener: `socket.on('new-comment', ...)`
4. Look for CORS issues in console

### If Tests Timeout
1. Increase timeout: `{ timeout: 30000 }`
2. Check backend logs for worker processing
3. Verify Avi agent is configured
4. Ensure database has proper data

## Success Criteria

✅ **All 4 scenarios pass**
✅ **All CRITICAL screenshots captured**
✅ **Visual pills appear within 500ms**
✅ **Real-time updates work without refresh**
✅ **Multiple pills are independent**
✅ **WebSocket connection validated**

## Screenshot Gallery

After running tests, review these critical screenshots:

1. **`03_CRITICAL_visual_pill_on_comment.png`** - Must show blue pill on comment
2. **`06_CRITICAL_realtime_reply_appears.png`** - Must show new reply without refresh
3. **`09_CRITICAL_both_pills_visible.png`** - Must show two pills at once
4. **`13_CRITICAL_console_websocket_status.png`** - Must show WebSocket activity

## Troubleshooting

### Common Issues

**Issue**: Pills never appear
- **Fix**: Check `isProcessing` state in `CommentThread.tsx`
- **Fix**: Verify reply posting triggers state update

**Issue**: Real-time updates don't work
- **Fix**: Check WebSocket connection established
- **Fix**: Verify `socket.io-client` installed and connected
- **Fix**: Check backend emits events correctly

**Issue**: Tests timeout waiting for Avi
- **Fix**: Reduce wait time for Avi reply (it's optional)
- **Fix**: Check worker is processing tasks
- **Fix**: Verify Avi agent configured in database

**Issue**: Screenshots are blank
- **Fix**: Ensure frontend is running on `http://localhost:5173`
- **Fix**: Check for console errors blocking render
- **Fix**: Add `await page.waitForLoadState('networkidle')`

## Architecture Notes

### Frontend Components
- **CommentThread.tsx**: Manages reply state and processing pill display
- **RealSocialMediaFeed.tsx**: Handles WebSocket connection and real-time updates
- **ProcessingPill**: Visual component (may be inline or separate)

### Backend Systems
- **WebSocket Server**: Emits real-time events for new comments/replies
- **Worker Queue**: Processes reply tasks and triggers Avi responses
- **Orchestrator**: Routes comments to appropriate handlers

### Data Flow
1. User clicks "Post Reply" → `isProcessing = true` → Pill appears
2. Frontend sends POST → Backend creates task → Worker processes
3. Backend emits WebSocket event → Frontend receives → UI updates
4. Reply completes → `isProcessing = false` → Pill disappears

## Maintenance

- **Update timeouts** if Avi reply latency increases
- **Add new scenarios** for additional real-time features
- **Keep screenshots** in version control for visual regression testing
- **Review console logs** for WebSocket connection issues

## Related Documentation

- [Comment Reply Flow](./README-REPLY-FLOW-E2E.md)
- [Processing Pill Implementation](./README-PROCESSING-PILL-E2E.md)
- [Toast Notifications](./README-TOAST-SEQUENCE.md)
- [Onboarding Flow](./README-ONBOARDING-E2E.md)
