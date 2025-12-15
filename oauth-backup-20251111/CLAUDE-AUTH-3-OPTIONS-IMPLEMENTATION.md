# 3-Option Claude Authentication System - Implementation Tracker

**Created:** 2025-11-08
**Status:** IN PROGRESS
**Methodology:** SPARC + TDD + Claude-Flow Swarm

---

## 📊 Overall Progress: 0% Complete

### Phase Progress
- [ ] Phase 1: Database Schema (0/6 tasks)
- [ ] Phase 2: Authentication Manager (0/6 tasks)
- [ ] Phase 3: API Key Encryption (0/5 tasks)
- [ ] Phase 4: OAuth Token Detection (0/4 tasks)
- [ ] Phase 5: Modify ClaudeCodeSDKManager (0/7 tasks)
- [ ] Phase 6: API Routes (0/6 tasks)
- [ ] Phase 7: Frontend Settings UI (0/8 tasks)
- [ ] Phase 8: Billing Dashboard (0/5 tasks)
- [ ] Phase 9: Testing & Validation (0/9 tasks)

---

## 🎯 The 3 Authentication Options

**Option A**: Use Claude Max/Pro subscription (OAuth) - FREE for users
**Option B**: Provide own API key - Users pay Anthropic directly
**Option C**: Use Avi's API & pay-as-you-go - Revenue opportunity

**Critical Implementation Detail**: SDK checks `ANTHROPIC_API_KEY` environment variable FIRST. To use OAuth (Option A), we MUST `delete process.env.ANTHROPIC_API_KEY` before calling the SDK, otherwise it will always use the API key and never check for OAuth tokens.

---

## Phase 1: Database Schema ✅ / ❌

**File:** `/api-server/db/migrations/018-claude-auth-billing.sql`

- [ ] Task 1.1: Create migration file
- [ ] Task 1.2: Add `claude_auth_method` column to user_settings
- [ ] Task 1.3: Add `claude_api_key_encrypted` column to user_settings
- [ ] Task 1.4: Create `usage_billing` table
- [ ] Task 1.5: Create `usage_billing_summary` view
- [ ] Task 1.6: Test migration with real database

**Agent:** Database Architect
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 2: Authentication Manager ✅ / ❌

**File:** `/api-server/services/auth/ClaudeAuthManager.js`

- [ ] Task 2.1: Create ClaudeAuthManager class skeleton
- [ ] Task 2.2: Implement `getAuthConfig(userId)` method
- [ ] Task 2.3: Implement `prepareSDKAuth(authConfig)` method (CRITICAL: deletes ANTHROPIC_API_KEY)
- [ ] Task 2.4: Implement `restoreSDKAuth(authConfig)` method
- [ ] Task 2.5: Implement `trackUsage(userId, tokens, cost)` method
- [ ] Task 2.6: Add singleton instance export

**Agent:** Backend Developer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 3: API Key Encryption ✅ / ❌

**File:** `/api-server/services/auth/ApiKeyEncryption.js`

- [ ] Task 3.1: Create encryption utilities with AES-256-GCM
- [ ] Task 3.2: Implement `encryptApiKey(apiKey)` function
- [ ] Task 3.3: Implement `decryptApiKey(encryptedData)` function
- [ ] Task 3.4: Implement `isValidApiKey(apiKey)` validator
- [ ] Task 3.5: Add API_KEY_ENCRYPTION_SECRET to .env and test

**Agent:** Security Engineer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 4: OAuth Token Detection ✅ / ❌

**File:** `/api-server/services/auth/OAuthTokenExtractor.js`

- [ ] Task 4.1: Create OAuth detection utilities
- [ ] Task 4.2: Implement `checkOAuthAvailability()` function (check CLI + config)
- [ ] Task 4.3: Implement macOS Keychain check (optional, platform-specific)
- [ ] Task 4.4: Test with real Claude CLI installed

**Agent:** System Integration Specialist
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 5: Modify ClaudeCodeSDKManager ✅ / ❌

**File:** `/src/services/ClaudeCodeSDKManager.js`

- [ ] Task 5.1: Import ClaudeAuthManager
- [ ] Task 5.2: Add `initializeWithDatabase(db)` method
- [ ] Task 5.3: Remove hardcoded `permissionMode: 'bypassPermissions'`
- [ ] Task 5.4: Add `userId` parameter to `queryClaudeCode()`
- [ ] Task 5.5: Add auth preparation before SDK call
- [ ] Task 5.6: Add auth restoration after SDK call
- [ ] Task 5.7: Add usage tracking for Option C

**Agent:** SDK Integration Developer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 6: API Routes ✅ / ❌

**File:** `/api-server/routes/auth/claude-auth.js`

- [ ] Task 6.1: Create route file
- [ ] Task 6.2: Implement GET `/api/auth/claude/config`
- [ ] Task 6.3: Implement POST `/api/auth/claude/config`
- [ ] Task 6.4: Implement GET `/api/auth/claude/oauth-check`
- [ ] Task 6.5: Implement GET `/api/auth/claude/billing`
- [ ] Task 6.6: Add routes to server.js and test with curl/Postman

**Agent:** API Developer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 7: Frontend Settings UI ✅ / ❌

**File:** `/frontend/src/components/settings/ClaudeAuthentication.tsx`

- [ ] Task 7.1: Create component file
- [ ] Task 7.2: Add radio button selector for 3 options
- [ ] Task 7.3: Add API key input field (Option B)
- [ ] Task 7.4: Add OAuth status indicator (Option A)
- [ ] Task 7.5: Add billing summary display (Option C)
- [ ] Task 7.6: Implement save handler with API integration
- [ ] Task 7.7: Add component to Settings page
- [ ] Task 7.8: Add CSS styling for auth options

**Agent:** Frontend Developer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 8: Billing Dashboard ✅ / ❌

**File:** `/frontend/src/pages/Billing.tsx`

- [ ] Task 8.1: Create billing page component
- [ ] Task 8.2: Add usage summary cards
- [ ] Task 8.3: Add detailed usage table
- [ ] Task 8.4: Add export functionality (CSV)
- [ ] Task 8.5: Link from main navigation

**Agent:** Frontend Developer
**Start Time:**
**Completion Time:**
**Status:**

---

## Phase 9: Testing & Validation ✅ / ❌

**TDD Tests + Playwright Validation**

- [ ] Task 9.1: Write TDD tests for ClaudeAuthManager (BEFORE implementation)
- [ ] Task 9.2: Write TDD tests for API routes
- [ ] Task 9.3: Test Option A (OAuth) with real Claude Max subscription
- [ ] Task 9.4: Test Option B (Custom API key) with real API key
- [ ] Task 9.5: Test Option C (Pay-as-you-go) with usage tracking
- [ ] Task 9.6: Test switching between all 3 options
- [ ] Task 9.7: Playwright UI validation with screenshots
- [ ] Task 9.8: Run full regression suite
- [ ] Task 9.9: Security audit (no API key exposure)

**Agent:** QA Engineer + Playwright Specialist
**Start Time:**
**Completion Time:**
**Status:**

---

## 🔧 Implementation Notes

### Critical Technical Details

**1. OAuth Authentication Priority**
```javascript
// SDK checks in this order:
1. process.env.ANTHROPIC_API_KEY  ← HIGHEST PRIORITY
2. OAuth token from Max/Pro         ← Only checked if #1 is undefined
3. Cloud providers (Bedrock, Vertex)

// Therefore, to use OAuth:
delete process.env.ANTHROPIC_API_KEY;  // REQUIRED!
```

**2. Environment Variable Management**
```javascript
// Save original
this.originalApiKey = process.env.ANTHROPIC_API_KEY;

// For OAuth: DELETE it
delete process.env.ANTHROPIC_API_KEY;

// For API key: SET it
process.env.ANTHROPIC_API_KEY = userApiKey;

// After call: RESTORE it
process.env.ANTHROPIC_API_KEY = this.originalApiKey;
```

**3. Encryption Key Setup**
```bash
# Generate 32-byte (64 hex char) key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
API_KEY_ENCRYPTION_SECRET=your-64-char-hex-here
```

---

## 🧪 TDD Test Cases

### Test Suite 1: ClaudeAuthManager
```javascript
describe('ClaudeAuthManager', () => {
  test('getAuthConfig returns OAuth config when method is oauth', async () => {
    // Arrange
    const userId = 'user-123';
    await setUserAuthMethod(userId, 'oauth');

    // Act
    const config = await authManager.getAuthConfig(userId);

    // Assert
    expect(config.method).toBe('oauth');
    expect(config.apiKey).toBeNull();
    expect(config.trackUsage).toBe(false);
  });

  test('prepareSDKAuth DELETES ANTHROPIC_API_KEY for OAuth', () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const config = { method: 'oauth' };

    // Act
    authManager.prepareSDKAuth(config);

    // Assert
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  test('prepareSDKAuth SETS user API key for user_api_key method', () => {
    // Arrange
    const userKey = 'sk-ant-user-key';
    const config = { method: 'user_api_key', apiKey: userKey };

    // Act
    authManager.prepareSDKAuth(config);

    // Assert
    expect(process.env.ANTHROPIC_API_KEY).toBe(userKey);
  });

  test('restoreSDKAuth restores original key after OAuth', () => {
    // Arrange
    const originalKey = 'sk-ant-avi-key';
    process.env.ANTHROPIC_API_KEY = originalKey;
    authManager.originalApiKey = originalKey;
    delete process.env.ANTHROPIC_API_KEY;

    // Act
    authManager.restoreSDKAuth({ method: 'oauth' });

    // Assert
    expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);
  });

  test('trackUsage inserts record into usage_billing table', async () => {
    // Arrange
    const userId = 'user-123';
    const tokens = { input: 100, output: 200 };
    const cost = 0.0045;

    // Act
    await authManager.trackUsage(userId, tokens, cost);

    // Assert
    const records = await db.prepare('SELECT * FROM usage_billing WHERE user_id = ?').all(userId);
    expect(records.length).toBe(1);
    expect(records[0].tokens_input).toBe(100);
    expect(records[0].cost_usd).toBe(0.0045);
  });
});
```

### Test Suite 2: API Key Encryption
```javascript
describe('ApiKeyEncryption', () => {
  test('encryptApiKey encrypts and decryptApiKey decrypts correctly', () => {
    const apiKey = 'sk-ant-api03-' + 'A'.repeat(95) + 'AA';
    const encrypted = encryptApiKey(apiKey);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(apiKey);
  });

  test('isValidApiKey validates correct format', () => {
    const validKey = 'sk-ant-api03-' + 'A'.repeat(95) + 'AA';
    expect(isValidApiKey(validKey)).toBe(true);
  });

  test('isValidApiKey rejects invalid format', () => {
    expect(isValidApiKey('sk-invalid')).toBe(false);
  });
});
```

---

## 📸 Playwright Validation Scenarios

### Scenario 1: OAuth Setup (Option A)
1. Navigate to `/settings`
2. Screenshot: "01-settings-default.png"
3. Click "Use My Claude Max/Pro Subscription"
4. Screenshot: "02-oauth-selected.png"
5. Verify OAuth status badge shows "Available" or "Requires login"
6. Screenshot: "03-oauth-status.png"
7. Click "Save Settings"
8. Screenshot: "04-oauth-saved.png"

### Scenario 2: API Key Setup (Option B)
1. Navigate to `/settings`
2. Click "Use My Own API Key"
3. Enter API key in password field
4. Screenshot: "05-api-key-input.png"
5. Click "Save Settings"
6. Verify success message
7. Screenshot: "06-api-key-saved.png"

### Scenario 3: Pay-As-You-Go (Option C)
1. Navigate to `/settings`
2. Click "Pay As You Go"
3. Verify billing summary displays
4. Screenshot: "07-payg-billing.png"
5. Make a test request
6. Refresh billing
7. Verify usage increased
8. Screenshot: "08-payg-usage-tracked.png"

---

## 🚨 Critical Success Criteria

- [ ] Option A (OAuth): Works with Claude Max subscription, NO API key charged
- [ ] Option B (User API Key): Uses user's key, charges their Anthropic account
- [ ] Option C (Pay-as-you-go): Uses Avi's key, tracks usage in database
- [ ] Switching between options works without server restart
- [ ] API keys encrypted at rest (AES-256-GCM)
- [ ] Usage billing accurate (matches SDK token counts)
- [ ] Frontend shows correct auth status
- [ ] NO mocks or simulations - 100% real database operations
- [ ] NO API key exposure in frontend code or network requests
- [ ] All tests pass (unit + integration + E2E)

---

## 📝 Agent Assignments

**Agent 1**: Database Architect → Phase 1
**Agent 2**: Backend Developer → Phase 2
**Agent 3**: Security Engineer → Phase 3
**Agent 4**: System Integration → Phase 4
**Agent 5**: SDK Integration → Phase 5
**Agent 6**: API Developer → Phase 6
**Agent 7**: Frontend Developer → Phases 7 & 8
**Agent 8**: QA Engineer → Phase 9

All agents run CONCURRENTLY via Claude-Flow Swarm coordination.

---

## ✅ Completion Checklist

- [ ] All 47 tasks completed
- [ ] All TDD tests passing
- [ ] Playwright screenshots captured (8 scenarios)
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Production deployment ready

**Total Implementation Time:** 20-27 hours estimated
**Actual Time:**
**Completed:**
