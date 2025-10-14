# SPARC Specification: AVI Orchestrator Polling Fix

**Date:** 2025-10-13
**Status:** Investigation → Implementation
**Issue:** Orchestrator main loop not processing pending tickets

---

## 1. Problem Statement

**Current State:**
- Orchestrator starts successfully: `✅ AVI Orchestrator started successfully`
- 76 pending tickets in work_queue table
- ZERO tickets processed (all status='pending', worker_id=NULL)
- NO polling logs in backend (should see logs every 5 seconds)

**Evidence:**
```sql
SELECT COUNT(*) FROM work_queue WHERE status='pending';
 count: 76

SELECT id, status, worker_id FROM work_queue WHERE id >= 490;
 id  | status  | worker_id
-----+---------+-----------
 490 | pending | NULL
 491 | pending | NULL
```

**Root Cause (Hypothesis):**
The `processTickets()` method is failing silently - either:
1. `workQueue.getPendingTickets()` is returning empty array
2. `workQueue.getPendingTickets()` is throwing error (caught and logged)
3. Main loop `setInterval` is not executing
4. `this.running` flag is false

---

## 2. Functional Requirements

### FR1: Orchestrator Must Poll Every 5 Seconds
**Requirement:** Main loop executes `processTickets()` every 5 seconds

**Acceptance Criteria:**
- ✅ setInterval executes on schedule
- ✅ Console logs show "🔄 Polling for tickets..." every 5s
- ✅ Execution doesn't fail silently

### FR2: Detect Pending Tickets
**Requirement:** `workQueue.getPendingTickets()` returns pending tickets from database

**Acceptance Criteria:**
- ✅ Query returns tickets with status='pending'
- ✅ Tickets mapped correctly to PendingTicket interface
- ✅ Console logs show "📋 Found X pending tickets"

### FR3: Spawn Workers for Tickets
**Requirement:** For each pending ticket, spawn a worker

**Acceptance Criteria:**
- ✅ Worker spawned with correct ticket data
- ✅ Ticket assigned to worker (status → 'assigned')
- ✅ Console logs show "🤖 Spawning worker for ticket X"

### FR4: Debug Logging
**Requirement:** Add comprehensive logging to diagnose issues

**Acceptance Criteria:**
- ✅ Log when main loop starts
- ✅ Log each polling cycle
- ✅ Log pending ticket count
- ✅ Log errors with full stack trace
- ✅ Log worker spawning attempts

---

## 3. Investigation Plan

### Step 1: Add Debug Logging
Add console.log statements to:
- `startMainLoop()` - confirm interval is set
- `processTickets()` - confirm method executes
- `workQueue.getPendingTickets()` - confirm query executes
- Error handlers - log full error details

### Step 2: Test Database Query Directly
Run the same query the orchestrator uses:
```sql
SELECT * FROM work_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC;
```

### Step 3: Check WorkQueueAdapter
Verify `/workspaces/agent-feed/src/adapters/work-queue.adapter.ts`:
- `getPendingTickets()` implementation
- Database connection
- Error handling

---

## 4. Implementation Strategy

### Option 1: Add Debug Logging (Quick Fix)
**Pros:** Fast, diagnoses issue
**Cons:** Doesn't fix root cause

### Option 2: Fix Root Cause (Complete Solution)
**Pros:** Solves problem permanently
**Cons:** Requires identifying root cause first

### Recommended Approach:
1. Add debug logging first (Option 1)
2. Restart server and observe logs
3. Identify root cause from logs
4. Implement fix (Option 2)
5. Test with real ticket

---

## 5. Debug Logging Implementation

### Location 1: `orchestrator.ts` - Line 240
```typescript
private startMainLoop(): void {
  console.log('🔄 Starting orchestrator main loop...');
  console.log(`   Interval: ${this.config.checkInterval}ms`);

  this.intervalHandle = setInterval(async () => {
    console.log('🔄 [Main Loop] Polling cycle started');

    if (this.running && !this.shuttingDown) {
      await this.processTickets();
    } else {
      console.log('⚠️  [Main Loop] Skipped (running:', this.running, 'shuttingDown:', this.shuttingDown, ')');
    }

    console.log('✅ [Main Loop] Polling cycle completed');
  }, this.config.checkInterval);

  console.log('✅ Main loop interval set successfully');
}
```

### Location 2: `orchestrator.ts` - Line 160
```typescript
async processTickets(): Promise<void> {
  console.log('📊 [processTickets] Starting...');

  if (!this.running || this.shuttingDown) {
    console.log('⚠️  [processTickets] Aborted (running:', this.running, 'shuttingDown:', this.shuttingDown, ')');
    return;
  }

  try {
    // Get pending tickets
    console.log('🔍 [processTickets] Fetching pending tickets...');
    const pendingTickets = await this.workQueue.getPendingTickets();
    console.log(`📋 [processTickets] Found ${pendingTickets.length} pending tickets`);

    if (pendingTickets.length === 0) {
      console.log('ℹ️  [processTickets] No tickets to process');
      return;
    }

    // Process tickets...
    console.log(`🚀 [processTickets] Processing ${ticketsToProcess.length} tickets...`);

  } catch (error) {
    console.error('❌ [processTickets] Error:', error);
    console.error('❌ [processTickets] Stack:', error.stack);
  }
}
```

### Location 3: `work-queue.adapter.ts` - Line 47
```typescript
async getPendingTickets(): Promise<PendingTicket[]> {
  console.log('🔍 [WorkQueueAdapter] getPendingTickets() called');

  await this.initRepository();
  console.log('✅ [WorkQueueAdapter] Repository initialized');

  try {
    const tickets = this.repository.getAllPendingTickets
      ? await this.repository.getAllPendingTickets({ status: 'pending', limit: 100 })
      : await this.repository.getTicketsByUser(null, { status: 'pending', limit: 100 });

    console.log(`📊 [WorkQueueAdapter] Query returned ${tickets?.length || 0} tickets`);

    if (!Array.isArray(tickets)) {
      console.error('❌ [WorkQueueAdapter] Invalid response - not an array:', typeof tickets);
      throw new Error('Invalid response from repository: expected array');
    }

    return tickets.map(this.mapTicketToInterface);
  } catch (error) {
    console.error('❌ [WorkQueueAdapter] Error:', error);
    console.error('❌ [WorkQueueAdapter] Stack:', error.stack);
    throw error;
  }
}
```

---

## 6. Test Plan

### Manual Test Procedure:
1. Add debug logging to code
2. Restart backend server
3. Wait 10 seconds
4. Check logs for polling messages
5. Identify where execution stops

### Expected Logs (if working):
```
✅ AVI Orchestrator started successfully
🔄 Starting orchestrator main loop...
   Interval: 5000ms
✅ Main loop interval set successfully

[After 5 seconds]
🔄 [Main Loop] Polling cycle started
📊 [processTickets] Starting...
🔍 [processTickets] Fetching pending tickets...
🔍 [WorkQueueAdapter] getPendingTickets() called
✅ [WorkQueueAdapter] Repository initialized
📊 [WorkQueueAdapter] Query returned 76 tickets
📋 [processTickets] Found 76 pending tickets
🚀 [processTickets] Processing 10 tickets...
```

---

## 7. Ticket Cleanup Strategy

**Problem:** 76 old test tickets will be expensive to process

**Solution:** Mark old tickets as 'completed' before testing
```sql
-- Mark all tickets before ID 491 as completed (test data)
UPDATE work_queue
SET status = 'completed',
    completed_at = NOW(),
    result = '{"note": "Marked as completed - test data cleanup"}'::jsonb
WHERE id < 491 AND status = 'pending';

-- Verify only ticket 491 remains
SELECT id, status FROM work_queue WHERE status = 'pending';
```

---

## 8. Success Criteria

### Must Have:
1. ✅ Main loop executes every 5 seconds
2. ✅ Pending tickets detected from database
3. ✅ Worker spawned for ticket 491
4. ✅ Ticket 491 status changes to 'assigned'
5. ✅ Console logs show full execution flow

### Should Have:
6. ✅ Error handling logs errors properly
7. ✅ Performance acceptable (<100ms per cycle)
8. ✅ Old test tickets cleaned up

---

## 9. Rollback Plan

If fix breaks orchestrator:
1. Revert code changes
2. Restart backend
3. Orchestrator returns to previous state (running but not processing)

---

## Specification Approval: ✅ READY

**Next Steps:**
1. Add debug logging
2. Restart backend
3. Observe logs to identify root cause
4. Implement fix based on findings
