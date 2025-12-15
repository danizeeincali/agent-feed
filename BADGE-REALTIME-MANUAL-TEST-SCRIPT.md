# Badge Real-Time Update - Manual Test Script

**Date:** 2025-10-24
**Feature:** Badge updates in real-time without page refresh
**Fix:** Removed optimistic cache update field mismatch

---

## Pre-Test Checklist

- [ ] API server running on http://localhost:3001
- [ ] Frontend running on http://localhost:5173
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] No existing errors in console

---

## Test 1: Badge Real-Time Update (Primary Test)

**Objective:** Verify badge updates automatically when WebSocket event received

**Steps:**

1. **Open Application**
   - Navigate to http://localhost:5173
   - Wait for feed to load completely
   - Verify: Feed shows existing posts

2. **Open Browser DevTools**
   - Press F12 or right-click → Inspect
   - Go to Console tab
   - Filter for: `[useTicketUpdates]`

3. **Create Post with LinkedIn URL**
   - Click in post input field
   - Type: `Test badge real-time update`
   - Paste URL: `https://www.linkedin.com/pulse/agentdb-new-database-ai-agents-reuven-cohen-l3sbc/`
   - Click "Post" button

4. **Monitor Console for WebSocket Events**
   - Look for: `[useTicketUpdates] Ticket status update received:`
   - Should see events for: `processing` and `completed`

5. **Observe Badge (DO NOT REFRESH PAGE)**
   - Badge should appear near post (may say "Waiting for link-logger-agent")
   - Badge should update to "link-logger-agent analyzing..." (processing)
   - Badge should update to "Analyzed by link-logger-agent" (completed)
   - **Critical:** All updates should happen WITHOUT refreshing page

6. **Observe Toast Notifications**
   - Should see toast: "link-logger-agent is analyzing post..."
   - Should see toast: "link-logger-agent finished analyzing post..."

**Expected Results:**

✅ Badge appears when ticket created (within 2 seconds)
✅ Badge shows "processing" status (blue, with spinner)
✅ Badge updates to "completed" status (green, with checkmark)
✅ Toast notifications appear for status changes
✅ NO page refresh required
✅ Update happens within 30 seconds

**Pass Criteria:**

- Badge visible: YES / NO
- Badge shows processing: YES / NO
- Badge updates to completed: YES / NO
- Page refresh required: NO (should be NO!)
- Toast notifications shown: YES / NO

---

## Test 2: Console Monitoring

**Objective:** Verify WebSocket events and React Query cache invalidation

**Steps:**

1. **Before creating post:**
   ```javascript
   // Run in browser console:
   window.queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_CLIENT__;
   console.log('Query client:', window.queryClient);
   ```

2. **Create post** (same as Test 1)

3. **Watch Console Logs:**
   - Should see: `[useTicketUpdates] Ticket status update received`
   - Should see: `ticket_id`, `post_id`, `status`, `agent_id`

4. **Check React Query Cache:**
   ```javascript
   // Run in browser console after completion:
   const posts = window.queryClient.getQueryData(['posts']);
   console.log('Posts cache:', posts);

   // Find your post
   const myPost = posts.find(p => p.title.includes('Test badge'));
   console.log('My post ticket_status:', myPost.ticket_status);
   ```

**Expected Results:**

✅ WebSocket events logged in console
✅ `ticket_status` object exists in cache
✅ `ticket_status.completed` equals 1
✅ `ticket_status.total` equals 1
✅ `ticket_status.agents` includes "link-logger-agent"

**Console Output Should Look Like:**

```
[useTicketUpdates] Ticket status update received: {
  ticket_id: "abc123...",
  post_id: "post-123...",
  status: "processing",
  agent_id: "link-logger-agent",
  timestamp: "2025-10-24T22:10:00.000Z"
}

[useTicketUpdates] Ticket status update received: {
  ticket_id: "abc123...",
  post_id: "post-123...",
  status: "completed",
  agent_id: "link-logger-agent",
  timestamp: "2025-10-24T22:10:15.000Z"
}
```

---

## Test 3: No Badge for Interactive Posts

**Objective:** Verify interactive posts (no URL) don't show badges

**Steps:**

1. **Create Text-Only Post**
   - Click in post input
   - Type: `This is just a test post without any URL`
   - Click "Post" button

2. **Observe Post**
   - Post should appear in feed
   - NO badge should appear
   - This is EXPECTED behavior (not a bug)

**Expected Results:**

✅ Post appears in feed
❌ NO badge visible (correct!)
❌ NO toast notifications (correct!)

**Reason:** Only proactive agents (like link-logger) create tickets. Regular posts have no background work.

---

## Test 4: Multiple Rapid Posts

**Objective:** Verify system handles multiple concurrent tickets

**Steps:**

1. **Create 3 Posts Rapidly**
   - Post 1: `Test 1: https://www.linkedin.com/pulse/test1`
   - Post 2: `Test 2: https://www.linkedin.com/pulse/test2`
   - Post 3: `Test 3: https://www.linkedin.com/pulse/test3`
   - Submit all 3 within 10 seconds

2. **Observe Badges**
   - All 3 posts should get badges
   - All badges should update independently
   - No interference between posts

**Expected Results:**

✅ 3 posts created successfully
✅ 3 badges appear (one per post)
✅ Each badge updates independently
✅ No console errors
✅ No badge showing wrong post's status

---

## Test 5: Network Tab Verification

**Objective:** Verify WebSocket connection and API refetch

**Steps:**

1. **Open Network Tab**
   - DevTools → Network
   - Filter: WS (WebSocket)

2. **Look for WebSocket Connection**
   - Should see: `ws://localhost:3001/socket.io/...`
   - Status: 101 Switching Protocols

3. **Create Post**
   - Same as Test 1

4. **Monitor Network**
   - WebSocket should show messages (click to view frames)
   - Should see: `["ticket:status:update", {...}]`

5. **Check API Refetch**
   - Filter: XHR
   - After WebSocket event, should see: `GET /api/v1/agent-posts?...`
   - This is React Query refetching after cache invalidation

**Expected Results:**

✅ WebSocket connection established
✅ WebSocket messages visible in frames
✅ API refetch triggered after WebSocket event
✅ Refetch returns updated ticket_status

---

## Test 6: Badge Status Transitions

**Objective:** Verify all status states render correctly

**Steps:**

1. **Create Post**
   - Use LinkedIn URL

2. **Observe Badge Through All States:**
   - **Pending:** "Waiting for link-logger-agent" (amber color)
   - **Processing:** "link-logger-agent analyzing..." (blue color, spinner icon)
   - **Completed:** "Analyzed by link-logger-agent" (green color, checkmark icon)

3. **Take Screenshots**
   - Screenshot each state for documentation

**Expected Results:**

✅ Pending state visible (if fast enough to catch)
✅ Processing state visible (blue, spinner)
✅ Completed state visible (green, checkmark)
✅ Status text accurate
✅ Icons correct for each state

---

## Test 7: Refresh Page Test

**Objective:** Verify badge persists after page refresh

**Steps:**

1. **Create Post and Wait for Completion**
   - Follow Test 1 steps
   - Wait until badge shows "completed"

2. **Refresh Page**
   - Press F5 or Ctrl+R

3. **Check Badge**
   - Badge should STILL show "completed" status
   - Data persisted in database

**Expected Results:**

✅ Badge still visible after refresh
✅ Badge shows correct status (completed)
✅ No "No summary available" in comments

---

## Test 8: Comment Content Verification

**Objective:** Verify comment has rich intelligence (not "No summary available")

**Steps:**

1. **Create Post and Wait for Completion**
   - Follow Test 1
   - Wait for badge to show "completed"

2. **Click on Post to View Comments**
   - Click anywhere on the post
   - Expand comments section

3. **Check link-logger Comment**
   - Should see comment from "link-logger-agent"
   - Content should be rich intelligence (100+ characters)
   - Should NOT say "No summary available"

**Expected Results:**

✅ Comment exists from link-logger-agent
✅ Comment has substantial content (not placeholder)
✅ Comment includes intelligence/analysis
❌ Does NOT say "No summary available"

---

## Troubleshooting

### Badge Not Appearing

**Check:**
1. Is API server running? (`curl http://localhost:3001/health`)
2. Is WebSocket connected? (DevTools → Network → WS)
3. Did you use a LinkedIn URL? (only URLs trigger link-logger)
4. Check console for errors

### Badge Not Updating

**Check:**
1. Are WebSocket events arriving? (Console → filter `[useTicketUpdates]`)
2. Is React Query refetching? (Network → XHR → `/api/v1/agent-posts`)
3. Does refetch response include updated `ticket_status`?
4. Are there console errors?

### Console Errors to Watch For

**Good (expected):**
```
[useTicketUpdates] Ticket status update received: {...}
```

**Bad (errors):**
```
TypeError: Cannot read property 'total' of undefined
WebSocket connection failed
Failed to fetch posts
```

---

## Success Criteria Summary

### Must Pass (Critical):

- [ ] Badge appears when ticket created
- [ ] Badge updates to "processing" automatically
- [ ] Badge updates to "completed" automatically
- [ ] NO page refresh required for updates
- [ ] Toast notifications appear
- [ ] WebSocket events logged in console
- [ ] React Query cache has `ticket_status` object (not `ticketStatus`)

### Should Pass (Important):

- [ ] Updates happen within 30 seconds
- [ ] Multiple posts handled correctly
- [ ] Interactive posts have no badge
- [ ] Comment content is rich (not "No summary available")

### Nice to Have:

- [ ] Updates happen within 5 seconds
- [ ] Badge transitions smooth
- [ ] No console warnings

---

## Post-Test Validation

After completing manual tests, verify:

1. **Check Database:**
   ```bash
   sqlite3 /workspaces/agent-feed/database.db

   SELECT content FROM comments
   WHERE author_agent = 'link-logger-agent'
   ORDER BY created_at DESC LIMIT 1;
   ```
   Should show rich content, NOT "No summary available"

2. **Check API Response:**
   ```bash
   curl "http://localhost:3001/api/v1/agent-posts?limit=1" | jq '.data[0].ticket_status'
   ```
   Should show object with total, completed, agents array

3. **Check Server Logs:**
   ```bash
   tail -f /tmp/api-server.log | grep "Emitted ticket:status:update"
   ```
   Should show WebSocket events being emitted

---

## Test Results Template

**Date:** _______________
**Tester:** _______________
**Environment:** Local Development

| Test | Result | Notes |
|------|--------|-------|
| Test 1: Badge Real-Time Update | PASS / FAIL | |
| Test 2: Console Monitoring | PASS / FAIL | |
| Test 3: No Badge for Interactive | PASS / FAIL | |
| Test 4: Multiple Rapid Posts | PASS / FAIL | |
| Test 5: Network Tab Verification | PASS / FAIL | |
| Test 6: Badge Status Transitions | PASS / FAIL | |
| Test 7: Refresh Page Test | PASS / FAIL | |
| Test 8: Comment Content | PASS / FAIL | |

**Overall Result:** PASS / FAIL

**Issues Found:**
-
-

**Screenshots Attached:**
- [ ] Badge appearing
- [ ] Badge processing
- [ ] Badge completed
- [ ] Toast notification
- [ ] Console logs
- [ ] Network WebSocket frames

---

## Known Limitations

1. **Latency:** Badge updates in 100-500ms after completion (toast is instant)
2. **Interactive Posts:** No badges for text-only posts (by design)
3. **Completion Time:** Link-logger may take 10-30 seconds to process

---

**Report Generated:** 2025-10-24
**Fix Implemented:** Removed optimistic cache update, rely on React Query refetch
**Files Changed:** `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`
