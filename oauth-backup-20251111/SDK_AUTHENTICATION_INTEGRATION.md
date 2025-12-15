# Claude Code SDK Authentication Integration

## Overview

This document describes the integration of the ClaudeAuthManager into the ClaudeCodeSDKManager, enabling multi-tenant authentication and usage tracking for Claude API access.

## Components

### 1. ClaudeAuthManager (`/src/services/ClaudeAuthManager.js`)

Manages authentication for multiple users with three different authentication methods:

- **BYOC (Bring Your Own Claude)**: Users provide their own Anthropic API key
- **Platform PAYG (Pay-As-You-Go)**: Platform provides API key and bills users based on usage
- **Platform Free Tier**: Platform provides API key with usage limits

### 2. ClaudeCodeSDKManager (`/src/services/ClaudeCodeSDKManager.js`)

Enhanced to support per-user authentication and usage tracking.

## Authentication Methods

### BYOC (Bring Your Own Claude)

```javascript
await authManager.updateAuthMethod('user-id', 'byoc', {
  apiKey: 'sk-ant-user-custom-key'
});
```

**Features:**
- User provides their own API key
- No usage tracking (user pays Anthropic directly)
- Full tool access with bypassPermissions
- API key stored securely in database

### Platform PAYG (Pay-As-You-Go)

```javascript
await authManager.updateAuthMethod('user-id', 'platform_payg');
```

**Features:**
- Platform provides API key (from `ANTHROPIC_API_KEY` env var)
- Usage tracking enabled for billing
- No hard limits
- Charges based on actual token usage

### Platform Free Tier

```javascript
await authManager.updateAuthMethod('user-id', 'platform_free', {
  usageLimit: 5.0  // $5.00 limit
});
```

**Features:**
- Platform provides API key
- Usage tracking enabled
- Hard limit enforcement
- Throws error when limit exceeded

## Database Schema

### user_settings

```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  auth_method TEXT DEFAULT 'platform_payg',  -- 'byoc', 'platform_payg', 'platform_free'
  api_key TEXT,                              -- User's API key (for BYOC)
  usage_limit REAL,                          -- Limit in USD (for platform_free)
  usage_current REAL DEFAULT 0,              -- Current usage in USD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### api_usage

```sql
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  cost_usd REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
);
```

## Usage Example

### Initialize SDK Manager

```javascript
import { ClaudeCodeSDKManager } from './src/services/ClaudeCodeSDKManager.js';
import Database from 'better-sqlite3';

const db = new Database('./database.db');
const sdkManager = new ClaudeCodeSDKManager();
sdkManager.initializeWithDatabase(db);
```

### Query with User Authentication

```javascript
const result = await sdkManager.queryClaudeCode('Your prompt here', {
  userId: 'user-123',
  cwd: '/path/to/workspace',
  model: 'claude-sonnet-4-20250514'
});

console.log('Auth method used:', result.authMethod);
console.log('Success:', result.success);
console.log('Messages:', result.messages);
```

### Streaming Chat with Authentication

```javascript
const messages = await sdkManager.createStreamingChat('Hello, Claude!', {
  userId: 'user-456',
  sessionId: 'session-abc'
});

console.log('Response:', messages[0].content);
console.log('Auth method:', messages[0].authMethod);
console.log('User ID:', messages[0].userId);
```

## Environment Isolation

The ClaudeAuthManager manipulates `process.env.ANTHROPIC_API_KEY` to ensure the correct API key is used for each request:

```javascript
// 1. Save original environment
const originalKey = process.env.ANTHROPIC_API_KEY;

// 2. Prepare auth (sets user's key or platform key)
const sdkOptions = authManager.prepareSDKAuth(authConfig);

// 3. Execute SDK query
const result = await query({ prompt, options });

// 4. Restore original environment (CRITICAL!)
authManager.restoreSDKAuth(authConfig);
```

**Important:** The restoration happens even in catch blocks to prevent key leakage between users!

## Cost Calculation

Claude Sonnet 4 pricing:
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

```javascript
const tokens = { input: 10000, output: 5000, total: 15000 };
const cost = sdkManager.calculateCost(tokens);
// cost = (10000/1000000 * 3.0) + (5000/1000000 * 15.0) = $0.105
```

## Usage Tracking

### Track Usage

```javascript
const tokens = { input: 5000, output: 2500, total: 7500 };
const cost = 0.105;

await authManager.trackUsage('user-id', tokens, cost);
```

This:
1. Inserts a record into `api_usage` table
2. Updates `usage_current` in `user_settings`

### Get User Usage

```javascript
const usage = await authManager.getUserUsage('user-id');

console.log('Method:', usage.method);
console.log('Limit:', usage.limit);
console.log('Current:', usage.current);
console.log('Remaining:', usage.remaining);
console.log('Total Requests:', usage.totalRequests);
console.log('Total Tokens:', usage.totalTokens);
```

## Security Considerations

### API Key Storage

- **BYOC keys**: Stored encrypted in database (user's responsibility)
- **Platform key**: Stored in environment variable `ANTHROPIC_API_KEY`
- Keys are never logged or exposed in responses

### Environment Isolation

- Each request gets isolated environment
- Original environment always restored (even on errors)
- No cross-user key contamination possible

### Usage Limits

- Free tier users get hard limits
- Platform PAYG users can optionally have soft limits
- BYOC users have no platform-side limits

## Testing

Run the comprehensive integration test:

```bash
node tests/manual-validation/auth-manager-standalone-test.js
```

Tests cover:
- All three authentication methods
- Environment manipulation and restoration
- Usage tracking and limit enforcement
- Cost calculations
- Multi-user scenarios
- Error handling

## Error Handling

### Free Tier Limit Exceeded

```javascript
try {
  const config = await authManager.getAuthConfig('limited-user');
} catch (error) {
  // Error: Free tier usage limit exceeded. Please upgrade to PAYG or BYOC.
}
```

### Invalid API Key

```javascript
const isValid = authManager.validateApiKey('sk-ant-api03-key123');
// Returns true for valid keys, false for invalid
```

### Database Errors

- Usage tracking errors are logged but don't throw
- Auth config errors are thrown (critical for security)

## Integration Points

### Server Initialization (`api-server/server.js`)

```javascript
import { initializeWithDatabase } from './src/api/routes/claude-code-sdk.js';

// After database is ready
initializeWithDatabase(db);
```

### Route Handler (`src/api/routes/claude-code-sdk.js`)

```javascript
export function initializeWithDatabase(db) {
  const claudeCodeManager = getClaudeCodeSDKManager();
  claudeCodeManager.initializeWithDatabase(db);
  claudeCodeManager.initializeTelemetry(db, sseStream);
}
```

## Performance Considerations

- **Database queries**: All auth lookups use prepared statements
- **Environment manipulation**: Minimal overhead (2 assignments per request)
- **Usage tracking**: Async, doesn't block response
- **Cost calculation**: Pure function, no I/O

## Future Enhancements

1. **Caching**: Cache auth configs for frequently used users
2. **Rate Limiting**: Add per-user rate limits
3. **Analytics**: Track usage patterns per auth method
4. **Webhooks**: Notify users when approaching limits
5. **Bulk Operations**: Batch usage tracking for efficiency

## Migration Guide

### From Legacy System

1. Add `user_settings` and `api_usage` tables to database
2. Migrate existing users to `platform_payg` method
3. Update all SDK calls to include `userId` option
4. Initialize auth manager after database connection

### Sample Migration Script

```javascript
// Add tables
db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (...);
  CREATE TABLE IF NOT EXISTS api_usage (...);
`);

// Migrate existing users
const users = db.prepare('SELECT id FROM users').all();
for (const user of users) {
  await authManager.updateAuthMethod(user.id, 'platform_payg');
}
```

## Support

For issues or questions:
- Check test file: `tests/manual-validation/auth-manager-standalone-test.js`
- Review source: `src/services/ClaudeAuthManager.js`
- Check integration: `src/services/ClaudeCodeSDKManager.js`

## Version History

- **v1.0.0** (2025-11-09): Initial implementation with BYOC, PAYG, and Free Tier support
