# Verification Guide for Database Mismatch Fix

## Quick Verification

### 1. Check SQLite Mode (Default)
```bash
# Set environment to SQLite mode
export USE_POSTGRES=false

# Start server
npm start

# Expected logs:
# ✅ Token analytics database connected: /workspaces/agent-feed/database.db
# ✅ Proactive agent work queue initialized (SQLite for proactive agents)
# ✅ Work queue selector initialized
# 📋 Work Queue Mode: SQLite
# 🤖 Starting AVI Orchestrator...
# ✅ AVI Orchestrator started - using SQLite work queue
```

### 2. Check PostgreSQL Mode
```bash
# Set environment to PostgreSQL mode
export USE_POSTGRES=true

# Start server
npm start

# Expected logs:
# 📊 Database Mode: PostgreSQL
# 📋 Work Queue Mode: PostgreSQL
# ✅ PostgreSQL connection established
# ✅ Work queue selector initialized
# 🤖 Starting AVI Orchestrator...
# ✅ AVI Orchestrator started - using PostgreSQL work queue
```

## Functional Testing

### Test 1: Create Post and Verify Ticket (SQLite)
```bash
# Create a test post
curl -X POST http://localhost:3001/api/v1/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "Testing work queue ticket creation",
    "author_agent": "test-agent"
  }'

# Check server logs for:
# ✅ Work ticket created for post: ticket-[ID]
# Should see SQLite database queries
```

### Test 2: Check Work Queue Table (SQLite)
```bash
# Open SQLite database
sqlite3 /workspaces/agent-feed/database.db

# Query work queue tickets
SELECT id, agent_id, priority, status, created_at
FROM work_queue_tickets
WHERE status = 'pending'
ORDER BY priority ASC, created_at ASC;

# Should see your test ticket
```

### Test 3: Orchestrator Polling (SQLite)
```bash
# Watch server logs for orchestrator activity
tail -f logs/server.log | grep -E "📋|🔍"

# Expected output every 5 seconds:
# 🔍 [SQLiteWorkQueueRepository] getAllPendingTickets query: { status: 'pending', limit: 100, offset: 0 }
# 📊 [SQLiteWorkQueueRepository] Query result: 1 tickets found
#    First ticket: ID=..., status=pending, priority=P1
```

## Validation Checklist

### Code Changes Verified
- [x] `/api-server/config/work-queue-selector.js` created
- [x] `/api-server/repositories/work-queue-repository.js` has `getAllPendingTickets()`
- [x] `/api-server/repositories/postgres/work-queue.repository.js` has `getPendingTickets()`
- [x] `/api-server/server.js` line 26 imports `workQueueSelector`
- [x] `/api-server/server.js` lines 85-87 initialize selector
- [x] `/api-server/server.js` line 1133 uses `workQueueSelector.repository`
- [x] `/api-server/server.js` line 1631 uses `workQueueSelector.repository`
- [x] `/api-server/server.js` line 1768 uses `workQueueSelector.repository`
- [x] `/api-server/server.js` line 4340 passes `workQueueSelector.repository` to orchestrator

### Runtime Behavior
- [ ] Server starts without errors in SQLite mode
- [ ] Server starts without errors in PostgreSQL mode
- [ ] Work queue selector logs show correct mode
- [ ] Post creation generates work ticket in correct database
- [ ] Comment creation generates work ticket in correct database
- [ ] Orchestrator polls correct table (work_queue_tickets vs work_queue)
- [ ] Orchestrator processes tickets successfully
- [ ] No "table not found" errors in logs
- [ ] No silent failures

### Database Integrity
- [ ] SQLite: work_queue_tickets table populated correctly
- [ ] PostgreSQL: work_queue table populated correctly
- [ ] Ticket fields match expected schema
- [ ] Priority values are correct (P0-P3 or 0-10 depending on database)
- [ ] Timestamps are accurate
- [ ] Status transitions work (pending → in_progress → completed)

## Troubleshooting

### Issue: "work_queue table not found"
**Cause**: Server is in SQLite mode but trying to use PostgreSQL
**Solution**: Check that `workQueueSelector.initialize(db)` is called after database connection

### Issue: "work_queue_tickets table not found"
**Cause**: Server is in PostgreSQL mode but trying to use SQLite
**Solution**: Verify `USE_POSTGRES=true` environment variable is set

### Issue: Orchestrator not picking up tickets
**Cause**: Repository mismatch between ticket creation and orchestrator
**Solution**: Ensure orchestrator receives `workQueueSelector.repository` not `proactiveWorkQueue`

### Issue: Silent failures with no errors
**Cause**: Old hardcoded PostgreSQL import still in use
**Solution**: Search for remaining `import workQueueRepository from './repositories/postgres/work-queue.repository.js'` and replace with selector

## Performance Validation

### Expected Performance
- Post creation + ticket: < 100ms
- Orchestrator poll cycle: < 50ms
- Ticket processing: depends on agent complexity

### Monitor Performance
```bash
# Watch server logs for timing
grep -E "took|duration|ms" logs/server.log

# Check database query performance
# SQLite: Should be instant (in-memory)
# PostgreSQL: Should be < 10ms for indexed queries
```

## Success Criteria

✅ **Fix is successful if:**
1. Server starts in both SQLite and PostgreSQL modes
2. Correct work queue mode is logged on startup
3. Posts create tickets in the correct database
4. Orchestrator queries the correct table
5. No database mismatch errors in logs
6. Tickets are processed end-to-end successfully

## Next Steps After Verification

1. Run existing integration tests: `npm test`
2. Test comment-to-ticket flow
3. Test agent worker execution
4. Monitor production logs for any issues
5. Update deployment documentation
