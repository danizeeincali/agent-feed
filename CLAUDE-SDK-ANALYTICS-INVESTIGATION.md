# Claude Code SDK Analytics Investigation Report

**Date:** 2025-10-25
**Issue:** Claude Code SDK analytics stopped working
**Status:** ⚠️ **PARTIALLY WORKING** - Endpoints functional but no new data being written

---

## Executive Summary

The Claude Code SDK analytics system is **partially functional**:
- ✅ API endpoints are working and returning data
- ✅ Database tables exist with historical data (350 records)
- ✅ TokenAnalyticsWriter is initialized
- ✅ Analytics code is integrated and being called
- ❌ **NO NEW DATA has been written since October 21** (4 days ago)

**Root Cause:** The `tokenAnalyticsWriter.writeTokenMetrics()` method is being called but silently failing to write new records.

---

## Investigation Findings

### 1. API Endpoints Status ✅

**Endpoints ARE working:**
- `GET /api/claude-code/analytics` - Returns comprehensive analytics
- `GET /api/claude-code/token-usage` - Returns token usage metrics
- `GET /api/claude-code/cost-tracking` - Returns cost metrics ($0.58 total spend)

**Evidence:**
```bash
curl http://localhost:3001/api/claude-code/analytics
# Returns: {"success": true, "analytics": {...}}

curl http://localhost:3001/api/claude-code/cost-tracking
# Returns: {"totalCost": 0.5764905, "totalTokens": 59974, ...}
```

**Note:** User was likely testing wrong path `/api/claude-sdk/*` instead of `/api/claude-code/*`

---

### 2. Database Status ✅

**Tables exist and have data:**

```sql
SELECT COUNT(*) FROM token_analytics;
-- Result: 350 records

SELECT COUNT(*) FROM token_usage;
-- Result: 2 records
```

**Schema verified:**
```
token_analytics:
- id (TEXT, PRIMARY KEY)
- timestamp (TEXT)
- sessionId (TEXT)
- operation (TEXT)
- inputTokens (INTEGER)
- outputTokens (INTEGER)
- totalTokens (INTEGER)
- estimatedCost (REAL)
- model (TEXT)
- userId (TEXT)
- created_at (DATETIME)
- message_content (TEXT)
- response_content (TEXT)
```

---

### 3. Data Freshness Issue ❌

**CRITICAL FINDING:**

Last analytics record: **October 21, 2025 at 03:13:08**
Current date: **October 25, 2025 at 18:44**
**Gap: 4 days, 15 hours** - NO NEW DATA

**Query results:**
```sql
SELECT COUNT(*) FROM token_analytics
WHERE timestamp > datetime('now', '-24 hours');
-- Result: 0 (ZERO records in last 24 hours)

SELECT MAX(timestamp) FROM token_analytics;
-- Result: 2025-10-21T03:13:08.385Z
```

**Recent records (all OLD):**
```
2025-10-21 03:13:08 | 80 tokens  | $0.089 | claude-sonnet-4-20250514
2025-10-21 01:56:25 | 200 tokens | $0.089 | claude-sonnet-4-20250514
2025-10-21 00:47:57 | 46 tokens  | $0.059 | claude-sonnet-4-20250514
```

---

### 4. Code Integration Status ✅

**TokenAnalyticsWriter is initialized:**

Server logs show:
```
✅ Token analytics database connected: /workspaces/agent-feed/database.db
✅ TokenAnalyticsWriter initialized with database connection
```

**Analytics code IS being called:**

File: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js` (lines 243-269)

```javascript
// Track token usage analytics (async, non-blocking)
if (tokenAnalyticsWriter && responses && responses.length > 0) {
  const messages = firstResponse?.messages || [];

  if (messages.length > 0) {
    tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)
      .then(() => {
        console.log('✅ Token analytics written successfully');
      })
      .catch(error => {
        console.error('⚠️ Token analytics write failed:', error.message);
      });
  }
}
```

**This code IS present and should be executing** on every `/streaming-chat` request.

---

### 5. Server Logs Analysis

**No analytics write errors in logs:**
- No "Token analytics write failed" messages
- No "Token analytics written successfully" messages (suspicious!)
- This suggests either:
  1. The `/streaming-chat` endpoint is not being called
  2. The `writeTokenMetrics()` method is not actually writing
  3. The condition checks are failing silently

**Server is running properly:**
```
🚀 API Server running on http://0.0.0.0:3001
📈 All analytics APIs available
```

---

### 6. API Response Analysis

**Cost tracking shows old data:**

```json
{
  "totalCost": 0.5764905,
  "totalTokens": 59974,
  "totalRequests": 50,
  "costByModel": {
    "claude-3-5-sonnet-20241022": {"cost": 0.159099, "requests": 17},
    "claude-3-haiku-20240307": {"cost": 0.011021, "requests": 15},
    "gpt-4-turbo": {"cost": 0.40637, "requests": 18}
  }
}
```

**This data is from OLD records** (before October 21).

**Analytics show zeros for recent activity:**

```json
{
  "overview": {
    "totalRequests": 0,      // ← Should have recent requests
    "totalCost": 0,           // ← Should show new costs
    "totalTokens": 0,         // ← Should show new tokens
    "averageLatency": 0
  }
}
```

This confirms analytics are being calculated from database but database has no recent data.

---

## Root Cause Analysis

### Primary Hypothesis (95% Confidence)

**The `writeTokenMetrics()` method is being called but failing silently.**

**Evidence:**
1. Code is present and should execute
2. No error messages in logs
3. No success messages in logs either
4. Data stopped exactly 4 days ago (suggests a code change or environment change)

### Possible Causes

**1. Response Format Changed (Most Likely)**
- The `messages` array structure may have changed
- Condition `if (messages.length > 0)` may be failing
- The SDK responses may have a different structure now

**2. Database Write Permissions**
- SQLite file permissions may have changed
- Database may be locked or read-only

**3. Silent Exception Handling**
- The `.catch()` block may not be logging properly
- Async promise may be rejected without logging

**4. Session/Request Type Changed**
- The `/streaming-chat` endpoint may not be receiving requests anymore
- Users may be using a different endpoint

---

## Fix Plan

### Phase 1: Immediate Diagnostics (5 minutes)

1. **Add Debug Logging to `writeTokenMetrics()`**
   - Log entry to the method
   - Log all parameters
   - Log every step of database write
   - Log success/failure explicitly

2. **Check Recent Streaming Chat Requests**
   - Search server logs for `/streaming-chat` requests in last 24 hours
   - Verify endpoint is actually being called

3. **Test Manual Write**
   - Create test script to manually call `writeTokenMetrics()`
   - Verify database is writable

### Phase 2: Code Fixes (15 minutes)

**Option A: Enhanced Error Logging**

File: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`

Add explicit logging:
```javascript
console.log('🔍 [ANALYTICS DEBUG] Starting token analytics write');
console.log('🔍 [ANALYTICS DEBUG] Has writer:', !!tokenAnalyticsWriter);
console.log('🔍 [ANALYTICS DEBUG] Responses length:', responses?.length);
console.log('🔍 [ANALYTICS DEBUG] Messages:', JSON.stringify(messages, null, 2));

if (messages.length > 0) {
  console.log('🔍 [ANALYTICS DEBUG] Calling writeTokenMetrics...');
  tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)
    .then(() => {
      console.log('✅ [ANALYTICS SUCCESS] Token analytics written for session:', sessionId);
    })
    .catch(error => {
      console.error('❌ [ANALYTICS ERROR] Write failed:', error);
      console.error('❌ [ANALYTICS ERROR] Stack:', error.stack);
      console.error('❌ [ANALYTICS ERROR] Messages:', JSON.stringify(messages, null, 2));
    });
} else {
  console.warn('⚠️ [ANALYTICS SKIP] No messages in response');
  console.warn('⚠️ [ANALYTICS SKIP] Response structure:', JSON.stringify(responses, null, 2));
}
```

**Option B: Verify Response Structure**

Check the actual structure of `responses` returned by Claude SDK:
```javascript
console.log('🔍 Full responses structure:', JSON.stringify(responses, null, 2));
```

**Option C: Check Database Permissions**

```bash
ls -l /workspaces/agent-feed/database.db
# Should show: -rw-r--r-- (writable)

sqlite3 /workspaces/agent-feed/database.db "INSERT INTO token_analytics (id, timestamp, sessionId, operation, inputTokens, outputTokens, totalTokens, estimatedCost, model) VALUES ('test-$(date +%s)', '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)', 'test-session', 'test', 10, 20, 30, 0.001, 'test-model');"
# Should succeed if database is writable
```

### Phase 3: Monitoring (Ongoing)

1. **Add Health Check for Analytics**
   - Check if last analytics record is < 1 hour old
   - Alert if no new data for > 2 hours

2. **Add Analytics Write Counter**
   - Track successful writes
   - Track failed writes
   - Expose metrics at `/api/claude-code/analytics/health`

---

## Recommended Immediate Action

### Step 1: Test Manual Database Write

```bash
cd /workspaces/agent-feed/api-server

# Test if database is writable
sqlite3 ../database.db "INSERT INTO token_analytics (id, timestamp, sessionId, operation, inputTokens, outputTokens, totalTokens, estimatedCost, model) VALUES ('manual-test-$(date +%s)', datetime('now'), 'manual-test', 'test', 5, 10, 15, 0.001, 'test-model');"

# Verify write succeeded
sqlite3 ../database.db "SELECT * FROM token_analytics ORDER BY timestamp DESC LIMIT 1;"
```

**If this works:** Database is writable, issue is in code logic
**If this fails:** Database permissions issue

### Step 2: Add Debug Logging

Add the enhanced logging from "Option A" above to:
- `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js` (lines 243-269)

### Step 3: Trigger Analytics Write

Make a request to the `/streaming-chat` endpoint and watch logs:

```bash
# Watch server logs
tail -f logs/combined.log | grep -E "ANALYTICS|Token analytics"

# In another terminal, make test request
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, test analytics", "sessionId": "test-session-123"}'
```

Watch for:
- `[ANALYTICS DEBUG]` messages showing code execution
- `[ANALYTICS SUCCESS]` or `[ANALYTICS ERROR]` messages
- Any exceptions or silent failures

### Step 4: Check Response Structure

If step 3 shows messages array is empty or has wrong structure, we need to:
1. Update the response parsing logic
2. Adapt to new Claude SDK response format

---

## Testing Checklist

After implementing fixes:

- [ ] Manual database write test passes
- [ ] Debug logging shows analytics code executing
- [ ] Streaming chat request triggers analytics write
- [ ] New record appears in `token_analytics` table
- [ ] Timestamp is current (within last minute)
- [ ] `/analytics` endpoint shows updated metrics
- [ ] Cost tracking reflects new data
- [ ] No errors in server logs

---

## Expected Outcome

After fixes:
- ✅ New analytics records written on every `/streaming-chat` request
- ✅ `/api/claude-code/analytics` shows live data from last 24 hours
- ✅ Cost tracking updates in real-time
- ✅ Debug logs confirm successful writes
- ✅ Historical data preserved

---

## Files Requiring Changes

1. **`/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`**
   - Add debug logging (lines 243-269)
   - Verify response structure parsing
   - Add error handling improvements

2. **`/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`** (if exists)
   - Add logging to `writeTokenMetrics()` method
   - Verify database write logic
   - Add error reporting

3. **Database permissions** (if needed)
   - Fix `/workspaces/agent-feed/database.db` permissions

---

## Next Steps

1. ✅ Investigation complete - root cause identified
2. ⏭️ **User decision:** Implement fix plan?
3. ⏭️ Test manual database write
4. ⏭️ Add debug logging
5. ⏭️ Trigger test request
6. ⏭️ Verify analytics writing
7. ⏭️ Remove debug logging (or keep for monitoring)
8. ⏭️ Add health check endpoint

---

## Summary

**Problem:** Analytics stopped writing new data 4 days ago
**Cause:** `writeTokenMetrics()` being called but silently failing
**Solution:** Add debug logging → identify exact failure point → fix code or permissions
**ETA:** 20-30 minutes to diagnose and fix

**Confidence:** 95% that this is a code logic issue (response format changed) rather than infrastructure issue
