# SPARC Specification: Username Collection & Display System

**Date**: 2025-11-02
**Initiative**: #2 - Username Collection (Production Readiness Plan)
**Status**: SPECIFICATION PHASE
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Estimated Effort**: 1.5 days (7 concurrent agents)

---

## SPECIFICATION PHASE

### Problem Statement

**Current State**: Users are displayed as "User Agent" or "demo-user-123" throughout the application, creating an impersonal and unprofessional experience.

**Desired State**: Every user has a personalized display name collected during onboarding and shown consistently across all UI components.

**Impact**:
- Poor user experience (generic names)
- No personalization
- Unprofessional appearance
- Users can't identify themselves in the feed

---

### Functional Requirements

**FR-1: Database Schema for User Settings**
- Create `user_settings` table to store user preferences
- Store `user_id`, `display_name`, `onboarding_completed` flag
- Include timestamps for audit trail
- Support future user preferences (posting frequency, etc.)
- **Acceptance**: Migration creates table with proper schema

**FR-2: Username Collection in Onboarding**
- get-to-know-you-agent asks for preferred name FIRST
- Provide clear examples (first name, full name, nickname, professional title)
- Store username in user_settings table
- Handle edge cases (empty input, very long names, special characters)
- **Acceptance**: Agent successfully collects and stores username

**FR-3: API Endpoints for Username Management**
- GET `/api/user-settings/:userId` - Retrieve user settings
- POST `/api/user-settings` - Create/update user settings
- PATCH `/api/user-settings/:userId` - Update specific fields
- Support username validation (length, characters, uniqueness)
- **Acceptance**: All endpoints tested and working

**FR-4: Frontend Display Name Integration**
- Replace all "User Agent" hardcoded strings
- Use display name from user settings API
- Fallback to "User" if no display name set
- Update components: PostCard, CommentThread, CommentForm, AgentProfileTab
- **Acceptance**: No "User Agent" visible anywhere in UI

**FR-5: Onboarding State Management**
- Track onboarding completion status
- Prevent re-onboarding on second session
- Auto-trigger onboarding for new users
- Store onboarding completion timestamp
- **Acceptance**: Users only see onboarding once

**FR-6: Username Persistence**
- Display name persists across browser sessions
- Display name syncs across multiple tabs
- Display name appears in posts, comments, and replies
- Real-time updates when username changes
- **Acceptance**: Username shows consistently everywhere

---

### Non-Functional Requirements

**NFR-1: Data Validation**
- Display names: 1-50 characters
- Allow unicode characters (international names)
- Trim whitespace
- Sanitize HTML/script tags
- Reject offensive language (basic filter)

**NFR-2: Performance**
- User settings API responds in <100ms
- Display name loads before UI renders
- No flickering or "User Agent" → "Real Name" transitions
- Cached display names for performance

**NFR-3: Privacy & Security**
- Display names are public (visible to all users)
- Users can change their display name anytime
- No PII required beyond display name
- Audit trail for username changes

**NFR-4: Backward Compatibility**
- Existing posts/comments without display names show fallback
- Database migration doesn't break existing data
- API endpoints don't break existing frontend

---

## PSEUDOCODE PHASE

### Agent Team Structure (7 Concurrent Agents)

```
Agent 1: Database Schema Architect
  PROCEDURE CreateUserSettingsTable():
    1. Read existing database schema
    2. Design user_settings table:
       - user_id TEXT PRIMARY KEY
       - display_name TEXT NOT NULL
       - display_name_style TEXT (first_only|full_name|nickname|professional)
       - onboarding_completed INTEGER DEFAULT 0
       - onboarding_completed_at INTEGER
       - profile_json TEXT
       - created_at INTEGER NOT NULL
       - updated_at INTEGER NOT NULL
    3. Create migration file: 010-user-settings.sql
    4. Add migration to migration runner
    5. Test migration (up and down)
    6. Document schema in README
    RETURN: Migration file and documentation

Agent 2: Get-to-Know-You Agent Updater
  PROCEDURE UpdateOnboardingAgent():
    1. Read /prod/.claude/agents/get-to-know-you-agent.md
    2. Add username collection as FIRST step:
       - Clear examples provided
       - Multiple naming styles offered
       - Validation for empty/invalid input
    3. Update agent to call API to store username
    4. Update completion post to use collected username
    5. Add onboarding_completed flag setting
    6. Test agent instructions flow
    7. Document changes
    RETURN: Updated agent file with username collection

Agent 3: API Endpoints Developer
  PROCEDURE CreateUsernameAPIs():
    1. Create /api-server/routes/user-settings.js
    2. Implement GET /api/user-settings/:userId
       - Query user_settings table
       - Return display_name, onboarding_completed, etc.
       - Handle user not found (404)
    3. Implement POST /api/user-settings
       - Validate display_name (1-50 chars, sanitize)
       - Insert/update user_settings
       - Return created/updated record
    4. Implement PATCH /api/user-settings/:userId
       - Update specific fields
       - Validate input
    5. Add routes to server.js
    6. Create API service wrapper for frontend
    7. Write API integration tests
    RETURN: API endpoints and tests

Agent 4: Frontend Display Name Integrator
  PROCEDURE ReplaceUserAgentStrings():
    1. Search codebase for "User Agent" strings:
       grep -r "User Agent" frontend/src/
    2. Identify all components showing author names:
       - PostCard.tsx
       - CommentThread.tsx
       - CommentForm.tsx
       - AgentProfileTab.tsx
    3. Create useUserSettings hook:
       - Fetch user settings on mount
       - Cache display name
       - Provide loading state
    4. Update each component:
       - Import useUserSettings hook
       - Replace "User Agent" with displayName
       - Add fallback to "User"
    5. Test each component with/without display name
    RETURN: Updated components with display names

Agent 5: Onboarding State Manager
  PROCEDURE ImplementOnboardingState():
    1. Create OnboardingService class:
       - checkOnboardingStatus(userId)
       - markOnboardingComplete(userId, profileData)
       - getUserProfile(userId)
    2. Add middleware to detect first-time users:
       - Check user_settings for onboarding_completed
       - Auto-trigger get-to-know-you-agent if new
    3. Update frontend to check onboarding status:
       - Redirect to onboarding if not completed
       - Skip if already completed
    4. Test onboarding flow end-to-end
    RETURN: Onboarding state management

Agent 6: TDD Test Suite Creator
  PROCEDURE CreateTestSuite():
    1. Unit tests for user settings API:
       - Test GET endpoint (user exists, user not found)
       - Test POST endpoint (valid, invalid input)
       - Test PATCH endpoint (update username)
       - Test validation logic (length, sanitization)
    2. Unit tests for frontend components:
       - Test useUserSettings hook
       - Test PostCard with display name
       - Test CommentThread with display name
    3. Integration tests:
       - Test onboarding flow with username collection
       - Test username persistence across sessions
       - Test username display in feed
    4. All tests use REAL database and API (no mocks)
    RETURN: Comprehensive test suite

Agent 7: Integration Validator & Documentation
  PROCEDURE ValidateIntegration():
    1. Execute complete user flow:
       - New user lands on app
       - Onboarding triggered automatically
       - Username collected and stored
       - Feed shows username in posts/comments
       - Username persists after browser refresh
    2. Take screenshots at each step:
       - Onboarding username question
       - Username in feed
       - Username in comments
       - Settings page (if exists)
    3. Verify no "User Agent" strings visible
    4. Test edge cases:
       - Very long username (50 chars)
       - Unicode characters (emoji, international)
       - Empty username (should show validation error)
    5. Create final validation report
    6. Update PRODUCTION-READINESS-PLAN.md
    RETURN: Validation report and updated docs
```

---

## ARCHITECTURE PHASE

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 New User First Visit                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Middleware: Check Onboarding Status              │
│  - GET /api/user-settings/:userId                           │
│  - If onboarding_completed = 0, redirect to onboarding     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Get-to-Know-You Agent (Updated)                           │
│  1. "What would you like me to call you?"                  │
│  2. Collect username input                                  │
│  3. Validate (1-50 chars, sanitize)                        │
│  4. POST /api/user-settings { display_name, user_id }     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  API Server: User Settings Endpoints                       │
│  - POST /api/user-settings                                  │
│    └─> Insert into user_settings table                     │
│  - PATCH /api/user-settings/:userId                        │
│    └─> Update display_name                                 │
│  - GET /api/user-settings/:userId                          │
│    └─> Return display_name, onboarding_completed          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite Database: user_settings Table                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ user_id | display_name | onboarding_completed | ... │  │
│  │ user-1  | "Alex Chen"  | 1                    | ... │  │
│  │ user-2  | "Dr. Smith"  | 1                    | ... │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Components (Updated)                             │
│  - useUserSettings() hook fetches display name             │
│  - PostCard shows "Alex Chen" instead of "User Agent"     │
│  - CommentThread shows "Dr. Smith" in comments             │
│  - Display name cached in React context                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → Validation → API → Database → Cache → UI Display

Example Flow:
1. User types: "Alex Chen"
2. Frontend validates: length OK, no HTML
3. POST /api/user-settings { user_id: "user-1", display_name: "Alex Chen" }
4. Backend validates: sanitize, check length
5. INSERT INTO user_settings (user_id, display_name, ...) VALUES (...)
6. Backend returns: { success: true, data: { display_name: "Alex Chen" } }
7. Frontend caches in React context
8. All components use "Alex Chen" for user-1
```

### Database Schema

```sql
-- Migration: 010-user-settings.sql

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  display_name_style TEXT CHECK(display_name_style IN ('first_only', 'full_name', 'nickname', 'professional')),
  onboarding_completed INTEGER DEFAULT 0 CHECK(onboarding_completed IN (0, 1)),
  onboarding_completed_at INTEGER,
  profile_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding ON user_settings(onboarding_completed);

-- Trigger to update updated_at
CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp
AFTER UPDATE ON user_settings
FOR EACH ROW
BEGIN
  UPDATE user_settings SET updated_at = unixepoch() WHERE user_id = NEW.user_id;
END;
```

### API Specification

**GET /api/user-settings/:userId**
```json
Response 200:
{
  "success": true,
  "data": {
    "user_id": "demo-user-123",
    "display_name": "Alex Chen",
    "display_name_style": "full_name",
    "onboarding_completed": 1,
    "onboarding_completed_at": 1730588400,
    "created_at": 1730588400,
    "updated_at": 1730588400
  }
}

Response 404:
{
  "success": false,
  "error": "User settings not found"
}
```

**POST /api/user-settings**
```json
Request:
{
  "user_id": "demo-user-123",
  "display_name": "Alex Chen",
  "display_name_style": "full_name"
}

Response 201:
{
  "success": true,
  "data": {
    "user_id": "demo-user-123",
    "display_name": "Alex Chen",
    "display_name_style": "full_name",
    "onboarding_completed": 0,
    "created_at": 1730588400,
    "updated_at": 1730588400
  }
}

Response 400:
{
  "success": false,
  "error": "Invalid display_name: must be 1-50 characters"
}
```

**PATCH /api/user-settings/:userId**
```json
Request:
{
  "display_name": "Dr. Alex Chen"
}

Response 200:
{
  "success": true,
  "data": {
    "user_id": "demo-user-123",
    "display_name": "Dr. Alex Chen",
    "updated_at": 1730588500
  }
}
```

---

## REFINEMENT PHASE (TDD)

### Test Plan

**Database Migration Tests**
```javascript
describe('user_settings table migration', () => {
  test('creates table with correct schema', async () => {
    // Run migration
    await runMigration('010-user-settings.sql');

    // Verify table exists
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'");
    expect(tables.length).toBe(1);

    // Verify columns
    const columns = await db.query("PRAGMA table_info(user_settings)");
    expect(columns.map(c => c.name)).toContain('user_id');
    expect(columns.map(c => c.name)).toContain('display_name');
    expect(columns.map(c => c.name)).toContain('onboarding_completed');
  });

  test('enforces NOT NULL on display_name', async () => {
    await expect(async () => {
      await db.insert('user_settings', { user_id: 'test-user' });
    }).rejects.toThrow();
  });

  test('defaults onboarding_completed to 0', async () => {
    await db.insert('user_settings', {
      user_id: 'test-user',
      display_name: 'Test User'
    });
    const user = await db.queryOne('SELECT * FROM user_settings WHERE user_id = ?', ['test-user']);
    expect(user.onboarding_completed).toBe(0);
  });
});
```

**API Endpoint Tests**
```javascript
describe('User Settings API', () => {
  describe('GET /api/user-settings/:userId', () => {
    test('returns user settings when user exists', async () => {
      // Setup: Create user in database
      await db.insert('user_settings', {
        user_id: 'test-user',
        display_name: 'Test User',
        onboarding_completed: 1
      });

      const response = await fetch('/api/user-settings/test-user');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.display_name).toBe('Test User');
    });

    test('returns 404 when user not found', async () => {
      const response = await fetch('/api/user-settings/nonexistent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/user-settings', () => {
    test('creates new user settings', async () => {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'new-user',
          display_name: 'New User',
          display_name_style: 'full_name'
        })
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.display_name).toBe('New User');

      // Verify in database
      const dbUser = await db.queryOne('SELECT * FROM user_settings WHERE user_id = ?', ['new-user']);
      expect(dbUser.display_name).toBe('New User');
    });

    test('validates display_name length', async () => {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user',
          display_name: 'a'.repeat(51) // Too long
        })
      });

      expect(response.status).toBe(400);
    });

    test('sanitizes HTML in display_name', async () => {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user',
          display_name: '<script>alert("xss")</script>Test'
        })
      });

      const data = await response.json();
      expect(data.data.display_name).not.toContain('<script>');
      expect(data.data.display_name).toBe('Test');
    });
  });
});
```

**Frontend Component Tests**
```javascript
describe('useUserSettings hook', () => {
  test('fetches user settings on mount', async () => {
    const { result, waitFor } = renderHook(() => useUserSettings('test-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.displayName).toBe('Test User');
    expect(result.current.onboardingCompleted).toBe(true);
  });

  test('provides fallback when no settings found', async () => {
    const { result, waitFor } = renderHook(() => useUserSettings('nonexistent'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.displayName).toBe('User');
  });
});

describe('PostCard with display names', () => {
  test('shows display name instead of User Agent', async () => {
    render(<PostCard post={mockPost} currentUser="test-user" />);

    await waitFor(() => {
      expect(screen.queryByText('User Agent')).not.toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

**Onboarding Integration Tests**
```javascript
describe('Onboarding Flow with Username Collection', () => {
  test('new user sees username question first', async () => {
    // Simulate new user (no user_settings record)
    const page = await browser.newPage();
    await page.goto(APP_URL);

    // Should see onboarding
    await page.waitForSelector('text="What would you like me to call you?"');

    // Take screenshot
    await page.screenshot({ path: 'onboarding-username-question.png' });
  });

  test('username is saved and displayed in feed', async () => {
    const page = await browser.newPage();
    await page.goto(APP_URL);

    // Complete onboarding
    await page.fill('[data-testid="username-input"]', 'Alex Chen');
    await page.click('[data-testid="submit-username"]');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="post-feed"]');

    // Verify username appears in feed
    const authorName = await page.textContent('[data-testid="post-author"]');
    expect(authorName).toBe('Alex Chen');
    expect(authorName).not.toBe('User Agent');
  });

  test('username persists across browser refresh', async () => {
    const page = await browser.newPage();
    await page.goto(APP_URL);

    // Set username
    await setUsername(page, 'Dr. Smith');

    // Refresh browser
    await page.reload();

    // Verify username still shows
    const authorName = await page.textContent('[data-testid="post-author"]');
    expect(authorName).toBe('Dr. Smith');
  });
});
```

---

## COMPLETION PHASE

### Acceptance Criteria

**✅ Database**
- [ ] user_settings table exists with correct schema
- [ ] Migration runs successfully (up and down)
- [ ] All constraints enforced (NOT NULL, CHECK)
- [ ] Indexes created for performance

**✅ Get-to-Know-You Agent**
- [ ] Username question appears FIRST in onboarding
- [ ] Clear examples provided to user
- [ ] Username is saved via API call
- [ ] Validation errors shown for invalid input
- [ ] Completion post uses collected username

**✅ API Endpoints**
- [ ] GET /api/user-settings/:userId returns settings
- [ ] POST /api/user-settings creates new record
- [ ] PATCH /api/user-settings/:userId updates fields
- [ ] All validation working (length, sanitization)
- [ ] Error responses correct (404, 400, etc.)

**✅ Frontend Components**
- [ ] No "User Agent" visible anywhere in UI
- [ ] Display names shown in PostCard
- [ ] Display names shown in CommentThread
- [ ] Display names shown in CommentForm
- [ ] Fallback to "User" when no display name

**✅ Onboarding State**
- [ ] New users see onboarding automatically
- [ ] Onboarding only shown once
- [ ] onboarding_completed flag set correctly
- [ ] Returning users skip onboarding

**✅ Testing**
- [ ] All unit tests pass (API, frontend, database)
- [ ] Integration tests pass (onboarding flow)
- [ ] E2E tests pass (Playwright)
- [ ] Manual browser validation complete

### Deliverables

1. **Database Migration**
   - File: `/workspaces/agent-feed/api-server/db/migrations/010-user-settings.sql`
   - Documentation in migration README

2. **Updated Agent**
   - File: `/workspaces/agent-feed/prod/.claude/agents/get-to-know-you-agent.md`
   - Username collection step added

3. **API Endpoints**
   - File: `/workspaces/agent-feed/api-server/routes/user-settings.js`
   - Routes registered in server.js
   - API service for frontend

4. **Frontend Updates**
   - Hook: `/workspaces/agent-feed/frontend/src/hooks/useUserSettings.ts`
   - Updated: PostCard.tsx, CommentThread.tsx, CommentForm.tsx
   - Service: `/workspaces/agent-feed/frontend/src/services/userSettings.ts`

5. **Tests**
   - Unit: `/workspaces/agent-feed/api-server/tests/user-settings.test.js`
   - Frontend: `/workspaces/agent-feed/frontend/src/tests/unit/useUserSettings.test.ts`
   - E2E: `/workspaces/agent-feed/frontend/src/tests/e2e/onboarding-username.spec.ts`

6. **Documentation**
   - Validation report: `/workspaces/agent-feed/docs/test-results/username-collection/VALIDATION-REPORT.md`
   - Updated: PRODUCTION-READINESS-PLAN.md

---

## Agent Coordination Protocol

### Agent Execution Order

**Phase 1: Foundation (Parallel)**
- Agent 1: Database migration
- Agent 3: API endpoints
- Agent 5: Onboarding state management

**Phase 2: Integration (After Phase 1)**
- Agent 2: Update get-to-know-you-agent (needs API endpoints)
- Agent 4: Frontend components (needs API service)

**Phase 3: Validation (After Phase 2)**
- Agent 6: TDD test suite (needs all components)
- Agent 7: Integration validation (needs complete system)

### Success Metrics

- **0 instances** of "User Agent" in production UI
- **100% test coverage** for new API endpoints
- **<100ms API response time** for user settings
- **95%+ test pass rate** for E2E onboarding flow
- **All screenshots** show personalized usernames

---

**Status**: SPECIFICATION COMPLETE - READY FOR AGENT EXECUTION
**Next**: Spawn 7 concurrent agents via Claude-Flow Swarm
**Estimated Completion**: 1.5 days (12 work hours)
