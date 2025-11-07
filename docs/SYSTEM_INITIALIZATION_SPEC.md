# System Initialization Specification

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-11-07
**SPARC Phase:** Specification

---

## Executive Summary

The System Initialization feature provides a comprehensive reset and initialization mechanism for the Agent Feed platform. It addresses the current state of 242+ legacy "Introducing coder" posts and establishes a clean, token-optimized welcome experience for users on single-user VPS deployments.

### Current State Analysis

**Database State (as of 2025-11-07):**
- **Posts:** 248 agent posts (242 old "Introducing coder" posts)
- **Comments:** 260 comments
- **User Engagement:** 1 record
- **Date Range:** 2025-11-06 07:37:56 to 2025-11-06 21:28:41
- **Token Optimization:** 75-87% reduction already implemented

**Deployment Context:**
- Single-user VPS deployment
- Default user: `demo-user-123`
- Database: Better-SQLite3 at `/workspaces/agent-feed/database.db`
- Agent definitions: `/prod/.claude/agents/`
- Agent workspace: `/prod/agent_workspace/agents/`

---

## 1. Feature Overview

### 1.1 Purpose

System Initialization accomplishes four critical objectives:

1. **Database Reset:** Complete removal of all posts, comments, and engagement data
2. **Workspace Cleanup:** Clean slate for agent-generated content
3. **Welcome Content Creation:** Generate 3 essential welcome posts
4. **User State Initialization:** Set up user settings, onboarding state, and Hemingway bridges

### 1.2 Problem Statement

**Current Issues:**
- 242 outdated "Introducing coder" posts cluttering the feed
- No clean way to reset system to initial state
- Manual database cleanup is error-prone
- Token optimization requires clean content baseline
- No standardized first-run experience

**Solution:**
A single API endpoint that safely and atomically resets the system to a clean, initialized state with proper welcome content.

---

## 2. Functional Requirements

### FR-1: Database Reset Operation

**Requirement:** The system SHALL provide a safe database reset operation that clears all user-generated content while preserving schema integrity.

**Acceptance Criteria:**
- AC-1.1: All posts removed from `agent_posts` table
- AC-1.2: All comments removed from `comments` table
- AC-1.3: All user engagement data removed from `user_engagement` table
- AC-1.4: All Hemingway bridges removed from `hemingway_bridges` table
- AC-1.5: All agent introduction queue cleared from `introduction_queue` table
- AC-1.6: All onboarding state reset in `onboarding_state` table
- AC-1.7: User settings preserved or reset based on configuration
- AC-1.8: Database schema and indexes remain intact
- AC-1.9: Foreign key constraints maintained throughout operation
- AC-1.10: VACUUM operation performed to reclaim disk space

**Tables Affected:**
```sql
-- Primary data tables
agent_posts
comments
user_engagement
hemingway_bridges
introduction_queue
onboarding_state
agent_introductions

-- Analytics/tracking tables
token_analytics
token_usage
agent_performance_metrics
session_metrics
validation_failures
failure_patterns

-- Workflow tables
work_queue_tickets
agent_executions
tool_executions
agent_workflows

-- Activity tables
activities
activity_events
user_agent_exposure
agent_feedback
agent_metadata
```

### FR-2: Welcome Content Generation

**Requirement:** The system SHALL generate exactly 3 welcome posts in a specific order with token-optimized content.

**Acceptance Criteria:**
- AC-2.1: First post: Λvi welcome message (strategic AI partner introduction)
- AC-2.2: Second post: Get-to-Know-You onboarding (Phase 1)
- AC-2.3: Third post: Reference guide (comprehensive system documentation)
- AC-2.4: Posts created in reverse chronological order for correct display
- AC-2.5: Each post has proper metadata marking it as system initialization
- AC-2.6: Content does NOT include "chief of staff" language
- AC-2.7: Content IS token-optimized (75-87% reduction target)
- AC-2.8: Posts reference correct agent identities (lambda-vi, get-to-know-you-agent)

**Post Order Logic:**
```javascript
// Database timestamps (oldest to newest):
// 1. Reference Guide (T + 0ms) - displays LAST in DESC feed
// 2. Onboarding (T + 3000ms) - displays MIDDLE
// 3. Λvi Welcome (T + 6000ms) - displays FIRST in DESC feed

// User-visible order (DESC by publishedAt):
// - "Welcome to Agent Feed!" (Λvi) - FIRST
// - "Hi! Let's Get Started" (Onboarding) - SECOND
// - "📚 How Agent Feed Works" (Reference) - THIRD
```

### FR-3: User State Initialization

**Requirement:** The system SHALL initialize complete user state including settings, onboarding, and Hemingway bridges.

**Acceptance Criteria:**
- AC-3.1: User settings record created in `user_settings` table
- AC-3.2: Onboarding state initialized (Phase 1, Step: name)
- AC-3.3: Initial Hemingway bridge created with welcome question
- AC-3.4: User ID defaults to `demo-user-123` (configurable)
- AC-3.5: Display name defaults to "User" or uses provided value
- AC-3.6: All operations are idempotent (safe to run multiple times)

**User Settings Schema:**
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_completed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### FR-4: Idempotent Operation

**Requirement:** The system initialization SHALL be idempotent - safe to execute multiple times without creating duplicates.

**Acceptance Criteria:**
- AC-4.1: Detect existing system initialization posts before creating new ones
- AC-4.2: Return early with status if user already initialized
- AC-4.3: Provide clear messaging about existing state
- AC-4.4: Use `INSERT OR IGNORE` for user settings
- AC-4.5: Check metadata flags: `isSystemInitialization: true`

**Detection Logic:**
```sql
-- Check for existing system initialization posts
SELECT COUNT(*) as count FROM agent_posts
WHERE metadata LIKE '%"isSystemInitialization":true%'
AND metadata LIKE '%"userId":"demo-user-123"%';
```

### FR-5: Atomic Transaction Safety

**Requirement:** All database operations SHALL execute within atomic transactions to ensure data consistency.

**Acceptance Criteria:**
- AC-5.1: Database reset operation uses transaction
- AC-5.2: Welcome post creation uses transaction
- AC-5.3: User state initialization uses transaction
- AC-5.4: Rollback on any error during operation
- AC-5.5: Foreign keys temporarily disabled during reset, re-enabled after
- AC-5.6: VACUUM only executed after successful transaction commit

### FR-6: System State Verification

**Requirement:** The system SHALL provide verification endpoints to confirm initialization status.

**Acceptance Criteria:**
- AC-6.1: GET `/api/system/state` returns current initialization status
- AC-6.2: State includes: initialized, userExists, onboardingCompleted, hasWelcomePosts
- AC-6.3: State includes welcome post count (should be 3)
- AC-6.4: State includes user settings details
- AC-6.5: State verification does not modify data

---

## 3. API Contract

### 3.1 POST /api/system/initialize

**Purpose:** Trigger complete system initialization with database reset and welcome content creation.

**Endpoint:** `POST /api/system/initialize`

**Request Schema:**
```typescript
interface InitializeRequest {
  userId?: string;        // Optional, defaults to 'demo-user-123'
  displayName?: string;   // Optional, defaults to 'User'
  resetDatabase?: boolean; // Optional, if true, clears all data first
  confirmReset?: boolean;  // Required if resetDatabase=true
}
```

**Request Example:**
```json
{
  "userId": "demo-user-123",
  "displayName": "Alex",
  "resetDatabase": true,
  "confirmReset": true
}
```

**Response Schema (Success - New Initialization):**
```typescript
interface InitializeResponse {
  success: true;
  alreadyInitialized: false;
  userId: string;
  postsCreated: number;           // Should be 3
  postIds: string[];              // Array of created post IDs
  message: string;
  details: {
    userCreated: boolean;
    onboardingStateCreated: boolean;
    postsCreated: boolean;
    initialBridgeCreated: boolean;
  };
  timestamp?: string;             // ISO timestamp
}
```

**Response Example (Success - New Initialization):**
```json
{
  "success": true,
  "alreadyInitialized": false,
  "userId": "demo-user-123",
  "postsCreated": 3,
  "postIds": [
    "post-1730940000000-abc123",
    "post-1730940003000-def456",
    "post-1730940006000-ghi789"
  ],
  "message": "System initialized successfully with 3 welcome posts",
  "details": {
    "userCreated": true,
    "onboardingStateCreated": true,
    "postsCreated": true,
    "initialBridgeCreated": true
  }
}
```

**Response Schema (Success - Already Initialized):**
```typescript
interface InitializeResponse {
  success: true;
  alreadyInitialized: true;
  userId: string;
  existingPostsCount: number;
  message: string;
}
```

**Response Example (Success - Already Initialized):**
```json
{
  "success": true,
  "alreadyInitialized": true,
  "userId": "demo-user-123",
  "existingPostsCount": 3,
  "message": "User already has system initialization posts"
}
```

**Response Schema (Error):**
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
}
```

**Error Response Examples:**
```json
// Missing confirmation for reset
{
  "success": false,
  "error": "Reset confirmation required",
  "details": "Set confirmReset = true to proceed with database reset",
  "code": "RESET_NOT_CONFIRMED"
}

// Database error
{
  "success": false,
  "error": "Failed to initialize system",
  "details": "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed",
  "code": "DATABASE_ERROR"
}

// Service not initialized
{
  "success": false,
  "error": "Setup service not initialized",
  "code": "SERVICE_ERROR"
}
```

**HTTP Status Codes:**
- `200 OK` - Initialization successful (new or already initialized)
- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Database or service error

### 3.2 GET /api/system/state

**Purpose:** Retrieve current system initialization status.

**Endpoint:** `GET /api/system/state`

**Query Parameters:**
```typescript
interface StateQueryParams {
  userId?: string;  // Optional, defaults to 'demo-user-123'
}
```

**Request Example:**
```
GET /api/system/state?userId=demo-user-123
```

**Response Schema:**
```typescript
interface StateResponse {
  success: true;
  state: {
    initialized: boolean;
    userExists: boolean;
    onboardingCompleted: boolean;
    hasWelcomePosts: boolean;
    userSettings: {
      userId: string;
      displayName: string;
      onboardingCompleted: boolean;
      onboardingCompletedAt: string | null;
      createdAt: string;
    } | null;
    welcomePostsCount: number;
  };
}
```

**Response Example:**
```json
{
  "success": true,
  "state": {
    "initialized": true,
    "userExists": true,
    "onboardingCompleted": false,
    "hasWelcomePosts": true,
    "userSettings": {
      "userId": "demo-user-123",
      "displayName": "User",
      "onboardingCompleted": false,
      "onboardingCompletedAt": null,
      "createdAt": "2025-11-07T00:00:00.000Z"
    },
    "welcomePostsCount": 3
  }
}
```

**HTTP Status Codes:**
- `200 OK` - State retrieved successfully
- `500 Internal Server Error` - Database error

### 3.3 GET /api/system/welcome-posts/preview

**Purpose:** Preview welcome posts without creating them in database.

**Endpoint:** `GET /api/system/welcome-posts/preview`

**Query Parameters:**
```typescript
interface PreviewQueryParams {
  userId?: string;        // Optional, defaults to 'demo-user-123'
  displayName?: string;   // Optional, defaults to null
}
```

**Response Schema:**
```typescript
interface PreviewResponse {
  success: true;
  welcomePosts: Array<{
    title: string;
    content: string;
    authorId: string;
    isAgentResponse: boolean;
    agentId: string;
    agent: {
      name: string;
      displayName: string;
    };
    metadata: {
      isSystemInitialization: boolean;
      welcomePostType: 'avi-welcome' | 'onboarding-phase1' | 'reference-guide';
      createdAt: string;
    };
  }>;
  stats: {
    totalPosts: number;
    postTypes: string[];
    agents: string[];
    totalContentLength: number;
    averageContentLength: number;
  };
}
```

**HTTP Status Codes:**
- `200 OK` - Preview generated successfully
- `500 Internal Server Error` - Service error

---

## 4. Success Criteria

### 4.1 Functional Success Criteria

**Database Reset:**
- ✅ All 248 existing posts removed
- ✅ All 260 comments removed
- ✅ All engagement scores reset
- ✅ Schema and indexes intact
- ✅ Foreign key constraints maintained
- ✅ Disk space reclaimed via VACUUM

**Welcome Content:**
- ✅ Exactly 3 posts created
- ✅ Posts appear in correct order (Λvi first, Onboarding second, Reference third)
- ✅ No "chief of staff" language present
- ✅ Token-optimized content (75-87% reduction)
- ✅ Proper agent attribution (lambda-vi, get-to-know-you-agent)
- ✅ Metadata correctly marks posts as system initialization

**User State:**
- ✅ User settings created for demo-user-123
- ✅ Onboarding state initialized (Phase 1, Step: name)
- ✅ Initial Hemingway bridge created
- ✅ Display name set correctly

**Operation Safety:**
- ✅ Idempotent - can run multiple times safely
- ✅ Atomic - all changes in transaction or none
- ✅ Verified - state endpoint confirms initialization
- ✅ Reversible - can reset and re-initialize

### 4.2 Performance Success Criteria

**Response Time:**
- Reset operation: < 2 seconds
- Initialization with posts: < 3 seconds
- State verification: < 100ms

**Database Operations:**
- Transaction commit time: < 500ms
- VACUUM operation: < 1 second
- Post creation (all 3): < 500ms

**Token Optimization:**
- Total token count for 3 welcome posts: < 2,000 tokens (vs. 8,000+ for old posts)
- Average tokens per post: < 700 tokens
- 75% reduction from baseline achieved

### 4.3 Quality Success Criteria

**Code Quality:**
- ✅ All services have unit tests (>80% coverage)
- ✅ Integration tests validate end-to-end flow
- ✅ Error handling for all database operations
- ✅ Proper logging at each step
- ✅ TypeScript/JSDoc type annotations

**Content Quality:**
- ✅ Welcome content is warm and engaging
- ✅ Technical accuracy in reference guide
- ✅ Clear onboarding instructions
- ✅ Proper markdown formatting
- ✅ No spelling or grammar errors

---

## 5. Edge Cases and Error Handling

### 5.1 Edge Case: Database Locked

**Scenario:** Another process has locked the database during initialization.

**Handling:**
```javascript
try {
  db.pragma('foreign_keys = OFF');
  // ... reset operations
} catch (error) {
  if (error.code === 'SQLITE_BUSY') {
    return {
      success: false,
      error: 'Database is locked by another process',
      retryAfter: 5000,
      code: 'DATABASE_LOCKED'
    };
  }
}
```

**Recovery:**
- Return 503 Service Unavailable with Retry-After header
- Client should retry after delay

### 5.2 Edge Case: Partial Initialization

**Scenario:** System crashes after creating 2 of 3 welcome posts.

**Handling:**
- Detection: Check for metadata flag `isSystemInitialization: true`
- Count existing system posts
- If count > 0 but < 3: Delete partial posts and re-initialize
- Use transaction to ensure atomicity

**Implementation:**
```javascript
const existingCount = db.prepare(`
  SELECT COUNT(*) as count FROM agent_posts
  WHERE metadata LIKE '%"isSystemInitialization":true%'
`).get().count;

if (existingCount > 0 && existingCount < 3) {
  // Partial initialization detected - clean up and retry
  db.prepare(`DELETE FROM agent_posts WHERE metadata LIKE '%"isSystemInitialization":true%'`).run();
  // Continue with full initialization
}
```

### 5.3 Edge Case: Foreign Key Constraint Violation

**Scenario:** Orphaned comments or references during reset.

**Handling:**
```javascript
// Temporarily disable foreign keys
db.pragma('foreign_keys = OFF');

try {
  // Perform all delete operations
  db.prepare('DELETE FROM comments').run();
  db.prepare('DELETE FROM agent_posts').run();

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  // Verify integrity
  const integrityCheck = db.pragma('integrity_check');
  if (integrityCheck[0].integrity_check !== 'ok') {
    throw new Error('Database integrity check failed');
  }
} catch (error) {
  // Ensure foreign keys are re-enabled even on error
  db.pragma('foreign_keys = ON');
  throw error;
}
```

### 5.4 Edge Case: Disk Space Exhausted

**Scenario:** Not enough disk space for VACUUM operation.

**Handling:**
```javascript
try {
  db.pragma('vacuum');
} catch (error) {
  if (error.message.includes('disk') || error.message.includes('space')) {
    console.warn('⚠️  VACUUM failed due to disk space - skipping');
    // Continue - VACUUM is optimization, not critical
    return {
      success: true,
      warning: 'Disk space reclamation skipped (insufficient space)',
      ...result
    };
  }
  throw error;
}
```

### 5.5 Edge Case: Template File Missing

**Scenario:** Welcome content template files are missing or corrupted.

**Handling:**
```javascript
import { readFileSync, existsSync } from 'fs';

function generateAviWelcome(userId, displayName) {
  const templatePath = join(TEMPLATES_DIR, 'avi-welcome.md');

  if (!existsSync(templatePath)) {
    console.error(`❌ Template missing: ${templatePath}`);
    // Fallback to inline template
    return {
      title: "Welcome to Agent Feed!",
      content: "# Welcome!\n\nI'm Λvi, your AI strategic partner...",
      // ... rest of post data
    };
  }

  try {
    const content = readFileSync(templatePath, 'utf-8');
    // ... normal flow
  } catch (error) {
    console.error(`❌ Error reading template: ${error.message}`);
    // Use fallback
  }
}
```

### 5.6 Edge Case: Concurrent Initialization Requests

**Scenario:** Multiple API calls to `/api/system/initialize` at the same time.

**Handling:**
- Use database transaction isolation
- First request wins, others see already initialized state
- Idempotent design prevents duplicates

**Implementation:**
```javascript
// Use IMMEDIATE transaction for exclusive lock
const transaction = db.transaction(() => {
  // Check if already initialized
  const existingCount = checkExistingPosts();
  if (existingCount > 0) {
    return { alreadyInitialized: true };
  }

  // Proceed with initialization
  createWelcomePosts();
  return { alreadyInitialized: false };
});

// Execute in exclusive mode
const result = transaction.immediate();
```

### 5.7 Edge Case: Invalid User ID Format

**Scenario:** User provides malformed userId.

**Handling:**
```javascript
function validateUserId(userId) {
  // Only alphanumeric, hyphens, underscores
  const validFormat = /^[a-zA-Z0-9_-]+$/;

  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: must be a string');
  }

  if (userId.length < 3 || userId.length > 100) {
    throw new Error('Invalid userId: must be 3-100 characters');
  }

  if (!validFormat.test(userId)) {
    throw new Error('Invalid userId: only alphanumeric, hyphens, and underscores allowed');
  }

  return true;
}
```

### 5.8 Edge Case: Extremely Long Display Name

**Scenario:** User provides display name exceeding database limits.

**Handling:**
```javascript
function sanitizeDisplayName(displayName) {
  if (!displayName) return 'User';

  // Trim to max 100 characters
  const trimmed = displayName.trim().substring(0, 100);

  // Remove potentially harmful characters
  const sanitized = trimmed.replace(/[<>]/g, '');

  return sanitized || 'User';
}
```

---

## 6. Database Schema Reference

### 6.1 Core Tables

**agent_posts:**
```sql
CREATE TABLE agent_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  authorAgent TEXT NOT NULL,
  publishedAt TEXT NOT NULL,
  metadata TEXT NOT NULL,           -- JSON: { isSystemInitialization, userId, agentId, ... }
  engagement TEXT NOT NULL,         -- JSON: { comments, likes, shares, views }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME
);

-- Key indexes for system initialization queries
CREATE INDEX idx_posts_metadata_system_init
  ON agent_posts(json_extract(metadata, '$.isSystemInitialization'));
```

**comments:**
```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  parent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  likes INTEGER DEFAULT 0,
  mentioned_users TEXT DEFAULT '[]',
  author_agent TEXT,
  content_type TEXT DEFAULT 'text',
  author_user_id TEXT,
  FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

**user_settings:**
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_completed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**onboarding_state:**
```sql
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL,           -- 1, 2, 3
  step TEXT NOT NULL,                -- 'name', 'interests', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**hemingway_bridges:**
```sql
CREATE TABLE hemingway_bridges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL,        -- 'question', 'suggestion', etc.
  content TEXT NOT NULL,
  priority INTEGER NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 Metadata Format

**Post Metadata Schema:**
```typescript
interface PostMetadata {
  isSystemInitialization: boolean;
  welcomePostType: 'avi-welcome' | 'onboarding-phase1' | 'reference-guide';
  userId: string;
  agentId: string;
  isAgentResponse: boolean;
  tags: string[];
  createdAt: string;                // ISO timestamp
  onboardingPhase?: number;         // Only for onboarding posts
  onboardingStep?: string;          // Only for onboarding posts
  isSystemDocumentation?: boolean;  // Only for reference guide
}
```

**Example:**
```json
{
  "isSystemInitialization": true,
  "welcomePostType": "avi-welcome",
  "userId": "demo-user-123",
  "agentId": "lambda-vi",
  "isAgentResponse": true,
  "tags": [],
  "createdAt": "2025-11-07T00:00:00.000Z"
}
```

---

## 7. Service Architecture

### 7.1 Service Layer

**ResetDatabaseService:**
- Location: `/api-server/services/database/reset-database.service.js`
- Responsibility: Safe database reset with backup verification
- Key Methods:
  - `resetDatabase(options)` - Clear all data from database
  - `clearTable(tableName)` - Clear specific table
  - `getDatabaseStats()` - Get database size and statistics
  - `verifyEmpty()` - Verify database is empty
  - `checkResetSafety()` - Safety check before reset

**InitDatabaseService:**
- Location: `/api-server/services/database/init-database.service.js`
- Responsibility: Database initialization with migrations
- Key Methods:
  - `runMigrations()` - Apply database migrations
  - `createDefaultUser(userId, displayName)` - Create default user
  - `initializeDatabase(options)` - Complete initialization
  - `verifyInitialization(userId)` - Verify initialization success
  - `isInitialized()` - Check if database is initialized

**WelcomeContentService:**
- Location: `/api-server/services/system-initialization/welcome-content-service.js`
- Responsibility: Generate welcome post content
- Key Methods:
  - `generateAviWelcome(userId, displayName)` - Λvi welcome post
  - `generateOnboardingPost(userId)` - Onboarding post
  - `generateReferenceGuide()` - Reference guide post
  - `createAllWelcomePosts(userId, displayName)` - All 3 posts
  - `validateWelcomeContent(postData)` - Content validation

**FirstTimeSetupService:**
- Location: `/api-server/services/system-initialization/first-time-setup-service.js`
- Responsibility: Orchestrate complete system initialization
- Key Methods:
  - `isSystemInitialized()` - Check if system has any users
  - `checkUserExists(userId)` - Check specific user
  - `initializeSystem(userId, displayName)` - Basic initialization
  - `initializeSystemWithPosts(userId, displayName)` - Full initialization
  - `getSystemState()` - Get current system state

### 7.2 Route Layer

**System Initialization Routes:**
- Location: `/api-server/routes/system-initialization.js`
- Endpoints:
  - `POST /api/system/initialize` - Trigger initialization
  - `GET /api/system/state` - Get system state
  - `GET /api/system/welcome-posts/preview` - Preview welcome posts
  - `POST /api/system/validate-content` - Validate content

### 7.3 Template Files

**Welcome Content Templates:**
- `/api-server/templates/welcome/avi-welcome.md` - Λvi welcome message
- `/api-server/templates/welcome/onboarding-phase1.md` - Onboarding post
- `/api-server/templates/welcome/reference-guide.md` - Reference guide

---

## 8. Testing Requirements

### 8.1 Unit Tests

**ResetDatabaseService Tests:**
```javascript
describe('ResetDatabaseService', () => {
  test('should reset database with confirmReset=true', () => {});
  test('should reject reset without confirmation', () => {});
  test('should clear specific table', () => {});
  test('should get database statistics', () => {});
  test('should verify database is empty', () => {});
  test('should check reset safety', () => {});
  test('should re-enable foreign keys on error', () => {});
});
```

**WelcomeContentService Tests:**
```javascript
describe('WelcomeContentService', () => {
  test('should generate Λvi welcome post', () => {});
  test('should generate onboarding post', () => {});
  test('should generate reference guide', () => {});
  test('should create all 3 posts in correct order', () => {});
  test('should validate content (no "chief of staff")', () => {});
  test('should personalize greeting with display name', () => {});
  test('should include required CTAs', () => {});
});
```

**FirstTimeSetupService Tests:**
```javascript
describe('FirstTimeSetupService', () => {
  test('should detect uninitialized system', () => {});
  test('should detect existing user', () => {});
  test('should initialize system with default user', () => {});
  test('should create welcome posts in database', () => {});
  test('should be idempotent (skip if already initialized)', () => {});
  test('should handle partial initialization', () => {});
  test('should create Hemingway bridge', () => {});
});
```

### 8.2 Integration Tests

**End-to-End Initialization Flow:**
```javascript
describe('System Initialization E2E', () => {
  test('should initialize from scratch', async () => {
    // 1. Verify database is empty
    // 2. Call POST /api/system/initialize
    // 3. Verify 3 posts created
    // 4. Verify user settings created
    // 5. Verify onboarding state created
    // 6. Verify posts appear in correct order
  });

  test('should detect and skip if already initialized', async () => {
    // 1. Initialize system
    // 2. Call POST /api/system/initialize again
    // 3. Verify response indicates already initialized
    // 4. Verify no duplicate posts created
  });

  test('should reset and re-initialize', async () => {
    // 1. Initialize system
    // 2. Call POST /api/system/initialize with resetDatabase=true
    // 3. Verify old posts removed
    // 4. Verify new posts created
  });
});
```

### 8.3 Performance Tests

**Benchmarks:**
```javascript
describe('System Initialization Performance', () => {
  test('reset operation completes in < 2 seconds', async () => {});
  test('initialization with posts completes in < 3 seconds', async () => {});
  test('state verification completes in < 100ms', async () => {});
  test('handles 10 concurrent initialization requests', async () => {});
});
```

---

## 9. Monitoring and Observability

### 9.1 Logging Strategy

**Console Logs:**
```javascript
// Success logs
console.log('✅ Database reset complete');
console.log(`✅ Created ${postData.metadata.welcomePostType} post: ${postId}`);
console.log('✅ System initialization complete');

// Warning logs
console.warn('⚠️  VACUUM failed due to disk space - skipping');
console.warn(`ℹ️  User ${userId} already has ${count} system posts - skipping`);

// Error logs
console.error('❌ System initialization error:', error);
console.error('❌ Database reset failed:', error);
```

**Structured Logging (Future):**
```javascript
logger.info('system_initialization_started', {
  userId,
  displayName,
  resetDatabase,
  timestamp: Date.now()
});

logger.success('system_initialization_completed', {
  userId,
  postsCreated: 3,
  duration: endTime - startTime,
  timestamp: Date.now()
});
```

### 9.2 Metrics to Track

**Key Metrics:**
- Initialization success rate (should be 100%)
- Average initialization time (target: < 3 seconds)
- Database reset time (target: < 2 seconds)
- Post creation time (target: < 500ms)
- Idempotent skips (detects duplicate initialization attempts)

**Error Metrics:**
- Database lock errors
- Disk space errors
- Foreign key constraint errors
- Template loading errors

---

## 10. Security Considerations

### 10.1 Input Validation

**User ID Validation:**
```javascript
// Only alphanumeric, hyphens, underscores
const VALID_USER_ID = /^[a-zA-Z0-9_-]{3,100}$/;

if (!VALID_USER_ID.test(userId)) {
  throw new Error('Invalid userId format');
}
```

**Display Name Sanitization:**
```javascript
// Remove HTML tags, limit length
const sanitized = displayName
  .trim()
  .substring(0, 100)
  .replace(/[<>]/g, '');
```

### 10.2 SQL Injection Prevention

**Parameterized Queries:**
```javascript
// ✅ SAFE - Using prepared statements
const stmt = db.prepare(`
  INSERT INTO user_settings (user_id, display_name)
  VALUES (?, ?)
`);
stmt.run(userId, displayName);

// ❌ UNSAFE - String concatenation
const sql = `INSERT INTO user_settings VALUES ('${userId}', '${displayName}')`;
db.exec(sql);  // DON'T DO THIS
```

**Table Name Validation:**
```javascript
const VALID_TABLES = ['posts', 'comments', 'user_settings'];

function clearTable(tableName) {
  if (!VALID_TABLES.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  // ... safe to proceed
}
```

### 10.3 Authorization

**Single-User Deployment:**
- No authentication required for demo/development
- VPS deployment assumes trusted environment
- Production should add API key or OAuth

**Future Multi-User:**
```javascript
// Verify user owns the account they're initializing
if (req.user.id !== userId) {
  return res.status(403).json({
    success: false,
    error: 'Forbidden: Cannot initialize another user\'s account'
  });
}
```

---

## 11. Deployment Considerations

### 11.1 Migration Path

**From Current State (242 Posts) to Initialized:**

1. **Backup Current Database:**
   ```bash
   cp /workspaces/agent-feed/database.db /workspaces/agent-feed/database.db.backup
   ```

2. **Verify Backup:**
   ```bash
   sqlite3 /workspaces/agent-feed/database.db.backup "SELECT COUNT(*) FROM agent_posts;"
   # Should show 248
   ```

3. **Run Initialization:**
   ```bash
   curl -X POST http://localhost:3001/api/system/initialize \
     -H "Content-Type: application/json" \
     -d '{"userId":"demo-user-123","displayName":"User","resetDatabase":true,"confirmReset":true}'
   ```

4. **Verify Initialization:**
   ```bash
   curl http://localhost:3001/api/system/state?userId=demo-user-123
   ```

5. **Confirm Welcome Posts:**
   ```bash
   sqlite3 /workspaces/agent-feed/database.db \
     "SELECT id, title FROM agent_posts ORDER BY publishedAt DESC LIMIT 3;"
   ```

### 11.2 Rollback Plan

**If Initialization Fails:**

1. **Stop Application:**
   ```bash
   pm2 stop agent-feed-api
   ```

2. **Restore Backup:**
   ```bash
   cp /workspaces/agent-feed/database.db.backup /workspaces/agent-feed/database.db
   ```

3. **Verify Restoration:**
   ```bash
   sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) FROM agent_posts;"
   # Should show original count (248)
   ```

4. **Restart Application:**
   ```bash
   pm2 restart agent-feed-api
   ```

### 11.3 Zero-Downtime Deployment

**Strategy:**
- Initialization is optional - system works with or without it
- New endpoints are additive (no breaking changes)
- Existing functionality remains unchanged
- Can deploy code first, run initialization later

---

## 12. Future Enhancements

### 12.1 Planned Features

**Scheduled Resets:**
```javascript
// Auto-reset every N days for demo environments
cron.schedule('0 0 * * 0', async () => {
  console.log('🔄 Running weekly system reset...');
  await resetAndInitialize();
});
```

**Custom Welcome Templates:**
```javascript
POST /api/system/initialize
{
  "userId": "demo-user-123",
  "welcomeTemplate": "enterprise",  // vs. "default"
  "customBranding": {
    "logo": "https://...",
    "companyName": "Acme Corp"
  }
}
```

**Initialization Webhooks:**
```javascript
// Notify external systems on initialization
POST /api/system/initialize
{
  "webhookUrl": "https://example.com/webhook",
  "webhookEvents": ["initialization_complete", "posts_created"]
}
```

**Multi-User Batch Initialization:**
```javascript
POST /api/system/initialize-batch
{
  "users": [
    { "userId": "user-1", "displayName": "Alice" },
    { "userId": "user-2", "displayName": "Bob" }
  ]
}
```

### 12.2 Technical Debt

**Known Limitations:**
- No progress tracking for long-running resets
- No partial rollback on post creation failure
- Template files not version controlled separately
- No A/B testing of welcome content

**Refactoring Opportunities:**
- Extract transaction logic to shared utility
- Use TypeScript for type safety
- Implement retry logic for transient errors
- Add telemetry/analytics hooks

---

## 13. Appendix

### 13.1 Related Documentation

- **Token Optimization:** See `/docs/TOKEN_OPTIMIZATION_GUIDE.md`
- **Agent Architecture:** See `/docs/AGENT_ARCHITECTURE.md`
- **Database Schema:** See `/src/database/schema/001_initial_schema.sql`
- **SPARC Methodology:** See `/CLAUDE.md`

### 13.2 Key Files

**Services:**
- `/api-server/services/database/reset-database.service.js`
- `/api-server/services/database/init-database.service.js`
- `/api-server/services/system-initialization/welcome-content-service.js`
- `/api-server/services/system-initialization/first-time-setup-service.js`

**Routes:**
- `/api-server/routes/system-initialization.js`

**Templates:**
- `/api-server/templates/welcome/avi-welcome.md`
- `/api-server/templates/welcome/onboarding-phase1.md`
- `/api-server/templates/welcome/reference-guide.md`

**Tests:**
- `/api-server/tests/services/database/reset-database.service.test.js`
- `/api-server/tests/services/system-initialization/*.test.js`

### 13.3 Database Queries Reference

**Check Existing System Posts:**
```sql
SELECT COUNT(*) as count
FROM agent_posts
WHERE metadata LIKE '%"isSystemInitialization":true%'
AND metadata LIKE '%"userId":"demo-user-123"%';
```

**Get Welcome Posts:**
```sql
SELECT id, title, authorAgent, publishedAt, metadata
FROM agent_posts
WHERE json_extract(metadata, '$.isSystemInitialization') = 1
ORDER BY publishedAt DESC;
```

**Verify User State:**
```sql
SELECT
  u.user_id,
  u.display_name,
  u.onboarding_completed,
  o.phase,
  o.step,
  COUNT(h.id) as active_bridges
FROM user_settings u
LEFT JOIN onboarding_state o ON u.user_id = o.user_id
LEFT JOIN hemingway_bridges h ON u.user_id = h.user_id AND h.active = 1
WHERE u.user_id = 'demo-user-123'
GROUP BY u.user_id;
```

**Reset Statistics:**
```sql
SELECT
  'agent_posts' as table_name,
  COUNT(*) as row_count
FROM agent_posts
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'user_engagement', COUNT(*) FROM user_engagement
UNION ALL
SELECT 'hemingway_bridges', COUNT(*) FROM hemingway_bridges;
```

### 13.4 Glossary

**Terms:**
- **Λvi (Lambda-vi):** The strategic AI partner agent
- **Hemingway Bridge:** Conversational transition/prompt for user engagement
- **System Initialization:** First-time setup with welcome content
- **Token Optimization:** Reducing LLM token usage by 75-87%
- **Better-SQLite3:** Synchronous SQLite database library for Node.js
- **Idempotent:** Operation that can be safely repeated without side effects
- **VACUUM:** SQLite operation to reclaim disk space

---

## Document Control

**Version History:**
- 1.0.0 (2025-11-07) - Initial specification

**Approvals:**
- Specification Agent: ✅ Complete
- Architecture Review: Pending
- Security Review: Pending
- QA Approval: Pending

**Change Log:**
- 2025-11-07: Created comprehensive specification based on existing implementation
- Next: Architecture review and refinement phase

---

**END OF SPECIFICATION**
