# Reply Flow E2E Validation Checklist

## Pre-Test Validation ✅

### Environment Setup
- [ ] Frontend running on http://localhost:5173
- [ ] Backend running on http://localhost:3000
- [ ] Database accessible at `api-server/db/data.db`
- [ ] Worker process running (`agent-worker.js`)
- [ ] No existing test data interfering

### Dependencies
- [ ] Playwright installed: `npx playwright --version`
- [ ] Chromium browser installed
- [ ] Node.js version: 18+ or 20+
- [ ] All npm packages installed

---

## Test Execution Validation ✅

### Test 1: Processing Pill Visibility
**File**: `reply-2-processing-pill.png`

- [ ] Screenshot exists
- [ ] Spinner icon visible (rotating circle)
- [ ] "Posting..." text displayed
- [ ] Reply form still visible
- [ ] No error messages shown
- [ ] Visual feedback clear to user

**Expected Visual**:
```
┌─────────────────────────────────┐
│  Reply to Avi                   │
│  ┌───────────────────────────┐  │
│  │ Testing reply...          │  │
│  └───────────────────────────┘  │
│                                 │
│  [◐ Posting...]  [Cancel]      │ ← Spinner visible
└─────────────────────────────────┘
```

### Test 2: Agent Response Routing
**Files**: `routing-1-avi-commented.png`, `routing-2-user-replied.png`, `routing-3-avi-responded.png`

#### Screenshot 1: Avi Commented
- [ ] Post visible with content
- [ ] Avi's comment displayed
- [ ] Avatar shows "Avi"
- [ ] Timestamp present
- [ ] Reply button visible

#### Screenshot 2: User Replied
- [ ] User's reply visible
- [ ] Reply indented under Avi's comment
- [ ] "Reply to Avi" indicator shown
- [ ] Content matches: "@avi Did you receive..."

#### Screenshot 3: Avi Responded
- [ ] Avi's response visible
- [ ] Response indented under user's reply
- [ ] NO other agent visible (only Avi)
- [ ] Conversation thread maintained

**Expected Thread Structure**:
```
Post: "Test agent reply routing"
└─ Avi: "Hello! I'm here..."
   └─ You: "@avi Did you receive..."
      └─ Avi: "Yes, I received..." ← ONLY Avi responds
```

### Test 3: Deep Threading
**Files**: `deep-thread-1.png` through `deep-thread-5.png`

#### Level 1: Initial Comment
- [ ] Avi comments on post
- [ ] Avatar and name correct

#### Level 2: First Reply
- [ ] User replies to Avi
- [ ] Indentation increases

#### Level 3: Avi Responds to Reply
- [ ] Avi responds to user's reply
- [ ] Still Avi, not different agent
- [ ] Indentation further increases

#### Level 4: Second User Reply
- [ ] User replies to Avi's response
- [ ] Deep nesting visible

#### Level 5: Avi Responds Again
- [ ] Avi maintains conversation
- [ ] No agent switching occurred
- [ ] Thread coherence maintained

**Expected Deep Thread**:
```
Post: "Deep threading test"
└─ Avi: "Comment 1"
   └─ You: "Reply 1"
      └─ Avi: "Response 1" ← Same agent
         └─ You: "Reply 2"
            └─ Avi: "Response 2" ← Still same agent
```

### Test 4: Multiple Agents
**Files**: `multi-agent-1.png`, `multi-agent-2.png`, `multi-agent-3.png`

#### GTKY Agent Comment
- [ ] Get-to-Know-You agent visible
- [ ] Avatar shows GTKY
- [ ] Content relevant to agent

#### User Reply to GTKY
- [ ] Reply directed to GTKY agent
- [ ] Indentation correct

#### GTKY Agent Responds
- [ ] GTKY agent responds (NOT Avi)
- [ ] Response relevant to GTKY context
- [ ] No agent confusion

**Expected Multi-Agent Thread**:
```
Post: "Question for Get-to-Know-You"
└─ Get-to-Know-You: "I'd love to share..."
   └─ You: "Thanks! Tell me more..."
      └─ Get-to-Know-You: "Of course!..." ← GTKY, not Avi
```

---

## Database Validation ✅

### Query 1: Check Reply Structure
```bash
sqlite3 api-server/db/data.db "
  SELECT
    id,
    content,
    parent_comment_id,
    author_agent,
    created_at
  FROM comments
  WHERE content LIKE '%Testing reply%'
    OR content LIKE '%Did you receive%'
  ORDER BY created_at DESC
  LIMIT 10
"
```

**Expected Output**:
- [ ] Reply has `parent_comment_id` set
- [ ] `author_agent` is NULL (user comment)
- [ ] Timestamps sequential

### Query 2: Check Agent Responses
```bash
sqlite3 api-server/db/data.db "
  SELECT
    c1.id as reply_id,
    c1.author_agent as user_agent,
    c2.id as response_id,
    c2.author_agent as responding_agent
  FROM comments c1
  JOIN comments c2 ON c2.parent_comment_id = c1.id
  WHERE c1.author_agent IS NULL
    AND c2.author_agent IS NOT NULL
  ORDER BY c1.created_at DESC
  LIMIT 5
"
```

**Expected Output**:
- [ ] User comments (`user_agent` = NULL)
- [ ] Agent responses (`responding_agent` = 'avi' or 'get-to-know-you')
- [ ] Correct agent responds to correct thread

### Query 3: Check Thread Depth
```bash
sqlite3 api-server/db/data.db "
  WITH RECURSIVE thread AS (
    SELECT id, parent_comment_id, author_agent, 0 as depth
    FROM comments
    WHERE parent_comment_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_comment_id, c.author_agent, t.depth + 1
    FROM comments c
    JOIN thread t ON c.parent_comment_id = t.id
  )
  SELECT depth, COUNT(*) as count
  FROM thread
  GROUP BY depth
  ORDER BY depth
"
```

**Expected Output**:
- [ ] Depth 0: Original comments
- [ ] Depth 1: First-level replies
- [ ] Depth 2+: Deep threading works

---

## Backend Log Validation ✅

### Check Worker Processing
```bash
tail -50 logs/backend.log | grep -E "(Claimed task|Processing comment|isAviQuestion)"
```

**Expected Entries**:
```
[WORKER] Claimed task: comment_<id>
[WORKER] Processing comment: "<content>"
[ORCHESTRATOR] isAviQuestion: true/false
[WORKER] Selected agent: avi/get-to-know-you
[WORKER] Task completed: comment_<id>
```

**Validation**:
- [ ] Tasks claimed atomically
- [ ] `isAviQuestion()` evaluated correctly
- [ ] Correct agent selected
- [ ] No duplicate processing
- [ ] No errors in logs

### Check Agent Routing
```bash
tail -50 logs/backend.log | grep -E "(parent_comment_id|Responding agent)"
```

**Expected Entries**:
```
[ORCHESTRATOR] Comment has parent_comment_id: <id>
[ORCHESTRATOR] Parent comment author: avi
[ORCHESTRATOR] Responding agent: avi
```

**Validation**:
- [ ] Parent comment identified
- [ ] Parent author retrieved
- [ ] Correct agent selected for response

---

## Frontend Console Validation ✅

### Open Browser DevTools
In Chromium during test execution:
1. Press F12
2. Go to Console tab
3. Monitor WebSocket messages

**Expected Console Output**:
```
[WebSocket] Connected to ws://localhost:3000
[Comment] Creating reply with parent_id: <id>
[Comment] Reply posted successfully
[WebSocket] New comment received: {author_agent: "avi"}
```

**Validation**:
- [ ] WebSocket connected
- [ ] Reply sent with parent_id
- [ ] Success response received
- [ ] Real-time update triggered
- [ ] No errors in console

---

## Visual Regression Validation ✅

### Processing Pill Appearance
Compare `reply-2-processing-pill.png` with expected design:

- [ ] Spinner rotates clockwise
- [ ] Spinner color matches theme
- [ ] Text "Posting..." clearly visible
- [ ] Button disabled during processing
- [ ] Form remains open during processing
- [ ] No layout shift occurs

### Agent Avatar Display
Check all screenshots for consistent avatars:

- [ ] Avi avatar consistent across all responses
- [ ] GTKY avatar distinct from Avi
- [ ] User avatar (if shown) consistent
- [ ] Avatar placement consistent

### Thread Indentation
Verify visual hierarchy in screenshots:

- [ ] Each reply level indents further right
- [ ] Indentation consistent (e.g., 16px per level)
- [ ] Borders/lines connect thread visually
- [ ] Maximum depth readable (not too narrow)

---

## Performance Validation ✅

### Response Times
Check test output for timing:

```
Test 1: Reply Processing Pill Visibility (15s)
Test 2: Agent Response to Reply (45s)
Test 3: Deep Threading (60s)
Test 4: Multiple Agents (45s)
```

**Validation**:
- [ ] Test 1 under 20 seconds
- [ ] Test 2 under 60 seconds
- [ ] Test 3 under 90 seconds
- [ ] Test 4 under 60 seconds
- [ ] Total suite under 4 minutes

### Agent Response Latency
From backend logs:

```bash
grep "Task completed" logs/backend.log | tail -10
```

**Validation**:
- [ ] Agent responses within 15 seconds
- [ ] No timeouts occurred
- [ ] Worker queue processing efficiently

---

## HTML Report Validation ✅

### Open Report
```bash
npx playwright show-report tests/playwright/reports/reply-flow-html
```

### Check Report Sections
- [ ] All 4 tests listed
- [ ] All tests show "passed" status
- [ ] Screenshots embedded in report
- [ ] Timeline shows test progression
- [ ] No errors or warnings displayed

### Review Test Details
For each test:
- [ ] Test name descriptive
- [ ] Duration reasonable
- [ ] All steps executed
- [ ] Screenshots attached
- [ ] Traces available (if failures)

---

## Final Validation ✅

### All Tests Pass
```
✓ Test 1: Reply Processing Pill Visibility
✓ Test 2: Agent Response to Reply
✓ Test 3: Deep Threading (Reply to Reply)
✓ Test 4: Multiple Agents - Get-to-Know-You

4 passed (165s)
```

### Screenshot Gallery Complete
- [ ] 16+ screenshots captured
- [ ] All critical moments documented
- [ ] Processing spinner visible
- [ ] Agent routing correct

### Database Consistent
- [ ] No orphaned comments
- [ ] Thread structure correct
- [ ] Agent assignments correct
- [ ] Timestamps sequential

### No Regressions
- [ ] Existing functionality still works
- [ ] No new errors in logs
- [ ] Frontend responsive
- [ ] Backend stable

---

## Sign-Off Checklist ✅

Before marking complete:

1. **Execution**
   - [ ] All 4 tests passed
   - [ ] No flaky test behavior
   - [ ] Screenshots captured successfully

2. **Validation**
   - [ ] Visual validation completed
   - [ ] Database validation passed
   - [ ] Backend logs clean
   - [ ] Frontend console clean

3. **Documentation**
   - [ ] Test suite documented
   - [ ] Quick start guide created
   - [ ] Validation checklist completed

4. **Deployment Ready**
   - [ ] Tests can run in CI/CD
   - [ ] No environment-specific issues
   - [ ] Performance acceptable

---

## Issues Found (If Any)

### Issue Template
```
Issue: [Brief description]
Test: [Which test failed]
Screenshot: [Relevant screenshot]
Logs: [Error logs]
Expected: [What should happen]
Actual: [What happened]
Resolution: [How to fix]
```

### Common Issues

#### Processing Pill Not Visible
- **Cause**: Timing too fast
- **Resolution**: Test captures immediately, may need manual verification of screenshot

#### Agent Responds Slowly
- **Cause**: Worker queue backlog
- **Resolution**: Restart worker, check for blocking tasks

#### Wrong Agent Responds
- **Cause**: Routing logic issue
- **Resolution**: Check `isAviQuestion()` and orchestrator logic

---

**Validation Date**: _____________
**Validated By**: _____________
**Status**: ✅ PASS / ❌ FAIL
**Notes**: _____________
