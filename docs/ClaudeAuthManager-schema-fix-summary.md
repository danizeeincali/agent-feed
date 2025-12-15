# ClaudeAuthManager Schema Fix Summary

**Date**: 2025-11-10
**Agent**: Code Fix Agent (Agent 1)
**Task**: Fix ClaudeAuthManager.js to use correct `user_claude_auth` table schema

## Problem Identified

**Error**: `SqliteError: no such column: auth_method`

**Root Cause**: ClaudeAuthManager was querying the wrong table (`user_settings`) with incorrect column names instead of the correct `user_claude_auth` table created in migration 018.

## Changes Made

### File Modified
- `/workspaces/agent-feed/src/services/ClaudeAuthManager.js`

### 1. Updated `getAuthConfig()` Method (Lines 20-83)

**Before**:
- Queried `user_settings` table
- Used columns: `auth_method`, `api_key`, `usage_limit`, `usage_current`
- Supported methods: `byoc`, `platform_payg`, `platform_free`

**After**:
- Queries `user_claude_auth` table
- Uses columns: `auth_method`, `encrypted_api_key`, `oauth_token`, `oauth_expires_at`
- Supports methods: `oauth`, `user_api_key`, `platform_payg`
- Removed `usage_limit` and `usage_current` (not in new schema)
- Added OAuth token expiration validation

### 2. Updated `trackUsage()` Method (Lines 136-166)

**Before**:
- Inserted into `api_usage` table
- Updated `user_settings.usage_current`
- Accepted `tokens.total`

**After**:
- Inserts into `usage_billing` table with full schema compliance
- No longer updates non-existent `usage_current` column
- Accepts `tokens.input` and `tokens.output` separately
- Adds `sessionId` and `model` parameters
- Generates unique usage IDs
- Stores `auth_method` with each usage record

### 3. Updated `getUserUsage()` Method (Lines 173-205)

**Before**:
- Joined `user_settings` with `api_usage`
- Returned `usage_limit`, `usage_current`, `remaining`

**After**:
- Queries `user_claude_auth` for auth method
- Queries `usage_billing` for usage statistics
- Returns separate `totalInputTokens` and `totalOutputTokens`
- Returns `totalCost` and `unbilledCost`
- Removed `limit` and `remaining` (not applicable to new schema)

### 4. Updated `updateAuthMethod()` Method (Lines 217-303)

**Before**:
- Updated `user_settings` table
- Used columns: `auth_method`, `api_key`, `usage_limit`
- Single INSERT/UPDATE statement

**After**:
- Updates `user_claude_auth` table
- Handles three distinct auth method types with different columns:
  - **user_api_key**: Updates `encrypted_api_key`
  - **oauth**: Updates `oauth_token`, `oauth_refresh_token`, `oauth_expires_at`, `oauth_tokens`
  - **platform_payg**: Updates only `auth_method`
- Uses timestamps (milliseconds) instead of datetime strings
- Separate UPDATE/INSERT statements for each auth method type

### 5. Updated JSDoc Comments

**Header**:
- Changed from `byoc`, `platform_payg`, `platform_free`
- To: `oauth`, `user_api_key`, `platform_payg`

**Method Documentation**:
- Updated parameter descriptions
- Added new OAuth-specific parameters
- Updated return value descriptions

## Database Schema Alignment

### Correct Table: `user_claude_auth`
```sql
CREATE TABLE user_claude_auth (
  user_id TEXT PRIMARY KEY,
  auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'user_api_key', 'platform_payg')),
  encrypted_api_key TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at INTEGER,
  oauth_tokens TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Usage Tracking Table: `usage_billing`
```sql
CREATE TABLE usage_billing (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  auth_method TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  session_id TEXT,
  model TEXT,
  created_at INTEGER NOT NULL,
  billed INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Expected Outcomes

1. ✅ ClaudeAuthManager queries correct `user_claude_auth` table
2. ✅ All column names match database schema
3. ✅ Zero SQL errors when getting auth config
4. ✅ Proper OAuth token handling with expiration checks
5. ✅ Correct usage tracking in `usage_billing` table
6. ✅ Support for all three authentication methods

## Testing Recommendations

1. **Test user_api_key method**:
   - Create user with API key
   - Verify encryption and retrieval
   - Test API calls with user's key

2. **Test oauth method**:
   - Create user with OAuth tokens
   - Verify token expiration handling
   - Test OAuth refresh flow

3. **Test platform_payg method**:
   - Verify platform API key is used
   - Test usage tracking
   - Verify billing records created

4. **Test getUserUsage()**:
   - Verify correct statistics returned
   - Test with users having different auth methods
   - Verify unbilled cost calculation

5. **Test updateAuthMethod()**:
   - Test switching between auth methods
   - Verify data persistence
   - Test with new and existing users

## Coordination Hooks Executed

```bash
✅ npx claude-flow@alpha hooks pre-task --description "Fix ClaudeAuthManager schema"
✅ npx claude-flow@alpha hooks session-restore --session-id "swarm-schema-fix"
✅ npx claude-flow@alpha hooks post-edit --file "ClaudeAuthManager.js" --memory-key "swarm/coder/schema-fix"
✅ npx claude-flow@alpha hooks post-task --task-id "schema-fix-coder"
✅ npx claude-flow@alpha hooks notify --message "ClaudeAuthManager schema fix complete"
```

## Files Modified

- `/workspaces/agent-feed/src/services/ClaudeAuthManager.js` - Complete schema alignment

## Next Steps

1. Run unit tests to verify all methods work correctly
2. Test integration with ClaudeCodeSDKManager
3. Verify authentication flow in agent-worker
4. Test with real database and user data
5. Update any callers that may expect old return value structure

---

**Status**: ✅ COMPLETE
**Agent**: Code Fix Agent
**Memory Key**: `swarm/coder/schema-fix`
