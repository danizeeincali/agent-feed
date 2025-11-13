# userId Authentication - Quick Reference

## Problem

Users with OAuth or API keys were getting 500 errors when sending DMs or creating posts because the system was using the platform's API key (no credits) instead of their authenticated credentials.

## Solution

Pass `userId` through the entire chain: `Ticket → Worker → Protection → SDK → Auth`

## Code Changes Summary

### 1. agent-worker.js - Extract userId from ticket

```javascript
// Line 747
const userId = ticket.user_id || ticket.metadata?.user_id || 'system';

// Line 872
const protectionResult = await executeProtectedQuery(prompt, {
  userId: userId // Pass to protection wrapper
});
```

### 2. worker-protection.js - Pass userId to SDK

```javascript
// Line 49
userId = 'system' // Default value in options

// Line 114 (streaming)
for await (const message of sdkManager.executeHeadlessTask(query, { userId })) {

// Line 228 (non-streaming)
const result = await sdkManager.executeHeadlessTask(query, { userId });
```

### 3. ClaudeCodeSDKManager.js - Use userId for auth

```javascript
// Line 336 (already exists)
const userId = options.userId || 'system';

// Then calls:
const authConfig = await this.authManager.getAuthConfig(userId);
```

## Flow Diagram

```
POST /api/agent-posts (user creates post)
  ↓
ticket-creation-service.cjs (creates ticket with user_id)
  ↓
work_queue_tickets table (user_id stored)
  ↓
agent-worker.js::processURL()
  - Extracts: userId = ticket.user_id || 'system'
  ↓
worker-protection.js::executeProtectedQuery()
  - Accepts: options.userId
  ↓
sdkManager.executeHeadlessTask(query, { userId })
  ↓
ClaudeCodeSDKManager::executeHeadlessTask()
  - Uses: options.userId || 'system'
  ↓
ClaudeAuthManager::getAuthConfig(userId)
  ↓
user_claude_auth table
  - OAuth user: Returns oauth_token
  - API key user: Returns encrypted_api_key
  - System user: Returns ANTHROPIC_API_KEY
```

## Testing

Run all tests:
```bash
npm test -- tests/unit/agent-worker-userid-auth.test.js
```

All 22 tests should pass:
- ✅ userId extraction from tickets
- ✅ userId passed to SDK manager
- ✅ Auth method selection (OAuth, API key, system)
- ✅ Integration tests
- ✅ Backward compatibility
- ✅ Edge cases

## Verification

Run backward compatibility check:
```bash
node tests/unit/backward-compat-verification.js
```

Should output:
```
✅ All ticket formats handled correctly
✅ Legacy tickets correctly default to "system"
✅ Options handling is backward compatible
✅ All backward compatibility tests passed!
```

## Expected Behavior

### OAuth User
- Ticket has `user_id: 'user-123'`
- Auth config has `method: 'oauth'` and `oauth_token`
- SDK uses OAuth token (NOT ANTHROPIC_API_KEY)
- ✅ Works with user's OAuth credits

### API Key User
- Ticket has `user_id: 'user-456'`
- Auth config has `method: 'user_api_key'` and `encrypted_api_key`
- SDK uses user's API key (NOT ANTHROPIC_API_KEY)
- ✅ Works with user's API key credits

### Legacy/System
- Ticket has no `user_id` (or null)
- Defaults to `userId = 'system'`
- Auth config has `method: 'platform_payg'` and platform API key
- SDK uses ANTHROPIC_API_KEY
- ⚠️ Requires platform to have credits

## Debugging

Check logs for userId flow:
```
🛡️ Protected query execution: {
  workerId: 'worker-...',
  ticketId: 'ticket-...',
  userId: 'user-123',  // ← Should show actual user ID
  complexity: 'SIMPLE',
  limits: { ... }
}
```

If userId is always `'system'`:
1. Check ticket creation: Does `user_id` exist in DB?
2. Check extraction: Is `ticket.user_id` being read correctly?
3. Check auth config: Does user have entry in `user_claude_auth` table?

## Database Schema

### work_queue_tickets
```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- ← userId stored here
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,
  post_id TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER,
  result TEXT
);
```

### user_claude_auth
```sql
CREATE TABLE user_claude_auth (
  user_id TEXT PRIMARY KEY,
  auth_method TEXT NOT NULL, -- 'oauth' | 'user_api_key' | 'platform_payg'
  encrypted_api_key TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at INTEGER,
  oauth_tokens TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
```

## Common Issues

### Issue: Still getting 500 errors
**Check:**
1. Is user authenticated? `SELECT * FROM user_claude_auth WHERE user_id = 'user-123'`
2. Is userId in ticket? `SELECT user_id FROM work_queue_tickets WHERE id = 'ticket-xyz'`
3. Are logs showing correct userId?

### Issue: Ticket has no user_id
**Fix:** Update ticket creation service to include `user_id` from post author:
```javascript
const ticket = await workQueueRepo.createTicket({
  user_id: post.author_id || post.authorId, // ← Add this
  agent_id: agentId,
  content: post.content,
  // ...
});
```

### Issue: User has no auth config
**Fix:** User needs to configure authentication in Settings:
1. Go to Settings page
2. Choose OAuth or API key
3. Complete authentication flow
4. Entry will be created in `user_claude_auth` table

## Files Modified

- `api-server/worker/agent-worker.js` (3 locations)
- `api-server/worker/worker-protection.js` (3 locations)
- `tests/unit/agent-worker-userid-auth.test.js` (22 tests)
- `tests/unit/backward-compat-verification.js` (new)
- `docs/AGENT1-USERID-AUTH-FIX-COMPLETE.md` (new)
- `docs/validation/USERID-AUTH-QUICK-REFERENCE.md` (this file)

## Rollback Plan

If issues occur, revert these changes:
```bash
git checkout HEAD -- api-server/worker/agent-worker.js
git checkout HEAD -- api-server/worker/worker-protection.js
```

System will fall back to using `'system'` user (platform API key) for all requests.
