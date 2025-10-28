# Quick Start - CommentThread Reply Tests

## Prerequisites

Before running the tests, ensure:

1. **Backend server is running** on `localhost:3001`
2. **SQLite database exists** at `/workspaces/agent-feed/database.db`

## 1. Start Backend Server

```bash
cd /workspaces/agent-feed/api-server
node server.js
```

You should see:
```
Server running on port 3001
Database: SQLite (database.db)
```

## 2. Run Tests

**Option A: Using Test Runner Script** (Recommended)
```bash
cd /workspaces/agent-feed
./tests/RUN-COMMENTTHREAD-TESTS.sh
```

**Option B: Direct Execution**
```bash
cd /workspaces/agent-feed
node tests/integration/comment-thread-reply.test.js
```

## Expected Output

```
🧪 CommentThread Reply Functionality - Integration Tests

======================================================================
📝 Setting up test post...
✅ Test post created: test-post-xxxxx

TEST 1: API Endpoint Validation
----------------------------------------------------------------------
✅ POST /api/agent-posts/:postId/comments endpoint is accessible

TEST 2: Create Top-Level Comment (parent_id = null)
----------------------------------------------------------------------
✅ Top-level comment created successfully
   Comment ID: xxxx
   parent_id in DB: null (should be null)
   Content: "This is a top-level comment"

TEST 3: Create Reply with parent_id (Threading Test)
----------------------------------------------------------------------
   Created parent comment: xxxx
✅ Reply created successfully with correct parent_id
   Reply ID: xxxx
   parent_id in DB: xxxx
   Expected parent_id: xxxx
   Match: YES

... [Tests 4-10] ...

======================================================================

📊 TEST SUMMARY

Total Tests: 10
✅ Passed: 10
❌ Failed: 0
Success Rate: 100.0%

🎉 ALL TESTS PASSED!
```

## What Gets Tested

| # | Test | Coverage |
|---|------|----------|
| 1 | API Endpoint Validation | Endpoint accessibility |
| 2 | Top-Level Comment | parent_id = null |
| 3 | Reply with parent_id | Threading basics |
| 4 | Nested Reply Chain | 3-level deep threading |
| 5 | Error - Missing Content | Validation |
| 6 | Error - Invalid parent_id | Foreign key constraint |
| 7 | Database CASCADE Delete | Integrity |
| 8 | Full Thread Structure | Complex threads |
| 9 | API Response Format | Response validation |
| 10 | Concurrent Replies | Performance |

## Troubleshooting

### Error: Backend server is NOT running

**Solution**:
```bash
# In a separate terminal
cd /workspaces/agent-feed/api-server
node server.js
```

Keep this terminal open while running tests.

### Error: SQLite database not found

**Solution**:
```bash
# Check if database exists
ls -la /workspaces/agent-feed/database.db

# If missing, create it (backend should auto-create)
cd /workspaces/agent-feed/api-server
node server.js  # This will create the database
```

### Tests Fail

1. **Check backend logs** for errors
2. **Verify database schema**:
   ```bash
   sqlite3 database.db ".schema comments"
   ```
3. **Check port 3001** is not in use:
   ```bash
   lsof -i :3001
   ```

## Files

- **Test Suite**: `/workspaces/agent-feed/tests/integration/comment-thread-reply.test.js`
- **Test Runner**: `/workspaces/agent-feed/tests/RUN-COMMENTTHREAD-TESTS.sh`
- **Documentation**: `/workspaces/agent-feed/tests/integration/COMMENTTHREAD-TEST-SUMMARY.md`
- **Quick Start**: `/workspaces/agent-feed/tests/integration/QUICK-START-COMMENTTHREAD.md`

## Next Steps After Tests Pass

1. ✅ All backend integration tests pass
2. 🌐 Test in browser at `http://localhost:5173`
3. 🔍 Verify comment threading in UI
4. 📝 Test reply functionality manually
5. 🚀 Deploy to production

---

**Ready to run?** Just execute:
```bash
./tests/RUN-COMMENTTHREAD-TESTS.sh
```
