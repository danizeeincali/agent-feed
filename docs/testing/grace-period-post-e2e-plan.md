# Grace Period Post E2E Test Plan

## Overview
End-to-end test plan for grace period post functionality, covering user interaction flows, timeout management, and state persistence.

**Test Framework**: Playwright
**Database**: Test PostgreSQL instance
**Mocking**: Claude SDK responses
**Performance Targets**: See each scenario

---

## Test Setup

### Prerequisites
```typescript
// test/e2e/grace-period-flow.spec.ts
import { test, expect, Page } from '@playwright/test';

// Test database setup
beforeEach(async ({ page }) => {
  // Reset test database
  await resetTestDatabase();

  // Create test user and authenticate
  await page.goto('/login');
  await authenticateTestUser(page);

  // Navigate to feed
  await page.goto('/feed');
});

// Mock Claude SDK
async function mockClaudeSDK(page: Page) {
  await page.route('**/api/claude/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        taskId: 'test-task-123',
        status: 'running',
        timeout: 240000
      })
    });
  });
}

// Time manipulation helper
async function fastForwardToGracePeriod(page: Page, seconds: number) {
  await page.clock.install({ time: new Date() });
  await page.clock.fastForward(seconds * 1000);
}
```

---

## Scenario 1: Grace Period Post Appears in Feed

### Description
User is watching feed during long-running task. At 192 seconds (80% of 240s timeout), grace period post automatically appears showing TodoWrite plan with progress.

### Test Steps
```typescript
test('grace period post appears at 80% timeout', async ({ page }) => {
  // 1. Start long-running task
  await mockClaudeSDK(page);
  await page.click('[data-testid="new-task-button"]');
  await page.fill('[data-testid="task-input"]', 'Create complex feature with 10 steps');
  await page.click('[data-testid="submit-task"]');

  // 2. Verify task started
  await expect(page.locator('[data-testid="task-running"]')).toBeVisible();

  // 3. Fast forward to 192 seconds (80% of 240s)
  await fastForwardToGracePeriod(page, 192);

  // 4. Wait for grace period post to appear (within 500ms)
  const gracePeriodPost = page.locator('[data-testid="grace-period-post"]');
  await expect(gracePeriodPost).toBeVisible({ timeout: 500 });

  // 5. Verify post content
  await expect(gracePeriodPost).toContainText('Task timeout approaching');
  await expect(gracePeriodPost).toContainText('48 seconds remaining');
  await expect(gracePeriodPost).toContainText('80% complete');

  // 6. Verify TodoWrite plan is visible
  const todoList = page.locator('[data-testid="grace-period-todos"]');
  await expect(todoList).toBeVisible();
  await expect(todoList.locator('.todo-item')).toHaveCount(10);

  // 7. Verify progress indicators
  await expect(page.locator('[data-testid="completed-todos"]')).toContainText('8/10');

  // 8. Verify action buttons
  await expect(page.locator('[data-testid="grace-period-continue"]')).toBeVisible();
  await expect(page.locator('[data-testid="grace-period-pause"]')).toBeVisible();

  // Screenshot 1: Grace period post in feed
  await page.screenshot({
    path: 'screenshots/01-grace-period-post-appears.png',
    fullPage: true
  });
});
```

### Expected Results
- ✅ Grace period post appears within 500ms at 192s mark
- ✅ Post displays remaining time (48 seconds)
- ✅ Post shows task progress (80% or 8/10 todos)
- ✅ TodoWrite plan is fully visible
- ✅ Action buttons (Continue/Pause) are clickable
- ✅ Post styling indicates urgency (warning color)

### Performance Target
- Post appearance latency: < 500ms
- WebSocket notification: < 100ms

---

## Scenario 2: User Chooses "Continue" via Comment

### Description
User clicks comment on grace period post, types "continue", and submits. System extends timeout by 120 seconds and shows confirmation.

### Test Steps
```typescript
test('user extends timeout via continue comment', async ({ page }) => {
  // Setup: Get to grace period state
  await setupGracePeriodState(page);

  // 1. Click comment button on grace period post
  const gracePeriodPost = page.locator('[data-testid="grace-period-post"]');
  await gracePeriodPost.locator('[data-testid="comment-button"]').click();

  // Screenshot 2: Comment input opened
  await page.screenshot({
    path: 'screenshots/02-comment-input-opened.png'
  });

  // 2. Type "continue" in comment input
  const commentInput = page.locator('[data-testid="comment-input"]');
  await commentInput.fill('continue');

  // Screenshot 3: Continue command typed
  await page.screenshot({
    path: 'screenshots/03-continue-typed.png'
  });

  // 3. Submit comment
  const submitButton = page.locator('[data-testid="submit-comment"]');
  await submitButton.click();

  // 4. Verify comment processes within 200ms
  const startTime = Date.now();
  const confirmation = page.locator('[data-testid="timeout-confirmation"]');
  await expect(confirmation).toBeVisible({ timeout: 200 });
  const processingTime = Date.now() - startTime;
  expect(processingTime).toBeLessThan(200);

  // Screenshot 4: Confirmation message
  await page.screenshot({
    path: 'screenshots/04-continue-confirmation.png'
  });

  // 5. Verify confirmation message
  await expect(confirmation).toContainText('Timeout extended by 120 seconds');
  await expect(confirmation).toContainText('Task will continue');

  // 6. Verify timeout extended in UI
  const timeRemaining = page.locator('[data-testid="time-remaining"]');
  await expect(timeRemaining).toContainText('168 seconds'); // 48 + 120

  // 7. Verify task continues executing
  await expect(page.locator('[data-testid="task-running"]')).toBeVisible();

  // 8. Verify database state
  const dbState = await queryDatabase(
    'SELECT timeout_extended, extension_seconds FROM tasks WHERE id = $1',
    ['test-task-123']
  );
  expect(dbState.timeout_extended).toBe(true);
  expect(dbState.extension_seconds).toBe(120);

  // Screenshot 5: Task continues with extended timeout
  await page.screenshot({
    path: 'screenshots/05-task-continues.png',
    fullPage: true
  });
});
```

### Expected Results
- ✅ Comment input appears on click
- ✅ "continue" command recognized (case-insensitive)
- ✅ Confirmation appears within 200ms
- ✅ Timeout extended by 120 seconds
- ✅ Task continues without interruption
- ✅ Database records extension
- ✅ WebSocket notifies all connected clients

### Performance Target
- Comment processing: < 200ms
- Database update: < 50ms
- WebSocket notification: < 100ms

---

## Scenario 3: User Chooses "Pause" via Comment

### Description
User comments "pause" on grace period post. System saves current state to database and shows confirmation that task can be resumed later.

### Test Steps
```typescript
test('user pauses task and persists state', async ({ page }) => {
  // Setup: Get to grace period state
  await setupGracePeriodState(page);

  // 1. Comment "pause" on grace period post
  const gracePeriodPost = page.locator('[data-testid="grace-period-post"]');
  await gracePeriodPost.locator('[data-testid="comment-button"]').click();
  await page.fill('[data-testid="comment-input"]', 'pause');

  // Screenshot 6: Pause command typed
  await page.screenshot({
    path: 'screenshots/06-pause-typed.png'
  });

  await page.click('[data-testid="submit-comment"]');

  // 2. Verify pause confirmation
  const confirmation = page.locator('[data-testid="pause-confirmation"]');
  await expect(confirmation).toBeVisible({ timeout: 200 });
  await expect(confirmation).toContainText('State saved');
  await expect(confirmation).toContainText('You can resume later');

  // Screenshot 7: Pause confirmation
  await page.screenshot({
    path: 'screenshots/07-pause-confirmation.png'
  });

  // 3. Verify task status changed to paused
  await expect(page.locator('[data-testid="task-paused"]')).toBeVisible();

  // 4. Verify database state persistence
  const dbState = await queryDatabase(`
    SELECT
      status,
      paused_state,
      paused_at,
      todos_completed,
      todos_total
    FROM tasks
    WHERE id = $1
  `, ['test-task-123']);

  expect(dbState.status).toBe('paused');
  expect(dbState.paused_state).toBeTruthy();
  expect(dbState.paused_at).toBeTruthy();
  expect(dbState.todos_completed).toBe(8);
  expect(dbState.todos_total).toBe(10);

  // 5. Verify paused state contains full context
  const pausedState = JSON.parse(dbState.paused_state);
  expect(pausedState).toHaveProperty('currentStep');
  expect(pausedState).toHaveProperty('completedTodos');
  expect(pausedState).toHaveProperty('pendingTodos');
  expect(pausedState).toHaveProperty('conversationContext');
  expect(pausedState).toHaveProperty('fileChanges');

  // 6. Open database inspector (dev tools)
  await page.goto('/dev/database-inspector');
  await page.fill('[data-testid="task-id-filter"]', 'test-task-123');

  // Screenshot 8: Database state in inspector
  await page.screenshot({
    path: 'screenshots/08-database-state.png',
    fullPage: true
  });

  // 7. Verify state is searchable/resumable
  await page.goto('/tasks/paused');
  const pausedTaskCard = page.locator('[data-testid="task-test-task-123"]');
  await expect(pausedTaskCard).toBeVisible();
  await expect(pausedTaskCard).toContainText('Paused');
  await expect(pausedTaskCard).toContainText('8/10 complete');
});
```

### Expected Results
- ✅ Pause confirmation appears within 200ms
- ✅ Task status changes to "paused"
- ✅ Complete state saved to database
- ✅ State includes: todos, context, file changes
- ✅ Paused task appears in "Paused Tasks" list
- ✅ State is retrievable via database inspector

### Performance Target
- State serialization: < 100ms
- Database write: < 50ms
- UI update: < 200ms

---

## Scenario 4: User Resumes Paused Task

### Description
User navigates to paused tasks, clicks "Resume" button. Task continues from exact point where it was paused.

### Test Steps
```typescript
test('user resumes paused task from exact state', async ({ page }) => {
  // Setup: Create paused task state
  await createPausedTaskInDB({
    taskId: 'test-task-123',
    completedTodos: 8,
    totalTodos: 10,
    pausedState: {
      currentStep: 'Implementing feature X',
      completedTodos: ['Todo 1', 'Todo 2', '...', 'Todo 8'],
      pendingTodos: ['Todo 9', 'Todo 10'],
      conversationContext: { messages: [...] },
      fileChanges: { 'src/app.ts': { status: 'modified' } }
    }
  });

  // 1. Navigate to paused tasks page
  await page.goto('/tasks/paused');

  // 2. Verify paused task is visible
  const pausedTask = page.locator('[data-testid="task-test-task-123"]');
  await expect(pausedTask).toBeVisible();
  await expect(pausedTask).toContainText('8/10 complete');

  // Screenshot 9: Paused tasks list
  await page.screenshot({
    path: 'screenshots/09-paused-tasks-list.png'
  });

  // 3. Click resume button
  await pausedTask.locator('[data-testid="resume-button"]').click();

  // 4. Verify resume modal/confirmation
  const resumeModal = page.locator('[data-testid="resume-modal"]');
  await expect(resumeModal).toBeVisible();
  await expect(resumeModal).toContainText('Resume from: Implementing feature X');
  await expect(resumeModal).toContainText('Progress: 8/10 todos');

  // 5. Confirm resume
  await page.click('[data-testid="confirm-resume"]');

  // 6. Verify task resumes with context
  await expect(page.locator('[data-testid="task-running"]')).toBeVisible();

  // 7. Verify todos reflect saved state
  const todoList = page.locator('[data-testid="current-todos"]');
  await expect(todoList.locator('.completed')).toHaveCount(8);
  await expect(todoList.locator('.pending')).toHaveCount(2);

  // 8. Verify conversation context restored
  const chatHistory = page.locator('[data-testid="chat-history"]');
  await expect(chatHistory.locator('.message')).toHaveCount(
    await getPausedStateMessageCount()
  );

  // 9. Verify file changes preserved
  const fileTree = page.locator('[data-testid="file-tree"]');
  await expect(fileTree.locator('[data-file="src/app.ts"]')).toHaveClass(/modified/);

  // Screenshot 10: Task resumed with full context
  await page.screenshot({
    path: 'screenshots/10-task-resumed.png',
    fullPage: true
  });

  // 10. Verify database state updated
  const dbState = await queryDatabase(
    'SELECT status, resumed_at FROM tasks WHERE id = $1',
    ['test-task-123']
  );
  expect(dbState.status).toBe('running');
  expect(dbState.resumed_at).toBeTruthy();
});
```

### Expected Results
- ✅ Paused tasks list displays all paused tasks
- ✅ Resume button is clearly visible
- ✅ Resume modal shows context preview
- ✅ Task continues from exact saved state
- ✅ All todos reflect correct completion status
- ✅ Conversation history fully restored
- ✅ File changes preserved
- ✅ Database status updates to "running"

### Performance Target
- State deserialization: < 100ms
- Context restoration: < 300ms
- UI render: < 500ms

---

## Scenario 5: Multiple Choice Comments (Error Case)

### Description
User comments "continue" then immediately comments "pause". System only accepts first choice and shows error for second attempt.

### Test Steps
```typescript
test('system prevents multiple timeout choices', async ({ page }) => {
  // Setup: Get to grace period state
  await setupGracePeriodState(page);

  // 1. Submit "continue" comment
  const gracePeriodPost = page.locator('[data-testid="grace-period-post"]');
  await gracePeriodPost.locator('[data-testid="comment-button"]').click();
  await page.fill('[data-testid="comment-input"]', 'continue');
  await page.click('[data-testid="submit-comment"]');

  // 2. Wait for first choice to be processed
  await expect(page.locator('[data-testid="timeout-confirmation"]')).toBeVisible();

  // 3. Attempt to comment "pause" immediately
  await gracePeriodPost.locator('[data-testid="comment-button"]').click();
  await page.fill('[data-testid="comment-input"]', 'pause');
  await page.click('[data-testid="submit-comment"]');

  // 4. Verify error message appears
  const errorMessage = page.locator('[data-testid="choice-error"]');
  await expect(errorMessage).toBeVisible({ timeout: 200 });
  await expect(errorMessage).toContainText('Choice already recorded');
  await expect(errorMessage).toContainText('continue');

  // Screenshot: Error handling
  await page.screenshot({
    path: 'screenshots/11-multiple-choice-error.png'
  });

  // 5. Verify first choice remains active
  const timeRemaining = page.locator('[data-testid="time-remaining"]');
  await expect(timeRemaining).toContainText('168 seconds'); // Extended timeout

  // 6. Verify database only has one choice recorded
  const dbChoices = await queryDatabase(`
    SELECT choice, choice_timestamp
    FROM task_timeout_choices
    WHERE task_id = $1
  `, ['test-task-123']);

  expect(dbChoices).toHaveLength(1);
  expect(dbChoices[0].choice).toBe('continue');

  // 7. Verify second comment is still visible but not processed as command
  const comments = page.locator('[data-testid="grace-period-comments"]');
  await expect(comments.locator('.comment')).toHaveCount(2);
  await expect(comments.locator('.comment').nth(1)).toContainText('pause');
  await expect(comments.locator('.comment').nth(1)).not.toHaveClass(/command-processed/);
});
```

### Expected Results
- ✅ First choice ("continue") processes successfully
- ✅ Second choice ("pause") shows error message
- ✅ Error message indicates choice already made
- ✅ First choice remains active
- ✅ Database contains only first choice
- ✅ Second comment visible but not processed as command
- ✅ No race conditions or duplicate processing

### Performance Target
- Duplicate detection: < 50ms
- Error message display: < 200ms

---

## Additional Test Cases

### Edge Cases

#### Test: Grace Period Near Task Completion
```typescript
test('grace period with 95% completion', async ({ page }) => {
  // Task nearly done (9.5/10 todos)
  // Verify grace period still triggers
  // User can choose to extend or let it finish
});
```

#### Test: Multiple Tasks with Grace Periods
```typescript
test('multiple concurrent tasks entering grace period', async ({ page }) => {
  // Start 3 long-running tasks
  // All hit grace period at different times
  // Verify correct grace period post for each
});
```

#### Test: Network Failure During Comment
```typescript
test('network failure while submitting choice', async ({ page }) => {
  // Mock network failure
  // Verify retry mechanism
  // Verify state consistency
});
```

#### Test: Browser Refresh During Grace Period
```typescript
test('user refreshes page during grace period', async ({ page }) => {
  // Enter grace period state
  // Refresh page
  // Verify grace period post persists
  // Verify choice can still be made
});
```

### Performance Tests

#### Test: Grace Period Under Load
```typescript
test('grace period performance with 100 concurrent users', async () => {
  // Simulate 100 users watching feeds
  // All tasks hit grace period simultaneously
  // Verify all posts appear within 500ms
  // No database deadlocks
});
```

#### Test: State Persistence Performance
```typescript
test('pause state save with large context', async ({ page }) => {
  // Task with 100 todos and 10MB conversation context
  // User chooses pause
  // Verify state saves within 500ms
  // Verify state can be deserialized
});
```

---

## Test Data Requirements

### Database Schema
```sql
-- Tasks table
CREATE TABLE tasks (
  id VARCHAR PRIMARY KEY,
  status VARCHAR NOT NULL,
  timeout_ms INTEGER,
  timeout_extended BOOLEAN DEFAULT false,
  extension_seconds INTEGER,
  paused_state JSONB,
  paused_at TIMESTAMP,
  resumed_at TIMESTAMP,
  todos_completed INTEGER,
  todos_total INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Timeout choices table
CREATE TABLE task_timeout_choices (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR REFERENCES tasks(id),
  choice VARCHAR NOT NULL CHECK (choice IN ('continue', 'pause')),
  choice_timestamp TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id) -- Prevent multiple choices
);

-- Grace period posts table
CREATE TABLE grace_period_posts (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR REFERENCES tasks(id),
  post_content JSONB,
  triggered_at TIMESTAMP DEFAULT NOW()
);
```

### Mock Data
```typescript
// Sample paused task state
const SAMPLE_PAUSED_STATE = {
  taskId: 'test-task-123',
  currentStep: 'Implementing authentication middleware',
  completedTodos: [
    { id: 1, content: 'Set up Express server', status: 'completed' },
    { id: 2, content: 'Configure TypeScript', status: 'completed' },
    // ... 8 total
  ],
  pendingTodos: [
    { id: 9, content: 'Add JWT authentication', status: 'pending' },
    { id: 10, content: 'Write integration tests', status: 'pending' }
  ],
  conversationContext: {
    messages: [
      { role: 'user', content: 'Build a REST API with auth' },
      { role: 'assistant', content: 'I\'ll create a REST API...' },
      // ... conversation history
    ]
  },
  fileChanges: {
    'src/server.ts': { status: 'modified', lineCount: 150 },
    'src/auth/middleware.ts': { status: 'created', lineCount: 45 }
  }
};
```

---

## Screenshot Checklist

1. ✅ `01-grace-period-post-appears.png` - Grace period post in feed
2. ✅ `02-comment-input-opened.png` - Comment input expanded
3. ✅ `03-continue-typed.png` - "continue" command entered
4. ✅ `04-continue-confirmation.png` - Timeout extension confirmation
5. ✅ `05-task-continues.png` - Task running with extended timeout
6. ✅ `06-pause-typed.png` - "pause" command entered
7. ✅ `07-pause-confirmation.png` - State saved confirmation
8. ✅ `08-database-state.png` - Database inspector showing paused state
9. ✅ `09-paused-tasks-list.png` - List of paused tasks
10. ✅ `10-task-resumed.png` - Task resumed with full context
11. ✅ `11-multiple-choice-error.png` - Error when attempting second choice

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/e2e-grace-period.yml
name: E2E Grace Period Tests

on:
  pull_request:
    paths:
      - 'src/features/grace-period/**'
      - 'src/api/tasks/**'
      - 'test/e2e/grace-period-flow.spec.ts'

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: agent_feed_test
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run database migrations
        run: npm run db:migrate:test

      - name: Run E2E tests
        run: npm run test:e2e:grace-period
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/agent_feed_test

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: grace-period-screenshots
          path: screenshots/

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Running Tests Locally

### Setup
```bash
# Install dependencies
npm install
npx playwright install

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
npm run db:migrate:test

# Run all grace period E2E tests
npm run test:e2e:grace-period

# Run single scenario
npx playwright test grace-period-flow.spec.ts -g "grace period post appears"

# Run with UI mode (debugging)
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

### Environment Variables
```bash
# .env.test
DATABASE_URL=postgresql://postgres:test_password@localhost:5432/agent_feed_test
CLAUDE_API_KEY=test-key-mock
WEBSOCKET_URL=ws://localhost:3001
```

---

## Success Criteria

### Functional Requirements
- ✅ All 5 scenarios pass consistently
- ✅ No flaky tests (95%+ pass rate)
- ✅ All error cases handled gracefully
- ✅ Database state always consistent
- ✅ No race conditions detected

### Performance Requirements
- ✅ Grace period post: < 500ms latency
- ✅ Comment processing: < 200ms
- ✅ State persistence: < 100ms
- ✅ WebSocket notifications: < 100ms
- ✅ Task resumption: < 500ms

### Quality Requirements
- ✅ All screenshots captured correctly
- ✅ Database inspector verification working
- ✅ Test coverage > 90% for grace period code
- ✅ No console errors during test execution
- ✅ Accessibility checks pass (ARIA labels, keyboard nav)

---

## Maintenance

### When to Update Tests
- Backend timeout logic changes
- TodoWrite format changes
- Database schema migrations
- WebSocket protocol updates
- UI component refactoring

### Test Review Schedule
- Weekly: Review flaky test reports
- Monthly: Update performance baselines
- Quarterly: Refresh test data scenarios
- On breaking changes: Full test suite review

---

## References

- [Playwright Documentation](https://playwright.dev)
- [PostgreSQL Test Patterns](https://www.postgresql.org/docs/current/regress.html)
- [WebSocket Testing Guide](https://playwright.dev/docs/network#websockets)
- [Claude SDK Mocking](../mocking/claude-sdk-mocks.md)
- [Database Inspector](../dev-tools/database-inspector.md)

---

**Last Updated**: 2025-11-07
**Test Plan Version**: 1.0
**Status**: Ready for Implementation
