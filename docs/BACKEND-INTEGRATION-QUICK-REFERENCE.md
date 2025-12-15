# Backend Integration Quick Reference

## Status: ✅ COMPLETE

## Modified Files

### 1. `/workspaces/agent-feed/prod/src/services/ClaudeCodeSDKManager.js`
**Changes**: ClaudeAuthManager integration
- Line 18: Import ClaudeAuthManager
- Line 45: Initialize authManager property
- Lines 61-64: Add initializeWithDatabase() method
- Lines 290-342: Integrate auth flow into executeHeadlessTask()

### 2. `/workspaces/agent-feed/api-server/avi/session-manager.js`
**Changes**: Database initialization
- Line 30: Add db property to constructor
- Lines 54-60: Initialize SDK with database
- Line 285: Pass userId to executeHeadlessTask

### 3. `/workspaces/agent-feed/api-server/server.js`
**Changes**: Database connection
- Line 4298: Pass database to getAviSession

## Key Integration Points

### Database Flow
```
server.js (line 66)
  ↓ db = new Database('database.db')
  ↓
server.js (line 4298)
  ↓ getAviSession({ db: db })
  ↓
session-manager.js (line 56)
  ↓ sdkManager.initializeWithDatabase(db)
  ↓
ClaudeCodeSDKManager.js (line 62)
  ↓ authManager = new ClaudeAuthManager(db)
```

### Auth Flow
```
1. User sends DM → POST /api/avi/dm/chat
2. Server gets AVI session with database
3. Session manager initializes SDK with database
4. SDK manager creates auth manager with database
5. executeHeadlessTask() gets auth config from database
6. Auth manager prepares SDK environment
7. SDK executes query with user's auth
8. Auth manager restores environment
9. Response returned to user
```

## Testing Commands

### Manual Test
```bash
# Start server
npm start

# Test OAuth user DM
curl -X POST http://localhost:3001/api/avi/dm/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello AVI, can you help me?"}'

# Check logs for:
# - "🔐 Auth method: oauth"
# - "✅ SDK Manager initialized with database for auth"
# - No 500 errors
```

### Check Database
```bash
node -e "
import Database from 'better-sqlite3';
const db = new Database('database.db');
const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get('demo-user-123');
console.log('Demo user:', user);
db.close();
"
```

## Supported Auth Methods

### 1. OAuth (via Claude CLI)
- Token stored in database
- Auto-refreshed if expired
- No usage tracking (Claude's responsibility)

### 2. User API Key
- User provides own Claude API key
- Encrypted in database
- No usage tracking

### 3. Platform PAYG
- Platform provides API key
- Usage tracked for billing
- Default for new users

## Error Handling

All auth errors are handled gracefully:
- Token expiration → Auto-refresh attempt
- Missing auth → Fallback to platform PAYG
- Database error → Clear error message
- SDK error → Environment restored in finally block

## Security

- ✅ API keys never logged
- ✅ Environment restored after each request
- ✅ User isolation (separate auth records)
- ✅ Token expiration checks
- ✅ Proper error handling

## File Locations

```
/workspaces/agent-feed/
├── prod/src/services/
│   └── ClaudeCodeSDKManager.js     ← Main SDK manager
├── api-server/
│   ├── avi/
│   │   └── session-manager.js      ← AVI session manager
│   └── server.js                   ← API endpoints
├── src/services/
│   └── ClaudeAuthManager.js        ← Auth manager
└── database.db                     ← User auth data
```

## Next Steps

1. ✅ Backend integration complete
2. ⏳ Manual testing (verify OAuth works)
3. ⏳ Integration tests (all 3 auth methods)
4. ⏳ Frontend integration (pass userId)
5. ⏳ Production deployment

## Support

For issues:
1. Check logs for auth method detection
2. Verify database has user auth record
3. Confirm OAuth token not expired
4. Test with curl command above
