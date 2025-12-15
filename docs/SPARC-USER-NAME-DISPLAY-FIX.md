# SPARC Specification: User Name Display System Fix

## Project Metadata

**Document Version**: 1.0.0
**Created**: 2025-11-05
**Status**: Specification Phase
**Priority**: HIGH
**Complexity**: Medium
**Estimated Effort**: 4-6 hours

---

## S - SPECIFICATION

### 1.1 Executive Summary

The user name display system has multiple critical issues preventing proper display of user names throughout the application. User "Woz" reports that the system shows "demo-user-123" instead of their chosen display name, and comments consistently show "User" instead of actual author names. This specification defines a comprehensive fix addressing database schema issues, frontend display logic, and onboarding data persistence.

### 1.2 Problem Statement

**Current Broken State:**

1. **User Settings Issue**: Database shows `demo-user-123` → display_name "Nerd" but user expects "Woz"
2. **Comment Author Schema**: `comments.author` field stores TEXT names instead of user_ids, breaking lookups
3. **Component Display Logic**: `UserDisplayName` component expects user_id, receives name → lookup fails → shows "User"
4. **Hardcoded Values**: Multiple locations have hardcoded `demo-user-123` and `ProductionValidator`
5. **Onboarding Data Loss**: `onboarding_state.responses` is empty `{}`, name not persisted from onboarding

**Real-World Evidence:**

```sql
-- Current user_settings state
SELECT * FROM user_settings WHERE user_id = 'demo-user-123';
-- Result: demo-user-123|Nerd||1||{}|1762116919|1762236271
--         user_id       |display_name = "Nerd" (should be "Woz")

-- Current comments state
SELECT id, content, author FROM comments LIMIT 3;
-- Result: author field has "Woz", "ProductionValidator" (TEXT names)
--         Should have: user_ids like "demo-user-123"
```

### 1.3 Requirements

#### R1: Display Name Persistence (Critical)
- **R1.1**: User display name "Woz" must persist from onboarding to `user_settings.display_name`
- **R1.2**: Onboarding responses must be saved to `onboarding_state.responses` JSON field
- **R1.3**: Display name must sync between `onboarding_state.responses.name` and `user_settings.display_name`
- **Acceptance Criteria**:
  - User tells Avi their name is "Woz"
  - System saves to `onboarding_state.responses = {"name": "Woz", ...}`
  - System updates `user_settings.display_name = "Woz"`
  - Name appears everywhere as "Woz"

#### R2: Comment Author Schema Fix (Critical)
- **R2.1**: Add `author_user_id` column to `comments` table (TEXT, nullable for backward compat)
- **R2.2**: Migrate existing comment authors: if author matches display_name, set author_user_id
- **R2.3**: New comments must populate `author_user_id` instead of `author` TEXT field
- **R2.4**: Support dual mode: user comments (author_user_id) vs agent comments (author_agent)
- **Acceptance Criteria**:
  ```sql
  -- New schema
  CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    author TEXT,              -- DEPRECATED: Legacy TEXT name
    author_user_id TEXT,      -- NEW: User ID reference
    author_agent TEXT,        -- Agent identifier
    -- ... other fields
  );

  -- New comment from user "Woz" (demo-user-123)
  INSERT INTO comments VALUES (
    id, post_id, content,
    'Woz',              -- Legacy (kept for old data)
    'demo-user-123',    -- NEW: Proper user_id
    NULL,               -- Not an agent
    ...
  );
  ```

#### R3: Frontend Display Logic (Critical)
- **R3.1**: `UserDisplayName` component must handle both user_id and direct names
- **R3.2**: Comment rendering must check `author_user_id` first, fallback to `author_agent`
- **R3.3**: No "User" fallback should appear when valid data exists
- **R3.4**: Support display name resolution for both users and agents
- **Acceptance Criteria**:
  - User comment shows: "Woz" (from user_settings lookup via author_user_id)
  - Agent comment shows: "Λvi" or "ProductionValidator" (from author_agent)
  - No "User" appears anywhere

#### R4: Remove Hardcoded Values (High)
- **R4.1**: Remove hardcoded `userId = 'demo-user-123'` from RealSocialMediaFeed.tsx:163
- **R4.2**: Remove hardcoded `author: 'ProductionValidator'` from comment creation (line 655)
- **R4.3**: Implement proper user context/authentication to get current user_id
- **R4.4**: Use actual logged-in user_id for all user operations
- **Acceptance Criteria**:
  - No hardcoded user identifiers in code
  - Dynamic user context from auth/session
  - Comments created with actual user's user_id

#### R5: Onboarding Integration (High)
- **R5.1**: Get-to-Know-You agent must save responses to `onboarding_state.responses`
- **R5.2**: Phase completion must trigger user_settings sync
- **R5.3**: Display name from responses must populate user_settings immediately
- **Acceptance Criteria**:
  ```javascript
  // After onboarding conversation:
  onboarding_state.responses = {
    "name": "Woz",
    "use_case": "...",
    "comm_style": "...",
    ...
  }

  // Triggers immediate update:
  user_settings.display_name = "Woz"
  ```

#### R6: Backward Compatibility (Medium)
- **R6.1**: Existing comments with TEXT author names must still display
- **R6.2**: Migration script must handle all edge cases
- **R6.3**: System must work with partial data (some users have names, some don't)
- **Acceptance Criteria**:
  - Old comments with TEXT authors display correctly
  - New comments use proper schema
  - No data loss during migration

### 1.4 Non-Functional Requirements

#### NFR1: Performance
- User display name lookups must be cached (current: 1-minute TTL)
- Comment rendering should not block on name resolution
- Database queries must use indexes for author lookups

#### NFR2: Data Integrity
- No orphaned author references
- Foreign key constraints where applicable
- Audit trail for display name changes

#### NFR3: User Experience
- Display names appear instantly after onboarding
- No flashing "User" fallback text
- Consistent naming across all components

#### NFR4: Maintainability
- Clear separation: user names vs agent names
- Documented data flow from onboarding → user_settings
- Migration scripts are idempotent

### 1.5 Constraints

**Technical Constraints:**
- SQLite database (no ALTER TABLE ... CHANGE, must use ALTER TABLE ... ADD)
- React frontend with TypeScript
- Existing user_settings and comments tables have live data
- Cannot break existing comment display during migration

**Business Constraints:**
- Must fix immediately - user reports issue actively
- Zero data loss acceptable
- Backward compatibility required for existing comments

**Timeline Constraints:**
- Specification: Day 1 (current)
- Implementation: Day 1-2 (4-6 hours)
- Testing: Day 2 (2 hours)
- Deployment: Day 2 (1 hour)

### 1.6 Success Metrics

**Functional Success:**
- [ ] User "Woz" sees their name everywhere (not "demo-user-123" or "User")
- [ ] New comments show correct author names
- [ ] Old comments still display properly
- [ ] No "User" fallback when real names exist

**Technical Success:**
- [ ] All database migrations complete without errors
- [ ] Zero hardcoded user identifiers remain
- [ ] Test coverage ≥85% for name display logic
- [ ] Performance: <50ms for name resolution

**User Success:**
- [ ] User confirms their name displays correctly
- [ ] No confusion about who authored comments
- [ ] System feels personalized and responsive

### 1.7 Out of Scope

**Explicitly NOT included:**
- User authentication system overhaul (use existing session)
- Profile pictures/avatars
- Display name history tracking
- Multi-language display names
- Display name validation rules (beyond basic SQL constraints)

---

## P - PSEUDOCODE

### 2.1 Database Schema Migration

```sql
-- MIGRATION: 20250105-user-name-display-fix.sql

-- Step 1: Add author_user_id column to comments table
-- (SQLite: ALTER TABLE ADD COLUMN only)
ALTER TABLE comments ADD COLUMN author_user_id TEXT;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_author_user_id
  ON comments(author_user_id);

-- Step 3: Migrate existing data (best effort)
-- Match TEXT author names to display_name in user_settings
UPDATE comments
SET author_user_id = (
  SELECT user_id
  FROM user_settings
  WHERE user_settings.display_name = comments.author
  LIMIT 1
)
WHERE author_user_id IS NULL
  AND author_agent IS NULL  -- Only update user comments
  AND author IN (SELECT display_name FROM user_settings);

-- Step 4: Add foreign key check trigger (soft enforcement)
CREATE TRIGGER IF NOT EXISTS validate_comment_author_user_id
BEFORE INSERT ON comments
FOR EACH ROW
WHEN NEW.author_user_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Invalid author_user_id: user does not exist')
  WHERE NOT EXISTS (
    SELECT 1 FROM user_settings WHERE user_id = NEW.author_user_id
  );
END;

-- Step 5: Verify migration
SELECT
  COUNT(*) as total_comments,
  COUNT(author_user_id) as user_comments,
  COUNT(author_agent) as agent_comments,
  COUNT(*) - COUNT(author_user_id) - COUNT(author_agent) as unmigrated
FROM comments;
```

### 2.2 Backend API Changes

```javascript
// api-server/routes/comments.js

// CREATE COMMENT - Updated logic
async function createComment(req, res) {
  const { post_id, content, parent_id, mentioned_users } = req.body;

  // Get current user from session/auth
  const currentUserId = req.session?.userId || req.user?.id;

  if (!currentUserId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Fetch user's display name
  const userSettings = await db.get(
    'SELECT display_name FROM user_settings WHERE user_id = ?',
    [currentUserId]
  );

  const displayName = userSettings?.display_name || 'User';

  // Insert comment with proper author_user_id
  const commentId = generateId();
  await db.run(`
    INSERT INTO comments (
      id, post_id, content,
      author, author_user_id, author_agent,
      parent_id, mentioned_users, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    commentId,
    post_id,
    content,
    displayName,        // Legacy field (kept for backward compat)
    currentUserId,      // NEW: Proper user_id reference
    null,               // Not an agent comment
    parent_id,
    JSON.stringify(mentioned_users || []),
    new Date().toISOString()
  ]);

  // Return comment with resolved author name
  return res.json({
    success: true,
    data: {
      id: commentId,
      post_id,
      content,
      author: displayName,
      author_user_id: currentUserId,
      author_agent: null,
      created_at: new Date().toISOString()
    }
  });
}

// GET COMMENTS - Updated to resolve names
async function getPostComments(req, res) {
  const { postId } = req.params;
  const { userId } = req.query; // Requesting user (for permissions)

  // Fetch comments with LEFT JOIN to resolve user names
  const comments = await db.all(`
    SELECT
      c.*,
      us.display_name as resolved_user_name
    FROM comments c
    LEFT JOIN user_settings us ON c.author_user_id = us.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `, [postId]);

  // Transform results to include resolved names
  const enrichedComments = comments.map(comment => ({
    ...comment,
    // Priority: resolved_user_name > author_agent > legacy author
    author_display: comment.resolved_user_name
                    || comment.author_agent
                    || comment.author
                    || 'Unknown',
    is_user_comment: !!comment.author_user_id,
    is_agent_comment: !!comment.author_agent
  }));

  return res.json({
    success: true,
    data: enrichedComments
  });
}
```

### 2.3 Onboarding Integration

```javascript
// api-server/services/onboarding/onboarding-service.js

class OnboardingService {
  /**
   * Save user response during onboarding conversation
   */
  async saveResponse(userId, step, value) {
    // Get current responses
    const state = await db.get(
      'SELECT responses FROM onboarding_state WHERE user_id = ?',
      [userId]
    );

    const responses = state?.responses
      ? JSON.parse(state.responses)
      : {};

    // Update responses
    responses[step] = value;

    // Special handling for 'name' step
    if (step === 'name') {
      // IMMEDIATELY sync to user_settings
      await this.syncDisplayName(userId, value);
    }

    // Save back to onboarding_state
    await db.run(`
      UPDATE onboarding_state
      SET responses = ?, updated_at = unixepoch()
      WHERE user_id = ?
    `, [JSON.stringify(responses), userId]);

    console.log(`[Onboarding] Saved ${step} = ${value} for user ${userId}`);
  }

  /**
   * Sync display name from onboarding to user_settings
   */
  async syncDisplayName(userId, displayName) {
    await db.run(`
      UPDATE user_settings
      SET
        display_name = ?,
        updated_at = unixepoch()
      WHERE user_id = ?
    `, [displayName, userId]);

    console.log(`[Onboarding] Synced display_name="${displayName}" to user_settings`);

    // Clear cache so hooks pick up new name
    clearUserSettingsCache(userId);
  }

  /**
   * Complete onboarding phase - final sync
   */
  async completePhase(userId, phase) {
    // Get all responses
    const state = await db.get(
      'SELECT responses FROM onboarding_state WHERE user_id = ?',
      [userId]
    );

    const responses = JSON.parse(state?.responses || '{}');

    // Ensure display name is synced
    if (responses.name) {
      await this.syncDisplayName(userId, responses.name);
    }

    // Mark phase complete
    if (phase === 1) {
      await db.run(`
        UPDATE onboarding_state
        SET
          phase1_completed = 1,
          phase1_completed_at = unixepoch(),
          updated_at = unixepoch()
        WHERE user_id = ?
      `, [userId]);
    }

    // Update user_settings onboarding flag
    await db.run(`
      UPDATE user_settings
      SET
        onboarding_completed = 1,
        onboarding_completed_at = unixepoch()
      WHERE user_id = ?
    `, [userId]);
  }
}
```

### 2.4 Frontend Component Updates

```typescript
// frontend/src/components/UserDisplayName.tsx

/**
 * Enhanced UserDisplayName component
 * Handles both user_id and direct name display
 */
export const UserDisplayName: React.FC<UserDisplayNameProps> = ({
  userId,           // User ID to look up
  userName,         // Direct name (for legacy/agent names)
  fallback = 'User',
  className = '',
  showLoading = false
}) => {
  // Case 1: Direct name provided (agent comments, legacy data)
  if (userName) {
    return <span className={className}>{userName}</span>;
  }

  // Case 2: User ID provided - fetch from API
  const { displayName, loading } = useUserSettings(userId);

  if (loading && showLoading) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{displayName || fallback}</span>;
};

// frontend/src/components/CommentThread.tsx

/**
 * Updated comment rendering logic
 */
function renderCommentAuthor(comment: Comment) {
  // Priority order for author resolution:
  // 1. author_user_id (lookup via UserDisplayName)
  // 2. author_agent (agent identifier)
  // 3. author (legacy TEXT field)
  // 4. 'Unknown' fallback

  if (comment.author_user_id) {
    // User comment - look up display name
    return (
      <UserDisplayName
        userId={comment.author_user_id}
        fallback="User"
      />
    );
  }

  if (comment.author_agent) {
    // Agent comment - use agent display name mapping
    return (
      <span>{getAgentDisplayName(comment.author_agent)}</span>
    );
  }

  if (comment.author) {
    // Legacy comment - use stored TEXT name
    return <span>{comment.author}</span>;
  }

  // Last resort fallback
  return <span className="text-gray-400">Unknown</span>;
}

// frontend/src/components/RealSocialMediaFeed.tsx

/**
 * Remove hardcoded user_id, use dynamic context
 */
const RealSocialMediaFeed: React.FC<Props> = ({ className = '' }) => {
  // BEFORE: const [userId] = useState('demo-user-123'); // HARDCODED

  // AFTER: Get from auth context
  const { currentUser } = useAuth(); // Assumes auth context exists
  const userId = currentUser?.id || 'guest';

  // Comment creation - use actual user
  const handleNewComment = async (postId: string, content: string) => {
    // BEFORE: author: 'ProductionValidator' // HARDCODED

    // AFTER: Use current user from context
    const result = await apiService.createComment(postId, content, {
      // Backend will use session/auth to get user_id
      mentionedUsers: extractMentions(content)
    });

    // Backend returns comment with author_user_id populated
  };

  // Rest of component...
};
```

### 2.5 User Context / Authentication

```typescript
// frontend/src/contexts/AuthContext.tsx

/**
 * Authentication context to provide current user
 * (Minimal implementation - assumes session exists)
 */
interface User {
  id: string;
  display_name: string;
  email?: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      // Call API to get current session user
      const response = await apiService.getCurrentUser();

      if (response.success && response.data) {
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch current user:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      refreshUser: fetchCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// api-server/routes/auth.js

/**
 * Endpoint to get current session user
 */
router.get('/api/auth/current-user', async (req, res) => {
  const userId = req.session?.userId || 'demo-user-123'; // Fallback for demo

  const user = await db.get(`
    SELECT user_id, display_name, profile_json
    FROM user_settings
    WHERE user_id = ?
  `, [userId]);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  return res.json({
    success: true,
    data: {
      id: user.user_id,
      display_name: user.display_name,
      profile: user.profile_json ? JSON.parse(user.profile_json) : {}
    }
  });
});
```

---

## A - ARCHITECTURE

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AuthContext  │  │ CommentThread│  │RealSocialFeed│      │
│  │ (useAuth)    │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────┬───────┴─────────────────┘               │
│                   │                                         │
│         ┌─────────▼─────────┐                               │
│         │ UserDisplayName   │                               │
│         │ (useUserSettings) │                               │
│         └─────────┬─────────┘                               │
│                   │                                         │
└───────────────────┼─────────────────────────────────────────┘
                    │ API Calls
┌───────────────────▼─────────────────────────────────────────┐
│                   API SERVER (Express)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ /api/auth/       │  │ /api/comments/   │                │
│  │ current-user     │  │ create, list     │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│  ┌────────▼─────────────────────▼─────────┐                │
│  │   OnboardingService                    │                │
│  │   - saveResponse()                     │                │
│  │   - syncDisplayName()                  │                │
│  │   - completePhase()                    │                │
│  └────────┬───────────────────────────────┘                │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │ SQL Queries
┌───────────▼─────────────────────────────────────────────────┐
│                   DATABASE (SQLite)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ user_settings    │  │ onboarding_state │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ user_id (PK)     │  │ user_id (PK, FK) │                │
│  │ display_name     │◄─┤ responses (JSON) │                │
│  │ onboarding_done  │  │ phase, step      │                │
│  └────────┬─────────┘  └──────────────────┘                │
│           │                                                 │
│  ┌────────▼─────────┐                                       │
│  │ comments         │                                       │
│  ├──────────────────┤                                       │
│  │ id (PK)          │                                       │
│  │ author (TEXT)    │  -- LEGACY FIELD                     │
│  │ author_user_id◄──┼──── NEW: FK to user_settings         │
│  │ author_agent     │  -- Agent identifier                 │
│  │ post_id          │                                       │
│  │ content          │                                       │
│  └──────────────────┘                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Diagrams

#### Flow 1: Onboarding → Display Name Persistence

```
User tells Avi: "My name is Woz"
         │
         ▼
┌─────────────────────┐
│ Get-to-Know-You     │
│ Agent (Avi)         │
│ Captures response   │
└──────────┬──────────┘
           │ POST /api/onboarding/response
           │ { step: "name", value: "Woz" }
           ▼
┌───────────────────────────────┐
│ OnboardingService             │
│ .saveResponse(userId, "name", │
│              "Woz")           │
└──────────┬────────────────────┘
           │
           ├─► UPDATE onboarding_state
           │   SET responses = '{"name": "Woz", ...}'
           │
           └─► syncDisplayName() ─────┐
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │ UPDATE user_settings   │
                         │ SET display_name="Woz" │
                         │ WHERE user_id=...      │
                         └────────┬───────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ Clear cache        │
                         │ Frontend re-fetches│
                         └────────┬───────────┘
                                  │
                                  ▼
                         Display name "Woz" appears
                         everywhere in UI
```

#### Flow 2: Comment Creation with User Name

```
User clicks "Add Comment"
         │
         ▼
┌──────────────────────┐
│ Frontend Component   │
│ - Get userId from    │
│   useAuth() context  │
│ - Call API           │
└──────────┬───────────┘
           │ POST /api/comments
           │ { post_id, content }
           │ (userId in session/auth)
           ▼
┌─────────────────────────────┐
│ Backend API                 │
│ - Extract userId from req   │
│ - Lookup display_name       │
│ - Insert with author_user_id│
└──────────┬──────────────────┘
           │
           ▼
┌────────────────────────────────┐
│ INSERT INTO comments           │
│ (                              │
│   author = "Woz",              │ -- Legacy (TEXT)
│   author_user_id = "demo-...", │ -- NEW (user_id)
│   author_agent = NULL          │ -- Not agent
│ )                              │
└──────────┬─────────────────────┘
           │
           ▼
Frontend receives comment
         │
         ▼
┌──────────────────────────┐
│ CommentThread Component  │
│ - Sees author_user_id    │
│ - Renders UserDisplayName│
│   with userId            │
└──────────┬───────────────┘
           │
           ▼
┌────────────────────────────┐
│ UserDisplayName Component  │
│ - useUserSettings(userId)  │
│ - Fetches display_name     │
│ - Displays "Woz"           │
└────────────────────────────┘
```

#### Flow 3: Comment Display (Mixed User/Agent)

```
Frontend loads post comments
         │
         ▼
┌──────────────────────────────┐
│ GET /api/comments?postId=... │
└──────────┬───────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Backend SQL with LEFT JOIN          │
│ SELECT c.*, us.display_name         │
│ FROM comments c                     │
│ LEFT JOIN user_settings us          │
│   ON c.author_user_id = us.user_id  │
└──────────┬──────────────────────────┘
           │
           ▼
Returns array:
[
  {
    id: "...",
    author: "Woz",              // Legacy
    author_user_id: "demo-...", // User comment
    author_agent: null,
    resolved_user_name: "Woz"   // From JOIN
  },
  {
    id: "...",
    author: "Λvi",              // Legacy
    author_user_id: null,
    author_agent: "avi",        // Agent comment
    resolved_user_name: null
  }
]
         │
         ▼
┌──────────────────────────────┐
│ Frontend CommentThread       │
│ Renders each comment:        │
│                              │
│ If author_user_id:           │
│   <UserDisplayName           │
│     userId={author_user_id}  │
│   /> → "Woz"                 │
│                              │
│ If author_agent:             │
│   getAgentDisplayName(...)   │
│   → "Λvi"                    │
└──────────────────────────────┘
```

### 3.3 Component Hierarchy

```
App
└── AuthProvider (new)
    └── RealSocialMediaFeed
        ├── useAuth() → currentUser.id
        │
        ├── EnhancedPostingInterface
        │   └── (posts use currentUser.id)
        │
        └── Post Card
            └── CommentThread
                └── Comment (for each)
                    ├── if author_user_id:
                    │   └── UserDisplayName
                    │       └── useUserSettings(userId)
                    │           └── API: /api/user-settings/:userId
                    │
                    └── if author_agent:
                        └── getAgentDisplayName(author_agent)
```

### 3.4 Database Schema (Updated)

```sql
-- user_settings (unchanged)
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  display_name_style TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_completed_at INTEGER,
  profile_json TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- onboarding_state (unchanged)
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER DEFAULT 1,
  step TEXT,
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT DEFAULT '{}',  -- JSON: {"name": "Woz", ...}
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
);

-- comments (UPDATED with new column)
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Author fields (three modes)
  author TEXT NOT NULL,           -- LEGACY: TEXT name (kept for backward compat)
  author_user_id TEXT,            -- NEW: User ID reference (for users)
  author_agent TEXT,              -- Agent identifier (for agents)

  parent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  likes INTEGER DEFAULT 0,
  mentioned_users TEXT DEFAULT '[]',
  content_type TEXT DEFAULT 'text',

  FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  -- Note: Soft FK to user_settings via trigger (not hard FK for flexibility)
);

-- Indexes
CREATE INDEX idx_comments_author_user_id ON comments(author_user_id);
CREATE INDEX idx_comments_author_agent ON comments(author_agent);
```

### 3.5 API Endpoints

#### New/Updated Endpoints

**GET /api/auth/current-user**
- **Purpose**: Get currently authenticated user
- **Auth**: Session required
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "demo-user-123",
      "display_name": "Woz",
      "profile": {}
    }
  }
  ```

**POST /api/comments**
- **Purpose**: Create new comment
- **Auth**: Session required
- **Body**:
  ```json
  {
    "post_id": "post-123",
    "content": "Great post!",
    "parent_id": null,
    "mentioned_users": ["avi"]
  }
  ```
- **Changed**: Now uses `author_user_id` from session, not hardcoded
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "comment-123",
      "author": "Woz",
      "author_user_id": "demo-user-123",
      "author_agent": null,
      "content": "Great post!",
      "created_at": "2025-11-05T..."
    }
  }
  ```

**GET /api/comments/:postId**
- **Purpose**: Get all comments for a post
- **Auth**: Optional (affects visibility)
- **Changed**: Now includes LEFT JOIN to resolve user names
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "comment-123",
        "author": "Woz",
        "author_user_id": "demo-user-123",
        "author_agent": null,
        "resolved_user_name": "Woz",
        "content": "...",
        "is_user_comment": true,
        "is_agent_comment": false
      },
      {
        "id": "comment-456",
        "author": "Λvi",
        "author_user_id": null,
        "author_agent": "avi",
        "resolved_user_name": null,
        "content": "...",
        "is_user_comment": false,
        "is_agent_comment": true
      }
    ]
  }
  ```

**POST /api/onboarding/response**
- **Purpose**: Save onboarding response
- **Auth**: Session required
- **Body**:
  ```json
  {
    "step": "name",
    "value": "Woz"
  }
  ```
- **Changed**: Now triggers immediate `syncDisplayName()` on "name" step
- **Side Effect**: Updates `user_settings.display_name` immediately

---

## R - REFINEMENT

### 4.1 Edge Cases

#### EC1: User Changes Display Name
**Scenario**: User "Woz" changes name to "Steve Wozniak"

**Handling**:
- Update `user_settings.display_name = "Steve Wozniak"`
- Clear user settings cache
- Old comments keep `author_user_id` unchanged
- Frontend re-renders with new name automatically

**Test**:
```javascript
test('display name change reflects everywhere', async () => {
  // Create comment as "Woz"
  await createComment('demo-user-123', 'Hello');

  // Change display name
  await updateUserSettings('demo-user-123', { display_name: 'Steve' });

  // Fetch comments - should show "Steve"
  const comments = await getComments(postId);
  expect(comments[0].resolved_user_name).toBe('Steve');
});
```

#### EC2: Comment Without Author Data
**Scenario**: Legacy comment has no `author_user_id` or `author_agent`

**Handling**:
- Fallback to `author` TEXT field
- If all fields null/empty, show "Unknown"
- Log warning for investigation

**Test**:
```javascript
test('handles legacy comments without author_user_id', async () => {
  // Insert legacy comment (migration missed it)
  await db.run(`
    INSERT INTO comments (id, post_id, content, author, author_user_id, author_agent)
    VALUES ('legacy-1', 'post-1', 'Old comment', 'OldUser', NULL, NULL)
  `);

  const comments = await getComments('post-1');
  expect(comments[0].author).toBe('OldUser'); // Falls back to TEXT
});
```

#### EC3: Agent Comment vs User Comment Confusion
**Scenario**: Agent name matches user display name (both "Avi")

**Handling**:
- Priority: `author_user_id` > `author_agent` > `author`
- Visual indicator (icon) to distinguish user vs agent
- Tooltip shows "User: Avi" vs "Agent: Avi"

**Test**:
```javascript
test('distinguishes user vs agent with same name', async () => {
  // User with display_name "Avi"
  await createUser('user-123', 'Avi');

  // User comment
  await createComment('post-1', 'Hello', { author_user_id: 'user-123' });

  // Agent comment
  await createComment('post-1', 'Hi!', { author_agent: 'avi' });

  const comments = await getComments('post-1');
  expect(comments[0].is_user_comment).toBe(true);
  expect(comments[1].is_agent_comment).toBe(true);
});
```

#### EC4: Onboarding Interrupted
**Scenario**: User starts onboarding, gives name "Woz", but doesn't complete

**Handling**:
- Name still saved to `onboarding_state.responses`
- `syncDisplayName()` runs immediately on name step
- Display name available even if onboarding incomplete
- User can resume onboarding later

**Test**:
```javascript
test('display name persists even if onboarding incomplete', async () => {
  // Start onboarding
  await saveOnboardingResponse('user-123', 'name', 'Woz');

  // Check user_settings (before completion)
  const settings = await getUserSettings('user-123');
  expect(settings.display_name).toBe('Woz');
  expect(settings.onboarding_completed).toBe(0);

  // User creates comment - should show "Woz"
  await createComment('post-1', 'Test', { author_user_id: 'user-123' });
  const comments = await getComments('post-1');
  expect(comments[0].resolved_user_name).toBe('Woz');
});
```

#### EC5: Multiple Users with Same Display Name
**Scenario**: Two users both choose "Woz"

**Handling**:
- Allowed (display_name has no UNIQUE constraint)
- `author_user_id` distinguishes them (different user_ids)
- Optional: Show username or email in tooltip for disambiguation

**Test**:
```javascript
test('multiple users can have same display name', async () => {
  await createUser('user-1', 'Woz');
  await createUser('user-2', 'Woz');

  await createComment('post-1', 'Hello', { author_user_id: 'user-1' });
  await createComment('post-1', 'Hi', { author_user_id: 'user-2' });

  const comments = await getComments('post-1');
  expect(comments[0].resolved_user_name).toBe('Woz');
  expect(comments[1].resolved_user_name).toBe('Woz');
  expect(comments[0].author_user_id).not.toBe(comments[1].author_user_id);
});
```

### 4.2 Performance Optimizations

**PO1: Cache User Display Names**
- Current: 1-minute TTL in `useUserSettings` hook
- Optimization: Increase to 5 minutes for display_name (low change frequency)
- Invalidation: Clear on user settings update

**PO2: Batch User Lookups**
- Current: One API call per comment author
- Optimization: Single query with LEFT JOIN in `getPostComments()`
- Result: N+1 problem eliminated

**PO3: Index on author_user_id**
- Migration adds: `CREATE INDEX idx_comments_author_user_id`
- Speeds up JOIN queries in comment fetching

**PO4: Prefetch Display Names**
- Load all user display names for visible comments in single batch
- Store in React context to avoid re-fetching

### 4.3 Security Considerations

**S1: SQL Injection Prevention**
- Use parameterized queries everywhere
- Never concatenate user input into SQL

**S2: Authorization**
- Comment creation requires valid session
- `author_user_id` taken from session, not user input
- Prevents user impersonation

**S3: Data Validation**
- Display name max length: 100 chars (enforce in API)
- Sanitize display names before rendering (prevent XSS)
- Validate `author_user_id` exists before INSERT (trigger)

**S4: Audit Trail**
- Log all display name changes
- Track who created each comment (immutable author_user_id)

### 4.4 Testing Strategy

#### Unit Tests
- `UserDisplayName` component: renders correctly for user_id, userName, fallback
- `useUserSettings` hook: caching, error handling, refresh
- `OnboardingService.syncDisplayName()`: updates user_settings correctly
- Comment API: creates comments with correct author_user_id

#### Integration Tests
- Onboarding → Display name persistence flow
- Comment creation → Display resolution flow
- Migration script: correctly migrates existing comments

#### E2E Tests
- User tells Avi name, sees it everywhere
- User creates comment, name shows correctly
- Agent creates comment, agent name shows correctly

#### Test Data
```sql
-- Setup test user
INSERT INTO user_settings (user_id, display_name, onboarding_completed)
VALUES ('test-user-1', 'TestUser', 1);

-- Setup test comments (mixed types)
INSERT INTO comments (id, post_id, content, author, author_user_id, author_agent)
VALUES
  ('c1', 'p1', 'User comment', 'TestUser', 'test-user-1', NULL),
  ('c2', 'p1', 'Agent comment', 'Avi', NULL, 'avi'),
  ('c3', 'p1', 'Legacy comment', 'OldUser', NULL, NULL);
```

### 4.5 Rollback Plan

**If migration fails or bugs occur:**

1. **Immediate**: Revert frontend changes (use legacy `author` field only)
2. **Database**: `author_user_id` column is nullable, old code still works
3. **API**: Comment creation can fallback to TEXT author if needed
4. **Full Rollback**: Drop column and indexes:
   ```sql
   -- Rollback migration
   ALTER TABLE comments DROP COLUMN author_user_id; -- Not supported in SQLite
   -- Instead: Recreate table without column (requires data copy)
   ```

**SQLite Limitation**: Cannot drop columns easily. Mitigation:
- Keep `author_user_id` nullable
- Old code ignores it (works with legacy `author` field)
- New code uses it when available

---

## C - COMPLETION

### 5.1 Implementation Checklist

#### Phase 1: Database (Day 1, 2 hours)
- [ ] Write migration script `20250105-user-name-display-fix.sql`
- [ ] Test migration on dev database copy
- [ ] Backup production database
- [ ] Run migration on production
- [ ] Verify data integrity post-migration
- [ ] Check migration metrics (how many comments updated)

#### Phase 2: Backend (Day 1-2, 3 hours)
- [ ] Update `OnboardingService.saveResponse()` to call `syncDisplayName()`
- [ ] Update `OnboardingService.completePhase()` to ensure name sync
- [ ] Add `GET /api/auth/current-user` endpoint
- [ ] Update `POST /api/comments` to use `author_user_id` from session
- [ ] Update `GET /api/comments/:postId` with LEFT JOIN query
- [ ] Add trigger for `author_user_id` validation
- [ ] Write unit tests for all changes
- [ ] Test with Postman/curl

#### Phase 3: Frontend (Day 2, 2 hours)
- [ ] Create `AuthContext` and `useAuth()` hook
- [ ] Update `UserDisplayName` component to handle userName prop
- [ ] Update `CommentThread` to use priority resolution logic
- [ ] Remove hardcoded `userId = 'demo-user-123'` from RealSocialMediaFeed
- [ ] Remove hardcoded `author: 'ProductionValidator'` from comment creation
- [ ] Update comment rendering to show user vs agent indicator
- [ ] Write unit tests for components
- [ ] Manual testing in browser

#### Phase 4: Testing (Day 2, 2 hours)
- [ ] Run unit tests (backend + frontend)
- [ ] Run integration tests (API flows)
- [ ] E2E test: User tells name, sees it everywhere
- [ ] E2E test: User creates comment, name shows
- [ ] E2E test: Agent creates comment, agent name shows
- [ ] Test edge cases (see 4.1)
- [ ] Load testing (comment listing with 1000+ comments)

#### Phase 5: Deployment (Day 2, 1 hour)
- [ ] Deploy backend changes to staging
- [ ] Deploy frontend changes to staging
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Ask user "Woz" to verify name display
- [ ] Document changes in CHANGELOG

### 5.2 Acceptance Tests

**AT1: User Name Persistence**
```gherkin
Given I am user "demo-user-123"
When I tell Avi "My name is Woz"
Then user_settings.display_name should be "Woz"
And onboarding_state.responses should contain '{"name": "Woz"}'
And I should see "Woz" in the UI header
And I should see "Woz" in my comments
```

**AT2: Comment Author Display**
```gherkin
Given I am logged in as "Woz" (demo-user-123)
When I create a comment "Great post!"
Then the comment should have author_user_id = "demo-user-123"
And the comment should display "Woz" as author
And NOT display "User" or "demo-user-123"
```

**AT3: Agent Comment Display**
```gherkin
Given Avi creates a comment
When I view the post comments
Then I should see "Λvi" as the author
And NOT see "User" or a user_id
```

**AT4: Legacy Comment Display**
```gherkin
Given an old comment exists with only author = "OldUser"
When I view the post comments
Then I should see "OldUser" as the author
And the system should not crash or show "User"
```

**AT5: No Hardcoded Values**
```gherkin
Given I search the codebase
When I grep for "demo-user-123" or "ProductionValidator"
Then I should find NO hardcoded values in comment creation
And I should find NO hardcoded values in user context
```

### 5.3 Monitoring & Metrics

**Production Metrics to Track:**
- [ ] Display name resolution success rate (target: >99%)
- [ ] Comment creation with `author_user_id` (target: 100% of new comments)
- [ ] "User" fallback occurrences (target: <1%)
- [ ] API response times for user settings (target: <50ms)
- [ ] Cache hit rate for user display names (target: >90%)

**Error Monitoring:**
- [ ] Failed user settings lookups
- [ ] NULL `author_user_id` in new comments (should never happen)
- [ ] Invalid `author_user_id` references (should trigger error)

**User Feedback:**
- [ ] Ask user "Woz" to confirm name displays correctly
- [ ] Monitor support tickets for name display issues
- [ ] Track user satisfaction with personalization

### 5.4 Documentation

**Code Documentation:**
- [ ] JSDoc comments on all new functions
- [ ] README updates for AuthContext usage
- [ ] API documentation for new endpoints
- [ ] Database schema documentation updated

**User Documentation:**
- [ ] Not needed (transparent to users)
- [ ] Internal: Migration runbook

**Developer Documentation:**
- [ ] This SPARC document serves as primary reference
- [ ] Code review checklist for name display changes
- [ ] Troubleshooting guide for common issues

### 5.5 Success Criteria

**Functional:**
- ✅ User "Woz" sees their name everywhere (posts, comments, UI)
- ✅ No "User" fallback appears when real names exist
- ✅ No "demo-user-123" or other IDs visible in UI
- ✅ Agent names display correctly (Λvi, ProductionValidator, etc.)
- ✅ Old comments still display properly

**Technical:**
- ✅ All tests pass (unit, integration, E2E)
- ✅ No hardcoded user identifiers in code
- ✅ Database migration successful with zero data loss
- ✅ Performance: <50ms for name resolution
- ✅ Cache hit rate >90%

**User Experience:**
- ✅ User confirms their name displays correctly
- ✅ System feels personalized and responsive
- ✅ No confusion about comment authorship

### 5.6 Post-Implementation

**Follow-Up Tasks:**
1. Monitor production for 48 hours
2. Collect user feedback
3. Optimize cache TTL based on usage patterns
4. Consider adding display name history (future enhancement)
5. Document lessons learned

**Future Enhancements (Out of Scope):**
- Profile pictures/avatars
- Display name suggestions during onboarding
- Display name validation (profanity filter, length limits)
- Rich profiles with bio, location, etc.
- @mention autocomplete with display names

---

## Appendix

### A1: File Change Summary

**Files to Create:**
- `/api-server/db/migrations/20250105-user-name-display-fix.sql`
- `/frontend/src/contexts/AuthContext.tsx`
- `/frontend/src/hooks/useAuth.ts`
- `/api-server/routes/auth.js` (if not exists)

**Files to Modify:**
- `/api-server/services/onboarding/onboarding-service.js`
- `/api-server/routes/comments.js`
- `/frontend/src/components/UserDisplayName.tsx`
- `/frontend/src/components/CommentThread.tsx`
- `/frontend/src/components/RealSocialMediaFeed.tsx`
- `/frontend/src/hooks/useUserSettings.ts` (minor)

**Lines to Remove:**
- `RealSocialMediaFeed.tsx:163` - `const [userId] = useState('demo-user-123');`
- `RealSocialMediaFeed.tsx:655` - `author: 'ProductionValidator'`

**Estimated LOC Changes:**
- Added: ~400 lines (migration, AuthContext, updated APIs)
- Modified: ~200 lines (component updates)
- Removed: ~20 lines (hardcoded values)

### A2: SQL Queries Reference

**Check Current State:**
```sql
-- User settings
SELECT user_id, display_name, onboarding_completed, responses
FROM user_settings
WHERE user_id = 'demo-user-123';

-- Onboarding state
SELECT user_id, phase, responses
FROM onboarding_state
WHERE user_id = 'demo-user-123';

-- Comments with authors
SELECT id, author, author_user_id, author_agent, content
FROM comments
ORDER BY created_at DESC
LIMIT 10;
```

**Verify Migration:**
```sql
-- Check new column exists
PRAGMA table_info(comments);

-- Count migrated comments
SELECT
  COUNT(*) as total,
  COUNT(author_user_id) as user_comments,
  COUNT(author_agent) as agent_comments,
  COUNT(*) - COUNT(author_user_id) - COUNT(author_agent) as unmigrated
FROM comments;

-- Find unmigrated user comments
SELECT id, author, author_user_id, author_agent
FROM comments
WHERE author_user_id IS NULL
  AND author_agent IS NULL;
```

### A3: Test User Setup

```sql
-- Create test user "Woz"
INSERT INTO user_settings (user_id, display_name, onboarding_completed)
VALUES ('demo-user-123', 'Woz', 1)
ON CONFLICT(user_id) DO UPDATE SET display_name = 'Woz';

-- Create test onboarding state
INSERT INTO onboarding_state (user_id, phase, responses, phase1_completed)
VALUES ('demo-user-123', 1, '{"name": "Woz", "use_case": "testing"}', 1)
ON CONFLICT(user_id) DO UPDATE SET responses = '{"name": "Woz", "use_case": "testing"}';

-- Create test comments
INSERT INTO comments (id, post_id, content, author, author_user_id, author_agent, created_at)
VALUES
  ('test-c1', 'test-post-1', 'Test user comment', 'Woz', 'demo-user-123', NULL, datetime('now')),
  ('test-c2', 'test-post-1', 'Test agent comment', 'Λvi', NULL, 'avi', datetime('now'));
```

---

## Document Status

**Specification Complete**: ✅
**Ready for Pseudocode Review**: ✅
**Ready for Architecture Review**: ✅
**Ready for Implementation**: ✅

**Estimated Timeline:**
- Day 1 (4 hours): Database migration + Backend updates
- Day 2 (4 hours): Frontend updates + Testing
- Day 2 (1 hour): Deployment + Verification

**Total Effort**: 8-10 hours

**Stakeholders to Review:**
- Backend Team: Database migration, API changes
- Frontend Team: Component updates, AuthContext
- User "Woz": Final acceptance testing
- Product: Verify requirements met

---

**End of SPARC Specification**
