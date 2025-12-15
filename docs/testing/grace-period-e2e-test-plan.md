# Grace Period Timeout E2E Test Specification

## Overview

This document specifies end-to-end tests for the grace period timeout feature, which triggers at 192 seconds (80% of 240s default timeout) and presents users with intervention options via a modal dialog.

**Test Framework**: Playwright
**Target Components**: Grace period modal, timeout handling, TodoWrite plan display
**Grace Period Trigger**: 192s mark (80% of 240s default timeout)
**Documentation**: Screenshots required for user documentation

---

## Test Configuration

### Playwright Configuration Notes

```typescript
// playwright.config.ts considerations
{
  timeout: 300000, // 5 minutes to accommodate long-running timeout tests
  expect: {
    timeout: 10000 // 10s for assertions
  },
  use: {
    headless: false, // Recommended for screenshot validation
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  }
}
```

### Mock Strategy

**Claude SDK Mocking:**
- Mock streaming responses with controllable delays
- Simulate token consumption patterns
- Mock TodoWrite plan generation
- Control timeout scenarios programmatically

**Time Control:**
- Use `page.clock.install()` for time manipulation
- Fast-forward to grace period trigger (192s)
- Avoid actual 3+ minute waits in tests

### Screenshot Naming Convention

Format: `grace-period-{scenario}-{step}-{timestamp}.png`

Examples:
- `grace-period-trigger-modal-appears-001.png`
- `grace-period-continue-timeout-extended-002.png`
- `grace-period-todowrite-plan-displayed-003.png`

---

## Test Scenarios

### Scenario 1: Slow Query Triggers Grace Period

**Objective**: Verify that a long-running query automatically triggers the grace period modal at 192 seconds.

**Test Setup:**
- Database: Seed with 10,000+ feed items for slow query simulation
- User session: Authenticated user with active chat
- Mock: Claude SDK returns streaming response with 5-token/second rate
- Initial timeout: 240s (default)

**Test Steps:**

1. **Navigate to chat interface**
   - Action: Load `/chat` or main application page
   - Validation: Chat input is visible and enabled

2. **Submit complex query**
   - Action: Enter prompt: "Analyze all feed items and create detailed summary with statistics"
   - Validation: Query submitted, loading indicator appears

3. **Fast-forward to 192s mark**
   - Action: Use `page.clock.fastForward(192000)`
   - Validation: Mock streaming still active (not completed)

4. **Verify grace period modal appears** ⭐ SCREENSHOT
   - Action: Wait for modal with `data-testid="grace-period-modal"`
   - Validation:
     - Modal is visible
     - Title: "Task Taking Longer Than Expected"
     - Timer shows remaining time (48s initially)
     - Four action buttons visible: Continue, Pause, Simplify, Cancel
     - TodoWrite plan section visible (if available)
   - Screenshot: `grace-period-trigger-modal-appears-001.png`

5. **Verify timer countdown**
   - Action: Fast-forward 5 seconds
   - Validation: Timer displays 43s remaining

6. **Verify modal remains open**
   - Action: Fast-forward another 10 seconds
   - Validation: Modal still visible, timer at 33s

**Expected Outcomes:**
- Grace period modal triggers at exactly 192s
- All UI elements render correctly
- Timer counts down accurately
- User can interact with modal buttons

**Assertions:**
```typescript
await expect(page.locator('[data-testid="grace-period-modal"]')).toBeVisible();
await expect(page.locator('[data-testid="grace-period-title"]')).toHaveText(/taking longer/i);
await expect(page.locator('[data-testid="grace-period-timer"]')).toContainText('48');
await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();
await expect(page.locator('[data-testid="pause-button"]')).toBeEnabled();
await expect(page.locator('[data-testid="simplify-button"]')).toBeEnabled();
await expect(page.locator('[data-testid="cancel-button"]')).toBeEnabled();
```

---

### Scenario 2: Continue Button Extends Timeout

**Objective**: Verify that clicking "Continue" extends the timeout period and allows task completion.

**Test Setup:**
- Same as Scenario 1
- Grace period modal already triggered at 192s
- Mock: Claude SDK configured to complete response in 100s total time

**Test Steps:**

1. **Trigger grace period modal**
   - Action: Follow Scenario 1 steps 1-4
   - Validation: Modal visible at 192s mark

2. **Click "Continue" button** ⭐ SCREENSHOT
   - Action: Click `[data-testid="continue-button"]`
   - Screenshot: `grace-period-continue-button-clicked-002.png`
   - Validation:
     - Modal closes immediately
     - Loading indicator continues
     - No error messages appear

3. **Verify timeout extended**
   - Action: Fast-forward 60 seconds (total: 252s)
   - Validation:
     - Task still running (not timed out)
     - No grace period modal reappears
     - Streaming continues

4. **Verify task completes successfully**
   - Action: Allow mock to complete response (at ~280s total)
   - Validation:
     - Response renders in chat
     - Loading indicator disappears
     - No timeout error

5. **Verify extended timeout metrics** ⭐ SCREENSHOT
   - Action: Check network/console logs
   - Screenshot: `grace-period-continue-timeout-extended-003.png`
   - Validation:
     - Timeout extended to 360s (240s + 120s extension)
     - Extension event logged
     - Metrics captured: `timeout_extended`, `grace_period_action: continue`

**Expected Outcomes:**
- Continue button immediately closes modal
- Timeout extends by 120 seconds (50% of original)
- Task completes without interruption
- Metrics track extension event

**Assertions:**
```typescript
await page.locator('[data-testid="continue-button"]').click();
await expect(page.locator('[data-testid="grace-period-modal"]')).not.toBeVisible();
await page.clock.fastForward(60000);
// Should not timeout at 240s
await expect(page.locator('[data-testid="timeout-error"]')).not.toBeVisible();
await page.clock.fastForward(40000); // Total 280s
await expect(page.locator('[data-testid="chat-response"]')).toBeVisible();
```

---

### Scenario 3: Pause Button Saves State

**Objective**: Verify that clicking "Pause" saves the current state and allows resuming later.

**Test Setup:**
- Same as Scenario 1
- Grace period modal triggered at 192s
- Mock: Claude SDK configured with resumable stream state
- Database: Session state table ready for writes

**Test Steps:**

1. **Trigger grace period modal**
   - Action: Follow Scenario 1 steps 1-4
   - Validation: Modal visible at 192s mark

2. **Click "Pause" button** ⭐ SCREENSHOT
   - Action: Click `[data-testid="pause-button"]`
   - Screenshot: `grace-period-pause-button-clicked-004.png`
   - Validation:
     - Modal shows "Saving state..." message
     - Loading spinner appears

3. **Verify state saved** ⭐ SCREENSHOT
   - Action: Wait for save confirmation
   - Screenshot: `grace-period-pause-state-saved-005.png`
   - Validation:
     - Success message: "Task paused. You can resume anytime."
     - Modal closes after 2s
     - Chat shows "Paused" status badge
     - Database contains saved state record

4. **Verify stream stopped**
   - Action: Check network activity
   - Validation:
     - SSE connection closed gracefully
     - No further tokens received
     - Cleanup events fired

5. **Verify resume capability**
   - Action: Refresh page and navigate back to chat
   - Validation:
     - "Resume Task" button visible in chat
     - Saved state preserved

6. **Test resume functionality** ⭐ SCREENSHOT
   - Action: Click "Resume Task" button
   - Screenshot: `grace-period-pause-task-resumed-006.png`
   - Validation:
     - Stream reconnects from saved position
     - Response continues from pause point
     - No duplicate content

**Expected Outcomes:**
- Pause saves complete state to database
- Stream stops cleanly
- User can resume from exact pause point
- No data loss occurs

**Assertions:**
```typescript
await page.locator('[data-testid="pause-button"]').click();
await expect(page.locator('[data-testid="pause-saving-message"]')).toBeVisible();
await expect(page.locator('[data-testid="pause-success-message"]')).toBeVisible();
await expect(page.locator('[data-testid="chat-status-badge"]')).toHaveText('Paused');

// Verify database state
const savedState = await db.query('SELECT * FROM session_states WHERE task_id = ?', [taskId]);
expect(savedState.rows.length).toBe(1);
expect(savedState.rows[0].state).toBe('paused');
expect(savedState.rows[0].resume_token).toBeTruthy();

// Resume test
await page.reload();
await expect(page.locator('[data-testid="resume-task-button"]')).toBeVisible();
await page.locator('[data-testid="resume-task-button"]').click();
await expect(page.locator('[data-testid="chat-response"]')).toContainText(/continued content/);
```

---

### Scenario 4: Simplify Button Reduces Scope

**Objective**: Verify that clicking "Simplify" cancels current task and prompts user for simpler query.

**Test Setup:**
- Same as Scenario 1
- Grace period modal triggered at 192s
- Mock: Claude SDK with scope reduction suggestions

**Test Steps:**

1. **Trigger grace period modal**
   - Action: Follow Scenario 1 steps 1-4
   - Validation: Modal visible at 192s mark

2. **Click "Simplify" button** ⭐ SCREENSHOT
   - Action: Click `[data-testid="simplify-button"]`
   - Screenshot: `grace-period-simplify-button-clicked-007.png`
   - Validation:
     - Modal transitions to simplification suggestions
     - Shows 3-5 simplified query options
     - Original query displayed for reference

3. **Verify current task cancelled**
   - Action: Check network/stream status
   - Validation:
     - Original stream terminated
     - Cancellation event logged
     - Resources cleaned up

4. **Review simplification suggestions** ⭐ SCREENSHOT
   - Action: Wait for suggestions to render
   - Screenshot: `grace-period-simplify-suggestions-008.png`
   - Validation:
     - Suggestions are contextually relevant
     - Each suggestion has:
       - Simplified prompt text
       - Estimated time reduction
       - "Use This" button
     - "Write My Own" option available

5. **Select simplified query**
   - Action: Click "Use This" on first suggestion
   - Validation:
     - Suggestion populates chat input
     - User can edit before submitting
     - Original modal closes

6. **Submit simplified query** ⭐ SCREENSHOT
   - Action: Submit the simplified prompt
   - Screenshot: `grace-period-simplify-query-submitted-009.png`
   - Validation:
     - New query executes
     - Completes within timeout
     - Response rendered successfully

**Expected Outcomes:**
- Simplify cancels current task cleanly
- AI-generated suggestions are helpful
- Simplified query completes faster
- User experience is smooth

**Assertions:**
```typescript
await page.locator('[data-testid="simplify-button"]').click();
await expect(page.locator('[data-testid="simplification-suggestions"]')).toBeVisible();

const suggestions = page.locator('[data-testid="suggestion-item"]');
await expect(suggestions).toHaveCount(3); // At least 3 suggestions

await suggestions.first().locator('[data-testid="use-suggestion-button"]').click();
await expect(page.locator('[data-testid="chat-input"]')).toHaveValue(/simplified/);

await page.locator('[data-testid="submit-button"]').click();
await expect(page.locator('[data-testid="chat-response"]')).toBeVisible({ timeout: 30000 });
```

---

### Scenario 5: Cancel Button Stops Execution

**Objective**: Verify that clicking "Cancel" immediately stops task and cleans up resources.

**Test Setup:**
- Same as Scenario 1
- Grace period modal triggered at 192s
- Mock: Claude SDK with active stream

**Test Steps:**

1. **Trigger grace period modal**
   - Action: Follow Scenario 1 steps 1-4
   - Validation: Modal visible at 192s mark

2. **Click "Cancel" button** ⭐ SCREENSHOT
   - Action: Click `[data-testid="cancel-button"]`
   - Screenshot: `grace-period-cancel-button-clicked-010.png`
   - Validation:
     - Confirmation dialog appears: "Are you sure? Progress will be lost."
     - Two options: "Yes, Cancel" and "No, Go Back"

3. **Confirm cancellation** ⭐ SCREENSHOT
   - Action: Click "Yes, Cancel" in confirmation dialog
   - Screenshot: `grace-period-cancel-confirmed-011.png`
   - Validation:
     - Both modals close immediately
     - Loading indicator stops
     - Chat shows cancelled state

4. **Verify task terminated**
   - Action: Check network and stream status
   - Validation:
     - SSE connection closed
     - Abort signal sent to backend
     - No further tokens received
     - Cancellation event logged

5. **Verify cleanup** ⭐ SCREENSHOT
   - Action: Inspect chat interface state
   - Screenshot: `grace-period-cancel-cleanup-012.png`
   - Validation:
     - No orphaned requests
     - Chat input re-enabled
     - Partial response (if any) marked as cancelled
     - User can start new query

6. **Verify cancel metrics**
   - Action: Check analytics/logs
   - Validation:
     - Event: `task_cancelled_at_grace_period`
     - Time to cancel: < 1s
     - Reason: `user_initiated`

**Expected Outcomes:**
- Cancel stops task immediately
- All resources cleaned up
- User can immediately start new task
- No memory leaks or hanging requests

**Assertions:**
```typescript
await page.locator('[data-testid="cancel-button"]').click();
await expect(page.locator('[data-testid="cancel-confirmation-dialog"]')).toBeVisible();

await page.locator('[data-testid="confirm-cancel-button"]').click();
await expect(page.locator('[data-testid="grace-period-modal"]')).not.toBeVisible();
await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

// Verify network cleanup
const activeRequests = await page.evaluate(() => performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/stream') && !r.responseEnd));
expect(activeRequests.length).toBe(0);
```

---

### Scenario 6: TodoWrite Plan Displays Correctly

**Objective**: Verify that TodoWrite plan is generated and displayed in the grace period modal when available.

**Test Setup:**
- Same as Scenario 1
- Mock: Claude SDK configured to return TodoWrite plan with task list
- Grace period modal triggered at 192s

**Mock Data - TodoWrite Plan:**
```json
{
  "todos": [
    {
      "id": "1",
      "content": "Fetch all feed items from database",
      "status": "completed",
      "priority": "high",
      "activeForm": "Fetching feed items"
    },
    {
      "id": "2",
      "content": "Analyze content patterns",
      "status": "in_progress",
      "priority": "high",
      "activeForm": "Analyzing content patterns"
    },
    {
      "id": "3",
      "content": "Calculate statistics",
      "status": "pending",
      "priority": "medium",
      "activeForm": "Calculating statistics"
    },
    {
      "id": "4",
      "content": "Generate summary report",
      "status": "pending",
      "priority": "medium",
      "activeForm": "Generating summary report"
    },
    {
      "id": "5",
      "content": "Format final output",
      "status": "pending",
      "priority": "low",
      "activeForm": "Formatting final output"
    }
  ]
}
```

**Test Steps:**

1. **Trigger grace period with TodoWrite plan**
   - Action: Submit complex query, fast-forward to 192s
   - Mock: Ensure TodoWrite plan is included in stream metadata
   - Validation: Modal appears at 192s

2. **Verify TodoWrite section visible** ⭐ SCREENSHOT
   - Action: Locate `[data-testid="todowrite-plan-section"]`
   - Screenshot: `grace-period-todowrite-plan-displayed-013.png`
   - Validation:
     - Section header: "Current Progress"
     - All 5 todos visible
     - Status indicators correct:
       - Todo 1: ✓ Completed (green)
       - Todo 2: ⟳ In Progress (blue, animated)
       - Todos 3-5: ○ Pending (gray)

3. **Verify todo details** ⭐ SCREENSHOT
   - Action: Inspect each todo item
   - Screenshot: `grace-period-todowrite-details-014.png`
   - Validation:
     - Content text matches mock data
     - Priority badges displayed (High/Medium/Low)
     - Active form shown for in-progress item
     - Progress bar shows 2/5 (40%) completion

4. **Verify real-time updates**
   - Action: Mock todo status change (2 → completed, 3 → in_progress)
   - Validation:
     - Todo 2 changes to completed with checkmark
     - Todo 3 shows in-progress spinner
     - Progress bar updates to 3/5 (60%)

5. **Verify plan helps user decision**
   - Action: Review plan context
   - Validation:
     - User can see what's done and what remains
     - Helps decide whether to Continue or Simplify
     - Time estimate visible if available

6. **Test plan with Continue action**
   - Action: Click Continue button
   - Validation:
     - Modal closes
     - Todos continue updating in background
     - Can view plan in status panel (optional UI)

**Expected Outcomes:**
- TodoWrite plan renders clearly in modal
- Status indicators are accurate and update in real-time
- Progress visualization helps user make informed decision
- Plan persists after Continue action

**Assertions:**
```typescript
await expect(page.locator('[data-testid="todowrite-plan-section"]')).toBeVisible();

const todos = page.locator('[data-testid="todo-item"]');
await expect(todos).toHaveCount(5);

// Verify statuses
await expect(todos.nth(0)).toHaveAttribute('data-status', 'completed');
await expect(todos.nth(1)).toHaveAttribute('data-status', 'in_progress');
await expect(todos.nth(2)).toHaveAttribute('data-status', 'pending');

// Verify progress
await expect(page.locator('[data-testid="todo-progress-bar"]')).toHaveAttribute('aria-valuenow', '40');
await expect(page.locator('[data-testid="todo-progress-text"]')).toHaveText('2 of 5 completed');

// Verify priorities
await expect(todos.nth(0).locator('[data-testid="priority-badge"]')).toHaveText('High');
await expect(todos.nth(2).locator('[data-testid="priority-badge"]')).toHaveText('Medium');
```

---

### Scenario 7: Grace Period Without TodoWrite Plan

**Objective**: Verify modal displays gracefully when TodoWrite plan is unavailable or not applicable.

**Test Setup:**
- Same as Scenario 1
- Mock: Claude SDK returns NO TodoWrite plan (simple query or plan not generated)
- Grace period modal triggered at 192s

**Test Steps:**

1. **Submit simple query without TodoWrite**
   - Action: Enter prompt: "What is the weather today?"
   - Mock: Configure response to take 200s but without task breakdown
   - Validation: Query submitted

2. **Trigger grace period at 192s**
   - Action: Fast-forward to 192s
   - Validation: Modal appears

3. **Verify TodoWrite section handling** ⭐ SCREENSHOT
   - Action: Check for TodoWrite section
   - Screenshot: `grace-period-no-todowrite-015.png`
   - Validation:
     - TodoWrite section either:
       - Hidden completely (preferred), OR
       - Shows helpful message: "Breaking down task steps..."
     - Modal still displays all 4 action buttons
     - Timer functions normally

4. **Verify alternative progress indicator**
   - Action: Check for fallback progress UI
   - Validation:
     - Generic loading spinner or progress bar
     - Message: "Processing your request..."
     - Token count or time elapsed (optional)

5. **Verify buttons work without plan**
   - Action: Test Continue button
   - Validation:
     - All buttons functional
     - User decisions not dependent on TodoWrite
     - Modal behavior consistent

6. **Test plan appears mid-grace-period** ⭐ SCREENSHOT
   - Action: Mock TodoWrite plan arrival during grace period
   - Screenshot: `grace-period-todowrite-late-arrival-016.png`
   - Validation:
     - Plan section smoothly animates in
     - Existing modal content adjusts
     - User sees updated information

**Expected Outcomes:**
- Modal works correctly without TodoWrite plan
- No errors or empty sections
- Fallback UI is informative
- Late-arriving plans handled gracefully

**Assertions:**
```typescript
// Case 1: No TodoWrite at all
await expect(page.locator('[data-testid="todowrite-plan-section"]')).not.toBeVisible();
await expect(page.locator('[data-testid="generic-progress-message"]')).toBeVisible();

// Case 2: Late-arriving TodoWrite
await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent('todowrite-plan-update', {
    detail: { todos: [...] }
  }));
});

await expect(page.locator('[data-testid="todowrite-plan-section"]')).toBeVisible({ timeout: 2000 });
await expect(page.locator('[data-testid="todo-item"]')).toHaveCount(5);
```

---

## Test Data Requirements

### Database Seeds

**Feed Items (10,000+ records):**
```sql
INSERT INTO feed_items (id, title, content, author, created_at, tags)
VALUES
  (1, 'Sample Post 1', 'Long content...', 'user1', NOW(), ARRAY['tech', 'ai']),
  (2, 'Sample Post 2', 'Long content...', 'user2', NOW(), ARRAY['news']),
  -- ... 10,000 more records
```

**User Sessions:**
```sql
INSERT INTO user_sessions (id, user_id, session_token, created_at)
VALUES ('test-session-1', 'test-user-1', 'mock-token-123', NOW());
```

**Session States (for pause/resume tests):**
```sql
CREATE TABLE session_states (
  task_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  state VARCHAR(50) NOT NULL,
  resume_token TEXT,
  saved_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Mock Claude SDK Responses

**Slow Streaming Response (triggers grace period):**
```typescript
{
  responseType: 'stream',
  tokensPerSecond: 5,
  totalTokens: 2000,
  includeToolCalls: true,
  toolCalls: [
    {
      type: 'TodoWrite',
      timestamp: 150000, // 150s into stream
      data: {
        todos: [/* TodoWrite plan */]
      }
    }
  ]
}
```

**Simplification Suggestions:**
```typescript
{
  suggestions: [
    {
      prompt: "Summarize top 10 recent feed items",
      estimatedTime: "30s",
      rationale: "Reduced scope from 'all items' to 'top 10'"
    },
    {
      prompt: "Show basic statistics for today's feed",
      estimatedTime: "20s",
      rationale: "Limited time range to today only"
    },
    {
      prompt: "List most recent feed item",
      estimatedTime: "5s",
      rationale: "Single item instead of full analysis"
    }
  ]
}
```

---

## Additional Test Considerations

### Edge Cases

1. **Grace period expires while user deciding**
   - Fast-forward full 48s without user action
   - Verify timeout occurs gracefully
   - Modal closes, error message shown

2. **Multiple grace periods in succession**
   - User clicks Continue, but task still takes too long
   - Verify second grace period triggers at new threshold
   - Test consecutive extensions

3. **Network interruption during grace period**
   - Simulate network disconnect
   - Verify modal state persists
   - Test reconnection behavior

4. **Browser refresh during grace period**
   - Refresh page while modal open
   - Verify state recovery
   - Test resume from saved state

### Performance Metrics to Track

- Modal render time: < 200ms
- Button click response: < 100ms
- State save time (Pause): < 1s
- Cancellation cleanup time: < 500ms
- TodoWrite plan render time: < 300ms

### Accessibility Testing

- Keyboard navigation through modal
- Screen reader announcements
- ARIA labels on all interactive elements
- Focus management when modal opens/closes
- Color contrast for status indicators

---

## Screenshot Checklist

Total Screenshots Required: **16**

1. ✓ `grace-period-trigger-modal-appears-001.png` - Initial modal
2. ✓ `grace-period-continue-button-clicked-002.png` - Continue action
3. ✓ `grace-period-continue-timeout-extended-003.png` - Extended timeout
4. ✓ `grace-period-pause-button-clicked-004.png` - Pause action
5. ✓ `grace-period-pause-state-saved-005.png` - State saved confirmation
6. ✓ `grace-period-pause-task-resumed-006.png` - Resume functionality
7. ✓ `grace-period-simplify-button-clicked-007.png` - Simplify action
8. ✓ `grace-period-simplify-suggestions-008.png` - Simplification suggestions
9. ✓ `grace-period-simplify-query-submitted-009.png` - Simplified query
10. ✓ `grace-period-cancel-button-clicked-010.png` - Cancel action
11. ✓ `grace-period-cancel-confirmed-011.png` - Cancellation confirmed
12. ✓ `grace-period-cancel-cleanup-012.png` - Cleanup complete
13. ✓ `grace-period-todowrite-plan-displayed-013.png` - TodoWrite plan
14. ✓ `grace-period-todowrite-details-014.png` - Todo details
15. ✓ `grace-period-no-todowrite-015.png` - No plan fallback
16. ✓ `grace-period-todowrite-late-arrival-016.png` - Late-arriving plan

---

## Implementation Checklist

- [ ] Set up Playwright test environment
- [ ] Create mock Claude SDK with controllable delays
- [ ] Implement time control utilities (clock manipulation)
- [ ] Seed test database with 10,000+ feed items
- [ ] Configure screenshot capture pipeline
- [ ] Write all 7 test scenarios
- [ ] Add edge case tests
- [ ] Implement accessibility checks
- [ ] Set up CI/CD integration
- [ ] Document test results and screenshots

---

## Next Steps

1. **Wait for UI components**: These tests can be written once:
   - Grace period modal component exists
   - TodoWrite plan component exists
   - Backend timeout handling is implemented

2. **Playwright test files structure**:
   ```
   /tests/e2e/
     ├── grace-period/
     │   ├── scenario-1-trigger.spec.ts
     │   ├── scenario-2-continue.spec.ts
     │   ├── scenario-3-pause.spec.ts
     │   ├── scenario-4-simplify.spec.ts
     │   ├── scenario-5-cancel.spec.ts
     │   ├── scenario-6-todowrite.spec.ts
     │   └── scenario-7-no-todowrite.spec.ts
     ├── fixtures/
     │   ├── claude-sdk.mock.ts
     │   └── test-data.seed.ts
     └── utils/
         └── time-control.ts
   ```

3. **Mock development**: Create reusable Claude SDK mock before writing tests

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**Status**: Ready for implementation after UI components exist
