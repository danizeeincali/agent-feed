# Comment Reply Flow E2E Test Suite

## Overview

Comprehensive Playwright E2E test suite validating both critical fixes:
1. **Reply Processing Pill Visibility** - Visual feedback during reply submission
2. **Agent Response Routing** - Correct agent responds to replies

## Test Files

### Primary Test Suite
- **Location**: `/workspaces/agent-feed/tests/playwright/comment-reply-full-flow.spec.ts`
- **Configuration**: `/workspaces/agent-feed/playwright.config.reply-flow.ts`
- **Runner Script**: `/workspaces/agent-feed/tests/playwright/run-reply-flow-validation.sh`

## Test Scenarios

### Test 1: Reply Processing Pill Visibility ✅

**Validates**: Processing spinner appears during reply submission

**Steps**:
1. Navigate to http://localhost:5173
2. Find first post with comments
3. Click "Reply" on first comment
4. Type test content: "Testing reply processing pill"
5. Take screenshot: `reply-1-before-submit.png`
6. Click "Post Reply" button
7. **IMMEDIATELY** capture: `reply-2-processing-pill.png` (spinner visible)
8. Wait for form to close
9. Take screenshot: `reply-3-success.png` (comment visible)

**Assertions**:
- ✅ Spinner icon visible during submission
- ✅ "Posting..." text displayed
- ✅ Form closes after successful submission
- ✅ Reply comment appears in thread

**Expected Outcome**: Processing pill with spinner visible for 1-3 seconds

---

### Test 2: Agent Response to Reply ✅

**Validates**: Correct agent (Avi) responds to user reply

**Steps**:
1. Create new post: "Test agent reply routing"
2. Wait for Avi to comment (~10 seconds)
3. Take screenshot: `routing-1-avi-commented.png`
4. Click "Reply" on Avi's comment
5. Type: "@avi Did you receive my message?"
6. Click "Post Reply"
7. Wait for processing pill to disappear
8. Take screenshot: `routing-2-user-replied.png`
9. Wait for Avi's response (~10 seconds max)
10. Take screenshot: `routing-3-avi-responded.png`

**Assertions**:
- ✅ Avi responds to the reply (author_agent = 'avi')
- ✅ No other agent responds
- ✅ Response appears within 20 seconds
- ✅ Conversation maintains single agent thread

**Expected Outcome**: Only Avi responds to user's reply to Avi's comment

---

### Test 3: Deep Threading (Reply to Reply) ✅

**Validates**: Multi-level reply threading with consistent agent

**Steps**:
1. Create post mentioning @avi
2. Wait for Avi's first comment
3. Reply to Avi's comment
4. Wait for Avi's response
5. Reply to Avi's response (level 3)
6. Wait for Avi's third response
7. Verify all agent comments are from Avi

**Assertions**:
- ✅ Avi responds at level 1 (initial comment)
- ✅ Avi responds at level 2 (reply to reply)
- ✅ Avi responds at level 3 (deep threading)
- ✅ No other agents interfere at any level

**Expected Outcome**: Deep conversation thread maintained with single agent

---

### Test 4: Multiple Agents - Get-to-Know-You ✅

**Validates**: Different agents maintain their own threads

**Steps**:
1. Find post by Get-to-Know-You agent (or create one)
2. Reply to Get-to-Know-You agent's comment
3. Wait for agent's response (~15 seconds)
4. Verify Get-to-Know-You agent responds (NOT Avi)

**Assertions**:
- ✅ Get-to-Know-You agent responds to its own thread
- ✅ Avi does not interfere
- ✅ Conversation maintains correct agent context

**Expected Outcome**: Each agent maintains its own conversation thread

---

## Running the Tests

### Prerequisites

1. **Start Frontend**:
   ```bash
   npm run dev
   # Should run on http://localhost:5173
   ```

2. **Start Backend**:
   ```bash
   cd api-server
   npm start
   # Should run on http://localhost:3000
   ```

3. **Install Playwright** (if not already installed):
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install chromium
   ```

### Execution

#### Full Test Suite (Recommended)
```bash
./tests/playwright/run-reply-flow-validation.sh
```

#### Individual Test
```bash
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --grep "Test 1: Reply Processing Pill"
```

#### Specific Browser
```bash
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --project=chromium
```

#### Debug Mode
```bash
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --debug
```

---

## Configuration

### Test Settings
- **Timeout**: 90 seconds per test
- **Retries**: 0 (local), 2 (CI)
- **Workers**: 1 (sequential execution)
- **Headless**: false (visual debugging)
- **Viewport**: 1280x720

### Screenshot Settings
- **Directory**: `/tests/playwright/screenshots/reply-flow/`
- **Format**: PNG with timestamp
- **Capture Points**:
  - Before user action
  - During processing (spinner)
  - After completion
- **Full Page**: Yes

### Report Formats
1. **HTML Report**: `tests/playwright/reports/reply-flow-html/index.html`
   - Visual representation with embedded screenshots
   - Interactive timeline
   - Detailed trace viewer

2. **JSON Report**: `tests/playwright/reports/reply-flow-results.json`
   - Machine-readable results
   - Full test metadata
   - Timing information

3. **JUnit XML**: `tests/playwright/reports/reply-flow-junit.xml`
   - CI/CD integration format
   - Standard test result format

---

## Screenshot Gallery

### Test 1 Screenshots
- `reply-1-before-submit.png` - Form filled, ready to submit
- `reply-2-processing-pill.png` - **CRITICAL**: Spinner visible
- `reply-3-success.png` - Reply posted successfully

### Test 2 Screenshots
- `routing-0-initial-state.png` - Clean feed state
- `routing-1-avi-commented.png` - Avi's initial comment
- `routing-2-user-replied.png` - User replied to Avi
- `routing-3-avi-responded.png` - Avi responded to reply

### Test 3 Screenshots
- `deep-thread-0-start.png` - Initial post creation
- `deep-thread-1-avi-first-comment.png` - Level 1: Avi comments
- `deep-thread-2-user-first-reply.png` - Level 2: User replies
- `deep-thread-3-avi-second-comment.png` - Level 3: Avi responds
- `deep-thread-4-user-second-reply.png` - Level 4: User replies again
- `deep-thread-5-avi-third-comment.png` - Level 5: Avi responds again

### Test 4 Screenshots
- `multi-agent-0-search-gtky.png` - Looking for GTKY post
- `multi-agent-1-gtky-commented.png` - GTKY agent comment
- `multi-agent-2-user-replied-to-gtky.png` - User replied
- `multi-agent-3-gtky-responded.png` - GTKY agent responded

---

## Validation Checklist

### Visual Validation (Screenshots)
- [ ] Processing spinner visible in `reply-2-processing-pill.png`
- [ ] "Posting..." text visible during submission
- [ ] Spinner disappears after submission
- [ ] Reply comment appears in thread
- [ ] Correct agent name displayed in responses
- [ ] No duplicate comments
- [ ] Thread indentation correct

### Functional Validation (Assertions)
- [ ] Reply form submits successfully
- [ ] Processing state shown to user
- [ ] Form closes after submission
- [ ] Comment appears in database
- [ ] Correct agent responds (routing)
- [ ] No other agents interfere
- [ ] Deep threading works (3+ levels)
- [ ] Multiple agents maintain separate threads

### Database Validation
```bash
# Check reply has correct parent_comment_id
sqlite3 api-server/db/data.db "
  SELECT id, content, parent_comment_id, author_agent
  FROM comments
  WHERE content LIKE '%Testing reply%'
"

# Check agent responses
sqlite3 api-server/db/data.db "
  SELECT c1.author_agent as reply_to_agent, c2.author_agent as responding_agent
  FROM comments c1
  JOIN comments c2 ON c2.parent_comment_id = c1.id
  WHERE c2.author_agent IS NOT NULL
"
```

---

## Troubleshooting

### Test Failures

#### "Processing spinner not visible"
- **Cause**: Timing issue, spinner appears too quickly
- **Solution**: Test already captures immediately after click
- **Verify**: Check `reply-2-processing-pill.png` manually

#### "Agent did not respond"
- **Cause**: Worker queue not processing
- **Solution**: Check backend logs, restart worker
- **Verify**: `tail -f logs/backend.log`

#### "Wrong agent responded"
- **Cause**: Agent routing logic issue
- **Solution**: Check `isAviQuestion()` and orchestrator
- **Verify**: Database query for author_agent

### Server Issues

#### Frontend not running
```bash
cd /workspaces/agent-feed
npm run dev
```

#### Backend not running
```bash
cd /workspaces/agent-feed/api-server
npm start
```

#### Database locked
```bash
# Close all connections
pkill -f "node.*server.js"
pkill -f "node.*worker.js"
# Restart servers
```

### Screenshot Issues

#### Screenshots not saving
```bash
# Create directory manually
mkdir -p tests/playwright/screenshots/reply-flow
chmod 755 tests/playwright/screenshots/reply-flow
```

#### Screenshots are blank
- Check viewport size (should be 1280x720)
- Ensure `fullPage: true` in screenshot config
- Wait for elements to load before capturing

---

## Success Criteria

### All Tests Pass ✅
```
✓ Test 1: Reply Processing Pill Visibility (15s)
✓ Test 2: Agent Response to Reply (45s)
✓ Test 3: Deep Threading (Reply to Reply) (60s)
✓ Test 4: Multiple Agents - Get-to-Know-You (45s)

4 passed (165s)
```

### Screenshot Gallery Complete ✅
- 16+ screenshots captured
- All critical moments documented
- Processing spinner visible in screenshots
- Agent names clearly visible

### HTML Report Generated ✅
```bash
# Open report
npx playwright show-report tests/playwright/reports/reply-flow-html
```

---

## Next Steps

### After Tests Pass

1. **Review Screenshots**: Manually verify visual elements
2. **Database Validation**: Run SQL queries to confirm routing
3. **Performance Check**: Ensure responses under 20 seconds
4. **Edge Cases**: Test with multiple simultaneous replies
5. **Regression**: Verify fixes don't break existing features

### Production Deployment

1. Run full test suite: `./tests/playwright/run-reply-flow-validation.sh`
2. Verify all 4 tests pass
3. Review screenshot gallery
4. Check HTML report for anomalies
5. Deploy with confidence ✅

---

## References

- **Primary Spec**: `/docs/4-FIXES-DELIVERY-COMPLETE.md`
- **Quick Reference**: `/docs/4-FIXES-QUICK-REFERENCE.md`
- **Processing Pill Code**: `/frontend/src/components/CommentThread.tsx:371-397`
- **Agent Routing Code**: `/api-server/avi/orchestrator.js:270-290`

---

## Test Maintenance

### Update Test Data
Edit test content in `comment-reply-full-flow.spec.ts`:
```typescript
await textarea!.fill('Your custom test message here');
```

### Adjust Timeouts
Modify in `playwright.config.reply-flow.ts`:
```typescript
timeout: 90000, // Test timeout
expect: { timeout: 10000 } // Assertion timeout
```

### Add New Test
```typescript
test('Test 5: Your New Test', async ({ page }) => {
  test.setTimeout(60000);
  // Your test logic
});
```

---

**Last Updated**: 2025-11-14
**Status**: ✅ Ready for execution
**Test Coverage**: Processing pill visibility + Agent response routing
