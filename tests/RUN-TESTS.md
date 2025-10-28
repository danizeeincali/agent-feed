# Integration Tests - Quick Start Guide

## Text Post and Comment Ticket Validation Tests

This guide explains how to run the comprehensive integration tests for text post and comment ticket functionality.

---

## Prerequisites

1. **Database:** `/workspaces/agent-feed/database.db` must exist
2. **Server:** API server must be running on port 3001
3. **Node.js:** Version 18+ required
4. **SQLite3:** CLI tool installed

---

## Test Files

### 1. Node.js Integration Tests
**File:** `/workspaces/agent-feed/tests/integration/text-post-validation.test.js`
**Description:** Comprehensive unit and integration tests

### 2. Shell Validation Script
**File:** `/workspaces/agent-feed/tests/validate-text-posts.sh`
**Description:** Live API testing with database verification

### 3. Comprehensive Runner
**File:** `/workspaces/agent-feed/tests/RUN-TEXT-POST-TESTS.sh`
**Description:** Complete test suite with server management

---

## Quick Start

### Option 1: Run All Tests (Recommended)

```bash
# Navigate to tests directory
cd /workspaces/agent-feed/tests

# Run comprehensive test suite
bash RUN-TEXT-POST-TESTS.sh
```

**What it does:**
- ✅ Checks server status
- ✅ Starts server if needed
- ✅ Runs Node.js integration tests
- ✅ Runs comment ticket regression tests
- ✅ Runs shell validation tests
- ✅ Verifies database state
- ✅ Analyzes server logs
- ✅ Generates summary report

**Output:** `/workspaces/agent-feed/tests/TEXT-POST-TEST-SUMMARY.md`

---

### Option 2: Run Node.js Tests Only

```bash
# Navigate to integration tests
cd /workspaces/agent-feed/tests/integration

# Run text post validation tests
node --test text-post-validation.test.js

# Run comment ticket tests
node --test comment-ticket-creation.test.js
```

**Expected Output:**
```
TAP version 13
# Subtest: Text Post Validation and Reply Posting - Integration Tests
  ok 1 - should PASS validation for text post without URL
  ok 2 - should PASS validation for comment without URL
  ...
# tests 9
# pass 8
# fail 1
```

---

### Option 3: Run Shell Validation Only

```bash
# Start server first
cd /workspaces/agent-feed/api-server
npm start &

# Wait for server to be ready
sleep 5

# Run shell tests
cd /workspaces/agent-feed/tests
bash validate-text-posts.sh
```

**Expected Output:**
```
=========================================
TEXT POST VALIDATION TEST SUITE
=========================================

📡 Checking API server...
✓ Server is running

=========================================
TEST 1: Create Text Post (No URL)
=========================================
✓ Created text post: post-1234567890
...
```

---

## Manual Validation Steps

### Step 1: Start Server

```bash
cd /workspaces/agent-feed/api-server
node server.js
```

**Wait for:**
```
✅ Token analytics database connected
✅ Agent pages database connected
✅ Proactive agent work queue initialized
🚀 Server running on port 3001
```

---

### Step 2: Create Text Post

```bash
curl -X POST http://localhost:3001/api/v1/agent-posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "title": "Test Question",
    "content": "What tools do you have access to?",
    "author_agent": "test-user"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "post-XXXXX",
    ...
  },
  "ticket": {
    "id": "UUID",
    "status": "pending"
  }
}
```

---

### Step 3: Verify Ticket in Database

```bash
# Get the ticket ID from step 2 response
TICKET_ID="<ticket-id-from-response>"

# Query database
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT id, post_id, url, status, metadata FROM work_queue_tickets WHERE id = '$TICKET_ID';"
```

**Expected:**
- `url` should be empty/null
- `status` should be "pending" or "processing"
- `metadata` should contain `"type":"post"`

---

### Step 4: Wait for Processing

```bash
# Wait 20 seconds
sleep 20

# Check status
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT status, last_error FROM work_queue_tickets WHERE id = '$TICKET_ID';"
```

**Expected:**
- `status` should be "completed" (NOT "failed")
- `last_error` should be empty/null

**If failed with "missing required fields: url":**
- ❌ Server is running old code
- ✅ Restart server to load new code

---

### Step 5: Check Agent Response

```bash
# Get post ID from step 2
POST_ID="<post-id-from-response>"

# Check for comments
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT author_agent, content FROM comments WHERE post_id = '$POST_ID';"
```

**Expected:**
- At least one comment from an agent
- Content should be a relevant response to the question

---

## Troubleshooting

### Server Not Running

**Error:** `Server is NOT running`

**Fix:**
```bash
cd /workspaces/agent-feed/api-server
npm start
```

---

### Old Code Running

**Error:** `Ticket XXX missing required fields: url`

**Cause:** Server started before code changes

**Fix:**
```bash
# Find server PID
ps aux | grep "node server.js" | grep -v grep

# Kill server
kill <PID>

# Restart
cd /workspaces/agent-feed/api-server
node server.js
```

---

### Tests Timeout

**Error:** `test did not finish before its parent and was cancelled`

**Cause:** Server not responding or slow network

**Fix:**
1. Check server is running: `curl http://localhost:3001/health`
2. Check server logs: `tail -f /tmp/server.log`
3. Increase timeout in test file

---

### Database Locked

**Error:** `database is locked`

**Cause:** Another process is writing to database

**Fix:**
```bash
# Check what's using the database
lsof /workspaces/agent-feed/database.db

# Wait a few seconds and retry
sleep 3
```

---

## Test Coverage

### What is Tested

- ✅ Text posts create tickets with `url=null`
- ✅ Comments create tickets with `url=null`
- ✅ Link posts create tickets with URL
- ✅ Validation accepts null URLs
- ✅ Validation rejects missing required fields
- ✅ Comment tickets have correct metadata
- ✅ Post tickets have correct metadata
- ✅ Orchestrator detects pending tickets
- ✅ Agent routing works correctly
- ✅ Priority ordering is correct
- ✅ skipTicket flag prevents infinite loops

### What is NOT Tested

- ❌ Actual Claude SDK execution (requires API key)
- ❌ WebSocket real-time updates
- ❌ UI rendering of posts/comments
- ❌ Authentication/authorization
- ❌ Rate limiting
- ❌ Concurrent load testing

---

## Expected Results

### Successful Run

```
╔════════════════════════════════════════════════════════════╗
║  ✅ ALL TESTS PASSED - VALIDATION COMPLETE                 ║
╚════════════════════════════════════════════════════════════╝

Test Results:
   Text Post Tests: PASSED
   Comment Tests: PASSED
   Validation Tests: PASSED

Summary report: /workspaces/agent-feed/tests/TEXT-POST-TEST-SUMMARY.md
```

### Failed Run

```
╔════════════════════════════════════════════════════════════╗
║  ❌ SOME TESTS FAILED - CHECK LOGS                          ║
╚════════════════════════════════════════════════════════════╝

Check logs:
   /tmp/text-post-test.log
   /tmp/comment-ticket-test.log
   /tmp/validate-text-posts.log
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run integration tests
        run: bash tests/RUN-TEXT-POST-TESTS.sh

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-summary
          path: tests/TEXT-POST-TEST-SUMMARY.md
```

---

## Support

### Documentation
- Test Summary: `/workspaces/agent-feed/tests/TEXT-POST-TEST-SUMMARY.md`
- Implementation Docs: `/workspaces/agent-feed/docs/`

### Logs
- Node tests: `/tmp/text-post-test.log`
- Shell tests: `/tmp/validate-text-posts.log`
- Server logs: `/tmp/server.log`

### Database Queries
```bash
# View recent tickets
sqlite3 database.db "SELECT id, status, url FROM work_queue_tickets ORDER BY created_at DESC LIMIT 10;"

# View ticket errors
sqlite3 database.db "SELECT id, last_error FROM work_queue_tickets WHERE status = 'failed' LIMIT 10;"

# View agent responses
sqlite3 database.db "SELECT post_id, author_agent, content FROM comments ORDER BY created_at DESC LIMIT 5;"
```

---

**Last Updated:** October 27, 2025
**Version:** 1.0
**Maintainer:** Integration Test Team
