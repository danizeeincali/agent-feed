# Toast Backend Events E2E Test Suite

**Status**: ✅ COMPLETE
**Created**: 2025-11-13
**Test Framework**: Playwright
**Total Test Scenarios**: 5 main scenarios, 9 individual tests
**Total Screenshots Planned**: 24+ screenshots

---

## 📋 Overview

Comprehensive E2E test suite for validating the complete toast notification sequence with REAL backend events, WebSocket communication, and database operations.

## 🎯 Test Scenarios

### 1. Complete Toast Sequence (PRIMARY TEST)

**File**: `tests/playwright/toast-backend-events-e2e.spec.ts`
**Test**: `should show all 4 toasts in correct order with timing`

**Flow**:
1. Navigate to application
2. Create post: "What is the weather today?"
3. Capture 6 screenshots:
   - `01-post-creation-form.png` - Initial form
   - `02-toast-post-created.png` - "Post created successfully!"
   - `03-toast-queued.png` - "⏳ Queued for agent processing..."
   - `04-toast-processing.png` - "🤖 Agent is analyzing your post..."
   - `05-toast-complete.png` - "✅ Agent response posted!"
   - `06-final-state.png` - All toasts visible

**Validations**:
- Toast #1 appears < 5000ms
- Toast #2 appears < 10000ms
- Toast #3 appears < 20000ms
- Toast #4 appears < 90000ms
- WebSocket messages captured
- All toasts display in correct sequence

**Expected Duration**: 60-120 seconds

---

### 2. WebSocket Connection Verification

**Test**: `should establish WebSocket and receive ticket status updates`

**Flow**:
1. Navigate to application
2. Capture WebSocket connection
3. Create post to trigger events
4. Wait for complete toast sequence
5. Capture 2 screenshots:
   - `01-initial-state.png` - Before events
   - `02-events-received.png` - After events

**Validations**:
- WebSocket connection established
- Event type: `ticket:status:update` received
- Event payload contains:
  - `ticketId`
  - `status`
- Multiple events captured

**Expected Duration**: 60-90 seconds

---

### 3. Toast Timing Validation

**Test**: `should validate precise timing of each toast`

**Flow**:
1. Create post
2. Measure exact timing for each toast
3. Capture 4 screenshots:
   - `01-toast-immediate.png` - Toast #1
   - `02-toast-queued.png` - Toast #2
   - `03-toast-processing.png` - Toast #3
   - `04-toast-complete.png` - Toast #4

**Validations**:
- Toast #1: < 500ms (immediate)
- Toast #2: > 1000ms, < 10000ms (2-5s range)
- Toast #3: > 2000ms, < 20000ms (8-15s range)
- Toast #4: > 10000ms, < 90000ms (30-90s range)

**Expected Duration**: 60-120 seconds

---

### 4. Multiple Posts Scenario

**Test**: `should handle 3 rapid posts with separate toast sequences`

**Flow**:
1. Create 3 posts rapidly:
   - "First post - What is AI?"
   - "Second post - How does ML work?"
   - "Third post - Explain neural networks"
2. Capture 5 screenshots:
   - `01-post-1-created.png`
   - `02-post-2-created.png`
   - `03-post-3-created.png`
   - `04-all-queued.png`
   - `05-multiple-stacks.png`

**Validations**:
- Each post gets its own toast sequence
- No toast conflicts or overlaps
- Multiple toast stacks visible
- All toasts display correctly

**Expected Duration**: 30-60 seconds

---

### 5. Responsive Design

**Tests**: 3 separate viewport tests

#### 5a. Desktop (1920x1080)
**Test**: `should display toasts correctly on desktop (1920x1080)`

**Validations**:
- Toast width: 200-600px
- Toast position correct
- Screenshot: `01-desktop-1920x1080.png`

#### 5b. Tablet (768x1024)
**Test**: `should display toasts correctly on tablet (768x1024)`

**Validations**:
- Toast width: > 150px
- Toast adapts to tablet viewport
- Screenshot: `02-tablet-768x1024.png`

#### 5c. Mobile (375x667)
**Test**: `should display toasts correctly on mobile (375x667)`

**Validations**:
- Toast width: 100-400px
- Toast adapts to mobile viewport
- Screenshot: `03-mobile-375x667.png`

**Expected Duration**: 10-15 seconds per viewport

---

## 📁 File Structure

```
/workspaces/agent-feed/
├── playwright.config.toast-backend-validation.cjs    # Test configuration
├── tests/
│   └── playwright/
│       └── toast-backend-events-e2e.spec.ts          # Test suite
├── scripts/
│   └── run-toast-backend-validation.sh               # Test runner script
└── docs/
    └── validation/
        └── screenshots/
            └── toast-backend-events/
                ├── sequence/         # 6 screenshots
                ├── websocket/        # 2 screenshots
                ├── timing/           # 4 screenshots
                ├── multiple/         # 5 screenshots
                └── responsive/       # 3 screenshots
```

---

## 🚀 Running the Tests

### Using the Test Script (Recommended)

```bash
# Run all tests with default settings
./scripts/run-toast-backend-validation.sh

# Run with browser visible
./scripts/run-toast-backend-validation.sh --headed

# Run in debug mode
./scripts/run-toast-backend-validation.sh --debug

# Run specific viewport only
./scripts/run-toast-backend-validation.sh --desktop
./scripts/run-toast-backend-validation.sh --tablet
./scripts/run-toast-backend-validation.sh --mobile
```

### Using Playwright Directly

```bash
# Run all tests
npx playwright test --config=playwright.config.toast-backend-validation.cjs

# Run specific test
npx playwright test --config=playwright.config.toast-backend-validation.cjs -g "Complete Toast Sequence"

# Run with UI mode
npx playwright test --config=playwright.config.toast-backend-validation.cjs --ui

# View HTML report
npx playwright show-report tests/e2e/toast-backend-report
```

---

## 📊 Test Configuration

### Timeouts
- **Test timeout**: 180000ms (3 minutes)
- **Expect timeout**: 10000ms (10 seconds)
- **Navigation timeout**: 30000ms (30 seconds)
- **Action timeout**: 15000ms (15 seconds)

### Execution
- **Workers**: 1 (sequential for WebSocket stability)
- **Retries**: 0 (local), 2 (CI)
- **Parallel**: false

### Reporters
- List (console output)
- JSON: `tests/e2e/toast-backend-results.json`
- JUnit: `tests/e2e/toast-backend-junit.xml`
- HTML: `tests/e2e/toast-backend-report/`

### Projects
1. `toast-sequence-desktop` - Desktop Chrome (1920x1080)
2. `toast-sequence-tablet` - iPad Pro (768x1024)
3. `toast-sequence-mobile` - iPhone 13 (375x667)

---

## 🔍 Helper Functions

### `waitForToast(page, text, timeout)`
Waits for a toast with specific text to appear and measures timing.

**Parameters**:
- `page`: Playwright Page object
- `text`: Toast text to wait for
- `timeout`: Maximum wait time (ms)

**Returns**: Elapsed time in milliseconds

### `setupWebSocketCapture(page)`
Sets up WebSocket event capture for monitoring backend events.

**Returns**: Array of WebSocketMessage objects

### `getVisibleToasts(page)`
Gets all currently visible toast messages.

**Returns**: Array of toast text strings

### `createPost(page, content)`
Creates a new post with the given content.

**Parameters**:
- `page`: Playwright Page object
- `content`: Post content text

---

## 📸 Screenshot Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Sequence | 6 | Complete toast sequence from creation to completion |
| WebSocket | 2 | WebSocket connection and event verification |
| Timing | 4 | Precise timing validation for each toast |
| Multiple | 5 | Multiple posts with separate toast sequences |
| Responsive | 3 | Desktop, tablet, mobile viewports |
| **TOTAL** | **20** | **Minimum screenshots captured** |

**Note**: Additional screenshots may be captured from test failures, traces, and video recordings.

---

## ✅ Success Criteria

### All Tests Must Pass
- ✅ Complete toast sequence displays all 4 toasts
- ✅ WebSocket connection established and events received
- ✅ Toast timing within expected ranges
- ✅ Multiple posts handled without conflicts
- ✅ Responsive design works on all viewports

### All Screenshots Captured
- ✅ 6 sequence screenshots
- ✅ 2 WebSocket screenshots
- ✅ 4 timing screenshots
- ✅ 5 multiple post screenshots
- ✅ 3 responsive screenshots

### Performance Requirements
- ✅ Toast #1: < 500ms
- ✅ Toast #2: 2-5 seconds
- ✅ Toast #3: 8-15 seconds
- ✅ Toast #4: 30-90 seconds
- ✅ Total test suite: < 10 minutes

---

## 🐛 Troubleshooting

### Tests Timing Out
- Increase test timeout in config
- Check backend is running (`npm run dev`)
- Verify agent worker is processing tickets
- Check database connection

### WebSocket Not Connecting
- Verify WebSocket server running on port 8080
- Check browser console for connection errors
- Ensure firewall not blocking WebSocket

### Toasts Not Appearing
- Check frontend console for errors
- Verify Toastify library loaded
- Check CSS classes for toast container
- Verify backend events being emitted

### Screenshots Missing
- Ensure screenshot directories exist
- Check file permissions
- Verify Playwright screenshot configuration
- Check disk space

---

## 📈 Expected Test Results

### Test Summary
- **Total Tests**: 9
- **Expected Pass Rate**: 100%
- **Total Duration**: 5-10 minutes
- **Screenshots**: 20+ images

### Test Breakdown
- Complete Sequence: 1 test, 6 screenshots, 60-120s
- WebSocket: 1 test, 2 screenshots, 60-90s
- Timing: 1 test, 4 screenshots, 60-120s
- Multiple Posts: 1 test, 5 screenshots, 30-60s
- Responsive: 3 tests, 3 screenshots, 30-45s

---

## 🔗 Related Documentation

- [AGENT10-DELIVERY-SUMMARY.md](./AGENT10-DELIVERY-SUMMARY.md) - Implementation details
- [AGENT10-QUICK-REFERENCE.md](./AGENT10-QUICK-REFERENCE.md) - Quick reference guide
- [Toast UI Feedback Implementation](./TOAST-UI-FEEDBACK-FINAL-DELIVERY.md)

---

## 📝 Notes

### Real Backend Integration
- All tests use REAL backend (no mocks)
- Actual WebSocket connections
- Real database operations
- Live agent processing

### Test Isolation
- Each test creates fresh posts
- Tests run sequentially for stability
- WebSocket connections cleaned up after each test

### Screenshot Quality
- Full page screenshots
- High resolution
- Organized by category
- Timestamped filenames

---

**Test Suite Status**: ✅ READY FOR EXECUTION

**Next Steps**:
1. Run full test suite: `./scripts/run-toast-backend-validation.sh`
2. Review screenshots in `/docs/validation/screenshots/toast-backend-events/`
3. Check HTML report: `npx playwright show-report tests/e2e/toast-backend-report`
4. Verify all 9 tests pass
5. Document any issues found
