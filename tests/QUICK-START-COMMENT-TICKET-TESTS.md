# Quick Start: Comment Ticket Tests

Run these tests to verify the comment ticket creation system works correctly.

## Prerequisites

1. **Backend server running**:
   ```bash
   cd /workspaces/agent-feed/api-server
   npm start
   ```

2. **Database exists**: `/workspaces/agent-feed/database.db`

3. **Required tools**:
   - Node.js 18+ (for native test runner)
   - `sqlite3` CLI tool
   - `jq` for JSON parsing (bash script only)

## Quick Test (30 seconds)

Run the bash validation script for a complete end-to-end test:

```bash
cd /workspaces/agent-feed
./tests/validate-comment-tickets.sh
```

**Expected output**:
```
✅ Server is running
✅ Database exists
✅ work_queue_tickets table exists
✅ Created test post
✅ Created comment
✅ Ticket created
✅ Metadata has type=comment
✅ Orchestrator can find pending ticket(s)
✅ Exactly 1 agent reply (no infinite loop)
✅ skipTicket works
✅ ALL VALIDATION TESTS PASSED
```

## Full Test Suite (2 minutes)

Run all integration tests:

```bash
cd /workspaces/agent-feed

# Test 1: Comment ticket creation (8 tests)
node --test tests/integration/comment-ticket-creation.test.js

# Test 2: Work queue selector compatibility (10 tests)
node --test tests/integration/work-queue-selector.test.js

# Test 3: End-to-end bash validation
./tests/validate-comment-tickets.sh
```

## Individual Tests

### Test 1: Comment Ticket Creation
```bash
node --test tests/integration/comment-ticket-creation.test.js
```

Tests:
- Comment creates ticket in work_queue_tickets
- Ticket metadata has type=comment
- Orchestrator finds comment tickets
- skipTicket prevents infinite loops
- Agent routing works
- Priority ordering correct

### Test 2: Work Queue Selector
```bash
node --test tests/integration/work-queue-selector.test.js
```

Tests:
- SQLite vs PostgreSQL mode detection
- Repository interface compatibility
- createTicket() works
- getAllPendingTickets() works
- Retry logic (3 attempts)
- Metadata serialization

### Test 3: Bash Validation
```bash
./tests/validate-comment-tickets.sh
```

Tests:
- End-to-end flow: comment → ticket → agent reply
- Database schema correct
- Orchestrator processes tickets
- NO infinite loops

## What's Being Tested

### Critical Flow
```
1. User posts comment
   ↓
2. System creates ticket in work_queue_tickets
   ↓
3. Orchestrator finds ticket with getAllPendingTickets()
   ↓
4. Agent processes ticket and posts reply
   ↓
5. Reply has skipTicket=true → NO new ticket (prevents infinite loop)
```

### Bug That Was Fixed
- **Before**: Comments created tickets but orchestrator couldn't find them
- **After**: Comments create tickets with correct metadata, orchestrator detects and processes them
- **Critical**: `skipTicket=true` prevents agent replies from creating new tickets

## Interpreting Results

### ✅ All Tests Pass
Everything is working correctly. Comment ticket creation is functional and infinite loops are prevented.

### ❌ Test Failures

#### "Server not running"
**Solution**: Start the backend server:
```bash
cd /workspaces/agent-feed/api-server
npm start
```

#### "Table not found"
**Solution**: Database schema is missing. Check if migrations ran:
```bash
sqlite3 /workspaces/agent-feed/database.db ".schema work_queue_tickets"
```

#### "Orchestrator not processing tickets"
**Solution**: Enable orchestrator:
```bash
export AVI_ORCHESTRATOR_ENABLED=true
cd api-server && npm start
```

#### "Infinite loop detected"
**Solution**: `skipTicket` flag not working. Check:
- `/workspaces/agent-feed/api-server/server.js` lines 1619, 1756
- Ensure agent replies include `skipTicket: true`

## Cleanup

Tests automatically clean up test data. If cleanup fails:

```bash
# Manual cleanup
sqlite3 /workspaces/agent-feed/database.db "DELETE FROM work_queue_tickets WHERE user_id='test-user';"
sqlite3 /workspaces/agent-feed/database.db "DELETE FROM comments WHERE author_agent LIKE '%test%';"
sqlite3 /workspaces/agent-feed/database.db "DELETE FROM posts WHERE author_agent='test-agent';"
```

## Next Steps

After tests pass:
1. **Monitor orchestrator logs** to see ticket processing in real-time
2. **Test with real agents** by posting comments with agent mentions
3. **Check for infinite loops** in production by monitoring ticket creation rate

## Troubleshooting Commands

```bash
# Check server status
curl http://localhost:3001/health

# Count pending tickets
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) FROM work_queue_tickets WHERE status='pending';"

# View recent tickets
sqlite3 /workspaces/agent-feed/database.db "SELECT id, status, metadata FROM work_queue_tickets ORDER BY created_at DESC LIMIT 5;"

# Check orchestrator status
curl http://localhost:3001/api/avi/status

# View test logs
tail -f /tmp/comment-ticket-validation.log
```

## Test Coverage Summary

| Component | Tests | Status |
|-----------|-------|--------|
| Comment ticket creation | 8 | ✅ |
| Work queue selector | 10 | ✅ |
| End-to-end flow | 7 | ✅ |
| **TOTAL** | **25** | **✅** |

## Questions?

- **Full documentation**: `/workspaces/agent-feed/tests/COMMENT-TICKET-TEST-SUITE.md`
- **Implementation details**: `/workspaces/agent-feed/docs/COMMENT-TICKET-IMPLEMENTATION.md`
- **Bug report**: Check orchestrator logs for errors
