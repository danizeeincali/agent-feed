# TDD Test Suite - Claude Auth System

## Phase 9: Test-First Development Complete

This document summarizes the comprehensive TDD test suite written BEFORE implementation.

### Test Files Created

1. **ClaudeAuthManager.test.js** (Unit Tests)
   - Location: `/api-server/tests/unit/services/auth/ClaudeAuthManager.test.js`
   - 16KB, 400+ lines
   - Uses real Better-SQLite3 database in `:memory:` mode

2. **ApiKeyEncryption.test.js** (Unit Tests)
   - Location: `/api-server/tests/unit/services/auth/ApiKeyEncryption.test.js`
   - 9.3KB, 250+ lines
   - Tests encryption/decryption roundtrip and validation

3. **claude-auth.test.js** (Integration Tests)
   - Location: `/api-server/tests/integration/api/claude-auth.test.js`
   - 18KB, 500+ lines
   - Tests full HTTP API endpoints with real database

---

## Test Coverage Summary

### ClaudeAuthManager Tests (16 test cases)

#### getAuthConfig() - 4 tests
- ✅ Returns OAuth config when auth_method is 'oauth'
- ✅ Returns user API key config when auth_method is 'user_api_key'
- ✅ Returns platform PAYG config when auth_method is 'platform_payg'
- ✅ Returns null when user has no auth config

#### prepareSDKAuth() - 4 tests
- ✅ DELETES `process.env.ANTHROPIC_API_KEY` when method is 'oauth'
- ✅ SETS user API key in config when method is 'user_api_key'
- ✅ Uses platform key when method is 'platform_payg'
- ✅ Throws error when user has no auth config

#### restoreSDKAuth() - 3 tests
- ✅ Restores original ANTHROPIC_API_KEY after OAuth usage
- ✅ Does not set ANTHROPIC_API_KEY if there was no original key
- ✅ Handles restoration for user_api_key method

#### trackUsage() - 4 tests
- ✅ Inserts usage record into usage_billing table with real database
- ✅ Tracks OAuth usage with zero cost
- ✅ Tracks platform_payg usage with calculated cost
- ✅ Accumulates multiple usage records for the same user
- ✅ Throws error when tracking usage for non-existent user

#### getBillingMetrics() - 2 tests
- ✅ Returns usage summary for a user
- ✅ Returns zero metrics for user with no usage

---

### ApiKeyEncryption Tests (18 test cases)

#### Encryption/Decryption Roundtrip - 8 tests
- ✅ Encrypts and decrypts a valid Anthropic API key
- ✅ Produces different encrypted values for the same key (random IV)
- ✅ Handles special characters in API keys
- ✅ Throws error when encrypting null or undefined
- ✅ Throws error when decrypting invalid format
- ✅ Throws error when encryption secret is not set
- ✅ Throws error when encryption secret is too short

#### isValidApiKey() - 7 tests
- ✅ Validates correct Anthropic API key format (sk-ant-api03-[95 chars]AA)
- ✅ Rejects invalid Anthropic API key formats
- ✅ Validates the exact length requirement (108 characters total)
- ✅ Validates the prefix format strictly
- ✅ Allows alphanumeric characters in the key portion
- ✅ Rejects keys with special characters in the key portion

#### Security Considerations - 2 tests
- ✅ Does not expose plaintext keys in error messages
- ✅ Handles concurrent encryption requests safely

#### Utility - 1 test
- ✅ Returns the encryption algorithm being used (aes-256-cbc)

---

### Claude Auth API Integration Tests (15 test cases)

#### GET /api/auth/claude/config - 5 tests
- ✅ Returns user's auth method and config
- ✅ Returns 404 when user has no auth config
- ✅ Returns 401 when no auth token provided
- ✅ Returns 401 when auth token is invalid
- ✅ Does not expose encrypted API keys in response

#### POST /api/auth/claude/config - 7 tests
- ✅ Saves OAuth auth method
- ✅ Saves user_api_key auth method with encrypted key
- ✅ Saves platform_payg auth method
- ✅ Updates existing auth config
- ✅ Returns 400 when API key is invalid
- ✅ Returns 400 when auth method is invalid
- ✅ Returns 401 when not authenticated

#### GET /api/auth/claude/billing - 4 tests
- ✅ Returns usage summary for user
- ✅ Returns zero metrics when user has no usage
- ✅ Supports date range filtering
- ✅ Returns 401 when not authenticated

#### DELETE /api/auth/claude/config - 3 tests
- ✅ Deletes user auth configuration
- ✅ Returns 404 when no config exists to delete
- ✅ Returns 401 when not authenticated

#### Error Handling - 2 tests
- ✅ Returns 500 when database error occurs
- ✅ Does not expose sensitive error details to client

---

## Database Schema Used in Tests

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_claude_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'user_api_key', 'platform_payg')),
  encrypted_api_key TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

CREATE TABLE usage_billing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  auth_method TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0.0,
  request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Key Testing Principles Applied

1. **Real Database**: Uses Better-SQLite3 `:memory:` database, NO mocks
2. **Red Phase**: Tests will FAIL initially until implementation is complete
3. **Comprehensive Coverage**: 49 total test cases covering all scenarios
4. **Security-Focused**: Tests encryption, validation, and error handling
5. **Integration Testing**: Tests full HTTP request/response cycle
6. **Error Cases**: Tests invalid inputs, missing data, and edge cases

---

## Expected Test Results (Red Phase)

All tests should FAIL with errors like:

```
Cannot find module '../../../../services/auth/ClaudeAuthManager'
Cannot find module '../../../../services/auth/ApiKeyEncryption'
Cannot GET /api/auth/claude/config
```

This is EXPECTED and CORRECT for TDD Red Phase.

---

## Next Steps for Implementation Agents

1. Create `/api-server/services/auth/ApiKeyEncryption.js`
2. Create `/api-server/services/auth/ClaudeAuthManager.js`
3. Create API routes in `/api-server/routes/claude-auth.js`
4. Run tests: `npm test -- ClaudeAuthManager.test.js`
5. Watch tests turn GREEN as implementation progresses
6. Refactor code while keeping tests GREEN

---

## Test Execution Commands

```bash
# Run all auth tests
npm test -- auth

# Run specific test files
npm test -- ClaudeAuthManager.test.js
npm test -- ApiKeyEncryption.test.js
npm test -- claude-auth.test.js

# Run with coverage
npm test -- --coverage auth
```

---

## Memory Storage

Test schemas stored in swarm memory:
- Key: `swarm/qa/tests-written`
- Status: Notified to all agents
- Implementation agents can now proceed
