# Agent Worker userId Authentication Fix - COMPLETE

## Problem Summary

When users sent DMs or created posts, the system was using the platform's `ANTHROPIC_API_KEY` (which has no credits) instead of the user's authenticated method (OAuth or API key from Settings). This caused 500 errors.

## Root Cause

The code flow was:
1. `agent-worker.js::processURL()` called `sdkManager.executeHeadlessTask(prompt)`
2. But it didn't pass `userId` in the options
3. So the SDK manager defaulted to 'system' user (line 336 of ClaudeCodeSDKManager.js)
4. The 'system' user used the platform API key (no credits) → 500 error

## Solution

Updated the code flow to pass `userId` through all layers:

```
Ticket (with user_id)
  → agent-worker.js (extract userId)
    → worker-protection.js (pass userId)
      → SDK manager (use user's auth method)
```

## Files Modified

### 1. `/workspaces/agent-feed/api-server/worker/agent-worker.js`

**Changes in `processURL()` (line 740-873):**
```javascript
// Added: Extract userId from ticket
const userId = ticket.user_id || ticket.metadata?.user_id || 'system';

// Modified: Pass userId to protection wrapper
const protectionResult = await executeProtectedQuery(prompt, {
  workerId: this.workerId,
  ticketId: this.ticketId,
  sdkManager: sdkManager,
  streamingResponse: false,
  userId: userId // NEW: Pass userId for user-specific authentication
});
```

**Changes in `invokeAgent()` (line 1122-1168):**
```javascript
// Modified signature to accept userId
async invokeAgent(prompt, userId = 'system') {
  // ...
  const protectionResult = await executeProtectedQuery(fullPrompt, {
    // ...
    userId: userId // NEW: Pass userId for user-specific authentication
  });
}
```

**Changes in `processComment()` (line 1030-1066):**
```javascript
// Added: Extract userId from comment context
const userId = comment.userId || comment.user_id ||
               parentPost?.userId || parentPost?.user_id || 'system';

// Modified: Call invokeAgent with userId
const response = await this.invokeAgent(prompt, userId);
```

### 2. `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Changes in `executeProtectedQuery()` (line 41-228):**
```javascript
// Added: userId parameter to options
export async function executeProtectedQuery(query, options = {}) {
  const {
    // ... other options
    userId = 'system' // NEW: Extract userId with default
  } = options;

  console.log(`🛡️ Protected query execution:`, {
    workerId,
    ticketId,
    userId, // NEW: Log userId for debugging
    complexity,
    // ...
  });

  // ...

  // Modified: Pass userId to SDK manager (streaming)
  for await (const message of sdkManager.executeHeadlessTask(query, { userId })) {
    // ...
  }

  // Modified: Pass userId to SDK manager (non-streaming)
  const result = await sdkManager.executeHeadlessTask(query, { userId });
}
```

## Test Coverage

All 22 TDD tests pass:
- ✅ Suite 1: userId Extraction from Ticket (4 tests)
- ✅ Suite 2: userId Passed to SDK Manager (3 tests)
- ✅ Suite 3: Auth Method Selection (4 tests)
- ✅ Suite 4: Integration Tests - Full Flow (4 tests)
- ✅ Suite 5: Backward Compatibility (2 tests)
- ✅ Suite 6: Edge Cases & Error Handling (3 tests)
- ✅ Suite 7: Performance & Concurrency (2 tests)

Run tests:
```bash
npm test -- tests/unit/agent-worker-userid-auth.test.js
```

## Backward Compatibility

✅ **VERIFIED:** All changes are backward compatible:
- Tickets without `user_id` default to `'system'`
- Tickets with `null` user_id default to `'system'`
- Tickets with `metadata.user_id` use that value
- Legacy code that doesn't pass userId defaults to `'system'`

Run verification:
```bash
node tests/unit/backward-compat-verification.js
```

## Expected Behavior After Fix

### Before Fix:
```
User (OAuth) → DM to agent
  → agent-worker.js (no userId passed)
    → SDK manager (uses 'system')
      → ANTHROPIC_API_KEY (no credits)
        → ❌ 500 error: "credit balance too low"
```

### After Fix:
```
User (OAuth) → DM to agent
  → agent-worker.js (userId = 'user-123')
    → worker-protection.js (userId = 'user-123')
      → SDK manager (userId = 'user-123')
        → ClaudeAuthManager.getAuthConfig('user-123')
          → Uses OAuth credentials
            → ✅ Success: Uses user's OAuth token
```

### Scenarios Covered:

1. **OAuth User:**
   - Ticket has `user_id: 'oauth-user-456'`
   - SDK manager uses OAuth token from `user_claude_auth` table
   - No usage of `ANTHROPIC_API_KEY`
   - ✅ Works with user's credits

2. **API Key User:**
   - Ticket has `user_id: 'apikey-user-789'`
   - SDK manager uses encrypted API key from `user_claude_auth` table
   - No usage of `ANTHROPIC_API_KEY`
   - ✅ Works with user's API key

3. **System/Unauthenticated:**
   - Ticket has no `user_id` (or null)
   - Defaults to `userId = 'system'`
   - SDK manager uses `ANTHROPIC_API_KEY` (platform key)
   - ⚠️ Only works if platform has credits (backward compatible)

## How Tickets Get userId

Tickets are created in `/workspaces/agent-feed/api-server/services/ticket-creation-service.cjs`:

```javascript
const ticket = await workQueueRepo.createTicket({
  user_id: post.author_id || post.authorId, // NEW: userId from post author
  agent_id: agentId,
  content: post.content,
  url: url,
  priority: priority,
  post_id: post.id,
  metadata: {
    post_id: post.id,
    detected_at: Date.now(),
    context: context
  }
});
```

The `user_id` field already exists in the `work_queue_tickets` table schema.

## Verification Checklist

- [x] TDD tests written FIRST
- [x] agent-worker.js updated to extract userId
- [x] worker-protection.js updated to accept and pass userId
- [x] Both streaming and non-streaming paths updated
- [x] Comment processing (invokeAgent) updated
- [x] All 22 tests passing
- [x] Backward compatibility verified
- [x] Coordination hooks executed
- [x] Code changes documented

## Next Steps

1. **Deploy to production**
2. **Monitor logs** for userId flow:
   ```
   🛡️ Protected query execution: { workerId, ticketId, userId, ... }
   ```
3. **Test with real users:**
   - OAuth user sends DM → Should use OAuth credentials
   - API key user creates post → Should use their API key
   - Unauthenticated user → Should use platform key (or show auth prompt)

## Coordination Metrics

- **Task ID:** `task-1762736715867-gpfa5rq4f`
- **Performance:** 337.51s
- **Memory keys:**
  - `swarm/agent1/agent-worker-userid`
  - `swarm/agent1/worker-protection-userid`

## Related Files

- Implementation: `api-server/worker/agent-worker.js`
- Implementation: `api-server/worker/worker-protection.js`
- Tests: `tests/unit/agent-worker-userid-auth.test.js`
- Verification: `tests/unit/backward-compat-verification.js`
- Documentation: `docs/AGENT1-USERID-AUTH-FIX-COMPLETE.md`
